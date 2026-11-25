---
id: s3-static-local
---

## 讲解

### 一个函数能不能"记住"上次的值
先看两个几乎一样的计数器：一个用普通局部变量，一个用 `static` 局部变量。各调用三次：

```c run id=static-vs-local
#include <stdio.h>

static void local_counter(void) {
    int n = 0;                /* 每次调用都重新创建，重新初始化为 0 */
    n++;
    printf("local  n = %d\n", n);
}

static void static_counter(void) {
    static int n = 0;         /* 只在程序启动时创建并初始化一次 */
    n++;
    printf("static n = %d\n", n);
}

int main(void) {
    local_counter();
    local_counter();
    static_counter();
    static_counter();
    static_counter();
    return 0;
}
```
```output
local  n = 1
local  n = 1
static n = 1
static n = 2
static n = 3
```

`local_counter` 里的 `n` 每次进函数都是新的，`n++` 之后立刻打印 1，函数一返回这个 `n` 就没了。`static_counter` 里的 `n` 却像被"记住"了一样，每次调用都在上一次的值上继续加。

这正是 `static` 修饰局部变量时做的唯一一件事：**不改变作用域，只把存储期从"自动"改成"静态"。**

### 作用域不变，存储期变成整个程序
C 里有两个容易混淆的概念：

- **作用域**（scope）：代码的**哪些位置**能用这个名字访问它。它是编译期的、关于"文本范围"的概念；
- **存储期**（storage duration）：这个对象在程序运行的**哪段时间**里真实存在。它是运行时的概念。

`static int n;` 写在函数里时：

- **作用域不变**：仍然是那个函数体（块作用域）。`main` 里写 `n` 依然编译不过，别的函数也看不见它；
- **存储期变了**：从"进入块时创建、离开块时销毁"变成"程序启动时创建、程序结束时销毁"。

所以它和全局变量的区别是"谁能看见"，和普通局部变量的区别是"活多久"：

| 写法 | 作用域 | 存储期 | 什么时候初始化 |
|---|---|---|---|
| `int n;`（函数内） | 块作用域 | 自动（栈） | 每次进入块时（不初始化就是垃圾值） |
| `static int n;`（函数内） | 块作用域 | 静态（整个程序） | 程序启动时，只一次（不写就清零） |
| `int g;`（函数外） | 文件作用域 | 静态（整个程序） | 程序启动时，只一次（不写就清零） |
| `malloc` 出来的内存 | 无（只能用指针） | 动态 | `malloc` 执行时，`free` 时结束 |

一句话记忆：**`static` 局部变量 = 全局变量的寿命 + 局部变量的可见范围。**

### 只初始化一次，到底是哪一次
`static int n = 0;` 里的 `= 0` 不是"每次调用都执行"，而是在**程序启动时、main 之前**就完成了。之后每次进入函数，初始化语句都被跳过：

```c run id=next-id
#include <stdio.h>

static int next_id(void) {
    static int id = 100;      /* 只在程序启动时执行这一次 */
    id++;
    return id;
}

int main(void) {
    printf("%d\n", next_id());
    printf("%d\n", next_id());
    printf("%d\n", next_id());
    return 0;
}
```
```output
101
102
103
```

如果 `id` 是普通局部变量，三次都会打印 101。因为初始化只做一次，`static` 局部变量才能用来做"流水号""调用次数"这类需要跨调用累计的事情。

也正因为初始化发生在程序启动时，`static` 局部变量的初始化式必须是**常量表达式**——编译器要在程序运行之前就把初始值写进静态存储区：

```c run id=static-nonconst-init expect=CE
#include <stdio.h>

int main(void) {
    int n = 5;
    static int x = n;         /* 错：initializer element is not a compile-time constant */
    printf("%d\n", x);
    return 0;
}
```

需要"第一次调用时才计算"的初始化，要用一个 `static` 标志位配合（见下面的惰性初始化）。

### 默认初始化为 0
静态存储期的对象（全局变量、`static` 局部变量）如果没写初始化式，会被**自动清零**。这跟自动变量完全不同：普通局部变量不初始化时里面是栈上残留的不确定值。

```c run id=static-zero
#include <stdio.h>

static int count_calls(void) {
    static int calls;         /* 没写 = 0，但启动时已经被清零 */
    calls++;
    return calls;
}

int main(void) {
    printf("%d\n", count_calls());
    printf("%d\n", count_calls());
    printf("%d\n", count_calls());
    return 0;
}
```
```output
1
2
3
```

注意不要把这件事推广到数组元素以外的场景去赌：**只有静态存储期的对象有"零初始化"待遇**，`int a[10];`（普通局部数组）依然是垃圾值。

### 典型用途一：计数器与流水号
函数被调用了多少次、下一个可用的编号是多少、这个错误已经打印过几次——这类"跨调用累计"的状态，用 `static` 局部变量最自然：它不需要暴露给别的函数，也不会污染全局命名空间。

### 典型用途二：惰性初始化 + 缓存
有些表算一次就够，但只有在真的用到时才值得算。用两个 `static` 变量（表 + 标志位）就能做到"只构建一次，之后直接查表"：

```c run id=static-lazy-table
#include <stdio.h>

static long long fact_of(int n) {
    static long long tab[13];     /* 静态存储区：函数返回后依然存在 */
    static int ready = 0;         /* 标记表有没有建好 */

    if (!ready) {                 /* 只有第一次调用会进来 */
        tab[0] = 1;
        for (int i = 1; i <= 12; i++) {
            tab[i] = tab[i - 1] * i;
        }
        ready = 1;
        printf("阶乘表构建完成\n");
    }
    return tab[n];
}

int main(void) {
    printf("%lld\n", fact_of(5));
    printf("%lld\n", fact_of(12));
    printf("%lld\n", fact_of(5));
    return 0;
}
```
```output
阶乘表构建完成
120
479001600
120
```

"阶乘表构建完成"只打印了一次，说明 `tab` 和 `ready` 在三次调用之间一直活着。这就是 `static` 局部变量存在的意义：**给函数一块私有的、活得和程序一样久的内存。**

### 内存图：static 局部变量不在栈上
普通局部变量在栈帧里，函数一返回就随着栈帧一起失效；`static` 局部变量在**静态存储区**，编译期就分配好了地址，和函数调用完全无关：

```memory title="static 局部变量的存放位置（地址为示意，实际每次运行可能不同）"
地址      | 内容 | 变量      | 区域              | 说明
0x404030  | 1    | ready     | 静态存储区 .data  | static int ready = 0; 第一次调用后变成 1
0x404038  | 1    | tab[0]    | 静态存储区 .data  | static long long tab[13]; 0! = 1
0x404040  | 1    | tab[1]    | 静态存储区 .data  | 1! = 1
0x404048  | 2    | tab[2]    | 静态存储区 .data  | 2! = 2
0x404098  | 479001600 | tab[12] | 静态存储区 .data | 12! = 479001600，一共 13 × 8 = 104 字节
0x0fe4    | 5    | n         | 栈（栈帧）        | 形参，函数返回就消失
0x0fe0    | 2    | i         | 栈（栈帧）        | 循环变量，函数返回就消失
```

两个关键点：

1. **只有一份**。不管 `fact_of` 被调用多少次、递归多少层，`tab` 始终是同一个数组。这不是"每次调用分配一个新表"，而是"所有调用共用一张表"；
2. **和函数调用无关**。函数还没被调用时，这块内存就已经在程序里了；函数返回后，它依然在。所以 `static` 局部变量可以安全地保存"上次的值"。

反过来也要小心：**"只有一份"意味着不重入**。如果两个执行流同时进入这个函数（多线程、或者递归），它们看到的是同一份 `tab` / `ready`，会互相踩。

### static 局部、static 全局、static 函数不是一回事
同样是 `static` 关键字，放在不同位置含义完全不同：

- **函数内的 `static` 局部变量**：改变**存储期**（自动 → 静态），作用域不变。这是本课的内容；
- **文件作用域的 `static` 全局变量 / `static` 函数**：改变**链接属性**（外部链接 → 内部链接），让名字只在当前 `.c` 文件里可见。这是下一节"链接属性"的内容。

混淆这两个用法是面试里的经典陷阱：`static` 对局部变量是"活得久"，对全局变量和函数是"藏起来"。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra stat.c -o stat
./stat
```

本平台使用 Clang，命令等价：

```bash
clang -std=c17 -Wall -Wextra stat.c -o stat
./stat
```

几个有用的开关：

- `-Wunused-variable`：`static` 局部变量声明了却没用，编译器会警告（`-Wall` 已包含）；
- `-Wmissing-prototypes` / `-Wmissing-variable-declarations`：检查文件作用域的 `static` 函数/变量是否漏了声明，适合多文件工程；
- `-fsanitize=thread`（GCC/Clang 的 TSan）：检查多个线程同时读写 `static` 局部变量导致的数据竞争；
- `-O2`：优化不会改变 `static` 局部变量的语义，但会更积极地把它缓存进寄存器——调试时想看"每一次调用的值"，用 `-O0`。

`static` 局部变量不需要、也不能手动释放。它的生命周期由程序本身管理，从 `main` 之前开始，到程序结束才回收。

## 常见错误

### 在递归函数里用 static 保存中间结果 [WA]
`static` 变量全程序只有一份，**所有递归层共用它**，不是每层一份。下面这个"用 static 累乘"的阶乘，第一次调用碰巧算对（因为初始值正好是 1），第二次调用就在上次的结果上继续乘，答案直接翻车：
```c run id=static-in-recursion
#include <stdio.h>

static int fact(int n) {
    static int acc = 1;       /* 错：所有递归层、所有调用共享同一个 acc */
    acc *= n;
    if (n <= 1) {
        return acc;
    }
    return fact(n - 1);
}

int main(void) {
    printf("%d\n", fact(5));
    printf("%d\n", fact(5));  /* 第二次：在上一次的 120 上继续乘 */
    return 0;
}
```
```output
120
14400
```

递归函数要"每层一份"的变量，就用普通局部变量或参数传下去；`static` 只适合"整个函数共用一份"的状态。

### 用普通局部变量当计数器，每次调用都被清零 [WA]
```c
int count_calls(void) {
    int calls = 0;      /* 错：每次进来都重新变成 0 */
    calls++;
    return calls;
}
```
无论调用多少次都返回 1。计数器必须声明成 `static int calls;`，或者放到函数外面做全局变量。

### 以为 static 局部变量在函数外也能用 [CE]
`static` 只改存储期，不改作用域。在 `main` 里写另一个函数里的 `static` 变量名，是"未声明的标识符"：
```c run id=static-scope expect=CE
#include <stdio.h>

static void f(void) {
    static int hidden = 42;
    printf("%d\n", hidden);
}

int main(void) {
    f();
    printf("%d\n", hidden);   /* 错：hidden 的作用域只在 f 里 */
    return 0;
}
```

### 以为 static 局部变量每次调用都会重新初始化 [WA]
`static int id = 100;` 只在程序启动时初始化一次，之后每次调用都跳过。如果你的逻辑依赖"每次进来都是 100"，那它就不是 `static` 该解决的问题——该用普通局部变量。

### 在多线程 / 可重入场景里用 static 局部变量 [UB]
`static` 局部变量是进程内唯一的一份。两个线程同时进入同一个函数时，它们读写的是同一块内存，没有任何同步——这是数据竞争，属于未定义行为。需要"每次调用独立"就传参或用普通局部变量；确实要共享就加锁。

### 把 VLA 声明成 static [CE]
`static int a[n];`（`n` 是变量）不合法：VLA 的长度在运行时才确定，而静态存储期的对象必须在编译期确定大小。错误信息是 `variable length array cannot have static storage duration`。

## 客观题

### q-s3-static-local-1 single
下面程序的输出是什么？

```c
#include <stdio.h>

void f(void) {
    static int s = 0;
    int a = 0;
    s++;
    a++;
    printf("%d %d\n", s, a);
}

int main(void) {
    f();
    f();
    f();
    return 0;
}
```

- [x] 三行，依次是 `1 1`、`2 1`、`3 1`
  > 正确。`s` 是 `static` 局部变量，只在程序启动时初始化为 0，三次调用共用同一个 `s`，所以是 1、2、3；`a` 是普通局部变量，每次调用都重新创建并初始化为 0，所以永远是 1。
- [ ] 三行，依次是 `1 1`、`2 2`、`3 3`
  > 这把 `a` 也当成了能跨调用保持的变量。`a` 的存储期是自动的：函数返回就销毁，下次调用重新创建、重新初始化，所以每行都是 1。
- [ ] 三行，依次是 `1 1`、`1 1`、`1 1`
  > 这把 `s` 也当成了普通局部变量。`static` 的关键作用就是让 `s` 的存储期变成整个程序，跨调用保留上一次的值。
- [ ] 编译错误：`static` 局部变量不能在函数里声明
  > `static` 局部变量是合法的，而且很常用。它只改变存储期，作用域仍然是函数体内部，函数外依然访问不到。
