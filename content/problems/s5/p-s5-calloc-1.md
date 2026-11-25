---json
{
  "id": "p-s5-calloc-1",
  "title": "区间借用统计：用 calloc 建差分数组",
  "difficulty": "L3",
  "knowledgePoints": ["s5-calloc"],
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
图书馆有 `m` 个连续编号的座位（1 到 `m`）。一天里发生了 `n` 次借用，每次借用覆盖一段连续的座位 `[l, r]`。同一座位可以被多次借用，次数累加。

请你统计：

- `max`：被借用次数最多的座位，借用了多少次；
- `first`：次数最多的座位中，编号最小的那个；
- `covered`：至少被借用过一次的座位数。

### 为什么适合用 calloc
如果把每个座位当成一个计数器，最直接的做法是申请 `m` 个 `int`，全部初始化为 0，然后对每次借用从 `l` 到 `r` 逐个 `+1`。但这样每次借用可能扫过很长的区间，`n` 大时会很慢。

更快的做法是**差分数组** `diff`：

- 对区间 `[l, r]`，执行 `diff[l] += 1` 和 `diff[r + 1] -= 1`；
- 然后从 1 到 `m` 做前缀和：`cur += diff[i]`，`cur` 就是座位 `i` 的借用次数。

差分数组的全部元素一开始都必须是 0，否则前缀和会被污染；没有比 `calloc(m + 2, sizeof *diff)` 更省事的初始化方式了。注意要申请 `m + 2` 个元素，因为 `r = m` 时还要写 `diff[m + 1]`。

## 输入格式
第一行两个整数 `m`、`n`：座位数、借用次数。

接下来 `n` 行，每行两个整数 `l`、`r`，表示一次借用覆盖 `[l, r]`（闭区间）。`n = 0` 时没有这些行。

## 输出格式
输出三行：

```
max=<最大借用次数>
first=<最大次数中编号最小的座位；没有借用时为 0>
covered=<至少被借用一次的座位数>
```

## 数据范围
- 1 ≤ m ≤ 5000
- 0 ≤ n ≤ 100000
- 1 ≤ l ≤ r ≤ m
- 借用次数的最大值不超过 `n`，`int` 足够
- 输出只有三行，远小于 64KB

## 示例
### 示例 1
```in
5 3
1 3
2 4
4 5
```
```out
max=2
first=2
covered=5
```
> 各座位的借用次数是：1 号 1 次、2 号 2 次、3 号 2 次、4 号 2 次、5 号 1 次。最大次数是 2，最早达到的是 2 号座位，5 个座位都被借用过。用差分数组时，三次修改是 `diff[1]++`、`diff[4]--`、`diff[2]++`、`diff[5]--`、`diff[4]++`、`diff[6]--`；前缀和只在 1 到 5 上做。

### 示例 2（边界：只有一个座位、一次借用）
```in
1 1
1 1
```
```out
max=1
first=1
covered=1
```
> 差分数组要申请 `1 + 2 = 3` 个元素：`diff[1]++`、`diff[2]--`。前缀和只处理 1 号座位，`diff[2]` 的扣减不会越界。

## 提示
### 第 1 层
先别想差分。如果对每个区间都从 `l` 循环到 `r` 加一，结果是对的，但最坏要扫 `n × m` 次。差分数组把"区间加一"拆成两个单点修改，最后统一做一次前缀和。

### 第 2 层
区间是闭区间 `[l, r]`，所以"加一"在 `l` 开始、"减一"在 `r + 1` 结束。如果写成 `diff[r]--`，相当于把区间变成了 `[l, r - 1]`，恰好少算右端点。

### 第 3 层
`calloc` 的参数是"元素个数"和"每个元素的字节数"：`calloc((size_t)m + 2, sizeof *diff)`。它会把每个字节置 0，正好满足差分数组的初始要求。结束时别忘了 `free(diff)`；即使 `n = 0`，`max`、`first`、`covered` 也要输出 0。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>

#define MAXM 5000
#define MAXN 100000

int main(void) {
    int m, n;
    if (scanf("%d %d", &m, &n) != 2 || m < 1 || m > MAXM || n < 0 || n > MAXN) {
        return 0;
    }

    int *diff = calloc((size_t)m + 2, sizeof *diff);   /* m + 2 个 int，全部为 0 */
    if (diff == NULL) {
        return 1;
    }

    for (int i = 0; i < n; i++) {
        int l, r;
        if (scanf("%d %d", &l, &r) != 2 || l < 1 || r < l || r > m) {
            free(diff);
            diff = NULL;
            return 0;
        }
        diff[l]++;
        diff[r + 1]--;
    }

    int cur = 0;
    int best = 0;
    int first = 0;
    int covered = 0;

    for (int i = 1; i <= m; i++) {
        cur += diff[i];                 /* 前缀和：座位 i 的借用次数 */
        if (cur > best) {
            best = cur;
            first = i;
        }
        if (cur > 0) {
            covered++;
        }
    }

    printf("max=%d\n", best);
    printf("first=%d\n", first);
    printf("covered=%d\n", covered);

    free(diff);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>

#define MAXM 5000
#define MAXN 100000

int main(void) {
    int m, n;
    if (scanf("%d %d", &m, &n) != 2 || m < 1 || m > MAXM || n < 0 || n > MAXN) {
        return 0;
    }

    int *diff = calloc((size_t)m + 2, sizeof *diff);
    if (diff == NULL) {
        return 1;
    }

    for (int i = 0; i < n; i++) {
        int l, r;
        if (scanf("%d %d", &l, &r) != 2 || l < 1 || r < l || r > m) {
            free(diff);
            diff = NULL;
            return 0;
        }
        diff[l]++;
        diff[r]--;               /* TODO: 闭区间 [l, r] 应该在 r + 1 处减 */
    }

    int cur = 0;
    int best = 0;
    int first = 0;
    int covered = 0;

    for (int i = 1; i <= m; i++) {
        cur += diff[i];
        if (cur > best) {
            best = cur;
            first = i;
        }
        if (cur > 0) {
            covered++;
        }
    }

    printf("max=%d\n", best);
    printf("first=%d\n", first);
    printf("covered=%d\n", covered);

    free(diff);
    return 0;
}
```

## 复杂度
时间 O(m + n)：每次借用两次单点修改，最后扫一遍 `m` 个座位做前缀和。
空间 O(m)：差分数组 `m + 2` 个 `int`，最大约 20KB。

## 常见错误
### 在 r 而不是 r + 1 处减 [WA]
把 `diff[r + 1]--` 写成 `diff[r]--`，区间就少算了右端点：`[l, r]` 变成 `[l, r - 1]`。这个错误只在"借用区间有右端点"时暴露，`covered` 和 `max` 都可能偏小。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int m, n;
    if (scanf("%d %d", &m, &n) != 2) {
        return 0;
    }
    int *diff = calloc((size_t)m + 2, sizeof *diff);
    if (diff == NULL) {
        return 1;
    }
    for (int i = 0; i < n; i++) {
        int l, r;
        if (scanf("%d %d", &l, &r) != 2) {
            free(diff);
            diff = NULL;
            return 0;
        }
        diff[l]++;
        diff[r]--;                    /* 错：应为 diff[r + 1]-- */
    }
    int cur = 0, best = 0, first = 0, covered = 0;
    for (int i = 1; i <= m; i++) {
        cur += diff[i];
        if (cur > best) {
            best = cur;
            first = i;
        }
        if (cur > 0) {
            covered++;
        }
    }
    printf("max=%d\n", best);
    printf("first=%d\n", first);
    printf("covered=%d\n", covered);
    free(diff);
    return 0;
}
```

### 用 malloc 申请差分数组却忘了清零 [UB]
差分数组依赖"初始全 0"这个前提。`malloc` 返回的内存是未初始化的，直接执行 `diff[l]++` 会读到不确定值，属于未定义行为。用 `calloc` 一次性拿到清零的数组，或者用 `memset` 清零。

### 数组只申请 m 个元素 [RE]
当 `r = m` 时要写 `diff[m + 1]`，所以必须申请 `m + 2` 个元素（至少 `m + 1` 个下标）。只申请 `m` 个会在最后一次借用时越界写，可能崩溃，也可能悄悄改坏相邻的堆数据。

### 把 covered 写成 m [WA]
`covered` 统计的是"借用次数大于 0 的座位数"，不是座位总数。一次只借用 1 号座位时，其他 `m - 1` 个座位都没被借用，`covered` 应该是 1 而不是 `m`。

## 测试用例
### 01 sample 示例 1
```in
5 3
1 3
2 4
4 5
```
```out
max=2
first=2
covered=5
```

### 02 sample 示例 2
```in
1 1
1 1
```
```out
max=1
first=1
covered=1
```

### 03 degenerate 没有任何借用
```in
5 0
```
```out
max=0
first=0
covered=0
```
> `n = 0` 时差分数组仍然是全 0，前缀和全是 0；`max` 和 `first` 都保持初始值 0，`covered` 也是 0。

### 04 trap 只借用两个端点
```in
5000 2
1 1
5000 5000
```
```out
max=1
first=1
covered=2
```
> 两次借用都只覆盖一个座位，最大次数是 1，最早达到的是 1 号座位，`covered` 是 2。这个用例还会检查 `r = 5000 = m` 时写入 `diff[5001]` 不会越界。

### 05 trap 右端点等于 m 的多次重叠
```in
5 3
4 5
5 5
4 4
```
```out
max=2
first=4
covered=2
```
> 4 号座位被第 1、3 次借用覆盖，5 号被第 1、2 次覆盖，都是 2 次；编号最小的是 4。`r = 5` 时 `diff[6]--` 会被写入，但前缀和只做到 5，不会读到它。

### 06 normal 多个区间交叠
```in
6 4
2 4
1 2
3 5
2 6
```
```out
max=3
first=2
covered=6
```
> 各座位次数为 1、3、2、2、1、1：2 号被第 1、2、4 次覆盖，共 3 次；所有 6 个座位都至少被覆盖一次。

### 生成 boundary 5000 个座位、100000 次整段借用
```js gen
const cases = [];
const m = 5000;
const n = 100000;
const lines = [];
for (let i = 0; i < n; i++) {
  lines.push(`1 ${m}`);
}

cases.push({
  kind: 'boundary',
  category: '5000 个座位、100000 次整段借用',
  input: `${m} ${n}\n${lines.join('\n')}\n`,
  output: `max=${n}\nfirst=1\ncovered=${m}\n`,
});

return cases;
```
