---
id: s7-iv-bits-endian
---

## 讲解

### 口述版答案
面试官问"说说你会哪些位运算技巧，怎么判断大小端"，按下面七点回答：

1. **消掉最低位的 1**：`x & (x - 1)`。用它判断 2 的幂（`x != 0 && (x & (x - 1)) == 0`）、统计 1 的个数（循环消位，循环次数 = 1 的个数）。
2. **取出最低位的 1**：`x & (~x + 1)`，也就是 `x & -x`。求 lowbit、树状数组、快速幂都要用；**对无符号数永远安全**，对有符号的 `INT_MIN` 取负是 UB。
3. **统计 1 的个数**：`while (x) { x &= x - 1; count++; }`，时间复杂度只与 1 的个数有关；C 还有 `__builtin_popcount`。
4. **交换两个数**：`a ^= b; b ^= a; a ^= b;`。优点是省一个临时变量；缺点是**当 a、b 是同一个变量时会把值清零**，而且可读性差，工程上不推荐。写成一行 `a ^= b ^= a ^= b;` 更是 UB（同一表达式里多次修改 a）。
5. **移位的红线**：移位位数必须 `0 ≤ n < 位宽`，否则 UB；对负数左移是 UB；对负数右移是**实现定义**（算术右移还是逻辑右移由实现决定）。
6. **判断大小端两种写法**：`union { uint32_t w; unsigned char b[4]; } u; u.w = 1; u.b[0] == 1` 是小端；或者 `uint32_t v = 1; *(unsigned char *)&v == 1`。**两种写法本质相同：拿一个多字节整数，看它的最低字节落在低地址还是高地址**。
7. **字节序转换**：网络字节序是**大端**，x86 是**小端**，所以跨网络传输要用 `htonl`/`ntohl`（16 位是 `htons`/`ntohs`）；也可以自己移位拼：`(x & 0xFF) << 24 | ...`。

一句收尾：**小端 = 低字节放低地址，大端 = 高字节放低地址（"大端更符合人从左到右的读法"）**。

### 代码版答案
第一段：四个最常用的位技巧一起跑一遍，重点看 `x = 0` 和 `x = 0x80000000` 这两个边界——它们分别对应"忘判 0"和"有符号取负溢出"两个经典 bug：

```c run id=be-tricks
#include <stdio.h>

static int is_pow2(unsigned int x) {
    return x != 0u && (x & (x - 1u)) == 0u;   /* 去掉最低位的 1，看是否为 0 */
}

static int popcount(unsigned int x) {
    int c = 0;
    while (x != 0u) {
        x &= x - 1u;                          /* 每轮消掉最低位的 1 */
        c++;
    }
    return c;
}

static unsigned int lowbit(unsigned int x) {
    return x & (~x + 1u);                     /* 等价于 x & -x，但对无符号数永远安全 */
}

int main(void) {
    unsigned int v[6] = { 0u, 1u, 6u, 8u, 0x80000000u, 0xFFFFFFFFu };
    for (int i = 0; i < 6; i++) {
        printf("x=%08X pow2=%d bits=%d lowbit=%08X\n",
               v[i], is_pow2(v[i]), popcount(v[i]), lowbit(v[i]));
    }
    return 0;
}
```
```output
x=00000000 pow2=0 bits=0 lowbit=00000000
x=00000001 pow2=1 bits=1 lowbit=00000001
x=00000006 pow2=0 bits=2 lowbit=00000002
x=00000008 pow2=1 bits=1 lowbit=00000008
x=80000000 pow2=1 bits=1 lowbit=80000000
x=FFFFFFFF pow2=0 bits=32 lowbit=00000001
```

第二段：判断大小端。两种写法本质一样——把一个多字节整数的最低字节放到"低地址"上看它读出来是多少。本机是 x86-64，所以结果是**小端**：

```c run id=be-detect
#include <stdio.h>
#include <stdint.h>

union probe {
    uint32_t word;
    unsigned char bytes[4];
};

int main(void) {
    union probe u;
    u.word = 0x01020304u;
    printf("union  : bytes = %02X %02X %02X %02X\n", u.bytes[0], u.bytes[1], u.bytes[2], u.bytes[3]);

    uint32_t v = 0x01020304u;
    const unsigned char *p = (const unsigned char *)&v;
    printf("pointer: bytes = %02X %02X %02X %02X\n", p[0], p[1], p[2], p[3]);

    printf("本机字节序：%s\n", u.bytes[0] == 0x04u ? "小端（little-endian）" : "大端（big-endian）");
    return 0;
}
```
```output
union  : bytes = 04 03 02 01
pointer: bytes = 04 03 02 01
本机字节序：小端（little-endian）
```

第三段：字节序转换。`swap32` 把 4 个字节的顺序整个倒过来，转两次就回到原值；从字节流拼回整数时，要按"你希望的字节序"来拼——下面按大端拼，所以 `12 34 56 78` 拼成 `0x12345678`：

```c run id=be-swap
#include <stdio.h>
#include <stdint.h>

static uint32_t swap32(uint32_t x) {
    return ((x & 0x000000FFu) << 24) |
           ((x & 0x0000FF00u) << 8) |
           ((x & 0x00FF0000u) >> 8) |
           ((x & 0xFF000000u) >> 24);
}

int main(void) {
    uint32_t v = 0x12345678u;
    uint32_t s = swap32(v);
    printf("v=%08X swapped=%08X roundtrip=%08X\n", v, s, swap32(s));

    unsigned char be[4] = { 0x12, 0x34, 0x56, 0x78 };   /* 大端字节流 */
    uint32_t from_bytes = ((uint32_t)be[0] << 24) | ((uint32_t)be[1] << 16) |
                          ((uint32_t)be[2] << 8) | (uint32_t)be[3];
    printf("大端字节 12 34 56 78 -> %08X\n", from_bytes);
    return 0;
}
```
```output
v=12345678 swapped=78563412 roundtrip=12345678
大端字节 12 34 56 78 -> 12345678
```

第四段：**反面教材**。`1 << 31` 在 32 位 `int` 上溢出（`2^31` 超出 `int` 的正数范围），是未定义行为。本平台的 UBSan 会直接报 `left shift of 1 by 31 places cannot be represented in type 'int'`，程序以 `UB` 结束：

```c run id=be-shift-ub expect=UB
#include <stdio.h>

int main(void) {
    int bad = 1 << 31;      /* 2^31 超出 int 的正数范围：未定义行为 */
    printf("%d\n", bad);
    return 0;
}
```

正确写法是 `1u << 31`（无符号，结果是 `0x80000000u`）或 `0x80000000` 直接写十六进制常量。

### 大小端到底在说什么
"端（endianness）"描述的是**多字节整数在内存里的字节顺序**。同一个 `0x01020304`，两种机器的排布正好相反：

```memory title="0x01020304 在两种机器上的字节排布（起始地址 0x1000，地址为示意）"
地址 | 小端（x86/x64） | 大端（网络字节序） | 说明
0x1000 | 0x04 | 0x01 | 最低地址：小端放最低字节，大端放最高字节
0x1001 | 0x03 | 0x02 | 次低地址
0x1002 | 0x02 | 0x03 | 次高地址
0x1003 | 0x01 | 0x04 | 最高地址
0x1004 | 下一个变量 | 下一个变量 | 4 字节整数结束，正好占满 4 个地址
```

由此可以解释三件事：

- **为什么用 `unsigned char *` 看**：`char` 是最小寻址单位，标准保证可以用它逐字节检查任何对象的表示；
- **为什么不能直接用 `char` 判断符号**：`char` 是否有符号由实现决定，`0x80` 可能读成 `-128`；比较字节序要用 `unsigned char`，并且拿 `0x04` 这种**高低位不同**的字节来比；
- **为什么网络传输要转换**：协议规定"线上按大端"，x86 发出去之前必须 `htonl`，收到之后 `ntohl`；只传单字节（`char`/`uint8_t`）时不需要转换。

### 位运算技巧的边界条件
| 技巧 | 写法 | 边界/陷阱 |
|---|---|---|
| 判断 2 的幂 | `x != 0 && (x & (x - 1)) == 0` | 忘了 `x != 0` 会把 0 判成 2 的幂 |
| 消掉最低位的 1 | `x & (x - 1)` | `x = 0` 时结果仍是 0，循环要判 `x != 0` |
| 取出最低位的 1 | `x & (~x + 1u)` | 用 `-x` 时有符号 `INT_MIN` 取负是 UB |
| 统计 1 的个数 | `while (x) { x &= x - 1; c++; }` | 循环次数 = 1 的个数，不是位宽 |
| 交换两数 | `a ^= b; b ^= a; a ^= b;` | `a`、`b` 是同一变量时结果变 0；可读性差 |
| 取第 k 位 | `(x >> k) & 1u` | `k` 必须小于位宽，否则移位 UB |
| 置第 k 位 | `x \|= 1u << k` | 用 `1u` 而不是 `1`，避免第 31 位溢出 |

### 为什么"有符号移位"不能想当然
- **左移**：标准要求 `E1 × 2^E2` 在结果类型里可表示，否则 UB。所以 `1 << 31`、`-1 << 1` 都是 UB；
- **右移**：正数右移是除以 2 的幂（向零取整），负数右移是**实现定义**——算术右移补 1（`-3 >> 1 == -2`），逻辑右移补 0。可移植代码要用无符号类型做位运算，或者用除法代替负数右移。

面试里常被追问"怎么在不引入 UB 的前提下取出最低位的 1"，标准答案是：**参数类型用 `unsigned`，写成 `x & (~x + 1u)`**。

## 编译与运行

用 gcc 或 clang 编译都行，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra bits.c -o bits
./bits
```

```bash
clang -std=c17 -Wall -Wextra bits.c -o bits
./bits
```

位运算的 UB 编译器不会全部报警，一定要开 sanitizer：

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=undefined,address -fno-sanitize-recover=all bits.c -o bits
./bits
```

`1 << 31` 会得到这样的报告：

```text
bits.c:5:17: runtime error: left shift of 1 by 31 places cannot be represented in type 'int'
SUMMARY: UndefinedBehaviorSanitizer: undefined-behavior bits.c:5:17
```

想确认本机的字节序，除了跑程序，还可以直接看编译器预定义的宏：

```bash
clang -dM -E - < /dev/null | grep -i endian
```

x86-64 上会看到 `__ORDER_LITTLE_ENDIAN__` 这类宏；在代码里也可以用 `#if __BYTE_ORDER__ == __ORDER_LITTLE_ENDIAN__` 做条件编译。

几点说明：

- **编译期常量也能算**：`1u << 31`、`0xFFu << 24` 都是编译期常量表达式，不会引入运行期开销；
- **`-fsanitize=shift`** 单独也能抓非法移位，但通常直接用 `undefined` 一整组；
- **别用 `char` 存字节做数值比较**：需要 0–255 就用 `unsigned char` 或 `uint8_t`，避免 `char` 的符号性带来实现定义行为；
- **`__builtin_bswap32` / `_byteswap_ulong`** 是编译器内置的字节交换，比手写移位更快也更不容易错，但面试要会手写版本。

## 常见错误

### 用 `1 << 31` 表示最高位 [UB]
`1` 是 `int`，`1 << 31` 的结果 `2^31` 超出 `int` 能表示的正数范围，是未定义行为。UBSan 会直接报 `left shift of 1 by 31 places cannot be represented in type 'int'`。正确写法是 `1u << 31` 或 `0x80000000u`——**做位运算时，字面量后面养成加 `u` 的习惯**。

### 判断 2 的幂时忘了排除 0 [WA]
`(x & (x - 1)) == 0` 对 `x = 0` 也成立（`0 & -1 == 0`），于是 0 被误判成 2 的幂。正确写法是 `x != 0 && (x & (x - 1)) == 0`，两个条件缺一不可。

### 以为 `x & -x` 对什么类型都安全 [UB]
对**无符号数**，`-x` 等价于 `~x + 1`，永远有定义；但对**有符号数**，当 `x` 是 `INT_MIN` 时 `-x` 溢出，是 UB。所以 lowbit 这类函数的参数类型应该写成 `unsigned int`/`uint32_t`，而不是 `int`。

### 一行写完异或交换 [UB]
`a ^= b ^= a ^= b;` 在同一个表达式里对 `a` 修改了多次、且没有序列点，属于未定义行为；即使拆成三条语句，当 `a`、`b` 是同一个变量时，结果也会变成 0。**工程上直接用一个临时变量交换**，编译器会把它优化得很好。

### 大小端判断写死或写错类型 [WA]
`if (*(char *)&x == 1)` 在 `char` 无符号的实现上没问题，但更稳妥的写法是 `*(unsigned char *)&x`；另外，判断用的整数必须让**首尾字节不同**（例如 `0x01020304`），拿 `0` 或 `0x01010101` 去判断是判不出来的。

### 以为字节序转换可以省 [WA]
只要数据要跨机器传输或落盘，就必须约定字节序。同机测试永远发现不了这个 bug——两台 x86 之间传二进制结构体是"碰巧都对"，换一台大端机器或换一个平台就全错。**协议里写清楚字节序，代码里显式转换**。

## 客观题

### q-s7-iv-bits-endian-1 single
关于位运算技巧和大小端，下面哪一条说法是正确的？

- [x] `x & (x - 1u)` 能消掉最低位的 1，`x & (~x + 1u)` 能取出最低位的 1；小端把最低字节放在最低地址，网络字节序是大端。
  > 正确。三个结论都对：消位用于判 2 的幂和 popcount，取低位用于 lowbit；小端的"低字节在低地址"正是 `0x01020304` 读成 `04 03 02 01` 的原因，而 TCP/IP 规定线上用大端，所以 x86 发送前要 `htonl`。
- [ ] 判断 2 的幂时不需要排除 0，因为 `0 & (0 - 1)` 不等于 0。
  > 错。`0 - 1u` 在无符号里回绕成 `0xFFFFFFFF`，`0 & 0xFFFFFFFF == 0`，所以 0 会被误判成 2 的幂。必须写成 `x != 0u && (x & (x - 1u)) == 0u`。
- [ ] `1 << 31` 在 32 位 int 上是合法的，结果正好是 `INT_MIN`。
  > 错。`1` 是 `int`，`1 << 31` 的结果 `2^31` 无法用 `int` 表示，属于未定义行为；UBSan 会报 `left shift of 1 by 31 places cannot be represented in type 'int'`。要得到最高位请写 `1u << 31`。
- [ ] 用 `a ^= b ^= a ^= b;` 交换两个 int 永远安全，而且比临时变量快。
  > 错。这个表达式在同一个表达式中多次修改 `a` 且没有序列点，是未定义行为；即使拆成三条语句，当 `a`、`b` 指向同一个变量时结果会变成 0。现代编译器用临时变量也能优化到最优，没必要冒这个险。
