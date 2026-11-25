<script setup>
// 启动欢迎弹窗：只在没勾选「启动时不再显示」时出现。
// 界面自检（selftest）会带 ?selftest=1 打开，此时不显示，避免挡住自动化点击。
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const KEY = 'clearn-welcome-off';
const open = ref(false);
const remember = ref(true);
const primary = ref(null);

function suppressed() {
  try {
    if (localStorage.getItem(KEY) === '1') return true;
    // 界面自检用：强制显示一次，验证弹窗本身
    if (localStorage.getItem('clearn-welcome-force') === '1') return false;
  } catch {
    /* 读不到就当没关过 */
  }
  return typeof location !== 'undefined' && location.search.includes('selftest=1');
}

function onKey(e) {
  if (e.key === 'Escape' && open.value) close(false);
}

function close(goLearn) {
  if (remember.value) {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* 忽略 */
    }
  }
  open.value = false;
  window.removeEventListener('keydown', onKey);
  if (goLearn) router.push({ name: 'learn' });
}

onMounted(() => {
  open.value = !suppressed();
  if (open.value) {
    window.addEventListener('keydown', onKey);
    window.setTimeout(() => primary.value?.focus(), 80);
  }
});

onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <Transition name="wl">
    <div v-if="open" class="veil" role="dialog" aria-modal="true" aria-labelledby="welcome-title" @click.self="close(false)">
      <div class="card">
        <div class="glow" aria-hidden="true"></div>
        <div class="logo mono" aria-hidden="true">C</div>
        <div class="eyebrow">WELCOME</div>
        <h1 id="welcome-title">欢迎来到陈庚的<br /><span>C 语言学习平台</span></h1>
        <p class="lead">写给刚开始写代码的你</p>

        <div class="divider" aria-hidden="true"></div>

        <blockquote>
          别怕报错——它不是否定你，<br />
          是编译器在告诉你<b>下一步该看哪里</b>。<br />
          每个高手，都曾在同一个分号上栽过几十次。<br />
          <span class="accent">今天写下一行，明天就多懂一点。</span>
        </blockquote>

        <div class="sign">陈庚</div>

        <div class="actions">
          <label class="remember">
            <input v-model="remember" type="checkbox" />
            启动时不再显示
          </label>
          <button ref="primary" type="button" class="btn btn-primary" data-test="welcome-start" @click="close(true)">开始学习</button>
        </div>
        <p class="hint">从「课程」的第一节开始，或先去「编译台」随便写两行</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.veil {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 20px;
  background: radial-gradient(900px 520px at 50% 42%, rgba(0, 174, 218, 0.1), transparent 65%), rgba(8, 9, 11, 0.72);
  backdrop-filter: blur(6px);
}
.card {
  position: relative;
  width: min(540px, 100%);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 32px 38px 24px;
  border-radius: 20px;
  text-align: center;
  background: linear-gradient(180deg, var(--surface-2), var(--surface) 55%, var(--surface));
  border: 1px solid var(--border-strong);
  box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.55), 0 0 60px -20px rgba(0, 174, 218, 0.35);
}
.card::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 174, 218, 0.75), transparent);
}
.glow {
  position: absolute;
  left: 50%;
  top: -120px;
  width: 420px;
  height: 260px;
  transform: translateX(-50%);
  background: radial-gradient(closest-side, rgba(0, 174, 218, 0.22), transparent);
  pointer-events: none;
}
.logo {
  position: relative;
  width: 46px;
  height: 46px;
  margin: 0 auto 14px;
  border-radius: 13px;
  background: linear-gradient(140deg, #00c6f0, #0084a8);
  display: grid;
  place-items: center;
  color: #04161c;
  font-weight: 900;
  font-size: 22px;
  box-shadow: 0 8px 24px -8px rgba(0, 174, 218, 0.8);
}
.eyebrow {
  position: relative;
  font-size: 10.5px;
  letter-spacing: 4px;
  color: var(--accent);
  opacity: 0.9;
  margin-bottom: 10px;
}
h1 {
  position: relative;
  margin: 0;
  font-size: 25px;
  line-height: 1.52;
  color: var(--text-strong);
  letter-spacing: 0.4px;
  font-weight: 800;
}
h1 span { color: var(--accent); }
.lead { position: relative; margin: 10px 0 0; font-size: 12.5px; color: var(--text-muted); letter-spacing: 1px; }

.divider {
  position: relative;
  height: 1px;
  margin: 20px 0 16px;
  background: linear-gradient(90deg, transparent, var(--border-strong), transparent);
}

blockquote {
  position: relative;
  margin: 0;
  padding: 0 6px;
  font-size: 15px;
  line-height: 2.05;
  color: var(--text);
  letter-spacing: 0.2px;
}
blockquote b { color: var(--text-strong); font-weight: 700; }
blockquote .accent { color: var(--accent); }

.sign { position: relative; margin-top: 14px; text-align: right; font-size: 12.5px; color: var(--text-muted); }
.sign::before {
  content: '';
  display: inline-block;
  width: 18px;
  height: 1px;
  background: var(--border-strong);
  vertical-align: middle;
  margin-right: 8px;
}

.actions { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 24px; }
.remember { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-muted); cursor: pointer; user-select: none; }
.remember input { accent-color: var(--accent); width: 14px; height: 14px; }

.hint { position: relative; margin: 14px 0 0; font-size: 11.5px; color: var(--text-muted); opacity: 0.75; letter-spacing: 0.3px; }

.wl-enter-active, .wl-leave-active { transition: opacity 0.18s ease; }
.wl-enter-from, .wl-leave-to { opacity: 0; }
.wl-enter-active .card, .wl-leave-active .card { transition: transform 0.18s ease; }
.wl-enter-from .card, .wl-leave-to .card { transform: scale(0.96); }

@media (max-width: 767px) {
  .card { padding: 26px 20px 20px; border-radius: 16px; }
  h1 { font-size: 21px; }
  blockquote { font-size: 14px; line-height: 1.95; }
  .actions { flex-direction: column-reverse; align-items: stretch; gap: 12px; }
  .remember { justify-content: center; }
}
</style>
