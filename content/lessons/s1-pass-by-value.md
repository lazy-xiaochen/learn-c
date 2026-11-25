---
id: s1-pass-by-value
---

## 讲解

### 调用函数时，实参的值被"复制"给形参
C 语言的函数参数**全部按值传递**：调用 `f(x)` 时，先算出 x 的值，再把这个值**复制**一份放进形参。形参是函数自己的局部变量，和实参是**两块不同的内存**。所以在函数里修改形参，不会影响调用者的变量：

```c run id=copy
#include <stdio.h>

void add_ten(int n) {
    n = n + 10;                       /* 修改的是副本 */
    printf("函数内 n = %d\n", n);
}

int main(void) {
    int x = 5;
    add_ten(x);
    printf("函数外 x = %d\n", x);     /* x 没有变 */
    return 0;
}
```
```output
函数内 n = 15
函数外 x = 5
```

调用 `add_ten(x)` 的那一刻，内存里大致是这样的：

```memory title="调用 add_ten(x) 时：x 和 n 是两块独立的内存"
地址    | 内容 | 变量
0x2000  | 5    | main 中的 x
0x1F00  | 15   | add_ten 中的 n（由 x 的值 5 复制而来，之后被改成 15）
```

函数返回后，n 所在的内存就被收回了，x 始终是 5。

### 交换函数为什么"不起作用"
同样的道理，下面的 `swap` 只交换了两个副本：

```c run id=bad-swap
#include <stdio.h>

void swap(int a, int b) {
    int t = a;
    a = b;
    b = t;
}

int main(void) {
    int x = 1, y = 2;
    swap(x, y);
    printf("x=%d y=%d\n", x, y);
    return 0;
}
```
```output
x=1 y=2
```

要让函数修改调用者的变量，必须把变量的**地址**传进去，这正是阶段 2 学习指针的动机（`scanf("%d", &x)` 中的 `&` 也是这个原因）。在那之前，想要"带回"结果，就用**返回值**：`x = add_ten(x);`。

### 好处：函数可以放心地修改自己的参数
因为形参只是副本，函数内部可以把参数当作普通的局部变量随意使用，不用担心破坏调用者的数据：

```c run id=modify-param
#include <stdio.h>

/* 求 n 的各位数字之和：直接修改形参 n，调用者的变量不受影响 */
int digit_sum(int n) {
    int s = 0;
    while (n > 0) {
        s += n % 10;
        n /= 10;
    }
    return s;
}

int main(void) {
    int x = 2026;
    printf("%d 的各位之和是 %d\n", x, digit_sum(x));   /* x 仍然是 2026 */
    return 0;
}
```
```output
2026 的各位之和是 10
```

### 实参会被转换成形参的类型
传参就像赋值：实参的值会被**转换**成形参的类型。如果形参是 `int`，传进 3.9 会被截断成 3：

```c run id=convert warnings=allow
#include <stdio.h>

double half(int n) {        /* 形参是 int */
    return n / 2.0;
}

int main(void) {
    printf("%.2f\n", half(3.9));   /* 3.9 先被转换成 3，再计算 3 / 2.0 */
    return 0;
}
```
```output
1.50
```

`-Wconversion` 会对这种丢失数据的隐式转换给出警告。设计函数时，形参的类型要能容纳所有可能的输入。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra -Wconversion args.c -o args
```

## 常见错误

### 以为函数能修改传进来的变量
`void reset(int n) { n = 0; }` 调用后变量不会变成 0。要么返回新值，要么（学完指针后）传地址。

### 形参类型太小
`int area(int w, int h)` 接收的是 `int`，计算结果却可能超过 int 的范围；或者把小数传给了 `int` 形参。

### 以为修改了形参，函数外也能看到"计算过程"
函数结束后它的所有局部变量（包括形参）都消失了，唯一能带出来的是返回值。

## 客观题

### q-s1-pass-by-value-1 single
执行下面的程序后输出什么？
```c
int f(int a) {
    a = a * 2;
    return a + 1;
}
int main(void) {
    int x = 3;
    int y = f(x);
    printf("%d %d", x, y);
    return 0;
}
```
- [ ] `6 7`
  > 函数修改的是形参 a（x 的副本），x 本身仍然是 3。
- [x] `3 7`
  > 正确。a 得到 x 的副本 3，在函数中变为 6，返回 7；x 不受影响。
- [ ] `3 4`
  > `return a + 1` 时 a 已经被改成 6，返回的是 7。
- [ ] `6 13`
  > x 没有被修改，f 只被调用了一次。
