---json
{
  "id": "p-s1-pass-by-value-1",
  "title": "编写快速幂函数，计算 b 的 e 次方对 m 取模",
  "difficulty": "L3",
  "knowledgePoints": ["s1-pass-by-value", "s1-func-basics"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入三个非负整数 b、e、m，输出 bᵉ mod m（b 的 e 次方除以 m 的余数）。约定 0⁰ = 1。

请把计算写成一个函数，例如 `long long power_mod(long long b, long long e, long long m)`，在 main 中调用它。

## 输入格式
一行，三个整数 b、e、m。

## 输出格式
一行，bᵉ mod m 的值。

## 数据范围
0 ≤ b < 2³¹，0 ≤ e ≤ 10⁹，1 ≤ m < 2³¹

## 示例
### 示例 1
```in
2 10 1000
```
```out
24
```
> 2¹⁰ = 1024，1024 mod 1000 = 24。

### 示例 2（边界：指数为 0）
```in
5 0 7
```
```out
1
```

## 提示
### 第 1 层
e 最大是 10⁹，乘 10⁹ 次一定超时。怎样用更少的乘法得到 bᵉ？另外 bᵉ 本身是个天文数字，不可能先算出来再取模。

### 第 2 层
**每次乘法后立刻取模**，结果不变：(x × y) mod m = ((x mod m) × (y mod m)) mod m。**快速幂**：e 为偶数时 bᵉ = (b²)^(e/2)；e 为奇数时 bᵉ = b × bᵉ⁻¹。这样每一步 e 至少减半，只需要约 30 步。

### 第 3 层
在函数里直接修改形参（它们只是副本）：`r = 1 % m; b %= m; while (e > 0) { if (e % 2 == 1) r = r * b % m; b = b * b % m; e /= 2; }`。两个小于 2³¹ 的数相乘可能接近 2⁶²，必须用 `long long`。注意 m = 1 时任何数取模都是 0，所以 r 的初值是 `1 % m` 而不是 1。

## 参考代码
```c file=main.c
#include <stdio.h>

/* b、e 是实参的副本，在函数里直接修改它们不会影响调用者 */
long long power_mod(long long b, long long e, long long m) {
    long long r = 1 % m;   /* m = 1 时结果应为 0 */
    b %= m;
    while (e > 0) {
        if (e % 2 == 1) {
            r = r * b % m;     /* 两个小于 2^31 的数相乘小于 2^62，long long 装得下 */
        }
        b = b * b % m;
        e /= 2;
    }
    return r;
}

int main(void) {
    long long b, e, m;
    if (scanf("%lld %lld %lld", &b, &e, &m) != 3 || m <= 0) {
        return 0;
    }
    printf("%lld\n", power_mod(b, e, m));
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

long long power_mod(long long b, long long e, long long m) {
    /* 返回 b^e mod m */
    return 0;
}

int main(void) {
    long long b, e, m;
    if (scanf("%lld %lld %lld", &b, &e, &m) != 3 || m <= 0) {
        return 0;
    }
    printf("%lld\n", power_mod(b, e, m));
    return 0;
}
```

## 复杂度
时间 O(log e)（约 30 次循环），空间 O(1)。逐次相乘的写法是 O(e)，e = 10⁹ 时会超时。

## 常见错误
### 循环 e 次逐个相乘 [TLE]
```c file=main.c expect=TLE
#include <stdio.h>

long long power_mod(long long b, long long e, long long m) {
    long long r = 1 % m;
    b %= m;
    for (long long i = 0; i < e; i++) {
        r = r * b % m;
    }
    return r;
}

int main(void) {
    long long b, e, m;
    if (scanf("%lld %lld %lld", &b, &e, &m) != 3 || m <= 0) {
        return 0;
    }
    printf("%lld\n", power_mod(b, e, m));
    return 0;
}
```

### 用 int 做乘法 [UB]
两个接近 2³¹ 的数相乘，在 `int` 下溢出。
```c file=main.c expect=UB
#include <stdio.h>

int power_mod(int b, int e, int m) {
    int r = 1 % m;
    b %= m;
    while (e > 0) {
        if (e % 2 == 1) {
            r = r * b % m;
        }
        b = b * b % m;
        e /= 2;
    }
    return r;
}

int main(void) {
    int b, e, m;
    if (scanf("%d %d %d", &b, &e, &m) != 3 || m <= 0) {
        return 0;
    }
    printf("%d\n", power_mod(b, e, m));
    return 0;
}
```

### 结果初始化为 1 而不是 1 % m [WA]
m = 1 时，e = 0 的情况下循环不执行，函数返回 1，但任何数对 1 取模都应该是 0。
```c file=main.c expect=WA
#include <stdio.h>

long long power_mod(long long b, long long e, long long m) {
    long long r = 1;
    b %= m;
    while (e > 0) {
        if (e % 2 == 1) {
            r = r * b % m;
        }
        b = b * b % m;
        e /= 2;
    }
    return r;
}

int main(void) {
    long long b, e, m;
    if (scanf("%lld %lld %lld", &b, &e, &m) != 3 || m <= 0) {
        return 0;
    }
    printf("%lld\n", power_mod(b, e, m));
    return 0;
}
```

### 写成 void 函数，想通过修改参数"带回"结果 [WA]
例如 `void power_mod(long long r, long long b, long long e, long long m)`，在函数里把结果算进 r，然后在 main 里输出 r。形参 r 只是副本，函数返回后 main 中的变量没有任何变化。结果只能通过返回值带回（或者学完指针后传地址）。

（反过来，也不必担心"在函数里修改 b、e 会破坏 main 中的变量"——形参本来就是副本，可以放心修改。）

## 测试用例
### 01 sample 示例 1
```in
2 10 1000
```
```out
24
```

### 02 sample 示例 2
```in
5 0 7
```
```out
1
```

### 03 degenerate 0 的 0 次方对 1 取模
```in
0 0 1
```
```out
0
```

### 04 trap 底数和模都接近 2^31（乘积超出 int）
```in
2147483646 1000000000 2147483647
```
```out
1
```

### 05 boundary 最大指数（逐个相乘会超时）
```in
3 1000000000 1000000007
```
```out
235939645
```

### 06 degenerate 底数为 0
```in
0 5 13
```
```out
0
```

### 07 boundary 模为 2
```in
1 1000000000 2
```
```out
1
```

### 08 trap 结果恰好为 0
```in
2 30 1073741824
```
```out
0
```

### 09 normal 一般情况
```in
123456789 987654321 998244353
```
```out
730701112
```

### 10 normal 一般情况
```in
10 18 1000000007
```
```out
49
```
