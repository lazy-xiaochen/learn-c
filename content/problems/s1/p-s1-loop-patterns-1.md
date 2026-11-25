---json
{
  "id": "p-s1-loop-patterns-1",
  "title": "用辗转相除法求最大公约数与最小公倍数",
  "difficulty": "L2",
  "knowledgePoints": ["s1-loop-patterns"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入两个非负整数 a 和 b，输出它们的最大公约数 gcd 和最小公倍数 lcm。

约定：gcd(a, 0) = a；两个数都是 0 时 gcd 为 0；只要有一个数是 0，lcm 就是 0。

## 输入格式
一行，两个整数 a 和 b。

## 输出格式
一行，格式为 `gcd=<最大公约数> lcm=<最小公倍数>`。

## 数据范围
0 ≤ a, b ≤ 2147483647

## 示例
### 示例 1
```in
12 18
```
```out
gcd=6 lcm=36
```

### 示例 2（边界：其中一个数为 0）
```in
0 5
```
```out
gcd=5 lcm=0
```

## 提示
### 第 1 层
从 min(a, b) 往下逐个试，对很大的两个互质的数要试二十多亿次，会超时。有没有更快的办法？

### 第 2 层
辗转相除法：gcd(a, b) = gcd(b, a mod b)，当 b 变成 0 时，a 就是答案。最小公倍数 lcm = a × b / gcd，但 a × b 最大约 4.6 × 10¹⁸，超出 `int`，而且在 `int` 下做乘法会溢出。

### 第 3 层
`while (b != 0) { int r = a % b; a = b; b = r; }`。求 lcm 时先除后乘：`(long long)a0 / g * b0`（a0、b0 是原来的值），这样中间结果不会比最终答案更大。g 为 0 时不能做除法。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2 || a < 0 || b < 0) {
        return 0;
    }
    int x = a, y = b;          /* 保留原值，辗转相除会改变 x、y */
    while (y != 0) {
        int r = x % y;
        x = y;
        y = r;
    }
    int g = x;
    /* 先除后乘，并在 long long 下进行：a / g * b 不超过最终答案，不会溢出 */
    long long lcm = (g == 0) ? 0 : (long long)a / g * b;
    printf("gcd=%d lcm=%lld\n", g, lcm);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2 || a < 0 || b < 0) {
        return 0;
    }
    /* 求 gcd 与 lcm */

    return 0;
}
```

## 复杂度
辗转相除法的循环次数是 O(log min(a, b))，即使对 2³¹ 量级的数也只需要几十次。空间 O(1)。

## 常见错误
### lcm 用 int 计算 [UB]
`a * b` 在 `int` 下溢出（有符号溢出是未定义行为）。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2 || a < 0 || b < 0) {
        return 0;
    }
    int x = a, y = b;
    while (y != 0) {
        int r = x % y;
        x = y;
        y = r;
    }
    int lcm = (x == 0) ? 0 : a * b / x;
    printf("gcd=%d lcm=%d\n", x, lcm);
    return 0;
}
```

### 从大到小逐个试除求 gcd [TLE]
两个很大且互质的数，要从 21 亿一直试到 1。
```c file=main.c expect=TLE
#include <stdio.h>

int main(void) {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2 || a < 0 || b < 0) {
        return 0;
    }
    int g = 0;
    if (a == 0 || b == 0) {
        g = a + b;
    } else {
        for (int d = a < b ? a : b; d >= 1; d--) {
            if (a % d == 0 && b % d == 0) {
                g = d;
                break;
            }
        }
    }
    long long lcm = (g == 0) ? 0 : (long long)a / g * b;
    printf("gcd=%d lcm=%lld\n", g, lcm);
    return 0;
}
```

### 没有处理两个数都是 0 [UB]
g 为 0 时 `a / g` 是除以零。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2 || a < 0 || b < 0) {
        return 0;
    }
    int x = a, y = b;
    while (y != 0) {
        int r = x % y;
        x = y;
        y = r;
    }
    long long lcm = (long long)a / x * b;
    printf("gcd=%d lcm=%lld\n", x, lcm);
    return 0;
}
```

### 辗转之后用已经变化的 a、b 求 lcm [WA]
如果直接在 a、b 上做辗转相除，循环结束后 b 是 0，用它们算出的 lcm 是错的。先保存原值。

## 测试用例
### 01 sample 示例 1
```in
12 18
```
```out
gcd=6 lcm=36
```

### 02 sample 示例 2
```in
0 5
```
```out
gcd=5 lcm=0
```

### 03 degenerate 两个都是 0
```in
0 0
```
```out
gcd=0 lcm=0
```

### 04 trap 两个大数互质（a × b 超出 int；逐个试除会超时）
```in
2147483647 2147483646
```
```out
gcd=1 lcm=4611686011984936962
```

### 05 degenerate 两个数相同
```in
7 7
```
```out
gcd=7 lcm=7
```

### 06 boundary 与 1 求
```in
2147483647 1
```
```out
gcd=1 lcm=2147483647
```

### 07 boundary 最小正数
```in
1 1
```
```out
gcd=1 lcm=1
```

### 08 trap 两个大质数
```in
1000000007 998244353
```
```out
gcd=1 lcm=998244359987710471
```

### 09 normal 一个数是另一个数的倍数
```in
2147483646 1073741823
```
```out
gcd=1073741823 lcm=2147483646
```

### 10 normal 一般情况
```in
48 180
```
```out
gcd=12 lcm=720
```
