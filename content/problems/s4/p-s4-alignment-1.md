---json
{
  "id": "p-s4-alignment-1",
  "title": "结构体布局审计：用 offsetof 报告 sizeof、成员偏移与填充区间",
  "difficulty": "L4",
  "knowledgePoints": ["s4-alignment"],
  "special": "memory-layout",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
你在维护一个日志分析工具，里面有四个结构体，分别对应网络包头、配置项、学生记录和一个"退化"的小结构体。它们**已经按下面的定义写在程序里**（类型和顺序都不能改，本题只研究布局，不研究怎么重新排列）：

```c
#include <stdint.h>

struct Packet {
    uint8_t version;
    uint32_t seq;
    uint16_t length;
    uint64_t timestamp;
    uint8_t flags;
};

struct Config {
    char key[10];
    double value;
    int enabled;
    short port;
};

struct Student {
    char id[9];
    char grade;
    int score;
    double gpa;
};

struct Tiny {
    short code;
    char tag;
};
```

请你写一个"布局审计器"：输入结构体编号和若干个字节偏移，输出这个结构体的 `sizeof`、对齐值、每个成员的 `offsetof` 与大小、所有填充区间，以及每个查询字节到底落在哪个成员（或填充）里。

### 布局规则
本题只使用本平台的规则（x86-64，Clang）：

1. 每种类型有对齐要求：`char` / `uint8_t` 为 1，`short` / `uint16_t` 为 2，`int` / `uint32_t` 为 4，`double` / `uint64_t` 为 8；数组的对齐要求等于元素类型的对齐要求；
2. 成员按**声明顺序**放置。放一个成员前，先把"已占用字节数"向上取整到该成员对齐值的倍数（差距就是填充），再放下这个成员；
3. 结构体对齐值 = 所有成员对齐值的最大值；
4. 结构体总大小 = 把"最后一个成员结束的位置"向上取整到结构体对齐值的倍数（差距就是尾部填充）。

**必须用 `offsetof` 取成员偏移**，不要用"前一个成员偏移 + 前一个成员大小"手算，也不要在输出里打印任何地址。填充区间由相邻成员的偏移和 `sizeof` 推出来。

## 输入格式
第一行两个整数 `sid` 和 `q`：

- `sid`：结构体编号，`1` 是 `Packet`，`2` 是 `Config`，`3` 是 `Student`，`4` 是 `Tiny`；
- `q`：查询个数。

接下来 `q` 行，每行一个整数 `b`（`0 ≤ b < sizeof(所选结构体)`），表示要查询的字节偏移。查询按输入顺序逐个回答，允许重复。

## 输出格式
先输出这个结构体的布局报告，每行一条：

1. `sizeof=<结构体大小>`
2. `align=<结构体对齐值>`
3. 每个成员一行：`member <名字> <偏移> <大小>`（按**声明顺序**，大小用 `sizeof` 取，数组取整个数组的字节数）
4. 每个填充区间一行：`pad <起点> <终点>`（左闭右开，按起点从小到大；包括内部填充和尾部填充）
5. `waste=<填充总字节数>`（等于 `sizeof - 所有成员大小之和`）

然后对每个查询输出一行：

- `at <b> <成员名>`：这个字节属于某个成员；
- `at <b> pad`：这个字节是填充，不属于任何成员。

## 数据范围
1 ≤ sid ≤ 4
1 ≤ q ≤ 100
0 ≤ b < sizeof(所选结构体)

`sizeof` 最大为 32，输出最多约 50 行，远小于 64KB 的输出上限。

## 示例
### 示例 1
```in
1 4
0
1
4
31
```
```out
sizeof=32
align=8
member version 0 1
member seq 4 4
member length 8 2
member timestamp 16 8
member flags 24 1
pad 1 4
pad 10 16
pad 25 32
waste=16
at 0 version
at 1 pad
at 4 seq
at 31 pad
```
> `Packet` 的 `version` 在 0；`seq` 要 4 对齐，所以 `[1,4)` 是填充；`length` 紧跟在 8；`timestamp` 要 8 对齐，所以 `[10,16)` 是填充；`flags` 在 24；最后结构体要 8 对齐，`[25,32)` 是尾部填充。成员一共 16 字节，`sizeof` 是 32，所以 `waste=16`。

### 示例 2（边界：最小的结构体，每个字节都查一遍）
```in
4 4
0
1
2
3
```
```out
sizeof=4
align=2
member code 0 2
member tag 2 1
pad 3 4
waste=1
at 0 code
at 1 code
at 2 tag
at 3 pad
```
> `Tiny` 只有 4 字节：`code` 占 `[0,2)`，`tag` 占 `[2,3)`，`[3,4)` 是为了让整个结构体满足 2 字节对齐而补的尾部填充。注意 `Tiny` 的两个成员之间没有填充，但尾部有 1 字节。

## 提示
### 第 1 层
先不要写代码，拿"示例 1"的 `Packet` 在纸上画 32 个格子，把每个成员标进去，再把空着的格子标成 `pad`。画完再去看输入的查询落在哪个格子里。

### 第 2 层
每个成员的偏移直接用 `offsetof(struct Packet, version)` 这样的表达式取，成员大小用 `sizeof(((struct Packet *)0)->version)` 或 `sizeof` 整个成员取；把每个结构体的成员名、偏移、大小放进一个表里，再写一个通用的报告函数，四个结构体共用。填充区间可以扫一遍成员表：如果当前成员的偏移大于"上一个成员结束的位置"，中间就是填充；最后再把 `sizeof` 和最后一个成员结束位置之间的部分补上。

### 第 3 层
`at` 查询要按"成员区间 `[偏移, 偏移+大小)`"判断，注意是左闭右开：`b == 偏移+大小` 已经属于下一个成员或填充。填充区间的输出顺序必须按起点递增；尾部填充不要漏，`waste` 也不是"最后一个成员之后的空间"，而是 `sizeof - 所有成员大小之和`。四个结构体里 `Student` 的 `grade` 后面有填充、`Config` 的 `key` 后面也有填充，别只想着 `Packet`。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <stddef.h>
#include <stdint.h>

struct Packet {
    uint8_t version;
    uint32_t seq;
    uint16_t length;
    uint64_t timestamp;
    uint8_t flags;
};

struct Config {
    char key[10];
    double value;
    int enabled;
    short port;
};

struct Student {
    char id[9];
    char grade;
    int score;
    double gpa;
};

struct Tiny {
    short code;
    char tag;
};

typedef struct {
    const char *name;
    size_t off;
    size_t size;
} Field;

static const Field packet_fields[] = {
    { "version", offsetof(struct Packet, version), sizeof(((struct Packet *)0)->version) },
    { "seq", offsetof(struct Packet, seq), sizeof(((struct Packet *)0)->seq) },
    { "length", offsetof(struct Packet, length), sizeof(((struct Packet *)0)->length) },
    { "timestamp", offsetof(struct Packet, timestamp), sizeof(((struct Packet *)0)->timestamp) },
    { "flags", offsetof(struct Packet, flags), sizeof(((struct Packet *)0)->flags) },
};

static const Field config_fields[] = {
    { "key", offsetof(struct Config, key), sizeof(((struct Config *)0)->key) },
    { "value", offsetof(struct Config, value), sizeof(((struct Config *)0)->value) },
    { "enabled", offsetof(struct Config, enabled), sizeof(((struct Config *)0)->enabled) },
    { "port", offsetof(struct Config, port), sizeof(((struct Config *)0)->port) },
};

static const Field student_fields[] = {
    { "id", offsetof(struct Student, id), sizeof(((struct Student *)0)->id) },
    { "grade", offsetof(struct Student, grade), sizeof(((struct Student *)0)->grade) },
    { "score", offsetof(struct Student, score), sizeof(((struct Student *)0)->score) },
    { "gpa", offsetof(struct Student, gpa), sizeof(((struct Student *)0)->gpa) },
};

static const Field tiny_fields[] = {
    { "code", offsetof(struct Tiny, code), sizeof(((struct Tiny *)0)->code) },
    { "tag", offsetof(struct Tiny, tag), sizeof(((struct Tiny *)0)->tag) },
};

#define FIELD_COUNT(a) ((int)(sizeof(a) / sizeof((a)[0])))

static void report(const Field *fields, int n, size_t size, size_t align,
                   const int *queries, int q) {
    size_t used = 0;

    printf("sizeof=%zu\n", size);
    printf("align=%zu\n", align);

    for (int i = 0; i < n; i++) {
        printf("member %s %zu %zu\n", fields[i].name, fields[i].off, fields[i].size);
        used += fields[i].size;
    }

    size_t end = 0;
    for (int i = 0; i < n; i++) {
        if (fields[i].off > end) {
            printf("pad %zu %zu\n", end, fields[i].off);
        }
        end = fields[i].off + fields[i].size;
    }
    if (size > end) {
        printf("pad %zu %zu\n", end, size);
    }

    printf("waste=%zu\n", size - used);

    for (int k = 0; k < q; k++) {
        size_t b = (size_t)queries[k];
        const char *hit = "pad";
        for (int i = 0; i < n; i++) {
            if (b >= fields[i].off && b < fields[i].off + fields[i].size) {
                hit = fields[i].name;
                break;
            }
        }
        printf("at %d %s\n", queries[k], hit);
    }
}

int main(void) {
    int sid, q;
    if (scanf("%d %d", &sid, &q) != 2 || q < 1 || q > 100) {
        return 0;
    }

    int queries[100];
    for (int i = 0; i < q; i++) {
        if (scanf("%d", &queries[i]) != 1) {
            return 0;
        }
    }

    switch (sid) {
    case 1:
        report(packet_fields, FIELD_COUNT(packet_fields),
               sizeof(struct Packet), _Alignof(struct Packet), queries, q);
        break;
    case 2:
        report(config_fields, FIELD_COUNT(config_fields),
               sizeof(struct Config), _Alignof(struct Config), queries, q);
        break;
    case 3:
        report(student_fields, FIELD_COUNT(student_fields),
               sizeof(struct Student), _Alignof(struct Student), queries, q);
        break;
    case 4:
        report(tiny_fields, FIELD_COUNT(tiny_fields),
               sizeof(struct Tiny), _Alignof(struct Tiny), queries, q);
        break;
    default:
        break;
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <stdint.h>

struct Packet {
    uint8_t version;
    uint32_t seq;
    uint16_t length;
    uint64_t timestamp;
    uint8_t flags;
};

struct Config {
    char key[10];
    double value;
    int enabled;
    short port;
};

struct Student {
    char id[9];
    char grade;
    int score;
    double gpa;
};

struct Tiny {
    short code;
    char tag;
};

typedef struct {
    const char *name;
    int size;
} Field;

static const Field packet_fields[] = {
    { "version", 1 }, { "seq", 4 }, { "length", 2 }, { "timestamp", 8 }, { "flags", 1 },
};

static const Field config_fields[] = {
    { "key", 10 }, { "value", 8 }, { "enabled", 4 }, { "port", 2 },
};

static const Field student_fields[] = {
    { "id", 9 }, { "grade", 1 }, { "score", 4 }, { "gpa", 8 },
};

static const Field tiny_fields[] = {
    { "code", 2 }, { "tag", 1 },
};

#define FIELD_COUNT(a) ((int)(sizeof(a) / sizeof((a)[0])))

static void report(const Field *fields, int n, int size, int align,
                   const int *queries, int q) {
    int off = 0;
    int used = 0;

    printf("sizeof=%d\n", size);
    printf("align=%d\n", align);

    for (int i = 0; i < n; i++) {
        printf("member %s %d %d\n", fields[i].name, off, fields[i].size);
        off += fields[i].size;      /* TODO: 成员之间要按对齐插入填充 */
        used += fields[i].size;
    }

    printf("waste=%d\n", size - used);   /* TODO: 填充区间还没输出 */

    for (int k = 0; k < q; k++) {
        int b = queries[k];
        int pos = 0;
        const char *hit = "pad";
        for (int i = 0; i < n; i++) {
            if (b >= pos && b < pos + fields[i].size) {
                hit = fields[i].name;
                break;
            }
            pos += fields[i].size;      /* TODO: 这里也要用真实的偏移 */
        }
        printf("at %d %s\n", b, hit);
    }
}

int main(void) {
    int sid, q;
    if (scanf("%d %d", &sid, &q) != 2 || q < 1 || q > 100) {
        return 0;
    }

    int queries[100];
    for (int i = 0; i < q; i++) {
        if (scanf("%d", &queries[i]) != 1) {
            return 0;
        }
    }

    switch (sid) {
    case 1:
        report(packet_fields, FIELD_COUNT(packet_fields),
               (int)sizeof(struct Packet), (int)_Alignof(struct Packet), queries, q);
        break;
    case 2:
        report(config_fields, FIELD_COUNT(config_fields),
               (int)sizeof(struct Config), (int)_Alignof(struct Config), queries, q);
        break;
    case 3:
        report(student_fields, FIELD_COUNT(student_fields),
               (int)sizeof(struct Student), (int)_Alignof(struct Student), queries, q);
        break;
    case 4:
        report(tiny_fields, FIELD_COUNT(tiny_fields),
               (int)sizeof(struct Tiny), (int)_Alignof(struct Tiny), queries, q);
        break;
    default:
        break;
    }
    return 0;
}
```

## 复杂度
时间 O(q + 成员数)：成员数最多 5，`q ≤ 100`，每个查询扫一遍成员表即可。
空间 O(1)：只存四个成员的偏移表和一个长度 100 的查询数组。

本题的重点不是算法，而是**理解"成员偏移 = 用对齐规则算出来的位置"**：你必须让 `offsetof` 决定偏移，而不是自己按成员大小累加。四个结构体里填充的位置各不相同，只有真正按规则算（或直接问编译器）才能全对。

## 常见错误
### 按成员大小依次累加偏移 [WA]
`offset` 不是"前一个成员偏移 + 前一个成员大小"：`Packet` 的 `seq` 前面有 3 字节填充，`Config` 的 `value` 前面有 6 字节填充。手算累加会让后面所有成员和 `at` 查询整体错位，`pad` 区间也会变成空的或错位。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdint.h>

struct Packet {
    uint8_t version;
    uint32_t seq;
    uint16_t length;
    uint64_t timestamp;
    uint8_t flags;
};

struct Config {
    char key[10];
    double value;
    int enabled;
    short port;
};

struct Student {
    char id[9];
    char grade;
    int score;
    double gpa;
};

struct Tiny {
    short code;
    char tag;
};

typedef struct {
    const char *name;
    int size;
} Field;

static const Field packet_fields[] = {
    { "version", 1 }, { "seq", 4 }, { "length", 2 }, { "timestamp", 8 }, { "flags", 1 },
};
static const Field config_fields[] = {
    { "key", 10 }, { "value", 8 }, { "enabled", 4 }, { "port", 2 },
};
static const Field student_fields[] = {
    { "id", 9 }, { "grade", 1 }, { "score", 4 }, { "gpa", 8 },
};
static const Field tiny_fields[] = {
    { "code", 2 }, { "tag", 1 },
};

static void report(const Field *f, int n, int size, int align, const int *queries, int q) {
    int off = 0;
    int used = 0;

    printf("sizeof=%d\n", size);
    printf("align=%d\n", align);
    for (int i = 0; i < n; i++) {
        printf("member %s %d %d\n", f[i].name, off, f[i].size);
        off += f[i].size;          /* 错：没有按对齐插入填充 */
        used += f[i].size;
    }
    printf("waste=%d\n", size - used);

    for (int k = 0; k < q; k++) {
        int b = queries[k];
        int pos = 0;
        const char *hit = "pad";
        for (int i = 0; i < n; i++) {
            if (b >= pos && b < pos + f[i].size) {
                hit = f[i].name;
                break;
            }
            pos += f[i].size;
        }
        printf("at %d %s\n", b, hit);
    }
}

int main(void) {
    int sid, q;
    if (scanf("%d %d", &sid, &q) != 2 || q < 1 || q > 100) {
        return 0;
    }
    int queries[100];
    for (int i = 0; i < q; i++) {
        if (scanf("%d", &queries[i]) != 1) {
            return 0;
        }
    }
    switch (sid) {
    case 1:
        report(packet_fields, 5, (int)sizeof(struct Packet), (int)_Alignof(struct Packet), queries, q);
        break;
    case 2:
        report(config_fields, 4, (int)sizeof(struct Config), (int)_Alignof(struct Config), queries, q);
        break;
    case 3:
        report(student_fields, 4, (int)sizeof(struct Student), (int)_Alignof(struct Student), queries, q);
        break;
    case 4:
        report(tiny_fields, 2, (int)sizeof(struct Tiny), (int)_Alignof(struct Tiny), queries, q);
        break;
    default:
        break;
    }
    return 0;
}
```

### 把成员大小之和当成 sizeof [WA]
`Packet` 的成员加起来是 16，`sizeof` 是 32；`Config` 的成员加起来是 24，`sizeof` 是 32。填充不是"可有可无的浪费"，它属于结构体大小。输出 `sizeof` 时应当直接用 `sizeof(struct Packet)`，不要用循环累加。

### 只输出尾部的填充，漏掉成员之间的填充 [WA]
`Config` 的 `key`（0..9）和 `value`（16..23）之间有 6 字节填充；`Student` 的 `grade`（9）和 `score`（12..15）之间有 2 字节；`Packet` 有两段内部填充。只补最后一个成员到 `sizeof` 之间的尾部填充，会漏掉这些区间，`waste` 也会算错。

### 用 `int` / `%d` 打印 `sizeof` 和 `offsetof` [WA]
`sizeof`、`offsetof` 的类型是 `size_t`，必须用 `%zu`。用 `%d` 属于变参类型不匹配，是未定义行为；在 64 位平台上可能碰巧打印正确，但在别的平台或参数位置变化时会给出错误结果。`at` 的查询下标是 `int`，可以用 `%d`，但成员偏移和大小要用 `%zu`。

## 测试用例
### 01 sample 示例 1
```in
1 4
0
1
4
31
```
```out
sizeof=32
align=8
member version 0 1
member seq 4 4
member length 8 2
member timestamp 16 8
member flags 24 1
pad 1 4
pad 10 16
pad 25 32
waste=16
at 0 version
at 1 pad
at 4 seq
at 31 pad
```

### 02 sample 示例 2
```in
4 4
0
1
2
3
```
```out
sizeof=4
align=2
member code 0 2
member tag 2 1
pad 3 4
waste=1
at 0 code
at 1 code
at 2 tag
at 3 pad
```

### 03 boundary Packet 的首字节、填充尾字节与最后一个成员
```in
1 5
0
3
4
24
31
```
```out
sizeof=32
align=8
member version 0 1
member seq 4 4
member length 8 2
member timestamp 16 8
member flags 24 1
pad 1 4
pad 10 16
pad 25 32
waste=16
at 0 version
at 3 pad
at 4 seq
at 24 flags
at 31 pad
```

### 04 degenerate Tiny 的两个成员字节
```in
4 2
1
2
```
```out
sizeof=4
align=2
member code 0 2
member tag 2 1
pad 3 4
waste=1
at 1 code
at 2 tag
```

### 05 trap Config 的 key 末尾与尾部填充
```in
2 6
9
10
15
16
29
30
```
```out
sizeof=32
align=8
member key 0 10
member value 16 8
member enabled 24 4
member port 28 2
pad 10 16
pad 30 32
waste=8
at 9 key
at 10 pad
at 15 pad
at 16 value
at 29 port
at 30 pad
```

### 06 trap Student 的 grade 后面藏着 2 字节填充
```in
3 7
0
8
9
10
11
12
23
```
```out
sizeof=24
align=8
member id 0 9
member grade 9 1
member score 12 4
member gpa 16 8
pad 10 12
waste=2
at 0 id
at 8 id
at 9 grade
at 10 pad
at 11 pad
at 12 score
at 23 gpa
```

### 07 normal Packet 的填充区间逐个查询
```in
1 8
2
5
7
10
15
16
25
30
```
```out
sizeof=32
align=8
member version 0 1
member seq 4 4
member length 8 2
member timestamp 16 8
member flags 24 1
pad 1 4
pad 10 16
pad 25 32
waste=16
at 2 pad
at 5 seq
at 7 seq
at 10 pad
at 15 pad
at 16 timestamp
at 25 pad
at 30 pad
```

### 08 boundary Config 的首成员、尾成员与尾部填充
```in
2 7
0
9
10
15
24
28
31
```
```out
sizeof=32
align=8
member key 0 10
member value 16 8
member enabled 24 4
member port 28 2
pad 10 16
pad 30 32
waste=8
at 0 key
at 9 key
at 10 pad
at 15 pad
at 24 enabled
at 28 port
at 31 pad
```

### 09 normal Student 的 id 末尾与 score 起始
```in
3 8
1
8
9
12
15
16
20
22
```
```out
sizeof=24
align=8
member id 0 9
member grade 9 1
member score 12 4
member gpa 16 8
pad 10 12
waste=2
at 1 id
at 8 id
at 9 grade
at 12 score
at 15 score
at 16 gpa
at 20 gpa
at 22 gpa
```

### 10 normal Tiny 的最后两个字节
```in
4 2
2
3
```
```out
sizeof=4
align=2
member code 0 2
member tag 2 1
pad 3 4
waste=1
at 2 tag
at 3 pad
```

### 生成 boundary 四个结构体的逐字节查询
```js gen
const structs = [
  { id: 1, fields: [['version', 1, 1], ['seq', 4, 4], ['length', 2, 2], ['timestamp', 8, 8], ['flags', 1, 1]] },
  { id: 2, fields: [['key', 10, 1], ['value', 8, 8], ['enabled', 4, 4], ['port', 2, 2]] },
  { id: 3, fields: [['id', 9, 1], ['grade', 1, 1], ['score', 4, 4], ['gpa', 8, 8]] },
  { id: 4, fields: [['code', 2, 2], ['tag', 1, 1]] },
];

function layout(fields) {
  let used = 0;
  let align = 1;
  let sum = 0;
  const offs = [];
  for (const [name, size, a] of fields) {
    used = Math.ceil(used / a) * a;
    offs.push({ name, off: used, size });
    used += size;
    sum += size;
    if (a > align) align = a;
  }
  const size = Math.ceil(used / align) * align;
  return { offs, size, align, waste: size - sum };
}

function render(fields, queries) {
  const l = layout(fields);
  const out = ['sizeof=' + l.size, 'align=' + l.align];
  for (const f of l.offs) out.push('member ' + f.name + ' ' + f.off + ' ' + f.size);
  let end = 0;
  for (const f of l.offs) {
    if (f.off > end) out.push('pad ' + end + ' ' + f.off);
    end = f.off + f.size;
  }
  if (l.size > end) out.push('pad ' + end + ' ' + l.size);
  out.push('waste=' + l.waste);
  for (const b of queries) {
    let hit = 'pad';
    for (const f of l.offs) {
      if (b >= f.off && b < f.off + f.size) { hit = f.name; break; }
    }
    out.push('at ' + b + ' ' + hit);
  }
  return out.join('\n') + '\n';
}

const cases = [];
for (const s of structs) {
  const l = layout(s.fields);
  const queries = [];
  for (let i = 0; i < l.size; i++) queries.push(i);
  cases.push({
    kind: 'boundary',
    category: '结构体 ' + s.id + ' 的逐字节归属',
    input: s.id + ' ' + queries.length + '\n' + queries.join('\n') + '\n',
    output: render(s.fields, queries),
  });
}
return cases;
```
