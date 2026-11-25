---json
{
  "id": "p-s2-sizeof-strlen-2",
  "title": "容量够不够：复制字符串要算上结尾的 '\\0'",
  "difficulty": "L2",
  "knowledgePoints": ["s2-sizeof-strlen"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
要把一个单词复制进一块容量为 `cap` 字节的缓冲区。复制之前必须先检查"放不放得下"。

一个长度为 `n` 的字符串需要 **`n + 1`** 个字节：`n` 个字节放字符，最后 1 个字节放结束符 `'\0'`。少算这一个字节，就是常见的缓冲区溢出。

给定单词和缓冲区容量，请计算实际需要多少字节，并判断是否放得下：

- 放得下输出 `FIT`；
- 放不下输出 `OVERFLOW` 以及超出多少字节。

注意：容量**刚好等于**需要字节数时是放得下的。

## 输入格式
第一行一个单词，长度 1–30，只含可打印字符，不含空白字符。

第二行一个整数 `cap`，表示缓冲区容量（字节数）。

## 输出格式
第一行：

```out
need=<需要的字节数>
```

第二行：

- 放得下时输出 `FIT`；
- 放不下时输出 `OVERFLOW <超出的字节数>`。

## 数据范围
单词长度：1 ≤ 长度 ≤ 30。

1 ≤ cap ≤ 40。

## 示例
### 示例 1
```in
cat
4
```
```out
need=4
FIT
```
> `cat` 有 3 个字符，加上 `'\0'` 需要 4 字节；容量正好 4，放得下。

### 示例 2（边界：容量正好等于字符数）
```in
hello
5
```
```out
need=6
OVERFLOW 1
```
> `hello` 有 5 个字符，但需要 5 + 1 = 6 字节。容量 5 只能放下字符，没地方放 `'\0'`，所以还差 1 字节。

## 提示
### 第 1 层
先求单词的字符数，再想清楚：要让它在 C 里成为字符串，还额外需要几个字节？

### 第 2 层
`strlen(word)` 返回字符数 `n`，需要的总字节数是 `n + 1`。那 1 个字节专门用来放 `'\0'`。

### 第 3 层
比较时写 `need <= cap`。容量等于 `need` 是合法的（最后一个字节正好放结束符）；只有 `need > cap` 才输出 `OVERFLOW`，超出的数量是 `need - cap`。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

int main(void) {
    char word[64];
    int cap;
    if (scanf("%63s", word) != 1) {
        return 0;
    }
    if (scanf("%d", &cap) != 1) {
        return 0;
    }

    size_t need = strlen(word) + 1;   /* 字符数 + 结束符 */

    printf("need=%zu\n", need);
    if (need <= (size_t)cap) {
        printf("FIT\n");
    } else {
        printf("OVERFLOW %zu\n", need - (size_t)cap);
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

int main(void) {
    char word[64];
    int cap;
    if (scanf("%63s", word) != 1) {
        return 0;
    }
    if (scanf("%d", &cap) != 1) {
        return 0;
    }

    /* 先算出复制这个字符串需要多少字节，再和 cap 比较 */
    printf("need=0\n");
    printf("FIT\n");
    return 0;
}
```

## 复杂度
时间 O(n)：`strlen` 需要扫描一遍单词。

空间 O(n)：保存单词的字符数组，本题固定为 64 字节。

## 常见错误
### 忘记给 `'\0'` 留位置 [WA]
只算字符数、忘记加 1。当容量刚好等于字符数时，程序会误判为"放得下"，实际复制时会写越界。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    char word[64];
    int cap;
    if (scanf("%63s", word) != 1) {
        return 0;
    }
    if (scanf("%d", &cap) != 1) {
        return 0;
    }

    size_t need = strlen(word);   /* 错：少算了 '\0' */

    printf("need=%zu\n", need);
    if (need <= (size_t)cap) {
        printf("FIT\n");
    } else {
        printf("OVERFLOW %zu\n", need - (size_t)cap);
    }
    return 0;
}
```

### 用 `sizeof word` 当需要的字节数 [WA]
`word` 是容量 64 的数组，`sizeof word` 永远是 64，和实际字符串长度无关。复制字符串需要的是 `strlen(word) + 1`，不是数组容量。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    char word[64];
    int cap;
    if (scanf("%63s", word) != 1) {
        return 0;
    }
    if (scanf("%d", &cap) != 1) {
        return 0;
    }

    size_t need = sizeof word;   /* 错：这是数组容量，不是字符串所需空间 */

    printf("need=%zu\n", need);
    if (need <= (size_t)cap) {
        printf("FIT\n");
    } else {
        printf("OVERFLOW %zu\n", need - (size_t)cap);
    }
    return 0;
}
```

### 判断条件写成 `<` 而不是 `<=` [WA]
容量恰好等于 `need` 时，最后一个字节刚好放 `'\0'`，是合法的。用 `<` 会把"正好放下"误判成溢出。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    char word[64];
    int cap;
    if (scanf("%63s", word) != 1) {
        return 0;
    }
    if (scanf("%d", &cap) != 1) {
        return 0;
    }

    size_t need = strlen(word) + 1;

    printf("need=%zu\n", need);
    if (need < (size_t)cap) {   /* 错：相等时应该算放得下 */
        printf("FIT\n");
    } else {
        printf("OVERFLOW %zu\n", need - (size_t)cap);
    }
    return 0;
}
```

### 超出字节数写成 `cap - need` [WA]
当 `cap < need` 时，`cap - need` 是负数；而 `size_t` 是无符号类型，结果会回绕成一个巨大的数。例如 `programming` 需要 12 字节、容量 8，正确结果是 `OVERFLOW 4`，写反会输出一个莫名其妙的巨大数字。应始终写 `need - cap`。

## 测试用例
### 01 sample 示例 1
```in
cat
4
```
```out
need=4
FIT
```

### 02 sample 示例 2
```in
hello
5
```
```out
need=6
OVERFLOW 1
```

### 03 boundary 容量恰好等于需要字节数
```in
hello
6
```
```out
need=6
FIT
```

### 04 degenerate 一个字符、容量 1
```in
a
1
```
```out
need=2
OVERFLOW 1
```

### 05 trap 容量等于字符数
```in
abc
3
```
```out
need=4
OVERFLOW 1
```

### 06 trap 单词长度达到上限 30
```in
abcdefghijklmnopqrstuvwxyz0123
31
```
```out
need=31
FIT
```

### 07 normal 容量远大于需要
```in
cat
10
```
```out
need=4
FIT
```

### 08 normal 差 4 个字节
```in
programming
8
```
```out
need=12
OVERFLOW 4
```

### 09 trap 以 0 开头的数字串也是字符
```in
007
4
```
```out
need=4
FIT
```

### 10 normal 30 个字符、容量 40
```in
abcdefghijklmnopqrstuvwxyz0123
40
```
```out
need=31
FIT
```
