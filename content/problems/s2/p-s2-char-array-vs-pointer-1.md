---json
{
  "id": "p-s2-char-array-vs-pointer-1",
  "title": "首字母大写：用可写数组处理一整行输入",
  "difficulty": "L2",
  "knowledgePoints": ["s2-char-array-vs-pointer", "s2-string-nature"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
输入是**一整行**英文文本，由若干个小写单词组成，单词之间用一个空格分隔，行首、行尾都没有空格。

请把这行文本里的**每个单词的首字母**改成大写，其余字符保持不变，然后输出：

1. 第一行：处理之后的整行文本；
2. 第二行：这行里一共有多少个单词。

例如输入 `hello world`，要输出 `Hello World` 和 `2`。

这道题看起来只是"改几个字母"，但它把 `char[]` 和 `char *` 的区别逼到了台面上：

- 你必须先有一块**属于自己的可写内存**来存放这一行内容，也就是 `char line[N];`；
- 读进来之后要**原地修改**它——只有数组（或者指向数组的指针）才有这个能力；
- 如果写成 `char *p = "some text";` 再去改 `p[0]`，改的是只读区里的字符串字面量，属于未定义行为，程序会直接崩溃。

另外别忘了：`fgets` 会把行尾的换行符 `'\n'` 一起读进数组。它也是"这一行的内容"的一部分，必须去掉，否则输出会多出一个空行，第二行的单词个数也会被算错。

## 输入格式
一行文本，总长度不超过 60 个字符（不含行尾换行符）：只包含小写字母 `a`–`z` 和单个空格，`1 ≤ 单词数 ≤ 10`，行首与行尾没有空格，单词之间恰好一个空格。

## 输出格式
两行：
1. 第一行：把每个单词的首字母改成大写之后的文本；
2. 第二行：单词个数（十进制整数）。

## 数据范围
- 整行长度：1 ≤ len ≤ 60（不含换行符）；
- 单词个数：1 ≤ 单词数 ≤ 10；
- 每个单词只含小写字母；
- 单词之间恰好一个空格，行首、行尾没有空格。

数组开 64 字节就足够（60 个字符 + 换行符 + `'\0'`），开小了会写越界。

## 示例
### 示例 1
```in
hello world
```
```out
Hello World
2
```
> 两个单词：`hello` → `Hello`，`world` → `World`，因此第二行是 2。

### 示例 2（边界：整行只有一个字母）
```in
a
```
```out
A
1
```
> 最短的合法输入。第一个字符同时也是行首，所以它一定是单词首字母，改成 `A`；单词个数是 1。

## 提示
### 第 1 层
一行里可能有空格，所以**不能用 `scanf("%s")`**（它遇到空格就停）。用 `fgets(line, sizeof line, stdin)` 读整行，然后再在数组上做修改。

### 第 2 层
先用一个循环数出长度，遇到 `'\0'` 或 `'\n'` 就停；如果停下时是 `'\n'`，就把它改成 `'\0'`——这就是"去掉换行符"。接下来遍历每个字符：只要它是行首（`i == 0`）或者前一个字符是空格，它就是单词首字母。

### 第 3 层
大小写转换不需要 `<ctype.h>`，`c - 'a' + 'A'` 就够了，但要先确认 `c` 确实在 `'a'`–`'z'` 之间（本题全是小写字母，仍然建议判断，养成习惯）。统计单词个数时不要另开数组，上面那个"是不是单词首字母"的判断成立一次就 `words++` 一次。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAXLEN 60

int main(void) {
    char line[MAXLEN + 2];
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }

    /* 1. 求长度，顺便把 fgets 一起读进来的换行符去掉 */
    int len = 0;
    while (line[len] != '\0' && line[len] != '\n') {
        len++;
    }
    line[len] = '\0';

    /* 2. "行首或空格之后"的字母就是单词首字母 */
    int words = 0;
    for (int i = 0; i < len; i++) {
        if (i == 0 || line[i - 1] == ' ') {
            words++;
            if (line[i] >= 'a' && line[i] <= 'z') {
                line[i] = (char)(line[i] - 'a' + 'A');
            }
        }
    }

    printf("%s\n", line);
    printf("%d\n", words);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAXLEN 60

int main(void) {
    char line[MAXLEN + 2];
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }

    /* TODO:
     * 1. 求出行长，并把行尾的 '\n' 改成 '\0'；
     * 2. 遍历数组，把每个单词的首字母改成大写（line 是可写的数组，放心改）；
     * 3. 统计单词个数。 */
    printf("%s", line);
    printf("0\n");
    return 0;
}
```

## 复杂度
时间 O(n)：只需要遍历这一行一次（求长度一次，改字母一次），n 是行长。
空间 O(n)：需要一个长度为 n+2 的字符数组存放这一行。

## 常见错误
### 用 `scanf("%s")` 读整行 [WA]
`scanf("%s")` 遇到空白字符就停下，只能读到第一个单词。后面的单词一个都不会被处理和统计。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    char word[64];
    if (scanf("%63s", word) != 1) {
        return 0;
    }
    if (word[0] >= 'a' && word[0] <= 'z') {
        word[0] = (char)(word[0] - 'a' + 'A');
    }
    printf("%s\n", word);
    printf("1\n");
    return 0;
}
```

### 忘记去掉 `fgets` 留下的换行符 [WA]
`fgets` 会把 `'\n'` 也存进数组。如果直接 `printf("%s\n", line)`，换行符和格式串里的 `\n` 会让输出多出一个空行；遍历时如果只看 `!= '\0'`，`'\n'` 还会被当成普通字符。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    char line[64];
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }

    int words = 0;
    for (int i = 0; line[i] != '\0' && line[i] != '\n'; i++) {
        if (i == 0 || line[i - 1] == ' ') {
            words++;
            if (line[i] >= 'a' && line[i] <= 'z') {
                line[i] = (char)(line[i] - 'a' + 'A');
            }
        }
    }

    printf("%s\n", line);   /* line 末尾还带着 '\n'，输出会多一个空行 */
    printf("%d\n", words);
    return 0;
}
```

### 以为 `char *` 指向的字面量可以改 [RE]
`char *p = "hello world";` 里的 `p` 指向只读数据段中的字符串字面量。`p[0] = 'H';` 是写只读内存，属于未定义行为，本平台上程序会直接报"非法内存访问"并终止，一个字符也输不出来。
```c file=main.c expect=RE
#include <stdio.h>

int main(void) {
    char *p = "hello world";     /* 指向只读区的字面量 */
    p[0] = 'H';                  /* 未定义行为 */
    printf("%s\n", p);
    return 0;
}
```
正确做法是 `char line[64]; fgets(line, sizeof line, stdin);`——先有自己的一块可写数组，再改它。

### 缓冲区开小、读取又不限长度 [WA|RE]
数组开成 16 字节，却用不限制长度的 `scanf("%s")` 往里塞，遇到长行就会写越界（RE）；即使没溢出，读到一半的文本也一定和预期不符（WA）。
```c file=main.c
#include <stdio.h>

int main(void) {
    char line[16];              /* 题目最长 60 字符，这里只有 16 字节 */
    if (scanf("%s", line) != 1) {
        return 0;
    }

    int words = 0;
    for (int i = 0; line[i] != '\0'; i++) {
        if (i == 0 || line[i - 1] == ' ') {
            words++;
            if (line[i] >= 'a' && line[i] <= 'z') {
                line[i] = (char)(line[i] - 'a' + 'A');
            }
        }
    }
    printf("%s\n%d\n", line, words);
    return 0;
}
```

### 只把第一个字母改成大写 [WA]
`line[0] = ...` 只处理了第一个单词的首字母，后面的单词全部保持小写。判断"是不是单词首字母"必须逐字符检查前一个字符是不是空格。

## 测试用例
### 01 sample 示例 1
```in
hello world
```
```out
Hello World
2
```

### 02 sample 示例 2
```in
a
```
```out
A
1
```

### 03 boundary 最长的一行只有一个单词
```in
abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefgh
```
```out
Abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefgh
1
```

### 04 degenerate 十个单字母单词
```in
a b c d e f g h i j
```
```out
A B C D E F G H I J
10
```

### 05 trap 两个单词
```in
good morning
```
```out
Good Morning
2
```

### 06 trap 最长一行、六个单词、最后一个单词在行尾
```in
aaaaaaaaa bbbbbbbbb ccccccccc ddddddddd eeeeeeeee fffffffffg
```
```out
Aaaaaaaaa Bbbbbbbbb Ccccccccc Ddddddddd Eeeeeeeee Fffffffffg
6
```

### 07 normal 常见句子
```in
the quick brown fox jumps over the lazy dog
```
```out
The Quick Brown Fox Jumps Over The Lazy Dog
9
```

### 08 normal 中间夹着单字母单词
```in
i am a coder
```
```out
I Am A Coder
4
```
