---
id: s2-string-io
---

## 讲解

### `scanf("%s")`：读到空白就停

`%s` 读的是"一个不含空白的字符串"。它从第一个非空白字符开始，一直读到下一个空格、制表符或换行符为止，然后在读到的内容后面**自动补上 `'\0'`**。所以它能读一个单词，但读不了一整行。

```c run id=scanf-two-words stdin="hello world\n"
#include <stdio.h>

int main(void) {
    char first[16];
    char second[16];

    if (scanf("%15s", first) != 1) {
        return 0;
    }
    if (scanf("%15s", second) != 1) {
        return 0;
    }

    printf("第一次读到：[%s]\n", first);
    printf("第二次读到：[%s]\n", second);
    return 0;
}
```
```output
第一次读到：[hello]
第二次读到：[world]
```

（本代码块的输入是 `hello world`。）第一个 `%s` 在空格处停下，空格留在输入缓冲区里；第二个 `%s` 先跳过空白，再读到 `world`。这也解释了为什么 `scanf("%s")` 读不了带空格的句子。

### 用 `%s` 一定要写宽度

`scanf` 不知道你的数组有多大。如果输入比数组长，它会毫不犹豫地写越界，这是缓冲区溢出，属于未定义行为。正确写法是在 `%` 和 `s` 之间写"最多读几个字符"，这个数字应当等于**数组长度减 1**（要留一个字节给 `'\0'`）。

```c run id=scanf-width stdin="abcdefghij\n"
#include <stdio.h>

int main(void) {
    char word[8];
    char rest[8];

    if (scanf("%7s", word) != 1) {
        return 0;
    }
    if (scanf("%7s", rest) != 1) {
        return 0;
    }

    printf("第一次最多读 7 个：[%s]\n", word);
    printf("缓冲区里还留着：[%s]\n", rest);
    return 0;
}
```
```output
第一次最多读 7 个：[abcdefg]
缓冲区里还留着：[hij]
```

（输入是 `abcdefghij`。）`%7s` 只取了前 7 个字符，剩下的 `hij` 留在缓冲区里，被第二次 `scanf` 读走。这既说明宽度限制生效了，也说明 `%s` 不会替你"扔掉多余输入"。

### `fgets`：一次读一整行，并且一定以 `'\0'` 结尾

```c
char *fgets(char *s, int size, FILE *stream);
```

它的规则是：

1. 最多读 `size - 1` 个字符；
2. 读到换行符就停止，**并且把换行符也存进数组**；
3. 读完后一定在末尾补 `'\0'`；
4. 如果还没读到任何字符就到文件末尾（或出错），返回 `NULL`。

因为换行符会被保留，所以用 `fgets` 读到的行通常以 `'\n'` 结尾。下面的程序把每个字节"翻译"出来看：

```c run id=fgets-keeps-newline stdin="hello world\n"
#include <stdio.h>

int main(void) {
    char line[32];
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }

    printf("逐个字节看：");
    for (int i = 0; line[i] != '\0'; i++) {
        if (line[i] == '\n') {
            printf("[换行]");
        } else {
            printf("%c", line[i]);
        }
    }
    printf("\n");
    return 0;
}
```
```output
逐个字节看：hello world[换行]
```

数组里的实际内容是这样的：

```memory title="char line[16]; 用 fgets 读入 \"hi there\" 之后（地址仅为示意）"
地址   | 内容  | 编码 | 变量
0x1000 | 'h'   | 104  | line[0]
0x1001 | 'i'   | 105  | line[1]
0x1002 | ' '   | 32   | line[2]
0x1003 | 't'   | 116  | line[3]
0x1004 | 'h'   | 104  | line[4]
0x1005 | 'e'   | 101  | line[5]
0x1006 | 'r'   | 114  | line[6]
0x1007 | 'e'   | 101  | line[7]
0x1008 | '\n'  | 10   | line[8]
0x1009 | '\0'  | 0    | line[9]
0x100a | 未使用 | ?    | line[10]
0x100f | 未使用 | ?    | line[15]
```

注意 `'\n'`（编码 10）是真实存在的一个字节，`'\0'` 在它后面。`strlen(line)` 会把换行也算进去，所以读入 `"hi there"` 后长度是 9 而不是 8。

### 去掉行尾换行符

最稳妥的写法是用 `strcspn` 找到第一个换行符的位置，把它改成 `'\0'`：

```c
line[strcspn(line, "\n")] = '\0';
```

`strcspn(line, "\n")` 返回"从开头到第一个换行符为止的字符数"。如果行里没有换行符（例如读到的是文件最后一行且它没有以换行结尾），它会返回 `strlen(line)`，正好指向末尾的 `'\0'`，把它改成 `'\0'` 不会破坏任何内容。

```c run id=strip-newline stdin="hi there\n"
#include <stdio.h>
#include <string.h>

int main(void) {
    char line[64];
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }

    line[strcspn(line, "\n")] = '\0';
    printf("内容：[%s]\n", line);
    printf("长度：%zu\n", strlen(line));
    return 0;
}
```
```output
内容：[hi there]
长度：8
```

也可以手写循环：`size_t len = strlen(line); if (len > 0 && line[len - 1] == '\n') line[len - 1] = '\0';`。关键是要先判断末尾确实是换行，不能无条件删掉最后一个字符。

### `fgets` 的截断：长行会分两次读

如果一行比缓冲区还长，`fgets` 只会读走 `size - 1` 个字符，剩下的部分留在输入里，下一次 `fgets` 会接着读。所以"一次 `fgets` 就是一行"只在行足够短时成立。

```c run id=fgets-truncate stdin="abcdefghij\n"
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[8];
    if (fgets(buf, sizeof buf, stdin) == NULL) {
        return 0;
    }
    buf[strcspn(buf, "\n")] = '\0';
    printf("第一次读到 %zu 个字符：[%s]\n", strlen(buf), buf);

    if (fgets(buf, sizeof buf, stdin) == NULL) {
        return 0;
    }
    buf[strcspn(buf, "\n")] = '\0';
    printf("第二次读到 %zu 个字符：[%s]\n", strlen(buf), buf);
    return 0;
}
```
```output
第一次读到 7 个字符：[abcdefg]
第二次读到 3 个字符：[hij]
```

缓冲区是 8 字节，所以第一次最多读 7 个字符。要读完整的行，缓冲区至少要有"最长行长度 + 2"个字节（一字节放换行、一字节放 `'\0'`）。

### `scanf` 和 `fgets` 混用的陷阱

`scanf("%d")` 读完数字后会**把换行符留在输入缓冲区里**。如果紧接着调用 `fgets`，它会立刻读到这个残留的换行，得到一个"空行"：

```c run id=scanf-then-fgets stdin="42\nhello\n"
#include <stdio.h>
#include <string.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }

    char line[32];
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    printf("第一次 fgets 读到 %zu 个字符\n", strlen(line));

    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    line[strcspn(line, "\n")] = '\0';
    printf("第二次 fgets 才读到：[%s]\n", line);
    return 0;
}
```
```output
第一次 fgets 读到 1 个字符
第二次 fgets 才读到：[hello]
```

解决办法有两个：要么在读完整行前后用 `getchar()` 把残留的换行吃掉，要么干脆用 `fgets` 读入整行、再用 `sscanf` 从这一行里解析数字。混用两种输入函数时，一定要清楚"缓冲区里还剩什么"。

### `puts`、`fputs` 与 `printf`

- `puts(s)`：输出字符串并**自动追加一个换行**；
- `fputs(s, stdout)`：输出字符串，**不追加换行**；
- `printf("%s", s)`：同样不追加换行，适合需要拼接格式的场合。

```c run id=puts-vs-printf
#include <stdio.h>

int main(void) {
    char s[] = "hello";

    printf("一、printf 不加换行：");
    printf("%s", s);
    printf("\n");

    printf("二、puts 自动加换行：\n");
    puts(s);

    printf("三、fputs 不加换行：");
    fputs(s, stdout);
    printf("\n");
    return 0;
}
```
```output
一、printf 不加换行：hello
二、puts 自动加换行：
hello
三、fputs 不加换行：hello
```

### 永远不要用 `gets`

`gets` 不接收缓冲区长度，输入多长它就写多长，**必然存在溢出风险**。它已经在 C11 标准里被删除，现代编译器会把 `gets` 当错误或给出严重警告。需要读一行就用 `fgets(buf, sizeof buf, stdin)`。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra io.c -o io
./io < input.txt
```

本平台使用 Clang，等价命令：`clang -std=c17 -Wall -Wextra io.c -o io`。

在命令行里手动测试时，可以先用 `printf 'hello world\n' | ./io` 把输入管道送给程序，避免反复敲键盘。带 `-Wall -Wextra` 编译时，`scanf("%s")` 不写宽度、`fgets` 返回值未检查等问题更容易被发现。

## 常见错误

### `scanf("%s")` 不限制宽度

```c
char name[8];
scanf("%s", name);   /* 输入超过 7 个字符就越界 */
```

数组只有 8 字节，最多只能安全地存 7 个字符加一个 `'\0'`。必须写成 `scanf("%7s", name)`，或者改用 `fgets`。

### `fgets` 之后忘记去掉换行

`fgets` 会把 `'\n'` 一起读进来，于是 `strcmp(line, "yes")` 永远不等于 0（因为实际内容是 `"yes\n"`），用 `%s` 打印时也会多出一个空行。读完 `fgets` 后应当立刻处理换行：`line[strcspn(line, "\n")] = '\0';`。

### 无条件删掉最后一个字符

```c
line[strlen(line) - 1] = '\0';   /* 最后一行没有换行时会误删正文 */
```

当输入的最后一行不以换行结尾时（文件末尾很常见），这样写会把真正的最后一个字符删掉。必须先判断 `line[len - 1] == '\n'` 再删。

### `scanf` 后直接 `fgets`，读到残留的换行

`scanf("%d")` 只读走数字，换行还留在缓冲区里，下一次 `fgets` 会把它当成一个空行。要么先用 `getchar()` 清掉换行，要么统一用 `fgets` 读行再用 `sscanf` 解析。

### 用 `gets` 读字符串

`gets` 无法限制读取长度，已从 C11 标准中删除。即使编译器还允许它，也不要用。

## 客观题

### q-s2-string-io-1 single

执行下面的代码，输入是 `abc` 加一个回车（`abc\n`）：

```c
char line[10];
fgets(line, sizeof line, stdin);
printf("%zu\n", strlen(line));
```

屏幕上的输出是：

- [x] `4`
  > 正确。`fgets` 把换行符也存进了数组，内容是 `a`、`b`、`c`、`\n`、`\0`，所以 `strlen` 是 4。
- [ ] `3`
  > 3 是正文 `abc` 的字符数。只有去掉换行之后才会得到 3。
- [ ] `10`
  > 10 是 `sizeof line`，也就是数组容量，不是字符串长度。
- [ ] `2`
  > 与本题无关。读入 `abc\n` 不会丢掉字符。
