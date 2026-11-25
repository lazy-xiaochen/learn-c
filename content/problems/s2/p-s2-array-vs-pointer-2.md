---json
{
  "id": "p-s2-array-vs-pointer-2",
  "title": "指针与数组的类型推理：arr、&arr、sizeof 的九个结果",
  "difficulty": "L3",
  "knowledgePoints": ["s2-array-vs-pointer", "s2-array-decay"],
  "special": "pointer-reasoning",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入 5 个整数放进 `int a[5]`，再读入一个下标 `k`（0 ≤ k ≤ 4）。程序里执行下面两句：

```c
int *p = a + k;          /* p 的类型是 int * */
int (*q)[5] = &a;        /* q 的类型是 int (*)[5]，指向整个数组 */
```

请你推算出下面 9 个表达式的值并按顺序输出：

| 序号 | 表达式 | 提示 |
|---|---|---|
| 1 | `(char *)(p + 1) - (char *)p` | `p` 加 1 前进多少字节 |
| 2 | `(char *)(q + 1) - (char *)q` | `q` 加 1 前进多少字节 |
| 3 | `(char *)(q + 1) - (char *)p` | 两个地址之间的字节距离 |
| 4 | `sizeof a` | 整个数组占多少字节 |
| 5 | `sizeof *q` | `*q` 是什么类型 |
| 6 | `sizeof p` | 指针本身多大 |
| 7 | `sizeof a / sizeof a[0]` | 元素个数 |
| 8 | `p - a` | 指针相减，单位是元素 |
| 9 | `(*q)[k]` | 通过数组指针访问元素 |

要求在你的程序里**真的声明 `p` 和 `q`**，用它们做上面的运算，不要把结果直接写成常量。本平台是 64 位环境，`int` 占 4 字节、指针占 8 字节。

## 输入格式
第一行 5 个整数，用空格分隔。
第二行一个整数 `k`。

## 输出格式
9 行，每行一个整数，顺序与题目描述中的表格一致。

## 数据范围
-2147483648 ≤ 每个元素 ≤ 2147483647
0 ≤ k ≤ 4

## 示例
### 示例 1
```in
10 20 30 40 50
2
```
```out
4
20
12
20
20
8
5
2
30
```
> `p` 指向 `a[2]`，`p + 1` 走 4 字节；`q` 指向整个数组，`q + 1` 走 20 字节。`q + 1` 的字节地址比 `p` 大 20 − 8 = 12。`*q` 是整个数组，所以 `sizeof *q` 是 20。

### 示例 2（边界：k = 0）
```in
7 7 7 7 7
0
```
```out
4
20
20
20
20
8
5
0
7
```
> `p` 就是 `a`，所以 `p - a` 是 0，`q + 1` 与 `p` 相差整整 20 字节。

## 提示
### 第 1 层
先分清三个东西的类型：`a` 是 `int[5]`，`p` 是 `int *`，`q` 是 `int (*)[5]`。指针加减 1 前进多少，完全由它指向的类型大小决定。

### 第 2 层
`sizeof` 是少数几个"数组名不退化"的场合：`sizeof a` 看到的是整个数组，而 `sizeof p` 看到的是指针。`*q` 又变回了数组类型（`int[5]`），所以 `sizeof *q` 等于 `sizeof a`。指针相减 `p - a` 的单位是元素，不是字节。

### 第 3 层
`int` 是 4 字节、数组 5 个元素所以是 20 字节、指针是 8 字节。第 3 个表达式 = 20 − 4 × k。第 9 个表达式就是 `a[k]`——`*q` 是整个数组，再 `[k]` 取第 k 个元素。写代码时直接把这些表达式放进 `printf`，别手算成常量。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int a[5];
    for (int i = 0; i < 5; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int k;
    if (scanf("%d", &k) != 1 || k < 0 || k > 4) {
        return 0;
    }

    int *p = a + k;        /* int * */
    int (*q)[5] = &a;      /* 指向整个数组的指针 */

    printf("%ld\n", (long)((char *)(p + 1) - (char *)p));
    printf("%ld\n", (long)((char *)(q + 1) - (char *)q));
    printf("%ld\n", (long)((char *)(q + 1) - (char *)p));
    printf("%zu\n", sizeof a);
    printf("%zu\n", sizeof *q);
    printf("%zu\n", sizeof p);
    printf("%zu\n", sizeof a / sizeof a[0]);
    printf("%ld\n", (long)(p - a));
    printf("%d\n", (*q)[k]);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int a[5];
    for (int i = 0; i < 5; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int k;
    if (scanf("%d", &k) != 1 || k < 0 || k > 4) {
        return 0;
    }

    /* TODO: 声明 int *p = a + k; 和 int (*q)[5] = &a; 再输出那 9 个表达式的值 */
    printf("0\n0\n0\n0\n0\n0\n0\n0\n0\n");
    return 0;
}
```

## 复杂度
时间 O(1)：只有固定的几次运算和输出。
空间 O(1)：固定 5 个 `int`。

本题不是算法题，考的是"指针类型如何决定步长、`sizeof` 与 `&` 如何影响数组名"。

## 常见错误
### 以为 `&a + 1` 也只前进 4 字节 [WA]
把 `q` 写成 `int *q = (int *)&a;`，虽然地址值一样，但类型变成了 `int *`，`q + 1` 只走 4 字节。要得到 20 字节的步长，必须保留 `int (*)[5]` 类型，或者直接把 `&a` 当作"整个数组"来用。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int a[5];
    for (int i = 0; i < 5; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int k;
    if (scanf("%d", &k) != 1 || k < 0 || k > 4) {
        return 0;
    }

    int *p = a + k;
    int *q = (int *)&a;      /* 错：丢掉了“指向整个数组”的类型信息 */

    printf("%ld\n", (long)((char *)(p + 1) - (char *)p));
    printf("%ld\n", (long)((char *)(q + 1) - (char *)q));
    printf("%ld\n", (long)((char *)(q + 1) - (char *)p));
    printf("%zu\n", sizeof a);
    printf("%zu\n", sizeof a);          /* 这里也退而求其次了 */
    printf("%zu\n", sizeof p);
    printf("%zu\n", sizeof a / sizeof a[0]);
    printf("%ld\n", (long)(p - a));
    printf("%d\n", a[k]);
    return 0;
}
```

### 用 `sizeof(int *)` 算元素个数 [WA]
元素个数是"数组总字节数 ÷ 单个元素字节数"：`sizeof a / sizeof a[0]` = 20 / 4 = 5。写成 `sizeof a / sizeof(int *)` 就变成 20 / 8 = 2，和数组长度毫无关系。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int a[5];
    for (int i = 0; i < 5; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int k;
    if (scanf("%d", &k) != 1 || k < 0 || k > 4) {
        return 0;
    }

    int *p = a + k;
    int (*q)[5] = &a;

    printf("%ld\n", (long)((char *)(p + 1) - (char *)p));
    printf("%ld\n", (long)((char *)(q + 1) - (char *)q));
    printf("%ld\n", (long)((char *)(q + 1) - (char *)p));
    printf("%zu\n", sizeof a);
    printf("%zu\n", sizeof *q);
    printf("%zu\n", sizeof p);
    printf("%zu\n", sizeof a / sizeof(int *));   /* 错：除的是指针大小 */
    printf("%ld\n", (long)(p - a));
    printf("%d\n", (*q)[k]);
    return 0;
}
```

### 把 `p - a` 当成字节数 [WA]
`p - a` 的单位是**元素**：`p = a + k` 时结果是 k。想要字节数必须先把两个指针转成 `char *`，例如 `(char *)p - (char *)a`，那才是 4k。题目第 1、3 个表达式要的就是字节数，第 8 个要的是元素个数，别弄混。

### 把 `(*q)[k]` 写成 `*q[k]` [WA|UB]
`q[k]` 相当于 `*(q + k)`，会先跳过 k 个**数组**（k × 20 字节）。k = 0 时它碰巧还能得到 `a[0]`，只要 k ≥ 1 就已经越界，`*q[k]` 再解引用就是读数组外面的内存。正确写法是 `(*q)[k]`：先用 `*q` 拿回整个数组，再取下标。`[` 的优先级比 `*` 高，这里的括号不能省。

## 测试用例
### 01 sample 示例 1
```in
10 20 30 40 50
2
```
```out
4
20
12
20
20
8
5
2
30
```

### 02 sample 示例 2
```in
7 7 7 7 7
0
```
```out
4
20
20
20
20
8
5
0
7
```

### 03 boundary k 取最大下标 4
```in
1 2 3 4 5
4
```
```out
4
20
4
20
20
8
5
4
5
```

### 04 degenerate 全 0、k 在中间
```in
0 0 0 0 0
3
```
```out
4
20
8
20
20
8
5
3
0
```

### 05 trap 含负数，别把负号当成运算
```in
-1000000000 1000000000 -7 0 7
1
```
```out
4
20
16
20
20
8
5
1
1000000000
```

### 06 trap 元素值恰好和步长一样
```in
4 20 4 20 4
2
```
```out
4
20
12
20
20
8
5
2
4
```

### 07 normal 递增数组
```in
11 22 33 44 55
3
```
```out
4
20
8
20
20
8
5
3
44
```

### 08 boundary int 的两个端点
```in
2147483647 -2147483648 0 1 -1
4
```
```out
4
20
4
20
20
8
5
4
-1
```
