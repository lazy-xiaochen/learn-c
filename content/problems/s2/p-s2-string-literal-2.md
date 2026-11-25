---json
{
  "id": "p-s2-string-literal-2",
  "title": "字面量改写事故复盘：第几步触发未定义行为",
  "difficulty": "L3",
  "knowledgePoints": ["s2-string-literal", "s2-char-array-vs-pointer"],
  "special": "ub-analysis",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
小林写了一个"批量替换"的小函数，把字符串里某个字母全部换成另一个字母：

```c
for (int i = 0; s[i] != '\0'; i++) {
    if (s[i] == from) {
        s[i] = to;          /* 唯一的写入点 */
    }
}
```

同一段循环，他用了两种写法来接字符串：

- **情况 `A`**：`char buf[] = "banana";` —— `buf` 是栈上自己的数组，写入合法；
- **情况 `L`**：`char *s = "banana";` —— `s` 指向只读区的字符串字面量，**任何一次写入都是未定义行为**。

现在请你写一个"事故复盘器"：给定初始单词、存储方式、以及一串替换规则，推演这次运行会发生什么。

推演规则（请严格按这个顺序理解）：

1. 规则按输入顺序一条一条执行，每条规则形如 `from to`，表示"把当前字符串里所有等于 `from` 的字符改成 `to`"；
2. 每条规则先用当前字符串检查一遍：**如果没有任何字符等于 `from`，这条规则什么也不写**（连内存都不碰），可以直接跳过；
3. 如果至少命中一个字符，这条规则**就要写入**：
   - 情况 `A`：真的把命中的字符逐个改掉，并把写入次数累加起来（`from` 和 `to` 相同时也要写，同样计入次数）；
   - 情况 `L`：第一次写入就是未定义行为，程序当场结束，不再继续后面的规则。

## 输入格式
第一行：`word kind n`，用一个空格分隔：
- `word`：初始单词，由小写字母组成，长度 1 到 20；
- `kind`：`A` 或 `L`，表示字符串存在数组里还是字面量里；
- `n`：替换规则的条数，0 ≤ n ≤ 8。

接下来 `n` 行，每行两个小写字母 `from to`，用一个空格分隔。

## 输出格式
只输出一行：

- 如果发生了未定义行为：`UB k`，其中 `k` 是第一次触发 UB 的规则序号（从 1 开始计数）；
- 如果没有发生 UB：`OK c s`，其中 `c` 是一共写入的字节数，`s` 是最终字符串，两者用一个空格分隔。

## 数据范围
- 单词长度：1 ≤ len ≤ 20，只含小写字母 `a`–`z`；
- `kind` 一定是 `A` 或 `L`；
- 规则条数：0 ≤ n ≤ 8；
- 每条规则的两个字符都是 `a`–`z`，可能相同；
- 输出行不超过 30 个字符。

## 示例
### 示例 1
```in
banana A 2
a o
n x
```
```out
OK 5 boxoxo
```
> 第 1 条规则 `a → o`：`banana` 里有 3 个 `a`，全部改成 `o`，得到 `bonono`，写入 3 次。第 2 条规则 `n → x`：`bonono` 里有 2 个 `n`，改成 `x` 得到 `boxoxo`，写入 2 次。总共 5 次，没有 UB。

### 示例 2（边界：一条规则都没有）
```in
a L 0
```
```out
OK 0 a
```
> 规则条数为 0，一个字节都没写。即使字符串是只读的字面量也完全安全，所以输出 `OK 0 a` 而不是 `UB`。

## 提示
### 第 1 层
先把"会不会写"这件事想清楚：每条规则执行前，先数一数当前字符串里有多少个字符等于 `from`。这个数字是 0，这条规则就是"空跑"，不产生任何写入。

### 第 2 层
对情况 `L`，只要某条规则命中数大于 0，就直接输出 `UB k` 并 `return`——它前面的规则都没写过，所以前面的内容其实没被破坏。对情况 `A`，要真的把命中的字符改掉，再把命中数累加到总次数里。

### 第 3 层
外层循环 `for (int k = 0; k < n; k++)`，内层先 `for (i...) if (word[i] == from[k]) hits++;`；`hits == 0` 就 `continue`；否则若 `kind == 'L'` 输出 `UB k+1` 并结束，若 `kind == 'A'` 再扫一遍逐个替换、`total += hits`。注意 `from == to` 时仍然算"写入"。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAXLEN 21
#define MAXRULES 8

int main(void) {
    char word[MAXLEN];
    char kind;
    int n;

    if (scanf("%20s", word) != 1) {
        return 0;
    }
    if (scanf(" %c", &kind) != 1) {
        return 0;
    }
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    if (n < 0 || n > MAXRULES) {
        return 0;
    }

    char from[MAXRULES], to[MAXRULES];
    for (int k = 0; k < n; k++) {
        char a, b;
        if (scanf(" %c %c", &a, &b) != 2) {
            return 0;
        }
        from[k] = a;
        to[k] = b;
    }

    int len = 0;
    while (word[len] != '\0') {
        len++;
    }

    int total = 0;
    for (int k = 0; k < n; k++) {
        /* 先数一数这一步会命中几个字符：一个都没有 = 一个字节都不用写 */
        int hits = 0;
        for (int i = 0; i < len; i++) {
            if (word[i] == from[k]) {
                hits++;
            }
        }
        if (hits == 0) {
            continue;
        }

        /* 要写了：目标是字面量的话，这一步就是未定义行为 */
        if (kind == 'L') {
            printf("UB %d\n", k + 1);
            return 0;
        }

        for (int i = 0; i < len; i++) {
            if (word[i] == from[k]) {
                word[i] = to[k];   /* from 与 to 相同时也照写不误 */
            }
        }
        total += hits;
    }

    printf("OK %d %s\n", total, word);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAXLEN 21
#define MAXRULES 8

int main(void) {
    char word[MAXLEN];
    char kind;
    int n;

    if (scanf("%20s", word) != 1) {
        return 0;
    }
    if (scanf(" %c", &kind) != 1) {
        return 0;
    }
    if (scanf("%d", &n) != 1) {
        return 0;
    }

    /* TODO:
     * 1. 读入 n 条规则（每行 "from to"）；
     * 2. 逐条模拟：先数命中数，0 就跳过；
     * 3. kind == 'L' 且命中数 > 0 → 输出 "UB k" 并结束；
     * 4. 否则真的替换、累计写入次数，最后输出 "OK c s"。 */
    printf("OK 0 %s\n", word);
    return 0;
}
```

## 复杂度
时间 O(n × len)：每条规则最多扫两遍字符串，n ≤ 8、len ≤ 20，最多几百次操作。
空间 O(1)：规则存在两个长度 8 的小数组里，单词最多 21 字节。

## 常见错误
### 把"没有命中"也当成一次写入 [WA]
只要命中数为 0，就一个字节都没写，情况 `L` 也是安全的。把每条规则都当成"会写"，会在本该 `OK` 的地方报告 `UB 1`。
```c file=main.c expect=WA
#include <stdio.h>

#define MAXLEN 21
#define MAXRULES 8

int main(void) {
    char word[MAXLEN];
    char kind;
    int n;
    if (scanf("%20s", word) != 1) return 0;
    if (scanf(" %c", &kind) != 1) return 0;
    if (scanf("%d", &n) != 1) return 0;

    char from[MAXRULES], to[MAXRULES];
    for (int k = 0; k < n; k++) {
        char a, b;
        if (scanf(" %c %c", &a, &b) != 2) return 0;
        from[k] = a;
        to[k] = b;
    }

    int len = 0;
    while (word[len] != '\0') len++;

    int total = 0;
    for (int k = 0; k < n; k++) {
        if (kind == 'L') {                 /* 错：没检查这一步到底有没有命中 */
            printf("UB %d\n", k + 1);
            return 0;
        }
        for (int i = 0; i < len; i++) {
            if (word[i] == from[k]) {
                word[i] = to[k];
                total++;
            }
        }
    }
    printf("OK %d %s\n", total, word);
    return 0;
}
```

### `from` 与 `to` 相同时直接跳过 [WA]
"把 `a` 改成 `a`"看起来什么也没变，但它仍然是一次**写入**：对字面量来说就是 UB，对数组来说也要计入写入次数。
```c file=main.c expect=WA
#include <stdio.h>

#define MAXLEN 21
#define MAXRULES 8

int main(void) {
    char word[MAXLEN];
    char kind;
    int n;
    if (scanf("%20s", word) != 1) return 0;
    if (scanf(" %c", &kind) != 1) return 0;
    if (scanf("%d", &n) != 1) return 0;

    char from[MAXRULES], to[MAXRULES];
    for (int k = 0; k < n; k++) {
        char a, b;
        if (scanf(" %c %c", &a, &b) != 2) return 0;
        from[k] = a;
        to[k] = b;
    }

    int len = 0;
    while (word[len] != '\0') len++;

    int total = 0;
    for (int k = 0; k < n; k++) {
        if (from[k] == to[k]) {            /* 错：这一步其实也要写 */
            continue;
        }
        int hits = 0;
        for (int i = 0; i < len; i++) {
            if (word[i] == from[k]) hits++;
        }
        if (hits == 0) continue;
        if (kind == 'L') {
            printf("UB %d\n", k + 1);
            return 0;
        }
        for (int i = 0; i < len; i++) {
            if (word[i] == from[k]) word[i] = to[k];
        }
        total += hits;
    }
    printf("OK %d %s\n", total, word);
    return 0;
}
```

### 命中多个字符时只累计 1 次 [WA]
`total` 统计的是**写入的字节数**，不是"执行过几条规则"。一条规则命中 3 个字符，就要加 3。
```c file=main.c expect=WA
#include <stdio.h>

#define MAXLEN 21
#define MAXRULES 8

int main(void) {
    char word[MAXLEN];
    char kind;
    int n;
    if (scanf("%20s", word) != 1) return 0;
    if (scanf(" %c", &kind) != 1) return 0;
    if (scanf("%d", &n) != 1) return 0;

    char from[MAXRULES], to[MAXRULES];
    for (int k = 0; k < n; k++) {
        char a, b;
        if (scanf(" %c %c", &a, &b) != 2) return 0;
        from[k] = a;
        to[k] = b;
    }

    int len = 0;
    while (word[len] != '\0') len++;

    int total = 0;
    for (int k = 0; k < n; k++) {
        int hits = 0;
        for (int i = 0; i < len; i++) {
            if (word[i] == from[k]) hits++;
        }
        if (hits == 0) continue;
        if (kind == 'L') {
            printf("UB %d\n", k + 1);
            return 0;
        }
        for (int i = 0; i < len; i++) {
            if (word[i] == from[k]) word[i] = to[k];
        }
        total += 1;                        /* 错：应该加 hits */
    }
    printf("OK %d %s\n", total, word);
    return 0;
}
```

### 用真的字面量指针来"模拟" [CE]
有人想"既然是复盘，那我直接写一段真的会崩的代码试试"。把字面量赋给 `const char *` 之后再写它，编译器会直接拒绝——这其实是好事，错误在编译期就被抓住了。
```c file=main.c expect=CE
#include <stdio.h>

int main(void) {
    const char *lit = "banana";
    lit[0] = 'o';              /* 编译错误：read-only variable is not assignable */
    printf("%s\n", lit);
    return 0;
}
```

### 忘记累加已经发生的替换 [WA]
每条规则都要基于**上一条规则执行后的字符串**来判断。如果每次都拿原始单词去数命中数，后面的规则会算出错误的结果，最终字符串也不对。

## 测试用例
### 01 sample 示例 1
```in
banana A 2
a o
n x
```
```out
OK 5 boxoxo
```

### 02 sample 示例 2
```in
a L 0
```
```out
OK 0 a
```

### 03 boundary 最长单词与最多规则
```in
abcdefghijklmnopqrst A 8
a b
b c
c d
d e
e f
f g
g h
h i
```
```out
OK 36 iiiiiiiiijklmnopqrst
```
> 每条规则都基于上一步的结果：命中数依次是 1、2、3、4、5、6、7、8，合计 36。

### 04 degenerate 唯一一条规则没有命中
```in
a A 1
z y
```
```out
OK 0 a
```

### 05 trap 规则的两个字母相同
```in
abc L 1
a a
```
```out
UB 1
```
> "把 `a` 改成 `a`"仍然是一次写入，目标是字面量，所以第一步就 UB。

### 06 trap 前一步没命中，后一步命中
```in
banana L 2
z y
n x
```
```out
UB 2
```
> 第 1 条规则没有任何字符等于 `z`，一个字节都没写，所以安全；第 2 条规则命中 `n`，触发 UB。

### 07 normal 替换链条
```in
banana A 3
a o
n x
o e
```
```out
OK 8 bexexe
```
> `a→o` 写 3 次（`bonono`），`n→x` 写 2 次（`boxoxo`），`o→e` 写 3 次（`bexexe`），共 8 次。

### 08 normal 规则一次都没命中
```in
mississippi A 3
z y
q w
j k
```
```out
OK 0 mississippi
```
> 三条规则都没有命中，字符串原样输出，写入次数是 0。

### 09 boundary 字面量一直安全到最后一步
```in
abcdefgh L 8
z y
y x
x w
w v
v u
u t
t s
h i
```
```out
UB 8
```
> 前 7 条规则都没有命中（`abcdefgh` 里没有 `z`、`y`、`x`、`w`、`v`、`u`、`t`），直到第 8 条才命中 `h`。
