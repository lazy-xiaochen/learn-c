---
id: s5-malloc-free
---

## 讲解

### malloc 到底做了什么
`malloc` 的声明在 `<stdlib.h>` 里：

```c
void *malloc(size_t size);
```

它只接受一个参数：**字节数**。不是元素个数，也不是"int 的个数"。成功时返回一块至少 `size` 字节、对齐足够供任何基本类型使用的内存；失败时返回 `NULL`。返回类型是 `void *`，在 C 里可以隐式转换成任何对象指针，所以不需要写强制转换。

`malloc` 返回的内存有三个必须记住的性质：

1. **内容未初始化**。里面可能是上一次释放留下的数据，也可能是全新的零页，标准不保证任何值；
2. **大小由你算**。`malloc(10)` 是 10 字节，不是 10 个 `int`；要 10 个 `int` 必须写 `10 * sizeof(int)`；
3. **必须配对释放**。每个成功的 `malloc` 都要有且只有一个 `free`，否则泄漏；释放后不能再访问。

最常用的写法是让 `sizeof` 自己推导元素类型：

```c
int *a = malloc(n * sizeof *a);      /* sizeof *a 就是 sizeof(int) */
```

这样即使以后把 `int` 改成 `long long`，`sizeof *a` 也会自动跟着变，不会出现"申请了 n 个 int 的字节数，却按 long long 来写"的错误。

从内存上看，`malloc` 返回的指针并不指向块的开头，而是指向块头之后的用户数据区：

```memory title="malloc 返回的堆块与栈上的指针（地址为示意）"
位置 | 内容 | 说明
块头 | 大小、状态、链表指针 | 分配器靠它找到整块并回收；学习者不应该读写这里
p → | 用户数据第 1 字节 | 你申请到的 n * sizeof *p 字节从这里开始
中间 | 用户数据 | 越界写会踩坏后面的块头或红区
块尾 | 下一个块头或保护字节 | free(p) 时分配器靠块头还原整块大小
栈上的 p | 堆块地址 | 指针变量本身在栈上，和堆块是两回事
```

下面是一个完整的申请、使用、释放流程：

```c run id=mf-basic
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n = 5;
    int *a = malloc((size_t)n * sizeof *a);   /* 5 个 int 的字节数 */
    if (a == NULL) {                          /* 申请失败必须处理 */
        printf("allocation failed\n");
        return 1;
    }

    for (int i = 0; i < n; i++) {
        a[i] = (i + 1) * 10;                  /* malloc 不初始化，先写再用 */
    }

    long long sum = 0;
    for (int i = 0; i < n; i++) {
        sum += a[i];
    }
    printf("n=%d sizeof(int)=%zu sum=%lld\n", n, sizeof(int), sum);

    free(a);                                  /* 与 malloc 配对 */
    a = NULL;                                 /* 防止后面误用 */
    printf("freed\n");
    return 0;
}
```
```output
n=5 sizeof(int)=4 sum=150
freed
```

`a` 这个指针变量本身在栈上，它指向的 20 字节在堆上。`free(a)` 释放的是堆上的块，不会把栈上的指针变量 `a` 变成 `NULL`；所以释放后立刻写 `a = NULL;` 是一个好习惯，能让"释放后误用"尽早暴露成空指针解引用，而不是悄悄读写已经归还给分配器的内存。

### 为什么必须检查 NULL
`malloc` 失败时返回 `NULL`。这不是"几乎不会发生"的理论情况：请求的字节数超过进程可用内存、地址空间碎片化到找不到连续块、嵌入式设备内存耗尽，都会让它失败。32 位程序申请超过 2GB 的块几乎必然失败；64 位程序也可能因为系统限制或 overcommit 策略失败。

不检查 `NULL` 的后果是**空指针解引用**：

```c
int *p = malloc(1000000000);   /* 1GB，可能失败 */
p[0] = 1;                      /* 若 p 为 NULL：未定义行为，通常崩溃 */
```

标准没有规定"解引用空指针一定崩溃"，但这是最常见的表现（本平台判 `RE`）。更糟的是，在开启优化的编译器眼里，"对空指针解引用"本身就是未定义行为，编译器可以据此删掉后面的判空分支。所以判空必须**紧跟在申请之后**，不能先使用再检查。

除了检查 `NULL`，还要检查**字节数本身有没有算错**。`malloc(n * sizeof *a)` 里的乘法是在 `size_t` 上做的，如果 `n` 来自不可信输入、又非常大，乘法可能回绕成一个很小的数：

```c
size_t n = SIZE_MAX / 4 + 1;
size_t bytes = n * sizeof(int);      /* 回绕，可能变成 0 */
int *p = malloc(bytes);              /* 申请到一块很小的内存 */
/* 后面按 n 个 int 去写，就会越界 */
```

处理不可信的大小时，先判断再乘：

```c
if (n > SIZE_MAX / sizeof *p) {
    /* 字节数会溢出，直接报错，不要调用 malloc */
}
```

### free 的规则：一次申请对应一次释放
`free` 的声明同样在 `<stdlib.h>`：

```c
void free(void *ptr);
```

它接受的指针必须满足下面之一：

- `NULL`：`free(NULL)` 是**安全且无操作**的，标准明确允许；
- `malloc` / `calloc` / `realloc` 返回过、且还没有被释放的指针。

其他任何指针都不能传给 `free`：指向栈变量的指针、数组中间某个元素的指针、已经释放过的指针，都是未定义行为。`free` 只归还整块内存，不能只释放数组的一半。

`free` 之后，指针变量里仍然保存着旧地址，这个指针叫**悬垂指针**。再次解引用或再次 `free` 都是未定义行为；不同运行库的表现不同，可能崩溃，也可能悄悄破坏分配器的空闲链表，直到很久以后才在无关的地方爆炸。

下面演示"两个指针指向同一块内存"时如何只释放一次。`alias` 和 `name` 是两块不同的指针变量，但指向同一个堆块；释放一次之后，两个指针都必须置空：

```c run id=mf-ownership
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static char *copy_text(const char *src) {
    size_t n = strlen(src) + 1;
    char *p = malloc(n);
    if (p == NULL) {
        return NULL;
    }
    memcpy(p, src, n);
    return p;
}

int main(void) {
    char *name = copy_text("malloc");
    if (name == NULL) {
        return 1;
    }

    char *alias = name;          /* 别名：两个指针，一块堆内存 */
    printf("name=%s alias=%s\n", name, alias);

    free(alias);                 /* 只释放一次 */
    name = NULL;
    alias = NULL;                /* 两个指针都置空，避免误用 */
    printf("freed once\n");
    return 0;
}
```
```output
name=malloc alias=malloc
freed once
```

如果对 `name` 和 `alias` 各 `free` 一次，就是**重复释放**（double free），属于未定义行为。分配器通常会在第二次 `free` 时检测到并中止程序，但这不能依赖。

### 一个完整的模板：申请、检查、使用、释放
把上面的规则合起来，可以写成这个固定模板。它看起来啰嗦，但每一行都在防一类真实发生过的 bug：

```c run id=mf-template
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    size_t n = 4;
    int *p = malloc(n * sizeof *p);
    if (p == NULL) {                 /* 1. 申请后立刻检查 */
        return 1;
    }

    for (size_t i = 0; i < n; i++) { /* 2. 先写再用：malloc 不清零 */
        p[i] = (int)(i + 1);
    }
    printf("p[0]=%d p[3]=%d\n", p[0], p[3]);

    free(p);                         /* 3. 退出前释放，且只释放一次 */
    p = NULL;                        /* 4. 置空，防止悬垂 */
    printf("done\n");
    return 0;
}
```
```output
p[0]=1 p[3]=4
done
```

`free(NULL)` 在这里也顺便演示一下：即使 `p` 本来就是 `NULL`，调用 `free(p)` 也不会出错，所以"统一在函数末尾释放"的写法不需要额外判空：

```c
free(p);          /* p 为 NULL 时安全无操作 */
p = NULL;
```

**谁申请，谁释放。** 一块堆内存的"所有权"必须在函数之间说清楚。常见的约定有三种：

- **函数申请并返回指针**：调用者负责释放（例如 `copy_text`）；
- **调用者传入缓冲区**：函数只写，不释放，缓冲区由调用者管理；
- **函数内部申请并在返回前释放**：外部看不到这块内存。

最危险的是"函数申请了、返回了、但没人记得释放"——指针一丢失，这块内存就再也找不回来了。写代码时每出现一个 `malloc`，就应该同时想好它的 `free` 在哪里。

## 编译与运行

用 gcc 或 clang 编译：

```bash
gcc -std=c17 -Wall -Wextra malloc_free.c -o malloc_free
./malloc_free
```

```bash
clang -std=c17 -Wall -Wextra malloc_free.c -o malloc_free
./malloc_free
```

排查堆错误时，建议打开 AddressSanitizer：

```bash
clang -std=c17 -Wall -Wextra -fsanitize=address,undefined malloc_free.c -o malloc_free
./malloc_free
```

- 访问已经 `free` 的内存（use-after-free）→ ASan 报 `heap-use-after-free`；
- 重复释放 → ASan 报 `attempting double-free`；
- 越界写堆块 → ASan 报 `heap-buffer-overflow`。

本平台判题时还会跟踪 `malloc` / `free` 的配对；如果题目要求检查泄漏，输出正确但结束时仍有未释放的块会判 `LEAK`。练习时不要只看"程序跑完了"，要确认每条申请路径都有对应的释放路径，包括 `scanf` 失败、提前 `return` 这些分支。

## 常见错误

### 不检查 malloc 的返回值 [RE]
`malloc` 可能返回 `NULL`。直接写 `p[0] = 1;` 就是空指针解引用，通常表现为程序崩溃。正确写法是申请后立刻判断，失败就清理并返回。

```c
int *p = malloc(n * sizeof *p);
p[0] = 1;                  /* 错：p 可能为 NULL */
```

### 把 malloc 的内存当成已经清零 [UB]
`malloc` 不初始化内存，读它得到的是不确定值；读未初始化的值是未定义行为，不是"读到 0"。需要清零就用 `calloc` 或 `memset`，或者先写后读。

```c
int *p = malloc(10 * sizeof *p);
printf("%d\n", p[0]);      /* 错：p[0] 还没有赋值 */
```

### free 后继续使用，或者重复释放 [UB]
`free(p)` 之后 `p` 仍然是原来的地址，但内存已经归还。`printf("%d", p[0]);`、`p[0] = 1;`、再次 `free(p);` 都是未定义行为。释放后马上 `p = NULL;`，让误用变成可预测的空指针错误。

```c
free(p);
printf("%d\n", p[0]);      /* 错：use-after-free */
free(p);                   /* 错：double free */
```

### 用 sizeof 指针或写死字节数 [WA]
`malloc(n * sizeof(int *))` 申请的是 n 个指针的字节数，不是 n 个 `int` 的字节数；在 64 位平台上指针是 8 字节，会多申请一倍，而在某些平台上又可能刚好相等，让错误隐藏起来。统一写 `malloc(n * sizeof *p)`，让编译器替你算。

## 客观题

### q-s5-malloc-free-1 single
下面哪种 `malloc` / `free` 用法是正确的？

- [x] `int *p = malloc(n * sizeof *p); if (p == NULL) { return 1; } /* 使用 p */ free(p); p = NULL;`
  > 正确。`sizeof *p` 按元素类型计算字节数，申请后立刻检查 `NULL`，使用完只释放一次，并把指针置空避免悬垂。这是最完整的固定模板。
- [ ] `int *p = malloc(n); if (p == NULL) { return 1; } /* 把 p 当成 n 个 int 使用 */ free(p);`
  > 错。`malloc(n)` 只申请 n 个字节，而代码按 n 个 int（4n 字节）去写，会越界写堆内存。应该写 `malloc(n * sizeof *p)`。
- [ ] `int *p = malloc(n * sizeof *p); p[0] = 1; free(p); printf("%d\n", p[0]);`
  > 错。`free(p)` 之后 `p[0]` 已经失效，再读它是 use-after-free，属于未定义行为。释放后不应再访问，最好同时写 `p = NULL;`。
- [ ] `int *p = malloc(n * sizeof *p); free(p); free(p);`
  > 错。第二次 `free(p)` 是重复释放，属于未定义行为，可能破坏分配器或直接崩溃。每个成功的申请只能释放一次。
