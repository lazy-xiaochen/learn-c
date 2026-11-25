---json
{
  "id": "p-s1-loop-patterns-2",
  "title": "统计区间内各位数字之和等于 k 的整数个数",
  "difficulty": "L2",
  "knowledgePoints": ["s1-loop-patterns", "s1-loops"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入三个整数 a、b、k，统计区间 [a, b] 中有多少个整数，它的各位数字之和恰好等于 k。（0 的各位数字之和是 0。）

## 输入格式
一行，三个整数 a、b、k。

## 输出格式
一行，满足条件的整数个数。

## 数据范围
0 ≤ a ≤ b ≤ 1000000，0 ≤ k ≤ 100

## 示例
### 示例 1
```in
1 20 2
```
```out
3
```
> 2、11、20 的各位数字之和都是 2。

### 示例 2（边界：区间只有 0）
```in
0 0 0
```
```out
1
```

## 提示
### 第 1 层
外层循环枚举区间里的每一个数，内层循环求这个数的各位数字之和。

### 第 2 层
求各位数字之和需要不断 `% 10` 和 `/= 10`，这会改变被处理的数。如果直接改外层的循环变量，外层循环就被打乱了。

### 第 3 层
`for (int i = a; i <= b; i++) { int t = i, s = 0; while (t > 0) { s += t % 10; t /= 10; } if (s == k) count++; }`。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int a, b, k;
    if (scanf("%d %d %d", &a, &b, &k) != 3) {
        return 0;
    }
    int count = 0;
    for (int i = a; i <= b; i++) {
        int t = i, s = 0;   /* 用副本 t 拆分数位，不改动循环变量 i */
        while (t > 0) {
            s += t % 10;
            t /= 10;
        }
        if (s == k) {
            count++;
        }
    }
    printf("%d\n", count);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int a, b, k;
    if (scanf("%d %d %d", &a, &b, &k) != 3) {
        return 0;
    }
    /* 统计并输出 */

    return 0;
}
```

## 复杂度
时间 O((b − a + 1) × 位数)，最多约 7 × 10⁶ 次运算。空间 O(1)。

## 常见错误
### 直接拆分外层的循环变量 [TLE]
`while (i > 0) { s += i % 10; i /= 10; }` 把 i 变成了 0，外层 `i++` 又让它变成 1……i 永远到不了 b，循环不会结束。
```c file=main.c expect=TLE
#include <stdio.h>

int main(void) {
    int a, b, k;
    if (scanf("%d %d %d", &a, &b, &k) != 3) {
        return 0;
    }
    int count = 0;
    for (int i = a; i <= b; i++) {
        int s = 0;
        while (i > 0) {
            s += i % 10;
            i /= 10;
        }
        if (s == k) {
            count++;
        }
    }
    printf("%d\n", count);
    return 0;
}
```

### 数位和变量在循环外初始化 [WA]
s 只在开头清零一次，之后每个数的数位和都累加到了前面的结果上。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int a, b, k;
    if (scanf("%d %d %d", &a, &b, &k) != 3) {
        return 0;
    }
    int count = 0, s = 0;
    for (int i = a; i <= b; i++) {
        int t = i;
        while (t > 0) {
            s += t % 10;
            t /= 10;
        }
        if (s == k) {
            count++;
        }
    }
    printf("%d\n", count);
    return 0;
}
```

### 区间写成了左闭右开 [WA]
`i < b` 漏掉了 b 本身。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int a, b, k;
    if (scanf("%d %d %d", &a, &b, &k) != 3) {
        return 0;
    }
    int count = 0;
    for (int i = a; i < b; i++) {
        int t = i, s = 0;
        while (t > 0) {
            s += t % 10;
            t /= 10;
        }
        if (s == k) {
            count++;
        }
    }
    printf("%d\n", count);
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
1 20 2
```
```out
3
```

### 02 sample 示例 2
```in
0 0 0
```
```out
1
```

### 03 boundary 最大区间，k = 1（只有 10 的幂）
```in
0 1000000 1
```
```out
7
```

### 04 boundary 最大区间，k 超过最大可能的数位和
```in
0 1000000 60
```
```out
0
```

### 05 degenerate 区间只有一个数，且满足条件
```in
999999 999999 54
```
```out
1
```

### 06 degenerate 区间只有一个数，且不满足条件
```in
5 5 3
```
```out
0
```

### 07 trap 右端点本身满足条件
```in
0 9 9
```
```out
1
```

### 08 normal 一般情况
```in
100 200 5
```
```out
5
```

### 09 boundary 最大区间，k = 27
```in
0 1000000 27
```
```out
55252
```

### 10 normal 一般区间
```in
123456 654321 21
```
```out
24971
```
