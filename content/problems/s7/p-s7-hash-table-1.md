---json
{
  "id": "p-s7-hash-table-1",
  "title": "词频统计：链地址法哈希表统计单词出现次数与最高频词",
  "difficulty": "L4",
  "knowledgePoints": ["s7-hash-table"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
词频统计是哈希表最经典的应用：面对成千上万个单词，按"先排序再数"要做 O(n log n)，而"哈希表 + 链表"平均只要 O(n)。

请你用**链地址法**实现一个字符串哈希表，完成下面的任务：

1. 读入 `n` 个单词，统计每个单词出现的次数；
2. 输出不同单词的个数 `distinct`；
3. 输出出现次数最多的单词 `top` 及其次数；如果并列，输出**字典序最小**的那个；
4. 回答 `q` 次查询：每个查询单词出现了几次（没出现过输出 0）。

字符串哈希请使用 djb2：

```c
unsigned h = 5381u;
/* 对每个字节 c：h = h * 33 + c，按无符号 32 位自然回绕 */
```

桶的数量固定为 `8192`，桶下标是 `hash % 8192`。每个桶挂一条链表；冲突的单词依次挂在链上。

## 输入格式
第一行一个整数 `n`。

接下来 `n` 行，每行一个单词。

接下来一行一个整数 `q`。

再接下来 `q` 行，每行一个查询单词。

单词只包含小写字母 `a`–`z`，长度在 1 到 20 之间。

## 输出格式
前两行：

```
distinct=<不同单词个数>
top=<出现次数最多的单词> <次数>
```

接下来 `q` 行，每行：

```
q <查询单词> <出现次数>
```

## 数据范围
1 ≤ n ≤ 20000
1 ≤ q ≤ 500
每个单词长度 1–20，只含小写字母

最大输入约 420KB；输出最多约 14KB。`int` 足以容纳出现次数（≤ 20000）。

## 示例
### 示例 1
```in
6
apple
banana
apple
cherry
banana
apple
2
apple
durian
```
```out
distinct=3
top=apple 3
q apple 3
q durian 0
```
> 三个不同单词：`apple` 3 次、`banana` 2 次、`cherry` 1 次。`apple` 次数最多；查询 `durian` 从未出现，输出 0。

### 示例 2（边界：只有一个单词）
```in
1
z
2
z
a
```
```out
distinct=1
top=z 1
q z 1
q a 0
```
> 只有一个单词时 `distinct=1`，它自然就是 `top`。查询 `a` 不存在，输出 0。

## 提示
### 第 1 层
先写 djb2 和桶下标 `hash(word) % 8192`。每个桶存一条链表的头指针；节点里保存单词的**副本**（`char word[21]`）和计数。插入前先沿链用 `strcmp` 查找：找到就计数加一，找不到才 `malloc` 新节点。

### 第 2 层
读单词用 `char word[21]` 配 `scanf("%20s", word)`：宽度 20 给最长单词留出结束符。输出 `top` 时遍历所有桶的所有节点，比较规则是：

```c
if (best == NULL || e->count > best->count ||
    (e->count == best->count && strcmp(e->word, best->word) < 0)) {
    best = e;
}
```

### 第 3 层
查询时直接复用同一个 `find` 函数；`distinct` 在每次"新建节点"时加一。程序结束前遍历所有桶，把每条链上的节点 `free` 掉，保持分配与释放配对。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define BUCKETS 8192
#define MAX_WORD 20

typedef struct Entry {
    char word[MAX_WORD + 1];   /* 自己的副本，不依赖输入缓冲区 */
    int count;
    struct Entry *next;
} Entry;

static Entry *table[BUCKETS];

static unsigned hash_word(const char *word) {
    unsigned h = 5381u;
    for (const unsigned char *p = (const unsigned char *)word; *p != '\0'; p++) {
        h = h * 33u + *p;
    }
    return h;
}

static int bucket_of(const char *word) {
    return (int)(hash_word(word) % BUCKETS);
}

static Entry *find_word(const char *word) {
    for (Entry *e = table[bucket_of(word)]; e != NULL; e = e->next) {
        if (strcmp(e->word, word) == 0) {
            return e;
        }
    }
    return NULL;
}

/* 已存在则计数加一并返回 0；新建节点返回 1；内存不足返回 -1 */
static int add_word(const char *word) {
    Entry *e = find_word(word);
    if (e != NULL) {
        e->count++;
        return 0;
    }
    Entry *node = malloc(sizeof *node);
    if (node == NULL) {
        return -1;
    }
    size_t len = strlen(word);
    memcpy(node->word, word, len + 1);
    node->count = 1;
    int b = bucket_of(word);
    node->next = table[b];      /* 头插 */
    table[b] = node;
    return 1;
}

static Entry *best_entry(void) {
    Entry *best = NULL;
    for (int b = 0; b < BUCKETS; b++) {
        for (Entry *e = table[b]; e != NULL; e = e->next) {
            if (best == NULL || e->count > best->count ||
                (e->count == best->count && strcmp(e->word, best->word) < 0)) {
                best = e;
            }
        }
    }
    return best;
}

static void free_table(void) {
    for (int b = 0; b < BUCKETS; b++) {
        Entry *cur = table[b];
        while (cur != NULL) {
            Entry *next = cur->next;
            free(cur);
            cur = next;
        }
        table[b] = NULL;
    }
}

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1 || n < 1 || n > 20000) {
        return 0;
    }

    int distinct = 0;
    for (int i = 0; i < n; i++) {
        char word[MAX_WORD + 1];
        if (scanf("%20s", word) != 1) {
            return 0;
        }
        int added = add_word(word);
        if (added < 0) {
            return 0;
        }
        distinct += added;
    }

    int q = 0;
    if (scanf("%d", &q) != 1 || q < 1 || q > 500) {
        free_table();
        return 0;
    }

    printf("distinct=%d\n", distinct);
    Entry *best = best_entry();
    if (best != NULL) {
        printf("top=%s %d\n", best->word, best->count);
    }

    for (int i = 0; i < q; i++) {
        char word[MAX_WORD + 1];
        if (scanf("%20s", word) != 1) {
            break;
        }
        Entry *e = find_word(word);
        printf("q %s %d\n", word, e != NULL ? e->count : 0);
    }

    free_table();
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define BUCKETS 8192
#define MAX_WORD 20

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1) {
        return 0;
    }

    for (int i = 0; i < n; i++) {
        char word[MAX_WORD + 1];
        if (scanf("%20s", word) != 1) {
            return 0;
        }
        /* TODO: 计算 djb2 哈希，沿桶内链表查找；存在则计数加一，否则 malloc 新节点并复制单词 */
    }

    int q = 0;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        char word[MAX_WORD + 1];
        if (scanf("%20s", word) != 1) {
            return 0;
        }
        (void)word;
        /* TODO: 查询并输出 */
    }

    /* TODO: 输出 distinct 与 top，并释放所有节点 */
    printf("distinct=0\n");
    printf("top= 0\n");
    return 0;
}
```

## 复杂度
时间：平均 O(n + q)，每次插入/查询只访问一个桶里的链；最坏情况（所有单词哈希到同一个桶）退化为 O(n²)。
空间 O(distinct)：每个不同单词一个节点（约 40 字节）加桶数组 8192 个指针。

## 常见错误
### 用 `==` 比较字符串 [WA]
`e->word == word` 比较的是两个数组的地址，永远不相等。于是每个单词都被当成新单词插入，`distinct` 变成 `n`，所有查询都返回 0。必须用 `strcmp(e->word, word) == 0`。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define BUCKETS 8192
#define MAX_WORD 20

typedef struct Entry {
    char word[MAX_WORD + 1];
    int count;
    struct Entry *next;
} Entry;

static Entry *table[BUCKETS];

static unsigned hash_word(const char *word) {
    unsigned h = 5381u;
    for (const unsigned char *p = (const unsigned char *)word; *p != '\0'; p++) {
        h = h * 33u + *p;
    }
    return h;
}

static Entry *find_word(const char *word) {
    for (Entry *e = table[hash_word(word) % BUCKETS]; e != NULL; e = e->next) {
        if (e->word == word) {              /* 错：比较的是地址 */
            return e;
        }
    }
    return NULL;
}

static int add_word(const char *word) {
    Entry *e = find_word(word);
    if (e != NULL) {
        e->count++;
        return 0;
    }
    Entry *node = malloc(sizeof *node);
    if (node == NULL) {
        return -1;
    }
    size_t len = strlen(word);
    memcpy(node->word, word, len + 1);
    node->count = 1;
    int b = (int)(hash_word(word) % BUCKETS);
    node->next = table[b];
    table[b] = node;
    return 1;
}

static void free_table(void) {
    for (int b = 0; b < BUCKETS; b++) {
        Entry *cur = table[b];
        while (cur != NULL) {
            Entry *next = cur->next;
            free(cur);
            cur = next;
        }
        table[b] = NULL;
    }
}

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    int distinct = 0;
    for (int i = 0; i < n; i++) {
        char word[MAX_WORD + 1];
        if (scanf("%20s", word) != 1) {
            return 0;
        }
        int added = add_word(word);
        if (added < 0) {
            return 0;
        }
        distinct += added;
    }
    int q = 0;
    if (scanf("%d", &q) != 1) {
        free_table();
        return 0;
    }
    printf("distinct=%d\n", distinct);
    Entry *best = NULL;
    for (int b = 0; b < BUCKETS; b++) {
        for (Entry *e = table[b]; e != NULL; e = e->next) {
            if (best == NULL || e->count > best->count ||
                (e->count == best->count && strcmp(e->word, best->word) < 0)) {
                best = e;
            }
        }
    }
    if (best != NULL) {
        printf("top=%s %d\n", best->word, best->count);
    }
    for (int i = 0; i < q; i++) {
        char word[MAX_WORD + 1];
        if (scanf("%20s", word) != 1) {
            break;
        }
        Entry *e = find_word(word);
        printf("q %s %d\n", word, e != NULL ? e->count : 0);
    }
    free_table();
    return 0;
}
```

### `top` 并列时没有按字典序取最小 [WA]
只写 `if (e->count > best->count) best = e;` 会让"先被扫描到"的单词获胜，而扫描顺序由桶下标决定，与字典序无关。示例里 `b` 和 `a` 各出现一次时，正确答案是 `a`；隐藏用例里还有 20000 个单词全部并列的极端情况，只有显式比较字典序才能稳定输出最小者。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define BUCKETS 8192
#define MAX_WORD 20

typedef struct Entry {
    char word[MAX_WORD + 1];
    int count;
    struct Entry *next;
} Entry;

static Entry *table[BUCKETS];

static unsigned hash_word(const char *word) {
    unsigned h = 5381u;
    for (const unsigned char *p = (const unsigned char *)word; *p != '\0'; p++) {
        h = h * 33u + *p;
    }
    return h;
}

static Entry *find_word(const char *word) {
    for (Entry *e = table[hash_word(word) % BUCKETS]; e != NULL; e = e->next) {
        if (strcmp(e->word, word) == 0) {
            return e;
        }
    }
    return NULL;
}

static int add_word(const char *word) {
    Entry *e = find_word(word);
    if (e != NULL) {
        e->count++;
        return 0;
    }
    Entry *node = malloc(sizeof *node);
    if (node == NULL) {
        return -1;
    }
    size_t len = strlen(word);
    memcpy(node->word, word, len + 1);
    node->count = 1;
    int b = (int)(hash_word(word) % BUCKETS);
    node->next = table[b];
    table[b] = node;
    return 1;
}

static void free_table(void) {
    for (int b = 0; b < BUCKETS; b++) {
        Entry *cur = table[b];
        while (cur != NULL) {
            Entry *next = cur->next;
            free(cur);
            cur = next;
        }
        table[b] = NULL;
    }
}

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    int distinct = 0;
    for (int i = 0; i < n; i++) {
        char word[MAX_WORD + 1];
        if (scanf("%20s", word) != 1) {
            return 0;
        }
        int added = add_word(word);
        if (added < 0) {
            return 0;
        }
        distinct += added;
    }
    int q = 0;
    if (scanf("%d", &q) != 1) {
        free_table();
        return 0;
    }
    printf("distinct=%d\n", distinct);
    Entry *best = NULL;
    for (int b = 0; b < BUCKETS; b++) {
        for (Entry *e = table[b]; e != NULL; e = e->next) {
            if (best == NULL || e->count > best->count) {   /* 错：并列时没有比较字典序 */
                best = e;
            }
        }
    }
    if (best != NULL) {
        printf("top=%s %d\n", best->word, best->count);
    }
    for (int i = 0; i < q; i++) {
        char word[MAX_WORD + 1];
        if (scanf("%20s", word) != 1) {
            break;
        }
        Entry *e = find_word(word);
        printf("q %s %d\n", word, e != NULL ? e->count : 0);
    }
    free_table();
    return 0;
}
```

### 每个单词都从头扫一遍整张表 [TLE]
如果不用哈希，而是每次插入都遍历所有已有单词做 `strcmp`，20000 个不同单词会产生约 2 亿次比较，隐藏用例会超时。哈希表把"找哪个桶"变成 O(1)，链上只需要比较同一个桶里的少数单词。

### 单词缓冲区只开 20 字节，却用 `scanf("%s", word)` [RE]
题目允许长度为 20 的单词，`char word[20]` 加上结束符需要 21 字节；`%s` 又不限宽，20 个字母会写越界。应该写 `char word[MAX_WORD + 1]` 和 `scanf("%20s", word)`。这类越界在 ASan 下会报 `stack-buffer-overflow`，判 `RE`。

## 测试用例
### 01 sample 示例 1
```in
6
apple
banana
apple
cherry
banana
apple
2
apple
durian
```
```out
distinct=3
top=apple 3
q apple 3
q durian 0
```

### 02 sample 示例 2
```in
1
z
2
z
a
```
```out
distinct=1
top=z 1
q z 1
q a 0
```

### 03 degenerate 同一个单词重复 5 次
```in
5
abc
abc
abc
abc
abc
2
abc
xyz
```
```out
distinct=1
top=abc 5
q abc 5
q xyz 0
```

### 04 trap 两个单词并列，必须取字典序最小
```in
2
b
a
1
b
```
```out
distinct=2
top=a 1
q b 1
```

### 05 trap 出现次数最多的词不是第一个出现的
```in
7
a
b
b
a
c
c
c
2
c
b
```
```out
distinct=3
top=c 3
q c 3
q b 2
```

### 06 normal 20 字母长单词与短单词混合
```in
4
abcdefghijklmnopqrst
b
abcdefghijklmnopqrst
a
3
abcdefghijklmnopqrst
b
zzz
```
```out
distinct=3
top=abcdefghijklmnopqrst 2
q abcdefghijklmnopqrst 2
q b 1
q zzz 0
```

### 生成 boundary 20000 个互不相同的单词，top 取字典序最小
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

function render(words, queries) {
  const counts = new Map();
  for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);
  let topWord = '';
  let topCount = -1;
  for (const [w, c] of counts) {
    if (c > topCount || (c === topCount && (topWord === '' || w < topWord))) {
      topWord = w;
      topCount = c;
    }
  }
  const lines = [`distinct=${counts.size}`, `top=${topWord} ${topCount}`];
  for (const q of queries) lines.push(`q ${q} ${counts.get(q) || 0}`);
  return lines.join('\n') + '\n';
}

{
  const n = 20000;
  const words = [];
  for (let i = 0; i < n; i++) words.push(wordOf(i));
  const queries = ['aaaa', 'zzzz', 'abcd', 'zzzzz', 'q'];
  cases.push({
    kind: 'boundary',
    category: '20000 个不同单词，全部并列时 top 取字典序最小',
    input: `${n}\n${words.join('\n')}\n${queries.length}\n${queries.join('\n')}\n`,
    output: render(words, queries),
  });
}

{
  const vocab = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta'];
  const words = [];
  for (let i = 0; i < 3000; i++) words.push(rng.pick(vocab));
  const queries = [];
  for (let i = 0; i < 100; i++) {
    queries.push(i % 7 === 0 ? `x${String.fromCharCode(97 + (i % 26))}q` : rng.pick(vocab));
  }
  cases.push({
    kind: 'normal',
    category: '3000 个单词、8 个候选词，100 次查询',
    input: `${words.length}\n${words.join('\n')}\n${queries.length}\n${queries.join('\n')}\n`,
    output: render(words, queries),
  });
}

return cases;
```
