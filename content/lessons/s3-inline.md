---
id: s3-inline
---

## 讲解

### inline 只是"建议"，不改变程序的行为
`inline` 的意思是"**这个函数很小，调用它的时候不妨把函数体直接展开到调用处**"，省掉压栈、跳转、返回的开销。它是一句建议，不是命令：编译器完全可以不理你，照样生成一次普通调用。

这带来一个重要推论：**内联不改变程序的语义**。内联前输出什么，内联后还是输出什么；唯一变化的可能是速度（和可执行文件大小）。所以下面这段代码在 `-O0`（不做优化）下，`square` 就是一个普通的本地函数，调用照常发生：

```c run id=inline-static
#include <stdio.h>

/* 小工具函数：加上 static，每个包含它的文件各有一份，都不会重复定义 */
static inline int square(int x) {
    return x * x;
}

int main(void) {
    int total = 0;
    for (int i = 0; i <= 3; i++) {
        total += square(i);          /* 0 + 1 + 4 + 9 */
    }
    printf("total = %d\n", total);
    return 0;
}
```
```output
total = 14
```

`static inline` 的组合是最常用的、也是最安全的写法，下面几节会说明为什么。

### C99 的 inline：只给"内联定义"，不产生外部实体
真正容易踩坑的是**不带 `static`、也不带 `extern` 的 `inline`**。在 C99 及之后的标准里，这种写法叫**内联定义**（inline definition），它的规则是：

- 编译器**可以**把它内联展开；
- 但它**不要求**在目标文件里生成一个外部可见的函数实体。

换句话说：`inline int square(int x) { ... }` 只说了"这是可以内联的实现"，并**没有**说"这里有一个叫 `square` 的函数可以给别人用"。如果编译器这次没有内联（比如 `-O0`），调用点就只能记一笔"外部引用 `square`"，然后链接器找不到实体：

```c run id=inline-plain-o0 expect=CE
#include <stdio.h>

inline int square(int x) {       /* 内联定义：不产生外部实体 */
    return x * x;
}

int main(void) {
    printf("square(7) = %d\n", square(7));
    return 0;
}
```

本平台的报错是：

```text
ld.lld: error: undefined symbol: square
>>> referenced by main.c:8
>>>               main-8a1c2f.o:(main)
```

注意它**编译成功、链接失败**——这很符合直觉：函数明明写在眼前，怎么会"未定义"？因为 C 标准里"内联定义"和"外部定义"是两回事。

更阴的是：同一份代码在 `-O2` 下**能跑**，因为优化器把它内联掉了，根本不需要实体：

```c run id=inline-plain-o2 opt=-O2
#include <stdio.h>

inline int square(int x) {       /* 同样只有内联定义 */
    return x * x;
}

int main(void) {
    printf("square(7) = %d\n", square(7));
    return 0;
}
```
```output
square(7) = 49
```

**这就是 C 语言 `inline` 最坑的地方：它的正确性依赖优化级别。** `-O0` 下链接失败，`-O2` 下正常，改天换个编译器、换个版本、或者只是加了一行 `printf` 让编译器决定不内联，程序就突然链接不过了。所以**永远不要**在 `.c` 文件里只写一个裸的 `inline` 函数。

### extern inline：真正生成外部实体的写法
想让 `inline` 函数拥有一个外部实体，要加 `extern`：

```c run id=inline-extern
#include <stdio.h>

extern inline int square(int x) {    /* 外部定义：目标文件里会生成实体 */
    return x * x;
}

int main(void) {
    printf("square(7) = %d\n", square(7));
    return 0;
}
```
```output
square(7) = 49
```

`extern inline` 在 C99 里的含义是"**这是一个外部定义**"：目标文件里一定会生成一个真实的函数实体（所以不内联时也能链接到），同时 `inline` 仍然提示编译器"可以内联"。

正因为它会生成外部实体，**`extern inline` 只能出现在一个编译单元里**。如果写进头文件、被两个 `.c` 包含，两个目标文件各生成一份 `square`，链接时报：

```text
ld.lld: error: duplicate symbol: square
>>> defined at util.h:3
>>>            a-5d70c6.o
>>> defined at util.h:3
>>>            b-80f589.o
```

C 语言里唯一"既内联又不重复定义"的组合，仍然是最前面那个 `static inline`。

### 四种写法对照
| 写法 | 链接属性 | 有外部实体吗 | 能放头文件吗 | 适用场景 |
|---|---|---|---|---|
| `int f(void) { ... }` | 外部链接 | 有 | **不能**（会 duplicate） | 普通函数，放 `.c` |
| `inline int f(void) { ... }` | 外部链接 | **不保证有** | 不能（每个文件都缺实体） | 基本不用，容易踩坑 |
| `extern inline int f(void) { ... }` | 外部链接 | 有 | **不能**（会 duplicate） | C99 的"实例化"，一个程序一处 |
| `static inline int f(void) { ... }` | **内部**链接 | 每个文件各一份 | **能**，而且推荐 | 头文件里的小工具函数 |

记忆方法：**`static` 决定"每个文件各一份"，`extern` 决定"生成实体"，什么都没有就只剩"内联建议"。**

### 有状态的函数，绝不能 static inline 放头文件
`static inline` 之所以能安全地放头文件，前提是**函数没有状态**——它只根据参数算结果（这种函数叫纯函数）。一旦函数里带了 `static` 局部变量，每个包含头文件的 `.c` 都会得到**独立的一份状态**：

```c
/* ticket.h —— 错误示范：看起来很方便，其实是三个独立的计数器 */
static int g_counter = 0;

static inline int next_ticket(void) {
    return ++g_counter;          /* 每个 .c 里各有一个 g_counter */
}
```

`main.c` 和 `desk.c` 都包含它，于是各有一个从 0 开始的计数器：两边都会发出 1 号、2 号票，序号撞车。这类 bug 在单文件测试时完全看不出来，只有真正拆成多文件才暴露。

正确做法是**把有状态的实现放进一个 `.c` 文件，头文件只留声明**：

```c
/* ticket.h */
int next_ticket(void);           /* 只是声明 */

/* ticket.c */
static int g_counter = 0;        /* 全程序只有这一份 */
int next_ticket(void) {
    return ++g_counter;
}
```

这条规则和上一节"头文件只放声明"是同一个道理：**能放头文件的只有"无状态、不需要唯一实体"的东西。**

### inline 与函数宏：为什么要用 inline 而不是宏
在 C89 时代没有 `inline`，大家用函数宏来代替"短小的函数"：

```c run id=inline-macro
#include <stdio.h>

#define DOUBLE(x) x + x              /* 宏是文本替换：没有括号保护 */

static inline int double_it(int x) {
    return x + x;                    /* 函数：参数只求值一次，也不会有优先级问题 */
}

int main(void) {
    printf("macro: %d\n", DOUBLE(1 + 2) * 3);
    printf("inline: %d\n", double_it(1 + 2) * 3);
    return 0;
}
```
```output
macro: 10
inline: 18
```

`DOUBLE(1 + 2) * 3` 被展开成 `1 + 2 + 1 + 2 * 3`，乘法先算，结果是 10，而本意是 18。这就是宏的三大问题之一：

1. **没有括号保护**，展开后优先级会变（本例）；
2. **参数可能被求值多次**：`DOUBLE(i++)` 会展开成 `i++ + i++`，`i` 被加了两次，而且同一个表达式里对同一变量做两次无顺序的修改是**未定义行为**；
3. **没有类型检查**：`DOUBLE("abc")` 编译器不会拦你。

`static inline` 函数把这三个问题一起解决了：参数只求值一次、有类型检查、有作用域。它几乎总是比函数宏更好的选择。

### 两个补充：取地址与 C++
- **取地址**：一个函数只要被取过地址（`&square`）或者赋值给函数指针，就必须有一个真实的实体。`-O0` 下本来就有实体；`-O2` 下编译器也会为它生成一份。裸 `inline` 的函数被取地址时同样可能需要实体——这又是一个"看优化级别"的雷。
- **C++ 的规则是反的**：C++ 里 `inline` 函数可以定义在头文件里、被多个编译单元包含，链接器会自动合并（弱符号/COMDAT）。所以在 C++ 里"头文件里写 inline 函数"完全正确，把这套习惯搬到 C 里就会 `undefined symbol` 或 `duplicate symbol`。这是 C/C++ 混用项目里最常见的链接问题之一。

## 编译与运行

单文件：

```bash
gcc -std=c17 -Wall -Wextra inline.c -o inline
./inline
```

多文件（`inline` 的问题几乎都出现在多文件工程里）：

```bash
gcc -std=c17 -Wall -Wextra main.c ticket.c -o app
./app
```

本平台使用 Clang，命令等价：

```bash
clang -std=c17 -Wall -Wextra main.c ticket.c -o app
./app
```

几个和 `inline` 直接相关的开关：

- `-O0` / `-O2`：决定编译器"愿不愿意"内联。调试本知识点时**一定要两个都试**，因为裸 `inline` 的行为正好随它变化；
- `-fno-inline`：强制不内联（调试时看"不内联会不会坏"特别有用）；
- `nm`：看符号到底有没有生成。`nm main.o | grep square` 里出现 `T square` 说明有外部实体（大写 `T` = 全局），`t square` 是内部链接（`static`），什么都没有（只有 `U square`）说明只有引用没有实体；
- `-Wunused-function`：包含在 `-Wall` 里。头文件里的 `static inline` 函数如果某个 `.c` 没有用到，会报 `unused function` 警告——这是正常的，不算错误。

**本平台的判题固定用 `-O0`**，所以在本平台上，只写 `inline`（不带 `static` / `extern`）的函数**一定链接失败**。写题目时看到 `undefined symbol` 而函数明明写在眼前，先检查是不是漏了 `static`。

## 常见错误

### 在 .c 文件里只写 inline，链接时 undefined symbol [CE]
最典型的翻车：本地 `-O2` 一切正常，提交上去（或换台机器）就报错。原因是裸 `inline` 不产生外部实体，而这次编译器决定不内联。
```c run id=err-inline-no-static expect=CE
#include <stdio.h>

inline int triple(int x) {       /* 错：只有内联定义，没有外部实体 */
    return x * 3;
}

int main(void) {
    printf("%d\n", triple(4));
    return 0;
}
```
修法：加 `static`（`static inline`），或者去掉 `inline` 写普通函数，或者加 `extern`（但只能出现在一个文件里）。

### 把头文件里的 inline 定义加上 extern，两个 .c 都包含 [CE]
`extern inline` 会生成外部实体，放进头文件后每个包含它的 `.c` 都生成一份，链接时报 `duplicate symbol`。这和"头文件里定义普通函数"是同一个错误，只是更隐蔽——因为作者以为 `inline` 会自动"合并"。C 语言没有这种机制（那是 C++ 的规则）。

### 在 static inline 函数里用 static 局部变量做计数器 [WA]
```c
/* 错：每个 .c 各有一份 g_calls 和一份函数体 */
static inline int count_call(void) {
    static int g_calls = 0;
    return ++g_calls;
}
```
能编译、能链接、单文件测试也正常，但拆成两个 `.c` 之后两边各自从 1 开始数，统计结果永远偏小。**有状态的东西必须只有一个实体**，所以要放进 `.c` 文件里用普通函数（或者用 `extern` 的全局变量）。

### 用函数宏代替 inline 函数，参数被求值多次 [WA]
```c
#define SQUARE(x) ((x) * (x))
int i = 3;
int a = SQUARE(i++);      /* 展开成 ((i++) * (i++))：i 被加了两次，且是未定义行为 */
```
即使加足了括号，宏也躲不开"参数被求值多次"这个根本问题。`static inline int square(int x)` 的 `x` 只求值一次。判断标准：**宏的参数里只要可能出现 `++`、`--`、函数调用、赋值，就必须换成 `inline` 函数。**

### 以为加了 inline 就一定被内联 [WA]
`inline` 是建议。`-O0` 下一律不内联；`-O2` 下太复杂的函数（有循环、递归、太大）也不会内联。反过来，**没写 `inline` 的 `static` 小函数在 `-O2` 下也经常被自动内联**——优化器自己会判断。所以 `inline` 更多是"给读代码的人看的意图说明"，不要指望它一定生效，更不要为了"性能"到处乱加。

## 客观题

### q-s3-inline-1 single
`util.h` 里写着 `inline int helper(int x) { return x * 2; }`，`a.c` 和 `b.c` 都 `#include "util.h"`，并且都调用了 `helper`。用 `clang -std=c17 -O0 a.c b.c -o app` 构建，会发生什么？

- [x] 链接失败，报 `undefined symbol: helper`：裸 `inline` 只提供内联定义，`-O0` 下不内联，两个文件都只有引用没有实体
  > 正确。C99 的 `inline`（不带 `static` / `extern`）不要求在目标文件里生成外部实体。`-O0` 下编译器不内联，`a.o` 和 `b.o` 里只有对 `helper` 的外部引用，没有任何一份定义，链接器于是报 `undefined symbol`。
- [ ] 链接成功，因为两个文件都包含了函数的定义
  > "包含进来"的是**内联定义**，不是外部定义。标准允许编译器只把它当作内联的候选，不生成实体。`-O0` 下正是如此。
- [ ] 链接失败，报 `duplicate symbol: helper`：两个文件各有一份定义
  > 方向反了。`duplicate symbol` 是"多份实体"，这里一份实体都没有。裸 `inline` 恰恰**不会**产生实体，所以不可能重复；会重复的是 `extern inline` 或普通函数定义。
- [ ] 编译失败，报 `redefinition of 'helper'`
  > 编译器一次只处理一个 `.c`，看不到另一份，报不出重复定义。而且内联定义在同一个编译单元里出现一次是完全合法的。
