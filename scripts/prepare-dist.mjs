// 为打包准备"精简版"编译工具链：只保留 x86_64 的 C 编译所需部分。
// 输出到 build/toolchain/<原目录名>，供 electron-builder 的 extraResources 使用。
//
// 原版 718MB 里约 480MB 是别的架构（aarch64/armv7/i686）、clangd/lldb、Python、C++ 头文件，
// 本应用只编译 C，因此全部剔除。精简后约 320MB，已用判题器 27 项测试验证可用。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_ROOT = path.join(ROOT, 'toolchain');
const OUT_ROOT = path.join(ROOT, 'dist-toolchain');

/** bin 里实际会用到的文件；'.dll' 全部保留 */
const BIN_FILES = [
  'clang.exe',
  'clang-23.exe',
  'clang-target-wrapper.exe',
  'ld.lld.exe',
  'llvm-symbolizer.exe',
  'libclang_rt.asan_dynamic-x86_64.dll',
];

const SKIP_INCLUDE_DIRS = new Set(['c++', 'ddk', 'GL']);

function findToolchain() {
  if (!fs.existsSync(SRC_ROOT)) throw new Error(`找不到 toolchain 目录：${SRC_ROOT}`);
  const hit = fs.readdirSync(SRC_ROOT).filter((n) => /^llvm-mingw-.*-ucrt-x86_64$/.test(n)).sort().reverse()[0];
  if (!hit) throw new Error('toolchain/ 下没有 llvm-mingw-*-ucrt-x86_64');
  return hit;
}

function copyDir(from, to, skipDir = () => false) {
  fs.mkdirSync(to, { recursive: true });
  for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, ent.name);
    const d = path.join(to, ent.name);
    if (ent.isDirectory()) {
      if (skipDir(ent.name)) continue;
      copyDir(s, d, skipDir);
    } else {
      copyFile(s, d);
    }
  }
}

/**
 * 用"读出来再写"的方式复制：直接 copyFileSync 会把源文件在 Windows 上的安全描述符
 * 一起带过来，导致复制出来的 clang 运行时无法写临时文件（实测 "Permission denied"）。
 * 自己写新文件则会继承目标目录的正常权限。
 */
function copyFile(s, d) {
  fs.writeFileSync(d, fs.readFileSync(s));
}

function main() {
  const name = findToolchain();
  const src = path.join(SRC_ROOT, name);
  const out = path.join(OUT_ROOT, name);

  fs.rmSync(OUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, 'bin'), { recursive: true });

  // bin：指定文件 + 全部 dll + 全部 cfg
  const binDir = path.join(src, 'bin');
  for (const ent of fs.readdirSync(binDir, { withFileTypes: true })) {
    if (!ent.isFile()) continue;
    const n = ent.name.toLowerCase();
    if (BIN_FILES.includes(ent.name) || n.endsWith('.dll') || n.endsWith('.cfg')) {
      copyFile(path.join(binDir, ent.name), path.join(out, 'bin', ent.name));
    }
  }
  // 有些构建里 `ld` 是个同名包装；统一再放一份 ld.exe 保证链接器可被找到
  const lld = path.join(binDir, 'ld.lld.exe');
  if (fs.existsSync(lld)) copyFile(lld, path.join(out, 'bin', 'ld.exe'));

  // clang 的内建头文件与 sanitizer / builtins 运行库
  copyDir(path.join(src, 'lib', 'clang', '23', 'include'), path.join(out, 'lib', 'clang', '23', 'include'));
  copyDir(path.join(src, 'lib', 'clang', '23', 'lib', 'windows'), path.join(out, 'lib', 'clang', '23', 'lib', 'windows'));

  // mingw-w64 C 头文件（排除 C++ / ddk / GL）
  copyDir(path.join(src, 'include'), path.join(out, 'include'), (n) => SKIP_INCLUDE_DIRS.has(n));

  // x86_64 的导入库与启动对象
  copyDir(path.join(src, 'x86_64-w64-mingw32', 'lib'), path.join(out, 'x86_64-w64-mingw32', 'lib'));

  let bytes = 0;
  const walk = (p) => {
    for (const ent of fs.readdirSync(p, { withFileTypes: true })) {
      const f = path.join(p, ent.name);
      if (ent.isDirectory()) walk(f);
      else bytes += fs.statSync(f).size;
    }
  };
  walk(out);
  console.log(`trimmed toolchain -> ${out}`);
  console.log(`size: ${(bytes / 1024 / 1024).toFixed(1)} MB`);
}

main();
