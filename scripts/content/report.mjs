// 生成内容覆盖报告：docs/COVERAGE.md（需求的最终交付物之一）和 content/build/report.json。
// 报告完全由实际内容统计得出，未完成的部分如实标出。
import fs from 'node:fs';
import path from 'node:path';
import { SPECIAL_TYPES, STAGE1_SUBSTITUTES } from './lesson.mjs';
import { DIFFICULTIES } from './problem.mjs';

const SPECIAL_NAMES = {
  'pointer-reasoning': '指针关系推理',
  'memory-layout': '内存布局',
  'ub-analysis': 'UB 辨析',
  'ds-implementation': '手写数据结构',
  'link-diagnosis': '编译/链接诊断',
};

export function writeReports({ root, curriculum, lessons, problems, quizzes, testsById, report, verified, only }) {
  const lessonIds = new Set(lessons.map((l) => l.id));
  const failed = (id) => report.errors[id]?.length || (report.verify[id] && !report.verify[id].ok);
  const rows = [];
  const kpRows = [];
  let tot = { kp: 0, lesson: 0, prog: 0, quiz: 0, kpComplete: 0 };
  const shortfalls = [];

  for (const st of curriculum.stages) {
    const kps = curriculum.knowledgePoints.filter((k) => k.stage === st.id);
    const kpSet = new Set(kps.map((k) => k.id));
    // 题目按"第一个关联知识点"归属阶段
    const progs = problems.filter((p) => kpSet.has(p.knowledgePoints[0]));
    const qs = quizzes.filter((q) => kpSet.has(q.knowledgePoint));
    const special = Object.fromEntries(SPECIAL_TYPES.map((t) => [t, 0]));
    const substituted = Object.fromEntries(SPECIAL_TYPES.map((t) => [t, 0]));
    for (const x of [...progs, ...qs]) {
      if (!x.special) continue;
      const base = STAGE1_SUBSTITUTES[x.special];
      if (base) {
        special[base]++;
        substituted[base]++;
      } else special[x.special]++;
    }
    const diff = Object.fromEntries(DIFFICULTIES.map((d) => [d, 0]));
    for (const p of progs) diff[p.difficulty]++;
    let complete = 0;
    for (const k of kps) {
      const hasLesson = lessonIds.has(k.id);
      const nProg = problems.filter((p) => p.knowledgePoints.includes(k.id)).length;
      const nQuiz = quizzes.filter((q) => q.knowledgePoint === k.id).length;
      const ok = hasLesson && nProg >= 1 && nQuiz >= 1 && !failed(k.id);
      if (ok) complete++;
      kpRows.push({ stage: st.order, id: k.id, title: k.title, hasLesson, nProg, nQuiz, ok });
    }
    const total = progs.length + qs.length;
    const ratio = total ? progs.length / total : 0;
    rows.push({ st, kps: kps.length, lessons: kps.filter((k) => lessonIds.has(k.id)).length, complete, progs: progs.length, quizzes: qs.length, ratio, special, substituted, diff });
    tot.kp += kps.length;
    tot.lesson += kps.filter((k) => lessonIds.has(k.id)).length;
    tot.prog += progs.length;
    tot.quiz += qs.length;
    tot.kpComplete += complete;
    if (complete < kps.length) shortfalls.push(`阶段 ${st.order}：${kps.length - complete} 个知识点内容未完成`);
    if (total && ratio < 0.6) shortfalls.push(`阶段 ${st.order}：编程题占比 ${(ratio * 100).toFixed(0)}% < 60%`);
    for (const t of SPECIAL_TYPES) if (special[t] < 2) shortfalls.push(`阶段 ${st.order}：「${SPECIAL_NAMES[t]}」题 ${special[t]} 道 < 2 道`);
  }

  const pct = (x) => `${(x * 100).toFixed(0)}%`;
  const totalQ = tot.prog + tot.quiz;
  const testsCount = Object.values(testsById).reduce((a, t) => a + t.length, 0);
  const lines = [];
  lines.push('# 内容覆盖报告');
  lines.push('');
  lines.push(`> 由 \`npm run content:verify\` 根据实际内容自动生成，请勿手工编辑。生成时间：${new Date().toISOString().slice(0, 16).replace('T', ' ')}`);
  lines.push(`> 运行校验：${verified ? '已执行（每段示例代码、每道题的参考代码与常见错误代码都在判题器中真实运行过）' : '**未执行**（本报告只反映结构校验）'}${only ? `；本次只校验了 ${only}*` : ''}`);
  lines.push('');
  lines.push('## 总览');
  lines.push('');
  lines.push(`| 指标 | 数值 |`);
  lines.push(`|---|---|`);
  lines.push(`| 知识点 | ${tot.kp} |`);
  lines.push(`| 已写讲解的知识点 | ${tot.lesson} / ${tot.kp} |`);
  lines.push(`| 内容完整的知识点（讲解 + ≥1 编程题 + ≥1 客观题，且校验通过） | ${tot.kpComplete} / ${tot.kp} |`);
  lines.push(`| 编程题 | ${tot.prog} |`);
  lines.push(`| 客观题 | ${tot.quiz} |`);
  lines.push(`| 编程题占比 | ${totalQ ? pct(tot.prog / totalQ) : '-'}（要求 ≥ 60%） |`);
  lines.push(`| 测试用例总数 | ${testsCount} |`);
  lines.push('');
  lines.push('## 各阶段');
  lines.push('');
  lines.push('| 阶段 | 知识点 | 已写讲解 | 内容完整 | 编程题 | 客观题 | 编程题占比 | ' + SPECIAL_TYPES.map((t) => SPECIAL_NAMES[t]).join(' | ') + ' |');
  lines.push('|---|---|---|---|---|---|---|' + SPECIAL_TYPES.map(() => '---').join('|') + '|');
  for (const r of rows) {
    const total = r.progs + r.quizzes;
    const cell = (t) => `${r.special[t]}${r.substituted[t] ? `（含替代 ${r.substituted[t]}）` : ''}${r.special[t] < 2 ? ' ⚠' : ''}`;
    lines.push(`| ${r.st.order}. ${r.st.title} | ${r.kps} | ${r.lessons} | ${r.complete} | ${r.progs} | ${r.quizzes} | ${total ? pct(r.ratio) : '-'} | ` + SPECIAL_TYPES.map(cell).join(' | ') + ' |');
  }
  lines.push('');
  lines.push('> **替代题型说明**：阶段 1 尚未学习指针、数组和结构体，经用户确认，该阶段的三类特色题使用等价替代题型：');
  lines.push('> 指针关系推理 → 表达式求值推理；内存布局 → 类型大小与取值范围推理；手写数据结构 → 按接口实现函数（隐藏 main 调用测试）。');
  lines.push('');
  lines.push('## 编程题难度分布');
  lines.push('');
  lines.push('| 阶段 | ' + DIFFICULTIES.join(' | ') + ' |');
  lines.push('|---|' + DIFFICULTIES.map(() => '---').join('|') + '|');
  for (const r of rows) lines.push(`| ${r.st.order} | ` + DIFFICULTIES.map((d) => r.diff[d]).join(' | ') + ' |');
  lines.push('');
  lines.push('## 未达标项');
  lines.push('');
  if (shortfalls.length) for (const s of shortfalls) lines.push(`- ${s}`);
  else lines.push('无。');
  lines.push('');
  lines.push('## 逐个知识点');
  lines.push('');
  lines.push('| 阶段 | 知识点 | 讲解 | 编程题 | 客观题 | 状态 |');
  lines.push('|---|---|---|---|---|---|');
  for (const k of kpRows) {
    const state = k.ok ? '✅' : failed(k.id) ? '❌ 校验失败' : '⬜ 未完成';
    lines.push(`| ${k.stage} | ${k.id} ${k.title} | ${k.hasLesson ? '✓' : '—'} | ${k.nProg} | ${k.nQuiz} | ${state} |`);
  }
  lines.push('');
  fs.writeFileSync(path.join(root, 'docs', 'COVERAGE.md'), lines.join('\n'));
  fs.writeFileSync(path.join(root, 'content', 'build', 'report.json'), JSON.stringify({ totals: tot, stages: rows.map((r) => ({ ...r, st: r.st.id })), shortfalls, report }, null, 1));

  return [
    `知识点 ${tot.kp}，讲解 ${tot.lesson}，内容完整 ${tot.kpComplete}；编程题 ${tot.prog}，客观题 ${tot.quiz}，编程题占比 ${totalQ ? pct(tot.prog / totalQ) : '-'}，测试用例 ${testsCount}`,
    `未达标项 ${shortfalls.length} 条（详见 docs/COVERAGE.md）`,
  ].join('\n');
}
