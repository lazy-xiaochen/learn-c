---json
{
  "id": "p-s3-inline-1",
  "title": "把函数宏换成 static inline：最大值、最小值与总和",
  "difficulty": "L3",
  "knowledgePoints": ["s3-inline"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个"数据汇总"的小程序要读入 `n` 个整数，输出其中的最大值、最小值和总和。为了"省一次函数调用"，同事把两件小事写成了**函数宏**：

```c
#define MAX(a, b) ((a) > (b) ? (a) : (b))
#define MIN(a, b) ((a) < (b) ? (a) : (b))
```

然后又把"读下一个数"的调用直接塞进了宏里：`MAX(best, next_number())`。

现在这段程序**读不对数**：明明给了 `n` 个数，它却经常输出 `error`，或者算出来的结果和输入对不上。

请你把它改对，并体会两件事：

1. **宏是文本替换**，`next_number()` 在展开后会出现在表达式里的**每一个** `a` / `b` 位置——写了一次，实际可能被求值两次；
2. `static inline` 函数是真正有类型、有作用域的函数：参数**只求值一次**，也不会有括号和优先级的问题。

要求：输出对数据范围内的所有输入都正确。你可以自由选择写法，但如果把两个宏换成 `static inline` 函数，这类 bug 从根上就不会再出现。

## 输入格式
第一行一个整数 `n`。
第二行 `n` 个整数 `a1 a2 ... an`，用空格分隔。

## 输出格式
如果成功读入合法的 `n`（1 ≤ n ≤ 1000）和全部 `n` 个整数，输出三行：

```
max=最大值
min=最小值
sum=总和
```

否则（读入失败、`n` 超范围、某个数超范围、数字个数不够）输出一行 `error`。

## 数据范围
1 ≤ n ≤ 1000
-1000 ≤ 每个数 ≤ 1000

总和最小是 -10⁶，最大是 10⁶，`int` 足够。注意**所有数都可能是负数**：最大值不能用 0 作为初值，最小值也不能。

## 示例
### 示例 1
```in
5
3 -1 4 4 2
```
```out
max=4
min=-1
sum=12
```
> 3 + (-1) + 4 + 4 + 2 = 12。最大值 4 出现了两次，最小值是 -1。

### 示例 2（边界：只有一个数，而且是负数）
```in
1
-7
```
```out
max=-7
min=-7
sum=-7
```
> `n = 1` 时这个数既是最大值也是最小值。如果最大值从 0 开始找，这里会输出 `max=0`；如果代码里对"第一个数"做了特殊处理，这个用例正好能验证它。

## 提示
### 第 1 层
先数一数：程序实际从输入里读了多少个数？把 `MAX(best, next_number())` 按宏的规则手工展开一遍（把 `a` 换成 `best`、`b` 换成 `next_number()`，注意是**每一处**都替换），然后数一数 `next_number()` 出现了几次。

### 第 2 层
宏展开后，`next_number()` 在条件里出现一次、在"取这个值"的分支里又出现一次。也就是说每调用一次 `MAX`，就可能吃掉 **1 到 2 个**输入数字——输入很快被读空，`scanf` 失败，于是输出 `error`。修法有两种：先把数读进变量再比较（`int x = next_number(); best = MAX(best, x);`），或者干脆把宏换成 `static inline` 函数。

### 第 3 层
推荐写法：

```c
static inline int max_int(int a, int b) {
    return a > b ? a : b;
}
```

函数的参数只求值一次，`max_int(best, next_number())` 只读一个数。注意 `inline` 前面**必须带 `static`**：本平台用 `-O0` 编译，裸 `inline` 只提供"内联定义"、不生成外部实体，链接时会报 `undefined symbol: max_int`。另外，最大值/最小值要用**第一个数**初始化（`if (i == 0)` 分支），不要用 0。

## 参考代码
```c file=main.c
#include <stdio.h>

/* 小工具写成 static inline：参数只求值一次，也没有宏的优先级陷阱 */
static inline int max_int(int a, int b) {
    return a > b ? a : b;
}

static inline int min_int(int a, int b) {
    return a < b ? a : b;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        printf("error\n");
        return 0;
    }

    int best = 0;
    int worst = 0;
    int sum = 0;
    for (int i = 0; i < n; i++) {
        int x = 0;
        if (scanf("%d", &x) != 1 || x < -1000 || x > 1000) {
            printf("error\n");
            return 0;
        }
        if (i == 0) {
            best = x;                    /* 用第一个数初始化，全是负数也正确 */
            worst = x;
        } else {
            best = max_int(best, x);
            worst = min_int(worst, x);
        }
        sum += x;
    }

    printf("max=%d\nmin=%d\nsum=%d\n", best, worst, sum);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAX(a, b) ((a) > (b) ? (a) : (b))
#define MIN(a, b) ((a) < (b) ? (a) : (b))

static int g_read_error = 0;

/* 从输入里读下一个数；读不到时把 g_read_error 置 1 */
static int next_number(void) {
    int x = 0;
    if (scanf("%d", &x) != 1) {
        g_read_error = 1;
    }
    return x;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        printf("error\n");
        return 0;
    }

    int best = 0;
    int worst = 0;
    int sum = 0;
    for (int i = 0; i < n; i++) {
        if (i == 0) {
            best = next_number();
            worst = best;
            sum += best;
        } else {
            /* TODO: 输入明明够，这里却常常把数字读空。想想宏展开后 next_number() 出现了几次 */
            best = MAX(best, next_number());
            worst = MIN(worst, next_number());
            sum += next_number();
        }
        if (g_read_error) {
            printf("error\n");
            return 0;
        }
    }

    printf("max=%d\nmin=%d\nsum=%d\n", best, worst, sum);
    return 0;
}
```

## 复杂度
时间 O(n)：每个数读一次、比较常数次。
空间 O(1)：只需要几个变量。

本题的"算法"没有难度，难点在读代码：**宏展开是文本替换，不遵守函数的求值规则**。`next_number()` 作为宏的实参传递时，会被复制到宏体里出现的每一处；如果宏体里 `a` 或 `b` 出现了两次（`MAX` 里两个操作数各出现两次），实参就会被求值两次。`static inline` 函数没有这个问题——它像普通函数一样，实参先求值一次，再把值传给形参。

## 常见错误
### 继续用宏、只是把宏写得更长 [WA]
给宏加括号能解决优先级问题，但**解决不了重复求值**：只要实参带副作用（`next_number()`、`i++`、函数调用），参数出现在宏体里几次就会被求值几次。这个错误版本仍然把 `next_number()` 直接当实参传，于是每轮吃掉多个数字。
```c file=main.c expect=WA
#include <stdio.h>

#define MAX(a, b) (((a) > (b)) ? (a) : (b))
#define MIN(a, b) (((a) < (b)) ? (a) : (b))

static int g_read_error = 0;

static int next_number(void) {
    int x = 0;
    if (scanf("%d", &x) != 1) {
        g_read_error = 1;
    }
    return x;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        printf("error\n");
        return 0;
    }
    int best = 0;
    int worst = 0;
    int sum = 0;
    for (int i = 0; i < n; i++) {
        best = MAX(best, next_number());          /* 错：next_number() 被求值两次 */
        worst = MIN(worst, next_number());        /* 错：又多吃掉一两个数 */
        sum += next_number();
        if (g_read_error) {
            printf("error\n");
            return 0;
        }
    }
    printf("max=%d\nmin=%d\nsum=%d\n", best, worst, sum);
    return 0;
}
```

### 在 .c 文件里写裸 inline，链接时报 undefined symbol [CE]
把宏换成函数时，最容易顺手写成 `inline int max_int(...)`。本平台用 `-O0` 编译，裸 `inline` 只有"内联定义"、不生成外部实体，链接器找不到 `max_int`，报 `undefined symbol`。`inline` 前面必须加 `static`（或者去掉 `inline` 写成普通函数）。
```c file=main.c expect=CE
#include <stdio.h>

inline int max_int(int a, int b) {          /* 错：没有 static，-O0 下不生成实体 */
    return a > b ? a : b;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        printf("error\n");
        return 0;
    }
    int best = 0;
    for (int i = 0; i < n; i++) {
        int x = 0;
        if (scanf("%d", &x) != 1) {
            printf("error\n");
            return 0;
        }
        best = (i == 0) ? x : max_int(best, x);
    }
    printf("max=%d\nmin=%d\nsum=%d\n", best, best, best);
    return 0;
}
```

### 最大值、最小值从 0 开始找 [WA]
把 `best` 和 `worst` 都初始化为 0，然后对每个数做 `max` / `min`：输入全是负数时，`max` 会输出 0（0 根本不在输入里），`min` 也会把 0 算进去。必须用第一个数初始化，或者用 `INT_MIN` / `INT_MAX`（`<limits.h>`）。
```c file=main.c expect=WA
#include <stdio.h>

static inline int max_int(int a, int b) {
    return a > b ? a : b;
}

static inline int min_int(int a, int b) {
    return a < b ? a : b;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        printf("error\n");
        return 0;
    }
    int best = 0;                    /* 错：全是负数时答案是 0 */
    int worst = 0;                   /* 错：同理 */
    int sum = 0;
    for (int i = 0; i < n; i++) {
        int x = 0;
        if (scanf("%d", &x) != 1 || x < -1000 || x > 1000) {
            printf("error\n");
            return 0;
        }
        best = max_int(best, x);
        worst = min_int(worst, x);
        sum += x;
    }
    printf("max=%d\nmin=%d\nsum=%d\n", best, worst, sum);
    return 0;
}
```

### 把 `static inline` 函数里的参数当宏用，写成了多语句 [CE]
`static inline` 是函数，不是宏：它不能像宏那样"没有类型"地拼字符串，也不能在调用处展开成多条语句。写成 `#define SWAP(a, b) { int t = a; a = b; b = t; }` 再放进 `if ... else` 里，会因为分号和大括号多出一个空语句，导致 `else` 配错分支。需要交换时写一个真正的 `static inline void swap_int(int *a, int *b)`，用指针传参。

## 测试用例
### 01 sample 示例 1
```in
5
3 -1 4 4 2
```
```out
max=4
min=-1
sum=12
```

### 02 sample 示例 2
```in
1
-7
```
```out
max=-7
min=-7
sum=-7
```

### 03 boundary 全部相同
```in
4
5 5 5 5
```
```out
max=5
min=5
sum=20
```

### 04 boundary 最大值和最小值分别落在两端
```in
3
-1000 0 1000
```
```out
max=1000
min=-1000
sum=0
```

### 05 degenerate 只有一个 0
```in
1
0
```
```out
max=0
min=0
sum=0
```

### 06 trap 全是负数
```in
5
-3 -9 -1 -4 -2
```
```out
max=-1
min=-9
sum=-19
```
> 全是负数时，任何"从 0 开始找"的实现都会把最大值算成 0。这条用例专门抓这个错误。

### 07 trap 数字个数不够
```in
5
1 2
```
```out
error
```

### 08 trap 数值超出 -1000..1000 的范围
```in
1
1001
```
```out
error
```

### 09 normal 含重复值和 0
```in
8
7 -7 7 0 -7 0 3 -3
```
```out
max=7
min=-7
sum=0
```

### 生成 boundary 最大规模与随机数据
```js gen
const cases = [];

/* 期望值全部在 JS 里独立计算 */
function report(list) {
  let max = list[0];
  let min = list[0];
  let sum = 0;
  for (const x of list) {
    if (x > max) max = x;
    if (x < min) min = x;
    sum += x;
  }
  return `max=${max}\nmin=${min}\nsum=${sum}\n`;
}
const text = (list) => `${list.length}\n${list.join(' ')}\n`;

/* 最大规模：1000 个数，全部取最小值 -1000 */
const low = new Array(1000).fill(-1000);
cases.push({
  kind: 'boundary',
  category: '最大规模：1000 个数全是 -1000',
  input: text(low),
  output: report(low),
});

/* 最大规模：1000 个随机数，和可能为负 */
const rand = [];
for (let i = 0; i < 1000; i++) rand.push(rng.int(-1000, 1000));
cases.push({
  kind: 'normal',
  category: '1000 个随机数',
  input: text(rand),
  output: report(rand),
});

/* 前一半正、后一半负：最大值落在开头，最小值落在末尾 */
const spread = [];
for (let i = 0; i < 500; i++) spread.push(rng.int(1, 1000));
for (let i = 0; i < 500; i++) spread.push(rng.int(-1000, -1));
cases.push({
  kind: 'trap',
  category: '前 500 个正数、后 500 个负数',
  input: text(spread),
  output: report(spread),
});

return cases;
```
