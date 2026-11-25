---json
{
  "id": "p-s5-realloc-2",
  "title": "未知长度的一行：用 realloc 边读边扩的字符缓冲区",
  "difficulty": "L3",
  "knowledgePoints": ["s5-realloc"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
终端里粘贴进来的一行文本有多长，程序事先是不知道的：可能是一个空行，也可能是两万个字符。这类"长度未知"的输入，正是 `realloc` 的典型用武之地——**边读边扩，读完刚好**。

请写一个程序：

1. 从标准输入读入**一整行**（直到换行符或文件结束，换行符本身不计入内容）；
2. 统计这行有多少个字符、多少个"词"（词 = 被空格分隔开的非空片段，连续多个空格只算一次分隔）；
3. 把整行**反过来**输出。

读入时不允许使用定长数组（本题就是练扩容的）：请从一个小缓冲区开始，每次满了就用 `realloc` 把容量翻倍，并且**用临时指针接住 `realloc` 的返回值**——失败时不能丢掉原来的缓冲区。

几个必须处理的边界：

- 行可能是空的（`len=0`），此时 `reversed=` 后面什么都没有；
- 行里可能有连续空格、开头空格、结尾空格，它们都算字符，但都不算词；
- 输入的最后一行可能**没有**换行符，直接以文件结束收尾。

## 输入格式
一行文本，内容只包含可打印 ASCII 字符（`0x20`–`0x7E`，含空格），以换行符结束或以文件结束（EOF）结束。

## 输出格式
输出三行：

```
len=<字符个数>
words=<词的个数>
reversed=<把整行反转后的内容>
```

`len` 不含结尾的换行符。`reversed=` 后面直接跟反转后的内容，不再加引号。

## 数据范围
0 ≤ 行长 ≤ 20000
字符集：可打印 ASCII（空格 + `!` 到 `~`），不含制表符
行内空格的个数与位置任意（开头、结尾、连续多个都可能）

最大输出约 20KB，远小于平台 64KB 的输出上限。

## 示例
### 示例 1
```in
hello world
```
```out
len=11
words=2
reversed=dlrow olleh
```
> 11 个字符（含中间那个空格），两个词，反转后是 `dlrow olleh`。

### 示例 2（边界：整行只有一个空格）
```in
 
```
```out
len=1
words=0
reversed=
```
> 这一行有一个字符（一个空格），所以 `len=1`；但没有任何非空片段，所以 `words=0`；反转之后仍然是一个空格，显示出来就是 `reversed=` 后面跟一个空格（行末空白不参与比对）。如果循环写成"空格数 + 1"，这里会算出 1 个词，直接错。

## 提示
### 第 1 层
先想清楚"缓冲区什么时候不够用"：准备写入第 `len+1` 个字符时，如果 `cap` 只剩下 0 个字节（或者还要留一个位置给结尾的 `'\0'`），就必须扩容。读循环用 `getchar()`，它一次返回一个字符，遇到 `EOF` 或 `'\n'` 就停。

### 第 2 层
扩容用翻倍：`newcap = cap * 2`。关键是三条：用 `char *tmp = realloc(line, newcap);` 接住返回值；`tmp == NULL` 时立刻 `free(line); return 0;`（此时 `line` 还指着旧块，能安全释放）；只有成功才写 `line = tmp;` 并更新 `cap`。另外要记得给结尾的 `'\0'` **留一个字节**：判断条件写成 `len + 1 >= cap` 而不是 `len >= cap`，这样读完后 `line[len] = '\0';` 一定在界内。

### 第 3 层
词数用一个状态量：遍历每个字符，如果是空格就把 `in_word` 置 0；如果不是空格且 `in_word == 0`，就说明遇到了一个新词，`words++` 并把 `in_word` 置 1。反转输出用下标倒着走：`for (size_t i = len; i > 0; i--) putchar(line[i - 1]);`——注意循环变量用 `i > 0` 而不是 `i >= 0`，否则无符号数会下溢成 `SIZE_MAX`，越界读出堆。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    size_t cap = 16;
    size_t len = 0;
    char *line = malloc(cap);
    if (line == NULL) {
        return 0;
    }

    int ch;
    while ((ch = getchar()) != EOF && ch != '\n') {
        if (len + 1 >= cap) {                  /* 留一个字节给结尾的 '\0' */
            size_t newcap = cap * 2;
            char *tmp = realloc(line, newcap);
            if (tmp == NULL) {
                free(line);                    /* 失败时 line 仍然有效 */
                return 0;
            }
            line = tmp;
            cap = newcap;
        }
        line[len] = (char)ch;
        len++;
    }
    line[len] = '\0';

    int words = 0;
    int in_word = 0;
    for (size_t i = 0; i < len; i++) {
        if (line[i] == ' ') {
            in_word = 0;
        } else if (!in_word) {
            words++;                           /* 从"空格"或"行首"进入一个词 */
            in_word = 1;
        }
    }

    printf("len=%zu\n", len);
    printf("words=%d\n", words);
    printf("reversed=");
    for (size_t i = len; i > 0; i--) {
        putchar(line[i - 1]);
    }
    putchar('\n');

    free(line);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    size_t cap = 16;
    size_t len = 0;
    char *line = malloc(cap);
    if (line == NULL) {
        return 0;
    }

    int ch;
    while ((ch = getchar()) != EOF && ch != '\n') {
        /* TODO: 这里要先检查缓冲区还放不放得下（记得给 '\0' 留位置），
         *       放不下时用 realloc 把 cap 翻倍，并且用临时指针接住返回值 */
        line[len] = (char)ch;
        len++;
    }
    line[len] = '\0';

    int words = 0;
    int in_word = 0;
    for (size_t i = 0; i < len; i++) {
        /* TODO: 用 in_word 状态统计被空格分隔的非空片段个数 */
        (void)in_word;
    }

    printf("len=%zu\n", len);
    printf("words=%d\n", words);
    printf("reversed=");
    for (size_t i = len; i > 0; i--) {
        putchar(line[i - 1]);
    }
    putchar('\n');

    free(line);
    return 0;
}
```

## 复杂度
时间 O(L)：每个字符读一次、扫一次、输出一次，扩容总搬迁量小于 2L。
空间 O(L)：缓冲区峰值不超过 2 × 行长（翻倍策略）加一个结束符。

## 常见错误
### 忘记扩容，直接往缓冲区里写 [RE]
`line[len] = ch;` 前面如果没有"还剩不剩位置"的判断，行长一超过初始容量就会写越界。ASan 报 `heap-buffer-overflow`，本平台判 `RE`。注意判断条件要**给 `'\0'` 留位置**（`len + 1 >= cap` 才扩容），否则读满一个"刚好等于容量"的行时，收尾的 `line[len] = '\0';` 又会越界一个字节——这类 off-by-one 往往只在特定长度上才暴露。

```c file=main.c expect=RE
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    size_t cap = 16;
    size_t len = 0;
    char *line = malloc(cap);
    if (line == NULL) {
        return 0;
    }

    int ch;
    while ((ch = getchar()) != EOF && ch != '\n') {
        line[len] = (char)ch;               /* 错：容量只有 16，写满之后继续写就越界了 */
        len++;
    }
    line[len] = '\0';

    int words = 0;
    int in_word = 0;
    for (size_t i = 0; i < len; i++) {
        if (line[i] == ' ') {
            in_word = 0;
        } else if (!in_word) {
            words++;
            in_word = 1;
        }
    }

    printf("len=%zu\n", len);
    printf("words=%d\n", words);
    printf("reversed=");
    for (size_t i = len; i > 0; i--) {
        putchar(line[i - 1]);
    }
    putchar('\n');

    free(line);
    return 0;
}
```

### 把词数算成"空格数 + 1" [WA]
这个算法只有在"单词之间恰好一个空格、开头结尾没有空格"时才碰巧正确。行长里出现连续空格、行首空格、行尾空格时全错：`"a  b"` 只有 2 个词，却会算成 3；全是空格的一行会算成 N+1 个词。正确做法是用 `in_word` 状态只在"空格 → 非空格"的跳变处计数。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    size_t cap = 16;
    size_t len = 0;
    char *line = malloc(cap);
    if (line == NULL) {
        return 0;
    }

    int ch;
    while ((ch = getchar()) != EOF && ch != '\n') {
        if (len + 1 >= cap) {
            size_t newcap = cap * 2;
            char *tmp = realloc(line, newcap);
            if (tmp == NULL) {
                free(line);
                return 0;
            }
            line = tmp;
            cap = newcap;
        }
        line[len] = (char)ch;
        len++;
    }
    line[len] = '\0';

    size_t spaces = 0;
    for (size_t i = 0; i < len; i++) {
        if (line[i] == ' ') {
            spaces++;
        }
    }
    int words = (int)spaces + 1;            /* 错：连续空格、行首行尾空格都会多算 */

    printf("len=%zu\n", len);
    printf("words=%d\n", words);
    printf("reversed=");
    for (size_t i = len; i > 0; i--) {
        putchar(line[i - 1]);
    }
    putchar('\n');

    free(line);
    return 0;
}
```

### 反转循环的边界差一，丢了行首字符 [WA]
`for (size_t i = len; i > 1; i--) putchar(line[i - 1]);` 少走了一步：`i` 最后一次取 2 时打印的是 `line[1]`，`line[0]` 永远没被输出。长度为 1 的行会打印出空串。反转的循环边界要写 `i > 0`、下标 `i - 1`，或者从 `len` 开始倒着数够 `len` 次——两者等价，但别把终止条件写成 1。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    size_t cap = 16;
    size_t len = 0;
    char *line = malloc(cap);
    if (line == NULL) {
        return 0;
    }

    int ch;
    while ((ch = getchar()) != EOF && ch != '\n') {
        if (len + 1 >= cap) {
            size_t newcap = cap * 2;
            char *tmp = realloc(line, newcap);
            if (tmp == NULL) {
                free(line);
                return 0;
            }
            line = tmp;
            cap = newcap;
        }
        line[len] = (char)ch;
        len++;
    }
    line[len] = '\0';

    int words = 0;
    int in_word = 0;
    for (size_t i = 0; i < len; i++) {
        if (line[i] == ' ') {
            in_word = 0;
        } else if (!in_word) {
            words++;
            in_word = 1;
        }
    }

    printf("len=%zu\n", len);
    printf("words=%d\n", words);
    printf("reversed=");
    for (size_t i = len; i > 1; i--) {         /* 错：i 永远走不到 1，line[0] 丢了 */
        putchar(line[i - 1]);
    }
    putchar('\n');

    free(line);
    return 0;
}
```

### 用无符号数做倒序下标，写成 `i >= 0` [RE]
`for (size_t i = len - 1; i >= 0; i--)` 里 `i >= 0` 恒真：走到 0 之后 `i--` 回绕成 `SIZE_MAX`，`line[SIZE_MAX]` 直接把堆读穿。这类 bug 在 `-Wall` 下不一定有警告（`-Wtautological-unsigned-zero-compare` 只在部分版本开启），却是 C 里最经典的死循环 + 越界组合。要么用 `i > 0` 配 `i - 1`，要么用 `int` 并在读入时保证长度不超过 `INT_MAX`。

### 写成 `line = realloc(line, newcap)` [LEAK]
失败时 `realloc` 返回 `NULL`、原缓冲区保持不变；而赋值已经把 `line` 覆盖成 `NULL`，原缓冲区再也释放不掉——这正是 `realloc` 的经典陷阱。必须先用 `char *tmp` 接住，判空之后再赋给 `line`。

### 用 `scanf("%s")` 之类的函数读"一整行" [WA]
`%s` 遇到空格就停，`"hello world"` 只会读到 `hello`。读整行必须用 `getchar()` / `fgets()` 这类能感知换行的方式；本题还要求"长度未知"，所以边界由自己逐字符判断最直接。

## 测试用例
### 01 sample 示例 1
```in
hello world
```
```out
len=11
words=2
reversed=dlrow olleh
```

### 02 sample 示例 2
```in
 
```
```out
len=1
words=0
reversed=
```

### 03 degenerate 只有一个字符
```in
a
```
```out
len=1
words=1
reversed=a
```

### 04 trap 中间连续两个空格只算一次分隔
```in
a  b
```
```out
len=4
words=2
reversed=b  a
```

### 05 trap 行首有空格，整行只有一个词
```in
   hi
```
```out
len=5
words=1
reversed=ih
```

### 06 normal 三个词、中间单个空格
```in
C is fun
```
```out
len=8
words=3
reversed=nuf si C
```

### 07 trap 全是空格的一行
```in
     
```
```out
len=5
words=0
reversed=
```

### 生成 boundary 两万字符与两种"结尾"情形
```js gen
const cases = [];

function analyze(line) {
  let words = 0;
  let inWord = false;
  for (const ch of line) {
    if (ch === ' ') {
      inWord = false;
    } else if (!inWord) {
      words++;
      inWord = true;
    }
  }
  const reversed = line.split('').reverse().join('');
  return `len=${line.length}\nwords=${words}\nreversed=${reversed}\n`;
}

/* 最大规模：20000 个字符，词之间 1~3 个空格 */
{
  let line = '';
  for (let i = 0; i < 20000; i++) {
    const r = i % 11;
    if (r === 5 || r === 6) line += ' ';
    else line += String.fromCharCode(97 + (i % 26));
  }
  cases.push({
    kind: 'boundary',
    category: '20000 个字符、需要翻倍扩容 11 次',
    input: line + '\n',
    output: analyze(line),
  });
}

/* 退化：真正的空行（一个字符都没有，只有换行符） */
{
  cases.push({
    kind: 'degenerate',
    category: '空行：len=0 且 reversed 为空',
    input: '\n',
    output: analyze(''),
  });
}

/* 陷阱：最后一行没有换行符，直接 EOF 收尾 */
{
  const line = 'abc def';
  cases.push({
    kind: 'trap',
    category: '没有结尾换行符，靠 EOF 收尾',
    input: line,
    output: analyze(line),
  });
}

return cases;
```
