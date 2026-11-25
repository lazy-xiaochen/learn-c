// 学习记录持久化：一个 JSON 文件（默认在 Electron 的 userData 目录）。
// 写入采用"先写临时文件再改名"，避免写到一半断电/崩溃导致文件损坏。
import fs from 'node:fs';
import path from 'node:path';

const VERSION = 1;
const MAX_SUBMISSIONS = 1000; // 全部题目合计保留的提交记录条数（含代码）

function emptyState() {
  return {
    version: VERSION,
    createdAt: new Date().toISOString(),
    kp: {},          // [kpId]: { visitedAt, runs, quizzes: { [qid]: { correct, attempts, at } }, masteredAt }
    problems: {},    // [pid]: { attempts, acAt, oneShot, xp, hintsShown, referenceShown, draft, lastVerdict }
    submissions: [], // { id, problemId, at, verdict, passed, total, timeMs, files }
    xpLog: [],       // { at, amount, reason, ref }
    activity: {},    // [YYYY-MM-DD]: 当天的学习动作次数
    badges: {},      // [badgeId]: 获得时间
  };
}

export function localDay(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function openStore(file) {
  let state = emptyState();
  if (fs.existsSync(file)) {
    try {
      const loaded = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (loaded && loaded.version === VERSION) state = { ...emptyState(), ...loaded };
    } catch {
      // 文件损坏：保留一份副本，避免覆盖后彻底丢失
      const bak = `${file}.broken-${Date.now()}`;
      try {
        fs.copyFileSync(file, bak);
      } catch {
        /* 忽略 */
      }
    }
  }

  let timer = null;
  function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state));
    fs.renameSync(tmp, file);
  }
  /** 合并短时间内的多次修改（例如草稿自动保存） */
  function save({ now = false } = {}) {
    if (now) return flush();
    if (!timer) timer = setTimeout(flush, 400);
  }

  return {
    file,
    get state() {
      return state;
    },
    save,
    flush,
    kp(id) {
      if (!state.kp[id]) state.kp[id] = { visitedAt: null, runs: 0, quizzes: {}, masteredAt: null };
      return state.kp[id];
    },
    problem(id) {
      if (!state.problems[id]) {
        state.problems[id] = { attempts: 0, acAt: null, oneShot: false, xp: 0, hintsShown: 0, referenceShown: false, draft: null, lastVerdict: null };
      }
      return state.problems[id];
    },
    touch(now = new Date()) {
      const d = localDay(now);
      state.activity[d] = (state.activity[d] || 0) + 1;
    },
    addXp(amount, reason, ref, now = new Date()) {
      if (amount > 0) state.xpLog.push({ at: now.toISOString(), amount, reason, ref });
    },
    addSubmission(rec) {
      state.submissions.push(rec);
      if (state.submissions.length > MAX_SUBMISSIONS) state.submissions.splice(0, state.submissions.length - MAX_SUBMISSIONS);
    },
    reset() {
      state = emptyState();
      flush();
    },
  };
}
