---json
{
  "id": "p-s2-string-nature-2",
  "title": "昵称截断：复制前 k 个字符后必须补上结束符",
  "difficulty": "L1",
  "knowledgePoints": ["s2-string-nature"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
界面显示昵称时，最多只显示前 `k` 个字符。给定一个单词和整数 `k`，请模拟这个过程：

1. 新建一个字符数组；
2. 把单词的前 `k` 个字符逐个复制过去；如果单词本身不到 `k` 个字符，就把它全部复制过去；
3. 在复制结束的位置补上 `'\0'`，让新数组成为合法的字符串；
4. 输出截断后的结果和它的长度。

`k` 可能等于 0（结果为空字符串），也可能比单词长度大（相当于不截断）。

## 输入格式
第一行一个单词，长度 1–50，只含可打印字符，不含空格等空白字符。

第二行一个整数 `k`。

## 输出格式
两行：

```out
[截断结果]
len=<截断后的长度>
```

结果用一对方括号包住，这样即使结果为空也能看清：`k = 0` 时第一行是 `[]`。

## 数据范围
单词长度：1 ≤ 长度 ≤ 50。

0 ≤ k ≤ 100。

## 示例
### 示例 1
```in
programming
4
```
```out
[prog]
len=4
```
> 只复制前 4 个字符 `p`、`r`、`o`、`g`，然后在 `prefix[4]` 补 `'\0'`。

### 示例 2（边界：k 比单词长）
```in
hi
10
```
```out
[hi]
len=2
```
> 单词只有 2 个字符，复制完整个单词就停下来，长度是 2 而不是 10。

## 提示
### 第 1 层
先确定要复制多少个字符：实际长度是 `k` 和单词长度的较小值。这个值要一边复制一边数出来。

### 第 2 层
用一个变量 `len` 表示"已经复制了几个字符"。循环条件同时检查 `len < k` 和 `word[len] != '\0'`，两个条件任一不满足就停止。

### 第 3 层
循环结束后 `len` 就是真实长度，紧接着写 `prefix[len] = '\0';`。结束符要补在**实际复制长度**处，不能补在 `prefix[k]`：当 `k` 比单词长时，中间会留下没复制过的位置。输出长度时用 `len`，不要用 `k`。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    char word[64];
    int k;
    if (scanf("%63s", word) != 1) {
        return 0;
    }
    if (scanf("%d", &k) != 1) {
        return 0;
    }

    char prefix[64];
    int len = 0;
    while (len < k && word[len] != '\0') {
        prefix[len] = word[len];
        len++;
    }
    prefix[len] = '\0';   /* 关键：在真实长度处补结束符 */

    printf("[%s]\n", prefix);
    printf("len=%d\n", len);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    char word[64];
    int k;
    if (scanf("%63s", word) != 1) {
        return 0;
    }
    if (scanf("%d", &k) != 1) {
        return 0;
    }

    char prefix[64];
    /* 把 word 的前 k 个字符复制到 prefix，并让它成为合法字符串 */
    prefix[0] = '\0';

    printf("[%s]\n", prefix);
    printf("len=0\n");
    return 0;
}
```

## 复杂度
时间 O(k)：最多复制 `k` 个字符（实际是 `min(k, 单词长度)` 个）。

空间 O(k)：需要一个新的字符数组存放结果，本题固定为 64 字节。

## 常见错误
### 复制完忘记补 `'\0'` [UB]
只把字符复制过去、没有在末尾写 `'\0'`，`printf("%s")` 会越过已经复制的部分继续读数组里未初始化的内容。结果可能是一串乱码，也可能碰巧遇到 0 而"看起来正确"——这种时对时错的错误最难排查。

### 循环条件写成 `len <= k`，多复制一个字符 [WA]
`len < k` 表示"最多复制 k 个"，写成 `<=` 就会复制 `k + 1` 个。`k = 0` 时甚至会先复制 `word[0]` 再结束。

```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    char word[64];
    int k;
    if (scanf("%63s", word) != 1) {
        return 0;
    }
    if (scanf("%d", &k) != 1) {
        return 0;
    }

    char prefix[64];
    int len = 0;
    while (len <= k && word[len] != '\0') {   /* 错：多复制了一个 */
        prefix[len] = word[len];
        len++;
    }
    prefix[len] = '\0';

    printf("[%s]\n", prefix);
    printf("len=%d\n", len);
    return 0;
}
```

### 把 `k` 当成截断后的长度 [WA]
当 `k` 比单词长时，实际只复制了单词长度个字符。如果输出 `len=%d` 时用 `k`，就会报告一个比真实内容更长的长度。

```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    char word[64];
    int k;
    if (scanf("%63s", word) != 1) {
        return 0;
    }
    if (scanf("%d", &k) != 1) {
        return 0;
    }

    char prefix[64];
    int len = 0;
    while (len < k && word[len] != '\0') {
        prefix[len] = word[len];
        len++;
    }
    prefix[len] = '\0';

    printf("[%s]\n", prefix);
    printf("len=%d\n", k);   /* 错：k 可能比单词长 */
    return 0;
}
```

### 结束符补在 `prefix[k]` 而不是 `prefix[len]` [UB]
如果 `k` 比单词长，`prefix[len]` 到 `prefix[k - 1]` 之间根本没有被赋值，把结束符写在 `prefix[k]` 等于让程序打印一段未初始化的内存。正确位置永远是 `prefix[len]`。

## 测试用例
### 01 sample 示例 1
```in
programming
4
```
```out
[prog]
len=4
```

### 02 sample 示例 2
```in
hi
10
```
```out
[hi]
len=2
```

### 03 boundary k 恰好等于单词长度
```in
hello
5
```
```out
[hello]
len=5
```

### 04 degenerate k 为 0
```in
abc
0
```
```out
[]
len=0
```

### 05 trap 只截取第一个字符
```in
abc
1
```
```out
[a]
len=1
```

### 06 trap 单词里混有数字
```in
c2026
3
```
```out
[c20]
len=3
```

### 07 normal 截取中间一段
```in
abcdefghij
7
```
```out
[abcdefg]
len=7
```

### 08 boundary 单词长度 50、k 也是 50
```in
abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwx
50
```
```out
[abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwx]
len=50
```

### 09 normal k 远大于单词长度
```in
hello
99
```
```out
[hello]
len=5
```
