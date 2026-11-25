# 第三方组件与许可

本项目的**源代码**以 MIT 许可发布，见仓库根目录的 [LICENSE](LICENSE)。

下面是随项目一起分发（或用于编译、运行、构建）的第三方组件及其许可。发布安装包时请一并保留对应的许可文本。

## 1. 随应用一起分发

| 组件 | 版本 | 许可 | 许可文本位置 |
|---|---|---|---|
| Electron | ^45.4.1 | MIT | `node_modules/electron/LICENSE` |
| Chromium（Electron 内置） | 随 Electron | BSD-3-Clause 及多个第三方许可 | `node_modules/electron/dist/LICENSES.chromium.html` |
| Node.js（Electron 内置运行时） | 随 Electron | MIT | 同上 |

## 2. 编译器工具链（`toolchain/`，不提交到仓库，发布时若打进 resources 需一并保留许可）

| 组件 | 版本 | 许可 | 许可文本位置 |
|---|---|---|---|
| llvm-mingw（Clang / LLD / LLVM 运行库） | 20261117（Clang 23.1.6） | Apache-2.0 WITH LLVM-exception | `toolchain/llvm-mingw-<版本>-ucrt-x86_64/LICENSE.TXT` |
| libc++ / libc++abi（C++ 标准库） | 随 llvm-mingw | Apache-2.0 WITH LLVM-exception | 同上 |
| MinGW-w64 头文件与运行库 | 随 llvm-mingw | 见各 COPYING 文件（含 ZPL / BSD 风格条款） | `toolchain/.../share/mingw32/COPYING.MinGW-w64*.txt`、`COPYING.winpthreads.txt`、`COPYING.winstorecompat.txt` |
| Python（llvm-mingw 附带的脚本工具） | 3.14 | PSF-2.0 | `toolchain/.../python/LICENSE.txt` |
| AddressSanitizer / UndefinedBehaviorSanitizer 运行库 | 随 llvm-mingw | Apache-2.0 WITH LLVM-exception | 同 LLVM 许可 |

> 判题器会调用 `clang`、`lld`、`llvm-symbolizer`，并在学习者程序运行时加载 `libclang_rt.asan_dynamic-x86_64.dll`。这些都属于上表的 LLVM 组件。

## 3. 前端依赖（构建后打进 `dist/`）

以下均为 **MIT** 许可，许可文本在各包的 `node_modules/<包名>/LICENSE*`：

- Vue 3、Vue Router、Pinia
- CodeMirror 6 系列：`@codemirror/*`、`@lezer/*`
- markdown-it

## 4. 构建与开发工具（不随应用分发）

- Vite、`@vitejs/plugin-vue`、Electron（构建期）：MIT
- Node.js（开发环境运行）：MIT

## 5. 说明

- 完整的传递依赖清单见 `package-lock.json`；每个包的具体许可文本在其 `node_modules/<包名>/` 目录下。
- Electron 的 Chromium 第三方许可清单非常长，已随 Electron 提供（`LICENSES.chromium.html`），**发布时不要删除**。
- 本项目没有引入任何 UI 组件库，前端界面与样式均为手写。
- 如果将来引入新的第三方库，请在同一张表里补充组件、版本、许可与文本位置。
