---json
{
  "id": "p-s1-loops-2",
  "title": "把整数的各位数字反转，并判断它是不是回文数",
  "difficulty": "L2",
  "knowledgePoints": ["s1-loops", "s1-arith-ops"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入一个非负整数 n，输出两行：

1. 把 n 的各位数字顺序反转后得到的数（例如 1200 反转为 0021，即 21）；
2. 如果反转后的数等于 n（即 n 是回文数），输出 `yes`，否则输出 `no`。

## 输入格式
一行，一个整数 n。

## 输出格式
两行，见题目描述。

## 数据范围
0 ≤ n ≤ 2147483647

## 示例
### 示例 1
```in
12345
```
```out
54321
no
```

### 示例 2（边界：0）
```in
0
```
```out
0
yes
```

## 提示
### 第 1 层
怎样每次取出最后一位数字？怎样把它"接"到反转结果的末尾？

### 第 2 层
`n % 10` 取出最后一位，`n /= 10` 去掉最后一位；反转结果 `rev = rev * 10 + 那一位`。循环到 n 变成 0 为止。注意 n 的最大值反转后是 7463847412，超出了 `int`。

### 第 3 层
`rev` 用 `long long`。循环会把 n 改成 0，所以判断回文时要和**原来的** n 比较：先用另一个变量保存一份副本。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0) {
        return 0;
    }
    int original = n;     /* 循环会把 n 变成 0，先保存一份 */
    long long rev = 0;    /* 2147483647 反转后是 7463847412，超出 int */
    while (n > 0) {
        rev = rev * 10 + n % 10;
        n /= 10;
    }
    printf("%lld\n%s\n", rev, rev == original ? "yes" : "no");
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0) {
        return 0;
    }
    /* 反转各位数字，并判断是否回文 */

    return 0;
}
```

## 复杂度
时间 O(位数)，即 O(log n)；空间 O(1)。

## 常见错误
### 用 int 保存反转结果 [UB]
1000000003 反转后是 3000000001，`rev * 10 + ...` 在 int 下溢出。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0) {
        return 0;
    }
    int original = n;
    int rev = 0;
    while (n > 0) {
        rev = rev * 10 + n % 10;
        n /= 10;
    }
    printf("%d\n%s\n", rev, rev == original ? "yes" : "no");
    return 0;
}
```

### 用已经被改成 0 的 n 判断回文 [WA]
循环结束后 n 已经是 0，`rev == n` 只有在 rev 也为 0 时才成立。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0) {
        return 0;
    }
    long long rev = 0;
    while (n > 0) {
        rev = rev * 10 + n % 10;
        n /= 10;
    }
    printf("%lld\n%s\n", rev, rev == n ? "yes" : "no");
    return 0;
}
```

### 拼接顺序写反 [WA]
`rev = rev + (n % 10) * 10` 不是把新数字接到末尾。正确的是"原来的结果整体左移一位（乘 10），再加上新数字"。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0) {
        return 0;
    }
    int original = n;
    long long rev = 0;
    while (n > 0) {
        rev = rev + (n % 10) * 10;
        n /= 10;
    }
    printf("%lld\n%s\n", rev, rev == original ? "yes" : "no");
    return 0;
}
```

### 按字符串逐字符输出 [WA]
如果只是倒着输出每一位数字，1200 会输出 `0021` 而不是 `21`。题目要求的是反转后得到的**数**。

## 测试用例
### 01 sample 示例 1
```in
12345
```
```out
54321
no
```

### 02 sample 示例 2
```in
0
```
```out
0
yes
```

### 03 boundary int 最大值（反转后超出 int）
```in
2147483647
```
```out
7463847412
no
```

### 04 trap 反转后刚超过 INT_MAX
```in
1000000003
```
```out
3000000001
no
```

### 05 trap 末尾有 0
```in
1200
```
```out
21
no
```

### 06 degenerate 一位数
```in
7
```
```out
7
yes
```

### 07 boundary 接近最大值的回文数
```in
2147447412
```
```out
2147447412
yes
```

### 08 degenerate 所有位都相同
```in
999999999
```
```out
999999999
yes
```

### 09 normal 偶数位回文
```in
1221
```
```out
1221
yes
```
