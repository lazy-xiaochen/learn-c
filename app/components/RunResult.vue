<script setup>
// "运行"的结果：程序输出 + 运行状态（超时、崩溃、sanitizer 报告、编译错误）
import VerdictTag from './VerdictTag.vue';
import CompileOutput from './CompileOutput.vue';
import SanitizerCard from './SanitizerCard.vue';
import StaticIssues from './StaticIssues.vue';
import { computed } from 'vue';

const props = defineProps({
  result: { type: Object, required: true },
  expected: { type: Object, default: null }, // 内容中给出的参考输出 { text, match }
  showStatic: { type: Boolean, default: true },
});
const emit = defineEmits(['goto']);
const warnings = computed(() => (props.result.compile?.diagnostics || []).filter((d) => d.level === 'warning'));
</script>

<template>
  <div class="run-result" data-test="run-result">
    <div class="head">
      <VerdictTag :verdict="result.verdict" />
      <span v-if="result.verdict !== 'CE'" class="muted meta">
        用时 {{ result.timeMs ?? '-' }} ms<template v-if="result.exitCode !== undefined && result.exitCode !== null"> · 退出码 {{ result.exitCode }}</template>
      </span>
    </div>
    <p v-if="result.message" class="msg">{{ result.message }}</p>

    <CompileOutput v-if="result.verdict === 'CE'" :compile="result.compile" @goto="emit('goto', $event)" />
    <template v-else>
      <div class="block">
        <div class="label">程序输出<span v-if="result.stdoutTruncated" class="tag tag-warn">已截断</span></div>
        <pre class="plain out" data-test="stdout">{{ result.stdout || '（没有输出）' }}</pre>
      </div>
      <div class="block" v-if="result.stderr && !result.sanitizer">
        <div class="label">错误输出（stderr）</div>
        <pre class="plain out err">{{ result.stderr }}</pre>
      </div>
      <div class="block" v-if="expected">
        <div class="label">参考输出<span class="muted small" v-if="expected.match !== 'exact'">（{{ expected.match === 'regex' ? '格式示意' : '应包含' }}）</span></div>
        <pre class="plain out">{{ expected.text }}</pre>
      </div>
      <SanitizerCard v-if="result.sanitizer" :sanitizer="result.sanitizer" @goto="emit('goto', $event)" />
      <details v-if="warnings.length" class="warns">
        <summary>编译警告 {{ warnings.length }} 条</summary>
        <CompileOutput :compile="{ ...result.compile, diagnostics: warnings }" @goto="emit('goto', $event)" />
      </details>
      <StaticIssues v-if="showStatic && result.staticIssues?.length" :issues="result.staticIssues" @goto="emit('goto', $event)" />
    </template>
  </div>
</template>

<style scoped>
.run-result { display: flex; flex-direction: column; gap: 10px; }
.head { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.meta { font-size: 13px; }
.msg { margin: 0; font-size: 14px; }
.block { display: flex; flex-direction: column; gap: 4px; }
.label { font-size: 12px; font-weight: 600; color: var(--text-muted); display: flex; gap: 6px; align-items: center; }
.small { font-weight: 400; }
.out { max-height: 320px; overflow: auto; }
.err { color: var(--err); }
.warns summary { cursor: pointer; color: var(--warn); font-size: 13px; margin-bottom: 6px; }
</style>
