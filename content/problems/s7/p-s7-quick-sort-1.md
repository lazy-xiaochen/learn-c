---json
{
  "id": "p-s7-quick-sort-1",
  "title": "成绩排行榜：按总分降序、同分按学号升序，并回答「我排第几」",
  "difficulty": "L4",
  "knowledgePoints": ["s7-quick-sort"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 2000, "compare": "lines" }
}
---

## 题目描述
期末考试出分了。教务系统要给出一张排行榜：**总分高的排前面；总分相同的，学号小的排前面**（同分时按学号是为了"谁先注册谁靠前"，规则简单、没有争议）。

学生数据是按"交卷顺序"录入的，所以输入里的学号是**乱序**的，不是从 1 开始递增。你需要：

1. 按上面的规则排序（**必须自己写快排**，不许调用 `qsort`）；
2. 输出前 10 名的 `学号:总分`（不足 10 人就有几个输出几个）；
3. 输出"中位名次"的总分：名次按 `(n+1)/2` 计算（`n = 5` 时是第 3 名，`n = 4` 时是第 2 名）；
4. 输出最后一名的 `学号:总分`；
5. 回答 `q` 个"我排第几"的查询，给出学号，输出名次（从 1 开始）。

注意两个容易翻车的点：

- **同分必须按学号**。如果你的比较函数只比较总分，那些同分的同学谁在前就取决于排序算法的内部行为——快排是不稳定的，结果会和规则不符。这是一个"排序结果看起来没错、名次却不对"的经典陷阱。
- **名次查询不能每次线性扫一遍**。`n = 6 万、q = 1000` 时每次查询线性扫一遍是 `6×10⁷` 次比较，在 `-O0` 下很容易顶到时间上限。学号恰好是 `1..n` 的排列，所以排完序之后可以建一张"学号 → 名次"的反查表，`O(n)` 建表、`O(1)` 查询。

## 输入格式
第一行一个整数 `n`：学生人数。
接下来 `n` 行，每行两个整数 `id score`：学号和总分。`id` 是 `1..n` 的一个排列（乱序给出），`score` 是总分。
接下来一行一个整数 `q`：查询个数。
接下来 `q` 行，每行一个整数 `id`：要查名次的学号。

## 输出格式
先输出 3 行：

```
top=<前 10 名的 "学号:总分"，空格分隔；不足 10 人时全输出>
median=<第 (n+1)/2 名的总分>
last=<最后一名的 "学号:总分">
```

然后 `q` 行，每行：

```
pos <id> <名次，从 1 开始>
```

## 数据范围
1 ≤ n ≤ 60000
1 ≤ id ≤ n，且 `id` 是 `1..n` 的一个排列
0 ≤ score ≤ 1000
1 ≤ q ≤ 1000

总分只有 1001 种取值，而人数最多 6 万，所以**大量同分是常态**。隐藏用例里还有"所有人同分"和"输入已经按总分升序"这两种会让朴素快排退化的形状。最大输入约 590KB，在平台 1MB 的上限之内。

## 示例
### 示例 1
```in
5
3 90
1 85
2 85
5 70
4 60
4
1
3
4
2
```
```out
top=3:90 1:85 2:85 5:70 4:60
median=85
last=4:60
pos 1 2
pos 3 1
pos 4 5
pos 2 3
```
> 排序规则是"分数降序、同分学号升序"，所以 `1:85` 排在 `2:85` 前面。第 `(5+1)/2 = 3` 名的分数是 85。学号 1 的名次是 2，学号 4 的名次是 5。

### 示例 2（边界：只有一个人）
```in
1
1 0
1
1
```
```out
top=1:0
median=0
last=1:0
pos 1 1
```
> 只有一个人时，前 10 名只有一条，中位名次就是第 1 名，最后一名也是他。**总分可以是 0**，不要用 0 当"没有数据"的哨兵。

## 提示
### 第 1 层
先写比较函数：`分数不同比分数（大的在前）；分数相同比学号（小的在前）`。这个"全序"必须严格——任何两个不同的记录都要能分出先后，否则排序结果不确定。排序方向别写反：`score` 是**降序**。

### 第 2 层
快排的划分可以用 Lomuto（枢轴取最后一个）或 Hoare（枢轴取最左边、双指针）。**不管选哪种，都必须处理"枢轴每次都挑到最差"的情况**——本题有"6 万条同分"和"输入已按总分升序"这两种用例，枢轴取最后一个元素会让比较次数变成 `n(n-1)/2`，直接超时。用三数取中（或随机枢轴）就能过。

### 第 3 层
排完序后建反查表：`where[a[i].id] = i + 1;`（学号范围是 `1..n`，数组开 `n+1` 就够）。查询就是一次数组下标访问。另外记得"前 10 名"要取 `min(n, 10)`，`n < 10` 时不能输出未初始化的记录。最后自检：`where` 的值应该恰好是 `1..n` 的一个排列，`top` 的第一条必须是 `score` 最大、同分里 `id` 最小的那条。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAXN 60000

typedef struct {
    int id;
    int score;
} Rec;

static Rec a[MAXN];
static int where[MAXN + 1];

/* 排序规则：分数高的在前；分数相同学号小的在前 */
static int before(const Rec *x, const Rec *y) {
    if (x->score != y->score) {
        return x->score > y->score;
    }
    return x->id < y->id;
}

static void swap_rec(Rec *x, Rec *y) {
    Rec t = *x;
    *x = *y;
    *y = t;
}

/* 三数取中 + Hoare 双指针；先递归小的那边，把栈深压到 O(log n) */
static void sort_range(Rec *v, int lo, int hi) {
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (before(&v[mid], &v[lo])) {
            swap_rec(&v[mid], &v[lo]);
        }
        if (before(&v[hi], &v[mid])) {
            swap_rec(&v[hi], &v[mid]);
        }
        if (before(&v[mid], &v[lo])) {
            swap_rec(&v[mid], &v[lo]);
        }
        swap_rec(&v[mid], &v[lo]);          /* 中位数放到最左边当枢轴 */

        Rec pivot = v[lo];                  /* 枢轴拷一份，交换时不会被动到 */
        int i = lo - 1;
        int j = hi + 1;
        for (;;) {
            do {
                i++;
            } while (before(&v[i], &pivot));
            do {
                j--;
            } while (before(&pivot, &v[j]));
            if (i >= j) {
                break;
            }
            swap_rec(&v[i], &v[j]);
        }
        if (j - lo < hi - j) {
            sort_range(v, lo, j);           /* 小的一边递归 */
            lo = j + 1;                     /* 大的一边循环 */
        } else {
            sort_range(v, j + 1, hi);
            hi = j;
        }
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

    sort_range(a, 0, n - 1);

    for (int i = 0; i < n; i++) {
        where[a[i].id] = i + 1;             /* 学号 → 名次，O(1) 反查 */
    }

    printf("top=");
    int k = (n < 10) ? n : 10;
    for (int i = 0; i < k; i++) {
        printf("%s%d:%d", i ? " " : "", a[i].id, a[i].score);
    }
    printf("\n");

    printf("median=%d\n", a[(n + 1) / 2 - 1].score);
    printf("last=%d:%d\n", a[n - 1].id, a[n - 1].score);

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int id;
        if (scanf("%d", &id) != 1) {
            return 0;
        }
        printf("pos %d %d\n", id, where[id]);
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
static int where[MAXN + 1];

static int before(const Rec *x, const Rec *y) {
    if (x->score != y->score) {
        return x->score > y->score;
    }
    return x->id < y->id;
}

static void swap_rec(Rec *x, Rec *y) {
    Rec t = *x;
    *x = *y;
    *y = t;
}

static void sort_range(Rec *v, int lo, int hi) {
    /* TODO: 写划分（Lomuto 或 Hoare），再递归两边。
       注意本题有大量同分和已经有序的用例，枢轴别总取最后一个元素 */
    (void)v;
    (void)lo;
    (void)hi;
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

    sort_range(a, 0, n - 1);

    for (int i = 0; i < n; i++) {
        where[a[i].id] = i + 1;             /* TODO: 排序正确之后这一句才有意义 */
    }

    printf("top=");
    int k = (n < 10) ? n : 10;
    for (int i = 0; i < k; i++) {
        printf("%s%d:%d", i ? " " : "", a[i].id, a[i].score);
    }
    printf("\n");

    printf("median=%d\n", a[(n + 1) / 2 - 1].score);
    printf("last=%d:%d\n", a[n - 1].id, a[n - 1].score);

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int id;
        if (scanf("%d", &id) != 1) {
            return 0;
        }
        printf("pos %d %d\n", id, where[id]);
    }
    return 0;
}
```

## 复杂度
时间：排序平均 `O(n log n)`，最坏 `O(n²)`（所以必须三数取中/随机枢轴）；建反查表 `O(n)`；每次查询 `O(1)`。总计 `O(n log n + q)`。
空间：`O(n)` 的 `Rec` 数组（约 480KB）加 `O(n)` 的 `where` 数组（约 240KB），递归栈 `O(log n)`。

## 常见错误
### 直接调用 `qsort`，比较函数只比总分 [WA]
`qsort` 是**不保证稳定**的通用排序：比较函数对同分返回 0 时，两个同分记录谁先谁后完全由实现决定。本题要求"同分按学号升序"，只比总分就丢掉了这个规则，`top`、`pos` 会随机出错——而且**排序结果本身仍然是有序的**，肉眼很难发现。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>

#define MAXN 60000

typedef struct {
    int id;
    int score;
} Rec;

static Rec a[MAXN];
static int where[MAXN + 1];

/* 错：同分返回 0，顺序交给 qsort 决定；而且题目要求自己写快排 */
static int cmp_score_only(const void *pa, const void *pb) {
    const Rec *x = pa;
    const Rec *y = pb;
    if (x->score != y->score) {
        return x->score > y->score ? -1 : 1;
    }
    return 0;
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

    for (int i = 0; i < n; i++) {
        where[a[i].id] = i + 1;
    }

    printf("top=");
    int k = (n < 10) ? n : 10;
    for (int i = 0; i < k; i++) {
        printf("%s%d:%d", i ? " " : "", a[i].id, a[i].score);
    }
    printf("\n");

    printf("median=%d\n", a[(n + 1) / 2 - 1].score);
    printf("last=%d:%d\n", a[n - 1].id, a[n - 1].score);

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int id;
        if (scanf("%d", &id) != 1) {
            return 0;
        }
        printf("pos %d %d\n", id, where[id]);
    }
    return 0;
}
```

### 枢轴取最后一个元素，遇到"全部同分"和"已按分数升序"就退化 [TLE]
Lomuto 划分取 `v[hi]` 当枢轴，在已经有序（或全部相等）的输入上每次只削掉一个元素，比较次数是 `n(n-1)/2`。`n = 6×10⁴` 时是 `1.8×10⁹` 次比较，`timeMs = 2000` 根本跑不完。本题的隐藏用例里这两种形状都有，必须换成三数取中或随机枢轴。

```c file=main.c expect=TLE
#include <stdio.h>

#define MAXN 60000

typedef struct {
    int id;
    int score;
} Rec;

static Rec a[MAXN];
static int where[MAXN + 1];

static int before(const Rec *x, const Rec *y) {
    if (x->score != y->score) {
        return x->score > y->score;
    }
    return x->id < y->id;
}

static void swap_rec(Rec *x, Rec *y) {
    Rec t = *x;
    *x = *y;
    *y = t;
}

static void sort_range(Rec *v, int lo, int hi) {
    if (lo >= hi) {
        return;
    }
    Rec pivot = v[hi];                      /* 错：枢轴永远取最后一个 */
    int i = lo;
    for (int j = lo; j < hi; j++) {
        if (before(&v[j], &pivot)) {
            swap_rec(&v[i], &v[j]);
            i++;
        }
    }
    swap_rec(&v[i], &v[hi]);
    sort_range(v, lo, i - 1);
    sort_range(v, i + 1, hi);
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

    sort_range(a, 0, n - 1);

    for (int i = 0; i < n; i++) {
        where[a[i].id] = i + 1;
    }

    printf("top=");
    int k = (n < 10) ? n : 10;
    for (int i = 0; i < k; i++) {
        printf("%s%d:%d", i ? " " : "", a[i].id, a[i].score);
    }
    printf("\n");

    printf("median=%d\n", a[(n + 1) / 2 - 1].score);
    printf("last=%d:%d\n", a[n - 1].id, a[n - 1].score);

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int id;
        if (scanf("%d", &id) != 1) {
            return 0;
        }
        printf("pos %d %d\n", id, where[id]);
    }
    return 0;
}
```

### 名次靠"每次查询线性扫一遍数组"得到 [TLE]
排完序后写 `for (i = 0; i < n; i++) if (a[i].id == id) { 名次 = i + 1; break; }`。单次查询 `O(n)`，1000 次查询就是 `6×10⁷` 次比较——在 `-O0` 下会明显变慢，很容易顶到时间上限。学号范围恰好是 `1..n`，用一张 `where[]` 反查表把查询降到 `O(1)` 才是本题的预期解法。

### 排序方向写反，或者同分时学号写成了降序 [WA]
`score` 要降序（大的在前），`id` 要升序（小的在前）。这两个方向很容易只对一个：`top` 第一行立刻就能看出来，但 `median` 和 `last` 会"看起来正常"（中位数和最小值在两种方向下可能巧合地一样）。写完先拿示例 1 手动核对 `top` 的五个位置。

### 前 10 名按死 10 条输出，`n < 10` 时越界 [WA|RE]
`for (i = 0; i < 10; i++)` 在 `n = 1` 时会读到 `a[1]` 到 `a[9]` 的未初始化内容，输出一堆垃圾（甚至因为未初始化读被判 `WA`）。正确写法是 `k = (n < 10) ? n : 10`。

## 测试用例
### 01 sample 示例 1
```in
5
3 90
1 85
2 85
5 70
4 60
4
1
3
4
2
```
```out
top=3:90 1:85 2:85 5:70 4:60
median=85
last=4:60
pos 1 2
pos 3 1
pos 4 5
pos 2 3
```

### 02 sample 示例 2
```in
1
1 0
1
1
```
```out
top=1:0
median=0
last=1:0
pos 1 1
```

### 生成 stress 最大规模、全员同分与已有序
```js gen
const cases = [];

/* 独立算期望值：直接用"分数降序、学号升序"的规则排序，不调用参考实现 */
function render(recs, queries) {
  const order = recs.slice().sort((x, y) => (y.score - x.score) || (x.id - y.id));
  const n = order.length;
  const where = new Map();
  order.forEach((r, i) => where.set(r.id, i + 1));
  const lines = [];
  lines.push('top=' + order.slice(0, Math.min(10, n)).map((r) => `${r.id}:${r.score}`).join(' '));
  lines.push(`median=${order[Math.floor((n + 1) / 2) - 1].score}`);
  lines.push(`last=${order[n - 1].id}:${order[n - 1].score}`);
  for (const id of queries) lines.push(`pos ${id} ${where.get(id)}`);
  return lines.join('\n') + '\n';
}

function io(recs, queries) {
  const body = recs.map((r) => `${r.id} ${r.score}`).join('\n');
  return {
    input: `${recs.length}\n${body}\n${queries.length}\n${queries.join('\n')}\n`,
    output: render(recs, queries),
  };
}

/* 生成一个 1..n 的乱序排列 */
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

/* boundary：6 万人、总分随机（大量同分）、学号乱序 */
{
  const n = 60000;
  const ids = shuffled(n);
  const recs = ids.map((id) => ({ id, score: rng.int(0, 1000) }));
  const queries = [];
  for (let i = 0; i < 1000; i++) queries.push(rng.int(1, n));
  cases.push({ kind: 'boundary', category: '6 万人、总分 0..1000 随机、学号乱序', ...io(recs, queries) });
}

/* trap：6 万人全部同分，输入学号恰好是 1..n（对比较函数来说已经有序） */
{
  const n = 60000;
  const recs = [];
  for (let i = 1; i <= n; i++) recs.push({ id: i, score: 500 });
  const queries = [];
  for (let i = 0; i < 20; i++) queries.push(rng.int(1, n));
  cases.push({ kind: 'trap', category: '6 万人全部 500 分，学号升序给出', ...io(recs, queries) });
}

/* trap：6 万人按总分升序给出（降序排序的最坏形状） */
{
  const n = 60000;
  const recs = [];
  for (let i = 1; i <= n; i++) recs.push({ id: i, score: Math.floor((i - 1) * 3 / 60000) });
  const queries = [];
  for (let i = 0; i < 50; i++) queries.push(rng.int(1, n));
  cases.push({ kind: 'trap', category: '6 万人按总分升序给出', ...io(recs, queries) });
}

/* trap：只有两种分数，同分成千上万，考"同分按学号" */
{
  const n = 30000;
  const ids = shuffled(n);
  const recs = ids.map((id) => ({ id, score: id % 2 === 0 ? 600 : 599 }));
  const queries = [];
  for (let i = 0; i < 30; i++) queries.push(rng.int(1, n));
  cases.push({ kind: 'trap', category: '3 万人只有两种分数', ...io(recs, queries) });
}

/* degenerate：两个人同分 */
{
  const recs = [{ id: 2, score: 100 }, { id: 1, score: 100 }];
  const queries = [1, 2];
  cases.push({ kind: 'degenerate', category: '两个人同分，学号倒序给出', ...io(recs, queries) });
}

/* degenerate：三个人，分数相同 */
{
  const recs = [{ id: 3, score: 0 }, { id: 1, score: 0 }, { id: 2, score: 0 }];
  const queries = [1, 2, 3];
  cases.push({ kind: 'degenerate', category: '三个人都是 0 分', ...io(recs, queries) });
}

/* normal：5000 人、总分随机 */
{
  const n = 5000;
  const ids = shuffled(n);
  const recs = ids.map((id) => ({ id, score: rng.int(0, 100) }));
  const queries = [];
  for (let i = 0; i < 100; i++) queries.push(rng.int(1, n));
  cases.push({ kind: 'normal', category: '5000 人、总分 0..100', ...io(recs, queries) });
}

return cases;
```
