---
id: s5-realloc
---

## 讲解

### realloc 只承诺三件事

`void *realloc(void *ptr, size_t size)` 的语义用三句话就能说完，但每一句都是一条必须记住的规则：

1. **成功时**：返回一个至少 `size` 字节的新块，内容是旧块的前 `min(旧大小, size)` 字节，**旧块同时被释放**——你不可以再用旧指针，也不可以再 `free` 旧指针；
2. **成功时可能搬家**：`realloc` 有两种实现路线，一种是在原块后面"就地扩展"（后面的堆空间刚好没被占用时），另一种是"另找一块、拷过去、把旧的还回去"。哪条路线由分配器决定，**你无法预知，也不该依赖**；
3. **失败时**：返回 `NULL`，并且**原块一个字节都没动**——既不释放、也不改内容。

第 3 条是"安全模式"的全部依据。很多人只记住"realloc 可能返回 NULL"，却忘了"失败时原块还在"，于是写出了下面这种把原块弄丢的代码。

### 为什么 `p = realloc(p, n)` 在失败时会丢指针

赋值表达式的求值顺序是"先把右边算完，再写回左边"。所以写成 `p = realloc(p, n)` 时：

1. 先把 `p` 的旧值传给 `realloc`；
2. `realloc` 失败，返回 `NULL`；
3. `p = NULL` 这一写，把**唯一指向原块的指针**覆盖掉了。

此时原块还在堆上、数据还在里面，但程序里再也没有任何变量记录它的地址——既读不到，也 `free` 不掉。这就是一次**内存泄漏**，而且是最难查的那种：发生条件（内存不足）在测试环境里几乎不出现，一上生产就偶发。

下面用"会失败的 realloc"把这条路径完整走一遍。真实的 `realloc` 在内存不足时返回 `NULL`、且不动原块，行为和这里的模拟完全一致：

```c run id=ra-lose
#include <stdio.h>
#include <stdlib.h>

/* 模拟一次"内存不足"：真实 realloc 失败时同样返回 NULL，且原块保持有效 */
static void *realloc_may_fail(void *old, size_t need, int fail) {
    if (fail) {
        return NULL;
    }
    return realloc(old, need);
}

int main(void) {
    size_t cap = 2;
    int *a = malloc(cap * sizeof *a);
    if (a == NULL) {
        return 0;
    }
    a[0] = 10;
    a[1] = 20;

    int *backup = a;                             /* 事先留一份地址，失败后才救得回来 */

    a = realloc_may_fail(a, 4 * sizeof *a, 1);   /* 这次扩容失败 */
    printf("失败后 a == NULL：%s\n", a == NULL ? "是" : "否");
    printf("失败后原块其实完好，backup[0]=%d backup[1]=%d\n", backup[0], backup[1]);
    printf("如果没有 backup，这两块数据就既读不到、也 free 不掉了\n");

    free(backup);                                /* 只有备份才能把它还回去 */
    return 0;
}
```
```output
失败后 a == NULL：是
失败后原块其实完好，backup[0]=10 backup[1]=20
如果没有 backup，这两块数据就既读不到、也 free 不掉了
```

注意 `backup` 能读到 `10 20` 这件事本身就是证据：**失败时原块没有被释放**，是 `p = NULL` 那一次赋值让我们失去了它。

### 安全模式：临时指针接住，判空之后再赋值

正确的写法只多两行，却把"失败"变成了一件无害的事：

```
int *tmp = realloc(p, new_size);   /* 先接住 */
if (tmp == NULL) {
    /* p 仍然有效，数据完好：可以继续用旧块、或者向上报错 */
} else {
    p = tmp;                        /* 只有成功才改 p */
}
```

把它封装成一个"扩容函数"，返回值表示成败，调用者不必关心细节：

```c run id=ra-safe
#include <stdio.h>
#include <stdlib.h>

/* 把 *buf 的容量扩到 need 个 int。成功返回 1；失败返回 0，此时 *buf 完全没被改动。 */
static int grow(int **buf, size_t *cap, size_t need) {
    if (need <= *cap) {
        return 1;
    }
    int *tmp = realloc(*buf, need * sizeof **buf);   /* 临时指针接住 */
    if (tmp == NULL) {
        return 0;                                    /* 旧指针、旧数据、旧容量都还在 */
    }
    *buf = tmp;                                      /* 只有成功才落到正式指针上 */
    *cap = need;
    return 1;
}

int main(void) {
    size_t cap = 2;
    int *a = malloc(cap * sizeof *a);
    if (a == NULL) {
        return 0;
    }

    size_t n = 0;
    for (int i = 0; i < 9; i++) {
        if (n == cap && !grow(&a, &cap, cap * 2)) {   /* 满了就翻倍 */
            free(a);
            return 0;
        }
        a[n] = i * i;
        n++;
    }

    printf("cap=%zu size=%zu\n", cap, n);
    long long sum = 0;
    for (size_t i = 0; i < n; i++) {
        sum += a[i];
    }
    printf("前 %zu 个平方数：%d … %d，总和 %lld\n", n, a[0], a[n - 1], sum);
    free(a);
    return 0;
}
```
```output
cap=16 size=9
前 9 个平方数：0 … 64，总和 204
```

容量从 2 开始翻倍：2 → 4（放第 3 个时）→ 8（放第 5 个时）→ 16（放第 9 个时），所以最终 `cap=16` 而有效数据只有 9 个。**容量是"能装多少"，长度是"装了多少"**，这两个数字永远分开保存。

### 扩容可能搬家：旧地址上的其他指针立刻失效

`realloc` 成功时旧块已经释放。如果你手里还留着另一个指向旧块的指针（别名），它立刻变成**悬垂指针**——不管这次 `realloc` 到底有没有搬家，标准都允许搬家，所以别名从调用那一刻起就不可信了。

下面的 `grow_by_copy` 模拟"原地扩不下、必须搬家"的情形：先分配新块、拷数据、再释放旧块。真实 `realloc` 走这条路线时行为完全一样：

```c run id=ra-move
#include <stdio.h>
#include <stdlib.h>

/* 模拟"原地扩不下、只能搬家"：先分配新块，拷数据，再释放旧块 */
static int *grow_by_copy(int *old, size_t old_n, size_t new_n) {
    int *fresh = malloc(new_n * sizeof *fresh);
    if (fresh == NULL) {
        return NULL;                     /* 失败时旧块原封不动 */
    }
    for (size_t i = 0; i < old_n; i++) {
        fresh[i] = old[i];               /* 内容被复制过去，所以数据不会丢 */
    }
    free(old);                           /* 旧块立即失效：所有指向它的指针都悬垂了 */
    return fresh;
}

int main(void) {
    int *a = malloc(2 * sizeof *a);
    if (a == NULL) {
        return 0;
    }
    a[0] = 1;
    a[1] = 2;

    int *alias = a;                      /* 第二个指针也指向这 2 个 int */
    int *moved = grow_by_copy(a, 2, 4);
    if (moved == NULL) {
        free(a);
        return 0;
    }
    a = moved;

    printf("搬家之后数据还在：a[0]=%d a[1]=%d\n", a[0], a[1]);
    printf("alias 与新块相同吗：%s\n", alias == a ? "是" : "否");
    printf("所以 alias 已经悬垂，必须重新指向新块之后才能用\n");

    a[2] = 3;
    a[3] = 4;
    printf("新容量下的四个值：%d %d %d %d\n", a[0], a[1], a[2], a[3]);
    free(a);
    return 0;
}
```
```output
搬家之后数据还在：a[0]=1 a[1]=2
alias 与新块相同吗：否
所以 alias 已经悬垂，必须重新指向新块之后才能用
新容量下的四个值：1 2 3 4
```

这里的"否"是必然的：新块是在旧块还活着的时候分配出来的，两块内存不可能重叠。由此得到一条设计原则：**凡是结构里存着"指向别人内部"的指针（例如别人的 `data` 字段），就不要对那块内存做 `realloc`**；要么改成存下标，要么重新分配后把内部指针全部重建。

### `realloc(NULL, n)` 与 `realloc(p, 0)`

这两个边界情况经常被写错：

- `realloc(NULL, n)` **等价于** `malloc(n)`。标准明确保证这一点，所以"从空指针开始、第一次 push 时扩容"的写法是合法的；
- `realloc(p, 0)` 的行为**不可移植**：标准的不同版次对它说法不一致，实现之间也不统一（有的实现释放后返回 `NULL`，有的返回一个不能解引用的极小指针；C23 起更直接把它定为未定义行为）。既然"到底释放没释放""返回值能不能用"都没有保证，就**不要写它**：要清空就改自己的 `size` 字段，要归还就显式 `free(p); p = NULL;`。

```c run id=ra-null-zero
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *p = realloc(NULL, 3 * sizeof *p);   /* 等价于 malloc(3 * sizeof *p) */
    if (p == NULL) {
        return 0;
    }
    p[0] = 7;
    p[1] = 8;
    p[2] = 9;
    printf("realloc(NULL, n) 拿来当 malloc 用：%d %d %d\n", p[0], p[1], p[2]);
    free(p);

    printf("realloc(p, 0) 的行为由实现决定，可移植的写法只有 free(p); p = NULL;\n");
    return 0;
}
```
```output
realloc(NULL, n) 拿来当 malloc 用：7 8 9
realloc(p, 0) 的行为由实现决定，可移植的写法只有 free(p); p = NULL;
```

### 内存里发生了什么

下面是一次"从 2 个 int 扩容到 4 个 int、并且搬家"的示意（地址只为讲解方便，真实地址每次运行都不同）：

```memory title="realloc(a, 4 * sizeof *a) 搬家前后（地址为示意）"
地址 | 内容 | 是谁 | 说明
0x1000 | 1 | 堆：旧块 2 个 int | a[0]，扩容前
0x1004 | 2 | 堆：旧块 2 个 int | a[1]，扩容前
0x2000 | 1 | 堆：新块 4 个 int | 从旧块复制过来的 a[0]
0x2004 | 2 | 堆：新块 4 个 int | 从旧块复制过来的 a[1]
0x2008 | 未初始化 | 堆：新块 4 个 int | 多出来的两个 int，内容不确定
0x200c | 未初始化 | 堆：新块 4 个 int | 同上
0x7ff0 | 0x1000 | 局部变量 a（扩容前） | 仍保存旧块地址，此刻是悬垂指针
0x7ff8 | 0x2000 | 局部变量 a（扩容后） | realloc 成功后写入的新地址
```

两个细节：一是**旧块里那块内存被还给了分配器**，随时可能被别的 `malloc` 拿走；二是新块多出来的 8 个字节**没有初始化**，`realloc` 只复制旧内容，不会帮你清零（要清零得自己 `memset`，或者一开始就用 `calloc`）。

## 编译与运行

用 gcc 或 clang 都可以编译，但涉及堆的代码一定要带上 sanitizer：

```bash
gcc -std=c17 -Wall -Wextra -g -fsanitize=address,undefined grow.c -o grow
./grow
```

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=address,undefined grow.c -o grow
./grow
```

说明：

- **`-fsanitize=address`（ASan）**：能抓住"扩容后继续用旧指针""写超出容量"这类错误，并指出是哪一行分配、哪一行访问；
- **`-fsanitize=undefined`（UBSan）**：能抓住空指针解引用、有符号溢出等；
- **`-g`**：报告里才有文件名和行号；
- ASan **不会**帮你发现"内存泄漏"（Windows 上没有 LeakSanitizer）。泄漏要靠计数或者平台的堆跟踪来发现——本平台的判题器会用链接期 `--wrap` 包装 `malloc/free`，统计程序结束时还没释放的块，详见「内存泄漏」那一节。

想看 `realloc` 到底搬没搬家，可以在两次调用之间打印 `(void *)p` 的值——但**这段输出不能写进任何需要比对结果的程序**，因为地址每次运行都不同。这也是为什么本节所有示例都只打印数据、不打印地址。

## 常见错误

### 写成 `p = realloc(p, n)`，失败即泄漏 [LEAK]
这是本节最核心的坑。失败时返回值是 `NULL`，赋值把唯一的指针覆盖掉，原块还在堆上却再也找不到。它不会崩溃、不会报错，甚至看不出任何异常，直到进程的堆被一点点吃光。正确写法见"安全模式"：先用 `tmp` 接住，判空之后再写回。

```c
/* 错误写法 */
p = realloc(p, new_size);      /* 失败后 p 变成 NULL，原块永久泄漏 */
if (p == NULL) {
    return -1;                 /* 这里想"回滚"，但已经没有可回滚的指针了 */
}

/* 正确写法 */
int *tmp = realloc(p, new_size);
if (tmp == NULL) {
    return -1;                 /* p 仍然有效，调用者还能继续用或者 free 它 */
}
p = tmp;
```

### 忘了检查 `realloc` 的返回值，直接往新容量里写 [RE]
`realloc` 失败时返回 `NULL`。如果紧接着写 `p[old_size] = x;`，就是对空指针解引用，程序当场崩溃（本平台判 `RE`）。内存不足不是"理论上才会发生的事"：32 位程序、容器里的低内存限制、一次要求几个 GB 的扩容，都很容易让它真的发生。

### 扩容后继续用旧指针（别名、或者结构体里缓存的内部指针）[RE]
`realloc` 成功后旧块已经释放，任何还保存着旧地址的指针都是悬垂指针，读写它就是"释放后使用"。典型场景：结构体里存了 `int *row` 指向另一块内存的内部，之后对那块内存做了 `realloc`，结构体里的 `row` 没有跟着更新。修法只有两条——把内部指针改成"基址 + 下标"，或者在扩容后重新计算所有内部指针。

### 把 `realloc(p, 0)` 当成"清空但保留指针" [WA]
`realloc(p, 0)` 是"释放并返回一个不可用的值"，不是"把长度清零"。想要长度清零就改自己的 `size` 字段；想要释放就 `free(p); p = NULL;`。把它当作"清零"来写，后续 `p[i] = ...` 就是写进已经释放的内存。

### 扩容成功却不更新容量记录 [WA]
只写 `b->data = tmp;` 而忘了 `b->cap = newcap;`，容量字段就永远停在旧值：程序每次 `push` 都以为还满着，于是又 `realloc` 一次。功能上"碰巧还对"，但复杂度从均摊 O(1) 退化成 O(n²)，数据量大一点就超时。`data` 和 `cap` 是必须同步更新的两件事。

## 客观题

### q-s5-realloc-1 single
某段代码这样写：

```c
int *p = malloc(4 * sizeof *p);
/* ... 往 p[0]…p[3] 里写满 4 个 int，都成功 ... */
int *q = realloc(p, 8 * sizeof *p);
if (q == NULL) {
    /* 内存不足的分支 */
}
```

假设 `q == NULL` 成立，关于 `p` 和它指向的那 4 个 `int`，下面哪个说法正确？

- [x] `p` 仍然有效、仍然拥有原来那 4 个 `int`，可以继续用 `p`，最后必须 `free(p)`
  > 正确。`realloc` 失败时"原块一个字节都没动"，既不释放也不改内容；这次调用唯一的结果就是返回了 `NULL`。因为代码没有写 `p = realloc(p, ...)`，`p` 没有被覆盖，所以数据还在、所有权还在，正常释放即可。这也是"先接住临时变量"这种写法的依据：失败分支里还能安全地用旧指针。
- [ ] `p` 已经被 `realloc` 释放了，即使 `q == NULL` 也不能再碰 `p`
  > 错。释放只发生在**成功**的那条路径上。`realloc` 如果先把旧块释放再失败，调用者就没有任何办法保住旧数据，"失败时原块不变"这条保证也就没有意义了。标准明确规定失败时原块保持有效。
- [ ] 原内存已经泄漏，无法挽回，因为 `realloc` 内部已经把旧块还给了分配器
  > 错。这条路径恰恰**没有**泄漏：`p` 仍然指向原块，程序结束时 `free(p)` 就能正常归还。会泄漏的是另一种写法——`p = realloc(p, 8 * sizeof *p);`，赋值把 `p` 改成了 `NULL`，唯一指向原块的指针消失。
- [ ] `q == NULL` 说明数据已经被搬到新块、但新块分配失败，所以原来的 4 个 `int` 已经丢了
  > 错。`realloc` 不会"先搬家再失败"。要么整体成功（新块就绪、旧块释放、返回新地址），要么整体失败（返回 `NULL`、旧块原样保留），不存在"搬了一半"的中间状态。正因为有这条原子性保证，安全模式才是可靠的。
