---
id: s7-binary-search
---

## 讲解

### 二分的本质：每次砍掉一半"不可能"的区间
二分查找能成立的唯一前提是**单调性**：数据有序（或不减）。有了单调性，才能从"`a[mid]` 与目标的大小关系"推断出**一整段区间**里都没有答案，从而把搜索范围砍掉一半。

具体来说，在升序数组里：

- 若 `a[mid] < target`，那么 `a[0..mid]` 全部 `< target`，答案只可能在 `mid` 右边；
- 若 `a[mid] > target`，那么 `a[mid..n-1]` 全部 `> target`，答案只可能在 `mid` 左边；
- 若 `a[mid] == target`，找到了。

每次砍一半，最多砍 `⌈log2 n⌉` 次。`n = 10⁹` 也只要 30 次比较——这是"用有序性换时间"的典型：排序花 `O(n log n)`，之后每次查询只要 `O(log n)`。

把每一步打印出来，能看见区间怎么"对折"：

```c run id=bs-trace
#include <stdio.h>

/* 左闭右闭区间 [lo, hi]：hi 是"还能可能是答案"的最后一个下标 */
static int search_trace(const int *a, int n, int target) {
    int lo = 0;
    int hi = n - 1;                        /* 注意是 n-1，不是 n */
    int steps = 0;

    while (lo <= hi) {                     /* 闭区间：lo == hi 时还有一个元素要查 */
        int mid = lo + (hi - lo) / 2;      /* 防溢出写法，见后文 */
        steps++;
        printf("lo=%d hi=%d mid=%d a[%d]=%d ", lo, hi, mid, mid, a[mid]);
        if (a[mid] == target) {
            printf("= %d → 命中，下标 %d\n", target, mid);
            return mid;
        }
        if (a[mid] < target) {
            printf("< %d → 往右找，lo = mid + 1 = %d\n", target, mid + 1);
            lo = mid + 1;
        } else {
            printf("> %d → 往左找，hi = mid - 1 = %d\n", target, mid - 1);
            hi = mid - 1;
        }
    }
    printf("lo=%d hi=%d，区间空了 → 不存在（共 %d 次比较）\n", lo, hi, steps);
    return -1;
}

int main(void) {
    int a[] = { 3, 7, 11, 15, 19, 23, 31, 43 };
    int n = (int)(sizeof a / sizeof a[0]);

    printf("查找 23：\n");
    search_trace(a, n, 23);
    printf("查找 20：\n");
    search_trace(a, n, 20);
    return 0;
}
```
```output
查找 23：
lo=0 hi=7 mid=3 a[3]=15 < 23 → 往右找，lo = mid + 1 = 4
lo=4 hi=7 mid=5 a[5]=23 = 23 → 命中，下标 5
查找 20：
lo=0 hi=7 mid=3 a[3]=15 < 20 → 往右找，lo = mid + 1 = 4
lo=4 hi=7 mid=5 a[5]=23 > 20 → 往左找，hi = mid - 1 = 4
lo=4 hi=4 mid=4 a[4]=19 < 20 → 往右找，lo = mid + 1 = 5
lo=5 hi=4，区间空了 → 不存在（共 3 次比较）
```

查 `20` 那条路径最能说明问题：最后一步 `lo == hi == 4`，闭区间的循环条件 `lo <= hi` 让它**再查一次**，这一次才确定 `19 < 20`，于是 `lo` 冲到 `hi` 右边，循环结束。如果写成 `lo < hi`，这个元素就被跳过了——这是二分最常见的漏查。

### 左闭右闭还是左闭右开：不变式决定一切
二分只有两种自洽的写法，混着写必出错。区别只在"`hi` 到底指什么"：

| | 左闭右闭 `[lo, hi]` | 左闭右开 `[lo, hi)` |
|---|---|---|
| `hi` 初值 | `n - 1`（最后一个下标） | `n`（最后一个下标 + 1） |
| 循环条件 | `lo <= hi` | `lo < hi` |
| 收缩左界 | `lo = mid + 1` | `lo = mid + 1` |
| 收缩右界 | `hi = mid - 1` | `hi = mid` |
| 空区间 | `lo > hi` | `lo == hi` |
| 循环结束时 | 没找到 | `lo` 就是"第一个 `>= target` 的位置" |

**左闭右开**在工程里更常用，因为它的循环结束时 `lo` 有明确含义（答案位置），不需要额外变量记录"找到了没有"。`std::lower_bound` 就是这个约定。

二分的正确性靠"**循环不变式**"保证：每次迭代前后，答案（如果存在）始终落在当前区间里。所以两个收缩动作必须**严格缩小**区间，而且**不能把可能是答案的下标排除掉**：

- 闭区间收缩右界必须 `hi = mid - 1`（`mid` 已经比较过了），写成 `hi = mid` 就会原地打转；
- 开区间收缩右界必须 `hi = mid`（`mid` 本身是开边界，不能排除）；
- 开区间收缩左界必须是 `lo = mid + 1`，写成 `lo = mid` 就永远走不出"区间长度为 1"的死循环。

下面这段代码就是"`lo = mid` 忘了 +1"的现场，用 `for` 限制只走 4 步，把"原地踏步"打印出来：

```c run id=bs-stuck
#include <stdio.h>

int main(void) {
    int a[] = { 1, 3, 5, 7, 9, 11 };
    int n = (int)(sizeof a / sizeof a[0]);
    int target = 100;                      /* 比所有元素都大：最终会停在最右端 */

    int lo = 0;
    int hi = n;                            /* 左闭右开 */
    for (int step = 1; step <= 4; step++) {
        if (lo >= hi) {
            break;
        }
        int mid = lo + (hi - lo) / 2;
        printf("第 %d 次：lo=%d hi=%d mid=%d a[%d]=%d < %d → lo = mid = %d",
               step, lo, hi, mid, mid, a[mid], target, mid);
        if (a[mid] < target) {
            lo = mid;                      /* 错：应该是 mid + 1 */
            printf("（区间宽度变成 %d）\n", hi - lo);
        } else {
            hi = mid;
            printf("\n");
        }
    }
    printf("只要 lo 和 hi 相差 1，mid 就永远等于 lo，循环再也不会前进\n");
    return 0;
}
```
```output
第 1 次：lo=0 hi=6 mid=3 a[3]=7 < 100 → lo = mid = 3（区间宽度变成 3）
第 2 次：lo=3 hi=6 mid=4 a[4]=9 < 100 → lo = mid = 4（区间宽度变成 2）
第 3 次：lo=4 hi=6 mid=5 a[5]=11 < 100 → lo = mid = 5（区间宽度变成 1）
第 4 次：lo=5 hi=6 mid=5 a[5]=11 < 100 → lo = mid = 5（区间宽度变成 1）
只要 lo 和 hi 相差 1，mid 就永远等于 lo，循环再也不会前进
```

第 3、4 次完全一样——这就是死循环。判题时表现为 `TLE`，而在本地往往表现为"程序卡住了"。记一条硬规则：**每次迭代必须让 `hi - lo` 严格变小**。

二分过程中三个下标和数组的关系是这样的（`mid` 落在 `a[3]`，正好是第一次比较的位置）：

```memory title="左闭右闭二分第一次比较时的内存状态（地址为示意）"
地址 | 内容 | 变量 | 说明
0x0061fea0 | 3 | a[0] | 
0x0061fea4 | 7 | a[1] | 
0x0061fea8 | 11 | a[2] | 
0x0061feac | 15 | a[3] | 第一次 mid 落在这里
0x0061feb0 | 19 | a[4] | 
0x0061feb4 | 23 | a[5] | 
0x0061feb8 | 31 | a[6] | 
0x0061febc | 43 | a[7] | 
栈（4 字节） | 0 | lo | 左边界（含），还没被排除
栈（4 字节） | 7 | hi | 右边界（含）= n - 1
栈（4 字节） | 3 | mid | lo + (hi - lo) / 2，只用于本次比较
```

### 为什么 `mid` 要写 `lo + (hi - lo) / 2`
直觉上 `mid` 就是"中间那个"，写成 `(lo + hi) / 2` 也对——**直到 `lo + hi` 超过 `int` 的上限**。`int` 最大约 `2.1×10⁹`，当区间右端 `hi` 接近 `10⁹`、左端 `lo` 也很大时，`lo + hi` 就溢出了。

C 语言里**有符号整数溢出是未定义行为**，不是"回绕成负数"这么简单：编译器可以假设它不发生，进而做出任意的优化。UBSan 会当场报错（本平台判 `UB`）：

```c run id=bs-mid-overflow expect=UB
#include <stdio.h>

/* 错：(lo + hi) / 2 —— 当 lo 和 hi 都接近 int 上限时，lo + hi 溢出 */
static int mid_wrong(int lo, int hi) {
    return (lo + hi) / 2;
}

int main(void) {
    int lo = 1500000000;
    int hi = 2000000000;
    printf("lo=%d hi=%d mid=%d\n", lo, hi, mid_wrong(lo, hi));
    return 0;
}
```

`lo + hi = 3.5×10⁹`，远超 `INT_MAX = 2147483647`。改成减法形式就永远安全：`hi - lo` 是两个"都在 `int` 范围内"的数之差，而且 `lo ≤ hi` 时它一定非负、不会溢出：

```text
mid = lo + (hi - lo) / 2      /* 先减后加：中间结果最大就是 hi 本身 */
```

这个坑在"数组下标"上很少踩到（数组长度受内存限制，`n` 到不了 `10⁹`），但在**二分答案**里天天踩：答案范围常常是 `[0, 10⁹]` 甚至 `[0, 10¹⁸]`。所以还有一个更根本的规则：**二分答案时，边界和 `mid` 一律用 `long long`**，连"会不会溢出"都不用想。

### 四个变体：`lower_bound` 与 `upper_bound`
实际业务里更常见的不是"有没有这个值"，而是"第一个 `>= x` 的位置""有多少个等于 `x`"。它们只差一个比较符号：

| 目标 | 条件 | 用途 |
|---|---|---|
| 第一个 `>= x` | `a[mid] < x` 时 `lo = mid + 1`，否则 `hi = mid` | `lower_bound` |
| 第一个 `> x` | `a[mid] <= x` 时 `lo = mid + 1`，否则 `hi = mid` | `upper_bound` |
| 第一个 `== x` | `lower_bound` 的结果再检查 `a[lo] == x` | 存在性 |
| 等于 `x` 的个数 | `upper_bound(x) - lower_bound(x)` | 计数 |

```c run id=bs-lower-upper
#include <stdio.h>

/* 第一个 >= x 的下标（左闭右开：[lo, hi) 里找，返回 lo） */
static int lower_bound(const int *a, int n, int x) {
    int lo = 0;
    int hi = n;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] < x) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return lo;                              /* 可能是 0..n，n 表示"全都 < x" */
}

/* 第一个 > x 的下标 */
static int upper_bound(const int *a, int n, int x) {
    int lo = 0;
    int hi = n;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] <= x) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return lo;
}

static void query(const int *a, int n, int x) {
    int lb = lower_bound(a, n, x);
    int ub = upper_bound(a, n, x);
    printf("x=%d：lower_bound=%d upper_bound=%d count=%d", x, lb, ub, ub - lb);
    if (lb < ub) {
        printf("（a[%d]=%d）\n", lb, a[lb]);
    } else {
        printf("（不存在）\n");
    }
}

int main(void) {
    int a[] = { 1, 3, 3, 3, 5, 7 };
    int n = (int)(sizeof a / sizeof a[0]);

    query(a, n, 3);      /* 三个 3 */
    query(a, n, 4);      /* 不存在，插在 3 和 5 之间 */
    query(a, n, 0);      /* 比所有元素都小 */
    query(a, n, 9);      /* 比所有元素都大 */
    return 0;
}
```
```output
x=3：lower_bound=1 upper_bound=4 count=3（a[1]=3）
x=4：lower_bound=4 upper_bound=4 count=0（不存在）
x=0：lower_bound=0 upper_bound=0 count=0（不存在）
x=9：lower_bound=6 upper_bound=6 count=0（不存在）
```

`lower_bound` 和 `upper_bound` 对"不存在"的处理很优雅：它们返回的都是"插入位置"，`lb == ub` 就表示这个值不存在，`lb < ub` 就表示存在 `ub - lb` 个。`x=4` 的两行都是 4——它应该插在 `3` 后面、`5` 前面，也就是下标 4；`x=9` 的两行都是 `n = 6`，表示"比所有元素都大，应该插在末尾"。

两个必须记住的边界：

- **`lower_bound` 可能返回 `n`**（`x` 比所有元素都大）。这时候去访问 `a[n]` 就越界了，所以"存在性判断"必须先比较 `lb < n`；
- **`n = 0` 时两个函数都返回 0**，循环一次都不进。空数组是最容易写崩的边界，写完一定测一遍。

### 二分答案：把"判定"写成函数
有些问题不是"在数组里找东西"，而是"求满足某个条件的最小/最大整数"。只要条件对答案**单调**（`x` 可行则 `x+1` 也可行，或反之），就可以二分答案：

1. 写出判定函数 `ok(x)`，返回 `x` 是否满足条件；
2. 二分答案区间 `[lo, hi]`，`ok(mid)` 为真就压缩上界，否则抬高下界；
3. 循环结束时 `lo` 就是"最小的可行值"。

下面用"最小天数"举例：第 `d` 天写 `d` 条日志，第 `1..d` 天累计 `T(d) = d(d+1)/2` 条。给定总条数 `S`，问最少要几天。答案 `d` 可以达到 `1.4×10⁹`，边界和 `mid` 都必须用 `long long`；上界用"倍增"找出来，避免瞎猜一个巨大的数：

```c run id=bs-answer
#include <stdio.h>

/* 第 d 天累计写入 d(d+1)/2 条 */
static long long total(long long d) {
    return d * (d + 1) / 2;
}

int main(void) {
    long long s = 10;
    long long lo = 1;
    long long hi = 1;

    printf("S = %lld：求最小的天数 d 使 d(d+1)/2 >= S\n", s);
    /* 倍增找上界：hi 只要"够大"就行，不必精确 */
    while (total(hi) < s) {
        printf("上界不够：T(%lld) = %lld < %lld，hi 翻倍 → %lld\n", hi, total(hi), s, hi * 2);
        hi *= 2;
    }
    printf("上界确定：T(%lld) = %lld >= %lld，开始二分 [%lld, %lld]\n", hi, total(hi), s, lo, hi);

    while (lo < hi) {
        long long mid = lo + (hi - lo) / 2; /* 全程 long long，不担心溢出 */
        printf("lo=%lld hi=%lld mid=%lld T(%lld)=%lld %s %lld → ", lo, hi, mid, mid, total(mid),
               total(mid) >= s ? ">=" : "<", s);
        if (total(mid) >= s) {
            hi = mid;                       /* mid 可行，答案可能是 mid，不能排除 */
            printf("hi=%lld\n", mid);
        } else {
            lo = mid + 1;                   /* mid 不可行，直接排除 */
            printf("lo=%lld\n", mid + 1);
        }
    }
    printf("答案 d=%lld：第 %lld 天是第 %lld 条，落在该天的第 %lld 条\n",
           lo, lo, s, s - total(lo - 1));
    return 0;
}
```
```output
S = 10：求最小的天数 d 使 d(d+1)/2 >= S
上界不够：T(1) = 1 < 10，hi 翻倍 → 2
上界不够：T(2) = 3 < 10，hi 翻倍 → 4
上界确定：T(4) = 10 >= 10，开始二分 [1, 4]
lo=1 hi=4 mid=2 T(2)=3 < 10 → lo=3
lo=3 hi=4 mid=3 T(3)=6 < 10 → lo=4
答案 d=4：第 4 天是第 10 条，落在该天的第 4 条
```

这个输出里有三个值得注意的点：

1. **倍增找上界只花了 3 次比较**。上界不必精确，`while (total(hi) < s) hi *= 2;` 的代价是 `O(log 答案)`，和二分本身同阶，总复杂度不变；
2. **`hi = mid` 而不是 `mid - 1`**：因为 `mid` 本身可能就是答案（`T(4) = 10 >= 10` 恰好可行），把它排除掉就会得到 5。这和前面"左闭右开收缩右界"是同一条规则；
3. 最后 `s - total(lo - 1) = 10 - T(3) = 10 - 6 = 4`，说明第 10 条是第 4 天的第 4 条。**能算出这种"精确位置"的答案，才说明判定函数真的写对了**——如果只输出天数，判定函数里少写一个 `+1` 都可能蒙混过关。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra -g bs.c -o bs
./bs
```

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=address,undefined bs.c -o bs
./bs
```

调试二分的几条经验：

- **打印 `lo`、`hi`、`mid`、`a[mid]`**，一步一步看区间有没有真的缩小。二分的 bug 几乎都是"某一步没缩小"或"多排除了一个元素"，不看轨迹根本猜不到；
- 用 `-fsanitize=undefined` 抓 `(lo + hi) / 2` 的溢出——它比"结果算错"更隐蔽，因为溢出后可能得到一个看似合理的 `mid`；
- 必测这五个用例：空数组、长度 1、目标比所有元素小、目标比所有元素大、目标等于首元素/末元素；
- 对"找第一个 `>= x`"这类问题，先写一个 `O(n)` 的暴力版，用随机小数据和你的二分对拍，几百组就能覆盖所有边界。

## 常见错误

### `mid = (lo + hi) / 2` 在边界很大时溢出 [UB]
`int` 的 `lo + hi` 最大能到 `2×(2¹⁰ 亿)` 量级。有符号溢出是未定义行为：轻则 `mid` 变成负数、数组越界读（`RE`），重则被 UBSan 直接判定 `UB`。修法只有一句 `lo + (hi - lo) / 2`，或者干脆全程用 `long long`。

```c run id=bs-overflow-demo expect=UB
#include <stdio.h>

int main(void) {
    int lo = 1800000000;
    int hi = 1900000000;
    int mid = (lo + hi) / 2;                /* lo + hi = 3.7e9 > INT_MAX */
    printf("mid = %d，这个数不可能是 1850000000\n", mid);
    return 0;
}
```

### 闭区间写成开区间的循环条件，漏掉最后一个元素 [WA]
`hi = n - 1` 配 `while (lo < hi)` 是最常见的混搭：区间明明是闭的，循环却在 `lo == hi` 时提前退出，于是"最后一个还被排除的下标"根本没查过。表现是"查最大的元素总是查不到"。

```c run id=bs-miss-last
#include <stdio.h>

static int search_wrong(const int *a, int n, int target) {
    int lo = 0;
    int hi = n - 1;                         /* 闭区间 */
    while (lo < hi) {                       /* 错：闭区间应该用 lo <= hi */
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) {
            return mid;
        }
        if (a[mid] < target) {
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return -1;
}

int main(void) {
    int a[] = { 3, 7, 11, 15, 19, 23, 31, 43 };
    printf("查找 43 的结果 = %d（正确应该是 7）\n", search_wrong(a, 8, 43));
    printf("查找 31 的结果 = %d（正确应该是 6）\n", search_wrong(a, 8, 31));
    return 0;
}
```
```output
查找 43 的结果 = -1（正确应该是 7）
查找 31 的结果 = 6（正确应该是 6）
```

`43` 查不到，`31` 却查到了——差别在于 `31` 曾经当过 `mid`（区间缩到 `[6,7]` 时 `mid = 6`），而 `43` 只有在"`lo == hi == 7`"这一步才有可能被比较，那一步被 `lo < hi` 挡掉了。这类 bug 用中间的元素永远测不出来——**一定要用首元素和末元素做用例**。

### 收缩边界时把 `mid` 又留在区间里 [TLE]
`hi = mid`（闭区间）或 `lo = mid`（开区间）会让区间在某一步不再缩小，循环永远退不出来。判题结果是 `TLE`，本地表现为"卡死"。记住开区间右界 `hi = mid`、闭区间右界 `hi = mid - 1`，左边一律 `lo = mid + 1`（因为 `mid` 已经比较过了）。

### 在无序数组上二分 [WA]
二分只依赖"有序"这一个假设。数据没排序就直接二分，得到的答案是"随机"的：`a[mid] < target` 之后往右找，但右边可能既有比 `target` 大的、也有比它小的。这类错误在小数据上偶尔能"碰对"，一旦规模变大就稳定错。写之前先确认输入真的有序（题目保证，或者自己先排序）。

### `lower_bound` 返回 `n` 之后直接访问 `a[lb]` [RE]
`lower_bound` 的返回值范围是 `[0, n]`，`n` 表示"所有元素都 `< x`"。如果紧接着写 `if (a[lb] == x)`，在"`x` 比所有元素都大"的用例上就越界读（`RE`）。判断存在性必须是 `if (lb < n && a[lb] == x)`——短路求值会保证 `a[lb]` 不会被求值。

## 客观题

### q-s7-binary-search-1 single
在一个长度为 `n` 的**升序**数组里用左闭右开写法（`lo = 0, hi = n`，`while (lo < hi)`）做二分。下面哪个说法正确？

- [x] `mid` 写成 `lo + (hi - lo) / 2` 是因为 `lo + hi` 可能超过 `int` 上限，而有符号溢出是未定义行为
  > 正确。当搜索范围接近 `int` 上限（二分答案时很常见，答案范围可以达到 10⁹ 甚至 10¹⁸）时，`lo + hi` 会超出 `INT_MAX`。C 语言里有符号整数溢出是未定义行为，UBSan 会直接判定 `UB`，编译器也可能做出任何"假设它不发生"的优化。`lo + (hi - lo) / 2` 里 `hi - lo` 不会溢出（`lo <= hi`），加回去也不会超过 `hi`，所以永远安全。
- [ ] 两种写法完全等价，写成 `(lo + hi) / 2` 更短更好
  > 错。数学上等价，机器上不等价：数组下标场景下 `n` 受内存限制、通常碰不到溢出，所以"看起来一直没问题"；但二分答案的场景里边界动辄上亿，"一直没问题"只是还没测到那个用例。
- [ ] 左闭右开写法的循环结束时，`lo` 表示"没找到"
  > 错。左闭右开的循环结束时 `lo == hi`，它正好是"第一个不满足条件的位置"：对 `lower_bound` 来说就是第一个 `>= x` 的下标（可能是 `n`，表示全都小于 `x`）。这也是 STL 采用这个约定的原因——返回一个有意义的位置，而不是一个 `-1`。
- [ ] 二分查找必须要求数组元素互不相同，否则无法判断方向
  > 错。二分的唯一前提是单调（有序），允许重复元素。有重复元素时"找到某一个等于 `x` 的位置"仍然成立，只是返回哪一个不确定；想精确定位就要用 `lower_bound` / `upper_bound` 求出整段区间 `[lb, ub)`。
