---
id: s2-pointer-arith
---

## 讲解

### `p + 1` 加的不是 1 个字节
指针能做加减法，但单位是**它指向的类型**，不是字节。`int *p` 加 1，地址前进 `sizeof(int)` = 4 字节；`double *q` 加 1，前进 8 字节。

```c run id=step
#include <stdio.h>

int main(void) {
    int a[3] = {10, 20, 30};
    double d[3] = {1.5, 2.5, 3.5};
    int *p = a;
    double *q = d;

    printf("int 指针 +1 前进 %ld 字节\n", (long)((char *)(p + 1) - (char *)p));
    printf("double 指针 +1 前进 %ld 字节\n", (long)((char *)(q + 1) - (char *)q));
    return 0;
}
```
```output
int 指针 +1 前进 4 字节
double 指针 +1 前进 8 字节
```

所以 `p + i` 指向"从 p 开始往后数第 i 个元素"，而不是"往后第 i 个字节"。数组能用下标访问，底层就是这套地址计算：`a[i]` 等价于 `*(a + i)`。

```memory title="int a[4] = {10, 20, 30, 40};  int *p = a + 1;"
地址     | 内容 | 表达式         | 说明
0x1000   | 10   | a[0] / *a      | 数组首元素
0x1004   | 20   | a[1] / *p      | p 指向这里
0x1008   | 30   | a[2] / *(p + 1)| p 往后走一个 int
0x100c   | 40   | a[3] / *(p + 2)| p 往后走两个 int
```

### 两个指针相减
两个**同类型**指针相减，得到的是"它们之间隔了多少个元素"，不是字节数：

```c run id=sub
#include <stdio.h>

int main(void) {
    int a[6] = {10, 20, 30, 40, 50, 60};
    int *p = &a[1];
    int *q = &a[5];

    printf("q - p = %ld\n", (long)(q - p));          /* 5 - 1 = 4 个元素 */
    printf("字节距离 = %ld\n", (long)((char *)q - (char *)p));
    return 0;
}
```
```output
q - p = 4
字节距离 = 16
```

结果类型是 `ptrdiff_t`（一个有符号整数类型），这里转成 `long` 打印。两个指针必须指向同一块数组（或数组末尾的下一个位置），否则相减没有意义。

### 用指针遍历数组
`for (int *p = a; p < a + n; p++)` 是 C 里非常常见的遍历写法：`p` 从首元素开始，每次加 1 就移到下一个元素，直到走到 `a + n`（最后一个元素的**下一个**位置，不能解引用）。

```c run id=traverse
#include <stdio.h>

int main(void) {
    int a[5] = {3, 1, 4, 1, 5};
    int sum = 0;

    for (int *p = a; p < a + 5; p++) {
        sum += *p;
    }
    printf("sum = %d\n", sum);
    return 0;
}
```
```output
sum = 14
```

`a + 5` 这个"末尾的下一个位置"是允许**计算和比较**的，但**不能解引用**。这种"半开区间"写法能避免最后一个元素的边界错误。

### `*p++` 和 `(*p)++` 完全不同
这是指针部分最经典的陷阱：

- `*p++`：先取 `*p` 的值，**然后**让 `p` 指向下一个元素（`++` 作用于 `p`）；
- `(*p)++`：让 `p` 指向的那个**值**加 1，`p` 本身不动。

因为 `++` 的优先级高于 `*`，所以 `*p++` 等价于 `*(p++)`。

```c run id=postinc
#include <stdio.h>

int main(void) {
    int a[3] = {1, 2, 3};
    int *p = a;

    printf("*p++ = %d\n", *p++);    /* 取出 1，然后 p 指向 a[1] */
    printf("*p   = %d\n", *p);      /* 现在是 2 */
    printf("(*p)++ 之后：%d\n", (*p)++);   /* 取出 2，再把 a[1] 变成 3 */
    printf("a[1] = %d\n", a[1]);
    return 0;
}
```
```output
*p++ = 1
*p   = 2
(*p)++ 之后：2
a[1] = 3
```

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra arith.c -o arith
./arith
```

本平台用 Clang，命令等价：`clang -std=c17 -Wall -Wextra arith.c -o arith`。
指针运算越界属于未定义行为，`-Wall` 不一定能发现，要靠自己保证边界。

## 常见错误

### 以为 `p + 1` 前进一个字节
如果真是按字节算的，`int` 数组就没法用指针正常遍历了。记住：步长 = `sizeof(*p)`。

### 指针相减时用字节数
`(q - p)` 得到的是元素个数。想要字节数必须先把两个指针转成 `char *` 再相减。两者混用会让结果凭空差 4 倍（`int`）或 8 倍（`double`）。

### 解引用"末尾的下一个位置"
`a + n` 可以用于比较，但 `*(a + n)` 是越界读。循环条件要写 `p < a + n`，而不是 `p <= a + n`。

### 两个不同数组的指针相减
```c
int a[3], b[3];
(ptrdiff_t)(&b[0] - &a[0]);   /* 未定义行为 */
```
只有指向同一数组（或同一数组末尾）的指针相减才有定义。

## 客观题

### q-s2-pointer-arith-1 single
```c
int a[5] = {10, 20, 30, 40, 50};
int *p = a;
p += 2;
printf("%d\n", *p);
```
输出是：

- [x] `30`
  > 正确。`p` 从 a[0] 前进 2 个元素，指向 a[2]，值是 30。
- [ ] `12`
  > 这是把 `p += 2` 当成"地址加 2 字节"了；实际加的是 2 × sizeof(int)。
- [ ] `20`
  > 只前进了 1 个元素才会是 20。
- [ ] `越界`
  > 下标 2 在 0–4 范围内，没有越界。


