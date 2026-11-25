---json
{
  "id": "p-s3-linkage-1",
  "title": "用 static 拆分订单统计模块：总额、最大单笔、最小单笔与退款笔数",
  "difficulty": "L2",
  "knowledgePoints": ["s3-linkage"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个校园卡后台要统计某天的 `n` 笔交易。正数表示消费扣款，负数表示退款，0 表示没有金额变动。需要输出四个统计量：

- `sum`：所有交易的金额总和；
- `max`：金额最大的一笔（如果全部是退款，它就是**最接近 0 的那个负数**）；
- `min`：金额最小的一笔（如果全部是消费，它就是最小的正数）；
- `refund`：退款笔数，即金额 **小于 0** 的笔数（0 不算退款）。

金额最大可以到 10 亿，一天最多 10 万笔，所以**总和会超过 `int` 的范围**。

这个模块以后会被别的 `.c` 文件复用，所以请按"一个统计量一个函数"来组织代码，并且把这四个辅助函数都写成 `static`——它们只服务于本文件，不需要暴露给整个工程：

```c
static long long sum_of(const int *a, int n);
static int max_of(const int *a, int n);
static int min_of(const int *a, int n);
static int refund_count(const int *a, int n);
```

`main` 只负责读入、调用这四个函数、打印结果。

不加 `static` 也能通过判题，但那样 `sum_of`、`max_of` 这些通用名字就会变成全工程可见的外部符号，迟早和别的模块撞名。**只在本文档内部使用的函数一律加 `static`**，这是本知识点最实用的一条习惯。

## 输入格式
第一行一个整数 `n`。
第二行 `n` 个整数，依次表示每一笔交易的金额，用空格分隔。

## 输出格式
输出四行：

```
sum=总和
max=最大单笔
min=最小单笔
refund=退款笔数
```

## 数据范围
1 ≤ n ≤ 100000
-1000000000 ≤ 每笔金额 ≤ 1000000000

`n` 笔金额的总和最大是 10⁵ × 10⁹ = 10¹⁴，最小是 -10¹⁴，`int` 装不下，必须用 `long long` 保存总和。

单笔金额本身在 `int` 范围内，所以 `max`、`min` 用 `int` 即可。

## 示例
### 示例 1
```in
5
3 -1 4 -2 7
```
```out
sum=11
max=7
min=-2
refund=2
```
> 3 + (-1) + 4 + (-2) + 7 = 11；最大单笔是 7，最小单笔是 -2；负数有 -1 和 -2，共 2 笔退款。

### 示例 2（边界：只有一笔退款）
```in
1
-1000000000
```
```out
sum=-1000000000
max=-1000000000
min=-1000000000
refund=1
```
> `n = 1` 时四个统计量都由这一笔决定。注意 `max` 是 -1000000000 而不是 0——如果把它初始化成 0，全部是退款时就会输出一个错误的 0。总和 -10⁹ 也在 `long long` 范围内。

## 提示
### 第 1 层
四个统计量里，只有"总和"会超过 `int`。先想清楚每个变量该用什么类型，再动手写。

### 第 2 层
把每个统计量写成一个 `static` 函数，参数都是"数组 + 长度"，返回一个值。`main` 里只做输入、调用、输出，这样每个函数都短到可以一眼看完。`static` 的用处是让这四个名字只在本文件可见，不会和别的模块撞名。

### 第 3 层
两个容易错的地方：

1. `max` 和 `min` 的初值应当取 `a[0]`，而不是 0 或 `INT_MAX`——数据可能全是负数，用 0 初始化会让 `max` 永远输出 0；
2. `refund` 的条件是 `a[i] < 0`，别写成 `<= 0`：金额 0 没有发生退款；
3. 累加用 `long long s = 0;`，写成 `int s` 会在 10 万笔 × 10 亿的数据上溢出。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAX_N 100000

static long long sum_of(const int *a, int n) {
    long long s = 0;                 /* 总和可能到 10^14，必须用 long long */
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

static int max_of(const int *a, int n) {
    int m = a[0];                    /* 用第一个元素做初值，全负数时也正确 */
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

static int min_of(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] < m) {
            m = a[i];
        }
    }
    return m;
}

static int refund_count(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] < 0) {              /* 小于 0 才是退款，0 不算 */
            c++;
        }
    }
    return c;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAX_N) {
        return 0;
    }

    int a[MAX_N];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    printf("sum=%lld\n", sum_of(a, n));
    printf("max=%d\n", max_of(a, n));
    printf("min=%d\n", min_of(a, n));
    printf("refund=%d\n", refund_count(a, n));
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAX_N 100000

static long long sum_of(const int *a, int n) {
    int s = 0;                       /* TODO: 总和会超过 int，改用 long long 累加 */
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

static int max_of(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

static int min_of(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] < m) {
            m = a[i];
        }
    }
    return m;
}

static int refund_count(const int *a, int n) {
    (void)a;
    (void)n;
    return 0;                        /* TODO: 统计金额小于 0 的笔数 */
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAX_N) {
        return 0;
    }

    int a[MAX_N];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    printf("sum=%lld\n", sum_of(a, n));
    printf("max=%d\n", max_of(a, n));
    printf("min=%d\n", min_of(a, n));
    printf("refund=%d\n", refund_count(a, n));
    return 0;
}
```

## 复杂度
时间 O(n)：四个辅助函数各扫一遍数组，`main` 里再加读入一遍，总操作数约 5n。
空间 O(n)：`int a[100000]` 约占 400KB（栈上）。想省内存可以边读边统计，但本题的 `max`、`min` 需要"看到所有数据"，保持一个数组最直观。

如果把四个函数都写成 `static`，编译器还能把它们内联进 `main`（`-O2` 下大概率如此），运行开销与写在一个函数里几乎没有区别。

## 常见错误
### 用 int 累加总和 [UB]
`int s = 0; s += a[i];` 在 10 万笔 × 10 亿的数据上会溢出。有符号整数溢出是**未定义行为**，本平台的 UBSan 会直接报 `signed integer overflow` 并判 `UB`；没有检测时你会看到一个负数或完全不相干的数。`max`/`min`/`refund` 都可以用 `int`，唯独总和必须 `long long`。

```c file=main.c expect=UB
#include <stdio.h>

#define MAX_N 100000

static long long sum_of(const int *a, int n) {
    int s = 0;                       /* 错：10 万笔 × 10 亿 = 10^14 */
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

static int max_of(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

static int min_of(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] < m) {
            m = a[i];
        }
    }
    return m;
}

static int refund_count(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] < 0) {
            c++;
        }
    }
    return c;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAX_N) {
        return 0;
    }
    int a[MAX_N];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }
    printf("sum=%lld\n", sum_of(a, n));
    printf("max=%d\n", max_of(a, n));
    printf("min=%d\n", min_of(a, n));
    printf("refund=%d\n", refund_count(a, n));
    return 0;
}
```

### 最大值初始化成 0 [WA]
`int m = 0;` 看起来"很安全"，但数据可以全是负数（全是退款）。这时正确的 `max` 是"最接近 0 的那个负数"，而程序会输出 0。用 `a[0]` 当初值，或者用 `INT_MIN` 都能避免。

```c file=main.c expect=WA
#include <stdio.h>

#define MAX_N 100000

static long long sum_of(const int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

static int max_of(const int *a, int n) {
    int m = 0;                       /* 错：全负数时最大值永远是 0 */
    for (int i = 0; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

static int min_of(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] < m) {
            m = a[i];
        }
    }
    return m;
}

static int refund_count(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] < 0) {
            c++;
        }
    }
    return c;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAX_N) {
        return 0;
    }
    int a[MAX_N];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }
    printf("sum=%lld\n", sum_of(a, n));
    printf("max=%d\n", max_of(a, n));
    printf("min=%d\n", min_of(a, n));
    printf("refund=%d\n", refund_count(a, n));
    return 0;
}
```

### 退款条件写成 <= 0 [WA]
金额 0 没有发生退款。写成 `a[i] <= 0` 会把金额为 0 的交易也算成退款，多出一笔。
```c file=main.c expect=WA
#include <stdio.h>

#define MAX_N 100000

static long long sum_of(const int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

static int max_of(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

static int min_of(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] < m) {
            m = a[i];
        }
    }
    return m;
}

static int refund_count(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] <= 0) {             /* 错：0 不是退款 */
            c++;
        }
    }
    return c;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAX_N) {
        return 0;
    }
    int a[MAX_N];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }
    printf("sum=%lld\n", sum_of(a, n));
    printf("max=%d\n", max_of(a, n));
    printf("min=%d\n", min_of(a, n));
    printf("refund=%d\n", refund_count(a, n));
    return 0;
}
```

### 打印 long long 用 %d [WA]
`printf("%d\n", sum_of(a, n))` 的类型和格式串不匹配。`long long` 是 8 字节，`%d` 只读 4 字节，输出的是被截断的值。小数据下可能碰巧正确（比如总和 11），数据一大就面目全非。`long long` 必须配 `%lld`，这也是把总和单独用 `long long` 保存之后容易忘的一步。

```c file=main.c expect=WA
#include <stdio.h>

#define MAX_N 100000

static long long sum_of(const int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

static int max_of(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;
}

static int min_of(const int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] < m) {
            m = a[i];
        }
    }
    return m;
}

static int refund_count(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] < 0) {
            c++;
        }
    }
    return c;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAX_N) {
        return 0;
    }
    int a[MAX_N];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }
    printf("sum=%d\n", sum_of(a, n));    /* 错：应为 %lld */
    printf("max=%d\n", max_of(a, n));
    printf("min=%d\n", min_of(a, n));
    printf("refund=%d\n", refund_count(a, n));
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
5
3 -1 4 -2 7
```
```out
sum=11
max=7
min=-2
refund=2
```

### 02 sample 示例 2
```in
1
-1000000000
```
```out
sum=-1000000000
max=-1000000000
min=-1000000000
refund=1
```

### 03 boundary 三笔十亿，总和超过 int
```in
3
1000000000 1000000000 1000000000
```
```out
sum=3000000000
max=1000000000
min=1000000000
refund=0
```

### 04 degenerate 只有一笔 0
```in
1
0
```
```out
sum=0
max=0
min=0
refund=0
```

### 05 trap 全部是退款，最大值应为最接近 0 的负数
```in
4
-5 -3 -8 -2
```
```out
sum=-18
max=-2
min=-8
refund=4
```

### 06 trap 最大值出现在第一笔
```in
5
9 1 2 3 4
```
```out
sum=19
max=9
min=1
refund=0
```

### 07 normal 正负混合
```in
6
-1 2 -3 4 -5 6
```
```out
sum=3
max=6
min=-5
refund=3
```

### 08 trap 金额 0 不能算退款
```in
5
-4 0 -3 -2 -1
```
```out
sum=-10
max=0
min=-4
refund=4
```

### 09 normal 一正一负一零，总和为 0
```in
3
1000000000 -1000000000 0
```
```out
sum=0
max=1000000000
min=-1000000000
refund=1
```

### 生成 boundary 最大规模与全退款数据
```js gen
const cases = [];

/* 最大规模：50000 笔 10 亿（输入约 550KB，仍在判题上限内） */
const n1 = 50000;
const v1 = new Array(n1).fill(1000000000);
cases.push({
  kind: 'boundary',
  category: '50000 笔 10 亿，总和 5×10^13',
  input: `${n1}\n${v1.join(' ')}\n`,
  output: `sum=${50000 * 1000000000}\nmax=1000000000\nmin=1000000000\nrefund=0\n`,
});

/* 全部是退款，且规模最大：总和 -5×10^13 */
const n2 = 50000;
const v2 = new Array(n2).fill(-1000000000);
cases.push({
  kind: 'trap',
  category: '50000 笔全退款，总和 -5×10^13',
  input: `${n2}\n${v2.join(' ')}\n`,
  output: `sum=${-50000 * 1000000000}\nmax=-1000000000\nmin=-1000000000\nrefund=${n2}\n`,
});

/* 压力：50000 个随机金额，期望值在 JS 里独立计算 */
const n3 = 50000;
const v3 = [];
let sum = 0;
let max = -Infinity;
let min = Infinity;
let refund = 0;
for (let i = 0; i < n3; i++) {
  const x = rng.int(-1000000000, 1000000000);
  v3.push(x);
  sum += x;
  if (x > max) max = x;
  if (x < min) min = x;
  if (x < 0) refund++;
}
cases.push({
  kind: 'stress',
  category: '50000 个随机金额',
  input: `${n3}\n${v3.join(' ')}\n`,
  output: `sum=${sum}\nmax=${max}\nmin=${min}\nrefund=${refund}\n`,
});

return cases;
```
