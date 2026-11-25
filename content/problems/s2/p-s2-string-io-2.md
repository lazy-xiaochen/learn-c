---json
{
  "id": "p-s2-string-io-2",
  "title": "逐行读入直到文件结束：统计行数与最长行",
  "difficulty": "L2",
  "knowledgePoints": ["s2-string-io"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
日志分析程序需要按行处理文本：一行一行地读，直到文件结束（EOF）。请统计两件事：

1. 一共有多少行；
2. 最长的一行有多少个字符（**不含**行尾的换行符）。

说明：

- 空行也算一行，它的长度是 0；
- 行内的空格要计入长度，行尾换行符不计入；
- 每一行都以 `'\n'` 结尾，最后一行的 `'\n'` 之后就是文件结束。

## 输入格式
第 1 行到第 n 行是文本内容，共 1–100 行。每行长度 0–80，由可打印 ASCII 字符组成（可以包含空格）。

## 输出格式
两行：

```out
lines=<行数>
max=<最长行的长度>
```

## 数据范围
1 ≤ 行数 ≤ 100

每行长度：0 ≤ 长度 ≤ 80

## 示例
### 示例 1
```in
hello
world
```
```out
lines=2
max=5
```
> 两行分别是 `hello` 和 `world`，长度都是 5，所以最长长度是 5。

### 示例 2（边界：单行 80 个字符）
```in
aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```
```out
lines=1
max=80
```
> 只有一行，长度正好是数据范围的上限 80。注意 `fgets` 读到的还有换行符，不能把它算进去。

## 提示
### 第 1 层
用 `fgets` 反复读，直到它返回 `NULL`。`NULL` 表示"已经没有下一行了"，不需要再额外判断什么。

### 第 2 层
每读入一行，先把行尾的 `'\n'` 换成 `'\0'`，再用 `strlen` 得到这一行的长度。用两个变量分别维护行数和目前的最大长度。

### 第 3 层
循环写成 `while (fgets(line, sizeof line, stdin) != NULL) { ... }`。不要用 `while (!feof(stdin))`：`feof` 只有在一次读取失败之后才变成真，循环会多跑一轮、多算一行。空行读进来是 `"\n"`，去掉换行后长度是 0，但行数仍然要加 1。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

int main(void) {
    char line[128];
    int lines = 0;
    int max = 0;

    while (fgets(line, sizeof line, stdin) != NULL) {
        line[strcspn(line, "\n")] = '\0';   /* 去掉行尾换行 */
        int len = (int)strlen(line);
        if (len > max) {
            max = len;
        }
        lines++;
    }

    printf("lines=%d\n", lines);
    printf("max=%d\n", max);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    char line[128];
    int lines = 0;
    int max = 0;

    /* 用 fgets 一行一行读，读到 NULL 表示文件结束；
       每读一行就去掉换行、更新 lines 和 max */
    if (fgets(line, sizeof line, stdin) != NULL) {
        lines = 1;
    }

    printf("lines=%d\n", lines);
    printf("max=%d\n", max);
    return 0;
}
```

## 复杂度
时间 O(总字符数)：每行被读入一次，`strcspn` 和 `strlen` 各扫描一遍当前行。

空间 O(最长行长)：只需要一个能容纳单行的缓冲区（本题 128 字节足够）。

## 常见错误
### 用 `while (!feof(stdin))` 控制循环，多算一行 [WA]
`feof` 只有在一次读取**失败之后**才会变成真。用它当循环条件，最后一次 `fgets` 失败后循环体还会执行一遍，行数就多 1。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    char line[128];
    int lines = 0;
    int max = 0;

    while (!feof(stdin)) {              /* 错：feof 在读取失败后才为真 */
        if (fgets(line, sizeof line, stdin) == NULL) {
            /* 什么都不做，继续往下计数 */
        }
        line[strcspn(line, "\n")] = '\0';
        int len = (int)strlen(line);
        if (len > max) {
            max = len;
        }
        lines++;
    }

    printf("lines=%d\n", lines);
    printf("max=%d\n", max);
    return 0;
}
```

### 没有去掉换行，最长行长度多 1 [WA]
`fgets` 保留 `'\n'`，如果直接对读入内容调用 `strlen`，每一行的长度都会比实际多 1。样例中 `hello` 会被算成长度 6。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    char line[128];
    int lines = 0;
    int max = 0;

    while (fgets(line, sizeof line, stdin) != NULL) {
        int len = (int)strlen(line);    /* 错：换行符也被计入长度 */
        if (len > max) {
            max = len;
        }
        lines++;
    }

    printf("lines=%d\n", lines);
    printf("max=%d\n", max);
    return 0;
}
```

### 用 `scanf("%s")` 逐词读，把单词数当成行数 [WA]
`%s` 遇到空格就停，一行 `hello world` 会被当成两个"词"；空行则完全读不到。行数、最长行长度都会算错。

### 缓冲区太小，长行被拆成多行 [WA]
`fgets` 每行最多读 `size - 1` 个字符。如果缓冲区比最长行还短，一行会被拆成两三次读入，行数变多、最长长度也可能变短。本题最长行 80 字符，缓冲区至少要 82 字节。

## 测试用例
### 01 sample 示例 1
```in
hello
world
```
```out
lines=2
max=5
```

### 02 sample 示例 2
```in
aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```
```out
lines=1
max=80
```

### 03 boundary 100 行，每行 2 个字符
```in
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
ab
```
```out
lines=100
max=2
```

### 04 degenerate 中间有空行
```in
first

last
```
```out
lines=3
max=5
```

### 05 trap 行尾空格要计入长度
```in
abc   
xy
```
```out
lines=2
max=6
```

### 06 trap 行首空格也要计入长度
```in
  ab
c
```
```out
lines=2
max=4
```

### 07 normal 标点、空格与空行混在一起
```in
hello world

C is fun
```
```out
lines=3
max=11
```

### 08 normal 只有一行
```in
xyz
```
```out
lines=1
max=3
```
