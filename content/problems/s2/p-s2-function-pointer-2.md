---json
{
  "id": "p-s2-function-pointer-2",
  "title": "按不同规则排序：把比较函数当参数传进去",
  "difficulty": "L3",
  "knowledgePoints": ["s2-function-pointer"],
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
同一个数组，按不同的规则排序：有时要从小到大，有时要从大到小，有时要按绝对值大小。如果每种规则都复制一份排序代码，改起来非常痛苦；**把"比较规则"做成函数，再把这个函数作为参数传给排序函数**，排序逻辑只用写一遍。

请实现一个带比较器的插入排序：

```c
void sort_ints(int *a, int n, int (*cmp)(int, int));
```

比较函数 `cmp(x, y)` 的约定是：

- `x` 应该排在 `y` 前面时返回**负数**；
- 两者相等时返回 **0**；
- `x` 应该排在 `y` 后面时返回**正数**。

排序函数只依赖这个返回值的**符号**，不关心具体是 -1 还是 -100。注意这不是"返回 true/false"——布尔值只有 0 和 1，永远无法表达"x 应该排在前面"。

三种排序模式：

| mode | 规则 |
|---|---|
| 1 | 按数值升序（从小到大） |
| 2 | 按数值降序（从大到小） |
| 3 | 按绝对值升序；绝对值相同时，按数值升序（`-5` 排在 `5` 前面） |

## 输入格式
第一行两个整数 `n` 和 `mode`，分别表示元素个数和排序模式。
第二行 `n` 个整数，表示待排序的数组。

## 输出格式
一行，排序后的 `n` 个整数。第一个数前面不加空格，相邻两个数之间用一个空格分隔，行末换行。

## 数据范围
- 1 ≤ n ≤ 1000
- 1 ≤ mode ≤ 3
- |a[i]| ≤ 2000000000

元素的绝对值最大是 `2 × 10^9`，仍在 `int` 的范围内；但两个元素的差最大可达 `4 × 10^9`，如果用减法写比较函数，结果会超出 `int` 的范围——这是本题要特别小心的地方。

## 示例
### 示例 1
```in
6 1
5 -2 9 0 -2 7
```
```out
-2 -2 0 5 7 9
```
> 升序排序。两个 -2 相等，保持它们在输入中的先后顺序（插入排序是稳定的）。

### 示例 2（边界：只有一个元素）
```in
1 2
-7
```
```out
-7
```
> 只有一个元素时，任何排序规则的结果都一样，排序函数不会调用比较函数。这种规模最容易暴露"循环写错、数组越界"的问题。

## 提示
### 第 1 层
先写一个通用的插入排序 `sort_ints(int *a, int n, int (*cmp)(int, int))`，把比较两个元素的那一步换成 `cmp(...)`。排序函数内部只需要知道"`cmp(a[j], key) > 0` 时要把 `key` 往前挪"。

### 第 2 层
三个比较函数分别写：升序 `(a > b) - (a < b)`；降序 `(a < b) - (a > b)`；绝对值版先算 `aa`、`bb`，不同时返回 `aa < bb ? -1 : 1`，相同时返回按数值升序的结果。全部用减法会溢出。

### 第 3 层
在 `main` 里声明一个函数指针 `int (*cmp)(int, int) = cmp_asc;`，根据 `mode` 改成 `cmp_desc` 或 `cmp_abs`，再传给 `sort_ints`。模式 3 的"绝对值相同按数值升序"必须在比较函数里显式写出来，否则排序会保留输入顺序，结果不确定。

## 参考代码
```c file=main.c
#include <stdio.h>

/* 升序：a 排在 b 前面时返回负数，相等返回 0 */
static int cmp_asc(int a, int b) {
    return (a > b) - (a < b);
}

static int cmp_desc(int a, int b) {
    return (a < b) - (a > b);
}

/* 按绝对值升序；绝对值相同时按数值升序（-5 排在 5 前面） */
static int cmp_abs(int a, int b) {
    int aa = a < 0 ? -a : a;         /* |a| ≤ 2×10^9，不会溢出 */
    int bb = b < 0 ? -b : b;
    if (aa != bb) {
        return aa < bb ? -1 : 1;
    }
    return (a > b) - (a < b);
}

/* 插入排序：用函数指针决定"谁应该排在前面" */
static void sort_ints(int *a, int n, int (*cmp)(int, int)) {
    for (int i = 1; i < n; i++) {
        int key = a[i];
        int j = i - 1;
        while (j >= 0 && cmp(a[j], key) > 0) {
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;
    }
}

int main(void) {
    int n, mode;
    if (scanf("%d %d", &n, &mode) != 2 || n < 1 || n > 1000 || mode < 1 || mode > 3) {
        return 0;
    }
    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int (*cmp)(int, int) = cmp_asc;   /* 默认升序 */
    if (mode == 2) {
        cmp = cmp_desc;
    } else if (mode == 3) {
        cmp = cmp_abs;
    }

    sort_ints(a, n, cmp);             /* 把"比较规则"作为参数传进去 */

    for (int i = 0; i < n; i++) {
        printf(i == 0 ? "%d" : " %d", a[i]);
    }
    printf("\n");
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n, mode;
    if (scanf("%d %d", &n, &mode) != 2 || n < 1 || n > 1000 || mode < 1 || mode > 3) {
        return 0;
    }
    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    /* TODO：写三个比较函数和一个带函数指针参数的 sort_ints，
     * 根据 mode 选择比较规则，输出排序后的数组。
     * 下面只是原样输出，还没有排序。 */
    for (int i = 0; i < n; i++) {
        printf(i == 0 ? "%d" : " %d", a[i]);
    }
    printf("\n");
    return 0;
}
```

## 复杂度
时间：插入排序最坏 O(n²)，n ≤ 1000 时约 10^6 次比较，完全够用；最好情况（已经有序）O(n)。
空间：O(1)，只用了几个临时变量。

## 常见错误
### 比较函数的方向写反 [WA]
升序比较器写成 `return b - a;` 会让整个数组变成降序。比较函数的符号决定"谁在前"：想让 `a` 排在 `b` 前面（即 `a` 更小），就必须返回负数。写完先拿两个数手算一遍符号。
```c file=main.c expect=WA
#include <stdio.h>

static int cmp_asc(int a, int b) {
    return b - a;                     /* 错：方向反了，变成降序 */
}

static int cmp_desc(int a, int b) {
    return (a < b) - (a > b);
}

static int cmp_abs(int a, int b) {
    int aa = a < 0 ? -a : a;
    int bb = b < 0 ? -b : b;
    if (aa != bb) {
        return aa < bb ? -1 : 1;
    }
    return (a > b) - (a < b);
}

static void sort_ints(int *a, int n, int (*cmp)(int, int)) {
    for (int i = 1; i < n; i++) {
        int key = a[i];
        int j = i - 1;
        while (j >= 0 && cmp(a[j], key) > 0) {
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;
    }
}

int main(void) {
    int n, mode;
    if (scanf("%d %d", &n, &mode) != 2 || n < 1 || n > 1000 || mode < 1 || mode > 3) {
        return 0;
    }
    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }
    int (*cmp)(int, int) = cmp_asc;
    if (mode == 2) {
        cmp = cmp_desc;
    } else if (mode == 3) {
        cmp = cmp_abs;
    }
    sort_ints(a, n, cmp);
    for (int i = 0; i < n; i++) {
        printf(i == 0 ? "%d" : " %d", a[i]);
    }
    printf("\n");
    return 0;
}
```

### 用 `a - b` 当比较函数 [UB]
`a - b` 看起来很简洁，但两个元素一个是 `2000000000`、另一个是 `-2000000000` 时，差是 `4 × 10^9`，超过 `int` 的上限 `2147483647`——有符号整数溢出是未定义行为。本平台的检查工具会直接报错；没有检查时你会得到一个符号都反了的差。比较大小的正确做法是用比较运算符（`>`、`<`）产生 -1/0/1。
```c file=main.c expect=UB
#include <stdio.h>

static int cmp_asc(int a, int b) {
    return a - b;                     /* 错：差值可能溢出 int */
}

static int cmp_desc(int a, int b) {
    return b - a;                     /* 错：同样会溢出 */
}

static int cmp_abs(int a, int b) {
    int aa = a < 0 ? -a : a;
    int bb = b < 0 ? -b : b;
    if (aa != bb) {
        return aa < bb ? -1 : 1;
    }
    return (a > b) - (a < b);
}

static void sort_ints(int *a, int n, int (*cmp)(int, int)) {
    for (int i = 1; i < n; i++) {
        int key = a[i];
        int j = i - 1;
        while (j >= 0 && cmp(a[j], key) > 0) {
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;
    }
}

int main(void) {
    int n, mode;
    if (scanf("%d %d", &n, &mode) != 2 || n < 1 || n > 1000 || mode < 1 || mode > 3) {
        return 0;
    }
    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }
    int (*cmp)(int, int) = cmp_asc;
    if (mode == 2) {
        cmp = cmp_desc;
    } else if (mode == 3) {
        cmp = cmp_abs;
    }
    sort_ints(a, n, cmp);
    for (int i = 0; i < n; i++) {
        printf(i == 0 ? "%d" : " %d", a[i]);
    }
    printf("\n");
    return 0;
}
```

### 绝对值相同时没有规定次序 [WA]
`cmp_abs` 只比较绝对值、相等时返回 0 时，排序会保持它们在输入中的顺序（插入排序是稳定的）。输入 `5 -5` 会输出 `5 -5`，而题目要求 `-5 5`。相等的情况必须显式补一个"按数值升序"的规则。
```c file=main.c expect=WA
#include <stdio.h>

static int cmp_asc(int a, int b) {
    return (a > b) - (a < b);
}

static int cmp_desc(int a, int b) {
    return (a < b) - (a > b);
}

static int cmp_abs(int a, int b) {
    int aa = a < 0 ? -a : a;
    int bb = b < 0 ? -b : b;
    return aa - bb;                   /* 错：相等时返回 0，顺序取决于输入 */
}

static void sort_ints(int *a, int n, int (*cmp)(int, int)) {
    for (int i = 1; i < n; i++) {
        int key = a[i];
        int j = i - 1;
        while (j >= 0 && cmp(a[j], key) > 0) {
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;
    }
}

int main(void) {
    int n, mode;
    if (scanf("%d %d", &n, &mode) != 2 || n < 1 || n > 1000 || mode < 1 || mode > 3) {
        return 0;
    }
    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }
    int (*cmp)(int, int) = cmp_asc;
    if (mode == 2) {
        cmp = cmp_desc;
    } else if (mode == 3) {
        cmp = cmp_abs;
    }
    sort_ints(a, n, cmp);
    for (int i = 0; i < n; i++) {
        printf(i == 0 ? "%d" : " %d", a[i]);
    }
    printf("\n");
    return 0;
}
```

### 模式分派时函数接错了 [WA]
`mode == 2` 和 `mode == 3` 各对应一个比较函数，接错时排序结果整体错位，而且小规模数据下可能"看起来差不多"。写完用三个模式各跑一次最简单的例子（比如 `3 -1`），确认结果方向正确。
```c file=main.c expect=WA
#include <stdio.h>

static int cmp_asc(int a, int b) {
    return (a > b) - (a < b);
}

static int cmp_desc(int a, int b) {
    return (a < b) - (a > b);
}

static int cmp_abs(int a, int b) {
    int aa = a < 0 ? -a : a;
    int bb = b < 0 ? -b : b;
    if (aa != bb) {
        return aa < bb ? -1 : 1;
    }
    return (a > b) - (a < b);
}

static void sort_ints(int *a, int n, int (*cmp)(int, int)) {
    for (int i = 1; i < n; i++) {
        int key = a[i];
        int j = i - 1;
        while (j >= 0 && cmp(a[j], key) > 0) {
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;
    }
}

int main(void) {
    int n, mode;
    if (scanf("%d %d", &n, &mode) != 2 || n < 1 || n > 1000 || mode < 1 || mode > 3) {
        return 0;
    }
    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }
    int (*cmp)(int, int) = cmp_asc;
    if (mode == 2) {
        cmp = cmp_abs;                /* 错：2 应该用 cmp_desc */
    } else if (mode == 3) {
        cmp = cmp_desc;               /* 错：3 应该用 cmp_abs */
    }
    sort_ints(a, n, cmp);
    for (int i = 0; i < n; i++) {
        printf(i == 0 ? "%d" : " %d", a[i]);
    }
    printf("\n");
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
6 1
5 -2 9 0 -2 7
```
```out
-2 -2 0 5 7 9
```

### 02 sample 示例 2
```in
1 2
-7
```
```out
-7
```

### 03 degenerate 两个相等的元素
```in
2 1
0 0
```
```out
0 0
```

### 04 boundary 所有元素都相同
```in
5 2
4 4 4 4 4
```
```out
4 4 4 4 4
```

### 05 trap 降序排序，正负数混在一起
```in
5 2
10 -3 7 0 -8
```
```out
10 7 0 -3 -8
```

### 06 boundary 取到数据范围的上下限
```in
4 1
2000000000 -2000000000 0 1000000000
```
```out
-2000000000 0 1000000000 2000000000
```

### 07 trap 绝对值相同的元素要按数值升序
```in
6 3
5 -5 3 -3 0 1
```
```out
0 1 -3 3 -5 5
```

### 生成 stress 最大规模：1000 个相同的 2×10^9
```js gen
const n = 1000;
const values = new Array(n).fill(2000000000);
const input = `${n} 3\n${values.join(' ')}\n`;
const output = `${values.join(' ')}\n`;
return [{ kind: 'stress', category: '最大规模：1000 个相同元素', input, output }];
```
