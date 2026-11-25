---json
{
  "id": "p-s1-precedence-1",
  "title": "拆分 32 位 ARGB 颜色值，并交换红蓝两个通道",
  "difficulty": "L2",
  "knowledgePoints": ["s1-precedence", "s1-bitwise"],
  "special": "expr-reasoning",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
图形程序常把一个像素的颜色存成一个 32 位无符号整数（ARGB 格式）：从高到低每 8 位分别是透明度 a、红 r、绿 g、蓝 b：

```
位：  31 ...  24 | 23 ... 16 | 15 ...  8 | 7 ...  0
       a（透明度）|   r（红）  |  g（绿）  |  b（蓝）
```

读入一个颜色值 c，输出它的 a、r、g、b 四个分量（各为 0~255），以及**交换红、蓝两个通道**之后的新颜色值（a、g 不变，原来的 b 放到 r 的位置，原来的 r 放到 b 的位置）。

## 输入格式
一行，一个十进制整数 c。

## 输出格式
一行，格式为 `a=<a> r=<r> g=<g> b=<b> swapped=<新颜色值>`，均为十进制。

## 数据范围
0 ≤ c ≤ 4294967295

## 示例
### 示例 1
```in
4281558681
```
```out
a=255 r=51 g=102 b=153 swapped=4288243251
```
> 4281558681 即十六进制 0xFF336699，交换后为 0xFF996633。

### 示例 2（边界：全 0）
```in
0
```
```out
a=0 r=0 g=0 b=0 swapped=0
```

## 提示
### 第 1 层
取出某个分量 = 把它移到最低 8 位，再只保留最低 8 位。拼回去则相反。

### 第 2 层
`r = (c >> 16) & 0xFF`。拼接用 `|`：`(a << 24) | (b << 16) | (g << 8) | r`。注意优先级：`c & 0xFF0000 >> 16` 中 `>>` 比 `&` 先算；`a << 24 + b` 中 `+` 比 `<<` 先算。

### 第 3 层
所有变量用 `unsigned int`：c 超过了 `int` 的范围；而且如果 a 是 `int`，`255 << 24` 会移进符号位，是未定义行为。每一个移位和按位运算都加上括号。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    unsigned int c;   /* 位运算一律用无符号类型 */
    if (scanf("%u", &c) != 1) {
        return 0;
    }
    unsigned int a = (c >> 24) & 0xFFu;
    unsigned int r = (c >> 16) & 0xFFu;
    unsigned int g = (c >> 8) & 0xFFu;
    unsigned int b = c & 0xFFu;
    /* 每个移位都加括号：<< 的优先级比 + 低、比 | 高，加括号让意图一目了然 */
    unsigned int swapped = (a << 24) | (b << 16) | (g << 8) | r;
    printf("a=%u r=%u g=%u b=%u swapped=%u\n", a, r, g, b, swapped);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    unsigned int c;
    if (scanf("%u", &c) != 1) {
        return 0;
    }
    /* 拆分出 a、r、g、b，再拼出交换红蓝之后的颜色 */

    return 0;
}
```

## 复杂度
O(1)。本题考查移位与按位运算的组合、运算符优先级，以及有符号左移的未定义行为。

## 常见错误
### 先写掩码再移位，漏了括号 [WA]
`c & 0xFF0000 >> 16` 中 `>>` 优先级高于 `&`，实际是 `c & (0xFF0000 >> 16)` 即 `c & 0xFF`，取到的是蓝色分量。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    unsigned int c;
    if (scanf("%u", &c) != 1) {
        return 0;
    }
    unsigned int a = c & 0xFF000000u >> 24;
    unsigned int r = c & 0xFF0000u >> 16;
    unsigned int g = c & 0xFF00u >> 8;
    unsigned int b = c & 0xFFu;
    unsigned int swapped = (a << 24) | (b << 16) | (g << 8) | r;
    printf("a=%u r=%u g=%u b=%u swapped=%u\n", a, r, g, b, swapped);
    return 0;
}
```

### 用 + 拼接且漏了括号 [WA|UB]
`a << 24 + b << 16` 中 `+` 先算，变成 `a << (24 + b) << 16`，移位数还可能超过 31（未定义行为）。
```c file=main.c expect=WA|UB
#include <stdio.h>

int main(void) {
    unsigned int c;
    if (scanf("%u", &c) != 1) {
        return 0;
    }
    unsigned int a = (c >> 24) & 0xFFu, r = (c >> 16) & 0xFFu;
    unsigned int g = (c >> 8) & 0xFFu, b = c & 0xFFu;
    unsigned int swapped = a << 24 + b << 16 + g << 8 + r;
    printf("a=%u r=%u g=%u b=%u swapped=%u\n", a, r, g, b, swapped);
    return 0;
}
```

### 分量用 int 存放 [UB]
a 为 255 时，`a << 24` 是对有符号 `int` 的左移，结果无法用 `int` 表示，属于未定义行为。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    unsigned int c;
    if (scanf("%u", &c) != 1) {
        return 0;
    }
    int a = (c >> 24) & 0xFF, r = (c >> 16) & 0xFF;
    int g = (c >> 8) & 0xFF, b = c & 0xFF;
    unsigned int swapped = (a << 24) | (b << 16) | (g << 8) | r;
    printf("a=%d r=%d g=%d b=%d swapped=%u\n", a, r, g, b, swapped);
    return 0;
}
```

### 用 %d 读入颜色值 [WA]
4281558681 超出 `int` 的范围，用 `%d` 读入得到的是错误的值；即使读对了，对负的 `int` 右移的结果也由编译器决定。

## 测试用例
### 01 sample 示例 1
```in
4281558681
```
```out
a=255 r=51 g=102 b=153 swapped=4288243251
```

### 02 sample 示例 2
```in
0
```
```out
a=0 r=0 g=0 b=0 swapped=0
```

### 03 boundary 全 1
```in
4294967295
```
```out
a=255 r=255 g=255 b=255 swapped=4294967295
```

### 04 trap 只有最高位为 1（超出 INT_MAX）
```in
2147483648
```
```out
a=128 r=0 g=0 b=0 swapped=2147483648
```

### 05 degenerate 纯红
```in
16711680
```
```out
a=0 r=255 g=0 b=0 swapped=255
```

### 06 degenerate 纯蓝
```in
255
```
```out
a=0 r=0 g=0 b=255 swapped=16711680
```

### 07 boundary INT_MAX
```in
2147483647
```
```out
a=127 r=255 g=255 b=255 swapped=2147483647
```

### 08 trap 红蓝相同时交换后不变
```in
2852192000
```
```out
a=170 r=0 g=255 b=0 swapped=2852192000
```

### 09 normal 0x12345678
```in
305419896
```
```out
a=18 r=52 g=86 b=120 swapped=309876276
```

### 10 normal 0x01020304
```in
16909060
```
```out
a=1 r=2 g=3 b=4 swapped=17040130
```
