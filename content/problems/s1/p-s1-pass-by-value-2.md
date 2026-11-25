---json
{
  "id": "p-s1-pass-by-value-2",
  "title": "编写复利计算函数：注意形参类型对实参的转换",
  "difficulty": "L2",
  "knowledgePoints": ["s1-pass-by-value", "s1-float-types"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
本金 P 元存入银行，年利率为 r%（按年复利），存 n 年后的本息合计为

P × (1 + r / 100)ⁿ

读入 P、r、n，输出本息合计，保留两位小数。

请写一个函数完成计算，例如 `double compound(double principal, double rate_percent, int years)`，并在 main 中调用。

## 输入格式
一行：整数 P、实数 r（最多两位小数）、整数 n。

## 输出格式
一行，本息合计，保留两位小数。

## 数据范围
0 ≤ P ≤ 1000000，0 ≤ r ≤ 100，0 ≤ n ≤ 50，保证结果不超过 10¹⁰。

## 示例
### 示例 1
```in
1000 5 2
```
```out
1102.50
```

### 示例 2（边界：存 0 年）
```in
1000 3.5 0
```
```out
1000.00
```

## 提示
### 第 1 层
利率可能是 3.5 这样的小数。函数的每个形参应该用什么类型？

### 第 2 层
调用函数时，实参会被**转换成形参的类型**。如果把利率形参声明成 `int`，传进去的 3.5 会被截断成 3。另外 `r / 100` 中如果 r 是整数，就是整数除法。

### 第 3 层
形参用 `double`；函数里用循环把 `1 + rate_percent / 100.0` 连乘 years 次（也可以用 `<math.h>` 的 `pow`）；输出用 `%.2f`；读入 r 用 `%lf`。

## 参考代码
```c file=main.c
#include <stdio.h>

/* 利率形参必须是 double：实参 3.5 传给 int 形参会被截断成 3 */
double compound(double principal, double rate_percent, int years) {
    double factor = 1 + rate_percent / 100.0;
    double amount = principal;
    for (int i = 0; i < years; i++) {
        amount *= factor;
    }
    return amount;
}

int main(void) {
    int p, n;
    double r;
    if (scanf("%d %lf %d", &p, &r, &n) != 3) {
        return 0;
    }
    printf("%.2f\n", compound(p, r, n));
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

double compound(double principal, double rate_percent, int years) {
    /* 返回本息合计 */
    return principal;
}

int main(void) {
    int p, n;
    double r;
    if (scanf("%d %lf %d", &p, &r, &n) != 3) {
        return 0;
    }
    printf("%.2f\n", compound(p, r, n));
    return 0;
}
```

## 复杂度
时间 O(n)，空间 O(1)。

## 常见错误
### 利率形参声明成 int [WA]
`double compound(double principal, int rate_percent, int years)`：调用时实参 3.5 被转换成 3，利率被悄悄改掉了。（`-Wconversion` 会对此给出警告。）
```c file=main.c expect=WA
#include <stdio.h>

double compound(double principal, int rate_percent, int years) {
    double factor = 1 + rate_percent / 100.0;
    double amount = principal;
    for (int i = 0; i < years; i++) {
        amount *= factor;
    }
    return amount;
}

int main(void) {
    int p, n;
    double r;
    if (scanf("%d %lf %d", &p, &r, &n) != 3) {
        return 0;
    }
    printf("%.2f\n", compound(p, r, n));
    return 0;
}
```

### 利率读成整数后再除以 100 [WA]
`int r; ... 1 + r / 100` 中 `r / 100` 是整数除法，利率小于 100% 时结果都是 0。
```c file=main.c expect=WA
#include <stdio.h>

double compound(int principal, int rate_percent, int years) {
    double amount = principal;
    for (int i = 0; i < years; i++) {
        amount *= 1 + rate_percent / 100;
    }
    return amount;
}

int main(void) {
    int p, r, n;
    if (scanf("%d %d %d", &p, &r, &n) != 3) {
        return 0;
    }
    printf("%.2f\n", compound(p, r, n));
    return 0;
}
```

### 用 float 计算 [WA]
float 只有约 7 位有效数字，91 亿这样的结果连个位都不准确，更不用说小数点后两位。
```c file=main.c expect=WA
#include <stdio.h>

float compound(float principal, float rate_percent, int years) {
    float factor = 1 + rate_percent / 100.0f;
    float amount = principal;
    for (int i = 0; i < years; i++) {
        amount *= factor;
    }
    return amount;
}

int main(void) {
    int p, n;
    float r;
    if (scanf("%d %f %d", &p, &r, &n) != 3) {
        return 0;
    }
    printf("%.2f\n", compound(p, r, n));
    return 0;
}
```

### 用 %f 读入 double [WA]
`scanf("%f", &r)` 中 r 是 double 时，只写入了 4 个字节，r 的值是错的。double 必须用 `%lf`。

## 测试用例
### 01 sample 示例 1
```in
1000 5 2
```
```out
1102.50
```

### 02 sample 示例 2
```in
1000 3.5 0
```
```out
1000.00
```

### 03 boundary 最大本金、20% 利率、50 年（结果约 91 亿）
```in
1000000 20 50
```
```out
9100438150.00
```

### 04 degenerate 本金为 0
```in
0 10 10
```
```out
0.00
```

### 05 degenerate 利率为 0
```in
1 0 50
```
```out
1.00
```

### 06 trap 小数利率（int 形参会截断）
```in
1000 3.5 10
```
```out
1410.60
```

### 07 trap 利率小于 1%（整数除法会得到 0）
```in
500 0.5 3
```
```out
507.54
```

### 08 boundary 利率 100%
```in
100 100 1
```
```out
200.00
```

### 09 normal 一般情况
```in
123456 7.25 15
```
```out
352753.81
```

### 10 normal 很小的利率、很长的时间
```in
1000000 0.01 50
```
```out
1005012.27
```
