---json
{
  "id": "p-s3-extern-multifile-2",
  "title": "三文件几何模块：两点间的曼哈顿距离与平方欧氏距离",
  "difficulty": "L3",
  "knowledgePoints": ["s3-extern-multifile"],
  "special": null,
  "judge": { "mode": "multi", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个地图小工具把"点"的相关计算拆成了一个独立模块：

- `point.h`：模块的接口（两个函数声明）；
- `point.c`：两个函数的实现；
- `main.c`：读入两个点的坐标，调用模块并打印结果。

给定平面上两个整点 `(x1, y1)` 和 `(x2, y2)`，输出：

- `manhattan`：曼哈顿距离，即 `|x1 - x2| + |y1 - y2|`；
- `dist2`：欧氏距离的**平方**，即 `(x1 - x2)² + (y1 - y2)²`。

用距离的平方是为了避免浮点误差：结果一定是整数，可以精确比较。

模块的接口已经定好了，请**只改 `point.c`**（也可以改头文件，但接口签名不要动）：

```c
long long point_manhattan(int x1, int y1, int x2, int y2);
long long point_dist2(int x1, int y1, int x2, int y2);
```

`main.c` 只负责输入输出，不参与计算。

## 输入格式
一行四个整数：`x1 y1 x2 y2`，用空格分隔。

## 输出格式
输出两行：

```
manhattan=曼哈顿距离
dist2=距离的平方
```

## 数据范围
-1000000000 ≤ x1, y1, x2, y2 ≤ 1000000000

坐标差最大是 2 × 10⁹，还在 `int` 的范围内（`int` 上限约 2.147 × 10⁹），所以 `x1 - x2` 本身不会溢出。

但接下来就不行了：

- 曼哈顿距离最大 4 × 10⁹，超过 `int`；
- 平方距离最大 8 × 10¹⁸，远超 `int`，但没超过 `long long` 的上限（约 9.22 × 10¹⁸）。

所以**乘法必须在 `long long` 下做**：`(long long)x1 - x2` 先把一个操作数变成 64 位，后面的减法、乘法就都在 64 位下进行。

## 示例
### 示例 1
```in
0 0 3 4
```
```out
manhattan=7
dist2=25
```
> `|0 - 3| + |0 - 4| = 3 + 4 = 7`；平方距离是 `3² + 4² = 9 + 16 = 25`。这是一个 3-4-5 直角三角形的两条直角边。

### 示例 2（边界：坐标取到最大值）
```in
1000000000 1000000000 -1000000000 -1000000000
```
```out
manhattan=4000000000
dist2=8000000000000000000
```
> 两个方向上的差都是 2 × 10⁹，曼哈顿距离 4 × 10⁹ 已经超过 `int`；平方距离是 2 × (2 × 10⁹)² = 8 × 10¹⁸。这一组数据专门用来抓"乘法在 `int` 下完成"的错误。

## 提示
### 第 1 层
先把三个文件都看一遍：`point.h` 里的声明、`point.c` 里的实现、`main.c` 里的调用，类型和名字是否完全对得上？编译能过而答案不对，问题一定在 `point.c` 的计算里。

### 第 2 层
曼哈顿距离要的是"差的绝对值之和"，平方距离要的是"两个方向的平方之和"。检查一下：两个函数是不是各漏了一半？还要检查 `abs` 有没有被用在超出 `int` 范围的值上。

### 第 3 层
`long long dx = (long long)x1 - x2;` 这样写，`dx` 是 64 位的，`dx * dx` 也就自动是 64 位，不会溢出。反过来写 `(long long)(dx * dx)`（括号先把乘法括起来）就没用了——乘法已经在 `int` 下完成，溢出已经发生。另外，对 `long long` 求绝对值不要用 `abs`（它只接受 `int`），直接写 `if (dx < 0) dx = -dx;`。

## 参考代码
```c file=point.h
#ifndef POINT_H
#define POINT_H

/* 两个整点之间的统计量。定义在 point.c，使用者只需包含本头文件。 */
long long point_manhattan(int x1, int y1, int x2, int y2);
long long point_dist2(int x1, int y1, int x2, int y2);

#endif
```

```c file=point.c
#include "point.h"

long long point_manhattan(int x1, int y1, int x2, int y2) {
    /* 先把一个操作数转成 long long，后面的减法、加法都在 64 位下进行 */
    long long dx = (long long)x1 - x2;
    long long dy = (long long)y1 - y2;
    if (dx < 0) {
        dx = -dx;
    }
    if (dy < 0) {
        dy = -dy;
    }
    return dx + dy;              /* 最大 4×10^9，int 装不下 */
}

long long point_dist2(int x1, int y1, int x2, int y2) {
    long long dx = (long long)x1 - x2;
    long long dy = (long long)y1 - y2;
    return dx * dx + dy * dy;    /* 在 long long 下求平方，最大 8×10^18 */
}
```

```c file=main.c
#include <stdio.h>
#include "point.h"

int main(void) {
    int x1, y1, x2, y2;
    if (scanf("%d %d %d %d", &x1, &y1, &x2, &y2) != 4) {
        return 0;
    }

    printf("manhattan=%lld\n", point_manhattan(x1, y1, x2, y2));
    printf("dist2=%lld\n", point_dist2(x1, y1, x2, y2));
    return 0;
}
```

## 初始代码
```c file=point.h
#ifndef POINT_H
#define POINT_H

/* 两个整点之间的统计量。定义在 point.c，使用者只需包含本头文件。 */
long long point_manhattan(int x1, int y1, int x2, int y2);
long long point_dist2(int x1, int y1, int x2, int y2);

#endif
```

```c file=point.c
#include "point.h"

long long point_manhattan(int x1, int y1, int x2, int y2) {
    int dx = x1 - x2;
    int dy = y1 - y2;
    return dx + dy;              /* TODO: 少了绝对值，而且两个 2×10^9 相加会溢出 int */
}

long long point_dist2(int x1, int y1, int x2, int y2) {
    long long dx = (long long)x1 - x2;
    long long dy = (long long)y1 - y2;
    (void)dy;                    /* TODO: 还要加上 dy 方向的那一份 */
    return dx * dx;
}
```

```c file=main.c
#include <stdio.h>
#include "point.h"

int main(void) {
    int x1, y1, x2, y2;
    if (scanf("%d %d %d %d", &x1, &y1, &x2, &y2) != 4) {
        return 0;
    }

    printf("manhattan=%lld\n", point_manhattan(x1, y1, x2, y2));
    printf("dist2=%lld\n", point_dist2(x1, y1, x2, y2));
    return 0;
}
```

## 复杂度
时间 O(1)：只有几次减法、比较和乘法。
空间 O(1)。

这道题的计算量可以忽略，全部难度在两点：**接口要对得上**（声明、定义、调用三处的名字和类型一致），**中间结果要用足够宽的类型**。多文件工程里，这两件事是最常见的翻车点。

## 常见错误
### 先把乘积算完再转 long long [UB]
`(long long)(dx * dx + dy * dy)` 的括号让乘法先在 `int` 下完成，坐标一大就溢出。有符号整数溢出是未定义行为，本平台的 UBSan 会报 `signed integer overflow`；没有检测时你会得到一个完全错误的数。转换必须发生在乘法**之前**：`(long long)dx * dx`。

```c file=point.c expect=UB
#include "point.h"

long long point_manhattan(int x1, int y1, int x2, int y2) {
    long long dx = (long long)x1 - x2;
    long long dy = (long long)y1 - y2;
    if (dx < 0) {
        dx = -dx;
    }
    if (dy < 0) {
        dy = -dy;
    }
    return dx + dy;
}

long long point_dist2(int x1, int y1, int x2, int y2) {
    int dx = x1 - x2;
    int dy = y1 - y2;
    return (long long)(dx * dx + dy * dy);   /* 错：乘法先溢出，再转已经晚了 */
}
```

### 曼哈顿距离用 int 相加 [UB]
两个方向的差各自都在 `int` 范围内，但它们的和可以到 4 × 10⁹。`return abs(dx) + abs(dy);` 里整个加法在 `int` 下完成，坐标一大就溢出。先把每个差放进 `long long` 再相加，或者至少写成 `(long long)abs(dx) + abs(dy)`。
```c file=point.c expect=UB
#include "point.h"
#include <stdlib.h>

long long point_manhattan(int x1, int y1, int x2, int y2) {
    int dx = x1 - x2;
    int dy = y1 - y2;
    return abs(dx) + abs(dy);    /* 错：4×10^9 超过 int */
}

long long point_dist2(int x1, int y1, int x2, int y2) {
    long long dx = (long long)x1 - x2;
    long long dy = (long long)y1 - y2;
    return dx * dx + dy * dy;
}
```

### 平方距离只算了一个方向 [WA]
`return dx * dx;` 漏掉了 `dy * dy`。只要两个点的纵坐标不同，答案就偏小；两个点在同一水平线上时反而碰巧正确，这种"有时对有时错"的 bug 最难查。

```c file=point.c expect=WA
#include "point.h"

long long point_manhattan(int x1, int y1, int x2, int y2) {
    long long dx = (long long)x1 - x2;
    long long dy = (long long)y1 - y2;
    if (dx < 0) {
        dx = -dx;
    }
    if (dy < 0) {
        dy = -dy;
    }
    return dx + dy;
}

long long point_dist2(int x1, int y1, int x2, int y2) {
    long long dx = (long long)x1 - x2;
    long long dy = (long long)y1 - y2;
    return dx * dx;              /* 错：少了 dy * dy */
}
```

### 以为"返回类型是 long long 就不会溢出" [UB]
返回类型只决定最后怎么把值交出去，不改变中间运算的类型。`int dx; return dx * dx;` 的乘法仍然在 `int` 下进行，溢出在 `return` 之前就已经发生。判断标准是看**参与运算的操作数**是什么类型，而不是看函数返回什么。

## 测试用例
### 01 sample 示例 1
```in
0 0 3 4
```
```out
manhattan=7
dist2=25
```

### 02 sample 示例 2
```in
1000000000 1000000000 -1000000000 -1000000000
```
```out
manhattan=4000000000
dist2=8000000000000000000
```

### 03 boundary 同一水平线，跨度 2×10^9
```in
-1000000000 0 1000000000 0
```
```out
manhattan=2000000000
dist2=4000000000000000000
```

### 04 degenerate 两个点重合
```in
5 -5 5 -5
```
```out
manhattan=0
dist2=0
```

### 05 trap 一正一负，绝对值不能省
```in
-5 3 2 -7
```
```out
manhattan=17
dist2=149
```

### 06 trap 两个方向都是 2×10^9，平方距离达到 8×10^18
```in
1000000000 -1000000000 -1000000000 1000000000
```
```out
manhattan=4000000000
dist2=8000000000000000000
```

### 07 normal 小数坐标
```in
1 2 4 6
```
```out
manhattan=7
dist2=25
```

### 08 normal 只有纵坐标不同
```in
0 -1000000000 0 1000000000
```
```out
manhattan=2000000000
dist2=4000000000000000000
```
