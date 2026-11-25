import { createRouter, createWebHashHistory } from 'vue-router';
import Dashboard from './views/DashboardView.vue';
import Learn from './views/LearnView.vue';
import Problems from './views/ProblemsView.vue';
import Problem from './views/ProblemView.vue';
import Playground from './views/PlaygroundView.vue';

// 应用以 file:// 加载，用 hash 路由
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: Dashboard },
    { path: '/learn/:id?', name: 'learn', component: Learn },
    { path: '/problems', name: 'problems', component: Problems },
    { path: '/problem/:id', name: 'problem', component: Problem },
    { path: '/playground', name: 'playground', component: Playground },
    { path: '/:rest(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
