---json
{
  "id": "p-s7-iv-memory-layout-2",
  "title": "对象生命周期追踪：谁创建、谁销毁、最后泄漏了多少",
  "difficulty": "L5",
  "knowledgePoints": ["s7-iv-memory-layout"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
面试官写完一段程序，问你："这里面每个对象住在哪个区？各自什么时候消失？" 光背"栈、堆、`.data`、`.bss`、`.rodata`"不够，你要能跟着指令**一格一格推**。

本题给你一串按时间顺序发生的事件，请模拟一个"对象追踪器"，并在每次查询时报告该对象**所在的区**和**是否还活着**。

### 事件
每个事件占一行，格式如下：

| 事件 | 含义 | 所在区 | 生命周期 |
|---|---|---|---|
| `G <名字> <init>` | 定义文件作用域变量，`init` 为 0 或 1 | `init=1` → `data`；`init=0` → `bss` | 到进程结束 |
| `C <名字>` | 定义文件作用域 `const` 对象（或字符串字面量） | `rodata` | 到进程结束 |
| `S <名字>` | 在函数内定义 `static` 局部变量 | `bss` | 到进程结束（**函数返回不销毁**） |
| `E <名字>` | 进入一个块，定义自动（局部）变量 | `stack` | 到对应的 `L` |
| `L <名字>` | 离开那个块，自动变量销毁 | `stack` | 此刻变 `dead` |
| `H <名字> <字节数>` | `malloc` 成功，返回一块堆内存 | `heap` | 到 `F` |
| `F <名字>` | `free` 这块堆内存 | `heap` | 此刻变 `dead`；若它**已经**是 `dead`，说明重复释放，输出一行 `double-free <名字>` |
| `P <名字>` | 查询：输出这个对象现在的区和状态 | —— | —— |

`P` 的输出格式是固定的三列：

```
<名字> <区> <alive|dead>
```

区名只能是 `data`、`bss`、`rodata`、`stack`、`heap` 之一。已经死掉的对象**仍然记得自己原来的区**（`dead` 的栈变量照样打印 `stack`），不要把它改成别的区，也不要跳过不输出。

处理完所有事件后，输出一行：

```
leak <仍然存活的堆对象个数> <这些对象的字节数之和>
```

只有堆对象算泄漏：栈变量离开作用域、全局对象一直活着，都不算。

### 输入保证
- 名字由小写字母、数字、下划线组成，长度 1–15，且**全局唯一**（不会有两个对象同名）；
- 每个对象先用上面表格里的某条定义事件出现一次，之后才可能被 `L`、`F`、`P` 引用；
- `E` / `L` 成对出现且顺序合法，`L` 只用于 `E` 定义过的名字；
- `F` 只用于 `H` 定义过的名字，但**允许对同一个名字 `F` 多次**（第二次开始就是重复释放）；
- 不会出现未知命令。

## 输入格式
第一行一个整数 `n`：事件个数。

接下来 `n` 行，每行一个事件，格式见题目描述中的表格。`G` 和 `H` 的最后一个字段是十进制整数。

## 输出格式
按事件顺序：
- 每个 `P` 输出一行 `<名字> <区> <alive|dead>`；
- 每个**重复释放**的 `F` 在这一行输出 `double-free <名字>`（第一次 `F` 不输出）；
- 所有事件处理完后，最后一行输出 `leak <个数> <字节数>`。

## 数据范围
1 ≤ n ≤ 500
名字长度 1–15，字符集为小写字母、数字、下划线
`G` 的 `init` ∈ {0, 1}
`H` 的字节数 1 ≤ size ≤ 1000

每个事件最多定义一个对象，所以对象数不超过 500；堆字节数之和不超过 500 × 1000 = 500000，`int` 也装得下，但请用 `long long` 累计（面试时这属于"该用大类型就用"的基本功）。输出最多 501 行，远小于 64KB。

## 示例
### 示例 1
```in
10
G g_init 1
G g_zero 0
C msg
S calls
E local
P local
P msg
L local
P local
P calls
```
```out
local stack alive
msg rodata alive
local stack dead
calls bss alive
leak 0 0
```
> `g_init` 有非零初值，进 `data`；`g_zero` 没有初值，进 `bss`；`msg` 是 `const`，进 `rodata`；`calls` 是函数内 `static`，进 `bss` 且**不会**因为离开作用域而死；`local` 是自动变量，`L` 之后变 `dead`。没有 `H`，所以泄漏是 `0 0`。

### 示例 2（边界：只有一块最大堆内存，直接泄漏）
```in
2
H only 1000
P only
```
```out
only heap alive
leak 1 1000
```
> 只有一个事件定义对象、一次查询。`H` 之后没有 `F`，所以程序结束时它仍然活着，泄漏计数 1、字节数 1000。

## 提示
### 第 1 层
对象只需要记四样东西：名字、区、是否存活、堆字节数（非堆对象记 0）。每读一个事件，要么新建一个对象，要么修改/查询已有对象。先把这个"对象表"用结构体数组搭起来，命令分支用 `strcmp` 判断。

### 第 2 层
区的映射是固定的：`G` 看 `init`（1 → `data`，0 → `bss`），`C` → `rodata`，`S` → `bss`，`E` → `stack`，`H` → `heap`。`S` 和 `E` 都叫"局部变量"，但前者是静态存储期（永远活着），后者到 `L` 就结束——这是本题最容易错的一处。

### 第 3 层
`F` 要分两种情况：目标仍存活 → 标记死亡，同时把"存活堆块数"减 1、"存活字节数"减去它的 `size`；目标已经死亡 → 只输出 `double-free <名字>`，**不要再减第二次**。`L` 只改状态、不改区。最后一行用 `long long` 打印字节数。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXN 500
enum { SEC_DATA, SEC_BSS, SEC_RODATA, SEC_STACK, SEC_HEAP };

typedef struct {
    char name[16];
    int sec;
    int alive;
    int size;              /* 只有堆对象用到 */
} Obj;

static const char *SEC_NAME[] = { "data", "bss", "rodata", "stack", "heap" };

static Obj *find(Obj *tab, int n, const char *name) {
    for (int i = 0; i < n; i++) {
        if (strcmp(tab[i].name, name) == 0) {
            return &tab[i];
        }
    }
    return NULL;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }

    Obj tab[MAXN];
    int cnt = 0;
    int leaks = 0;
    long long bytes = 0;

    for (int i = 0; i < n; i++) {
        char op[8];
        char name[16];
        if (scanf("%7s", op) != 1) {
            return 0;
        }

        if (strcmp(op, "G") == 0) {
            int init = 0;
            if (scanf("%15s %d", tab[cnt].name, &init) != 2) {
                return 0;
            }
            tab[cnt].sec = init ? SEC_DATA : SEC_BSS;
            tab[cnt].alive = 1;
            tab[cnt].size = 0;
            cnt++;
        } else if (strcmp(op, "C") == 0) {
            if (scanf("%15s", tab[cnt].name) != 1) {
                return 0;
            }
            tab[cnt].sec = SEC_RODATA;
            tab[cnt].alive = 1;
            tab[cnt].size = 0;
            cnt++;
        } else if (strcmp(op, "S") == 0) {
            if (scanf("%15s", tab[cnt].name) != 1) {
                return 0;
            }
            tab[cnt].sec = SEC_BSS;      /* static：静态存储期，不在栈上 */
            tab[cnt].alive = 1;
            tab[cnt].size = 0;
            cnt++;
        } else if (strcmp(op, "E") == 0) {
            if (scanf("%15s", tab[cnt].name) != 1) {
                return 0;
            }
            tab[cnt].sec = SEC_STACK;
            tab[cnt].alive = 1;
            tab[cnt].size = 0;
            cnt++;
        } else if (strcmp(op, "H") == 0) {
            int size = 0;
            if (scanf("%15s %d", tab[cnt].name, &size) != 2) {
                return 0;
            }
            tab[cnt].sec = SEC_HEAP;
            tab[cnt].alive = 1;
            tab[cnt].size = size;
            cnt++;
            leaks++;
            bytes += size;
        } else if (strcmp(op, "L") == 0) {
            if (scanf("%15s", name) != 1) {
                return 0;
            }
            Obj *p = find(tab, cnt, name);
            if (p == NULL) {
                return 0;
            }
            p->alive = 0;                /* 离开作用域：栈对象销毁 */
        } else if (strcmp(op, "F") == 0) {
            if (scanf("%15s", name) != 1) {
                return 0;
            }
            Obj *p = find(tab, cnt, name);
            if (p == NULL) {
                return 0;
            }
            if (!p->alive) {
                printf("double-free %s\n", name);
            } else {
                p->alive = 0;
                leaks--;
                bytes -= p->size;
            }
        } else if (strcmp(op, "P") == 0) {
            if (scanf("%15s", name) != 1) {
                return 0;
            }
            Obj *p = find(tab, cnt, name);
            if (p == NULL) {
                return 0;
            }
            printf("%s %s %s\n", p->name, SEC_NAME[p->sec], p->alive ? "alive" : "dead");
        }
    }

    printf("leak %d %lld\n", leaks, bytes);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXN 500
enum { SEC_DATA, SEC_BSS, SEC_RODATA, SEC_STACK, SEC_HEAP };

typedef struct {
    char name[16];
    int sec;
    int alive;
    int size;
} Obj;

static const char *SEC_NAME[] = { "data", "bss", "rodata", "stack", "heap" };

static Obj *find(Obj *tab, int n, const char *name) {
    for (int i = 0; i < n; i++) {
        if (strcmp(tab[i].name, name) == 0) {
            return &tab[i];
        }
    }
    return NULL;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }

    Obj tab[MAXN];
    int cnt = 0;
    int leaks = 0;
    long long bytes = 0;

    for (int i = 0; i < n; i++) {
        char op[8];
        char name[16];
        if (scanf("%7s", op) != 1) {
            return 0;
        }

        if (strcmp(op, "G") == 0) {
            int init = 0;
            if (scanf("%15s %d", tab[cnt].name, &init) != 2) {
                return 0;
            }
            tab[cnt].sec = init ? SEC_DATA : SEC_BSS;
            tab[cnt].alive = 1;
            tab[cnt].size = 0;
            cnt++;
        } else if (strcmp(op, "C") == 0) {
            if (scanf("%15s", tab[cnt].name) != 1) {
                return 0;
            }
            tab[cnt].sec = SEC_RODATA;
            tab[cnt].alive = 1;
            tab[cnt].size = 0;
            cnt++;
        } else if (strcmp(op, "S") == 0) {
            if (scanf("%15s", tab[cnt].name) != 1) {
                return 0;
            }
            tab[cnt].sec = SEC_STACK;    /* TODO: 函数内 static 不在栈上 */
            tab[cnt].alive = 1;
            tab[cnt].size = 0;
            cnt++;
        } else if (strcmp(op, "E") == 0) {
            if (scanf("%15s", tab[cnt].name) != 1) {
                return 0;
            }
            tab[cnt].sec = SEC_STACK;
            tab[cnt].alive = 1;
            tab[cnt].size = 0;
            cnt++;
        } else if (strcmp(op, "H") == 0) {
            int size = 0;
            if (scanf("%15s %d", tab[cnt].name, &size) != 2) {
                return 0;
            }
            tab[cnt].sec = SEC_HEAP;
            tab[cnt].alive = 1;
            tab[cnt].size = size;
            cnt++;
            leaks++;
            bytes += size;
        } else if (strcmp(op, "L") == 0) {
            if (scanf("%15s", name) != 1) {
                return 0;
            }
            /* TODO: 离开作用域，把找到的栈对象标记为 dead */
        } else if (strcmp(op, "F") == 0) {
            if (scanf("%15s", name) != 1) {
                return 0;
            }
            Obj *p = find(tab, cnt, name);
            if (p == NULL) {
                return 0;
            }
            p->alive = 0;               /* TODO: 已 dead 时要输出 double-free，并维护泄漏统计 */
        } else if (strcmp(op, "P") == 0) {
            if (scanf("%15s", name) != 1) {
                return 0;
            }
            Obj *p = find(tab, cnt, name);
            if (p == NULL) {
                return 0;
            }
            printf("%s %s %s\n", p->name, SEC_NAME[p->sec], p->alive ? "alive" : "dead");
        }
    }

    printf("leak %d %lld\n", leaks, bytes);
    return 0;
}
```

## 复杂度
时间 O(n²)：每个 `L` / `F` / `P` 都可能线性扫一遍对象表，n ≤ 500，最多 25 万次比较，轻松通过。空间 O(n)。
优化方向：用哈希表或按名字下标映射，把每条命令降到 O(1)，但本题规模下没有意义——面试时先写对，再谈优化。

## 常见错误
### 把函数内的 static 局部变量当成栈对象 [WA]
`S` 的事件看起来和 `E` 一样都是"函数里的变量"，但 `static` 把存储期改成了静态：它在 `.bss`（零初始化）或 `.data` 里，函数返回、离开作用域都不会销毁。把它当成栈对象，区和存活状态都会错。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXN 500
enum { SEC_DATA, SEC_BSS, SEC_RODATA, SEC_STACK, SEC_HEAP };

typedef struct { char name[16]; int sec; int alive; int size; } Obj;

static const char *SEC_NAME[] = { "data", "bss", "rodata", "stack", "heap" };

static Obj *find(Obj *tab, int n, const char *name) {
    for (int i = 0; i < n; i++) {
        if (strcmp(tab[i].name, name) == 0) {
            return &tab[i];
        }
    }
    return NULL;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    Obj tab[MAXN];
    int cnt = 0;
    int leaks = 0;
    long long bytes = 0;
    for (int i = 0; i < n; i++) {
        char op[8];
        char name[16];
        if (scanf("%7s", op) != 1) {
            return 0;
        }
        if (strcmp(op, "G") == 0) {
            int init = 0;
            if (scanf("%15s %d", tab[cnt].name, &init) != 2) {
                return 0;
            }
            tab[cnt].sec = init ? SEC_DATA : SEC_BSS;
            tab[cnt].alive = 1;
            tab[cnt].size = 0;
            cnt++;
        } else if (strcmp(op, "C") == 0) {
            if (scanf("%15s", tab[cnt].name) != 1) {
                return 0;
            }
            tab[cnt].sec = SEC_RODATA;
            tab[cnt].alive = 1;
            tab[cnt].size = 0;
            cnt++;
        } else if (strcmp(op, "S") == 0) {
            if (scanf("%15s", tab[cnt].name) != 1) {
                return 0;
            }
            tab[cnt].sec = SEC_STACK;    /* 错：static 局部变量在 .bss */
            tab[cnt].alive = 1;
            tab[cnt].size = 0;
            cnt++;
        } else if (strcmp(op, "E") == 0) {
            if (scanf("%15s", tab[cnt].name) != 1) {
                return 0;
            }
            tab[cnt].sec = SEC_STACK;
            tab[cnt].alive = 1;
            tab[cnt].size = 0;
            cnt++;
        } else if (strcmp(op, "H") == 0) {
            int size = 0;
            if (scanf("%15s %d", tab[cnt].name, &size) != 2) {
                return 0;
            }
            tab[cnt].sec = SEC_HEAP;
            tab[cnt].alive = 1;
            tab[cnt].size = size;
            cnt++;
            leaks++;
            bytes += size;
        } else if (strcmp(op, "L") == 0) {
            if (scanf("%15s", name) != 1) {
                return 0;
            }
            Obj *p = find(tab, cnt, name);
            if (p != NULL) {
                p->alive = 0;
            }
        } else if (strcmp(op, "F") == 0) {
            if (scanf("%15s", name) != 1) {
                return 0;
            }
            Obj *p = find(tab, cnt, name);
            if (p == NULL) {
                return 0;
            }
            if (!p->alive) {
                printf("double-free %s\n", name);
            } else {
                p->alive = 0;
                leaks--;
                bytes -= p->size;
            }
        } else if (strcmp(op, "P") == 0) {
            if (scanf("%15s", name) != 1) {
                return 0;
            }
            Obj *p = find(tab, cnt, name);
            if (p == NULL) {
                return 0;
            }
            printf("%s %s %s\n", p->name, SEC_NAME[p->sec], p->alive ? "alive" : "dead");
        }
    }
    printf("leak %d %lld\n", leaks, bytes);
    return 0;
}
```

### 离开作用域（L）时忘记销毁栈对象 [WA]
`E` 创建、`L` 销毁是一对。`L` 忘了把状态改成 `dead`，之后所有对它的查询都会错误地报 `alive`——这正是"把栈对象的生命周期延长到函数返回之后"的经典误解。
```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXN 500
enum { SEC_DATA, SEC_BSS, SEC_RODATA, SEC_STACK, SEC_HEAP };

typedef struct { char name[16]; int sec; int alive; int size; } Obj;

static const char *SEC_NAME[] = { "data", "bss", "rodata", "stack", "heap" };

static Obj *find(Obj *tab, int n, const char *name) {
    for (int i = 0; i < n; i++) {
        if (strcmp(tab[i].name, name) == 0) {
            return &tab[i];
        }
    }
    return NULL;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    Obj tab[MAXN];
    int cnt = 0;
    int leaks = 0;
    long long bytes = 0;
    for (int i = 0; i < n; i++) {
        char op[8];
        char name[16];
        if (scanf("%7s", op) != 1) {
            return 0;
        }
        if (strcmp(op, "G") == 0) {
            int init = 0;
            if (scanf("%15s %d", tab[cnt].name, &init) != 2) {
                return 0;
            }
            tab[cnt].sec = init ? SEC_DATA : SEC_BSS;
            tab[cnt].alive = 1;
            tab[cnt].size = 0;
            cnt++;
        } else if (strcmp(op, "C") == 0) {
            if (scanf("%15s", tab[cnt].name) != 1) {
                return 0;
            }
            tab[cnt].sec = SEC_RODATA;
            tab[cnt].alive = 1;
            tab[cnt].size = 0;
            cnt++;
        } else if (strcmp(op, "S") == 0) {
            if (scanf("%15s", tab[cnt].name) != 1) {
                return 0;
            }
            tab[cnt].sec = SEC_BSS;
            tab[cnt].alive = 1;
            tab[cnt].size = 0;
            cnt++;
        } else if (strcmp(op, "E") == 0) {
            if (scanf("%15s", tab[cnt].name) != 1) {
                return 0;
            }
            tab[cnt].sec = SEC_STACK;
            tab[cnt].alive = 1;
            tab[cnt].size = 0;
            cnt++;
        } else if (strcmp(op, "H") == 0) {
            int size = 0;
            if (scanf("%15s %d", tab[cnt].name, &size) != 2) {
                return 0;
            }
            tab[cnt].sec = SEC_HEAP;
            tab[cnt].alive = 1;
            tab[cnt].size = size;
            cnt++;
            leaks++;
            bytes += size;
        } else if (strcmp(op, "L") == 0) {
            if (scanf("%15s", name) != 1) {
                return 0;
            }
            /* 错：什么都不做，栈对象永远不会 dead */
        } else if (strcmp(op, "F") == 0) {
            if (scanf("%15s", name) != 1) {
                return 0;
            }
            Obj *p = find(tab, cnt, name);
            if (p == NULL) {
                return 0;
            }
            if (!p->alive) {
                printf("double-free %s\n", name);
            } else {
                p->alive = 0;
                leaks--;
                bytes -= p->size;
            }
        } else if (strcmp(op, "P") == 0) {
            if (scanf("%15s", name) != 1) {
                return 0;
            }
            Obj *p = find(tab, cnt, name);
            if (p == NULL) {
                return 0;
            }
            printf("%s %s %s\n", p->name, SEC_NAME[p->sec], p->alive ? "alive" : "dead");
        }
    }
    printf("leak %d %lld\n", leaks, bytes);
    return 0;
}
```

### free 之后没有扣减泄漏统计 [WA]
`H` 时把块计入"存活堆内存"，`F` 时就必须扣掉；只标记 `dead` 不扣统计，最后的 `leak` 行会把已经释放的块继续算成泄漏。注意重复 `F` 时不能再扣第二次。
```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXN 500
enum { SEC_DATA, SEC_BSS, SEC_RODATA, SEC_STACK, SEC_HEAP };

typedef struct { char name[16]; int sec; int alive; int size; } Obj;

static const char *SEC_NAME[] = { "data", "bss", "rodata", "stack", "heap" };

static Obj *find(Obj *tab, int n, const char *name) {
    for (int i = 0; i < n; i++) {
        if (strcmp(tab[i].name, name) == 0) {
            return &tab[i];
        }
    }
    return NULL;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    Obj tab[MAXN];
    int cnt = 0;
    int leaks = 0;
    long long bytes = 0;
    for (int i = 0; i < n; i++) {
        char op[8];
        char name[16];
        if (scanf("%7s", op) != 1) {
            return 0;
        }
        if (strcmp(op, "G") == 0) {
            int init = 0;
            if (scanf("%15s %d", tab[cnt].name, &init) != 2) {
                return 0;
            }
            tab[cnt].sec = init ? SEC_DATA : SEC_BSS;
            tab[cnt].alive = 1;
            tab[cnt].size = 0;
            cnt++;
        } else if (strcmp(op, "C") == 0) {
            if (scanf("%15s", tab[cnt].name) != 1) {
                return 0;
            }
            tab[cnt].sec = SEC_RODATA;
            tab[cnt].alive = 1;
            tab[cnt].size = 0;
            cnt++;
        } else if (strcmp(op, "S") == 0) {
            if (scanf("%15s", tab[cnt].name) != 1) {
                return 0;
            }
            tab[cnt].sec = SEC_BSS;
            tab[cnt].alive = 1;
            tab[cnt].size = 0;
            cnt++;
        } else if (strcmp(op, "E") == 0) {
            if (scanf("%15s", tab[cnt].name) != 1) {
                return 0;
            }
            tab[cnt].sec = SEC_STACK;
            tab[cnt].alive = 1;
            tab[cnt].size = 0;
            cnt++;
        } else if (strcmp(op, "H") == 0) {
            int size = 0;
            if (scanf("%15s %d", tab[cnt].name, &size) != 2) {
                return 0;
            }
            tab[cnt].sec = SEC_HEAP;
            tab[cnt].alive = 1;
            tab[cnt].size = size;
            cnt++;
            leaks++;
            bytes += size;
        } else if (strcmp(op, "L") == 0) {
            if (scanf("%15s", name) != 1) {
                return 0;
            }
            Obj *p = find(tab, cnt, name);
            if (p != NULL) {
                p->alive = 0;
            }
        } else if (strcmp(op, "F") == 0) {
            if (scanf("%15s", name) != 1) {
                return 0;
            }
            Obj *p = find(tab, cnt, name);
            if (p == NULL) {
                return 0;
            }
            if (!p->alive) {
                printf("double-free %s\n", name);
            } else {
                p->alive = 0;          /* 错：没有 leaks-- 和 bytes -= size */
            }
        } else if (strcmp(op, "P") == 0) {
            if (scanf("%15s", name) != 1) {
                return 0;
            }
            Obj *p = find(tab, cnt, name);
            if (p == NULL) {
                return 0;
            }
            printf("%s %s %s\n", p->name, SEC_NAME[p->sec], p->alive ? "alive" : "dead");
        }
    }
    printf("leak %d %lld\n", leaks, bytes);
    return 0;
}
```

### 把 const 对象放进 data 或 bss [WA]
`C` 事件代表文件作用域的 `const` 对象或字符串字面量，属于只读数据区。把它按"有没有初值"分到 `data` / `bss`，`P` 输出里的区名就错了——这也是面试里"`const` 全局变量在哪"最常见的错误答案。

### 对同类对象只按"定义位置"判断区 [WA]
`S`（函数内 `static`）和 `E`（函数内自动变量）定义位置相同，区完全不同：前者 `.bss`、后者 `stack`。判断区的依据是**存储类别**，不是"在不在函数里"。

## 测试用例
### 01 sample 示例 1
```in
10
G g_init 1
G g_zero 0
C msg
S calls
E local
P local
P msg
L local
P local
P calls
```
```out
local stack alive
msg rodata alive
local stack dead
calls bss alive
leak 0 0
```

### 02 sample 示例 2
```in
2
H only 1000
P only
```
```out
only heap alive
leak 1 1000
```

### 03 boundary 最大堆块与泄漏字节数
```in
6
H huge 1000
H tiny 1
P huge
F huge
P huge
P tiny
```
```out
huge heap alive
huge heap dead
tiny heap alive
leak 1 1
```

### 04 degenerate 没有任何堆对象与查询
```in
3
G g 0
C c
S s
```
```out
leak 0 0
```

### 05 trap 栈对象离开作用域后反复查询
```in
5
E x
P x
L x
P x
P x
```
```out
x stack alive
x stack dead
x stack dead
leak 0 0
```

### 06 trap 重复释放不打乱泄漏统计
```in
8
H a 10
H b 20
F a
F a
P a
P b
H c 30
P c
```
```out
double-free a
a heap dead
b heap alive
c heap alive
leak 2 50
```

### 07 normal 四个区混合，static 跨越作用域
```in
10
G total 1
G zeros 0
C title
S calls
P total
P zeros
P title
P calls
H buf 64
P buf
```
```out
total data alive
zeros bss alive
title rodata alive
calls bss alive
buf heap alive
leak 1 64
```
