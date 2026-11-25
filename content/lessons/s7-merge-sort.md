---
id: s7-merge-sort
---

## 讲解

### 分治：先拆到"天然有序"，再一路合并回去
归并排序的思路只有两步：**把区间对半拆开，一直拆到只剩 1 个元素**（1 个元素当然有序），然后**从下往上把两个有序区间合并成一个有序区间**。它不需要"选枢轴"这种技巧，正确性完全来自一个简单事实：

> 两个已经有序的序列，只要每次取两者头部较小的那个，就能合并成一个有序序列。

拆分是纯下标的算术，不碰数据；真正干活的是合并。下面是左闭右开区间 `[lo, hi)` 的拆分过程，`mid = lo + (hi - lo) / 2` 把区间分成 `[lo, mid)` 和 `[mid, hi)`：

```c run id=ms-divide
#include <stdio.h>

/* 只打印拆分树，不真的排序：看清"分"是怎么分的 */
static void show_tree(int lo, int hi, int depth) {
    printf("%*s[%d,%d)", depth * 2, "", lo, hi);
    if (hi - lo <= 1) {
        printf("  只剩 1 个元素，天然有序\n");
        return;
    }
    int mid = lo + (hi - lo) / 2;
    printf("  拆成 [%d,%d) 和 [%d,%d)\n", lo, mid, mid, hi);
    show_tree(lo, mid, depth + 1);
    show_tree(mid, hi, depth + 1);
}

int main(void) {
    int n = 4;
    printf("对 %d 个元素分治（左闭右开区间 [lo, hi)）：\n", n);
    show_tree(0, n, 0);
    printf("递归深度 = log2(%d) = 2；每一层所有区间的长度加起来都等于 %d\n", n, n);
    return 0;
}
```
```output
对 4 个元素分治（左闭右开区间 [lo, hi)）：
[0,4)  拆成 [0,2) 和 [2,4)
  [0,2)  拆成 [0,1) 和 [1,2)
    [0,1)  只剩 1 个元素，天然有序
    [1,2)  只剩 1 个元素，天然有序
  [2,4)  拆成 [2,3) 和 [3,4)
    [2,3)  只剩 1 个元素，天然有序
    [3,4)  只剩 1 个元素，天然有序
递归深度 = log2(4) = 2；每一层所有区间的长度加起来都等于 4
```

这个"**每一层所有区间的长度加起来都等于 n**"的性质，是 `O(n log n)` 的全部来源：层数是 `log2 n`，每层的合并总量是 `n`。快排也是 `n log n`，但快排的层数取决于"枢轴分得均不均"，归并的层数**只取决于 n**，所以归并的最坏情况就是 `O(n log n)`，没有"输入是升序就退化"这回事。

### 合并：两个指针，一次扫描，谁小取谁
合并是整个算法唯一的"体力活"。左右两半各自已经有序，所以只要用 `i` 指左边、`j` 指右边，每次比较 `a[i]` 和 `a[j]`，把小的那个搬进辅助数组，然后对应指针前进：

```c run id=ms-merge-trace
#include <stdio.h>

#define N 6
static int out[N];

static void show(const int *v, int n) {
    for (int k = 0; k < n; k++) {
        printf("%s%d", k ? " " : "", v[k]);
    }
}

static void merge_trace(const int *L, int ln, const int *R, int rn) {
    int i = 0;
    int j = 0;
    int k = 0;
    int step = 0;

    printf("左半区：");
    show(L, ln);
    printf("\n右半区：");
    show(R, rn);
    printf("\n");

    while (i < ln && j < rn) {
        int li = i;
        int rj = j;
        int take_left = (L[i] <= R[j]);     /* <= 是稳定性的关键，见下一节 */
        int v = take_left ? L[i++] : R[j++];
        out[k++] = v;
        step++;
        printf("第 %d 步：L[%d]=%d %s R[%d]=%d → 取 %d，已合并：",
               step, li, take_left ? v : L[li], take_left ? "<=" : ">", rj, take_left ? R[rj] : v, v);
        show(out, k);
        printf("\n");
    }
    printf("左半区用完，把右半区剩下的 %d 个元素直接搬过来 → ", rn - j);
    while (j < rn) {
        out[k++] = R[j++];
    }
    show(out, k);
    printf("\n合并结束，辅助数组里是 %d 个元素\n", k);
}

int main(void) {
    int left[] = { 1, 4, 7 };
    int right[] = { 2, 3, 9 };
    merge_trace(left, 3, right, 3);
    return 0;
}
```
```output
左半区：1 4 7
右半区：2 3 9
第 1 步：L[0]=1 <= R[0]=2 → 取 1，已合并：1
第 2 步：L[1]=4 > R[0]=2 → 取 2，已合并：1 2
第 3 步：L[1]=4 > R[1]=3 → 取 3，已合并：1 2 3
第 4 步：L[1]=4 <= R[2]=9 → 取 4，已合并：1 2 3 4
第 5 步：L[2]=7 <= R[2]=9 → 取 7，已合并：1 2 3 4 7
左半区用完，把右半区剩下的 1 个元素直接搬过来 → 1 2 3 4 7 9
合并结束，辅助数组里是 6 个元素
```

注意最后一步：**一个半区用完之后，另一边的剩余部分是一次性搬过去的**，不需要再比较——因为它们本来就是有序的，而且都比已取出的所有元素大。忘记这两个"搬剩余"的循环，就会丢元素（见「常见错误」）。

合并必须在**辅助数组**里做，不能直接在原数组上原地完成：`a[k]` 还没被读取就被覆盖的话，数据就丢了。所以这里同时存在两段内存、三个下标：

```memory title="合并到一半时（已合并出 1 2 3）的原数组、辅助数组与指针，地址为示意"
地址 | 内容 | 变量 | 说明
0x0059fe80 | 1 | a[lo+0] | 原数组左半区，已经排好，只会被读
0x0059fe84 | 4 | a[lo+1] | i 正指着它
0x0059fe88 | 7 | a[lo+2] | 左半区最后一个
0x0059fe8c | 2 | a[mid+0] | 原数组右半区，已经排好
0x0059fe90 | 3 | a[mid+1] | 已经搬走
0x0059fe94 | 9 | a[mid+2] | j 正指着它
0x01a0f2a0 | 1 | tmp[0] | 辅助数组：合并结果写在这里
0x01a0f2a4 | 2 | tmp[1] | 来自右半区（2 < 4）
0x01a0f2a8 | 3 | tmp[2] | 来自右半区（3 < 4）
0x01a0f2ac | 未写入 | tmp[3] | 下一步要写的位置：k = 3
栈（4 字节） | 1 | i | 左边下一个待比较下标（lo + i）
栈（4 字节） | 2 | j | 右边下一个待比较下标（mid + j）
```

合并完成后还要**把辅助数组整段拷回原数组**。这一步很容易漏：只写 `tmp` 不拷贝回去，函数返回后原数组一点变化都没有，排序等于没做。

### 稳定性：合并时用 `<=`，相等就把左边先取走
归并排序是**稳定排序**：键相等的元素保持原来的相对顺序。它不是靠"额外记账"实现的，而是靠合并的那一行判断：

```text
if (a[i] <= a[j]) 取左边     ← 相等时取左边 → 左边原来的元素仍然在前 → 稳定
if (a[i] <  a[j]) 取右边     ← 相等时取右边 → 右边跑到了左边前面 → 顺序被换掉
```

下面是同一份数据、只改这一个符号的对比。左半区是 `1:85 3:90`，右半区是 `4:80 2:85`，其中学号 1 和 2 的分数都是 85，而 **1 在原始数据里排在 2 前面**：

```c run id=ms-stability
#include <stdio.h>

typedef struct {
    int id;
    int score;
} Rec;

#define OUTN 4
static Rec out[OUTN];

/* stable = 1 时用 <=，= 0 时用 < */
static void merge_cmp(const Rec *L, int ln, const Rec *R, int rn, int stable) {
    int i = 0;
    int j = 0;
    int k = 0;

    while (i < ln && j < rn) {
        int take_left = stable ? (L[i].score <= R[j].score) : (L[i].score < R[j].score);
        out[k++] = take_left ? L[i++] : R[j++];
    }
    while (i < ln) {
        out[k++] = L[i++];
    }
    while (j < rn) {
        out[k++] = R[j++];
    }
}

static void show(const char *tag) {
    printf("%s", tag);
    for (int k = 0; k < OUTN; k++) {
        printf("%s%d:%d", k ? " " : "", out[k].id, out[k].score);
    }
    printf("\n");
}

int main(void) {
    Rec left[] = { { 1, 85 }, { 3, 90 } };
    Rec right[] = { { 4, 80 }, { 2, 85 } };

    printf("原始顺序：1:85 2:85 3:90 4:80（1 排在 2 前面）\n");
    merge_cmp(left, 2, right, 2, 1);
    show("用 <= 合并（稳定）：  ");
    merge_cmp(left, 2, right, 2, 0);
    show("用 <  合并（不稳定）：");
    printf("两种写法排序结果都正确，区别只在分数相同的 1 和 2 谁在前\n");
    return 0;
}
```
```output
原始顺序：1:85 2:85 3:90 4:80（1 排在 2 前面）
用 <= 合并（稳定）：  4:80 1:85 2:85 3:90
用 <  合并（不稳定）：4:80 2:85 1:85 3:90
两种写法排序结果都正确，区别只在分数相同的 1 和 2 谁在前
```

稳定性在"多关键字排序"里非常值钱：先按学号排一遍、再按分数稳定排一遍，结果就是"分数优先、同分按学号"。如果第二步用的排序不稳定，第一步的成果就白费了。

顺带对比一下三种排序的稳定性与代价：

| | 平均 | 最坏 | 额外空间 | 稳定 |
|---|---|---|---|---|
| 快速排序 | O(n log n) | **O(n²)** | O(log n) 栈 | 不稳定 |
| 归并排序 | O(n log n) | O(n log n) | **O(n)** | **稳定** |
| 堆排序 | O(n log n) | O(n log n) | O(1) | 不稳定 |

"最坏也是 `n log n`"和"稳定"这两条，就是归并排序在工程上不可替代的原因（`qsort` 不稳定，`stable_sort` 才稳定）。

### 用归并数逆序对：合并时顺手就能算出"跨区间"的答案
逆序对是"前面比后面大"的数对个数，它衡量一份数据有多"乱"。暴力数是 `O(n²)`；归并排序可以在 `O(n log n)` 里顺手统计出来，因为**每一对逆序对都恰好被某一次合并"看到"一次**：

- 合并 `[lo, mid)` 与 `[mid, hi)` 时，若 `a[j]`（右半区）要取出来，说明它比左半区剩下的**所有**元素都小；
- 左半区剩下的元素个数是 `mid - i`，于是这一次就新增 `mid - i` 个逆序对；
- 左右两半区内部的逆序对，在更早的递归里已经数过了。

```c run id=ms-inversions
#include <stdio.h>

#define N 1000
static int a[N];
static int tmp[N];
static long long inv;

static void merge_count(int lo, int hi) {
    if (hi - lo <= 1) {
        return;
    }
    int mid = lo + (hi - lo) / 2;
    merge_count(lo, mid);
    merge_count(mid, hi);

    int i = lo;
    int j = mid;
    int k = lo;
    while (i < mid && j < hi) {
        if (a[i] <= a[j]) {
            tmp[k++] = a[i++];
        } else {
            inv += mid - i;             /* 左边剩下的 mid-i 个都比 a[j] 大 */
            tmp[k++] = a[j++];
        }
    }
    while (i < mid) {
        tmp[k++] = a[i++];
    }
    while (j < hi) {
        tmp[k++] = a[j++];
    }
    for (int t = lo; t < hi; t++) {
        a[t] = tmp[t];                  /* 必须拷回去 */
    }
}

static long long brute(const int *v, int n) {
    long long c = 0;
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (v[i] > v[j]) {
                c++;
            }
        }
    }
    return c;
}

int main(void) {
    int orig[N];
    for (int i = 0; i < N; i++) {
        a[i] = N - i;                   /* 完全逆序：每一对都是逆序对 */
        orig[i] = a[i];
    }
    inv = 0;
    merge_count(0, N);
    printf("n = %d 完全逆序：归并统计 = %lld，暴力统计 = %lld\n", N, inv, brute(orig, N));
    printf("理论值 n(n-1)/2 = %lld\n", (long long)N * (N - 1) / 2);
    return 0;
}
```
```output
n = 1000 完全逆序：归并统计 = 499500，暴力统计 = 499500
理论值 n(n-1)/2 = 499500
```

两个数字必须一致——这是验证自己写的逆序对统计对不对的最快办法：拿随机小数据跟暴力对拍。注意统计量要用 `long long`：`n = 200000` 的逆序对最多约 `2×10¹⁰`，`int` 装不下。

### 递归版、迭代版与链表版
归并排序有三种常见形态，核心的"合并"完全一样：

1. **自顶向下递归**：就是上面的写法，`merge_sort(lo, hi)` 先递归两半、再合并。代码最短，但递归深度是 `log2 n`（`n = 2×10⁵` 时约 18 层，完全不用担心爆栈）；
2. **自底向上迭代**：先两两合并成长度 2 的段，再合并成长度 4、8……外层循环 `width = 1, 2, 4, ...`，内层按 `width` 切段合并。没有递归，适合嵌入式或对栈敏感的场景；
3. **链表归并**：链表不能随机访问，快排的划分需要从两头往中间扫，链表上做不了；而归并只需要"顺着指针走"，天然合适。更重要的是——链表归并排序**不需要辅助数组**，只要重新连 `next` 指针，额外空间是 `O(1)`（递归栈 `O(log n)`）。

辅助数组的分配位置也很关键：应该在排序开始前**只分配一次**（`malloc(n * sizeof(int))` 或静态数组），然后把同一块 `tmp` 传给所有递归层。每次合并都 `malloc`/`free` 一次的话，`n = 2×10⁵` 会有 20 万次分配，既慢又容易在某条错误路径上漏掉 `free`。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra -g ms.c -o ms
./ms
```

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=address,undefined ms.c -o ms
./ms
```

几个实用建议：

- **先用小数组对拍**：写一个 `brute_sort`（选择排序即可），对 `n ≤ 8` 的随机数组反复比较结果，几十次就能暴露下标错误；
- 打开 `-fsanitize=address` 抓"辅助数组越界"和"写完没拷回原数组"造成的脏读；
- 逆序对统计要跟暴力对拍，并且用 `long long` 输出；
- 大数组测试加 `-Wl,--stack,67108864`（Windows 默认 1MB 栈），虽然归并深度只有 `log n`，但和其他递归一起用时仍然建议加上。

## 常见错误

### 合并时只搬了一边的剩余元素 [WA]
两个 `while` 里少写一个，合并结果就会少几个元素。这类错误在小数据上很隐蔽：如果"少掉的"恰好是最大的一两个元素，前几项看起来完全正常。

```c run id=ms-missing-tail
#include <stdio.h>

#define N 6
static int out[N];

static int merge_wrong(const int *L, int ln, const int *R, int rn) {
    int i = 0;
    int j = 0;
    int k = 0;
    while (i < ln && j < rn) {
        if (L[i] <= R[j]) {
            out[k++] = L[i++];
        } else {
            out[k++] = R[j++];
        }
    }
    while (i < ln) {
        out[k++] = L[i++];              /* 只搬了左半区的剩余 */
    }
    /* 忘了 while (j < rn) out[k++] = R[j++]; */
    return k;
}

int main(void) {
    int left[] = { 1, 4, 7 };
    int right[] = { 2, 3, 9 };
    int n = merge_wrong(left, 3, right, 3);

    printf("合并结果：");
    for (int t = 0; t < n; t++) {
        printf("%s%d", t ? " " : "", out[t]);
    }
    printf("，一共 %d 个（应该是 6 个，9 被丢了）\n", n);
    return 0;
}
```
```output
合并结果：1 2 3 4 7，一共 5 个（应该是 6 个，9 被丢了）
```

边界很能说明问题：左半区 `1 4 7` 用完时，右半区还剩 `9`，它是**整个数组的最大值**，只有这一个"搬剩余"的循环能把它带出来。

### 辅助数组用完忘了拷回原数组 [WA]
`tmp` 里排得好好的，函数返回后 `a` 却一点没变——递归上层再拿 `a` 去合并，用的还是原始顺序，最终结果"部分有序、部分乱"。修法只有一句：合并完立刻 `for (t = lo; t < hi; t++) a[t] = tmp[t];`。

### 合并时用 `<`，把稳定排序写成了不稳定排序 [WA]
`a[i] < a[j]` 时相等就取右边，等于把右半区里相同的键插到了左半区前面。排序结果仍然"有序"，但同键元素的相对顺序变了：多关键字排序会整体错位，按"先学号后分数"两步排出来的名单会乱。**归并排序的稳定性只由这一个符号决定**，写的时候要有意识。

### 区间写成闭区间却用 `mid + 1` 递归 [TLE]
`merge_sort(lo, hi)` 如果按**闭区间**理解（`hi` 是最后一个元素的下标），那么两半应该是 `[lo, mid]` 和 `[mid+1, hi]`；如果按**左闭右开**理解，则是 `[lo, mid)` 和 `[mid, hi)`。两种约定混用会出两种问题：区间算重 → 死循环；区间算漏 → 丢元素。建议全程统一用**左闭右开**（`hi - lo` 就是长度、`hi == lo` 就是空区间），这也是 C++ STL 的约定。

### 每次合并都 `malloc` 一块临时数组 [TLE|LEAK]
递归里 `malloc((hi - lo) * sizeof(int))` 再 `free`，`n = 2×10⁵` 时是 20 万次分配/释放：时间常数大得多，而且只要有一条 `return` 提前退出，那块内存就泄漏了。正确做法是排序前分配一次、所有递归层共用，或者用静态数组（数据范围已知时最简单）。

## 客观题

### q-s7-merge-sort-1 single
关于归并排序，下面哪个说法是正确的？

- [x] 最坏情况也是 O(n log n)，因为层数只由 n 决定，与输入顺序无关
  > 正确。归并排序每次都把区间从中间切开，`mid = lo + (hi - lo) / 2` 只和下标有关，和元素大小完全无关，所以层数恒为 `⌈log2 n⌉`；每层所有合并区间长度之和恒为 `n`。乘起来就是 `O(n log n)`，不存在"输入有序就退化"的情况——这正是它和快速排序最本质的区别。
- [ ] 它比快速排序快，因为它不需要比较元素大小
  > 错。归并排序当然要比较：合并时每次取较小的头部就是一次比较。它比快排"稳"（最坏也是 n log n）但通常略慢，因为要多写一块辅助数组，缓存局部性不如快排的原地划分。
- [ ] 它不需要额外空间，可以在原数组上原地合并
  > 错。两个有序区间的合并必须先把结果写到另一块内存：直接写回原数组会覆盖还没读取的元素。所以归并排序的额外空间是 `O(n)`（链表版本除外，链表只需改指针）。
- [ ] 它是稳定排序，因为它在合并时会给每个元素记一个原始下标
  > 错。归并排序的稳定性不需要任何额外记账，只取决于合并时"相等取左边"这一个选择（`a[i] <= a[j]` 取左）。反过来，写成 `a[i] < a[j]` 就变成不稳定排序了。
