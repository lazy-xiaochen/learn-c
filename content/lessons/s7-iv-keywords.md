---
id: s7-iv-keywords
---

## 讲解

### 面试官在问什么
"说说 static / extern / volatile / const 的作用"是 C 岗位出现频率最高的一道题，因为它一次性覆盖了**链接、存储期、优化、类型限定**四个维度。答错的典型特征是"四个关键字背成四段互不相关的话"——比如把 `const` 说成"放在只读区"、把 `volatile` 说成"线程安全"。正确的答法是先给总纲，再逐个展开。

### 口述版答案
**一句话总纲**：这四个关键字改的是**三个不同的维度**——`static` / `extern` 改**链接属性和存储期**，`const` 改**能不能通过这个名字写**，`volatile` 改**编译器能不能省略这次访问**。分开记，别混着背。

**`static`：两个位置，两种效果**

- **函数内**：存储期从"自动"变成"静态"；**只初始化一次**；整个进程一份；函数返回不销毁；名字仍然只在函数内可见。
  - 关键词：静态存储期、只初始化一次、跨调用保留。
  - 典型用途：调用计数器、一次性缓存、状态标志。
- **文件作用域**：链接属性从"外部"变成"**内部**"；别的 `.c` 文件看不见它；每个翻译单元各有一份，重名也不冲突。
  - 关键词：内部链接、翻译单元私有。
- `static` **函数**同理，也是内部链接；头文件里定义 `static` 函数，效果是"每个包含它的 `.c` 各有一份副本"。

**`extern`：它只是一句声明**

- `extern int g;` 是**声明**：告诉编译器"有一个 `int` 叫 `g`，类型是这样，存储在哪我不知道"；**不分配存储**。
- `int g = 0;` 或 `int g;` 是**定义**：真正分配存储。
- 标准用法：头文件写 `extern int g;`，某一个 `.c` 里写 `int g = 0;`，其它文件 `#include` 头文件后直接使用。
- 函数的声明天然是 `extern`，可以省略不写，但写在头文件里表意更清楚。
- 关键词：声明与定义分离、不分配存储、跨文件共享。

**`volatile`：别优化我的访问**

- 含义：这个对象可能被**程序之外**的力量改变（硬件寄存器、信号处理函数、别的线程），所以**每次读都必须真的从内存读，每次写都必须真的写回**；不许缓存到寄存器，不许合并、删除"看起来没用"的访问。
- 典型场景：内存映射 I/O 寄存器、`volatile sig_atomic_t` 标志位、轮询等待的完成标志。
- **不是**：不是原子操作，不是内存屏障，不能替代锁或 `_Atomic`。它只解决"编译器别乱动"，不解决"多核同时写"。
- 关键词：每次访问、禁止优化、不保证并发正确。

**`const`：只读视图**

- 含义：通过这个名字**不能写**，由编译器在编译期检查；**不改变存储位置**——局部 `const` 仍在栈上，只有文件作用域的 `const` 才通常被放进 `.rodata`。
- 指针三态（从右往左读，`const` 修饰它左边最近的那个东西）：
  - `const int *p`：指向的对象只读，`p` 可以改指向；
  - `int *const p`：`p` 本身只读，`*p` 可写；
  - `const int *const p`：两者都只读。
- 函数参数写 `const T *`，是接口承诺"我不会改你的数据"，也让调用者敢传 `const` 对象进来。
- **C 里 `const` 不是编译期常量**：`const int n = 5;` 不能当 `case` 标号，也不能当文件作用域数组长度（C++ 可以，这是面试常挖的坑）。
- 关键词：只读约束、指针三态、不是常量表达式。

**组合技**：`const volatile int status;` —— 程序不写（`const`），但硬件可能改（`volatile`），每次读必须真读。嵌入式里"只读状态寄存器"就是这么声明的。

一张表收尾，面试时可以照着说：

| 关键字 | 改的是哪个维度 | 函数内 | 文件作用域 | 一句话记忆 |
|---|---|---|---|---|
| `static` | 存储期 / 链接 | 静态存储期，只初始化一次 | 内部链接，别的文件看不见 | "函数内变长寿，文件内变私有" |
| `extern` | 链接（声明） | 少见 | 声明一个别处定义的对象 | "只声明，不分配" |
| `volatile` | 优化 | 常用于寄存器/标志 | 常用于硬件寄存器 | "每次都真读真写" |
| `const` | 类型限定（只读） | 仍在栈上 | 通常在 `.rodata` | "只读约束，不是常量" |

### 口述版：四个连环追问
- **追问 1：`static` 全局和普通全局同名会冲突吗？**
  答：不同文件里不冲突，`static` 那个是内部链接；**同一个文件里**重复定义才会报错。
- **追问 2：只写 `extern int g;` 却没有任何定义会怎样？**
  答：编译通过，链接时报未定义符号——如果程序里真的引用了它。
- **追问 3：`volatile` 能当锁用吗？**
  答：不能。它只保证"每次都访问内存"，不保证原子性、不保证顺序，两个线程同时 `x++` 照样丢更新。要并发正确请用 `_Atomic` 或互斥量。
- **追问 4：`const` 和 `volatile` 能一起用吗？**
  答：能，顺序无所谓，`const volatile` 和 `volatile const` 等价；含义是"程序不写，但可能被外部改"。

### 代码版答案
面试官说"写个例子"，就写这四段，每段对应一个关键字。**不要写"能编译但不说明问题"的代码**，每段都要能打印出可观察的差别。

**`static`：局部变量只初始化一次，函数与全局变量都变成"本文件私有"。**

```c run id=kw-static
#include <stdio.h>

static int file_counter;        /* 内部链接：只有本文件能看见 */

static int bump(void) {         /* static 函数：内部链接 */
    static int calls;           /* 静态存储期：只初始化一次 */
    calls++;
    file_counter++;
    return calls;
}

int main(void) {
    for (int i = 0; i < 3; i++) {
        int now = bump();
        printf("bump=%d file_counter=%d\n", now, file_counter);
    }
    return 0;
}
```
```output
bump=1 file_counter=1
bump=2 file_counter=2
bump=3 file_counter=3
```

`calls` 每次调用都接着上次的值，说明它不在 `bump` 的栈帧里；`file_counter` 和 `bump` 都带 `static`，别的 `.c` 文件既链接不到这个函数，也看不到这个变量。注意 `calls` 仍然是**函数内可见**的，`static` 改的是寿命和链接，不是"变成全局名字"。

**`extern`：声明与定义分离，两边指向同一个对象。**

```c run id=kw-extern
#include <stdio.h>

extern int shared_total;                /* 声明：不分配存储 */
extern int add_to_total(int value);     /* 函数声明 */

int main(void) {
    printf("before=%d\n", shared_total);
    shared_total = 10;                  /* 改的是下面那个定义 */
    int sum = add_to_total(5);
    printf("after=%d sum=%d\n", shared_total, sum);
    return 0;
}

int shared_total = 0;                   /* 定义：真正分配存储 */

int add_to_total(int value) {
    shared_total += value;
    return shared_total;
}
```
```output
before=0
after=15 sum=15
```

`main` 里先用了 `shared_total`，定义却写在文件末尾——因为前面的 `extern` 声明已经告诉编译器"它是个 `int`，地址链接时再填"。把这段代码拆成两个 `.c` 文件就是真实工程里的写法：**头文件放 `extern` 声明，一个源文件放定义**。

**`const`：三种指针写法，只有该写的那个能写。**

```c run id=kw-const
#include <stdio.h>

int main(void) {
    int x = 1;
    int y = 2;

    const int *pc = &x;          /* 指向只读：*pc 不能改，pc 可以改指向 */
    int *const cp = &x;          /* 指针只读：cp 不能改，*cp 可以写 */
    const int *const both = &x;  /* 两者都只读 */

    *cp = 10;                    /* 合法：cp 指向的 x 不是 const 对象 */
    pc = &y;                     /* 合法：改的是指针本身 */
    printf("*pc=%d x=%d\n", *pc, x);
    printf("*cp=%d *both=%d\n", *cp, *both);
    return 0;
}
```
```output
*pc=2 x=10
*cp=10 *both=10
```

`*pc = 5;` 和 `cp = &y;`、`both = &y;`、`*both = 5;` 都会编译失败——`const` 的检查在编译期完成，不产生运行时开销。面试常问"`const int *p` 和 `int *const p` 的区别"，回答方式就是上面三行注释：**`const` 修饰它左边最近的那个东西**，左边没有东西时才修饰右边。

**`volatile` 与 `const` 组合：只读状态寄存器。**

```c run id=kw-volatile
#include <stdio.h>

/* 只读状态寄存器：程序不写，但可能被硬件改，所以 const volatile */
static const volatile int status = 7;

/* 模拟一个硬件寄存器：每次赋值都必须真的落到内存 */
static volatile unsigned char device_reg;

int main(void) {
    int total = 0;
    for (int i = 0; i < 3; i++) {
        total += status;        /* volatile：不许把这次读提到循环外 */
    }
    device_reg = 1;
    device_reg = 2;
    device_reg = 3;             /* 真实硬件上，这三笔写可能代表三次不同的命令 */
    printf("total=%d status=%d\n", total, status);
    printf("device_reg=%u\n", (unsigned)device_reg);
    return 0;
}
```
```output
total=21 status=7
device_reg=3
```

`status` 既是 `const`（程序不许写）又是 `volatile`（外部可能改），所以每次读都真的读内存，编译器不会把 `7 × 3` 直接折叠成 21 常量——**语义上它随时可能变成别的值**，只是这个示例里没变。`device_reg` 的三次赋值也不会被合并成一次，这在写硬件寄存器时必须保留。

再看一眼内存里这两个"长寿"变量的位置：

```memory title="同一函数内的 static 局部与自动局部（地址为示意）"
地址 | 内容 | 变量 | 所在区
0x404040 | 0 | calls（bump 的 static 局部） | .bss
0x404044 | 0 | file_counter（文件作用域的 static） | .bss
0x7ffd20 | 3 | i（main 的自动变量） | 栈
0x7ffd24 | 3 | now（bump 返回值的副本） | 栈
```

`calls` 和 `file_counter` 都在 `.bss`，函数返回、栈帧消失都不影响它们；`i` 和 `now` 在栈上，`main` 返回就一起消失。**`static` 只改变"住哪、活多久"，不改变"谁能看见名字"**。

## 编译与运行

本平台使用 Clang（x86-64 Windows，UCRT），用 `gcc` 或 `clang` 都可以：

```bash
gcc -std=c17 -Wall -Wextra keywords.c -o keywords
./keywords
```

```bash
clang -std=c17 -Wall -Wextra keywords.c -o keywords
./keywords
```

**验证 `static` 的链接属性**：把源文件编译成目标文件，再用 `llvm-nm` 看符号表。大写字母是外部链接，小写字母是内部链接：

```bash
clang -std=c17 -c keywords.c -o keywords.o
llvm-nm keywords.o
```

```text
00000000 T main
00000000 T global_fn        # 外部链接：别的 .o 能链接到
00000020 t local_fn         # 小写 t：static 函数，内部链接
00000000 D visible          # 外部链接的数据
00000004 d hidden           # 小写 d：static 变量，内部链接
```

**验证 `volatile` 的优化效果**：用 `-O2` 生成汇编，对比同样的循环读普通变量和 `volatile` 变量：

```bash
clang -std=c17 -O2 -S volatile.c -o volatile.s
```

```text
read_plain:                     # 普通全局变量
	movl	plain(%rip), %eax       # 只读一次
	shll	$2, %eax                # 直接乘 4（循环被完全折叠）
	retq

read_flag:                      # volatile 全局变量
	movl	flag(%rip), %eax
	addl	flag(%rip), %eax        # 每一轮都重新读内存
	addl	flag(%rip), %eax
	addl	flag(%rip), %eax
	retq
```

上面是本平台实测的汇编（循环 4 次）。同一份循环，`plain` 被优化成"读一次再乘 4"，`flag` 老老实实读了 4 次——这就是 `volatile` 的全部作用：**阻止编译器省略或合并访问**，仅此而已。

## 常见错误

### 以为 `const` 只是"建议"，运行期还能改
`const` 是编译期强制检查：直接赋值会编译失败（判 `CE`），用强制类型转换绕过它去写一个真正的只读对象则是未定义行为。它跟"存储在哪"没有关系。

```c run expect=CE
#include <stdio.h>

int main(void) {
    const int limit = 10;
    limit = 20;              /* 编译错误：const 对象不能赋值 */
    printf("%d\n", limit);
    return 0;
}
```

### 以为 `volatile` 能保证线程安全
`volatile` 只禁止编译器优化访问，**不提供原子性和内存序**。两个线程同时执行 `flag++`，即使 `flag` 是 `volatile`，读-改-写之间仍可能被打断，照样丢更新。并发共享数据要用 `_Atomic` 类型或互斥量；`volatile` 的正当用途是硬件寄存器和信号处理标志。

### 以为 `static` 全局变量"每次调用都重建"
`static` 在函数内改的是**存储期**：`static int calls;` 从第一次执行到进程结束只有一份，函数返回不销毁、下次调用接着用，而且**只初始化一次**。这也是它不能用来做"每次调用都从 0 开始"的计数器的原因。反过来，在文件作用域，`static` 改的是**链接属性**（外部变内部），不是"每次调用重建"——那种说法只对函数内 `static` 有一半道理。

### 以为 `extern` 会分配存储
`extern int g;` 只是声明，编译器不会为它留空间；如果没有另一个 `.c` 提供 `int g;` 的定义，链接期就会报未定义符号。反过来，`int g;`（不带 `extern`）在文件作用域是**暂定定义**，会分配存储。把声明写成定义、或者在头文件里写 `int g;` 被多个源文件包含，就是经典的重复定义链接错误。

### 以为 `const int` 可以作为 `case` 标号或数组长度
C 标准里的整型常量表达式不包含 `const int` 对象，所以 `const int n = 5; switch (x) { case n: ... }` 在严格模式下不能编译。要当编译期常量请用 `#define` 或 `enum`。C++ 里 `const int` 可以，这正是面试官想看你有没有分清 C 和 C++ 的地方。

## 客观题

### q-s7-iv-keywords-1 single
某嵌入式项目里有一个"只读状态寄存器"：程序从不写它，但硬件会随时改变它的值，而且每次读取都必须是真正访问内存。下面哪种声明最准确地表达了这个意图？

- [x] `const volatile int status;`
  > 正确。`const` 表示程序不通过这个名字写它，`volatile` 表示它可能被外部改变、每次读都必须真的访问内存。两者组合正是"只读状态寄存器"的标准写法，顺序写成 `volatile const` 也等价。
- [ ] `const int status;`
  > 错。只有 `const` 时编译器可以假设这个值在程序运行期间不会变，于是把它当常量折叠、缓存到寄存器，甚至把整个读取优化掉——硬件改了它也读不到。
- [ ] `volatile int status;`
  > 错。`volatile` 保证了每次都真读，但没有 `const` 的约束，程序里任何地方都能写它，接口语义就丢了一半。状态寄存器应当"程序只读、硬件可写"。
- [ ] `static const int status;`
  > 错。`static` 只是把链接属性改成内部链接（并让对象拥有静态存储期），跟"外部会改变它"毫无关系；没有 `volatile`，编译器仍然可以省略或合并访问。
