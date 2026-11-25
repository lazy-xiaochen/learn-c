// 界面自检（需求第 4 步自检清单的界面部分），在 Electron 主进程里驱动真实窗口：
//   - 做题闭环：知识点页面运行代码 → 打开题目 → 提交 → 判题结果 → 进度更新
//   - 提交按钮防重复提交
//   - 暗色/亮色切换及持久化
//   - 窄屏（375px）下页面不横向滚动
// 每一步截图保存到 .tmp/shots/，供人工查看。
// 由 scripts/selftest.mjs 启动（使用临时的学习记录目录，不影响真实进度）。
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..', '..');
const SHOTS = path.join(ROOT, '.tmp', 'shots');
const problems = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'build', 'problems.json'), 'utf8')).programming;

export async function runSelftest({ win }) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const wc = win.webContents;
  const results = [];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const js = (code) => wc.executeJavaScript(code, true);
  async function waitFor(expr, timeout = 30000, what = expr) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      if (await js(`Boolean(${expr})`)) return;
      await sleep(100);
    }
    throw new Error(`等待超时：${what}`);
  }
  async function shot(name) {
    await sleep(350);
    const img = await wc.capturePage();
    fs.writeFileSync(path.join(SHOTS, `${name}.png`), img.toPNG());
  }
  async function check(name, fn) {
    try {
      const detail = await fn();
      results.push({ name, ok: true, detail: detail || '' });
    } catch (err) {
      results.push({ name, ok: false, detail: String(err.message || err) });
    }
  }
  const go = (hash) => js(`location.hash = ${JSON.stringify(hash)}`);
  const setEditor = (selector, text) =>
    js(`(() => { const v = document.querySelector(${JSON.stringify(selector)}).__cmView; v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: ${JSON.stringify(text)} } }); return true; })()`);
  const noHScroll = () => js(`(() => {
    const doc = document.documentElement;
    const bad = [...document.querySelectorAll('body *')].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('[inert]') && !e.closest('.scroll, .table-wrap, .wrap, .cm-editor, .ftabs, .tabs, pre, .grid');
    }).slice(0, 5).map((e) => e.tagName + '.' + [...e.classList].join('.') + ' right=' + Math.round(e.getBoundingClientRect().right));
    return { overflow: doc.scrollWidth > doc.clientWidth, bad };
  })()`);

  win.setSize(1440, 900);
  win.showInactive();
  await waitFor(`document.querySelector('.stats')`, 20000, '仪表盘加载');
  await js(`localStorage.removeItem('clearn-theme'); document.documentElement.setAttribute('data-theme', 'dark'); true`);

  await check('仪表盘：四个统计卡片、难度分布、下一步推荐', async () => {
    const n = await js(`document.querySelectorAll('.stats .stat').length`);
    const bars = await js(`document.querySelectorAll('.bar-row').length`);
    const recs = await js(`document.querySelectorAll('.recs li').length`);
    if (n !== 4 || bars !== 5 || recs < 1) throw new Error(`卡片 ${n}、难度条 ${bars}、推荐 ${recs}`);
    await shot('01-dashboard-dark');
    return `卡片 ${n}，难度条 ${bars}，推荐 ${recs}`;
  });

  await check('知识点页面：可交互代码块运行并显示输出', async () => {
    await go('#/learn/s1-env');
    await waitFor(`document.querySelector('.run-block [data-test=run]')`, 20000, '代码块出现');
    await js(`document.querySelector('.run-block [data-test=run]').click(); true`);
    await waitFor(`document.querySelector('.run-block [data-test=stdout]')`, 30000, '运行输出');
    const out = await js(`document.querySelector('.run-block [data-test=stdout]').textContent`);
    if (!out.includes('你好，C 语言！')) throw new Error(`输出为 ${out}`);
    await shot('02-lesson-run');
    return `输出：${out.trim()}`;
  });

  await check('知识点页面：修改代码后运行能看到编译错误', async () => {
    await setEditor('.run-block .code-editor', '#include <stdio.h>\nint main(void) {\n    printf("x")\n    return 0;\n}\n');
    await js(`document.querySelector('.run-block [data-test=run]').click(); true`);
    await waitFor(`document.querySelector('.run-block .diag')`, 30000, '编译错误');
    const txt = await js(`document.querySelector('.run-block .diag').textContent`);
    await shot('03-lesson-ce');
    return txt.replace(/\s+/g, ' ').slice(0, 80);
  });

  const target = problems.find((p) => p.id === 'p-s1-env-1');
  await check('做题：提交参考代码得到 AC，防重复提交生效，进度更新', async () => {
    await go(`#/problem/${target.id}`);
    await waitFor(`document.querySelector('[data-test=submit]') && document.querySelector('.work .code-editor').__cmView`, 20000, '做题页面');
    await shot('04-problem');
    const xpBefore = await js(`Number(document.querySelector('.chip:last-child').textContent.replace(/\\D/g, ''))`);
    await setEditor('.work .code-editor', target.reference['main.c']);
    // 连续点击 5 次：只应产生 1 次提交
    const state = await js(`(() => { const b = document.querySelector('[data-test=submit]'); for (let k = 0; k < 5; k++) b.click(); return new Promise((r) => setTimeout(() => r({ disabled: b.disabled, text: b.textContent.trim() }), 50)); })()`);
    if (!state.disabled) throw new Error('判题期间提交按钮没有被禁用');
    await waitFor(`document.querySelector('[data-test=judge-result]')`, 60000, '判题结果');
    await waitFor(`!document.querySelector('[data-test=submit]').disabled`, 10000, '按钮恢复');
    const verdict = await js(`document.querySelector('[data-test=judge-result] .summary .tag').textContent`);
    if (!verdict.includes('AC')) throw new Error(`判题结果：${verdict}`);
    await js(`[...document.querySelectorAll('.desc .tab')].find((t) => t.textContent.includes('提交记录')).click(); true`);
    await waitFor(`document.querySelectorAll('.sub').length > 0`, 5000, '提交记录');
    const subs = await js(`document.querySelectorAll('.sub').length`);
    if (subs !== 1) throw new Error(`连续点击 5 次产生了 ${subs} 次提交`);
    await sleep(300);
    const xpAfter = await js(`Number(document.querySelector('.chip:last-child').textContent.replace(/\\D/g, ''))`);
    if (!(xpAfter > xpBefore)) throw new Error(`经验值没有增加：${xpBefore} → ${xpAfter}`);
    await shot('05-problem-ac');
    return `判题中按钮文字"${state.text}"；提交记录 ${subs} 条；XP ${xpBefore} → ${xpAfter}`;
  });

  await check('做题：错误代码显示失败用例（隐藏用例不泄露数据）', async () => {
    await setEditor('.work .code-editor', '#include <stdio.h>\nint main(void) {\n    int a, b;\n    scanf("%d %d", &a, &b);\n    printf("%d\\n", a + b);\n    return 0;\n}\n');
    await js(`document.querySelector('[data-test=submit]').click(); true`);
    await waitFor(`document.querySelector('[data-test=submit]').disabled`, 5000, '开始判题');
    await waitFor(`!document.querySelector('[data-test=submit]').disabled && document.querySelector('[data-test=judge-result]')`, 60000, '判题结果');
    const v = await js(`document.querySelector('[data-test=judge-result] .summary .tag').textContent`);
    const hiddenIo = await js(`(() => { const d = document.querySelector('.detail'); return d ? { hidden: d.textContent.includes('隐藏用例'), io: Boolean(d.querySelector('.io')) } : null; })()`);
    if (v.includes('AC')) throw new Error('错误代码被判为 AC');
    if (hiddenIo && hiddenIo.hidden && hiddenIo.io) throw new Error('隐藏用例显示了输入输出');
    await shot('06-problem-wa');
    return `判题结果 ${v.trim()}`;
  });

  const quiz = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'build', 'problems.json'), 'utf8')).quizzes.find((q) => q.knowledgePoint === 's1-env');
  await check('客观题：答错只显示所选选项的解析，答对后知识点变为"已掌握"', async () => {
    await go('#/learn/s1-env');
    await waitFor(`document.querySelector('[data-quiz] .opt')`, 20000, '客观题');
    const wrong = quiz.options.findIndex((o) => !o.correct);
    const right = quiz.answer[0];
    await js(`document.querySelectorAll('[data-quiz] .opt')[${wrong}].click(); true`);
    await sleep(100);
    await js(`[...document.querySelectorAll('[data-quiz] .btn')].find((b) => b.textContent.includes('提交答案')).click(); true`);
    await waitFor(`document.querySelector('[data-quiz] .res')`, 10000, '判分');
    const shown = await js(`document.querySelectorAll('[data-quiz] .why').length`);
    if (shown !== 1) throw new Error(`答错后显示了 ${shown} 条解析，应只显示所选的 1 条`);
    await js(`document.querySelector('[data-quiz]').scrollIntoView(); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; document.querySelector('#app').scrollTop = 0; document.querySelector('.main').scrollTop = 0; document.querySelector('.shell').scrollTop = 0; true`);
    await shot('06b-quiz-wrong');
    await js(`document.querySelectorAll('[data-quiz] .opt')[${right}].click(); true`);
    await sleep(100);
    await js(`[...document.querySelectorAll('[data-quiz] .btn')].find((b) => b.textContent.includes('提交答案')).click(); true`);
    await waitFor(`document.querySelector('[data-quiz] .res.ok')`, 10000, '答对');
    await waitFor(`document.querySelector('[data-test=kp-status]').textContent.includes('已掌握')`, 10000, '状态变为已掌握');
    const all = await js(`document.querySelectorAll('[data-quiz] .why').length`);
    await shot('06c-quiz-right');
    return `答错显示 1 条解析；答对后显示全部 ${all} 条，知识点状态：已掌握`;
  });

  await check('题库：三栏布局 + 难度筛选生效', async () => {
    win.setSize(1440, 900);
    await sleep(300);
    await go('#/problems');
    await waitFor(`document.querySelector('.plist .row')`, 20000, '题库列表');
    const cols = await js(`getComputedStyle(document.querySelector('.layout')).gridTemplateColumns.split(' ').length`);
    const all = await js(`document.querySelectorAll('.plist .row').length`);
    await js(`[...document.querySelectorAll('.filters .seg button')].find((b) => b.textContent.trim() === 'L1').click(); true`);
    await sleep(400);
    const l1 = await js(`document.querySelectorAll('.plist .row').length`);
    if (cols !== 3) throw new Error(`三栏布局列数为 ${cols}`);
    if (!(all > 100 && l1 > 0 && l1 < all)) throw new Error(`全部 ${all} 道、筛选 L1 后 ${l1} 道`);
    await shot('12-problems');
    return `三栏；全部 ${all} 道，筛选 L1 后 ${l1} 道`;
  });

  await check('编译台：写一段代码运行并看到输出', async () => {
    await js(`localStorage.removeItem('clearn-playground'); true`);
    await go('#/playground');
    await waitFor(`document.querySelector('.pg [data-test=run]')`, 20000, '编译台');
    await js(`document.querySelector('.pg [data-test=run]').click(); true`);
    await waitFor(`document.querySelector('.pg [data-test=stdout]')`, 40000, '运行输出');
    const out = await js(`document.querySelector('.pg [data-test=stdout]').textContent`);
    if (!out.includes('你好，C 语言！')) throw new Error(`输出：${out}`);
    await shot('13-playground');
    return out.trim();
  });

  await check('暗色/亮色切换并持久化到 localStorage', async () => {
    await js(`document.querySelector('[data-test=theme-toggle]').click(); true`);
    const t = await js(`[document.documentElement.getAttribute('data-theme'), localStorage.getItem('clearn-theme'), getComputedStyle(document.body).backgroundColor]`);
    if (t[0] !== 'light' || t[1] !== 'light' || t[2] !== 'rgb(252, 252, 252)') throw new Error(JSON.stringify(t));
    await shot('07-problem-light');
    await go('#/');
    await waitFor(`document.querySelector('.stats')`);
    await shot('08-dashboard-light');
    await go('#/learn/s1-recursion-intro');
    await waitFor(`document.querySelector('.mem')`, 20000, '内存图');
    await js(`document.querySelector('.mem').scrollIntoView(); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; document.querySelector('#app').scrollTop = 0; document.querySelector('.main').scrollTop = 0; document.querySelector('.shell').scrollTop = 0; true`);
    await shot('09-lesson-light-memory');
    // 重新加载页面后主题保持
    await js(`location.reload(); true`);
    await sleep(1500);
    await waitFor(`document.querySelector('.article')`, 20000);
    const after = await js(`document.documentElement.getAttribute('data-theme')`);
    if (after !== 'light') throw new Error(`重新加载后主题为 ${after}`);
    await js(`document.querySelector('[data-test=theme-toggle]').click(); true`);
    return '切换后背景 #fcfcfc，重新加载后保持亮色';
  });

  for (const [w, h, tag] of [[375, 780, 'mobile'], [900, 800, 'tablet']]) {
    await check(`${w}px 宽度下不横向滚动（仪表盘 / 知识点 / 做题）`, async () => {
      win.setSize(w, h);
      await sleep(500);
      const report = [];
      for (const [hash, sel, name] of [['#/', '.stats', 'dash'], ['#/learn/s1-printf', '.article', 'learn'], [`#/problem/p-s1-func-basics-1`, '[data-test=submit]', 'problem']]) {
        await go(hash);
        await waitFor(`document.querySelector('${sel}')`, 20000);
        await sleep(400);
        const r = await noHScroll();
        await shot(`10-${tag}-${name}`);
        if (r.overflow || r.bad.length) report.push(`${name}: ${JSON.stringify(r)}`);
      }
      if (report.length) throw new Error(report.join('\n'));
      return '无横向滚动';
    });
  }

  await check('窄屏做题：结果以底部面板弹出', async () => {
    win.setSize(375, 780);
    await sleep(300);
    await js(`document.querySelector('[data-test=run]').click(); true`);
    await waitFor(`document.querySelector('[data-test=run-result]')`, 30000, '运行结果');
    await sleep(400);
    const r = await js(`(() => { const e = document.querySelector('.result').getBoundingClientRect(); return { top: Math.round(e.top), h: Math.round(e.height), w: Math.round(e.width), vw: innerWidth, vh: innerHeight }; })()`);
    if (!(r.h > r.vh * 0.4 && r.w >= r.vw - 2 && r.top > r.vh * 0.15)) throw new Error(JSON.stringify(r));
    await shot('11-mobile-sheet');
    return JSON.stringify(r);
  });

  await check('欢迎弹窗：强制显示后点「开始学习」会关闭并跳到课程', async () => {
    win.setSize(1440, 900);
    await sleep(400);
    await js(`localStorage.removeItem('clearn-welcome-off'); localStorage.setItem('clearn-welcome-force', '1'); true`);
    await js(`setTimeout(() => location.reload(), 0); true`);
    await sleep(1200);
    await waitFor(`document.querySelector('.veil')`, 30000, '欢迎弹窗');
    await shot('14-welcome');
    await js(`document.querySelector('[data-test=welcome-start]').click(); true`);
    await waitFor(`!document.querySelector('.veil')`, 10000, '弹窗关闭');
    const hash = await js('location.hash');
    if (!hash.startsWith('#/learn')) throw new Error(`点击后 hash=${hash}`);
    await js(`localStorage.removeItem('clearn-welcome-force'); true`);
    return `hash=${hash}`;
  });

  const ok = results.every((r) => r.ok);
  const lines = results.map((r) => `${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? `\n     ${r.detail.replace(/\n/g, '\n     ')}` : ''}`);
  console.log(`\n界面自检结果：\n${lines.join('\n')}\n\n截图保存在 ${SHOTS}\n`);
  fs.writeFileSync(path.join(ROOT, '.tmp', 'selftest-result.json'), JSON.stringify(results, null, 2));
  return ok;
}
