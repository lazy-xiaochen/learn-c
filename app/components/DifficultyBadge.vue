<script setup>
import { LEVEL_NAME } from '../lib/constants.js';
defineProps({ level: { type: String, required: true }, short: { type: Boolean, default: false } });
</script>

<template>
  <span class="diff" :class="`lv-${level}`" :title="`难度 ${level}：${LEVEL_NAME[level]}`">
    {{ level }}<template v-if="!short"> · {{ LEVEL_NAME[level] }}</template>
  </span>
</template>

<style scoped>
.diff {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid currentColor;
  line-height: 1;
}
.lv-L1 { color: var(--lv1); }
.lv-L2 { color: var(--lv2); }
.lv-L3 { color: var(--lv3); }
.lv-L4 { color: var(--lv4); }
.lv-L5 { color: var(--lv5); }
</style>
