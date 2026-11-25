<script setup>
import { computed } from 'vue';
const props = defineProps({
  value: { type: Number, default: 0 }, // 0..1
  size: { type: Number, default: 64 },
  stroke: { type: Number, default: 6 },
  label: { type: String, default: '' },
});
const r = computed(() => (props.size - props.stroke) / 2);
const c = computed(() => 2 * Math.PI * r.value);
const pct = computed(() => Math.round(Math.max(0, Math.min(1, props.value)) * 100));
</script>

<template>
  <div class="ring" :style="{ width: `${size}px`, height: `${size}px` }" role="img" :aria-label="`${label}完成 ${pct}%`">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
      <circle :cx="size / 2" :cy="size / 2" :r="r" fill="none" stroke="var(--surface-3)" :stroke-width="stroke" />
      <circle
        :cx="size / 2" :cy="size / 2" :r="r" fill="none" stroke="var(--accent)" :stroke-width="stroke"
        stroke-linecap="round" :stroke-dasharray="c" :stroke-dashoffset="c * (1 - pct / 100)"
        :transform="`rotate(-90 ${size / 2} ${size / 2})`"
      />
    </svg>
    <span class="pct">{{ pct }}%</span>
  </div>
</template>

<style scoped>
.ring {
  position: relative;
  flex: none;
}
.pct {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-strong);
}
circle {
  transition: stroke-dashoffset 0.5s ease;
}
</style>
