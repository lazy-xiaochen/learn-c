---json
{
  "id": "p-s4-struct-basics-1",
  "title": "学生成绩单：总分、最高分与平均分",
  "difficulty": "L2",
  "knowledgePoints": ["s4-struct-basics"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
班主任给了你一张成绩单：`n` 个学生，每人有学号和成绩。请你用结构体保存每个学生的信息，并统计三件事：

- 全班总分；
- 最高分以及拿到最高分的**学号最小**的学生（同分时取学号最小的，避免"谁排前面谁赢"）；
- 全班平均分，保留两位小数。

请定义一个结构体（例如 `struct Student { int id; int score; };`）来存放一条记录，而不是用两个平行数组。

## 输入格式
第一行一个整数 `n`。
接下来 `n` 行，每行两个整数 `id`、`score`，表示一个学生的学号和成绩。

## 输出格式
输出三行：

```
total=总分
max=最高分 id=学号
avg=平均分（保留两位小数）
```

## 数据范围
1 ≤ n ≤ 1000
1 ≤ id ≤ 9999，且所有学号互不相同
0 ≤ score ≤ 100

总分最大为 1000 × 100 = 100000，`int` 足够；平均分用 `double` 计算并用 `%.2f` 输出。

## 示例
### 示例 1
```in
5
1001 90
1002 85
1003 95
1004 70
1005 95
```
```out
total=435
max=95 id=1003
avg=87.00
```
> 总分 90 + 85 + 95 + 70 + 95 = 435。最高分是 95，有 1003 和 1005 两个学生，学号最小的是 1003。平均分 435 / 5 = 87.00。

### 示例 2（边界：只有一个学生，成绩为 0）
```in
1
7 0
```
```out
total=0
max=0 id=7
avg=0.00
```
> `n = 1` 时最高分就是这个学生自己的分数。成绩可以是 0，不要用"最高分初始化为 0、学号初始化为 0"来判断"还没遇到学生"——0 也是合法成绩，而 0 不是合法学号。

## 提示
### 第 1 层
先把每个学生读进一个结构体数组，边读边累加总分。读完之后再单独扫一遍找最高分，不要边读边用"当前最大值"做所有判断，否则很容易把同分规则写乱。

### 第 2 层
同分时取学号最小的：比较时先看成绩，成绩更高就更新；成绩相等时再比较学号，学号更小才更新。写成 `if (a[i].score > best.score || (a[i].score == best.score && a[i].id < best.id))`。

### 第 3 层
最高分和学号可以放在一个"最优下标"里一起维护：用 `best` 记录当前最优元素的下标，最后输出 `a[best].score` 和 `a[best].id`。平均分写成 `(double)total / n`，不要写 `total / n`，否则整数除法会先截断再转成 `double`。

## 参考代码
```c file=main.c
#include <stdio.h>

struct Student {
    int id;
    int score;
};

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        return 0;
    }

    struct Student a[1000];
    int total = 0;
    for (int i = 0; i < n; i++) {
        if (scanf("%d %d", &a[i].id, &a[i].score) != 2) {
            return 0;
        }
        total += a[i].score;
    }

    int best = 0;                       /* 目前最高分所在的下标 */
    for (int i = 1; i < n; i++) {
        if (a[i].score > a[best].score ||
            (a[i].score == a[best].score && a[i].id < a[best].id)) {
            best = i;
        }
    }

    printf("total=%d\n", total);
    printf("max=%d id=%d\n", a[best].score, a[best].id);
    printf("avg=%.2f\n", (double)total / n);
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
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        return 0;
    }

    struct Student a[1000];
    int total = 0;
    for (int i = 0; i < n; i++) {
        if (scanf("%d %d", &a[i].id, &a[i].score) != 2) {
            return 0;
        }
        total += a[i].score;
    }

    int best = 0;
    for (int i = 1; i < n; i++) {
        if (a[i].score > a[best].score) {   /* TODO: 同分时要比较学号 */
            best = i;
        }
    }

    printf("total=%d\n", total);
    printf("max=%d id=%d\n", a[best].score, a[best].id);
    printf("avg=%.2f\n", (double)(total / n));   /* TODO: 先除再转 double 会丢掉小数 */
    return 0;
}
```

## 复杂度
时间 O(n)：读入一遍、找最高分一遍。
空间 O(n)：一个最多 1000 个元素的结构体数组。

## 常见错误
### 用整数除法算平均分 [WA]
`printf("avg=%.2f\n", (double)(total / n));` 会先把 `total / n` 按整数除法截断，再转成 `double`。例如总分 350、5 个人，先算成 70，最后输出 `70.00`，而正确答案是 `70.00` 只有在整除时才对；总分 5、3 个人会输出 `1.00` 而不是 `1.67`。必须先转成浮点再除：`(double)total / n`。

```c file=main.c expect=WA
#include <stdio.h>

struct Student {
    int id;
    int score;
};

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        return 0;
    }

    struct Student a[1000];
    int total = 0;
    for (int i = 0; i < n; i++) {
        if (scanf("%d %d", &a[i].id, &a[i].score) != 2) {
            return 0;
        }
        total += a[i].score;
    }

    int best = 0;
    for (int i = 1; i < n; i++) {
        if (a[i].score > a[best].score ||
            (a[i].score == a[best].score && a[i].id < a[best].id)) {
            best = i;
        }
    }

    printf("total=%d\n", total);
    printf("max=%d id=%d\n", a[best].score, a[best].id);
    printf("avg=%.2f\n", (double)(total / n));   /* 错：整数除法先截断 */
    return 0;
}
```

### 同分时保留了先遇到的学生 [WA]
只用 `a[i].score > a[best].score` 更新，遇到同分不会替换，于是答案依赖输入顺序。题目要求同分取学号最小的学生，必须在"成绩相等"时再比较学号。测试数据里故意把学号大的学生放在前面，只按顺序取第一个就会错。

```c file=main.c expect=WA
#include <stdio.h>

struct Student {
    int id;
    int score;
};

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        return 0;
    }

    struct Student a[1000];
    int total = 0;
    for (int i = 0; i < n; i++) {
        if (scanf("%d %d", &a[i].id, &a[i].score) != 2) {
            return 0;
        }
        total += a[i].score;
    }

    int best = 0;
    for (int i = 1; i < n; i++) {
        if (a[i].score > a[best].score) {   /* 错：同分时不比较学号 */
            best = i;
        }
    }

    printf("total=%d\n", total);
    printf("max=%d id=%d\n", a[best].score, a[best].id);
    printf("avg=%.2f\n", (double)total / n);
    return 0;
}
```

### 把最高分初始化为 0、学号初始化为 0 [WA]
`int max_score = 0, max_id = 0;` 在"所有成绩都是 0"时会认为还没遇到学生，输出的学号是 0。成绩 0 是完全合法的数据。正确做法是把第一个学生当作初始最优，或者把 `max_score` 初始化为 -1 并同步维护合法的学号。

```c file=main.c expect=WA
#include <stdio.h>

struct Student {
    int id;
    int score;
};

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        return 0;
    }

    struct Student a[1000];
    int total = 0;
    for (int i = 0; i < n; i++) {
        if (scanf("%d %d", &a[i].id, &a[i].score) != 2) {
            return 0;
        }
        total += a[i].score;
    }

    int max_score = 0;
    int max_id = 0;                    /* 错：0 不是合法学号 */
    for (int i = 0; i < n; i++) {
        if (a[i].score > max_score) {
            max_score = a[i].score;
            max_id = a[i].id;
        }
    }

    printf("total=%d\n", total);
    printf("max=%d id=%d\n", max_score, max_id);
    printf("avg=%.2f\n", (double)total / n);
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
5
1001 90
1002 85
1003 95
1004 70
1005 95
```
```out
total=435
max=95 id=1003
avg=87.00
```

### 02 sample 示例 2
```in
1
7 0
```
```out
total=0
max=0 id=7
avg=0.00
```

### 03 degenerate 全部同分
```in
4
11 60
12 60
13 60
14 60
```
```out
total=240
max=60 id=11
avg=60.00
```

### 04 trap 最高分并列，学号最小者获胜
```in
4
88 90
12 80
45 90
7 70
```
```out
total=330
max=90 id=45
avg=82.50
```

### 05 trap 所有成绩都是 0
```in
3
5 0
2 0
9 0
```
```out
total=0
max=0 id=2
avg=0.00
```

### 06 normal 最高分在中间、同分跨位置
```in
6
1001 75
1002 100
1003 0
1004 50
1005 100
1006 25
```
```out
total=350
max=100 id=1002
avg=58.33
```

### 07 trap 平均分不能整除
```in
3
1 1
2 2
3 2
```
```out
total=5
max=2 id=2
avg=1.67
```

### 生成 boundary 最大规模 n = 1000
```js gen
const n = 1000;
const lines = [String(n)];
let total = 0;
for (let i = 1; i <= n; i++) {
  lines.push(`${i} 100`);
  total += 100;
}
return [{
  kind: 'boundary',
  category: '1000 个学生全部满分',
  input: lines.join('\n') + '\n',
  output: `total=${total}\nmax=100 id=1\navg=100.00\n`,
}];
```
