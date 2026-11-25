// 解析并做结构校验：content/problems/<阶段>/<题目ID>.md（需求 3.2 节的全部字段）
import { splitFrontMatter, tokenize, sectionize, nodesToMarkdown, collectFiles } from './md.mjs';
import { ALL_SPECIAL, STAGE1_SUBSTITUTES } from './lesson.mjs';

const SECTIONS = ['题目描述', '输入格式', '输出格式', '数据范围', '示例', '提示', '参考代码', '初始代码', '复杂度', '常见错误', '测试用例'];
const OPTIONAL_SECTIONS = ['测试驱动'];
const VERDICTS = new Set(['WA', 'TLE', 'MLE', 'RE', 'CE', 'UB', 'LEAK']);
const KINDS = new Set(['sample', 'boundary', 'degenerate', 'trap', 'normal', 'stress']);
const MODES = new Set(['stdio', 'function', 'multi']);
const COMPARES = new Set(['lines', 'exact', 'tokens', 'float']);
export const DIFFICULTIES = ['L1', 'L2', 'L3', 'L4', 'L5'];

/** 题目内置的确定性随机数（生成大规模用例用），种子固定保证每次构建结果一致 */
function makeRng(seed = 20261124) {
  let s = seed >>> 0;
  const next = () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
  return {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)), // 闭区间 [lo, hi]
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  };
}

function ioOf(nodes) {
  const r = { input: undefined, output: undefined, files: {}, expectFiles: [] };
  for (const n of nodes) {
    if (n.type !== 'code') continue;
    const body = n.body === '' ? '' : n.body + '\n';
    if (n.lang === 'in') r.input = body;
    else if (n.lang === 'out') r.output = body;
    else if (n.lang === 'file') r.files[n.attrs.name] = n.attrs.base64 ? { base64: n.body.trim() } : body;
    else if (n.lang === 'expect-file') {
      const f = { name: n.attrs.name, compare: n.attrs.compare };
      if (n.attrs.base64) f.base64 = n.body.trim();
      else f.content = body;
      r.expectFiles.push(f);
    }
  }
  return r;
}

/**
 * @param {string} text
 * @param {Map<string, object>} kpById
 * @returns {{ problem: object|null, errors: string[] }}
 */
export function parseProblem(text, kpById, fileName = '') {
  const errors = [];
  const err = (m) => errors.push(m);
  let fm;
  let nodes;
  try {
    fm = splitFrontMatter(text);
    nodes = tokenize(fm.body);
  } catch (e) {
    return { problem: null, errors: [e.message] };
  }
  for (const n of nodes) n.line += fm.lineOffset;
  const m = fm.meta;

  // ---------- 元数据 ----------
  if (!/^p-s[1-7]-[a-z0-9-]+-\d+$/.test(m.id || '')) err(`题目 ID 格式应为 p-<知识点ID>-<序号>：${m.id}`);
  if (fileName && fileName !== `${m.id}.md`) err(`文件名 ${fileName} 应与题目 ID 一致（${m.id}.md）`);
  if (!m.title || m.title.length < 4) err('缺少标题（一句话描述任务）');
  if (!DIFFICULTIES.includes(m.difficulty)) err(`难度必须是 L1–L5：${m.difficulty}`);
  if (!Array.isArray(m.knowledgePoints) || !m.knowledgePoints.length) err('缺少关联知识点 knowledgePoints');
  else for (const k of m.knowledgePoints) if (!kpById.has(k)) err(`关联知识点不存在：${k}`);
  if (m.knowledgePoints?.length && !m.id?.startsWith(`p-${m.knowledgePoints[0]}-`)) err(`题目 ID 应以第一个关联知识点开头：p-${m.knowledgePoints[0]}-`);
  if (m.special !== null && m.special !== undefined && !ALL_SPECIAL.includes(m.special)) err(`未知的特殊题型：${m.special}`);
  if (STAGE1_SUBSTITUTES[m.special] && kpById.get(m.knowledgePoints?.[0])?.stage !== 's1') err(`替代题型 ${m.special} 只能用于阶段 1`);
  const judge = { mode: 'stdio', timeMs: 1000, compare: 'lines', checkLeaks: false, ...(m.judge || {}) };
  if (!MODES.has(judge.mode)) err(`judge.mode 不合法：${judge.mode}`);
  if (!COMPARES.has(judge.compare)) err(`judge.compare 不合法：${judge.compare}`);
  if (!(judge.timeMs >= 100 && judge.timeMs <= 2000)) err('judge.timeMs 必须在 100–2000 之间');

  // ---------- 小节 ----------
  const sections = sectionize(nodes);
  const S = new Map(sections.map((s) => [s.title, s]));
  for (const t of SECTIONS) if (!S.has(t)) err(`缺少 "## ${t}" 小节`);
  for (const s of sections) if (!SECTIONS.includes(s.title) && !OPTIONAL_SECTIONS.includes(s.title)) err(`未知的二级标题 "## ${s.title}"`);
  if (judge.mode === 'function' && !S.has('测试驱动')) err('function 模式必须有 "## 测试驱动" 小节');
  const md = (t) => (S.has(t) ? nodesToMarkdown(S.get(t).nodes) : '');
  for (const t of ['题目描述', '输入格式', '输出格式', '数据范围', '复杂度']) {
    if (S.has(t) && md(t).length < 6) err(`"## ${t}" 内容为空或过短`);
  }

  // 示例：至少 2 组，其中至少 1 组标题含"边界"
  const samples = [];
  for (const sub of S.get('示例')?.subsections || []) {
    const io = ioOf(sub.nodes);
    const note = nodesToMarkdown(sub.nodes.filter((n) => n.type === 'text'));
    if (io.input === undefined || io.output === undefined) err(`示例 "${sub.title}" 缺少 in 或 out 块`);
    samples.push({ title: sub.title, input: io.input ?? '', output: io.output ?? '', files: io.files, expectFiles: io.expectFiles, note });
  }
  if (S.has('示例')) {
    if (samples.length < 2) err('示例至少需要 2 组');
    if (!samples.some((s) => /边界/.test(s.title))) err('示例中至少要有 1 组覆盖边界（示例标题中注明"边界"）');
  }

  // 提示：恰好三层
  const hints = (S.get('提示')?.subsections || []).map((s) => nodesToMarkdown(s.nodes.filter((n) => n.type !== 'heading')));
  const hintTitles = (S.get('提示')?.subsections || []).map((s) => s.title);
  if (S.has('提示') && hintTitles.join(',') !== '第 1 层,第 2 层,第 3 层') err('提示必须恰好包含 "### 第 1 层" "### 第 2 层" "### 第 3 层"');
  if (hints.some((h) => h.length < 6)) err('某一层提示内容为空');

  // 代码
  let reference = {};
  let starter = {};
  let harness = { visible: {}, hidden: {} };
  try {
    reference = collectFiles(S.get('参考代码')?.nodes || []);
    starter = collectFiles(S.get('初始代码')?.nodes || []);
    if (S.has('测试驱动')) {
      harness = {
        visible: collectFiles(S.get('测试驱动').nodes, (n) => !n.attrs.hidden),
        hidden: collectFiles(S.get('测试驱动').nodes, (n) => Boolean(n.attrs.hidden)),
      };
    }
  } catch (e) {
    err(e.message);
  }
  if (S.has('参考代码') && !Object.keys(reference).length) err('参考代码中没有任何 ```c file=... 代码块');
  if (S.has('初始代码') && !Object.keys(starter).length) err('初始代码中没有任何 ```c file=... 代码块');
  const refNames = Object.keys(reference).sort().join(',');
  if (Object.keys(starter).length && Object.keys(starter).sort().join(',') !== refNames) err(`初始代码的文件（${Object.keys(starter).join(',')}）应与参考代码的文件（${refNames}）一致`);
  if (judge.mode === 'stdio' && refNames !== 'main.c') err('stdio 模式的参考代码应当只有 main.c');
  if (judge.mode === 'function' && !Object.keys(harness.hidden).some((n) => n.endsWith('.c'))) err('function 模式需要一个带 hidden 标记的测试驱动 .c 文件');
  const harnessFiles = { ...harness.visible, ...harness.hidden };
  for (const n of Object.keys(reference)) if (n in harnessFiles) err(`参考代码文件 ${n} 与测试驱动文件重名`);

  // 常见错误：≥ 3，标题末尾带 [判题结果]，至少 1 个附带可验证的错误代码
  const mistakes = [];
  for (const sub of S.get('常见错误')?.subsections || []) {
    const mm = sub.title.match(/^(.*?)\s*\[([A-Z|]+)\]$/);
    if (!mm) {
      err(`常见错误 "${sub.title}" 的标题末尾需要标注判题结果，如 [WA]`);
      continue;
    }
    const verdicts = mm[2].split('|');
    for (const v of verdicts) if (!VERDICTS.has(v)) err(`常见错误 "${sub.title}"：未知的判题结果 ${v}`);
    let files = {};
    try {
      files = collectFiles(sub.nodes);
    } catch (e) {
      err(e.message);
    }
    mistakes.push({
      title: mm[1],
      verdicts,
      markdown: nodesToMarkdown(sub.nodes.filter((n) => n.type !== 'heading' && !(n.type === 'code' && n.attrs.file))),
      files: Object.keys(files).length ? { ...reference, ...files } : null,
      code: Object.keys(files).length ? files : null,
    });
  }
  if (S.has('常见错误')) {
    if (mistakes.length < 3) err(`常见错误至少 3 种（当前 ${mistakes.length} 种）`);
    if (!mistakes.some((x) => x.files)) err('常见错误中至少要有 1 种附带完整的错误代码（用于验证测试用例能发现它）');
  }

  // 测试用例
  const tests = [];
  for (const sub of S.get('测试用例')?.subsections || []) {
    const gen = sub.nodes.find((n) => n.type === 'code' && n.lang === 'js' && n.attrs.gen);
    if (gen) {
      const tm = sub.title.match(/^生成\s+(\w+)\s+(.+)$/);
      const defaultKind = tm ? tm[1] : 'stress';
      try {
        // 题目内容由本项目编写，是可信代码；rng 为确定性随机数
        const list = new Function('rng', gen.body)(makeRng());
        if (!Array.isArray(list) || !list.length) throw new Error('生成器必须返回非空数组');
        for (const t of list) {
          tests.push({
            name: `gen${tests.length + 1}`, kind: t.kind || defaultKind, category: t.category || (tm ? tm[2] : '生成'),
            input: t.input ?? '', output: t.output ?? '', files: t.files || {}, expectFiles: t.expectFiles || [], generated: true,
          });
        }
      } catch (e) {
        err(`测试用例生成器 "${sub.title}" 出错：${e.message}`);
      }
      continue;
    }
    const tm = sub.title.match(/^(\d{2})\s+(\w+)\s+(.+)$/);
    if (!tm) {
      err(`测试用例标题格式应为 "NN 类型 说明"：${sub.title}`);
      continue;
    }
    if (!KINDS.has(tm[2])) err(`测试用例 ${tm[1]} 的类型 ${tm[2]} 不合法`);
    const io = ioOf(sub.nodes);
    if (io.input === undefined && !Object.keys(io.files).length) err(`测试用例 ${tm[1]} 缺少 in 块`);
    if (io.output === undefined && !io.expectFiles.length) err(`测试用例 ${tm[1]} 缺少 out 块`);
    tests.push({ name: tm[1], kind: tm[2], category: tm[3], input: io.input ?? '', output: io.output ?? '', files: io.files, expectFiles: io.expectFiles });
  }
  for (const t of tests) t.hidden = t.kind !== 'sample';
  const vis = tests.filter((t) => !t.hidden);
  const hid = tests.filter((t) => t.hidden);
  if (S.has('测试用例')) {
    if (vis.length < 2) err('可见用例（sample）至少 2 组');
    if (vis.length !== samples.length) err(`可见用例数（${vis.length}）应与示例数（${samples.length}）一致`);
    vis.forEach((t, k) => {
      const s = samples[k];
      if (s && (s.input !== t.input || s.output !== t.output)) err(`可见用例 ${t.name} 与示例 ${k + 1} 的输入/输出不一致`);
    });
    if (hid.length < 5) err(`隐藏用例至少 5 组（当前 ${hid.length} 组）`);
    for (const k of ['boundary', 'degenerate', 'trap']) if (!hid.some((t) => t.kind === k)) err(`隐藏用例缺少 ${k} 类型（需求：正常边界 / 退化情况 / C 语言特有陷阱都要覆盖）`);
  }

  const problem = {
    id: m.id,
    title: m.title,
    difficulty: m.difficulty,
    knowledgePoints: m.knowledgePoints || [],
    special: m.special || null,
    judge,
    statement: { description: md('题目描述'), input: md('输入格式'), output: md('输出格式'), constraints: md('数据范围') },
    samples,
    hints,
    reference,
    starter,
    harness,
    complexity: md('复杂度'),
    mistakes,
  };
  return { problem, tests, errors };
}
