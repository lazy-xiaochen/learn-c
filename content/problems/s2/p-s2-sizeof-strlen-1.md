---json
{
  "id": "p-s2-sizeof-strlen-1",
  "title": "缓冲区体检：sizeof、strlen 与剩余空间",
  "difficulty": "L2",
  "knowledgePoints": ["s2-sizeof-strlen"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
程序里用一个固定大小的字符数组保存一行输入：

```c
char buf[101];
```

读入一行并去掉行尾换行后，请报告三个数字：

1. 缓冲区一共占多少字节（用 `sizeof buf` 得到）；
2. 这行正文有多少个字符（用 `strlen(buf)` 得到，不含 `'\0'`）；
3. 缓冲区里还能再放多少个**非结束符**字符，即 `sizeof buf - strlen(buf) - 1`。

这三个数字正好对应"容量""已用长度"和"剩余空间"。

## 输入格式
一行，长度 1–99，由可打印 ASCII 字符组成（可以包含空格）。

## 输出格式
三行：

```out
sizeof=101
strlen=<正文字符数>
left=<还能再放的字符数>
```

## 数据范围
正文长度：1 ≤ 长度 ≤ 99。

缓冲区固定为 101 字节，因此能完整容纳最长的一行（99 个字符 + 换行 + `'\0'`）。

## 示例
### 示例 1
```in
hello
```
```out
sizeof=101
strlen=5
left=95
```
> 101 是数组总容量；`hello` 有 5 个字符；剩下 101 − 5 − 1 = 95 个位置可以再放普通字符（还要保留 1 字节给 `'\0'`）。

### 示例 2（边界：正文占满 99 个字符）
```in
012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678
```
```out
sizeof=101
strlen=99
left=1
```
> 99 个正文 + 1 个换行，`fgets` 正好读满 100 个字符；去掉换行后剩 99 个字符，缓冲区只剩 1 个位置放 `'\0'`。

## 提示
### 第 1 层
`sizeof buf` 和 `strlen(buf)` 回答的是两个不同的问题：前者是数组的容量，后者是里面字符串的长度。

### 第 2 层
先去掉 `fgets` 留下的换行符，`strlen` 才是正文长度。用 `sizeof buf` 打印容量，不要用 `sizeof` 去数正文。

### 第 3 层
容量为 101、长度为 `len` 时，已经用掉 `len` 个字符和 1 个结束符，所以剩余可放字符数是 `101 - len - 1`。写成 `sizeof buf - strlen(buf) - 1` 即可，注意三个值都是 `size_t`，用 `%zu` 打印。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[101];
    if (fgets(buf, sizeof buf, stdin) == NULL) {
        return 0;
    }

    buf[strcspn(buf, "\n")] = '\0';   /* 去掉行尾换行 */
    size_t len = strlen(buf);

    printf("sizeof=%zu\n", sizeof buf);
    printf("strlen=%zu\n", len);
    printf("left=%zu\n", sizeof buf - len - 1);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[101];
    if (fgets(buf, sizeof buf, stdin) == NULL) {
        return 0;
    }

    buf[strcspn(buf, "\n")] = '\0';

    /* 分别报告 sizeof buf、strlen(buf) 和剩余可放字符数 */
    printf("sizeof=?\n");
    printf("strlen=?\n");
    printf("left=?\n");
    return 0;
}
```

## 复杂度
时间 O(n)：`fgets` 读入和 `strlen` 扫描都是 O(n)。

空间 O(1)：只有一个固定大小的 101 字节数组。

## 常见错误
### 用 `sizeof` 当字符串长度 [WA]
`sizeof buf` 永远是 101，和读入了多少字符无关。把它当成 `strlen` 输出，每一组用例都会错。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[101];
    if (fgets(buf, sizeof buf, stdin) == NULL) {
        return 0;
    }

    buf[strcspn(buf, "\n")] = '\0';

    printf("sizeof=%zu\n", sizeof buf);
    printf("strlen=%zu\n", sizeof buf);   /* 错：容量不是长度 */
    printf("left=%zu\n", sizeof buf - strlen(buf) - 1);
    return 0;
}
```

### 计算剩余空间时忘记减掉结束符 [WA]
数组里已经用掉了 `len` 个字符，但还需要 1 个字节放 `'\0'`。只减 `len` 会多算 1 个可用位置。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[101];
    if (fgets(buf, sizeof buf, stdin) == NULL) {
        return 0;
    }

    buf[strcspn(buf, "\n")] = '\0';

    printf("sizeof=%zu\n", sizeof buf);
    printf("strlen=%zu\n", strlen(buf));
    printf("left=%zu\n", sizeof buf - strlen(buf));   /* 错：少了 -1 */
    return 0;
}
```

### 没有去掉换行符 [WA]
`fgets` 留下的 `'\n'` 会被 `strlen` 算进长度，于是 `strlen` 多 1、`left` 少 1。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[101];
    if (fgets(buf, sizeof buf, stdin) == NULL) {
        return 0;
    }

    size_t len = strlen(buf);   /* 错：换行还在 buf 里 */

    printf("sizeof=%zu\n", sizeof buf);
    printf("strlen=%zu\n", len);
    printf("left=%zu\n", sizeof buf - len - 1);
    return 0;
}
```

### 把数组传进函数后再用 `sizeof` [WA]
数组作参数会退化成指针，函数里的 `sizeof s` 是 8 而不是 101。容量要么在 `main` 里算好传进去，要么用宏/常量表示。

## 测试用例
### 01 sample 示例 1
```in
hello
```
```out
sizeof=101
strlen=5
left=95
```

### 02 sample 示例 2
```in
012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678
```
```out
sizeof=101
strlen=99
left=1
```

### 03 degenerate 只有一个字符
```in
a
```
```out
sizeof=101
strlen=1
left=99
```

### 04 boundary 98 个字符
```in
01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567
```
```out
sizeof=101
strlen=98
left=2
```

### 05 trap 行尾空格也是正文
```in
abc  
```
```out
sizeof=101
strlen=5
left=95
```

### 06 trap 行首空格也是正文
```in
  hi
```
```out
sizeof=101
strlen=4
left=96
```

### 07 normal 字母、空格、数字和标点混合
```in
C 2026!
```
```out
sizeof=101
strlen=7
left=93
```

### 08 normal 较长的普通单词
```in
abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwx
```
```out
sizeof=101
strlen=50
left=50
```
