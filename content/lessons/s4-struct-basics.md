---
id: s4-struct-basics
---

## 讲解

### 为什么需要结构体：把"总是一起出现的数据"打包
如果没有结构体，一个学生的学号、姓名、成绩、绩点只能分别放在四个变量里：

```c
int id1, id2;
char name1[12], name2[12];
int score1, score2;
double gpa1, gpa2;
```

数据一多，这些变量就会"散架"：函数要接收四个参数、排序时要同时搬动四组数组、删掉一个学生时要记得删四个地方。更糟的是，编译器完全不知道 `id1` 和 `score1` 属于同一个人，你可以把 `id1` 和 `score2` 配在一起，它也不会报错。

**结构体（struct）就是把这些"逻辑上属于同一个对象"的成员打包成一个新的类型。** 打包之后：

- 一个 `struct Student` 变量就是一个完整的学生，赋值、传参、放进数组都以"整个学生"为单位；
- 编译器知道成员的名字和类型，写错成员名会直接编译失败；
- 结构体数组的每个元素是连续存放的，第 `i` 个学生的首地址就是"数组首地址 + i × sizeof(struct Student)"。

### 定义、声明与三种初始化方式
结构体的定义只是**创建一个新类型**，不分配任何内存：

```c
struct Student {          /* struct Student 是类型名，Student 是标签（tag） */
    int id;
    char name[12];
    int score;
    double gpa;
};                        /* 这个分号不能少 */
```

定义好之后，`struct Student` 就可以像 `int` 一样用来声明变量。下面是三种最常用的初始化方式，它们的效果都是让每个成员都有一个确定的值：

```c run id=s4sb-define
#include <stdio.h>
#include <string.h>

struct Student {
    int id;
    char name[12];
    int score;
    double gpa;
};

int main(void) {
    /* 写法 1：按成员声明顺序给出全部初值 */
    struct Student a = { 1001, "Lin", 92, 3.5 };

    /* 写法 2：指定初始化器（designated initializer），顺序可以打乱，没写的成员补 0 */
    struct Student b = { .gpa = 3.72, .id = 1002, .name = "Chen", .score = 88 };

    /* 写法 3：先整体清零，再逐个成员赋值 */
    struct Student c = { 0 };
    c.id = 1003;
    strcpy(c.name, "Zhao");   /* 字符数组不能用 = 赋值，必须复制 */
    c.score = 75;
    c.gpa = 3.10;

    printf("%d %s %d %.2f\n", a.id, a.name, a.score, a.gpa);
    printf("%d %s %d %.2f\n", b.id, b.name, b.score, b.gpa);
    printf("%d %s %d %.2f\n", c.id, c.name, c.score, c.gpa);
    printf("sizeof = %zu\n", sizeof(struct Student));
    return 0;
}
```
```output
1001 Lin 92 3.50
1002 Chen 88 3.72
1003 Zhao 75 3.10
sizeof = 32
```

三个细节必须记住：

1. **`{ 0 }` 会把所有成员都置零**，包括数组成员；填充字节的内容不保证被清零，所以不要依赖填充字节。这在"先清零再填"的写法里最安全。
2. **指定初始化器没有列出的成员一律补 0**，所以 `struct Student b = { .id = 1002 };` 里 `score`、`gpa` 都是 0，`name` 全是 `'\0'`。但 `struct Student c;` 这种**不带初始化器**的局部变量不会自动清零，成员里是垃圾值。
3. 初始化器里的字符串 `"Lin"` 能直接写进 `char name[12]`，是因为数组初始化是逐字符复制；**一旦结构体已经定义完，`c.name = "Zhao"` 就不合法了**，必须用 `strcpy` 或 `snprintf`。

### 成员访问：编译期算好的固定偏移
`a.score` 看起来像"按名字查表"，其实运行时没有任何查找。编译器在编译期就知道 `score` 在 `struct Student` 里的偏移，`a.score` 被翻译成"从 `a` 的首地址加 16 字节，再按 `int` 读 4 字节"。

下面把偏移打印出来。`offsetof` 是 `<stddef.h>` 提供的宏，它返回成员相对结构体首地址的字节偏移，结果在编译期就是常量：

```c run id=s4sb-offset
#include <stddef.h>
#include <stdio.h>

struct Student {
    int id;
    char name[12];
    int score;
    double gpa;
};

int main(void) {
    struct Student s = { 1001, "Lin", 92, 3.5 };

    printf("id    offset=%zu\n", offsetof(struct Student, id));
    printf("name  offset=%zu\n", offsetof(struct Student, name));
    printf("score offset=%zu\n", offsetof(struct Student, score));
    printf("gpa   offset=%zu\n", offsetof(struct Student, gpa));
    printf("sizeof=%zu\n", sizeof s);

    /* 用 char * 做字节级相减，结果就是两个成员之间的真实距离 */
    printf("score - id   = %td 字节\n", (char *)&s.score - (char *)&s.id);
    printf("gpa   - score= %td 字节（含 4 字节填充）\n", (char *)&s.gpa - (char *)&s.score);
    return 0;
}
```
```output
id    offset=0
name  offset=4
score offset=16
gpa   offset=24
sizeof=32
score - id   = 16 字节
gpa   - score= 8 字节（含 4 字节填充）
```

注意 `gpa` 的偏移是 24 而不是 20：`score` 占 16…19，`double` 要求从 8 的倍数开始，于是 20…23 这四个字节被空出来当**填充（padding）**。

```memory title="struct Student s = {1001, \"Lin\", 92, 3.5} 的内存布局（地址为示意）"
地址(示意) | 内容 | 成员 | 说明
0x7ffd1000 | 1001 | s.id | 结构体首地址就是第一个成员的地址
0x7ffd1004 | L i n \0 及其余 0 | s.name[0..11] | 数组成员内嵌在结构体里，占 12 字节
0x7ffd1010 | 92 | s.score | 偏移 16
0x7ffd1014 | （未使用） | padding | 为了让 double 从 8 的倍数开始
0x7ffd1018 | 3.5 | s.gpa | 偏移 24，占 8 字节
0x7ffd1020 | 结构体结束 | — | 总大小 32 字节
```

**为什么需要对齐？** 大多数 CPU 一次读取内存时要求地址是访问宽度的倍数：读 8 字节的 `double` 时，如果它横跨两个 8 字节块，硬件要么分两次读、要么直接触发对齐异常。编译器为了保证每个成员都"自然对齐"，会在成员之间插入填充字节，并把整个结构体的大小向上取整到最大对齐值的倍数。这样 `struct Student a[10]` 里每个元素的 `gpa` 仍然落在 8 的倍数上——**填充不是浪费，而是让数组里的每个元素都能保持对齐**。更细的规则在「内存对齐规则与 offsetof」一节展开。

成员访问的完整语义可以用一行伪代码表示：

```c
s.score            /* 就相当于 */  *(int *)((char *)&s + 16)
```

所以成员访问是 O(1)：先取结构体首地址，加一个编译期常量偏移，再按成员类型读写。**偏移由类型决定，与变量名无关，也不会在运行时变化。**

### 结构体可以整体赋值，但不能用 == 比较
同类型的结构体之间可以直接赋值，语义是**逐成员复制**（包括数组成员的内容，而不是共享）：

```c run id=s4sb-copy
#include <stdio.h>

struct Student {
    int id;
    char name[12];
    int score;
    double gpa;
};

int main(void) {
    struct Student a = { 1001, "Lin", 92, 3.5 };
    struct Student b = a;        /* 整体赋值：把 a 的每个成员复制到 b */

    b.score = 60;
    b.name[0] = 'X';             /* 改 b 的数组不会影响 a 的数组 */
    b.gpa = 1.0;

    printf("a = %d %s %d %.2f\n", a.id, a.name, a.score, a.gpa);
    printf("b = %d %s %d %.2f\n", b.id, b.name, b.score, b.gpa);
    return 0;
}
```
```output
a = 1001 Lin 92 3.50
b = 1001 Xin 60 1.00
```

赋值的右边是"值的副本"，所以 `b` 改得再多也不会污染 `a`。但 C 没有为结构体定义 `==` 运算符：`a == b` 会直接编译失败。想比较两个结构体，必须自己写函数，逐个成员比较（或者用 `memcmp`，但要小心填充字节的陷阱，见「常见错误」）。

## 编译与运行

用 gcc 或 clang 都可以，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra student.c -o student
./student
```

```bash
clang -std=c17 -Wall -Wextra student.c -o student
./student
```

结构体不需要额外的库，`offsetof` 在 `<stddef.h>` 里，`strcpy` 在 `<string.h>` 里。`-Wall -Wextra` 至少能帮你抓住两类问题：初始化器缺大括号（`-Wmissing-braces`）、以及把结构体指针当结构体用（成员访问类型不匹配会直接报错）。

如果只想确认布局而不运行程序，可以打印 `sizeof` 和 `offsetof`；它们都是编译期常量，不会带来运行时开销：

```c
printf("sizeof(struct Student) = %zu\n", sizeof(struct Student));
printf("offset of gpa = %zu\n", offsetof(struct Student, gpa));
```

在 64 位平台上，`int` 是 4 字节、`double` 是 8 字节、指针是 8 字节。这些大小由平台 ABI 决定，不要假设"结构体大小等于成员大小之和"——填充和对齐会让结果变大。

## 常见错误

### 用 == 比较两个结构体 [CE]
C 只为算术类型和指针定义了 `==`，结构体是聚合类型，没有内建的相等比较。`a == b` 会得到类似 `invalid operands to binary expression` 的编译错误。正确做法是写一个 `student_equal` 函数逐成员比较，或者只比较真正关心的字段。

```c run id=s4sb-err-eq expect=CE
#include <stdio.h>

struct Point {
    int x;
    int y;
};

int main(void) {
    struct Point a = { 1, 2 };
    struct Point b = { 1, 2 };
    if (a == b) {
        printf("same\n");
    }
    return 0;
}
```

### 给字符数组成员直接赋值 [CE]
`char name[12]` 是一个数组，数组名不是可修改的左值，不能出现在 `=` 左边。`s.name = "Lin";` 会报 `array type 'char[12]' is not assignable`。初始化时能写 `{ 1001, "Lin", ... }` 是因为那是初始化器，不是赋值表达式；定义完之后必须用 `strcpy`、`snprintf` 或逐字符复制。

```c run id=s4sb-err-array-assign expect=CE
#include <stdio.h>

struct Student {
    int id;
    char name[12];
};

int main(void) {
    struct Student s = { 0 };
    s.name = "Lin";              /* 错：数组不能用 = 赋值 */
    printf("%s\n", s.name);
    return 0;
}
```

### 用 memcmp 比较两个结构体 [WA]
`memcmp(&a, &b, sizeof a) == 0` 看起来能"整体比较"，但它连填充字节一起比。填充字节的值是不确定的：`struct Student a = {0}, b = {0};` 之后，两个变量的成员都相同，填充字节却可能不同，`memcmp` 就会返回非 0。比较结构体应当逐成员比较，或者先把整个对象清零再逐字段赋值，不要依赖填充字节的内容。

### 以为局部结构体的成员会自动初始化为 0 [WA]
`struct Student s;` 只分配空间，不写任何值，`s.id`、`s.score` 都是不确定的。`{ 0 }` 才会把全部成员清零。这一点和全局/静态结构体不同：文件作用域的 `static struct Student s;` 会被零初始化，但局部变量不会。

## 客观题

### q-s4-struct-basics-1 single
下面这段代码运行后，输出是什么？

```c
struct Point {
    int x;
    int y;
};

int main(void) {
    struct Point p = { .y = 5 };
    printf("%d %d\n", p.x, p.y);
    return 0;
}
```

- [x] `0 5`
  > 正确。指定初始化器只写了 `.y = 5`，没有列出的 `.x` 会按 C 的规则补 0；结构体初始化器里未显式给出的成员一律零初始化。
- [ ] `5 0`
  > 错。指定初始化器按**名字**对应成员，不是按位置。`.y = 5` 只初始化 `y`，不会因为它是唯一写出的值就落到第一个成员 `x` 上。
- [ ] `x` 是不确定值，输出不可预测
  > 错。只有"完全不带初始化器"的局部变量才是不确定值；这里用了 `{ .y = 5 }`，初始化器会把剩余成员补 0，因此 `x` 一定是 0。
- [ ] 编译错误：指定初始化器必须按声明顺序写
  > 错。C99 的指定初始化器允许乱序，`{ .y = 5, .x = 1 }` 和 `{ .x = 1, .y = 5 }` 等价；只有"按位置初始化"才要求顺序与声明一致。
