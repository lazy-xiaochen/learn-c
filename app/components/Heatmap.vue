<script setup>
// 学习热力图：最近若干周，每格一天，颜色深浅表示当天学习动作次数（单一色相，从浅到深）
import { computed, ref } from 'vue';
const props = defineProps({ activity: { type: Object, default: () => ({}) }, weeks: { type: Number, default: 20 } });

const pad = (n) => String(n).padStart(2, '0');
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// 0 / 1-4 / 5-14 / 15-29 / 30+
const level = (n) => (n <= 0 ? 0 : n < 5 ? 1 : n < 15 ? 2 : n < 30 ? 3 : 4);

const cols = computed(() => {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - (props.weeks * 7 - 1));
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // 每一列从周一开始
  const out = [];
  const d = new Date(start);
  while (d <= end) {
    const col = [];
    for (let k = 0; k < 7; k++) {
      const n = props.activity[key(d)] || 0;
      col.push({ date: key(d), n, lv: level(n), future: d > end });
      d.setDate(d.getDate() + 1);
    }
    out.push(col);
  }
  return out;
});
const total = computed(() => Object.values(props.activity).reduce((a, b) => a + b, 0));
const days = computed(() => Object.values(props.activity).filter((n) => n > 0).length);
const hover = ref(null);
</script>

<template>
  <div class="heat">
    <p class="muted small">共学习 {{ days }} 天、{{ total }} 次（运行代码、提交、答题都算一次）</p>
    <div class="scroll">
      <div class="grid" role="img" :aria-label="`最近 ${weeks} 周学习了 ${days} 天`">
        <div class="wk-labels" aria-hidden="true"><span>一</span><span></span><span>三</span><span></span><span>五</span><span></span><span>日</span></div>
        <div v-for="(c, i) in cols" :key="i" class="col">
          <span
            v-for="cell in c"
            :key="cell.date"
            class="cell"
            :class="[`l${cell.lv}`, { future: cell.future }]"
            :title="cell.future ? '' : `${cell.date}：${cell.n} 次`"
            @mouseenter="hover = cell.future ? null : cell"
            @mouseleave="hover = null"
          ></span>
        </div>
      </div>
    </div>
    <div class="foot">
      <span class="muted small">{{ hover ? `${hover.date}：${hover.n} 次` : '' }}</span>
      <span class="legend muted small" aria-hidden="true">
        少 <span class="cell l0"></span><span class="cell l1"></span><span class="cell l2"></span><span class="cell l3"></span><span class="cell l4"></span> 多
      </span>
    </div>
  </div>
</template>

<style scoped>
.small { font-size: 13px; }
.scroll { overflow-x: auto; padding: 4px 0; }
.grid { display: flex; gap: 3px; width: max-content; }
.wk-labels { display: grid; grid-template-rows: repeat(7, 12px); gap: 3px; font-size: 10px; color: var(--text-muted); margin-right: 4px; line-height: 12px; }
.col { display: grid; grid-template-rows: repeat(7, 12px); gap: 3px; }
.cell { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
.l0 { background: var(--surface-3); }
.l1 { background: color-mix(in srgb, var(--accent) 30%, var(--surface-3)); }
.l2 { background: color-mix(in srgb, var(--accent) 55%, var(--surface-3)); }
.l3 { background: color-mix(in srgb, var(--accent) 78%, var(--surface-3)); }
.l4 { background: var(--accent); }
.future { visibility: hidden; }
.foot { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; min-height: 20px; }
.legend { display: inline-flex; gap: 3px; align-items: center; }
</style>
