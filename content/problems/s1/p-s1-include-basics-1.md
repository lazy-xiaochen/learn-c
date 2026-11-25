---json
{
  "id": "p-s1-include-basics-1",
  "title": "用标准库函数求一个 int 的绝对值（包括 int 的最小值）",
  "difficulty": "L2",
  "knowledgePoints": ["s1-include-basics"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入一个 `int` 范围内的整数 n，输出它的绝对值 |n|。

要求使用标准库提供的绝对值函数完成计算（而不是自己写 `if`），并且对 `int` 范围内的**每一个**值都给出正确答案。

## 输入格式
一行，一个整数 n。

## 输出格式
一行，|n| 的值。

## 数据范围
-2147483648 ≤ n ≤ 2147483647（即 `INT_MIN ≤ n ≤ INT_MAX`）

## 示例
### 示例 1
```in
-5
```
```out
5
```

### 示例 2（边界：零）
```in
0
```
```out
0
```

## 提示
### 第 1 层
绝对值函数在哪个头文件里？另外想一想：int 的最小值 -2147483648 的绝对值是多少，int 能装得下吗？

### 第 2 层
`<stdlib.h>` 里有 `abs`（参数和返回值都是 `int`）和 `llabs`（参数和返回值都是 `long long`，至少 64 位）。`int` 的最大值是 2147483647，所以 |-2147483648| = 2147483648 用 `int` 表示不了，`abs(INT_MIN)` 的结果是**未定义的**。

### 第 3 层
先把 n 转换成 `long long`，再调用 `llabs`；输出 `long long` 要用格式说明符 `%lld`。别忘了 `#include <stdlib.h>`。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>   /* llabs */

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    /* |INT_MIN| = 2147483648 超出 int 范围，所以先转换成 long long 再取绝对值 */
    long long r = llabs((long long)n);
    printf("%lld\n", r);
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
    /* 在这里计算并输出 |n| */

    return 0;
}
```

## 复杂度
O(1)。本题的关键是**有符号整数的取值范围不对称**：int 能表示 -2147483648，却不能表示 2147483648。

## 常见错误
### 直接用 abs(n) [WA|UB]
对 `INT_MIN` 调用 `abs` 的结果是未定义的。常见实现会原样返回 -2147483648（于是输出了一个负的"绝对值"）；本平台的检测工具也可能直接报告整数溢出。
```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    printf("%d\n", abs(n));
    return 0;
}
```

### 自己写 n < 0 ? -n : n [UB]
`-n` 在 n 为 `INT_MIN` 时就是有符号整数溢出，属于未定义行为，与 `abs(INT_MIN)` 是同一个问题。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    int r = n < 0 ? -n : n;
    printf("%d\n", r);
    return 0;
}
```

### 用了 llabs 却忘了包含 <stdlib.h> [CE]
C99 起调用未声明的函数是错误，编译器会提示 `call to undeclared library function 'llabs'`。
```c file=main.c expect=CE
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    printf("%lld\n", llabs((long long)n));
    return 0;
}
```

### 用 %d 输出 long long [WA]
`printf("%d", llabs(...))` 中格式说明符与参数类型不一致，是未定义行为；常见表现是只打印出低 32 位，2147483648 变成 -2147483648。`long long` 要用 `%lld`。

## 测试用例
### 01 sample 示例 1
```in
-5
```
```out
5
```

### 02 sample 示例 2
```in
0
```
```out
0
```

### 03 boundary int 最大值
```in
2147483647
```
```out
2147483647
```

### 04 trap int 最小值（绝对值超出 int 范围）
```in
-2147483648
```
```out
2147483648
```

### 05 boundary 比最小值大 1
```in
-2147483647
```
```out
2147483647
```

### 06 degenerate 负零
```in
-0
```
```out
0
```

### 07 degenerate 带正号的 1
```in
+1
```
```out
1
```

### 08 normal 一般负数
```in
-123456
```
```out
123456
```
