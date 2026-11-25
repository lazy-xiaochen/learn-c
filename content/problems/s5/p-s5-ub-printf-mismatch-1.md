---json
{
  "id": "p-s5-ub-printf-mismatch-1",
  "title": "printf 格式串审计器：类型、长度修饰符与数量",
  "difficulty": "L3",
  "knowledgePoints": ["s5-ub-printf-mismatch"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
`-Wformat` 是编译器里最有用的一条检查：它拿格式串和实参类型逐个对照，把不匹配的调用在编译期就拦下来。本题要求你实现这条检查的核心部分——给定一个 `printf` 调用（格式串 + 实参类型列表），判断它是否会触发 `-Wformat`。

实参类型用单 token 表示：

| 类型码 | 对应类型 | 传进变参函数时实际上是什么 |
|---|---|---|
| `i` | `int` | `int` |
| `u` | `unsigned` | `unsigned` |
| `l` | `long` | `long` |
| `ll` | `long long` | `long long` |
| `z` | `size_t` | `size_t`（8 字节无符号） |
| `d` | `double` | `double` |
| `f` | `float` | **提升成 `double`** |
| `s` | `char *` | `char *` |
| `c` | `char` | **提升成 `int`** |

格式串里只会出现下面这些格式符（其余字符一律是普通字符，原样输出，不参与检查）：

| 格式符 | 期待的实参类型 |
|---|---|
| `%d` | `i` |
| `%u` | `u` |
| `%ld` | `l` |
| `%lld` | `ll` |
| `%zu` | `z` |
| `%f`、`%lf` | `d` 或 `f`（`float` 会被提升成 `double`，`l` 在 `printf` 里不起作用） |
| `%s` | `s` |
| `%c` | `c` 或 `i`（`char` 提升成 `int`） |
| `%hhd` | `c` 或 `i`（先按 `int` 收下，再截断成 `signed char`） |
| `%hd` | `c` 或 `i`（先按 `int` 收下，再截断成 `short`） |
| `%%` | 不消耗实参 |

判定顺序是固定的：

1. 先数"需要实参的格式符"个数（`%%` 不算）。如果它和实参个数 `m` 不同，输出 `BAD count`；
2. 否则，从左到右逐个对照。第一个对不上的格式符（**按"需要实参的格式符"从 1 开始编号**），输出 `BAD <编号>`；
3. 全部对得上，输出 `OK`。

## 输入格式
第一行一个整数 `n`：调用的个数。

接下来 `n` 行，每行描述一个调用：先是一个整数 `m`（实参个数），接着 `m` 个类型码，最后是格式串。格式串里**不含空格**，所以整行可以用空格切分。

## 输出格式
每个调用输出一行：`OK`、`BAD count` 或 `BAD <编号>`。

## 数据范围
- `1 ≤ n ≤ 100`；
- `0 ≤ m ≤ 20`；
- 格式串长度不超过 60，其中最多 20 个格式符；
- 格式串里只会出现上表列出的格式符，不会出现非法写法（如结尾孤立的 `%`）。

## 示例
### 示例 1
```in
3
1 i %d
2 d s %f_%s
1 i %f
```
```out
OK
OK
BAD 1
```
> 第二行的 `_` 只是普通字符。第三行 `%f` 期待 `d` 或 `f`，实际给的是 `i`，所以第 1 个格式符就对不上——这也是本平台会判 `RE` 的那种调用（`%f` 会去浮点通道取一个 `double`，而 `i` 在整型通道里）。

### 示例 2（边界：`%%` 不消耗实参）
```in
2
0 hello
2 i i %d%%%d
```
```out
OK
OK
```
> 第一行没有任何格式符，实参也是 0 个，数量一致。第二行的 `%d%%%d` 依次是：`%d`（消耗第 1 个实参）、`%%`（不消耗）、`%d`（消耗第 2 个实参），需要实参的格式符正好 2 个。把 `%%` 也数进去的话会判成 `BAD count`。

## 提示
### 第 1 层
先把格式串扫一遍，把每个格式符"拆"成两部分：长度修饰符（`hh`、`h`、`l`、`ll`、`z` 或空）和转换字符（`d`、`u`、`f`、`s`、`c`）。注意 `%lld` 的修饰符是两个字符，扫描时要先看两个字符再看一个字符。

### 第 2 层
`-Wformat` 的核心是"提升"：`float` 进 `printf` 就变成了 `double`，`char` 进 `printf` 就变成了 `int`。所以 `%f` 配 `f` 是对的（传进去的其实是 `d`），`%c` 配 `i` 也是对的。反之 `%f` 配 `i` 就错——`i` 不会被"转换"成浮点数。

### 第 3 层
数量检查要在类型检查**之前**做，而且 `%%` 必须跳过。编号是"第几个需要实参的格式符"，不是字符串里的字符位置，也不是 `%` 的出现次序（因为 `%%` 也算一次 `%` 出现）。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

/* 判断一个格式符（不含 '%'）能不能配这种实参类型 */
static int type_ok(const char *spec, const char *arg) {
    if (strcmp(spec, "d") == 0) {
        return strcmp(arg, "i") == 0;
    }
    if (strcmp(spec, "u") == 0) {
        return strcmp(arg, "u") == 0;
    }
    if (strcmp(spec, "ld") == 0) {
        return strcmp(arg, "l") == 0;
    }
    if (strcmp(spec, "lld") == 0) {
        return strcmp(arg, "ll") == 0;
    }
    if (strcmp(spec, "zu") == 0) {
        return strcmp(arg, "z") == 0;
    }
    if (strcmp(spec, "f") == 0) {
        return strcmp(arg, "d") == 0 || strcmp(arg, "f") == 0;
    }
    if (strcmp(spec, "s") == 0) {
        return strcmp(arg, "s") == 0;
    }
    if (strcmp(spec, "c") == 0) {
        return strcmp(arg, "c") == 0 || strcmp(arg, "i") == 0;
    }
    if (strcmp(spec, "hhd") == 0) {
        return strcmp(arg, "c") == 0 || strcmp(arg, "i") == 0;
    }
    if (strcmp(spec, "hd") == 0) {
        return strcmp(arg, "c") == 0 || strcmp(arg, "i") == 0;
    }
    return 0;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }
    char args[32][4];
    char fmt[128];
    for (int k = 0; k < n; k++) {
        int m;
        if (scanf("%d", &m) != 1 || m < 0 || m > 20) {
            return 0;
        }
        for (int a = 0; a < m; a++) {
            if (scanf("%3s", args[a]) != 1) {
                return 0;
            }
        }
        if (scanf("%127s", fmt) != 1) {
            return 0;
        }

        int used = 0;       /* 已经消耗的实参个数 */
        int first_bad = 0;  /* 第一个对不上的格式符编号（1 起） */
        int specs = 0;      /* 需要实参的格式符总数 */
        for (int p = 0; fmt[p] != '\0'; p++) {
            if (fmt[p] != '%') {
                continue;
            }
            p++;
            if (fmt[p] == '%') {
                continue;                 /* %% 不消耗实参 */
            }
            char spec[8] = { 0 };
            int sp = 0;
            if (fmt[p] == 'h' && fmt[p + 1] == 'h') {
                spec[sp++] = fmt[p++];
                spec[sp++] = fmt[p++];
            } else if (fmt[p] == 'l' && fmt[p + 1] == 'l') {
                spec[sp++] = fmt[p++];
                spec[sp++] = fmt[p++];
            } else if (fmt[p] == 'h' || fmt[p] == 'l' || fmt[p] == 'z') {
                spec[sp++] = fmt[p++];
            }
            spec[sp++] = fmt[p];
            spec[sp] = '\0';
            specs++;
            if (used < m) {
                if (!type_ok(spec, args[used]) && first_bad == 0) {
                    first_bad = specs;
                }
                used++;
            }
        }
        if (specs != m) {
            printf("BAD count\n");
        } else if (first_bad != 0) {
            printf("BAD %d\n", first_bad);
        } else {
            printf("OK\n");
        }
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

/* TODO: 补上长度修饰符（hh / h / l / ll / z）的处理 */
static int type_ok(const char *conv, const char *arg) {
    if (strcmp(conv, "d") == 0) {
        return strcmp(arg, "i") == 0;
    }
    if (strcmp(conv, "s") == 0) {
        return strcmp(arg, "s") == 0;
    }
    if (strcmp(conv, "f") == 0) {
        return strcmp(arg, "f") == 0;   /* TODO: float 会提升成 double */
    }
    return 1;                           /* 其它格式符先一律放行 */
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }
    char args[32][4];
    char fmt[128];
    for (int k = 0; k < n; k++) {
        int m;
        if (scanf("%d", &m) != 1 || m < 0 || m > 20) {
            return 0;
        }
        for (int a = 0; a < m; a++) {
            if (scanf("%3s", args[a]) != 1) {
                return 0;
            }
        }
        if (scanf("%127s", fmt) != 1) {
            return 0;
        }

        int used = 0;
        int first_bad = 0;
        for (int p = 0; fmt[p] != '\0'; p++) {
            if (fmt[p] != '%') {
                continue;
            }
            p++;
            if (fmt[p] == '%') {
                continue;
            }
            char conv[2] = { fmt[p], '\0' };
            if (used < m) {
                if (!type_ok(conv, args[used]) && first_bad == 0) {
                    first_bad = used + 1;
                }
                used++;
            }
        }
        /* TODO: 还要比较"需要实参的格式符个数"和 m */
        if (first_bad != 0) {
            printf("BAD %d\n", first_bad);
        } else {
            printf("OK\n");
        }
    }
    return 0;
}
```

## 复杂度
时间 O(n × 格式串长度)：每个格式符做一次字符串比较。
空间 O(1)：实参类型表和格式串都有固定上限。

## 常见错误
### 把 `%f` 只配给 `float` [WA]
`printf("%f", 1.5f)` 之所以合法，是因为 `1.5f` 在传参前已经被提升成 `double`，所以 `%f` 收到的就是一个 `double`。真实类型是 `double` 时才最匹配，`float` 也"能对上"是因为它已经不存在了。反过来把 `%f` 限定成只接受 `f`，`printf("%f", 3.5)` 会被误判成错误。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

static int type_ok(const char *spec, const char *arg) {
    if (strcmp(spec, "d") == 0) {
        return strcmp(arg, "i") == 0;
    }
    if (strcmp(spec, "u") == 0) {
        return strcmp(arg, "u") == 0;
    }
    if (strcmp(spec, "ld") == 0) {
        return strcmp(arg, "l") == 0;
    }
    if (strcmp(spec, "lld") == 0) {
        return strcmp(arg, "ll") == 0;
    }
    if (strcmp(spec, "zu") == 0) {
        return strcmp(arg, "z") == 0;
    }
    if (strcmp(spec, "f") == 0) {
        return strcmp(arg, "f") == 0;        /* 错：float 已经提升成 double */
    }
    if (strcmp(spec, "s") == 0) {
        return strcmp(arg, "s") == 0;
    }
    if (strcmp(spec, "c") == 0) {
        return strcmp(arg, "c") == 0 || strcmp(arg, "i") == 0;
    }
    if (strcmp(spec, "hhd") == 0) {
        return strcmp(arg, "c") == 0 || strcmp(arg, "i") == 0;
    }
    if (strcmp(spec, "hd") == 0) {
        return strcmp(arg, "c") == 0 || strcmp(arg, "i") == 0;
    }
    return 0;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    char args[32][4];
    char fmt[128];
    for (int k = 0; k < n; k++) {
        int m;
        if (scanf("%d", &m) != 1) {
            return 0;
        }
        for (int a = 0; a < m; a++) {
            if (scanf("%3s", args[a]) != 1) {
                return 0;
            }
        }
        if (scanf("%127s", fmt) != 1) {
            return 0;
        }
        int used = 0;
        int first_bad = 0;
        int specs = 0;
        for (int p = 0; fmt[p] != '\0'; p++) {
            if (fmt[p] != '%') {
                continue;
            }
            p++;
            if (fmt[p] == '%') {
                continue;
            }
            char spec[8] = { 0 };
            int sp = 0;
            if (fmt[p] == 'h' && fmt[p + 1] == 'h') {
                spec[sp++] = fmt[p++];
                spec[sp++] = fmt[p++];
            } else if (fmt[p] == 'l' && fmt[p + 1] == 'l') {
                spec[sp++] = fmt[p++];
                spec[sp++] = fmt[p++];
            } else if (fmt[p] == 'h' || fmt[p] == 'l' || fmt[p] == 'z') {
                spec[sp++] = fmt[p++];
            }
            spec[sp++] = fmt[p];
            specs++;
            if (used < m) {
                if (!type_ok(spec, args[used]) && first_bad == 0) {
                    first_bad = specs;
                }
                used++;
            }
        }
        if (specs != m) {
            printf("BAD count\n");
        } else if (first_bad != 0) {
            printf("BAD %d\n", first_bad);
        } else {
            printf("OK\n");
        }
    }
    return 0;
}
```

### 把 `%%` 当成"需要一个实参的格式符" [WA]
`%%` 只输出一个百分号，不消耗实参。把它数进去，`printf("%d%%%d", 1, 2)` 会被判成"3 个格式符、2 个实参"→ `BAD count`，而它其实完全正确。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

static int type_ok(const char *spec, const char *arg) {
    if (strcmp(spec, "d") == 0) {
        return strcmp(arg, "i") == 0;
    }
    if (strcmp(spec, "u") == 0) {
        return strcmp(arg, "u") == 0;
    }
    if (strcmp(spec, "ld") == 0) {
        return strcmp(arg, "l") == 0;
    }
    if (strcmp(spec, "lld") == 0) {
        return strcmp(arg, "ll") == 0;
    }
    if (strcmp(spec, "zu") == 0) {
        return strcmp(arg, "z") == 0;
    }
    if (strcmp(spec, "f") == 0) {
        return strcmp(arg, "d") == 0 || strcmp(arg, "f") == 0;
    }
    if (strcmp(spec, "s") == 0) {
        return strcmp(arg, "s") == 0;
    }
    if (strcmp(spec, "c") == 0) {
        return strcmp(arg, "c") == 0 || strcmp(arg, "i") == 0;
    }
    if (strcmp(spec, "hhd") == 0) {
        return strcmp(arg, "c") == 0 || strcmp(arg, "i") == 0;
    }
    if (strcmp(spec, "hd") == 0) {
        return strcmp(arg, "c") == 0 || strcmp(arg, "i") == 0;
    }
    return 0;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    char args[32][4];
    char fmt[128];
    for (int k = 0; k < n; k++) {
        int m;
        if (scanf("%d", &m) != 1) {
            return 0;
        }
        for (int a = 0; a < m; a++) {
            if (scanf("%3s", args[a]) != 1) {
                return 0;
            }
        }
        if (scanf("%127s", fmt) != 1) {
            return 0;
        }
        int used = 0;
        int first_bad = 0;
        int specs = 0;
        for (int p = 0; fmt[p] != '\0'; p++) {
            if (fmt[p] != '%') {
                continue;
            }
            p++;
            char spec[8] = { 0 };
            int sp = 0;
            if (fmt[p] == '%') {
                spec[sp++] = '%';            /* 错：%% 也要占一个"格式符"名额 */
            } else {
                if (fmt[p] == 'h' && fmt[p + 1] == 'h') {
                    spec[sp++] = fmt[p++];
                    spec[sp++] = fmt[p++];
                } else if (fmt[p] == 'l' && fmt[p + 1] == 'l') {
                    spec[sp++] = fmt[p++];
                    spec[sp++] = fmt[p++];
                } else if (fmt[p] == 'h' || fmt[p] == 'l' || fmt[p] == 'z') {
                    spec[sp++] = fmt[p++];
                }
                spec[sp++] = fmt[p];
            }
            specs++;
            if (used < m) {
                if (!type_ok(spec, args[used]) && first_bad == 0) {
                    first_bad = specs;
                }
                used++;
            }
        }
        if (specs != m) {
            printf("BAD count\n");
        } else if (first_bad != 0) {
            printf("BAD %d\n", first_bad);
        } else {
            printf("OK\n");
        }
    }
    return 0;
}
```

### 不做数量检查，只比类型 [WA]
`printf("%d %d", 1)` 在真实程序里是 UB（第二个 `%d` 会读到寄存器保存区的残留值），`-Wformat` 报的正是 `more '%' conversions than data arguments`。只比类型、不对数量，这种调用会被判成 `OK`。反过来"给多了实参"（`printf("%d", 1, 2)`）同样是 `-Wformat` 的 `data argument not used by format string`，本题统一按 `BAD count` 处理。

### 把长度修饰符丢掉，只比较转换字符 [WA]
`%lld` 配 `l` 是错的（8 字节 vs `long`，在某些平台上同为 8 字节但语义不同，本题按表判错），`%d` 配 `ll` 也是错的。如果扫描时只取最后一个字符，`%lld` 会被当成 `d`，两种错误都会漏掉。解析时要**先看两个字符**（`hh`、`ll`）再看一个字符，最后才是转换字符。

### 编号用字符下标或"第几个 %" [WA]
题目要的编号是"第几个需要实参的格式符"。用 `p`（字符下标）会得到 `BAD 5` 之类的位置号；用"第几个 `%`"会把 `%%` 也数进去，`%d%%%d` 里的第二个 `%d` 会被报成 3 而不是 2。

## 测试用例
### 01 sample 示例 1
```in
3
1 i %d
2 d s %f_%s
1 i %f
```
```out
OK
OK
BAD 1
```

### 02 sample 示例 2
```in
2
0 hello
2 i i %d%%%d
```
```out
OK
OK
```

### 03 boundary 20 个实参配 20 个格式符
```in
1
20 i i i i i i i i i i i i i i i i i i i i %d%d%d%d%d%d%d%d%d%d%d%d%d%d%d%d%d%d%d%d
```
```out
OK
```
> 满规模的正确调用：20 个 `%d` 对 20 个 `i`，一个不多一个不少。

### 04 degenerate 只有 `%%`，没有实参
```in
2
0 %%
0 x%%
```
```out
OK
OK
```
> `%%` 不消耗实参，所以"0 个实参 + 只有 `%%`"是合法的，普通字符 `x` 不参与检查。

### 05 trap 提升规则让三种写法都合法
```in
3
1 i %hhd
1 i %c
1 f %f
```
```out
OK
OK
OK
```
> `%hhd` 和 `%c` 都期待 `int`（`char` 提升后的类型），`%f` 期待 `double`（`float` 提升后的类型）。把提升规则搞反，这三行会全判成 `BAD 1`。

### 06 trap 长度修饰符对不上
```in
2
1 l %lld
1 ll %d
```
```out
BAD 1
BAD 1
```
> `%lld` 要求 `long long`，实际是 `long`；`%d` 要求 `int`，实际是 `long long`。两种在 x86-64 上都能"跑出看似合理的结果"，但都是 UB。

### 07 normal 混合正确与错误
```in
4
3 i d i %d_%f_%d
1 z %zu
2 u l %u_%ld
0 lit
```
```out
OK
OK
OK
OK
```
