---json
{
  "id": "p-s7-merge-sort-1",
  "title": "稳定排名与逆序对：用归并排序一次算出名单有多乱",
  "difficulty": "L4",
  "knowledgePoints": ["s7-merge-sort"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 2000, "compare": "lines" }
}
---

## 题目描述
教务处的成绩单是按"交卷顺序"录入的，同分的同学谁先谁后本来无所谓。但核对名单时发现：**只要两个同学分数相同，名单里的先后顺序必须保持录入顺序**——因为同分要按录入顺序分配考场，顺序一变考场就全乱了。

请你写一个**稳定**的排序（自己写归并排序，不许调用 `qsort`），并顺便回答两个问题：

1. 这份名单有多"乱"？用**逆序对**衡量：满足 `i < j` 且 `score[i] > score[j]` 的二元组个数（注意是**严格大于**，同分不算逆序）；
2. 稳定排序之后，第 `p` 名是谁？

稳定排序的意思是：**分数相同的两个记录，排序后仍然保持它们在输入里的先后顺序**。这不是"排完看起来有序"就能满足的——必须真的稳定。

只有归并排序能做到"最坏也是 `O(n log n)`"并且"天然稳定"，所以这道题要求你用归并。逆序对也可以在归并的合并过程里顺手数出来：当右半区的 `a[j]` 被取出来时，左半区剩下的 `mid - i` 个元素都比它大，一次性贡献 `mid - i` 个逆序对。

## 输入格式
第一行一个整数 `n`。
接下来 `n` 行，每行两个整数 `id score`：学号和分数，**这 `n` 行的先后顺序就是录入顺序**。`id` 是 `1..n` 的一个排列（乱序给出）。
接下来一行一个整数 `q`。
接下来 `q` 行，每行一个整数 `p`（1 ≤ p ≤ n）：查询稳定排序后第 `p` 名的学号。

## 输出格式
先输出 3 行：

```
inv=<逆序对个数>
median=<稳定排序后第 (n+1)/2 名的分数>
chk=<校验和：Σ (i+1) × 第 i+1 名的学号，i 从 0 开始>
```

然后 `q` 行，每行：

```
rank <p> <第 p 名的学号>
```

`chk` 看起来奇怪，但它对"同分记录的相对顺序"极其敏感：只要两个同分同学的位置互换了，`chk` 几乎一定变化。它同时也是判断"你的排序是否稳定"最省事的自检手段。

## 数据范围
1 ≤ n ≤ 60000
0 ≤ score ≤ 1000，**大量同分是常态**
`id` 是 `1..n` 的一个排列
1 ≤ q ≤ 1000

注意 `chk` 的最大值约为 `60000 × 60000 × 60000 / 2 ≈ 1.08×10¹⁴`，`int` 装不下，必须用 `long long`。逆序对最多 `n(n-1)/2 ≈ 1.8×10⁹`，也在 `int` 上限（约 2.1×10⁹）附近——统一用 `long long` 最省心。最大输入约 590KB，在平台 1MB 的上限之内。

## 示例
### 示例 1
```in
5
3 85
1 85
5 90
2 80
4 85
2
2
5
```
```out
inv=4
median=85
chk=52
rank 2 3
rank 5 5
```
> 录入顺序的分数是 `85 85 90 80 85`。稳定排序后是 `2:80 3:85 1:85 4:85 5:90`——注意三个 85 分保持了录入顺序 **3 → 1 → 4**。逆序对：`(85,80)` 两组、`(90,80)`、`(90,85)` 一组，共 4 个。`chk = 1×2 + 2×3 + 3×1 + 4×4 + 5×5 = 52`。

### 示例 2（边界：只有一个人）
```in
1
1 100
1
1
```
```out
inv=0
median=100
chk=1
rank 1 1
```
> 只有一个人时没有逆序对，中位名次就是第 1 名，`chk = 1×1 = 1`。**分数可以是 0**，也可以重复到全表同分（此时 `inv = 0`，但顺序仍然是录入顺序）。

## 提示
### 第 1 层
先把"稳定"这件事落到代码上：合并两个有序段时，比较的是 `a[i].score` 和 `a[j].score`，取哪一个的判据是 `a[i].score <= a[j].score` 取左边。**这个 `<=` 就是稳定性的全部**：相等时优先取左半区，左半区在输入里本来就更靠前。

### 第 2 层
逆序对在合并时顺手数：右半区的 `a[j]` 被取出时，左半区剩下的 `a[i..mid-1]` 全都比它大（否则不会轮到 `a[j]`），于是新增 `mid - i` 个逆序对。累加到一个 `long long` 里。左右半区内部的逆序对，在更深的递归里已经数完了，不要重复累加。

### 第 3 层
用左闭右开区间 `[lo, hi)` 写递归：`mid = lo + (hi - lo) / 2`，递归 `[lo, mid)` 和 `[mid, hi)`，然后合并到 `tmp[lo..hi)`，最后**把 `tmp` 拷回 `a`**（漏了这一步排序等于没做）。`chk` 用 `(long long)(i + 1) * a[i].id` 累加；查询第 `p` 名直接输出 `a[p-1].id`。最后自检：拿全表同分的输入跑一遍，`inv` 必须是 0，`rank p` 必须输出 `p`（因为稳定排序在全部同分时保持录入顺序，而录入顺序里第 `p` 行的学号不一定是 `p`，这里要按 `a[p-1].id` 输出）。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAXN 60000

typedef struct {
    int id;
    int score;
} Rec;

static Rec a[MAXN];
static Rec tmp[MAXN];
static long long inv;

/* 归并排序 [lo, hi)，同时统计逆序对 */
static void merge_sort(int lo, int hi) {
    if (hi - lo <= 1) {
        return;
    }
    int mid = lo + (hi - lo) / 2;
    merge_sort(lo, mid);
    merge_sort(mid, hi);

    int i = lo;
    int j = mid;
    int k = lo;
    while (i < mid && j < hi) {
        if (a[i].score <= a[j].score) {         /* <= ：同分取左边 → 稳定 */
            tmp[k++] = a[i++];
        } else {
            inv += mid - i;                     /* 左半区剩下的都比 a[j] 大 */
            tmp[k++] = a[j++];
        }
    }
    while (i < mid) {
        tmp[k++] = a[i++];
    }
    while (j < hi) {
        tmp[k++] = a[j++];
    }
    for (int t = lo; t < hi; t++) {
        a[t] = tmp[t];                          /* 必须拷回去 */
    }
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d %d", &a[i].id, &a[i].score) != 2) {
            return 0;
        }
        if (a[i].id < 1 || a[i].id > n) {
            return 0;
        }
    }

    inv = 0;
    merge_sort(0, n);

    printf("inv=%lld\n", inv);
    printf("median=%d\n", a[(n + 1) / 2 - 1].score);

    long long chk = 0;
    for (int i = 0; i < n; i++) {
        chk += (long long)(i + 1) * a[i].id;
    }
    printf("chk=%lld\n", chk);

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int p;
        if (scanf("%d", &p) != 1 || p < 1 || p > n) {
            return 0;
        }
        printf("rank %d %d\n", p, a[p - 1].id);
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAXN 60000

typedef struct {
    int id;
    int score;
} Rec;

static Rec a[MAXN];
static Rec tmp[MAXN];
static long long inv;

static void merge_sort(int lo, int hi) {
    (void)lo;
    (void)hi;
    /* TODO: 左闭右开 [lo, hi)。两半递归后合并到 tmp，再拷回 a。
       合并时 a[i].score <= a[j].score 取左边（稳定），
       并且 a[j] 被取出时 inv += mid - i */
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d %d", &a[i].id, &a[i].score) != 2) {
            return 0;
        }
        if (a[i].id < 1 || a[i].id > n) {
            return 0;
        }
    }

    inv = 0;
    merge_sort(0, n);

    printf("inv=%lld\n", inv);              /* TODO: 还没有统计，inv 一直是 0 */
    printf("median=%d\n", a[(n + 1) / 2 - 1].score);

    long long chk = 0;
    for (int i = 0; i < n; i++) {
        chk += (long long)(i + 1) * a[i].id;
    }
    printf("chk=%lld\n", chk);

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int p;
        if (scanf("%d", &p) != 1 || p < 1 || p > n) {
            return 0;
        }
        printf("rank %d %d\n", p, a[p - 1].id);
    }
    return 0;
}
```

## 复杂度
时间 `O(n log n)`：递归 `⌈log2 n⌉` 层，每层合并的总长度是 `n`；逆序对统计在同一趟合并里完成，没有额外开销。
空间 `O(n)`：一个与 `a` 等长的辅助数组 `tmp`（约 480KB），递归栈 `O(log n)`。

## 常见错误
### 用 `qsort` 排序，同分记录顺序被打乱 [WA]
`qsort` 不保证稳定。比较函数只写 `score` 的差值时，同分记录返回 0，谁前谁后完全由实现决定——排序结果"看起来有序"，但 `chk` 和 `rank` 全错。本题明确要求自己写归并排序；即使允许用库函数，也要先想清楚"稳定"这件事库函数不替你保证。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>

#define MAXN 60000

typedef struct {
    int id;
    int score;
} Rec;

static Rec a[MAXN];

/* 错：不稳定排序 + 只比较分数 */
static int cmp_score_only(const void *pa, const void *pb) {
    const Rec *x = pa;
    const Rec *y = pb;
    return (x->score > y->score) - (x->score < y->score);
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d %d", &a[i].id, &a[i].score) != 2) {
            return 0;
        }
        if (a[i].id < 1 || a[i].id > n) {
            return 0;
        }
    }

    qsort(a, (size_t)n, sizeof a[0], cmp_score_only);

    long long inv = 0;
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (a[i].score > a[j].score) {
                inv++;
            }
        }
    }

    printf("inv=%lld\n", inv);
    printf("median=%d\n", a[(n + 1) / 2 - 1].score);

    long long chk = 0;
    for (int i = 0; i < n; i++) {
        chk += (long long)(i + 1) * a[i].id;
    }
    printf("chk=%lld\n", chk);

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int p;
        if (scanf("%d", &p) != 1 || p < 1 || p > n) {
            return 0;
        }
        printf("rank %d %d\n", p, a[p - 1].id);
    }
    return 0;
}
```

### 合并时用 `<` 而不是 `<=`，把稳定排序写成了不稳定 [WA]
`a[i].score < a[j].score` 时相等会取右边，等于把右半区的同分记录插到了左半区前面。**排序结果仍然是有序的**，`median` 也不会错，只有同分记录之间的相对顺序变了——正好被 `chk` 抓住。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXN 60000

typedef struct {
    int id;
    int score;
} Rec;

static Rec a[MAXN];
static Rec tmp[MAXN];
static long long inv;

static void merge_sort(int lo, int hi) {
    if (hi - lo <= 1) {
        return;
    }
    int mid = lo + (hi - lo) / 2;
    merge_sort(lo, mid);
    merge_sort(mid, hi);

    int i = lo;
    int j = mid;
    int k = lo;
    while (i < mid && j < hi) {
        if (a[i].score < a[j].score) {          /* 错：同分时取了右边 */
            tmp[k++] = a[i++];
        } else {
            inv += mid - i;
            tmp[k++] = a[j++];
        }
    }
    while (i < mid) {
        tmp[k++] = a[i++];
    }
    while (j < hi) {
        tmp[k++] = a[j++];
    }
    for (int t = lo; t < hi; t++) {
        a[t] = tmp[t];
    }
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d %d", &a[i].id, &a[i].score) != 2) {
            return 0;
        }
        if (a[i].id < 1 || a[i].id > n) {
            return 0;
        }
    }

    inv = 0;
    merge_sort(0, n);

    printf("inv=%lld\n", inv);
    printf("median=%d\n", a[(n + 1) / 2 - 1].score);

    long long chk = 0;
    for (int i = 0; i < n; i++) {
        chk += (long long)(i + 1) * a[i].id;
    }
    printf("chk=%lld\n", chk);

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int p;
        if (scanf("%d", &p) != 1 || p < 1 || p > n) {
            return 0;
        }
        printf("rank %d %d\n", p, a[p - 1].id);
    }
    return 0;
}
```

### `chk` 用 `int` 累加，溢出成负数 [UB|WA]
`(i + 1) * a[i].id` 在 `i = 60000` 时是 `3.6×10⁹`，已经超过 `INT_MAX`（约 `2.1×10⁹`）。有符号溢出是未定义行为：本平台开启 UBSan 后会直接判 `UB` 并指出溢出的那一行；如果把 sanitizer 关掉，它通常表现为一个负数或乱七八糟的值，判 `WA`。**凡是"下标 × 数值再求和"的校验量，一律用 `long long`**，并且乘法前就转换：`(long long)(i + 1) * id`。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXN 60000

typedef struct {
    int id;
    int score;
} Rec;

static Rec a[MAXN];
static Rec tmp[MAXN];
static long long inv;

static void merge_sort(int lo, int hi) {
    if (hi - lo <= 1) {
        return;
    }
    int mid = lo + (hi - lo) / 2;
    merge_sort(lo, mid);
    merge_sort(mid, hi);

    int i = lo;
    int j = mid;
    int k = lo;
    while (i < mid && j < hi) {
        if (a[i].score <= a[j].score) {
            tmp[k++] = a[i++];
        } else {
            inv += mid - i;
            tmp[k++] = a[j++];
        }
    }
    while (i < mid) {
        tmp[k++] = a[i++];
    }
    while (j < hi) {
        tmp[k++] = a[j++];
    }
    for (int t = lo; t < hi; t++) {
        a[t] = tmp[t];
    }
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d %d", &a[i].id, &a[i].score) != 2) {
            return 0;
        }
        if (a[i].id < 1 || a[i].id > n) {
            return 0;
        }
    }

    inv = 0;
    merge_sort(0, n);

    printf("inv=%lld\n", inv);
    printf("median=%d\n", a[(n + 1) / 2 - 1].score);

    int chk = 0;                                /* 错：int 装不下 1.08×10¹⁴ */
    for (int i = 0; i < n; i++) {
        chk += (i + 1) * a[i].id;
    }
    printf("chk=%d\n", chk);

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int p;
        if (scanf("%d", &p) != 1 || p < 1 || p > n) {
            return 0;
        }
        printf("rank %d %d\n", p, a[p - 1].id);
    }
    return 0;
}
```

### 合并完忘了把 `tmp` 拷回 `a` [WA]
`tmp` 里排得好好的，函数返回后 `a` 一点没变。递归上层拿 `a` 继续合并时用的还是原始顺序，最终结果是"局部有序、整体乱"。修法只有一句：合并后立刻 `for (t = lo; t < hi; t++) a[t] = tmp[t];`。

### 闭区间和左闭右开混用，区间算重导致死循环 [TLE]
`merge_sort(lo, hi)` 如果参数按闭区间理解（`hi` 是最后一个元素的下标），递归应该是 `[lo, mid]` 和 `[mid+1, hi]`；按左闭右开理解则是 `[lo, mid)` 和 `[mid, hi)`。混着写会出现 `merge_sort(mid, hi)` 里 `mid == lo` 的情况（区间没缩小），递归无限进行。建议全程统一用**左闭右开**，`hi - lo` 就是长度、`hi == lo` 就是空区间。

## 测试用例
### 01 sample 示例 1
```in
5
3 85
1 85
5 90
2 80
4 85
2
2
5
```
```out
inv=4
median=85
chk=52
rank 2 3
rank 5 5
```

### 02 sample 示例 2
```in
1
1 100
1
1
```
```out
inv=0
median=100
chk=1
rank 1 1
```

### 生成 stress 全表同分、完全逆序与最大规模
```js gen
const cases = [];

/* 逆序对用同一套归并思路独立计算（不调用参考实现） */
function countInv(scores) {
  let inv = 0;
  const buf = new Array(scores.length);
  const rec = (lo, hi) => {
    if (hi - lo <= 1) return;
    const mid = (lo + hi) >> 1;
    rec(lo, mid);
    rec(mid, hi);
    let i = lo;
    let j = mid;
    let k = lo;
    while (i < mid && j < hi) {
      if (scores[i] <= scores[j]) buf[k++] = scores[i++];
      else {
        inv += mid - i;
        buf[k++] = scores[j++];
      }
    }
    while (i < mid) buf[k++] = scores[i++];
    while (j < hi) buf[k++] = scores[j++];
    for (let t = lo; t < hi; t++) scores[t] = buf[t];
  };
  rec(0, scores.length);
  return inv;
}

function render(recs, queries) {
  const n = recs.length;
  const order = recs
    .map((r, i) => ({ id: r.id, score: r.score, pos: i }))
    .sort((x, y) => (x.score - y.score) || (x.pos - y.pos));
  const inv = countInv(recs.map((r) => r.score));
  let chk = 0;
  order.forEach((r, i) => {
    chk += (i + 1) * r.id;
  });
  const lines = [
    `inv=${inv}`,
    `median=${order[Math.floor((n + 1) / 2) - 1].score}`,
    `chk=${chk}`,
  ];
  for (const p of queries) lines.push(`rank ${p} ${order[p - 1].id}`);
  return lines.join('\n') + '\n';
}

function io(recs, queries) {
  const body = recs.map((r) => `${r.id} ${r.score}`).join('\n');
  return {
    input: `${recs.length}\n${body}\n${queries.length}\n${queries.join('\n')}\n`,
    output: render(recs, queries),
  };
}

function shuffled(n) {
  const p = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = n - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  return p;
}

/* boundary：60000 人、分数 0..1000 随机（同分极多） */
{
  const n = 60000;
  const ids = shuffled(n);
  const recs = ids.map((id) => ({ id, score: rng.int(0, 1000) }));
  const queries = [];
  for (let i = 0; i < 1000; i++) queries.push(rng.int(1, n));
  cases.push({ kind: 'boundary', category: '60000 人、分数随机、同分极多', ...io(recs, queries) });
}

/* trap：全表同分，稳定排序必须原样保持录入顺序 */
{
  const n = 60000;
  const ids = shuffled(n);
  const recs = ids.map((id) => ({ id, score: 777 }));
  const queries = [];
  for (let i = 0; i < 20; i++) queries.push(rng.int(1, n));
  cases.push({ kind: 'trap', category: '60000 人全部 777 分，必须保持录入顺序', ...io(recs, queries) });
}

/* trap：分数严格递减 → 逆序对取到最大值 */
{
  const n = 20000;
  const recs = [];
  for (let i = 0; i < n; i++) recs.push({ id: i + 1, score: n - i });
  cases.push({
    kind: 'trap',
    category: '20000 人分数严格递减，逆序对 = n(n-1)/2',
    ...io(recs, [1, 2, 100, 19999, 20000]),
  });
}

/* degenerate：只有两个人、同分 */
{
  const recs = [{ id: 2, score: 50 }, { id: 1, score: 50 }];
  cases.push({ kind: 'degenerate', category: '两个人同分，稳定排序后仍是 2 在前', ...io(recs, [1, 2]) });
}

/* degenerate：两个人、逆序 */
{
  const recs = [{ id: 2, score: 90 }, { id: 1, score: 10 }];
  cases.push({ kind: 'degenerate', category: '两个人一高一低，逆序对为 1', ...io(recs, [1, 2]) });
}

/* trap：三个人同分，录入顺序与学号顺序相反 */
{
  const recs = [{ id: 3, score: 5 }, { id: 2, score: 5 }, { id: 1, score: 5 }];
  cases.push({ kind: 'trap', category: '三个人同分、录入顺序与学号相反', ...io(recs, [1, 2, 3]) });
}

/* normal：3000 人、分数 0..20 */
{
  const n = 3000;
  const ids = shuffled(n);
  const recs = ids.map((id) => ({ id, score: rng.int(0, 20) }));
  const queries = [];
  for (let i = 0; i < 50; i++) queries.push(rng.int(1, n));
  cases.push({ kind: 'normal', category: '3000 人、分数只有 0..20 共 21 种', ...io(recs, queries) });
}

return cases;
```
