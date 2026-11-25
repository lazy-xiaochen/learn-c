---
id: s4-struct-pointer
---

## 讲解

### 指向结构体的指针：保存的是结构体的首地址
结构体变量和 `int` 变量一样有地址，`&s` 得到的是整个结构体的首地址，类型是 `struct Point *`。把地址存进指针之后，通过指针就能读写结构体：

```c
struct Point { int x; int y; };

struct Point s = { 1, 2 };
struct Point *p = &s;      /* p 里存的是 s 的首地址 */
```

`p` 本身也是一个对象，在 64 位平台上占 8 字节；它的值不是 `1`、`2`，而是 `s` 的地址。所以 `sizeof(p) == 8`，而 `sizeof(*p) == sizeof(struct Point)`——**指针的大小和它指向的类型大小无关**。

### `p->x` 就是 `(*p).x`：一个语法糖，不是两种操作
要通过指针访问成员，最直白的写法是先解引用、再用 `.`：

```c
(*p).x       /* 先得到 p 指向的结构体，再访问它的 x 成员 */
```

括号不能省。C 的优先级规定 `.` 和 `->` 比一元 `*` 结合得紧，所以 `*p.x` 会被解析成 `*(p.x)`：先试图从指针 `p` 里取名为 `x` 的成员。`p` 是指针，没有成员，编译直接失败。

`->` 运算符就是为这个场景发明的，`p->x` 与 `(*p).x` **完全等价**：

```c run id=s4sp-deref
#include <stdio.h>

struct Point {
    int x;
    int y;
};

int main(void) {
    struct Point s = { 1, 2 };
    struct Point *p = &s;

    printf("before: s=(%d,%d)\n", s.x, s.y);
    p->x = 10;             /* 等价于 (*p).x = 10 */
    (*p).y = 20;           /* 两种写法可以混用，语义完全相同 */
    printf("after:  s=(%d,%d)\n", s.x, s.y);
    printf("p->x=%d (*p).x=%d\n", p->x, (*p).x);
    printf("p points to s? %d\n", p == &s);
    return 0;
}
```
```output
before: s=(1,2)
after:  s=(10,20)
p->x=10 (*p).x=10
p points to s? 1
```

`p->x = 10` 修改的是 `p` 指向的那份 `s`，不是 `p` 的副本；而 `struct Point t = *p;` 才是把整个结构体复制一份。**`*p` 作为左值时代表"p 指向的那个对象"，作为右值时代表"那个对象的值"**，这是理解指针修改原值的关键。

### 用结构体指针遍历结构体数组
数组名在大多数表达式里会退化成指向首元素的指针。`struct Point a[4]` 的数组名 `a` 退化成 `struct Point *`，于是可以用指针遍历：

```c
for (struct Point *p = a; p < a + 4; p++) {
    /* p 依次指向 a[0]、a[1]、a[2]、a[3] */
}
```

`p++` 不是加 1 字节，而是加 `sizeof(struct Point)` 字节，正好跳到下一个元素。这就是指针算术的"步长由所指类型决定"：

```c run id=s4sp-walk
#include <stdio.h>

struct Point {
    int x;
    int y;
};

int main(void) {
    struct Point a[4] = { { 1, 2 }, { 3, 4 }, { 5, 6 }, { 7, 8 } };

    int sum_x = 0;
    int sum_y = 0;
    for (struct Point *p = a; p < a + 4; p++) {
        sum_x += p->x;
        sum_y += p->y;
    }
    printf("sum_x=%d sum_y=%d\n", sum_x, sum_y);

    struct Point *q = a + 2;          /* 指向 a[2] */
    printf("q->x=%d, (q+1)->y=%d\n", q->x, (q + 1)->y);
    printf("q - a = %td\n", q - a);   /* 指针相减得到元素个数，不是字节数 */
    printf("stride = %td\n", (char *)(a + 1) - (char *)a);
    return 0;
}
```
```output
sum_x=16 sum_y=20
q->x=5, (q+1)->y=8
q - a = 2
stride = 8
```

`q - a` 是 2，因为中间隔了两个 `struct Point`；`stride` 是 8，因为一个 `struct Point` 含两个 `int`。**不要把 `q - a` 和 `(char *)q - (char *)a` 混为一谈**：前者以元素为单位，后者以字节为单位。遍历数组时写 `p < a + n`，不要写 `p < a + n * sizeof(struct Point)`——后者会越过数组末尾，是未定义行为。

内存图（`struct Point s` 和指向它的指针 `p`，地址为示意）：

```memory title="struct Point s = {10, 20}; struct Point *p = &s;"
地址(示意) | 内容 | 变量 | 说明
0x7ffd2000 | 10 | s.x | 结构体首地址，占 4 字节
0x7ffd2004 | 20 | s.y | 下一个 int，偏移 4
0x7ffd2008 | 0x7ffd2000 | p | 指针自身占 8 字节，值是 s 的首地址
0x7ffd2010 | （未使用） | — | p 之后的栈空间
```

`p->x` 的执行过程是：读出 `p` 里的地址 `0x7ffd2000`，加上 `x` 的偏移 0，再按 `int` 读 4 字节。`p->y` 则加 4。**偏移在编译期确定，指针的值在运行期确定**，两者相加才是最终地址。

### 结构体里的指针成员：赋值复制的是指针，不是它指向的内容
结构体可以包含指针成员，例如：

```c
struct Label {
    const char *text;
    int len;
};
```

`struct Label b = a;` 会逐个成员复制，`text` 成员复制的是**指针的值**（一个地址），而不是它指向的字符内容。于是 `a.text` 和 `b.text` 指向同一块缓冲区，通过任意一份修改，另一份都会看到：

```c run id=s4sp-shallow
#include <stdio.h>

struct Label {
    const char *text;
    int len;
};

int main(void) {
    char buf[8] = "abc";
    struct Label a = { buf, 3 };
    struct Label b = a;              /* 浅拷贝：只复制指针的值 */

    printf("a=%s b=%s\n", a.text, b.text);
    buf[0] = 'X';                    /* 通过缓冲区修改，两份副本都会看到 */
    printf("a=%s b=%s\n", a.text, b.text);
    printf("same pointer? %d\n", a.text == b.text);
    return 0;
}
```
```output
a=abc b=abc
a=Xbc b=Xbc
same pointer? 1
```

这叫**浅拷贝（shallow copy）**。如果成员是数组（`char text[8]`），整体赋值会逐字节复制数组内容，两份就互相独立；如果成员是指针，复制的只是"指向哪里"这个信息。想得到独立的字符串副本，必须另外分配一块内存并复制内容（第 5 阶段学了 `malloc` 之后才能做深拷贝），或者干脆用固定大小的数组成员。

## 编译与运行

用 gcc 或 clang 编译：

```bash
gcc -std=c17 -Wall -Wextra point.c -o point
./point
```

```bash
clang -std=c17 -Wall -Wextra point.c -o point
./point
```

几个实用检查：

- `sizeof(struct Point *)` 是 8，`sizeof(struct Point)` 是成员大小加对齐后的结果；
- `-Wall -Wextra` 会把 `*p.x` 报成错误，也会对"未初始化指针"给出部分警告（不是全部）；
- 如果函数只读结构体，参数写成 `const struct Point *p`，这样 `p->x = 1` 会在编译期被拒绝，调用者也能从签名看出"不会改我的数据"。

想看指针遍历到底跳了多少字节，可以打印 `(char *)(p + 1) - (char *)p`；不要打印绝对地址，地址每次运行都可能不同，也无法写进预期输出。

## 常见错误

### 把 `p->x` 写成 `*p.x` [CE]
`.` 的优先级高于 `*`，`*p.x` 等价于 `*(p.x)`：编译器先试图访问指针 `p` 的成员 `x`，但 `p` 是 `struct Point *`，没有成员，于是报 `member reference base type 'struct Point *' is not a structure`。正确写法是 `(*p).x` 或 `p->x`。

```c run id=s4sp-err-deref expect=CE
#include <stdio.h>

struct Point {
    int x;
    int y;
};

int main(void) {
    struct Point s = { 1, 2 };
    struct Point *p = &s;
    printf("%d\n", *p.x);       /* 错：被解析成 *(p.x) */
    return 0;
}
```

### 对结构体变量使用 -> [CE]
`->` 的左边必须是指针；`s` 是 `struct Point` 对象，只能用 `s.x`。写成 `s->x` 会得到 `member reference type 'struct Point' is not a pointer` 一类的错误。反过来，指针也不能直接用 `.`，必须写 `(*p).x` 或 `p->x`。

```c run id=s4sp-err-arrow-on-value expect=CE
#include <stdio.h>

struct Point {
    int x;
    int y;
};

int main(void) {
    struct Point s = { 1, 2 };
    printf("%d\n", s->x);       /* 错：s 不是指针 */
    return 0;
}
```

### 声明了结构体指针却没有让它指向任何对象 [UB]
`struct Point *p;` 只声明了一个指针变量，它的值是不确定的（野指针）。随后 `p->x = 1;` 会往一个随机地址写数据，属于未定义行为：可能立刻崩溃（RE/UB），也可能悄悄改坏别的变量，看起来"程序还在跑"。指针在使用前必须初始化：`struct Point *p = &s;` 或 `struct Point *p = a;`，并在解引用前确认它不是 `NULL`。

### 以为结构体赋值会复制指针成员指向的内容 [WA]
`struct Label b = a;` 之后，`b.text` 和 `a.text` 是同一个地址；通过 `b.text` 改缓冲区，`a.text` 看到的内容也会变。要得到独立副本，必须复制内容本身（数组或动态分配），而不是只复制指针。这个坑在字符串、链表节点、文件缓冲区上都非常常见。

### 指针遍历时把元素个数乘上 sizeof [UB]
`for (struct Point *p = a; p < a + n * sizeof(struct Point); p++)` 会让循环指针走到数组之外很远的地方，之后解引用就是越界访问。指针算术的单位已经是元素，正确写法是 `p < a + n`。

## 客观题

### q-s4-struct-pointer-1 single
有下面的代码：

```c
struct Point {
    int x;
    int y;
};

struct Point s = { 1, 2 };
struct Point *p = &s;
```

下面哪一个语句是**正确**的？

- [x] `p->x = 10;`
  > 正确。`p` 是 `struct Point *`，`->` 左边是指针，右边是成员名；`p->x` 等价于 `(*p).x`，修改的就是 `s.x`。
- [ ] `*p.x = 10;`
  > 错。`.` 的优先级高于 `*`，这句被解析成 `*(p.x) = 10`。`p` 是指针类型，没有名为 `x` 的成员，编译直接失败。
- [ ] `p.x = 10;`
  > 错。`p` 是指针，不是结构体对象，不能直接用 `.` 访问成员；要写 `p->x` 或 `(*p).x`。
- [ ] `*p->x = 10;`
  > 错。`p->x` 的类型是 `int`（不是指针），再对它解引用 `*` 没有意义，编译器会报"indirection requires pointer operand"。
