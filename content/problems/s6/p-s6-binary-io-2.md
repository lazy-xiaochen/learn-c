---json
{
  "id": "p-s6-binary-io-2",
  "title": "筛选二进制记录：fread 读定长记录、fwrite 写出合格记录",
  "difficulty": "L4",
  "knowledgePoints": ["s6-binary-io"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
采集设备把数据写进一个**二进制文件**：每条记录固定 8 字节，依次是两个 32 位有符号整数（小端）：

```
| id（4 字节） | value（4 字节） |
```

现在要写一个筛选工具：读入一个阈值 `threshold`，把 `samples.bin` 里 **value ≥ threshold** 的记录按原格式写进 `valid.bin`，并输出统计。

要求：

- 必须用 `fread` 按"一条记录"为单位读取，并用它的返回值判断是否真的读到了一条完整记录；
- 文件末尾可能残留**不足 8 字节的尾巴**（写入过程被中断），这种残缺数据必须忽略，不能当成一条记录；
- `value` 是**有符号**整数，比较时不能把它当成无符号数；
- 程序不向标准输出打印任何内容。

## 输入格式
标准输入只有一行：阈值 `threshold`（-1000..1000 的整数）。

二进制数据文件 `samples.bin` 由测试用例提供：

- 文件长度 0..800 字节；
- 由 0..100 条 8 字节记录组成，文件末尾可能多出 0..7 个字节的残尾；
- 每条记录：`int32 id`（1..100000）、`int32 value`（-1000..1000），均为小端。

## 输出格式
在当前目录写出两个文件。

`valid.bin`：把所有 `value >= threshold` 的记录按原格式（8 字节/条、小端、顺序不变）写进去；一条都没有时是 0 字节文件。

`summary.txt`：4 行

```
status ok
total <完整记录条数>
kept <写进 valid.bin 的条数>
sum <kept 这些记录的 value 之和>
```

输入文件打不开时：

```
status error
total 0
kept 0
sum 0
```

## 数据范围
- 记录条数 0..100，文件长度 0..800 字节（含残尾）；
- `id` 1..100000，`value` -1000..1000，`threshold` -1000..1000；
- `sum` 在 `int` 范围内，但为了保险请用 `long long`；
- `summary.txt` 只有 4 行，`valid.bin` 不超过 800 字节，都远小于上限。

## 示例
### 示例 1
```in
10
```
```out
```
```file name=samples.bin base64
AQAAAAUAAAACAAAAFAAAAAMAAAD9////
```
```expect-file name=valid.bin compare=bytes base64
AgAAABQAAAA=
```
```expect-file name=summary.txt
status ok
total 3
kept 1
sum 20
```
> 三条记录是 `(1, 5)`、`(2, 20)`、`(3, -3)`，阈值 10。按 `value >= 10`，只有 `(2, 20)` 合格，所以 `valid.bin` 里就 8 个字节 `02 00 00 00 14 00 00 00`，`sum = 20`。程序不打印任何东西，`out` 为空。

### 示例 2（边界：空文件）
```in
0
```
```out
```
```file name=samples.bin
```
```expect-file name=valid.bin compare=bytes base64
```
```expect-file name=summary.txt
status ok
total 0
kept 0
sum 0
```
> 0 字节文件：第一次 `fread` 就返回 0，循环不执行。`valid.bin` 是 0 字节（仍然要创建），统计全是 0。空文件不是错误——**文件打不开**才是。

## 提示
### 第 1 层
先确定"读的单位"：`fread(&rec, sizeof rec, 1, fp)`。返回值是**元素个数**：1 表示读到了一条完整记录，0 表示文件结束或剩下的字节不够一条。

### 第 2 层
不要用 `feof` 控制循环，也不要用 `fread(&rec, 1, 8, fp) > 0` 判断——后者在只剩 4 个字节时也会返回 4（大于 0），会把残尾当成一条记录。正确写法是 `while (fread(&rec, sizeof rec, 1, fp) == 1)`。

### 第 3 层
比较 `rec.value >= threshold` 时两个操作数都是有符号 `int`，直接用即可。写文件用 `fwrite(&rec, sizeof rec, 1, out)` 并检查返回值是否等于 1；累计和用 `long long`。最后写 `summary.txt`，打不开输入文件的分支要单独处理。

## 参考代码
```c file=main.c
#include <stdint.h>
#include <stdio.h>

typedef struct {
    int32_t id;
    int32_t value;
} Sample;

int main(void) {
    int threshold = 0;
    if (scanf("%d", &threshold) != 1) {
        return 0;
    }

    FILE *in = fopen("samples.bin", "rb");     /* 二进制记录：必须带 b */
    if (in == NULL) {                          /* 打不开：只写错误统计 */
        FILE *fp = fopen("summary.txt", "w");
        if (fp == NULL) {
            return 0;
        }
        fprintf(fp, "status error\ntotal 0\nkept 0\nsum 0\n");
        if (fclose(fp) != 0) {
            return 0;
        }
        return 0;
    }

    FILE *out = fopen("valid.bin", "wb");
    if (out == NULL) {
        fclose(in);
        return 0;
    }

    long total = 0;
    long kept = 0;
    long long sum = 0;
    Sample rec;
    while (fread(&rec, sizeof rec, 1, in) == 1) {   /* 返回值是元素个数 */
        total++;
        if (rec.value < threshold) {
            continue;                                /* 有符号比较；不合格的记录跳过 */
        }
        if (fwrite(&rec, sizeof rec, 1, out) != 1) {
            fclose(out);
            fclose(in);
            return 0;
        }
        kept++;
        sum += rec.value;
    }
    if (fclose(out) != 0) {
        fclose(in);
        return 0;
    }
    fclose(in);

    FILE *fp = fopen("summary.txt", "w");
    if (fp == NULL) {
        return 0;
    }
    fprintf(fp, "status ok\ntotal %ld\nkept %ld\nsum %lld\n", total, kept, sum);
    if (fclose(fp) != 0) {
        return 0;
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdint.h>
#include <stdio.h>

typedef struct {
    int32_t id;
    int32_t value;
} Sample;

int main(void) {
    int threshold = 0;
    if (scanf("%d", &threshold) != 1) {
        return 0;
    }
    (void)threshold;                        /* TODO: 用它过滤记录 */

    FILE *in = fopen("samples.bin", "rb");
    if (in == NULL) {
        return 0;                           /* TODO: 打不开时要写 status error 的 summary.txt */
    }
    FILE *out = fopen("valid.bin", "wb");
    if (out == NULL) {
        fclose(in);
        return 0;
    }

    long total = 0;
    long kept = 0;
    long long sum = 0;
    Sample rec;
    while (fread(&rec, sizeof rec, 1, in) == 1) {
        total++;
        if (fwrite(&rec, sizeof rec, 1, out) != 1) {   /* TODO: 只写 value >= threshold 的记录 */
            break;
        }
        kept++;
        sum += rec.value;                            /* TODO: 只累加被保留的记录 */
    }
    fclose(out);
    fclose(in);

    FILE *fp = fopen("summary.txt", "w");
    if (fp == NULL) {
        return 0;
    }
    fprintf(fp, "status ok\ntotal %ld\nkept %ld\nsum %lld\n", total, kept, sum);
    if (fclose(fp) != 0) {
        return 0;
    }
    return 0;
}
```

## 复杂度
时间 O(记录条数)：每条记录一次 `fread`、最多一次 `fwrite`，最多 100 条。
空间 O(1)：一条记录大小的缓冲区。

## 常见错误
### 用 while (!feof(in)) 控制循环 [WA]
读到第 3 条记录是成功的，`feof` 仍然是 0，于是还会再进一圈：这一圈 `fread` 返回 0，`rec` 保持上一次的内容，`total` 却已经加一；如果最后一条记录刚好合格，还会被重复写进 `valid.bin`。

```c file=main.c expect=WA
#include <stdint.h>
#include <stdio.h>

typedef struct {
    int32_t id;
    int32_t value;
} Sample;

int main(void) {
    int threshold = 0;
    if (scanf("%d", &threshold) != 1) {
        return 0;
    }
    FILE *in = fopen("samples.bin", "rb");
    if (in == NULL) {
        return 0;
    }
    FILE *out = fopen("valid.bin", "wb");
    if (out == NULL) {
        fclose(in);
        return 0;
    }
    long total = 0;
    long kept = 0;
    long long sum = 0;
    Sample rec;
    while (!feof(in)) {                     /* 错：feof 不能用来控制循环 */
        fread(&rec, sizeof rec, 1, in);
        total++;
        if (rec.value < threshold) {
            continue;
        }
        if (fwrite(&rec, sizeof rec, 1, out) != 1) {
            break;
        }
        kept++;
        sum += rec.value;
    }
    fclose(out);
    fclose(in);
    FILE *fp = fopen("summary.txt", "w");
    if (fp == NULL) {
        return 0;
    }
    fprintf(fp, "status ok\ntotal %ld\nkept %ld\nsum %lld\n", total, kept, sum);
    fclose(fp);
    return 0;
}
```

### 用 fread(&rec, 1, 8, fp) > 0 判断"读到了一条" [WA]
`size = 1, count = 8` 时返回的是**字节数**：只剩 4 个字节的残尾时它返回 4，仍然大于 0，于是残尾被当成一条记录，`total` 和 `kept` 都虚高，写进 `valid.bin` 的字节也是错的。要么用 `size = sizeof rec, count = 1` 并判断 `== 1`，要么按字节读并自己凑够 8 个。

```c file=main.c expect=WA
#include <stdint.h>
#include <stdio.h>

typedef struct {
    int32_t id;
    int32_t value;
} Sample;

int main(void) {
    int threshold = 0;
    if (scanf("%d", &threshold) != 1) {
        return 0;
    }
    FILE *in = fopen("samples.bin", "rb");
    if (in == NULL) {
        return 0;
    }
    FILE *out = fopen("valid.bin", "wb");
    if (out == NULL) {
        fclose(in);
        return 0;
    }
    long total = 0;
    long kept = 0;
    long long sum = 0;
    Sample rec;
    while (fread(&rec, 1, sizeof rec, in) > 0) {   /* 错：残尾也会返回 > 0 */
        total++;
        if (rec.value < threshold) {
            continue;
        }
        if (fwrite(&rec, 1, sizeof rec, out) > 0) {
            kept++;
            sum += rec.value;
        }
    }
    fclose(out);
    fclose(in);
    FILE *fp = fopen("summary.txt", "w");
    if (fp == NULL) {
        return 0;
    }
    fprintf(fp, "status ok\ntotal %ld\nkept %ld\nsum %lld\n", total, kept, sum);
    fclose(fp);
    return 0;
}
```

### 用无符号比较 [WA]
把 `int32_t` 强制转成 `uint32_t` 再比较，负数会变成接近 `2^32` 的大数：阈值为 0 时，`-5` 会被判成"合格"写进 `valid.bin`，`sum` 也会加上一个负数（看起来还算得对，但 `kept` 错了）。

```c file=main.c expect=WA
#include <stdint.h>
#include <stdio.h>

typedef struct {
    int32_t id;
    int32_t value;
} Sample;

int main(void) {
    int threshold = 0;
    if (scanf("%d", &threshold) != 1) {
        return 0;
    }
    FILE *in = fopen("samples.bin", "rb");
    if (in == NULL) {
        return 0;
    }
    FILE *out = fopen("valid.bin", "wb");
    if (out == NULL) {
        fclose(in);
        return 0;
    }
    long total = 0;
    long kept = 0;
    long long sum = 0;
    Sample rec;
    while (fread(&rec, sizeof rec, 1, in) == 1) {
        total++;
        if ((uint32_t)rec.value < (uint32_t)threshold) {   /* 错：负值被当成大数 */
            continue;
        }
        if (fwrite(&rec, sizeof rec, 1, out) != 1) {
            break;
        }
        kept++;
        sum += rec.value;
    }
    fclose(out);
    fclose(in);
    FILE *fp = fopen("summary.txt", "w");
    if (fp == NULL) {
        return 0;
    }
    fprintf(fp, "status ok\ntotal %ld\nkept %ld\nsum %lld\n", total, kept, sum);
    fclose(fp);
    return 0;
}
```

### 打开了文本模式 [WA]
用 `fopen("samples.bin", "r")` / `"w"` 而不是 `"rb"` / `"wb"`，运行库会在读写时做换行转换：记录里只要出现字节 `0x0A`（value 的低字节可能正好是 10），文件长度就会变，`fread` 读到的记录跟着错位。二进制数据一律带 `b`。

### 打不开输入文件时不写 summary.txt [WA]
`samples.bin` 不存在时 `fopen` 返回 `NULL`。直接返回会让 `summary.txt` 缺失（判"文件没有生成"）；正确做法是写 `status error` 的四行统计，和"空文件"区分开。

## 测试用例
### 01 sample 示例 1
```in
10
```
```out
```
```file name=samples.bin base64
AQAAAAUAAAACAAAAFAAAAAMAAAD9////
```
```expect-file name=valid.bin compare=bytes base64
AgAAABQAAAA=
```
```expect-file name=summary.txt
status ok
total 3
kept 1
sum 20
```

### 02 sample 示例 2（边界：空文件）
```in
0
```
```out
```
```file name=samples.bin
```
```expect-file name=valid.bin compare=bytes base64
```
```expect-file name=summary.txt
status ok
total 0
kept 0
sum 0
```

### 03 boundary 只有一条合格记录
```in
50
```
```out
```
```file name=samples.bin base64
BwAAAGQAAAA=
```
```expect-file name=valid.bin compare=bytes base64
BwAAAGQAAAA=
```
```expect-file name=summary.txt
status ok
total 1
kept 1
sum 100
```

### 04 degenerate 文件只有 5 字节，凑不出一条记录
```in
0
```
```out
```
```file name=samples.bin base64
AQIDBAU=
```
```expect-file name=valid.bin compare=bytes base64
```
```expect-file name=summary.txt
status ok
total 0
kept 0
sum 0
```
> 5 个字节连一条记录都不够：`fread(&rec, 8, 1, fp)` 返回 0，循环一次都不执行。绝不能把"读到了几个字节"当成"读到了几条记录"。

### 05 trap 三条记录后面跟着 4 字节残尾
```in
2
```
```out
```
```file name=samples.bin base64
CgAAAAEAAAALAAAAAgAAAAwAAAADAAAAY2NjYw==
```
```expect-file name=valid.bin compare=bytes base64
CwAAAAIAAAAMAAAAAwAAAA==
```
```expect-file name=summary.txt
status ok
total 3
kept 2
sum 5
```
> 文件是 28 字节：3 条完整记录 + 4 字节尾巴 `63 63 63 63`。尾巴必须被忽略，`total` 是 3 而不是 4；`value >= 2` 保留 `(11, 2)` 和 `(12, 3)`。

### 06 trap 负数与阈值 0
```in
0
```
```out
```
```file name=samples.bin base64
AQAAAPv///8CAAAAAAAAAAMAAAD/////
```
```expect-file name=valid.bin compare=bytes base64
AgAAAAAAAAA=
```
```expect-file name=summary.txt
status ok
total 3
kept 1
sum 0
```
> 三条记录的 value 是 -5、0、-1。阈值 0 时只有第二条合格（`0 >= 0`）。如果把 value 当成无符号数，`-5`、`-1` 都会变成大数被保留下来。

### 生成 normal 100 条记录、阈值 0
```js gen
const cases = [];
function recBytes(id, v) {
  const b = Buffer.alloc(8);
  b.writeInt32LE(id, 0);
  b.writeInt32LE(v, 4);
  return b;
}
{
  const n = 100;
  const recs = [];
  for (let i = 0; i < n; i++) recs.push({ id: i + 1, value: i - 50 });
  const bytes = Buffer.concat(recs.map((r) => recBytes(r.id, r.value)));
  const kept = recs.filter((r) => r.value >= 0);
  const sum = kept.reduce((s, r) => s + r.value, 0);
  cases.push({
    kind: 'normal',
    category: '100 条记录、阈值 0',
    input: '0\n',
    files: { 'samples.bin': { base64: bytes.toString('base64') } },
    expectFiles: [
      { name: 'valid.bin', base64: Buffer.concat(kept.map((r) => recBytes(r.id, r.value))).toString('base64'), compare: 'bytes' },
      { name: 'summary.txt', content: `status ok\ntotal ${n}\nkept ${kept.length}\nsum ${sum}\n` },
    ],
  });
}
return cases;
```

### 生成 boundary 100 条记录、全部保留 / 全部丢弃
```js gen
const cases = [];
function recBytes(id, v) {
  const b = Buffer.alloc(8);
  b.writeInt32LE(id, 0);
  b.writeInt32LE(v, 4);
  return b;
}
{
  const n = 100;
  const recs = [];
  for (let i = 0; i < n; i++) recs.push({ id: 1000 + i, value: 1000 });
  const bytes = Buffer.concat(recs.map((r) => recBytes(r.id, r.value)));
  cases.push({
    kind: 'boundary',
    category: '100 条记录、阈值取最大值，全部保留',
    input: '1000\n',
    files: { 'samples.bin': { base64: bytes.toString('base64') } },
    expectFiles: [
      { name: 'valid.bin', base64: bytes.toString('base64'), compare: 'bytes' },
      { name: 'summary.txt', content: `status ok\ntotal ${n}\nkept ${n}\nsum ${1000 * n}\n` },
    ],
  });
}
{
  const n = 100;
  const recs = [];
  for (let i = 0; i < n; i++) recs.push({ id: 2000 + i, value: 999 });
  const bytes = Buffer.concat(recs.map((r) => recBytes(r.id, r.value)));
  cases.push({
    kind: 'boundary',
    category: '100 条记录、阈值 1000，一条都不保留',
    input: '1000\n',
    files: { 'samples.bin': { base64: bytes.toString('base64') } },
    expectFiles: [
      { name: 'valid.bin', base64: '', compare: 'bytes' },
      { name: 'summary.txt', content: `status ok\ntotal ${n}\nkept 0\nsum 0\n` },
    ],
  });
}
return cases;
```
