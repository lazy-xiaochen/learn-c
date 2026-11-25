---json
{
  "id": "p-s7-iv-struct-align-1",
  "title": "内存快照解码：按结构体布局把十六进制字节还原成成员值",
  "difficulty": "L5",
  "knowledgePoints": ["s7-iv-struct-align"],
  "special": "memory-layout",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
面试官把一段结构体的内存快照（十六进制字节）贴给你，问："每个成员的值是多少？那些填充字节里是什么？" 要答出来，你必须先按对齐规则算出每个成员的偏移，再按小端序把字节拼回整数。

给定一个结构体的成员表，以及这段结构体内存的**逐字节十六进制快照**，请输出它的布局和解码结果。

### 类型表
本题只有四种无符号类型，**大小与对齐值相同**：

| 类型 | 大小 | 对齐 |
|---|---|---|
| `u8` | 1 | 1 |
| `u16` | 2 | 2 |
| `u32` | 4 | 4 |
| `u64` | 8 | 8 |

### 布局规则（和真实编译器一致）
1. 成员按**输入顺序**放置：先把"已占用字节数"`used` 向上取整到当前成员的对齐值，这个值就是成员的偏移，然后 `used += 成员大小`；
2. 结构体对齐值 = 所有成员对齐值的最大值；
3. 结构体总大小 = `used` 向上取整到结构体对齐值的倍数（差出来的是尾部填充）；
4. 填充字节里可能是**任意值**（快照里经常是垃圾数据），解码时必须跳过。

### 解码规则
每个成员占 `size` 个字节，按**小端序**解释成无符号整数：偏移最低的那个字节是**最低有效字节**。例如 `u32` 的字节依次是 `78 56 34 12`，值是 `0x12345678 = 305419896`。`u64` 的值可能超过 `2^31`，必须用 `unsigned long long` 和 `%llu` 输出。

## 输入格式
第一行一个整数 `n`：成员个数。

接下来 `n` 行，每行 `<类型> <成员名>`，类型是 `u8`、`u16`、`u32`、`u64` 之一，成员名由小写字母、数字、下划线组成，长度 1–15。

接下来一行一个整数 `len`：快照的字节数（保证等于上面算出的结构体大小）。

接下来一行 `len` 个十六进制字节，用空格分隔，每个是两位小写十六进制数（`00`–`ff`）。

## 输出格式
先输出布局：

```
size=<结构体大小>
align=<结构体对齐值>
offset <成员名> +<偏移> size=<成员大小>
...
pad=<填充字节总数>
```

- `offset` 行按**输入顺序**输出，每个成员一行，偏移前的 `+` 不能省略；
- `pad` 等于 `size` 减去所有成员大小之和。

然后按输入顺序输出每个成员的值：

```
<成员名>=<无符号十进制值>
```

## 数据范围
1 ≤ n ≤ 8
1 ≤ len ≤ 72（`len` 一定等于算出的结构体大小）
成员名长度 1–15，字符集为小写字母、数字、下划线
`u64` 成员的值可能达到 `2^64 − 1`，必须用 `unsigned long long` 保存和输出

输出最多 2 + 8 + 1 + 8 = 19 行，远小于 64KB。

## 示例
### 示例 1
```in
3
u8 flag
u32 id
u16 code
12
01 aa bb cc 78 56 34 12 34 12 00 00
```
```out
size=12
align=4
offset flag +0 size=1
offset id +4 size=4
offset code +8 size=2
pad=5
flag=1
id=305419896
code=4660
```
> `flag` 占偏移 0；`id` 要求 4 的倍数，所以从 4 开始占 4–7；`code` 对齐 2，从 8 开始占 8–9；总占用 10，向上取整到最大对齐值 4 得到 12。填充是 1–3（3 字节）和 10–11（2 字节），共 5 字节。快照里 `aa bb cc` 是填充垃圾，解码时必须跳过；`id` 的四个字节 `78 56 34 12` 按小端拼成 `0x12345678`。

### 示例 2（边界：只有一个成员，没有任何填充）
```in
1
u8 small
1
ff
```
```out
size=1
align=1
offset small +0 size=1
pad=0
small=255
```
> 一个 `u8` 成员，结构体大小就是 1，对齐值 1，没有填充，`pad=0`。`ff` 解码成 255。

## 提示
### 第 1 层
先把布局算出来，再谈解码：`used` 从 0 开始，每个成员先对齐到自己的 `size`（本题对齐值等于大小），记下偏移，再 `used += size`。最后别忘了把 `used` 向上取整到最大对齐值。

### 第 2 层
解码是"按字节拼"：偏移最低的字节是低位。`u32` 的四个字节 `b0 b1 b2 b3` 拼法是 `b3<<24 | b2<<16 | b1<<8 | b0`，循环写法是"从最高字节往最低字节，每次左移 8 位再或进新字节"。

### 第 3 层
用 `unsigned long long` 承接所有成员的值，输出统一用 `%llu`；`u64` 的最大值是 `18446744073709551615`，`int` 和 `%d` 会直接翻车。填充字节一个都不要读进结果，`pad` 用 `size - 成员大小之和` 得到，比手数填充区间更不容易错。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXN 8

typedef struct {
    char name[16];
    char type[8];
    int size;
    int align;
    int offset;
} Member;

static int type_size(const char *t) {
    if (strcmp(t, "u8") == 0) {
        return 1;
    }
    if (strcmp(t, "u16") == 0) {
        return 2;
    }
    if (strcmp(t, "u32") == 0) {
        return 4;
    }
    return 8;                  /* u64 */
}

static int align_up(int v, int a) {
    return (v + a - 1) / a * a;
}

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }

    Member m[MAXN];
    int used = 0;
    int max_align = 1;
    for (int i = 0; i < n; i++) {
        if (scanf("%7s %15s", m[i].type, m[i].name) != 2) {
            return 0;
        }
        m[i].size = type_size(m[i].type);
        m[i].align = m[i].size;             /* 本题约定对齐值等于大小 */
        used = align_up(used, m[i].align);  /* 先对齐，再放 */
        m[i].offset = used;
        used += m[i].size;
        if (m[i].align > max_align) {
            max_align = m[i].align;
        }
    }
    int total = align_up(used, max_align);  /* 尾部填充 */

    int len = 0;
    if (scanf("%d", &len) != 1 || len < 1 || len > 72 || len != total) {
        return 0;
    }
    unsigned char buf[72];
    for (int i = 0; i < len; i++) {
        unsigned int byte = 0;
        if (scanf("%x", &byte) != 1 || byte > 255) {
            return 0;
        }
        buf[i] = (unsigned char)byte;
    }

    printf("size=%d\n", total);
    printf("align=%d\n", max_align);
    int sum = 0;
    for (int i = 0; i < n; i++) {
        printf("offset %s +%d size=%d\n", m[i].name, m[i].offset, m[i].size);
        sum += m[i].size;
    }
    printf("pad=%d\n", total - sum);

    for (int i = 0; i < n; i++) {
        unsigned long long v = 0;
        for (int k = m[i].size - 1; k >= 0; k--) {   /* 小端：从高地址的字节开始拼 */
            v = (v << 8) | buf[m[i].offset + k];
        }
        printf("%s=%llu\n", m[i].name, v);
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXN 8

typedef struct {
    char name[16];
    char type[8];
    int size;
    int align;
    int offset;
} Member;

static int type_size(const char *t) {
    if (strcmp(t, "u8") == 0) {
        return 1;
    }
    if (strcmp(t, "u16") == 0) {
        return 2;
    }
    if (strcmp(t, "u32") == 0) {
        return 4;
    }
    return 8;
}

static int align_up(int v, int a) {
    return (v + a - 1) / a * a;
}

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }

    Member m[MAXN];
    int used = 0;
    int max_align = 1;
    for (int i = 0; i < n; i++) {
        if (scanf("%7s %15s", m[i].type, m[i].name) != 2) {
            return 0;
        }
        m[i].size = type_size(m[i].type);
        m[i].align = m[i].size;
        m[i].offset = used;                 /* TODO: 先按 align 把 used 向上取整 */
        used += m[i].size;
        if (m[i].align > max_align) {
            max_align = m[i].align;
        }
    }
    int total = used;                       /* TODO: 尾部还要取整到 max_align 的倍数 */

    int len = 0;
    if (scanf("%d", &len) != 1 || len < 1 || len > 72) {
        return 0;
    }
    unsigned char buf[72];
    for (int i = 0; i < len; i++) {
        unsigned int byte = 0;
        if (scanf("%x", &byte) != 1 || byte > 255) {
            return 0;
        }
        buf[i] = (unsigned char)byte;
    }

    printf("size=%d\n", total);
    printf("align=%d\n", max_align);
    int sum = 0;
    for (int i = 0; i < n; i++) {
        printf("offset %s +%d size=%d\n", m[i].name, m[i].offset, m[i].size);
        sum += m[i].size;
    }
    printf("pad=%d\n", total - sum);

    for (int i = 0; i < n; i++) {
        unsigned long long v = 0;
        for (int k = 0; k < m[i].size; k++) {   /* TODO: 小端序应该从高地址往低地址拼 */
            v = (v << 8) | buf[m[i].offset + k];
        }
        printf("%s=%llu\n", m[i].name, v);
    }
    return 0;
}
```

## 复杂度
时间 O(n + len)：算布局扫一遍成员，读快照扫一遍字节，解码再扫一遍成员（每个成员最多 8 字节）。
空间 O(n + len)：成员表和快照缓冲区都是定长数组。

## 常见错误
### 放成员时忘记对齐 [WA]
`u8` 后面接 `u32`，`u32` 必须从 4 的倍数开始，中间补 3 字节。忘记对齐会让后面所有成员的偏移整体前移，`size`、`pad` 和每个成员的解码结果全错。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXN 8

typedef struct {
    char name[16];
    char type[8];
    int size;
    int align;
    int offset;
} Member;

static int type_size(const char *t) {
    if (strcmp(t, "u8") == 0) {
        return 1;
    }
    if (strcmp(t, "u16") == 0) {
        return 2;
    }
    if (strcmp(t, "u32") == 0) {
        return 4;
    }
    return 8;
}

static int align_up(int v, int a) {
    return (v + a - 1) / a * a;
}

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    Member m[MAXN];
    int used = 0;
    int max_align = 1;
    for (int i = 0; i < n; i++) {
        if (scanf("%7s %15s", m[i].type, m[i].name) != 2) {
            return 0;
        }
        m[i].size = type_size(m[i].type);
        m[i].align = m[i].size;
        m[i].offset = used;                /* 错：没有先对齐 */
        used += m[i].size;
        if (m[i].align > max_align) {
            max_align = m[i].align;
        }
    }
    int total = align_up(used, max_align);

    int len = 0;
    if (scanf("%d", &len) != 1) {
        return 0;
    }
    unsigned char buf[72];
    for (int i = 0; i < len; i++) {
        unsigned int byte = 0;
        if (scanf("%x", &byte) != 1) {
            return 0;
        }
        buf[i] = (unsigned char)byte;
    }

    printf("size=%d\n", total);
    printf("align=%d\n", max_align);
    int sum = 0;
    for (int i = 0; i < n; i++) {
        printf("offset %s +%d size=%d\n", m[i].name, m[i].offset, m[i].size);
        sum += m[i].size;
    }
    printf("pad=%d\n", total - sum);

    for (int i = 0; i < n; i++) {
        unsigned long long v = 0;
        for (int k = m[i].size - 1; k >= 0; k--) {
            v = (v << 8) | buf[m[i].offset + k];
        }
        printf("%s=%llu\n", m[i].name, v);
    }
    return 0;
}
```

### 按大端序解码 [WA]
小端序的规则是"低地址存放低位字节"。`78 56 34 12` 是 `0x12345678`，不是 `0x78563412`。按大端拼出来的值看起来也很"正常"，但和正确答案相差一个字节序，而且每个成员都错。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXN 8

typedef struct {
    char name[16];
    char type[8];
    int size;
    int align;
    int offset;
} Member;

static int type_size(const char *t) {
    if (strcmp(t, "u8") == 0) {
        return 1;
    }
    if (strcmp(t, "u16") == 0) {
        return 2;
    }
    if (strcmp(t, "u32") == 0) {
        return 4;
    }
    return 8;
}

static int align_up(int v, int a) {
    return (v + a - 1) / a * a;
}

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    Member m[MAXN];
    int used = 0;
    int max_align = 1;
    for (int i = 0; i < n; i++) {
        if (scanf("%7s %15s", m[i].type, m[i].name) != 2) {
            return 0;
        }
        m[i].size = type_size(m[i].type);
        m[i].align = m[i].size;
        used = align_up(used, m[i].align);
        m[i].offset = used;
        used += m[i].size;
        if (m[i].align > max_align) {
            max_align = m[i].align;
        }
    }
    int total = align_up(used, max_align);

    int len = 0;
    if (scanf("%d", &len) != 1) {
        return 0;
    }
    unsigned char buf[72];
    for (int i = 0; i < len; i++) {
        unsigned int byte = 0;
        if (scanf("%x", &byte) != 1) {
            return 0;
        }
        buf[i] = (unsigned char)byte;
    }

    printf("size=%d\n", total);
    printf("align=%d\n", max_align);
    int sum = 0;
    for (int i = 0; i < n; i++) {
        printf("offset %s +%d size=%d\n", m[i].name, m[i].offset, m[i].size);
        sum += m[i].size;
    }
    printf("pad=%d\n", total - sum);

    for (int i = 0; i < n; i++) {
        unsigned long long v = 0;
        for (int k = 0; k < m[i].size; k++) {   /* 错：这是大端序 */
            v = (v << 8) | buf[m[i].offset + k];
        }
        printf("%s=%llu\n", m[i].name, v);
    }
    return 0;
}
```

### 用 int / unsigned int 承接 u64 [WA]
`u64` 的最大值是 `18446744073709551615`，`int` 装不下，`%d` 还会把高位直接截掉。本题所有值都应该用 `unsigned long long` 承接、`%llu` 输出；这不是"小心一点"的问题，而是类型宽度必须够。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXN 8

typedef struct {
    char name[16];
    char type[8];
    int size;
    int align;
    int offset;
} Member;

static int type_size(const char *t) {
    if (strcmp(t, "u8") == 0) {
        return 1;
    }
    if (strcmp(t, "u16") == 0) {
        return 2;
    }
    if (strcmp(t, "u32") == 0) {
        return 4;
    }
    return 8;
}

static int align_up(int v, int a) {
    return (v + a - 1) / a * a;
}

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    Member m[MAXN];
    int used = 0;
    int max_align = 1;
    for (int i = 0; i < n; i++) {
        if (scanf("%7s %15s", m[i].type, m[i].name) != 2) {
            return 0;
        }
        m[i].size = type_size(m[i].type);
        m[i].align = m[i].size;
        used = align_up(used, m[i].align);
        m[i].offset = used;
        used += m[i].size;
        if (m[i].align > max_align) {
            max_align = m[i].align;
        }
    }
    int total = align_up(used, max_align);

    int len = 0;
    if (scanf("%d", &len) != 1) {
        return 0;
    }
    unsigned char buf[72];
    for (int i = 0; i < len; i++) {
        unsigned int byte = 0;
        if (scanf("%x", &byte) != 1) {
            return 0;
        }
        buf[i] = (unsigned char)byte;
    }

    printf("size=%d\n", total);
    printf("align=%d\n", max_align);
    int sum = 0;
    for (int i = 0; i < n; i++) {
        printf("offset %s +%d size=%d\n", m[i].name, m[i].offset, m[i].size);
        sum += m[i].size;
    }
    printf("pad=%d\n", total - sum);

    for (int i = 0; i < n; i++) {
        unsigned int v = 0;                    /* 错：u64 装不下 */
        for (int k = m[i].size - 1; k >= 0; k--) {
            v = (v << 8) | buf[m[i].offset + k];
        }
        printf("%s=%u\n", m[i].name, v);
    }
    return 0;
}
```

### 把填充字节也当成成员数据 [WA]
填充字节里是垃圾（示例里就是 `aa bb cc`），它们不属于任何成员。如果按"成员大小累加"去定位而不是用算出来的偏移，或者解码时多读了字节，值就会混进垃圾。正确做法是只信 `offset` 和 `size`。

### 用 sizeof 减去"最后一个成员的结束位置"来算 pad [WA]
最后一个成员的结束位置不一定等于结构体大小，两者之间的尾部填充也要算进 `pad`。本题的 `pad` 建议直接用 `size − 所有成员大小之和`，一步得到成员间填充与尾部填充的总和，避免漏算。

## 测试用例
### 01 sample 示例 1
```in
3
u8 flag
u32 id
u16 code
12
01 aa bb cc 78 56 34 12 34 12 00 00
```
```out
size=12
align=4
offset flag +0 size=1
offset id +4 size=4
offset code +8 size=2
pad=5
flag=1
id=305419896
code=4660
```

### 02 sample 示例 2
```in
1
u8 small
1
ff
```
```out
size=1
align=1
offset small +0 size=1
pad=0
small=255
```

### 03 boundary 8 个 u64 成员，64 字节无填充
```in
8
u64 a
u64 b
u64 c
u64 d
u64 e
u64 f
u64 g
u64 h
64
00 00 00 00 00 00 00 00 01 00 00 00 00 00 00 00 ff 00 00 00 00 00 00 00 00 01 00 00 00 00 00 00 00 00 00 00 01 00 00 00 ff ff ff ff ff ff ff ff 08 07 06 05 04 03 02 01 00 00 00 00 00 00 00 80
```
```out
size=64
align=8
offset a +0 size=8
offset b +8 size=8
offset c +16 size=8
offset d +24 size=8
offset e +32 size=8
offset f +40 size=8
offset g +48 size=8
offset h +56 size=8
pad=0
a=0
b=1
c=255
d=256
e=4294967296
f=18446744073709551615
g=72623859790382856
h=9223372036854775808
```

### 04 degenerate 单个 u64 取最大值
```in
1
u64 max
8
ff ff ff ff ff ff ff ff
```
```out
size=8
align=8
offset max +0 size=8
pad=0
max=18446744073709551615
```

### 05 trap 填充字节全是垃圾值
```in
3
u8 c1
u32 v
u8 c2
12
7f de ad be 00 00 00 80 2a 11 22 33
```
```out
size=12
align=4
offset c1 +0 size=1
offset v +4 size=4
offset c2 +8 size=1
pad=6
c1=127
v=2147483648
c2=42
```

### 06 trap 小端序不能反着读
```in
2
u32 little
u16 half
8
01 00 00 00 34 12 aa bb
```
```out
size=8
align=4
offset little +0 size=4
offset half +4 size=2
pad=2
little=1
half=4660
```

### 07 normal 三种类型混合，内部与尾部都有填充
```in
5
u8 a
u16 b
u8 c
u32 d
u8 e
16
05 99 34 12 07 11 22 33 ef cd ab 89 0a 44 55 66
```
```out
size=16
align=4
offset a +0 size=1
offset b +2 size=2
offset c +4 size=1
offset d +8 size=4
offset e +12 size=1
pad=7
a=5
b=4660
c=7
d=2309737967
e=10
```
