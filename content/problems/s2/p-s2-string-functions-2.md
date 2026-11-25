---json
{
  "id": "p-s2-string-functions-2",
  "title": "按接口实现 my_strlen / my_strcpy / my_strcmp",
  "difficulty": "L3",
  "knowledgePoints": ["s2-string-functions"],
  "special": "ds-implementation",
  "judge": { "mode": "function", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
本题**不需要写 `main`**，只需要实现三个函数。头文件 `my_string.h`（见「测试驱动」）里已经声明好了它们：

```c
size_t my_strlen(const char *s);
char *my_strcpy(char *dst, const char *src);
int my_strcmp(const char *a, const char *b);
```

三个函数的行为必须和标准库的 `strlen` / `strcpy` / `strcmp` 完全一致：

- `my_strlen(s)`：从 `s` 开始数，数到第一个 `'\0'` 为止，返回字符个数（**不含** `'\0'`）。空字符串返回 0。
- `my_strcpy(dst, src)`：把 `src` 里的字符**连同结尾的 `'\0'`** 复制到 `dst`，返回 `dst`。调用者保证 `dst` 足够大。
- `my_strcmp(a, b)`：按字节比较字典序，`a < b` 返回负数，相等返回 0，`a > b` 返回正数。只要求**符号正确**，具体数值不限。

判题时有一个隐藏的 `main` 会读入若干字符串，分别调用你的三个函数并打印结果，你的实现是否正确由它的输出决定。它做的事是：

1. 读入整数 `n`，再读入 `n` 行字符串（**空行代表空字符串**，长度 0 到 60）；
2. 对每个字符串输出一行 `L <my_strlen 的结果>`；
3. 再依次把每个字符串用 `my_strcpy` 复制到**同一块**缓冲区，输出一行 `C <复制后的内容>`；
4. 最后对相邻的两个字符串调用 `my_strcmp`，把结果的符号归一化后输出一行 `S <-1/0/1>`。

注意第 3 步：缓冲区是**重复使用**的。如果 `my_strcpy` 忘了复制结尾的 `'\0'`，那么"先复制长的、再复制短的"时，缓冲区里会残留上一次的尾巴，`C` 那一行立刻就不对了。

## 输入格式
（由隐藏的 main 读取，写在这里方便你理解测试方式）

第一行一个整数 `n`；接下来 `n` 行，每行一个字符串（只含英文字母，可以为空行）。

## 输出格式
（由隐藏的 main 输出）

- `n` 行 `L <长度>`；
- `n` 行 `C <复制结果>`（空字符串时这一行只有 `C`）；
- `n - 1` 行 `S <-1/0/1>`。

## 数据范围
- 1 ≤ n ≤ 12；
- 每个字符串长度 0 ≤ len ≤ 60；
- 只包含英文字母（大小写都可能出现）；
- 调用 `my_strcpy` 时保证目标缓冲区足够大，这一点不用你操心。

## 示例
### 示例 1
```in
2
abc
abd
```
```out
L 3
L 3
C abc
C abd
S -1
```
> 两个字符串长度都是 3；复制结果分别是 `abc`、`abd`；`"abc" < "abd"`，所以 `S` 是 -1。

### 示例 2（边界：两个相同的单字符字符串）
```in
2
a
a
```
```out
L 1
L 1
C a
C a
S 0
```
> 长度都是 1（不含 `'\0'`）；完全相同的字符串比较结果为 0。

## 提示
### 第 1 层
三个函数都不需要额外数组，都是"从头往后扫一遍"：`my_strlen` 用一个计数器，`my_strcpy` 用一个目标游标，`my_strcmp` 用两个游标同时走。

### 第 2 层
`my_strcpy` 的核心是"复制到 `'\0'` 为止，并且把 `'\0'` 也复制过去"。可以写成先赋值再判断的形式：`while ((*p = *src) != '\0') { p++; src++; }`——当 `*src` 是 `'\0'` 时，这次赋值已经把 `'\0'` 写进目标了，然后条件为假、循环结束。

### 第 3 层
`my_strcmp` 先让两个游标同步前进，条件是"当前字节相同且不是 `'\0'`"；循环结束后两个游标所在字节就是第一处不同（或者都是 `'\0'`）。返回它们的差即可，例如 `(unsigned char)*a - (unsigned char)*b`。转成 `unsigned char` 是为了避免 `char` 有符号时高字节变成负数、把大小关系弄反。

## 参考代码
```c file=my_string.c
#include "my_string.h"

size_t my_strlen(const char *s) {
    size_t n = 0;
    while (s[n] != '\0') {
        n++;
    }
    return n;
}

char *my_strcpy(char *dst, const char *src) {
    char *p = dst;
    while ((*p = *src) != '\0') {      /* 先复制，再判断：'\0' 也会被写进去 */
        p++;
        src++;
    }
    return dst;
}

int my_strcmp(const char *a, const char *b) {
    const unsigned char *pa = (const unsigned char *)a;
    const unsigned char *pb = (const unsigned char *)b;

    while (*pa != '\0' && *pa == *pb) {
        pa++;
        pb++;
    }
    return (int)*pa - (int)*pb;
}
```

## 初始代码
```c file=my_string.c
#include "my_string.h"

size_t my_strlen(const char *s) {
    (void)s;
    return 0;
}

char *my_strcpy(char *dst, const char *src) {
    (void)src;
    return dst;
}

int my_strcmp(const char *a, const char *b) {
    (void)a;
    (void)b;
    return 0;
}
```

## 测试驱动
下面这个头文件是**给你看的接口**，请按它的签名实现函数，不要修改它：

```c file=my_string.h
#ifndef MY_STRING_H
#define MY_STRING_H

#include <stddef.h>

/* 返回 s 的长度：从头数到第一个 '\0' 为止，'\0' 本身不算。 */
size_t my_strlen(const char *s);

/* 把 src（连同结尾的 '\0'）复制到 dst，返回 dst。 */
char *my_strcpy(char *dst, const char *src);

/* 按字典序比较 a 和 b：a < b 返回负数，相等返回 0，a > b 返回正数。 */
int my_strcmp(const char *a, const char *b);

#endif
```

隐藏的测试驱动（你看不到，但它会和你的 `my_string.c` 一起编译）：

```c file=harness.c hidden
/* 隐藏的测试驱动：读入 n 个字符串，分别调用学习者写的三个函数并输出结果。 */
#include <stdio.h>
#include <string.h>

#include "my_string.h"

#define MAXN 12
#define MAXLEN 128

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }

    /* 吃掉第一行剩下的换行符：后面按行读取，空行代表空字符串 */
    int c;
    while ((c = getchar()) != '\n' && c != EOF) {
    }

    static char lines[MAXN][MAXLEN];
    for (int i = 0; i < n; i++) {
        if (fgets(lines[i], MAXLEN, stdin) == NULL) {
            lines[i][0] = '\0';
            continue;
        }
        size_t len = strlen(lines[i]);
        if (len > 0 && lines[i][len - 1] == '\n') {
            lines[i][len - 1] = '\0';
        }
    }

    /* 1) 长度 */
    for (int i = 0; i < n; i++) {
        printf("L %zu\n", my_strlen(lines[i]));
    }

    /* 2) 复制：反复用同一块缓冲区，忘记写 '\0' 会立刻暴露 */
    static char buf[MAXLEN];
    for (int i = 0; i < n; i++) {
        printf("C %s\n", my_strcpy(buf, lines[i]));
    }

    /* 3) 比较：只输出符号，所以返回值是 -1/1 还是字符码之差都可以 */
    for (int i = 0; i + 1 < n; i++) {
        int s = my_strcmp(lines[i], lines[i + 1]);
        printf("S %d\n", s < 0 ? -1 : (s > 0 ? 1 : 0));
    }
    return 0;
}
```

## 复杂度
时间 O(len)：每个函数都只扫描一遍字符串。
空间 O(1)：三个函数都不需要额外数组；`my_strlen` 的计数器、`my_strcpy` 的游标都是常数级开销。

## 常见错误
### `my_strcpy` 忘记复制结尾的 `'\0'` [WA]
只复制可见字符、不写 `'\0'`，在"先复制长的、再复制短的"时，缓冲区里会残留上一次的尾巴：复制完 `abcdef` 再复制 `xy`，得到的是 `xycdef`。
```c file=my_string.c expect=WA
#include "my_string.h"

size_t my_strlen(const char *s) {
    size_t n = 0;
    while (s[n] != '\0') {
        n++;
    }
    return n;
}

char *my_strcpy(char *dst, const char *src) {
    char *p = dst;
    while (*src != '\0') {        /* 错：遇到 '\0' 就退出，没有把它写进去 */
        *p++ = *src++;
    }
    return dst;
}

int my_strcmp(const char *a, const char *b) {
    const unsigned char *pa = (const unsigned char *)a;
    const unsigned char *pb = (const unsigned char *)b;
    while (*pa != '\0' && *pa == *pb) {
        pa++;
        pb++;
    }
    return (int)*pa - (int)*pb;
}
```

### `my_strlen` 里用 `sizeof` 求长度 [WA]
形参 `const char *s` 是一个指针，`sizeof s` 是 8，和字符串实际有多长毫无关系。所有字符串都会报成长度 8。
```c file=my_string.c expect=WA
#include "my_string.h"

size_t my_strlen(const char *s) {
    (void)s;
    return sizeof s;              /* 错：这是指针的大小 */
}

char *my_strcpy(char *dst, const char *src) {
    char *p = dst;
    while ((*p = *src) != '\0') {
        p++;
        src++;
    }
    return dst;
}

int my_strcmp(const char *a, const char *b) {
    const unsigned char *pa = (const unsigned char *)a;
    const unsigned char *pb = (const unsigned char *)b;
    while (*pa != '\0' && *pa == *pb) {
        pa++;
        pb++;
    }
    return (int)*pa - (int)*pb;
}
```

### `my_strcmp` 只比较第一个字符 [WA]
`*a == *b` 成立就直接返回 0，`abc` 与 `abd` 会被判成相等。必须"边相等边往后走"，直到发现不同或遇到 `'\0'`。
```c file=my_string.c expect=WA
#include "my_string.h"

size_t my_strlen(const char *s) {
    size_t n = 0;
    while (s[n] != '\0') {
        n++;
    }
    return n;
}

char *my_strcpy(char *dst, const char *src) {
    char *p = dst;
    while ((*p = *src) != '\0') {
        p++;
        src++;
    }
    return dst;
}

int my_strcmp(const char *a, const char *b) {
    if (*a == *b) {               /* 错：只看了第一个字符 */
        return 0;
    }
    return *a < *b ? -1 : 1;
}
```

### 函数签名与头文件不一致 [CE]
`my_string.h` 里声明的是 `size_t my_strlen(const char *s)`，实现时改成 `int` 就会与声明冲突，编译直接失败。
```c file=my_string.c expect=CE
#include "my_string.h"

int my_strlen(const char *s) {    /* 错：返回类型与头文件不一致 */
    int n = 0;
    while (s[n] != '\0') {
        n++;
    }
    return n;
}

char *my_strcpy(char *dst, const char *src) {
    char *p = dst;
    while ((*p = *src) != '\0') {
        p++;
        src++;
    }
    return dst;
}

int my_strcmp(const char *a, const char *b) {
    const unsigned char *pa = (const unsigned char *)a;
    const unsigned char *pb = (const unsigned char *)b;
    while (*pa != '\0' && *pa == *pb) {
        pa++;
        pb++;
    }
    return (int)*pa - (int)*pb;
}
```

### `my_strcmp` 直接相减有符号 `char` [WA]
`char` 在多数平台上是有符号的。字节值大于 127 的字符会被当成负数，大小关系就反了。标准要求按 `unsigned char` 比较，所以相减之前要转换。

## 测试用例
### 01 sample 示例 1
```in
2
abc
abd
```
```out
L 3
L 3
C abc
C abd
S -1
```

### 02 sample 示例 2
```in
2
a
a
```
```out
L 1
L 1
C a
C a
S 0
```

### 03 boundary 三个最长（60 字符）的字符串
```in
3
abcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghij
abcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghij
abcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghik
```
```out
L 60
L 60
L 60
C abcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghij
C abcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghij
C abcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghik
S 0
S -1
```

### 04 degenerate 只有一个字符串
```in
1
z
```
```out
L 1
C z
```
> 只有一个字符串时不会产生 `S` 行。

### 05 trap 先复制长的、再复制短的、最后复制空串
```in
3
abcdef
xy

```
```out
L 6
L 2
L 0
C abcdef
C xy
C
S -1
S 1
```
> 第二行 `xy` 复制进同一块缓冲区：如果 `my_strcpy` 不写 `'\0'`，这里会输出 `xycdef`。第三行是空字符串。

### 06 trap 前缀关系
```in
3
abc
abcd
abc
```
```out
L 3
L 4
L 3
C abc
C abcd
C abc
S -1
S 1
```

### 07 normal 有重复的单词
```in
3
apple
apple
banana
```
```out
L 5
L 5
L 6
C apple
C apple
C banana
S 0
S -1
```

### 08 trap 大写字母比小写字母小
```in
2
Zebra
apple
```
```out
L 5
L 5
C Zebra
C apple
S -1
```
> `'Z'` 的编码是 90，`'a'` 是 97，所以 `"Zebra" < "apple"`。按"字母表顺序"或忽略大小写去比较都会得到错误答案。
