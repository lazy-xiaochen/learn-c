// 由学习记录推导出的进度：知识点状态、经验值、连续天数、徽章、推荐。
//
// 规则（需求 4.1 / 4.2）：
// - 知识点状态：未开始 / 学习中 / 已掌握。已掌握 = 关联编程题至少 1 道 AC，且该知识点的客观题全部答对。
//   打开过讲解、运行过代码、做过题或答过客观题即为"学习中"。
// - 经验值：知识点首次达到"已掌握" +10；编程题首次 AC 按难度 L1 20 / L2 40 / L3 70 / L4 120 / L5 200。
//   "首次 AC 额外 +50%"理解为：第一次提交就 AC（一次通过）时额外 +50%。
//   同一道题只在第一次 AC 时计经验，重复提交不再加分。
// - 连续天数：从今天（或昨天，今天还没学习时）往前数，每天都有学习记录的天数。
import { localDay } from './store.js';

export const XP_BY_LEVEL = { L1: 20, L2: 40, L3: 70, L4: 120, L5: 200 };
export const XP_KP_MASTERED = 10;
export const LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5'];

export function kpStatus(content, store, kpId) {
  const rec = store.state.kp[kpId];
  const pids = content.problemsOfKp.get(kpId) || [];
  const qids = content.quizzesOfKp.get(kpId) || [];
  const solved = pids.filter((p) => store.state.problems[p]?.acAt);
  const quizDone = qids.filter((q) => rec?.quizzes?.[q]?.correct);
  const mastered = pids.length > 0 && solved.length >= 1 && quizDone.length === qids.length;
  const touched = Boolean(rec?.visitedAt || rec?.runs || Object.keys(rec?.quizzes || {}).length || pids.some((p) => store.state.problems[p]?.attempts));
  return {
    status: mastered ? 'mastered' : touched ? 'learning' : 'new',
    solved: solved.length,
    problems: pids.length,
    quizzesCorrect: quizDone.length,
    quizzes: qids.length,
  };
}

/** 知识点刚达到"已掌握"时记录时间并加经验；返回是否新掌握 */
export function updateMastery(content, store, kpId, now = new Date()) {
  const st = kpStatus(content, store, kpId);
  const rec = store.kp(kpId);
  if (st.status === 'mastered' && !rec.masteredAt) {
    rec.masteredAt = now.toISOString();
    store.addXp(XP_KP_MASTERED, 'kp-mastered', kpId, now);
    updateBadges(content, store, now);
    return true;
  }
  return false;
}

export function updateBadges(content, store, now = new Date()) {
  const got = [];
  for (const s of content.curriculum.stages) {
    const kps = content.curriculum.knowledgePoints.filter((k) => k.stage === s.id);
    const id = `stage-${s.id}`;
    if (!store.state.badges[id] && kps.length && kps.every((k) => store.state.kp[k.id]?.masteredAt)) {
      store.state.badges[id] = now.toISOString();
      got.push(id);
    }
  }
  return got;
}

export function streak(activity, now = new Date()) {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!activity[localDay(day)]) day.setDate(day.getDate() - 1); // 今天还没学习，不算断
  let n = 0;
  while (activity[localDay(day)]) {
    n++;
    day.setDate(day.getDate() - 1);
  }
  return n;
}

export function totalXp(store) {
  return store.state.xpLog.reduce((s, e) => s + e.amount, 0);
}

export function summary(content, store, now = new Date()) {
  const { curriculum } = content;
  const kpStates = {};
  for (const k of curriculum.knowledgePoints) kpStates[k.id] = kpStatus(content, store, k.id);

  const stages = curriculum.stages.map((s) => {
    const kps = curriculum.knowledgePoints.filter((k) => k.stage === s.id);
    const mastered = kps.filter((k) => kpStates[k.id].status === 'mastered').length;
    const available = kps.filter((k) => content.lessonById.has(k.id)).length;
    return { id: s.id, title: s.title, order: s.order, total: kps.length, available, mastered, ratio: kps.length ? mastered / kps.length : 0 };
  });

  const acByLevel = Object.fromEntries(LEVELS.map((l) => [l, 0]));
  const totalByLevel = Object.fromEntries(LEVELS.map((l) => [l, 0]));
  for (const p of content.problemById.values()) {
    totalByLevel[p.difficulty]++;
    if (store.state.problems[p.id]?.acAt) acByLevel[p.difficulty]++;
  }

  // 当前阶段：第一个还没全部掌握、且已有内容的阶段
  const current = stages.find((s) => s.available > 0 && s.mastered < s.total) || stages[stages.length - 1];

  return {
    xp: totalXp(store),
    streak: streak(store.state.activity, now),
    acTotal: Object.values(acByLevel).reduce((a, b) => a + b, 0),
    acByLevel,
    totalByLevel,
    stages,
    currentStage: current ? current.id : null,
    kp: kpStates,
    problems: Object.fromEntries(
      Object.entries(store.state.problems).map(([id, r]) => [id, { attempts: r.attempts, solved: Boolean(r.acAt), oneShot: r.oneShot, lastVerdict: r.lastVerdict, passRate: passRate(store, id) }]),
    ),
    badges: store.state.badges,
    activity: store.state.activity,
    recommendations: recommend(content, store, kpStates),
  };
}

export function passRate(store, problemId) {
  const subs = store.state.submissions.filter((s) => s.problemId === problemId);
  const r = store.state.problems[problemId];
  const attempts = r ? r.attempts : 0;
  if (!attempts) return null;
  // 提交记录有条数上限；通过率用题目计数器（不受上限影响）
  const ac = r.acCount ?? subs.filter((s) => s.verdict === 'AC').length;
  return { ac, attempts, ratio: ac / attempts };
}

/**
 * 下一步推荐：在"未掌握且已有内容"的知识点中，按难度从低到高、再按课程顺序，取前几个；
 * 每个知识点给出具体的下一步动作（读讲解 / 做客观题 / 做某道题）。
 */
export function recommend(content, store, kpStates, limit = 5) {
  const order = new Map(content.curriculum.knowledgePoints.map((k, i) => [k.id, i]));
  const lv = (d) => LEVELS.indexOf(d);
  const cands = content.curriculum.knowledgePoints
    .filter((k) => content.lessonById.has(k.id) && kpStates[k.id].status !== 'mastered')
    .sort((a, b) => lv(a.difficulty) - lv(b.difficulty) || order.get(a.id) - order.get(b.id))
    .slice(0, limit);
  return cands.map((k) => {
    const st = kpStates[k.id];
    const rec = store.state.kp[k.id];
    const pids = content.problemsOfKp.get(k.id) || [];
    let action;
    if (!rec?.visitedAt) action = { type: 'lesson', label: '阅读讲解', target: k.id };
    else if (st.solved === 0) {
      const next = pids
        .map((id) => content.problemById.get(id))
        .sort((a, b) => lv(a.difficulty) - lv(b.difficulty))[0];
      action = next ? { type: 'problem', label: `做题：${next.title}`, target: next.id, difficulty: next.difficulty } : { type: 'lesson', label: '继续学习', target: k.id };
    } else action = { type: 'quiz', label: '完成客观题', target: k.id };
    return { kpId: k.id, title: k.title, difficulty: k.difficulty, stage: k.stage, status: st.status, action };
  });
}
