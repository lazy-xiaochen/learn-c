# C 语言学习平台

面向**零基础学习者**的桌面版 C 语言学习应用：学 → 练 → 评 → 激励闭环，内置判题器（Windows Job Object 沙箱 + AddressSanitizer/UBSan + 内存泄漏检测），不联网、不监听任何端口。

课程按 7 个阶段组织，共 129 个知识点，目标是把一个零基础学习者带到"能参加 C 语言岗位技术面试"的水平。

## 已有功能

- **学**：知识点页面左侧是阶段/知识点树，正文是可交互讲解；每个代码块都能**直接在页内编辑并运行**，编译错误会标在编辑器对应行、点击可跳转。
- **练**：CodeMirror 6 编辑器（C 语法高亮、关键字与标准库补全、Tab 缩进、行号、错误行标记），`Ctrl+Enter` 运行、`Ctrl+Shift+Enter` 提交。
- **评**：判题结果分 AC / WA / TLE / MLE / RE / CE / UB / LEAK；显示每组用例的通过情况（隐藏用例只显示"第 N 组 + 类别"）、编译错误中文解释、sanitizer 报告摘要、内存泄漏位置、静态隐患扫描（未检查 malloc 返回值、未检查 scanf 返回值、gets、`%s` 无宽度、realloc 自赋值、未初始化变量、释放后使用、条件里误用 `=` 等）。
- **激励**：XP（知识点 +10；题目首次 AC 按 L1–L5 加 20/40/70/120/200，一次通过再 +50%）、连续学习天数、阶段徽章、L5"面试级通过"标识、热力图、阶段完成度环。不做排行榜。
- **进度**：知识点状态（未开始/学习中/已掌握）、下一题推荐（按难度+课程顺序）、个人提交通过率。
- **编译台**：顶部导航里的独立页面，随便写一段 C 就能编译运行、看输出；自带 4 个示例片段（你好世界 / 读入两个数 / 数组与循环 / 指针交换），代码和输入自动存在本机，`Ctrl+Enter` 运行。与课程、题库共用同一套沙箱限制，只是不判对错、不计经验值。
- **欢迎页**：首次启动弹出欢迎弹窗（写给初学者的一段话 + 署名），可勾选"启动时不再显示"；点「开始学习」直接进入第一节。
- **界面**：暗色优先的"专注工作台"，支持亮色切换并持久化；1440px 三栏、1024px 两栏、768px 以下单栏 + 结果底部弹出。

## 环境要求

- **Windows 10/11（x64）**。判题沙箱基于 Windows Job Object 与低完整性级别，目前不支持 macOS/Linux。
- 开发需要 **Node.js ≥ 20**；终端里请用 `npm.cmd`（本机 PowerShell 禁止运行 `npm.ps1`）。

## 首次安装

```powershell
npm.cmd install
```

Electron 的二进制包通过仓库根目录 `.npmrc` 里的 npmmirror 镜像下载。

**准备编译工具链**（不上传到仓库，需自行下载）：

1. 下载 **llvm-mingw ucrt x86_64** 版本（必须带 `ucrt`；msvcrt 版没有 AddressSanitizer 运行库）。
2. 解压到仓库根目录的 `toolchain/`，最终路径形如
   `toolchain/llvm-mingw-20261117-ucrt-x86_64/bin/clang.exe`。
   程序会按 `CLEARN_TOOLCHAIN` 环境变量 → 打包资源目录 → `toolchain/` 的顺序查找。
3. 编译判题沙箱：

```powershell
npm.cmd run build:native
```

4. 生成内容构建产物（首次必须执行一次）：

```powershell
npm.cmd run content:build
```

## 启动

- **给普通用户**：双击根目录的 `start.cmd`（会先构建界面再打开窗口）。
- 命令行：`npm.cmd start`
- 开发模式（Vite 热更新）：`npm.cmd run dev`

## 打包安装包（发给别人用）

```powershell
npm.cmd run dist
```

产物：项目**上一级**目录下的 `c-learn-release\c-learn-<版本>-setup.exe`（本机是 `D:\c-learn-release\c-learn-0.1.0-setup.exe`），当前版本约 **190 MB**。

- **按用户安装**（默认装到 `%LOCALAPPDATA%\Programs\C-Learn`），不需要管理员权限，适合发给不会编程的朋友；
- 精简版编译器工具链（347 MB，只保留 x86_64 的 C 编译所需部分）和全部 129 个知识点/200 道题都打进包内，**对方不需要安装任何编译器，也不需要联网**；
- 首次构建会从 npmmirror 下载 Electron 与 NSIS 工具（命令里已设 `ELECTRON_MIRROR` / `ELECTRON_BUILDER_BINARIES_MIRROR`）；
- 输出目录在项目**上一级**（不往仓库里塞 190MB 产物）；在 DSH 沙箱开发环境里这也是必需的：工作区带低完整性标签，新生成的 exe 在项目内无法写临时文件，NSIS 打包最后一步会失败；
- **没有代码签名**，别人首次运行会看到 Windows SmartScreen 提示，点"更多信息 → 仍要运行"即可。

## 测试与校验

| 命令 | 作用 |
|---|---|
| `npm.cmd run test:judge` | 判题器端到端测试（27 项：AC/WA/CE/TLE/MLE/RE/UB/LEAK、安全、沙箱、文件题、函数题等） |
| `npm.cmd run test:server` | 后端规则测试（6 项：XP、隐藏用例不泄露、客观题判分、并发提交、持久化、非法请求） |
| `npm.cmd run selftest` | 驱动真实窗口做界面自检（10 项），截图在 `.tmp/shots/` |
| `npm.cmd run content:verify` | **真实编译运行**全部内容：每段示例代码、每道题的参考代码与"常见错误"代码 |
| `node scripts/content/build.mjs --verify --only s2-` | 只校验某个阶段/知识点，带缓存 |

## 目录结构

```
app/            Vue 3 界面（views / components / editor / stores / styles）
electron/       主进程与 preload（窗口、IPC 转发、导航限制）
server/         后端服务（内容、学习记录、进度、判题）
server/judge/   判题核心：编译、沙箱运行、输出比对、诊断、安全、静态扫描
native/         runner.c（Job Object 沙箱）、clearn_track.c（malloc/free 统计）
content/        curriculum.json（129 个知识点）、lessons/、problems/、build/（构建产物）
scripts/        内容构建与校验、原生组件编译、开发与自检脚本
tests/          judge / server / ui 三套测试
docs/           需求原文、进度、内容格式、覆盖报告
toolchain/      编译工具链（需自行下载，不纳入版本库）
```

## 内容编写

内容用 Markdown 编写，格式见 [docs/CONTENT-SCHEMA.md](docs/CONTENT-SCHEMA.md)：

- `content/lessons/<知识点id>.md`：讲解 + 可运行代码块 + 内存图 + 客观题
- `content/problems/<阶段>/<题目id>.md`：题目描述、示例、三层提示、参考代码、初始代码、常见错误、测试用例

结构校验与真实运行校验都由 `scripts/content/build.mjs` 完成，写错会直接报出来。

## 数据存放

学习记录写在 `%APPDATA%\c-learn\progress.json`（先写临时文件再改名，损坏时保留副本）。
设置环境变量 `CLEARN_DATA_DIR` 可以把数据目录改到别处（界面自检就是这么隔离的）。

## 已知限制

- 仅支持 Windows。
- 安装包可以自己构建（`npm.cmd run dist`），但**没有代码签名**，别人首次运行安装包时 Windows SmartScreen 会提示。
- 学习记录只存在本机，没有账号与云同步。
- 若从 Electron 应用内置终端启动（环境里带 `ELECTRON_RUN_AS_NODE=1`），需要先清掉这个变量，否则 Electron 会退化成纯 Node 而起不来。

## 许可

MIT，见 [LICENSE](LICENSE)。随项目分发的第三方组件（Electron/Chromium、llvm-mingw 工具链、Vue、CodeMirror、markdown-it 等）的许可与文本位置见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。
