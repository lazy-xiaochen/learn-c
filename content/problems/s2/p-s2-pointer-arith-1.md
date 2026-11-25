---json
{
  "id": "p-s2-pointer-arith-1",
  "title": "指针运算推理：*p++、*p-- 与指针差",
  "difficulty": "L2",
  "knowledgePoints": ["s2-pointer-arith", "s2-pointer-basics"],
  "special": "pointer-reasoning",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入 n 个整数放进数组 `a`，再读入一个下标 `k`。已知程序里执行了下面这段代码：

```c
int *p = a + k;
int x = *p++;
int y = *p--;
int z = (int)(p - a);
```

请你推算出 `x`、`y`、`z` 三个值并输出。要求在你的程序里也真的用指针完成同样的操作，不要直接写 `a[k]`、`a[k + 1]`、`k`。

## 输入格式
第一行一个整数 n（2 ≤ n ≤ 8）。
第二行 n 个整数，用空格分隔。
第三行一个整数 k（0 ≤ k ≤ n - 2）。

## 输出格式
三行，每行一个整数：
1. `x`
2. `y`
3. `z`

## 数据范围
2 ≤ n ≤ 8
每个整数的绝对值不超过 1000
0 ≤ k ≤ n - 2（保证 `k + 1` 仍在数组范围内）

## 示例
### 示例 1
```in
5
10 20 30 40 50
1
```
```out
20
30
1
```
> `p = a + 1` 指向 20；`*p++` 取出 20 后 p 指向 30；`*p--` 取出 30 后 p 回到 a + 1，所以 `p - a` = 1。

### 示例 2（边界：n 只有 2，k 只能为 0）
```in
2
7 9
0
```
```out
7
9
0
```
> 此时 `x` 是第一个元素、`y` 是第二个元素，指针绕一圈后回到起点。

## 提示
### 第 1 层
先把 `p` 指向哪里、每次 `++`/`--` 之后又指向哪里画出来。关键点是：`++` 和 `--` 改的是**指针**，不是指针指向的值。

### 第 2 层
`*p++` 等价于 `*(p++)`：先取当前 `*p` 的值，再让 p 后移一个元素。`*p--` 同理，先取值再前移。
`p - a` 是指针相减，结果是**元素个数**，不是字节数。

### 第 3 层
`x = a[k]`；执行完第一句后 p 指向 a[k+1]；`y = a[k+1]`；执行完第二句后 p 又回到 a[k]；所以 `z = k`。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 2 || n > 8) {
        return 0;
    }

    int a[8];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int k;
    if (scanf("%d", &k) != 1 || k < 0 || k > n - 2) {
        return 0;
    }

    int *p = a + k;
    int x = *p++;          /* 取出 a[k]，p 移到 a[k+1] */
    int y = *p--;          /* 取出 a[k+1]，p 移回 a[k] */
    int z = (int)(p - a);  /* 指针相减得到元素个数 */

    printf("%d\n%d\n%d\n", x, y, z);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 2 || n > 8) {
        return 0;
    }

    int a[8];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int k;
    if (scanf("%d", &k) != 1 || k < 0 || k > n - 2) {
        return 0;
    }

    /* 用指针完成题目里的三句操作，算出 x、y、z */
    printf("%d\n%d\n%d\n", a[0], a[0], 0);
    return 0;
}
```

## 复杂度
时间 O(n)（读入数组），指针操作本身是 O(1)。
空间 O(n)（固定 8 个 int）。

## 常见错误
### 把 `*p++` 理解成"指针先加 1 再取值" [WA]
写成 `int x = *(++p);` 会先让 p 前进到 a[k+1]，再取值，x 变成了 a[k+1]。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 2 || n > 8) {
        return 0;
    }

    int a[8];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int k;
    if (scanf("%d", &k) != 1 || k < 0 || k > n - 2) {
        return 0;
    }

    int *p = a + k;
    int x = *(++p);        /* 错：先加再取 */
    int y = *p--;
    int z = (int)(p - a);

    printf("%d\n%d\n%d\n", x, y, z);
    return 0;
}
```

### 指针相减当成字节数 [WA]
`p - a` 的单位是元素，不是字节。如果把两个指针转成 `char *` 再相减，得到的是 4 倍的字节数。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 2 || n > 8) {
        return 0;
    }

    int a[8];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int k;
    if (scanf("%d", &k) != 1 || k < 0 || k > n - 2) {
        return 0;
    }

    int *p = a + k;
    int x = *p++;
    int y = *p--;
    int z = (int)((char *)p - (char *)a);   /* 错：这是字节数 */

    printf("%d\n%d\n%d\n", x, y, z);
    return 0;
}
```

### 忘记 `p++` 会改变 `p` [WA]
连着写两个 `x = *p; y = *p;` 会取到同一个元素，因为 p 从来没动过。`*p++` 的意义就是"取值并前移"。

### 让 p 走到数组末尾还继续解引用 [UB]
`p` 可以指向 `a + n`（末尾的下一个位置）用于比较，但 `*(a + n)` 是越界读。题目保证 k ≤ n - 2，就是为了让两次取值都落在数组内。

## 测试用例
### 01 sample 示例 1
```in
5
10 20 30 40 50
1
```
```out
20
30
1
```

### 02 sample 示例 2
```in
2
7 9
0
```
```out
7
9
0
```

### 03 degenerate 全是 0
```in
2
0 0
0
```
```out
0
0
0
```

### 04 trap k 取到最大下标 n-2
```in
4
1 2 3 4
2
```
```out
3
4
2
```

### 05 boundary n 最大、k 最小
```in
8
1 2 3 4 5 6 7 8
0
```
```out
1
2
0
```

### 06 normal 一般情况
```in
6
9 8 7 6 5 4
3
```
```out
6
5
3
```

### 07 trap 含负数
```in
3
-1 -2 -3
1
```
```out
-2
-3
1
```

### 08 boundary n 最大、k 接近末尾
```in
8
100 200 300 400 500 600 700 800
6
```
```out
700
800
6
```
