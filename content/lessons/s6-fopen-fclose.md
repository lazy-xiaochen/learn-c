---
id: s6-fopen-fclose
---

## 讲解

### FILE * 是"流"的句柄，不是文件本身
`fopen` 做的事比名字听起来多：它向操作系统申请打开文件，同时在 C 库里分配一个 **`FILE` 结构**（里面装着用户态缓冲区、当前位置、错误标志、文件结束标志），然后返回指向这个结构的指针。所以 `FILE *` 不是文件，也不是磁盘上的字节，而是"一条打开着的流"的句柄。

`FILE` 在标准里是**不透明类型**：你拿不到它的成员，只能通过 `fopen`/`fread`/`fclose` 这些函数间接操作。这条设计带来的第一个后果是：

> 打开失败时，`fopen` 唯一的信号是返回 **`NULL`**。没有"半开"的状态，也没有别的渠道能告诉你流的地址。

### 为什么 fopen 必须判 NULL
`fopen` 会失败的原因非常多：路径里的目录不存在、文件被别的进程独占、没有读权限、磁盘满、文件名太长、路径里有非法字符……这些都不是"程序写错了"，而是**运行环境**的问题——测试机、别人的电脑、CI 上都会遇到。两种写法的区别是：

```c
FILE *bad = fopen("no-such-dir/app.log", "r");
int c = fgetc(bad);              /* bad 是 NULL：解引用空指针，未定义行为 */

FILE *fp = fopen("no-such-dir/app.log", "r");
if (fp == NULL) {                /* 先判空：出错也只是走这条分支 */
    /* 处理失败：报错、用默认值、提前返回 */
}
```

不判空时，后续任何一个流函数都会拿着 `NULL` 去访问 `FILE` 结构的成员——地址 0 附近的那几个字节，轻则崩溃（`RE`），重则在某些平台上"看起来跑通了"，掩盖真正的错误。判空不是"防御性编程的洁癖"，而是**唯一能区分"打开了"和"没打开"的手段**。

判空之后通常还要告诉用户*为什么*失败，这就要用到 `errno` 与 `perror`：

```c run id=fopen-null
#include <errno.h>
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("no-such-dir/app.log", "r");
    if (fp == NULL) {
        printf("fopen 返回 NULL，errno = %d\n", errno);
        printf("本平台的 ENOENT 是 2：路径中的目录不存在\n");
        return 0;                 /* 失败路径正常退出，不继续用 fp */
    }
    printf("打开成功\n");
    fclose(fp);
    return 0;
}
```
```output
fopen 返回 NULL，errno = 2
本平台的 ENOENT 是 2：路径中的目录不存在
```

`errno` 只在函数**失败之后**才有意义（成功时不会被清零），所以判空和读 `errno` 必须紧挨着。想让系统替你翻译成人话就用 `perror("打开日志")`，它会往 `stderr` 打一行 `打开日志: No such file or directory`——注意这段文字随语言环境变化，程序里**不要**把它当成可比较的输出。

### 打开模式：r / w / a 与 "+"、"b"
六种基本模式的区别只有两条：**文件不存在时怎么办**、**打开后从哪里开始写**。

| 模式 | 文件不存在 | 已有内容 | 起始位置 | 能读 | 能写 |
|---|---|---|---|---|---|
| `"r"` | **失败，返回 NULL** | 保留 | 开头 | ✔ | ✘ |
| `"w"` | 创建 | **全部清空（截断为 0 字节）** | 开头 | ✘ | ✔ |
| `"a"` | 创建 | 保留 | 末尾（每次写都追加） | ✘ | ✔ |
| `"r+"` | 失败 | 保留 | 开头 | ✔ | ✔ |
| `"w+"` | 创建 | **全部清空** | 开头 | ✔ | ✔ |
| `"a+"` | 创建 | 保留 | 末尾（读可以从别处开始） | ✔ | ✔ |

`"w"` 的"截断"是最容易伤人的一条：它在你拿到指针的那一刻就把文件长度变成 0，哪怕你一个字节都没写。日志、配置、用户数据被"打开一下就没了"，几乎都是把 `"a"` 写成了 `"w"`。

"+ 模式"还有一条隐藏规则：**读和写不能随意交替**。C 标准要求在两个方向之间插入一次 `fseek`/`fsetpos`/`rewind`，或者在写之后 `fflush`；否则行为未定义。初学阶段建议"一个流只干一件事"，需要读写就开两次。

模式串里还可以带 `b`（如 `"rb"`、`"wb"`）。在 Windows 上它不是装饰：文本模式会把 `'\n'` 写成 `\r\n`、读时再还原，二进制模式则原样搬运。这一点在 `s6-binary-io` 里展开。

下面对同一个文件依次用三种模式打开，看内容怎样变化：

```c run id=fopen-modes
#include <stdio.h>

/* 以文本方式读整个文件，返回字符数：文本模式会把 \r\n 还原成 \n */
static int chars_of(const char *path) {
    FILE *fp = fopen(path, "r");
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
    FILE *fp = fopen("mode.log", "w");
    if (fp == NULL) {
        return 1;
    }
    fputs("line1\nline2\n", fp);
    fclose(fp);
    printf("\"w\" 写入两行后：%d 字符\n", chars_of("mode.log"));

    fp = fopen("mode.log", "a");
    if (fp == NULL) {
        return 1;
    }
    fputs("line3\n", fp);
    fclose(fp);
    printf("\"a\" 追加一行后：%d 字符\n", chars_of("mode.log"));

    fp = fopen("mode.log", "w");
    if (fp == NULL) {
        return 1;
    }
    fputs("new\n", fp);
    fclose(fp);
    printf("再用 \"w\" 打开并写一行后：%d 字符（旧内容被截断）\n", chars_of("mode.log"));

    fp = fopen("mode.log", "r");
    printf("\"r\" 打开已有文件：%s\n", fp == NULL ? "失败" : "成功");
    if (fp != NULL) {
        fclose(fp);
    }
    fp = fopen("missing.log", "r");
    printf("\"r\" 打开不存在的文件：%s\n", fp == NULL ? "返回 NULL" : "成功");
    if (fp != NULL) {
        fclose(fp);
    }
    return 0;
}
```
```output
"w" 写入两行后：12 字符
"a" 追加一行后：18 字符
再用 "w" 打开并写一行后：4 字符（旧内容被截断）
"r" 打开已有文件：成功
"r" 打开不存在的文件：返回 NULL
```

### fclose 才是"数据落盘"的时刻
写文件时，`fputs`/`fprintf` 通常只把数据复制进 `FILE` 的**用户态缓冲区**，并没有进磁盘。缓冲区满了才真正调用操作系统的 `write`。这个设计让"写 1 字节"不会变成"系统调用 1 次"，代价是：**不 `fclose` 就可能丢数据**。

`fclose` 做三件事：把缓冲区里剩下的数据刷出去、释放 `FILE` 结构、关闭操作系统句柄。下面这个程序在 `fclose` 之前用另一个流去读同一个文件，能看到缓冲区还没刷：

```c run id=fopen-buffer
#include <stdio.h>

int main(void) {
    FILE *out = fopen("buffer.log", "w");
    if (out == NULL) {
        return 1;
    }
    fputs("hello buffer\n", out);        /* 13 字节，远小于缓冲区，只进了内存 */

    FILE *in = fopen("buffer.log", "r");  /* 另一个流，读的是磁盘上的内容 */
    if (in == NULL) {
        fclose(out);
        return 1;
    }
    char buf[64];
    if (fgets(buf, sizeof buf, in) == NULL) {
        printf("fclose 之前读到：空（数据还在缓冲区里）\n");
    } else {
        printf("fclose 之前读到：%s", buf);
    }
    fclose(in);

    fclose(out);                          /* 缓冲区在这里才真正刷到磁盘 */

    in = fopen("buffer.log", "r");
    if (in == NULL) {
        return 1;
    }
    if (fgets(buf, sizeof buf, in) != NULL) {
        printf("fclose 之后读到：%s", buf);
    }
    fclose(in);
    return 0;
}
```
```output
fclose 之前读到：空（数据还在缓冲区里）
fclose 之后读到：hello buffer
```

`fclose` 的返回值也必须看：它返回 `0` 表示成功，返回 `EOF`（-1）表示**刷盘失败**（典型原因是磁盘写满）。这是你最后一次知道"数据没写进去"的机会，把它丢掉，程序就会带着一个不完整的文件报告成功：

```c
if (fclose(fp) != 0) {
    perror("写文件失败");
    return 1;
}
```

进程正常结束（`return 0` / `exit`）时 C 库会替你关闭所有还开着的流，所以"忘了 `fclose`"在简单程序里常常看不出问题；但一旦程序崩溃、被强制结束、或者随后立刻要读这个文件，缓冲区里的数据就永远丢了。**所有权规则**：谁 `fopen` 谁 `fclose`，函数里开的就在函数返回前关掉。

### 关闭之后：悬垂的 FILE * 与重复关闭
这里有一个和"指针"直接相关的陷阱。`fclose(fp)` 之后，`FILE` 结构已经被释放、句柄已经关闭，但 **`fp` 这个变量的值一点都没变**——它还是那个旧地址。也就是说：

- `fp` 现在是一个**悬垂指针**：指向已经被回收的内存；
- `fp == NULL` 是**假**的，所以"关闭后再判空"根本发现不了问题；
- 再对它调用 `fclose` 是**重复关闭**（double close），属于未定义行为；再调用 `fgetc` 是**使用已关闭的流**，同样是未定义行为。

```c run id=fopen-dangling
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("dangling.log", "w");
    if (fp == NULL) {
        return 1;
    }
    fputs("x\n", fp);
    fclose(fp);

    printf("fclose 之后 fp == NULL 吗？%s\n", fp == NULL ? "是" : "不是");
    printf("指针仍保存旧地址，所以判空拦不住重复关闭\n");

    fp = NULL;                    /* 唯一可靠的自保：关完立刻置空 */
    printf("自己置空之后再判空：%s\n", fp == NULL ? "是" : "不是");
    return 0;
}
```
```output
fclose 之后 fp == NULL 吗？不是
指针仍保存旧地址，所以判空拦不住重复关闭
自己置空之后再判空：是
```

实践中的写法是**把关闭包装成一个动作**，让"关闭"和"置空"永远一起发生：

```c run id=fopen-close-helper
#include <stdio.h>

/* 关闭并置空：传 FILE ** 才能改调用者手里的指针 */
static int close_file(FILE **pfp) {
    if (*pfp == NULL) {
        return 0;                    /* 已经关过或从没打开：什么都不做 */
    }
    FILE *fp = *pfp;
    *pfp = NULL;                     /* 先置空，避免 fclose 失败后留下悬垂指针 */
    return fclose(fp);
}

int main(void) {
    FILE *log = fopen("close-helper.log", "w");
    if (log == NULL) {
        return 1;
    }
    fputs("ok\n", log);
    printf("第一次关闭：%s\n", close_file(&log) == 0 ? "成功" : "失败");
    printf("第二次关闭：%s\n", close_file(&log) == 0 ? "什么也不做" : "失败");
    return 0;
}
```
```output
第一次关闭：成功
第二次关闭：什么也不做
```

## 编译与运行

用 gcc 或 clang 编译都可以，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra open.c -o open
./open
```

```bash
clang -std=c17 -Wall -Wextra open.c -o open
./open
```

几点说明：

- 例子里的文件名都是**相对路径**，程序在"当前工作目录"里创建和查找文件。双击运行时工作目录可能是别处，用命令行在脚本所在目录执行能避免"文件明明写了却找不到"；
- `-Wall -Wextra` 不会提醒你"没有检查 `fopen` 的返回值"，这条得靠自己养成习惯。本平台的静态检查会额外报告 `unchecked-fopen`；
- 想看 `fopen` 失败时的系统错误码，把 `perror` 换成 `printf("%d\n", errno)` 更稳定（错误文字随语言环境变化，不适合作为程序输出）；
- 文件被占用时（例如上一次运行的进程还没退出），Windows 上 `fopen(..., "w")` 可能直接失败——判空会立刻暴露它，不判空则表现为随机的崩溃。

## 常见错误

### 不检查 fopen 的返回值，直接读写
`fopen` 返回 `NULL` 时，任何流函数都等于拿空指针去访问 `FILE` 结构成员——这是未定义行为。这个错误在"文件恰好存在"的测试里完全看不到，一旦换一台机器、换一个目录就会出事。下面这段代码故意不判空：

```c run id=fopen-err-null
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("no-such-dir/app.log", "r");
    int c = fgetc(fp);           /* fp 是 NULL：未定义行为 */
    printf("fgetc 返回 %d\n", c);
    printf("程序没有崩溃，但一个字符也没读到\n");
    return 0;
}
```
```output
fgetc 返回 -1
程序没有崩溃，但一个字符也没读到
```

本平台的运行库把空指针挡在了库函数里，`fgetc` 直接返回 `EOF`，程序甚至正常退出——**这才是最危险的情况**：错误没有暴露成崩溃，而是变成"读到 -1、却当成读完了"的静默错误。换个运行库（例如 glibc）同样的代码会直接段错误。未定义行为的表现不可预测，不能靠"在我这台机器上没事"蒙混过去。

### 想追加日志却用 "w" 打开
`"w"` 在打开瞬间就把文件截断成 0 字节。日志程序的典型错误是：程序启动 → `fopen("app.log", "w")` → 历史日志全部消失。追加必须用 `"a"`。要"读旧内容再写新内容"也不能用 `"w+"` 图省事，因为它同样会先清空。

### 以为 fclose 只是"关一下"，可有可无
`fclose` 是"刷缓冲区 + 释放 + 关闭"的合体。忘了它，简单程序可能因为进程正常退出而被兜底；但程序一崩溃、或者紧接着要读这个文件（比如写完立刻回读统计行数），缓冲区里的数据就不在磁盘上，读到的就是旧文件。写完要回读，就**必须先 `fclose` 再重新 `fopen`**。

### fclose 之后继续使用同一个指针
`fclose` 不会把指针改成 `NULL`，所以"关闭 → 判空 → 再关闭"这套写法是无效的：第二次 `fclose` 传进去的仍是旧地址，属于重复关闭（未定义行为）。正确做法是 `fclose(fp); fp = NULL;`，或者用传 `FILE **` 的关闭函数把两件事绑在一起。

### 把 fopen 的成功当成"文件一定可读"
`fopen(path, "r")` 成功只说明"以读方式打开成功"，不保证文件里是你要的格式，也不保证长度。读完之后的 "读到了几条" 必须靠读取函数的返回值统计，而不是靠 `feof`（见 `s6-eof-error`）。

## 客观题

### q-s6-fopen-fclose-1 single
关于 `fopen` 的返回值与 `fclose` 之后的指针，下面哪一条说法是**正确**的？

- [x] `fopen` 失败时返回 `NULL`，必须在使用流之前判空；`fclose` 之后指针的值不会自动变成 `NULL`，所以还要自己置空
  > 正确。`NULL` 是 `fopen` 唯一的失败信号，不判空就会解引用空指针；`fclose` 只释放 `FILE` 结构和句柄，不会修改你手里的变量，指针因此变成悬垂指针，判空发现不了，重复关闭属于未定义行为。
- [ ] `fopen` 失败时会返回一个"无效的 FILE *"，只要不写入就不会出问题
  > 错。失败就是返回空指针 `NULL`，没有"无效但可用"的中间状态。对它调用任何流函数（包括读）都是解引用空指针。
- [ ] `fclose` 失败时返回 `EOF`，说明文件一定没关掉，应当再调用一次
  > 错。`fclose` 返回 `EOF` 表示**刷新缓冲区失败**（例如磁盘满），此时流已经被关闭、`FILE` 已经释放，再调用就是重复关闭。正确做法是报告错误，而不是重试。
- [ ] 用 `"w"` 打开一个已有文件后，只有真正写入时才会清空旧内容
  > 错。截断发生在 `fopen` 成功的那一刻，文件长度立刻变成 0；即使随后一个字节都不写，旧内容也已经没了。要保留旧内容只能用 `"a"`、`"r+"` 这类模式。
