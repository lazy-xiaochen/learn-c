---
id: s6-function-macro
---

## 讲解

### 函数宏长得像函数，本质还是文本替换
`#define` 可以带参数：

```c
#define SQR(x) ((x) * (x))
```

用它写 `SQR(a + 1)`，看起来像调用函数，实际上预处理器做的事是**把参数原样塞进替换文本**：

```
SQR(a + 1)   →   ((a + 1) * (a + 1))
```

它和真正的函数有六处本质区别，全部来自"预处理阶段、文本替换"这一点：

| | 函数宏 | 真正的函数 |
|---|---|---|
| 什么时候处理 | 预处理阶段，编译前就没了 | 编译阶段生成代码，运行时调用 |
| 参数类型检查 | 没有，什么记号都能塞进去 | 有，类型不匹配会报错或隐式转换 |
| 参数求值次数 | 在宏体里**出现几次就求值几次** | 恰好一次 |
| 参数求值顺序 | 没有规定 | 没有规定（但每个只求值一次） |
| 能否取地址、能否单步调试 | 不能 | 能 |
| 有没有调用开销 | 没有（就是内联的文本） | 可能有（inline 函数可以兼顾） |

所以判断"该用宏还是该用函数"的标准很简单：**需要类型安全、需要参数只求值一次、需要调试 → 用函数（或 `static inline` 函数）；需要常量表达式、需要字符串化/记号拼接、需要"零成本且必须内联" → 用宏**。只为了"省一次函数调用"而写宏，在今天的编译器面前几乎没有收益。

### 两条括号规则：每个参数都要括，整个宏体还要再括
先看只写 `x * x` 会发生什么：

```c run id=fm-paren
#include <stdio.h>

#define BAD_SQR(x)   x * x            /* 参数没有括号 */
#define GOOD_SQR(x)  ((x) * (x))      /* 参数和整体都有括号 */

int main(void) {
    int a = 1 + 2;
    printf("BAD_SQR(1 + 2)  = %d\n", BAD_SQR(1 + 2));    /* 展开成 1 + 2 * 1 + 2 */
    printf("GOOD_SQR(1 + 2) = %d\n", GOOD_SQR(1 + 2));
    printf("BAD_SQR(a)       = %d\n", BAD_SQR(a));       /* 参数是单个变量时看不出问题 */
    printf("GOOD_SQR(a)      = %d\n", GOOD_SQR(a));
    printf("2 * BAD_SQR(1+2)  = %d\n", 2 * BAD_SQR(1 + 2));
    printf("2 * GOOD_SQR(1+2) = %d\n", 2 * GOOD_SQR(1 + 2));
    return 0;
}
```
```output
BAD_SQR(1 + 2)  = 5
GOOD_SQR(1 + 2) = 9
BAD_SQR(a)       = 9
GOOD_SQR(a)      = 9
2 * BAD_SQR(1+2)  = 6
2 * GOOD_SQR(1+2) = 18
```

三条结论，一条都不能少：

1. **每个参数都要加括号**。`BAD_SQR(1 + 2)` 展开成 `1 + 2 * 1 + 2`，乘法先算，结果是 5 而不是 9；
2. **整个宏体还要再加一层括号**。`2 * BAD_SQR(1 + 2)` 展开成 `2 * 1 + 2 * 1 + 2`，结果是 6 而不是 18。宏体里只有 `*`、没有低优先级运算符时也需要这层括号，因为它要和**调用处的**运算符（比如 `*`、`?`、`,`、`=`）打交道；
3. **参数是单个变量时看不出问题**。`BAD_SQR(a)` 照样等于 9，所以这种 bug 往往在"某次调用刚好传了表达式"时才炸——这也解释了为什么它能在代码里潜伏很久。

一句话记法：**宏体里的每个参数都用括号包起来，整个宏体再包一层**。`#define GOOD(x) ((x) * 2 + 1)`、`#define MIN(a, b) ((a) < (b) ? (a) : (b))` 都遵守这条规则。

### 参数会被求值两次：`MAX(i++, j)` 到底发生了什么
括号能让**优先级**正确，但改不了另一件事：**参数在宏体里出现几次，就会被求值几次**。

```c
#define MAX(a, b) ((a) > (b) ? (a) : (b))
```

把 `a` 替换成 `i++`，展开结果里 `i++` 出现了**两次**：

```
MAX(i++, 5)   →   ((i++) > (5) ? (i++) : (5))
```

三元运算符保证"条件先算、两个分支只算一个"，所以这里不是未定义行为（两个 `i++` 有先后顺序），但副作用结结实实地发生了两次：

```c run id=fm-twice
#include <stdio.h>

#define MAX(a, b) ((a) > (b) ? (a) : (b))

int main(void) {
    int i = 7;
    int m = MAX(i++, 5);      /* i++ 出现两次：条件里一次，选中的分支里又一次 */
    printf("i = %d, m = %d\n", i, m);

    int j = 3;
    int k = MAX(j++, 5);      /* 条件不成立，第二次 i++ 所在的分支没有求值 */
    printf("j = %d, k = %d\n", j, k);
    return 0;
}
```
```output
i = 9, m = 8
j = 4, k = 5
```

第一组：`i` 从 7 变成 9（自增了两次），`m` 拿到的是"自增之后的 8"——既不是 7 也不是 5。第二组：条件 `3 > 5` 不成立，走的是 `b` 那一支，`i++` 只求值了一次，所以 `j` 是 4。**同一个宏，副作用次数取决于运行时走了哪个分支**，这是宏最阴险的地方。

如果写成 `MAX(i++, i++)` 或 `SQR(i++)`，两个副本之间就没有先后顺序了，那是**未定义行为**（同一个完整表达式里对同一个变量两次无序修改），编译器可以给出任何结果。这类 bug 在本平台不一定被 sanitizer 抓住，它可能只是"答案莫名其妙不对"。

铁律：**给宏传的参数不要带副作用**（不要写 `i++`、`++i`、赋值、函数调用），或者把宏改成 `static inline` 函数。

### 多语句宏：必须 `do { ... } while (0)`
如果宏体里有不止一条语句，用花括号包起来也不行——因为调用处可能写成 `if (c) MACRO(x);`，展开后花括号后面的分号会把语句切断。正确的写法是 `do { ... } while (0)`：它在语法上是一条语句，末尾的 `;` 刚好补齐，而且 `while (0)` 保证只执行一次。

```c run id=fm-multi
#include <stdio.h>

#define REPORT_BAD(v)  printf("value=%d\n", (v)); printf("--\n");
#define REPORT_OK(v)   do { printf("value=%d\n", (v)); printf("--\n"); } while (0)

int main(void) {
    int flag = 0;
    if (flag)
        REPORT_BAD(1);        /* 展开成 if (flag) printf(...); printf("--\n"); */
    printf("after bad\n");

    if (flag)
        REPORT_OK(2);         /* 展开成 if (flag) do { ... } while (0); */
    printf("after ok\n");
    return 0;
}
```
```output
--
after bad
after ok
```

`flag` 是 0，两个 `if` 的条件都不成立，可是 `REPORT_BAD` 里的第二条 `printf` 还是执行了：展开后它已经不在 `if` 的管辖范围内。`REPORT_OK` 没有任何多出来的输出。

`do { ... } while (0)` 里的几个细节都有原因：

- **`while (0)` 而不是 `while (1)`**：保证循环体只执行一次；
- **末尾不加分号**：分号留给调用者写，宏里写了就会出现 `;;`，在 `if/else` 之间会变成编译错误；
- **不能只用 `{ }`**：`if (c) { ... }; else ...` 里的那个分号会让 `else` 失去配对的 `if`。

### 想清楚代价，再决定用宏还是 inline 函数
同一个"取较大值"，写成函数就没有多次求值的问题：函数调用时**每个实参只求值一次**，然后把值复制给形参。

```c run id=fm-inline
#include <stdio.h>

#define MAX(a, b) ((a) > (b) ? (a) : (b))

static int max_int(int a, int b) {
    return a > b ? a : b;
}

int main(void) {
    int i = 7;
    int m1 = MAX(i++, 5);        /* 宏：i++ 求值两次 */
    printf("i = %d, 宏结果 = %d\n", i, m1);

    int j = 7;
    int m2 = max_int(j++, 5);    /* 函数：实参只求值一次 */
    printf("j = %d, 函数结果 = %d\n", j, m2);
    return 0;
}
```
```output
i = 9, 宏结果 = 8
j = 8, 函数结果 = 7
```

函数版的 `j` 只增加了 1，结果就是"7 和 5 里的较大者"7——这才是所有人对 `max` 的直觉。加上 `static inline` 之后，编译器在 `-O2` 下同样会把函数体内联展开，没有调用开销，却保留了类型检查和"参数只求值一次"的语义。所以在"只是想要一个更快的小函数"这个场景里，`static inline` 几乎总是更好的选择。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra main.c -o main
./main

clang -std=c17 -Wall -Wextra main.c -o main
./main
```

宏展开的结果可以用 `-E` 直接看，这是排查"结果为什么不对"最快的手段：

```bash
# 看预处理后的代码：SQR(a + 1) 会变成 ((a + 1) * (a + 1))
gcc -E -P main.c | tail -n 20

# 只做语法检查（宏展开后的语法错误也能立刻发现）
clang -std=c17 -Wall -Wextra -fsyntax-only main.c
```

`-Wall -Wextra` 对宏的帮助有限：缺括号不会报警告，只在**能看出来**的时候才有提示，例如 `SQR(i++)` 可能触发 `multiple unsequenced modifications to 'i'`，`MAX` 里出现赋值会触发 `-Wparentheses`。真正靠谱的办法是看 `-E` 的输出，以及在写宏时守住三条规则：参数加括号、整体加括号、参数不带副作用。

想在运行时抓出宏里的算术问题，加上 sanitizer：

```bash
clang -std=c17 -Wall -Wextra -fsanitize=address,undefined -fno-sanitize-recover=all main.c -o main
```

宏里的 `int` 乘法溢出、移位越界、除零都属于未定义行为，UBSan 会直接指出出错的表达式和行号（行号会被标成宏调用的那一行）。

## 常见错误

### 只给参数加了括号，忘了整体
很多人记住了"参数要加括号"，于是写成 `#define NEXT(x) (x) + 1`——参数确实括起来了，但**整个宏体没有括**。宏体里是 `+`，调用处是 `*`，展开后 `*` 先算：

```c run id=fm-whole
#include <stdio.h>

#define NEXT_BAD(x)  (x) + 1     /* 参数有括号，整体没有 */
#define NEXT_OK(x)   ((x) + 1)   /* 整体也有 */

int main(void) {
    printf("2 * NEXT_BAD(3) = %d\n", 2 * NEXT_BAD(3));   /* 2 * (3) + 1 */
    printf("2 * NEXT_OK(3)  = %d\n", 2 * NEXT_OK(3));    /* 2 * ((3) + 1) */
    printf("NEXT_BAD(3) * 2 = %d\n", NEXT_BAD(3) * 2);   /* 这个方向碰巧是对的 */
    return 0;
}
```
```output
2 * NEXT_BAD(3) = 7
2 * NEXT_OK(3)  = 8
NEXT_BAD(3) * 2 = 5
```

三条输出里两条是错的，而且错法还不一样：`2 * NEXT_BAD(3)` 展开成 `2 * (3) + 1`（乘法先算），`NEXT_BAD(3) * 2` 展开成 `(3) + 1 * 2`（乘法还是先算）。也就是说，**参数括号只能保护参数内部，保护不了宏体和外界之间那层运算**。规则必须两条一起用：每个参数加括号 + 整个宏体加括号，写成 `((x) + 1)` 才算完整。口诀是"宏体里的每个参数都括起来，最后再把整个宏体括起来"。

### 给宏传带副作用的参数
`MAX(i++, j)`、`SQR(x++)`、`CHECK(f())` 都是同一个坑：宏体里出现几次，实参就求值几次。轻则结果不对（`i` 被加了两次），重则是未定义行为（两个副本无序修改同一个变量）。要么保证实参是"纯值"（变量、常量、不含副作用的表达式），要么改成 `static inline` 函数。

```c
#define SQR(x) ((x) * (x))
#define MAX(a, b) ((a) > (b) ? (a) : (b))

int i = 3;
int a = SQR(i++);      /* 未定义行为：i++ 的两个副本无序 */
int b = MAX(i++, 10);  /* 有定义，但 i 会被加两次（结果取决于分支） */
```

### 多语句宏写成 `{ ... }` 或一串语句
`#define SWAP(a, b) { int t = (a); (a) = (b); (b) = t; }` 用在 `if (c) SWAP(x, y); else ...` 里会报 `expected expression`／`else without a previous if`：

```c run id=fm-braces expect=CE
#define SWAP(a, b) { int t = (a); (a) = (b); (b) = t; }

int main(void) {
    int x = 1, y = 2;
    if (x < y)
        SWAP(x, y);
    else
        x = 0;
    return x + y;
}
```

展开后是 `if (x < y) { ... }; else x = 0;`——花括号后面那个分号让 `else` 找不到对应的 `if`。改成 `do { ... } while (0)` 即可。

### 宏里的算术溢出
宏没有类型，替换进去的运算是按**参数的类型**做的。`#define SQR(x) ((x) * (x))` 传一个 `int`，乘法就在 `int` 里做：

```c run id=fm-overflow expect=UB
#include <stdio.h>

#define SQR(x) ((x) * (x))

int main(void) {
    int n = 100000;
    printf("%d\n", SQR(n));      /* 10^10 远超 int 的范围 */
    return 0;
}
```

UBSan 会报 `signed integer overflow: 100000 * 100000 cannot be represented in type 'int'`。修复办法不是给宏加括号（括号解决不了范围问题），而是让运算发生在更宽的类型里，例如 `#define SQR(x) ((long long)(x) * (x))`，或者干脆用函数。

## 客观题

### q-s6-function-macro-1 single
有 `#define MAX(a, b) ((a) > (b) ? (a) : (b))`，执行

```c
int i = 7;
int m = MAX(i++, 5);
```

之后 `i` 和 `m` 的值分别是：

- [x] `i = 9`，`m = 8`
  > 正确。宏展开成 `((i++) > (5) ? (i++) : (5))`。三元运算符先算条件：`i++` 取出 7 并让 `i` 变成 8，`7 > 5` 成立；于是求值第二个分支 `(i++)`，再取出 8 并让 `i` 变成 9。所以 `m = 8`、`i = 9`。宏的参数在宏体里出现两次，就被求值两次。
- [ ] `i = 8`，`m = 7`
  > 错。这是"把宏当成函数"的直觉：以为实参只求值一次、`m` 拿到 7。实际上 `i++` 在替换文本里出现了两次，条件里一次、选中分支里一次。
- [ ] `i = 9`，`m = 7`
  > 错。`i` 确实被加了两次，但第二次自增发生在取值之后：第二个分支拿到的是 8，所以 `m` 是 8 而不是 7。注意这里**不是**未定义行为——三元运算符规定条件先于分支求值，两个 `i++` 有先后顺序。
- [ ] 这是未定义行为，`i` 和 `m` 的值无法预测
  > 错。未定义行为要求"对同一个变量的两次修改之间没有顺序"。这里两个 `i++` 分别位于条件和被选中的分支，标准规定条件先求值且先于分支，所以顺序是确定的。真正未定义的是 `SQR(i++)` 这种两个副本无序、或 `MAX(i++, i++)` 这种两个实参无序的写法。
