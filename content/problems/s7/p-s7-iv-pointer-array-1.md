---json
{
  "id": "p-s7-iv-pointer-array-1",
  "title": "指针与数组的表达式推理：sizeof、&、步长与退化",
  "difficulty": "L5",
  "knowledgePoints": ["s7-iv-pointer-array"],
  "special": "pointer-reasoning",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入 5 个整数放进 `int a[5]`，再读入一个下标 `k`（`0 ≤ k ≤ 4`）。程序里声明下面四个"看起来都和数组有关"的对象：

```c
int *p = a + k;                                  /* 指向第 k 个元素 */
int (*q)[5] = &a;                                /* 指向整个数组 */
int *r[3] = { &a[0], &a[2], &a[4] };             /* 指针数组：3 个 int * */
int **pp = r;                                    /* 二级指针：指向 r[0] */
```

请你推算出下面 14 个表达式的值，并按序号顺序输出。**必须真的声明并使用这四个对象**，不要把结果直接写成常量——本题考的是类型推理，不是算术。

| 序号 | 表达式 | 提示 |
|---|---|---|
| 1 | `sizeof a` | 数组名在 `sizeof` 里不退化 |
| 2 | `sizeof p` | 指针本身多大 |
| 3 | `sizeof *q` | `*q` 是什么类型 |
| 4 | `sizeof r` | `r` 是数组还是指针 |
| 5 | `sizeof *r` | `*r` 是什么类型 |
| 6 | `sizeof(int (*)[5])` | 指向整个数组的指针类型 |
| 7 | `(char *)(p + 1) - (char *)p` | `p + 1` 前进多少字节 |
| 8 | `(char *)(q + 1) - (char *)q` | `q + 1` 前进多少字节 |
| 9 | `(char *)(r + 1) - (char *)r` | `r + 1` 前进多少字节 |
| 10 | `p - a` | 指针相减的单位是什么 |
| 11 | `r[2] - a` | `r[2]` 指向哪里 |
| 12 | `pp[1] - a` | `pp[1]` 就是 `r[1]` |
| 13 | `(*q)[k]` | 先拿回数组再取下标 |
| 14 | `*(pp[2])` | `pp[2]` 就是 `r[2]` |

本平台是 64 位环境：`int` 占 4 字节、指针占 8 字节。所有地址差都用 `(char *)` 转换成字节数后再相减；指针相减本身（第 10–12 项）的单位是元素，不要转成字节。

## 输入格式
第一行 5 个整数，用空格分隔，依次是 `a[0]` 到 `a[4]`。
第二行一个整数 `k`。

## 输出格式
14 行，每行一个整数，顺序与题目描述中的表格一致。第 1–6 项是 `sizeof` 的结果，用十进制输出。

## 数据范围
-2147483648 ≤ 每个元素 ≤ 2147483647
0 ≤ k ≤ 4

输出只有 14 行，远小于 64KB。`int` 的范围对本题的布局没有影响，但端点值可以检验你有没有把它当成"指针大小"或"步长"去理解。

## 示例
### 示例 1
```in
10 20 30 40 50
2
```
```out
20
8
20
24
8
8
4
20
8
2
4
2
30
50
```
> `a` 是 `int[5]`，所以 `sizeof a` 是 20；`p`、`q`、`pp` 都是指针，`sizeof` 是 8；`r` 是 3 个指针的数组，所以是 24，而 `*r` 是 `int *`，是 8。`p + 1` 走一个 `int`（4 字节），`q + 1` 走一整个 `int[5]`（20 字节），`r + 1` 走一个指针（8 字节）。`p = a + 2` 所以 `p - a` 是 2。

### 示例 2（边界：k = 0，`p` 指向首元素）
```in
7 7 7 7 7
0
```
```out
20
8
20
24
8
8
4
20
8
0
4
2
7
7
```
> `k = 0` 时 `p` 就是 `a`，`p - a` 是 0；第 13 项 `(*q)[0]` 和 `a[0]` 相同。注意第 11、12 项与 `k` 无关：`r[2]` 永远指向 `a[4]`，`pp[1]` 永远指向 `a[2]`。

## 提示
### 第 1 层
先把四个对象的类型写出来：`p` 是 `int *`，`q` 是 `int (*)[5]`，`r` 是 `int *[3]`，`pp` 是 `int **`。然后逐个表达式问自己："这个对象加 1，要跨过它指向的那个类型的一整个对象。"

### 第 2 层
`sizeof` 是编译期运算，只看类型不看值：`sizeof a` 是整个数组，`sizeof *q` 也是整个数组（因为 `*q` 的类型是 `int[5]`），`sizeof p` 和 `sizeof *r` 都是指针。第 7–9 项必须先把指针转成 `char *` 再相减，否则减出来的是元素个数。

### 第 3 层
`r` 是数组，`r[i]` 是 `int *`，所以 `r[2] - a` 是元素距离 4；`pp` 指向 `r[0]`，`pp[i]` 就是 `r[i]`，`pp[1]` 指向 `a[2]`。第 13 项注意括号：`(*q)[k]` 先 `*q` 得到整个数组，再取第 `k` 个；写成 `*q[k]` 会先跳过 `k` 个数组。

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

    int k = 0;
    if (scanf("%d", &k) != 1 || k < 0 || k > 4) {
        return 0;
    }

    int *p = a + k;
    int (*q)[5] = &a;
    int *r[3] = { &a[0], &a[2], &a[4] };
    int **pp = r;

    printf("%zu\n", sizeof a);
    printf("%zu\n", sizeof p);
    printf("%zu\n", sizeof *q);
    printf("%zu\n", sizeof r);
    printf("%zu\n", sizeof *r);
    printf("%zu\n", sizeof(int (*)[5]));
    printf("%ld\n", (long)((char *)(p + 1) - (char *)p));
    printf("%ld\n", (long)((char *)(q + 1) - (char *)q));
    printf("%ld\n", (long)((char *)(r + 1) - (char *)r));
    printf("%ld\n", (long)(p - a));
    printf("%ld\n", (long)(r[2] - a));
    printf("%ld\n", (long)(pp[1] - a));
    printf("%d\n", (*q)[k]);
    printf("%d\n", *(pp[2]));
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

    int k = 0;
    if (scanf("%d", &k) != 1 || k < 0 || k > 4) {
        return 0;
    }

    int *p = a + k;
    (void)p;    /* TODO: 还要声明 int (*q)[5] = &a; 以及 int *r[3]、int **pp */

    printf("%zu\n", sizeof a);   /* 第 1 项先给你 */
    printf("%zu\n", sizeof p);   /* 第 2 项 */
    printf("0\n0\n0\n0\n0\n0\n0\n0\n0\n0\n");   /* TODO: 第 3–12 项 */
    printf("%d\n", a[k]);        /* TODO: 第 13 项要用 (*q)[k] */
    printf("%d\n", a[4]);        /* TODO: 第 14 项要用 *(pp[2]) */
    return 0;
}
```

## 复杂度
时间 O(1)：14 次 `printf`，没有任何循环。
空间 O(1)：5 个 `int`、3 个指针、几个指针变量。

本题不是算法题，考的是"类型决定步长"和"数组名什么时候退化"。面试官真正想听的是每一步的**类型**，而不是最后的数字。

## 常见错误
### 把 `q` 写成 `int *q = (int *)&a;` [WA]
`&a` 的值和 `&a[0]` 一样，但类型不同：`int (*)[5]` 加 1 走 20 字节，`int *` 加 1 只走 4 字节。用强制转换把类型抹掉，`q + 1` 的步长和 `sizeof *q` 就全错了。

```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int a[5];
    for (int i = 0; i < 5; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }
    int k = 0;
    if (scanf("%d", &k) != 1) {
        return 0;
    }

    int *p = a + k;
    int *q = (int *)&a;          /* 错：丢掉了“指向整个数组”的类型 */
    int *r[3] = { &a[0], &a[2], &a[4] };
    int **pp = r;

    printf("%zu\n", sizeof a);
    printf("%zu\n", sizeof p);
    printf("%zu\n", sizeof *q);
    printf("%zu\n", sizeof r);
    printf("%zu\n", sizeof *r);
    printf("%zu\n", sizeof(int (*)[5]));
    printf("%ld\n", (long)((char *)(p + 1) - (char *)p));
    printf("%ld\n", (long)((char *)(q + 1) - (char *)q));
    printf("%ld\n", (long)((char *)(r + 1) - (char *)r));
    printf("%ld\n", (long)(p - a));
    printf("%ld\n", (long)(r[2] - a));
    printf("%ld\n", (long)(pp[1] - a));
    printf("%d\n", q[k]);
    printf("%d\n", *(pp[2]));
    return 0;
}
```

### 把 `pp` 写成 `int *pp = a;` [WA]
`int **pp` 和 `int *pp` 差一层间接：`pp[1]` 在主程序里是 `r[1]`（指向 `a[2]`），写成 `int *pp = a` 之后 `pp[1]` 就是 `a[1]`，`pp[1] - a` 从 2 变成 1；`*(pp[2])` 也从 `a[4]` 变成 `a[2]`。

```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int a[5];
    for (int i = 0; i < 5; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }
    int k = 0;
    if (scanf("%d", &k) != 1) {
        return 0;
    }

    int *p = a + k;
    int (*q)[5] = &a;
    int *r[3] = { &a[0], &a[2], &a[4] };
    int *pp = a;                 /* 错：少了一层，pp 不是指向指针的指针 */

    printf("%zu\n", sizeof a);
    printf("%zu\n", sizeof p);
    printf("%zu\n", sizeof *q);
    printf("%zu\n", sizeof r);
    printf("%zu\n", sizeof *r);
    printf("%zu\n", sizeof(int (*)[5]));
    printf("%ld\n", (long)((char *)(p + 1) - (char *)p));
    printf("%ld\n", (long)((char *)(q + 1) - (char *)q));
    printf("%ld\n", (long)((char *)(r + 1) - (char *)r));
    printf("%ld\n", (long)(p - a));
    printf("%ld\n", (long)(r[2] - a));
    printf("%ld\n", (long)((pp + 1) - a));
    printf("%d\n", (*q)[k]);
    printf("%d\n", *(pp + 2));
    return 0;
}
```

### 把 `p - a` 当成字节数 [WA]
指针相减的单位是**元素**，`p = a + k` 时结果就是 `k`。想要字节数必须先转成 `char *`（第 7 项就是那么做的）。把第 10 项写成 `(char *)p - (char *)a`，结果会变成 `4k`。

```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int a[5];
    for (int i = 0; i < 5; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }
    int k = 0;
    if (scanf("%d", &k) != 1) {
        return 0;
    }

    int *p = a + k;
    int (*q)[5] = &a;
    int *r[3] = { &a[0], &a[2], &a[4] };
    int **pp = r;

    printf("%zu\n", sizeof a);
    printf("%zu\n", sizeof p);
    printf("%zu\n", sizeof *q);
    printf("%zu\n", sizeof r);
    printf("%zu\n", sizeof *r);
    printf("%zu\n", sizeof(int (*)[5]));
    printf("%ld\n", (long)((char *)(p + 1) - (char *)p));
    printf("%ld\n", (long)((char *)(q + 1) - (char *)q));
    printf("%ld\n", (long)((char *)(r + 1) - (char *)r));
    printf("%ld\n", (long)((char *)p - (char *)a));   /* 错：这是字节数，不是元素个数 */
    printf("%ld\n", (long)(r[2] - a));
    printf("%ld\n", (long)(pp[1] - a));
    printf("%d\n", (*q)[k]);
    printf("%d\n", *(pp[2]));
    return 0;
}
```

### 把 `sizeof a` 算成 `sizeof(int *)` [WA]
`a` 是数组，`sizeof a` 是 5 × 4 = 20，不是指针的 8。把数组和指针混为一谈的人会写出 `sizeof a == 8` 或 `5 * sizeof(int *) == 40` 这类答案，第 1 项直接错。

### 把 `(*q)[k]` 写成 `*q[k]` [WA|UB]
`q[k]` 相当于 `*(q + k)`：`q` 指向 `int[5]`，加 `k` 会跳过 `k` 个**数组**（k × 20 字节）。`k = 0` 时它碰巧还能得到 `a[0]`，`k ≥ 1` 时已经越界，`*q[k]` 再解引用就是读数组外面的内存。正确写法必须带括号：先 `*q` 拿回整个数组，再 `[k]`。

## 测试用例
### 01 sample 示例 1
```in
10 20 30 40 50
2
```
```out
20
8
20
24
8
8
4
20
8
2
4
2
30
50
```

### 02 sample 示例 2
```in
7 7 7 7 7
0
```
```out
20
8
20
24
8
8
4
20
8
0
4
2
7
7
```

### 03 boundary k 取最大下标 4
```in
1 2 3 4 5
4
```
```out
20
8
20
24
8
8
4
20
8
4
4
2
5
5
```

### 04 degenerate 全 0，k 在中间
```in
0 0 0 0 0
3
```
```out
20
8
20
24
8
8
4
20
8
3
4
2
0
0
```

### 05 trap 元素值恰好等于步长
```in
4 20 4 20 4
2
```
```out
20
8
20
24
8
8
4
20
8
2
4
2
4
4
```

### 06 trap int 的两个端点值
```in
-2147483648 2147483647 -1 0 7
1
```
```out
20
8
20
24
8
8
4
20
8
1
4
2
2147483647
7
```

### 07 normal 递增数组，k = 3
```in
11 22 33 44 55
3
```
```out
20
8
20
24
8
8
4
20
8
3
4
2
44
55
```
