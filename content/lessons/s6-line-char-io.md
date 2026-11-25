---
id: s6-line-char-io
---

## 讲解

### fgets 一次读一行，而且把换行符留在缓冲区里
`fgets(buf, n, fp)` 的语义可以拆成三条，每一条都有"为什么"：

1. **最多读 `n - 1` 个字符**，然后补一个 `'\0'`。`n` 里必须给结尾的 `'\0'` 留位置，所以"缓冲区大小 8"实际只能装 7 个字符。
2. **遇到 `'\n'` 就停，并且把这个 `'\n'` 存进缓冲区**。这是 `fgets` 和 `gets`/`scanf("%s")` 最大的不同：它保留换行，所以"缓冲区里的内容"和"文件里的原始字节"是一致的。
3. **遇到 EOF 或读错误也停**，此时返回 `NULL`（如果读到了字符，返回的还是 `buf`）。

为什么第 2 条要这样设计？因为换行符是**数据**，不是分隔符。逐行复制文件时，如果把 `'\n'` 丢掉，复制出来的文件就会粘成一行；而保留换行，等于保留了"这一行原来在哪里结束"的全部信息——你随时可以自己决定要不要去掉它。

```c run id=line-fgets-newline
#include <stdio.h>
#include <string.h>

int main(void) {
    FILE *fp = fopen("notes.txt", "w");
    if (fp == NULL) {
        return 1;
    }
    fputs("alpha\n\nbeta\n", fp);        /* 第 2 行是空行 */
    fclose(fp);

    fp = fopen("notes.txt", "r");
    if (fp == NULL) {
        return 1;
    }
    char line[16];
    int n = 0;
    while (fgets(line, sizeof line, fp) != NULL) {
        n++;
        size_t len = strlen(line);
        int has_nl = len > 0 && line[len - 1] == '\n';
        printf("第 %d 行：长度 %zu，%s，内容=[", n, len, has_nl ? "带换行" : "没有换行");
        for (size_t i = 0; i < len; i++) {
            putchar(line[i] == '\n' ? '#' : line[i]);   /* 换行用 # 显示，避免打乱输出 */
        }
        printf("]\n");
    }
    fclose(fp);
    return 0;
}
```
```output
第 1 行：长度 6，带换行，内容=[alpha#]
第 2 行：长度 1，带换行，内容=[#]
第 3 行：长度 5，带换行，内容=[beta#]
```

注意第 2 行：空行的长度不是 0，而是 1——因为 `"\n"` 被读进来了。很多"统计空行"的程序算错，就是因为忘了这一点。

### fputs 不会自动加换行
和 `puts` 对比最容易记住：

- `puts(s)` 把 `s` 写到 `stdout`，**再补一个 `'\n'`**；
- `fputs(s, fp)` 只写 `s` 本身，**一个字节都不多**。

所以用 `fgets` + `fputs` 做文件复制是天然正确的：读进来带换行，写出去也带换行，字节数一一对应。反过来，如果你自己拼了一行内容（比如加了行号），那就必须**自己补换行**，否则所有行会粘在一起：

```c run id=line-fputs
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("puts.txt", "w");
    if (fp == NULL) {
        return 1;
    }
    fputs("first", fp);       /* 不自动加换行 */
    fputs("second", fp);      /* 紧接在后面，还在同一行 */
    fputs("\n", fp);          /* 想要换行就得自己写 */
    fputs("third\n", fp);     /* 或者把换行放进字符串里 */
    fclose(fp);

    fp = fopen("puts.txt", "r");
    if (fp == NULL) {
        return 1;
    }
    char line[32];
    int n = 0;
    while (fgets(line, sizeof line, fp) != NULL) {
        n++;
        printf("第 %d 行：%s", n, line);    /* line 自带换行，输出自然分行 */
    }
    fclose(fp);
    printf("共 %d 行\n", n);
    return 0;
}
```
```output
第 1 行：firstsecond
第 2 行：third
共 2 行
```

`first` 和 `second` 之间没有任何东西，所以它们成了同一行的内容——`fputs` 的"不加换行"就是字面意思。

### 一行太长时，fgets 会分多次返回
`fgets` 并不保证"一次返回就是完整一行"。如果一行有 16 个字符而缓冲区只有 8 个，它会先返回前 7 个字符（不含换行，因为还没读到），下一次调用再返回剩下的部分。**判断"这一行读完了没有"的唯一方法是看缓冲区末尾有没有 `'\n'`**（或者这次是不是读到了 EOF）：

```c run id=line-long
#include <stdio.h>
#include <string.h>

int main(void) {
    FILE *fp = fopen("long.txt", "w");
    if (fp == NULL) {
        return 1;
    }
    fputs("0123456789ABCDEF\n", fp);      /* 16 个字符 + 换行 */
    fclose(fp);

    fp = fopen("long.txt", "r");
    if (fp == NULL) {
        return 1;
    }
    char buf[8];                          /* 一次最多 7 个字符 */
    int chunk = 0;
    while (fgets(buf, sizeof buf, fp) != NULL) {
        chunk++;
        size_t len = strlen(buf);
        int has_nl = len > 0 && buf[len - 1] == '\n';
        printf("第 %d 次 fgets：长度 %zu，%s，内容=[", chunk, len,
               has_nl ? "含换行，这一行读完了" : "不含换行，缓冲区满了");
        for (size_t i = 0; i < len; i++) {
            putchar(buf[i] == '\n' ? '#' : buf[i]);
        }
        printf("]\n");
    }
    fclose(fp);
    printf("这一行被切成了 %d 次\n", chunk);
    return 0;
}
```
```output
第 1 次 fgets：长度 7，不含换行，缓冲区满了，内容=[0123456]
第 2 次 fgets：长度 7，不含换行，缓冲区满了，内容=[789ABCD]
第 3 次 fgets：长度 3，含换行，这一行读完了，内容=[EF#]
这一行被切成了 3 次
```

看到这段输出就能明白为什么"按行处理"的程序必须检查换行：如果每读到一次就当作一行来加行号，一个 16 字符的长行会被编成 3 行。两种处理方式都合法，但必须**自己选一种**：

- **截断**：缓冲区里没有 `'\n'` 就一直 `fgetc` 到 `'\n'`，把剩下的部分丢掉，此行按"超长被截断"处理；
- **拼接**：把碎片陆续接进一个更大的缓冲区，直到遇到 `'\n'` 再处理整行。

数据范围里如果写明了"每行不超过 N 个字符"，那就把缓冲区开成 `N + 2`（`+1` 给 `'\n'`，`+1` 给 `'\0'`），这样每次 `fgets` 都恰好是一整行，上面的麻烦就不存在了。

### fgetc 为什么返回 int，而不是 char
`fgetc` 要同时表达 **256 种字节值（0..255）** 和 **一个额外的"结束"信号**，一共 257 种可能，`char` 只有 256 种，装不下。所以标准规定它返回 `int`：正常字节的值是 0..255，结束时返回 `EOF`（通常是 -1）。

如果你把结果存进 `char`，在"`char` 是有符号"的平台上，字节 `0xFF` 会被解释成 -1，和 `EOF` **撞车**：

```c run id=line-fgetc-int
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("bytes.bin", "wb");
    if (fp == NULL) {
        return 1;
    }
    fputc(0xFF, fp);                  /* 一个合法的字节 */
    fputc('A', fp);
    fclose(fp);

    fp = fopen("bytes.bin", "rb");
    if (fp == NULL) {
        return 1;
    }
    int n = 0;
    int c;
    while ((c = fgetc(fp)) != EOF) {   /* 正确：用 int 接 */
        n++;
    }
    fclose(fp);
    printf("用 int 接 fgetc：读到 %d 个字节\n", n);

    fp = fopen("bytes.bin", "rb");
    if (fp == NULL) {
        return 1;
    }
    int m = 0;
    char ch;
    while ((ch = (char)fgetc(fp)) != EOF) {   /* 错误：char 装不下 257 种状态 */
        m++;
    }
    fclose(fp);
    printf("用 char 接 fgetc：读到 %d 个字节（0xFF 被当成了 EOF）\n", m);
    return 0;
}
```
```output
用 int 接 fgetc：读到 2 个字节
用 char 接 fgetc：读到 0 个字节（0xFF 被当成了 EOF）
```

这个 bug 极其阴险：文件里没有 `0xFF` 时程序完全正常，一旦遇到二进制数据（图片、压缩包、别人发来的数据文件）就会**提前结束**，而且看起来像"文件读完了"。如果 `char` 是无符号的（某些 ARM 平台），`EOF`（-1）转换后是 255，循环条件**永远成立**，变成死循环。所以：**`fgetc` 的返回值一律用 `int` 接**。

## 编译与运行

用 gcc 或 clang 编译，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra line.c -o line
./line
```

```bash
clang -std=c17 -Wall -Wextra line.c -o line
./line
```

几点说明：

- `-Wall -Wextra` **不会**警告"`char` 接 `fgetc`"这类问题（类型上 `char` 完全合法）。想让它暴露，可以加 `-Wconversion`：它会把 `int` 到 `char` 的窄化转换标出来；
- 想知道文件里到底有哪些字节，用十六进制看最可靠。Linux 上用 `xxd file`，Windows 上可以用本平台的示例程序把每个字节按 `%02X` 打出来；
- 复制文件时最稳的验证是"源和目标的字节数一样、逐字节比较一样"。文本模式下 `\r\n` 会被归一，所以比较二进制内容要用 `"rb"`/`"wb"`；
- 处理中文文本时注意：`fgets` 按字节读，一"行"里可能包含半个 UTF-8 汉字的情况只在缓冲区太小、恰好切在中间时发生，解决办法还是把缓冲区开够。

## 常见错误

### 用 char 变量接 fgetc 的返回值
`fgetc` 返回 `int`，正是为了把 0..255 和 `EOF`（-1）区分开。存进 `char` 之后，`0xFF` 会变成 -1 与 `EOF` 混淆，读到它就提前结束；在 `char` 无符号的平台上则相反——`EOF` 变成 255，循环永远不结束。这个错误的可怕之处是"在纯文本文件上永远不出现"。

### 忘了 fgets 会把换行符留在缓冲区里
于是 `strcmp(line, "yes")` 永远不等于 0（实际内容是 `"yes\n"`），`printf("[%s]", line)` 会在 `]` 之前多一个空行。两个常用处理方式：

```c
line[strcspn(line, "\n")] = '\0';      /* 把第一个换行改成 '\0'，最简洁 */
```

或者手动检查末尾：

```c
size_t len = strlen(line);
if (len > 0 && line[len - 1] == '\n') {
    line[len - 1] = '\0';
}
```

注意 `strcspn` 返回的是"第一个 `'\n'` 的下标"，如果行里没有换行（超长行被截断的情况），它返回的就是字符串长度，正好指向结尾的 `'\0'`，所以这一行写法是安全的。

### 以为 fgets 一次就是一行
缓冲区小于行长时，`fgets` 会把一行拆成多次返回，每次都不含 `'\n'`（最后一次才含）。按"每次 fgets = 一行"来处理，长行会被拆成好几条记录，行号、统计、去重全部错位。判断依据只有"末尾有没有 `'\n'`"。

### 用 fputs 拼行号却忘了补换行
`fprintf(fp, "%03d|%s", no, line)` 如果 `line` 已经被你去掉了换行，输出就会把所有行粘成一整行——文件看起来"只有一行"，但内容其实都在。要么保留 `line` 里的换行，要么显式写 `"%03d|%s\n"`。

### 用 while (!feof(fp)) 控制按行读取
`feof` 报告的是"**上一次**读操作是否撞到了文件末尾"，不是"下一行还有没有数据"。用它做循环条件，最后一轮 `fgets` 会返回 `NULL`、缓冲区保持旧内容，于是最后一行被处理两次。正确写法是 `while (fgets(buf, sizeof buf, fp) != NULL)`，详见 `s6-eof-error`。

## 客观题

### q-s6-line-char-io-1 single
设 `char buf[8];`，对一个内容为 `"0123456789ABCDEF\n"` 的文件反复调用 `fgets(buf, sizeof buf, fp)`。关于第一次调用的结果，哪一条说法是**正确**的？

- [x] `buf` 里是 `"0123456"`（7 个字符加 `'\0'`），末尾没有换行符，说明这一行还没读完
  > 正确。`fgets` 最多读 `n - 1 = 7` 个字符，然后补 `'\0'`。因为没读到 `'\n'` 就填满了缓冲区，所以返回的片段不含换行，下一次调用会接着读 `"789ABCD"`。判断"整行是否读完"就看末尾有没有 `'\n'`。
- [ ] `buf` 里是 `"01234567"`（8 个字符），第 8 个位置被换行符覆盖
  > 错。`n` 包含结尾的 `'\0'`，所以最多只能放 7 个字符。写满 8 个字符会没有位置放 `'\0'`，`fgets` 不会这样做。
- [ ] `buf` 里是完整的一行 `"0123456789ABCDEF\n"`，`fgets` 会自动扩容
  > 错。`fgets` 不会扩容，它只认你传进去的缓冲区大小。缓冲区不够就把一行拆成多次返回，这正是"一次 fgets 不等于一行"的原因。
- [ ] `fgets` 返回 `NULL`，因为这一行比缓冲区长
  > 错。行太长不是错误，`fgets` 会返回已经读到的片段（非 `NULL`）。只有"一个字符都没读到就遇到 EOF 或读错误"时才返回 `NULL`。

