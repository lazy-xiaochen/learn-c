<script setup>
import { onMounted, computed } from 'vue';
import { useApp } from './stores/app.js';
import WelcomeDialog from './components/WelcomeDialog.vue';

const app = useApp();
onMounted(() => app.load());

const xp = computed(() => app.progress?.xp ?? 0);
const streak = computed(() => app.progress?.streak ?? 0);
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <RouterLink to="/" class="brand" aria-label="C 语言学习平台 首页">
        <span class="logo mono" aria-hidden="true">C</span>
        <span class="brand-text">C 语言学习平台</span>
      </RouterLink>
      <nav class="nav" aria-label="主导航">
        <RouterLink to="/" class="nav-link" exact-active-class="active">仪表盘</RouterLink>
        <RouterLink to="/learn" class="nav-link" active-class="active">课程</RouterLink>
        <RouterLink :to="{ name: 'problems' }" class="nav-link" :class="{ active: $route.name === 'problem' || $route.name === 'problems' }">题库</RouterLink>
        <RouterLink :to="{ name: 'playground' }" class="nav-link" active-class="active">编译台</RouterLink>
      </nav>
      <div class="spacer"></div>
      <div class="chips" v-if="app.progress">
        <span class="chip" title="连续学习天数"><span aria-hidden="true">🔥</span> {{ streak }}<span class="chip-unit"> 天</span></span>
        <span class="chip" title="经验值"><span class="xp">XP</span> {{ xp }}</span>
      </div>
      <button
        class="btn btn-ghost btn-icon"
        type="button"
        :aria-label="app.theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'"
        :title="app.theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'"
        data-test="theme-toggle"
        @click="app.toggleTheme()"
      >
        <svg v-if="app.theme === 'dark'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </button>
    </header>

    <main class="main">
      <div v-if="app.loadError" class="fatal">
        <h2>无法加载课程数据</h2>
        <pre class="plain">{{ app.loadError }}</pre>
      </div>
      <div v-else-if="!app.catalog" class="loading"><span class="spinner"></span> 正在加载…</div>
      <RouterView v-else />
    </main>

    <div class="toasts" aria-live="polite">
      <div v-for="t in app.toasts" :key="t.id" class="toast" :class="`toast-${t.tone}`">{{ t.text }}</div>
    </div>

    <WelcomeDialog />
  </div>
</template>

<style scoped>
.shell {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.topbar {
  height: var(--topbar-h);
  flex: none;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-strong);
  font-weight: 700;
  text-decoration: none;
}
.logo {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 800;
}
.nav {
  display: flex;
  gap: 4px;
}
.nav-link {
  white-space: nowrap;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-weight: 500;
  text-decoration: none;
}
.nav-link:hover {
  color: var(--text);
  background: var(--surface-2);
}
.nav-link.active {
  color: var(--text-strong);
  background: var(--surface-2);
  box-shadow: inset 0 -2px 0 var(--accent);
}
.spacer {
  flex: 1;
}
.chips {
  display: flex;
  gap: 8px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}
.xp {
  color: var(--accent);
  font-weight: 800;
  font-size: 11px;
}
.main {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.loading,
.fatal {
  padding: 40px;
  display: flex;
  gap: 10px;
  align-items: center;
  color: var(--text-muted);
}
.fatal {
  flex-direction: column;
  align-items: flex-start;
  color: var(--err);
}
.toasts {
  position: fixed;
  right: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 100;
  pointer-events: none;
}
.toast {
  padding: 10px 14px;
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-left: 3px solid var(--accent);
  font-size: 14px;
  max-width: 360px;
}
.toast-ok {
  border-left-color: var(--ok);
}
.toast-err {
  border-left-color: var(--err);
}
.toast-amber {
  border-left-color: var(--amber);
}

@media (max-width: 767px) {
  .topbar {
    gap: 8px;
    padding: 0 10px;
  }
  .brand-text,
  .chip-unit {
    display: none;
  }
  .nav-link {
    padding: 6px 8px;
  }
  .chips {
    gap: 4px;
  }
  .chip {
    padding: 0 7px;
  }
}
/* 很窄时隐藏顶栏的 XP / 连续天数（仪表盘上有同样的信息），保证导航不换行 */
@media (max-width: 479px) {
  .chips {
    display: none;
  }
}
</style>
