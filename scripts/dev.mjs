// 开发模式：启动 Vite 开发服务器（只监听 127.0.0.1），再启动 Electron 加载它。修改界面代码会热更新。
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const electronPath = require('electron'); // electron 包导出的是可执行文件路径

const server = await createServer({ configFile: path.join(ROOT, 'vite.config.js') });
await server.listen();
const url = `http://127.0.0.1:${server.config.server.port}/`;
console.log(`界面开发服务器：${url}`);

const child = spawn(electronPath, [ROOT], {
  stdio: 'inherit',
  env: { ...process.env, VITE_DEV_SERVER_URL: url },
});
child.on('exit', async (code) => {
  await server.close();
  process.exit(code ?? 0);
});
