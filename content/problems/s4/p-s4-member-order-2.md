---json
{
  "id": "p-s4-member-order-2",
  "title": "学生成绩单：用最省内存的结构体数组按分数排序",
  "difficulty": "L3",
  "knowledgePoints": ["s4-member-order"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
学校要给一批学生成绩建一个内存里的索引表。每条记录包含：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `int` | 学号，1 ≤ id ≤ 10⁹ |
| `name` | `char name[8]` | 姓名，不含空格，长度 1..7 |
| `score` | `short` | 分数，0..100 |
| `grade` | `char` | 等级，`A`/`B`/`C`/`D`/`F` 之一 |
| `gpa` | `double` | 绩点，0.0..5.0，输入保证只有一位小数 |

请你自己定义结构体 `struct Student`，并满足两条要求：

1. **`sizeof(struct Student)` 要尽可能小**。成员类型不能改、不能删、不能加，不能用 `#pragma pack`、`__attribute__((packed))` 或位域——只允许调整成员的声明顺序。程序第一行输出 `sizeof=<实际大小>`，供评测检查；
2. 读入 `n` 条记录，按 **分数从高到低** 排序；分数相同时按 **学号从小到大** 排序，然后逐行输出。

### 示例结构
一种满足"成员类型不变"的写法是：

```c
struct Student {
    double gpa;
    int id;
    short score;
    char name[8];
    char grade;
};
```

但它是不是最小的？这要看你有没有真正理解对齐规则：按对齐值从大到小排列，才能把成员之间的填充消掉。`char name[8]` 的对齐值是 1，虽然它占 8 字节，但不需要 8 字节对齐；`double` 才是对齐值最大的成员。

## 输入格式
第一行一个整数 `n`。
接下来 `n` 行，每行五个部分：`id name score grade gpa`，用空格分隔。

## 输出格式
第一行：`sizeof=<结构体大小>`。
接下来 `n` 行，每行按 `id name score grade gpa` 输出一条排好序的记录，字段之间用一个空格分隔。`gpa` 保留 **一位小数**（例如 `4.0`、`3.5`）。

## 数据范围
1 ≤ n ≤ 2000
1 ≤ id ≤ 1000000000
姓名长度 1..7，只含小写字母和数字
0 ≤ score ≤ 100
`grade` ∈ {A, B, C, D, F}
0.0 ≤ gpa ≤ 5.0，输入保证只有一位小数

输出最多约 2000 行、约 50KB，低于 64KB 的输出上限。结构体数组最多 2000 个元素，用 `malloc` 或定长数组都可以。

## 示例
### 示例 1
```in
3
1001 alice 90 A 3.8
1002 bob 90 B 3.2
1003 carol 85 A 3.9
```
```out
sizeof=24
1001 alice 90 A 3.8
1002 bob 90 B 3.2
1003 carol 85 A 3.9
```
> `alice` 和 `bob` 都是 90 分，按学号升序排列，所以 `1001` 在前。`carol` 是 85 分，排在后面。`sizeof` 为 24：`double` 占 0..7，`int` 占 8..11，`short` 占 12..13，`name` 占 14..21，`grade` 占 22，最后补 1 字节到 8 的倍数。

### 示例 2（边界：只有一名学生，姓名占满 7 个字符）
```in
1
7 zhangfy 100 A 4.0
```
```out
sizeof=24
7 zhangfy 100 A 4.0
```
> `name` 是 `char[8]`，最多容纳 7 个字符加一个 `'\0'`，所以 `zhangfy` 刚好合法。`n = 1` 时排序不改变任何东西，但第一行 `sizeof=24` 仍然必须输出；`gpa` 是 `4.0`，保留一位小数后仍是 `4.0`。

## 提示
### 第 1 层
先按"对齐值从大到小"把五个成员排一排，用纸算出每个成员的偏移和最终的 `sizeof`。`char name[8]` 虽然大，但它的对齐值只有 1，不要因为它"看起来大"就放到最前面；`double` 才是决定结构体对齐值的成员。

### 第 2 层
排序规则有两级：先比 `score`（降序），分数相同再比 `id`（升序）。可以用 `qsort` 写一个比较函数，也可以先按学号升序、再用稳定的排序按分数降序；但自己写双重循环排序时，`n ≤ 2000`，O(n²) 也能过，不过要注意两级的比较顺序别写反。

### 第 3 层
两个坑：

1. `sizeof` 必须是 24。把 `double` 放最后（例如 `name, grade, id, score, gpa`）会得到 32；把 `double` 放最前但后面顺序不对，也可能得到 24 或 32，一定要用 `printf("sizeof=%zu\n", sizeof(struct Student));` 让编译器告诉你真实值；
2. 输出 `gpa` 用 `%.1f`，不要用 `%f`（会输出 6 位小数）或 `%.2f`（会多一位）；`score` 是 `short`，用 `%d` 输出时需要转成 `int` 或直接用 `%hd`。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>

struct Student {
    double gpa;        /* 对齐值 8，放最前面 */
    int id;            /* 对齐值 4 */
    short score;       /* 对齐值 2 */
    char name[8];      /* 对齐值 1，大小 8 */
    char grade;        /* 对齐值 1 */
};

static int cmp(const void *pa, const void *pb) {
    const struct Student *a = (const struct Student *)pa;
    const struct Student *b = (const struct Student *)pb;

    if (a->score != b->score) {
        return a->score > b->score ? -1 : 1;   /* 分数高的在前 */
    }
    if (a->id != b->id) {
        return a->id < b->id ? -1 : 1;         /* 分数相同，学号小的在前 */
    }
    return 0;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 2000) {
        return 0;
    }

    struct Student *v = malloc((size_t)n * sizeof *v);
    if (v == NULL) {
        return 0;
    }

    for (int i = 0; i < n; i++) {
        if (scanf("%d %7s %hd %c %lf",
                  &v[i].id, v[i].name, &v[i].score, &v[i].grade, &v[i].gpa) != 5) {
            return 0;
        }
    }

    qsort(v, (size_t)n, sizeof *v, cmp);

    printf("sizeof=%zu\n", sizeof(struct Student));
    for (int i = 0; i < n; i++) {
        printf("%d %s %d %c %.1f\n",
               v[i].id, v[i].name, (int)v[i].score, v[i].grade, v[i].gpa);
    }

    free(v);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>

struct Student {
    char name[8];
    char grade;
    int id;
    short score;
    double gpa;
};

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 2000) {
        return 0;
    }

    struct Student *v = malloc((size_t)n * sizeof *v);
    if (v == NULL) {
        return 0;
    }

    for (int i = 0; i < n; i++) {
        if (scanf("%d %7s %hd %c %lf",
                  &v[i].id, v[i].name, &v[i].score, &v[i].grade, &v[i].gpa) != 5) {
            return 0;
        }
    }

    /* TODO: 按分数降序、学号升序排序 */

    printf("sizeof=%zu\n", sizeof(struct Student));   /* TODO: 调整成员顺序让 sizeof 变小 */
    for (int i = 0; i < n; i++) {
        printf("%d %s %d %c %.1f\n",
               v[i].id, v[i].name, (int)v[i].score, v[i].grade, v[i].gpa);
    }

    free(v);
    return 0;
}
```

## 复杂度
时间 O(n log n)：`qsort` 的比较是 O(1)，排序 O(n log n)；读入和输出各 O(n)。
空间 O(n)：`malloc` 出来的结构体数组，每个元素 24 字节。

本题把"成员顺序"放进了一个真实的排序任务里：排序逻辑不难，难的是**在写 `struct` 的那一刻就决定好布局**。先随便按字段的"逻辑顺序"声明，`sizeof` 会是 32；按对齐值从大到小声明，才是 24。如果以后把记录搬到堆上、数量涨到 20 万条，这就是 1.6MB 的差距，而排序代码一行都不用改。

## 常见错误
### 按"逻辑顺序"声明成员，sizeof 变成 32 [WA]
把 `name`、`grade` 放在前面、`gpa` 放在最后，看起来更符合"学号姓名成绩"的阅读顺序，但 `gpa` 要 8 对齐，前面会空出一大段。程序输出 `sizeof=32`，而评测期望 24，直接 WA。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>

struct Student {
    char name[8];
    char grade;
    int id;
    short score;
    double gpa;        /* 错：double 放在最后，前面会被填充撑大 */
};

static int cmp(const void *pa, const void *pb) {
    const struct Student *a = (const struct Student *)pa;
    const struct Student *b = (const struct Student *)pb;
    if (a->score != b->score) {
        return a->score > b->score ? -1 : 1;
    }
    if (a->id != b->id) {
        return a->id < b->id ? -1 : 1;
    }
    return 0;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    struct Student *v = malloc((size_t)n * sizeof *v);
    if (v == NULL) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d %7s %hd %c %lf",
                  &v[i].id, v[i].name, &v[i].score, &v[i].grade, &v[i].gpa) != 5) {
            free(v);
            return 0;
        }
    }
    qsort(v, (size_t)n, sizeof *v, cmp);
    printf("sizeof=%zu\n", sizeof(struct Student));
    for (int i = 0; i < n; i++) {
        printf("%d %s %d %c %.1f\n",
               v[i].id, v[i].name, (int)v[i].score, v[i].grade, v[i].gpa);
    }
    free(v);
    return 0;
}
```

### 分数相同时没有按学号升序 [WA]
比较函数只比 `score`，分数相同的记录顺序就取决于 `qsort` 的内部实现（不稳定），或者按输入顺序保留。评测里分数相同的情况很多，必须补上 `id` 的升序比较。示例 1 的 `alice`/`bob` 就是同分，写成"按学号降序"会让 `1002` 排在 `1001` 前面。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>

struct Student {
    double gpa;
    int id;
    short score;
    char name[8];
    char grade;
};

static int cmp(const void *pa, const void *pb) {
    const struct Student *a = (const struct Student *)pa;
    const struct Student *b = (const struct Student *)pb;

    if (a->score != b->score) {
        return a->score > b->score ? -1 : 1;
    }
    return a->id > b->id ? -1 : 1;   /* 错：分数相同时学号降序 */
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    struct Student *v = malloc((size_t)n * sizeof *v);
    if (v == NULL) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d %7s %hd %c %lf",
                  &v[i].id, v[i].name, &v[i].score, &v[i].grade, &v[i].gpa) != 5) {
            free(v);
            return 0;
        }
    }
    qsort(v, (size_t)n, sizeof *v, cmp);
    printf("sizeof=%zu\n", sizeof(struct Student));
    for (int i = 0; i < n; i++) {
        printf("%d %s %d %c %.1f\n",
               v[i].id, v[i].name, (int)v[i].score, v[i].grade, v[i].gpa);
    }
    free(v);
    return 0;
}
```

### 用 float 代替 double 来"省空间" [WA]
`gpa` 的类型规定是 `double`，换成 `float` 会把 `sizeof` 变成 20 左右，和评测期望的 24 不符；而且 `double` 的精度也丢了。成员类型不能改，只能调整顺序。

### 用 `%f` 或 `%.2f` 输出 gpa [WA]
`printf("%f", gpa)` 默认输出 6 位小数，`printf("%.2f", gpa)` 会输出两位，都和要求的"一位小数"不一致。题目要求 `4.0` 这种格式，必须用 `%.1f`。同理，`score` 是 `short`，用 `%d` 输出时要先转成 `int`（或者用 `%hd`）。

## 测试用例
### 01 sample 示例 1
```in
3
1001 alice 90 A 3.8
1002 bob 90 B 3.2
1003 carol 85 A 3.9
```
```out
sizeof=24
1001 alice 90 A 3.8
1002 bob 90 B 3.2
1003 carol 85 A 3.9
```

### 02 sample 示例 2
```in
1
7 zhangfy 100 A 4.0
```
```out
sizeof=24
7 zhangfy 100 A 4.0
```

### 03 boundary 最低分与最低绩点
```in
1
1000000000 a 0 F 0.0
```
```out
sizeof=24
1000000000 a 0 F 0.0
```

### 04 degenerate 单条记录，最高分
```in
1
5 bb 100 A 5.0
```
```out
sizeof=24
5 bb 100 A 5.0
```

### 05 trap 四个人同分，必须按学号升序
```in
4
40 delta 80 B 3.0
10 alpha 80 A 4.0
30 gamma 80 C 2.5
20 beta 80 B 3.5
```
```out
sizeof=24
10 alpha 80 A 4.0
20 beta 80 B 3.5
30 gamma 80 C 2.5
40 delta 80 B 3.0
```

### 06 trap 输入按学号降序，同分时要翻回来
```in
3
300 ccc 70 B 2.0
200 bbb 70 B 2.5
100 aaa 70 A 3.0
```
```out
sizeof=24
100 aaa 70 A 3.0
200 bbb 70 B 2.5
300 ccc 70 B 2.0
```

### 07 normal 五条记录，分数与学号都不同
```in
5
1003 carol 85 A 3.9
1001 alice 90 A 3.8
1005 eve 72 C 2.7
1002 bob 90 B 3.2
1004 dave 60 D 1.5
```
```out
sizeof=24
1001 alice 90 A 3.8
1002 bob 90 B 3.2
1003 carol 85 A 3.9
1005 eve 72 C 2.7
1004 dave 60 D 1.5
```

### 08 trap gpa 必须保留一位小数
```in
3
1 x 70 A 4.0
2 y 70 B 3.0
3 z 70 C 0.0
```
```out
sizeof=24
1 x 70 A 4.0
2 y 70 B 3.0
3 z 70 C 0.0
```

### 09 normal 六条记录，分数严格递减
```in
6
900003 f 100 A 5.0
900001 a 99 A 4.9
900006 g 98 B 4.8
900002 b 97 B 4.7
900005 e 96 C 4.6
900004 d 95 C 4.5
```
```out
sizeof=24
900003 f 100 A 5.0
900001 a 99 A 4.9
900006 g 98 B 4.8
900002 b 97 B 4.7
900005 e 96 C 4.6
900004 d 95 C 4.5
```

### 10 boundary 7 字符姓名与 0/100 分
```in
2
2 abcdefg 0 F 0.0
1 zyxwvut 100 A 4.0
```
```out
sizeof=24
1 zyxwvut 100 A 4.0
2 abcdefg 0 F 0.0
```

### 生成 boundary 1800 条记录，排序后输出
```js gen
const n = 1800;
const gpas = [0.0, 1.5, 2.0, 3.5, 4.0, 5.0];
const rows = [];
for (let i = 0; i < n; i++) {
  const id = 100000 + i;
  const name = 's' + String(i + 1).padStart(6, '0');
  const score = (i * 37) % 101;
  const gpa = gpas[i % gpas.length];
  let grade = 'F';
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  rows.push({ id, name, score, grade, gpa });
}

const inputRows = rows.map((r) => `${r.id} ${r.name} ${r.score} ${r.grade} ${r.gpa.toFixed(1)}`);
const sorted = rows.slice().sort((a, b) => (b.score - a.score) || (a.id - b.id));
const out = ['sizeof=24'];
for (const r of sorted) out.push(`${r.id} ${r.name} ${r.score} ${r.grade} ${r.gpa.toFixed(1)}`);

return [{
  kind: 'boundary',
  category: '1800 条记录，分数降序、学号升序',
  input: n + '\n' + inputRows.join('\n') + '\n',
  output: out.join('\n') + '\n',
}];
```
