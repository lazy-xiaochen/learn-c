---json
{
  "id": "p-s3-extern-multifile-1",
  "title": "修复链接失败的三文件统计工程：总额、平均值与大额笔数",
  "difficulty": "L3",
  "knowledgePoints": ["s3-extern-multifile"],
  "special": "link-diagnosis",
  "judge": { "mode": "multi", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
运营同学交给你一个由三个文件组成的小工程：

- `stats.h`：统计模块对外的接口——一个 `extern` 常量、三个函数声明；
- `stats.c`：这些函数和常量的**定义**；
- `main.c`：读入数据、调用模块、打印结果。

可是这个工程**链接失败**了。请先读编译器的报错，判断问题出在哪个文件、哪个环节，再动手修。三个文件都可以改，提交时全部参与编译。

### 先分清两种"重复/缺失"的错误
C 工程里最容易混淆的两个错误，看报错的第一行就能区分：

| 报错 | 阶段 | 含义 | 常见原因 |
|---|---|---|---|
| `undefined reference to 'stats_avg'`（GCC/ld）<br>`undefined symbol: stats_avg`（LLVM/lld） | **链接** | 有地方声明并使用了 `stats_avg`，但所有目标文件里都没有它的定义 | 函数只声明没定义、名字拼错、定义所在的 `.c` 没参与编译 |
| `multiple definition of 'x'`（GCC/ld）<br>`duplicate symbol: x`（LLVM/lld） | **链接** | 有两个或更多目标文件都提供了 `x` 的定义 | 变量/函数定义写进了头文件、同一个 `.c` 被编译了两次 |

还有一类报错发生在**编译**阶段（`redefinition of 'x'`）：同一个 `.c` 文件里出现了两份定义，通常是头文件没有卫士、被包含了两次。本题的初始代码属于哪一种？先跑一次看看。

### 这个模块要做什么
一天有 `n` 笔订单，每笔金额是一个非负整数。统计三件事：

- `sum`：总额；
- `avg`：平均每笔金额（**向下取整**的整数）；
- `top`：大额订单笔数，即金额 **大于等于** 门槛 `STATS_TOP` 的笔数（门槛由 `stats.c` 定义成 10000，`main.c` 通过头文件里的 `extern` 声明使用它）。

## 输入格式
第一行一个整数 `n`。
第二行 `n` 个整数，依次表示每笔订单的金额，用空格分隔。

## 输出格式
输出三行：

```
sum=总额
avg=平均每笔金额（向下取整）
top=大额订单笔数
```

## 数据范围
1 ≤ n ≤ 100000
0 ≤ 每笔金额 ≤ 1000000000

总额最大为 10⁵ × 10⁹ = 10¹⁴，超过 `int` 的范围，必须用 `long long` 保存。平均值不会超过 10⁹，但它是从总额算出来的，所以也沿着 `long long` 走。

## 示例
### 示例 1
```in
5
500 20000 3000 10000 0
```
```out
sum=33500
avg=6700
top=2
```
> 总额 500 + 20000 + 3000 + 10000 + 0 = 33500，平均 33500 / 5 = 6700（整除正好）。大于等于 10000 的有 20000 和 10000 两笔，所以 `top=2`。

### 示例 2（边界：只有一笔金额为 0 的订单）
```in
1
0
```
```out
sum=0
avg=0
top=0
```
> `n = 1` 时平均值就是这一笔本身。总额 0 是合法的，不要把它当成"没读到数据"。初始代码在这里会直接链接失败，修好之后这三行才是正确答案。

## 提示
### 第 1 层
先编译一次，把报错信息从头读到尾。它是 `undefined reference`、`duplicate symbol`，还是 `redefinition`？这三个词分别指向链接阶段"少了定义"、链接阶段"多了定义"、编译阶段"同一个文件里出现了两次定义"，处理方式完全不同。

### 第 2 层
`undefined reference to 'stats_avg'` 的意思是：`main.c` 声明并调用了 `stats_avg`，但链接器在所有目标文件里都找不到它。去 `stats.h` 看声明的名字，再去 `stats.c` 看定义的名字，逐个字母对照——它们并不一样。

### 第 3 层
修好名字之后还有两个坑：

1. `stats_sum` 里的累加变量必须是 `long long`：10 万笔 × 10 亿 = 10¹⁴，用 `int` 会溢出（未定义行为）；
2. 大额判断是 `a[i] >= STATS_TOP`，写成 `>` 会漏掉金额恰好等于门槛的订单；
3. `STATS_TOP` 的定义（`const int STATS_TOP = 10000;`）只能出现在一个 `.c` 里，头文件里那行是 `extern const int STATS_TOP;` —— 两者不能互换位置。

## 参考代码
```c file=stats.h
#ifndef STATS_H
#define STATS_H

/* 数组容量：数组长度必须是编译期常量，所以用宏 */
#define STATS_CAP 100000

/* 大额门槛：这里只是声明，定义在 stats.c 里 */
extern const int STATS_TOP;

/* 函数声明：定义都在 stats.c 里 */
long long stats_sum(const int *a, int n);
long long stats_avg(const int *a, int n);
int stats_top_count(const int *a, int n);

#endif
```

```c file=stats.c
#include "stats.h"

const int STATS_TOP = 10000;      /* 全工程唯一的一份定义 */

long long stats_sum(const int *a, int n) {
    long long s = 0;              /* 总额最大 10^14，必须用 long long */
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

long long stats_avg(const int *a, int n) {
    return stats_sum(a, n) / n;   /* 金额非负，整除就是向下取整 */
}

int stats_top_count(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] >= STATS_TOP) {  /* 恰好等于门槛也算大额 */
            c++;
        }
    }
    return c;
}
```

```c file=main.c
#include <stdio.h>
#include "stats.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > STATS_CAP) {
        return 0;
    }

    int a[STATS_CAP];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    printf("sum=%lld\n", stats_sum(a, n));
    printf("avg=%lld\n", stats_avg(a, n));
    printf("top=%d\n", stats_top_count(a, n));
    return 0;
}
```

## 初始代码
```c file=stats.h
#ifndef STATS_H
#define STATS_H

/* 数组容量：数组长度必须是编译期常量，所以用宏 */
#define STATS_CAP 100000

/* 大额门槛：这里只是声明，定义在 stats.c 里 */
extern const int STATS_TOP;

/* 函数声明：定义都在 stats.c 里 */
long long stats_sum(const int *a, int n);
long long stats_avg(const int *a, int n);
int stats_top_count(const int *a, int n);

#endif
```

```c file=stats.c
#include "stats.h"

const int STATS_TOP = 10000;

long long stats_sum(const int *a, int n) {
    int s = 0;                    /* TODO: 总额可能到 10^14，int 装不下 */
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

long long stats_average(const int *a, int n) {   /* TODO: 头文件里声明的名字是 stats_avg */
    return stats_sum(a, n) / n;
}

int stats_top_count(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] >= STATS_TOP) {
            c++;
        }
    }
    return c;
}
```

```c file=main.c
#include <stdio.h>
#include "stats.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > STATS_CAP) {
        return 0;
    }

    int a[STATS_CAP];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    printf("sum=%lld\n", stats_sum(a, n));
    printf("avg=%lld\n", stats_avg(a, n));
    printf("top=%d\n", stats_top_count(a, n));
    return 0;
}
```

## 复杂度
时间 O(n)：`stats_sum` 和 `stats_top_count` 各扫一遍数组，`stats_avg` 复用 `stats_sum` 再扫一遍。
空间 O(n)：`int a[100000]` 约占 400KB（栈上）。

三个文件的分工本身就是本节的重点：**声明集中在头文件、定义集中在 `.c`、使用者只依赖头文件**。这样以后要换掉 `stats.c` 的实现，`main.c` 一行都不用改。

## 常见错误
### 改对了名字，累加变量却还是 int [UB]
链接通过、示例也过，但 10 万笔 × 10 亿的数据会让 `int s` 溢出。有符号整数溢出是未定义行为，本平台的 UBSan 会报 `signed integer overflow` 并判 `UB`。`stats_sum` 的返回类型是 `long long`，累加变量也必须是 `long long`——返回类型不会自动把中间结果"提升"成 64 位。

```c file=stats.c expect=UB
#include "stats.h"

const int STATS_TOP = 10000;

long long stats_sum(const int *a, int n) {
    int s = 0;                    /* 错：10 万 × 10 亿 = 10^14 */
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

long long stats_avg(const int *a, int n) {
    return stats_sum(a, n) / n;
}

int stats_top_count(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] >= STATS_TOP) {
            c++;
        }
    }
    return c;
}
```

### 大额判断写成 > [WA]
门槛是包含在内的：金额恰好等于 10000 的订单也算大额。写成 `a[i] > STATS_TOP` 会少算这一笔，只有在恰好等于门槛的数据上才暴露。
```c file=stats.c expect=WA
#include "stats.h"

const int STATS_TOP = 10000;

long long stats_sum(const int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

long long stats_avg(const int *a, int n) {
    return stats_sum(a, n) / n;
}

int stats_top_count(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] > STATS_TOP) {   /* 错：应为 >= */
            c++;
        }
    }
    return c;
}
```

### 把常量的定义搬回头文件 [CE]
`extern const int STATS_TOP;` 改回 `const int STATS_TOP = 10000;`，`stats.c` 里又保留了一份定义——于是 `stats.c` 这个翻译单元里出现了两份定义，编译直接失败（`redefinition of 'STATS_TOP'`）。如果 `stats.c` 里没有那份定义，则会变成链接期的 `duplicate symbol`：因为每个包含头文件的 `.c` 都会各自定义一份。**声明可以和很多文件共享，定义只能有一份。**

```c file=stats.h expect=CE
#ifndef STATS_H
#define STATS_H

#define STATS_CAP 100000

const int STATS_TOP = 10000;      /* 错：头文件里定义，stats.c 里又定义一次 */

long long stats_sum(const int *a, int n);
long long stats_avg(const int *a, int n);
int stats_top_count(const int *a, int n);

#endif
```

### 只改 main.c 的调用名，不改 stats.c 的定义 [CE]
把 `main.c` 里的 `stats_avg(...)` 改成 `stats_average(...)`，看起来"对上了"，但 `stats.h` 里没有 `stats_average` 的声明，C99 之后调用未声明的函数是编译错误（`implicit declaration of function`）。声明、定义、调用三处的名字必须一致。

## 测试用例
### 01 sample 示例 1
```in
5
500 20000 3000 10000 0
```
```out
sum=33500
avg=6700
top=2
```

### 02 sample 示例 2
```in
1
0
```
```out
sum=0
avg=0
top=0
```

### 03 boundary 三笔十亿，总额超过 int
```in
3
1000000000 1000000000 1000000000
```
```out
sum=3000000000
avg=1000000000
top=3
```

### 04 degenerate 只有一笔小额
```in
1
7
```
```out
sum=7
avg=7
top=0
```

### 05 trap 恰好等于门槛的一笔必须算大额
```in
3
9999 10000 10001
```
```out
sum=30000
avg=10000
top=2
```

### 06 trap 全部低于门槛
```in
4
0 1 2 3
```
```out
sum=6
avg=1
top=0
```

### 07 normal 正数混合
```in
6
100000 25000 5000 0 19999 20001
```
```out
sum=170000
avg=28333
top=4
```

### 08 trap 全零
```in
3
0 0 0
```
```out
sum=0
avg=0
top=0
```

### 09 normal 两笔相差悬殊
```in
2
1000000000 0
```
```out
sum=1000000000
avg=500000000
top=1
```

### 10 normal 门槛上下各一笔
```in
2
10000 9999
```
```out
sum=19999
avg=9999
top=1
```

### 生成 boundary 最大规模与随机数据
```js gen
const cases = [];

/* 最大规模：50000 笔 10 亿，总额 5×10^13（输入约 550KB） */
const n1 = 50000;
const v1 = new Array(n1).fill(1000000000);
cases.push({
  kind: 'boundary',
  category: '50000 笔 10 亿，总额 5×10^13',
  input: `${n1}\n${v1.join(' ')}\n`,
  output: `sum=${50000 * 1000000000}\navg=1000000000\ntop=${n1}\n`,
});

/* 全部恰好等于门槛，top 必须等于 n */
const n2 = 20000;
const v2 = new Array(n2).fill(10000);
cases.push({
  kind: 'trap',
  category: '20000 笔恰好等于门槛 10000',
  input: `${n2}\n${v2.join(' ')}\n`,
  output: `sum=${n2 * 10000}\navg=10000\ntop=${n2}\n`,
});

/* 压力：50000 个随机金额，期望值在 JS 里独立计算 */
const n3 = 50000;
const v3 = [];
let sum = 0;
let top = 0;
for (let i = 0; i < n3; i++) {
  const x = rng.int(0, 1000000000);
  v3.push(x);
  sum += x;
  if (x >= 10000) top++;
}
cases.push({
  kind: 'stress',
  category: '50000 个 0…10 亿的随机金额',
  input: `${n3}\n${v3.join(' ')}\n`,
  output: `sum=${sum}\navg=${(sum - (sum % n3)) / n3}\ntop=${top}\n`,
});

return cases;
```
