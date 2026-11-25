---json
{
  "id": "p-s2-callback-1",
  "title": "用 qsort 与可切换的比较规则排序整数",
  "difficulty": "L4",
  "knowledgePoints": ["s2-callback", "s2-function-pointer"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个报表工具需要按三种规则给同一批整数排序：

1. **升序**（从小到大）；
2. **降序**（从大到小）；
3. **按绝对值升序**；绝对值相同时，按数值升序（也就是 `-3` 排在 `3` 前面）。

要求你只用**一份排序代码**：调用标准库的 `qsort`，写三个比较函数，再用一个函数指针变量根据 `mode` 选择传哪一个。**不允许**写三份冒泡排序，也不允许在比较函数里用 `if (mode == ...)` 判断模式——比较函数应该只关心"这两个元素谁在前"。

注意：`qsort` 的比较函数必须返回负数 / 0 / 正数三种结果。请特别小心"用减法比较"在极端值上的溢出问题。

## 输入格式
第一行两个整数 `n mode`，用空格分隔。
第二行 `n` 个整数，用空格分隔。

`mode` 的含义：`1` 升序，`2` 降序，`3` 按绝对值升序（绝对值相同按数值升序）。

## 输出格式
一行，排序后的 `n` 个整数，相邻两个用一个空格分隔（行末不要多余空格）。

## 数据范围
1 ≤ n ≤ 1000
`mode` ∈ {1, 2, 3}
-2147483648 ≤ 每个元素 ≤ 2147483647

元素可能取到 `int` 的两个端点。用 `x - y` 比较它们在数学上可能超出 `int` 的范围——这是本题最重要的陷阱。

## 示例
### 示例 1
```in
5 1
5 -3 9 0 9
```
```out
-3 0 5 9 9
```
> 升序：`-3 0 5 9 9`，重复的 9 保持两个。

### 示例 2（边界：只有一个元素）
```in
1 2
-2147483648
```
```out
-2147483648
```
> 只有一个元素时任何排序规则都原样输出。注意这个值是最小的 `int`，对它取绝对值会溢出。

## 提示
### 第 1 层
排序算法（`qsort`）只负责"比较 + 交换"，"谁在前"完全由比较函数决定。所以三种规则应该是三个独立的比较函数，排序调用只有一句。

### 第 2 层
比较函数的签名固定为 `int cmp(const void *a, const void *b)`，参数是"指向元素的指针"，要先转成 `const int *` 再解引用。返回值只需符号正确：小于返回负数、相等返回 0、大于返回正数。降序就是把"小于"和"大于"的返回值对调。

### 第 3 层
用一个函数指针变量接收选中的比较函数（例如 `int (*cmp)(const void *, const void *) = NULL;` 再按 `mode` 赋值），然后统一调用 `qsort(a, (size_t)n, sizeof a[0], cmp)`。比较时不要写 `x - y`：改成 `(x > y) - (x < y)` 得到 −1/0/1，或者用 `if` 分别返回。按绝对值比较时先把元素转成 `long long` 再取绝对值，否则 `-INT_MIN` 会溢出。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>

typedef int (*Cmp)(const void *, const void *);

/* 升序：只比大小，绝不做减法（INT_MIN - INT_MAX 会溢出） */
static int cmp_asc(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (x > y) - (x < y);
}

/* 降序：把升序的结果取反即可 */
static int cmp_desc(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (x < y) - (x > y);
}

/* 按绝对值升序；绝对值相同则按数值升序 */
static int cmp_abs(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    /* 先转 long long：-INT_MIN 在 int 里会溢出 */
    long long ax = x < 0 ? -(long long)x : x;
    long long ay = y < 0 ? -(long long)y : y;
    if (ax != ay) {
        return ax < ay ? -1 : 1;
    }
    return (x > y) - (x < y);
}

int main(void) {
    int n, mode;
    if (scanf("%d %d", &n, &mode) != 2 || n < 1 || n > 1000) {
        return 0;
    }
    if (mode < 1 || mode > 3) {
        return 0;
    }

    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    /* 规则表：用 mode 选一个函数指针，排序代码只有一份 */
    static const Cmp CMPS[3] = {cmp_asc, cmp_desc, cmp_abs};
    Cmp cmp = CMPS[mode - 1];

    qsort(a, (size_t)n, sizeof a[0], cmp);

    for (int i = 0; i < n; i++) {
        printf("%d%c", a[i], i + 1 == n ? '\n' : ' ');
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>

/* TODO: 写三个比较函数（升序 / 降序 / 按绝对值升序），再用函数指针选择其中一个 */

int main(void) {
    int n, mode;
    if (scanf("%d %d", &n, &mode) != 2 || n < 1 || n > 1000) {
        return 0;
    }
    if (mode < 1 || mode > 3) {
        return 0;
    }

    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    /* 现在不管什么模式都按“读入顺序”输出，先让它能编译通过 */
    for (int i = 0; i < n; i++) {
        printf("%d%c", a[i], i + 1 == n ? '\n' : ' ');
    }
    return 0;
}
```

## 复杂度
时间 O(n log n)：`qsort` 的典型复杂度，每次比较是 O(1)。
空间 O(log n)：`qsort` 自身的递归栈（实现相关），数组本身额外占用 O(1)。

本题的重点不在排序算法，而在"把比较规则作为参数传给排序框架"这件事。

## 常见错误
### 比较函数写成 return a - b [UB]
`*(const int *)a - *(const int *)b` 最简洁，却会在两个元素相差很大时让 `int` 溢出（例如 `INT_MAX - INT_MIN`）。有符号整数溢出是未定义行为：开启 UBSan 时程序直接报错终止，不开启时可能排出完全错误的顺序。下面这段代码在普通数据上"看起来完全正常"，只有遇到两个端点时才暴露：
```c file=main.c expect=UB
#include <stdio.h>
#include <stdlib.h>

typedef int (*Cmp)(const void *, const void *);

static int cmp_asc(const void *a, const void *b) {
    return *(const int *)a - *(const int *)b;   /* 溢出：未定义行为 */
}

static int cmp_desc(const void *a, const void *b) {
    return *(const int *)b - *(const int *)a;   /* 同样会溢出 */
}

static int cmp_abs(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    long long ax = x < 0 ? -(long long)x : x;
    long long ay = y < 0 ? -(long long)y : y;
    if (ax != ay) {
        return ax < ay ? -1 : 1;
    }
    return (x > y) - (x < y);
}

int main(void) {
    int n, mode;
    if (scanf("%d %d", &n, &mode) != 2 || n < 1 || n > 1000) {
        return 0;
    }
    if (mode < 1 || mode > 3) {
        return 0;
    }

    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    static const Cmp CMPS[3] = {cmp_asc, cmp_desc, cmp_abs};
    qsort(a, (size_t)n, sizeof a[0], CMPS[mode - 1]);
    for (int i = 0; i < n; i++) {
        printf("%d%c", a[i], i + 1 == n ? '\n' : ' ');
    }
    return 0;
}
```

### 传给 qsort 的元素个数写成 sizeof a [RE]
`qsort(base, nmemb, size, cmp)` 的第二个参数是**元素个数**，第三个才是每个元素的字节数。写成 `sizeof a` 会让 `qsort` 以为数组有 4000 个元素，一路读到栈上数组之外，触发越界访问。
```c file=main.c expect=RE
#include <stdio.h>
#include <stdlib.h>

static int cmp_asc(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (x > y) - (x < y);
}

int main(void) {
    int n, mode;
    if (scanf("%d %d", &n, &mode) != 2 || n < 1 || n > 1000) {
        return 0;
    }
    if (mode < 1 || mode > 3) {
        return 0;
    }

    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    qsort(a, sizeof a, sizeof a[0], cmp_asc);   /* 错：第二个参数应该是 (size_t)n */
    for (int i = 0; i < n; i++) {
        printf("%d%c", a[i], i + 1 == n ? '\n' : ' ');
    }
    return 0;
}
```

### 比较函数只返回 0/1 [WA]
`return x > y;` 没有负数，`qsort` 会把所有"不相等但返回 0"的元素当成相等，排序结果依赖实现细节。必须让"小于"返回负数："降序"就把这个符号反过来。

### 用 int 计算绝对值 [UB]
`x < 0 ? -x : x` 在 `x == INT_MIN` 时会溢出（`INT_MIN` 的相反数无法用 `int` 表示）。先转 `long long` 再取绝对值，或者直接比较"转成 long long 后的数值"。

### 忘了模式 3 的次级比较 [WA]
绝对值相同时直接 `return 0` 会让 `-5` 和 `5` 的先后顺序不确定。题目要求"绝对值相同按数值升序"，所以绝对值相等时还要再比一次数值。

## 测试用例
### 01 sample 示例 1
```in
5 1
5 -3 9 0 9
```
```out
-3 0 5 9 9
```

### 02 sample 示例 2
```in
1 2
-2147483648
```
```out
-2147483648
```

### 03 boundary 降序、三个元素
```in
3 2
-1 0 1
```
```out
1 0 -1
```

### 04 degenerate 绝对值全部相同
```in
4 3
5 -5 5 -5
```
```out
-5 -5 5 5
```

### 05 trap 两个端点、升序
```in
2 1
2147483647 -2147483648
```
```out
-2147483648 2147483647
```

### 06 trap 按绝对值比较 INT_MIN
```in
3 3
-2147483648 1 -1
```
```out
-1 1 -2147483648
```

### 07 trap 降序时两端点相减会溢出
```in
4 2
0 -2147483648 2147483647 0
```
```out
2147483647 0 0 -2147483648
```

### 08 normal 绝对值相同再按数值升序
```in
6 3
-7 3 -3 7 0 0
```
```out
0 0 -3 3 -7 7
```

### 09 normal 普通降序
```in
5 2
2 1 5 3 4
```
```out
5 4 3 2 1
```
