---json
{
  "id": "p-s1-loop-control-1",
  "title": "判断一个 int 范围内的整数是否为质数",
  "difficulty": "L2",
  "knowledgePoints": ["s1-loop-control", "s1-loops"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入一个整数 n，如果 n 是质数（大于 1，且除了 1 和它本身以外没有其他因数），输出 `yes`，否则输出 `no`。

## 输入格式
一行，一个整数 n。

## 输出格式
一行，`yes` 或 `no`。

## 数据范围
-2147483648 ≤ n ≤ 2147483647

## 示例
### 示例 1
```in
7
```
```out
yes
```

### 示例 2（边界：1 不是质数）
```in
1
```
```out
no
```

## 提示
### 第 1 层
从 2 开始逐个试除。需要试到多大？找到一个因数之后还有必要继续吗？

### 第 2 层
如果 n 有一个大于 √n 的因数 a，那么 n / a 是一个小于 √n 的因数，早就被试出来了，所以只需试到 √n。找到因数后用 `break` 结束循环。n 最大约 2.1 × 10⁹，试到 n 本身要循环二十多亿次，会超时。

### 第 3 层
循环条件写成 `i <= n / i`（等价于 i × i ≤ n，但不会溢出）。如果写成 `i * i <= n`，当 i 增长到 46341 时 i × i 超出 `int`，发生有符号溢出。小于 2 的数直接输出 no。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    int prime = n >= 2;   /* 小于 2 的数都不是质数 */
    /* i <= n / i 与 i * i <= n 等价，但不会发生乘法溢出 */
    for (int i = 2; prime && i <= n / i; i++) {
        if (n % i == 0) {
            prime = 0;
            break;        /* 找到一个因数就可以下结论 */
        }
    }
    printf("%s\n", prime ? "yes" : "no");
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    /* 判断 n 是否为质数 */

    return 0;
}
```

## 复杂度
时间 O(√n)：n 接近 2³¹ 时最多试除约 46341 次。空间 O(1)。

## 常见错误
### 循环条件写成 i * i <= n [UB]
n 为质数 2147483647 时，循环一直进行到 i = 46341，此时 i × i = 2147488281 超出 `int`，发生有符号溢出。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    int prime = n >= 2;
    for (int i = 2; prime && i * i <= n; i++) {
        if (n % i == 0) {
            prime = 0;
            break;
        }
    }
    printf("%s\n", prime ? "yes" : "no");
    return 0;
}
```

### 一直试除到 n [TLE]
对一个很大的质数要循环二十多亿次，远远超过时间限制。
```c file=main.c expect=TLE
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    int prime = n >= 2;
    for (int i = 2; i < n; i++) {
        if (n % i == 0) {
            prime = 0;
            break;
        }
    }
    printf("%s\n", prime ? "yes" : "no");
    return 0;
}
```

### 条件写成 i * i < n（少了等号） [WA]
质数的平方（如 25 = 5 × 5）只有因数 5，而 i = 5 时 5 × 5 < 25 不成立，循环提前结束，25 被误判为质数。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    int prime = n >= 2;
    for (int i = 2; prime && (long long)i * i < n; i++) {
        if (n % i == 0) {
            prime = 0;
            break;
        }
    }
    printf("%s\n", prime ? "yes" : "no");
    return 0;
}
```

### 没有排除 1、0 和负数 [WA]
循环一次都不执行时，标志保持"是质数"，于是 1 被判为质数。

## 测试用例
### 01 sample 示例 1
```in
7
```
```out
yes
```

### 02 sample 示例 2
```in
1
```
```out
no
```

### 03 boundary 最小的质数
```in
2
```
```out
yes
```

### 04 trap int 最大值是质数（i * i 会溢出；试除到 n 会超时）
```in
2147483647
```
```out
yes
```

### 05 boundary 46340 的平方（最大的、不超过 int 的平方数）
```in
2147395600
```
```out
no
```

### 06 trap 质数的平方
```in
25
```
```out
no
```

### 07 degenerate 0
```in
0
```
```out
no
```

### 08 degenerate 负数
```in
-7
```
```out
no
```

### 09 normal 大质数
```in
1000000007
```
```out
yes
```

### 10 normal 大合数（149 × 14411429）
```in
2147302921
```
```out
no
```
