---json
{
  "id": "p-s7-queue-list-1",
  "title": "迷宫最短路：用链表队列跑一遍完整的 BFS",
  "difficulty": "L4",
  "knowledgePoints": ["s7-queue-list"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
广度优先搜索（BFS）是链表队列最经典的应用：它按"离起点几步"的顺序一圈一圈向外扩展，而"先来先服务"正是队列的语义。

给定一张 `R` 行 `C` 列的网格：

- `S` 是起点，`E` 是终点，`.` 是空地，`#` 是墙；
- 每一步可以走到上、下、左、右相邻的空地或终点，不能穿墙，不能走出网格；
- 起点和终点都只有一个，且都不在墙上。

请你用**单向链表实现的队列**完成一次完整的 BFS（即使已经找到终点也要把队列处理空），并输出三个数：

1. `dist`：从 `S` 到 `E` 的最少步数；如果走不到，输出 `none`；
2. `visited`：从起点可达的非墙格子总数（包括起点和终点）；
3. `peak`：BFS 过程中**队列内元素个数的最大值**（每次成功入队后记录）。

为了保证 `peak` 唯一，规定邻居的访问顺序固定为：

> **上、下、左、右**（行号 −1、行号 +1、列号 −1、列号 +1）。

并且必须在**入队时**就把格子标记为已访问——如果等出队再标记，同一个格子会被多个前驱重复入队，`peak` 会变大。

## 输入格式
第一行两个整数 `R`、`C`。

接下来 `R` 行，每行一个长度为 `C` 的字符串，只包含 `S`、`E`、`.`、`#`。

## 输出格式
三行：

```
dist=<最少步数或 none>
visited=<可达的非墙格子数>
peak=<队列元素个数的最大值>
```

## 数据范围
1 ≤ R, C ≤ 200
网格中恰好一个 `S` 和一个 `E`，且 `S` 与 `E` 不是同一个格子
起点和终点都不是墙

最大网格 200 × 200 = 40000 个格子，输入约 40KB；`visited` 与 `peak` 都不会超过 40000。

## 示例
### 示例 1
```in
3 4
S..#
.#..
...E
```
```out
dist=5
visited=10
peak=2
```
> 最短路径是 `(0,0) → (1,0) → (2,0) → (2,1) → (2,2) → (2,3)`，共 5 步。从起点可达的非墙格子共 10 个。队列最多同时存 2 个格子：起点出队后它的两个邻居先后入队。

### 示例 2（边界：起点与终点相邻）
```in
1 2
SE
```
```out
dist=1
visited=2
peak=1
```
> 起点出队时把终点入队，此时队列里只有 1 个元素，所以 `peak=1` 而不是 2。`visited=2` 表示起点和终点都被访问过。

## 提示
### 第 1 层
先写链表队列：节点保存 `r`、`c`、`dist` 三个字段和 `next`；`enqueue` 尾插、`dequeue` 头删并 `free`，同时维护 `head`、`tail` 和 `size`。BFS 主循环就是"队列非空 → 出队 → 扩展邻居"。

### 第 2 层
用一个 `seen[200][200]` 记录格子是否已经入队。起点先标记并入队，`visited` 从 1 开始，`peak` 也从 1 开始。扩展邻居时按 `dr = {-1, 1, 0, 0}`、`dc = {0, 0, -1, 1}` 的顺序，跳过越界、墙和已访问的格子。

### 第 3 层
邻居满足条件时：**先标记 `seen[nr][nc] = 1`，再入队**，然后 `visited++`，并用 `q.size` 更新 `peak`。出队时如果 `grid[r][c] == 'E'` 且 `dist` 还没记录过，就记下 `d`。循环结束后如果没记录到终点，输出 `dist=none`。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>

#define MAXR 200
#define MAXC 200

typedef struct Node {
    int r;
    int c;
    int dist;
    struct Node *next;
} Node;

typedef struct {
    Node *head;      /* 队头 */
    Node *tail;      /* 队尾 */
    int size;
} Queue;

static int enqueue(Queue *q, int r, int c, int dist) {
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->r = r;
    node->c = c;
    node->dist = dist;
    node->next = NULL;
    if (q->tail == NULL) {
        q->head = node;
        q->tail = node;
    } else {
        q->tail->next = node;
        q->tail = node;
    }
    q->size++;
    return 1;
}

static int dequeue(Queue *q, int *r, int *c, int *dist) {
    if (q->head == NULL) {
        return 0;
    }
    Node *node = q->head;
    q->head = node->next;
    if (q->head == NULL) {
        q->tail = NULL;          /* 出队到空时必须清 tail */
    }
    q->size--;
    *r = node->r;
    *c = node->c;
    *dist = node->dist;
    free(node);
    return 1;
}

int main(void) {
    int rows = 0;
    int cols = 0;
    if (scanf("%d %d", &rows, &cols) != 2 || rows < 1 || rows > MAXR || cols < 1 || cols > MAXC) {
        return 0;
    }

    char grid[MAXR][MAXC + 1];
    for (int i = 0; i < rows; i++) {
        if (scanf("%200s", grid[i]) != 1) {
            return 0;
        }
    }

    int start_r = -1;
    int start_c = -1;
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 'S') {
                start_r = r;
                start_c = c;
            }
        }
    }
    if (start_r < 0) {
        return 0;
    }

    int seen[MAXR][MAXC] = { { 0 } };
    Queue q = { NULL, NULL, 0 };

    seen[start_r][start_c] = 1;
    if (!enqueue(&q, start_r, start_c, 0)) {
        return 0;
    }
    int visited = 1;
    int peak = 1;
    int best = -1;

    const int dr[4] = { -1, 1, 0, 0 };   /* 上、下 */
    const int dc[4] = { 0, 0, -1, 1 };   /* 左、右 */

    while (q.size > 0) {
        int r = 0;
        int c = 0;
        int d = 0;
        if (!dequeue(&q, &r, &c, &d)) {
            break;
        }
        if (grid[r][c] == 'E' && best < 0) {
            best = d;
        }
        for (int k = 0; k < 4; k++) {
            int nr = r + dr[k];
            int nc = c + dc[k];
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
                continue;
            }
            if (grid[nr][nc] == '#' || seen[nr][nc]) {
                continue;
            }
            seen[nr][nc] = 1;            /* 入队前就标记 */
            if (enqueue(&q, nr, nc, d + 1)) {
                visited++;
                if (q.size > peak) {
                    peak = q.size;
                }
            }
        }
    }

    if (best < 0) {
        printf("dist=none\n");
    } else {
        printf("dist=%d\n", best);
    }
    printf("visited=%d\n", visited);
    printf("peak=%d\n", peak);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAXR 200
#define MAXC 200

int main(void) {
    int rows = 0;
    int cols = 0;
    if (scanf("%d %d", &rows, &cols) != 2) {
        return 0;
    }

    char grid[MAXR][MAXC + 1];
    for (int i = 0; i < rows; i++) {
        if (scanf("%200s", grid[i]) != 1) {
            return 0;
        }
    }

    /* TODO: 用链表队列实现 BFS：
       1. 找到 S，标记并入队（peak 从 1 开始）；
       2. 出队后按 上、下、左、右 扩展，入队前标记 seen，维护 visited 和 peak；
       3. 记录 E 的距离；队列空后输出 dist / visited / peak。 */
    printf("dist=none\n");
    printf("visited=0\n");
    printf("peak=0\n");
    return 0;
}
```

## 复杂度
时间 O(R × C)：每个可达格子最多入队一次、出队一次，每次扩展检查 4 个邻居。
空间 O(R × C)：`seen` 数组 40000 字节，队列最多同时存 O(R × C) 个节点，每个节点一次 `malloc`（出队即 `free`）。

## 常见错误
### 出队时才标记 `seen` [WA]
如果只在入队前检查 `seen`、却不设置它，同一个格子会被多个前驱重复入队：`peak` 会明显变大，`visited` 也可能重复计数。示例 1 的 `peak` 会从 2 变成 3。标记必须发生在入队之前。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>

#define MAXR 200
#define MAXC 200

typedef struct Node {
    int r;
    int c;
    int dist;
    struct Node *next;
} Node;

typedef struct {
    Node *head;
    Node *tail;
    int size;
} Queue;

static int enqueue(Queue *q, int r, int c, int dist) {
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->r = r;
    node->c = c;
    node->dist = dist;
    node->next = NULL;
    if (q->tail == NULL) {
        q->head = node;
        q->tail = node;
    } else {
        q->tail->next = node;
        q->tail = node;
    }
    q->size++;
    return 1;
}

static int dequeue(Queue *q, int *r, int *c, int *dist) {
    if (q->head == NULL) {
        return 0;
    }
    Node *node = q->head;
    q->head = node->next;
    if (q->head == NULL) {
        q->tail = NULL;
    }
    q->size--;
    *r = node->r;
    *c = node->c;
    *dist = node->dist;
    free(node);
    return 1;
}

int main(void) {
    int rows = 0;
    int cols = 0;
    if (scanf("%d %d", &rows, &cols) != 2) {
        return 0;
    }
    char grid[MAXR][MAXC + 1];
    for (int i = 0; i < rows; i++) {
        if (scanf("%200s", grid[i]) != 1) {
            return 0;
        }
    }
    int sr = -1;
    int sc = -1;
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 'S') {
                sr = r;
                sc = c;
            }
        }
    }
    if (sr < 0) {
        return 0;
    }

    int seen[MAXR][MAXC] = { { 0 } };
    Queue q = { NULL, NULL, 0 };
    enqueue(&q, sr, sc, 0);
    int visited = 0;
    int peak = 1;
    int best = -1;
    const int dr[4] = { -1, 1, 0, 0 };
    const int dc[4] = { 0, 0, -1, 1 };

    while (q.size > 0) {
        int r = 0;
        int c = 0;
        int d = 0;
        dequeue(&q, &r, &c, &d);
        if (seen[r][c]) {
            continue;                    /* 错：重复入队的节点到出队时才丢弃 */
        }
        seen[r][c] = 1;
        visited++;
        if (grid[r][c] == 'E' && best < 0) {
            best = d;
        }
        for (int k = 0; k < 4; k++) {
            int nr = r + dr[k];
            int nc = c + dc[k];
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
                continue;
            }
            if (grid[nr][nc] == '#' || seen[nr][nc]) {
                continue;
            }
            if (enqueue(&q, nr, nc, d + 1) && q.size > peak) {
                peak = q.size;
            }
        }
    }

    if (best < 0) {
        printf("dist=none\n");
    } else {
        printf("dist=%d\n", best);
    }
    printf("visited=%d\n", visited);
    printf("peak=%d\n", peak);
    return 0;
}
```

### 距离从 1 开始算 [WA]
起点的距离是 0，每扩展一层才加一。如果把起点记成 1，或者把"经过的格子数"当成步数，所有 `dist` 都会大 1（示例 1 输出 6 而不是 5）。步数是**边数**，不是节点数。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>

#define MAXR 200
#define MAXC 200

typedef struct Node {
    int r;
    int c;
    int dist;
    struct Node *next;
} Node;

typedef struct {
    Node *head;
    Node *tail;
    int size;
} Queue;

static int enqueue(Queue *q, int r, int c, int dist) {
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->r = r;
    node->c = c;
    node->dist = dist;
    node->next = NULL;
    if (q->tail == NULL) {
        q->head = node;
        q->tail = node;
    } else {
        q->tail->next = node;
        q->tail = node;
    }
    q->size++;
    return 1;
}

static int dequeue(Queue *q, int *r, int *c, int *dist) {
    if (q->head == NULL) {
        return 0;
    }
    Node *node = q->head;
    q->head = node->next;
    if (q->head == NULL) {
        q->tail = NULL;
    }
    q->size--;
    *r = node->r;
    *c = node->c;
    *dist = node->dist;
    free(node);
    return 1;
}

int main(void) {
    int rows = 0;
    int cols = 0;
    if (scanf("%d %d", &rows, &cols) != 2) {
        return 0;
    }
    char grid[MAXR][MAXC + 1];
    for (int i = 0; i < rows; i++) {
        if (scanf("%200s", grid[i]) != 1) {
            return 0;
        }
    }
    int sr = -1;
    int sc = -1;
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 'S') {
                sr = r;
                sc = c;
            }
        }
    }
    if (sr < 0) {
        return 0;
    }

    int seen[MAXR][MAXC] = { { 0 } };
    Queue q = { NULL, NULL, 0 };
    seen[sr][sc] = 1;
    enqueue(&q, sr, sc, 1);              /* 错：起点距离写成了 1 */
    int visited = 1;
    int peak = 1;
    int best = -1;
    const int dr[4] = { -1, 1, 0, 0 };
    const int dc[4] = { 0, 0, -1, 1 };

    while (q.size > 0) {
        int r = 0;
        int c = 0;
        int d = 0;
        dequeue(&q, &r, &c, &d);
        if (grid[r][c] == 'E' && best < 0) {
            best = d;
        }
        for (int k = 0; k < 4; k++) {
            int nr = r + dr[k];
            int nc = c + dc[k];
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
                continue;
            }
            if (grid[nr][nc] == '#' || seen[nr][nc]) {
                continue;
            }
            seen[nr][nc] = 1;
            if (enqueue(&q, nr, nc, d + 1)) {
                visited++;
                if (q.size > peak) {
                    peak = q.size;
                }
            }
        }
    }

    if (best < 0) {
        printf("dist=none\n");
    } else {
        printf("dist=%d\n", best);
    }
    printf("visited=%d\n", visited);
    printf("peak=%d\n", peak);
    return 0;
}
```

### 邻居顺序换成"左、右、上、下" [WA]
距离和可达格子数不受顺序影响，但 `peak` 会变。隐藏用例里有一张网格，用上、下、左、右得到 `peak=3`，换成左、右、上、下就得到 4。题目把顺序写死，就是为了让"什么时候入队"变成可判定的行为。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>

#define MAXR 200
#define MAXC 200

typedef struct Node {
    int r;
    int c;
    int dist;
    struct Node *next;
} Node;

typedef struct {
    Node *head;
    Node *tail;
    int size;
} Queue;

static int enqueue(Queue *q, int r, int c, int dist) {
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->r = r;
    node->c = c;
    node->dist = dist;
    node->next = NULL;
    if (q->tail == NULL) {
        q->head = node;
        q->tail = node;
    } else {
        q->tail->next = node;
        q->tail = node;
    }
    q->size++;
    return 1;
}

static int dequeue(Queue *q, int *r, int *c, int *dist) {
    if (q->head == NULL) {
        return 0;
    }
    Node *node = q->head;
    q->head = node->next;
    if (q->head == NULL) {
        q->tail = NULL;
    }
    q->size--;
    *r = node->r;
    *c = node->c;
    *dist = node->dist;
    free(node);
    return 1;
}

int main(void) {
    int rows = 0;
    int cols = 0;
    if (scanf("%d %d", &rows, &cols) != 2) {
        return 0;
    }
    char grid[MAXR][MAXC + 1];
    for (int i = 0; i < rows; i++) {
        if (scanf("%200s", grid[i]) != 1) {
            return 0;
        }
    }
    int sr = -1;
    int sc = -1;
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 'S') {
                sr = r;
                sc = c;
            }
        }
    }
    if (sr < 0) {
        return 0;
    }

    int seen[MAXR][MAXC] = { { 0 } };
    Queue q = { NULL, NULL, 0 };
    seen[sr][sc] = 1;
    enqueue(&q, sr, sc, 0);
    int visited = 1;
    int peak = 1;
    int best = -1;
    const int dr[4] = { 0, 0, -1, 1 };   /* 错：左、右、上、下 */
    const int dc[4] = { -1, 1, 0, 0 };

    while (q.size > 0) {
        int r = 0;
        int c = 0;
        int d = 0;
        dequeue(&q, &r, &c, &d);
        if (grid[r][c] == 'E' && best < 0) {
            best = d;
        }
        for (int k = 0; k < 4; k++) {
            int nr = r + dr[k];
            int nc = c + dc[k];
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
                continue;
            }
            if (grid[nr][nc] == '#' || seen[nr][nc]) {
                continue;
            }
            seen[nr][nc] = 1;
            if (enqueue(&q, nr, nc, d + 1)) {
                visited++;
                if (q.size > peak) {
                    peak = q.size;
                }
            }
        }
    }

    if (best < 0) {
        printf("dist=none\n");
    } else {
        printf("dist=%d\n", best);
    }
    printf("visited=%d\n", visited);
    printf("peak=%d\n", peak);
    return 0;
}
```

### 找到终点就提前 `break` [WA]
提前结束会漏掉还在队列里的格子，`visited` 和 `peak` 都会偏小；而题目要求的是"完整跑完 BFS 之后"的统计量。距离可以在出队时记录一次，但队列必须清空。

### 出队到空时忘了清 `tail` [RE]
BFS 正常结束时队列会变空，但之后不会再入队，所以这个 bug 在本题不一定立刻触发；换到"排空后继续用"的程序里就会变成悬垂指针。写队列时就把 `if (q->head == NULL) q->tail = NULL;` 当成固定动作。

## 测试用例
### 01 sample 示例 1
```in
3 4
S..#
.#..
...E
```
```out
dist=5
visited=10
peak=2
```

### 02 sample 示例 2
```in
1 2
SE
```
```out
dist=1
visited=2
peak=1
```

### 03 degenerate 终点被墙完全隔开
```in
3 3
S#.
###
..E
```
```out
dist=none
visited=1
peak=1
```

### 04 trap 全开放的 3×3 网格
```in
3 3
S..
...
..E
```
```out
dist=4
visited=9
peak=3
```

### 05 trap 多路径网格，重复入队会改变 peak
```in
4 4
S...
.##.
....
...E
```
```out
dist=6
visited=14
peak=3
```

### 06 normal 带岔路与死胡同的迷宫
```in
4 6
S#....
.#.##.
.#.#..
...#.E
```
```out
dist=14
visited=17
peak=2
```

### 生成 boundary 200×200 全开放网格
```js gen
const cases = [];

function solve(rows, cols, grid) {
  const dr = [-1, 1, 0, 0];
  const dc = [0, 0, -1, 1];
  const seen = Array.from({ length: rows }, () => new Array(cols).fill(false));
  let sr = 0, sc = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 'S') { sr = r; sc = c; }
    }
  }
  const queue = [[sr, sc, 0]];
  let head = 0;
  seen[sr][sc] = true;
  let visited = 1;
  let peak = 1;
  let dist = -1;
  while (head < queue.length) {
    const [r, c, d] = queue[head++];
    if (grid[r][c] === 'E' && dist < 0) dist = d;
    for (let k = 0; k < 4; k++) {
      const nr = r + dr[k];
      const nc = c + dc[k];
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (grid[nr][nc] === '#' || seen[nr][nc]) continue;
      seen[nr][nc] = true;
      queue.push([nr, nc, d + 1]);
      visited++;
      if (queue.length - head > peak) peak = queue.length - head;
    }
  }
  return [`dist=${dist < 0 ? 'none' : dist}`, `visited=${visited}`, `peak=${peak}`].join('\n') + '\n';
}

{
  const rows = 200;
  const cols = 200;
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = new Array(cols).fill('.');
    if (r === 0) row[0] = 'S';
    if (r === rows - 1) row[cols - 1] = 'E';
    grid.push(row.join(''));
  }
  cases.push({
    kind: 'boundary',
    category: '200×200 全开放网格，最短 398 步',
    input: `${rows} ${cols}\n${grid.join('\n')}\n`,
    output: solve(rows, cols, grid),
  });
}

return cases;
```
