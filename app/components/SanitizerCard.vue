<script setup>
// AddressSanitizer / UBSan 报告摘要（需求 4.1：RE 时展示 sanitizer 报告摘要）
defineProps({ sanitizer: { type: Object, required: true } });
const emit = defineEmits(['goto']);
</script>

<template>
  <div class="san">
    <div class="san-head">
      <span class="tool">{{ sanitizer.tool === 'ubsan' ? 'UndefinedBehaviorSanitizer' : 'AddressSanitizer' }}</span>
      <strong>{{ sanitizer.title }}</strong>
    </div>
    <p class="expl">{{ sanitizer.explanation }}</p>
    <p v-if="sanitizer.location" class="where">
      出错位置：
      <button type="button" class="loc mono" @click="emit('goto', sanitizer.location)">
        {{ sanitizer.location.file }} 第 {{ sanitizer.location.line }} 行<template v-if="sanitizer.location.func">（函数 {{ sanitizer.location.func }}）</template>
      </button>
    </p>
    <details v-if="sanitizer.raw">
      <summary>原始报告</summary>
      <pre class="plain">{{ sanitizer.raw }}</pre>
    </details>
  </div>
</template>

<style scoped>
.san { border: 1px solid var(--border); border-left: 3px solid var(--err); border-radius: var(--radius-sm); padding: 10px 12px; background: var(--err-soft); }
.san-head { display: flex; flex-direction: column; gap: 2px; }
.tool { font-size: 12px; color: var(--text-muted); }
.expl { white-space: pre-line; margin: 6px 0; font-size: 14px; }
.where { margin: 4px 0; font-size: 14px; }
.loc { background: none; border: 0; padding: 0; color: var(--accent); cursor: pointer; font-size: 13px; }
details summary { cursor: pointer; color: var(--text-muted); font-size: 13px; margin: 6px 0; }
</style>
