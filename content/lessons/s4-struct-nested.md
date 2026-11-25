---
id: s4-struct-nested
---

## 讲解

### 结构体的成员可以是另一个结构体
一个学生有学号、姓名、成绩，还有一个出生日期；出生日期本身又由年、月、日三个部分组成。这时最自然的写法不是把 `year`、`month`、`day` 平铺进 `Student`，而是先定义一个 `Date`，再让 `Student` 的一个成员是 `Date`：

```c
struct Date {
    short year;
    char month;
    char day;
};

struct Student {
    int id;
    struct Date birth;   /* 成员的类型是另一个结构体 */
    char name[8];
    int score;
};
```

`birth` 是一个**内嵌的完整 `Date` 对象**，不是指针：`struct Student` 的大小里包含了一整个 `struct Date` 的 4 个字节。访问它的成员要一层一层写：`s.birth.year`，先找到 `s` 里的 `birth`，再找到 `birth` 里的 `year`。

嵌套让"日期"这个概念可以被很多类型复用：`Student`、`Employee`、`Order` 都可以有一个 `struct Date` 成员，日期的合法性检查（月份 1–12、日期不超过当月天数）也只需要写一次。

### 嵌套成员的偏移是"外层偏移 + 内层偏移"
成员访问的规则没有变：结构体首地址加上成员的编译期偏移。嵌套只是把两段偏移加起来：

```c
s.birth.year
/* 等价于 */  *(short *)((char *)&s + offsetof(struct Student, birth)
                                    + offsetof(struct Date, year))
```

下面的程序把三层偏移都打印出来，并验证 `Student` 的 32 字节里每个成员落在哪里：

```c run id=s4sn-layout
#include <stddef.h>
#include <stdio.h>

struct Date {
    short year;
    char month;
    char day;
};

struct Course {
    char code[8];
    int credit;
};

struct Student {
    int id;
    struct Date birth;
    char name[8];
    struct Course course;
    int score;
};

int main(void) {
    struct Student s = { 1001, { 2006, 9, 1 }, "Lin", { "C101", 3 }, 92 };

    printf("sizeof: Date=%zu Course=%zu Student=%zu\n",
           sizeof(struct Date), sizeof(struct Course), sizeof(struct Student));
    printf("offsetof: id=%zu birth=%zu name=%zu course=%zu score=%zu\n",
           offsetof(struct Student, id), offsetof(struct Student, birth),
           offsetof(struct Student, name), offsetof(struct Student, course),
           offsetof(struct Student, score));
    printf("Date: year=%zu month=%zu day=%zu\n",
           offsetof(struct Date, year), offsetof(struct Date, month),
           offsetof(struct Date, day));

    printf("%d %04d-%02d-%02d %s %s %d %d\n",
           s.id, s.birth.year, s.birth.month, s.birth.day,
           s.name, s.course.code, s.course.credit, s.score);
    return 0;
}
```
```output
sizeof: Date=4 Course=12 Student=32
offsetof: id=0 birth=4 name=8 course=16 score=28
Date: year=0 month=2 day=3
1001 2006-09-01 Lin C101 3 92
```

把偏移画出来就清楚了：

- `id` 占 0…3；
- `birth` 从 4 开始，占 4…7，其中 `year` 在 4…5、`month` 在 6、`day` 在 7；
- `name` 从 8 开始，占 8…15；
- `course` 从 16 开始，`code` 占 16…23、`credit` 占 24…27；
- `score` 从 28 开始，占 28…31。

**嵌套结构体是"值内嵌"，不是"指针指向"**：`sizeof(struct Student)` 包含了 `Date` 和 `Course` 的全部字节，`&s.birth` 一定落在 `s` 内部。访问 `s.birth.year` 只需要一次基址加法和一次常量偏移，没有额外的间接寻址。

### 结构体数组：元素连续，步长是 sizeof
结构体数组和普通数组的规则完全一样：元素在内存里一个挨一个，`a[i]` 的首地址是 `数组首地址 + i × sizeof(struct Student)`。因此 `a[i].birth.year` 的地址是：

```
a 的首地址 + i × sizeof(struct Student) + offsetof(struct Student, birth) + offsetof(struct Date, year)
```

下面的程序遍历一个学生数组，注意输出里的 `stride` 正好等于 `sizeof(struct Student)`：

```c run id=s4sn-array
#include <stdio.h>

struct Date {
    short year;
    char month;
    char day;
};

struct Course {
    char code[8];
    int credit;
};

struct Student {
    int id;
    struct Date birth;
    char name[8];
    struct Course course;
    int score;
};

int main(void) {
    struct Student a[3] = {
        { 1001, { 2006, 9, 1 }, "Lin",  { "C101", 3 }, 92 },
        { 1002, { 2005, 12, 31 }, "Chen", { "C102", 4 }, 85 },
        { 1003, { 2006, 2, 28 }, "Zhao", { "C101", 3 }, 78 }
    };

    for (int i = 0; i < 3; i++) {
        printf("%d %s %04d-%02d-%02d %s %d\n",
               a[i].id, a[i].name,
               a[i].birth.year, a[i].birth.month, a[i].birth.day,
               a[i].course.code, a[i].score);
    }

    printf("stride=%td\n", (char *)&a[1] - (char *)&a[0]);
    printf("birth of a[2] is at a + %td\n",
           (char *)&a[2].birth - (char *)&a[0]);
    return 0;
}
```
```output
1001 Lin 2006-09-01 C101 92
1002 Chen 2005-12-31 C102 85
1003 Zhao 2006-02-28 C101 78
stride=32
birth of a[2] is at a + 68
```

`a[2].birth` 的偏移是 `2 × 32 + 4 = 68`。这个算式把三层信息叠在一起：数组下标、外层成员偏移、内层成员偏移。**不要试图用 `a + i + 4` 这种"字节数直接加在结构体指针上"的写法**，指针算术的单位是元素，不是字节。

### 结构体数组的排序：交换整个元素
成绩单经常需要排名。对结构体数组排序时，比较的是某个成员（比如 `score`），但**交换的必须是整个结构体元素**，否则学号、姓名、出生日期会和成绩错位：

```c run id=s4sn-sort
#include <stdio.h>

struct Date {
    short year;
    char month;
    char day;
};

struct Student {
    int id;
    struct Date birth;
    char name[8];
    int score;
};

int main(void) {
    struct Student a[4] = {
        { 1004, { 2006, 1, 1 }, "Wang", 88 },
        { 1002, { 2005, 6, 15 }, "Chen", 95 },
        { 1003, { 2006, 3, 8 }, "Zhao", 88 },
        { 1001, { 2004, 11, 30 }, "Lin", 70 }
    };

    /* 按成绩从高到低；同分时学号小的在前 */
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3 - i; j++) {
            if (a[j].score < a[j + 1].score ||
                (a[j].score == a[j + 1].score && a[j].id > a[j + 1].id)) {
                struct Student t = a[j];   /* 整个结构体一起交换 */
                a[j] = a[j + 1];
                a[j + 1] = t;
            }
        }
    }

    for (int i = 0; i < 4; i++) {
        printf("%d: %d %s %d\n", i + 1, a[i].id, a[i].name, a[i].score);
    }
    return 0;
}
```
```output
1: 1002 Chen 95
2: 1003 Zhao 88
3: 1004 Wang 88
4: 1001 Lin 70
```

`struct Student t = a[j];` 是合法的整体赋值，会把 `id`、`birth`、`name`、`score` 的**值**全部复制一份；`a[j] = a[j + 1];` 再把另一个元素复制过来。两次赋值之后，学号、姓名、成绩仍然属于同一个人。如果只交换 `score`，数组就变成"成绩排序了、人没排序"的错位状态——这是结构体排序最典型的 bug。

内存图（数组里前两个学生的布局，地址为示意）：

```memory title="struct Student a[3] 的前两个元素（每个元素 32 字节）"
地址(示意) | 内容 | 属于 | 说明
0x600000 | 1001 | a[0].id | 第 0 个元素从 0x600000 开始
0x600004 | 2006 | a[0].birth.year | birth 内嵌在偏移 4
0x600006 | 9 | a[0].birth.month | Date 内的偏移 2
0x600007 | 1 | a[0].birth.day | Date 内的偏移 3
0x600008 | L i n \0 及填充 | a[0].name[0..7] | 数组成员内嵌，占 8 字节
0x600010 | C 1 0 1 \0 及填充 | a[0].course.code[0..7] | course 从 16 开始
0x600018 | 3 | a[0].course.credit | course 内偏移 8
0x60001c | 92 | a[0].score | 偏移 28
0x600020 | 1002 | a[1].id | 下一个元素 = 0x600000 + 32
```

## 编译与运行

用 gcc 或 clang 编译，开启 `-Wall -Wextra`：

```bash
gcc -std=c17 -Wall -Wextra nested.c -o nested
./nested
```

```bash
clang -std=c17 -Wall -Wextra nested.c -o nested
./nested
```

嵌套初始化建议**每一层都写大括号**：

```c
struct Student s = { 1001, { 2006, 9, 1 }, "Lin", { "C101", 3 }, 92 };
```

少写内层大括号时，C 允许"扁平"写法（花括号省略），值仍然按成员顺序填进去，但 `-Wall` 会报 `-Wmissing-braces`。这类警告不是噪音：成员一多，扁平写法极容易错位，而编译器只能靠大括号判断你的意图。

看内存布局时，`sizeof` 和 `offsetof` 仍然是最可靠的工具。注意 `offsetof(struct Student, birth)` 给出的是外层偏移，`offsetof(struct Date, month)` 给出的是内层偏移，两者相加才是 `month` 在 `Student` 里的最终偏移。

## 常见错误

### 把内嵌的结构体成员当指针，用 -> 访问 [CE]
`birth` 的类型是 `struct Date`，不是 `struct Date *`，所以只能用 `.`：`s.birth.year`。写成 `s.birth->year` 会得到 `member reference type 'struct Date' is not a pointer` 一类的编译错误。只有成员本身是指针时，`->` 才成立。

```c run id=s4sn-err-arrow expect=CE
#include <stdio.h>

struct Date {
    short year;
    char month;
    char day;
};

struct Student {
    int id;
    struct Date birth;
};

int main(void) {
    struct Student s = { 1001, { 2006, 9, 1 } };
    printf("%d\n", s.birth->year);   /* 错：birth 不是指针 */
    return 0;
}
```

### 嵌套初始化省略内层大括号 [WA]
扁平初始化依赖"按声明顺序逐个填"的规则，一旦结构体成员增减、顺序调整，值就会悄悄错位。更危险的是把 `name` 的字符串误填到 `course.code` 里——两者都是 `char` 数组，编译器未必能发现。下面的代码能编译（有警告），输出也正确，但它是在提醒你：靠位置对齐的代码经不起修改。

```c run id=s4sn-err-braces warnings=allow
#include <stdio.h>

struct Date {
    short year;
    char month;
    char day;
};

struct Course {
    char code[8];
    int credit;
};

struct Student {
    int id;
    struct Date birth;
    char name[8];
    struct Course course;
    int score;
};

int main(void) {
    /* 少了 Date 和 Course 两层大括号：值按顺序填进去了，但 -Wall 会警告 */
    struct Student s = { 1001, 2006, 9, 1, "Lin", "C101", 3, 92 };
    printf("%d %04d-%02d-%02d %s %s %d %d\n",
           s.id, s.birth.year, s.birth.month, s.birth.day,
           s.name, s.course.code, s.course.credit, s.score);
    return 0;
}
```
```output
1001 2006-09-01 Lin C101 3 92
```

### 排序时只交换成绩，不交换整个结构体 [WA]
比较用 `a[j].score`，交换却只交换 `a[j].score`，排序结束后分数列是有序的，但学号、姓名、出生日期还留在原位，数据整体错位。下面这段"错误示范"输出的学号与成绩的对应关系是错的：1001 原本只有 70 分，却显示成了 90 分。

```c run id=s4sn-err-partial-swap
#include <stdio.h>

struct Student {
    int id;
    char name[8];
    int score;
};

int main(void) {
    struct Student a[3] = {
        { 1001, "Lin", 70 },
        { 1002, "Chen", 90 },
        { 1003, "Zhao", 80 }
    };

    for (int i = 0; i < 2; i++) {
        for (int j = 0; j < 2 - i; j++) {
            if (a[j].score < a[j + 1].score) {
                int t = a[j].score;          /* 错：只交换了成绩 */
                a[j].score = a[j + 1].score;
                a[j + 1].score = t;
            }
        }
    }

    for (int i = 0; i < 3; i++) {
        printf("%d %s %d\n", a[i].id, a[i].name, a[i].score);
    }
    return 0;
}
```
```output
1001 Lin 90
1002 Chen 80
1003 Zhao 70
```

### 在函数里用 sizeof 求数组长度 [WA]
把结构体数组传给函数后，数组名会退化成指向首元素的指针，函数里的 `sizeof(a)` 变成指针大小（8 字节），不再是整个数组的大小。因此 `sizeof(a) / sizeof(a[0])` 在函数内部会算错。正确做法是把元素个数作为参数传进去，或者用 `size_t n` 单独记录长度。

## 客观题

### q-s4-struct-nested-1 single
有下面两个结构体：

```c
struct Date {
    short year;    /* 2 字节 */
    char month;    /* 1 字节 */
    char day;      /* 1 字节 */
};

struct Student {
    int id;             /* 4 字节 */
    struct Date birth;
    int score;          /* 4 字节 */
};
```

在本题平台上（`short` 2 字节、`char` 1 字节、`int` 4 字节，按最大成员对齐），表达式 `(char *)&s.birth.month - (char *)&s` 的值是多少？

- [x] 6
  > 正确。`birth` 在 `Student` 内的偏移是 4；`month` 在 `Date` 内的偏移是 2（`year` 占 0…1，`month` 从 2 开始）。两段偏移相加：4 + 2 = 6。
- [ ] 4
  > 错。4 只是 `birth` 相对 `s` 的偏移，也就是 `&s.birth` 的位置；题目问的是 `birth.month`，还要再加 `month` 在 `Date` 内部的偏移 2。
- [ ] 2
  > 错。2 只是 `month` 在 `Date` 内部的偏移，忘了加外层 `birth` 的偏移 4。嵌套成员的偏移必须"外层 + 内层"逐层累加。
- [ ] 12
  > 错。12 是 `sizeof(struct Student)`（`id` 4 + `Date` 4 + `score` 4），不是某个成员的偏移。`sizeof` 是整个对象的大小，不能拿来当偏移用。
