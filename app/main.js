import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router.js';
import './styles/base.css';
import './styles/ui.css';
import './styles/prose.css';

createApp(App).use(createPinia()).use(router).mount('#app');
