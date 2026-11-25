---
id: s5-memory-leak
---

## 讲解

### 泄漏的定义：不是"忘了 free"，而是"找不到能 free 的指针"

`free(p)` 归还的是 `p` 指向的那块内存。只要还有一个指针保存着那个地址，这块内存就随时可以归还；反过来，**当最后一个保存该地址的指针被覆盖、被置空、或者随着栈帧一起消失时，这块内存就再也回不来了**——它仍然被分配器标记为"已占用"，却没有任何代码能访问或释放它。这就是内存泄漏。

所以判断泄漏不能只看"有没有写 free"，而要看"**归还的那一刻，还有没有指针拿得到这个地址**"。这解释了三种看起来不同、本质相同的情形：

| 情形 | 代码形态 | 为什么泄漏 |
|---|---|---|
| 提前返回 | `if (出错) return -1;` 跳过了后面的 `free` | 函数退出时，局部指针随栈帧消失，地址彻底丢失 |
| 覆盖指针 | `p = malloc(...)` 又一次，没先 `free` 旧块 | 旧地址被新地址覆盖，旧块再无从定位 |
| 只释放外层 | 链表只 `free(head)` | 每个节点是独立的一次 `malloc`，`head` 只覆盖第一个 |

### 最朴素的检测手段：数一数分配与释放

堆是"成对操作"的资源：每一次成功的 `malloc/calloc/realloc` 都必须对应恰好一次 `free`。所以在自己的代码里包一层计数，就能在程序结束时算出"还有多少块没归还"：

```c run id=leak-count
#include <stdio.h>
#include <stdlib.h>

/* 用计数器观察分配/释放是否配平：最朴素也最有效的泄漏检测 */
static int alloc_count = 0;
static int free_count = 0;
static size_t live_bytes = 0;

static void *track_malloc(size_t n) {
    void *p = malloc(n);
    if (p != NULL) {
        alloc_count++;
        live_bytes += n;
    }
    return p;
}

/* 申请一块 n 个 int 的直方图并清零，所有权交给调用者 */
static int *make_histogram(int n) {
    int *h = track_malloc((size_t)n * sizeof *h);
    if (h == NULL) {
        return NULL;
    }
    for (int i = 0; i < n; i++) {
        h[i] = 0;
    }
    return h;                          /* 谁调用谁负责释放：约定写在这里 */
}

int main(void) {
    int *h = make_histogram(6);
    if (h == NULL) {
        return 0;
    }
    h[2] += 1;
    h[4] += 3;
    printf("直方图：第 2 格 = %d，第 4 格 = %d\n", h[2], h[4]);

    /* 这里少了一句 free(h)：块还在，但函数一返回 h 就消失了 */

    printf("结束时 alloc=%d free=%d，还没归还的字节 = %zu\n",
           alloc_count, free_count, live_bytes);
    return 0;
}
```
```output
直方图：第 2 格 = 1，第 4 格 = 3
结束时 alloc=1 free=0，还没归还的字节 = 24
```

`alloc=1 free=0` 就是泄漏的信号：净差 1 块、24 字节（6 个 `int`）。只要在 `printf` 之前补一句 `free(h);`，输出就变成 `alloc=1 free=1，还没归还的字节 = 0`。**计数法的价值在于它不依赖工具**：把这两个计数器常驻在调试构建里，跑一遍主流程就能看到差值，定位到"哪一类操作不配平"。

### 提前 return：泄漏最常见的来源

一个函数里有多个出口时，只要有一个出口忘了释放，就会泄漏。而且这种 bug 往往只在**错误路径**上触发，正常测试根本走不到：

```c run id=leak-early-return
#include <stdio.h>
#include <stdlib.h>

static int alloc_count = 0;
static int free_count = 0;
static size_t live_bytes = 0;

static void *track_malloc(size_t n) {
    void *p = malloc(n);
    if (p != NULL) {
        alloc_count++;
        live_bytes += n;
    }
    return p;
}

static void track_free(void *p, size_t n) {
    if (p != NULL) {
        free_count++;
        live_bytes -= n;
    }
    free(p);
}

/* 先把数组复制一份再求和；遇到负数就提前结束 —— 但提前 return 跳过了释放 */
static long long sum_positive(const int *a, int n) {
    size_t bytes = (size_t)n * sizeof *a;
    int *copy = track_malloc(bytes);
    if (copy == NULL) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        copy[i] = a[i];
    }

    long long total = 0;
    for (int i = 0; i < n; i++) {
        if (copy[i] < 0) {
            return 0;                  /* 泄漏点：copy 还活着，指针却随栈帧一起没了 */
        }
        total += copy[i];
    }

    track_free(copy, bytes);           /* 只有"全部非负"这一条路径会走到这里 */
    return total;
}

int main(void) {
    int clean[] = {3, 1, 4};
    int dirty[] = {3, -1, 4};

    printf("全非负：%lld\n", sum_positive(clean, 3));
    printf("含负数：%lld\n", sum_positive(dirty, 3));
    printf("结束时 alloc=%d free=%d，还没归还的字节 = %zu\n",
           alloc_count, free_count, live_bytes);
    return 0;
}
```
```output
全非负：8
含负数：0
结束时 alloc=2 free=1，还没归还的字节 = 12
```

两次调用里有一次走了提前返回，于是 2 次分配只配了 1 次释放，差值 12 字节（3 个 `int`）。**只要输入里出现一个负数就会泄漏**——这正是这类 bug 在生产环境里"偶发"的原因：测试数据都是干净的，线上数据不是。

### 修法：把释放集中到唯一出口

对"多出口"的函数，最省心的写法是**只保留一个 return**：出错时记下结果、`break` 出循环，然后统一释放：

```c run id=leak-fixed
#include <stdio.h>
#include <stdlib.h>

static int alloc_count = 0;
static int free_count = 0;
static size_t live_bytes = 0;

static void *track_malloc(size_t n) {
    void *p = malloc(n);
    if (p != NULL) {
        alloc_count++;
        live_bytes += n;
    }
    return p;
}

static void track_free(void *p, size_t n) {
    if (p != NULL) {
        free_count++;
        live_bytes -= n;
    }
    free(p);
}

static long long sum_positive(const int *a, int n) {
    size_t bytes = (size_t)n * sizeof *a;
    int *copy = track_malloc(bytes);
    if (copy == NULL) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        copy[i] = a[i];
    }

    long long total = 0;
    for (int i = 0; i < n; i++) {
        if (copy[i] < 0) {
            total = 0;                 /* 只记结果，不在这里 return */
            break;
        }
        total += copy[i];
    }

    track_free(copy, bytes);           /* 唯一的释放点：所有路径都经过这里 */
    return total;
}

int main(void) {
    int clean[] = {3, 1, 4};
    int dirty[] = {3, -1, 4};

    printf("全非负：%lld\n", sum_positive(clean, 3));
    printf("含负数：%lld\n", sum_positive(dirty, 3));
    printf("结束时 alloc=%d free=%d，还没归还的字节 = %zu\n",
           alloc_count, free_count, live_bytes);
    return 0;
}
```
```output
全非负：8
含负数：0
结束时 alloc=2 free=2，还没归还的字节 = 0
```

结果一模一样，计数器却配平了。这就是"统一出口"的价值：**释放逻辑只有一处，新增一条错误路径时不会再漏**。

### 覆盖指针：把唯一的路标弄丢了

另一种泄漏更隐蔽——不是没写 `free`，而是写在了错误的位置，让指针在释放之前就被覆盖了：

```c run id=leak-overwrite
#include <stdio.h>
#include <stdlib.h>

static int alloc_count = 0;
static int free_count = 0;
static size_t live_bytes = 0;

static void *track_malloc(size_t n) {
    void *p = malloc(n);
    if (p != NULL) {
        alloc_count++;
        live_bytes += n;
    }
    return p;
}

static void track_free(void *p, size_t n) {
    if (p != NULL) {
        free_count++;
        live_bytes -= n;
    }
    free(p);
}

int main(void) {
    int *p = track_malloc(4 * sizeof *p);    /* 第一块：16 字节 */
    if (p == NULL) {
        return 0;
    }
    p[0] = 1;

    p = track_malloc(8 * sizeof *p);         /* 第二块：32 字节，把第一块的地址覆盖了 */
    if (p == NULL) {
        return 0;
    }
    p[0] = 2;

    track_free(p, 8 * sizeof *p);            /* 只归还了第二块 */
    printf("结束时 alloc=%d free=%d，还没归还的字节 = %zu\n",
           alloc_count, free_count, live_bytes);
    return 0;
}
```
```output
结束时 alloc=2 free=1，还没归还的字节 = 16
```

两次分配、一次释放，净差 16 字节——正好是第一块的大小。`p[0] = 1` 那次写入的数据还在堆上，但程序里再没有任何变量保存它的地址，`free` 也就无从谈起。**分配器不会因为你"不要了"就自动回收**：它只认 `free`。

结论很简单，也很值得记：给同一个指针连续 `malloc` 两次而不先 `free`，第一块必然泄漏；要"换一块更大的"，正确做法是先把旧块归还（或者用上一节的 `realloc` 安全模式）。

### 这四种成因的共同点

提前 return、覆盖指针、只释放容器、循环里漏释放——表面上是四种 bug，本质只有一条：**在某个时刻，某块内存失去了"最后一个能定位它的指针"，而它还没有被 `free`**。所以排查泄漏时不要盯着 `free` 找，要盯着**指针的生命周期**看：

1. 这块内存在哪里被分配？所有权交给了谁？
2. 那个"谁"有没有被覆盖、被提前销毁、被只释放了一部分？
3. 所有可能的出口（包括错误路径、`break`、`continue`、`goto`）是否都能走到释放点？

把这三个问题在每一处 `malloc` 旁边回答一遍，比事后用工具追查便宜得多。

### 内存里发生了什么

一次"提前 return"的泄漏发生后，堆与栈的关系（地址为示意）：

```memory title="sum_positive 提前返回之后（地址为示意）"
地址 | 内容 | 属于 | 说明
0x7fd8 | 0x2000 | 局部变量 copy 的栈槽（已失效） | 函数返回后这块栈内存被复用，地址值不再存在
0x2000 | 3 | 堆块（3 个 int，12 字节） | 内容完好，却没有任何活着的指针保存 0x2000
0x2004 | -1 | 堆块 | 触发提前返回的那个元素
0x2008 | 4 | 堆块 | 再也不会被读到
0x3100 | （任意） | 分配器手里的另一块空闲内存 | 空闲块下次会被重新分出去，泄漏块永远不会
```

最后一行是关键：泄漏不是"被别的变量占着"，而是"分配器认为它已被占用、程序却再也访问不到"。下次 `malloc` 时分配器宁可从别处找新页，也不会动这块——所以泄漏只会不断累积，不会自愈。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra -g -fsanitize=address,undefined leak.c -o leak
./leak
```

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=address,undefined leak.c -o leak
./leak
```

说明：

- **`-fsanitize=address`**：抓越界、释放后使用、重复释放；它在 Windows 上**不**报泄漏（LeakSanitizer 只有 Linux/macOS 版本）；
- **计数法**：像本节示例那样包一层 `track_malloc/track_free`，在程序结束时打印差值，是最可控的办法；
- **平台泄漏检查**：本平台的判题器在链接期用 `--wrap=malloc,free,realloc,...` 把分配函数换成包装版本，程序结束时统计所有未归还的块，并把分配位置还原成"文件:行号"。要求检查泄漏的题目，输出正确但没释放干净会判 `LEAK`；
- **Valgrind**（Linux）：`valgrind --leak-check=full ./leak` 能给出每块泄漏内存的分配调用栈，是 Linux 下最常用的手段。

## 常见错误

### 只在成功路径上释放，错误路径直接 return [LEAK]
"正常结束"的分支写了 `free`，"读文件失败""遇到非法数据"的分支直接 `return`——测试数据干净时完全看不出来，一上真实数据就泄漏。统一出口（单 `return` + 集中释放）是唯一可靠的修法。

### 指针被覆盖，旧块再也找不到 [LEAK]
`p = malloc(...)` 又写一次，或者 `p = realloc(p, ...)` 失败后覆盖，旧块的地址就消失了。分配器不会自动回收"没人指向"的块，只会把它标记为已占用；释放前先想清楚"这里还有别的地方能拿到这个地址吗"。

### 只释放了容器，没释放容器里的元素 [LEAK]
一个 `char **lines`，每行都是独立 `malloc` 出来的：只 `free(lines)` 会泄漏所有行。释放必须**由内而外**——先逐个释放元素，再释放容器本身。链表同理：只 `free(head)` 会泄漏后面所有节点。

```c
/* 错误：只归还了指针数组 */
free(lines);

/* 正确：先归还每个元素，再归还容器 */
for (int i = 0; i < n; i++) {
    free(lines[i]);
}
free(lines);
lines = NULL;
```

### 以为"程序马上要退出了，泄漏没关系" [LEAK]
对一次性脚本确实无关紧要，但对长期运行的服务、循环处理请求的程序，泄漏会持续累积直到 `malloc` 开始失败。而且题目和真实工程里，"退出前的那一次泄漏"往往只是**同一个 bug 在别处**的第一次显形。养成配平的习惯，比事后排查便宜得多。

## 客观题

### q-s5-memory-leak-1 single
下面四种写法里，**不会**造成内存泄漏（即那块堆内存最终能被正常归还）的是哪一个？

- [x] `int *a = malloc(10 * sizeof *a); int *b = a; free(b);`
  > 正确。堆上只有**一块**内存，`a` 和 `b` 保存的是同一个地址。`free(b)` 归还的就是这块内存，所以没有泄漏——虽然之后 `a` 变成悬垂指针，直接用它就是"释放后使用"，但那已经是另一个问题了。判断泄漏看的是"内存有没有被归还"，不是"有没有多余的指针"。
- [ ] 函数里 `int *buf = malloc(n);` 之后，遇到非法输入就 `return -1;`，跳过了 `free(buf)`
  > 错。这是最典型的泄漏：`buf` 是局部变量，函数返回时它的栈槽就失效了，堆上那块内存从此没有任何指针能定位，分配器却仍认为它被占用。只要错误路径存在，这条路径每走一次就漏一块。
- [ ] `p = malloc(16); p = malloc(32); free(p);`
  > 错。第二行把 `p` 里第一块的地址覆盖掉了，第一块的 16 字节再也找不到（分配器不会因为"没人指向"自动回收）。最后的 `free(p)` 只归还了第二块，净泄漏 16 字节。
- [ ] 链表有 100 个节点，每个节点都是 `malloc` 出来的，程序结束时只写了 `free(head);`
  > 错。`head` 只指向第一个节点；`free(head)` 只归还了第一个节点这一块内存，其余 99 个节点的地址随着 `head` 的消失而丢失。链表必须从头到尾逐个 `free`，顺序还要反过来（先保存 `next` 再释放当前节点）。
