---json
{
  "id": "p-s1-relational-logical-1",
  "title": "判断整数 x 是否在闭区间 [lo, hi] 内",
  "difficulty": "L1",
  "knowledgePoints": ["s1-relational-logical"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入三个整数 x、lo、hi（保证 lo ≤ hi），如果 lo ≤ x ≤ hi，输出 `in`，否则输出 `out`。

## 输入格式
一行，三个整数 x、lo、hi。

## 输出格式
一行，`in` 或 `out`。

## 数据范围
-2147483648 ≤ x, lo, hi ≤ 2147483647，lo ≤ hi

## 示例
### 示例 1
```in
5 1 10
```
```out
in
```

### 示例 2（边界：x 恰好等于下界）
```in
1 1 10
```
```out
in
```

## 提示
### 第 1 层
数学上的 lo ≤ x ≤ hi 实际上包含两个条件，它们必须**同时**成立。

### 第 2 层
C 语言中 `lo <= x <= hi` 是从左到右计算的：`lo <= x` 先得到 0 或 1，再和 hi 比较，这不是你想要的含义。用 `&&` 连接两个比较。

### 第 3 层
`if (lo <= x && x <= hi) printf("in\n"); else printf("out\n");`。不要用 `(x - lo) * (hi - x) >= 0` 这种"技巧"，在 `int` 的完整范围内减法和乘法都可能溢出。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int x, lo, hi;
    if (scanf("%d %d %d", &x, &lo, &hi) != 3) {
        return 0;
    }
    /* 两个比较用 && 连接；只做比较、不做减法，不存在溢出的可能 */
    if (lo <= x && x <= hi) {
        printf("in\n");
    } else {
        printf("out\n");
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int x, lo, hi;
    if (scanf("%d %d %d", &x, &lo, &hi) != 3) {
        return 0;
    }
    /* 判断 x 是否在 [lo, hi] 内 */

    return 0;
}
```

## 复杂度
O(1)。本题考查关系运算的结果是 0/1、连续比较的陷阱，以及用比较代替算术来避免溢出。

## 常见错误
### 写成连续比较 lo <= x <= hi [CE]
`lo <= x` 的结果是 0 或 1，再和 hi 比较：只要 hi ≥ 1 结果总是"真"，hi 为负数时又几乎总是"假"。本平台的 Clang 23 会直接报编译错误 `chained comparison`；但如果你用 GCC，它只给出警告、程序照样运行，然后在隐藏用例 03、04、05 上答案错误。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int x, lo, hi;
    if (scanf("%d %d %d", &x, &lo, &hi) != 3) {
        return 0;
    }
    if (lo <= x <= hi) {
        printf("in\n");
    } else {
        printf("out\n");
    }
    return 0;
}
```

### 用乘积的符号判断 [UB]
`(x - lo) * (hi - x) >= 0` 在数学上正确，但 `x - lo` 和乘法都可能超出 `int` 的范围（有符号溢出是未定义行为）。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    int x, lo, hi;
    if (scanf("%d %d %d", &x, &lo, &hi) != 3) {
        return 0;
    }
    if ((x - lo) * (hi - x) >= 0) {
        printf("in\n");
    } else {
        printf("out\n");
    }
    return 0;
}
```

### 把闭区间写成开区间 [WA]
`lo < x && x < hi` 漏掉了 x 等于端点的情况。题目是闭区间，要用 `<=`。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int x, lo, hi;
    if (scanf("%d %d %d", &x, &lo, &hi) != 3) {
        return 0;
    }
    if (lo < x && x < hi) {
        printf("in\n");
    } else {
        printf("out\n");
    }
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
5 1 10
```
```out
in
```

### 02 sample 示例 2
```in
1 1 10
```
```out
in
```

### 03 trap 小于下界（连续比较会误判为 in）
```in
0 1 10
```
```out
out
```

### 04 trap 大于上界（连续比较会误判为 in）
```in
11 1 10
```
```out
out
```

### 05 trap 区间全为负数（连续比较会误判为 out）
```in
-5 -10 -1
```
```out
in
```

### 06 boundary 区间为 int 的完整范围，x 为最小值
```in
-2147483648 -2147483648 2147483647
```
```out
in
```

### 07 boundary 区间为 int 的完整范围，x 为最大值
```in
2147483647 -2147483648 2147483647
```
```out
in
```

### 08 degenerate 区间只有一个点，x 在其中
```in
5 5 5
```
```out
in
```

### 09 degenerate 区间只有一个点，x 不在其中
```in
3 5 5
```
```out
out
```

### 10 trap 乘积超出 int 范围
```in
100000 0 50000
```
```out
out
```
