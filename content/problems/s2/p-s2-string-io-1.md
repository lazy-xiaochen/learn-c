---json
{
  "id": "p-s2-string-io-1",
  "title": "消息长度统计：fgets 留下的换行不能算进正文",
  "difficulty": "L2",
  "knowledgePoints": ["s2-string-io"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
聊天软件要限制一条消息的长度。用户按一次回车表示消息结束，程序用 `fgets` 读入这一行。

问题在于：`fgets` 会把行尾的换行符 `'\n'` 也一起存进字符数组。换行只是"这一行结束"的标记，不应该计入消息正文的长度。

请读入一行，**去掉行尾的换行符**，然后输出正文的长度和正文本身。正文用一对方括号包住，这样首尾的空格也能被看见。

## 输入格式
一行长度 1–99 的文本，由可打印 ASCII 字符组成（可以包含空格，不含制表符）。

这一行以换行符结尾。

## 输出格式
两行：

```out
len=<正文长度>
[正文]
```

正文中的空格（包括开头和结尾的空格）都要原样保留，只去掉行尾的换行符。

## 数据范围
正文长度：1 ≤ 长度 ≤ 99。

行尾有且仅有一个换行符。

## 示例
### 示例 1
```in
hello world
```
```out
len=11
[hello world]
```
> `fgets` 读到的内容其实是 `hello world\n`，共 12 个字符；去掉换行后正文是 11 个字符。

### 示例 2（边界：只有一个字符）
```in
x
```
```out
len=1
[x]
```
> 最短的正文只有 1 个字符，去掉换行后长度为 1，不能变成 0。

## 提示
### 第 1 层
先观察 `fgets` 读到的内容里有什么。可以在读入后逐个字符打印编码，确认换行符确实在数组里。

### 第 2 层
`strcspn(line, "\n")` 返回从开头到第一个换行符之间的字符数。把 `line` 中这个位置改成 `'\0'`，字符串就在换行之前结束了。

### 第 3 层
去掉换行后再调用 `strlen(line)`，得到的才是正文长度。输出时正文用 `[%s]` 包住，但不要把 `'\n'` 留在 `line` 里，否则 `]` 会跑到下一行。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

int main(void) {
    char line[128];
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }

    line[strcspn(line, "\n")] = '\0';   /* 去掉行尾换行 */

    printf("len=%zu\n", strlen(line));
    printf("[%s]\n", line);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    char line[128];
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }

    /* 先去掉行尾的换行符，再统计正文长度并输出 */
    printf("len=0\n");
    printf("[]\n");
    return 0;
}
```

## 复杂度
时间 O(n)：`fgets` 读入 O(n)，`strcspn` 和 `strlen` 各自扫描一遍，都是 O(n)。

空间 O(n)：需要一个能容纳整行的字符数组，本题至少 101 字节，代码中用了 128。

## 常见错误
### 没去掉换行符，长度总多 1 [WA]
`strlen(line)` 会把换行符也算进去，所以 `hello world` 会输出 `len=12`；打印 `[%s]` 时换行符还会让 `]` 掉到下一行。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    char line[128];
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }

    printf("len=%zu\n", strlen(line));   /* 错：换行符还在 line 里 */
    printf("[%s]\n", line);
    return 0;
}
```

### 用 `scanf("%s")` 读整行，只读到第一个空格 [WA]
`%s` 在空白处就停止，`hello world` 只会读成 `hello`，长度和正文都不对。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    char line[128];
    if (scanf("%127s", line) != 1) {
        return 0;
    }

    printf("len=%zu\n", strlen(line));
    printf("[%s]\n", line);
    return 0;
}
```

### 缓冲区开得太小，长行被截断 [WA]
如果 `line` 只开了 32 字节，而一行有 99 个字符，`fgets` 只读得走前 31 个字符，剩下的还留在输入里，长度自然不对。缓冲区至少要能放下"最长行 + 换行 + `'\0'`"。

### 用 `gets` 读入整行 [UB]
`gets` 从 C11 起已从标准中删除；本平台的编译器仍然保留它，但会给出 "Using gets() is always unsafe" 的警告。它无法限制写入长度，输入超过缓冲区就会越界写内存，属于未定义行为。请使用 `fgets(buf, sizeof buf, stdin)`。

## 测试用例
### 01 sample 示例 1
```in
hello world
```
```out
len=11
[hello world]
```

### 02 sample 示例 2
```in
x
```
```out
len=1
[x]
```

### 03 boundary 99 个字符的正文
```in
012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678
```
```out
len=99
[012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678]
```

### 04 degenerate 正文全是空格
```in
   
```
```out
len=3
[   ]
```

### 05 trap 行尾有空格，不能当成空白删掉
```in
abc  
```
```out
len=5
[abc  ]
```

### 06 trap 行首有空格
```in
  hi
```
```out
len=4
[  hi]
```

### 07 normal 包含标点和数字
```in
Hi, C 2026!
```
```out
len=11
[Hi, C 2026!]
```

### 08 normal 单词之间连续多个空格
```in
a  b
```
```out
len=4
[a  b]
```
