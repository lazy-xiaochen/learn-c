---
id: s6-include-search
---

## 讲解

### 两种写法的搜索顺序，到底差在哪
`#include` 本质是"把那个文件的内容原样粘贴到这里"，但**去哪里找这个文件**由写法决定。完整的规则是：

| 写法 | 搜索顺序 |
|---|---|
| `#include "x.h"` | ① 当前文件所在目录 → ② `-I` 指定的目录（按命令行顺序）→ ③ `-isystem` 指定的系统目录 → ④ 编译器内置的标准库目录 |
| `#include <x.h>` | 跳过 ①，直接从 ② 开始 → ③ → ④ |

两条容易忽略的推论：

- **引号形式不是"只搜当前目录"**，它找不到时会**退回到尖括号那套路径**。所以 `#include "stdio.h"` 也能工作，只是读代码的人会误会这是你自己的头文件；
- **尖括号形式也可能搜到"你的"文件**：只要你的目录被 `-I` 加进去了。这一点在跨平台构建里经常出事——工程目录里有个叫 `math.h` 的文件，`-I.` 一加，`#include <math.h>` 就变成了你自己的 `math.h`，标准库的同名头文件再也轮不到。

按约定：**标准库用尖括号，自己工程的头文件用双引号**。这不是风格问题，双引号的形式能让编译器先去"包含它的那个文件"旁边找，这在多目录工程里是刚需——`src/app.c` 里写 `#include "app.h"`，编译器会先去 `src/` 找，你不用为每个文件配 `-I`。

本平台还有一条硬规则：**尖括号里只允许 C 标准库头文件**（`<stdio.h>`、`<stdint.h>` 等），写 `<myheader.h>` 会被判题器直接拒绝并提示改用双引号。所以在本平台写题时，自己的头文件一律用双引号。

### 怎么确认编译器到底搜了哪些目录
不要靠猜。`-v` 会把搜索路径完整打印出来，`-H` 会在每包含一个文件时打印它的真实路径（`-H` 是 Clang/GCC 都支持的调试开关）：

```bash
# 打印所有搜索目录（看 "#include <...> search starts here" 那一段）
clang -E -v -x c /dev/null

# 每包含一个头文件就打印一行，能看出到底用的哪一份
clang -H -c main.c
```

`-H` 的输出形如：

```
. ./app.h
.. ./config.h
. /usr/include/stdio.h
```

缩进的点数表示嵌套深度（`.` 是直接包含，`..` 是间接包含），后面的路径就是**实际被粘进来的那个文件**。排查"我的头文件版本不对"这类问题时，这条命令比读代码快得多。

`-I` 和 `-isystem` 的区别在于**警告**：`-I` 目录里的头文件会被当作"你的代码"，里面的警告照报；`-isystem` 目录里的头文件被当作系统头文件，警告被抑制。第三方库一般用 `-isystem`。

```c run id=inc-hasinclude
#include <stdio.h>

/*
 * __has_include 是编译器提供的"探测"工具（C23 起成为标准，Clang/GCC 早就支持）：
 * 它在预处理阶段回答"这个 #include 能不能找到文件"。
 */
#if __has_include(<stdint.h>)
#define HAS_STDINT 1
#else
#define HAS_STDINT 0
#endif

#if __has_include("stdio.h")
#define QUOTED_STDIO 1
#else
#define QUOTED_STDIO 0
#endif

#if __has_include("nope.h")
#define HAS_NOPE 1
#else
#define HAS_NOPE 0
#endif

#if __has_include(<nope.h>)
#define HAS_ANGLE_NOPE 1
#else
#define HAS_ANGLE_NOPE 0
#endif

int main(void) {
    printf("对 <stdint.h> 探测        : %d\n", HAS_STDINT);
    printf("对 \"stdio.h\"（引号）探测  : %d\n", QUOTED_STDIO);
    printf("对 \"nope.h\"（不存在）探测 : %d\n", HAS_NOPE);
    printf("对 <nope.h>（不存在）探测  : %d\n", HAS_ANGLE_NOPE);
    return 0;
}
```
```output
对 <stdint.h> 探测        : 1
对 "stdio.h"（引号）探测  : 1
对 "nope.h"（不存在）探测 : 0
对 <nope.h>（不存在）探测  : 0
```

第三行是理解搜索规则的关键：`"stdio.h"` 用引号，但当前目录里并没有 `stdio.h`，它能找到是因为**引号形式会退回到系统路径**。也就是说，"引号 = 当前目录"这个说法只对了一半，完整说法是"引号 = 当前目录**优先**"。

### 相对路径与目录结构：`-I` 只加目录，不会递归
`#include` 里可以写路径：`#include "sub/app.h"` 表示"当前文件所在目录下的 `sub/app.h`"。这带来两个坑：

1. **`-I` 只把目录加进搜索列表，不会递归往下找**。`-I.` 之后 `#include <app.h>` 能找到 `./app.h`，但找不到 `./sub/app.h`——后者必须写 `#include "sub/app.h"` 或者再加一个 `-I./sub`；
2. **`..` 很危险**：`#include "../include/app.h"` 依赖"当前文件在哪个目录"，一旦源文件的目录结构变了（比如把工程从 `src/` + `include/` 拍平成一个目录），这行立刻失效。本平台的安全检查直接禁止 `..` 和绝对路径。

一个真实的翻车场景：本地工程的目录是

```
project/
  include/app.h
  src/app.c
  src/main.c
```

`src/app.c` 里写 `#include "../include/app.h"`，`src/main.c` 里写 `#include "../include/app.h"`。到了只接受"平铺文件"的在线判题环境，所有文件都在同一个目录里，`../include/app.h` 指向一个不存在的路径，**预处理阶段直接失败**。修法是把 include 改成 `"app.h"`，并且（如果工程真的有子目录）在编译命令里补 `-Iinclude`。

`__has_include` 还可以用来写"有就用、没有就退回"的跨平台代码——这是它在工程里最常见的用途：

```c run id=inc-optional
#include <stdio.h>

#if __has_include(<stdint.h>)
#include <stdint.h>
#define HAS_STDINT 1
typedef int64_t big_int;
#else
#define HAS_STDINT 0
typedef long long big_int;      /* 老编译器没有 <stdint.h> 时的退路 */
#endif

int main(void) {
    big_int x = 1000000000000LL;
    printf("has_stdint = %d, sizeof(big_int) = %zu, x = %lld\n",
           HAS_STDINT, sizeof(big_int), (long long)x);
    return 0;
}
```
```output
has_stdint = 1, sizeof(big_int) = 8, x = 1000000000000
```

注意 `typedef` 和 `#include` 都被放在 `#if` 的分支里：**两个分支只有一支会进入编译**，所以不会出现"两个 `typedef` 冲突"。

### 重复包含：系统头文件为什么不怕，你的头文件为什么怕
同一个头文件被包含两次是常事（`a.h` 包含 `config.h`，`main.c` 又直接包含 `config.h`）。系统头文件对此免疫，因为它们自己带**包含卫士**（include guard）：

```c
#ifndef STDIO_H
#define STDIO_H
/* ...真正的内容... */
#endif
```

第一次包含时 `STDIO_H` 没定义，整段内容生效并定义 `STDIO_H`；第二次包含时 `#ifndef` 为假，整段被跳过。所以重复包含标准头文件永远是安全的：

```c run id=inc-twice
#include <stdio.h>
#include <stdio.h>
#include <stdio.h>      /* 系统头文件有卫士：包含多少次都一样 */
#include <string.h>
#include <string.h>

int main(void) {
    char s[] = "abc";
    printf("sizeof(FILE *) = %zu\n", sizeof(FILE *));
    printf("strlen = %zu\n", strlen(s));
    return 0;
}
```
```output
sizeof(FILE *) = 8
strlen = 3
```

你自己的头文件如果没有卫士，第二次包含就会让里面的**类型定义、宏、函数声明**重复出现，轻则 `macro redefined` 警告，重则 `redefinition of 'struct ...'` 编译错误。卫士的写法没有例外，每个 `.h` 都要有：

```c
#ifndef APP_CONFIG_H
#define APP_CONFIG_H
/* 内容 */
#endif
```

还有一条和搜索路径相关的坑：**头文件里不要放定义**。头文件会被粘贴进每一个包含它的 `.c`，在里面写 `int g_counter = 0;` 或函数体，就等于在每个 `.c` 里都定义了一份，链接期必然 `duplicate symbol`（GCC/ld）或 `multiple definition`。头文件里只放**声明**（`extern`、函数原型、类型、宏），定义放在**唯一的一个 `.c`** 里。

### 把 `.c` 文件 include 进来会发生什么
既然 `#include` 只是文本粘贴，那把 `app.c` 粘进 `main.c` 在语法上完全合法——预处理器不区分扩展名。这种写法偶尔出现在"单文件编译"的脚本里，但只要构建命令**同时**编译了 `app.c`，链接器就会看到两份 `app_sum` 的定义：

```
ld.lld: error: duplicate symbol: app_sum
>>> defined at main.o
>>> defined at app.o
```

更糟的是 `#include "app.h"` 写错成 `#include "app.c"` 时，代码可能"碰巧能编译"（因为 `app.c` 里已经包含了 `app.h`），错误被推迟到链接期，报错信息还指向两个 `.o` 文件，很难联想到"我 include 错了文件"。

判断标准很简单：**`#include` 的目标应该是"只有声明"的头文件**。如果被包含的文件里有函数体、有变量定义，它就不该被 include。唯一的例外是"单文件构建"的特殊工程（例如某些嵌入式项目把所有 `.c` 都粘进一个 `unity.c`），那种工程会刻意只编译一个 `.c`。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra main.c util.c -o main
./main

clang -std=c17 -Wall -Wextra -Iinclude main.c util.c -o main
./main
```

和搜索路径相关的常用命令：

```bash
# 把 include/ 加进搜索列表（引号和尖括号都会搜这里）
gcc -std=c17 -Wall -Wextra -Iinclude main.c util.c -o main

# 第三方库目录：当作系统头文件，里面的警告不报
gcc -std=c17 -Wall -Wextra -isystem third_party/include main.c -o main

# 打印完整的搜索目录列表
clang -E -v -x c /dev/null

# 每包含一个头文件打印一行真实路径（排查用错版本最有效）
clang -H -c main.c

# 只看预处理结果，确认 include 进来的内容
gcc -E main.c | head -n 40
```

几点说明：

- `-I` 可以给多次，按命令行顺序搜索，**先给的优先**；
- 目录名里有空格时要整体加引号：`-I"my include"`；
- 在 Windows 上 `-I` 的路径分隔符用 `/` 或 `\` 都行，但写进 Makefile/CMake 时建议用 `/`，避免转义问题；
- 本平台的判题器编译时固定带 `-I <工作目录>`，所以你自己写的头文件用双引号一定找得到；用尖括号则会被安全检查拒绝。

## 常见错误

### 用尖括号包含自己的头文件
在本地"碰巧"能过（因为 Makefile 里有 `-I.`），换一个构建环境就找不到；本平台直接拒绝：

```c run id=inc-angle-own expect=CE
#include <stdio.h>
#include <app.h>          /* 自己写的头文件不能用尖括号 */

int main(void) {
    printf("%d\n", APP_CAP);
    return 0;
}
```

平台给出的提示是"`<app.h>` 不是 C 标准库头文件"。规则很简单：**尖括号只给标准库，自己的一律双引号**。

### 路径写错：多了目录前缀
把本地工程的目录结构带进了平铺的判题环境：

```c run id=inc-path expect=CE
#include <stdio.h>
#include "include/app.h"    /* 判题器把所有文件放在同一个目录，没有 include/ 这一层 */

int main(void) {
    printf("%d\n", APP_CAP);
    return 0;
}
```

本平台会提示"找不到 `include/app.h`：双引号形式只能包含你自己提交的文件"。`-I` 加的是**目录**，不是路径前缀，所以 `-Iinclude` 配合 `#include "app.h"` 才是正确组合。

### 头文件里放变量定义
`config.h` 里写 `int g_count = 0;`，被 `a.c` 和 `b.c` 各包含一次 → 链接期 `duplicate symbol: g_count`。头文件里只能写 `extern int g_count;`（声明），定义放 `config.c`。同理，头文件里写函数体也会在多个 TU 里各生成一份定义。

### 忘了包含头文件，或者包含顺序不对
用了 `strlen` 却没 `#include <string.h>`，C17 里是编译错误（`call to undeclared function`）。更隐蔽的是"包含顺序"：如果某个头文件里的宏/类型依赖另一个头文件，就必须先包含被依赖的那个——这也是为什么好的头文件会**自己包含**它需要的东西，而不是让使用者猜顺序。

```c run id=inc-missing expect=CE
#include <stdio.h>

int main(void) {
    printf("%zu\n", strlen("abc"));    /* 缺 #include <string.h> */
    return 0;
}
```

### 以为头文件名的搜索是"全盘查找"
编译器只在固定的几个目录（当前文件目录、`-I`、`-isystem`、内置目录）里按顺序找，**不会扫描整个硬盘**。所以"这个头文件明明在电脑上"没有意义，它必须在搜索列表里的某个目录下。

## 客观题

### q-s6-include-search-1 single
当前目录下有自己写的 `config.h`，但没有给编译器任何 `-I` 参数。下面关于 `#include "config.h"` 和 `#include <config.h>` 的说法哪一个是正确的？

- [x] `#include "config.h"` 能找到（先搜当前文件所在目录）；`#include <config.h>` 找不到（只搜 `-I` 和系统目录，其中没有当前目录）
  > 正确。引号形式的第一步就是"包含它的那个文件所在目录"，所以同目录的 `config.h` 直接命中；尖括号形式跳过这一步，只搜 `-I`、`-isystem` 和编译器内置目录。想让尖括号也找到，必须显式加 `-I.`——但那会让当前目录里所有同名文件都"劫持"标准头文件，得不偿失。
- [ ] 两种写法都能找到，因为编译器总会先搜当前目录
  > 错。只有引号形式会先搜当前目录。尖括号形式不搜当前目录，所以不写 `-I.` 时找不到。
- [ ] `#include "config.h"` 会扫描整个硬盘找这个文件
  > 错。编译器只在固定的搜索列表里按顺序查找，不会遍历硬盘。所以"文件在电脑上"不等于"编译器能找到"。
- [ ] `#include <config.h>` 会先找当前目录，找不到再去系统目录，所以两种写法完全等价
  > 错。这句描述恰好是**引号形式**的搜索顺序。尖括号形式没有"当前目录"这一步，两者不等价。
