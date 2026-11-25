<script setup>
import { computed } from 'vue';
import { useApp } from '../stores/app.js';
import { SPECIAL_NAME } from '../lib/constants.js';
import DifficultyBadge from './DifficultyBadge.vue';
import VerdictTag from './VerdictTag.vue';

const props = defineProps({ problem: { type: Object, required: true } });
const app = useApp();
const st = computed(() => app.problemState(props.problem.id));
</script>

<template>
  <RouterLink :to="{ name: 'problem', params: { id: problem.id } }" class="pcard" :class="{ solved: st?.solved }">
    <div class="top">
      <DifficultyBadge :level="problem.difficulty" short />
      <span v-if="problem.special" class="tag tag-amber">{{ SPECIAL_NAME[problem.special] || problem.special }}</span>
      <span class="grow"></span>
      <span v-if="st?.solved" class="tag tag-ok">已通过</span>
      <VerdictTag v-else-if="st?.lastVerdict" :verdict="st.lastVerdict" />
    </div>
    <div class="title">{{ problem.title }}</div>
  </RouterLink>
</template>

<style scoped>
.pcard { display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); color: var(--text); text-decoration: none; }
.pcard:hover { border-color: var(--accent); text-decoration: none; }
.pcard.solved { border-left: 3px solid var(--ok); }
.top { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.grow { flex: 1; }
.title { font-size: 14px; line-height: 1.5; }
</style>
