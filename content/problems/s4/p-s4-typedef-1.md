---json
{
  "id": "p-s4-typedef-1",
  "title": "修复订单统计工程：两个头文件的 Money 冲突与 struct 标签陷阱",
  "difficulty": "L3",
  "knowledgePoints": ["s4-typedef"],
  "special": "link-diagnosis",
  "judge": { "mode": "multi", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
运营同学把一个 **6 个文件**的订单统计工程交给你，说"昨天还好好的，今天一编译就一堆红字"。工程结构如下：

| 文件 | 职责 |
|---|---|
| `money.h` | 新模块的公共类型：金额 `Money`（单位：**分**）、订单明细 `Line`、容量 `MAX_LINES` |
| `legacy.h` / `legacy.c` | 五年前的老报表模块：金额单位是**元**，提供一个取整函数 `legacy_round_half_up` |
| `report.h` / `report.c` | 汇总模块：单行金额、总额、最大单行金额、按元分档后的总额 |
| `main.c` | 读入订单，调用汇总模块，打印结果 |

要算的东西只有三样：

- `total`：所有明细的 `qty × unit` 之和，单位**分**；
- `max`：单行金额的最大值，单位**分**；
- `yuan`：把 `total` 换算成元（`total / 100`，整数除法），再交给老模块的 `legacy_round_half_up` 四舍五入到最近的 **10 元**。

可是这个工程现在**编译不过**。请先原样编译一次，把报错从头读到尾，判断清楚每个错误属于哪一类，再动手修。**六个文件都可以改，但提交时必须保持文件名不变、全部参与编译。**

### 三种报错，三种病因
| 报错（Clang 的说法） | 病因 |
|---|---|
| `typedef redefinition with different types ('int' vs 'long long')` | 同一个名字被 typedef 成了两种不同的类型 |
| `conflicting types for 'report_total'` | 同一个函数的**声明**和**定义**用了不同的类型 |
| `incompatible pointer types passing 'Line *' to parameter of type 'struct Line *'` | `Line`（typedef 名）和 `struct Line`（tag）不是同一个类型 |

第一种通常是"两个模块各写了一份同名 typedef"，第二种和第三种往往是一起的：只要有一处把 `Line` 写成了 `struct Line`，整条调用链都会报"指针类型不兼容"。

## 输入格式
第一行一个整数 `n`：订单明细的条数。
接下来 `n` 行，每行三个整数 `id` `qty` `unit`：订单号、数量、单价（单位：分）。

## 输出格式
三行：

```
total=<总额，单位分>
max=<最大单行金额，单位分>
yuan=<按 10 元分档后的总额，单位元>
```

## 数据范围
- `1 ≤ n ≤ 100`（`MAX_LINES`）
- `1 ≤ id ≤ 10^6`，`1 ≤ qty ≤ 1000`，`0 ≤ unit ≤ 10^6`

单行金额最大 `1000 × 10^6 = 10^9`，总额最大 `100 × 10^9 = 10^11`——**超过 `int` 上限（约 2.1×10^9）**，所以金额必须用 `long long`（也就是 `money.h` 里的 `Money`）。

## 示例
### 示例 1
```in
5
1 2 1500
2 3 250
3 1 99999
4 10 1000
5 1 0
```
```out
total=113749
max=99999
yuan=1140
```
> 单行金额分别是 3000、750、99999、10000、0，总额 113749 分，最大 99999 分。换算成元：`113749 / 100 = 1137`（截断），再按 10 元四舍五入：`(1137 + 5) / 10 * 10 = 1140`。

### 示例 2（边界：唯一一条明细金额为 0）
```in
1
1 1 0
```
```out
total=0
max=0
yuan=0
```
> 初始代码在这个输入上会直接编译失败；修好之后这三行才是正确答案。金额 0 是合法数据，不要把它当成"没读到数据"。

## 提示
### 第 1 层
先把工程原样编译一次（命令见「编译与运行」），把报错**从头读到尾**。第一行报错往往不是根因：如果先报的是 `typedef redefinition`，那后面的 `conflicting types` 可能只是它的连锁反应。数一数一共有几个"独立的"错误。

### 第 2 层
两个头文件对 `Money` 的定义不一样：`money.h` 里是 `long long`（分），`legacy.h` 里是 `int`（元）。**它们不是同一件事**，不可能共存于同一个翻译单元。想清楚保留哪一套、另一个该叫什么名字，然后连它的 `.c` 实现一起改。

另外，`money.h` 里的 `Line` 是**匿名结构体**的别名，根本不存在 `struct Line` 这个 tag。`report.h` 里的 `struct Line *` 会当场声明一个全新的、不完整的类型，于是和 `report.c` 里的 `Line *` 不兼容。

### 第 3 层
编译通过之后还要跑一遍：`report_total` 里如果用的是 `int`，`100 × 10^9 = 10^11` 会溢出（本平台判 `WA`）。金额自始至终都要走 `Money`（`long long`），包括中间的累加变量。

## 参考代码
```c file=money.h
#ifndef MONEY_H
#define MONEY_H

/* 金额统一用「分」为单位，用 long long 保存：一张订单的总额可能超过 int */
typedef long long Money;

#define MAX_LINES 100

/* 一行订单明细 */
typedef struct {
    int id;
    int qty;
    Money unit;
} Line;

#endif
```

```c file=legacy.h
#ifndef LEGACY_H
#define LEGACY_H

/* 旧报表模块：金额单位是「元」。与 money.h 的「分」不是一回事，
   所以这里的类型必须换个名字，不能也叫 Money */
typedef int LegacyYuan;

/* 旧报表的取整：四舍五入到最近的 10 元 */
LegacyYuan legacy_round_half_up(LegacyYuan yuan);

#endif
```

```c file=legacy.c
#include "legacy.h"

LegacyYuan legacy_round_half_up(LegacyYuan yuan) {
    return (yuan + 5) / 10 * 10;
}
```

```c file=report.h
#ifndef REPORT_H
#define REPORT_H

#include "money.h"

Money report_amount(const Line *l);
Money report_total(const Line *lines, int n);
Money report_max(const Line *lines, int n);

/* 返回按 10 元分档后的金额，单位是「元」 */
long long report_total_yuan(const Line *lines, int n);

#endif
```

```c file=report.c
#include "report.h"
#include "legacy.h"

Money report_amount(const Line *l) {
    return l->qty * l->unit;
}

Money report_total(const Line *lines, int n) {
    Money total = 0;                 /* 10^11 分：必须用 long long */
    for (int i = 0; i < n; i++) {
        total += report_amount(&lines[i]);
    }
    return total;
}

Money report_max(const Line *lines, int n) {
    Money best = 0;
    for (int i = 0; i < n; i++) {
        Money v = report_amount(&lines[i]);
        if (v > best) {
            best = v;
        }
    }
    return best;
}

long long report_total_yuan(const Line *lines, int n) {
    long long fen = report_total(lines, n);
    LegacyYuan yuan = (LegacyYuan)(fen / 100);      /* 分 → 元，交给旧模块 */
    return (long long)legacy_round_half_up(yuan);
}
```

```c file=main.c
#include <stdio.h>
#include "report.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAX_LINES) {
        return 0;
    }
    Line lines[MAX_LINES];
    for (int i = 0; i < n; i++) {
        if (scanf("%d %d %lld", &lines[i].id, &lines[i].qty, &lines[i].unit) != 3) {
            return 0;
        }
    }
    printf("total=%lld\n", report_total(lines, n));
    printf("max=%lld\n", report_max(lines, n));
    printf("yuan=%lld\n", report_total_yuan(lines, n));
    return 0;
}
```

## 初始代码
```c file=money.h
#ifndef MONEY_H
#define MONEY_H

/* 金额统一用「分」为单位，用 long long 保存：一张订单的总额可能超过 int */
typedef long long Money;

#define MAX_LINES 100

/* 一行订单明细 */
typedef struct {
    int id;
    int qty;
    Money unit;
} Line;

#endif
```

```c file=legacy.h
#ifndef LEGACY_H
#define LEGACY_H

/* 旧报表模块：金额单位是「元」，用 int 保存 */
typedef int Money;                  /* TODO: 与新模块的 Money（分，long long）同名不同义 */

int legacy_round_half_up(Money yuan);

#endif
```

```c file=legacy.c
#include "legacy.h"

Money legacy_round_half_up(Money yuan) {
    return (yuan + 5) / 10 * 10;
}
```

```c file=report.h
#ifndef REPORT_H
#define REPORT_H

#include "money.h"

/* TODO: struct Line 与 Line 不是同一个类型 */
Money report_total(const struct Line *lines, int n);
Money report_max(const struct Line *lines, int n);
Money report_amount(const struct Line *l);
long long report_total_yuan(const struct Line *lines, int n);

#endif
```

```c file=report.c
#include "report.h"
#include "legacy.h"                 /* 旧模块的取整函数还在这里用 */

Money report_amount(const Line *l) {
    return l->qty * l->unit;
}

Money report_total(const Line *lines, int n) {
    int total = 0;                  /* TODO: 100 行 × 10^9 = 10^11，int 装不下 */
    for (int i = 0; i < n; i++) {
        total += report_amount(&lines[i]);
    }
    return total;
}

Money report_max(const Line *lines, int n) {
    Money best = 0;
    for (int i = 0; i < n; i++) {
        Money v = report_amount(&lines[i]);
        if (v > best) {
            best = v;
        }
    }
    return best;
}

long long report_total_yuan(const Line *lines, int n) {
    long long fen = report_total(lines, n);
    return (long long)legacy_round_half_up((int)(fen / 100));
}
```

```c file=main.c
#include <stdio.h>
#include "report.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAX_LINES) {
        return 0;
    }
    Line lines[MAX_LINES];
    for (int i = 0; i < n; i++) {
        if (scanf("%d %d %lld", &lines[i].id, &lines[i].qty, &lines[i].unit) != 3) {
            return 0;
        }
    }
    printf("total=%lld\n", report_total(lines, n));
    printf("max=%lld\n", report_max(lines, n));
    printf("yuan=%lld\n", report_total_yuan(lines, n));
    return 0;
}
```

## 复杂度
时间：`O(n)`，`report_amount` 被 `report_total` 和 `report_max` 各调用一遍。
空间：`O(n)`，`Line lines[100]` 约 1.6KB。

六个文件的分工本身就是这段代码的重点：**类型定义放 `money.h`、接口放 `report.h`、实现放 `report.c`**。改实现不用动 `main.c`，但前提是类型名在全工程里只有一种含义。

## 常见错误
### 只改 report.c，不改 legacy.h 的 typedef [CE]
把 `report.c` 里的 `int total` 改成 `Money total`、`struct Line` 改成 `Line`，看起来"修完了"，但 `legacy.h` 里的 `typedef int Money;` 还在，`report.c` 同时包含 `report.h`（→`money.h`）和 `legacy.h`，于是仍然报 `typedef redefinition with different types ('int' vs 'long long')`。

```c file=legacy.h expect=CE
#ifndef LEGACY_H
#define LEGACY_H

typedef int Money;                  /* 错：与 money.h 的 Money 冲突 */

int legacy_round_half_up(Money yuan);

#endif
```

```c file=legacy.c expect=CE
#include "legacy.h"

Money legacy_round_half_up(Money yuan) {
    return (yuan + 5) / 10 * 10;
}
```

### 只改 report.c，不改 report.h 的 struct Line [CE]
`report.c` 里的定义改成了 `const Line *`，但 `report.h` 里的声明还是 `const struct Line *`，编译器会报 `conflicting types`，并在 `main.c` 里报一串 `incompatible pointer types`。声明和定义必须用**同一个**类型名。

```c file=report.h expect=CE
#ifndef REPORT_H
#define REPORT_H

#include "money.h"

Money report_total(const struct Line *lines, int n);    /* 错：struct Line ≠ Line */
Money report_max(const struct Line *lines, int n);
Money report_amount(const struct Line *l);
long long report_total_yuan(const struct Line *lines, int n);

#endif
```

### 编译通过了，但累加变量还是 int [WA]
`int total = 0; total += report_amount(...);` 在示例 1 这种小数据上完全正确；一旦总额到 `10^11`，`int` 装不下，转换后的结果是一个看似合理、实际完全错误的数（本平台判 `WA`，不会崩）。

```c file=report.c expect=WA
#include "report.h"
#include "legacy.h"

Money report_amount(const Line *l) {
    return l->qty * l->unit;
}

Money report_total(const Line *lines, int n) {
    int total = 0;                  /* 错：10^11 装不下 */
    for (int i = 0; i < n; i++) {
        total += report_amount(&lines[i]);
    }
    return total;
}

Money report_max(const Line *lines, int n) {
    Money best = 0;
    for (int i = 0; i < n; i++) {
        Money v = report_amount(&lines[i]);
        if (v > best) {
            best = v;
        }
    }
    return best;
}

long long report_total_yuan(const Line *lines, int n) {
    long long fen = report_total(lines, n);
    LegacyYuan yuan = (LegacyYuan)(fen / 100);
    return (long long)legacy_round_half_up(yuan);
}
```

### 把 legacy 的类型名改了，却忘了改 legacy.c [CE]
把 `legacy.h` 里的 `Money` 改成 `LegacyYuan` 之后，`legacy.c` 里的定义仍然是 `Money legacy_round_half_up(Money yuan)`。此时 `legacy.c` 里已经没有 `Money` 这个名字了，编译器报 `unknown type name 'Money'`。**typedef 改名必须三处同步：头文件的 typedef、头文件里的声明、`.c` 里的定义。**

## 测试用例
### 01 sample 示例 1
```in
5
1 2 1500
2 3 250
3 1 99999
4 10 1000
5 1 0
```
```out
total=113749
max=99999
yuan=1140
```

### 02 sample 示例 2
```in
1
1 1 0
```
```out
total=0
max=0
yuan=0
```

### 03 boundary 一百行十亿级的金额，总额到 10^11
```in
100
1 1000 1000000
2 1000 1000000
3 1000 1000000
4 1000 1000000
5 1000 1000000
6 1000 1000000
7 1000 1000000
8 1000 1000000
9 1000 1000000
10 1000 1000000
11 1000 1000000
12 1000 1000000
13 1000 1000000
14 1000 1000000
15 1000 1000000
16 1000 1000000
17 1000 1000000
18 1000 1000000
19 1000 1000000
20 1000 1000000
21 1000 1000000
22 1000 1000000
23 1000 1000000
24 1000 1000000
25 1000 1000000
26 1000 1000000
27 1000 1000000
28 1000 1000000
29 1000 1000000
30 1000 1000000
31 1000 1000000
32 1000 1000000
33 1000 1000000
34 1000 1000000
35 1000 1000000
36 1000 1000000
37 1000 1000000
38 1000 1000000
39 1000 1000000
40 1000 1000000
41 1000 1000000
42 1000 1000000
43 1000 1000000
44 1000 1000000
45 1000 1000000
46 1000 1000000
47 1000 1000000
48 1000 1000000
49 1000 1000000
50 1000 1000000
51 1000 1000000
52 1000 1000000
53 1000 1000000
54 1000 1000000
55 1000 1000000
56 1000 1000000
57 1000 1000000
58 1000 1000000
59 1000 1000000
60 1000 1000000
61 1000 1000000
62 1000 1000000
63 1000 1000000
64 1000 1000000
65 1000 1000000
66 1000 1000000
67 1000 1000000
68 1000 1000000
69 1000 1000000
70 1000 1000000
71 1000 1000000
72 1000 1000000
73 1000 1000000
74 1000 1000000
75 1000 1000000
76 1000 1000000
77 1000 1000000
78 1000 1000000
79 1000 1000000
80 1000 1000000
81 1000 1000000
82 1000 1000000
83 1000 1000000
84 1000 1000000
85 1000 1000000
86 1000 1000000
87 1000 1000000
88 1000 1000000
89 1000 1000000
90 1000 1000000
91 1000 1000000
92 1000 1000000
93 1000 1000000
94 1000 1000000
95 1000 1000000
96 1000 1000000
97 1000 1000000
98 1000 1000000
99 1000 1000000
100 1000 1000000
```
```out
total=100000000000
max=1000000000
yuan=1000000000
```

### 04 degenerate 所有明细数量为 0
```in
3
1 0 1000000
2 0 500000
3 0 0
```
```out
total=0
max=0
yuan=0
```

### 05 trap 分转元先截断，再按 10 元分档
```in
1
1 1 1050
```
```out
total=1050
max=1050
yuan=10
```
> `1050 分 = 10.5 元`，`1050 / 100` 先截断成 `10`，再分档还是 `10`。如果先四舍五入到 11 元再分档，会得到 110——那是错的。

### 06 trap 总额刚过 int 上限
```in
3
1 1000 1000000
2 1000 1000000
3 1000 1000000
```
```out
total=3000000000
max=1000000000
yuan=30000000
```

### 07 normal 两行金额差一点
```in
2
1 999 999999
2 1 1
```
```out
total=998999002
max=998999001
yuan=9989990
```

### 08 boundary 一百行接近上限的金额
```in
100
1 1000 999999
2 1000 999999
3 1000 999999
4 1000 999999
5 1000 999999
6 1000 999999
7 1000 999999
8 1000 999999
9 1000 999999
10 1000 999999
11 1000 999999
12 1000 999999
13 1000 999999
14 1000 999999
15 1000 999999
16 1000 999999
17 1000 999999
18 1000 999999
19 1000 999999
20 1000 999999
21 1000 999999
22 1000 999999
23 1000 999999
24 1000 999999
25 1000 999999
26 1000 999999
27 1000 999999
28 1000 999999
29 1000 999999
30 1000 999999
31 1000 999999
32 1000 999999
33 1000 999999
34 1000 999999
35 1000 999999
36 1000 999999
37 1000 999999
38 1000 999999
39 1000 999999
40 1000 999999
41 1000 999999
42 1000 999999
43 1000 999999
44 1000 999999
45 1000 999999
46 1000 999999
47 1000 999999
48 1000 999999
49 1000 999999
50 1000 999999
51 1000 999999
52 1000 999999
53 1000 999999
54 1000 999999
55 1000 999999
56 1000 999999
57 1000 999999
58 1000 999999
59 1000 999999
60 1000 999999
61 1000 999999
62 1000 999999
63 1000 999999
64 1000 999999
65 1000 999999
66 1000 999999
67 1000 999999
68 1000 999999
69 1000 999999
70 1000 999999
71 1000 999999
72 1000 999999
73 1000 999999
74 1000 999999
75 1000 999999
76 1000 999999
77 1000 999999
78 1000 999999
79 1000 999999
80 1000 999999
81 1000 999999
82 1000 999999
83 1000 999999
84 1000 999999
85 1000 999999
86 1000 999999
87 1000 999999
88 1000 999999
89 1000 999999
90 1000 999999
91 1000 999999
92 1000 999999
93 1000 999999
94 1000 999999
95 1000 999999
96 1000 999999
97 1000 999999
98 1000 999999
99 1000 999999
100 1000 999999
```
```out
total=99999900000
max=999999000
yuan=999999000
```
