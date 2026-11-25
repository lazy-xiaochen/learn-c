---json
{
  "id": "p-s1-int-types-2",
  "title": "用 sizeof 计算一批变量总共占用多少字节",
  "difficulty": "L2",
  "knowledgePoints": ["s1-int-types"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个程序里声明了 c 个 `char` 变量、s 个 `short` 变量、i 个 `int` 变量、l 个 `long long` 变量和 d 个 `double` 变量。请计算这些变量**总共占用多少字节**。

要求用 `sizeof` 获取每种类型的大小，而不是把数字写死在代码里——这样程序换到别的平台上也能给出正确答案。

（本题的测试数据按本平台的类型大小计算：char 1、short 2、int 4、long long 8、double 8 字节。）

## 输入格式
一行，五个非负整数 c s i l d。

## 输出格式
一行，总字节数。

## 数据范围
0 ≤ c, s, i, l, d ≤ 1000000000

## 示例
### 示例 1
```in
1 1 1 1 1
```
```out
23
```

### 示例 2（边界：全部为 0）
```in
0 0 0 0 0
```
```out
0
```

## 提示
### 第 1 层
先估算一下答案最大可能是多少：每个数都取 10⁹ 时，总字节数是多少？`int` 装得下吗？

### 第 2 层
最大值是 23 × 10⁹，超过了 `int`（约 2.1 × 10⁹）和 `unsigned int`（约 4.3 × 10⁹）的范围，需要用 64 位的 `unsigned long long`（或 `long long`），对应的格式说明符是 `%llu`（`%lld`）。`sizeof` 的结果类型是 `size_t`。

### 第 3 层
把五个数量读入 `unsigned long long` 变量（`%llu`），总数写成 `c * sizeof(char) + s * sizeof(short) + ...`，结果存入 `unsigned long long` 并用 `%llu` 输出。注意 `long long` 的大小要写 `sizeof(long long)`，不能写成 `sizeof(long)`——Windows 上 `long` 只有 4 字节。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    unsigned long long c, s, i, l, d;
    if (scanf("%llu %llu %llu %llu %llu", &c, &s, &i, &l, &d) != 5) {
        return 0;
    }
    /* 总数最大约 2.3e10，超出 32 位范围，必须用 64 位整数保存 */
    unsigned long long total = c * sizeof(char)
                             + s * sizeof(short)
                             + i * sizeof(int)
                             + l * sizeof(long long)
                             + d * sizeof(double);
    printf("%llu\n", total);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    /* 读入五个数量，用 sizeof 计算总字节数 */

    return 0;
}
```

## 复杂度
O(1)。本题考查 `sizeof` 的使用、平台相关的类型大小，以及估算结果范围、选择足够大的整数类型。

## 常见错误
### 用 int 计算，并把大小写死 [UB]
`c * 1 + s * 2 + ...` 全部是 `int` 运算，数量较大时发生有符号整数溢出（未定义行为）。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    int c, s, i, l, d;
    if (scanf("%d %d %d %d %d", &c, &s, &i, &l, &d) != 5) {
        return 0;
    }
    int total = c * 1 + s * 2 + i * 4 + l * 8 + d * 8;
    printf("%d\n", total);
    return 0;
}
```

### 计算正确，但存进了 unsigned int [WA]
`sizeof` 的结果是 64 位的 `size_t`，所以乘法本身没有溢出；但把结果赋给 `unsigned int` 时只保留了低 32 位，超过 4294967295 的答案就错了。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    unsigned long long c, s, i, l, d;
    if (scanf("%llu %llu %llu %llu %llu", &c, &s, &i, &l, &d) != 5) {
        return 0;
    }
    unsigned int total = (unsigned int)(c * sizeof(char) + s * sizeof(short) + i * sizeof(int)
                                        + l * sizeof(long long) + d * sizeof(double));
    printf("%u\n", total);
    return 0;
}
```

### 把 long long 的大小写成 sizeof(long) [WA]
在 64 位 Linux 上 `sizeof(long)` 是 8，碰巧正确；在 Windows 上是 4，答案就错了。这正是"类型大小与平台相关"的典型 bug。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    unsigned long long c, s, i, l, d;
    if (scanf("%llu %llu %llu %llu %llu", &c, &s, &i, &l, &d) != 5) {
        return 0;
    }
    unsigned long long total = c * sizeof(char) + s * sizeof(short) + i * sizeof(int)
                             + l * sizeof(long) + d * sizeof(double);
    printf("%llu\n", total);
    return 0;
}
```

### 用 %d 输出 64 位结果 [WA]
格式说明符与参数类型不一致是未定义行为，常见表现是只打印出低 32 位。`unsigned long long` 用 `%llu`，`size_t` 用 `%zu`。

## 测试用例
### 01 sample 示例 1
```in
1 1 1 1 1
```
```out
23
```

### 02 sample 示例 2
```in
0 0 0 0 0
```
```out
0
```

### 03 boundary 最大规模：全部为 10^9
```in
1000000000 1000000000 1000000000 1000000000 1000000000
```
```out
23000000000
```

### 04 boundary 只有一个 double
```in
0 0 0 0 1
```
```out
8
```

### 05 degenerate 每种数量相同
```in
7 7 7 7 7
```
```out
161
```

### 06 trap 刚好超过 INT_MAX
```in
0 0 536870912 0 0
```
```out
2147483648
```

### 07 trap 恰好是 2^32（存进 32 位变量会变成 0）
```in
0 0 0 268435456 268435456
```
```out
4294967296
```

### 08 degenerate 只有 char
```in
1000000000 0 0 0 0
```
```out
1000000000
```

### 09 normal 一般情况
```in
3 5 10 2 4
```
```out
101
```
