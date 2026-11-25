<script setup>
// 知识点页面的侧栏：可折叠的 阶段 → 分组 → 知识点 树（需求 5.2）。
// 当前知识点高亮，已掌握显示勾选，有题目的知识点显示题目数徽标。
import { computed, ref, watch, nextTick, onMounted } from 'vue';
import { useApp } from '../stores/app.js';

const props = defineProps({ currentId: { type: String, default: '' } });
const emit = defineEmits(['navigate']);
const app = useApp();

const tree = computed(() =>
  app.catalog.stages.map((s) => ({
    ...s,
    groups: s.groups.map((g) => ({
      ...g,
      kps: app.catalog.knowledgePoints.filter((k) => k.stage === s.id && k.group === g.id),
    })),
  })),
);
const currentStage = computed(() => app.kpById.get(props.currentId)?.stage);
const open = ref(new Set([currentStage.value || 's1']));
watch(currentStage, (s) => s && open.value.add(s));

// 打开页面或切换知识点时，把当前知识点滚动到侧栏可见区域
const root = ref(null);
function revealCurrent() {
  nextTick(() => {
    // 只滚动侧栏自己的滚动容器（scrollIntoView 会连带滚动 overflow:hidden 的外层页面）
    const el = root.value?.querySelector('.kp.current');
    const box = root.value?.parentElement;
    if (!el || !box) return;
    const top = el.offsetTop - box.offsetTop;
    if (top < box.scrollTop || top + el.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = Math.max(0, top - box.clientHeight / 3);
  });
}
onMounted(revealCurrent);
watch(() => props.currentId, revealCurrent);

function toggle(id) {
  const n = new Set(open.value);
  if (n.has(id)) n.delete(id);
  else n.add(id);
  open.value = n;
}
function stageInfo(id) {
  return app.progress?.stages.find((s) => s.id === id);
}
</script>

<template>
  <nav ref="root" class="tree" aria-label="课程目录">
    <section v-for="s in tree" :key="s.id" class="stage">
      <button type="button" class="stage-head" :aria-expanded="open.has(s.id)" @click="toggle(s.id)">
        <svg class="chev" :class="{ open: open.has(s.id) }" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" />
        </svg>
        <span class="stage-title">{{ s.order }}. {{ s.title }}</span>
        <span class="stage-count muted">{{ stageInfo(s.id)?.mastered ?? 0 }}/{{ stageInfo(s.id)?.total ?? 0 }}</span>
      </button>
      <div v-if="open.has(s.id)" class="groups">
        <div v-for="g in s.groups" :key="g.id" class="group">
          <div class="group-title">{{ g.title }}</div>
          <ul>
            <li v-for="k in g.kps" :key="k.id">
              <RouterLink
                :to="{ name: 'learn', params: { id: k.id } }"
                class="kp"
                :class="{ current: k.id === currentId, empty: !k.hasContent }"
                :aria-current="k.id === currentId ? 'page' : undefined"
                @click="emit('navigate')"
              >
                <span class="state" :class="app.kpState(k.id).status" aria-hidden="true">
                  <svg v-if="app.kpState(k.id).status === 'mastered'" width="12" height="12" viewBox="0 0 12 12">
                    <path d="M2.5 6.2l2.4 2.4 4.6-5" fill="none" stroke="currentColor" stroke-width="1.8" />
                  </svg>
                </span>
                <span class="kp-title">{{ k.title }}</span>
                <span v-if="!k.hasContent" class="soon">编写中</span>
                <span v-else-if="k.problemIds.length" class="badge" :title="`${k.problemIds.length} 道编程题`">{{ k.problemIds.length }}</span>
                <span class="sr-only">{{ { new: '未开始', learning: '学习中', mastered: '已掌握' }[app.kpState(k.id).status] }}</span>
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </nav>
</template>

<style scoped>
.tree { padding: 8px 8px 24px; }
.stage + .stage { margin-top: 2px; }
.stage-head { width: 100%; display: flex; align-items: center; gap: 8px; padding: 8px; border: 0; background: none; border-radius: var(--radius-sm); cursor: pointer; text-align: left; font-weight: 600; color: var(--text-strong); font-size: 14px; }
.stage-head:hover { background: var(--surface-2); }
.chev { flex: none; color: var(--text-muted); transition: transform 0.15s; }
.chev.open { transform: rotate(90deg); }
.stage-title { flex: 1; min-width: 0; }
.stage-count { font-size: 12px; font-weight: 500; }
.groups { padding: 0 0 6px 12px; }
.group-title { font-size: 12px; color: var(--text-muted); padding: 8px 8px 4px; font-weight: 600; }
ul { list-style: none; margin: 0; padding: 0; }
.kp { display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: var(--radius-sm); color: var(--text); font-size: 14px; line-height: 1.4; text-decoration: none; }
.kp:hover { background: var(--surface-2); text-decoration: none; }
.kp.current { background: var(--accent-soft); color: var(--text-strong); box-shadow: inset 2px 0 0 var(--accent); }
.kp.empty { color: var(--text-muted); }
.state { flex: none; width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid var(--border-strong); display: grid; place-items: center; }
.state.learning { border-color: var(--accent); background: radial-gradient(circle, var(--accent) 0 3px, transparent 3.5px); }
.state.mastered { border-color: var(--ok); background: var(--ok); color: var(--bg); }
.kp-title { flex: 1; min-width: 0; }
.badge { flex: none; min-width: 20px; height: 18px; padding: 0 6px; border-radius: 999px; background: var(--surface-3); color: var(--text); font-size: 11px; font-weight: 700; display: grid; place-items: center; }
.soon { flex: none; font-size: 11px; color: var(--text-muted); }
</style>
