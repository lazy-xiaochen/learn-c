// 后端服务规则测试：经验值、掌握状态、客观题反馈、隐藏用例不泄露、重复提交拦截、学习记录持久化。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createService } from '../../server/service.js';

function fresh() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clearn-svc-'));
  return { dir, svc: createService({ dataDir: dir }) };
}

test('一次通过得 1.5 倍经验；再次 AC 不重复加分；第二次才通过只得基础分', async () => {
  const { svc } = fresh();
  const p1 = svc.content.problemById.get('p-s1-env-1'); // L1
  const r1 = await svc.call('submit', { problemId: p1.id, files: p1.reference });
  assert.equal(r1.verdict, 'AC');
  assert.equal(r1.xpGained, 30);
  assert.equal(r1.oneShot, true);
  const again = await svc.call('submit', { problemId: p1.id, files: p1.reference });
  assert.equal(again.xpGained, 0);

  const p2 = svc.content.problemById.get('p-s1-printf-1'); // L1
  const wa = await svc.call('submit', { problemId: p2.id, files: p2.starter });
  assert.notEqual(wa.verdict, 'AC');
  const ac = await svc.call('submit', { problemId: p2.id, files: p2.reference });
  assert.equal(ac.verdict, 'AC');
  assert.equal(ac.xpGained, 20);
  assert.equal(ac.oneShot, false);
  const pr = await svc.call('progress');
  assert.equal(pr.xp, 50);
  assert.equal(pr.acTotal, 2);
  assert.equal(pr.problems[p2.id].passRate.attempts, 2);
});

test('隐藏用例不返回输入、期望输出、实际输出和差异', async () => {
  const { svc } = fresh();
  const p = svc.content.problemById.get('p-s1-env-1');
  const r = await svc.call('submit', { problemId: p.id, files: p.starter });
  const hidden = r.cases.filter((c) => c.hidden);
  assert.ok(hidden.length >= 5);
  for (const c of hidden) {
    for (const k of ['input', 'expected', 'actual', 'diff', 'stderr']) assert.ok(!(k in c), `隐藏用例包含字段 ${k}`);
  }
  // 题目详情里也没有隐藏用例、隐藏测试驱动和参考代码
  const view = await svc.call('problem', { id: 'p-s1-func-basics-1' });
  assert.equal(view.reference, null);
  assert.ok(!JSON.stringify(view).includes('harness.c'));
  assert.ok(!('tests' in view));
});

test('客观题答错只给所选选项的解析；全部答对 + 1 题 AC 后知识点已掌握并加 10 XP', async () => {
  const { svc } = fresh();
  const q = svc.content.quizById.get('q-s1-env-1');
  const wrong = q.options.findIndex((o) => !o.correct);
  const r1 = await svc.call('answerQuiz', { quizId: q.id, given: wrong });
  assert.equal(r1.correct, false);
  assert.equal(r1.review.answer, null);
  assert.equal(r1.review.options.filter(Boolean).length, 1);
  assert.equal(r1.status.status, 'learning');

  const r2 = await svc.call('answerQuiz', { quizId: q.id, given: q.answer[0] });
  assert.equal(r2.correct, true);
  assert.equal(r2.review.options.filter(Boolean).length, q.options.length);
  assert.equal(r2.newlyMastered, false); // 还没有 AC 的编程题

  const p = svc.content.problemById.get('p-s1-env-1');
  const s = await svc.call('submit', { problemId: p.id, files: p.reference });
  assert.deepEqual(s.newlyMastered, ['s1-env']);
  const pr = await svc.call('progress');
  assert.equal(pr.kp['s1-env'].status, 'mastered');
  assert.equal(pr.xp, 30 + 10);
});

test('同一道题判题中再次提交会被拒绝', async () => {
  const { svc } = fresh();
  const p = svc.content.problemById.get('p-s1-env-1');
  const [a, b] = await Promise.allSettled([
    svc.call('submit', { problemId: p.id, files: p.reference }),
    svc.call('submit', { problemId: p.id, files: p.reference }),
  ]);
  assert.equal(a.status, 'fulfilled');
  assert.equal(b.status, 'rejected');
  assert.match(String(b.reason.message), /还在判题中/);
});

test('学习记录写入文件，重新打开后保留', async () => {
  const { dir, svc } = fresh();
  const p = svc.content.problemById.get('p-s1-env-1');
  await svc.call('submit', { problemId: p.id, files: p.reference });
  await svc.call('saveDraft', { problemId: 'p-s1-printf-1', files: { 'main.c': 'int main(void){return 0;}' } });
  svc.flush();
  const again = createService({ dataDir: dir });
  const pr = await again.call('progress');
  assert.equal(pr.xp, 30);
  const view = await again.call('problem', { id: 'p-s1-printf-1' });
  assert.equal(view.record.draft['main.c'], 'int main(void){return 0;}');
});

test('拒绝格式不正确的请求', async () => {
  const { svc } = fresh();
  await assert.rejects(svc.call('nope'), /未知的请求/);
  await assert.rejects(svc.call('submit', { problemId: 'p-s1-env-1', files: { 'main.c': 1 } }), /格式不正确/);
  await assert.rejects(svc.call('runBlock', { lessonId: 's1-env', blockId: 'zzz', code: '' }), /没有这个代码块/);
  await assert.rejects(svc.call('resetProgress', {}), /需要确认/);
});
