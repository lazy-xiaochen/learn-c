---
id: s6-eof-error
---

## 讲解

### feof 报告的是"过去"，不是"未来"
这是文件读取里最反直觉的一件事：

> `feof(fp)` 回答的问题是"**上一次**读操作是不是因为碰到文件末尾而失败"，而不是"**下一次**读还能不能读到东西"。

为什么？因为流只在**真的读到末尾之后**才知道自己到末尾了。`FILE` 里有一个"文件结束标志"，它由读取函数在"尝试读、但一个字节都没读到"的时候设置。在你还没读到最后一行之后的那一刻，这个标志当然是 0——即使文件只剩最后一行。

于是 `while (!feof(fp))` 这种写法必然多跑一圈：最后一圈里 `fgets` 返回 `NULL`，缓冲区**保持上一轮的内容不变**，如果你不检查返回值，就会把最后一行再处理一次。

```c run id=eof-why-feof
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("two.txt", "w");
    if (fp == NULL) {
        return 1;
    }
    fputs("10\n20\n", fp);
    fclose(fp);

    fp = fopen("two.txt", "r");
    if (fp == NULL) {
        return 1;
    }
    char buf[32] = {0};
    int round = 0;
    while (!feof(fp)) {
        round++;
        int eof_before = feof(fp) != 0;
        char *got = fgets(buf, sizeof buf, fp);
        if (got == NULL) {
            printf("第 %d 圈：进入时 feof = %d，fgets 返回 NULL（之后 feof = %d）\n",
                   round, eof_before, feof(fp) != 0);
        } else {
            printf("第 %d 圈：进入时 feof = %d，读到 %s", round, eof_before, buf);
        }
    }
    fclose(fp);
    printf("循环跑了 %d 圈，文件只有 2 行\n", round);
    return 0;
}
```
```output
第 1 圈：进入时 feof = 0，读到 10
第 2 圈：进入时 feof = 0，读到 20
第 3 圈：进入时 feof = 0，fgets 返回 NULL（之后 feof = 1）
循环跑了 3 圈，文件只有 2 行
```

看第 3 圈：进入循环时 `feof` 还是 0——因为第 2 圈那次读取是**成功的**，流还没"试过"读末尾之后的位置。多出来的这一圈就是所有 `while (!feof)` bug 的来源。用 `fscanf` 时更明显：多出来的一圈里 `fscanf` 返回 `EOF`，但如果你不看返回值，计数器照样加一。

```c run id=eof-extra-round
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("nums.txt", "w");
    if (fp == NULL) {
        return 1;
    }
    fputs("1 2 3\n", fp);                /* 3 个数字，末尾有换行 */
    fclose(fp);

    fp = fopen("nums.txt", "r");
    if (fp == NULL) {
        return 1;
    }
    int count = 0;
    while (!feof(fp)) {
        int v = 0;
        int got = fscanf(fp, "%d", &v);   /* 不看返回值，只靠 feof 结束 */
        count++;
        printf("第 %d 圈：fscanf 返回 %d，v = %d\n", count, got, v);
    }
    fclose(fp);
    printf("文件里只有 3 个数字，循环却跑了 %d 圈\n", count);
    return 0;
}
```
```output
第 1 圈：fscanf 返回 1，v = 1
第 2 圈：fscanf 返回 1，v = 2
第 3 圈：fscanf 返回 1，v = 3
第 4 圈：fscanf 返回 -1，v = 0
文件里只有 3 个数字，循环却跑了 4 圈
```

第 4 圈里 `fscanf` 返回 -1（`EOF`），`v` 一个字节都没被写，仍是循环开头初始化的 0。如果这里的 `v` 声明在循环外面（很常见的写法），它就会是**上一条记录的旧值**——多算一条"数据"，而且数值看起来完全合法，根本查不出来。

顺便注意一个更容易把人绕晕的细节：如果文件末尾**没有**换行（内容是 `"1 2 3"`），这个循环只会跑 3 圈。因为 `%d` 读完 `3` 之后还要再读一个字符来判断数字有没有结束，这一读正好撞上文件末尾，`feof` 立刻变成真；而文件末尾有换行时，`%d` 停在 `'\n'` 上，`feof` 仍是 0，于是多跑一圈。`feof` 为真**并不代表上一次读取失败**——它只说明"流已经碰过文件末尾了"。这种"输入数据差一个换行、行为就变"的不确定，正是不能用 `feof` 控制循环的理由。

### 用读取函数的返回值控制循环
正确做法只有一句话：**谁读，谁的报告说了算**。每个读取函数都已经把"读到了没有"放在返回值里了：

| 函数 | 成功 | 结束/失败 |
|---|---|---|
| `fgets(buf, n, fp)` | 返回 `buf`（非 `NULL`） | 返回 `NULL` |
| `fgetc(fp)` | 返回 0..255 | 返回 `EOF` |
| `fread(p, size, n, fp)` | 返回读到的**元素个数** | 返回 0（或小于 n） |
| `fscanf(fp, fmt, ...)` | 返回成功赋值的**字段个数** | 返回 `EOF` |

所以三种标准写法是：

```c
while (fgets(buf, sizeof buf, fp) != NULL)        { /* 处理一行 */ }
while ((c = fgetc(fp)) != EOF)                     { /* 处理一个字符 */ }
while (fscanf(fp, "%d %lf", &id, &v) == 2)         { /* 处理一条记录 */ }
```

```c run id=eof-correct-loops
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("three.txt", "w");
    if (fp == NULL) {
        return 1;
    }
    fputs("a\nb\nc\n", fp);
    fclose(fp);

    char buf[16];
    int lines = 0;
    fp = fopen("three.txt", "r");
    if (fp == NULL) {
        return 1;
    }
    while (fgets(buf, sizeof buf, fp) != NULL) {
        lines++;
    }
    fclose(fp);

    int chars = 0;
    int c;
    fp = fopen("three.txt", "r");
    if (fp == NULL) {
        return 1;
    }
    while ((c = fgetc(fp)) != EOF) {
        chars++;
    }
    fclose(fp);

    int words = 0;
    fp = fopen("three.txt", "r");
    if (fp == NULL) {
        return 1;
    }
    while (fscanf(fp, "%15s", buf) == 1) {
        words++;
    }
    fclose(fp);

    printf("fgets 数到 %d 行\n", lines);
    printf("fgetc 数到 %d 个字符\n", chars);
    printf("fscanf 数到 %d 个单词\n", words);
    return 0;
}
```
```output
fgets 数到 3 行
fgetc 数到 6 个字符
fscanf 数到 3 个单词
```

这三个循环都**不需要 `feof`**：循环退出时就说明"读不到了"，`feof` 只是事后的解释，不是循环条件。

### fscanf 的三种返回值：字段数、0、EOF
`fscanf` 的返回值不能只用"是不是 EOF"来判断，因为它在三种情况下都"没读成"，含义完全不同：

| 返回值 | 含义 | 文件位置 | 该怎么办 |
|---|---|---|---|
| `== 字段数` | 全部字段读取成功 | 停在该行字段之后 | 处理这条记录 |
| `0 .. 字段数-1` | **匹配失败**：数据格式不对 | 停在失败处之前 | 丢掉/跳过这一行，恢复现场 |
| `EOF`（-1） | 输入结束**或**读取出错 | 文件末尾（或出错处） | 用 `feof`/`ferror` 区分原因 |

注意第二行：`0` 不是结束，是"这一行不是我要的格式"。忽略它，后面的数据就会像 `s6-text-format-io` 里演示的那样整体错位。遇到格式错误时，最稳的恢复动作是"把这一行剩下的字符吃掉"：

```c
int ch;
while ((ch = fgetc(fp)) != EOF && ch != '\n') {
    /* 丢弃这一行剩余部分 */
}
if (ch == EOF) {
    break;                    /* 吃到文件末尾了 */
}
```

### 读失败之后：feof 与 ferror 分工
循环结束之后，如果想知道"为什么结束"，这时才轮到 `feof` 和 `ferror` 出场：

- `feof(fp)`：上一次读失败是**因为到了文件末尾**（正常情况）；
- `ferror(fp)`：上一次读失败是**因为出了 I/O 错误**（磁盘坏道、设备断开、用错模式打开……）；
- 两者可能同时为假：说明循环是被别的原因结束的（例如 `fscanf` 返回 0 的格式错误）；
- `clearerr(fp)`：把这两个标志一起清掉，流可以继续用。

```c run id=eof-feof-ferror
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("mixed.txt", "w");
    if (fp == NULL) {
        return 1;
    }
    fputs("10 1.50\n20 2.50\nbad line\n30 3.50\n", fp);
    fclose(fp);

    fp = fopen("mixed.txt", "r");
    if (fp == NULL) {
        return 1;
    }
    int values = 0;
    int badlines = 0;
    double sum = 0.0;
    for (;;) {
        int id = 0;
        double v = 0.0;
        int got = fscanf(fp, "%d %lf", &id, &v);
        if (got == 2) {
            values++;
            sum += v;
            continue;
        }
        if (got == EOF) {
            printf("fscanf 返回 EOF：读完了（feof = %d，ferror = %d）\n",
                   feof(fp) != 0, ferror(fp) != 0);
            break;
        }
        badlines++;                       /* got 是 0 或 1：这一行格式不对 */
        int ch;
        while ((ch = fgetc(fp)) != EOF && ch != '\n') {
            /* 丢掉这一行剩下的字符，让下一次 fscanf 从下一行开头开始 */
        }
        if (ch == EOF) {
            break;
        }
    }
    fclose(fp);
    printf("有效 %d 条，坏行 %d 条，合计 %.2f\n", values, badlines, sum);
    return 0;
}
```
```output
fscanf 返回 EOF：读完了（feof = 1，ferror = 0）
有效 3 条，坏行 1 条，合计 7.50
```

`feof = 1`、`ferror = 0` 的组合表示"正常读完"。如果反过来看到 `ferror = 1`，那就要按真正的 I/O 失败处理——**数据可能只读到一半**，不能当成"文件就这么多内容"。

## 编译与运行

用 gcc 或 clang 编译，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra eof.c -o eof
./eof
```

```bash
clang -std=c17 -Wall -Wextra eof.c -o eof
./eof
```

几点说明：

- 编译器**不会**告诉你"`while (!feof)` 是错的"，这是纯语义错误。本平台的静态检查会报告"丢弃 scanf 返回值"（`scanf-return-unused`），而 `while (!feof)` 本身只能靠人看；
- 调试"为什么少读了一行/多读了一行"，最有效的办法是在循环里打印 `返回值`、`feof`、`ferror` 三个值（就像上面的例子），一眼就能看出是哪一种；
- 空文件是最容易被忽略的边界：`fgets` 立刻返回 `NULL`、`fscanf` 立刻返回 `EOF`、计数为 0。程序必须能处理"文件里什么都没有"，而不是假设至少有一条记录；
- 结束时把 `fclose` 的返回值也检查一下：写方向上的 `fclose` 失败会丢掉缓冲区里的最后一段数据，那同样是"读/写不完整"的一种。

## 常见错误

### 用 while (!feof(fp)) 控制读取循环
`feof` 只有在"读过末尾之后"才变真，所以循环会多跑一圈。这一圈里 `fgets` 返回 `NULL`（缓冲区还是旧内容），`fscanf` 返回 `EOF`（变量还是旧值）。于是最后一条记录被处理两次，或者被当成第 N+1 条数据参与统计。改成 `while (fgets(...) != NULL)` 即可。

### 把 fscanf 返回 0 当成"文件结束"
`0` 表示"一个字段都没匹配上"，文件还有大把内容；`EOF` 才是结束。把两者混为一谈，程序会在第一行格式不对的地方停下，把剩下的数据全部丢掉——而且不报任何错。判断顺序应该是：`== 字段数` → 处理；`== EOF` → 结束；其他 → 格式错误并恢复。

### 只判断"不等于 EOF"就当成读取成功
`got != EOF` 包含了 `1`、`2` 这些"只读了一半"的结果。用 `== 3` 这样的精确比较，才能保证三个字段都真的被赋值。这是 `s6-text-format-io` 里那个错位实验的代码版本。

### 循环里把 EOF 标志当成"永久状态"
一旦读到末尾，`feof` 就一直为真，后续再读也直接返回 `EOF`——除非调用 `clearerr` 或做定位。所以"先读一遍判断是否为空，再从头读一遍"这种写法必须配合 `rewind(fp)` / `fseek(fp, 0, SEEK_SET)` 和 `clearerr(fp)`，否则第二次读会立刻结束。更好的做法是只读一遍、边读边处理。

### 不看 ferror，把 I/O 错误当成"文件读完了"
`feof` 和 `ferror` 都为假时循环也可能结束（例如格式错误）。如果程序只判断 `feof`，就会把"读取出错"归到"正常结束"里，然后拿半份数据去算结果。正确顺序是：先看 `ferror`，再看 `feof`，都不是就说明是格式问题。

## 客观题

### q-s6-eof-error-1 single
文件里有 3 行内容，程序用 `while (!feof(fp)) { fgets(buf, sizeof buf, fp); count++; }` 统计行数。关于这段代码，哪一条说法是**正确**的？

- [x] `count` 会数成 4：读到最后一行的成功读取不会让 `feof` 变真，所以还要再进一次循环，那次 `fgets` 返回 `NULL` 而计数器照样加一
  > 正确。`feof` 只在"尝试读、并且一个字符都没读到"之后才置位。读完最后一行时它仍是 0，于是循环多进一圈；这一圈 `fgets` 返回 `NULL`，但 `count++` 已经执行了。
- [ ] `count` 会数成 3：`feof` 在读完最后一行时就会变成真
  > 错。读完最后一行是**成功**的读操作，流并不知道后面还有没有内容，只有"再读一次、读不到"时才会设置结束标志。这正是 `while (!feof)` 多跑一圈的原因。
- [ ] `count` 会数成 4，但只要把循环体改成 `if (fgets(...) != NULL) count++;` 就完全正确了
  > 错。这样确实不会再多数，但用 `feof` 控制循环本身就是多余的：循环还会多进一圈（只是不计数），并且如果循环体里有别的副作用（比如打印、累加），它们仍然会执行。正确写法是 `while (fgets(...) != NULL)`，让返回值同时负责"循环"和"判断"。
- [ ] 这段代码在空文件上会死循环
  > 错。空文件第一次 `fgets` 就返回 `NULL` 并设置 `feof`，第二次判断时循环就结束了，`count` 为 1（而不是 0）——还是多算了一次，但不是死循环。
