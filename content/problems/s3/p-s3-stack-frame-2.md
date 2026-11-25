---json
{
  "id": "p-s3-stack-frame-2",
  "title": "调用树的最大栈用量：谁的帧同时压在栈上",
  "difficulty": "L3",
  "knowledgePoints": ["s3-stack-frame"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一次函数调用会把自己的栈帧压到栈上，函数返回时再把帧弹掉。所以**只有"当前这条调用链"上的帧是同时存在的**：`main` 调用 `f`、`f` 又调用 `g` 时，栈上同时有 `main`、`f`、`g` 三块帧；而 `f` 返回之后，`f` 和 `g` 的帧都没了。

现在给出一个程序的调用关系：共 `n` 个函数，1 号函数是 `main`（调用树的根），每个函数都有一个固定的栈帧大小。调用关系构成一棵以 1 号函数为根的树，每条边 `p c` 表示"函数 `p` 调用了函数 `c`"。

请算出：**从 `main` 出发的某条调用链上，同时压在栈上的帧大小之和最大是多少，这条链一共有几层**。层数按"`main` 算第 1 层"计算。

如果有多条链的字节数并列最大，取**层数最大**的那条的层数。

## 输入格式
第一行一个整数 `n`。
第二行 `n` 个整数，第 `i` 个是函数 `i` 的栈帧大小（字节）。
接下来 `n - 1` 行，每行两个整数 `p c`，表示 `p` 调用了 `c`。**边的顺序任意**，`c` 也可能先于 `p` 出现。

## 输出格式
一行两个整数：最大栈用量（字节）和达到这个用量的调用链层数，用一个空格分隔。

## 数据范围
1 ≤ n ≤ 60000
1 ≤ 每个函数的帧大小 ≤ 1000000
输入保证是一棵以 1 为根的树
最大栈用量可达 60000 × 1000000 = 6×10¹⁰，`int` 装不下，必须用 64 位整数
输入规模最大约 800KB（题目保证不超过 1MB）

## 示例
### 示例 1
```in
6
100 50 20 10 5 1
1 2
2 3
3 4
4 5
5 6
```
```out
186 6
```
> 这是一条 6 层的链：100 + 50 + 20 + 10 + 5 + 1 = 186。任何时刻栈上最多只有这 6 个函数，所以最大值就是整条链的和。

### 示例 2（边界：只有一个 main）
```in
1
1000000
```
```out
1000000 1
```
> `n = 1` 时没有任何边。栈上的最大用量就是 `main` 自己的帧，层数为 1。注意不能因为"没有边"就输出 0。

## 提示
### 第 1 层
先想清楚"最大栈用量"到底是什么：它是一条**根到某个节点的路径**上的帧大小之和，不是所有函数帧大小的总和。一个函数返回之后它的帧就不在了，兄弟分支的帧也不会同时存在。

### 第 2 层
从 1 号函数开始往下走，边记录"到当前节点为止的累加和"和"当前层数"即可：`sum[c] = sum[p] + frame[c]`，`depth[c] = depth[p] + 1`。因为输入边顺序任意，不能按输入顺序直接递推，要先建邻接表再遍历。

### 第 3 层
两个坑：一是累加和必须用 `long long`（最大 6×10¹⁰）；二是遍历不要写成递归——最坏情况下这是一条 6 万层的链，递归会把判题程序的栈撑爆。用数组当队列从 1 号函数开始 BFS，或者用显式栈迭代，都能安全地处理任意深度。并列时记得比较层数，取更深的那条。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAXN 60001

static int head[MAXN];
static int nxt[MAXN];
static int to[MAXN];
static int ecnt;
static int frame_size[MAXN];
static long long sum[MAXN];
static int depth[MAXN];
static int queue_node[MAXN];

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 60000) {
        return 0;
    }
    for (int i = 1; i <= n; i++) {
        if (scanf("%d", &frame_size[i]) != 1 || frame_size[i] < 1 || frame_size[i] > 1000000) {
            return 0;
        }
        head[i] = -1;
    }
    for (int i = 0; i < n - 1; i++) {
        int p, c;
        if (scanf("%d %d", &p, &c) != 2 || p < 1 || p > n || c < 1 || c > n) {
            return 0;
        }
        to[ecnt] = c;
        nxt[ecnt] = head[p];
        head[p] = ecnt;
        ecnt++;
    }

    /* 从 1 号函数开始广度优先：显式队列，避免递归深度过大的栈溢出 */
    int front = 0;
    int back = 0;
    queue_node[back++] = 1;
    sum[1] = frame_size[1];
    depth[1] = 1;

    long long best_bytes = sum[1];
    int best_depth = 1;

    while (front < back) {
        int u = queue_node[front++];
        for (int e = head[u]; e != -1; e = nxt[e]) {
            int v = to[e];
            sum[v] = sum[u] + frame_size[v];
            depth[v] = depth[u] + 1;
            if (sum[v] > best_bytes || (sum[v] == best_bytes && depth[v] > best_depth)) {
                best_bytes = sum[v];
                best_depth = depth[v];
            }
            queue_node[back++] = v;
        }
    }

    printf("%lld %d\n", best_bytes, best_depth);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAXN 60001

static int head[MAXN];
static int nxt[MAXN];
static int to[MAXN];
static int ecnt;
static int frame_size[MAXN];
static int best_bytes;                 /* TODO: 6×10¹⁰ 用 int 装不下 */
static int best_depth;

static void dfs(int u, int dep, int acc) {
    acc += frame_size[u];
    if (acc > best_bytes) {
        best_bytes = acc;
        best_depth = dep;
    }
    for (int e = head[u]; e != -1; e = nxt[e]) {
        dfs(to[e], dep + 1, acc);      /* TODO: 6 万层的链会把栈撑爆 */
    }
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 60000) {
        return 0;
    }
    for (int i = 1; i <= n; i++) {
        if (scanf("%d", &frame_size[i]) != 1 || frame_size[i] < 1 || frame_size[i] > 1000000) {
            return 0;
        }
        head[i] = -1;
    }
    for (int i = 0; i < n - 1; i++) {
        int p, c;
        if (scanf("%d %d", &p, &c) != 2) {
            return 0;
        }
        to[ecnt] = c;
        nxt[ecnt] = head[p];
        head[p] = ecnt;
        ecnt++;
    }

    dfs(1, 1, 0);
    printf("%d %d\n", best_bytes, best_depth);
    return 0;
}
```

## 复杂度
时间 O(n)：每个节点入队一次，每条边扫一次。
空间 O(n)：邻接表（`head`/`nxt`/`to`）、帧大小、累加和、层数、队列，都是定长数组，总共约 60000 × 7 × 4 字节 ≈ 1.7MB，放在静态区不占栈。

## 常见错误
### 用 int 存累加和 [UB]
最大栈用量是 6×10¹⁰，`int` 只能到约 2.1×10⁹。链一长就会发生有符号整数溢出——这是**未定义行为**，本平台的 UBSan 会直接报 `signed integer overflow`，判 `UB`；没有检测时你会得到一个负数或完全不相干的结果。

```c file=main.c expect=UB
#include <stdio.h>

#define MAXN 60001

static int head[MAXN];
static int nxt[MAXN];
static int to[MAXN];
static int ecnt;
static int frame_size[MAXN];
static int sum[MAXN];                  /* 错：链一长就溢出 */
static int depth[MAXN];
static int queue_node[MAXN];

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    for (int i = 1; i <= n; i++) {
        if (scanf("%d", &frame_size[i]) != 1) {
            return 0;
        }
        head[i] = -1;
    }
    for (int i = 0; i < n - 1; i++) {
        int p, c;
        if (scanf("%d %d", &p, &c) != 2) {
            return 0;
        }
        to[ecnt] = c;
        nxt[ecnt] = head[p];
        head[p] = ecnt;
        ecnt++;
    }

    int front = 0;
    int back = 0;
    queue_node[back++] = 1;
    sum[1] = frame_size[1];
    depth[1] = 1;
    int best_bytes = sum[1];
    int best_depth = 1;
    while (front < back) {
        int u = queue_node[front++];
        for (int e = head[u]; e != -1; e = nxt[e]) {
            int v = to[e];
            sum[v] = sum[u] + frame_size[v];
            depth[v] = depth[u] + 1;
            if (sum[v] > best_bytes || (sum[v] == best_bytes && depth[v] > best_depth)) {
                best_bytes = sum[v];
                best_depth = depth[v];
            }
            queue_node[back++] = v;
        }
    }
    printf("%d %d\n", best_bytes, best_depth);
    return 0;
}
```

### 按输入顺序直接递推 [WA]
看到边就写 `sum[c] = sum[p] + f[c]` 是错的：题目明确说边的顺序任意，`c` 可能先于 `p` 出现。此时 `sum[p]` 还没算出来（是 0），`sum[c]` 就被写成 `f[c]`，之后再也不会被修正。正确做法是先建邻接表，从 1 号函数开始按调用顺序遍历。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXN 60001

static int frame_size[MAXN];

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    for (int i = 1; i <= n; i++) {
        if (scanf("%d", &frame_size[i]) != 1) {
            return 0;
        }
    }
    long long sum[MAXN] = {0};
    int depth[MAXN] = {0};
    sum[1] = frame_size[1];
    depth[1] = 1;
    long long best_bytes = sum[1];
    int best_depth = 1;
    for (int i = 0; i < n - 1; i++) {
        int p, c;
        if (scanf("%d %d", &p, &c) != 2) {
            return 0;
        }
        sum[c] = sum[p] + frame_size[c];      /* 错：p 可能还没被处理过 */
        depth[c] = depth[p] + 1;
        if (sum[c] > best_bytes || (sum[c] == best_bytes && depth[c] > best_depth)) {
            best_bytes = sum[c];
            best_depth = depth[c];
        }
    }
    printf("%lld %d\n", best_bytes, best_depth);
    return 0;
}
```

### 并列时不比较层数 [WA]
题目要求并列时取更深的链。如果只在"严格大于"时更新，遇到"先出现的浅链最大、后面的深链与它并列"的情况，就会输出浅链的层数。条件要写成 `sum[v] > best_bytes || (sum[v] == best_bytes && depth[v] > best_depth)`。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXN 60001

static int head[MAXN];
static int nxt[MAXN];
static int to[MAXN];
static int ecnt;
static int frame_size[MAXN];
static long long sum[MAXN];
static int depth[MAXN];
static int queue_node[MAXN];

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    for (int i = 1; i <= n; i++) {
        if (scanf("%d", &frame_size[i]) != 1) {
            return 0;
        }
        head[i] = -1;
    }
    for (int i = 0; i < n - 1; i++) {
        int p, c;
        if (scanf("%d %d", &p, &c) != 2) {
            return 0;
        }
        to[ecnt] = c;
        nxt[ecnt] = head[p];
        head[p] = ecnt;
        ecnt++;
    }

    int front = 0;
    int back = 0;
    queue_node[back++] = 1;
    sum[1] = frame_size[1];
    depth[1] = 1;
    long long best_bytes = sum[1];
    int best_depth = 1;
    while (front < back) {
        int u = queue_node[front++];
        for (int e = head[u]; e != -1; e = nxt[e]) {
            int v = to[e];
            sum[v] = sum[u] + frame_size[v];
            depth[v] = depth[u] + 1;
            if (sum[v] > best_bytes) {            /* 错：并列时没有取更深的 */
                best_bytes = sum[v];
                best_depth = depth[v];
            }
            queue_node[back++] = v;
        }
    }
    printf("%lld %d\n", best_bytes, best_depth);
    return 0;
}
```

### 用递归遍历调用树 [RE]
调用树在极端情况下是一条 6 万层的链，递归遍历会叠 6 万层帧，把判题程序的栈撑爆，判 `RE`；即使没爆，每层帧也意味着几 MB 的真实栈开销。栈的深度与输入挂钩时，一律改成显式队列/显式栈。

### 把"所有帧大小之和"当成答案 [WA]
栈上同时存在的只有当前调用链上的帧。把整棵树的帧加起来（比如误用一遍求和），会得到大得多的数字。示例 1 的正确答案是链上的 186，而不是所有函数帧的总和。

## 测试用例
### 01 sample 示例 1
```in
6
100 50 20 10 5 1
1 2
2 3
3 4
4 5
5 6
```
```out
186 6
```

### 02 sample 示例 2
```in
1
1000000
```
```out
1000000 1
```

### 03 boundary 只有两层的最小链
```in
2
10 20
1 2
```
```out
30 2
```

### 04 trap 边的顺序是乱的，子节点出现在父节点之前
```in
4
5 7 11 13
3 2
1 3
2 4
```
```out
36 4
```
> 按输入顺序递推会先处理 `3 2`，此时 `sum[3]` 还是 0，`sum[2]` 被算成 7，最后整体错掉。正确答案沿 `1 → 3 → 2 → 4` 累加：5 + 11 + 7 + 13 = 36，共 4 层。

### 05 trap 两条链字节数并列，取更深的那条
```in
4
5 10 4 6
1 2
1 3
3 4
```
```out
15 3
```
> `1 → 2` 是 5 + 10 = 15，共 2 层；`1 → 3 → 4` 是 5 + 4 + 6 = 15，共 3 层。两者并列，按规则取更深的 3 层。

### 06 degenerate 两个函数都是最小帧
```in
2
1 1
1 2
```
```out
2 2
```

### 生成 boundary 60000 层、每层 1 字节的调用链
```js gen
const n = 60000;
const frames = new Array(n).fill(1);
let input = `${n}\n${frames.join(' ')}\n`;
for (let i = 1; i < n; i++) input += `${i} ${i + 1}\n`;
return [{
  kind: 'boundary',
  category: '60000 层调用链，帧大小全为 1',
  input,
  output: `${n} ${n}\n`,
}];
```

### 生成 trap 3000 层、每层 1000000 字节的调用链
```js gen
const n = 3000;
const frames = new Array(n).fill(1000000);
let input = `${n}\n${frames.join(' ')}\n`;
for (let i = 1; i < n; i++) input += `${i} ${i + 1}\n`;
return [{
  kind: 'trap',
  category: '3000 层、每层 1000000 字节，累计 3×10⁹ 超过 int',
  input,
  output: `${n * 1000000} ${n}\n`,
}];
```

### 生成 stress 50000 个叶子的一层扇出
```js gen
const n = 50000;
const frames = new Array(n).fill(1);
let input = `${n}\n${frames.join(' ')}\n`;
for (let i = 2; i <= n; i++) input += `1 ${i}\n`;
return [{
  kind: 'stress',
  category: 'main 直接调用 49999 个函数，最大深度只有 2',
  input,
  output: `2 2\n`,
}];
```
