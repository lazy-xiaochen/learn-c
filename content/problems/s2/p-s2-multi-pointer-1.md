---json
{
  "id": "p-s2-multi-pointer-1",
  "title": "修复一个链接失败的多文件工程：用二级指针带回最值位置",
  "difficulty": "L3",
  "knowledgePoints": ["s2-multi-pointer", "s1-compile-pipeline"],
  "special": "link-diagnosis",
  "judge": { "mode": "multi", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
同事交给你一个由三个文件组成的小工程，功能是：读入一列整数，输出最小值和最大值以及它们第一次出现的位置，最后输出所有数的和。

| 文件 | 职责 |
|---|---|
| `stats.h` | 声明 `find_min_max` 和 `sum_array` |
| `stats.c` | 实现这两个函数 |
| `main.c` | 读入数据、调用函数、输出结果 |

设计上，`find_min_max` 不返回下标，而是通过两个**二级指针**把"最小值在哪里、最大值在哪里"带回给调用者：

```c
void find_min_max(int *a, int n, int **pmin, int **pmax);
```

可是这个工程现在**链接失败**，编译器给出的信息是：

```
ld.lld: error: undefined symbol: find_min_max
>>> referenced by main.c
clang: error: linker command failed with exit code 1
```

请先读懂这条报错：它出现在**链接**阶段，而不是编译阶段——`main.c` 编译得好好的（因为它看到了头文件里的声明），但链接器在所有目标文件里都找不到名为 `find_min_max` 的**定义**。对照一下头文件里的声明和 `stats.c` 里定义的函数名，就能发现原因。

修好链接错误之后，程序可能还会崩溃或输出错误——`find_min_max` 的实现里还藏着二级指针用法的 bug。请一并修好，让程序对数据范围内的所有输入都输出正确结果。

你可以修改三个文件中的任何一个，提交时三个文件都会参与编译和链接。

## 输入格式
第一行一个整数 `n`。
第二行 `n` 个整数，表示数组元素。

## 输出格式
三行，格式固定：

```
min=最小值 index=首次出现的下标
max=最大值 index=首次出现的下标
sum=所有元素之和
```

下标从 0 开始。如果最小值或最大值出现了多次，取**第一次**出现的位置。

## 数据范围
- 1 ≤ n ≤ 1000
- |a[i]| ≤ 1000000000

元素之和最大可达 `1000 × 10^9 = 10^12`，超过 `int` 的上限，所以 `sum_array` 的返回类型是 `long long`，累加也必须用 `long long`。

## 示例
### 示例 1
```in
5
3 -7 12 0 -7
```
```out
min=-7 index=1
max=12 index=2
sum=1
```
> 最小值 -7 出现了两次（下标 1 和 4），取第一次的下标 1；最大值 12 在下标 2；总和 `3-7+12+0-7=1`。

### 示例 2（边界：只有一个元素）
```in
1
-5
```
```out
min=-5 index=0
max=-5 index=0
sum=-5
```
> 只有一个元素时，它同时是最小值和最大值，下标都是 0。这种规模下 `find_min_max` 的循环一次都不会执行，很容易暴露"初始化写错"的问题。

## 提示
### 第 1 层
先别急着改代码，仔细看报错的前缀：`ld.lld` 是链接器。这说明每个 `.c` 文件都编译通过了，问题出在"把目标文件拼成可执行文件"这一步。

### 第 2 层
`undefined symbol: find_min_max` 的意思是：某个地方**声明**了 `find_min_max` 并且调用了它，但链接器在所有目标文件里都找不到这个符号的**定义**。C 语言没有函数重载，链接器只按名字匹配，名字差一个字符就是两个完全不同的符号。把头文件里的声明和 `stats.c` 里的函数名逐字对照一遍。

### 第 3 层
修好链接后，重点看 `pmin` 的类型 `int **`。函数要做的是"让调用者的指针指向 `a[mini]`"，所以应该把 `&a[mini]` 写进 `*pmin`：
- 写成 `pmin = &lo;` 只改了形参副本，调用者的指针不会变；
- 写成 `**pmin = a[mini];` 是想往 `*pmin` 指向的 int 里写值，可此时 `*pmin` 还是 `NULL`。

总和用 `long long` 累加，否则大数据会溢出。

## 参考代码
```c file=stats.h
#ifndef STATS_H
#define STATS_H

/* 用二级指针把最小值、最大值的位置带回给调用者 */
void find_min_max(int *a, int n, int **pmin, int **pmax);

/* 返回数组元素之和 */
long long sum_array(int *a, int n);

#endif
```

```c file=stats.c
#include "stats.h"

void find_min_max(int *a, int n, int **pmin, int **pmax) {
    int mini = 0, maxi = 0;
    for (int i = 1; i < n; i++) {
        if (a[i] < a[mini]) {
            mini = i;                  /* 严格小于：相同值保留第一次出现 */
        }
        if (a[i] > a[maxi]) {
            maxi = i;
        }
    }
    *pmin = &a[mini];                  /* 写进调用者的指针变量 */
    *pmax = &a[maxi];
}

long long sum_array(int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}
```

```c file=main.c
#include <stdio.h>
#include "stats.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        return 0;
    }
    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int *pmin = NULL;
    int *pmax = NULL;
    find_min_max(a, n, &pmin, &pmax);   /* 传 &pmin：让函数能修改我们的指针 */

    printf("min=%d index=%ld\n", *pmin, (long)(pmin - a));
    printf("max=%d index=%ld\n", *pmax, (long)(pmax - a));
    printf("sum=%lld\n", sum_array(a, n));
    return 0;
}
```

## 初始代码
```c file=stats.h
#ifndef STATS_H
#define STATS_H

/* 用二级指针把最小值、最大值的位置带回给调用者 */
void find_min_max(int *a, int n, int **pmin, int **pmax);

/* 返回数组元素之和 */
long long sum_array(int *a, int n);

#endif
```

```c file=stats.c
#include "stats.h"

/* TODO：这个工程现在链接失败，先让链接通过，再检查二级指针的写法。 */
void find_minmax(int *a, int n, int **pmin, int **pmax) {
    int mini = 0, maxi = 0;
    for (int i = 1; i < n; i++) {
        if (a[i] < a[mini]) {
            mini = i;
        }
        if (a[i] > a[maxi]) {
            maxi = i;
        }
    }
    **pmin = a[mini];                  /* 这里也有问题：和 *pmin 不是同一个东西 */
    **pmax = a[maxi];
}

long long sum_array(int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}
```

```c file=main.c
#include <stdio.h>
#include "stats.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        return 0;
    }
    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int *pmin = NULL;
    int *pmax = NULL;
    find_min_max(a, n, &pmin, &pmax);

    printf("min=%d index=%ld\n", *pmin, (long)(pmin - a));
    printf("max=%d index=%ld\n", *pmax, (long)(pmax - a));
    printf("sum=%lld\n", sum_array(a, n));
    return 0;
}
```

## 复杂度
时间：O(n)，`find_min_max` 和 `sum_array` 各遍历一次数组。
空间：O(n)，用来存放输入的数组。

## 常见错误
### 函数名与头文件里的声明不一致 [CE]
头文件声明的是 `find_min_max`，`stats.c` 却定义成 `find_minmax`。C 的链接器按名字找符号，少一个下划线就找不到，于是报 `undefined symbol: find_min_max`。函数名、参数个数、参数类型必须和声明**逐字一致**。
```c file=stats.c expect=CE
#include "stats.h"

void find_minmax(int *a, int n, int **pmin, int **pmax) {
    int mini = 0, maxi = 0;
    for (int i = 1; i < n; i++) {
        if (a[i] < a[mini]) {
            mini = i;
        }
        if (a[i] > a[maxi]) {
            maxi = i;
        }
    }
    *pmin = &a[mini];
    *pmax = &a[maxi];
}
long long sum_array(int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

```

### 调用时忘记取地址 `&` [CE]
`find_min_max` 的第三个参数是 `int **`，而 `pmin` 的类型是 `int *`，直接把 `pmin` 传进去类型就不对。编译器会提示 `incompatible pointer types passing 'int *' to parameter of type 'int **'; take the address with &`，并且把它当作错误。想修改调用者的指针，必须把**指针的地址**传进去。
```c file=main.c expect=CE
#include <stdio.h>
#include "stats.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        return 0;
    }
    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int *pmin = NULL;
    int *pmax = NULL;
    find_min_max(a, n, pmin, pmax);   /* 错：应该传 &pmin、&pmax */

    printf("min=%d index=%ld\n", *pmin, (long)(pmin - a));
    printf("max=%d index=%ld\n", *pmax, (long)(pmax - a));
    printf("sum=%lld\n", sum_array(a, n));
    return 0;
}
```

### 只修改了形参，调用者的指针没有变 [UB]
`pmin = &lo;` 改的是函数自己的局部副本，函数返回后 `main` 里的 `pmin` 仍然是 `NULL`，接下来 `*pmin` 就是对空指针解引用——未定义行为，本平台会直接报错。通过二级指针带回结果，赋值号左边必须是 `*pmin`。
```c file=stats.c expect=UB
#include "stats.h"

void find_min_max(int *a, int n, int **pmin, int **pmax) {
    int mini = 0, maxi = 0;
    for (int i = 1; i < n; i++) {
        if (a[i] < a[mini]) {
            mini = i;
        }
        if (a[i] > a[maxi]) {
            maxi = i;
        }
    }
    int *lo = &a[mini];
    int *hi = &a[maxi];
    pmin = &lo;                     /* 错：只改了形参 */
    pmax = &hi;
}
long long sum_array(int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

```

### 多解引用一层：`**pmin = ...` [UB]
`*pmin` 的类型是 `int *`（调用者的指针），`**pmin` 的类型才是 `int`。想"让指针指向某处"，要写 `*pmin = &a[mini];`；写成 `**pmin = a[mini];` 等于"往 `*pmin` 指向的 int 里写值"，而此时 `*pmin` 还是 `NULL`——对空指针写值同样是未定义行为。这里错的是**解引用的层数**，不是名字。
```c file=stats.c expect=UB
#include "stats.h"

void find_min_max(int *a, int n, int **pmin, int **pmax) {
    int mini = 0, maxi = 0;
    for (int i = 1; i < n; i++) {
        if (a[i] < a[mini]) {
            mini = i;
        }
        if (a[i] > a[maxi]) {
            maxi = i;
        }
    }
    **pmin = a[mini];               /* 错：多解引用了一层 */
    **pmax = a[maxi];
}
long long sum_array(int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

```

### 相同值时取了最后一次出现的位置 [WA]
题目要求取**第一次**出现的位置。把比较写成 `<=` / `>=`，遇到重复元素时下标会被更新成后面那一次。示例 1 里 -7 出现两次，用 `<=` 会得到下标 4，而正确答案是 1。
```c file=stats.c expect=WA
#include "stats.h"

void find_min_max(int *a, int n, int **pmin, int **pmax) {
    int mini = 0, maxi = 0;
    for (int i = 1; i < n; i++) {
        if (a[i] <= a[mini]) {          /* 错：相等时也更新，取到了最后一次 */
            mini = i;
        }
        if (a[i] >= a[maxi]) {          /* 错 */
            maxi = i;
        }
    }
    *pmin = &a[mini];
    *pmax = &a[maxi];
}
long long sum_array(int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

```

### 用 int 累加总和 [UB]
`long long` 的返回类型不能挽救中间的 `int` 累加：`1000 × 10^9 = 10^12`，在第 3 个元素时就已经溢出。有符号整数溢出是未定义行为，本平台会直接报错。累加变量必须是 `long long`。
```c file=stats.c expect=UB
#include "stats.h"

void find_min_max(int *a, int n, int **pmin, int **pmax) {
    int mini = 0, maxi = 0;
    for (int i = 1; i < n; i++) {
        if (a[i] < a[mini]) {
            mini = i;
        }
        if (a[i] > a[maxi]) {
            maxi = i;
        }
    }
    *pmin = &a[mini];
    *pmax = &a[maxi];
}

long long sum_array(int *a, int n) {
    int s = 0;                      /* 错：int 装不下 10^12 */
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}
```

## 测试用例
### 01 sample 示例 1
```in
5
3 -7 12 0 -7
```
```out
min=-7 index=1
max=12 index=2
sum=1
```

### 02 sample 示例 2
```in
1
-5
```
```out
min=-5 index=0
max=-5 index=0
sum=-5
```

### 03 degenerate 唯一的元素是 0
```in
1
0
```
```out
min=0 index=0
max=0 index=0
sum=0
```

### 04 trap 全部元素相同，只能取下标 0
```in
5
5 5 5 5 5
```
```out
min=5 index=0
max=5 index=0
sum=25
```

### 05 trap 最大值在首位、最小值在末位
```in
4
1000000000 5 4 -1000000000
```
```out
min=-1000000000 index=3
max=1000000000 index=0
sum=9
```

### 06 normal 正负混合
```in
6
10 -20 30 -40 50 -60
```
```out
min=-60 index=5
max=50 index=4
sum=-30
```

### 07 trap 全为负数，总和为负且接近 int 下限
```in
5
-1 -2 -3 -4 -1000000000
```
```out
min=-1000000000 index=4
max=-1 index=0
sum=-1000000010
```

### 生成 boundary 最大规模：1000 个 10^9
```js gen
const n = 1000;
const a = new Array(n).fill(1000000000);
const input = `${n}\n${a.join(' ')}\n`;
const output = `min=1000000000 index=0\nmax=1000000000 index=0\nsum=1000000000000\n`;
return [{ kind: 'boundary', category: '最大规模：1000 个 10^9', input, output }];
```
