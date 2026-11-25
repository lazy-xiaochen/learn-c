---json
{
  "id": "p-s7-singly-list-2",
  "title": "班级名单：按学号升序维护一条单链表（插入去重、删除、释放）",
  "difficulty": "L4",
  "knowledgePoints": ["s7-singly-list"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
新学期的名单是按报名顺序报上来的，但老师要的是一份**按学号升序**的名单。请你用一条单链表把这件事做出来：

1. 先读入 `n` 条初始记录，**逐条按学号升序插入**链表；如果学号已经存在，忽略这条记录（一个学号只能对应一个学生）。
2. 再读入 `m` 条新报名的记录，同样按学号升序插入、同样去重。
3. 再读入 `k` 个要转走的学号，按顺序删除；学号不存在就跳过。
4. 全程结束后把整条链表**释放干净**，并报告释放了多少个节点。

节点必须用 `malloc` 在堆上创建；`name` 要复制进节点自己的缓冲区（题目保证姓名不超过 15 个字符）。最终每个节点都要被 `free`，程序结束时链表必须为空。

## 输入格式
第一行一个整数 `n`：初始记录条数。
接下来 `n` 行，每行 `id name`。
接下来一行一个整数 `m`：新报名记录条数。
接下来 `m` 行，每行 `id name`。
接下来一行一个整数 `k`：转走的学号个数。
接下来 `k` 行，每行一个整数 `id`。

## 输出格式
四行：

```
roster <插入全部完成后的节点数> <id>:<name> <id>:<name> …    （按学号升序，空名单只输出 roster 0）
removed=<实际删除掉的节点数>
after <删除完成后的节点数> <id>:<name> …                   （按学号升序，空名单只输出 after 0）
freed=<销毁整条链表时释放的节点数>
```

## 数据范围
0 ≤ n ≤ 500
0 ≤ m ≤ 200
0 ≤ k ≤ 200
1 ≤ 学号 ≤ 999999
姓名只含小写字母，长度 1–8

最多 700 条记录、200 次删除，每次插入都是 O(链表长度)，总量约 5×10⁵ 次节点访问，1 秒足够；输出最多约 500 个 `id:name` 对，远小于 64KB。

## 示例
### 示例 1
```in
5
105 eve
101 alice
103 carol
102 bob
104 dave
2
106 frank
103 zoe
1
102
```
```out
roster 6 101:alice 102:bob 103:carol 104:dave 105:eve 106:frank
removed=1
after 5 101:alice 103:carol 104:dave 105:eve 106:frank
freed=5
```
> 五条初始记录乱序给进来，按学号升序插入后是 `101 alice → 102 bob → 103 carol → 104 dave → 105 eve`。新记录 `106 frank` 插到末尾；`103 zoe` 的学号已经存在，**忽略**。最后删掉 `102`，剩下 5 个节点，销毁时释放 5 个。

### 示例 2（边界：空名单，唯一的学生也被转走）
```in
0
1
7 solo
2
7
99
```
```out
roster 1 7:solo
removed=1
after 0
freed=0
```
> 初始名单是空的，第一条新记录 `7 solo` 插进空链表——这时"插到某个节点之前"没有前驱，必须改 `head` 本身。删除 `7` 之后链表又空了，`after 0`；删除 `99` 时学号不存在，`removed` 只有 1。

## 提示
### 第 1 层
先写"按序插入一个节点"，它是全题的核心：

```c
Node **link = head;
while (*link != NULL && (*link)->id < id) {
    link = &(*link)->next;
}
```

循环结束时 `*link` 是"第一个学号大于等于 id 的节点"或者 `NULL`。此时如果 `*link != NULL && (*link)->id == id`，说明学号重复，直接返回（**不要**建节点）；否则新节点就插在 `*link` 前面。

### 第 2 层
用二级指针 `Node **` 传 `head`，上面那段代码就同时覆盖了三种位置：插到表头（`link == head`）、插到中间、插到末尾（`*link == NULL`）。插入动作只有两句：

```c
node->next = *link;
*link = node;
```

删除同理：走到 `*link` 是目标节点后，`*link = dead->next; free(dead);`。

### 第 3 层
四件事最容易漏：① 学号重复时**不能**先建节点再丢弃（否则泄漏一个节点）；② `strncpy` 之后要手动补 `'\0'`；③ 删除时"摘链在前、`free` 在后"；④ 输出 `freed` 之前必须真的把每个节点都 `free` 一遍（从 `head` 开始，先存 `next` 再 `free`）。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define NAME_MAX 16

typedef struct Node {
    int id;
    char name[NAME_MAX];
    struct Node *next;
} Node;

static int list_count(const Node *head) {
    int n = 0;
    for (const Node *p = head; p != NULL; p = p->next) {
        n++;
    }
    return n;
}

/* 按学号升序插入；学号已存在时忽略并返回 0 */
static int insert_sorted(Node **head, int id, const char *name) {
    Node **link = head;
    while (*link != NULL && (*link)->id < id) {
        link = &(*link)->next;
    }
    if (*link != NULL && (*link)->id == id) {
        return 0;                     /* 重复学号：不建节点，直接忽略 */
    }
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->id = id;
    strncpy(node->name, name, sizeof node->name - 1);
    node->name[sizeof node->name - 1] = '\0';
    node->next = *link;
    *link = node;
    return 1;
}

static int remove_id(Node **head, int id) {
    Node **link = head;
    while (*link != NULL && (*link)->id != id) {
        link = &(*link)->next;
    }
    if (*link == NULL) {
        return 0;
    }
    Node *dead = *link;
    *link = dead->next;               /* 先摘链 */
    free(dead);                       /* 再释放 */
    return 1;
}

static int destroy(Node **head) {
    int freed = 0;
    Node *p = *head;
    while (p != NULL) {
        Node *next = p->next;
        free(p);
        p = next;
        freed++;
    }
    *head = NULL;
    return freed;
}

static void print_list(const char *label, const Node *head) {
    printf("%s %d", label, list_count(head));
    for (const Node *p = head; p != NULL; p = p->next) {
        printf(" %d:%s", p->id, p->name);
    }
    printf("\n");
}

int main(void) {
    Node *head = NULL;

    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > 500) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        int id;
        char name[NAME_MAX];
        if (scanf("%d %15s", &id, name) != 2) {
            destroy(&head);
            return 0;
        }
        insert_sorted(&head, id, name);
    }

    int m;
    if (scanf("%d", &m) != 1 || m < 0 || m > 200) {
        destroy(&head);
        return 0;
    }
    for (int i = 0; i < m; i++) {
        int id;
        char name[NAME_MAX];
        if (scanf("%d %15s", &id, name) != 2) {
            destroy(&head);
            return 0;
        }
        insert_sorted(&head, id, name);
    }

    print_list("roster", head);

    int k;
    if (scanf("%d", &k) != 1 || k < 0 || k > 200) {
        destroy(&head);
        return 0;
    }
    int removed = 0;
    for (int i = 0; i < k; i++) {
        int id;
        if (scanf("%d", &id) != 1) {
            break;
        }
        if (remove_id(&head, id)) {
            removed++;
        }
    }

    printf("removed=%d\n", removed);
    print_list("after", head);

    int freed = destroy(&head);
    printf("freed=%d\n", freed);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define NAME_MAX 16

typedef struct Node {
    int id;
    char name[NAME_MAX];
    struct Node *next;
} Node;

static int list_count(const Node *head) {
    int n = 0;
    for (const Node *p = head; p != NULL; p = p->next) {
        n++;
    }
    return n;
}

/* TODO: 按学号升序插入；学号已存在时忽略 */
static int insert_sorted(Node **head, int id, const char *name) {
    (void)head;
    (void)id;
    (void)name;
    return 0;
}

static int remove_id(Node **head, int id) {
    (void)head;
    (void)id;
    /* TODO: 找到节点后"先摘链、再 free" */
    return 0;
}

static int destroy(Node **head) {
    (void)head;
    /* TODO: 逐个 free 所有节点并返回释放的个数 */
    return 0;
}

static void print_list(const char *label, const Node *head) {
    printf("%s %d", label, list_count(head));
    for (const Node *p = head; p != NULL; p = p->next) {
        printf(" %d:%s", p->id, p->name);
    }
    printf("\n");
}

int main(void) {
    Node *head = NULL;

    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > 500) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        int id;
        char name[NAME_MAX];
        if (scanf("%d %15s", &id, name) != 2) {
            destroy(&head);
            return 0;
        }
        insert_sorted(&head, id, name);
    }

    int m;
    if (scanf("%d", &m) != 1 || m < 0 || m > 200) {
        destroy(&head);
        return 0;
    }
    for (int i = 0; i < m; i++) {
        int id;
        char name[NAME_MAX];
        if (scanf("%d %15s", &id, name) != 2) {
            destroy(&head);
            return 0;
        }
        insert_sorted(&head, id, name);
    }

    print_list("roster", head);

    int k;
    if (scanf("%d", &k) != 1 || k < 0 || k > 200) {
        destroy(&head);
        return 0;
    }
    int removed = 0;
    for (int i = 0; i < k; i++) {
        int id;
        if (scanf("%d", &id) != 1) {
            break;
        }
        if (remove_id(&head, id)) {
            removed++;
        }
    }

    printf("removed=%d\n", removed);
    print_list("after", head);

    int freed = destroy(&head);
    printf("freed=%d\n", freed);
    return 0;
}
```

## 复杂度
`insert_sorted` 和 `remove_id` 最坏 O(n)，一共要插入 n + m 条、删除 k 条，总时间 O((n + m + k)·n) ≤ 700 × 500 ≈ 3.5×10⁵ 次节点访问。
空间 O(n)：每个学生一个节点，最多 700 × 24 字节左右。

## 常见错误
### 插入时没有检查重复学号 [WA]
`while (*link != NULL && (*link)->id < id)` 走到第一个 `>= id` 的位置，如果直接插入，重复的学号就会排在一起，`roster` 里多出一个人，`freed` 也因此多一。学号唯一是本题的硬要求，必须显式判 `(*link)->id == id` 并**在 `malloc` 之前**就返回，否则那个已经建好的节点就再也没人引用了。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define NAME_MAX 16

typedef struct Node {
    int id;
    char name[NAME_MAX];
    struct Node *next;
} Node;

static int list_count(const Node *head) {
    int n = 0;
    for (const Node *p = head; p != NULL; p = p->next) {
        n++;
    }
    return n;
}

/* 错：没有检查重复学号 */
static int insert_sorted(Node **head, int id, const char *name) {
    Node **link = head;
    while (*link != NULL && (*link)->id < id) {
        link = &(*link)->next;
    }
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->id = id;
    strncpy(node->name, name, sizeof node->name - 1);
    node->name[sizeof node->name - 1] = '\0';
    node->next = *link;
    *link = node;
    return 1;
}

static int remove_id(Node **head, int id) {
    Node **link = head;
    while (*link != NULL && (*link)->id != id) {
        link = &(*link)->next;
    }
    if (*link == NULL) {
        return 0;
    }
    Node *dead = *link;
    *link = dead->next;
    free(dead);
    return 1;
}

static int destroy(Node **head) {
    int freed = 0;
    Node *p = *head;
    while (p != NULL) {
        Node *next = p->next;
        free(p);
        p = next;
        freed++;
    }
    *head = NULL;
    return freed;
}

static void print_list(const char *label, const Node *head) {
    printf("%s %d", label, list_count(head));
    for (const Node *p = head; p != NULL; p = p->next) {
        printf(" %d:%s", p->id, p->name);
    }
    printf("\n");
}

int main(void) {
    Node *head = NULL;

    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > 500) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        int id;
        char name[NAME_MAX];
        if (scanf("%d %15s", &id, name) != 2) {
            destroy(&head);
            return 0;
        }
        insert_sorted(&head, id, name);
    }

    int m;
    if (scanf("%d", &m) != 1 || m < 0 || m > 200) {
        destroy(&head);
        return 0;
    }
    for (int i = 0; i < m; i++) {
        int id;
        char name[NAME_MAX];
        if (scanf("%d %15s", &id, name) != 2) {
            destroy(&head);
            return 0;
        }
        insert_sorted(&head, id, name);
    }

    print_list("roster", head);

    int k;
    if (scanf("%d", &k) != 1 || k < 0 || k > 200) {
        destroy(&head);
        return 0;
    }
    int removed = 0;
    for (int i = 0; i < k; i++) {
        int id;
        if (scanf("%d", &id) != 1) {
            break;
        }
        if (remove_id(&head, id)) {
            removed++;
        }
    }

    printf("removed=%d\n", removed);
    print_list("after", head);

    int freed = destroy(&head);
    printf("freed=%d\n", freed);
    return 0;
}
```

### `destroy` 先把 head 置空再遍历 [WA]
```c
static int destroy(Node **head) {
    *head = NULL;          /* 错：先把入口清掉，节点全部失联 */
    return 0;
}
```
链表的所有节点都是靠 `head` 才能到达的，先清空等于把整条链扔掉，`freed` 变成 0，后续任何释放都不可能发生。这是内存泄漏的经典形态：**入口没了，内存就永远回不来**。正确顺序是先沿着链把节点逐个 `free`，最后再 `*head = NULL`。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define NAME_MAX 16

typedef struct Node {
    int id;
    char name[NAME_MAX];
    struct Node *next;
} Node;

static int list_count(const Node *head) {
    int n = 0;
    for (const Node *p = head; p != NULL; p = p->next) {
        n++;
    }
    return n;
}

static int insert_sorted(Node **head, int id, const char *name) {
    Node **link = head;
    while (*link != NULL && (*link)->id < id) {
        link = &(*link)->next;
    }
    if (*link != NULL && (*link)->id == id) {
        return 0;
    }
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->id = id;
    strncpy(node->name, name, sizeof node->name - 1);
    node->name[sizeof node->name - 1] = '\0';
    node->next = *link;
    *link = node;
    return 1;
}

static int remove_id(Node **head, int id) {
    Node **link = head;
    while (*link != NULL && (*link)->id != id) {
        link = &(*link)->next;
    }
    if (*link == NULL) {
        return 0;
    }
    Node *dead = *link;
    *link = dead->next;
    free(dead);
    return 1;
}

static int destroy(Node **head) {
    *head = NULL;          /* 错：先清空入口，节点全部失联 */
    return 0;
}

static void print_list(const char *label, const Node *head) {
    printf("%s %d", label, list_count(head));
    for (const Node *p = head; p != NULL; p = p->next) {
        printf(" %d:%s", p->id, p->name);
    }
    printf("\n");
}

int main(void) {
    Node *head = NULL;

    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > 500) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        int id;
        char name[NAME_MAX];
        if (scanf("%d %15s", &id, name) != 2) {
            destroy(&head);
            return 0;
        }
        insert_sorted(&head, id, name);
    }

    int m;
    if (scanf("%d", &m) != 1 || m < 0 || m > 200) {
        destroy(&head);
        return 0;
    }
    for (int i = 0; i < m; i++) {
        int id;
        char name[NAME_MAX];
        if (scanf("%d %15s", &id, name) != 2) {
            destroy(&head);
            return 0;
        }
        insert_sorted(&head, id, name);
    }

    print_list("roster", head);

    int k;
    if (scanf("%d", &k) != 1 || k < 0 || k > 200) {
        destroy(&head);
        return 0;
    }
    int removed = 0;
    for (int i = 0; i < k; i++) {
        int id;
        if (scanf("%d", &id) != 1) {
            break;
        }
        if (remove_id(&head, id)) {
            removed++;
        }
    }

    printf("removed=%d\n", removed);
    print_list("after", head);

    int freed = destroy(&head);
    printf("freed=%d\n", freed);
    return 0;
}
```

### 删除节点时先 free 再摘链 [RE]
```c
free(dead);
*link = dead->next;        /* 错：从已释放的内存里读 next */
```
ASan 会报 `heap-use-after-free`，判 `RE`。摘链和释放的顺序在链表题里反复出现，记住"**节点不在链上了，才可以释放它**"。

```c file=main.c expect=RE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define NAME_MAX 16

typedef struct Node {
    int id;
    char name[NAME_MAX];
    struct Node *next;
} Node;

static int list_count(const Node *head) {
    int n = 0;
    for (const Node *p = head; p != NULL; p = p->next) {
        n++;
    }
    return n;
}

static int insert_sorted(Node **head, int id, const char *name) {
    Node **link = head;
    while (*link != NULL && (*link)->id < id) {
        link = &(*link)->next;
    }
    if (*link != NULL && (*link)->id == id) {
        return 0;
    }
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->id = id;
    strncpy(node->name, name, sizeof node->name - 1);
    node->name[sizeof node->name - 1] = '\0';
    node->next = *link;
    *link = node;
    return 1;
}

static int remove_id(Node **head, int id) {
    Node **link = head;
    while (*link != NULL && (*link)->id != id) {
        link = &(*link)->next;
    }
    if (*link == NULL) {
        return 0;
    }
    free(*link);              /* 错：先释放 */
    *link = (*link)->next;    /* 再从已释放的内存里读 next */
    return 1;
}

static int destroy(Node **head) {
    int freed = 0;
    Node *p = *head;
    while (p != NULL) {
        Node *next = p->next;
        free(p);
        p = next;
        freed++;
    }
    *head = NULL;
    return freed;
}

static void print_list(const char *label, const Node *head) {
    printf("%s %d", label, list_count(head));
    for (const Node *p = head; p != NULL; p = p->next) {
        printf(" %d:%s", p->id, p->name);
    }
    printf("\n");
}

int main(void) {
    Node *head = NULL;

    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > 500) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        int id;
        char name[NAME_MAX];
        if (scanf("%d %15s", &id, name) != 2) {
            destroy(&head);
            return 0;
        }
        insert_sorted(&head, id, name);
    }

    int m;
    if (scanf("%d", &m) != 1 || m < 0 || m > 200) {
        destroy(&head);
        return 0;
    }
    for (int i = 0; i < m; i++) {
        int id;
        char name[NAME_MAX];
        if (scanf("%d %15s", &id, name) != 2) {
            destroy(&head);
            return 0;
        }
        insert_sorted(&head, id, name);
    }

    print_list("roster", head);

    int k;
    if (scanf("%d", &k) != 1 || k < 0 || k > 200) {
        destroy(&head);
        return 0;
    }
    int removed = 0;
    for (int i = 0; i < k; i++) {
        int id;
        if (scanf("%d", &id) != 1) {
            break;
        }
        if (remove_id(&head, id)) {
            removed++;
        }
    }

    printf("removed=%d\n", removed);
    print_list("after", head);

    int freed = destroy(&head);
    printf("freed=%d\n", freed);
    return 0;
}
```

### 用 `p->next != NULL` 当遍历条件 [WA]
升序链表本来就有序，很多人顺手写 `for (p = head; p->next != NULL; p = p->next)`，结果**最后一个学生永远被漏掉**：`roster` 少一个人、`freed` 少一个，空链表时还会直接解引用空指针。遍历条件必须是 `p != NULL`。

### 只处理了"插到中间"，没处理"插到表头" [WA]
如果只写 `prev->next = node;` 而不维护 `head`，那么第一条记录（插进空链表）就会丢失，最终名单永远少第一个学号。用二级指针 `Node **link` 从一开始就指向 `head`，这类特判可以彻底消失。

## 测试用例
### 01 sample 示例 1
```in
5
105 eve
101 alice
103 carol
102 bob
104 dave
2
106 frank
103 zoe
1
102
```
```out
roster 6 101:alice 102:bob 103:carol 104:dave 105:eve 106:frank
removed=1
after 5 101:alice 103:carol 104:dave 105:eve 106:frank
freed=5
```

### 02 sample 示例 2
```in
0
1
7 solo
2
7
99
```
```out
roster 1 7:solo
removed=1
after 0
freed=0
```

### 03 degenerate 只有一个学生，既不新增也不删除
```in
1
42 ada
0
0
```
```out
roster 1 42:ada
removed=0
after 1 42:ada
freed=1
```

### 04 trap 初始记录内部重复、新记录也重复
```in
4
3 c
1 a
3 b
2 d
2
2 e
4 f
0
```
```out
roster 4 1:a 2:d 3:c 4:f
removed=0
after 4 1:a 2:d 3:c 4:f
freed=4
```

### 05 trap 删除头节点、尾节点和一个不存在的学号
```in
4
10 a
20 b
30 c
40 d
0
3
10
40
99
```
```out
roster 4 10:a 20:b 30:c 40:d
removed=2
after 2 20:b 30:c
freed=2
```

### 06 normal 乱序输入、中间插入、删到只剩一个
```in
6
50 f
10 a
30 c
20 b
60 g
40 d
3
35 e
5 z
70 h
5
10
70
60
40
5
```
```out
roster 9 5:z 10:a 20:b 30:c 35:e 40:d 50:f 60:g 70:h
removed=5
after 4 20:b 30:c 35:e 50:f
freed=4
```

### 生成 boundary 五百条乱序记录加两百次删除
```js gen
const cases = [];

function render(records, del) {
  const list = [];
  for (const [id, name] of records) {
    const k = list.findIndex((x) => x[0] >= id);
    if (k >= 0 && list[k][0] === id) continue; // 学号已存在，忽略
    if (k < 0) list.push([id, name]);
    else list.splice(k, 0, [id, name]);
  }
  const pairs = (a) => a.map((x) => `${x[0]}:${x[1]}`).join(' ');
  const lines = [`roster ${list.length}${list.length ? ' ' + pairs(list) : ''}`];
  let removed = 0;
  for (const id of del) {
    const k = list.findIndex((x) => x[0] === id);
    if (k >= 0) {
      list.splice(k, 1);
      removed++;
    }
  }
  lines.push(`removed=${removed}`);
  lines.push(`after ${list.length}${list.length ? ' ' + pairs(list) : ''}`);
  lines.push(`freed=${list.length}`);
  return lines.join('\n') + '\n';
}

function make(records, added, del) {
  const lines = [String(records.length)];
  for (const [id, name] of records) lines.push(`${id} ${name}`);
  lines.push(String(added.length));
  for (const [id, name] of added) lines.push(`${id} ${name}`);
  lines.push(String(del.length));
  for (const id of del) lines.push(String(id));
  return lines.join('\n') + '\n';
}

/* 500 条乱序记录 + 200 条新记录 + 200 次删除 */
{
  const records = [];
  const used = new Set();
  for (let i = 0; i < 500; i++) {
    let id = rng.int(1, 999999);
    while (used.has(id)) id = rng.int(1, 999999);
    used.add(id);
    records.push([id, `s${i}`]);
  }
  const added = [];
  for (let i = 0; i < 200; i++) {
    let id = rng.int(1, 999999);
    while (used.has(id)) id = rng.int(1, 999999);
    used.add(id);
    added.push([id, `t${i}`]);
  }
  const del = [];
  for (let i = 0; i < 200; i++) del.push(rng.int(1, 999999));
  cases.push({
    kind: 'boundary',
    category: '500 条记录 + 200 条新增 + 200 次删除',
    input: make(records, added, del),
    output: render([...records, ...added], del),
  });
}

return cases;
```

### 生成 normal 少量记录反复命中
```js gen
const cases = [];

function render(records, del) {
  const list = [];
  for (const [id, name] of records) {
    const k = list.findIndex((x) => x[0] >= id);
    if (k >= 0 && list[k][0] === id) continue;
    if (k < 0) list.push([id, name]);
    else list.splice(k, 0, [id, name]);
  }
  const pairs = (a) => a.map((x) => `${x[0]}:${x[1]}`).join(' ');
  const lines = [`roster ${list.length}${list.length ? ' ' + pairs(list) : ''}`];
  let removed = 0;
  for (const id of del) {
    const k = list.findIndex((x) => x[0] === id);
    if (k >= 0) {
      list.splice(k, 1);
      removed++;
    }
  }
  lines.push(`removed=${removed}`);
  lines.push(`after ${list.length}${list.length ? ' ' + pairs(list) : ''}`);
  lines.push(`freed=${list.length}`);
  return lines.join('\n') + '\n';
}

function make(records, added, del) {
  const lines = [String(records.length)];
  for (const [id, name] of records) lines.push(`${id} ${name}`);
  lines.push(String(added.length));
  for (const [id, name] of added) lines.push(`${id} ${name}`);
  lines.push(String(del.length));
  for (const id of del) lines.push(String(id));
  return lines.join('\n') + '\n';
}

/* 8 条记录（含 2 个重复学号）+ 5 条新增（含 2 个重复）+ 12 次删除 */
{
  const records = [[30, 'c'], [10, 'a'], [30, 'x'], [20, 'b'], [50, 'e'], [10, 'y'], [40, 'd'], [60, 'f']];
  const added = [[25, 'g'], [60, 'h'], [5, 'i'], [45, 'j'], [5, 'k']];
  const del = [10, 60, 25, 99, 5, 30, 45, 1000, 20, 50, 40, 35];
  cases.push({
    kind: 'normal',
    category: '8 + 5 条记录（含重复学号）与 12 次删除',
    input: make(records, added, del),
    output: render([...records, ...added], del),
  });
}

return cases;
```
