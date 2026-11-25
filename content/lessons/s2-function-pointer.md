---
id: s2-function-pointer
---

## 讲解

### 函数也在内存里，函数名就是它的入口地址
程序被编译后，函数的机器指令放在**代码段**里，每个函数都有一段连续的内存。函数名在表达式里会自动转换成"这段代码的入口地址"，也就是**函数指针**。所以函数名和数组名一样，在大多数场合会"退化"成指针。

```c run id=basic
#include <stdio.h>

int add(int a, int b) {
    return a + b;
}

int main(void) {
    int (*fp)(int, int) = add;      /* fp 保存 add 的入口地址 */

    printf("add(2, 3) = %d\n", add(2, 3));
    printf("fp(2, 3) = %d\n", fp(2, 3));
    printf("(*fp)(2, 3) = %d\n", (*fp)(2, 3));
    printf("sizeof fp = %zu\n", sizeof fp);
    return 0;
}
```
```output
add(2, 3) = 5
fp(2, 3) = 5
(*fp)(2, 3) = 5
sizeof fp = 8
```

`fp` 和 `add` 调用起来完全一样，`sizeof fp` 是 8——函数指针本身就是一个普通的 8 字节指针，只不过它存的地址在代码段里。

### 怎么读 `int (*fp)(int, int)`
这是全节最重要的一个声明，拆开看：

```
int (*fp)(int, int);
     ^^  ^^^^^^^^^^
     |   |
     |   +-- ① fp 指向的函数接收两个 int
     +------ ② (*fp) 说明 fp 是一个指针
③ 最左边的 int 是函数的返回类型
```

读法是**从名字出发，先向右、再向左，遇到括号掉头**：

1. `fp` 右边是 `)`，掉头向左看到 `*`：fp 是**指针**；
2. 跳出括号向右看到 `(int, int)`：它指向一个**接收两个 int 的函数**；
3. 再向左看到 `int`：这个函数**返回 int**。

合起来：**fp 是一个指针，指向"接收两个 int 并返回 int"的函数**。

括号是必需的。去掉括号就变成另一个东西：

```c
int (*fp)(int, int);    /* fp 是函数指针 */
int *fp(int, int);      /* fp 是函数，返回 int *（这叫"返回指针的函数"） */
```

对比着读：`int *fp(int, int)` 里 `fp` 先和右边的 `(int, int)` 结合——它是函数；`*` 修饰的是返回值。**括号把 `*` 拉回到 fp 身边，它才成为指针。**

常见的几种声明放在一起：

| 声明 | 含义 |
|---|---|
| `int (*fp)(int, int);` | fp 是指针，指向"两个 int → int"的函数 |
| `int *fp(int, int);` | fp 是函数，接收两个 int，返回 `int *` |
| `int (*fp[4])(int, int);` | fp 是数组（4 个元素），每个元素是函数指针 |
| `void (*fp)(void);` | fp 是指针，指向"无参数、无返回值"的函数 |

### 赋值与调用：`&` 和 `*` 都可以省
函数名本身就代表地址，所以下面两种写法完全等价：

```c
fp = add;       /* 推荐：简洁 */
fp = &add;      /* 等价：& 作用在函数上得到的还是同一个地址 */
```

调用也一样，`fp(2, 3)`、`(*fp)(2, 3)`、甚至 `(**fp)(2, 3)` 都能工作——函数指针会自动转换回函数。日常写 `fp(2, 3)` 就够了，不用刻意加 `*`。

但要小心优先级：`*fp(2, 3)` 是 `*(fp(2, 3))`，意思是"先调用 fp，再对返回值解引用"，和 `(*fp)(2, 3)` 完全不同。想强调"通过指针调用"，括号必须把 `*fp` 括起来。

### 函数指针作参数：回调（callback）
函数指针最大的价值是**把"做什么"当参数传进去**。调用者决定用哪个函数，被调用的函数负责在合适的时机"回过头来调用"它，这就是回调。

```c run id=callback
#include <stdio.h>

int add(int a, int b) { return a + b; }
int mul(int a, int b) { return a * b; }

int apply(int (*f)(int, int), int a, int b) {
    return f(a, b);                 /* 回过头来调用传进来的函数 */
}

int main(void) {
    printf("apply(add, 3, 4) = %d\n", apply(add, 3, 4));
    printf("apply(mul, 3, 4) = %d\n", apply(mul, 3, 4));
    return 0;
}
```
```output
apply(add, 3, 4) = 7
apply(mul, 3, 4) = 12
```

`apply` 本身完全不知道"加法"和"乘法"是什么，它只知道"有一个函数 f，接收两个 int 并返回 int"。这样一个 `apply` 就能服务无数种运算——这正是后面 `qsort` 能用同一个排序函数排各种数据的原理。

### 函数指针数组：菜单与分发
既然函数指针是变量，就可以放进数组。用操作符或菜单编号当下标，就能一行代码完成"分发"，不用写一长串 `if/else`：

```c run id=dispatch
#include <stdio.h>

int add(int a, int b) { return a + b; }
int sub(int a, int b) { return a - b; }

int main(void) {
    int (*ops[2])(int, int) = {add, sub};   /* 函数指针数组 */
    const char *names[2] = {"add", "sub"};

    for (int i = 0; i < 2; i++) {
        printf("%s(9, 4) = %d\n", names[i], ops[i](9, 4));
    }
    return 0;
}
```
```output
add(9, 4) = 13
sub(9, 4) = 5
```

`ops` 的类型是"2 个元素的数组，元素是 `int (*)(int, int)`"，`ops[i]` 取出来就是一个函数指针，后面直接加 `(9, 4)` 就能调用。

### typedef：给函数指针类型起个短名字
`int (*)(int, int)` 这种类型名写在参数里很啰嗦。用 `typedef` 给它起个名字，代码立刻清爽：

```c run id=typedef
#include <stdio.h>

typedef int (*binop)(int, int);     /* binop 是"函数指针类型"的名字 */

int add(int a, int b) { return a + b; }

int main(void) {
    binop f = add;                  /* 等价于 int (*f)(int, int) = add; */
    printf("%d\n", f(20, 22));
    return 0;
}
```
```output
42
```

注意 `typedef` 的位置：`typedef int (*binop)(int, int);` 里 `binop` 是**类型名**，不是变量。写成 `typedef int (*binop)(int, int);` 之后，`binop f;` 就声明了一个函数指针变量。

### 函数指针的内存图
```memory title="int (*fp)(int, int) = add;（地址为示意，实际每次运行可能不同）"
地址    | 内容          | 名字 | 类型               | 说明
0x1000  | add 的机器指令 | add  | int (int, int)     | 函数体放在代码段
0x2000  | 0x1000        | fp   | int (*)(int, int)  | 存 add 的入口地址
```

函数本体在代码段，`fp` 在数据/栈区，里面存的是代码段里的地址。`fp` 和 `add` 指向同一个位置，所以调用结果完全相同。

### 函数指针不能做什么
- **不能做算术**：`fp + 1` 没有意义，编译错误。
- **不能和 `void *` 随意互转**：对象指针（`int *`、`void *`）和函数指针是两类不同的指针，把它们互相赋值在 C 里没有保证。
- **不能靠它保存"闭包"**：函数指针只记录"调用哪个函数"，不携带任何额外数据。需要携带数据时，得另外传一个参数（后面学 `qsort` 时会看到 `void *` 的用法）。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra fp.c -o fp
./fp
```

本平台用 Clang，命令等价：`clang -std=c17 -Wall -Wextra fp.c -o fp`。

函数指针写错时，编译器给出的信息往往很长。把声明拆成"返回类型 / 参数列表 / 名字"三部分对照着看，比逐字读错误信息更快。常见的一条是：

```
error: called object type 'int *' is not a function or function pointer
```

它通常意味着你把"返回指针的函数"当成了函数指针——回到声明处检查括号。

## 常见错误

### 写成 `int *fp(int, int)`，把它当成函数指针
这是"返回 `int *` 的函数"，不是函数指针。区别只在括号：`int (*fp)(int, int)` 才是函数指针。判断方法：名字被 `(* )` 包住才是指针；名字右边直接跟参数列表就是函数。

### 调用时写成 `*fp(2, 3)`
`()` 的优先级高于 `*`，所以 `*fp(2, 3)` 等价于 `*(fp(2, 3))`：先调用，再对返回值解引用。如果函数返回 `int`，这一行会直接编译错误；如果返回指针，则会在不经意间多解引用一层。正确写法是 `(*fp)(2, 3)` 或直接 `fp(2, 3)`。

### 函数指针没有初始化就调用
```c
int (*fp)(int, int);    /* 野指针：里面是垃圾值 */
fp(2, 3);               /* 跳到未知地址，程序崩溃 */
```
和普通指针一样，函数指针也要先赋值再调用。习惯上可以初始化为 `NULL`，调用前检查。

### 用 `void *` 保存函数指针
```c
void *p = (void *)add;   /* 不符合标准 */
```
C 标准不保证函数指针能转换成 `void *`。需要通用容器时，应该用函数指针类型本身，或者用 `typedef` 定义明确的类型。

### 把函数指针数组的下标写越界
```c
int (*ops[4])(int, int) = {add, sub, mul, divi};
ops[4](1, 2);            /* 越界：合法下标是 0..3 */
```
越界读到一个垃圾函数指针再调用，通常直接崩溃，而且报错位置和真正的问题相隔很远。下标来自输入时一定要先检查范围。

## 客观题

### q-s2-function-pointer-1 single
声明 `int (*fp)(int, int);` 的含义是：

- [x] `fp` 是一个指针，指向"接收两个 `int`、返回 `int`"的函数
  > 正确。`(*fp)` 说明 fp 是指针，右边的 `(int, int)` 是它指向的函数的参数列表，最左边的 `int` 是返回类型。
- [ ] `fp` 是一个函数，接收两个 `int`，返回 `int *`
  > 这是 `int *fp(int, int);` 的含义。去掉那对括号后，fp 才会先和参数列表结合成函数。
- [ ] `fp` 是一个数组，存放两个 `int`
  > 这是 `int fp[2];` 的含义。函数指针声明里没有数组维度，`(int, int)` 是参数列表而不是下标。
- [ ] `fp` 是一个指向 `int` 的指针，可以指向两个 `int` 中的任意一个
  > 这是 `int *fp;` 的含义。`(*fp)` 后面的 `(int, int)` 说明它指向的是函数，不是普通的 int。
