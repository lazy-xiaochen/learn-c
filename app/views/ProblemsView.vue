<script setup>
// 题库列表：阶段 / 难度 / 状态筛选 + 搜索。
// 布局：左侧筛选栏 + 中间题目列表 + 右侧概览（难度分布 / 阶段进度 / 今日建议）。
import { computed, ref } from 'vue';
import { useApp } from '../stores/app.js';
import { LEVELS, LEVEL_NAME, SPECIAL_NAME } from '../lib/constants.js';
import DifficultyBadge from '../components/DifficultyBadge.vue';
import VerdictTag from '../components/VerdictTag.vue';

const app = useApp();
const stage = ref('all');
const level = ref('all');
const status = ref('all');
const q = ref('');

function matchStatus(st) {
  if (status.value === 'all') return true;
  if (status.value === 'solved') return Boolean(st?.solved);
  if (status.value === 'tried') return Boolean(st && !st.solved);
  return !st;
}

const rows = computed(() => {
  const text = q.value.trim();
  return app.catalog.problems
    .map((p) => ({ ...p, kp: app.kpById.get(p.knowledgePoints[0]), st: app.problemState(p.id) }))
    .filter((p) => stage.value === 'all' || p.kp?.stage === stage.value)
    .filter((p) => level.value === 'all' || p.difficulty === level.value)
    .filter((p) => matchStatus(p.st))
    .filter((p) => !text || p.title.includes(text) || (p.kp && p.kp.title.includes(text)));
});

/* ---------- 概览数据 ---------- */
const total = computed(() => app.catalog.problems.length);
const solvedN = computed(() => app.catalog.problems.filter((p) => app.problemState(p.id)?.solved).length);
const triedN = computed(() => {
  return app.catalog.problems.filter((p) => {
    const s = app.problemState(p.id);
    return s && !s.solved;
  }).length;
});
const newN = computed(() => app.catalog.problems.filter((p) => !app.problemState(p.id)).length);

const stageCount = computed(() => {
  const m = {};
  for (const p of app.catalog.problems) {
    const kp = app.kpById.get(p.knowledgePoints[0]);
    if (kp) m[kp.stage] = (m[kp.stage] || 0) + 1;
  }
  return m;
});

const levelRows = computed(() => {
  const pr = app.progress;
  return LEVELS.map((l) => {
    const t = pr?.totalByLevel?.[l] || 0;
    const ac = pr?.acByLevel?.[l] || 0;
    return { l, total: t, ac, ratio: t ? ac / t : 0 };
  });
});

const stageRows = computed(() => app.progress?.stages || []);
const tip = computed(() => app.progress?.recommendations?.[0] || null);

function statusOf(st) {
  if (st?.solved) return { text: '已通过', cls: 'ok' };
  if (st) return { text: '尝试过', cls: 'tried' };
  return { text: '未做', cls: 'new' };
}
const pad3 = (n) => String(n).padStart(3, '0');
</script>

<template>
  <div class="plist">
    <div class="inner">
      <header class="hero">
        <div class="hero-main">
          <h1>题库</h1>
          <p>
            <b>{{ total }}</b> 道编程题 · <b>{{ app.catalog.knowledgePoints.length }}</b> 个知识点 · 全部由内置判题器真实运行验证
          </p>
        </div>
        <div class="hero-stats">
          <div class="stat">
            <div class="k">已通过</div>
            <div class="v">{{ solvedN }}<small>/ {{ total }}</small></div>
          </div>
          <div class="stat">
            <div class="k">尝试过</div>
            <div class="v">{{ triedN }}<small>道</small></div>
          </div>
          <div class="stat accent">
            <div class="k">未开始</div>
            <div class="v">{{ newN }}<small>道</small></div>
          </div>
        </div>
      </header>

      <div class="layout">
        <!-- 左：筛选 -->
        <aside class="filters card" aria-label="筛选">
          <h2>筛选</h2>
          <div class="fgroup">
            <div class="label">阶段</div>
            <div class="stack">
              <button type="button" class="st-btn" :class="{ on: stage === 'all' }" @click="stage = 'all'">
                <span class="ord">·</span><span class="nm">全部阶段</span><span class="n">{{ total }}</span>
              </button>
              <button
                v-for="s in app.catalog.stages"
                :key="s.id"
                type="button"
                class="st-btn"
                :class="{ on: stage === s.id }"
                :title="s.title"
                @click="stage = s.id"
              >
                <span class="ord">{{ s.order }}</span><span class="nm">{{ s.title }}</span><span class="n">{{ stageCount[s.id] || 0 }}</span>
              </button>
            </div>
          </div>

          <div class="fgroup">
            <div class="label">难度</div>
            <div class="seg">
              <button type="button" :class="{ on: level === 'all' }" @click="level = 'all'">全部</button>
              <button
                v-for="l in LEVELS"
                :key="l"
                type="button"
                :class="{ on: level === l }"
                :style="{ '--c': `var(--lv${l.slice(1)})` }"
                :title="`${l} ${LEVEL_NAME[l]}`"
                @click="level = l"
              >{{ l }}</button>
            </div>
          </div>

          <div class="fgroup">
            <div class="label">状态</div>
            <div class="seg">
              <button type="button" :class="{ on: status === 'all' }" @click="status = 'all'">全部</button>
              <button type="button" :class="{ on: status === 'solved' }" @click="status = 'solved'">已通过</button>
              <button type="button" :class="{ on: status === 'tried' }" @click="status = 'tried'">尝试过</button>
              <button type="button" :class="{ on: status === 'new' }" @click="status = 'new'">未做</button>
            </div>
          </div>

          <div class="search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
            </svg>
            <input v-model="q" type="search" placeholder="搜索题目或知识点" aria-label="搜索题目或知识点" />
          </div>
        </aside>

        <!-- 中：列表 -->
        <section class="list" aria-label="题目列表">
          <div class="list-head">
            <span>共 <b>{{ rows.length }}</b> 道<template v-if="rows.length !== total">（全部 {{ total }} 道）</template></span>
            <span class="muted">按课程顺序</span>
          </div>

          <p v-if="!rows.length" class="empty">没有符合条件的题目。换个筛选条件试试。</p>

          <ul v-else class="rows">
            <li v-for="(p, i) in rows" :key="p.id">
              <RouterLink
                :to="{ name: 'problem', params: { id: p.id } }"
                class="row"
                :style="{ '--bar': `var(--lv${p.difficulty.slice(1)})` }"
              >
                <span class="idx">{{ pad3(i + 1) }}</span>
                <span class="main">
                  <span class="ptitle">{{ p.title }}</span>
                  <span class="sub">
                    <span class="kp">{{ p.kp?.title }}</span>
                    <span v-if="p.special" class="tag amber">{{ SPECIAL_NAME[p.special] || p.special }}</span>
                    <span v-if="p.mode === 'function'" class="tag">函数题</span>
                    <span v-else-if="p.mode === 'multi'" class="tag">多文件</span>
                  </span>
                </span>
                <span class="side">
                  <VerdictTag v-if="p.st && !p.st.solved && p.st.lastVerdict" :verdict="p.st.lastVerdict" />
                  <span class="pass" :class="statusOf(p.st).cls">{{ statusOf(p.st).text }}</span>
                  <DifficultyBadge :level="p.difficulty" short />
                </span>
              </RouterLink>
            </li>
          </ul>
        </section>

        <!-- 右：概览 -->
        <aside class="rail" aria-label="题库概览">
          <div class="card">
            <h2>难度分布</h2>
            <div class="panel">
              <div v-for="x in levelRows" :key="x.l" class="bar" :style="{ '--c': `var(--lv${x.l.slice(1)})` }">
                <span class="lvl mono">{{ x.l }}</span>
                <span class="track"><i class="fill" :style="{ width: `${x.ratio * 100}%` }"></i></span>
                <span class="n">{{ x.ac }} / {{ x.total }}</span>
              </div>
            </div>
          </div>

          <div class="card">
            <h2>阶段进度</h2>
            <div class="panel">
              <div v-for="s in stageRows" :key="s.id" class="stage">
                <span class="nm" :title="s.title">{{ s.order }}. {{ s.title }}</span>
                <span class="mini"><i :style="{ width: s.total ? `${(s.mastered / s.total) * 100}%` : '0' }"></i></span>
                <span class="pct">{{ s.mastered }}/{{ s.total }}</span>
              </div>
            </div>
          </div>

          <div v-if="tip" class="tip">
            <div class="t">接下来这一道</div>
            <p>
              {{ tip.title }}<br />
              <RouterLink :to="{ name: 'learn', params: { id: tip.kpId } }">{{ tip.action.label }}</RouterLink>
            </p>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plist { height: 100%; overflow-y: auto; }
.inner { max-width: 1340px; margin: 0 auto; padding: 24px 28px 56px; }

/* ---------- 头部 ---------- */
.hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 18px; flex-wrap: wrap; }
.hero-main { min-width: 0; }
.hero h1 { margin: 0; font-size: 26px; line-height: 1.25; color: var(--text-strong); letter-spacing: 0.3px; }
.hero p { margin: 6px 0 0; color: var(--text-muted); font-size: 13.5px; }
.hero p b { color: var(--text); font-weight: 600; }
.hero-stats { display: flex; gap: 10px; flex: none; }
.stat { min-width: 104px; padding: 8px 14px; border-radius: var(--radius-sm); background: var(--surface); border: 1px solid var(--border); }
.stat .k { font-size: 11.5px; color: var(--text-muted); letter-spacing: 0.3px; }
.stat .v { font-family: var(--font-mono); font-size: 19px; font-weight: 800; color: var(--text-strong); line-height: 1.3; }
.stat .v small { font-size: 11px; font-weight: 600; color: var(--text-muted); margin-left: 3px; }
.stat.accent { border-color: var(--accent); background: var(--accent-soft); }

/* ---------- 三栏 ---------- */
.layout { display: grid; grid-template-columns: 236px minmax(0, 1fr) 296px; gap: 18px; align-items: start; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.card h2 {
  margin: 0; padding: 12px 14px 10px; font-size: 12.5px; font-weight: 700; letter-spacing: 0.4px;
  color: var(--text-strong); border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 8px;
}
.card h2::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 8px var(--accent); }

/* ---------- 左：筛选 ---------- */
.filters { position: sticky; top: 14px; }
.fgroup { padding: 12px 14px; border-bottom: 1px solid var(--border); }
.label { font-size: 11.5px; color: var(--text-muted); letter-spacing: 0.5px; margin-bottom: 8px; }
.stack { display: flex; flex-direction: column; gap: 2px; }
.st-btn {
  display: flex; align-items: center; gap: 8px; width: 100%; text-align: left;
  padding: 6px 8px; border: 0; border-radius: 7px; background: none; color: var(--text-muted);
  font: inherit; font-size: 12.5px; cursor: pointer; line-height: 1.45;
}
.st-btn .ord { flex: none; width: 12px; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }
.st-btn .nm { flex: 1; min-width: 0; }
.st-btn .n { flex: none; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }
.st-btn:hover { background: var(--surface-2); color: var(--text); }
.st-btn.on { background: var(--accent-soft); color: var(--text-strong); font-weight: 600; }
.st-btn.on .ord, .st-btn.on .n { color: var(--accent); }

.seg { display: flex; flex-wrap: wrap; gap: 6px; }
.seg button {
  padding: 4px 10px; border-radius: 7px; border: 1px solid transparent;
  background: var(--surface-2); color: var(--text-muted); font: inherit; font-size: 12.5px; cursor: pointer;
}
.seg button:hover { color: var(--text); }
.seg button.on { background: var(--accent); color: var(--on-accent); font-weight: 700; }
.seg button[style] { color: var(--c); }
.seg button[style].on { color: var(--on-accent); }

.search {
  margin: 12px 14px 14px; display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; border-radius: 8px; background: var(--surface-2); border: 1px solid var(--border-strong);
  color: var(--text-muted);
}
.search input { flex: 1; min-width: 0; border: 0; background: none; color: var(--text); font: inherit; font-size: 13px; outline: none; }
.search input::placeholder { color: var(--text-muted); }
.search:focus-within { border-color: var(--accent); }

/* ---------- 中：列表 ---------- */
.list-head { display: flex; align-items: center; justify-content: space-between; padding: 0 2px 10px; font-size: 12.5px; color: var(--text-muted); }
.list-head b { color: var(--text); font-weight: 600; }
.muted { color: var(--text-muted); }
.empty { padding: 28px 12px; color: var(--text-muted); font-size: 13.5px; }

.rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.row {
  position: relative; display: grid; grid-template-columns: 38px minmax(0, 1fr) auto;
  gap: 14px; align-items: center; padding: 11px 14px 11px 18px;
  border: 1px solid var(--border); border-radius: 11px; background: var(--surface);
  color: var(--text); text-decoration: none; overflow: hidden;
}
.row::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--bar, var(--text-muted)); opacity: 0.85; }
.row:hover { border-color: var(--border-strong); background: var(--surface-2); text-decoration: none; }
.idx { font-family: var(--font-mono); font-size: 11.5px; color: var(--text-muted); text-align: right; }
.main { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.ptitle { font-size: 14px; font-weight: 600; color: var(--text-strong); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sub { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; min-width: 0; font-size: 12px; color: var(--text-muted); }
.kp { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tag { flex: none; font-size: 11px; padding: 1px 7px; border-radius: 5px; border: 1px solid var(--border-strong); color: var(--text-muted); }
.tag.amber { color: var(--amber); border-color: var(--amber); }
.side { display: flex; align-items: center; gap: 8px; justify-self: end; }
.pass { font-size: 11.5px; color: var(--text-muted); min-width: 42px; text-align: right; }
.pass.ok { color: var(--ok); }
.pass.tried { color: var(--warn); }

/* ---------- 右：概览 ---------- */
.rail { display: flex; flex-direction: column; gap: 14px; }
.panel { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 9px; }
.bar { display: grid; grid-template-columns: 26px minmax(0, 1fr) 58px; gap: 9px; align-items: center; font-size: 12px; }
.lvl { font-weight: 700; color: var(--c); font-size: 11.5px; }
.track { height: 8px; border-radius: 99px; background: var(--surface-3); overflow: hidden; }
.fill { display: block; height: 100%; border-radius: 99px; background: var(--c); }
.n { text-align: right; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }

.stage { display: flex; align-items: center; gap: 8px; font-size: 12.5px; }
.stage .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text); }
.mini { flex: none; width: 46px; height: 5px; border-radius: 99px; background: var(--surface-3); overflow: hidden; }
.mini i { display: block; height: 100%; background: var(--accent); border-radius: 99px; }
.pct { flex: none; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); min-width: 34px; text-align: right; }

.tip {
  padding: 13px 14px; border: 1px solid var(--border); border-radius: var(--radius);
  background: linear-gradient(160deg, var(--accent-soft), transparent 60%), var(--surface);
}
.tip .t { color: var(--accent); font-weight: 700; font-size: 12.5px; margin-bottom: 5px; }
.tip p { margin: 0; font-size: 12.5px; color: var(--text-muted); line-height: 1.7; }
.tip a { color: var(--text); font-weight: 600; text-decoration: none; }
.tip a:hover { color: var(--accent); }

.mono { font-family: var(--font-mono); }

/* ---------- 响应式 ---------- */
@media (max-width: 1279px) {
  .layout { grid-template-columns: 208px minmax(0, 1fr); }
  .rail { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: start; }
  .tip { grid-column: 1 / -1; }
}
@media (max-width: 1023px) {
  .layout { grid-template-columns: 190px minmax(0, 1fr); }
  .rail { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 767px) {
  .layout { grid-template-columns: minmax(0, 1fr); }
  .filters { position: static; }
  .stack { max-height: 176px; overflow-y: auto; }
  .inner { padding: 16px 14px 40px; }
  .hero h1 { font-size: 22px; }
  .hero-stats { width: 100%; }
  .stat { flex: 1; min-width: 0; }
  .row { grid-template-columns: minmax(0, 1fr) auto; gap: 10px; padding-left: 14px; }
  .idx { display: none; }
  .pass { display: none; }
}
</style>
