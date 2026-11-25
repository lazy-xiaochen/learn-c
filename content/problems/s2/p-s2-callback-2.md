---json
{
  "id": "p-s2-callback-2",
  "title": "可插拔的数据变换：用回调实现 map 与 count_if",
  "difficulty": "L3",
  "knowledgePoints": ["s2-callback", "s2-function-pointer"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个数据处理流程需要对一批 64 位整数依次做两件事：

1. **变换**：按配置把每个元素换成"乘以 2"、"取绝对值"或"取相反数"；
2. **统计**：数一数变换后有多少个元素**严格大于 0**。

要求把这两步分别实现成接受**回调函数**的工具函数：

```c
void map_inplace(long long *a, int n, long long (*f)(long long));  /* 对每个元素调用 f */
int  count_if(const long long *a, int n, int (*pred)(long long));  /* 数 pred 为真的元素 */
```

然后写 3 个变换函数和 1 个谓词函数，在 `main` 里按 `mode` 选择要传给工具函数的回调。**不允许**在 `map_inplace` / `count_if` 内部写 `if (mode == ...)`——工具函数只负责"遍历"，具体做什么由传进来的函数决定。

## 输入格式
第一行两个整数 `n mode`，用空格分隔。
第二行 `n` 个整数，用空格分隔。

`mode` 的含义：`1` 每个元素乘以 2；`2` 每个元素取绝对值；`3` 每个元素取相反数。

## 输出格式
两行：
1. 变换后的 `n` 个整数，相邻两个用一个空格分隔（行末不要多余空格）；
2. 一个整数：变换后严格大于 0 的元素个数。

## 数据范围
1 ≤ n ≤ 1000
`mode` ∈ {1, 2, 3}
-4000000000000000000 ≤ 每个元素 ≤ 4000000000000000000

变换后最大可达 8000000000000000000，仍然在 `long long` 的范围内（上限 9223372036854775807），但**远远超出 `int`**。任何一步用 `int` 中转都会截断。

## 示例
### 示例 1
```in
5 1
1 -2 3 0 -5
```
```out
2 -4 6 0 -10
2
```
> 每个元素乘 2：`1→2`、`-2→-4`、`3→6`、`0→0`、`-5→-10`。严格大于 0 的是 2 和 6，共 2 个（0 不算正数）。

### 示例 2（边界：只有一个 0）
```in
1 2
0
```
```out
0
0
```
> `0` 的绝对值还是 0；它不满足"严格大于 0"，所以计数是 0。

## 提示
### 第 1 层
把"怎么变"和"怎么数"分别写成一个函数指针参数。工具函数里只有一个循环，循环体分别调用 `f(a[i])` 和 `pred(a[i])`。

### 第 2 层
变换函数的类型是 `long long f(long long)`：输入一个元素，返回新元素。谓词的类型是 `int pred(long long)`：输入一个元素，返回"是否为真"（0 表示假，非 0 表示真）。`map_inplace` 里写 `a[i] = f(a[i]);`，`count_if` 里写 `if (pred(a[i])) count++;`。

### 第 3 层
在 `main` 里按 `mode` 选好函数指针再调用：`long long (*f)(long long) = NULL;`，然后 `if (mode == 1) f = twice; else if (mode == 2) f = absolute; else f = negate;`。全程用 `long long`（读入用 `%lld`，输出也用 `%lld`），取绝对值不要用 `abs()`（那是 `int` 版本）。

## 参考代码
```c file=main.c
#include <stdio.h>

/* 工具函数：只负责遍历，具体变换由 f 决定 */
static void map_inplace(long long *a, int n, long long (*f)(long long)) {
    for (int i = 0; i < n; i++) {
        a[i] = f(a[i]);
    }
}

/* 工具函数：只负责遍历，具体条件由 pred 决定 */
static int count_if(const long long *a, int n, int (*pred)(long long)) {
    int count = 0;
    for (int i = 0; i < n; i++) {
        if (pred(a[i])) {
            count++;
        }
    }
    return count;
}

static long long twice(long long x) { return x * 2; }
static long long absolute(long long x) { return x < 0 ? -x : x; }
static long long negate(long long x) { return -x; }

static int is_positive(long long x) { return x > 0; }

int main(void) {
    int n, mode;
    if (scanf("%d %d", &n, &mode) != 2 || n < 1 || n > 1000) {
        return 0;
    }
    if (mode < 1 || mode > 3) {
        return 0;
    }

    long long a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%lld", &a[i]) != 1) {
            return 0;
        }
    }

    long long (*transform)(long long) = NULL;
    if (mode == 1) {
        transform = twice;
    } else if (mode == 2) {
        transform = absolute;
    } else {
        transform = negate;
    }

    map_inplace(a, n, transform);
    int positives = count_if(a, n, is_positive);

    for (int i = 0; i < n; i++) {
        printf("%lld%c", a[i], i + 1 == n ? '\n' : ' ');
    }
    printf("%d\n", positives);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

/* TODO: 实现 map_inplace 与 count_if，并写三个变换函数和一个谓词函数 */

int main(void) {
    int n, mode;
    if (scanf("%d %d", &n, &mode) != 2 || n < 1 || n > 1000) {
        return 0;
    }
    if (mode < 1 || mode > 3) {
        return 0;
    }

    long long a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%lld", &a[i]) != 1) {
            return 0;
        }
    }

    /* 先原样输出，再把“大于 0 的个数”随便填一个，保证初始代码能编译 */
    for (int i = 0; i < n; i++) {
        printf("%lld%c", a[i], i + 1 == n ? '\n' : ' ');
    }
    printf("%d\n", 0);
    return 0;
}
```

## 复杂度
时间 O(n)：`map_inplace` 和 `count_if` 各遍历一次，每次都是 O(1) 的回调调用。
空间 O(1)（不计输入数组本身）。

## 常见错误
### 谓词写成 x >= 0 [WA]
题目要求"**严格大于** 0"。写成 `x >= 0` 会把 0 也算成正数，只要变换结果里出现 0，计数就会多 1。
```c file=main.c expect=WA
#include <stdio.h>

static void map_inplace(long long *a, int n, long long (*f)(long long)) {
    for (int i = 0; i < n; i++) {
        a[i] = f(a[i]);
    }
}

static int count_if(const long long *a, int n, int (*pred)(long long)) {
    int count = 0;
    for (int i = 0; i < n; i++) {
        if (pred(a[i])) {
            count++;
        }
    }
    return count;
}

static long long twice(long long x) { return x * 2; }
static long long absolute(long long x) { return x < 0 ? -x : x; }
static long long negate(long long x) { return -x; }

static int non_negative(long long x) { return x >= 0; }   /* 错：0 不是正数 */

int main(void) {
    int n, mode;
    if (scanf("%d %d", &n, &mode) != 2 || n < 1 || n > 1000) {
        return 0;
    }
    if (mode < 1 || mode > 3) {
        return 0;
    }

    long long a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%lld", &a[i]) != 1) {
            return 0;
        }
    }

    long long (*transform)(long long) = twice;
    if (mode == 2) {
        transform = absolute;
    } else if (mode == 3) {
        transform = negate;
    }

    map_inplace(a, n, transform);
    int positives = count_if(a, n, non_negative);

    for (int i = 0; i < n; i++) {
        printf("%lld%c", a[i], i + 1 == n ? '\n' : ' ');
    }
    printf("%d\n", positives);
    return 0;
}
```

### 把变换结果存进 int 数组 [WA]
`long long` 转 `int` 只保留低 32 位，`5000000000`、`6000000000` 这种值会被截断成完全不同的数。整条链路（读入、变换、输出）都必须用 `long long`。
```c file=main.c expect=WA
#include <stdio.h>

static void map_inplace(long long *a, int n, long long (*f)(long long)) {
    for (int i = 0; i < n; i++) {
        a[i] = f(a[i]);
    }
}

static int count_if(const long long *a, int n, int (*pred)(long long)) {
    int count = 0;
    for (int i = 0; i < n; i++) {
        if (pred(a[i])) {
            count++;
        }
    }
    return count;
}

static long long twice(long long x) { return x * 2; }
static long long absolute(long long x) { return x < 0 ? -x : x; }
static long long negate(long long x) { return -x; }

static int is_positive(long long x) { return x > 0; }

int main(void) {
    int n, mode;
    if (scanf("%d %d", &n, &mode) != 2 || n < 1 || n > 1000) {
        return 0;
    }
    if (mode < 1 || mode > 3) {
        return 0;
    }

    long long a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%lld", &a[i]) != 1) {
            return 0;
        }
    }

    long long (*transform)(long long) = twice;
    if (mode == 2) {
        transform = absolute;
    } else if (mode == 3) {
        transform = negate;
    }

    map_inplace(a, n, transform);
    int positives = count_if(a, n, is_positive);

    for (int i = 0; i < n; i++) {
        printf("%d%c", (int)a[i], i + 1 == n ? '\n' : ' ');   /* 错：截断成 int */
    }
    printf("%d\n", positives);
    return 0;
}
```

### 先统计、后变换 [WA]
两个工具函数的顺序不能反：`count_if` 统计的是**变换后**的数组。如果先数再变换，统计的是原始数据（例如 `-2` 会被算成"不是正数"，而变换后它变成 `-4` 仍旧不是；但对取绝对值模式就完全不同了）。顺序反了在部分用例上会碰巧正确，很难自己发现。

### 用 abs() 处理 long long [WA]
`abs()` 接受并返回 `int`，把 `long long` 传进去会先被截断。要取 `long long` 的绝对值应该自己写 `x < 0 ? -x : x`，或者用 `llabs()`（`<stdlib.h>`）。

### 工具函数里偷偷判断 mode [CE|WA]
把 `mode` 传进 `map_inplace` 再在里面写 `if (mode == 1) ...` 违背了本题"用回调解耦"的要求；如果 `mode` 没传进去，编译器会报"未声明的标识符"。即使强行加上全局变量让它跑起来，也失去了回调的意义——以后再加一种变换规则就要改工具函数本身。

## 测试用例
### 01 sample 示例 1
```in
5 1
1 -2 3 0 -5
```
```out
2 -4 6 0 -10
2
```

### 02 sample 示例 2
```in
1 2
0
```
```out
0
0
```

### 03 boundary 乘以 2 后接近 long long 上限
```in
2 1
4000000000000000000 -4000000000000000000
```
```out
8000000000000000000 -8000000000000000000
1
```

### 04 degenerate 全是负数、取绝对值
```in
4 2
-1 -2 -3 -4
```
```out
1 2 3 4
4
```

### 05 trap 取相反数、含超出 int 的值
```in
3 3
5000000000 -5000000000 1
```
```out
-5000000000 5000000000 -1
1
```

### 06 trap 30 亿乘以 2
```in
1 1
3000000000
```
```out
6000000000
1
```

### 07 normal 取绝对值、含 0
```in
5 2
0 -7 7 -1 1
```
```out
0 7 7 1 1
4
```

### 08 normal 取相反数、含 0
```in
3 3
0 -1 1
```
```out
0 1 -1
1
```
