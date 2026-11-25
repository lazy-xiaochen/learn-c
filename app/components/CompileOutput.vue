<script setup>
// 编译错误：先列出逐条的中文解释，再给出完整的编译器原始输出（需求 4.1：CE 时展示完整编译器输出）
import { computed } from 'vue';
const props = defineProps({ compile: { type: Object, required: true } });
const emit = defineEmits(['goto']);
const errors = computed(() => (props.compile.diagnostics || []).filter((d) => d.level === 'error' || d.level === 'fatal error'));
const warnings = computed(() => (props.compile.diagnostics || []).filter((d) => d.level === 'warning'));
</script>

<template>
  <div class="compile">
    <p v-if="compile.security" class="sec">提交的代码没有通过安全检查（这类代码不会被编译运行）：</p>
    <ul class="diag-list" v-if="errors.length || warnings.length">
      <li v-for="(d, k) in [...errors, ...warnings]" :key="k" class="diag" :class="d.level === 'warning' ? 'is-warn' : 'is-err'">
        <div class="diag-head">
          <span class="lvl">{{ d.level === 'warning' ? '警告' : '错误' }}</span>
          <button v-if="d.line" type="button" class="loc mono" @click="emit('goto', d)">{{ d.file }}:{{ d.line }}</button>
          <span v-else-if="d.linker" class="loc mono">链接阶段</span>
          <span class="msg mono">{{ d.message }}</span>
        </div>
        <p v-if="d.hint" class="hint">{{ d.hint }}</p>
      </li>
    </ul>
    <details :open="!errors.length && !warnings.length">
      <summary>编译器完整输出</summary>
      <pre class="plain">{{ compile.output || '（没有输出）' }}</pre>
    </details>
  </div>
</template>

<style scoped>
.compile { display: flex; flex-direction: column; gap: 10px; }
.sec { margin: 0; color: var(--err); font-weight: 600; }
.diag-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.diag { border: 1px solid var(--border); border-left: 3px solid var(--err); border-radius: var(--radius-sm); padding: 8px 10px; background: var(--surface); }
.diag.is-warn { border-left-color: var(--warn); }
.diag-head { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
.lvl { font-size: 12px; font-weight: 700; color: var(--err); }
.is-warn .lvl { color: var(--warn); }
.loc { background: none; border: 0; padding: 0; color: var(--accent); cursor: pointer; font-size: 13px; }
.loc:hover { text-decoration: underline; }
.msg { font-size: 13px; word-break: break-word; }
.hint { margin: 6px 0 0; font-size: 14px; color: var(--text); }
details summary { cursor: pointer; color: var(--text-muted); font-size: 13px; margin-bottom: 6px; }
</style>
