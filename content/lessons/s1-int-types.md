---
id: s1-int-types
---

## 讲解

### 整数类型一览
C 语言有好几种整数类型，区别在于**占多少字节**，从而决定了**能表示多大的数**。一个字节是 8 个二进制位（bit）。

用 `sizeof` 运算符可以得到一个类型或变量占多少字节。它的结果类型是 `size_t`（一种无符号整数），用 `%zu` 输出：

```c run id=sizes
#include <stdio.h>

int main(void) {
    printf("char      : %zu 字节\n", sizeof(char));
    printf("short     : %zu 字节\n", sizeof(short));
    printf("int       : %zu 字节\n", sizeof(int));
    printf("long      : %zu 字节\n", sizeof(long));
    printf("long long : %zu 字节\n", sizeof(long long));

    int x = 0;
    printf("变量 x    : %zu 字节\n", sizeof x);   /* 对变量用 sizeof 可以不加括号 */
    return 0;
}
```
```output
char      : 1 字节
short     : 2 字节
int       : 4 字节
long      : 4 字节
long long : 8 字节
变量 x    : 4 字节
```

注意 `long`：本平台（Windows）上它是 4 字节，而在 64 位 Linux 和 macOS 上是 **8 字节**。C 标准只规定了每种类型的**最小**大小：

| 类型 | 标准规定的最小位数 | 本平台 | 64 位 Linux |
|---|---|---|---|
| `char` | 8 | 1 字节 | 1 字节 |
| `short` | 16 | 2 字节 | 2 字节 |
| `int` | 16 | 4 字节 | 4 字节 |
| `long` | 32 | 4 字节 | 8 字节 |
| `long long` | 64 | 8 字节 | 8 字节 |

所以需要 64 位整数时，用 `long long`（或者后面会学到的 `<stdint.h>` 中的 `int64_t`），不要依赖 `long`。

### 取值范围与 <limits.h>
n 个二进制位能表示 2ⁿ 种不同的值。**有符号**（signed，默认）类型用其中一半表示负数，**无符号**（unsigned）类型全部用来表示非负数：

| 类型（本平台） | 最小值 | 最大值 | `<limits.h>` 中的宏 |
|---|---|---|---|
| `signed char` | -128 | 127 | `SCHAR_MIN` / `SCHAR_MAX` |
| `unsigned char` | 0 | 255 | `UCHAR_MAX` |
| `short` | -32768 | 32767 | `SHRT_MIN` / `SHRT_MAX` |
| `int` | -2147483648 | 2147483647 | `INT_MIN` / `INT_MAX` |
| `unsigned int` | 0 | 4294967295 | `UINT_MAX` |
| `long long` | -9223372036854775808 | 9223372036854775807 | `LLONG_MIN` / `LLONG_MAX` |
| `unsigned long long` | 0 | 18446744073709551615 | `ULLONG_MAX` |

有符号类型的范围**不对称**：负数比正数多一个（-128 ~ 127）。这是因为现代计算机都用"补码"表示负数，0 占用了"正数一侧"的一个位置。

```c run id=limits
#include <stdio.h>
#include <limits.h>

int main(void) {
    printf("int:        %d ~ %d\n", INT_MIN, INT_MAX);
    printf("unsigned:   0 ~ %u\n", UINT_MAX);
    printf("long long:  %lld ~ %lld\n", LLONG_MIN, LLONG_MAX);
    return 0;
}
```
```output
int:        -2147483648 ~ 2147483647
unsigned:   0 ~ 4294967295
long long:  -9223372036854775808 ~ 9223372036854775807
```

### 超出范围会怎样
- **无符号**整数超出范围时，结果是**定义良好的回绕**：对 2ⁿ 取模。`UINT_MAX + 1` 一定等于 0。
- **有符号**整数超出范围（溢出）是**未定义行为**：标准不规定结果，编译器可以假设它永远不会发生。阶段 5 会专门讲它带来的后果。

```c run id=wrap
#include <stdio.h>
#include <limits.h>

int main(void) {
    unsigned int u = UINT_MAX;
    u = u + 1;                 /* 无符号回绕：结果是 0，这是标准保证的 */
    printf("UINT_MAX + 1 = %u\n", u);

    unsigned int z = 0;
    z = z - 1;                 /* 0 - 1 回绕成最大值 */
    printf("0u - 1 = %u\n", z);
    return 0;
}
```
```output
UINT_MAX + 1 = 0
0u - 1 = 4294967295
```

### char 也是整数
`char` 存放的其实是一个小整数（字符的编码，比如 `'A'` 是 65）。但普通的 `char` 是有符号还是无符号，**由编译器决定**（x86 上通常有符号，ARM 上通常无符号）。需要用它存数字时，明确写出 `signed char` 或 `unsigned char`。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra sizes.c -o sizes
./sizes
```

在 64 位 Linux 上运行同一个程序，`long` 那一行会输出 8。这正说明了：**类型大小是平台相关的，要用 sizeof 查询，不要靠猜。**

## 常见错误

### 以为 long 一定是 8 字节
在 Linux 上写的程序用 `long` 存放超过 21 亿的数，搬到 Windows 上就会溢出。需要 64 位时用 `long long`。

### 用 %d 输出无符号数或 sizeof 的结果
`printf("%d", UINT_MAX)` 会把 4294967295 当作有符号数解释，输出 -1。格式说明符必须和类型一致：`unsigned int` 用 `%u`，`size_t` 用 `%zu`，`long long` 用 `%lld`，`unsigned long long` 用 `%llu`。`-Wall` 会对这类错误给出警告：

```c run id=bad-format warnings=allow
#include <stdio.h>
#include <limits.h>

int main(void) {
    printf("%d\n", UINT_MAX);
    return 0;
}
```
```output
-1
```

### 以为有符号溢出也会"回绕"
`INT_MAX + 1` 并不保证得到 `INT_MIN`。它是未定义行为，开启优化后可能出现完全意想不到的结果。本平台的检测工具会直接报告它：

```c run id=signed-overflow expect=UB stdin="2147483647"
#include <stdio.h>

int main(void) {
    int x;
    if (scanf("%d", &x) != 1) return 1;
    printf("%d\n", x + 1);
    return 0;
}
```

## 客观题

### q-s1-int-types-1 single type-reasoning
在本平台（Windows x64）上，下面这段代码的输出是什么？
```c
unsigned char a = 250;
a = a + 10;
printf("%d %zu\n", a, sizeof(long));
```
- [ ] `260 8`
  > `unsigned char` 只有 8 位，最大 255，存不下 260；另外 Windows 上 `long` 是 4 字节。
- [ ] `260 4`
  > 260 超出了 `unsigned char` 的范围，赋值时会按 256 取模。
- [x] `4 4`
  > 正确。`a + 10` 先按 int 计算得 260，赋回 `unsigned char` 时按 2⁸ = 256 取模得 4（无符号类型的转换是定义良好的）；Windows 上 `sizeof(long)` 为 4。
- [ ] 未定义行为，结果无法确定
  > 转换成**无符号**类型时超出范围的结果是标准规定好的（取模），不是未定义行为。只有有符号整数运算溢出才是未定义行为。
