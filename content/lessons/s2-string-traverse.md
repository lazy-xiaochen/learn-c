---
id: s2-string-traverse
---

## 讲解

### 遍历字符串：从下标 0 走到 `'\0'`

上一节说过，字符串就是"以 `'\0'` 结尾的字符数组"。所以遍历一个字符串的模板永远是：

```c
int i = 0;
while (s[i] != '\0') {
    /* 处理 s[i] */
    i++;
}
```

循环在 `s[i]` 变成 `'\0'` 时停止，此时 `i` 正好等于字符串长度（它指向结束符，而不是最后一个字符）。注意循环条件**不要**写成 `s[i] == 0` 之外的奇怪比较，也**不要**写成 `i <= 长度`——那会把结束符也当成一个普通字符处理。

```c run id=index-walk
#include <stdio.h>

int main(void) {
    char s[] = "abc";
    int i = 0;

    while (s[i] != '\0') {
        printf("s[%d] = '%c'\n", i, s[i]);
        i++;
    }
    printf("循环结束时 i = %d，s[%d] = %d\n", i, i, s[i]);
    return 0;
}
```
```output
s[0] = 'a'
s[1] = 'b'
s[2] = 'c'
循环结束时 i = 3，s[3] = 0
```

最后一行说明：`i` 停在 3，`s[3]` 是编码 0 的结束符。**可见字符只有 3 个，但数组里有 4 个字节。**

### 用 `for` 写更紧凑

把"初始化、条件、递增"三件事放进 `for` 里，循环体就只剩下真正要做的处理：

```c run id=count-vowels
#include <stdio.h>

int main(void) {
    char s[] = "string traversal";
    int vowels = 0;

    for (int i = 0; s[i] != '\0'; i++) {
        switch (s[i]) {
            case 'a': case 'e': case 'i': case 'o': case 'u':
                vowels++;
                break;
            default:
                break;
        }
    }

    printf("元音字母有 %d 个\n", vowels);
    return 0;
}
```
```output
元音字母有 4 个
```

`string traversal` 里有 `i`、`a`、`e`、`a` 四个元音。这个例子只处理小写；如果想同时统计大写，可以先把字符转成小写再判断，或者调用 `<ctype.h>` 里的函数。

### `<ctype.h>`：现成的字符分类函数

自己在循环里写 `c >= 'a' && c <= 'z'` 当然可以，但标准库已经把常见判断封装好了：

| 函数 | 判断什么 | 例子 |
|---|---|---|
| `isalpha(c)` | 字母（`a`–`z`、`A`–`Z`） | `isalpha('Q')` 为真 |
| `isdigit(c)` | 数字字符 `0`–`9` | `isdigit('7')` 为真，`isdigit('x')` 为假 |
| `isspace(c)` | 空白（空格、`\n`、`\t` 等） | `isspace('\n')` 为真 |
| `isalnum(c)` | 字母或数字 | `isalnum('#')` 为假 |
| `isupper(c)` / `islower(c)` | 大写 / 小写字母 | `isupper('A')` 为真 |
| `isprint(c)` | 可打印字符 | 空格算可打印 |
| `isxdigit(c)` | 十六进制数字 | `isxdigit('f')` 为真 |

两个容易忽略的细节：

1. 这些函数返回的是 **int**，含义是"真/假"，但不保证真值恰好是 1，所以不要写 `if (isalpha(c) == 1)`，直接写 `if (isalpha(c))`。
2. 参数类型是 `int`，但标准要求它的值要么是 `EOF`，要么能表示成 `unsigned char`。`char` 在有些平台是有符号的，遇到编码大于 127 的字节会变成负数，直接传进去是未定义行为。**正确写法是先转 `unsigned char`**：`isalpha((unsigned char)s[i])`。

```c run id=ctype-count
#include <stdio.h>
#include <ctype.h>

int main(void) {
    char s[] = "Hello, C 2026!";
    int letters = 0;
    int digits = 0;
    int spaces = 0;
    int others = 0;

    for (int i = 0; s[i] != '\0'; i++) {
        unsigned char c = (unsigned char)s[i];
        if (isalpha(c)) {
            letters++;
        } else if (isdigit(c)) {
            digits++;
        } else if (isspace(c)) {
            spaces++;
        } else {
            others++;
        }
    }

    printf("字母 %d 个，数字 %d 个，空白 %d 个，其他 %d 个\n",
           letters, digits, spaces, others);
    return 0;
}
```
```output
字母 6 个，数字 4 个，空白 2 个，其他 2 个
```

注意这里用的是 `else if` 链：一个字符只会被归入一个类别，不会重复计数。顺序也有讲究——先判断字母，再判断数字，最后才落到"其他"。

### 大小写转换：`toupper` 与 `tolower`

这两个函数接收一个字符，返回转换后的字符。关键点是：**它们不修改原字符**，返回值必须自己存回去。

```c run id=toupper-demo
#include <stdio.h>
#include <ctype.h>

int main(void) {
    char s[] = "C is fun 42!";

    for (int i = 0; s[i] != '\0'; i++) {
        s[i] = (char)toupper((unsigned char)s[i]);
    }

    printf("%s\n", s);
    printf("toupper('a') = %c，tolower('A') = %c\n", toupper('a'), tolower('A'));
    return 0;
}
```
```output
C IS FUN 42!
toupper('a') = A，tolower('A') = a
```

`s[i] = (char)toupper(...)` 里的强制转换只是为了消除"int 转 char"的提示；对于 ASCII 字符，转换结果是安全的。数字和标点不是字母，`toupper` 会把它们原样返回。

### 用状态机数单词

"单词"通常定义为"一段连续的、非空白字符"。要数单词，不能简单地数空格——开头可能有空格、单词之间可能有多个空格。正确做法是维护一个状态：**当前是否处在一个单词内部**。

- 遇到空白：把 `in_word` 置 0；
- 遇到非空白，且之前不在单词内：说明发现了一个新单词，计数加 1，并把 `in_word` 置 1；
- 遇到非空白，且已经在单词内：什么都不做。

```c run id=word-count
#include <stdio.h>
#include <ctype.h>

int main(void) {
    char s[] = "  the quick  brown fox ";
    int words = 0;
    int in_word = 0;

    for (int i = 0; s[i] != '\0'; i++) {
        if (isspace((unsigned char)s[i])) {
            in_word = 0;
        } else if (!in_word) {
            in_word = 1;
            words++;
        }
    }

    printf("单词数：%d\n", words);
    return 0;
}
```
```output
单词数：4
```

开头两个空格和中间两个连续空格都没有造成多计数，这正是状态机比"数空格"可靠的地方。

### 回文：左右两个下标向中间走

判断回文可以用双下标：`left` 从 0 往右，`right` 从最后一个字符往左，每次比较一对字符，相同就继续，不同就结束。

```c run id=palindrome
#include <stdio.h>
#include <ctype.h>
#include <string.h>

int main(void) {
    char s[] = "Level";
    int left = 0;
    int right = (int)strlen(s) - 1;
    int ok = 1;

    while (left < right) {
        if (tolower((unsigned char)s[left]) != tolower((unsigned char)s[right])) {
            ok = 0;
            break;
        }
        left++;
        right--;
    }

    printf("%s\n", ok ? "是回文" : "不是回文");
    return 0;
}
```
```output
是回文
```

`while (left < right)` 而不是 `<=`：当两个下标相遇时，中间只剩下一个字符（或没有字符），它和自己比较必然相等，不需要再比。`Level` 首字母大写，所以比较时用 `tolower` 统一成小写。

### 遍历时的三条安全线

1. **只处理到 `'\0'` 之前**：循环条件写 `s[i] != '\0'`，别用 `i <= strlen(s)`。
2. **不要在循环里反复求长度**：`for (i = 0; i < strlen(s); i++)` 每轮都扫一遍字符串，复杂度会从 O(n) 变成 O(n²)。要么用 `s[i] != '\0'`，要么先算一次 `size_t len = strlen(s);`。
3. **空字符串要单独想清楚**：`strlen(s) - 1` 在长度为 0 时会下溢成巨大的无符号数，拿它当下标就是越界。先用 `if (len == 0)` 处理空串。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra traverse.c -o traverse
./traverse
```

本平台使用 Clang，等价命令：`clang -std=c17 -Wall -Wextra traverse.c -o traverse`。

`-Wall -Wextra` 会提示"有符号与无符号比较"（例如 `int i` 和 `size_t len` 比较）以及"函数返回值未使用"（例如调用了 `toupper` 却没接收返回值）。看到这类警告不要忽略，它们往往指向真实的逻辑问题。

## 常见错误

### 循环条件写成 `i <= strlen(s)`，把结束符也处理了

```c
for (int i = 0; i <= (int)strlen(s); i++) {
    if (!isalnum((unsigned char)s[i])) others++;   /* '\0' 也被算进"其他" */
}
```

当 `i` 等于长度时，`s[i]` 是 `'\0'`，它不是可见字符，不应该参与统计。条件应当是 `s[i] != '\0'`。

### 在循环条件里反复调用 `strlen`

```c
for (int i = 0; i < (int)strlen(s); i++) { ... }   /* O(n²) */
```

每次循环都从头数一遍长度，字符串一长就明显变慢。用 `s[i] != '\0'` 或提前保存长度即可。

### 把 `char` 直接传给 ctype 函数

```c
if (isalpha(s[i])) { ... }   /* s[i] 为负时是未定义行为 */
```

当字节值大于 127 且 `char` 有符号时，`s[i]` 是负数。标准只保证 `EOF` 和 `unsigned char` 范围内的值合法。正确写法：`isalpha((unsigned char)s[i])`。

### 以为 `toupper` 会修改原字符

```c
toupper(s[i]);   /* 返回值被丢弃，s 没有任何变化 */
```

`toupper` 和 `tolower` 都是"返回转换结果"，不是"原地修改"。要写 `s[i] = (char)toupper((unsigned char)s[i]);`。

### 用 `size_t` 保存 `strlen(s) - 1`

字符串为空时，`strlen(s)` 是 0，`strlen(s) - 1` 在无符号类型中会回绕成一个极大值（`SIZE_MAX`），拿它当 `right` 下标会立刻越界。空串要单独处理。

## 客观题

### q-s2-string-traverse-1 single

执行下面的代码，输出是：

```c
char s[] = "a1 b2";
int count = 0;
for (int i = 0; s[i] != '\0'; i++) {
    if (isdigit((unsigned char)s[i])) {
        count++;
    }
}
printf("%d\n", count);
```

- [x] `2`
  > 正确。字符串里有 `1` 和 `2` 两个数字字符，空格和字母都不计入。
- [ ] `4`
  > 4 是字母和数字的总数（`a`、`1`、`b`、`2`），`isdigit` 只统计其中的数字，不应该把字母算进来。
- [ ] `1`
  > 只有 `1` 是数字，漏掉了 `2`；循环会一直走到 `'\0'`，两个数字都会被检查到。
- [ ] `5`
  > 5 是包括了空格和字母的字符总数，不是数字字符的个数。
