---json
{
  "id": "p-s3-header-guard-1",
  "title": "修复因头文件缺少卫士而编译失败的订单统计工程",
  "difficulty": "L3",
  "knowledgePoints": ["s3-header-guard"],
  "special": "link-diagnosis",
  "judge": { "mode": "multi", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个订单统计小工程由四个文件组成：

- `config.h`：模块的配置——数组容量上限和一个"大额订单门槛"常量；
- `stats.h`：统计模块的接口，里面 `#include "config.h"`；
- `stats.c`：统计模块的实现，它也包含 `stats.h`；
- `main.c`：读入订单金额、调用模块、打印结果。它同时包含了 `config.h` 和 `stats.h`。

现在这个工程**编译失败**了。请读报错，找出原因并修复，让程序对数据范围内的所有输入都输出正确结果。

### 三个阶段的报错，别混为一谈
| 报错 | 阶段 | 典型含义 |
|---|---|---|
| `redefinition of 'x'` / `error: redefinition of struct ...` | **编译** | 同一个翻译单元里，`x` 的定义出现了两次 |
| `duplicate symbol: x` / `multiple definition of 'x'` | **链接** | 两个目标文件都提供了 `x` 的定义 |
| `undefined symbol: x` / `undefined reference to 'x'` | **链接** | 有人用了 `x`，但没有任何目标文件提供它的定义 |

本题的初始代码报的是第一种。但请注意：**把编译错误修掉之后，工程未必就能链接**——`config.h` 里的那行常量定义还藏着第二个问题，它要到链接阶段才会说话。一步一步来，每次改完都重新编译一次。

## 输入格式
第一行一个整数 `n`。
第二行 `n` 个整数，依次表示每笔订单的金额（非负整数），用空格分隔。

## 输出格式
输出两行：

```
total=总金额
big=大额订单笔数
```

其中"大额"指金额 **大于等于** 门槛 `CONFIG_THRESHOLD`（10000）。

## 数据范围
1 ≤ n ≤ 100000
0 ≤ 每笔金额 ≤ 1000000000

总金额最大 10⁵ × 10⁹ = 10¹⁴，超过 `int`，必须用 `long long`。

## 示例
### 示例 1
```in
5
5000 20000 3000 10000 100
```
```out
total=38100
big=2
```
> 总额 5000 + 20000 + 3000 + 10000 + 100 = 38100；达到 10000 的有 20000 和 10000 两笔。

### 示例 2（边界：只有一笔金额为 0 的订单）
```in
1
0
```
```out
total=0
big=0
```
> `n = 1` 时总额就是这一笔。初始代码在这里连编译都过不去——先修好头文件的问题，再看这组数据。

## 提示
### 第 1 层
先编译，读第一条报错：`redefinition of 'CONFIG_THRESHOLD'`（或类似的名字）。同一个 `.c` 文件里为什么会出现两份定义？顺着报错里的 "included multiple times" 提示，看 `main.c` 到底包含了哪些头文件。

### 第 2 层
`main.c` 先 `#include "config.h"`，再 `#include "stats.h"`，而 `stats.h` 里又 `#include "config.h"`——所以 `config.h` 的内容在 `main.c` 这个翻译单元里出现了两次。这正是头文件卫士要解决的问题：给 `config.h` 加上 `#ifndef CONFIG_H` / `#define CONFIG_H` / `#endif`。

### 第 3 层
加完卫士，编译能过了，但链接会报 `duplicate symbol: CONFIG_THRESHOLD`。原因是 `config.h` 里写的是**定义**（`const int CONFIG_THRESHOLD = 10000;`），`main.c` 和 `stats.c` 各得到一份。正确的分工是：

- `config.h` 里写 `extern const int CONFIG_THRESHOLD;`（声明）；
- `stats.c` 里写 `const int CONFIG_THRESHOLD = 10000;`（唯一的定义）。

改完这两步，再检查大额判断是不是 `>=`。

## 参考代码
```c file=config.h
#ifndef CONFIG_H
#define CONFIG_H

/* 数组容量：数组长度必须是编译期常量 */
#define CONFIG_MAX_N 100000

/* 大额门槛：这里只是声明，唯一的定义在 stats.c 里。
   头文件会被粘贴进每一个包含它的 .c，所以不能在这里分配存储。 */
extern const int CONFIG_THRESHOLD;

#endif
```

```c file=stats.h
#ifndef STATS_H
#define STATS_H

#include "config.h"

/* 统计模块的接口 */
long long stats_total(const int *a, int n);
int stats_big_count(const int *a, int n);

#endif
```

```c file=stats.c
#include "stats.h"

const int CONFIG_THRESHOLD = 10000;   /* 全工程唯一的一份定义 */

long long stats_total(const int *a, int n) {
    long long s = 0;                  /* 总额最大 10^14 */
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int stats_big_count(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] >= CONFIG_THRESHOLD) {   /* 恰好等于门槛也算大额 */
            c++;
        }
    }
    return c;
}
```

```c file=main.c
#include <stdio.h>
#include "config.h"
#include "stats.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > CONFIG_MAX_N) {
        return 0;
    }

    int a[CONFIG_MAX_N];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    printf("total=%lld\n", stats_total(a, n));
    printf("big=%d\n", stats_big_count(a, n));
    return 0;
}
```

## 初始代码
```c file=config.h
/* config.h —— 本模块的配置。
   注意：这里没有头文件卫士。 */
#define CONFIG_MAX_N 100000

/* 大额门槛（元） */
const int CONFIG_THRESHOLD = 10000;

```

```c file=stats.h
#ifndef STATS_H
#define STATS_H

#include "config.h"

/* 统计模块的接口 */
long long stats_total(const int *a, int n);
int stats_big_count(const int *a, int n);

#endif
```

```c file=stats.c
#include "stats.h"

long long stats_total(const int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int stats_big_count(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] >= CONFIG_THRESHOLD) {
            c++;
        }
    }
    return c;
}
```

```c file=main.c
#include <stdio.h>
#include "config.h"
#include "stats.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > CONFIG_MAX_N) {
        return 0;
    }

    int a[CONFIG_MAX_N];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    printf("total=%lld\n", stats_total(a, n));
    printf("big=%d\n", stats_big_count(a, n));
    return 0;
}
```

## 复杂度
时间 O(n)：`stats_total` 和 `stats_big_count` 各扫一遍数组。
空间 O(n)：`int a[100000]` 约占 400KB。

这道题的代码量很小，全部难点在工程结构上：**同一个头文件在一个翻译单元里只能展开一次（卫士负责），一个对象在整个工程里只能定义一次（`extern` + 单一 `.c` 负责）**。这两条规则各管一段，缺一不可。

## 常见错误
### 只加了卫士，没有把定义改成声明 [CE]
加上 `#ifndef CONFIG_H` / `#define CONFIG_H` / `#endif` 之后，编译错误消失了，但链接会报 `duplicate symbol: CONFIG_THRESHOLD`：`main.c` 和 `stats.c` 各展开一次 `config.h`，每个目标文件里都有一份定义。**卫士只在单个翻译单元内有效**，跨文件的问题要靠 `extern` 解决。

```c file=config.h expect=CE
#ifndef CONFIG_H
#define CONFIG_H

#define CONFIG_MAX_N 100000

const int CONFIG_THRESHOLD = 10000;   /* 错：头文件里定义，每个 .c 都会有一份 */

#endif
```
```c file=stats.c
#include "stats.h"

long long stats_total(const int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int stats_big_count(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] >= CONFIG_THRESHOLD) {
            c++;
        }
    }
    return c;
}
```

### 卫士只包住了文件的一部分 [CE]
`#endif` 提前收尾，把常量定义留在了卫士外面。只要有一行在卫士外，它就会在第二次包含时被重复展开，报错和没加卫士时一模一样。

```c file=config.h expect=CE
#ifndef CONFIG_H
#define CONFIG_H

#define CONFIG_MAX_N 100000

#endif

const int CONFIG_THRESHOLD = 10000;   /* 错：落在了卫士外面 */

```

### 改成了 extern，却忘了在 stats.c 里定义 [CE]
`config.h` 里写 `extern const int CONFIG_THRESHOLD;` 之后，`stats.c` 必须提供唯一的那份 `const int CONFIG_THRESHOLD = 10000;`。忘了它，链接器会报 `undefined symbol: CONFIG_THRESHOLD`——声明只是承诺，定义才是兑现。

```c file=stats.c expect=CE
#include "stats.h"

/* 少了 const int CONFIG_THRESHOLD = 10000; */

long long stats_total(const int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int stats_big_count(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] >= CONFIG_THRESHOLD) {   /* 用到了一个没有定义的符号 */
            c++;
        }
    }
    return c;
}
```

### 大额判断写成 > [WA]
门槛是包含在内的：金额恰好等于 10000 也算大额。写成 `a[i] > CONFIG_THRESHOLD` 只有在金额正好等于门槛的数据上才暴露，示例 1 里恰好有一笔 10000，可以自己验证一下。

```c file=stats.c expect=WA
#include "stats.h"

const int CONFIG_THRESHOLD = 10000;

long long stats_total(const int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int stats_big_count(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] > CONFIG_THRESHOLD) {   /* 错：应为 >= */
            c++;
        }
    }
    return c;
}
```

### 以为头文件卫士能解决"多个 .c 重复定义" [CE]
这是最普遍的误解。卫士是一个宏，宏的生命周期只在**当前翻译单元**内。`main.c` 和 `stats.c` 是两次独立的编译，每次预处理器都从零开始，卫士管不到对方。跨文件的唯一解是"头文件里只声明，定义留给一个 `.c`"。

## 测试用例
### 01 sample 示例 1
```in
5
5000 20000 3000 10000 100
```
```out
total=38100
big=2
```

### 02 sample 示例 2
```in
1
0
```
```out
total=0
big=0
```

### 03 boundary 三笔十亿，总额超过 int
```in
3
1000000000 1000000000 1000000000
```
```out
total=3000000000
big=3
```

### 04 degenerate 只有一笔零元订单
```in
1
0
```
```out
total=0
big=0
```

### 05 boundary 金额恰好等于门槛
```in
1
10000
```
```out
total=10000
big=1
```

### 06 trap 全部低于门槛
```in
4
0 1 2 3
```
```out
total=6
big=0
```

### 07 normal 大小额混合
```in
6
100 20000 30000 0 15000 9999
```
```out
total=75099
big=3
```

### 08 trap 门槛上下各一笔，中间正好压线
```in
3
9999 10000 10001
```
```out
total=30000
big=2
```

### 09 normal 两笔相差一元
```in
2
10000 9999
```
```out
total=19999
big=1
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
  output: `total=${50000 * 1000000000}\nbig=${n1}\n`,
});

/* 恰好压线：20000 笔全部等于门槛 */
const n2 = 20000;
const v2 = new Array(n2).fill(10000);
cases.push({
  kind: 'trap',
  category: '20000 笔恰好等于门槛 10000',
  input: `${n2}\n${v2.join(' ')}\n`,
  output: `total=${n2 * 10000}\nbig=${n2}\n`,
});

/* 压力：50000 个随机金额，期望值在 JS 里独立计算 */
const n3 = 50000;
const v3 = [];
let total = 0;
let big = 0;
for (let i = 0; i < n3; i++) {
  const x = rng.int(0, 1000000000);
  v3.push(x);
  total += x;
  if (x >= 10000) big++;
}
cases.push({
  kind: 'stress',
  category: '50000 个 0…10 亿的随机金额',
  input: `${n3}\n${v3.join(' ')}\n`,
  output: `total=${total}\nbig=${big}\n`,
});

return cases;
```
