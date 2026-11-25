// 用内置工具链编译判题原生组件：runner.exe（沙箱）与 clearn_track.o（内存跟踪）。
// 产物输出到 native/build/。
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { getToolchain, PROJECT_ROOT } from '../server/judge/paths.js';

const tc = getToolchain();
const src = path.join(PROJECT_ROOT, 'native');
const out = path.join(src, 'build');
fs.mkdirSync(out, { recursive: true });

function clang(args) {
  console.log('> clang ' + args.join(' '));
  execFileSync(tc.clang, args, { stdio: 'inherit', cwd: src });
}

clang(['-std=c17', '-O2', '-Wall', '-Wextra', '-Werror', '-municode', 'runner.c', '-ladvapi32', '-o', path.join(out, 'runner.exe')]);

// clearn_track.o 不加 sanitizer 插桩：它只做记账，真正的 malloc/free 仍由 ASan 运行时接管。
// 它通过链接参数 --wrap 接入，学习者的源代码不做任何修改。（早先用 -include 注入头文件，
// 会顺带替学习者包含 <stdlib.h>，掩盖了"忘记包含头文件"的错误。）
clang(['-std=c17', '-O2', '-Wall', '-Wextra', '-Werror', '-c', 'clearn_track.c', '-o', path.join(out, 'clearn_track.o')]);
fs.rmSync(path.join(out, 'clearn_track.h'), { force: true }); // 旧版本遗留
console.log('native 组件已生成：' + out);
