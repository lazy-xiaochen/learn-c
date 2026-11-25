---
id: s7-iv-memory-layout
---

## 讲解

面试里问"C 程序的内存布局"，考的不是背五个区的名字，而是**能不能把"这个变量住哪、活多久"讲成一条推理链**。下面先给口述版（面试现场直接说），再给代码版（面试官说"你验证一下"时动手写）。

### 口述版答案
**开场一句话（10 秒）**：一个 C 进程的虚拟地址空间分成代码段、只读数据区、已初始化数据区（`.data`）、未初始化数据区（`.bss`）、堆和栈；"住哪"由**定义位置 + 存储类别**决定，"活多久"由**存储期**决定。

**五个区，每个区三件事（存什么 / 活多久 / 谁管）**：

1. **代码区 `.text`**：机器指令；进程全程；只读、可执行，改它会被操作系统拦下来。
2. **只读数据区 `.rodata`**：字符串字面量、文件作用域的 `const` 对象；进程全程；只读。
3. **`.data`**：**有非零初值**的全局变量和 `static` 变量；进程全程；启动时由加载器按文件里的内容填好。
4. **`.bss`**：**没有初值或初值为 0** 的全局变量和 `static` 变量；进程全程；启动时整体清零，**且不占可执行文件的体积**。
5. **堆**：`malloc` / `calloc` / `realloc` 得到的块；从分配到 `free`；向高地址增长，用完必须还。
6. **栈**：局部变量、函数参数、返回地址；函数返回即销毁；向低地址增长，自动分配、自动回收。

**三个必答判断（面试官最爱在这三处追问）**：

- **全局变量**：有非零初值 → `.data`；没有初值或初值为 0 → `.bss`；加了 `const` → 通常进 `.rodata`。
- **函数里的变量**：没写 `static` → 栈；写了 `static` → `.data` / `.bss`，**只初始化一次，函数返回后不销毁**。
- **指针和它指向的东西分居两处**：`char *p = "abc";` 中 `p` 本身在栈上，`"abc"` 的 4 个字节在只读区。

**两个加分点（说出来就比背表格高一档）**：

- `.bss` 单独存在的理由是**省文件体积**：`int a[100000];` 在可执行文件里几乎不占字节，`int b[100000] = {1};` 因为有一个非零初值，400KB 全都要存进文件。
- **不要用打印地址来证明布局**：地址每次运行都可能变（ASLR），标准也只保证同一数组内元素的地址顺序，不保证不同对象之间的相对位置。能讲清楚的是**语义**——生命周期、可写性、谁负责释放——不是具体地址。

**一句收尾**：所以判断"这个对象还能不能用"，只看它所在的那块存储还在不在：栈对象看函数有没有返回，堆对象看有没有被 `free`，另外三个区一直活到进程结束。

### 口述版：被追问时怎么接
- 追问"局部 `const` 在哪？"→ 答：**还在栈上**。`const` 是"不许通过这个名字改"，不是存储类别；只有文件作用域的 `const` 对象才通常被放进 `.rodata`。
- 追问"`static` 改变的是作用域还是生命周期？"→ 答：**函数内 `static` 改变生命周期（从自动变成静态），文件作用域 `static` 改变链接属性（外部变内部）**；两处都只有"一份"。
- 追问"栈和堆的本质区别？"→ 答：**分配方式**（挪栈指针 vs 走分配器）、**生命周期**（函数返回 vs `free`）、**大小上限**（MB 级 vs 可用内存）、**碎片**（无 vs 有）。
- 追问"进程的栈为什么向低地址增长？"→ 答：历史约定，让栈和堆从地址空间两端相向生长，中间的空闲区最大；**回答"历史原因 + 空间利用"就够，不必编造更深的原因**。

### 代码版答案
面试官说"你验证一下"时，**不要打印地址**（地址不可复现，而且比较不同对象的地址在标准层面没有意义）。正确做法是把每条结论变成一个**可观察、可复现的事实**，用值和 `sizeof` 说话。下面四段代码分别对应四条结论，面试时写其中一段即可。

**结论 1：`.bss` 启动清零，函数内 `static` 只初始化一次、跨调用保留。**

```c run id=ml2-regions
#include <stdio.h>

int g_init = 100;       /* .data：有非零初值 */
int g_zero;             /* .bss：没有初值，加载时清零 */

static int next_id(void) {
    static int id;      /* .bss：函数返回不销毁，只初始化一次 */
    id++;
    return id;
}

int main(void) {
    printf("g_init=%d g_zero=%d\n", g_init, g_zero);
    for (int i = 0; i < 3; i++) {
        printf("next_id=%d\n", next_id());
    }
    return 0;
}
```
```output
g_init=100 g_zero=0
next_id=1
next_id=2
next_id=3
```

`g_zero` 没写初值却打印 0，不是编译器"顺手初始化"，而是**加载器把整个 `.bss` 清零**。`next_id` 里的 `id` 每次都从上次的值继续加，说明它不在 `next_id` 的栈帧里——如果它真是普通局部变量，三次都会打印 1。

**结论 2：函数返回后堆块仍然有效，栈对象则随栈帧消失。**

```c run id=ml2-lifetime
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
    return p;                     /* 函数返回，堆块仍然有效 */
}

int main(void) {
    char stack_buf[] = "stack";   /* 栈：main 返回时消失 */
    char *heap_buf = copy_text(stack_buf);
    if (heap_buf == NULL) {
        return 1;
    }
    printf("stack=%s heap=%s\n", stack_buf, heap_buf);
    printf("sizeof stack_buf=%zu\n", sizeof stack_buf);
    free(heap_buf);               /* 堆：必须显式归还 */
    heap_buf = NULL;
    printf("heap freed, pointer is %s\n", heap_buf == NULL ? "NULL" : "dangling");
    return 0;
}
```
```output
stack=stack heap=stack
sizeof stack_buf=6
heap freed, pointer is NULL
```

`copy_text` 里的 `p` 是个局部变量，函数返回时它自己没了，但**它指向的那块堆内存还在**，所以 `main` 里还能读到 `"stack"`。反过来说，如果 `copy_text` 返回的是 `stack_buf` 的地址，函数一返回那块栈内存就失效了——这是最经典的悬垂指针来源。最后 `free` 后立刻置 `NULL`，是"防止误用"的成本最低的写法。

**结论 3：字符串字面量在只读区，字符数组在栈上，两者 `sizeof` 完全不同。**

```c run id=ml2-rodata
#include <stdio.h>

int main(void) {
    const char *lit = "hello";   /* 指针在栈上，字符在 .rodata */
    char arr[] = "hello";        /* 6 个字节全在栈上，可写 */

    printf("sizeof lit=%zu sizeof arr=%zu\n", sizeof lit, sizeof arr);
    arr[0] = 'H';                /* 数组可写 */
    printf("arr=%s lit=%s\n", arr, lit);
    return 0;
}
```
```output
sizeof lit=8 sizeof arr=6
arr=Hello lit=hello
```

`sizeof lit` 是 8（本平台指针宽度），`sizeof arr` 是 6（5 个字符加结尾的 `'\0'`）——**同一个字符串字面量，两边看到的东西根本不是一回事**。`arr[0] = 'H'` 合法，因为它改的是自己栈上那份副本；如果写 `((char *)lit)[0] = 'H'`，改的就是只读区的字符串字面量，行为未定义，本平台通常会因为只读页直接崩溃。

**结论 4：每层递归都有自己的栈帧，`static` 变量只有一份。**

```c run id=ml2-frames
#include <stdio.h>

static int total_calls;          /* .bss：全程一份 */

static void walk(int n) {
    int local = n * 10;          /* 栈：每层调用各一个 */
    total_calls++;               /* 六层共享同一个 */
    printf("enter %d local=%d calls=%d\n", n, local, total_calls);
    if (n > 1) {
        walk(n - 1);
    }
    printf("leave %d local=%d calls=%d\n", n, local, total_calls);
}

int main(void) {
    walk(3);
    printf("total_calls=%d\n", total_calls);
    return 0;
}
```
```output
enter 3 local=30 calls=1
enter 2 local=20 calls=2
enter 1 local=10 calls=3
leave 1 local=10 calls=3
leave 2 local=20 calls=3
leave 3 local=30 calls=3
total_calls=3
```

三层调用各有自己的 `local`，它们同时存在、互不干扰；`total_calls` 只有一个，所以六行里一直在累加。`leave` 阶段 `local` 还能打印回原来的值，说明那层栈帧在函数真正返回之前一直有效——"栈帧在返回时整体消失"是**返回之后**的事。

把四段代码的结论压缩成一张表，面试时可以直接照着说：

| 观察到的现象 | 说明的问题 |
|---|---|
| 未初始化的全局变量打印 0 | `.bss` 在加载时被整体清零 |
| 函数内 `static` 三次打印 1、2、3 | 静态存储期，只初始化一次 |
| 函数返回后堆块内容仍可读 | 堆的生命周期与函数栈帧无关 |
| `sizeof` 指针是 8、`sizeof` 数组是 6 | 指针是"存地址的对象"，数组是"一串元素" |
| 递归里每层 `local` 不同、`static` 相同 | 栈按调用分配，静态区按程序分配 |

### 内存图：五个区各住着谁
下面把一段典型程序里所有对象一次性摆到地址空间里（地址只是示意，实际每次运行都不同）：

```memory title="一个 C 进程的地址空间（地址为示意）"
区域 | 典型内容 | 生命周期 | 权限
代码 .text | 函数的机器指令 | 进程全程 | 只读、可执行
只读 .rodata | 字符串字面量、const 全局对象 | 进程全程 | 只读
数据 .data | 有非零初值的全局变量和 static 变量 | 进程全程 | 可读写
BSS .bss | 零初始化或未初始化的全局变量和 static 变量 | 进程全程 | 可读写、启动清零
堆 heap | malloc 家族返回的块 | 分配到 free | 可读写、向高地址增长
栈 stack | 局部变量、参数、返回地址 | 函数返回即销毁 | 可读写、向低地址增长
```

再看同一时刻这些区里具体躺着什么，注意**指针变量和它指向的对象可以不在同一个区**：

```memory title="同一时刻五个区里躺着什么（地址为示意）"
地址 | 内容 | 变量 / 对象 | 所在区
0x404030 | 100 | g_init | .data
0x404038 | 0 | g_zero | .bss
0x404040 | 0 | next_id 的 static id | .bss
0x402000 | 'h' 'e' 'l' 'l' 'o' 0 | 字符串字面量 "hello" | .rodata
0x7ffd40 | 0x402000 | msg（指针本身） | 栈
0x7ffd48 | 7 | local | 栈
0x21a0000 | 0 | *heap（malloc 得到的 4 字节） | 堆
```

这张图是回答"它住哪"的完整依据：`g_init` 有非零初值所以在 `.data`；`g_zero` 和 `next_id` 的 `id` 没有初值所以在 `.bss`；`"hello"` 是字面量所以在 `.rodata`；`msg` 虽然指向只读区，它自己却住在栈上；`*heap` 在堆上，`heap` 这个指针变量仍然在栈上。

## 编译与运行

本平台使用 Clang（x86-64 Windows，UCRT），`gcc` 和 `clang` 的命令行都可用：

```bash
gcc -std=c17 -Wall -Wextra layout.c -o layout
./layout
```

```bash
clang -std=c17 -Wall -Wextra layout.c -o layout
./layout
```

想看各区的字节数，先只编译成目标文件，再用 `size` / `llvm-size` 看三列：

```bash
clang -std=c17 -Wall -Wextra -c layout.c -o layout.o
llvm-size layout.o
```

输出大致是三列（Windows 上 `llvm-size` 的列名与 GNU `size` 相同）：

```text
   text    data     bss     dec     hex filename
   1234     512  400000  401746   62152 layout.o
```

- `text`：代码区（通常把只读数据也算进来）；
- `data`：有非零初值的全局 / 静态对象的字节数；
- `bss`：零初始化对象的字节数，**不进文件，只进运行时的内存需求**。

三点提醒：

1. **优化会改变结论**：`-O2` 下编译器可能把只读的全局数组内联成立即数，或者把从不取地址的静态变量整个优化掉，所以"某次 `size` 的输出"不是语言层面的保证；
2. **不要打印地址证明布局**：不同对象之间的相对位置是实现细节，地址还受 ASLR 影响，示例代码只打印值和 `sizeof`；
3. 想看栈帧和区的真实落点，可以加 `-S` 生成汇编读一眼（`clang -O0 -S layout.c -o layout.s`），但**只把它当观察手段，不要写依赖它的程序**。

## 常见错误

### 以为函数里的 `const` 局部变量在只读区
`const` 修饰的是"不许通过这个名字修改"，不是存储位置。函数里的 `const int limit = 10;` 仍然在栈上，`const` 只影响编译器的检查。只有**文件作用域**的 `const` 对象才通常被放进 `.rodata`；而且用强制类型转换绕过 `const` 去写一个真正的只读对象，同样是未定义行为。

### 以为局部 `static` 变量会随函数返回销毁
`static` 在函数内改变的是**存储期**：`static int calls;` 从"每次调用重新创建"变成"整个进程只有一份"，函数返回后它还在。把它理解成"名字只在函数内可见的全局变量"最准确。反过来，以为它能被"重置"也是错的——它只在程序启动前初始化一次。

### 用打印地址的办法证明布局
`printf("%p", &x)` 得到的地址每次运行都可能不同，而且标准只保证同一数组内元素的地址顺序，**不同对象之间的相对位置没有任何保证**。面试时如果张口就是"栈地址一定比堆地址大"，很容易被追问到答不上来。要证明布局，应该用生命周期和可写性这些语义事实，或者用 `size` / `objdump` 这类工具看目标文件。

### 修改字符串字面量

```c
char *s = "hello";   /* 合法，但指向只读区 */
s[0] = 'H';          /* 未定义行为：本平台通常直接崩溃 */
```

字符串字面量的类型是 `char[]` 但**内容不可修改**，它住在只读数据区。要改就先复制到自己的数组（`char s[] = "hello";`）或堆上。这类代码在"能跑"的机器上跑一次不改，换个平台或换个优化级别就崩，属于典型的"能跑不等于正确"。

### 以为未初始化的局部变量是 0
只有 `.bss` 区的对象才在启动时被清零。函数里的 `int x;` 在栈上，初值不确定，读它是未定义行为——可能打印 0，也可能打印一个"看起来很合理"的垃圾值，换一次运行就变。声明时就初始化（`int x = 0;`）是唯一可靠的做法。

## 客观题

### q-s7-iv-memory-layout-1 single
关于 C 程序的内存布局与生命周期，下面哪一句是**正确**的？

- [x] 函数内的 `static int c;` 只初始化一次，函数返回后它仍然存在，和全局变量一样活到进程结束。
  > 正确。函数内的 `static` 把存储期从"自动"改成"静态"：对象住在 `.bss`（零初始化）或 `.data`（有非零初值），整个进程只有一份，函数返回不会销毁它。名字的可见范围仍然限于函数体，所以它是"名字私有、内存常驻"。
- [ ] 函数内的 `const int c = 1;` 因为带 `const`，所以被放进只读数据区。
  > 错。`const` 是类型限定符，表示"不许通过这个名字修改"，不改变存储位置。函数内的 `const` 局部变量仍在栈上；只有文件作用域的 `const` 对象才通常被放进只读数据区。
- [ ] 字符串字面量 `"hi"` 存放在栈上，所以 `char *p = "hi"; p[0] = 'H';` 是合法的。
  > 错。字符串字面量在只读数据区，不在栈上；栈上放的只是指针 `p`。通过 `p` 修改字面量是未定义行为，本平台通常会因为只读页触发访问违例而崩溃。要修改必须复制到 `char arr[] = "hi";`。
- [ ] `.bss` 区的变量要占用可执行文件的体积，因为它们的初值 0 必须存进文件。
  > 错。`.bss` 存在的意义恰恰是**不占文件体积**：文件头里只记录"运行时需要 N 字节、全部填 0"，由加载器映射零页。相比之下，`.data` 里对象的初值必须逐字节存进文件。
