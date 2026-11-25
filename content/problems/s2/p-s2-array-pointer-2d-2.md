---json
{
  "id": "p-s2-array-pointer-2d-2",
  "title": "锯齿数组的统计：用指针数组管理不等长的行",
  "difficulty": "L3",
  "knowledgePoints": ["s2-array-pointer-2d", "s2-pointer-array-traverse"],
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
二维数组 `int m[100][100]` 要求每一行长度相同。但有些数据天生就不齐：比如第 0 行 1 个数、第 1 行 2 个数、第 2 行 3 个数……这种"下三角"结构叫**锯齿数组**，用等长二维数组存会浪费一半空间，而且每行的有效长度还得另外记。

标准做法是：拿一块连续缓冲区 `int buf[5050]` 装下所有数，再用一个**指针数组** `int *rows[100]` 记住每一行从哪里开始。`rows[i]` 指向第 i 行的第一个元素，第 i 行有 `i + 1` 个元素。

请按这个结构读入数据，并统计：

1. 每一行的和；
2. 每一列的和（第 j 列由第 j 行及以后的行贡献）；
3. 所有数的总和。

## 输入格式
第一行一个整数 `n`。
接下来 `n` 行，第 i 行（从 0 开始数）有 `i + 1` 个整数，表示锯齿数组的第 i 行。

## 输出格式
先输出 `n` 行，第 i 行为 `row i: 该行之和`；
再输出 `n` 行，第 j 行为 `col j: 该列之和`；
最后输出一行 `total: 所有数之和`。

格式必须完全一致（冒号后有一个空格）。

## 数据范围
- 1 ≤ n ≤ 100
- 每个数的绝对值 ≤ 1000000
- 元素总数为 `n(n+1)/2`，最多 5050 个

所有元素加起来最大是 `5050 × 10^6 = 5.05 × 10^9`，超过了 `int` 的上限（约 `2.1 × 10^9`）。因此行和、列和、总和都必须用 `long long` 保存。

## 示例
### 示例 1
```in
3
1
2 3
4 5 6
```
```out
row 0: 1
row 1: 5
row 2: 15
col 0: 7
col 1: 8
col 2: 6
total: 21
```
> 第 0 行 `1`，第 1 行 `2+3=5`，第 2 行 `4+5+6=15`。第 0 列是 `1+2+4=7`，第 1 列只有第 1、2 行贡献：`3+5=8`，第 2 列只有第 2 行：`6`。

### 示例 2（边界：只有一行）
```in
1
-1000000
```
```out
row 0: -1000000
col 0: -1000000
total: -1000000
```
> n = 1 时整个结构只有一个元素，行和、列和、总和都是它自己。注意它取到了数据范围的负边界。

## 提示
### 第 1 层
每行的起点不是 `i`，而是"前面所有行的长度之和"：第 0 行从 0 开始，第 1 行从 1 开始，第 2 行从 3 开始，第 3 行从 6 开始……用一个变量 `pos` 边读边累加，`rows[i] = &buf[pos]` 就能记住每行的起点。

### 第 2 层
读入之后，第 i 行有 `i + 1` 个元素，访问方式是 `rows[i][j]`。行和就是 `j` 从 0 到 `i` 累加；列和可以在同一个循环里顺手做：`col[j] += rows[i][j]`。因为第 j 列只存在于行号 `i >= j` 的行里，用 `j <= i` 作内层上界天然就跳过了所有"没有这一列"的行。

### 第 3 层
`long long col[100] = {0};` 先整体清零，再累加。行和用 `long long s`，每行输出后加到 `total`。输出分三段：先 `row`，再 `col`（共 n 个），最后 `total`。注意 `long long` 的格式符是 `%lld`。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }

    int buf[5050];               /* 一块连续缓冲区，装下所有数 */
    int *rows[100];              /* 指针数组：rows[i] 指向第 i 行的起点 */

    int pos = 0;
    for (int i = 0; i < n; i++) {
        rows[i] = &buf[pos];     /* 第 i 行从 buf[pos] 开始 */
        for (int j = 0; j <= i; j++) {
            if (scanf("%d", &buf[pos]) != 1) {
                return 0;
            }
            pos++;
        }
    }

    long long col[100] = {0};    /* 列和必须用 long long，并先清零 */
    long long total = 0;
    for (int i = 0; i < n; i++) {
        long long s = 0;
        for (int j = 0; j <= i; j++) {      /* 第 i 行只有 i+1 个元素 */
            s += rows[i][j];
            col[j] += rows[i][j];
        }
        printf("row %d: %lld\n", i, s);
        total += s;
    }
    for (int j = 0; j < n; j++) {
        printf("col %d: %lld\n", j, col[j]);
    }
    printf("total: %lld\n", total);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }

    int buf[5050];
    int *rows[100];

    int pos = 0;
    for (int i = 0; i < n; i++) {
        rows[i] = &buf[pos];
        for (int j = 0; j <= i; j++) {
            if (scanf("%d", &buf[pos]) != 1) {
                return 0;
            }
            pos++;
        }
    }

    /* TODO：用 rows 指针数组计算每一行的和、每一列的和与总和。
     * 下面只是占位输出。 */
    for (int i = 0; i < n; i++) {
        printf("row %d: 0\n", i);
    }
    for (int j = 0; j < n; j++) {
        printf("col %d: 0\n", j);
    }
    printf("total: 0\n");
    return 0;
}
```

## 复杂度
时间：O(n²)，元素总数为 n(n+1)/2，每个元素只被访问一次。
空间：O(n²) 存数据（最多 5050 个 int），另有 O(n) 的指针数组和列和数组。

## 常见错误
### 用 int 累加 [UB]
元素总数最多 5050，每个最大 10^6，总和可达 5.05 × 10^9，超过 `int` 的上限。行和、列和、总和只要有一个用 `int`，累加时就会发生有符号整数溢出（未定义行为），本平台的检查工具会直接报错。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }

    int buf[5050];
    int *rows[100];

    int pos = 0;
    for (int i = 0; i < n; i++) {
        rows[i] = &buf[pos];
        for (int j = 0; j <= i; j++) {
            if (scanf("%d", &buf[pos]) != 1) {
                return 0;
            }
            pos++;
        }
    }

    int col[100] = {0};                  /* 错：int 装不下 5×10^9 */
    int total = 0;
    for (int i = 0; i < n; i++) {
        int s = 0;                       /* 错 */
        for (int j = 0; j <= i; j++) {
            s += rows[i][j];
            col[j] += rows[i][j];
        }
        printf("row %d: %d\n", i, s);
        total += s;
    }
    for (int j = 0; j < n; j++) {
        printf("col %d: %d\n", j, col[j]);
    }
    printf("total: %d\n", total);
    return 0;
}
```

### 把每一行都当成有 n 个元素 [WA]
`rows[i]` 指向的第 i 行只有 `i + 1` 个数。如果内层循环写成 `j < n`，多出来的下标会读到缓冲区里**下一行**的数据，行和、列和都会算进别的元素。第 i 行的长度由行号决定，循环条件必须是 `j <= i`。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }

    int buf[5050];
    int *rows[100];

    int pos = 0;
    for (int i = 0; i < n; i++) {
        rows[i] = &buf[pos];
        for (int j = 0; j <= i; j++) {
            if (scanf("%d", &buf[pos]) != 1) {
                return 0;
            }
            pos++;
        }
    }

    long long col[100] = {0};
    long long total = 0;
    for (int i = 0; i < n; i++) {
        long long s = 0;
        for (int j = 0; j < n; j++) {    /* 错：第 i 行只有 i+1 个元素 */
            s += rows[i][j];
            col[j] += rows[i][j];
        }
        printf("row %d: %lld\n", i, s);
        total += s;
    }
    for (int j = 0; j < n; j++) {
        printf("col %d: %lld\n", j, col[j]);
    }
    printf("total: %lld\n", total);
    return 0;
}
```

### 列和按"方阵"的方式遍历 [WA]
即使行和写对了，列和也不能对所有行都取 `rows[i][j]`。第 j 列只存在于行号大于等于 j 的行里；如果对每一行都算一遍，就会把同一行里别的列的数据算进第 j 列（和上一条错误的表现类似，但症状是按列全部错位）。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }

    int buf[5050];
    int *rows[100];

    int pos = 0;
    for (int i = 0; i < n; i++) {
        rows[i] = &buf[pos];
        for (int j = 0; j <= i; j++) {
            if (scanf("%d", &buf[pos]) != 1) {
                return 0;
            }
            pos++;
        }
    }

    long long col[100] = {0};
    long long total = 0;
    for (int i = 0; i < n; i++) {
        long long s = 0;
        for (int j = 0; j <= i; j++) {
            s += rows[i][j];
        }
        printf("row %d: %lld\n", i, s);
        total += s;
    }
    for (int j = 0; j < n; j++) {
        for (int i = 0; i < n; i++) {    /* 错：rows[i][j] 在 j > i 时不存在 */
            col[j] += rows[i][j];
        }
    }
    for (int j = 0; j < n; j++) {
        printf("col %d: %lld\n", j, col[j]);
    }
    printf("total: %lld\n", total);
    return 0;
}
```

### 用 %d 打印 long long [WA]
`long long` 必须配 `%lld`。用 `%d` 时 `printf` 只读取参数的低 32 位，小数值看起来正常，一旦超过 `int` 的范围就会打印出错误的数。编译器会用 `-Wformat` 警告，别忽略。

## 测试用例
### 01 sample 示例 1
```in
3
1
2 3
4 5 6
```
```out
row 0: 1
row 1: 5
row 2: 15
col 0: 7
col 1: 8
col 2: 6
total: 21
```

### 02 sample 示例 2
```in
1
-1000000
```
```out
row 0: -1000000
col 0: -1000000
total: -1000000
```

### 03 degenerate 全是 0 的两行
```in
2
0
0 0
```
```out
row 0: 0
row 1: 0
col 0: 0
col 1: 0
total: 0
```

### 04 trap 全是负数
```in
4
-1
-2 -3
-4 -5 -6
-7 -8 -9 -10
```
```out
row 0: -1
row 1: -5
row 2: -15
row 3: -34
col 0: -14
col 1: -16
col 2: -15
col 3: -10
total: -55
```

### 05 normal 1 到 55 依次填入
```in
10
1
2 3
4 5 6
7 8 9 10
11 12 13 14 15
16 17 18 19 20 21
22 23 24 25 26 27 28
29 30 31 32 33 34 35 36
37 38 39 40 41 42 43 44 45
46 47 48 49 50 51 52 53 54 55
```
```out
row 0: 1
row 1: 5
row 2: 15
row 3: 34
row 4: 65
row 5: 111
row 6: 175
row 7: 260
row 8: 369
row 9: 505
col 0: 175
col 1: 183
col 2: 188
col 3: 189
col 4: 185
col 5: 175
col 6: 158
col 7: 133
col 8: 99
col 9: 55
total: 1540
```

### 06 trap 正负交替，行和会出现 0
```in
4
1000000
-1000000 1000000
-1000000 1000000 -1000000
1000000 -1000000 1000000 -1000000
```
```out
row 0: 1000000
row 1: 0
row 2: -1000000
row 3: 0
col 0: 0
col 1: 1000000
col 2: 0
col 3: -1000000
total: 0
```

### 生成 boundary 最大规模：100 行，每格 10^6
```js gen
const n = 100;
let input = `${n}\n`;
for (let i = 0; i < n; i++) {
  const vals = [];
  for (let j = 0; j <= i; j++) vals.push(1000000);
  input += vals.join(' ') + '\n';
}

let output = '';
let total = 0;
for (let i = 0; i < n; i++) {
  const s = (i + 1) * 1000000;
  output += `row ${i}: ${s}\n`;
  total += s;
}
for (let j = 0; j < n; j++) output += `col ${j}: ${(n - j) * 1000000}\n`;
output += `total: ${total}\n`;
return [{ kind: 'boundary', category: '最大规模：n=100、每格 10^6', input, output }];
```
