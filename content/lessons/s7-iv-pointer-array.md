---
id: s7-iv-pointer-array
---

## 讲解

### 面试官在问什么
"指针和数组有什么区别"是一道**送命题**：说"数组就是指针"会被立刻追问 `sizeof`，说"完全没关系"又解释不了 `a[i]` 为什么等于 `*(a+i)`。标准答案是分三层说：**它们是什么类型**、**它们在内存里是什么**、**它们在哪一步发生了转换**。

### 口述版答案
**第一层：类型不同**
- **数组**是一片连续的对象，`int a[5]` 的类型是 `int[5]`，它**本身不是一个指针**，也没有一个"存地址的格子"。
- **指针**是一个对象，`int *p` 里存的是一个地址，指针自己也有地址、也占 8 字节。
- 关键词：数组是"一串元素"，指针是"一个存地址的变量"。

**第二层：数组名在表达式里会退化**
- 在绝大多数表达式里，数组名会转换成"指向首元素的指针"：`a` → `&a[0]`，类型 `int *`。
- 只有四个例外**不退化**：`sizeof a`、`&a`、`_Alignof a`、用字符串字面量初始化字符数组。
- 所以 `sizeof a` 是整个数组的字节数（20），`sizeof p` 是指针宽度（8）——这是面试第一个考点。

**第三层：值相同、类型不同**
- `a`、`&a[0]`、`p` 的值是同一个地址，但 `&a` 的类型是 `int (*)[5]`（指向整个数组）。
- `p + 1` 前进 4 字节（一个 `int`）；`&a + 1` 前进 20 字节（一整个数组）。
- 关键词：步长由**指向的类型**决定，不由"地址值"决定。

**第四层：数组不能赋值，指针可以**
- `p = a;` 合法（把首元素地址赋给指针）；`a = p;` **非法**，数组名不是可修改的左值。
- 函数参数里的 `int a[10]` 会被编译器改写成 `int *a`，所以函数里 `sizeof a` 是 8，**数组长度信息在传参时丢失**。
- 关键词：退化、长度丢失、数组不是左值。

**一句话收尾**：数组名在需要"值"的场合退化成指针，在需要"类型"的场合（`sizeof`、`&`）仍然是数组；指针永远只是一个存地址的对象。

一张表把最容易考的几项钉死（本平台 64 位，`int` 4 字节、指针 8 字节）：

| 表达式 | 类型 | `sizeof` | `+1` 的步长 | 能否赋值 |
|---|---|---|---|---|
| `int a[5]` 的 `a` | `int[5]`（表达式里退化为 `int *`） | 20 | 4（退化后） | 不能 |
| `&a` | `int (*)[5]` | 8 | 20 | —— |
| `int *p` | `int *` | 8 | 4 | 能 |
| `int *r[3]` 的 `r` | `int *[3]`（退化为 `int **`） | 24 | 8（退化后） | 不能 |
| `int (*q)[3]` | `int (*)[3]` | 8 | 12 | 能 |

### 口述版：三个必答的追问
- **追问 1：`int *p[3]` 和 `int (*p)[3]` 有什么区别？**
  答：前者是**指针数组**——`p` 是数组，3 个元素，每个是 `int *`，占 24 字节；后者是**数组指针**——`p` 是一个指针，指向 `int[3]`，占 8 字节，`p + 1` 前进 12 字节。记忆口诀：`[]` 优先级高于 `*`，所以 `int *p[3]` 先结合 `[3]`。
- **追问 2：为什么 `void f(int a[10])` 里 `sizeof a` 是 8？**
  答：形参里的数组声明会被编译器**改写成指针**（`int *a`），方括号里的 10 被忽略；数组长度信息传不进来，所以函数必须额外接收一个长度参数，或者用哨兵值（如字符串的 `'\0'`）。
- **追问 3：`extern int a[];` 和 `extern int *a;` 一样吗？**
  答：不一样。前者声明的是**数组**（定义处必须是数组），后者声明的是**指针**（定义处必须是指针）。两者混用能编译通过，但运行时会按错误的间接层数取数据——这是跨文件声明不一致的经典 bug。

### 代码版答案
面试官说"写个代码证明"，就写下面三段：第一段证明类型和步长，第二段证明传参退化，第三段把三种"看起来都像二级指针"的写法摆在一起。

**第一段：同一个地址，`sizeof` 与步长完全不同。**

```c run id=pa-types
#include <stdio.h>

int main(void) {
    int a[5] = { 10, 20, 30, 40, 50 };
    int *p = a;              /* 数组名退化成 &a[0] */
    int (*q)[5] = &a;        /* 指向整个数组的指针 */

    printf("sizeof a=%zu sizeof *a=%zu\n", sizeof a, sizeof *a);
    printf("sizeof p=%zu sizeof *p=%zu\n", sizeof p, sizeof *p);
    printf("sizeof q=%zu sizeof *q=%zu\n", sizeof q, sizeof *q);
    printf("p == a ? %s\n", p == a ? "yes" : "no");
    printf("p+1 走了 %ld 字节\n", (long)((char *)(p + 1) - (char *)p));
    printf("q+1 走了 %ld 字节\n", (long)((char *)(q + 1) - (char *)q));
    return 0;
}
```
```output
sizeof a=20 sizeof *a=4
sizeof p=8 sizeof *p=4
sizeof q=8 sizeof *q=20
p == a ? yes
p+1 走了 4 字节
q+1 走了 20 字节
```

看前三行就够了：`sizeof a` 是 20（整个数组），`sizeof p` 是 8（一个指针），`sizeof q` 是 8（也是一个指针），`sizeof *q` 又回到 20（`*q` 是数组）。第四行 `p == a` 为真，说明**值一样**；最后两行说明**类型不一样**：`p` 指向 `int`，`q` 指向 `int[5]`。

**第二段：传参时数组退化成指针，长度丢失。**

```c run id=pa-param
#include <stdio.h>

static size_t span(int arr[10]) {
    int *p = arr;            /* 形参已经是指针，用变量接住可避免 -Wsizeof-array-argument */
    return sizeof p;         /* 8：函数里拿不到数组长度 */
}

int main(void) {
    int a[10] = { 0 };
    a[2] = 7;
    printf("sizeof a=%zu span=%zu\n", sizeof a, span(a));
    printf("*(a+2)=%d 2[a]=%d\n", *(a + 2), 2[a]);
    return 0;
}
```
```output
sizeof a=40 span=8
*(a+2)=7 2[a]=7
```

`main` 里 `sizeof a` 是 40，传进 `span` 之后就只剩 8——因为形参 `int arr[10]` 被改写成 `int *arr`，方括号里的 10 完全被忽略。最后一行还顺手证明了 `a[i] == *(a + i) == i[a]`：下标运算的本质是"指针加偏移再解引用"，所以 `2[a]` 和 `a[2]` 是同一个东西。

**第三段：指针数组、数组指针、二级指针，三者的类型与步长。**

```c run id=pa-arrayptr
#include <stdio.h>

int main(void) {
    int row[3] = { 10, 20, 30 };
    int *r[3] = { &row[0], &row[1], &row[2] };   /* 指针数组：3 个 int * */
    int (*q)[3] = &row;                          /* 数组指针：1 个指针，指向 int[3] */
    int **pp = r;                                /* 二级指针：指向 r[0] */

    printf("sizeof r=%zu sizeof *r=%zu\n", sizeof r, sizeof *r);
    printf("sizeof q=%zu sizeof *q=%zu\n", sizeof q, sizeof *q);
    printf("r[1]-row=%ld (*q)[2]=%d\n", (long)(r[1] - row), (*q)[2]);
    printf("pp[2]-row=%ld *pp[1]=%d\n", (long)(pp[2] - row), *pp[1]);
    return 0;
}
```
```output
sizeof r=24 sizeof *r=8
sizeof q=8 sizeof *q=12
r[1]-row=1 (*q)[2]=30
pp[2]-row=2 *pp[1]=20
```

`r` 是数组，所以 `sizeof r` 是 3 × 8 = 24；`*r` 是它的第一个元素，类型 `int *`，大小 8。`q` 是指针，`sizeof q` 是 8；`*q` 是 `int[3]`，大小 12。`r[1] - row` 是元素距离 1（指针相减的单位是元素），`pp[2]` 就是 `r[2]`，指向 `row[2]`，所以减 `row` 得 2。

**再看内存里这两类对象长什么样。** 数组是"一排元素"，指针是"一个存地址的格子"：

```memory title="int a[5] = {10,20,30,40,50}; int *p = a;（地址为示意）"
地址 | 内容 | 是谁 | 说明
0x7ffd20 | 10 | a[0] | 数组实体从低到高连续存放，共 20 字节
0x7ffd24 | 20 | a[1] | a[i] 的地址是 a + i × 4
0x7ffd28 | 30 | a[2] | 数组没有"单独存首地址"的格子
0x7ffd2c | 40 | a[3] | 
0x7ffd30 | 50 | a[4] | 最后一个元素，后面就是别的对象
0x7ffd38 | 0x7ffd20 | p | 指针变量本身占 8 字节，里面存 a[0] 的地址
```

指针数组和数组指针的区别，也能在一张图里看明白：

```memory title="int *r[3] = {&row[0], &row[1], &row[2]}; int (*q)[3] = &row; int **pp = r;（地址为示意）"
地址 | 内容 | 是谁 | 类型与含义
0x7ffd40 | 0x7ffd20 | r[0] | int *，指向 row[0]
0x7ffd48 | 0x7ffd24 | r[1] | int *，指向 row[1]
0x7ffd50 | 0x7ffd28 | r[2] | int *，指向 row[2]
0x7ffd58 | 0x7ffd20 | q | int (*)[3]，指向整个 row，+1 走 12 字节
0x7ffd60 | 0x7ffd40 | pp | int **，指向 r[0] 这个指针
```

`r` 自己占 24 字节（3 个指针），`q` 只占 8 字节（1 个指针）——`sizeof` 的差别、`+1` 步长的差别，全部来自"类型里指向的是什么"。

## 编译与运行

本平台使用 Clang（x86-64 Windows，UCRT），`gcc` 和 `clang` 都可以：

```bash
gcc -std=c17 -Wall -Wextra pointer_array.c -o pointer_array
./pointer_array
```

```bash
clang -std=c17 -Wall -Wextra pointer_array.c -o pointer_array
./pointer_array
```

**想确认 `sizeof` 是编译期算出来的**，可以用 `_Static_assert` 把它钉住（C11 起可用，C17 完全支持）：

```c
int a[5];
_Static_assert(sizeof a == 20, "int[5] 一定是 20 字节");
_Static_assert(sizeof(int (*)[5]) == 8, "指针一定是 8 字节");
```

编译不过就说明平台不是 64 位；这条断言在编译期生效，没有任何运行开销。

**想看到"数组参数退化"的警告**，把 `sizeof` 直接写在数组形参上，Clang 会给出 `-Wsizeof-array-argument`：

```bash
clang -std=c17 -Wall -Wextra -fsyntax-only sizeof_param.c
```

```text
sizeof_param.c:4:19: warning: sizeof on array function parameter will return
      size of 'int *' instead of 'int[10]' [-Wsizeof-array-argument]
```

这条警告本身就是答案：编译器在提醒你，形参的数组类型已经被改写成指针了。正式代码里遇到它，要么补一个长度参数，要么用一个 `int *p = arr;` 接住再 `sizeof p`。

**想看类型**（而不是靠猜），可以用 `_Generic` 在编译期把类型名打印出来：

```c
#define TYPE_NAME(x) _Generic((x), int[5]: "int[5]", int *: "int *", \
                              int (*)[5]: "int (*)[5]", default: "other")
```

## 常见错误

### 在函数里用 sizeof 数组形参求长度
形参写成 `int a[10]` 也只是"看起来是数组"，实际类型是 `int *`，`sizeof a` 得到 8。用 `sizeof a / sizeof a[0]` 求长度会得到 2，而不是 10——这类 bug 在 `memcpy`、循环边界里会直接造成越界。正确做法是把长度作为参数传进来。

```c run id=pa-warn warnings=allow
#include <stdio.h>

/* 故意演示：Clang 会给出 -Wsizeof-array-argument 警告 */
static size_t bad_span(int arr[10]) {
    return sizeof arr / sizeof arr[0];   /* 8 / 4 = 2，不是 10 */
}

int main(void) {
    int a[10] = { 0 };
    printf("sizeof a / sizeof a[0] = %zu\n", sizeof a / sizeof a[0]);
    printf("bad_span(a) = %zu\n", bad_span(a));
    return 0;
}
```
```output
sizeof a / sizeof a[0] = 10
bad_span(a) = 2
```

### 给数组名赋值
数组名不是可修改的左值，`a = p;`、`a++;` 都会编译失败（判 `CE`）。指针可以改指向，数组名不行——这是"数组不是指针"最直接的证据。

```c run expect=CE
#include <stdio.h>

int main(void) {
    int a[5] = { 0 };
    int *p = a;
    a = p;                   /* 编译错误：数组名不能被赋值 */
    printf("%d\n", a[0]);
    return 0;
}
```

### 把 int *p[3] 和 int (*p)[3] 记反
`[]` 的优先级比 `*` 高：`int *p[3]` 是"3 个 `int *` 的数组"，`int (*p)[3]` 是"指向 `int[3]` 的指针"。两者都能用 `p[i][j]` 的写法，但步长完全不同：前者 `p + 1` 走 8 字节，后者 `p + 1` 走 12 字节。写反了轻则结果错（判 `WA`），重则越界读（判 `RE`）。

### 以为 &a + 1 前进一个元素
`&a` 的类型是 `int (*)[5]`，`&a + 1` 跳过的是一整个数组（20 字节），不是 4 字节。`a + 1` 和 `&a + 1` 的值看似"都加了 1"，实际差了 5 个元素——这种表达式一旦参与地址运算，很容易落到数组外面。

### 用 extern int *a 声明一个真正的数组
`extern int *a;` 声明的是指针，`extern int a[];` 声明的是数组。定义处是 `int a[10];` 却在另一个文件里声明成 `int *a;`，语法上都对、链接也能过（符号名一样），但运行时会拿数组开头那 8 个字节当地址用——一个不会报错、只会崩溃的经典跨文件 bug。

## 客观题

### q-s7-iv-pointer-array-1 single
本平台是 64 位环境（`int` 4 字节、指针 8 字节）。执行 `int a[5] = {0}; int *p = a;` 之后，下面哪一句是**正确**的？

- [x] `sizeof a` 是 20，`sizeof p` 是 8，而 `p == a` 为真。
  > 正确。`sizeof` 是少数几个"数组名不退化"的场合，看到的是整个 `int[5]`，所以是 20；`p` 是一个指针对象，所以是 8。而 `p = a` 时 `a` 退化成 `&a[0]`，两者值相同，所以 `p == a` 为真——**值相同不代表类型相同**。
- [ ] `sizeof a` 和 `sizeof p` 都是 8，因为数组名就是指针。
  > 错。"数组名就是指针"是最常见的错误说法。数组名只在表达式里**退化**成指针；`sizeof` 恰好是不退化的场合。如果两者都是 8，`int a[5]` 的 20 字节就没地方解释了。
- [ ] `&a + 1` 和 `a + 1` 是同一个地址，因为 `&a` 和 `a` 的值一样。
  > 错。两者的**值**确实一样，但类型不同：`a` 退化后是 `int *`，`+1` 走 4 字节；`&a` 是 `int (*)[5]`，`+1` 走 20 字节。指针运算的步长只由类型决定。
- [ ] `a` 和 `p` 可以互相赋值：`p = a;` 和 `a = p;` 都合法。
  > 错。`p = a;` 合法（数组名退化成首元素地址）；`a = p;` 非法，数组名不是可修改的左值，编译直接报错。这也是"数组不是指针"最直接的证据。
