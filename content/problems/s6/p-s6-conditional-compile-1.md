---json
{
  "id": "p-s6-conditional-compile-1",
  "title": "修复条件编译开关不一致的统计工程：总和、平均与最大值",
  "difficulty": "L3",
  "knowledgePoints": ["s6-conditional-compile"],
  "special": "link-diagnosis",
  "judge": { "mode": "multi", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个统计模块由三个文件组成：

- `config.h`：模块的配置与接口。里面有一个 `STAT_WIDE` **开关**，用条件编译同时准备好两套实现：
  - `STAT_WIDE` 为真：`stat_t` 是 `long long`，打印格式是 `"%lld"`；
  - 否则：`stat_t` 是 `int`，打印格式是 `"%d"`。
- `stat.c`：三个函数的定义（求和、平均、最大值）。
- `main.c`：读入数据、调用模块、打印结果。

这个工程现在**编译失败**了。报错的第一行是：

```
stat.c:6:11: error: conflicting types for 'stat_sum'
./config.h:12:8: note: previous declaration is here
```

"同一个函数，前面有一个声明、后面又有一个类型不同的定义"——请先读懂这两条信息，再动手修。三个文件都可以改，提交时全部参与编译。

### 先分清三种报错
| 报错 | 阶段 | 含义 |
|---|---|---|
| `conflicting types for 'x'` | **编译** | 同一个翻译单元里，`x` 出现了两套不兼容的声明／定义 |
| `redefinition of 'x'` | **编译** | 同一个翻译单元里，`x` 被定义了两次（常见的根因是头文件没卫士） |
| `undefined reference to 'x'` / `duplicate symbol: x` | **链接** | 少了定义 / 多了定义 |

本题的初始代码报的是第一种：`stat_sum` 在头文件里的声明是 `stat_t stat_sum(...)`，而在 `stat.c` 里的定义写成了 `long long stat_sum(...)`——**两者在预处理之后不是同一个类型**，因为 `stat_t` 在那个时刻是 `int`。

### 模块要做什么
读入 `n` 个非负整数（订单金额），输出三行：

- `sum`：总和；
- `avg`：平均值（**向下取整**的整数）；
- `max`：最大值。

## 输入格式
第一行一个整数 `n`。
第二行 `n` 个整数，用空格分隔。

## 输出格式
```
sum=<总和>
avg=<平均值，向下取整>
max=<最大值>
```

## 数据范围
- `1 ≤ n ≤ 50000`；
- `0 ≤ 每个数 ≤ 1000000000`；
- 总和最大 `50000 × 10⁹ = 5×10¹³`，**远超 `int`**，必须用 64 位整数——这正是 `STAT_WIDE` 开关存在的理由；
- 平均值不超过 `10⁹`，但它是由总和算出来的，所以也跟着 `stat_t` 走。

## 示例
### 示例 1
```in
5
1000000000 1000000000 1000000000 1000000000 1000000000
```
```out
sum=5000000000
avg=1000000000
max=1000000000
```
> 五个十亿相加是 50 亿，已经超过 `int` 的上限（约 21.4 亿）。窄版本在这里就会溢出，所以必须让 `STAT_WIDE` 生效、`stat_t` 是 `long long`。

### 示例 2（边界：只有一个数且为 0）
```in
1
0
```
```out
sum=0
avg=0
max=0
```
> `n = 1` 时平均值就是这一位数本身，0 是合法输入，不要把它当成"没读到数据"。

## 提示
### 第 1 层
先编译，读报错：`conflicting types for 'stat_sum'`，接着是 `note: previous declaration is here` 指向 `config.h` 的那一行。所以 `stat.c` 里 `#include "config.h"` 时看到的 `stat_sum` 声明，和文件里随后写下的定义**不是同一个类型**。去 `config.h` 看 `stat_t` 到底被定义成了什么。

### 第 2 层
`config.h` 里这一切都由 `#ifdef STAT_WIDE` 决定，而 `stat.c` 是这样写的：

```c
#include "config.h"        /* ← 此刻 STAT_WIDE 还没有定义 */

#define STAT_WIDE 1        /* ← 太晚了：头文件早就展开完了 */

long long stat_sum(const int *a, int n) { ... }
```

**预处理是自上而下顺序执行的**：`#include` 展开头文件的那一刻，`STAT_WIDE` 还不存在，所以头文件走的是 `#else` 分支（`stat_t` = `int`，声明是 `int stat_sum(...)`）；之后才定义的 `STAT_WIDE` 只影响它后面的代码，对已经展开的头文件毫无作用。

### 第 3 层
正确的做法是把开关收进**头文件**，放在 `#if` **之前**，并且只写这一处：

```c
/* config.h */
#ifndef CONFIG_H
#define CONFIG_H

#ifndef STAT_WIDE
#define STAT_WIDE 1        /* 唯一的一处开关；也可以用 -DSTAT_WIDE=0 覆盖 */
#endif

#if STAT_WIDE
typedef long long stat_t;
#define STAT_FMT "%lld"
#else
typedef int stat_t;
#define STAT_FMT "%d"
#endif
...
```

然后删掉 `stat.c` 里那行 `#define STAT_WIDE 1`，把函数的返回类型写成 `stat_t`（不要写死 `long long`）。这样每个包含 `config.h` 的 `.c` 看到的分支都一致：`stat_t` 是 `long long`、`STAT_FMT` 是 `"%lld"`、`stat_sum` 的声明和定义类型相同。最后确认 `main.c` 打印时用的是 `STAT_FMT` 而不是写死的 `%d`。

## 参考代码
```c file=config.h
#ifndef CONFIG_H
#define CONFIG_H

#define STAT_CAP 50000

/* 64 位累加开关：全工程唯一的一处定义。
   所有 .c 都包含本头文件，所以它们看到的分支必然一致。
   想换配置只改这里；也可以从命令行用 -DSTAT_WIDE=0 覆盖。 */
#ifndef STAT_WIDE
#define STAT_WIDE 1
#endif

#if STAT_WIDE
typedef long long stat_t;
#define STAT_FMT "%lld"
#else
typedef int stat_t;
#define STAT_FMT "%d"
#endif

/* 接口的类型由开关决定，声明和定义必须来自同一个分支 */
stat_t stat_sum(const int *a, int n);
stat_t stat_avg(const int *a, int n);
int stat_max(const int *a, int n);

#endif
```

```c file=stat.c
#include "config.h"

stat_t stat_sum(const int *a, int n) {
    stat_t s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

stat_t stat_avg(const int *a, int n) {
    return stat_sum(a, n) / n;      /* 数据非负，整除就是向下取整 */
}

int stat_max(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}
```

```c file=main.c
#include <stdio.h>

#include "config.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > STAT_CAP) {
        return 0;
    }

    int a[STAT_CAP];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1 || a[i] < 0) {
            return 0;
        }
    }

    /* 用 STAT_FMT 打印 stat_t：类型跟着开关走，格式也跟着开关走 */
    printf("sum=" STAT_FMT "\n", stat_sum(a, n));
    printf("avg=" STAT_FMT "\n", stat_avg(a, n));
    printf("max=%d\n", stat_max(a, n));
    return 0;
}
```

## 初始代码
```c file=config.h
#ifndef CONFIG_H
#define CONFIG_H

#define STAT_CAP 50000

/* 64 位累加开关。
   TODO：这个开关现在没有在头文件里定义，而是由各个 .c 自己决定——
   谁先定义、定义在 include 之前还是之后，看到的分支都不一样。 */
#ifdef STAT_WIDE
typedef long long stat_t;
#define STAT_FMT "%lld"
#else
typedef int stat_t;
#define STAT_FMT "%d"
#endif

stat_t stat_sum(const int *a, int n);
stat_t stat_avg(const int *a, int n);
int stat_max(const int *a, int n);

#endif
```

```c file=stat.c
#include "config.h"

#define STAT_WIDE 1                  /* TODO：开关不该在这里定义，而且它出现在 include 之后 */

long long stat_sum(const int *a, int n) {   /* TODO：返回类型应该跟着 stat_t 走 */
    stat_t s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

stat_t stat_avg(const int *a, int n) {
    return stat_sum(a, n) / n;
}

int stat_max(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}
```

```c file=main.c
#include <stdio.h>

#include "config.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > STAT_CAP) {
        return 0;
    }

    int a[STAT_CAP];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1 || a[i] < 0) {
            return 0;
        }
    }

    printf("sum=" STAT_FMT "\n", stat_sum(a, n));
    printf("avg=" STAT_FMT "\n", stat_avg(a, n));
    printf("max=%d\n", stat_max(a, n));
    return 0;
}
```

## 复杂度
时间 O(n)：三个函数各扫一遍数组（`stat_avg` 复用了 `stat_sum`）。
空间 O(n)：`int a[50000]` 约占 200KB。

三个文件的分工是本节的重点：**开关、类型、打印格式必须集中在头文件里**，因为头文件是唯一被所有 `.c` 共享的东西。只要有一个 `.c` 自己改开关，它和别人的"世界"就不一样了——这种错误在单独编译某个文件时完全看不出来，编译整个工程才暴露，而且报错位置（`stat.c:6`）往往不是根因（根因在 `config.h` 的分支选择上）。

## 常见错误
### 开关写在 `#if` 后面，等于没打开 [UB]
把 `#define STAT_WIDE 1` 放进 `config.h`，却写在 `#if STAT_WIDE` **之后**：预处理自上而下执行，`#if` 那一刻宏还没定义，照样走窄分支。于是全工程的 `stat_t` 都是 `int`，5×10¹³ 的总和直接溢出——有符号整数溢出是未定义行为，本平台会判 `UB`。

```c file=config.h expect=UB
#ifndef CONFIG_H
#define CONFIG_H

#define STAT_CAP 50000

#if STAT_WIDE
typedef long long stat_t;
#define STAT_FMT "%lld"
#else
typedef int stat_t;
#define STAT_FMT "%d"
#endif

/* 错：开关写在 #if 后面，此刻已经被当作"未定义"处理过了 */
#define STAT_WIDE 1

stat_t stat_sum(const int *a, int n);
stat_t stat_avg(const int *a, int n);
int stat_max(const int *a, int n);

#endif
```

### 平均值写成向上取整 [WA]
`avg` 要求**向下取整**。数据非负时 `sum / n` 天然向下取整；写成 `(sum + n - 1) / n` 就变成了向上取整，只有总和能被 `n` 整除时才碰巧对。

```c file=stat.c expect=WA
#include "config.h"

stat_t stat_sum(const int *a, int n) {
    stat_t s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

stat_t stat_avg(const int *a, int n) {
    stat_t s = stat_sum(a, n);
    return (s + n - 1) / n;         /* 错：这是向上取整 */
}

int stat_max(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}
```

### 打印时写死 `%d`，不用 `STAT_FMT` [WA]
`STAT_FMT` 存在的意义就是"格式跟着类型走"。宽分支下 `stat_t` 是 `long long`，用 `%d` 去打印只会读到低 32 位：50 亿会变成 705032704，输出对不上。

```c file=main.c expect=WA
#include <stdio.h>

#include "config.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > STAT_CAP) {
        return 0;
    }

    int a[STAT_CAP];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1 || a[i] < 0) {
            return 0;
        }
    }

    /* 错：类型是 stat_t（long long），格式却写死成 %d */
    printf("sum=%d\n", stat_sum(a, n));
    printf("avg=%d\n", stat_avg(a, n));
    printf("max=%d\n", stat_max(a, n));
    return 0;
}
```

### 以为 `#define` 的位置无所谓 [CE]
宏从**定义那一行**开始生效，到文件末尾结束；`#include` 只是把另一个文件的内容粘贴到当前位置。所以"先 include 还是先 define"会直接改变头文件里 `#if` 走哪个分支。本题起始代码的 `#define STAT_WIDE 1` 放在 `#include "config.h"` 之后，就是这个错误的典型：它自己那一行之后才生效，对已经展开的头文件没有任何影响。

## 测试用例
### 01 sample 示例 1
```in
5
1000000000 1000000000 1000000000 1000000000 1000000000
```
```out
sum=5000000000
avg=1000000000
max=1000000000
```

### 02 sample 示例 2
```in
1
0
```
```out
sum=0
avg=0
max=0
```

### 03 boundary 三个十亿，总和刚超过 int
```in
3
1000000000 1000000000 1000000000
```
```out
sum=3000000000
avg=1000000000
max=1000000000
```

### 04 degenerate 最小的两个数
```in
2
1 1
```
```out
sum=2
avg=1
max=1
```

### 05 trap 平均值必须向下取整
```in
3
1 2 4
```
```out
sum=7
avg=2
max=4
```
> `7 / 3 = 2`（向下取整），不是 3。初始代码在这里连编译都过不去；修好开关之后，这组数据专门检查除法方向。

### 06 trap 全部相同
```in
4
7 7 7 7
```
```out
sum=28
avg=7
max=7
```

### 07 normal 大额与零混合
```in
6
1000000000 1 500 3 999999999 0
```
```out
sum=2000000503
avg=333333417
max=1000000000
```
> 总和 `2000000503`，除以 6 得 `333333417.16…`，向下取整是 `333333417`。

### 生成 boundary 最大规模：50000 个十亿
```js gen
const n = 50000;
const v = new Array(n).fill(1000000000);
let sum = 0;
for (const x of v) sum += x;
return [{
  kind: 'boundary',
  category: '50000 个十亿，总和 5×10^13',
  input: `${n}\n${v.join(' ')}\n`,
  output: `sum=${sum}\navg=1000000000\nmax=1000000000\n`,
}];
```

### 生成 normal 50000 个随机金额
```js gen
const n = 50000;
const v = [];
let sum = 0;
let max = 0;
for (let i = 0; i < n; i++) {
  const x = rng.int(0, 1000000000);
  v.push(x);
  sum += x;
  if (x > max) max = x;
}
return [{
  kind: 'normal',
  category: '50000 个 0…10 亿的随机金额',
  input: `${n}\n${v.join(' ')}\n`,
  output: `sum=${sum}\navg=${(sum - (sum % n)) / n}\nmax=${max}\n`,
}];
```
