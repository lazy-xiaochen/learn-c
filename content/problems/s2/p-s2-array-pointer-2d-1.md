---json
{
  "id": "p-s2-array-pointer-2d-1",
  "title": "成绩表按行、按列求和：用数组指针把二维数组交给函数",
  "difficulty": "L3",
  "knowledgePoints": ["s2-array-pointer-2d", "s2-array-2d"],
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个班有若干名学生，每人考 4 门课。成绩按"学生一行、课程一列"存放在二维数组 `int m[1000][4]` 里，现在要统计：

1. 每个学生的总分；
2. 每门课的全班总分；
3. 全班所有成绩的总和。

为了练习**把二维数组传给函数**，请把统计逻辑写成下面这个函数，并在 `main` 里调用它：

```c
void table_sums(int (*m)[4], int rows, long long row_sum[], long long col_sum[4]);
```

形参 `int (*m)[4]` 是"指向 4 个 int 的数组"的指针，也就是**数组指针**。二维数组名 `m` 退化后正是这个类型；如果把它写成 `int **`，类型就对不上——二维数组的内存是一整块连续区域，里面并没有"指针数组"这一层。

输出时每行的 `row i` 是第 i 个学生的总分，`col j` 是第 j 门课的全班总分。

## 输入格式
第一行一个整数 `rows`，表示学生人数。
接下来 `rows` 行，每行 4 个整数，第 i 行的 4 个数就是第 i 个学生的 4 门课成绩。

## 输出格式
先输出 `rows` 行，第 i 行为 `row i: 总分`；
再输出 4 行，第 j 行为 `col j: 全班总分`；
最后输出一行 `total: 所有成绩之和`。

所有统计值都是整数。格式必须完全一致（冒号后有一个空格）。

## 数据范围
- 1 ≤ rows ≤ 1000
- |成绩| ≤ 1000000000

单个学生 4 门课的总分最大是 `4 × 10^9`，一门课的全班总分最大是 `1000 × 10^9 = 10^12`，全班总和最大是 `4 × 10^12`。这些都超过了 `int` 的上限（约 `2.1 × 10^9`），所以三个统计量都必须用 `long long`。

## 示例
### 示例 1
```in
2
1 2 3 4
5 6 7 8
```
```out
row 0: 10
row 1: 26
col 0: 6
col 1: 8
col 2: 10
col 3: 12
total: 36
```
> 第 0 行 `1+2+3+4=10`，第 1 行 `5+6+7+8=26`；第 0 列 `1+5=6`，第 1 列 `2+6=8`，以此类推；总和 36。

### 示例 2（边界：只有一名学生）
```in
1
10 -20 30 -40
```
```out
row 0: -20
col 0: 10
col 1: -20
col 2: 30
col 3: -40
total: -20
```
> 只有一行时，"每列的全班总分"就是这一行对应位置的值，行总和与全班总和相等。

## 提示
### 第 1 层
把二维数组传给函数时，形参用 `int (*m)[4]`（或等价的 `int m[][4]`）。函数内部可以像平时一样写 `m[i][j]`，编译器会按"每行 4 个 int"来计算地址。

### 第 2 层
行和：对每个 `i`，把 `m[i][0..3]` 累加。列和：可以在同一个双重循环里顺手累加 `col_sum[j] += m[i][j]`，但**循环之前必须把 `col_sum` 的 4 个元素清零**，否则会加到不确定的初值上。三个统计量都用 `long long`。

### 第 3 层
结构可以写成：外层 `for (int i = 0; i < rows; i++)`，内层 `for (int j = 0; j < 4; j++)`。内层里同时做 `s += m[i][j]` 和 `col_sum[j] += m[i][j]`，循环结束后 `row_sum[i] = s`。最后单独遍历一次输出列和与总和。注意内层上界是 4（列数），外层上界是 rows（行数），不要写反。

## 参考代码
```c file=main.c
#include <stdio.h>

/* 用数组指针接收二维数组：m 指向"4 个 int 的一行" */
void table_sums(int (*m)[4], int rows, long long row_sum[], long long col_sum[4]) {
    for (int j = 0; j < 4; j++) {
        col_sum[j] = 0;                  /* 先清零，再累加 */
    }
    for (int i = 0; i < rows; i++) {
        long long s = 0;
        for (int j = 0; j < 4; j++) {
            s += m[i][j];                /* 第 i 行的和 */
        }
        row_sum[i] = s;
        for (int j = 0; j < 4; j++) {
            col_sum[j] += m[i][j];       /* 第 j 列的和 */
        }
    }
}

int main(void) {
    int rows;
    if (scanf("%d", &rows) != 1 || rows < 1 || rows > 1000) {
        return 0;
    }
    int m[1000][4];
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < 4; j++) {
            if (scanf("%d", &m[i][j]) != 1) {
                return 0;
            }
        }
    }

    long long row_sum[1000];
    long long col_sum[4];
    table_sums(m, rows, row_sum, col_sum);   /* m 退化成 int (*)[4] */

    long long total = 0;
    for (int i = 0; i < rows; i++) {
        printf("row %d: %lld\n", i, row_sum[i]);
        total += row_sum[i];
    }
    for (int j = 0; j < 4; j++) {
        printf("col %d: %lld\n", j, col_sum[j]);
    }
    printf("total: %lld\n", total);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int rows;
    if (scanf("%d", &rows) != 1 || rows < 1 || rows > 1000) {
        return 0;
    }
    int m[1000][4];
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < 4; j++) {
            if (scanf("%d", &m[i][j]) != 1) {
                return 0;
            }
        }
    }

    /* TODO：实现 table_sums(int (*m)[4], int rows, long long row_sum[], long long col_sum[4])
     * 并输出每个学生的总分、每门课的全班总分和全班总和。
     * 下面只是占位输出。 */
    for (int i = 0; i < rows; i++) {
        printf("row %d: 0\n", i);
    }
    for (int j = 0; j < 4; j++) {
        printf("col %d: 0\n", j);
    }
    printf("total: 0\n");
    return 0;
}
```

## 复杂度
时间：O(rows × 4) = O(rows)，每个成绩只被访问两次。
空间：O(rows)，用来存每行的总分，外加常数个列和变量。

## 常见错误
### 用 int 累加 [UB]
`4 × 10^9` 和 `10^12` 都超过 `int` 的上限。如果统计量用 `int` 保存，累加时会发生有符号整数溢出——这是未定义行为，本平台的检查工具会直接报错；没有检查时通常得到一个负数。
```c file=main.c expect=UB
#include <stdio.h>

void table_sums(int (*m)[4], int rows, int row_sum[], int col_sum[4]) {
    for (int j = 0; j < 4; j++) {
        col_sum[j] = 0;
    }
    for (int i = 0; i < rows; i++) {
        int s = 0;                       /* 错：int 装不下 4×10^9 */
        for (int j = 0; j < 4; j++) {
            s += m[i][j];
        }
        row_sum[i] = s;
        for (int j = 0; j < 4; j++) {
            col_sum[j] += m[i][j];       /* 错：列和最大 10^12 */
        }
    }
}

int main(void) {
    int rows;
    if (scanf("%d", &rows) != 1 || rows < 1 || rows > 1000) {
        return 0;
    }
    int m[1000][4];
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < 4; j++) {
            if (scanf("%d", &m[i][j]) != 1) {
                return 0;
            }
        }
    }

    int row_sum[1000];
    int col_sum[4];
    table_sums(m, rows, row_sum, col_sum);

    int total = 0;
    for (int i = 0; i < rows; i++) {
        printf("row %d: %d\n", i, row_sum[i]);
        total += row_sum[i];
    }
    for (int j = 0; j < 4; j++) {
        printf("col %d: %d\n", j, col_sum[j]);
    }
    printf("total: %d\n", total);
    return 0;
}
```

### 内层循环写成 j < 3，漏掉最后一门课 [WA]
4 门课的下标是 0、1、2、3，循环条件必须是 `j < 4`。写成 `j < 3` 会漏掉第 4 列：行少加一个成绩，列和数组的第 4 个元素永远是 0。
```c file=main.c expect=WA
#include <stdio.h>

void table_sums(int (*m)[4], int rows, long long row_sum[], long long col_sum[4]) {
    for (int j = 0; j < 4; j++) {
        col_sum[j] = 0;
    }
    for (int i = 0; i < rows; i++) {
        long long s = 0;
        for (int j = 0; j < 3; j++) {    /* 错：漏掉 j == 3 */
            s += m[i][j];
        }
        row_sum[i] = s;
        for (int j = 0; j < 3; j++) {    /* 错：第 4 列永远是 0 */
            col_sum[j] += m[i][j];
        }
    }
}

int main(void) {
    int rows;
    if (scanf("%d", &rows) != 1 || rows < 1 || rows > 1000) {
        return 0;
    }
    int m[1000][4];
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < 4; j++) {
            if (scanf("%d", &m[i][j]) != 1) {
                return 0;
            }
        }
    }

    long long row_sum[1000];
    long long col_sum[4];
    table_sums(m, rows, row_sum, col_sum);

    long long total = 0;
    for (int i = 0; i < rows; i++) {
        printf("row %d: %lld\n", i, row_sum[i]);
        total += row_sum[i];
    }
    for (int j = 0; j < 4; j++) {
        printf("col %d: %lld\n", j, col_sum[j]);
    }
    printf("total: %lld\n", total);
    return 0;
}
```

### 用 %d 打印 long long [WA]
`long long` 必须配 `%lld`。用 `%d` 时，`printf` 只读取参数的低 32 位：小数值看起来"碰巧正确"，一旦超过 `int` 的范围就会打印出完全错误的数（常见的是一个很大的负数）。编译器会用 `-Wformat` 给出警告，不要忽略它。
```c file=main.c expect=WA
#include <stdio.h>

void table_sums(int (*m)[4], int rows, long long row_sum[], long long col_sum[4]) {
    for (int j = 0; j < 4; j++) {
        col_sum[j] = 0;
    }
    for (int i = 0; i < rows; i++) {
        long long s = 0;
        for (int j = 0; j < 4; j++) {
            s += m[i][j];
        }
        row_sum[i] = s;
        for (int j = 0; j < 4; j++) {
            col_sum[j] += m[i][j];
        }
    }
}

int main(void) {
    int rows;
    if (scanf("%d", &rows) != 1 || rows < 1 || rows > 1000) {
        return 0;
    }
    int m[1000][4];
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < 4; j++) {
            if (scanf("%d", &m[i][j]) != 1) {
                return 0;
            }
        }
    }

    long long row_sum[1000];
    long long col_sum[4];
    table_sums(m, rows, row_sum, col_sum);

    long long total = 0;
    for (int i = 0; i < rows; i++) {
        printf("row %d: %d\n", i, row_sum[i]);    /* 错：应为 %lld */
        total += row_sum[i];
    }
    for (int j = 0; j < 4; j++) {
        printf("col %d: %d\n", j, col_sum[j]);    /* 错：应为 %lld */
    }
    printf("total: %d\n", total);                 /* 错：应为 %lld */
    return 0;
}
```

### 行列下标写反 [WA]
把 `m[i][j]` 写成 `m[j][i]`，看起来像"转置"，实际读到的是别的学生/别的课程的成绩，行和列全都会乱。行下标永远在第一个 `[]` 里，列下标在第二个。本题的列数是固定的 4，行数来自输入，写反后还可能读到未初始化的内存。

## 测试用例
### 01 sample 示例 1
```in
2
1 2 3 4
5 6 7 8
```
```out
row 0: 10
row 1: 26
col 0: 6
col 1: 8
col 2: 10
col 3: 12
total: 36
```

### 02 sample 示例 2
```in
1
10 -20 30 -40
```
```out
row 0: -20
col 0: 10
col 1: -20
col 2: 30
col 3: -40
total: -20
```

### 03 degenerate 全部为 0
```in
3
0 0 0 0
0 0 0 0
0 0 0 0
```
```out
row 0: 0
row 1: 0
row 2: 0
col 0: 0
col 1: 0
col 2: 0
col 3: 0
total: 0
```

### 04 trap 有正有负
```in
3
-1 -2 -3 -4
5 -6 7 -8
-9 10 -11 12
```
```out
row 0: -10
row 1: -2
row 2: 2
col 0: -5
col 1: 2
col 2: -7
col 3: 0
total: -10
```

### 05 trap 行和恰好越过 int 的上限
```in
2
1073741824 1073741824 0 0
-1073741824 -1073741824 0 0
```
```out
row 0: 2147483648
row 1: -2147483648
col 0: 0
col 1: 0
col 2: 0
col 3: 0
total: 0
```

### 06 normal 四名学生
```in
4
1 2 3 4
5 6 7 8
9 10 11 12
13 14 15 16
```
```out
row 0: 10
row 1: 26
row 2: 42
row 3: 58
col 0: 28
col 1: 32
col 2: 36
col 3: 40
total: 136
```

### 生成 boundary 最大规模：1000 行，每格 10^9
```js gen
const rows = 1000;
const line = '1000000000 1000000000 1000000000 1000000000\n';
let input = `${rows}\n${line.repeat(rows)}`;

let output = '';
for (let i = 0; i < rows; i++) output += `row ${i}: 4000000000\n`;
for (let j = 0; j < 4; j++) output += `col ${j}: 1000000000000\n`;
output += 'total: 4000000000000\n';
return [{ kind: 'boundary', category: '最大规模：1000 行、每格 10^9', input, output }];
```
