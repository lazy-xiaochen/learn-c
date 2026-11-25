---json
{
  "id": "p-s7-bst-2",
  "title": "商品价格区间统计：用二叉搜索树剪枝回答区间内有多少种价格",
  "difficulty": "L4",
  "knowledgePoints": ["s7-bst"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
电商后台每天要回答同一类问题：**在 [lo, hi] 这个价格区间里，一共有多少种不同的商品价格？** 价格数据是边卖边上架的，用有序数组的话每次插入都要搬数据；用哈希表又没法回答"区间"。二叉搜索树正好两边都占：插入只要 `O(h)`，区间统计也能靠 BST 的排序性质剪枝。

流程是这样的：

1. 依次上架 `n` 个价格，逐个插入二叉搜索树（**相同价格只保留一个节点**，重复上架不再插入）；
2. 上架完成后，输出树里有多少种价格（节点数）、树高、最小价格、最大价格；
3. 然后回答 `q` 个区间查询，每个查询给出 `lo` 和 `hi`，输出价格落在 `[lo, hi]` 内的**不同价格个数**。

关键在第三步：**不要遍历整棵树**。利用"左子树全部更小、右子树全部更大"这条性质，一个节点只有三种命运：

- `key < lo`：这个节点和它的整棵左子树都太小，只需要递归右子树；
- `key > hi`：这个节点和它的整棵右子树都太大，只需要递归左子树；
- 否则：这个节点在区间里，答案 +1，两边都要递归。

这样一次查询只需要走"区间边界所在的路径"，而不是全部 `n` 个节点。

节点可以用 `malloc`，也可以像下面这样用**静态节点池**（数组下标当指针，`0` 表示空）。本题不检查泄漏，两种写法都可以；节点池的写法在"节点数已知"的题目里更快、也没有释放的负担。

## 输入格式
第一行一个整数 `n`：上架的价格个数。
第二行 `n` 个整数，依次是价格（可能有重复）。
第三行一个整数 `q`：查询个数。
接下来 `q` 行，每行两个整数 `lo`、`hi`。

## 输出格式
先输出 4 行：

```
nodes=<树里不同价格的个数>
height=<树高：空树 0，单节点 1>
min=<最小价格>
max=<最大价格>
```

然后 `q` 行，每行：

```
q <lo> <hi> <落在区间内的不同价格个数>
```

因为 `n ≥ 1`，树永远非空。

## 数据范围
1 ≤ n ≤ 30000
1 ≤ 价格 ≤ 10⁹
1 ≤ q ≤ 500
1 ≤ lo ≤ hi ≤ 10⁹

隐藏用例里会有"价格全部相同"（树只有 1 个节点）和"价格严格递增"（树退化成一条链，树高 = 节点数）这两种极端情况。严格递增的链最多 3000 个节点，再长的链会超出合理的递归深度。

## 示例
### 示例 1
```in
6
50 30 70 20 40 70
4
20 60
1 1000000000
45 45
30 40
```
```out
nodes=5
height=3
min=20
max=70
q 20 60 4
q 1 1000000000 5
q 45 45 0
q 30 40 2
```
> 价格 70 出现了两次，但只保留一个节点，所以 `nodes=5`。树形是 `50(30(20)(40))(70)`，高度 3。`[20,60]` 里的价格是 20、30、40、50，共 4 种；`[45,45]` 里没有任何价格，输出 0。

### 示例 2（边界：只有一个价格）
```in
1
500
2
1 1
500 500
```
```out
nodes=1
height=1
min=500
max=500
q 1 1 0
q 500 500 1
```
> 只有一个节点，`height=1`。查询的左端点等于右端点时也必须正确：`[1,1]` 里没有 500，输出 0；`[500,500]` 恰好命中，输出 1。这类"`lo == hi`"的查询最容易在边界判断上写错。

## 提示
### 第 1 层
先把"插入"写对：`v < key` 往左、`v > key` 往右、**`v == key` 什么都不做**。这一步错了，后面 `nodes`、`height`、所有区间计数都会跟着错。插入完成后，最小值就是最左节点、最大值就是最右节点。

### 第 2 层
区间计数是一个"带剪枝的递归"：先判断当前节点是否 `< lo`（只走右边）、是否 `> hi`（只走左边），否则计数 1 并递归两边。注意判断顺序和比较符号——写成 `<= lo` 或 `>= hi` 就会把正好等于边界的那一层价格漏掉。树高就是 `1 + max(左高, 右高)`，空树返回 0。

### 第 3 层
节点池写法：`key[1..cnt]`、`left[1..cnt]`、`right[1..cnt]`，`0` 代表 NULL。插入时用一个 `int *` 指向"当前子树根的下标"（`&left[root]`），这样就能像操作指针一样直接改。**注意节点数上限**：`n` 个价格最多产生 `n` 个节点，数组开 `n + 1` 就够；重复价格不占新节点，但如果忘记去重就会越界。最后检查一遍：查询递归里两个分支都写了吗？只写一边会得到"看起来合理但偏小"的答案。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAXN 30000

/* 静态节点池：下标就是"指针"，0 表示空。节点编号从 1 开始，这样 0 天然是空指针 */
static int key[MAXN + 1];
static int lc[MAXN + 1];
static int rc[MAXN + 1];
static int cnt;

/* 下标版插入：用一个指向"子树根下标"的指针，避免"接不回去"的经典错误 */
static void insert(int *root, int v) {
    if (*root == 0) {
        cnt++;
        *root = cnt;
        key[cnt] = v;
        lc[cnt] = 0;
        rc[cnt] = 0;
        return;
    }
    if (v < key[*root]) {
        insert(&lc[*root], v);
    } else if (v > key[*root]) {
        insert(&rc[*root], v);          /* v == key 时什么都不做：去重 */
    }
}

static int height(int root) {
    if (root == 0) {
        return 0;
    }
    int a = height(lc[root]);
    int b = height(rc[root]);
    return 1 + (a > b ? a : b);
}

/* 统计落在 [lo, hi] 里的节点个数：靠 BST 性质剪枝 */
static int count_range(int root, int lo, int hi) {
    if (root == 0) {
        return 0;
    }
    if (key[root] < lo) {
        return count_range(rc[root], lo, hi);     /* 整棵左子树都太小 */
    }
    if (key[root] > hi) {
        return count_range(lc[root], lo, hi);     /* 整棵右子树都太大 */
    }
    return 1 + count_range(lc[root], lo, hi) + count_range(rc[root], lo, hi);
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }

    int root = 0;
    for (int i = 0; i < n; i++) {
        int v;
        if (scanf("%d", &v) != 1 || v < 1) {
            return 0;
        }
        insert(&root, v);
    }

    printf("nodes=%d\n", cnt);
    printf("height=%d\n", height(root));

    int p = root;
    while (lc[p] != 0) {
        p = lc[p];
    }
    printf("min=%d\n", key[p]);

    p = root;
    while (rc[p] != 0) {
        p = rc[p];
    }
    printf("max=%d\n", key[p]);

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 500) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int lo;
        int hi;
        if (scanf("%d %d", &lo, &hi) != 2) {
            return 0;
        }
        printf("q %d %d %d\n", lo, hi, count_range(root, lo, hi));
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAXN 30000

static int key[MAXN + 1];
static int lc[MAXN + 1];
static int rc[MAXN + 1];
static int cnt;

static void insert(int *root, int v) {
    /* TODO: *root == 0 时新建节点（cnt++、写入 key/lc/rc）；
       否则 v < key[*root] 递归左边、v > key[*root] 递归右边、相等直接返回 */
    (void)root;
    (void)v;
}

static int height(int root) {
    (void)root;
    /* TODO: 空树返回 0，否则 1 + max(左高, 右高) */
    return 0;
}

static int count_range(int root, int lo, int hi) {
    (void)root;
    (void)lo;
    (void)hi;
    /* TODO: 三路剪枝：key < lo 只走右；key > hi 只走左；否则 1 + 左右都走 */
    return 0;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }

    int root = 0;
    for (int i = 0; i < n; i++) {
        int v;
        if (scanf("%d", &v) != 1 || v < 1) {
            return 0;
        }
        insert(&root, v);
    }

    printf("nodes=%d\n", cnt);          /* TODO: 现在 cnt 一直是 0 */
    printf("height=%d\n", height(root));

    int p = root;
    while (lc[p] != 0) {
        p = lc[p];
    }
    printf("min=%d\n", key[p]);         /* TODO: root 为 0 时这里会读 key[0] */

    p = root;
    while (rc[p] != 0) {
        p = rc[p];
    }
    printf("max=%d\n", key[p]);

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 500) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int lo;
        int hi;
        if (scanf("%d %d", &lo, &hi) != 2) {
            return 0;
        }
        printf("q %d %d %d\n", lo, hi, count_range(root, lo, hi));
    }
    return 0;
}
```

## 复杂度
插入：`O(h)`，`h` 是树高。价格随机时 `h ≈ O(log n)`，价格严格递增时退化成 `h = n`。
区间查询：`O(h + k)`，`k` 是落在区间里的节点数——不在"边界路径"上的整棵子树会被一次剪掉，不用访问。
建树总计 `O(n·h)`，全部查询 `O(q·(h + k))`。空间 `O(n)`：三个定长数组，`120KB` 左右。

## 常见错误
### 插入时把相等的价格也插进去，节点重复 [WA]
判据写成 `if (v < key) 左边 else 右边`，相等就落到右边，同一个价格会出现多个节点：`nodes` 偏大、`height` 变高、区间计数里同一个价格被数好几次。本题明确要求"相同价格只保留一个节点"，所以相等必须单独处理。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXN 30000

static int key[MAXN + 1];
static int lc[MAXN + 1];
static int rc[MAXN + 1];
static int cnt;

static void insert(int *root, int v) {
    if (*root == 0) {
        cnt++;
        *root = cnt;
        key[cnt] = v;
        lc[cnt] = 0;
        rc[cnt] = 0;
        return;
    }
    if (v < key[*root]) {
        insert(&lc[*root], v);
    } else {
        insert(&rc[*root], v);          /* 错：相等的价格也插到了右边 */
    }
}

static int height(int root) {
    if (root == 0) {
        return 0;
    }
    int a = height(lc[root]);
    int b = height(rc[root]);
    return 1 + (a > b ? a : b);
}

static int count_range(int root, int lo, int hi) {
    if (root == 0) {
        return 0;
    }
    if (key[root] < lo) {
        return count_range(rc[root], lo, hi);
    }
    if (key[root] > hi) {
        return count_range(lc[root], lo, hi);
    }
    return 1 + count_range(lc[root], lo, hi) + count_range(rc[root], lo, hi);
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }

    int root = 0;
    for (int i = 0; i < n; i++) {
        int v;
        if (scanf("%d", &v) != 1 || v < 1) {
            return 0;
        }
        insert(&root, v);
    }

    printf("nodes=%d\n", cnt);
    printf("height=%d\n", height(root));

    int p = root;
    while (lc[p] != 0) {
        p = lc[p];
    }
    printf("min=%d\n", key[p]);

    p = root;
    while (rc[p] != 0) {
        p = rc[p];
    }
    printf("max=%d\n", key[p]);

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 500) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int lo;
        int hi;
        if (scanf("%d %d", &lo, &hi) != 2) {
            return 0;
        }
        printf("q %d %d %d\n", lo, hi, count_range(root, lo, hi));
    }
    return 0;
}
```

### 区间判断写成 `<` / `>` 的严格剪枝，漏掉正好等于边界的价格 [WA]
`if (key <= lo) 只走右边` 会把"`key == lo`"这个本该计数的节点也剪掉；`if (key >= hi) 只走左边` 同理。结果是每个带边界的查询都少 1（`lo == hi` 时直接输出 0）。正确的剪枝条件是 `key < lo` 和 `key > hi`——**只有严格更小/更大才不需要这个节点**。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXN 30000

static int key[MAXN + 1];
static int lc[MAXN + 1];
static int rc[MAXN + 1];
static int cnt;

static void insert(int *root, int v) {
    if (*root == 0) {
        cnt++;
        *root = cnt;
        key[cnt] = v;
        lc[cnt] = 0;
        rc[cnt] = 0;
        return;
    }
    if (v < key[*root]) {
        insert(&lc[*root], v);
    } else if (v > key[*root]) {
        insert(&rc[*root], v);
    }
}

static int height(int root) {
    if (root == 0) {
        return 0;
    }
    int a = height(lc[root]);
    int b = height(rc[root]);
    return 1 + (a > b ? a : b);
}

static int count_range(int root, int lo, int hi) {
    if (root == 0) {
        return 0;
    }
    if (key[root] <= lo) {              /* 错：等于 lo 的节点被剪掉了 */
        return count_range(rc[root], lo, hi);
    }
    if (key[root] >= hi) {              /* 错：等于 hi 的节点被剪掉了 */
        return count_range(lc[root], lo, hi);
    }
    return 1 + count_range(lc[root], lo, hi) + count_range(rc[root], lo, hi);
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }

    int root = 0;
    for (int i = 0; i < n; i++) {
        int v;
        if (scanf("%d", &v) != 1 || v < 1) {
            return 0;
        }
        insert(&root, v);
    }

    printf("nodes=%d\n", cnt);
    printf("height=%d\n", height(root));

    int p = root;
    while (lc[p] != 0) {
        p = lc[p];
    }
    printf("min=%d\n", key[p]);

    p = root;
    while (rc[p] != 0) {
        p = rc[p];
    }
    printf("max=%d\n", key[p]);

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 500) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int lo;
        int hi;
        if (scanf("%d %d", &lo, &hi) != 2) {
            return 0;
        }
        printf("q %d %d %d\n", lo, hi, count_range(root, lo, hi));
    }
    return 0;
}
```

### 树高把空树算成 1，或者把单节点算成 0 [WA]
`height` 的定义必须和 `1 + max(左, 右)` 配上一句"空树返回 0"。如果空树返回 1，那么每个叶子都会多算一层，整棵树的高度整体 +1；如果单节点返回 0，则是整体 -1。两种错都只影响 `height` 这一行，其它行全对——看起来"只差一点"，实际上是定义没对上。

### 区间查询只递归了一边 [WA]
`if (key 在区间内) return 1 + count_range(lc[...])` 漏掉右子树，结果会偏小但"看起来很合理"：越靠近根的节点被数到、深处的整片漏掉。写完拿"整个区间 `[1, 10⁹]`"测一遍——它的答案必须等于 `nodes`，这是最好用的自检。

### 静态节点池开得太小 [RE]
`n` 个价格最多产生 `n` 个节点，数组要开 `n + 1`。如果忘记去重，重复价格也会占节点，`cnt` 就会超过上限写到数组外面（ASan 报 `global-buffer-overflow`，判 `RE`）。本题的范围已经按"每个价格一个节点"给足，但如果你把上限写死成 1000 之类的小数字，一到大用例就会崩。

## 测试用例
### 01 sample 示例 1
```in
6
50 30 70 20 40 70
4
20 60
1 1000000000
45 45
30 40
```
```out
nodes=5
height=3
min=20
max=70
q 20 60 4
q 1 1000000000 5
q 45 45 0
q 30 40 2
```

### 02 sample 示例 2
```in
1
500
2
1 1
500 500
```
```out
nodes=1
height=1
min=500
max=500
q 1 1 0
q 500 500 1
```

### 生成 stress 最大规模、退化链与重复价格
```js gen
const cases = [];

/* 独立算期望值：树高需要"复现插入形状"，其余都只看不同价格的集合 */
function build(keys) {
  const K = [];
  const L = [];
  const R = [];
  const seen = new Set();
  let root = -1;
  for (const v of keys) {
    if (seen.has(v)) continue;
    seen.add(v);
    const id = K.length;
    K.push(v);
    L.push(-1);
    R.push(-1);
    if (root < 0) {
      root = id;
      continue;
    }
    let cur = root;
    for (;;) {
      if (v < K[cur]) {
        if (L[cur] < 0) { L[cur] = id; break; }
        cur = L[cur];
      } else {
        if (R[cur] < 0) { R[cur] = id; break; }
        cur = R[cur];
      }
    }
  }
  const h = (id) => (id < 0 ? 0 : 1 + Math.max(h(L[id]), h(R[id])));
  const sorted = [...seen].sort((a, b) => a - b);
  return { height: h(root), sorted };
}

function render(keys, queries) {
  const { height, sorted } = build(keys);
  const head = [
    `nodes=${sorted.length}`,
    `height=${height}`,
    `min=${sorted[0]}`,
    `max=${sorted[sorted.length - 1]}`,
  ];
  for (const [lo, hi] of queries) {
    let c = 0;
    for (const v of sorted) if (v >= lo && v <= hi) c++;
    head.push(`q ${lo} ${hi} ${c}`);
  }
  return head.join('\n') + '\n';
}

function io(keys, queries) {
  const q = queries.map(([lo, hi]) => `${lo} ${hi}`).join('\n');
  return {
    input: `${keys.length}\n${keys.join(' ')}\n${queries.length}\n${q}\n`,
    output: render(keys, queries),
  };
}

/* boundary：30000 个随机价格 + 500 个随机区间 */
{
  const keys = [];
  for (let i = 0; i < 30000; i++) keys.push(rng.int(1, 1000000000));
  const queries = [];
  for (let i = 0; i < 500; i++) {
    const a = rng.int(1, 1000000000);
    const b = rng.int(1, 1000000000);
    queries.push(a <= b ? [a, b] : [b, a]);
  }
  cases.push({ kind: 'boundary', category: '30000 个随机价格、500 个随机区间', ...io(keys, queries) });
}

/* trap：价格严格递增 3000 个，树退化成链，height = 3000 */
{
  const keys = [];
  for (let i = 1; i <= 3000; i++) keys.push(i * 1000);
  const queries = [
    [1, 1000000000],
    [3000000, 3000000],
    [1000, 3000000],
    [1, 1],
    [1000000, 2000000],
  ];
  cases.push({ kind: 'trap', category: '严格递增 3000 个价格，树高 3000', ...io(keys, queries) });
}

/* degenerate：价格全部相同，只剩 1 个节点 */
{
  const keys = new Array(30000).fill(88);
  const queries = [
    [1, 1000000000],
    [88, 88],
    [89, 1000000000],
  ];
  cases.push({ kind: 'degenerate', category: '30000 个相同价格，树里只有 1 个节点', ...io(keys, queries) });
}

/* degenerate：只有一个价格，查询都落在区间外 */
{
  const keys = [1000000000];
  const queries = [
    [1, 999999999],
    [1, 1000000000],
  ];
  cases.push({ kind: 'degenerate', category: '单个价格在边界上', ...io(keys, queries) });
}

/* trap：只有两个价格，查询端点恰好压在价格上 */
{
  const keys = [1, 1000000000];
  const queries = [
    [1, 1],
    [1000000000, 1000000000],
    [2, 999999999],
    [1, 1000000000],
  ];
  cases.push({ kind: 'trap', category: '两个价格分别是最小值和最大值', ...io(keys, queries) });
}

/* trap：大量重复价格（价格只取自 10 个值） */
{
  const keys = [];
  const pool = [7, 70, 700, 7000, 70000, 700000, 7000000, 70000000, 700000000, 1000000000];
  for (let i = 0; i < 5000; i++) keys.push(pool[rng.int(0, 9)]);
  const queries = [
    [7, 1000000000],
    [7, 700],
    [70000, 7000000],
    [700000000, 1000000000],
    [1, 6],
  ];
  cases.push({ kind: 'trap', category: '5000 个价格只取自 10 个值', ...io(keys, queries) });
}

/* normal：3000 个随机价格，含少量重复 */
{
  const keys = [];
  for (let i = 0; i < 3000; i++) keys.push(rng.int(1, 2000));
  const queries = [];
  for (let i = 0; i < 20; i++) {
    const a = rng.int(1, 2000);
    const b = rng.int(1, 2000);
    queries.push(a <= b ? [a, b] : [b, a]);
  }
  cases.push({ kind: 'normal', category: '3000 个 1..2000 的随机价格', ...io(keys, queries) });
}

return cases;
```
