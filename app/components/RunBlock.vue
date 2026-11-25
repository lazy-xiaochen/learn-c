<script setup>
// 知识点页面里的可交互代码块：直接编辑、运行、看输出（需求 4.1"学"）
import { ref, computed } from 'vue';
import CodeEditor from './CodeEditor.vue';
import RunResult from './RunResult.vue';
import { call } from '../lib/api.js';
import { useApp } from '../stores/app.js';

const props = defineProps({
  lessonId: { type: String, required: true },
  block: { type: Object, required: true },
});
const app = useApp();
const code = ref(props.block.code);
const stdin = ref(props.block.stdin || '');
const showStdin = ref(Boolean(props.block.stdin));
const running = ref(false);
const result = ref(null);
const error = ref('');
const editor = ref(null);

const modified = computed(() => code.value !== props.block.code);
const expectNote = computed(() => {
  const e = props.block.expect;
  if (e === 'OK') return null;
  return { CE: '这段代码是用来演示编译错误的', RE: '这段代码会在运行时出错（演示）', UB: '这段代码包含未定义行为（演示）', TLE: '这段代码会运行超时（演示）', MLE: '这段代码会超出内存限制（演示）', WA: '' }[e] || null;
});
const diagnostics = computed(() => (result.value?.compile?.diagnostics || []).filter((d) => d.file === 'main.c'));

async function run() {
  if (running.value) return;
  running.value = true;
  error.value = '';
  try {
    result.value = await call('runBlock', { lessonId: props.lessonId, blockId: props.block.id, code: code.value, stdin: stdin.value });
    app.refreshProgress();
  } catch (e) {
    error.value = e.message;
  } finally {
    running.value = false;
  }
}
function reset() {
  code.value = props.block.code;
  stdin.value = props.block.stdin || '';
  result.value = null;
}
function goto(d) {
  if (d && d.line && (!d.file || d.file === 'main.c')) editor.value?.gotoLine(d.line);
}
</script>

<template>
  <div class="run-block" :data-block="block.id">
    <div class="bar">
      <span class="lang mono">main.c</span>
      <span v-if="modified" class="tag">已修改</span>
      <span v-if="expectNote" class="tag tag-warn">{{ expectNote }}</span>
      <span class="grow"></span>
      <button type="button" class="btn btn-ghost btn-sm" @click="showStdin = !showStdin" :aria-pressed="showStdin">输入</button>
      <button type="button" class="btn btn-ghost btn-sm" :disabled="!modified && !result" @click="reset">重置</button>
      <button type="button" class="btn btn-primary btn-sm" :disabled="running" data-test="run" @click="run" title="运行（Ctrl+Enter）">
        <span v-if="running" class="spinner"></span>{{ running ? '运行中' : '运行' }}
      </button>
    </div>
    <div class="editor">
      <CodeEditor ref="editor" v-model="code" :diagnostics="diagnostics" @run="run" />
    </div>
    <div v-if="showStdin" class="stdin">
      <label :for="`stdin-${block.id}`" class="label">程序的输入（相当于运行时在键盘上敲的内容）</label>
      <textarea :id="`stdin-${block.id}`" v-model="stdin" rows="3" class="mono" spellcheck="false"></textarea>
    </div>
    <div class="out" v-if="result || error">
      <p v-if="error" class="err">{{ error }}</p>
      <RunResult v-else :result="result" :expected="block.output && !modified ? block.output : null" @goto="goto" />
    </div>
  </div>
</template>

<style scoped>
.run-block { margin: 1em 0; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; background: var(--code-bg); }
.bar { display: flex; align-items: center; gap: 6px; padding: 6px 8px 6px 12px; border-bottom: 1px solid var(--border); background: var(--surface); flex-wrap: wrap; }
.lang { font-size: 12px; color: var(--text-muted); }
.grow { flex: 1; }
.editor { max-height: 520px; overflow: auto; }
.editor :deep(.cm-editor) { height: auto; }
.stdin { padding: 8px 12px; border-top: 1px solid var(--border); background: var(--surface); display: flex; flex-direction: column; gap: 4px; }
.label { font-size: 12px; color: var(--text-muted); }
textarea { width: 100%; resize: vertical; background: var(--code-bg); color: var(--text); border: 1px solid var(--border-strong); border-radius: var(--radius-sm); padding: 6px 8px; font-size: 14px; line-height: 1.6; }
.out { padding: 12px; border-top: 1px solid var(--border); background: var(--surface); }
.err { color: var(--err); margin: 0; }
</style>
