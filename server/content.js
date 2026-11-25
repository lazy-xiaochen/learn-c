// 读取 content/build 下的构建产物，向界面提供"可公开"的视图。
//
// 不发给界面的数据：隐藏测试用例、隐藏测试驱动、参考代码（AC 后或学习者明确要求时才单独发送）、
// 客观题答案与解析（作答后由后端判分并返回）。
import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT } from './judge/paths.js';

export function getContentDir() {
  if (process.env.CLEARN_CONTENT_DIR) return process.env.CLEARN_CONTENT_DIR;
  if (process.resourcesPath) {
    const p = path.join(process.resourcesPath, 'content');
    if (fs.existsSync(path.join(p, 'curriculum.json'))) return p;
  }
  return path.join(PROJECT_ROOT, 'content', 'build');
}

const readJson = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

export function loadContent(dir = getContentDir()) {
  if (!fs.existsSync(path.join(dir, 'curriculum.json'))) {
    throw new Error(`找不到课程内容 ${dir}，请先运行 npm run content:build`);
  }
  const curriculum = readJson(dir, 'curriculum.json');
  const lessons = readJson(dir, 'lessons.json');
  const bank = readJson(dir, 'problems.json');

  const kpById = new Map(curriculum.knowledgePoints.map((k) => [k.id, k]));
  const lessonById = new Map(lessons.map((l) => [l.id, l]));
  const problemById = new Map(bank.programming.map((p) => [p.id, p]));
  const quizById = new Map(bank.quizzes.map((q) => [q.id, q]));
  const testsCache = new Map();

  /** 某个知识点关联的编程题（课程表里的关联 + 题目自己声明的知识点） */
  const problemsOfKp = new Map();
  for (const k of curriculum.knowledgePoints) problemsOfKp.set(k.id, []);
  for (const p of bank.programming) {
    // 题目的第一个知识点是它的"主知识点"，只挂在主知识点下，避免一题在多处重复计数
    const main = p.knowledgePoints[0];
    if (problemsOfKp.has(main)) problemsOfKp.get(main).push(p.id);
  }
  const quizzesOfKp = new Map();
  for (const q of bank.quizzes) {
    if (!quizzesOfKp.has(q.knowledgePoint)) quizzesOfKp.set(q.knowledgePoint, []);
    quizzesOfKp.get(q.knowledgePoint).push(q.id);
  }

  function problemMeta(p) {
    return {
      id: p.id,
      title: p.title,
      difficulty: p.difficulty,
      knowledgePoints: p.knowledgePoints,
      special: p.special,
      mode: p.judge.mode,
    };
  }

  function catalog() {
    return {
      stages: curriculum.stages.map((s) => ({ id: s.id, order: s.order, title: s.title, summary: s.summary, groups: s.groups })),
      knowledgePoints: curriculum.knowledgePoints.map((k) => ({
        id: k.id,
        title: k.title,
        stage: k.stage,
        group: k.group,
        difficulty: k.difficulty,
        summary: k.summary,
        prerequisites: k.prerequisites,
        hasContent: lessonById.has(k.id),
        problemIds: problemsOfKp.get(k.id) || [],
        quizIds: quizzesOfKp.get(k.id) || [],
      })),
      problems: bank.programming.map(problemMeta),
    };
  }

  function publicQuiz(q) {
    return {
      id: q.id,
      type: q.type,
      special: q.special,
      difficulty: q.difficulty,
      stem: q.stem,
      options: (q.options || []).map((o) => ({ text: o.text })),
    };
  }

  function lesson(id) {
    const kp = kpById.get(id);
    if (!kp) return null;
    const l = lessonById.get(id);
    return {
      id,
      kp: { id: kp.id, title: kp.title, stage: kp.stage, group: kp.group, difficulty: kp.difficulty, summary: kp.summary, prerequisites: kp.prerequisites },
      hasContent: Boolean(l),
      sections: l ? l.sections : [],
      runBlocks: l
        ? l.runBlocks.map((b) => ({ id: b.id, section: b.section, code: b.code, stdin: b.stdin, options: b.options, expect: b.expect, output: b.output, nocheck: b.nocheck, reason: b.reason }))
        : [],
      quizzes: (quizzesOfKp.get(id) || []).map((qid) => publicQuiz(quizById.get(qid))),
      problems: (problemsOfKp.get(id) || []).map((pid) => problemMeta(problemById.get(pid))),
    };
  }

  function problem(id) {
    const p = problemById.get(id);
    if (!p) return null;
    const tests = problemTests(id);
    return {
      ...problemMeta(p),
      judge: { mode: p.judge.mode, timeMs: p.judge.timeMs, compare: p.judge.compare, checkLeaks: Boolean(p.judge.checkLeaks) },
      statement: p.statement,
      samples: p.samples,
      hintCount: p.hints.length,
      starter: p.starter,
      // 学习者能看到的题目文件（例如函数题的头文件），只读
      visibleFiles: p.harness.visible || {},
      complexity: p.complexity,
      mistakes: p.mistakes.map((m) => ({ title: m.title, verdicts: m.verdicts, markdown: m.markdown, code: m.files ? m.files[Object.keys(m.files)[0]] : null })),
      testSummary: {
        total: tests.length,
        hidden: tests.filter((t) => t.hidden).length,
      },
    };
  }

  function problemTests(id) {
    if (!testsCache.has(id)) testsCache.set(id, readJson(path.join(dir, 'tests'), `${id}.json`));
    return testsCache.get(id);
  }

  return {
    dir,
    curriculum,
    kpById,
    lessonById,
    problemById,
    quizById,
    problemsOfKp,
    quizzesOfKp,
    catalog,
    lesson,
    problem,
    problemTests,
  };
}
