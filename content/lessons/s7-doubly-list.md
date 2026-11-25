---
id: s7-doubly-list
---

## 讲解

### 单向链表的两处硬伤
单向链表只有 `next`，于是有两件事天生做不好：

1. **删除一个"已经拿到的"节点很贵**。删除需要前驱（要让前驱的 `next` 跳过它），而单向链表从节点本身找不到前驱，只能从表头重新走一遍，O(n)。如果删除操作本身很频繁（比如"撤销历史里删掉中间一条"），整条链就退化成 O(n²)。
2. **只能单向遍历**。要倒着看（播放列表的"上一首"、浏览器历史的"后退"），单向链表毫无办法。

双向链表给每个节点加一根 `prev`，把这两件事都变成 O(1)：

```c
typedef struct DNode {
    int value;
    struct DNode *prev;   /* 指向前一个节点；头节点为 NULL（或指向哨兵） */
    struct DNode *next;   /* 指向后一个节点；尾节点为 NULL（或指向哨兵） */
} DNode;
```

代价也很明确：每个节点多一个指针（64 位上多 8 字节）；每次插入/删除要改的指针从两根变成四根；而且**任何一根漏改，正反两个方向的遍历就会不一致**——这种 bug 往往在"正向打印看起来完全正常"的情况下潜伏很久。

### 双向链表的不变式
只要记住两条等式，双向链表的代码几乎是自动写出来的：

> 对链表中每个节点 p：`p->next->prev == p`（如果 p 有后继），且 `p->prev->next == p`（如果 p 有前驱）。

换句话说，`next` 和 `prev` 是一对**互逆**的指针，它们必须同时成立。插入和删除的本质就是"拆掉旧的互逆关系、建立新的互逆关系"，所以每次动指针都要问自己：**这两个方向都更新了吗？**

### 插入：四根指针，顺序有讲究
把 `node` 插到 `pos` 后面，需要建立两组互逆关系：`pos ↔ node` 和 `node ↔ 原来的后继`。顺序的关键是——**`pos->next` 必须最后改**，因为前两句都要读它：

```c
node->prev = pos;                 /* ① 新节点的 prev 指向 pos */
node->next = pos->next;           /* ② 新节点的 next 指向原来的后继（此时 pos->next 还没变） */
if (pos->next != NULL) {
    pos->next->prev = node;       /* ③ 原来的后继回头指向新节点 */
}                                 /*    若 pos 是尾节点，新节点成为新尾节点 */
pos->next = node;                 /* ④ 最后才断开 pos 与旧后继，接到新节点上 */
```

如果第④句提前执行（`pos->next = node;` 放在最前面），那么第②句读到的 `pos->next` 已经是 `node` 自己，新节点的 `next` 就指向了自己；第③句也会把 `node->prev` 改成 `node`。链表当场自环，而且正向打印"看起来只有两个节点"，很难发现。

### 删除：两根指针 + 两个边界
删除 `node` 只需要让它的前驱和后继**互相**接上，然后 `free`：

```c
if (node->prev != NULL) {
    node->prev->next = node->next;   /* 前驱跳过 node */
} else {
    head = node->next;               /* node 是头节点：改 head */
}
if (node->next != NULL) {
    node->next->prev = node->prev;   /* 后继跳过 node */
} else {
    tail = node->prev;               /* node 是尾节点：改 tail */
}
free(node);
```

两个 `else` 分支就是双向链表最容易漏的地方：删除头节点时没有前驱、删除尾节点时没有后继，不更新 `head`/`tail` 的话，之后任何一次"从尾部倒着遍历"都会读到已经释放的内存（use-after-free）。

### 为什么"把两个方向的遍历都打印一遍"能查出大部分 bug
正向遍历走的是 `next` 链，反向遍历走的是 `prev` 链。如果某次插入只更新了 `next` 忘了 `prev->prev`，正向输出会**完全正确**，反向输出则会在某处断掉或走错。所以测试双向链表的标准动作是：**同一组数据，正反各打印一遍，再逐节点校验 `p->prev->next == p`**。

下面这个例子建表、插入、删除，每一步都把两个方向都打出来，最后再做一次一致性校验：

```c run id=dl-insert-remove
#include <stdio.h>
#include <stdlib.h>

typedef struct DNode {
    int value;
    struct DNode *prev;
    struct DNode *next;
} DNode;

typedef struct {
    DNode *head;
    DNode *tail;
    int count;
} DList;

static void dlist_init(DList *L) {
    L->head = NULL;
    L->tail = NULL;
    L->count = 0;
}

static int dlist_append(DList *L, int value) {
    DNode *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->value = value;
    node->prev = L->tail;
    node->next = NULL;
    if (L->tail != NULL) {
        L->tail->next = node;
    } else {
        L->head = node;                /* 空表：新节点同时是头 */
    }
    L->tail = node;
    L->count++;
    return 1;
}

static DNode *dlist_find(const DList *L, int value) {
    for (DNode *p = L->head; p != NULL; p = p->next) {
        if (p->value == value) {
            return p;
        }
    }
    return NULL;
}

/* 把 value 插到 pos 之后：四根指针，pos->next 最后改 */
static int dlist_insert_after(DList *L, DNode *pos, int value) {
    if (pos == NULL) {
        return 0;
    }
    DNode *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->value = value;
    node->prev = pos;                  /* ① */
    node->next = pos->next;            /* ② 读的是旧后继 */
    if (pos->next != NULL) {
        pos->next->prev = node;        /* ③ 旧后继回头 */
    } else {
        L->tail = node;                /* pos 原来是尾巴 */
    }
    pos->next = node;                  /* ④ 最后才断开旧连接 */
    L->count++;
    return 1;
}

static int dlist_remove(DList *L, DNode *node) {
    if (node == NULL) {
        return 0;
    }
    if (node->prev != NULL) {
        node->prev->next = node->next;
    } else {
        L->head = node->next;
    }
    if (node->next != NULL) {
        node->next->prev = node->prev;
    } else {
        L->tail = node->prev;
    }
    free(node);
    L->count--;
    return 1;
}

/* 逐节点校验 p->prev->next == p，并确认节点个数与 count 一致 */
static int dlist_check(const DList *L) {
    const DNode *p = L->head;
    const DNode *back = NULL;
    int n = 0;
    while (p != NULL) {
        if (p->prev != back) {
            return 0;
        }
        back = p;
        p = p->next;
        n++;
    }
    return back == L->tail && n == L->count;
}

static void print_both(const char *label, const DList *L) {
    printf("%s正向：", label);
    for (const DNode *p = L->head; p != NULL; p = p->next) {
        if (p != L->head) {
            printf(" ");
        }
        printf("%d", p->value);
    }
    printf("\n%s反向：", label);
    for (const DNode *p = L->tail; p != NULL; p = p->prev) {
        if (p != L->tail) {
            printf(" ");
        }
        printf("%d", p->value);
    }
    printf("\n");
}

static int dlist_clear(DList *L) {
    int freed = 0;
    DNode *p = L->head;
    while (p != NULL) {
        DNode *next = p->next;
        free(p);
        p = next;
        freed++;
    }
    L->head = NULL;
    L->tail = NULL;
    L->count = 0;
    return freed;
}

int main(void) {
    DList L;
    dlist_init(&L);
    const int values[4] = { 10, 20, 30, 40 };
    for (int i = 0; i < 4; i++) {
        if (!dlist_append(&L, values[i])) {
            return 0;
        }
    }
    print_both("初始", &L);

    printf("在 20 之后插入 25\n");
    if (!dlist_insert_after(&L, dlist_find(&L, 20), 25)) {
        return 0;
    }
    print_both("", &L);

    printf("删除 30\n");
    dlist_remove(&L, dlist_find(&L, 30));
    print_both("", &L);

    printf("prev 链一致：%s\n", dlist_check(&L) ? "是" : "否");
    printf("count=%d，释放了 %d 个节点\n", L.count, dlist_clear(&L));
    return 0;
}
```
```output
初始正向：10 20 30 40
初始反向：40 30 20 10
在 20 之后插入 25
正向：10 20 25 30 40
反向：40 30 25 20 10
删除 30
正向：10 20 25 40
反向：40 25 20 10
prev 链一致：是
count=4，释放了 4 个节点
```

注意 `dlist_insert_after` 里那个 `else { L->tail = node; }`：插入位置是原来的尾节点时，新节点成为新尾巴。少了这一句，正向输出仍然正确，但**从 tail 反向遍历会少一个节点**——这就是双向链表 bug 最典型的样子。

### 一条双向链表在内存里长什么样
以 `10 ↔ 20 ↔ 30` 为例，每个节点里有两根方向相反的指针，它们互为逆运算：

```memory title="双向链表 10 ↔ 20 ↔ 30（head / tail 分别在两端，地址为示意）"
节点（示意） | value | prev 指向 | next 指向 | 说明
A | 10 | NULL | B | head：没有前驱
B | 20 | A | C | 中间节点：两根指针都有效
C | 30 | B | NULL | tail：没有后继
```

把头、尾两端的 `NULL` 换成"指向哨兵节点"，就得到下面这种更省心的结构。

### 带哨兵的循环双向链表：把边界情况全部消掉
上面每个函数都要判 `node->prev != NULL` / `node->next != NULL`，因为头尾是特殊情况。如果放一个**不存数据的哨兵节点**（sentinel）进去，并且让首尾绕回来，所有边界就都消失了：

- 空表时 `sentinel.next == sentinel.prev == &sentinel`；
- 第一个节点的 `prev` 指向哨兵，最后一个节点的 `next` 也指向哨兵；
- 于是"每个节点都一定有前驱和后继"，插入删除**一句判空都不用写**；
- 遍历的终止条件从 `p != NULL` 变成 `p != &sentinel`。

```c run id=dl-sentinel
#include <stdio.h>
#include <stdlib.h>

typedef struct SNode {
    int value;
    struct SNode *prev;
    struct SNode *next;
} SNode;

/* 哨兵：value 不使用，next 是第一个元素，prev 是最后一个元素 */
static void slist_init(SNode *s) {
    s->value = 0;
    s->prev = s;
    s->next = s;
}

/* 在 pos 之后插入：pos->next 永远非空（至少有哨兵），所以不用判空 */
static int slist_insert_after(SNode *pos, int value) {
    SNode *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->value = value;
    node->prev = pos;
    node->next = pos->next;
    pos->next->prev = node;      /* 哨兵也在内：这一句永远安全 */
    pos->next = node;
    return 1;
}

static SNode *slist_find(SNode *head, int value) {
    for (SNode *p = head->next; p != head; p = p->next) {
        if (p->value == value) {
            return p;
        }
    }
    return NULL;
}

/* 删除：两根指针，没有任何 else 分支 */
static void slist_remove(SNode *node) {
    node->prev->next = node->next;
    node->next->prev = node->prev;
    free(node);
}

static int slist_count(const SNode *head) {
    int n = 0;
    for (const SNode *p = head->next; p != head; p = p->next) {
        n++;
    }
    return n;
}

static void slist_print(const char *label, const SNode *head) {
    printf("%s", label);
    for (const SNode *p = head->next; p != head; p = p->next) {
        if (p != head->next) {
            printf(" ");
        }
        printf("%d", p->value);
    }
    printf("\n");
}

static void slist_print_back(const char *label, const SNode *head) {
    printf("%s", label);
    for (const SNode *p = head->prev; p != head; p = p->prev) {
        if (p != head->prev) {
            printf(" ");
        }
        printf("%d", p->value);
    }
    printf("\n");
}

static int slist_clear(SNode *head) {
    int freed = 0;
    SNode *p = head->next;
    while (p != head) {
        SNode *next = p->next;
        free(p);
        p = next;
        freed++;
    }
    head->next = head;
    head->prev = head;
    return freed;
}

int main(void) {
    SNode sentinel;
    slist_init(&sentinel);
    printf("空表个数：%d\n", slist_count(&sentinel));

    slist_insert_after(&sentinel, 10);                 /* 插到最前面 */
    slist_insert_after(&sentinel, 20);                 /* 再插到最前面 → 20 10 */
    slist_insert_after(slist_find(&sentinel, 10), 15); /* 10 之后 → 20 10 15 */
    slist_print("哨兵表正向：", &sentinel);
    slist_print_back("哨兵表反向：", &sentinel);

    slist_remove(slist_find(&sentinel, 10));
    slist_print("删除 10 之后正向：", &sentinel);
    slist_print_back("反向：", &sentinel);

    int freed = slist_clear(&sentinel);
    printf("清空后个数：%d，释放了 %d 个节点\n", slist_count(&sentinel), freed);
    return 0;
}
```
```output
空表个数：0
哨兵表正向：20 10 15
哨兵表反向：15 10 20
删除 10 之后正向：20 15
反向：15 20
清空后个数：0，释放了 2 个节点
```

对比前面没有哨兵的版本：`dlist_remove` 里有四个 `if/else`，`slist_remove` 里一句都没有。这就是哨兵的全部价值——**用一个永远存在的节点，把"空表"和"头尾"这两类特殊情况变成普通情况**。代价是多用一个节点、遍历的终止条件要写 `p != &sentinel`（写错成 `p != NULL` 会立刻死循环）。

### 反转双向链表：把每根指针都掉头
双向链表的反转比单向更"对称"：因为结构本来就对称，所以只需要**对每个节点交换 `prev` 和 `next`**，最后交换 `head` 和 `tail`：

```c
void dlist_reverse(DList *L) {
    DNode *p = L->head;
    while (p != NULL) {
        DNode *tmp = p->next;
        p->next = p->prev;
        p->prev = tmp;
        p = tmp;            /* tmp 是原来的 next，也就是"下一个要处理的节点" */
    }
    DNode *t = L->head;
    L->head = L->tail;
    L->tail = t;
}
```

注意循环里的 `p = tmp`：交换之后 `p->next` 已经变成原来的前驱了，如果顺着新的 `next` 走，会立刻回到已经处理过的节点，所以必须用事先存下来的 `tmp`。这和单向链表三指针反转里"先存 next"是同一个道理。

## 编译与运行

用 gcc 或 clang 编译，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra dlist.c -o dlist
./dlist
```

```bash
clang -std=c17 -Wall -Wextra dlist.c -o dlist
./dlist
```

双向链表最值得开的依旧是 AddressSanitizer：漏改 `prev`、删除后仍从 `tail` 反向遍历，都会在 ASan 下立刻变成一条明确的 `heap-use-after-free` 报告，而不是"输出少了一个数字"这种无声的错：

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=address dlist.c -o dlist
./dlist
```

再推荐一个纯代码层面的检查：写一个 `dlist_check` 函数，遍历时同时断言 `p->prev->next == p` 和 `p->next->prev == p`，在你自己的测试里每做一次插入/删除就调用一次。这个函数只有十行，却能抓住双向链表 90% 的指针 bug。

## 常见错误

### 插入时先改 pos->next，新节点指向自己 [RE]
```c
pos->next = node;          /* 错：提前断开，旧后继地址丢失 */
node->next = pos->next;    /* 读到的是 node 自己 → 自环 */
```
`pos->next` 是整个插入过程里唯一还记得"旧后继"的地方，它必须在 `node->next = pos->next;` 和 `旧后继->prev = node;` 都执行完之后才能改。顺序记成"**先接新节点，再改旧邻居，最后才改 pos**"。

### 删除只改了一个方向，反向遍历错位 [WA]
```c
node->prev->next = node->next;   /* 只改了 next 方向 */
free(node);                       /* prev 方向还指着 node → 悬垂指针 */
```
正向遍历完全正常，一从 `tail` 往回走就会读到已经释放的内存。删除必须成对：前驱的 `next` 跳过它、后继的 `prev` 跳过它，两根都改完才能 `free`。

### 删除头节点时没有更新 head [RE]
```c
node->next->prev = node->prev;   /* node->prev 是 NULL，这句没问题 */
free(node);
/* 少了：head = node->next;  → head 还指向已释放的节点 */
```
之后任何一次从 `head` 出发的遍历都是 use-after-free。凡是"没有前驱/没有后继"的分支，都要顺手把 `head`/`tail` 挪过去；用了哨兵就不会有这两个分支。

### 把哨兵节点当成数据节点释放 [RE]
哨兵的典型写法是把它放在栈上（`SNode sentinel;`），只有真正的数据节点才 `malloc`。如果清空时写 `while (p != NULL) { free(p); ... }` 或者不小心把哨兵也 `free` 掉，就是释放一个从未 `malloc` 过的地址或栈地址，直接 `RE`。遍历的终止条件必须严格写成 `p != &sentinel`。

### 反转双向链表时顺着新的 next 继续走 [TLE]
交换 `p->next` 和 `p->prev` 之后，`p->next` 指向的是**原来的前驱**。此时如果写 `p = p->next;` 继续循环，就会走回已经处理过的节点，在两个节点之间来回弹，形成死循环。必须用交换前保存的 `tmp` 前进。

## 客观题

### q-s7-doubly-list-1 single
在双向链表（含 `head`、`tail` 两个指针，无哨兵）里，把 `node` 插到 `pos` 之后。下面四种赋值顺序，哪一种不会破坏 `prev`/`next` 的互逆关系？

- [x] `node->prev = pos;` → `node->next = pos->next;` → 若 `pos->next` 非空则 `pos->next->prev = node;` → 最后 `pos->next = node;`
  > 正确。前两句建立 `node ↔ pos` 与 `node → 旧后继` 的关系，第三句让旧后继回头指向 `node`（此时 `pos->next` 读到的仍是旧后继），最后一句才把 `pos` 接到 `node` 上。全程旧后继的地址没有丢失，两根方向始终成对更新。
- [ ] `pos->next = node;` → `node->prev = pos;` → `node->next = pos->next;` → `pos->next->prev = node;`
  > 错。第一句就把 `pos->next` 改成 `node`，第三句于是变成 `node->next = node`（自环），第四句又把 `node->prev` 写成 `node`。正向遍历只看到 `pos → node → node → …`，反向则完全错乱。
- [ ] `node->next = pos->next;` → `node->prev = pos;` → `pos->next = node;` → `pos->next->prev = node;`
  > 错。前三句看着没问题，但第三句执行后 `pos->next` 已经是 `node`，第四句的 `pos->next->prev = node` 实际是 `node->prev = node`，把刚建好的 `node->prev` 又破坏了。旧后继的 `prev` 一句都没改到，`prev` 链断在原地。
- [ ] 四句的先后顺序无关紧要，因为它们修改的是四个不同的字段
  > 错。四个字段确实不同，但语句之间存在"读写同一个字段"的依赖：`node->next = pos->next;` 和 `旧后继->prev = node;` 都要读 `pos->next`，而最后一句会写它。只要有"先写后读"的重叠，顺序就是语义的一部分。
