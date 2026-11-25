---
id: s6-text-format-io
---

## 讲解

### fprintf / fscanf 就是 printf / scanf 加一个"流"参数
`printf` 把格式化结果写到 `stdout`，`fprintf` 把它写到**你指定的任意流**——参数表只多了一个 `FILE *`，而且它在最前面：

```c
printf("id=%d\n", id);                    /* 写到标准输出 */
fprintf(fp, "id=%d\n", id);               /* 写到 fp 指向的文件 */
fscanf(stdin, "%d", &id);                 /* 从标准输入读，等价于 scanf */
fscanf(fp, "%d", &id);                    /* 从文件读 */
```

返回值也是"多了一个信息量"的版本：

| 函数 | 返回值 | 失败时 |
|---|---|---|
| `fprintf` | 实际写出的**字符数** | 负数 |
| `fscanf` | 成功**赋值**的字段个数（`0` 表示一个都没匹配上） | `EOF`（-1）：输入结束**或**读取出错 |

这两条返回值都必须看。`fprintf` 返回负数说明写失败（磁盘满、流已关闭），`fscanf` 返回 `0` 说明"这一行根本不是我要的格式"——它和"读到了 0 条记录"完全是两件事。

先看一个最小的往返：写 3 条库存记录，再用同样的格式读回来：

```c run id=fmt-roundtrip
#include <stdio.h>

typedef struct {
    char name[16];
    int qty;
    double price;
} Item;

int main(void) {
    Item items[3] = { {"bolt", 12, 0.50}, {"nut", 7, 0.25}, {"washer", 40, 0.10} };

    FILE *fp = fopen("stock.txt", "w");
    if (fp == NULL) {
        return 1;
    }
    for (int i = 0; i < 3; i++) {
        if (fprintf(fp, "%s %d %.2f\n", items[i].name, items[i].qty, items[i].price) < 0) {
            fclose(fp);
            return 1;
        }
    }
    fclose(fp);

    fp = fopen("stock.txt", "r");
    if (fp == NULL) {
        return 1;
    }
    Item got;
    int read = 0;
    int total = 0;
    while (fscanf(fp, "%15s %d %lf", got.name, &got.qty, &got.price) == 3) {
        read++;
        total += got.qty;
        printf("%d: %s x%d = %.2f\n", read, got.name, got.qty, got.qty * got.price);
    }
    fclose(fp);
    printf("共 %d 条，合计 %d 件\n", read, total);
    return 0;
}
```
```output
1: bolt x12 = 6.00
2: nut x7 = 1.75
3: washer x40 = 4.00
共 3 条，合计 59 件
```

`%15s` 里的 15 是**宽度上限**：名字最长 15 个字符，第 16 个位置留给结尾的 `'\0'`。写文件时用 `%s` 没关系（名字本来就是字符串），读文件时**一定要限宽**，因为文件内容不可信——超长的一个词会直接越过 `name` 数组的边界。

### fscanf 的返回值是"赋了几个字段"，不是"成功或失败"
这是 `fscanf` 最容易踩的坑。假设文件里有一行 `nut seven 0.25`：

- `%15s` 读到 `nut`，赋值成功（1 个）；
- `%d` 遇到 `seven` 的第一个字符 `s`，**匹配失败**，停止；
- 于是 `fscanf` 返回 **1**，不是 3，也不是 EOF。

如果程序只判断"返回值不等于 EOF 就当作一条记录"，它就会把一个只有名字、数量和单价还是**上一次的旧值**的"记录"计进去。更糟的是：文件位置停在了 `seven` 前面，下一次读取会从错位的位置继续，把后面的数据串成完全不同的记录：

```c run id=fmt-misalign
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("bad.txt", "w");
    if (fp == NULL) {
        return 1;
    }
    fputs("bolt 12 0.50\nnut seven 0.25\nwasher 40 0.10\n", fp);
    fclose(fp);

    fp = fopen("bad.txt", "r");
    if (fp == NULL) {
        return 1;
    }
    char name[16] = {0};
    int qty = 0;
    double price = 0.0;
    for (int k = 1; k <= 3; k++) {
        int got = fscanf(fp, "%15s %d %lf", name, &qty, &price);
        printf("第 %d 次 fscanf 返回 %d：", k, got);
        if (got == 3) {
            printf("读到 %s %d %.2f\n", name, qty, price);
        } else {
            printf("这一行没读全（qty、price 还是旧值）\n");
        }
    }
    fclose(fp);
    return 0;
}
```
```output
第 1 次 fscanf 返回 3：读到 bolt 12 0.50
第 2 次 fscanf 返回 1：这一行没读全（qty、price 还是旧值）
第 3 次 fscanf 返回 3：读到 seven 0 0.25
```

仔细看第 3 行：`seven` 被当成了名字，`0.25` 被拆成整数 `0` 和浮点 `0.25`，于是"读到了"一条根本不存在的记录——而真正的第三行 `washer 40 0.10` 永远没被读到。这就是**格式错位**：错误不报，数据全歪。

结论很硬：**读记录的 `fscanf` 必须把返回值和字段数比较**，写成 `== 3` 或 `!= 3` 的分支，不能写成 `!= EOF`。

### 为什么更推荐 fgets + sscanf 两层解析
`fscanf` 处理的是"**连续的 token 流**"，它根本不知道"行"是什么：`%d` 会跳过换行去下一行找数字。所以一旦某一行格式不对，恢复起来很麻烦（要手动 `fgetc` 一路吃到 `'\n'`）。

更稳的结构是**先按行读、再在内存里解析**：

1. `fgets` 一次拿到完整一行（包括换行符），行的边界由它保证；
2. `sscanf` 在这一行里解析，解析失败时最多丢掉这一行，文件位置永远是对的。

```c run id=fmt-fgets-sscanf
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("orders.txt", "w");
    if (fp == NULL) {
        return 1;
    }
    fputs("bolt 12 0.50\nnut seven 0.25\n\nwasher 40 0.10\n", fp);
    fclose(fp);

    fp = fopen("orders.txt", "r");
    if (fp == NULL) {
        return 1;
    }
    char line[128];
    int ok = 0;
    int bad = 0;
    int lineno = 0;
    while (fgets(line, sizeof line, fp) != NULL) {
        lineno++;
        char name[16] = {0};
        int qty = 0;
        double price = 0.0;
        if (sscanf(line, "%15s %d %lf", name, &qty, &price) == 3) {
            ok++;
            printf("%d: %s %d %.2f\n", lineno, name, qty, price);
        } else if (line[0] != '\n') {          /* 空行不算坏行 */
            bad++;
            printf("%d: 无法解析，整行跳过\n", lineno);
        }
    }
    fclose(fp);
    printf("有效 %d 行，坏行 %d 行\n", ok, bad);
    return 0;
}
```
```output
1: bolt 12 0.50
2: 无法解析，整行跳过
4: washer 40 0.10
有效 2 行，坏行 1 行
```

注意第 3 行是空行：`sscanf` 返回 `EOF`（找不到任何字段），但 `line[0] == '\n'`，所以既不算有效也不算坏行。**判定顺序**很重要：先看解析结果，再单独处理空行，不要用一个条件把两件事混在一起。

### 写文件时的格式设计：分隔符与定宽
文本文件的格式是你自己定的，但一旦定下来，**写和读必须严格对称**。三条实用规则：

1. **字段里可能出现空格，就不要用空格分隔**。名字叫 `New York` 时，`%s` 只读到 `New`，后面的 `York` 会挤进下一个字段。用逗号、制表符这类稳定的分隔符，或者干脆不用空格的名字。
2. **浮点数写几位、读几位要对齐**。写 `"%.2f"`、读 `"%lf"`，这样 `0.5` 写成 `0.50`、读回来还是 0.5。写 `"%f"` 会得到 6 位小数，文件会很长且不好比对。
3. **分隔符要在格式串里写死**。CSV 的 `fscanf` 格式是 `" %15[^,],%d,%lf"`：`%[^,]` 表示"读到逗号为止的一串字符"，宽度 15 防止溢出。它和 `%s` 的区别是：`%s` 遇到任何空白就停，`%[^,]` 只认逗号。

下面把 CSV 写成读各走一遍：

```c run id=fmt-csv
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("parts.csv", "w");
    if (fp == NULL) {
        return 1;
    }
    fprintf(fp, "bolt,12,0.50\n");
    fprintf(fp, "nut,7,0.25\n");
    fclose(fp);

    fp = fopen("parts.csv", "r");
    if (fp == NULL) {
        return 1;
    }
    char name[16] = {0};
    int qty = 0;
    double price = 0.0;
    int count = 0;
    while (fscanf(fp, " %15[^,],%d,%lf", name, &qty, &price) == 3) {
        count++;
        printf("%d: %-6s%3d%7.2f\n", count, name, qty, price);
    }
    fclose(fp);
    printf("共 %d 条记录\n", count);
    return 0;
}
```
```output
1: bolt   12   0.50
2: nut     7   0.25
共 2 条记录
```

`%-6s` 左对齐占 6 格、`%3d` 右对齐占 3 格、`%7.2f` 占 7 格（含小数点后两位）——定宽输出让"人对齐"和"程序比对"都更容易。注意 `%[^,]` 读到逗号就停，**逗号本身不会被消耗**，所以格式串里紧跟一个 `,` 把它吃掉，这是 scanf 家族"格式串里的普通字符必须原样匹配"的规则。还有一条容易漏的细节：`%[` 和 `%c` 一样**不跳过前导空白**，所以格式串开头要写一个空格，让它在两条记录之间把换行符吃掉——否则第二条记录的名字会带着上一行的 `'\n'`。

## 编译与运行

用 gcc 或 clang 编译，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra fmt.c -o fmt
./fmt
```

```bash
clang -std=c17 -Wall -Wextra fmt.c -o fmt
./fmt
```

几点说明：

- `-Wall -Wextra` 会检查**格式串和实参类型是否匹配**（`-Wformat`），例如给 `%d` 传 `double`、给 `%lf` 传 `float *` 都会报警告。这是格式串最重要的安全网，不要关掉；
- 编译器**不会**检查 `fscanf` 的返回值有没有用。想少踩坑，本平台的静态检查会报告"丢弃 scanf 返回值"（`scanf-return-unused`），建议把它当错误看；
- 调试时先用 `fprintf(stderr, ...)` 把读到的每个字段打出来：`stderr` 不参与输出比对，也不会打乱 `stdout` 的内容；
- 文件里如果有中文，注意它是按字节读的：`%s` 读到的是 UTF-8 字节序列，一个汉字占 3 个字节，所以缓冲区要留够（`char name[16]` 只放得下 5 个汉字加 `'\0'`）。

## 常见错误

### 用 `fscanf(...) != EOF` 判断"读到一条记录"
`fscanf` 返回的是**成功赋值的字段数**。文件末尾返回 `EOF`，格式不匹配返回 `0`，只读到一部分返回 `1`、`2`。把它和 `EOF` 比较，等于把"读了一半的记录"也当成成功，数据会从这一行开始整体错位（见上面 `fmt-misalign` 的实验）。

### 用 `%s` 读带空格的字段
`%s` 遇到空白就停。名字是 `New York` 时读到 `New` 就收工，`York` 留给下一个 `%d`，转换立刻失败；下一轮又会从 `York` 开始，整份文件的字段对应关系全乱。字段里可能有空格时，要么换分隔符（CSV 用 `%[^,]`），要么用 `fgets` 读整行、自己按分隔符切。

### 读 `double` 用了 `%f`
`scanf` 家族的 `%f` 对应 **`float *`**，`%lf` 才对应 `double *`。给 `%f` 传 `double *` 会让它按 4 字节写入一个 8 字节的变量，是未定义行为；反过来 `%lf` 配 `float *` 会把 8 字节写进 4 字节的空间，直接踩坏相邻变量。这和 `printf` 不同：`printf` 的 `%f` 就表示 `double`（因为 `float` 会被提升），所以"写用 `%f`、读用 `%lf`"是必须记住的不对称。

### 不检查 fprintf 的返回值
`fprintf` 返回负数说明这次写入失败了（磁盘满、流已被关闭、文件系统只读）。日积月累的日志程序如果丢掉这个返回值，就会在磁盘满之后继续"正常"运行，直到有人发现最近三天的日志全是空的。至少要在写完关键数据后检查一次。

### 以为 `fscanf` 会按行读取
`fscanf` 眼里没有"行"，只有空白分隔的 token。知道这一点，才能理解为什么"文件里多了一个空行"通常不影响 `%d`（它会跳过），而"某一行少了一个字段"却会把下一行的数据吸过来。需要行语义时，用 `fgets`。

## 客观题

### q-s6-text-format-io-1 single
文件里有一行 `nut seven 0.25`，程序执行 `int got = fscanf(fp, "%15s %d %lf", name, &qty, &price);`。关于这次调用的结果，哪一条说法是**正确**的？

- [x] `got` 等于 1：只有 `name` 被赋值，`qty` 和 `price` 保持原来的值，文件位置停在这行剩下的部分
  > 正确。`%15s` 成功读到 `nut`，接着 `%d` 在 `s` 上匹配失败，`fscanf` 立刻返回已经赋值的字段数 1。匹配失败时后面的转换不再进行，`qty`、`price` 不会被写入，文件位置停在失败处之前。
- [ ] `got` 等于 EOF，因为这一行格式不对
  > 错。`EOF` 只在**输入结束**或**读取出错**时返回。格式不匹配返回的是"已赋值字段数"，这里是 1。把两者混为一谈，就会把半条记录当成文件的结尾。
- [ ] `got` 等于 3，但 `qty` 和 `price` 的值是 0
  > 错。匹配失败会立刻终止本次调用，不会"继续往下凑齐 3 个字段"。若真返回 3，说明格式串和文件内容是对得上的。
- [ ] `fscanf` 会自动跳过这一行，从下一行重新开始匹配，所以 `got` 等于 3
  > 错。`fscanf` 没有"行"的概念，也不会替你跳过坏行。它停在失败的位置，下一次调用会从 `seven` 开始继续解析，于是 `seven` 变成名字、`0.25` 被拆成整数 0 和浮点 0.25，后面的数据整体错位。
