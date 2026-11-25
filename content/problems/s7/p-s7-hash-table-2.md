---json
{
  "id": "p-s7-hash-table-2",
  "title": "链地址法哈希表接口：put / get / remove / destroy 一个节点都不能漏",
  "difficulty": "L4",
  "knowledgePoints": ["s7-hash-table"],
  "special": "ds-implementation",
  "judge": { "mode": "function", "timeMs": 1000, "compare": "lines", "checkLeaks": true }
}
---

## 题目描述
本题把哈希表封装成一组接口，请你在 `solution.c` 里实现它们。头文件 `hashmap.h` 由测试驱动提供，里面已经定义好节点与表：

```c
#define HASHMAP_BUCKETS 61

typedef struct HashNode {
    char *key;                  /* 堆上的字符串副本 */
    int value;
    struct HashNode *next;
} HashNode;

typedef struct {
    HashNode *buckets[HASHMAP_BUCKETS];
    int size;
} HashMap;
```

需要实现的六个函数：

```c
unsigned hash_djb2(const char *key);                 /* djb2：h = 5381；h = h * 33 + 每个字节，32 位回绕 */
void map_init(HashMap *m);                           /* 所有桶置 NULL，size = 0 */
int  map_put(HashMap *m, const char *key, int value);/* 新键 1；已存在键更新 0；内存不足 -1 */
int  map_get(const HashMap *m, const char *key, int *out); /* 找到写 *out 并返回 1，否则 0 */
int  map_remove(HashMap *m, const char *key);        /* 删除并释放：1 成功，0 不存在 */
int  map_size(const HashMap *m);
void map_destroy(HashMap *m);                        /* 释放全部键与节点，并把结构体清零 */
```

四条硬性要求：

1. **键必须复制**：`map_put` 的 `key` 指向调用者的缓冲区，测试驱动在每次 put 之后会立刻改写那块缓冲区。表必须持有一份自己的 `strlen(key) + 1` 字节副本（可以和节点放在同一块分配里，也可以单独 `malloc`），不能保存调用者的指针；
2. **更新不能新增节点**：键已存在时只改 `value`，`size` 不变，并返回 0；
3. **表拥有的内存必须归还**：本参考把键副本放在节点后面、用一次 `malloc` 分配，所以 `free(node)` 就归还了两者；如果你的实现把键单独 `malloc`，那么 `remove` 与 `destroy` 里两个 `free` 缺一不可；
4. **本题开启内存泄漏检查**：输出全对但结束时还有未归还的堆内存，会判 `LEAK`。

你只需要提交 `solution.c`，不要写 `main`，也不要提交 `hashmap.h`。

## 输入格式
（由隐藏的测试驱动读取，供你理解测试方式）

第一行一个整数 `n`。
接下来 `n` 行，每行一个单词和一个整数 `value`，表示一次 `map_put`。
接下来一行一个整数 `q`。
再接下来 `q` 行，每行一个查询单词。

## 输出格式
（由隐藏的测试驱动输出）共 18 + q 行：

```
init_size=<map_init 之后 map_size 的结果>
new=<map_put 返回 1 的次数>
updates=<map_put 返回 0 的次数>
size=<完成 n 次 put 之后的 map_size>
hash_empty=<hash_djb2("")>
hash_a=<hash_djb2("a")>
hash_hello=<hash_djb2("hello")>
hash_hash=<hash_djb2("hash")>
get <查询词> <值或 none>
...（共 q 行）
removed=<按下标 0、2、4… 的顺序删除所有仍存在的键，成功的次数>
size_after_remove=<删除之后的 map_size>
remove_again=<再删除第一个键的返回值>
get_after_remove=<再查询第一个键的返回值>
destroy_clean=<map_destroy 之后 size==0 且所有桶为 NULL 时为 1>
empty_destroy=<对空表 init 后直接 destroy，检查是否清零>
reuse=<destroy 之后重新 init、put("reuse", 5)、get 得到的值>
reuse_size=<此时 map_size>
```

哈希值用 `printf("%u")` 输出，按 32 位无符号回绕。

## 数据范围
1 ≤ n ≤ 5000
1 ≤ q ≤ 100
单词只含小写字母，长度 1–24
-10⁹ ≤ value ≤ 10⁹

桶数固定为 61，平均链长约 `n / 61`。表里的键最多 5000 个，所有节点和键副本都在堆上，总内存远低于平台上限。

## 示例
### 示例 1
```in
3
apple 3
banana 5
apple 4
3
apple
banana
missing
```
```out
init_size=0
new=2
updates=1
size=2
hash_empty=5381
hash_a=177670
hash_hello=261238937
hash_hash=2090320585
get apple 4
get banana 5
get missing none
removed=1
size_after_remove=1
remove_again=0
get_after_remove=0
destroy_clean=1
empty_destroy=1
reuse=5
reuse_size=1
```
> 第一次 `apple 3` 新建节点，`banana 5` 新建节点，第二次 `apple 4` 是更新（返回 0）。删除时只处理下标 0、2……：`apple` 被删，最后一个 `apple` 已经不存在，所以 `removed=1`，剩下 `banana` 留给 `destroy` 释放。

### 示例 2（边界：只有一个键）
```in
1
zz 0
2
zz
a
```
```out
init_size=0
new=1
updates=0
size=1
hash_empty=5381
hash_a=177670
hash_hello=261238937
hash_hash=2090320585
get zz 0
get a none
removed=1
size_after_remove=0
remove_again=0
get_after_remove=0
destroy_clean=1
empty_destroy=1
reuse=5
reuse_size=1
```
> 只有一个键、值为 0：`map_get` 必须区分"找到但值为 0"和"没找到"——返回 1 并写入 0，而不是用 `*out != 0` 判断。删除后表为空，`destroy` 面对空表也必须安全，并把桶指针全部置 NULL。

## 提示
### 第 1 层
先写 `hash_djb2`：`unsigned h = 5381u;` 然后对每个 `unsigned char` 做 `h = h * 33u + c`。桶下标是 `h % HASHMAP_BUCKETS`。`map_put` 先用 `map_get` 或一个内部 `find` 查找是否已存在，再决定"更新"还是"新建"。

### 第 2 层
新建节点有两种写法：本参考用**一次** `malloc(sizeof *node + len + 1)` 把节点和键副本放在同一块内存里，`node->key = (char *)(node + 1)`；也可以分两次 `malloc`，但那样失败路径要负责把已分配的那份还回去。无论哪种，键内容都要用 `memcpy` 复制，并把新节点头插到对应桶。`map_remove` 用二级指针 `HashNode **link = &m->buckets[h]` 遍历，找到后释放节点（单独分配时还要先 `free(node->key)`）。

### 第 3 层
`map_destroy` 要遍历 61 个桶，每条链都用"先保存 `next`、再释放当前节点"的方式清空，最后把 `buckets[i]` 置 NULL、`size = 0`。写完后自查：**每个 `malloc` 是否都有对应的 `free`？键是单独分配时有没有漏掉 `free(key)`？更新已有键时有没有多分配一份键却没释放？** 本题会检查泄漏。

## 参考代码
```c file=solution.c
#include <stdlib.h>
#include <string.h>
#include "hashmap.h"

unsigned hash_djb2(const char *key) {
    unsigned h = 5381u;
    for (const unsigned char *p = (const unsigned char *)key; *p != '\0'; p++) {
        h = h * 33u + *p;
    }
    return h;
}

void map_init(HashMap *m) {
    for (int i = 0; i < HASHMAP_BUCKETS; i++) {
        m->buckets[i] = NULL;
    }
    m->size = 0;
}

static HashNode *find_node(const HashMap *m, const char *key) {
    unsigned h = hash_djb2(key) % HASHMAP_BUCKETS;
    for (HashNode *node = m->buckets[h]; node != NULL; node = node->next) {
        if (strcmp(node->key, key) == 0) {
            return node;
        }
    }
    return NULL;
}

int map_put(HashMap *m, const char *key, int value) {
    HashNode *found = find_node(m, key);
    if (found != NULL) {
        found->value = value;
        return 0;                  /* 已存在：只更新，不新建 */
    }

    size_t len = strlen(key);
    /* 节点与键副本放在同一块堆内存里：一次 malloc，一次 free 就全部归还 */
    HashNode *node = malloc(sizeof *node + len + 1);
    if (node == NULL) {
        return -1;
    }
    node->key = (char *)(node + 1);
    memcpy(node->key, key, len + 1);
    node->value = value;
    unsigned h = hash_djb2(key) % HASHMAP_BUCKETS;
    node->next = m->buckets[h];    /* 头插 */
    m->buckets[h] = node;
    m->size++;
    return 1;
}

int map_get(const HashMap *m, const char *key, int *out) {
    HashNode *node = find_node(m, key);
    if (node == NULL) {
        return 0;
    }
    if (out != NULL) {
        *out = node->value;
    }
    return 1;
}

int map_remove(HashMap *m, const char *key) {
    unsigned h = hash_djb2(key) % HASHMAP_BUCKETS;
    HashNode **link = &m->buckets[h];
    while (*link != NULL) {
        if (strcmp((*link)->key, key) == 0) {
            HashNode *victim = *link;
            *link = victim->next;
            free(victim);          /* 键副本在节点同一块内存里，一起释放 */
            m->size--;
            return 1;
        }
        link = &(*link)->next;
    }
    return 0;
}

int map_size(const HashMap *m) {
    return m->size;
}

void map_destroy(HashMap *m) {
    for (int i = 0; i < HASHMAP_BUCKETS; i++) {
        HashNode *cur = m->buckets[i];
        while (cur != NULL) {
            HashNode *next = cur->next;
            free(cur);             /* 键副本与节点在同一块内存里 */
            cur = next;
        }
        m->buckets[i] = NULL;
    }
    m->size = 0;
}
```

## 初始代码
```c file=solution.c
#include <stdlib.h>
#include <string.h>
#include "hashmap.h"

unsigned hash_djb2(const char *key) {
    (void)key;
    /* TODO: h = 5381；对每个 unsigned char 做 h = h * 33 + c */
    return 0;
}

void map_init(HashMap *m) {
    for (int i = 0; i < HASHMAP_BUCKETS; i++) {
        m->buckets[i] = NULL;
    }
    m->size = 0;
}

int map_put(HashMap *m, const char *key, int value) {
    (void)m;
    (void)key;
    (void)value;
    /* TODO: 已存在的键更新 value 并返回 0；否则 malloc 节点 + 复制键，头插并返回 1 */
    return 0;
}

int map_get(const HashMap *m, const char *key, int *out) {
    (void)m;
    (void)key;
    (void)out;
    /* TODO: 找到写 *out 并返回 1，否则返回 0 */
    return 0;
}

int map_remove(HashMap *m, const char *key) {
    (void)m;
    (void)key;
    /* TODO: 从链上摘下节点，free 键和节点，size 减一 */
    return 0;
}

int map_size(const HashMap *m) {
    return m->size;
}

void map_destroy(HashMap *m) {
    (void)m;
    /* TODO: 释放所有键和节点，桶置 NULL，size 清零 */
}
```

## 测试驱动
```c file=hashmap.h
#ifndef HASHMAP_H
#define HASHMAP_H

#include <stddef.h>

#define HASHMAP_BUCKETS 61

typedef struct HashNode {
    char *key;                  /* 堆上的字符串副本，由表拥有 */
    int value;
    struct HashNode *next;
} HashNode;

typedef struct {
    HashNode *buckets[HASHMAP_BUCKETS];
    int size;
} HashMap;

/* djb2：h = 5381；对每个字节 c：h = h * 33 + c；按 32 位无符号回绕。 */
unsigned hash_djb2(const char *key);

/* 初始化为空表：所有桶为 NULL，size = 0。 */
void map_init(HashMap *m);

/* 插入或更新：新键返回 1；已存在的键更新 value 并返回 0；内存不足返回 -1。 */
int map_put(HashMap *m, const char *key, int value);

/* 查找：找到时把值写入 *out 并返回 1，否则返回 0。 */
int map_get(const HashMap *m, const char *key, int *out);

/* 删除：成功释放键与节点并返回 1，不存在返回 0。 */
int map_remove(HashMap *m, const char *key);

/* 不同键的个数。 */
int map_size(const HashMap *m);

/* 释放所有键与节点，并把 buckets / size 清零。对空表调用也必须安全。 */
void map_destroy(HashMap *m);

#endif
```

```c file=harness.c hidden
#include <stdio.h>
#include <string.h>
#include "hashmap.h"

#define MAXN 5000
#define MAXQ 100
#define MAXKEY 24

static char keys[MAXN][MAXKEY + 1];
static int values[MAXN];
static char queries[MAXQ][MAXKEY + 1];

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%24s %d", keys[i], &values[i]) != 2) {
            return 0;
        }
    }

    int q = 0;
    if (scanf("%d", &q) != 1 || q < 1 || q > MAXQ) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        if (scanf("%24s", queries[i]) != 1) {
            return 0;
        }
    }

    HashMap m;
    map_init(&m);
    printf("init_size=%d\n", map_size(&m));

    int created = 0;
    int updated = 0;
    for (int i = 0; i < n; i++) {
        char tmp[MAXKEY + 1];
        size_t len = strlen(keys[i]);
        memcpy(tmp, keys[i], len + 1);
        int r = map_put(&m, tmp, values[i]);
        tmp[0] = '#';              /* 立刻破坏调用者的缓冲区，逼实现自己复制键 */
        tmp[1] = '\0';
        if (r == 1) {
            created++;
        } else if (r == 0) {
            updated++;
        }
    }
    printf("new=%d\n", created);
    printf("updates=%d\n", updated);
    printf("size=%d\n", map_size(&m));

    printf("hash_empty=%u\n", hash_djb2(""));
    printf("hash_a=%u\n", hash_djb2("a"));
    printf("hash_hello=%u\n", hash_djb2("hello"));
    printf("hash_hash=%u\n", hash_djb2("hash"));

    for (int i = 0; i < q; i++) {
        int v = 0;
        if (map_get(&m, queries[i], &v)) {
            printf("get %s %d\n", queries[i], v);
        } else {
            printf("get %s none\n", queries[i]);
        }
    }

    int removed = 0;
    for (int i = 0; i < n; i += 2) {
        int v = 0;
        if (map_get(&m, keys[i], &v) && map_remove(&m, keys[i])) {
            removed++;
        }
    }
    printf("removed=%d\n", removed);
    printf("size_after_remove=%d\n", map_size(&m));
    printf("remove_again=%d\n", map_remove(&m, keys[0]));
    int v = 0;
    printf("get_after_remove=%d\n", map_get(&m, keys[0], &v));

    map_destroy(&m);
    int clean = map_size(&m) == 0;
    for (int i = 0; i < HASHMAP_BUCKETS; i++) {
        if (m.buckets[i] != NULL) {
            clean = 0;
        }
    }
    printf("destroy_clean=%d\n", clean);

    HashMap empty;
    map_init(&empty);
    map_destroy(&empty);
    int empty_clean = map_size(&empty) == 0;
    for (int i = 0; i < HASHMAP_BUCKETS; i++) {
        if (empty.buckets[i] != NULL) {
            empty_clean = 0;
        }
    }
    printf("empty_destroy=%d\n", empty_clean);

    HashMap again;
    map_init(&again);
    int reuse = 0;
    map_put(&again, "reuse", 5);
    if (!map_get(&again, "reuse", &reuse)) {
        reuse = -1;
    }
    printf("reuse=%d\n", reuse);
    printf("reuse_size=%d\n", map_size(&again));
    map_destroy(&again);
    return 0;
}
```

## 复杂度
`hash_djb2` 是 O(键长)；`map_put`、`map_get`、`map_remove` 平均 O(1 + 链长)，61 个桶、最多 5000 个键时平均链长约 82，最坏 O(n)；`map_destroy` 是 O(distinct)。
空间 O(distinct)：每个键一份字符串副本加一个节点（本参考把两者放在同一块分配里）。整个生命周期内所有分配都必须在 destroy/remove 时释放。

## 常见错误
### `map_destroy` 只 `free` 节点，没有 `free(node->key)` [LEAK]
如果键副本是单独 `malloc` 的，节点里就有两个堆对象：节点本身和键字符串。只释放节点会漏掉每个键；`remove` 留下的那些键在 `destroy` 时也会漏。本题开启了泄漏检查，即使输出全对也会判 `LEAK`，并指出键是在 `solution.c` 的 `map_put` 里分配的。（本参考把键和节点放在同一块分配里，所以只 `free` 一次；两种写法都要保证"分配与释放一一对应"。）

```c file=solution.c expect=LEAK
#include <stdlib.h>
#include <string.h>
#include "hashmap.h"

unsigned hash_djb2(const char *key) {
    unsigned h = 5381u;
    for (const unsigned char *p = (const unsigned char *)key; *p != '\0'; p++) {
        h = h * 33u + *p;
    }
    return h;
}

void map_init(HashMap *m) {
    for (int i = 0; i < HASHMAP_BUCKETS; i++) {
        m->buckets[i] = NULL;
    }
    m->size = 0;
}

static HashNode *find_node(const HashMap *m, const char *key) {
    unsigned h = hash_djb2(key) % HASHMAP_BUCKETS;
    for (HashNode *node = m->buckets[h]; node != NULL; node = node->next) {
        if (strcmp(node->key, key) == 0) {
            return node;
        }
    }
    return NULL;
}

int map_put(HashMap *m, const char *key, int value) {
    HashNode *found = find_node(m, key);
    if (found != NULL) {
        found->value = value;
        return 0;
    }
    HashNode *node = malloc(sizeof *node);
    if (node == NULL) {
        return -1;
    }
    size_t len = strlen(key);
    char *copy = malloc(len + 1);
    if (copy == NULL) {
        free(node);
        return -1;
    }
    memcpy(copy, key, len + 1);
    node->key = copy;
    node->value = value;
    unsigned h = hash_djb2(key) % HASHMAP_BUCKETS;
    node->next = m->buckets[h];
    m->buckets[h] = node;
    m->size++;
    return 1;
}

int map_get(const HashMap *m, const char *key, int *out) {
    HashNode *node = find_node(m, key);
    if (node == NULL) {
        return 0;
    }
    if (out != NULL) {
        *out = node->value;
    }
    return 1;
}

int map_remove(HashMap *m, const char *key) {
    unsigned h = hash_djb2(key) % HASHMAP_BUCKETS;
    HashNode **link = &m->buckets[h];
    while (*link != NULL) {
        if (strcmp((*link)->key, key) == 0) {
            HashNode *victim = *link;
            *link = victim->next;
            free(victim->key);
            free(victim);
            m->size--;
            return 1;
        }
        link = &(*link)->next;
    }
    return 0;
}

int map_size(const HashMap *m) {
    return m->size;
}

void map_destroy(HashMap *m) {
    for (int i = 0; i < HASHMAP_BUCKETS; i++) {
        HashNode *cur = m->buckets[i];
        while (cur != NULL) {
            HashNode *next = cur->next;
            free(cur);                  /* 错：键副本没有释放 */
            cur = next;
        }
        m->buckets[i] = NULL;
    }
    m->size = 0;
}
```

### 用 `==` 比较键字符串 [WA]
`node->key == key` 比较的是两个指针的地址：表里的键是 `malloc` 出来的副本，和调用者传进来的地址永远不同。于是每个键都被当成新键，`new` 变成 `n`、`size` 变成 `n`，所有 `map_get` 都返回 none。必须用 `strcmp(node->key, key) == 0`。

```c file=solution.c expect=WA
#include <stdlib.h>
#include <string.h>
#include "hashmap.h"

unsigned hash_djb2(const char *key) {
    unsigned h = 5381u;
    for (const unsigned char *p = (const unsigned char *)key; *p != '\0'; p++) {
        h = h * 33u + *p;
    }
    return h;
}

void map_init(HashMap *m) {
    for (int i = 0; i < HASHMAP_BUCKETS; i++) {
        m->buckets[i] = NULL;
    }
    m->size = 0;
}

static HashNode *find_node(const HashMap *m, const char *key) {
    unsigned h = hash_djb2(key) % HASHMAP_BUCKETS;
    for (HashNode *node = m->buckets[h]; node != NULL; node = node->next) {
        if (node->key == key) {            /* 错：比较的是地址 */
            return node;
        }
    }
    return NULL;
}

int map_put(HashMap *m, const char *key, int value) {
    HashNode *found = find_node(m, key);
    if (found != NULL) {
        found->value = value;
        return 0;
    }
    HashNode *node = malloc(sizeof *node);
    if (node == NULL) {
        return -1;
    }
    size_t len = strlen(key);
    char *copy = malloc(len + 1);
    if (copy == NULL) {
        free(node);
        return -1;
    }
    memcpy(copy, key, len + 1);
    node->key = copy;
    node->value = value;
    unsigned h = hash_djb2(key) % HASHMAP_BUCKETS;
    node->next = m->buckets[h];
    m->buckets[h] = node;
    m->size++;
    return 1;
}

int map_get(const HashMap *m, const char *key, int *out) {
    HashNode *node = find_node(m, key);
    if (node == NULL) {
        return 0;
    }
    if (out != NULL) {
        *out = node->value;
    }
    return 1;
}

int map_remove(HashMap *m, const char *key) {
    unsigned h = hash_djb2(key) % HASHMAP_BUCKETS;
    HashNode **link = &m->buckets[h];
    while (*link != NULL) {
        if ((*link)->key == key) {
            HashNode *victim = *link;
            *link = victim->next;
            free(victim->key);
            free(victim);
            m->size--;
            return 1;
        }
        link = &(*link)->next;
    }
    return 0;
}

int map_size(const HashMap *m) {
    return m->size;
}

void map_destroy(HashMap *m) {
    for (int i = 0; i < HASHMAP_BUCKETS; i++) {
        HashNode *cur = m->buckets[i];
        while (cur != NULL) {
            HashNode *next = cur->next;
            free(cur->key);
            free(cur);
            cur = next;
        }
        m->buckets[i] = NULL;
    }
    m->size = 0;
}
```

### 更新已有键时又复制了一份新键，却没有释放旧键 [LEAK]
如果 `map_put` 不先查找、而是每次 `malloc` 节点和键副本，再把新节点插到链头，那么"同一个键更新"会留下旧节点和旧键：`size` 会虚增，内存也会泄漏。更新路径必须找到旧节点直接改 `value`，不能分配任何东西。

### `map_remove` 只改链、不释放节点 [LEAK]
`*link = victim->next;` 之后如果忘了 `free(victim->key)` 和 `free(victim)`，被摘下来的节点就永远丢失了。本题的 `removed` 统计的是"成功删除的次数"，输出可能全对，但泄漏检查会判 `LEAK`。

## 测试用例
### 01 sample 示例 1
```in
3
apple 3
banana 5
apple 4
3
apple
banana
missing
```
```out
init_size=0
new=2
updates=1
size=2
hash_empty=5381
hash_a=177670
hash_hello=261238937
hash_hash=2090320585
get apple 4
get banana 5
get missing none
removed=1
size_after_remove=1
remove_again=0
get_after_remove=0
destroy_clean=1
empty_destroy=1
reuse=5
reuse_size=1
```

### 02 sample 示例 2
```in
1
zz 0
2
zz
a
```
```out
init_size=0
new=1
updates=0
size=1
hash_empty=5381
hash_a=177670
hash_hello=261238937
hash_hash=2090320585
get zz 0
get a none
removed=1
size_after_remove=0
remove_again=0
get_after_remove=0
destroy_clean=1
empty_destroy=1
reuse=5
reuse_size=1
```

### 03 degenerate 同一个键连续更新三次
```in
3
k 1
k 2
k 3
2
k
z
```
```out
init_size=0
new=1
updates=2
size=1
hash_empty=5381
hash_a=177670
hash_hello=261238937
hash_hash=2090320585
get k 3
get z none
removed=1
size_after_remove=0
remove_again=0
get_after_remove=0
destroy_clean=1
empty_destroy=1
reuse=5
reuse_size=1
```

### 04 trap 重复键与新键交错，删除按下标 0、2、4
```in
4
a 10
a 20
b 30
a 40
2
a
b
```
```out
init_size=0
new=2
updates=2
size=2
hash_empty=5381
hash_a=177670
hash_hello=261238937
hash_hash=2090320585
get a 40
get b 30
removed=2
size_after_remove=0
remove_again=0
get_after_remove=0
destroy_clean=1
empty_destroy=1
reuse=5
reuse_size=1
```

### 05 normal 四个不同键，其中两组落在同一个桶
```in
4
apple 1
hash 2
banana 3
berry 4
3
apple
hash
banana
```
```out
init_size=0
new=4
updates=0
size=4
hash_empty=5381
hash_a=177670
hash_hello=261238937
hash_hash=2090320585
get apple 1
get hash 2
get banana 3
removed=2
size_after_remove=2
remove_again=0
get_after_remove=0
destroy_clean=1
empty_destroy=1
reuse=5
reuse_size=1
```

### 06 trap 长键与重复查询
```in
5
abcdefghijklmnopqrstuvwx 7
abcdefghijklmnopqrstuvwx 8
short 9
abcdefghijklmnopqrstuvwx 10
short 11
3
abcdefghijklmnopqrstuvwx
short
absent
```
```out
init_size=0
new=2
updates=3
size=2
hash_empty=5381
hash_a=177670
hash_hello=261238937
hash_hash=2090320585
get abcdefghijklmnopqrstuvwx 10
get short 11
get absent none
removed=2
size_after_remove=0
remove_again=0
get_after_remove=0
destroy_clean=1
empty_destroy=1
reuse=5
reuse_size=1
```

### 生成 boundary 5000 个不同键
```js gen
const cases = [];

function wordOf(i) {
  let s = '';
  let x = i;
  for (let k = 0; k < 4; k++) {
    s = String.fromCharCode(97 + (x % 26)) + s;
    x = Math.floor(x / 26);
  }
  return s;
}

function render(keys, values, queries) {
  const map = new Map();
  let created = 0;
  let updated = 0;
  for (let i = 0; i < keys.length; i++) {
    if (map.has(keys[i])) {
      updated++;
    } else {
      created++;
    }
    map.set(keys[i], values[i]);
  }
  const lines = [
    'init_size=0',
    `new=${created}`,
    `updates=${updated}`,
    `size=${map.size}`,
    'hash_empty=5381',
    'hash_a=177670',
    'hash_hello=261238937',
    'hash_hash=2090320585',
  ];
  for (const q of queries) lines.push(map.has(q) ? `get ${q} ${map.get(q)}` : `get ${q} none`);
  let removed = 0;
  for (let i = 0; i < keys.length; i += 2) {
    if (map.has(keys[i])) {
      map.delete(keys[i]);
      removed++;
    }
  }
  lines.push(`removed=${removed}`, `size_after_remove=${map.size}`, 'remove_again=0', 'get_after_remove=0');
  lines.push('destroy_clean=1', 'empty_destroy=1', 'reuse=5', 'reuse_size=1');
  return lines.join('\n') + '\n';
}

{
  const n = 5000;
  const keys = [];
  const values = [];
  for (let i = 0; i < n; i++) {
    keys.push(wordOf(i));
    values.push(i * 1000 - 2500000);
  }
  const queries = ['aaaa', wordOf(n - 1), 'zzzz', 'abcd', 'q'];
  cases.push({
    kind: 'boundary',
    category: '5000 个不同键、删除一半、长键短键混合',
    input: `${n}\n${keys.map((k, i) => `${k} ${values[i]}`).join('\n')}\n${queries.length}\n${queries.join('\n')}\n`,
    output: render(keys, values, queries),
  });
}

return cases;
```
