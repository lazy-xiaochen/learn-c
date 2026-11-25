---
id: s2-sizeof-strlen
---

## 讲解

### `sizeof` 问的是"占多少内存"

`sizeof` 是一个**运算符**，不是函数。它回答的问题是：这个对象（或这个类型）在内存里占多少个字节。

- `sizeof(char)` 永远是 1（C 标准规定）；
- `sizeof(int)` 在常见平台上通常是 4；
- 对数组用 `sizeof`，得到的是**整个数组**的字节数，而不是元素个数。

`sizeof` 的结果类型是 `size_t`（无符号整数），打印时要用 `%zu`。除了变长数组以外，`sizeof` 的结果在编译期就确定，程序运行时不需要真的去数。

```c run id=literal
#include <stdio.h>
#include <string.h>

int main(void) {
    printf("sizeof(\"hello\") = %zu\n", sizeof("hello"));
    printf("strlen(\"hello\") = %zu\n", strlen("hello"));
    return 0;
}
```
```output
sizeof("hello") = 6
strlen("hello") = 5
```

`"hello"` 有 5 个可见字符，但它在内存里是 `h`、`e`、`l`、`l`、`o`、`'\0'` 共 6 个字节。`sizeof` 把这 6 个字节都算上；`strlen` 只数 `'\0'` 之前的字符，所以是 5。

### `strlen` 问的是"有几个字符"

`strlen` 是 `<string.h>` 里的函数，它从传入的地址开始，**一个字节一个字节往后数，直到遇见 `'\0'` 为止**，返回数到的字符数（不包括 `'\0'`）。

因为它必须真的去扫描内存，所以：

- 时间复杂度是 O(n)，字符串越长越慢；
- 它不关心数组容量，只关心 `'\0'` 在哪里；
- 如果内存里根本没有 `'\0'`，它会一直读下去——这是未定义行为。

```c run id=my-strlen
#include <stdio.h>

int my_strlen(const char *s) {
    int n = 0;
    while (s[n] != '\0') {
        n++;
    }
    return n;
}

int main(void) {
    char s[] = "hello";

    printf("my_strlen(s) = %d\n", my_strlen(s));
    printf("s[5] = %d\n", s[5]);
    return 0;
}
```
```output
my_strlen(s) = 5
s[5] = 0
```

这就是 `strlen` 的内部逻辑：下标一直加，直到碰到编码为 0 的字节。`s[5]` 是结束符，所以循环在 `n == 5` 时停下。

### 数组容量与字符串长度是两回事

```c
char a[] = "hi";       /* 数组大小由内容决定：3 字节 */
char b[10] = "hi";     /* 数组容量 10 字节，但字符串只有 2 个字符 */
```

`b` 里前 3 个字节是 `'h'`、`'i'`、`'\0'`，后面 7 个字节在部分初始化时被补成 0，但它们**不属于字符串**。`strlen(b)` 仍然是 2，`sizeof b` 是 10。

```c run id=array-capacity
#include <stdio.h>
#include <string.h>

int main(void) {
    char a[] = "hi";
    char b[10] = "hi";

    printf("sizeof a = %zu，strlen(a) = %zu\n", sizeof a, strlen(a));
    printf("sizeof b = %zu，strlen(b) = %zu\n", sizeof b, strlen(b));
    return 0;
}
```
```output
sizeof a = 3，strlen(a) = 2
sizeof b = 10，strlen(b) = 2
```

```memory title="char s[8] = \"cat\"; 的内存示意（地址仅为示意）"
地址   | 内容      | 变量  | 说明
0x1000 | 'c' (99)  | s[0] | 字符 c
0x1001 | 'a' (97)  | s[1] | 字符 a
0x1002 | 't' (116) | s[2] | 字符 t
0x1003 | '\0' (0)  | s[3] | strlen 在这里停，长度为 3
0x1004 | 0         | s[4] | 部分初始化补的 0
0x1005 | 0         | s[5] | 与 strlen 无关
0x1006 | 0         | s[6] | 与 strlen 无关
0x1007 | 0         | s[7] | 最后一个字节，sizeof s = 8
```

`s[3]` 之后全是 0，但 `strlen` 在 `s[3]` 就停了。如果之后用 `strcpy` 往 `s` 里写入更长的内容，`s[3]` 之后的旧字节也可能被覆盖——容量是 8，可长度只看第一个 `'\0'` 的位置。

### 数组名遇到 `sizeof` 不会退化成指针

在大多数表达式里，数组名会退化成"首元素地址"，但 `sizeof` 是例外之一：`sizeof a` 里的 `a` 仍然代表整个数组。这正是 `sizeof a / sizeof a[0]` 能求出元素个数的原因。

```c run id=pointer-size
#include <stdio.h>
#include <string.h>

int main(void) {
    const char *p = "hello";

    printf("sizeof p = %zu\n", sizeof p);
    printf("strlen(p) = %zu\n", strlen(p));
    return 0;
}
```
```output
sizeof p = 8
strlen(p) = 5
```

`p` 是一个**指针变量**，在 64 位平台上占 8 字节。`sizeof p` 得到的是指针本身的大小，和它指向的字符串有多长没有关系。指针和字符数组的区别，后面一章会详细讲。

### 数组传进函数之后，`sizeof` 只剩指针大小

数组作函数参数时，形参实际上是指针。所以在函数内部对"数组参数"用 `sizeof`，得到的是 8（指针大小），不是数组的字节数。

```c run id=function-param
#include <stdio.h>
#include <string.h>

static void report(const char *s) {
    printf("函数内 sizeof s = %zu，strlen(s) = %zu\n", sizeof s, strlen(s));
}

int main(void) {
    char line[10] = "hi";
    printf("main 里 sizeof line = %zu\n", sizeof line);
    report(line);
    return 0;
}
```
```output
main 里 sizeof line = 10
函数内 sizeof s = 8，strlen(s) = 2
```

所以"在函数里用 `sizeof` 求数组长度"是行不通的，必须把长度作为参数一起传进去（或者用 `strlen`，如果它确实是字符串）。

### `sizeof(s) - 1` 只在"数组正好装满"时等于 `strlen`

初学者常写 `sizeof(s) - 1` 来求字符数。这个写法只对**用字符串字面量初始化、且数组大小恰好等于内容长度 + 1**的数组成立：

```c run id=minus-one
#include <stdio.h>
#include <string.h>

int main(void) {
    char exact[] = "cat";    /* 4 字节，正好装满 */
    char roomy[20] = "cat";  /* 20 字节，用不完 */

    printf("exact: sizeof - 1 = %zu，strlen = %zu\n", sizeof exact - 1, strlen(exact));
    printf("roomy: sizeof - 1 = %zu，strlen = %zu\n", sizeof roomy - 1, strlen(roomy));
    return 0;
}
```
```output
exact: sizeof - 1 = 3，strlen = 3
roomy: sizeof - 1 = 19，strlen = 3
```

`roomy` 的 `sizeof - 1` 是 19，而实际长度只有 3。对数组来说，"容量"和"内容长度"没有任何必然关系，**求长度请用 `strlen`**（前提是它确实是合法字符串）。

### 该用哪一个

| 你想知道 | 用 |
|---|---|
| 这个数组/类型占多少字节 | `sizeof` |
| 这个字符串有几个字符（不含 `'\0'`） | `strlen` |
| 数组里能放多少个 `T` 类型元素 | `sizeof arr / sizeof arr[0]` |
| 复制这个字符串需要多少字节 | `strlen(s) + 1` |

最后一条尤其重要：分配空间或检查缓冲区时，**字符数 + 1** 才是包含结束符所需的字节数。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra size.c -o size
./size
```

本平台使用 Clang，等价命令：`clang -std=c17 -Wall -Wextra size.c -o size`。

两个细节：

- `sizeof` 和 `strlen` 的返回值都是 `size_t`，用 `printf("%zu", ...)` 打印，不要用 `%d`；
- 把 `strlen` 的结果存进 `int` 在字符串很长时可能溢出，需要和 `int` 比较时先想清楚类型（`-Wall -Wextra` 会对有符号/无符号比较给出警告）。

## 常见错误

### 用 `sizeof` 求字符串长度

```c
char s[100] = "hi";
printf("%zu\n", sizeof s);   /* 100，不是 2 */
```

`sizeof` 得到的是整个数组的容量，不是字符串长度。要字符数用 `strlen(s)`。

### 以为 `sizeof("hello")` 是 5

字符串字面量末尾隐含一个 `'\0'`，所以 `sizeof("hello")` 是 6。用 `strlen("hello")` 才是 5。

### 在函数里对数组参数用 `sizeof`

```c
void f(char s[]) {
    size_t n = sizeof s;   /* 8：这是指针大小 */
}
```

函数里的 `s` 已经是指针，`sizeof` 拿不到调用者的数组大小。把长度额外传进来。

### 对空指针或未终止的数组调用 `strlen`

`strlen(NULL)` 会直接崩溃；对一个没有 `'\0'` 的字符数组调用 `strlen`，它会越过数组末尾继续读，属于未定义行为。调用前必须确保参数是合法字符串。

### `sizeof` 和 `strlen` 混在同一个表达式里

```c
size_t n = sizeof(s) - strlen(s);
```

这算的是"容量减去内容长度"，不是"字符串长度"。类型本身没问题，但语义很容易被误读；写代码时先在注释里说清楚每个值代表什么。

## 客观题

### q-s2-sizeof-strlen-1 single

在 64 位平台上执行下面的代码，输出是：

```c
char s[20] = "abc";
printf("%zu %zu\n", sizeof s, strlen(s));
```

- [x] `20 3`
  > 正确。`sizeof s` 是数组容量 20 字节；`strlen(s)` 数到 `'\0'` 为止，是 3 个字符。
- [ ] `3 3`
  > `sizeof s` 不会因为字符串只有 3 个字符就变成 3，它始终是整个数组的字节数 20。
- [ ] `20 4`
  > 4 把结尾的 `'\0'` 也算进了长度；`strlen` 不统计结束符。
- [ ] `4 3`
  > 4 是 `"abc"` 加上 `'\0'` 的字节数（`sizeof("abc")`），不是数组 `s` 的容量。
