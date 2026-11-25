---
id: s4-struct-param
---

## 讲解

### 按值传参：函数拿到的是一份副本
C 语言里**只有一种传参方式：值传递**。调用 `f(a)` 时，编译器把 `a` 的**值**复制一份交给 `f`，`f` 里的形参是另一块独立的内存。对 `int` 这种 4 字节的类型，复制一份几乎无感；但结构体是一个整体，复制它意味着**把整块内存搬一遍**。

先用一个实验确认"副本"这件事。函数里把形参的地址和原变量的地址都拿出来比一比：

```c run id=sp-copy
#include <stdio.h>

typedef struct {
    long long x;
    long long y;
} Point;

/* 按值传参：p 是 a 的一份独立副本，origin 只是用来对比地址 */
static void move_by_value(Point p, long long dx, long long dy, const Point *origin) {
    p.x += dx;
    p.y += dy;
    printf("函数内 p = (%lld, %lld)\n", p.x, p.y);
    printf("形参 p 和原变量是同一块内存吗？%s\n",
           ((const void *)&p == (const void *)origin) ? "是" : "不是");
}

int main(void) {
    Point a = { 1, 2 };
    printf("调用前 a = (%lld, %lld)\n", a.x, a.y);
    move_by_value(a, 10, 20, &a);
    printf("调用后 a = (%lld, %lld)\n", a.x, a.y);
    printf("sizeof(Point) = %zu 字节\n", sizeof(Point));
    return 0;
}
```
```output
调用前 a = (1, 2)
函数内 p = (11, 22)
形参 p 和原变量是同一块内存吗？不是
调用后 a = (1, 2)
sizeof(Point) = 16 字节
```

输出里三件事一次说清了：函数内确实把 `p` 改成了 `(11, 22)`；`&p` 和 `&a` 不是同一个地址；`main` 里的 `a` 一点没变。**在函数里改形参，永远改不到调用者的变量**——这不是"编译器没优化好"，而是语言规定的语义。

调用 `move_by_value(a, ...)` 的那一瞬间，内存是这样长出来的：

```memory title="按值传递 Point：main 的 a 与函数形参 p 是两个独立对象"
地址     | 内容      | 变量  | 说明
0x1000   | 1         | a.x   | main 里的实参
0x1008   | 2         | a.y   | 
0x2010   | 1         | p.x   | 形参：调用时从 a 整块复制过来
0x2018   | 2         | p.y   | 改 p.y 不会影响 0x1008 上的 a.y
```

### 复制的代价和 sizeof 成正比
按值传参的开销不是"传一个结构体"这么抽象，它的成本就是 **`sizeof(结构体)` 个字节的内存复制**。结构体里塞一个字符数组、几个 `long long`，每次调用就都要搬这么多：

```c run id=sp-cost
#include <stdio.h>

#define N 1000

typedef struct {
    long long id;
    char name[32];
    long long score[4];
} Student;

static long long g_copied;                 /* 累计"被复制"的字节数 */

static long long sum_by_value(Student s) { /* 按值：每次调用复制整个结构体 */
    g_copied += (long long)sizeof s;
    long long t = 0;
    for (int i = 0; i < 4; i++) {
        t += s.score[i];
    }
    return t;
}

static long long sum_by_ptr(const Student *s) {  /* 传指针：只复制一个地址 */
    g_copied += (long long)sizeof s;
    long long t = 0;
    for (int i = 0; i < 4; i++) {
        t += s->score[i];
    }
    return t;
}

int main(void) {
    Student a[N];
    for (int i = 0; i < N; i++) {
        a[i].id = i;
        a[i].name[0] = 'A';
        a[i].name[1] = '\0';
        for (int k = 0; k < 4; k++) {
            a[i].score[k] = i + k;
        }
    }

    g_copied = 0;
    long long s1 = 0;
    for (int i = 0; i < N; i++) {
        s1 += sum_by_value(a[i]);
    }
    long long copy1 = g_copied;

    g_copied = 0;
    long long s2 = 0;
    for (int i = 0; i < N; i++) {
        s2 += sum_by_ptr(&a[i]);
    }
    long long copy2 = g_copied;

    printf("sizeof(Student) = %zu 字节\n", sizeof(Student));
    printf("按值调用 %d 次：复制 %lld 字节，结果 %lld\n", N, copy1, s1);
    printf("按指针调用 %d 次：复制 %lld 字节，结果 %lld\n", N, copy2, s2);
    printf("函数里的 sizeof 参数：按值 %zu，按指针 %zu\n",
           sizeof(Student), sizeof(Student *));
    return 0;
}
```
```output
sizeof(Student) = 72 字节
按值调用 1000 次：复制 72000 字节，结果 2004000
按指针调用 1000 次：复制 8000 字节，结果 2004000
函数里的 sizeof 参数：按值 72，按指针 8
```

两次调用的结果一模一样，但复制量差了 9 倍：按值每次搬 72 字节，按指针每次只搬 8 字节（一个地址）。结构体再大一点、调用再频繁一点，这个差距会变成真实的性能问题——这就是"结构体不要轻易按值传"的全部理由。

注意最后一行还埋了一个坑：函数内部对**指针形参**做 `sizeof` 得到的是 8（地址的大小），不是结构体的大小。所以传指针的函数必须再传一个长度或标志，不能指望 `sizeof`。

### 想改调用者的变量，就必须传地址
要让函数真正修改调用者的结构体，只能把它的地址传进去。这时形参是 `Point *`，复制的是 8 字节的地址，函数顺着地址去改原来那块内存：

```c run id=sp-pointer
#include <stdio.h>

typedef struct {
    long long x;
    long long y;
} Point;

/* 传指针：函数通过地址修改调用者的对象 */
static void move_in_place(Point *p, long long dx, long long dy) {
    p->x += dx;
    p->y += dy;
}

/* const 指针：只读承诺，函数内部不允许改 *p */
static void print_point(const Point *p) {
    printf("(%lld, %lld)\n", p->x, p->y);
}

int main(void) {
    Point a = { 1, 2 };
    printf("调用前 a = ");
    print_point(&a);

    move_in_place(&a, 10, 20);
    printf("调用后 a = ");
    print_point(&a);

    /* 传指针并没有"共享"结构体，共享的是同一块被指向的内存 */
    Point b = a;              /* 这一句才是真正的整块复制 */
    b.x = 999;
    printf("改 b 之后 a = ");
    print_point(&a);
    printf("sizeof(Point *) = %zu\n", sizeof(Point *));
    return 0;
}
```
```output
调用前 a = (1, 2)
调用后 a = (11, 22)
改 b 之后 a = (11, 22)
sizeof(Point *) = 8
```

`p->x` 是 `(*p).x` 的简写：先顺着地址找到那个结构体，再取成员。`const Point *p` 里的 `const` 修饰的是**被指向的对象**，意思是"我保证不通过 `p` 改它"，于是任何 `p->x = ...` 都会在编译期被拒绝：

```c run id=sp-const-ce expect=CE
typedef struct {
    long long x;
    long long y;
} Point;

/* 错：const 指针不许改它指向的对象 */
static void try_move(const Point *p, long long dx) {
    p->x += dx;
}

int main(void) {
    Point a = { 1, 2 };
    try_move(&a, 10);
    return 0;
}
```

这条规则的价值在于**接口即文档**：看到 `const Point *` 的调用者可以放心，函数不会偷偷改自己的数据；而 `Point *` 就是在明说"这个参数会被改"。写函数时把不该改的参数一律加 `const`，编译器会替你守住这个承诺。

### 返回结构体同样是按值返回
和传参对称，`return` 一个结构体返回的也是**副本**，不是函数里那个局部变量本身：

```c run id=sp-return
#include <stdio.h>

typedef struct {
    long long x;
    long long y;
} Point;

static Point make_point(long long x, long long y) {
    Point p = { x, y };
    return p;                 /* 返回的是 p 的副本 */
}

static Point add(Point a, Point b) {
    Point r = { a.x + b.x, a.y + b.y };
    return r;
}

int main(void) {
    Point a = make_point(1, 2);
    Point b = add(a, make_point(10, 20));
    b.x = 100;
    printf("a = (%lld, %lld)\n", a.x, a.y);
    printf("b = (%lld, %lld)\n", b.x, b.y);
    return 0;
}
```
```output
a = (1, 2)
b = (100, 22)
```

`make_point` 里的 `p` 在函数返回后就随栈帧一起消失了，但你拿到的 `a` 依然有效——因为返回时已经把 `p` 的内容复制出来了。也正因为是副本，`b.x = 100` 不会影响 `a`，更不会影响函数里那个早已不存在的 `p`。

底层有两种实现：小结构体（通常 ≤ 16 字节）直接拆进寄存器带回；大结构体会由**调用者**在自己栈上留一块空间，把地址当作隐藏参数传进去，被调用者直接写那块空间（sret）。两种做法对 C 程序员都不可见，**语义永远是"返回一个副本"**。下一节会看到：这个"副本"性质正是不能返回局部变量地址的原因。

### 结构体数组作为参数
数组作为参数会退化成指向首元素的指针，所以传 `Point a[]` 和传 `Point *a` 是一回事，但"改得动"：

```c run id=sp-array
#include <stdio.h>

#define N 4

typedef struct {
    long long x;
    long long y;
} Point;

/* 数组参数退化成指针：函数拿到的是首元素地址，能改原数组 */
static void scale_all(Point *a, int n, long long k) {
    for (int i = 0; i < n; i++) {
        a[i].x *= k;
        a[i].y *= k;
    }
}

static long long sum_x(const Point *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i].x;
    }
    return s;
}

int main(void) {
    Point a[N] = { { 1, 1 }, { 2, 2 }, { 3, 3 }, { 4, 4 } };
    printf("缩放的倍数是 3，%d 个点的 x 之和：%lld\n", N, sum_x(a, N));
    scale_all(a, N, 3);
    printf("缩放之后 x 之和：%lld\n", sum_x(a, N));
    printf("函数里 sizeof(a) 只剩指针大小：%zu\n", sizeof(Point *));
    return 0;
}
```
```output
缩放的倍数是 3，4 个点的 x 之和：10
缩放之后 x 之和：30
函数里 sizeof(a) 只剩指针大小：8
```

因为 `a` 在参数位置上退化成了指针，函数**无法**用 `sizeof(a) / sizeof(a[0])` 算出元素个数，只能由调用者另外传 `n`。这是结构体数组参数最常见的配合方式。

### 该按值还是该按指针
把上面的实验总结成一张表：

| | 按值 `Point p` | 按指针 `Point *p` / `const Point *p` |
|---|---|---|
| 复制的东西 | 整个结构体（`sizeof` 字节） | 一个地址（8 字节） |
| 能否改调用者的对象 | 不能 | 能（`const` 时不能） |
| 空指针风险 | 没有 | 有，必须先检查 `NULL` |
| 适合的场景 | 小结构体、需要独立副本、函数式风格 | 大结构体、需要就地修改、结构体数组 |
| 接口可读性 | 一眼看出"不会改我的数据" | 加 `const` 才能表达"只读" |

经验法则：

1. **只读 + 小结构体**（两三个 `int`、一个 `Point`）：按值传，最简单、最安全；
2. **只读 + 大结构体**：传 `const Point *`，省掉复制；
3. **要修改**：只能传 `Point *`，并且调用处记得写 `&`；函数里对指针做 `NULL` 检查；
4. **结构体数组**：永远传指针 + 长度，没有别的选择。

## 编译与运行

用 gcc 或 clang 编译都行，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra -O2 struct_param.c -o struct_param
./struct_param
```

```bash
clang -std=c17 -Wall -Wextra -O2 struct_param.c -o struct_param
./struct_param
```

`-Wall -Wextra` 会抓出"传值却想修改"的很多变体（例如把 `p->x` 写成 `p.x` 时类型不对），务必打开。

想看"按值传参到底搬了多少内存"，可以让编译器把结构体传参的汇编打出来：

```bash
clang -std=c17 -O0 -S struct_param.c -o struct_param.s
```

在 x86-64 上，`move_by_value(a, 10, 20, &a)` 的调用点会看到连续的 `mov` 把 `a` 的两条 8 字节字段搬进参数寄存器（或栈上的临时空间）；而 `move_in_place(&a, ...)` 只有一条取地址的 `lea`。结构体一旦超过 16 字节，按值传参就会变成"在栈上拷一大块 + 传指针"，这就是 `sret`/`byval` 那一套 ABI 规则在做的事。

几点说明：

- 加 `-O2` 后，如果函数被内联、结构体只被读，编译器可能把复制整个优化掉——**这是优化，不是语义**。换个编译器、换个优化级别，复制又会回来，所以不能靠"反正会被优化"来写按值传大结构体；
- 把 `-Wpedantic` 加上，可以让"用 `sizeof` 数组参数想算长度"这类写法更容易暴露问题；
- 想看未定义行为，用 `-fsanitize=address,undefined` 编译；传空指针、返回局部变量地址都会被抓出来。

## 常见错误

### 按值传参，然后在函数里"修改"，以为调用者会变 [WA]
这是本节的核心错误：函数签名写 `void move(Point p, ...)`，里面 `p.x += dx;`，调用处 `move(a, 10, 20);`——代码看起来毫无问题，运行后 `a` 纹丝不动。编译器不会报错，因为语法和类型都对；错的是对"值传递"的理解。

```c
#include <stdio.h>

typedef struct {
    long long x;
    long long y;
} Point;

static void move(Point p, long long dx, long long dy) {   /* 错：按值 */
    p.x += dx;
    p.y += dy;
}

int main(void) {
    Point a = { 1, 2 };
    move(a, 10, 20);
    printf("%lld %lld\n", a.x, a.y);
    return 0;
}
```

修法只有两种：把形参改成 `Point *` 并在调用处传 `&a`，或者让函数**返回**修改后的新结构体再赋回给 `a`。

### 传了指针，却忘了写 & [CE]
形参是 `Point *`，调用时写 `move(a, 10, 20)`，编译器会报"参数类型不匹配"（`Point` 不能转成 `Point *`）。这个错误好在编译期就能发现，但初学者常常改成"加个强制转换"来骗过编译器，那就把编译错误变成了运行期的崩溃。

```c run id=sp-missing-amp expect=CE
typedef struct {
    long long x;
    long long y;
} Point;

static void move(Point *p, long long dx) {
    p->x += dx;
}

int main(void) {
    Point a = { 1, 2 };
    move(a, 10);               /* 错：漏了 &a */
    return 0;
}
```

### 用 p.x 访问指针指向的成员 [CE]
`p` 是 `Point *` 时，`p.x` 是错的：`.` 左边必须是一个结构体（或 union）值，不能是指针。要么写 `(*p).x`，要么写 `p->x`。注意 `*p.x` 也不行——`.` 的优先级比 `*` 高，它会被理解成 `*(p.x)`。

### 把结构体指针指向已经消失的局部变量 [RE]
按值返回结构体是安全的（返回副本），但返回**局部变量的地址**是灾难：函数返回后那块栈内存已经作废，调用者拿到的是悬垂指针。本平台的 ASan 会把这种访问判成 `RE`（stack-use-after-return）。

```c run id=sp-dangling-ptr expect=RE
#include <stdio.h>

typedef struct {
    long long x;
    long long y;
} Point;

static Point *make_bad(void) {
    Point p = { 1, 2 };
    return &p;                 /* 错：p 在函数返回后就消失了 */
}

int main(void) {
    Point *q = make_bad();
    printf("%lld %lld\n", q->x, q->y);   /* 读到的是已经作废的栈内存 */
    return 0;
}
```

正确的做法是**返回值**（`static Point make(void)`），让编译器帮你把内容复制出来；或者由调用者提供存储（传 `Point *out` 进去写）。

### 忘了检查结构体指针是不是 NULL [UB]
按值传参时不存在"空结构体"，但改成指针之后，`NULL` 就成了新的失败模式：调用者可能传进来一个空指针，函数里一句 `p->x` 就直接踩空。凡是接收指针参数的函数，第一件事就该是检查。

## 客观题

### q-s4-struct-param-1 single
有下面这段代码。执行后输出的两行分别是什么？

```c
typedef struct { int x; int y; } Point;

static void bump(Point p) {
    p.x += 1;
    p.y += 1;
}

int main(void) {
    Point a = { 1, 2 };
    bump(a);
    printf("%d %d\n", a.x, a.y);
    Point b = a;
    b.x = 100;
    printf("%d %d\n", a.x, a.y);
    return 0;
}
```

- [x] 第一行 `1 2`，第二行 `1 2`
  > 正确。`bump(a)` 是按值传参，`p` 是 `a` 的副本，`p.x += 1` 只改副本，`a` 保持 `(1, 2)`。`Point b = a;` 又是一次整块复制，`b.x = 100` 只改 `b` 自己的那份，所以 `a` 仍然是 `(1, 2)`。
- [ ] 第一行 `2 3`，第二行 `2 3`
  > 错。把 `bump` 当成能改实参的函数了。C 只有值传递，函数里对形参的修改不会传回调用者；想改 `a` 必须传 `&a` 并把形参写成 `Point *`。
- [ ] 第一行 `1 2`，第二行 `100 2`
  > 错。第一行是对的，但第二行把 `b` 和 `a` 当成共享同一块内存了。结构体赋值 `Point b = a;` 复制的是成员的值，两个变量各自独立，改 `b.x` 不会影响 `a.x`。
- [ ] 编译错误：结构体不能用 `=` 赋值
  > 错。C 允许同类型的结构体整体赋值（成员逐一复制），只是**不允许**用 `==` 比较。所以 `Point b = a;` 完全合法，而 `if (a == b)` 才会编译失败。
