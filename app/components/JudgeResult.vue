<script setup>
// 提交结果的结构化反馈（需求 4.1"评"）：
// 通过/失败的用例、隐藏用例只显示"第 N 组"和类别、编译错误、sanitizer 摘要、泄漏位置、静态扫描问题。
import { computed, ref, watch } from 'vue';
import VerdictTag from './VerdictTag.vue';
import CompileOutput from './CompileOutput.vue';
import SanitizerCard from './SanitizerCard.vue';
import StaticIssues from './StaticIssues.vue';
import { VERDICT } from '../lib/constants.js';

const props = defineProps({ result: { type: Object, required: true } });
const emit = defineEmits(['goto']);

const cases = computed(() => props.result.cases || []);
const firstBad = computed(() => cases.value.find((c) => c.verdict !== 'AC') || null);
const selected = ref(null);
watch(
  () => props.result,
  () => {
    selected.value = firstBad.value ? firstBad.value.index : null;
  },
  { immediate: true },
);
const current = computed(() => cases.value.find((c) => c.index === selected.value) || null);

function diffText(d) {
  if (!d) return '';
  if (d.token) return `第 ${d.token} 个数据项：期望 ${d.expected}，实际 ${d.actual}`;
  if (d.line) return `第 ${d.line} 行：期望 “${d.expected}”，实际 “${d.actual}”`;
  return '';
}
</script>

<template>
  <div class="judge" data-test="judge-result">
    <div class="summary" :class="`tone-${VERDICT[result.verdict]?.tone || 'err'}`">
      <VerdictTag :verdict="result.verdict" large />
      <div class="sum-text">
        <strong v-if="result.verdict === 'AC'">全部 {{ result.total }} 组用例通过</strong>
        <strong v-else-if="result.verdict === 'CE'">{{ result.compile?.security ? '代码没有通过安全检查' : '代码没有通过编译' }}</strong>
        <strong v-else>通过 {{ result.passed }} / {{ result.total }} 组用例</strong>
        <span class="muted" v-if="result.verdict !== 'CE'">最长用时 {{ result.maxTimeMs }} ms</span>
      </div>
      <div class="xp" v-if="result.xpGained">
        +{{ result.xpGained }} XP<span v-if="result.oneShot" class="tag tag-amber">一次通过 +50%</span>
      </div>
    </div>

    <p v-if="result.newlyMastered?.length" class="mastered">🎉 掌握了新的知识点，额外获得 10 XP。</p>

    <CompileOutput v-if="result.verdict === 'CE'" :compile="result.compile" @goto="emit('goto', $event)" />

    <template v-else>
      <div class="grid" role="list" aria-label="测试用例">
        <button
          v-for="c in cases"
          :key="c.index"
          type="button"
          role="listitem"
          class="case"
          :class="[c.verdict === 'AC' ? 'ok' : 'bad', { sel: c.index === selected }]"
          :title="`第 ${c.index} 组（${c.hidden ? '隐藏' : '示例'}）：${c.verdictText}`"
          @click="selected = c.index"
        >
          <span class="num">#{{ c.index }}</span>
          <span class="v mono">{{ c.verdict }}</span>
        </button>
      </div>

      <div v-if="current" class="detail">
        <div class="detail-head">
          <strong>第 {{ current.index }} 组</strong>
          <span class="tag">{{ current.hidden ? '隐藏用例' : '示例' }}</span>
          <span class="muted cat">{{ current.category }}</span>
          <VerdictTag :verdict="current.verdict" />
          <span class="muted small">{{ current.timeMs }} ms</span>
        </div>
        <p class="msg" v-if="current.verdict !== 'AC'">{{ current.message }}</p>
        <p class="diff" v-if="current.diff">{{ diffText(current.diff) }}</p>
        <p v-if="current.hidden && current.verdict !== 'AC'" class="muted small">隐藏用例不显示具体数据。根据上面的类别想一想：你的代码在这种情况下会怎样？</p>
        <SanitizerCard v-if="current.sanitizer" :sanitizer="current.sanitizer" @goto="emit('goto', $event)" />
        <ul v-if="current.leaks?.length && current.verdict === 'LEAK'" class="leaks">
          <li v-for="(l, k) in current.leaks" :key="k">
            <button type="button" class="loc mono" @click="emit('goto', l)">{{ l.file }}:{{ l.line }}</button>
            分配了 {{ l.count }} 块共 {{ l.bytes }} 字节，没有释放
          </li>
        </ul>
        <div v-if="!current.hidden" class="io">
          <div>
            <div class="label">输入</div>
            <pre class="plain">{{ current.input || '（空）' }}</pre>
          </div>
          <div>
            <div class="label">期望输出</div>
            <pre class="plain">{{ current.expected || '（空）' }}</pre>
          </div>
          <div>
            <div class="label">你的输出</div>
            <pre class="plain">{{ current.actual || '（没有输出）' }}</pre>
          </div>
        </div>
      </div>
    </template>

    <StaticIssues v-if="result.staticIssues?.length" :issues="result.staticIssues" @goto="emit('goto', $event)" />
  </div>
</template>

<style scoped>
.judge { display: flex; flex-direction: column; gap: 12px; }
.summary { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--surface); }
.tone-ok { border-color: var(--ok); background: var(--ok-soft); }
.tone-err { border-color: var(--err); background: var(--err-soft); }
.tone-warn { border-color: var(--warn); background: var(--warn-soft); }
.sum-text { display: flex; flex-direction: column; font-size: 14px; flex: 1; min-width: 140px; }
.xp { display: flex; gap: 6px; align-items: center; font-weight: 800; color: var(--accent); }
.mastered { margin: 0; color: var(--ok); font-weight: 600; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 6px; }
.case { display: flex; flex-direction: column; align-items: center; padding: 6px 0; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); cursor: pointer; font-size: 12px; }
.case.ok .v { color: var(--ok); }
.case.bad .v { color: var(--err); }
.case.bad { border-color: color-mix(in srgb, var(--err) 50%, var(--border)); }
.case.sel { outline: 2px solid var(--accent); outline-offset: -1px; }
.num { color: var(--text-muted); }
.v { font-weight: 700; font-size: 13px; }
.detail { display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; background: var(--surface); }
.detail-head { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.cat { font-size: 13px; }
.small { font-size: 13px; }
.msg, .diff { margin: 0; font-size: 14px; }
.diff { font-family: var(--font-mono); font-size: 13px; color: var(--err); white-space: pre-wrap; word-break: break-word; }
.io { display: grid; grid-template-columns: 1fr; gap: 8px; }
.io pre { max-height: 200px; overflow: auto; }
.label { font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; }
.leaks { margin: 0; padding-left: 0; list-style: none; font-size: 14px; display: flex; flex-direction: column; gap: 4px; }
.loc { background: none; border: 0; padding: 0; color: var(--accent); cursor: pointer; font-size: 13px; }
</style>
