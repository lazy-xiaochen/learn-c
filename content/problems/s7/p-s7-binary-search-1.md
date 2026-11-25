---json
{
  "id": "p-s7-binary-search-1",
  "title": "日志归档索引：时间戳定位与「第 S 条记录在第几天」",
  "difficulty": "L4",
  "knowledgePoints": ["s7-binary-search"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
日志系统有两张索引，运维同事提了两批查询。

**索引一：时间戳表。** 系统把每个归档文件的时间戳抄在一张表里，**按升序排列，可能有重复**（同一秒写了多个文件）。同事会给你一批时间戳，问每个时间戳在表里的**第一次出现位置、最后一次出现位置、出现了几次**（位置从 0 开始编号）。

**索引二：按天累计的序号。** 系统按"第 `d` 天写入 `d` 条日志"的规则归档，所以第 `1..d` 天累计写入

```text
T(d) = 1 + 2 + ... + d = d(d+1)/2
```

条。同事会给你一批"第 S 条日志"的编号，问它落在**第几天**、是**当天的第几条**（`S` 可以大到 `10¹⁸`，答案是"最小的 `d` 使 `T(d) ≥ S`"）。

两批查询都只能靠二分：`n` 最大 6 万、`S` 最大 `10¹⁸`，线性扫必然超时。**索引二的边界大到 `1.4×10⁹`，所以那里的 `mid` 必须用 `lo + (hi - lo) / 2`，否则 `lo + hi` 会溢出 `int`。**

## 输入格式
第一行一个整数 `n`：时间戳表的大小（可以是 0）。
接下来（`n ≥ 1` 时）一行 `n` 个整数，按**升序**给出（可以有重复）。
接下来一行一个整数 `q1`：时间戳查询个数。
接下来 `q1` 行，每行一个整数 `x`。
接下来一行一个整数 `q2`：日志序号查询个数。
接下来 `q2` 行，每行一个整数 `S`（1 ≤ S ≤ 10¹⁸，**可能超出 `int`**）。

## 输出格式
先输出 `q1` 行：

```
q <x> <第一次出现的位置> <最后一次出现的位置> <出现次数>
```

不存在时位置都输出 `-1`、次数输出 `0`：`q <x> -1 -1 0`。

再输出 `q2` 行：

```
s <S> <天数 d> <当天的第几条>
```

其中 `d` 是"最小的满足 `d(d+1)/2 ≥ S` 的正整数"，当天第几条等于 `S - (d-1)d/2`。

## 数据范围
0 ≤ n ≤ 60000
0 ≤ x ≤ 10⁹（表里的时间戳也在 `[0, 10⁹]` 内）
1 ≤ q1 ≤ 500
1 ≤ q2 ≤ 500
1 ≤ S ≤ 10¹⁸

`S` 最大时答案 `d` 约为 `1.414×10⁹`，**`lo + hi` 会超过 `INT_MAX = 2147483647`**。输入最大约 670KB，在平台 1MB 的上限之内。

## 示例
### 示例 1
```in
8
3 5 5 5 9 12 12 20
4
5
12
1
20
3
1
10
100
```
```out
q 5 1 3 3
q 12 5 6 2
q 1 -1 -1 0
q 20 7 7 1
s 1 1 1
s 10 4 4
s 100 14 9
```
> 表里 `5` 占了下标 1、2、3，所以第一次是 1、最后是 3、共 3 个；`1` 比所有时间戳都小，返回 `-1 -1 0`。第二个索引：`T(1)=1`、`T(3)=6 < 10 ≤ T(4)=10`，所以 10 落在第 4 天，且是当天的第 `10-6=4` 条；`T(13)=91 < 100 ≤ T(14)=105`，第 14 天的第 `100-91=9` 条。

### 示例 2（边界：空表）
```in
0
1
42
1
1
```
```out
q 42 -1 -1 0
s 1 1 1
```
> `n = 0` 时第二行输入根本不存在，`lower_bound` 和 `upper_bound` 都返回 0，于是 `lb == ub`、输出 `-1 -1 0`。空表是最容易被写崩的边界：一不小心就会去读 `a[0]` 或 `a[n-1]`。

## 提示
### 第 1 层
先把"第一次出现"和"最后一次出现"翻译成两个标准函数：`lower_bound(x)` = 第一个 `>= x` 的位置，`upper_bound(x)` = 第一个 `> x` 的位置。那么第一次出现就是 `lb`、最后一次就是 `ub - 1`、次数是 `ub - lb`；`lb == ub` 就表示不存在。

### 第 2 层
用**左闭右开**写法：`lo = 0, hi = n`，循环 `while (lo < hi)`，`mid = lo + (hi - lo) / 2`；`lower_bound` 在 `a[mid] < x` 时 `lo = mid + 1`，否则 `hi = mid`；`upper_bound` 只把条件改成 `a[mid] <= x`。`lo` 可能返回 `n`（全都比 `x` 小），所以判断存在性必须先比 `lb < n`，不能直接访问 `a[lb]`。

### 第 3 层
第二个索引是"二分答案"：`lo = 1`、`hi = 1500000000`（因为 `T(1.5×10⁹) = 1.125×10¹⁸ > 10¹⁸`），循环里算 `mid` 的三角数，`T(mid) >= S` 就 `hi = mid`（**`mid` 本身可能就是答案，不能 `mid - 1`**），否则 `lo = mid + 1`。所有变量都声明成 `long long`，`mid` 也用 `lo + (hi - lo) / 2`——这样连"会不会溢出"都不用想。最后当天第几条是 `S - (d-1)*d/2`。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAXN 60000

static int a[MAXN];

/* 第一个 >= x 的下标；若全部 < x 则返回 n */
static int lower_bound_of(int n, int x) {
    int lo = 0;
    int hi = n;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;       /* 先减后加：不会溢出 */
        if (a[mid] < x) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return lo;
}

/* 第一个 > x 的下标；若全部 <= x 则返回 n */
static int upper_bound_of(int n, int x) {
    int lo = 0;
    int hi = n;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] <= x) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return lo;
}

/* 最小的 d 使 d(d+1)/2 >= s，1 <= s <= 10^18 */
static long long min_day(long long s) {
    long long lo = 1;
    long long hi = 1500000000LL;            /* T(1.5e9) = 1.125e18 > 1e18 */
    while (lo < hi) {
        long long mid = lo + (hi - lo) / 2;
        if (mid * (mid + 1) / 2 >= s) {
            hi = mid;                       /* mid 可能就是答案，不能减一 */
        } else {
            lo = mid + 1;
        }
    }
    return lo;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > MAXN) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int q1;
    if (scanf("%d", &q1) != 1 || q1 < 1 || q1 > 500) {
        return 0;
    }
    for (int i = 0; i < q1; i++) {
        int x;
        if (scanf("%d", &x) != 1) {
            return 0;
        }
        int lb = lower_bound_of(n, x);
        int ub = upper_bound_of(n, x);
        if (lb >= ub) {
            printf("q %d -1 -1 0\n", x);
        } else {
            printf("q %d %d %d %d\n", x, lb, ub - 1, ub - lb);
        }
    }

    int q2;
    if (scanf("%d", &q2) != 1 || q2 < 1 || q2 > 500) {
        return 0;
    }
    for (int i = 0; i < q2; i++) {
        long long s;
        if (scanf("%lld", &s) != 1) {
            return 0;
        }
        long long d = min_day(s);
        long long before = (d - 1) * d / 2;
        printf("s %lld %lld %lld\n", s, d, s - before);
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAXN 60000

static int a[MAXN];

static int lower_bound_of(int n, int x) {
    (void)n;
    (void)x;
    /* TODO: 左闭右开 [0, n)，返回第一个 >= x 的下标（可能返回 n） */
    return 0;
}

static int upper_bound_of(int n, int x) {
    (void)n;
    (void)x;
    /* TODO: 同上，但条件是 a[mid] <= x */
    return 0;
}

static long long min_day(long long s) {
    (void)s;
    /* TODO: 在 [1, 1500000000] 上二分，找最小的 d 使 d(d+1)/2 >= s */
    return 1;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > MAXN) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int q1;
    if (scanf("%d", &q1) != 1 || q1 < 1 || q1 > 500) {
        return 0;
    }
    for (int i = 0; i < q1; i++) {
        int x;
        if (scanf("%d", &x) != 1) {
            return 0;
        }
        int lb = lower_bound_of(n, x);
        int ub = upper_bound_of(n, x);
        if (lb >= ub) {
            printf("q %d -1 -1 0\n", x);
        } else {
            printf("q %d %d %d %d\n", x, lb, ub - 1, ub - lb);
        }
    }

    int q2;
    if (scanf("%d", &q2) != 1 || q2 < 1 || q2 > 500) {
        return 0;
    }
    for (int i = 0; i < q2; i++) {
        long long s;
        if (scanf("%lld", &s) != 1) {
            return 0;
        }
        long long d = min_day(s);
        long long before = (d - 1) * d / 2;
        printf("s %lld %lld %lld\n", s, d, s - before);
    }
    return 0;
}
```

## 复杂度
`lower_bound` / `upper_bound`：`O(log n)` 一次，共 `q1` 次。
`min_day`：答案范围是 `[1, 1.5×10⁹]`，二分 `O(log 1.5×10⁹) ≈ 31` 次比较。
总计 `O((q1 + q2) log n)`，空间 `O(n)`（一个定长数组，约 240KB）。

## 常见错误
### `mid = (lo + hi) / 2`，在答案接近 1.4×10⁹ 时溢出 [UB|WA]
`int` 的 `lo + hi` 最大只能到 `2.1×10⁹`。第二个索引用 `int` 存 `lo/hi` 时，只要两个端点都超过 `1.07×10⁹`，`lo + hi` 就溢出。有符号溢出是未定义行为：本平台开启 UBSan 会直接判 `UB`；关掉 sanitizer 之后，`mid` 常常变成一个负数，接着 `T(mid)` 变成负数、判定方向反了，最终输出一个荒谬的天数（`WA`）。

```c file=main.c expect=UB|WA
#include <stdio.h>

#define MAXN 60000

static int a[MAXN];

static int lower_bound_of(int n, int x) {
    int lo = 0;
    int hi = n;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] < x) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return lo;
}

static int upper_bound_of(int n, int x) {
    int lo = 0;
    int hi = n;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] <= x) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return lo;
}

/* 错：边界和 mid 都用 int，(lo + hi) 在 1.4×10⁹ 附近溢出 */
static long long min_day(long long s) {
    int lo = 1;
    int hi = 1500000000;
    while (lo < hi) {
        int mid = (lo + hi) / 2;
        long long t = (long long)mid * (mid + 1) / 2;
        if (t >= s) {
            hi = mid;
        } else {
            lo = mid + 1;
        }
    }
    return lo;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > MAXN) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int q1;
    if (scanf("%d", &q1) != 1 || q1 < 1 || q1 > 500) {
        return 0;
    }
    for (int i = 0; i < q1; i++) {
        int x;
        if (scanf("%d", &x) != 1) {
            return 0;
        }
        int lb = lower_bound_of(n, x);
        int ub = upper_bound_of(n, x);
        if (lb >= ub) {
            printf("q %d -1 -1 0\n", x);
        } else {
            printf("q %d %d %d %d\n", x, lb, ub - 1, ub - lb);
        }
    }

    int q2;
    if (scanf("%d", &q2) != 1 || q2 < 1 || q2 > 500) {
        return 0;
    }
    for (int i = 0; i < q2; i++) {
        long long s;
        if (scanf("%lld", &s) != 1) {
            return 0;
        }
        long long d = min_day(s);
        long long before = (d - 1) * d / 2;
        printf("s %lld %lld %lld\n", s, d, s - before);
    }
    return 0;
}
```

### 二分答案时用 `hi = mid - 1`，把可能的答案排除了 [WA]
`T(mid) >= S` 说明 `mid` **可能就是答案**，所以上界只能收到 `mid`；写成 `hi = mid - 1` 会把 `mid` 排除掉，答案整体偏小（`S = 10` 时会算成 3 而不是 4）。这是"收缩边界不能排除可能答案"这条不变式被破坏的典型后果，而且**只在恰好等于三角数时出错**，随机数据很难测出来。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXN 60000

static int a[MAXN];

static int lower_bound_of(int n, int x) {
    int lo = 0;
    int hi = n;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] < x) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return lo;
}

static int upper_bound_of(int n, int x) {
    int lo = 0;
    int hi = n;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] <= x) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return lo;
}

static long long min_day(long long s) {
    long long lo = 1;
    long long hi = 1500000000LL;
    while (lo < hi) {
        long long mid = lo + (hi - lo) / 2;
        if (mid * (mid + 1) / 2 >= s) {
            hi = mid - 1;                   /* 错：把可能的答案 mid 排除了 */
        } else {
            lo = mid + 1;
        }
    }
    return lo;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > MAXN) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int q1;
    if (scanf("%d", &q1) != 1 || q1 < 1 || q1 > 500) {
        return 0;
    }
    for (int i = 0; i < q1; i++) {
        int x;
        if (scanf("%d", &x) != 1) {
            return 0;
        }
        int lb = lower_bound_of(n, x);
        int ub = upper_bound_of(n, x);
        if (lb >= ub) {
            printf("q %d -1 -1 0\n", x);
        } else {
            printf("q %d %d %d %d\n", x, lb, ub - 1, ub - lb);
        }
    }

    int q2;
    if (scanf("%d", &q2) != 1 || q2 < 1 || q2 > 500) {
        return 0;
    }
    for (int i = 0; i < q2; i++) {
        long long s;
        if (scanf("%lld", &s) != 1) {
            return 0;
        }
        long long d = min_day(s);
        long long before = (d - 1) * d / 2;
        printf("s %lld %lld %lld\n", s, d, s - before);
    }
    return 0;
}
```

### `lower_bound` 返回 `n` 之后直接访问 `a[lb]` [RE]
`lower_bound` 的返回值范围是 `[0, n]`，`n` 表示"全都比 `x` 小"。如果写 `if (a[lb] == x)`，在 `x` 大于表里所有时间戳的用例上就越界读（`RE`）。判断存在性必须写成 `if (lb < n && a[lb] == x)`——`&&` 的短路求值会保证右边不会被求值。

### 把 `S` 读进 `int` [UB|WA]
`S` 最大 `10¹⁸`，`int` 只能装到 `2.1×10⁹`。用 `%d` 读 `10¹⁸` 时 `scanf` 的行为是未定义的（实际常常把高位截掉），后面所有计算都基于一个错得离谱的数。凡是"题目说能到 `10¹⁸`"的量，一律用 `long long` + `%lld`。

### 空表时去读 `a[n-1]` 或 `a[0]` [RE]
`n = 0` 时数组里什么都没有。如果二分写成"先检查 `a[0] == x`"或者"先取 `a[n-1]` 比较"，就会越界读。左闭右开的写法（`lo = 0, hi = n`）天然安全：`lo < hi` 一开始就不成立，循环一次都不进。

## 测试用例
### 01 sample 示例 1
```in
8
3 5 5 5 9 12 12 20
4
5
12
1
20
3
1
10
100
```
```out
q 5 1 3 3
q 12 5 6 2
q 1 -1 -1 0
q 20 7 7 1
s 1 1 1
s 10 4 4
s 100 14 9
```

### 02 sample 示例 2
```in
0
1
42
1
1
```
```out
q 42 -1 -1 0
s 1 1 1
```

### 生成 stress 最大规模、全表同值与三角数边界
```js gen
const cases = [];

/* 三角数用 BigInt 算，保证 S = 10^18 也精确 */
function tri(d) {
  return (d * (d + 1n)) / 2n;
}

function minDay(s) {
  let lo = 1n;
  let hi = 1500000000n;
  while (lo < hi) {
    const mid = lo + (hi - lo) / 2n;
    if (tri(mid) >= s) hi = mid;
    else lo = mid + 1n;
  }
  return lo;
}

function lowerBound(a, x) {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (a[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBound(a, x) {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (a[mid] <= x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function render(a, xs, ss) {
  const lines = [];
  for (const x of xs) {
    const lb = lowerBound(a, x);
    const ub = upperBound(a, x);
    if (lb >= ub) lines.push(`q ${x} -1 -1 0`);
    else lines.push(`q ${x} ${lb} ${ub - 1} ${ub - lb}`);
  }
  for (const s of ss) {
    const d = minDay(s);
    lines.push(`s ${s.toString()} ${d.toString()} ${(s - tri(d - 1n)).toString()}`);
  }
  return lines.join('\n') + '\n';
}

function io(a, xs, ss) {
  const head = a.length ? `${a.length}\n${a.join(' ')}\n` : '0\n';
  const sBody = ss.map((s) => s.toString()).join('\n');
  return {
    input: `${head}${xs.length}\n${xs.join('\n')}\n${ss.length}\n${sBody}\n`,
    output: render(a, xs, ss),
  };
}

const TEN18 = 1000000000000000000n;

/* boundary：6 万个升序随机时间戳 + 500 个时间戳查询 + 500 个 S 查询 */
{
  const n = 60000;
  const a = [];
  let v = 0;
  for (let i = 0; i < n; i++) {
    v += rng.int(0, 16000);                 /* 单调不减，带重复；总和不超过 10^9 */
    a.push(v);
  }
  const xs = [];
  for (let i = 0; i < 480; i++) xs.push(a[rng.int(0, n - 1)]);
  xs.push(0, a[0], a[n - 1], a[n - 1] + 1, 1000000000);
  const ss = [];
  for (let i = 0; i < 494; i++) {
    const hiPart = BigInt(rng.int(1, 1000000000));
    const loPart = BigInt(rng.int(0, 999999999));
    ss.push(hiPart * 1000000000n + loPart);
  }
  ss.push(1n, 2n, 3n, TEN18, tri(1414213562n), tri(1414213562n) + 1n);
  cases.push({ kind: 'boundary', category: '6 万个升序时间戳 + 500 个 S 查询', ...io(a, xs, ss) });
}

/* degenerate：空表 */
{
  cases.push({
    kind: 'degenerate',
    category: '空表，所有时间戳查询都返回 -1',
    ...io([], [0, 1, 1000000000], [1n, 10n, TEN18]),
  });
}

/* degenerate：6 万个相同的时间戳 */
{
  const a = new Array(60000).fill(7);
  cases.push({
    kind: 'degenerate',
    category: '6 万个相同时间戳，lower/upper 相距 6 万',
    ...io(a, [6, 7, 8], [1n, 2n, TEN18]),
  });
}

/* trap：6 万个严格递增，查询都压在端点上 */
{
  const a = [];
  for (let i = 0; i < 60000; i++) a.push(i * 7);
  const xs = [0, 7, 13, 14, 59999 * 7, 59999 * 7 + 1, 1000000000];
  cases.push({ kind: 'trap', category: '严格递增表，查询压在端点与缝隙上', ...io(a, xs, [1n, 2n, 3n]) });
}

/* trap：S 恰好等于三角数，答案必须是"那一天的最后一条" */
{
  const a = [1, 1, 1, 2, 3, 3];
  const ss = [3n, 6n, 10n, 15n, 21n, 28n, 36n, 45n];
  cases.push({ kind: 'trap', category: 'S 恰好等于 T(2)..T(9)', ...io(a, [1, 2, 3, 4], ss) });
}

/* trap：S 比三角数大 1，答案必须进到下一天的第一条 */
{
  const a = [0];
  const ss = [4n, 7n, 11n, 16n, 22n, 29n];
  cases.push({ kind: 'trap', category: 'S = T(d)+1，落进下一天第一条', ...io(a, [0], ss) });
}

/* normal：3000 个时间戳、范围查询与常规 S */
{
  const a = [];
  let v = 0;
  for (let i = 0; i < 3000; i++) {
    v += rng.int(0, 100);
    a.push(v);
  }
  const xs = [];
  for (let i = 0; i < 20; i++) xs.push(rng.int(0, a[a.length - 1] + 10));
  const ss = [];
  for (let i = 0; i < 20; i++) ss.push(BigInt(rng.int(1, 1000000000)) * BigInt(rng.int(1, 1000)));
  cases.push({ kind: 'normal', category: '3000 个时间戳与常规 S', ...io(a, xs, ss) });
}

return cases;
```
