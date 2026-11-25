// 定位编译工具链与判题原生组件（runner.exe、clearn_track.o）。
//
// 查找顺序：
//   1. 环境变量 CLEARN_TOOLCHAIN（指向 llvm-mingw 根目录）
//   2. 打包后的应用：process.resourcesPath/toolchain/llvm-mingw-*-ucrt-x86_64
//   3. 开发环境：<项目根>/toolchain/llvm-mingw-*-ucrt-x86_64
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(here, '..', '..');

function findUcrtToolchainIn(dir) {
  if (!fs.existsSync(dir)) return null;
  const hits = fs
    .readdirSync(dir)
    .filter((n) => /^llvm-mingw-.*-ucrt-x86_64$/.test(n))
    .sort()
    .reverse(); // 多个版本时取最新
  return hits.length ? path.join(dir, hits[0]) : null;
}

let cached = null;

export function getToolchain() {
  if (cached) return cached;
  const candidates = [];
  if (process.env.CLEARN_TOOLCHAIN) candidates.push(process.env.CLEARN_TOOLCHAIN);
  if (process.resourcesPath) {
    const t = findUcrtToolchainIn(path.join(process.resourcesPath, 'toolchain'));
    if (t) candidates.push(t);
  }
  const dev = findUcrtToolchainIn(path.join(PROJECT_ROOT, 'toolchain'));
  if (dev) candidates.push(dev);

  for (const root of candidates) {
    const clang = path.join(root, 'bin', 'clang.exe');
    if (fs.existsSync(clang)) {
      cached = {
        root,
        binDir: path.join(root, 'bin'),
        clang,
        // AddressSanitizer 运行时 DLL 所在目录，运行学习者程序时需要放进 PATH
        runtimeDir: path.join(root, 'bin'),
      };
      return cached;
    }
  }
  throw new Error(
    '找不到 C 编译工具链。请下载 llvm-mingw 的 ucrt-x86_64 版本并解压到 toolchain/ 目录（见 README）。',
  );
}

export function getNativeDir() {
  if (process.env.CLEARN_NATIVE_DIR) return process.env.CLEARN_NATIVE_DIR;
  if (process.resourcesPath) {
    const p = path.join(process.resourcesPath, 'native');
    if (fs.existsSync(p)) return p;
  }
  return path.join(PROJECT_ROOT, 'native', 'build');
}

export function getNativeArtifacts() {
  const dir = getNativeDir();
  const a = {
    runner: path.join(dir, 'runner.exe'),
    trackObj: path.join(dir, 'clearn_track.o'),
  };
  for (const [k, p] of Object.entries(a)) {
    if (!fs.existsSync(p)) throw new Error(`缺少判题组件 ${k}: ${p}，请先运行 npm run build:native`);
  }
  return a;
}
