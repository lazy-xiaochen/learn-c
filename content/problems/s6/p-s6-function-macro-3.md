---json
{
  "id": "p-s6-function-macro-3",
  "title": "宏展开 UB 判定器：副作用无序、有符号溢出、移位越界与除零",
  "difficulty": "L4",
  "knowledgePoints": ["s6-function-macro"],
  "special": "ub-analysis",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
代码审查工具里有一项"宏安全"检查：**宏展开之后，这段代码在 C 语言层面是不是未定义行为（UB）？** 本题要求你实现这个判定器。

工程里固定使用下面五个宏（本题只考这五个）：

```c
#define SQR(x)    ((x) * (x))
#define SCALE(x)  ((x) * 1000)
#define SHL(x, n) ((x) << (n))
#define DIV(a, b) ((a) / (b))
#define MAX(a, b) ((a) > (b) ? (a) : (b))
```

每条查询是一次宏调用，实参只可能是下面几种：

| 实参 | 含义 | 副作用 |
|---|---|---|
| 十进制整数（可带负号） | 字面量，范围 `-2147483648…2147483647` | 无 |
| `i` | 读变量 `i` | 无 |
| `i++` | 后置自增：先取值，再让 `i` 加 1 | 写 1 次 |
| `++i` | 前置自增：先让 `i` 加 1，值是新值 | 写 1 次 |

`i` 的初值由输入给出，**每条查询都从这个初值重新开始**（查询之间互不影响）。

### 判定顺序（严格按这个顺序，先命中的先报）
**第一步：无序访问（unsequenced）**

把宏体里每个参数出现的位置叫一个"副本"。副本之间的先后关系是：

- `SQR`：`x` 出现 2 次，两个副本 `x1`、`x2` **无序**（`*` 的两个操作数没有顺序）；
- `SCALE`：`x` 只出现 1 次，不存在这个问题；
- `SHL`、`DIV`：两个实参各有 1 个副本，`x1`（或 `a1`）与 `n1`（或 `b1`）**无序**；
- `MAX`：`a1` 与 `b1` **无序**；但 `a1` 先于 `a2`、`b1` 先于 `b2`（三元运算符先算条件再算分支），且 `a2` 与 `b2` **互斥**（只会执行一个）。

若一对**无序**的副本访问同一个变量、且其中至少一次是写，就是 UB，记作 `UB unsequenced`。

注意 `MAX` 的特殊之处：`MAX(i++, 5)` **不是** UB（两个 `i++` 分处条件和选中的分支，有先后顺序，只是副作用发生了两次）；`MAX(i++, i)` 才是 UB（`a1` 写 `i`、`b1` 读 `i`，两者无序）。

**第二步：算术未定义行为**

没有无序问题时，按宏体里运算的从左到右顺序模拟求值，遇到第一个算术 UB 就报出来：

| 宏 | UB 条件 | 记作 |
|---|---|---|
| `SQR` | `x * x` 超出 `int` 范围 | `UB overflow` |
| `SCALE` | `x * 1000` 超出 `int` 范围 | `UB overflow` |
| `SHL` | 位数 `n` 不在 `0…31`、或 `x` 为负、或 `x << n` 超出 `int` 范围 | `UB shift` |
| `DIV` | `b == 0` | `UB divzero` |
| `DIV` | `a == -2147483648` 且 `b == -1`（结果 2147483648 装不进 `int`） | `UB overflow` |
| `MAX` | 只做比较和取值，不会产生算术 UB | — |

`int` 的范围是 `-2147483648 … 2147483647`。除法是 C 的整除（**向零取整**，例如 `-9 / 2 == -4`、`7 / -2 == -3`）。

**第三步：都没有 → 输出结果**

如果两步都没有命中，输出 `OK <值>`。

### 输出
每条查询输出一行：`OK <值>` 或 `UB <原因>`，其中 `<原因>` 只能是 `unsequenced`、`overflow`、`shift`、`divzero` 之一。所有查询输出完之后，再输出一行"**第一处 UB 的位置**"：

- 有 UB：`first-ub=<第一条 UB 查询的序号>`（从 1 开始）；
- 没有 UB：`first-ub=none`。

## 输入格式
第一行一个整数 `i0`：变量 `i` 的初值。
第二行一个整数 `n`：查询条数。
接下来 `n` 行，每行一次宏调用：`宏名 实参1 [实参2]`，各部分之间恰好一个空格。`SQR`、`SCALE` 带 1 个实参，`SHL`、`DIV`、`MAX` 带 2 个。输入保证合法。

## 输出格式
`n` 行判定结果，最后一行 `first-ub=...`。

## 数据范围
- `0 ≤ i0 ≤ 1000000`；
- `1 ≤ n ≤ 100`；
- 整数字面量在 `-2147483648 … 2147483647` 之间；
- 每条查询里 `i` 最多被加 2，不会溢出 `int`。

## 示例
### 示例 1
```in
3
10
SQR i
SQR 100000
MAX i++ 5
MAX i++ i
SHL 1 32
SHL 1 30
DIV 7 0
DIV -9 2
SCALE 2147483
SCALE 2147484
```
```out
OK 9
UB overflow
OK 5
UB unsequenced
UB shift
OK 1073741824
UB divzero
OK -4
OK 2147483000
UB overflow
first-ub=2
```
> 第 1 条：`3 × 3 = 9`。第 2 条：`100000 × 100000 = 10¹⁰` 超出 `int`，是 `overflow`——注意它没有副作用，纯粹是算术 UB。第 3 条：`MAX(i++, 5)` 里 `i++` 出现两次，但两个副本有先后顺序（条件先于分支），所以**不是** UB，只是 `i` 被加了两次，`3 > 5` 不成立，值取自 `b`，是 5。第 4 条：`a1`（写 `i`）与 `b1`（读 `i`）无序 → `unsequenced`。第 5 条：`1 << 32` 位数越界。第 7 条：除以 0。第 9、10 条：`2147483 × 1000` 还在范围内，再多 1 就溢出。

### 示例 2（边界：`int` 的两端）
```in
0
3
SQR -1000
DIV -2147483648 -1
SHL 1073741824 1
```
```out
OK 1000000
UB overflow
UB shift
first-ub=2
```
> `SQR(-1000)` 是 `10⁶`，安全。`-2147483648 / -1` 的结果是 `2147483648`，比 `INT_MAX` 大 1，属于**溢出**而不是"正数"。`1073741824` 是 `2³⁰`，左移 1 位得到 `2³¹`，同样装不进 `int`，属于**移位** UB。

## 提示
### 第 1 层
先把每条查询拆成"宏名 + 实参"，并为每个实参记下两件事：**它访问哪个变量**（只有 `i` 一个）、**有没有副作用**（`i++`、`++i` 有）。字面量既没有变量也没有副作用。

### 第 2 层
判定顺序不能颠倒：

1. **先判无序**：`SQR` 是同一个实参的两个副本无序；`SHL`/`DIV`/`MAX` 是"两个实参各自的第一个副本之间无序"（`MAX` 的 `a1↔a2`、`b1↔b2` 是有序的，`a2`/`b2` 互斥）。判据只有一条：两边访问同一个变量、且至少一边有副作用。
2. **再判算术**：按宏体的运算顺序算，`SQR`/`SCALE` 看乘法是否超出 `int`；`SHL` 看位数、左操作数的符号、以及结果是否超出 `int`；`DIV` 先看除数是否为 0，再看 `INT_MIN / -1`。

顺序很重要：`SQR i++`（`i` 很大时）同时"无序"和"会溢出"，正确答案是 `unsequenced`。

### 第 3 层
用 `long long` 做中间计算来**判断有没有溢出**，但语义要按 `int` 来：`long long p = (long long)v * v;` 然后和 `INT_MAX` 比较——不要因为用了 `long long` 就认为"不会溢出"，那是把宏的语义换掉了。

几个具体边界：

- `SQR`：`46340² = 2147395600` 安全，`46341² = 2147488281` 溢出；
- `SCALE`：`2147483 × 1000 = 2147483000` 安全，`2147484 × 1000` 溢出；负数方向同理；
- `SHL`：位数必须满足 `0 ≤ n ≤ 31`，左操作数必须非负，且 `x << n ≤ INT_MAX`；
- `DIV`：除数为 0 是 `divzero`；`-2147483648 / -1` 是 `overflow`；其余按向零取整算。

最后别忘了统计 `first-ub`（第一条 UB 的序号，没有就输出 `none`）。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <limits.h>

#define MAX_Q 100

/* 实参：字面量 / 读 i / 后置自增 / 前置自增 */
typedef struct {
    int kind;       /* 0 = 字面量，1 = 读 i，2 = i++，3 = ++i */
    long long lit;
} Arg;

static int i_value; /* 模拟用的变量 i */

static Arg parse_arg(const char *s) {
    Arg a;
    a.kind = 0;
    a.lit = 0;
    if (strcmp(s, "i") == 0) {
        a.kind = 1;
    } else if (strcmp(s, "i++") == 0) {
        a.kind = 2;
    } else if (strcmp(s, "++i") == 0) {
        a.kind = 3;
    } else {
        a.lit = strtoll(s, NULL, 10);
    }
    return a;
}

static int has_side_effect(Arg a) {
    return a.kind == 2 || a.kind == 3;
}

/* 求值一次，并把副作用写回 i_value */
static long long eval(Arg a) {
    switch (a.kind) {
        case 1:
            return i_value;
        case 2: {
            long long v = i_value;
            i_value += 1;
            return v;
        }
        case 3:
            i_value += 1;
            return i_value;
        default:
            return a.lit;
    }
}

/* 两个实参都访问 i，且至少一个有副作用 → 这一对无序副本冲突 */
static int conflict(Arg a, Arg b) {
    return a.kind != 0 && b.kind != 0 && (has_side_effect(a) || has_side_effect(b));
}

int main(void) {
    int i0;
    int n;
    if (scanf("%d", &i0) != 1 || i0 < 0 || i0 > 1000000) {
        return 0;
    }
    if (scanf("%d", &n) != 1 || n < 1 || n > MAX_Q) {
        return 0;
    }

    int first_ub = 0;
    for (int k = 1; k <= n; k++) {
        char mac[16];
        char t1[16];
        char t2[16];
        if (scanf("%15s %15s", mac, t1) != 2) {
            return 0;
        }
        int two = (strcmp(mac, "SHL") == 0) || (strcmp(mac, "DIV") == 0) || (strcmp(mac, "MAX") == 0);
        if (two && scanf("%15s", t2) != 1) {
            return 0;
        }

        Arg a = parse_arg(t1);
        Arg b;
        b.kind = 0;
        b.lit = 0;
        if (two) {
            b = parse_arg(t2);
        }
        i_value = i0;                       /* 每条查询都从初值开始 */

        const char *ub = NULL;
        long long value = 0;

        if (strcmp(mac, "SQR") == 0) {
            if (has_side_effect(a)) {       /* x1 与 x2 无序，同一个实参 */
                ub = "unsequenced";
            } else {
                long long v = eval(a);
                long long p = v * v;
                if (p > INT_MAX) {
                    ub = "overflow";
                } else {
                    value = p;
                }
            }
        } else if (strcmp(mac, "SCALE") == 0) {
            long long p = eval(a) * 1000;
            if (p < INT_MIN || p > INT_MAX) {
                ub = "overflow";
            } else {
                value = p;
            }
        } else if (strcmp(mac, "SHL") == 0) {
            if (conflict(a, b)) {
                ub = "unsequenced";
            } else {
                long long x = eval(a);
                long long s = eval(b);
                if (s < 0 || s > 31 || x < 0 || (x << s) > INT_MAX) {
                    ub = "shift";
                } else {
                    value = x << s;
                }
            }
        } else if (strcmp(mac, "DIV") == 0) {
            if (conflict(a, b)) {
                ub = "unsequenced";
            } else {
                long long x = eval(a);
                long long y = eval(b);
                if (y == 0) {
                    ub = "divzero";
                } else if (x == INT_MIN && y == -1) {
                    ub = "overflow";
                } else {
                    value = x / y;          /* C 的整除：向零取整 */
                }
            }
        } else {                            /* MAX：a1→a2、b1→b2 有序，a2/b2 互斥 */
            if (conflict(a, b)) {
                ub = "unsequenced";
            } else {
                long long x = eval(a);      /* a1 */
                long long y = eval(b);      /* b1 */
                value = (x > y) ? eval(a) : eval(b);   /* 只求值被选中的分支 */
            }
        }

        if (ub != NULL) {
            printf("UB %s\n", ub);
            if (first_ub == 0) {
                first_ub = k;
            }
        } else {
            printf("OK %lld\n", value);
        }
    }

    if (first_ub == 0) {
        printf("first-ub=none\n");
    } else {
        printf("first-ub=%d\n", first_ub);
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <limits.h>

#define MAX_Q 100

typedef struct {
    int kind;
    long long lit;
} Arg;

static int i_value;

static Arg parse_arg(const char *s) {
    Arg a;
    a.kind = 0;
    a.lit = 0;
    if (strcmp(s, "i") == 0) {
        a.kind = 1;
    } else if (strcmp(s, "i++") == 0) {
        a.kind = 2;
    } else if (strcmp(s, "++i") == 0) {
        a.kind = 3;
    } else {
        a.lit = strtoll(s, NULL, 10);
    }
    return a;
}

static int has_side_effect(Arg a) {
    return a.kind == 2 || a.kind == 3;
}

static long long eval(Arg a) {
    switch (a.kind) {
        case 1:
            return i_value;
        case 2: {
            long long v = i_value;
            i_value += 1;
            return v;
        }
        case 3:
            i_value += 1;
            return i_value;
        default:
            return a.lit;
    }
}

static int conflict(Arg a, Arg b) {
    return a.kind != 0 && b.kind != 0 && (has_side_effect(a) || has_side_effect(b));
}

int main(void) {
    int i0;
    int n;
    if (scanf("%d", &i0) != 1 || i0 < 0 || i0 > 1000000) {
        return 0;
    }
    if (scanf("%d", &n) != 1 || n < 1 || n > MAX_Q) {
        return 0;
    }

    int first_ub = 0;
    for (int k = 1; k <= n; k++) {
        char mac[16];
        char t1[16];
        char t2[16];
        if (scanf("%15s %15s", mac, t1) != 2) {
            return 0;
        }
        int two = (strcmp(mac, "SHL") == 0) || (strcmp(mac, "DIV") == 0) || (strcmp(mac, "MAX") == 0);
        if (two && scanf("%15s", t2) != 1) {
            return 0;
        }

        Arg a = parse_arg(t1);
        Arg b;
        b.kind = 0;
        b.lit = 0;
        if (two) {
            b = parse_arg(t2);
        }
        i_value = i0;

        const char *ub = NULL;
        long long value = 0;

        /* TODO：这里只判了"无序副作用"。算术相关的 UB —— 有符号溢出、
           移位位数越界 / 左移负数 / 移位结果溢出、除以 0、INT_MIN / -1 ——
           一个都没判，直接算完就当 OK 输出。 */
        if (strcmp(mac, "SQR") == 0) {
            if (has_side_effect(a)) {
                ub = "unsequenced";
            } else {
                long long v = eval(a);
                value = v * v;
            }
        } else if (strcmp(mac, "SCALE") == 0) {
            value = eval(a) * 1000;
        } else if (strcmp(mac, "SHL") == 0) {
            if (conflict(a, b)) {
                ub = "unsequenced";
            } else {
                long long x = eval(a);
                long long s = eval(b);
                /* 只是挡一下，避免分析器自己算 UB；真正的判定还没写 */
                value = (x >= 0 && s >= 0 && s <= 31) ? (x << s) : 0;
            }
        } else if (strcmp(mac, "DIV") == 0) {
            if (conflict(a, b)) {
                ub = "unsequenced";
            } else {
                long long x = eval(a);
                long long y = eval(b);
                value = (y != 0) ? (x / y) : 0;
            }
        } else {
            if (conflict(a, b)) {
                ub = "unsequenced";
            } else {
                long long x = eval(a);
                long long y = eval(b);
                value = (x > y) ? eval(a) : eval(b);
            }
        }

        if (ub != NULL) {
            printf("UB %s\n", ub);
            if (first_ub == 0) {
                first_ub = k;
            }
        } else {
            printf("OK %lld\n", value);
        }
    }

    if (first_ub == 0) {
        printf("first-ub=none\n");
    } else {
        printf("first-ub=%d\n", first_ub);
    }
    return 0;
}
```

## 复杂度
时间 O(n)：每条查询常数次判断和求值。
空间 O(1)：只有几个局部变量和一个模拟变量。

本题的难点在设计而不在性能：**UB 的类别是有优先级的**。`SQR i++`（`i` 很大时）既"无序"又"会溢出"，只有先判无序才能和标准一致；`MAX i++ 5` 看起来"副作用被求值两次"，但两个副本有序，所以它是合法的——这两点合起来说明：**"有副作用"和"有 UB"是两件不同的事**。

## 常见错误
### 只判无序，不判算术 UB [WA]
这是起始代码的状态：`UB unsequenced` 判得对，可 `SQR 100000`、`SHL 1 32`、`DIV 7 0` 全被当成正常值输出。示例 1 的第 2 条就会失败。宏展开里的算术 UB 和普通代码里的一样危险，而且因为"宏看起来只是一个常量"更容易被忽略。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <limits.h>

typedef struct {
    int kind;
    long long lit;
} Arg;

static int i_value;

static Arg parse_arg(const char *s) {
    Arg a;
    a.kind = 0;
    a.lit = 0;
    if (strcmp(s, "i") == 0) {
        a.kind = 1;
    } else if (strcmp(s, "i++") == 0) {
        a.kind = 2;
    } else if (strcmp(s, "++i") == 0) {
        a.kind = 3;
    } else {
        a.lit = strtoll(s, NULL, 10);
    }
    return a;
}

static int has_side_effect(Arg a) {
    return a.kind == 2 || a.kind == 3;
}

static long long eval(Arg a) {
    switch (a.kind) {
        case 1:
            return i_value;
        case 2: {
            long long v = i_value;
            i_value += 1;
            return v;
        }
        case 3:
            i_value += 1;
            return i_value;
        default:
            return a.lit;
    }
}

static int conflict(Arg a, Arg b) {
    return a.kind != 0 && b.kind != 0 && (has_side_effect(a) || has_side_effect(b));
}

int main(void) {
    int i0;
    int n;
    if (scanf("%d", &i0) != 1 || i0 < 0 || i0 > 1000000) {
        return 0;
    }
    if (scanf("%d", &n) != 1 || n < 1) {
        return 0;
    }
    int first_ub = 0;
    for (int k = 1; k <= n; k++) {
        char mac[16];
        char t1[16];
        char t2[16];
        if (scanf("%15s %15s", mac, t1) != 2) {
            return 0;
        }
        int two = (strcmp(mac, "SHL") == 0) || (strcmp(mac, "DIV") == 0) || (strcmp(mac, "MAX") == 0);
        if (two && scanf("%15s", t2) != 1) {
            return 0;
        }
        Arg a = parse_arg(t1);
        Arg b;
        b.kind = 0;
        b.lit = 0;
        if (two) {
            b = parse_arg(t2);
        }
        i_value = i0;

        const char *ub = NULL;
        long long value = 0;
        if (strcmp(mac, "SQR") == 0) {
            if (has_side_effect(a)) {
                ub = "unsequenced";
            } else {
                long long v = eval(a);
                value = v * v;
            }
        } else if (strcmp(mac, "SCALE") == 0) {
            value = eval(a) * 1000;
        } else if (strcmp(mac, "SHL") == 0) {
            if (conflict(a, b)) {
                ub = "unsequenced";
            } else {
                long long x = eval(a);
                long long s = eval(b);
                value = (x >= 0 && s >= 0 && s <= 31) ? (x << s) : 0;
            }
        } else if (strcmp(mac, "DIV") == 0) {
            if (conflict(a, b)) {
                ub = "unsequenced";
            } else {
                long long x = eval(a);
                long long y = eval(b);
                value = (y != 0) ? (x / y) : 0;
            }
        } else {
            if (conflict(a, b)) {
                ub = "unsequenced";
            } else {
                long long x = eval(a);
                long long y = eval(b);
                value = (x > y) ? eval(a) : eval(b);
            }
        }
        if (ub != NULL) {
            printf("UB %s\n", ub);
            if (first_ub == 0) {
                first_ub = k;
            }
        } else {
            printf("OK %lld\n", value);
        }
    }
    if (first_ub == 0) {
        printf("first-ub=none\n");
    } else {
        printf("first-ub=%d\n", first_ub);
    }
    return 0;
}
```

### 用 long long 算一遍就认为"不会溢出" [WA]
把 `SQR`、`SCALE` 的结果算在 `long long` 里、不做范围检查——`SQR 100000` 会输出 `OK 10000000000`，而正确答案是 `UB overflow`。**宏体里的运算发生在 `int` 上**，分析时必须按 `int` 的语义判断，`long long` 只是你用来**检测**溢出的工具，不是宏的类型。移位和除零判对了也没用，示例 1 的第 2 条就已经错了。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <limits.h>

typedef struct {
    int kind;
    long long lit;
} Arg;

static int i_value;

static Arg parse_arg(const char *s) {
    Arg a;
    a.kind = 0;
    a.lit = 0;
    if (strcmp(s, "i") == 0) {
        a.kind = 1;
    } else if (strcmp(s, "i++") == 0) {
        a.kind = 2;
    } else if (strcmp(s, "++i") == 0) {
        a.kind = 3;
    } else {
        a.lit = strtoll(s, NULL, 10);
    }
    return a;
}

static int has_side_effect(Arg a) {
    return a.kind == 2 || a.kind == 3;
}

static long long eval(Arg a) {
    switch (a.kind) {
        case 1:
            return i_value;
        case 2: {
            long long v = i_value;
            i_value += 1;
            return v;
        }
        case 3:
            i_value += 1;
            return i_value;
        default:
            return a.lit;
    }
}

static int conflict(Arg a, Arg b) {
    return a.kind != 0 && b.kind != 0 && (has_side_effect(a) || has_side_effect(b));
}

int main(void) {
    int i0;
    int n;
    if (scanf("%d", &i0) != 1 || i0 < 0 || i0 > 1000000) {
        return 0;
    }
    if (scanf("%d", &n) != 1 || n < 1) {
        return 0;
    }
    int first_ub = 0;
    for (int k = 1; k <= n; k++) {
        char mac[16];
        char t1[16];
        char t2[16];
        if (scanf("%15s %15s", mac, t1) != 2) {
            return 0;
        }
        int two = (strcmp(mac, "SHL") == 0) || (strcmp(mac, "DIV") == 0) || (strcmp(mac, "MAX") == 0);
        if (two && scanf("%15s", t2) != 1) {
            return 0;
        }
        Arg a = parse_arg(t1);
        Arg b;
        b.kind = 0;
        b.lit = 0;
        if (two) {
            b = parse_arg(t2);
        }
        i_value = i0;

        const char *ub = NULL;
        long long value = 0;
        if (strcmp(mac, "SQR") == 0) {
            if (has_side_effect(a)) {
                ub = "unsequenced";
            } else {
                long long v = eval(a);
                value = v * v;                 /* 错：没有和 int 的范围比较 */
            }
        } else if (strcmp(mac, "SCALE") == 0) {
            value = eval(a) * 1000;            /* 错：同上 */
        } else if (strcmp(mac, "SHL") == 0) {
            if (conflict(a, b)) {
                ub = "unsequenced";
            } else {
                long long x = eval(a);
                long long s = eval(b);
                if (s < 0 || s > 31 || x < 0 || (x << s) > INT_MAX) {
                    ub = "shift";
                } else {
                    value = x << s;
                }
            }
        } else if (strcmp(mac, "DIV") == 0) {
            if (conflict(a, b)) {
                ub = "unsequenced";
            } else {
                long long x = eval(a);
                long long y = eval(b);
                if (y == 0) {
                    ub = "divzero";
                } else if (x == INT_MIN && y == -1) {
                    ub = "overflow";
                } else {
                    value = x / y;
                }
            }
        } else {
            if (conflict(a, b)) {
                ub = "unsequenced";
            } else {
                long long x = eval(a);
                long long y = eval(b);
                value = (x > y) ? eval(a) : eval(b);
            }
        }
        if (ub != NULL) {
            printf("UB %s\n", ub);
            if (first_ub == 0) {
                first_ub = k;
            }
        } else {
            printf("OK %lld\n", value);
        }
    }
    if (first_ub == 0) {
        printf("first-ub=none\n");
    } else {
        printf("first-ub=%d\n", first_ub);
    }
    return 0;
}
```

### 把字面量转成整数却没包含 `<stdlib.h>` [CE]
实参里的数字要用 `strtoll`（或 `atoi`）转成整数，它声明在 `<stdlib.h>` 里。漏掉这个头文件，C17 会直接报 `call to undeclared library function 'strtoll'`，并顺带提示应该包含哪个头文件——注意别指望 `<stdio.h>` 或 `<limits.h>` 能帮忙，它们不提供这个声明。

```c file=main.c expect=CE
#include <stdio.h>
#include <string.h>

int main(void) {
    long long v = strtoll("100000", NULL, 10);   /* 错：没有 #include <stdlib.h> */
    printf("%lld\n", v);
    return 0;
}
```

### 把判定顺序弄反：先算值、再判无序 [WA]
`SQR i++` 在 `i` 很大时既有"无序副作用"又会"溢出"。如果有副作用的分支没有先拦住、而是先算 `i * i` 再比较范围，就会报 `overflow`，而标准给的第一个问题是"未排序的副作用"。这类错误只在两个条件同时满足时暴露，示例 1 里刚好没有，隐藏用例里有。

## 测试用例
### 01 sample 示例 1
```in
3
10
SQR i
SQR 100000
MAX i++ 5
MAX i++ i
SHL 1 32
SHL 1 30
DIV 7 0
DIV -9 2
SCALE 2147483
SCALE 2147484
```
```out
OK 9
UB overflow
OK 5
UB unsequenced
UB shift
OK 1073741824
UB divzero
OK -4
OK 2147483000
UB overflow
first-ub=2
```

### 02 sample 示例 2
```in
0
3
SQR -1000
DIV -2147483648 -1
SHL 1073741824 1
```
```out
OK 1000000
UB overflow
UB shift
first-ub=2
```

### 03 degenerate 只有一条查询，且完全没有 UB
```in
0
1
SHL 0 31
```
```out
OK 0
first-ub=none
```
> `0 << 31` 是 0，位数也在范围内。`first-ub=none` 说明整段查询都没有 UB。

### 04 trap 无序优先于溢出
```in
100000
4
SQR i++
SHL i++ i
MAX i++ i
DIV i++ 0
```
```out
UB unsequenced
UB unsequenced
UB unsequenced
UB divzero
first-ub=1
```
> `i` 是 100000，`i * i = 10¹⁰` 一定会溢出，但 `SQR i++` 的两个副本无序，先命中的是 `unsequenced`。第 2、3 条都是"两个实参访问同一个 `i`、其中一个有副作用"。第 4 条只有一个实参碰 `i`，没有无序问题，接着除数 0 命中 `divzero`。

### 05 trap MAX 的两次求值是合法的
```in
2
4
MAX i++ 5
MAX 5 i++
MAX i++ i++
MAX i i
```
```out
OK 5
OK 5
UB unsequenced
OK 2
first-ub=3
```
> 前两条里 `i++` 出现了两次，但 `a1 → a2` 有顺序，所以合法（`i` 被加两次，值取自被选中的分支）。第 3 条两个实参都是 `i++`，`a1` 与 `b1` 无序且都写 `i` → UB。第 4 条只是两次读，值就是 2。

### 06 trap int 两端与除法方向
```in
46340
9
SQR 46340
SQR 46341
SHL 0 31
SHL 1 31
SCALE 2147483
SCALE 2147484
SCALE -2147484
DIV -2147483648 -1
DIV 7 -2
```
```out
OK 2147395600
UB overflow
OK 0
UB shift
OK 2147483000
UB overflow
UB overflow
UB overflow
OK -3
first-ub=2
```
> `46340² = 2147395600` 还在范围内，`46341² = 2147488281` 就超了。`SHL` 的 0 左移多少都是 0，但 `1 << 31` 是 `2³¹`，装不进 `int`。`SCALE` 的负数方向也会溢出到 `INT_MIN` 以下。`INT_MIN / -1` 的正结果装不下。最后的 `7 / -2` 按向零取整是 `-3`。

### 07 normal 常规查询，全部合法
```in
7
7
SQR i
SCALE i
SHL i 3
SHL i i
DIV i -2
MAX i 10
MAX 10 i
```
```out
OK 49
OK 7000
OK 56
OK 896
OK -3
OK 10
OK 10
first-ub=none
```
> `SHL i i` 是 `7 << 7 = 896`，两个实参都只读、同一个变量也没关系（不涉及写）。`MAX i 10` 与 `MAX 10 i` 都取 10。

### 生成 boundary 100 条查询（上限）
```js gen
/* 100 条查询 = 25 轮同样的四种调用，期望输出可以直接推出 */
const i0 = 10;
const cycle = [
  { q: 'SQR i', out: 'OK 100' },
  { q: 'MAX i++ 0', out: 'OK 11' },
  { q: 'SHL 3 2', out: 'OK 12' },
  { q: 'SQR i++', out: 'UB unsequenced' },
];
const lines = [];
const outs = [];
for (let k = 0; k < 100; k++) {
  const c = cycle[k % cycle.length];
  lines.push(c.q);
  outs.push(c.out);
}
return [{
  kind: 'boundary',
  category: '100 条查询（上限），每 4 条里有 1 条 UB',
  input: `${i0}\n100\n${lines.join('\n')}\n`,
  output: `${outs.join('\n')}\nfirst-ub=4\n`,
}];
```
