---json
{
  "id": "p-s4-struct-pointer-2",
  "title": "只交换指针的排名：结构体数组不被搬动",
  "difficulty": "L3",
  "knowledgePoints": ["s4-struct-pointer"],
  "special": "pointer-reasoning",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
有 `n` 个学生，每人有学号和成绩。现在要按成绩从高到低排名，但**不允许搬动学生结构体本身**：请另外建一个"结构体指针数组"，用冒泡排序交换指针，排序结束后：

- 按排名输出学号；
- 输出第一名（排序后的第一个）的学号和成绩；
- 输出**原始数组**里学生的学号顺序，证明结构体没有被移动。

排序规则：成绩高的在前；成绩相同时保持输入中的先后顺序（稳定排序）。用严格的"小于"比较并交换指针，冒泡排序天然是稳定的。

题目已经给出核心框架：

```c
struct Student {
    int id;
    int score;
};

struct Student s[8];
struct Student *order[8];

for (int i = 0; i < n; i++) {
    order[i] = &s[i];              /* 指针数组保存每个元素的地址 */
}

for (int i = 0; i < n - 1; i++) {
    for (int j = 0; j < n - 1 - i; j++) {
        if (order[j]->score < order[j + 1]->score) {
            struct Student *tmp = order[j];   /* 只交换指针 */
            order[j] = order[j + 1];
            order[j + 1] = tmp;
        }
    }
}
```

## 输入格式
第一行一个整数 `n`。
接下来 `n` 行，每行两个整数 `id`、`score`。

## 输出格式
输出三行：

```
rank=按排名排列的学号（用单个空格分隔）
top=第一名的学号 score=第一名的成绩
original=原始数组中的学号顺序（用单个空格分隔）
```

`n = 1` 时 `rank=` 和 `original=` 后面只有一个学号，不要输出多余的空格。

## 数据范围
1 ≤ n ≤ 8
1 ≤ id ≤ 9999，学号互不相同
0 ≤ score ≤ 100

## 示例
### 示例 1
```in
5
1001 88
1002 95
1003 88
1004 70
1005 95
```
```out
rank=1002 1005 1001 1003 1004
top=1002 score=95
original=1001 1002 1003 1004 1005
```
> 95 分的有 1002 和 1005，它们保持输入顺序（1002 在前）；88 分的有 1001 和 1003，也保持输入顺序（1001 在前）。`original=` 仍然是 1001 1002 1003 1004 1005，说明排序只改了 `order[]` 里的指针，没有搬动 `s[]`。

### 示例 2（边界：只有一个学生）
```in
1
7 80
```
```out
rank=7
top=7 score=80
original=7
```
> `n = 1` 时循环一次都不执行，`rank` 和 `original` 都只有一个学号。

## 提示
### 第 1 层
先建立 `order[i] = &s[i]`，让每个指针指向一个真实的结构体。排序时比较 `order[j]->score` 和 `order[j+1]->score`，交换的是 `order[j]` 和 `order[j+1]` 这两个指针变量。

### 第 2 层
`order[j]->score` 先取 `order[j]` 里的地址，再访问那个学生的 `score`。交换指针后，`order[j]` 只是指向了另一个学生，`s[]` 里元素的位置和内容都没有变。输出时用 `order[i]->id` 取排名，用 `s[i].id` 取原始顺序。

### 第 3 层
稳定排序的写法是：只在 `order[j]->score < order[j + 1]->score` 时交换。如果写成 `<=`，同分的学生会被交换，输入顺序被打乱；如果按学号做第二关键字，就变成"同分按学号排"，也不再是题目要求的稳定顺序。输出 `rank=` 时用 `printf("%s%d", i ? " " : "", order[i]->id)`，避免行末多一个空格。

## 参考代码
```c file=main.c
#include <stdio.h>

struct Student {
    int id;
    int score;
};

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 8) {
        return 0;
    }

    struct Student s[8];
    for (int i = 0; i < n; i++) {
        if (scanf("%d %d", &s[i].id, &s[i].score) != 2) {
            return 0;
        }
    }

    struct Student *order[8];
    for (int i = 0; i < n; i++) {
        order[i] = &s[i];
    }

    /* 只交换指针；严格小于保证同分时保持输入顺序 */
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (order[j]->score < order[j + 1]->score) {
                struct Student *tmp = order[j];
                order[j] = order[j + 1];
                order[j + 1] = tmp;
            }
        }
    }

    printf("rank=");
    for (int i = 0; i < n; i++) {
        printf("%s%d", i ? " " : "", order[i]->id);
    }
    printf("\n");

    printf("top=%d score=%d\n", order[0]->id, order[0]->score);

    printf("original=");
    for (int i = 0; i < n; i++) {
        printf("%s%d", i ? " " : "", s[i].id);
    }
    printf("\n");
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

struct Student {
    int id;
    int score;
};

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 8) {
        return 0;
    }

    struct Student s[8];
    for (int i = 0; i < n; i++) {
        if (scanf("%d %d", &s[i].id, &s[i].score) != 2) {
            return 0;
        }
    }

    struct Student *order[8];
    for (int i = 0; i < n; i++) {
        order[i] = &s[i];
    }

    /* TODO: 用冒泡排序交换 order[] 中的指针，按成绩从高到低（同分稳定） */

    printf("rank=");
    for (int i = 0; i < n; i++) {
        printf("%s%d", i ? " " : "", order[i]->id);
    }
    printf("\n");

    printf("top=%d score=%d\n", s[0].id, s[0].score);   /* TODO: 应该输出第一名 */

    printf("original=");
    for (int i = 0; i < n; i++) {
        printf("%s%d", i ? " " : "", s[i].id);
    }
    printf("\n");
    return 0;
}
```

## 复杂度
时间 O(n²)：冒泡排序，`n ≤ 8`，完全够用。
空间 O(n)：一个最多 8 个元素的指针数组；结构体数组本身不额外复制。

## 常见错误
### 直接交换结构体本身，`original` 不再是输入顺序 [WA]
不建指针数组，直接对 `s[]` 做冒泡排序，排名结果可能完全正确，但 `s[]` 已经被重新排列，`original=` 输出的是排序后的顺序。题目要求"不搬动结构体"，必须交换 `order[]` 里的指针。

```c file=main.c expect=WA
#include <stdio.h>

struct Student {
    int id;
    int score;
};

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 8) {
        return 0;
    }

    struct Student s[8];
    for (int i = 0; i < n; i++) {
        if (scanf("%d %d", &s[i].id, &s[i].score) != 2) {
            return 0;
        }
    }

    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (s[j].score < s[j + 1].score) {
                struct Student tmp = s[j];       /* 错：搬动了结构体本身 */
                s[j] = s[j + 1];
                s[j + 1] = tmp;
            }
        }
    }

    printf("rank=");
    for (int i = 0; i < n; i++) {
        printf("%s%d", i ? " " : "", s[i].id);
    }
    printf("\n");
    printf("top=%d score=%d\n", s[0].id, s[0].score);
    printf("original=");
    for (int i = 0; i < n; i++) {
        printf("%s%d", i ? " " : "", s[i].id);
    }
    printf("\n");
    return 0;
}
```

### 比较写反，排成了升序 [WA]
`if (order[j]->score > order[j + 1]->score)` 会把成绩低的换到前面，`rank` 和 `top` 都变成最后一名。题目要求从高到低，比较方向不能反。

```c file=main.c expect=WA
#include <stdio.h>

struct Student {
    int id;
    int score;
};

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 8) {
        return 0;
    }

    struct Student s[8];
    for (int i = 0; i < n; i++) {
        if (scanf("%d %d", &s[i].id, &s[i].score) != 2) {
            return 0;
        }
    }

    struct Student *order[8];
    for (int i = 0; i < n; i++) {
        order[i] = &s[i];
    }

    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (order[j]->score > order[j + 1]->score) {   /* 错：排成升序了 */
                struct Student *tmp = order[j];
                order[j] = order[j + 1];
                order[j + 1] = tmp;
            }
        }
    }

    printf("rank=");
    for (int i = 0; i < n; i++) {
        printf("%s%d", i ? " " : "", order[i]->id);
    }
    printf("\n");
    printf("top=%d score=%d\n", order[0]->id, order[0]->score);
    printf("original=");
    for (int i = 0; i < n; i++) {
        printf("%s%d", i ? " " : "", s[i].id);
    }
    printf("\n");
    return 0;
}
```

### 同分时按学号排序，破坏了稳定顺序 [WA]
题目要求同分保持输入顺序。如果写成 `score < ... || (score == ... && id > ...)`，同分学生的相对顺序会按学号重排。测试数据里同分学生的学号故意不是递增的，这样的代码会在 `rank` 上暴露错误。

```c file=main.c expect=WA
#include <stdio.h>

struct Student {
    int id;
    int score;
};

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 8) {
        return 0;
    }

    struct Student s[8];
    for (int i = 0; i < n; i++) {
        if (scanf("%d %d", &s[i].id, &s[i].score) != 2) {
            return 0;
        }
    }

    struct Student *order[8];
    for (int i = 0; i < n; i++) {
        order[i] = &s[i];
    }

    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            int sj = order[j]->score;
            int sk = order[j + 1]->score;
            if (sj < sk || (sj == sk && order[j]->id > order[j + 1]->id)) {
                struct Student *tmp = order[j];   /* 错：同分时又按学号排了 */
                order[j] = order[j + 1];
                order[j + 1] = tmp;
            }
        }
    }

    printf("rank=");
    for (int i = 0; i < n; i++) {
        printf("%s%d", i ? " " : "", order[i]->id);
    }
    printf("\n");
    printf("top=%d score=%d\n", order[0]->id, order[0]->score);
    printf("original=");
    for (int i = 0; i < n; i++) {
        printf("%s%d", i ? " " : "", s[i].id);
    }
    printf("\n");
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
5
1001 88
1002 95
1003 88
1004 70
1005 95
```
```out
rank=1002 1005 1001 1003 1004
top=1002 score=95
original=1001 1002 1003 1004 1005
```

### 02 sample 示例 2
```in
1
7 80
```
```out
rank=7
top=7 score=80
original=7
```

### 03 degenerate 全部同分，保持输入顺序
```in
4
9 60
3 60
7 60
5 60
```
```out
rank=9 3 7 5
top=9 score=60
original=9 3 7 5
```

### 04 trap 同分学生的学号不是递增的
```in
4
40 90
10 90
30 80
20 90
```
```out
rank=40 10 20 30
top=40 score=90
original=40 10 30 20
```
> 90 分的有 40、10、20，按输入顺序保持 40 → 10 → 20，不能按学号排成 10 → 20 → 40。

### 05 boundary 最大 n = 8，输入恰好是升序
```in
8
8 10
7 20
6 30
5 40
4 50
3 60
2 70
1 80
```
```out
rank=1 2 3 4 5 6 7 8
top=1 score=80
original=8 7 6 5 4 3 2 1
```

### 06 normal 成绩高低交错
```in
6
11 50
22 90
33 70
44 90
55 60
66 100
```
```out
rank=66 22 44 33 55 11
top=66 score=100
original=11 22 33 44 55 66
```

### 07 trap 全部 0 分
```in
3
5 0
2 0
8 0
```
```out
rank=5 2 8
top=5 score=0
original=5 2 8
```

### 08 normal 只有两个人的逆序
```in
2
100 30
200 90
```
```out
rank=200 100
top=200 score=90
original=100 200
```
