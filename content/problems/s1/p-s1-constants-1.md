---json
{
  "id": "p-s1-constants-1",
  "title": "把天数换算成微秒（使用带后缀的常量避免溢出）",
  "difficulty": "L2",
  "knowledgePoints": ["s1-constants"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一天有 24 小时，一小时 60 分钟，一分钟 60 秒，一秒 1000000 微秒。读入天数 n，输出 n 天一共有多少微秒。

请把"每天的微秒数"定义成一个命名常量（`#define` 或 `const` 均可），不要在计算式里直接写一长串数字。

## 输入格式
一行，一个整数 n。

## 输出格式
一行，n 天对应的微秒数。

## 数据范围
0 ≤ n ≤ 1000000

## 示例
### 示例 1
```in
1
```
```out
86400000000
```

### 示例 2（边界：0 天）
```in
0
```
```out
0
```

## 提示
### 第 1 层
一天的微秒数是多少？它能放进 `int` 吗？

### 第 2 层
24 × 60 × 60 × 1000000 = 86400000000，约 8.6 × 10¹⁰，超过了 `int` 的最大值。表达式按**操作数**的类型计算：四个 `int` 相乘就是 `int` 乘法，会溢出。给第一个数加上 `LL` 后缀，整个乘法就在 `long long` 下进行。

### 第 3 层
`#define US_PER_DAY (24LL * 60 * 60 * 1000000)`，然后输出 `n * US_PER_DAY`（`%lld`）。最大结果约 8.64 × 10¹⁶，在 `long long` 范围内。

## 参考代码
```c file=main.c
#include <stdio.h>

/* 第一个操作数带 LL 后缀，整个乘法按 long long 计算；外层括号保证替换后优先级正确 */
#define US_PER_DAY (24LL * 60 * 60 * 1000000)

int main(void) {
    long long n;
    if (scanf("%lld", &n) != 1) {
        return 0;
    }
    printf("%lld\n", n * US_PER_DAY);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

/* 在这里定义"每天的微秒数"常量 */

int main(void) {
    long long n;
    if (scanf("%lld", &n) != 1) {
        return 0;
    }
    /* 输出 n 天的微秒数 */

    return 0;
}
```

## 复杂度
O(1)。本题考查字面量后缀与"运算按操作数类型进行"的规则。

## 常见错误
### 宏里全是 int 字面量 [WA|UB]
`(24 * 60 * 60 * 1000000)` 全部是 `int`，乘法在 `int` 下进行并溢出（编译器会给出 `overflow in expression` 警告）。本平台的检测工具会在运行时直接报告这次溢出；在没有检测工具的环境下，你会得到一个错误的数。
```c file=main.c expect=WA
#include <stdio.h>

#define US_PER_DAY (24 * 60 * 60 * 1000000)

int main(void) {
    long long n;
    if (scanf("%lld", &n) != 1) {
        return 0;
    }
    printf("%lld\n", n * US_PER_DAY);
    return 0;
}
```

### n 是 int，并且直接在 int 下连乘 [UB]
`n * 24 * 60 * 60 * 1000000` 从左往右计算，每一步都是 `int` 乘法，n 稍大一点就溢出。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    long long us = n * 24 * 60 * 60 * 1000000;
    printf("%lld\n", us);
    return 0;
}
```

### 用 const int 保存常量 [WA]
`const int US_PER_DAY = 86400000000;` 中，`int` 装不下这个值，初始化时就被截断了（编译器会警告）。常量的**类型**也要足够大：`const long long US_PER_DAY = 86400000000LL;`。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    const int US_PER_DAY = 86400000000;
    long long n;
    if (scanf("%lld", &n) != 1) {
        return 0;
    }
    printf("%lld\n", n * US_PER_DAY);
    return 0;
}
```

### 宏末尾加了分号 [CE]
`#define US_PER_DAY (24LL * 60 * 60 * 1000000);` 替换后 `printf("%lld\n", n * US_PER_DAY);` 变成 `printf("%lld\n", n * (...););`，括号中间多出一个分号，编译失败。

## 测试用例
### 01 sample 示例 1
```in
1
```
```out
86400000000
```

### 02 sample 示例 2
```in
0
```
```out
0
```

### 03 boundary 最大值 10^6 天
```in
1000000
```
```out
86400000000000000
```

### 04 trap 每天的微秒数已超过 int（n = 1 时就会暴露宏里的溢出）
```in
2
```
```out
172800000000
```

### 05 trap n × 86400 恰好超过 int（逐步 int 连乘时溢出）
```in
24856
```
```out
2147558400000000
```

### 06 degenerate 一年
```in
365
```
```out
31536000000000
```

### 07 degenerate 带前导空白和换行
```in

   7
```
```out
604800000000
```

### 08 normal 一般情况
```in
30
```
```out
2592000000000
```
