---json
{
  "id": "p-s3-recursion-patterns-1",
  "title": "递归工具箱：爬楼梯、最大子段和与子集计数",
  "difficulty": "L4",
  "knowledgePoints": ["s3-recursion-patterns"],
  "special": "ds-implementation",
  "judge": { "mode": "function", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
本题不需要写 `main`，只需要在 `rec_lib.c` 里实现三个递归函数。头文件 `rec_lib.h` 已经声明好了：

```c
long long climb(int n);                      /* 爬楼梯：n 级台阶有多少种走法 */
long long max_subarray(const int *a, int n); /* 最大子段和（分治） */
int count_subset_sum(const int *a, int n, int target); /* 子集和计数（回溯） */
```

三个函数分别对应"递归的三种典型模式"：

1. **`climb`（记忆化）**：一次可以走 1 级或 2 级台阶，问走完 `n` 级共有多少种走法。递推式是 `climb(n) = climb(n-1) + climb(n-2)`，`climb(1) = 1`、`climb(2) = 2`。如果直接照抄这个式子写递归，`n = 45` 就要算三十多亿次——必须用记忆化（或者等价的递推）把重复子问题缓存起来。

2. **`max_subarray`（分治）**：求连续子段的最大和。分治的写法是：答案要么完全在左半、要么完全在右半、要么**跨过中点**。前两种递归求解，第三种在合并阶段"从中点向两边各扫一遍"算出来。注意子段不能为空，全是负数时答案就是最大的那个负数。

3. **`count_subset_sum`（回溯）**：从 `n` 个正整数里选出若干个（每个数最多选一次），问有多少种选法的和恰好等于 `target`。每个数都有"选"和"不选"两条分支，递归到底部判断和是否等于目标。所有数都是正数，所以"当前和已经超过 target"时可以剪枝。

判题时，一个隐藏的 `main` 会读入数据、依次调用这三个函数并输出三行结果；你只需要写出 `rec_lib.c`。

## 输入格式
（由隐藏的 main 读取，供你理解测试方式）

- 第 1 行：一个整数 `N`，表示爬楼梯的台阶数；
- 第 2 行：一个整数 `M`，接着 `M` 个整数 `a[0] … a[M-1]`；
- 第 3 行：两个整数 `K`、`T`，接着 `K` 个整数 `b[0] … b[K-1]`。

## 输出格式
（由隐藏的 main 输出）三行，依次是：

1. `climb(N)` 的值；
2. `max_subarray(a, M)` 的值；
3. `count_subset_sum(b, K, T)` 的值。

## 数据范围
- `1 ≤ N ≤ 90`：`climb(90) = 4660046610375530309`，在 `long long` 范围内；
- `1 ≤ M ≤ 2000`，`-10⁹ ≤ a[i] ≤ 10⁹`：子段和最大可达 `2×10¹²`，必须用 `long long` 保存；
- `1 ≤ K ≤ 20`，`1 ≤ b[i] ≤ 1000`，`1 ≤ T ≤ 20000`：方案数最多 `2²⁰ = 1048576`，`int` 装得下；
- 保证 `M ≥ 1`，子段不能为空。

## 示例
### 示例 1
```in
10
9 -2 1 -3 4 -1 2 1 -5 4
4 5 1 2 3 4
```
```out
89
6
2
```
> `climb(10) = 89`。`a` 的最大子段是 `4 -1 2 1`，和为 6。`b = {1,2,3,4}` 中和为 5 的子集有 `{1,4}` 和 `{2,3}` 两组。

### 示例 2（边界：每个部分都只有最小规模）
```in
1
1 -7
1 1 1
```
```out
1
-7
1
```
> `N = 1` 时只有"一次走 1 级"这一种走法。`M = 1` 且元素是 -7，子段只能是它自己，答案是 -7（**不是 0**）。`K = 1`、`T = 1`、唯一的数是 1，恰好选它，方案数为 1。

## 提示
### 第 1 层
三个函数对应三个模板：`climb` 是"递归 + 查表"，`max_subarray` 是"分两半 + 合并"，`count_subset_sum` 是"每个数选或不选"。先分别想清楚每个函数的**递推式**和**终止条件**，再动手写。

### 第 2 层
- `climb`：开一个长度 91 的 `long long` 数组当缓存。`climb` 的结果总是正数，所以可以额外开一个 `seen` 数组标记"算过没有"。递归深度只有 90 层，不用担心栈。
- `max_subarray`：`mid = l + (r - l) / 2`，递归求 `[l, mid]` 和 `[mid+1, r]`；再从 `mid` 往左累加、从 `mid+1` 往右累加，两者相加就是"跨中点"的答案；三者取最大。
- `count_subset_sum`：`count(i, sum)` 表示"从第 `i` 个数开始选，当前和为 `sum`"；`i == n` 时返回 `sum == target`；否则返回"不选 `a[i]`"与"选 `a[i]`"两条分支之和。

### 第 3 层
`climb` 的记忆化写法：

```c
static long long memo[91];
static int seen[91];

long long climb(int n) {
    if (n == 1) return 1;
    if (n == 2) return 2;
    if (seen[n]) return memo[n];      /* 算过就直接查表 */
    memo[n] = climb(n - 1) + climb(n - 2);
    seen[n] = 1;
    return memo[n];
}
```

`max_subarray` 的合并部分：

```c
long long sum = 0, best_left = a[mid];
for (int i = mid; i >= l; i--) { sum += a[i]; if (sum > best_left) best_left = sum; }
sum = 0;
long long best_right = a[mid + 1];
for (int i = mid + 1; i <= r; i++) { sum += a[i]; if (sum > best_right) best_right = sum; }
/* 跨中点的答案 = best_left + best_right，再和左右两半的答案比大小 */
```

`count_subset_sum` 的剪枝：`sum > target` 时直接返回 0（所有数都是正数，继续加只会更大）。注意是 `>` 而不是 `>=`——和恰好等于 `target` 时后面仍然可以"一个都不选"，这是一条合法方案。

## 参考代码
```c file=rec_lib.c
#include "rec_lib.h"

/* ---------- 模式一：记忆化 ---------- */
static long long memo[91];
static int seen[91];

long long climb(int n) {
    if (n == 1) {
        return 1;
    }
    if (n == 2) {
        return 2;
    }
    if (seen[n]) {
        return memo[n];                  /* 子问题算过了，直接查表 */
    }
    memo[n] = climb(n - 1) + climb(n - 2);
    seen[n] = 1;
    return memo[n];
}

/* ---------- 模式二：分治 ---------- */
static long long max_sub(const int *a, int l, int r) {
    if (l == r) {
        return a[l];                     /* 只有一个元素：它自己 */
    }
    int mid = l + (r - l) / 2;
    long long best_left = max_sub(a, l, mid);
    long long best_right = max_sub(a, mid + 1, r);
    long long best = best_left > best_right ? best_left : best_right;

    long long sum = 0;
    long long cross_left = a[mid];
    for (int i = mid; i >= l; i--) {     /* 从中点向左扫 */
        sum += a[i];
        if (sum > cross_left) {
            cross_left = sum;
        }
    }
    sum = 0;
    long long cross_right = a[mid + 1];
    for (int i = mid + 1; i <= r; i++) { /* 从中点向右扫 */
        sum += a[i];
        if (sum > cross_right) {
            cross_right = sum;
        }
    }
    if (cross_left + cross_right > best) {
        best = cross_left + cross_right;
    }
    return best;
}

long long max_subarray(const int *a, int n) {
    return max_sub(a, 0, n - 1);
}

/* ---------- 模式三：回溯 ---------- */
static int count_from(const int *a, int n, int i, int sum, int target) {
    if (sum > target) {
        return 0;                        /* 剪枝：都是正数，越加越大 */
    }
    if (i == n) {
        return sum == target ? 1 : 0;    /* 走到最后：看是否恰好凑出 target */
    }
    return count_from(a, n, i + 1, sum, target)
         + count_from(a, n, i + 1, sum + a[i], target);
}

int count_subset_sum(const int *a, int n, int target) {
    return count_from(a, n, 0, 0, target);
}
```

## 初始代码
```c file=rec_lib.c
#include "rec_lib.h"

long long climb(int n) {
    return n;                            /* TODO: 改成带记忆化的递归 */
}

long long max_subarray(const int *a, int n) {
    (void)a;
    return n;                            /* TODO: 分治求最大子段和 */
}

int count_subset_sum(const int *a, int n, int target) {
    (void)a;
    (void)n;
    (void)target;
    return 0;                            /* TODO: 回溯统计方案数 */
}
```

## 测试驱动
```c file=rec_lib.h
#ifndef REC_LIB_H
#define REC_LIB_H

long long climb(int n);
long long max_subarray(const int *a, int n);
int count_subset_sum(const int *a, int n, int target);

#endif
```

```c file=harness.c hidden
#include <stdio.h>
#include "rec_lib.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 90) {
        return 0;
    }

    int m;
    if (scanf("%d", &m) != 1 || m < 1 || m > 2000) {
        return 0;
    }
    int a[2000];
    for (int i = 0; i < m; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int k, target;
    if (scanf("%d %d", &k, &target) != 2 || k < 1 || k > 20 || target < 1 || target > 20000) {
        return 0;
    }
    int b[20];
    for (int i = 0; i < k; i++) {
        if (scanf("%d", &b[i]) != 1) {
            return 0;
        }
    }

    printf("%lld\n", climb(n));
    printf("%lld\n", max_subarray(a, m));
    printf("%d\n", count_subset_sum(b, k, target));
    return 0;
}
```

## 复杂度
- `climb`：记忆化后每个 `n` 只算一次，时间 O(N)，空间 O(N)（缓存数组），递归深度 O(N) ≤ 90；
- `max_subarray`：`T(m) = 2T(m/2) + O(m)`，时间 O(M log M)，空间 O(log M)（递归栈深度）；
- `count_subset_sum`：每个数两条分支，时间 O(2^K)（剪枝后通常远小于这个上界），空间 O(K)（递归栈深度）。

如果 `climb` 不做记忆化，复杂度是 O(2^N)：`N = 90` 时约 4.7×10¹⁸ 次调用，必然超时。

## 常见错误
### 最大子段和只比较左右两半，漏掉跨中点 [WA]
分治的答案有三种来源，漏掉第三种时，`[5, -1, 5]` 会输出 5（只取左半的 5），而正确答案是 9（整个数组）。
```c file=rec_lib.c expect=WA
#include "rec_lib.h"

long long climb(int n) {
    if (n == 1) {
        return 1;
    }
    if (n == 2) {
        return 2;
    }
    static long long memo[91];
    if (memo[n] != 0) {
        return memo[n];
    }
    memo[n] = climb(n - 1) + climb(n - 2);
    return memo[n];
}

static long long max_sub(const int *a, int l, int r) {
    if (l == r) {
        return a[l];
    }
    int mid = l + (r - l) / 2;
    long long best_left = max_sub(a, l, mid);
    long long best_right = max_sub(a, mid + 1, r);
    return best_left > best_right ? best_left : best_right;   /* 错：漏掉跨中点 */
}

long long max_subarray(const int *a, int n) {
    return max_sub(a, 0, n - 1);
}

int count_subset_sum(const int *a, int n, int target) {
    (void)a;
    (void)n;
    (void)target;
    return 0;
}
```

### 爬楼梯不做记忆化，样例能过、大数据超时 [TLE]
朴素递归的调用次数是指数级的：`N = 45` 时约 36 亿次，`N = 90` 时约 4.7×10¹⁸ 次。样例里的 `N = 10` 只需要 177 次，所以本地测试很容易漏掉这个问题。
```c file=rec_lib.c expect=TLE
#include "rec_lib.h"

long long climb(int n) {
    if (n == 1) {
        return 1;
    }
    if (n == 2) {
        return 2;
    }
    return climb(n - 1) + climb(n - 2);       /* 错：没有任何缓存 */
}

long long max_subarray(const int *a, int n) {
    long long best = a[0];
    for (int i = 0; i < n; i++) {
        long long s = 0;
        for (int j = i; j < n; j++) {
            s += a[j];
            if (s > best) {
                best = s;
            }
        }
    }
    return best;
}

static int count_from(const int *a, int n, int i, int sum, int target) {
    if (sum > target) {
        return 0;
    }
    if (i == n) {
        return sum == target ? 1 : 0;
    }
    return count_from(a, n, i + 1, sum, target)
         + count_from(a, n, i + 1, sum + a[i], target);
}

int count_subset_sum(const int *a, int n, int target) {
    return count_from(a, n, 0, 0, target);
}
```

### 子集计数的剪枝写成 sum >= target [WA]
所有数都是正数，当 `sum == target` 时，后面剩下的数全部"不选"仍然是一条合法方案。写成 `sum >= target` 就把这条方案剪掉了：`b = {1,2,3,4}`、`target = 5` 会输出 0，正确答案是 2。
```c file=rec_lib.c expect=WA
#include "rec_lib.h"

long long climb(int n) {
    if (n == 1) {
        return 1;
    }
    if (n == 2) {
        return 2;
    }
    static long long memo[91];
    if (memo[n] != 0) {
        return memo[n];
    }
    memo[n] = climb(n - 1) + climb(n - 2);
    return memo[n];
}

long long max_subarray(const int *a, int n) {
    long long best = a[0];
    for (int i = 0; i < n; i++) {
        long long s = 0;
        for (int j = i; j < n; j++) {
            s += a[j];
            if (s > best) {
                best = s;
            }
        }
    }
    return best;
}

static int count_from(const int *a, int n, int i, int sum, int target) {
    if (sum >= target) {                     /* 错：恰好命中 target 时也返回 0 */
        return 0;
    }
    if (i == n) {
        return 0;
    }
    return count_from(a, n, i + 1, sum, target)
         + count_from(a, n, i + 1, sum + a[i], target);
}

int count_subset_sum(const int *a, int n, int target) {
    return count_from(a, n, 0, 0, target);
}
```

### 爬楼梯的递推式错位 [WA]
`climb(1) = 1`、`climb(2) = 2`，之后的每一项是前两项之和。如果写成 `1, 1` 开头（那是最朴素的斐波那契），所有 `n ≥ 2` 的答案都会差一位：`climb(10)` 会输出 55 而不是 89。写完先用 `n = 1, 2, 3, 4` 手算核对：`1, 2, 3, 5`。

## 测试用例
### 01 sample 示例 1
```in
10
9 -2 1 -3 4 -1 2 1 -5 4
4 5 1 2 3 4
```
```out
89
6
2
```

### 02 sample 示例 2
```in
1
1 -7
1 1 1
```
```out
1
-7
1
```

### 03 boundary 90 级台阶、20 个 1000 恰好凑满目标
```in
90
5 -1000000000 -1000000000 -1000000000 -1000000000 -1000000000
20 20000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
```
```out
4660046610375530309
-1000000000
1
```

### 04 degenerate 唯一元素为 0、目标不可达
```in
2
1 0
1 2 1
```
```out
2
0
0
```

### 05 trap 全是负数，最大子段和是最大的那个负数
```in
3
4 -5 -3 -9 -1
1 100 50
```
```out
3
-1
0
```

### 06 trap 最大子段必须跨过中点
```in
4
3 5 -1 5
2 3 1 2
```
```out
5
9
1
```

### 07 normal 一般情况
```in
7
6 10 -10 3 -3 8 -8
3 3 1 1 1
```
```out
21
10
1
```

### 08 trap 子集里有重复值，方案按"选哪些位置"计数
```in
5
2 1 2
3 5 2 2 1
```
```out
8
3
1
```

### 09 trap 恰好在中途凑满 target，后面的数必须全部"不选"
```in
6
3 1 2 3
3 5 1 2 4
```
```out
13
6
1
```

### 10 boundary 爬楼梯 n = 45，朴素递归会超时
```in
45
1 1000000000
1 20000 1000
```
```out
1836311903
1000000000
0
```

### 生成 stress 最大规模随机数据
```js gen
const cases = [];

/* 最大规模：2000 个随机数，最大子段和用 Kadane 独立算（不调用参考代码） */
const N = 2000;
const arr = [];
for (let i = 0; i < N; i++) {
  arr.push(rng.int(-1000000000, 1000000000));
}
let best = arr[0];
let cur = arr[0];
for (let i = 1; i < N; i++) {
  cur = Math.max(arr[i], cur + arr[i]);
  if (cur > best) best = cur;
}

/* 20 个 1 里选 10 个，和为 10：C(20, 10) = 184756 */
function choose(n, r) {
  let v = 1;
  for (let i = 1; i <= r; i++) {
    v = (v * (n - r + i)) / i;
  }
  return Math.round(v);
}
const ways = choose(20, 10);

/* climb(90) = fib(91)，用 BigInt 精确算 */
function fibBig(n) {
  let a = 0n;
  let b = 1n;
  for (let i = 0; i < n; i++) {
    const t = a + b;
    a = b;
    b = t;
  }
  return a;
}

cases.push({
  kind: 'stress',
  category: '2000 个随机数 + 20 个 1 凑 10',
  input: `90\n${N} ${arr.join(' ')}\n20 10 ${new Array(20).fill(1).join(' ')}\n`,
  output: `${fibBig(91)}\n${best}\n${ways}\n`,
});
return cases;
```
