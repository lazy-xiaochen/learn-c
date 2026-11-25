---json
{
  "id": "p-s2-array-2d-1",
  "title": "二维数组地址推算：行优先偏移与首地址",
  "difficulty": "L2",
  "knowledgePoints": ["s2-array-2d", "s2-array-memory"],
  "special": "memory-layout",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
内存是一维的，没有"行"也没有"列"。二维数组在内存里其实是一条**按行排好的长带子**：先把第 0 行从左到右放完，紧接着放第 1 行，再放第 2 行……这种摆放方式叫**行优先**（row-major）。

现在有一个 `int a[rows][cols]`，它的首地址（也就是 `&a[0][0]`）是 `base`。本平台的 `int` 占 4 字节。

给定行数 `rows`、列数 `cols`、首地址 `base`，以及某个元素的行下标 `i`、列下标 `j`，请你推算三个值：

1. `a[i][j]` 相对首地址的**字节偏移**；
2. `&a[i][j]` 的**地址**；
3. 整个数组最后一个元素 `a[rows - 1][cols - 1]` 的**地址**。

请用公式算出来。不要真的定义数组再打印真实地址——真实地址每次运行都可能不同，而且本题的 `base` 是假设值。

## 输入格式
一行五个整数 `rows cols base i j`，相邻两个之间用一个空格分隔：

- `rows`：行数；
- `cols`：列数；
- `base`：首地址 `&a[0][0]`；
- `i`、`j`：要查询的元素的行下标和列下标。

## 输出格式
三行，每行一个整数，不要输出任何其它内容：

1. 第一行：`a[i][j]` 相对 `&a[0][0]` 的字节偏移（非负）；
2. 第二行：`&a[i][j]` 的地址；
3. 第三行：`&a[rows - 1][cols - 1]` 的地址。

## 数据范围
- 1 ≤ rows, cols ≤ 10；
- 0 ≤ i < rows，0 ≤ j < cols；
- 0 ≤ base ≤ 2147483600。

数组最多 100 个元素。最后一个元素的地址最大是 `2147483600 + 99 × 4 = 2147483996`，已经超过 `int` 能表示的最大值 `2147483647`。所以地址必须用 `long long` 保存，计算时也要让表达式按 64 位进行。

## 示例
### 示例 1
```in
3 4 1000 1 2
```
```out
24
1024
1044
```
> `a[1][2]` 前面有 1 整行（4 个元素）再加上本行的 2 个，共 6 个元素，偏移 6 × 4 = 24 字节。
> 首地址 1000 + 24 = 1024。最后一个元素是第 3 × 4 − 1 = 11 个元素，地址 1000 + 11 × 4 = 1044。

### 示例 2（边界：查询的正好是首元素 a[0][0]）
```in
3 4 1000 0 0
```
```out
0
1000
1044
```
> 首元素的偏移是 0，地址就是首地址本身。最后一个元素的地址只和 `rows × cols` 有关，所以和示例 1 完全相同。

## 提示
### 第 1 层
先把二维下标换成一个一维序号。行优先布局里，`a[i][j]` 前面已经放满了 `i` 整行，每行 `cols` 个元素，再加上本行的 `j` 个。

### 第 2 层
序号 = `i * cols + j`。序号乘上 `sizeof(int)`（4 字节）就是字节偏移。最后一个元素的序号是 `rows * cols - 1`，同样乘 4 再加首地址。

### 第 3 层
地址用 `long long`：`long long offset = ((long long)i * cols + j) * 4;`，再算 `base + offset`。`base` 也要用 `long long` 读（`%lld`），不能读进 `int`。注意乘的是**列数 cols**，不是行数 rows——每行有几个元素由列数决定。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int rows, cols, i, j;
    long long base;
    if (scanf("%d %d %lld %d %d", &rows, &cols, &base, &i, &j) != 5) {
        return 0;
    }

    /* a[i][j] 前面有 i 整行（每行 cols 个）加上本行的 j 个 */
    long long offset = ((long long)i * cols + j) * 4;
    /* 最后一个元素是第 rows * cols - 1 个 */
    long long last = base + ((long long)rows * cols - 1) * 4;

    printf("%lld\n%lld\n%lld\n", offset, base + offset, last);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int rows, cols, i, j;
    long long base;
    if (scanf("%d %d %lld %d %d", &rows, &cols, &base, &i, &j) != 5) {
        return 0;
    }

    /* 在这里算出：
     *   1. a[i][j] 相对首地址的字节偏移
     *   2. &a[i][j] 的地址
     *   3. 最后一个元素 a[rows - 1][cols - 1] 的地址
     * 下面三行只是占位，全是错的。 */
    printf("0\n%lld\n0\n", base);
    return 0;
}
```

## 复杂度
时间 O(1)：只有几次乘法、加法和减法。
空间 O(1)。

本题的重点不是算法，而是"行优先布局"这条内存规律：**偏移 = 序号 × 4，序号 = 行号 × 列数 + 列号**。理解了它，`a[i][j]` 的地址就能心算出来。

## 常见错误
### 用 int 存地址，越过了 int 的上限 [UB]
`int` 最大只能表示 2147483647，而本题的地址最大是 2147483996。用 `int` 做加法会发生有符号整数溢出，属于未定义行为：开启检查时程序直接报错终止，不开启检查时可能得到一个负数地址。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    int rows, cols, base, i, j;
    if (scanf("%d %d %d %d %d", &rows, &cols, &base, &i, &j) != 5) {
        return 0;
    }

    int offset = (i * cols + j) * 4;
    int addr = base + offset;
    int last = base + (rows * cols - 1) * 4;   /* 首地址很大时这里会溢出 */

    printf("%d\n%d\n%d\n", offset, addr, last);
    return 0;
}
```

### 把行列写反：乘成了行数 rows [WA]
`a[i][j]` 前面有 `i * cols + j` 个元素，其中乘的是**列数**（每行有多少个元素）。乘成行数等于按列优先摆放，只要 rows 和 cols 不相等，结果就全错。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int rows, cols, i, j;
    long long base;
    if (scanf("%d %d %lld %d %d", &rows, &cols, &base, &i, &j) != 5) {
        return 0;
    }

    /* 错：每行有 cols 个元素，这里却乘了行数 rows */
    long long offset = ((long long)j * rows + i) * 4;
    long long last = base + ((long long)rows * cols - 1) * 4;

    printf("%lld\n%lld\n%lld\n", offset, base + offset, last);
    return 0;
}
```

### 把列数硬编码成 4 [WA]
课文用 `int m[3][4]` 举例，很容易让人把 4 当成固定值。但题目里的 `cols` 来自输入，可能是 1，也可能是 10。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int rows, cols, i, j;
    long long base;
    if (scanf("%d %d %lld %d %d", &rows, &cols, &base, &i, &j) != 5) {
        return 0;
    }

    /* 错：列数不一定是 4 */
    long long offset = ((long long)i * 4 + j) * 4;
    long long last = base + ((long long)rows * cols - 1) * 4;

    printf("%lld\n%lld\n%lld\n", offset, base + offset, last);
    return 0;
}
```

### 忘记乘 sizeof(int)，把元素个数当字节数 [WA]
`i * cols + j` 算出来的是"第几个元素"，单位是元素，不是字节。一个 `int` 占 4 字节，还要再乘 4。只有第 0 个元素的偏移碰巧是 0，是对的。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int rows, cols, i, j;
    long long base;
    if (scanf("%d %d %lld %d %d", &rows, &cols, &base, &i, &j) != 5) {
        return 0;
    }

    /* 错：这是元素个数，不是字节偏移 */
    long long offset = (long long)i * cols + j;
    long long last = base + ((long long)rows * cols - 1) * 4;

    printf("%lld\n%lld\n%lld\n", offset, base + offset, last);
    return 0;
}
```

### 把数组大小写死成 int a[3][4] [RE|UB]
题目给的是抽象的 `a[rows][cols]`，行列都来自输入。如果照着课文写 `int a[3][4]`，再用输入的行列去访问，输入 10×10 时下标 3 就已经越界：开着内存检查会直接崩溃报越界（RE），只开未定义行为检查时也可能报下标越界（UB）。要么按题目要求用公式算，要么把数组开得足够大（至少 `[10][10]`）。

## 测试用例
### 01 sample 示例 1
```in
3 4 1000 1 2
```
```out
24
1024
1044
```

### 02 sample 示例 2
```in
3 4 1000 0 0
```
```out
0
1000
1044
```

### 03 boundary 首地址接近 int 上限
```in
10 10 2147483600 0 0
```
```out
0
2147483600
2147483996
```

### 04 degenerate 1×1 的数组
```in
1 1 8 0 0
```
```out
0
8
8
```

### 05 trap 只有一列时列数不能当成 4
```in
5 1 4096 3 0
```
```out
12
4108
4112
```

### 06 trap 行列写反（rows 与 cols 不相等）
```in
3 4 2000 2 1
```
```out
36
2036
2044
```

### 07 normal 10×10 的中间元素
```in
10 10 500000 4 7
```
```out
188
500188
500396
```

### 08 normal 只有一行
```in
1 10 123456 0 3
```
```out
12
123468
123492
```

### 09 boundary 大首地址配中间元素
```in
10 10 2147483500 5 5
```
```out
220
2147483720
2147483896
```

### 10 trap 最后一行的元素
```in
4 3 700 2 2
```
```out
32
732
744
```
