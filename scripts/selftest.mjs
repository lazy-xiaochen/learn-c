// 启动 Electron 运行界面自检（tests/ui/selftest.js）。使用一个全新的临时学习记录目录，不影响真实进度。
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const electronPath = require('electron');
const dataDir = path.join(ROOT, '.tmp', 'selftest-data');
fs.rmSync(dataDir, { recursive: true, force: true });

const child = spawn(electronPath, [ROOT], {
  stdio: 'inherit',
  env: { ...process.env, CLEARN_SELFTEST: path.join(ROOT, 'tests', 'ui', 'selftest.js'), CLEARN_DATA_DIR: dataDir },
});
child.on('exit', (code) => process.exit(code ?? 1));
