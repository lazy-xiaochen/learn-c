---json
{
  "id": "p-s4-alignment-2",
  "title": "二进制记录文件的内存账本：记录大小、填充与文件偏移",
  "difficulty": "L4",
  "knowledgePoints": ["s4-alignment"],
  "special": "memory-layout",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个日志分析程序要把 `LogRecord` 结构体数组直接写进二进制文件。结构体定义如下（类型和顺序不能改）：

```c
#include <stdint.h>

struct LogRecord {
    uint8_t kind;      /* 记录类型 */
    uint64_t id;       /* 记录编号 */
    uint16_t len;      /* 负载长度 */
    uint32_t crc;      /* 校验值 */
    char tag[3];       /* 3 字节标签 */
};
```

由于内存对齐，这个结构体里存在若干**填充字节**；而整份文件是 `n` 条记录首尾相接。请你写一个"内存账本"程序：

1. 输出这个结构体的 `sizeof`、对齐值、每个成员的 `offsetof` 和大小、所有填充区间；
2. 输出 `n` 条记录总共占多少字节，以及这些记录一共浪费了多少填充字节；
3. 对每个查询的文件字节偏移 `b`，回答它落在**第几条记录**、以及该记录里的**哪个成员或填充**。

### 布局规则
本题只使用本平台的规则（x86-64，Clang）：

1. 对齐要求：`char` / `uint8_t` 为 1，`short` / `uint16_t` 为 2，`int` / `uint32_t` 为 4，`double` / `uint64_t` 为 8；数组的对齐要求等于元素类型；
2. 成员按声明顺序放置：先把已占用字节数向上取整到该成员对齐值的倍数，再放成员；
3. 结构体对齐值 = 所有成员对齐值的最大值；
4. 结构体总大小 = 把最后一个成员结束的位置向上取整到结构体对齐值的倍数。

**必须用 `offsetof` 和 `sizeof` 取偏移和大小**，不要手算，也不要在输出里打印地址。文件里第 `i` 条记录的起始偏移是 `i * sizeof(struct LogRecord)`。

## 输入格式
第一行两个整数 `n` 和 `q`：

- `n`：记录条数；
- `q`：查询个数。

接下来 `q` 行，每行一个整数 `b`（`0 ≤ b ≤ n * sizeof(struct LogRecord)`），表示要查询的文件字节偏移。`b` 可能很大，必须用 64 位整数读取。

## 输出格式
先输出布局与文件账本，每行一条：

1. `sizeof=<结构体大小>`
2. `align=<结构体对齐值>`
3. 每个成员一行：`member <名字> <偏移> <大小>`（按声明顺序）
4. 每个填充区间一行：`pad <起点> <终点>`（左闭右开，按起点从小到大；包括内部填充和尾部填充）
5. `waste=<单条记录的填充字节数>`（`sizeof - 所有成员大小之和`）
6. `file=<n 条记录的总字节数>`（`n * sizeof`）
7. `waste_total=<n 条记录浪费的填充总字节数>`（`n * waste`）

然后对每个查询输出一行：

- 若 `b` 超出文件范围（`b >= file`）：`at <b> out-of-range`；
- 否则：`at <b> record=<记录下标> <成员名|pad>`，其中记录下标从 0 开始，成员名是该记录里的成员，填充输出 `pad`。

## 数据范围
1 ≤ n ≤ 1000000000
1 ≤ q ≤ 100
0 ≤ b ≤ n * sizeof(struct LogRecord)

`file` 最大为 10⁹ × 32 = 3.2×10¹⁰，`waste_total` 最大为 1.4×10¹⁰，都超过 `int` 的范围，必须用 `long long`。输出最多约 110 行，远小于 64KB。

## 示例
### 示例 1
```in
2 5
0
8
18
31
32
```
```out
sizeof=32
align=8
member kind 0 1
member id 8 8
member len 16 2
member crc 20 4
member tag 24 3
pad 1 8
pad 18 20
pad 27 32
waste=14
file=64
waste_total=28
at 0 record=0 kind
at 8 record=0 id
at 18 record=0 pad
at 31 record=0 pad
at 32 record=1 kind
```
> `kind` 在 0；`id` 要 8 对齐，所以 `[1,8)` 是填充；`len` 在 16；`crc` 要 4 对齐，`[18,20)` 是填充；`tag` 在 24，最后 `[27,32)` 是尾部填充。单条记录 32 字节，浪费 14 字节；两条记录共 64 字节，浪费 28 字节。偏移 32 正好是第 1 条记录（下标 1）的开头。

### 示例 2（边界：只有一条记录，文件末尾之外）
```in
1 4
0
24
27
32
```
```out
sizeof=32
align=8
member kind 0 1
member id 8 8
member len 16 2
member crc 20 4
member tag 24 3
pad 1 8
pad 18 20
pad 27 32
waste=14
file=32
waste_total=14
at 0 record=0 kind
at 24 record=0 tag
at 27 record=0 pad
at 32 out-of-range
```
> 只有一条记录时文件正好 32 字节，合法偏移是 `0..31`；`32` 已经越过文件末尾，必须输出 `out-of-range`，不能把它算成"第 1 条记录的第 0 个字节"。

## 提示
### 第 1 层
先只想一条记录：`kind` 是 1 字节，后面为什么要空 7 字节才放 `id`？因为 `uint64_t` 要求 8 字节对齐。把这条记录的 32 个字节画出来，标出哪些是填充，再想"第 `i` 条记录从哪个偏移开始"。

### 第 2 层
成员偏移用 `offsetof(struct LogRecord, id)` 这样的表达式取，大小用 `sizeof(((struct LogRecord *)0)->id)`；填充区间按"当前成员偏移 > 上一个成员结束位置"来判断，最后再补 `sizeof` 与最后结束位置之间的尾部填充。单条记录的填充总量 = `sizeof - 各成员大小之和`，不要数填充区间的个数。

### 第 3 层
文件偏移要分成"第几条记录"和"记录内偏移"两部分：`record = b / sizeof`，`inner = b % sizeof`（`b` 用 `long long`，`sizeof` 转成 `long long` 再除）。`b == n * sizeof` 是越界，不是最后一条记录的最后一个字节；`b` 的最大值达到 3.2×10¹⁰，用 `int` 读或存都会溢出。`file` 和 `waste_total` 也要用 `long long` 算，乘法前先转成 64 位。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <stddef.h>
#include <stdint.h>

struct LogRecord {
    uint8_t kind;
    uint64_t id;
    uint16_t len;
    uint32_t crc;
    char tag[3];
};

typedef struct {
    const char *name;
    size_t off;
    size_t size;
} Field;

static const Field fields[] = {
    { "kind", offsetof(struct LogRecord, kind), sizeof(((struct LogRecord *)0)->kind) },
    { "id", offsetof(struct LogRecord, id), sizeof(((struct LogRecord *)0)->id) },
    { "len", offsetof(struct LogRecord, len), sizeof(((struct LogRecord *)0)->len) },
    { "crc", offsetof(struct LogRecord, crc), sizeof(((struct LogRecord *)0)->crc) },
    { "tag", offsetof(struct LogRecord, tag), sizeof(((struct LogRecord *)0)->tag) },
};

#define FIELD_COUNT(a) ((int)(sizeof(a) / sizeof((a)[0])))

int main(void) {
    int n, q;
    if (scanf("%d %d", &n, &q) != 2 || n < 1 || n > 1000000000 || q < 1 || q > 100) {
        return 0;
    }

    long long queries[100];
    for (int i = 0; i < q; i++) {
        if (scanf("%lld", &queries[i]) != 1) {
            return 0;
        }
    }

    const size_t size = sizeof(struct LogRecord);
    const size_t align = _Alignof(struct LogRecord);
    const int nf = FIELD_COUNT(fields);

    size_t used = 0;
    printf("sizeof=%zu\n", size);
    printf("align=%zu\n", align);
    for (int i = 0; i < nf; i++) {
        printf("member %s %zu %zu\n", fields[i].name, fields[i].off, fields[i].size);
        used += fields[i].size;
    }

    size_t end = 0;
    for (int i = 0; i < nf; i++) {
        if (fields[i].off > end) {
            printf("pad %zu %zu\n", end, fields[i].off);
        }
        end = fields[i].off + fields[i].size;
    }
    if (size > end) {
        printf("pad %zu %zu\n", end, size);
    }

    const size_t waste = size - used;
    const long long file_size = (long long)n * (long long)size;
    const long long waste_total = (long long)n * (long long)waste;

    printf("waste=%zu\n", waste);
    printf("file=%lld\n", file_size);
    printf("waste_total=%lld\n", waste_total);

    for (int k = 0; k < q; k++) {
        long long b = queries[k];
        if (b < 0 || b >= file_size) {
            printf("at %lld out-of-range\n", b);
            continue;
        }
        long long record = b / (long long)size;
        size_t inner = (size_t)(b % (long long)size);
        const char *hit = "pad";
        for (int i = 0; i < nf; i++) {
            if (inner >= fields[i].off && inner < fields[i].off + fields[i].size) {
                hit = fields[i].name;
                break;
            }
        }
        printf("at %lld record=%lld %s\n", b, record, hit);
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <stdint.h>

struct LogRecord {
    uint8_t kind;
    uint64_t id;
    uint16_t len;
    uint32_t crc;
    char tag[3];
};

typedef struct {
    const char *name;
    int size;
} Field;

static const Field fields[] = {
    { "kind", 1 },
    { "id", 8 },
    { "len", 2 },
    { "crc", 4 },
    { "tag", 3 },
};

#define FIELD_COUNT(a) ((int)(sizeof(a) / sizeof((a)[0])))

int main(void) {
    int n, q;
    if (scanf("%d %d", &n, &q) != 2 || n < 1 || q < 1 || q > 100) {
        return 0;
    }

    long long queries[100];
    for (int i = 0; i < q; i++) {
        if (scanf("%lld", &queries[i]) != 1) {
            return 0;
        }
    }

    int size = (int)sizeof(struct LogRecord);   /* 结构体大小本身是对的 */
    int align = (int)_Alignof(struct LogRecord);
    int used = 0;

    printf("sizeof=%d\n", size);
    printf("align=%d\n", align);

    int off = 0;
    for (int i = 0; i < FIELD_COUNT(fields); i++) {
        printf("member %s %d %d\n", fields[i].name, off, fields[i].size);
        off += fields[i].size;          /* TODO: 按对齐算出真实偏移，并输出 pad 区间 */
        used += fields[i].size;
    }

    int waste = size - used;
    int file_size = n * size;           /* TODO: n 很大时会溢出 */
    int waste_total = n * waste;        /* TODO: 同样会溢出 */

    printf("waste=%d\n", waste);
    printf("file=%d\n", file_size);
    printf("waste_total=%d\n", waste_total);

    for (int k = 0; k < q; k++) {
        long long b = queries[k];
        if (b < 0 || b >= (long long)file_size) {
            printf("at %lld out-of-range\n", b);
            continue;
        }
        long long record = b / size;
        int inner = (int)(b % size);
        int pos = 0;
        const char *hit = "pad";
        for (int i = 0; i < FIELD_COUNT(fields); i++) {
            if (inner >= pos && inner < pos + fields[i].size) {
                hit = fields[i].name;
                break;
            }
            pos += fields[i].size;      /* TODO: 这里也要用真实偏移 */
        }
        printf("at %lld record=%lld %s\n", b, record, hit);
    }
    return 0;
}
```

## 复杂度
时间 O(q + 成员数)：成员数固定为 5，`q ≤ 100`，每个查询只做一次除法、取模和一遍成员查找。
空间 O(1)：成员表和一个长度 100 的查询数组。

本题的计算量很小，真正要算对的是三件事：**单条记录内部的对齐填充**、**`sizeof` 是每条记录的步长**、**文件偏移要用 64 位整数**。只要其中一件算错，`at` 查询就会在记录边界或填充字节上露馅。

## 常见错误
### 用 int 保存文件大小 [UB]
`n` 最大 10⁹，`sizeof` 是 32，`n * size` 最大 3.2×10¹⁰，`int` 装不下。有符号整数溢出是未定义行为，UBSan 会直接报 `signed integer overflow`；即使没开检查，`file` 也会变成负数，后面的 `out-of-range` 和记录编号全错。

```c file=main.c expect=UB
#include <stdio.h>
#include <stddef.h>
#include <stdint.h>

struct LogRecord {
    uint8_t kind;
    uint64_t id;
    uint16_t len;
    uint32_t crc;
    char tag[3];
};

typedef struct {
    const char *name;
    size_t off;
    size_t size;
} Field;

static const Field fields[] = {
    { "kind", offsetof(struct LogRecord, kind), sizeof(((struct LogRecord *)0)->kind) },
    { "id", offsetof(struct LogRecord, id), sizeof(((struct LogRecord *)0)->id) },
    { "len", offsetof(struct LogRecord, len), sizeof(((struct LogRecord *)0)->len) },
    { "crc", offsetof(struct LogRecord, crc), sizeof(((struct LogRecord *)0)->crc) },
    { "tag", offsetof(struct LogRecord, tag), sizeof(((struct LogRecord *)0)->tag) },
};

#define FIELD_COUNT(a) ((int)(sizeof(a) / sizeof((a)[0])))

int main(void) {
    int n, q;
    if (scanf("%d %d", &n, &q) != 2 || n < 1 || q < 1 || q > 100) {
        return 0;
    }
    long long queries[100];
    for (int i = 0; i < q; i++) {
        if (scanf("%lld", &queries[i]) != 1) {
            return 0;
        }
    }

    size_t size = sizeof(struct LogRecord);
    size_t align = _Alignof(struct LogRecord);
    size_t used = 0;

    printf("sizeof=%zu\n", size);
    printf("align=%zu\n", align);
    for (int i = 0; i < FIELD_COUNT(fields); i++) {
        printf("member %s %zu %zu\n", fields[i].name, fields[i].off, fields[i].size);
        used += fields[i].size;
    }

    size_t end = 0;
    for (int i = 0; i < FIELD_COUNT(fields); i++) {
        if (fields[i].off > end) {
            printf("pad %zu %zu\n", end, fields[i].off);
        }
        end = fields[i].off + fields[i].size;
    }
    if (size > end) {
        printf("pad %zu %zu\n", end, size);
    }
    printf("waste=%zu\n", size - used);

    int file_size = n * (int)size;              /* 错：10^9 * 32 超过 int */
    int waste_total = n * (int)(size - used);   /* 错：10^9 * 14 也超过 int */
    printf("file=%d\n", file_size);
    printf("waste_total=%d\n", waste_total);

    for (int k = 0; k < q; k++) {
        long long b = queries[k];
        if (b < 0 || b >= (long long)file_size) {
            printf("at %lld out-of-range\n", b);
            continue;
        }
        long long record = b / (long long)size;
        size_t inner = (size_t)(b % (long long)size);
        const char *hit = "pad";
        for (int i = 0; i < FIELD_COUNT(fields); i++) {
            if (inner >= fields[i].off && inner < fields[i].off + fields[i].size) {
                hit = fields[i].name;
                break;
            }
        }
        printf("at %lld record=%lld %s\n", b, record, hit);
    }
    return 0;
}
```

### 把最后一个成员的结束位置当成 sizeof [WA]
`tag` 从 24 开始、占 3 字节，结束于 27；但 `sizeof` 是 32，因为结构体要对齐到 8。如果拿 27 当步长，`file` 会变小，第 1 条记录的起点会算成 27 而不是 32，`at 31` 之类本来属于尾部填充的偏移就会落进"第 1 条记录"里。

### waste_total 忘记乘以 n [WA]
`waste` 是**单条记录**的填充字节数（14），`waste_total` 是 `n * waste`。只输出 `waste` 的值，在 `n > 1` 时就会错；两条记录的示例里应当是 28，不是 14。

```c file=main.c expect=WA
#include <stdio.h>
#include <stddef.h>
#include <stdint.h>

struct LogRecord {
    uint8_t kind;
    uint64_t id;
    uint16_t len;
    uint32_t crc;
    char tag[3];
};

int main(void) {
    int n, q;
    if (scanf("%d %d", &n, &q) != 2) {
        return 0;
    }
    long long b;
    if (scanf("%lld", &b) != 1) {
        return 0;
    }
    size_t size = sizeof(struct LogRecord);
    size_t used = sizeof(((struct LogRecord *)0)->kind) + sizeof(((struct LogRecord *)0)->id) +
                  sizeof(((struct LogRecord *)0)->len) + sizeof(((struct LogRecord *)0)->crc) +
                  sizeof(((struct LogRecord *)0)->tag);
    printf("waste=%zu\n", size - used);
    printf("waste_total=%zu\n", size - used);   /* 错：没有乘以 n */
    return 0;
}
```

### 把填充字节当成后一个成员 [WA]
查询 `inner` 时用 `inner <= 成员偏移` 或 `inner < 成员偏移 + 大小 + 1` 这类边界，会把填充的最后一个字节算进相邻成员。例如 `id` 从 8 开始，偏移 7 属于 `[1,8)` 填充；`len` 占 `[16,18)`，偏移 18 属于 `[18,20)` 填充，都不是成员。判断成员区间要用严格的左闭右开：`off <= inner && inner < off + size`。

## 测试用例
### 01 sample 示例 1
```in
2 5
0
8
18
31
32
```
```out
sizeof=32
align=8
member kind 0 1
member id 8 8
member len 16 2
member crc 20 4
member tag 24 3
pad 1 8
pad 18 20
pad 27 32
waste=14
file=64
waste_total=28
at 0 record=0 kind
at 8 record=0 id
at 18 record=0 pad
at 31 record=0 pad
at 32 record=1 kind
```

### 02 sample 示例 2
```in
1 4
0
24
27
32
```
```out
sizeof=32
align=8
member kind 0 1
member id 8 8
member len 16 2
member crc 20 4
member tag 24 3
pad 1 8
pad 18 20
pad 27 32
waste=14
file=32
waste_total=14
at 0 record=0 kind
at 24 record=0 tag
at 27 record=0 pad
at 32 out-of-range
```

### 03 boundary 单条记录只查最后 1 字节
```in
1 1
31
```
```out
sizeof=32
align=8
member kind 0 1
member id 8 8
member len 16 2
member crc 20 4
member tag 24 3
pad 1 8
pad 18 20
pad 27 32
waste=14
file=32
waste_total=14
at 31 record=0 pad
```

### 04 degenerate 单条记录查第一个填充字节
```in
1 1
1
```
```out
sizeof=32
align=8
member kind 0 1
member id 8 8
member len 16 2
member crc 20 4
member tag 24 3
pad 1 8
pad 18 20
pad 27 32
waste=14
file=32
waste_total=14
at 1 record=0 pad
```

### 05 trap 记录边界与两段内部填充
```in
2 7
1
16
17
18
19
20
63
```
```out
sizeof=32
align=8
member kind 0 1
member id 8 8
member len 16 2
member crc 20 4
member tag 24 3
pad 1 8
pad 18 20
pad 27 32
waste=14
file=64
waste_total=28
at 1 record=0 pad
at 16 record=0 len
at 17 record=0 len
at 18 record=0 pad
at 19 record=0 pad
at 20 record=0 crc
at 63 record=1 pad
```

### 06 boundary 十亿条记录，偏移超过 int 范围
```in
1000000000 5
0
31999999999
32000000000
1
8
```
```out
sizeof=32
align=8
member kind 0 1
member id 8 8
member len 16 2
member crc 20 4
member tag 24 3
pad 1 8
pad 18 20
pad 27 32
waste=14
file=32000000000
waste_total=14000000000
at 0 record=0 kind
at 31999999999 record=999999999 pad
at 32000000000 out-of-range
at 1 record=0 pad
at 8 record=0 id
```

### 07 normal 三条记录，跨记录查询
```in
3 4
24
50
64
95
```
```out
sizeof=32
align=8
member kind 0 1
member id 8 8
member len 16 2
member crc 20 4
member tag 24 3
pad 1 8
pad 18 20
pad 27 32
waste=14
file=96
waste_total=42
at 24 record=0 tag
at 50 record=1 pad
at 64 record=2 kind
at 95 record=2 pad
```

### 08 trap len 的最后一个字节与后面的填充
```in
1 4
16
17
18
19
```
```out
sizeof=32
align=8
member kind 0 1
member id 8 8
member len 16 2
member crc 20 4
member tag 24 3
pad 1 8
pad 18 20
pad 27 32
waste=14
file=32
waste_total=14
at 16 record=0 len
at 17 record=0 len
at 18 record=0 pad
at 19 record=0 pad
```

### 09 normal 十条记录，文件末尾与最后一条记录
```in
10 5
0
320
319
9
10
```
```out
sizeof=32
align=8
member kind 0 1
member id 8 8
member len 16 2
member crc 20 4
member tag 24 3
pad 1 8
pad 18 20
pad 27 32
waste=14
file=320
waste_total=140
at 0 record=0 kind
at 320 out-of-range
at 319 record=9 pad
at 9 record=0 id
at 10 record=0 id
```

### 10 degenerate 单条记录的 id 区间
```in
1 2
8
15
```
```out
sizeof=32
align=8
member kind 0 1
member id 8 8
member len 16 2
member crc 20 4
member tag 24 3
pad 1 8
pad 18 20
pad 27 32
waste=14
file=32
waste_total=14
at 8 record=0 id
at 15 record=0 id
```

### 生成 boundary 两条记录的每一个字节
```js gen
const fields = [
  ['kind', 1, 1],
  ['id', 8, 8],
  ['len', 2, 2],
  ['crc', 4, 4],
  ['tag', 3, 1],
];

function layout(members) {
  let used = 0;
  let align = 1;
  let sum = 0;
  const offs = [];
  for (const [name, size, a] of members) {
    used = Math.ceil(used / a) * a;
    offs.push({ name, off: used, size });
    used += size;
    sum += size;
    if (a > align) align = a;
  }
  const size = Math.ceil(used / align) * align;
  return { offs, size, align, waste: size - sum };
}

const l = layout(fields);
const n = 2;
const queries = [];
for (let b = 0; b < n * l.size; b++) queries.push(b);

const out = ['sizeof=' + l.size, 'align=' + l.align];
for (const f of l.offs) out.push('member ' + f.name + ' ' + f.off + ' ' + f.size);
let end = 0;
for (const f of l.offs) {
  if (f.off > end) out.push('pad ' + end + ' ' + f.off);
  end = f.off + f.size;
}
if (l.size > end) out.push('pad ' + end + ' ' + l.size);
out.push('waste=' + l.waste);
out.push('file=' + n * l.size);
out.push('waste_total=' + n * l.waste);
for (const b of queries) {
  const record = Math.floor(b / l.size);
  const inner = b % l.size;
  let hit = 'pad';
  for (const f of l.offs) {
    if (inner >= f.off && inner < f.off + f.size) { hit = f.name; break; }
  }
  out.push('at ' + b + ' record=' + record + ' ' + hit);
}

return [{
  kind: 'boundary',
  category: '两条记录的逐字节归属',
  input: n + ' ' + queries.length + '\n' + queries.join('\n') + '\n',
  output: out.join('\n') + '\n',
}];
```
