---json
{
  "id": "p-s2-string-functions-1",
  "title": "命令分发器：用 strlen / strcpy / strcat / strcmp 处理命令流",
  "difficulty": "L2",
  "knowledgePoints": ["s2-string-functions"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个命令行小工具要处理一串命令，每条命令占一行，形如 `命令名 参数...`。请读入所有命令，逐条执行并输出结果。

支持的命令如下：

| 命令 | 参数 | 输出 |
|---|---|---|
| `ADD a b` | 两个整数 | `a + b` |
| `MUL a b` | 两个整数 | `a * b` |
| `MAX a b` | 两个整数 | 其中较大的一个（相等时输出任意一个都一样） |
| `GREET name` | 一个不含空格的单词 | `Hello, name!`（注意逗号后有一个空格，最后有一个感叹号） |
| `LEN text` | 一个不含空格的单词 | `text` 的字符个数 |
| `CMP x y` | 两个不含空格的单词 | `x` 字典序小于 `y` 输出 `-1`，相等输出 `0`，大于输出 `1` |

这道题正好把四个字符串库函数都用上：

- **`strcmp`** 负责识别命令名——六个分支全部靠它判断，`==` 在这里完全不管用（它比的是地址）；
- **`strcpy` + `strcat`** 负责拼出 `Hello, name!`：先复制前缀，再把名字和感叹号追加到目标缓冲区里；
- **`strlen`** 负责 `LEN` 命令，直接数出字符个数。

`CMP` 命令还有一个坑：`strcmp` 只保证"负数 / 0 / 正数"，**不保证恰好是 -1 或 1**。所以必须自己把符号归一化，不能直接把 `strcmp` 的返回值打印出来。

## 输入格式
若干行，每行一条命令，格式为 `命令名 参数...`，各部分之间用一个空格分隔。命令名一定是上表六个之一，参数中不含空格。

## 输出格式
对每条命令输出一行结果：
- `ADD` / `MUL` / `MAX`：一个整数；
- `GREET`：`Hello, <name>!`；
- `LEN`：一个整数（字符个数，不含结尾的 `'\0'`）；
- `CMP`：`-1`、`0` 或 `1`。

## 数据范围
- 命令条数：1 ≤ n ≤ 20；
- 整数参数：-10000 ≤ a, b ≤ 10000，`ADD` 的结果不超过 ±20000，`MUL` 的结果不超过 ±10⁸，都在 `int` 范围内；
- `GREET` 的名字：1 到 10 个英文字母（大小写都可能出现）；
- `LEN` 的文本：1 到 30 个英文字母；
- `CMP` 的两个词：1 到 20 个英文字母；
- 所有参数都不含空格，因此可以用 `scanf("%15s", ...)` 之类的方式逐词读取，并记得限制宽度。

## 示例
### 示例 1
```in
ADD 3 4
MUL 6 7
MAX -5 -9
GREET Lin
LEN hello
CMP apple banana
```
```out
7
42
-5
Hello, Lin!
5
-1
```
> `apple` 与 `banana` 逐字符比较：`'a'` 小于 `'b'`，所以 `CMP` 输出 -1。

### 示例 2（边界：数值取到上下界，名字和文本只有一个字符）
```in
ADD -10000 10000
MUL -10000 10000
MAX 10000 -10000
GREET A
LEN a
CMP z z
```
```out
0
-100000000
10000
Hello, A!
1
0
```
> `-10000 × 10000 = -100000000`，仍然在 `int` 范围内；两个相同的字符串 `CMP` 必须输出 0（用 `==` 比较会得到"不相等"，从而输出 1）。

## 提示
### 第 1 层
先把命令名读进一个字符数组，再用 `strcmp` 和六个字符串常量逐个比较，命中哪个就处理哪个分支。读完命令名之后，剩下的参数可以继续用 `scanf` 按类型读。

### 第 2 层
`GREET` 要拼接三段内容，需要一块足够大的目标数组。做法是 `strcpy(line, "Hello, ");` 然后 `strcat(line, name);` 再 `strcat(line, "!");`——第一次用 `strcpy` 建立内容，后面都用 `strcat` 追加。数组至少要有 `7 + 10 + 1 + 1 = 19` 字节。

### 第 3 层
`CMP` 里先 `int c = strcmp(x, y);`，再用 `c < 0 ? -1 : (c > 0 ? 1 : 0)` 归一化。识别命令名时，每个分支都要用 `if (strcmp(cmd, "ADD") == 0)` 这种形式，千万别写 `cmd == "ADD"`。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

int main(void) {
    char cmd[16];
    while (scanf("%15s", cmd) == 1) {
        if (strcmp(cmd, "ADD") == 0) {
            int a, b;
            if (scanf("%d %d", &a, &b) != 2) {
                break;
            }
            printf("%d\n", a + b);
        } else if (strcmp(cmd, "MUL") == 0) {
            int a, b;
            if (scanf("%d %d", &a, &b) != 2) {
                break;
            }
            printf("%d\n", a * b);
        } else if (strcmp(cmd, "MAX") == 0) {
            int a, b;
            if (scanf("%d %d", &a, &b) != 2) {
                break;
            }
            printf("%d\n", a > b ? a : b);
        } else if (strcmp(cmd, "GREET") == 0) {
            char name[16];
            if (scanf("%15s", name) != 1) {
                break;
            }
            char line[64];
            strcpy(line, "Hello, ");
            strcat(line, name);
            strcat(line, "!");
            printf("%s\n", line);
        } else if (strcmp(cmd, "LEN") == 0) {
            char text[32];
            if (scanf("%31s", text) != 1) {
                break;
            }
            printf("%zu\n", strlen(text));
        } else if (strcmp(cmd, "CMP") == 0) {
            char x[32], y[32];
            if (scanf("%31s %31s", x, y) != 2) {
                break;
            }
            int c = strcmp(x, y);
            printf("%d\n", c < 0 ? -1 : (c > 0 ? 1 : 0));
        } else {
            printf("ERR\n");
        }
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

int main(void) {
    char cmd[16];
    while (scanf("%15s", cmd) == 1) {
        /* TODO:
         * 1. 用 strcmp 判断命令名，分出六个分支；
         * 2. 每个分支按类型读入参数并计算；
         * 3. GREET 用 strcpy + strcat 拼出 "Hello, name!"；
         * 4. CMP 用 strcmp 比较，把结果归一化成 -1 / 0 / 1。 */
        printf("TODO %s\n", cmd);
    }
    return 0;
}
```

## 复杂度
时间 O(L)：L 是所有输入字符的总数。每条命令只做常数次 `strcmp` 和一次输出，`strlen` / `strcpy` / `strcat` 的代价与命令长度成正比。
空间 O(1)：所有缓冲区都是固定大小的数组，最多几十字节。

## 常见错误
### 用 `==` 比较命令名 [WA]
`cmd == "ADD"` 比较的是两个地址：`cmd` 是数组首地址，`"ADD"` 是字面量的地址，二者永远不相等。结果所有命令都落进最后的 `else`，输出一堆 `ERR`。
```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    char cmd[16];
    while (scanf("%15s", cmd) == 1) {
        if (cmd == "ADD") {                 /* 错：比的是地址 */
            int a, b;
            if (scanf("%d %d", &a, &b) != 2) {
                break;
            }
            printf("%d\n", a + b);
        } else {
            printf("ERR\n");
        }
    }
    return 0;
}
```

### `GREET` 拼的时候漏掉前缀 [WA]
只写 `strcpy(line, name)` 再 `strcat(line, "!")`，结果就是 `Lin!`，而不是 `Hello, Lin!`。拼接顺序要严格按题目要求来。
```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    char cmd[16];
    while (scanf("%15s", cmd) == 1) {
        if (strcmp(cmd, "GREET") == 0) {
            char name[16];
            if (scanf("%15s", name) != 1) {
                break;
            }
            char line[64];
            strcpy(line, name);             /* 错：漏了 "Hello, " */
            strcat(line, "!");
            printf("%s\n", line);
        } else {
            int a, b;
            if (scanf("%d %d", &a, &b) != 2) {
                break;
            }
            printf("%d\n", a);
        }
    }
    return 0;
}
```

### `GREET` 的缓冲区太小 [WA|RE]
`"Hello, " + 名字 + "!" + '\0'` 最多需要 19 字节。如果只开 16 字节，遇到 10 个字母的名字时 `strcat` 就会写到数组外面去。
注意这条错误的判定会随输入变化：名字短时结果就已经算错了（WA），名字长到撑爆 16 字节时才越界崩溃（RE）。
```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    char cmd[16];
    while (scanf("%15s", cmd) == 1) {
        if (strcmp(cmd, "ADD") == 0) {
            int a, b;
            if (scanf("%d %d", &a, &b) != 2) {
                break;
            }
            printf("%d\n", a + b);
        } else if (strcmp(cmd, "MUL") == 0) {
            int a, b;
            if (scanf("%d %d", &a, &b) != 2) {
                break;
            }
            printf("%d\n", a * b);
        } else if (strcmp(cmd, "MAX") == 0) {
            int a, b;
            if (scanf("%d %d", &a, &b) != 2) {
                break;
            }
            printf("%d\n", a > b ? a : b);
        } else if (strcmp(cmd, "GREET") == 0) {
            char name[16];
            if (scanf("%15s", name) != 1) {
                break;
            }
            char line[16];                  /* 太短：最多需要 19 字节 */
            strcpy(line, "Hello, ");
            strcat(line, name);
            strcat(line, "!");
            printf("%s\n", line);
        } else if (strcmp(cmd, "LEN") == 0) {
            char text[32];
            if (scanf("%31s", text) != 1) {
                break;
            }
            printf("%zu\n", strlen(text));
        } else if (strcmp(cmd, "CMP") == 0) {
            char x[32], y[32];
            if (scanf("%31s %31s", x, y) != 2) {
                break;
            }
            int c = strcmp(x, y);
            printf("%d\n", c < 0 ? -1 : (c > 0 ? 1 : 0));
        }
    }
    return 0;
}
```

### 忘记 `#include <string.h>` [CE]
`strcmp` / `strcpy` / `strcat` / `strlen` 都需要 `<string.h>` 里的声明。漏掉头文件，编译器会直接报"调用未声明的函数"，一个用例都跑不起来。
```c file=main.c expect=CE
#include <stdio.h>

int main(void) {
    char cmd[16];
    while (scanf("%15s", cmd) == 1) {
        if (strcmp(cmd, "LEN") == 0) {      /* strcmp 没有声明 */
            char text[32];
            if (scanf("%31s", text) != 1) {
                break;
            }
            printf("%zu\n", strlen(text));
        }
    }
    return 0;
}
```

### 直接把 `strcmp` 的返回值打印出来 [WA]
标准只保证符号，不保证数值。本平台恰好返回 -1/0/1，看起来"能用"，但换一个实现可能返回 `'a' - 'b'` 这样的差值。必须自己归一化成 -1 / 0 / 1。

## 测试用例
### 01 sample 示例 1
```in
ADD 3 4
MUL 6 7
MAX -5 -9
GREET Lin
LEN hello
CMP apple banana
```
```out
7
42
-5
Hello, Lin!
5
-1
```

### 02 sample 示例 2
```in
ADD -10000 10000
MUL -10000 10000
MAX 10000 -10000
GREET A
LEN a
CMP z z
```
```out
0
-100000000
10000
Hello, A!
1
0
```

### 03 boundary 二十条命令
```in
ADD 10000 10000
MUL 10000 10000
MAX 0 0
GREET abcdefghij
LEN abcdefghijklmnopqrst
CMP abc abd
ADD -10000 -10000
MUL -10000 -10000
MAX -1 1
GREET Z
LEN z
CMP a ab
ADD 0 0
MUL 0 10000
MAX 7 7
GREET Q
LEN abcdefghijklmnopqrstuvwxyz
CMP abcdefghijklmnopqrst abcdefghijklmnopqrst
ADD 9999 -9999
MAX -10000 -10000
```
```out
20000
100000000
0
Hello, abcdefghij!
20
-1
-20000
100000000
1
Hello, Z!
1
-1
0
0
7
Hello, Q!
26
0
0
-10000
```

### 04 degenerate 只有一条命令
```in
LEN x
```
```out
1
```

### 05 trap CMP 的两个字符串完全相同
```in
CMP abc abc
CMP abc abd
CMP abd abc
```
```out
0
-1
1
```
> 用 `==` 比较的实现会在第一行输出 1，而不是 0。

### 06 trap CMP 的前缀关系
```in
CMP ab abc
CMP abc ab
CMP a ab
```
```out
-1
1
-1
```
> 短的那个是长的那个的前缀时，短的更小：长度短的字符串先遇到 `'\0'`，而 `'\0'` 小于任何字母。

### 07 normal GREET 与 LEN 组合
```in
GREET DeepSeek
LEN DeepSeek
GREET C
LEN abcdefghij
```
```out
Hello, DeepSeek!
8
Hello, C!
10
```

### 08 trap MAX 的参数顺序与相等
```in
MAX 5 3
MAX 3 5
MAX 5 5
MUL -3 -4
ADD -7 7
```
```out
5
5
5
12
0
```
> `MAX` 不能假设第一个参数更大，也不能把"相等"判错。
