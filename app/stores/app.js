import { defineStore } from 'pinia';
import { call } from '../lib/api.js';

const THEME_KEY = 'clearn-theme';

export const useApp = defineStore('app', {
  state: () => ({
    catalog: null,
    progress: null,
    loadError: null,
    theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark',
    toasts: [],
  }),
  getters: {
    kpById: (s) => new Map((s.catalog?.knowledgePoints || []).map((k) => [k.id, k])),
    problemById: (s) => new Map((s.catalog?.problems || []).map((p) => [p.id, p])),
    stageById: (s) => new Map((s.catalog?.stages || []).map((x) => [x.id, x])),
    kpState: (s) => (id) => s.progress?.kp?.[id] || { status: 'new', solved: 0, problems: 0, quizzesCorrect: 0, quizzes: 0 },
    problemState: (s) => (id) => s.progress?.problems?.[id] || null,
  },
  actions: {
    async load() {
      try {
        const [catalog, progress] = await Promise.all([call('catalog'), call('progress')]);
        this.catalog = catalog;
        this.progress = progress;
      } catch (err) {
        this.loadError = err.message;
      }
    },
    async refreshProgress() {
      this.progress = await call('progress');
    },
    setTheme(t) {
      this.theme = t;
      document.documentElement.setAttribute('data-theme', t);
      try {
        localStorage.setItem(THEME_KEY, t);
      } catch {
        /* 忽略 */
      }
    },
    toggleTheme() {
      this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
    },
    toast(text, tone = 'accent', ms = 3500) {
      const id = Math.random().toString(36).slice(2);
      this.toasts.push({ id, text, tone });
      setTimeout(() => {
        this.toasts = this.toasts.filter((t) => t.id !== id);
      }, ms);
    },
  },
});
