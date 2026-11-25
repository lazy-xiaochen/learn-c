---
id: s2-pointer-param
---

## 讲解

### 值传递的天花板
第 1 阶段学过：函数的形参是实参的**副本**。所以下面的"交换"注定失败——函数里换的是副本，调用者的变量纹丝不动：

```c run id=byvalue
#include <stdio.h>

void swap_wrong(int a, int b) {   /* 形参是副本 */
    int t = a;
    a = b;
    b = t;
}

int main(void) {
    int x = 1, y = 2;
    swap_wrong(x, y);
    printf("x = %d, y = %d\n", x, y);
    return 0;
}
```
```output
x = 1, y = 2
```

如果函数需要**修改调用者的变量**，只传值是不够的，必须让函数知道变量"在哪里"——也就是传**地址**。

### 把指针当参数
把形参写成指针类型，调用时传变量的地址：

```c run id=swap
#include <stdio.h>

void swap(int *pa, int *pb) {     /* 形参是指针，接收地址 */
    int t = *pa;                  /* 顺着地址读写调用者的变量 */
    *pa = *pb;
    *pb = t;
}

int main(void) {
    int x = 1, y = 2;
    swap(&x, &y);                 /* 传的是地址 */
    printf("x = %d, y = %d\n", x, y);
    return 0;
}
```
```output
x = 2, y = 1
```

对比上一段：函数体里多了解引用 `*pa`、`*pb`，调用处多了取地址 `&x`、`&y`。这两个符号一配对，函数就能改到调用者的变量了。

```memory title="调用 swap(&x, &y) 时，main 的变量和 swap 的形参（示意）"
地址     | 内容    | 变量  | 说明
0x1000   | 1       | x     | main 里的变量
0x1004   | 2       | y     | main 里的变量
0x2000   | 0x1000  | pa    | swap 的形参，存 x 的地址
0x2008   | 0x1004  | pb    | swap 的形参，存 y 的地址
```

### 用指针"带回"多个结果
函数的 `return` 只能返回一个值。需要返回两个以上结果时，常见做法是让调用者准备好变量，把地址传进去：

```c run id=divmod
#include <stdio.h>

/* 计算 a / b 的商和余数，通过指针带回 */
void divmod(int a, int b, int *q, int *r) {
    *q = a / b;
    *r = a % b;
}

int main(void) {
    int q = 0, r = 0;
    divmod(17, 5, &q, &r);
    printf("17 / 5 = %d 余 %d\n", q, r);
    return 0;
}
```
```output
17 / 5 = 3 余 2
```

这就是"输入用值、输出用指针"的典型结构：`a`、`b` 只需要值，`q`、`r` 需要被函数写回。

### 指针参数也要防错
函数拿到指针后，**不能假定它一定有效**。健壮的写法是先检查：

```c
if (q == NULL || r == NULL) {
    return;          /* 调用者传了空指针，直接返回 */
}
```

另外，函数只应该修改"它被允许修改的东西"。如果某个参数只是用来读取（比如 `divmod` 里的 `b`），就不要通过它写数据——用 `const int *` 可以让编译器帮你把关（下一个知识点讲）。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra param.c -o param
./param
```

本平台用 Clang，命令等价：`clang -std=c17 -Wall -Wextra param.c -o param`。
`-Wall` 会提示"传值给指针参数"这类错误（例如写了 `swap(x, y)` 而不是 `swap(&x, &y)`），务必打开。

## 常见错误

### 调用时忘记写 `&`
`swap(x, y)` 把整数当成地址传给 `int *` 参数，编译器会给出"incompatible integer to pointer conversion"警告；强行运行会去访问地址 `x` 指向的内存，直接崩溃。正确写法是 `swap(&x, &y)`。

### 在函数里交换指针，而不是交换指针指向的值
```c
void swap(int *pa, int *pb) {
    int *t = pa;    /* 错：换的是"指向哪里" */
    pa = pb;
    pb = t;
}
```
形参 `pa`、`pb` 本身也是副本，换它们不影响任何东西。必须用 `*pa`、`*pb` 去改它们指向的变量。

### 以为传了指针就不用初始化
`int x; swap(&x, &y);` 里 x 没有初值，swap 会把它读出来（未定义行为）。传地址之前，被指向的变量必须已经有效。

### 在函数里让指针指向新变量
```c
void f(int *p) {
    int local = 5;
    p = &local;      /* 只改了形参 p 自己 */
}
```
这不会改变调用者的指针，而且 `local` 在函数返回后就没了。要修改调用者的指针，需要传"指针的指针"（多级指针，后面讲）。

## 客观题

### q-s2-pointer-param-1 single
下面程序的输出是什么？

```c
void add_one(int *p) { *p = *p + 1; }
int main(void) {
    int x = 10;
    add_one(&x);
    printf("%d\n", x);
    return 0;
}
```

- [x] `11`
  > 正确。传入的是 x 的地址，函数里 `*p` 就是 x，加 1 后 x 变成 11。
- [ ] `10`
  > 如果形参是 `int p`（值传递）才会是 10；这里传的是地址，函数确实改到了 x。
- [ ] 程序崩溃
  > `&x` 是有效地址，解引用安全。
- [ ] 编译错误
  > `add_one(&x)` 的类型是 `int *`，与形参 `int *p` 匹配，能正常编译。


