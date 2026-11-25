---json
{
  "id": "p-s1-arith-ops-2",
  "title": "比较 C 的截断除法与数学上的向下取整除法",
  "difficulty": "L2",
  "knowledgePoints": ["s1-arith-ops"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入两个整数 a 和 b（b ≠ 0），输出一行四个数：

- `q`：C 语言中 `a / b` 的结果（向 0 截断）；
- `r`：C 语言中 `a % b` 的结果；
- `fq`：数学上的**向下取整**除法 ⌊a ÷ b⌋（不大于真实商的最大整数）；
- `m`：**非负**余数，即满足 0 ≤ m < |b| 且 a − m 能被 b 整除的那个 m。

## 输入格式
一行，两个整数 a 和 b。

## 输出格式
一行，格式为 `q=<q> r=<r> fq=<fq> m=<m>`。

## 数据范围
-2147483648 ≤ a, b ≤ 2147483647，b ≠ 0

## 示例
### 示例 1
```in
7 2
```
```out
q=3 r=1 fq=3 m=1
```

### 示例 2（边界：被除数为负）
```in
-7 2
```
```out
q=-3 r=-1 fq=-4 m=1
```
> -7 ÷ 2 = -3.5：C 向 0 截断得 -3，向下取整得 -4。

## 提示
### 第 1 层
C 的 `/` 和 `%` 对负数的规则是什么？向下取整什么时候和向 0 截断不一样？

### 第 2 层
只有当**余数不为 0** 且 **a 与 b 异号**（真实的商是负的非整数）时，向下取整才比截断结果小 1。可以用"余数 r 与 b 的符号不同"来判断。另外注意 `-2147483648 / -1` = 2147483648 超出 `int` 范围（未定义行为，x86 上会崩溃）。

### 第 3 层
用 `long long` 读入和计算。`fq = q`，如果 `r != 0 && ((r < 0) != (b < 0))` 就 `fq = q - 1`。非负余数：令 `mb` 为 |b|，`m = r < 0 ? r + mb : r`。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    long long a, b;   /* 用 long long：INT_MIN / -1 的结果超出 int */
    if (scanf("%lld %lld", &a, &b) != 2 || b == 0) {
        return 0;
    }
    long long q = a / b;   /* 向 0 截断 */
    long long r = a % b;   /* 符号与 a 相同 */

    /* 余数非 0 且与除数异号，说明真实商是负的非整数，向下取整要再减 1 */
    long long fq = q;
    if (r != 0 && ((r < 0) != (b < 0))) {
        fq = q - 1;
    }

    long long mb = b < 0 ? -b : b;   /* |b| */
    long long m = r < 0 ? r + mb : r;

    printf("q=%lld r=%lld fq=%lld m=%lld\n", q, r, fq, m);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    /* 读入 a、b，输出 q、r、fq、m */

    return 0;
}
```

## 复杂度
O(1)。本题考查 C 整数除法"向 0 截断、余数与被除数同号"的规则，以及 `INT_MIN / -1` 溢出这一经典陷阱。

## 常见错误
### 用 int 计算 [UB]
`-2147483648 / -1` 的结果 2147483648 超出 `int` 的范围，是未定义行为；x86 处理器上这条除法指令会直接触发异常让程序崩溃。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2 || b == 0) {
        return 0;
    }
    int q = a / b;
    int r = a % b;
    int fq = q;
    if (r != 0 && ((r < 0) != (b < 0))) {
        fq = q - 1;
    }
    int mb = b < 0 ? -b : b;
    int m = r < 0 ? r + mb : r;
    printf("q=%d r=%d fq=%d m=%d\n", q, r, fq, m);
    return 0;
}
```

### 以为 a % b 一定非负 [WA]
直接把 `a % b` 当作 m 输出，a 为负数时得到的是负数。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    long long a, b;
    if (scanf("%lld %lld", &a, &b) != 2 || b == 0) {
        return 0;
    }
    long long q = a / b, r = a % b;
    long long fq = q;
    if (r != 0 && ((r < 0) != (b < 0))) {
        fq = q - 1;
    }
    printf("q=%lld r=%lld fq=%lld m=%lld\n", q, r, fq, r);
    return 0;
}
```

### a 为负时一律把商减 1 [WA]
能整除时（例如 -6 ÷ 3 = -2）向下取整和截断的结果相同，不应该再减 1；a 为正、b 为负时反而需要减 1。判断依据是"余数非 0 且 a、b 异号"，不是"a 为负"。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    long long a, b;
    if (scanf("%lld %lld", &a, &b) != 2 || b == 0) {
        return 0;
    }
    long long q = a / b, r = a % b;
    long long fq = a < 0 ? q - 1 : q;
    long long mb = b < 0 ? -b : b;
    long long m = r < 0 ? r + mb : r;
    printf("q=%lld r=%lld fq=%lld m=%lld\n", q, r, fq, m);
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
7 2
```
```out
q=3 r=1 fq=3 m=1
```

### 02 sample 示例 2
```in
-7 2
```
```out
q=-3 r=-1 fq=-4 m=1
```

### 03 normal 除数为负
```in
7 -2
```
```out
q=-3 r=1 fq=-4 m=1
```

### 04 normal 两个都为负
```in
-7 -2
```
```out
q=3 r=-1 fq=3 m=1
```

### 05 trap INT_MIN / -1 超出 int 范围
```in
-2147483648 -1
```
```out
q=2147483648 r=0 fq=2147483648 m=0
```

### 06 degenerate 被除数为 0
```in
0 5
```
```out
q=0 r=0 fq=0 m=0
```

### 07 boundary int 最小值除以 int 最大值
```in
-2147483648 2147483647
```
```out
q=-1 r=-1 fq=-2 m=2147483646
```

### 08 boundary 除以 1
```in
2147483647 1
```
```out
q=2147483647 r=0 fq=2147483647 m=0
```

### 09 degenerate 负数恰好整除
```in
-6 3
```
```out
q=-2 r=0 fq=-2 m=0
```

### 10 normal 一般情况
```in
100 7
```
```out
q=14 r=2 fq=14 m=2
```
