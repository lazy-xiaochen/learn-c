---
id: s1-if-else
---

## 讲解

### 基本形式
```c
if (条件) {
    条件为真（非 0）时执行
} else {
    条件为假（0）时执行
}
```

多个条件依次判断时用 `else if`。程序**从上往下**检查，执行**第一个**成立的分支，然后跳过其余所有分支：

```c run id=grade stdin="85"
#include <stdio.h>

int main(void) {
    int score;
    if (scanf("%d", &score) != 1) return 1;
    if (score >= 90) {
        printf("A\n");
    } else if (score >= 80) {      /* 能走到这里，说明 score < 90 */
        printf("B\n");
    } else if (score >= 60) {
        printf("C\n");
    } else {
        printf("F\n");
    }
    return 0;
}
```
```output
B
```

因为分支是按顺序检查的，`else if (score >= 80)` 不需要再写 `score < 90`。反过来，如果把 `score >= 60` 放在最前面，85 分就会被判成 C。

### 始终使用花括号
`if` 后面如果不写花括号，**只有紧跟着的一条语句**属于它。缩进对编译器没有任何意义：

```c run id=no-brace stdin="5" warnings=allow
#include <stdio.h>

int main(void) {
    int x;
    if (scanf("%d", &x) != 1) return 1;
    if (x > 10)
        printf("x 很大\n");
        printf("这一行看起来属于 if，其实总会执行\n");
    return 0;
}
```
```output
这一行看起来属于 if，其实总会执行
```

### 悬挂 else
`else` 总是和**离它最近的、还没有配对的** `if` 配对，而不是和缩进对齐的那个：

```c run id=dangling stdin="-3" warnings=allow
#include <stdio.h>

int main(void) {
    int x;
    if (scanf("%d", &x) != 1) return 1;
    if (x >= 0)
        if (x == 0)
            printf("零\n");
    else                       /* 看起来属于外层 if，实际属于 if (x == 0) */
        printf("负数\n");
    printf("结束\n");
    return 0;
}
```
```output
结束
```

输入 -3 时什么都没判断出来：外层 `if (x >= 0)` 不成立，而 `else` 属于内层的 if，所以"负数"根本没机会输出。（编译器会给出 `add explicit braces to avoid dangling else` 警告。）加上花括号就不会有歧义。

### 条件后面多了分号
`if (x > 10);` 中的分号是一条**空语句**，它就是 if 的全部内容；后面的 `{ ... }` 变成了一个总会执行的普通代码块。

### 条件运算符 ?:
简单的二选一可以写成表达式：`条件 ? 值1 : 值2`。

```c run id=ternary stdin="3 8"
#include <stdio.h>

int main(void) {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) return 1;
    int max = a > b ? a : b;
    printf("较大的是 %d，%s\n", max, a == b ? "两数相等" : "两数不等");
    return 0;
}
```
```output
较大的是 8，两数不等
```

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra branch.c -o branch
```

`-Wall` 能发现：条件里的 `=`（`using the result of an assignment as a condition`）、悬挂 else（`-Wdangling-else`）、缩进误导（GCC 的 `-Wmisleading-indentation`）、if 后面的空语句（`-Wempty-body`）。

## 常见错误

### 分支顺序写反
范围判断时，要么从大到小、要么从小到大依次排列，否则较宽的条件会"抢先"匹配。

### if 后面没有花括号，后来又加了一行
最初只有一条语句时省略了花括号，后来补了第二条语句，以为它也在 if 里。**任何时候都写花括号**可以彻底避免这个问题。

### 用 == 比较浮点数
`if (0.1 + 0.2 == 0.3)` 不成立，要用误差比较。

## 客观题

### q-s1-if-else-1 single
x 的值为 5，下面代码的输出是什么？
```c
if (x > 3)
    if (x > 10)
        printf("A");
else
    printf("B");
printf("C");
```
- [ ] `AC`
  > x > 10 不成立，不会输出 A。
- [x] `BC`
  > 正确。else 与最近的 `if (x > 10)` 配对：x > 3 成立，进入内层，x > 10 不成立，执行 else 输出 B；最后的 printf 不属于任何 if，输出 C。
- [ ] `C`
  > 如果 else 属于外层的 if，结果才是 C；但 else 实际与最近的未配对 if 配对。
- [ ] `ABC`
  > 一个 if-else 最多执行一个分支。
