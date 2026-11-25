---json
{
  "id": "p-s7-iv-struct-align-2",
  "title": "结构体数组的字节足迹：AoS 与 SoA 的对比和跨元素定位",
  "difficulty": "L5",
  "knowledgePoints": ["s7-iv-struct-align"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
面试官问："这个结构体 `sizeof` 是 24，但成员加起来只有 17，那 100 万条记录要多少内存？如果改成每个字段一个数组（结构体数组 vs 数组的结构体）又能省多少？" 这道题就是把这两个数算出来，并且验证"跨记录定位"用的是 `sizeof` 而不是成员大小之和。

给定一个结构体的成员表和记录条数 `N`，请输出：

1. **布局**：结构体大小（也就是数组元素之间的步长 stride）、对齐值、填充字节总数；
2. **两种组织方式的总字节数**：
   - **AoS**（array of structs，结构体数组）：`N × sizeof`；
   - **SoA**（struct of arrays，每个字段一个数组）：`N × 成员大小之和`；
   - 两者之差就是被填充"浪费"的字节数；
3. **跨记录定位**：对每次查询 `(i, j)`，输出第 `i` 条记录（从 0 开始）第 `j` 个成员（按输入顺序，从 0 开始）的**字节偏移**，即 `i × stride + 该成员的偏移`。

### 类型表与布局规则
类型只有 `u8`、`u16`、`u32`、`u64` 四种，**大小与对齐值相同**（1、2、4、8）。

1. 成员按输入顺序放置：先把已占用字节数 `used` 向上取整到成员对齐值，得到该成员的偏移，然后 `used += 成员大小`；
2. 结构体对齐值 = 所有成员对齐值的最大值；
3. `sizeof` = `used` 向上取整到结构体对齐值的倍数（差出来的是尾部填充）；
4. `N` 最大到 `10⁹`，`sizeof` 最多 72，乘积最大约 `7.2 × 10¹⁰`，**必须用 `long long`**，`int` 会溢出。

## 输入格式
第一行一个整数 `n`：成员个数。

接下来 `n` 行，每行 `<类型> <成员名>`，类型是 `u8`、`u16`、`u32`、`u64` 之一，成员名由小写字母、数字、下划线组成，长度 1–15。

接下来两行：
- 一个整数 `N`：记录条数（1 ≤ N ≤ 10⁹）；
- 一个整数 `q`：查询个数。

接下来 `q` 行，每行两个整数 `i` 和 `j`：第 `i` 条记录（0 ≤ i < N）、第 `j` 个成员（0 ≤ j < n）。

## 输出格式
先输出六行：

```
stride=<sizeof，也就是数组元素之间的步长>
align=<结构体对齐值>
pad=<填充字节总数 = sizeof − 成员大小之和>
aos=<N × sizeof>
soa=<N × 成员大小之和>
saved=<aos − soa>
```

然后按输入顺序为每个成员输出一行：

```
offset <成员名> +<偏移> size=<成员大小>
```

最后对每个查询输出一行：

```
q <i> <j> -> <字节偏移>
```

## 数据范围
1 ≤ n ≤ 8
1 ≤ N ≤ 1,000,000,000
1 ≤ q ≤ 100
`stride ≤ 72`，`aos`、`soa`、`saved` 和查询结果都最大约 `7.2 × 10¹⁰`，超出 `int` 范围

输出最多 6 + 8 + 100 = 114 行，远小于 64KB。

## 示例
### 示例 1
```in
3
u32 id
u8 grade
u64 score
4
5
0 0
1 1
2 2
3 0
3 2
```
```out
stride=16
align=8
pad=3
aos=64
soa=52
saved=12
offset id +0 size=4
offset grade +4 size=1
offset score +8 size=8
q 0 0 -> 0
q 1 1 -> 20
q 2 2 -> 40
q 3 0 -> 48
q 3 2 -> 56
```
> `id` 占 0–3，`grade` 占 4，`score` 要求 8 的倍数，所以从 8 开始占 8–15，中间 5–7 是 3 字节填充；`sizeof` 16、对齐 8。4 条记录按 AoS 要 4 × 16 = 64 字节，按 SoA 只要 4 × 13 = 52 字节，差 12 字节。第 3 条记录（i=3）从字节 48 开始，所以它的 `score` 在 48 + 8 = 56。

### 示例 2（边界：只有一条记录、只有一个成员）
```in
1
u8 flag
1
1
0 0
```
```out
stride=1
align=1
pad=0
aos=1
soa=1
saved=0
offset flag +0 size=1
q 0 0 -> 0
```
> 单个 `u8` 成员：大小 1、对齐 1、没有填充。`N = 1` 时 AoS 和 SoA 都是 1 字节，`saved` 为 0。

## 提示
### 第 1 层
先按结构体对齐规则把 `stride`、`align`、每个成员的偏移算出来，这一步和普通的结构体 `sizeof` 题完全一样；后面所有数字都由这几个量推出来，别再重新数填充。

### 第 2 层
AoS 的总字节数是 `N × stride`，SoA 是 `N × (成员大小之和)`。注意 SoA 里每个字段数组的元素个数也是 `N`，元素大小就是字段大小，所以直接乘即可。`saved` 就是 `N × pad`，可以用两种算法互相验算。

### 第 3 层
跨记录定位的公式是 `i × stride + offset(j)`，**步长必须是 `sizeof`**，不是成员大小之和——记录之间隔着填充，第 1 条记录的起点已经是第 16 个字节而不是第 13 个。所有乘法用 `long long`，输出用 `%lld`。

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
    int sum = 0;                        /* 成员大小之和 = SoA 每条的字节数 */
    for (int i = 0; i < n; i++) {
        if (scanf("%7s %15s", m[i].type, m[i].name) != 2) {
            return 0;
        }
        m[i].size = type_size(m[i].type);
        m[i].align = m[i].size;
        used = align_up(used, m[i].align);
        m[i].offset = used;
        used += m[i].size;
        sum += m[i].size;
        if (m[i].align > max_align) {
            max_align = m[i].align;
        }
    }
    int stride = align_up(used, max_align);   /* sizeof：数组元素之间的步长 */

    long long records = 0;
    if (scanf("%lld", &records) != 1 || records < 1 || records > 1000000000LL) {
        return 0;
    }
    int q = 0;
    if (scanf("%d", &q) != 1 || q < 1 || q > 100) {
        return 0;
    }

    printf("stride=%d\n", stride);
    printf("align=%d\n", max_align);
    printf("pad=%d\n", stride - sum);
    printf("aos=%lld\n", records * stride);
    printf("soa=%lld\n", records * sum);
    printf("saved=%lld\n", records * (stride - sum));
    for (int i = 0; i < n; i++) {
        printf("offset %s +%d size=%d\n", m[i].name, m[i].offset, m[i].size);
    }

    for (int t = 0; t < q; t++) {
        long long i = 0;
        int j = 0;
        if (scanf("%lld %d", &i, &j) != 2 || i < 0 || i >= records || j < 0 || j >= n) {
            return 0;
        }
        printf("q %lld %d -> %lld\n", i, j, i * stride + m[j].offset);
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
    int sum = 0;
    for (int i = 0; i < n; i++) {
        if (scanf("%7s %15s", m[i].type, m[i].name) != 2) {
            return 0;
        }
        m[i].size = type_size(m[i].type);
        m[i].align = m[i].size;
        used = align_up(used, m[i].align);
        m[i].offset = used;
        used += m[i].size;
        sum += m[i].size;
        if (m[i].align > max_align) {
            max_align = m[i].align;
        }
    }
    int stride = used;                 /* TODO: 尾部还要取整到 max_align 的倍数 */

    long long records = 0;
    if (scanf("%lld", &records) != 1 || records < 1) {
        return 0;
    }
    int q = 0;
    if (scanf("%d", &q) != 1 || q < 1 || q > 100) {
        return 0;
    }

    printf("stride=%d\n", stride);
    printf("align=%d\n", max_align);
    printf("pad=%d\n", stride - sum);
    printf("aos=%lld\n", records * stride);
    printf("soa=%lld\n", records * sum);
    printf("saved=%lld\n", records * (stride - sum));
    for (int i = 0; i < n; i++) {
        printf("offset %s +%d size=%d\n", m[i].name, m[i].offset, m[i].size);
    }

    for (int t = 0; t < q; t++) {
        long long i = 0;
        int j = 0;
        if (scanf("%lld %d", &i, &j) != 2) {
            return 0;
        }
        /* TODO: 记录之间隔着填充，步长应该是 stride */
        printf("q %lld %d -> %lld\n", i, j, i * sum + m[j].offset);
    }
    return 0;
}
```

## 复杂度
时间 O(n + q)：算一次布局，之后每个查询 O(1)。
空间 O(n)：只需成员表。

优化方向：本题是常数级计算，没有优化空间；真正要记住的是"数组的步长是 `sizeof`，不是成员大小之和"。

## 常见错误
### 跨记录定位用成员大小之和当步长 [WA]
结构体数组里第 `i` 条记录的起点是 `i × sizeof`，不是 `i × (成员大小之和)`。示例里 `sizeof` 是 16、成员和是 13，第 1 条记录就已经差了 3 字节，越往后偏得越多。

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
    int sum = 0;
    for (int i = 0; i < n; i++) {
        if (scanf("%7s %15s", m[i].type, m[i].name) != 2) {
            return 0;
        }
        m[i].size = type_size(m[i].type);
        m[i].align = m[i].size;
        used = align_up(used, m[i].align);
        m[i].offset = used;
        used += m[i].size;
        sum += m[i].size;
        if (m[i].align > max_align) {
            max_align = m[i].align;
        }
    }
    int stride = align_up(used, max_align);

    long long records = 0;
    if (scanf("%lld", &records) != 1) {
        return 0;
    }
    int q = 0;
    if (scanf("%d", &q) != 1) {
        return 0;
    }

    printf("stride=%d\n", stride);
    printf("align=%d\n", max_align);
    printf("pad=%d\n", stride - sum);
    printf("aos=%lld\n", records * stride);
    printf("soa=%lld\n", records * sum);
    printf("saved=%lld\n", records * (stride - sum));
    for (int i = 0; i < n; i++) {
        printf("offset %s +%d size=%d\n", m[i].name, m[i].offset, m[i].size);
    }
    for (int t = 0; t < q; t++) {
        long long i = 0;
        int j = 0;
        if (scanf("%lld %d", &i, &j) != 2) {
            return 0;
        }
        printf("q %lld %d -> %lld\n", i, j, i * sum + m[j].offset);   /* 错：步长不是 sum */
    }
    return 0;
}
```

### 用 int 存总字节数 [WA]
`N × sizeof` 最大可以到 `10⁹ × 72 = 7.2 × 10¹⁰`，`int` 装不下。用 `unsigned int` 承接再打印，会把高位截掉，算出来的是一个"小得离谱"的数。

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
    int sum = 0;
    for (int i = 0; i < n; i++) {
        if (scanf("%7s %15s", m[i].type, m[i].name) != 2) {
            return 0;
        }
        m[i].size = type_size(m[i].type);
        m[i].align = m[i].size;
        used = align_up(used, m[i].align);
        m[i].offset = used;
        used += m[i].size;
        sum += m[i].size;
        if (m[i].align > max_align) {
            max_align = m[i].align;
        }
    }
    int stride = align_up(used, max_align);

    long long records = 0;
    if (scanf("%lld", &records) != 1) {
        return 0;
    }
    int q = 0;
    if (scanf("%d", &q) != 1) {
        return 0;
    }

    unsigned int aos = (unsigned int)(records * stride);   /* 错：截断了高位 */
    unsigned int soa = (unsigned int)(records * sum);
    printf("stride=%d\n", stride);
    printf("align=%d\n", max_align);
    printf("pad=%d\n", stride - sum);
    printf("aos=%u\n", aos);
    printf("soa=%u\n", soa);
    printf("saved=%u\n", aos - soa);
    for (int i = 0; i < n; i++) {
        printf("offset %s +%d size=%d\n", m[i].name, m[i].offset, m[i].size);
    }
    for (int t = 0; t < q; t++) {
        long long i = 0;
        int j = 0;
        if (scanf("%lld %d", &i, &j) != 2) {
            return 0;
        }
        printf("q %lld %d -> %lld\n", i, j, i * stride + m[j].offset);
    }
    return 0;
}
```

### 忘记尾部填充 [WA]
`used` 只是最后一个成员结束的位置，还要向上取整到结构体对齐值才是 `sizeof`。少了这一步，`stride`、`pad`、`aos`、`saved` 和所有跨记录偏移都会偏小，而且数组元素之间的对齐也被破坏。

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
    int sum = 0;
    for (int i = 0; i < n; i++) {
        if (scanf("%7s %15s", m[i].type, m[i].name) != 2) {
            return 0;
        }
        m[i].size = type_size(m[i].type);
        m[i].align = m[i].size;
        used = align_up(used, m[i].align);
        m[i].offset = used;
        used += m[i].size;
        sum += m[i].size;
        if (m[i].align > max_align) {
            max_align = m[i].align;
        }
    }
    int stride = used;                 /* 错：没有尾部取整 */

    long long records = 0;
    if (scanf("%lld", &records) != 1) {
        return 0;
    }
    int q = 0;
    if (scanf("%d", &q) != 1) {
        return 0;
    }

    printf("stride=%d\n", stride);
    printf("align=%d\n", max_align);
    printf("pad=%d\n", stride - sum);
    printf("aos=%lld\n", records * stride);
    printf("soa=%lld\n", records * sum);
    printf("saved=%lld\n", records * (stride - sum));
    for (int i = 0; i < n; i++) {
        printf("offset %s +%d size=%d\n", m[i].name, m[i].offset, m[i].size);
    }
    for (int t = 0; t < q; t++) {
        long long i = 0;
        int j = 0;
        if (scanf("%lld %d", &i, &j) != 2) {
            return 0;
        }
        printf("q %lld %d -> %lld\n", i, j, i * stride + m[j].offset);
    }
    return 0;
}
```

### 以为 SoA 也要按 stride 算 [WA]
SoA 是"每个字段一个数组"，每个数组的元素就是该字段本身，元素之间没有结构体填充，所以总字节数是 `N × 成员大小之和`，不是 `N × stride`。把两者混为一谈，`saved` 永远是 0。

### 以为查询的 j 是从 1 开始 [WA]
题目里 `j` 是成员在输入中的下标，从 0 开始；`i` 是记录下标，也从 0 开始。按 1 开始去减，会让查询整体错位一个成员或一条记录。

## 测试用例
### 01 sample 示例 1
```in
3
u32 id
u8 grade
u64 score
4
5
0 0
1 1
2 2
3 0
3 2
```
```out
stride=16
align=8
pad=3
aos=64
soa=52
saved=12
offset id +0 size=4
offset grade +4 size=1
offset score +8 size=8
q 0 0 -> 0
q 1 1 -> 20
q 2 2 -> 40
q 3 0 -> 48
q 3 2 -> 56
```

### 02 sample 示例 2
```in
1
u8 flag
1
1
0 0
```
```out
stride=1
align=1
pad=0
aos=1
soa=1
saved=0
offset flag +0 size=1
q 0 0 -> 0
```

### 03 boundary 10⁹ 条记录、8 个 u64 成员
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
1000000000
4
0 0
999999999 0
999999999 7
500000000 3
```
```out
stride=64
align=8
pad=0
aos=64000000000
soa=64000000000
saved=0
offset a +0 size=8
offset b +8 size=8
offset c +16 size=8
offset d +24 size=8
offset e +32 size=8
offset f +40 size=8
offset g +48 size=8
offset h +56 size=8
q 0 0 -> 0
q 999999999 0 -> 63999999936
q 999999999 7 -> 63999999992
q 500000000 3 -> 32000000024
```

### 04 degenerate 只有一条记录，但内部有填充
```in
2
u8 x
u32 y
1
3
0 0
0 1
0 1
```
```out
stride=8
align=4
pad=3
aos=8
soa=5
saved=3
offset x +0 size=1
offset y +4 size=4
q 0 0 -> 0
q 0 1 -> 4
q 0 1 -> 4
```

### 05 trap 记录之间隔着填充，步长不是成员和
```in
2
u8 tag
u64 val
1000000000
3
1 0
1 1
999999999 0
```
```out
stride=16
align=8
pad=7
aos=16000000000
soa=9000000000
saved=7000000000
offset tag +0 size=1
offset val +8 size=8
q 1 0 -> 16
q 1 1 -> 24
q 999999999 0 -> 15999999984
```

### 06 trap 尾部填充也算进步长
```in
3
u32 a
u8 b
u8 c
100
4
0 0
0 2
99 2
99 0
```
```out
stride=8
align=4
pad=2
aos=800
soa=600
saved=200
offset a +0 size=4
offset b +4 size=1
offset c +5 size=1
q 0 0 -> 0
q 0 2 -> 5
q 99 2 -> 797
q 99 0 -> 792
```

### 07 normal 十亿以下量级、混合类型
```in
4
u16 id
u32 count
u8 flag
u64 total
100000
5
0 0
1 2
99999 3
50000 1
12345 0
```
```out
stride=24
align=8
pad=9
aos=2400000
soa=1500000
saved=900000
offset id +0 size=2
offset count +4 size=4
offset flag +8 size=1
offset total +16 size=8
q 0 0 -> 0
q 1 2 -> 32
q 99999 3 -> 2399992
q 50000 1 -> 1200004
q 12345 0 -> 296280
```
