---json
{
  "id": "p-s6-text-format-io-1",
  "title": "实现记录文件的读写函数：按格式存、按格式取（fprintf / fscanf）",
  "difficulty": "L3",
  "knowledgePoints": ["s6-text-format-io"],
  "special": "ds-implementation",
  "judge": { "mode": "function", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
仓库管理系统的第一版只支持"把内存里的库存记录存成文本文件"和"从文本文件读回库存记录"两个动作。文件格式由团队定死：**每行一条记录，三个字段用单个空格分隔**，依次是

```
名字 数量 单价
```

其中名字是不含空格的字符串（最长 15 个字符），数量是十进制整数，单价是保留两位小数的浮点数。例如：

```
bolt 12 0.50
nut 7 0.25
```

你需要实现头文件 `records.h` 里声明的两个函数：

```c
int rec_save(const char *path, const Rec *recs, int n);   /* 把 n 条记录写进 path */
int rec_load(const char *path, Rec *recs, int max);       /* 从 path 最多读 max 条记录 */
```

约定：

- `rec_save` 成功返回**写入的条数**（正常等于 `n`）；文件打不开、写入失败、关闭失败都返回 `-1`；
- `rec_load` 返回**实际读到的条数**（可以是 0）；文件打不开返回 `-1`；遇到第一个格式不对的行就立即停止，已经读到的记录保留并返回其条数；
- 两个函数都必须检查 `fopen` 的返回值，并且用 `fprintf` / `fscanf` 的返回值判断每一次读写是否成功。

评测由一个隐藏的测试驱动完成：它按命令调用你的函数，并把结果打印到标准输出，同时检查你写出的文件内容。

## 输入格式
隐藏的测试驱动从标准输入读取命令，有两种：

- `save <路径>`：下一行是整数 `n`，再接下来 `n` 行是 `名字 数量 单价` 的原始记录；驱动把它们填进 `Rec` 数组后调用 `rec_save`，随后立刻调用 `rec_load` 把文件读回来；
- `load <路径>`：直接调用 `rec_load` 读取给定的文件。

路径由题目保证不含空格；数据文件由测试用例提供。

## 输出格式
驱动的输出（也就是你程序的输出）：

- `save <路径>` 命令：先输出 `save=<返回值>`，再用 `load` 的形式输出回读结果；
- 回读结果：`load=<返回值>`，随后每条记录一行 `[下标] 名字 数量 单价`（单价两位小数）；
- 返回值为 `-1` 时不打印任何记录行。

## 数据范围
- `0 ≤ n ≤ 64`，`0 ≤ max ≤ 64`（`REC_MAX` 为 64）；
- 名字长度 1..15，只含字母、数字、下划线；
- 数量 0..100000，单价 0.00..9999.99，且**恰好两位小数**；
- 一个文件最多 64 行记录；
- 输出最多约 70 行，远小于 64KB。

## 示例
### 示例 1
```in
save stock.txt
3
bolt 12 0.50
nut 7 0.25
washer 40 0.10
```
```out
save=3
load=3
[0] bolt 12 0.50
[1] nut 7 0.25
[2] washer 40 0.10
```
```expect-file name=stock.txt
bolt 12 0.50
nut 7 0.25
washer 40 0.10
```
> `rec_save` 返回 3，文件里是 3 行、格式 `名字 数量 单价`、单价两位小数。驱动紧接着回读，`rec_load` 也返回 3——写和读的格式必须严格对称，否则第二个数字就会对不上。

### 示例 2（边界：空文件读回 0 条）
```in
load empty.txt
```
```out
load=0
```
```file name=empty.txt
```
> 文件是 0 字节，`fopen` 成功、`fscanf` 立刻返回 `EOF`，所以 `rec_load` 返回 0（不是 -1）。0 和 -1 的区别很重要：**文件存在但没有记录**是 0，**文件打不开**才是 -1。

## 提示
### 第 1 层
先看清楚"返回值的约定"：`rec_save` 返回写入条数、失败返回 -1；`rec_load` 返回读到的条数、打不开返回 -1、格式错误就停下。这三种情况的边界要先想清楚，再动手写循环。

### 第 2 层
写文件用 `fprintf(fp, "%s %d %.2f\n", ...)`，读文件用 `fscanf(fp, "%15s %d %lf", ...)`。注意 `%15s` 的宽度（名字数组是 `char[16]`），以及读 `double` 必须用 `%lf`（`%f` 对应 `float *`）。

### 第 3 层
`rec_load` 的循环条件是 `fscanf` 的返回值**恰好等于 3**：等于 3 才是一条完整记录；返回 0、1、2 说明这一行格式不对（或只读了一半），要停下并返回已读条数；返回 `EOF` 说明读完了。不要用 `feof` 控制循环，也不要只判断 `!= EOF`。

## 测试驱动
```c file=records.h
#ifndef RECORDS_H
#define RECORDS_H

#define REC_MAX 64      /* 一次最多处理的记录条数 */
#define REC_NAME 15     /* 名字最长 15 个字符（不含结尾的 '\0'） */

typedef struct {
    char name[REC_NAME + 1];
    int qty;
    double price;
} Rec;

/* 把 recs 里的 n 条记录按 "名字 数量 单价\n" 写进 path。
   成功返回写入的条数（等于 n），文件打不开或写失败返回 -1。 */
int rec_save(const char *path, const Rec *recs, int n);

/* 从 path 读记录，最多读 max 条。
   返回实际读到的条数（可以是 0）；文件打不开返回 -1；
   遇到第一个格式不对的行立即停止，已读到的记录保留。 */
int rec_load(const char *path, Rec *recs, int max);

#endif
```

```c file=rec_harness.c hidden
#include <stdio.h>
#include <string.h>

#include "records.h"

static void report(int got, const Rec *recs) {
    if (got < 0) {
        printf("load=-1\n");
        return;
    }
    printf("load=%d\n", got);
    for (int i = 0; i < got; i++) {
        printf("[%d] %s %d %.2f\n", i, recs[i].name, recs[i].qty, recs[i].price);
    }
}

int main(void) {
    char line[256];
    char cmd[8] = {0};
    char path[64] = {0};
    Rec recs[REC_MAX];

    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    if (sscanf(line, "%7s %63s", cmd, path) != 2) {
        return 0;
    }

    if (strcmp(cmd, "save") == 0) {
        if (fgets(line, sizeof line, stdin) == NULL) {
            return 0;
        }
        int n = 0;
        if (sscanf(line, "%d", &n) != 1 || n < 0 || n > REC_MAX) {
            return 0;
        }
        for (int i = 0; i < n; i++) {
            if (fgets(line, sizeof line, stdin) == NULL) {
                return 0;
            }
            if (sscanf(line, "%15s %d %lf", recs[i].name, &recs[i].qty, &recs[i].price) != 3) {
                return 0;
            }
        }
        printf("save=%d\n", rec_save(path, recs, n));
        report(rec_load(path, recs, REC_MAX), recs);
    } else if (strcmp(cmd, "load") == 0) {
        report(rec_load(path, recs, REC_MAX), recs);
    }
    return 0;
}
```

## 参考代码
```c file=rec.c
#include <stdio.h>

#include "records.h"

int rec_save(const char *path, const Rec *recs, int n) {
    if (path == NULL || recs == NULL || n < 0 || n > REC_MAX) {
        return -1;
    }
    FILE *fp = fopen(path, "w");
    if (fp == NULL) {
        return -1;
    }
    int written = 0;
    for (int i = 0; i < n; i++) {
        if (fprintf(fp, "%s %d %.2f\n", recs[i].name, recs[i].qty, recs[i].price) < 0) {
            fclose(fp);
            return -1;
        }
        written++;
    }
    if (fclose(fp) != 0) {
        return -1;
    }
    return written;
}

int rec_load(const char *path, Rec *recs, int max) {
    if (path == NULL || recs == NULL || max < 0 || max > REC_MAX) {
        return -1;
    }
    FILE *fp = fopen(path, "r");
    if (fp == NULL) {
        return -1;
    }
    int count = 0;
    while (count < max) {
        char name[REC_NAME + 1] = {0};
        int qty = 0;
        double price = 0.0;
        int got = fscanf(fp, "%15s %d %lf", name, &qty, &price);
        if (got != 3) {
            break;                     /* EOF 或者格式不对：都停下 */
        }
        for (int k = 0; k <= REC_NAME; k++) {
            recs[count].name[k] = name[k];
        }
        recs[count].qty = qty;
        recs[count].price = price;
        count++;
    }
    if (fclose(fp) != 0) {
        return -1;
    }
    return count;
}
```

## 初始代码
```c file=rec.c
#include <stdio.h>

#include "records.h"

int rec_save(const char *path, const Rec *recs, int n) {
    if (path == NULL || recs == NULL || n < 0 || n > REC_MAX) {
        return -1;
    }
    /* TODO: 用 fopen(path, "w") 打开文件（打不开返回 -1）；
       循环 fprintf "%s %d %.2f\n" 写出 n 条记录（每次检查 fprintf 的返回值）；
       fclose 失败也要返回 -1；成功返回写入的条数。 */
    return 0;
}

int rec_load(const char *path, Rec *recs, int max) {
    if (path == NULL || recs == NULL || max < 0 || max > REC_MAX) {
        return -1;
    }
    /* TODO: 用 fopen(path, "r") 打开文件（打不开返回 -1）；
       循环 fscanf("%15s %d %lf")，只有返回值 == 3 才算一条完整记录；
       遇到 EOF 或格式不对就停下，返回已经读到的条数；
       读满 max 条也要停下。 */
    return 0;
}
```

## 复杂度
时间 O(n)：每条记录一次 `fprintf` 或一次 `fscanf`，`n ≤ 64`。
空间 O(1)：只用固定大小的临时缓冲区（记录数组由调用者提供）。

## 常见错误
### 用 feof 控制读循环，多读出一条 [WA]
`while (!feof(fp))` 在读完最后一条记录之后还会再进一圈：这次 `fscanf` 一个字段都没读到，返回 `EOF`，但计数器已经加一了。于是 `rec_load` 返回 `n + 1`，驱动会多打印一条"记录"，内容是上一次的旧值（名字重复、数量单价是上一轮的）。

```c file=rec.c expect=WA
#include <stdio.h>

#include "records.h"

int rec_save(const char *path, const Rec *recs, int n) {
    if (path == NULL || recs == NULL || n < 0 || n > REC_MAX) {
        return -1;
    }
    FILE *fp = fopen(path, "w");
    if (fp == NULL) {
        return -1;
    }
    int written = 0;
    for (int i = 0; i < n; i++) {
        if (fprintf(fp, "%s %d %.2f\n", recs[i].name, recs[i].qty, recs[i].price) < 0) {
            fclose(fp);
            return -1;
        }
        written++;
    }
    if (fclose(fp) != 0) {
        return -1;
    }
    return written;
}

int rec_load(const char *path, Rec *recs, int max) {
    if (path == NULL || recs == NULL || max < 0 || max > REC_MAX) {
        return -1;
    }
    FILE *fp = fopen(path, "r");
    if (fp == NULL) {
        return -1;
    }
    int count = 0;
    while (count < max && !feof(fp)) {          /* 错：feof 不能用来控制循环 */
        char name[REC_NAME + 1] = {0};
        int qty = 0;
        double price = 0.0;
        fscanf(fp, "%15s %d %lf", name, &qty, &price);   /* 错：不看返回值，EOF 那轮也收下 */
        for (int k = 0; k <= REC_NAME; k++) {
            recs[count].name[k] = name[k];
        }
        recs[count].qty = qty;
        recs[count].price = price;
        count++;
    }
    fclose(fp);
    return count;
}
```

### 写记录时忘了换行，所有记录挤成一行 [WA]
`fprintf(fp, "%s %d %.2f", ...)` 少了一个 `\n`，写出来的文件只有一行。回读时 `fscanf` 仍然能读出一条条记录（它不关心行），所以 `load=` 的条数可能是对的，但文件的逐行比对会直接判 WA——**文件格式是给人和别的程序看的，不能只让 fscanf 能读**。

```c file=rec.c expect=WA
#include <stdio.h>

#include "records.h"

int rec_save(const char *path, const Rec *recs, int n) {
    if (path == NULL || recs == NULL || n < 0 || n > REC_MAX) {
        return -1;
    }
    FILE *fp = fopen(path, "w");
    if (fp == NULL) {
        return -1;
    }
    int written = 0;
    for (int i = 0; i < n; i++) {
        if (fprintf(fp, "%s %d %.2f", recs[i].name, recs[i].qty, recs[i].price) < 0) {
            fclose(fp);
            return -1;
        }
        written++;
    }
    if (fclose(fp) != 0) {
        return -1;
    }
    return written;
}

int rec_load(const char *path, Rec *recs, int max) {
    if (path == NULL || recs == NULL || max < 0 || max > REC_MAX) {
        return -1;
    }
    FILE *fp = fopen(path, "r");
    if (fp == NULL) {
        return -1;
    }
    int count = 0;
    while (count < max) {
        char name[REC_NAME + 1] = {0};
        int qty = 0;
        double price = 0.0;
        int got = fscanf(fp, "%15s %d %lf", name, &qty, &price);
        if (got != 3) {
            break;
        }
        for (int k = 0; k <= REC_NAME; k++) {
            recs[count].name[k] = name[k];
        }
        recs[count].qty = qty;
        recs[count].price = price;
        count++;
    }
    fclose(fp);
    return count;
}
```

### 只判断 fscanf 返回值不是 EOF [WA]
`fscanf` 返回 1 或 2 时，说明只读到了半条记录，字段变量里是旧值或初始值。把它当成完整记录存下来，会让文件里的坏行"变成"一条合法记录，后面的数据还会错位。判断必须写成 `== 3`。

```c file=rec.c expect=WA
#include <stdio.h>

#include "records.h"

int rec_save(const char *path, const Rec *recs, int n) {
    if (path == NULL || recs == NULL || n < 0 || n > REC_MAX) {
        return -1;
    }
    FILE *fp = fopen(path, "w");
    if (fp == NULL) {
        return -1;
    }
    int written = 0;
    for (int i = 0; i < n; i++) {
        if (fprintf(fp, "%s %d %.2f\n", recs[i].name, recs[i].qty, recs[i].price) < 0) {
            fclose(fp);
            return -1;
        }
        written++;
    }
    if (fclose(fp) != 0) {
        return -1;
    }
    return written;
}

int rec_load(const char *path, Rec *recs, int max) {
    if (path == NULL || recs == NULL || max < 0 || max > REC_MAX) {
        return -1;
    }
    FILE *fp = fopen(path, "r");
    if (fp == NULL) {
        return -1;
    }
    int count = 0;
    while (count < max) {
        char name[REC_NAME + 1] = {0};
        int qty = 0;
        double price = 0.0;
        int got = fscanf(fp, "%15s %d %lf", name, &qty, &price);
        if (got == EOF) {                   /* 错：1 和 2 也会被当成一条记录 */
            break;
        }
        for (int k = 0; k <= REC_NAME; k++) {
            recs[count].name[k] = name[k];
        }
        recs[count].qty = qty;
        recs[count].price = price;
        count++;
    }
    fclose(fp);
    return count;
}
```

### 把"文件打不开"当成"读到 0 条" [WA]
`rec_load` 的约定是打不开返回 `-1`，读到 0 条返回 `0`。如果 `fopen` 失败后直接 `return 0`，调用方就无法区分"文件是空的"和"文件根本不存在"，会静默地用一份空库存继续跑。保存到不存在的目录时，`rec_save` 也必须返回 `-1`。

### 读 double 用 %f，读字符串不限宽 [UB]
`%f` 对应 `float *`，给 `double *` 用会让它按 4 字节写入 8 字节的变量，是未定义行为；`%lf` 才是 `double *`。另外 `%s` 不限宽时，超过 15 个字符的名字会直接写穿 `name` 数组，必须写成 `%15s`。

## 测试用例
### 01 sample 示例 1
```in
save stock.txt
3
bolt 12 0.50
nut 7 0.25
washer 40 0.10
```
```out
save=3
load=3
[0] bolt 12 0.50
[1] nut 7 0.25
[2] washer 40 0.10
```
```expect-file name=stock.txt
bolt 12 0.50
nut 7 0.25
washer 40 0.10
```

### 02 sample 示例 2（边界：空文件读回 0 条）
```in
load empty.txt
```
```out
load=0
```
```file name=empty.txt
```

### 03 boundary 保存 0 条记录
```in
save zero.txt
0
```
```out
save=0
load=0
```
```expect-file name=zero.txt
```

### 04 degenerate 只有一条记录的文件
```in
load one.txt
```
```out
load=1
[0] only 1 2.50
```
```file name=one.txt
only 1 2.50
```

### 05 trap 文件中间有格式错误的行
```in
load mixed.txt
```
```out
load=1
[0] alpha 1 0.50
```
```file name=mixed.txt
alpha 1 0.50
beta two 1.25
gamma 3 2.00
```

### 06 trap 保存到不存在的目录
```in
save nodir/out.txt
1
x 1 1.00
```
```out
save=-1
load=-1
```

### 生成 normal 20 条记录往返
```js gen
const cases = [];
{
  const n = 20;
  const names = [];
  const recs = [];
  for (let i = 1; i <= n; i++) {
    const name = `part_${i}`;
    const qty = (i * 7) % 1000;
    const price = ((i * 137) % 99999) / 100;
    names.push(name);
    recs.push({ name, qty, price });
  }
  const lines = recs.map((r) => `${r.name} ${r.qty} ${r.price.toFixed(2)}`);
  const stdin = `save parts.txt\n${n}\n${lines.join('\n')}\n`;
  const out = ['save=' + n, 'load=' + n];
  recs.forEach((r, i) => out.push(`[${i}] ${r.name} ${r.qty} ${r.price.toFixed(2)}`));
  cases.push({
    kind: 'normal',
    category: '20 条记录往返',
    input: stdin,
    output: out.join('\n') + '\n',
    expectFiles: [{ name: 'parts.txt', content: lines.join('\n') + '\n' }],
  });
}
return cases;
```

### 生成 boundary 64 条记录（REC_MAX 上限）
```js gen
const cases = [];
{
  const n = 64;
  const recs = [];
  for (let i = 1; i <= n; i++) {
    recs.push({ name: `item${i}`, qty: i * 3, price: ((i * 251) % 10000) / 100 });
  }
  const lines = recs.map((r) => `${r.name} ${r.qty} ${r.price.toFixed(2)}`);
  const stdin = `save big.txt\n${n}\n${lines.join('\n')}\n`;
  const out = ['save=' + n, 'load=' + n];
  recs.forEach((r, i) => out.push(`[${i}] ${r.name} ${r.qty} ${r.price.toFixed(2)}`));
  cases.push({
    kind: 'boundary',
    category: '64 条记录（REC_MAX 上限）',
    input: stdin,
    output: out.join('\n') + '\n',
    expectFiles: [{ name: 'big.txt', content: lines.join('\n') + '\n' }],
  });
}
return cases;
```
