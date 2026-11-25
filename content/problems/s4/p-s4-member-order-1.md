---json
{
  "id": "p-s4-member-order-1",
  "title": "结构体重排评估：原始顺序、同事的新顺序与最优顺序的 sizeof 对比",
  "difficulty": "L4",
  "knowledgePoints": ["s4-member-order"],
  "special": "memory-layout",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
你的同事把一个学生记录结构体的成员重新排了一遍，说这样能省内存。为了判断他到底改对了没有，你要写一个小工具，比较三种排列下的 `sizeof`：

1. **原始顺序**：输入给出的第一串成员大小；
2. **同事的顺序**：输入给出的第二串成员大小（保证是第一串的一个排列）；
3. **最优顺序**：把同一组成员按对齐值从大到小重新排列后得到的顺序。

本题只使用"大小等于对齐值"的标量类型，所以成员描述只需要给出大小：`1` 代表 `char`，`2` 代表 `short`，`4` 代表 `int`，`8` 代表 `double` / `long long`。计算结构体大小的规则和真实编译器一致：

1. 按顺序放成员：先把已占用字节数向上取整到该成员大小的倍数（差距是填充），再放下这个成员；
2. 结构体对齐值 = 最大成员大小；
3. 结构体总大小 = 把最后结束位置向上取整到结构体对齐值的倍数。

另外，结构体通常放在数组里使用，所以还要算出 `m` 个元素分别按"原始顺序"和"最优顺序"排列时占用的总字节数。

## 输入格式
第一行一个整数 `n`（成员个数）。
第二行 `n` 个整数，表示原始顺序下每个成员的大小（只会是 `1`、`2`、`4`、`8`）。
第三行 `n` 个整数，表示同事调整后的顺序（保证是第二行的一个排列）。
第四行一个整数 `m`（数组元素个数）。

## 输出格式
按顺序输出六行：

```
orig <原始顺序的 sizeof>
proposed <同事顺序的 sizeof>
best <最优顺序的 sizeof>
saved <原始顺序比最优顺序多占的字节数，即 orig - best>
total <m × orig>
total_best <m × best>
```

`saved` 一定非负；`proposed` 可能比 `orig` 大（说明同事改反了），照实输出。

## 数据范围
1 ≤ n ≤ 8
每个成员大小 ∈ {1, 2, 4, 8}，且第二行、第三行是同一个多重集合
1 ≤ m ≤ 1000000000

`m × sizeof` 最大为 10⁹ × 64 = 6.4×10¹⁰，超过 `int`，必须用 `long long`。输出只有 6 行。

## 示例
### 示例 1
```in
5
1 8 1 4 2
8 4 2 1 1
3
```
```out
orig 32
proposed 16
best 16
saved 16
total 96
total_best 48
```
> 原始顺序 `1 8 1 4 2`：`char` 在 0，`double` 要 8 对齐，空出 `[1,8)`；`double` 占 8..15；第二个 `char` 在 16；`int` 要 4 对齐，空出 `[17,20)`；`int` 占 20..23；`short` 占 24..25；最后补到 32。同事的顺序 `8 4 2 1 1` 把大对齐的成员放在前面，没有内部填充，正好 16 字节，和最优顺序一致。3 个元素分别占 96 和 48 字节。

### 示例 2（边界：只有一个成员）
```in
1
4
4
1
```
```out
orig 4
proposed 4
best 4
saved 0
total 4
total_best 4
```
> 只有一个 `int` 时没有任何成员间的填充，也没有尾部填充，三种顺序都是 4 字节；`saved` 为 0。注意 `total` 和 `total_best` 也要输出，不能因为 `saved = 0` 就省略。

## 提示
### 第 1 层
先写一个函数：给一串成员大小，按规则逐个放成员，算出最终的 `sizeof`。关键顺序是"先对齐、再放成员、最后把总大小取整"，三步都不能少。拿示例 1 的 `1 8 1 4 2` 手算一遍，确认得到 32。

### 第 2 层
"最优顺序"不需要真的枚举所有排列：把所有成员按大小从大到小排序即可。因为大小等于对齐值，前面的成员对齐值都不小于当前成员，它们的大小都是当前对齐值的倍数，所以当前成员的偏移天然对齐，不会产生内部填充；最后只剩下一次尾部取整。`n ≤ 8`，用简单的选择排序或冒泡排序都行。

### 第 3 层
三个容易错的地方：

1. `total` 和 `total_best` 要用 `long long`：`m` 最大 10⁹，`sizeof` 最大 64，乘积 6.4×10¹⁰；
2. `saved` 是 `orig - best`，不是 `proposed - best`，也不是 `orig - proposed`；
3. 同事的顺序可能是"更差"的（比如把 `double` 放最后），`proposed` 要照实算、照实输出，不能假设它一定比 `orig` 小。

## 参考代码
```c file=main.c
#include <stdio.h>

static int layout_size(const int *sizes, int n) {
    int used = 0;
    int align = 1;

    for (int i = 0; i < n; i++) {
        int a = sizes[i];
        used = (used + a - 1) / a * a;   /* 先向上取整到 a 的倍数 */
        used += a;                       /* 再放下这个成员 */
        if (a > align) {
            align = a;
        }
    }
    return (used + align - 1) / align * align;   /* 最后取整到最大对齐值 */
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 8) {
        return 0;
    }

    int orig[8];
    int proposed[8];
    int best[8];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &orig[i]) != 1 || orig[i] < 1 || orig[i] > 8) {
            return 0;
        }
        best[i] = orig[i];
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &proposed[i]) != 1 || proposed[i] < 1 || proposed[i] > 8) {
            return 0;
        }
    }

    int m;
    if (scanf("%d", &m) != 1 || m < 1) {
        return 0;
    }

    /* 选择排序：按大小从大到小，得到最优顺序 */
    for (int i = 0; i < n; i++) {
        int maxi = i;
        for (int j = i + 1; j < n; j++) {
            if (best[j] > best[maxi]) {
                maxi = j;
            }
        }
        int tmp = best[i];
        best[i] = best[maxi];
        best[maxi] = tmp;
    }

    int a = layout_size(orig, n);
    int p = layout_size(proposed, n);
    int b = layout_size(best, n);

    printf("orig %d\n", a);
    printf("proposed %d\n", p);
    printf("best %d\n", b);
    printf("saved %d\n", a - b);
    printf("total %lld\n", (long long)m * a);
    printf("total_best %lld\n", (long long)m * b);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

static int layout_size(const int *sizes, int n) {
    int sum = 0;

    for (int i = 0; i < n; i++) {
        sum += sizes[i];        /* TODO: 成员之间还要按对齐插入填充 */
    }
    return sum;                 /* TODO: 最后要取整到最大对齐值 */
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 8) {
        return 0;
    }

    int orig[8];
    int proposed[8];
    int best[8];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &orig[i]) != 1) {
            return 0;
        }
        best[i] = orig[i];
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &proposed[i]) != 1) {
            return 0;
        }
    }

    int m;
    if (scanf("%d", &m) != 1) {
        return 0;
    }

    for (int i = 0; i < n; i++) {
        int maxi = i;
        for (int j = i + 1; j < n; j++) {
            if (best[j] > best[maxi]) {
                maxi = j;
            }
        }
        int tmp = best[i];
        best[i] = best[maxi];
        best[maxi] = tmp;
    }

    int a = layout_size(orig, n);
    int p = layout_size(proposed, n);
    int b = layout_size(best, n);

    printf("orig %d\n", a);
    printf("proposed %d\n", p);
    printf("best %d\n", b);
    printf("saved %d\n", a - b);
    printf("total %lld\n", (long long)m * a);
    printf("total_best %lld\n", (long long)m * b);
    return 0;
}
```

## 复杂度
时间 O(n² + n)：`n ≤ 8`，排序和两遍布局计算都可以忽略不计。
空间 O(n)：三个长度 8 的数组。

本题的重点不是排序算法，而是理解"顺序为什么会影响大小"：**填充只会在"小对齐成员后面跟大对齐成员"时产生；按对齐值从大到小排列可以消掉所有内部填充，只剩尾部取整。** `proposed` 那一组数据就是用来检验你有没有真正理解这句话的——它不是必然最优，甚至可能比原始顺序更差。

## 常见错误
### 用成员大小之和当 sizeof [WA]
`1 8 1 4 2` 的和是 16，但 `sizeof` 是 32；`8 4 2 1 1` 的和也是 16，`sizeof` 恰好也是 16。用求和代替布局计算，会把本来有填充的顺序算小，`saved` 也会变成 0。必须按"对齐 → 放成员 → 最后取整"三步算。

```c file=main.c expect=WA
#include <stdio.h>

static int layout_size(const int *sizes, int n) {
    int sum = 0;
    for (int i = 0; i < n; i++) {
        sum += sizes[i];            /* 错：忽略了填充 */
    }
    return sum;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    int orig[8], proposed[8], best[8];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &orig[i]) != 1) {
            return 0;
        }
        best[i] = orig[i];
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &proposed[i]) != 1) {
            return 0;
        }
    }
    int m;
    if (scanf("%d", &m) != 1) {
        return 0;
    }

    for (int i = 0; i < n; i++) {
        int maxi = i;
        for (int j = i + 1; j < n; j++) {
            if (best[j] > best[maxi]) {
                maxi = j;
            }
        }
        int tmp = best[i];
        best[i] = best[maxi];
        best[maxi] = tmp;
    }

    int a = layout_size(orig, n);
    int p = layout_size(proposed, n);
    int b = layout_size(best, n);

    printf("orig %d\n", a);
    printf("proposed %d\n", p);
    printf("best %d\n", b);
    printf("saved %d\n", a - b);
    printf("total %lld\n", (long long)m * a);
    printf("total_best %lld\n", (long long)m * b);
    return 0;
}
```

### 把同事的顺序直接当成最优顺序 [WA]
`best` 必须由"按大小降序排序"得到，不能偷懒用 `proposed`。示例 1 里同事恰好排对了，所以这种写法能过第一个样例；但示例 2 之后的隐藏用例里，同事可能原封不动，甚至把顺序改得更差（例如 `1 8 2 4`，`sizeof` 是 24），这时 `best` 就会被算大或算错。

```c file=main.c expect=WA
#include <stdio.h>

static int layout_size(const int *sizes, int n) {
    int used = 0;
    int align = 1;
    for (int i = 0; i < n; i++) {
        int a = sizes[i];
        used = (used + a - 1) / a * a;
        used += a;
        if (a > align) {
            align = a;
        }
    }
    return (used + align - 1) / align * align;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    int orig[8], proposed[8];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &orig[i]) != 1) {
            return 0;
        }
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &proposed[i]) != 1) {
            return 0;
        }
    }
    int m;
    if (scanf("%d", &m) != 1) {
        return 0;
    }

    int a = layout_size(orig, n);
    int p = layout_size(proposed, n);
    int b = p;                       /* 错：把同事的顺序当成了最优 */

    printf("orig %d\n", a);
    printf("proposed %d\n", p);
    printf("best %d\n", b);
    printf("saved %d\n", a - b);
    printf("total %lld\n", (long long)m * a);
    printf("total_best %lld\n", (long long)m * b);
    return 0;
}
```

### 用 int 保存 total 与 total_best [UB]
`m` 最大 10⁹，`sizeof` 最大 64，`m * sizeof` 可以达到 6.4×10¹⁰，远超 `int` 的 2.1×10⁹。有符号整数溢出是未定义行为：UBSan 会报 `signed integer overflow`（判 `UB`），不开检查时结果也可能变成负数。乘法前先把 `m` 或 `sizeof` 转成 `long long`。

### 以为 `proposed` 一定比 `orig` 小 [WA]
重排不是万能的：`8 4 2 1` 的 `sizeof` 是 16，而把 `1` 放到最前面的 `1 8 2 4` 会先空出 7 字节、最后还要补到 24。题目要求如实输出 `proposed`，不能"为了好看"把它改成 `min(orig, proposed)`，也不能假设 `saved` 用的是 `proposed`。

## 测试用例
### 01 sample 示例 1
```in
5
1 8 1 4 2
8 4 2 1 1
3
```
```out
orig 32
proposed 16
best 16
saved 16
total 96
total_best 48
```

### 02 sample 示例 2
```in
1
4
4
1
```
```out
orig 4
proposed 4
best 4
saved 0
total 4
total_best 4
```

### 03 degenerate 六个 char，怎么排都一样
```in
6
1 1 1 1 1 1
1 1 1 1 1 1
1000000000
```
```out
orig 6
proposed 6
best 6
saved 0
total 6000000000
total_best 6000000000
```

### 04 trap 同事原封不动，best 仍应是 16
```in
5
1 8 1 4 2
1 8 1 4 2
7
```
```out
orig 32
proposed 32
best 16
saved 16
total 224
total_best 112
```

### 05 trap 同事把顺序改得更差
```in
4
8 4 2 1
1 8 2 4
2
```
```out
orig 16
proposed 24
best 16
saved 0
total 32
total_best 32
```

### 06 boundary 八个 double，总大小 64
```in
8
8 8 8 8 8 8 8 8
8 8 8 8 8 8 8 8
1000000000
```
```out
orig 64
proposed 64
best 64
saved 0
total 64000000000
total_best 64000000000
```

### 07 normal 八个成员，原始顺序 48、最优 32
```in
8
1 8 1 4 2 8 2 4
8 8 4 4 2 2 1 1
1000
```
```out
orig 48
proposed 32
best 32
saved 16
total 48000
total_best 32000
```

### 08 normal 三个成员，同事的顺序反而更大
```in
3
4 1 2
2 4 1
12345
```
```out
orig 8
proposed 12
best 8
saved 0
total 98760
total_best 98760
```

### 09 trap 十亿个元素，32 字节与 16 字节的差距
```in
5
1 8 1 4 2
8 4 2 1 1
1000000000
```
```out
orig 32
proposed 16
best 16
saved 16
total 32000000000
total_best 16000000000
```

### 10 normal 六个 short，没有填充
```in
6
2 2 2 2 2 2
2 2 2 2 2 2
1000
```
```out
orig 12
proposed 12
best 12
saved 0
total 12000
total_best 12000
```
