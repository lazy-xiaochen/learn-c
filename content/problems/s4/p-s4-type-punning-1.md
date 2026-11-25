---json
{
  "id": "p-s4-type-punning-1",
  "title": "IEEE-754 位模式分析器：用 union 看 float 的四个字节",
  "difficulty": "L5",
  "knowledgePoints": ["s4-type-punning"],
  "special": "ub-analysis",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
调试数值计算时，经常需要知道一个 `float` 在内存里到底是什么样子。请写一个工具，读入若干个浮点数，把每个数的 **IEEE-754 单精度位模式**拆出来：

- `bits`：4 个字节按 `uint32_t` 解释，输出 8 位大写十六进制；
- `sign`：符号位（0 或 1）；
- `exp`：8 位阶码（0…255）；
- `frac`：23 位尾数（0…8388607）；
- `as_int`：同样 4 个字节按 `int32_t` 解释，输出**有符号十进制**（符号位置 1 时是负数）；
- `class`：分类，取值 `zero`、`subnormal`、`normal`、`inf`、`nan`，规则见下。

分类规则（`e` 是阶码，`m` 是尾数）：

| 条件 | class |
|---|---|
| `e == 0` 且 `m == 0` | `zero` |
| `e == 0` 且 `m != 0` | `subnormal` |
| `e == 255` 且 `m == 0` | `inf` |
| `e == 255` 且 `m != 0` | `nan` |
| 其他 | `normal` |

### 怎么把 float 的位模式取出来
C 里把 `float` 的 4 个字节重新解释成 `uint32_t` 有两种**合法**写法：

1. 通过 union 读另一个成员：C 标准把它定义为"按新类型重新解释字节"（实现定义，本平台的 Clang 明确支持）；
2. 用 `memcpy` 复制这 4 个字节。

**不允许**用指针强转（`*(uint32_t *)&f`）：它违反严格别名规则，是未定义行为。本题的判题环境抓不到严格别名违规，但代码仍然是不正确的——请老老实实用 union 或 `memcpy`。

## 输入格式
第一行一个整数 `n`。
第二行 `n` 个数，用空格分隔，每个都是一个能被 `scanf("%f")` 读入的浮点数写法（可以是 `0`、`-0.0`、`1.5`、`1e-45`、`inf` 这样的形式）。

## 输出格式
对第 `k` 个输入（`k` 从 0 开始）输出一行：

```
f<k> bits=<8 位大写十六进制> sign=<0|1> exp=<0..255> frac=<0..8388607> as_int=<有符号十进制> class=<分类>
```

各部分之间**恰好一个空格**，行末不要有多余空格。

## 数据范围
- `1 ≤ n ≤ 100`
- 输入中的数都能被 `float` 表示：可能是 0、负零、次正规数、正规数、`inf`；**不会出现 `nan`**（NaN 的具体位模式由库实现决定，不适合作为答案）
- `bits` 的 8 位十六进制用**大写**字母；`as_int` 是 32 位有符号整数

## 示例
### 示例 1
```in
4
1.5 -2.25 0 -0.0
```
```out
f0 bits=3FC00000 sign=0 exp=127 frac=4194304 as_int=1069547520 class=normal
f1 bits=C0100000 sign=1 exp=128 frac=1048576 as_int=-1072693248 class=normal
f2 bits=00000000 sign=0 exp=0 frac=0 as_int=0 class=zero
f3 bits=80000000 sign=1 exp=0 frac=0 as_int=-2147483648 class=zero
```
> `1.5 = 1.1₂ × 2⁰`：阶码 `127`，尾数是 `0.1₂` 的 23 位表示 `4194304`。`-2.25 = -1.001₂ × 2¹`：阶码 `128`，尾数最高位 1 对应 `1048576`。`0` 和 `-0.0` 的阶码、尾数都是 0，区别只在符号位——**负零的 `bits` 是 `80000000`，`as_int` 是 `-2147483648`**，这是本题第一个坑。

### 示例 2（边界：单个 0）
```in
1
0
```
```out
f0 bits=00000000 sign=0 exp=0 frac=0 as_int=0 class=zero
```
> 零是最容易"顺手写错"的边界：`exp == 0` 且 `frac == 0` 才是 `zero`，而 `exp == 0` 且 `frac != 0` 是次正规数。判 `zero` 必须两个条件都满足。

## 提示
### 第 1 层
先想清楚"取位模式"这一步：`float` 和 `uint32_t` 都是 4 字节，要让它们共享同一块内存，最标准的工具是 union（把 `float`、`uint32_t`、`int32_t` 三个成员放进同一个 union）。用 `memcpy` 也行。

### 第 2 层
拆位靠掩码和移位：`sign = u >> 31`，`exp = (u >> 23) & 0xFF`，`frac = u & 0x7FFFFF`。阶码一定要 `& 0xFF`，否则符号位会被一起移进来；尾数一定要 `& 0x7FFFFF`，否则阶码会混进来。

### 第 3 层
`bits` 用 `%08X`（宽度 8、补零、大写），`as_int` 用 `%d` 打印 union 里的 `int32_t` 成员——两者是同一块内存的两种读法，`-2.25` 的 `bits` 是 `C0100000`，`as_int` 却是 `-1072693248`。分类时先判断 `e == 0`（zero / subnormal），再判断 `e == 255`（inf / nan），最后才是 normal。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <stdint.h>

/* 三个成员共享同一块 4 字节：float / 无符号位模式 / 有符号位模式 */
typedef union {
    float f;
    uint32_t u;
    int32_t i;
} FBits;

static const char *classify(uint32_t u) {
    uint32_t e = (u >> 23) & 0xFFu;
    uint32_t m = u & 0x7FFFFFu;
    if (e == 0) {
        return (m == 0) ? "zero" : "subnormal";
    }
    if (e == 255) {
        return (m == 0) ? "inf" : "nan";
    }
    return "normal";
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }
    for (int k = 0; k < n; k++) {
        float f;
        if (scanf("%f", &f) != 1) {
            return 0;
        }
        FBits b;
        b.f = f;                                  /* 写入 4 个字节 */
        printf("f%d bits=%08X sign=%u exp=%u frac=%u as_int=%d class=%s\n",
               k,
               (unsigned)b.u,                     /* 按无符号读同一块内存 */
               (unsigned)((b.u >> 31) & 0x1u),
               (unsigned)((b.u >> 23) & 0xFFu),
               (unsigned)(b.u & 0x7FFFFFu),
               b.i,                               /* 按有符号读同一块内存 */
               classify(b.u));
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <stdint.h>

typedef union {
    float f;
    uint32_t u;
    int32_t i;
} FBits;

static const char *classify(uint32_t u) {
    uint32_t e = u >> 23;                /* TODO: 少了 & 0xFF，符号位会混进来 */
    uint32_t m = u;                      /* TODO: 少了 & 0x7FFFFF，阶码会混进来 */
    if (e == 0 && m == 0) {
        return "zero";
    }
    if (e == 0) {
        return "subnormal";
    }
    return "normal";                     /* TODO: 还要判断 e == 255 的 inf / nan */
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }
    for (int k = 0; k < n; k++) {
        float f;
        if (scanf("%f", &f) != 1) {
            return 0;
        }
        FBits b;
        b.f = f;
        printf("f%d bits=%08X sign=%u exp=%u frac=%u as_int=%u class=%s\n",
               k,
               (unsigned)b.u,
               (unsigned)((b.u >> 31) & 0x1u),
               (unsigned)((b.u >> 23) & 0xFFu),
               (unsigned)(b.u & 0x7FFFFFu),
               (unsigned)b.u,               /* TODO: as_int 要按有符号读，用 %d */
               classify(b.u));
    }
    return 0;
}
```

## 复杂度
时间：`O(n)`，每个数常数次位运算。
空间：`O(1)`，只有一个 4 字节的 union。

## 常见错误
### 阶码忘了 & 0xFF [WA]
`u >> 23` 会把符号位一起移进来：`0xC0100000 >> 23 = 0x180 = 384`，而正确的阶码是 `128`。阶码必须是 `(u >> 23) & 0xFF`。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdint.h>

typedef union {
    float f;
    uint32_t u;
    int32_t i;
} FBits;

static const char *classify(uint32_t u) {
    uint32_t e = (u >> 23) & 0xFFu;
    uint32_t m = u & 0x7FFFFFu;
    if (e == 0) {
        return (m == 0) ? "zero" : "subnormal";
    }
    if (e == 255) {
        return (m == 0) ? "inf" : "nan";
    }
    return "normal";
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    for (int k = 0; k < n; k++) {
        float f;
        if (scanf("%f", &f) != 1) {
            return 0;
        }
        FBits b;
        b.f = f;
        printf("f%d bits=%08X sign=%u exp=%u frac=%u as_int=%d class=%s\n",
               k, (unsigned)b.u, (unsigned)((b.u >> 31) & 0x1u),
               (unsigned)(b.u >> 23),          /* 错：没有 & 0xFF */
               (unsigned)(b.u & 0x7FFFFFu), b.i, classify(b.u));
    }
    return 0;
}
```

### 忘记处理 e == 255 的 inf 和 nan [WA]
只判断 `e == 0` 和"其他都是 normal"，`inf` 会被当成 normal（`exp=255`、`frac=0`）。示例数据里没有 `inf`，很容易漏掉，隐藏用例会抓。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdint.h>

typedef union {
    float f;
    uint32_t u;
    int32_t i;
} FBits;

static const char *classify(uint32_t u) {
    uint32_t e = (u >> 23) & 0xFFu;
    uint32_t m = u & 0x7FFFFFu;
    if (e == 0) {
        return (m == 0) ? "zero" : "subnormal";
    }
    return "normal";                        /* 错：漏了 e == 255 */
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    for (int k = 0; k < n; k++) {
        float f;
        if (scanf("%f", &f) != 1) {
            return 0;
        }
        FBits b;
        b.f = f;
        printf("f%d bits=%08X sign=%u exp=%u frac=%u as_int=%d class=%s\n",
               k, (unsigned)b.u, (unsigned)((b.u >> 31) & 0x1u),
               (unsigned)((b.u >> 23) & 0xFFu),
               (unsigned)(b.u & 0x7FFFFFu), b.i, classify(b.u));
    }
    return 0;
}
```

### as_int 用 %u 打印无符号值 [WA]
`as_int` 要求按 `int32_t` 输出有符号十进制。用 `%u` 打印同一块内存，`-2.25` 会得到 `3222274048` 而不是 `-1072693248`。两行数字本质上指向同一块内存，但题目要的是"有符号的那种读法"。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdint.h>

typedef union {
    float f;
    uint32_t u;
    int32_t i;
} FBits;

static const char *classify(uint32_t u) {
    uint32_t e = (u >> 23) & 0xFFu;
    uint32_t m = u & 0x7FFFFFu;
    if (e == 0) {
        return (m == 0) ? "zero" : "subnormal";
    }
    if (e == 255) {
        return (m == 0) ? "inf" : "nan";
    }
    return "normal";
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    for (int k = 0; k < n; k++) {
        float f;
        if (scanf("%f", &f) != 1) {
            return 0;
        }
        FBits b;
        b.f = f;
        printf("f%d bits=%08X sign=%u exp=%u frac=%u as_int=%u class=%s\n",
               k, (unsigned)b.u, (unsigned)((b.u >> 31) & 0x1u),
               (unsigned)((b.u >> 23) & 0xFFu),
               (unsigned)(b.u & 0x7FFFFFu),
               (unsigned)b.u,                    /* 错：应该用 %d 打印 b.i */
               classify(b.u));
    }
    return 0;
}
```

### memcpy 的大小写成 sizeof 目标而不是源 [RE]
想用 `memcpy` 代替 union 时，如果目标是 8 字节的 `unsigned long long`，写 `memcpy(&bits, &f, sizeof bits)` 会从 4 字节的 `float` 上读 8 字节，越过对象边界。ASan 会报 `stack-buffer-overflow`（判 `RE`）。`memcpy` 的两个大小必须一致，且只能等于较小的那个对象。

```c file=main.c expect=RE
#include <stdio.h>
#include <stdint.h>
#include <string.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    for (int k = 0; k < n; k++) {
        float f;
        if (scanf("%f", &f) != 1) {
            return 0;
        }
        unsigned long long bits = 0;
        memcpy(&bits, &f, sizeof bits);       /* 错：源只有 4 字节，这里读了 8 字节 */
        printf("f%d bits=%016llX\n", k, bits);
    }
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
4
1.5 -2.25 0 -0.0
```
```out
f0 bits=3FC00000 sign=0 exp=127 frac=4194304 as_int=1069547520 class=normal
f1 bits=C0100000 sign=1 exp=128 frac=1048576 as_int=-1072693248 class=normal
f2 bits=00000000 sign=0 exp=0 frac=0 as_int=0 class=zero
f3 bits=80000000 sign=1 exp=0 frac=0 as_int=-2147483648 class=zero
```

### 02 sample 示例 2
```in
1
0
```
```out
f0 bits=00000000 sign=0 exp=0 frac=0 as_int=0 class=zero
```

### 03 boundary 最大正规数、最小正规数、最小次正规数
```in
3
3.4028235e38 1.17549435e-38 1e-45
```
```out
f0 bits=7F7FFFFF sign=0 exp=254 frac=8388607 as_int=2139095039 class=normal
f1 bits=00800000 sign=0 exp=1 frac=0 as_int=8388608 class=normal
f2 bits=00000001 sign=0 exp=0 frac=1 as_int=1 class=subnormal
```

### 04 degenerate 只有负零
```in
1
-0.0
```
```out
f0 bits=80000000 sign=1 exp=0 frac=0 as_int=-2147483648 class=zero
```

### 05 trap 0.1 的尾数不是 0
```in
3
0.1 -2 0.25
```
```out
f0 bits=3DCCCCCD sign=0 exp=123 frac=5033165 as_int=1036831949 class=normal
f1 bits=C0000000 sign=1 exp=128 frac=0 as_int=-1073741824 class=normal
f2 bits=3E800000 sign=0 exp=125 frac=0 as_int=1048576000 class=normal
```

### 06 trap 负的次正规数
```in
2
-1e-45 -100
```
```out
f0 bits=80000001 sign=1 exp=0 frac=1 as_int=-2147483647 class=subnormal
f1 bits=C2C80000 sign=1 exp=133 frac=4718592 as_int=-1027080192 class=normal
```

### 07 normal 几个常见的数
```in
3
100 2.5 65504
```
```out
f0 bits=42C80000 sign=0 exp=133 frac=4718592 as_int=1120403456 class=normal
f1 bits=40200000 sign=0 exp=128 frac=2097152 as_int=1075838976 class=normal
f2 bits=477FE000 sign=0 exp=142 frac=8380416 as_int=1199562752 class=normal
```

### 08 boundary 正负无穷
```in
2
inf -inf
```
```out
f0 bits=7F800000 sign=0 exp=255 frac=0 as_int=2139095040 class=inf
f1 bits=FF800000 sign=1 exp=255 frac=0 as_int=-8388608 class=inf
```
