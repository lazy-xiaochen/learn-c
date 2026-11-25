---json
{
  "id": "p-s2-string-traverse-1",
  "title": "回文检测：跳过标点并忽略大小写",
  "difficulty": "L2",
  "knowledgePoints": ["s2-string-traverse"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
"回文"是指正着读和倒着读都一样的文字。判断回文时，通常有几条约定：

- 只考虑**字母和数字**，空格、逗号、冒号、感叹号等一律跳过；
- 字母**不区分大小写**，`A` 和 `a` 视为同一个字符；
- 如果一个字母和数字都没有（例如整行都是标点），视为回文。

请读入一行文字，判断它是不是回文。

## 输入格式
一行，长度 1–100，由可打印 ASCII 字符组成（可以包含空格与标点）。

## 输出格式
输出一行：

- 是回文输出 `YES`；
- 不是回文输出 `NO`。

## 数据范围
1 ≤ 行长 ≤ 100。

字符串中可能包含空格、标点、数字；不包含制表符。

## 示例
### 示例 1
```in
A man, a plan, a canal: Panama
```
```out
YES
```
> 只保留字母并统一成小写后得到 `amanaplanacanalpanama`，它正着读和倒着读一样。空格、逗号、冒号都被跳过了。

### 示例 2（边界：只有一个字符）
```in
a
```
```out
YES
```
> 长度为 1 的字符串正反读相同，是回文。

## 提示
### 第 1 层
用两个下标从两端向中间走。每走一步，先问自己：当前这个字符需不需要参与比较？

### 第 2 层
用 `isalnum` 判断字符是不是字母或数字，用 `tolower` 统一大小写。如果左边不是字母数字就跳过；如果右边不是就跳过；两边都是时才比较。

### 第 3 层
循环写成 `while (left < right)`：左边遇到非字母数字就 `left++`，右边遇到非字母数字就 `right--`，否则比较 `tolower` 后的值，不同就输出 `NO` 并结束。循环自然结束时输出 `YES`。整行没有字母数字时循环不会执行，也会输出 `YES`。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <ctype.h>
#include <string.h>

int main(void) {
    char line[128];
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    line[strcspn(line, "\n")] = '\0';

    int left = 0;
    int right = (int)strlen(line) - 1;
    int ok = 1;

    while (left < right) {
        unsigned char a = (unsigned char)line[left];
        unsigned char b = (unsigned char)line[right];

        if (!isalnum(a)) {
            left++;
        } else if (!isalnum(b)) {
            right--;
        } else {
            if (tolower(a) != tolower(b)) {
                ok = 0;
                break;
            }
            left++;
            right--;
        }
    }

    printf("%s\n", ok ? "YES" : "NO");
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <ctype.h>
#include <string.h>

int main(void) {
    char line[128];
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    line[strcspn(line, "\n")] = '\0';

    /* 用左右两个下标向中间比较：
       跳过不是字母/数字的字符，并忽略字母大小写 */
    printf("NO\n");
    return 0;
}
```

## 复杂度
时间 O(n)：左右两个下标最多各走 n 步，每个字符只被检查常数次。

空间 O(n)：只需要一个能容纳整行的字符数组（本题 128 字节）。

## 常见错误
### 不跳过空格和标点，直接比较原字符 [WA]
`A man, a plan, a canal: Panama` 的第二个字符是空格，而倒数第二个字符是 `a`，直接比较会立刻判成不是回文。

```c file=main.c expect=WA
#include <stdio.h>
#include <ctype.h>
#include <string.h>

int main(void) {
    char line[128];
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    line[strcspn(line, "\n")] = '\0';

    int left = 0;
    int right = (int)strlen(line) - 1;
    int ok = 1;

    while (left < right) {
        if (tolower((unsigned char)line[left]) != tolower((unsigned char)line[right])) {
            ok = 0;
            break;
        }
        left++;
        right--;
    }

    printf("%s\n", ok ? "YES" : "NO");
    return 0;
}
```

### 跳过标点但没有忽略大小写 [WA]
`A` 和 `a` 的编码分别是 65 和 97，直接比较不相等。所有大小写混排的回文都会被误判。

```c file=main.c expect=WA
#include <stdio.h>
#include <ctype.h>
#include <string.h>

int main(void) {
    char line[128];
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    line[strcspn(line, "\n")] = '\0';

    int left = 0;
    int right = (int)strlen(line) - 1;
    int ok = 1;

    while (left < right) {
        if (!isalnum((unsigned char)line[left])) {
            left++;
        } else if (!isalnum((unsigned char)line[right])) {
            right--;
        } else {
            if (line[left] != line[right]) {   /* 错：没有统一大小写 */
                ok = 0;
                break;
            }
            left++;
            right--;
        }
    }

    printf("%s\n", ok ? "YES" : "NO");
    return 0;
}
```

### 只用 `isalpha`，把数字排除在外 [WA]
题目要求字母和数字都参与比较。若用 `isalpha` 判断，数字会被当成标点跳过，`0P` 这种字符串就会被误判成回文。

```c file=main.c expect=WA
#include <stdio.h>
#include <ctype.h>
#include <string.h>

int main(void) {
    char line[128];
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    line[strcspn(line, "\n")] = '\0';

    int left = 0;
    int right = (int)strlen(line) - 1;
    int ok = 1;

    while (left < right) {
        if (!isalpha((unsigned char)line[left])) {   /* 错：数字也应该参与 */
            left++;
        } else if (!isalpha((unsigned char)line[right])) {
            right--;
        } else {
            if (tolower((unsigned char)line[left]) != tolower((unsigned char)line[right])) {
                ok = 0;
                break;
            }
            left++;
            right--;
        }
    }

    printf("%s\n", ok ? "YES" : "NO");
    return 0;
}
```

### 把 `char` 直接传给 `isalnum` / `tolower` [UB]
当字节值大于 127 且 `char` 有符号时，传入的是负数；标准只允许 `EOF` 或 `unsigned char` 范围内的值。应该先转成 `unsigned char` 再调用这些函数。

### 用无符号数保存 `strlen(line) - 1` [UB]
如果写成 `size_t right = strlen(line) - 1;`，当字符串为空时 `right` 会回绕成 `SIZE_MAX`，比较 `line[right]` 立刻越界。本题保证行长至少为 1，但处理其他文本时，读入空行（只有换行符）就会触发这个错误。更稳妥的做法是先判断长度是否为 0。

## 测试用例
### 01 sample 示例 1
```in
A man, a plan, a canal: Panama
```
```out
YES
```

### 02 sample 示例 2
```in
a
```
```out
YES
```

### 03 boundary 100 个字符的回文
```in
abababababababababababababababababababababababababbababababababababababababababababababababababababa
```
```out
YES
```

### 04 degenerate 整行都是标点，没有字母和数字
```in
...
```
```out
YES
```

### 05 trap 两个不同的字符
```in
ab
```
```out
NO
```

### 06 trap 大小写不同但应视为相同
```in
aA
```
```out
YES
```

### 07 trap 标点不对称，必须跳过
```in
a,!a
```
```out
YES
```

### 08 trap 数字和字母都要参与比较
```in
0P
```
```out
NO
```

### 09 normal 经典回文单词
```in
racecar
```
```out
YES
```

### 10 normal 普通单词不是回文
```in
hello
```
```out
NO
```
