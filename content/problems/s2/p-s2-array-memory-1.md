---json
{
  "id": "p-s2-array-memory-1",
  "title": "数组地址推算：首地址、下标与字节偏移",
  "difficulty": "L2",
  "knowledgePoints": ["s2-array-memory", "s1-int-types"],
  "special": "memory-layout",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个 `int` 数组在内存中是连续存放的，每个元素占 4 字节。
现假设某个 `int` 数组的首地址（也就是 `&a[0]` 的值）是 `base`，给定两个下标 `i`、`j`，请你推算：

1. `&a[i]` 的地址；
2. `&a[j]` 的地址；
3. `&a[i]` 与 `&a[j]` 之间相隔多少**字节**（取绝对值）。

请用 `long long` 保存地址：题目给出的 `base` 可能接近 `int` 的上限，加偏移后会超出 `int` 的范围。

## 输入格式
一行三个整数 `base i j`，用空格分隔。

## 输出格式
三行，每行一个整数：
1. `&a[i]` 的地址；
2. `&a[j]` 的地址；
3. 两个地址之间的字节距离（非负）。

## 数据范围
0 ≤ base ≤ 2147483640
0 ≤ i, j ≤ 9

`base + 4 × 9` 最大可达 2147483676，已经超过 `int` 的上限（2147483647），所以地址必须用 64 位整数保存。

## 示例
### 示例 1
```in
4096 0 3
```
```out
4096
4108
12
```
> `&a[3]` = 4096 + 3 × 4 = 4108；两者相差 12 字节。

### 示例 2（边界：两个下标相同）
```in
1000 5 5
```
```out
1020
1020
0
```
> 同一个元素，地址相同，距离为 0。

## 提示
### 第 1 层
先想清楚"第 i 个元素距离首地址多少字节"，再加上首地址。两个元素的地址都算出来以后，距离就是两者相减。

### 第 2 层
第 i 个元素的地址 = `base + i * sizeof(int)` = `base + i * 4`。
两个地址的距离要用绝对值：`i > j` 时是 `a[i] - a[j]`，否则是 `a[j] - a[i]`。

### 第 3 层
用 `long long base;` 读入，算 `base + 4LL * i`（`4LL` 保证按 64 位计算）。距离可以写成 `long long d = ai > aj ? ai - aj : aj - ai;`。注意 `i` 和 `j` 谁大谁小是不确定的，不能假定 `j >= i`。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    long long base;
    int i, j;
    if (scanf("%lld %d %d", &base, &i, &j) != 3) {
        return 0;
    }

    long long ai = base + 4LL * i;   /* 4LL 让整个表达式按 64 位计算 */
    long long aj = base + 4LL * j;
    long long d = ai > aj ? ai - aj : aj - ai;

    printf("%lld\n%lld\n%lld\n", ai, aj, d);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    long long base;
    int i, j;
    if (scanf("%lld %d %d", &base, &i, &j) != 3) {
        return 0;
    }

    /* 在这里算出 &a[i]、&a[j] 和两者之间的字节距离 */
    printf("%lld\n%lld\n0\n", base, base);
    return 0;
}
```

## 复杂度
时间 O(1)：只有几次算术运算。
空间 O(1)。
本题的重点不是算法，而是"地址 = 首地址 + 下标 × 元素大小"这条内存布局规律。

## 常见错误
### 用 int 存地址 [UB]
`int` 最大只能表示 2147483647，而本题最大地址是 2147483676。用 `int` 计算会发生有符号整数溢出，是未定义行为：在开启检查时程序会报错，不开启检查时可能得到一个负数地址。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    int base, i, j;
    if (scanf("%d %d %d", &base, &i, &j) != 3) {
        return 0;
    }

    int ai = base + 4 * i;   /* 这里可能溢出 */
    int aj = base + 4 * j;
    int d = ai > aj ? ai - aj : aj - ai;

    printf("%d\n%d\n%d\n", ai, aj, d);
    return 0;
}
```

### 距离忘记取绝对值 [WA]
写成 `long long d = ai - aj;`：当 `i < j` 时，`ai < aj`，算出来的距离是负数。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    long long base;
    int i, j;
    if (scanf("%lld %d %d", &base, &i, &j) != 3) {
        return 0;
    }

    long long ai = base + 4LL * i;
    long long aj = base + 4LL * j;
    long long d = ai - aj;      /* i < j 时是负数 */

    printf("%lld\n%lld\n%lld\n", ai, aj, d);
    return 0;
}
```

### 把元素大小当成 1 字节 [WA]
`int` 占 4 字节，不是 1。如果按 `base + i` 计算，等于把每个元素当成 `char`，地址会全部算错。只有 `char` 数组的元素大小才是 1。

## 测试用例
### 01 sample 示例 1
```in
4096 0 3
```
```out
4096
4108
12
```

### 02 sample 示例 2
```in
1000 5 5
```
```out
1020
1020
0
```

### 03 boundary 地址接近 int 上限
```in
2147483640 9 0
```
```out
2147483676
2147483640
36
```

### 04 degenerate 首地址为 0、下标为 0
```in
0 0 0
```
```out
0
0
0
```

### 05 trap i 比 j 大
```in
8000 7 2
```
```out
8028
8008
20
```

### 06 normal 一般情况
```in
123456 4 9
```
```out
123472
123492
20
```

### 07 boundary 最大下标
```in
4 9 9
```
```out
40
40
0
```

### 08 normal 大首地址、普通下标
```in
1073741824 1 8
```
```out
1073741828
1073741856
28
```
