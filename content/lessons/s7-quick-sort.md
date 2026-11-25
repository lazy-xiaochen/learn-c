---
id: s7-quick-sort
---

## 讲解

### 快排的全部精髓是一个"划分"动作
快速排序只做两件事：**选一个枢轴（pivot），把数组划成"不大于枢轴"和"大于枢轴"两堆**；然后对两堆分别重复。划分做对了，排序就自动正确——因为枢轴落到了它在最终有序数组里的位置上，而且这个位置**以后不会再有元素跨过它**。

最常教的写法是 Lomuto 划分（枢轴取区间最后一个元素）：

```text
pivot = a[hi]                 /* 先拷一份到变量里，别用 a[hi] 反复比较 */
i = lo                        /* i 是"下一个不大于枢轴的元素该放的位置" */
for j = lo .. hi-1:
    if a[j] <= pivot:         /* 小于等于都归左边 */
        swap(a[i], a[j]); i++
swap(a[i], a[hi])             /* 把枢轴换到分界点 */
return i                      /* 枢轴最终下标：左边全 <= a[i]，右边全 > a[i] */
```

把每一步都打印出来，可以清楚看到 `i` 只在"发现一个不大于枢轴的元素"时前进，而 `j` 是无条件扫过整个区间：

```c run id=qs-partition-trace
#include <stdio.h>

static void swap_int(int *x, int *y) {
    int t = *x;
    *x = *y;
    *y = t;
}

static void show(const int *a, int n) {
    for (int k = 0; k < n; k++) {
        printf("%s%d", k ? " " : "", a[k]);
    }
    printf("\n");
}

static int partition_trace(int *a, int lo, int hi) {
    int pivot = a[hi];
    printf("枢轴 = a[%d] = %d（先拷一份到变量里，之后比较的全是这份副本）\n", hi, pivot);
    int i = lo;
    for (int j = lo; j < hi; j++) {
        if (a[j] <= pivot) {
            if (i != j) {
                printf("j=%d：a[%d]=%d <= %d，交换 a[%d] 与 a[%d] → ", j, j, a[j], pivot, i, j);
                swap_int(&a[i], &a[j]);
                show(a, hi + 1);
            }
            i++;
        }
    }
    printf("把枢轴从 a[%d] 换到 a[%d] → ", hi, i);
    swap_int(&a[i], &a[hi]);
    show(a, hi + 1);
    return i;
}

int main(void) {
    int a[] = { 7, 2, 9, 4, 3, 8, 5 };
    int n = (int)(sizeof a / sizeof a[0]);

    int p = partition_trace(a, 0, n - 1);
    printf("枢轴最终下标 %d：左边 %d 个都 <= %d，右边 %d 个都 > %d\n",
           p, p, a[p], n - 1 - p, a[p]);
    return 0;
}
```
```output
枢轴 = a[6] = 5（先拷一份到变量里，之后比较的全是这份副本）
j=1：a[1]=2 <= 5，交换 a[0] 与 a[1] → 2 7 9 4 3 8 5
j=3：a[3]=4 <= 5，交换 a[1] 与 a[3] → 2 4 9 7 3 8 5
j=4：a[4]=3 <= 5，交换 a[2] 与 a[4] → 2 4 3 7 9 8 5
把枢轴从 a[6] 换到 a[3] → 2 4 3 5 9 8 7
枢轴最终下标 3：左边 3 个都 <= 5，右边 3 个都 > 5
```

注意 `j=0` 和 `j=5` 这两次：`7 > 5`、`8 > 5`，所以 `i` 不动。划分结束时 `[0,3)` 全是 `<= 5`，`(3,6]` 全是 `> 5`，枢轴 `5` 被放在下标 3——而 `5` 在完全排好序的数组里本来就该在下标 3。这就是"**枢轴归位**"，也是快排不需要额外空间的根本原因：

```memory title="划分结束后 a 在内存里的样子（地址为示意，数组是连续的 7 个 int）"
地址 | 内容 | 变量 | 说明
0x0061fea0 | 2 | a[0] | 划分后的左区：全部 <= 枢轴
0x0061fea4 | 4 | a[1] | 每个 int 相邻 4 字节
0x0061fea8 | 3 | a[2] | 左区一共 3 个元素
0x0061feac | 5 | a[3] | 枢轴落点：它以后不会再移动
0x0061feb0 | 9 | a[4] | 划分后的右区：全部 > 枢轴
0x0061feb4 | 8 | a[5] | 右区还没排序
0x0061feb8 | 7 | a[6] | 右区还没排序
栈（4 字节） | 5 | pivot | 枢轴的副本：划分过程中比较的是它
栈（4 字节） | 3 | i | 下一个"<= 枢轴"的元素该放的下标
栈（4 字节） | 6 | j | 扫描下标，无条件扫完 lo..hi-1
```

### 为什么最坏是 O(n²)：枢轴每次都挑到最差的
划分本身是 `Θ(n)`：`j` 从 `lo` 扫到 `hi-1`，每个元素恰好比较一次。所以总代价 = 各层划分的长度之和。**如果每次划分都能把区间对半分**，层数是 `log2 n`，总比较次数约 `n log2 n`；但如果枢轴每次都是当前区间的最大值或最小值，划分出来一边是 `n-1` 个元素、另一边是空的，层数就变成 `n`，总比较次数变成

```text
(n-1) + (n-2) + ... + 1 + 0 = n(n-1)/2 = O(n²)
```

"枢轴取最后一个元素"这个写法，遇到**已经有序的输入**就正好踩中最坏情况：最后一个元素是最大值，划分后左边是 `n-1` 个、右边 0 个，递归深度也变成 `n`。下面数一数比较次数和递归深度：

```c run id=qs-worst-case
#include <stdio.h>

#define N 1000
static int s1[N];
static int s2[N];
static long long c1;
static long long c2;
static int d1;
static int d2;

static void swap_int(int *x, int *y) {
    int t = *x;
    *x = *y;
    *y = t;
}

/* 每比较一次就记一次账 */
static int lt_lomuto(int a, int b) {
    c1++;
    return a < b;
}
static int lt_med3(int a, int b) {
    c2++;
    return a < b;
}

/* 写法一：枢轴取最后一个元素（Lomuto） */
static void lomuto_sort(int *a, int lo, int hi, int depth) {
    if (lo >= hi) {
        return;
    }
    if (depth > d1) {
        d1 = depth;
    }
    int pivot = a[hi];
    int i = lo;
    for (int j = lo; j < hi; j++) {
        if (!lt_lomuto(pivot, a[j])) {      /* a[j] <= pivot */
            swap_int(&a[i], &a[j]);
            i++;
        }
    }
    swap_int(&a[i], &a[hi]);
    lomuto_sort(a, lo, i - 1, depth + 1);
    lomuto_sort(a, i + 1, hi, depth + 1);
}

/* 写法二：三数取中 + 双指针（Hoare），把中位数换到最左边当枢轴 */
static void med3_sort(int *a, int lo, int hi, int depth) {
    if (lo >= hi) {
        return;
    }
    if (depth > d2) {
        d2 = depth;
    }
    int mid = lo + (hi - lo) / 2;
    if (lt_med3(a[mid], a[lo])) {
        swap_int(&a[mid], &a[lo]);
    }
    if (lt_med3(a[hi], a[mid])) {
        swap_int(&a[hi], &a[mid]);
    }
    if (lt_med3(a[mid], a[lo])) {
        swap_int(&a[mid], &a[lo]);
    }
    swap_int(&a[mid], &a[lo]);              /* 中位数 → a[lo] */
    int pivot = a[lo];
    int i = lo - 1;
    int j = hi + 1;
    for (;;) {
        do {
            i++;
        } while (lt_med3(a[i], pivot));
        do {
            j--;
        } while (lt_med3(pivot, a[j]));
        if (i >= j) {
            break;
        }
        swap_int(&a[i], &a[j]);
    }
    med3_sort(a, lo, j, depth + 1);         /* 左边 [lo, j] */
    med3_sort(a, j + 1, hi, depth + 1);     /* 右边 [j+1, hi] */
}

int main(void) {
    for (int i = 0; i < N; i++) {
        s1[i] = i + 1;                      /* 已经有序：最坏的输入 */
        s2[i] = i + 1;
    }
    lomuto_sort(s1, 0, N - 1, 1);
    med3_sort(s2, 0, N - 1, 1);
    printf("对已经有序的 %d 个元素排序：\n", N);
    printf("  枢轴取最后一个（Lomuto）：比较 %lld 次，最大递归深度 %d\n", c1, d1);
    printf("  三数取中 + 双指针（Hoare）：比较 %lld 次，最大递归深度 %d\n", c2, d2);
    printf("  理论最坏值 n(n-1)/2 = %lld\n", (long long)N * (N - 1) / 2);
    return 0;
}
```
```output
对已经有序的 1000 个元素排序：
  枢轴取最后一个（Lomuto）：比较 499500 次，最大递归深度 999
  三数取中 + 双指针（Hoare）：比较 14801 次，最大递归深度 11
  理论最坏值 n(n-1)/2 = 499500
```

第一行的 `499500` 就是 `1000 × 999 / 2`，与"完全有序"的推导一致；深度 `999` 说明递归没有任何"对半分"，等于对一条链做操作——`n` 再大 10 倍，比较次数就是 100 倍，这就是从 `O(n log n)` 掉到 `O(n²)` 的全过程。

第二行是同样的输入、只换了枢轴策略：`14801` 次比较、深度 `11`（约 `log2 1000`），因为三数取中把中位数换到最左边，有序输入每次都能对半分。注意**它并不是"不会退化"**——只要构造一份专门针对三数取中的输入，仍然能把它打回 O(n²)；工程界的做法是不再赌输入，改用"递归深度超过 `2 log2 n` 就切堆排序"的内省排序（introsort），这也是标准库 `qsort` 的常见实现策略。

另外还有两个防止栈溢出的细节值得记住：

- **先递归小的那边，大的那边用循环**（尾递归改写成 while）。这样栈深度不会超过 `log2 n` 量级，即使划分很不均匀也不会爆栈；
- 枢轴**必须先拷一份到变量里**再交换，否则枢轴被换走后后续比较的对象就不是原来那个值了。

### 为什么平均是 O(n log n)：随机输入下划分"平均"对半分
对随机排列来说，枢轴的排名在 `0..n-1` 上近似均匀分布。设划分后左区有 `k` 个元素，递推式是 `T(n) = T(k) + T(n-1-k) + n`。把 `k` 均匀平均掉，可以证明平均代价约 `2n ln n ≈ 1.39 n log2 n`——比 `n log2 n` 只多一个常数因子。直觉是这样的：

- 每层所有划分区间的长度加起来总是 `n`（每次划分只扫自己的区间，区间之间不重叠）；
- 平均层数是 `2 ln n` 量级，而不是 `log2 n`，因为划分位置随机、不完全居中；
- 两个因子相乘得到约 `2n ln n`。

所以"快排很快"的真实含义是：**平均常数小、原地、缓存友好**。它不需要额外数组，划分时顺序扫描内存，这正是它比归并排序在实践中更快的原因。

### 大量重复元素：等于枢轴的元素归到哪边
Lomuto 用 `a[j] <= pivot` 把所有等于枢轴的元素都放到左边。如果数组里**全部元素相同**，每次划分后左边都是 `n-1` 个、右边 0 个，又退化成 `O(n²)`：

```c run id=qs-duplicates
#include <stdio.h>

#define N 2000
static int a[N];
static int b[N];
static long long cmps;

static void swap_int(int *x, int *y) {
    int t = *x;
    *x = *y;
    *y = t;
}

/* Lomuto：等于枢轴的放左边 */
static void lomuto_sort(int *v, int lo, int hi) {
    if (lo >= hi) {
        return;
    }
    int pivot = v[hi];
    int i = lo;
    for (int j = lo; j < hi; j++) {
        cmps++;
        if (v[j] <= pivot) {
            swap_int(&v[i], &v[j]);
            i++;
        }
    }
    swap_int(&v[i], &v[hi]);
    lomuto_sort(v, lo, i - 1);
    lomuto_sort(v, i + 1, hi);
}

/* 三路划分：< 枢轴 / == 枢轴 / > 枢轴，一趟就把相等的元素全部归位 */
static void three_way_sort(int *v, int lo, int hi) {
    if (lo >= hi) {
        return;
    }
    int pivot = v[lo];
    int lt = lo;                            /* [lo, lt) 全部 < pivot */
    int i = lo + 1;                         /* [lt, i) 全部 == pivot */
    int gt = hi;                            /* (gt, hi] 全部 > pivot */
    while (i <= gt) {
        cmps++;
        if (v[i] < pivot) {
            swap_int(&v[lt], &v[i]);
            lt++;
            i++;
        } else if (v[i] > pivot) {
            swap_int(&v[i], &v[gt]);
            gt--;
        } else {
            i++;
        }
    }
    three_way_sort(v, lo, lt - 1);
    three_way_sort(v, gt + 1, hi);
}

int main(void) {
    for (int i = 0; i < N; i++) {
        a[i] = 7;                           /* 全部相同 */
        b[i] = 7;
    }
    cmps = 0;
    lomuto_sort(a, 0, N - 1);
    long long c_lomuto = cmps;

    cmps = 0;
    three_way_sort(b, 0, N - 1);
    long long c_three = cmps;

    printf("全部相同的 %d 个元素：\n", N);
    printf("  Lomuto（<= 放左边）：比较 %lld 次\n", c_lomuto);
    printf("  三路划分（< / == / >）：比较 %lld 次\n", c_three);
    printf("  三路划分之后 [lt, gt] 里全是等于枢轴的元素，下次递归不会再碰它们\n");
    return 0;
}
```
```output
全部相同的 2000 个元素：
  Lomuto（<= 放左边）：比较 1999000 次
  三路划分（< / == / >）：比较 1999 次
  三路划分之后 [lt, gt] 里全是等于枢轴的元素，下次递归不会再碰它们
```

`1999000 = 2000 × 1999 / 2`，又是最坏情况；而三路划分一趟就把 2000 个元素全部判定为"等于枢轴"，**一次递归都不需要**，只比较 `1999` 次。这就是"重复元素多时用三路划分"的定量理由。

### 快排不稳定：同分记录的相对顺序会被打乱
稳定性指"键相等的元素保持原来的先后顺序"。快排的交换是**长距离**的：`swap(a[i], a[j])` 里的两个下标可能隔很远，被跨过的元素顺序就乱了。看一个具体的例子——4 条记录，其中学号 1 和 2 的分数相同：

```c run id=qs-stability
#include <stdio.h>

typedef struct {
    int id;
    int score;
} Rec;

static void swap_rec(Rec *x, Rec *y) {
    Rec t = *x;
    *x = *y;
    *y = t;
}

/* 只按分数比较：相等的记录谁先谁后由划分过程决定 */
static void lomuto_rec(Rec *v, int lo, int hi) {
    if (lo >= hi) {
        return;
    }
    int pivot = v[hi].score;
    int i = lo;
    for (int j = lo; j < hi; j++) {
        if (v[j].score <= pivot) {
            swap_rec(&v[i], &v[j]);
            i++;
        }
    }
    swap_rec(&v[i], &v[hi]);
    lomuto_rec(v, lo, i - 1);
    lomuto_rec(v, i + 1, hi);
}

static void show(const char *tag, const Rec *v, int n) {
    printf("%s", tag);
    for (int k = 0; k < n; k++) {
        printf("%s%d:%d", k ? " " : "", v[k].id, v[k].score);
    }
    printf("\n");
}

int main(void) {
    Rec a[] = { { 1, 85 }, { 2, 85 }, { 3, 90 }, { 4, 80 } };
    int n = (int)(sizeof a / sizeof a[0]);

    show("输入（学号:分数）：", a, n);
    printf("按分数升序、且保持同学号原有顺序的话应该是：4:80 1:85 2:85 3:90\n");
    lomuto_rec(a, 0, n - 1);
    show("快排（Lomuto）实际排出来：", a, n);
    return 0;
}
```
```output
输入（学号:分数）：1:85 2:85 3:90 4:80
按分数升序、且保持同学号原有顺序的话应该是：4:80 1:85 2:85 3:90
快排（Lomuto）实际排出来：4:80 2:85 1:85 3:90
```

`1` 和 `2` 的分数相同，快排把它们换了位置。工程上有两种应对：**要么保证比较函数给出全序**（例如分数相同时再比学号，这样"相等"的元素根本不存在，稳定性就无所谓了）；**要么改用稳定排序**（归并排序天然稳定）。用 `qsort` 时尤其要注意：C 标准明确说 `qsort` **不保证稳定**。

### 和 qsort 的关系
标准库的 `qsort` 声明是：

```c
void qsort(void *base, size_t nmemb, size_t size, int (*compar)(const void *, const void *));
```

它是"对任意类型都能排"的通用实现，通常内部是内省排序（快排 + 堆排兜底 + 小数组用插入排序），并不是纯快排。自己手写快排的价值在于：**理解划分、理解最坏情况、理解为什么"平均快"和"保证快"是两件事**。刷题或面试时把这两点讲清楚，比背代码更有用。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra -g qs.c -o qs
./qs
```

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=address,undefined qs.c -o qs
./qs
```

几个调试建议：

- 写 `partition` 时先用小数组（8～10 个元素）打印每一步，肉眼确认"枢轴归位"再上大数组；
- 用 `-fsanitize=address` 抓越界：双指针写法 `while (a[++i] < pivot)` 非常容易冲出区间，ASan 会直接报 `stack-buffer-overflow`；
- 用已经有序、完全逆序、全部相同这三种输入各跑一遍——它们是快排的"三个照妖镜"，能在 1 秒内暴露最坏情况和死循环；
- 大数组测试时加 `-Wl,--stack,67108864`（Windows 默认栈只有 1MB），否则不均匀划分导致的深递归会先崩在栈溢出上，而不是超时。

## 常见错误

### 双指针扫描没有哨兵，下标冲出数组 [RE]
Hoare 划分里两个 `while` 靠"枢轴自己会挡住指针"来保证不越界：枢轴在最左端时，`j` 一定会停在 `lo`；枢轴在最右端时，`i` 一定会停在 `hi`。这条保命性质依赖"枢轴**不算**在要扫过去的元素里"。如果写成 `<=`，枢轴自己也会被扫过去，遇到全部相同的元素就一路冲出数组：

```c run id=qs-runaway expect=RE
#include <stdio.h>

static void partition_wrong(int *a, int lo, int hi) {
    int pivot = a[lo];
    int i = lo;
    while (a[i] <= pivot) {     /* 错：<= 把枢轴自己也算进"要跳过"的一侧 */
        i++;
    }
    (void)hi;
    printf("停在下标 %d\n", i);
}

int main(void) {
    int a[] = { 5, 5, 5 };      /* 全部等于枢轴：<= 会让 i 越过末尾 */
    partition_wrong(a, 0, 2);
    return 0;
}
```

正确写法是至少前进一次、并且用严格不等号：`do { i++; } while (a[i] < pivot);`——这样枢轴本身一定会挡住指针。ASan 会在读 `a[3]` 的那一刻报 `stack-buffer-overflow`（本平台判 `RE`）。

### 交换函数写成值传递，数组根本没变 [WA]
`swap(a[i], a[j])` 只交换了两个副本，原数组一位都没动。这种错误**不会报错、不会崩溃**，只是排出来的结果是错的——而且在小数组上很容易被"看起来差不多"骗过去。

```c run id=qs-swap-by-value
#include <stdio.h>

/* 错：形参是副本，交换的是副本 */
static void swap_wrong(int x, int y) {
    int t = x;
    x = y;
    y = t;
}

int main(void) {
    int a[] = { 3, 1, 2 };
    swap_wrong(a[0], a[2]);
    printf("调用 swap_wrong(a[0], a[2]) 之后：%d %d %d\n", a[0], a[1], a[2]);
    printf("想交换数组元素，必须传地址：swap(&a[0], &a[2])\n");
    return 0;
}
```
```output
调用 swap_wrong(a[0], a[2]) 之后：3 1 2
想交换数组元素，必须传地址：swap(&a[0], &a[2])
```

### 枢轴取最后一个元素，遇到有序输入就 TLE [TLE]
`partition` 本身没错，错在"枢轴的选择"和"输入的分布"撞上了：有序（或完全逆序）输入下，每次划分都只能削掉一个元素，比较次数是 `n(n-1)/2`。`n = 2×10⁵` 时是 2×10¹⁰ 次比较，任何机器都跑不完。改法有三种：随机选枢轴、三数取中、三路划分；再配合"先递归小的那边"，把栈深度也压到 `O(log n)`。

### 划分后枢轴又被包含进递归区间 [TLE]
`partition` 返回 `p` 之后，两边必须是 `[lo, p-1]` 和 `[p+1, hi]`。如果写成 `[lo, p]`，当 `p == lo` 时左区间还是原来的 `[lo, hi]`，递归永远不缩小，直接死循环（本平台判 `TLE`）。判断依据很简单：**每次递归调用的区间长度必须严格小于当前区间长度**。

### 递归时只处理了一边 [WA]
把 `quick_sort(a, lo, p - 1);` 写完就 `return`，右半边永远不排。这类错误的特征是"输出里有一半是有序的、另一半是原样"，一眼就能看出来。写完先拿 8 个元素的乱序数组手工验证一遍，比直接上大测试快得多。

## 客观题

### q-s7-quick-sort-1 single
用 Lomuto 划分（枢轴取区间最后一个元素，`a[j] <= pivot` 放左边），对一个长度为 `n` 的**已经升序排好**的数组做快速排序。下面哪个说法正确？

- [x] 每次划分只削掉 1 个元素，总比较次数是 `n(n-1)/2`，退化成 O(n²)
  > 正确。升序数组里最后一个元素是区间最大值，`a[j] <= pivot` 对每个 `j` 都成立，于是 `i` 一路跟着 `j` 走，划分结果是"左边 n-1 个、右边 0 个"，枢轴只归位了一个元素。递归下去就是 (n-1)+(n-2)+…+1 = n(n-1)/2 次比较，递归深度也是 n——这就是快排的最坏情况，而且它偏偏发生在"输入已经有序"这种最常见的场景上。
- [ ] 因为数组已经有序，快排会提前发现并直接返回，比较次数是 O(n)
  > 错。Lomuto 划分没有任何"检测已有序"的逻辑，它一定会扫完 `lo..hi-1` 并做一次枢轴交换。提前退出是插入排序之类的算法才有的性质（还有"自适应"的 Timsort），快排不检查顺序。
- [ ] 比较次数不变，仍然是 O(n log n)，只是交换次数变多
  > 错。快排的代价主要来自比较，而比较次数直接等于"各层划分长度之和"。划分不平衡时层数从 `log2 n` 变成 `n`，长度之和从 `n log2 n` 变成 `n²/2`，比较次数和交换次数是一起爆炸的。
- [ ] 换成三路划分就能保证任何输入都是 O(n log n)
  > 错。三路划分解决的是"大量重复元素"退化（等于枢轴的元素一趟全部归位），但对"枢轴每次都挑到最值"这种退化没有任何帮助——有序输入配三数取中已经好很多，可只要刻意构造输入仍能打回 O(n²)。要"保证" O(n log n) 只能换成堆排序或归并排序，或者像内省排序那样在深度超标时切换算法。
