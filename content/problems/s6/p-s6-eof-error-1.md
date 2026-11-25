---json
{
  "id": "p-s6-eof-error-1",
  "title": "统计传感器数据：用返回值判断结束、跳过坏行、区分坏行与读出错",
  "difficulty": "L4",
  "knowledgePoints": ["s6-eof-error"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一台采集设备把读数导出成文本文件，每行一条：`时间戳 数值`，例如

```
1720 12.50
```

导出过程并不干净：可能出现空行、可能有只写了时间戳的残行、可能有整行都是乱码的行。统计工具要做的是**只用读取函数的返回值**来判断"读完了"，把文件扫一遍，得到：

- 有效记录条数 `records`；
- 坏行条数 `bad`（无法解析出两个字段的行）；
- 数值总和 `sum` 与平均值 `avg`（没有有效记录时都是 0）。

关键要求：**不要用 `feof` 控制循环**。`feof` 报告的是"上一次读是不是撞到了文件末尾"，用它做循环条件，最后一轮会拿到 `EOF`，却仍然把 `records` 或 `bad` 加一——而这正是本题要考的地方。

程序不向标准输出打印任何内容。

## 输入格式
标准输入只有一行：输入文件的路径（不含空格）。

数据文件由测试用例提供，约定：

- 0..100 行，每行以 `\n` 或 `\r\n` 结束；
- 有效行格式为 `<时间戳> <数值>`，时间戳是 0..2000000000 的整数，数值是 0.00..1000.00 且恰好两位小数；
- 也可能出现空行、`#` 开头的备注、`N/A` 之类的乱码行，以及"时间戳后面跟着非数字"的残行（如 `200 abc`）；
- 最后一行可能没有行尾换行；
- 空行与字段之间的多余空格不产生坏行（`fscanf` 的 `%d`/`%lf` 会自动跳过前导空白）。

**注意**：`fscanf` 是**按 token 解析**的，它眼里没有"行"。所以一行只有时间戳（如 `200`）时，`%lf` 会跳过换行去下一行找数字——那不算坏行，而是两个字段跨行拼成了一条记录。坏行只指"从当前位置开始无法匹配出两个字段"的输入。

## 输出格式
在当前目录写出 `result.txt`，共 5 行：

```
status ok
records <有效条数>
bad <坏行条数>
sum <数值总和，保留两位小数>
avg <平均值，保留两位小数，records 为 0 时输出 0.00>
```

输入文件打不开时：

```
status error
records 0
bad 0
sum 0.00
avg 0.00
```

## 数据范围
- 行数 0..100；
- 有效记录 0..100 条；
- 时间戳 0..2000000000，数值 0.00..1000.00（两位小数）；
- `result.txt` 只有 5 行，远小于 64KB。

## 示例
### 示例 1
```in
samples.txt
```
```out
```
```file name=samples.txt
1720 12.50
1721 3.25
1722 1.25
bad line here
1730 4.00
```
```expect-file name=result.txt
status ok
records 4
bad 1
sum 21.00
avg 5.25
```
> 4 条有效记录，1 行坏行（`bad line here` 的第一字符不是数字，`fscanf` 返回 0）。总和 21.00、平均 5.25。程序不打印任何东西，`out` 为空。

### 示例 2（边界：空文件）
```in
empty.txt
```
```out
```
```file name=empty.txt
```
```expect-file name=result.txt
status ok
records 0
bad 0
sum 0.00
avg 0.00
```
> 空文件：第一次 `fscanf` 就返回 `EOF`，循环体一次都不执行。`avg` 要用 0.00 而不是让 0/0 产生 `nan`——"没有数据"要显式处理。

## 提示
### 第 1 层
先给"读到什么"分类：`fscanf` 返回 2 表示两个字段都拿到了；返回 0 或 1 表示这一行不完整；返回 `EOF` 表示没有更多数据。三类分别对应"收下""记一笔坏行""结束循环"。

### 第 2 层
记下坏行之后，文件位置停在这一行的中间。必须把这一行剩下的字符全部吃掉（`fgetc` 直到 `'\n'` 或 `EOF`），下一次 `fscanf` 才能从下一行重新开始；否则会反复解析同一处，坏行越数越多甚至死循环。

### 第 3 层
循环结束后再算 `avg`（`records > 0 ? sum / records : 0.0`），用 `%.2f` 输出。`records`、`bad` 用 `long` 计数。千万不要在循环条件里写 `!feof(in)`，也不要写 `while (fscanf(...) != EOF)`——后者会把坏行当成记录。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    char path[128] = {0};
    if (scanf("%127s", path) != 1) {
        return 0;
    }

    FILE *in = fopen(path, "r");
    if (in == NULL) {                       /* 打不开：写一份全 0 的错误报表 */
        FILE *out = fopen("result.txt", "w");
        if (out == NULL) {
            return 0;
        }
        fprintf(out, "status error\nrecords 0\nbad 0\nsum 0.00\navg 0.00\n");
        if (fclose(out) != 0) {
            return 0;
        }
        return 0;
    }

    long records = 0;
    long bad = 0;
    double sum = 0.0;

    for (;;) {
        int timestamp = 0;
        double value = 0.0;
        int got = fscanf(in, "%d %lf", &timestamp, &value);
        if (got == 2) {                     /* 两个字段都拿到了 */
            records++;
            sum += value;
            continue;
        }
        if (got == EOF) {                   /* 读完了（或读取出错） */
            break;
        }
        bad++;                              /* got 是 0 或 1：这一行不完整 */
        int ch = 0;
        while ((ch = fgetc(in)) != EOF && ch != '\n') {
            /* 吃掉这一行剩下的字符，让下一轮从新的一行开始 */
        }
        if (ch == EOF) {
            break;
        }
    }
    fclose(in);

    double avg = (records > 0) ? sum / (double)records : 0.0;
    FILE *out = fopen("result.txt", "w");
    if (out == NULL) {
        return 0;
    }
    fprintf(out, "status ok\nrecords %ld\nbad %ld\nsum %.2f\navg %.2f\n",
            records, bad, sum, avg);
    if (fclose(out) != 0) {
        return 0;
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    char path[128] = {0};
    if (scanf("%127s", path) != 1) {
        return 0;
    }

    FILE *in = fopen(path, "r");
    if (in == NULL) {
        return 0;                            /* TODO: 打不开时写 status error 的五行的报表 */
    }

    long records = 0;
    long bad = 0;
    double sum = 0.0;
    int timestamp = 0;
    double value = 0.0;

    while (!feof(in)) {                      /* TODO: 不要用 feof 控制循环 */
        if (fscanf(in, "%d %lf", &timestamp, &value) == 2) {
            records++;
            sum += value;
            continue;
        }
        bad++;                               /* TODO: 坏行要先把这一行剩下的字符吃掉 */
    }
    fclose(in);

    /* TODO: 计算 avg（records 为 0 时是 0.00），并按五行格式写 result.txt */
    return 0;
}
```

## 复杂度
时间 O(文件字节数)：每个字符最多被读两次（解析时一次、跳过坏行时一次），总行数不超过 100。
空间 O(1)：只用几个计数器和累加变量。

## 常见错误
### 用 while (!feof(in)) 控制循环 [WA]
读完最后一条记录时 `feof` 还是 0（那次读取是成功的），于是循环再进一圈：`fscanf` 返回 `EOF`，但"不是两个字段就记一笔坏行"的代码已经执行了，`bad` 因此比真实值大 1。示例 1 会稳定复现：真实的 1 条坏行被数成 2 条。

```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    char path[128] = {0};
    if (scanf("%127s", path) != 1) {
        return 0;
    }
    FILE *in = fopen(path, "r");
    if (in == NULL) {
        return 0;
    }
    long records = 0;
    long bad = 0;
    double sum = 0.0;
    while (!feof(in)) {                      /* 错：feof 不能用来控制循环 */
        int timestamp = 0;
        double value = 0.0;
        int got = fscanf(in, "%d %lf", &timestamp, &value);
        if (got == 2) {
            records++;
            sum += value;
            continue;
        }
        bad++;                               /* 错：EOF 这一轮也会加一 */
        int ch = 0;
        while ((ch = fgetc(in)) != EOF && ch != '\n') {
        }
        if (ch == EOF) {
            break;
        }
    }
    fclose(in);
    double avg = (records > 0) ? sum / (double)records : 0.0;
    FILE *out = fopen("result.txt", "w");
    if (out == NULL) {
        return 0;
    }
    fprintf(out, "status ok\nrecords %ld\nbad %ld\nsum %.2f\navg %.2f\n",
            records, bad, sum, avg);
    fclose(out);
    return 0;
}
```

### 用 while (fscanf(...) != EOF) 当循环条件 [WA]
`fscanf` 在坏行上返回 0 或 1，不等于 `EOF`，于是坏行被当成了一条有效记录：`records` 虚高、`sum` 里混进了 0 或者上一次的旧值。必须写成 `== 2` 才表示"两个字段都读到了"。

```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    char path[128] = {0};
    if (scanf("%127s", path) != 1) {
        return 0;
    }
    FILE *in = fopen(path, "r");
    if (in == NULL) {
        return 0;
    }
    long records = 0;
    long bad = 0;
    double sum = 0.0;
    for (;;) {
        int timestamp = 0;
        double value = 0.0;
        int got = fscanf(in, "%d %lf", &timestamp, &value);
        if (got == EOF) {
            break;
        }
        records++;                          /* 错：got 是 0 或 1 时也当成了一条记录 */
        sum += value;
        int ch = 0;
        while ((ch = fgetc(in)) != EOF && ch != '\n') {
        }
        if (ch == EOF) {
            break;
        }
    }
    fclose(in);
    double avg = (records > 0) ? sum / (double)records : 0.0;
    FILE *out = fopen("result.txt", "w");
    if (out == NULL) {
        return 0;
    }
    fprintf(out, "status ok\nrecords %ld\nbad %ld\nsum %.2f\navg %.2f\n",
            records, bad, sum, avg);
    fclose(out);
    return 0;
}
```

### 发现坏行后没有把整行吃掉 [WA]
只 `fgetc` 一个字符就重新 `fscanf`，同一行的下几个字符会被反复当成"新的一行"来解析：一个 10 个字符的坏行会记成 10 个坏行（如果这行里恰好有数字，还可能把后面的数据串进来）。正确做法是一直读到 `'\n'` 或 `EOF`。

### 打不开输入文件时不写 result.txt [WA]
路径写错或目录不存在时 `fopen` 返回 `NULL`。这时完全不产生输出文件，判题会报"程序没有生成文件"；即使生成了，内容也必须符合 `status error` 的五行格式，而不是 `status ok` 加一堆 0。

### 用 avg = sum / records 却不处理 records 为 0 [UB]
空文件或全是坏行的文件会让 `records` 为 0，`0.0 / 0` 得到的是 `nan`（NaN），`printf("%.2f")` 会打出 `nan`，与约定的 `0.00` 不符。除法之前先判断分母。

## 测试用例
### 01 sample 示例 1
```in
samples.txt
```
```out
```
```file name=samples.txt
1720 12.50
1721 3.25
1722 1.25
bad line here
1730 4.00
```
```expect-file name=result.txt
status ok
records 4
bad 1
sum 21.00
avg 5.25
```

### 02 sample 示例 2（边界：空文件）
```in
empty.txt
```
```out
```
```file name=empty.txt
```
```expect-file name=result.txt
status ok
records 0
bad 0
sum 0.00
avg 0.00
```

### 03 boundary 只有一条记录
```in
one.txt
```
```out
```
```file name=one.txt
100 2.50
```
```expect-file name=result.txt
status ok
records 1
bad 0
sum 2.50
avg 2.50
```

### 04 degenerate 只有空白和空行
```in
blank.txt
```
```out
```
```file name=blank.txt base64
Cgo=
```
```expect-file name=result.txt
status ok
records 0
bad 0
sum 0.00
avg 0.00
```
> 文件内容是两个换行。`%d` 会跳过所有空白，所以 `fscanf` 直接返回 `EOF`：空行不算坏行，`records` 和 `bad` 都是 0。

### 05 trap 最后一行没有换行符
```in
noeol.txt
```
```out
```
```file name=noeol.txt base64
MTAwIDEuNTAKMjAwIDIuNTAKMzAwIDMuMDA=
```
```expect-file name=result.txt
status ok
records 3
bad 0
sum 7.00
avg 2.33
```
> 文件是 `100 1.50\n200 2.50\n300 3.00`（最后一行没有 `\n`）。循环必须靠 `fscanf` 返回 `EOF` 结束，而不能指望"每行都有换行"。

### 06 trap 坏行与残行夹在中间
```in
messy.txt
```
```out
```
```file name=messy.txt
100 1.50
oops
200 abc
300 3.00

400 4.50
```
```expect-file name=result.txt
status ok
records 3
bad 2
sum 9.00
avg 3.00
```
> `oops` 返回 0、`200 abc` 返回 1，两条都算坏行；空行被 `fscanf` 自动跳过，不算坏行。坏行之后的 `300 3.00` 和 `400 4.50` 仍然要被读到——这就是"吃掉整行"的意义。如果把 `200 abc` 换成只有时间戳的 `200`，它就不是坏行了：`%lf` 会跨过换行去读下一行的 `300`，拼出一条 `(200, 300.00)` 的记录。

### 生成 boundary 100 条有效记录（行数上限）
```js gen
const cases = [];
{
  const n = 100;
  const avgCents = 50000;                 // 平均值 500.00
  const totalCents = avgCents * n;
  const values = [];
  let used = 0;
  for (let i = 0; i < n - 1; i++) {
    const cents = 100 + ((i * 7919) % 99001);   // 1.00 .. 991.00
    values.push(cents);
    used += cents;
  }
  values.push(totalCents - used);
  const lines = values.map((cents, i) => `${1000 + i} ${(cents / 100).toFixed(2)}`);
  const sum = totalCents / 100;
  cases.push({
    kind: 'boundary',
    category: '100 条有效记录（行数上限）',
    input: 'many.txt\n',
    files: { 'many.txt': lines.join('\n') + '\n' },
    expectFiles: [{
      name: 'result.txt',
      content: `status ok\nrecords ${n}\nbad 0\nsum ${sum.toFixed(2)}\navg ${(avgCents / 100).toFixed(2)}\n`,
    }],
  });
}
return cases;
```

### 生成 normal 60 行含坏行与乱码
```js gen
const cases = [];
{
  const valid = 55;
  const avgCents = 12345;                 // 平均值 123.45
  const totalCents = avgCents * valid;
  const values = [];
  let used = 0;
  for (let i = 0; i < valid - 1; i++) {
    const cents = 1 + ((i * 104729) % 99000);   // 0.01 .. 990.00
    values.push(cents);
    used += cents;
  }
  values.push(totalCents - used);

  const lines = [];
  let bad = 0;
  const garbage = ['# 采集中断', 'N/A N/A', 'timeout', 'ERROR'];
  for (let i = 0; i < valid; i++) {
    lines.push(`${2000 + i} ${(values[i] / 100).toFixed(2)}`);
    if (i % 9 === 4) {
      lines.push(garbage[i % garbage.length]);
      bad++;
    }
    if (i % 13 === 6) {
      lines.push(`${9000 + i} timeout`);  // 时间戳后面跟着非数字：真正的坏行
      bad++;
    }
  }
  cases.push({
    kind: 'normal',
    category: `55 条有效记录 + ${bad} 条坏行`,
    input: 'noisy.txt\n',
    files: { 'noisy.txt': lines.join('\n') + '\n' },
    expectFiles: [{
      name: 'result.txt',
      content: `status ok\nrecords ${valid}\nbad ${bad}\nsum ${(totalCents / 100).toFixed(2)}\navg ${(avgCents / 100).toFixed(2)}\n`,
    }],
  });
}
return cases;
```
