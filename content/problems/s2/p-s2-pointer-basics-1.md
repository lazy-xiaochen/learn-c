---json
{
  "id": "p-s2-pointer-basics-1",
  "title": "用指针交换两个整数的值",
  "difficulty": "L2",
  "knowledgePoints": ["s2-pointer-basics", "s1-variables"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入两个整数 a、b，声明两个指针分别指向它们，**通过指针**把两个变量的值交换，然后输出交换后的 a、b。

要求：交换必须通过 `*p` 完成，不能直接写 `a = b`。

## 输入格式
一行两个整数 a、b，用空格分隔。

## 输出格式
一行两个整数：交换后的 a 和 b，用一个空格分隔。

## 数据范围
-2147483647 ≤ a, b ≤ 2147483647

## 示例
### 示例 1
```in
3 8
```
```out
8 3
```
> 交换后 a 变成 8，b 变成 3。

### 示例 2（边界：两个数相同）
```in
5 5
```
```out
5 5
```
> 两个数相同时，交换前后看起来没有变化，但程序仍然要正确执行交换。

## 提示
### 第 1 层
指针 `p` 存的是变量的地址，`*p` 才是那个变量本身。想修改 a 和 b，就要通过 `*pa`、`*pb` 去改。

### 第 2 层
交换两个变量需要第三个临时变量。直接写 `*pa = *pb; *pb = *pa;` 是不行的：第一句执行完，a 的值就没了。

### 第 3 层
顺序是：`int t = *pa;` → `*pa = *pb;` → `*pb = t;`。注意 `t` 存的是**值**，不是指针。交换完再输出 `a`、`b`（或 `*pa`、`*pb`，两者此时指向同一个变量）。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) {
        return 0;
    }

    int *pa = &a;      /* pa 指向 a */
    int *pb = &b;      /* pb 指向 b */

    int t = *pa;       /* 先把 a 的值存起来 */
    *pa = *pb;         /* 把 b 的值写进 a */
    *pb = t;           /* 把原来的 a 写进 b */

    printf("%d %d\n", a, b);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) {
        return 0;
    }

    int *pa = &a;
    int *pb = &b;

    /* 在这里通过 *pa 和 *pb 交换 a、b 的值 */
    (void)pa;
    (void)pb;

    printf("%d %d\n", a, b);
    return 0;
}
```

## 复杂度
时间 O(1)，空间 O(1)。
交换本身只有三次赋值，与数据大小无关。

## 常见错误
### 交换顺序写反 [WA]
先执行 `*pa = *pb;` 时，a 原来的值已经被覆盖了，再执行 `*pb = *pa;` 只是把 b 的值又写了一遍，结果两个变量都等于原来的 b。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) {
        return 0;
    }

    int *pa = &a;
    int *pb = &b;

    *pa = *pb;      /* a 被覆盖 */
    *pb = *pa;      /* 这里写回的还是 b 的值 */

    printf("%d %d\n", a, b);
    return 0;
}
```

### 交换的是指针本身，不是它指向的值 [WA]
`int *t = pa; pa = pb; pb = t;` 只是让两个指针换了指向，a、b 的值一个都没变。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) {
        return 0;
    }

    int *pa = &a;
    int *pb = &b;

    int *t = pa;    /* 换的是指针 */
    pa = pb;
    pb = t;

    printf("%d %d\n", a, b);
    return 0;
}
```

### 用普通函数 swap(int a, int b) 来交换 [WA]
形参是实参的副本，函数里怎么交换都不会影响调用者的变量（这是下一节"指针作函数参数"要解决的问题）。本题要求在主函数里直接用指针操作。

### scanf 忘记写 & [RE]
`scanf("%d %d", a, b)` 会把 a、b 的**值**当成地址去写，通常直接崩溃。`scanf` 需要的是地址，所以必须写 `&a`、`&b`。

## 测试用例
### 01 sample 示例 1
```in
3 8
```
```out
8 3
```

### 02 sample 示例 2
```in
5 5
```
```out
5 5
```

### 03 degenerate 两个 0
```in
0 0
```
```out
0 0
```

### 04 trap 一正一负
```in
-7 2
```
```out
2 -7
```

### 05 boundary int 的极值
```in
2147483647 -2147483647
```
```out
-2147483647 2147483647
```

### 06 normal 两个负数
```in
-1 -2
```
```out
-2 -1
```

### 07 trap 绝对值相同、符号相反
```in
1000 -1000
```
```out
-1000 1000
```

### 08 normal 大整数
```in
123456789 -987654321
```
```out
-987654321 123456789
```
