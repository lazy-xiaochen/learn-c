---
id: s6-text-vs-binary
---

## 讲解

### 两种流，两种"字节观"
C 标准把文件分成两类**流**（stream）：

- **文本流**（text stream）：它是一串**行**，每行以 `\n` 结尾。至于这一行在磁盘上到底用几个字节、哪几个字节表示行尾，标准**不做规定**，交给实现去映射。
- **二进制流**（binary stream）：它就是一串**字节**。你写进去什么，磁盘上就是什么；读出来也是原样，中间没有任何"翻译"。

`fopen` 的模式串决定你拿到哪一种：`"r"`、`"w"`、`"a"` 是文本流，加上 `b`（`"rb"`、`"wb"`、`"ab"`，或 `"r+b"` 这类更新模式）就是二进制流。`b` 在 POSIX（Linux/macOS）上允许写但**没有任何效果**，因为那里的文本流本来就用一个 `\n` 表示行尾；只有 Windows 这类继承 DOS 传统的平台，两种模式才会真的分道扬镳。

在 Windows 上，规则只有一条：

> 文本模式下，**每一个** `0x0A` 字节在写出时变成 `0x0D 0x0A`；读入时，**每一对** `0x0D 0x0A` 变回一个 `0x0A`。二进制模式什么都不做。

注意这句话里的"每一个"：翻译发生在**字节层**，不是"行尾层"。你写一段普通文本，它表现为"换行变成 CRLF"；你用 `fwrite` 写一个整数，整数里恰好有一个 `0x0A` 字节，它也会被撑成两个字节——这正是文本模式碰不得二进制数据的原因。

先看同一份数据在两种模式下写出来的差别：

```c run id=tb-write
#include <stdio.h>
#include <string.h>

static long file_size(const char *path) {
    FILE *fp = fopen(path, "rb");
    if (fp == NULL) {
        return -1;
    }
    if (fseek(fp, 0, SEEK_END) != 0) {
        fclose(fp);
        return -1;
    }
    long n = ftell(fp);
    fclose(fp);
    return n;
}

static void dump(const char *path) {
    FILE *fp = fopen(path, "rb");
    if (fp == NULL) {
        return;
    }
    printf("%s:", path);
    int c;
    while ((c = fgetc(fp)) != EOF) {
        printf(" %02X", (unsigned)c);
    }
    printf("\n");
    fclose(fp);
}

int main(void) {
    const char *data = "A\nB\n";

    FILE *fp = fopen("text.txt", "w");          /* 文本模式 */
    if (fp == NULL) {
        return 1;
    }
    fputs(data, fp);
    fclose(fp);

    fp = fopen("binary.txt", "wb");             /* 二进制模式 */
    if (fp == NULL) {
        return 1;
    }
    fputs(data, fp);
    fclose(fp);

    printf("内存里的字符数：%zu\n", strlen(data));
    printf("text.txt   大小：%ld 字节\n", file_size("text.txt"));
    printf("binary.txt 大小：%ld 字节\n", file_size("binary.txt"));
    dump("text.txt");
    dump("binary.txt");
    return 0;
}
```
```output
内存里的字符数：4
text.txt   大小：6 字节
binary.txt 大小：4 字节
text.txt: 41 0D 0A 42 0D 0A
binary.txt: 41 0A 42 0A
```

同样 4 个字符，文本文件是 6 字节，二进制文件是 4 字节。把三份"同一句 `A\nB\n`"并排放在一起，差别就非常直观了（下面的"位置"是文件内偏移，不是真实内存地址）：

```memory title="同一份 A\nB\n：内存、文本文件、二进制文件的字节布局"
位置 | 字节 | 属于 | 说明
内存 [0] | 41 'A' | char 数组 | 程序里只存了一个换行字符 '\n'
内存 [1] | 0A '\n' | char 数组 | 换行在内存里就是一个字节 0x0A
内存 [2] | 42 'B' | char 数组 | 第二个字符
内存 [3] | 0A '\n' | char 数组 | 第二个换行
text.txt +0 | 41 'A' | 文本模式 "w" | 普通字符原样写出
text.txt +1 | 0D '\r' | 文本模式 "w" | 回车 CR：CRT 自动补上，源码里没有它
text.txt +2 | 0A '\n' | 文本模式 "w" | 原来的 LF 跟在 CR 后面
text.txt +3 | 42 'B' | 文本模式 "w" | 第二个字符
text.txt +4 | 0D '\r' | 文本模式 "w" | 第二个 CR
text.txt +5 | 0A '\n' | 文本模式 "w" | 第二个 LF，文件共 6 字节
binary.txt +0 | 41 'A' | 二进制模式 "wb" | 原样写出
binary.txt +1 | 0A '\n' | 二进制模式 "wb" | 没有 CR
binary.txt +2 | 42 'B' | 二进制模式 "wb" | 原样写出
binary.txt +3 | 0A '\n' | 二进制模式 "wb" | 文件共 4 字节
```

### 为什么文本模式要把 \n 写成 \r\n
这不是 C 语言规定的，而是**平台的历史包袱**。电传打字机的时代，两个控制字符各管一件事：

- `\r`（carriage return，`0x0D`）把打印头**移回行首**；
- `\n`（line feed，`0x0A`）把纸**向下走一行**。

要开始新的一行，必须**两个都发**：先回到行首，再下移一行。DOS 和 Windows 继承了"文件里的行尾是 CR LF"这个约定，而 C 语言的文本流又规定"一行以 `\n` 结尾"，于是 CRT（C 运行库）必须在两者之间做翻译：

```
程序看到的文本流：  'A' '\n' 'B' '\n'
                        ↓ 文本模式写出时 CRT 翻译
磁盘上的字节：      41 0D 0A 42 0D 0A
```

反过来读的时候，CRT 把 `0D 0A` 收成一个 `\n` 交给你。所以：

- 在 Windows 的文本模式里，你**永远看不到** `\r`（除非文件里有一个不跟 `\n` 的孤立 CR）；
- 在二进制模式里，`\r` 是普通字节，`fgets` 会把它一起读进缓冲区，行尾变成 `"\r\n"` 两个字符；
- 在 Linux 上，文本模式与二进制模式完全一样，`\n` 就是一个字节。

这也解释了一个常见困惑：**为什么同一个文本文件在 Windows 上比在 Linux 上大**。因为 Windows 版编辑器存盘时写的是 CRLF，而 Linux 版写的是 LF；文件里"行"的数量一样，字节数不一样。

### 读回来时发生了什么：ftell 也会跟着变
文本模式不是"只翻译写"，读的时候同样翻译。下面这个程序先手工写出一个 CRLF 文件（用二进制模式，保证磁盘上确实是 CRLF），再分别用文本模式和二进制模式读它：

```c run id=tb-read
#include <stdio.h>
#include <string.h>

static void read_as(const char *mode) {
    FILE *fp = fopen("crlf.txt", mode);
    if (fp == NULL) {
        return;
    }
    char line[8];
    printf("以 \"%s\" 打开：\n", mode);
    while (fgets(line, sizeof line, fp) != NULL) {
        printf("  ftell=%-2ld 收到 %zu 个字符:", ftell(fp), strlen(line));
        for (const char *p = line; *p != '\0'; p++) {
            printf(" %02X", (unsigned char)*p);
        }
        printf("\n");
    }
    fclose(fp);
}

int main(void) {
    FILE *fp = fopen("crlf.txt", "wb");       /* 手工写出 Windows 风格的 CRLF */
    if (fp == NULL) {
        return 1;
    }
    fputs("A\r\nB\r\n", fp);
    fclose(fp);

    read_as("r");                              /* 文本模式 */
    read_as("rb");                             /* 二进制模式 */
    return 0;
}
```
```output
以 "r" 打开：
  ftell=3  收到 2 个字符: 41 0A
  ftell=6  收到 2 个字符: 42 0A
以 "rb" 打开：
  ftell=3  收到 3 个字符: 41 0D 0A
  ftell=6  收到 3 个字符: 42 0D 0A
```

同一份文件、同样的两行，文本模式交给你的是 `"A\n"`（2 个字符），二进制模式交给你的是 `"A\r\n"`（3 个字符）；而 `ftell` 在两种模式下都返回 **3**——因为它报告的是**文件里的物理字节偏移**，不是"你读到了几个字符"。这个细节在「文件定位」里会展开：文本模式的 `ftell` 不能当字符计数器用。

### 0x1A 与真正的二进制数据
文本模式还有一个 DOS 时代留下的特殊行为：读到 `0x1A`（Ctrl+Z）时把它当成**文件结束**。这个字节在旧式文本文件里被用作 EOF 标记，现代 Windows 的 UCRT 仍然保留了这个兼容行为：

```c run id=tb-ctrlz
#include <stdio.h>

static int count_bytes(const char *mode) {
    FILE *fp = fopen("ctrlz.bin", mode);
    if (fp == NULL) {
        return -1;
    }
    int n = 0;
    while (fgetc(fp) != EOF) {
        n++;
    }
    fclose(fp);
    return n;
}

int main(void) {
    FILE *fp = fopen("ctrlz.bin", "wb");
    if (fp == NULL) {
        return 1;
    }
    fputc('X', fp);
    fputc(0x1A, fp);          /* Ctrl+Z */
    fputc('Y', fp);
    fclose(fp);

    printf("文本模式读到 %d 字节\n", count_bytes("r"));
    printf("二进制模式读到 %d 字节\n", count_bytes("rb"));
    return 0;
}
```
```output
文本模式读到 1 字节
二进制模式读到 3 字节
```

文件里明明有 3 个字节，文本模式只交给你 1 个——读到 `0x1A` 就认为"文件结束了"。在 Linux 上 `0x1A` 只是普通字节，所以这类 bug 往往在跨平台时才暴露。

更隐蔽的是**写**方向：文本模式会对 `fwrite` 写出的每一个 `0x0A` 做翻译，哪怕它是结构体或整数的一部分。下面把整数 `10`（小端字节 `0A 00 00 00`）分别用两种模式写入：

```c run id=tb-fwrite
#include <stdio.h>

static void dump(const char *path) {
    FILE *fp = fopen(path, "rb");
    if (fp == NULL) {
        return;
    }
    if (fseek(fp, 0, SEEK_END) != 0) {
        fclose(fp);
        return;
    }
    long n = ftell(fp);
    rewind(fp);
    printf("%s（%ld 字节）:", path, n);
    int c;
    while ((c = fgetc(fp)) != EOF) {
        printf(" %02X", (unsigned)c);
    }
    printf("\n");
    fclose(fp);
}

int main(void) {
    int value = 10;                        /* 小端：0A 00 00 00 */

    FILE *fp = fopen("text.bin", "w");
    if (fp == NULL) {
        return 1;
    }
    fwrite(&value, sizeof value, 1, fp);
    fclose(fp);

    fp = fopen("binary.bin", "wb");
    if (fp == NULL) {
        return 1;
    }
    fwrite(&value, sizeof value, 1, fp);
    fclose(fp);

    dump("text.bin");
    dump("binary.bin");
    return 0;
}
```
```output
text.bin（5 字节）: 0D 0A 00 00 00
binary.bin（4 字节）: 0A 00 00 00
```

文本模式把整数里的 `0A` 撑成了 `0D 0A`，4 字节的记录变成 5 字节，后续所有记录的偏移全部错位；如果再用文本模式读回来，`0D 0A` 被收成一个 `0A`，看起来"值没变"，但文件长度、记录边界、校验和都已经不一样了。**二进制数据必须用二进制模式**，这不是风格问题，是正确性问题。

### 怎么选、怎么验证
一条简单的判断标准：

| 文件里装的是 | 打开模式 | 理由 |
|---|---|---|
| 人读的文本：配置、日志、CSV、源码 | `"r"` / `"w"` / `"a"` | 让 Windows 工具看到它期待的 CRLF；`fgets` 读到的行尾干净 |
| 图片、音频、压缩包、可执行文件 | `"rb"` / `"wb"` | 一个字节都不能改；`0x1A` 不能当 EOF |
| 结构体 / 整数数组等定长记录 | `"rb"` / `"wb"` | 记录边界必须精确，`fread`/`fwrite` 按块读写 |
| 需要跨平台逐字节一致的数据 | `"rb"` / `"wb"` | 文本模式的翻译规则因平台而异 |

几个容易忽略的点：

- **`"b"` 不是"更安全的模式"**，它只是"不要翻译"。用 `"wb"` 写文本文件，在 Windows 上得到的是一份只有 LF 的文件；现代记事本能打开，但一些旧工具会把整份文件显示成一行。
- **二进制模式读文本文件要自己处理 `\r`**：`fgets` 会把 `\r` 留在缓冲区里，按 `\n` 切行后记得去掉行尾的 `\r`；文本模式则不需要。
- **`stdout` 也是文本流**：`printf("a\n")` 写到重定向文件时同样是 CRLF。判题器在比较输出时会统一换行符，所以你看不到差异；但如果你用 `fwrite` 往 `stdout` 写二进制数据，它也会被翻译——要逐字节输出，必须先把流切成二进制模式（Windows 上用 `_setmode`，不属于 C 标准）。
- **验证字节布局不要靠肉眼**：用二进制模式读回来打印十六进制，或者用系统工具。Windows PowerShell 可以 `Format-Hex .\text.txt`，Linux 可以 `od -An -tx1 text.txt`。

## 编译与运行

用 gcc 或 clang 都可以，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra modes.c -o modes
./modes
```

```bash
clang -std=c17 -Wall -Wextra modes.c -o modes
./modes
```

程序跑完后，用系统工具直接看磁盘上的字节，比在 C 里猜更可靠：

```powershell
Format-Hex .\text.txt
Format-Hex .\binary.txt
```

Linux/macOS 上等价的做法是：

```bash
od -An -tx1 text.txt
od -An -tx1 binary.txt
```

如果你想确认某个文件到底是 CRLF 还是 LF，不要用文本编辑器"感觉"，直接数字节：`0D 0A` 成对出现就是 CRLF，只有 `0A` 就是 LF。下一道题就会让你写一个这样的审计器。

## 常见错误

### 以为文本模式只翻译"自己写的换行"，不会碰 fwrite 的数据
翻译发生在字节层：`fwrite` 写出的结构体、整数、压缩数据里只要出现 `0x0A`，文本模式照样把它撑成 `0D 0A`。二进制数据一旦经过文本模式，长度和内容都可能被改变，而且往往不会立刻报错——直到记录错位、校验失败才暴露。

### 用文本模式读二进制文件，然后疑惑"文件为什么提前结束了"
文本模式读到 `0x1A` 就返回 EOF，读到 `0D 0A` 又会少一个字节。图片、压缩包、序列化数据里出现这两个字节组合是家常便饭，所以文本模式读二进制文件的结果一定是错的。判断标准很简单：这个文件是给程序解析的字节，还是给人读的行？前者一律加 `b`。

### 在 Linux 上开发、在 Windows 上运行，假设字节数不变
Linux 上文本模式和二进制模式没有区别，`\n` 就是一个字节；同一份代码搬到 Windows，文本模式会多出一倍的换行字节。凡是"用 `ftell` 算文件大小""按固定偏移定位""把文件长度写进文件头"的代码，都要在 Windows 上重新验证，或者干脆统一用二进制模式。

### 二进制模式读文本文件时忘了去掉行尾的 \r
二进制模式不会翻译，`fgets` 读到的 `"abc\r\n"` 里 `\r` 和 `\n` 都在。如果按 `\n` 切完行就直接比较字符串，`"abc\r"` 和 `"abc"` 永远不相等；如果随后又手工补一个 `\r\n` 写回去，就会得到 `\r\r\n`。正确做法是：要么用文本模式读，要么在二进制模式里显式剥离行尾的 `\r`。

## 客观题

### q-s6-text-vs-binary-1 single
在 Windows 上执行下面这段程序，`t.txt` 的字节数是多少？

```c
FILE *fp = fopen("t.txt", "w");
fputs("a\nb\n", fp);
fclose(fp);
```

- [x] 6 字节：两个 `\n` 各被写成 `0D 0A`，所以是 `61 0D 0A 62 0D 0A`
  > 正确。文本模式下 CRT 把每个 `0x0A` 翻译成 `0x0D 0x0A`：字符 `a`、`b` 各 1 字节，两个换行各 2 字节，合计 6 字节。这不是 C 标准规定的，而是 Windows 文本流的实现定义行为。
- [ ] 4 字节：`a\nb\n` 本来就是 4 个字符
  > 错。4 是**内存里**的字符数，也是二进制模式（`"wb"`）下磁盘上的字节数；文本模式会在写出时插入 CR，磁盘上不再是 4 字节。
- [ ] 8 字节：每个字符后面都补一个 `\r`
  > 错。CR 只在换行处插入，普通字符 `a`、`b` 原样写出。8 字节相当于把每个字符都当成行尾，明显不符合 CRLF 的规则。
- [ ] 无法确定：取决于磁盘的簇大小
  > 错。簇大小影响的是文件占用的磁盘空间，不是文件长度；`ftell`/文件属性报告的字节数由写入的字节决定，与簇大小无关。
