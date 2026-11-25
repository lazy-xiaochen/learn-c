// 判题核心：编译 → 在沙箱中逐个运行测试用例 → 比对输出 → 汇总判题结果与反馈。
//
// 判题状态：
//   AC  通过            WA  答案错误          TLE 超时
//   MLE 内存超限         RE  运行错误（崩溃 / 非零退出码 / AddressSanitizer 报错）
//   CE  编译错误（含安全检查拒绝）              UB  UndefinedBehaviorSanitizer 检测到未定义行为
//   LEAK 内存泄漏（仅对要求检查泄漏的题目；输出正确但程序结束时仍有未释放内存）
import { execFile, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getToolchain, getNativeArtifacts } from './paths.js';
import { securityCheck } from './security.js';
import { parseDiagnostics } from './diagnostics.js';
import { parseSanitizer } from './sanitizer.js';
import { compareOutput, onlyWhitespaceDiffers } from './compare.js';
import { scanStatic } from './static-rules.js';
import { describeExitCode } from './exit-codes.js';

/** 被 clearn_track.o 包装的分配函数（与 native/clearn_track.c 中的 __wrap_xxx 一一对应） */
const TRACK_WRAPS = ['malloc', 'calloc', 'realloc', 'free', 'strdup', '_strdup'];

/** 与 native/clearn_track.c 中 CLEARN_MLE_EXIT 一致 */
export const MLE_EXIT_CODE = 0x4d4c45;

export const LIMITS = Object.freeze({
  compileTimeoutMs: 10_000,
  runTimeMs: 1000, // 默认 CPU 时间
  maxRunWallMs: 3000, // 墙钟上限（需求：运行超时 ≤ 3s）
  heapLimitMb: 256, // 学习者可用堆内存（需求：≤ 256MB）
  // Job Object 的进程总内存硬上限。AddressSanitizer 自身需要影子内存和元数据（实测空程序约 29MB，
  // 分配 N 字节约额外占用 N/8 + 红区），所以硬上限高于 heapLimitMb，真正的 MLE 判定以堆跟踪为准。
  processHardLimitMb: 512,
  outputLimitBytes: 64 * 1024,
  maxSourceBytes: 64 * 1024,
  maxFiles: 8,
  maxStdinBytes: 1024 * 1024,
});

const FILE_NAME_RE = /^[A-Za-z_][\w-]{0,40}\.(c|h)$/;
/** 文件读写题中由题目提供 / 需要检查的数据文件名 */
const DATA_FILE_RE = /^[A-Za-z0-9_][\w.-]{0,60}$/;

/** 允许知识点页面/题目指定的编译选项（白名单） */
const ALLOWED_OPT = new Set(['-O0', '-O1', '-O2']);
const ALLOWED_EXTRA = new Set(['-fsigned-char', '-funsigned-char', '-Wpedantic', '-Wshadow', '-Wconversion', '-m32']);

function workRoot() {
  const dir = path.join(os.tmpdir(), 'c-learn-judge');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function makeWorkDir() {
  const dir = path.join(workRoot(), crypto.randomUUID());
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function rmrf(dir) {
  // Windows 上刚退出的进程可能还短暂占用文件，重试几次
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch {
    /* 留给下次启动时清理 */
  }
}

/** 启动时清理上次异常退出留下的临时目录（超过 1 小时的） */
export function cleanupStaleWorkDirs() {
  const root = workRoot();
  const cutoff = Date.now() - 3600_000;
  for (const name of fs.readdirSync(root)) {
    const p = path.join(root, name);
    try {
      if (fs.statSync(p).mtimeMs < cutoff) rmrf(p);
    } catch {
      /* ignore */
    }
  }
}

/** 学习者程序的运行环境：最小化，不继承用户的环境变量（避免泄露令牌等信息） */
function sandboxEnv(workDir, extra = {}) {
  const tc = getToolchain();
  const sysRoot = process.env.SystemRoot || 'C:\\Windows';
  return {
    PATH: `${tc.runtimeDir};${path.join(sysRoot, 'System32')}`,
    SystemRoot: sysRoot,
    TEMP: workDir,
    TMP: workDir,
    ...extra,
  };
}

function validateFiles(files) {
  const names = Object.keys(files || {});
  if (!names.length) return '没有提交任何代码。';
  if (names.length > LIMITS.maxFiles) return `最多提交 ${LIMITS.maxFiles} 个文件。`;
  if (!names.some((n) => n.endsWith('.c'))) return '至少需要一个 .c 源文件。';
  for (const n of names) {
    if (!FILE_NAME_RE.test(n)) return `文件名 "${n}" 不合法：只能包含字母、数字、下划线、短横线，并以 .c 或 .h 结尾。`;
    if (typeof files[n] !== 'string') return `文件 "${n}" 的内容无效。`;
    if (Buffer.byteLength(files[n], 'utf8') > LIMITS.maxSourceBytes) return `文件 "${n}" 超过 ${LIMITS.maxSourceBytes / 1024}KB。`;
  }
  return null;
}

/**
 * 编译。
 * @param {object} p
 * @param {Record<string,string>} p.files
 * @param {string} p.workDir
 * @param {{opt?:string, sanitize?:boolean, track?:boolean, extraFlags?:string[], define?:Record<string,string>}} [p.options]
 */
export async function compile({ files, workDir, options = {} }) {
  const tc = getToolchain();
  const nat = getNativeArtifacts();
  const opt = ALLOWED_OPT.has(options.opt) ? options.opt : '-O0';
  const sanitize = options.sanitize !== false;
  const track = options.track !== false;
  const extra = (options.extraFlags || []).filter((f) => ALLOWED_EXTRA.has(f));

  for (const [name, src] of Object.entries(files)) fs.writeFileSync(path.join(workDir, name), src, 'utf8');

  const exe = path.join(workDir, 'prog.exe');
  const args = [
    '-std=c17', '-Wall', '-Wextra', '-g', opt,
    '-fno-omit-frame-pointer',
    '-fdiagnostics-color=never', '-fmessage-length=0', '-fdiagnostics-absolute-paths',
    '-Wl,--stack,67108864', // 64MB 栈（Windows 默认仅 1MB，与常见 Linux 判题环境 8MB+ 差距大）
    '-I', workDir,
    ...extra,
  ];
  if (sanitize) args.push('-fsanitize=address,undefined', '-fno-sanitize-recover=all');
  for (const [k, v] of Object.entries(options.define || {})) {
    if (/^[A-Za-z_]\w*$/.test(k) && /^[\w.-]*$/.test(String(v))) args.push(`-D${k}=${v}`);
  }
  // 用相对路径传源文件（cwd = workDir）：这样 __FILE__、泄漏报告、调试信息里只有文件名，不含用户目录
  args.push(...Object.keys(files).filter((n) => n.endsWith('.c')));
  if (track) {
    // 堆跟踪：链接器把学习者代码对 malloc 等的调用重定向到 clearn_track.o 中的包装函数
    // -u 强制链接器载入这些函数：否则学习者没用到的函数（如 calloc）不会从导入库中载入，
    // __real_calloc 会被解析成空地址，程序一调用就崩溃（实测 lld 的行为）
    args.push(nat.trackObj, `-Wl,${TRACK_WRAPS.map((f) => `--wrap=${f},-u,${f}`).join(',')}`);
  }
  args.push('-o', exe);

  const started = Date.now();
  const { code, output, timedOut } = await new Promise((resolve) => {
    execFile(
      tc.clang,
      args,
      { cwd: workDir, timeout: LIMITS.compileTimeoutMs, windowsHide: true, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8' },
      (err, stdout, stderr) => {
        resolve({
          code: err ? (typeof err.code === 'number' ? err.code : 1) : 0,
          output: (stdout || '') + (stderr || ''),
          timedOut: Boolean(err && err.killed),
        });
      },
    );
  });
  const ms = Date.now() - started;
  const cleaned = output.split(workDir + path.sep).join('').split(workDir.replace(/\\/g, '/') + '/').join('');
  const diagnostics = parseDiagnostics(output, workDir);
  if (timedOut) {
    return { ok: false, timedOut: true, ms, output: '编译超过 10 秒仍未完成，已终止。可能是代码中有非常大的数组初始化或宏展开。', diagnostics: [] };
  }
  return { ok: code === 0 && fs.existsSync(exe), exe, ms, output: cleaned.trim(), diagnostics, flags: { opt, sanitize, track } };
}

function spawnCollect(cmd, args, opts, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...opts, windowsHide: true });
    let out = '';
    let err = '';
    child.stdout.setEncoding('utf8').on('data', (d) => (out += d));
    child.stderr.setEncoding('utf8').on('data', (d) => (err += d));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, out, err }));
    if (input !== undefined) child.stdin.end(input);
  });
}

/**
 * 把 ASan 报告里 "#N 0xADDR  (X:\path\prog.exe+0xOFFSET)" 形式的帧，
 * 用 llvm-symbolizer（在沙箱外运行）还原为 "#N 0xADDR in 函数 文件:行:列"。
 * 沙箱内禁止创建子进程，所以 ASan 自己无法调用 symbolizer。
 */
async function symbolizeReport(text, exe) {
  const frameRe = /^(\s*#(\d+) (0x[0-9a-f]+)) {1,2}\((.+?)\+(0x[0-9a-f]+)\)\s*$/gim;
  const exeName = path.basename(exe).toLowerCase();
  const frames = [];
  for (const m of text.matchAll(frameRe)) {
    if (path.basename(m[4]).toLowerCase() === exeName) frames.push(m);
  }
  if (!frames.length) return text;
  const tc = getToolchain();
  // ASan 打印的偏移有时是完整虚拟地址（含映像基址），有时是相对基址的偏移（RVA），
  // llvm-symbolizer 需要的是虚拟地址，所以 RVA 要加上 PE 头里的 ImageBase。
  const imageBase = readImageBase(exe);
  // 非 0 号帧是返回地址，减 1 才落在调用指令上
  const queries = frames.map((m) => {
    let off = BigInt(m[5]);
    if (imageBase && off < imageBase) off += imageBase;
    off -= m[2] === '0' ? 0n : 1n;
    return `0x${off.toString(16)}`;
  });
  let res;
  try {
    res = await spawnCollect(path.join(tc.binDir, 'llvm-symbolizer.exe'), ['--obj=' + exe, '--relativenames', ...queries], {});
  } catch {
    return text;
  }
  const blocks = res.out.replace(/\r\n?/g, '\n').trim().split(/\n\n+/);
  let k = 0;
  return text.replace(frameRe, (whole, head, _n, _addr, mod) => {
    if (path.basename(mod).toLowerCase() !== exeName) return whole;
    const b = (blocks[k++] || '').split('\n');
    if (b.length < 2 || b[0] === '??') return whole;
    return `${head} in ${b[0]} ${b[1]}`;
  });
}

/** 用 llvm-symbolizer 把可执行文件中的虚拟地址还原为 { func, file, line } */
async function symbolizeAddrs(exe, addrs) {
  if (!addrs.length) return [];
  const tc = getToolchain();
  let res;
  try {
    res = await spawnCollect(path.join(tc.binDir, 'llvm-symbolizer.exe'), ['--obj=' + exe, '--relativenames', ...addrs.map((a) => `0x${a.toString(16)}`)], {});
  } catch {
    return addrs.map(() => null);
  }
  const blocks = res.out.replace(/\r\n?/g, '\n').trim().split(/\n\n+/);
  return addrs.map((_, k) => {
    const b = (blocks[k] || '').split('\n');
    const m = (b[1] || '').match(/^(.*):(\d+):(\d+)$/);
    if (!m || b[0] === '??') return null;
    return { func: b[0], file: m[1].replace(/\\/g, '/').split('/').pop(), line: Number(m[2]) };
  });
}

/**
 * 处理堆跟踪报告：把未释放分配点的 RVA 还原为源码位置，只保留学习者（和题目测试驱动）源文件中的分配。
 * C 运行库启动代码自己也会 malloc 几十字节且不释放，它们不算学习者的泄漏。
 */
async function resolveTrack(raw, exe, userFiles) {
  const imageBase = readImageBase(exe);
  // 记录的是返回地址，减 1 落在 call 指令上
  const addrs = (raw.sites || []).map((s) => imageBase + BigInt(s.rva) - 1n);
  const locs = await symbolizeAddrs(exe, addrs);
  const leaks = [];
  let leakBytes = 0;
  (raw.sites || []).forEach((s, k) => {
    const loc = locs[k];
    if (!loc || !userFiles.includes(loc.file)) return;
    leaks.push({ file: loc.file, line: loc.line, func: loc.func, bytes: s.bytes, count: s.count });
    leakBytes += s.bytes;
  });
  leaks.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  return {
    peak: raw.peak,
    allocs: raw.allocs,
    frees: raw.frees,
    limitExceeded: raw.limitExceeded,
    current: leakBytes, // 学习者代码中未释放的字节数
    leaks,
  };
}

function stripWorkDir(text, workDir) {
  if (!text) return text;
  let out = text;
  for (const sep of ['\\', '/']) {
    for (const d of [workDir, workDir.replace(/\\/g, '/')]) out = out.split(d + sep).join('');
  }
  return out;
}

/** 读取 PE32+ 可执行文件的 ImageBase；失败返回 0n */
function readImageBase(exe) {
  try {
    const fd = fs.openSync(exe, 'r');
    const head = Buffer.alloc(1024);
    fs.readSync(fd, head, 0, head.length, 0);
    fs.closeSync(fd);
    const pe = head.readUInt32LE(0x3c);
    if (head.readUInt32LE(pe) !== 0x00004550) return 0n; // "PE\0\0"
    const opt = pe + 24;
    const magic = head.readUInt16LE(opt);
    if (magic === 0x20b) return head.readBigUInt64LE(opt + 24); // PE32+
    if (magic === 0x10b) return BigInt(head.readUInt32LE(opt + 28)); // PE32
  } catch {
    /* ignore */
  }
  return 0n;
}

function readIf(p, max = 256 * 1024) {
  try {
    const buf = fs.readFileSync(p);
    return buf.subarray(0, max).toString('utf8');
  } catch {
    return '';
  }
}

/**
 * 在沙箱中运行一次已编译的程序。
 * @returns {Promise<object>} 原始运行结果（含 sanitizer 报告、堆跟踪报告）
 */
export async function runSandboxed({
  exe, workDir, stdinText = '', timeMs = LIMITS.runTimeMs, tag = 'run', userFiles = ['main.c'],
  dataFiles = {}, collectFiles = [],
}) {
  const nat = getNativeArtifacts();
  // 每次运行使用独立的子目录作为程序的工作目录：
  //   - 文件读写题的每组用例互不干扰（并行运行时尤其重要）；
  //   - 该目录被标记为"低完整性"，程序只能写入这里，不能修改电脑上的其他文件。
  // 标准输入输出等判题文件放在子目录之外，程序无法篡改。
  const runDir = path.join(workDir, `${tag}.dir`);
  fs.mkdirSync(runDir, { recursive: true });
  for (const [name, content] of Object.entries(dataFiles)) {
    if (!DATA_FILE_RE.test(name)) throw new Error(`题目数据文件名不合法：${name}`);
    fs.writeFileSync(path.join(runDir, name), content, typeof content === 'string' ? 'utf8' : undefined);
  }
  const inPath = path.join(workDir, `${tag}.in`);
  const outPath = path.join(workDir, `${tag}.out`);
  const errPath = path.join(workDir, `${tag}.err`);
  // sanitizer 报告直接写到 stderr，不用 log_path：实测栈溢出时 ASan 已没有栈空间去打开日志文件，
  // 报告会整个丢失，而写 stderr 仍然成功。
  // 堆跟踪报告由程序自己写出，所以必须位于可写的 runDir 内（文件名以点开头，不与题目文件冲突）。
  const trackPath = path.join(runDir, '.clearn_track.json');
  fs.writeFileSync(inPath, stdinText.slice(0, LIMITS.maxStdinBytes), 'utf8');

  const cpu = Math.max(100, Math.min(timeMs, 2000));
  const wall = Math.min(cpu * 2 + 500, LIMITS.maxRunWallMs);
  const env = sandboxEnv(runDir, {
    ASAN_OPTIONS: [
      'symbolize=0', 'detect_leaks=0', 'allocator_may_return_null=1',
      'detect_stack_use_after_return=1', 'halt_on_error=1', 'handle_abort=1', 'print_summary=1',
    ].join(':'),
    UBSAN_OPTIONS: ['print_stacktrace=1', 'halt_on_error=1', 'symbolize=0'].join(':'),
    CLEARN_TRACK_OUT: trackPath,
    CLEARN_HEAP_LIMIT: String(LIMITS.heapLimitMb * 1024 * 1024),
  });
  const args = [
    '--time-ms', String(cpu), '--wall-ms', String(wall),
    '--mem-mb', String(LIMITS.processHardLimitMb), '--out-limit', String(LIMITS.outputLimitBytes),
    '--stdin', inPath, '--stdout', outPath, '--stderr', errPath, '--cwd', runDir, '--low-il', '1',
    '--', exe,
  ];
  const r = await spawnCollect(nat.runner, args, { cwd: workDir, env });
  let info;
  try {
    info = JSON.parse(r.out.trim().split(/\r?\n/).pop());
  } catch {
    throw new Error(`判题沙箱启动失败：${r.out || r.err || '无输出'}`);
  }
  if (info.status === 'error') throw new Error(`判题沙箱错误：${info.error}（Win32 错误码 ${info.win32}）`);

  let stderr = readIf(errPath, LIMITS.outputLimitBytes);
  let sanText = '';
  if (/runtime error:|ERROR: AddressSanitizer/.test(stderr)) {
    stderr = await symbolizeReport(stderr, exe);
    sanText = stderr;
  }
  // 去掉临时目录前缀（其中含用户名），只保留文件名
  stderr = stripWorkDir(stderr, workDir);
  sanText = stripWorkDir(sanText, workDir);

  let track = null;
  const tj = readIf(trackPath);
  if (tj) {
    try {
      track = await resolveTrack(JSON.parse(tj), exe, userFiles);
    } catch {
      track = null;
    }
  }
  // 文件读写题：收集程序写出的文件（Buffer；不存在记为 null）
  const files = {};
  for (const name of collectFiles) {
    try {
      files[name] = fs.readFileSync(path.join(runDir, name)).subarray(0, LIMITS.outputLimitBytes);
    } catch {
      files[name] = null;
    }
  }
  return {
    ...info,
    stdout: readIf(outPath, LIMITS.outputLimitBytes),
    stderr,
    sanitizer: parseSanitizer(sanText, userFiles),
    track,
    files,
  };
}

/**
 * 把一次运行的原始结果归类为判题状态（不含 WA/AC 判断，那需要比对输出）。
 * @returns {null | {verdict:string, reason:string, message:string}}
 */
export function classifyRun(run) {
  if (run.track && run.track.limitExceeded) {
    return { verdict: 'MLE', reason: 'heap', message: `堆内存使用超过 ${LIMITS.heapLimitMb}MB 上限。检查是否分配了过大的数组、或在循环里不断 malloc 却没有 free。` };
  }
  if (run.exitCode === MLE_EXIT_CODE || run.memoryLimitHit) {
    return { verdict: 'MLE', reason: 'process', message: `程序占用的内存超过上限。检查是否申请了过大的数组（包括全局数组）。` };
  }
  if (run.cpuTimeout || run.wallTimeout || run.status === 'timeout') {
    return {
      verdict: 'TLE',
      reason: run.cpuTimeout ? 'cpu' : 'wall',
      message: run.cpuTimeout
        ? '运行时间超过限制。常见原因：死循环（循环条件永远成立）、算法太慢，或者 scanf 读取失败后循环一直在原地打转。'
        : '程序长时间没有结束，也没有占用 CPU。通常是在等待输入：程序读取的数据比实际提供的多。',
    };
  }
  if (run.stdoutTruncated || run.stderrTruncated) {
    // 需求中的状态集合没有 OLE，输出超限按"答案错误"处理，并给出明确原因
    return { verdict: 'WA', reason: 'output-limit', message: `输出超过 ${LIMITS.outputLimitBytes / 1024}KB 上限，已被截断并终止。通常是循环没有正确结束，一直在打印。` };
  }
  if (run.sanitizer) {
    const s = run.sanitizer;
    return { verdict: s.tool === 'ubsan' ? 'UB' : 'RE', reason: s.tool, message: `${s.title}：${s.explanation}`, sanitizer: s };
  }
  if (run.processLimitHit && run.exitCode !== 0) {
    return { verdict: 'RE', reason: 'process', message: '程序试图启动其他程序，判题环境禁止这样做。' };
  }
  if (run.exitCode !== 0) {
    const d = describeExitCode(run.exitCode);
    return { verdict: 'RE', reason: 'exit', message: d };
  }
  return null;
}

const VERDICT_TEXT = {
  AC: '通过', WA: '答案错误', TLE: '运行超时', MLE: '内存超限', RE: '运行错误', CE: '编译错误', UB: '未定义行为', LEAK: '内存泄漏',
};
export { VERDICT_TEXT };

function clip(s, n = 4096) {
  if (s.length <= n) return s;
  return s.slice(0, n) + `\n…（共 ${s.length} 个字符，只显示前 ${n} 个）`;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const k = next++;
      out[k] = await fn(items[k], k);
    }
  });
  await Promise.all(workers);
  return out;
}

/** 题目数据文件：字符串按 UTF-8 写入；{ base64 } 按二进制写入 */
function decodeDataFiles(files = {}) {
  const out = {};
  for (const [name, v] of Object.entries(files)) out[name] = typeof v === 'string' ? v : Buffer.from(v.base64, 'base64');
  return out;
}

/**
 * 文件读写题：检查程序写出的文件。
 * expectFiles: [{ name, content? , base64?, compare? }]
 *   - compare 'bytes'：逐字节比较（用于文本/二进制模式、\r\n 相关的题目）
 *   - 其他取值与标准输出比对相同（默认沿用题目的 compare）
 */
function checkExpectedFiles(actualFiles, expectFiles, compare, eps) {
  for (const f of expectFiles) {
    const got = actualFiles[f.name];
    if (got === null || got === undefined) {
      return { verdict: 'WA', reason: 'file-missing', message: `程序没有生成文件 ${f.name}。检查 fopen 的文件名和打开模式是否正确，以及是否调用了 fclose。` };
    }
    const mode = f.compare || compare;
    if (mode === 'bytes') {
      const want = f.base64 !== undefined ? Buffer.from(f.base64, 'base64') : Buffer.from(f.content, 'utf8');
      if (!want.equals(got)) {
        let at = 0;
        while (at < want.length && at < got.length && want[at] === got[at]) at++;
        return {
          verdict: 'WA', reason: 'file-diff',
          message: `文件 ${f.name} 的内容不正确：从第 ${at} 字节开始不同（期望共 ${want.length} 字节，实际 ${got.length} 字节）。`,
          fileDiff: { name: f.name, offset: at, expectedBytes: want.length, actualBytes: got.length },
        };
      }
    } else {
      const cmp = compareOutput(got.toString('utf8'), f.content, mode, eps);
      if (!cmp.ok) {
        return { verdict: 'WA', reason: 'file-diff', message: `文件 ${f.name} 的内容和预期不一致。`, diff: { file: f.name, ...cmp.firstDiff } };
      }
    }
  }
  return null;
}

/** 安全检查 + 编译；失败时返回 CE 结果，成功时返回 null 和编译信息 */
async function prepare(files, workDir, options, harnessFiles = {}) {
  const bad = validateFiles(files);
  if (bad) return { ce: { verdict: 'CE', compile: { ok: false, output: bad, diagnostics: [], security: true } } };
  // 安全检查只针对学习者代码；题目提供的测试驱动是可信的。
  // 但学习者代码可以 #include 题目提供的头文件，所以把它们的文件名告诉检查器。
  const sec = securityCheck(files, Object.keys(harnessFiles));
  if (!sec.ok) {
    return {
      ce: {
        verdict: 'CE',
        compile: {
          ok: false,
          security: true,
          output: sec.violations.map((v) => `${v.file}:${v.line}: ${v.message}`).join('\n'),
          diagnostics: sec.violations.map((v) => ({ file: v.file, line: v.line, column: 1, level: 'error', message: v.message, hint: null })),
        },
      },
    };
  }
  const c = await compile({ files: { ...files, ...harnessFiles }, workDir, options });
  const compileInfo = { ok: c.ok, output: c.output, diagnostics: c.diagnostics, ms: c.ms, flags: c.flags };
  if (!c.ok) return { ce: { verdict: 'CE', compile: compileInfo } };
  return { exe: c.exe, compile: compileInfo };
}

/**
 * 提交判题。
 * @param {object} p
 * @param {Record<string,string>} p.files      学习者代码（文件名 -> 内容）
 * @param {Array<{input:string, output:string, hidden?:boolean, category?:string}>} p.tests
 * @param {number} [p.timeMs]                  每组 CPU 时间上限
 * @param {'lines'|'exact'|'tokens'|'float'} [p.compare]
 * @param {boolean} [p.checkLeaks]             输出正确但有泄漏时判 LEAK
 * @param {object} [p.compileOptions]
 */
export async function judgeSubmission({
  files, tests, timeMs = LIMITS.runTimeMs, compare = 'lines', eps, checkLeaks = false, compileOptions = {},
  harnessFiles = {},
}) {
  const workDir = makeWorkDir();
  const staticIssues = validateFiles(files) ? [] : scanStatic(files);
  try {
    // 函数实现题：题目提供的隐藏文件（含 main 的测试驱动、头文件）与学习者代码一起编译。
    // 学习者不能提交同名文件来替换它们。
    const clash = Object.keys(files).filter((n) => n in harnessFiles);
    if (clash.length) {
      return {
        verdict: 'CE', verdictText: VERDICT_TEXT.CE, cases: [], passed: 0, total: tests.length, staticIssues,
        compile: { ok: false, security: true, diagnostics: [], output: `文件 ${clash.join('、')} 由题目提供，不能提交同名文件。` },
      };
    }
    const prep = await prepare(files, workDir, compileOptions, harnessFiles);
    if (prep.ce) return { ...prep.ce, verdictText: VERDICT_TEXT.CE, cases: [], passed: 0, total: tests.length, staticIssues };
    const userFiles = [...Object.keys(files), ...Object.keys(harnessFiles)];

    const cases = await mapLimit(tests, 3, async (t, k) => {
      const expectFiles = t.expectFiles || [];
      const run = await runSandboxed({
        exe: prep.exe, workDir, stdinText: t.input || '', timeMs, tag: `case${k}`, userFiles,
        dataFiles: decodeDataFiles(t.files), collectFiles: expectFiles.map((f) => f.name),
      });
      const hidden = Boolean(t.hidden);
      const base = {
        index: k + 1,
        hidden,
        category: t.category || (hidden ? '隐藏用例' : '示例'),
        timeMs: run.cpuMs,
        wallMs: run.wallMs,
        memKB: run.peakMemKB,
        heapPeak: run.track ? run.track.peak : null,
      };
      let res = classifyRun(run);
      if (!res) res = checkExpectedFiles(run.files, expectFiles, compare, eps);
      if (!res) {
        const cmp = compareOutput(run.stdout, t.output ?? '', compare, eps);
        if (!cmp.ok) {
          const fmtOnly = compare === 'lines' && onlyWhitespaceDiffers(run.stdout, t.output);
          res = {
            verdict: 'WA',
            reason: fmtOnly ? 'format' : 'diff',
            message: fmtOnly ? '输出的内容是对的，但空格或换行的格式和要求不一致。' : '输出和预期答案不一致。',
            diff: cmp.firstDiff,
          };
        } else if (checkLeaks && run.track && run.track.current > 0) {
          res = {
            verdict: 'LEAK',
            reason: 'leak',
            message: `输出正确，但程序结束时还有 ${run.track.current} 字节内存没有释放。没有释放的内存是在这些位置分配的：${run.track.leaks.map((l) => `${l.file} 第 ${l.line} 行（${l.count} 块，共 ${l.bytes} 字节）`).join('；')}。`,
            leaks: run.track.leaks,
          };
        } else {
          res = { verdict: 'AC', reason: 'ok', message: '通过' };
        }
      }
      const out = { ...base, ...res, verdictText: VERDICT_TEXT[res.verdict] };
      if (!hidden) {
        out.input = clip(t.input);
        out.expected = clip(t.output);
        out.actual = clip(run.stdout);
        out.stderr = clip(run.stderr, 2048);
      } else {
        delete out.diff; // 隐藏用例：不泄露具体数据
      }
      if (run.track && run.track.leaks && run.track.leaks.length && !out.leaks) out.leaks = run.track.leaks;
      return out;
    });

    const firstBad = cases.find((c) => c.verdict !== 'AC');
    const verdict = firstBad ? firstBad.verdict : 'AC';
    return {
      verdict,
      verdictText: VERDICT_TEXT[verdict],
      compile: prep.compile,
      cases,
      passed: cases.filter((c) => c.verdict === 'AC').length,
      total: cases.length,
      maxTimeMs: Math.max(0, ...cases.map((c) => c.timeMs || 0)),
      staticIssues,
    };
  } finally {
    rmrf(workDir);
  }
}

/**
 * "运行"按钮：编译并用给定输入运行一次，返回输出（不判对错）。
 * 知识点页面的演示代码可以指定编译选项（例如 -O2、关闭 sanitizer，用于演示 UB 在不同优化级别下的表现）。
 */
export async function runCode({ files, stdin = '', options = {}, timeMs = LIMITS.runTimeMs, dataFiles = {}, harnessFiles = {} }) {
  const workDir = makeWorkDir();
  const staticIssues = validateFiles(files) ? [] : scanStatic(files);
  try {
    const prep = await prepare(files, workDir, options, harnessFiles);
    if (prep.ce) return { ...prep.ce, verdictText: VERDICT_TEXT.CE, staticIssues };
    const run = await runSandboxed({
      exe: prep.exe, workDir, stdinText: stdin, timeMs, tag: 'run',
      userFiles: [...Object.keys(files), ...Object.keys(harnessFiles)], dataFiles: decodeDataFiles(dataFiles),
    });
    const res = classifyRun(run);
    return {
      verdict: res ? res.verdict : 'OK',
      verdictText: res ? VERDICT_TEXT[res.verdict] : '运行结束',
      message: res ? res.message : '',
      sanitizer: run.sanitizer,
      compile: prep.compile,
      // Windows 上 stdout 是文本模式，'\n' 会被写成 "\r\n"；展示给学习者时统一成 '\n'
      stdout: run.stdout.replace(/\r\n/g, '\n'),
      stderr: run.stderr.replace(/\r\n/g, '\n'),
      stdoutTruncated: run.stdoutTruncated,
      exitCode: run.exitCode,
      timeMs: run.cpuMs,
      wallMs: run.wallMs,
      memKB: run.peakMemKB,
      heap: run.track,
      staticIssues,
    };
  } finally {
    rmrf(workDir);
  }
}
