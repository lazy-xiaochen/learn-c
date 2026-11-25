---
id: s5-ub-return-local
---

## 讲解

### 函数返回时，栈帧就没了

调用一个函数时，栈指针往下走、给它的局部变量留出一块空间；函数返回时，栈指针抬回去——**这块空间立刻变成"谁都可以用"的公共区域**。注意它不会被清零，里面的字节还在原地，但它的**生命周期**已经结束：

> 对象的生命周期结束时，指向它的指针的值变成不确定的（indeterminate）；通过这样的指针访问内存是未定义行为。

这句话有两个后果，都很要命：

1. 那些字节可能还保存着旧值，于是 `*p` 看起来"读到了 42"；
2. 也可能已经被下一个被调用的函数覆盖，于是 `*p` 读到的是别的函数的局部变量、返回地址、甚至根本不在栈上的垃圾。

```memory title="返回局部变量地址：函数返回前后的栈（地址为示意）"
地址       | 内容        | 属于              | 说明
0x7ffd0f90 | 0x7ffd0f9c  | main 的 p（栈）   | 保存 make 里 x 的地址
0x7ffd0f9c | 42          | make 的 x         | 函数返回前：值在这里，读得到
0x7ffd0f9c | 42          | 已回收的栈空间     | 函数返回后：字节还在，但对象已死
0x7ffd0f9c | 7           | 下一次调用的局部变量 | 再调用一个函数：这块空间被别人用了
0x7ffd0f98 | 返回地址     | make 的帧          | 栈帧里还有别的东西，都会被覆盖
```

`0x7ffd0f9c` 这个地址上"有什么"完全取决于后来谁用过它。这就是为什么 `*p` 的结果既可能是 42、也可能是 7、也可能崩溃——**它不是"读到旧值"，而是"访问了一个生命周期已经结束的对象"**。

返回指针本身是合法且常用的，前提是**指向的东西活得比函数久**。三种最常见的正确写法：

```c run id=ret-static
#include <stdio.h>

static char *name_of(int i) {
    static char buf[16];              /* 静态存储期：程序结束前一直有效 */
    snprintf(buf, sizeof buf, "item-%d", i);
    return buf;                       /* 安全：返回的是静态区地址 */
}

int main(void) {
    printf("%s\n", name_of(1));
    printf("%s\n", name_of(2));
    return 0;
}
```
```output
item-1
item-2
```

```c run id=ret-buffer
#include <stdio.h>

static void fill(int *out, int v) {
    *out = v * 2;                     /* 写进调用者提供的空间 */
}

int main(void) {
    int x = 0;
    fill(&x, 21);                     /* 内存由调用者提供，生命周期由调用者负责 */
    printf("x = %d\n", x);
    return 0;
}
```
```output
x = 42
```

```c run id=ret-value
#include <stdio.h>

typedef struct {
    int a;
    int b;
} Pair;

static Pair make(int a, int b) {
    Pair p = { a, b };
    return p;                         /* 返回的是副本，不是 p 的地址 */
}

int main(void) {
    Pair q = make(3, 4);
    printf("q = %d %d\n", q.a, q.b);
    return 0;
}
```
```output
q = 3 4
```

三种写法对应三条思路：**放在静态区**（活得久，但每次调用会覆盖上一次的结果）、**让调用者提供内存**（最灵活，C 标准库大量使用，如 `snprintf`、`fgets`）、**按值返回**（结构体也一样，编译器负责复制，或者用调用者提供的隐藏空间直接构造）。

### 本平台实测：-O0 下它"碰巧是对的"

下面这段代码是教科书级的错误：`make` 返回自己局部变量 `x` 的地址。

```c run id=ret-local-O0 sanitize=off warnings=allow nocheck reason="返回局部变量的地址是未定义行为，读到什么取决于栈上还剩下什么"
#include <stdio.h>

static int *make(void) {
    int x = 42;
    return &x;                        /* 返回局部变量的地址：悬垂指针 */
}

int main(void) {
    int *p = make();
    printf("x = %d\n", *p);
    return 0;
}
```

把 sanitizer 关掉、用默认的 `-O0`，本平台输出 `x = 42`。看起来完全正常：值对了、没崩溃、逻辑"通了"。

换成 `-O2`，同一份代码：

```c run id=ret-local-O2 opt=-O2 sanitize=off warnings=allow nocheck reason="返回局部变量的地址是未定义行为，-O2 下读到的是被复用的栈槽"
#include <stdio.h>

static int *make(void) {
    int x = 42;
    return &x;                        /* 同一个 UB，只是换了优化级别 */
}

int main(void) {
    int *p = make();
    printf("x = %d\n", *p);
    return 0;
}
```

本平台实测输出 `x = 832970000`（每次运行都可能不同）。原因很朴素：`-O2` 下 `make` 被内联，`x` 所在的栈槽被 `printf` 的参数准备过程复用了，`p` 读到的就是那段空间里现在的垃圾。

`-O0` 与 `-O2` 的表现差异，正是这类 bug 的典型症状：

| 编译选项 | 本平台输出 | 说明 |
|---|---|---|
| `-O0`（无 sanitizer） | `x = 42` | 那个栈槽暂时没人用，旧值还在 |
| `-O2`（无 sanitizer） | `x = 832970000`（每次可能不同） | 栈槽被内联后的代码复用，读到垃圾 |
| `-O0` + ASan（`detect_stack_use_after_return=1`） | 判 `RE` | ASan 用"假栈帧"检测到访问已返回函数的局部变量 |

第三行说明工具能抓住它，但**只有配置合适时才行**：ASan 的 use-after-return 检测需要 `detect_stack_use_after_return=1`（本平台的判题环境默认打开），而且在 `-O2` 下如果函数被内联、变量被放进寄存器，这种检测同样可能失效。所以不能指望"跑一遍 sanitizer 就万事大吉"。

### 为什么"我再读一次就还给它"也不行

一个常见的心存侥幸：`return &x;` 之后马上在调用者里读一次，"反正刚返回，栈还没被动过"。

- 这个"还没被动过"是**实现细节，不是保证**。编译器完全可以在 `ret` 之前就把栈槽交给别的东西用，也可以在调用点插入任意代码；
- 更糟的是，函数返回的那一刻 `x` 的生命周期就结束了，哪怕字节还在，访问它也是 UB——优化器可以据此把整段"读"删掉或改成别的值。

还有两个更隐蔽的变体：

```c
int *f(int x) { return &x; }          /* 形参也是局部变量，一样悬垂 */
char *g(void) { char buf[16]; strcpy(buf, "hi"); return buf; }   /* 局部数组同理 */
```

形参 `x` 和局部数组 `buf` 都住在被调用者的栈帧里，函数一返回就全部失效。**判断标准不是"它是不是数组"，而是"它住在谁的栈帧里"**。

### 返回指针的正确姿势

把"谁拥有这块内存"写清楚，问题就消失了一半：

| 想让调用者拿到 | 正确做法 | 注意 |
|---|---|---|
| 一个计算结果 | 按值返回（`int`、`struct`、甚至小数组用结构体包起来） | 最省心，优先选它 |
| 一段文本/缓冲区 | 调用者传 `char *out, size_t cap` 进来 | 库函数的标准做法，如 `snprintf` |
| 一个"名字"或固定表项 | 返回字面量或静态表的地址 | 字面量有静态存储期，安全 |
| 一块需要跨调用保留的内存 | 返回 `static` 缓冲区，或 `malloc` 出来的内存 | `static` 不线程安全；`malloc` 必须交代谁 `free` |
| 调用者自己传进来的对象 | 直接返回这个指针（`return s;`） | 安全：它指向的是调用者的内存 |

最后一行值得强调：`char *identity(char *s) { return s; }` 完全合法，因为 `s` 是个指针值，返回它只是复制了一个地址，而它指向的内存在调用者的帧里，活得好好的。

## 编译与运行

用 gcc 或 clang 都行，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra ret.c -o ret
./ret
```

```bash
clang -std=c17 -Wall -Wextra ret.c -o ret
./ret
```

好消息是，这类错误**编译器基本都会警告**（`-Wreturn-stack-address` 包含在 `-Wall` 里）：

```text
warning: address of stack memory associated with local variable 'x' returned [-Wreturn-stack-address]
```

看到这条警告就当编译错误处理（`-Werror=return-stack-address`），比事后用 sanitizer 抓便宜得多。

工具方面：

- **ASan 的 use-after-return 检测**需要 `ASAN_OPTIONS=detect_stack_use_after_return=1`。它用"假栈帧"实现：被取过地址的局部变量不放在真栈上，而是放一块堆上的模拟帧，函数返回后立刻把这块内存标记为不可访问。所以它能稳定地报 `stack-use-after-return`；
- `-O2` 下内联和寄存器分配都会让"栈帧"这个概念在机器码里消失，检测可能失效，所以**不要用优化后的构建去证明"没有悬垂指针"**；
- gcc 的 `-Wreturn-local-addr` 是同一类检查的另一个名字。

想直观地看到栈帧被回收，可以对比两档的汇编：

```bash
clang -std=c17 -O0 -S ret.c -o ret-O0.s
clang -std=c17 -O2 -S ret.c -o ret-O2.s
```

`-O0` 下能看到 `make` 把 42 写进 `-4(%rbp)` 再把那个地址放进 `rax`；`-O2` 下 `make` 往往整个消失（内联），地址变成一个指向"已经没有意义的位置"的临时值。

## 常见错误

### 返回局部数组的地址 [UB]
比返回单个变量更常见：想在函数里拼好一个字符串再返回。

```c run id=ret-err-array expect=RE
#include <stdio.h>

static char *greet(const char *name) {
    char buf[32];                     /* 局部数组：函数返回就失效 */
    snprintf(buf, sizeof buf, "hello, %s", name);
    return buf;                       /* 错：返回的是已经失效的栈地址 */
}

int main(void) {
    char *s = greet("world");
    printf("%c%c\n", s[0], s[1]);     /* 下标访问由插桩代码执行，ASan 抓得到 */
    return 0;
}
```

本平台判 `RE`（ASan 报 use-after-return）。这里有个值得记住的细节：如果改成 `printf("%s\n", s)`，**本平台反而不会报错**——因为真正读那些字节的是没有插桩的 `printf`，ASan 只能看见 C 代码里的访问。工具抓不抓得到，取决于"读"发生在哪里。

正确做法有三种：把 `buf` 改成 `static`、让调用者传缓冲区进来、或者把结果按值装进结构体返回。

### 以为形参不是局部变量，返回 `&x` 没问题 [UB]
形参和局部变量住的是同一个栈帧。`int *f(int x) { return &x; }` 与 `int *f(void) { int x; return &x; }` 的后果完全一样。**所有在函数内部声明的、或作为形参传入的自动变量，地址都不能返回**——唯一的例外是"指针值本身可以返回"，因为指针指向的是别人的内存。

### 以为改成 static 就万事大吉 [WA]
`static char buf[32];` 解决了生命周期问题，但引入了两个新问题：下次调用会覆盖上次的结果；多线程同时调用会互相踩。`printf("%s %s", name_of(1), name_of(2))` 里两个实参都指向同一个缓冲区，输出会是 `item-2 item-2`。

### 以为 -O0 下输出正确就说明没问题 [WA]
`-O0` 下 `x = 42` 只是因为那块栈槽暂时没被复用。同一份代码在 `-O2` 下输出 `x = 832970000`，在不同编译器、不同调用深度下又是别的值。判断依据只能是"这个对象还活着吗"，不能是"这次打印出来是多少"。

### 拿着悬垂指针去写，破坏别人的栈 [UB]
读悬垂指针通常只是读到垃圾，**写**它会直接破坏当前栈上的数据——可能是别的函数的局部变量，也可能是返回地址。

```c run id=ret-err-write expect=RE
#include <stdio.h>

static int *make(void) {
    int x = 42;
    return &x;
}

int main(void) {
    int *p = make();
    *p = 7;                           /* 写进已经回收的栈槽：破坏别人的栈帧 */
    printf("写完了\n");
    return 0;
}
```

这种破坏的后果完全不可预测：可能什么都不发生，可能让 `main` 的局部变量变值，也可能在函数返回时跳到垃圾地址——而崩溃的位置离肇事那一行可能隔着几十行。

## 客观题

### q-s5-ub-return-local-1 single
```c
int *make(void) {
    int x = 42;
    return &x;
}
```
关于 `int *p = make(); printf("%d\n", *p);`，下面哪一句是正确的？

- [x] 是未定义行为：`x` 的生命周期在 `make` 返回时结束，`p` 成为悬垂指针；本平台 `-O0` 下可能打印 42，`-O2` 下打印的是被复用的栈槽里的垃圾
  > 正确。返回局部变量的地址不会延长对象的生命周期，函数返回后那块栈空间随时可能被复用。`-O0` 下"碰巧"打印 42 只是因为暂时没人覆盖它；`-O2` 下内联让栈槽被复用，读到的就是垃圾。两种结果都合法，因为标准对 UB 不作任何要求。
- [ ] 一定打印 42，因为 `return` 之前 `x` 的值已经算好了，返回值被复制到了 `p` 里
  > 错。被复制的是**地址**，不是值。`x` 的内容在函数返回后仍然留在栈上（通常），但那块空间的对象已经不存在了；通过悬垂指针读它是 UB，编译器有权把它优化成任何东西。
- [ ] 编译会失败，因为 `-Wall` 里的 `-Wreturn-stack-address` 直接拒绝这种写法
  > 错。它只是**警告**（`warning: address of stack memory associated with local variable 'x' returned`），编译照常成功。除非显式加 `-Werror=return-stack-address`，否则程序会正常产出。
- [ ] 只要在调用 `make` 之后立刻读一次就安全，因为栈还没来得及被别人用
  > 错。"栈还没来得及被用"是实现细节，不是语言保证。对象的生命周期在函数返回时就结束了，此后任何访问都是 UB；编译器可以据此把这次读删掉或替换成任意值。
