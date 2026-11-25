<script setup>
// 做题页面（需求 5.2）：左栏题目描述（可折叠）、中栏代码编辑器、右栏判题结果（提交后从右侧展开）。
// 768–1023px：题目描述变为抽屉；< 768px：单栏，判题结果以底部面板弹出。
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { useApp } from '../stores/app.js';
import { call } from '../lib/api.js';
import { useMedia } from '../lib/media.js';
import { renderHtml, highlightC } from '../lib/markdown.js';
import { SPECIAL_NAME } from '../lib/constants.js';
import CodeEditor from '../components/CodeEditor.vue';
import DifficultyBadge from '../components/DifficultyBadge.vue';
import VerdictTag from '../components/VerdictTag.vue';
import JudgeResult from '../components/JudgeResult.vue';
import RunResult from '../components/RunResult.vue';

const app = useApp();
const route = useRoute();
const narrow = useMedia('(max-width: 1023px)');

const p = ref(null);
const error = ref('');
const files = ref({}); // 学习者可编辑的文件
const active = ref(''); // 当前编辑的文件名
const tab = ref('desc');
const descOpen = ref(true); // 宽屏：左栏是否展开
const drawerOpen = ref(false); // 窄屏：题目抽屉
const resultOpen = ref(false);
const resultTab = ref('submit');
const running = ref(false);
const submitting = ref(false);
const runRes = ref(null);
const judgeRes = ref(null);
const stdin = ref('');
const showInput = ref(false);
const hints = ref([]);
const reference = ref(null);
const subs = ref([]);
const editor = ref(null);

const editable = computed(() => Object.keys(p.value?.starter || {}));
const readonlyFiles = computed(() => Object.keys(p.value?.visibleFiles || {}));
const allTabs = computed(() => [...editable.value, ...readonlyFiles.value]);
const isReadonly = computed(() => readonlyFiles.value.includes(active.value));
const currentDoc = computed({
  get: () => (isReadonly.value ? p.value.visibleFiles[active.value] : files.value[active.value] ?? ''),
  set: (v) => {
    if (!isReadonly.value) files.value = { ...files.value, [active.value]: v };
  },
});
const diagnostics = computed(() => {
  const r = resultTab.value === 'run' ? runRes.value : judgeRes.value;
  return (r?.compile?.diagnostics || []).filter((d) => d.file === active.value);
});
const kps = computed(() => (p.value?.knowledgePoints || []).map((id) => app.kpById.get(id)).filter(Boolean));
const passRate = computed(() => p.value?.record.passRate);

async function load(id) {
  error.value = '';
  p.value = null;
  runRes.value = judgeRes.value = null;
  resultOpen.value = false;
  tab.value = 'desc';
  try {
    const data = await call('problem', { id });
    p.value = data;
    files.value = { ...(data.record.draft || data.starter) };
    // 草稿里缺少的文件（题目更新后新增）用初始代码补上
    for (const [n, v] of Object.entries(data.starter)) if (!(n in files.value)) files.value[n] = v;
    active.value = Object.keys(data.starter)[0];
    hints.value = data.hints;
    reference.value = data.reference;
    stdin.value = data.samples[0]?.input || '';
    loadSubs();
  } catch (e) {
    error.value = e.message;
  }
}
watch(() => route.params.id, (id) => id && load(id), { immediate: true });

async function loadSubs() {
  if (p.value) subs.value = await call('submissions', { problemId: p.value.id });
}

// 自动保存草稿（停止输入 0.8 秒后）
let draftTimer = null;
watch(files, (v) => {
  if (!p.value) return;
  clearTimeout(draftTimer);
  const id = p.value.id;
  draftTimer = setTimeout(() => call('saveDraft', { problemId: id, files: v }).catch(() => {}), 800);
});
onBeforeUnmount(() => {
  if (draftTimer && p.value) {
    clearTimeout(draftTimer);
    call('saveDraft', { problemId: p.value.id, files: files.value }).catch(() => {});
  }
});

async function run() {
  if (running.value || !p.value) return;
  running.value = true;
  resultTab.value = 'run';
  resultOpen.value = true;
  try {
    runRes.value = await call('runProblem', { problemId: p.value.id, files: files.value, stdin: stdin.value });
  } catch (e) {
    app.toast(e.message, 'err');
  } finally {
    running.value = false;
  }
}

async function submit() {
  // 请求期间按钮禁用，键盘快捷键也在这里拦截，防止重复提交
  if (submitting.value || !p.value) return;
  submitting.value = true;
  resultTab.value = 'submit';
  resultOpen.value = true;
  try {
    const r = await call('submit', { problemId: p.value.id, files: files.value });
    judgeRes.value = r;
    p.value.record = { ...p.value.record, ...r.record };
    if (r.reference) reference.value = r.reference;
    if (r.firstAc) app.toast(`通过！获得 ${r.xpGained} XP${r.oneShot ? '（一次通过 +50%）' : ''}`, 'ok');
    await Promise.all([app.refreshProgress(), loadSubs()]);
  } catch (e) {
    app.toast(e.message, 'err');
  } finally {
    submitting.value = false;
  }
}

function resetCode() {
  if (!window.confirm('把所有文件恢复成初始代码？当前的修改会丢失。')) return;
  files.value = { ...p.value.starter };
}

async function nextHint() {
  tab.value = 'hints';
  openDesc();
  if (hints.value.length >= p.value.hintCount) return;
  const r = await call('showHint', { problemId: p.value.id });
  hints.value = r.hints;
}

async function revealReference() {
  if (!window.confirm('现在查看参考代码？建议先用完三层提示、自己再试一试。')) return;
  const r = await call('showReference', { problemId: p.value.id });
  reference.value = r.reference;
}

function openDesc() {
  if (narrow.value) drawerOpen.value = true;
  else descOpen.value = true;
}

function goto(d) {
  if (!d?.line) return;
  if (d.file && allTabs.value.includes(d.file)) active.value = d.file;
  setTimeout(() => editor.value?.gotoLine(d.line), 0);
}

function loadSubmission(s) {
  if (!window.confirm('把这次提交的代码载入编辑器？当前的修改会被替换。')) return;
  files.value = { ...s.files };
}

const fmtTime = (iso) => new Date(iso).toLocaleString('zh-CN', { hour12: false });
watch(narrow, () => (drawerOpen.value = false));
</script>

<template>
  <p v-if="error" class="err-page">{{ error }}</p>
  <div v-else-if="!p" class="loading muted"><span class="spinner"></span> 加载中…</div>
  <div v-else class="solve" :class="{ 'desc-collapsed': !descOpen, 'result-open': resultOpen, 'drawer-open': drawerOpen }">
    <!-- 左栏：题目描述 -->
    <aside class="desc" :inert="narrow && !drawerOpen" aria-label="题目描述">
      <div class="desc-fixed">
        <div class="desc-top">
          <DifficultyBadge :level="p.difficulty" />
          <span v-if="p.special" class="tag tag-amber">{{ SPECIAL_NAME[p.special] || p.special }}</span>
          <span v-if="p.record.solved" class="tag tag-ok">已通过</span>
          <span class="grow"></span>
          <button type="button" class="btn btn-ghost btn-sm only-wide" @click="descOpen = false" aria-label="收起题目描述">收起</button>
          <button type="button" class="btn btn-ghost btn-sm only-narrow" @click="drawerOpen = false">关闭</button>
        </div>
        <h1 class="ptitle">{{ p.title }}</h1>
        <div class="pmeta">
          <span class="muted small" title="你自己在这道题上的提交通过率（本应用是单机版，没有全站数据）">
            个人通过率：<template v-if="passRate">{{ Math.round(passRate.ratio * 100) }}%（{{ passRate.ac }}/{{ passRate.attempts }}）</template><template v-else>还没有提交</template>
          </span>
          <span class="muted small">· 通过可得 {{ p.xpValue }} XP</span>
        </div>
        <div class="kps">
          <RouterLink v-for="k in kps" :key="k.id" :to="{ name: 'learn', params: { id: k.id } }" class="tag tag-accent">{{ k.title }}</RouterLink>
        </div>
        <div class="tabs" role="tablist">
          <button v-for="t in [['desc', '题目'], ['hints', `提示 ${hints.length}/${p.hintCount}`], ['mistakes', '常见错误'], ['subs', '提交记录'], ['ref', '参考代码']]" :key="t[0]"
            type="button" role="tab" class="tab" :class="{ on: tab === t[0] }" :aria-selected="tab === t[0]" @click="tab = t[0]">{{ t[1] }}</button>
        </div>
      </div>

      <div class="desc-body">
        <div v-if="tab === 'desc'" class="prose">
          <div v-html="renderHtml(p.statement.description)"></div>
          <h3>输入格式</h3>
          <div v-html="renderHtml(p.statement.input)"></div>
          <h3>输出格式</h3>
          <div v-html="renderHtml(p.statement.output)"></div>
          <h3>数据范围</h3>
          <div v-html="renderHtml(p.statement.constraints)"></div>
          <template v-if="p.mode === 'function'">
            <h3>函数题说明</h3>
            <p>本题只需要实现指定的函数，<code>main</code> 函数由判题程序提供。编辑器上方灰色的文件是题目提供的，只能查看。</p>
          </template>
          <h3>示例</h3>
          <div v-for="(s, k) in p.samples" :key="k" class="sample">
            <div class="sample-head">
              <strong>{{ s.title }}</strong>
              <button type="button" class="btn btn-ghost btn-sm" @click="stdin = s.input; showInput = true">用作运行输入</button>
            </div>
            <div class="io2">
              <div><div class="label">输入</div><pre class="plain">{{ s.input || '（空）' }}</pre></div>
              <div><div class="label">输出</div><pre class="plain">{{ s.output || '（空）' }}</pre></div>
            </div>
            <div v-if="s.note" class="small" v-html="renderHtml(s.note)"></div>
          </div>
          <p class="muted small">提交后会运行 {{ p.testSummary.total }} 组用例，其中 {{ p.testSummary.hidden }} 组隐藏用例不公开数据，覆盖边界、退化情况和 C 语言特有的陷阱。</p>
        </div>

        <div v-else-if="tab === 'hints'" class="hints">
          <p class="muted small">提示分三层：方向 → 具体知识点 → 接近解法。一层一层看，尽量少看。</p>
          <div v-for="(h, k) in hints" :key="k" class="hint card">
            <div class="label">第 {{ k + 1 }} 层</div>
            <div class="prose" v-html="renderHtml(h)"></div>
          </div>
          <button v-if="hints.length < p.hintCount" type="button" class="btn" @click="nextHint">查看第 {{ hints.length + 1 }} 层提示</button>
          <p v-else class="muted small">提示已经全部显示。</p>
          <div class="complexity card" v-if="p.record.solved">
            <div class="label">复杂度说明</div>
            <div class="prose" v-html="renderHtml(p.complexity)"></div>
          </div>
        </div>

        <div v-else-if="tab === 'mistakes'" class="mistakes">
          <p class="muted small">这些是初学者常交的错误写法以及会得到的判题结果。建议先自己做，再来对照。</p>
          <details v-for="(m, k) in p.mistakes" :key="k" class="mistake card">
            <summary>
              <span>{{ m.title }}</span>
              <span class="grow"></span>
              <VerdictTag v-for="v in m.verdicts" :key="v" :verdict="v" />
            </summary>
            <div class="prose" v-html="renderHtml(m.markdown)"></div>
            <pre v-if="m.code" class="plain code" v-html="highlightC(m.code)"></pre>
          </details>
        </div>

        <div v-else-if="tab === 'subs'" class="subs">
          <p v-if="!subs.length" class="muted">还没有提交记录。</p>
          <ul v-else>
            <li v-for="s in subs" :key="s.id" class="sub">
              <VerdictTag :verdict="s.verdict" />
              <span class="small">{{ s.passed }}/{{ s.total }}</span>
              <span class="muted small grow">{{ fmtTime(s.at) }}</span>
              <button type="button" class="btn btn-ghost btn-sm" @click="loadSubmission(s)">载入代码</button>
            </li>
          </ul>
        </div>

        <div v-else-if="tab === 'ref'" class="ref">
          <template v-if="reference">
            <div v-for="(code, name) in reference" :key="name" class="ref-file">
              <div class="label mono">{{ name }}</div>
              <pre class="plain code" v-html="highlightC(code)"></pre>
            </div>
            <div class="card complexity">
              <div class="label">复杂度说明</div>
              <div class="prose" v-html="renderHtml(p.complexity)"></div>
            </div>
          </template>
          <template v-else>
            <p class="muted">通过本题后会自动显示带注释的参考代码。</p>
            <button type="button" class="btn" @click="revealReference">现在就查看</button>
          </template>
        </div>
      </div>
    </aside>
    <div class="scrim" @click="drawerOpen = false"></div>

    <!-- 中栏：编辑器 -->
    <section class="work" aria-label="代码编辑器">
      <div class="etoolbar">
        <button v-if="!descOpen || narrow" type="button" class="btn btn-sm" @click="openDesc">题目</button>
        <span class="lang tag" title="本平台只支持 C 语言（C17）">C17</span>
        <div class="ftabs" role="tablist" aria-label="文件">
          <button v-for="f in allTabs" :key="f" type="button" role="tab" class="ftab mono" :class="{ on: active === f, ro: readonlyFiles.includes(f) }" :aria-selected="active === f" @click="active = f">
            {{ f }}<span v-if="readonlyFiles.includes(f)" class="ro-mark">只读</span>
          </button>
        </div>
        <span class="grow"></span>
        <button type="button" class="btn btn-ghost btn-sm" @click="nextHint">提示</button>
        <button type="button" class="btn btn-ghost btn-sm" @click="resetCode">重置</button>
        <button type="button" class="btn btn-sm" :disabled="running" data-test="run" title="运行（Ctrl+Enter）" @click="run">
          <span v-if="running" class="spinner"></span>{{ running ? '运行中' : '运行' }}
        </button>
        <button type="button" class="btn btn-primary btn-sm" :disabled="submitting" :aria-busy="submitting" data-test="submit" title="提交（Ctrl+Shift+Enter）" @click="submit">
          <span v-if="submitting" class="spinner"></span>{{ submitting ? '判题中' : '提交' }}
        </button>
      </div>
      <div class="editor-wrap">
        <CodeEditor :key="active" ref="editor" v-model="currentDoc" :read-only="isReadonly" :diagnostics="diagnostics" @run="run" @submit="submit" />
      </div>
      <div class="input-bar">
        <button type="button" class="btn btn-ghost btn-sm" :aria-expanded="showInput" @click="showInput = !showInput">
          {{ showInput ? '▾' : '▸' }} 运行时的输入
        </button>
        <span class="muted small">Ctrl+Enter 运行 · Ctrl+Shift+Enter 提交</span>
      </div>
      <textarea v-if="showInput" v-model="stdin" class="stdin mono" rows="4" spellcheck="false" aria-label="运行时的输入"></textarea>
    </section>

    <!-- 右栏：结果 -->
    <section class="result" :inert="!resultOpen" aria-label="运行与判题结果">
      <div class="rhead">
        <div class="rtabs" role="tablist">
          <button type="button" role="tab" class="tab" :class="{ on: resultTab === 'run' }" :aria-selected="resultTab === 'run'" @click="resultTab = 'run'">运行结果</button>
          <button type="button" role="tab" class="tab" :class="{ on: resultTab === 'submit' }" :aria-selected="resultTab === 'submit'" @click="resultTab = 'submit'">提交结果</button>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" @click="resultOpen = false" aria-label="关闭结果面板">关闭</button>
      </div>
      <div class="rbody">
        <template v-if="resultTab === 'run'">
          <div v-if="running" class="busy muted"><span class="spinner"></span> 正在编译并运行…</div>
          <RunResult v-else-if="runRes" :result="runRes" @goto="goto" />
          <p v-else class="muted">点"运行"用下方的输入运行一次程序（不判对错）。</p>
        </template>
        <template v-else>
          <div v-if="submitting" class="busy muted"><span class="spinner"></span> 正在判题：编译后依次运行全部测试用例…</div>
          <JudgeResult v-else-if="judgeRes" :result="judgeRes" @goto="goto" />
          <p v-else class="muted">点"提交"后，代码会在全部测试用例上运行并给出结果。</p>
        </template>
      </div>
    </section>
    <button v-if="!resultOpen && (runRes || judgeRes)" type="button" class="btn btn-sm reopen" @click="resultOpen = true">
      结果<VerdictTag v-if="judgeRes" :verdict="judgeRes.verdict" />
    </button>
  </div>
</template>

<style scoped>
.solve { height: 100%; display: flex; position: relative; overflow: hidden; }
.desc { width: 480px; flex: none; display: flex; flex-direction: column; min-height: 0; border-right: 1px solid var(--border); background: var(--surface); }
.desc-collapsed .desc { display: none; }
.desc-fixed { padding: 14px 18px 0; border-bottom: 1px solid var(--border); flex: none; }
.desc-top { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.ptitle { font-size: 19px; line-height: 1.4; margin: 10px 0 6px; color: var(--text-strong); }
.pmeta { display: flex; gap: 4px; flex-wrap: wrap; }
.kps { display: flex; gap: 6px; flex-wrap: wrap; margin: 8px 0 10px; }
.kps a { text-decoration: none; }
.tabs, .rtabs { display: flex; gap: 2px; overflow-x: auto; }
.tab { border: 0; background: none; padding: 8px 10px; font-size: 13px; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; }
.tab:hover { color: var(--text); }
.tab.on { color: var(--text-strong); border-bottom-color: var(--accent); font-weight: 600; }
.desc-body { flex: 1; overflow-y: auto; padding: 16px 18px 32px; }
.prose h3 { font-size: 15px; margin-top: 1.4em; }
.sample { margin: 10px 0 16px; }
.sample-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; font-size: 14px; }
.io2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.io2 pre { max-height: 220px; overflow: auto; }
.label { font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; }
.small { font-size: 13px; }
.grow { flex: 1; }
.hints, .mistakes, .ref { display: flex; flex-direction: column; gap: 12px; }
.hint, .complexity { padding: 12px 14px; }
.mistake { padding: 0 14px; }
.mistake summary { display: flex; gap: 6px; align-items: center; cursor: pointer; padding: 10px 0; font-weight: 600; font-size: 14px; flex-wrap: wrap; }
.mistake .code { margin-bottom: 12px; max-height: 360px; overflow: auto; }
.subs ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.sub { display: flex; gap: 8px; align-items: center; padding: 6px 8px; border: 1px solid var(--border); border-radius: var(--radius-sm); }
.ref-file .code { max-height: none; }

.work { flex: 1; min-width: 0; display: flex; flex-direction: column; min-height: 0; }
.etoolbar { display: flex; gap: 6px; align-items: center; padding: 8px 10px; border-bottom: 1px solid var(--border); background: var(--surface); flex-wrap: wrap; }
.lang { font-family: var(--font-mono); }
.ftabs { display: flex; gap: 2px; overflow-x: auto; min-width: 0; }
.ftab { border: 1px solid transparent; background: none; padding: 3px 10px; border-radius: var(--radius-sm); font-size: 13px; color: var(--text-muted); cursor: pointer; display: inline-flex; gap: 6px; align-items: center; }
.ftab.on { background: var(--surface-2); border-color: var(--border); color: var(--text-strong); }
.ftab.ro { font-style: italic; }
.ro-mark { font-size: 10px; font-style: normal; color: var(--text-muted); }
.editor-wrap { flex: 1; min-height: 0; }
.input-bar { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 10px; border-top: 1px solid var(--border); background: var(--surface); flex-wrap: wrap; }
.stdin { width: 100%; resize: vertical; border: 0; border-top: 1px solid var(--border); background: var(--code-bg); color: var(--text); padding: 8px 12px; font-size: 14px; line-height: 1.6; min-height: 80px; }

.result { width: 0; flex: none; overflow: hidden; border-left: 1px solid var(--border); background: var(--bg); display: flex; flex-direction: column; min-height: 0; transition: width 0.2s ease; }
.result-open .result { width: 460px; }
.rhead { display: flex; align-items: center; justify-content: space-between; padding: 4px 10px; border-bottom: 1px solid var(--border); background: var(--surface); flex: none; }
.rbody { flex: 1; overflow-y: auto; padding: 14px; min-width: 300px; }
.busy { display: flex; gap: 8px; align-items: center; }
.reopen { position: absolute; right: 12px; bottom: 44px; z-index: 5; }
.scrim { display: none; }
.only-narrow { display: none; }
.err-page { color: var(--err); padding: 24px; }
.loading { padding: 40px; display: flex; gap: 8px; align-items: center; }

/* 1024–1279px：三栏放不下时收窄两侧 */
@media (max-width: 1279px) {
  .desc { width: 400px; }
  .result-open .result { width: 400px; }
}

/* 768–1023px：题目描述变成抽屉，编辑器 + 结果两栏 */
@media (max-width: 1023px) {
  .desc { position: absolute; inset: 0 auto 0 0; z-index: 20; width: min(480px, 92vw); transform: translateX(-100%); transition: transform 0.2s; display: flex !important; }
  .drawer-open .desc { transform: none; }
  .drawer-open .scrim { display: block; position: absolute; inset: 0; z-index: 10; background: rgba(0, 0, 0, 0.45); }
  .only-wide { display: none; }
  .only-narrow { display: inline-flex; }
  .result-open .result { width: 46%; }
  .rbody { min-width: 0; }
}

/* < 768px：单栏，判题结果从底部弹出 */
@media (max-width: 767px) {
  .result { position: absolute; left: 0; right: 0; bottom: 0; width: auto !important; height: 0; border-left: 0; border-top: 1px solid var(--border-strong); z-index: 15; transition: height 0.2s ease; border-radius: 12px 12px 0 0; }
  .result-open .result { height: 72%; }
  .io2 { grid-template-columns: 1fr; }
  .etoolbar .muted { display: none; }
}
</style>
