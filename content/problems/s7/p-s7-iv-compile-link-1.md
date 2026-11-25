---json
{
  "id": "p-s7-iv-compile-link-1",
  "title": "修复链接失败的三文件字符串工具：长度、字符计数与反转",
  "difficulty": "L3",
  "knowledgePoints": ["s7-iv-compile-link"],
  "special": "link-diagnosis",
  "judge": { "mode": "multi", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
小工具工程由三个文件组成：

- `text.h`：字符串模块对外的接口——缓冲区容量宏、三个函数声明；
- `text.c`：这三个函数的**定义**；
- `main.c`：读入一个单词和一个字符，调用模块并打印结果。

可是这个工程现在**链接失败**了。请看编译器的报错，判断问题出在哪个文件、哪个环节，再动手修。三个文件都可以改，提交时全部参与编译。

### 先读懂这条报错
初始工程编译时，你会看到类似下面的信息：

```text
ld.lld: error: undefined symbol: text_length
>>> referenced by main.c:15
>>>               main.o:(main)
clang: error: linker command failed with exit code 1
```

这条报错的信息量很大：

- **`undefined symbol` / `undefined reference`**：链接器在所有目标文件里都找不到 `text_length` 这个**定义**；
- **`referenced by main.c:15`**：是 `main.c` 第 15 行**用到了**它（调用点），报错的位置不是问题所在；
- **阶段是链接**：编译阶段已经通过（`main.c` 看到了头文件里的声明，类型检查没问题），问题出在"把名字解析成地址"这一步。

所以排查方向和编译错误完全不同：**别看报错行，去所有 `.c` 里找"谁应该定义这个符号"**。本题的答案很简单——`text.c` 里定义的函数名和头文件里声明的名字**不是同一个**。

### 这个模块要做什么
- `text_length(s)`：返回字符串长度（不含结尾 `'\0'`）；
- `text_count(s, c)`：返回字符 `c` 在字符串中出现的次数（大小写敏感）；
- `text_reverse(s)`：**原地**反转字符串，并返回 `s`。

## 输入格式
第一行一个字符串：1 到 200 个**非空白**字符。
第二行一个字符 `c`：非空白字符（可能是字母、数字或标点）。

## 输出格式
输出三行：

```
len=字符串长度
count=字符 c 出现的次数
rev=反转后的字符串
```

## 数据范围
1 ≤ 字符串长度 ≤ 200
字符 `c` 一定是可打印的非空白字符。
缓冲区需要 201 字节（200 个字符 + 结尾的 `'\0'`），这是本题最容易踩的边界。

## 示例
### 示例 1
```in
hello
l
```
```out
len=5
count=2
rev=olleh
```
> `hello` 长 5，字符 `l` 出现 2 次（第 3、4 个字母），反转后是 `olleh`。初始工程在这里会直接链接失败；修好函数名之后这三行才是答案。

### 示例 2（边界：只有一个字符）
```in
a
a
```
```out
len=1
count=1
rev=a
```
> 长度为 1 的字符串反转后还是自己。这个用例同时检查两件事：`text_length` 不能把结尾的 `'\0'` 算进去；`text_reverse` 的循环上界是 `n / 2`，`n = 1` 时 `n / 2 = 0`，循环一次都不执行——如果写成 `i <= n / 2`，中间字符会被自己交换一次，结果碰巧还对，但换成偶数长度就会出错。

## 提示
### 第 1 层
先编译一次，把报错信息从头读到尾。它是 `undefined reference`、`duplicate symbol`，还是 `redefinition`？这三个词分别指向链接阶段"少了定义"、链接阶段"多了定义"、编译阶段"同一个文件里出现了两次定义"，处理方式完全不同。本题的第一条是 `undefined symbol: text_length`。

### 第 2 层
拿着符号名 `text_length` 逐个文件对照：`text.h` 里声明的是 `text_length`，`main.c` 调用的是 `text_length`，而 `text.c` 里写的函数名是 `text_len`——**声明、定义、调用三处的名字必须完全一致**。链接器只认名字，它不会猜"你是不是想写同一个函数"。

### 第 3 层
改对名字之后还有两个坑：

1. `main.c` 的缓冲区必须是 `char word[201]`，并且 `scanf` 用 `%200s` 限宽——200 个字符的单词还需要一个 `'\0'`，`char word[200]` 会栈溢出；
2. `text_reverse` 的循环是 `i < n / 2`，不是 `i < n`；反转两次等于没反转，这种 bug 在长度为 1 的例子上看不出来；
3. `text_count` 的来源参数必须是 `const char *`，别为了方便改成 `char *`。

## 参考代码
```c file=text.h
#ifndef TEXT_H
#define TEXT_H

#include <stddef.h>

/* 缓冲区容量：200 个字符 + 结尾的 '\0' */
#define TEXT_CAP 201

size_t text_length(const char *s);
int text_count(const char *s, char c);
char *text_reverse(char *s);

#endif
```

```c file=text.c
#include "text.h"

size_t text_length(const char *s) {
    size_t n = 0;
    while (s[n] != '\0') {
        n++;
    }
    return n;
}

int text_count(const char *s, char c) {
    int cnt = 0;
    for (size_t i = 0; s[i] != '\0'; i++) {
        if (s[i] == c) {
            cnt++;
        }
    }
    return cnt;
}

char *text_reverse(char *s) {
    size_t n = text_length(s);
    for (size_t i = 0; i < n / 2; i++) {
        char t = s[i];
        s[i] = s[n - 1 - i];
        s[n - 1 - i] = t;
    }
    return s;
}
```

```c file=main.c
#include <stdio.h>
#include "text.h"

int main(void) {
    char word[TEXT_CAP];
    char c;

    if (scanf("%200s", word) != 1) {
        return 0;
    }
    if (scanf(" %c", &c) != 1) {
        return 0;
    }

    printf("len=%zu\n", text_length(word));
    printf("count=%d\n", text_count(word, c));
    printf("rev=%s\n", text_reverse(word));
    return 0;
}
```

## 初始代码
```c file=text.h
#ifndef TEXT_H
#define TEXT_H

#include <stddef.h>

/* 缓冲区容量：200 个字符 + 结尾的 '\0' */
#define TEXT_CAP 201

size_t text_length(const char *s);
int text_count(const char *s, char c);
char *text_reverse(char *s);

#endif
```

```c file=text.c
#include "text.h"

size_t text_len(const char *s) {   /* TODO: 头文件里声明的名字是 text_length */
    size_t n = 0;
    while (s[n] != '\0') {
        n++;
    }
    return n;
}

int text_count(const char *s, char c) {
    int cnt = 0;
    for (size_t i = 0; s[i] != '\0'; i++) {
        if (s[i] == c) {
            cnt++;
        }
    }
    return cnt;
}

char *text_reverse(char *s) {
    size_t n = text_len(s);
    for (size_t i = 0; i < n / 2; i++) {
        char t = s[i];
        s[i] = s[n - 1 - i];
        s[n - 1 - i] = t;
    }
    return s;
}
```

```c file=main.c
#include <stdio.h>
#include "text.h"

int main(void) {
    char word[TEXT_CAP];
    char c;

    if (scanf("%200s", word) != 1) {
        return 0;
    }
    if (scanf(" %c", &c) != 1) {
        return 0;
    }

    printf("len=%zu\n", text_length(word));
    printf("count=%d\n", text_count(word, c));
    printf("rev=%s\n", text_reverse(word));
    return 0;
}
```

## 复杂度
时间 O(n)：`text_length` 扫一遍，`text_count` 扫一遍，`text_reverse` 扫半遍。
空间 O(1)：只用了几个下标和临时字符，字符串本身由 `main.c` 提供。

## 常见错误
### 把常量的定义写进头文件 [CE]
头文件被 `main.c` 和 `text.c` 同时包含，写成 `const int TEXT_CAP_LIMIT = 200;` 就等于在两个目标文件里各定义了一份同名强符号，链接器报 `duplicate symbol: TEXT_CAP_LIMIT`。**头文件里只能放声明**：常量用 `#define` 宏，变量用 `extern const int ...;` 并在某个 `.c` 里定义。

```c file=text.h expect=CE
#ifndef TEXT_H
#define TEXT_H

#include <stddef.h>

#define TEXT_CAP 201

/* 错：把常量的定义写进了头文件，每个包含它的 .c 都会定义一份 */
const int TEXT_CAP_LIMIT = 200;

size_t text_length(const char *s);
int text_count(const char *s, char c);
char *text_reverse(char *s);

#endif
```

### 函数名拼错，链接器找不到定义 [CE]
这是本题初始代码的错误：`text.c` 定义的是 `text_len`，而头文件和调用点用的是 `text_length`。链接器只按名字解析，`text_len` 是一份"没人用的定义"，`text_length` 是一处"找不到定义的引用"，于是报 `undefined symbol: text_length`。**正确做法是改定义的名字，而不是改调用点**——改调用点会连带删掉头文件里的声明，引出新的编译错误。

```c file=text.c expect=CE
#include "text.h"

size_t text_len(const char *s) {   /* 错：头文件里声明的名字是 text_length */
    size_t n = 0;
    while (s[n] != '\0') {
        n++;
    }
    return n;
}

int text_count(const char *s, char c) {
    int cnt = 0;
    for (size_t i = 0; s[i] != '\0'; i++) {
        if (s[i] == c) {
            cnt++;
        }
    }
    return cnt;
}

char *text_reverse(char *s) {
    size_t n = text_len(s);
    for (size_t i = 0; i < n / 2; i++) {
        char t = s[i];
        s[i] = s[n - 1 - i];
        s[n - 1 - i] = t;
    }
    return s;
}
```

### 反转循环写成 i < n，反转了两次 [WA]
`for (size_t i = 0; i < n; i++)` 会把每一对字符交换两次，结果等于没反转；长度为 1 时看不出问题，长度 2 以上全错。正确上界是 `n / 2`——只处理前一半，让后一半与之对称交换。

```c file=text.c expect=WA
#include "text.h"

size_t text_length(const char *s) {
    size_t n = 0;
    while (s[n] != '\0') {
        n++;
    }
    return n;
}

int text_count(const char *s, char c) {
    int cnt = 0;
    for (size_t i = 0; s[i] != '\0'; i++) {
        if (s[i] == c) {
            cnt++;
        }
    }
    return cnt;
}

char *text_reverse(char *s) {
    size_t n = text_length(s);
    for (size_t i = 0; i < n; i++) {       /* 错：交换了两遍，等于没反转 */
        char t = s[i];
        s[i] = s[n - 1 - i];
        s[n - 1 - i] = t;
    }
    return s;
}
```

### 缓冲区少算结尾的 '\0' [RE]
`scanf("%200s", word)` 最多写 200 个字符再加一个 `'\0'`，所以 `word` 至少要 201 字节。写成 `char word[200]` 时，200 个字符的单词会写 201 字节，ASan 报 `stack-buffer-overflow`。这类差一错误在短单词上永远看不出来，只有边界长度才暴露。

```c file=main.c expect=RE
#include <stdio.h>
#include "text.h"

int main(void) {
    char word[200];                /* 错：200 个字符的输入还需要一个 '\0' */
    char c;

    if (scanf("%200s", word) != 1) {
        return 0;
    }
    if (scanf(" %c", &c) != 1) {
        return 0;
    }

    printf("len=%zu\n", text_length(word));
    printf("count=%d\n", text_count(word, c));
    printf("rev=%s\n", text_reverse(word));
    return 0;
}
```

### 只改调用名，不改头文件 [CE]
把 `main.c` 里的 `text_length(...)` 改成 `text_len(...)`，看起来"和定义对上了"，但 `text.h` 里没有 `text_len` 的声明，C99 之后调用未声明的函数是编译错误（`implicit declaration of function`）。**声明、定义、调用三处的名字必须一致**；修链接错误应该改定义，而不是把调用点改成只有自己认识的名字。

## 测试用例
### 01 sample 示例 1
```in
hello
l
```
```out
len=5
count=2
rev=olleh
```

### 02 sample 示例 2
```in
a
a
```
```out
len=1
count=1
rev=a
```

### 03 degenerate 字符一次都不出现
```in
abc
z
```
```out
len=3
count=0
rev=cba
```

### 04 boundary 200 个字符的满长度
```in
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
A
```
```out
len=200
count=200
rev=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
```

### 05 trap 大小写敏感
```in
AaAa
a
```
```out
len=4
count=2
rev=aAaA
```

### 06 trap 全部相同字符，反转后不变
```in
aaaaa
a
```
```out
len=5
count=5
rev=aaaaa
```

### 07 normal 重复子串
```in
abcabc
b
```
```out
len=6
count=2
rev=cbacba
```

### 08 trap 数字与标点
```in
a1!a
!
```
```out
len=4
count=1
rev=a!1a
```

### 09 trap 偶数长度的中间两个字符
```in
abcd
c
```
```out
len=4
count=1
rev=dcba
```

### 生成 boundary 200 个随机小写字母
```js gen
const cases = [];

function render(word, c) {
  let count = 0;
  for (const ch of word) if (ch === c) count++;
  const rev = word.split('').reverse().join('');
  return `len=${word.length}\ncount=${count}\nrev=${rev}\n`;
}

/* 边界：满长度 200，字符随机，独立用 JS 计算期望值 */
{
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  let word = '';
  for (let i = 0; i < 200; i++) word += letters[rng.int(0, 25)];
  const c = letters[rng.int(0, 25)];
  cases.push({
    kind: 'boundary',
    category: '200 个随机小写字母',
    input: `${word}\n${c}\n`,
    output: render(word, c),
  });
}

/* 压力：200 个大小写与数字混合的字符 */
{
  const alphabet = 'abcXYZ0123456789';
  let word = '';
  for (let i = 0; i < 200; i++) word += alphabet[rng.int(0, alphabet.length - 1)];
  const c = alphabet[rng.int(0, alphabet.length - 1)];
  cases.push({
    kind: 'stress',
    category: '200 个大小写与数字混合的字符',
    input: `${word}\n${c}\n`,
    output: render(word, c),
  });
}

return cases;
```
