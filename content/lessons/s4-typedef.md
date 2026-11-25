---
id: s4-typedef
---

## 讲解

### typedef 只是给已有类型起了个新名字
`typedef` 的语法有点反直觉：新名字写在"变量名"的位置上，但它声明的**不是变量，而是一个类型名**。

```c
typedef unsigned int uint;    /* 从现在起，uint 就是 unsigned int 的另一个写法 */
uint a = 10;                  /* 等价于 unsigned int a = 10; */
```

关键要记住一句话：**typedef 不创造新类型**。`uint` 和 `unsigned int` 是同一个类型，编译器内部把它们当作完全相同的东西，所以下面这些都不会有任何转换警告：

```c run id=td-alias
#include <stdio.h>

typedef unsigned int uint;          /* 只是个别名 */

/* 形参写 unsigned int，传 uint 完全没问题：它们本来就是同一个类型 */
static unsigned int twice(unsigned int v) {
    return v * 2;
}

int main(void) {
    uint a = 21;
    unsigned int b = a;             /* 双向赋值，零警告 */
    uint *pa = &b;
    unsigned int *pb = pa;          /* 指针也能互转，同样零警告 */

    printf("twice(a) = %u\n", twice(a));
    printf("b = %u\n", b);
    printf("sizeof(uint) = %zu, sizeof(unsigned int) = %zu\n",
           sizeof(uint), sizeof(unsigned int));
    printf("sizeof(uint *) = %zu, sizeof(unsigned int *) = %zu\n",
           sizeof(uint *), sizeof(unsigned int *));
    printf("*pb = %u\n", *pb);
    return 0;
}
```
```output
twice(a) = 42
b = 21
sizeof(uint) = 4, sizeof(unsigned int) = 4
sizeof(uint *) = 8, sizeof(unsigned int *) = 8
*pb = 21
```

如果 `uint` 是一个**新类型**，那么把 `uint *` 赋给 `unsigned int *` 至少会得到一条类型不匹配的警告，`sizeof` 也可能不同。实际上什么都没有：typedef 只是让源码更好读，它没有任何运行期或类型系统上的额外含义。

这解释了一件初学者常误解的事：**不能用 typedef 做"重载"或"类型区分"**。`typedef int Meter;` 和 `typedef int Second;` 之后，`Meter` 和 `Second` 仍然是同一个 `int`，把米赋给秒，编译器一句话都不会说。想要"单位安全"，C 里只能靠命名规范、封装成结构体，或者靠人。

### typedef struct 的两种写法
C 里定义结构体类型时，`struct Point` 这样的名字叫 **tag**（标签），它和普通标识符在**不同的命名空间**里。所以两种写法都常见：

```c run id=td-struct
#include <stdio.h>

/* 写法 A：tag 和 typedef 名同名，两套名字都可用 */
typedef struct Point {
    int x;
    int y;
} Point;

/* 写法 B：匿名结构体 + typedef 名，只有 Point 这一个名字 */
typedef struct {
    int x;
    int y;
} Vec;

int main(void) {
    Point p = { 1, 2 };
    struct Point q = { 3, 4 };      /* 写法 A 才能这样写 */
    Vec v = { 5, 6 };

    printf("p = (%d, %d)\n", p.x, p.y);
    printf("q = (%d, %d)\n", q.x, q.y);
    printf("v = (%d, %d)\n", v.x, v.y);
    printf("sizeof(Point) = %zu, sizeof(Vec) = %zu\n", sizeof(Point), sizeof(Vec));
    return 0;
}
```
```output
p = (1, 2)
q = (3, 4)
v = (5, 6)
sizeof(Point) = 8, sizeof(Vec) = 8
```

差别只有一个：写法 B 的结构体是**匿名的**，它根本没有 `struct Vec` 这个名字。于是下面这种写法会直接编译失败：

```c run id=td-anon-ce expect=CE
typedef struct {
    int x;
    int y;
} Vec;

/* 错：Vec 是匿名结构体的别名，并不存在 struct Vec 这个 tag */
static void show(const struct Vec *v) {
    printf("%d\n", v->x);
}

int main(void) {
    Vec v = { 1, 2 };
    show(&v);
    return 0;
}
```

这条错误的后果比"报个错"更隐蔽：在别的文件里写 `struct Vec *` 时，编译器会**当场创建一个新的不完整类型** `struct Vec`，然后告诉你"指针类型不匹配"或者"访问了不完整类型的成员"。报错信息和真正的原因隔了一层，非常难查。所以工程里要么统一用 `typedef struct Vec { ... } Vec;`（tag 和别名同名，两边都能用），要么统一只用别名，**不要混着来**。

### 自引用结构体：typedef 名在结构体内部还不能用
链表节点必须包含"指向自己这种类型的指针"。这时 typedef 名还没生效，成员里只能用 tag：

```c run id=td-selfref
#include <stdio.h>

/* 成员里的 struct Node 用的是 tag：写 typedef 的这一行时，Node 这个名字还没生效 */
typedef struct Node {
    int value;
    struct Node *next;
} Node;

int main(void) {
    Node c = { 3, NULL };
    Node b = { 2, &c };
    Node a = { 1, &b };

    for (const Node *p = &a; p != NULL; p = p->next) {
        printf("%d%s", p->value, p->next ? " -> " : "\n");
    }
    printf("sizeof(Node) = %zu\n", sizeof(Node));
    return 0;
}
```
```output
1 -> 2 -> 3
sizeof(Node) = 16
```

把成员写成 `Node *next` 就错了：

```c run id=td-selfref-ce expect=CE
/* 错：声明到这一行时，Node 这个 typedef 名还不存在 */
typedef struct Node {
    int value;
    Node *next;
} Node;

int main(void) {
    Node n = { 1, NULL };
    return n.value;
}
```

规则很简单：**typedef 名在 `typedef ... ;` 这条语句结束之后才可见**。在结构体内部要指回自己，只能用 `struct 标签`。

### typedef 与 #define 的区别
两者都能"给类型起个名字"，但机制完全不同：`#define` 是**预处理阶段的文本替换**，typedef 是**编译阶段的类型声明**。差别在"逗号声明多个变量"时最致命：

```c run id=td-define
#include <stdio.h>

#define PINT int *        /* 文本替换：PINT 就是 "int *" 这两个记号 */
typedef int *TINT;        /* 类型别名：TINT 是一个完整的类型 */

int main(void) {
    int x = 7;
    PINT a, b;            /* 展开成 int *a, b; → b 是 int，不是指针！ */
    TINT c, d;            /* c 和 d 都是指针 */

    a = &x;
    b = 3;
    c = &x;
    d = &x;

    printf("sizeof(a) = %zu, sizeof(b) = %zu\n", sizeof(a), sizeof(b));
    printf("sizeof(c) = %zu, sizeof(d) = %zu\n", sizeof(c), sizeof(d));
    printf("*a = %d, b = %d, *c + *d = %d\n", *a, b, *c + *d);
    return 0;
}
```
```output
sizeof(a) = 8, sizeof(b) = 4
sizeof(c) = 8, sizeof(d) = 8
*a = 7, b = 3, *c + *d = 14
```

`PINT a, b;` 展开后是 `int *a, b;`——`*` 只贴着 `a`，`b` 是货真价实的 `int`。这就是"宏不参与语法分析"的直接后果。

还有两条差别值得记住：

| | `typedef` | `#define` |
|---|---|---|
| 处理阶段 | 编译期（真正的类型声明） | 预处理期（纯文本替换） |
| 作用域 | 遵守块作用域，可以写在函数里 | 从定义处到文件末尾（或 `#undef`） |
| 指针语义 | `TINT a, b;` 两个都是指针 | `PINT a, b;` 只有 `a` 是 |
| 调试信息 | 调试器里能看到这个名字 | 调试器里只能看到展开后的类型 |
| 能否被 `#undef` | 不能 | 能 |

所以**类型别名一律用 typedef，不要用宏**。

### typedef 指针类型 + const 的陷阱
这是本节最容易咬人的地方。先把结论写出来：`const IntPtr` 里的 `const` 修饰的是**指针本身**，不是它指向的数据。

```c run id=td-const-ptr
#include <stdio.h>

typedef int *IntPtr;
typedef const int *CIntPtr;      /* 这个才是"指向 const int 的指针" */

/* 形参写 const IntPtr：承诺"不改指针"，但完全可以改它指向的 int */
static void overwrite(const IntPtr p) {
    *p = 99;                     /* 合法！const 修饰的是 p，不是 *p */
}

/* 形参写 CIntPtr：承诺"不改 *p"，想改编译器会拦下来 */
static int read_only(CIntPtr p) {
    return *p;
}

int main(void) {
    int x = 1;
    IntPtr p = &x;

    printf("调用前 x = %d\n", x);
    overwrite(p);
    printf("调用后 x = %d\n", x);

    CIntPtr q = &x;
    printf("只读指针读到 %d\n", read_only(q));
    printf("sizeof(IntPtr) = %zu, sizeof(CIntPtr) = %zu\n", sizeof(IntPtr), sizeof(CIntPtr));
    return 0;
}
```
```output
调用前 x = 1
调用后 x = 99
只读指针读到 99
sizeof(IntPtr) = 8, sizeof(CIntPtr) = 8
```

`overwrite` 的签名看起来在说"我不会动你的数据"，实际上它把 `x` 改成了 99。而 `const IntPtr p` 真正保护的是 `p` 自己不能被改指向：

```c run id=td-const-ptr-ce expect=CE
typedef int *IntPtr;

int main(void) {
    int x = 1;
    int y = 2;
    const IntPtr p = &x;   /* p 是 const 指针 */
    p = &y;                /* 错：不能给 const 指针重新赋值 */
    *p = 3;                /* 这一句反而是合法的 */
    return x + y;
}
```

要表达"函数不会修改我指向的数据"，必须写成 `const int *`（或者先 `typedef const int *CIntPtr;` 再写 `CIntPtr`）。判断口诀：**从右往左读**——`const IntPtr p` 读作"p 是 const 的 IntPtr"，`const int *p` 读作"p 是指向 const int 的指针"。

### 同一个名字，两种含义：typedef 冲突
typedef 名和变量名在**同一个命名空间**里，所以同一个作用域内不能给同一个名字两个不同的类型：

```c run id=td-conflict-ce expect=CE
/* money.h：金额单位是「分」，必须用 64 位 */
typedef long long Money;

/* legacy.h：金额单位是「元」，历史上用 int */
typedef int Money;      /* 错：typedef redefinition with different types */

int main(void) {
    Money m = 0;
    return (int)m;
}
```

编译器会明确报 `typedef redefinition with different types ('int' vs 'long long')`。但真正的问题不在编译器，而在**设计**：这两个名字虽然写法一样，含义（单位）完全不同。哪怕把其中一个改成 `typedef long long Money;` 让编译通过，也埋下了"把分当元"的隐患——100 倍的错误，而且不报任何警告。

正确的做法是**让名字带上语义**：`typedef long long MoneyFen;` 与 `typedef int LegacyYuan;`。名字不同、单位不同、类型不同，谁都不会搞混。

这一点在跨文件工程里尤其重要：两个模块各自写了一个"看起来一样"的 typedef，一旦某个 `.c` 同时包含了两个头文件，就会得到上面那个编译错误。**修的时候不要只挑一个删掉，先想清楚这两个类型是不是同一件事。**

## 编译与运行

用 gcc 或 clang 编译都行，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra -Wpedantic typedef_demo.c -o typedef_demo
./typedef_demo
```

```bash
clang -std=c17 -Wall -Wextra -Wpedantic typedef_demo.c -o typedef_demo
./typedef_demo
```

`-Wpedantic` 在这里很值得加：它会指出 `typedef` 重复定义、`struct` 与 typedef 名混用等标准层面的问题；`-Wall -Wextra` 则负责"类型不匹配"这类错误。

想看 typedef 到底有没有生成新类型，可以让编译器把类型打印出来：

```bash
clang -std=c17 -Xclang -ast-dump -fsyntax-only typedef_demo.c | grep -i "TypedefDecl"
```

输出里能看到 `TypedefDecl ... referencedType: 'unsigned int'`——`referencedType` 才是真相：typedef 只是一个指向既有类型的名字。

几点说明：

- 调试时也一样：`clang -g` 生成的调试信息里带 typedef 名，所以 GDB/LLDB 会显示 `uint` 而不是 `unsigned int`，这是 typedef 少数"有实体"的地方；
- `typedef` 可以写在函数体内，作用域到块结束为止；`#define` 做不到这一点（它只认行号）；
- 头文件里的 typedef 会被每个包含它的 `.c` 看到，所以**头文件里的 typedef 名必须当成全局名字来设计**，前缀、单位、位宽都写清楚。

## 常见错误

### 对匿名结构体写 struct 标签 [CE]
`typedef struct { ... } Vec;` 之后写 `struct Vec *` 或者 `struct Vec v;`，编译器会把它当成一个**全新的、不完整的类型**：要么报"访问不完整类型的成员"，要么在赋值时报警告。要么把 tag 写上（`typedef struct Vec { ... } Vec;`），要么全程只用 `Vec`。

```c run id=td-err-anon expect=CE
typedef struct {
    int x;
} Vec;

static int get_x(const struct Vec *v) {
    return v->x;              /* 错：struct Vec 是不完整类型 */
}

int main(void) {
    Vec v = { 1 };
    return get_x(&v);
}
```

### 自引用结构体里用 typedef 名 [CE]
`typedef struct Node { Node *next; } Node;` 编译不过，因为写成员时 `Node` 还不存在。正确写法是成员里用 `struct Node *next;`——tag 在 `struct Node {` 这几个字出现的那一刻就已经可见了。

### 把 `const IntPtr` 当成"指向 const 的指针" [WA]
`typedef int *IntPtr;` 之后，`const IntPtr p` 是 **const 指针**：`p = &y` 编译失败，而 `*p = 99` 完全合法。如果你的本意是"函数不修改我传进来的数据"，这个写法等于什么都没保证，数据被悄悄改掉，函数还看起来人畜无害。

```c run id=td-err-constptr
#include <stdio.h>

typedef int *IntPtr;

/* 意图是"只读"，实际写成了 const 指针 */
static int peek(const IntPtr p) {
    *p = 0;                  /* 编译器不会拦：const 修饰的是 p */
    return *p;
}

int main(void) {
    int x = 42;
    printf("peek 之前 x = %d\n", x);
    printf("peek 返回 %d\n", peek(&x));
    printf("peek 之后 x = %d\n", x);
    return 0;
}
```
```output
peek 之前 x = 42
peek 返回 0
peek 之后 x = 0
```

改成 `typedef const int *CIntPtr;`（或直接用 `const int *`）之后，`*p = 0` 才会被编译器拒绝。

### 两个头文件用同一个 typedef 名表示不同含义 [CE]
`money.h` 写 `typedef long long Money;`（分），`legacy.h` 写 `typedef int Money;`（元），某个 `.c` 同时包含两个头文件——立刻得到 `typedef redefinition with different types`。修法不是"随便留一个"，而是先确认两者是不是同一件事：单位不同就必须改名（如 `MoneyFen` / `LegacyYuan`）。

### 以为 typedef 能区分不同的"单位" [WA]
`typedef int Meter;` 和 `typedef int Second;` 之后，把 `Meter` 传给要 `Second` 的函数，编译器毫无反应——它们是同一个 `int`。typedef 只改名字，不改类型系统，所以它做不了"单位检查"。

## 客观题

### q-s4-typedef-1 single
下面的代码中，`p` 是什么类型？哪一句会编译失败？

```c
typedef int *IntPtr;

int main(void) {
    int x = 1, y = 2;
    const IntPtr p = &x;
    *p = 10;
    p = &y;
    return 0;
}
```

- [x] `p` 是 `int *const`（const 指针）：`*p = 10;` 合法，`p = &y;` 编译失败
  > 正确。`const` 修饰的是 `IntPtr` 这个整体，也就是指针本身，所以 `p` 一旦初始化就不能再指向别处（`p = &y;` 报错）；但 `p` 指向的 `int` 没有被 const 修饰，`*p = 10;` 完全合法。这类写法的实际效果与"只读参数"的意图正好相反。
- [ ] `p` 是 `const int *`（指向 const int 的指针）：`p = &y;` 合法，`*p = 10;` 编译失败
  > 错。这是最常见的误读。typedef 是"整体替换"，`const IntPtr` 等价于 `int *const`，不是 `const int *`。想表达"指向 const int 的指针"必须写 `typedef const int *CIntPtr;`，或者干脆不用 typedef，直接写 `const int *p`。
- [ ] 两句都合法，因为 typedef 只是别名，`const` 会被忽略
  > 错。typedef 是别名，但 `const` 不会因此被忽略：它作用在别名所代表的完整类型上（这里是指针），于是 `p` 成了只读变量，给它赋值就是编译错误。
- [ ] 两句都编译失败，因为 `const` 修饰了 `IntPtr` 就修饰了它指向的数据
  > 错。`const` 只作用在它直接修饰的对象上，也就是指针 `p` 本身，不会"穿透"到 `p` 指向的 `int`。要保护被指向的数据，必须把 `const` 写在 `*` 的左边（`const int *`）。
