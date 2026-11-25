---json
{
  "id": "p-s1-compile-pipeline-1",
  "title": "修复一个链接失败的多文件工程：计算矩形面积与周长",
  "difficulty": "L2",
  "knowledgePoints": ["s1-compile-pipeline"],
  "special": "link-diagnosis",
  "judge": { "mode": "multi", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
同事交给你一个由三个文件组成的小工程：`main.c` 读入矩形的宽和高并输出面积和周长，计算函数写在 `geometry.c` 里，它们的声明放在头文件 `geometry.h` 中。

可是这个工程**链接失败**了。请阅读编译器的报错信息，找出原因并修复，使程序对数据范围内的所有输入都输出正确结果。

你可以修改三个文件中的任何一个，提交时三个文件都会参与编译。

## 输入格式
一行，两个整数 w 和 h，表示矩形的宽和高。

## 输出格式
如果成功读入两个整数，输出两行：
```
area=面积
perimeter=周长
```
否则输出一行 `error`。

## 数据范围
0 ≤ w, h ≤ 100000

## 示例
### 示例 1
```in
3 4
```
```out
area=12
perimeter=14
```

### 示例 2（边界：宽为 0）
```in
0 5
```
```out
area=0
perimeter=10
```

## 提示
### 第 1 层
先别急着改代码：点一次"运行"，仔细读报错信息。它出现在编译的哪个阶段？

### 第 2 层
`undefined symbol` / `undefined reference` 是**链接**错误：某个函数被声明、被调用了，但链接器在所有目标文件里都找不到同名的定义。对照一下头文件里声明的名字和 `geometry.c` 里定义的名字。

### 第 3 层
修好链接错误后再看数据范围：w 和 h 最大都是 100000，面积最大是 10¹⁰，超过了 `int` 能表示的最大值（约 2.1×10⁹）。函数的返回类型虽然是 `long long`，但如果先用两个 `int` 相乘，溢出在乘法时就已经发生了——要让乘法本身在 `long long` 下进行。

## 参考代码
```c file=geometry.h
#ifndef GEOMETRY_H
#define GEOMETRY_H

/* 头文件里只放声明 */
long long rect_area(int w, int h);
long long rect_perimeter(int w, int h);

#endif
```

```c file=geometry.c
#include "geometry.h"

long long rect_area(int w, int h) {
    /* 先把一个操作数转换成 long long，乘法就在 long long 下进行，不会溢出 */
    return (long long)w * h;
}

long long rect_perimeter(int w, int h) {
    return 2LL * (w + h);   /* w + h 最大 200000，在 int 范围内 */
}
```

```c file=main.c
#include <stdio.h>
#include "geometry.h"

int main(void) {
    int w, h;
    if (scanf("%d %d", &w, &h) != 2) {
        printf("error\n");
        return 0;
    }
    printf("area=%lld\n", rect_area(w, h));
    printf("perimeter=%lld\n", rect_perimeter(w, h));
    return 0;
}
```

## 初始代码
```c file=geometry.h
#ifndef GEOMETRY_H
#define GEOMETRY_H

long long rect_area(int w, int h);
long long rect_perimeter(int w, int h);

#endif
```

```c file=geometry.c
#include "geometry.h"

long long rectangle_area(int w, int h) {
    return w * h;
}

long long rect_perimeter(int w, int h) {
    return 2LL * (w + h);
}
```

```c file=main.c
#include <stdio.h>
#include "geometry.h"

int main(void) {
    int w, h;
    if (scanf("%d %d", &w, &h) != 2) {
        printf("error\n");
        return 0;
    }
    printf("area=%lld\n", rect_area(w, h));
    printf("perimeter=%lld\n", rect_perimeter(w, h));
    return 0;
}
```

## 复杂度
时间和空间复杂度都是 O(1)。本题考查的是读懂链接错误、理解"声明与定义要对得上"，以及整数运算的溢出发生在**运算时**而不是赋值时。

## 常见错误
### 只改了函数名，乘法仍在 int 下进行 [UB]
链接成功了，小数据也对，但 100000 × 100000 在 `int` 乘法中就已经溢出。有符号整数溢出是**未定义行为**，本平台的检测工具会直接报告它；在没有检测的环境下，你通常会得到一个奇怪的负数。
```c file=geometry.c expect=UB
#include "geometry.h"

long long rect_area(int w, int h) {
    return w * h;
}

long long rect_perimeter(int w, int h) {
    return 2LL * (w + h);
}
```

### 乘完之后才转换类型 [UB]
`(long long)(w * h)` 的括号让乘法先在 `int` 下完成，溢出已经发生，再转换也救不回来。必须在乘法**之前**转换其中一个操作数：`(long long)w * h`。
```c file=geometry.c expect=UB
#include "geometry.h"

long long rect_area(int w, int h) {
    return (long long)(w * h);
}

long long rect_perimeter(int w, int h) {
    return 2LL * (w + h);
}
```

### 把函数定义搬进头文件 [CE]
`main.c` 和 `geometry.c` 都包含了 `geometry.h`，于是两个目标文件里各有一份 `rect_area`，链接器报"重复定义"（duplicate symbol）。
```c file=geometry.h expect=CE
#ifndef GEOMETRY_H
#define GEOMETRY_H

long long rect_area(int w, int h) { return (long long)w * h; }
long long rect_perimeter(int w, int h) { return 2LL * (w + h); }

#endif
```
```c file=geometry.c
#include "geometry.h"
```

### 在 main.c 里改调用 rectangle_area，却没有更新头文件 [CE]
头文件里没有 `rectangle_area` 的声明，C99 之后调用未声明的函数是错误。即使能编译，`main.c` 和头文件、`geometry.c` 三者的名字也不一致，维护起来更乱。正确的做法是让**定义**与头文件里的**声明**一致。

## 测试用例
### 01 sample 示例 1
```in
3 4
```
```out
area=12
perimeter=14
```

### 02 sample 示例 2
```in
0 5
```
```out
area=0
perimeter=10
```

### 03 boundary 最大规模：宽高都是 100000
```in
100000 100000
```
```out
area=10000000000
perimeter=400000
```

### 04 boundary 最小正数
```in
1 1
```
```out
area=1
perimeter=4
```

### 05 degenerate 宽高都是 0
```in
0 0
```
```out
area=0
perimeter=0
```

### 06 degenerate 宽高相同
```in
77777 77777
```
```out
area=6049261729
perimeter=311108
```

### 07 trap 面积恰好超过 int 最大值（2147483648）
```in
65536 32768
```
```out
area=2147483648
perimeter=196608
```

### 08 trap 输入不完整
```in
12
```
```out
error
```

### 09 normal 一般情况
```in
99999 3
```
```out
area=299997
perimeter=200004
```
