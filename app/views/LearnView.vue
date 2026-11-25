<script setup>
// 知识点页面（需求 5.2）：360px 可折叠侧栏 + 自适应主内容；宽屏时右侧是关联题目卡片，窄屏时在底部。
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useApp } from '../stores/app.js';
import { call } from '../lib/api.js';
import { KP_STATUS } from '../lib/constants.js';
import { useMedia } from '../lib/media.js';
import StageTree from '../components/StageTree.vue';
import RichMarkdown from '../components/RichMarkdown.vue';
import QuizCard from '../components/QuizCard.vue';
import ProblemCard from '../components/ProblemCard.vue';
import DifficultyBadge from '../components/DifficultyBadge.vue';

const app = useApp();
const route = useRoute();
const router = useRouter();

const lesson = ref(null);
const error = ref('');
const sidebarOpen = ref(true); // 宽屏：侧栏是否展开
const drawerOpen = ref(false); // 窄屏：侧栏抽屉
const scroller = ref(null);
const narrow = useMedia('(max-width: 1023px)');
watch(narrow, () => (drawerOpen.value = false));

const kpOrder = computed(() => app.catalog.knowledgePoints.filter((k) => k.hasContent));
const prevNext = computed(() => {
  const i = kpOrder.value.findIndex((k) => k.id === route.params.id);
  return { prev: kpOrder.value[i - 1] || null, next: i >= 0 ? kpOrder.value[i + 1] || null : null };
});

function defaultKp() {
  const firstOpen = kpOrder.value.find((k) => app.kpState(k.id).status !== 'mastered');
  return (firstOpen || kpOrder.value[0] || app.catalog.knowledgePoints[0]).id;
}

async function load(id) {
  if (!id) {
    router.replace({ name: 'learn', params: { id: defaultKp() } });
    return;
  }
  error.value = '';
  lesson.value = null;
  try {
    lesson.value = await call('lesson', { id });
    app.refreshProgress();
    scroller.value?.scrollTo({ top: 0 });
  } catch (e) {
    error.value = e.message;
  }
}
watch(() => route.params.id, load, { immediate: true });

const status = computed(() => (lesson.value ? app.kpState(lesson.value.id) : null));
const sectionsMain = computed(() => (lesson.value?.sections || []).filter((s) => s.title !== '常见错误'));
const pitfalls = computed(() => (lesson.value?.sections || []).find((s) => s.title === '常见错误'));
const blocksOf = (title) => (lesson.value?.runBlocks || []).filter((b) => b.section === title);
const prereqs = computed(() => (lesson.value?.kp.prerequisites || []).map((id) => app.kpById.get(id)).filter(Boolean));

function onAnswered(r) {
  app.refreshProgress();
  if (r.newlyMastered) app.toast('已掌握这个知识点，获得 10 XP', 'ok');
}
</script>

<template>
  <div class="learn" :class="{ 'side-collapsed': !sidebarOpen, 'drawer-open': drawerOpen }">
    <aside class="side" :inert="narrow && !drawerOpen">
      <div class="side-head">
        <strong>课程目录</strong>
        <button type="button" class="btn btn-ghost btn-sm collapse-btn" @click="sidebarOpen = false" aria-label="收起目录">收起</button>
        <button type="button" class="btn btn-ghost btn-sm close-btn" @click="drawerOpen = false" aria-label="关闭目录">关闭</button>
      </div>
      <div class="side-body">
        <StageTree :current-id="route.params.id || ''" @navigate="drawerOpen = false" />
      </div>
    </aside>
    <div class="scrim" @click="drawerOpen = false"></div>

    <div ref="scroller" class="content">
      <div class="toolbar">
        <button v-if="!sidebarOpen" type="button" class="btn btn-sm expand-btn" @click="sidebarOpen = true">目录</button>
        <button type="button" class="btn btn-sm drawer-btn" @click="drawerOpen = true">目录</button>
      </div>

      <p v-if="error" class="err">{{ error }}</p>
      <div v-else-if="!lesson" class="loading muted"><span class="spinner"></span> 加载中…</div>

      <div v-else class="page">
        <article class="article">
          <header class="head">
            <div class="crumbs muted">
              {{ app.stageById.get(lesson.kp.stage)?.order }}. {{ app.stageById.get(lesson.kp.stage)?.title }}
            </div>
            <h1>{{ lesson.kp.title }}</h1>
            <div class="meta">
              <span class="tag" :class="KP_STATUS[status.status].tone && `tag-${KP_STATUS[status.status].tone}`" data-test="kp-status">
                {{ KP_STATUS[status.status].text }}
              </span>
              <DifficultyBadge :level="lesson.kp.difficulty" />
              <span v-if="lesson.hasContent" class="muted small">
                编程题 {{ status.solved }}/{{ status.problems }} 已通过 · 客观题 {{ status.quizzesCorrect }}/{{ status.quizzes }} 已完成
              </span>
            </div>
            <p class="summary">{{ lesson.kp.summary }}</p>
            <p v-if="prereqs.length" class="prereq small muted">
              先学：
              <template v-for="(p, k) in prereqs" :key="p.id">
                <RouterLink :to="{ name: 'learn', params: { id: p.id } }">{{ p.title }}</RouterLink><span v-if="k < prereqs.length - 1">、</span>
              </template>
            </p>
          </header>

          <div v-if="!lesson.hasContent" class="card placeholder">
            <h2>内容编写中</h2>
            <p class="muted">这个知识点的讲解和题目还在编写，完成后会出现在这里。</p>
          </div>

          <template v-else>
            <section v-for="s in sectionsMain" :key="s.title" class="section">
              <h2 class="sec-title">{{ s.title }}</h2>
              <RichMarkdown :markdown="s.markdown" :lesson-id="lesson.id" :run-blocks="blocksOf(s.title)" />
            </section>

            <details v-if="pitfalls" class="pitfalls" open>
              <summary><span class="tag tag-warn">常见坑</span> 初学者最容易犯的错误</summary>
              <RichMarkdown :markdown="pitfalls.markdown" :lesson-id="lesson.id" :run-blocks="blocksOf(pitfalls.title)" />
            </details>

            <section v-if="lesson.quizzes.length" class="section">
              <h2 class="sec-title">客观题</h2>
              <p class="muted small">答对全部客观题、并通过至少 1 道关联编程题，这个知识点就算"已掌握"。</p>
              <div class="quizzes">
                <QuizCard v-for="(q, k) in lesson.quizzes" :key="q.id" :quiz="q" :index="k + 1" :state="lesson.quizState[q.id]" @answered="onAnswered" />
              </div>
            </section>
          </template>

          <nav class="pager">
            <RouterLink v-if="prevNext.prev" :to="{ name: 'learn', params: { id: prevNext.prev.id } }" class="pg prev">
              <span class="muted small">上一节</span><span>{{ prevNext.prev.title }}</span>
            </RouterLink>
            <span v-else></span>
            <RouterLink v-if="prevNext.next" :to="{ name: 'learn', params: { id: prevNext.next.id } }" class="pg next">
              <span class="muted small">下一节</span><span>{{ prevNext.next.title }}</span>
            </RouterLink>
          </nav>
        </article>

        <aside v-if="lesson.problems.length" class="related" aria-label="关联题目">
          <h2 class="sec-title">关联题目</h2>
          <div class="cards">
            <ProblemCard v-for="p in lesson.problems" :key="p.id" :problem="p" />
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.learn { height: 100%; display: flex; position: relative; }
.side { width: 360px; flex: none; border-right: 1px solid var(--border); background: var(--surface); display: flex; flex-direction: column; min-height: 0; }
.side-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px 6px 16px; }
.side-body { flex: 1; overflow-y: auto; }
.close-btn, .drawer-btn, .scrim { display: none; }
.side-collapsed .side { display: none; }
.side-collapsed .page { padding-top: 52px; }
.content { flex: 1; min-width: 0; overflow-y: auto; }
.toolbar { position: sticky; top: 0; z-index: 2; display: flex; gap: 8px; padding: 10px 16px 0; height: 0; }
.page { display: grid; grid-template-columns: minmax(0, 1fr); gap: 32px; padding: 28px 40px 64px; max-width: 1280px; margin: 0 auto; }
.article { min-width: 0; max-width: 860px; }
.head h1 { font-size: 26px; line-height: 1.3; margin: 4px 0 10px; color: var(--text-strong); }
.crumbs { font-size: 13px; }
.meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.summary { margin: 12px 0 0; color: var(--text); }
.prereq { margin: 6px 0 0; }
.small { font-size: 13px; }
.section { margin-top: 32px; }
.sec-title { font-size: 18px; color: var(--text-strong); margin: 0 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.pitfalls { margin-top: 32px; border: 1px solid var(--border); border-radius: var(--radius); padding: 0 16px 8px; background: var(--surface); }
.pitfalls summary { cursor: pointer; padding: 12px 0; font-weight: 600; display: flex; gap: 8px; align-items: center; }
.quizzes { display: flex; flex-direction: column; gap: 16px; }
.placeholder { padding: 24px; margin-top: 24px; }
.placeholder h2 { margin: 0 0 6px; font-size: 18px; }
.related .cards { display: flex; flex-direction: column; gap: 10px; }
.pager { display: flex; justify-content: space-between; gap: 12px; margin-top: 48px; }
.pg { display: flex; flex-direction: column; padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius); max-width: 48%; text-decoration: none; color: var(--text); }
.pg:hover { border-color: var(--accent); text-decoration: none; }
.pg.next { text-align: right; margin-left: auto; }
.err { color: var(--err); padding: 24px; }
.loading { padding: 40px; display: flex; gap: 8px; align-items: center; }

/* 宽屏：关联题目放在右侧 */
@media (min-width: 1440px) {
  .page { grid-template-columns: minmax(0, 1fr) 300px; }
  .related { position: sticky; top: 24px; align-self: start; }
}

/* 窄于 1024px：侧栏变成抽屉 */
@media (max-width: 1023px) {
  .side { position: absolute; inset: 0 auto 0 0; z-index: 20; width: min(360px, 88vw); transform: translateX(-100%); transition: transform 0.2s; display: flex !important; }
  .drawer-open .side { transform: none; }
  .drawer-open .scrim { display: block; position: absolute; inset: 0; z-index: 10; background: rgba(0, 0, 0, 0.45); }
  .collapse-btn, .expand-btn { display: none; }
  .close-btn, .drawer-btn { display: inline-flex; }
  .page { padding: 52px 20px 48px; }
}
@media (max-width: 767px) {
  .page { padding: 52px 14px 40px; }
  .head h1 { font-size: 22px; }
}
</style>
