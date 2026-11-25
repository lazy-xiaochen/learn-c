---json
{
  "id": "p-s7-singly-list-1",
  "title": "学生名单：按接口实现单链表（头插、尾插、定位插入、删除、查找、销毁）",
  "difficulty": "L4",
  "knowledgePoints": ["s7-singly-list"],
  "special": "ds-implementation",
  "judge": { "mode": "function", "timeMs": 1000, "compare": "lines", "checkLeaks": true }
}
---

## 题目描述
一个班级的名单需要支持"随时加人、随时转走、按学号找人"。这就是一条单链表要干的全部事情：节点用 `malloc` 在堆上创建，删除时用 `free` 归还，最后整条链表必须一个节点不剩地释放干净。

测试驱动会用 `list.h` 里的接口驱动你的实现。请你在 `solution.c` 中实现下面七个函数：

```c
typedef struct StudentNode {
    int id;                          /* 学号 */
    char name[NAME_MAX];             /* 姓名，NAME_MAX = 16 */
    struct StudentNode *next;
} StudentNode;

typedef struct {
    StudentNode *head;               /* 第一个节点；空名单为 NULL */
    int count;                       /* 节点个数，必须与链长一致 */
} StudentList;

void list_init(StudentList *L);                                    /* 置为空名单 */
int  list_push_front(StudentList *L, int id, const char *name);    /* 头插 */
int  list_append(StudentList *L, int id, const char *name);        /* 尾插 */
int  list_insert_after(StudentList *L, int after_id, int id, const char *name);
int  list_remove(StudentList *L, int id);                          /* 删除第一个 id 匹配的节点 */
const StudentNode *list_find(const StudentList *L, int id);        /* 查找，找不到返回 NULL */
void list_destroy(StudentList *L);                                 /* 释放全部节点并清零 */
```

五条硬性要求：

1. **节点必须自己保存姓名**：`name` 是节点的数组字段，创建节点时要把参数字符串**复制**进去，不能只记一个指针（调用者的缓冲区会变）。
2. **`count` 必须始终正确**：只有真正把节点挂上链表时才加一；任何失败路径都不能改动 `count`、`head` 或已有的节点。
3. **`list_insert_after` 的三种结果**：成功 `1`；找不到 `after_id` 返回 `0`；内存不足返回 `-1`。
4. **删除要真正释放**：摘链之后立刻 `free`，不能只把节点从链上摘下来而不管内存。
5. **释放干净**：`list_destroy` 必须把每个节点都 `free` 掉，并把 `head`、`count` 清零。本题开启了**内存泄漏检查**——输出全对但结束时还有没归还的堆内存，会判 `LEAK`。

你只需要提交 `solution.c`，不要写 `main`，也不要提交 `list.h`。

## 输入格式
（由隐藏的测试驱动读取，供你理解测试方式）

第一行一个整数 `n`：初始名单的人数。
接下来 `n` 行，每行 `id name`：学号与姓名，按顺序**尾插**建表。
接下来一行一个整数 `q`：操作条数。
接下来 `q` 行，每行是下面五种之一：

```
F <id>                    查找
A <id> <name>             尾插
P <id> <name>             头插
I <after_id> <id> <name>  插到第一个学号为 after_id 的学生之后
R <id>                    删除第一个学号为 id 的学生
```

## 输出格式
（由隐藏的测试驱动输出）

```
count=<建表完成后 list_append 成功的次数，即 L.count>
```

然后每个操作输出一行：

```
find <id> <name>          找到时输出姓名，找不到输出 find <id> -
append <id> <ok|fail> count=<c>
push <id> <ok|fail> count=<c>
insert <after_id> <ok|missing|fail> count=<c>
remove <id> <ok|missing> count=<c>
```

`ok` 表示函数返回 `1`，`missing` 表示返回 `0`，`fail` 表示返回 `-1`（只有 `insert` 有这一种）。`count=<c>` 是**调用之后**的 `L.count`。

最后四组固定输出：

```
final <count> <id>:<name> <id>:<name> …      （按链表从头的顺序，空名单只输出 final 0）
reset=<destroy 之后 head==NULL 且 count==0 时为 1>
empty_remove=<在空名单上调用 list_remove 的返回值>
empty_find=<在空名单上调用 list_find，返回 NULL 时为 1>
empty_reset=<空名单 init 后直接 destroy，两个字段是否都清零>
```

## 数据范围
0 ≤ n ≤ 1000
0 ≤ q ≤ 1000
1 ≤ 学号 ≤ 999999（**允许重复**：重复学号是不同的人，`find` 返回第一个，`remove` 只删第一个）
姓名只含小写字母，长度 1–8

最大规模下 `append` 每次都要走到链表末尾，总操作量约 10⁶ 次节点访问，远低于 1 秒；输出最多约 1005 行、30KB，在平台 64KB 的输出上限之内。

## 示例
### 示例 1
```in
5
101 alice
102 bob
103 carol
104 dave
105 eve
7
F 103
F 999
A 106 frank
P 100 zoe
I 104 107 gina
R 102
R 102
```
```out
count=5
find 103 carol
find 999 -
append 106 ok count=6
push 100 ok count=7
insert 104 ok count=8
remove 102 ok count=7
remove 102 missing count=7
final 7 100:zoe 101:alice 103:carol 104:dave 107:gina 105:eve 106:frank
reset=1
empty_remove=0
empty_find=1
empty_reset=1
```
> 建表后是 `101 → 102 → 103 → 104 → 105`。`F 103` 找到 carol；`F 999` 没找到；`A 106` 尾插；`P 100` 头插（名单变成 `100 → 101 → …`）；`I 104 107` 在 dave 之后插入 gina；两次 `R 102`，第一次成功、第二次已经没有了，所以 `missing`。

### 示例 2（边界：空名单，所有操作都在空表上发生）
```in
0
4
F 1
A 1 ann
R 1
F 1
```
```out
count=0
find 1 -
append 1 ok count=1
remove 1 ok count=0
find 1 -
final 0
reset=1
empty_remove=0
empty_find=1
empty_reset=1
```
> 初始 `n = 0`，`count=0`，链表是空的。`F 1` 必须返回 NULL（输出 `-`）；`A 1 ann` 在空表上尾插是**最容易写错**的一步——没有"最后一个节点"，改的是 `head` 本身；`R 1` 删掉唯一节点后链表又空了。

## 提示
### 第 1 层
先写一个 `static StudentNode *make_node(int id, const char *name)`：`malloc`、复制 `id`、`strncpy` 姓名并保证结尾有 `'\0'`、`next = NULL`，失败返回 `NULL`。七个函数里有四个都要建节点，都调用它。然后想清楚 `count` 的规则：**只有节点真的挂上链表才 `count++`**，`malloc` 失败、`after_id` 找不到这两条路径都不能动它。

### 第 2 层
用二级指针统一"改 head"和"改某个节点的 next"：

```c
StudentNode **link = &L->head;
while (*link != NULL && (*link)->id != id) {
    link = &(*link)->next;
}
/* 现在 *link 就是第一个 id 匹配的节点（可能是 NULL） */
```

插入是 `node->next = *link; *link = node;`，删除是 `*link = dead->next; free(dead);`——两句都不需要为"表头"写特判。尾插就是让循环走到 `*link == NULL` 再把新节点放进去。

### 第 3 层
`insert_after` 要先把 `after_id` 找到再建节点（顺序反了会在"找不到"时白建一个节点并泄漏），并且区分两种失败：`*link == NULL` → `return 0`；`make_node` 返回 `NULL` → `return -1`。`destroy` 里必须**先存 `next` 再 `free`**，否则 `free` 之后就读不到下一个节点了。最后检查一遍：每一条 `malloc` 出来的节点，是否都在 `destroy`（或 `remove`）里被 `free` 过？

## 参考代码
```c file=solution.c
#include <stdlib.h>
#include <string.h>
#include "list.h"

void list_init(StudentList *L) {
    L->head = NULL;
    L->count = 0;
}

/* 建一个节点：姓名必须复制进节点自己的缓冲区 */
static StudentNode *make_node(int id, const char *name) {
    StudentNode *node = malloc(sizeof *node);
    if (node == NULL) {
        return NULL;
    }
    node->id = id;
    strncpy(node->name, name, sizeof node->name - 1);
    node->name[sizeof node->name - 1] = '\0';
    node->next = NULL;
    return node;
}

int list_push_front(StudentList *L, int id, const char *name) {
    StudentNode *node = make_node(id, name);
    if (node == NULL) {
        return 0;
    }
    node->next = L->head;      /* ① 先接上原来的表头 */
    L->head = node;            /* ② 再让 head 指向新节点 */
    L->count++;
    return 1;
}

int list_append(StudentList *L, int id, const char *name) {
    StudentNode *node = make_node(id, name);
    if (node == NULL) {
        return 0;
    }
    StudentNode **link = &L->head;
    while (*link != NULL) {
        link = &(*link)->next;
    }
    *link = node;
    L->count++;
    return 1;
}

int list_insert_after(StudentList *L, int after_id, int id, const char *name) {
    StudentNode **link = &L->head;
    while (*link != NULL && (*link)->id != after_id) {
        link = &(*link)->next;
    }
    if (*link == NULL) {
        return 0;              /* 找不到 after_id：不建节点，也不改 count */
    }
    StudentNode *node = make_node(id, name);
    if (node == NULL) {
        return -1;             /* 内存不足：链表完全不变 */
    }
    node->next = (*link)->next;
    (*link)->next = node;
    L->count++;
    return 1;
}

int list_remove(StudentList *L, int id) {
    StudentNode **link = &L->head;
    while (*link != NULL && (*link)->id != id) {
        link = &(*link)->next;
    }
    if (*link == NULL) {
        return 0;
    }
    StudentNode *dead = *link;
    *link = dead->next;        /* 先摘链 */
    free(dead);                /* 再释放 */
    L->count--;
    return 1;
}

const StudentNode *list_find(const StudentList *L, int id) {
    for (const StudentNode *p = L->head; p != NULL; p = p->next) {
        if (p->id == id) {
            return p;
        }
    }
    return NULL;
}

void list_destroy(StudentList *L) {
    StudentNode *p = L->head;
    while (p != NULL) {
        StudentNode *next = p->next;   /* 先记住下一个 */
        free(p);                       /* 再释放当前 */
        p = next;
    }
    L->head = NULL;
    L->count = 0;
}
```

## 初始代码
```c file=solution.c
#include <stdlib.h>
#include <string.h>
#include "list.h"

void list_init(StudentList *L) {
    L->head = NULL;
    L->count = 0;
}

int list_push_front(StudentList *L, int id, const char *name) {
    (void)L;
    (void)id;
    (void)name;
    /* TODO: malloc 一个节点、把 name 复制进去，再接到表头 */
    return 0;
}

int list_append(StudentList *L, int id, const char *name) {
    (void)L;
    (void)id;
    (void)name;
    /* TODO: 用 Node **link 走到末尾，把新节点挂上去 */
    return 0;
}

int list_insert_after(StudentList *L, int after_id, int id, const char *name) {
    (void)L;
    (void)after_id;
    (void)id;
    (void)name;
    /* TODO: 找到 after_id 后插入；找不到返回 0，内存不足返回 -1 */
    return 0;
}

int list_remove(StudentList *L, int id) {
    (void)L;
    (void)id;
    /* TODO: 找到节点，让前驱跳过它，free 之后 count 减一 */
    return 0;
}

const StudentNode *list_find(const StudentList *L, int id) {
    (void)L;
    (void)id;
    /* TODO: 遍历查找，找到返回节点指针，找不到返回 NULL */
    return NULL;
}

void list_destroy(StudentList *L) {
    (void)L;
    /* TODO: 逐个 free 所有节点，并把 head / count 清零 */
}
```

## 测试驱动
```c file=list.h
#ifndef LIST_H
#define LIST_H

#define NAME_MAX 16

/* 学生节点：id 是学号，name 是姓名（最多 15 个字符 + '\0'） */
typedef struct StudentNode {
    int id;
    char name[NAME_MAX];
    struct StudentNode *next;
} StudentNode;

/* 名单：head 指向第一个节点，count 是节点个数（必须与链长一致） */
typedef struct {
    StudentNode *head;
    int count;
} StudentList;

/* 置为空名单：head = NULL，count = 0。 */
void list_init(StudentList *L);

/* 头插。成功返回 1；内存不足返回 0（链表不变）。 */
int list_push_front(StudentList *L, int id, const char *name);

/* 尾插。成功返回 1；内存不足返回 0（链表不变）。 */
int list_append(StudentList *L, int id, const char *name);

/* 插到第一个 id 等于 after_id 的节点之后：
   成功 1；找不到 after_id 返回 0；内存不足返回 -1。
   只有成功时才让 count 加一。 */
int list_insert_after(StudentList *L, int after_id, int id, const char *name);

/* 删除第一个 id 匹配的节点并释放它。删除成功返回 1，找不到返回 0。 */
int list_remove(StudentList *L, int id);

/* 查找第一个 id 匹配的节点；找不到返回 NULL。 */
const StudentNode *list_find(const StudentList *L, int id);

/* 释放全部节点，并把 head / count 清零。对空名单调用也必须安全。 */
void list_destroy(StudentList *L);

#endif
```

```c file=harness.c hidden
#include <stdio.h>
#include "list.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > 1000) {
        return 0;
    }

    StudentList L;
    list_init(&L);
    for (int i = 0; i < n; i++) {
        int id;
        char name[NAME_MAX];
        if (scanf("%d %15s", &id, name) != 2) {
            list_destroy(&L);
            return 0;
        }
        if (!list_append(&L, id, name)) {
            printf("append_failed=%d\n", i);
            list_destroy(&L);
            return 0;
        }
    }
    printf("count=%d\n", L.count);

    int q;
    if (scanf("%d", &q) != 1 || q < 0 || q > 1000) {
        list_destroy(&L);
        return 0;
    }
    for (int i = 0; i < q; i++) {
        char op;
        if (scanf(" %c", &op) != 1) {
            break;
        }
        if (op == 'F') {
            int id;
            if (scanf("%d", &id) != 1) {
                break;
            }
            const StudentNode *p = list_find(&L, id);
            if (p != NULL) {
                printf("find %d %s\n", id, p->name);
            } else {
                printf("find %d -\n", id);
            }
        } else if (op == 'A') {
            int id;
            char name[NAME_MAX];
            if (scanf("%d %15s", &id, name) != 2) {
                break;
            }
            int ok = list_append(&L, id, name);
            printf("append %d %s count=%d\n", id, ok ? "ok" : "fail", L.count);
        } else if (op == 'P') {
            int id;
            char name[NAME_MAX];
            if (scanf("%d %15s", &id, name) != 2) {
                break;
            }
            int ok = list_push_front(&L, id, name);
            printf("push %d %s count=%d\n", id, ok ? "ok" : "fail", L.count);
        } else if (op == 'I') {
            int after;
            int id;
            char name[NAME_MAX];
            if (scanf("%d %d %15s", &after, &id, name) != 3) {
                break;
            }
            int r = list_insert_after(&L, after, id, name);
            const char *word = (r == 1) ? "ok" : ((r == 0) ? "missing" : "fail");
            printf("insert %d %s count=%d\n", after, word, L.count);
        } else if (op == 'R') {
            int id;
            if (scanf("%d", &id) != 1) {
                break;
            }
            int ok = list_remove(&L, id);
            printf("remove %d %s count=%d\n", id, ok ? "ok" : "missing", L.count);
        } else {
            break;
        }
    }

    printf("final %d", L.count);
    for (const StudentNode *p = L.head; p != NULL; p = p->next) {
        printf(" %d:%s", p->id, p->name);
    }
    printf("\n");

    list_destroy(&L);
    printf("reset=%d\n", (L.head == NULL && L.count == 0) ? 1 : 0);

    StudentList E;
    list_init(&E);
    printf("empty_remove=%d\n", list_remove(&E, 7));
    printf("empty_find=%d\n", list_find(&E, 7) == NULL ? 1 : 0);
    list_destroy(&E);
    printf("empty_reset=%d\n", (E.head == NULL && E.count == 0) ? 1 : 0);
    return 0;
}
```

## 复杂度
`list_push_front`、`list_init`、`list_destroy`（单节点）是 O(1)；`list_append`、`list_insert_after`、`list_remove`、`list_find` 最坏 O(n)。总时间 O(n + q·n) ≤ 约 2×10⁶ 次节点访问。
空间 O(n)：每个学生一个节点，节点里额外存一个 `int`、一个 16 字节的姓名数组和一根 `next` 指针。

## 常见错误
### `destroy` 只把 head 置空，节点一个都没释放 [LEAK]
`L->head = NULL;` 看起来"很安全"——指针确实空了，不会悬垂——但堆上的节点全部失联，永远无法归还。本题开启了泄漏检查，输出全对也会被判 `LEAK`，判题器会直接指出这些内存是在 `solution.c` 的哪一行 `malloc` 出来的。置空和释放是两件事：**先 `free`，再置空**。

```c file=solution.c expect=LEAK
#include <stdlib.h>
#include <string.h>
#include "list.h"

void list_init(StudentList *L) {
    L->head = NULL;
    L->count = 0;
}

static StudentNode *make_node(int id, const char *name) {
    StudentNode *node = malloc(sizeof *node);
    if (node == NULL) {
        return NULL;
    }
    node->id = id;
    strncpy(node->name, name, sizeof node->name - 1);
    node->name[sizeof node->name - 1] = '\0';
    node->next = NULL;
    return node;
}

int list_push_front(StudentList *L, int id, const char *name) {
    StudentNode *node = make_node(id, name);
    if (node == NULL) {
        return 0;
    }
    node->next = L->head;
    L->head = node;
    L->count++;
    return 1;
}

int list_append(StudentList *L, int id, const char *name) {
    StudentNode *node = make_node(id, name);
    if (node == NULL) {
        return 0;
    }
    StudentNode **link = &L->head;
    while (*link != NULL) {
        link = &(*link)->next;
    }
    *link = node;
    L->count++;
    return 1;
}

int list_insert_after(StudentList *L, int after_id, int id, const char *name) {
    StudentNode **link = &L->head;
    while (*link != NULL && (*link)->id != after_id) {
        link = &(*link)->next;
    }
    if (*link == NULL) {
        return 0;
    }
    StudentNode *node = make_node(id, name);
    if (node == NULL) {
        return -1;
    }
    node->next = (*link)->next;
    (*link)->next = node;
    L->count++;
    return 1;
}

int list_remove(StudentList *L, int id) {
    StudentNode **link = &L->head;
    while (*link != NULL && (*link)->id != id) {
        link = &(*link)->next;
    }
    if (*link == NULL) {
        return 0;
    }
    StudentNode *dead = *link;
    *link = dead->next;
    free(dead);
    L->count--;
    return 1;
}

const StudentNode *list_find(const StudentList *L, int id) {
    for (const StudentNode *p = L->head; p != NULL; p = p->next) {
        if (p->id == id) {
            return p;
        }
    }
    return NULL;
}

void list_destroy(StudentList *L) {
    L->head = NULL;          /* 错：只置空，所有节点都没有 free */
    L->count = 0;
}
```

### `append` 忘记维护 count [WA]
节点确实挂上去了，链长是对的，但 `L.count` 一直是 0。测试驱动每一行都打印 `count`，第一行 `count=0` 就和预期不符，整道题直接 `WA`。`count` 是"结构不变量"的一部分，和 `head` 一样需要每次改动后立刻维护好。

```c file=solution.c expect=WA
#include <stdlib.h>
#include <string.h>
#include "list.h"

void list_init(StudentList *L) {
    L->head = NULL;
    L->count = 0;
}

static StudentNode *make_node(int id, const char *name) {
    StudentNode *node = malloc(sizeof *node);
    if (node == NULL) {
        return NULL;
    }
    node->id = id;
    strncpy(node->name, name, sizeof node->name - 1);
    node->name[sizeof node->name - 1] = '\0';
    node->next = NULL;
    return node;
}

int list_push_front(StudentList *L, int id, const char *name) {
    StudentNode *node = make_node(id, name);
    if (node == NULL) {
        return 0;
    }
    node->next = L->head;
    L->head = node;
    L->count++;
    return 1;
}

int list_append(StudentList *L, int id, const char *name) {
    StudentNode *node = make_node(id, name);
    if (node == NULL) {
        return 0;
    }
    StudentNode **link = &L->head;
    while (*link != NULL) {
        link = &(*link)->next;
    }
    *link = node;            /* 错：忘了 L->count++ */
    return 1;
}

int list_insert_after(StudentList *L, int after_id, int id, const char *name) {
    StudentNode **link = &L->head;
    while (*link != NULL && (*link)->id != after_id) {
        link = &(*link)->next;
    }
    if (*link == NULL) {
        return 0;
    }
    StudentNode *node = make_node(id, name);
    if (node == NULL) {
        return -1;
    }
    node->next = (*link)->next;
    (*link)->next = node;
    L->count++;
    return 1;
}

int list_remove(StudentList *L, int id) {
    StudentNode **link = &L->head;
    while (*link != NULL && (*link)->id != id) {
        link = &(*link)->next;
    }
    if (*link == NULL) {
        return 0;
    }
    StudentNode *dead = *link;
    *link = dead->next;
    free(dead);
    L->count--;
    return 1;
}

const StudentNode *list_find(const StudentList *L, int id) {
    for (const StudentNode *p = L->head; p != NULL; p = p->next) {
        if (p->id == id) {
            return p;
        }
    }
    return NULL;
}

void list_destroy(StudentList *L) {
    StudentNode *p = L->head;
    while (p != NULL) {
        StudentNode *next = p->next;
        free(p);
        p = next;
    }
    L->head = NULL;
    L->count = 0;
}
```

### `remove` 先 free 再摘链 [RE]
```c
free(*link);              /* 错：先释放 */
*link = (*link)->next;    /* 再从已经归还的内存里读 next */
```
`free` 只是把内存还给分配器，里面可能立刻被重用。ASan 会给出一条 `heap-use-after-free`，判 `RE`。哪怕在某些输入上"碰巧还能跑"，这也是未定义行为。顺序永远是"**摘链在前，free 在后**"。

```c file=solution.c expect=RE
#include <stdlib.h>
#include <string.h>
#include "list.h"

void list_init(StudentList *L) {
    L->head = NULL;
    L->count = 0;
}

static StudentNode *make_node(int id, const char *name) {
    StudentNode *node = malloc(sizeof *node);
    if (node == NULL) {
        return NULL;
    }
    node->id = id;
    strncpy(node->name, name, sizeof node->name - 1);
    node->name[sizeof node->name - 1] = '\0';
    node->next = NULL;
    return node;
}

int list_push_front(StudentList *L, int id, const char *name) {
    StudentNode *node = make_node(id, name);
    if (node == NULL) {
        return 0;
    }
    node->next = L->head;
    L->head = node;
    L->count++;
    return 1;
}

int list_append(StudentList *L, int id, const char *name) {
    StudentNode *node = make_node(id, name);
    if (node == NULL) {
        return 0;
    }
    StudentNode **link = &L->head;
    while (*link != NULL) {
        link = &(*link)->next;
    }
    *link = node;
    L->count++;
    return 1;
}

int list_insert_after(StudentList *L, int after_id, int id, const char *name) {
    StudentNode **link = &L->head;
    while (*link != NULL && (*link)->id != after_id) {
        link = &(*link)->next;
    }
    if (*link == NULL) {
        return 0;
    }
    StudentNode *node = make_node(id, name);
    if (node == NULL) {
        return -1;
    }
    node->next = (*link)->next;
    (*link)->next = node;
    L->count++;
    return 1;
}

int list_remove(StudentList *L, int id) {
    StudentNode **link = &L->head;
    while (*link != NULL && (*link)->id != id) {
        link = &(*link)->next;
    }
    if (*link == NULL) {
        return 0;
    }
    free(*link);                 /* 错：先释放 */
    *link = (*link)->next;       /* 再从已释放的内存里读 next */
    L->count--;
    return 1;
}

const StudentNode *list_find(const StudentList *L, int id) {
    for (const StudentNode *p = L->head; p != NULL; p = p->next) {
        if (p->id == id) {
            return p;
        }
    }
    return NULL;
}

void list_destroy(StudentList *L) {
    StudentNode *p = L->head;
    while (p != NULL) {
        StudentNode *next = p->next;
        free(p);
        p = next;
    }
    L->head = NULL;
    L->count = 0;
}
```

### `insert_after` 把"找不到"和"内存不足"混成同一个返回值 [WA]
接口规定了三种结果：`1` 成功、`0` 找不到、`-1` 内存不足。如果"找不到"也返回 `-1`（或者把内存不足也返回 `0`），测试驱动就会把 `insert … missing` 打印成 `insert … fail`，输出与预期不符判定 `WA`。**返回值是接口的一部分**，不能只保证"失败"这一个信息量。

### 遍历条件写成 `p->next != NULL`，漏掉尾节点 [WA]
`for (p = head; p->next != NULL; p = p->next)` 在空链表上会直接解引用空指针（`RE`），非空时最后一个学生永远查不到、也算不进 `final`。条件必须是 `p != NULL`。

## 测试用例
### 01 sample 示例 1
```in
5
101 alice
102 bob
103 carol
104 dave
105 eve
7
F 103
F 999
A 106 frank
P 100 zoe
I 104 107 gina
R 102
R 102
```
```out
count=5
find 103 carol
find 999 -
append 106 ok count=6
push 100 ok count=7
insert 104 ok count=8
remove 102 ok count=7
remove 102 missing count=7
final 7 100:zoe 101:alice 103:carol 104:dave 107:gina 105:eve 106:frank
reset=1
empty_remove=0
empty_find=1
empty_reset=1
```

### 02 sample 示例 2
```in
0
4
F 1
A 1 ann
R 1
F 1
```
```out
count=0
find 1 -
append 1 ok count=1
remove 1 ok count=0
find 1 -
final 0
reset=1
empty_remove=0
empty_find=1
empty_reset=1
```

### 03 degenerate 只有一个学生，删掉之后又加一个
```in
1
7 solo
3
F 7
R 7
A 8 new
```
```out
count=1
find 7 solo
remove 7 ok count=0
append 8 ok count=1
final 1 8:new
reset=1
empty_remove=0
empty_find=1
empty_reset=1
```

### 04 trap 重复学号：find 返回第一个，remove 只删第一个
```in
4
1 a
2 b
1 c
3 d
4
F 1
R 1
F 1
R 1
```
```out
count=4
find 1 a
remove 1 ok count=3
find 1 c
remove 1 ok count=2
final 2 2:b 3:d
reset=1
empty_remove=0
empty_find=1
empty_reset=1
```

### 05 trap 插到尾节点之后、插到表头之后、插到不存在的学号之后
```in
3
1 a
2 b
3 c
4
I 3 4 d
I 9 5 e
I 1 6 f
A 7 g
```
```out
count=3
insert 3 ok count=4
insert 9 missing count=4
insert 1 ok count=5
append 7 ok count=6
final 6 1:a 6:f 2:b 3:c 4:d 7:g
reset=1
empty_remove=0
empty_find=1
empty_reset=1
```

### 06 normal 头插与尾插混合，count 必须每一步都对
```in
3
10 x
20 y
30 z
6
P 5 w
A 40 q
F 30
I 40 45 r
P 1 v
R 20
```
```out
count=3
push 5 ok count=4
append 40 ok count=5
find 30 z
insert 40 ok count=6
push 1 ok count=7
remove 20 ok count=6
final 6 1:v 5:w 10:x 30:z 40:q 45:r
reset=1
empty_remove=0
empty_find=1
empty_reset=1
```

### 生成 boundary 一千个学生加六百次操作
```js gen
const cases = [];

function render(roster, ops) {
  const list = roster.map((x) => x.slice());
  const lines = [`count=${list.length}`];
  for (const op of ops) {
    const kind = op[0];
    if (kind === 'F') {
      const hit = list.find((x) => x[0] === op[1]);
      lines.push(`find ${op[1]} ${hit ? hit[1] : '-'}`);
    } else if (kind === 'A') {
      list.push([op[1], op[2]]);
      lines.push(`append ${op[1]} ok count=${list.length}`);
    } else if (kind === 'P') {
      list.unshift([op[1], op[2]]);
      lines.push(`push ${op[1]} ok count=${list.length}`);
    } else if (kind === 'I') {
      const k = list.findIndex((x) => x[0] === op[1]);
      if (k < 0) {
        lines.push(`insert ${op[1]} missing count=${list.length}`);
      } else {
        list.splice(k + 1, 0, [op[2], op[3]]);
        lines.push(`insert ${op[1]} ok count=${list.length}`);
      }
    } else {
      const k = list.findIndex((x) => x[0] === op[1]);
      if (k < 0) {
        lines.push(`remove ${op[1]} missing count=${list.length}`);
      } else {
        list.splice(k, 1);
        lines.push(`remove ${op[1]} ok count=${list.length}`);
      }
    }
  }
  const pairs = list.map((x) => `${x[0]}:${x[1]}`).join(' ');
  lines.push(`final ${list.length}${list.length ? ' ' + pairs : ''}`);
  lines.push('reset=1', 'empty_remove=0', 'empty_find=1', 'empty_reset=1');
  return lines.join('\n') + '\n';
}

function make(roster, ops) {
  const lines = [String(roster.length)];
  for (const x of roster) lines.push(`${x[0]} ${x[1]}`);
  lines.push(String(ops.length));
  for (const op of ops) lines.push(op.join(' '));
  return lines.join('\n') + '\n';
}

/* 1000 个学生、600 次操作 */
{
  const roster = [];
  for (let i = 1; i <= 1000; i++) roster.push([i, `s${i}`]);
  const ops = [];
  for (let i = 0; i < 200; i++) ops.push(['F', rng.int(1, 1000)]);
  for (let i = 0; i < 200; i++) ops.push(['A', 2000 + i, `a${i}`]);
  for (let i = 0; i < 100; i++) ops.push(['I', rng.int(1, 1000), 3000 + i, `i${i}`]);
  for (let i = 0; i < 100; i++) ops.push(['R', rng.int(1, 2200)]);
  cases.push({
    kind: 'boundary',
    category: '1000 个学生、600 次操作',
    input: make(roster, ops),
    output: render(roster, ops),
  });
}

return cases;
```

### 生成 normal 小名单上的密集增删
```js gen
const cases = [];

function render(roster, ops) {
  const list = roster.map((x) => x.slice());
  const lines = [`count=${list.length}`];
  for (const op of ops) {
    const kind = op[0];
    if (kind === 'F') {
      const hit = list.find((x) => x[0] === op[1]);
      lines.push(`find ${op[1]} ${hit ? hit[1] : '-'}`);
    } else if (kind === 'A') {
      list.push([op[1], op[2]]);
      lines.push(`append ${op[1]} ok count=${list.length}`);
    } else if (kind === 'P') {
      list.unshift([op[1], op[2]]);
      lines.push(`push ${op[1]} ok count=${list.length}`);
    } else if (kind === 'I') {
      const k = list.findIndex((x) => x[0] === op[1]);
      if (k < 0) {
        lines.push(`insert ${op[1]} missing count=${list.length}`);
      } else {
        list.splice(k + 1, 0, [op[2], op[3]]);
        lines.push(`insert ${op[1]} ok count=${list.length}`);
      }
    } else {
      const k = list.findIndex((x) => x[0] === op[1]);
      if (k < 0) {
        lines.push(`remove ${op[1]} missing count=${list.length}`);
      } else {
        list.splice(k, 1);
        lines.push(`remove ${op[1]} ok count=${list.length}`);
      }
    }
  }
  const pairs = list.map((x) => `${x[0]}:${x[1]}`).join(' ');
  lines.push(`final ${list.length}${list.length ? ' ' + pairs : ''}`);
  lines.push('reset=1', 'empty_remove=0', 'empty_find=1', 'empty_reset=1');
  return lines.join('\n') + '\n';
}

function make(roster, ops) {
  const lines = [String(roster.length)];
  for (const x of roster) lines.push(`${x[0]} ${x[1]}`);
  lines.push(String(ops.length));
  for (const op of ops) lines.push(op.join(' '));
  return lines.join('\n') + '\n';
}

/* 5 个学生、300 次混合操作，名单很短所以每次都会反复命中和落空 */
{
  const roster = [[11, 'ken'], [12, 'lee'], [13, 'mia'], [14, 'ned'], [15, 'ora']];
  const ops = [];
  let nextId = 100;
  for (let i = 0; i < 300; i++) {
    const pick = rng.int(0, 4);
    if (pick === 0) ops.push(['F', rng.int(11, 20)]);
    else if (pick === 1) ops.push(['A', nextId++, `n${i}`]);
    else if (pick === 2) ops.push(['P', nextId++, `p${i}`]);
    else if (pick === 3) ops.push(['I', rng.int(11, 130), nextId++, `x${i}`]);
    else ops.push(['R', rng.int(11, 130)]);
  }
  cases.push({
    kind: 'normal',
    category: '5 个学生、300 次混合操作',
    input: make(roster, ops),
    output: render(roster, ops),
  });
}

return cases;
```
