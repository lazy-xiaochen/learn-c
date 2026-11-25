---json
{
  "id": "p-s5-ub-sequence-1",
  "title": "求值顺序审计：报告第一条未定义行为语句",
  "difficulty": "L4",
  "knowledgePoints": ["s5-ub-sequence"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
教学平台想做一个"看 UB 怎么打断程序"的演示器：给它一段小程序的语句序列，它逐条执行，**遇到第一条含未排序访问的语句就停下**并报告行号，否则报告最终的变量值。这种"执行到第一条错误为止"的行为，和本平台判题器打开 `-fno-sanitize-recover=all` 之后的表现是一致的。

语句只有 11 种，全部作用在一个整数 `i` 上（`i` 的初值是 0）。下表的"是否 UB"一列就是本题的判据：

| 语句 | 对应的 C 写法 | 是否 UB |
|---|---|---|
| `set v` | `i = v;` | 否 |
| `add v` | `i += v;` | 否 |
| `inc` | `i++;` | 否 |
| `dec` | `i--;` | 否 |
| `selfpost` | `i = i++;` | **是**（两次未排序的写） |
| `selfpre` | `i = ++i;` | **是**（同上） |
| `idxpost` | `a[i] = i++;` | **是**（读 `i` 算下标与写 `i` 未排序） |
| `argpost` | `f(i++, i++);` | **是**（两个实参之间没有顺序） |
| `comma` | `i = (i++, i++);` | 否（逗号运算符是排序点） |
| `seqinc` | `(i++, i++);` | 否（同上） |
| `andseq` | `if (i++ && i++);` | 否（`&&` 是排序点，且会短路） |

三条合法但"绕"的语句要格外小心：

- `comma`：`i = (i++, i++);`。第一个 `i++` 让 `i` 变成 `v+1`，第二个 `i++` 的值是 `v+1`，赋值把 `v+1` 写回去，所以**净效果是 `i` 加 1**；
- `seqinc`：`(i++, i++);` 没有赋值，两次自增都留下来，净效果是 `i` 加 2；
- `andseq`：`if (i++ && i++);`。左边先求值，把 `i` 加 1；**只有当左边的值非 0 时**右边才求值。所以 `i` 为 0 时净效果是加 1，否则加 2。

## 输入格式
第一行一个整数 `k`：语句条数。

接下来 `k` 行，每行一条语句。`set` 和 `add` 后面跟一个整数 `v`（可以带负号），其余语句单独占一行，前后没有多余空格。

## 输出格式
只输出一行：

- 如果第 `k` 条语句（从 1 开始编号）第一次出现未定义行为：`UB <k>`；
- 如果 `k` 条语句全部走完：`OK <i>`，其中 `i` 是最终的变量值。

一旦报告 `UB`，后面的语句不再执行。

## 数据范围
- `1 ≤ k ≤ 100`；
- `set` / `add` 的 `v` 满足 `|v| ≤ 1000`；
- 全程 `|i| ≤ 200000`，`int` 装得下，不会出现整数溢出；
- 输入保证语句名拼写正确、`set`/`add` 后面一定有整数。

## 示例
### 示例 1
```in
6
set 2
inc
andseq
dec
seqinc
add -5
```
```out
OK 1
```
> 逐步走一遍：`set 2` 之后 `i = 2`；`inc` 之后 3；`andseq` 时 `i` 是 3（非 0），左边 `i++` 让 `i` 变 4，右边 `i++` 再让 `i` 变 5，最后 5；`dec` 之后 4；`seqinc` 是两条自增，`i` 变 6；`add -5` 之后 1。

### 示例 2（边界：第一条语句就是 UB）
```in
1
selfpost
```
```out
UB 1
```
> `i = i++;` 里 `i++` 的副作用（写 `i+1`）和赋值的副作用（写回旧值）之间没有顺序，两次写同一个对象，属于未定义行为。它出现在第 1 条语句，所以立刻输出 `UB 1`，后面没有语句需要执行。

## 提示
### 第 1 层
先分清两类语句：**只改变 `i` 的值**的（`set`/`add`/`inc`/`dec`/`comma`/`seqinc`/`andseq`）和**本身就是 UB**的（`selfpost`/`selfpre`/`idxpost`/`argpost`）。后者只要读到，就立刻输出 `UB 行号` 并用 `return 0` 结束程序。

### 第 2 层
`andseq` 不能简单地写成 `i += 2`。它等价于"先取出旧值、把 `i` 加 1，再判断旧值是不是 0"：旧值为 0 时只加 1，否则再加 1。用临时变量存旧值是关键：

```c
int old = i;
i = old + 1;
if (old != 0) {
    i = i + 1;
}
```

### 第 3 层
语句名要逐字比较，不能只看首字母——`set` 和 `seqinc` 都以 `s` 开头，`inc` 和 `idxpost` 都以 `i` 开头。用 `strcmp` 一条条比，或者先比长度再比内容。行号就是循环变量，从 1 开始数，不要用数组下标。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

int main(void) {
    int k;
    if (scanf("%d", &k) != 1 || k < 1 || k > 100) {
        return 0;
    }
    int i = 0;
    for (int line = 1; line <= k; line++) {
        char op[16];
        if (scanf("%15s", op) != 1) {
            return 0;
        }
        if (strcmp(op, "set") == 0 || strcmp(op, "add") == 0) {
            int v;
            if (scanf("%d", &v) != 1) {
                return 0;
            }
            if (op[0] == 's') {
                i = v;
            } else {
                i += v;
            }
        } else if (strcmp(op, "inc") == 0) {
            i++;
        } else if (strcmp(op, "dec") == 0) {
            i--;
        } else if (strcmp(op, "comma") == 0) {
            i = i + 1;                    /* i = (i++, i++)：净效果加 1 */
        } else if (strcmp(op, "seqinc") == 0) {
            i = i + 2;                    /* (i++, i++)：两条自增都留下 */
        } else if (strcmp(op, "andseq") == 0) {
            int old = i;
            i = old + 1;                  /* 左边一定求值 */
            if (old != 0) {
                i = i + 1;                /* 只有左边非 0 才求值右边 */
            }
        } else if (strcmp(op, "selfpost") == 0 || strcmp(op, "selfpre") == 0 ||
                   strcmp(op, "idxpost") == 0 || strcmp(op, "argpost") == 0) {
            printf("UB %d\n", line);
            return 0;
        }
    }
    printf("OK %d\n", i);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

int main(void) {
    int k;
    if (scanf("%d", &k) != 1 || k < 1 || k > 100) {
        return 0;
    }
    int i = 0;
    for (int line = 1; line <= k; line++) {
        char op[16];
        if (scanf("%15s", op) != 1) {
            return 0;
        }
        if (strcmp(op, "set") == 0) {
            int v;
            if (scanf("%d", &v) != 1) {
                return 0;
            }
            i = v;
        } else if (strcmp(op, "add") == 0) {
            int v;
            if (scanf("%d", &v) != 1) {
                return 0;
            }
            i += v;
        } else if (strcmp(op, "inc") == 0) {
            i++;
        } else if (strcmp(op, "dec") == 0) {
            i--;
        } else if (strcmp(op, "comma") == 0) {
            i = i + 1;
        } else if (strcmp(op, "seqinc") == 0) {
            i = i + 2;
        } else if (strcmp(op, "andseq") == 0) {
            i = i + 2;                    /* TODO: i 为 0 时右边不求值，只能加 1 */
        }
        /* TODO: selfpost / selfpre / idxpost / argpost 是未定义行为，
         *       要输出 "UB <行号>" 并立刻结束程序。 */
    }
    printf("OK %d\n", i);
    return 0;
}
```

## 复杂度
时间 O(k)：每条语句常数次比较与一次算术。
空间 O(1)：只有一个计数器和几个临时变量。

## 常见错误
### 把 UB 语句当成"什么都不做" [WA]
最有诱惑力的偷懒写法是"反正 `i = i++;` 的结果不确定，干脆跳过"。这样程序永远不会输出 `UB`，所有含 UB 语句的用例都会错。**未定义行为不是一个值，而是一个必须报告的事件**——本题的全部意义就是让它在第一条出现的位置停下来。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    int k;
    if (scanf("%d", &k) != 1 || k < 1 || k > 100) {
        return 0;
    }
    int i = 0;
    for (int line = 1; line <= k; line++) {
        char op[16];
        if (scanf("%15s", op) != 1) {
            return 0;
        }
        if (strcmp(op, "set") == 0) {
            int v;
            if (scanf("%d", &v) != 1) {
                return 0;
            }
            i = v;
        } else if (strcmp(op, "add") == 0) {
            int v;
            if (scanf("%d", &v) != 1) {
                return 0;
            }
            i += v;
        } else if (strcmp(op, "inc") == 0) {
            i++;
        } else if (strcmp(op, "dec") == 0) {
            i--;
        } else if (strcmp(op, "comma") == 0) {
            i = i + 1;
        } else if (strcmp(op, "seqinc") == 0) {
            i = i + 2;
        } else if (strcmp(op, "andseq") == 0) {
            int old = i;
            i = old + 1;
            if (old != 0) {
                i = i + 1;
            }
        }
        /* 错：selfpost 等四条语句被静默忽略，永远不会输出 UB */
    }
    printf("OK %d\n", i);
    return 0;
}
```

### 忘了 andseq 的短路，一律加 2 [WA]
`if (i++ && i++);` 里右边**可能根本不被求值**。`i` 为 0 时左边就是假，右边不执行，净效果只加 1。写成 `i += 2` 只在 `i` 非 0 时正确——示例 1 恰好 `i` 非 0，看不出问题，边界用例会立刻暴露。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    int k;
    if (scanf("%d", &k) != 1 || k < 1 || k > 100) {
        return 0;
    }
    int i = 0;
    for (int line = 1; line <= k; line++) {
        char op[16];
        if (scanf("%15s", op) != 1) {
            return 0;
        }
        if (strcmp(op, "set") == 0) {
            int v;
            if (scanf("%d", &v) != 1) {
                return 0;
            }
            i = v;
        } else if (strcmp(op, "add") == 0) {
            int v;
            if (scanf("%d", &v) != 1) {
                return 0;
            }
            i += v;
        } else if (strcmp(op, "inc") == 0) {
            i++;
        } else if (strcmp(op, "dec") == 0) {
            i--;
        } else if (strcmp(op, "comma") == 0) {
            i = i + 1;
        } else if (strcmp(op, "seqinc") == 0) {
            i = i + 2;
        } else if (strcmp(op, "andseq") == 0) {
            i = i + 2;                    /* 错：没有考虑短路 */
        } else if (strcmp(op, "selfpost") == 0 || strcmp(op, "selfpre") == 0 ||
                   strcmp(op, "idxpost") == 0 || strcmp(op, "argpost") == 0) {
            printf("UB %d\n", line);
            return 0;
        }
    }
    printf("OK %d\n", i);
    return 0;
}
```

### 把 comma 也写成加 2 [WA]
`i = (i++, i++);` 和 `(i++, i++);` 只差一个赋值号，结果却差 1：前者最后一次写入是赋值语句本身，写回去的是**第二个 `i++` 的值**（即 `v+1`）。把两条都当"加 2"，含 `comma` 的用例会多算 1。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    int k;
    if (scanf("%d", &k) != 1 || k < 1 || k > 100) {
        return 0;
    }
    int i = 0;
    for (int line = 1; line <= k; line++) {
        char op[16];
        if (scanf("%15s", op) != 1) {
            return 0;
        }
        if (strcmp(op, "set") == 0) {
            int v;
            if (scanf("%d", &v) != 1) {
                return 0;
            }
            i = v;
        } else if (strcmp(op, "add") == 0) {
            int v;
            if (scanf("%d", &v) != 1) {
                return 0;
            }
            i += v;
        } else if (strcmp(op, "inc") == 0) {
            i++;
        } else if (strcmp(op, "dec") == 0) {
            i--;
        } else if (strcmp(op, "comma") == 0) {
            i = i + 2;                    /* 错：赋值会把 i 写回 v+1，只加 1 */
        } else if (strcmp(op, "seqinc") == 0) {
            i = i + 2;
        } else if (strcmp(op, "andseq") == 0) {
            int old = i;
            i = old + 1;
            if (old != 0) {
                i = i + 1;
            }
        } else if (strcmp(op, "selfpost") == 0 || strcmp(op, "selfpre") == 0 ||
                   strcmp(op, "idxpost") == 0 || strcmp(op, "argpost") == 0) {
            printf("UB %d\n", line);
            return 0;
        }
    }
    printf("OK %d\n", i);
    return 0;
}
```

### 报了 UB 却继续往下执行 [WA]
输出 `UB` 之后必须立刻 `return 0`。如果只把行号记下来接着执行，后面可能覆盖结果、甚至把 `i` 算成别的值再打印一行 `OK`，输出行数就错了。

### 行号从 0 开始数 [WA]
循环变量从 1 开始，或者输出时 `line + 1`。用数组下标直接输出会整体小 1，`UB 5` 变成 `UB 4`。

## 测试用例
### 01 sample 示例 1
```in
6
set 2
inc
andseq
dec
seqinc
add -5
```
```out
OK 1
```

### 02 sample 示例 2
```in
1
selfpost
```
```out
UB 1
```

### 03 boundary 100 条语句，值接近上限
```in
100
set 1000
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
inc
add 1000
```
```out
OK 2098
```
> 98 条 `inc` 让 `i` 从 1000 涨到 1098，最后 `add 1000` 得到 2098。全程没有 UB，所以要输出最终值而不是 `UB`。

### 04 degenerate 只有一条 set，负数
```in
1
set -1000
```
```out
OK -1000
```

### 05 trap andseq 的短路
```in
5
set 0
andseq
andseq
dec
andseq
```
```out
OK 4
```
> 第一个 `andseq` 时 `i` 是 0，右边不求值，只加 1 变成 1；第二个 `andseq` 时 `i` 非 0，加 2 变成 3；`dec` 得 2；最后一个 `andseq` 的旧值是 2（非 0），再加 2 得到 4。若一律加 2，结果是 5。

### 06 trap comma 与 seqinc 的差别
```in
6
set 5
comma
seqinc
comma
seqinc
comma
```
```out
OK 12
```
> 从 5 出发：`comma` 加 1 得 6，`seqinc` 加 2 得 8，`comma` 得 9，`seqinc` 得 11，`comma` 得 12。

### 07 trap UB 出现在最后一行
```in
5
set 1
inc
comma
inc
argpost
```
```out
UB 5
```
> 前四条语句都合法，`argpost`（`f(i++, i++)`）在第 5 条才出现，所以答案不是 `OK` 而是 `UB 5`。

### 08 normal 混合加减
```in
8
set 7
add -10
dec
andseq
comma
seqinc
inc
dec
```
```out
OK 1
```
