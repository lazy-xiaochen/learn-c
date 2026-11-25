---
id: s4-bitfield
---

## 讲解

### 位域：把成员按"位"而不是按"字节"分配
结构体成员最少也占 1 字节，可现实中很多字段只需要 1 位：设备状态寄存器里的使能、就绪、故障标志，协议头里的版本号、优先级、保留位。位域（bit-field）就是为这种场景准备的成员声明方式——在成员名后面加 `: 位宽`：

```c
struct Status {
    unsigned char enabled : 1;   /* 1 位 */
    unsigned char ready   : 1;
    unsigned char fault   : 1;
    unsigned char dirty   : 1;
    unsigned char mode    : 4;   /* 4 位，0–15 */
};
```

四个标志加一个 4 位模式正好 8 位，整个结构体只占 1 字节：

```c run id=bf-basic
#include <stdio.h>

struct Status {
    unsigned char enabled : 1;
    unsigned char ready   : 1;
    unsigned char fault   : 1;
    unsigned char dirty   : 1;
    unsigned char mode    : 4;
};

int main(void) {
    struct Status s = { 0 };
    s.enabled = 1;
    s.mode = 5;
    s.fault = 1;
    printf("sizeof=%zu enabled=%u ready=%u fault=%u dirty=%u mode=%u\n",
           sizeof s, (unsigned)s.enabled, (unsigned)s.ready,
           (unsigned)s.fault, (unsigned)s.dirty, (unsigned)s.mode);
    return 0;
}
```
```output
sizeof=1 enabled=1 ready=0 fault=1 dirty=0 mode=5
```

位域的用法和普通成员几乎一样：用 `.` 或 `->` 读写，赋给它的值会被"压"进位宽里。它换来的好处很直接——8 个独立的 `unsigned char` 标志要 8 字节，位域只要 1 字节；换成 32 个标志，差距从 8 倍变成 32 倍。

位域有三条硬限制，从语言层面就堵死了：

1. **不能取地址**：`&s.enabled` 是编译错误（"address of bit-field requested"），因此也不能把位域成员交给 `scanf`、`memcpy` 或任何需要指针的函数；
2. **不能 `sizeof`**：`sizeof s.mode` 不合法，`offsetof` 同样用不了；
3. **不能有数组**：不能声明"位域数组"，需要一组标志时只能一个个写出来，或者退回到位运算。

合法的基础类型是 `_Bool`、`signed int`、`unsigned int`；GCC / Clang / MSVC 都额外允许 `char`、`short`、`long` 等整型作为扩展，所以上面用 `unsigned char` 在三大编译器上都编得过——但严格说它已经不在标准保证的范围内了。

### 标准保证了什么，又不管什么
位域的"内存布局"几乎全部交给实现决定。这不是标准偷懒，而是因为不同 CPU 的位编号方式、位提取指令、字节序都不一样：小端机器上"第一个位域放最低位"最自然，大端机器上则是最高位最自然；有的架构有专门的位域插入 / 提取指令，有的只能靠移位和掩码。标准如果钉死一种顺序，另一半机器就得多付一次位翻转的代价。于是标准只规定"能存、能取、值按位宽截断"，布局留白。

具体分工是：

| 标准保证的 | 实现自己决定的 |
|---|---|
| 同一个存储单元里，相邻位域紧挨着分配 | 单元内从**哪一端**开始分配（低位先还是高位先） |
| 无符号位域能表示 `0` 到 `2^w - 1` | 空间不够时，位域是放进下一个单元还是**跨越**单元边界 |
| 赋值给无符号位域时按位宽取模截断 | 存储单元的**大小与对齐**（由声明类型和 ABI 决定） |
| 结构体成员按声明顺序排列 | `int` 位域到底算有符号还是无符号 |
| `sizeof` 给出结构体的字节数 | 哪些类型可以当位域的基础类型 |

所以在 C 里，"位域结构体的第 1 个字段在哪个字节的哪一位"是一个**只能实测、不能推导**的问题。本平台（x86-64，Clang）的实际布局可以直接打印出来看：

```c run id=bf-raw
#include <stdio.h>
#include <string.h>

struct Nibble {
    unsigned char lo : 4;
    unsigned char hi : 4;
};

struct Status {
    unsigned char enabled : 1;
    unsigned char ready   : 1;
    unsigned char fault   : 1;
    unsigned char dirty   : 1;
    unsigned char mode    : 4;
};

static void dump(const char *label, const void *p, size_t n) {
    const unsigned char *b = (const unsigned char *)p;
    printf("%-8s size=%zu bytes=", label, n);
    for (size_t i = 0; i < n; i++) printf("%02x", (unsigned)b[i]);
    printf("\n");
}

int main(void) {
    struct Nibble nb = { 0 };
    nb.lo = 5;
    nb.hi = 10;
    dump("nibble", &nb, sizeof nb);       /* lo=5 在低 4 位，hi=10 在高 4 位 */

    struct Status st = { 0 };
    st.enabled = 1;
    st.fault = 1;
    st.mode = 5;
    dump("status", &st, sizeof st);       /* bit0、bit2、bit4–7 */

    struct Status one = { 0 };
    one.ready = 1;
    dump("ready", &one, sizeof one);      /* ready 是第 2 个声明，落在 bit1 */
    return 0;
}
```
```output
nibble   size=1 bytes=a5
status   size=1 bytes=55
ready    size=1 bytes=02
```

三个结果分别说明：`lo=5`（`0101`）在低 4 位、`hi=10`（`1010`）在高 4 位，拼成 `0xa5`；`status` 的 `enabled` 在 bit0、`fault` 在 bit2、`mode=5` 在 bit4–7，拼成 `0x55`；`ready` 是第二个声明的位域，落在 bit1，所以是 `0x02`。**这一切都是本平台的选择**，换一个编译器完全可能得到 `0x5a`、`0xaa` 这样的镜像结果。

用 `unsigned char` 做基底时，整个结构体正好塞进 1 个字节。按位看是这样：

```memory title="本平台上 struct Status 的 1 字节：第 1 个声明的位域占最低位"
位 | 字段 | 宽度 | 说明
bit0 | enabled | 1 | 第 1 个声明的位域，占用最低位
bit1 | ready | 1 | 第 2 个声明
bit2 | fault | 1 | 第 3 个声明
bit3 | dirty | 1 | 第 4 个声明
bit4–bit7 | mode | 4 | 第 5 个声明，4 位无符号，取值 0–15
```

### 占多少字节由"声明类型"决定
位域不是"想省多少就省多少"：编译器会按声明类型选一个**存储单元**（storage unit），再在单元里给位域分位；当前单元放不下时换下一个单元（还是允许跨越单元边界，由实现决定）。`unsigned char` 的单元是 1 字节，`unsigned int` 的单元是 4 字节，于是同样几个字段，换个基础类型大小就完全不同：

```c run id=bf-units
#include <stdio.h>
#include <string.h>

struct CharBase  { unsigned char a : 4; unsigned char b : 4; };  /* 同一种基底 */
struct MixedBase { unsigned char a : 4; unsigned int  b : 6; };  /* 混用基底 */
struct IntBase   { unsigned int  a : 4; unsigned int  b : 6; };  /* 都是 int 基底 */

int main(void) {
    printf("char+char=%zu，char+int=%zu，int+int=%zu\n",
           sizeof(struct CharBase), sizeof(struct MixedBase), sizeof(struct IntBase));
    printf("8 个独立的 unsigned char 标志=%zu 字节\n", 8 * sizeof(unsigned char));

    struct CharBase cb = { 0 };
    cb.a = 0x0f;
    cb.b = 0x03;
    unsigned char raw;
    memcpy(&raw, &cb, 1);                 /* 只能整块复制，不能 &cb.a */
    printf("a=15 b=3 时整字节=0x%02x\n", (unsigned)raw);
    return 0;
}
```
```output
char+char=1，char+int=8，int+int=4
8 个独立的 unsigned char 标志=8 字节
a=15 b=3 时整字节=0x3f
```

结论有三个，每个都很实用：

- **同一种小基底最省**：`char+char` 是 1 字节；
- **混用基底很浪费**：`char+int` 变成 8 字节——`a` 占 1 字节单元的低 4 位，轮到 `b` 时它的声明类型是 `unsigned int`，必须从 4 的倍数偏移重新开一个 4 字节单元，中间空出 3 字节、单元内又空出 3 字节；
- **`int` 基底至少 4 字节**：`int+int` 用掉 4 字节，而 `char+char` 只要 1 字节。想靠位域省内存，基础类型必须一起选小。

`MixedBase` 的 8 个字节具体是这样浪费掉的（本平台实测）：

```memory title="struct MixedBase（char a:4 + int b:6）的 8 字节：两个不同基底的存储单元"
字节偏移 | 内容 | 属于 | 说明
+0 | 低 4 位存 a，高 4 位空着 | a:4 | a 的存储单元是 1 字节（unsigned char）
+1 | 没有使用 | 填充 | b 的基底是 unsigned int，必须从 4 的倍数开始
+2 | 没有使用 | 填充 | 同上
+3 | 没有使用 | 填充 | 同上
+4 | 低 6 位存 b | b:6 | b 的存储单元是 4 字节（unsigned int），从 +4 开始
+5 | 没有使用 | 填充 | b 的存储单元剩下的字节
+6 | 没有使用 | 填充 | 同上
+7 | 没有使用 | 填充 | 同上
```

还有一个常被忽略的语法：**宽度为 0 的匿名位域**（`: 0`）表示"把下一个位域推到下一个存储单元的开头"，可以当跨平台版的"填充到边界"用；`unsigned int : 3;` 这种没有名字的位域则是纯占位填充。它们的具体效果同样依赖"存储单元多大"，所以只能算提示，不是保证。

### 取值规则：截断与符号
位域的赋值不是"存不下就报错"，而是**按位宽截断**：无符号位域把值对 `2^w` 取模，有符号位域则是实现定义（Clang 上同样是回绕）。这两种行为叠加"`int` 位域的有符号性由实现决定"，就是位域最容易埋雷的地方：

```c run id=bf-truncation
#include <stdio.h>

struct Flags4  { unsigned char mode : 4; };
struct Signed4 { int mode : 4; };
struct OneBit  { int flag : 1; };

int main(void) {
    struct Flags4 f = { 0 };
    unsigned v = 20;
    f.mode = v;                       /* 4 位装不下 20：按模 16 截断 */
    printf("unsigned char mode:4 <- 20 -> %u\n", (unsigned)f.mode);

    struct Signed4 s = { 0 };
    unsigned w = 9;
    s.mode = (int)w;                  /* 4 位有符号装不下 9：变成 -7 */
    printf("int mode:4 <- 9 -> %d\n", (int)s.mode);

    struct OneBit b = { 0 };
    unsigned one = 1;
    b.flag = (int)one;                /* 1 位有符号只有 0 和 -1 两个值 */
    printf("int flag:1 <- 1 -> %d (无符号解释 %u)\n", (int)b.flag, (unsigned)b.flag);
    return 0;
}
```
```output
unsigned char mode:4 <- 20 -> 4
int mode:4 <- 9 -> -7
int flag:1 <- 1 -> -1 (无符号解释 4294967295)
```

三行输出对应三个必须记住的结论：

1. **位宽就是取值范围**：4 位无符号是 0–15，20 进去变成 4（`20 % 16`），不会报错、不会饱和；
2. **`int` 位域在本平台是有符号的**（这一点标准留给实现决定）：4 位有符号的范围是 −8–7，9 进去变成 −7，后面所有比较、数组下标都会跟着错；
3. **1 位有符号只有 0 和 −1**：`flag = 1` 读回来是 −1。`if (s.flag)` 仍然为真，但 `s.flag == 1` 是假，打印出来是 `-1`——这类 bug 极难看出来。

所以位域**必须显式写 `unsigned`**。还需要注意整数提升：位域在表达式里会被提升为 `int`，所以 `s.flag - 1`、`~s.mode` 这类运算都在 `int` 宽度上进行，结果再赋回位域时又会被截断一次；拿位域当循环变量、做位运算，都要先想清楚提升后的类型。

### 不可移植性：为什么协议和寄存器都不用位域
把上面的事实串起来，结论就很清楚了：**位域描述的是"编译器怎么在一个存储单元里摆位"，而协议 / 寄存器手册描述的是"线缆上的第几个字节的第几位"**。这两件事只有在本平台上才碰巧一致。只要出现下面任何一种变化，同一份源码产出的字节就会变：

- 换编译器或编译器版本（位序、跨单元规则、`int` 位域的符号性都可能不同）；
- 换字节序（多字节存储单元内部的字节顺序跟着 CPU 走）；
- 换 ABI（存储单元的对齐、`int` 的宽度不同）；
- 在结构体里插入 / 删除一个位域（后续所有位跟着平移）。

`#pragma pack` 也救不了：它只能改"对齐上限"，完全不影响单元内的位分配顺序。所以位域只适合**程序内部**的紧凑表示——不跨模块传二进制、不写文件、不发给别的机器。对接协议时，正道是用定宽的 `unsigned char` 缓冲区加显式的移位和掩码：

```c run id=bf-portable
#include <stdio.h>
#include <string.h>

/* 数据手册规定的位位置：与编译器无关 */
#define ST_ENABLED   0x01u          /* bit0 */
#define ST_READY     0x02u          /* bit1 */
#define ST_FAULT     0x04u          /* bit2 */
#define ST_MODE      0xF0u          /* bit4–bit7 */
#define ST_MODE_SHIFT 4

struct StatusBits {
    unsigned char enabled : 1;
    unsigned char ready   : 1;
    unsigned char fault   : 1;
    unsigned char dirty   : 1;
    unsigned char mode    : 4;
};

int main(void) {
    unsigned reg = 0x35;            /* 设备上报的原始字节 */

    /* 可移植的读法：位置来自数据手册，移位在源码里写死 */
    unsigned enabled = (reg & ST_ENABLED) ? 1u : 0u;
    unsigned mode = (reg & ST_MODE) >> ST_MODE_SHIFT;
    printf("移位读法: enabled=%u mode=%u\n", enabled, mode);

    /* 位域读法：本平台上碰巧和手册一致，换编译器就不保证 */
    struct StatusBits b;
    unsigned char raw = (unsigned char)reg;
    memcpy(&b, &raw, 1);            /* 只能整字节复制进去 */
    printf("位域读法: enabled=%u mode=%u\n", (unsigned)b.enabled, (unsigned)b.mode);
    return 0;
}
```
```output
移位读法: enabled=1 mode=3
位域读法: enabled=1 mode=3
```

本平台上两种读法结果相同，这正是危险所在：代码"能用"，但它的正确性依赖 x86-64 Clang 的位分配顺序。换到把第一个位域放在最高位的编译器上，`enabled` 就会变成 bit7，读出来是 0。把位域换成移位和掩码之后，`ST_ENABLED`、`ST_MODE_SHIFT` 这些常量是协议文档的直接翻译，任何编译器、任何字节序下都成立。

硬件寄存器还有一个更隐蔽的坑：**位域写是"读—改—写"**。`reg->fault = 1` 会被编译成"读出整个存储单元、改一位、写回整个单元"。如果这个寄存器里有"写 1 清零"的标志位、或者硬件在两次访问之间改了别的位，这次写回就把它们一起改掉了。所以驱动里操作寄存器必须写成 `*p |= MASK;` 这样的显式读改写（或者按手册要求直接写整字），并且指针要带 `volatile`——而 `volatile` 位域成员既不能取地址，编译器对它的读改写也无法保证是最小访问序列。

### 什么时候用、怎么用
- **适合**：程序内部的状态打包（一个结构体只在本程序里传递、不序列化）；内存极紧张的嵌入式场景；字段多且都不需要取地址。
- **不适合**：网络协议、文件格式、共享内存、硬件寄存器、任何要跨编译器或跨语言交换的二进制数据。
- **写法建议**：所有位域显式写 `unsigned`（`unsigned char` / `unsigned int`）；同一结构体里统一基础类型；给关键位域加 `_Static_assert(sizeof(struct T) == 期望值, ...)`；用 `: 0` 明确分段；需要取地址、需要数组、需要序列化时，果断改回 `uint8_t` 加掩码。

## 编译与运行

用 gcc 或 clang 都能编译，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra bitfield.c -o bitfield
./bitfield
```

```bash
clang -std=c17 -Wall -Wextra bitfield.c -o bitfield
./bitfield
```

**常量赋给位域时越界会被警告**，这是发现"位宽写小了"的第一道防线：

```bash
clang -std=c17 -Wall -Wextra bitfield.c -o bitfield
# warning: implicit truncation from 'int' to bit-field changes value from 20 to 4
#          [-Wbitfield-constant-conversion]
```

GCC 下对应的是 `-Woverflow`（"overflow in conversion from 'int' to 'unsigned char:4' changes value"）。注意只有**常量**会触发；用变量赋值时编译器帮不上忙，运行时也不会报错，只能靠 `_Static_assert`、单元测试和对取值范围的检查。

想看编译器到底把每个位域放在哪一位，可以让 Clang 打印记录布局：

```bash
clang -std=c17 -Xclang -fdump-record-layouts -c bitfield.c -o bitfield.o
```

本平台对 `struct Status` 的输出是：

```asm
         0 | struct Status
     0:0-0 |   unsigned char enabled
     0:1-1 |   unsigned char ready
     0:2-2 |   unsigned char fault
     0:3-3 |   unsigned char dirty
     0:4-7 |   unsigned char mode
           | [sizeof=1, align=1]
```

`0:4-7` 的读法是"字节 0、第 4 到第 7 位"。同一份代码在别的平台上，这几行的位段会整体镜像，这就是"位序由实现决定"的可视化证据。

几点说明：

- `-fsanitize=address,undefined` 抓不到位域截断——无符号位域的截断是**定义良好**的，UBSan 只报真正越界 / 未对齐 / 溢出之类的 UB；
- 想发现"值超出位宽"的逻辑错误，只能靠 `-Wconversion` 加上显式的范围检查；
- `_Static_assert` 是 C11 起的关键字，配合 `sizeof` 可以把"我假设它是 1 字节"钉在编译期。

## 常见错误

### 用 `int` 当位域基底，以为能省到 1 字节 [WA]
位域的存储单元由声明类型决定，`unsigned int mode : 4` 仍然要占 4 个字节的单元。想紧凑就必须让基底也变小（`unsigned char`），否则"省了一半位宽"只体现在字段上，没体现在结构体大小上。

```c run id=bf-int-unit expect=OK
#include <stdio.h>

struct IntFlags {
    unsigned int tx   : 1;
    unsigned int rx   : 1;
    unsigned int err  : 1;
    unsigned int mode : 5;
};

struct CharFlags {
    unsigned char tx   : 1;
    unsigned char rx   : 1;
    unsigned char err  : 1;
    unsigned char mode : 5;
};

int main(void) {
    printf("int 基底=%zu 字节，char 基底=%zu 字节\n",
           sizeof(struct IntFlags), sizeof(struct CharFlags));
    return 0;
}
```
```output
int 基底=4 字节，char 基底=1 字节
```

两个结构体只用了 8 位，一个占 4 字节、一个占 1 字节；剩下的位并没有"留给别的变量"，而是被存储单元的对齐白白占掉了。

### 对位域取地址或用 `offsetof` [CE]
位域没有独立地址，`&s.enabled` 直接编译失败。需要"把某一位传出去"时，只能传整个结构体（或它的拷贝）、传一个表示"第几位"的索引，或者干脆改用 `uint8_t` 掩码。

```c run id=bf-address expect=CE
struct Status {
    unsigned char enabled : 1;
};

int main(void) {
    struct Status s = { 0 };
    unsigned char *p = &s.enabled;   /* error: address of bit-field requested */
    *p = 1;
    return 0;
}
```

### 把位域结构体直接对着协议字节 `memcpy` [WA|UB]
本平台上"第 1 个位域在最低位"是 Clang 的选择，不是 C 的保证。一旦对端换了编译器、换了字节序，或者结构体里插入了新字段，同一份代码读出的字段就整体错位。协议 / 文件 / 寄存器一律用定宽整数加显式移位，位域只留在程序内部。

### 用 `int` 位域存标志位，读回来是 -1 [WA]
`int flag : 1` 只有 0 和 −1 两个值。`flag = 1` 之后 `if (flag)` 为真，但 `flag == 1` 为假、`printf("%d")` 打印 `-1`，把它加到计数器里还会让总数变小。所有标志位、计数器都必须显式写 `unsigned`。

### 用位域操作硬件寄存器，读改写把别的位冲掉 [WA]
`reg->fault = 1` 会编译成对整个存储单元的"读—改—写"。寄存器里若有写 1 清零位、或硬件在两次访问之间更新了状态，这次回写就会把变化覆盖掉。驱动代码应使用 `volatile` 指针加显式掩码（`*p |= MASK;` / `*p &= ~MASK;`），并按手册确认是否需要整字写入。

## 客观题

### q-s4-bitfield-1 single
关于位域的内存布局，下列说法哪一个是正确的？

- [x] 位域在存储单元内的分配顺序、能否跨单元、单元的大小与对齐都由实现决定，所以不能拿位域结构体直接对接协议字节
  > 正确。C 标准只规定"相邻位域在同一个单元内紧挨着分配、值按位宽截断"，把分配方向（低位先还是高位先）、跨单元规则、单元对齐、`int` 位域的符号性全部留给实现。因此同一份位域声明在不同编译器上产出的字节可能互为镜像；协议 / 文件格式必须用定宽整数加显式移位来序列化。
- [ ] 位域总是从最低位开始分配，所以位域结构体可以直接当作协议格式使用
  > 错。"从最低位开始"只是小端平台上多数编译器的选择（本平台就是如此），标准并没有这样规定。大端平台或另一些 ABI 会把第一个位域放在最高位。依赖这个巧合的代码在本机测试通过，换一个编译器就整体错位。
- [ ] 位域成员和普通结构体成员一样，可以用 `&` 取地址传给函数
  > 错。位域没有独立地址，`&s.flag` 是编译错误（"address of bit-field requested"）。正因为不能取地址，位域也不能用 `scanf` 直接读、不能用 `offsetof`、不能有数组；需要指针语义时只能改用整型加掩码。
- [ ] `int flag : 1` 和 `unsigned int flag : 1` 完全等价，都能可靠地存 0 和 1
  > 错。`int` 位域是否有符号由实现决定，本平台上是**有符号**的：1 位的 `int` 只有 0 和 −1 两个值，`flag = 1` 读回来是 −1。`if (flag)` 看起来正常，但 `flag == 1` 为假、参与算术会把结果拉低。标志位必须显式声明为 `unsigned`。
- [ ] 位域一定比手动位运算省内存，所以应该尽量用位域代替移位和掩码
  > 错。位域省不省内存取决于声明类型：`unsigned int mode : 4` 仍然占用 4 字节的存储单元，四个 1 位标志加一个 4 位字段用 `unsigned int` 基底要 4 字节，用 `unsigned char` 基底才 1 字节；混用不同基底还会因为各自开单元而更浪费。手动移位虽然啰嗦，但字节数、位位置、字节序全部由源码决定，可移植性远好于位域。
