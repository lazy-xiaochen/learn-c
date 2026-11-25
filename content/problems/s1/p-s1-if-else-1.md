---json
{
  "id": "p-s1-if-else-1",
  "title": "判断三条边能否构成三角形，以及三角形的类型",
  "difficulty": "L2",
  "knowledgePoints": ["s1-if-else"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入三个正整数 a、b、c 表示三条线段的长度。

- 如果它们不能构成三角形（任意两边之和必须**大于**第三边），输出 `no`；
- 否则，三边都相等输出 `equilateral`（等边），恰有两边相等输出 `isosceles`（等腰），三边互不相等输出 `scalene`（不等边）。

## 输入格式
一行，三个正整数 a、b、c。

## 输出格式
一行，`no`、`equilateral`、`isosceles` 或 `scalene`。

## 数据范围
1 ≤ a, b, c ≤ 2147483647

## 示例
### 示例 1
```in
3 4 5
```
```out
scalene
```

### 示例 2（边界：两边之和恰好等于第三边）
```in
1 2 3
```
```out
no
```

## 提示
### 第 1 层
先判断能不能构成三角形，再判断类型。判断类型时，条件的检查顺序重要吗？

### 第 2 层
三个条件 `a + b > c`、`a + c > b`、`b + c > a` 必须**同时**成立。注意边长可以接近 2³¹，两条边相加可能超出 `int` 的范围。

### 第 3 层
用 `long long` 计算两边之和（例如 `(long long)a + b > c`）。类型判断：先判断三边都相等，再判断是否有两边相等（`a == b || b == c || a == c`），最后才是不等边。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int a, b, c;
    if (scanf("%d %d %d", &a, &b, &c) != 3) {
        return 0;
    }
    /* 边长最大约 2^31，两边之和可能超出 int，转成 long long 再相加 */
    long long x = a, y = b, z = c;
    if (!(x + y > z && x + z > y && y + z > x)) {
        printf("no\n");
    } else if (a == b && b == c) {
        printf("equilateral\n");
    } else if (a == b || b == c || a == c) {
        printf("isosceles\n");
    } else {
        printf("scalene\n");
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int a, b, c;
    if (scanf("%d %d %d", &a, &b, &c) != 3) {
        return 0;
    }
    /* 判断并输出 */

    return 0;
}
```

## 复杂度
O(1)。本题练习多分支 if-else 的顺序与组合条件，以及比较前的溢出问题。

## 常见错误
### 用 int 计算两边之和 [UB]
两条长度接近 2³¹ 的边相加超出 `int` 的范围，有符号溢出是未定义行为；常见表现是和变成负数，于是一个合法的三角形被判成了 `no`。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    int a, b, c;
    if (scanf("%d %d %d", &a, &b, &c) != 3) {
        return 0;
    }
    if (!(a + b > c && a + c > b && b + c > a)) {
        printf("no\n");
    } else if (a == b && b == c) {
        printf("equilateral\n");
    } else if (a == b || b == c || a == c) {
        printf("isosceles\n");
    } else {
        printf("scalene\n");
    }
    return 0;
}
```

### 把"大于"写成"大于等于" [WA]
两边之和等于第三边时，三个点共线，不能构成三角形。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int a, b, c;
    if (scanf("%d %d %d", &a, &b, &c) != 3) {
        return 0;
    }
    long long x = a, y = b, z = c;
    if (!(x + y >= z && x + z >= y && y + z >= x)) {
        printf("no\n");
    } else if (a == b && b == c) {
        printf("equilateral\n");
    } else if (a == b || b == c || a == c) {
        printf("isosceles\n");
    } else {
        printf("scalene\n");
    }
    return 0;
}
```

### 先判断等腰再判断等边 [WA]
等边三角形也满足"有两边相等"，如果等腰的分支在前，等边三角形永远走不到自己的分支。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int a, b, c;
    if (scanf("%d %d %d", &a, &b, &c) != 3) {
        return 0;
    }
    long long x = a, y = b, z = c;
    if (!(x + y > z && x + z > y && y + z > x)) {
        printf("no\n");
    } else if (a == b || b == c || a == c) {
        printf("isosceles\n");
    } else if (a == b && b == c) {
        printf("equilateral\n");
    } else {
        printf("scalene\n");
    }
    return 0;
}
```

### 只检查了 a + b > c [WA]
三个不等式缺一不可，例如 10 2 3 满足 10 + 2 > 3，却不能构成三角形。

## 测试用例
### 01 sample 示例 1
```in
3 4 5
```
```out
scalene
```

### 02 sample 示例 2
```in
1 2 3
```
```out
no
```

### 03 boundary 三条边都是 int 最大值（两边之和超出 int）
```in
2147483647 2147483647 2147483647
```
```out
equilateral
```

### 04 trap 两条长边相加溢出
```in
2000000000 2000000000 1
```
```out
isosceles
```

### 05 degenerate 最小的等边三角形
```in
1 1 1
```
```out
equilateral
```

### 06 degenerate 等腰，相等的边在第一、三个位置
```in
5 3 5
```
```out
isosceles
```

### 07 trap 只检查 a + b > c 会误判
```in
10 2 3
```
```out
no
```

### 08 boundary 和恰好比第三边大 1
```in
1073741824 1073741824 2147483647
```
```out
isosceles
```

### 09 normal 不等边
```in
7 10 5
```
```out
scalene
```
