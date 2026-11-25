---json
{
  "id": "p-s4-pragma-pack-2",
  "title": "协议帧序列化：按 pack(1) 布局打包字段并核对帧尾 crc",
  "difficulty": "L4",
  "knowledgePoints": ["s4-pragma-pack"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
设备固件要把状态打包成定长帧发给上位机。协议文档规定：

- 字段按声明顺序**紧挨着**排列，中间没有任何填充（等价于用 `#pragma pack(1)` 声明的结构体）；
- 多字节字段按**小端**上线（低字节先发）；
- 帧的最后一个字段是 `u8 crc`，它的值等于**它前面所有字节**依次异或的结果。

请写一个"打包器"：读入字段表和若干条记录，按协议把每条记录序列化成字节流，核对帧里给出的 crc 是否正确，并把字节流打印成十六进制，方便和录波器抓到的数据逐字节比对。

这道题是 `#pragma pack` 那一课的另一半：既然不能保证"内存里的结构体"和"线上的字节"一致（填充由对齐决定、字节序由 CPU 决定），就**显式**地按偏移和移位把字段写进缓冲区。协议要什么字节，代码就生成什么字节，不依赖任何编译器行为。

## 输入格式
第一行一个整数 `n`：字段个数。

接下来 `n` 行，每行 `<类型> <字段名>`，类型是 `u8`、`u16`、`u32`、`u64` 之一。**最后一个字段固定是 `u8 crc`**，其余字段顺序就是上线顺序。

接下来一行一个整数 `m`：记录条数。

接下来 `m` 行，每行 `n` 个十进制整数，按字段顺序给出该记录所有字段的值（包括帧里携带的 crc 值）。`u64` 的取值范围是 0 到 18446744073709551615，要用 64 位无符号类型读入。

## 输出格式
按下面的顺序输出：

1. 一行 `packed=<P>`，`P` 是所有字段宽度之和——pack(1) 下没有填充，所以它也就是 `sizeof(结构体)`；
2. `n` 行 `map <字段名> +<偏移>`，按字段顺序输出，偏移 = 前面所有字段的宽度之和；
3. `m` 行 `frame <i> crc=<ok|bad> hex=<十六进制串>`，`i` 从 1 开始：
   - `hex` 是这条记录序列化后的 `P` 个字节，每个字节两位小写十六进制，**不能有空格**；
   - `crc=ok` 表示记录里给出的 crc 字段等于按规则算出的值，否则 `crc=bad`（字节流仍然照常输出）；
4. 最后一行 `total=<m × P>`。

## 数据范围
1 ≤ n ≤ 8
1 ≤ m ≤ 100
`P` = 各字段宽度之和 ≤ 64
`u8` 字段：0–255；`u16` 字段：0–65535；`u32` 字段：0–4294967295；`u64` 字段：0–18446744073709551615。

输出最多约 `1 + 8 + 100 + 1 = 110` 行，最长的一行是 64 字节的十六进制串（128 个字符）加上固定前缀，总大小远小于 64KB。

## 示例
### 示例 1
```in
4
u8 magic
u16 length
u32 seq
u8 crc
2
122 258 287454020 61
122 258 287454020 0
```
```out
packed=8
map magic +0
map length +1
map seq +3
map crc +7
frame 1 crc=ok hex=7a0201443322113d
frame 2 crc=bad hex=7a02014433221100
total=16
```
> 四个字段是 1 + 2 + 4 + 1 = 8 字节，偏移依次是 0、1、3、7，`#pragma pack(1)` 下没有任何取整。第一条记录：`magic=0x7a`、`length=258=0x0102`（小端写成 `02 01`）、`seq=0x11223344`（小端写成 `44 33 22 11`），异或 `7a^02^01^44^33^22^11 = 0x3d = 61`，与给出的 crc 相等，所以 `crc=ok`。第二条记录只有 crc 换成了 0，字节流其余部分一样，算出的 `0x3d` 与 0 不等，标 `crc=bad`。

### 示例 2（边界：只有一个 crc 字段）
```in
1
u8 crc
2
0
255
```
```out
packed=1
map crc +0
frame 1 crc=ok hex=00
frame 2 crc=bad hex=ff
total=2
```
> 帧里只有 crc 一个字段，它前面没有任何字节，异或的结果按定义是 0。因此 crc 给 0 时 `ok`，给 255 时 `bad`。这也说明 `packed - 1` 可能是 0，crc 的累加循环要能处理"没有前导字节"这种退化情况。

## 提示
### 第 1 层
先算布局：`packed` 是字段宽度之和，每个字段的偏移是它前面所有字段宽度之和（第一个字段偏移 0）。这就是 `pack(1)` 的全部含义——没有对齐取整，也没有填充，直接用累加。

### 第 2 层
序列化时按字段宽度 `w` 逐字节写出：第 `k` 个字节是 `(v >> (8 * k)) & 0xFF`，`k` 从 0 到 `w - 1`。`u64` 必须用 `unsigned long long` 配 `%llu` 读入，移位也要在 64 位类型上做；用 `int` 或 `unsigned` 当中间量会把高 32 位丢掉。

### 第 3 层
crc 只覆盖**它前面的** `P - 1` 个字节，不包括它自己：写成 `for (k = 0; k < packed - 1; k++)` 而不是 `k < packed`。最后用 `crc == bytes[packed - 1]` 判断 `ok` / `bad`。十六进制必须用 `%02x` 补零，否则 `0x0f` 会打成 `f`，整行的字节数对不上。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAXF 8
#define MAXREC 100
#define MAXBYTES 64

static int width_of(const char *t) {
    if (t[0] != 'u') return 0;
    if (t[1] == '8' && t[2] == '\0') return 1;
    if (t[1] == '1' && t[2] == '6' && t[3] == '\0') return 2;
    if (t[1] == '3' && t[2] == '2' && t[3] == '\0') return 4;
    if (t[1] == '6' && t[2] == '4' && t[3] == '\0') return 8;
    return 0;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXF) return 0;
    char name[MAXF][16];
    int width[MAXF];
    int packed = 0;
    for (int i = 0; i < n; i++) {
        char type[8];
        if (scanf("%7s %15s", type, name[i]) != 2) return 0;
        int w = width_of(type);
        if (w == 0) return 0;
        width[i] = w;
        packed += w;
    }

    /* pack(1)：偏移就是前缀和，packed 就是总和 */
    printf("packed=%d\n", packed);
    int off = 0;
    for (int i = 0; i < n; i++) {
        printf("map %s +%d\n", name[i], off);
        off += width[i];
    }

    int m;
    if (scanf("%d", &m) != 1 || m < 1 || m > MAXREC) return 0;
    for (int r = 1; r <= m; r++) {
        unsigned char bytes[MAXBYTES];
        int pos = 0;
        for (int i = 0; i < n; i++) {
            unsigned long long v;
            if (scanf("%llu", &v) != 1) return 0;
            for (int k = 0; k < width[i]; k++) {
                bytes[pos++] = (unsigned char)((v >> (8 * k)) & 0xFFull);   /* 小端：低字节先 */
            }
        }
        unsigned crc = 0;
        for (int k = 0; k < packed - 1; k++) crc ^= bytes[k];               /* 不含 crc 自己 */
        printf("frame %d crc=%s hex=", r, crc == bytes[packed - 1] ? "ok" : "bad");
        for (int k = 0; k < packed; k++) printf("%02x", (unsigned)bytes[k]);
        printf("\n");
    }
    printf("total=%d\n", m * packed);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAXF 8
#define MAXREC 100
#define MAXBYTES 64

static int width_of(const char *t) {
    if (t[0] != 'u') return 0;
    if (t[1] == '8' && t[2] == '\0') return 1;
    if (t[1] == '1' && t[2] == '6' && t[3] == '\0') return 2;
    if (t[1] == '3' && t[2] == '2' && t[3] == '\0') return 4;
    if (t[1] == '6' && t[2] == '4' && t[3] == '\0') return 8;
    return 0;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXF) return 0;
    char name[MAXF][16];
    int width[MAXF];
    int packed = 0;
    for (int i = 0; i < n; i++) {
        char type[8];
        if (scanf("%7s %15s", type, name[i]) != 2) return 0;
        int w = width_of(type);
        if (w == 0) return 0;
        width[i] = w;
        packed += w;
    }

    printf("packed=%d\n", packed);
    int off = 0;
    for (int i = 0; i < n; i++) {
        printf("map %s +%d\n", name[i], off);
        off += width[i];
    }

    int m;
    if (scanf("%d", &m) != 1 || m < 1 || m > MAXREC) return 0;
    for (int r = 1; r <= m; r++) {
        unsigned char bytes[MAXBYTES];
        int pos = 0;
        for (int i = 0; i < n; i++) {
            unsigned long long v;
            if (scanf("%llu", &v) != 1) return 0;
            for (int k = 0; k < width[i]; k++) {
                /* TODO: 协议要求小端（低字节先），这里写成了大端 */
                bytes[pos++] = (unsigned char)((v >> (8 * (width[i] - 1 - k))) & 0xFFull);
            }
        }
        unsigned crc = 0;
        for (int k = 0; k < packed; k++) crc ^= bytes[k];   /* TODO: 应该只算前 packed-1 个字节 */
        printf("frame %d crc=%s hex=", r, crc == bytes[packed - 1] ? "ok" : "bad");
        for (int k = 0; k < packed; k++) printf("%x", (unsigned)bytes[k]);   /* TODO: 每个字节要两位 */
        printf("\n");
    }
    printf("total=%d\n", m * packed);
    return 0;
}
```

## 复杂度
时间 O(m × P)：每条记录必须逐字节写进缓冲区，`P ≤ 64`、`m ≤ 100`，总量很小。
空间 O(P)：一个 64 字节的栈上缓冲区就够，不需要额外数组。

## 常见错误
### 计算 crc 时把 crc 字段自己也异或进去 [WA]
crc 只覆盖它**前面**的字节。循环写成 `k < packed` 时，帧里给出的 crc 字节也参与异或，算出的值必然和它自己不同——所有记录都会变成 `bad`，而十六进制串却完全正确，很容易让人以为问题出在别处。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXF 8
#define MAXREC 100
#define MAXBYTES 64

static int width_of(const char *t) {
    if (t[0] != 'u') return 0;
    if (t[1] == '8' && t[2] == '\0') return 1;
    if (t[1] == '1' && t[2] == '6' && t[3] == '\0') return 2;
    if (t[1] == '3' && t[2] == '2' && t[3] == '\0') return 4;
    if (t[1] == '6' && t[2] == '4' && t[3] == '\0') return 8;
    return 0;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXF) return 0;
    char name[MAXF][16];
    int width[MAXF];
    int packed = 0;
    for (int i = 0; i < n; i++) {
        char type[8];
        if (scanf("%7s %15s", type, name[i]) != 2) return 0;
        int w = width_of(type);
        if (w == 0) return 0;
        width[i] = w;
        packed += w;
    }
    printf("packed=%d\n", packed);
    int off = 0;
    for (int i = 0; i < n; i++) {
        printf("map %s +%d\n", name[i], off);
        off += width[i];
    }
    int m;
    if (scanf("%d", &m) != 1 || m < 1 || m > MAXREC) return 0;
    for (int r = 1; r <= m; r++) {
        unsigned char bytes[MAXBYTES];
        int pos = 0;
        for (int i = 0; i < n; i++) {
            unsigned long long v;
            if (scanf("%llu", &v) != 1) return 0;
            for (int k = 0; k < width[i]; k++) {
                bytes[pos++] = (unsigned char)((v >> (8 * k)) & 0xFFull);
            }
        }
        unsigned crc = 0;
        for (int k = 0; k < packed; k++) crc ^= bytes[k];      /* 错：包含了 crc 自己 */
        printf("frame %d crc=%s hex=", r, crc == bytes[packed - 1] ? "ok" : "bad");
        for (int k = 0; k < packed; k++) printf("%02x", (unsigned)bytes[k]);
        printf("\n");
    }
    printf("total=%d\n", m * packed);
    return 0;
}
```

### 按大端写出字段 [WA]
协议写的是小端，就必须先写低字节：第 `k` 个字节是 `(v >> (8 * k)) & 0xFF`。写成 `8 * (width - 1 - k)` 会让多字节字段整体反过来——`length=0x0102` 变成 `01 02` 而不是协议要求的 `02 01`，对端解出来的值差了 256 倍。注意本平台内存里 `int` 本来就是小端，所以"直接 `memcpy` 结构体"在这道题上恰好是对的，但那是平台巧合，不是可移植的写法。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXF 8
#define MAXREC 100
#define MAXBYTES 64

static int width_of(const char *t) {
    if (t[0] != 'u') return 0;
    if (t[1] == '8' && t[2] == '\0') return 1;
    if (t[1] == '1' && t[2] == '6' && t[3] == '\0') return 2;
    if (t[1] == '3' && t[2] == '2' && t[3] == '\0') return 4;
    if (t[1] == '6' && t[2] == '4' && t[3] == '\0') return 8;
    return 0;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXF) return 0;
    char name[MAXF][16];
    int width[MAXF];
    int packed = 0;
    for (int i = 0; i < n; i++) {
        char type[8];
        if (scanf("%7s %15s", type, name[i]) != 2) return 0;
        int w = width_of(type);
        if (w == 0) return 0;
        width[i] = w;
        packed += w;
    }
    printf("packed=%d\n", packed);
    int off = 0;
    for (int i = 0; i < n; i++) {
        printf("map %s +%d\n", name[i], off);
        off += width[i];
    }
    int m;
    if (scanf("%d", &m) != 1 || m < 1 || m > MAXREC) return 0;
    for (int r = 1; r <= m; r++) {
        unsigned char bytes[MAXBYTES];
        int pos = 0;
        for (int i = 0; i < n; i++) {
            unsigned long long v;
            if (scanf("%llu", &v) != 1) return 0;
            for (int k = 0; k < width[i]; k++) {
                bytes[pos++] = (unsigned char)((v >> (8 * (width[i] - 1 - k))) & 0xFFull);  /* 错：大端 */
            }
        }
        unsigned crc = 0;
        for (int k = 0; k < packed - 1; k++) crc ^= bytes[k];
        printf("frame %d crc=%s hex=", r, crc == bytes[packed - 1] ? "ok" : "bad");
        for (int k = 0; k < packed; k++) printf("%02x", (unsigned)bytes[k]);
        printf("\n");
    }
    printf("total=%d\n", m * packed);
    return 0;
}
```

### 十六进制没有补零 [WA]
`%x` 只输出有效位，`0x0f` 会变成 `f`、`0x00` 会变成 `0`，整行的字符数就随数据变化，无法按固定宽度比对。必须用 `%02x`，并把参数转成 `unsigned` 以免被当成有符号数打印。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXF 8
#define MAXREC 100
#define MAXBYTES 64

static int width_of(const char *t) {
    if (t[0] != 'u') return 0;
    if (t[1] == '8' && t[2] == '\0') return 1;
    if (t[1] == '1' && t[2] == '6' && t[3] == '\0') return 2;
    if (t[1] == '3' && t[2] == '2' && t[3] == '\0') return 4;
    if (t[1] == '6' && t[2] == '4' && t[3] == '\0') return 8;
    return 0;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXF) return 0;
    char name[MAXF][16];
    int width[MAXF];
    int packed = 0;
    for (int i = 0; i < n; i++) {
        char type[8];
        if (scanf("%7s %15s", type, name[i]) != 2) return 0;
        int w = width_of(type);
        if (w == 0) return 0;
        width[i] = w;
        packed += w;
    }
    printf("packed=%d\n", packed);
    int off = 0;
    for (int i = 0; i < n; i++) {
        printf("map %s +%d\n", name[i], off);
        off += width[i];
    }
    int m;
    if (scanf("%d", &m) != 1 || m < 1 || m > MAXREC) return 0;
    for (int r = 1; r <= m; r++) {
        unsigned char bytes[MAXBYTES];
        int pos = 0;
        for (int i = 0; i < n; i++) {
            unsigned long long v;
            if (scanf("%llu", &v) != 1) return 0;
            for (int k = 0; k < width[i]; k++) {
                bytes[pos++] = (unsigned char)((v >> (8 * k)) & 0xFFull);
            }
        }
        unsigned crc = 0;
        for (int k = 0; k < packed - 1; k++) crc ^= bytes[k];
        printf("frame %d crc=%s hex=", r, crc == bytes[packed - 1] ? "ok" : "bad");
        for (int k = 0; k < packed; k++) printf("%x", (unsigned)bytes[k]);   /* 错：没有补零 */
        printf("\n");
    }
    printf("total=%d\n", m * packed);
    return 0;
}
```

### 用 `unsigned` 或 `int` 存 `u64` 字段 [WA]
`u64` 的高 32 位会被截掉：18446744073709551615 用 `unsigned` 读进来是 4294967295，序列化出来只有 4 个 `ff`，后面的字节全错。读取用 `unsigned long long` 加 `%llu`，移位也在 64 位类型上进行，不要先截成 `unsigned` 再拼字节。

### 把 `packed` 当成"字节数"却忘了它可能是奇数 [WA]
`pack(1)` 的结构体对齐值是 1，所以总大小**不**向上取整到 2、4、8——用例里就有 7、13、17 这样的奇数总长。如果习惯性地按 4 或 8 取整，`packed` 和 `total` 都会偏大，`map` 的最后一行的偏移也会跟着错位。

## 测试用例
### 01 sample 示例 1
```in
4
u8 magic
u16 length
u32 seq
u8 crc
2
122 258 287454020 61
122 258 287454020 0
```
```out
packed=8
map magic +0
map length +1
map seq +3
map crc +7
frame 1 crc=ok hex=7a0201443322113d
frame 2 crc=bad hex=7a02014433221100
total=16
```

### 02 sample 示例 2
```in
1
u8 crc
2
0
255
```
```out
packed=1
map crc +0
frame 1 crc=ok hex=00
frame 2 crc=bad hex=ff
total=2
```

### 03 degenerate 全部是 u8，值只有 0 和 255
```in
2
u8 a
u8 crc
3
0 0
255 255
1 0
```
```out
packed=2
map a +0
map crc +1
frame 1 crc=ok hex=0000
frame 2 crc=ok hex=ffff
frame 3 crc=bad hex=0100
total=6
```

### 04 boundary u64 最大值与 17 字节帧
```in
3
u64 hi
u64 lo
u8 crc
2
18446744073709551615 0 0
18446744073709551615 1 1
```
```out
packed=17
map hi +0
map lo +8
map crc +16
frame 1 crc=ok hex=ffffffffffffffff000000000000000000
frame 2 crc=ok hex=ffffffffffffffff010000000000000001
total=34
```

### 05 trap 需要补零的字节
```in
3
u32 word
u16 half
u8 crc
2
258 15 12
4294967295 0 0
```
```out
packed=7
map word +0
map half +4
map crc +6
frame 1 crc=ok hex=020100000f000c
frame 2 crc=ok hex=ffffffff000000
total=14
```

### 06 trap 最高位为 1 的 u32 与错误的 crc
```in
2
u32 big
u8 crc
2
2147483648 128
4294967295 255
```
```out
packed=5
map big +0
map crc +4
frame 1 crc=ok hex=0000008080
frame 2 crc=bad hex=ffffffffff
total=10
```

### 07 normal 8 个字段的完整帧
```in
8
u8 kind
u8 flags
u16 length
u32 seq
u8 channel
u8 retry
u16 reserved
u8 crc
2
1 2 512 305419896 7 3 0 13
255 255 65535 4294967295 255 255 65535 0
```
```out
packed=13
map kind +0
map flags +1
map length +2
map seq +4
map channel +8
map retry +9
map reserved +10
map crc +12
frame 1 crc=ok hex=0102000278563412070300000d
frame 2 crc=ok hex=ffffffffffffffffffffffff00
total=26
```

### 生成 stress 100 条随机记录
```js gen
const W = { u8: 1, u16: 2, u32: 4, u64: 8 };
const fields = [["u64", "stamp"], ["u32", "seq"], ["u16", "length"], ["u8", "kind"], ["u8", "crc"]];
const packed = fields.reduce((s, f) => s + W[f[0]], 0);

function bytesOf(v, w) {
  const out = [];
  let x = v;
  for (let k = 0; k < w; k++) {
    out.push(Number(x & 0xFFn));
    x >>= 8n;
  }
  return out;
}
function hexOf(bytes) {
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const lines = [String(fields.length)];
for (const [t, name] of fields) lines.push(`${t} ${name}`);
const out = [`packed=${packed}`];
let off = 0;
for (const [t, name] of fields) {
  out.push(`map ${name} +${off}`);
  off += W[t];
}

const records = 100;
lines.push(String(records));
for (let r = 0; r < records; r++) {
  const stamp = (BigInt(rng.int(0, 0xffffffff)) << 32n) | BigInt(rng.int(0, 0xffffffff));
  const seq = BigInt(rng.int(0, 4294967295));
  const length = BigInt(rng.int(0, 65535));
  const kind = BigInt(rng.int(0, 255));
  const head = [].concat(bytesOf(stamp, 8), bytesOf(seq, 4), bytesOf(length, 2), bytesOf(kind, 1));
  let correct = 0;
  for (const b of head) correct ^= b;
  /* 每 7 条故意弄错一条，保证 crc=bad 也被大量覆盖 */
  const stored = r % 7 === 3 ? (correct + 1) & 0xFF : correct;
  const bytes = head.concat(bytesOf(BigInt(stored), 1));
  lines.push([stamp, seq, length, kind, BigInt(stored)].map(String).join(" "));
  out.push(`frame ${r + 1} crc=${stored === correct ? "ok" : "bad"} hex=${hexOf(bytes)}`);
}
out.push(`total=${records * packed}`);

return [{
  kind: "stress",
  category: "100 条记录，u64 时间戳与 32 位序号",
  input: lines.join("\n") + "\n",
  output: out.join("\n") + "\n",
}];
```
