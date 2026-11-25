---json
{
  "id": "p-s7-queue-circular-2",
  "title": "固定槽位循环队列接口：push / pop / front / count / clear",
  "difficulty": "L4",
  "knowledgePoints": ["s7-queue-circular"],
  "special": "ds-implementation",
  "judge": { "mode": "function", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
循环队列的"留一个空位"方案有一个容易忽略的细节：**容量为 C 的队列需要 C + 1 个槽**。本题把这一点固定进接口：结构体里有 `slots` 个槽，其中永远有一个空着，所以队列最多放 `slots - 1` 个元素。

请在 `solution.c` 中实现下面六个函数，头文件 `queue.h` 由测试驱动提供：

```c
void queue_init(CircularQueue *q, int capacity);   /* slots = capacity + 1，front = rear = 0 */
int  queue_push(CircularQueue *q, int value);      /* 成功 1；满 0（队列不变） */
int  queue_pop(CircularQueue *q, int *out);        /* 成功时写到 *out 并返回 1；空返回 0 */
int  queue_front(const CircularQueue *q, int *out);/* 只看队头；空返回 0 */
int  queue_count(const CircularQueue *q);          /* 当前元素个数 */
void queue_clear(CircularQueue *q);                /* 清空：front = rear = 0 */
```

约定与要求：

1. `front` 指向**队头元素**，`rear` 指向**下一个入队位置**，空队列是 `front == rear`；
2. 满的条件是 `(rear + 1) % slots == front`——`rear` 再走一格就会撞上 `front`；
3. 所有下标前进都必须对 `slots` 取模，回绕不能靠 `if` 漏写；
4. `queue_count` 必须支持回绕状态，不能简单地返回 `rear - front`；
5. `queue_front` 的参数是 `const CircularQueue *`，不允许修改结构体；
6. `queue_clear` 之后队列必须回到初始的空状态，还能继续正常入队。

你只需要提交 `solution.c`，不要写 `main`，也不要提交 `queue.h`。

## 输入格式
（由隐藏的测试驱动读取，供你理解测试方式）

第一行一个整数 `capacity`（1 ≤ capacity ≤ 1023）。
第二行一个整数 `n`（1 ≤ n ≤ capacity）。
第三行 `n` 个整数，是第一批入队的值。

## 输出格式
（由隐藏的测试驱动输出）共 22 行：

```
init_count=<init 之后的元素个数>
init_empty=<空队列上 queue_front 返回 0 时为 1>
init_pop=<空队列上 queue_pop 的返回值>
push_new=<第一批 n 个值成功入队的个数>
count_n=<第一批入队后的元素个数>
front_first=<队头值；队列空时输出 none>
fill_ok=<再补到 capacity 个元素时成功的个数>
full_push=<队列已满时再 push 一个的返回值>
count_full=<满队列的元素个数>
pop_head=<前 min(5, capacity/2) 次出队的值，空格分隔；没有则为空>
count_half=<出队 capacity/2 次后的元素个数>
front_after=<此时队头值；空则 none>
wrap_ok=<再入队 capacity/2 个新值时成功的个数>
count_wrap=<再次填满后的元素个数>
drain=<把队列弹空一共弹出几个>
drain_sum=<这些被弹出值的和>
empty_pop=<空队列上 queue_pop 的返回值>
empty_front=<空队列上 queue_front 的返回值>
empty_count=<空队列的 queue_count>
clear_count=<push 两个值再 queue_clear 之后的元素个数>
clear_front=<clear 之后 queue_front 的返回值>
reuse=<clear 之后 push 9 再 pop 得到的值>
```

所有和都远小于 `long long` 的范围，测试驱动用 `long long` 累加。

## 数据范围
1 ≤ capacity ≤ 1023
1 ≤ n ≤ capacity
-10⁹ ≤ 每个入队值 ≤ 10⁹

槽位数最多 1024，全部在栈上的一个结构体里，不涉及堆内存。输出固定 22 行。

## 示例
### 示例 1
```in
5
3
10 20 30
```
```out
init_count=0
init_empty=1
init_pop=0
push_new=3
count_n=3
front_first=10
fill_ok=2
full_push=0
count_full=5
pop_head=10 20
count_half=3
front_after=30
wrap_ok=2
count_wrap=5
drain=5
drain_sum=6032
empty_pop=0
empty_front=0
empty_count=0
clear_count=0
clear_front=0
reuse=9
```
> 容量 5：先放 `10 20 30`，再补 `1000 1001` 到满。`capacity/2 = 2`，弹出 `10 20`，队头变成 30。之后出队腾出 2 个槽，正好再放 `2000 2001`，队列又满了。最后依次弹出 `30 1000 1001 2000 2001`，和是 6032。

### 示例 2（边界：容量 1，只有一个槽可用）
```in
1
1
-5
```
```out
init_count=0
init_empty=1
init_pop=0
push_new=1
count_n=1
front_first=-5
fill_ok=0
full_push=0
count_full=1
pop_head=
count_half=1
front_after=-5
wrap_ok=0
count_wrap=1
drain=1
drain_sum=-5
empty_pop=0
empty_front=0
empty_count=0
clear_count=0
clear_front=0
reuse=9
```
> 容量为 1 时 `slots = 2`，最多放 1 个元素。`capacity/2 = 0`，所以一次都不出队，`pop_head=` 后面是空的，`front_after` 仍然是 −5。这个用例能直接抓住"忘了给 slots 加一"的实现（它会认为容量是 1、实际只能放 0 个）。

## 提示
### 第 1 层
先只维护两个下标：`push` 写 `data[rear]` 再让 `rear` 前进一格并取模；`pop`/`front` 判 `front == rear` 后读 `data[front]`，`pop` 再让 `front` 前进一格并取模。`queue_count` 是 `(rear - front + slots) % slots`。

### 第 2 层
`queue_init` 里 `slots = capacity + 1`；这是"留一个空位"的全部秘密。`push` 的判满是 `(rear + 1) % slots == front`，不是 `rear == front`。`queue_clear` 只重置 `front` 和 `rear`，`slots` 保持不变。

### 第 3 层
检查每个函数在回绕状态下的正确性：构造 `front` 接近 `slots`、`rear` 已经绕回 0 的状态（多 push 几次再 pop 几次），确认 `count` 不为负、`pop` 读的是 `data[front]`、`push` 写的是 `data[rear]`。`out` 允许为 `NULL` 时先判空；测试驱动总是传有效指针，但养成习惯更好。

## 参考代码
```c file=solution.c
#include "queue.h"

void queue_init(CircularQueue *q, int capacity) {
    q->slots = capacity + 1;      /* 留一个空位 */
    q->front = 0;
    q->rear = 0;
}

int queue_push(CircularQueue *q, int value) {
    if ((q->rear + 1) % q->slots == q->front) {
        return 0;                 /* 满：再走一格就撞上队头 */
    }
    q->data[q->rear] = value;
    q->rear = (q->rear + 1) % q->slots;
    return 1;
}

int queue_pop(CircularQueue *q, int *out) {
    if (q->front == q->rear) {
        return 0;
    }
    if (out != NULL) {
        *out = q->data[q->front];
    }
    q->front = (q->front + 1) % q->slots;
    return 1;
}

int queue_front(const CircularQueue *q, int *out) {
    if (q->front == q->rear) {
        return 0;
    }
    if (out != NULL) {
        *out = q->data[q->front];
    }
    return 1;
}

int queue_count(const CircularQueue *q) {
    return (q->rear - q->front + q->slots) % q->slots;
}

void queue_clear(CircularQueue *q) {
    q->front = 0;
    q->rear = 0;
}
```

## 初始代码
```c file=solution.c
#include "queue.h"

void queue_init(CircularQueue *q, int capacity) {
    q->slots = capacity + 1;
    q->front = 0;
    q->rear = 0;
}

int queue_push(CircularQueue *q, int value) {
    (void)q;
    (void)value;
    /* TODO: 用 (rear + 1) % slots == front 判满；否则写入 data[rear]、rear 取模前进、返回 1 */
    return 0;
}

int queue_pop(CircularQueue *q, int *out) {
    (void)q;
    (void)out;
    /* TODO: front == rear 返回 0；否则把 data[front] 写到 *out、front 取模前进 */
    return 0;
}

int queue_front(const CircularQueue *q, int *out) {
    (void)q;
    (void)out;
    /* TODO: 空返回 0；否则只读取队头，不能修改结构体 */
    return 0;
}

int queue_count(const CircularQueue *q) {
    (void)q;
    /* TODO: 返回 (rear - front + slots) % slots */
    return 0;
}

void queue_clear(CircularQueue *q) {
    (void)q;
    /* TODO: 让队列回到空状态 */
}
```

## 测试驱动
```c file=queue.h
#ifndef QUEUE_H
#define QUEUE_H

#include <stddef.h>

#define QUEUE_MAX_SLOTS 1024

/*
 * 固定槽位数组的循环队列。
 * slots 个槽里永远有一个空着，用来区分"空"和"满"，所以最多放 slots - 1 个元素。
 * front 指向队头元素，rear 指向下一个入队位置。
 */
typedef struct {
    int data[QUEUE_MAX_SLOTS];
    int slots;
    int front;
    int rear;
} CircularQueue;

/* 初始化：slots = capacity + 1，front = rear = 0。 */
void queue_init(CircularQueue *q, int capacity);

/* 入队：成功返回 1；队列满返回 0，队列内容不变。 */
int queue_push(CircularQueue *q, int value);

/* 出队：成功时把队头写入 *out 并返回 1；空队列返回 0。 */
int queue_pop(CircularQueue *q, int *out);

/* 只看队头：成功时写入 *out 并返回 1；空队列返回 0。不修改队列。 */
int queue_front(const CircularQueue *q, int *out);

/* 返回当前元素个数（支持回绕）。 */
int queue_count(const CircularQueue *q);

/* 清空队列：front = rear = 0，slots 不变。 */
void queue_clear(CircularQueue *q);

#endif
```

```c file=harness.c hidden
#include <stdio.h>
#include "queue.h"

#define MAXN 1023

int main(void) {
    int capacity = 0;
    int n = 0;
    if (scanf("%d", &capacity) != 1 || capacity < 1 || capacity > MAXN) {
        return 0;
    }
    if (scanf("%d", &n) != 1 || n < 1 || n > capacity) {
        return 0;
    }

    int values[MAXN];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &values[i]) != 1) {
            return 0;
        }
    }

    CircularQueue q;
    queue_init(&q, capacity);

    int v = 0;
    printf("init_count=%d\n", queue_count(&q));
    printf("init_empty=%d\n", queue_front(&q, &v) == 0 ? 1 : 0);
    printf("init_pop=%d\n", queue_pop(&q, &v));

    int pushed = 0;
    for (int i = 0; i < n; i++) {
        if (queue_push(&q, values[i])) {
            pushed++;
        }
    }
    printf("push_new=%d\n", pushed);
    printf("count_n=%d\n", queue_count(&q));
    if (queue_front(&q, &v)) {
        printf("front_first=%d\n", v);
    } else {
        printf("front_first=none\n");
    }

    int extra = 0;
    for (int i = 0; i < capacity - n; i++) {
        if (queue_push(&q, 1000 + i)) {
            extra++;
        }
    }
    printf("fill_ok=%d\n", extra);
    printf("full_push=%d\n", queue_push(&q, 999999999));
    printf("count_full=%d\n", queue_count(&q));

    int half = capacity / 2;
    printf("pop_head=");
    for (int i = 0; i < half; i++) {
        if (!queue_pop(&q, &v)) {
            break;
        }
        if (i < 5) {
            printf("%s%d", i ? " " : "", v);
        }
    }
    printf("\n");
    printf("count_half=%d\n", queue_count(&q));
    if (queue_front(&q, &v)) {
        printf("front_after=%d\n", v);
    } else {
        printf("front_after=none\n");
    }

    int wrap = 0;
    for (int i = 0; i < half; i++) {
        if (queue_push(&q, 2000 + i)) {
            wrap++;
        }
    }
    printf("wrap_ok=%d\n", wrap);
    printf("count_wrap=%d\n", queue_count(&q));

    long long sum = 0;
    int drained = 0;
    while (queue_pop(&q, &v)) {
        sum += v;
        drained++;
    }
    printf("drain=%d\n", drained);
    printf("drain_sum=%lld\n", sum);
    printf("empty_pop=%d\n", queue_pop(&q, &v));
    printf("empty_front=%d\n", queue_front(&q, &v));
    printf("empty_count=%d\n", queue_count(&q));

    queue_push(&q, 7);
    queue_push(&q, 8);
    queue_clear(&q);
    printf("clear_count=%d\n", queue_count(&q));
    printf("clear_front=%d\n", queue_front(&q, &v) == 0 ? 0 : 1);
    queue_push(&q, 9);
    printf("reuse=%d\n", queue_pop(&q, &v) ? v : -999);
    return 0;
}
```

## 复杂度
`push`、`pop`、`front`、`count`、`clear` 都是 O(1)：只做取模、比较和一次读写。`init` 是 O(1)（只写三个字段，不需要清零整个 `data` 数组）。
空间 O(capacity)：一个定长数组，容量最大 1023，槽位最多 1024。

## 常见错误
### 判满写成 `rear == front` [WA]
`front == rear` 同时是空队列的条件，用它判满会让第一次 `push` 就失败（`push_new=0`），后面的所有计数全部错位。判满必须是 `(rear + 1) % slots == front`。

```c file=solution.c expect=WA
#include "queue.h"

void queue_init(CircularQueue *q, int capacity) {
    q->slots = capacity + 1;
    q->front = 0;
    q->rear = 0;
}

int queue_push(CircularQueue *q, int value) {
    if (q->rear == q->front) {        /* 错：这是空队列条件 */
        return 0;
    }
    q->data[q->rear] = value;
    q->rear = (q->rear + 1) % q->slots;
    return 1;
}

int queue_pop(CircularQueue *q, int *out) {
    if (q->front == q->rear) {
        return 0;
    }
    if (out != NULL) {
        *out = q->data[q->front];
    }
    q->front = (q->front + 1) % q->slots;
    return 1;
}

int queue_front(const CircularQueue *q, int *out) {
    if (q->front == q->rear) {
        return 0;
    }
    if (out != NULL) {
        *out = q->data[q->front];
    }
    return 1;
}

int queue_count(const CircularQueue *q) {
    return (q->rear - q->front + q->slots) % q->slots;
}

void queue_clear(CircularQueue *q) {
    q->front = 0;
    q->rear = 0;
}
```

### `queue_init` 里漏了 +1 [WA]
`slots = capacity` 会让队列只能放 `capacity - 1` 个元素：示例 1 补到第 5 个时 `fill_ok` 只有 1，`full_push` 变成 1，`count_full` 变成 4。留一个空位的前提是"槽位数 = 容量 + 1"。

```c file=solution.c expect=WA
#include "queue.h"

void queue_init(CircularQueue *q, int capacity) {
    q->slots = capacity;              /* 错：少了一个空位 */
    q->front = 0;
    q->rear = 0;
}

int queue_push(CircularQueue *q, int value) {
    if ((q->rear + 1) % q->slots == q->front) {
        return 0;
    }
    q->data[q->rear] = value;
    q->rear = (q->rear + 1) % q->slots;
    return 1;
}

int queue_pop(CircularQueue *q, int *out) {
    if (q->front == q->rear) {
        return 0;
    }
    if (out != NULL) {
        *out = q->data[q->front];
    }
    q->front = (q->front + 1) % q->slots;
    return 1;
}

int queue_front(const CircularQueue *q, int *out) {
    if (q->front == q->rear) {
        return 0;
    }
    if (out != NULL) {
        *out = q->data[q->front];
    }
    return 1;
}

int queue_count(const CircularQueue *q) {
    return (q->rear - q->front + q->slots) % q->slots;
}

void queue_clear(CircularQueue *q) {
    q->front = 0;
    q->rear = 0;
}
```

### `queue_count` 直接返回 `rear - front` [WA]
回绕之后 `front` 可能大于 `rear`，差值是负数。示例 1 里 `pop` 两次、再入队两个值之后 `front = 2`、`rear = 1`，直接相减得到 −1，而正确个数是 5。必须写成 `(rear - front + slots) % slots`。

```c file=solution.c expect=WA
#include "queue.h"

void queue_init(CircularQueue *q, int capacity) {
    q->slots = capacity + 1;
    q->front = 0;
    q->rear = 0;
}

int queue_push(CircularQueue *q, int value) {
    if ((q->rear + 1) % q->slots == q->front) {
        return 0;
    }
    q->data[q->rear] = value;
    q->rear = (q->rear + 1) % q->slots;
    return 1;
}

int queue_pop(CircularQueue *q, int *out) {
    if (q->front == q->rear) {
        return 0;
    }
    if (out != NULL) {
        *out = q->data[q->front];
    }
    q->front = (q->front + 1) % q->slots;
    return 1;
}

int queue_front(const CircularQueue *q, int *out) {
    if (q->front == q->rear) {
        return 0;
    }
    if (out != NULL) {
        *out = q->data[q->front];
    }
    return 1;
}

int queue_count(const CircularQueue *q) {
    return q->rear - q->front;        /* 错：回绕后是负数 */
}

void queue_clear(CircularQueue *q) {
    q->front = 0;
    q->rear = 0;
}
```

### `queue_clear` 只重置了 `front` [WA]
只写 `q->front = 0` 的话，`rear` 还停在原来的位置，`queue_count` 会把"已经不存在的元素"算进去，下一次 `push` 也可能从错误的 `rear` 开始。清空必须同时把 `front` 和 `rear` 归零。

## 测试用例
### 01 sample 示例 1
```in
5
3
10 20 30
```
```out
init_count=0
init_empty=1
init_pop=0
push_new=3
count_n=3
front_first=10
fill_ok=2
full_push=0
count_full=5
pop_head=10 20
count_half=3
front_after=30
wrap_ok=2
count_wrap=5
drain=5
drain_sum=6032
empty_pop=0
empty_front=0
empty_count=0
clear_count=0
clear_front=0
reuse=9
```

### 02 sample 示例 2
```in
1
1
-5
```
```out
init_count=0
init_empty=1
init_pop=0
push_new=1
count_n=1
front_first=-5
fill_ok=0
full_push=0
count_full=1
pop_head=
count_half=1
front_after=-5
wrap_ok=0
count_wrap=1
drain=1
drain_sum=-5
empty_pop=0
empty_front=0
empty_count=0
clear_count=0
clear_front=0
reuse=9
```

### 03 degenerate 容量 2、一开始就填满
```in
2
2
7 8
```
```out
init_count=0
init_empty=1
init_pop=0
push_new=2
count_n=2
front_first=7
fill_ok=0
full_push=0
count_full=2
pop_head=7
count_half=1
front_after=8
wrap_ok=1
count_wrap=2
drain=2
drain_sum=2008
empty_pop=0
empty_front=0
empty_count=0
clear_count=0
clear_front=0
reuse=9
```

### 04 trap 容量 3、负值入队与回绕
```in
3
2
-1 -2
```
```out
init_count=0
init_empty=1
init_pop=0
push_new=2
count_n=2
front_first=-1
fill_ok=1
full_push=0
count_full=3
pop_head=-1
count_half=2
front_after=-2
wrap_ok=1
count_wrap=3
drain=3
drain_sum=2998
empty_pop=0
empty_front=0
empty_count=0
clear_count=0
clear_front=0
reuse=9
```

### 05 normal 容量 7、混合正负零，弹出 3 个后回绕
```in
7
4
5 -6 7 0
```
```out
init_count=0
init_empty=1
init_pop=0
push_new=4
count_n=4
front_first=5
fill_ok=3
full_push=0
count_full=7
pop_head=5 -6 7
count_half=4
front_after=0
wrap_ok=3
count_wrap=7
drain=7
drain_sum=9006
empty_pop=0
empty_front=0
empty_count=0
clear_count=0
clear_front=0
reuse=9
```

### 06 normal 容量 6、三个重复值
```in
6
3
3 3 3
```
```out
init_count=0
init_empty=1
init_pop=0
push_new=3
count_n=3
front_first=3
fill_ok=3
full_push=0
count_full=6
pop_head=3 3 3
count_half=3
front_after=1000
wrap_ok=3
count_wrap=6
drain=6
drain_sum=9006
empty_pop=0
empty_front=0
empty_count=0
clear_count=0
clear_front=0
reuse=9
```

### 07 boundary 最大容量 1023
```in
1023
1
0
```
```out
init_count=0
init_empty=1
init_pop=0
push_new=1
count_n=1
front_first=0
fill_ok=1022
full_push=0
count_full=1023
pop_head=0 1000 1001 1002 1003
count_half=512
front_after=1510
wrap_ok=511
count_wrap=1023
drain=1023
drain_sum=2056241
empty_pop=0
empty_front=0
empty_count=0
clear_count=0
clear_front=0
reuse=9
```
