---json
{
  "id": "p-s5-malloc-free-1",
  "title": "修复多文件工程：漏掉的 stdlib 与对不上的函数名",
  "difficulty": "L3",
  "knowledgePoints": ["s5-malloc-free"],
  "special": "link-diagnosis",
  "judge": { "mode": "multi", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
运营同学交给你一个由三个文件组成的订单统计工程：

- `dyn.h`：模块对外的接口，声明了四个函数和一个容量上限；
- `dyn.c`：这些函数的**定义**，其中 `dyn_read` 负责用 `malloc` 申请数组并读入数据；
- `main.c`：读入订单数、调用模块、打印总额 / 平均值 / 最大值。

可是这个工程现在**连编译都过不了**。请先读懂编译器的报错，判断问题出在哪个文件、哪个阶段，再动手修。三个文件都可以改，提交时全部参与编译。

### 这个工程要做什么
一天有 `n` 笔订单，每笔金额是一个非负整数。请输出：

- `sum`：总额；
- `avg`：平均每笔金额（向下取整）；
- `max`：最大的一笔金额。

`n` 最大 10 万，每笔金额最大 10 亿，总额最大 10¹⁴，所以 `dyn_sum` 和 `dyn_avg` 都用 `long long`。

### 先分清"编译错误"和"链接错误"
这份工程里有两处独立的问题，它们出现在**不同阶段**：

| 阶段 | 典型报错 | 含义 | 本题的成因 |
|---|---|---|---|
| 编译 | `call to undeclared function 'malloc'` | 编译器在当前翻译单元里没见过这个函数的声明，不知道参数和返回类型 | `dyn.c` 用了 `malloc` / `free`，却忘了 `#include <stdlib.h>` |
| 链接 | `undefined reference to 'dyn_avg'`（GCC/ld）<br>`undefined symbol: dyn_avg`（LLVM/lld） | 某个目标文件引用了 `dyn_avg`，但所有目标文件里都没有它的定义 | `dyn.h` 和 `main.c` 用的是 `dyn_avg`，`dyn.c` 里定义的却叫 `dyn_average` |

C17 不再允许"隐式声明函数"：调用一个没有原型的函数是**编译错误**，不是警告。编译器必须先看到 `malloc` 的声明，才能知道它返回 `void *`、参数是 `size_t`，也才能检查你的调用是否正确。`<stdlib.h>` 就是提供这些声明的头文件。

链接错误则相反：编译器逐个翻译 `.c` 文件时只相信头文件里的声明，不会去别的 `.c` 里核对定义；直到链接器把所有目标文件拼在一起，才发现"有人要 `dyn_avg`，但没人提供 `dyn_avg`"。

### 两个问题都要修
1. 给 `dyn.c` 补上 `#include <stdlib.h>`，让 `malloc` / `free` 的声明可见；
2. 让 `dyn.c` 里的函数定义名与 `dyn.h` 的声明、`main.c` 的调用一致——把 `dyn_average` 改成 `dyn_avg`（或者反过来改另外两处，但三处必须一致）。

改完之后，工程应该能编译、链接，并在所有测试数据上给出正确结果。

## 输入格式
第一行一个整数 `n`（1 ≤ n ≤ 100000）。

第二行 `n` 个整数，依次表示每笔订单的金额，用空格分隔。

## 输出格式
输出三行：

```
sum=总额
avg=平均每笔金额（向下取整）
max=最大金额
```

## 数据范围
- 1 ≤ n ≤ 100000
- 0 ≤ 每笔金额 ≤ 1000000000
- 总额最大 10¹⁴，超过 `int`，必须用 `long long`

## 示例
### 示例 1
```in
5
500 20000 3000 10000 0
```
```out
sum=33500
avg=6700
max=20000
```
> 总额 500 + 20000 + 3000 + 10000 + 0 = 33500，平均 33500 / 5 = 6700。最大值是 20000。初始代码在这里会先报编译错误，修好之后才是这三行。

### 示例 2（边界：只有一笔金额为 0 的订单）
```in
1
0
```
```out
sum=0
avg=0
max=0
```
> `n = 1` 时平均值就是这一笔本身。总额 0 是合法数据，不要把它当成"没读到数据"；`dyn_read` 返回的指针也不能因为第一笔是 0 就被当成失败。

## 提示
### 第 1 层
先编译一次，把报错信息从头读到尾。第一条错误通常是 `call to undeclared function 'malloc'`，它指向 `dyn.c` 的某一行；先解决编译错误，链接错误才会露出来。

### 第 2 层
`malloc` 和 `free` 的声明都在 `<stdlib.h>` 里。`dyn.c` 只包含了 `<stdio.h>` 和 `dyn.h`，编译器没有见过这两个函数，于是按"未声明函数"报错。在 `dyn.c` 顶部补上 `#include <stdlib.h>`。

### 第 3 层
补完头文件后，链接器会报 `undefined reference to 'dyn_avg'`。请把三个地方的名字并排看：`dyn.h` 里的声明、`main.c` 里的调用、`dyn.c` 里的定义。它们必须逐字符一致；本题里 `dyn.c` 写成了 `dyn_average`，改成 `dyn_avg` 即可。另外别忘了 `dyn_sum` 的累加变量要用 `long long`，否则 10 万 × 10 亿会让 `int` 溢出。

## 参考代码
```c file=dyn.h
#ifndef DYN_H
#define DYN_H

#include <stddef.h>

/* 数组容量：数组长度必须是编译期常量，所以用宏 */
#define DYN_MAX 100000

/* 函数声明：定义都在 dyn.c 里 */
int *dyn_read(int n);
long long dyn_sum(const int *a, int n);
long long dyn_avg(const int *a, int n);
int dyn_max(const int *a, int n);
void dyn_free(int *a);

#endif
```

```c file=dyn.c
#include "dyn.h"
#include <stdio.h>
#include <stdlib.h>

int *dyn_read(int n) {
    int *a = malloc((size_t)n * sizeof *a);   /* 申请 n 个 int */
    if (a == NULL) {
        return NULL;
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            dyn_free(a);                      /* 读入失败也要释放 */
            return NULL;
        }
    }
    return a;
}

long long dyn_sum(const int *a, int n) {
    long long s = 0;                          /* 总额最大 10^14 */
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

long long dyn_avg(const int *a, int n) {
    return n > 0 ? dyn_sum(a, n) / n : 0;     /* 金额非负，整除就是向下取整 */
}

int dyn_max(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

void dyn_free(int *a) {
    free(a);
}
```

```c file=main.c
#include <stdio.h>
#include "dyn.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > DYN_MAX) {
        return 0;
    }

    int *a = dyn_read(n);
    if (a == NULL) {
        return 1;
    }

    printf("sum=%lld\n", dyn_sum(a, n));
    printf("avg=%lld\n", dyn_avg(a, n));
    printf("max=%d\n", dyn_max(a, n));

    dyn_free(a);
    return 0;
}
```

## 初始代码
```c file=dyn.h
#ifndef DYN_H
#define DYN_H

#include <stddef.h>

/* 数组容量：数组长度必须是编译期常量，所以用宏 */
#define DYN_MAX 100000

/* 函数声明：定义都在 dyn.c 里 */
int *dyn_read(int n);
long long dyn_sum(const int *a, int n);
long long dyn_avg(const int *a, int n);
int dyn_max(const int *a, int n);
void dyn_free(int *a);

#endif
```

```c file=dyn.c
#include "dyn.h"
#include <stdio.h>

/* TODO: 这里少了一个头文件，malloc / free 没有声明 */

int *dyn_read(int n) {
    int *a = malloc((size_t)n * sizeof *a);
    if (a == NULL) {
        return NULL;
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            free(a);
            return NULL;
        }
    }
    return a;
}

long long dyn_sum(const int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

long long dyn_average(const int *a, int n) {   /* TODO: 头文件声明的名字是 dyn_avg */
    return n > 0 ? dyn_sum(a, n) / n : 0;
}

int dyn_max(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

void dyn_free(int *a) {
    free(a);
}
```

```c file=main.c
#include <stdio.h>
#include "dyn.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > DYN_MAX) {
        return 0;
    }

    int *a = dyn_read(n);
    if (a == NULL) {
        return 1;
    }

    printf("sum=%lld\n", dyn_sum(a, n));
    printf("avg=%lld\n", dyn_avg(a, n));
    printf("max=%d\n", dyn_max(a, n));

    dyn_free(a);
    return 0;
}
```

## 复杂度
时间 O(n)：`dyn_read`、`dyn_sum`、`dyn_max` 各扫一遍数组，`dyn_avg` 复用 `dyn_sum`。
空间 O(n)：`dyn_read` 在堆上申请 `n` 个 `int`，约 400KB（n = 100000 时）。

三个文件的分工本身就是本节的重点：**声明集中在头文件、定义集中在 `.c`、使用者只依赖头文件**。修好之后，`main.c` 不需要知道 `dyn.c` 里 `malloc` 的细节，只依赖 `dyn.h` 的接口。

## 常见错误
### 忘了 #include <stdlib.h> [CE]
`malloc` / `free` 的声明在 `<stdlib.h>`，不在 `<stdio.h>`。C17 下调用未声明的函数直接报错，错误信息通常写着 `call to undeclared function 'malloc'`。补上头文件即可。

```c file=dyn.c expect=CE
#include "dyn.h"
#include <stdio.h>

/* 错：没有 #include <stdlib.h> */

int *dyn_read(int n) {
    int *a = malloc((size_t)n * sizeof *a);
    if (a == NULL) {
        return NULL;
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            free(a);
            return NULL;
        }
    }
    return a;
}

long long dyn_sum(const int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

long long dyn_avg(const int *a, int n) {
    return n > 0 ? dyn_sum(a, n) / n : 0;
}

int dyn_max(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

void dyn_free(int *a) {
    free(a);
}
```

### 声明、定义、调用的名字不一致 [CE]
编译器只检查"调用点有没有声明"，不检查"别的 .c 里有没有同名定义"。名字对不上时，编译阶段可能完全正常，直到链接器发现 `dyn_avg` 没有定义。三处名字必须逐字符一致。

```c file=dyn.c expect=CE
#include "dyn.h"
#include <stdio.h>
#include <stdlib.h>

int *dyn_read(int n) {
    int *a = malloc((size_t)n * sizeof *a);
    if (a == NULL) {
        return NULL;
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            free(a);
            return NULL;
        }
    }
    return a;
}

long long dyn_sum(const int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

long long dyn_average(const int *a, int n) {   /* 错：头文件声明的是 dyn_avg */
    return n > 0 ? dyn_sum(a, n) / n : 0;
}

int dyn_max(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

void dyn_free(int *a) {
    free(a);
}
```

### 累加变量用 int [UB]
链接通过、示例也过，但 10 万笔 × 10 亿的数据会让 `int s` 溢出。有符号整数溢出是未定义行为，本平台的 UBSan 会报 `signed integer overflow` 并判 `UB`。`dyn_sum` 的返回类型是 `long long`，累加变量也必须是 `long long`——返回类型不会自动把中间结果提升成 64 位。

```c file=dyn.c expect=UB
#include "dyn.h"
#include <stdio.h>
#include <stdlib.h>

int *dyn_read(int n) {
    int *a = malloc((size_t)n * sizeof *a);
    if (a == NULL) {
        return NULL;
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            free(a);
            return NULL;
        }
    }
    return a;
}

long long dyn_sum(const int *a, int n) {
    int s = 0;                    /* 错：10 万 × 10 亿 = 10^14 */
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

long long dyn_avg(const int *a, int n) {
    return n > 0 ? dyn_sum(a, n) / n : 0;
}

int dyn_max(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

void dyn_free(int *a) {
    free(a);
}
```

### 只改 main.c 的调用名，不改 dyn.c 的定义 [CE]
把 `main.c` 里的 `dyn_avg(...)` 改成 `dyn_average(...)`，看起来"对上了"，但 `dyn.h` 里没有 `dyn_average` 的声明，C17 下调用未声明函数是编译错误（`call to undeclared function 'dyn_average'`）。声明、定义、调用三处必须同时一致。

## 测试用例
### 01 sample 示例 1
```in
5
500 20000 3000 10000 0
```
```out
sum=33500
avg=6700
max=20000
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

### 03 boundary 三笔十亿，总额超过 int
```in
3
1000000000 1000000000 1000000000
```
```out
sum=3000000000
avg=1000000000
max=1000000000
```

### 04 degenerate 只有一笔小额
```in
1
7
```
```out
sum=7
avg=7
max=7
```

### 05 trap 不能整除时向下取整
```in
3
1 2 2
```
```out
sum=5
avg=1
max=2
```
> 5 / 3 的整数结果是 1，不是四舍五入的 2。题目要求"向下取整"，直接整除即可。

### 06 trap 全部为零
```in
4
0 0 0 0
```
```out
sum=0
avg=0
max=0
```

### 07 normal 正数混合
```in
6
100000 25000 5000 0 19999 20001
```
```out
sum=170000
avg=28333
max=100000
```

### 08 normal 两笔相差悬殊
```in
2
1000000000 0
```
```out
sum=1000000000
avg=500000000
max=1000000000
```

### 09 normal 最大值在最后一笔
```in
5
1 2 3 4 5
```
```out
sum=15
avg=3
max=5
```

### 生成 boundary 50000 笔十亿
```js gen
const cases = [];
const n = 50000;
const v = new Array(n).fill(1000000000);

cases.push({
  kind: 'boundary',
  category: '50000 笔 10 亿，总额 5×10^13',
  input: `${n}\n${v.join(' ')}\n`,
  output: `sum=${n * 1000000000}\navg=1000000000\nmax=1000000000\n`,
});

return cases;
```
