---json
{
  "id": "p-s1-int-types-1",
  "title": "计算 unsigned int 下的 n+1、2n、n-1（观察无符号回绕）",
  "difficulty": "L2",
  "knowledgePoints": ["s1-int-types"],
  "special": "type-reasoning",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入一个非负整数 n，把它存放在 `unsigned int` 类型的变量中，按 `unsigned int` 的运算规则（超出范围时对 2³² 取模，即"回绕"）计算并输出：

1. n + 1
2. n × 2
3. n − 1

## 输入格式
一行，一个整数 n。

## 输出格式
三行，依次为 n + 1、n × 2、n − 1 在 `unsigned int` 下的结果（都是 0 ~ 4294967295 之间的整数）。

## 数据范围
0 ≤ n ≤ 4294967295（恰好是 `unsigned int` 的范围，本平台上 `unsigned int` 为 32 位）

## 示例
### 示例 1
```in
5
```
```out
6
10
4
```

### 示例 2（边界：n = 0 时 n − 1 回绕成最大值）
```in
0
```
```out
1
0
4294967295
```

## 提示
### 第 1 层
n 的最大值 4294967295 超过了 `int` 能表示的范围，变量应该用什么类型？读写它要用哪个格式说明符？

### 第 2 层
`unsigned int` 用 `%u` 读入和输出。无符号整数的加、减、乘超出范围时，结果是对 2³² 取模，这是 C 标准**保证**的行为（与有符号整数溢出不同）。

### 第 3 层
声明 `unsigned int n;`，用 `scanf("%u", &n)` 读入，然后直接输出 `n + 1u`、`n * 2u`、`n - 1u`。注意不要用 `long long` 来"防止溢出"——本题要的正是回绕后的结果。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    unsigned int n;
    if (scanf("%u", &n) != 1) {
        return 0;
    }
    /* 无符号运算超出范围时对 2^32 取模，结果是确定的 */
    printf("%u\n", n + 1u);
    printf("%u\n", n * 2u);
    printf("%u\n", n - 1u);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    /* 选择合适的类型存放 n，并按要求输出三行 */

    return 0;
}
```

## 复杂度
O(1)。本题考查无符号整数的取值范围、格式说明符 `%u`，以及"无符号回绕是确定的、有符号溢出是未定义的"这一区别。

## 常见错误
### 用 int 和 %d [WA]
n = 0 时，`n - 1` 得到 -1 而不是 4294967295；n 超过 2147483647 时，用 `%d` 读入本身就超出了 `int` 的范围。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    printf("%d\n", n + 1);
    printf("%d\n", n * 2);
    printf("%d\n", n - 1);
    return 0;
}
```

### 用 long long 存放，结果没有回绕 [WA]
`long long` 能装下 4294967296，所以 n = 4294967295 时 n + 1 输出 4294967296，而题目要求的是 `unsigned int` 回绕后的 0。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    long long n;
    if (scanf("%lld", &n) != 1) {
        return 0;
    }
    printf("%lld\n", n + 1);
    printf("%lld\n", n * 2);
    printf("%lld\n", n - 1);
    return 0;
}
```

### 用 %u 读入、却用 %d 输出 [WA]
运算结果是对的，但 `%d` 会把大于 2147483647 的无符号值解释成负数输出（格式说明符和参数类型不一致，`-Wall` 会给出警告）。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    unsigned int n;
    if (scanf("%u", &n) != 1) {
        return 0;
    }
    printf("%d\n", n + 1u);
    printf("%d\n", n * 2u);
    printf("%d\n", n - 1u);
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
5
```
```out
6
10
4
```

### 02 sample 示例 2
```in
0
```
```out
1
0
4294967295
```

### 03 boundary 最大值 UINT_MAX
```in
4294967295
```
```out
0
4294967294
4294967294
```

### 04 boundary 最小正数
```in
1
```
```out
2
2
0
```

### 05 trap 刚超过 INT_MAX（用 int 读入会出错）
```in
2147483648
```
```out
2147483649
0
2147483647
```

### 06 trap INT_MAX（用 int 计算 n+1 会发生有符号溢出）
```in
2147483647
```
```out
2147483648
4294967294
2147483646
```

### 07 degenerate 乘 2 回绕
```in
3000000000
```
```out
3000000001
1705032704
2999999999
```

### 08 normal 一般情况
```in
123456789
```
```out
123456790
246913578
123456788
```
