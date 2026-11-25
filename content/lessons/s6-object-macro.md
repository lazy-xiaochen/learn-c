---
id: s6-object-macro
---

## 讲解

### 宏是预处理阶段的文本替换，不是变量
一份 C 代码要经过四个阶段才变成程序：**预处理** → 编译 → 汇编 → 链接。`#define` 只在第一个阶段起作用：预处理器手里只有"行"和"记号"，它做的事情就是**把代码里出现的宏名，换成你写的那段文本**，然后把结果交给编译器。编译器从来没有见过 `#define` 这一行，它只见到替换之后的代码。

这就解释了几个初学者最难接受的现象：

- **宏没有类型**。`#define COUNT 4` 里的 `4` 是 `int`，但 `COUNT` 这个"名字"本身没有类型、没有地址、不占内存；
- **宏没有作用域**。`#define` 从定义那一行开始，一直有效到文件末尾（或者被 `#undef` 掉），不管它在哪个函数、哪个花括号里面；
- **调试器里看不到宏**。程序运行时宏早就不存在了，你只能看到它替换出来的东西；
- **宏不检查语法**。`#define` 后面的内容可以是任何记号序列，哪怕它根本不是一个合法表达式，也要等到展开之后才会报错。

下面这段代码用到了宏做数组长度，还演示了 `#undef`：宏可以被取消再重新定义，而 `const` 变量不行。

```c run id=om-basic
#include <stdio.h>

#define COUNT 4

int main(void) {
    int a[COUNT] = {10, 20, 30, 40};     /* 展开成 int a[4] */
    int sum = 0;
    for (int i = 0; i < COUNT; i++) {
        sum += a[i];
    }
    printf("COUNT = %d\n", COUNT);
    printf("sizeof a = %zu\n", sizeof a);
    printf("sum = %d\n", sum);

#undef COUNT
#define COUNT 2
    printf("重新定义之后 COUNT = %d\n", COUNT);
    return 0;
}
```
```output
COUNT = 4
sizeof a = 16
sum = 100
重新定义之后 COUNT = 2
```

`sizeof a` 是 16 而不是 4，说明宏在数组声明里真的变成了数字 `4`（4 个 `int` × 4 字节）。如果 `COUNT` 是个变量，`int a[COUNT]` 在 C 里就不能这么写（变长数组另说，而且行为不同）。

### 替换只发生在"完整记号"上
预处理器是按**记号**（token）切分代码的，不是按字符。所以只有"单独出现的宏名"会被替换，下面三种情况都安全：

- **更长的标识符**：`SIZE_TOTAL` 是一个记号，和 `SIZE` 毫无关系；
- **字符串字面量**：`"SIZE"` 是**一个**记号（整个字符串），里面的字符不会被拆开替换；
- **注释**：注释在预处理之前（严格说是预处理的第一步）就被替换成空格了。

```c run id=om-token
#include <stdio.h>

#define SIZE 10

int main(void) {
    int SIZE_TOTAL = 3;                       /* 一个更长的标识符：不替换 */
    const char *msg = "字符串里的 SIZE 也不会被替换";
    /* 注释里的 SIZE 当然也不会，注释根本到不了编译器 */
    printf("SIZE = %d\n", SIZE);
    printf("SIZE_TOTAL = %d\n", SIZE_TOTAL);
    printf("%s\n", msg);
    return 0;
}
```
```output
SIZE = 10
SIZE_TOTAL = 3
字符串里的 SIZE 也不会被替换
```

反过来，正因为替换是纯文本的，它**不认上下文**：你把宏名写进 `#include` 的文件名、写进 `printf` 的格式串、写在 `#if` 里，预处理器都只是照换。这也意味着宏会"污染"后续所有代码——一个叫 `max` 的宏会和标准库里的 `max`、和你自己写的函数名打架，所以宏名习惯上全大写。

### 为什么宏体必须加括号：展开后由调用处的优先级说了算
这是对象宏最经典的坑。看这两个定义，只差一对括号：

```c
#define BAD_DAY    24 * 60 * 60
#define GOOD_DAY   (24 * 60 * 60)
```

`seconds / BAD_DAY` 展开后是 `seconds / 24 * 60 * 60`。`*` 和 `/` 同级、从左往右结合，所以它算的是 `(seconds / 24) * 60 * 60`，和 `seconds / 86400` 差了三个数量级。**宏体没有"整体"的概念**，它只是被塞进表达式里，运算符优先级由塞进去的位置决定。整个宏体加一层括号，等于告诉编译器"这是一个原子"。

同样的道理，宏体里如果有低优先级的运算符（`+`、`?:`、`,`、赋值），不加括号几乎必错：

```c run id=om-paren
#include <stdio.h>

#define BAD_DAY     24 * 60 * 60      /* 没有括号：除法会被拆散 */
#define GOOD_DAY    (24 * 60 * 60)    /* 有括号：整体是一个值 */
#define BAD_BUDGET  100 + 1           /* 没有括号：乘法会先算 1 * 2 */
#define GOOD_BUDGET (100 + 1)

int main(void) {
    long long seconds = 90000;
    printf("BAD_DAY  : %lld\n", seconds / BAD_DAY);
    printf("GOOD_DAY : %lld\n", seconds / GOOD_DAY);
    printf("BAD_BUDGET * 2  = %d\n", BAD_BUDGET * 2);
    printf("GOOD_BUDGET * 2 = %d\n", GOOD_BUDGET * 2);
    return 0;
}
```
```output
BAD_DAY  : 13500000
GOOD_DAY : 1
BAD_BUDGET * 2  = 102
GOOD_BUDGET * 2 = 202
```

90000 秒其实只有 1 天多一点，`BAD_DAY` 却算出了 1350 万——它把"除以 86400"变成了"除以 24，再乘 60，再乘 60"。这类错误不会报警告、不会崩溃，只会安安静静地给出错答案，这也是它比编译错误危险的地方。

### 宏、const 与 enum：什么时候用哪个
宏能做的事，`const` 变量大多也能做，但有两点宏独有：

1. **宏能出现在需要"常量表达式"的地方**：数组长度、`case` 标签、位掩码、`#if` 的条件。`const int` 变量在 C 里**不是**常量表达式（它是"只读变量"，值要到运行时才确定），不能拿来做数组长度；
2. **宏能被 `#if` 看见**。条件编译只认识预处理阶段的宏，`const` 变量在预处理阶段还不存在。

```c run id=om-what
#include <stdio.h>

#define CAP 100

int main(void) {
    char buf[CAP];                 /* 宏可以当数组长度 */
    const int cap = 100;           /* const 变量在 C 里不是常量表达式 */
    /* char buf2[cap]; */          /* 取消注释：C17 里这是变长数组，语义与 buf 不同 */
    printf("sizeof buf = %zu\n", sizeof buf);
    printf("sizeof(CAP) = %zu\n", sizeof(CAP));
    printf("CAP / 2 = %d\n", CAP / 2);
    printf("cap * 1 = %d\n", cap * 1);
    return 0;
}
```
```output
sizeof buf = 100
sizeof(CAP) = 4
CAP / 2 = 50
cap * 1 = 100
```

`sizeof(CAP)` 是 4，因为展开后就是 `sizeof(100)`——`100` 是 `int`。这再一次说明宏**没有类型**：它的类型是"替换文本刚好是什么类型"。反过来，`const int cap` 有明确类型，编译器会检查你把它赋给谁、会不会越界。

| | `#define CAP 100` | `const int cap = 100;` |
|---|---|---|
| 预处理阶段可见 | 是（能用于 `#if`） | 否 |
| 能否当数组长度 / `case` 标签 | 能 | 不能（C 的常量表达式不含 `const` 变量） |
| 有没有类型、编译器查不查 | 没有，不查 | 有，查 |
| 调试器里能否看到 | 看不到 | 看得到 |
| 作用域 | 从定义处到文件末尾（或 `#undef`） | 正常作用域规则 |
| 占不占内存 | 不占 | 占（除非被优化掉） |

实践中的选择：**需要参与预处理或需要常量表达式的地方用宏（或 `enum`），其余用 `const`**。宏名全大写，是给读代码的人一个"这是文本替换，小心"的提醒。

## 编译与运行

用 gcc 或 clang 都可以。宏相关的错误全部发生在**预处理**阶段，所以最有效的工具是 `-E`（只做预处理，把结果打印出来）：

```bash
# 正常编译运行
gcc -std=c17 -Wall -Wextra main.c -o main
./main

clang -std=c17 -Wall -Wextra main.c -o main
./main
```

```bash
# 只看预处理结果：宏已经全部被替换掉了
gcc -E main.c | tail -n 20
# -P 去掉行号标记，输出更干净
clang -E -P main.c
```

对一个 `#define COUNT 4` 的程序，`-E` 输出里会看到 `int a[4] = {10, 20, 30, 40};`——`COUNT` 这个名字彻底消失了。这也是"宏没有调试信息"的直接证据。

其它常用手法：

```bash
# 从命令行定义一个宏（不改源码就能改配置，条件编译一节会大量用到）
gcc -std=c17 -DDEBUG=1 main.c -o main

# 打印编译器预定义的所有宏（看看有多少个"内置"的宏）
gcc -dM -E -x c /dev/null | head -n 20

# 只做语法检查，最快发现宏展开后的语法错误
gcc -std=c17 -Wall -Wextra -fsyntax-only main.c
```

`-Wall -Wextra` 不会为"宏体缺少括号"报警——语法上它是完全合法的，只有结果错。所以宏的括号必须靠自己检查：**看到 `#define` 后面是一个表达式，就把整个表达式用括号包起来**。

## 常见错误

### 宏定义末尾加了分号
`#define MAX 100;` 会把分号一起存进替换文本。用在表达式里时，分号会变成语句结束符：

```c run id=om-semicolon expect=CE
#include <stdio.h>

#define MAX 100;

int main(void) {
    int n = 120;
    if (n > MAX) {            /* 展开成 if (n > 100;) —— 语法错误 */
        printf("超过上限\n");
    }
    return 0;
}
```

如果只是 `int x = MAX + 1;`，展开成 `int x = 100; + 1;` 反而能编译，但 `x` 是 100 而不是 101——**能跑通的分号错误更可怕**。记住：`#define` 不是语句，不需要分号。

### 在字符串里写宏名，以为会被替换
字符串字面量是一个完整的记号，预处理器不会进去替换：

```c run id=om-string
#include <stdio.h>

#define NAME "world"

int main(void) {
    printf("hello, NAME\n");    /* 打印的是字面文本 NAME */
    printf("hello, %s\n", NAME);/* 想拼接，得用相邻字符串字面量或格式符 */
    return 0;
}
```
```output
hello, NAME
hello, world
```

### 用 `&` 取宏的地址
宏不是对象，没有存储空间，也就没有地址：

```c run id=om-address expect=CE
#define MAX 100

int main(void) {
    int *p = &MAX;      /* 展开成 &100，不是左值 */
    return *p;
}
```

### `#undef` 之后再使用
`#undef` 让宏"失效"，之后这个名字就变回普通标识符了：

```c run id=om-undef expect=CE
#include <stdio.h>

#define COUNT 4

int main(void) {
#undef COUNT
    printf("%d\n", COUNT);   /* COUNT 已经不是一个宏，也不是变量 */
    return 0;
}
```

## 客观题

### q-s6-object-macro-1 single
有 `#define SIZE 8`，下面关于这个宏的说法哪一个是正确的？

- [x] 预处理阶段把代码里作为独立记号的 `SIZE` 全部换成 `8`，所以 `int a[SIZE]` 合法；但 `SIZE` 本身没有类型、不占内存、也不能取地址
  > 正确。宏是预处理阶段的文本替换，`int a[SIZE]` 展开成 `int a[8]`，`sizeof(SIZE)` 等价于 `sizeof(8)`（结果是 4，`int` 的大小）。名字 `SIZE` 在编译阶段已经不存在了，所以它没有类型、没有地址、调试器里也看不到。
- [ ] `SIZE` 是一个只读的 `int` 变量，占 4 字节，可以用 `&SIZE` 取地址
  > 错。`#define` 不分配存储，`&SIZE` 展开成 `&8`，编译器会报"不是左值"。只有 `const int SIZE = 8;` 才是占内存的只读变量。
- [ ] 字符串 `"SIZE"` 里的 `SIZE` 也会被替换成 `8`
  > 错。字符串字面量是一个完整的记号，预处理器按记号替换，不会拆开字符串去改里面的字符。想把宏的值放进字符串，必须用 `#` 字符串化运算符（见"# 与 ##"一节）。
- [ ] `#define SIZE 8;` 加不加末尾的分号效果一样
  > 错。分号会被一起存进替换文本：`int a[SIZE]` 变成 `int a[8;]`，直接编译错误；`x = SIZE + 1` 变成 `x = 8; + 1`，虽然能编译但 `x` 是 8 而不是 9。`#define` 不是语句，末尾不加分号。
