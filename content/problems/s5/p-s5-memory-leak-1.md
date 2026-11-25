---json
{
  "id": "p-s5-memory-leak-1",
  "title": "修复报表工程的链接事故：重复的辅助函数与修好后才看得见的泄漏",
  "difficulty": "L4",
  "knowledgePoints": ["s5-memory-leak"],
  "special": "link-diagnosis",
  "judge": { "mode": "multi", "timeMs": 1000, "compare": "lines", "checkLeaks": true }
}
---

## 题目描述
数据分析组交给你一个三文件的报表小工程：

| 文件 | 职责 |
|---|---|
| `report.h` | 模块对外接口：容量上限、三个统计函数的声明，以及一个公共的小工具 `clamp_int` |
| `report.c` | `report_sum` / `report_avg` / `report_bar` 的实现，以及 `clamp_int` 的**定义** |
| `main.c` | 读入数据、调用模块、打印报表 |

这个工程现在**链接失败**了。而且——把链接问题修好之后，你还会发现它**跑完仍然有内存没归还**（本题开启了泄漏检查，输出全对也会判 `LEAK`）。

### 先分清三种"重复/缺失"
C 工程里最容易混的三个错误，看报错的第一行就能区分：

| 报错（LLVM/lld） | 阶段 | 含义 | 常见原因 |
|---|---|---|---|
| `duplicate symbol: clamp_int` | **链接** | 两个目标文件都提供了 `clamp_int` 的**定义** | 同一个函数在两个 `.c` 里各写了一份，或者定义写进了头文件 |
| `undefined symbol: report_avg` | **链接** | 有人声明并调用了它，但所有目标文件里都没有定义 | 只声明没定义、名字拼错、定义所在的 `.c` 没参与编译 |
| `redefinition of 'clamp_int'` | **编译** | 同一个 `.c` 里出现了两份定义 | 头文件没有卫士、被包含了两次 |

本题的初始代码属于**第一种**：`main.c` 和 `report.c` 各写了一份 `clamp_int`，两份都是外部链接，链接器不知道听谁的。

### 修好链接之后，再看泄漏
报表里有一行"比例条"：用 `report_bar` 根据最大值占总额的比例生成一串 `*`。`report_bar` 内部 `malloc` 了一块字符串并返回给调用者——**约定是"调用者负责 free"**。可是 `main.c` 打印完就把这个指针丢掉了。

修复的判据很硬：**程序正常结束时，所有 `malloc` 出来的块都必须已经归还**。

### 统计规则
- `sum`：所有金额之和（`long long`，最大 8×10¹³）；
- `avg`：`sum / n`，向下取整；
- `max`：最大的那一笔金额；
- `bar`：长度 = `clamp(20 * max / sum, 0, 20)`（整数除法向下取整；`sum == 0` 时长度为 0）。

## 输入格式
第一行一个整数 `n`。
第二行 `n` 个整数，表示每笔金额。

## 输出格式
输出五行：

```
count=<笔数>
sum=<总额>
avg=<平均每笔金额，向下取整>
max=<最大的一笔>
bar=<由 * 组成的比例条，长度 0…20>
```

`bar` 为空时输出 `bar=` 后面什么都没有。

## 数据范围
1 ≤ n ≤ 80000
0 ≤ 每笔金额 ≤ 10⁹

总额最大 8×10¹³，超过 `int` 范围，必须用 `long long` 累加；`20 * max` 最大可达 2×10¹⁰，**也不能用 `int` 算**。
最大输入约 880KB，在平台 1MB 的输入上限之内；输出只有 5 行。

## 示例
### 示例 1
```in
5
500 20000 3000 10000 0
```
```out
count=5
sum=33500
avg=6700
max=20000
bar=***********
```
> 总额 33500、平均 6700；最大一笔 20000 占总额的 `20 * 20000 / 33500 = 11`（向下取整），所以比例条是 11 个 `*`。注意初始代码在这里**连链接都过不去**，修好符号之后才轮到这条输出。

### 示例 2（边界：只有一笔金额为 0）
```in
1
0
```
```out
count=1
sum=0
avg=0
max=0
bar=
```
> `sum == 0` 时比例条长度为 0，输出 `bar=` 后面什么都没有。这里不能除以 0——`report_bar` 必须先判断 `total > 0`。

## 提示
### 第 1 层
先编译一次，把报错读完。`duplicate symbol` 意味着"同一个名字有两份定义"，而链接器只允许一份。接下来做两件事：数一数 `clamp_int` 一共被定义了几次，再决定保留哪一份、删掉哪一份。

### 第 2 层
最省事也最规范的修法是：**定义只留在 `report.c`**，`main.c` 删掉自己那份、改为使用 `report.h` 里的声明。这样两个 `.c` 仍然都能调用它，而目标文件里只有一份定义。（另一种修法是给两份都加 `static`，让它们各自成为内部链接——编译能过、链接也不冲突，但等于维护了两份重复的代码，不推荐。）

### 第 3 层
修好链接之后，输出会全部正确，但判题结果仍是 `LEAK`——去 `main.c` 里找 `report_bar` 的调用点：它返回的是一块 `malloc` 出来的字符串，`report.h` 里写明了"调用者负责 `free`"，而 `main.c` 只 `printf` 了一下就把指针丢了。补上 `free(bar);`，并且注意**不要漏掉 `free(a)`**：两条释放语句都放在函数末尾唯一的出口处最稳。

## 参考代码
```c file=report.h
#ifndef REPORT_H
#define REPORT_H

/* 数组容量：数组长度必须是编译期常量，所以用宏 */
#define LOG_CAP 80000

/* 金额上限：读入时用它把异常值夹住 */
#define VALUE_MAX 1000000000

/* 统计接口：定义都在 report.c 里 */
long long report_sum(const int *a, int n);
long long report_avg(const int *a, int n);

/* 生成比例条：返回 malloc 出来的字符串，调用者负责 free */
char *report_bar(int value, long long total);

/* 把 v 夹到 [lo, hi]：全工程只有 report.c 里这一份定义 */
int clamp_int(int v, int lo, int hi);

#endif
```

```c file=report.c
#include <stdlib.h>
#include "report.h"

int clamp_int(int v, int lo, int hi) {
    if (v < lo) {
        return lo;
    }
    if (v > hi) {
        return hi;
    }
    return v;
}

long long report_sum(const int *a, int n) {
    long long s = 0;                  /* 总额最大 8×10^13，必须用 long long */
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

long long report_avg(const int *a, int n) {
    if (n <= 0) {
        return 0;
    }
    return report_sum(a, n) / n;      /* 金额非负，整除就是向下取整 */
}

char *report_bar(int value, long long total) {
    int stars = 0;
    if (total > 0 && value > 0) {
        /* 20 * value 最大 2×10^10，先用 long long 算，再夹到 0…20 */
        long long ratio = (long long)value * 20 / total;
        stars = clamp_int((int)ratio, 0, 20);
    }

    char *s = malloc((size_t)stars + 1);
    if (s == NULL) {
        return NULL;
    }
    for (int i = 0; i < stars; i++) {
        s[i] = '*';
    }
    s[stars] = '\0';
    return s;
}
```

```c file=main.c
#include <stdio.h>
#include <stdlib.h>
#include "report.h"

static void print_report(const int *a, int n) {
    long long total = report_sum(a, n);

    int max = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > max) {
            max = a[i];
        }
    }

    printf("count=%d\n", n);
    printf("sum=%lld\n", total);
    printf("avg=%lld\n", report_avg(a, n));
    printf("max=%d\n", max);

    char *bar = report_bar(max, total);
    if (bar == NULL) {
        printf("bar=\n");             /* 内存不足：给一行空的比例条，不崩 */
        return;
    }
    printf("bar=%s\n", bar);
    free(bar);                        /* report.h 的约定：调用者负责释放 */
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > LOG_CAP) {
        return 0;
    }

    int *a = malloc((size_t)n * sizeof *a);
    if (a == NULL) {
        return 0;
    }

    int ok = 1;
    for (int i = 0; i < n && ok; i++) {
        int v;
        if (scanf("%d", &v) != 1) {
            ok = 0;                   /* 不在这里 return：留到唯一的释放点 */
        } else {
            a[i] = clamp_int(v, 0, VALUE_MAX);
        }
    }

    if (ok) {
        print_report(a, n);
    }

    free(a);                          /* 唯一的释放点 */
    return 0;
}
```

## 初始代码
```c file=report.h
#ifndef REPORT_H
#define REPORT_H

/* 数组容量：数组长度必须是编译期常量，所以用宏 */
#define LOG_CAP 80000

/* 金额上限：读入时用它把异常值夹住 */
#define VALUE_MAX 1000000000

/* 统计接口：定义都在 report.c 里 */
long long report_sum(const int *a, int n);
long long report_avg(const int *a, int n);

/* 生成比例条：返回 malloc 出来的字符串，调用者负责 free */
char *report_bar(int value, long long total);

/* 把 v 夹到 [lo, hi] */
int clamp_int(int v, int lo, int hi);

#endif
```

```c file=report.c
#include <stdlib.h>
#include "report.h"

/* TODO: main.c 里也写了一份一模一样的 clamp_int，链接器会报 duplicate symbol。
 *       全工程只能有一份定义——这里保留还是删掉，由你决定，但另一处必须跟着改。 */
int clamp_int(int v, int lo, int hi) {
    if (v < lo) {
        return lo;
    }
    if (v > hi) {
        return hi;
    }
    return v;
}

long long report_sum(const int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

long long report_avg(const int *a, int n) {
    if (n <= 0) {
        return 0;
    }
    return report_sum(a, n) / n;
}

char *report_bar(int value, long long total) {
    int stars = 0;
    if (total > 0 && value > 0) {
        long long ratio = (long long)value * 20 / total;   /* TODO: 检查这里的乘法会不会溢出 */
        stars = clamp_int((int)ratio, 0, 20);
    }

    char *s = malloc((size_t)stars + 1);
    if (s == NULL) {
        return NULL;
    }
    for (int i = 0; i < stars; i++) {
        s[i] = '*';
    }
    s[stars] = '\0';
    return s;                          /* 这块内存的所有权交给了调用者 */
}
```

```c file=main.c
#include <stdio.h>
#include <stdlib.h>
#include "report.h"

/* TODO: 这份 clamp_int 和 report.c 里的那一份重名，链接期报 duplicate symbol */
int clamp_int(int v, int lo, int hi) {
    if (v < lo) {
        return lo;
    }
    if (v > hi) {
        return hi;
    }
    return v;
}

static void print_report(const int *a, int n) {
    long long total = report_sum(a, n);

    int max = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > max) {
            max = a[i];
        }
    }

    printf("count=%d\n", n);
    printf("sum=%lld\n", total);
    printf("avg=%lld\n", report_avg(a, n));
    printf("max=%d\n", max);

    char *bar = report_bar(max, total);
    if (bar == NULL) {
        printf("bar=\n");
        return;
    }
    printf("bar=%s\n", bar);
    /* TODO: 这里少了一句释放——report.h 说过“调用者负责 free” */
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > LOG_CAP) {
        return 0;
    }

    int *a = malloc((size_t)n * sizeof *a);
    if (a == NULL) {
        return 0;
    }

    int ok = 1;
    for (int i = 0; i < n && ok; i++) {
        int v;
        if (scanf("%d", &v) != 1) {
            ok = 0;
        } else {
            a[i] = clamp_int(v, 0, VALUE_MAX);
        }
    }

    if (ok) {
        print_report(a, n);
    }

    free(a);
    return 0;
}
```

## 复杂度
时间 O(n)：一次读入、一次求和、一次求最大值，比例条只有 20 个字符。
空间 O(n)：`int a[80000]` 由 `malloc` 提供（约 320KB），外加一块最长 21 字节的字符串。所有堆内存都必须在返回前归还。

## 常见错误
### 不修重复定义就提交 [CE]
两份 `clamp_int` 都是外部链接，链接器只能保留一份，于是报 `duplicate symbol: clamp_int`（本平台把链接失败统一算作编译错误 `CE`）。删掉 `main.c` 里那份、改用 `report.h` 的声明就解决了——**声明可以到处有，定义只能有一份**。

```c file=main.c expect=CE
#include <stdio.h>
#include <stdlib.h>
#include "report.h"

/* 错：report.c 里已经有一份同名定义，这里再来一份，链接器直接报 duplicate symbol */
int clamp_int(int v, int lo, int hi) {
    if (v < lo) {
        return lo;
    }
    if (v > hi) {
        return hi;
    }
    return v;
}

static void print_report(const int *a, int n) {
    long long total = report_sum(a, n);

    int max = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > max) {
            max = a[i];
        }
    }

    printf("count=%d\n", n);
    printf("sum=%lld\n", total);
    printf("avg=%lld\n", report_avg(a, n));
    printf("max=%d\n", max);

    char *bar = report_bar(max, total);
    if (bar == NULL) {
        printf("bar=\n");
        return;
    }
    printf("bar=%s\n", bar);
    free(bar);
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > LOG_CAP) {
        return 0;
    }

    int *a = malloc((size_t)n * sizeof *a);
    if (a == NULL) {
        return 0;
    }

    int ok = 1;
    for (int i = 0; i < n && ok; i++) {
        int v;
        if (scanf("%d", &v) != 1) {
            ok = 0;
        } else {
            a[i] = clamp_int(v, 0, VALUE_MAX);
        }
    }

    if (ok) {
        print_report(a, n);
    }

    free(a);
    return 0;
}
```

### 链接修好了，比例条的字符串却没释放 [LEAK]
`report_bar` 返回的是 `malloc` 出来的字符串，所有权交给了调用者。`printf` 一下就把指针丢掉，程序结束时这块内存仍然被占用——输出完全正确，判题结果却是 `LEAK`（判题器会指出"内存在 `report.c` 的 `report_bar` 里分配，没有释放"）。这类泄漏最容易被忽略，因为"打印出来就完事了"看起来毫无问题。

```c file=main.c expect=LEAK
#include <stdio.h>
#include <stdlib.h>
#include "report.h"

static void print_report(const int *a, int n) {
    long long total = report_sum(a, n);

    int max = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > max) {
            max = a[i];
        }
    }

    printf("count=%d\n", n);
    printf("sum=%lld\n", total);
    printf("avg=%lld\n", report_avg(a, n));
    printf("max=%d\n", max);

    char *bar = report_bar(max, total);
    if (bar == NULL) {
        printf("bar=\n");
        return;
    }
    printf("bar=%s\n", bar);
    /* 错：没有 free(bar)，这块字符串在程序结束时仍然处于已分配状态 */
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > LOG_CAP) {
        return 0;
    }

    int *a = malloc((size_t)n * sizeof *a);
    if (a == NULL) {
        return 0;
    }

    int ok = 1;
    for (int i = 0; i < n && ok; i++) {
        int v;
        if (scanf("%d", &v) != 1) {
            ok = 0;
        } else {
            a[i] = clamp_int(v, 0, VALUE_MAX);
        }
    }

    if (ok) {
        print_report(a, n);
    }

    free(a);
    return 0;
}
```

### 用 `int` 累加总额 [UB]
`report_sum` 的返回类型是 `long long`，但如果中间变量写成 `int s = 0;`，8 万个 10 亿相加（8×10¹³）会先按 32 位溢出。有符号溢出是未定义行为，本平台的 UBSan 会报 `signed integer overflow` 并判 `UB`。**返回类型不会自动把中间结果提升成 64 位**。

```c file=report.c expect=UB
#include <stdlib.h>
#include "report.h"

int clamp_int(int v, int lo, int hi) {
    if (v < lo) {
        return lo;
    }
    if (v > hi) {
        return hi;
    }
    return v;
}

long long report_sum(const int *a, int n) {
    int s = 0;                        /* 错：8×10^13 装不进 int */
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return (long long)s;
}

long long report_avg(const int *a, int n) {
    if (n <= 0) {
        return 0;
    }
    return report_sum(a, n) / n;
}

char *report_bar(int value, long long total) {
    int stars = 0;
    if (total > 0 && value > 0) {
        long long ratio = (long long)value * 20 / total;
        stars = clamp_int((int)ratio, 0, 20);
    }

    char *s = malloc((size_t)stars + 1);
    if (s == NULL) {
        return NULL;
    }
    for (int i = 0; i < stars; i++) {
        s[i] = '*';
    }
    s[stars] = '\0';
    return s;
}
```

### 比例条的长度用 `int` 算乘法 [UB]
`value * 20 / total` 若全用 `int`：`value` 可以到 10⁹，`20 * value` 就是 2×10¹⁰，早已超出 `int` 的 2147483647——这一乘法本身就是未定义行为，结果可能是负数，`clamp` 之后变成 0 条 `*`。必须先把 `value` 转成 `long long` 再乘。

```c file=report.c expect=UB
#include <stdlib.h>
#include "report.h"

int clamp_int(int v, int lo, int hi) {
    if (v < lo) {
        return lo;
    }
    if (v > hi) {
        return hi;
    }
    return v;
}

long long report_sum(const int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

long long report_avg(const int *a, int n) {
    if (n <= 0) {
        return 0;
    }
    return report_sum(a, n) / n;
}

char *report_bar(int value, long long total) {
    int stars = 0;
    if (total > 0 && value > 0) {
        int ratio = value * 20 / total;   /* 错：value * 20 会超出 int */
        stars = clamp_int(ratio, 0, 20);
    }

    char *s = malloc((size_t)stars + 1);
    if (s == NULL) {
        return NULL;
    }
    for (int i = 0; i < stars; i++) {
        s[i] = '*';
    }
    s[stars] = '\0';
    return s;
}
```

### 把两份 `clamp_int` 都改成 `static` [LEAK]
这样链接确实能过（两份都成了内部链接，各在各的目标文件里），但它只是"绕过"了重复定义，并没有消除重复代码；而且这个修改完全不影响泄漏——`bar` 依然没被释放，判题结果还是 `LEAK`。修链接和修泄漏是两件独立的事，别以为修好一个另一个就好了。

## 测试用例
### 01 sample 示例 1
```in
5
500 20000 3000 10000 0
```
```out
count=5
sum=33500
avg=6700
max=20000
bar=***********
```

### 02 sample 示例 2
```in
1
0
```
```out
count=1
sum=0
avg=0
max=0
bar=
```

### 03 degenerate 只有一笔金额为 5，比例条满格
```in
1
5
```
```out
count=1
sum=5
avg=5
max=5
bar=********************
```

### 04 trap 全部相同，比例条是 20 的五分之一
```in
4
100
100
100
100
```
```out
count=4
sum=400
avg=100
max=100
bar=*****
```
> `20 * 100 / 400 = 5`，所以是 5 个 `*`。这里如果写成 `20 * max / n` 之类就会错。

### 05 trap 最大值远超其余数据
```in
3
1 1 1000000000
```
```out
count=3
sum=1000000002
avg=333333334
max=1000000000
bar=*******************
```
> `20 * 10⁹ / 1000000002 = 19.99…`，向下取整是 19 个 `*`。这一步的乘法 `20 * 10⁹` 已经超出 `int`，必须用 `long long`。

### 06 trap 全是 0，不能除以 0
```in
3
0 0 0
```
```out
count=3
sum=0
avg=0
max=0
bar=
```
> `sum == 0` 时比例条长度为 0——`report_bar` 里那个 `total > 0` 的判断就是为这一组数据准备的。

### 07 normal 门槛附近的混合数据
```in
6
100000 25000 5000 0 19999 20001
```
```out
count=6
sum=170000
avg=28333
max=100000
bar=***********
```

### 生成 boundary 八万笔金额与两种极端分布
```js gen
const cases = [];

function render(values) {
  const n = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  let max = values[0];
  for (const v of values) {
    if (v > max) max = v;
  }
  const stars = sum > 0 && max > 0 ? Math.min(20, Math.floor((20 * max) / sum)) : 0;
  return [
    `count=${n}`,
    `sum=${sum}`,
    `avg=${Math.floor(sum / n)}`,
    `max=${max}`,
    `bar=${'*'.repeat(stars)}`,
  ].join('\n') + '\n';
}

/* 最大规模：80000 笔随机金额 */
{
  const n = 80000;
  const values = [];
  for (let i = 0; i < n; i++) values.push(rng.int(0, 1000000000));
  cases.push({
    kind: 'boundary',
    category: '80000 笔 0…10 亿的随机金额',
    input: `${n}\n${values.join(' ')}\n`,
    output: render(values),
  });
}

/* 陷阱：最大值等于总额，比例条满格；20*max 会超过 int */
{
  const n = 80000;
  const values = new Array(n).fill(0);
  values[n - 1] = 1000000000;
  cases.push({
    kind: 'trap',
    category: '一笔 10 亿 + 79999 笔 0：20*max 超出 int 范围',
    input: `${n}\n${values.join(' ')}\n`,
    output: render(values),
  });
}

/* 常规：金额随位置缓慢变化 */
{
  const n = 3000;
  const values = [];
  for (let i = 0; i < n; i++) values.push((i * 7919) % 1000000);
  cases.push({
    kind: 'normal',
    category: '3000 笔循环变化的金额',
    input: `${n}\n${values.join(' ')}\n`,
    output: render(values),
  });
}

return cases;
```
