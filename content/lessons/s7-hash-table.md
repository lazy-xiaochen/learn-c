---
id: s7-hash-table
---

## 讲解

### 哈希表解决的是"按键直接定位"的问题
数组按下标访问是 O(1)，但前提是键必须是小范围的整数。现实里的键往往是字符串：用户名、单词、文件名。哈希表的做法是先用一个**哈希函数**把任意键压成一个整数，再对桶数取模，得到一个桶下标：

```
bucket = hash(key) % nbuckets
```

于是查找不再需要"从头比一遍"，而是"算出同一个下标，直接去那个桶里找"。平均情况下这是 O(1)，比链表的 O(n) 快一个量级。

一个简单、分布又不错的字符串哈希是 **djb2**：

```c
unsigned h = 5381u;
for (const unsigned char *p = (const unsigned char *)key; *p != '\0'; p++) {
    h = h * 33u + *p;        /* h * 33 = (h << 5) + h */
}
```

三个细节决定了它能不能用：

1. **用 `unsigned`**：无符号溢出在 C 里是定义良好的回绕（模 2³²），而有符号溢出是未定义行为；
2. **按 `unsigned char` 读字节**：如果 `char` 是有符号的，非 ASCII 字节会变成负数，哈希值的符号就不可控；
3. **乘 33**：编译器会把 `h * 33` 优化成移位加法，而且 33 与 2 的幂互质，散列效果比乘 31、37 之外的小常数更稳。

```c run id=ht-djb2
#include <stdio.h>

#define BUCKETS 61

static unsigned djb2(const char *key) {
    unsigned h = 5381u;
    for (const unsigned char *p = (const unsigned char *)key; *p != '\0'; p++) {
        h = h * 33u + *p;
    }
    return h;
}

int main(void) {
    const char *words[] = { "apple", "banana", "cherry", "date", "hash" };
    for (int i = 0; i < 5; i++) {
        unsigned h = djb2(words[i]);
        printf("%-8s hash=%u bucket61=%u\n", words[i], h, h % BUCKETS);
    }
    return 0;
}
```
```output
apple    hash=253337143 bucket61=56
banana   hash=4086421542 bucket61=5
cherry   hash=4133553618 bucket61=4
date     hash=2090176867 bucket61=33
hash     hash=2090320585 bucket61=35
```

桶数为什么常取质数（比如 61、97、101）？如果桶数是 2 的幂，`hash % nbuckets` 只取哈希值的低几位，键的规律性会直接变成桶的规律性；取质数能让低位和高位都参与决定，分布更均匀。

### 冲突不可避免，所以每个桶挂一条链
哈希函数把无限多种键映射到有限个桶，**冲突（collision）在数学上必然发生**（鸽巢原理）。链地址法（separate chaining）的处理方式是：每个桶不是存一个元素，而是存一条链表的头指针；冲突的键依次挂在同一条链上。

- 插入：算出桶下标，头插到那条链，O(1)（不检查重复的话）；
- 查找：算出桶下标，沿链比较键，O(1 + 链长)；
- 删除：先找到节点，再把它从链上摘下来并释放，O(1 + 链长)。

下面是一个完整的 7 桶小表，故意让 `hash` 和 `apple`、`avocado` 和 `cherry` 撞进同一个桶：

```c run id=ht-basic
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define BUCKETS 7

typedef struct Entry {
    const char *key;          /* 演示用字面量；键来自输入时必须自己复制一份 */
    int value;
    struct Entry *next;
} Entry;

static Entry *table[BUCKETS];
static int entry_count;

static unsigned hash_key(const char *key) {
    unsigned h = 5381u;
    for (const unsigned char *p = (const unsigned char *)key; *p != '\0'; p++) {
        h = h * 33u + *p;
    }
    return h;
}

static int bucket_of(const char *key) {
    return (int)(hash_key(key) % BUCKETS);
}

static Entry *find_entry(const char *key) {
    for (Entry *e = table[bucket_of(key)]; e != NULL; e = e->next) {
        if (strcmp(e->key, key) == 0) {     /* 字符串必须用 strcmp，不能用 == */
            return e;
        }
    }
    return NULL;
}

static int put(const char *key, int value) {
    Entry *e = find_entry(key);
    if (e != NULL) {
        e->value = value;                   /* 已存在的键：更新，不新建节点 */
        return 0;
    }
    Entry *node = malloc(sizeof *node);
    if (node == NULL) {
        return -1;
    }
    node->key = key;
    node->value = value;
    int b = bucket_of(key);
    node->next = table[b];                  /* 头插 */
    table[b] = node;
    entry_count++;
    return 1;
}

static int get(const char *key, int *out) {
    Entry *e = find_entry(key);
    if (e == NULL) {
        return 0;
    }
    *out = e->value;
    return 1;
}

static int remove_key(const char *key) {
    Entry **link = &table[bucket_of(key)];   /* 二级指针：可以修改“前一个节点的 next” */
    while (*link != NULL) {
        if (strcmp((*link)->key, key) == 0) {
            Entry *victim = *link;
            *link = victim->next;
            free(victim);                    /* 键是字面量，不需要 free */
            entry_count--;
            return 1;
        }
        link = &(*link)->next;
    }
    return 0;
}

int main(void) {
    const char *keys[] = { "apple", "banana", "cherry", "date", "avocado", "hash" };
    int values[] = { 3, 5, 7, 2, 2, 9 };
    for (int i = 0; i < 6; i++) {
        put(keys[i], values[i]);
    }
    printf("inserted=%d\n", entry_count);

    for (int b = 0; b < BUCKETS; b++) {
        if (table[b] == NULL) {
            continue;
        }
        printf("bucket %d:", b);
        for (Entry *e = table[b]; e != NULL; e = e->next) {
            printf(" %s(%d)", e->key, e->value);
        }
        printf("\n");
    }

    int v = 0;
    if (get("banana", &v)) {
        printf("get banana=%d\n", v);
    }
    printf("get mango=%d\n", get("mango", &v));
    printf("remove cherry=%d\n", remove_key("cherry"));
    printf("get cherry=%d\n", get("cherry", &v));
    printf("size=%d\n", entry_count);

    int max_chain = 0;
    for (int b = 0; b < BUCKETS; b++) {
        int len = 0;
        for (Entry *e = table[b]; e != NULL; e = e->next) {
            len++;
        }
        if (len > max_chain) {
            max_chain = len;
        }
    }
    printf("max_chain=%d\n", max_chain);

    for (int b = 0; b < BUCKETS; b++) {
        while (table[b] != NULL) {
            Entry *next = table[b]->next;
            free(table[b]);
            table[b] = next;
        }
    }
    return 0;
}
```
```output
inserted=6
bucket 0: banana(5)
bucket 2: date(2)
bucket 3: hash(9) apple(3)
bucket 5: avocado(2) cherry(7)
get banana=5
get mango=0
remove cherry=1
get cherry=0
size=5
max_chain=2
```

这段代码里有四个和"链地址法"直接相关的点：

1. **头插**让插入是 O(1)，代价是链上的顺序与插入顺序相反（`hash` 在 `apple` 前面）；
2. 查找必须用 `strcmp`，`e->key == key` 比较的是两个指针的地址，永远不是"内容相等"；
3. 删除用二级指针 `Entry **link` 统一处理"删的是链头"和"删的是中间节点"两种情况，不需要为链头单写一个分支；
4. 销毁要遍历每个桶、释放每个节点；如果键是复制来的，还要先 `free` 键。

### 负载因子：链有多长，取决于平均每个桶挂几个
**负载因子**（load factor）定义为

```
load factor = 元素个数 / 桶数
```

它直接决定链的平均长度。链地址法的平均查找长度大致是 `1 + α/2`（成功查找）和 `α`（失败查找）：α 从 0.5 涨到 2，平均查找就从"一两次比较"变成"两三次比较"；α 再大，哈希表就退化成链表了。

下面把同样 10 个键分别散到 7 个桶和 17 个桶里，观察负载因子与最长链的变化：

```c run id=ht-load
#include <stdio.h>

static unsigned djb2(const char *key) {
    unsigned h = 5381u;
    for (const unsigned char *p = (const unsigned char *)key; *p != '\0'; p++) {
        h = h * 33u + *p;
    }
    return h;
}

int main(void) {
    const char *keys[] = {
        "apple", "banana", "cherry", "grape", "melon",
        "mango", "hash", "avocado", "quince", "ugli",
    };
    int n = (int)(sizeof keys / sizeof keys[0]);

    int len7[7] = { 0 };
    int len17[17] = { 0 };
    for (int i = 0; i < n; i++) {
        len7[djb2(keys[i]) % 7]++;
        len17[djb2(keys[i]) % 17]++;
    }

    int used7 = 0;
    int max7 = 0;
    for (int b = 0; b < 7; b++) {
        if (len7[b] > 0) {
            used7++;
        }
        if (len7[b] > max7) {
            max7 = len7[b];
        }
    }
    int used17 = 0;
    int max17 = 0;
    for (int b = 0; b < 17; b++) {
        if (len17[b] > 0) {
            used17++;
        }
        if (len17[b] > max17) {
            max17 = len17[b];
        }
    }

    printf("7 buckets:  used=%d max_chain=%d load_permille=%d\n", used7, max7, n * 1000 / 7);
    printf("17 buckets: used=%d max_chain=%d load_permille=%d\n", used17, max17, n * 1000 / 17);
    return 0;
}
```
```output
7 buckets:  used=5 max_chain=3 load_permille=1428
17 buckets: used=10 max_chain=1 load_permille=588
```

桶数从 7 增加到 17 后，负载因子从 1.43 降到 0.59，最长链从 3 降到 1。这就是**扩容再哈希**（rehash）的意义：不是简单地"多开几个桶"，而是把每个键按新桶数**重新计算**一次桶下标——因为 `hash % 7` 和 `hash % 17` 的结果毫无关系，旧下标完全不能复用。

工程上的常见策略是：**负载因子超过 0.75（或 1.0）就扩容，桶数大约翻倍并取最近的质数**。0.75 是一个折中：再低会浪费内存，再高链开始明显变长。扩容本身的代价是 O(n)，但和动态数组一样，均摊到每次插入仍然是 O(1)。

### 链地址法 vs 开放寻址
冲突处理有两大类。链地址法把冲突的元素挂成链；开放寻址法（线性探测、二次探测、双重哈希）则在桶数组内部"再找下一个空位"。两者对比：

| | 链地址法 | 开放寻址法 |
|---|---|---|
| 冲突元素放哪 | 每个桶挂一条链（堆上的节点） | 数组内部继续探测下一个槽 |
| 负载因子 | 可以大于 1 | 必须小于 1（通常 ≤ 0.7） |
| 删除 | 直接摘链，简单 | 不能直接置空，要用"墓碑"标记，否则查找链会断 |
| 缓存局部性 | 差（节点分散） | 好（都在一个数组里） |
| 额外内存 | 每个元素一个 `next` + 分配器开销 | 数组本身，可能有空槽浪费 |

链地址法最大的优势是**删除简单、负载因子允许大于 1**，这也是教学和面试里最常要求手写的一种。

### 键的所有权：字符串必须复制，且必须释放
如果表的键来自 `scanf` 读入的缓冲区，直接保存指针是灾难：

```c
char buf[32];
scanf("%31s", buf);
map_put(&m, buf, 1);       /* 错：表里存的是 buf 的地址 */
scanf("%31s", buf);        /* buf 被覆盖，表里第一个键也跟着变了 */
```

正确做法是在插入时 `malloc(strlen(key) + 1)` 并复制内容，让表**拥有**这份键；删除节点和销毁表时再 `free`。这带来一条清晰的所有权约定：

> 谁分配，谁释放；表分配了键的副本，表就负责在删除/销毁时释放它。

如果更新一个已存在的键时又复制了一份新键，却忘了释放旧键，检查泄漏的判题器会直接判 `LEAK`。

### 负数取模的陷阱
C 的 `%` 对负数向零截断：`-6 % 7` 等于 `-6`，而不是 `1`。如果哈希值用有符号整型计算，`hash % nbuckets` 可能得到负数，拿它当数组下标就是越界访问：

```c run id=ht-negative
#include <stdio.h>

int main(void) {
    int signed_hash = -6;
    unsigned unsigned_hash = 4294967290u;   /* 同一个 32 位模式，按无符号解释 */

    printf("signed   %d %% 7 = %d\n", signed_hash, signed_hash % 7);
    printf("unsigned %u %% 7 = %u\n", unsigned_hash, unsigned_hash % 7u);
    printf("修正后 = %d\n", (signed_hash % 7 + 7) % 7);
    return 0;
}
```
```output
signed   -6 % 7 = -6
unsigned 4294967290 % 7 = 5
修正后 = 1
```

两个修正办法：**哈希值一律用无符号类型计算**（推荐，djb2 本身就该这么写），或者取模后再兜底 `(h % n + n) % n`。前者从源头避免负数，后者适合不得不接手有符号哈希值的场合。

```memory title="链地址法哈希表：7 个桶 + 两条冲突链（地址只表示先后关系）"
位置 | 内容 | 说明
table[0] | 指向节点 A | 桶 0 的头指针
table[1] | NULL | 空桶：没有键落在这里
table[2] | 指向节点 C | 桶 2 的头指针
堆上节点 A | key="apple", value=3, next=&B | 桶 0 的第一个节点
堆上节点 B | key="avocado", value=2, next=NULL | 冲突元素：挂在 A 后面
堆上节点 C | key="date", value=2, next=NULL | 桶 2 只有一个节点
```

## 编译与运行

用 gcc 或 clang 编译，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra hash_table.c -o hash_table
./hash_table
```

```bash
clang -std=c17 -Wall -Wextra hash_table.c -o hash_table
./hash_table
```

哈希表同时涉及指针链和堆内存，建议开着 sanitizer 跑：

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=address,undefined hash_table.c -o hash_table
./hash_table
```

测试时重点覆盖：同一个键插入两次（应更新而不是新增）、删除链头 / 删除链中 / 删除不存在的键、把所有键删光再插入、以及键长刚好等于缓冲区上限的情况。

## 常见错误

### 用 `==` 比较字符串键 [WA]
`e->key == key` 比较的是两个指针的地址。除非两个指针指向同一块内存，否则永远不相等。哈希表里所有键的比较都必须用 `strcmp`。

```c
if (e->key == key) {        /* 错：比较的是地址 */
    return e;
}
```

### 删除节点时只摘链，不释放节点和键 [LEAK]
`*link = victim->next;` 之后必须 `free(victim->key)`（如果键是复制的）和 `free(victim)`。只摘链不释放，表和堆就同时丢掉了这块内存，判题器会判 `LEAK`。

### 扩容后直接沿用旧桶下标 [WA]
`hash % 7` 和 `hash % 17` 没有任何对应关系。扩容时必须对每个键重新计算 `hash % 新桶数`，否则大部分键会被放进错误的桶，查找随即失败。

### 哈希值用有符号类型且不处理负余数 [RE]
`-6 % 7` 是 `-6`，拿它当桶下标就是 `table[-6]`。哈希值应使用 `unsigned`；如果必须处理有符号值，至少写成 `(h % n + n) % n`。

## 客观题

### q-s7-hash-table-1 single
链地址法哈希表中，负载因子 `α = 元素个数 / 桶数`。下面关于负载因子与扩容的说法哪一个是正确的？

- [x] α 越大，桶里的链平均越长，查找会逐渐退化成链表；通常 α 超过 0.75 左右就扩容并重新计算每个键的桶下标
  > 正确。链地址法的平均查找长度约为 `1 + α/2`，α 增大时链变长，O(1) 的优势消失。扩容必须对每个键重新取模，因为新桶数下 `hash % 新桶数` 与旧下标无关。
- [ ] 只要桶数足够多，冲突就不会发生，因此不需要处理链
  > 错。哈希函数把远多于桶数的可能键映射到有限个桶，冲突由鸽巢原理保证必然存在，与桶数多少无关。桶数只能降低冲突概率，不能消除冲突。
- [ ] 链地址法的负载因子必须始终小于 1，否则数组会越界
  > 错。链地址法的元素挂在堆上的链表中，桶数组本身不会因为 α > 1 而越界；α 可以大于 1，只是性能下降。必须小于 1 的是开放寻址法。
- [ ] 扩容时只要把桶数组变大，原有节点的桶下标可以继续使用
  > 错。桶下标是 `hash % 桶数`，桶数一变结果就变；继续用旧下标会让键落到错误的桶，查找失败。扩容必须逐键重新哈希。
