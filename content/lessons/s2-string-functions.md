---
id: s2-string-functions
---

## 讲解

### 四个函数的分工

`<string.h>` 里的这四个函数是 C 语言处理字符串的主力，先用一句话记住它们各自干什么：

| 函数 | 作用 | 返回值 | 会不会检查目标容量 |
|---|---|---|---|
| `strlen(s)` | 从 `s` 数到第一个 `'\0'`，返回字符个数（不含 `'\0'`） | `size_t` | 不涉及 |
| `strcpy(dst, src)` | 把 `src` 连同结尾的 `'\0'` 复制到 `dst` | `dst` | **不检查** |
| `strcat(dst, src)` | 从 `dst` 的 `'\0'` 处开始，把 `src` 连 `'\0'` 追加过去 | `dst` | **不检查** |
| `strcmp(a, b)` | 按字节比较字典序 | 负数 / 0 / 正数 | 不涉及 |

后两个"不检查目标容量"是 C 语言字符串库最大的坑，下一节「安全的字符串操作」专门解决它。这一节先把四个函数用对、并能亲手写出来。

### strlen：数到 `'\0'` 为止

`strlen` 的动作就是"从首地址开始一个字节一个字节往后数，直到看见 `'\0'`"。所以：

- `strlen("hello")` 是 5，`'\0'` 不算；
- `strlen("")` 是 0（第一个字节就是 `'\0'`）；
- 如果字符数组里没有 `'\0'`，`strlen` 会一直数到内存里碰巧出现 0 为止，结果是不可预测的，还可能越界。

注意 `strlen` 的返回类型是 `size_t`（无符号整数），打印要用 `%zu`。用 `%d` 在 64 位平台上可能输出错误的值。

### strcpy 与 strcat：复制与追加

`strcpy(dst, src)` 做的是"从 `src[0]` 开始逐字节复制，包括结尾的 `'\0'`，直到复制完 `'\0'` 为止"。`strcat(dst, src)` 先找到 `dst` 的结尾 `'\0'`，然后从那里开始把 `src` 的字节（含 `'\0'`）写过去。

这两个函数都返回目标地址 `dst`，所以可以嵌套使用，但更常见的用法是单独调用：

```c run id=four-functions
#include <stdio.h>
#include <string.h>

int main(void) {
    char dst[32];

    strcpy(dst, "hello");
    printf("strcpy 之后：%s，长度 %zu\n", dst, strlen(dst));

    strcat(dst, ", ");
    strcat(dst, "world");
    printf("strcat 之后：%s，长度 %zu\n", dst, strlen(dst));

    printf("sizeof dst = %zu\n", sizeof dst);   /* 32：缓冲区的容量，不是内容长度 */
    return 0;
}
```
```output
strcpy 之后：hello，长度 5
strcat 之后：hello, world，长度 12
sizeof dst = 32
```

`sizeof dst` 是 32（数组容量），`strlen(dst)` 是 12（内容长度）。两者永远不是一回事：数组可以比字符串大很多，字符串也可能因为没写 `'\0'` 而"超出"数组。

### strcmp：只依赖符号，不要依赖具体数值

`strcmp` 从第一个字节开始比较，遇到不同的字节就返回它们的差（按 `unsigned char` 解释）；如果一直相同，就比较到两个 `'\0'`，返回 0。标准只保证三件事：

- `a` 小于 `b` 时返回**负数**；
- 完全相同时返回 **0**；
- `a` 大于 `b` 时返回**正数**。

**标准没有规定负数一定是 -1**。本平台（UCRT）恰好返回 -1 / 0 / 1，换个库可能返回 `'a' - 'b'` 之类的差值。所以正确的写法是比较符号，而不是比较具体值：

```c run id=strcmp-sign
#include <stdio.h>
#include <string.h>

int main(void) {
    const char *a = "apple";
    const char *b = "banana";

    printf("apple < banana: %d\n", strcmp(a, b) < 0);
    printf("banana < apple: %d\n", strcmp(b, a) < 0);
    printf("apple == apple: %d\n", strcmp(a, "apple") == 0);

    int c = strcmp(a, b);
    printf("归一化成 -1 / 0 / 1：%d\n", c < 0 ? -1 : (c > 0 ? 1 : 0));
    return 0;
}
```
```output
apple < banana: 1
banana < apple: 0
apple == apple: 1
归一化成 -1 / 0 / 1：-1
```

比较的规则是"字典序"：先比第一个字符，谁小谁就小；第一个相同再比第二个，依此类推。因为是按字符编码比较，所以所有大写字母都排在小写字母前面（`'Z'` 是 90，`'a'` 是 97），这一点和"字母表顺序"不一样。

### 亲手实现一遍

库函数的实现其实只有几行。自己写一遍，就再也不会把它们当成黑盒了：

```c run id=my-versions
#include <stdio.h>

size_t my_strlen(const char *s) {
    size_t n = 0;
    while (s[n] != '\0') {
        n++;
    }
    return n;
}

char *my_strcpy(char *dst, const char *src) {
    char *p = dst;
    while ((*p = *src) != '\0') {      /* 先复制，再看是不是 '\0' */
        p++;
        src++;
    }
    return dst;                        /* 标准规定返回目标地址 */
}

int my_strcmp(const char *a, const char *b) {
    while (*a != '\0' && *a == *b) {
        a++;
        b++;
    }
    return (unsigned char)*a - (unsigned char)*b;
}

int main(void) {
    char buf[32];

    my_strcpy(buf, "hello");
    printf("%s 的长度是 %zu\n", buf, my_strlen(buf));
    printf("apple < banana 吗？%d\n", my_strcmp("apple", "banana") < 0);
    printf("abc 与 abc 相等吗？%d\n", my_strcmp("abc", "abc") == 0);
    return 0;
}
```
```output
hello 的长度是 5
apple < banana 吗？1
abc 与 abc 相等吗？1
```

三个细节值得注意：

1. `my_strcpy` 里的 `while ((*p = *src) != '\0')` 是"先赋值再判断"，复制到 `'\0'` 时条件为假、循环结束，而 `'\0'` 已经被写进去了——**结尾标记就是这样被复制过去的**。
2. `my_strcmp` 的循环条件是 `*a != '\0' && *a == *b`：一旦有字节不同就停下，或者一方先到结尾就停下。循环结束后直接返回差的符号即可。
3. 转成 `unsigned char` 再相减，是因为 `char` 在有些平台上是有符号的，字节值大于 127 的数会变成负数，比较结果就反了。

### 内存图：`strcat` 到底写在哪里

```memory title="char dst[16] = \"hi\"; 然后 strcat(dst, \" there\")（地址为示意值）"
地址        | 内容 | 变量 / 区域   | 说明
0x7ffd3000  | 'h'  | dst[0]（栈）  | 原来的内容
0x7ffd3001  | 'i'  | dst[1]（栈）  | 原来的内容
0x7ffd3002  | '\0' | dst[2]（栈）  | strcat 从这里开始写
0x7ffd3003  | ' '  | dst[3]（栈）  | 追加进来的空格
0x7ffd3004  | 't'  | dst[4]（栈）  | 追加
0x7ffd3005  | 'h'  | dst[5]（栈）  | 追加
0x7ffd3006  | 'e'  | dst[6]（栈）  | 追加
0x7ffd3007  | 'r'  | dst[7]（栈）  | 追加
0x7ffd3008  | 'e'  | dst[8]（栈）  | 追加
0x7ffd3009  | '\0' | dst[9]（栈）  | 新的结尾，追加结束
```

`dst` 一共有 16 个字节，现在只用了前 10 个（"hi there" 加 `'\0'`）。如果追加的内容超过容量，`strcat` 会继续往 `dst[16]` 之后的栈上写——它根本不知道缓冲区有多大。这就是缓冲区溢出，也是下一节的主题。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra strings.c -o strings
./strings
```

本平台用 Clang，命令等价：

```bash
clang -std=c17 -Wall -Wextra strings.c -o strings
./strings
```

`<string.h>` 必须包含，否则编译器不认识这些函数名。四个函数在标准里都有原型，参数写错（例如 `strlen(123)`）会在编译阶段就被发现。

## 常见错误

### 用 `==` 比较字符串
`==` 比较的是地址。两个内容相同的数组地址一定不同，所以永远得到"不相等"：
```c run id=eq-strings
#include <stdio.h>
#include <string.h>

int main(void) {
    char a[] = "abc";
    char b[] = "abc";
    const char *pa = a;
    const char *pb = b;

    printf("pa == pb ? %d\n", pa == pb);              /* 比地址 */
    printf("strcmp(a, b) == 0 ? %d\n", strcmp(a, b) == 0);   /* 比内容 */
    return 0;
}
```
```output
pa == pb ? 0
strcmp(a, b) == 0 ? 1
```

### 把 `strcmp` 的结果当布尔值直接判断
`if (strcmp(a, b)) { /* 这里进去表示"不相等" */ }`。因为相等时返回 0，而 0 在 C 里是假。想表达"相等"必须写 `strcmp(a, b) == 0`。另外也别写 `== 1`：标准只保证正数，不保证恰好是 1。

### `strcpy` / `strcat` 的目标装不下
它们都不检查目标容量。下面这段代码把 6 个字节（5 个字符 + `'\0'`）写进 5 字节的数组，越界写会破坏相邻内存：
```c run id=strcpy-overflow expect=RE
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[5];
    strcpy(buf, "hello");     /* 6 字节写进 5 字节的数组 */
    printf("%s\n", buf);
    return 0;
}
```
本平台会直接报"栈数组越界访问"。正确做法要么把目标开够（`char buf[6]` 以上），要么使用下一节的 `snprintf` / `strncat`。

### 忘记 `#include <string.h>`
`strcpy`、`strlen` 这些名字必须先用头文件声明。漏掉头文件时编译器会报"调用未声明的函数"：
```c run id=missing-header expect=CE
int main(void) {
    char buf[16];
    strcpy(buf, "hi");        /* 没有包含 <string.h> */
    return 0;
}
```

### 让 `strcat` 自己追加自己
`strcat(s, s)` 的源和目标重叠，标准没有定义行为（有些实现会死循环，有些会写坏内存）。要"重复拼接自己"，必须借助一个临时缓冲区，或者用 `strncat` 配合明确长度。

## 客观题

### q-s2-string-functions-1 single
要判断两个 `char` 数组里的字符串**内容**是否相同，下面哪种写法是正确的？

- [x] `if (strcmp(a, b) == 0) { /* 内容相同 */ }`
  > 正确。`strcmp` 比较内容，相等时返回 0，所以要判断"是否等于 0"。这是唯一可靠的写法。
- [ ] `if (a == b) { /* 内容相同 */ }`
  > `a == b` 比较的是两个数组的首地址，两个不同的数组地址一定不同，所以永远不会相等。
- [ ] `if (strcmp(a, b) == 1) { /* 内容相同 */ }`
  > 标准只保证相等时返回 0、不同时返回正数或负数，并不保证"不相等"恰好返回 1。本平台是 -1/0/1，换一个库就可能变。
- [ ] `if (sizeof a == sizeof b) { /* 内容相同 */ }`
  > `sizeof` 得到的是数组容量，和内容无关。两个容量相同但内容完全不同的数组会通过这个判断。
