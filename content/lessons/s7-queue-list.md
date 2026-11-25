---
id: s7-queue-list
---

## 讲解

### 队列的两端各管一件事，链表正好给得起
队列是**先进先出**（FIFO）：从队尾入队，从队头出队。用单向链表实现时，两个端点的职责分得非常清楚：

- `head` 指向**队头**：`dequeue` 在这里摘节点；
- `tail` 指向**队尾**：`enqueue` 把新节点接在它后面。

有了 `tail`，入队不需要从头遍历找尾节点，`enqueue` 和 `dequeue` 都是 O(1)。代价是必须同时维护两个指针，而且它们之间有一条不能破的不变式：

> `head == NULL` 当且仅当 `tail == NULL`；队列非空时 `tail->next` 必须是 `NULL`。

```c run id=ql-basic
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

typedef struct {
    Node *head;      /* 队头：出队端 */
    Node *tail;      /* 队尾：入队端 */
    int size;
} Queue;

static int enqueue(Queue *q, int value) {
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->value = value;
    node->next = NULL;
    if (q->tail == NULL) {           /* 空队列：head 和 tail 一起指向它 */
        q->head = node;
        q->tail = node;
    } else {                          /* 非空：接在尾节点后面，再更新 tail */
        q->tail->next = node;
        q->tail = node;
    }
    q->size++;
    return 1;
}

static int dequeue(Queue *q, int *out) {
    if (q->head == NULL) {
        return 0;
    }
    Node *node = q->head;
    q->head = node->next;
    if (q->head == NULL) {            /* 关键：摘掉的是最后一个节点 */
        q->tail = NULL;               /* 必须同时把 tail 清空 */
    }
    q->size--;
    *out = node->value;
    free(node);
    return 1;
}

static int peek(const Queue *q, int *out) {
    if (q->head == NULL) {
        return 0;
    }
    *out = q->head->value;
    return 1;
}

static void destroy(Queue *q) {
    int value = 0;
    while (dequeue(q, &value)) {
        /* 一直出队到空，节点就全部释放了 */
    }
}

int main(void) {
    Queue q = { NULL, NULL, 0 };
    int v = 0;

    for (int i = 1; i <= 3; i++) {
        if (!enqueue(&q, i * 10)) {
            return 1;
        }
    }
    printf("enqueue 10 20 30 -> size=%d\n", q.size);
    if (peek(&q, &v)) {
        printf("front=%d\n", v);
    }

    if (dequeue(&q, &v)) {
        printf("dequeue -> %d\n", v);
    }
    if (dequeue(&q, &v)) {
        printf("dequeue -> %d\n", v);
    }
    printf("size=%d head=%d tail=%d\n", q.size, q.head->value, q.tail->value);

    if (dequeue(&q, &v)) {
        printf("dequeue -> %d\n", v);
    }
    printf("size=%d empty_head=%d empty_tail=%d\n", q.size, q.head == NULL, q.tail == NULL);
    printf("dequeue empty -> %d\n", dequeue(&q, &v));
    destroy(&q);
    return 0;
}
```
```output
enqueue 10 20 30 -> size=3
front=10
dequeue -> 10
dequeue -> 20
size=1 head=30 tail=30
dequeue -> 30
size=0 empty_head=1 empty_tail=1
dequeue empty -> 0
```

注意 `size=1` 时 `head` 和 `tail` 指向**同一个节点**。所以"`head == tail`"不是空队列的判据（单元素时也相等），空队列的唯一判据是 `head == NULL`（或者等价的 `size == 0`）。

### 出队到空：tail 必须跟着变成 NULL
最容易漏的一步就在 `dequeue` 的 `if (q->head == NULL) { q->tail = NULL; }`。如果只移动 `head`、不管 `tail`：

- `tail` 仍然指向刚刚被 `free` 的那个节点，成为悬垂指针；
- 下一次 `enqueue` 走的是"非空"分支，执行 `q->tail->next = node`——往已经释放的内存里写，ASan 报 `heap-use-after-free`，判 `RE`；
- 即使没有立刻崩溃，`head` 是 `NULL` 而 `tail` 不是，不变式已经被破坏，后面所有操作都不可信。

下面对比"一批任务处理完、队列空了、下一批任务再来"的场景。这正是 tail 重置问题最容易暴露的地方：

```c run id=ql-reuse
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

typedef struct {
    Node *head;
    Node *tail;
    int size;
} Queue;

static int enqueue(Queue *q, int value) {
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->value = value;
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

static int dequeue(Queue *q, int *out) {
    if (q->head == NULL) {
        return 0;
    }
    Node *node = q->head;
    q->head = node->next;
    if (q->head == NULL) {
        q->tail = NULL;
    }
    q->size--;
    *out = node->value;
    free(node);
    return 1;
}

int main(void) {
    Queue q = { NULL, NULL, 0 };
    int served = 0;
    int v = 0;

    for (int batch = 1; batch <= 2; batch++) {
        int first = batch * 10 + 1;
        for (int i = 0; i < 4; i++) {
            if (!enqueue(&q, first + i)) {
                return 1;
            }
        }
        printf("batch %d enqueued, size=%d\n", batch, q.size);

        while (dequeue(&q, &v)) {
            printf(" %d", v);
            served++;
        }
        printf("\n");
        printf("  after drain: size=%d head_null=%d tail_null=%d\n",
               q.size, q.head == NULL, q.tail == NULL);
    }
    printf("served=%d\n", served);
    return 0;
}
```
```output
batch 1 enqueued, size=4
 11 12 13 14
  after drain: size=0 head_null=1 tail_null=1
batch 2 enqueued, size=4
 21 22 23 24
  after drain: size=0 head_null=1 tail_null=1
served=8
```

如果漏了 `q->tail = NULL`，第一批排空后 `tail` 就是悬垂指针，第二批的第一次 `enqueue` 就会踩进已释放的内存。样例通常只跑一次队列，未必能撞上；但只要程序里出现"排空后再用"，迟早会炸。

### 内存形状：两个指针在栈上，节点在堆上
```memory title="链表队列：入队 10、20、30 之后（地址只表示先后关系）"
位置 | 内容 | 说明
栈上 q.head | 指向节点 A | 队头：dequeue 从这里摘，最老的元素
栈上 q.tail | 指向节点 C | 队尾：enqueue 接在它后面
栈上 q.size | 3 | 元素个数
堆上节点 A | value=10, next=&B | 最早入队，下一个出队
堆上节点 B | value=20, next=&C | 中间节点
堆上节点 C | value=30, next=NULL | 最后入队；它的 next 必须是 NULL，这是队尾的标志
```

入队时先让新节点的 `next = NULL`，再接上 `tail->next`，最后才移动 `tail`。这三步的顺序很重要：**先接链，再动 tail**，中间任何一步失败都不会留下断了尾巴的队列。出队时先保存 `head`，移动到 `head->next`，必要时清 `tail`，最后取值并 `free`。

### 链表队列 vs 循环数组队列
两种实现都满足 FIFO、两端操作都是 O(1)，选择取决于"容量是否已知"：

| | 循环数组队列 | 链表队列 |
|---|---|---|
| 容量 | 固定（或扩容时搬一次） | 只受堆大小限制 |
| 每次入队 | 写一个槽 + 取模 | 一次 `malloc` |
| 空/满判断 | 需要留空位、计数器或标志位 | 看 `head == NULL` 即可 |
| 内存局部性 | 连续，缓存友好 | 节点分散，缓存不友好 |
| 额外开销 | 几乎没有，可能浪费一个槽 | 每个节点一个 `next` + 分配器元数据 |
| 典型场景 | 嵌入式、固定缓冲区、BFS 网格 | 元素数量不可预估、元素很大、节点本来就在堆上 |

一句话：**容量能预估就用循环数组，不能预估就用链表；两者都要在"出队到空"这个边界上多测一遍。**

### 应用：BFS 的层序遍历
队列最经典的算法应用是广度优先搜索（BFS）：从起点出发，先访问所有距离为 1 的点，再访问距离为 2 的点……"先来先服务"正好就是队列的语义。

下面在 3×3 的网格上做 BFS，按**层**输出访问到的格子。为了实现"逐层"，每轮先记下当前队列长度 `n`，然后只处理这 `n` 个节点——这一轮里新入队的节点属于下一层：

```c run id=ql-bfs
#include <stdio.h>
#include <stdlib.h>

#define ROWS 3
#define COLS 3

typedef struct Point {
    int r;
    int c;
} Point;

typedef struct Node {
    Point point;
    struct Node *next;
} Node;

typedef struct {
    Node *head;
    Node *tail;
    int size;
} PointQueue;

static int enqueue(PointQueue *q, Point p) {
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->point = p;
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

static int dequeue(PointQueue *q, Point *out) {
    if (q->head == NULL) {
        return 0;
    }
    Node *node = q->head;
    q->head = node->next;
    if (q->head == NULL) {
        q->tail = NULL;
    }
    q->size--;
    *out = node->point;
    free(node);
    return 1;
}

int main(void) {
    char grid[ROWS][COLS + 1] = {
        "S..",
        ".#.",
        "..E",
    };
    int visited[ROWS][COLS] = { { 0 } };
    PointQueue q = { NULL, NULL, 0 };

    Point start = { 0, 0 };
    visited[start.r][start.c] = 1;
    if (!enqueue(&q, start)) {
        return 1;
    }

    const int dr[4] = { -1, 1, 0, 0 };   /* 上、下、左、右 */
    const int dc[4] = { 0, 0, -1, 1 };
    int level = 0;

    while (q.size > 0) {
        int n = q.size;                  /* 当前层的节点数，先固定下来 */
        printf("level %d:", level);
        for (int i = 0; i < n; i++) {
            Point p;
            if (!dequeue(&q, &p)) {
                break;
            }
            printf(" (%d,%d)", p.r, p.c);
            for (int d = 0; d < 4; d++) {
                int nr = p.r + dr[d];
                int nc = p.c + dc[d];
                if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) {
                    continue;
                }
                if (grid[nr][nc] == '#' || visited[nr][nc]) {
                    continue;
                }
                visited[nr][nc] = 1;     /* 入队时就标记，别等出队 */
                Point next = { nr, nc };
                if (!enqueue(&q, next)) {
                    return 1;
                }
            }
        }
        printf("\n");
        level++;
    }
    return 0;
}
```
```output
level 0: (0,0)
level 1: (1,0) (0,1)
level 2: (2,0) (0,2)
level 3: (2,1) (1,2)
level 4: (2,2)
```

这里有两个关键点都和队列有关：

1. **入队时就标记 `visited`**。如果等出队再标记，同一个点会被多个前驱重复入队，队列峰值变大、访问次数也变多；
2. **层数用"处理前的队列长度"切分**。直接用一个 `level` 变量在循环里自增，会把不同层的点混在一起。

## 编译与运行

用 gcc 或 clang 编译，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra queue_list.c -o queue_list
./queue_list
```

```bash
clang -std=c17 -Wall -Wextra queue_list.c -o queue_list
./queue_list
```

链表队列的 bug 往往在"排空后再次入队"时出现，测试时一定要覆盖这个序列；建议同时开着 sanitizer：

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=address,undefined queue_list.c -o queue_list
./queue_list
```

## 常见错误

### 出队最后一个节点时忘了把 `tail` 置 `NULL` [RE]
`head` 变成 `NULL` 而 `tail` 仍指向已释放的节点，下一次入队会往释放后的内存里写，ASan 报 `heap-use-after-free`。

```c
static int dequeue(Queue *q, int *out) {
    if (q->head == NULL) {
        return 0;
    }
    Node *node = q->head;
    q->head = node->next;
    /* 错：少了 if (q->head == NULL) q->tail = NULL; */
    q->size--;
    *out = node->value;
    free(node);
    return 1;
}
```

### 用 `head == tail` 判断队列为空 [WA]
单元素队列里 `head` 和 `tail` 指向同一个节点，`head == tail` 成立，但队列**不空**。空队列的判据只能是 `head == NULL`（或 `size == 0`）。用错判据会让单元素队列被当成空，第一个元素永远出不来。

### 入队第一个节点时只改了 `tail`、没改 `head` [RE]
空队列入队要同时设置两个指针。只设 `tail` 的话，`head` 还是 `NULL`，队列看起来是空的，下一个节点又会被当成"第一个节点"覆盖掉 `head`，原来的节点从此丢失（泄漏），`head` 和 `tail` 也不再指向同一条链。

### 出队只移动指针、忘记 `free` 节点 [LEAK]
`dequeue` 里如果只写 `q->head = node->next;` 而不 `free(node)`，每出队一个元素就泄漏一块内存。本题的检查思路和栈一样：分配次数必须等于释放次数。

## 客观题

### q-s7-queue-list-1 single
用带头尾指针的单向链表实现队列，`head` 指向队头、`tail` 指向队尾。当 `dequeue` 摘掉队列中**最后一个**节点时，下面哪种做法是正确的？

- [x] 让 `head = head->next` 之后，判断 `head == NULL`，若成立则把 `tail` 也置为 `NULL`
  > 正确。摘掉最后一个节点后队列变空，`head` 已经是 `NULL`；如果不同时清空 `tail`，它就指向刚被 `free` 的节点，成为悬垂指针，下一次入队会往已释放内存里写。
- [ ] 只把 `head` 置为 `NULL` 即可，`tail` 保持不动，等下次入队时再覆盖
  > 错。`tail` 此时指向已经释放的节点；下一次入队会走"非空"分支执行 `tail->next = node`，这是释放后使用。必须立即清空 `tail`。
- [ ] 把 `head` 和 `tail` 都置为 `NULL` 之后，还要把 `size` 减一，但节点不需要 `free`
  > 错。指针置空不等于释放内存：被摘下的节点必须 `free`，否则每出队一个就泄漏一块。`size` 减一和 `free` 是两件都要做的事。
- [ ] 因为 `head == tail` 表示队列为空，所以只要把 `tail` 置为 `NULL`，`head` 会自动变成 `NULL`
  > 错。`head` 和 `tail` 是两个独立的变量，修改一个不会影响另一个；而且单元素队列里 `head == tail` 成立却不空，不能用它判断空队列。
