---json
{
  "id": "p-s6-include-search-1",
  "title": "修复阈值配置被每个源文件各复制一份的统计工程",
  "difficulty": "L3",
  "knowledgePoints": ["s6-include-search"],
  "special": null,
  "judge": { "mode": "multi", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个订单统计模块由三个文件组成：

- `config.h`：模块的配置与接口——数组容量、**大额门槛** `g_threshold`，以及两个函数声明；
- `stat.c`：两个函数的定义（求和、统计大额笔数），判断大额时读 `g_threshold`；
- `main.c`：读入数据、**把门槛改成输入给定的值**、调用模块、打印结果。

这个工程能编译、能运行，但 `big` 这个数总是错的。请找出原因并修复。

### 问题的形状
`config.h` 里写的是：

```c
static int g_threshold = 1000;      /* 起始代码的写法 */
```

`main.c` 里写的是：

```c
g_threshold = t;                    /* 想把门槛改成输入给的值 */
```

`stat.c` 里 `count_big` 读的是 `g_threshold`。

看起来是"一个全局配置，main 改、模块读"，实际上 `main.c` 改的和 `stat.c` 读的**不是同一块内存**。想想 `#include` 到底做了什么——它是把 `config.h` 的内容**原样粘贴**到 `#include` 那一行。粘贴只发生在**每个 `.c` 自己的翻译单元里**，`main.c` 和 `stat.c` 是分别预处理的。所以 `static int g_threshold = 1000;` 在 `main.c` 里定义了一份、在 `stat.c` 里又定义了一份，`static` 还决定了它们只在各自的文件里可见——链接器甚至不会报错，因为两个符号根本不冲突。

修好之后，`main.c` 里对 `g_threshold` 的赋值必须能被 `stat.c` 里的 `count_big` 看到。三个文件都可以改，提交时全部参与编译。

## 输入格式
第一行两个整数 `n`、`t`：数据个数、大额门槛。
第二行 `n` 个整数，用空格分隔，依次是每笔订单的金额。

## 输出格式
两行：

```
sum=<总和>
big=<金额大于门槛的笔数>
```

注意是**大于**（`>`），金额恰好等于门槛的订单不算大额。

## 数据范围
- `1 ≤ n ≤ 1000`；
- `0 ≤ t ≤ 1000000`；
- `0 ≤ 每笔金额 ≤ 1000000`；
- 总和最大 `1000 × 10⁶ = 10⁹`，`int` 也装得下，但接口约定用 `long long` 返回（方便以后放宽范围）。

## 示例
### 示例 1
```in
5 500
500 2000 3000 1000 0
```
```out
sum=6500
big=3
```
> 门槛是 500，严格大于 500 的有 2000、3000、1000 三笔（500 本身不算）。起始代码里 `stat.c` 读到的是头文件里的初始值 1000，于是只数出 2 笔——这就是"两份副本"的直接后果。

### 示例 2（边界：只有一个 0，门槛也是 0）
```in
1 0
0
```
```out
sum=0
big=0
```
> 门槛为 0 时，`0 > 0` 不成立，所以 `big` 是 0。这组数据同时验证"严格大于"和"0 是合法金额"。

## 提示
### 第 1 层
先分别看 `main.c` 和 `stat.c` 里 `g_threshold` 是怎么来的：两边的 `.c` 都 `#include "config.h"`。再问一句——`#include` 之后，这两个文件里的 `g_threshold` 是同一个对象吗？

### 第 2 层
`#include` 是**文本粘贴**，粘贴的结果分别进入 `main.c` 和 `stat.c` 两个独立的翻译单元。`static int g_threshold = 1000;` 在**每个**翻译单元里都会定义一个新的、只在本文件可见的变量。所以 `main.c` 里那次赋值只改了它自己那一份，`stat.c` 里的 `count_big` 看到的一直是初始值 1000。

`static` 还让情况变得更隐蔽：如果头文件里写的是不带 `static` 的定义，至少链接期会报 `duplicate symbol`；加了 `static`，链接器反而什么都看不到。

### 第 3 层
正确的分工：**头文件里声明，唯一的 `.c` 里定义**。

- `config.h` 写 `extern int g_threshold;`（声明：告诉编译器"有这么个变量，定义在别处"）；
- `stat.c` 写 `int g_threshold = 1000;`（定义：分配存储、给初值，全工程只有这一份）；
- `main.c` 的 `g_threshold = t;` 就作用在这唯一的一份上。

改完再检查一遍大额判断：必须是 `a[i] > g_threshold`，写成 `>=` 会把恰好等于门槛的订单算进去。

## 参考代码
```c file=config.h
#ifndef CONFIG_H
#define CONFIG_H

#define MAX_N 1000

/* 大额门槛是"模块的配置"，全工程只能有一份。
   头文件会被粘贴进每一个包含它的 .c，所以这里只能写声明（extern），
   定义放在 stat.c 里。写 static 的话每个 .c 都会得到自己的一份副本。 */
extern int g_threshold;

long long sum_all(const int *a, int n);
int count_big(const int *a, int n);

#endif
```

```c file=stat.c
#include "config.h"

int g_threshold = 1000;        /* 唯一的定义，main.c 改的就是这一份 */

long long sum_all(const int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int count_big(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] > g_threshold) {      /* 严格大于：等于门槛的不算 */
            c++;
        }
    }
    return c;
}
```

```c file=main.c
#include <stdio.h>

#include "config.h"

int main(void) {
    int n;
    int t;
    if (scanf("%d %d", &n, &t) != 2 || n < 1 || n > MAX_N) {
        return 0;
    }

    int a[MAX_N];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1 || a[i] < 0) {
            return 0;
        }
    }

    g_threshold = t;               /* 改的是 stat.c 里定义的那唯一一份 */
    printf("sum=%lld\n", sum_all(a, n));
    printf("big=%d\n", count_big(a, n));
    return 0;
}
```

## 初始代码
```c file=config.h
#ifndef CONFIG_H
#define CONFIG_H

#define MAX_N 1000

/* TODO：这里用 static 定义了"配置变量"。头文件会被粘贴进每个 .c，
   于是 main.c 和 stat.c 各自得到一份互不相干的副本。 */
static int g_threshold = 1000;

long long sum_all(const int *a, int n);
int count_big(const int *a, int n);

#endif
```

```c file=stat.c
#include "config.h"

long long sum_all(const int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int count_big(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] > g_threshold) {
            c++;
        }
    }
    return c;
}
```

```c file=main.c
#include <stdio.h>

#include "config.h"

int main(void) {
    int n;
    int t;
    if (scanf("%d %d", &n, &t) != 2 || n < 1 || n > MAX_N) {
        return 0;
    }

    int a[MAX_N];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1 || a[i] < 0) {
            return 0;
        }
    }

    g_threshold = t;               /* 只改了 main.c 自己那一份副本 */
    printf("sum=%lld\n", sum_all(a, n));
    printf("big=%d\n", count_big(a, n));
    return 0;
}
```

## 复杂度
时间 O(n)：求和与统计各扫一遍。
空间 O(n)：`int a[1000]`，约 4KB。

这道题的关键不是算法，而是**翻译单元**这个概念：每个 `.c`（连同它包含的所有头文件）是一个独立的编译单位，`#include` 只在这个单位内部做文本粘贴。头文件里的**声明**可以被粘贴一万次也没关系（声明不是定义）；头文件里的**定义**会被粘贴出很多份，要么造成重复定义的链接错误，要么（加了 `static` 时）变成每个文件各一份、互相看不见——后者不报错，只是行为悄悄错掉，更难查。

## 常见错误
### 头文件里用 `static` 定义全局配置 [WA]
`static int g_threshold = 1000;` 在每个包含了 `config.h` 的翻译单元里都生成一份**独立的**变量。`main.c` 里的赋值只影响它自己那份，`stat.c` 的 `count_big` 永远读到 1000。修改一个模块的配置时，这种 bug 的表现就是"代码明显在改，但模块里读到的还是老值"。

```c file=config.h expect=WA
#ifndef CONFIG_H
#define CONFIG_H

#define MAX_N 1000

/* 错：static 让每个 .c 各有一份副本 */
static int g_threshold = 1000;

long long sum_all(const int *a, int n);
int count_big(const int *a, int n);

#endif
```

```c file=stat.c
#include "config.h"

long long sum_all(const int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int count_big(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] > g_threshold) {      /* 读的是 stat.c 自己那份副本，永远是 1000 */
            c++;
        }
    }
    return c;
}
```

### 头文件里放非 static 的定义 [CE]
把 `static` 去掉、直接写 `int g_threshold = 1000;`，每个 `.c` 都会得到一份**外部链接**的定义，链接期报 `duplicate symbol: g_threshold`（LLVM/lld）或 `multiple definition of 'g_threshold'`（GCC/ld）。头文件里只能写声明，定义必须只出现在一个 `.c` 里。

```c file=config.h expect=CE
#ifndef CONFIG_H
#define CONFIG_H

#define MAX_N 1000

/* 错：头文件里的定义会被粘贴到每个 .c，链接期重复定义 */
int g_threshold = 1000;

long long sum_all(const int *a, int n);
int count_big(const int *a, int n);

#endif
```

### 大额判断写成 `>=` [WA]
门槛是"严格大于才算大额"。写成 `a[i] >= g_threshold` 会把恰好等于门槛的订单也算进去，只有存在"金额正好等于门槛"的数据时才暴露——示例 1 里就有一笔 500。

```c file=stat.c expect=WA
#include "config.h"

int g_threshold = 1000;

long long sum_all(const int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int count_big(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] >= g_threshold) {     /* 错：应该是 > */
            c++;
        }
    }
    return c;
}
```

### 用尖括号包含自己的头文件 [CE]
`#include <config.h>` 走的是"只为标准库准备"的搜索路径。本平台的安全检查会直接拒绝非标准库的尖括号头文件；在别的构建环境里，它可能因为 `-I.` 碰巧能找到，换台机器就失效。**自己写的头文件一律用双引号。**

## 测试用例
### 01 sample 示例 1
```in
5 500
500 2000 3000 1000 0
```
```out
sum=6500
big=3
```

### 02 sample 示例 2
```in
1 0
0
```
```out
sum=0
big=0
```

### 03 degenerate 只有一个数且恰好等于门槛
```in
1 500
500
```
```out
sum=500
big=0
```

### 04 trap 门槛附近的值：99、100、101、100
```in
4 100
99 100 101 100
```
```out
sum=400
big=1
```
> 只有 101 严格大于 100。写成 `>=` 会数出 3 笔。

### 05 trap 门槛为 0 时所有正数都算大额
```in
3 0
1 2 3
```
```out
sum=6
big=3
```

### 06 normal 混合金额
```in
6 1000
2000 1 999 1001 0 500
```
```out
sum=4501
big=2
```

### 07 boundary 金额取上界，门槛也是上界
```in
2 1000000
1000000 999999
```
```out
sum=1999999
big=0
```

### 生成 boundary 1000 笔、门槛在中间
```js gen
const n = 1000;
const t = 500000;
const v = [];
let sum = 0;
let big = 0;
for (let i = 0; i < n; i++) {
  const x = i * 1000;
  v.push(x);
  sum += x;
  if (x > t) big++;
}
return [{
  kind: 'boundary',
  category: '1000 笔金额、门槛 500000',
  input: `${n} ${t}\n${v.join(' ')}\n`,
  output: `sum=${sum}\nbig=${big}\n`,
}];
```
