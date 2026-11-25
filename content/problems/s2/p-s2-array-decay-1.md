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
