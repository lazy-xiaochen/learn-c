---json
{
  "id": "p-s2-pointer-param-1",
  "title": "用指针参数把三个整数按从小到大排序",
  "difficulty": "L2",
  "knowledgePoints": ["s2-pointer-param", "s1-func-basics"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入三个整数 a、b、c，把它们按从小到大的顺序输出。

要求：写一个交换函数 `void swap(int *pa, int *pb)`，通过指针交换两个变量的值；主函数里只能调用这个函数来完成交换，不能直接写 `t = a; a = b; b = t;`。

## 输入格式
一行三个整数 a、b、c，用空格分隔。

## 输出格式
一行三个整数，按从小到大排列，用一个空格分隔。

## 数据范围
-2147483647 ≤ a, b, c ≤ 2147483647

## 示例
### 示例 1
```in
3 1 2
```
```out
1 2 3
```
> 1 最小、3 最大，排序后是 1 2 3。

### 示例 2（边界：三个数都相同）
```in
5 5 5
```
```out
5 5 5
```
> 三个数相等时，任何一次比较都不需要交换，输出保持原样。

## 提示
### 第 1 层
三个数排序，本质上是做几次"两两比较，逆序就交换"。交换必须真的改到 main 里的变量，所以要用指针。

### 第 2 层
`swap` 的形参是 `int *`，函数体里用 `*pa`、`*pb` 读写；调用时写 `swap(&a, &b)`。
只比较两次是不够的：交换之后，a 可能又比 b 大了。

### 第 3 层
标准做法是三次比较：先保证 a ≤ b，再保证 b ≤ c，最后再检查一次 a ≤ b。顺序是 `if (a > b) swap(&a, &b); if (b > c) swap(&b, &c); if (a > b) swap(&a, &b);`。

## 参考代码
```c file=main.c
#include <stdio.h>

void swap(int *pa, int *pb) {
    int t = *pa;
    *pa = *pb;
    *pb = t;
}

int main(void) {
    int a, b, c;
    if (scanf("%d %d %d", &a, &b, &c) != 3) {
        return 0;
    }

    if (a > b) {
        swap(&a, &b);
    }
    if (b > c) {
        swap(&b, &c);
    }
    if (a > b) {
        swap(&a, &b);      /* 前面的交换可能让 a 又比 b 大 */
    }

    printf("%d %d %d\n", a, b, c);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

/* 在这里写 void swap(int *pa, int *pb) */

int main(void) {
    int a, b, c;
    if (scanf("%d %d %d", &a, &b, &c) != 3) {
        return 0;
    }

    /* 用 swap 把 a、b、c 排好序 */

    printf("%d %d %d\n", a, b, c);
    return 0;
}
```

## 复杂度
时间 O(1)：最多比较 3 次、交换 3 次。
空间 O(1)。
排序三个数不需要通用排序算法，固定次数的两两比较即可。

## 常见错误
### swap 用值传递 [WA]
形参写成 `int a, int b`，函数里交换的是副本，main 里的变量没有任何变化，输出还是原来的顺序。
```c file=main.c expect=WA
#include <stdio.h>

void swap(int a, int b) {
    int t = a;
    a = b;
    b = t;
}

int main(void) {
    int a, b, c;
    if (scanf("%d %d %d", &a, &b, &c) != 3) {
        return 0;
    }

    if (a > b) {
        swap(a, b);
    }
    if (b > c) {
        swap(b, c);
    }
    if (a > b) {
        swap(a, b);
    }

    printf("%d %d %d\n", a, b, c);
    return 0;
}
```

### 只比较两次 [WA]
只做 `a > b` 和 `b > c` 两次交换，当输入是 3 2 1 时，第一次交换后 a、b 变成 2、3，第二次交换后 b、c 变成 1、3，结果 a 仍然比 b 大，输出 2 1 3。
```c file=main.c expect=WA
#include <stdio.h>

void swap(int *pa, int *pb) {
    int t = *pa;
    *pa = *pb;
    *pb = t;
}

int main(void) {
    int a, b, c;
    if (scanf("%d %d %d", &a, &b, &c) != 3) {
        return 0;
    }

    if (a > b) {
        swap(&a, &b);
    }
    if (b > c) {
        swap(&b, &c);
    }

    printf("%d %d %d\n", a, b, c);
    return 0;
}
```

### 调用时忘记写 & [RE]
`swap(a, b)` 把整数当成地址传给 `int *` 参数，编译器会给出类型不匹配的警告；强行运行会访问非法地址而崩溃。正确写法是 `swap(&a, &b)`。

### 在 swap 里交换指针而不是指针指向的值 [WA]
`int *t = pa; pa = pb; pb = t;` 只改了形参自己，main 里的 a、b 不变。必须写 `int t = *pa; *pa = *pb; *pb = t;`。

## 测试用例
### 01 sample 示例 1
```in
3 1 2
```
```out
1 2 3
```

### 02 sample 示例 2
```in
5 5 5
```
```out
5 5 5
```

### 03 degenerate 三个 0
```in
0 0 0
```
```out
0 0 0
```

### 04 trap 完全逆序
```in
3 2 1
```
```out
1 2 3
```

### 05 boundary int 的极值
```in
2147483647 -2147483647 0
```
```out
-2147483647 0 2147483647
```

### 06 normal 已经基本有序
```in
1 3 2
```
```out
1 2 3
```

### 07 trap 最小值在最后
```in
2 3 1
```
```out
1 2 3
```

### 08 normal 三个负数
```in
-1 -5 -3
```
```out
-5 -3 -1
```
