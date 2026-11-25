<script setup>
// 仪表盘（需求 5.2）：顶部四个统计卡片；左侧难度分布条形图；右侧"下一步推荐"。
// 下方是各阶段完成度环形图和学习热力图（个人进度可视化，不做排行榜）。
import { computed, onMounted } from 'vue';
import { useApp } from '../stores/app.js';
import { LEVELS, LEVEL_NAME, KP_STATUS } from '../lib/constants.js';
import ProgressRing from '../components/ProgressRing.vue';
import DifficultyBadge from '../components/DifficultyBadge.vue';
import Heatmap from '../components/Heatmap.vue';

const app = useApp();
onMounted(() => app.refreshProgress());

const pr = computed(() => app.progress);
const current = computed(() => pr.value?.stages.find((s) => s.id === pr.value.currentStage));
const maxTotal = computed(() => Math.max(1, ...LEVELS.map((l) => pr.value?.totalByLevel[l] || 0)));
const totalProblems = computed(() => LEVELS.reduce((s, l) => s + (pr.value?.totalByLevel[l] || 0), 0));

const badges = computed(() => {
  const b = pr.value?.badges || {};
  return Object.entries(b).map(([id, at]) => {
    if (id.startsWith('stage-')) {
      const s = app.stageById.get(id.slice(6));
      return { id, at, title: `阶段 ${s?.order} 完成`, desc: s?.title, tone: 'ok' };
    }
    const p = app.problemById.get(id.replace(/^interview-/, ''));
    return { id, at, title: '面试级通过', desc: p?.title, tone: 'amber' };
  });
});

function target(r) {
  if (r.action.type === 'problem') return { name: 'problem', params: { id: r.action.target } };
  return { name: 'learn', params: { id: r.action.target } };
}
</script>

<template>
  <div class="dash" v-if="pr">
    <div class="inner">
      <h1 class="title">学习概览</h1>

      <section class="stats" aria-label="统计">
        <div class="stat card">
          <div class="label">连续学习</div>
          <div class="value">{{ pr.streak }}<span class="unit">天</span></div>
          <div class="sub muted">{{ pr.streak ? '今天也来学一点，保持下去' : '今天学一点就开始计数' }}</div>
        </div>
        <div class="stat card">
          <div class="label">总经验值</div>
          <div class="value">{{ pr.xp }}<span class="unit">XP</span></div>
          <div class="sub muted">通过题目、掌握知识点获得</div>
        </div>
        <div class="stat card">
          <div class="label">已通过题目</div>
          <div class="value">{{ pr.acTotal }}<span class="unit">/ {{ totalProblems }}</span></div>
          <div class="sub muted">编程题，按首次 AC 计</div>
        </div>
        <div class="stat card stat-ring">
          <div>
            <div class="label">当前阶段完成度</div>
            <div class="sub">{{ current?.order }}. {{ current?.title }}</div>
            <div class="sub muted">{{ current?.mastered }} / {{ current?.total }} 个知识点已掌握</div>
          </div>
          <ProgressRing :value="current?.ratio || 0" :size="72" :label="current?.title || ''" />
        </div>
      </section>

      <div class="two">
        <section class="card panel" aria-labelledby="h-diff">
          <h2 id="h-diff">已通过题目 · 按难度</h2>
          <p class="muted small">条的长度表示该难度的题目总数，实心部分是已通过的数量。</p>
          <ul class="bars">
            <li v-for="l in LEVELS" :key="l" class="bar-row" :title="`${l} ${LEVEL_NAME[l]}：已通过 ${pr.acByLevel[l]} / ${pr.totalByLevel[l]} 道`">
              <span class="bar-label"><DifficultyBadge :level="l" /></span>
              <span v-if="pr.totalByLevel[l]" class="track" :style="{ width: `${((pr.totalByLevel[l] || 0) / maxTotal) * 100}%` }">
                <span class="fill" :style="{ width: pr.totalByLevel[l] ? `${(pr.acByLevel[l] / pr.totalByLevel[l]) * 100}%` : '0', background: `var(--lv${l.slice(1)})` }"></span>
              </span>
              <span v-else class="track-empty">暂无题目</span>
              <span class="bar-val mono">{{ pr.acByLevel[l] }}<span class="muted"> / {{ pr.totalByLevel[l] }}</span></span>
            </li>
          </ul>
          <p v-if="LEVELS.some((l) => !pr.totalByLevel[l])" class="muted small note">
            没有条的难度目前还没有题目（会在后续阶段补齐）。
          </p>
        </section>

        <section class="card panel" aria-labelledby="h-next">
          <h2 id="h-next">下一步推荐</h2>
          <p class="muted small">从还没掌握的知识点里，按难度从低到高推荐。</p>
          <ol class="recs" v-if="pr.recommendations.length">
            <li v-for="r in pr.recommendations" :key="r.kpId">
              <RouterLink :to="target(r)" class="rec">
                <span class="rec-main">
                  <span class="rec-title">{{ r.title }}</span>
                  <span class="rec-action">{{ r.action.label }}</span>
                </span>
                <span class="rec-side">
                  <span class="tag" :class="KP_STATUS[r.status].tone && `tag-${KP_STATUS[r.status].tone}`">{{ KP_STATUS[r.status].text }}</span>
                  <DifficultyBadge :level="r.action.difficulty || r.difficulty" short />
                </span>
              </RouterLink>
            </li>
          </ol>
          <p v-else class="muted">已有内容的知识点全部掌握了！</p>
        </section>
      </div>

      <section class="card panel" aria-labelledby="h-stages">
        <h2 id="h-stages">各阶段完成度</h2>
        <div class="rings">
          <div v-for="s in pr.stages" :key="s.id" class="ring-item">
            <ProgressRing :value="s.ratio" :size="64" :label="s.title" />
            <div class="ring-text">
              <div class="ring-title">{{ s.order }}. {{ s.title }}</div>
              <div class="muted small">{{ s.mastered }} / {{ s.total }} 已掌握<template v-if="s.available < s.total"> · {{ s.available ? `${s.available} 个已上线` : '内容编写中' }}</template></div>
            </div>
          </div>
        </div>
      </section>

      <div class="two">
        <section class="card panel" aria-labelledby="h-heat">
          <h2 id="h-heat">学习热力图</h2>
          <Heatmap :activity="pr.activity" />
        </section>
        <section class="card panel" aria-labelledby="h-badges">
          <h2 id="h-badges">徽章</h2>
          <p v-if="!badges.length" class="muted small">完成一个阶段的全部知识点获得阶段徽章；通过 L5 题目获得"面试级通过"标识。</p>
          <ul v-else class="badges">
            <li v-for="b in badges" :key="b.id" class="badge" :class="`b-${b.tone}`">
              <strong>{{ b.title }}</strong><span class="muted small">{{ b.desc }}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dash { height: 100%; overflow-y: auto; }
.inner { max-width: 1200px; margin: 0 auto; padding: 24px 28px 48px; display: flex; flex-direction: column; gap: 20px; }
.title { margin: 0; font-size: 22px; color: var(--text-strong); }
.stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.stat { padding: 16px; display: flex; flex-direction: column; gap: 4px; }
.stat-ring { flex-direction: row; justify-content: space-between; align-items: center; gap: 12px; }
.label { font-size: 13px; color: var(--text-muted); font-weight: 600; }
.value { font-size: 30px; font-weight: 800; color: var(--text-strong); line-height: 1.2; }
.unit { font-size: 14px; font-weight: 600; color: var(--text-muted); margin-left: 4px; }
.sub { font-size: 13px; }
.small { font-size: 13px; }
.two { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; }
.panel { padding: 18px; min-width: 0; }
.panel h2 { margin: 0 0 4px; font-size: 16px; color: var(--text-strong); }
.bars { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.bar-row { display: grid; grid-template-columns: 96px minmax(0, 1fr) 64px; align-items: center; gap: 10px; }
.bar-row > .track { justify-self: start; }
.track { height: 14px; min-width: 8px; border-radius: 4px; background: var(--surface-3); overflow: hidden; display: block; }
.track-empty { justify-self: start; font-size: 12px; color: var(--text-muted); border: 1px dashed var(--border-strong); border-radius: 4px; padding: 1px 8px; white-space: nowrap; }
.fill { display: block; height: 100%; border-radius: 4px; transition: width 0.4s; }
.bar-val { font-size: 13px; text-align: right; }
.note { margin: 12px 0 0; }
.recs { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.rec { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); color: var(--text); text-decoration: none; }
.rec:hover { border-color: var(--accent); text-decoration: none; }
.rec-main { display: flex; flex-direction: column; min-width: 0; }
.rec-title { font-weight: 600; font-size: 14px; }
.rec-action { font-size: 13px; color: var(--accent); }
.rec-side { display: flex; gap: 6px; flex: none; }
.rings { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; margin-top: 14px; }
.ring-item { display: flex; gap: 12px; align-items: center; }
.ring-title { font-size: 14px; font-weight: 600; }
.badges { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.badge { display: flex; flex-direction: column; padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); }
.b-ok { border-color: var(--ok); }
.b-amber { border-color: var(--amber); }
.b-amber strong { color: var(--amber); }

@media (max-width: 1023px) {
  .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .two { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 767px) {
  .inner { padding: 16px 14px 40px; }
  .stats { grid-template-columns: minmax(0, 1fr); }
}
</style>
