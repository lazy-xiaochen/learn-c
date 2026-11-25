---
id: s6-file-position
---

## 讲解

### FILE * 里没有文件内容，只有"读到哪儿了"
`fopen` 返回的 `FILE *` 是一个**不透明句柄**（opaque handle）：你看不到它的成员，也不应该去猜它的布局。它背后通常包含三样东西：

1. 一个操作系统级的文件描述符 / 句柄；
2. 一块用户态缓冲区，以及"缓冲区里还有多少字节没交给你"的状态；
3. 一个**文件位置指示器**（file position indicator），也就是"下一次读写会从文件的第几个字节开始"。

所谓"文件指针"，指的只是第 3 样东西，**不是**内存里指向文件内容的指针。文件内容在磁盘上，缓冲区只是它的一小段副本；位置指示器则是一个偏移量。顺序读时，每读一个字节，这个偏移量就前进一个字节（在文本模式下，前进的字节数按**磁盘上的物理字节**算，后面会讲）；写时同理。

`ftell` 把这个偏移量读出来，`fseek` 把它改掉，`rewind` 把它归零。三个函数合起来，就是 C 标准提供的"随机访问"能力。

### ftell / fseek / rewind：三个动作，一张表
先看它们的签名和返回值：

| 函数 | 签名 | 成功 | 失败 |
|---|---|---|---|
| `ftell` | `long ftell(FILE *stream);` | 返回当前位置（字节偏移） | 返回 `-1L`，并设置 `errno` |
| `fseek` | `int fseek(FILE *stream, long offset, int whence);` | 返回 `0` | 返回非 `0`（本平台实现会保持位置不变） |
| `rewind` | `void rewind(FILE *stream);` | 无返回值 | 无返回值（错误被静默清除） |

`fseek` 的第三个参数是"从哪儿算起"：

- `SEEK_SET`：从文件开头算，目标位置 = `offset`；
- `SEEK_CUR`：从当前位置算，目标位置 = 当前位置 + `offset`；
- `SEEK_END`：从文件末尾算，目标位置 = 文件长度 + `offset`。

`offset` 可以是负数，但**算出来的目标位置不能是负数**，否则 `fseek` 失败，位置保持原样。允许把位置移到文件末尾**之后**：`fseek(fp, 100, SEEK_SET)` 对一个 5 字节的文件也会成功，此时 `ftell` 返回 100，读操作立刻得到 EOF；如果这时写入，文件会被"撑大"，中间没写过的部分读出来是 0 字节（这叫**空洞**，hole）。

`rewind(fp)` 等价于 `(void)fseek(fp, 0, SEEK_SET)`，但它还额外做一件事：**清除流的错误标志**（`clearerr`）。所以 `rewind` 不只是"回到开头"，还是"把上一次读失败留下的错误状态也清掉"。它没有返回值，因此无法报告失败——需要检查失败时，用 `fseek`。

第一个实验：写一个 CRLF 文本文件，用文本模式逐行读，观察每读一行 `ftell` 跳多远；再用 `rewind` 和 `fseek` 回到保存下来的位置：

```c run id=fp-tell
#include <stdio.h>
#include <string.h>

static void strip_eol(char *s) {
    s[strcspn(s, "\r\n")] = '\0';
}

int main(void) {
    FILE *fp = fopen("lines.txt", "wb");       /* 先手工写出 CRLF 文件 */
    if (fp == NULL) {
        return 1;
    }
    fputs("one\r\ntwo\r\nthree\r\n", fp);
    fclose(fp);

    fp = fopen("lines.txt", "r");               /* 用文本模式读 */
    if (fp == NULL) {
        return 1;
    }
    char buf[16];
    long saved = -1;
    while (fgets(buf, sizeof buf, fp) != NULL) {
        strip_eol(buf);
        printf("读到 %-5s 之后 ftell = %ld\n", buf, ftell(fp));
        if (saved < 0) {
            saved = ftell(fp);
        }
    }
    printf("读到文件末尾 ftell = %ld\n", ftell(fp));

    rewind(fp);
    printf("rewind 之后 ftell = %ld\n", ftell(fp));
    if (fgets(buf, sizeof buf, fp) != NULL) {
        strip_eol(buf);
        printf("从头再读一行：%s\n", buf);
    }
    if (fseek(fp, saved, SEEK_SET) != 0) {      /* saved 是 ftell 给的值，可以交回 fseek */
        fclose(fp);
        return 1;
    }
    printf("fseek 回第一行末尾之后 ftell = %ld\n", ftell(fp));
    if (fgets(buf, sizeof buf, fp) != NULL) {
        strip_eol(buf);
        printf("从那里再读一行：%s\n", buf);
    }
    fclose(fp);
    return 0;
}
```
```output
读到 one   之后 ftell = 5
读到 two   之后 ftell = 10
读到 three 之后 ftell = 17
读到文件末尾 ftell = 17
rewind 之后 ftell = 0
从头再读一行：one
fseek 回第一行末尾之后 ftell = 5
从那里再读一行：two
```

三行文本在内存里是 `"one"`、`"two"`、`"three"`，字符数分别是 3、3、5；但 `ftell` 每次跳 5、5、7，因为磁盘上每行末尾有两个字节 `0D 0A`。`ftell` 报告的是**物理字节偏移**，不是"读了多少个字符"，更不是"第几列"。

第二个实验：用 `fseek` + `ftell` 求文件大小，再从末尾倒着读最后一个元素：

```c run id=fp-size
#include <stdio.h>

int main(void) {
    int nums[5] = { 10, 20, 30, 40, 50 };
    FILE *fp = fopen("nums.bin", "wb");
    if (fp == NULL) {
        return 1;
    }
    if (fwrite(nums, sizeof nums[0], 5, fp) != 5) {
        fclose(fp);
        return 1;
    }
    fclose(fp);

    fp = fopen("nums.bin", "rb");
    if (fp == NULL) {
        return 1;
    }
    if (fseek(fp, 0, SEEK_END) != 0) {
        fclose(fp);
        return 1;
    }
    long size = ftell(fp);
    printf("文件大小 = %ld 字节，共 %ld 个 int\n", size, size / (long)sizeof(int));

    if (fseek(fp, -(long)sizeof(int), SEEK_END) != 0) {   /* 从末尾往回退一个 int */
        fclose(fp);
        return 1;
    }
    int last = 0;
    if (fread(&last, sizeof last, 1, fp) == 1) {
        printf("最后一个元素 = %d，读完后 ftell = %ld\n", last, ftell(fp));
    }

    rewind(fp);
    printf("rewind 之后 ftell = %ld\n", ftell(fp));
    int first = 0;
    if (fread(&first, sizeof first, 1, fp) == 1) {
        printf("第一个元素 = %d\n", first);
    }
    fclose(fp);
    return 0;
}
```
```output
文件大小 = 20 字节，共 5 个 int
最后一个元素 = 50，读完后 ftell = 20
rewind 之后 ftell = 0
第一个元素 = 10
```

"求文件大小"没有标准库的一步函数，标准做法就是这三步：`fseek(fp, 0, SEEK_END)` → `ftell(fp)` → 再 `fseek`/`rewind` 回去。注意第三步不能省：算完大小后位置停在末尾，直接读只会读到 EOF。

第三个实验：把文件当成一排**定长记录**，直接用记录下标算出偏移，随机访问第 3 条，再就地改写第 2 条：

```c run id=fp-record
#include <stdio.h>

typedef struct {
    int id;
    int score;
} Record;                                   /* 两个 int，刚好 8 字节 */

static void print_record(const Record *r) {
    printf("id=%d score=%d\n", r->id, r->score);
}

int main(void) {
    Record records[4] = { { 1, 10 }, { 2, 20 }, { 3, 30 }, { 4, 40 } };
    FILE *fp = fopen("records.bin", "wb");
    if (fp == NULL) {
        return 1;
    }
    if (fwrite(records, sizeof records[0], 4, fp) != 4) {
        fclose(fp);
        return 1;
    }
    fclose(fp);
    printf("sizeof(Record) = %zu\n", sizeof(Record));

    fp = fopen("records.bin", "r+b");           /* 更新流：既能读也能写，不截断 */
    if (fp == NULL) {
        return 1;
    }
    if (fseek(fp, 2 * (long)sizeof(Record), SEEK_SET) != 0) {   /* 第 3 条，下标从 0 开始 */
        fclose(fp);
        return 1;
    }
    Record r;
    if (fread(&r, sizeof r, 1, fp) == 1) {
        printf("第 3 条记录：");
        print_record(&r);
    }

    Record updated = { 20, 200 };               /* 就地改写第 2 条 */
    if (fseek(fp, 1 * (long)sizeof(Record), SEEK_SET) != 0) {
        fclose(fp);
        return 1;
    }
    if (fwrite(&updated, sizeof updated, 1, fp) != 1) {
        fclose(fp);
        return 1;
    }
    if (fflush(fp) != 0) {                      /* 写完立刻刷新，再切回读之前也要定位 */
        fclose(fp);
        return 1;
    }

    rewind(fp);
    for (int i = 0; i < 4; i++) {
        if (fread(&r, sizeof r, 1, fp) != 1) {
            break;
        }
        printf("%d: id=%d score=%d\n", i, r.id, r.score);
    }
    fclose(fp);
    return 0;
}
```
```output
sizeof(Record) = 8
第 3 条记录：id=3 score=30
0: id=1 score=10
1: id=20 score=200
2: id=3 score=30
3: id=4 score=40
```

随机访问的公式是 `偏移 = 下标 × sizeof(记录)`。它成立的前提是**每条记录大小完全相同**、且用**二进制模式**读写；一旦记录里有变长字符串，或者用文本模式（CRLF 会让每条记录长度不同），这个公式就不成立了。

### 文本模式的 ftell：只能"原样还回去"
文本模式下 `ftell` 返回的不是"第几个字符"，而是**实现内部用来定位的一个数**。在 Windows 的 UCRT 上，它恰好就是物理字节偏移，于是出现了第一个实验里"3 个字符却跳 5 个字节"的现象。

这带来两条限制：

1. **`ftell` 的值不能拿去做算术**。你不能用它算"第几列"，也不能用"上一行的 `ftell` + 行长"来定位下一行——行长的字节数取决于这一行里有多少个 CRLF，而你在文本模式里根本看不到 CR。
2. **`fseek` 在文本模式下只能接受 `0` 或 `ftell` 返回过的值**。如果你随手 `fseek(fp, 2, SEEK_SET)`，可能正好落在 `0D` 和 `0A` 之间：CRT 读到一个孤立的 `0A`，会把它当成一个普通换行交给你，于是"行"的边界和你以为的不一样。C 标准对文本流的 `fseek` 偏移只保证这两种用法，`SEEK_END` 在文本流上的效果同样是实现定义的。

所以文本模式下的正确姿势是：

- 想"回到刚才那行的开头"——在读之前用 `ftell` 记下位置，之后用 `fseek` 原样传回去；
- 想算字符数、列号、行长度——自己在读到的字符串上算，不要碰 `ftell`；
- 想按固定偏移随机访问——把文件切成二进制模式，自己处理换行，这样偏移才有可计算的语义。

### 读写切换：更新流的两条硬规则
用 `"r+"`、`"w+"`、`"a+"` 打开的是**更新流**（update stream），同一个 `FILE *` 既能读又能写。但 C 标准对"读一下、写一下"的交替有两条规则，违反它们属于未定义行为：

1. **写 → 读**：在两次写之间、切换到读之前，必须调用 `fflush` 或某个定位函数（`fseek`、`fsetpos`、`rewind`）。原因是写出去的数据可能还在用户态缓冲区里，不刷新的话读操作看到的是旧文件。
2. **读 → 写**：在切换到写之前，必须调用定位函数（`fseek`、`fsetpos`、`rewind`），除非读操作已经碰到了 EOF。定位函数会丢弃 `ungetc` 压回去的字符，并让缓冲区状态重新同步。

`fseek` 本身就会刷新输出缓冲区，所以在"写→读"时用 `fseek` 也够了；但很多人习惯先 `fflush` 再 `fseek`，这样意图更清楚。第三个实验里改写记录之前先 `fseek`、写完再 `fflush` 再 `rewind`，就是按这两条规则来的。

### EOF 标志：读失败留下的"粘性"状态
`feof(fp)` 不是"文件现在在末尾"，而是"**上一次读操作因为碰到文件末尾而失败**"。它是一个粘性标志：一旦被设置，除非你调用 `clearerr`、`rewind` 或成功的 `fseek`，否则它会一直保持。读失败后即使位置还在文件中间，`feof` 也可能仍然是 1。

`fseek` 会清除 EOF 标志（标准保证），`rewind` 还会连错误标志一起清掉；这两点经常被用来"读完一遍再读一遍"。看下面的实验：

```c run id=fp-eof
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("abc.txt", "wb");
    if (fp == NULL) {
        return 1;
    }
    fputs("abc", fp);
    fclose(fp);

    fp = fopen("abc.txt", "r");
    if (fp == NULL) {
        return 1;
    }
    int ch;
    while ((ch = fgetc(fp)) != EOF) {
        /* 一直读到文件末尾 */
    }
    int at_eof = feof(fp) != 0;
    long pos = ftell(fp);
    printf("读到 EOF：feof=%d ftell=%ld\n", at_eof, pos);

    ch = fgetc(fp);
    printf("不定位直接再读一个字符：%d\n", ch);

    if (fseek(fp, 1, SEEK_SET) != 0) {
        fclose(fp);
        return 1;
    }
    printf("fseek 之后 feof=%d\n", feof(fp) != 0);
    ch = fgetc(fp);
    printf("读出 %c\n", ch);

    rewind(fp);
    int eof_after_rewind = feof(fp) != 0;
    long pos_after_rewind = ftell(fp);
    ch = fgetc(fp);
    printf("rewind 之后 feof=%d ftell=%ld，读出 %c\n", eof_after_rewind, pos_after_rewind, ch);
    fclose(fp);
    return 0;
}
```
```output
读到 EOF：feof=1 ftell=3
不定位直接再读一个字符：-1
fseek 之后 feof=0
读出 b
rewind 之后 feof=0 ftell=0，读出 a
```

注意"读到 EOF：feof=1 ftell=3"：三次 `fgetc` 之后位置在 3，第四次读失败才把 `feof` 置 1。`feof` 永远**晚一步**——这正是 `while (!feof(fp)) { 读取; 处理; }` 会多处理一次最后一条记录的原因：循环条件在"读失败"之前检查，而 `feof` 要等读失败之后才为真。

## 编译与运行

用 gcc 或 clang 都可以，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra seek.c -o seek
./seek
```

```bash
clang -std=c17 -Wall -Wextra seek.c -o seek
./seek
```

几个调试技巧：

- 用 `fseek` 的返回值判断定位是否成功，不要假设"偏移合法就一定成功"；
- 用 `ftell` 打印位置时，同时打印缓冲区里读到的内容，才能区分"位置错了"还是"内容错了"；
- 想确认文件长度，除了 `fseek` + `ftell`，也可以直接看文件属性；两者不一致时，先检查是不是文本模式在 CRLF 上做了翻译；
- Windows 的 `long` 是 32 位，超过 2GB 的文件用 `ftell`/`fseek` 会溢出。微软的 UCRT 提供了 `_ftelli64` / `_fseeki64`，POSIX 提供 `ftello` / `fseeko`——它们都不是 C17 标准的一部分，本平台的题目不会用到。

## 常见错误

### 把文本模式的 ftell 当成字符数或列号
`ftell` 报告的是定位用的数值，Windows 文本模式下就是物理字节偏移。CRLF 占两个字节，所以"读了 3 个字符"完全可能对应"ftell 前进了 5"。拿 `ftell` 算列号、算行宽、算"下一行的开头"，在文本模式下必然错位；要按字符算，就自己在读到的字符串上数。

### 不检查 fseek 的返回值
`fseek(fp, -10, SEEK_SET)` 在文件开头附近会失败，返回非 0；本平台的实现会让**位置保持不动**。如果代码不检查返回值就继续读，读到的其实是上一次的位置，而不是以为的"开头前 10 个字节"。尤其在 `SEEK_CUR` 上做减法时，很容易算出负的目标位置；`ftell` 之后减去一个长度再 `fseek` 之前，先确认结果不小于 0。

### 在更新流里写完不刷新就切到读
用 `"r+b"` 打开文件，`fwrite` 之后直接 `fread`，读到的可能是旧内容——写的数据还在用户态缓冲区里。C 标准要求"写→读"之间插入 `fflush` 或定位函数，否则是未定义行为。正确顺序是：`fwrite` → `fflush`（或 `fseek`）→ `fread`。

### 以为 fseek 到文件末尾之外会失败
在本题涉及的可定位文件上，目标位置为负是唯一会让 `fseek` 失败的情况；目标位置超过文件长度是允许的。此时 `ftell` 会返回那个超出末尾的位置，读操作返回 EOF；如果接着写，文件会被撑大，中间的空洞读出来是 0。很多"追加数据"的代码靠这个特性预占空间，但要清楚自己写的是空洞还是真实数据。

### 用 feof 控制"再读一行"的循环
`feof` 在**读失败之后**才变成真，所以 `while (!feof(fp)) { fgets(...); 处理(...); }` 会把最后一行处理两次（最后一次读到的是旧缓冲区或空串）。正确做法是用读取函数的返回值控制循环：`while (fgets(buf, sizeof buf, fp) != NULL) { ... }`，循环结束之后再根据 `feof` / `ferror` 区分"读完了"和"出错了"。

## 客观题

### q-s6-file-position-1 single
文件 `data.txt` 在磁盘上的字节是 `41 42 0D 0A 43 44 0D 0A`（即 `"AB\r\nCD\r\n"`，共 8 字节）。在 Windows 上用文本模式打开它，执行 `fgets(buf, sizeof buf, fp)` 读第一行之后，`ftell(fp)` 返回多少？

- [x] 4
  > 正确。`fgets` 在文本模式下返回的字符串是 `"AB\n"`（3 个字符），但 CRT 从磁盘上消费了 `A`、`B`、`0D`、`0A` 共 4 个物理字节，位置指示器因此前进 4。`ftell` 报告的是物理字节偏移，不是读到的字符数。
- [ ] 3
  > 错。3 是 `fgets` 交到你缓冲区里的字符数（`A`、`B`、`\n`），不是磁盘上的字节数。文本模式把 CRLF 收成一个 `\n`，交给你时少了 1 个字符，但文件位置仍然走过了 2 个字节。
- [ ] 8
  > 错。8 是整个文件的长度。`fgets` 读到第一个 `\n` 就停下，不会把整个文件读完；只有读完两行、再读一次失败之后，位置才会到 8。
- [ ] 5
  > 错。5 是"第一行 4 字节 + 第二行开头 1 字节"之类的错误加法；`fgets` 停在第一行的 `\n` 之后，位置正好是 4，不会多读下一个字符。
