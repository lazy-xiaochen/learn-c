---json
{
  "id": "p-s2-string-literal-1",
  "title": "月份名查询：只读字面量表与反序输出",
  "difficulty": "L2",
  "knowledgePoints": ["s2-string-literal", "s2-string-nature"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个日历程序内置了一张英文月份名表，这 12 个名字都以**字符串字面量**的形式写在程序里：

```c
"January" "February" "March" "April" "May" "June"
"July" "August" "September" "October" "November" "December"
```

现在要做一个小工具：输入若干个月份编号，对每个编号输出三行信息：

1. 该月的英文名；
2. 这个名字的字符个数（不含结尾的 `'\0'`）；
3. 把这个名字**倒过来**写出的字符串（例如 `March` 输出 `hcraM`）。

请注意这张表的性质：它们都是**字面量**，存放在只读数据段里，程序运行期间不能修改。

- 读它们、数长度、倒着打印字符，全都没问题；
- 但如果你想"就地反转"这个名字（像上一题反转用户输入的单词那样），就是在写只读内存，属于未定义行为，程序会直接崩溃；
- 想得到一份可写的副本，必须先用 `strcpy` 或逐字符复制到一个 `char buf[16]` 里，再对 `buf` 做修改。

所以这道题正确、简洁的做法是：**直接把字面量从后往前打印**，一个字节都不写。反序输出不需要修改原字符串。

## 输入格式
第一行一个整数 `n`（1 ≤ n ≤ 12）。
接下来一行（或几行）共 `n` 个整数 `m`，每个都在 1 到 12 之间，表示月份编号。

## 输出格式
对每个月份输出三行：
1. 英文月份名；
2. 名字的字符个数；
3. 名字的反序。

## 数据范围
- 1 ≤ n ≤ 12；
- 1 ≤ m ≤ 12；
- 月份名最长 9 个字符（`September`），最短 3 个字符（`May`）。

## 示例
### 示例 1
```in
3
3 8 1
```
```out
March
5
hcraM
August
6
tsuguA
January
7
yraunaJ
```
> 编号 3 对应 `March`（5 个字符），8 对应 `August`（6 个），1 对应 `January`（7 个）。反序就是把字符从后往前输出。

### 示例 2（边界：最长的月份名）
```in
1
9
```
```out
September
9
rebmetpeS
```
> `September` 是表里最长的名字，9 个字符；反序时第一个输出的是最后一个字符 `r`。

## 提示
### 第 1 层
先把 12 个名字放进一个数组里，用编号减 1 作为下标取出来。因为名字是字面量，数组元素的类型应当是 `const char *`——这样编译器会帮你拦住"想改它"的代码。

### 第 2 层
拿到 `const char *name` 之后，长度要自己数：`while (name[len] != '\0') len++;`。**不能用 `sizeof name`**，那是指针的大小（8），不是字符串长度。

### 第 3 层
反序输出用一个从 `len - 1` 递减到 0 的循环，逐个 `putchar(name[i])`，最后 `putchar('\n')`。注意起点是 `len - 1`（最后一个字符），不是 `len`（那是 `'\0'`）。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MONTHS 12

int main(void) {
    /* 月份名表：每一项都指向只读区里的字符串字面量。
     * const 写在两个位置 —— 名字不能改，字符串内容也不能改。 */
    static const char *const names[MONTHS] = {
        "January", "February", "March",     "April",   "May",      "June",
        "July",    "August",   "September", "October", "November", "December",
    };

    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }

    for (int k = 0; k < n; k++) {
        int m;
        if (scanf("%d", &m) != 1) {
            return 0;
        }
        if (m < 1 || m > MONTHS) {
            return 0;
        }

        const char *name = names[m - 1];

        int len = 0;
        while (name[len] != '\0') {
            len++;
        }

        printf("%s\n", name);
        printf("%d\n", len);
        for (int i = len - 1; i >= 0; i--) {
            putchar(name[i]);   /* 只是读字面量的字节，完全安全 */
        }
        putchar('\n');
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MONTHS 12

int main(void) {
    static const char *const names[MONTHS] = {
        "January", "February", "March",     "April",   "May",      "June",
        "July",    "August",   "September", "October", "November", "December",
    };

    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }

    for (int k = 0; k < n; k++) {
        int m;
        if (scanf("%d", &m) != 1) {
            return 0;
        }

        /* TODO:
         * 1. 取出 names[m - 1]；
         * 2. 数出它的长度（不能用 sizeof）；
         * 3. 输出名字、长度、反序。 */
        printf("%s\n", names[m - 1]);
        printf("0\n");
        printf("\n");
    }
    return 0;
}
```

## 复杂度
时间 O(n × L)：每个月份数一遍长度、倒着打印一遍，L 是月份名长度（不超过 9）。
空间 O(1)：只用了一个指针和几个计数器；名字本身在只读区，不占程序的额外空间。

## 常见错误
### 就地反转字面量 [RE]
把表里的指针当成可写字符串去交换字符，就是在写只读数据段。本平台上程序会直接报"非法内存访问"并终止。
```c file=main.c expect=RE
#include <stdio.h>

#define MONTHS 12

int main(void) {
    static char *names[MONTHS] = {   /* 丢掉了 const，编译器不再帮忙检查 */
        "January", "February", "March",     "April",   "May",      "June",
        "July",    "August",   "September", "October", "November", "December",
    };

    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }

    for (int k = 0; k < n; k++) {
        int m;
        if (scanf("%d", &m) != 1) {
            return 0;
        }
        char *name = names[m - 1];

        int len = 0;
        while (name[len] != '\0') {
            len++;
        }
        for (int i = 0, j = len - 1; i < j; i++, j--) {   /* 写只读区 */
            char t = name[i];
            name[i] = name[j];
            name[j] = t;
        }
        printf("%s\n", name);
    }
    return 0;
}
```
正确做法是只读着倒序打印，或者先复制到 `char buf[16]` 再反转。

### 反序循环从 `len` 开始 [WA]
`name[len]` 是 `'\0'`。从 `len` 开始倒着输出，第一行内容前面会多出一个不可见的 `'\0'` 字节，后面跟着整串字符，和预期答案不一致。
```c file=main.c expect=WA
#include <stdio.h>

#define MONTHS 12

int main(void) {
    static const char *const names[MONTHS] = {
        "January", "February", "March",     "April",   "May",       "June",
        "July",    "August",   "September", "October", "November",  "December",
    };

    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    for (int k = 0; k < n; k++) {
        int m;
        if (scanf("%d", &m) != 1) {
            return 0;
        }
        const char *name = names[m - 1];
        int len = 0;
        while (name[len] != '\0') {
            len++;
        }
        printf("%s\n", name);
        printf("%d\n", len);
        for (int i = len; i >= 0; i--) {    /* 错：应该从 len - 1 开始 */
            putchar(name[i]);
        }
        putchar('\n');
    }
    return 0;
}
```

### 用 `sizeof` 求月份名长度 [WA|RE]
`sizeof name` 是 `const char *` 的大小（8），不是字符串长度。所有月份都会被报成长度 8；而按 8 长度倒着读时，还会读到字符串结尾之后的内存（`RE`）。
```c file=main.c expect=WA
#include <stdio.h>

#define MONTHS 12

int main(void) {
    static const char *const names[MONTHS] = {
        "January", "February", "March",     "April",   "May",      "June",
        "July",    "August",   "September", "October", "November", "December",
    };

    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    for (int k = 0; k < n; k++) {
        int m;
        if (scanf("%d", &m) != 1) {
            return 0;
        }
        const char *name = names[m - 1];
        printf("%s\n", name);
        printf("%zu\n", sizeof name);      /* 错：指针的大小 */
        for (int i = (int)sizeof name - 1; i >= 0; i--) {
            putchar(name[i]);              /* 还会读到字符串外面去 */
        }
        putchar('\n');
    }
    return 0;
}
```

### 用 `const char *` 之后还想改 [CE]
这其实是最好的结果：`const` 把"写只读区"这个运行期灾难变成了编译期错误。
```c file=main.c expect=CE
#include <stdio.h>

int main(void) {
    const char *name = "March";
    name[0] = 'm';              /* 编译错误：read-only variable is not assignable */
    printf("%s\n", name);
    return 0;
}
```

### 月份下标忘了减 1 [WA]
数组下标从 0 开始。写 `names[m]` 会整体错位一个月（编号 3 输出 `April`），而 `m = 12` 时还会越界访问到数组之外。

## 测试用例
### 01 sample 示例 1
```in
3
3 8 1
```
```out
March
5
hcraM
August
6
tsuguA
January
7
yraunaJ
```

### 02 sample 示例 2
```in
1
9
```
```out
September
9
rebmetpeS
```

### 03 boundary 一次查询全部十二个月份
```in
12
1 2 3 4 5 6 7 8 9 10 11 12
```
```out
January
7
yraunaJ
February
8
yraurbeF
March
5
hcraM
April
5
lirpA
May
3
yaM
June
4
enuJ
July
4
yluJ
August
6
tsuguA
September
9
rebmetpeS
October
7
rebotcO
November
8
rebmevoN
December
8
rebmeceD
```

### 04 degenerate 只查一个最短的月份名
```in
1
5
```
```out
May
3
yaM
```

### 05 trap 首字母相同的月份
```in
4
1 6 7 5
```
```out
January
7
yraunaJ
June
4
enuJ
July
4
yluJ
May
3
yaM
```
> `January` / `June` / `July` 都以 `J` 开头，`March` / `May` 都以 `M` 开头——只按首字母查表会全部错。

### 06 trap 最短与最长的月份名
```in
2
5 9
```
```out
May
3
yaM
September
9
rebmetpeS
```

### 07 normal 下半年
```in
3
10 11 12
```
```out
October
7
rebotcO
November
8
rebmevoN
December
8
rebmeceD
```

### 08 trap 两个字的月份
```in
2
3 4
```
```out
March
5
hcraM
April
5
lirpA
```
> `March` 与 `April` 长度相同，但内容完全不同；反序结果也不能靠长度推算。
