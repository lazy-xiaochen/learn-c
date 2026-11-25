---
id: s6-conditional-compile
---

## 讲解

### 条件编译是"整段代码的删除"，发生在编译之前
`#if` 系列指令和普通 `if` 最大的差别是**阶段**：普通 `if` 是运行时的分支，两边的代码都要编译进程序；`#if` 是**预处理阶段的分支**，预处理器只把命中的那一段留下，其余的行**直接从交给编译器的文本里删掉**。

这带来两个后果：

- 被删掉的分支里可以写**当前平台根本不支持的代码**（比如 Windows 的 `#include <windows.h>` 放在 `#ifdef _WIN32` 里，Linux 编译时这段根本不存在，不会报"找不到头文件"）；
- 被删掉的分支**不参与编译**，所以语法错误、类型错误、未定义符号都不会被发现——反过来，这也意味着"某个分支从来没被编译过"是常见的事故来源。

跨平台的本质就是：**一份源码里放多套实现，用宏挑出当前平台的那一套**。编译器永远只看一套，所以它能通过语法检查；预处理器保证挑的那套是对的。

```c run id=cc-platform
#include <stdio.h>

int main(void) {
#if defined(_WIN32)
    const char *os = "Windows";
#elif defined(__linux__)
    const char *os = "Linux";
#elif defined(__APPLE__)
    const char *os = "macOS";
#else
    const char *os = "未知平台";
#endif

#if defined(_WIN64)
    const char *arch = "64 位";
#else
    const char *arch = "32 位";
#endif

    printf("platform = %s, %s\n", os, arch);
    return 0;
}
```
```output
platform = Windows, 64 位
```

这段代码在 Linux 上编译会打印 `Linux, 64 位`（`__linux__` 由编译器预定义）——同一份源码，不同平台保留不同的行。`_WIN32`、`__linux__`、`__APPLE__` 这些宏都是**编译器预先定义好的**，不需要 `#include` 任何头文件。本平台是 x86-64 Windows + Clang，所以 `_WIN32` 和 `_WIN64` 都成立。

### `#ifdef` 与 `#if`：一个看"有没有定义"，一个看"值是多少"
这两组写法经常被混用：

| 写法 | 判断依据 | 典型用途 |
|---|---|---|
| `#ifdef X` / `#ifndef X` | `X` **有没有被定义**（不管值是多少） | 头文件卫士、判断平台宏是否存在 |
| `#if X` | `X` 展开后的**值是否非零**（未定义时按 `0` 处理） | 开关（`#define DEBUG 0/1`）、版本比较 |
| `#if defined(X)` | 和 `#ifdef X` 等价，但能参与 `&&`、`||` | 组合条件 |

最容易踩的坑是：`#define DEBUG 0` 之后 `#ifdef DEBUG` **依然成立**。想把调试输出关掉，必须用 `#if DEBUG`，而不是 `#ifdef DEBUG`：

```c run id=cc-ifdef-vs-if
#include <stdio.h>

#define DEBUG 0          /* 想关闭调试输出：值是 0，但名字仍然"有定义" */

int main(void) {
#ifdef DEBUG
    printf("#ifdef DEBUG 成立：它只看名字有没有定义\n");
#endif
#if DEBUG
    printf("#if DEBUG 成立：值非零\n");
#else
    printf("#if DEBUG 不成立：DEBUG 的值是 0\n");
#endif
    return 0;
}
```
```output
#ifdef DEBUG 成立：它只看名字有没有定义
#if DEBUG 不成立：DEBUG 的值是 0
```

还有一个相关规则：`#if` 里出现**未定义的标识符**时不报错，而是当成 `0`。所以 `#if FEATURE_X` 在 `FEATURE_X` 没定义时安静地走 `#else` 分支——功能"莫名其妙没生效"时，先确认那个宏到底有没有定义。

### 调试开关、日志级别与 `#if 0`
条件编译最常见的三个用途：

1. **调试开关**：`#ifdef DEBUG` 包住调试输出；
2. **日志级别**：用数值比较决定编译哪几级日志，发布版本直接不生成调试日志的代码；
3. **注释大段代码**：`#if 0 ... #endif` 比 `/* */` 安全，因为代码里本来就有 `/* */` 嵌套的注释时不会打架。

```c run id=cc-loglevel
#include <stdio.h>

#define LOG_LEVEL 2      /* 0=静默 1=只报错 2=错误+信息 3=全部 */

static void log_error(const char *m) {
    printf("[E] %s\n", m);
}

#if LOG_LEVEL >= 2
static void log_info(const char *m) {
    printf("[I] %s\n", m);
}
#endif

#if LOG_LEVEL >= 3
static void log_debug(const char *m) {
    printf("[D] %s\n", m);
}
#endif

int main(void) {
    log_error("磁盘快满了");
#if LOG_LEVEL >= 2
    log_info("已写入 3 个文件");
#endif
#if LOG_LEVEL >= 3
    log_debug("内部状态 = ok");
#endif
    return 0;
}
```
```output
[E] 磁盘快满了
[I] 已写入 3 个文件
```

把 `LOG_LEVEL` 改成 3 会多一行 `[D]`，改成 1 则 `log_info` 连**函数都不会被编译出来**（定义在 `#if` 里面），发布版本里不存在这段代码，也就不占体积、不会有"忘了关日志"的性能问题。这就是条件编译相对"运行时 if"的价值：**运行时 if 只省执行，条件编译还省代码**。

配置写错了怎么办？用 `#error` 在预处理阶段直接拦下来，比运行到一半发现不对好得多：

```c
#define LOG_LEVEL 5

#if LOG_LEVEL > 3
#error "LOG_LEVEL 只能是 0..3"
#endif
```

`#error` 后面的文字会原样出现在编译输出里，这是给自己和同事留提示的好地方。

### 为什么"全工程的分支必须一致"
条件编译的开关是**按翻译单元**生效的：每个 `.c` 文件（连同它包含的头文件）单独预处理，宏在哪个文件里定义、定义成什么值，只影响这个文件。于是出现了一个非常隐蔽的事故模式：

```
stat.c  里 #define STAT_WIDE 1，然后定义 long long stat_sum(...)
main.c  里没有 STAT_WIDE，看到的声明是 int stat_sum(...)
```

两个文件各自都能编译（C 不检查跨文件的类型一致性），但它们的"世界观"不同：一个以为返回值是 64 位，一个按 32 位去读——**声明与定义不匹配**，链接期可能报错，运行期可能悄悄算错。本节的题目就是让你修这种工程。

避免它的办法只有一条：**开关只在一个地方定义，而且那个地方是所有 `.c` 都会包含的头文件**。

```c
/* config.h —— 开关的唯一住处 */
#ifndef CONFIG_H
#define CONFIG_H

#ifndef USE_WIDE          /* 允许用 -DUSE_WIDE=0 覆盖 */
#define USE_WIDE 1
#endif

#if USE_WIDE
typedef long long acc_t;
#define ACC_FMT "%lld"
#else
typedef int acc_t;
#define ACC_FMT "%d"
#endif

acc_t acc_sum(const int *a, int n);

#endif
```

这样 `#include "config.h"` 的每个文件看到的 `acc_t`、`ACC_FMT`、`acc_sum` 的声明都是同一套。命令行 `-DUSE_WIDE=0` 也是**对所有源文件同时生效**的，不会出现"只改了一个文件"的情况。

`#if` 里还可以做编译器/标准版本判断，比如"支持 C11 就用 `_Static_assert`"，这类判断同样必须写在公共头文件里才安全：

```c
#if defined(__STDC_VERSION__) && __STDC_VERSION__ >= 201112L
#define HAVE_STATIC_ASSERT 1
#else
#define HAVE_STATIC_ASSERT 0
#endif
```

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra main.c -o main
./main

clang -std=c17 -Wall -Wextra main.c -o main
./main
```

条件编译的开关通常从命令行传进来，这样同一份源码能编出不同配置：

```bash
# 打开调试开关：源码里写 #ifdef DEBUG 的地方被保留
gcc -std=c17 -Wall -Wextra -DDEBUG=1 main.c -o main_debug

# 关闭：命令行给 0
gcc -std=c17 -Wall -Wextra -DDEBUG=0 main.c -o main_release

# 取消源码里已经定义的宏
gcc -std=c17 -Wall -Wextra -UDEBUG main.c -o main
```

看"到底哪个分支活下来了"，最直接的办法还是 `-E`：

```bash
# 预览预处理结果：被排除的分支整段消失
gcc -E -P main.c | grep -n "log_" 

# 看看某个宏在这个文件里有没有定义、定义成什么
gcc -dM -E main.c | findstr LOG_LEVEL
```

几个实践建议：

- `#if` 里的宏名尽量用 `#if defined(X)` 的写法，可读性比 `#ifdef` 好，而且能组合条件；
- 每个 `#if` 都配一个 `#endif`，并且在 `#endif` 后面写注释（`#endif /* LOG_LEVEL >= 2 */`），嵌套多层时能救命；
- 发布版本一定要用 `-D` 把调试开关关掉，别指望"运行时 if"来做；
- 多平台工程里，平台相关的 `#if` 尽量集中在少数几个头文件里，别散落在业务代码中。

## 常见错误

### 用 `#ifdef` 判断一个"值为 0"的开关
`#define DEBUG 0` 之后 `#ifdef DEBUG` 依然为真——`#ifdef` 只问"有没有定义"。想按值开关，就必须统一用 `#if DEBUG`；反过来，如果全工程都用 `#ifdef`，那么开关只能"定义/不定义"两种状态，不能用 `0` 表示关闭。

```c run id=cc-mistake-ifdef
#include <stdio.h>

#define VERBOSE 0

int main(void) {
#ifdef VERBOSE
    printf("这段代码还是被编译了\n");
#endif
#if VERBOSE
    printf("这段不会出现\n");
#else
    printf("VERBOSE 的值是 0，所以走这里\n");
#endif
    return 0;
}
```
```output
这段代码还是被编译了
VERBOSE 的值是 0，所以走这里
```

### 忘了 `#endif`
条件指令必须成对。嵌套三层时少一个 `#endif`，报错信息只会指向文件的**最后一行**，很难定位：

```c run id=cc-noendif expect=CE
#include <stdio.h>

#if 1
int main(void) {
#if 1
    printf("hi\n");
    return 0;
}
#endif
```

报错是 `unterminated conditional directive`，指在文件末尾——找不到漏掉的是哪一层时，按缩进把 `#if` 和 `#endif` 配对一遍。

### 在 `#if` 里比较字符串或调用函数
`#if` 只认识整数常量和宏，不能比较字符串、不能调用函数、不能用 `sizeof`：

```c run id=cc-badexpr expect=CE
#include <stdio.h>

#define NAME "debug"

int main(void) {
#if NAME == "debug"
    printf("debug 模式\n");
#endif
    return 0;
}
```

报错类似 `token is not a valid binary operator in a preprocessor subexpression`。`#if` 的世界里只有整数：要按名字分支，得用 `#define MODE_DEBUG 1` 这类整数开关。

### 只在某一个 `.c` 里定义开关
这是本节题目里的事故：`stat.c` 顶部写了 `#define STAT_WIDE 1`，`main.c` 没有，于是两个文件对 `stat_sum` 的声明**不一样**。轻则链接期报错，重则运行期算错，而且编译单个文件时完全看不出问题。

判断方法：把开关相关的 `#define` 全部搜一遍，确认它只出现在**一个头文件**里，并且所有 `.c` 都包含这个头文件。命令行 `-D` 是安全的，因为它对所有翻译单元同时生效。

## 客观题

### q-s6-conditional-compile-1 single
某文件的配置写的是 `#define DEBUG 0`，代码里同时有 `#ifdef DEBUG` 和 `#if DEBUG`。下面说法正确的是：

- [x] `#ifdef DEBUG` 成立（名字有定义），`#if DEBUG` 不成立（值为 0）
  > 正确。`#ifdef` 只判断标识符有没有被定义，与值无关；`#if` 会把宏展开后当整数表达式求值，`0` 为假。想把"值为 0 的调试开关"关掉，必须用 `#if DEBUG`，否则它永远是"开"的。
- [ ] 两个都不成立，因为 `DEBUG` 的值是 0
  > 错。`#ifdef` 不看值，只看"有没有定义"。这正是 `#define DEBUG 0` 之后 `#ifdef DEBUG` 里的代码仍然会被编译的原因。
- [ ] `#ifdef DEBUG` 不成立，`#if DEBUG` 成立
  > 错。`#if DEBUG` 展开成 `#if 0`，是假；而 `DEBUG` 明明已经定义，`#ifdef` 必然成立。两者恰好相反。
- [ ] 两个都成立，因为 `DEBUG` 被定义了
  > 错。`#if` 会求值：`#if 0` 为假。只有 `#ifdef` 才只看"有没有定义"。顺带一提，`#if` 里出现**未定义**的标识符时按 0 处理（不报错），所以 `#if FEATURE_X` 在 `FEATURE_X` 没定义时也会安静地走 `#else`。
