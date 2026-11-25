---json
{
  "id": "p-s6-include-search-2",
  "title": "修复头文件路径与实现文件被重复包含的订单报表工程",
  "difficulty": "L3",
  "knowledgePoints": ["s6-include-search"],
  "special": "link-diagnosis",
  "judge": { "mode": "multi", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个订单报表模块由三个文件组成：

- `app.h`：模块接口——容量上限和三个函数声明；
- `app.c`：三个函数的定义；
- `main.c`：读入数据、调用模块、打印报表。

这个工程**现在编译失败**，而且更麻烦的是：**你修掉第一个错误之后，还会冒出第二个错误**。请一步一步来，每次改完重新编译一次。

### 第一个错误：找不到头文件
本地开发时，工程目录是这样的：

```
project/
  include/app.h
  src/app.c
  src/main.c
```

`src/app.c` 里写的是 `#include "include/app.h"`——它依赖"`src/` 的上一级有个 `include/` 目录"。把文件提交到判题环境之后，**所有文件被放在同一个目录里**，这个前缀就指向了一个不存在的路径。

请记住 `#include "..."` 的搜索规则：**先在"包含它的那个文件"所在目录里找**，找不到再按 `-I` 和系统目录找。它**不会**把 `include/app.h` 拆成"目录 + 文件名"再去别处凑——路径里写了子目录，就必须真的有那个子目录。

### 第二个错误：实现文件被包含进了另一个源文件
修好路径之后，`main.c` 里还有一处：

```c
#include "app.c"
```

`#include` 只是文本粘贴，预处理器不看扩展名，所以这行"能编译"。但判题器会把**所有 `.c` 文件都编译一遍**，于是 `app_total`、`app_max`、`app_above` 这三个函数在工程里出现了两份定义——链接期报：

```
ld.lld: error: duplicate symbol: app_total
ld.lld: error: duplicate symbol: app_max
ld.lld: error: duplicate symbol: app_above
```

### 第三个坑（不是编译错误）
两个 include 都改对之后，示例能过，但大数据会判 `UB`：`app_total` 里的累加变量是 `int`，而 `1000 × 10⁹ = 10¹²` 装不进 32 位。**能编译、能过小样例，不代表正确**。

三个文件都可以改，提交时全部参与编译。目标：对数据范围内的所有输入都输出正确结果。

## 输入格式
第一行两个整数 `n`、`limit`：订单数与"大额门槛"。
第二行 `n` 个整数，用空格分隔，依次是每笔金额（非负）。

## 输出格式
```
total=<总金额>
max=<最大单笔金额>
above=<金额大于等于门槛的笔数>
```

## 数据范围
- `1 ≤ n ≤ 1000`；
- `0 ≤ 每笔金额 ≤ 1000000000`；
- `0 ≤ limit ≤ 1000000000`；
- 总金额最大 `1000 × 10⁹ = 10¹²`，**超过 `int`**，必须用 `long long`。

## 示例
### 示例 1
```in
5 1000
500 2000 3000 1000 0
```
```out
total=6500
max=3000
above=3
```
> 总额 6500，最大单笔 3000。达到门槛 1000 的有 2000、3000、1000 三笔（"大于等于"包含等于）。

### 示例 2（边界：一笔金额为 0，门槛也是 0）
```in
1 0
0
```
```out
total=0
max=0
above=1
```
> `0 >= 0` 成立，所以 `above` 是 1。`n = 1` 时 `max` 就是这一笔本身。

## 提示
### 第 1 层
先编译一次，把报错信息从头读到尾。本平台的提示会明确告诉你：找不到 `include/app.h`，双引号形式只能包含**你自己提交的文件**，并把当前提交的文件列表列出来。对照这个列表，想想那行 `#include` 应该写成什么。

### 第 2 层
`app.c` 里的 `#include "include/app.h"` 改成 `#include "app.h"`（同目录，双引号先搜当前文件所在目录，一定能找到）。

改完再编译，会看到链接器报 `duplicate symbol: app_total`。原因是 `main.c` 里 `#include "app.c"`：这相当于把 `app.c` 的全文又抄进了 `main.c`，而 `app.c` 本身也被编译了一次。把 `main.c` 里的那行改成 `#include "app.h"`（只包含声明），定义留给 `app.c`。

### 第 3 层
两个 include 都改对之后，程序能编译、能链接、示例也能过。但 `app_total` 的累加变量是 `int`——`10¹²` 会溢出，本平台会判 `UB`（有符号整数溢出）。把累加变量和返回类型都改成 `long long`。

最后确认 `app_above` 的判断是 `a[i] >= limit`：门槛是含在里面的。

## 参考代码
```c file=app.h
#ifndef APP_H
#define APP_H

/* 数组容量：数组长度必须是编译期常量，所以用宏 */
#define APP_CAP 1000

/* 只放声明。头文件会被粘贴进每个包含它的 .c，放定义会变成多份 */
long long app_total(const int *a, int n);
int app_max(const int *a, int n);
int app_above(const int *a, int n, int limit);

#endif
```

```c file=app.c
#include "app.h"        /* 自己写的头文件用双引号：先搜 app.c 所在目录 */

long long app_total(const int *a, int n) {
    long long s = 0;            /* 总金额最大 10^12，必须 64 位 */
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int app_max(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

int app_above(const int *a, int n, int limit) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] >= limit) {    /* 达到门槛就算 */
            c++;
        }
    }
    return c;
}
```

```c file=main.c
#include <stdio.h>

#include "app.h"        /* 只要声明；app.c 由构建命令单独编译 */

int main(void) {
    int n;
    int limit;
    if (scanf("%d %d", &n, &limit) != 2 || n < 1 || n > APP_CAP) {
        return 0;
    }

    int a[APP_CAP];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1 || a[i] < 0) {
            return 0;
        }
    }

    printf("total=%lld\n", app_total(a, n));
    printf("max=%d\n", app_max(a, n));
    printf("above=%d\n", app_above(a, n, limit));
    return 0;
}
```

## 初始代码
```c file=app.h
#ifndef APP_H
#define APP_H

#define APP_CAP 1000

long long app_total(const int *a, int n);
int app_max(const int *a, int n);
int app_above(const int *a, int n, int limit);

#endif
```

```c file=app.c
#include "include/app.h"    /* TODO：判题器把所有文件放在同一个目录，没有 include/ 这一层 */

long long app_total(const int *a, int n) {
    int s = 0;                  /* TODO：总金额最大 10^12，int 装不下 */
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int app_max(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

int app_above(const int *a, int n, int limit) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] >= limit) {
            c++;
        }
    }
    return c;
}
```

```c file=main.c
#include <stdio.h>

#include "app.c"            /* TODO：实现文件不能 include —— app.c 会被单独编译一次 */

int main(void) {
    int n;
    int limit;
    if (scanf("%d %d", &n, &limit) != 2 || n < 1 || n > APP_CAP) {
        return 0;
    }

    int a[APP_CAP];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1 || a[i] < 0) {
            return 0;
        }
    }

    printf("total=%lld\n", app_total(a, n));
    printf("max=%d\n", app_max(a, n));
    printf("above=%d\n", app_above(a, n, limit));
    return 0;
}
```

## 复杂度
时间 O(n)：三个函数各扫一遍数组。
空间 O(n)：`int a[1000]`，约 4KB。

这道题把 `#include` 的两个常见误区放在了一起：

1. **路径是"相对包含者"的**。`"include/app.h"` 表示"当前文件所在目录下的 `include/app.h`"，文件被拍平之后这个子目录不存在，于是找不到。`-I` 加的是**目录**，不是路径前缀——真有多层目录时，正确的组合是 `-Iinclude` 配 `#include "app.h"`；
2. **任何文件都能被 include，包括 `.c`**。预处理器不看扩展名，所以 `#include "app.c"` 语法上完全合法；但构建系统会把 `app.c` 也编译一遍，于是同一份定义出现在两个目标文件里，链接期报 `duplicate symbol`。**`#include` 的目标应该只有声明。**

## 常见错误
### 只改了路径，没去掉对 `.c` 的包含 [CE]
修好 `app.c` 里的头文件路径之后，报错会从"找不到头文件"变成链接期的 `duplicate symbol`。很多人以为"能编译了就行"，忽略了链接阶段——两个目标文件里都有一份 `app_total` 的定义，链接器不会替你挑一个。

```c file=app.c expect=CE
#include "app.h"

long long app_total(const int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int app_max(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

int app_above(const int *a, int n, int limit) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] >= limit) {
            c++;
        }
    }
    return c;
}
```

```c file=main.c
#include <stdio.h>

#include "app.c"        /* 错：app.c 也会被单独编译，定义重复 */

int main(void) {
    int n;
    int limit;
    if (scanf("%d %d", &n, &limit) != 2 || n < 1 || n > APP_CAP) {
        return 0;
    }

    int a[APP_CAP];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1 || a[i] < 0) {
            return 0;
        }
    }

    printf("total=%lld\n", app_total(a, n));
    printf("max=%d\n", app_max(a, n));
    printf("above=%d\n", app_above(a, n, limit));
    return 0;
}
```

### 把项目头文件改成尖括号 [CE]
`#include <app.h>` 走的是"给标准库准备的"搜索路径，而且本平台的安全检查直接规定：尖括号里只允许 C 标准库头文件。改完之后报的是"不是 C 标准库头文件"，工程连编译都进不去。

```c file=app.c expect=CE
#include <app.h>           /* 错：自己的头文件必须用双引号 */

long long app_total(const int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int app_max(const int *a, int n) {
    return a[0];
}

int app_above(const int *a, int n, int limit) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] >= limit) {
            c++;
        }
    }
    return c;
}
```

### 两个 include 都修好了，累加变量还是 int [UB]
比较隐蔽的一类：编译、链接、示例全过，只有大数据才崩。`int s` 累加 `10¹²` 会溢出，有符号整数溢出是未定义行为，本平台判 `UB`。

```c file=app.c expect=UB
#include "app.h"

long long app_total(const int *a, int n) {
    int s = 0;                  /* 错：总金额最大 10^12 */
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int app_max(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

int app_above(const int *a, int n, int limit) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] >= limit) {
            c++;
        }
    }
    return c;
}
```

### 把函数定义写进头文件 [CE]
有人为了让"两个 .c 都能看到实现"，把函数体写进 `app.h`。头文件会被粘贴进 `app.c` 和 `main.c`，于是两个目标文件里都有一份定义——链接期 `duplicate symbol`。头文件里只放声明，定义放 `.c`。

## 测试用例
### 01 sample 示例 1
```in
5 1000
500 2000 3000 1000 0
```
```out
total=6500
max=3000
above=3
```

### 02 sample 示例 2
```in
1 0
0
```
```out
total=0
max=0
above=1
```

### 03 boundary 三笔十亿，总金额超过 int
```in
3 1000000000
1000000000 1000000000 1000000000
```
```out
total=3000000000
max=1000000000
above=3
```

### 04 degenerate 两笔小额
```in
2 1000000
1 2
```
```out
total=3
max=2
above=0
```

### 05 trap 每笔都恰好等于门槛
```in
3 5
5 5 5
```
```out
total=15
max=5
above=3
```
> 门槛是"大于等于"，所以三笔全算。写成 `>` 会得到 0。

### 06 trap 只有一笔
```in
1 7
7
```
```out
total=7
max=7
above=1
```

### 07 normal 混合金额
```in
6 500
100 1000 250 600 0 500
```
```out
total=2450
max=1000
above=3
```

### 生成 boundary 1000 笔、总金额 4.995×10^11
```js gen
const n = 1000;
const limit = 500000000;
const v = [];
let sum = 0;
let max = 0;
let above = 0;
for (let i = 0; i < n; i++) {
  const x = i * 1000000;
  v.push(x);
  sum += x;
  if (x > max) max = x;
  if (x >= limit) above++;
}
return [{
  kind: 'boundary',
  category: '1000 笔、单笔最高 9.99 亿',
  input: `${n} ${limit}\n${v.join(' ')}\n`,
  output: `total=${sum}\nmax=${max}\nabove=${above}\n`,
}];
```
