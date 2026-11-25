---
id: s4-type-punning
---

## 讲解

### 什么是类型双关
**类型双关**（type punning）指的是：把同一块内存里的字节，按**另一种类型**重新解释。例如一个 `float` 的 4 个字节，按 IEEE-754 是 `-2.5`，按 `uint32_t` 读就是 `0xC0200000`——字节没变，变的是"用什么类型去看它"。

C 里做这件事有三条路，**合法性完全不同**：

| 做法 | 例子 | C 标准怎么看 |
|---|---|---|
| 通过 union 读另一个成员 | `u.f = 1.0f; u.u` | 允许（值是实现定义的"重新解释"） |
| 通过指针强转 | `*(uint32_t *)&f` | **未定义行为**（违反严格别名 + 可能未对齐） |
| 用 `memcpy` 复制字节 | `memcpy(&u, &f, 4)` | 完全合法，最安全 |

下面把三条路都走一遍，看清它们的差别。

### 路线一：union 双关（C 允许）
union 的成员本来就共享同一块存储，所以"写 `f` 成员、读 `u` 成员"在 C 里是标准认可的写法：

```c run id=tp-union
#include <stdio.h>
#include <stdint.h>

typedef union {
    float f;
    uint32_t u;
} FloatBits;

int main(void) {
    FloatBits b;

    b.f = 1.0f;
    printf("1.0f  -> 0x%08X\n", (unsigned)b.u);

    b.f = -2.5f;
    printf("-2.5f -> 0x%08X\n", (unsigned)b.u);

    b.u = 0x40490FDBu;              /* 反过来：把位模式当 float 读 */
    printf("0x40490FDB -> %.6f\n", b.f);

    printf("sizeof(FloatBits) = %zu\n", sizeof(FloatBits));
    return 0;
}
```
```output
1.0f  -> 0x3F800000
-2.5f -> 0xC0200000
0x40490FDB -> 3.141593
sizeof(FloatBits) = 4
```

内存里发生的事只有一件：4 个字节被写进去，然后被按另一种类型读出来。

```memory title="FloatBits b; b.f = -2.5f（x86-64 小端，float 与 uint32_t 都是 4 字节）"
地址    | 内容 | 作为 b.f 的一部分     | 作为 b.u 的一部分 | 说明
b+0     | 00   | 尾数最低字节          | 最低字节          | 两个成员共用同一块 4 字节
b+1     | 00   | 尾数                  | 次低字节          |
b+2     | 20   | 尾数最高字节          | 次高字节          |
b+3     | C0   | 符号位 1 + 指数高位   | 最高字节          |
```

准确地说，C 标准（6.5.2.3）对"读非最后写入的成员"的规定是：**值是实现定义的**——被读取的字节按新类型的对象表示重新解释。它**不是**未定义行为，但也**不是**完全可移植：标准没有强制要求所有编译器都这么做。好消息是主流编译器（GCC、Clang、MSVC）都明确支持，这也是"用 union 看位模式"能在真实项目里通行的原因。

要注意：这条结论只属于 C。**C++ 里通过 union 读非活跃成员是未定义行为**（虽然很多编译器也接受），所以同一份代码在 C 和 C++ 里语义不同。

### 路线二：指针强转（未定义行为）
更"直接"的写法是绕开 union，直接把 `float *` 转成 `uint32_t *` 再解引用：

```c
float f = -2.5f;
uint32_t u = *(uint32_t *)&f;     /* 看起来能用，其实是 UB */
```

它违反的是**严格别名规则**（strict aliasing）。C 标准 6.5 第 7 段规定：一个对象的存储值只能通过下列类型的左值访问——

1. 与该对象**兼容**的类型；
2. 与该对象对应的**有符号/无符号**版本；
3. 包含该对象的**聚合类型**（结构体/union）；
4. **字符类型**（`char`、`signed char`、`unsigned char`）。

`float` 和 `uint32_t` 不在这个名单里，所以 `*(uint32_t *)&f` 是未定义行为。危险之处在于**它经常"看起来是对的"**：`-O0` 下编译器老老实实按地址读 4 字节，结果完全正确；换到 `-O2`，编译器可能认为"`f` 没被改过"而把结果缓存起来，或者把两次访问重排，于是结果莫名其妙地变错。**UB 不等于崩溃，它等于"编译器不再对你的代码负责"**。

指针强转还有一个物理层面的问题：**对齐**。每种类型都要求地址是某个值的倍数（`uint32_t` 要求 4），而从字节缓冲区里随便取一个地址，很可能不满足：

```c run id=tp-misaligned expect=UB
#include <stdio.h>
#include <stdint.h>

int main(void) {
    unsigned char buf[8] = { 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08 };
    uint32_t *p = (uint32_t *)(buf + 1);     /* buf+1 不是 4 的倍数 */
    printf("0x%08X\n", (unsigned)*p);        /* UB：未对齐读取 */
    return 0;
}
```

这一条本平台的 UBSan 抓得到（`load of misaligned address ... requires 4 byte alignment`），会判 `UB`。而"严格别名"那一半，任何 sanitizer 都抓不到——**抓不到不代表合法**。所以工程上的结论是：**永远不要用指针强转做双关**。

### 路线三：memcpy（最安全）
`memcpy` 复制的是字节，标准明确规定它等价于"逐字节访问"，所以既不违反别名规则，也不要求对齐：

```c run id=tp-memcpy
#include <stdio.h>
#include <stdint.h>
#include <string.h>

static uint32_t bits_of(float f) {
    uint32_t u;
    memcpy(&u, &f, sizeof u);        /* 合法：逐字节复制，无别名问题 */
    return u;
}

static float float_of(uint32_t u) {
    float f;
    memcpy(&f, &u, sizeof f);
    return f;
}

int main(void) {
    printf("1.0f  -> 0x%08X\n", (unsigned)bits_of(1.0f));
    printf("-2.5f -> 0x%08X\n", (unsigned)bits_of(-2.5f));
    printf("0x40490FDB -> %.6f\n", (double)float_of(0x40490FDBu));
    return 0;
}
```
```output
1.0f  -> 0x3F800000
-2.5f -> 0xC0200000
0x40490FDB -> 3.141593
```

结果和 union 版本**一模一样**，而且完全符合标准。性能上也不用担心：`sizeof u` 是编译期常量，编译器会把这种小 `memcpy` 直接展开成一条 `mov`，不会真的调用函数。

所以真实工程里的推荐顺序是：**先 `memcpy`，需要"同一块存储多种视图"时用 union，绝不用指针强转**。

### 路线四：字符类型可以访问任何对象
严格别名规则有一个重要例外：`char`、`signed char`、`unsigned char` 可以访问**任何**对象的字节。这就是十六进制查看器、序列化、哈希函数的工作原理：

```c run id=tp-bytes
#include <stdio.h>

static void dump_bytes(const void *p, size_t n) {
    const unsigned char *b = (const unsigned char *)p;   /* 字符指针不违反别名规则 */
    for (size_t i = 0; i < n; i++) {
        printf("%02X%s", (unsigned)b[i], i + 1 == n ? "\n" : " ");
    }
}

int main(void) {
    unsigned int v = 0x12345678u;
    double d = 1.0;

    printf("unsigned int 的 %zu 个字节：", sizeof v);
    dump_bytes(&v, sizeof v);

    printf("double 的 %zu 个字节：", sizeof d);
    dump_bytes(&d, sizeof d);
    return 0;
}
```
```output
unsigned int 的 4 个字节：78 56 34 12
double 的 8 个字节：00 00 00 00 00 00 F0 3F
```

`unsigned int` 的字节是 `78 56 34 12`，说明本平台是**小端**（低字节在低地址）；`double 1.0` 的字节是 `00 00 00 00 00 00 F0 3F`，正是 `0x3FF0000000000000` 的小端排列。注意这条路线只能"看字节"，不能"把字节当成另一种类型来用"——想得到 `uint32_t` 的值，还是要 `memcpy` 出来。

### 什么时候真的需要双关
双关不是奇技淫巧，这些场景离不开它：

1. **查看/构造 IEEE-754 位模式**：判断浮点数是不是 NaN、取出符号位、手写 `nextafter`；
2. **序列化与网络协议**：把整数按固定字节序写进缓冲区，再读回来；
3. **哈希函数**：把任意字节流当整数混合（FNV、MurmurHash 都是这么做的）；
4. **位运算技巧**：经典的快速平方根倒数 `0x5f3759df` 就是拿 `float` 的位模式当整数算。

这些场景的正确写法都是同一个套路：**按字节处理**（`memcpy` 或 `unsigned char` 循环），而不是拿指针换个类型去解引用。

## 编译与运行

用 gcc 或 clang 编译都行，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra -O2 punning.c -o punning
./punning
```

```bash
clang -std=c17 -Wall -Wextra -O2 punning.c -o punning
./punning
```

检查别名相关的隐患，可以加上这两个选项：

```bash
clang -std=c17 -O2 -Wall -Wextra -Wstrict-aliasing=2 punning.c -o punning
```

`-Wstrict-aliasing` 只能抓到一部分模式（它靠类型推断，不是完备的），所以**没有警告不代表没有 UB**。

想看编译器到底怎么处理"小 memcpy"，读一眼汇编：

```bash
clang -std=c17 -O2 -S punning.c -o punning.s
```

`bits_of` 在 `-O2` 下通常只剩一条 `movd`/`mov`：`memcpy` 被完全内联成一次内存访问，和手写指针强转的机器码一样快——**安全不等于慢**。

几点说明：

- 用 `-fsanitize=address,undefined` 编译，能抓住**未对齐访问**和**越界访问**这两类双关事故；但它抓不到严格别名违规，因为那是"类型系统层面"的 UB，运行期无法检测；
- 判断字节序不用查资料，写个 union 或 `memcpy` 实验即可：写 `1` 读第一个字节，得到 `1` 就是小端；
- 双关代码一定要在注释里写清"这里依赖小端 / 依赖 float 是 IEEE-754 32 位"，否则换平台就是灾难。

## 常见错误

### 用指针强转做双关 [UB]
`uint32_t u = *(uint32_t *)&f;` 是最常见、也最容易被"它明明能跑"辩护的写法。它违反严格别名规则，属于未定义行为；而且一旦地址来自字节缓冲区，还会叠加未对齐的问题。改为 `memcpy` 或 union 只需要两行，没有任何理由冒这个风险。

```c
/* 错 */
float f = -2.5f;
uint32_t bad = *(uint32_t *)&f;

/* 对：路线三 */
uint32_t good;
memcpy(&good, &f, sizeof good);
```

### 从字节缓冲区里直接强转读多字节整数 [UB]
协议解析最常见的写法是 `*(uint32_t *)(buf + off)`，而 `off` 完全可能不是 4 的倍数。这类代码在 x86 上"能跑"（x86 允许未对齐访问，只是慢），到了 ARM 上直接触发硬件异常；在本平台则被 UBSan 判 `UB`。正确写法是逐字节拼装或 `memcpy`。

```c run id=tp-err-unpack expect=UB
#include <stdio.h>
#include <stdint.h>

int main(void) {
    unsigned char buf[8] = { 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88 };
    int off = 3;
    uint32_t *p = (uint32_t *)(buf + off);   /* off 不是 4 的倍数 */
    printf("0x%08X\n", (unsigned)*p);
    return 0;
}
```

### 用窄类型指针去读更宽的类型 [RE]
`short s; *(int *)&s` 看起来只是"多读两个字节"，实际上越过了对象边界。本平台的 ASan 会报 `stack-buffer-overflow`（读 4 字节但对象只有 2 字节），判 `RE`。

```c run id=tp-err-overread expect=RE
#include <stdio.h>

int main(void) {
    short s = 0x1234;
    int *p = (int *)&s;          /* 错：int 比 short 宽，会读过界 */
    printf("%d\n", *p);
    return 0;
}
```

### 以为 union 双关在所有语言里都合法 [WA]
C 允许通过 union 读另一个成员（实现定义的重解释），**C++ 不允许**（读非活跃成员是 UB）。把这段代码从 C 搬到 C++，或者交给按 C++ 规则优化的编译器处理，行为就可能变。跨语言共享的代码一律用 `memcpy`。

### 用 memcpy 时大小写成指针的大小 [RE]
`memcpy(&u, &f, sizeof &f)` 复制的是**指针**的 8 字节，而不是 `float` 的 4 字节——多读 4 字节，ASan 会判越界。`memcpy` 的第三个参数永远应该写 `sizeof 目标`（或 `sizeof(类型)`），并且在两边大小一致时才能用。

## 客观题

### q-s4-type-punning-1 single
下面的四段代码都要"取出 `float f` 的位模式存进 `uint32_t u`"。在 C 语言里，哪一段是**未定义行为**？

```c
/* A */ union { float f; uint32_t u; } x; x.f = f; u = x.u;
/* B */ memcpy(&u, &f, sizeof u);
/* C */ u = *(uint32_t *)&f;
/* D */ unsigned char *p = (unsigned char *)&f;
        for (int i = 0; i < 4; i++) ((unsigned char *)&u)[i] = p[i];
```

- [x] C
  > 正确。`*(uint32_t *)&f` 通过一个与 `float` 不兼容的类型访问 `float` 对象，违反严格别名规则（C 标准 6.5p7），是未定义行为。它在本平台 `-O0` 下往往"看起来正确"，但优化器没有任何义务保持这个结果，任何 sanitizer 也抓不到它。
- [ ] A
  > 错。通过 union 读非最后写入的成员在 C 里是允许的：标准把结果定义为"按新类型的对象表示重新解释"（实现定义），GCC/Clang/MSVC 都明确支持。注意它在 C++ 里才是 UB，题目问的是 C。
- [ ] B
  > 错。`memcpy` 复制的是字节，标准明确规定它按字符访问，既不违反别名规则也不要求对齐，是最安全的双关方式。`sizeof u` 是编译期常量，`-O2` 下会被内联成一条 `mov`。
- [ ] D
  > 错。`unsigned char` 是严格别名规则明确豁免的字符类型，可以访问任何对象的字节。这段代码逐字节复制，完全合法——它其实就是手写版的 `memcpy`，只是慢一些。
