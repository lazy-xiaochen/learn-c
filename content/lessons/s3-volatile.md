---
id: s3-volatile
---

## 讲解

### 编译器会把"它以为不会变"的值缓存起来
优化器的工作方式是：**只要它证明某个值没有变，就一直用寄存器里那一份，不再去内存读。** 绝大多数时候这是对的，也是程序变快的原因。但当"值在编译器看不见的地方被改了"时，这个假设就崩了。下面这段代码用 `setjmp` / `longjmp` 模拟"控制流从别处突然跳回来"：

```c run id=vol-setjmp-o0 opt=-O0
#include <setjmp.h>
#include <stdio.h>

static jmp_buf env;              /* 保存"跳回哪里" */

int main(void) {
    int x = 0;                   /* 普通变量，不是 volatile */
    if (setjmp(env) == 0) {
        x = 42;                  /* 第一遍执行：写入 42 */
        longjmp(env, 1);         /* 直接跳回 setjmp 那一行，这次返回 1 */
    }
    printf("x = %d\n", x);
    return 0;
}
```
```output
x = 42
```

在 `-O0` 下它"碰巧"是对的：`x` 老老实实待在栈上，写进去就是写进去了。现在把同一份代码交给 `-O2`：

```c run id=vol-setjmp-o2 opt=-O2
#include <setjmp.h>
#include <stdio.h>

static jmp_buf env;              /* 保存"跳回哪里" */

int main(void) {
    int x = 0;                   /* 普通变量，不是 volatile */
    if (setjmp(env) == 0) {
        x = 42;                  /* 第一遍执行：写入 42 */
        longjmp(env, 1);         /* 直接跳回 setjmp 那一行，这次返回 1 */
    }
    printf("x = %d\n", x);
    return 0;
}
```
```output
x = 0
```

`x = 42` 这行明明执行过，打印出来却是 0。原因：优化器把 `x` 放进了寄存器，`longjmp` 跳回来时恢复了 `setjmp` 那一刻保存的寄存器现场，`42` 就随着那次"时光倒流"没了。

**这就是 `volatile` 要解决的问题。** 给 `x` 加上 `volatile`，编译器就再也不会把它缓存进寄存器：

```c run id=vol-setjmp-volatile opt=-O2
#include <setjmp.h>
#include <stdio.h>

static jmp_buf env;

int main(void) {
    volatile int x = 0;          /* 每次读、每次写都必须真的访问内存 */
    if (setjmp(env) == 0) {
        x = 42;
        longjmp(env, 1);
    }
    printf("x = %d\n", x);
    return 0;
}
```
```output
x = 42
```

注意一个细节：标准规定"在 `setjmp` 与 `longjmp` 之间被修改过的、非 `volatile` 的自动变量，`longjmp` 之后的值是不确定的"。也就是说 `x = 0` 那个结果**不是 bug，而是标准允许的行为**——换成别的编译器或别的优化级别，也可能是 42。这类"看起来能跑、换个优化级别就变"的错误最难查，`volatile` 是消除它的正确手段。

### volatile 到底保证了什么
`volatile` 修饰一个对象，意思是"**每一次读/写都必须是一次真实的、按代码顺序发生的内存访问**"。具体说：

1. 不会把值缓存进寄存器，不会把两次读合并成一次，也不会把"看起来没用"的写删掉；
2. 多个 `volatile` 访问之间的**先后顺序**会保持（不会互相调换）。注意这是"编译器不会重排你的访问"，**不是**多核之间的内存屏障；
3. 它**不改变**变量的类型、大小、存储位置，`sizeof` 和取地址完全不受影响。

第 3 点值得强调：`volatile` 是"访问方式"的限定，不是"存储方式"的改变。它和 `const` 一样是类型的一部分（`volatile int` 和 `int` 是两种不同的类型），但不会让变量跑到别的地方去。

### 用途一：内存映射的硬件寄存器
嵌入式程序里，硬件寄存器被映射到某段固定地址上。读一次状态寄存器，硬件就可能清掉某个标志位；写两次，就可能触发两次动作。这种"每次访问都有副作用"的内存，必须用 `volatile` 限定：

```c run id=vol-register
#include <stdio.h>

/* 模拟一块"内存映射"的硬件寄存器区：真实芯片上，这些地址由数据手册给出 */
static volatile unsigned int hw_regs[4];

int main(void) {
    volatile unsigned int *const STATUS = &hw_regs[0];   /* 状态寄存器 */
    volatile unsigned int *const DATA = &hw_regs[1];     /* 数据寄存器 */

    *DATA = 1234u;            /* 写寄存器：必须真的写进内存，不能只留在寄存器里 */
    *STATUS = 1u;             /* 置"开始转换"位 */

    unsigned int first = *STATUS;    /* 读一次 */
    unsigned int second = *STATUS;   /* 再读一次：必须重新去内存读 */

    printf("DATA=%u first=%u second=%u\n", *DATA, first, second);
    return 0;
}
```
```output
DATA=1234 first=1 second=1
```

这里 `volatile` 写在 `*const` 前面（`volatile unsigned int *const`）：**指向的是 volatile 的对象，指针本身是只读的**。这个组合在驱动代码里非常常见。如果写成 `unsigned int *const volatile`，意思就变成了"指针本身可变、但指向的寄存器是普通的"，正好反了。

### 用途二：信号处理函数里的标志位
信号（或中断）处理函数会在主程序的任意两条语句之间被调用。处理函数里改的变量，主循环必须能看见：

```c run id=vol-signal
#include <signal.h>
#include <stdio.h>

/* sig_atomic_t 是标准规定的"信号处理函数里可以安全读写的整数类型" */
static volatile sig_atomic_t stop = 0;

static void on_stop(int sig) {
    (void)sig;
    stop = 1;                    /* 信号到来时由处理函数写入 */
}

int main(void) {
    if (signal(SIGINT, on_stop) == SIG_ERR) {
        printf("signal failed\n");
        return 0;
    }
    printf("before: stop = %d\n", (int)stop);
    raise(SIGINT);               /* 相当于"外部"送来一个 SIGINT */
    printf("after:  stop = %d\n", (int)stop);
    return 0;
}
```
```output
before: stop = 0
after:  stop = 1
```

两个要点：

- `volatile` 让 `printf` 里的 `stop` 真的去内存读，而不是用开头读到的 0；
- `sig_atomic_t` 保证"读或写这一个整数"是处理器一条指令就能完成的事，不会读到一半被打断。**这两个限定各管一件事，缺一不可。**

### 用途三：`volatile` 让"空循环"不会被删掉
调试时常见这种写法：`for (volatile int i = 0; i < 1000000; i++) { }`。循环体是空的，但循环变量是 `volatile`，编译器就不能把整个循环优化掉——这在"制造一段确定的延时"时很有用（虽然正规做法是查定时器）。反过来，如果写 `for (int i = 0; i < 1000000; i++) { }`，`-O2` 会把它整个删掉，延时效果为零。

### volatile 不能保证什么：它不是原子操作
这是最容易踩的坑。`volatile` 只保证"访问是真的、按顺序"，**完全没有保证"一次访问不可分割"**：

```c
volatile int counter;
counter++;          /* 实际是三条指令：读 -> 加 -> 写 */
```

如果这期间有人（另一个线程、或者一个中断）也改了 `counter`，两边的修改就会互相覆盖，丢计数。`volatile` 一个字都没帮上忙。要保证 `counter++` 不丢，需要的是**原子操作**（C11 的 `_Atomic` / `stdatomic.h`）或者互斥量，不是 `volatile`。

所以有三条必须记住的结论：

- `volatile` **不是**线程同步手段，两个线程共享的变量加 `volatile` 依然是数据竞争（未定义行为）；
- `volatile` **不保证**多条语句的原子性，也不保证在多核之间的可见性顺序（那需要内存屏障/原子类型）；
- `volatile` **不会**让程序变快或变慢到可观测的程度，它只是限制了优化。

一句话：**`volatile` 管的是"别优化掉我的访问"，不是"别让别人插进来"。**

### 该不该加 volatile：一个判断清单
不需要背规则，问三个问题就够了：

| 情况 | 要不要 `volatile` |
|---|---|
| 普通局部变量、只在当前函数里改 | 不要。加了只会让程序变慢 |
| 由硬件/内存映射寄存器改 | 要 |
| 由信号处理函数改 | 要，并且用 `sig_atomic_t` |
| 由另一个线程改 | **不要只加 `volatile`**，要用 `_Atomic` 或互斥量 |
| `setjmp` 之后还要用的局部变量 | 要 |
| 结构体里只有部分成员被外部改 | 只给那些成员加，或者整个结构体加（简单但慢） |

顺便说一句：`const volatile` 是有意义的组合，表示"程序不能改，但硬件会改"——只读的状态寄存器就该这么声明。

## 编译与运行

单文件：

```bash
gcc -std=c17 -Wall -Wextra -O0 volatile.c -o volatile
./volatile
```

本平台使用 Clang，命令等价：

```bash
clang -std=c17 -Wall -Wextra -O0 volatile.c -o volatile
./volatile
```

想看到优化带来的差异，必须打开优化：

```bash
clang -std=c17 -Wall -Wextra -O2 volatile.c -o volatile
./volatile
```

几个实用开关：

- `-O0` / `-O2`：本知识点的大部分实验都要靠它俩对比。本平台的"运行"按钮默认 `-O0`，`c run` 代码块可以用 `opt=-O2` 指定；
- `-S`：只生成汇编（`clang -O2 -S volatile.c`），可以直接在 `.s` 文件里看某个变量是不是被缓存进了寄存器——比猜可靠得多；
- `-Wa,--noexecstack` 之类的链接选项与 `volatile` 无关，别被搜索结果带偏；
- `-Wcast-qual`：把 `volatile` 指针强制转换成普通指针时会提醒你（这类转换丢掉的是"每次都要真访问"的保证）。

用 `-O2 -S` 检查的时候，看两个东西：变量是不是还在内存里（有没有 `movl -4(%rbp), %eax` 这样的读写），以及循环是不是整个消失了。

## 常见错误

### 忘了 volatile：`-O2` 下写进去的值读不回来 [WA]
最典型的症状：调试版（`-O0`）一切正常，发布版（`-O2`）结果不对。下面这段代码就是前面那个实验的错误版本，本平台实际跑出来是 `x = 0`：
```c run id=err-no-volatile expect=OK opt=-O2
#include <setjmp.h>
#include <stdio.h>

static jmp_buf env;

int main(void) {
    int x = 0;                   /* 错：这个值需要在"别处"被保留 */
    if (setjmp(env) == 0) {
        x = 42;
        longjmp(env, 1);
    }
    printf("x = %d\n", x);
    return 0;
}
```
```output
x = 0
```
判断标准不是"这个变量有没有被别的函数改"，而是"**编译器能不能证明它没被改**"。只要答案里有"它看不见的修改"，就得加 `volatile`。

### 以为 volatile 能代替线程同步 [UB]
`volatile int counter;` 两个线程各跑 `counter++`，仍然会丢计数。`counter++` 是读—加—写三步，`volatile` 只保证这三步都真的访问内存，不保证它们连在一起做完。两个线程同时读到 5，各自写回 6，结果就是 6 而不是 7。正确做法是 `_Atomic int counter;`（C11）或加锁。给共享变量加 `volatile` 还会让编译器无法优化，慢且不安全。

### volatile 修饰错了对象：修饰了指针而不是它指向的东西 [WA]
```c
volatile int *p;        /* 对：p 指向的对象是 volatile，*p 每次都真读 */
int *volatile q;        /* 错位：q 这个指针本身是 volatile，*q 是普通读 */
int * volatile * r;     /* 更绕：r 指向"volatile 的 int 指针" */
```
读法是从变量名往外念：`int *volatile q` 念作"q 是一个 volatile 的指针，指向 int"。访问硬件寄存器要的是第一种。写错了编译器不会报警，因为它完全是合法的 C，只是没起作用。

### 在 volatile 变量上做复合运算，以为它变成原子的 [UB]
`volatile int n; n += 5;` 依然是读—算—写。同理 `n++`、`n = n * 2`、位操作 `n |= 0x01` 都不是原子的。如果这个变量会被中断改，正确写法是"关中断—读—改—写—开中断"，或者用原子类型；`volatile` 只负责让这几步都真实发生。

### 用 volatile 修饰一个从没被外部修改的局部变量 [WA]
```c
for (volatile int i = 0; i < 1000000; i++) { }   /* 这里确实需要：想保留循环 */
volatile int sum = 0;                            /* 这里不需要：sum 只在本函数用 */
```
多写的 `volatile` 不会让结果错，但会让编译器放弃对这个变量的所有优化（每次循环都要真的读写内存），在热点代码里可能慢好几倍。原则是：**只在"编译器看不见的修改"存在时才加。**

## 客观题

### q-s3-volatile-1 single
下面这段程序用 `-O2` 编译运行，最可能输出什么？

```c
#include <setjmp.h>
#include <stdio.h>

static jmp_buf env;

int main(void) {
    int ready = 0;
    if (setjmp(env) == 0) {
        ready = 1;
        longjmp(env, 1);
    }
    printf("%d\n", ready);
    return 0;
}
```

- [x] 可能输出 0，因为优化器把 `ready` 放在了寄存器里，`longjmp` 恢复寄存器现场时那次写入丢了
  > 正确。`ready` 不是 `volatile`，编译器的假设是"没有别人改它"，于是可以一直用寄存器里的副本。`longjmp` 会恢复 `setjmp` 时刻保存的寄存器现场，`ready = 1` 这次写入就消失了。标准明确规定：在 `setjmp` 与 `longjmp` 之间被修改的非 `volatile` 自动变量，`longjmp` 之后的值是不确定的，所以输出 0 完全合法。
- [ ] 一定输出 1，因为 `ready = 1` 这行代码确实执行了
  > 代码执行了，不代表写入对之后的读取可见。编译器有权把自动变量放在寄存器里；`longjmp` 把寄存器恢复成 `setjmp` 时的状态，寄存器里那份 1 就没了。`-O0` 下通常输出 1，`-O2` 下通常是 0——这正说明它是"不确定"的。
- [ ] 编译错误，因为 `setjmp` 之后不能再用 `ready`
  > 语法上完全合法，`setjmp` 不限制你使用任何变量。标准限制的是"非 `volatile` 自动变量的**值**在 `longjmp` 之后不确定"，不是禁止使用。
- [ ] 一定输出 1，因为 `printf` 之前有函数调用，编译器必须重新读内存
  > `printf` 是库函数调用，编译器确实不知道它会做什么，但 `ready` 是 `main` 的自动变量、地址没有交给任何人，`printf` 根本不可能改它——所以编译器不需要重新读。把 `ready` 改成文件作用域的全局变量，这个理由才成立。
