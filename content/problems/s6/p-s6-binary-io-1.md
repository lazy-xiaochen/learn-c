---json
{
  "id": "p-s6-binary-io-1",
  "title": "结构体写进文件的字节镜像：推算偏移、填充与 fwrite 的字节序列",
  "difficulty": "L4",
  "knowledgePoints": ["s6-binary-io"],
  "special": "memory-layout",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个采集程序把记录数组直接用 `fwrite(&rec, sizeof rec, 1, fp)` 写进二进制文件。线上排查时发现：用十六进制看文件，**有些字节根本不是任何字段的值**（填充洞），而字段的位置和想像的也不一样。

本题不读写真实文件，而是让你**推算**这份"字节镜像"：给定结构体的字段声明顺序和一条记录各字段的值，输出每个字段的偏移、整个结构体的大小与对齐，以及这条记录被 `fwrite` 写出去时的那串字节（十六进制）。

推算规则（简化模型，一切以这里为准）：

1. 字段按声明顺序依次分配，每个类型的大小与对齐要求相同：

   | 类型标记 | 对应 C 类型 | 大小 | 对齐 |
   |---|---|---|---|
   | `char` | `char` | 1 | 1 |
   | `short` | `short` | 2 | 2 |
   | `int` | `int` | 4 | 4 |
   | `longlong` | `long long` | 8 | 8 |

2. 分配一个字段时，先把"已占用字节数" `used` 向上取整到该字段对齐要求的倍数（差出来的部分就是**填充**），再放该字段，记下它的偏移，然后 `used += 字段大小`；
3. 全部字段放完后，结构体总大小再向上取整到**最大对齐**的倍数；
4. 字节镜像：每个字段的值按**小端**写进它占的那几个字节（低字节在前），填充字节一律输出 `00`（本题约定："先用 `memset` 清 0，再给字段赋值"，这样镜像可复现）；
5. 多字节值的字节：第 `b` 个字节 = `(值 >> (8 * b)) & 0xFF`。

## 输入格式
- 第 1 行：两个整数 `k`、`r`（字段个数、记录条数）；
- 第 2 行：`k` 个类型标记，用空格分隔，取值为 `char`、`short`、`int`、`longlong`；
- 接下来 `r` 行：每行 `k` 个整数，是一条记录里各字段的值（顺序与类型一一对应）。

## 输出格式
先输出 `k` 行字段布局：

```
field<i> <类型标记> offset=<偏移> size=<大小>
```

然后两行：

```
size <结构体总大小>
align <最大对齐>
```

最后 `r` 行记录的字节镜像，每个字节两位大写十六进制、用一个空格分隔：

```
record<j> <十六进制字节...>
```

## 数据范围
- `1 ≤ k ≤ 6`，`0 ≤ r ≤ 3`；
- 字段值范围：`char` 0..127，`short` 0..32767，`int` 0..2147483647，`longlong` 0..1000000000；
- 结构体总大小不超过 64 字节；
- 输出最多约 12 行，远小于 64KB。

## 示例
### 示例 1
```in
2 1
char int
65 16909060
```
```out
field0 char offset=0 size=1
field1 int offset=4 size=4
size 8
align 4
record0 41 00 00 00 04 03 02 01
```
> `char` 占偏移 0；`int` 要求 4 字节对齐，所以从偏移 4 开始，偏移 1..3 是 3 个填充字节。总大小 5 要向上取整到最大对齐 4，得到 8。`16909060` 是 `0x01020304`，小端写出来是 `04 03 02 01`；`'A'` 是 `0x41`。

### 示例 2（边界：没有记录）
```in
1 0
short
```
```out
field0 short offset=0 size=2
size 2
align 2
```
> `r = 0` 时只需要输出布局，没有任何 `record` 行。这也是最小规模：只有一个字段，且它正好对齐。

## 提示
### 第 1 层
先把"对齐"理解成一个动作：放字段之前，把已占用的字节数向上补到该字段对齐要求的倍数。补出来的那几个字节就是填充，它们不属于任何字段。

### 第 2 层
结构体总大小不是"字段大小之和"，而是"最后 `used` 向上取整到最大对齐的倍数"。比如 `int` + `char` 的 `used` 是 5，最大对齐 4，总大小是 8——末尾还有 3 个填充字节。

### 第 3 层
字节镜像可以逐字段循环：对第 `i` 个字段，枚举 `b = 0 .. size-1`，把 `(值 >> (8*b)) & 0xFF` 写到 `offset + b` 的位置；其余位置保持 0。输出时按 `total` 个字节逐个打印 `%02X`。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXK 6

static int size_of(const char *type) {
    if (strcmp(type, "char") == 0) {
        return 1;
    }
    if (strcmp(type, "short") == 0) {
        return 2;
    }
    if (strcmp(type, "int") == 0) {
        return 4;
    }
    if (strcmp(type, "longlong") == 0) {
        return 8;
    }
    return 0;
}

int main(void) {
    int k = 0;
    int r = 0;
    if (scanf("%d %d", &k, &r) != 2) {
        return 0;
    }
    if (k < 1 || k > MAXK || r < 0 || r > 3) {
        return 0;
    }

    char type[MAXK][16];
    int size[MAXK];
    int offset[MAXK];
    int used = 0;
    int align = 1;
    for (int i = 0; i < k; i++) {
        if (scanf("%15s", type[i]) != 1) {
            return 0;
        }
        size[i] = size_of(type[i]);
        if (size[i] == 0) {
            return 0;
        }
        used = (used + size[i] - 1) / size[i] * size[i];   /* 向上取整到对齐要求 */
        offset[i] = used;
        used += size[i];
        if (size[i] > align) {
            align = size[i];
        }
    }
    int total = (used + align - 1) / align * align;        /* 总大小对齐到最大对齐 */

    for (int i = 0; i < k; i++) {
        printf("field%d %s offset=%d size=%d\n", i, type[i], offset[i], size[i]);
    }
    printf("size %d\n", total);
    printf("align %d\n", align);

    for (int j = 0; j < r; j++) {
        unsigned char bytes[64];
        memset(bytes, 0, sizeof bytes);                    /* 填充字节按 0 输出 */
        for (int i = 0; i < k; i++) {
            long long value = 0;
            if (scanf("%lld", &value) != 1) {
                return 0;
            }
            for (int b = 0; b < size[i]; b++) {
                bytes[offset[i] + b] = (unsigned char)((value >> (8 * b)) & 0xFF);
            }
        }
        printf("record%d", j);
        for (int b = 0; b < total; b++) {
            printf(" %02X", bytes[b]);
        }
        printf("\n");
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXK 6

static int size_of(const char *type) {
    if (strcmp(type, "char") == 0) {
        return 1;
    }
    if (strcmp(type, "short") == 0) {
        return 2;
    }
    if (strcmp(type, "int") == 0) {
        return 4;
    }
    if (strcmp(type, "longlong") == 0) {
        return 8;
    }
    return 0;
}

int main(void) {
    int k = 0;
    int r = 0;
    if (scanf("%d %d", &k, &r) != 2) {
        return 0;
    }
    if (k < 1 || k > MAXK || r < 0 || r > 3) {
        return 0;
    }

    char type[MAXK][16];
    int size[MAXK];
    int offset[MAXK];
    int used = 0;
    int align = 1;
    for (int i = 0; i < k; i++) {
        if (scanf("%15s", type[i]) != 1) {
            return 0;
        }
        size[i] = size_of(type[i]);
        if (size[i] == 0) {
            return 0;
        }
        offset[i] = used;                  /* TODO: 先按 size[i] 对齐，再记偏移 */
        used += size[i];
        if (size[i] > align) {
            align = size[i];
        }
    }
    int total = used;                      /* TODO: 总大小还要向上取整到 align 的倍数 */

    for (int i = 0; i < k; i++) {
        printf("field%d %s offset=%d size=%d\n", i, type[i], offset[i], size[i]);
    }
    printf("size %d\n", total);
    printf("align %d\n", align);

    for (int j = 0; j < r; j++) {
        unsigned char bytes[64];
        memset(bytes, 0, sizeof bytes);
        for (int i = 0; i < k; i++) {
            long long value = 0;
            if (scanf("%lld", &value) != 1) {
                return 0;
            }
            for (int b = 0; b < size[i]; b++) {
                bytes[offset[i] + b] = (unsigned char)(value >> (8 * b));   /* TODO: 取低 8 位再写 */
            }
        }
        printf("record%d", j);
        for (int b = 0; b < total; b++) {
            printf(" %02X", bytes[b]);
        }
        printf("\n");
    }
    return 0;
}
```

## 复杂度
时间 O(k × r)：每个字段只做一次对齐和一次字节拆分，`k ≤ 6`、`r ≤ 3`。
空间 O(1)：一个 64 字节的字节镜像缓冲区。

## 常见错误
### 以为 sizeof 就是"各字段大小之和" [WA]
`char` + `int` 的字段只有 5 字节，但结构体是 8 字节：中间 3 字节是填充，末尾还要补齐到最大对齐。用"大小之和"当 `total`，输出会少几个字节，`record` 行也不完整。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXK 6

static int size_of(const char *type) {
    if (strcmp(type, "char") == 0) {
        return 1;
    }
    if (strcmp(type, "short") == 0) {
        return 2;
    }
    if (strcmp(type, "int") == 0) {
        return 4;
    }
    if (strcmp(type, "longlong") == 0) {
        return 8;
    }
    return 0;
}

int main(void) {
    int k = 0;
    int r = 0;
    if (scanf("%d %d", &k, &r) != 2) {
        return 0;
    }
    if (k < 1 || k > MAXK || r < 0 || r > 3) {
        return 0;
    }
    char type[MAXK][16];
    int size[MAXK];
    int offset[MAXK];
    int used = 0;
    int align = 1;
    for (int i = 0; i < k; i++) {
        if (scanf("%15s", type[i]) != 1) {
            return 0;
        }
        size[i] = size_of(type[i]);
        offset[i] = used;                  /* 错：没有对齐 */
        used += size[i];
        if (size[i] > align) {
            align = size[i];
        }
    }
    int total = used;                      /* 错：没有向上取整到 align */
    for (int i = 0; i < k; i++) {
        printf("field%d %s offset=%d size=%d\n", i, type[i], offset[i], size[i]);
    }
    printf("size %d\n", total);
    printf("align %d\n", align);
    for (int j = 0; j < r; j++) {
        unsigned char bytes[64];
        memset(bytes, 0, sizeof bytes);
        for (int i = 0; i < k; i++) {
            long long value = 0;
            if (scanf("%lld", &value) != 1) {
                return 0;
            }
            for (int b = 0; b < size[i]; b++) {
                bytes[offset[i] + b] = (unsigned char)((value >> (8 * b)) & 0xFF);
            }
        }
        printf("record%d", j);
        for (int b = 0; b < total; b++) {
            printf(" %02X", bytes[b]);
        }
        printf("\n");
    }
    return 0;
}
```

### 把字节序写反（大端） [WA]
`0x01020304` 在小端机器上写出来是 `04 03 02 01`，先写高字节就是 `01 02 03 04`。虽然"人类看起来更顺眼"，但这台机器（x86-64）的 `fwrite` 写的就是小端；写反了文件就和真实内存镜像对不上。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXK 6

static int size_of(const char *type) {
    if (strcmp(type, "char") == 0) {
        return 1;
    }
    if (strcmp(type, "short") == 0) {
        return 2;
    }
    if (strcmp(type, "int") == 0) {
        return 4;
    }
    if (strcmp(type, "longlong") == 0) {
        return 8;
    }
    return 0;
}

int main(void) {
    int k = 0;
    int r = 0;
    if (scanf("%d %d", &k, &r) != 2) {
        return 0;
    }
    if (k < 1 || k > MAXK || r < 0 || r > 3) {
        return 0;
    }
    char type[MAXK][16];
    int size[MAXK];
    int offset[MAXK];
    int used = 0;
    int align = 1;
    for (int i = 0; i < k; i++) {
        if (scanf("%15s", type[i]) != 1) {
            return 0;
        }
        size[i] = size_of(type[i]);
        used = (used + size[i] - 1) / size[i] * size[i];
        offset[i] = used;
        used += size[i];
        if (size[i] > align) {
            align = size[i];
        }
    }
    int total = (used + align - 1) / align * align;
    for (int i = 0; i < k; i++) {
        printf("field%d %s offset=%d size=%d\n", i, type[i], offset[i], size[i]);
    }
    printf("size %d\n", total);
    printf("align %d\n", align);
    for (int j = 0; j < r; j++) {
        unsigned char bytes[64];
        memset(bytes, 0, sizeof bytes);
        for (int i = 0; i < k; i++) {
            long long value = 0;
            if (scanf("%lld", &value) != 1) {
                return 0;
            }
            for (int b = 0; b < size[i]; b++) {
                bytes[offset[i] + b] =        /* 错：高字节写到了低地址 */
                    (unsigned char)((value >> (8 * (size[i] - 1 - b))) & 0xFF);
            }
        }
        printf("record%d", j);
        for (int b = 0; b < total; b++) {
            printf(" %02X", bytes[b]);
        }
        printf("\n");
    }
    return 0;
}
```

### 把 longlong 按 4 字节对齐 [WA]
`long long` 的对齐要求是 8，不是 4。`char` 后面接 `long long` 时，`used` 要先补到 8 的倍数（偏移 0 的 `char` 之后要空出 7 个字节），而不是从偏移 4 开始。对齐算错，后面所有字段的偏移和总大小都会错。

### 以为填充字节里是"有意义的数据" [WA]
填充字节不属于任何字段，C 标准不规定它们的值。真实程序里它们可能是上一次使用这块内存留下的垃圾，也可能被 `memset` 清成 0，取决于编译器和你自己的初始化。所以：**不能比较两个结构体的整体字节**来判断"内容是否相等"，也不能把填充字节当成校验和的一部分。本题为了可复现，约定用 `memset` 清 0 后再赋值。

### 直接 fwrite 结构体就当成了稳定的文件格式 [WA]
`fwrite(&rec, sizeof rec, 1, fp)` 写出的字节取决于编译器：字段对齐策略、填充内容、类型宽度、字节序都可能变。同一份代码在 32 位和 64 位、Windows 和 Linux、x86 和 ARM 上写出的文件可能互不相认。要长期存储或跨平台交换，必须**逐字段序列化**并明确字节序与宽度。

## 测试用例
### 01 sample 示例 1
```in
2 1
char int
65 16909060
```
```out
field0 char offset=0 size=1
field1 int offset=4 size=4
size 8
align 4
record0 41 00 00 00 04 03 02 01
```

### 02 sample 示例 2（边界：没有记录）
```in
1 0
short
```
```out
field0 short offset=0 size=2
size 2
align 2
```

### 生成 boundary 6 个字段、3 条记录（最大规模）
```js gen
const cases = [];
const SIZE = { char: 1, short: 2, int: 4, longlong: 8 };
function layout(types) {
  let used = 0;
  let align = 1;
  const fields = types.map((t) => {
    const size = SIZE[t];
    used = Math.ceil(used / size) * size;
    const off = used;
    used += size;
    if (size > align) align = size;
    return { type: t, off, size };
  });
  return { fields, total: Math.ceil(used / align) * align, align };
}
function bytesOf(fields, total, values) {
  const bytes = new Array(total).fill(0);
  fields.forEach((f, i) => {
    const v = values[i];
    for (let b = 0; b < f.size; b++) bytes[f.off + b] = Math.floor(v / 2 ** (8 * b)) % 256;
  });
  return bytes;
}
function render(types, rows) {
  const { fields, total, align } = layout(types);
  const out = fields.map((f, i) => `field${i} ${f.type} offset=${f.off} size=${f.size}`);
  out.push(`size ${total}`, `align ${align}`);
  rows.forEach((vals, j) => {
    out.push(`record${j} ` + bytesOf(fields, total, vals).map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' '));
  });
  return out.join('\n') + '\n';
}
{
  const types = ['char', 'short', 'int', 'longlong', 'char', 'int'];
  const rows = [
    [65, 2054, 16909060, 1000000000, 66, 2147483647],
    [1, 2, 3, 4, 5, 6],
    [127, 32767, 65535, 123456789, 0, 305419896],
  ];
  const stdin = `${types.length} ${rows.length}\n${types.join(' ')}\n` + rows.map((r) => r.join(' ')).join('\n') + '\n';
  cases.push({ kind: 'boundary', category: '6 个字段、3 条记录（最大规模）', input: stdin, output: render(types, rows) });
}
{
  const types = ['int', 'int'];
  const rows = [[1, 2], [16909060, 305419896], [2147483647, 0]];
  const stdin = `${types.length} ${rows.length}\n${types.join(' ')}\n` + rows.map((r) => r.join(' ')).join('\n') + '\n';
  cases.push({ kind: 'normal', category: '两个 int 字段、3 条记录', input: stdin, output: render(types, rows) });
}
{
  const types = ['char', 'longlong'];
  const rows = [[7, 1000000000]];
  const stdin = `${types.length} ${rows.length}\n${types.join(' ')}\n` + rows.map((r) => r.join(' ')).join('\n') + '\n';
  cases.push({ kind: 'trap', category: 'char 后面接 longlong，偏移要补到 8', input: stdin, output: render(types, rows) });
}
{
  const types = ['int', 'char'];
  const rows = [[305419896, 65]];
  const stdin = `${types.length} ${rows.length}\n${types.join(' ')}\n` + rows.map((r) => r.join(' ')).join('\n') + '\n';
  cases.push({ kind: 'trap', category: '末尾字段是 char，总大小要补齐到 8', input: stdin, output: render(types, rows) });
}
{
  const types = ['int', 'char', 'short'];
  const stdin = `${types.length} 0\n${types.join(' ')}\n`;
  cases.push({ kind: 'degenerate', category: '没有记录，只看布局', input: stdin, output: render(types, []) });
}
return cases;
```
