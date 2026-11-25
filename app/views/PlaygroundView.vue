<script setup>
// 编译台：随手写一段 C 代码，编译并运行，看输出。
// 与课程/题库共用同一个判题沙箱（安全策略、时间/内存/输出限制完全一致），只是不判对错。
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { call } from '../lib/api.js';
import { useApp } from '../stores/app.js';
import CodeEditor from '../components/CodeEditor.vue';
import RunResult from '../components/RunResult.vue';

const app = useApp();
const STORAGE_KEY = 'clearn-playground';

const snippets = [
  {
    id: 'hello',
    name: '你好世界',
    stdin: '',
    code: `#include <stdio.h>

int main(void) {
    printf("你好，C 语言！\\n");
    return 0;
}
`,
  },
  {
    id: 'io',
    name: '读入两个数',
    stdin: '3 4\n',
    code: `#include <stdio.h>

int main(void) {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) {
        return 0;
    }
    printf("%d + %d = %d\\n", a, b, a + b);
    return 0;
}
`,
  },
  {
    id: 'loop',
    name: '数组与循环',
    stdin: '',
    code: `#include <stdio.h>

int main(void) {
    int a[5] = {3, 1, 4, 1, 5};
    int sum = 0;
    for (int i = 0; i < 5; i++) {
        sum += a[i];
    }
    printf("sum = %d\\n", sum);
    return 0;
}
`,
  },
  {
    id: 'pointer',
    name: '指针交换',
    stdin: '',
    code: `#include <stdio.h>

void swap(int *pa, int *pb) {
    int t = *pa;
    *pa = *pb;
    *pb = t;
}

int main(void) {
    int x = 1, y = 2;
    swap(&x, &y);
    printf("x = %d, y = %d\\n", x, y);
    return 0;
}
`,
  },
];

const current = ref(snippets[0].id);
const code = ref(snippets[0].code);
const stdin = ref(snippets[0].stdin);
const running = ref(false);
const result = ref(null);
const editor = ref(null);

const snippet = computed(() => snippets.find((s) => s.id === current.value) || snippets[0]);
const diagnostics = computed(() => (result.value?.compile?.diagnostics || []).filter((d) => d.file === 'main.c'));

onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && typeof saved.code === 'string') {
      code.value = saved.code;
      stdin.value = typeof saved.stdin === 'string' ? saved.stdin : '';
      if (snippets.some((s) => s.id === saved.current)) current.value = saved.current;
    }
  } catch {
    /* 忽略损坏的草稿 */
  }
});

watch([code, stdin, current], () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ code: code.value, stdin: stdin.value, current: current.value }));
  } catch {
    /* 存不下就算了 */
  }
});

function useSnippet(s) {
  if (s.id === current.value) return;
  const dirty = code.value.trim() && code.value !== snippet.value.code;
  if (dirty && !window.confirm('切换到示例会替换当前代码，继续吗？')) return;
  current.value = s.id;
  code.value = s.code;
  stdin.value = s.stdin;
  result.value = null;
}

function reset() {
  if (!window.confirm('恢复成这个示例的原始代码？当前的修改会丢失。')) return;
  code.value = snippet.value.code;
  stdin.value = snippet.value.stdin;
  result.value = null;
}

async function run() {
  if (running.value) return;
  if (!code.value.trim()) {
    app.toast('先写一点代码再运行', 'err');
    return;
  }
  running.value = true;
  try {
    result.value = await call('runSnippet', { code: code.value, stdin: stdin.value });
  } catch (e) {
    app.toast(e.message, 'err');
  } finally {
    running.value = false;
  }
}

function goto(d) {
  if (!d?.line) return;
  if (d.file && d.file !== 'main.c') return;
  nextTick(() => editor.value?.gotoLine(d.line));
}
</script>

<template>
  <div class="pg">
    <div class="inner">
      <header class="head">
        <div class="head-text">
          <h1>编译台</h1>
          <p>随手写一段 C，点「运行」就能看到输出。和课程、题库共用同一个判题沙箱：编译超时 10 秒、运行 1 秒、内存 256MB、输出最多 64KB。</p>
        </div>
        <div class="head-actions">
          <button type="button" class="btn btn-ghost btn-sm" @click="reset">恢复示例</button>
          <button type="button" class="btn btn-primary" :disabled="running" data-test="run" title="运行（Ctrl+Enter）" @click="run">
            <span v-if="running" class="spinner"></span>{{ running ? '运行中' : '运行' }}
          </button>
        </div>
      </header>

      <div class="chips" role="group" aria-label="示例代码">
        <span class="chips-label">示例：</span>
        <button
          v-for="s in snippets"
          :key="s.id"
          type="button"
          class="chip-btn"
          :class="{ on: current === s.id }"
          @click="useSnippet(s)"
        >{{ s.name }}</button>
      </div>

      <div class="work">
        <section class="pane editor" aria-label="代码编辑器">
          <div class="bar">
            <span class="file mono">main.c</span>
            <span class="tag">C17</span>
            <span class="grow"></span>
            <span class="muted small">Ctrl+Enter 运行</span>
          </div>
          <div class="ed">
            <CodeEditor ref="editor" v-model="code" :diagnostics="diagnostics" @run="run" />
          </div>
          <div class="stdin">
            <div class="bar">
              <span class="label">程序输入（stdin）</span>
              <span class="grow"></span>
              <span class="muted small">程序用 scanf 读数据时，把输入写在这里</span>
            </div>
            <textarea v-model="stdin" class="ta mono" rows="3" spellcheck="false" aria-label="程序输入" placeholder="例如：3 4"></textarea>
          </div>
        </section>

        <aside class="pane out" aria-label="运行结果">
          <div class="bar">
            <span class="label">运行结果</span>
            <span class="grow"></span>
            <button v-if="result" type="button" class="btn btn-ghost btn-sm" @click="result = null">清空</button>
          </div>
          <div class="body">
            <div v-if="running" class="busy muted"><span class="spinner"></span> 正在编译并运行…</div>
            <RunResult v-else-if="result" :result="result" @goto="goto" />
            <div v-else class="hint">
              <p>点「运行」编译并执行这段代码。</p>
              <p class="muted small">输出、编译错误、崩溃（RE）、未定义行为（UB）、超时（TLE）都会显示在这里。</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pg { height: 100%; display: flex; flex-direction: column; min-height: 0; }
.inner { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 12px; padding: 20px 24px 18px; }

.head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.head-text { min-width: 0; }
.head h1 { margin: 0; font-size: 24px; color: var(--text-strong); letter-spacing: 0.3px; }
.head p { margin: 6px 0 0; max-width: 760px; color: var(--text-muted); font-size: 13px; }
.head-actions { display: flex; gap: 8px; flex: none; }

.chips { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.chips-label { font-size: 12.5px; color: var(--text-muted); }
.chip-btn {
  padding: 4px 11px; border-radius: 999px; border: 1px solid var(--border);
  background: var(--surface); color: var(--text-muted); font: inherit; font-size: 12.5px; cursor: pointer;
}
.chip-btn:hover { color: var(--text); border-color: var(--border-strong); }
.chip-btn.on { color: var(--on-accent); background: var(--accent); border-color: var(--accent); font-weight: 700; }

.work { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 430px; gap: 16px; }
.pane { display: flex; flex-direction: column; min-height: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.bar { display: flex; align-items: center; gap: 8px; padding: 7px 12px; border-bottom: 1px solid var(--border); background: var(--surface-2); flex: none; }
.file { font-size: 12.5px; color: var(--text); }
.label { font-size: 12.5px; font-weight: 600; color: var(--text-muted); }
.grow { flex: 1; }
.small { font-size: 12px; }
.muted { color: var(--text-muted); }

.ed { flex: 1; min-height: 0; }
.editor :deep(.cm-editor) { height: 100%; }

.stdin { flex: none; border-top: 1px solid var(--border); }
.ta { width: 100%; resize: vertical; border: 0; background: var(--code-bg); color: var(--text); padding: 8px 12px; font-size: 13.5px; line-height: 1.6; min-height: 64px; outline: none; }

.body { flex: 1; min-height: 0; overflow: auto; padding: 12px; }
.busy { display: flex; align-items: center; gap: 8px; }
.hint p { margin: 0 0 6px; font-size: 13.5px; }
.hint .small { font-size: 12.5px; }

@media (max-width: 1023px) {
  .inner { overflow-y: auto; }
  .work { display: flex; flex-direction: column; flex: none; }
  .editor { height: 420px; }
  .out { height: auto; min-height: 240px; }
  .out .body { overflow: visible; }
}
@media (max-width: 767px) {
  .inner { padding: 14px 12px 24px; }
  .head h1 { font-size: 21px; }
  .editor { height: 360px; }
}
</style>
