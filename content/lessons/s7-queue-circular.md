---
id: s7-queue-circular
---

## 讲解

### 队列要"两头动"，数组却只擅长"一头动"
队列的规则是**先进先出**（FIFO）：元素从队尾进入，从队头离开。于是数组实现立刻遇到一个尴尬：

- 入队：在 `rear` 处写入，然后 `rear++`，O(1)；
- 出队：读 `data[front]`，然后 `front++`，O(1)；

看起来都是 O(1)，但 `front` 只增不减，走到底之后后面明明有空位，却"没有下标可用"了。最直觉的补救是**出队后把剩下的元素整体前移一格**，让队头永远在 `data[0]`——可这次搬移是 O(n)，队列一长就退化成"每出队一个搬一次全部"。

循环数组的思路是：**下标走到末尾就回绕到 0**，把前面出队腾出来的槽重新用起来。这样入队、出队都真正是 O(1)，也不搬任何元素。下面是一个容量为 5 的循环队列（注意数组开了 6 个槽，原因下一节解释）：

```c run id=qc-basic
#include <stdio.h>

#define SLOTS 6      /* 槽位数 = 容量 + 1：多出来的一个永远空着 */
#define CAP   5      /* 队列最多能放 5 个元素 */

typedef struct {
    int data[SLOTS];
    int front;       /* 队头元素的下标 */
    int rear;        /* 下一个入队位置的下标 */
} Queue;

static int q_empty(const Queue *q) {
    return q->front == q->rear;
}

static int q_full(const Queue *q) {
    return (q->rear + 1) % SLOTS == q->front;   /* 关键：取模 */
}

static int q_count(const Queue *q) {
    return (q->rear - q->front + SLOTS) % SLOTS;
}

static int q_push(Queue *q, int value) {
    if (q_full(q)) {
        return 0;
    }
    q->data[q->rear] = value;
    q->rear = (q->rear + 1) % SLOTS;
    return 1;
}

static int q_pop(Queue *q, int *out) {
    if (q_empty(q)) {
        return 0;
    }
    *out = q->data[q->front];
    q->front = (q->front + 1) % SLOTS;
    return 1;
}

int main(void) {
    Queue q = { { 0 }, 0, 0 };

    for (int i = 1; i <= CAP; i++) {
        q_push(&q, i * 10);
    }
    printf("push 1..5: front=%d rear=%d count=%d\n", q.front, q.rear, q_count(&q));
    printf("push 6 -> %d（满，容量只有 5）\n", q_push(&q, 60));

    int v = 0;
    q_pop(&q, &v);
    printf("pop -> %d\n", v);
    q_pop(&q, &v);
    printf("pop -> %d\n", v);

    /* 出队腾出了槽，rear 从 5 回绕到 0，继续写 */
    printf("push 6 -> %d, push 7 -> %d\n", q_push(&q, 60), q_push(&q, 70));
    printf("after wrap: front=%d rear=%d count=%d\n", q.front, q.rear, q_count(&q));

    printf("drain:");
    while (q_pop(&q, &v)) {
        printf(" %d", v);
    }
    printf("\n");
    printf("final count=%d\n", q_count(&q));
    return 0;
}
```
```output
push 1..5: front=0 rear=5 count=5
push 6 -> 0（满，容量只有 5）
pop -> 10
pop -> 20
push 6 -> 1, push 7 -> 1
after wrap: front=2 rear=1 count=5
drain: 30 40 50 60 70
final count=0
```

最后 `front=2`、`rear=1` 就是"绕回去"的样子：队列里存的是 `data[2..5]` 和 `data[0]` 这 5 个元素，逻辑上它们从队头到队尾是连续的，只是物理下标断成了两段。

### 不循环的代价：每次出队都搬一遍
循环数组不是唯一的选择。另一个极端是"让队头永远在 `data[0]`"：出队时把后面的元素整体往前挪一格。它的逻辑更简单，但代价是每次出队都要写 O(n) 个元素。下面把同样的 4 次入队、4 次出队分别在两种实现上跑一遍，并数一数搬移了多少次：

```c run id=qc-shift
#include <stdio.h>

#define CAP 5

/* 搬移法：队头永远在 data[0] */
static int shift_data[CAP];
static int shift_size;
static int shift_moves;

static int shift_push(int value) {
    if (shift_size == CAP) {
        return 0;
    }
    shift_data[shift_size++] = value;
    return 1;
}

static int shift_pop(int *out) {
    if (shift_size == 0) {
        return 0;
    }
    *out = shift_data[0];
    for (int i = 1; i < shift_size; i++) {
        shift_data[i - 1] = shift_data[i];
        shift_moves++;                 /* 每搬一个元素记一次 */
    }
    shift_size--;
    return 1;
}

/* 循环法：front 和 rear 取模回绕 */
static int ring_data[6];
static int ring_front;
static int ring_rear;

static int ring_push(int value) {
    if ((ring_rear + 1) % 6 == ring_front) {
        return 0;
    }
    ring_data[ring_rear] = value;
    ring_rear = (ring_rear + 1) % 6;
    return 1;
}

static int ring_pop(int *out) {
    if (ring_front == ring_rear) {
        return 0;
    }
    *out = ring_data[ring_front];
    ring_front = (ring_front + 1) % 6;
    return 1;                          /* 一个元素都没搬 */
}

int main(void) {
    int v = 0;
    for (int i = 1; i <= 4; i++) {
        shift_push(i);
        ring_push(i);
    }

    printf("shift queue:");
    while (shift_pop(&v)) {
        printf(" %d", v);
    }
    printf("\n  moves=%d\n", shift_moves);

    printf("circular queue:");
    while (ring_pop(&v)) {
        printf(" %d", v);
    }
    printf("\n  moves=0\n");
    return 0;
}
```
```output
shift queue: 1 2 3 4
  moves=6
circular queue: 1 2 3 4
  moves=0
```

4 个元素出队一共搬了 `3 + 2 + 1 + 0 = 6` 次；元素越多，搬移次数按平方增长。循环队列正是用"让下标回绕"换掉了这整块搬移成本。

### 为什么必须空出一个槽：`front == rear` 的二义性
如果没有额外信息，只用两个下标，队列的"空"和"满"会撞在一起：

- 空队列：`front == rear`，两者都指向"没有元素"的位置；
- 满队列：如果所有槽都放满，`rear` 绕一圈回到 `front`，仍然有 `front == rear`。

同一个条件表示两种完全不同的状态，程序无法区分。工程上有三种常见解法：

| 解法 | 判空 | 判满 | 容量为 C 时需要 | 代价 |
|---|---|---|---|---|
| **留一个空位** | `front == rear` | `(rear + 1) % slots == front` | **C + 1 个槽** | 浪费一个槽，但不需要额外字段 |
| 计数器 | `count == 0` | `count == C` | C 个槽 | 多维护一个 `count`，每次增删都要同步 |
| 标志位 | `front == rear && !full` | `front == rear && full` | C 个槽 | 多一个 `full` 标志，逻辑分支更绕 |

"留一个空位"的代价最容易接受：**只用换来一个"永远不存数据的槽"，就换来 O(1) 且无额外字段的空满判断**。规则是——队列容量为 C 时，数组要开 C+1 个槽；`rear` 永远指向一个空槽，所以 `(rear + 1) % slots == front` 就表示"再往前走一步就撞上队头"，即满。

下面把三种方法放在同一操作序列上跑一遍，它们的**容量行为完全一致**，差别只在用了几个槽、多了哪些字段：

```c run id=qc-three-ways
#include <stdio.h>

/* 方法 A：留一个空位，容量 5 -> 6 个槽 */
typedef struct {
    int data[6];
    int front;
    int rear;
} A;

static int a_push(A *q, int v) {
    if ((q->rear + 1) % 6 == q->front) {
        return 0;
    }
    q->data[q->rear] = v;
    q->rear = (q->rear + 1) % 6;
    return 1;
}

static int a_pop(A *q, int *out) {
    if (q->front == q->rear) {
        return 0;
    }
    *out = q->data[q->front];
    q->front = (q->front + 1) % 6;
    return 1;
}

/* 方法 B：计数器，容量 5 -> 5 个槽 */
typedef struct {
    int data[5];
    int front;
    int rear;
    int count;
} B;

static int b_push(B *q, int v) {
    if (q->count == 5) {
        return 0;
    }
    q->data[q->rear] = v;
    q->rear = (q->rear + 1) % 5;
    q->count++;
    return 1;
}

static int b_pop(B *q, int *out) {
    if (q->count == 0) {
        return 0;
    }
    *out = q->data[q->front];
    q->front = (q->front + 1) % 5;
    q->count--;
    return 1;
}

/* 方法 C：标志位，容量 5 -> 5 个槽 */
typedef struct {
    int data[5];
    int front;
    int rear;
    int full;
} C;

static int c_push(C *q, int v) {
    if (q->front == q->rear && q->full) {
        return 0;
    }
    q->data[q->rear] = v;
    q->rear = (q->rear + 1) % 5;
    q->full = (q->rear == q->front);
    return 1;
}

static int c_pop(C *q, int *out) {
    if (q->front == q->rear && !q->full) {
        return 0;
    }
    *out = q->data[q->front];
    q->front = (q->front + 1) % 5;
    q->full = 0;
    return 1;
}

int main(void) {
    A a = { { 0 }, 0, 0 };
    int v = 0;
    int ok = 0;
    for (int i = 0; i < 5; i++) {
        ok += a_push(&a, i);
    }
    int sixth = a_push(&a, 99);
    int pops = 0;
    while (a_pop(&a, &v)) {
        pops++;
    }
    printf("A 留空位: slots=6 pushed=%d sixth=%d popped=%d sixth_pop=%d\n", ok, sixth, pops, a_pop(&a, &v));

    B b = { { 0 }, 0, 0, 0 };
    ok = 0;
    for (int i = 0; i < 5; i++) {
        ok += b_push(&b, i);
    }
    sixth = b_push(&b, 99);
    pops = 0;
    while (b_pop(&b, &v)) {
        pops++;
    }
    printf("B 计数器: slots=5 pushed=%d sixth=%d popped=%d sixth_pop=%d\n", ok, sixth, pops, b_pop(&b, &v));

    C c = { { 0 }, 0, 0, 0 };
    ok = 0;
    for (int i = 0; i < 5; i++) {
        ok += c_push(&c, i);
    }
    sixth = c_push(&c, 99);
    pops = 0;
    while (c_pop(&c, &v)) {
        pops++;
    }
    printf("C 标志位: slots=5 pushed=%d sixth=%d popped=%d sixth_pop=%d\n", ok, sixth, pops, c_pop(&c, &v));
    return 0;
}
```
```output
A 留空位: slots=6 pushed=5 sixth=0 popped=5 sixth_pop=0
B 计数器: slots=5 pushed=5 sixth=0 popped=5 sixth_pop=0
C 标志位: slots=5 pushed=5 sixth=0 popped=5 sixth_pop=0
```

### 回绕时下标到底怎么走
用取模运算表达回绕是最不容易写错的方式：

- 入队后：`rear = (rear + 1) % slots`；
- 出队后：`front = (front + 1) % slots`；
- 元素个数：`(rear - front + slots) % slots`（加 `slots` 是为了避免负余数）。

以 `slots = 6`、`front = 2`、`rear = 1` 为例，队列里的 5 个元素物理上分布成这样：

```memory title="循环队列绕回后的状态：slots=6、front=2、rear=1（下标不是地址）"
下标 | data[] 内容 | 说明
0 | 70 | 逻辑上排在最后：队尾附近
1 | 空 | rear 指向这里，是下一个入队位置（满队列把唯一的空位留在这里）
2 | 30 | 队头：front 指向这里，下一个出队的就是它
3 | 40 | 有效元素
4 | 50 | 有效元素
5 | 60 | 有效元素
```

从 `front=2` 开始按 `+1 取模 6` 数 5 步：`2 → 3 → 4 → 5 → 0`，正好是 `30 40 50 60 70`。**逻辑顺序连续、物理下标可能断成两段**，这就是"循环"二字的全部含义。

也可以不用取模、用 `if (rear == slots) rear = 0;`，效果一样，但每个改动点都要写一次判断；取模写法把"回绕"集中到一处，少一个分支就少一个忘记回绕的机会。

### 循环数组队列的取舍
- 优点：入队/出队严格 O(1)，不搬元素、不 `malloc`；内存连续，缓存友好；容量固定时最省心。
- 缺点：容量必须事先确定；容量为 C 就要开 C+1 个槽（留空位法）；队空、队满、取模三个条件必须同时正确，错一个就会静默出错很久。
- 对比动态数组：动态数组队列可以扩容，但出队要从头部搬移或者用 `front` 偏移，最终还是要处理回绕问题；所以"循环"和"扩容"经常一起用（扩容时把元素按 `front` 起点的逻辑顺序抄到新数组并重置 `front=0`、`rear=count`）。

## 编译与运行

用 gcc 或 clang 编译，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra queue_circular.c -o queue_circular
./queue_circular
```

```bash
clang -std=c17 -Wall -Wextra queue_circular.c -o queue_circular
./queue_circular
```

循环队列的下标错误往往要在"绕回去之后"才暴露，所以测试时别只用小数据按顺序跑一遍：

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=address,undefined queue_circular.c -o queue_circular
./queue_circular
```

建议刻意构造"填满 → 出队几个 → 再入队"的序列，逼 `rear` 和 `front` 都绕过 0；只要漏掉一次取模，ASan 就会报越界。

## 常见错误

### 判满只写 `rear + 1 == front`，忘了取模 [WA]
当 `rear` 停在最后一个槽、`front` 已经回绕到 0 时，正确的满条件是 `(rear + 1) % slots == front`（成立），而 `rear + 1 == front` 不成立。少了取模，队列在"刚好绕一圈"的位置会被误判为没满，接着覆盖队头或把计数搞乱。

```c
if (q->rear + 1 == q->front) {   /* 错：rear 在末尾时永远不成立 */
    return 0;
}
```

### 用"容量"而不是"槽位数"取模 [WA]
留一个空位时数组有 `C + 1` 个槽，所有取模都必须用 `slots = C + 1`。写成 `% C` 会让最后一个槽永远用不到，容量凭空少一个，隐藏用例里第 C 个元素就会被判"满"。

### 把 `front` 的含义搞混 [WA]
两种约定都合法，但不能混：`front` 指向队头元素，则出队顺序是"先取值再前移"；`front` 指向队头前一个空位，则要先前移再取值。混用会整体错一位，而且空队列判断看起来仍然"正常"，很难发现。

### 出队后 `front++` 不取模 [RE]
`front` 一旦等于 `slots`，下一次 `data[front]` 就越界。ASan 会报 `heap-buffer-overflow`/`stack-buffer-overflow`，判 `RE`。所有让下标前进的地方都必须回绕。

## 客观题

### q-s7-queue-circular-1 single
循环数组队列采用"留一个空位"的方法，数组有 `slots` 个槽、`front` 指向队头元素、`rear` 指向下一个入队位置。下面哪一条描述是正确的？

- [x] 队列最多能放 `slots - 1` 个元素，满的条件是 `(rear + 1) % slots == front`
  > 正确。留一个空位意味着始终有一个槽不存数据；当 `rear` 再走一格就撞上 `front` 时队列满。代价是容量比槽位数少一，但换来 O(1) 且无需额外字段的空满判断。
- [ ] 队列最多能放 `slots` 个元素，满的条件是 `front == rear`
  > 错。`front == rear` 同时也是空队列的条件，无法区分空和满；这正是需要留一个空位（或计数器/标志位）的原因。若声称能放满 `slots` 个，就必须额外维护 `count` 或 `full`，不能用这条判满。
- [ ] 满的条件是 `rear + 1 == front`，不需要取模
  > 错。当 `rear` 在最后一个槽、`front` 已经回绕到 0 时，`rear + 1 == front` 不成立，但队列实际上已经满了。必须写成 `(rear + 1) % slots == front`。
- [ ] 元素个数可以直接用 `rear - front` 计算，回绕时会自动变成负数再取绝对值
  > 错。回绕后 `rear - front` 是负数，而 C 的整数除法/取模对负数向零截断，取绝对值也不等于逻辑长度。正确写法是 `(rear - front + slots) % slots`。
