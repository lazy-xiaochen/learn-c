---json
{
  "id": "p-s5-ub-sequence-2",
  "title": "未排序访问审计：给前缀表达式数冲突对",
  "difficulty": "L5",
  "knowledgePoints": ["s5-ub-sequence"],
  "special": "ub-analysis",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
代码审查工具里有一项检查叫"未排序访问"：同一个完整表达式里，如果对同一个变量的两个访问之间没有先后顺序、且至少有一个是写，就是未定义行为。本题要求你实现这项检查，并且**不只报"有/没有"，还要数出冲突对的数量**——数量能帮作者判断这段表达式"烂得多深"。

输入是若干条**前缀表达式**（每个表达式单独占一行，token 之间用一个空格分隔）。变量只有 `i` 和 `j`，允许的节点如下：

| token | 含义 | 读 / 写 |
|---|---|---|
| `i`、`j` | 读变量 | 读 1 次 |
| `pi`、`pj` | `i++`、`j++` | 读 1 次 + 写 1 次 |
| `qi`、`qj` | `++i`、`++j` | 写 1 次 |
| `+ a b` | `a + b` | 两个操作数之间**没有**顺序 |
| `* a b` | `a * b` | 同上 |
| `f a b` | 二参数函数调用 `f(a, b)` | 两个实参之间**没有**顺序 |
| `, a b` | 逗号运算符 `(a, b)` | `a` 先于 `b`（排序点） |
| `? a b c` | `a ? b : c` | `a` 先于 `b`、`a` 先于 `c`；`b` 与 `c` 互斥 |

数冲突的规则：

1. **同一个叶子内部**的那次读和那次写不算冲突——`i++` 的值计算先于自增，标准保证了这个顺序；
2. 两个访问如果落在**互不排序**的两棵子树上，且至少一个是写，就算**一对**冲突；
3. 两个都是读，无论怎么排都不算冲突；
4. `,` 的左子树整体先于右子树，所以左、右之间**不产生**冲突；
5. `?` 的条件先于两个分支；两个分支互斥（只会求值一个），所以分支之间**不产生**冲突；
6. `+`、`*`、`f` 的操作数两两之间都互不排序。

一棵子树对外只需要暴露四个数：`i` 的写次数、`i` 的读次数、`j` 的写次数、`j` 的读次数，再加上它**内部已经数出来的冲突对数**。两棵互不排序的子树 `A`、`B` 合并时，新增的冲突对数是

```
A.w[i]*B.w[i] + A.w[i]*B.r[i] + A.r[i]*B.w[i]     （对 j 同理）
```

三项目分别对应"写-写""写-读""读-写"。以 `+ pi pi`（即 `i++ + i++`）为例：每边都是写 1 读 1，所以新增 `1×1 + 1×1 + 1×1 = 3` 对。

## 输入格式
第一行一个整数 `n`：表达式的个数。

接下来 `n` 行，每行一个前缀表达式，token 之间恰好一个空格，行首行尾没有多余空格。表达式一定是**合法**的（每个节点给出的操作数个数都与上表一致）。

## 输出格式
对每个表达式输出一行：

- 冲突对数为 0：`CLEAN`
- 否则：`UB <冲突对数>`

## 数据范围
- `1 ≤ n ≤ 100`；
- 每个表达式的 token 数不超过 200，整行长度不超过 600 个字符；
- 单个表达式的冲突对数不超过 200000，用 `int` 装得下，但中间量建议用 `long long`。

## 示例
### 示例 1
```in
3
+ pi pi
, pi pi
f qi i
```
```out
UB 3
CLEAN
UB 1
```
> 第一行 `i++ + i++`：两个操作数互不排序，各含 1 写 1 读，冲突对数 `1+1+1 = 3`。第二行 `(i++, i++)`：逗号是排序点，左子树在右子树之前，不产生冲突。第三行 `f(++i, i)`：`++i` 只写、`i` 只读，两个实参互不排序 → 写-读 1 对。

### 示例 2（边界：条件表达式内部全部有序）
```in
1
? pi pi pi
```
```out
CLEAN
```
> `?` 的条件先于两个分支，两个分支互斥，所以三个 `i++` 之间没有任何一对落在"互不排序"的位置上，冲突数为 0。这是最容易判错的一种：三个 `i++` 看起来"挤在一个表达式里"，实际一个都不冲突。

## 提示
### 第 1 层
先写递归下降的解析器：按 token 的首字符分派。`i`/`j`/`pi`/`pj`/`qi`/`qj` 是叶子，`+`/`*`/`f`/`,` 各取两个操作数，`?` 取三个。解析时用一个全局下标 `pos` 从左往右扫。

### 第 2 层
让每个递归调用返回一个结构体：`w[2]`、`r[2]`（下标 0 是 `i`、1 是 `j`）和 `bad`。合并时写两个函数：`join_unseq` 在求和之外累加交叉项，`join_seq` 只求和。`?` 可以看成两次"有序合并"：先合并条件与分支 2，再与分支 3 合并。

### 第 3 层
交叉项千万别漏掉 `bad` 的累加：`x.bad = a.bad + b.bad + 交叉项`。只算交叉项而忘了子树的 `bad`，嵌套表达式（示例里没有，隐藏用例里有）会少算。另外 `pi` 的读和写要各记一次，`qi` 只记写——`++i` 的值是新值，不读旧值。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

typedef struct {
    long long w[2];   /* 写次数：下标 0 是 i，1 是 j */
    long long r[2];   /* 读次数 */
    long long bad;    /* 子树内部已经数出来的冲突对数 */
} Info;

static char *toks[400];
static int ntok;
static int pos;

/* 两棵互不排序的子树合并：除了求和，还要数跨子树的冲突对 */
static Info join_unseq(Info a, Info b) {
    Info x;
    x.bad = a.bad + b.bad;
    for (int v = 0; v < 2; v++) {
        x.bad += a.w[v] * b.w[v] + a.w[v] * b.r[v] + a.r[v] * b.w[v];
        x.w[v] = a.w[v] + b.w[v];
        x.r[v] = a.r[v] + b.r[v];
    }
    return x;
}

/* 两棵有先后顺序的子树合并：不产生跨子树的冲突 */
static Info join_seq(Info a, Info b) {
    Info x;
    x.bad = a.bad + b.bad;
    for (int v = 0; v < 2; v++) {
        x.w[v] = a.w[v] + b.w[v];
        x.r[v] = a.r[v] + b.r[v];
    }
    return x;
}

static Info parse_one(void) {
    Info x;
    memset(&x, 0, sizeof x);
    if (pos >= ntok) {
        return x;
    }
    const char *t = toks[pos++];
    if (strcmp(t, "i") == 0) {
        x.r[0] = 1;
    } else if (strcmp(t, "j") == 0) {
        x.r[1] = 1;
    } else if (strcmp(t, "pi") == 0) {
        x.r[0] = 1;
        x.w[0] = 1;
    } else if (strcmp(t, "pj") == 0) {
        x.r[1] = 1;
        x.w[1] = 1;
    } else if (strcmp(t, "qi") == 0) {
        x.w[0] = 1;
    } else if (strcmp(t, "qj") == 0) {
        x.w[1] = 1;
    } else if (strcmp(t, "+") == 0 || strcmp(t, "*") == 0 || strcmp(t, "f") == 0) {
        Info a = parse_one();
        Info b = parse_one();
        return join_unseq(a, b);
    } else if (strcmp(t, ",") == 0) {
        Info a = parse_one();
        Info b = parse_one();
        return join_seq(a, b);
    } else if (strcmp(t, "?") == 0) {
        Info a = parse_one();
        Info b = parse_one();
        Info c = parse_one();
        return join_seq(join_seq(a, b), c);
    }
    return x;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }
    char line[1024];
    if (fgets(line, sizeof line, stdin) == NULL) {   /* 吃掉第一行剩下的换行 */
        return 0;
    }
    for (int k = 0; k < n; k++) {
        if (fgets(line, sizeof line, stdin) == NULL) {
            return 0;
        }
        line[strcspn(line, "\r\n")] = '\0';
        ntok = 0;
        pos = 0;
        for (char *t = strtok(line, " "); t != NULL && ntok < 400; t = strtok(NULL, " ")) {
            toks[ntok++] = t;
        }
        Info r = parse_one();
        if (r.bad > 0) {
            printf("UB %lld\n", r.bad);
        } else {
            printf("CLEAN\n");
        }
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

typedef struct {
    long long w[2];
    long long r[2];
    long long bad;
} Info;

static char *toks[400];
static int ntok;
static int pos;

static Info join(Info a, Info b) {
    Info x;
    x.bad = a.bad + b.bad;          /* TODO: 这里还要加上跨子树的冲突对 */
    for (int v = 0; v < 2; v++) {
        x.w[v] = a.w[v] + b.w[v];
        x.r[v] = a.r[v] + b.r[v];
    }
    return x;
}

static Info parse_one(void) {
    Info x;
    memset(&x, 0, sizeof x);
    if (pos >= ntok) {
        return x;
    }
    const char *t = toks[pos++];
    if (strcmp(t, "i") == 0) {
        x.r[0] = 1;
    } else if (strcmp(t, "j") == 0) {
        x.r[1] = 1;
    } else if (strcmp(t, "pi") == 0) {
        x.r[0] = 1;
        x.w[0] = 1;
    } else if (strcmp(t, "pj") == 0) {
        x.r[1] = 1;
        x.w[1] = 1;
    } else if (strcmp(t, "qi") == 0) {
        x.w[0] = 1;
    } else if (strcmp(t, "qj") == 0) {
        x.w[1] = 1;
    } else if (strcmp(t, "+") == 0 || strcmp(t, "*") == 0 || strcmp(t, "f") == 0) {
        Info a = parse_one();
        Info b = parse_one();
        return join(a, b);          /* TODO: + * f 的操作数之间没有顺序 */
    } else if (strcmp(t, ",") == 0) {
        Info a = parse_one();
        Info b = parse_one();
        return join(a, b);          /* 逗号是排序点，这里恰好是对的 */
    } else if (strcmp(t, "?") == 0) {
        Info a = parse_one();
        Info b = parse_one();
        Info c = parse_one();
        return join(join(a, b), c);
    }
    return x;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }
    char line[1024];
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    for (int k = 0; k < n; k++) {
        if (fgets(line, sizeof line, stdin) == NULL) {
            return 0;
        }
        line[strcspn(line, "\r\n")] = '\0';
        ntok = 0;
        pos = 0;
        for (char *t = strtok(line, " "); t != NULL && ntok < 400; t = strtok(NULL, " ")) {
            toks[ntok++] = t;
        }
        Info r = parse_one();
        if (r.bad > 0) {
            printf("UB %lld\n", r.bad);
        } else {
            printf("CLEAN\n");
        }
    }
    return 0;
}
```

## 复杂度
时间 O(token 数)：每个节点做常数次加法和乘法，合计 O(n × 长度)。
空间 O(长度)：一行文本加一个 token 指针数组。

## 常见错误
### 把 `,` 也当成"互不排序" [WA]
逗号运算符是标准点名的排序点，左操作数整体先于右操作数。把 `,` 和 `+` 一视同仁，`(i++, i++)` 会被算成 3 对冲突（示例 1 第二行就会从 `CLEAN` 变成 `UB 3`）。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

typedef struct {
    long long w[2];
    long long r[2];
    long long bad;
} Info;

static char *toks[400];
static int ntok;
static int pos;

static Info join_unseq(Info a, Info b) {
    Info x;
    x.bad = a.bad + b.bad;
    for (int v = 0; v < 2; v++) {
        x.bad += a.w[v] * b.w[v] + a.w[v] * b.r[v] + a.r[v] * b.w[v];
        x.w[v] = a.w[v] + b.w[v];
        x.r[v] = a.r[v] + b.r[v];
    }
    return x;
}

static Info join_seq(Info a, Info b) {
    Info x;
    x.bad = a.bad + b.bad;
    for (int v = 0; v < 2; v++) {
        x.w[v] = a.w[v] + b.w[v];
        x.r[v] = a.r[v] + b.r[v];
    }
    return x;
}

static Info parse_one(void) {
    Info x;
    memset(&x, 0, sizeof x);
    if (pos >= ntok) {
        return x;
    }
    const char *t = toks[pos++];
    if (strcmp(t, "i") == 0) {
        x.r[0] = 1;
    } else if (strcmp(t, "j") == 0) {
        x.r[1] = 1;
    } else if (strcmp(t, "pi") == 0) {
        x.r[0] = 1;
        x.w[0] = 1;
    } else if (strcmp(t, "pj") == 0) {
        x.r[1] = 1;
        x.w[1] = 1;
    } else if (strcmp(t, "qi") == 0) {
        x.w[0] = 1;
    } else if (strcmp(t, "qj") == 0) {
        x.w[1] = 1;
    } else if (strcmp(t, "+") == 0 || strcmp(t, "*") == 0 || strcmp(t, "f") == 0) {
        Info a = parse_one();
        Info b = parse_one();
        return join_unseq(a, b);
    } else if (strcmp(t, ",") == 0) {
        Info a = parse_one();
        Info b = parse_one();
        return join_unseq(a, b);        /* 错：逗号是排序点 */
    } else if (strcmp(t, "?") == 0) {
        Info a = parse_one();
        Info b = parse_one();
        Info c = parse_one();
        return join_seq(join_seq(a, b), c);
    }
    return x;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }
    char line[1024];
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    for (int k = 0; k < n; k++) {
        if (fgets(line, sizeof line, stdin) == NULL) {
            return 0;
        }
        line[strcspn(line, "\r\n")] = '\0';
        ntok = 0;
        pos = 0;
        for (char *t = strtok(line, " "); t != NULL && ntok < 400; t = strtok(NULL, " ")) {
            toks[ntok++] = t;
        }
        Info r = parse_one();
        printf(r.bad > 0 ? "UB %lld\n" : "CLEAN\n", r.bad);
    }
    return 0;
}
```

### 把 `?:` 的三个操作数都当成无序 [WA]
`a ? b : c` 里条件先求值，两个分支只会执行一个。三棵子树两两无序的话，示例 2 的 `? pi pi pi` 会被算成 `3 × 3 = 9` 对冲突，而正确答案是 `CLEAN`。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

typedef struct {
    long long w[2];
    long long r[2];
    long long bad;
} Info;

static char *toks[400];
static int ntok;
static int pos;

static Info join_unseq(Info a, Info b) {
    Info x;
    x.bad = a.bad + b.bad;
    for (int v = 0; v < 2; v++) {
        x.bad += a.w[v] * b.w[v] + a.w[v] * b.r[v] + a.r[v] * b.w[v];
        x.w[v] = a.w[v] + b.w[v];
        x.r[v] = a.r[v] + b.r[v];
    }
    return x;
}

static Info join_seq(Info a, Info b) {
    Info x;
    x.bad = a.bad + b.bad;
    for (int v = 0; v < 2; v++) {
        x.w[v] = a.w[v] + b.w[v];
        x.r[v] = a.r[v] + b.r[v];
    }
    return x;
}

static Info parse_one(void) {
    Info x;
    memset(&x, 0, sizeof x);
    if (pos >= ntok) {
        return x;
    }
    const char *t = toks[pos++];
    if (strcmp(t, "i") == 0) {
        x.r[0] = 1;
    } else if (strcmp(t, "j") == 0) {
        x.r[1] = 1;
    } else if (strcmp(t, "pi") == 0) {
        x.r[0] = 1;
        x.w[0] = 1;
    } else if (strcmp(t, "pj") == 0) {
        x.r[1] = 1;
        x.w[1] = 1;
    } else if (strcmp(t, "qi") == 0) {
        x.w[0] = 1;
    } else if (strcmp(t, "qj") == 0) {
        x.w[1] = 1;
    } else if (strcmp(t, "+") == 0 || strcmp(t, "*") == 0 || strcmp(t, "f") == 0) {
        Info a = parse_one();
        Info b = parse_one();
        return join_unseq(a, b);
    } else if (strcmp(t, ",") == 0) {
        Info a = parse_one();
        Info b = parse_one();
        return join_seq(a, b);
    } else if (strcmp(t, "?") == 0) {
        Info a = parse_one();
        Info b = parse_one();
        Info c = parse_one();
        return join_unseq(join_unseq(a, b), c);   /* 错：条件和分支之间是有顺序的 */
    }
    return x;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }
    char line[1024];
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    for (int k = 0; k < n; k++) {
        if (fgets(line, sizeof line, stdin) == NULL) {
            return 0;
        }
        line[strcspn(line, "\r\n")] = '\0';
        ntok = 0;
        pos = 0;
        for (char *t = strtok(line, " "); t != NULL && ntok < 400; t = strtok(NULL, " ")) {
            toks[ntok++] = t;
        }
        Info r = parse_one();
        printf(r.bad > 0 ? "UB %lld\n" : "CLEAN\n", r.bad);
    }
    return 0;
}
```

### 把"读-读"也数成冲突 [WA]
`i + i` 读两次同一个变量，两个读之间没有顺序，但两边都没有写，**不是** UB（标准只禁止"未排序的写与写/写与读"）。如果把 `A.r*B.r` 也算进去，`+ i i` 会变成 `UB 1`。

比这更隐蔽的是把 `i++` 当成"只写"：那样 `+ pi i` 会少算一对（写-读），从 2 变成 1。读写的次数必须按表逐项记。

### 合并时忘了累加子树的 `bad` [WA]
交叉项只管"两棵子树之间"，每棵子树**内部**的冲突早就该数好了。写成 `x.bad = 交叉项` 而不加 `a.bad + b.bad`，嵌套结构（例如 `+ + pi pi pi`，内层已经 3 对，外层再加 6 对，正确答案 9）只会报 6。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

typedef struct {
    long long w[2];
    long long r[2];
    long long bad;
} Info;

static char *toks[400];
static int ntok;
static int pos;

static Info join_unseq(Info a, Info b) {
    Info x;
    x.bad = 0;                        /* 错：丢掉了 a.bad 和 b.bad */
    for (int v = 0; v < 2; v++) {
        x.bad += a.w[v] * b.w[v] + a.w[v] * b.r[v] + a.r[v] * b.w[v];
        x.w[v] = a.w[v] + b.w[v];
        x.r[v] = a.r[v] + b.r[v];
    }
    return x;
}

static Info join_seq(Info a, Info b) {
    Info x;
    x.bad = 0;
    for (int v = 0; v < 2; v++) {
        x.w[v] = a.w[v] + b.w[v];
        x.r[v] = a.r[v] + b.r[v];
    }
    return x;
}

static Info parse_one(void) {
    Info x;
    memset(&x, 0, sizeof x);
    if (pos >= ntok) {
        return x;
    }
    const char *t = toks[pos++];
    if (strcmp(t, "i") == 0) {
        x.r[0] = 1;
    } else if (strcmp(t, "j") == 0) {
        x.r[1] = 1;
    } else if (strcmp(t, "pi") == 0) {
        x.r[0] = 1;
        x.w[0] = 1;
    } else if (strcmp(t, "pj") == 0) {
        x.r[1] = 1;
        x.w[1] = 1;
    } else if (strcmp(t, "qi") == 0) {
        x.w[0] = 1;
    } else if (strcmp(t, "qj") == 0) {
        x.w[1] = 1;
    } else if (strcmp(t, "+") == 0 || strcmp(t, "*") == 0 || strcmp(t, "f") == 0) {
        Info a = parse_one();
        Info b = parse_one();
        return join_unseq(a, b);
    } else if (strcmp(t, ",") == 0) {
        Info a = parse_one();
        Info b = parse_one();
        return join_seq(a, b);
    } else if (strcmp(t, "?") == 0) {
        Info a = parse_one();
        Info b = parse_one();
        Info c = parse_one();
        return join_seq(join_seq(a, b), c);
    }
    return x;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }
    char line[1024];
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    for (int k = 0; k < n; k++) {
        if (fgets(line, sizeof line, stdin) == NULL) {
            return 0;
        }
        line[strcspn(line, "\r\n")] = '\0';
        ntok = 0;
        pos = 0;
        for (char *t = strtok(line, " "); t != NULL && ntok < 400; t = strtok(NULL, " ")) {
            toks[ntok++] = t;
        }
        Info r = parse_one();
        printf(r.bad > 0 ? "UB %lld\n" : "CLEAN\n", r.bad);
    }
    return 0;
}
```

### 忘了 `,` 只保护"自己内部"，不保护外层 [WA]
`(i++, i++) + i` 里逗号让两个 `i++` 之间有序，但整个 `(i++, i++)` 与外面的 `i` 之间**没有**顺序：写 2 次、读 1 次，共 2 对冲突。很多人以为"加了逗号就安全"，写出 `+ , pi pi i` 却算成 0。

## 测试用例
### 01 sample 示例 1
```in
3
+ pi pi
, pi pi
f qi i
```
```out
UB 3
CLEAN
UB 1
```

### 02 sample 示例 2
```in
1
? pi pi pi
```
```out
CLEAN
```

### 03 boundary 100 个 qi 串成一条加法链
```in
2
+ + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi
+ + + + + + + + + + + + + + + + + + + qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi qi
```
```out
UB 4950
UB 190
```
> 100 个 `++i` 两两之间都无序，每一对都是 1 个"写-写"冲突，共 `100×99/2 = 4950` 对；第二行 20 个则是 `20×19/2 = 190`。这类用例能顺便验证你用的是 `long long`、以及交叉项没有写成平方。

### 04 degenerate 单个叶子
```in
3
i
j
qi
```
```out
CLEAN
CLEAN
CLEAN
```
> 只有一次访问的表达式不可能有冲突，无论它是读还是写。

### 05 trap 逗号只保护自己内部
```in
2
+ , pi pi i
, + pi pi i
```
```out
UB 2
UB 3
```
> 第一行 `(i++, i++) + i`：左子树写 2 次、读 2 次，右子树读 1 次，跨子树只算"写-读"2 对。第二行 `((i++ + i++), i)`：加法那部分内部先有 3 对冲突，外层逗号不再新增，所以是 3。

### 06 trap 函数实参之间没有顺序
```in
2
f pj qj
f i j
```
```out
UB 2
CLEAN
```
> `f(j++, j++)`：两边各写 `j` 1 次、读 `j` 1 次，跨子树 `1+1+0 = 2` 对。`f(i, j)` 读的是两个不同变量，虽然顺序未指定但互不干扰。

### 07 normal 混合结构
```in
5
? i j , pj pj
* i j
+ i i
+ + + qi qi qi + qi qi
, , , pi pi pi pi
```
```out
CLEAN
CLEAN
CLEAN
UB 10
CLEAN
```
> `+ i i` 读两次同一个变量但没有写，是合法的"未指定顺序"；`? i j (j++,j++)` 的条件和分支都排好序；`+ + + qi qi qi + qi qi` 是 5 个 `++i` 两两无序，每对 1 个写-写冲突，`5×4/2 = 10`。
