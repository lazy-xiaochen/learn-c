---json
{
  "id": "p-s5-ub-signed-overflow-1",
  "title": "安全加法：a + b 超出 int 范围了吗",
  "difficulty": "L3",
  "knowledgePoints": ["s5-ub-signed-overflow"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
实现一个"安全加法器"：给定 `q` 对整数 `a`、`b`，如果 `a + b` 在 `int` 的表示范围内，输出这个和；否则输出 `OVERFLOW`。

注意：**不能先算出 `a + b` 再判断**。有符号整数溢出是未定义行为，`int sum = a + b;` 这一行在溢出时就已经让程序失去了保证——本平台的 UBSan 会直接把它判成 `UB`。你必须要么先判断再运算，要么把两个数转到更宽的类型（`long long`）里相加。

## 输入格式
第一行一个整数 `q`。
接下来 `q` 行，每行两个整数 `a`、`b`。

## 输出格式
对每对 `a`、`b` 输出一行：
- 若 `a + b` 能用 `int` 表示，输出 `a + b` 的值；
- 否则输出 `OVERFLOW`。

## 数据范围
1 ≤ q ≤ 100
-2147483648 ≤ a, b ≤ 2147483647

`a` 与 `b` 都在 `int` 范围内，但它们的和可能超出 `[-2147483648, 2147483647]`。`long long` 能表示任何两个 `int` 的和。

## 示例
### 示例 1
```in
5
2147483647 1
2147483647 0
-2147483648 -1
1 2
-2147483648 2147483647
```
```out
OVERFLOW
2147483647
OVERFLOW
3
-1
```
> 第 1 对 `INT_MAX + 1` 溢出；第 2 对 `INT_MAX + 0` 不溢出；第 3 对 `INT_MIN + (-1)` 也溢出——**负方向的溢出同样要判**。

### 示例 2（边界：INT_MAX 加 INT_MIN 正好是 -1）
```in
2
2147483647 -2147483648
-2147483647 -1
```
```out
-1
-2147483648
```
> `INT_MAX + INT_MIN = -1`，落在范围内；`-2147483647 + (-1) = -2147483648` 正好等于 `INT_MIN`，也没有溢出。边界值"差一格"的地方最容易判错。

## 提示
### 第 1 层
先确认 `int` 的范围：`INT_MIN = -2147483648`、`INT_MAX = 2147483647`（在 `<limits.h>` 里）。题目要求输出的是"和"或者 `OVERFLOW`，所以判定必须先于运算。

### 第 2 层
最稳的写法是"扩宽类型"：`long long sum = (long long)a + b;`，再用 `sum > INT_MAX || sum < INT_MIN` 判断。`long long` 的范围远大于 `int`，这次加法本身不会溢出，判断完全安全。

### 第 3 层
如果坚持用 `int` 判断，就必须分别处理两个方向：
- 正溢出：`b > 0 && a > INT_MAX - b`
- 负溢出：`b < 0 && a < INT_MIN - b`

`INT_MAX - b`（`b > 0`）和 `INT_MIN - b`（`b < 0`）本身都不会溢出，可以放心比较。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <limits.h>

int main(void) {
    int q = 0;
    if (scanf("%d", &q) != 1 || q < 1 || q > 100) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        int a = 0;
        int b = 0;
        if (scanf("%d %d", &a, &b) != 2) {
            return 0;
        }
        long long sum = (long long)a + b;      /* 先转到更宽的类型，加法一定安全 */
        if (sum > INT_MAX || sum < INT_MIN) {
            printf("OVERFLOW\n");
        } else {
            printf("%lld\n", sum);
        }
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <limits.h>

int main(void) {
    int q = 0;
    if (scanf("%d", &q) != 1 || q < 1 || q > 100) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        int a = 0;
        int b = 0;
        if (scanf("%d %d", &a, &b) != 2) {
            return 0;
        }
        int sum = a + b;                /* TODO: 溢出时这一行已经是 UB */
        printf("%d\n", sum);            /* TODO: 溢出要输出 OVERFLOW */
    }
    return 0;
}
```

## 复杂度
时间 O(q)：每对数字做常数次运算。
空间 O(1)。

## 常见错误
### 在 int 里相加之后再判断 [UB]
`int sum = a + b;` 已经执行了可能有符号溢出的加法，后面的判断无论怎么写都无法挽回。本平台的 UBSan 会在这一行报 `signed integer overflow`。

```c file=main.c expect=UB
#include <stdio.h>
#include <limits.h>

int main(void) {
    int q = 0;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        int a = 0;
        int b = 0;
        if (scanf("%d %d", &a, &b) != 2) {
            return 0;
        }
        int sum = a + b;                /* 错：溢出在这里已经发生 */
        if (sum < a) {
            printf("OVERFLOW\n");
        } else {
            printf("%d\n", sum);
        }
    }
    return 0;
}
```

### 只判断正溢出 [WA]
`b > 0 && sum > INT_MAX` 只覆盖"两个正数相加"。两个负数相加会得到小于 `INT_MIN` 的结果，代码却把它当成合法值打印出来。

```c file=main.c expect=WA
#include <stdio.h>
#include <limits.h>

int main(void) {
    int q = 0;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        int a = 0;
        int b = 0;
        if (scanf("%d %d", &a, &b) != 2) {
            return 0;
        }
        long long sum = (long long)a + b;
        if (b > 0 && sum > INT_MAX) {
            printf("OVERFLOW\n");
        } else {
            printf("%lld\n", sum);      /* 错：负溢出被直接打印出来 */
        }
    }
    return 0;
}
```

### 用 `-b` 做负数方向的判断 [UB]
想判断负溢出时，有人会写 `int limit = -b;`。当 `b == INT_MIN` 时，`-b` 的结果 `2147483648` 无法用 `int` 表示，这一行本身就是未定义行为。

```c file=main.c expect=UB
#include <stdio.h>
#include <limits.h>

int main(void) {
    int q = 0;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        int a = 0;
        int b = 0;
        if (scanf("%d %d", &a, &b) != 2) {
            return 0;
        }
        long long sum = (long long)a + b;
        int limit = -b;                 /* 错：b == INT_MIN 时 -b 溢出 */
        if (sum > INT_MAX || (b < 0 && a < limit)) {
            printf("OVERFLOW\n");
        } else {
            printf("%lld\n", sum);
        }
    }
    return 0;
}
```

### 把 `OVERFLOW` 写成小写 [WA]
判题是逐行比较文本的，`overflow`、`Overflow` 都会判 `WA`。题目要求的字符串要一字不差地照抄。

## 测试用例
### 01 sample 示例 1
```in
5
2147483647 1
2147483647 0
-2147483648 -1
1 2
-2147483648 2147483647
```
```out
OVERFLOW
2147483647
OVERFLOW
3
-1
```

### 02 sample 示例 2
```in
2
2147483647 -2147483648
-2147483647 -1
```
```out
-1
-2147483648
```

### 03 boundary 同号最大值相加
```in
3
2147483647 2147483647
-2147483648 -2147483648
0 0
```
```out
OVERFLOW
OVERFLOW
0
```

### 04 degenerate 0 加 0
```in
1
0 0
```
```out
0
```

### 05 trap 恰好落在边界的和
```in
4
2147483646 1
-2147483647 -1
2147483647 -1
-2147483648 0
```
```out
2147483647
-2147483648
2147483646
-2147483648
```

### 06 trap 两个十亿相加
```in
2
1000000000 1000000000
-1000000000 -1000000000
```
```out
2000000000
-2000000000
```

### 07 normal 20 对随机数
```in
20
-1000000000 -1000000000
-998765433 -992345679
-997530866 -984691358
-996296299 -977037037
-995061732 -969382716
-993827165 -961728395
-992592598 -954074074
-991358031 -946419753
-990123464 -938765432
-988888897 -931111111
-987654330 -923456790
-986419763 -915802469
-985185196 -908148148
-983950629 -900493827
-982716062 -892839506
-981481495 -885185185
-980246928 -877530864
-979012361 -869876543
-977777794 -862222222
-976543227 -854567901
```
```out
-2000000000
-1991111112
-1982222224
-1973333336
-1964444448
-1955555560
-1946666672
-1937777784
-1928888896
-1920000008
-1911111120
-1902222232
-1893333344
-1884444456
-1875555568
-1866666680
-1857777792
-1848888904
-1840000016
-1831111128
```

### 08 trap 互为相反数的两个极值
```in
1
2147483647 -2147483647
```
```out
0
```
