---
id: s6-binary-io
---

## 讲解

### fwrite / fread 是"字节块拷贝"，返回值是元素个数
这两个函数的参数表看起来有四个参数，其实只有两个语义：

```c
size_t fwrite(const void *ptr, size_t size, size_t count, FILE *fp);
size_t fread(void *ptr, size_t size, size_t count, FILE *fp);
```

- `ptr` 是内存里的起始地址，`size` 是**一个元素**占多少字节，`count` 是**要处理多少个元素**；
- 返回值是**成功读写的元素个数**，不是字节数；
- 实际搬运的字节数是 `返回值 × size`，最多 `size × count`。

这个"元素个数"的设计是为了让你用 `size = sizeof 元素, count = 元素个数`，然后**直接用返回值和 count 比较**：

```c
int data[5] = {10, 20, 30, 40, 50};
size_t n = fwrite(data, sizeof data[0], 5, fp);   /* 返回 5，不是 20 */
if (n != 5) { /* 没写全：磁盘满或流出错 */ }
```

```c run id=bin-element-count
#include <stdio.h>

int main(void) {
    int data[5] = {10, 20, 30, 40, 50};
    FILE *fp = fopen("arr.bin", "wb");
    if (fp == NULL) {
        return 1;
    }
    size_t written = fwrite(data, sizeof data[0], 5, fp);
    printf("fwrite 返回 %zu（元素个数，不是字节数）\n", written);
    fclose(fp);

    int back[5] = {0};
    fp = fopen("arr.bin", "rb");
    if (fp == NULL) {
        return 1;
    }
    size_t got = fread(back, sizeof back[0], 5, fp);
    printf("fread 返回 %zu，读到：", got);
    for (size_t i = 0; i < got; i++) {
        printf("%s%d", i ? " " : "", back[i]);
    }
    printf("\n");
    fclose(fp);
    printf("换算成字节数：%zu x %zu = %zu 字节\n", got, sizeof back[0], got * sizeof back[0]);
    return 0;
}
```
```output
fwrite 返回 5（元素个数，不是字节数）
fread 返回 5，读到：10 20 30 40 50
换算成字节数：5 x 4 = 20 字节
```

`fread` 的返回值尤其重要：它**读不满**是正常情况（文件末尾不够一个元素），但"读满了没有"只能靠返回值判断，不能靠 `feof`：

```c run id=bin-partial
#include <stdio.h>
#include <stdint.h>

int main(void) {
    unsigned char bytes[5] = {1, 2, 3, 4, 5};
    FILE *fp = fopen("odd.bin", "wb");
    if (fp == NULL) {
        return 1;
    }
    if (fwrite(bytes, 1, sizeof bytes, fp) != sizeof bytes) {
        fclose(fp);
        return 1;
    }
    fclose(fp);

    fp = fopen("odd.bin", "rb");
    if (fp == NULL) {
        return 1;
    }
    uint16_t rec[2] = {0, 0};
    size_t got = fread(rec, sizeof rec[0], 2, fp);      /* 每条 2 字节 */
    printf("第 1 次 fread：%zu 条，值 %u 和 %u\n", got, (unsigned)rec[0], (unsigned)rec[1]);
    got = fread(rec, sizeof rec[0], 2, fp);             /* 只剩 1 字节，凑不出一条 */
    printf("第 2 次 fread：%zu 条（只剩 1 字节，凑不出一条）\n", got);
    printf("此时 feof = %d\n", feof(fp) != 0);
    fclose(fp);
    return 0;
}
```
```output
第 1 次 fread：2 条，值 513 和 1027
第 2 次 fread：0 条（只剩 1 字节，凑不出一条）
此时 feof = 1
```

513 和 1027 是这么来的：两个字节 `0x01 0x02` 按**小端**解释成 16 位整数就是 `0x0201 = 513`，`0x03 0x04` 是 `0x0403 = 1027`。这就是下一节要说的字节序。

### 二进制模式：换行符不再被"翻译"
在 Windows 上，用 `"w"`/`"r"`（文本模式）打开文件时，C 库会在 `'\n'` 和 `"\r\n"` 之间来回翻译；用 `"wb"`/`"rb"`（二进制模式）则**原样搬运**。这意味着：

- 你用 `fwrite` 写一段内存镜像，如果文件是文本模式打开的，镜像里的每一个 `0x0A` 字节都会被改写成 `0x0D 0x0A`，长度和内容全变；
- 反过来，用 `fread` 读一个二进制文件（图片、压缩包、别人生成的记录文件）时用文本模式，读到 `0x1A`（Ctrl-Z）还可能被当成"文件结束"。

所以有一条硬规则：**只要文件内容是"字节"而不是"文本行"，就必须带 `b`**。`fread`/`fwrite` 配 `"rb"`/`"wb"`，文本处理才用 `"r"`/`"w"`。

```c run id=bin-text-vs-binary
#include <stdio.h>

/* 用二进制方式数文件里到底有多少字节 */
static int bytes_of(const char *path) {
    FILE *fp = fopen(path, "rb");
    if (fp == NULL) {
        return -1;
    }
    int n = 0;
    while (fgetc(fp) != EOF) {
        n++;
    }
    fclose(fp);
    return n;
}

int main(void) {
    FILE *fp = fopen("text.txt", "w");
    if (fp == NULL) {
        return 1;
    }
    fputs("A\nB\n", fp);                 /* 4 个字符 */
    fclose(fp);

    fp = fopen("bin.dat", "wb");
    if (fp == NULL) {
        return 1;
    }
    fputs("A\nB\n", fp);                 /* 同样 4 个字符 */
    fclose(fp);

    printf("文本模式写入 4 个字符：文件 %d 字节\n", bytes_of("text.txt"));
    printf("二进制模式写入 4 个字符：文件 %d 字节\n", bytes_of("bin.dat"));
    return 0;
}
```
```output
文本模式写入 4 个字符：文件 6 字节
二进制模式写入 4 个字符：文件 4 字节
```

两个 `'\n'` 各被翻译成 `"\r\n"`，所以文本模式的文件多了 2 个字节。这是本平台（Windows/UCRT）的行为；在 Linux/macOS 上两种模式完全一样，这反而更危险——**在 Linux 上开发时看不出问题，拷到 Windows 上二进制文件就被改坏了**。

### 结构体直接写文件：布局、填充与字节序
把整个结构体用一次 `fwrite` 写进文件，语法上完全合法：

```c
Rec r = { 'A', 0x01020304, 0x0506, 0.0 };
fwrite(&r, sizeof r, 1, fp);      /* 把 sizeof(Rec) 个字节原样写出去 */
```

问题是"原样"到底是多少个字节、每个字节是什么。这取决于三件事：

1. **对齐填充**：编译器为了让每个成员落在自己对齐要求的位置上，会在成员之间插"洞"。这些洞**不存储任何字段**，但它们**占文件空间**，而且洞里的内容是不确定的（可能是 0，也可能是上一次用这块内存留下的垃圾）。
2. **字节序**：多字节整数在内存里是"低字节在前"（小端，x86-64/ARM 常见）还是"高字节在前"（大端）。同一个 `0x01020304`，小端写出来是 `04 03 02 01`，大端是 `01 02 03 04`。
3. **类型宽度**：`long` 在 Windows 上是 4 字节、在 Linux x86-64 上是 8 字节；`size_t`、指针宽度也随平台变。

先看一个具体布局：`struct { char tag; int id; short v; double x; }` 在 x86-64 上的样子。

```memory title="struct Rec { char tag; int id; short v; double x; } 在 x86-64 上的布局"
偏移 | 大小 | 字段 | 说明
0 | 1 | tag | char 对齐要求 1，放在最前面
1 | 3 | 填充 | 为了让 int 落在 4 的倍数上，编译器插的洞，内容不确定
4 | 4 | id | int 对齐 4，从偏移 4 开始
8 | 2 | v | short 对齐 2，紧接在 id 后面
10 | 6 | 填充 | double 要求 8 字节对齐，下一个 8 的倍数是 16
16 | 8 | x | double 对齐 8，正好占满最后 8 字节
24 | 0 | （合计） | sizeof(Rec) = 24：总大小要按最大对齐 8 取整
```

对齐规则和 `s4-alignment` 里讲的一样：每个成员从"自己的对齐要求"的倍数开始，结构体总大小按"最大成员对齐"取整。下面用 `offsetof` 和逐字节打印来验证这张表：

```c run id=bin-layout
#include <stddef.h>
#include <stdio.h>
#include <string.h>

typedef struct {
    char tag;
    int id;
    short v;
    double x;
} Rec;

int main(void) {
    printf("sizeof(Rec) = %zu\n", sizeof(Rec));
    printf("offsetof(tag) = %zu\n", offsetof(Rec, tag));
    printf("offsetof(id) = %zu\n", offsetof(Rec, id));
    printf("offsetof(v) = %zu\n", offsetof(Rec, v));
    printf("offsetof(x) = %zu\n", offsetof(Rec, x));

    Rec r;
    memset(&r, 0, sizeof r);        /* 先把填充字节清 0，输出才可复现 */
    r.tag = 'A';
    r.id = 0x01020304;
    r.v = 0x0506;
    r.x = 0.0;

    const unsigned char *p = (const unsigned char *)&r;
    printf("前 8 个字节：");
    for (size_t i = 0; i < 8; i++) {
        printf("%02X ", p[i]);
    }
    printf("\n");
    return 0;
}
```
```output
sizeof(Rec) = 24
offsetof(tag) = 0
offsetof(id) = 4
offsetof(v) = 8
offsetof(x) = 16
前 8 个字节：41 00 00 00 04 03 02 01
```

`41` 是 `'A'`；接下来 3 个 `00` 是填充洞；`04 03 02 01` 是 `0x01020304` 的**小端**表示——低字节 `04` 在前。如果把这 24 个字节直接写进文件，那么：

- 换个编译器（成员对齐策略不同）或换 32 位平台（`double` 可能还是 8 字节，但整体布局未必一样），读出来的字段就全错位了；
- 即使布局一样，换大端机器读，`id` 会变成 `0x04030201`；
- 填充洞里的字节如果是"不确定值"，同一份数据两次写出的文件可能**不一样**，无法做校验和、也无法做逐字节比对。

所以"直接 `fwrite` 结构体"适合**临时缓存、同一台机器自己读**；要长期存储、跨平台交换，就得**逐字段序列化**：明确每个字段占几个字节、用什么字节序，一个字节一个字节地写。

### 序列化的基本套路：定宽 + 明确字节序
最常用的做法是"把每个字段拆成字节，按约定的顺序写"：

- 整数用**固定宽度**类型（`<stdint.h>` 里的 `int32_t`、`uint16_t`），不用 `int`/`long`，避免"平台一变宽度就变"；
- 明确**字节序**（网络协议用大端，文件格式自己定，但要在文档里写死）；
- 读回来的时候**每个字段都校验**，并且用 `fread` 的返回值判断"是不是读到了完整的一条"。

下例把一个 32 位整数按小端写成 4 个字节，再读回来：

```c run id=bin-serialize
#include <stdint.h>
#include <stdio.h>

int main(void) {
    uint32_t value = 0x01020304u;
    unsigned char buf[4];
    for (int i = 0; i < 4; i++) {
        buf[i] = (unsigned char)((value >> (8 * i)) & 0xFFu);   /* 小端：低字节先写 */
    }

    FILE *fp = fopen("value.bin", "wb");
    if (fp == NULL) {
        return 1;
    }
    if (fwrite(buf, 1, sizeof buf, fp) != sizeof buf) {
        fclose(fp);
        return 1;
    }
    fclose(fp);

    unsigned char back[4] = {0};
    fp = fopen("value.bin", "rb");
    if (fp == NULL) {
        return 1;
    }
    if (fread(back, 1, sizeof back, fp) != sizeof back) {
        fclose(fp);
        return 1;
    }
    fclose(fp);

    uint32_t rebuilt = 0;
    for (int i = 0; i < 4; i++) {
        rebuilt |= (uint32_t)back[i] << (8 * i);
    }
    printf("写出的 4 个字节：%02X %02X %02X %02X\n", back[0], back[1], back[2], back[3]);
    printf("按小端拼回来：0x%08X\n", (unsigned)rebuilt);
    return 0;
}
```
```output
写出的 4 个字节：04 03 02 01
按小端拼回来：0x01020304
```

这套"移位 + 掩码"的写法看起来比 `fwrite(&value, 4, 1, fp)` 啰嗦，但它把"文件里第几个字节是什么"完全定死了：换成大端机器、换成 32 位编译器，文件格式都不变。工程上还会把它包成 `put_u32_le` / `get_u32_le` 这样的函数，读写两边各写一次，格式文档里写清偏移。

## 编译与运行

用 gcc 或 clang 编译，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra bin.c -o bin
./bin
```

```bash
clang -std=c17 -Wall -Wextra bin.c -o bin
./bin
```

几点说明：

- 看二进制文件的内容要用十六进制工具：Linux 上 `xxd data.bin`，Windows 上可以用本平台示例里那种"逐字节 `%02X`"的循环；
- 比较两个二进制文件是否完全相同，用 `cmp a.bin b.bin`（Linux）或 `fc /b a.bin b.bin`（Windows），不要用文本编辑器看——文本编辑器会把不可打印字节显示成符号，看不出差异；
- `-Wall -Wextra` 能抓出 `fread`/`fwrite` 参数类型问题（比如把 `sizeof` 写成元素个数），但抓不出"字节序写反了"；
- 结构体的实际布局可以用 `offsetof` 打印出来（就像上面的例子），这比"猜编译器怎么排"可靠得多；`<stddef.h>` 提供 `offsetof`。

## 常见错误

### 把 fread / fwrite 的返回值当成字节数
返回值是**元素个数**。用 `size = sizeof(元素), count = n` 时它最多等于 `n`；写成 `if (fwrite(data, 1, n, fp) != n * sizeof(int))` 就永远不成立，程序会把"写成功"误判成失败。要么统一用 `size = sizeof(元素)`，要么统一用 `size = 1, count = 字节数`，两种写法不能混。

### 用文本模式读写二进制数据
`fopen(path, "w")` + `fwrite` 会把内存镜像里的每个 `0x0A` 改写成 `0x0D 0x0A`，文件长度和内容都变了；`fopen(path, "r")` + `fread` 可能在遇到 `0x1A` 时提前结束。二进制数据一律 `"rb"`/`"wb"`。

### 直接把含指针的结构体写进文件
`fwrite(&node, sizeof node, 1, fp)` 会把指针的**地址值**写进文件。读回来时那个地址早已无效（甚至属于别的进程），解引用就是野指针。文件里只能存"值"，不能存"地址"；链表、树这类结构要按"节点编号 + 引用编号"的方式序列化。

### 不检查 fread 的返回值，把残缺的最后一条当成完整记录
文件长度不是记录大小的整数倍时（比如 8 字节记录的文件有 13 字节），`fread` 只会返回 1，最后 5 个字节读不出来。如果程序只判断"返回值不为 0 就继续处理"，那 5 个字节会被当成一条记录，字段全是垃圾。正确做法是 `while (fread(&rec, sizeof rec, 1, fp) == 1)`，循环结束后再确认是 `feof` 还是 `ferror`。

### 以为结构体的 sizeof 就是"各字段大小之和"
`struct { char tag; int id; }` 的字段加起来是 5 字节，`sizeof` 却是 8 字节——中间 3 个字节是对齐填充。用"字段大小之和"去算文件偏移、算记录条数，都会错位。要算偏移就用 `offsetof`，要算记录大小就用 `sizeof`。

## 客观题

### q-s6-binary-io-1 single
执行 `size_t n = fwrite(arr, sizeof arr[0], 10, fp);`（`arr` 是 `int` 数组，`int` 占 4 字节）。关于返回值 `n`，哪一条说法是**正确**的？

- [x] `n` 是成功写出的**元素个数**，最多为 10；实际写出的字节数是 `n * sizeof(int)`
  > 正确。`fwrite` 的返回值按"元素"计数，元素大小由第二个参数决定。所以 `n == 10` 表示 10 个 `int` 全部写出（共 40 字节）；`n < 10` 表示只写了一部分，必须当成错误处理。
- [ ] `n` 是实际写出的字节数，最多为 40
  > 错。如果返回值是字节数，标准就没必要设计 `size` 和 `count` 两个参数了。比较时应该和 `count` 比，而不是和 `size * count` 比。
- [ ] `n` 是实际写出的字节数除以 4 之后的余数，用来判断是否对齐
  > 错。返回值和"余数"无关。它只是成功处理的元素个数，`size` 取 1 时就恰好等于字节数——这也正是最容易混淆的地方。
- [ ] `n` 只可能是 0 或 10，写失败时一定是 0
  > 错。写操作可能只完成一部分（例如磁盘在写到第 7 个元素时满了），这时 `n` 会是 7。所以必须用 `n != 10` 来判断"没写全"，不能只判断 `n == 0`。
