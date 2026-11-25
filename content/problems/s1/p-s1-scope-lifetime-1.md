---json
{
  "id": "p-s1-scope-lifetime-1",
  "title": "求最大连续子段和：哪些变量必须跨越循环保存",
  "difficulty": "L3",
  "knowledgePoints": ["s1-scope-lifetime", "s1-loop-patterns"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
给定 n 个整数，从中选出**连续的、至少一个**数，使它们的和最大，输出这个最大和。

例如 `-2 1 -3 4 -1 2 1 -5 4` 中，`4 -1 2 1` 的和 6 最大。

## 输入格式
第一行一个整数 n；第二行 n 个整数。

## 输出格式
一行，最大连续子段和。

## 数据范围
1 ≤ n ≤ 100000；每个数 x 满足 -1000000000 ≤ x ≤ 1000000000

## 示例
### 示例 1
```in
9
-2 1 -3 4 -1 2 1 -5 4
```
```out
6
```

### 示例 2（边界：全部是负数）
```in
3
-3 -1 -2
```
```out
-1
```

## 提示
### 第 1 层
枚举所有区间需要 O(n²)，n = 10⁵ 时会超时。能不能一边读一边算？对每个位置 i，"以第 i 个数结尾的最大子段和"是多少？

### 第 2 层
设 cur 为"以当前数结尾的最大子段和"。读到新的数 x 时：要么接在前面的子段后面（cur + x），要么从 x 重新开始（x），取较大者。再用 best 记录所有 cur 中的最大值。这两个变量都必须**在循环之外声明**，否则每一轮都会被重新创建。

### 第 3 层
用第一个数初始化 `cur = best = x`（不能初始化为 0，否则全负数时答案会错成 0）。和最大可达 10¹⁴，用 `long long`。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1) {
        return 0;
    }
    long long x;
    if (scanf("%lld", &x) != 1) {
        return 0;
    }
    /* cur、best 要跨越整个循环保存，所以声明在循环外；用第一个数初始化 */
    long long cur = x, best = x;
    for (int i = 1; i < n; i++) {
        if (scanf("%lld", &x) != 1) {
            return 0;
        }
        cur = (cur + x > x) ? cur + x : x;   /* 接在后面，或者从 x 重新开始 */
        if (cur > best) {
            best = cur;
        }
    }
    printf("%lld\n", best);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1) {
        return 0;
    }
    /* 一边读一边计算最大连续子段和 */

    return 0;
}
```

## 复杂度
时间 O(n)，空间 O(1)。这个方法叫 Kadane 算法，是"动态规划"思想的入门例子。

## 常见错误
### cur 声明在循环体里 [WA]
`long long cur = ...;` 写在 for 里面，每一轮都是一个全新的变量，"之前累积的和"根本保存不下来，结果只是单个最大的数。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1) {
        return 0;
    }
    long long best = -2000000000000000000LL;
    for (int i = 0; i < n; i++) {
        long long x;
        if (scanf("%lld", &x) != 1) {
            return 0;
        }
        long long cur = 0;
        cur = (cur + x > x) ? cur + x : x;
        if (cur > best) {
            best = cur;
        }
    }
    printf("%lld\n", best);
    return 0;
}
```

### best 初始化为 0 [WA]
所有数都是负数时，最大子段和应该是最大的那个负数，而不是 0（题目要求至少选一个数）。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1) {
        return 0;
    }
    long long cur = 0, best = 0;
    for (int i = 0; i < n; i++) {
        long long x;
        if (scanf("%lld", &x) != 1) {
            return 0;
        }
        cur = (cur + x > x) ? cur + x : x;
        if (cur > best) {
            best = cur;
        }
    }
    printf("%lld\n", best);
    return 0;
}
```

### 用 int 保存和 [UB]
三个 10⁹ 相加就超过了 `int`。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1) {
        return 0;
    }
    int x;
    if (scanf("%d", &x) != 1) {
        return 0;
    }
    int cur = x, best = x;
    for (int i = 1; i < n; i++) {
        if (scanf("%d", &x) != 1) {
            return 0;
        }
        cur = (cur + x > x) ? cur + x : x;
        if (cur > best) {
            best = cur;
        }
    }
    printf("%d\n", best);
    return 0;
}
```

### 枚举所有区间 [TLE]
两重循环枚举起点和终点，n = 10⁵ 时需要约 5 × 10⁹ 次运算。

## 测试用例
### 01 sample 示例 1
```in
9
-2 1 -3 4 -1 2 1 -5 4
```
```out
6
```

### 02 sample 示例 2
```in
3
-3 -1 -2
```
```out
-1
```

### 03 degenerate 只有一个负数
```in
1
-5
```
```out
-5
```

### 04 degenerate 全部为 0
```in
3
0 0 0
```
```out
0
```

### 05 trap 和超出 int
```in
3
1000000000 1000000000 1000000000
```
```out
3000000000
```

### 06 trap 中间有很大的负数，要重新开始
```in
3
5 -100 5
```
```out
5
```

### 07 boundary 取值范围的两端
```in
4
-1000000000 1000000000 -1 1000000000
```
```out
1999999999
```

### 08 normal 跨越负数更优
```in
5
2 -1 2 -1 2
```
```out
4
```

### 生成 boundary 最大规模
```js gen
// n = 100000 的随机数据；用 BigInt 独立计算 Kadane 的结果
const n = 100000, xs = [];
for (let i = 0; i < n; i++) xs.push(rng.int(-1000000000, 1000000000));
let cur = BigInt(xs[0]), best = cur;
for (let i = 1; i < n; i++) {
  const x = BigInt(xs[i]);
  cur = cur + x > x ? cur + x : x;
  if (cur > best) best = cur;
}
return [{ kind: 'boundary', category: '最大规模 n = 100000', input: `${n}\n${xs.join(' ')}\n`, output: `${best}\n` }];
```
