import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';

// 渲染进程（界面）构建配置。产物在 dist/，由 Electron 以 file:// 加载，所以 base 用相对路径。
export default defineConfig({
  root: fileURLToPath(new URL('./app', import.meta.url)),
  base: './',
  plugins: [vue()],
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
  server: { port: 5199, strictPort: true, host: '127.0.0.1' },
});
