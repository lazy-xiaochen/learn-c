---
id: s5-memory-layout
---

## 讲解

### 进程地址空间不是一锅粥
程序运行起来以后，它看到的每一个变量、每一段机器指令、每一块 `malloc` 得到的内存，都落在同一个虚拟地址空间里。但这个空间并不是随机堆放的：操作系统和编译器把它分成了几个用途固定、权限不同的区域。

先记住下面这张分区表，它是后面所有内容的地图：

```memory title="x86-64 进程地址空间的分区（地址为示意，实际每次运行都不同）"
区域 | 存放什么 | 生命周期 | 权限与增长方向
代码区（.text） | 函数的机器指令 | 整个进程 | 只读、可执行
只读数据区（.rodata） | 字符串字面量、const 全局对象 | 整个进程 | 只读
数据区（.data） | 已初始化的全局变量和 static 变量 | 整个进程 | 可读写
BSS 区（.bss） | 未初始化或初始化为 0 的全局变量和 static 变量 | 整个进程 | 可读写、启动时清零
堆（heap） | malloc / calloc / realloc 得到的块 | 从分配到 free | 可读写、向高地址增长
栈（stack） | 局部变量、函数参数、返回地址、保存的寄存器 | 随函数调用创建、返回销毁 | 可读写、向低地址增长
```

这张表里最容易被忽略的是**只读数据区**：它经常被并进"代码区"一起讲，但字符串字面量 `"hello"` 的字符其实住在这里，而不是栈上。`char *s = "hello";` 只是在栈上放了一个指针 `s`，它指向只读区里的 6 个字节（5 个字符加结尾的 `'\0'`）。

各区的初始化规则也不一样，下面这个程序把它们一次打印出来：

```c run id=ml-classify
#include <stdio.h>

int g_limit = 100;          /* .data：有非零初值 */
int g_count;                /* .bss：没有初值，启动时清零 */
static int s_total;         /* .bss：文件作用域的 static 也一样 */

static int bump(void) {
    static int calls;       /* .bss：函数内的 static，不随函数返回消失 */
    calls++;
    return calls;
}

int main(void) {
    int local = 7;                 /* 栈：每次调用 main 都重新创建 */
    const char *msg = "layout";    /* 指针在栈上，字符在只读数据区 */

    printf("g_limit=%d g_count=%d s_total=%d\n", g_limit, g_count, s_total);
    printf("local=%d msg=%s\n", local, msg);
    for (int i = 0; i < 3; i++) {
        printf("bump()=%d\n", bump());
    }
    return 0;
}
```
```output
g_limit=100 g_count=0 s_total=0
local=7 msg=layout
bump()=1
bump()=2
bump()=3
```

`g_count` 和 `s_total` 没有写初值，打印出来却是 0，这不是巧合：**BSS 区的对象在程序启动前由加载器整体清零**。`s_total` 和 `g_count` 虽然作用域不同，存储期却都是整个进程。而 `bump` 里的 `calls` 每次调用都保留上一次的值，也是因为它在 BSS 区，而不是在 `bump` 的栈帧里。

### 判断一个变量住在哪个区
看到一个变量，按下面的顺序问自己四个问题，基本不会判断错：

1. **它是不是函数代码？** 是 → 代码区。
2. **它是不是字符串字面量，或者只读的全局常量？** 是 → 只读数据区。
3. **它是不是 `malloc` / `calloc` / `realloc` 返回的块？** 是 → 堆。
4. **它是不是在函数里、又没有 `static`？** 是 → 栈。
5. 剩下的全局变量、文件作用域变量、函数内 `static` 变量：**有非零初值 → 数据区，没有初值或初值为 0 → BSS 区**。

这里有三个反直觉的点：

- `static` 改变的是**存储期和链接属性**，不只是"作用域变小"。函数里的 `static int calls;` 不在栈上，函数返回后它仍然存在。
- `const` 不是存储类别。`const int x = 3;` 写在函数里，`x` 仍然在栈上，只是编译器不允许你通过 `x` 修改它；只有文件作用域的 `const` 对象才通常被放进只读数据区。
- 指针变量和它指向的东西可以住在不同的区。`char *msg = "layout";` 的 `msg` 在栈上，`"layout"` 在只读区。

下面用递归把"栈帧"这件事看清楚：每一层调用都有自己的局部变量，函数返回时这一层就整体消失，而上一次调用留下的 `static` 变量却还在。

```c run id=ml-frames
#include <stdio.h>

static int depth = 0;          /* .bss：记录当前递归深度 */

static void enter(int n) {
    int frame_mark = n;        /* 栈：每一层都有自己的 frame_mark */
    depth++;
    printf("enter %d: frame_mark=%d depth=%d\n", n, frame_mark, depth);
    if (n > 1) {
        enter(n - 1);
    }
    printf("leave %d: frame_mark=%d depth=%d\n", n, frame_mark, depth);
    depth--;
}

int main(void) {
    enter(3);
    printf("after: depth=%d\n", depth);
    return 0;
}
```
```output
enter 3: frame_mark=3 depth=1
enter 2: frame_mark=2 depth=2
enter 1: frame_mark=1 depth=3
leave 1: frame_mark=1 depth=3
leave 2: frame_mark=2 depth=2
leave 3: frame_mark=3 depth=1
after: depth=0
```

`enter` 的三层调用各有一个 `frame_mark`，它们同时存在、互不干扰；返回顺序正好和调用顺序相反（后进先出）。这就是栈区"自动分配、自动回收"的全部秘密：函数进入时栈指针往下挪一块，函数返回时挪回去，不需要任何 `free`。

### 为什么代码区只读、BSS 不占文件
这些分区不是为了好看，每一块都解决一个具体问题。

**代码区只读**，是为了防止程序在运行时改写自己的指令。如果一条野指针误写到代码区，操作系统会直接让进程崩溃（本平台判 `RE`），而不是让程序带着被改坏的指令继续跑。只读还有一个好处：同一个程序的多个进程可以共享同一份物理代码页。

**BSS 单独存在**，是为了让"全是 0 的大数组"不占可执行文件的体积。编译器只需要在文件头里记下"运行时需要 N 字节、全部填 0"，加载器再映射一批零页即可。对比下面两个全局数组：

```c
int zeros[100000];              /* BSS：文件里几乎不占空间 */
int ones[100000] = { 1 };       /* .data：第一个元素是 1，其余补 0，仍要占 400KB */
```

`zeros` 的 400KB 在可执行文件里几乎不占字节；`ones` 因为有一个非零初值，整个数组的内容都得存进文件。这不是编译器偷懒，而是"零"这个初值太常见，值得为它设计一个专门的区。可以用 `size` 命令看一个目标文件的 `text`、`data`、`bss` 三列，差距一目了然。

```c run id=ml-bss
#include <stdio.h>

static int table[100000];       /* BSS：400000 字节，但不需要写进可执行文件 */

int main(void) {
    printf("sizeof(table)=%zu\n", sizeof table);
    printf("table[0]=%d table[99999]=%d\n", table[0], table[99999]);
    return 0;
}
```
```output
sizeof(table)=400000
table[0]=0 table[99999]=0
```

**堆**则是为"编译期不知道要多少、或者生命周期要跨函数"的数据准备的。栈上的数组大小必须在编译期确定（VLA 除外），而且函数一返回就没了；堆块的大小可以运行时决定，函数返回后只要没 `free` 就还在。下面这个函数把字符串复制到堆上再返回，调用者拿到的是仍然有效的一份副本：

```c run id=ml-heap
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static char *copy_text(const char *src) {
    size_t n = strlen(src) + 1;
    char *p = malloc(n);          /* 堆：大小运行时决定 */
    if (p == NULL) {
        return NULL;
    }
    memcpy(p, src, n);
    return p;                     /* 返回后这块堆内存仍然有效 */
}

int main(void) {
    char local[] = "stack";       /* 栈：main 返回时消失 */
    char *heap = copy_text(local);

    if (heap == NULL) {
        return 1;
    }
    printf("local=%s heap=%s\n", local, heap);
    printf("sizeof local=%zu\n", sizeof local);
    free(heap);                   /* 堆内存必须显式归还 */
    heap = NULL;
    printf("heap freed\n");
    return 0;
}
```
```output
local=stack heap=stack
sizeof local=6
heap freed
```

`sizeof local` 是 6 而不是 5，因为字符数组还包含结尾的 `'\0'`。`local` 和 `heap` 打印出来内容一样，但它们的存储期完全不同：`local` 在 `main` 返回时随栈帧消失，`heap` 则会一直活到 `free` 的那一刻——这也是忘记 `free` 就会泄漏的根本原因。

### 一张图记住"谁创建、谁销毁"
把五个区的生命周期排成时间线：

| 区域 | 谁创建 | 何时销毁 | 典型错误 |
|---|---|---|---|
| 代码区 | 编译器、链接器 | 进程结束 | 把函数指针指到错误类型 |
| 只读数据区 | 编译器 | 进程结束 | 修改字符串字面量 |
| 数据区 / BSS | 加载器 | 进程结束 | 以为局部 `static` 会随函数返回消失 |
| 堆 | `malloc` 家族 | `free` 时 | 泄漏、悬垂指针、重复释放 |
| 栈 | 函数调用 | 函数返回 | 返回局部变量地址、栈溢出 |

判断一个对象"还能不能用"，只需要看它所在的区域还在不在：栈对象看函数有没有返回，堆对象看有没有被 `free`，其余三个区一直活到进程结束。后面几节会把栈和堆的差别、`malloc` 与 `free` 的配对规则展开讲。

## 编译与运行

本平台使用 Clang（x86-64 Windows，UCRT），用 gcc 或 clang 都可以编译：

```bash
gcc -std=c17 -Wall -Wextra layout.c -o layout
./layout
```

```bash
clang -std=c17 -Wall -Wextra layout.c -o layout
./layout
```

想看到各区的字节数，可以只编译成目标文件，再用 `size` 或 `llvm-size` 查看：

```bash
clang -std=c17 -Wall -Wextra -c layout.c -o layout.o
llvm-size layout.o
```

在 Linux 上对应的命令是 `size layout.o`，输出大致有三列：

```text
   text    data     bss     dec     hex filename
   1234     512  400000  401746   62152 layout.o
```

- `text` 是代码区（外加只读数据）的字节数；
- `data` 是已初始化全局/静态对象的字节数；
- `bss` 是零初始化对象的字节数，它**不计入文件体积**，只计入运行时的内存需求。

两点提醒：

1. 不同编译器、不同优化级别会把同一个变量放到不同的区（例如 `-O2` 可能把只读的全局数组直接内联成立即数），所以不要用"某次 `size` 的输出"去推断语言层面的保证；
2. 不要打印变量的地址来"证明"布局。地址每次运行都可能不同（ASLR），而且标准只保证同一数组内元素的地址顺序，不保证不同变量之间的相对位置。本节的示例都只打印值和 `sizeof`，不打印地址。

## 常见错误

### 以为局部变量会被自动清零 [UB]
只有 BSS 区的对象才会在启动时清零。函数里的 `int x;` 在栈上，初值是不确定的；读它属于未定义行为，可能打印 0，也可能打印一个看起来"很合理"的垃圾值，换一次运行就变。

```c
int x;              /* 栈上，未初始化 */
printf("%d\n", x);  /* 未定义行为：不要用输出来证明"它就是 0" */
```

正确做法是声明时就初始化：`int x = 0;`。

### 以为 static 只影响作用域 [WA]
`static` 在函数内改变的是**存储期**：`static int calls;` 不在栈上，而是和数据区/BSS 区里的全局变量一样活到进程结束。把 `static` 理解成"私有全局变量"更准确：名字只在函数内可见，内存却一直存在。

### 修改字符串字面量 [UB]
`char *s = "hello"; s[0] = 'H';` 看起来只是改一个字符，但 `"hello"` 在只读数据区，所在内存页被标记为只读，写入通常会触发访问违例（判 `RE`）。即使某些平台能写，标准也规定修改字符串字面量是未定义行为。要修改就复制到可写数组：`char s[] = "hello";`。

### 以为 const 局部变量在只读区 [WA]
`const int x = 3;` 写在函数里时，`x` 仍然在栈上；`const` 只是告诉编译器"不许通过这个名字修改"，并不改变存储位置。文件作用域的 `const` 对象才通常被放进只读数据区。反过来，用强制类型转换绕过 `const` 去写一个真正的只读对象，同样是未定义行为。

## 客观题

### q-s5-memory-layout-1 single
关于 C 程序的内存布局，下面哪一种说法是正确的？

- [x] 未初始化的全局变量在 BSS 区，进程启动时被清零；已初始化的全局变量在数据区。
  > 正确。BSS 区专门存放"初值为 0 或没有初值"的全局/静态对象，加载器会把整块内存清零，而且它不占可执行文件的体积；写了非零初值的全局对象则放进数据区，内容需要存进文件。
- [ ] 函数里的局部变量都在 BSS 区，因为函数可能被多次调用。
  > 错。函数里的普通局部变量在栈上，每次调用都会重新创建，函数返回时随栈帧一起销毁。只有加了 `static` 的局部变量才在 BSS 区或数据区，并且只初始化一次。
- [ ] `malloc` 得到的内存在栈上，函数返回时会自动释放。
  > 错。`malloc` 返回的是堆内存，和函数栈帧无关；函数返回后它仍然有效，必须显式 `free`。忘记 `free` 就是内存泄漏。
- [ ] 字符串字面量 `"hello"` 存放在栈上，所以可以通过指针修改它的字符。
  > 错。字符串字面量在只读数据区，不在栈上；通过指针修改它是未定义行为，通常会因为只读页而崩溃。栈上放的只是那个指向字面量的指针变量。
