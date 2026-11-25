---json
{
  "id": "p-s1-assign-comma-1",
  "title": "按步骤执行自增与复合赋值，输出各变量的最终值",
  "difficulty": "L2",
  "knowledgePoints": ["s1-assign-comma"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入两个整数 i 和 j，然后**严格按顺序**执行下面 6 个步骤：

1. k 取 i **自增之前**的值，并让 i 加 1；
2. 让 j 加 1，m 取 j **自增之后**的值；
3. i 增加 m；
4. j 乘以 k；
5. i 减 1；
6. r 取 j − i 的值。

最后输出 i、j、k、m、r 的值。

请尽量用自增、自减和复合赋值运算符（`++`、`--`、`+=`、`*=`）完成，每个步骤写成一条语句。

## 输入格式
一行，两个整数 i 和 j。

## 输出格式
一行，格式为 `i=<i> j=<j> k=<k> m=<m> r=<r>`。

## 数据范围
-1000000000 ≤ i, j ≤ 1000000000

## 示例
### 示例 1
```in
3 5
```
```out
i=9 j=18 k=3 m=6 r=9
```
> 步骤 1：k = 3，i = 4；步骤 2：j = 6，m = 6；步骤 3：i = 10；步骤 4：j = 18；步骤 5：i = 9；步骤 6：r = 18 − 9 = 9。

### 示例 2（边界：全为 0）
```in
0 0
```
```out
i=1 j=0 k=0 m=1 r=-1
```

## 提示
### 第 1 层
步骤 1 和步骤 2 分别对应前置还是后置自增？

### 第 2 层
"取自增之前的值"是后置 `k = i++`；"取自增之后的值"是前置 `m = ++j`。然后估算一下数值范围：步骤 3 之后 i 可能达到约 2 × 10⁹，步骤 4 之后 j 可能达到约 10¹⁸。

### 第 3 层
所有变量都用 `long long`（读写用 `%lld`）。六条语句依次是 `k = i++;`、`m = ++j;`、`i += m;`、`j *= k;`、`i--;`、`r = j - i;`。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    long long i, j;   /* i += m 可能超过 int；j *= k 可能达到 10^18 */
    if (scanf("%lld %lld", &i, &j) != 2) {
        return 0;
    }
    long long k = i++;   /* 后置：k 取旧值 */
    long long m = ++j;   /* 前置：m 取新值 */
    i += m;
    j *= k;
    i--;
    long long r = j - i;
    printf("i=%lld j=%lld k=%lld m=%lld r=%lld\n", i, j, k, m, r);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    /* 读入 i、j，按题目的 6 个步骤计算，输出结果 */

    return 0;
}
```

## 复杂度
O(1)。本题考查前置与后置自增表达式的值、复合赋值，以及中间结果的范围估算。

## 常见错误
### 用 int 存放 [UB]
i 和 j 都接近 10⁹ 时，`i += m` 的结果约为 2 × 10⁹，超出 `int`；`j *= k` 更是可能达到 10¹⁸。有符号溢出是未定义行为。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    int i, j;
    if (scanf("%d %d", &i, &j) != 2) {
        return 0;
    }
    int k = i++;
    int m = ++j;
    i += m;
    j *= k;
    i--;
    int r = j - i;
    printf("i=%d j=%d k=%d m=%d r=%d\n", i, j, k, m, r);
    return 0;
}
```

### 步骤 1 用了前置自增 [WA]
`k = ++i` 让 k 得到自增之后的值，与题目要求相反。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    long long i, j;
    if (scanf("%lld %lld", &i, &j) != 2) {
        return 0;
    }
    long long k = ++i;
    long long m = ++j;
    i += m;
    j *= k;
    i--;
    long long r = j - i;
    printf("i=%lld j=%lld k=%lld m=%lld r=%lld\n", i, j, k, m, r);
    return 0;
}
```

### 步骤 2 用了后置自增 [WA]
`m = j++` 让 m 得到的是自增之前的值。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    long long i, j;
    if (scanf("%lld %lld", &i, &j) != 2) {
        return 0;
    }
    long long k = i++;
    long long m = j++;
    i += m;
    j *= k;
    i--;
    long long r = j - i;
    printf("i=%lld j=%lld k=%lld m=%lld r=%lld\n", i, j, k, m, r);
    return 0;
}
```

### 把多个步骤挤进一个表达式 [UB]
例如 `i += (k = i++)`：同一个表达式里对 i 有两次无序的修改，这是未定义行为，不同编译器、不同优化级别的结果可能不同。每个步骤单独写一条语句。

## 测试用例
### 01 sample 示例 1
```in
3 5
```
```out
i=9 j=18 k=3 m=6 r=9
```

### 02 sample 示例 2
```in
0 0
```
```out
i=1 j=0 k=0 m=1 r=-1
```

### 03 boundary 两个最大值（i += m 超出 int）
```in
1000000000 1000000000
```
```out
i=2000000001 j=1000000001000000000 k=1000000000 m=1000000001 r=999999998999999999
```

### 04 boundary 两个最小值
```in
-1000000000 -1000000000
```
```out
i=-1999999999 j=999999999000000000 k=-1000000000 m=-999999999 r=1000000000999999999
```

### 05 degenerate j 自增后为 0
```in
1 -1
```
```out
i=1 j=0 k=1 m=0 r=-1
```

### 06 degenerate i 自增后为 0
```in
-1 0
```
```out
i=0 j=-1 k=-1 m=1 r=-1
```

### 07 trap 乘积约 10^10，超出 int
```in
100000 100000
```
```out
i=200001 j=10000100000 k=100000 m=100001 r=9999899999
```

### 08 trap 乘积为 -10^18
```in
-1000000000 999999999
```
```out
i=0 j=-1000000000000000000 k=-1000000000 m=1000000000 r=-1000000000000000000
```

### 09 normal 一般情况
```in
7 -3
```
```out
i=5 j=-14 k=7 m=-2 r=-19
```

### 10 normal 一般情况
```in
123 456
```
```out
i=580 j=56211 k=123 m=457 r=55631
```
