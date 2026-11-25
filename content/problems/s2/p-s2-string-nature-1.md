---json
{
  "id": "p-s2-string-nature-1",
  "title": "协议字段解码：'\\0' 之前的字节才是字符串",
  "difficulty": "L1",
  "knowledgePoints": ["s2-string-nature"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
设备通过串口送来一个定长字段：一共 `n` 个字节，每个字节用一个整数给出。本题中字节的取值只有两种：`0`（表示 `'\0'`）和可打印字符的编码（32–126）。

C 语言没有单独的字符串类型，只有当字节序列中出现编码为 `0` 的字节时，这段数据才能作为字符串使用：字符串在第一个 `'\0'` 处结束，它后面的字节虽然还在数组里，但不属于这个字符串。

请你按 C 的规则解码这个字段：

- 如果 `n` 个字节里**没有** `0`，说明它不是合法的 C 字符串，输出 `NO`；
- 否则依次输出：`OK`、字符串长度、字符串内容。长度等于第一个 `0` 的下标；长度可能是 0，此时内容是空的。

## 输入格式
第一行一个整数 `n`。

第二行 `n` 个整数，用空格分隔，表示这 `n` 个字节。

## 输出格式
如果没有 `0`，只输出一行：

```out
NO
```

否则输出三行：

```out
OK
len=<长度>
text=<内容>
```

长度为 0 时第三行是 `text=`（等号后面没有字符）。

## 数据范围
1 ≤ n ≤ 20

每个字节的取值为 0 或 32–126 之间的整数。

输入保证第二行恰好有 `n` 个整数。

## 示例
### 示例 1
```in
5
104 105 0 33 34
```
```out
OK
len=2
text=hi
```
> 前两个字节是 `'h'`、`'i'`，第三个字节是 `0`，所以字符串是 `hi`，长度为 2。后面的 33、34 是 `'!'`、`'"'`，不属于这个字符串。

### 示例 2（边界：唯一的字节就是结束符）
```in
1
0
```
```out
OK
len=0
text=
```
> 第一个字节就是 `'\0'`，这是一个空字符串：长度为 0，内容为空。

## 提示
### 第 1 层
先把所有字节读进一个字符数组，再思考一个问题：怎样在数组里找到字符串的结尾？

### 第 2 层
从下标 0 开始逐个检查，第一个值等于 `0` 的字节就是 `'\0'`，它的下标正好等于字符串长度。如果一直检查到第 `n` 个字节都没有找到，说明这段数据没有结束符。

### 第 3 层
用 `for (int i = 0; i < n; i++)` 找到第一个 `field[i] == '\0'` 的位置，记下 `len = i` 并立刻 `break`。输出内容时只输出前 `len` 个字节，不要输出 `0` 和它后面的字节。注意长度为 0 时仍然要输出 `text=` 这一行。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }

    char field[32];
    for (int i = 0; i < n; i++) {
        int byte;
        if (scanf("%d", &byte) != 1) {
            return 0;
        }
        field[i] = (char)byte;
    }

    int len = -1;
    for (int i = 0; i < n; i++) {
        if (field[i] == '\0') {
            len = i;
            break;
        }
    }

    if (len < 0) {
        printf("NO\n");
        return 0;
    }

    printf("OK\nlen=%d\ntext=", len);
    for (int i = 0; i < len; i++) {
        putchar(field[i]);
    }
    putchar('\n');
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }

    char field[32];
    for (int i = 0; i < n; i++) {
        int byte;
        if (scanf("%d", &byte) != 1) {
            return 0;
        }
        field[i] = (char)byte;
    }

    /* 在这里找到第一个值为 0 的字节，按它的下标输出长度和内容 */
    printf("NO\n");
    return 0;
}
```

## 复杂度
时间 O(n)：读入 `n` 个字节一次，查找结束符一次，输出内容一次。

空间 O(n)：用一个长度 32 的字符数组保存字段即可。

## 常见错误
### 没有结束符时也按字符串输出 [WA]
下面的写法假设输入一定有 `'\0'`：找不到时把 `len` 走到 `n`，然后照样输出。对于没有 `0` 的用例，它输出 `OK` 而不是 `NO`。

```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }

    char field[32];
    for (int i = 0; i < n; i++) {
        int byte;
        if (scanf("%d", &byte) != 1) {
            return 0;
        }
        field[i] = (char)byte;
    }

    int len = 0;
    while (len < n && field[len] != '\0') {
        len++;
    }

    printf("OK\nlen=%d\ntext=", len);
    for (int i = 0; i < len; i++) {
        putchar(field[i]);
    }
    putchar('\n');
    return 0;
}
```

### 把 `'\0'` 当成字符 `'0'` [WA]
`'\0'` 的编码是 0，字符 `'0'` 的编码是 48，两者完全不同。写成 `if (field[i] == '0')` 会漏掉真正的结束符，还可能把内容里的数字 0 当成结尾。

```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }

    char field[32];
    for (int i = 0; i < n; i++) {
        int byte;
        if (scanf("%d", &byte) != 1) {
            return 0;
        }
        field[i] = (char)byte;
    }

    int len = -1;
    for (int i = 0; i < n; i++) {
        if (field[i] == '0') {   /* 错：'0' 的编码是 48 */
            len = i;
            break;
        }
    }

    if (len < 0) {
        printf("NO\n");
        return 0;
    }

    printf("OK\nlen=%d\ntext=", len);
    for (int i = 0; i < len; i++) {
        putchar(field[i]);
    }
    putchar('\n');
    return 0;
}
```

### 把结束符后面的字节也输出了 [WA]
长度算对了，但打印时循环到 `n` 而不是 `len`。这样会把 `'\0'` 以及它后面的字符一起输出，输出内容对不上。

```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }

    char field[32];
    for (int i = 0; i < n; i++) {
        int byte;
        if (scanf("%d", &byte) != 1) {
            return 0;
        }
        field[i] = (char)byte;
    }

    int len = -1;
    for (int i = 0; i < n; i++) {
        if (field[i] == '\0') {
            len = i;
            break;
        }
    }

    if (len < 0) {
        printf("NO\n");
        return 0;
    }

    printf("OK\nlen=%d\ntext=", len);
    for (int i = 0; i < n; i++) {   /* 错：应该只到 len */
        putchar(field[i]);
    }
    putchar('\n');
    return 0;
}
```

### 直接用 strlen / %s 读没有校验过的字段 [UB]
如果 `n` 个字节里没有 `0`，`strlen(field)` 和 `printf("%s", field)` 会越过数组末尾继续找结束符，读到什么完全不可控，属于未定义行为。应该先在 `0..n-1` 范围内自己找结束符，确认存在后再当字符串用。

## 测试用例
### 01 sample 示例 1
```in
5
104 105 0 33 34
```
```out
OK
len=2
text=hi
```

### 02 sample 示例 2
```in
1
0
```
```out
OK
len=0
text=
```

### 03 boundary 20 个字节全都没有结束符
```in
20
72 101 108 108 111 32 87 111 114 108 100 33 65 66 67 68 69 70 71 72
```
```out
NO
```

### 04 degenerate 第一个字节是 0、后面还有字节
```in
2
0 65
```
```out
OK
len=0
text=
```

### 05 trap 结束符在中间
```in
8
99 97 116 0 100 111 103 0
```
```out
OK
len=3
text=cat
```

### 06 trap 内容里有字符 '0'（编码 48）
```in
6
80 48 75 0 33 0
```
```out
OK
len=3
text=P0K
```

### 07 normal 结束符在最后一个字节
```in
5
104 101 108 108 0
```
```out
OK
len=4
text=hell
```

### 08 normal 带空格和标点
```in
7
72 105 44 32 67 33 0
```
```out
OK
len=6
text=Hi, C!
```

### 09 trap 连续两个结束符
```in
5
100 111 103 0 0
```
```out
OK
len=3
text=dog
```
