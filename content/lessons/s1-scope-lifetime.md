---
id: s1-scope-lifetime
---

## 讲解

两个容易混淆的概念：
- **作用域**（scope）：在代码的**哪些地方**能用这个名字访问变量——这是编译时的、关于"文本位置"的概念；
- **生命周期**（lifetime，标准里叫存储期）：变量在程序运行的**哪段时间里**真实存在、占着内存——这是运行时的概念。

### 块作用域
在一对花括号 `{ }` 里声明的变量，从声明处开始到这个块结束为止有效。函数体、if/for/while 的花括号都是块，你也可以单独写一对花括号：

```c run id=block
#include <stdio.h>

int main(void) {
    int x = 1;
    {
        int y = 2;                 /* y 只在这个块里有效 */
        printf("%d %d\n", x, y);   /* 内层可以访问外层的 x */
    }
    /* printf("%d\n", y);  在这里使用 y 会编译错误：use of undeclared identifier 'y' */
    for (int i = 0; i < 2; i++) {  /* i 的作用域是整个 for 语句 */
        printf("i=%d\n", i);
    }
    return 0;
}
```
```output
1 2
i=0
i=1
```

### 同名变量的遮蔽
内层块可以声明一个和外层**同名**的变量，此时在内层，这个名字指的是内层的那个，外层的被"遮蔽"了：

```c run id=shadow
#include <stdio.h>

int main(void) {
    int n = 10;
    {
        int n = 20;                /* 新的变量，遮蔽了外层的 n */
        n++;
        printf("内层 n = %d\n", n);
    }
    printf("外层 n = %d\n", n);    /* 外层的 n 没有被改动 */
    return 0;
}
```
```output
内层 n = 21
外层 n = 10
```

遮蔽是合法的，但几乎总是 bug 的来源（你以为在改外层的变量，实际改的是新变量）。`gcc -Wshadow` 可以把它们都找出来。

### 局部变量的生命周期：每次调用都重新创建
函数里的局部变量（包括形参）在**每次调用时创建，函数返回时销毁**。所以它们不会"记住"上一次调用的值：

```c run id=local-life
#include <stdio.h>

void counter(void) {
    int count = 0;     /* 每次调用都重新创建并初始化为 0 */
    count++;
    printf("count = %d\n", count);
}

int main(void) {
    counter();
    counter();
    counter();
    return 0;
}
```
```output
count = 1
count = 1
count = 1
```

### 全局变量：文件作用域、贯穿整个程序
在所有函数**外面**声明的变量是**全局变量**：从声明处到文件末尾的所有函数都能访问它，它在程序启动时创建、结束时才销毁，并且**没有显式初始化时自动初始化为 0**（局部变量则不会）：

```c run id=global
#include <stdio.h>

int total_calls;        /* 全局变量：自动初始化为 0 */

void counter(void) {
    total_calls++;      /* 所有函数共享同一个 total_calls */
    printf("第 %d 次调用\n", total_calls);
}

int main(void) {
    counter();
    counter();
    counter();
    return 0;
}
```
```output
第 1 次调用
第 2 次调用
第 3 次调用
```

全局变量用起来方便，但任何函数都能修改它，程序大了以后很难追查"是谁改的"。尽量通过参数和返回值传递数据，只在确实需要"整个程序共享"时才用全局变量。阶段 3 会介绍折中的办法：`static` 局部变量（作用域是局部的，生命周期却是整个程序）。

### 不要在函数返回后使用它的局部变量
局部变量在函数返回时就被销毁了，所以函数**不能返回局部变量的地址**供外面使用——那块内存随时会被别的数据覆盖。这是阶段 5"未定义行为"中的一个重要条目。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra -Wshadow scope.c -o scope    # -Wshadow：报告所有同名遮蔽
```

## 常见错误

### 累加器或"迄今为止的最好结果"声明在了循环体里
`for (...) { long long sum = 0; sum += x; }`：sum 的生命周期只有一轮循环，每轮都被重新创建。需要跨越多轮保存的变量，要声明在循环**外面**。

### 内层不小心重新声明了同名变量
在 if 里写了 `int result = ...;`（多了一个 int），本意是给外层的 result 赋值，结果创建了一个新变量，外层的 result 没变。

### 以为局部变量会自动初始化为 0
只有全局变量和 static 变量会。局部变量不初始化就读取，是未定义行为。

## 客观题

### q-s1-scope-lifetime-1 single
下面程序的输出是什么？
```c
int x = 5;
void f(void) { x = x + 1; }
int main(void) {
    int x = 100;
    f();
    printf("%d", x);
    return 0;
}
```
- [ ] `6`
  > main 里的 `int x = 100` 遮蔽了全局的 x，printf 输出的是局部的 x。
- [x] `100`
  > 正确。f 修改的是全局变量 x（从 5 变成 6）；main 中的 x 是另一个局部变量，值仍为 100。
- [ ] `101`
  > f 看不到 main 的局部变量，它操作的是全局的 x。
- [ ] 编译错误：x 重复定义
  > 不同作用域中可以有同名变量，内层的会遮蔽外层的。
