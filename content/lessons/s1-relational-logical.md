---
id: s1-relational-logical
---

## 讲解

### 关系运算符：结果是 0 或 1
| 运算符 | 含义 |
|---|---|
| `==` | 等于（**两个**等号） |
| `!=` | 不等于 |
| `<` `>` `<=` `>=` | 小于、大于、小于等于、大于等于 |

C 语言（C99 之前）没有专门的布尔类型，比较的结果是 `int`：成立为 **1**，不成立为 **0**。反过来，在 `if`、`while` 的条件里，**任何非 0 的值都当作"真"，只有 0 是"假"**。

```c run id=rel
#include <stdio.h>

int main(void) {
    int a = 3, b = 5;
    printf("%d %d %d\n", a < b, a == b, a != b);
    if (42) printf("42 是真\n");
    if (-1) printf("-1 也是真\n");
    if (0) printf("这一行不会输出\n");
    return 0;
}
```
```output
1 0 1
42 是真
-1 也是真
```

C99 起可以 `#include <stdbool.h>` 使用 `bool`、`true`、`false`，本质上仍然是 1 和 0。

### 逻辑运算符
| 运算符 | 含义 | 何时为真 |
|---|---|---|
| `&&` | 与 | 两边都为真 |
| `\|\|` | 或 | 至少一边为真 |
| `!` | 非 | 操作数为假（0）时 |

### 短路求值
`&&` 和 `||` 从左往右计算，**一旦能确定结果就不再计算右边**：
- `A && B`：如果 A 为假，结果必然为假，B **不会被计算**；
- `A || B`：如果 A 为真，结果必然为真，B **不会被计算**。

这不只是性能优化，而是一个可以依赖的保证。最典型的用法是"先检查，再使用"：

```c run id=short-circuit stdin="0"
#include <stdio.h>

int main(void) {
    int x;
    if (scanf("%d", &x) != 1) return 1;
    /* x 为 0 时，左边为假，右边的 100 / x 根本不会执行，所以不会除以零 */
    if (x != 0 && 100 / x > 10) {
        printf("100 / x > 10\n");
    } else {
        printf("x 为 0，或者 100 / x 不大于 10\n");
    }
    return 0;
}
```
```output
x 为 0，或者 100 / x 不大于 10
```

短路也意味着：右边带有"副作用"（比如 `i++`、函数调用）时，它**不一定会执行**：

```c run id=side-effect
#include <stdio.h>

int main(void) {
    int a = 0, b = 0;
    if (a++ && b++) { }     /* a++ 的值是 0（先用后加），右边被跳过 */
    printf("a=%d b=%d\n", a, b);
    return 0;
}
```
```output
a=1 b=0
```

### 1 < x < 3 不是你想的意思
数学里 `1 < x < 3` 表示 x 在 1 和 3 之间，但在 C 里它按从左到右计算：先算 `1 < x` 得到 0 或 1，再拿这个 0 或 1 和 3 比较——**结果永远为真**。

这个错误太常见了，本平台使用的 Clang 编译器（23 版）直接把它当作**编译错误**拒绝：

```c run id=chain expect=CE
#include <stdio.h>

int main(void) {
    int x = 100;
    printf("%d\n", 1 < x < 3);
    return 0;
}
```

但 GCC 和较老的 Clang 只给出一个警告，程序照样能运行。下面用括号把它"真正的含义"写出来（加了括号，编译器就认为你是故意的），看看它实际算出了什么：

```c run id=chain-meaning warnings=allow
#include <stdio.h>

int main(void) {
    int x = 100;
    printf("%d\n", (1 < x) < 3);            /* (1 < 100) 得 1，1 < 3 得 1 */
    printf("%d\n", 1 < x && x < 3);         /* 正确写法 */
    return 0;
}
```
```output
1
0
```

编译器仍然会提醒你：`result of comparison of constant 3 with boolean expression is always true`——比较结果只可能是 0 或 1，和 3 比较"永远为真"。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra logic.c -o logic
```

对 `1 < x < 3`：GCC 在 `-Wall` 下给出 `comparisons like 'X<=Y<=Z' don't have their mathematical meaning` 警告；本平台的 Clang 23 直接报错 `chained comparison 'X < Y < Z' does not behave the same as a mathematical expression`。对 `if (x = 5)`，两者都会给出 `using the result of an assignment as a condition` 警告。

不同编译器、不同版本对同一段代码的反应可能不同（警告、错误或者一声不吭），所以**不能用"我的编译器没报错"来证明代码是对的**。

## 常见错误

### 把 == 写成 =
`if (x = 5)` 是**赋值**：把 5 存进 x，表达式的值是 5（真），所以条件永远成立，而且 x 被改掉了。有人习惯写成 `if (5 == x)`，写错成 `5 = x` 时会直接编译失败。

### 连续比较
`lo <= x <= hi` 永远为真（因为 `lo <= x` 的结果 0 或 1 一般都 ≤ hi），必须写成 `lo <= x && x <= hi`。

### 把 && 写成 &
`&` 是按位与（下一节），它**不短路**：`x != 0 & 100 / x > 10` 在 x 为 0 时仍会计算 `100 / x`，导致除以零。

## 客观题

### q-s1-relational-logical-1 single expr-reasoning
执行下面的代码后，输出是什么？
```c
int i = 0, j = 5;
int r = (i > 0 && ++j > 0) || j++ > 5;
printf("%d %d %d\n", i, j, r);
```
- [ ] `0 7 1`
  > `i > 0` 为假，`&&` 短路，`++j` 没有执行；j 只在 `j++` 处加了一次。
- [x] `0 6 0`
  > 正确。`i > 0` 为假 → 左边 `&&` 整体为 0 且 `++j` 被跳过；于是计算 `||` 的右边 `j++ > 5`：先用 j 的旧值 5 比较，5 > 5 为假，然后 j 变成 6。r = 0 || 0 = 0。
- [ ] `0 6 1`
  > `j++` 是后置自增，比较时用的是旧值 5，`5 > 5` 不成立，所以 r 为 0。
- [ ] `0 5 0`
  > `||` 左边为假，所以右边 `j++ > 5` 一定会被计算，j 会加 1。
