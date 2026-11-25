---json
{
  "id": "p-s2-array-param-1",
  "title": "修复链接失败的成绩统计工程：和、最大值与高于平均分人数",
  "difficulty": "L2",
  "knowledgePoints": ["s2-array-param"],
  "special": "link-diagnosis",
  "judge": { "mode": "multi", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
同事把一个"成绩统计"的小程序拆成了三个文件交给你：

- `stats.h`：三个函数的声明；
- `stats.c`：三个函数的实现；
- `main.c`：读入数据、调用函数、输出结果。

可是这个工程现在**链接失败**，一运行就报 `undefined symbol`（未定义的符号），连可执行文件都生成不出来。

请你读懂错误信息、找出原因并修好它，使程序对数据范围内的所有输入都输出正确结果。三个文件都可以修改，提交时三个文件会一起参与编译。

### 为什么是链接错误
C 程序的构建分两步：

1. **编译**：每个 `.c` 文件单独编译成目标文件。这一步只检查"函数有没有声明、调用写法对不对"。
2. **链接**：链接器把所有目标文件拼在一起，按**名字**去找每个被调用函数的实体。

所以，如果 `main.c` 调用了一个函数、头文件里也声明了它，而实现它的 `.c` 文件里把函数名写成了相近却不同的拼法（例如声明里叫 `calc_total`，定义却写成 `total_calc`），编译阶段一切正常（声明是存在的），链接器却找不到 `calc_total` 的定义，于是报告 `undefined symbol: calc_total`。这不是语法错误，而是"**声明了，但没有定义**"。

修好链接之后，代码还未必正确——请仔细检查每个函数的实现是否符合题目要求。

## 输入格式
第一行一个整数 `n`。
第二行 `n` 个整数 `a1 a2 ... an`，用空格分隔。

## 输出格式
如果成功读入合法的 `n`（1 ≤ n ≤ 1000）和全部 `n` 个整数，输出三行：

1. 数组前 `n` 个元素的和；
2. 数组前 `n` 个元素中的最大值；
3. 前 `n` 个元素中**严格大于平均值**的元素个数。

否则（读入失败、`n` 不在 1 到 1000 之间、或数字个数不够）输出一行 `error`。

## 数据范围
1 ≤ n ≤ 1000
-1000000000 ≤ ai ≤ 1000000000

`n` 个元素的和最大可达 10¹²，**超出了 `int` 的范围**，所以求和必须用 `long long`。
另外，判断"严格大于平均值"时不要用 `sum / n` 的整数除法：`sum` 为负数时整除的方向和真实的平均值不一致，会数错。

## 示例
### 示例 1
```in
6
4 -2 7 7 -10 0
```
```out
6
7
3
```
> 和 = 6，最大值 = 7，平均值 = 1.0；严格大于 1 的元素是 4、7、7，共 3 个。

### 示例 2（边界：只有一个元素）
```in
1
-5
```
```out
-5
-5
0
```
> 只有一个元素时它既是和也是最大值，平均值就是它自己，所以"严格大于平均值"的元素有 0 个。注意最大值不能从 0 开始找，否则这里会输出 0。

## 提示
### 第 1 层
先别急着改代码：点一次"运行"，仔细读报错信息。它说的是编译错误还是链接错误？报错里提到的那个名字，你在哪个文件里见过？

### 第 2 层
`undefined symbol` / `undefined reference to` 是**链接**错误：某个函数被声明、被调用了，但链接器在所有目标文件里都找不到它的定义。逐个对照 `stats.h` 里的声明和 `stats.c` 里的定义——函数名必须一字不差，参数类型也要一致（`const int a[]` 和 `int a[]` 是两种不同的参数类型）。

### 第 3 层
链接修好之后，样例 2 仍然会暴露一个逻辑错误：`array_max` 里把最大值初始化成了 0，而数组里可能一个正数都没有。最大值要用数组中的元素（比如 `a[0]`）初始化。

第三个函数要判断 `a[i]` 是否严格大于平均值。`sum / n` 是整数除法，`sum` 为负时会朝 0 截断，例如 `-7 / 2` 得到 `-3`，而真实平均值是 `-3.5`。把不等式两边同乘 `n`（`(long long)a[i] * n > sum`）就能避开除法。

## 参考代码
```c file=stats.h
#ifndef STATS_H
#define STATS_H

/* 返回数组前 n 个元素的和 */
long long array_sum(const int a[], int n);

/* 返回数组前 n 个元素中的最大值（调用者保证 n >= 1） */
int array_max(const int a[], int n);

/* 返回数组前 n 个元素中「严格大于平均值」的元素个数 */
int count_above_average(const int a[], int n);

#endif
```

```c file=stats.c
#include "stats.h"

long long array_sum(const int a[], int n) {
    long long s = 0;                 /* 用 long long：n 个 10 亿相加会超过 int */
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int array_max(const int a[], int n) {
    int m = a[0];                    /* 用第一个元素初始化，全是负数也正确 */
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

int count_above_average(const int a[], int n) {
    long long s = array_sum(a, n);
    int c = 0;
    for (int i = 0; i < n; i++) {
        /* a[i] > s / n 在 sum 为负时是错的；两边同乘 n 既精确又不会溢出 */
        if ((long long)a[i] * n > s) {
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
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        printf("error\n");
        return 0;
    }

    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            printf("error\n");
            return 0;
        }
    }

    printf("%lld\n", array_sum(a, n));
    printf("%d\n", array_max(a, n));
    printf("%d\n", count_above_average(a, n));
    return 0;
}
```

## 初始代码
```c file=stats.h
#ifndef STATS_H
#define STATS_H

/* 返回数组前 n 个元素的和 */
long long array_sum(const int a[], int n);

/* 返回数组前 n 个元素中的最大值（调用者保证 n >= 1） */
int array_max(const int a[], int n);

/* 返回数组前 n 个元素中「严格大于平均值」的元素个数 */
int count_above_average(const int a[], int n);

#endif
```

```c file=stats.c
#include "stats.h"

/* 注意：这里定义的函数名和头文件里声明的名字对不上 */
long long arr_sum(const int a[], int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int array_max(const int a[], int n) {
    int m = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

int count_above_average(const int a[], int n) {
    long long s = arr_sum(a, n);
    int c = 0;
    for (int i = 0; i < n; i++) {
        if ((long long)a[i] * n > s) {
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
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        printf("error\n");
        return 0;
    }

    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            printf("error\n");
            return 0;
        }
    }

    printf("%lld\n", array_sum(a, n));
    printf("%d\n", array_max(a, n));
    printf("%d\n", count_above_average(a, n));
    return 0;
}
```

## 复杂度
时间 O(n)：三个函数各扫一遍数组。
空间 O(1)：除了存放输入的数组，没有额外的辅助空间。

注意 `main` 里的 `int a[1000]` 是按数据范围开好的。如果把它改成 `int a[n]`（变长数组），功能上也没问题；但无论怎么写，**函数内部都拿不到数组长度**，长度必须通过参数 `n` 传进去。

## 常见错误
### 只修好了链接，最大值仍从 0 开始找 [WA]
链接错误改掉之后程序能跑，但 `array_max` 里 `m = 0`：只要数组里没有正数，最大值就会变成 0，而 0 根本不在数组里。示例 2 的 `-5` 就会立刻暴露它。
```c file=stats.c expect=WA
#include "stats.h"

long long array_sum(const int a[], int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int array_max(const int a[], int n) {
    int m = 0;                       /* 错：全是负数时结果会是 0 */
    for (int i = 0; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

int count_above_average(const int a[], int n) {
    long long s = array_sum(a, n);
    int c = 0;
    for (int i = 0; i < n; i++) {
        if ((long long)a[i] * n > s) {
            c++;
        }
    }
    return c;
}
```

### 用 int 累加总和 [UB]
`n` 最大 1000、每个数最大 10 亿，和最大 10¹²，`int` 装不下。有符号整数溢出是**未定义行为**：本平台的检测工具会直接报告它；在没有检测的环境里，你通常会得到一个负数或奇怪的数。
```c file=stats.c expect=UB
#include "stats.h"

long long array_sum(const int a[], int n) {
    int s = 0;                       /* 错：10¹² 装不进 int */
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int array_max(const int a[], int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

int count_above_average(const int a[], int n) {
    long long s = array_sum(a, n);
    int c = 0;
    for (int i = 0; i < n; i++) {
        if ((long long)a[i] * n > s) {
            c++;
        }
    }
    return c;
}
```

### 用整数除法 sum / n 比较平均值 [WA]
案例 `-3 -4`：和是 -7，真实平均值是 -3.5，只有 -3 严格大于它，答案应该是 1。但 `-7 / 2` 在 C 里朝 0 截断得到 -3，`-3 > -3` 为假，于是输出 0。除法的截断方向与"向下取整"并不总是一致，比较平均值时应当避免整除。
```c file=stats.c expect=WA
#include "stats.h"

long long array_sum(const int a[], int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int array_max(const int a[], int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

int count_above_average(const int a[], int n) {
    long long s = array_sum(a, n);
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] > s / n) {          /* 错：sum 为负时整除结果不对 */
            c++;
        }
    }
    return c;
}
```

### 定义与头文件的 const 对不上 [CE]
头文件里声明的是 `const int a[]`，实现时如果写成 `int a[]`，就是两个**不同的参数类型**（`const int *` 与 `int *`），编译器会报 `conflicting types`。这类错误发生在编译阶段，通不过编译就更谈不上链接了。
```c file=stats.c expect=CE
#include "stats.h"

long long array_sum(const int a[], int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int array_max(int a[], int n) {      /* 错：少了 const，与声明冲突 */
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

int count_above_average(const int a[], int n) {
    long long s = array_sum(a, n);
    int c = 0;
    for (int i = 0; i < n; i++) {
        if ((long long)a[i] * n > s) {
            c++;
        }
    }
    return c;
}
```

### 在函数里用 sizeof 求长度 [WA]
函数里的 `a` 只是指针，`sizeof a / sizeof a[0]` 恒等于 2（8 / 4），和真实长度无关。这个错误不会让程序崩溃，只会安静地少算，所以一定要靠"把 n 传进来"来避免。
```c file=stats.c expect=WA
#include "stats.h"

long long array_sum(const int a[], int n) {
    long long s = 0;
    int len = (int)(sizeof a / sizeof a[0]);   /* 错：a 是指针，len 永远是 2 */
    for (int i = 0; i < len; i++) {
        s += a[i];
    }
    (void)n;
    return s;
}

int array_max(const int a[], int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

int count_above_average(const int a[], int n) {
    long long s = array_sum(a, n);
    int c = 0;
    for (int i = 0; i < n; i++) {
        if ((long long)a[i] * n > s) {
            c++;
        }
    }
    return c;
}
```

## 测试用例
### 01 sample 示例 1
```in
6
4 -2 7 7 -10 0
```
```out
6
7
3
```

### 02 sample 示例 2
```in
1
-5
```
```out
-5
-5
0
```

### 03 boundary 最小规模且元素为 0
```in
1
0
```
```out
0
0
0
```

### 04 degenerate 所有元素相同
```in
5
3 3 3 3 3
```
```out
15
3
0
```

### 05 trap 平均值为负且不是整数
```in
2
-3 -4
```
```out
-7
-3
1
```

### 06 trap 全是负数
```in
3
-5 -3 -9
```
```out
-17
-3
2
```
> 平均值是 -17/3 ≈ -5.67，-5 和 -3 都严格大于它，所以是 2 个。这里最容易错：平均值是负数时，凭"感觉"数很容易多数或少数。

### 07 normal 一般情况
```in
4
1 2 3 4
```
```out
10
4
2
```

### 08 trap 输入不合法（n = 0）
```in
0
```
```out
error
```

### 生成 boundary 最大规模与随机数据
```js gen
const cases = [];

/* 最大规模：1000 个 10 亿，和是 10^12，必须用 long long */
const v1 = new Array(1000).fill(1000000000);
cases.push({
  kind: 'boundary',
  category: '最大规模：1000 个 10 亿',
  input: '1000\n' + v1.join(' ') + '\n',
  output: '1000000000000\n1000000000\n0\n',
});

/* 一般规模：1000 个随机元素，期望输出在这里独立计算 */
const a = [];
for (let i = 0; i < 1000; i++) a.push(rng.int(-1000000000, 1000000000));
let sum = 0;
let max = a[0];
for (const x of a) {
  sum += x;
  if (x > max) max = x;
}
let cnt = 0;
for (const x of a) if (x * 1000 > sum) cnt++;   /* 与 C 里的 a[i]*n > sum 等价 */
cases.push({
  kind: 'normal',
  category: '随机 1000 个元素（和为负）',
  input: '1000\n' + a.join(' ') + '\n',
  output: `${sum}\n${max}\n${cnt}\n`,
});

/* 1000 个元素，前一半正、后一半负，检验负和的平均值比较 */
const b = [];
for (let i = 0; i < 500; i++) b.push(rng.int(1, 1000000000));
for (let i = 0; i < 500; i++) b.push(rng.int(-1000000000, -1));
let sum2 = 0;
let max2 = b[0];
for (const x of b) {
  sum2 += x;
  if (x > max2) max2 = x;
}
let cnt2 = 0;
for (const x of b) if (x * 1000 > sum2) cnt2++;
cases.push({
  kind: 'trap',
  category: '1000 个元素、和可能为负',
  input: '1000\n' + b.join(' ') + '\n',
  output: `${sum2}\n${max2}\n${cnt2}\n`,
});

return cases;
```
