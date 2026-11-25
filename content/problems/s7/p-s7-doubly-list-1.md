---json
{
  "id": "p-s7-doubly-list-1",
  "title": "歌单：用双向链表维护播放列表（头插、定位插入、删除、正反两遍遍历）",
  "difficulty": "L4",
  "knowledgePoints": ["s7-doubly-list"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个播放列表需要同时支持"下一首"和"上一首"，这正好是双向链表的用武之地：每个节点有 `next` 也有 `prev`，于是正向和反向遍历都是 O(n)，删除一个已经拿到的节点也是 O(1)。

请你用**双向链表**（`head` + `tail` 两个指针，不带哨兵）维护一个歌单：

1. 读入 `n` 首歌，依次**尾插**；
2. 读入 `m` 条插入指令 `<after> <id> <name>`：把新歌插到 `after` 这首歌**之后**；`after = 0` 表示插到**表头**（成为第一首）。数据保证 `after != 0` 时这首歌一定存在；
3. 读入 `k` 个要移除的 id，逐个删除并 `free`；数据保证这些 id 一定存在；
4. 先把歌单**正向**打印一遍（沿 `next`），再**反向**打印一遍（沿 `prev`），最后把整条链表释放干净。

要求：`prev` 和 `next` 必须同时维护正确——正向打印对、反向打印错，就是只改了一半的指针。

## 输入格式
第一行一个整数 `n`。
接下来 `n` 行，每行 `id name`：按顺序尾插。
接下来一行一个整数 `m`。
接下来 `m` 行，每行 `after id name`。
接下来一行一个整数 `k`。
接下来 `k` 行，每行一个整数 `id`。

## 输出格式
四行：

```
forward <节点数> <id>:<name> <id>:<name> …     （沿 next 从头到尾；空表只输出 forward 0）
backward <节点数> <id>:<name> <id>:<name> …    （沿 prev 从尾到头；空表只输出 backward 0）
removed=<实际删除的节点数>
freed=<销毁整条链表时释放的节点数>
```

## 数据范围
0 ≤ n ≤ 300
0 ≤ m ≤ 100
0 ≤ k ≤ 100
1 ≤ id ≤ 99999，**互不相同**
姓名只含小写字母，长度 1–8

插入和删除都是一次指针操作，定位（按 id 找节点）最坏 O(n)，总时间约 O((n + m + k)·n) ≤ 5×10⁴ 次节点访问；输出最多约 300 个 `id:name` 对，远小于 64KB。

## 示例
### 示例 1
```in
4
10 a
20 b
30 c
40 d
3
0 5 e
20 25 f
40 45 g
2
20
45
```
```out
forward 5 5:e 10:a 25:f 30:c 40:d
backward 5 40:d 30:c 25:f 10:a 5:e
removed=2
freed=5
```
> 初始歌单 `10 → 20 → 30 → 40`。`0 5 e` 是头插，`5 → 10 → 20 → 30 → 40`；`20 25 f` 插到 20 之后；`40 45 g` 插到 40 之后（40 是尾节点，所以新节点的 `next` 是 `NULL`）。删除 20 和 45 之后剩 5 首，反向打印时沿 `prev` 走，顺序恰好与正向相反。

### 示例 2（边界：空歌单，全部靠头插建立）
```in
0
3
0 1 a
0 2 b
0 3 c
0
```
```out
forward 3 3:c 2:b 1:a
backward 3 1:a 2:b 3:c
removed=0
freed=3
```
> 初始 `n = 0`，`head` 和 `tail` 都是 `NULL`。每次 `after = 0` 都插到表头：`1 → 2 → 1 → 3 → 2 → 1`，所以最终正向是 `3 2 1`、反向是 `1 2 3`。空表头插时必须同时把 `head` 和 `tail` 都指向新节点——这是双向链表最容易漏的一处。

## 提示
### 第 1 层
先写 `append`（尾插）：新节点的 `prev = tail`；如果 `tail != NULL` 就 `tail->next = node`，否则说明表是空的，`head = node`；最后 `tail = node`。然后写 `insert_after(pos, node)` 和 `remove(pos)`，注意它们都要处理"`pos` 是头/尾节点"的分支。

### 第 2 层
插到 `pos` 之后要改**四根**指针，顺序是"先接新节点，再改旧邻居，最后改 `pos`"：

```c
node->prev = pos;
node->next = pos->next;             /* ① 先读旧后继 */
if (pos->next != NULL) {
    pos->next->prev = node;         /* ② 旧后继回头 */
} else {
    tail = node;                    /*    pos 原来是尾巴 */
}
pos->next = node;                   /* ③ 最后才断开旧连接 */
```

删除对称：`node->prev->next = node->next;`（没有前驱就改 `head`）、`node->next->prev = node->prev;`（没有后继就改 `tail`），两根都改完才 `free`。

### 第 3 层
反向打印要从 `tail` 出发、沿 `prev` 走，终止条件是 `p != NULL`。如果反向输出和正向一模一样，说明你用的是 `next`；如果反向少一个或多个，说明某次插入/删除漏改了 `prev`。最后销毁时**先存 `next` 再 `free`**，并统计释放个数填进 `freed`。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define NAME_MAX 16

typedef struct Song {
    int id;
    char name[NAME_MAX];
    struct Song *prev;
    struct Song *next;
} Song;

typedef struct {
    Song *head;
    Song *tail;
    int count;
} Playlist;

static void pl_init(Playlist *L) {
    L->head = NULL;
    L->tail = NULL;
    L->count = 0;
}

static Song *make_song(int id, const char *name) {
    Song *s = malloc(sizeof *s);
    if (s == NULL) {
        return NULL;
    }
    s->id = id;
    strncpy(s->name, name, sizeof s->name - 1);
    s->name[sizeof s->name - 1] = '\0';
    s->prev = NULL;
    s->next = NULL;
    return s;
}

static int pl_append(Playlist *L, int id, const char *name) {
    Song *s = make_song(id, name);
    if (s == NULL) {
        return 0;
    }
    s->prev = L->tail;
    if (L->tail != NULL) {
        L->tail->next = s;
    } else {
        L->head = s;               /* 空表：新节点同时是头 */
    }
    L->tail = s;
    L->count++;
    return 1;
}

/* 插到 pos 之后；pos == NULL 表示插到表头 */
static int pl_insert(Playlist *L, Song *pos, int id, const char *name) {
    Song *s = make_song(id, name);
    if (s == NULL) {
        return 0;
    }
    if (pos == NULL) {
        s->next = L->head;
        if (L->head != NULL) {
            L->head->prev = s;
        } else {
            L->tail = s;           /* 空表：新节点也是尾 */
        }
        L->head = s;
        L->count++;
        return 1;
    }
    s->prev = pos;                 /* ① */
    s->next = pos->next;           /* ② 读的是旧后继 */
    if (pos->next != NULL) {
        pos->next->prev = s;       /* ③ 旧后继回头 */
    } else {
        L->tail = s;               /*    pos 原来是尾巴 */
    }
    pos->next = s;                 /* ④ 最后才断开旧连接 */
    L->count++;
    return 1;
}

static Song *pl_find(Playlist *L, int id) {
    for (Song *p = L->head; p != NULL; p = p->next) {
        if (p->id == id) {
            return p;
        }
    }
    return NULL;
}

static int pl_remove(Playlist *L, Song *s) {
    if (s == NULL) {
        return 0;
    }
    if (s->prev != NULL) {
        s->prev->next = s->next;
    } else {
        L->head = s->next;         /* 删的是头节点 */
    }
    if (s->next != NULL) {
        s->next->prev = s->prev;
    } else {
        L->tail = s->prev;         /* 删的是尾节点 */
    }
    free(s);
    L->count--;
    return 1;
}

static void print_forward(const Playlist *L) {
    printf("forward %d", L->count);
    for (const Song *p = L->head; p != NULL; p = p->next) {
        printf(" %d:%s", p->id, p->name);
    }
    printf("\n");
}

static void print_backward(const Playlist *L) {
    printf("backward %d", L->count);
    for (const Song *p = L->tail; p != NULL; p = p->prev) {
        printf(" %d:%s", p->id, p->name);
    }
    printf("\n");
}

static int pl_destroy(Playlist *L) {
    int freed = 0;
    Song *p = L->head;
    while (p != NULL) {
        Song *next = p->next;      /* 先存 next */
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
    Playlist L;
    pl_init(&L);

    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > 300) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        int id;
        char name[NAME_MAX];
        if (scanf("%d %15s", &id, name) != 2) {
            pl_destroy(&L);
            return 0;
        }
        if (!pl_append(&L, id, name)) {
            pl_destroy(&L);
            return 0;
        }
    }

    int m;
    if (scanf("%d", &m) != 1 || m < 0 || m > 100) {
        pl_destroy(&L);
        return 0;
    }
    for (int i = 0; i < m; i++) {
        int after;
        int id;
        char name[NAME_MAX];
        if (scanf("%d %d %15s", &after, &id, name) != 3) {
            break;
        }
        Song *pos = (after == 0) ? NULL : pl_find(&L, after);
        if (after != 0 && pos == NULL) {
            continue;                  /* 数据保证不会发生 */
        }
        if (!pl_insert(&L, pos, id, name)) {
            break;
        }
    }

    int k;
    if (scanf("%d", &k) != 1 || k < 0 || k > 100) {
        pl_destroy(&L);
        return 0;
    }
    int removed = 0;
    for (int i = 0; i < k; i++) {
        int id;
        if (scanf("%d", &id) != 1) {
            break;
        }
        if (pl_remove(&L, pl_find(&L, id))) {
            removed++;
        }
    }

    print_forward(&L);
    print_backward(&L);
    printf("removed=%d\n", removed);

    int freed = pl_destroy(&L);
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

typedef struct Song {
    int id;
    char name[NAME_MAX];
    struct Song *prev;
    struct Song *next;
} Song;

typedef struct {
    Song *head;
    Song *tail;
    int count;
} Playlist;

static void pl_init(Playlist *L) {
    L->head = NULL;
    L->tail = NULL;
    L->count = 0;
}

static int pl_append(Playlist *L, int id, const char *name) {
    (void)L;
    (void)id;
    (void)name;
    /* TODO: 建节点，把 prev 接上 tail，再更新 head / tail / count */
    return 0;
}

static int pl_insert(Playlist *L, Song *pos, int id, const char *name) {
    (void)L;
    (void)pos;
    (void)id;
    (void)name;
    /* TODO: pos 为 NULL 时插到表头；否则插到 pos 之后，注意四根指针的顺序 */
    return 0;
}

static Song *pl_find(Playlist *L, int id) {
    (void)L;
    (void)id;
    /* TODO: 沿 next 查找 id */
    return NULL;
}

static int pl_remove(Playlist *L, Song *s) {
    (void)L;
    (void)s;
    /* TODO: 两根方向都改好再 free，并维护 head / tail / count */
    return 0;
}

static void print_forward(const Playlist *L) {
    printf("forward %d", L->count);
    for (const Song *p = L->head; p != NULL; p = p->next) {
        printf(" %d:%s", p->id, p->name);
    }
    printf("\n");
}

static void print_backward(const Playlist *L) {
    printf("backward %d", L->count);
    for (const Song *p = L->tail; p != NULL; p = p->prev) {
        printf(" %d:%s", p->id, p->name);
    }
    printf("\n");
}

static int pl_destroy(Playlist *L) {
    (void)L;
    /* TODO: 释放全部节点并返回释放的个数 */
    return 0;
}

int main(void) {
    Playlist L;
    pl_init(&L);

    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > 300) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        int id;
        char name[NAME_MAX];
        if (scanf("%d %15s", &id, name) != 2) {
            pl_destroy(&L);
            return 0;
        }
        if (!pl_append(&L, id, name)) {
            pl_destroy(&L);
            return 0;
        }
    }

    int m;
    if (scanf("%d", &m) != 1 || m < 0 || m > 100) {
        pl_destroy(&L);
        return 0;
    }
    for (int i = 0; i < m; i++) {
        int after;
        int id;
        char name[NAME_MAX];
        if (scanf("%d %d %15s", &after, &id, name) != 3) {
            break;
        }
        Song *pos = (after == 0) ? NULL : pl_find(&L, after);
        if (after != 0 && pos == NULL) {
            continue;
        }
        if (!pl_insert(&L, pos, id, name)) {
            break;
        }
    }

    int k;
    if (scanf("%d", &k) != 1 || k < 0 || k > 100) {
        pl_destroy(&L);
        return 0;
    }
    int removed = 0;
    for (int i = 0; i < k; i++) {
        int id;
        if (scanf("%d", &id) != 1) {
            break;
        }
        if (pl_remove(&L, pl_find(&L, id))) {
            removed++;
        }
    }

    print_forward(&L);
    print_backward(&L);
    printf("removed=%d\n", removed);

    int freed = pl_destroy(&L);
    printf("freed=%d\n", freed);
    return 0;
}
```

## 复杂度
`pl_append`、`pl_remove`、`pl_init`、`pl_destroy` 都是 O(1)（删除的前提是已经拿到节点）；`pl_find` 最坏 O(n)，每条插入/删除指令都要调用一次，所以总时间 O(n + (m + k)·n) ≤ 300 + 200×300 = 6×10⁴ 次节点访问。
空间 O(n)：每首歌一个节点，比单向链表多一根 `prev` 指针。

## 常见错误
### 插入时漏掉"旧后继回头"这一句 [RE|WA]
```c
s->prev = pos;
s->next = pos->next;
/* 少了 pos->next->prev = s; */
if (pos->next == NULL) { L->tail = s; }
pos->next = s;
```
正向打印完全正确，但新节点后面的那个节点，它的 `prev` 还指向前驱，`prev` 链从这里就断了。后果分两种：反向遍历跳过新节点（`WA`）；或者后续删除某个节点时沿着错误的 `prev` 找到一块**已经释放**的内存，ASan 直接判 `RE`。双向链表的每根 `next` 都应该有一根对应的 `prev`，改一边就必须改另一边。

```c file=main.c expect=RE|WA
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define NAME_MAX 16

typedef struct Song {
    int id;
    char name[NAME_MAX];
    struct Song *prev;
    struct Song *next;
} Song;

typedef struct {
    Song *head;
    Song *tail;
    int count;
} Playlist;

static void pl_init(Playlist *L) {
    L->head = NULL;
    L->tail = NULL;
    L->count = 0;
}

static Song *make_song(int id, const char *name) {
    Song *s = malloc(sizeof *s);
    if (s == NULL) {
        return NULL;
    }
    s->id = id;
    strncpy(s->name, name, sizeof s->name - 1);
    s->name[sizeof s->name - 1] = '\0';
    s->prev = NULL;
    s->next = NULL;
    return s;
}

static int pl_append(Playlist *L, int id, const char *name) {
    Song *s = make_song(id, name);
    if (s == NULL) {
        return 0;
    }
    s->prev = L->tail;
    if (L->tail != NULL) {
        L->tail->next = s;
    } else {
        L->head = s;
    }
    L->tail = s;
    L->count++;
    return 1;
}

static int pl_insert(Playlist *L, Song *pos, int id, const char *name) {
    Song *s = make_song(id, name);
    if (s == NULL) {
        return 0;
    }
    if (pos == NULL) {
        s->next = L->head;
        if (L->head != NULL) {
            L->head->prev = s;
        } else {
            L->tail = s;
        }
        L->head = s;
        L->count++;
        return 1;
    }
    s->prev = pos;
    s->next = pos->next;           /* 错：漏了 pos->next->prev = s; */
    if (pos->next == NULL) {
        L->tail = s;
    }
    pos->next = s;
    L->count++;
    return 1;
}

static Song *pl_find(Playlist *L, int id) {
    for (Song *p = L->head; p != NULL; p = p->next) {
        if (p->id == id) {
            return p;
        }
    }
    return NULL;
}

static int pl_remove(Playlist *L, Song *s) {
    if (s == NULL) {
        return 0;
    }
    if (s->prev != NULL) {
        s->prev->next = s->next;
    } else {
        L->head = s->next;
    }
    if (s->next != NULL) {
        s->next->prev = s->prev;
    } else {
        L->tail = s->prev;
    }
    free(s);
    L->count--;
    return 1;
}

static void print_forward(const Playlist *L) {
    printf("forward %d", L->count);
    for (const Song *p = L->head; p != NULL; p = p->next) {
        printf(" %d:%s", p->id, p->name);
    }
    printf("\n");
}

static void print_backward(const Playlist *L) {
    printf("backward %d", L->count);
    for (const Song *p = L->tail; p != NULL; p = p->prev) {
        printf(" %d:%s", p->id, p->name);
    }
    printf("\n");
}

static int pl_destroy(Playlist *L) {
    int freed = 0;
    Song *p = L->head;
    while (p != NULL) {
        Song *next = p->next;
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
    Playlist L;
    pl_init(&L);

    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > 300) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        int id;
        char name[NAME_MAX];
        if (scanf("%d %15s", &id, name) != 2) {
            pl_destroy(&L);
            return 0;
        }
        if (!pl_append(&L, id, name)) {
            pl_destroy(&L);
            return 0;
        }
    }

    int m;
    if (scanf("%d", &m) != 1 || m < 0 || m > 100) {
        pl_destroy(&L);
        return 0;
    }
    for (int i = 0; i < m; i++) {
        int after;
        int id;
        char name[NAME_MAX];
        if (scanf("%d %d %15s", &after, &id, name) != 3) {
            break;
        }
        Song *pos = (after == 0) ? NULL : pl_find(&L, after);
        if (after != 0 && pos == NULL) {
            continue;
        }
        if (!pl_insert(&L, pos, id, name)) {
            break;
        }
    }

    int k;
    if (scanf("%d", &k) != 1 || k < 0 || k > 100) {
        pl_destroy(&L);
        return 0;
    }
    int removed = 0;
    for (int i = 0; i < k; i++) {
        int id;
        if (scanf("%d", &id) != 1) {
            break;
        }
        if (pl_remove(&L, pl_find(&L, id))) {
            removed++;
        }
    }

    print_forward(&L);
    print_backward(&L);
    printf("removed=%d\n", removed);

    int freed = pl_destroy(&L);
    printf("freed=%d\n", freed);
    return 0;
}
```

### 删除尾节点时忘了更新 tail [RE]
```c
if (s->next != NULL) {
    s->next->prev = s->prev;
}
/* 少了 else { L->tail = s->prev; } */
free(s);
```
`tail` 仍然指向已经释放的节点，反向打印从 `tail` 出发就是 use-after-free，ASan 直接判 `RE`。正向打印完全正常，所以这类 bug 只看正向输出是发现不了的——这也是本题要求**两个方向都打印**的原因。

```c file=main.c expect=RE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define NAME_MAX 16

typedef struct Song {
    int id;
    char name[NAME_MAX];
    struct Song *prev;
    struct Song *next;
} Song;

typedef struct {
    Song *head;
    Song *tail;
    int count;
} Playlist;

static void pl_init(Playlist *L) {
    L->head = NULL;
    L->tail = NULL;
    L->count = 0;
}

static Song *make_song(int id, const char *name) {
    Song *s = malloc(sizeof *s);
    if (s == NULL) {
        return NULL;
    }
    s->id = id;
    strncpy(s->name, name, sizeof s->name - 1);
    s->name[sizeof s->name - 1] = '\0';
    s->prev = NULL;
    s->next = NULL;
    return s;
}

static int pl_append(Playlist *L, int id, const char *name) {
    Song *s = make_song(id, name);
    if (s == NULL) {
        return 0;
    }
    s->prev = L->tail;
    if (L->tail != NULL) {
        L->tail->next = s;
    } else {
        L->head = s;
    }
    L->tail = s;
    L->count++;
    return 1;
}

static int pl_insert(Playlist *L, Song *pos, int id, const char *name) {
    Song *s = make_song(id, name);
    if (s == NULL) {
        return 0;
    }
    if (pos == NULL) {
        s->next = L->head;
        if (L->head != NULL) {
            L->head->prev = s;
        } else {
            L->tail = s;
        }
        L->head = s;
        L->count++;
        return 1;
    }
    s->prev = pos;
    s->next = pos->next;
    if (pos->next != NULL) {
        pos->next->prev = s;
    } else {
        L->tail = s;
    }
    pos->next = s;
    L->count++;
    return 1;
}

static Song *pl_find(Playlist *L, int id) {
    for (Song *p = L->head; p != NULL; p = p->next) {
        if (p->id == id) {
            return p;
        }
    }
    return NULL;
}

static int pl_remove(Playlist *L, Song *s) {
    if (s == NULL) {
        return 0;
    }
    if (s->prev != NULL) {
        s->prev->next = s->next;
    } else {
        L->head = s->next;
    }
    if (s->next != NULL) {
        s->next->prev = s->prev;
    }
    /* 错：删的是尾节点时没有更新 L->tail */
    free(s);
    L->count--;
    return 1;
}

static void print_forward(const Playlist *L) {
    printf("forward %d", L->count);
    for (const Song *p = L->head; p != NULL; p = p->next) {
        printf(" %d:%s", p->id, p->name);
    }
    printf("\n");
}

static void print_backward(const Playlist *L) {
    printf("backward %d", L->count);
    for (const Song *p = L->tail; p != NULL; p = p->prev) {
        printf(" %d:%s", p->id, p->name);
    }
    printf("\n");
}

static int pl_destroy(Playlist *L) {
    int freed = 0;
    Song *p = L->head;
    while (p != NULL) {
        Song *next = p->next;
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
    Playlist L;
    pl_init(&L);

    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > 300) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        int id;
        char name[NAME_MAX];
        if (scanf("%d %15s", &id, name) != 2) {
            pl_destroy(&L);
            return 0;
        }
        if (!pl_append(&L, id, name)) {
            pl_destroy(&L);
            return 0;
        }
    }

    int m;
    if (scanf("%d", &m) != 1 || m < 0 || m > 100) {
        pl_destroy(&L);
        return 0;
    }
    for (int i = 0; i < m; i++) {
        int after;
        int id;
        char name[NAME_MAX];
        if (scanf("%d %d %15s", &after, &id, name) != 3) {
            break;
        }
        Song *pos = (after == 0) ? NULL : pl_find(&L, after);
        if (after != 0 && pos == NULL) {
            continue;
        }
        if (!pl_insert(&L, pos, id, name)) {
            break;
        }
    }

    int k;
    if (scanf("%d", &k) != 1 || k < 0 || k > 100) {
        pl_destroy(&L);
        return 0;
    }
    int removed = 0;
    for (int i = 0; i < k; i++) {
        int id;
        if (scanf("%d", &id) != 1) {
            break;
        }
        if (pl_remove(&L, pl_find(&L, id))) {
            removed++;
        }
    }

    print_forward(&L);
    print_backward(&L);
    printf("removed=%d\n", removed);

    int freed = pl_destroy(&L);
    printf("freed=%d\n", freed);
    return 0;
}
```

### 反向遍历也用了 next [WA]
`for (p = tail; p != NULL; p = p->next)` 会立刻越界（`tail->next` 是 `NULL` 就什么都不打印）或者沿着 `next` 从尾巴上掉下去。反向遍历必须用 `prev`，起点必须是 `tail`。如果 `backward` 和 `forward` 输出完全相同，那一定是两处都写了 `next`。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define NAME_MAX 16

typedef struct Song {
    int id;
    char name[NAME_MAX];
    struct Song *prev;
    struct Song *next;
} Song;

typedef struct {
    Song *head;
    Song *tail;
    int count;
} Playlist;

static void pl_init(Playlist *L) {
    L->head = NULL;
    L->tail = NULL;
    L->count = 0;
}

static Song *make_song(int id, const char *name) {
    Song *s = malloc(sizeof *s);
    if (s == NULL) {
        return NULL;
    }
    s->id = id;
    strncpy(s->name, name, sizeof s->name - 1);
    s->name[sizeof s->name - 1] = '\0';
    s->prev = NULL;
    s->next = NULL;
    return s;
}

static int pl_append(Playlist *L, int id, const char *name) {
    Song *s = make_song(id, name);
    if (s == NULL) {
        return 0;
    }
    s->prev = L->tail;
    if (L->tail != NULL) {
        L->tail->next = s;
    } else {
        L->head = s;
    }
    L->tail = s;
    L->count++;
    return 1;
}

static int pl_insert(Playlist *L, Song *pos, int id, const char *name) {
    Song *s = make_song(id, name);
    if (s == NULL) {
        return 0;
    }
    if (pos == NULL) {
        s->next = L->head;
        if (L->head != NULL) {
            L->head->prev = s;
        } else {
            L->tail = s;
        }
        L->head = s;
        L->count++;
        return 1;
    }
    s->prev = pos;
    s->next = pos->next;
    if (pos->next != NULL) {
        pos->next->prev = s;
    } else {
        L->tail = s;
    }
    pos->next = s;
    L->count++;
    return 1;
}

static Song *pl_find(Playlist *L, int id) {
    for (Song *p = L->head; p != NULL; p = p->next) {
        if (p->id == id) {
            return p;
        }
    }
    return NULL;
}

static int pl_remove(Playlist *L, Song *s) {
    if (s == NULL) {
        return 0;
    }
    if (s->prev != NULL) {
        s->prev->next = s->next;
    } else {
        L->head = s->next;
    }
    if (s->next != NULL) {
        s->next->prev = s->prev;
    } else {
        L->tail = s->prev;
    }
    free(s);
    L->count--;
    return 1;
}

static void print_forward(const Playlist *L) {
    printf("forward %d", L->count);
    for (const Song *p = L->head; p != NULL; p = p->next) {
        printf(" %d:%s", p->id, p->name);
    }
    printf("\n");
}

static void print_backward(const Playlist *L) {
    printf("backward %d", L->count);
    for (const Song *p = L->tail; p != NULL; p = p->next) {   /* 错：应该用 prev */
        printf(" %d:%s", p->id, p->name);
    }
    printf("\n");
}

static int pl_destroy(Playlist *L) {
    int freed = 0;
    Song *p = L->head;
    while (p != NULL) {
        Song *next = p->next;
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
    Playlist L;
    pl_init(&L);

    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > 300) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        int id;
        char name[NAME_MAX];
        if (scanf("%d %15s", &id, name) != 2) {
            pl_destroy(&L);
            return 0;
        }
        if (!pl_append(&L, id, name)) {
            pl_destroy(&L);
            return 0;
        }
    }

    int m;
    if (scanf("%d", &m) != 1 || m < 0 || m > 100) {
        pl_destroy(&L);
        return 0;
    }
    for (int i = 0; i < m; i++) {
        int after;
        int id;
        char name[NAME_MAX];
        if (scanf("%d %d %15s", &after, &id, name) != 3) {
            break;
        }
        Song *pos = (after == 0) ? NULL : pl_find(&L, after);
        if (after != 0 && pos == NULL) {
            continue;
        }
        if (!pl_insert(&L, pos, id, name)) {
            break;
        }
    }

    int k;
    if (scanf("%d", &k) != 1 || k < 0 || k > 100) {
        pl_destroy(&L);
        return 0;
    }
    int removed = 0;
    for (int i = 0; i < k; i++) {
        int id;
        if (scanf("%d", &id) != 1) {
            break;
        }
        if (pl_remove(&L, pl_find(&L, id))) {
            removed++;
        }
    }

    print_forward(&L);
    print_backward(&L);
    printf("removed=%d\n", removed);

    int freed = pl_destroy(&L);
    printf("freed=%d\n", freed);
    return 0;
}
```

### 头插到空表时没有更新 tail [WA]
空表时 `head == tail == NULL`，头插之后两个指针都必须指向新节点。只写 `L->head = s;` 而不写 `L->tail = s;`，下一次尾插（或反向打印）就会从 `NULL` 出发，`backward` 输出 0 个，`freed` 也会少。空表是每条插入路径都必须考虑的边界。

### 删除节点后仍然从它出发继续遍历 [RE]
在 `pl_remove` 之后还想"顺手"用 `s->next` 继续走，就是 use-after-free。删除函数的参数只用来摘链和 `free`，调用者如果需要下一个节点，应该自己在调用前保存。

## 测试用例
### 01 sample 示例 1
```in
4
10 a
20 b
30 c
40 d
3
0 5 e
20 25 f
40 45 g
2
20
45
```
```out
forward 5 5:e 10:a 25:f 30:c 40:d
backward 5 40:d 30:c 25:f 10:a 5:e
removed=2
freed=5
```

### 02 sample 示例 2
```in
0
3
0 1 a
0 2 b
0 3 c
0
```
```out
forward 3 3:c 2:b 1:a
backward 3 1:a 2:b 3:c
removed=0
freed=3
```

### 03 degenerate 只有一个节点，随后被删掉
```in
1
7 solo
0
1
7
```
```out
forward 0
backward 0
removed=1
freed=0
```

### 04 trap 删除头节点和尾节点
```in
4
10 a
20 b
30 c
40 d
0
2
10
40
```
```out
forward 2 20:b 30:c
backward 2 30:c 20:b
removed=2
freed=2
```

### 05 trap 连续两次插到当前尾节点之后
```in
2
1 a
2 b
2
2 3 c
3 4 d
0
```
```out
forward 4 1:a 2:b 3:c 4:d
backward 4 4:d 3:c 2:b 1:a
removed=0
freed=4
```

### 06 normal 中间插入、头插、尾插，再删中间、删头、删尾
```in
5
1 a
2 b
3 c
4 d
5 e
4
2 20 x
0 9 z
4 40 y
5 50 w
3
20
9
50
```
```out
forward 6 1:a 2:b 3:c 4:d 40:y 5:e
backward 6 5:e 40:y 4:d 3:c 2:b 1:a
removed=3
freed=6
```

### 生成 boundary 三百首的播放列表
```js gen
const cases = [];

function simulate(songs, inserts, dels) {
  const list = songs.map((x) => x.slice());
  for (const [after, id, name] of inserts) {
    if (after === 0) {
      list.unshift([id, name]);
    } else {
      const k = list.findIndex((x) => x[0] === after);
      if (k >= 0) list.splice(k + 1, 0, [id, name]);
    }
  }
  let removed = 0;
  for (const id of dels) {
    const k = list.findIndex((x) => x[0] === id);
    if (k >= 0) {
      list.splice(k, 1);
      removed++;
    }
  }
  const pairs = (a) => a.map((x) => `${x[0]}:${x[1]}`).join(' ');
  const reversed = list.slice().reverse();
  const lines = [
    `forward ${list.length}${list.length ? ' ' + pairs(list) : ''}`,
    `backward ${reversed.length}${reversed.length ? ' ' + pairs(reversed) : ''}`,
    `removed=${removed}`,
    `freed=${list.length}`,
  ];
  return lines.join('\n') + '\n';
}

function make(songs, inserts, dels) {
  const lines = [String(songs.length)];
  for (const [id, name] of songs) lines.push(`${id} ${name}`);
  lines.push(String(inserts.length));
  for (const [after, id, name] of inserts) lines.push(`${after} ${id} ${name}`);
  lines.push(String(dels.length));
  for (const id of dels) lines.push(String(id));
  return lines.join('\n') + '\n';
}

/* 300 首歌 + 100 次插入 + 100 次删除 */
{
  const songs = [];
  for (let i = 1; i <= 300; i++) songs.push([i, `s${i}`]);
  const inserts = [];
  for (let i = 0; i < 100; i++) {
    const after = i % 10 === 0 ? 0 : rng.int(1, 300);
    inserts.push([after, 1000 + i, `t${i}`]);
  }
  const exist = [];
  for (let i = 1; i <= 300; i++) exist.push(i);
  for (let i = 0; i < 100; i++) exist.push(1000 + i);
  for (let i = exist.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const t = exist[i];
    exist[i] = exist[j];
    exist[j] = t;
  }
  const dels = exist.slice(0, 100);
  cases.push({
    kind: 'boundary',
    category: '300 首歌 + 100 次插入 + 100 次删除',
    input: make(songs, inserts, dels),
    output: simulate(songs, inserts, dels),
  });
}

return cases;
```

### 生成 normal 短歌单上的反复插入与删除
```js gen
const cases = [];

function simulate(songs, inserts, dels) {
  const list = songs.map((x) => x.slice());
  for (const [after, id, name] of inserts) {
    if (after === 0) {
      list.unshift([id, name]);
    } else {
      const k = list.findIndex((x) => x[0] === after);
      if (k >= 0) list.splice(k + 1, 0, [id, name]);
    }
  }
  let removed = 0;
  for (const id of dels) {
    const k = list.findIndex((x) => x[0] === id);
    if (k >= 0) {
      list.splice(k, 1);
      removed++;
    }
  }
  const pairs = (a) => a.map((x) => `${x[0]}:${x[1]}`).join(' ');
  const reversed = list.slice().reverse();
  const lines = [
    `forward ${list.length}${list.length ? ' ' + pairs(list) : ''}`,
    `backward ${reversed.length}${reversed.length ? ' ' + pairs(reversed) : ''}`,
    `removed=${removed}`,
    `freed=${list.length}`,
  ];
  return lines.join('\n') + '\n';
}

function make(songs, inserts, dels) {
  const lines = [String(songs.length)];
  for (const [id, name] of songs) lines.push(`${id} ${name}`);
  lines.push(String(inserts.length));
  for (const [after, id, name] of inserts) lines.push(`${after} ${id} ${name}`);
  lines.push(String(dels.length));
  for (const id of dels) lines.push(String(id));
  return lines.join('\n') + '\n';
}

/* 6 首歌，12 次插入，12 次删除，每一步后都可能出现"删空"再插回来的情况 */
{
  const songs = [[1, 'a'], [2, 'b'], [3, 'c'], [4, 'd'], [5, 'e'], [6, 'f']];
  const inserts = [];
  const dels = [];
  for (let i = 0; i < 12; i++) {
    inserts.push([i % 3 === 0 ? 0 : rng.int(1, 6), 900 + i, `i${i}`]);
  }
  const ids = [1, 2, 3, 4, 5, 6];
  for (let i = 900; i < 912; i++) ids.push(i);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const t = ids[i];
    ids[i] = ids[j];
    ids[j] = t;
  }
  for (let i = 0; i < 12; i++) dels.push(ids[i]);
  cases.push({
    kind: 'normal',
    category: '6 首歌、12 次插入与 12 次删除',
    input: make(songs, inserts, dels),
    output: simulate(songs, inserts, dels),
  });
}

return cases;
```
