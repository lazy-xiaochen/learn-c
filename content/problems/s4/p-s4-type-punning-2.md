---json
{
  "id": "p-s4-type-punning-2",
  "title": "从字节缓冲区读取多宽度整数：未对齐的偏移与合法双关",
  "difficulty": "L5",
  "knowledgePoints": ["s4-type-punning"],
  "special": "ub-analysis",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个二进制协议把整数字段直接铺在报文的字节流里：字段可以从**任意偏移**开始，长度是 **1 到 8 字节**，字节序是**小端**（低字节在低地址）。请写一个工具，把请求的字段逐个读出来并打印成十进制。

报文由十六进制字节给出，例如 `01 02 03 84` 表示 4 个字节 `0x01 0x02 0x03 0x84`。

### 三个必须小心的点
1. **偏移可能未对齐**：`off = 3` 时读 4 字节，读的是 `buf[3..6]`，起始地址不是 4 的倍数。
2. **宽度不一定是 2 的幂**：协议里真的有 3 字节、5 字节、7 字节的字段。
3. **最高字节可能 ≥ 0x80**：拼装出来的值可能超过 `long long` 的正数范围。

所以正确写法只有一种：**逐字节按小端拼装**（或 `memcpy` 到目标类型里）。下面这些写法都是错的：

| 错误写法 | 问题 |
|---|---|
| `uint32_t *p = (uint32_t *)(buf + off); v = *p;` | 违反**对齐**要求（未对齐读取是 UB），也违反严格别名规则 |
| `long long v = …; v = (v << 8) \| …` | 有符号类型左移到符号位是 UB |
| 从低地址开始乘 256 累加 | 方向反了，得到的是大端结果 |

本平台的 UBSan 会检查**未对齐访问**和**有符号左移溢出**，这两类会判 `UB`。严格别名违规 UBSan 抓不到，但它同样是未定义行为——不要写。

## 输入格式
第一行一个整数 `n`：报文的字节数。
第二行 `n` 个两位十六进制字节，用空格分隔（大小写均可）。
第三行一个整数 `q`：查询次数。
接下来 `q` 行，每行两个整数 `off` `width`：从偏移 `off` 开始读 `width` 个字节。

## 输出格式
每个查询输出一行：

```
read <off> <width> = <value>
```

`value` 是把这 `width` 个字节按小端拼成的**无符号**十进制数（最大可能到 `2^64 − 1`，要用 `unsigned long long` 和 `%llu`）。

## 数据范围
- `1 ≤ n ≤ 256`
- `1 ≤ q ≤ 200`
- `0 ≤ off`，`1 ≤ width ≤ 8`，且保证 `off + width ≤ n`

## 示例
### 示例 1
```in
12
01 02 03 84 05 06 07 FF 10 11 12 13
6
0 1
1 3
1 4
0 8
9 1
4 7
```
```out
read 0 1 = 1
read 1 3 = 8651522
read 1 4 = 92537602
read 0 8 = 18376663425267991041
read 9 1 = 17
read 4 7 = 5085314276591109
```
> `read 1 3` 读的是 `02 03 84`，小端拼装：`0x84*65536 + 0x03*256 + 0x02 = 8651522`。`read 0 8` 的最高字节是 `FF`，结果 `18376663425267991041` 超过了 `2^63`，必须用无符号类型才装得下——这正是"有符号左移"会踩 UB 的地方。`read 1 4` 的偏移是 1，未对齐，用指针强转读就会踩 UBSan。

### 示例 2（边界：只有一个字节）
```in
1
FF
1
0 1
```
```out
read 0 1 = 255
```
> `n = 1` 时唯一合法的查询是 `off = 0, width = 1`。单字节没有字节序问题，但它是"宽度 1"这个分支的边界。

## 提示
### 第 1 层
小端的意思是"低地址放低字节"。要拼出结果，可以从**最高地址**那个字节开始（它是结果的最高字节），然后每次左移 8 位、或上下一个更低的字节，直到起点。

### 第 2 层
拼装用的变量必须是 `unsigned long long`。如果写成 `long long`，当最高字节 ≥ `0x80` 时，最后一次左移会把 1 移进符号位——这是有符号整数溢出，未定义行为，本平台会判 `UB`。

### 第 3 层
不要用指针强转。`off` 可能是奇数，`*(uint32_t *)(buf + off)` 会触发未对齐读取；而奇数宽度（3、5、6、7）根本就没有对应的整数类型，只能逐字节拼。先写 `unsigned long long v = 0;`，再倒着循环 `v = (v << 8) | buf[off + j];`，注意循环变量从 `width - 1` 递减到 0。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAXB 256

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXB) {
        return 0;
    }

    unsigned char buf[MAXB];
    for (int i = 0; i < n; i++) {
        unsigned v;
        if (scanf("%2x", &v) != 1) {     /* 每次读两个十六进制字符 */
            return 0;
        }
        buf[i] = (unsigned char)v;
    }

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 200) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        int off;
        int width;
        if (scanf("%d %d", &off, &width) != 2) {
            return 0;
        }
        if (width < 1 || width > 8 || off < 0 || off + width > n) {
            return 0;
        }

        /* 小端拼装：从最高字节开始，逐字节左移加入 */
        unsigned long long v = 0;
        for (int j = width - 1; j >= 0; j--) {
            v = (v << 8) | (unsigned long long)buf[off + j];
        }
        printf("read %d %d = %llu\n", off, width, v);
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAXB 256

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXB) {
        return 0;
    }

    unsigned char buf[MAXB];
    for (int i = 0; i < n; i++) {
        unsigned v;
        if (scanf("%2x", &v) != 1) {
            return 0;
        }
        buf[i] = (unsigned char)v;
    }

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 200) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        int off;
        int width;
        if (scanf("%d %d", &off, &width) != 2) {
            return 0;
        }
        if (width < 1 || width > 8 || off < 0 || off + width > n) {
            return 0;
        }

        unsigned long long v = 0;
        for (int j = 0; j < width; j++) {
            /* TODO: 小端要从最高字节开始拼，这个循环的方向反了 */
            v = (v << 8) | (unsigned long long)buf[off + j];
        }
        printf("read %d %d = %llu\n", off, width, v);
    }
    return 0;
}
```

## 复杂度
时间：`O(n + q × 8)`，每个查询最多 8 次字节操作。
空间：`O(n)`，一个 256 字节的缓冲区。

## 常见错误
### 用指针强转读未对齐的字段 [UB]
`uint32_t *p = (uint32_t *)(buf + off); v = *p;` 在 `off = 1` 时会读一个未对齐的 4 字节整数。x86 硬件允许这么做，但 C 语言层面它是未定义行为，本平台的 UBSan 会报 `load of misaligned address ... requires 4 byte alignment` 并判 `UB`。而且它只对 1/2/4/8 有效，3、5、6、7 字节根本没有对应的类型。

```c file=main.c expect=UB
#include <stdio.h>
#include <stdint.h>

#define MAXB 256

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    unsigned char buf[MAXB];
    for (int i = 0; i < n; i++) {
        unsigned v;
        if (scanf("%2x", &v) != 1) {
            return 0;
        }
        buf[i] = (unsigned char)v;
    }
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        int off;
        int width;
        if (scanf("%d %d", &off, &width) != 2) {
            return 0;
        }
        unsigned long long v = 0;
        if (width == 1) {
            v = buf[off];
        } else if (width == 2) {
            uint16_t *p = (uint16_t *)(buf + off);       /* 错：可能未对齐 */
            v = *p;
        } else if (width == 4) {
            uint32_t *p = (uint32_t *)(buf + off);       /* 错：可能未对齐 */
            v = *p;
        } else if (width == 8) {
            unsigned long long *p = (unsigned long long *)(buf + off);
            v = *p;
        } else {
            for (int j = width - 1; j >= 0; j--) {
                v = (v << 8) | (unsigned long long)buf[off + j];
            }
        }
        printf("read %d %d = %llu\n", off, width, v);
    }
    return 0;
}
```

### 用有符号的 long long 拼装 [UB]
`long long v = 0; v = (v << 8) | buf[...];` 在最高字节 ≥ `0x80` 时，最后几次左移会得到超过 `LLONG_MAX` 的值——有符号左移溢出，未定义行为，本平台判 `UB`。把变量换成 `unsigned long long` 就没有这个问题（无符号溢出是良定义的取模）。

```c file=main.c expect=UB
#include <stdio.h>

#define MAXB 256

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    unsigned char buf[MAXB];
    for (int i = 0; i < n; i++) {
        unsigned v;
        if (scanf("%2x", &v) != 1) {
            return 0;
        }
        buf[i] = (unsigned char)v;
    }
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        int off;
        int width;
        if (scanf("%d %d", &off, &width) != 2) {
            return 0;
        }
        long long v = 0;                 /* 错：最高字节 ≥ 0x80 时左移溢出 */
        for (int j = width - 1; j >= 0; j--) {
            v = (v << 8) | (long long)buf[off + j];
        }
        printf("read %d %d = %lld\n", off, width, v);
    }
    return 0;
}
```

### 从低地址开始乘 256 累加（大端） [WA]
`for (j = 0; j < width; j++) v = (v << 8) | buf[off + j];` 把 `buf[off]` 当成了最高字节，得到的是大端结果。示例 1 里 `read 1 3` 会输出 `131972`（`0x020384`）而不是 `8651522`（`0x840302`）。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXB 256

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    unsigned char buf[MAXB];
    for (int i = 0; i < n; i++) {
        unsigned v;
        if (scanf("%2x", &v) != 1) {
            return 0;
        }
        buf[i] = (unsigned char)v;
    }
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        int off;
        int width;
        if (scanf("%d %d", &off, &width) != 2) {
            return 0;
        }
        unsigned long long v = 0;
        for (int j = 0; j < width; j++) {          /* 错：方向反了 */
            v = (v << 8) | (unsigned long long)buf[off + j];
        }
        printf("read %d %d = %llu\n", off, width, v);
    }
    return 0;
}
```

### 用 unsigned int 保存结果 [WA]
`unsigned int` 只有 4 字节，8 字节字段的高 4 字节会被无声地丢掉。示例 1 的 `read 0 8` 会输出 `2214859777`（低 32 位）而不是 `18376663425267991041`。宽度最大是 8，累加变量必须是 64 位。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXB 256

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    unsigned char buf[MAXB];
    for (int i = 0; i < n; i++) {
        unsigned v;
        if (scanf("%2x", &v) != 1) {
            return 0;
        }
        buf[i] = (unsigned char)v;
    }
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        int off;
        int width;
        if (scanf("%d %d", &off, &width) != 2) {
            return 0;
        }
        unsigned int v = 0;                        /* 错：装不下 8 字节 */
        for (int j = width - 1; j >= 0; j--) {
            v = (v << 8) | (unsigned int)buf[off + j];
        }
        printf("read %d %d = %u\n", off, width, v);
    }
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
12
01 02 03 84 05 06 07 FF 10 11 12 13
6
0 1
1 3
1 4
0 8
9 1
4 7
```
```out
read 0 1 = 1
read 1 3 = 8651522
read 1 4 = 92537602
read 0 8 = 18376663425267991041
read 9 1 = 17
read 4 7 = 5085314276591109
```

### 02 sample 示例 2
```in
1
FF
1
0 1
```
```out
read 0 1 = 255
```

### 03 boundary 256 字节的报文，首尾各读 8 字节
```in
256
00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F 10 11 12 13 14 15 16 17 18 19 1A 1B 1C 1D 1E 1F 20 21 22 23 24 25 26 27 28 29 2A 2B 2C 2D 2E 2F 30 31 32 33 34 35 36 37 38 39 3A 3B 3C 3D 3E 3F 40 41 42 43 44 45 46 47 48 49 4A 4B 4C 4D 4E 4F 50 51 52 53 54 55 56 57 58 59 5A 5B 5C 5D 5E 5F 60 61 62 63 64 65 66 67 68 69 6A 6B 6C 6D 6E 6F 70 71 72 73 74 75 76 77 78 79 7A 7B 7C 7D 7E 7F 80 81 82 83 84 85 86 87 88 89 8A 8B 8C 8D 8E 8F 90 91 92 93 94 95 96 97 98 99 9A 9B 9C 9D 9E 9F A0 A1 A2 A3 A4 A5 A6 A7 A8 A9 AA AB AC AD AE AF B0 B1 B2 B3 B4 B5 B6 B7 B8 B9 BA BB BC BD BE BF C0 C1 C2 C3 C4 C5 C6 C7 C8 C9 CA CB CC CD CE CF D0 D1 D2 D3 D4 D5 D6 D7 D8 D9 DA DB DC DD DE DF E0 E1 E2 E3 E4 E5 E6 E7 E8 E9 EA EB EC ED EE EF F0 F1 F2 F3 F4 F5 F6 F7 F8 F9 FA FB FC FD FE FF
6
0 8
248 8
0 1
255 1
100 5
250 6
```
```out
read 0 8 = 506097522914230528
read 248 8 = 18446460386757245432
read 0 1 = 0
read 255 1 = 255
read 100 5 = 448411362660
read 250 6 = 281470647991290
```

### 04 degenerate 全零报文
```in
4
00 00 00 00
3
0 1
0 2
0 4
```
```out
read 0 1 = 0
read 0 2 = 0
read 0 4 = 0
```

### 05 trap 最高字节是 0x80，正好等于 2^63
```in
8
00 00 00 00 00 00 00 80
3
0 8
4 4
0 2
```
```out
read 0 8 = 9223372036854775808
read 4 4 = 2147483648
read 0 2 = 0
```

### 06 trap 未对齐的 4 字节和 3 字节字段
```in
5
11 22 33 84 55
3
1 4
0 4
2 3
```
```out
read 1 4 = 1434727202
read 0 4 = 2217943569
read 2 3 = 5604403
```

### 07 trap 字节序：同一串字节两种读法
```in
4
01 02 03 04
3
0 4
1 2
2 2
```
```out
read 0 4 = 67305985
read 1 2 = 770
read 2 2 = 1027
```

### 08 normal 七字节字段与连续的高位字节
```in
7
7F 80 81 82 83 84 85
4
0 7
0 4
3 4
6 1
```
```out
read 0 7 = 37581872267624575
read 0 4 = 2189525119
read 3 4 = 2240054146
read 6 1 = 133
```
