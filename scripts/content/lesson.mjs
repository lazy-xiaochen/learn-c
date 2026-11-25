// 解析并做结构校验：content/lessons/<知识点ID>.md
import { splitFrontMatter, tokenize, sectionize, nodesToMarkdown, textOf, unescapeAttr } from './md.mjs';

const REQUIRED_SECTIONS = ['讲解', '编译与运行', '常见错误', '客观题'];
const RUN_EXPECT = new Set(['OK', 'CE', 'RE', 'UB', 'TLE', 'MLE', 'WA']);
const QUIZ_TYPES = new Set(['single', 'multiple', 'fill']);
export const SPECIAL_TYPES = ['pointer-reasoning', 'memory-layout', 'ub-analysis', 'ds-implementation', 'link-diagnosis'];
/**
 * 阶段 1 的替代题型（用户 2026-11-24 确认）：阶段 1 还没学指针、数组、结构体，
 * 这三类特色题改用阶段 1 已学知识出等价题型，并在覆盖报告中标明"替代"。只允许用于阶段 1。
 */
export const STAGE1_SUBSTITUTES = {
  'expr-reasoning': 'pointer-reasoning', // 表达式求值推理（优先级、自增、短路求值）
  'type-reasoning': 'memory-layout', // 类型大小与取值范围推理（sizeof、溢出回绕）
  'interface-impl': 'ds-implementation', // 按接口实现函数（隐藏 main 调用测试）
};
export const ALL_SPECIAL = [...SPECIAL_TYPES, ...Object.keys(STAGE1_SUBSTITUTES)];

/**
 * @param {string} text 文件内容
 * @param {object} kp   curriculum 中对应的知识点
 * @returns {{ lesson: object, errors: string[] }}
 */
export function parseLesson(text, kp) {
  const errors = [];
  const err = (m) => errors.push(m);
  let fm;
  try {
    fm = splitFrontMatter(text);
  } catch (e) {
    return { lesson: null, errors: [e.message] };
  }
  if (fm.meta.id !== kp.id) err(`front matter 的 id（${fm.meta.id}）与文件对应的知识点（${kp.id}）不一致`);
  let nodes;
  try {
    nodes = tokenize(fm.body);
  } catch (e) {
    return { lesson: null, errors: [e.message] };
  }
  for (const n of nodes) n.line += fm.lineOffset;
  const sections = sectionize(nodes);
  const byTitle = new Map(sections.map((s) => [s.title, s]));
  for (const t of REQUIRED_SECTIONS) if (!byTitle.has(t)) err(`缺少 "## ${t}" 小节`);
  for (const s of sections) if (!REQUIRED_SECTIONS.includes(s.title)) err(`第 ${s.line} 行：未知的二级标题 "## ${s.title}"`);

  // ---------- 可运行代码块 ----------
  const runBlocks = [];
  const ids = new Set();
  let memoryDiagrams = 0;
  for (const s of sections) {
    if (s.title === '客观题') continue;
    const ns = s.nodes;
    for (let i = 0; i < ns.length; i++) {
      const n = ns[i];
      if (n.type !== 'code') continue;
      if (n.lang === 'memory') {
        memoryDiagrams++;
        validateMemory(n, err);
        continue;
      }
      if (n.lang !== 'c' || !n.attrs.run) continue;
      const a = n.attrs;
      const id = a.id || `run-${runBlocks.length + 1}`;
      if (ids.has(id)) err(`第 ${n.line} 行：代码块 id "${id}" 重复`);
      ids.add(id);
      const expect = a.expect || 'OK';
      if (!RUN_EXPECT.has(expect)) err(`第 ${n.line} 行：expect=${expect} 不合法`);
      // 紧随其后的 output 块（中间允许夹着空白文本）
      let out = null;
      for (let j = i + 1; j < ns.length; j++) {
        if (ns[j].type === 'text' && !ns[j].text.trim()) continue;
        if (ns[j].type === 'code' && ns[j].lang === 'output') out = ns[j];
        break;
      }
      if (a.nocheck && !a.reason) err(`第 ${n.line} 行：nocheck 必须同时写 reason="原因"`);
      if (!out && !a.nocheck && expect === 'OK') err(`第 ${n.line} 行：可运行代码块后面缺少 output 预期输出块`);
      runBlocks.push({
        id,
        section: s.title,
        line: n.line,
        code: n.body + '\n',
        stdin: a.stdin !== undefined ? unescapeAttr(a.stdin) : '',
        options: {
          opt: a.opt || '-O0',
          sanitize: a.sanitize !== 'off',
          extraFlags: a.flags ? String(a.flags).split(',') : [],
        },
        expect,
        // 故意演示编译警告的代码块写 warnings=allow，否则示例代码必须零警告
        allowWarnings: a.warnings === 'allow',
        nocheck: Boolean(a.nocheck),
        reason: a.reason || null,
        output: out ? { text: out.body, match: out.attrs.match || 'exact' } : null,
      });
    }
  }
  const explainRuns = runBlocks.filter((b) => b.section === '讲解' && b.expect === 'OK');
  if (!explainRuns.length) err('"讲解" 中至少需要一个能正常运行（expect=OK）的可运行代码块');
  if (kp.memoryDiagram && memoryDiagrams === 0) err('该知识点要求内存图，但没有任何 ```memory 块');

  // ---------- 编译与运行 ----------
  const build = byTitle.get('编译与运行');
  if (build && !/\b(gcc|clang)\b/.test(nodesToMarkdown(build.nodes))) err('"编译与运行" 中没有给出 gcc/clang 编译命令');

  // ---------- 常见错误 ----------
  const pit = byTitle.get('常见错误');
  if (pit && !pit.subsections.length) err('"常见错误" 至少需要一个 ### 小节');

  // ---------- 客观题 ----------
  const quizzes = [];
  const qs = byTitle.get('客观题');
  if (qs) {
    if (!qs.subsections.length) err('"客观题" 至少需要一道题');
    for (const sub of qs.subsections) quizzes.push(parseQuiz(sub, kp, err));
  }

  const bodySections = sections
    .filter((s) => s.title !== '客观题')
    .map((s) => ({ title: s.title, markdown: nodesToMarkdown(s.nodes) }));
  return {
    lesson: { id: kp.id, sections: bodySections, runBlocks, memoryDiagrams, quizIds: quizzes.map((q) => q.id) },
    quizzes,
    errors,
  };
}

function validateMemory(n, err) {
  const rows = n.body.split('\n').filter((l) => l.trim());
  if (rows.length < 2) return err(`第 ${n.line} 行：内存图至少要有表头和一行数据`);
  const cols = rows[0].split('|').length;
  if (cols < 3) err(`第 ${n.line} 行：内存图表头至少要有 地址 | 内容 | 变量 三列`);
  rows.forEach((r, k) => {
    if (r.split('|').length !== cols) err(`第 ${n.line + k + 1} 行：内存图这一行的列数与表头不一致`);
  });
}

function parseQuiz(sub, kp, err) {
  const head = sub.title.split(/\s+/);
  const [id, type, special] = head;
  const where = `客观题 "${sub.title}"（第 ${sub.line} 行）`;
  if (!/^q-s[1-7]-[a-z0-9-]+-\d+$/.test(id || '')) err(`${where}：ID 格式应为 q-<知识点ID>-<序号>`);
  else if (!id.startsWith(`q-${kp.id}-`)) err(`${where}：ID 应以 q-${kp.id}- 开头`);
  if (!QUIZ_TYPES.has(type)) err(`${where}：题型必须是 single / multiple / fill`);
  if (special && !ALL_SPECIAL.includes(special)) err(`${where}：未知的特殊题型 ${special}`);
  if (special && STAGE1_SUBSTITUTES[special] && kp.stage !== 's1') err(`${where}：替代题型 ${special} 只能用于阶段 1`);

  // 题干 = 第一个选项/answer 行之前的内容；选项 = "- [ ] / - [x]" 行，解析 = 紧随的 "  >" 行
  const md = nodesToMarkdown(sub.nodes.filter((n) => n.type !== 'heading'));
  const lines = md.split('\n');
  const stem = [];
  const options = [];
  let answer = null;
  const explain = [];
  let mode = 'stem';
  for (const l of lines) {
    const opt = l.match(/^- \[( |x)\] (.*)$/);
    const ans = l.match(/^answer:\s*(.+)$/);
    const ex = l.match(/^\s*> ?(.*)$/);
    if (opt) {
      options.push({ text: opt[2], correct: opt[1] === 'x', explanation: '' });
      mode = 'opt';
    } else if (ans) {
      answer = ans[1].split(' | ').map((s) => s.trim()).filter(Boolean);
      mode = 'ans';
    } else if (ex && mode === 'opt' && options.length) {
      const o = options[options.length - 1];
      o.explanation = (o.explanation ? o.explanation + '\n' : '') + ex[1];
    } else if (ex && mode === 'ans') {
      explain.push(ex[1]);
    } else if (mode === 'stem') {
      stem.push(l);
    } else if (l.trim()) {
      err(`${where}：无法识别的行 "${l.slice(0, 40)}"（选项后的解析需要以 ">" 开头）`);
    }
  }
  const q = { id, type, special: special || null, knowledgePoint: kp.id, difficulty: kp.difficulty, stem: stem.join('\n').trim(), options: [], answer: null, explanation: explain.join('\n') };
  if (!q.stem) err(`${where}：缺少题干`);
  if (type === 'fill') {
    if (!answer || !answer.length) err(`${where}：填空题缺少 answer:`);
    if (!q.explanation) err(`${where}：填空题缺少解析（answer 之后以 > 开头的行）`);
    q.answer = answer;
  } else {
    if (options.length < 2) err(`${where}：选择题至少需要 2 个选项`);
    options.forEach((o, k) => {
      if (!o.explanation.trim()) err(`${where}：第 ${k + 1} 个选项缺少解析（需求要求每个选项都有解析）`);
    });
    const nCorrect = options.filter((o) => o.correct).length;
    if (type === 'single' && nCorrect !== 1) err(`${where}：单选题必须恰好有 1 个正确选项（当前 ${nCorrect} 个）`);
    if (type === 'multiple' && nCorrect < 1) err(`${where}：多选题至少要有 1 个正确选项`);
    q.options = options;
    q.answer = options.map((o, k) => (o.correct ? k : -1)).filter((k) => k >= 0);
  }
  return q;
}

/** 判分（服务端用）：answer 为选项下标数组或填空字符串 */
export { gradeQuiz } from '../../server/quiz.js';

export { textOf };
