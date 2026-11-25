---
id: s5-dynamic-array
---

## 讲解

### 动态数组 = 一块会换地方的堆内存 + 两个数字

C 的数组长度在编译期就定死了，`int a[10]` 永远只能装 10 个。但现实里经常"读到文件结束才知道有几个"：一页日志有多少行、一次采样有多少个点、一行输入有多长。要装下这种数据，只能自己造一个"可变长数组"，它的全部秘密就是三个字段：

| 字段 | 含义 | 谁来决定 |
|---|---|---|
| `data` | 指向堆上一块连续内存的首地址 | `malloc` / `realloc` 决定，随时可能变 |
| `size` | 已经装了**几个**有效元素 | 每次 push / pop 由你维护 |
| `cap` | 这块内存**最多能装几个**元素 | 只在扩容 / 缩容时改变 |

关键点是 `size` 与 `cap` 必须分开：`cap` 是"买下来的座位数"，`size` 是"已经坐了几个人"。座位比人多是正常的（甚至是有意的），把两者混成一个数字，就会出现"读到未初始化的内存"或者"每次插入都扩容"这两类问题。

下面这段代码把"容量怎么长"完整打印出来——只在容量真的变化时输出一行：

```c run id=da-doubling
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    size_t cap = 0;
    size_t size = 0;
    int *data = NULL;                     /* 空数组：data 是 NULL，容量和长度都是 0 */

    for (int v = 1; v <= 12; v++) {
        if (size == cap) {                /* 满了才扩容 */
            size_t newcap = (cap == 0) ? 1 : cap * 2;      /* 空的时候从 1 开始，之后翻倍 */
            int *tmp = realloc(data, newcap * sizeof *tmp);
            if (tmp == NULL) {
                free(data);
                return 0;
            }
            data = tmp;
            cap = newcap;
            printf("第 %d 次插入前扩容：cap -> %zu\n", v, cap);
        }
        data[size] = v;
        size++;
    }

    printf("最终 size=%zu cap=%zu\n", size, cap);
    long long sum = 0;
    for (size_t i = 0; i < size; i++) {
        sum += data[i];
    }
    printf("元素之和 = %lld\n", sum);
    free(data);
    return 0;
}
```
```output
第 1 次插入前扩容：cap -> 1
第 2 次插入前扩容：cap -> 2
第 3 次插入前扩容：cap -> 4
第 5 次插入前扩容：cap -> 8
第 9 次插入前扩容：cap -> 16
最终 size=12 cap=16
元素之和 = 78
```

插入 12 个元素只扩容了 5 次，最后还空着 4 个座位。`realloc(NULL, n)` 等价于 `malloc(n)`（上一节讲过），所以"从空指针开始"的第一行不需要特殊处理。

### 为什么是翻倍，而不是每次加 1

扩容不是免费的：`realloc` 一旦搬家，就要把现有元素**全部复制**一遍。所以"扩容策略"决定了总复制量：

- **每次只加 1**：插入第 i 个元素时容量是 i-1，要复制 i-1 个元素。插入 n 个元素的总复制量是 `1 + 2 + … + (n-1) ≈ n²/2`，也就是**每次插入平均复制 n/2 个元素**，整体 O(n²)；
- **每次翻倍**：容量依次是 1、2、4、8、…，第 i 个元素只在那几次"刚好翻倍"的插入上付出复制代价，总复制量是 `1 + 2 + 4 + … + n/2 < n`，**均摊到每次插入不到 1 次复制**，整体 O(n)。

这不是微小的差别。把两个策略的复制次数直接数出来对比：

```c run id=da-amortized
#include <stdio.h>

int main(void) {
    const int n = 16;
    long long doubling = 0;
    long long plus_one = 0;

    for (int cap = 1; cap < n; cap *= 2) {
        doubling += cap;              /* 每次搬家要复制 cap 个元素 */
    }
    for (int cap = 1; cap < n; cap += 1) {
        plus_one += cap;
    }

    printf("插入 %d 个元素，总复制次数：翻倍 %lld 次，每次加 1 %lld 次\n", n, doubling, plus_one);
    printf("平均到每个元素：翻倍 %.2f 次，每次加 1 %.2f 次\n",
           (double)doubling / n, (double)plus_one / n);
    return 0;
}
```
```output
插入 16 个元素，总复制次数：翻倍 15 次，每次加 1 120 次
平均到每个元素：翻倍 0.94 次，每次加 1 7.50 次
```

`0.94` 与 `7.50` 的差距就是"均摊 O(1)"与"O(n)"的差距，而且元素越多差距越大（n 翻倍，前者几乎不变，后者也翻倍）。代价是**峰值内存最多浪费一倍**——用一个常数因子的空间，换掉一个数量级的时间。

工程上常见的折中是 `newcap = cap * 3 / 2`（1.5 倍）：复制次数同样与 n 同阶，浪费的上限从 100% 降到 50%，代价是扩容更频繁一些。**只要增长率是大于 1 的常数，均摊就是 O(1)**；怕的是"每次加固定值"。

### 一个完整的动态数组模块

真实代码里，这三个字段和操作应该捆成一个结构体，把"扩容"藏进 `push` 里，让调用者只用 `push` 和 `destroy`：

```c run id=da-module
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int *data;
    size_t size;
    size_t cap;
} IntBuf;

/* 保证 cap >= need；成功返回 1，失败返回 0 且结构体完全不变 */
static int buf_reserve(IntBuf *b, size_t need) {
    if (need <= b->cap) {
        return 1;
    }
    size_t newcap = (b->cap == 0) ? 4 : b->cap;
    while (newcap < need) {
        newcap *= 2;
    }
    int *tmp = realloc(b->data, newcap * sizeof *tmp);
    if (tmp == NULL) {
        return 0;
    }
    b->data = tmp;
    b->cap = newcap;
    return 1;
}

static int buf_push(IntBuf *b, int value) {
    if (!buf_reserve(b, b->size + 1)) {
        return 0;
    }
    b->data[b->size] = value;
    b->size++;
    return 1;
}

static void buf_destroy(IntBuf *b) {
    free(b->data);
    b->data = NULL;
    b->size = 0;
    b->cap = 0;
}

int main(void) {
    IntBuf b = {NULL, 0, 0};                 /* 空缓冲区：零初始化是唯一安全的起点 */
    int sample[] = {5, 3, 9, 1};

    for (int i = 0; i < 4; i++) {
        if (!buf_push(&b, sample[i])) {
            buf_destroy(&b);
            return 0;
        }
    }
    printf("push 之后 size=%zu cap=%zu\n", b.size, b.cap);

    /* 已经知道还要装 100 个，就一次性预留：少搬几次家 */
    if (!buf_reserve(&b, b.size + 100)) {
        buf_destroy(&b);
        return 0;
    }
    printf("reserve 之后 size=%zu cap=%zu（size 不变，只有 cap 变大）\n", b.size, b.cap);

    long long sum = 0;
    for (size_t i = 0; i < b.size; i++) {
        sum += b.data[i];
    }
    printf("4 个值的和 = %lld，最后一个 = %d\n", sum, b.data[b.size - 1]);

    buf_destroy(&b);
    printf("销毁之后 data 是空指针吗：%s\n", b.data == NULL ? "是" : "否");

    /* 空缓冲区也必须能安全销毁：free(NULL) 是合法的，不做事 */
    IntBuf empty = {NULL, 0, 0};
    buf_destroy(&empty);
    printf("空缓冲区销毁后 size=%zu cap=%zu\n", empty.size, empty.cap);
    return 0;
}
```
```output
push 之后 size=4 cap=4
reserve 之后 size=4 cap=128（size 不变，只有 cap 变大）
4 个值的和 = 18，最后一个 = 1
销毁之后 data 是空指针吗：是
空缓冲区销毁后 size=0 cap=0
```

三个容易忽略的细节都在输出里：

1. `reserve` 只改 `cap`，**绝不改 `size`**——容量变大不代表多了元素，多出来的槽位里是未初始化的内存；
2. `buf_destroy` 释放之后把字段清零，之后即使有人误用 `b.data`，也是"空指针"这种一眼就能查到的状态，而不是悬垂指针；
3. 空缓冲区（`data == NULL`）也必须能安全销毁，因为 `free(NULL)` 什么都不做。

### 内存里发生了什么

一次 `push` 触发扩容后，结构体与堆内存的关系（地址为示意）：

```memory title="IntBuf b：size=3、cap=4 时的数据与堆内存（地址为示意）"
地址 | 内容 | 是谁 | 说明
0x7fe0 | 0x2000 | 局部变量 b.data | 指向堆上那块 4 个 int 的内存
0x7fe8 | 3 | 局部变量 b.size | 有效元素个数：只有前 3 个能读
0x7ff0 | 4 | 局部变量 b.cap | 容量：这块内存最多装 4 个
0x2000 | 10 | 堆块元素 [0] | 已初始化，可以读
0x2004 | 20 | 堆块元素 [1] | 已初始化，可以读
0x2008 | 30 | 堆块元素 [2] | 已初始化，可以读
0x200c | 未初始化 | 堆块元素 [3] | 第 4 个座位是空的，读它是未定义行为
```

`b.size` 决定了"循环的边界"。如果循环写成 `for (i = 0; i < b.cap; i++)`，就会读到第 4 个槽位里未初始化的内容——那不是"数组的一部分"，只是买好的座位。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra -g -fsanitize=address,undefined dynarr.c -o dynarr
./dynarr
```

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=address,undefined dynarr.c -o dynarr
./dynarr
```

说明：

- **`-fsanitize=address`**：写越界、释放后使用、重复释放都能抓到；尤其能验证"循环上界写成 `cap`"这类错误；
- **`-g`**：报错时能指出"内存是在哪一行分配的、在哪一行被越界写的"；
- 想验证释放是否干净，除了自己加计数器，还可以看本平台判题器的泄漏检查：它会统计程序结束时还没归还的块并指出分配位置；
- 用 `valgrind --leak-check=full ./dynarr`（Linux）也能做同样的事，不过 Windows 上没有 valgrind，用 ASan + 计数更方便。

## 常见错误

### 把 `cap` 当成元素个数来遍历 [RE]
`size` 才是有效元素个数，`cap` 只是容量。循环写成 `i < b->cap`，就会读到扩容后从未写入的槽位：里面的值是未初始化的，读出来是未定义行为，也是本平台判题器里"输出莫名其妙不对"的常见来源。

### 扩容时只更新 `data`，忘了更新 `cap` [TLE]
`b->data = tmp;` 之后没有 `b->cap = newcap;`，容量字段永远停在旧值，下一次 `push` 又会认为"满了"再扩一次。结果每次插入都 `realloc` 一遍，复杂度从均摊 O(1) 掉到 O(n²)，数据量一到十万就会超时。`data` 和 `cap` 必须一起更新。

### 忘了释放，或者只在"正常结束"的分支里释放 [LEAK]
动态数组的每一处 `return` 都可能是泄漏点：中途 `realloc` 失败、读到一半文件出错、提前 `break` 出循环……只要有一条路径直接 `return` 而没有 `free(data)`，那块内存就丢了。**统一出口**是最省心的写法：

```c
int rc = 0;
for (int i = 0; i < n; i++) {
    if (!buf_push(&b, a[i])) {
        rc = 1;                  /* 记下错误，不在这里 free */
        break;
    }
}
buf_destroy(&b);                 /* 唯一的释放点 */
return rc;
```

### 把结构体按值传进函数，扩容只改了副本 [WA]
`void push(IntBuf b, int v)` 里的 `b` 是副本，`b.data = tmp;` 改的是副本的字段，调用者的 `b.data` 和 `b.size` 完全没变。动态数组的函数必须收 `IntBuf *`。同理，`realloc` 之后如果别处还存着 `b.data` 的旧地址，那个地址也立刻悬垂。

### 用固定大小的数组"假装"动态 [WA]
`int a[100000];` 能不能 AC 取决于题目的数据范围，但它不是动态数组：容量是猜的，猜小了越界、猜大了浪费栈空间（Windows 默认栈只有 1MB）。题目说"条数未知"时，正确做法是 `size`/`cap` 加 `realloc`，而不是把上限往大写。本平台的判题器还有 64MB 栈上限和 256MB 堆上限，靠运气定容量迟早撞墙。

## 客观题

### q-s5-dynamic-array-1 single
某动态数组当前 `size = 5`、`cap = 5`，现在要 `push` 第 6 个元素。关于"把容量扩到多少"，下面哪个说法正确？

- [x] 扩到 10（翻倍）：本次要复制 5 个元素，但连续插入 n 个元素的总复制次数小于 2n，均摊到每次插入是 O(1)
  > 正确。翻倍策略下，容量序列是 1、2、4、8、…，只在"刚好翻倍"的那几次插入上付出复制代价，总复制量 `1 + 2 + … + n/2 < n`，均摊到每次插入不到 1 次复制。代价是峰值最多浪费一倍空间，属于典型的"用空间换时间"。
- [ ] 扩到 6（只加 1）：最节省内存，而且每次复制的元素最少
  > 错。单次复制确实只有 5 个，但插入第 i 个元素时都要复制 i-1 个，n 次插入的总复制量是 `n²/2` 量级，均摊到每次是 O(n)。数据量一大就会超时，这是"每次加 1"的致命问题——省下的那点内存远不值得。
- [ ] 扩到 `size + 1000`（每次多预留 1000 个）：预留得多，扩容就一定更少
  > 错。它的总复制量仍是 O(n²) 量级（每次搬家的代价随 n 增长），只是常数小一些；而且 1000 个单位的浪费是固定值，元素少的时候反而更浪费。真正决定均摊复杂度的是"增长率是否大于 1 的常数"，不是"一次预留多少"。
- [ ] 不扩容，直接把第 6 个元素写到 `data[5]`，反正 C 不检查越界
  > 错。`data[5]` 超出了 `malloc` 给的那 5 个 `int`，写它是未定义行为：可能悄悄改掉堆里别的块的管理信息（表现为几百行之后莫名崩溃），也可能被 ASan 直接报 `heap-buffer-overflow` 判 `RE`。"C 不检查"不等于"可以写"。
