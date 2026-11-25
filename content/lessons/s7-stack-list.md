---
id: s7-stack-list
---

## 讲解

### 栈只有一个出口，所以链表头就是最合适的栈顶
栈的规则只有一句：**后进先出**（LIFO）。所有插入和删除都发生在同一端，这一端叫栈顶。既然只动一端，就不需要"随机访问"，也不需要"在中间插入"——而这恰好是链表最擅长的场景。

用单向链表实现栈时，只要约定一件事：**链表头就是栈顶**。

- `push`：在头部插入一个新节点（头插），O(1)；
- `pop`：摘掉头节点并 `free`，O(1)；
- `top`：读 `head->value`，O(1)。

这里不需要尾指针，也不需要遍历。下面这个完整程序把五个操作都跑了一遍：

```c run id=sl-basic
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

typedef struct {
    Node *top;      /* 栈顶就是链表头；空栈为 NULL */
    int size;
} IntStack;

static int stack_push(IntStack *s, int value) {
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->value = value;
    node->next = s->top;      /* 头插：新节点指向原来的栈顶 */
    s->top = node;            /* 再让 head 指向新节点 */
    s->size++;
    return 1;
}

static int stack_pop(IntStack *s, int *out) {
    if (s->top == NULL) {
        return 0;
    }
    Node *node = s->top;
    s->top = node->next;      /* 先摘链 */
    s->size--;
    *out = node->value;
    free(node);               /* 再释放，顺序反了就读不到值 */
    return 1;
}

static int stack_peek(const IntStack *s, int *out) {
    if (s->top == NULL) {
        return 0;
    }
    *out = s->top->value;
    return 1;
}

static void stack_destroy(IntStack *s) {
    while (s->top != NULL) {
        Node *next = s->top->next;   /* 先记住下一个，再释放当前 */
        free(s->top);
        s->top = next;
    }
    s->size = 0;
}

int main(void) {
    IntStack s = { NULL, 0 };
    for (int i = 1; i <= 5; i++) {
        if (!stack_push(&s, i * 10)) {
            return 1;
        }
    }
    printf("size=%d\n", s.size);

    int v = 0;
    if (stack_peek(&s, &v)) {
        printf("top=%d\n", v);
    }

    printf("pop:");
    while (stack_pop(&s, &v)) {
        printf(" %d", v);
    }
    printf("\n");
    printf("size_after=%d\n", s.size);
    printf("empty_pop=%d\n", stack_pop(&s, &v));
    printf("empty_peek=%d\n", stack_peek(&s, &v));
    stack_destroy(&s);
    return 0;
}
```
```output
size=5
top=50
pop: 50 40 30 20 10
size_after=0
empty_pop=0
empty_peek=0
```

注意 `pop` 里三个动作的顺序：**摘链 → 取值 → 释放**。如果先 `free(node)` 再读 `node->value`，读的就是已经归还给堆管理器的内存，属于释放后使用（use-after-free），本平台会判 `RE`。

### 链表栈的内存形状：指针在栈上，节点在堆上
很多人第一次画链表栈会画错：以为"栈"这个东西本身是一整块连续内存。实际上 `IntStack` 只是两个字段（`top` 和 `size`），它通常在栈上；而每个节点都是 `malloc` 出来的一块独立堆内存，彼此地址不连续。

```memory title="链表栈：压入 10、20、30 之后（地址只表示先后关系）"
位置 | 内容 | 说明
栈上 s.top | 指向节点 C | 栈顶就是链表头，push/pop 只改这一个指针
栈上 s.size | 3 | 必须与链表实际长度一致
堆上节点 A | value=10, next=NULL | 最早 push 的节点，现在在链尾
堆上节点 B | value=20, next=&A | 中间节点
堆上节点 C | value=30, next=&B | 最后 push 的节点，最先被 pop
```

这张图解释了两个常见现象：

1. **push 不搬家**：新节点随便落在堆的哪个位置，只要把 `next` 接上就行。这和数组栈"满了要 `realloc` 并搬走全部元素"完全不同；
2. **pop 必须 free**：节点不在任何自动变量里，函数返回不会替你回收它。丢掉最后一个指向它的指针（`s.top = node->next` 之后）却忘了 `free(node)`，这块内存就永远泄漏了。

### 用"分配/释放计数"确认所有权没有漏
判断链表栈写对没有，一个很实用的办法是给分配和释放各加一个计数器：**每次 push 加一，每次 pop 和 destroy 释放的节点减一，最后"仍然存活的节点数"必须归零**。下面这个程序把计数打印出来：

```c run id=sl-counts
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

static int live_nodes;     /* 已经 malloc 但还没 free 的节点数 */
static int alloc_calls;
static int free_calls;

static int push(Node **top, int value) {
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->value = value;
    node->next = *top;
    *top = node;
    live_nodes++;
    alloc_calls++;
    return 1;
}

static int pop(Node **top, int *out) {
    if (*top == NULL) {
        return 0;
    }
    Node *node = *top;
    *top = node->next;
    *out = node->value;
    free(node);
    live_nodes--;
    free_calls++;
    return 1;
}

static void destroy(Node **top) {
    int v = 0;
    while (pop(top, &v)) {
        /* 全部弹出即全部释放 */
    }
}

int main(void) {
    Node *top = NULL;
    for (int i = 0; i < 5; i++) {
        if (!push(&top, i + 1)) {
            return 1;
        }
    }
    int v = 0;
    for (int i = 0; i < 3; i++) {
        if (!pop(&top, &v)) {
            return 1;
        }
        printf("pop %d\n", v);
    }
    printf("pushed=5 popped=3 live=%d\n", live_nodes);
    destroy(&top);
    printf("after_destroy live=%d alloc=%d free=%d\n", live_nodes, alloc_calls, free_calls);

    /* 销毁之后还能继续用：空栈是一个合法状态 */
    if (push(&top, 99)) {
        printf("reuse peek=%d\n", top->value);
    }
    destroy(&top);
    printf("final live=%d\n", live_nodes);
    return 0;
}
```
```output
pop 5
pop 4
pop 3
pushed=5 popped=3 live=2
after_destroy live=0 alloc=5 free=5
reuse peek=99
final live=0
```

`destroy` 没有另写一遍遍历，而是复用 `pop`：**"销毁整个栈"就是"一直弹到空"**。这既少写代码，也保证每个节点走的是同一条释放路径，不会出现"pop 释放了、destroy 忘了"的不一致。

### 链表栈 vs 数组栈：不是谁更好，而是容量能不能预估
两种实现都满足 LIFO，`push`/`pop` 都是 O(1)，差别全在"内存怎么来"：

| | 数组栈 | 链表栈 |
|---|---|---|
| 容量 | 固定，或用 `realloc` 翻倍扩容 | 无上限（受堆大小限制） |
| 单次 push | 均摊 O(1)，扩容那次要搬全部元素 | 每次一次 `malloc` |
| 内存局部性 | 连续，缓存友好 | 节点分散，缓存不友好 |
| 额外开销 | 几乎没有 | 每个节点一个 `next` 指针 + 分配器元数据 |
| 失败方式 | 扩容失败（内存不足） | `malloc` 返回 `NULL` |
| 适合 | 容量可预估、追求速度 | 容量不可预估、元素很大、频繁创建销毁 |

一句话：**元素个数大体可预估就用数组栈；完全不可预估，或者你已经在用链表组织数据，就用链表栈。** 本知识点关心的是后者，因为它把"指针操作 + 堆所有权"两件事一次练全。

### 经典应用：后缀表达式（逆波兰式）求值
栈最经典的应用之一是表达式求值。人写的中缀表达式 `(3 + 4) * 5` 有括号和优先级，机器不好直接算；改写成后缀式 `3 4 + 5 *` 后，规则只剩下一条：

> 读到数字就压栈；读到一个二元运算符，就弹出**两个**数，算完把结果压回去。

关键是弹出顺序：**先弹出的是右操作数，后弹出的是左操作数**。减法、除法对此极其敏感。

```c run id=sl-rpn
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct Node {
    long long value;
    struct Node *next;
} Node;

static int push(Node **top, long long value) {
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->value = value;
    node->next = *top;
    *top = node;
    return 1;
}

static int pop(Node **top, long long *out) {
    if (*top == NULL) {
        return 0;
    }
    Node *node = *top;
    *top = node->next;
    *out = node->value;
    free(node);
    return 1;
}

static void destroy(Node **top) {
    long long v = 0;
    while (pop(top, &v)) {
        /* 清空 */
    }
}

/* 返回结果；*ok 置 0 表示表达式不合法 */
static long long eval_rpn(char *line, int *ok, int *max_depth) {
    Node *top = NULL;
    size_t depth = 0;
    *max_depth = 0;
    *ok = 1;

    for (char *tok = strtok(line, " "); tok != NULL; tok = strtok(NULL, " ")) {
        if (strlen(tok) == 1 && (tok[0] == '+' || tok[0] == '-' || tok[0] == '*')) {
            long long right = 0;
            long long left = 0;
            if (!pop(&top, &right) || !pop(&top, &left)) {
                *ok = 0;
                destroy(&top);
                return 0;
            }
            long long value = 0;
            if (tok[0] == '+') {
                value = left + right;
            } else if (tok[0] == '-') {
                value = left - right;       /* 后弹出的是左操作数 */
            } else {
                value = left * right;
            }
            if (!push(&top, value)) {
                *ok = 0;
                destroy(&top);
                return 0;
            }
            depth--;
        } else {
            long long value = strtoll(tok, NULL, 10);
            if (!push(&top, value)) {
                *ok = 0;
                destroy(&top);
                return 0;
            }
            depth++;
        }
        printf("%-3s depth=%zu\n", tok, depth);
        if ((int)depth > *max_depth) {
            *max_depth = (int)depth;
        }
    }

    long long result = 0;
    if (!pop(&top, &result) || top != NULL) {   /* 栈里必须正好剩一个数 */
        *ok = 0;
        destroy(&top);
        return 0;
    }
    return result;
}

int main(void) {
    char line[] = "3 4 + 5 *";
    int ok = 0;
    int max_depth = 0;
    long long result = eval_rpn(line, &ok, &max_depth);
    printf("result=%lld max_depth=%d ok=%d\n", result, max_depth, ok);
    return 0;
}
```
```output
3   depth=1
4   depth=2
+   depth=1
5   depth=2
*   depth=1
result=35 max_depth=2 ok=1
```

这里 `strtoll` 返回 `long long`，所以中间结果 `1000000 * 1000000 = 10^12` 也不会溢出；如果栈里存的是 `int`，这一步就是有符号整数溢出——未定义行为，而不是"变成负数继续算"。

## 编译与运行

用 gcc 或 clang 编译都行，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra stack_list.c -o stack_list
./stack_list
```

```bash
clang -std=c17 -Wall -Wextra stack_list.c -o stack_list
./stack_list
```

链表栈最容易出的问题是内存错误，而不是语法错误。建议打开 AddressSanitizer 一起跑：

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=address,undefined stack_list.c -o stack_list
./stack_list
```

它能在越界、释放后使用、重复释放发生的那一刻直接报错并指出行号。想确认有没有忘记 `free`，可以像前面的例子那样自己数分配和释放次数，或者用平台题目里的内存泄漏检查（`checkLeaks`）。

## 常见错误

### 把 `pop` 写成"先 free 再读 value" [RE]
`*out = node->value` 必须发生在 `free(node)` 之前。释放之后再读那块内存是释放后使用（use-after-free），ASan 会报 `heap-use-after-free`。

```c
free(node);
*out = node->value;      /* 错：node 已经归还给堆管理器 */
```
正确顺序是"摘链 → 取值 → 释放"。

### `pop` 空栈时不解引用保护就直接取 `top->value` [RE]
空栈的 `top` 是 `NULL`，`top->value` 就是空指针解引用。所有取栈顶、弹栈的函数都必须先判 `top == NULL`。这也是为什么接口要给出返回值：**失败不是异常，而是必须检查的返回值**。

### 只把栈顶指针置空，忘了 `free` 节点 [LEAK]
`stack_destroy` 里只写 `s->top = NULL;` 看起来"清干净了"，但每个节点都还在堆上，而且再也没有指针能找到它们。销毁必须逐个节点 `free`。

### 以为 `push` 失败时栈会保持部分状态 [WA]
`malloc` 失败时 `push` 返回 0，此时 `size` 和 `top` 都不能变——先把节点内容准备好，最后一步才修改 `s->top`，就不容易出现"改了一半"的状态。

## 客观题

### q-s7-stack-list-1 single
用单向链表实现栈，约定"链表头就是栈顶"。下面关于 `push` / `pop` 的说法哪一个是正确的？

- [x] `push` 在头部插入新节点，`pop` 摘掉头节点并 `free`，两者都是 O(1)，不需要尾指针
  > 正确。栈只在一端增删，而链表头部的插入和删除都不用遍历，改一两个指针即可。维护尾指针在这里没有任何收益，`push` 也仍然是 O(1)。
- [ ] 为了 `push` 是 O(1)，必须同时维护头指针和尾指针，把新节点接在尾部
  > 错。接在尾部需要先找到尾节点；即使维护了尾指针，`pop`（从尾部删除）在单向链表上仍需从头找前驱，反而变成 O(n)。栈的正确做法是"头就是栈顶"。
- [ ] `pop` 只需要把头指针移到下一个节点，节点内存会随函数返回自动回收
  > 错。节点是 `malloc` 出来的堆内存，函数返回只回收自动变量；不 `free` 就是泄漏。链表栈的 `pop` 必须显式释放被摘下的节点。
- [ ] 链表栈的 `push` 在容量满时需要把已有节点整体搬到一块更大的内存里
  > 错。"满了要搬家"是数组栈扩容（`realloc`）的行为。链表节点分散在堆上，`push` 只是再申请一个节点并改指针，不存在整体搬移。
