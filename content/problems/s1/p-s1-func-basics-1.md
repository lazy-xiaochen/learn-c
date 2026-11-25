---json
{
  "id": "p-s1-func-basics-1",
  "title": "按给定接口实现 max3 和 clamp 两个函数",
  "difficulty": "L1",
  "knowledgePoints": ["s1-func-basics"],
  "special": "interface-impl",
  "judge": { "mode": "function", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
本题只需要实现两个函数，不需要写 `main`。头文件 `funcs.h` 中声明了它们：

```c
int max3(int a, int b, int c);          /* 返回三个数中的最大值 */
int clamp(int x, int lo, int hi);       /* 把 x 限制在 [lo, hi] 内：小于 lo 返回 lo，大于 hi 返回 hi，否则返回 x */
```

判题时，一个隐藏的 `main` 函数会读入若干条测试指令，调用你的函数并输出结果。你只需要在 `solution.c` 中写出这两个函数的定义。

## 输入格式
（由隐藏的 main 读取，供你理解测试方式）第一行是指令条数 q；接下来 q 行，每行是 `1 a b c`（调用 max3）或 `2 x lo hi`（调用 clamp，保证 lo ≤ hi）。

## 输出格式
（由隐藏的 main 输出）每条指令输出一行函数的返回值。

## 数据范围
1 ≤ q ≤ 4000；所有参数都在 `int` 范围内。

## 示例
### 示例 1
```in
3
1 3 9 4
2 15 0 10
2 -3 0 10
```
```out
9
10
0
```

### 示例 2（边界：三个数相同；x 恰好等于边界）
```in
2
1 -1 -1 -1
2 10 0 10
```
```out
-1
10
```

## 提示
### 第 1 层
`solution.c` 要先 `#include "funcs.h"`，然后写出两个函数的定义，签名必须和头文件中的声明完全一致。

### 第 2 层
max3 可以先求出 a、b 中较大的，再和 c 比较。clamp 分三种情况。参数可能是 `int` 的最小值和最大值，不要用 `(a + b + |a − b|) / 2` 这类需要做加减法的"公式"，会溢出。

### 第 3 层
`int max3(int a, int b, int c) { int m = a > b ? a : b; return m > c ? m : c; }`；`int clamp(int x, int lo, int hi) { if (x < lo) return lo; if (x > hi) return hi; return x; }`。

## 参考代码
```c file=solution.c
#include "funcs.h"

int max3(int a, int b, int c) {
    int m = a > b ? a : b;   /* 只做比较，不做加减，不会溢出 */
    return m > c ? m : c;
}

int clamp(int x, int lo, int hi) {
    if (x < lo) {
        return lo;
    }
    if (x > hi) {
        return hi;
    }
    return x;
}
```

## 初始代码
```c file=solution.c
#include "funcs.h"

int max3(int a, int b, int c) {
    /* 返回三个数中的最大值 */
    return a;
}

int clamp(int x, int lo, int hi) {
    /* 把 x 限制在 [lo, hi] 内 */
    return x;
}
```

## 测试驱动
```c file=funcs.h
#ifndef FUNCS_H
#define FUNCS_H

int max3(int a, int b, int c);
int clamp(int x, int lo, int hi);

#endif
```

```c file=harness.c hidden
#include <stdio.h>
#include "funcs.h"

int main(void) {
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int op, a, b, c;
        if (scanf("%d %d %d %d", &op, &a, &b, &c) != 4) {
            return 0;
        }
        printf("%d\n", op == 1 ? max3(a, b, c) : clamp(a, b, c));
    }
    return 0;
}
```

## 复杂度
每次调用 O(1)。本题练习按照给定的函数原型实现函数，以及 return 的使用。

## 常见错误
### 用加减法"公式"求最大值 [UB]
`(a + b + abs(a - b)) / 2` 在数学上等于 max(a, b)，但 `a + b`、`a - b` 都可能超出 `int` 范围。
```c file=solution.c expect=UB
#include "funcs.h"

static int max2(int a, int b) {
    int d = a - b;
    return (a + b + (d < 0 ? -d : d)) / 2;
}

int max3(int a, int b, int c) {
    return max2(max2(a, b), c);
}

int clamp(int x, int lo, int hi) {
    if (x < lo) return lo;
    if (x > hi) return hi;
    return x;
}
```

### max3 只比较了相邻的数 [WA]
`a > b ? a : (b > c ? b : c)` 在 a > b 时直接返回 a，没有和 c 比较。
```c file=solution.c expect=WA
#include "funcs.h"

int max3(int a, int b, int c) {
    return a > b ? a : (b > c ? b : c);
}

int clamp(int x, int lo, int hi) {
    if (x < lo) return lo;
    if (x > hi) return hi;
    return x;
}
```

### clamp 的两个边界写反 [WA]
小于下界时返回了上界、大于上界时返回了下界。
```c file=solution.c expect=WA
#include "funcs.h"

int max3(int a, int b, int c) {
    int m = a > b ? a : b;
    return m > c ? m : c;
}

int clamp(int x, int lo, int hi) {
    if (x < lo) return hi;
    if (x > hi) return lo;
    return x;
}
```

### 函数签名与头文件不一致 [CE]
例如写成 `long long max3(int a, int b, int c)`，编译器会报 `conflicting types for 'max3'`。定义必须与声明完全一致。

## 测试用例
### 01 sample 示例 1
```in
3
1 3 9 4
2 15 0 10
2 -3 0 10
```
```out
9
10
0
```

### 02 sample 示例 2
```in
2
1 -1 -1 -1
2 10 0 10
```
```out
-1
10
```

### 03 trap int 的极值（加减法会溢出）
```in
3
1 2147483647 -2147483648 0
1 -2147483648 -2147483648 -2147483647
2 -2147483648 -2147483648 2147483647
```
```out
2147483647
-2147483647
-2147483648
```

### 04 trap 最大值在第三个位置
```in
2
1 5 3 9
1 9 3 5
```
```out
9
9
```

### 05 degenerate 区间只有一个点
```in
3
2 7 5 5
2 -7 5 5
2 5 5 5
```
```out
5
5
5
```

### 06 boundary 等于边界
```in
2
2 0 0 10
2 2147483647 0 2147483647
```
```out
0
2147483647
```

### 07 normal 最大值在中间
```in
1
1 1 100 50
```
```out
100
```

### 生成 boundary 最大规模
```js gen
// 4000 条随机指令（输出约 46KB，在 64KB 输出上限之内），期望值在这里独立计算
const q = 4000;
const lines = [String(q)];
const out = [];
const R = () => rng.int(-2147483648, 2147483647);
for (let i = 0; i < q; i++) {
  if (i % 2 === 0) {
    const a = R(), b = R(), c = R();
    lines.push(`1 ${a} ${b} ${c}`);
    out.push(Math.max(a, b, c));
  } else {
    let lo = R(), hi = R();
    if (lo > hi) [lo, hi] = [hi, lo];
    const x = R();
    lines.push(`2 ${x} ${lo} ${hi}`);
    out.push(x < lo ? lo : x > hi ? hi : x);
  }
}
return [{ kind: 'boundary', category: '最大规模 q = 4000', input: lines.join('\n') + '\n', output: out.join('\n') + '\n' }];
```
