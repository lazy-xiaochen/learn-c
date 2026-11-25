---json
{
  "id": "p-s1-bitwise-1",
  "title": "对 32 位无符号整数的第 k 位做置位、清除、翻转和测试",
  "difficulty": "L2",
  "knowledgePoints": ["s1-bitwise"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入一个 32 位无符号整数 x 和位号 k（第 0 位是最低位），输出一行四个值：

- `set`：把 x 的第 k 位置为 1 后的值；
- `clear`：把 x 的第 k 位清为 0 后的值；
- `toggle`：把 x 的第 k 位翻转后的值；
- `test`：x 的第 k 位是 0 还是 1。

每一项都是对**原来的 x** 单独操作，互不影响。

## 输入格式
一行，两个整数 x 和 k。

## 输出格式
一行，格式为 `set=<值> clear=<值> toggle=<值> test=<0或1>`。

## 数据范围
0 ≤ x ≤ 4294967295，0 ≤ k ≤ 31

## 示例
### 示例 1
```in
10 0
```
```out
set=11 clear=10 toggle=11 test=0
```
> 10 的二进制是 1010，第 0 位是 0。

### 示例 2（边界：最高位 k = 31）
```in
0 31
```
```out
set=2147483648 clear=0 toggle=2147483648 test=0
```

## 提示
### 第 1 层
先构造一个"只有第 k 位是 1"的掩码，四个操作都可以用这个掩码加一个位运算完成。

### 第 2 层
掩码是 `1 << k`——但 k = 31 时，有符号的 `1 << 31` 会移进符号位，是**未定义行为**。x 最大是 4294967295，也超出了 `int`。所以 x 和掩码都应当是 `unsigned int`，常量写成 `1u`。

### 第 3 层
`mask = 1u << k`；置位 `x | mask`；清除 `x & ~mask`；翻转 `x ^ mask`；测试 `(x >> k) & 1u`。全部用 `%u` 输出。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    unsigned int x, k;
    if (scanf("%u %u", &x, &k) != 2 || k > 31) {
        return 0;
    }
    unsigned int mask = 1u << k;   /* 无符号的 1 左移，k = 31 也是定义良好的 */
    printf("set=%u clear=%u toggle=%u test=%u\n",
           x | mask,          /* 置 1 */
           x & ~mask,         /* 清 0：~mask 只有第 k 位是 0 */
           x ^ mask,          /* 翻转 */
           (x >> k) & 1u);    /* 取出第 k 位，结果只能是 0 或 1 */
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    /* 读入 x 和 k，输出 set、clear、toggle、test */

    return 0;
}
```

## 复杂度
O(1)。本题考查位掩码的构造与使用，以及"位运算用无符号类型"这一原则。

## 常见错误
### 用有符号的 1 构造掩码 [UB]
`1 << 31` 中的 1 是 `int`，结果无法用 `int` 表示，属于未定义行为。本平台的检测工具会报告 `left shift of 1 by 31 places cannot be represented in type 'int'`。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    unsigned int x, k;
    if (scanf("%u %u", &x, &k) != 2 || k > 31) {
        return 0;
    }
    unsigned int mask = 1 << k;
    printf("set=%u clear=%u toggle=%u test=%u\n", x | mask, x & ~mask, x ^ mask, (x >> k) & 1u);
    return 0;
}
```

### test 直接输出 x & mask [WA]
`x & mask` 的值是 0 或者 2ᵏ，而不是 0 或 1。要先右移再与 1，或者写成 `(x & mask) != 0`。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    unsigned int x, k;
    if (scanf("%u %u", &x, &k) != 2 || k > 31) {
        return 0;
    }
    unsigned int mask = 1u << k;
    printf("set=%u clear=%u toggle=%u test=%u\n", x | mask, x & ~mask, x ^ mask, x & mask);
    return 0;
}
```

### 清除时用了逻辑非 ! [WA]
`!mask` 是逻辑运算：mask 非 0，所以 `!mask` 等于 0，`x & 0` 永远是 0。按位取反是 `~`。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    unsigned int x, k;
    if (scanf("%u %u", &x, &k) != 2 || k > 31) {
        return 0;
    }
    unsigned int mask = 1u << k;
    printf("set=%u clear=%u toggle=%u test=%u\n", x | mask, x & !mask, x ^ mask, (x >> k) & 1u);
    return 0;
}
```

### 用 int 和 %d 读写 x [WA]
x 可以达到 4294967295，超出 `int` 的范围；即使读入正确，`%d` 也会把最高位为 1 的结果显示成负数。

## 测试用例
### 01 sample 示例 1
```in
10 0
```
```out
set=11 clear=10 toggle=11 test=0
```

### 02 sample 示例 2
```in
0 31
```
```out
set=2147483648 clear=0 toggle=2147483648 test=0
```

### 03 boundary 全 1 的最高位
```in
4294967295 31
```
```out
set=4294967295 clear=2147483647 toggle=2147483647 test=1
```

### 04 boundary 全 1 的最低位
```in
4294967295 0
```
```out
set=4294967295 clear=4294967294 toggle=4294967294 test=1
```

### 05 degenerate 全 0 的最低位
```in
0 0
```
```out
set=1 clear=0 toggle=1 test=0
```

### 06 trap x 超过 INT_MAX，且第 31 位为 1
```in
2147483648 31
```
```out
set=2147483648 clear=0 toggle=0 test=1
```

### 07 trap 第 30 位（1 << 30 尚合法，结果仍要按无符号输出）
```in
5 30
```
```out
set=1073741829 clear=5 toggle=1073741829 test=0
```

### 08 normal 一般情况
```in
12345 4
```
```out
set=12345 clear=12329 toggle=12329 test=1
```

### 09 normal 一般情况
```in
1 1
```
```out
set=3 clear=1 toggle=3 test=0
```
