---
id: s2-const-pointer
---

## 讲解

### 同一个 const，放在不同位置，锁住的东西不一样
`const` 和指针一起出现时，有三种完全不同的组合，初学者最容易把它们当成"一回事"：

```c
const int *p;          /* ① 指向的内容只读：不能写 *p，但 p 可以改指向 */
int * const p;         /* ② 指针自己只读：p 不能改指向，但可以写 *p */
const int * const p;   /* ③ 两个都锁：既不能写 *p，也不能改 p */
```

关键只有一句话：**`const` 修饰的是它左边最近的东西；如果左边没有东西，就修饰右边的类型。** 再配合"从变量名出发，先向右看，再向左看"的读法：

- `const int *p`：从 `p` 往左看，先是 `*`（p 是指针），再往左是 `const int`（指向只读的 int）。所以 `const` 管的是**被指向的值**。
- `int * const p`：从 `p` 往右看，`const` 紧挨着 `p`，说明 **`p` 本身**是只读的；再往左是 `int *`（它的类型是"指向 int 的指针"）。
- `const int * const p`：两个 `const`，一个管值、一个管指针。

一个便于记忆的口诀：**`const` 在 `*` 左边就锁值，在 `*` 右边就锁指针。** 注意 `const int *p` 和 `int const *p` 是**完全相同**的声明——`const` 放在 `int` 前面还是后面都修饰 `int`，这两种写法没有区别。

### ① `const int *p`：承诺"不通过 p 改值"
这种写法最常见，叫"指向常量的指针"。p 自己是个普通指针变量，可以随时改指向；但通过 p 只能读、不能写。

```c run id=ptr-to-const
#include <stdio.h>

int main(void) {
    int x = 10;
    int y = 20;
    const int *p = &x;          /* p 指向"只读的 int" */

    printf("x = %d，*p = %d\n", x, *p);
    p = &y;                     /* 可以：p 自己不是 const */
    printf("y = %d，*p = %d\n", y, *p);

    /* *p = 30;                 编译错误：不能通过 const 指针写值 */
    return 0;
}
```
```output
x = 10，*p = 10
y = 20，*p = 20
```

`p = &y;` 合法，`*p = 30;` 不合法。编译器会报 `error: read-only variable is not assignable` 之类的错误——不是运行时的错误，而是编译期就被拦住了。

### ② `int * const p`：指针自己锁死，必须初始化
这种写法叫"常量指针"。p 一旦初始化就再也不能指向别处，但通过 p 读写它指向的内容完全没问题。

```c run id=const-ptr
#include <stdio.h>

int main(void) {
    int x = 10;
    int * const p = &x;         /* p 自己是只读的，定义时必须初始化 */

    *p = 99;                    /* 可以：通过 p 改 x 的值 */
    printf("x = %d，*p = %d\n", x, *p);

    /* p = NULL;                 编译错误：p 是 const 指针，不能再赋值 */
    return 0;
}
```
```output
x = 99，*p = 99
```

两个要点：
1. `int * const p;` **不写初始化就再也无法赋值**，所以它必须在定义时初始化。Clang 会提醒 `default initialization of an object of type 'int *const' leaves the object uninitialized`——定义时就写 `= &x`。
2. `x` 和 `*p` 打印出来都是 99，因为它们本来就是同一块内存的两个名字。

### ③ `const int * const p`：值和指向都锁住
两个 `const` 都写上的情况，通常用于"只读的查找表指针"——比如一个固定指向常量表的全局指针。

```c run id=const-ptr-const
#include <stdio.h>

int main(void) {
    const int x = 7;
    const int * const p = &x;   /* 值和指针都锁住 */

    printf("x = %d，*p = %d，sizeof p = %zu\n", x, *p, sizeof p);

    /* *p = 8;                   编译错误：值只读 */
    /* p = NULL;                 编译错误：指针只读 */
    return 0;
}
```
```output
x = 7，*p = 7，sizeof p = 8
```

`sizeof p` 是 8，说明 `const` 没有改变指针本身的大小——它只影响编译器允许你做什么，不占任何额外的存储空间。

### const 锁的是"这条路"，不是那块内存
这是理解 `const` 最重要的观念：`const` 限制的是**通过这个指针访问**时的写权限，并不代表那块内存真的变成了只读。

```c run id=path-not-memory
#include <stdio.h>

int main(void) {
    int x = 7;
    const int *p = &x;    /* 承诺"不通过 p 改 x" */

    x = 8;                /* 用 x 自己的名字改，完全合法 */
    printf("*p = %d\n", *p);
    return 0;
}
```
```output
*p = 8
```

`x` 本身不是 `const`，所以 `x = 8;` 完全合法；`p` 只是保证"我不会用 p 去改"。如果希望连 `x` 自己也不能改，就要把对象声明成 `const int x = 7;`——那时 `const int *p = &x;` 才真正对应一块只读对象。

```memory title="int x = 10; const int *p = &x; int * const q = &x;（地址为示意，实际每次运行可能不同）"
地址    | 内容   | 名字 | 声明                    | 能否改指向的值   | 能否改指针自己
0x1000  | 10     | x    | int x = 10;             | 可以（x = 20）   | —
0x2000  | 0x1000 | p    | const int *p = &x;      | 不可以            | 可以（p = &y）
0x2008  | 0x1000 | q    | int * const q = &x;     | 可以（*q = 20）   | 不可以（q = &y 编译错误）
```

### 函数参数里的 const：一份写进类型里的承诺
函数参数是最能体现 `const` 价值的地方。把形参写成 `const int *a`，等于向所有调用者声明："我只会读这个数组，不会改它。"

```c run id=const-param
#include <stdio.h>

long sum(const int *a, int n) {       /* 承诺不修改数组 */
    long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int main(void) {
    const int a[4] = {1, 2, 3, 4};
    int b[3] = {10, 20, 30};

    printf("sum(a) = %ld\n", sum(a, 4));   /* const 数组只能传给 const 参数 */
    printf("sum(b) = %ld\n", sum(b, 3));   /* 普通数组也可以传：限制只会变多 */
    return 0;
}
```
```output
sum(a) = 10
sum(b) = 60
```

注意 `sum(a, 4)`：`a` 是 `const int[4]`，如果 `sum` 的形参写成 `int *a`，这个调用就是"把只读的东西交给可写的接口"，编译器会给出 `discards qualifiers` 的警告。加上 `const` 之后，两种数组都能传进来——**参数加 const 只会让函数能被更多调用者使用，不会变窄**。

还有一个容易忽略的细节：`int * const p` 作为**函数参数**几乎没有意义。因为参数是值传递，函数里的 `p` 只是调用者指针的一个副本，就算函数里写了 `p = ...`，改变的也只是这个副本，调用者根本感觉不到。只有 `const int *`（锁值）对调用者有意义。

### 类型转换是单向的：加 const 安全，去掉 const 危险
- `int *` → `const int *`：**自动、隐式、安全**。你只是承诺得更多。
- `const int *` → `int *`：必须先强制转换，而且如果真正指向的对象是 const，通过它写入就是**未定义行为**。

还有一个反直觉的规则：`int **` **不能**隐式转换成 `const int **`。这不是编译器多事，而是因为一旦允许，就能绕过 const 改掉真正的常量：

```c
const int c = 5;
int *p;
const int **pp = &p;   /* C 语言不允许这一步 */
*pp = &c;              /* 如果允许：p 就指向了 c */
*p = 6;                /* 结果通过 p 改掉了 const 变量 c */
```

所以看到 `const int **` 时不要想当然：**每一层指针的 const 都要单独考虑**，多级指针的 const 是后面"多级指针"一节会再次遇到的话题。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra const.c -o const
./const
```

本平台用 Clang，命令等价：`clang -std=c17 -Wall -Wextra const.c -o const`。
和 `const` 有关的错误全部发生在**编译期**，例如：

```
error: cannot assign to variable 'p' with const-qualified type 'int *const'
error: read-only variable is not assignable
```

看到这两类报错时，先回到声明处，从变量名出发往左右各读一遍：`const` 到底管的是值还是指针。

## 常见错误

### 以为 `const int *p` 表示"p 不能改指向"
正好相反。`const int *p` 锁的是 **`*p`**：`*p = 5;` 编译错误，而 `p = &y;` 完全合法。想锁指针本身要写 `int * const p`。判断方法：找到 `*`，看 `const` 在它的左边还是右边。

### 以为 `int * const p` 表示"不能修改 p 指向的值"
`int * const p = &x;` 里，`*p = 99;` 是合法的，只有 `p = &y;` 才非法。这两种组合的方向刚好相反，是最常见的混淆点。

### 用强制转换去掉 const 后写值
```c
const int x = 5;
int *p = (int *)&x;
*p = 6;              /* 未定义行为 */
```
能编译不等于合法。如果 `x` 真的被放在了只读段（例如字符串字面量、`static const` 表），程序会直接崩溃；即使没崩溃，结果也不可依赖。需要修改的值，一开始就不要声明成 const。

### 在函数参数里漏掉 const
```c
long sum(int *a, int n);        /* 调用者手里是 const 数组时就传不进来 */
```
一旦调用者持有 `const int *`，把它传给 `int *` 形参就是"丢弃限定符"，编译器会报错或给出警告。只读的函数参数一律写成 `const int *`，这是 C 代码的通行约定。

### 以为 `const int` 和 `int` 的 sizeof 不同
`const` 只是编译期的访问限制，不改变类型的大小，也不改变内存布局：`sizeof(const int) == sizeof(int)`，`sizeof(const int *) == sizeof(int *)`。

## 客观题

### q-s2-const-pointer-1 single
下面哪个声明**既不能**通过 `p` 修改它指向的值，**也不能**让 `p` 改指向别的变量？

- [ ] `const int *p;`
  > 这个声明只锁住了"被指向的值"：`*p = 5;` 编译错误，但 `p = &y;` 是合法的。指针本身没有 const。
- [ ] `int * const p;`
  > 这个声明只锁住了指针自己：`p = &y;` 编译错误，但 `*p = 5;` 完全合法，它锁的方向和题目要求相反。
- [x] `const int * const p;`
  > 正确。第一个 const 锁住被指向的值（`*p` 不能写），第二个 const 锁住指针自己（`p` 不能改指向），两个操作都会在编译期被拒绝。
- [ ] `int const *p;`
  > 它和 `const int *p` 完全等价（const 放在 int 前或后都修饰 int），只锁值不锁指针，`p = &y;` 依然合法。
