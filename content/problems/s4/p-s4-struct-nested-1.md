---json
{
  "id": "p-s4-struct-nested-1",
  "title": "嵌套结构体的字节偏移：从地址反查学生字段",
  "difficulty": "L3",
  "knowledgePoints": ["s4-struct-nested"],
  "special": "memory-layout",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
学生记录由下面两个结构体描述：

```c
struct Date {
    short year;    /* 2 字节 */
    char month;    /* 1 字节 */
    char day;      /* 1 字节 */
};

struct Student {
    int id;             /* 4 字节 */
    struct Date birth;  /* 嵌套结构体 */
    char grade;         /* 1 字节，等级 A/B/C */
    int score;          /* 4 字节 */
};
```

在**本题平台**上：`short` 2 字节、`char` 1 字节、`int` 4 字节；每个成员必须从"自身对齐值的倍数"这个偏移开始（`short` 按 2 对齐、`int` 按 4 对齐、`char` 按 1 对齐）；结构体总大小向上取整到最大对齐值的倍数。`struct Date` 和 `struct Student` 都按这个规则排布。

一个 `struct Student` 数组在内存里连续存放，第 `k` 个元素的首地址是 `数组首地址 + k × sizeof(struct Student)`。

现在给你若干**相对数组首地址的字节偏移**，请你根据布局反查这个字节属于哪个学生的哪个成员：

- 若偏移落在某个成员占用的任意字节上，就算属于该成员；
- 若落在成员之间的填充字节上，输出 `student<k>.padding`；
- 若偏移不小于整个数组的字节数，输出 `outside`。

## 输入格式
第一行一个整数 `n`：学生人数。
接下来 `n` 行，每行依次是 `id year month day grade score`：
- `id`、`year`、`month`、`day`、`score` 是整数；
- `grade` 是一个大写字母 `A`、`B` 或 `C`。

接下来一行一个整数 `q`。
再接下来 `q` 行，每行一个整数 `o`：要查询的字节偏移。

## 输出格式
第一行输出一个整数：

```
stride=<sizeof(struct Student)>
```

接下来 `q` 行，每行格式为：

```
off <o> -> <归属>
```

`<归属>` 的取值：

- `student<k>.id=<id>`
- `student<k>.year=<year>`
- `student<k>.month=<month>`
- `student<k>.day=<day>`
- `student<k>.grade=<grade>`
- `student<k>.score=<score>`
- `student<k>.padding`
- `outside`

其中 `k` 从 0 开始，是记录下标。

## 数据范围
1 ≤ n ≤ 100
1 ≤ id ≤ 9999
1900 ≤ year ≤ 2100
1 ≤ month ≤ 12
1 ≤ day ≤ 31
`grade` ∈ {`A`, `B`, `C`}
0 ≤ score ≤ 100
1 ≤ q ≤ 500
0 ≤ o ≤ 1700（最大数组为 100 × 16 = 1600 字节，查询范围能覆盖到 `outside` 的情况）

## 示例
### 示例 1
```in
2
1001 2006 9 1 A 92
1002 2005 12 31 B 85
12
0
3
4
5
6
7
8
9
11
12
15
16
```
```out
stride=16
off 0 -> student0.id=1001
off 3 -> student0.id=1001
off 4 -> student0.year=2006
off 5 -> student0.year=2006
off 6 -> student0.month=9
off 7 -> student0.day=1
off 8 -> student0.grade=A
off 9 -> student0.padding
off 11 -> student0.padding
off 12 -> student0.score=92
off 15 -> student0.score=92
off 16 -> student1.id=1002
```
> 按规则排布：`id` 在 0…3；`birth` 从 4 开始，占 4…7，其中 `year` 占 4…5、`month` 在 6、`day` 在 7；`grade` 在 8；为了让 `score`（4 字节对齐）从 12 开始，9…11 是填充；`score` 占 12…15。所以一个元素是 16 字节。偏移 9 和 11 落在填充里，偏移 16 已经是第 1 个学生的 `id`。

### 示例 2（边界：只有一个学生，查询填充和数组末尾）
```in
1
7 2000 1 1 C 0
4
0
8
9
16
```
```out
stride=16
off 0 -> student0.id=7
off 8 -> student0.grade=C
off 9 -> student0.padding
off 16 -> outside
```
> `n = 1` 时数组只有 16 字节，偏移 0…15 属于 `student0`，偏移 16 已经是数组之外。成绩为 0 也是合法值，不要用 0 表示"没有成绩"。

## 提示
### 第 1 层
先别管输入的数据，拿一张纸把 `struct Student` 的成员一个个摆下去：每个成员开始时，把当前偏移向上取整到它的对齐值，再占掉自己的大小。摆完所有成员后，把总大小向上取整到最大对齐值（这里是 4）。

### 第 2 层
`birth` 的偏移不是 0，`month` 的偏移也不是 2：`month` 相对整个 `Student` 的偏移 = `birth` 的偏移 + `month` 在 `Date` 里的偏移。`grade` 只占 1 字节，但它后面的 `score` 要求 4 字节对齐，所以 `grade` 和 `score` 之间会出现填充。

### 第 3 层
查询时先算 `k = o / stride`、`p = o % stride`，再用 `p` 判断落在 `[0,4)`、`[4,6)`、`[6,7)`、`[7,8)`、`[8,9)`、`[9,12)`、`[12,16)` 中的哪一段。判断顺序必须从低到高，并且 `o >= n * stride` 要在取模之前判掉，否则会算出并不存在的 `student<n>`。

## 参考代码
```c file=main.c
#include <stddef.h>
#include <stdio.h>

struct Date {
    short year;
    char month;
    char day;
};

struct Student {
    int id;
    struct Date birth;
    char grade;
    int score;
};

static void field_of(const struct Student *a, int k, int p,
                     int o_birth, int o_month, int o_day,
                     int o_grade, int o_score) {
    const struct Student *s = &a[k];
    if (p < o_birth) {
        printf("student%d.id=%d\n", k, s->id);
    } else if (p < o_month) {
        printf("student%d.year=%d\n", k, (int)s->birth.year);
    } else if (p < o_day) {
        printf("student%d.month=%d\n", k, (int)s->birth.month);
    } else if (p < o_grade) {
        printf("student%d.day=%d\n", k, (int)s->birth.day);
    } else if (p < o_score) {
        if (p == o_grade) {
            printf("student%d.grade=%c\n", k, s->grade);
        } else {
            printf("student%d.padding\n", k);
        }
    } else {
        printf("student%d.score=%d\n", k, s->score);
    }
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }

    struct Student a[100];
    for (int i = 0; i < n; i++) {
        int id, y, m, d, score;
        char grade;
        if (scanf("%d %d %d %d %c %d", &id, &y, &m, &d, &grade, &score) != 6) {
            return 0;
        }
        a[i].id = id;
        a[i].birth.year = (short)y;
        a[i].birth.month = (char)m;
        a[i].birth.day = (char)d;
        a[i].grade = grade;
        a[i].score = score;
    }

    int stride = (int)sizeof(struct Student);
    int o_birth = (int)offsetof(struct Student, birth);
    int o_month = o_birth + (int)offsetof(struct Date, month);
    int o_day = o_birth + (int)offsetof(struct Date, day);
    int o_grade = (int)offsetof(struct Student, grade);
    int o_score = (int)offsetof(struct Student, score);

    printf("stride=%d\n", stride);

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 500) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int o;
        if (scanf("%d", &o) != 1) {
            return 0;
        }
        if (o < 0 || o >= n * stride) {
            printf("off %d -> outside\n", o);
            continue;
        }
        int k = o / stride;
        int p = o % stride;
        printf("off %d -> ", o);
        field_of(a, k, p, o_birth, o_month, o_day, o_grade, o_score);
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stddef.h>
#include <stdio.h>

struct Date {
    short year;
    char month;
    char day;
};

struct Student {
    int id;
    struct Date birth;
    char grade;
    int score;
};

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }

    struct Student a[100];
    for (int i = 0; i < n; i++) {
        int id, y, m, d, score;
        char grade;
        if (scanf("%d %d %d %d %c %d", &id, &y, &m, &d, &grade, &score) != 6) {
            return 0;
        }
        a[i].id = id;
        a[i].birth.year = (short)y;
        a[i].birth.month = (char)m;
        a[i].birth.day = (char)d;
        a[i].grade = grade;
        a[i].score = score;
    }

    /* TODO: 先算出 stride、birth/month/day/grade/score 的偏移 */
    int stride = 12;
    printf("stride=%d\n", stride);

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 500) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int o;
        if (scanf("%d", &o) != 1) {
            return 0;
        }
        if (o < 0 || o >= n * stride) {
            printf("off %d -> outside\n", o);
            continue;
        }
        int k = o / stride;
        int p = o % stride;
        printf("off %d -> ", o);
        if (p < 4) {
            printf("student%d.id=%d\n", k, a[k].id);
        } else if (p < 6) {
            printf("student%d.year=%d\n", k, (int)a[k].birth.year);
        } else if (p < 7) {
            printf("student%d.month=%d\n", k, (int)a[k].birth.month);
        } else if (p < 8) {
            printf("student%d.day=%d\n", k, (int)a[k].birth.day);
        } else {
            printf("student%d.score=%d\n", k, a[k].score);
        }
    }
    return 0;
}
```

## 复杂度
时间 O(n + q)：读入一遍、每个查询 O(1) 判断。
空间 O(n)：一个最多 100 个元素的结构体数组。

## 常见错误
### 把 `sizeof(struct Student)` 当成 12 [WA]
如果只数 `id`(4) + `Date`(4) + `score`(4)，会得到 12，但漏掉了 `char grade` 以及它后面的 3 字节填充。真实大小是 16，`stride` 一错，后面每个记录的起始位置全部错位，只有查询偏移小于 12 时可能碰巧对。

```c file=main.c expect=WA
#include <stddef.h>
#include <stdio.h>

struct Date {
    short year;
    char month;
    char day;
};

struct Student {
    int id;
    struct Date birth;
    char grade;
    int score;
};

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }

    struct Student a[100];
    for (int i = 0; i < n; i++) {
        int id, y, m, d, score;
        char grade;
        if (scanf("%d %d %d %d %c %d", &id, &y, &m, &d, &grade, &score) != 6) {
            return 0;
        }
        a[i].id = id;
        a[i].birth.year = (short)y;
        a[i].birth.month = (char)m;
        a[i].birth.day = (char)d;
        a[i].grade = grade;
        a[i].score = score;
    }

    int stride = 12;                    /* 错：漏掉了 grade 和填充 */
    printf("stride=%d\n", stride);

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 500) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int o;
        if (scanf("%d", &o) != 1) {
            return 0;
        }
        if (o < 0 || o >= n * stride) {
            printf("off %d -> outside\n", o);
            continue;
        }
        int k = o / stride;
        int p = o % stride;
        printf("off %d -> ", o);
        if (p < 4) {
            printf("student%d.id=%d\n", k, a[k].id);
        } else if (p < 6) {
            printf("student%d.year=%d\n", k, (int)a[k].birth.year);
        } else if (p < 7) {
            printf("student%d.month=%d\n", k, (int)a[k].birth.month);
        } else if (p < 8) {
            printf("student%d.day=%d\n", k, (int)a[k].birth.day);
        } else if (p < 9) {
            printf("student%d.grade=%c\n", k, a[k].grade);
        } else {
            printf("student%d.score=%d\n", k, a[k].score);
        }
    }
    return 0;
}
```

### 把填充字节当成了 score [WA]
`grade` 在偏移 8，`score` 从 12 开始，9…11 是填充。如果认为 `score` 紧跟在 `grade` 后面从 9 开始，偏移 9、10、11 会被错误地解释成成绩，而真正的 12…15 反而被当成下一个学生。题目里的查询会故意落在这些字节上。

```c file=main.c expect=WA
#include <stddef.h>
#include <stdio.h>

struct Date {
    short year;
    char month;
    char day;
};

struct Student {
    int id;
    struct Date birth;
    char grade;
    int score;
};

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }

    struct Student a[100];
    for (int i = 0; i < n; i++) {
        int id, y, m, d, score;
        char grade;
        if (scanf("%d %d %d %d %c %d", &id, &y, &m, &d, &grade, &score) != 6) {
            return 0;
        }
        a[i].id = id;
        a[i].birth.year = (short)y;
        a[i].birth.month = (char)m;
        a[i].birth.day = (char)d;
        a[i].grade = grade;
        a[i].score = score;
    }

    int stride = (int)sizeof(struct Student);
    printf("stride=%d\n", stride);

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 500) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int o;
        if (scanf("%d", &o) != 1) {
            return 0;
        }
        if (o < 0 || o >= n * stride) {
            printf("off %d -> outside\n", o);
            continue;
        }
        int k = o / stride;
        int p = o % stride;
        printf("off %d -> ", o);
        if (p < 4) {
            printf("student%d.id=%d\n", k, a[k].id);
        } else if (p < 6) {
            printf("student%d.year=%d\n", k, (int)a[k].birth.year);
        } else if (p < 7) {
            printf("student%d.month=%d\n", k, (int)a[k].birth.month);
        } else if (p < 8) {
            printf("student%d.day=%d\n", k, (int)a[k].birth.day);
        } else if (p < 9) {
            printf("student%d.grade=%c\n", k, a[k].grade);
        } else {
            printf("student%d.score=%d\n", k, a[k].score);   /* 错：9…11 是填充 */
        }
    }
    return 0;
}
```

### 计算 month 时忘了加 birth 的偏移 [WA]
`offsetof(struct Date, month)` 是 2，但 `month` 相对整个 `Student` 的偏移是 `offsetof(struct Student, birth) + 2 = 6`。只写 2 会把 `birth` 开头当成 `month`，`year`、`month`、`day` 全部错位。

```c file=main.c expect=WA
#include <stddef.h>
#include <stdio.h>

struct Date {
    short year;
    char month;
    char day;
};

struct Student {
    int id;
    struct Date birth;
    char grade;
    int score;
};

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }

    struct Student a[100];
    for (int i = 0; i < n; i++) {
        int id, y, m, d, score;
        char grade;
        if (scanf("%d %d %d %d %c %d", &id, &y, &m, &d, &grade, &score) != 6) {
            return 0;
        }
        a[i].id = id;
        a[i].birth.year = (short)y;
        a[i].birth.month = (char)m;
        a[i].birth.day = (char)d;
        a[i].grade = grade;
        a[i].score = score;
    }

    int stride = (int)sizeof(struct Student);
    printf("stride=%d\n", stride);

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 500) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int o;
        if (scanf("%d", &o) != 1) {
            return 0;
        }
        if (o < 0 || o >= n * stride) {
            printf("off %d -> outside\n", o);
            continue;
        }
        int k = o / stride;
        int p = o % stride;
        printf("off %d -> ", o);
        if (p < 4) {
            printf("student%d.id=%d\n", k, a[k].id);
        } else if (p < 2) {          /* 错：month 的偏移应按整个 Student 算 */
            printf("student%d.month=%d\n", k, (int)a[k].birth.month);
        } else if (p < 3) {
            printf("student%d.day=%d\n", k, (int)a[k].birth.day);
        } else if (p < 4) {
            printf("student%d.year=%d\n", k, (int)a[k].birth.year);
        } else {
            printf("student%d.padding\n", k);
        }
    }
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
2
1001 2006 9 1 A 92
1002 2005 12 31 B 85
12
0
3
4
5
6
7
8
9
11
12
15
16
```
```out
stride=16
off 0 -> student0.id=1001
off 3 -> student0.id=1001
off 4 -> student0.year=2006
off 5 -> student0.year=2006
off 6 -> student0.month=9
off 7 -> student0.day=1
off 8 -> student0.grade=A
off 9 -> student0.padding
off 11 -> student0.padding
off 12 -> student0.score=92
off 15 -> student0.score=92
off 16 -> student1.id=1002
```

### 02 sample 示例 2
```in
1
7 2000 1 1 C 0
4
0
8
9
16
```
```out
stride=16
off 0 -> student0.id=7
off 8 -> student0.grade=C
off 9 -> student0.padding
off 16 -> outside
```

### 03 degenerate 只有一个学生，查询最后一个字节
```in
1
9999 1900 1 1 A 100
5
7
8
15
16
0
```
```out
stride=16
off 7 -> student0.day=1
off 8 -> student0.grade=A
off 15 -> student0.score=100
off 16 -> outside
off 0 -> student0.id=9999
```

### 04 trap 记录之间的边界
```in
3
10 2001 2 3 A 40
20 2002 4 5 B 50
30 2003 6 7 C 60
9
11
12
16
23
24
25
28
47
48
```
```out
stride=16
off 11 -> student0.padding
off 12 -> student0.score=40
off 16 -> student1.id=20
off 23 -> student1.day=5
off 24 -> student1.grade=B
off 25 -> student1.padding
off 28 -> student1.score=50
off 47 -> student2.score=60
off 48 -> outside
```
> 每个元素 16 字节，所以第 0 个学生的 12…15 是成绩，第 1 个学生从 16 开始；第 1 个学生内部：`id` 在 16…19、`year` 在 20…21、`month` 在 22、`day` 在 23、`grade` 在 24、填充在 25…27、`score` 在 28…31。第 2 个学生从 32 开始，`score` 在 44…47，所以偏移 47 是最后一个有效字节，48 已经越界。

### 05 trap 嵌套成员的逐字节边界
```in
1
5 2010 11 25 B 88
3
5
6
7
```
```out
stride=16
off 5 -> student0.year=2010
off 6 -> student0.month=11
off 7 -> student0.day=25
```

### 06 trap 第二个学生的嵌套字段与填充
```in
2
1 1999 9 9 A 11
2 2020 12 31 C 99
10
15
16
19
20
22
23
24
25
31
32
```
```out
stride=16
off 15 -> student0.score=11
off 16 -> student1.id=2
off 19 -> student1.id=2
off 20 -> student1.year=2020
off 22 -> student1.month=12
off 23 -> student1.day=31
off 24 -> student1.grade=C
off 25 -> student1.padding
off 31 -> student1.score=99
off 32 -> outside
```
> 第 1 个学生从偏移 16 开始：`id` 在 16…19、`year` 在 20…21、`month` 在 22、`day` 在 23、`grade` 在 24、填充在 25…27、`score` 在 28…31。题目里的偏移 19 落在第二个学生的 `id` 内部，偏移 20 落在 `year` 内部，要按"包含即属于"判断。

### 07 normal 三个学生的混合查询
```in
3
7 2000 1 1 A 0
8 2010 12 31 B 100
9 2020 6 15 C 55
8
0
4
6
7
8
11
12
27
```
```out
stride=16
off 0 -> student0.id=7
off 4 -> student0.year=2000
off 6 -> student0.month=1
off 7 -> student0.day=1
off 8 -> student0.grade=A
off 11 -> student0.padding
off 12 -> student0.score=0
off 27 -> student1.padding
```

### 生成 boundary 100 个学生的最大数组
```js gen
const n = 100;
const lines = [String(n)];
const grades = ['A', 'B', 'C'];
const recs = [];
for (let i = 0; i < n; i++) {
  const id = i + 1;
  const y = 2000 + (i % 10);
  const m = (i % 12) + 1;
  const d = (i % 28) + 1;
  const g = grades[i % 3];
  const sc = i % 101;
  recs.push({ id, y, m, d, g, sc });
  lines.push(`${id} ${y} ${m} ${d} ${g} ${sc}`);
}
function target(o) {
  if (o >= n * 16) return 'outside';
  const k = Math.floor(o / 16);
  const p = o % 16;
  const r = recs[k];
  if (p < 4) return `student${k}.id=${r.id}`;
  if (p < 6) return `student${k}.year=${r.y}`;
  if (p < 7) return `student${k}.month=${r.m}`;
  if (p < 8) return `student${k}.day=${r.d}`;
  if (p < 9) return `student${k}.grade=${r.g}`;
  if (p < 12) return `student${k}.padding`;
  return `student${k}.score=${r.sc}`;
}
const queries = [0, 5, 6, 7, 8, 9, 11, 12, 15, 16, 1599, 1600, 1605];
const out = ['stride=16'];
for (const o of queries) out.push(`off ${o} -> ${target(o)}`);
return [{
  kind: 'boundary',
  category: '100 个学生的最大数组与越界查询',
  input: lines.join('\n') + '\n' + queries.length + '\n' + queries.join('\n') + '\n',
  output: out.join('\n') + '\n',
}];
```
