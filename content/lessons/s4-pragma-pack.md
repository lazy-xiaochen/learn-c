---
id: s4-pragma-pack
---

## 讲解

### 填充字节是对齐的账单
结构体的每个成员都必须放在"自己的对齐值的整数倍"这个偏移上，结构体总大小又必须是"最大成员对齐值"的整数倍。这两条规则合起来，会在成员之间和结构体末尾留下空隙——**填充字节（padding）**。它们不存任何数据，却实实在在占用内存，也实实在在出现在 `sizeof` 里。

本平台（x86-64，Clang，UCRT）上常用类型的宽度和对齐值是：

| 类型 | 大小 | 对齐 |
|---|---|---|
| `unsigned char` | 1 | 1 |
| `unsigned short` | 2 | 2 |
| `unsigned int` | 4 | 4 |
| `unsigned long long` | 8 | 8 |

拿一个最普通的通信协议头举例，字段顺序是协议文档写死的：

```c
struct HeaderDefault {
    unsigned char  magic;   /* 1 字节 */
    unsigned int   seq;     /* 4 字节 */
    unsigned short flags;   /* 2 字节 */
};
```

按上面的规则：`magic` 在 `+0`，`seq` 必须落在 4 的倍数上，于是 `+1`～`+3` 是 3 字节填充，`seq` 在 `+4`，`flags` 在 `+8`；总大小 `1+3+4+2 = 10`，再向上取整到 4 的倍数 → **12**。字段真正需要的只有 7 字节，**5 字节是填充**，超过 40% 的空间被白白浪费。

协议文档定义的线格式恰恰是"7 字节、字段一个接一个"的样子。让结构体的内存布局和线格式对上，就是 `#pragma pack` 要解决的事。

### `#pragma pack(n)` 修改的是"对齐上限"
`#pragma pack(n)` 不是"把所有成员按 n 字节对齐"，而是给每个成员的对齐值加一个**上限**：

1. 成员的实际对齐值 `A = min(自然对齐值, n)`；
2. 成员偏移 = 当前偏移向上取整到 `A` 的倍数，然后占用该成员的大小；
3. 结构体自身的对齐值 = 所有成员 `A` 的最大值；
4. 结构体总大小向上取整到第 3 步得到的对齐值。

`n` 只封顶、不抬高：`pack(8)` 对 4 字节的 `int` 毫无影响，但 `pack(2)` 会让 `int` 只能从 2 的倍数开始。`n` 的合法取值是 2 的幂（1、2、4、8、16），超出范围的写法各编译器表现不同，不在标准保护范围内。

语法上有两种写法，推荐用带 `push` / `pop` 的那种：

```c
#pragma pack(push, 1)          /* 保存当前设置，再把上限压到 1 */
struct WireHeader {
    unsigned char  magic;
    unsigned int   seq;
    unsigned short flags;
};
#pragma pack(pop)              /* 恢复保存的设置：这一行不能忘 */

#pragma pack(1)                /* 老写法：从这行起一直生效，直到 pack() 或再次 pack(n) */
struct LegacyHeader { unsigned char a; unsigned int b; };
#pragma pack()                 /* 恢复默认 */
```

两种写法的区别只在**作用范围**：`pack(push, n)` 的影响在 `pop` 处结束，`pack(n)` 则一路影响到文件结尾或下一次设置。`pop` 忘写，后面所有结构体（包括 `#include` 进来的头文件里的）都会跟着变成 1 字节对齐——这是 `#pragma pack` 最常见的坑。

GCC / Clang 还提供 `__attribute__((packed))`，作用范围是单个类型定义，语义等价；MSVC 没有这个属性，只有 `#pragma pack`。**这两种写法都不在 C 标准里**，属于编译器扩展。

下面把同一个协议头在三种设置下各声明一次，顺便验证 `pop` 之后是否真的恢复默认：

```c run id=pk-three-modes
#include <stddef.h>
#include <stdio.h>

/* 同一个通信协议头：1 字节 magic、4 字节 seq、2 字节 flags */

struct HeaderDefault {
    unsigned char  magic;
    unsigned int   seq;
    unsigned short flags;
};

#pragma pack(push, 2)
struct HeaderPack2 {
    unsigned char  magic;
    unsigned int   seq;
    unsigned short flags;
};
#pragma pack(pop)

#pragma pack(push, 1)
struct HeaderPack1 {
    unsigned char  magic;
    unsigned int   seq;
    unsigned short flags;
};
#pragma pack(pop)

/* pop 之后已经恢复默认：这个与协议无关的结构体不应该被压紧 */
struct AfterPop {
    unsigned char  tag;
    unsigned int   id;
    unsigned short flags;
};

static void report(const char *label, size_t size, size_t magic, size_t seq, size_t flags) {
    printf("%-8s sizeof=%2zu  offsetof: magic=%zu seq=%zu flags=%zu\n", label, size, magic, seq, flags);
}

int main(void) {
    report("default", sizeof(struct HeaderDefault),
           offsetof(struct HeaderDefault, magic),
           offsetof(struct HeaderDefault, seq),
           offsetof(struct HeaderDefault, flags));
    report("pack(2)", sizeof(struct HeaderPack2),
           offsetof(struct HeaderPack2, magic),
           offsetof(struct HeaderPack2, seq),
           offsetof(struct HeaderPack2, flags));
    report("pack(1)", sizeof(struct HeaderPack1),
           offsetof(struct HeaderPack1, magic),
           offsetof(struct HeaderPack1, seq),
           offsetof(struct HeaderPack1, flags));
    report("afterPop", sizeof(struct AfterPop),
           offsetof(struct AfterPop, tag),
           offsetof(struct AfterPop, id),
           offsetof(struct AfterPop, flags));
    return 0;
}
```
```output
default  sizeof=12  offsetof: magic=0 seq=4 flags=8
pack(2)  sizeof= 8  offsetof: magic=0 seq=2 flags=6
pack(1)  sizeof= 7  offsetof: magic=0 seq=1 flags=5
afterPop sizeof=12  offsetof: magic=0 seq=4 flags=8
```

把四个结果排在一起看：

| 设置 | sizeof | magic | seq | flags | 说明 |
|---|---|---|---|---|---|
| 默认 | 12 | 0 | 4 | 8 | `seq` 前 3 字节填充、末尾 2 字节尾填充 |
| pack(2) | 8 | 0 | 2 | 6 | `seq` 只能从 2 开始，仍然不是 4 的倍数 |
| pack(1) | 7 | 0 | 1 | 5 | 没有填充，总大小 = 各字段大小之和 |
| AfterPop | 12 | 0 | 4 | 8 | `pop` 之后回到默认，证明 pack 是有作用域的 |

注意 `pack(2)` 那一行：`sizeof` 从 12 掉到 8，但 `seq` 的偏移是 2——它**仍然没有满足 `unsigned int` 的 4 字节对齐要求**。pack 只是把填充压到更少，并不能让成员"重新对齐"；这正是后面所有代价的来源。

`pack(1)` 的 7 个字节是这样排的（`seq = 42 = 0x2a`，`flags = 3`，小端存放）：

```memory title="pack(1) 的 7 字节线格式：字段一个接一个，没有任何填充"
偏移 | 字节数 | 这次存的内容（小端） | 成员
+0 | 1 | 7a | magic
+1 | 4 | 2a 00 00 00 | seq = 42
+5 | 2 | 03 00 | flags = 3
```

同样三个字段，默认对齐时多出 5 个填充字节：

```memory title="默认对齐的同一个结构体：12 字节，其中 5 字节是填充"
偏移 | 字节数 | 内容 | 说明
+0 | 1 | 7a | magic
+1 | 3 | 填充 | 把 seq 抬到 4 的倍数
+4 | 4 | 2a 00 00 00 | seq = 42
+8 | 2 | 03 00 | flags = 3
+10 | 2 | 尾填充 | sizeof 必须是最大对齐值 4 的倍数
```

### 省下来的空间要乘以元素个数
单个结构体省 5 字节看起来不起眼，但填充是**每个元素都要付一次**的。1000 条记录的数组，默认对齐要 12000 字节，pack(1) 只要 7000 字节：

```c run id=pk-array-savings
#include <stdio.h>

#pragma pack(push, 1)
struct WireHeader { unsigned char magic; unsigned int seq; unsigned short flags; };
#pragma pack(pop)

struct MemHeader { unsigned char magic; unsigned int seq; unsigned short flags; };

#define COUNT 1000

int main(void) {
    size_t wire = sizeof(struct WireHeader);
    size_t mem = sizeof(struct MemHeader);
    printf("每个元素：pack(1) %zu 字节，默认 %zu 字节\n", wire, mem);
    printf("1000 条记录的数组：%zu 字节 vs %zu 字节\n", wire * COUNT, mem * COUNT);
    printf("省下 %zu 字节（%.1f%%），代价是 seq、flags 都可能落在非对齐地址上\n",
           (mem - wire) * COUNT, 100.0 * (double)(mem - wire) / (double)mem);
    return 0;
}
```
```output
每个元素：pack(1) 7 字节，默认 12 字节
1000 条记录的数组：7000 字节 vs 12000 字节
省下 5000 字节（41.7%），代价是 seq、flags 都可能落在非对齐地址上
```

省空间是真的，但"都落在非对齐地址上"这句话在数组里尤其要紧：每个元素都可能有成员未对齐，而数组通常是要被**遍历**的，于是每次访问都撞上下一节要讲的代价。

既然布局这么容易变，就应该把"我假设它是 7 字节"写进代码里，让编译器替我们站岗：

```c
#include <stddef.h>

#pragma pack(push, 1)
struct WireHeader { unsigned char magic; unsigned int seq; unsigned short flags; };
#pragma pack(pop)

_Static_assert(sizeof(struct WireHeader) == 7, "线格式头必须是 7 字节");
_Static_assert(offsetof(struct WireHeader, seq) == 1, "seq 必须紧跟在 magic 之后");
```

`_Static_assert` 在编译期检查：将来有人手滑改了字段类型、调错了 pack 值，或换了个 ABI 导致大小变化，**编译直接失败**，而不是等到线上解析出乱码才发现。

### 代价一：未对齐访问
C 标准要求对象按自己的对齐值访问。`pack(1)` 之后 `seq` 落在 `+1`，`&hdr.seq` 得到的指针对 `unsigned int` 就是**未对齐**的——通过它读写是未定义行为。下面这段代码在 x86-64 上"能跑"，但 UBSan 会当场抓住它：

```c run id=pk-misaligned-ub expect=UB warnings=allow
#include <stdio.h>
#include <string.h>

typedef struct __attribute__((packed)) {
    unsigned char tag;
    unsigned int  value;
} Sample;

int main(void) {
    unsigned char wire[5] = { 0x11, 0x2a, 0x00, 0x00, 0x00 };
    Sample s;
    memcpy(&s, wire, sizeof s);          /* 字节复制进去是允许的 */
    unsigned int *p = &s.value;          /* 警告：取 packed 成员的地址 */
    printf("%u\n", *p);                  /* UBSan：load of misaligned address */
    return 0;
}
```

编译时 Clang 会给出 `-Waddress-of-packed-member` 警告（`#pragma pack` 声明的结构体不触发这条警告，`__attribute__((packed))` 才会），运行时 UBSan 报 `load of misaligned address ... which requires 4 byte alignment`，判题结果是 `UB`。

为什么"能跑"不等于"没问题"？分三层看：

| 层面 | 发生了什么 | 后果 |
|---|---|---|
| 语言标准 | 通过未对齐指针访问对象是 UB | 优化器可以假设它不会发生，行为不可预期 |
| x86-64 硬件 | 允许未对齐的标量访存 | 平时看不出问题，只在地审计工具里暴露 |
| 严格对齐平台 | 未对齐访存触发 fault（总线错误） | 同一份代码直接崩溃 |

即使只看性能，`pack(1)` 也不是白拿的：

- **跨缓存行**：一个 8 字节成员如果横跨 64 字节缓存行的边界，一次访存会被拆成两次；
- **失去对齐假设**：编译器通常不能把 packed 数组的访问向量化，也不能把相邻成员合并成一次宽读，因为每个成员的位置都可能是奇数；
- **不能取地址**：`&hdr.seq` 不能传给要求 `unsigned int *` 的函数，只能先 `memcpy` 到本地变量再算——多一次拷贝；
- **严格对齐平台要拆指令**：在没有未对齐访存支持的 ARMv7、MIPS 上，编译器只能生成"逐字节读 + 移位 + 或"，指令数翻好几倍。

用 `-O2 -S` 看同一份代码的两种布局，x86-64 上差别只在偏移（硬件兜住了），但偏移本身已经说明了问题：

```asm
read_normal:
	movl	4(%rcx), %eax        # 默认对齐：成员在 +4，一条对齐的 4 字节读
	retq

read_packed:
	movl	1(%rcx), %eax        # pack(1)：成员在 +1，地址是奇数
	retq
```

同一段 `read_packed` 换到严格对齐的目标上（例如 `-mno-unaligned-access` 的 ARM），会展开成四条 `ldrb` 加移位、拼接——这就是"pack 省了空间但可能更慢"的机制。

### 代价二：pack 不是标准，也管不了字节序
`#pragma pack` 是编译器扩展，标准里没有它。各家实现虽然都支持，但细节并不统一：`push` / `pop` 的支持程度、pack 与位域如何交互、嵌套结构体的处理、默认对齐值，都可能有差别。更要命的是，**即使 pack 设置完全一致，内存里的字节也不一定是协议要的字节**：

```c run id=pk-wire-order
#include <stddef.h>
#include <stdio.h>
#include <string.h>

#pragma pack(push, 1)
struct WireHeader {
    unsigned char  magic;
    unsigned int   seq;
    unsigned short flags;
};
#pragma pack(pop)

_Static_assert(sizeof(struct WireHeader) == 7, "线格式头必须是 7 字节");
_Static_assert(offsetof(struct WireHeader, seq) == 1, "seq 必须紧跟在 magic 之后");

static void dump(const char *label, const unsigned char *b, size_t n) {
    printf("%-10s", label);
    for (size_t i = 0; i < n; i++) printf(" %02x", (unsigned)b[i]);
    printf("\n");
}

int main(void) {
    struct WireHeader h;
    h.magic = 0x7a;
    h.seq = 42u;
    h.flags = 3u;

    dump("in-memory", (const unsigned char *)&h, sizeof h);

    /* 协议规定多字节字段用大端（高位先发），与内存里的存放顺序无关 */
    unsigned char wire[7];
    wire[0] = h.magic;
    wire[1] = (unsigned char)(h.seq >> 24);
    wire[2] = (unsigned char)(h.seq >> 16);
    wire[3] = (unsigned char)(h.seq >> 8);
    wire[4] = (unsigned char)h.seq;
    wire[5] = (unsigned char)(h.flags >> 8);
    wire[6] = (unsigned char)h.flags;
    dump("on-wire", wire, sizeof wire);

    /* 接收端按同样规则拼回来 */
    unsigned int seq = ((unsigned int)wire[1] << 24) | ((unsigned int)wire[2] << 16) |
                       ((unsigned int)wire[3] << 8) | (unsigned int)wire[4];
    unsigned int flags = ((unsigned int)wire[5] << 8) | (unsigned int)wire[6];
    printf("decoded seq=%u flags=%u\n", seq, flags);
    return 0;
}
```
```output
in-memory  7a 2a 00 00 00 03 00
on-wire    7a 00 00 00 2a 00 03
decoded seq=42 flags=3
```

内存里 `seq` 是 `2a 00 00 00`（小端，低位在前），协议要的却是 `00 00 00 2a`（大端）。`#pragma pack` 让**字节数**对上了，却没有、也不可能让**字节顺序**对上——字节序由 CPU 决定，与 pack 无关。除此之外，`int` 在有的平台上只有 2 字节，`long` 在 32 位和 64 位上宽度不同，`double` 的自然对齐值也可能不同，这些都会让"pack 之后的结构体"在不同 ABI 下长得不一样。

所以跨平台的协议实现通常**完全不用 packed 结构体直接收发**，而是显式序列化：一个 `unsigned char` 缓冲区 + 协议规定好的移位 / 掩码规则 + 明确的字节序。packed 结构体只保留给"同一套 ABI 内部的二进制格式"这种确定场景。

### 什么时候可以放心用
把上面的结论整理成一张清单：

- **可以用的场景**：与固定平台的固件 / 文件格式对接（双方 ABI 一致）；内存紧张的巨型数组；只在"打包 / 解包"这一层出现。
- **必须配上的保护**：`_Static_assert(sizeof(T) == 期望值)` 钉死大小；用 `offsetof` 钉死关键成员的偏移；`pack(push, n)` 与 `pop` 成对出现。
- **不要做的事**：取 packed 成员的地址并当普通指针用；把 packed 结构体直接 `fwrite` 到跨平台文件；用 pack 去"修"一个带位域的协议（位域的位顺序是另一套由实现决定的东西）；以为 `pack(1)` 一定更快。

需要"既省空间、又能安全访问"时，标准做法是**打包用一个紧凑结构体、计算时用本地对齐的副本**：收到字节流后 `memcpy` 进 packed 结构体，再逐字段复制到普通结构体里参与运算；发送时反向操作。多一次拷贝，换来的是可以放心取地址、可以向量化的数据。

## 编译与运行

用 gcc 或 clang 都能编译，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra pack.c -o pack
./pack
```

```bash
clang -std=c17 -Wall -Wextra pack.c -o pack
./pack
```

想看清布局，可以把编译器当成"打印结构体的工具"：

```bash
clang -std=c17 -Wpadded -c pack.c -o pack.o
```

`-Wpadded` 会对每个由编译器插入的填充字节报警，例如 `padding struct 'struct S' with 3 bytes to align 'x'`。它不在 `-Wall -Wextra` 里，只在排查布局时临时打开——生产构建里它会把所有正常填充都报一遍。

Clang 还能直接打印记录布局：

```bash
clang -std=c17 -Xclang -fdump-record-layouts -c pack.c -o pack.o
```

输出里每个结构体都是一张"偏移 | 成员"表，最后一行是 `[sizeof=8, align=4]`，和 `_Static_assert` 一起用非常方便。

要抓未对齐访问，打开对齐检查（本平台的判题器默认就带 `-fsanitize=address,undefined`）：

```bash
clang -std=c17 -g -fsanitize=undefined -fno-sanitize-recover=all pack.c -o pack
./pack
```

对 `__attribute__((packed))` 的结构体，`-Waddress-of-packed-member` 会在取成员地址处报警：

```bash
clang -std=c17 -Wall -Wextra -Waddress-of-packed-member pack.c -o pack
```

几点说明：

- 不同编译器的 `-Wpadded` 名字一样、触发条件不完全一样，读警告时以"它指出了哪个成员"为准；
- `_Static_assert` 是 C11 起的关键字，C17 完全可用；老代码里的 `static_assert` 宏来自 `assert.h`，效果相同；
- 在 ARM 目标上可以加 `-mno-unaligned-access` 观察编译器如何把未对齐访问拆成逐字节读取，这比任何文字解释都直观。

## 常见错误

### 以为 pack 只改变结构体总大小，不改变成员偏移 [WA]
pack 改变的是**每个成员的对齐上限**，成员偏移会跟着变。只把 `sizeof` 算小、偏移仍按默认对齐算，打包出来的字节流就会整体错位。本题（见编程题）里 `pack(1)` 下 `seq` 在 `+1`，默认对齐下在 `+4`，差了 3 字节——这 3 字节足以让对端把 `flags` 读成 `seq` 的一部分。

### 忘记 `#pragma pack(pop)`，对齐设置泄漏到后面所有结构体 [WA]
`pack(push, 1)` 没有配对的 `pop` 时，设置会一直生效到文件结尾；Clang 会额外给出 `unterminated '#pragma pack (push, ...)' at end of file` 警告。下面这段代码里，与协议毫无关系的 `Point` 也被压成了 1 字节对齐：

```c run id=pk-forgot-pop expect=OK warnings=allow
#include <stdio.h>

#pragma pack(push, 1)
struct Header {
    unsigned char tag;
    unsigned int  seq;
};
/* 忘了 #pragma pack(pop)：从这里往下全都是 1 字节对齐 */

struct Point {
    char c;
    int  x;        /* 期望：为了对齐 x，c 后面有 3 字节填充 */
};

int main(void) {
    printf("Header=%zu Point=%zu\n", sizeof(struct Header), sizeof(struct Point));
    return 0;
}
```
```output
Header=5 Point=5
```

`Point` 本应是 8 字节，现在变成 5 字节——所有依赖它布局的代码（`fread`、`memcpy`、跨模块传递）都会跟着错。

### 取 packed 成员的地址，再当普通指针用 [UB]
`&hdr.seq` 的类型是 `unsigned int *`，但它指向的地址不满足 4 字节对齐，解引用就是未定义行为。要么用 `memcpy` 把成员复制到本地变量，要么把整个结构体复制成普通结构体再取地址——不能对 packed 成员取地址后直接传出去。

```c run id=pk-address-of-member expect=UB warnings=allow
#include <stdio.h>
#include <string.h>

#pragma pack(push, 1)
struct Header { unsigned char tag; unsigned int seq; };
#pragma pack(pop)

int main(void) {
    unsigned char buf[5] = { 0x11, 0x2a, 0x00, 0x00, 0x00 };
    struct Header h;
    memcpy(&h, buf, sizeof h);
    unsigned int *p = &h.seq;        /* 地址可能是奇数 */
    printf("%u\n", *p);              /* UBSan：load of misaligned address */
    return 0;
}
```

### 以为 pack 过的结构体可以直接当线格式 [WA|UB]
两个原因各自独立成立：**字节序**是 CPU 决定的，pack 管不了；**类型宽度和对齐值**由 ABI 决定，换平台就变。所以"结构体 → 网络"必须先按协议逐字段序列化。即使本机收发测试通过，只要对端换了大端设备或 32 位 ABI，解析就会错。

### 以为 `pack(1)` 一定更快 [WA]
pack 减少的是内存占用，不是访存次数。未对齐访问在 x86 上由硬件兜住，在严格对齐平台上要靠逐字节读取，在数组遍历里还会失去向量化机会。判断快慢要看实际热点：省下的缓存行可能带来收益，但成员访问的额外开销往往更大，必须实测。

## 客观题

### q-s4-pragma-pack-1 single
关于 `#pragma pack(1)`，下列说法哪一个是正确的？

- [x] 它把每个成员的对齐上限压到 1，于是 `sizeof` 等于各成员大小之和；代价是成员可能未对齐，取成员地址并解引用是未定义行为
  > 正确。`pack(n)` 的规则是"成员实际对齐 = min(自然对齐, n)"，n=1 时所有成员紧挨着排，结构体里不再有填充，总大小就是各字段大小之和。与此同时，`&s.field` 得到的指针可能不满足该类型的对齐要求，通过它读写属于 UB；标准明确规定访问未对齐对象是未定义行为，x86 硬件"能跑"只是实现细节。
- [ ] 它只影响结构体的总大小，成员的偏移不受影响
  > 错。偏移正是由每个成员的对齐值算出来的，对齐上限变了，偏移必然跟着变。比如 `unsigned char` 后面跟 `unsigned int`，默认对齐时 `int` 在 `+4`，pack(1) 时在 `+1`。只把 `sizeof` 算小、偏移照旧，是打包协议时最常见的错位来源。
- [ ] 用了它之后结构体就可以直接作为网络协议格式，因为不再有填充字节
  > 错。pack 只消除填充，不改变字节序：内存里的 `int` 按 CPU 的字节序存放（本平台是小端），而协议通常规定大端。此外 `int` 的宽度、`double` 的自然对齐值都随 ABI 变化，pack(1) 之后大小仍可能不同。跨平台协议必须显式按字段序列化。
- [ ] 用 `pack(1)` 的结构体访问一定比默认对齐快，因为占用的内存更少
  > 错。省的是空间，不是访存开销。未对齐访问在严格对齐平台上要拆成逐字节读取，在数组遍历中还会让编译器无法向量化；x86-64 上虽然一条 `mov` 就能完成，但一旦跨缓存行就要拆成两次访存。"省内存"和"更快"是两件事，需要实测。
- [ ] `#pragma pack` 是 C 标准规定的指令，所有编译器都必须支持
  > 错。它是编译器扩展，标准里没有这一节。MSVC、GCC、Clang 都支持，但 `push`/`pop` 的支持程度、与位域的交互、嵌套结构体的处理细节并不完全一致，所以只能在确定的工具链内部使用，不能指望它在任何平台上都一样。
