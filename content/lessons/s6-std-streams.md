---
id: s6-std-streams
---

## 讲解

### 三个预先打开的 FILE *
程序一开始执行 `main` 的时候，C 运行库已经替你打开了三个流：

| 流 | 方向 | 默认去向 | 典型用途 |
|---|---|---|---|
| `stdin` | 读 | 键盘 / 重定向的输入文件 / 管道 | 读用户输入、读测试数据 |
| `stdout` | 写 | 终端 / 重定向的输出文件 / 管道 | 正常结果、正式输出 |
| `stderr` | 写 | 终端 / 重定向的错误文件 | 错误、警告、诊断信息 |

它们都是 `FILE *`，和 `fopen` 返回的东西是同一类型，可以传给任何接受 `FILE *` 的标准库函数：`fprintf(stdout, ...)` 与 `printf(...)` 等价，`fgets(buf, n, stdin)` 与 `gets` 的"安全版"是同一个东西，`fflush(stderr)` 也完全合法。

"标准流"这个身份不是 C 语言凭空规定的，而是**操作系统在进程启动时就已经接好的三个文件描述符**：0 号是输入，1 号是输出，2 号是错误。C 运行库只是把它们包装成 `FILE *`，并给它们起了名字。这也解释了一个关键事实：

> 程序**无法**从 `FILE *` 本身知道它连的是终端、文件还是管道。`stdout` 这个名字只说明"这是 1 号描述符的包装"，不说明 1 号描述符现在指向哪里。

所以"重定向"根本不需要改程序：shell 在启动程序之前把 1 号或 2 号描述符换成某个文件，程序里的 `stdout` / `stderr` 照常写，字节就落到新地方去了。

`stdout` 和 `stderr` 默认都连在终端上，看起来"都能打印"，但它们是**两个独立的流**，各有自己的缓冲区和去向。这个区别在重定向时会立刻显现。

### 为什么错误信息必须写 stderr
假设一个程序把正常结果和错误提示都写到 `stdout`：

```c
printf("结果: 42\n");
printf("警告: 输入里有 2 行被跳过\n");
```

在终端上看起来一切正常。但只要用户执行：

```bash
./prog > result.txt
```

`>` 只重定向 **1 号描述符**（`stdout`），于是 `result.txt` 里既有结果、又有警告，而终端上什么也看不到。如果这个程序在管道里：

```bash
./prog | grep 42
```

警告会变成 `grep` 的输入数据，被当成"结果"处理，甚至可能匹配到不该匹配的行。

把诊断信息写到 `stderr`，这两类问题同时消失：

- `> result.txt` 只带走正常结果，警告仍然出现在终端上，用户不会漏看；
- 管道只接管 `stdout`，`stderr` 仍然直通终端，错误不会被下游程序当成数据；
- `stderr` 默认**不完全缓冲**（本平台的 UCRT 上是无缓冲），即使程序随后崩溃、来不及刷新 `stdout`，已经写进 `stderr` 的错误也已经在终端上了。

下面这个程序把两类信息分开写。注意下面 `output` 块里**只有 stdout 的两行**——`stderr` 那一行走的是另一条通道，不会混进来：

```c run id=ss-three
#include <stdio.h>

int main(void) {
    printf("正常：处理了 3 条记录\n");
    fprintf(stderr, "错误：第 2 条记录缺少字段\n");
    printf("正常：结束\n");
    return 0;
}
```
```output
正常：处理了 3 条记录
正常：结束
```

想看 `stderr` 那一行，有两种办法：

```bash
./prog > out.txt          # out.txt 只有正常输出；错误仍然打印在终端
./prog 2> err.txt         # err.txt 里是错误；终端只有正常输出
./prog > out.txt 2>&1     # 两路合并进 out.txt（顺序可能受缓冲影响，见下一节）
```

这也是日志库通常把级别分开的原因：`INFO` 走 `stdout`（它是程序的产品），`WARN` / `ERROR` 走 `stderr`（它是给人和运维看的诊断）。一个 Unix 管道的下游只应该收到"产品"，不应该收到"抱怨"。

### 缓冲：printf 为什么不一定立刻出现
`printf` 不是直接调用操作系统的写文件接口。它先把格式化后的字节放进 `FILE *` 的用户态**缓冲区**，等缓冲区满了、遇到换行（行缓冲时）、调用 `fflush`、或者流被关闭时才真正写出去。这样做的原因是性能：一次系统调用的开销远大于一次内存拷贝，按块写比按字节写快得多。

C 标准只规定了三种缓冲模式，具体默认值由实现决定：

| 模式 | `setvbuf` 常量 | 什么时候真正写出 |
|---|---|---|
| 全缓冲 | `_IOFBF` | 缓冲区满、`fflush`、`fclose`、程序正常退出 |
| 行缓冲 | `_IOLBF` | 遇到 `\n`、缓冲区满、`fflush`、`fclose`、正常退出 |
| 无缓冲 | `_IONBF` | 每次写入都立刻交给操作系统 |

本平台（Windows + UCRT）的默认行为是：

- `stdout` 连**终端**时是行缓冲，所以 `printf("请输入：")` 后面即使没有换行，提示也会显示；
- `stdout` 被**重定向到文件或管道**时变成全缓冲，提示可能一直卡在缓冲区里，直到程序结束才出现；
- `stderr` 不是全缓冲（实测无缓冲），所以错误总是立刻可见；
- 其他用 `fopen` 打开的文件默认全缓冲。

这就是"在终端上跑得好好的，一重定向就丢提示"的根源：程序没变，`stdout` 的缓冲模式变了。同理，如果程序在 `printf` 之后崩溃（`abort`、段错误），全缓冲的 `stdout` 里还没刷出去的内容会**全部丢失**；而 `stderr` 上的错误已经写出去了。

下面的实验用两个普通文件对比"全缓冲"和"无缓冲"。注意：写进去的 `"A\n"` 在文本模式下是 3 个字节（`41 0D 0A`），所以大小是 3 而不是 2：

```c run id=ss-buffer
#include <stdio.h>

static long size_of(const char *path) {
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

int main(void) {
    FILE *buf = fopen("buffered.txt", "w");
    if (buf == NULL) {
        return 1;
    }
    fputs("A\n", buf);                           /* 先不 flush */
    printf("全缓冲：写入后、fflush 前，文件大小 = %ld\n", size_of("buffered.txt"));
    if (fflush(buf) != 0) {
        fclose(buf);
        return 1;
    }
    printf("全缓冲：fflush 之后，文件大小 = %ld\n", size_of("buffered.txt"));
    fclose(buf);

    FILE *unbuf = fopen("unbuffered.txt", "w");
    if (unbuf == NULL) {
        return 1;
    }
    if (setvbuf(unbuf, NULL, _IONBF, 0) != 0) {
        fclose(unbuf);
        return 1;
    }
    fputs("A\n", unbuf);
    printf("无缓冲：写入后（没有 fflush），文件大小 = %ld\n", size_of("unbuffered.txt"));
    fclose(unbuf);
    return 0;
}
```
```output
全缓冲：写入后、fflush 前，文件大小 = 0
全缓冲：fflush 之后，文件大小 = 3
无缓冲：写入后（没有 fflush），文件大小 = 3
```

`fflush(fp)` 的语义是"把用户态缓冲区里还没写出的数据推给操作系统"，返回 `0` 表示成功，`EOF` 表示失败。它**不保证数据已经落到磁盘**——那是 `fsync` / `FlushFileBuffers` 的职责。另一个常见误区是 `fflush(stdin)`：C 标准只定义了输出流（以及更新流）上的 `fflush`，对输入流使用它是未定义行为；想丢弃一行输入，应该用循环 `getchar` 读到 `\n`。

最后，`exit` / 从 `main` 返回会刷新并关闭所有还开着的流，所以正常结束不会丢数据；`abort` 和 `_exit` 不会刷新，缓冲区里的内容就没了。这也解释了为什么"程序崩溃前的最后一行日志"经常不出现。

### 重定向：shell 做的事和 freopen 做的事
重定向有两个层次，别混：

**第一层：shell 在启动程序之前换掉描述符。** 程序完全不知情，`stdout` / `stderr` 还是那两个 `FILE *`：

| 写法 | 效果 |
|---|---|
| `./prog > out.txt` | `stdout` → `out.txt`（覆盖），`stderr` 仍是终端 |
| `./prog >> out.txt` | `stdout` 追加到 `out.txt` |
| `./prog < in.txt` | `stdin` ← `in.txt` |
| `./prog 2> err.txt` | `stderr` → `err.txt`，`stdout` 仍是终端 |
| `./prog > out.txt 2>&1` | 先把 `stdout` 指向文件，再让 `stderr` 复制 `stdout` 的去向 → 两路都进文件 |
| `./prog 2>&1 > out.txt` | 先让 `stderr` 复制"当前"的 `stdout`（终端），再把 `stdout` 指向文件 → 错误仍在终端 |
| `./prog | grep x` | `stdout` 接进管道的写端，`stderr` 仍是终端 |

注意 `2>&1` 的顺序：它复制的是"**此刻** 1 号描述符指向的地方"，所以必须放在 `> out.txt` 之后才能让错误也进文件。这是 shell 的求值顺序，不是 C 的。

还有一个容易踩的坑：即使 `2>&1` 写对了，两路写进同一个文件的**先后顺序**也不一定等于代码里的顺序。`stdout` 全缓冲、`stderr` 无缓冲时，错误行可能先落盘，而更早的 `printf` 还在缓冲区里。要保证顺序，就在关键位置 `fflush(stdout)`，或者让两路都无缓冲。

**第二层：程序自己用 `freopen` 换掉标准流。** `freopen(path, mode, stream)` 会先关闭 `stream` 原来连的文件，再按 `mode` 打开 `path`，并让 `stream` 改指向它。它最常见的用途是竞赛/OJ 里的"从文件读输入"：

```c run id=ss-freopen
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("input.txt", "w");           /* 先准备一份输入文件 */
    if (fp == NULL) {
        return 1;
    }
    fprintf(fp, "3 4\n");
    fclose(fp);

    if (freopen("input.txt", "r", stdin) == NULL) {   /* 把 stdin 改接到文件 */
        return 1;
    }
    int a = 0;
    int b = 0;
    if (scanf("%d %d", &a, &b) != 2) {
        return 1;
    }
    printf("从 input.txt 读到 %d 和 %d，和 = %d\n", a, b, a + b);
    return 0;
}
```
```output
从 input.txt 读到 3 和 4，和 = 7
```

`freopen` 之后，原来的 `stdin`（终端或测试输入）已经被关闭，`scanf` 读的是文件；如果 `freopen` 失败会返回 `NULL`，原流的状态是未定义的，必须检查。对应的 `freopen("out.txt", "w", stdout)` 也常用，但要记住：**之后所有 `printf` 都进了文件**，连调试输出也一样，所以调试信息应该改走 `stderr`。

`freopen` 也能把 `stderr` 接到文件上。下面的实验顺便验证了"stderr 默认无缓冲"：刚写完、还没 `fflush`，文件里就已经有 3 个字节了：

```c run id=ss-stderr-file
#include <stdio.h>

static long size_of(const char *path) {
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

int main(void) {
    if (freopen("stderr.log", "w", stderr) == NULL) {
        return 1;
    }
    fprintf(stderr, "B\n");
    printf("stderr 重定向到 stderr.log 后，未 fflush 时文件大小 = %ld\n", size_of("stderr.log"));
    return 0;
}
```
```output
stderr 重定向到 stderr.log 后，未 fflush 时文件大小 = 3
```

## 编译与运行

用 gcc 或 clang 都可以，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra streams.c -o streams
./streams
```

```bash
clang -std=c17 -Wall -Wextra streams.c -o streams
./streams
```

观察重定向时，建议同时准备四个文件，跑完对比内容：

```bash
./streams > out.txt 2> err.txt
cat out.txt
cat err.txt
```

PowerShell 的写法略有不同（`2>` 仍然可用，合并用 `*>`）：

```powershell
.\streams.exe > out.txt 2> err.txt
Get-Content out.txt
Get-Content err.txt
```

如果输出顺序看起来"乱了"，先用 `fflush(stdout)` 排除缓冲因素，再检查 `2>&1` 的位置。调试缓冲问题时，可以临时把 `stdout` 设成无缓冲：

```c
setvbuf(stdout, NULL, _IONBF, 0);   /* 必须在任何输出之前调用 */
```

## 常见错误

### 把错误信息 printf 到 stdout
`printf("错误：...")` 写的是 `stdout`。用户一旦 `> out.txt` 或把程序接进管道，错误就被写进结果文件、或者变成下游程序的输入，屏幕上反而看不到。凡是"给人看的诊断"都应该用 `fprintf(stderr, ...)`；`stdout` 只放程序的正式产品。

### 以为 printf 的输出会立刻出现
`printf` 只写进用户态缓冲区。`stdout` 重定向到文件时是全缓冲，程序崩溃、调用 `abort`、或者 `_exit` 都会丢掉还没刷出的内容。需要"立刻可见"时，在关键行之后 `fflush(stdout)`；写日志时更应该直接写 `stderr`，它默认无缓冲。

### 用 fflush(stdin) 清输入缓冲区
C 标准没有定义 `fflush` 对输入流的行为，`fflush(stdin)` 在 Windows 上可能"碰巧"能用，在别的平台可能什么都不做，甚至报错。要丢弃当前行剩下的字符，用 `int c; while ((c = getchar()) != '\n' && c != EOF) { }`；要读取一行，用 `fgets`。

### 以为重定向之后程序还能知道输出去了哪里
`stdout` / `stderr` 只是 `FILE *`，程序无法从它们判断背后是终端、文件还是管道。如果程序的行为依赖"是不是终端"（比如决定要不要打印彩色、要不要显示进度条），必须查询底层描述符（Windows 的 `_isatty(_fileno(stdout))`，POSIX 的 `isatty(STDOUT_FILENO)`），而不是猜。反过来说，任何"我在终端上测过"的结论，都要在重定向之后再验证一遍。

### 把 2>&1 写在 > out.txt 前面
`./prog 2>&1 > out.txt` 的执行顺序是：先让 `stderr` 复制**当前**的 `stdout`（终端），再把 `stdout` 改到文件。结果错误仍然在终端，只有正常输出进了文件。要合并两路，正确的顺序是 `./prog > out.txt 2>&1`。

## 客观题

### q-s6-std-streams-1 single
程序 `prog` 里既有 `printf` 写的正常结果，也有 `fprintf(stderr, ...)` 写的错误信息。执行 `./prog > out.txt` 之后，下面哪种说法正确？

- [x] `out.txt` 里只有正常结果；错误信息仍然出现在终端上
  > 正确。`>` 只重定向 1 号描述符（`stdout`），`stderr` 仍然连着终端。这正是"错误要写 stderr"的最直接理由：用户把正常输出存进文件时，诊断信息不会被一起吞掉。
- [ ] `out.txt` 里同时有正常结果和错误信息，终端上什么都没有
  > 错。这需要写成 `./prog > out.txt 2>&1` 才会发生。单独的 `>` 不碰 2 号描述符，错误信息仍然走终端。
- [ ] 终端上同时有正常结果和错误信息，`out.txt` 是空的
  > 错。`>` 已经把 `stdout` 接到文件了，正常结果不会出现在终端；只有 `stderr` 留在终端。
- [ ] 取决于 `printf` 的缓冲模式：全缓冲时错误也进文件，行缓冲时错误留在终端
  > 错。缓冲模式影响的是"什么时候写"和"写到哪个描述符"，不改变"写到哪个描述符"。`stderr` 从一开始就没有被 `>` 重定向，无论 `stdout` 是哪种缓冲，错误都不会进 `out.txt`。
