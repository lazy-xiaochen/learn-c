---json
{
  "id": "p-s1-printf-2",
  "title": "用宽度和精度控制输出一张对齐的成绩表",
  "difficulty": "L1",
  "knowledgePoints": ["s1-printf", "s1-loops"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "exact" }
}
---

## 题目描述
第一行读入人数 n，接下来 n 行每行一个整数学号和一个实数成绩。按下面的格式输出成绩表：

```
ID    |   SCORE
------+--------
<学号>|<成绩>
...
avg=<平均分>
```

- 学号**左对齐**、宽度 6；成绩**右对齐**、宽度 8、保留 2 位小数；中间用 `|` 分隔；
- 最后一行是平均分，保留 2 位小数；n 为 0 时最后一行输出 `avg=n/a`。
- 宽度是**最小**宽度：内容更长时原样输出，不截断。

本题按原样比较输出，每行行末不能有多余的空格。

## 输入格式
第一行 n；接下来 n 行，每行一个整数和一个实数。

## 输出格式
见题目描述。

## 数据范围
0 ≤ n ≤ 1000；学号在 `int` 范围内；0 ≤ 成绩 ≤ 100，最多两位小数。

## 示例
### 示例 1
```in
2
1 90.5
23 78
```
```out
ID    |   SCORE
------+--------
1     |   90.50
23    |   78.00
avg=84.25
```

### 示例 2（边界：没有学生）
```in
0
```
```out
ID    |   SCORE
------+--------
avg=n/a
```

## 提示
### 第 1 层
每一行的格式都可以用一个 printf 完成。表头是固定文字，直接原样输出。

### 第 2 层
`%-6d` 左对齐宽度 6；`%8.2f` 右对齐宽度 8、两位小数。成绩是实数，读入用 `%lf`。平均分 = 总分 / n，n 为 0 时不能除。

### 第 3 层
`printf("%-6d|%8.2f\n", id, score);`，最后 `printf("avg=%.2f\n", sum / n);`。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0) {
        return 0;
    }
    printf("ID    |   SCORE\n");
    printf("------+--------\n");
    double sum = 0;
    for (int i = 0; i < n; i++) {
        int id;
        double score;
        if (scanf("%d %lf", &id, &score) != 2) {
            return 0;
        }
        printf("%-6d|%8.2f\n", id, score);   /* - 表示左对齐；8.2 表示宽度 8、两位小数 */
        sum += score;
    }
    if (n == 0) {
        printf("avg=n/a\n");
    } else {
        printf("avg=%.2f\n", sum / n);
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0) {
        return 0;
    }
    /* 输出表头、每一行和平均分 */

    return 0;
}
```

## 复杂度
时间 O(n)，空间 O(1)：读一行输出一行，只需要保存总分。本题的重点是 printf 的宽度、精度和对齐标志。

## 常见错误
### 学号没有左对齐 [WA]
`%6d` 默认右对齐，学号前面会出现空格。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0) {
        return 0;
    }
    printf("ID    |   SCORE\n");
    printf("------+--------\n");
    double sum = 0;
    for (int i = 0; i < n; i++) {
        int id;
        double score;
        if (scanf("%d %lf", &id, &score) != 2) {
            return 0;
        }
        printf("%6d|%8.2f\n", id, score);
        sum += score;
    }
    if (n == 0) printf("avg=n/a\n");
    else printf("avg=%.2f\n", sum / n);
    return 0;
}
```

### 用 %d 读入成绩 [WA]
`90.5` 中的小数点让 `%d` 停下，下一次 scanf 又从 `.5` 开始读，后面全部错位。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0) {
        return 0;
    }
    printf("ID    |   SCORE\n");
    printf("------+--------\n");
    double sum = 0;
    for (int i = 0; i < n; i++) {
        int id, score;
        if (scanf("%d %d", &id, &score) != 2) {
            return 0;
        }
        printf("%-6d|%8.2f\n", id, (double)score);
        sum += score;
    }
    if (n == 0) printf("avg=n/a\n");
    else printf("avg=%.2f\n", sum / n);
    return 0;
}
```

### n 为 0 时直接相除 [WA]
`0.0 / 0` 的结果是 NaN，会输出 `avg=nan` 或 `avg=-nan(ind)` 之类的内容。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0) {
        return 0;
    }
    printf("ID    |   SCORE\n");
    printf("------+--------\n");
    double sum = 0;
    for (int i = 0; i < n; i++) {
        int id;
        double score;
        if (scanf("%d %lf", &id, &score) != 2) {
            return 0;
        }
        printf("%-6d|%8.2f\n", id, score);
        sum += score;
    }
    printf("avg=%.2f\n", sum / n);
    return 0;
}
```

### 以为宽度会截断过长的内容 [WA]
7 位学号 1234567 在 `%-6d` 下照样完整输出 7 位，表格这一行会"凸出来"。这是 printf 的规定行为，题目要求的也正是原样输出，不要自己截断。

## 测试用例
### 01 sample 示例 1
```in
2
1 90.5
23 78
```
```out
ID    |   SCORE
------+--------
1     |   90.50
23    |   78.00
avg=84.25
```

### 02 sample 示例 2
```in
0
```
```out
ID    |   SCORE
------+--------
avg=n/a
```

### 03 boundary 学号超过宽度（不截断）
```in
1
1234567 100
```
```out
ID    |   SCORE
------+--------
1234567|  100.00
avg=100.00
```

### 04 trap 负数学号与 0 分
```in
2
-5 0
-2147483648 100
```
```out
ID    |   SCORE
------+--------
-5    |    0.00
-2147483648|  100.00
avg=50.00
```

### 05 degenerate 所有成绩相同
```in
3
7 60
8 60
9 60
```
```out
ID    |   SCORE
------+--------
7     |   60.00
8     |   60.00
9     |   60.00
avg=60.00
```

### 06 trap 一位小数的成绩
```in
1
42 7.5
```
```out
ID    |   SCORE
------+--------
42    |    7.50
avg=7.50
```

### 07 normal 多名学生
```in
4
101 88.25
102 91.75
103 66
104 74
```
```out
ID    |   SCORE
------+--------
101   |   88.25
102   |   91.75
103   |   66.00
104   |   74.00
avg=80.00
```
