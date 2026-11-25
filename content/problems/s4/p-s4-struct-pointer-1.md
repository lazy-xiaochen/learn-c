---json
{
  "id": "p-s4-struct-pointer-1",
  "title": "坐标数组的指针操作推理：p++、(*p). 与结构体副本",
  "difficulty": "L2",
  "knowledgePoints": ["s4-struct-pointer"],
  "special": "pointer-reasoning",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入三个二维坐标点，放进一个 `struct Point` 数组。程序接着执行下面这段**指针操作**：

```c
struct Point {
    int x;
    int y;
};

struct Point a[3] = { { x0, y0 }, { x1, y1 }, { x2, y2 } };

struct Point *p = a;          /* p 指向 a[0] */
p->x += 100;                  /* 修改 a[0].x */
p++;                          /* p 指向 a[1] */
(*p).y *= 2;                  /* 修改 a[1].y */

struct Point *q = p + 1;      /* q 指向 a[2] */
q->x = p->x + q->y;           /* a[2].x = a[1].x + a[2].y */

struct Point t = *q;          /* 把 a[2] 整体复制给 t */
t.y = t.x - t.y;              /* 只修改副本 t，不影响 a[2] */
```

请你推算出执行完这些语句后 `a[0]`、`a[1]`、`a[2]` 和 `t` 的值，并按格式输出。要求在你的程序里也**真的用结构体指针完成上面这些操作**，操作阶段不要直接写 `a[0].x` 之类的数组下标（最后输出结果时可以用 `a[i]` 读取）。

## 输入格式
一行六个整数 `x0 y0 x1 y1 x2 y2`，依次是三个点的横、纵坐标。

## 输出格式
输出四行：

```
a[0]=(x,y)
a[1]=(x,y)
a[2]=(x,y)
t=(x,y)
```

坐标之间用英文逗号分隔，不要输出多余空格。

## 数据范围
-100 ≤ 每个坐标 ≤ 100

经过一次加 100、一次乘 2 和一次相加后，坐标的绝对值不会超过 400，`int` 足够。

## 示例
### 示例 1
```in
1 2 3 4 5 6
```
```out
a[0]=(101,2)
a[1]=(3,8)
a[2]=(9,6)
t=(9,3)
```
> `p = a` 指向 `a[0]`，`p->x += 100` 把 `a[0].x` 从 1 改成 101；`p++` 之后 `p` 指向 `a[1]`，`(*p).y *= 2` 把 `a[1].y` 从 4 改成 8；`q = p + 1` 指向 `a[2]`，所以 `a[2].x = a[1].x + a[2].y = 3 + 6 = 9`。`t` 是 `a[2]` 的副本，`t.y = 9 - 6 = 3`；`a[2].y` 仍然是 6。

### 示例 2（边界：三个点都在原点）
```in
0 0 0 0 0 0
```
```out
a[0]=(100,0)
a[1]=(0,0)
a[2]=(0,0)
t=(0,0)
```
> 全零时仍然要按顺序执行：`a[0].x` 变成 100，`a[1].y` 乘 2 还是 0，`a[2].x = 0 + 0 = 0`，`t` 的 `y` 也是 0。不要因为值都是 0 就跳过步骤。

## 提示
### 第 1 层
先画出数组 `a` 和指针 `p`、`q` 的指向关系。关键是 `p++` 移动的是**指针**，不是它指向的值；每次移动后 `p` 指向的元素就变了。

### 第 2 层
`p->x` 等价于 `(*p).x`。`p++` 之后，`p->x` 是 `a[1].x`，不再是 `a[0].x`。`q = p + 1` 时 `p` 已经指向 `a[1]`，所以 `q` 指向 `a[2]`。`struct Point t = *q;` 是按值复制，`t` 和 `a[2]` 是两块独立的内存。

### 第 3 层
按这个顺序写：先保存输入的三个点；`struct Point *p = a; p->x += 100; p++; (*p).y *= 2; struct Point *q = p + 1; q->x = p->x + q->y; struct Point t = *q; t.y = t.x - t.y;`。最后分别输出三个数组元素和副本 `t`。

## 参考代码
```c file=main.c
#include <stdio.h>

struct Point {
    int x;
    int y;
};

int main(void) {
    int x0, y0, x1, y1, x2, y2;
    if (scanf("%d %d %d %d %d %d", &x0, &y0, &x1, &y1, &x2, &y2) != 6) {
        return 0;
    }

    struct Point a[3] = { { x0, y0 }, { x1, y1 }, { x2, y2 } };

    struct Point *p = a;
    p->x += 100;
    p++;
    (*p).y *= 2;

    struct Point *q = p + 1;
    q->x = p->x + q->y;

    struct Point t = *q;          /* 整体复制：t 和 a[2] 是两块独立的内存 */
    t.y = t.x - t.y;              /* 只改副本 */

    for (int i = 0; i < 3; i++) {
        printf("a[%d]=(%d,%d)\n", i, a[i].x, a[i].y);
    }
    printf("t=(%d,%d)\n", t.x, t.y);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

struct Point {
    int x;
    int y;
};

int main(void) {
    int x0, y0, x1, y1, x2, y2;
    if (scanf("%d %d %d %d %d %d", &x0, &y0, &x1, &y1, &x2, &y2) != 6) {
        return 0;
    }

    struct Point a[3] = { { x0, y0 }, { x1, y1 }, { x2, y2 } };

    /* TODO: 按题目给出的指针操作修改 a，并构造副本 t */
    struct Point *p = a;
    p->x += 100;
    p->y *= 2;

    struct Point t = a[2];
    t.y = t.x - t.y;

    for (int i = 0; i < 3; i++) {
        printf("a[%d]=(%d,%d)\n", i, a[i].x, a[i].y);
    }
    printf("t=(%d,%d)\n", t.x, t.y);
    return 0;
}
```

## 复杂度
时间 O(1)：只有常数次指针操作和输出。
空间 O(1)：三个 `struct Point` 加几个指针。

## 常见错误
### 用 `*p.x` 访问成员 [CE]
`*p.x` 被解析成 `*(p.x)`，而 `p` 是指针，没有成员 `x`。这是结构体指针最经典的编译错误，正确写法是 `(*p).x` 或 `p->x`。

```c file=main.c expect=CE
#include <stdio.h>

struct Point {
    int x;
    int y;
};

int main(void) {
    struct Point s = { 1, 2 };
    struct Point *p = &s;
    printf("%d\n", *p.x);       /* 错：*(p.x) */
    return 0;
}
```

### 忘记 `p++`，把本该改 a[1] 的操作做在 a[0] 上 [WA]
`p->x += 100;` 之后忘了 `p++`，紧接着的 `(*p).y *= 2;` 仍然改 `a[0].y`。这样 `a[0]` 的纵坐标被翻倍，`a[1]` 却完全没变，后面 `q` 的指向也会跟着错。

```c file=main.c expect=WA
#include <stdio.h>

struct Point {
    int x;
    int y;
};

int main(void) {
    int x0, y0, x1, y1, x2, y2;
    if (scanf("%d %d %d %d %d %d", &x0, &y0, &x1, &y1, &x2, &y2) != 6) {
        return 0;
    }

    struct Point a[3] = { { x0, y0 }, { x1, y1 }, { x2, y2 } };

    struct Point *p = a;
    p->x += 100;
    (*p).y *= 2;                  /* 错：忘了 p++，这里改的是 a[0] */

    struct Point *q = p + 1;      /* q 变成了 a[1]，不是 a[2] */
    q->x = p->x + q->y;

    struct Point t = *q;
    t.y = t.x - t.y;

    for (int i = 0; i < 3; i++) {
        printf("a[%d]=(%d,%d)\n", i, a[i].x, a[i].y);
    }
    printf("t=(%d,%d)\n", t.x, t.y);
    return 0;
}
```

### 把副本 `t` 当成 `a[2]` 的别名 [WA]
`struct Point t = *q;` 是按值复制，`t` 和 `a[2]` 是两块独立的内存。如果以为改 `t.y` 会改到 `a[2]`，或者把 `t` 的值又写回 `q->y`，`a[2]` 的纵坐标就会变成副本算出来的值，而它本应保持原值。

```c file=main.c expect=WA
#include <stdio.h>

struct Point {
    int x;
    int y;
};

int main(void) {
    int x0, y0, x1, y1, x2, y2;
    if (scanf("%d %d %d %d %d %d", &x0, &y0, &x1, &y1, &x2, &y2) != 6) {
        return 0;
    }

    struct Point a[3] = { { x0, y0 }, { x1, y1 }, { x2, y2 } };

    struct Point *p = a;
    p->x += 100;
    p++;
    (*p).y *= 2;

    struct Point *q = p + 1;
    q->x = p->x + q->y;

    struct Point t = *q;
    t.y = t.x - t.y;
    q->y = t.y;                   /* 错：把副本写回了 a[2] */

    for (int i = 0; i < 3; i++) {
        printf("a[%d]=(%d,%d)\n", i, a[i].x, a[i].y);
    }
    printf("t=(%d,%d)\n", t.x, t.y);
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
1 2 3 4 5 6
```
```out
a[0]=(101,2)
a[1]=(3,8)
a[2]=(9,6)
t=(9,3)
```

### 02 sample 示例 2
```in
0 0 0 0 0 0
```
```out
a[0]=(100,0)
a[1]=(0,0)
a[2]=(0,0)
t=(0,0)
```

### 03 degenerate 全负坐标
```in
-5 -6 -7 -8 -9 -10
```
```out
a[0]=(95,-6)
a[1]=(-7,-16)
a[2]=(-17,-10)
t=(-17,-7)
```

### 04 trap 指针后移后再取值
```in
2 2 2 2 2 2
```
```out
a[0]=(102,2)
a[1]=(2,4)
a[2]=(4,2)
t=(4,2)
```

### 05 boundary 六个坐标都取最大值
```in
100 100 100 100 100 100
```
```out
a[0]=(200,100)
a[1]=(100,200)
a[2]=(200,100)
t=(200,100)
```

### 06 normal 横纵坐标异号
```in
0 1 10 20 -30 -40
```
```out
a[0]=(100,1)
a[1]=(10,40)
a[2]=(-30,-40)
t=(-30,10)
```

### 07 trap 副本 t 不影响 a[2]
```in
3 4 5 6 7 8
```
```out
a[0]=(103,4)
a[1]=(5,12)
a[2]=(13,8)
t=(13,5)
```
