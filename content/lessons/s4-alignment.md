---
id: s4-alignment
---

## 讲解

### 为什么结构体里会有"看不见的空洞"
结构体在源码里是一组成员，但在内存里，**编译器会在成员之间插入填充字节**。这不是编译器"浪费内存"，而是 CPU 和 ABI 的要求：

- CPU 访问内存时，通常要求数据的起始地址是它自身大小的整数倍。例如 4 字节的 `int` 最好落在 4 的倍数地址上，8 字节的 `double` 落在 8 的倍数地址上；
- 一次总线上读取的宽度是固定的，跨边界访问会被拆成两次，甚至在某些架构上直接触发异常；
- 所以 ABI（应用二进制接口）规定了每种类型的**对齐要求**（alignment），编译器据此安排成员位置。

C11 提供了 `_Alignof` 直接查询对齐要求，`sizeof` 查询大小。先看看本平台（x86-64）上常见类型的这两个值：

```c run id=align-basic-types
#include <stdio.h>

int main(void) {
    printf("char       size=%zu align=%zu\n", sizeof(char), _Alignof(char));
    printf("short      size=%zu align=%zu\n", sizeof(short), _Alignof(short));
    printf("int        size=%zu align=%zu\n", sizeof(int), _Alignof(int));
    printf("long long  size=%zu align=%zu\n", sizeof(long long), _Alignof(long long));
    printf("double     size=%zu align=%zu\n", sizeof(double), _Alignof(double));
    printf("void *     size=%zu align=%zu\n", sizeof(void *), _Alignof(void *));
    return 0;
}
```
```output
char       size=1 align=1
short      size=2 align=2
int        size=4 align=4
long long  size=8 align=8
double     size=8 align=8
void *     size=8 align=8
```

注意"大小"和"对齐"是两个不同的概念：`char[10]` 大小是 10，但对齐要求只有 1；`double` 大小和对齐都是 8；指针在 64 位平台上是 8 字节、8 对齐。**对齐要求通常等于类型大小，但数组和结构体是例外：数组看元素类型的对齐值，结构体看成员里最大的对齐值。**

### 规则一：每个成员的偏移必须是它对齐值的倍数
编译器放下一个成员时，先看"当前已经用掉多少字节"，把它**向上取整**到该成员对齐值的倍数，再放这个成员。中间空出来的字节就是填充（padding）。

### 规则二：结构体的对齐值等于成员里最大的对齐值
结构体本身也要能被数组连续摆放，所以它的对齐值取所有成员（包括嵌套结构体）对齐值的最大值。

### 规则三：结构体总大小要向上取整到结构体对齐值
这样 `struct A arr[10]` 里每个元素的起始地址都能对齐。最后多出来的字节叫**尾部填充**（tail padding）。

下面这个结构体同时展示了内部填充和尾部填充：

```c run id=align-struct-a
#include <stdio.h>
#include <stddef.h>

struct A {
    char c;
    int i;
    char d;
};

int main(void) {
    printf("sizeof=%zu align=%zu\n", sizeof(struct A), _Alignof(struct A));
    printf("c=%zu i=%zu d=%zu\n",
           offsetof(struct A, c), offsetof(struct A, i), offsetof(struct A, d));
    printf("members=%zu\n", sizeof(char) + sizeof(int) + sizeof(char));
    return 0;
}
```
```output
sizeof=12 align=4
c=0 i=4 d=8
members=6
```

把过程一步步写出来：

| 步骤 | 已用字节 | 成员 | 对齐 | 起始偏移 | 放完后的已用字节 |
|---|---|---|---|---|---|
| 1 | 0 | `char c` | 1 | 0 | 1 |
| 2 | 1 | `int i` | 4 | 1 向上取整到 4 | 8 |
| 3 | 8 | `char d` | 1 | 8 | 9 |
| 4 | 9 | （尾部） | 结构体对齐 4 | 9 向上取整到 12 | 12 |

所以 `sizeof(struct A) == 12`，而三个成员加起来只有 6 字节：`[1,4)` 这 3 字节是内部填充，`[9,12)` 这 3 字节是尾部填充。**`sizeof` 永远大于等于成员大小之和，等号只在"恰好没有填充"时成立。**

### offsetof：偏移量要用标准宏来取
C 标准在 `<stddef.h>` 里提供了 `offsetof(type, member)`，返回成员相对于结构体起始地址的**字节偏移**（类型是 `size_t`）。它不需要真的有一个结构体对象，在编译期就能算出来：

```c run id=align-offsetof-packet
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

int main(void) {
    printf("sizeof=%zu align=%zu\n", sizeof(struct Packet), _Alignof(struct Packet));
    printf("version=%zu\n", offsetof(struct Packet, version));
    printf("seq=%zu\n", offsetof(struct Packet, seq));
    printf("length=%zu\n", offsetof(struct Packet, length));
    printf("timestamp=%zu\n", offsetof(struct Packet, timestamp));
    printf("flags=%zu\n", offsetof(struct Packet, flags));
    printf("members=%zu\n",
           sizeof(uint8_t) + sizeof(uint32_t) + sizeof(uint16_t) + sizeof(uint64_t) + sizeof(uint8_t));
    return 0;
}
```
```output
sizeof=32 align=8
version=0
seq=4
length=8
timestamp=16
flags=24
members=16
```

按规则推算：`version` 占 1 字节；`seq` 要 4 对齐，于是 `[1,4)` 空出 3 字节；`length` 是 2 对齐，紧跟在 8；`timestamp` 要 8 对齐，于是 `[10,16)` 空出 6 字节；`flags` 在 24；最后整个结构体要 8 对齐，`[25,32)` 空出 7 字节。总填充 = 3 + 6 + 7 = 16 字节，所以 `sizeof` 是 32，而成员只占 16 字节——**一半是填充**。

`offsetof` 也可以和"成员地址减结构体起始地址"互相印证，但后者必须先有一个真实对象、还依赖具体实现；`offsetof` 本身就是标准提供的写法，不需要对象：

```c run id=align-offsetof-config
#include <stdio.h>
#include <stddef.h>

struct Config {
    char key[10];
    double value;
    int enabled;
    short port;
};

int main(void) {
    printf("sizeof=%zu align=%zu\n", sizeof(struct Config), _Alignof(struct Config));
    printf("offsetof(value)=%zu\n", offsetof(struct Config, value));
    printf("offsetof(enabled)=%zu\n", offsetof(struct Config, enabled));
    printf("offsetof(port)=%zu\n", offsetof(struct Config, port));
    printf("手算 key 后面就是 value 会得到 %zu\n", sizeof(((struct Config *)0)->key));
    return 0;
}
```
```output
sizeof=32 align=8
offsetof(value)=16
offsetof(enabled)=24
offsetof(port)=28
手算 key 后面就是 value 会得到 10
```

`key` 是 `char[10]`，对齐要求 1；下一个 `double` 要 8 对齐，所以 `value` 不在 10，而被推到了 16。手算"前一个成员大小累加"必然算错。

### 为什么不能手算偏移
初学者常问：既然规则这么清楚，我自己写 `10` 或 `10 + 6` 不行吗？不行，原因有四条：

1. **对齐要求由平台 ABI 决定**，不只看类型大小。32 位和 64 位程序里指针大小不同，`long` 在 Windows 上是 4 字节、在 Linux 上是 8 字节，`double` 在 32 位 x86 上甚至可能只要求 4 对齐；
2. **`#pragma pack`、`__attribute__((packed))`、`#pragma scalar_storage_order` 等会改变布局**，你手算的常量会全部失效；
3. **位域、匿名结构体、嵌套结构体**的布局规则更复杂，而且位域根本不能传给 `offsetof`；
4. 编译器完全可以在不改变语义的前提下调整**填充的多少**（标准只要求满足对齐，不要求最小填充），换编译器、换版本、换优化选项都可能不同。

`offsetof` 是唯一"跟着编译器走"的写法：结构体定义一改，偏移自动重新计算；而硬编码的数字不会。它也避免了打印地址：地址每次运行都可能不同（ASLR），而**偏移是确定的**，可以放心地作为程序的输出、写进测试用例。这也是本平台所有内存布局题都要求输出 `sizeof` / `offsetof` 数值、而不是打印 `0x...` 地址的原因。

### 填充字节里到底是什么
填充字节没有成员名，你也不能通过成员访问它们。它们的内容**不是你可以依赖的语义**：

- 全局/静态对象没有显式初始化时，标准要求成员和填充都清零；
- 局部变量 `struct A a;` 不初始化，填充里是栈上的残留数据；
- `struct A a = {0};` 在初始化时会把填充也清零（聚合初始化沿用静态存储期的规则），但之后对成员赋值、整体赋值或传参，填充就可能变成不确定的值；标准从不保证填充内容一直有效；
- 用 `memcmp(&a, &b, sizeof a)` 比较两个结构体，填充不同就会得到"不相等"，哪怕所有成员都相同（比如其中一个来自未初始化的局部变量）；
- 把结构体直接 `fwrite` 到文件，填充字节也会被写进去，文件格式会随编译器和平台变化。

所以：**比较结构体要逐成员比较；序列化要逐成员写；不要把填充当成 0，也不要把结构体的内存布局当成协议。** 网络协议里的"包头"通常用 `#pragma pack(1)` 或手工逐字节打包，那是下一节的内容。

### 填充会随着数组成倍放大
单个结构体浪费 16 字节看起来不多，但结构体数组会把这份浪费乘以元素个数：

```c run id=align-array-cost
#include <stdio.h>
#include <stdint.h>

struct Packet {
    uint8_t version;
    uint32_t seq;
    uint16_t length;
    uint64_t timestamp;
    uint8_t flags;
};

int main(void) {
    struct Packet arr[1000];
    printf("sizeof(struct Packet) = %zu\n", sizeof(struct Packet));
    printf("sizeof arr[1000]      = %zu\n", sizeof arr);
    printf("成员实际占用          = %zu\n", 1000 * (sizeof(uint8_t) + sizeof(uint32_t) +
                                                     sizeof(uint16_t) + sizeof(uint64_t) + sizeof(uint8_t)));
    return 0;
}
```
```output
sizeof(struct Packet) = 32
sizeof arr[1000]      = 32000
成员实际占用          = 16000
```

数组占了 32000 字节，成员真正需要的是 16000 字节，另外一半是填充。数据量大时，这不仅浪费内存，还会让缓存里能装下的元素变少——同样的缓存行，装 32 字节的结构体只能放 2 个，装 16 字节的能放 4 个。下一节"调整成员顺序"就是专门解决这个问题的。

### 把 Packet 的 32 字节画出来
下面这张表把 `struct Packet` 的每个字节都标了出来（`offsetof` 的数值就是左列的范围起点）：

```memory title="struct Packet：sizeof=32，成员只占 16 字节，填充占 16 字节"
偏移 | 字节范围 | 内容 | 为什么在这里
0 | 0 | version | uint8_t，对齐 1，放在开头
1-3 | 1..3 | 填充 | 让 seq 的偏移 4 是 4 的倍数
4-7 | 4..7 | seq | uint32_t，对齐 4
8-9 | 8..9 | length | uint16_t，对齐 2，8 已经是 2 的倍数
10-15 | 10..15 | 填充 | 让 timestamp 的偏移 16 是 8 的倍数
16-23 | 16..23 | timestamp | uint64_t，对齐 8
24 | 24 | flags | uint8_t，对齐 1
25-31 | 25..31 | 填充 | 结构体总大小要取整到最大对齐 8 的倍数
```

记住这张图的读法：**"填充"不是成员，`offsetof` 也取不到它；它只是为了让下一个成员或整个结构体满足对齐要求而留下的空洞。**

## 编译与运行

用 gcc 或 clang 编译，`-Wall -Wextra` 打开常用警告：

```bash
gcc -std=c17 -Wall -Wextra align.c -o align
./align
```

```bash
clang -std=c17 -Wall -Wextra align.c -o align
./align
```

`offsetof` 和 `_Alignof` 都需要包含头文件：`offsetof` 在 `<stddef.h>`，`_Alignof` 是关键字（C11 起），不需要头文件。

想看编译器到底怎么排布结构体，可以让 Clang 把记录布局打印出来：

```bash
clang -std=c17 -Xclang -fdump-record-layouts align.c -o align
```

输出里会逐个成员列出偏移和填充，例如：

```text
*** Dumping AST Record Layout
         0 | struct Packet
         0 |   unsigned char version
         4 |   unsigned int seq
         8 |   unsigned short length
        16 |   unsigned long long timestamp
        24 |   unsigned char flags
           | [sizeof=32, align=8]
```

用 GCC 时可以用 `-Wpadded` 让编译器在插入填充时给出警告（Clang 也支持这个选项）：

```bash
clang -std=c17 -Wall -Wextra -Wpadded align.c -o align
```

`-Wpadded` 会为每个填充位置输出一条警告，非常适合检查"结构体是不是排得太松"，但不适合日常编译（正常的协议结构体几乎都会触发）。想在 32 位模型下对比布局，可以加 `-m32`（需要 32 位运行库；本平台默认是 64 位，不加也能理解规则）。

最后再强调一次：**要验证布局，写一个打印 `sizeof` 和 `offsetof` 的小程序，而不是打印地址。** 地址受 ASLR 影响、每次运行都不同；偏移是编译期常量，稳定、可比较、可以写进测试用例。

## 常见错误

### 把成员大小直接相加当成 sizeof [WA]
`sizeof` 包含填充，不等于成员大小之和。下面这段代码把两个值都打印出来，差距一目了然：

```c run expect=OK
#include <stdio.h>
#include <stdint.h>

struct Packet {
    uint8_t version;
    uint32_t seq;
    uint16_t length;
    uint64_t timestamp;
    uint8_t flags;
};

int main(void) {
    size_t sum = sizeof(uint8_t) + sizeof(uint32_t) + sizeof(uint16_t) +
                 sizeof(uint64_t) + sizeof(uint8_t);
    printf("成员相加 = %zu\n", sum);
    printf("sizeof   = %zu\n", sizeof(struct Packet));
    printf("填充     = %zu\n", sizeof(struct Packet) - sum);
    return 0;
}
```
```output
成员相加 = 16
sizeof   = 32
填充     = 16
```

如果拿 16 去 `malloc` 一个"Packet 数组"，后面的元素会全部错位，写入时直接踩坏堆内存。

### 忘记尾部填充 [WA]
只算到最后一个成员结束是不够的：结构体总大小还要向上取整到最大对齐值。

```c run expect=OK
#include <stdio.h>
#include <stddef.h>

struct S {
    char c;
    int i;
    char d;
};

int main(void) {
    size_t end = offsetof(struct S, d) + sizeof(char);
    printf("最后一个成员结束于 %zu\n", end);
    printf("sizeof(struct S) = %zu\n", sizeof(struct S));
    printf("尾部填充 = %zu\n", sizeof(struct S) - end);
    return 0;
}
```
```output
最后一个成员结束于 9
sizeof(struct S) = 12
尾部填充 = 3
```

数组 `struct S a[2]` 的第二个元素必须从偏移 12 开始，否则 `a[1].i` 就不在 4 的倍数上。尾部填充就是为了让每个元素的起始地址都对齐。

### 用两个成员地址相减来"手算偏移" [WA]
`&s.d - &s.c` 这种写法先不说类型不同会编译报错，即使强制转成 `char *`，得到的也是**两个成员之间的差值**，不是"成员相对结构体起始地址的偏移"：

```c run expect=OK
#include <stdio.h>
#include <stddef.h>

struct Config {
    char key[10];
    double value;
    int enabled;
};

int main(void) {
    struct Config cfg;
    long diff = (long)((char *)&cfg.enabled - (char *)&cfg.key);
    printf("enabled - key = %ld\n", diff);
    printf("offsetof(enabled) = %zu\n", offsetof(struct Config, enabled));
    printf("两者差了一个 key 的起点偏移 %zu\n", offsetof(struct Config, key));
    return 0;
}
```
```output
enabled - key = 24
offsetof(enabled) = 24
两者差了一个 key 的起点偏移 0
```

这个例子里 `key` 恰好从 0 开始，所以两个数相等；把 `key` 换成不是第一个成员，或者结构体里再有嵌套，差值就会差出一个偏移。想取偏移就用 `offsetof`，想验证它就直接打印 `offsetof` 的数值，不要用"成员之间的差值"倒推，也不要把数字写死。

### 依赖填充字节的内容，用 memcmp 比较结构体 [WA]
填充字节不属于任何成员，标准也没有赋予它们稳定的值。即使 `= {0}` 在初始化时把填充清零了，之后对成员赋值、整体拷贝或传参，填充内容都可能变化；两个成员完全相同的结构体，用 `memcmp` 比较可能得到"不相等"。正确做法是逐成员比较，而不是比较整块内存。同样的道理，把结构体直接 `fwrite` 成文件格式也不可靠：填充字节会跟着写进去，文件内容会随编译器和平台变化。

### 用 `int` / `%d` 打印 `sizeof` 和 `offsetof` [UB]
`sizeof` 和 `offsetof` 的结果类型都是 `size_t`（无符号的 64 位整数），必须用 `%zu`。写成 `printf("%d", sizeof x)` 属于变参类型不匹配，是未定义行为；在 64 位平台上可能"碰巧"打印正确，换平台或换参数位置就错了。`offsetof` 同理。编译器一般会用 `-Wformat` 给出警告，不要忽略。

## 客观题

### q-s4-alignment-1 single
在 x86-64（本平台）上，`struct S { char a; int b; short c; };` 的 `sizeof(struct S)` 和 `offsetof(struct S, b)` 分别是多少？

- [x] `sizeof` 是 12，`offsetof(S, b)` 是 4
  > 正确。`a` 占偏移 0；`b` 要 4 对齐，偏移 1 向上取整到 4，所以 `offsetof(S, b) == 4`；`c` 是 2 对齐，紧跟在 8；最后一个成员结束于 10，结构体最大对齐是 4，向上取整到 12，所以 `sizeof` 是 12。填充为 `[1,4)` 和 `[10,12)`，共 5 字节。
- [ ] `sizeof` 是 7，`offsetof(S, b)` 是 1
  > 错。7 是三个成员大小直接相加（1 + 4 + 2），没有考虑任何填充；`b` 也不可能落在偏移 1，因为 `int` 要求 4 字节对齐。
- [ ] `sizeof` 是 8，`offsetof(S, b)` 是 4
  > 错。8 只考虑了 `b` 前面的 3 字节填充，忘了最后一个成员 `c` 结束后还要把总大小取整到 4 的倍数：10 要补到 12。`sizeof` 必须是结构体对齐值（4）的倍数，8 虽然是 4 的倍数，但小于实际用到的 10 字节。
- [ ] `sizeof` 是 12，`offsetof(S, b)` 是 1
  > 错。`sizeof` 算对了，但 `b` 的偏移不是 1：`int` 的对齐要求是 4，编译器会在 `a` 后面插入 3 字节填充，把 `b` 放到偏移 4。
