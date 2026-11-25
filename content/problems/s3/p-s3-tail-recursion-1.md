---json
{
  "id": "p-s3-tail-recursion-1",
  "title": "把递归改写成循环：求和、斐波那契与最大公约数",
  "difficulty": "L3",
  "knowledgePoints": ["s3-tail-recursion"],
  "special": "ds-implementation",
  "judge": { "mode": "function", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
本题不需要写 `main`，只需要在 `tail_lib.c` 里实现三个函数。头文件 `tail_lib.h` 已经声明好了：

```c
long long sum_to(long long n);   /* 1 + 2 + ... + n */
long long fib(int n);            /* 第 n 个斐波那契数：fib(0) = 0，fib(1) = 1 */
int gcd(int a, int b);           /* 最大公约数，gcd(0, 0) = 0 */
```

三个函数都有"递归写法很自然"的版本：

```c
long long sum_to(long long n) { return n == 0 ? 0 : n + sum_to(n - 1); }
long long fib(int n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); }
int gcd(int a, int b) { return b == 0 ? a : gcd(b, a % b); }
```

但它们的"毛病"各不相同：

- `sum_to` 的递归深度等于 `n`。本题的 `n` 可以达到 **10⁶**——尾递归在 `-O2` 下能被优化成跳转，可**本平台判题用的是 `-O0`**，尾调用优化根本不会发生，100 万层栈帧会直接把 64MB 的栈撑爆（判 `RE`）；
- `fib` 的朴素递归是指数级的，`fib(90)` 要算约 4.7×10¹⁸ 次，必然超时（判 `TLE`）。它还不是尾递归：`fib(n-1) + fib(n-2)` 拿到两个结果后还要相加；
- `gcd` 的递归本身就是尾递归（除完直接返回），深度只有 O(log min(a,b))，递归写法其实没问题——但本题要求你把三个函数都改写成**循环**，体会一下"尾递归 → 迭代"的机械转换过程。

判题时，一个隐藏的 `main` 会读入参数、依次调用这三个函数并输出三行结果。你只需要写出 `tail_lib.c`。

## 输入格式
（由隐藏的 main 读取，供你理解测试方式）

- 第 1 行：两个整数 `A`、`B`，分别传给 `sum_to` 和 `fib`；
- 第 2 行：两个整数 `X`、`Y`，传给 `gcd`。

## 输出格式
（由隐藏的 main 输出）三行，依次是 `sum_to(A)`、`fib(B)`、`gcd(X, Y)` 的值。

## 数据范围
- `0 ≤ A ≤ 1000000`：`sum_to(10⁶) = 500000500000`，`int` 装不下，必须用 `long long`；
- `0 ≤ B ≤ 90`：`fib(90) = 2880067194370816120`，仍在 `long long` 范围内（`fib(92)` 就会溢出 `long long`）；
- `0 ≤ X, Y ≤ 10⁹`：`int` 足够；约定 `gcd(0, 0) = 0`、`gcd(a, 0) = a`。

## 示例
### 示例 1
```in
5 10
12 18
```
```out
15
55
6
```
> `1+2+3+4+5 = 15`；`fib(10) = 55`；`gcd(12, 18) = 6`（`12 = 2×6`，`18 = 3×6`）。

### 示例 2（边界：所有参数都是 0）
```in
0 0
0 0
```
```out
0
0
0
```
> `sum_to(0)` 是空和，按定义等于 0。`fib(0) = 0`。题目约定 `gcd(0, 0) = 0`——虽然数学上"0 和 0 的最大公约数"没有定义，但工程上通常这样约定，循环版会自然给出这个结果（`while (b != 0)` 一次都不进，返回 `a = 0`）。

## 提示
### 第 1 层
三个函数都可以用同一个套路改写：**把"递归参数"变成"循环变量"，把"返回值"变成"累积变量"**。改完之后，第一个要确认的是边界：`A = 0`、`B = 0`、`X = Y = 0` 时结果对不对。

### 第 2 层
- `sum_to`：`acc = 0`，让 `i` 从 1 走到 `A`，每次 `acc += i`。累加器必须是 `long long`，否则 `10⁶` 项的和约 `5×10¹¹` 会溢出 `int`（有符号溢出是 UB）。
- `fib`：用两个变量滚动——`a = fib(k)`、`b = fib(k+1)`，循环一次就同时往后挪一位。`B = 0` 时循环一次都不进，返回 `a = 0`；`B = 1` 时进一次，返回 `a = 1`。
- `gcd`：`while (b != 0) { int t = a % b; a = b; b = t; }`，循环结束时 `a` 就是答案。注意**取模的顺序**：是 `a % b`，别写成 `b % a`。

### 第 3 层
`fib` 的滚动写法（这就是"两个累加器的尾递归"去掉递归之后的样子）：

```c
long long a = 0;          /* fib(0) */
long long b = 1;          /* fib(1) */
for (int i = 0; i < n; i++) {
    long long t = a + b;  /* 新的下一个 */
    a = b;
    b = t;
}
return a;                 /* 循环 n 次后，a 就是 fib(n) */
```

`sum_to` 的死循环风险：`for (long long i = 1; i <= n; i++)` 里如果 `i` 写成 `int`，`n = 10⁶` 也不会溢出（`int` 到 21 亿），但和 `n` 比较时会隐式转换，容易看糊涂——**让循环变量的类型和参数一致**最省心。

## 参考代码
```c file=tail_lib.c
#include "tail_lib.h"

long long sum_to(long long n) {
    long long acc = 0;
    for (long long i = 1; i <= n; i++) {
        acc += i;
    }
    return acc;
}

long long fib(int n) {
    long long a = 0;                 /* fib(k) */
    long long b = 1;                 /* fib(k+1) */
    for (int i = 0; i < n; i++) {
        long long t = a + b;
        a = b;
        b = t;
    }
    return a;
}

int gcd(int a, int b) {
    while (b != 0) {
        int t = a % b;
        a = b;
        b = t;
    }
    return a;
}
```

## 初始代码
```c file=tail_lib.c
#include "tail_lib.h"

long long sum_to(long long n) {
    return n;                        /* TODO: 改成循环累加 */
}

long long fib(int n) {
    return n;                        /* TODO: 用两个变量滚动计算 */
}

int gcd(int a, int b) {
    (void)a;
    (void)b;
    return 0;                        /* TODO: 辗转相除的循环版 */
}
```

## 测试驱动
```c file=tail_lib.h
#ifndef TAIL_LIB_H
#define TAIL_LIB_H

long long sum_to(long long n);
long long fib(int n);
int gcd(int a, int b);

#endif
```

```c file=harness.c hidden
#include <stdio.h>
#include "tail_lib.h"

int main(void) {
    long long a;
    int b;
    if (scanf("%lld %d", &a, &b) != 2 || a < 0 || a > 1000000 || b < 0 || b > 90) {
        return 0;
    }

    int x, y;
    if (scanf("%d %d", &x, &y) != 2 || x < 0 || y < 0) {
        return 0;
    }

    printf("%lld\n", sum_to(a));
    printf("%lld\n", fib(b));
    printf("%d\n", gcd(x, y));
    return 0;
}
```

## 复杂度
- `sum_to`：时间 O(A)，空间 O(1)（常数个变量）；递归版的空间是 O(A) 的栈；
- `fib`：时间 O(B)，空间 O(1)；朴素递归的时间是 O(2^B)，B = 90 时约 4.7×10¹⁸ 次调用；
- `gcd`：时间 O(log min(X, Y))（每两步至少缩小一半），空间 O(1)；递归版的深度也只有 O(log min(X, Y))。

三个函数改成循环之后，栈的使用都是 O(1)，`A = 10⁶` 也不会爆栈。

## 常见错误
### 用 int 做累加器，10⁶ 项的和溢出 [UB]
`sum_to(10⁶) = 500000500000`，而 `int` 最大只有 2147483647。用 `int` 累加到第 65536 项左右就会发生**有符号整数溢出**——这是未定义行为，本平台的 UBSan 会直接报错，不是"变成负数"这么温和。
```c file=tail_lib.c expect=UB
#include "tail_lib.h"

long long sum_to(long long n) {
    int acc = 0;                     /* 错：int 装不下 5×10¹¹ */
    for (int i = 1; i <= n; i++) {   /* int + int，累加到 65536 项就溢出 */
        acc += i;
    }
    return acc;
}

long long fib(int n) {
    long long a = 0;
    long long b = 1;
    for (int i = 0; i < n; i++) {
        long long t = a + b;
        a = b;
        b = t;
    }
    return a;
}

int gcd(int a, int b) {
    while (b != 0) {
        int t = a % b;
        a = b;
        b = t;
    }
    return a;
}
```

### fib 照抄递归式，90 项就要算到天荒地老 [TLE]
`return fib(n - 1) + fib(n - 2);` 的调用次数是指数级的。样例的 `B = 10` 只要 177 次，看起来毫无问题；隐藏用例的 `B = 90` 需要约 4.7×10¹⁸ 次，判题器会在 1 秒后按超时处理。
```c file=tail_lib.c expect=TLE
#include "tail_lib.h"

long long sum_to(long long n) {
    long long acc = 0;
    for (long long i = 1; i <= n; i++) {
        acc += i;
    }
    return acc;
}

long long fib(int n) {
    if (n < 2) {
        return n;
    }
    return fib(n - 1) + fib(n - 2);  /* 错：指数级重复计算 */
}

int gcd(int a, int b) {
    while (b != 0) {
        int t = a % b;
        a = b;
        b = t;
    }
    return a;
}
```

### 写成尾递归，但在 -O0 下照样爆栈 [RE]
下面这个 `sum_to` 是标准的尾递归写法，逻辑完全正确。可判题器用 `-O0` 编译，尾调用优化不会发生，`A = 10⁶` 时栈帧一层层压下去，程序直接崩溃（`RE`）。**这正是"尾递归不保证省栈"的现场证据**：同一个函数在 `-O2` 下能跑，在 `-O0` 下会死。
```c file=tail_lib.c expect=RE
#include "tail_lib.h"

static long long sum_tail(long long n, long long acc) {
    if (n == 0) {
        return acc;
    }
    return sum_tail(n - 1, acc + n);      /* 尾调用，但 -O0 不优化 */
}

long long sum_to(long long n) {
    return sum_tail(n, 0);
}

long long fib(int n) {
    long long a = 0;
    long long b = 1;
    for (int i = 0; i < n; i++) {
        long long t = a + b;
        a = b;
        b = t;
    }
    return a;
}

int gcd(int a, int b) {
    while (b != 0) {
        int t = a % b;
        a = b;
        b = t;
    }
    return a;
}
```

### 最大公约数写成了 gcd(b % a, a) [WA]
`a % b` 和 `b % a` 只有在 `a == b` 时才一样。写成 `gcd(b % a, a)` 后，当 `b > a` 时 `b % a` 可能等于 `b`（例如 `a = 6`、`b = 15` 时 `b % a = 3`，看起来还能走；但 `a = 12`、`b = 18` 时 `b % a = 6`，也能走），可某些组合会让参数不再变小，最终递归不收敛或算错。写辗转相除时认准：**用较大的数对较小的数取模**，循环条件用 `b != 0`。

### 循环的边界写成 i < n 或 i <= n [WA]
`sum_to` 要累加 1 到 `n`（含 `n`），循环条件必须是 `i <= n`；写成 `i < n` 会少加最后一项。`fib` 要滚动 `n` 次，循环条件是 `i < n`；写成 `i <= n` 会多滚一次。改写成循环之后，先用 `n = 0, 1, 2, 3` 手算核对。

## 测试用例
### 01 sample 示例 1
```in
5 10
12 18
```
```out
15
55
6
```

### 02 sample 示例 2
```in
0 0
0 0
```
```out
0
0
0
```

### 03 boundary 最大规模：10⁶ 项求和、fib(90)、两个十亿级的数
```in
1000000 90
1000000000 999999999
```
```out
500000500000
2880067194370816120
1
```

### 04 degenerate 最小正规模
```in
1 1
0 7
```
```out
1
1
7
```

### 05 trap 两个数相等与 fib 的第二个种子
```in
2 3
42 42
```
```out
3
2
42
```

### 06 trap 奇数项求和与 fib(50)
```in
999999 50
6 15
```
```out
499999500000
12586269025
3
```

### 07 normal 一般情况
```in
100 45
1071 462
```
```out
5050
1134903170
21
```

### 08 trap gcd 的一个参数为 0
```in
3 2
1000000000 0
```
```out
6
1
1000000000
```

### 09 boundary fib 接近 long long 上限
```in
1000000 89
1 1000000000
```
```out
500000500000
1779979416004714189
1
```
