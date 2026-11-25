---json
{
  "id": "p-s2-char-array-vs-pointer-2",
  "title": "原地反转与回文判断：只有可写数组才能交换字符",
  "difficulty": "L2",
  "knowledgePoints": ["s2-char-array-vs-pointer", "s2-string-nature"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
输入一个小写单词，请你：

1. **原地**把它反转（首尾字符互换，逐层向中间推进），输出反转后的单词；
2. 判断原单词是不是**回文**：正着读和反着读完全一样。是就输出 `YES`，否则输出 `NO`。

例如 `hello` 反转后是 `olleh`，而且它不是回文，所以输出两行：

```
olleh
NO
```

这道题的关键在于"**原地**"两个字：交换字符必须真的去改那块内存。这意味着这些字符必须存放在**自己的可写数组**里：

- 输入必须读进 `char s[N]`，这样 `s[i]` 和 `s[j]` 才能互换；
- 如果只用一个 `const char *p` 指向字面量，你连一个字符都改不了——写它是未定义行为；
- 交换时下标要严格控制在 `0` 到 `len-1` 之间，`'\0'` 不参与交换，也不要越界。

回文判断其实不需要额外的数组：用两个下标从两端往中间走，一旦发现不同的字符就不是回文。注意要在**反转之前**判断（或者判断完再反转），否则比较的是已经被改过的内容。

## 输入格式
一行，一个小写单词（只含 `a`–`z`），长度 1 到 50，行尾有换行符。

## 输出格式
两行：
1. 第一行：反转后的单词；
2. 第二行：`YES`（原单词是回文）或 `NO`（不是）。

## 数据范围
- 单词长度：1 ≤ len ≤ 50；
- 只包含小写字母 `a`–`z`；
- 数组开 52 字节即可（50 个字符 + 换行符 + `'\0'`）。

## 示例
### 示例 1
```in
hello
```
```out
olleh
NO
```
> 反转：`h` 与 `o` 交换、`e` 与 `l` 交换，得到 `olleh`。原词 `hello` 首尾不同，不是回文，输出 `NO`。

### 示例 2（边界：只有一个字符）
```in
a
```
```out
a
YES
```
> 长度为 1 的单词反转后还是自己，而且它当然正反读都一样，所以是回文。

## 提示
### 第 1 层
先读入整行，求出真实长度，把行尾的 `'\n'` 去掉。反转不需要额外数组：用两个下标 `i` 和 `j` 分别指向首尾，交换 `s[i]` 和 `s[j]`，然后 `i++`、`j--`，直到 `i >= j` 为止。

### 第 2 层
交换循环写成 `for (int i = 0, j = n - 1; i < j; i++, j--)`，循环体里用临时变量 `char t = s[i]; s[i] = s[j]; s[j] = t;`。注意 `j` 的初值是 `n - 1`（最后一个字符），不是 `n`（那是 `'\0'`）。

### 第 3 层
回文判断用同样的双下标走法，但在**反转之前**做：`pal` 先设成 1，遇到 `s[i] != s[j]` 就置 0 并 `break`。最后按 `pal ? "YES" : "NO"` 输出。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAXLEN 50

int main(void) {
    char s[MAXLEN + 2];
    if (fgets(s, sizeof s, stdin) == NULL) {
        return 0;
    }

    int n = 0;
    while (s[n] != '\0' && s[n] != '\n') {
        n++;
    }
    s[n] = '\0';

    /* 先判断回文：反转之后内容就变了，所以趁原样还在时比较 */
    int pal = 1;
    for (int i = 0, j = n - 1; i < j; i++, j--) {
        if (s[i] != s[j]) {
            pal = 0;
            break;
        }
    }

    /* 原地反转：两个下标从两端往中间走，交换到相遇为止 */
    for (int i = 0, j = n - 1; i < j; i++, j--) {
        char t = s[i];
        s[i] = s[j];
        s[j] = t;
    }

    printf("%s\n", s);
    printf("%s\n", pal ? "YES" : "NO");
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAXLEN 50

int main(void) {
    char s[MAXLEN + 2];
    if (fgets(s, sizeof s, stdin) == NULL) {
        return 0;
    }

    /* TODO:
     * 1. 求出长度 n，并把行尾的 '\n' 换成 '\0'；
     * 2. 判断是不是回文（在反转之前判断）；
     * 3. 原地反转 s[0..n-1]；
     * 4. 输出反转后的单词和 YES / NO。 */
    printf("%s", s);
    printf("NO\n");
    return 0;
}
```

## 复杂度
时间 O(n)：求长度、判回文、反转各扫一遍，合计仍是 O(n)。
空间 O(n)：一个长度为 n+2 的字符数组；交换只用了一个临时变量，没有额外数组。

## 常见错误
### 交换的范围写成了 `0..n` [WA]
`j` 的初值必须是 `n - 1`。如果写成 `s[n - i]`，第一次交换就把 `'\0'` 换到了 `s[0]`，字符串立刻变成空的，输出只剩一个空行。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    char s[52];
    if (fgets(s, sizeof s, stdin) == NULL) {
        return 0;
    }
    int n = 0;
    while (s[n] != '\0' && s[n] != '\n') {
        n++;
    }
    s[n] = '\0';

    for (int i = 0; i < n; i++) {   /* i 走到 n 时，s[n - i] 是 '\0' 或已经交换过的位置 */
        char t = s[i];
        s[i] = s[n - i];
        s[n - i] = t;
    }
    printf("%s\n", s);
    return 0;
}
```

### 回文判断的下标越界一格 [WA]
`s[i] != s[n - i]` 在 `i = 0` 时比较的是 `s[0]` 和 `s[n]`，而 `s[n]` 是 `'\0'`。于是任何单词都会被判成"不是回文"，连 `a` 这种单字符回文都会输出 `NO`。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    char s[52];
    if (fgets(s, sizeof s, stdin) == NULL) {
        return 0;
    }
    int n = 0;
    while (s[n] != '\0' && s[n] != '\n') {
        n++;
    }
    s[n] = '\0';

    int pal = 1;
    for (int i = 0; i < n; i++) {
        if (s[i] != s[n - i]) {     /* 应该是 s[n - 1 - i] */
            pal = 0;
            break;
        }
    }
    printf("%s\n", pal ? "YES" : "NO");
    return 0;
}
```

### 忘记去掉 `fgets` 读进来的换行符 [WA]
`fgets` 把 `'\n'` 也存进了数组。反转之后这个换行符会跑到字符串开头，第一行输出变成空行；长度也多算了 1。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    char s[52];
    if (fgets(s, sizeof s, stdin) == NULL) {
        return 0;
    }

    int n = 0;
    while (s[n] != '\0') {          /* 没有在 '\n' 处停下 */
        n++;
    }

    for (int i = 0, j = n - 1; i < j; i++, j--) {
        char t = s[i];
        s[i] = s[j];
        s[j] = t;
    }
    printf("%s\n", s);
    return 0;
}
```

### 数组开得太小、读取又不限长度 [UB]
题目最长 50 个字符，数组却只开 20 字节，再用不限制长度的 `scanf("%s")` 读取，长单词会直接写到数组外面去。本平台会报"数组下标越界"。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    char s[20];                 /* 太短：题目最长 50 个字符 */
    if (scanf("%s", s) != 1) {
        return 0;
    }
    int n = 0;
    while (s[n] != '\0') {
        n++;
    }

    int pal = 1;
    for (int i = 0, j = n - 1; i < j; i++, j--) {
        if (s[i] != s[j]) {
            pal = 0;
            break;
        }
    }

    for (int i = 0, j = n - 1; i < j; i++, j--) {
        char t = s[i];
        s[i] = s[j];
        s[j] = t;
    }
    printf("%s\n", s);
    printf("%s\n", pal ? "YES" : "NO");
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
hello
```
```out
olleh
NO
```

### 02 sample 示例 2
```in
a
```
```out
a
YES
```

### 03 boundary 五十个字符的回文
```in
abcdefghijklmnopqrstuvwxyyxwvutsrqponmlkjihgfedcba
```
```out
abcdefghijklmnopqrstuvwxyyxwvutsrqponmlkjihgfedcba
YES
```

### 04 degenerate 两个字符且不是回文
```in
ab
```
```out
ba
NO
```

### 05 trap 偶数长度的回文
```in
abccba
```
```out
abccba
YES
```
> 长度为偶数时中间两个字符相邻，`i < j` 的循环条件正好不会多比一次。

### 06 trap 五十个字符但不是回文
```in
abcdefghijklmnopqrstuvwxyyxwvutsrqponmlkjihgfedcbb
```
```out
bbcdefghijklmnopqrstuvwxyyxwvutsrqponmlkjihgfedcba
NO
```

### 07 normal 普通单词
```in
deepseek
```
```out
keespeed
NO
```

### 08 trap 只差最后一个字符
```in
abcbaa
```
```out
aabcba
NO
```
> 前五个字符 `abcba` 是回文，但最后一个 `a` 让整个单词不是回文——只比较前半段就下结论会出错。
