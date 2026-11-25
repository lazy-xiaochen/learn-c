---json
{
  "id": "p-s4-struct-param-1",
  "title": "点集坐标变换：平移、缩放、质心与曼哈顿距离",
  "difficulty": "L3",
  "knowledgePoints": ["s4-struct-param"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
地图工具里有一批平面点，每个点用一个结构体存两个 `long long` 坐标：

```c
typedef struct {
    long long x;
    long long y;
} Point;
```

现在要按下面的顺序对**全部点**做一次变换，并且**原地生效**（调用者的数组要真的被改掉）：

1. 整体平移：每个点加上 `(dx, dy)`；
2. 以原点为中心等比缩放：每个点乘上整数倍率 `k`。

变换之后，还要回答两件事：

- 点集的**质心**：所有点坐标之和分别除以 `n`，**向下取整**（向负无穷方向取整，不是向 0 截断）；
- 若干次查询：给定点的下标 `i`，求它到质心的**曼哈顿距离** `|x - cx| + |y - cy|`。

## 输入格式
第一行一个整数 `n`：点的个数。
接下来 `n` 行，每行两个整数 `x` `y`：第 `i` 个点的坐标（`i` 从 0 开始）。
接下来一行两个整数 `dx` `dy`：平移量。
接下来一行一个整数 `k`：缩放倍率。
接下来一行一个整数 `q`：查询次数。
接下来 `q` 行，每行一个整数 `i`：要查询的点下标，保证 `0 ≤ i < n`。

## 输出格式
按顺序输出：

1. `n` 行 `P<i> <x> <y>`：变换后第 `i` 个点的坐标；
2. 一行 `center <cx> <cy>`：质心坐标（分别向下取整）；
3. `q` 行 `d<i> <dist>`：第 `i` 个点到质心的曼哈顿距离。

所有整数都是十进制、用空格分隔，**不要输出多余的空格**。

## 数据范围
- `1 ≤ n ≤ 1000`
- `-10^9 ≤ x, y ≤ 10^9`，`-10^9 ≤ dx, dy ≤ 10^9`
- `-10 ≤ k ≤ 10`
- `1 ≤ q ≤ 1000`

变换后的坐标绝对值最大约 `(10^9 + 10^9) × 10 = 2×10^10`，`n` 个点求和后最大约 `2×10^13`，**超过了 `int` 的范围**，所以坐标、和、距离都必须用 `long long`。平移量、倍率都可能为负，质心也就可能为负，注意"向下取整"和 C 的截断除法不是一回事。

## 示例
### 示例 1
```in
3
0 0
2 2
4 4
1 -1
2
3
0
1
2
```
```out
P0 2 -2
P1 6 2
P2 10 6
center 6 2
d0 8
d1 0
d2 8
```
> 三个点先平移成 `(1,-1)`、`(3,1)`、`(5,3)`，再乘 2 得到 `(2,-2)`、`(6,2)`、`(10,6)`。坐标和是 `(18,6)`，除以 3 得质心 `(6,2)`。`P0` 到质心是 `|2-6| + |-2-2| = 8`，`P1` 恰好就是质心，距离 0。

### 示例 2（边界：只有一个点，且缩放倍率为 0）
```in
1
-1 -1
0 0
0
1
0
```
```out
P0 0 0
center 0 0
d0 0
```
> 只有一个点时质心就是这个点本身，而倍率 `k = 0` 把所有坐标压到了原点，于是变换后是 `(0,0)`、质心 `(0,0)`、距离 `0`。`k = 0` 和负坐标是最容易被忽略的边界：如果缩放写在平移之前，结果会完全不同。

## 提示
### 第 1 层
题目要求变换"原地生效"。先想清楚一件事：如果把一个 `Point` 按值传给函数，在函数里改它，调用者的数组会不会变？想清楚之后再决定函数的形参该写成 `Point` 还是 `Point *`。

### 第 2 层
让函数接收 `Point *p`，用 `p->x`、`p->y` 修改，调用时传 `&a[i]`。平移和缩放可以做在同一个函数里，也可以分开，但**顺序必须是先平移、后缩放**。

### 第 3 层
质心的除法要向下取整：C 的 `/` 对负数是向 0 截断的，`-3 / 2` 得到 `-1` 而不是 `-2`。判断一下"除不尽且被除数是负数"的情况，把商再减 1 即可。另外，曼哈顿距离里的绝对值别漏掉，距离本身用 `long long` 更保险。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAXN 1000

typedef struct {
    long long x;
    long long y;
} Point;

/* 传指针：函数通过地址直接改调用者的数组元素 */
static void transform(Point *p, long long dx, long long dy, long long k) {
    p->x += dx;              /* 先平移 */
    p->y += dy;
    p->x *= k;               /* 再缩放 */
    p->y *= k;
}

/* 向下取整的整数除法（除数为正）：-3 / 2 要得到 -2，而不是 -1 */
static long long floor_div(long long a, long long b) {
    long long q = a / b;
    if (a % b != 0 && a < 0) {
        q--;
    }
    return q;
}

/* 返回结构体：按值返回一个副本，不会把函数里的局部变量带出来 */
static Point centroid(const Point *a, int n) {
    long long sx = 0;
    long long sy = 0;
    for (int i = 0; i < n; i++) {
        sx += a[i].x;
        sy += a[i].y;
    }
    Point c;
    c.x = floor_div(sx, n);
    c.y = floor_div(sy, n);
    return c;
}

/* 小结构体按值传参：这里只读，复制一份更省心 */
static long long manhattan(Point p, Point c) {
    long long dx = p.x - c.x;
    long long dy = p.y - c.y;
    if (dx < 0) {
        dx = -dx;
    }
    if (dy < 0) {
        dy = -dy;
    }
    return dx + dy;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }
    Point a[MAXN];
    for (int i = 0; i < n; i++) {
        if (scanf("%lld %lld", &a[i].x, &a[i].y) != 2) {
            return 0;
        }
    }

    long long dx;
    long long dy;
    long long k;
    if (scanf("%lld %lld", &dx, &dy) != 2) {
        return 0;
    }
    if (scanf("%lld", &k) != 1) {
        return 0;
    }

    for (int i = 0; i < n; i++) {
        transform(&a[i], dx, dy, k);
    }
    Point c = centroid(a, n);

    for (int i = 0; i < n; i++) {
        printf("P%d %lld %lld\n", i, a[i].x, a[i].y);
    }
    printf("center %lld %lld\n", c.x, c.y);

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > MAXN) {
        return 0;
    }
    for (int j = 0; j < q; j++) {
        int idx;
        if (scanf("%d", &idx) != 1 || idx < 0 || idx >= n) {
            return 0;
        }
        printf("d%d %lld\n", idx, manhattan(a[idx], c));
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAXN 1000

typedef struct {
    long long x;
    long long y;
} Point;

/* TODO: 形参是 Point（按值），改的是副本，调用者的数组不会变 —— 改成 Point * */
static void transform(Point p, long long dx, long long dy, long long k) {
    p.x += dx;
    p.y += dy;
    p.x *= k;
    p.y *= k;
}

/* TODO: 这里是 C 的截断除法，-3 / 2 得到 -1，但题目要求向下取整（-2） */
static long long floor_div(long long a, long long b) {
    return a / b;
}

static Point centroid(const Point *a, int n) {
    long long sx = 0;
    long long sy = 0;
    for (int i = 0; i < n; i++) {
        sx += a[i].x;
        sy += a[i].y;
    }
    Point c;
    c.x = floor_div(sx, n);
    c.y = floor_div(sy, n);
    return c;
}

static long long manhattan(Point p, Point c) {
    long long dx = p.x - c.x;
    long long dy = p.y - c.y;
    if (dx < 0) {
        dx = -dx;
    }
    if (dy < 0) {
        dy = -dy;
    }
    return dx + dy;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }
    Point a[MAXN];
    for (int i = 0; i < n; i++) {
        if (scanf("%lld %lld", &a[i].x, &a[i].y) != 2) {
            return 0;
        }
    }

    long long dx;
    long long dy;
    long long k;
    if (scanf("%lld %lld", &dx, &dy) != 2) {
        return 0;
    }
    if (scanf("%lld", &k) != 1) {
        return 0;
    }

    for (int i = 0; i < n; i++) {
        transform(a[i], dx, dy, k);   /* TODO: 应该传 &a[i] */
    }
    Point c = centroid(a, n);

    for (int i = 0; i < n; i++) {
        printf("P%d %lld %lld\n", i, a[i].x, a[i].y);
    }
    printf("center %lld %lld\n", c.x, c.y);

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > MAXN) {
        return 0;
    }
    for (int j = 0; j < q; j++) {
        int idx;
        if (scanf("%d", &idx) != 1 || idx < 0 || idx >= n) {
            return 0;
        }
        printf("d%d %lld\n", idx, manhattan(a[idx], c));
    }
    return 0;
}
```

## 复杂度
时间：`O(n + q)`。变换和求质心各扫一遍，每个查询 `O(1)`。
空间：`O(n)`，`Point a[1000]` 占 16KB（栈上）。

## 常见错误
### 变换函数按值接收 Point，数组一点没变 [WA]
形参写成 `Point p`，函数里 `p.x += dx;` 改的是副本，`main` 里的 `a[i]` 保持原样。这类代码能编译、能运行、也不报警告，只是结果全错。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXN 1000

typedef struct {
    long long x;
    long long y;
} Point;

static void transform(Point p, long long dx, long long dy, long long k) {
    p.x += dx;                 /* 错：改的是副本 */
    p.y += dy;
    p.x *= k;
    p.y *= k;
}

static long long floor_div(long long a, long long b) {
    long long q = a / b;
    if (a % b != 0 && a < 0) {
        q--;
    }
    return q;
}

static Point centroid(const Point *a, int n) {
    long long sx = 0;
    long long sy = 0;
    for (int i = 0; i < n; i++) {
        sx += a[i].x;
        sy += a[i].y;
    }
    Point c;
    c.x = floor_div(sx, n);
    c.y = floor_div(sy, n);
    return c;
}

static long long manhattan(Point p, Point c) {
    long long dx = p.x - c.x;
    long long dy = p.y - c.y;
    if (dx < 0) {
        dx = -dx;
    }
    if (dy < 0) {
        dy = -dy;
    }
    return dx + dy;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    Point a[MAXN];
    for (int i = 0; i < n; i++) {
        if (scanf("%lld %lld", &a[i].x, &a[i].y) != 2) {
            return 0;
        }
    }
    long long dx;
    long long dy;
    long long k;
    if (scanf("%lld %lld", &dx, &dy) != 2) {
        return 0;
    }
    if (scanf("%lld", &k) != 1) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        transform(a[i], dx, dy, k);
    }
    Point c = centroid(a, n);
    for (int i = 0; i < n; i++) {
        printf("P%d %lld %lld\n", i, a[i].x, a[i].y);
    }
    printf("center %lld %lld\n", c.x, c.y);
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int j = 0; j < q; j++) {
        int idx;
        if (scanf("%d", &idx) != 1) {
            return 0;
        }
        printf("d%d %lld\n", idx, manhattan(a[idx], c));
    }
    return 0;
}
```

### 质心用 C 的截断除法 [WA]
`-3 / 2` 在 C 里是 `-1`（向 0 截断），题目要求向下取整得到 `-2`。只要坐标和是负数且除不尽，质心就会差 1。这是"语言特性"型错误，样本数据不够刁钻时根本发现不了。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXN 1000

typedef struct {
    long long x;
    long long y;
} Point;

static void transform(Point *p, long long dx, long long dy, long long k) {
    p->x += dx;
    p->y += dy;
    p->x *= k;
    p->y *= k;
}

static long long floor_div(long long a, long long b) {
    return a / b;              /* 错：负数时是向 0 截断 */
}

static Point centroid(const Point *a, int n) {
    long long sx = 0;
    long long sy = 0;
    for (int i = 0; i < n; i++) {
        sx += a[i].x;
        sy += a[i].y;
    }
    Point c;
    c.x = floor_div(sx, n);
    c.y = floor_div(sy, n);
    return c;
}

static long long manhattan(Point p, Point c) {
    long long dx = p.x - c.x;
    long long dy = p.y - c.y;
    if (dx < 0) {
        dx = -dx;
    }
    if (dy < 0) {
        dy = -dy;
    }
    return dx + dy;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    Point a[MAXN];
    for (int i = 0; i < n; i++) {
        if (scanf("%lld %lld", &a[i].x, &a[i].y) != 2) {
            return 0;
        }
    }
    long long dx;
    long long dy;
    long long k;
    if (scanf("%lld %lld", &dx, &dy) != 2) {
        return 0;
    }
    if (scanf("%lld", &k) != 1) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        transform(&a[i], dx, dy, k);
    }
    Point c = centroid(a, n);
    for (int i = 0; i < n; i++) {
        printf("P%d %lld %lld\n", i, a[i].x, a[i].y);
    }
    printf("center %lld %lld\n", c.x, c.y);
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int j = 0; j < q; j++) {
        int idx;
        if (scanf("%d", &idx) != 1) {
            return 0;
        }
        printf("d%d %lld\n", idx, manhattan(a[idx], c));
    }
    return 0;
}
```

### 把坐标存成 int [UB]
`Point` 的成员用 `int` 时，示例 1 这种小数据一切正常；一旦坐标到了 `10^9`、缩放倍率是 3，`p->x *= k` 就会溢出。有符号整数溢出是未定义行为，本平台的 UBSan 会报 `signed integer overflow` 并判 `UB`。

```c file=main.c expect=UB
#include <stdio.h>

#define MAXN 1000

typedef struct {
    int x;                     /* 错：10^9 × 3 就装不下了 */
    int y;
} Point;

static void transform(Point *p, int dx, int dy, int k) {
    p->x += dx;
    p->y += dy;
    p->x *= k;
    p->y *= k;
}

static long long floor_div(long long a, long long b) {
    long long q = a / b;
    if (a % b != 0 && a < 0) {
        q--;
    }
    return q;
}

static Point centroid(const Point *a, int n) {
    long long sx = 0;
    long long sy = 0;
    for (int i = 0; i < n; i++) {
        sx += a[i].x;
        sy += a[i].y;
    }
    Point c;
    c.x = (int)floor_div(sx, n);
    c.y = (int)floor_div(sy, n);
    return c;
}

static long long manhattan(Point p, Point c) {
    long long dx = (long long)p.x - c.x;
    long long dy = (long long)p.y - c.y;
    if (dx < 0) {
        dx = -dx;
    }
    if (dy < 0) {
        dy = -dy;
    }
    return dx + dy;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    Point a[MAXN];
    for (int i = 0; i < n; i++) {
        if (scanf("%d %d", &a[i].x, &a[i].y) != 2) {
            return 0;
        }
    }
    int dx;
    int dy;
    int k;
    if (scanf("%d %d", &dx, &dy) != 2) {
        return 0;
    }
    if (scanf("%d", &k) != 1) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        transform(&a[i], dx, dy, k);
    }
    Point c = centroid(a, n);
    for (int i = 0; i < n; i++) {
        printf("P%d %d %d\n", i, a[i].x, a[i].y);
    }
    printf("center %d %d\n", c.x, c.y);
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int j = 0; j < q; j++) {
        int idx;
        if (scanf("%d", &idx) != 1) {
            return 0;
        }
        printf("d%d %lld\n", idx, manhattan(a[idx], c));
    }
    return 0;
}
```

### 曼哈顿距离忘记取绝对值 [WA]
`dx + dy` 直接相加时，如果某个分量是负的，距离会变小甚至变成负数。必须对两个分量分别取绝对值再相加，并且注意 `-dx` 本身也可能溢出（本题数据范围下不会，但换成 `long long` 极小值就会）。

### 把结构体指针当成结构体用 [CE]
`Point *p` 之后写 `p.x` 是编译错误：`.` 左边必须是结构体值。要么写 `(*p).x`，要么写 `p->x`；注意 `*p.x` 也不行，`.` 的优先级比 `*` 高，它会被解析成 `*(p.x)`。

## 测试用例
### 01 sample 示例 1
```in
3
0 0
2 2
4 4
1 -1
2
3
0
1
2
```
```out
P0 2 -2
P1 6 2
P2 10 6
center 6 2
d0 8
d1 0
d2 8
```

### 02 sample 示例 2
```in
1
-1 -1
0 0
0
1
0
```
```out
P0 0 0
center 0 0
d0 0
```

### 03 boundary 三个十亿级的点，变换后是六十亿
```in
3
1000000000 -1000000000
1000000000 -1000000000
1000000000 -1000000000
1000000000 -1000000000
3
1
0
```
```out
P0 6000000000 -6000000000
P1 6000000000 -6000000000
P2 6000000000 -6000000000
center 6000000000 -6000000000
d0 0
```

### 04 degenerate 所有点重合
```in
2
5 5
5 5
0 0
1
2
0
1
```
```out
P0 5 5
P1 5 5
center 5 5
d0 0
d1 0
```

### 05 trap 负坐标之和除不尽，必须向下取整
```in
2
-1 0
-2 0
0 0
1
2
0
1
```
```out
P0 -1 0
P1 -2 0
center -2 0
d0 1
d1 0
```

### 06 trap 负倍率把点翻到另一侧
```in
1
3 -4
0 0
-1
1
0
```
```out
P0 -3 4
center -3 4
d0 0
```

### 07 trap 必须先平移再缩放
```in
1
1 1
1 1
3
1
0
```
```out
P0 6 6
center 6 6
d0 0
```

### 08 normal 混合正负坐标与负的质心
```in
5
-3 7
0 0
2 -9
4 4
-5 -5
2 -3
2
4
0
2
3
4
```
```out
P0 -2 8
P1 4 -6
P2 8 -24
P3 12 2
P4 -6 -16
center 3 -8
d0 21
d2 21
d3 19
d4 17
```

### 09 normal 三十个点与五次查询
```in
30
-400 -500
-269 -403
-138 -306
-7 -209
124 -112
255 -15
386 82
-400 179
-269 276
-138 373
-7 470
124 -500
255 -403
386 -306
-400 -209
-269 -112
-138 -15
-7 82
124 179
255 276
386 373
-400 470
-269 -500
-138 -403
-7 -306
124 -209
255 -112
386 -15
-400 82
-269 179
7 -9
3
5
0
6
12
18
24
```
```out
P0 -1179 -1527
P1 -786 -1236
P2 -393 -945
P3 0 -654
P4 393 -363
P5 786 -72
P6 1179 219
P7 -1179 510
P8 -786 801
P9 -393 1092
P10 0 1383
P11 393 -1527
P12 786 -1236
P13 1179 -945
P14 -1179 -654
P15 -786 -363
P16 -393 -72
P17 0 219
P18 393 510
P19 786 801
P20 1179 1092
P21 -1179 1383
P22 -786 -1527
P23 -393 -1236
P24 0 -945
P25 393 -654
P26 786 -363
P27 1179 -72
P28 -1179 219
P29 -786 510
center -66 -189
d0 2451
d6 1653
d12 1899
d18 1158
d24 822
```
