---json
{
  "id": "p-s1-io-buffer-1",
  "title": "分三行读入“数 运算符 数”的简易计算器",
  "difficulty": "L2",
  "knowledgePoints": ["s1-io-buffer", "s1-scanf"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
输入共三行：第一行是整数 a，第二行是一个运算符（`+`、`-`、`*`、`/` 之一），第三行是整数 b。输出 a 与 b 运算的结果。除法采用 C 语言的整数除法（向 0 截断）。

以下情况输出 `error`：没能成功读入 a、运算符和 b；运算符不是这四个之一；除数为 0。

## 输入格式
三行，见题目描述。运算符前后可能有空格。

## 输出格式
一行，计算结果或 `error`。

## 数据范围
-2147483648 ≤ a, b ≤ 2147483647

## 示例
### 示例 1
```in
7
+
5
```
```out
12
```

### 示例 2（边界：除以 0）
```in
7
/
0
```
```out
error
```

## 提示
### 第 1 层
用 `%d` 读完第一行的 7 之后，缓冲区里下一个字符是什么？`%c` 会读到它吗？

### 第 2 层
`%c` 不跳过空白，会读到第一行末尾的换行符。在格式串中写 `" %c"`（`%c` 前面加一个空格）可以跳过所有空白。另外，int 范围内的两个数相乘最大约 4.6 × 10¹⁸，`INT_MIN / -1` 也超出 int，要用 `long long` 计算。

### 第 3 层
读入 a、op、b 并检查三次 scanf 的返回值；用 `if ... else if ...` 判断运算符；除法前先检查 b 是否为 0；用 `(long long)a * b` 这样的写法让运算在 64 位下进行，以 `%lld` 输出。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int a, b;
    char op;
    /* " %c" 中的空格会跳过上一行留下的换行符以及运算符前的空格 */
    if (scanf("%d", &a) != 1 || scanf(" %c", &op) != 1 || scanf("%d", &b) != 1) {
        printf("error\n");
        return 0;
    }
    long long x = a, y = b;   /* 在 64 位下计算：乘积和 INT_MIN / -1 都可能超出 int */
    if (op == '+') {
        printf("%lld\n", x + y);
    } else if (op == '-') {
        printf("%lld\n", x - y);
    } else if (op == '*') {
        printf("%lld\n", x * y);
    } else if (op == '/' && y != 0) {
        printf("%lld\n", x / y);
    } else {
        printf("error\n");    /* 未知运算符，或除数为 0 */
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int a, b;
    char op;
    /* 分三行读入 a、运算符、b，输出结果或 error */

    return 0;
}
```

## 复杂度
O(1)。本题考查输入缓冲区中残留的换行符、`" %c"` 的作用，以及整数运算的范围与除以零。

## 常见错误
### 用 "%c" 读运算符 [WA]
`%c` 读到的是第一行末尾的 `\n`，不是 `+`，于是程序认为运算符非法而输出 error。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int a, b;
    char op;
    if (scanf("%d", &a) != 1 || scanf("%c", &op) != 1 || scanf("%d", &b) != 1) {
        printf("error\n");
        return 0;
    }
    long long x = a, y = b;
    if (op == '+') printf("%lld\n", x + y);
    else if (op == '-') printf("%lld\n", x - y);
    else if (op == '*') printf("%lld\n", x * y);
    else if (op == '/' && y != 0) printf("%lld\n", x / y);
    else printf("error\n");
    return 0;
}
```

### 没有检查除数为 0 [UB]
整数除以 0 是未定义行为（x86 上程序会直接崩溃）。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    int a, b;
    char op;
    if (scanf("%d", &a) != 1 || scanf(" %c", &op) != 1 || scanf("%d", &b) != 1) {
        printf("error\n");
        return 0;
    }
    long long x = a, y = b;
    if (op == '+') printf("%lld\n", x + y);
    else if (op == '-') printf("%lld\n", x - y);
    else if (op == '*') printf("%lld\n", x * y);
    else if (op == '/') printf("%lld\n", x / y);
    else printf("error\n");
    return 0;
}
```

### 用 int 计算 [UB]
`a * b` 在 int 下可能溢出；`-2147483648 / -1` 也超出 int 的范围。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    int a, b;
    char op;
    if (scanf("%d", &a) != 1 || scanf(" %c", &op) != 1 || scanf("%d", &b) != 1) {
        printf("error\n");
        return 0;
    }
    if (op == '+') printf("%d\n", a + b);
    else if (op == '-') printf("%d\n", a - b);
    else if (op == '*') printf("%d\n", a * b);
    else if (op == '/' && b != 0) printf("%d\n", a / b);
    else printf("error\n");
    return 0;
}
```

### 用 fflush(stdin) 清除换行 [WA|UB]
对输入流调用 `fflush` 是未定义行为，在 Linux 等平台上它什么也不做，`%c` 照样读到换行符。

## 测试用例
### 01 sample 示例 1
```in
7
+
5
```
```out
12
```

### 02 sample 示例 2
```in
7
/
0
```
```out
error
```

### 03 boundary 两个 int 最大值相乘
```in
2147483647
*
2147483647
```
```out
4611686014132420609
```

### 04 trap INT_MIN 除以 -1
```in
-2147483648
/
-1
```
```out
2147483648
```

### 05 trap 运算符前后有空格
```in
3
   -  
10
```
```out
-7
```

### 06 trap 不支持的运算符
```in
6
%
4
```
```out
error
```

### 07 degenerate 0 乘 0
```in
0
*
0
```
```out
0
```

### 08 boundary 差值超出 int
```in
-2147483648
-
2147483647
```
```out
-4294967295
```

### 09 normal 负数除法向 0 截断
```in
-7
/
2
```
```out
-3
```

### 10 trap 第一个数不是整数
```in
abc
+
1
```
```out
error
```
