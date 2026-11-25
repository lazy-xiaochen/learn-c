---json
{
  "id": "p-s1-func-basics-2",
  "title": "实现组合数函数 binom(n, k)，n 最大为 60",
  "difficulty": "L2",
  "knowledgePoints": ["s1-func-basics", "s1-loops"],
  "special": "interface-impl",
  "judge": { "mode": "function", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
实现头文件 `binom.h` 中声明的函数：

```c
long long binom(int n, int k);   /* 返回组合数 C(n, k)，即从 n 个不同元素中选出 k 个的方案数 */
```

C(n, k) = n! / (k! × (n − k)!)。保证 0 ≤ k ≤ n ≤ 60，此时结果一定在 `long long` 范围内（最大的 C(60, 30) ≈ 1.18 × 10¹⁷）。

隐藏的 main 函数会读入若干组 n、k，调用你的函数并输出结果。

## 输入格式
（由隐藏的 main 读取）第一行是组数 q；接下来 q 行，每行两个整数 n、k。

## 输出格式
（由隐藏的 main 输出）每组输出一行 C(n, k)。

## 数据范围
1 ≤ q ≤ 2000；0 ≤ k ≤ n ≤ 60

## 示例
### 示例 1
```in
3
5 2
10 3
0 0
```
```out
10
120
1
```

### 示例 2（边界：最大的组合数）
```in
3
60 30
60 0
60 60
```
```out
118264581564861424
1
1
```

## 提示
### 第 1 层
先分别算出 n!、k!、(n − k)! 再相除，看起来最直接。但 60! 有多大？`long long` 最多只能装下 20!。

### 第 2 层
C(n, k) = (n − k + 1)/1 × (n − k + 2)/2 × … × n/k。如果按顺序**先乘后除**，每一步的结果都恰好是一个组合数 C(n − k + i, i)，所以除法总是整除，中间值也不会太大。

### 第 3 层
`long long r = 1; for (int i = 1; i <= k; i++) r = r * (n - k + i) / i;`。注意必须"先乘后除"——先除可能除不尽。可以先令 `k = min(k, n − k)` 减少循环次数。

## 参考代码
```c file=solution.c
#include "binom.h"

long long binom(int n, int k) {
    if (k > n - k) {
        k = n - k;            /* C(n, k) = C(n, n-k)，取较小的 k */
    }
    long long r = 1;
    for (int i = 1; i <= k; i++) {
        /* 循环开始时 r = C(n-k+i-1, i-1)；乘以 (n-k+i) 后一定能被 i 整除，
           结果是 C(n-k+i, i)。中间值最大约 i × C(60,30)，在 long long 范围内 */
        r = r * (n - k + i) / i;
    }
    return r;
}
```

## 初始代码
```c file=solution.c
#include "binom.h"

long long binom(int n, int k) {
    /* 返回 C(n, k) */
    return 0;
}
```

## 测试驱动
```c file=binom.h
#ifndef BINOM_H
#define BINOM_H

long long binom(int n, int k);

#endif
```

```c file=harness.c hidden
#include <stdio.h>
#include "binom.h"

int main(void) {
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int n, k;
        if (scanf("%d %d", &n, &k) != 2) {
            return 0;
        }
        printf("%lld\n", binom(n, k));
    }
    return 0;
}
```

## 复杂度
每次调用 O(min(k, n − k)) 次乘除法，空间 O(1)。

## 常见错误
### 先算阶乘再相除 [UB]
21! ≈ 5.1 × 10¹⁹ 已经超出 `long long` 的范围，计算阶乘时发生有符号溢出。
```c file=solution.c expect=UB
#include "binom.h"

static long long fact(int n) {
    long long r = 1;
    for (int i = 2; i <= n; i++) {
        r *= i;
    }
    return r;
}

long long binom(int n, int k) {
    return fact(n) / (fact(k) * fact(n - k));
}
```

### 先除后乘 [WA]
`r / i * (n - k + i)` 中 `r / i` 不一定能整除，整数除法丢掉的余数会让结果偏小。
```c file=solution.c expect=WA
#include "binom.h"

long long binom(int n, int k) {
    if (k > n - k) {
        k = n - k;
    }
    long long r = 1;
    for (int i = 1; i <= k; i++) {
        r = r / i * (n - k + i);
    }
    return r;
}
```

### 用 int 保存中间结果 [UB]
C(34, 17) = 2333606220 已经超出 `int`。
```c file=solution.c expect=UB
#include "binom.h"

long long binom(int n, int k) {
    if (k > n - k) {
        k = n - k;
    }
    int r = 1;
    for (int i = 1; i <= k; i++) {
        r = r * (n - k + i) / i;
    }
    return r;
}
```

### 用 double 计算再转换 [WA]
double 只有约 16 位有效数字，C(60, 30) 有 18 位，转换回整数时最后几位是错的。

## 测试用例
### 01 sample 示例 1
```in
3
5 2
10 3
0 0
```
```out
10
120
1
```

### 02 sample 示例 2
```in
3
60 30
60 0
60 60
```
```out
118264581564861424
1
1
```

### 03 trap 超过 20!（阶乘法会溢出）
```in
3
21 10
25 12
30 15
```
```out
352716
5200300
155117520
```

### 04 degenerate k 为 0 或 n
```in
3
1 0
1 1
7 7
```
```out
1
1
1
```

### 05 boundary 接近最大值
```in
3
40 20
50 25
59 29
```
```out
137846528820
126410606437752
59132290782430712
```

### 06 trap 先除后乘除不尽
```in
2
13 6
20 10
```
```out
1716
184756
```

### 生成 boundary 最大规模
```js gen
// 2000 组随机 (n, k)，用 BigInt 独立计算期望值
const C = (n, k) => { let r = 1n; for (let i = 1n; i <= BigInt(k); i++) r = r * (BigInt(n) - BigInt(k) + i) / i; return r; };
const q = 2000, lines = [String(q)], out = [];
for (let i = 0; i < q; i++) {
  const n = rng.int(0, 60), k = rng.int(0, n);
  lines.push(`${n} ${k}`);
  out.push(C(n, k).toString());
}
return [{ kind: 'boundary', category: '最大规模 q = 2000', input: lines.join('\n') + '\n', output: out.join('\n') + '\n' }];
```
