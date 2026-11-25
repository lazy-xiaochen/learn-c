---json
{
  "id": "p-s6-function-macro-2",
  "title": "宏展开审计器：判断副作用是否落在无序副本上",
  "difficulty": "L4",
  "knowledgePoints": ["s6-function-macro"],
  "special": "ub-analysis",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
代码审查工具里有一项检查：**函数宏的实参带副作用时，它会不会被求值两次？两次之间有没有顺序？** 本题要求你实现这项检查的判定器。

工程里固定使用下面三个宏（本题只考这三个）：

```c
#define SQR(x)     ((x) * (x))
#define MAX(a, b)  ((a) > (b) ? (a) : (b))
#define SUM2(a, b) ((a) + (b))
```

每条查询是"一次宏调用"，实参只可能是下面几种（每个实参是一串记号，不含空格）：

| 实参 | 含义 | 读 / 写 |
|---|---|---|
| `i`、`j` | 读变量 | 读 1 次 |
| `i++`、`j++` | 后置自增 | 读 1 次 + 写 1 次（**先取值，再自增**） |
| `++i`、`++j` | 前置自增 | 写 1 次（**先自增，值是新值**） |
| `0`…`1000` | 整数常量 | 不访问变量 |

判定规则（**本题以这份规则为准**，不要按别的教材版本去推）：

1. 宏体里每个参数出现的位置叫一个**副本**。`SQR` 的 `x` 有 2 个副本 `x1`、`x2`；`MAX` 的 `a` 有 `a1`、`a2`，`b` 有 `b1`、`b2`；`SUM2` 的 `a`、`b` 各只有 1 个副本。
2. 副本之间的先后关系：
   - `SQR`：`x1` 与 `x2` **无序**（`*` 的两个操作数之间没有顺序）；
   - `MAX`：`a1` 与 `b1` **无序**（`>` 的两个操作数之间没有顺序）；但 `a1` 先于 `a2`、`b1` 先于 `b2`（三元运算符先算条件，再算被选中的分支），而且 `a2` 与 `b2` **互斥**（只会执行一个）；
   - `SUM2`：`a1` 与 `b1` **无序**。
3. 如果一对**无序**的副本访问的是**同一个变量**，并且其中至少一次是**写**，就是**未定义行为**，输出 `UB`。
4. 否则结果确定，按宏的语义算出值，输出 `OK <值> i=<i 的最终值> j=<j 的最终值>`。

注意第 2 条里的 `MAX`：`MAX(i++, 5)` **不是** UB——两个 `i++` 分处条件和被选中的分支，有先后顺序，只是**副作用发生了两次**。真正危险的是 `MAX(i++, i)` 这种"一个实参写、另一个实参读同一个变量，两者无序"的写法。

每条查询都从输入给出的初始值**重新开始**，查询之间互不影响。

## 输入格式
第一行两个整数 `i0`、`j0`：`i`、`j` 的初始值。
第二行一个整数 `n`：查询条数。
接下来 `n` 行，每行是一次宏调用：`宏名 实参1 [实参2]`，各部分之间恰好一个空格。`SQR` 带 1 个实参，`MAX` / `SUM2` 带 2 个。输入保证合法。

## 输出格式
对每条查询输出一行：

- 判定为未定义行为：`UB`
- 否则：`OK <值> i=<i> j=<j>`

## 数据范围
- `0 ≤ i0, j0 ≤ 1000`；
- `1 ≤ n ≤ 100`；
- 整数常量在 `0…1000` 之间；
- 值最大为 `1000 × 1000 = 10⁶`（`SQR`），`int` 足够；`i`、`j` 最多被加 2，也不会越界。

## 示例
### 示例 1
```in
3 5
5
SQR i
MAX i j
MAX i++ j
MAX i++ i
SQR i++
```
```out
OK 9 i=3 j=5
OK 5 i=3 j=5
OK 5 i=4 j=5
UB
UB
```
> 第 1 条：`3 × 3 = 9`，没有副作用。第 2 条：`3 > 5` 不成立，取 `b`，值 5。第 3 条：`a1` 求值得到 3 并让 `i` 变 4，`3 > 5` 不成立，取 `b` 的值 5——`i++` 只执行了一次。第 4 条：`a1`（写 `i`）与 `b1`（读 `i`）无序，判 `UB`。第 5 条：`x1`、`x2` 都写 `i` 且无序，判 `UB`。

### 示例 2（边界：初始值为 0，只有一条查询）
```in
0 0
1
SUM2 i j
```
```out
OK 0 i=0 j=0
```
> `SUM2` 的 `a1`、`b1` 无序，但它们访问的是不同变量（`i` 和 `j`），而且都只读，所以不构成 UB。值为 `0 + 0 = 0`。

## 提示
### 第 1 层
先把"实参"变成结构化的信息：它访问哪个变量（`i`、`j` 还是常量）、是读还是写、写是前置自增还是后置自增。只有 `i` / `j` / `i++` / `j++` / `++i` / `++j` / 整数常量这 7 种形态，按首字符分流即可。

### 第 2 层
UB 的判定只需要看**无序的那些副本对**，不需要把四个副本两两都比一遍：

- `SQR`：只有一对 `(x1, x2)`；
- `MAX`：只有一对 `(a1, b1)`（`a1→a2`、`b1→b2` 有序，`a2` 与 `b2` 互斥）；
- `SUM2`：只有一对 `(a1, b1)`。

对每一对：如果两边访问同一个变量、且至少一边在写，就输出 `UB`。`SQR` 是同一个实参的两个副本，所以"这个实参带副作用"就等于 UB。

### 第 3 层
没有 UB 时要把副作用真的模拟出来：

- `SQR`：两个副本各求值一次，值是两者之积（都只读或都是常量，所以两次结果一样）；
- `MAX`：先求 `a1` 得到 `va`，再求 `b1` 得到 `vb`；`va > vb` 时求值 `a2` 并取它的值，否则求值 `b2` 并取它的值；
- `SUM2`：两个副本各求值一次，相加。

求值函数按"实参形态"分工：`i` 返回 `i`；`i++` 返回旧值再把 `i` 加 1；`++i` 先把 `i` 加 1 再返回新值。别忘了每条查询都要把 `i`、`j` 重置回初始值。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_Q 100

typedef struct {
    int var;        /* -1 = 整数常量，0 = i，1 = j */
    int literal;    /* var == -1 时的值 */
    int mode;       /* 0 = 只读，1 = 后置自增，2 = 前置自增 */
} Arg;

static Arg parse_arg(const char *s) {
    Arg a;
    a.var = -1;
    a.literal = 0;
    a.mode = 0;

    if (s[0] >= '0' && s[0] <= '9') {
        a.literal = atoi(s);
        return a;
    }
    if (s[0] == '+') {                  /* ++i / ++j */
        a.var = (s[2] == 'i') ? 0 : 1;
        a.mode = 2;
        return a;
    }
    a.var = (s[0] == 'i') ? 0 : 1;      /* i / j / i++ / j++ */
    a.mode = (s[1] == '+') ? 1 : 0;
    return a;
}

static int has_write(Arg a) {
    return a.var >= 0 && a.mode != 0;
}

/* 按实参形态求值，并把副作用写回 st */
static int eval(Arg a, int st[2]) {
    if (a.var < 0) {
        return a.literal;
    }
    if (a.mode == 1) {                  /* 后置：值计算先于自增 */
        return st[a.var]++;
    }
    if (a.mode == 2) {                  /* 前置：先自增，值是新值 */
        return ++st[a.var];
    }
    return st[a.var];
}

int main(void) {
    int start[2];
    if (scanf("%d %d", &start[0], &start[1]) != 2) {
        return 0;
    }
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAX_Q) {
        return 0;
    }

    for (int k = 0; k < n; k++) {
        char mac[16];
        char t1[16];
        char t2[16];
        if (scanf("%15s %15s", mac, t1) != 2) {
            return 0;
        }
        int one_arg = (strcmp(mac, "SQR") == 0);
        if (!one_arg && scanf("%15s", t2) != 1) {
            return 0;
        }

        Arg a = parse_arg(t1);
        Arg b;
        b.var = -1;
        b.literal = 0;
        b.mode = 0;
        if (!one_arg) {
            b = parse_arg(t2);
        }

        /* 只检查无序的副本对：SQR 的 (x1,x2)、MAX/SUM2 的 (a1,b1) */
        int ub;
        if (one_arg) {
            ub = has_write(a);                              /* x1 与 x2 是同一个实参 */
        } else {
            ub = (a.var >= 0 && a.var == b.var && (has_write(a) || has_write(b)));
        }
        if (ub) {
            printf("UB\n");
            continue;
        }

        int st[2] = { start[0], start[1] };
        int value;
        if (one_arg) {
            int p = eval(a, st);
            int q = eval(a, st);        /* 无副作用，两次结果相同 */
            value = p * q;
        } else if (strcmp(mac, "MAX") == 0) {
            int va = eval(a, st);       /* a1：条件里的那一份 */
            int vb = eval(b, st);       /* b1 */
            value = (va > vb) ? eval(a, st) : eval(b, st);   /* 只求值被选中的分支 */
        } else {
            value = eval(a, st) + eval(b, st);
        }
        printf("OK %d i=%d j=%d\n", value, st[0], st[1]);
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_Q 100

typedef struct {
    int var;
    int literal;
    int mode;
} Arg;

static Arg parse_arg(const char *s) {
    Arg a;
    a.var = -1;
    a.literal = 0;
    a.mode = 0;

    if (s[0] >= '0' && s[0] <= '9') {
        a.literal = atoi(s);
        return a;
    }
    if (s[0] == '+') {
        a.var = (s[2] == 'i') ? 0 : 1;
        a.mode = 2;
        return a;
    }
    a.var = (s[0] == 'i') ? 0 : 1;
    a.mode = (s[1] == '+') ? 1 : 0;
    return a;
}

static int has_write(Arg a) {
    return a.var >= 0 && a.mode != 0;
}

static int eval(Arg a, int st[2]) {
    if (a.var < 0) {
        return a.literal;
    }
    if (a.mode == 1) {
        return st[a.var]++;
    }
    if (a.mode == 2) {
        return ++st[a.var];
    }
    return st[a.var];
}

int main(void) {
    int start[2];
    if (scanf("%d %d", &start[0], &start[1]) != 2) {
        return 0;
    }
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAX_Q) {
        return 0;
    }

    for (int k = 0; k < n; k++) {
        char mac[16];
        char t1[16];
        char t2[16];
        if (scanf("%15s %15s", mac, t1) != 2) {
            return 0;
        }
        int one_arg = (strcmp(mac, "SQR") == 0);
        if (!one_arg && scanf("%15s", t2) != 1) {
            return 0;
        }

        Arg a = parse_arg(t1);
        Arg b;
        b.var = -1;
        b.literal = 0;
        b.mode = 0;
        if (!one_arg) {
            b = parse_arg(t2);
        }

        /* TODO：这条判定太粗了——只要实参带副作用就判 UB。
           MAX 的 a1 与 a2 是有先后顺序的，副作用发生两次并不等于未定义行为。 */
        if (has_write(a) || (!one_arg && has_write(b))) {
            printf("UB\n");
            continue;
        }

        int st[2] = { start[0], start[1] };
        int value;
        if (one_arg) {
            int p = eval(a, st);
            int q = eval(a, st);
            value = p * q;
        } else if (strcmp(mac, "MAX") == 0) {
            int va = eval(a, st);
            int vb = eval(b, st);
            value = (va > vb) ? eval(a, st) : eval(b, st);
        } else {
            value = eval(a, st) + eval(b, st);
        }
        printf("OK %d i=%d j=%d\n", value, st[0], st[1]);
    }
    return 0;
}
```

## 复杂度
时间 O(n)：每条查询常数次判断和求值。
空间 O(1)：只有几个局部变量。

判定本身不需要把四个副本两两比较——因为 `MAX` 里只有 `(a1, b1)` 这一对是无序的，其余关系要么有序、要么互斥。**认出"哪一对才无序"**是本题的全部难点：把有序的 `(a1, a2)` 也当成无序，就会把 `MAX(i++, 5)` 误判成 UB；漏掉 `(a1, b1)`，则 `MAX(i++, i)` 会被放过。

## 常见错误
### 只要实参带副作用就判 UB [WA]
`MAX(i++, 5)` 展开成 `((i++) > (5) ? (i++) : (5))`：两个 `i++` 分处条件和分支，条件先求值，所以**有顺序**，不是 UB——只是 `i` 被加了两次。把它判成 UB，示例 1 的第 3 条就会错。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    int var;
    int literal;
    int mode;
} Arg;

static Arg parse_arg(const char *s) {
    Arg a;
    a.var = -1;
    a.literal = 0;
    a.mode = 0;
    if (s[0] >= '0' && s[0] <= '9') {
        a.literal = atoi(s);
        return a;
    }
    if (s[0] == '+') {
        a.var = (s[2] == 'i') ? 0 : 1;
        a.mode = 2;
        return a;
    }
    a.var = (s[0] == 'i') ? 0 : 1;
    a.mode = (s[1] == '+') ? 1 : 0;
    return a;
}

static int has_write(Arg a) {
    return a.var >= 0 && a.mode != 0;
}

static int eval(Arg a, int st[2]) {
    if (a.var < 0) {
        return a.literal;
    }
    if (a.mode == 1) {
        return st[a.var]++;
    }
    if (a.mode == 2) {
        return ++st[a.var];
    }
    return st[a.var];
}

int main(void) {
    int start[2];
    if (scanf("%d %d", &start[0], &start[1]) != 2) {
        return 0;
    }
    int n;
    if (scanf("%d", &n) != 1 || n < 1) {
        return 0;
    }

    for (int k = 0; k < n; k++) {
        char mac[16];
        char t1[16];
        char t2[16];
        if (scanf("%15s %15s", mac, t1) != 2) {
            return 0;
        }
        int one_arg = (strcmp(mac, "SQR") == 0);
        if (!one_arg && scanf("%15s", t2) != 1) {
            return 0;
        }
        Arg a = parse_arg(t1);
        Arg b;
        b.var = -1;
        b.literal = 0;
        b.mode = 0;
        if (!one_arg) {
            b = parse_arg(t2);
        }

        if (has_write(a) || (!one_arg && has_write(b))) {   /* 错：带副作用不等于无序 */
            printf("UB\n");
            continue;
        }

        int st[2] = { start[0], start[1] };
        int value;
        if (one_arg) {
            int p = eval(a, st);
            int q = eval(a, st);
            value = p * q;
        } else if (strcmp(mac, "MAX") == 0) {
            int va = eval(a, st);
            int vb = eval(b, st);
            value = (va > vb) ? eval(a, st) : eval(b, st);
        } else {
            value = eval(a, st) + eval(b, st);
        }
        printf("OK %d i=%d j=%d\n", value, st[0], st[1]);
    }
    return 0;
}
```

### 只要两边是同一个变量就判 UB [WA]
两次**读**同一个变量之间没有顺序，但两边都没有写，不构成 UB（`SUM2(i, i)` 就是合法的，值 `2i`）。判定必须带上"至少一次是写"。漏掉这一条，`SUM2 i i` 和 `MAX i i` 会被误判。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    int var;
    int literal;
    int mode;
} Arg;

static Arg parse_arg(const char *s) {
    Arg a;
    a.var = -1;
    a.literal = 0;
    a.mode = 0;
    if (s[0] >= '0' && s[0] <= '9') {
        a.literal = atoi(s);
        return a;
    }
    if (s[0] == '+') {
        a.var = (s[2] == 'i') ? 0 : 1;
        a.mode = 2;
        return a;
    }
    a.var = (s[0] == 'i') ? 0 : 1;
    a.mode = (s[1] == '+') ? 1 : 0;
    return a;
}

static int eval(Arg a, int st[2]) {
    if (a.var < 0) {
        return a.literal;
    }
    if (a.mode == 1) {
        return st[a.var]++;
    }
    if (a.mode == 2) {
        return ++st[a.var];
    }
    return st[a.var];
}

int main(void) {
    int start[2];
    if (scanf("%d %d", &start[0], &start[1]) != 2) {
        return 0;
    }
    int n;
    if (scanf("%d", &n) != 1 || n < 1) {
        return 0;
    }

    for (int k = 0; k < n; k++) {
        char mac[16];
        char t1[16];
        char t2[16];
        if (scanf("%15s %15s", mac, t1) != 2) {
            return 0;
        }
        int one_arg = (strcmp(mac, "SQR") == 0);
        if (!one_arg && scanf("%15s", t2) != 1) {
            return 0;
        }
        Arg a = parse_arg(t1);
        Arg b;
        b.var = -1;
        b.literal = 0;
        b.mode = 0;
        if (!one_arg) {
            b = parse_arg(t2);
        }

        int ub;
        if (one_arg) {
            ub = (a.mode != 0);                 /* SQR 的两个副本都来自同一个实参 */
        } else {
            ub = (a.var >= 0 && a.var == b.var);   /* 错：漏了"至少一次写" */
        }
        if (ub) {
            printf("UB\n");
            continue;
        }

        int st[2] = { start[0], start[1] };
        int value;
        if (one_arg) {
            int p = eval(a, st);
            int q = eval(a, st);
            value = p * q;
        } else if (strcmp(mac, "MAX") == 0) {
            int va = eval(a, st);
            int vb = eval(b, st);
            value = (va > vb) ? eval(a, st) : eval(b, st);
        } else {
            value = eval(a, st) + eval(b, st);
        }
        printf("OK %d i=%d j=%d\n", value, st[0], st[1]);
    }
    return 0;
}
```

### 用了 `strcmp` 却没包含 `<string.h>` [CE]
`strcmp` 声明在 `<string.h>` 里。C17 不再允许隐式声明，漏掉头文件会直接报 `call to undeclared function 'strcmp'`——不是警告，是错误。

```c file=main.c expect=CE
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int var;
    int literal;
    int mode;
} Arg;

static Arg parse_arg(const char *s) {
    Arg a;
    a.var = -1;
    a.literal = 0;
    a.mode = 0;
    if (s[0] >= '0' && s[0] <= '9') {
        a.literal = atoi(s);
        return a;
    }
    if (s[0] == '+') {
        a.var = (s[2] == 'i') ? 0 : 1;
        a.mode = 2;
        return a;
    }
    a.var = (s[0] == 'i') ? 0 : 1;
    a.mode = (s[1] == '+') ? 1 : 0;
    return a;
}

int main(void) {
    char mac[16] = "SQR";
    if (strcmp(mac, "SQR") == 0) {     /* 错：没有 #include <string.h> */
        printf("one arg\n");
    }
    return 0;
}
```

### 求值顺序搞反：把 `i++` 当成了 `++i` [WA]
后置自增的规则是"**先取值，再自增**"：`i++` 的值是旧值。如果实现成"先加再取值"，所有带 `i++` 的查询都会大 1，而且 `i` 的最终值不变——错误非常隐蔽，只有在有副作用的用例上才暴露。

### 忘了每条查询重置 `i`、`j` [WA]
查询之间互不影响，每条查询都要从输入给的 `i0`、`j0` 重新开始。把 `st` 声明在循环外面并一直累加，前几条查询的输出就开始漂移。

## 测试用例
### 01 sample 示例 1
```in
3 5
5
SQR i
MAX i j
MAX i++ j
MAX i++ i
SQR i++
```
```out
OK 9 i=3 j=5
OK 5 i=3 j=5
OK 5 i=4 j=5
UB
UB
```

### 02 sample 示例 2
```in
0 0
1
SUM2 i j
```
```out
OK 0 i=0 j=0
```

### 03 degenerate 只有一条查询、一个常量实参
```in
0 0
1
SQR 7
```
```out
OK 49 i=0 j=0
```

### 04 trap MAX 的两次求值合法，但副作用发生两次
```in
10 20
3
MAX i++ 5
MAX 5 i++
MAX i++ j++
```
```out
OK 11 i=12 j=20
OK 11 i=12 j=20
OK 21 i=11 j=22
```
> 前两条都执行了两次 `i++`（`i` 从 10 变 12），但两条走的分支不同、结果恰好都是 11。第三条：`a1` 取 10 让 `i` 变 11，`b1` 取 20 让 `j` 变 21，`10 > 20` 不成立，于是求值 `b2`（`j++` 取 21 让 `j` 变 22），值 21。

### 05 trap 同一个变量的两次读不算冲突
```in
1 2
4
MAX i i
SUM2 i i++
SUM2 i i
MAX ++i j
```
```out
OK 1 i=1 j=2
UB
OK 2 i=1 j=2
OK 2 i=2 j=2
```
> `MAX(i, i)`：两次读、没有写，合法，值是 1（`1 > 1` 不成立，取 `b`）。`SUM2(i, i++)`：读和写无序，判 `UB`。`SUM2(i, i)`：两次读，合法，值 2。`MAX(++i, j)`：`a1` 让 `i` 变 2 并得到 2，`b1` 是 2，`2 > 2` 不成立取 `b`，值 2。

### 06 degenerate 三条查询全部是 UB
```in
5 5
3
SQR ++i
MAX j j++
SUM2 ++i i
```
```out
UB
UB
UB
```
> 三条都命中"无序 + 同一个变量 + 至少一次写"：`SQR` 的 `x1`、`x2` 都写 `i`；`MAX` 的 `a1`（写 `j`）与 `b1`（读 `j`）无序；`SUM2` 的 `a1`（写 `i`）与 `b1`（读 `i`）无序。

### 07 normal 混合宏与常量
```in
2 7
4
SQR j
MAX j i
SUM2 i++ j
MAX ++j ++i
```
```out
OK 49 i=2 j=7
OK 7 i=2 j=7
OK 9 i=3 j=7
OK 9 i=3 j=9
```
> 第 3 条：`i++` 取 2 让 `i` 变 3，加上 7 得 9。第 4 条：`a1` 是 `++j`，`j` 从 7 变 8、值 8；`b1` 是 `++i`，`i` 从 2 变 3、值 3；`8 > 3` 成立，求值 `a2`（`++j`），`j` 变 9、值 9。

### 生成 boundary 100 条查询的上界
```js gen
const i0 = 1000;
const j0 = 3;
const lines = [];
const out = [];
for (let k = 0; k < 100; k++) {
  if (k % 2 === 0) {
    lines.push('SQR i');
    out.push(`OK ${i0 * i0} i=${i0} j=${j0}`);
  } else {
    lines.push('MAX i j');
    out.push(`OK ${i0} i=${i0} j=${j0}`);
  }
}
return [{
  kind: 'boundary',
  category: '100 条查询、初始值取上界',
  input: `${i0} ${j0}\n100\n${lines.join('\n')}\n`,
  output: out.join('\n') + '\n',
}];
```
