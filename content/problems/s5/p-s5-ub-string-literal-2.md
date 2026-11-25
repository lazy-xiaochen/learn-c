---json
{
  "id": "p-s5-ub-string-literal-2",
  "title": "字面量可写性审计：声明、写入序列与最终内容",
  "difficulty": "L3",
  "knowledgePoints": ["s5-ub-string-literal"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
"这段代码能不能改这个字符串"是初学者最常问的问题，答案完全取决于**字符串存在哪里**。本题要求你实现一个小审计器：读入一个声明和随后的一串操作，逐条判断它们是否合法，并输出每次"打印"时看到的内容。

三种声明：

| 声明写法 | 首行输入 | 目标住在哪里 | 能否写 |
|---|---|---|---|
| `char *p = "text";` | `lit` | `p` 指向只读数据段的字面量 | 不能：写是**未定义行为** |
| `const char *p = "text";` | `cst` | 同上，但类型里带 `const` | 不能：写是**编译错误** |
| `char a[cap] = "text";` | `arr cap` | `cap` 个字节的数组，内容在栈上 | 能：写第 `pos` 个字节（`0 ≤ pos < cap`） |

两种操作：

- `p`：打印当前看到的内容。`lit` / `cst` 永远打印 `text`；`arr` 打印从下标 0 开始、到第一个 `'\0'` 为止的字符。如果 `cap` 个字节里**一个 `'\0'` 都没有**（比如初始化式刚好填满数组，或结尾的 `'\0'` 被写掉了），就把 `cap` 个字符全部打印出来，并在后面加一个空格和 `no-nul`；
- `w pos ch`：把字符 `ch` 写到下标 `pos`。

判定规则：

1. `lit` 的第一次 `w` 是未定义行为：输出 `UB <k>` 并**结束整个程序**，其中 `k` 是这次操作在**所有操作**里的序号（从 1 开始，`p` 也占一个号）；
2. `cst` 的第一次 `w` 是编译错误：输出 `CE <k>` 并结束；
3. `arr` 的 `w` 全部合法（输入保证 `0 ≤ pos < cap`），悄悄改掉那个字节，不输出任何东西；
4. 正常走完所有操作就结束，不额外输出。

## 输入格式
第一行：`lit`、`cst` 或 `arr <cap>`（`cap` 是一个整数）。

第二行：初始内容 `text`，只含小写字母，长度 1 到 60。

第三行：操作个数 `q`。

接下来 `q` 行，每行是 `p` 或 `w <pos> <ch>`（`ch` 是一个可见 ASCII 字符）。

## 输出格式
按操作顺序输出：

- 每遇到一次 `p`，输出一行 `S <内容>`（可能带 ` no-nul` 后缀）；
- 遇到非法的 `w`，输出 `UB <k>` 或 `CE <k>` 后立即结束；
- 合法的 `w` 不产生任何输出。

## 数据范围
- `1 ≤ q ≤ 100`；
- `1 ≤ |text| ≤ 60`；
- `arr` 的 `cap` 满足 `|text| ≤ cap ≤ 60`；
- `w` 的 `pos` 满足 `0 ≤ pos < cap`（`lit` / `cst` 的 `pos` 也在 0 到 59 之间）；
- 输出最多 100 行。

## 示例
### 示例 1
```in
arr 8
abc
4
w 0 X
p
w 1 Y
p
```
```out
S Xbc
S XYc
```
> `char a[8] = "abc";` 之后数组里是 `a b c \0` 加四个填充的 `\0`。两次写都作用在自己的数组上，完全合法；打印时读到第一个 `\0` 就停，所以只显示 3 个字符。

### 示例 2（边界：写掉结尾的 `'\0'`）
```in
arr 6
abcd
4
w 1 X
p
w 4 !
p
```
```out
S aXcd
S aXcd!
```
> `cap = 6`、`text = "abcd"`，初始化后是 `a b c d \0 \0`。最后一次把下标 4 的 `'\0'` 写成了 `'!'`，数组里还剩一个 `'\0'` 在下标 5，所以内容变成 `aXcd!` 且仍然有结尾——这一行不带 `no-nul`。若 `cap` 恰好等于 4，同样的操作就会把唯一的 `\0` 写掉，输出变成 `aXcd! no-nul`。

## 提示
### 第 1 层
先把"当前内容"建模成一个字节数组：`arr` 用 `cap` 个字节（`text` 抄进去，其余补 0），`lit` / `cst` 永远只有 `text`。然后每条操作改这个模型，不要把声明真的写进代码里——那样写 `lit` 会当场崩溃，程序就测不出后面的东西了。

### 第 2 层
打印 `arr` 时要自己找结尾：从下标 0 扫到 `cap`，遇到 0 就停；如果扫到 `cap` 都没遇到 0，说明没有结尾，输出 ` no-nul`。`printf("%s", ...)` 在"没有结尾"的情况下会一路读出去，不能用。

### 第 3 层
序号 `k` 是"第几个操作"，`p` 也要占号。用一个从 1 开始、每次操作都加 1 的计数器，别单独给写操作计数。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXQ 100

int main(void) {
    char kind[8];
    int cap;
    if (scanf("%7s", kind) != 1) {
        return 0;
    }
    if (strcmp(kind, "arr") == 0) {
        if (scanf("%d", &cap) != 1 || cap < 1 || cap > 60) {
            return 0;
        }
    } else {
        cap = 0;
    }
    char text[64];
    if (scanf("%63s", text) != 1) {
        return 0;
    }
    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > MAXQ) {
        return 0;
    }

    unsigned char mem[64];
    memset(mem, 0, sizeof mem);
    if (strcmp(kind, "arr") == 0) {
        int len = (int)strlen(text);
        for (int k = 0; k < len && k < cap; k++) {
            mem[k] = (unsigned char)text[k];
        }
    }

    for (int k = 1; k <= q; k++) {
        char op[8];
        if (scanf("%7s", op) != 1) {
            return 0;
        }
        if (strcmp(op, "p") == 0) {
            if (strcmp(kind, "arr") != 0) {
                printf("S %s\n", text);          /* 字面量：永远是原样 */
            } else {
                int end = 0;
                while (end < cap && mem[end] != 0) {
                    end++;
                }
                printf("S ");
                for (int i = 0; i < end; i++) {
                    putchar(mem[i]);
                }
                if (end == cap) {
                    printf(" no-nul");           /* 整个数组里都没有 '\0' */
                }
                printf("\n");
            }
        } else {
            int pos;
            char ch[8];
            if (scanf("%d %7s", &pos, ch) != 2) {
                return 0;
            }
            if (strcmp(kind, "lit") == 0) {
                printf("UB %d\n", k);            /* 写只读区：未定义行为 */
                return 0;
            }
            if (strcmp(kind, "cst") == 0) {
                printf("CE %d\n", k);            /* const：编译期就过不去 */
                return 0;
            }
            if (pos < 0 || pos >= cap) {
                return 0;
            }
            mem[pos] = (unsigned char)ch[0];
        }
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXQ 100

int main(void) {
    char kind[8];
    int cap;
    if (scanf("%7s", kind) != 1) {
        return 0;
    }
    if (strcmp(kind, "arr") == 0) {
        if (scanf("%d", &cap) != 1) {
            return 0;
        }
    } else {
        cap = 0;
    }
    char text[64];
    if (scanf("%63s", text) != 1) {
        return 0;
    }
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }

    unsigned char mem[64];
    memset(mem, 0, sizeof mem);
    if (strcmp(kind, "arr") == 0) {
        int len = (int)strlen(text);
        for (int k = 0; k < len && k < cap; k++) {
            mem[k] = (unsigned char)text[k];
        }
    }

    for (int k = 1; k <= q; k++) {
        char op[8];
        if (scanf("%7s", op) != 1) {
            return 0;
        }
        if (strcmp(op, "p") == 0) {
            printf("S %s\n", text);              /* TODO: arr 要打印自己的字节，还要处理 no-nul */
        } else {
            int pos;
            char ch[8];
            if (scanf("%d %7s", &pos, ch) != 2) {
                return 0;
            }
            if (strcmp(kind, "lit") == 0) {
                /* TODO: 写字符串字面量是未定义行为，要输出 UB 并停下 */
            } else if (strcmp(kind, "cst") == 0) {
                /* TODO: const 是编译错误，要输出 CE 并停下 */
            } else if (pos >= 0 && pos < cap) {
                mem[pos] = (unsigned char)ch[0];
            }
        }
    }
    return 0;
}
```

## 复杂度
时间 O(q × cap)：每次打印最多扫 `cap` 个字节。
空间 O(cap)：一个字节数组。

## 常见错误
### 认为写 `lit` 只是"改不动"，不是 UB [WA]
把 `lit` 的写当成"没有效果、跳过"是本题最常见的错误。跳过之后程序会继续跑，`p` 照样打印 `text`，最后**一行 UB 都不输出**；而正确行为是第一次写就报告 `UB` 并停下。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXQ 100

int main(void) {
    char kind[8];
    int cap;
    if (scanf("%7s", kind) != 1) {
        return 0;
    }
    if (strcmp(kind, "arr") == 0) {
        if (scanf("%d", &cap) != 1) {
            return 0;
        }
    } else {
        cap = 0;
    }
    char text[64];
    if (scanf("%63s", text) != 1) {
        return 0;
    }
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    unsigned char mem[64];
    memset(mem, 0, sizeof mem);
    if (strcmp(kind, "arr") == 0) {
        int len = (int)strlen(text);
        for (int k = 0; k < len && k < cap; k++) {
            mem[k] = (unsigned char)text[k];
        }
    }
    for (int k = 1; k <= q; k++) {
        char op[8];
        if (scanf("%7s", op) != 1) {
            return 0;
        }
        if (strcmp(op, "p") == 0) {
            if (strcmp(kind, "arr") != 0) {
                printf("S %s\n", text);
            } else {
                int end = 0;
                while (end < cap && mem[end] != 0) {
                    end++;
                }
                printf("S ");
                for (int i = 0; i < end; i++) {
                    putchar(mem[i]);
                }
                if (end == cap) {
                    printf(" no-nul");
                }
                printf("\n");
            }
        } else {
            int pos;
            char ch[8];
            if (scanf("%d %7s", &pos, ch) != 2) {
                return 0;
            }
            if (strcmp(kind, "cst") == 0) {
                printf("CE %d\n", k);
                return 0;
            }
            if (strcmp(kind, "arr") == 0 && pos >= 0 && pos < cap) {
                mem[pos] = (unsigned char)ch[0];
            }
            /* 错：lit 的写被静默忽略，永远不会输出 UB */
        }
    }
    return 0;
}
```

### 行号只给写操作计数 [WA]
题目要的是"第几个操作"，`p` 也占号。用一个只在 `w` 分支自增的计数器，`p p w 2 X` 会报 `UB 1` 而不是 `UB 3`。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXQ 100

int main(void) {
    char kind[8];
    int cap;
    if (scanf("%7s", kind) != 1) {
        return 0;
    }
    if (strcmp(kind, "arr") == 0) {
        if (scanf("%d", &cap) != 1) {
            return 0;
        }
    } else {
        cap = 0;
    }
    char text[64];
    if (scanf("%63s", text) != 1) {
        return 0;
    }
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    unsigned char mem[64];
    memset(mem, 0, sizeof mem);
    if (strcmp(kind, "arr") == 0) {
        int len = (int)strlen(text);
        for (int k = 0; k < len && k < cap; k++) {
            mem[k] = (unsigned char)text[k];
        }
    }
    int writes = 0;
    for (int k = 1; k <= q; k++) {
        char op[8];
        if (scanf("%7s", op) != 1) {
            return 0;
        }
        if (strcmp(op, "p") == 0) {
            if (strcmp(kind, "arr") != 0) {
                printf("S %s\n", text);
            } else {
                int end = 0;
                while (end < cap && mem[end] != 0) {
                    end++;
                }
                printf("S ");
                for (int i = 0; i < end; i++) {
                    putchar(mem[i]);
                }
                if (end == cap) {
                    printf(" no-nul");
                }
                printf("\n");
            }
        } else {
            int pos;
            char ch[8];
            if (scanf("%d %7s", &pos, ch) != 2) {
                return 0;
            }
            writes++;                          /* 错：只给写操作计数 */
            if (strcmp(kind, "lit") == 0) {
                printf("UB %d\n", writes);
                return 0;
            }
            if (strcmp(kind, "cst") == 0) {
                printf("CE %d\n", writes);
                return 0;
            }
            if (pos >= 0 && pos < cap) {
                mem[pos] = (unsigned char)ch[0];
            }
        }
    }
    return 0;
}
```

### 把 `const` 也报成运行期 UB [WA]
`const char *p` 上的写**编译期就被拒绝**（`error: read-only variable is not assignable`），根本不会有可执行文件。把它当成运行期崩溃、输出 `UB`，`cst` 的用例答案就全错了；反过来把 `lit` 报成 `CE` 也一样错。类型系统能拦住的错误优先在编译期拦。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXQ 100

int main(void) {
    char kind[8];
    int cap;
    if (scanf("%7s", kind) != 1) {
        return 0;
    }
    if (strcmp(kind, "arr") == 0) {
        if (scanf("%d", &cap) != 1) {
            return 0;
        }
    } else {
        cap = 0;
    }
    char text[64];
    if (scanf("%63s", text) != 1) {
        return 0;
    }
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    unsigned char mem[64];
    memset(mem, 0, sizeof mem);
    if (strcmp(kind, "arr") == 0) {
        int len = (int)strlen(text);
        for (int k = 0; k < len && k < cap; k++) {
            mem[k] = (unsigned char)text[k];
        }
    }
    for (int k = 1; k <= q; k++) {
        char op[8];
        if (scanf("%7s", op) != 1) {
            return 0;
        }
        if (strcmp(op, "p") == 0) {
            if (strcmp(kind, "arr") != 0) {
                printf("S %s\n", text);
            } else {
                int end = 0;
                while (end < cap && mem[end] != 0) {
                    end++;
                }
                printf("S ");
                for (int i = 0; i < end; i++) {
                    putchar(mem[i]);
                }
                if (end == cap) {
                    printf(" no-nul");
                }
                printf("\n");
            }
        } else {
            int pos;
            char ch[8];
            if (scanf("%d %7s", &pos, ch) != 2) {
                return 0;
            }
            if (strcmp(kind, "arr") != 0) {
                printf("UB %d\n", k);          /* 错：cst 应该是 CE */
                return 0;
            }
            if (pos >= 0 && pos < cap) {
                mem[pos] = (unsigned char)ch[0];
            }
        }
    }
    return 0;
}
```

### 用 `printf("%s", mem)` 打印数组 [RE]
`arr` 的字节里**可能没有** `'\0'`（初始化式刚好填满，或结尾被写掉），这时 `%s` 会一路读到数组外面，本平台的 ASan 会判 `RE`（栈缓冲区越界读）。必须自己扫 `cap` 个字节并判断有没有结尾。

### 忘了 `cap` 刚好等于 `|text|` 的情况 [WA]
`char a[3] = "abc";` 是合法的 C：初始化式把 3 个字节填满，`'\0'` 被丢掉。此时**一开始**就没有结尾，第一次 `p` 就要输出 `abc no-nul`，而不是等到有人写掉结尾才出现。把"没有结尾"当成异常路径处理（而不是正常的一种状态）就会漏掉它。

## 测试用例
### 01 sample 示例 1
```in
arr 8
abc
4
w 0 X
p
w 1 Y
p
```
```out
S Xbc
S XYc
```

### 02 sample 示例 2
```in
arr 6
abcd
4
w 1 X
p
w 4 !
p
```
```out
S aXcd
S aXcd!
```

### 03 boundary 60 字节的数组，装满了没有结尾
```in
arr 60
abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefgh
3
p
w 59 Z
p
```
```out
S abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefgh no-nul
S abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefgZ no-nul
```
> `cap` 正好等于 `text` 的长度，数组里一个 `'\0'` 都没有，所以两次打印都带 ` no-nul`。这是 `cap == |text|` 的边界。

### 04 degenerate 字面量只打印一次
```in
lit
hello
1
p
```
```out
S hello
```
> 没有任何写操作，`lit` 的程序完全合法，只输出一次内容。

### 05 trap 写在结尾之后看不见
```in
arr 10
ab
4
w 5 X
p
w 2 Y
p
```
```out
S ab
S abY
```
> 第一次写落在下标 5，而下标 2 处本来就有一个 `'\0'`，打印到那里就停了，所以 `X` 完全看不见；第二次写把下标 2 的 `'\0'` 换成 `Y`，内容才变成 `abY`（此时结尾在下标 3 的填充 `'\0'` 上）。

### 06 trap UB 出现在最后一条操作
```in
lit
hello
4
p
p
w 2 X
```
```out
S hello
S hello
UB 3
```
> 两次打印都正常，第三次操作才是写。序号是 3 而不是 1——`p` 也占号。

### 07 normal 先改中间再改结尾
```in
arr 6
abcde
5
w 0 Z
p
w 5 Q
p
p
```
```out
S Zbcde
S ZbcdeQ no-nul
S ZbcdeQ no-nul
```

### 08 trap `const` 是编译错误，不是运行期崩溃
```in
cst
abc
3
p
w 1 Z
p
```
```out
S abc
CE 2
```
> `const char *p = "abc";` 之后 `p[1] = 'Z'` 在编译期就报 `read-only variable is not assignable`，连可执行文件都生成不了。第一次 `p` 正常打印，第二次操作（写）报 `CE 2`。
