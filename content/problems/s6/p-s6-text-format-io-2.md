---json
{
  "id": "p-s6-text-format-io-2",
  "title": "从出库单生成汇总报表：跳过坏行、统计金额并处理打不开的文件",
  "difficulty": "L3",
  "knowledgePoints": ["s6-text-format-io"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
仓库每天导出一份**出库明细**文本文件，每行一条明细：

```
商品编号 数量 单价
```

文件是别的系统导出的，所以并不可靠：可能有空行、可能有一整行以 `#` 开头的备注、可能有只写了两个字段的残行、也可能有根本不是数字的垃圾行。工具要做的是：

1. 逐条解析出**完整且合法**的明细（三个字段都读到了才算一条），坏行一律跳过，不影响后面的解析；
2. 累计明细条数、数量总和、金额总和（金额 = 数量 × 单价，逐行累加）；
3. 找出**金额最大**的那条明细的商品编号；金额并列时取**最先出现**的那条；
4. 把结果写进报表文件；
5. 输入文件打不开时，报表里写一行 `ERROR`，而不是崩溃或输出 0。

程序不向标准输出打印任何内容。

## 输入格式
标准输入两行：

- 第 1 行：输入文件（出库明细）的路径，不含空格；
- 第 2 行：输出文件（报表）的路径，不含空格。

明细文件的约定：

- 每行可以是 `商品编号 数量 单价`，字段之间用空格分隔；
- 也可能有空行、以 `#` 开头的备注行、字段不足或字段不是数字的残行；
- 最多 200 行。

## 输出格式
在当前目录写出报表文件（路径由输入第 2 行给出），共 4 行：

```
items <有效明细条数>
units <数量总和>
amount <金额总和，保留两位小数>
top <金额最大的商品编号；没有有效明细时为 0>
```

输入文件打不开时，报表文件只有一行：

```
ERROR
```

## 数据范围
- 有效明细 0..200 条；
- 商品编号 1..99999；数量 1..999；单价 0.01..9999.99，恰好两位小数；
- 金额总和不超过 2×10^8，`double` 足够精确到分；
- 报表文件最多 5 行，远小于 64KB。

## 示例
### 示例 1
```in
orders.txt
report.txt
```
```out
```
```file name=orders.txt
# 2026-01 出库单
1001 3 12.50
1002 10 0.75

1001 2 12.50
```
```expect-file name=report.txt
items 3
units 15
amount 70.00
top 1001
```
> 注释行和空行都被跳过，3 条有效明细：37.50、7.50、25.00，合计 70.00。金额最大的是 `1001` 的第一条（37.50），不是最后一条（25.00）。程序不打印任何东西，`out` 为空。

### 示例 2（边界：一条有效明细都没有）
```in
empty-orders.txt
report.txt
```
```out
```
```file name=empty-orders.txt
```
```expect-file name=report.txt
items 0
units 0
amount 0.00
top 0
```
> 空文件不是错误：`fscanf` 立刻返回 `EOF`，循环结束，输出全 0、`top` 为 0。注意"空文件"要输出 4 行全 0，而"文件打不开"要输出 `ERROR`——这两种情况必须区分开。

## 提示
### 第 1 层
先想清楚哪些行算"一条有效明细"：三个字段**全部**读到才算。`fscanf` 的返回值是成功赋值的字段数，拿它和 3 比较就能知道这一行是否完整。

### 第 2 层
读到坏行（返回值是 0、1、2）时，文件位置还停在坏行中间。必须把这一行剩下的字符吃掉（一直读到 `'\n'` 或 `EOF`），否则下一次 `fscanf` 会从同一个地方继续失败，陷入死循环。返回值是 `EOF` 才是真正的结束。

### 第 3 层
金额用 `double` 逐行累加；`top` 用一个"当前最大值 + 编号"来维护，只有**严格大于**才替换，这样并列时天然保留最先出现的那条。写报表用 `fprintf`，注意 `%.2f`。别忘了两处 `fopen` 都要判空：输入打不开写 `ERROR`，输出打不开就正常退出。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    char in_path[128] = {0};
    char out_path[128] = {0};
    if (scanf("%127s", in_path) != 1) {
        return 0;
    }
    if (scanf("%127s", out_path) != 1) {
        return 0;
    }

    FILE *in = fopen(in_path, "r");
    if (in == NULL) {                       /* 输入文件打不开：报表写 ERROR */
        FILE *err = fopen(out_path, "w");
        if (err == NULL) {
            return 0;
        }
        fprintf(err, "ERROR\n");
        if (fclose(err) != 0) {
            return 0;
        }
        return 0;
    }

    FILE *out = fopen(out_path, "w");
    if (out == NULL) {
        fclose(in);
        return 0;
    }

    long items = 0;
    long units = 0;
    double amount = 0.0;
    long top_id = 0;
    double top_amount = 0.0;

    for (;;) {
        int id = 0;
        int qty = 0;
        double price = 0.0;
        int got = fscanf(in, "%d %d %lf", &id, &qty, &price);
        if (got == 3) {                     /* 三个字段都读到才算一条明细 */
            double line_amount = (double)qty * price;
            items++;
            units += qty;
            amount += line_amount;
            if (items == 1 || line_amount > top_amount) {
                top_amount = line_amount;
                top_id = id;
            }
            continue;
        }
        if (got == EOF) {                   /* 读完了（或读取出错） */
            break;
        }
        int ch = 0;                         /* 0、1、2：坏行，吃掉整行再继续 */
        while ((ch = fgetc(in)) != EOF && ch != '\n') {
        }
        if (ch == EOF) {
            break;
        }
    }
    fclose(in);

    fprintf(out, "items %ld\nunits %ld\namount %.2f\ntop %ld\n", items, units, amount, top_id);
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
    char in_path[128] = {0};
    char out_path[128] = {0};
    if (scanf("%127s", in_path) != 1) {
        return 0;
    }
    if (scanf("%127s", out_path) != 1) {
        return 0;
    }

    /* TODO: fopen(in_path, "r")，打不开就把 "ERROR" 写进 out_path 然后返回 */

    FILE *out = fopen(out_path, "w");
    if (out == NULL) {
        return 0;
    }

    /* TODO: 循环 fscanf("%d %d %lf")：
       - 返回 3：累加 items / units / amount，并维护金额最大的商品编号；
       - 返回 EOF：结束；
       - 返回 0、1、2：坏行，吃掉这一行剩下的字符后继续。 */

    /* TODO: 按 "items / units / amount / top" 四行写出真实统计，amount 用 %.2f */
    fprintf(out, "items 0\nunits 0\namount 0.00\ntop 0\n");
    if (fclose(out) != 0) {
        return 0;
    }
    return 0;
}
```

## 复杂度
时间 O(文件字节数)：每个字符最多被读两次（一次被 `fscanf` 尝试解析，一次在跳过坏行时消费），文件最多 200 行。
空间 O(1)：只用几个累加变量。

## 常见错误
### 用 fscanf 返回值是否等于 EOF 判断成功 [WA]
`fscanf` 在坏行上返回 0、1 或 2，只有真正读完才返回 `EOF`。把"不是 EOF"当成"读到一条记录"，注释行、残行都会被当成合法明细，金额和条数全部虚高。

```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    char in_path[128] = {0};
    char out_path[128] = {0};
    if (scanf("%127s", in_path) != 1) {
        return 0;
    }
    if (scanf("%127s", out_path) != 1) {
        return 0;
    }
    FILE *in = fopen(in_path, "r");
    if (in == NULL) {
        return 0;
    }
    FILE *out = fopen(out_path, "w");
    if (out == NULL) {
        fclose(in);
        return 0;
    }
    long items = 0;
    long units = 0;
    double amount = 0.0;
    long top_id = 0;
    double top_amount = 0.0;
    for (;;) {
        int id = 0;
        int qty = 0;
        double price = 0.0;
        int got = fscanf(in, "%d %d %lf", &id, &qty, &price);
        if (got == EOF) {
            break;
        }
        double line_amount = (double)qty * price;   /* 错：got 是 0/1/2 时也当成一条记录 */
        items++;
        units += qty;
        amount += line_amount;
        if (items == 1 || line_amount > top_amount) {
            top_amount = line_amount;
            top_id = id;
        }
        int ch = 0;
        while ((ch = fgetc(in)) != EOF && ch != '\n') {
        }
        if (ch == EOF) {
            break;
        }
    }
    fclose(in);
    fprintf(out, "items %ld\nunits %ld\namount %.2f\ntop %ld\n", items, units, amount, top_id);
    fclose(out);
    return 0;
}
```

### 跳过坏行时没有吃到行尾 [TLE|WA]
发现坏行后只 `fgetc` 一个字符就继续，下一轮 `fscanf` 仍停在坏行中间，再次失败、再吃一个字符……如果这行没有任何换行（文件末尾的残行），就会变成死循环（判 `TLE`）；如果只是慢，也可能把后面的数字串读错。

```c file=main.c expect=TLE
#include <stdio.h>

int main(void) {
    char in_path[128] = {0};
    char out_path[128] = {0};
    if (scanf("%127s", in_path) != 1) {
        return 0;
    }
    if (scanf("%127s", out_path) != 1) {
        return 0;
    }
    FILE *in = fopen(in_path, "r");
    if (in == NULL) {
        return 0;
    }
    FILE *out = fopen(out_path, "w");
    if (out == NULL) {
        fclose(in);
        return 0;
    }
    long items = 0;
    long units = 0;
    double amount = 0.0;
    long top_id = 0;
    double top_amount = 0.0;
    while (!feof(in)) {
        int id = 0;
        int qty = 0;
        double price = 0.0;
        int got = fscanf(in, "%d %d %lf", &id, &qty, &price);
        if (got == 3) {
            double line_amount = (double)qty * price;
            items++;
            units += qty;
            amount += line_amount;
            if (items == 1 || line_amount > top_amount) {
                top_amount = line_amount;
                top_id = id;
            }
        } else if (got == EOF) {
            break;
        } else {
            if (fgetc(in) == EOF) {
                break;
            }
        }
    }
    fclose(in);
    fprintf(out, "items %ld\nunits %ld\namount %.2f\ntop %ld\n", items, units, amount, top_id);
    fclose(out);
    return 0;
}
```

### 金额并列时取了最后一条 [WA]
用 `>=` 更新最大值，遇到并列金额就会把编号换成后出现的那条，而题目要求"并列取最先出现"。正确做法是只在**严格大于**时更新，并且第一条记录无条件成为当前最大值。

```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    char in_path[128] = {0};
    char out_path[128] = {0};
    if (scanf("%127s", in_path) != 1) {
        return 0;
    }
    if (scanf("%127s", out_path) != 1) {
        return 0;
    }
    FILE *in = fopen(in_path, "r");
    if (in == NULL) {
        return 0;
    }
    FILE *out = fopen(out_path, "w");
    if (out == NULL) {
        fclose(in);
        return 0;
    }
    long items = 0;
    long units = 0;
    double amount = 0.0;
    long top_id = 0;
    double top_amount = 0.0;
    for (;;) {
        int id = 0;
        int qty = 0;
        double price = 0.0;
        int got = fscanf(in, "%d %d %lf", &id, &qty, &price);
        if (got == 3) {
            double line_amount = (double)qty * price;
            items++;
            units += qty;
            amount += line_amount;
            if (line_amount >= top_amount) {     /* 错：并列时会被后来的记录覆盖 */
                top_amount = line_amount;
                top_id = id;
            }
            continue;
        }
        if (got == EOF) {
            break;
        }
        int ch = 0;
        while ((ch = fgetc(in)) != EOF && ch != '\n') {
        }
        if (ch == EOF) {
            break;
        }
    }
    fclose(in);
    fprintf(out, "items %ld\nunits %ld\namount %.2f\ntop %ld\n", items, units, amount, top_id);
    fclose(out);
    return 0;
}
```

### 输入文件打不开时没有输出 ERROR [WA]
`fopen` 返回 `NULL` 后继续读，读操作一定失败，循环立刻结束，于是报表变成"全 0"——调用方会以为"今天真的没有出库"，而事实是路径写错了。打不开必须显式写 `ERROR`。

### 用 %f 读 double [UB]
`fscanf` 的 `%f` 对应 `float *`，`%lf` 才对应 `double *`。写成 `%f` 却传 `&price`（`double`），会按 4 字节写入 8 字节的变量，属于未定义行为。

## 测试用例
### 01 sample 示例 1
```in
orders.txt
report.txt
```
```out
```
```file name=orders.txt
# 2026-01 出库单
1001 3 12.50
1002 10 0.75

1001 2 12.50
```
```expect-file name=report.txt
items 3
units 15
amount 70.00
top 1001
```

### 02 sample 示例 2（边界：一条有效明细都没有）
```in
empty-orders.txt
report.txt
```
```out
```
```file name=empty-orders.txt
```
```expect-file name=report.txt
items 0
units 0
amount 0.00
top 0
```

### 03 boundary 只有一条明细
```in
one.txt
report.txt
```
```out
```
```file name=one.txt
42 5 0.50
```
```expect-file name=report.txt
items 1
units 5
amount 2.50
top 42
```

### 04 degenerate 只有注释和空行
```in
comments.txt
report.txt
```
```out
```
```file name=comments.txt
# 本月没有出库
# 下月再补
```
```expect-file name=report.txt
items 0
units 0
amount 0.00
top 0
```

### 05 trap 输入文件所在的目录不存在
```in
nodir/orders.txt
report.txt
```
```out
```
```expect-file name=report.txt
ERROR
```

### 06 trap 夹杂残行、垃圾行和注释
```in
messy.txt
report.txt
```
```out
```
```file name=messy.txt
1001 3 12.50
1003 5
abc 1 2.00
# 注释
1002 10 0.75
1001 2 12.50
```
```expect-file name=report.txt
items 3
units 15
amount 70.00
top 1001
```

### 07 trap 金额并列时取最先出现的编号
```in
tie.txt
report.txt
```
```out
```
```file name=tie.txt
2001 1 10.00
2002 2 5.00
2003 4 2.50
```
```expect-file name=report.txt
items 3
units 7
amount 30.00
top 2001
```

### 生成 boundary 200 条明细（最大规模）
```js gen
const cases = [];
{
  const lines = ['# 200 条明细'];
  let items = 0, units = 0, amount = 0, topId = 0, topAmount = 0;
  for (let i = 0; i < 200; i++) {
    const id = 1000 + i;
    const qty = (i % 999) + 1;
    const cents = ((i * 7919) % 999999) + 1;
    lines.push(`${id} ${qty} ${(cents / 100).toFixed(2)}`);
    const lineAmount = qty * (cents / 100);
    items++;
    units += qty;
    amount += lineAmount;
    if (items === 1 || lineAmount > topAmount) {
      topAmount = lineAmount;
      topId = id;
    }
  }
  cases.push({
    kind: 'boundary',
    category: '200 条明细（最大规模）',
    input: 'big.txt\nreport.txt\n',
    files: { 'big.txt': lines.join('\n') + '\n' },
    expectFiles: [{ name: 'report.txt', content: `items ${items}\nunits ${units}\namount ${amount.toFixed(2)}\ntop ${topId}\n` }],
  });
}
return cases;
```

### 生成 normal 50 条明细夹杂注释与空行
```js gen
const cases = [];
{
  const lines = [];
  let items = 0, units = 0, amount = 0, topId = 0, topAmount = 0;
  for (let i = 0; i < 50; i++) {
    if (i % 7 === 0) lines.push('# 批次 ' + i);
    if (i % 5 === 0) lines.push('');
    const id = 5000 + i;
    const qty = (i % 37) + 1;
    const cents = ((i * 104729) % 500000) + 1;
    lines.push(`${id} ${qty} ${(cents / 100).toFixed(2)}`);
    const lineAmount = qty * (cents / 100);
    items++;
    units += qty;
    amount += lineAmount;
    if (items === 1 || lineAmount > topAmount) {
      topAmount = lineAmount;
      topId = id;
    }
  }
  cases.push({
    kind: 'normal',
    category: '50 条明细夹杂注释与空行',
    input: 'mixed.txt\nreport.txt\n',
    files: { 'mixed.txt': lines.join('\n') + '\n' },
    expectFiles: [{ name: 'report.txt', content: `items ${items}\nunits ${units}\namount ${amount.toFixed(2)}\ntop ${topId}\n` }],
  });
}
return cases;
```
