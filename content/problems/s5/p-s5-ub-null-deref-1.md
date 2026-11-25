---json
{
  "id": "p-s5-ub-null-deref-1",
  "title": "子串首次出现：strstr 返回 NULL 之后",
  "difficulty": "L3",
  "knowledgePoints": ["s5-ub-null-deref"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
给定两个非空字符串 `s` 和 `t`，求 `t` 作为子串在 `s` 中**第一次**出现的位置（下标从 0 开始）。如果 `t` 不在 `s` 中，输出 `-1`。

用 `<string.h>` 里的 `strstr` 可以一行搞定查找，但它有一个必须处理的分支：**找不到时返回 `NULL`**。此时对返回值做 `p - s`、`p[0]`、`strlen(p)` 等任何操作都是未定义行为——`p - s` 可能算出一个荒唐的大负数，解引用则通常直接崩溃。

## 输入格式
一行两个非空字符串 `s`、`t`，用空白分隔，只包含小写字母和数字，长度都不超过 100。

## 输出格式
一行一个整数：`t` 在 `s` 中第一次出现的下标；不存在则输出 `-1`。

## 数据范围
1 ≤ |s| ≤ 100
1 ≤ |t| ≤ 100

`t` 可能比 `s` 长（这时必然找不到），也可能与 `s` 完全相同（这时答案是 0）。`s` 里可能有多次出现，只输出第一次。

## 示例
### 示例 1
```in
hello ll
```
```out
2
```
> `"ll"` 在 `"hello"` 中第一次出现在下标 2（字符 `l` 的位置）。

### 示例 2（边界：s 与 t 完全相同）
```in
abc abc
```
```out
0
```
> 答案是 0：`strstr` 返回的就是 `s` 的起始地址，`p - s == 0`。注意"在下标 0 找到"和"没找到"是两件完全不同的事，不能用同一个值表示。

## 提示
### 第 1 层
`strstr(s, t)` 返回"第一次出现位置的指针"，找不到时返回 `NULL`。先把这个返回值存进 `char *p`，然后**第一件事是判断它是不是 `NULL`**。

### 第 2 层
`p - s` 只有在 `p` 指向 `s` 这个数组内部时才有意义。`p == NULL` 时做这个减法就是 UB（得到的值可能是任意整数），所以必须写成：先判空输出 `-1`，再在 `else` 分支里算 `p - s`。

### 第 3 层
`t` 比 `s` 长、`s` 里根本没有 `t`、`t` 和 `s` 完全相同——这三种情况覆盖了本题所有的边界。写完之后自己构造这三组输入各跑一次。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXL 101

int main(void) {
    char s[MAXL] = { 0 };
    char t[MAXL] = { 0 };
    if (scanf("%100s %100s", s, t) != 2) {
        return 0;
    }
    char *p = strstr(s, t);
    if (p == NULL) {
        printf("-1\n");                  /* 没找到：strstr 返回 NULL，必须单独处理 */
    } else {
        printf("%d\n", (int)(p - s));
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXL 101

int main(void) {
    char s[MAXL] = { 0 };
    char t[MAXL] = { 0 };
    if (scanf("%100s %100s", s, t) != 2) {
        return 0;
    }
    char *p = strstr(s, t);
    printf("%d\n", (int)(p - s));        /* TODO: p 可能是 NULL，先判空再算 */
    return 0;
}
```

## 复杂度
时间 O(|s| × |t|)：`strstr` 最坏情况下每个起点都要逐字符比较（对 100 的长度来说完全够快）。
空间 O(1)：只多了两个字符数组。

## 常见错误
### 不判空就直接做指针相减 [WA]
`p - s` 在 `p == NULL` 时是 UB：算出来的是一个和 `s` 的地址有关的大负数，程序不崩、不报错，只是输出一个荒唐的值。样例里 `"ll"` 能找到，看不出问题；"找不到"的用例一跑就错。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXL 101

int main(void) {
    char s[MAXL] = { 0 };
    char t[MAXL] = { 0 };
    if (scanf("%100s %100s", s, t) != 2) {
        return 0;
    }
    char *p = strstr(s, t);
    printf("%d\n", (int)(p - s));        /* 错：p 可能是 NULL */
    return 0;
}
```

### 不判空就解引用 [UB]
`*p` 或 `p[0]` 在 `p == NULL` 时是通过空指针读数据。本平台的 UBSan 会报 `load of null pointer of type 'char'`，直接判 `UB`。

```c file=main.c expect=UB
#include <stdio.h>
#include <string.h>

#define MAXL 101

int main(void) {
    char s[MAXL] = { 0 };
    char t[MAXL] = { 0 };
    if (scanf("%100s %100s", s, t) != 2) {
        return 0;
    }
    char *p = strstr(s, t);
    if (p == NULL) {
        printf("%c\n", *p);             /* 错：想给出提示，却又解引用了 NULL */
    } else {
        printf("%d\n", (int)(p - s));
    }
    return 0;
}
```

### 没找到时输出 0 [WA]
把"没找到"写成 0，会让它和"在下标 0 找到"混在一起。`"abc"` 与 `"abc"` 的正确答案是 0，`"abc"` 与 `"b"` 的正确答案是 -1，两者不能共用同一个输出。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXL 101

int main(void) {
    char s[MAXL] = { 0 };
    char t[MAXL] = { 0 };
    if (scanf("%100s %100s", s, t) != 2) {
        return 0;
    }
    char *p = strstr(s, t);
    if (p == NULL) {
        printf("0\n");                   /* 错：没找到应该是 -1 */
    } else {
        printf("%d\n", (int)(p - s));
    }
    return 0;
}
```

### 对可能为 NULL 的返回值调用 `strlen` [UB]
`strlen(p)` 在 `p == NULL` 时同样是空指针解引用。想判断"是不是空字符串"之前，必须先确认指针不是 NULL。

## 测试用例
### 01 sample 示例 1
```in
hello ll
```
```out
2
```

### 02 sample 示例 2
```in
abc abc
```
```out
0
```

### 03 boundary 长度 100 且完全相同
```in
aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```
```out
0
```

### 04 degenerate 单字符且找不到
```in
a b
```
```out
-1
```

### 05 trap 后缀与前缀重叠
```in
aaab aab
```
```out
1
```

### 06 trap 前缀像但永远差一个字符
```in
aaaa aab
```
```out
-1
```

### 07 normal 80 个字符的长串
```in
aaaaababbaabaaaaaaaaababaaabbabaabbbbabaaaaaaabaaaabaaaababaaaaabbbaababaaaaaaaa abba
```
```out
6
```

### 08 trap t 比 s 长
```in
ab abc
```
```out
-1
```

### 09 trap 出现在末尾
```in
xyzab ab
```
```out
3
```
