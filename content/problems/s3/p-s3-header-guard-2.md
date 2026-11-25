---json
{
  "id": "p-s3-header-guard-2",
  "title": "三文件字符串工具模块：统计一行里的字母、数字、空白与其他字符",
  "difficulty": "L3",
  "knowledgePoints": ["s3-header-guard"],
  "special": null,
  "judge": { "mode": "multi", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个文本处理小工程把"逐字符统计"拆成了独立模块：

- `text.h`：模块接口。它带完整的头文件卫士，并且用宏 `TEXT_LINE_MAX` 声明了行缓冲区的长度；
- `text.c`：四个统计函数的实现；
- `main.c`：用 `fgets` 读入一整行，调用四个函数并打印结果。

需要统计的四类字符：

- `letters`：字母（`isalpha`）；
- `digits`：数字（`isdigit`）；
- `spaces`：空白字符（`isspace`，包括空格和制表符）；
- `other`：其余所有字符（标点、符号等）。

**行尾的换行符不算任何一类字符**，统计前必须把它去掉。`fgets` 会把换行符一起读进缓冲区，这是本题最容易踩的坑。

模块的接口不要改：

```c
int text_letters(const char *s);
int text_digits(const char *s);
int text_spaces(const char *s);
int text_other(const char *s);
```

## 输入格式
一行文本，长度 0 到 1000 个字符，由可见 ASCII 字符（字母、数字、空格、标点）组成，行尾可能有换行符，也可能直接结束（EOF）。
空行是合法输入。

## 输出格式
输出四行：

```
letters=字母个数
digits=数字个数
spaces=空白字符个数
other=其他字符个数
```

## 数据范围
0 ≤ 行长 ≤ 1000

缓冲区长度由 `TEXT_LINE_MAX` 给出（1002 = 1000 个字符 + 换行符 + 字符串结尾的 `'\0'`）。**不要自己拍一个刚好 1000 的长度**：`fgets` 最多只读 `size - 1` 个字符，缓冲区不够就会把最后一个字符截掉。

## 示例
### 示例 1
```in
Hello World 123
```
```out
letters=10
digits=3
spaces=2
other=0
```
> `Hello` 和 `World` 共 10 个字母，`123` 是 3 个数字，中间和后面各有一个空格（共 2 个）。行尾的换行符不计入 `other`。

### 示例 2（边界：整行都是空格）
```in
   
```
```out
letters=0
digits=0
spaces=3
other=0
```
> 一行只有 3 个空格。注意空格属于 `spaces`，不是 `other`。如果程序没有去掉换行符，这里会多出一个 `other=1`。

## 提示
### 第 1 层
先用示例 1 跑一下，看看输出和预期差在哪里。如果 `other` 比预期多 1，说明有一个"看不见的字符"被算进去了。

### 第 2 层
`fgets` 会把行尾的 `'\n'` 一起读进来。读完之后应该检查最后一个字符是不是 `'\n'`，是就把它改成 `'\0'`：

```c
size_t len = strlen(line);
if (len > 0 && line[len - 1] == '\n') {
    line[len - 1] = '\0';
}
```

注意 `len > 0` 这个判断：空行被读成 `"\n"`，去掉换行符之后就变成空字符串。

### 第 3 层
再检查 `text.c` 里的 `text_digits` 有没有真的实现（初始代码里它直接 `return 0`）。四个函数的写法几乎一样，都是"遍历到 `'\0'`，用 `isalpha` / `isdigit` / `isspace` 判断并计数"。传给 `is*` 系列函数的参数要转成 `unsigned char`，这是好习惯——`char` 在有的平台是有符号的，负值传给 `isalpha` 是未定义行为。

## 参考代码
```c file=text.h
#ifndef TEXT_H
#define TEXT_H

/* 一行最多 1000 个字符，再给换行符和字符串结尾各留一个位置 */
#define TEXT_LINE_MAX 1002

int text_letters(const char *s);
int text_digits(const char *s);
int text_spaces(const char *s);
int text_other(const char *s);

#endif
```

```c file=text.c
#include <ctype.h>
#include "text.h"

int text_letters(const char *s) {
    int c = 0;
    for (int i = 0; s[i] != '\0'; i++) {
        if (isalpha((unsigned char)s[i])) {
            c++;
        }
    }
    return c;
}

int text_digits(const char *s) {
    int c = 0;
    for (int i = 0; s[i] != '\0'; i++) {
        if (isdigit((unsigned char)s[i])) {
            c++;
        }
    }
    return c;
}

int text_spaces(const char *s) {
    int c = 0;
    for (int i = 0; s[i] != '\0'; i++) {
        if (isspace((unsigned char)s[i])) {
            c++;
        }
    }
    return c;
}

int text_other(const char *s) {
    int c = 0;
    for (int i = 0; s[i] != '\0'; i++) {
        unsigned char ch = (unsigned char)s[i];
        if (!isalpha(ch) && !isdigit(ch) && !isspace(ch)) {
            c++;
        }
    }
    return c;
}
```

```c file=main.c
#include <stdio.h>
#include <string.h>
#include "text.h"

int main(void) {
    char line[TEXT_LINE_MAX];
    if (fgets(line, sizeof line, stdin) == NULL) {
        line[0] = '\0';              /* 输入直接结束：当成空行处理 */
    }

    size_t len = strlen(line);
    if (len > 0 && line[len - 1] == '\n') {
        line[len - 1] = '\0';        /* 去掉行尾换行符，它不属于任何一类字符 */
    }

    printf("letters=%d\n", text_letters(line));
    printf("digits=%d\n", text_digits(line));
    printf("spaces=%d\n", text_spaces(line));
    printf("other=%d\n", text_other(line));
    return 0;
}
```

## 初始代码
```c file=text.h
#ifndef TEXT_H
#define TEXT_H

/* 一行最多 1000 个字符，再给换行符和字符串结尾各留一个位置 */
#define TEXT_LINE_MAX 1002

int text_letters(const char *s);
int text_digits(const char *s);
int text_spaces(const char *s);
int text_other(const char *s);

#endif
```

```c file=text.c
#include <ctype.h>
#include "text.h"

int text_letters(const char *s) {
    int c = 0;
    for (int i = 0; s[i] != '\0'; i++) {
        if (isalpha((unsigned char)s[i])) {
            c++;
        }
    }
    return c;
}

int text_digits(const char *s) {
    (void)s;
    return 0;                        /* TODO: 统计数字字符的个数 */
}

int text_spaces(const char *s) {
    int c = 0;
    for (int i = 0; s[i] != '\0'; i++) {
        if (isspace((unsigned char)s[i])) {
            c++;
        }
    }
    return c;
}

int text_other(const char *s) {
    int c = 0;
    for (int i = 0; s[i] != '\0'; i++) {
        unsigned char ch = (unsigned char)s[i];
        if (!isalpha(ch) && !isdigit(ch) && !isspace(ch)) {
            c++;
        }
    }
    return c;
}
```

```c file=main.c
#include <stdio.h>
#include <string.h>
#include "text.h"

int main(void) {
    char line[TEXT_LINE_MAX];
    if (fgets(line, sizeof line, stdin) == NULL) {
        line[0] = '\0';
    }

    /* TODO: 去掉 fgets 读进来的行尾换行符 */

    printf("letters=%d\n", text_letters(line));
    printf("digits=%d\n", text_digits(line));
    printf("spaces=%d\n", text_spaces(line));
    printf("other=%d\n", text_other(line));
    return 0;
}
```

## 复杂度
时间 O(L)，L 是行长：四个函数各扫一遍字符串，最坏 4 × 1000 次判断。
空间 O(L)：行缓冲区 `char line[TEXT_LINE_MAX]` 约 1KB（栈上）。

四个函数分开写，好处是每个都能单独读懂、单独测试（这也是"接口放在头文件、实现放在 `.c`"的价值）。如果追求效率，也可以只扫一遍、用一个结构体同时累加四个计数——那是第 4 阶段的内容。

## 常见错误
### 忘记去掉行尾换行符 [WA]
`fgets` 读到 `"Hello World 123\n"`，`'\n'` 既不是字母、数字也不是空白之外的东西——`isspace('\n')` 是**真**，所以它会被算进 `spaces`！更隐蔽的是：如果 `other` 用 `!isalpha && !isdigit && !isspace` 判断，`'\n'` 其实不会进 `other`，而是让 `spaces` 多 1。不管多到哪一类，答案都是错的。
```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>
#include "text.h"

int main(void) {
    char line[TEXT_LINE_MAX];
    if (fgets(line, sizeof line, stdin) == NULL) {
        line[0] = '\0';
    }

    /* 没有去掉行尾的 '\n' */
    printf("letters=%d\n", text_letters(line));
    printf("digits=%d\n", text_digits(line));
    printf("spaces=%d\n", text_spaces(line));
    printf("other=%d\n", text_other(line));
    return 0;
}
```

### 用 scanf("%s") 读一整行 [WA]
`%s` 遇到空白就停，只会读到第一个单词。示例 1 里它只统计 `Hello`，后面的 `World 123` 全丢了。
```c file=main.c expect=WA
#include <stdio.h>
#include "text.h"

int main(void) {
    char line[TEXT_LINE_MAX];
    if (scanf("%1001s", line) != 1) {    /* 错：%s 读不到空格后面的内容 */
        line[0] = '\0';
    }

    printf("letters=%d\n", text_letters(line));
    printf("digits=%d\n", text_digits(line));
    printf("spaces=%d\n", text_spaces(line));
    printf("other=%d\n", text_other(line));
    return 0;
}
```

### 缓冲区开得太小 [WA]
`char line[1000]` 看起来"刚好够"，但 `fgets` 最多只写 `size - 1 = 999` 个字符，第 1000 个字符会被留在输入里丢掉。行长到 1000 时就会少统计一个字符。缓冲区要按"最大长度 + 换行符 + `'\0'`"来开，题目给出的 `TEXT_LINE_MAX` 已经是算好的。
```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>
#include "text.h"

int main(void) {
    char line[1000];                     /* 错：少了换行符和 '\0' 的位置 */
    if (fgets(line, sizeof line, stdin) == NULL) {
        line[0] = '\0';
    }

    size_t len = strlen(line);
    if (len > 0 && line[len - 1] == '\n') {
        line[len - 1] = '\0';
    }

    printf("letters=%d\n", text_letters(line));
    printf("digits=%d\n", text_digits(line));
    printf("spaces=%d\n", text_spaces(line));
    printf("other=%d\n", text_other(line));
    return 0;
}
```

### 在头文件里定义"计数器"变量 [CE]
想加一个全局计数器 `int g_text_calls = 0;` 并写进 `text.h`，被 `main.c` 和 `text.c` 都包含——两个翻译单元各一份定义，链接报 `duplicate symbol: g_text_calls`。头文件里只能写 `extern int g_text_calls;`，把定义放进某一个 `.c`。

### 以为头文件卫士能防止"两边都 include" [CE]
`text.h` 的卫士写得很完整，但它只保证 `main.c` 里 `text.h` 不被展开两次。`main.c` 和 `text.c` 是两次独立编译，各自都会完整展开一次。头文件里一旦出现定义（函数体、变量、`struct`），两个目标文件就各有一份，链接必然报重复定义。

## 测试用例
### 01 sample 示例 1
```in
Hello World 123
```
```out
letters=10
digits=3
spaces=2
other=0
```

### 02 sample 示例 2
```in
   
```
```out
letters=0
digits=0
spaces=3
other=0
```

### 03 boundary 整行 100 个字母
```in
aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```
```out
letters=100
digits=0
spaces=0
other=0
```

### 04 degenerate 空输入
```in
```
```out
letters=0
digits=0
spaces=0
other=0
```

### 05 trap 只有符号
```in
!!!???
```
```out
letters=0
digits=0
spaces=0
other=6
```

### 06 normal 字母、数字、空格、标点混在一起
```in
C is 1972!
```
```out
letters=3
digits=4
spaces=2
other=1
```

### 07 trap 全是数字（0 也是数字）
```in
0000
```
```out
letters=0
digits=4
spaces=0
other=0
```

### 08 normal 带逗号和空格
```in
Room 101, 3F
```
```out
letters=5
digits=4
spaces=2
other=1
```

### 生成 boundary 最大长度与无换行输入
```js gen
const cases = [];

/* 最长的一行：1000 个字母 */
const longLine = 'a'.repeat(1000);
cases.push({
  kind: 'boundary',
  category: '一行 1000 个字母（包括行尾换行符）',
  input: `${longLine}\n`,
  output: 'letters=1000\ndigits=0\nspaces=0\nother=0\n',
});

/* 输入没有换行符，直接 EOF */
cases.push({
  kind: 'trap',
  category: '行尾没有换行符，直接读到 EOF',
  input: 'Hi 42!',
  output: 'letters=2\ndigits=2\nspaces=1\nother=1\n',
});

/* 压力：1000 个随机可见字符，期望值在 JS 里独立统计 */
const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?-+=';
let line = '';
for (let i = 0; i < 1000; i++) {
  line += chars[rng.int(0, chars.length - 1)];
}
let letters = 0;
let digits = 0;
let spaces = 0;
let other = 0;
for (const ch of line) {
  if (/[A-Za-z]/.test(ch)) letters++;
  else if (/[0-9]/.test(ch)) digits++;
  else if (/\s/.test(ch)) spaces++;
  else other++;
}
cases.push({
  kind: 'stress',
  category: '1000 个随机可见字符',
  input: `${line}\n`,
  output: `letters=${letters}\ndigits=${digits}\nspaces=${spaces}\nother=${other}\n`,
});

return cases;
```
