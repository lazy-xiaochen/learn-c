# 阶段 2 样题（三道不同难度，完整题目原文）

> 与 content/problems/s2/ 下的源文件内容一致，方便一次看完质量。

---

---json
{
  "id": "p-s2-array-basics-1",
  "title": "求一组整数的和、最大值与最小值",
  "difficulty": "L1",
  "knowledgePoints": ["s2-array-basics", "s1-loops"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入 n 个整数，把它们存进数组，然后再遍历这个数组，输出所有数的和、最大值和最小值。

请用数组保存这 n 个数再统计（这是本知识点要练习的写法），不要边读边算。

## 输入格式
第一行一个整数 n。
第二行 n 个整数，相邻两个之间用一个空格分隔。

## 输出格式
三行，每行一个整数：
1. 所有数的和；
2. 所有数中的最大值；
3. 所有数中的最小值。

## 数据范围
1 ≤ n ≤ 100，每个整数的绝对值不超过 10000。
所有数的和不超过 1000000，在 `int` 的表示范围内。

## 示例
### 示例 1
```in
5
3 1 4 1 5
```
```out
14
5
1
```
> 3 + 1 + 4 + 1 + 5 = 14，最大的是 5，最小的是 1。

### 示例 2（边界：只有一个数）
```in
1
-7
```
```out
-7
-7
-7
```
> 只有一个数时，它同时就是和、最大值和最小值。

## 提示
### 第 1 层
题目要求"先存再统计"，所以需要两遍处理：第一遍把数读进数组，第二遍统计。想一想：统计最大值时，初值应该取什么才不会被负数坑到？

### 第 2 层
用 `int a[100];` 保存（n 最多 100）。读入用 `for (int i = 0; i < n; i++)`。
求和用 `sum = 0`；最大值和最小值的初值都取 `a[0]`，然后从 `i = 1` 开始逐个比较——因为第一个数已经是"目前见过的最大/最小值"了。

### 第 3 层
三行输出的顺序是：和、最大值、最小值。注意当 n = 1 时，"从 i = 1 开始"的循环一次都不执行，此时 max、min 仍然是 a[0]，结果正好正确。读入时养成检查 `scanf` 返回值的习惯。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }

    int a[100];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int sum = 0;
    int max = a[0];
    int min = a[0];
    for (int i = 0; i < n; i++) {
        sum += a[i];
        if (a[i] > max) {
            max = a[i];
        }
        if (a[i] < min) {
            min = a[i];
        }
    }

    printf("%d\n%d\n%d\n", sum, max, min);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }

    int a[100];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    /* 在这里统计，并按"和、最大值、最小值"的顺序输出三行 */
    printf("0\n0\n0\n");
    return 0;
}
```

## 复杂度
时间 O(n)：读入一遍、统计一遍，共访问数组 2n 次。
空间 O(n)：额外开了 100 个 int 的数组（固定大小，与 n 无关，所以也可以说是 O(1)）。
如果不需要保留原始数据，边读边统计可以省掉这个数组——但本题的目的正是练习数组。

## 常见错误
### 最大值初始化为 0 [WA]
如果所有数都是负数（例如 -5 -3 -9），`max = 0` 会让最大值永远停在 0，而 0 根本不在数组里。初值必须取 `a[0]`。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }

    int a[100];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int sum = 0;
    int max = 0;
    int min = a[0];
    for (int i = 0; i < n; i++) {
        sum += a[i];
        if (a[i] > max) {
            max = a[i];
        }
        if (a[i] < min) {
            min = a[i];
        }
    }

    printf("%d\n%d\n%d\n", sum, max, min);
    return 0;
}
```

### 统计循环少算最后一个元素 [WA]
循环写成 `for (int i = 0; i < n - 1; i++)`，最后一个数就没有参加统计。n = 1 时循环一次都不执行，和会输出 0。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }

    int a[100];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int sum = 0;
    int max = a[0];
    int min = a[0];
    for (int i = 0; i < n - 1; i++) {     /* 少算了一个 */
        sum += a[i];
        if (a[i] > max) {
            max = a[i];
        }
        if (a[i] < min) {
            min = a[i];
        }
    }

    printf("%d\n%d\n%d\n", sum, max, min);
    return 0;
}
```

### 输出顺序写错 [WA]
题目要求"和、最大值、最小值"，如果按"最大值、和、最小值"输出，内容虽然都算对了，但位置不对，判题器会判答案错误。OJ 的比对是按行、按位置的。

## 测试用例
### 01 sample 示例 1
```in
5
3 1 4 1 5
```
```out
14
5
1
```

### 02 sample 示例 2
```in
1
-7
```
```out
-7
-7
-7
```

### 生成 boundary 最大规模
```js gen
const cases = [];

/* n = 100，全是 100：检验最大规模下的下标边界 */
let input1 = '100\n';
let sum1 = 0;
const v1 = [];
for (let i = 0; i < 100; i++) {
  v1.push(100);
  sum1 += 100;
}
input1 += v1.join(' ') + '\n';
cases.push({ kind: 'boundary', category: '最大规模：100 个 100', input: input1, output: `${sum1}\n100\n100\n` });

/* n = 100，1..100：和是 5050 */
let input2 = '100\n';
let sum2 = 0;
const v2 = [];
for (let i = 1; i <= 100; i++) {
  v2.push(i);
  sum2 += i;
}
input2 += v2.join(' ') + '\n';
cases.push({ kind: 'boundary', category: '最大规模：1 到 100', input: input2, output: `${sum2}\n100\n1\n` });

return cases;
```

### 05 degenerate 只有一个元素且为 0
```in
1
0
```
```out
0
0
0
```

### 06 trap 全部为负数
```in
4
-5 -3 -9 -1
```
```out
-18
-1
-9
```

### 07 trap 全部相同的值
```in
5
7 7 7 7 7
```
```out
35
7
7
```

### 08 degenerate 只有两个数
```in
2
-1 1
```
```out
0
1
-1
```

### 09 normal 正负各一半，和为 0
```in
6
10 -10 20 -20 30 -30
```
```out
0
30
-30
```

### 10 normal 含 0 的一般情况
```in
7
0 1 -1 2 -2 3 -3
```
```out
0
3
-3
```

---

---json
{
  "id": "p-s2-array-decay-1",
  "title": "按接口实现数组统计函数：求和、最大值与偶数个数",
  "difficulty": "L3",
  "knowledgePoints": ["s2-array-decay", "s2-array-param"],
  "special": "ds-implementation",
  "judge": { "mode": "function", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
本题只需要实现三个函数，不需要写 `main`。头文件 `arr_utils.h` 中声明了它们：

```c
int arr_sum(int *a, int n);          /* 返回数组前 n 个元素的和 */
int arr_max(int *a, int n);          /* 返回数组前 n 个元素的最大值 */
int arr_count_even(int *a, int n);   /* 返回数组前 n 个元素中偶数的个数 */
```

注意形参是 `int *a, int n`：数组传到函数里会**退化成指针**，函数内部拿不到长度，所以长度必须作为参数传进来。这正是本题要练习的地方。

判题时，一个隐藏的 `main` 会读入数组、调用你写的三个函数并输出结果。你只需要在 `arr_utils.c` 中写出这三个函数的定义。

## 输入格式
（由隐藏的 main 读取，供你理解测试方式）
第一行一个整数 n；第二行 n 个整数。

## 输出格式
（由隐藏的 main 输出）三行：和、最大值、偶数的个数。

## 数据范围
1 ≤ n ≤ 100；每个整数的绝对值不超过 10000。

## 示例
### 示例 1
```in
5
3 1 4 1 5
```
```out
14
5
1
```
> 和是 14，最大值 5，只有 4 是偶数，所以偶数个数是 1。

### 示例 2（边界：只有一个元素）
```in
1
-8
```
```out
-8
-8
1
```
> 只有一个数时它同时是第一个和最后一个元素，也是当前最大值；-8 是偶数。

## 提示
### 第 1 层
三个函数都只需要遍历一遍数组。`arr_utils.c` 开头要 `#include "arr_utils.h"`，函数签名必须与头文件完全一致。

### 第 2 层
求和：`sum = 0` 后逐个累加。求最大值：`m = a[0]`，再从下标 1 开始比较——**不能**把 `m` 初始化为 0，否则全是负数时会出错。统计偶数：`a[i] % 2 == 0`。

### 第 3 层
三个函数各写一个 `for (int i = 0; i < n; i++)`。注意循环上界是 `n` 而不是 `sizeof a / sizeof a[0]`——在函数里 `sizeof a` 只有 8 字节，是求不出元素个数的。

## 参考代码
```c file=arr_utils.c
#include "arr_utils.h"

int arr_sum(int *a, int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int arr_max(int *a, int n) {
    int m = a[0];                    /* 用第一个元素初始化，负数也正确 */
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

int arr_count_even(int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] % 2 == 0) {
            c++;
        }
    }
    return c;
}
```

## 初始代码
```c file=arr_utils.c
#include "arr_utils.h"

int arr_sum(int *a, int n) {
    (void)a;
    (void)n;
    return 0;
}

int arr_max(int *a, int n) {
    (void)a;
    (void)n;
    return 0;
}

int arr_count_even(int *a, int n) {
    (void)a;
    (void)n;
    return 0;
}
```

## 测试驱动
```c file=arr_utils.h
#ifndef ARR_UTILS_H
#define ARR_UTILS_H

int arr_sum(int *a, int n);
int arr_max(int *a, int n);
int arr_count_even(int *a, int n);

#endif
```

```c file=harness.c hidden
#include <stdio.h>
#include "arr_utils.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }

    int a[100];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int s = arr_sum(a, n);
    int m = arr_max(a, n);
    int c = arr_count_even(a, n);
    printf("%d\n%d\n%d\n", s, m, c);
    return 0;
}
```

## 复杂度
时间 O(n)：每个函数各扫一遍数组（调用方只调用一次）。
空间 O(1)：没有开辟额外数组。

## 常见错误
### 最大值用 0 初始化 [WA]
如果所有元素都是负数，`m` 会一直保持 0，而 0 根本不在数组里。必须用 `a[0]` 初始化。
```c file=arr_utils.c expect=WA
#include "arr_utils.h"

int arr_sum(int *a, int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int arr_max(int *a, int n) {
    int m = 0;                       /* 错：全为负数时结果错误 */
    for (int i = 0; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

int arr_count_even(int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] % 2 == 0) {
            c++;
        }
    }
    return c;
}
```

### 偶数判断写成 `a[i] % 2 == 1` [WA]
这个写法只对正奇数成立：负的奇数取余得到 -1，而偶数取余得到 0，两种情况都不等于 1，于是偶数一个也数不到。判断偶数要写 `a[i] % 2 == 0`。
```c file=arr_utils.c expect=WA
#include "arr_utils.h"

int arr_sum(int *a, int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int arr_max(int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

int arr_count_even(int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] % 2 == 1) {         /* 错：偶数判断反了 */
            c++;
        }
    }
    return c;
}
```

### 在函数里用 `sizeof a / sizeof a[0]` 求长度 [WA]
形参 `int *a` 是一个指针，`sizeof a` 只有 8 字节，`sizeof a[0]` 是 4，除出来永远是 2，跟实际元素个数无关。长度只能由调用者通过参数 `n` 传进来。

### 循环写成 `i <= n` [UB]
`i` 取到 `n` 时访问 `a[n]`，已经越过数组末尾，是越界读，属于未定义行为。循环条件必须是 `i < n`。

## 测试用例
### 01 sample 示例 1
```in
5
3 1 4 1 5
```
```out
14
5
1
```

### 02 sample 示例 2
```in
1
-8
```
```out
-8
-8
1
```

### 03 degenerate 唯一的元素是 0
```in
1
0
```
```out
0
0
1
```

### 04 trap 全是负数
```in
3
-5 -3 -9
```
```out
-17
-3
0
```

### 生成 boundary 最大规模
```js gen
const cases = [];

/* n = 100，全是 7 */
let input1 = '100\n';
const v1 = [];
for (let i = 0; i < 100; i++) v1.push(7);
input1 += v1.join(' ') + '\n';
cases.push({ kind: 'boundary', category: '最大规模：100 个 7', input: input1, output: '700\n7\n0\n' });

/* n = 100，1..100 */
let input2 = '100\n';
let sum2 = 0;
let even2 = 0;
const v2 = [];
for (let i = 1; i <= 100; i++) {
  v2.push(i);
  sum2 += i;
  if (i % 2 === 0) even2++;
}
input2 += v2.join(' ') + '\n';
cases.push({ kind: 'boundary', category: '最大规模：1 到 100', input: input2, output: `${sum2}\n100\n${even2}\n` });

return cases;
```

### 06 normal 正负成对
```in
6
10 -10 3 -3 8 -8
```
```out
0
10
4
```

### 07 trap 0 也是偶数
```in
4
0 1 2 3
```
```out
6
3
2
```

---

---json
{
  "id": "p-s2-callback-1",
  "title": "用 qsort 与可切换的比较规则排序整数",
  "difficulty": "L4",
  "knowledgePoints": ["s2-callback", "s2-function-pointer"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个报表工具需要按三种规则给同一批整数排序：

1. **升序**（从小到大）；
2. **降序**（从大到小）；
3. **按绝对值升序**；绝对值相同时，按数值升序（也就是 `-3` 排在 `3` 前面）。

要求你只用**一份排序代码**：调用标准库的 `qsort`，写三个比较函数，再用一个函数指针变量根据 `mode` 选择传哪一个。**不允许**写三份冒泡排序，也不允许在比较函数里用 `if (mode == ...)` 判断模式——比较函数应该只关心"这两个元素谁在前"。

注意：`qsort` 的比较函数必须返回负数 / 0 / 正数三种结果。请特别小心"用减法比较"在极端值上的溢出问题。

## 输入格式
第一行两个整数 `n mode`，用空格分隔。
第二行 `n` 个整数，用空格分隔。

`mode` 的含义：`1` 升序，`2` 降序，`3` 按绝对值升序（绝对值相同按数值升序）。

## 输出格式
一行，排序后的 `n` 个整数，相邻两个用一个空格分隔（行末不要多余空格）。

## 数据范围
1 ≤ n ≤ 1000
`mode` ∈ {1, 2, 3}
-2147483648 ≤ 每个元素 ≤ 2147483647

元素可能取到 `int` 的两个端点。用 `x - y` 比较它们在数学上可能超出 `int` 的范围——这是本题最重要的陷阱。

## 示例
### 示例 1
```in
5 1
5 -3 9 0 9
```
```out
-3 0 5 9 9
```
> 升序：`-3 0 5 9 9`，重复的 9 保持两个。

### 示例 2（边界：只有一个元素）
```in
1 2
-2147483648
```
```out
-2147483648
```
> 只有一个元素时任何排序规则都原样输出。注意这个值是最小的 `int`，对它取绝对值会溢出。

## 提示
### 第 1 层
排序算法（`qsort`）只负责"比较 + 交换"，"谁在前"完全由比较函数决定。所以三种规则应该是三个独立的比较函数，排序调用只有一句。

### 第 2 层
比较函数的签名固定为 `int cmp(const void *a, const void *b)`，参数是"指向元素的指针"，要先转成 `const int *` 再解引用。返回值只需符号正确：小于返回负数、相等返回 0、大于返回正数。降序就是把"小于"和"大于"的返回值对调。

### 第 3 层
用一个函数指针变量接收选中的比较函数（例如 `int (*cmp)(const void *, const void *) = NULL;` 再按 `mode` 赋值），然后统一调用 `qsort(a, (size_t)n, sizeof a[0], cmp)`。比较时不要写 `x - y`：改成 `(x > y) - (x < y)` 得到 −1/0/1，或者用 `if` 分别返回。按绝对值比较时先把元素转成 `long long` 再取绝对值，否则 `-INT_MIN` 会溢出。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>

typedef int (*Cmp)(const void *, const void *);

/* 升序：只比大小，绝不做减法（INT_MIN - INT_MAX 会溢出） */
static int cmp_asc(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (x > y) - (x < y);
}

/* 降序：把升序的结果取反即可 */
static int cmp_desc(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (x < y) - (x > y);
}

/* 按绝对值升序；绝对值相同则按数值升序 */
static int cmp_abs(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    /* 先转 long long：-INT_MIN 在 int 里会溢出 */
    long long ax = x < 0 ? -(long long)x : x;
    long long ay = y < 0 ? -(long long)y : y;
    if (ax != ay) {
        return ax < ay ? -1 : 1;
    }
    return (x > y) - (x < y);
}

int main(void) {
    int n, mode;
    if (scanf("%d %d", &n, &mode) != 2 || n < 1 || n > 1000) {
        return 0;
    }
    if (mode < 1 || mode > 3) {
        return 0;
    }

    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    /* 规则表：用 mode 选一个函数指针，排序代码只有一份 */
    static const Cmp CMPS[3] = {cmp_asc, cmp_desc, cmp_abs};
    Cmp cmp = CMPS[mode - 1];

    qsort(a, (size_t)n, sizeof a[0], cmp);

    for (int i = 0; i < n; i++) {
        printf("%d%c", a[i], i + 1 == n ? '\n' : ' ');
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>

/* TODO: 写三个比较函数（升序 / 降序 / 按绝对值升序），再用函数指针选择其中一个 */

int main(void) {
    int n, mode;
    if (scanf("%d %d", &n, &mode) != 2 || n < 1 || n > 1000) {
        return 0;
    }
    if (mode < 1 || mode > 3) {
        return 0;
    }

    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    /* 现在不管什么模式都按“读入顺序”输出，先让它能编译通过 */
    for (int i = 0; i < n; i++) {
        printf("%d%c", a[i], i + 1 == n ? '\n' : ' ');
    }
    return 0;
}
```

## 复杂度
时间 O(n log n)：`qsort` 的典型复杂度，每次比较是 O(1)。
空间 O(log n)：`qsort` 自身的递归栈（实现相关），数组本身额外占用 O(1)。

本题的重点不在排序算法，而在"把比较规则作为参数传给排序框架"这件事。

## 常见错误
### 比较函数写成 return a - b [UB]
`*(const int *)a - *(const int *)b` 最简洁，却会在两个元素相差很大时让 `int` 溢出（例如 `INT_MAX - INT_MIN`）。有符号整数溢出是未定义行为：开启 UBSan 时程序直接报错终止，不开启时可能排出完全错误的顺序。下面这段代码在普通数据上"看起来完全正常"，只有遇到两个端点时才暴露：
```c file=main.c expect=UB
#include <stdio.h>
#include <stdlib.h>

typedef int (*Cmp)(const void *, const void *);

static int cmp_asc(const void *a, const void *b) {
    return *(const int *)a - *(const int *)b;   /* 溢出：未定义行为 */
}

static int cmp_desc(const void *a, const void *b) {
    return *(const int *)b - *(const int *)a;   /* 同样会溢出 */
}

static int cmp_abs(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    long long ax = x < 0 ? -(long long)x : x;
    long long ay = y < 0 ? -(long long)y : y;
    if (ax != ay) {
        return ax < ay ? -1 : 1;
    }
    return (x > y) - (x < y);
}

int main(void) {
    int n, mode;
    if (scanf("%d %d", &n, &mode) != 2 || n < 1 || n > 1000) {
        return 0;
    }
    if (mode < 1 || mode > 3) {
        return 0;
    }

    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    static const Cmp CMPS[3] = {cmp_asc, cmp_desc, cmp_abs};
    qsort(a, (size_t)n, sizeof a[0], CMPS[mode - 1]);
    for (int i = 0; i < n; i++) {
        printf("%d%c", a[i], i + 1 == n ? '\n' : ' ');
    }
    return 0;
}
```

### 传给 qsort 的元素个数写成 sizeof a [RE]
`qsort(base, nmemb, size, cmp)` 的第二个参数是**元素个数**，第三个才是每个元素的字节数。写成 `sizeof a` 会让 `qsort` 以为数组有 4000 个元素，一路读到栈上数组之外，触发越界访问。
```c file=main.c expect=RE
#include <stdio.h>
#include <stdlib.h>

static int cmp_asc(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (x > y) - (x < y);
}

int main(void) {
    int n, mode;
    if (scanf("%d %d", &n, &mode) != 2 || n < 1 || n > 1000) {
        return 0;
    }
    if (mode < 1 || mode > 3) {
        return 0;
    }

    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    qsort(a, sizeof a, sizeof a[0], cmp_asc);   /* 错：第二个参数应该是 (size_t)n */
    for (int i = 0; i < n; i++) {
        printf("%d%c", a[i], i + 1 == n ? '\n' : ' ');
    }
    return 0;
}
```

### 比较函数只返回 0/1 [WA]
`return x > y;` 没有负数，`qsort` 会把所有"不相等但返回 0"的元素当成相等，排序结果依赖实现细节。必须让"小于"返回负数："降序"就把这个符号反过来。

### 用 int 计算绝对值 [UB]
`x < 0 ? -x : x` 在 `x == INT_MIN` 时会溢出（`INT_MIN` 的相反数无法用 `int` 表示）。先转 `long long` 再取绝对值，或者直接比较"转成 long long 后的数值"。

### 忘了模式 3 的次级比较 [WA]
绝对值相同时直接 `return 0` 会让 `-5` 和 `5` 的先后顺序不确定。题目要求"绝对值相同按数值升序"，所以绝对值相等时还要再比一次数值。

## 测试用例
### 01 sample 示例 1
```in
5 1
5 -3 9 0 9
```
```out
-3 0 5 9 9
```

### 02 sample 示例 2
```in
1 2
-2147483648
```
```out
-2147483648
```

### 03 boundary 降序、三个元素
```in
3 2
-1 0 1
```
```out
1 0 -1
```

### 04 degenerate 绝对值全部相同
```in
4 3
5 -5 5 -5
```
```out
-5 -5 5 5
```

### 05 trap 两个端点、升序
```in
2 1
2147483647 -2147483648
```
```out
-2147483648 2147483647
```

### 06 trap 按绝对值比较 INT_MIN
```in
3 3
-2147483648 1 -1
```
```out
-1 1 -2147483648
```

### 07 trap 降序时两端点相减会溢出
```in
4 2
0 -2147483648 2147483647 0
```
```out
2147483647 0 0 -2147483648
```

### 08 normal 绝对值相同再按数值升序
```in
6 3
-7 3 -3 7 0 0
```
```out
0 0 -3 3 -7 7
```

### 09 normal 普通降序
```in
5 2
2 1 5 3 4
```
```out
5 4 3 2 1
```
