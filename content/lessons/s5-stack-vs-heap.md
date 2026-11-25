---
id: s5-stack-vs-heap
---

## 讲解

### 栈与堆是两套分配规则
初学者常把"栈"和"堆"想成两块不同的内存。物理上它们确实位于地址空间的不同区域，但更准确的看法是：**它们是两套完全不同的分配规则**，一套由编译器和 CPU 的栈指针维护，另一套由运行库的分配器（`malloc` / `free`）维护。

```memory title="栈与堆的对比（地址为示意）"
维度 | 栈 | 堆
管理者 | 编译器生成的函数序言/尾声，CPU 的 rsp | 运行库分配器（malloc/free）
分配动作 | 一条 sub rsp, N（O(1)） | 在空闲链表里找块、切分、可能向系统要新页
释放动作 | 函数返回时 add rsp, N，自动完成 | 必须显式调用 free
生命周期 | 从函数被调用到它返回 | 从 malloc 成功到 free
大小上限 | 每个线程固定的一块（常见 1–8MB） | 受进程可用地址空间和物理内存限制
增长方向 | 向低地址增长 | 向高地址增长
典型问题 | 栈溢出 | 泄漏、碎片、悬垂指针、重复释放
```

栈的分配之所以能"一条指令完成"，是因为它只支持一种使用模式：**后进先出（LIFO）**。函数调用像叠盘子，最后进入的函数一定最先返回；返回时只要把栈指针挪回进入前的位置，这一帧里的所有局部变量就一起失效了。堆没有这个限制：你可以在 A 函数里申请，在 B 函数里释放，也可以申请三块、先释放中间那块。自由是要付代价的，代价就是分配器必须记账，而你必须自己 `free`。

### 为什么栈快：一条减法指令 vs 一本账
"栈比堆快"不是因为栈所在的 memory 更高级，而是因为**栈分配几乎不需要做决定**：

- 编译器在编译期就知道一个函数需要多大的局部变量区，函数序言里直接 `sub rsp, N`，返回时 `add rsp, N`。没有查找、没有切分、没有元数据；
- 栈是 LIFO 的，最近释放的空间一定在栈顶，天然可以复用，不会产生"空洞"；
- 每个线程有自己的栈，普通局部变量不需要加锁；
- 刚用过的栈帧还在 CPU 缓存里，连续调用同一个函数时局部变量往往命中缓存。

堆分配则要先回答一串问题：有没有足够大的空闲块？要不要切分？切下来的碎片怎么处理？要不要合并相邻空闲块？多线程同时申请要不要加锁？块头要写多少字节？这些工作让 `malloc` 的耗时不确定，也让它成为热循环里的常见瓶颈。

但不要把"栈快"理解成"栈上的数据访问更快"。变量一旦分配好，读写速度取决于缓存和访问模式，和它在栈上还是堆上无关。真正的差别在**分配/释放的成本**，以及栈的 LIFO 带来的局部性。下面这个例子把两种生命周期放在一起：栈上的数组随函数返回消失，堆上的数组则要等 `free`。

```c run id=sh-lifetime
#include <stdio.h>
#include <stdlib.h>

static int *make_squares(int n) {
    int *a = malloc((size_t)n * sizeof *a);   /* 堆：大小可以运行时决定 */
    if (a == NULL) {
        return NULL;
    }
    for (int i = 0; i < n; i++) {
        a[i] = i * i;
    }
    return a;                                  /* 返回后堆块仍然有效 */
}

static int sum_small(void) {
    int a[5] = { 1, 2, 3, 4, 5 };              /* 栈：函数返回即失效 */
    int s = 0;
    for (int i = 0; i < 5; i++) {
        s += a[i];
    }
    return s;
}

int main(void) {
    int *p = make_squares(5);
    if (p == NULL) {
        return 1;
    }
    printf("heap[4]=%d stack_sum=%d\n", p[4], sum_small());
    free(p);                                   /* 堆块必须显式归还 */
    p = NULL;
    printf("heap freed\n");
    return 0;
}
```
```output
heap[4]=16 stack_sum=15
heap freed
```

`make_squares` 返回时，它的栈帧被销毁，但 `a` 指向的堆块不受影响；`sum_small` 里的 `a` 则随着函数返回一起消失。如果 `sum_small` 返回 `a`（数组名退化成指针），调用者拿到的是已经失效的栈地址，后面再解引用就是未定义行为。

### 生命周期：栈跟着调用走，堆跟着 free 走
栈对象的生命周期由**作用域和函数调用**决定：进入函数时创建，离开函数时销毁；递归调用时每一层都有自己的副本。下面这个递归程序把"后进先出"打印出来：

```c run id=sh-recursion
#include <stdio.h>

static void walk(int n) {
    int mine = n;                 /* 每层栈帧各有一份 mine */
    printf("enter %d\n", n);
    if (n > 1) {
        walk(n - 1);
    }
    printf("leave %d mine=%d\n", n, mine);
}

int main(void) {
    walk(3);
    return 0;
}
```
```output
enter 3
enter 2
enter 1
leave 1 mine=1
leave 2 mine=2
leave 3 mine=3
```

三层 `walk` 的 `mine` 同时存在，地址各不相同（不要打印地址），但它们严格按"最后进入、最先返回"的顺序销毁。堆对象没有这种自动顺序：三块堆内存可以按任意顺序 `free`，也可以一直不 `free`。**这正是 C 不做自动垃圾回收的原因**——编译器无法知道一块堆内存最后一次被使用是什么时候，只有写程序的人知道。

生命周期判断有一条硬规则：

- 指针指向**栈对象**：对象所属的函数返回后，指针立刻变成悬垂指针，不能再解引用；
- 指针指向**堆对象**：只要还没 `free`，即使申请它的函数已经返回，指针仍然有效；一旦 `free`，所有指向它的指针同时失效。

### 大小限制：栈会溢出，堆会返回 NULL
每个线程的栈大小在创建时就固定了（Windows 默认约 1MB，Linux 常见 8MB；本平台判题时通过链接选项放宽到 64MB）。栈上没有"申请失败"这种可恢复的错误：局部数组太大或递归太深，越过栈边界就会触发访问违例，进程直接崩溃（判 `RE`），没有返回值可以检查。

```c run id=sh-stack-size
#include <stdio.h>

int main(void) {
    int frame[100000];        /* 400KB：在本平台的栈上安全，但已接近默认 1MB 栈的一半 */
    frame[0] = 1;
    frame[99999] = 2;
    printf("stack array = %zu bytes\n", sizeof frame);
    printf("first=%d last=%d\n", frame[0], frame[99999]);
    printf("a 4 MB array would exceed a 1 MB stack\n");
    return 0;
}
```
```output
stack array = 400000 bytes
first=1 last=2
a 4 MB array would exceed a 1 MB stack
```

堆的上限要宽松得多，但它不是无限的：`malloc` 失败时会返回 `NULL`，这是一个**可以检查、可以处理**的返回值。问题是很多程序不检查，直接对 `NULL` 解引用，于是把"内存不足"变成了"程序崩溃"。另外，即使 `malloc` 返回了非空指针，也不代表物理内存已经准备好：Linux 的 overcommit 允许"先答应、后分配"，真正写入时仍可能被 OOM killer 终止。所以检查 `NULL` 是必要条件，不是充分条件。

需要一块很大的、生命周期较长的数据（例如 10 万个 `int`、读入未知长度的数组）时，优先放到堆上或做成全局/静态数组，而不是在栈上开一个巨大的局部数组。

### 碎片：堆的空闲块未必拼得起来
堆还有一个栈没有的问题：**碎片**。反复申请、释放不同大小的块之后，空闲空间可能被占用块切成很多小段；即使空闲字节总数足够，也未必能找出一段连续的空间满足一个较大的申请。

下面用一个只有 10 个格子的玩具分配器模拟这件事。`0` 表示空闲，非零表示占用：

```c run id=sh-fragmentation
#include <stdio.h>

#define BLOCKS 10

static int heap[BLOCKS];          /* 0 = 空闲，>0 = 占用块的大小 */

static int alloc(int size) {
    int run = 0;
    for (int i = 0; i < BLOCKS; i++) {
        run = (heap[i] == 0) ? run + 1 : 0;
        if (run == size) {
            int start = i - size + 1;
            for (int k = start; k <= i; k++) {
                heap[k] = size;
            }
            return start;
        }
    }
    return -1;                    /* 没有足够大的连续空闲块 */
}

static void release(int start, int size) {
    for (int i = start; i < start + size; i++) {
        heap[i] = 0;
    }
}

static void show(const char *tag) {
    printf("%s: ", tag);
    for (int i = 0; i < BLOCKS; i++) {
        printf("%d", heap[i] ? 1 : 0);
    }
    printf("\n");
}

int main(void) {
    int a = alloc(2);
    int b = alloc(3);
    int c = alloc(2);
    if (a != 0 || b != 2 || c != 5) {
        return 1;
    }
    show("alloc 2,3,2");

    release(b, 3);                 /* 释放中间那块，留下两段空闲 */
    show("free middle");

    printf("alloc 4 -> %d\n", alloc(4));
    printf("alloc 3 -> %d\n", alloc(3));
    return 0;
}
```
```output
alloc 2,3,2: 1111111000
free middle: 1100011000
alloc 4 -> -1
alloc 3 -> 2
```

释放中间 3 个格子后，空闲格子一共有 6 个，但被分成了 3 + 3 两段，所以 4 个格子的申请失败，3 个格子的申请成功。这就是**外部碎片**：空闲总量够，连续空间不够。栈不会出现这个问题，因为栈只允许在顶部回收，永远是一整块连续空间；代价是它不能支持任意顺序的释放。堆支持任意顺序释放，代价就是分配器要处理碎片。

## 编译与运行

本平台用 Clang 编译，gcc 也可以：

```bash
gcc -std=c17 -Wall -Wextra stack_heap.c -o stack_heap
./stack_heap
```

```bash
clang -std=c17 -Wall -Wextra stack_heap.c -o stack_heap
./stack_heap
```

想观察栈大小的影响，可以在 Linux 上临时调小栈再运行：

```bash
ulimit -s 1024          # 把栈限制为 1MB（只影响当前 shell）
./stack_heap
```

在 Windows 上可以在链接时指定栈大小（本平台判题用的就是类似的做法，给到 64MB）：

```bash
clang -std=c17 -Wall -Wextra stack_heap.c -Wl,--stack,67108864 -o stack_heap.exe
```

几点说明：

- 栈溢出通常表现为 `Segmentation fault` / `0xC00000FD`（stack overflow），本平台判 `RE`；它不会给你一个可以检查的返回值；
- `malloc` 失败返回 `NULL`，可以用 `if (p == NULL)` 处理；这是堆和栈在错误处理上的根本区别；
- 查看进程的栈限制时，Linux 用 `ulimit -s`，Windows 用 `dumpbin /headers` 或 `editbin /STACK`，不要用"打印局部变量地址"来推断栈大小。

## 常见错误

### 把大数组放在栈上 [RE]
`int a[10000000];` 需要约 40MB 栈空间，远超默认的 1–8MB，函数一进入就会栈溢出，进程直接崩溃。大数组应该用 `malloc` / `calloc` 放到堆上，或者做成全局/静态数组。

```c
void f(void) {
    int a[10000000];    /* 错：40MB，默认栈放不下 */
    a[0] = 1;
}
```

### 返回局部数组的地址 [UB]
局部数组在函数返回时随栈帧销毁，返回它的地址得到的是悬垂指针。编译器可能只给一个 `-Wreturn-local-addr` 警告，程序却照样"能跑"，直到某次调用把这块栈内存覆盖。

```c
int *make(void) {
    int a[3] = { 1, 2, 3 };
    return a;                  /* 错：a 在函数返回后失效 */
}
```

需要返回一块跨函数使用的内存时，用 `malloc` 申请堆内存，并约定由调用者 `free`。

### 以为函数返回后堆内存会自动释放 [LEAK]
堆内存的生命周期和函数调用无关。下面这个函数每次调用都申请一块内存却没有释放，调用 N 次就泄漏 N 块：

```c
void handle(void) {
    char *buf = malloc(1024);
    if (buf == NULL) {
        return;
    }
    /* ... 使用 buf ... */
}                              /* 错：buf 是局部指针，函数返回后没人能 free 这块内存 */
```

栈上的指针变量 `buf` 消失了，堆块却还在；这就是"丢失最后一个指向它的指针"式泄漏。必须在函数返回前 `free(buf);`，或者把指针交给调用者管理。

### 在热循环里反复 malloc/free 小块 [TLE]
堆分配不是免费的。一个循环里对每个元素单独 `malloc` 一次，除了分配器的查找和记账开销，还会产生大量碎片；数据量大时很容易超时。常见做法是一次性申请足够的空间（或者用动态数组按容量翻倍扩容），循环里只做下标访问。

## 客观题

### q-s5-stack-vs-heap-1 single
关于栈和堆的区别，下面哪一种说法是正确的？

- [x] 栈分配通常只是调整栈指针，函数返回时自动回收；堆分配要由分配器找空闲块，并且必须显式 `free`。
  > 正确。栈是 LIFO 结构，编译器在函数序言/尾声里用一条加减栈指针的指令完成分配和回收；堆要维护空闲链表、处理切分与碎片，释放时机只能由程序员用 `free` 告诉分配器。
- [ ] 堆比栈快，因为堆的空间更大。
  > 错。空间大和速度快是两件事。堆分配需要查找空闲块、记账、可能加锁，通常比"一条 sub rsp"慢；堆的优势是容量大、生命周期自由，不是速度快。
- [ ] 函数返回后，它用 `malloc` 得到的内存会自动释放。
  > 错。堆内存不会随函数返回自动释放，必须显式 `free`。忘记释放会导致内存泄漏；只有栈上的局部变量才随函数返回自动销毁。
- [ ] 栈上的局部数组可以在函数返回后继续通过指针访问。
  > 错。函数返回后栈帧失效，指向局部数组的指针立刻变成悬垂指针，再解引用是未定义行为。需要跨函数使用的数据应放在堆上（或由调用者提供缓冲区）。
