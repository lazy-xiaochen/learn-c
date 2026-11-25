---json
{
  "id": "p-s7-iv-malloc-free-2",
  "title": "堆操作审计：找出第一条 UB 并说出它属于哪一种",
  "difficulty": "L4",
  "knowledgePoints": ["s7-iv-malloc-free"],
  "special": "ub-analysis",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
线上服务偶发崩溃，排障同学从日志里还原出了一段"堆指针操作流水账"。现在请你当审查员：**按照 C 标准逐条推演，找出第一条踩到未定义行为的语句，并说出它属于哪一种 UB**；如果整段都没有 UB，再报告程序结束时还有几块内存没有归还。

程序开头固定是：

```c
int local = 0;      /* 一个普通的栈上变量，生命周期覆盖整个 main */
int *p = NULL;      /* 两个指针一开始都是空指针，不是野指针 */
int *q = NULL;
```

流水账里的每条指令对应一行真实的 C 代码：

| 指令 | 对应的 C 代码 | 判定规则 |
|---|---|---|
| `M x` | `x = malloc(sizeof *x);` | 不会 UB（分配一定成功）。如果 `x` 原来指向一块**还活着**的内存，那块内存从此没人释放 → 变成泄漏，不是 UB |
| `L x` | `x = NULL;` | 不会 UB |
| `S x` | `x = &local;` | 不会 UB。`x` 变成"指向栈"，读写合法，但**不能 free** |
| `C x y` | `x = y;` | 不会 UB（只复制指针值） |
| `F x` | `free(x);` | `x == NULL`：安全，什么也不做；`x` 指向栈：UB（`invalid-free`）；`x` 指向的块已被释放：UB（`double-free`）；否则正常释放 |
| `R x` | `v = *x;` | `x == NULL`：UB（`null-deref`）；`x` 指向已释放的块：UB（`use-after-free`）；`x` 指向栈或存活的块：安全 |
| `W x` | `*x = 0;` | 与 `R` 完全相同 |

四种 UB 的名字（输出时必须原样使用）：

- `double-free`：同一块堆内存被释放了第二次；
- `use-after-free`：块已经释放，仍然通过某个指针读或写它；
- `null-deref`：通过空指针读或写；
- `invalid-free`：free 的指针不是 malloc 返回的（本题里是栈地址）。

一旦某条指令触发 UB，程序的行为就**不再由标准保证**，后面的指令也不再执行——所以只需要报告**第一条**。

还要分清"UB"和"泄漏"：程序结束时还有块没释放，只是**资源没归还**，程序本身的行为依然完全定义良好，**不是 UB**。题目要求把这两种情况分开报告。

## 输入格式
第一行一个整数 `n`（指令条数）。
接下来 `n` 行，每行一条指令，格式为 `M x`、`L x`、`S x`、`C x y`、`F x`、`R x`、`W x` 之一，其中 `x`、`y` 是 `p` 或 `q`。

## 输出格式
只输出一行：

- 如果有 UB：`UB <k> <类型>`，其中 `<k>` 是第一条触发 UB 的指令序号（从 1 开始），`<类型>` 是 `double-free`、`use-after-free`、`null-deref`、`invalid-free` 之一；
- 如果没有任何 UB：`OK leak=<结束时仍存活的块数>`。

## 数据范围
1 ≤ n ≤ 200
指针名只会是 `p`、`q`
分配的块数最多 200
输出只有一行，不超过 40 字节。

## 示例
### 示例 1
```in
5
M p
S q
F q
F p
F p
```
```out
UB 3 invalid-free
```
> 第 1 步拿到堆块 1 交给 `p`；第 2 步 `q` 指向栈上的 `local`；第 3 步 `free(q)` 释放的是栈地址，不是 malloc 返回的指针 → `invalid-free`。注意不能把它算成 `double-free`：`q` 指向的块号既不是 0（NULL），也不是某个"已释放的块"，而是一个根本没在堆上的地址。

### 示例 2（边界：没有 UB，但有一块泄漏）
```in
4
M p
M q
F q
L p
```
```out
OK leak=1
```
> 块 1 交给 `p`，块 2 交给 `q`；第 3 步正常释放块 2；第 4 步把 `p` 置空，块 1 从此没有任何指针指向它，永远无法释放 → 结束时存活 1 块。**这属于泄漏，不是 UB**：程序的行为依然完全定义良好，只是资源没归还。

## 提示
### 第 1 层
准备三个状态就够：`ptr[p]`、`ptr[q]` 记"它指向哪里"，用一个整数编码：`0` 表示 NULL，`-1` 表示栈地址，`1, 2, 3, ...` 表示块号；再加一个 `alive[]` 记"每块内存是否还没被释放"。`M` 分配新块号、`L` 写 0、`S` 写 -1、`C` 复制块号——这四条都不会 UB。

### 第 2 层
`F` 要分四种情况，顺序不能乱：`-1` → `invalid-free`；`0` → `free(NULL)`，安全，什么都不做；块号 > 0 且 `alive` 为假 → `double-free`；块号 > 0 且 `alive` 为真 → 正常释放（只把 `alive` 置 0，**不要动任何指针**）。`R`/`W` 只有三种情况：`0` → `null-deref`；`-1` → 安全；块号 > 0 且已释放 → `use-after-free`。

### 第 3 层
边走边记 `ub = k` 和对应的类型字符串，一旦记下就停止处理后面的指令（UB 之后的行为没有定义，不需要也不应该继续推演）。如果循环正常走完，就数一遍 `alive` 里还剩几块，输出 `OK leak=<块数>`。注意读指令用 `scanf(" %c", &op)`，前面的空格会跳过换行；`C` 要读两个指针名，其余指令只读一个。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAX_OPS 205
#define NULL_PTR 0
#define STACK_PTR (-1)

static int ptr_index(char c) {
    if (c == 'p') {
        return 0;
    }
    if (c == 'q') {
        return 1;
    }
    return -1;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 200) {
        return 0;
    }

    int alive[MAX_OPS] = {0};
    int ptr[2] = { NULL_PTR, NULL_PTR };
    int next_block = 0;
    int ub = 0;
    const char *kind = "";

    for (int k = 1; k <= n && ub == 0; k++) {
        char op;
        if (scanf(" %c", &op) != 1) {
            return 0;
        }

        if (op == 'M') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int i = ptr_index(x);
            if (i < 0) {
                return 0;
            }
            next_block++;
            alive[next_block] = 1;
            ptr[i] = next_block;
        } else if (op == 'L') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int i = ptr_index(x);
            if (i < 0) {
                return 0;
            }
            ptr[i] = NULL_PTR;
        } else if (op == 'S') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int i = ptr_index(x);
            if (i < 0) {
                return 0;
            }
            ptr[i] = STACK_PTR;
        } else if (op == 'C') {
            char x;
            char y;
            if (scanf(" %c %c", &x, &y) != 2) {
                return 0;
            }
            int ix = ptr_index(x);
            int iy = ptr_index(y);
            if (ix < 0 || iy < 0) {
                return 0;
            }
            ptr[ix] = ptr[iy];
        } else if (op == 'F') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int i = ptr_index(x);
            if (i < 0) {
                return 0;
            }
            if (ptr[i] == STACK_PTR) {
                ub = k;
                kind = "invalid-free";
            } else if (ptr[i] != NULL_PTR) {
                if (!alive[ptr[i]]) {
                    ub = k;
                    kind = "double-free";
                } else {
                    alive[ptr[i]] = 0;
                }
            }
        } else if (op == 'R' || op == 'W') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int i = ptr_index(x);
            if (i < 0) {
                return 0;
            }
            if (ptr[i] == NULL_PTR) {
                ub = k;
                kind = "null-deref";
            } else if (ptr[i] != STACK_PTR && !alive[ptr[i]]) {
                ub = k;
                kind = "use-after-free";
            }
        } else {
            return 0;
        }
    }

    if (ub > 0) {
        printf("UB %d %s\n", ub, kind);
        return 0;
    }

    int leak = 0;
    for (int b = 1; b <= next_block; b++) {
        if (alive[b]) {
            leak++;
        }
    }
    printf("OK leak=%d\n", leak);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAX_OPS 205
#define NULL_PTR 0

static int ptr_index(char c) {
    if (c == 'p') {
        return 0;
    }
    if (c == 'q') {
        return 1;
    }
    return -1;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 200) {
        return 0;
    }

    int alive[MAX_OPS] = {0};
    int ptr[2] = { NULL_PTR, NULL_PTR };
    int next_block = 0;
    int ub = 0;

    for (int k = 1; k <= n && ub == 0; k++) {
        char op;
        if (scanf(" %c", &op) != 1) {
            return 0;
        }

        char x = 0;
        char y = 0;
        if (op == 'C') {
            if (scanf(" %c %c", &x, &y) != 2) {
                return 0;
            }
        } else {
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
        }
        int ix = ptr_index(x);
        if (ix < 0) {
            return 0;
        }

        if (op == 'M') {
            next_block++;
            alive[next_block] = 1;
            ptr[ix] = next_block;
        } else if (op == 'L') {
            ptr[ix] = NULL_PTR;
        } else if (op == 'S') {
            ptr[ix] = NULL_PTR;            /* TODO: 栈指针要用另一个特殊值表示，不能和 NULL 混用 */
        } else if (op == 'C') {
            int iy = ptr_index(y);
            if (iy < 0) {
                return 0;
            }
            ptr[ix] = ptr[iy];
        } else if (op == 'F') {
            if (ptr[ix] != NULL_PTR) {
                alive[ptr[ix]] = 0;        /* TODO: 重复释放、释放栈指针都要判 UB */
            }
        } else if (op == 'R' || op == 'W') {
            /* TODO: 空指针解引用、释放后使用都要判 UB */
        }
    }

    if (ub > 0) {
        printf("UB %d\n", ub);             /* TODO: 还要输出 UB 的类型 */
        return 0;
    }

    int leak = 0;
    for (int b = 1; b <= next_block; b++) {
        if (alive[b]) {
            leak++;
        }
    }
    printf("OK leak=%d\n", leak);
    return 0;
}
```

## 复杂度
时间 O(n + 块数)：每条指令 O(1)，最后扫一遍块表数泄漏。
空间 O(块数)：一个固定 205 项的布尔表。

## 常见错误
### 把 `free(NULL)` 当成未定义行为 [WA]
标准明确规定 `free(NULL)` 是**合法的空操作**。如果写成 `if (ptr[i] == NULL_PTR) { ub = k; }`，那么"先置空、再释放"这种完全正确的防御性写法会被误报成 UB。`free(NULL)` 之所以被特别允许，就是为了让"释放后置空"不引入新错误。

```c file=main.c expect=WA
#include <stdio.h>

#define MAX_OPS 205
#define NULL_PTR 0
#define STACK_PTR (-1)

static int ptr_index(char c) {
    if (c == 'p') {
        return 0;
    }
    if (c == 'q') {
        return 1;
    }
    return -1;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 200) {
        return 0;
    }

    int alive[MAX_OPS] = {0};
    int ptr[2] = { NULL_PTR, NULL_PTR };
    int next_block = 0;
    int ub = 0;
    const char *kind = "";

    for (int k = 1; k <= n && ub == 0; k++) {
        char op;
        if (scanf(" %c", &op) != 1) {
            return 0;
        }
        if (op == 'M') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            next_block++;
            alive[next_block] = 1;
            ptr[ptr_index(x)] = next_block;
        } else if (op == 'L') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            ptr[ptr_index(x)] = NULL_PTR;
        } else if (op == 'S') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            ptr[ptr_index(x)] = STACK_PTR;
        } else if (op == 'C') {
            char x;
            char y;
            if (scanf(" %c %c", &x, &y) != 2) {
                return 0;
            }
            ptr[ptr_index(x)] = ptr[ptr_index(y)];
        } else if (op == 'F') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int i = ptr_index(x);
            if (ptr[i] == NULL_PTR) {
                ub = k;                /* 错：free(NULL) 是合法的空操作 */
                kind = "null-deref";
            } else if (ptr[i] == STACK_PTR) {
                ub = k;
                kind = "invalid-free";
            } else if (!alive[ptr[i]]) {
                ub = k;
                kind = "double-free";
            } else {
                alive[ptr[i]] = 0;
            }
        } else if (op == 'R' || op == 'W') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int i = ptr_index(x);
            if (ptr[i] == NULL_PTR) {
                ub = k;
                kind = "null-deref";
            } else if (ptr[i] != STACK_PTR && !alive[ptr[i]]) {
                ub = k;
                kind = "use-after-free";
            }
        }
    }

    if (ub > 0) {
        printf("UB %d %s\n", ub, kind);
        return 0;
    }
    int leak = 0;
    for (int b = 1; b <= next_block; b++) {
        if (alive[b]) {
            leak++;
        }
    }
    printf("OK leak=%d\n", leak);
    return 0;
}
```

### 读/写时只判空指针，漏掉"释放后使用" [WA]
`if (ptr[i] == NULL_PTR)` 只覆盖了空指针解引用。悬垂指针的块号不是 0，症状是程序一声不响地继续跑，该报的 `UB 4 use-after-free` 变成了 `OK leak=...`。`R`/`W` 的判定和 `F` 一样，都要先看是不是 NULL，再看块是否还活着。

```c file=main.c expect=WA
#include <stdio.h>

#define MAX_OPS 205
#define NULL_PTR 0
#define STACK_PTR (-1)

static int ptr_index(char c) {
    if (c == 'p') {
        return 0;
    }
    if (c == 'q') {
        return 1;
    }
    return -1;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 200) {
        return 0;
    }

    int alive[MAX_OPS] = {0};
    int ptr[2] = { NULL_PTR, NULL_PTR };
    int next_block = 0;
    int ub = 0;
    const char *kind = "";

    for (int k = 1; k <= n && ub == 0; k++) {
        char op;
        if (scanf(" %c", &op) != 1) {
            return 0;
        }
        if (op == 'M') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            next_block++;
            alive[next_block] = 1;
            ptr[ptr_index(x)] = next_block;
        } else if (op == 'L') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            ptr[ptr_index(x)] = NULL_PTR;
        } else if (op == 'S') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            ptr[ptr_index(x)] = STACK_PTR;
        } else if (op == 'C') {
            char x;
            char y;
            if (scanf(" %c %c", &x, &y) != 2) {
                return 0;
            }
            ptr[ptr_index(x)] = ptr[ptr_index(y)];
        } else if (op == 'F') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int i = ptr_index(x);
            if (ptr[i] == STACK_PTR) {
                ub = k;
                kind = "invalid-free";
            } else if (ptr[i] != NULL_PTR) {
                if (!alive[ptr[i]]) {
                    ub = k;
                    kind = "double-free";
                } else {
                    alive[ptr[i]] = 0;
                }
            }
        } else if (op == 'R' || op == 'W') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int i = ptr_index(x);
            if (ptr[i] == NULL_PTR) {   /* 错：漏掉了 !alive[ptr[i]] */
                ub = k;
                kind = "null-deref";
            }
        }
    }

    if (ub > 0) {
        printf("UB %d %s\n", ub, kind);
        return 0;
    }
    int leak = 0;
    for (int b = 1; b <= next_block; b++) {
        if (alive[b]) {
            leak++;
        }
    }
    printf("OK leak=%d\n", leak);
    return 0;
}
```

### 忘记数泄漏，`OK leak=` 永远输出 0 [WA]
结束时还有块存活是本题的另一半答案。如果漏掉最后的计数循环、或者把 `alive` 在下标 1 处开始却写成 `for (int b = 0; ...)`，泄漏数就会少算或多算。示例 2 专门用来抓这个问题。

```c file=main.c expect=WA
#include <stdio.h>

#define MAX_OPS 205
#define NULL_PTR 0
#define STACK_PTR (-1)

static int ptr_index(char c) {
    if (c == 'p') {
        return 0;
    }
    if (c == 'q') {
        return 1;
    }
    return -1;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 200) {
        return 0;
    }

    int alive[MAX_OPS] = {0};
    int ptr[2] = { NULL_PTR, NULL_PTR };
    int next_block = 0;
    int ub = 0;
    const char *kind = "";

    for (int k = 1; k <= n && ub == 0; k++) {
        char op;
        if (scanf(" %c", &op) != 1) {
            return 0;
        }
        if (op == 'M') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            next_block++;
            alive[next_block] = 1;
            ptr[ptr_index(x)] = next_block;
        } else if (op == 'L') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            ptr[ptr_index(x)] = NULL_PTR;
        } else if (op == 'S') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            ptr[ptr_index(x)] = STACK_PTR;
        } else if (op == 'C') {
            char x;
            char y;
            if (scanf(" %c %c", &x, &y) != 2) {
                return 0;
            }
            ptr[ptr_index(x)] = ptr[ptr_index(y)];
        } else if (op == 'F') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int i = ptr_index(x);
            if (ptr[i] == STACK_PTR) {
                ub = k;
                kind = "invalid-free";
            } else if (ptr[i] != NULL_PTR) {
                if (!alive[ptr[i]]) {
                    ub = k;
                    kind = "double-free";
                } else {
                    alive[ptr[i]] = 0;
                }
            }
        } else if (op == 'R' || op == 'W') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int i = ptr_index(x);
            if (ptr[i] == NULL_PTR) {
                ub = k;
                kind = "null-deref";
            } else if (ptr[i] != STACK_PTR && !alive[ptr[i]]) {
                ub = k;
                kind = "use-after-free";
            }
        }
    }

    if (ub > 0) {
        printf("UB %d %s\n", ub, kind);
        return 0;
    }
    printf("OK leak=0\n");             /* 错：没有统计 alive，永远报 0 */
    return 0;
}
```

### 把 `S` 当成 `L`，栈指针和 NULL 混为一谈 [WA]
`S x` 让 `x` 指向栈上的 `local`，它不是 NULL：`R`/`W` 合法，`F` 是 `invalid-free`。如果代码里用同一个 0 表示两者，`F q` 会被当成 `free(NULL)` 放过，后面的 `F p` 再触发 `double-free`——报出来的步号和类型全错。

```c file=main.c expect=WA
#include <stdio.h>

#define MAX_OPS 205
#define NULL_PTR 0
#define STACK_PTR (-1)

static int ptr_index(char c) {
    if (c == 'p') {
        return 0;
    }
    if (c == 'q') {
        return 1;
    }
    return -1;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 200) {
        return 0;
    }

    int alive[MAX_OPS] = {0};
    int ptr[2] = { NULL_PTR, NULL_PTR };
    int next_block = 0;
    int ub = 0;
    const char *kind = "";

    for (int k = 1; k <= n && ub == 0; k++) {
        char op;
        if (scanf(" %c", &op) != 1) {
            return 0;
        }
        if (op == 'M') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            next_block++;
            alive[next_block] = 1;
            ptr[ptr_index(x)] = next_block;
        } else if (op == 'L' || op == 'S') {   /* 错：S 不是 NULL */
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            ptr[ptr_index(x)] = NULL_PTR;
        } else if (op == 'C') {
            char x;
            char y;
            if (scanf(" %c %c", &x, &y) != 2) {
                return 0;
            }
            ptr[ptr_index(x)] = ptr[ptr_index(y)];
        } else if (op == 'F') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int i = ptr_index(x);
            if (ptr[i] == STACK_PTR) {
                ub = k;
                kind = "invalid-free";
            } else if (ptr[i] != NULL_PTR) {
                if (!alive[ptr[i]]) {
                    ub = k;
                    kind = "double-free";
                } else {
                    alive[ptr[i]] = 0;
                }
            }
        } else if (op == 'R' || op == 'W') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int i = ptr_index(x);
            if (ptr[i] == NULL_PTR) {
                ub = k;
                kind = "null-deref";
            } else if (ptr[i] != STACK_PTR && !alive[ptr[i]]) {
                ub = k;
                kind = "use-after-free";
            }
        }
    }

    if (ub > 0) {
        printf("UB %d %s\n", ub, kind);
        return 0;
    }
    int leak = 0;
    for (int b = 1; b <= next_block; b++) {
        if (alive[b]) {
            leak++;
        }
    }
    printf("OK leak=%d\n", leak);
    return 0;
}
```

### 只报告步号，不报告 UB 类型 [WA]
题目要求 `UB <k> <类型>` 三段。只输出 `UB 3` 会和标准答案逐字不匹配。**四种类型必须背下来**：`double-free`、`use-after-free`、`null-deref`、`invalid-free`。

## 测试用例
### 01 sample 示例 1
```in
5
M p
S q
F q
F p
F p
```
```out
UB 3 invalid-free
```

### 02 sample 示例 2
```in
4
M p
M q
F q
L p
```
```out
OK leak=1
```

### 03 degenerate 一条 free(NULL)
```in
1
F p
```
```out
OK leak=0
```

### 04 trap 别名重复释放
```in
4
M p
C q p
F q
F p
```
```out
UB 4 double-free
```

### 05 trap 释放后使用
```in
4
M p
F p
C q p
R q
```
```out
UB 4 use-after-free
```

### 06 trap 空指针解引用
```in
3
M p
L p
R p
```
```out
UB 3 null-deref
```

### 07 trap 栈指针读写是合法的
```in
3
S p
W p
R p
```
```out
OK leak=0
```

### 08 trap 释放栈指针
```in
3
M p
S q
F q
```
```out
UB 3 invalid-free
```

### 09 trap 多次覆盖指针，留下两块泄漏
```in
6
M p
M p
M p
C q p
F q
L p
```
```out
OK leak=2
```

### 10 normal 分配、别名、置空、释放的组合
```in
10
M p
M q
F q
C q p
L q
M q
F p
F q
L p
L q
```
```out
OK leak=0
```

### 生成 boundary 200 步全部合法
```js gen
const cases = [];

const NAMES = ['p', 'q'];

function simulate(lines) {
  const alive = [false];
  const ptr = { p: 0, q: 0 };   /* 0 = NULL，-1 = 栈，>0 = 块号 */
  let next = 0;
  let ub = 0;
  let kind = '';

  for (let k = 0; k < lines.length && ub === 0; k++) {
    const parts = lines[k].split(' ');
    const op = parts[0];
    const x = parts[1];
    if (op === 'M') {
      next++;
      alive[next] = true;
      ptr[x] = next;
    } else if (op === 'L') {
      ptr[x] = 0;
    } else if (op === 'S') {
      ptr[x] = -1;
    } else if (op === 'C') {
      ptr[x] = ptr[parts[2]];
    } else if (op === 'F') {
      const b = ptr[x];
      if (b === -1) {
        ub = k + 1;
        kind = 'invalid-free';
      } else if (b > 0) {
        if (!alive[b]) {
          ub = k + 1;
          kind = 'double-free';
        } else {
          alive[b] = false;
        }
      }
    } else if (op === 'R' || op === 'W') {
      const b = ptr[x];
      if (b === 0) {
        ub = k + 1;
        kind = 'null-deref';
      } else if (b > 0 && !alive[b]) {
        ub = k + 1;
        kind = 'use-after-free';
      }
    }
  }

  if (ub > 0) return `UB ${ub} ${kind}\n`;
  let leak = 0;
  for (let b = 1; b <= next; b++) if (alive[b]) leak++;
  return `OK leak=${leak}\n`;
}

/* 边界：200 步全部合法——49 轮"分配两块再释放"（196 步）+ 4 步收尾 */
{
  const lines = [];
  for (let i = 0; i < 49; i++) {
    lines.push('M p', 'M q', 'F p', 'F q');
  }
  lines.push('M p', 'M q', 'F q', 'L p');
  cases.push({
    kind: 'boundary',
    category: '200 步全部合法，结束时泄漏 1 块',
    input: `${lines.length}\n${lines.join('\n')}\n`,
    output: simulate(lines),
  });
}

/* 压力：200 步随机的 M/L/S/C/F/R/W */
{
  const lines = [];
  for (let i = 0; i < 200; i++) {
    const r = rng.int(0, 13);
    const x = rng.pick(NAMES);
    if (r <= 4) lines.push(`M ${x}`);
    else if (r === 5) lines.push(`L ${x}`);
    else if (r === 6) lines.push(`S ${x}`);
    else if (r === 7) lines.push(`C ${x} ${rng.pick(NAMES)}`);
    else if (r <= 9) lines.push(`F ${x}`);
    else if (r <= 11) lines.push(`R ${x}`);
    else lines.push(`W ${x}`);
  }
  cases.push({
    kind: 'stress',
    category: '200 步随机的 M/L/S/C/F/R/W',
    input: `${lines.length}\n${lines.join('\n')}\n`,
    output: simulate(lines),
  });
}

return cases;
```
