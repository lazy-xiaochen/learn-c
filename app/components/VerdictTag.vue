<script setup>
import { computed } from 'vue';
import { VERDICT } from '../lib/constants.js';
const props = defineProps({ verdict: { type: String, required: true }, large: { type: Boolean, default: false } });
const v = computed(() => VERDICT[props.verdict] || { text: props.verdict, tone: '' });
</script>

<template>
  <span class="tag" :class="[v.tone && `tag-${v.tone}`, { large }]">
    <span class="mono">{{ verdict === 'OK' ? '✓' : verdict }}</span>
    <span>{{ v.text }}</span>
  </span>
</template>

<style scoped>
.large {
  height: 30px;
  padding: 0 12px;
  font-size: 15px;
}
</style>
