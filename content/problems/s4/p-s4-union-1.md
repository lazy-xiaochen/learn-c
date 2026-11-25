---json
{
  "id": "p-s4-union-1",
  "title": "union 内存模型推算：大小、对齐、成员重叠与字节重解释",
  "difficulty": "L3",
  "knowledgePoints": ["s4-union"],
  "special": "memory-layout",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
本题要你按下面这份**简化但与本平台真实行为一致**的规则，推算一个 union 的大小、对齐和字节内容，并回答一串查询。

一个 union 的成员从下面两类类型里选：

| 类型码 | 含义 | 大小 | 对齐 |
|---|---|---|---|
| `u1` | `unsigned char` | 1 | 1 |
| `u2` | `unsigned short` | 2 | 2 |
| `u4` | `unsigned int` | 4 | 4 |
| `u8` | `unsigned long long` | 8 | 8 |
| `cN` | `unsigned char c[N]`（`N` 是十进制数字串） | N | 1 |

规则：

1. **所有成员都从 union 的偏移 0 开始**，互相重叠；
2. union 的**对齐** = 所有成员对齐值的最大值 `A`；
3. union 的**大小** = 最大成员的大小，向上取整到 `A` 的倍数；
4. 外面套一个结构体，用来考察"union 在结构体里的落点"：

```c
typedef struct {
    unsigned char tag;
    U u;                 /* U 是上面那个 union */
    unsigned char tail;
} Holder;
```

- `tag` 在偏移 0；
- `u` 的偏移 = 把 1 向上取整到 `A` 的倍数；
- `tail` 的偏移 = `u` 的偏移 + union 大小；
- `sizeof(Holder)` = `tail` 偏移 + 1，再向上取整到 `A` 的倍数。

5. union 的存储初始全是 0 字节。`write i v` 表示"给第 `i` 个成员赋值 `v`"：把 `v` 的**低 `sizeof` 成员 个字节**按**小端**写到偏移 0，其余字节保持不变（union 不会因为你写了窄成员就清空别的字节）；
6. `read n off` 表示"从偏移 `off` 开始读 `n` 个字节，按小端拼成一个无符号整数"。

## 输入格式
第一行一个整数 `m`：成员个数。
接下来 `m` 行，每行一个类型码（见上表），第 `i` 个成员的下标是 `i - 1`。
接下来一行一个整数 `q`：查询个数。
接下来 `q` 行，每行是下列之一（用空格分隔）：

```
size                输出 union 的大小
align               输出 union 的对齐
uoff                输出成员 u 在 Holder 里的偏移
toff                输出成员 tail 在 Holder 里的偏移
ssize               输出 sizeof(Holder)
write i v           把十六进制数 v 写进第 i 个成员（v 保证放得进该成员的大小），不输出
read n off          从偏移 off 读 n 个字节，按小端拼成无符号十进制数输出
```

## 输出格式
每个查询输出一行（`write` 除外，它不输出任何内容）：

- `size = <值>`
- `align = <值>`
- `uoff = <值>`
- `toff = <值>`
- `ssize = <值>`
- `read <n> <off> = <值>`

## 数据范围
- `1 ≤ m ≤ 6`
- 类型码只可能是 `u1`、`u2`、`u4`、`u8`、`c1` … `c16`
- `1 ≤ q ≤ 200`
- `0 ≤ i < m`；`1 ≤ n ≤ 8`；`0 ≤ off`，且保证 `off + n ≤ union 大小`
- union 大小最大 16，所有值都在 64 位无符号范围内

## 示例
### 示例 1
```in
2
u4
c6
8
size
align
uoff
toff
ssize
write 0 12345678
read 4 0
read 2 4
```
```out
size = 8
align = 4
uoff = 4
toff = 12
ssize = 16
read 4 0 = 305419896
read 2 4 = 0
```
> 成员是 `u4`（4 字节、对齐 4）和 `c6`（6 字节、对齐 1）。最大成员是 6 字节，最大对齐是 4，所以 union 大小 = 6 向上取整到 4 的倍数 = **8**。`u` 的偏移 = 1 向上取整到 4 = 4，`tail` 的偏移 = 4 + 8 = 12，`sizeof(Holder)` = 13 向上取整到 4 的倍数 = **16**。`write 0 12345678` 只写 `u4` 的 4 个字节（`78 56 34 12`），偏移 4 之后仍然是 0，所以 `read 2 4` 得 0。

### 示例 2（边界：只有一个 1 字节成员）
```in
1
c1
7
size
align
uoff
toff
ssize
write 0 7F
read 1 0
```
```out
size = 1
align = 1
uoff = 1
toff = 2
ssize = 3
read 1 0 = 127
```
> 只有一个 1 字节、对齐 1 的成员时，union 大小就是 1，对齐也是 1。此时结构体不需要任何填充：`tag` 在 0、`u` 在 1、`tail` 在 2，`sizeof` 正好是 3。这是"对齐值为 1 时向上取整什么也不做"的边界情形。

## 提示
### 第 1 层
先把每个成员的大小和对齐列出来，找出两个数：**最大成员大小**和**最大对齐值**。union 的大小是前者向上取整到后者的倍数——不是所有成员相加，也不是最大成员的原始大小。

### 第 2 层
`u` 在结构体里的偏移由 union 的**对齐**决定（不是大小）：`tag` 只占 1 字节，后面要留填充让 `u` 落在 `A` 的倍数上。`sizeof(Holder)` 又要再向上取整一次，因为结构体的大小必须是最大对齐值的倍数。

### 第 3 层
`write` 只覆盖"成员自己的宽度"：写 `u1` 只动 1 个字节，写 `u8` 才动 8 个字节，其余字节保持上一次写入的结果。`read` 则是反过来按小端拼装：低位字节在低地址，`read n off` 的结果等于 `mem[off] + mem[off+1]*256 + …`。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAXM 6
#define MAXB 16

/* 把 v 向上取整到 a 的倍数（a 是 2 的幂） */
static int round_up(int v, int a) {
    return (v + a - 1) / a * a;
}

int main(void) {
    int m;
    if (scanf("%d", &m) != 1 || m < 1 || m > MAXM) {
        return 0;
    }

    int msize[MAXM];
    int malign[MAXM];
    int maxsize = 0;
    int maxalign = 1;
    for (int i = 0; i < m; i++) {
        char tok[8];
        if (scanf("%7s", tok) != 1) {
            return 0;
        }
        char kind = tok[0];
        int num = 0;
        for (int k = 1; tok[k] != '\0'; k++) {
            num = num * 10 + (tok[k] - '0');
        }
        if (kind == 'u') {
            msize[i] = num;          /* unsigned 的大小等于它的对齐 */
            malign[i] = num;
        } else if (kind == 'c') {
            msize[i] = num;          /* 字符数组：大小 N，对齐 1 */
            malign[i] = 1;
        } else {
            return 0;
        }
        if (msize[i] > maxsize) {
            maxsize = msize[i];
        }
        if (malign[i] > maxalign) {
            maxalign = malign[i];
        }
    }

    int usize = round_up(maxsize, maxalign);   /* union 大小：最大成员再对齐 */
    int ualign = maxalign;
    int uoff = round_up(1, ualign);            /* 结构体里 u 的偏移 */
    int toff = uoff + usize;                   /* tail 的偏移 */
    int ssize = round_up(toff + 1, ualign);    /* 结构体大小 */

    unsigned char mem[MAXB];                   /* union 的存储，初始全 0 */
    for (int i = 0; i < MAXB; i++) {
        mem[i] = 0;
    }

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 200) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        char op[8];
        if (scanf("%7s", op) != 1) {
            return 0;
        }
        if (op[0] == 's' && op[1] == 'i') {
            printf("size = %d\n", usize);
        } else if (op[0] == 's') {
            printf("ssize = %d\n", ssize);
        } else if (op[0] == 'a') {
            printf("align = %d\n", ualign);
        } else if (op[0] == 'u') {
            printf("uoff = %d\n", uoff);
        } else if (op[0] == 't') {
            printf("toff = %d\n", toff);
        } else if (op[0] == 'w') {
            int idx;
            unsigned long long v;
            if (scanf("%d %llx", &idx, &v) != 2) {
                return 0;
            }
            for (int j = 0; j < msize[idx]; j++) {   /* 只覆盖这个成员的字节 */
                mem[j] = (unsigned char)((v >> (8 * j)) & 0xFFu);
            }
        } else if (op[0] == 'r') {
            int n;
            int off;
            if (scanf("%d %d", &n, &off) != 2) {
                return 0;
            }
            unsigned long long v = 0;
            for (int j = n - 1; j >= 0; j--) {       /* 小端拼装 */
                v = (v << 8) | (unsigned long long)mem[off + j];
            }
            printf("read %d %d = %llu\n", n, off, v);
        } else {
            return 0;
        }
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAXM 6
#define MAXB 16

static int round_up(int v, int a) {
    return (v + a - 1) / a * a;
}

int main(void) {
    int m;
    if (scanf("%d", &m) != 1 || m < 1 || m > MAXM) {
        return 0;
    }

    int msize[MAXM];
    int malign[MAXM];
    int maxalign = 1;
    for (int i = 0; i < m; i++) {
        char tok[8];
        if (scanf("%7s", tok) != 1) {
            return 0;
        }
        char kind = tok[0];
        int num = 0;
        for (int k = 1; tok[k] != '\0'; k++) {
            num = num * 10 + (tok[k] - '0');
        }
        if (kind == 'u') {
            msize[i] = num;
            malign[i] = num;
        } else if (kind == 'c') {
            msize[i] = num;
            malign[i] = 1;
        } else {
            return 0;
        }
        if (malign[i] > maxalign) {
            maxalign = malign[i];
        }
    }

    int usize = 0;
    for (int i = 0; i < m; i++) {
        usize += msize[i];                 /* TODO: union 的大小不是成员之和 */
    }
    int ualign = maxalign;
    int uoff = round_up(1, ualign);
    int toff = uoff + usize;
    int ssize = round_up(toff + 1, ualign);

    unsigned char mem[MAXB];
    for (int i = 0; i < MAXB; i++) {
        mem[i] = 0;
    }

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 200) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        char op[8];
        if (scanf("%7s", op) != 1) {
            return 0;
        }
        if (op[0] == 's' && op[1] == 'i') {
            printf("size = %d\n", usize);
        } else if (op[0] == 's') {
            printf("ssize = %d\n", ssize);
        } else if (op[0] == 'a') {
            printf("align = %d\n", ualign);
        } else if (op[0] == 'u') {
            printf("uoff = %d\n", uoff);
        } else if (op[0] == 't') {
            printf("toff = %d\n", toff);
        } else if (op[0] == 'w') {
            int idx;
            unsigned long long v;
            if (scanf("%d %llx", &idx, &v) != 2) {
                return 0;
            }
            for (int j = 0; j < 8; j++) {          /* TODO: 只应写成员自己的宽度 */
                mem[j] = (unsigned char)((v >> (8 * j)) & 0xFFu);
            }
        } else if (op[0] == 'r') {
            int n;
            int off;
            if (scanf("%d %d", &n, &off) != 2) {
                return 0;
            }
            unsigned long long v = 0;
            for (int j = n - 1; j >= 0; j--) {
                v = (v << 8) | (unsigned long long)mem[off + j];
            }
            printf("read %d %d = %llu\n", n, off, v);
        } else {
            return 0;
        }
    }
    return 0;
}
```

## 复杂度
时间：`O(m + q)`，每次 `write` 最多 8 次字节操作，每次 `read` 最多 8 次。
空间：`O(1)`，一个 16 字节的缓冲区。

## 常见错误
### 把 union 的大小算成所有成员大小之和 [WA]
`u4 + c6` 不是 10，也不是 6，而是 8。union 的成员是重叠的，只需要放下最大的那个；但大小还得是最大对齐值的倍数，所以 6 会补到 8。算成和会让后面所有长度、偏移的答案一起错。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXM 6
#define MAXB 16

static int round_up(int v, int a) {
    return (v + a - 1) / a * a;
}

int main(void) {
    int m;
    if (scanf("%d", &m) != 1) {
        return 0;
    }
    int msize[MAXM];
    int malign[MAXM];
    int maxalign = 1;
    for (int i = 0; i < m; i++) {
        char tok[8];
        if (scanf("%7s", tok) != 1) {
            return 0;
        }
        char kind = tok[0];
        int num = 0;
        for (int k = 1; tok[k] != '\0'; k++) {
            num = num * 10 + (tok[k] - '0');
        }
        msize[i] = num;
        malign[i] = (kind == 'u') ? num : 1;
        if (malign[i] > maxalign) {
            maxalign = malign[i];
        }
    }
    int usize = 0;
    for (int i = 0; i < m; i++) {
        usize += msize[i];             /* 错：union 不是结构体 */
    }
    int ualign = maxalign;
    int uoff = round_up(1, ualign);
    int toff = uoff + usize;
    int ssize = round_up(toff + 1, ualign);
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        char op[8];
        if (scanf("%7s", op) != 1) {
            return 0;
        }
        if (op[0] == 's' && op[1] == 'i') {
            printf("size = %d\n", usize);
        } else if (op[0] == 's') {
            printf("ssize = %d\n", ssize);
        } else if (op[0] == 'a') {
            printf("align = %d\n", ualign);
        } else if (op[0] == 'u') {
            printf("uoff = %d\n", uoff);
        } else if (op[0] == 't') {
            printf("toff = %d\n", toff);
        }
    }
    return 0;
}
```

### 忘记把 union 大小向上取整到对齐值 [WA]
`c6` 的对齐是 1，`u4` 的对齐是 4，最大对齐是 4，所以 6 要补到 8。少了这一步，`union{char[6], int}` 会被算成 6，`tail` 的偏移和 `sizeof` 全都偏小，而且 `u` 会落在非 4 倍数的位置上——现实中编译器绝不会这样排。

### 写窄成员时把整块 8 字节都覆盖了 [WA]
`write 0 12345678` 只应该动 4 个字节。如果无脑按 8 字节写，高位会多出 4 个 0，把之前写进去的内容冲掉；后续任何跨成员的 `read` 都会读错。

### 用大端拼装字节 [WA]
`read n off` 要求小端：`mem[off]` 是**最低**字节。写成 `v = v * 256 + mem[off + j]`（从低地址开始乘）得到的是大端结果，`read 4 0` 会把 `12 34 56 78` 算成 `0x12345678` 而不是 `0x78563412`。

### 忘了 union 的对齐也会影响结构体布局 [WA]
`u` 的偏移是"1 向上取整到 union 对齐"，不是恒等于 1。比如 union 里有 `u8` 时，`u` 要落在偏移 8，前面 7 个字节全是填充，`sizeof(Holder)` 也随之变大。

## 测试用例
### 01 sample 示例 1
```in
2
u4
c6
8
size
align
uoff
toff
ssize
write 0 12345678
read 4 0
read 2 4
```
```out
size = 8
align = 4
uoff = 4
toff = 12
ssize = 16
read 4 0 = 305419896
read 2 4 = 0
```

### 02 sample 示例 2
```in
1
c1
7
size
align
uoff
toff
ssize
write 0 7F
read 1 0
```
```out
size = 1
align = 1
uoff = 1
toff = 2
ssize = 3
read 1 0 = 127
```

### 03 boundary 六个 8 字节成员，union 对齐到 8
```in
6
u8
u8
u8
u8
u8
u8
7
size
align
uoff
toff
ssize
write 3 0123456789ABCDEF
read 8 0
```
```out
size = 8
align = 8
uoff = 8
toff = 16
ssize = 24
read 8 0 = 81985529216486895
```

### 04 degenerate 只有一个 16 字节的字符数组，对齐是 1
```in
1
c16
5
size
align
uoff
toff
ssize
```
```out
size = 16
align = 1
uoff = 1
toff = 17
ssize = 18
```

### 05 trap 写窄成员不会清掉其他字节
```in
2
u2
c3
7
size
write 1 ABCDEF
read 3 0
write 0 1234
read 3 0
read 1 3
```
```out
size = 4
read 3 0 = 11259375
read 3 0 = 11211316
read 1 3 = 0
```

### 06 trap 先写满 8 字节，再写 1 字节的成员
```in
2
u1
u8
5
size
write 1 FFFFFFFFFFFFFFFF
write 0 00
read 8 0
read 2 0
```
```out
size = 8
read 8 0 = 18446744073709551360
read 2 0 = 65280
```

### 07 trap 跨成员边界读取
```in
2
u4
c6
5
size
write 0 11223344
read 3 2
read 8 0
```
```out
size = 8
read 3 2 = 4386
read 8 0 = 287454020
```

### 08 normal 字符数组、short、long long 混合，union 对齐到 8
```in
3
c3
u2
u8
6
size
align
uoff
ssize
write 0 ABCD
read 2 0
```
```out
size = 8
align = 8
uoff = 8
ssize = 24
read 2 0 = 43981
```
