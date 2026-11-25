// 内容构建与校验。
//
//   node scripts/content/build.mjs            只做结构校验 + 生成 content/build/*.json
//   node scripts/content/build.mjs --verify   另外真实运行所有代码：
//       · 知识点页面的每个可运行代码块：结果与 expect 一致、输出与 output 块一致
//       · 每道编程题：参考代码 -std=c17 -Wall -Wextra 零警告；在判题器中全部用例 AC；
//         初始代码能编译且不能直接 AC；每个附代码的"常见错误"得到标注的判题结果
//   --only <ID 前缀>   只处理匹配的知识点/题目（例如 --only s1-）
//   --no-cache        忽略校验缓存
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseLesson } from './lesson.mjs';
import { parseProblem } from './problem.mjs';
import { compareOutput } from '../../server/judge/compare.js';
import { judgeSubmission, runCode } from '../../server/judge/judge.js';
import { getToolchain } from '../../server/judge/paths.js';
import { writeReports } from './report.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const C = (...p) => path.join(ROOT, 'content', ...p);
const args = process.argv.slice(2);
const VERIFY = args.includes('--verify');
const NO_CACHE = args.includes('--no-cache');
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const matches = (id) => !ONLY || id.startsWith(ONLY) || id.startsWith('p-' + ONLY) || id.startsWith('q-' + ONLY);

// ---------- 0. 知识体系校验 ----------
try {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'check-curriculum.mjs')], { stdio: 'pipe' });
} catch (e) {
  console.error(String(e.stdout || e.message));
  process.exit(1);
}
const curriculum = JSON.parse(fs.readFileSync(C('curriculum.json'), 'utf8'));
const kpById = new Map(curriculum.knowledgePoints.map((k) => [k.id, k]));

const problems = [];
const testsById = {};
const lessons = [];
const quizzes = [];
const report = { errors: {}, verify: {} };
const addErr = (id, list) => {
  if (list.length) report.errors[id] = (report.errors[id] || []).concat(list);
};

// ---------- 1. 解析知识点 ----------
for (const kp of curriculum.knowledgePoints) {
  const f = C('lessons', `${kp.id}.md`);
  if (!fs.existsSync(f)) continue; // 尚未编写：在报告中体现为"缺内容"
  const text = fs.readFileSync(f, 'utf8');
  const r = parseLesson(text, kp);
  addErr(kp.id, r.errors);
  if (r.lesson) {
    r.lesson.hash = sha(text);
    lessons.push(r.lesson);
    quizzes.push(...r.quizzes);
  }
}

// ---------- 2. 解析编程题 ----------
const probDir = C('problems');
for (const stage of fs.existsSync(probDir) ? fs.readdirSync(probDir).sort() : []) {
  for (const name of fs.readdirSync(path.join(probDir, stage)).filter((n) => n.endsWith('.md')).sort()) {
    const text = fs.readFileSync(path.join(probDir, stage, name), 'utf8');
    const r = parseProblem(text, kpById, name);
    const id = r.problem?.id || name;
    addErr(id, r.errors);
    // front matter 写坏（例如把 ---json 拆成两行）时 id 会是 undefined：
    // 跳过这道题并报错，否则下面的 --only 前缀匹配会因为 undefined 直接崩掉整次构建
    if (r.problem && !r.problem.id) addErr(id, ['front matter 缺少合法的 id（题目开头必须是 ---json 一行），已跳过这道题']);
    if (r.problem && r.problem.id) {
      if (!r.problem.knowledgePoints.length || kpById.get(r.problem.knowledgePoints[0])?.stage !== stage) {
        addErr(id, [`文件放在 problems/${stage}/，但第一个关联知识点不属于该阶段`]);
      }
      r.problem.hash = sha(text);
      problems.push(r.problem);
      testsById[r.problem.id] = r.tests;
    }
  }
}
const seen = new Set();
for (const id of [...problems.map((p) => p.id), ...quizzes.map((q) => q.id)]) {
  if (seen.has(id)) addErr(id, [`题目 ID 重复：${id}`]);
  seen.add(id);
}

// ---------- 3. 真实运行校验 ----------
if (VERIFY) {
  const cachePath = C('build', '.verify-cache.json');
  const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};
  const judgeVersion = hashDir(path.join(ROOT, 'server', 'judge')) + hashDir(path.join(ROOT, 'native'), /\.(c|h)$/);
  const jobs = [
    ...lessons.filter((l) => matches(l.id)).map((l) => ({ id: l.id, key: l.hash + judgeVersion, run: () => verifyLesson(l) })),
    ...problems.filter((p) => matches(p.id)).map((p) => ({ id: p.id, key: p.hash + judgeVersion, run: () => verifyProblem(p, testsById[p.id]) })),
  ];
  let done = 0;
  await mapLimit(jobs, 2, async (job) => {
    let res = !NO_CACHE && cache[job.id]?.key === job.key ? cache[job.id].result : null; // --no-cache 只跳过查找，不清空其他条目
    const cached = Boolean(res);
    if (!res) {
      try {
        res = await job.run();
      } catch (e) {
        res = { ok: false, problems: [`校验过程出错：${e.stack || e.message}`] };
      }
      if (res.ok) cache[job.id] = { key: job.key, result: res };
      else delete cache[job.id];
    }
    done++;
    report.verify[job.id] = res;
    process.stdout.write(`${res.ok ? '✔' : '✖'} [${done}/${jobs.length}] ${job.id}${cached ? '（缓存）' : ''}\n`);
    if (!res.ok) for (const m of res.problems) process.stdout.write(`    - ${m.split('\n').join('\n      ')}\n`);
  });
  fs.mkdirSync(C('build'), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 1));
}

// ---------- 4. 输出构建产物 ----------
// 回填 associated_problem_ids（编程题 + 客观题）
const assoc = new Map(curriculum.knowledgePoints.map((k) => [k.id, []]));
for (const p of problems) for (const k of p.knowledgePoints) assoc.get(k)?.push(p.id);
for (const q of quizzes) assoc.get(q.knowledgePoint)?.push(q.id);
const builtCurriculum = {
  ...curriculum,
  knowledgePoints: curriculum.knowledgePoints.map((k) => ({ ...k, associated_problem_ids: assoc.get(k.id) })),
};
fs.mkdirSync(C('build', 'tests'), { recursive: true });
fs.writeFileSync(C('build', 'curriculum.json'), JSON.stringify(builtCurriculum, null, 1));
fs.writeFileSync(C('build', 'lessons.json'), JSON.stringify(lessons));
// 题目元数据：不含参考代码以外的隐藏信息；参考代码保留（学习者 AC 后或主动查看时展示）
fs.writeFileSync(C('build', 'problems.json'), JSON.stringify({ programming: problems, quizzes }));
for (const name of fs.readdirSync(C('build', 'tests'))) {
  // 并发构建时另一个进程可能已经把文件删掉了，忽略这种竞争
  try {
    fs.rmSync(C('build', 'tests', name));
  } catch {
    /* 已被其他进程删除 */
  }
}
for (const [id, tests] of Object.entries(testsById)) fs.writeFileSync(C('build', 'tests', `${id}.json`), JSON.stringify(tests));

const summary = writeReports({ root: ROOT, curriculum: builtCurriculum, lessons, problems, quizzes, testsById, report, verified: VERIFY, only: ONLY });

const nErr = Object.values(report.errors).flat().length;
const nFail = Object.values(report.verify).filter((v) => !v.ok).length;
if (nErr) {
  console.log(`\n结构问题（${nErr}）：`);
  for (const [id, list] of Object.entries(report.errors)) for (const m of list) console.log(`  ✖ ${id}：${m}`);
}
console.log(`\n${summary}`);
console.log(
  nErr || nFail
    ? `\n❌ 有 ${nErr} 个结构问题、${nFail} 项运行校验失败`
    : `\n✅ 已有内容的${VERIFY ? '结构与运行' : '结构'}校验通过${VERIFY ? '' : '（未做运行校验，加 --verify）'}。注意：这不代表内容已经写完，完成度以上面的统计和 docs/COVERAGE.md 为准。`,
);
process.exit(nErr || nFail ? 1 : 0);

// =====================================================================
async function verifyLesson(l) {
  const problems = [];
  for (const b of l.runBlocks) {
    const r = await runCode({ files: { 'main.c': b.code }, stdin: b.stdin, options: b.options });
    const where = `代码块 ${b.id}（第 ${b.line} 行）`;
    if (r.verdict !== b.expect) {
      problems.push(`${where}：期望结果 ${b.expect}，实际 ${r.verdict}${r.compile?.output ? '\n' + r.compile.output : ''}${r.message ? '\n' + r.message : ''}`);
      continue;
    }
    if (b.expect === 'OK' && r.compile.diagnostics.some((d) => d.level === 'warning') && !b.allowWarnings) {
      problems.push(`${where}：示例代码有编译警告：\n${r.compile.output}`);
    }
    if (b.output && !b.nocheck) {
      const ok = matchOutput(r.stdout, b.output);
      if (!ok) problems.push(`${where}：输出与 output 块不一致\n--- 预期（${b.output.match}）\n${b.output.text}\n--- 实际\n${r.stdout}`);
    }
  }
  return { ok: !problems.length, problems, blocks: l.runBlocks.length };
}

function matchOutput(actual, out) {
  if (out.match === 'contains') return actual.includes(out.text);
  if (out.match === 'regex') {
    const a = actual.replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n');
    const e = out.text.replace(/\n+$/, '').split('\n');
    return a.length === e.length && e.every((re, k) => new RegExp(`^(?:${re})$`).test(a[k].replace(/\s+$/, '')));
  }
  return compareOutput(actual, out.text, 'lines').ok;
}

async function verifyProblem(p, tests) {
  const problems = [];
  const J = p.judge;
  const harnessFiles = { ...p.harness.visible, ...p.harness.hidden };
  const common = { tests, timeMs: J.timeMs, compare: J.compare, eps: J.eps, checkLeaks: J.checkLeaks, harnessFiles };

  // 1) 参考代码零警告（-std=c17 -Wall -Wextra，按需求 3.2）
  const warn = await warningsOf({ ...p.reference, ...harnessFiles });
  if (warn) problems.push(`参考代码在 -std=c17 -Wall -Wextra 下有警告：\n${warn}`);

  // 2) 参考代码全部 AC
  const ref = await judgeSubmission({ ...common, files: p.reference });
  if (ref.verdict !== 'AC') {
    problems.push(`参考代码没有 AC：${ref.verdict}\n${describeFailure(ref, tests)}`);
  }
  if (ref.staticIssues?.length) problems.push(`参考代码触发了静态扫描警告（参考代码应当是示范写法）：\n${ref.staticIssues.map((s) => `${s.file}:${s.line} ${s.rule}`).join('\n')}`);

  // 3) 初始代码能编译、但不能直接通过
  const st = await judgeSubmission({ ...common, files: p.starter });
  // 编译/链接诊断题的初始代码本来就是"有错的工程"，允许（也要求）它无法通过编译或链接
  if (p.special === 'link-diagnosis') {
    if (st.verdict !== 'CE') problems.push(`编译/链接诊断题的初始代码应当编译或链接失败，实际为 ${st.verdict}`);
  } else if (st.verdict === 'CE') {
    problems.push(`初始代码无法编译（会让初学者一打开就看到报错）：\n${st.compile.output}`);
  }
  if (st.verdict === 'AC') problems.push('初始代码直接就能 AC，题目没有意义');

  // 4) 常见错误：附了代码的必须得到标注的结果
  for (const m of p.mistakes) {
    if (!m.files) continue; // 只有文字说明、没有附代码的常见错误
    const r = await judgeSubmission({ ...common, files: m.files });
    if (!m.verdicts.includes(r.verdict)) {
      problems.push(`常见错误 "${m.title}"：标注为 ${m.verdicts.join('/')}，实际判题结果 ${r.verdict}${r.verdict === 'AC' ? '（隐藏用例没有抓住这个错误）' : ''}\n${describeFailure(r, tests)}`);
    }
  }
  return { ok: !problems.length, problems, refMaxMs: ref.maxTimeMs, tests: tests.length };
}

function describeFailure(r, tests) {
  if (r.verdict === 'CE') return r.compile.output;
  const bad = (r.cases || []).filter((c) => c.verdict !== 'AC').slice(0, 3);
  return bad
    .map((c) => {
      const t = tests[c.index - 1];
      return `  用例 ${t?.name}（${t?.kind} ${t?.category}）：${c.verdict} ${c.message}${c.diff ? `\n    第 ${c.diff.line ?? c.diff.token} 处 期望 ${JSON.stringify(c.diff.expected)} 实际 ${JSON.stringify(c.diff.actual)}` : ''}`;
    })
    .join('\n');
}

async function warningsOf(files) {
  const tc = getToolchain();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clearn-warn-'));
  try {
    for (const [n, s] of Object.entries(files)) fs.writeFileSync(path.join(dir, n), s);
    const cs = Object.keys(files).filter((n) => n.endsWith('.c'));
    const out = await new Promise((resolve) => {
      execFile(tc.clang, ['-std=c17', '-Wall', '-Wextra', '-fsyntax-only', '-fdiagnostics-color=never', ...cs], { cwd: dir, encoding: 'utf8' }, (e, so, se) => resolve((so || '') + (se || '')));
    });
    return /warning:|error:/.test(out) ? out.trim() : '';
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sha(s) {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
}
function hashDir(dir, re = /\.js$/) {
  const h = crypto.createHash('sha256');
  for (const n of fs.readdirSync(dir).filter((x) => re.test(x)).sort()) h.update(n + fs.readFileSync(path.join(dir, n)));
  return h.digest('hex').slice(0, 12);
}
async function mapLimit(items, limit, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await fn(items[next++]);
  }));
}
