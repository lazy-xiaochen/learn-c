---json
{
  "id": "p-s7-quick-sort-2",
  "title": "按接口实现快排的三块零件：Lomuto 划分、三路划分与整体排序",
  "difficulty": "L4",
  "knowledgePoints": ["s7-quick-sort"],
  "special": "ds-implementation",
  "judge": { "mode": "function", "timeMs": 2000, "compare": "lines" }
}
---

## 题目描述
快速排序难写的地方不是"递归"，而是**划分**：枢轴选哪个、等于枢轴的元素归哪边、划分结束后谁在什么位置。面试里让你"手写快排"，考的就是这三块零件。

测试驱动会用接口头文件 `sorting.h` 驱动你的实现，请你在 `solution.c` 里实现三个函数：

```c
/* 一次 Lomuto 划分：枢轴固定取 a[hi]。
   把 a[lo..hi] 重新排列成 a[lo..p-1] <= a[p] 且 a[p+1..hi] > a[p]，
   返回枢轴最终下标 p。保证 0 <= lo <= hi <= n-1。 */
int qs_partition(int *a, int lo, int hi);

/* 一次三路划分：枢轴固定取 a[lo]（先把它的值记下来）。
   把 a[lo..hi] 重新排列成三段：
     a[lo..*lt-1]  严格小于枢轴
     a[*lt..*gt]   全部等于枢轴
     a[*gt+1..hi]  严格大于枢轴
   写出 lt 和 gt。保证 0 <= lo <= hi <= n-1。 */
void qs_partition3(int *a, int lo, int hi, int *lt, int *gt);

/* 把 a[lo..hi] 从小到大原地排序。保证 0 <= lo <= hi <= n-1。 */
void qs_sort(int *a, int lo, int hi);
```

四条硬性要求：

1. **两个划分的后置条件必须严格成立**：测试驱动会对结果逐元素检查，不只是看"是不是有序"；
2. **划分只能重排、不能丢元素**：测试驱动会比对排序前后的多重集合，少一个元素或多一个元素都会被抓出来；
3. **`qs_sort` 要能处理大量重复元素**：隐藏用例里有 6 万个元素**全部相同**的输入。如果 `qs_sort` 直接拿 `qs_partition`（Lomuto，`<=` 都放左边）当划分，它每次只能削掉一个元素，比较次数是 `1.8×10⁹`，必然超时；
4. **不许调用库里的 `qsort`**：三个函数都要自己写。测试驱动会直接检查两个划分的后置条件，库函数帮不了你。

你只需要提交 `solution.c`，不要写 `main`，也不要提交 `sorting.h`。

## 输入格式
（由隐藏的测试驱动读取，供你理解测试方式）

第一行一个整数 `n`。
第二行 `n` 个整数。

## 输出格式
（由隐藏的测试驱动输出）共 12 行：

```
part_index=<qs_partition(0, n-1) 的返回值>
part_pivot_ok=<a[p] 等于原来的 a[n-1] 时为 1>
part_prop_ok=<a[0..p-1] <= a[p] 且 a[p+1..n-1] > a[p] 时为 1>
part_same_ok=<划分前后多重集合相同（元素没丢没多）时为 1>
p3_lt=<qs_partition3 写出的 lt>
p3_gt=<qs_partition3 写出的 gt>
p3_prop_ok=<小于 / 等于 / 大于三段都正确时为 1>
p3_same_ok=<三路划分前后多重集合相同时为 1>
sorted_ok=<升序且元素一个不差时为 1>
sorted_sum=<排序后所有元素之和>
sorted_head=<排序后前 5 个，空格分隔>
sorted_tail=<排序后后 5 个，空格分隔>
```

## 数据范围
1 ≤ n ≤ 60000
-10⁹ ≤ 每个元素 ≤ 10⁹，**可能有大量重复值**

最大输入约 660KB，在平台 1MB 的输入上限之内。

## 示例
### 示例 1
```in
7
7 2 9 4 3 8 5
```
```out
part_index=3
part_pivot_ok=1
part_prop_ok=1
part_same_ok=1
p3_lt=4
p3_gt=4
p3_prop_ok=1
p3_same_ok=1
sorted_ok=1
sorted_sum=38
sorted_head=2 3 4 5 7
sorted_tail=4 5 7 8 9
```
> Lomuto 的枢轴是 `a[6] = 5`，划分后数组是 `2 4 3 5 9 8 7`，枢轴落在下标 3。三路划分的枢轴是 `a[0] = 7`，划分后数组是 `2 5 4 3 7 8 9`，`[0,3]` 都小于 7、`[4,4]` 等于 7、`[5,6]` 都大于 7，所以 `lt=4`、`gt=4`。

### 示例 2（边界：只有一个元素）
```in
1
42
```
```out
part_index=0
part_pivot_ok=1
part_prop_ok=1
part_same_ok=1
p3_lt=0
p3_gt=0
p3_prop_ok=1
p3_same_ok=1
sorted_ok=1
sorted_sum=42
sorted_head=42
sorted_tail=42
```
> 只有一个元素时，两种划分都不需要移动任何东西：`p = lt = gt = 0`，两个空区间自动满足"全部小于"和"全部大于"。这类退化区间是划分最容易越界的地方（`lt = 0` 时 `a[lt-1]` 就是 `a[-1]`）。

## 提示
### 第 1 层
先把 Lomuto 写出来：`pivot = a[hi]`，`i = lo`，`j` 从 `lo` 扫到 `hi-1`，`a[j] <= pivot` 就交换 `a[i]` 和 `a[j]` 并让 `i` 前进；最后别忘 `swap(a[i], a[hi])` 并返回 `i`。**这一次交换是把枢轴放到最终位置的关键**，漏掉它 `part_pivot_ok` 就是 0。

### 第 2 层
三路划分用三个下标：`lt` 指向"小于区的下一个空位"、`i` 是扫描指针、`gt` 指向"大于区的前一个空位"。规则是：`a[i] < pivot` 和 `a[lt]` 交换、`lt++`、`i++`；`a[i] > pivot` 和 `a[gt]` 交换、`gt--`（**`i` 不动**，因为换过来的元素还没检查过）；相等就 `i++`。循环条件是 `i <= gt`。枢轴的值得先存进变量，因为它可能被换走。

### 第 3 层
`qs_sort` 有两种写法都能过：三路划分的递归（等于枢轴的一整段一次归位，重复元素再多也是 `O(n log n)`），或者 Hoare 双指针 + 三数取中。想清楚三件事：**每次递归区间必须严格变小**（否则死循环）、**枢轴本身要排除在递归之外**、**先递归小的那边、大的那边用 while 循环**（把栈深压到 `O(log n)`）。全等输入是照妖镜：写完拿 6 万个相同的数跑一遍，要么很快，要么直接卡死。

## 参考代码
```c file=solution.c
#include "sorting.h"

static void swap_int(int *x, int *y) {
    int t = *x;
    *x = *y;
    *y = t;
}

int qs_partition(int *a, int lo, int hi) {
    int pivot = a[hi];                  /* 枢轴拷一份，最后再放回去 */
    int i = lo;
    for (int j = lo; j < hi; j++) {
        if (a[j] <= pivot) {            /* 等于枢轴的都归左边 */
            swap_int(&a[i], &a[j]);
            i++;
        }
    }
    swap_int(&a[i], &a[hi]);            /* 把枢轴换到分界点：这一步不能漏 */
    return i;
}

void qs_partition3(int *a, int lo, int hi, int *lt, int *gt) {
    int pivot = a[lo];
    int left = lo;                      /* [lo, left) 严格小于枢轴 */
    int i = lo + 1;                     /* [left, i) 等于枢轴 */
    int right = hi;                     /* (right, hi] 严格大于枢轴 */
    while (i <= right) {
        if (a[i] < pivot) {
            swap_int(&a[left], &a[i]);
            left++;
            i++;
        } else if (a[i] > pivot) {
            swap_int(&a[i], &a[right]);
            right--;                    /* 换过来的元素还没检查，i 不动 */
        } else {
            i++;
        }
    }
    if (lt != 0) {
        *lt = left;
    }
    if (gt != 0) {
        *gt = right;
    }
}

/* 三路划分的递归：等于枢轴的一整段一次归位，重复元素多也快 */
static void sort_range(int *a, int lo, int hi) {
    while (lo < hi) {
        int lt = 0;
        int gt = 0;
        qs_partition3(a, lo, hi, &lt, &gt);
        if (lt - lo < hi - gt) {
            sort_range(a, lo, lt - 1);  /* 先递归小的一边 */
            lo = gt + 1;                /* 大的一边用循环 */
        } else {
            sort_range(a, gt + 1, hi);
            hi = lt - 1;
        }
    }
}

void qs_sort(int *a, int lo, int hi) {
    sort_range(a, lo, hi);
}
```

## 初始代码
```c file=solution.c
#include "sorting.h"

static void swap_int(int *x, int *y) {
    int t = *x;
    *x = *y;
    *y = t;
}

int qs_partition(int *a, int lo, int hi) {
    (void)a;
    (void)swap_int;
    /* TODO: pivot = a[hi]；j 从 lo 扫到 hi-1，a[j] <= pivot 就换到前面；
       最后 swap(a[i], a[hi]) 并返回 i */
    (void)lo;
    return hi;
}

void qs_partition3(int *a, int lo, int hi, int *lt, int *gt) {
    (void)a;
    /* TODO: 三下标扫描，写出 lt（小于区的结束位置 +1）和 gt（大于区的起始位置 -1） */
    if (lt != 0) {
        *lt = lo;
    }
    if (gt != 0) {
        *gt = lo;
    }
    (void)hi;
}

void qs_sort(int *a, int lo, int hi) {
    (void)a;
    (void)lo;
    (void)hi;
    /* TODO: 用三路划分（或 Hoare + 三数取中）递归排序；注意全等输入不能退化 */
}
```

## 测试驱动
```c file=sorting.h
#ifndef SORTING_H
#define SORTING_H

/* 一次 Lomuto 划分：枢轴固定取 a[hi]。
   a[lo..hi] 重排后满足 a[lo..p-1] <= a[p] 且 a[p+1..hi] > a[p]，
   返回枢轴最终下标 p。保证 0 <= lo <= hi <= n-1。 */
int qs_partition(int *a, int lo, int hi);

/* 一次三路划分：枢轴固定取 a[lo]。
   a[lo..hi] 重排后满足：
     a[lo..*lt-1] 严格小于枢轴
     a[*lt..*gt] 全部等于枢轴
     a[*gt+1..hi] 严格大于枢轴
   写出 lt 和 gt（lt、gt 都不会是 NULL）。保证 0 <= lo <= hi <= n-1。 */
void qs_partition3(int *a, int lo, int hi, int *lt, int *gt);

/* 把 a[lo..hi] 从小到大原地排序（升序）。保证 0 <= lo <= hi <= n-1。 */
void qs_sort(int *a, int lo, int hi);

#endif
```

```c file=harness.c hidden
#include <stdio.h>
#include <stdlib.h>
#include "sorting.h"

#define MAXN 60000
static int orig[MAXN];
static int work[MAXN];
static int scratch1[MAXN];
static int scratch2[MAXN];

static int cmp_int(const void *pa, const void *pb) {
    const int *x = pa;
    const int *y = pb;
    return (*x > *y) - (*x < *y);
}

/* 多重集合是否相同：各自排序后逐个比较（允许 a、b 是同一块内存） */
static int same_multiset(const int *a, const int *b, int n) {
    for (int i = 0; i < n; i++) {
        scratch1[i] = a[i];
        scratch2[i] = b[i];
    }
    qsort(scratch1, (size_t)n, sizeof scratch1[0], cmp_int);
    qsort(scratch2, (size_t)n, sizeof scratch2[0], cmp_int);
    for (int i = 0; i < n; i++) {
        if (scratch1[i] != scratch2[i]) {
            return 0;
        }
    }
    return 1;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &orig[i]) != 1) {
            return 0;
        }
    }

    /* ---------- 1. Lomuto 划分 ---------- */
    for (int i = 0; i < n; i++) {
        work[i] = orig[i];
    }
    int pivot = orig[n - 1];
    int p = qs_partition(work, 0, n - 1);
    int pivot_ok = (p >= 0 && p < n && work[p] == pivot) ? 1 : 0;
    int prop_ok = (p >= 0 && p < n) ? 1 : 0;
    if (prop_ok) {
        for (int i = 0; i < p; i++) {
            if (work[i] > work[p]) {
                prop_ok = 0;
            }
        }
        for (int i = p + 1; i < n; i++) {
            if (work[i] <= work[p]) {
                prop_ok = 0;
            }
        }
    }
    int same_ok = same_multiset(work, orig, n);
    printf("part_index=%d\n", p);
    printf("part_pivot_ok=%d\n", pivot_ok);
    printf("part_prop_ok=%d\n", prop_ok);
    printf("part_same_ok=%d\n", same_ok);

    /* ---------- 2. 三路划分 ---------- */
    for (int i = 0; i < n; i++) {
        work[i] = orig[i];
    }
    int pivot3 = orig[0];
    int lt = -1;
    int gt = -1;
    qs_partition3(work, 0, n - 1, &lt, &gt);
    int p3_ok = (lt >= 0 && gt <= n - 1 && lt <= gt + 1) ? 1 : 0;
    if (p3_ok) {
        for (int i = 0; i < lt; i++) {
            if (work[i] >= pivot3) {
                p3_ok = 0;
            }
        }
        for (int i = lt; i <= gt; i++) {
            if (work[i] != pivot3) {
                p3_ok = 0;
            }
        }
        for (int i = gt + 1; i < n; i++) {
            if (work[i] <= pivot3) {
                p3_ok = 0;
            }
        }
    }
    int p3_same = same_multiset(work, orig, n);
    printf("p3_lt=%d\n", lt);
    printf("p3_gt=%d\n", gt);
    printf("p3_prop_ok=%d\n", p3_ok);
    printf("p3_same_ok=%d\n", p3_same);

    /* ---------- 3. 整体排序 ---------- */
    for (int i = 0; i < n; i++) {
        work[i] = orig[i];
    }
    qs_sort(work, 0, n - 1);
    int sorted_ok = 1;
    for (int i = 1; i < n; i++) {
        if (work[i - 1] > work[i]) {
            sorted_ok = 0;
        }
    }
    if (!same_multiset(work, orig, n)) {
        sorted_ok = 0;
    }
    long long sum = 0;
    for (int i = 0; i < n; i++) {
        sum += work[i];
    }
    printf("sorted_ok=%d\n", sorted_ok);
    printf("sorted_sum=%lld\n", sum);
    printf("sorted_head=");
    for (int i = 0; i < n && i < 5; i++) {
        printf("%s%d", i ? " " : "", work[i]);
    }
    printf("\n");
    printf("sorted_tail=");
    int start = (n > 5) ? n - 5 : 0;
    for (int i = start; i < n; i++) {
        printf("%s%d", (i == start) ? "" : " ", work[i]);
    }
    printf("\n");
    return 0;
}
```

## 复杂度
`qs_partition`、`qs_partition3` 都是 `O(n)` 一趟扫描，`O(1)` 额外空间。
`qs_sort` 平均 `O(n log n)`；三路划分让"等于枢轴"的元素一次全部归位，因此重复元素再多也是 `O(n log n)`，最坏情况（枢轴恰好是极值）仍是 `O(n²)`。
空间：递归栈 `O(log n)`（先递归小的一边保证）。

## 常见错误
### `qs_sort` 直接用 Lomuto 划分，全等输入退化成 O(n²) [TLE]
`qs_partition` 的约定是"等于枢轴的都放左边"，所以全等数组每次划分只能把枢轴一个人归位，剩下的 `n-1` 个还要继续递归：比较次数 `n(n-1)/2`。`n = 60000` 时是 `1.8×10⁹` 次比较，`timeMs = 2000` 跑不完。

```c file=solution.c expect=TLE
#include "sorting.h"

static void swap_int(int *x, int *y) {
    int t = *x;
    *x = *y;
    *y = t;
}

int qs_partition(int *a, int lo, int hi) {
    int pivot = a[hi];
    int i = lo;
    for (int j = lo; j < hi; j++) {
        if (a[j] <= pivot) {
            swap_int(&a[i], &a[j]);
            i++;
        }
    }
    swap_int(&a[i], &a[hi]);
    return i;
}

void qs_partition3(int *a, int lo, int hi, int *lt, int *gt) {
    int pivot = a[lo];
    int left = lo;
    int i = lo + 1;
    int right = hi;
    while (i <= right) {
        if (a[i] < pivot) {
            swap_int(&a[left], &a[i]);
            left++;
            i++;
        } else if (a[i] > pivot) {
            swap_int(&a[i], &a[right]);
            right--;
        } else {
            i++;
        }
    }
    if (lt != 0) {
        *lt = left;
    }
    if (gt != 0) {
        *gt = right;
    }
}

/* 错：直接用 Lomuto 递归，全等数组退化成 O(n²) */
static void sort_range(int *a, int lo, int hi) {
    if (lo >= hi) {
        return;
    }
    int p = qs_partition(a, lo, hi);
    sort_range(a, lo, p - 1);
    sort_range(a, p + 1, hi);
}

void qs_sort(int *a, int lo, int hi) {
    sort_range(a, lo, hi);
}
```

### 划分结束忘了把枢轴换回分界点 [WA]
循环结束后 `a[i]` 位置上的元素是"第一个大于枢轴的元素"，枢轴还躺在 `a[hi]`。少了 `swap(a[i], a[hi])` 这一步，`p = i` 指向的值根本不是枢轴（`part_pivot_ok=0`），而且 `a[p+1..hi]` 里会混进小于等于枢轴的元素（`part_prop_ok=0`）。

```c file=solution.c expect=WA
#include "sorting.h"

static void swap_int(int *x, int *y) {
    int t = *x;
    *x = *y;
    *y = t;
}

int qs_partition(int *a, int lo, int hi) {
    int pivot = a[hi];
    int i = lo;
    for (int j = lo; j < hi; j++) {
        if (a[j] <= pivot) {
            swap_int(&a[i], &a[j]);
            i++;
        }
    }
    return i;                           /* 错：漏了 swap(a[i], a[hi]) */
}

void qs_partition3(int *a, int lo, int hi, int *lt, int *gt) {
    int pivot = a[lo];
    int left = lo;
    int i = lo + 1;
    int right = hi;
    while (i <= right) {
        if (a[i] < pivot) {
            swap_int(&a[left], &a[i]);
            left++;
            i++;
        } else if (a[i] > pivot) {
            swap_int(&a[i], &a[right]);
            right--;
        } else {
            i++;
        }
    }
    if (lt != 0) {
        *lt = left;
    }
    if (gt != 0) {
        *gt = right;
    }
}

static void sort_range(int *a, int lo, int hi) {
    while (lo < hi) {
        int lt = 0;
        int gt = 0;
        qs_partition3(a, lo, hi, &lt, &gt);
        if (lt - lo < hi - gt) {
            sort_range(a, lo, lt - 1);
            lo = gt + 1;
        } else {
            sort_range(a, gt + 1, hi);
            hi = lt - 1;
        }
    }
}

void qs_sort(int *a, int lo, int hi) {
    sort_range(a, lo, hi);
}
```

### 三路划分里"大于区"交换之后又让 `i` 前进 [WA]
`a[i] > pivot` 时把 `a[i]` 和 `a[right]` 交换，`right--`。此时换到 `a[i]` 的那个元素**从没被检查过**，如果紧接着 `i++` 就把它跳过了——三段的后置条件必然被破坏（`p3_prop_ok=0`），而且可能把一个大元素留在"小于区"里。正确做法是 `i` 原地不动，下一轮重新检查 `a[i]`。

```c file=solution.c expect=WA
#include "sorting.h"

static void swap_int(int *x, int *y) {
    int t = *x;
    *x = *y;
    *y = t;
}

int qs_partition(int *a, int lo, int hi) {
    int pivot = a[hi];
    int i = lo;
    for (int j = lo; j < hi; j++) {
        if (a[j] <= pivot) {
            swap_int(&a[i], &a[j]);
            i++;
        }
    }
    swap_int(&a[i], &a[hi]);
    return i;
}

void qs_partition3(int *a, int lo, int hi, int *lt, int *gt) {
    int pivot = a[lo];
    int left = lo;
    int i = lo + 1;
    int right = hi;
    while (i <= right) {
        if (a[i] < pivot) {
            swap_int(&a[left], &a[i]);
            left++;
            i++;
        } else if (a[i] > pivot) {
            swap_int(&a[i], &a[right]);
            right--;
            i++;                        /* 错：换过来的元素还没检查过 */
        } else {
            i++;
        }
    }
    if (lt != 0) {
        *lt = left;
    }
    if (gt != 0) {
        *gt = right;
    }
}

static void sort_range(int *a, int lo, int hi) {
    while (lo < hi) {
        int lt = 0;
        int gt = 0;
        qs_partition3(a, lo, hi, &lt, &gt);
        if (lt - lo < hi - gt) {
            sort_range(a, lo, lt - 1);
            lo = gt + 1;
        } else {
            sort_range(a, gt + 1, hi);
            hi = lt - 1;
        }
    }
}

void qs_sort(int *a, int lo, int hi) {
    sort_range(a, lo, hi);
}
```

### `qs_partition` 里把 `<=` 写成 `<` [WA]
改成 `<` 之后，等于枢轴的元素会留在右边，于是 `a[p+1..hi]` 里出现等于 `a[p]` 的元素，`part_prop_ok` 直接变 0。更隐蔽的后果是：即使你"感觉"排序结果是对的，划分的契约已经被破坏，依赖这个契约的 `qs_sort` 在重复元素多时会判断错枢轴的位置。

### `qs_sort` 递归区间没缩小，死循环 [TLE]
三路划分后左边是 `[lo, lt-1]`、右边是 `[gt+1, hi]`。如果写成 `[lo, lt]` 或 `[gt, hi]`，当 `lt == lo`（没有元素小于枢轴）时左区间还是 `[lo, hi]` 的原样，递归永远不缩小。判断标准只有一条：**每次递归传给自己的区间长度必须严格小于当前区间长度**。

## 测试用例
### 01 sample 示例 1
```in
7
7 2 9 4 3 8 5
```
```out
part_index=3
part_pivot_ok=1
part_prop_ok=1
part_same_ok=1
p3_lt=4
p3_gt=4
p3_prop_ok=1
p3_same_ok=1
sorted_ok=1
sorted_sum=38
sorted_head=2 3 4 5 7
sorted_tail=4 5 7 8 9
```

### 02 sample 示例 2
```in
1
42
```
```out
part_index=0
part_pivot_ok=1
part_prop_ok=1
part_same_ok=1
p3_lt=0
p3_gt=0
p3_prop_ok=1
p3_same_ok=1
sorted_ok=1
sorted_sum=42
sorted_head=42
sorted_tail=42
```

### 生成 stress 全等、大量重复与最大规模
```js gen
const cases = [];

/* 独立复现两个划分的语义（枢轴位置是接口规定的，所以结果唯一确定） */
function lomuto(a, lo, hi) {
  const v = a.slice();
  const pivot = v[hi];
  let i = lo;
  for (let j = lo; j < hi; j++) {
    if (v[j] <= pivot) {
      [v[i], v[j]] = [v[j], v[i]];
      i++;
    }
  }
  [v[i], v[hi]] = [v[hi], v[i]];
  return { arr: v, p: i };
}

function threeWay(a, lo, hi) {
  const v = a.slice();
  const pivot = v[lo];
  let left = lo;
  let i = lo + 1;
  let right = hi;
  while (i <= right) {
    if (v[i] < pivot) {
      [v[left], v[i]] = [v[i], v[left]];
      left++;
      i++;
    } else if (v[i] > pivot) {
      [v[i], v[right]] = [v[right], v[i]];
      right--;
    } else {
      i++;
    }
  }
  return { arr: v, lt: left, gt: right };
}

function render(vals) {
  const n = vals.length;
  const l = lomuto(vals, 0, n - 1);
  const t = threeWay(vals, 0, n - 1);
  const sorted = vals.slice().sort((x, y) => x - y);
  let sum = 0;
  for (const v of sorted) sum += v;
  return [
    `part_index=${l.p}`,
    'part_pivot_ok=1',
    'part_prop_ok=1',
    'part_same_ok=1',
    `p3_lt=${t.lt}`,
    `p3_gt=${t.gt}`,
    'p3_prop_ok=1',
    'p3_same_ok=1',
    'sorted_ok=1',
    `sorted_sum=${sum}`,
    `sorted_head=${sorted.slice(0, 5).join(' ')}`,
    `sorted_tail=${sorted.slice(-5).join(' ')}`,
  ].join('\n') + '\n';
}

function io(vals) {
  return { input: `${vals.length}\n${vals.join(' ')}\n`, output: render(vals) };
}

/* trap：60000 个元素全部相同 —— Lomuto 递归会退化，三路划分一趟搞定 */
{
  const vals = new Array(60000).fill(-7);
  cases.push({ kind: 'trap', category: '60000 个元素全部相同', ...io(vals) });
}

/* boundary：60000 个随机元素，最大规模 */
{
  const vals = [];
  for (let i = 0; i < 60000; i++) vals.push(rng.int(-1000000000, 1000000000));
  cases.push({ kind: 'boundary', category: '60000 个 10⁹ 范围的随机元素', ...io(vals) });
}

/* trap：只有 3 种取值，重复极多（考"等于枢轴"这一段） */
{
  const vals = [];
  const pool = [-1000000000, 0, 1000000000];
  for (let i = 0; i < 20000; i++) vals.push(pool[rng.int(0, 2)]);
  cases.push({ kind: 'trap', category: '20000 个元素只取自 3 个值', ...io(vals) });
}

/* trap：严格递增（枢轴取最后一个时是最坏情况） */
{
  const vals = [];
  for (let i = 0; i < 20000; i++) vals.push(i * 3 - 30000);
  cases.push({ kind: 'trap', category: '20000 个严格递增元素', ...io(vals) });
}

/* degenerate：两个相同的元素 */
{
  const vals = [5, 5];
  cases.push({ kind: 'degenerate', category: '两个相同的元素', ...io(vals) });
}

/* degenerate：两个元素，逆序 */
{
  const vals = [9, -9];
  cases.push({ kind: 'degenerate', category: '两个元素逆序', ...io(vals) });
}

/* normal：3000 个随机元素，含一些重复 */
{
  const vals = [];
  for (let i = 0; i < 3000; i++) vals.push(rng.int(-50, 50));
  cases.push({ kind: 'normal', category: '3000 个 -50..50 的随机元素', ...io(vals) });
}

return cases;
```
