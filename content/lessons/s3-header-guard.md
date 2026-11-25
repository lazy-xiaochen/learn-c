---
id: s3-header-guard
---

## 讲解

### 头文件是"共享的声明"，不是共享的代码
多文件工程里，`main.c` 要调用 `stats.c` 里的函数，就必须先看到函数声明。把声明抄一份到 `main.c` 里当然也能编过，但一旦函数签名改了，两处就会不一致。头文件解决的正是这个问题：**声明只写一份，谁需要就 `#include` 谁**。

头文件的角色可以用一句话概括：它是"模块对外的合同"——函数声明、`extern` 变量声明、类型定义、宏常量。合同里不该出现"实现"，实现属于 `.c`。

### #include 是文本粘贴，粘贴两次就出现两次
`#include "stats.h"` 做的事情极其原始：预处理器把 `stats.h` 的内容**原样复制**到这一行所在的位置。所以同一个头文件被 `#include` 两次，它的内容就在同一个翻译单元里出现了两次。

重复出现本身不一定是错误，要看重复的是什么：

| 内容 | 重复出现 | 原因 |
|---|---|---|
| 函数声明 `int f(int);` | 合法 | 声明只是"承诺"，可以重复 |
| `extern int g;` 声明 | 合法 | 同上，不分配存储 |
| 完全相同的 `#define` | 合法 | 宏的值没变，重新定义一遍没有区别 |
| 函数**定义** `int f(int x) { ... }` | 错误 | 同一个 TU 里一个函数只能有一份函数体 |
| 变量**定义** `int g = 0;` | 错误 | 同一个 TU 里一个对象只能有一份存储 |
| `struct` / `enum` 的定义 | 错误 | 同一个 TU 里类型只能定义一次 |
| `#define` 但值不同 | 警告（后者覆盖） | 编译器能编译，但值被悄悄改掉了，更危险 |

先看一段"可以重复"的代码，它模拟了同一个头文件被贴两次、但里面只有声明和宏：

```c run id=guard-decl-ok
#include <stdio.h>

/* ---------- 模拟第一次包含 stats.h ---------- */
int twice(int x);              /* 函数声明：重复没问题 */
#define LIMIT 10               /* 宏：完全相同的重复定义也允许 */

/* ---------- 模拟第二次包含 stats.h ---------- */
int twice(int x);              /* 再来一遍：还是没问题 */
#define LIMIT 10

int twice(int x) {             /* 定义只出现一次 */
    return 2 * x;
}

int main(void) {
    printf("twice(5) = %d, LIMIT = %d\n", twice(5), LIMIT);
    return 0;
}
```
```output
twice(5) = 10, LIMIT = 10
```

### 没有卫士时：定义被贴两次，编译直接失败
把上面的头文件内容换成"函数定义"，第二次粘贴就是一场事故：

```c run id=guard-missing expect=CE
#include <stdio.h>

/* ---------- 模拟第一次包含 util.h ---------- */
int twice(int x) {
    return 2 * x;
}

/* ---------- 模拟第二次包含 util.h ---------- */
int twice(int x) {             /* 错误：redefinition of 'twice' */
    return 2 * x;
}

int main(void) {
    printf("%d\n", twice(5));
    return 0;
}
```

编译器的报错是 `error: redefinition of 'twice'`，还会贴心地指出"上一次定义在这里"。头文件里出现函数定义、变量定义、`struct` 定义时，被两个头文件交叉包含就一定会走到这一步。**头文件卫士就是用来防这个的。**

### 卫士的三段式结构
```c
#ifndef STATS_H          /* 第一次进来：STATS_H 还没定义，条件成立 */
#define STATS_H          /* 立刻定义它，把"我来过了"记下来 */

/* 头文件的全部内容都放在这里 */

#endif                   /* 习惯上在 #endif 后面写注释：/* STATS_H */ */
```

工作原理只有一句话：**第二次粘贴时 `#ifndef STATS_H` 不成立，整段内容被预处理器直接丢掉**，编译器根本看不到第二份定义。宏一旦定义，就会一直保留到这个翻译单元的末尾，所以第三次、第四次包含同样会被跳过。

下面用"同一段文字贴两遍"来模拟被包含两次的过程：

```c run id=guard-simulate
#include <stdio.h>

/* ---------- 模拟第一次包含 util.h ---------- */
#ifndef UTIL_H
#define UTIL_H
int twice(int x) {
    return 2 * x;
}
#endif

/* ---------- 模拟第二次包含 util.h：整段被跳过 ---------- */
#ifndef UTIL_H
#define UTIL_H
int twice(int x) {
    return 2 * x;
}
#endif

int main(void) {
    printf("twice(21) = %d\n", twice(21));
    return 0;
}
```
```output
twice(21) = 42
```

第二份 `twice` 看起来还在文件里，但它位于 `#ifndef` 的条件块中，预处理器展开时整块被删掉了。编译器看到的只有一个 `twice`。

`#ifndef X` / `#define X` 也可以写成等价的 `#if !defined(X)` / `#define X`，一些工程规范更喜欢后者（和 `#if defined(X) && ...` 的写法统一）：

```c run id=guard-if-defined
#include <stdio.h>

/* ---------- 模拟第一次包含 config.h ---------- */
#if !defined(CONFIG_H)
#define CONFIG_H
#define CONFIG_LIMIT 50
#endif

/* ---------- 模拟第二次包含 config.h：跳过 ---------- */
#if !defined(CONFIG_H)
#define CONFIG_H
#define CONFIG_LIMIT 999        /* 如果没有卫士，这行会把 50 悄悄改成 999 */
#endif

int main(void) {
    printf("CONFIG_LIMIT = %d\n", CONFIG_LIMIT);
    return 0;
}
```
```output
CONFIG_LIMIT = 50
```

顺便说一个容易被忽略的坑：宏的"重复定义"只是**警告**（`-Wmacro-redefined`），值不同时后一个会覆盖前一个。也就是说，没有卫士的头文件里如果有 `#define CONFIG_LIMIT 999`，程序照样能编译，只是行为被改掉了——这比编译错误更难查。函数定义、变量定义才会硬性报错。

### 卫士只在"一个翻译单元"里生效
这是最重要、也最容易被误解的一点：**头文件卫士不能防止多个 `.c` 之间的重复定义**。

卫士靠的是一个宏。宏的生命周期止于当前翻译单元的末尾，每编译一个 `.c`，预处理器都从零开始。所以：

- `main.c` 包含一次 `stats.h` → 宏 `STATS_H` 在 `main.c` 这个 TU 里被定义；
- `stats.c` 包含一次 `stats.h` → 这时是另一个 TU，宏 `STATS_H` 又从"未定义"开始，头文件内容照样被完整粘贴一遍。

如果 `stats.h` 里有一个函数定义或变量定义，那么 `main.o` 和 `stats.o` 各有一份，链接器看到两个全局符号，报 `duplicate symbol`。卫士一点忙都帮不上，因为两次编译是彼此独立的。

**结论：卫士保证"一个 TU 里不重复"，要保证"整个工程只有一份定义"，只能靠"头文件里只写声明，定义放进 `.c`"。** 这两件事必须一起做，缺一不可。

### 为什么 .h 里不能定义变量
定义和声明的区别，在链接层面就是"要不要产生一个全局符号"：

- `extern int g_limit;` 只产生一个"待填地址"的引用（`nm` 里是 `U`），不分配存储；
- `int g_limit = 100;` 分配存储并产生一个全局符号（`nm` 里是 `D` 或 `B`）。

头文件会被粘贴进每一个包含它的 `.c`。所以把定义写进头文件，等于让每个 `.c` 都造一个 `g_limit`：三个 `.c` 就三份存储、三个同名全局符号，链接器只能报重复定义。更糟的是，如果你用 `static` 藏起来让它能链接，那么每个 `.c` 拿到的是**各自的副本**，`main.c` 改了 200，`stats.c` 里读到的还是 100——共享状态静默分裂，这种 bug 极难查。

```c run id=guard-var-twice expect=CE
#include <stdio.h>

/* ---------- 模拟头文件里的变量定义被包含两次 ---------- */
int g_limit = 100;

int g_limit = 100;               /* 错误：redefinition of 'g_limit' */

int main(void) {
    printf("%d\n", g_limit);
    return 0;
}
```

正确做法永远是同一个套路：**头文件里 `extern` 声明，某一个 `.c` 里写唯一的一份定义**。常量如果只是编译期数值，用 `#define` 或 `enum` 更省事（宏和枚举常量不占存储，也不产生符号）。

### 头文件里到底该放什么
| 放 | 不放 |
|---|---|
| 函数声明（原型） | 函数定义（除非是 `static inline` 的小工具） |
| `extern` 变量声明 | 变量定义（`int g = 0;`、`const int N = 5;`） |
| `struct`、`union`、`enum`、`typedef` 定义 | `main` 函数 |
| 宏常量、宏函数 | `using namespace` 之类 C++ 的东西 |
| 必要的 `#include`（让头文件自包含） | 依赖"调用者已经包含过某个头文件"的假设 |

"自包含"值得单独说一句：如果头文件里用了 `size_t`，就应该自己 `#include <stddef.h>`；用了 `FILE *`，就应该自己 `#include <stdio.h>`。否则包含顺序一变就编译失败——这类报错往往出现在别人的 `.c` 里，看起来和你毫无关系。

### #pragma once、循环包含与命名规范
`#pragma once` 是给编译器的非标准指令："这个文件只展开一次"。GCC、Clang、MSVC 都支持，而且写起来短；但它是扩展，标准 C 只认卫士。两种写法不要混着用，工程里统一一种即可。卫士还有一个 `#pragma once` 没有的好处：你可以用宏名表达"这个模块已经被引入过"，也便于阅读时判断包含关系。

循环包含（`a.h` 包含 `b.h`，`b.h` 又包含 `a.h`）在有卫士时不会死循环，但会有一边的类型不完整——通常是设计问题，需要把公共部分抽出来，或者用前置声明（第 4 阶段讲结构体时细谈）。

卫士宏的命名约定：用"工程名_文件名_H"的全大写形式，比如 `STATS_H`、`MYAPP_CONFIG_H`。不要用下划线加大写字母开头（`_STATS_H`），那类名字是留给标准库和编译器的。

## 编译与运行

```bash
# 多文件工程：所有 .c 一起编译，头文件通过 #include 自动加入
gcc -std=c17 -Wall -Wextra main.c stats.c -o app
./app

# 头文件不在当前目录时用 -I 指定搜索路径
gcc -std=c17 -Wall -Wextra -Iinclude main.c stats.c -o app

# 只看预处理结果：确认头文件被展开了几次、卫士有没有生效
gcc -E main.c | grep -c 'int twice'

# 打印包含树（谁包含了谁），排查"重复包含"最直接
gcc -H -c main.c
```

本平台使用 Clang，命令等价：

```bash
clang -std=c17 -Wall -Wextra main.c stats.c -o app
clang -E main.c
clang -H -c main.c
```

几个排查头文件问题的常用手段：

- `-H`：打印每个被包含的文件（一层缩进一层），能立刻看出同一个头文件是不是被包含了两次；
- `-E`：把预处理结果打到标准输出，直接搜你的函数名出现了几次；
- `-Wundef`：`#if UNDEFINED_MACRO` 里用了未定义的宏时警告（默认它只是被当成 0，很容易写错卫士却毫无察觉）；
- `-Wmacro-redefined`（默认就开启，不用额外加开关）：宏被重定义时提醒你，这往往是卫士失效的信号。

## 常见错误

### 卫士的宏名前后不一致 [CE]
`#ifndef STATS_H` 配 `#define STATS_H_`（多了一个下划线），或者 `#define STATS_H` 写成 `#define STATS_H 1` 却在另一处写成 `#ifndef STATS_H1`。结果就是卫士完全失效，第二次包含照样展开：

```c run id=err-guard-typo expect=CE
#include <stdio.h>

/* ---------- 模拟第一次包含 ---------- */
#ifndef STATS_H
#define STATS_H_
int twice(int x) { return 2 * x; }
#endif

/* ---------- 模拟第二次包含：卫士失效，又展开了一次 ---------- */
#ifndef STATS_H
#define STATS_H_
int twice(int x) { return 2 * x; }      /* redefinition of 'twice' */
#endif

int main(void) {
    printf("%d\n", twice(21));
    return 0;
}
```

记住：卫士的宏名是"约定的记号"，`#ifndef` 和 `#define` 必须**逐字相同**。

### 以为加了卫士就不会有重复定义 [CE]
卫士只在单个翻译单元内生效。头文件里如果有函数定义或变量定义，即使卫士写得完全正确，`main.c` 和 `stats.c` 各展开一次，链接时仍然 `duplicate symbol`。**卫士解决"同一文件重复包含"，`extern` + 单一 `.c` 定义解决"多个 TU 重复定义"。**

### 头文件里定义变量，靠 static 让它"能链接" [OK]
```c
/* config.h */
static int g_limit = 100;     /* 能编译、能链接，但每个 .c 各有一份 */
```
这样确实不报错了，可 `main.c` 把 `g_limit` 改成 200，`stats.c` 读到的仍然是 100。共享状态必须用"头文件 `extern` 声明 + 一个 `.c` 定义"。

### 头文件里用了某个类型却没包含对应的头文件 [CE]
头文件里出现 `size_t`、`FILE *`、`int32_t` 却没 `#include <stddef.h>` / `<stdio.h>` / `<stdint.h>`，于是它能不能编译取决于"调用者先包含了什么"。这种错误在 `main.c` 里可能不出现、在 `stats.c` 里出现，看起来毫无道理。**自己的头文件自己负责自包含。**

### 卫士只包住了一半的内容 [CE]
`#ifndef` 写在了第 10 行，前 9 行的 `#include` 和宏在卫士外面；或者 `#endif` 提前收尾，后面又写了几行声明。只要有任何一行在卫士外面，它就会被重复展开。**卫士必须包住头文件的全部内容，第一行就是 `#ifndef`。**

## 客观题

### q-s3-header-guard-1 single
`stats.h` 里加了完整的头文件卫士（`#ifndef STATS_H` / `#define STATS_H` / `#endif`），但里面写了一个**函数定义** `int twice(int x) { return x * 2; }`。`main.c` 和 `stats.c` 都 `#include "stats.h"`，然后一起链接。结果是？

- [x] 每个 `.c` 各展开一份 `twice` 的定义，链接时报重复定义（`duplicate symbol: twice`）
  > 正确。卫士只能保证"同一个翻译单元内不重复展开"，而 `main.c`、`stats.c` 是两个独立的翻译单元，各自都会完整展开一次 `stats.h`。两份全局函数定义碰在一起，链接器只能报错。
- [ ] 编译失败：`redefinition of 'twice'`
  > 那是同一个 TU 里包含了两次才会发生的错误（比如 `main.c` 同时包含了 `stats.h` 和另一个又包含了 `stats.h` 的头文件）。这里两个 `.c` 各自只包含一次，编译都能通过，问题留到链接阶段。
- [ ] 正常：卫士会自动把两份定义合并成一份
  > 卫士是纯文本层面的条件编译，它不产生任何符号、也不参与链接，没有任何"合并"能力。
- [ ] 编译失败：头文件里不允许出现函数定义
  > C 语法上完全允许在头文件里写函数定义（有些库就用这种"头文件即实现"的写法）。问题不在语法，而在"定义被复制进了多个翻译单元"，所以报错发生在链接阶段。
