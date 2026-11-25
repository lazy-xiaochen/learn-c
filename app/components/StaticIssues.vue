<script setup>
// 静态规则扫描发现的潜在问题（需求 4.1"评"）
defineProps({ issues: { type: Array, required: true } });
const emit = defineEmits(['goto']);
</script>

<template>
  <div class="issues">
    <h4>代码中的潜在问题</h4>
    <p class="muted note">这些不一定导致本题出错，但在真实程序里很容易出问题：</p>
    <ul>
      <li v-for="(s, k) in issues" :key="k">
        <button type="button" class="loc mono" @click="emit('goto', s)">{{ s.file }}:{{ s.line }}</button>
        <span>{{ s.message }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.issues { border: 1px solid var(--border); border-left: 3px solid var(--warn); border-radius: var(--radius-sm); padding: 10px 12px; background: var(--warn-soft); }
h4 { margin: 0; font-size: 14px; color: var(--warn); }
.note { margin: 2px 0 6px; font-size: 13px; }
ul { margin: 0; padding-left: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; font-size: 14px; }
li { display: flex; gap: 8px; align-items: baseline; }
.loc { background: none; border: 0; padding: 0; color: var(--accent); cursor: pointer; font-size: 13px; flex: none; }
</style>
