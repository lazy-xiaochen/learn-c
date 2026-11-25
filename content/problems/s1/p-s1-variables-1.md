---json
{
  "id": "p-s1-variables-1",
  "title": "用临时变量交换两个整数，输出交换前后的值",
  "difficulty": "L1",
  "knowledgePoints": ["s1-variables"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入两个整数分别存入变量 a 和 b，先输出它们的值；然后**交换** a 和 b 的值，再输出一次。

## 输入格式
一行，两个整数 a 和 b。

## 输出格式
两行：
```
a=<交换前 a 的值> b=<交换前 b 的值>
a=<交换后 a 的值> b=<交换后 b 的值>
```

## 数据范围
-2147483648 ≤ a, b ≤ 2147483647（`int` 的完整范围）

## 示例
### 示例 1
```in
3 5
```
```out
a=3 b=5
a=5 b=3
```

### 示例 2（边界：两个数相同）
```in
-1 -1
```
```out
a=-1 b=-1
a=-1 b=-1
```

## 提示
### 第 1 层
如果直接写 `a = b;`，a 原来的值去哪了？

### 第 2 层
需要第三个变量把 a 原来的值暂时保存起来。注意数据范围是 `int` 的完整范围，任何涉及 `a + b` 的计算都可能溢出。

### 第 3 层
`int tmp = a; a = b; b = tmp;`，交换前后各用一次 `printf("a=%d b=%d\n", a, b);`。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) {
        return 0;
    }
    printf("a=%d b=%d\n", a, b);
    int tmp = a;   /* 先保存 a 原来的值 */
    a = b;
    b = tmp;
    printf("a=%d b=%d\n", a, b);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) {
        return 0;
    }
    printf("a=%d b=%d\n", a, b);
    /* 在这里交换 a 和 b */

    printf("a=%d b=%d\n", a, b);
    return 0;
}
```

## 复杂度
O(1)。本题考查赋值的含义（右边的值覆盖左边）以及临时变量的作用。

## 常见错误
### 用加减法交换 [UB]
`a = a + b` 在 a、b 都很大（或都很小）时超出 `int` 范围，发生有符号整数溢出，属于未定义行为。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) {
        return 0;
    }
    printf("a=%d b=%d\n", a, b);
    a = a + b;
    b = a - b;
    a = a - b;
    printf("a=%d b=%d\n", a, b);
    return 0;
}
```

### 没有临时变量，直接互相赋值 [WA]
`a = b;` 之后 a 原来的值已经丢失，`b = a;` 只是把 b 自己的值又赋给了自己。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) {
        return 0;
    }
    printf("a=%d b=%d\n", a, b);
    a = b;
    b = a;
    printf("a=%d b=%d\n", a, b);
    return 0;
}
```

### scanf 忘记写 & [WA|RE]
`scanf` 需要知道把数据写到**哪里**，`&a` 是 a 的地址。写成 `scanf("%d %d", a, b)` 时，a 和 b 的**值**被当成了地址（编译器会对此给出警告）：
- 如果它们是不确定的"垃圾值"，程序会向一个非法地址写数据而崩溃（RE）；
- 如果它们恰好是 0（就像下面的代码），Windows 的 C 运行库会发现这是空指针，让 `scanf` 直接返回失败，程序什么也不输出（WA）。

不论哪种情况，结果都是错的。
```c file=main.c expect=RE
#include <stdio.h>

int main(void) {
    int a = 0, b = 0;
    if (scanf("%d %d", a, b) != 2) {
        return 0;
    }
    printf("a=%d b=%d\n", a, b);
    int tmp = a;
    a = b;
    b = tmp;
    printf("a=%d b=%d\n", a, b);
    return 0;
}
```

### 输出格式与要求不一致 [WA]
`a = 3, b = 5`、`a=3,b=5`、使用中文等号"＝"都和要求的 `a=3 b=5` 不一致。判题是逐字符比较的，多一个空格或少一个空格都算错（行末的空格除外）。

（另外，网上还流传用异或 `a ^= b; b ^= a; a ^= b;` 交换的写法。它对两个不同的变量是正确的、也不会溢出，但可读性差，而且当 a 和 b 是同一块内存时结果会变成 0。用临时变量最清楚。）

## 测试用例
### 01 sample 示例 1
```in
3 5
```
```out
a=3 b=5
a=5 b=3
```

### 02 sample 示例 2
```in
-1 -1
```
```out
a=-1 b=-1
a=-1 b=-1
```

### 03 boundary int 的最大值与最小值
```in
2147483647 -2147483648
```
```out
a=2147483647 b=-2147483648
a=-2147483648 b=2147483647
```

### 04 trap 两个最大值（a + b 溢出）
```in
2147483647 2147483647
```
```out
a=2147483647 b=2147483647
a=2147483647 b=2147483647
```

### 05 degenerate 两个 0
```in
0 0
```
```out
a=0 b=0
a=0 b=0
```

### 06 trap 最大值加 1 溢出
```in
2147483647 1
```
```out
a=2147483647 b=1
a=1 b=2147483647
```

### 07 trap 两个负数相加溢出
```in
-2147483648 -1
```
```out
a=-2147483648 b=-1
a=-1 b=-2147483648
```

### 08 normal 一般情况
```in
123 -456
```
```out
a=123 b=-456
a=-456 b=123
```
