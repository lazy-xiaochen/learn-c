---
id: s5-calloc
---

## 讲解

### calloc 的两个参数与"清零"承诺
`calloc` 的声明在 `<stdlib.h>` 里，和 `malloc` 只差一个参数：

```c
void *calloc(size_t count, size_t size);
```

它申请 `count * size` 字节，并把这块内存的**每一个字节都置为 0**。注意"每个字节"这个说法：`calloc` 只保证二进制位全为 0，并不是逐个元素执行 `a[i] = 0`。对整数数组来说两者结果一样；对浮点数和指针，后面会看到细微差别。

它和 `malloc` 一样：成功返回对齐足够、可供任何类型使用的指针；失败返回 `NULL`；返回的指针必须用 `free` 释放。最常见的用法是申请一个数组：

```c
int *counts = calloc(n, sizeof *counts);   /* n 个 int，全部为 0 */
```

`count` 和 `size` 的顺序无所谓（乘法可交换），但习惯上把"元素个数"放前面、"单个元素大小"放后面。不要写成 `calloc(n)`——少一个参数会直接编译失败。

为什么需要专门一个"清零分配"？因为很多算法一开始就需要一张全零的表：计数器、标记数组、邻接矩阵、哈希桶、动态规划的第一行。用 `malloc` 再手动循环清零当然可以，但容易漏；`calloc` 把"申请 + 清零"合成一个动作，语义更清楚。下面先看它的基本行为：

```c run id=ca-zero
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n = 5;
    int *a = calloc((size_t)n, sizeof *a);
    if (a == NULL) {
        return 1;
    }

    printf("after calloc:");
    for (int i = 0; i < n; i++) {
        printf(" %d", a[i]);
    }
    printf("\n");

    a[2] = 7;                       /* 只改一个元素 */
    printf("after write:");
    for (int i = 0; i < n; i++) {
        printf(" %d", a[i]);
    }
    printf("\n");

    free(a);
    return 0;
}
```
```output
after calloc: 0 0 0 0 0
after write: 0 0 7 0 0
```

从内存角度看，`calloc` 返回前后的区别就是"每个字节都变成 0"：

```memory title="calloc(3, sizeof(int)) 返回前后的堆块（地址为示意）"
时刻 | 3 个 int 的字节 | 说明
malloc 返回后 | ?? ?? ?? | 内容不确定，可能是旧数据
calloc 返回后 | 00 00 00 | 每个字节都写成 0
a[1] = 7 后 | 00 07 00 | 只有被写入的位置发生变化
堆块头 | 大小信息 | 分配器用来回收，不属于用户数据
栈上的 a | 指向堆块 | 指针变量本身仍在栈上
```

### 为什么 calloc 要检查乘法溢出
这是 `calloc` 相对于 `malloc(n * size)` 最重要的优势，也是面试里经常问的点。

`calloc` 接收的是**两个因子**，它可以在内部先判断 `count * size` 会不会超过 `SIZE_MAX`，再决定要不要真的去分配。手写 `malloc(n * size)` 时，乘法发生在**你的代码里**，在调用 `malloc` 之前就已经完成：

```c
size_t bytes = n * size;      /* 先乘，可能已经回绕 */
int *p = malloc(bytes);       /* malloc 只看到一个很小的数，不知道你想要多少 */
```

如果 `n * size` 超过 `size_t` 能表示的范围，无符号乘法会按模 `2^N` 回绕，得到一个很小的数。`malloc` 老老实实地分配了这块"小"内存，然后你按 `n` 个元素去写，就会越界写堆内存——这是堆溢出，属于未定义行为，可能破坏分配器，也可能被 ASan 抓个正着。

`calloc` 的接口让实现有机会在相乘之前发现这个问题。本平台（Clang + UCRT + AddressSanitizer）的实测结果是：溢出的请求直接返回 `NULL`，不会分配一块错误的小内存。下面这个程序同时演示"`calloc` 拒绝溢出"和"手写乘法已经回绕"：

```c run id=ca-overflow
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    size_t n = SIZE_MAX / 2 + 1;      /* 2^63：再乘 2 就超过 SIZE_MAX */

    void *p = calloc(n, 2);           /* calloc 拿到两个因子，可以检查溢出 */
    printf("calloc(n, 2) = %s\n", p == NULL ? "NULL" : "non-NULL");
    free(p);                          /* free(NULL) 是安全的 */

    size_t m = SIZE_MAX / 4 + 1;      /* 2^62 */
    size_t bytes = m * 4;             /* 手写乘法：先回绕，再传给 malloc */
    printf("m * 4 = %zu（回绕后的结果）\n", bytes);
    printf("检查：%s\n", (m > SIZE_MAX / 4) ? "会溢出" : "不会溢出");
    return 0;
}
```
```output
calloc(n, 2) = NULL
m * 4 = 0（回绕后的结果）
检查：会溢出
```

这里 `n * 2` 恰好等于 `2^64`，回绕成 0；`calloc` 没有把它当成"申请 0 字节"，而是识别出乘法溢出并返回 `NULL`。这就是"两个参数"的价值。

但不要因此认为 `calloc` 可以代替你自己的检查。第一，`calloc` 只能检查它自己那次乘法；如果你在调用前就算好了别的尺寸，溢出仍然可能发生。第二，`calloc` 失败只给你一个 `NULL`，你必须检查它，否则还是空指针解引用。处理不可信输入时，最稳妥的写法仍然是先判断：

```c
if (count != 0 && size > SIZE_MAX / count) {
    /* 字节数会溢出，直接报错 */
}
void *p = calloc(count, size);
if (p == NULL) {
    /* 内存不足或参数非法 */
}
```

### calloc 与 malloc + memset 的区别
`calloc(n, size)` 和 `malloc(n * size)` 再加 `memset(p, 0, n * size)` 在结果上很接近，但有三个实际区别：

1. **溢出检查**：如上所述，`calloc` 拿到两个因子，可以在相乘前检查；`malloc(n * size)` 的乘法已经在调用者的代码里完成，溢出后 `malloc` 无法察觉。`memset` 也只能按已经回绕的大小去清零。
2. **性能**：`calloc` 可能直接从操作系统拿到已经清零的页，省掉一次显式写入；`memset` 则一定会把整块内存写一遍。不过这只在块很大、且分配器能复用零页时才有明显差别，不要把它当成绝对规律。
3. **可读性**：`calloc(n, sizeof *p)` 一眼就能看出"申请 n 个元素并清零"；`malloc` + `memset` 需要读两行，还要重复计算一次字节数，容易把 `memset` 的长度写错。

```c run id=ca-compare
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    int n = 3;

    int *a = calloc((size_t)n, sizeof *a);
    int *b = malloc((size_t)n * sizeof *b);
    if (a == NULL || b == NULL) {
        free(a);
        free(b);
        return 1;
    }
    memset(b, 0, (size_t)n * sizeof *b);

    printf("calloc:");
    for (int i = 0; i < n; i++) {
        printf(" %d", a[i]);
    }
    printf("\nmalloc+memset:");
    for (int i = 0; i < n; i++) {
        printf(" %d", b[i]);
    }
    printf("\n");

    free(a);
    free(b);
    return 0;
}
```
```output
calloc: 0 0 0
malloc+memset: 0 0 0
```

两者结果一样，但 `calloc` 的写法更短，也不会出现"`malloc` 的长度和 `memset` 的长度不一致"这种错误。需要清零时优先用 `calloc`；只有在"先申请、稍后才决定是否清零"或者"要对已有内存重新清零"时，`memset` 才更合适。

### 全零字节不一定等于 0.0 或 NULL
`calloc` 的承诺是"所有字节为 0"，不是"每个元素的值等于 0"。这两件事在大多数平台上结果相同，但语言标准并没有为所有类型打包票：

- **整数**：全零字节表示 0，这是可以依赖的；
- **浮点数**：在 IEEE 754 平台上，全零字节是 `+0.0`，所以 `calloc` 出来的 `double` 数组看起来就是 0.0；但 C 标准并不要求所有平台都用 IEEE 754；
- **指针**：空指针的二进制表示由实现决定，全零字节**不保证**等于 `NULL`。在常见的 x86-64 平台上它确实是 0，但换一个平台就可能不是。

```c run id=ca-double
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    double *d = calloc(3, sizeof *d);
    if (d == NULL) {
        return 1;
    }
    printf("d[0]=%.2f d[1]=%.2f d[2]=%.2f\n", d[0], d[1], d[2]);
    free(d);
    printf("on this platform all-zero bytes mean 0.0\n");
    return 0;
}
```
```output
d[0]=0.00 d[1]=0.00 d[2]=0.00
on this platform all-zero bytes mean 0.0
```

所以在需要完全可移植的代码里，如果数组元素是指针，不要假设 `calloc` 会把它们变成 `NULL`；显式循环赋 `NULL` 更稳妥。整数数组则可以放心使用 `calloc` 清零。

另外两个边界情况：

- `calloc(0, size)` 的行为由实现决定：可能返回 `NULL`，也可能返回一个可以传给 `free` 的唯一指针。两种结果都合法，所以不要用"返回值是否为 `NULL`"来判断"申请 0 字节成功还是失败"；
- `calloc` 返回的指针和 `malloc` 一样，要用 `free` 释放，不能 `delete`，也不能对中间元素调用 `free`。

## 编译与运行

用 gcc 或 clang 编译：

```bash
gcc -std=c17 -Wall -Wextra calloc.c -o calloc
./calloc
```

```bash
clang -std=c17 -Wall -Wextra calloc.c -o calloc
./calloc
```

排查越界和重复释放时，打开 AddressSanitizer：

```bash
clang -std=c17 -Wall -Wextra -fsanitize=address,undefined calloc.c -o calloc
./calloc
```

几点说明：

- 溢出检查依赖具体实现。本平台实测 `calloc` 对溢出的请求返回 `NULL`，但换一个运行库可能直接中止进程或返回 `NULL`，所以**不要写依赖"溢出时一定返回 NULL"的可移植逻辑**，该自己检查的乘法还是要检查；
- `calloc` 分配的内存在失败时返回 `NULL`，检查方式和 `malloc` 完全一样；
- 如果题目要求检查泄漏，输出正确但结束时没有 `free` 会判 `LEAK`。`calloc` 也要配对 `free`。

## 常见错误

### 以为 malloc 会清零，于是不用 calloc 也不初始化 [UB]
`malloc` 不清零。读一块没有写过的 `malloc` 内存，得到的是不确定值；读未初始化的值是未定义行为，不是"碰巧为 0"。需要全零表就用 `calloc`，或者 `memset`，或者先写后读。

```c
int *cnt = malloc(n * sizeof *cnt);
cnt[0]++;                  /* 错：cnt[0] 还没有初始化 */
```

### 手写 n * size 时不做溢出检查 [UB]
`malloc(n * size)` 的乘法在调用前就完成了。`n` 和 `size` 都很大时，乘积回绕成一个小数，`malloc` 会"成功"返回一块远小于预期的内存，随后按 `n` 个元素写入就会堆溢出。

```c
size_t bytes = n * size;   /* 可能已经回绕 */
int *p = malloc(bytes);    /* malloc 不知道溢出过 */
for (size_t i = 0; i < n; i++) {
    p[i] = 0;              /* 越界写 */
}
```

正确做法是用 `calloc(n, size)`，或者在乘法前用 `n > SIZE_MAX / size` 检查。

### 以为 calloc 的返回值一定是 NULL 或一定非 NULL（0 字节时）[WA]
`calloc(0, size)` 的返回值由实现决定：可能为 `NULL`，也可能是一个唯一的、可 `free` 的指针。把"返回 NULL"当成"0 字节申请失败"、或者把"返回非 NULL"当成"分配到了内存"，都会写出不可移植的判断。对 0 字节的申请，两种结果都要能处理。

### 忘记 free 或者只 free 了指针的副本 [LEAK]
`calloc` 得到的也是堆内存，必须 `free`。如果函数里申请后提前 `return`，或者把指针赋给别的变量后覆盖了原指针，这块内存就泄漏了。每个 `calloc` 都要有一条确定的释放路径，包括错误分支。

## 客观题

### q-s5-calloc-1 single
关于 `calloc`，下面哪一种说法是正确的？

- [x] `calloc(count, size)` 分配 `count * size` 字节并把每个字节置 0；因为两个因子是分开传入的，实现有机会在相乘前发现溢出。
  > 正确。`calloc` 的接口让它在内部完成乘法，因此可以在乘法前检查 `count * size` 是否超过 `size_t` 的范围；这也是它相对 `malloc(count * size)` 的一个实际优势。清零的单位是字节。
- [ ] `calloc(n, size)` 和 `malloc(n * size)` 再 `memset` 在所有情况下都完全等价。
  > 错。结果通常一样，但 `calloc` 可以在内部检查乘法溢出，`malloc(n * size)` 的乘法在调用前就已经完成，溢出后 `malloc` 无法察觉；两者在性能上也可能不同。
- [ ] `calloc` 分配的内存不需要 `free`，因为它已经清零了。
  > 错。清不清零和要不要释放无关。`calloc` 返回的仍然是堆内存，必须用 `free` 释放，否则就是内存泄漏。
- [ ] `calloc` 只能用来分配 `int` 数组，不能分配 `double` 或指针数组。
  > 错。`calloc` 返回 `void *`，可以用于任何类型。只是要注意：它清零的是字节，对指针数组不要假设全零字节一定等于 `NULL`，需要完全可移植时应显式赋 `NULL`。
