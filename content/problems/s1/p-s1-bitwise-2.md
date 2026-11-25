---json
{
  "id": "p-s1-bitwise-2",
  "title": "判断 64 位无符号整数是否为 2 的幂，并求最低位的 1",
  "difficulty": "L2",
  "knowledgePoints": ["s1-bitwise"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入一个无符号 64 位整数 n，输出两行：

1. 如果 n 是 2 的整数次幂（1、2、4、8……），输出 `yes`，否则输出 `no`；
2. n 的二进制表示中**最低位的 1** 所代表的值（例如 12 = 1100₂，最低位的 1 代表 4）。n 为 0 时输出 0。

## 输入格式
一行，一个整数 n。

## 输出格式
两行，见题目描述。

## 数据范围
0 ≤ n ≤ 18446744073709551615（2⁶⁴ − 1）

## 示例
### 示例 1
```in
12
```
```out
no
4
```

### 示例 2（边界：0 不是 2 的幂）
```in
0
```
```out
no
0
```

## 提示
### 第 1 层
2 的幂在二进制下有什么特点？`n - 1` 和 n 的二进制有什么关系？

### 第 2 层
2 的幂恰好只有一位是 1。`n & (n - 1)` 会去掉 n 最低位的 1，所以 n 是 2 的幂当且仅当 n ≠ 0 且 `n & (n - 1)` 等于 0。最低位的 1 可以用 `n & (~n + 1)` 求出（对无符号数，`~n + 1` 就是 `-n`，按 2⁶⁴ 回绕，是定义良好的）。

### 第 3 层
n 最大是 2⁶⁴ − 1，必须用 `unsigned long long` 和 `%llu`。注意 `n & (n - 1) == 0` 的优先级问题：`==` 比 `&` 先算，要写成 `(n & (n - 1)) == 0`。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    unsigned long long n;
    if (scanf("%llu", &n) != 1) {
        return 0;
    }
    /* n & (n-1) 去掉最低位的 1；结果为 0 说明 n 只有一个 1。n = 0 要单独排除 */
    int pow2 = n != 0 && (n & (n - 1)) == 0;
    /* 无符号数的 ~n + 1 按 2^64 回绕，与 n 相与只保留最低位的 1 */
    unsigned long long low = n & (~n + 1);
    printf("%s\n%llu\n", pow2 ? "yes" : "no", low);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    unsigned long long n;
    if (scanf("%llu", &n) != 1) {
        return 0;
    }
    /* 输出两行：是否为 2 的幂；最低位的 1 代表的值 */

    return 0;
}
```

## 复杂度
O(1)。本题考查 `n & (n − 1)` 与 `n & −n` 两个经典位运算技巧，以及无符号回绕和运算符优先级。

## 常见错误
### 没有排除 n = 0 [WA]
0 & (0 − 1) 等于 0，于是 0 被误判为 2 的幂。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    unsigned long long n;
    if (scanf("%llu", &n) != 1) {
        return 0;
    }
    int pow2 = (n & (n - 1)) == 0;
    printf("%s\n%llu\n", pow2 ? "yes" : "no", n & (~n + 1));
    return 0;
}
```

### 漏了括号：n & (n - 1) == 0 [WA]
`==` 的优先级比 `&` 高，表达式实际是 `n & ((n - 1) == 0)`，只有 n 为 1 时才为真。（编译器会给出 `& has lower precedence than ==` 警告。）
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    unsigned long long n;
    if (scanf("%llu", &n) != 1) {
        return 0;
    }
    int pow2 = n != 0 && n & (n - 1) == 0;
    printf("%s\n%llu\n", pow2 ? "yes" : "no", n & (~n + 1));
    return 0;
}
```

### 用 unsigned int [WA]
32 位放不下 4294967296 这样的数，读入时就出错了。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    unsigned int n;
    if (scanf("%u", &n) != 1) {
        return 0;
    }
    int pow2 = n != 0 && (n & (n - 1)) == 0;
    printf("%s\n%u\n", pow2 ? "yes" : "no", n & (~n + 1));
    return 0;
}
```

### 用有符号的 long long 计算 n & -n [WA|UB]
有符号的 `long long` 最大只到 2⁶³ − 1，2⁶³ 读入时就超出了范围；而对 `LLONG_MIN` 取负是有符号溢出。位运算请用无符号类型。

## 测试用例
### 01 sample 示例 1
```in
12
```
```out
no
4
```

### 02 sample 示例 2
```in
0
```
```out
no
0
```

### 03 boundary 最大值 2^64 - 1
```in
18446744073709551615
```
```out
no
1
```

### 04 boundary 最大的 2 的幂 2^63（超出有符号 long long）
```in
9223372036854775808
```
```out
yes
9223372036854775808
```

### 05 degenerate 1 是 2 的 0 次幂
```in
1
```
```out
yes
1
```

### 06 trap 2^32（超出 32 位）
```in
4294967296
```
```out
yes
4294967296
```

### 07 trap 高位有两个 1（0x6000000000000000，第 61、62 位）
```in
6917529027641081856
```
```out
no
2305843009213693952
```

### 08 normal 一般情况
```in
96
```
```out
no
32
```

### 09 normal 2 的 10 次幂
```in
1024
```
```out
yes
1024
```
