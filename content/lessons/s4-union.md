---
id: s4-union
---

## 讲解

### 所有成员从同一个地址开始
`union` 的语法和 `struct` 一模一样，语义却完全相反：结构体的成员是**依次排开**的，每个成员有自己的存储；union 的成员全都**从同一个地址开始**，共用同一块存储。

```c run id=un-share
#include <stdio.h>

typedef union {
    unsigned int u;          /* 4 字节 */
    unsigned short h[2];     /* 2 + 2 = 4 字节 */
    unsigned char b[4];      /* 4 字节 */
} Word;

int main(void) {
    Word w;
    w.u = 0x12345678u;       /* 先写 4 字节的 u */

    printf("w.u      = 0x%08X\n", (unsigned)w.u);
    printf("w.h[0]   = 0x%04X\n", (unsigned)w.h[0]);
    printf("w.h[1]   = 0x%04X\n", (unsigned)w.h[1]);
    printf("w.b[0..3] = %02X %02X %02X %02X\n",
           (unsigned)w.b[0], (unsigned)w.b[1], (unsigned)w.b[2], (unsigned)w.b[3]);

    printf("三个成员的首地址相同吗？%s\n",
           ((const void *)&w.u == (const void *)&w.h && (const void *)&w.u == (const void *)&w.b)
               ? "相同"
               : "不同");
    printf("sizeof(Word) = %zu\n", sizeof(Word));
    return 0;
}
```
```output
w.u      = 0x12345678
w.h[0]   = 0x5678
w.h[1]   = 0x1234
w.b[0..3] = 78 56 34 12
三个成员的首地址相同吗？相同
sizeof(Word) = 4
```

只写了一次 `w.u`，却能从三个"不同"的成员里读出三组互相对应得上的数字：`0x12345678` 按 2 字节切是 `0x5678`、`0x1234`，按 1 字节切是 `78 56 34 12`（小端：低字节放在低地址）。这说明它们**不是三块内存，而是同一块内存的三种读法**：

```memory title="Word w; w.u = 0x12345678（x86-64 小端，int/short/char 的对齐分别是 4/2/1）"
地址     | 内容 | 作为 w.u 的一部分 | 作为 w.h 的一部分 | 作为 w.b 的一部分
0x1000   | 78   | 最低字节          | h[0] 低字节       | b[0]
0x1001   | 56   | 次低字节          | h[0] 高字节       | b[1]
0x1002   | 34   | 次高字节          | h[1] 低字节       | b[2]
0x1003   | 12   | 最高字节          | h[1] 高字节       | b[3]
```

四个地址行描述的是**同一块 4 字节**。任何一个成员被写入，其他成员立刻"看到"新内容——因为它们本来就是同一块存储。

### union 的大小：最大成员再对齐
既然成员都从同一个地址开始，union 只需要一块**足够放下所有成员**的空间，而且这块空间的起始地址必须满足每个成员的对齐要求。于是：

> `sizeof(union)` = 最大的成员大小，向上取整到"最大成员对齐值"的倍数。

```c run id=un-size
#include <stdio.h>

typedef union {
    unsigned char c[5];      /* 5 字节，对齐 1 */
    unsigned int i;          /* 4 字节，对齐 4 */
} U1;

typedef union {
    unsigned char c[5];      /* 5 字节，对齐 1 */
    unsigned short s;        /* 2 字节，对齐 2 */
} U2;

typedef union {
    unsigned char c[9];      /* 9 字节，对齐 1 */
    double d;                /* 8 字节，对齐 8 */
} U3;

typedef struct {
    unsigned char c[5];      /* 5 字节 */
    unsigned int i;          /* 4 字节 */
} S1;

int main(void) {
    printf("union{char[5], unsigned int}   = %zu 字节（5 → 取整到 4 的倍数）\n", sizeof(U1));
    printf("union{char[5], unsigned short} = %zu 字节（5 → 取整到 2 的倍数）\n", sizeof(U2));
    printf("union{char[9], double}         = %zu 字节（9 → 取整到 8 的倍数）\n", sizeof(U3));
    printf("struct{char[5], unsigned int}  = %zu 字节（成员依次排开 + 填充）\n", sizeof(S1));
    printf("U2 的成员大小 = %zu 和 %zu，但 union 自己要 %zu 字节\n",
           sizeof(((U2 *)0)->c), sizeof(((U2 *)0)->s), sizeof(U2));
    return 0;
}
```
```output
union{char[5], unsigned int}   = 8 字节（5 → 取整到 4 的倍数）
union{char[5], unsigned short} = 6 字节（5 → 取整到 2 的倍数）
union{char[9], double}         = 16 字节（9 → 取整到 8 的倍数）
struct{char[5], unsigned int}  = 12 字节（成员依次排开 + 填充）
U2 的成员大小 = 5 和 2，但 union 自己要 6 字节
```

`U1` 的成员最大是 5 字节，但里面有 `unsigned int`（要求 4 字节对齐），所以大小要凑到 8——否则 `u1.i` 的地址就不是 4 的倍数了。`U2` 里最大的对齐值是 2，5 向上取整到 2 的倍数就是 6。`U3` 里 `double` 要求 8 字节对齐，9 凑到 16。

对比最后一行：**同样的成员，`struct` 要大得多**（12 字节），因为结构体要给每个成员各留一份空间，还要插填充。union 没有这个问题——它只有一个成员的空间，代价是**同一时刻只能有一个成员有意义**。

### 写入一个成员，只覆盖它自己的字节范围
union 的各个成员宽度不同，写一个较窄的成员时，剩下的字节**不会被清零**，它们保留原来的内容：

```c run id=un-write
#include <stdio.h>

typedef union {
    unsigned long long all;      /* 8 字节 */
    unsigned char b[8];          /* 8 字节 */
} Bits;

int main(void) {
    Bits x;
    x.all = 0x1122334455667788ull;
    printf("写入 all 之后：0x%016llX\n", (unsigned long long)x.all);

    x.b[0] = 0xAA;               /* 只改最低的那个字节 */
    printf("改 b[0] 之后： 0x%016llX\n", (unsigned long long)x.all);

    x.b[7] = 0xBB;               /* 只改最高的那个字节 */
    printf("改 b[7] 之后： 0x%016llX\n", (unsigned long long)x.all);

    x.all = 0;                   /* 写最宽的成员，整块清零 */
    printf("all = 0 之后：  0x%016llX\n", (unsigned long long)x.all);
    return 0;
}
```
```output
写入 all 之后：0x1122334455667788
改 b[0] 之后： 0x11223344556677AA
改 b[7] 之后： 0xBB223344556677AA
all = 0 之后：  0x0000000000000000
```

`b[0]` 和 `b[7]` 各自只动了 1 个字节，其余 7 个字节纹丝不动。写 `all`（8 字节）才会覆盖整块。这条性质既是 union 的用处（可以按字段精确改写某几个字节），也是它的坑（忘了清空，就会读到上一次留下的"脏"字节）。

### 带标签的 union：一个变量存多种类型
union 最大的问题是"不知道自己现在装的是什么"。解决办法是外面套一个结构体，用第一个成员当**标签**（tag）记录当前哪个成员有效：

```c run id=un-tagged
#include <stdio.h>
#include <string.h>

typedef enum {
    VAL_INT,
    VAL_REAL,
    VAL_TEXT
} Kind;

typedef struct {
    Kind kind;                   /* 标签：说明 value 里哪个成员有效 */
    union {
        long long i;
        double d;
        char text[16];
    } value;                     /* 三个成员共用 16 字节 */
} Value;

static void print_value(const Value *v) {
    switch (v->kind) {
    case VAL_INT:
        printf("整数：%lld\n", v->value.i);
        break;
    case VAL_REAL:
        printf("实数：%.3f\n", v->value.d);
        break;
    case VAL_TEXT:
        printf("文本：%s\n", v->value.text);
        break;
    }
}

int main(void) {
    Value a;
    a.kind = VAL_INT;
    a.value.i = 42;

    Value b;
    b.kind = VAL_REAL;
    b.value.d = 2.5;

    Value c;
    c.kind = VAL_TEXT;
    strcpy(c.value.text, "hello");

    print_value(&a);
    print_value(&b);
    print_value(&c);
    printf("sizeof(Value) = %zu（标签 4 + 填充 4 + union 16）\n", sizeof(Value));
    return 0;
}
```
```output
整数：42
实数：2.500
文本：hello
sizeof(Value) = 24（标签 4 + 填充 4 + union 16）
```

`Value` 的布局是这样的：

```memory title="Value（tagged union）：标签决定 union 里哪个成员可以读"
地址     | 内容    | 大小    | 成员                        | 说明
v+0      | kind    | 4 字节  | v.kind                      | 标签：VAL_INT / VAL_REAL / VAL_TEXT
v+4      | 填充    | 4 字节  | —                           | 为了让 value 落在 8 的倍数上
v+8      | value   | 16 字节 | v.value.i / v.value.d / v.value.text | 三个成员从 v+8 开始，互相重叠
```

有了 `kind`，读取时先看标签再选成员，就不会把 `long long` 的字节当成 `char[16]` 来读。C11 还允许**匿名 union**，省掉中间那层名字：

```c run id=un-anon
#include <stdio.h>

typedef struct {
    int kind;                    /* 0 = 整数，1 = 浮点 */
    union {                      /* 匿名 union：成员直接属于外层结构体 */
        long long i;
        double d;
    };
} Number;

int main(void) {
    Number n;
    n.kind = 1;
    n.d = 1.5;                   /* 不用写 n.value.d */
    printf("kind = %d, d = %.2f\n", n.kind, n.d);
    n.kind = 0;
    n.i = 7;                     /* 现在用整数成员 */
    printf("kind = %d, i = %lld\n", n.kind, n.i);
    printf("sizeof(Number) = %zu\n", sizeof(Number));
    return 0;
}
```
```output
kind = 1, d = 1.50
kind = 0, i = 7
sizeof(Number) = 16
```

### union 与 struct 该选哪个
| | `struct` | `union` |
|---|---|---|
| 成员存储 | 各自一块，依次排开 | 共用同一块，全部从偏移 0 开始 |
| 大小 | 所有成员之和 + 填充 | 最大成员向上取整到最大对齐 |
| 同一时刻有效成员 | 全部 | 只有一个 |
| 典型用途 | 把相关数据打包 | 一个变量在不同时刻存不同类型；按字节/位观察数据 |
| 需要额外的标签吗 | 不需要 | 需要（否则不知道在读哪个） |

判断方法很直接：**这些数据需要同时存在吗？** 需要就用 `struct`；如果它们只是"同一份数据的几种可能形态"（一次只能有一种），才用 `union`。

## 编译与运行

用 gcc 或 clang 编译都行，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra union_demo.c -o union_demo
./union_demo
```

```bash
clang -std=c17 -Wall -Wextra union_demo.c -o union_demo
./union_demo
```

想确认 union 的布局，最直接的办法是让编译器把大小和偏移报出来：

```bash
clang -std=c17 -Xclang -fdump-record-layouts -fsyntax-only union_demo.c
```

输出里会列出每个成员都从 `[0]` 开始，以及 `sizeof`、`align` 的值。也可以用 `offsetof` 验证：对 union 来说，所有成员的 `offsetof` 都是 0。

几点说明：

- union 的大小和对齐规则与平台有关：`double` 在 32 位 x86 上只要求 4 字节对齐，那时 `union{char[9], double}` 是 12 而不是 16。本平台（x86-64）是 8；
- `-Wall -Wextra` 不会对"读未写入的成员"报警——这是 union 的正常用法，编译器管不了语义；
- 想看字节序，写一个 `union { unsigned int u; unsigned char b[4]; }`，写 1 读 `b[0]`：`b[0] == 1` 是小端，`b[3] == 1` 是大端。

## 常见错误

### 以为 union 的大小是所有成员之和 [WA]
`union { char text[16]; long long i; double d; }` 的大小是 16，不是 16 + 8 + 8 = 32。union 的成员是重叠的，编译器只留最大那个的空间。把 union 当结构体算大小，会导致序列化、`memcpy`、数组下标全部错位。

```c run id=un-err-sum
#include <stdio.h>

typedef union {
    unsigned char text[16];
    long long i;
    double d;
} Box;

typedef struct {
    unsigned char text[16];
    long long i;
    double d;
} Bag;

int main(void) {
    printf("union 的大小 = %zu\n", sizeof(Box));
    printf("struct 的大小 = %zu\n", sizeof(Bag));
    printf("成员之和 = %zu + %zu + %zu = %zu\n",
           sizeof(unsigned char[16]), sizeof(long long), sizeof(double),
           sizeof(unsigned char[16]) + sizeof(long long) + sizeof(double));
    return 0;
}
```
```output
union 的大小 = 16
struct 的大小 = 32
成员之和 = 16 + 8 + 8 = 32
```

### 以为写一个成员会把整块内存清零 [WA]
给窄成员赋值只覆盖它自己的字节。先写过 8 字节的 `all`，再写 `b[0]`，高 7 字节仍然是旧值——如果这段内存要当"新对象"用（比如序列化成网络包），必须先 `memset` 或写最宽的成员把它清干净。

### 没有标签就直接读另一个成员 [WA]
`union { long long i; char text[16]; }` 里写了 `i`，然后去 `printf("%s", text)`：你读到的是一段没有 `\0` 结尾的字节，可能越界打印、可能输出乱码。**union 不会记录哪个成员有效，这件事只能由你自己（用 tag）记住。**

### 对 union 用 == 比较 [CE]
C 不允许对 union（和 struct）使用 `==`，编译器会直接报错。要比较两个 union 是否相同，只能逐成员比较，或者比较字节（`memcmp`）——后者还要小心填充字节的不确定值。

### 用 union 试图"节省"本来该同时存在的字段 [WA]
把 `x`、`y`、`width`、`height` 这类**必须同时存在**的字段塞进 union，写 `width` 就会毁掉 `height`。union 不是"内存压缩工具"，它表达的是"同一时刻只有一种形态"。

## 客观题

### q-s4-union-1 single
在 x86-64（本平台）上，下面这个 union 的 `sizeof` 是多少？

```c
typedef union {
    unsigned char  c[7];
    unsigned short s;
    unsigned int   i;
} Sample;
```

- [x] 8
  > 正确。最大的成员是 `c[7]`，占 7 字节；union 里最大的对齐要求来自 `unsigned int`，是 4。union 的大小必须是最大对齐值的倍数，7 向上取整到 4 的倍数就是 8。这样数组里每个 `Sample` 的起始地址都是 4 的倍数，`i` 才能满足对齐。
- [ ] 7
  > 错。7 只是最大成员的字节数，没有考虑对齐。如果大小是 7，那么 `Sample a[2];` 里第二个元素的地址就是 7，`a[1].i` 会落在非 4 倍数地址上——这正是未定义行为要避免的情况。
- [ ] 13
  > 错。13 是"所有成员相加"（7 + 2 + 4），那是结构体的思路。union 的成员是重叠的，只留最大成员的空间。
- [ ] 12
  > 错。12 是把 7 向上取整到 4 的倍数之后又加了 4，或者把 `c[7]` 当成 8 再加 4。正确的做法只有一步：取最大成员大小 7，向上取整到最大对齐值 4 的倍数，得到 8。
