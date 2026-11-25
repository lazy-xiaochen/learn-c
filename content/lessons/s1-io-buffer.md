---
id: s1-io-buffer
---

## 讲解

### 输入先进入缓冲区
你在键盘上敲的字符不会立刻交给程序，而是先存进一块叫**输入缓冲区**的内存。直到你按下回车，这一整行（**包括回车产生的换行符 `\n`**）才一起进入缓冲区。之后 `scanf`、`getchar` 都是从缓冲区里**按顺序取字符**，取走的就没了，没取走的留给下一次读取。

把输入 `5⏎A⏎` 想象成缓冲区里的一串字符：

```memory title="输入 5 回车 A 回车 之后，缓冲区里的内容"
位置 | 字符 | 说明
0    | '5'  | 
1    | '\n' | 第一次回车
2    | 'A'  | 
3    | '\n' | 第二次回车
```

### %c 读到了残留的换行符
`%d` 读完 `5` 就停下了，**换行符还留在缓冲区里**。接下来的 `%c` 不会跳过空白，它老老实实地取走了那个 `\n`：

```c run id=leftover stdin="5\nA\n"
#include <stdio.h>

int main(void) {
    int n;
    char c;
    if (scanf("%d", &n) != 1) return 1;
    if (scanf("%c", &c) != 1) return 1;
    printf("n=%d，c 的编码是 %d\n", n, c);   /* 10 就是 '\n' */
    return 0;
}
```
```output
n=5，c 的编码是 10
```

解决办法是在 `%c` 前面加一个**空格**：`scanf(" %c", &c)`。格式串里的空格会匹配并跳过任意多个空白字符（空格、制表符、换行）：

```c run id=fixed stdin="5\nA\n"
#include <stdio.h>

int main(void) {
    int n;
    char c;
    if (scanf("%d", &n) != 1) return 1;
    if (scanf(" %c", &c) != 1) return 1;     /* 注意 %c 前面的空格 */
    printf("n=%d，c=%c\n", n, c);
    return 0;
}
```
```output
n=5，c=A
```

### 一次读一个字符：getchar 与 putchar
`getchar` 从缓冲区取走**一个**字符并返回它的编码，`putchar` 把一个字符写到屏幕上。两个配起来就是"边读边打印"：

```c run id=echo-line stdin="hello world\n"
#include <stdio.h>

int main(void) {
    int ch;
    while ((ch = getchar()) != '\n' && ch != EOF) {
        putchar(ch);          /* 读到一个就立刻打印一个 */
    }
    putchar('\n');            /* 上面吃掉的换行，我们自己补回来 */
    return 0;
}
```
```output
hello world
```

这个循环同时干了两件事：把整行**原样输出**，并且把这一行（包括结尾的换行符）从缓冲区里**取干净**——这正是后面"丢弃坏输入"要用的招式，只不过这里把字符打了出来，而不是丢掉。

注意最后那句 `putchar('\n')` 是自己补的：循环读到换行符就停下了，那个 `\n` 并没有被打印出来。不补的话，输出会和后面的提示符粘在同一行。

### 读取失败后，错误的输入还在缓冲区里
`scanf("%d", &x)` 遇到 `abc` 时匹配失败、返回 0，但 **`abc` 并没有被取走**。如果你写一个"读到正确为止"的循环：

```c
while (scanf("%d", &x) != 1) {
    printf("请重新输入：");     /* 下一次 scanf 又看到 abc，又失败……死循环 */
}
```

程序会无限输出提示。正确的做法是失败后**丢弃这一行剩下的字符**：

```c run id=discard stdin="abc\n42\n"
#include <stdio.h>

int main(void) {
    int x;
    while (scanf("%d", &x) != 1) {
        int ch;
        /* 一个一个取走字符，直到换行符或输入结束 */
        while ((ch = getchar()) != '\n' && ch != EOF) { }
        if (ch == EOF) return 1;          /* 已经没有输入了 */
        printf("不是整数，已丢弃这一行\n");
    }
    printf("读到 %d\n", x);
    return 0;
}
```
```output
不是整数，已丢弃这一行
读到 42
```

### getchar 返回的是 int
`getchar()` 读取一个字符并返回它的编码；没有输入时返回 `EOF`（通常是 -1）。它的返回类型是 **`int`**，因为它要能表示"所有 256 种字节值 + EOF"这 257 种情况，`char` 装不下。所以接收 `getchar` 返回值的变量必须是 `int`，否则可能把某个正常字符误认为 EOF，或者永远等不到 EOF。

### 不要用 fflush(stdin)
网上常见用 `fflush(stdin)` 清空输入缓冲区的写法。C 标准只定义了 `fflush` 对**输出**流的作用，对输入流使用它是**未定义行为**：在某些 Windows 编译器上碰巧有效，在 Linux 上则什么也不做。用上面的 getchar 循环才是可移植的写法。

### 读到输入结束：EOF
缓冲区读空了以后，`getchar` 会返回 `EOF`（end of file，通常是 -1）。这给了我们一个"把输入全部读完"的循环：

```c run id=count-chars stdin="abc\n"
#include <stdio.h>

int main(void) {
    int ch;
    int count = 0;
    while ((ch = getchar()) != EOF) {
        count++;
    }
    printf("一共读到 %d 个字符\n", count);
    return 0;
}
```
```output
一共读到 4 个字符
```

输出 4 而不是 3，因为行末的换行符**也是一个字符**：缓冲区里是 `a b c \n` 四个字节。初学者数字符时常常只数看得见的字母，忘了换行——这正是本节最想让你建立的习惯：**程序看到的是一串字节，不是屏幕上的几行字**。

平台喂给程序的输入是有限的，读完就自动结束；在终端里手动输入时，Windows 按 Ctrl+Z 再回车、Linux/macOS 按 Ctrl+D，才表示"没有更多输入了"。

### 输入函数怎么选
| 你想做的事 | 用哪个 | 会跳过前面的空白吗 | 遇到换行时 |
|---|---|---|---|
| 读一个整数 | `scanf("%d", &n)` | 会 | 把换行留在缓冲区 |
| 读一个字符，原样（空白也算） | `getchar()` 或 `scanf("%c", &c)` | 不会 | 直接读到 `'\n'` |
| 读一个字符，跳过前面的空白 | `scanf(" %c", &c)` | 会 | 读到下一个非空白字符 |
| 丢掉这一行剩下的内容 | `getchar` 循环 | — | 读到 `'\n'` 或 EOF 为止 |
| 一直读到输入结束 | `while ((ch = getchar()) != EOF)` | — | 读到 EOF 时退出 |

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra buf.c -o buf
printf '5\nA\n' | ./buf        # 用管道提供输入，方便反复测试（Linux/macOS/Git Bash）
```

## 常见错误

### 先 %d 后 %c，忘了跳过换行
`%c` 读到上一行留下的 `\n`。在 `%c` 前加空格：`" %c"`。

### 读取失败后不清理缓冲区就重试
会陷入死循环。失败后用 getchar 循环丢弃这一行。

### 用 char 接收 getchar 的返回值
`char ch = getchar();` 在 char 为无符号的平台上永远不等于 EOF（-1），在 char 为有符号的平台上遇到字节 0xFF 时又会误判为 EOF。用 `int ch`。

### 丢弃循环没有同时检查 EOF
`while (getchar() != '\n') { }` 在"输入里根本没有换行就结束了"的情况下会死循环：输入结束后 `getchar` 一直返回 EOF（-1），而 -1 永远不等于 `'\n'`，循环条件永远成立。条件必须同时判断两个出口：`while ((ch = getchar()) != '\n' && ch != EOF) { }`。

## 客观题

### q-s1-io-buffer-1 single
输入为两行：第一行 `12`，第二行 `x`。执行 `int n; char c; scanf("%d", &n); scanf("%c", &c);` 后，c 的值是：
- [ ] `'x'`
  > `%c` 不会跳过空白。第一行末尾的换行符还在缓冲区里，`%c` 先读到它。
- [x] `'\n'`
  > 正确。`%d` 读完 12 后停在换行符前，`%c` 取走的就是这个换行符。要读到 `x`，应写成 `scanf(" %c", &c)`。
- [ ] `'1'`
  > `1` 和 `2` 已经被 `%d` 作为整数 12 读走了。
- [ ] scanf 返回 0，c 没有被赋值
  > 换行符也是一个字符，`%c` 能成功读到它，返回 1。
