---json
{
  "id": "p-s2-const-pointer-1",
  "title": "按接口实现区间统计：用 const 保护只读数组",
  "difficulty": "L3",
  "knowledgePoints": ["s2-const-pointer", "s2-array-param"],
  "special": "ds-implementation",
  "judge": { "mode": "function", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个只读的成绩表需要支持多次区间统计：给定区间 `[l, r]`，求这个区间的和与最小值。成绩表在统计过程中**绝不能被修改**，所以接口把数组声明成了 `const int *`。

本题不需要写 `main`，只需要在 `stats.c` 里实现头文件 `stats.h` 声明的两个函数：

```c
long long range_sum(const int *a, int l, int r);   /* 返回 a[l] + ... + a[r] */
int range_min(const int *a, int l, int r);         /* 返回 a[l..r] 中的最小值 */
```

形参里的 `const int *a` 是一份写进类型里的承诺：函数只会读数组，不会写。也正因为有 `const`，调用者手里的 `const` 数组才能安全地传进来；如果实现时把 `const` 去掉，签名就和头文件对不上，编译会直接失败。

判题时，一个隐藏的 `main` 会读入数组和所有查询，调用你写的两个函数，并输出每个区间的结果。

## 输入格式
（由隐藏的 `main` 读取，写在这里帮助你理解测试方式）

第一行一个整数 `n`；
第二行 `n` 个整数，表示数组元素；
第三行一个整数 `q`；
接下来 `q` 行，每行两个整数 `l` 和 `r`，表示一次查询的闭区间。

## 输出格式
（由隐藏的 `main` 输出）共 `q` 行，每行两个整数：该区间的和与最小值，用一个空格分隔。

## 数据范围
- 1 ≤ n ≤ 2000
- |a[i]| ≤ 1000000000
- 1 ≤ q ≤ 1000
- 0 ≤ l ≤ r < n

区间和最大可达 `2000 × 10^9 = 2 × 10^12`，远远超过 `int` 的上限（约 2.1 × 10^9）。所以 `range_sum` 的返回类型是 `long long`，累加时也必须用 `long long`。

## 示例
### 示例 1
```in
5
3 -7 12 0 -7
3
0 4
1 3
2 2
```
```out
1 -7
5 -7
12 12
```
> 整个数组的和是 `3 - 7 + 12 + 0 - 7 = 1`，最小值是 -7。区间 `[1,3]` 是 `-7 + 12 + 0 = 5`，最小值仍是 -7。区间 `[2,2]` 只有一个元素 12。

### 示例 2（边界：只有一个元素，且取到 int 的下限）
```in
1
-1000000000
1
0 0
```
```out
-1000000000 -1000000000
```
> 区间只有一个元素时，和与最小值都等于它自己。注意这个值接近 `int` 的下限，用 `int` 保存没问题，但和仍然要用 `long long` 返回。

## 提示
### 第 1 层
两个函数都只需要把区间 `[l, r]` 扫一遍。区间是**闭区间**：`l` 和 `r` 两个端点都要算进去。函数签名必须与 `stats.h` 完全一致，包括 `const`。

### 第 2 层
求和：用 `long long s = 0;` 从 `l` 累加到 `r`，返回 `s`。求最小值：先把 `m` 初始化成 `a[l]`（区间里的第一个元素），再从 `l + 1` 开始比较。**不能**把 `m` 初始化为 0——如果区间全是正数，0 根本不在区间里，结果就错了。

### 第 3 层
两个函数各写一个 `for (int i = l; i <= r; i++)`。注意循环条件是 `i <= r` 而不是 `i < r`，否则会漏掉最后一个元素。`range_min` 里比较用 `a[i] < m` 而不是 `<=`（严格小于时保留第一次出现的最小值，本题没有规定相等时取哪个，但 `<` 更自然）。

## 参考代码
```c file=stats.c
#include "stats.h"

long long range_sum(const int *a, int l, int r) {
    long long s = 0;                  /* 必须用 long long：区间和可能到 2×10^12 */
    for (int i = l; i <= r; i++) {    /* 闭区间：i 要取到 r */
        s += a[i];
    }
    return s;
}

int range_min(const int *a, int l, int r) {
    int m = a[l];                     /* 用区间第一个元素初始化，不能是 0 */
    for (int i = l + 1; i <= r; i++) {
        if (a[i] < m) {
            m = a[i];
        }
    }
    return m;
}
```

## 初始代码
```c file=stats.c
#include "stats.h"

long long range_sum(const int *a, int l, int r) {
    (void)a;
    (void)l;
    (void)r;
    return 0;
}

int range_min(const int *a, int l, int r) {
    (void)a;
    (void)l;
    (void)r;
    return 0;
}
```

## 测试驱动
```c file=stats.h
#ifndef STATS_H
#define STATS_H

/* 区间 [l, r] 的和；数组只读，函数不得修改它 */
long long range_sum(const int *a, int l, int r);
/* 区间 [l, r] 的最小值 */
int range_min(const int *a, int l, int r);

#endif
```

```c file=harness.c hidden
#include <stdio.h>
#include "stats.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 2000) {
        return 0;
    }

    int a[2000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }

    for (int k = 0; k < q; k++) {
        int l, r;
        if (scanf("%d %d", &l, &r) != 2) {
            return 0;
        }
        printf("%lld %d\n", range_sum(a, l, r), range_min(a, l, r));
    }
    return 0;
}
```

## 复杂度
时间：每次查询 O(r − l + 1)，最坏 O(n)；q 次查询总计 O(q × n) = 2 × 10^6，在 1 秒内绰绰有余。
空间：O(1)，只用了几个临时变量。

## 常见错误
### 函数签名漏掉 const [CE]
头文件里的声明是 `const int *a`，实现却写成 `int *a`。这是两种不同的函数类型，编译器会报 `conflicting types for 'range_sum'`。**签名必须逐字对齐头文件**，`const` 也是签名的一部分。
```c file=stats.c expect=CE
#include "stats.h"

long long range_sum(int *a, int l, int r) {   /* 错：丢了 const */
    long long s = 0;
    for (int i = l; i <= r; i++) {
        s += a[i];
    }
    return s;
}

int range_min(int *a, int l, int r) {         /* 错：丢了 const */
    int m = a[l];
    for (int i = l + 1; i <= r; i++) {
        if (a[i] < m) {
            m = a[i];
        }
    }
    return m;
}
```

### 用 int 累加区间和 [UB]
`int` 最大只能表示约 2.1 × 10^9，而本题的区间和最大是 2 × 10^12。把 `long long s` 写成 `int s` 之后，累加过程会发生有符号整数溢出——这是未定义行为，本平台的检查工具会直接报错。返回类型是 `long long` 也救不了：溢出在**累加时**就已经发生了。
```c file=stats.c expect=UB
#include "stats.h"

long long range_sum(const int *a, int l, int r) {
    int s = 0;                        /* 错：int 装不下 2×10^12 */
    for (int i = l; i <= r; i++) {
        s += a[i];
    }
    return s;
}

int range_min(const int *a, int l, int r) {
    int m = a[l];
    for (int i = l + 1; i <= r; i++) {
        if (a[i] < m) {
            m = a[i];
        }
    }
    return m;
}
```

### 最小值用 0 初始化 [WA]
如果区间里全是正数，`m = 0` 会一直保留下来，而 0 根本不在区间里。必须用区间第一个元素 `a[l]` 初始化。
```c file=stats.c expect=WA
#include "stats.h"

long long range_sum(const int *a, int l, int r) {
    long long s = 0;
    for (int i = l; i <= r; i++) {
        s += a[i];
    }
    return s;
}

int range_min(const int *a, int l, int r) {
    int m = 0;                        /* 错：全为正数时结果永远是 0 */
    for (int i = l; i <= r; i++) {
        if (a[i] < m) {
            m = a[i];
        }
    }
    return m;
}
```

### 循环漏掉右端点 [WA]
`for (int i = l; i < r; i++)` 只统计到 `r - 1`，当 `l == r` 时循环一次都不执行，和会变成 0。闭区间的循环条件必须是 `i <= r`。
```c file=stats.c expect=WA
#include "stats.h"

long long range_sum(const int *a, int l, int r) {
    long long s = 0;
    for (int i = l; i < r; i++) {     /* 错：漏掉 a[r] */
        s += a[i];
    }
    return s;
}

int range_min(const int *a, int l, int r) {
    int m = a[l];
    for (int i = l + 1; i < r; i++) { /* 错：漏掉 a[r] */
        if (a[i] < m) {
            m = a[i];
        }
    }
    return m;
}
```

### 只实现了一个函数，另一个忘了写 [CE]
函数实现题会把你写的 `stats.c` 和隐藏的 `main` 一起链接。少写一个函数，编译阶段一切正常（头文件里有声明就够了），链接阶段才会报 `undefined symbol: range_min`。提交前对照头文件数一遍：声明了几个函数，就要定义几个。
```c file=stats.c expect=CE
#include "stats.h"

long long range_sum(const int *a, int l, int r) {
    long long s = 0;
    for (int i = l; i <= r; i++) {
        s += a[i];
    }
    return s;
}

/* 这里少了 range_min 的定义：链接器找不到它 */
```

## 测试用例
### 01 sample 示例 1
```in
5
3 -7 12 0 -7
3
0 4
1 3
2 2
```
```out
1 -7
5 -7
12 12
```

### 02 sample 示例 2
```in
1
-1000000000
1
0 0
```
```out
-1000000000 -1000000000
```

### 03 degenerate 全为 0、单点查询
```in
3
0 0 0
2
0 2
1 1
```
```out
0 0
0 0
```

### 04 trap 正负相间，前缀和最容易被 int 撑爆
```in
5
-1000000000 1000000000 -1000000000 1000000000 -5
3
0 1
0 4
1 3
```
```out
0 -1000000000
-5 -1000000000
1000000000 -1000000000
```

### 05 normal 一般数据
```in
6
10 -20 30 -40 50 -60
4
0 5
2 4
3 3
1 2
```
```out
-30 -60
40 -40
-40 -40
10 -20
```

### 06 boundary 最大值在首位、最小值在末位
```in
4
1000000000 5 4 -1000000000
2
0 3
0 1
```
```out
9 -1000000000
1000000005 5
```

### 07 trap 全负数，和为负数且超出 int 范围
```in
5
-1 -2 -3 -4 -1000000000
3
0 4
0 0
4 4
```
```out
-1000000010 -1000000000
-1 -1
-1000000000 -1000000000
```

### 生成 boundary 大规模：2000 个 10^9，多次查询
```js gen
const n = 2000;
const a = [];
for (let i = 0; i < n; i++) a.push(1000000000);

/* 查询：整个区间、单点、以及中间若干段 */
const queries = [[0, 1999], [0, 0], [1999, 1999], [500, 1499]];
let input = `${n}\n${a.join(' ')}\n${queries.length}\n`;
for (const [l, r] of queries) input += `${l} ${r}\n`;

let output = '';
for (const [l, r] of queries) {
  output += `${(r - l + 1) * 1000000000} 1000000000\n`;
}
return [{ kind: 'boundary', category: '最大规模：2000 个 10^9 + 多种区间', input, output }];
```
