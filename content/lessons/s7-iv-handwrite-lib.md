---
id: s7-iv-handwrite-lib
---

## 讲解

### 口述版答案
面试官扔来白纸："手写 strcpy / strlen / memcpy / memmove / atoi。" 先说清每个函数的三件事——**签名、语义、边界**：

1. **strlen**：`size_t strlen(const char *s)`；数到 `'\0'` 为止，**不把 `'\0'` 算进去**；空串返回 0；返回值是 `size_t`（无符号），不要用 `int` 接。
2. **strcpy**：`char *strcpy(char *dst, const char *src)`；连 `'\0'` 一起复制；**返回 dst** 以支持链式调用；源和目标**重叠是 UB**；调用者负责保证 dst 够大。
3. **memcpy**：`void *memcpy(void *dst, const void *src, size_t n)`；按**字节**复制任意类型；`n = 0` 时什么也不做；**源和目标重叠是 UB**（标准原文：If copying takes place between objects that overlap, the behavior is undefined）。
4. **memmove**：`void *memmove(void *dst, const void *src, size_t n)`；语义与 memcpy 相同，但**允许重叠**；实现时先判断方向：`dst < src` 或 `dst >= src + n` 时从前往后复制，否则从后往前复制（也可以借一块临时缓冲）。
5. **atoi**：`int atoi(const char *s)`；跳过前导空白 → 可选正负号 → 至少读一位数字 → 遇到第一个非数字字符停止；`"123abc"` 返回 123；**溢出不在标准保护范围内**，工程上应该用 `strtol` 并检查 `errno` 和范围。
6. **通用加分项**：`const` 修饰只读参数；NULL 参数要做检查（标准库对 NULL 是 UB，但手写版本应防御）；`memcpy`/`memmove` 要返回 dst；不能假设字符集是 ASCII 之外的编码。

一句收尾：**strcpy 管"字符串"，memcpy/memmove 管"字节块"，区别只在"要不要找 '\0'"和"能不能重叠"**。

### 代码版答案
第一段：`strlen` + `strcpy`。注意 `while ((*dst++ = *src++) != '\0')` 这个惯用法——赋值表达式的值就是刚复制的字符，遇到 `'\0'` 时循环结束，而 `'\0'` 已经被写进去了；返回值必须是 `dst` 的原始值：

```c run id=hw-strcpy
#include <stdio.h>
#include <stddef.h>

static size_t my_strlen(const char *s) {
    size_t n = 0;
    while (s[n] != '\0') {
        n++;
    }
    return n;
}

static char *my_strcpy(char *dst, const char *src) {
    char *ret = dst;
    while ((*dst++ = *src++) != '\0') {
        /* 复制到 '\0' 为止，'\0' 也一起复制 */
    }
    return ret;                    /* 返回 dst，支持链式调用 */
}

int main(void) {
    char buf[16];
    printf("len  = %zu\n", my_strlen("hello"));
    printf("copy = %s\n", my_strcpy(buf, "hello"));   /* 返回值直接当参数用 */
    printf("buf  = %s\n", buf);
    return 0;
}
```
```output
len  = 5
copy = hello
buf  = hello
```

第二段：`memmove` 处理重叠。目的地在源**右边**时必须从后往前搬，否则前面的字节会先把后面还没搬的源数据覆盖掉；目的地在源**左边**时从前往后搬。下面两个方向都跑一遍，结果都是正确答案：

```c run id=hw-memmove
#include <stdio.h>
#include <string.h>

int main(void) {
    char right[16] = "abcdefgh";
    memmove(right + 2, right, 5);      /* 目的在源右边：必须从后往前搬 */
    printf("right: %s\n", right);

    char left[16] = "abcdefgh";
    memmove(left, left + 2, 5);        /* 目的在源左边：从前往后搬 */
    printf("left : %s\n", left);
    return 0;
}
```
```output
right: ababcdeh
left : cdefgfgh
```

第二个结果值得亲手推一遍：`memmove(left, left + 2, 5)` 把 `left[2..6]`（`c d e f g`）搬到 `left[0..4]`，搬完是 `c d e f g f g h`，即 `cdefgfgh`。手写字符串/内存函数，考的不是"能跑"，而是**边界和重叠的推演能力**——拿不准就列地址表，别凭直觉。

第三段：手写 `atoi`。四件事一个都不能少——跳过空白、处理符号、至少一位数字、溢出时钳位（工程实现还要配合 `errno`）：

```c run id=hw-atoi
#include <stdio.h>
#include <limits.h>

static int my_atoi(const char *s) {
    while (*s == ' ' || (*s >= '\t' && *s <= '\r')) {
        s++;                       /* 跳过所有空白字符 */
    }
    int sign = 1;
    if (*s == '+' || *s == '-') {
        if (*s == '-') {
            sign = -1;
        }
        s++;
    }
    long long v = 0;
    while (*s >= '0' && *s <= '9') {
        v = v * 10 + (*s - '0');
        if (sign > 0 && v > INT_MAX) {
            return INT_MAX;
        }
        if (sign < 0 && -v < INT_MIN) {
            return INT_MIN;
        }
        s++;
    }
    return (int)(sign > 0 ? v : -v);
}

int main(void) {
    const char *cases[6] = { "42", "  -17", "+0", "123abc", "999999999999", "-999999999999" };
    for (int i = 0; i < 6; i++) {
        printf("[%s] -> %d\n", cases[i], my_atoi(cases[i]));
    }
    return 0;
}
```
```output
[42] -> 42
[  -17] -> -17
[+0] -> 0
[123abc] -> 123
[999999999999] -> 2147483647
[-999999999999] -> -2147483648
```

第四段：`memcpy` 处理重叠区间会发生什么。标准说"UB"，具体表现取决于实现和检测工具；本平台的 ASan 会直接拦住，报 `memcpy-param-overlap`：

```c run id=hw-memcpy-overlap expect=RE
#include <stdio.h>
#include <string.h>

int main(void) {
    char b[16] = "abcdefgh";
    memcpy(b + 2, b, 5);       /* 错：区间 [2,7) 与 [0,5) 重叠 */
    printf("%s\n", b);
    return 0;
}
```

换成 `memmove` 就合法，结果也有定义——这正是它存在的唯一理由。

### memcpy 与 memmove 的唯一区别
两个函数的签名、返回值、`n = 0` 的行为都一样，唯一的区别是**重叠时是否允许**。下面把 `memmove(buf + 2, buf, 5)` 的过程按地址列出来（`buf` 内容是 `abcdefgh`，起始地址 0x1000）：

```memory title="memmove(buf + 2, buf, 5)：目的在右，必须从后往前复制（地址为示意）"
地址 | 复制前 | 复制后 | 说明
0x1000 | 'a' | 'a' | 源第 1 字节，也是第一轮被读出
0x1001 | 'b' | 'b' | 源第 2 字节
0x1002 | 'c' | 'a' | 目的第 1 字节：写在这里会覆盖 'c'
0x1003 | 'd' | 'b' | 如果从前往后搬，源 'c' 已经被覆盖 → 错
0x1004 | 'e' | 'c' | 所以必须从后往前：先搬 0x1006
0x1005 | 'f' | 'd' | 后搬 0x1005、0x1004……
0x1006 | 'g' | 'e' | 源最后一字节，最先被搬走
0x1007 | 'h' | 'h' | 没有被波及的字节
```

判断规则可以背成一句话：**`dst` 在 `src` 右边（`dst > src` 且有重叠）→ 从后往前；`dst` 在左边或完全不重叠 → 从前往后**。手写 `memmove` 的常见实现就是：

```c
if (dst < src || (char *)dst >= (char *)src + n) {
    for (size_t i = 0; i < n; i++) d[i] = s[i];          /* 从前往后 */
} else {
    for (size_t i = n; i > 0; i--) d[i - 1] = s[i - 1];  /* 从后往前 */
}
```

`memcpy` 则可以直接假定不重叠，所以实现只用"从前往后"一种方向——**如果调用者违反了不重叠的前提，结果就是 UB，不要指望它像 memmove 一样工作**。

### atoi 的边界清单
| 输入 | 返回 | 原因 |
|---|---|---|
| `"42"` | 42 | 正常数字 |
| `"   -17"` | -17 | 前导空白 + 负号 |
| `"+0"` | 0 | 正号 + 0 |
| `"123abc"` | 123 | 遇到第一个非数字停止 |
| `"abc"` | 0 | 一个数字都没读到，返回 0（无法区分"失败"和"数字 0"） |
| `"999999999999"` | 溢出 | 标准没规定，本实现钳到 `INT_MAX` |

面试常追问："`atoi` 和 `strtol` 有什么区别？" 标准答案是：**`atoi` 没有错误报告渠道**——非法输入和真正的 0 都返回 0，溢出是 UB；`strtol` 通过 `endptr` 告诉你停在哪个字符、通过 `errno == ERANGE` 报告溢出，是工程上应该用的版本。

### 手写函数的"隐形契约"
真正拉开差距的是这些细节，面试官通常只挑两三个问：

- **`const` 正确性**：只读的源参数必须是 `const char *`/`const void *`，否则调用者传字符串字面量会报警告；
- **返回 `dst` 而不是 `void`**：为了链式调用，也为了和历史实现保持 ABI 兼容；
- **长度类型用 `size_t`**：`int` 装不下 4GB 的缓冲区，而且 `size_t` 是无符号、做下标更自然；
- **`n = 0` 必须安全**：标准允许 `memcpy(NULL, NULL, 0)` 这类调用不访问内存，手写实现不要在 `n = 0` 时还去解引用指针；
- **不允许在库里 `printf`**：库函数不该产生输出，错误要通过返回值/`errno` 报告。

## 编译与运行

用 gcc 或 clang 编译都行，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra -g strlib.c -o strlib
./strlib
```

```bash
clang -std=c17 -Wall -Wextra -g strlib.c -o strlib
./strlib
```

手写这些函数必须开 sanitizer，否则越界和重叠只会"看起来正常"：

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=address,undefined -fno-sanitize-recover=all strlib.c -o strlib
./strlib
```

三种典型报告：

```text
ERROR: AddressSanitizer: stack-buffer-overflow on address ...
WRITE of size 6 at ... thread T0
    #0 ... in strcpy ...
    #1 ... in main strlib.c:7:5

ERROR: AddressSanitizer: memcpy-param-overlap: memory ranges [0x...,0x...) and [0x...,0x...) overlap

strlib.c:12:15: runtime error: signed integer overflow: 999999999 * 10 cannot be represented in type 'int'
```

想对照标准库的实现，可以直接读开源代码（glibc 的 `string/strcpy.c`、musl 的 `src/string/memmove.c`），也可以用编译器内置版本对比性能：

```bash
clang -std=c17 -O2 -S strlib.c -o strlib.s    # 看自己的实现有没有被向量化
```

几点说明：

- **不要用 `strcpy` 处理不可信输入**：它无法知道目标大小，安全版本是 `strncpy`（还要手动补 `'\0'`）或 C11 的 `strcpy_s`；
- **`memcpy` 的第三个参数是字节数**，不是元素个数，写成 `memcpy(d, s, n)` 而 `d`、`s` 是 `int*` 时只复制了 n 个字节；
- **重叠检测可以自己做**：在调试版本里判断 `[dst, dst+n)` 与 `[src, src+n)` 是否相交，相交就打印警告并改用 memmove 语义；
- **`restrict` 能帮编译器优化**：标准库的 `memcpy` 原型带 `restrict`，这正是"不允许重叠"的语言级表达。

## 常见错误

### 目标缓冲区装不下源字符串 [RE]
`strcpy` 不知道 `dst` 有多大，复制长度完全由 `src` 决定。`char buf[4]; strcpy(buf, "hello")` 会写 6 个字节（含 `'\0'`），ASan 报 `stack-buffer-overflow`：

```c run id=hw-err-overflow expect=RE warnings=allow
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[4];
    strcpy(buf, "hello");      /* 错：需要 6 字节，buf 只有 4 字节 */
    printf("%s\n", buf);
    return 0;
}
```

正确做法是先算长度再判断：`if (strlen(src) + 1 > sizeof buf) { 处理错误 }`，或者直接用带长度参数的接口。

### 用 memcpy 复制重叠区间 [RE]
`memcpy` 的前提是源和目标**不重叠**，违反前提就是 UB。ASan 的拦截器会直接报 `memcpy-param-overlap`；在没有检测工具的环境里，它可能"碰巧"给出正确结果，也可能悄悄复制错——这正是 UB 最危险的地方：

```c run id=hw-err-overlap expect=RE
#include <stdio.h>
#include <string.h>

int main(void) {
    char b[16] = "abcdefgh";
    memcpy(b + 2, b, 5);       /* 错：应改用 memmove */
    printf("%s\n", b);
    return 0;
}
```

判断方法：把两个区间画在纸上，`[src, src+n)` 和 `[dst, dst+n)` 只要有交集，就必须用 `memmove`。

### 手写 atoi 时累加变量用 int [UB]
`v = v * 10 + (*s - '0')` 里如果 `v` 是 `int`，遇到 `"999999999999"` 这样的输入就会溢出——有符号整数溢出是 UB，UBSan 会报 `signed integer overflow: 999999999 * 10 cannot be represented in type 'int'`。正确做法是用 `long long` 累加再判断范围，或者直接用 `strtol`：

```c run id=hw-err-atoi expect=UB
#include <stdio.h>

static int my_atoi_bad(const char *s) {
    int v = 0;
    while (*s >= '0' && *s <= '9') {
        v = v * 10 + (*s - '0');   /* 溢出时是有符号整数溢出：UB */
        s++;
    }
    return v;
}

int main(void) {
    printf("%d\n", my_atoi_bad("999999999999"));
    return 0;
}
```

### 忘了复制结尾的 '\0' [WA]
只复制可见字符、忘了 `'\0'`，目标缓冲区就不是合法字符串，之后任何 `printf("%s")`/`strlen` 都会继续读到缓冲区外。`strcpy` 的循环条件写成 `while (*src != '\0') *dst++ = *src++;` 就丢掉了结尾；正确写法是 `while ((*dst++ = *src++) != '\0')`，让赋值本身负责"复制并判断"。

### 返回值写成 void，链式调用编译失败 [CE]
`void my_strcpy(char *dst, const char *src)` 和标准原型不兼容，`printf("%s", my_strcpy(buf, s))` 直接编译错误。**手写库函数时先把标准原型抄对**，再写实现。

## 客观题

### q-s7-iv-handwrite-lib-1 single
关于手写 `strcpy` / `memcpy` / `memmove`，下面哪一条说法是正确的？

- [x] `memcpy` 要求源和目标区间不重叠，重叠时是未定义行为；`memmove` 允许重叠，实现时根据 `dst` 与 `src` 的相对位置决定复制方向。
  > 正确。标准对 `memcpy` 的原文是"如果复制发生在重叠的对象之间，行为未定义"，所以重叠必须换 `memmove`。`memmove` 的常规实现：`dst < src` 或 `dst >= src + n` 时从前往后复制，否则从后往前复制（或借临时缓冲），这样无论怎么重叠都不会覆盖尚未读取的源字节。
- [ ] `memcpy` 会自动检测重叠并退化成 `memmove` 的语义，所以可以放心用于重叠区间。
  > 错。标准没有任何"自动检测重叠"的要求，重叠就是 UB。ASan 会在调试环境里拦截并报 `memcpy-param-overlap`，但发布版本没有这个保护，结果可能"看起来对"，也可能悄悄错——这正是 UB 的可怕之处。
- [ ] `strcpy` 允许源和目标重叠，因为它是逐字节复制的，跟 `memmove` 一样安全。
  > 错。`strcpy` 同样规定重叠时行为未定义（它没有义务按安全方向复制）。需要重叠复制字符串时，应该自己算长度后用 `memmove`。
- [ ] 手写 `strcpy` 时只需要复制可见字符，结尾的 `'\0'` 由调用者负责补上。
  > 错。`strcpy` 的语义就是"把包括 `'\0'` 在内的整个字符串复制过去"，不复制 `'\0'` 的目标缓冲区不是合法字符串，后续 `strlen`/`printf("%s")` 会越界读取。惯用写法 `while ((*dst++ = *src++) != '\0')` 正是把"复制"和"遇到结尾停止"合并在一起。
