---
id: s1-func-basics
---

## 讲解

### 为什么需要函数
把一段完成特定任务的代码起个名字，需要时"调用"它，就是函数。好处是：同样的代码只写一次；每个函数只做一件事，容易读懂和测试；`main` 变得像一份目录。

### 函数的定义
```c
返回类型 函数名(参数列表) {
    函数体
    return 返回值;
}
```

```c run id=define stdin="3 7"
#include <stdio.h>

/* 定义：返回两个整数中较大的那个 */
int max2(int a, int b) {
    if (a > b) {
        return a;      /* return 立即结束函数，并把值交给调用者 */
    }
    return b;
}

int main(void) {
    int x, y;
    if (scanf("%d %d", &x, &y) != 2) return 1;
    int m = max2(x, y);        /* 调用：x、y 是实参，a、b 是形参 */
    printf("max = %d\n", m);
    printf("max(m, 10) = %d\n", max2(m, 10));   /* 返回值可以直接用在表达式里 */
    return 0;
}
```
```output
max = 7
max(m, 10) = 10
```

- **形参**（parameter）：定义里括号中的变量 `a`、`b`；
- **实参**（argument）：调用时传进去的值 `x`、`y`；
- 不需要返回值时，返回类型写 `void`，可以用不带值的 `return;` 提前结束；
- 不需要参数时，参数列表写 `void`：`int read_one(void)`。

### 声明（原型）：先告诉编译器"有这么一个函数"
编译器从上往下读代码。在调用一个函数之前，它必须已经知道这个函数的参数和返回类型。如果函数定义写在 `main` 后面，就要在前面先写一个**声明**（也叫**函数原型**），以分号结尾：

```c run id=prototype
#include <stdio.h>

double average(int a, int b);   /* 声明：只有"签名"，没有函数体 */

int main(void) {
    printf("%.1f\n", average(3, 4));
    return 0;
}

double average(int a, int b) {  /* 定义 */
    return (a + b) / 2.0;
}
```
```output
3.5
```

如果把第 3 行的声明删掉，C99 及以后的标准会报错：`call to undeclared function 'average'`。

```c run id=no-prototype expect=CE
#include <stdio.h>

int main(void) {
    printf("%.1f\n", average(3, 4));
    return 0;
}

double average(int a, int b) {
    return (a + b) / 2.0;
}
```

多文件程序中，函数的声明通常写在头文件里（阶段 3 会详细讲）。

### 注意：int f() 和 int f(void) 不一样
在 C17 中，`int f()` 表示"参数**未指定**"，编译器不会检查调用时传了几个参数；`int f(void)` 才表示"没有参数"。（C23 改变了这一点，但为了兼容，请始终写 `void`。）

### 非 void 函数必须在每条路径上 return
如果函数声明了返回类型，却有某条执行路径走到了末尾的 `}` 而没有 `return`，**并且调用者使用了这个返回值**，就是未定义行为。编译器会警告 `non-void function does not return a value in all control paths`：

```c run id=missing-return warnings=allow nocheck reason="使用了没有返回的函数的返回值，结果不确定"
#include <stdio.h>

int sign(int x) {
    if (x > 0) return 1;
    if (x < 0) return -1;
    /* 忘了处理 x == 0 */
}

int main(void) {
    printf("%d\n", sign(0));
    return 0;
}
```

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra func.c -o func
```

`-Wall` 会报告：调用未声明的函数、缺少 return（`-Wreturn-type`）、声明与定义不一致等问题。

## 常见错误

### 定义在 main 后面，又没有写声明
C99 起是编译错误。要么把定义挪到调用之前，要么在前面加原型。

### 声明和定义的类型不一致
`int average(int, int);` 和 `double average(int a, int b) { ... }` 会报 `conflicting types`。

### 函数名后面忘了括号
`int m = max2;` 并不是调用，而是取函数的地址（阶段 2 的函数指针）；编译器会给出类型不匹配的警告。调用一定要写括号：`max2(x, y)`。

## 客观题

### q-s1-func-basics-1 single ub-analysis
关于下面的程序，说法正确的是：
```c
int f(int x) {
    if (x > 0) return x;
}
int main(void) {
    int r = f(-5);
    printf("%d\n", r);
    return 0;
}
```
- [ ] 输出 0，因为函数没有 return 时默认返回 0
  > C 语言没有"默认返回 0"的规则（只有 main 函数例外：执行到 main 末尾等同于 return 0）。
- [ ] 编译错误，C 要求每条路径都有 return
  > 只是警告（`-Wreturn-type`），不是错误，程序可以编译运行。
- [x] 未定义行为：f(-5) 没有执行任何 return，而 main 使用了它的返回值
  > 正确。输出的可能是任何值（常见的是寄存器里残留的数），开启优化后编译器甚至可以假设这条路径不会发生。
- [ ] 输出 -5，因为 x 的值会被自动返回
  > 函数不会自动返回某个参数，返回值只能通过 return 语句给出。
