// 后端服务：课程内容、学习记录、判题。
//
// 运行方式：由 Electron 主进程用 utilityProcess 启动为独立进程（与界面进程隔离），
// 通过消息通信，不监听任何网络端口。学习者的 C 程序再由判题器放进 runner.exe 沙箱运行。
//
// 消息格式：请求 { id, method, params }，响应 { id, ok, result } 或 { id, ok: false, error }。
import path from 'node:path';
import crypto from 'node:crypto';
import { loadContent } from './content.js';
import { openStore } from './store.js';
import { summary, updateMastery, kpStatus, passRate, XP_BY_LEVEL } from './progress.js';
import { judgeSubmission, runCode, cleanupStaleWorkDirs, LIMITS } from './judge/judge.js';
import { gradeQuiz } from './quiz.js';

const MAX_PARALLEL_JOBS = 2; // 同时进行的编译/判题任务数

export function createService({ dataDir, contentDir } = {}) {
  const content = loadContent(contentDir);
  const store = openStore(path.join(dataDir, 'progress.json'));
  cleanupStaleWorkDirs();

  // 判题任务排队，避免学习者连续点击时同时启动很多编译器
  let running = 0;
  const queue = [];
  function enqueue(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      pump();
    });
  }
  function pump() {
    while (running < MAX_PARALLEL_JOBS && queue.length) {
      const { fn, resolve, reject } = queue.shift();
      running++;
      fn()
        .then(resolve, reject)
        .finally(() => {
          running--;
          pump();
        });
    }
  }
  // 同一道题同一时间只允许一个提交（界面也会禁用按钮，这里是后端兜底）
  const submitting = new Set();

  function need(cond, msg) {
    if (!cond) throw new Error(msg);
  }
  function checkFiles(files) {
    need(files && typeof files === 'object' && !Array.isArray(files), '缺少代码文件');
    for (const [n, v] of Object.entries(files)) need(typeof n === 'string' && typeof v === 'string', '代码文件格式不正确');
    return files;
  }

  /** 发给界面之前去掉判题结果里的大字段 */
  function slimResult(r) {
    const out = { ...r };
    if (out.heap && out.heap.sites) out.heap = { peak: out.heap.peak, current: out.heap.current, leaks: out.heap.leaks };
    return out;
  }

  const methods = {
    catalog() {
      return content.catalog();
    },

    progress() {
      return summary(content, store);
    },

    lesson({ id }) {
      const l = content.lesson(id);
      need(l, `没有这个知识点：${id}`);
      if (l.hasContent) {
        const rec = store.kp(id);
        if (!rec.visitedAt) {
          rec.visitedAt = new Date().toISOString();
          store.touch();
          store.save();
        }
      }
      const rec = store.state.kp[id];
      return {
        ...l,
        status: kpStatus(content, store, id),
        quizState: Object.fromEntries(
          l.quizzes.map((q) => {
            const r = rec?.quizzes?.[q.id];
            return [q.id, r ? { correct: r.correct, attempts: r.attempts, given: r.given, review: r.correct ? quizReview(q.id, r.given, true) : null } : null];
          }),
        ),
      };
    },

    /** 知识点页面"运行"按钮：代码来自学习者（可能已修改），编译选项来自内容中的代码块定义 */
    async runBlock({ lessonId, blockId, code, stdin }) {
      const l = content.lessonById.get(lessonId);
      need(l, '没有这个知识点');
      const b = l.runBlocks.find((x) => x.id === blockId);
      need(b, '没有这个代码块');
      need(typeof code === 'string', '缺少代码');
      const r = await enqueue(() => runCode({ files: { 'main.c': code }, stdin: typeof stdin === 'string' ? stdin : b.stdin, options: b.options }));
      const rec = store.kp(lessonId);
      rec.runs++;
      store.touch();
      store.save();
      return slimResult(r);
    },

    /**
     * 编译台：运行学习者随手写的一段 C 代码。
     * 只返回编译/运行结果，不判对错、不计经验值、不写学习记录。
     */
    async runSnippet({ code, stdin }) {
      need(typeof code === 'string' && code.trim().length > 0, '请先写一点代码');
      need(Buffer.byteLength(code, 'utf8') <= LIMITS.maxSourceBytes, `代码不能超过 ${LIMITS.maxSourceBytes / 1024}KB`);
      const r = await enqueue(() =>
        runCode({
          files: { 'main.c': code },
          stdin: typeof stdin === 'string' ? stdin.slice(0, LIMITS.maxStdinBytes) : '',
        }),
      );
      return slimResult(r);
    },

    answerQuiz({ quizId, given }) {
      const q = content.quizById.get(quizId);
      need(q, '没有这道客观题');
      const correct = gradeQuiz(q, given);
      const rec = store.kp(q.knowledgePoint);
      const prev = rec.quizzes[quizId];
      rec.quizzes[quizId] = {
        correct: Boolean(prev?.correct) || correct, // 答对过一次就算完成
        attempts: (prev?.attempts || 0) + 1,
        given,
        at: new Date().toISOString(),
      };
      store.touch();
      const newlyMastered = updateMastery(content, store, q.knowledgePoint);
      store.save();
      return { correct, review: quizReview(quizId, given, correct), newlyMastered, status: kpStatus(content, store, q.knowledgePoint) };
    },

    problem({ id }) {
      const p = content.problem(id);
      need(p, `没有这道题：${id}`);
      const r = store.state.problems[id];
      return {
        ...p,
        record: {
          attempts: r?.attempts || 0,
          solved: Boolean(r?.acAt),
          oneShot: Boolean(r?.oneShot),
          hintsShown: r?.hintsShown || 0,
          referenceShown: Boolean(r?.referenceShown),
          draft: r?.draft || null,
          passRate: passRate(store, id),
        },
        hints: content.problemById.get(id).hints.slice(0, r?.hintsShown || 0),
        reference: r?.acAt || r?.referenceShown ? content.problemById.get(id).reference : null,
        xpValue: XP_BY_LEVEL[p.difficulty],
      };
    },

    saveDraft({ problemId, files }) {
      need(content.problemById.has(problemId), '没有这道题');
      store.problem(problemId).draft = files ? checkFiles(files) : null;
      store.save();
      return true;
    },

    showHint({ problemId }) {
      const p = content.problemById.get(problemId);
      need(p, '没有这道题');
      const r = store.problem(problemId);
      r.hintsShown = Math.min(p.hints.length, (r.hintsShown || 0) + 1);
      store.save();
      return { hints: p.hints.slice(0, r.hintsShown), hintsShown: r.hintsShown, total: p.hints.length };
    },

    showReference({ problemId }) {
      const p = content.problemById.get(problemId);
      need(p, '没有这道题');
      const r = store.problem(problemId);
      r.referenceShown = true;
      store.save();
      return { reference: p.reference };
    },

    /** 做题页面"运行"：用学习者自己填的输入运行一次，不判对错 */
    async runProblem({ problemId, files, stdin, sampleIndex }) {
      const p = content.problemById.get(problemId);
      need(p, '没有这道题');
      checkFiles(files);
      const sample = p.samples[Number.isInteger(sampleIndex) ? sampleIndex : 0] || p.samples[0];
      const r = await enqueue(() =>
        runCode({
          files,
          stdin: typeof stdin === 'string' ? stdin : sample.input,
          timeMs: p.judge.timeMs,
          dataFiles: sample?.files || {},
          harnessFiles: { ...p.harness.visible, ...p.harness.hidden },
        }),
      );
      store.touch();
      store.save();
      return slimResult(r);
    },

    async submit({ problemId, files }) {
      const p = content.problemById.get(problemId);
      need(p, '没有这道题');
      checkFiles(files);
      need(!submitting.has(problemId), '这道题的上一次提交还在判题中');
      submitting.add(problemId);
      try {
        const J = p.judge;
        const result = await enqueue(() =>
          judgeSubmission({
            files,
            tests: content.problemTests(problemId),
            timeMs: J.timeMs,
            compare: J.compare,
            eps: J.eps,
            checkLeaks: J.checkLeaks,
            harnessFiles: { ...p.harness.visible, ...p.harness.hidden },
          }),
        );
        const now = new Date();
        const r = store.problem(problemId);
        r.attempts++;
        r.lastVerdict = result.verdict;
        let xpGained = 0;
        let firstAc = false;
        if (result.verdict === 'AC') {
          r.acCount = (r.acCount || 0) + 1;
          if (!r.acAt) {
            firstAc = true;
            r.acAt = now.toISOString();
            r.oneShot = r.attempts === 1;
            const base = XP_BY_LEVEL[p.difficulty];
            xpGained = r.oneShot ? Math.round(base * 1.5) : base;
            r.xp = xpGained;
            store.addXp(xpGained, r.oneShot ? 'problem-ac-oneshot' : 'problem-ac', problemId, now);
            if (p.difficulty === 'L5') store.state.badges[`interview-${problemId}`] = now.toISOString();
          }
        }
        const submissionId = crypto.randomUUID();
        store.addSubmission({
          id: submissionId,
          problemId,
          at: now.toISOString(),
          verdict: result.verdict,
          passed: result.passed,
          total: result.total,
          timeMs: result.maxTimeMs ?? null,
          files,
        });
        store.touch(now);
        const mastered = firstAc ? p.knowledgePoints.filter((k) => content.kpById.has(k) && updateMastery(content, store, k, now)) : [];
        store.save({ now: true });
        return {
          ...slimResult(result),
          submissionId,
          xpGained,
          firstAc,
          oneShot: firstAc && r.oneShot,
          newlyMastered: mastered,
          reference: firstAc ? p.reference : undefined,
          record: { attempts: r.attempts, solved: Boolean(r.acAt), passRate: passRate(store, problemId) },
        };
      } finally {
        submitting.delete(problemId);
      }
    },

    submissions({ problemId }) {
      return store.state.submissions
        .filter((s) => s.problemId === problemId)
        .slice(-30)
        .reverse();
    },

    limits() {
      return LIMITS;
    },

    resetProgress({ confirm }) {
      need(confirm === 'RESET', '需要确认');
      store.reset();
      return true;
    },
  };

  /**
   * 作答反馈。答对时给出全部选项的解析；答错时只给出学习者选中的那几个选项的解析，
   * 不直接暴露正确答案，让学习者根据解析修改后再答。
   */
  function quizReview(quizId, given, full) {
    const q = content.quizById.get(quizId);
    const picked = new Set((Array.isArray(given) ? given : [given]).map(Number));
    return {
      full,
      answer: full ? q.answer : null,
      explanation: full ? q.explanation : '',
      options: (q.options || []).map((o, k) => (full || picked.has(k) ? { correct: o.correct, explanation: o.explanation } : null)),
      given,
    };
  }

  async function call(method, params = {}) {
    need(Object.hasOwn(methods, method), `未知的请求：${method}`);
    return methods[method](params || {});
  }

  return { call, flush: () => store.flush(), content, store };
}

// 作为 Electron utilityProcess 运行
if (process.parentPort) {
  let service = null;
  let initError = null;
  const port = process.parentPort;
  port.on('message', async (e) => {
    const msg = e.data;
    if (msg.type === 'init') {
      try {
        service = createService({ dataDir: msg.dataDir });
        port.postMessage({ type: 'ready' });
      } catch (err) {
        initError = err;
        port.postMessage({ type: 'init-error', error: String(err.message || err) });
      }
      return;
    }
    if (msg.type === 'flush') {
      service?.flush();
      port.postMessage({ type: 'flushed' });
      return;
    }
    const { id, method, params } = msg;
    try {
      if (!service) throw initError || new Error('服务还没有准备好');
      const result = await service.call(method, params);
      port.postMessage({ id, ok: true, result });
    } catch (err) {
      port.postMessage({ id, ok: false, error: String(err && err.message ? err.message : err) });
    }
  });
}
