---json
{
  "id": "p-s7-iv-keywords-1",
  "title": "头文件被 8 个翻译单元包含后：static 与 extern 各留下几份符号",
  "difficulty": "L5",
  "knowledgePoints": ["s7-iv-keywords"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
面试官给你看一个小工程：头文件 `counter.h` 被 **每个** `.c` 文件包含，工程一共 `F` 个源文件。头文件的内容是：

```c
/* counter.h：被 F 个 .c 文件各包含一次 */
extern int shared_hits;      /* 声明：真正的定义在 globals.c，全程序一份 */

static int file_hits;        /* 内部链接：每个翻译单元各有一份 */

static void bump(void) {     /* 内部链接：每个翻译单元各有一份 */
    file_hits++;
    shared_hits++;
}
```

```c
/* globals.c */
int shared_hits;             /* 定义：全程序唯一一份 */

/* util.c 里还有一个普通函数 */
void touch(void) {
    static int calls;        /* 函数内的 static：全程序一份 */
    calls++;
    shared_hits++;
}
```

问题来了：`bump` 在 8 个文件里各有一份，所以它改的 `file_hits` 也是 8 个独立的变量；`touch` 全程序只有一份，所以它的 `calls` 只有一份。**同名不等于同一块内存**——这正是 `static` 的链接属性决定的。

（真实工程里为了让每个文件都真的用到 `file_hits`，通常还会加一个包装函数，否则编译器会提示"未使用的 static 变量"；本题只关心符号的份数，不展开编译细节。）

现在给你一串按时间顺序发生的事件，请模拟这个工程，报告每个计数器的值。

### 事件
- `<f> bump`：第 `f` 个文件调用它自己那份 `bump`。效果：**该文件的** `file_hits` 加 1，`shared_hits` 加 1。
- `<f> touch`：第 `f` 个文件调用 `touch`。效果：`calls`（即会话计数）加 1，`shared_hits` 加 1。**`file_hits` 不变**。
- `<f> show`：查询第 `f` 个文件的 `file_hits`，输出一行 `file <f> hits=<值>`。

处理完所有事件后，再输出三行：

```
shared <shared_hits 的最终值>
session <touch 被调用的总次数>
sum <所有文件的 file_hits 之和>
```

`sum` 等于所有文件各自的 `file_hits` 相加——如果把它写成"一个全局计数器"，`sum` 也许碰巧对，但 `show` 一定会错。

## 输入格式
第一行两个整数 `F` 和 `n`：源文件个数、事件个数。

接下来 `n` 行，每行 `<f> <op>`：

- `f` 是 1 到 `F` 的整数，表示第几个源文件；
- `op` 是 `bump`、`touch`、`show` 之一。

## 输出格式
按事件顺序，对每个 `show` 输出一行：

```
file <f> hits=<该文件当前的 file_hits>
```

全部事件处理完后输出三行：

```
shared <shared_hits>
session <touch 的次数>
sum <所有 file_hits 之和>
```

## 数据范围
1 ≤ F ≤ 8
1 ≤ n ≤ 500
1 ≤ f ≤ F
`op` ∈ {`bump`, `touch`, `show`}

`file_hits` 每个最多 500，`shared_hits` 最多 500，都在 `int` 范围内。输出最多 500 + 3 = 503 行，远小于 64KB。

## 示例
### 示例 1
```in
3 8
1 bump
1 bump
2 bump
3 show
1 show
2 touch
1 show
3 touch
```
```out
file 3 hits=0
file 1 hits=2
file 1 hits=2
shared 5
session 2
sum 3
```
> 前三个事件都是 `bump`：文件 1 自己加了两次、文件 2 加了一次，所以文件 3 查询时是 0，文件 1 是 2。`2 touch` 只增加会话计数和 `shared_hits`，文件 1 的 `file_hits` 不变，所以第二、第三次查询都是 2。总共 3 次 `bump` + 2 次 `touch`，`shared_hits` 是 5。

### 示例 2（边界：只有一个源文件，`static` 与 `extern` 看不出区别）
```in
1 4
1 bump
1 bump
1 show
1 touch
```
```out
file 1 hits=2
shared 3
session 1
sum 2
```
> `F = 1` 时"每个翻译单元一份"和"全程序一份"没有差别，这正是只有多文件工程才能暴露 `static` 语义的原因。两次 `bump` 让文件 1 的 `file_hits` 是 2，`touch` 不影响它。

## 提示
### 第 1 层
先别管输出格式，把"内存里有几个计数器"数清楚：`file_hits` 有 `F` 个（每个文件一个），`shared_hits` 有 1 个，`touch` 里的 `calls` 有 1 个。三个东西的"份数"不同，是本题唯一的难点。

### 第 2 层
`bump` 在头文件里、又是 `static`，所以每个包含它的 `.c` 都得到一份独立的 `file_hits` 副本；`bump` 里的 `shared_hits` 是 `extern` 声明的，指向 `globals.c` 里唯一的那份。`touch` 是普通函数，只定义一次，它的 `static int calls` 也只有一份——**函数只有一份，局部 static 就只有一份**。

### 第 3 层
用一个长度 `F` 的数组存 `file_hits`，用两个 `int` 存 `shared_hits` 和会话计数。`show` 查数组下标 `f - 1`；`sum` 在最后遍历数组求和，不要用"事件里 `bump` 的总数"直接代替（逻辑上相等，但那就没有验证数组了）。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXF 8

int main(void) {
    int f = 0;
    int n = 0;
    if (scanf("%d %d", &f, &n) != 2 || f < 1 || f > MAXF || n < 1 || n > 500) {
        return 0;
    }

    int file_hits[MAXF] = { 0 };   /* 每个翻译单元各一份，共 f 份 */
    int shared = 0;                /* extern：全程序一份 */
    int session = 0;                /* touch 的 static 局部：全程序一份 */

    for (int i = 0; i < n; i++) {
        int idx = 0;
        char op[8];
        if (scanf("%d %7s", &idx, op) != 2 || idx < 1 || idx > f) {
            return 0;
        }

        if (strcmp(op, "bump") == 0) {
            file_hits[idx - 1]++;
            shared++;
        } else if (strcmp(op, "touch") == 0) {
            session++;
            shared++;
        } else if (strcmp(op, "show") == 0) {
            printf("file %d hits=%d\n", idx, file_hits[idx - 1]);
        } else {
            return 0;
        }
    }

    int sum = 0;
    for (int i = 0; i < f; i++) {
        sum += file_hits[i];
    }
    printf("shared %d\n", shared);
    printf("session %d\n", session);
    printf("sum %d\n", sum);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXF 8

int main(void) {
    int f = 0;
    int n = 0;
    if (scanf("%d %d", &f, &n) != 2 || f < 1 || f > MAXF || n < 1 || n > 500) {
        return 0;
    }

    int file_hits = 0;             /* TODO: 每个翻译单元一份，应该是一个长度 f 的数组 */
    int shared = 0;
    int session = 0;

    for (int i = 0; i < n; i++) {
        int idx = 0;
        char op[8];
        if (scanf("%d %7s", &idx, op) != 2 || idx < 1 || idx > f) {
            return 0;
        }

        if (strcmp(op, "bump") == 0) {
            file_hits++;           /* TODO: 应该只加第 idx 个文件的计数 */
            shared++;
        } else if (strcmp(op, "touch") == 0) {
            session++;
            shared++;
        } else if (strcmp(op, "show") == 0) {
            printf("file %d hits=%d\n", idx, file_hits);   /* TODO: 查第 idx 个文件 */
        } else {
            return 0;
        }
    }

    printf("shared %d\n", shared);
    printf("session %d\n", session);
    printf("sum %d\n", file_hits);
    return 0;
}
```

## 复杂度
时间 O(n + F)：事件扫一遍，最后求和再扫一遍文件数组。
空间 O(F)：一个长度 `F` 的计数器数组。

## 常见错误
### 把头文件里的 static 变量当成全程序一份 [WA]
`static int file_hits;` 在头文件里，每个包含它的 `.c` 都会得到一份**独立**的副本，所以 F 个文件有 F 个 `file_hits`。只用一个全局计数器，`show` 会把别的文件的 `bump` 也算进来。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    int f = 0;
    int n = 0;
    if (scanf("%d %d", &f, &n) != 2) {
        return 0;
    }
    int file_hits = 0;             /* 错：只有一个计数器 */
    int shared = 0;
    int session = 0;
    for (int i = 0; i < n; i++) {
        int idx = 0;
        char op[8];
        if (scanf("%d %7s", &idx, op) != 2) {
            return 0;
        }
        if (strcmp(op, "bump") == 0) {
            file_hits++;
            shared++;
        } else if (strcmp(op, "touch") == 0) {
            session++;
            shared++;
        } else {
            printf("file %d hits=%d\n", idx, file_hits);
        }
    }
    printf("shared %d\n", shared);
    printf("session %d\n", session);
    printf("sum %d\n", file_hits);
    return 0;
}
```

### 以为 touch 也会改本文件的 file_hits [WA]
`touch` 是普通函数，只定义一次，它的 `static int calls` 只有一份；`touch` 的函数体里根本没有碰 `file_hits`。把 `touch` 当成"该文件的 bump"，会让 `sum` 和之后的 `show` 都偏大。
```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXF 8

int main(void) {
    int f = 0;
    int n = 0;
    if (scanf("%d %d", &f, &n) != 2) {
        return 0;
    }
    int file_hits[MAXF] = { 0 };
    int shared = 0;
    int session = 0;
    for (int i = 0; i < n; i++) {
        int idx = 0;
        char op[8];
        if (scanf("%d %7s", &idx, op) != 2) {
            return 0;
        }
        if (strcmp(op, "bump") == 0) {
            file_hits[idx - 1]++;
            shared++;
        } else if (strcmp(op, "touch") == 0) {
            file_hits[idx - 1]++;      /* 错：touch 不碰 file_hits */
            session++;
            shared++;
        } else {
            printf("file %d hits=%d\n", idx, file_hits[idx - 1]);
        }
    }
    int sum = 0;
    for (int i = 0; i < f; i++) {
        sum += file_hits[i];
    }
    printf("shared %d\n", shared);
    printf("session %d\n", session);
    printf("sum %d\n", sum);
    return 0;
}
```

### 以为 bump 只改本文件的计数 [WA]
`shared_hits` 是 `extern` 声明的，指向全程序唯一那份定义；`bump` 虽然每个文件一份，但它改的 `shared_hits` 是同一个对象。忘了给 `shared_hits` 加 1，最后的 `shared` 行会偏小，而 `show` 反而全对——这种"只错一行"的结果最容易被忽略。
```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXF 8

int main(void) {
    int f = 0;
    int n = 0;
    if (scanf("%d %d", &f, &n) != 2) {
        return 0;
    }
    int file_hits[MAXF] = { 0 };
    int shared = 0;
    int session = 0;
    for (int i = 0; i < n; i++) {
        int idx = 0;
        char op[8];
        if (scanf("%d %7s", &idx, op) != 2) {
            return 0;
        }
        if (strcmp(op, "bump") == 0) {
            file_hits[idx - 1]++;      /* 错：忘了 shared++ */
        } else if (strcmp(op, "touch") == 0) {
            session++;
            shared++;
        } else {
            printf("file %d hits=%d\n", idx, file_hits[idx - 1]);
        }
    }
    int sum = 0;
    for (int i = 0; i < f; i++) {
        sum += file_hits[i];
    }
    printf("shared %d\n", shared);
    printf("session %d\n", session);
    printf("sum %d\n", sum);
    return 0;
}
```

### 以为 touch 里的 static 局部变量也按文件各一份 [WA]
`static int calls;` 在 `touch` 里，而 `touch` 是普通函数（外部链接、只定义一次），所以 `calls` 全程序只有一份。只有**函数本身**也带 `static`（或在头文件里定义）时，函数和它的局部静态变量才会按翻译单元复制。这是本题最容易反直觉的一处。

### 用 bump 的总次数代替 sum [WA]
`sum` 是"所有文件各自的 `file_hits` 之和"，虽然数值上等于 `bump` 的总次数，但直接把 `bump` 计数打印出来就没有验证数组的下标逻辑；一旦 `touch` 或初始值出问题，`show` 已经错了而 `sum` 还是对的，掩盖了 bug。

## 测试用例
### 01 sample 示例 1
```in
3 8
1 bump
1 bump
2 bump
3 show
1 show
2 touch
1 show
3 touch
```
```out
file 3 hits=0
file 1 hits=2
file 1 hits=2
shared 5
session 2
sum 3
```

### 02 sample 示例 2
```in
1 4
1 bump
1 bump
1 show
1 touch
```
```out
file 1 hits=2
shared 3
session 1
sum 2
```

### 03 boundary F 取最大值 8，跨文件互不干扰
```in
8 9
1 bump
8 bump
1 show
8 show
8 show
5 touch
1 show
2 show
2 touch
```
```out
file 1 hits=1
file 8 hits=1
file 8 hits=1
file 1 hits=1
file 2 hits=0
shared 4
session 2
sum 2
```

### 04 degenerate 只有一次查询，所有计数器都是 0
```in
1 1
1 show
```
```out
file 1 hits=0
shared 0
session 0
sum 0
```

### 05 trap touch 不碰 file_hits
```in
3 8
1 touch
1 show
2 touch
2 show
3 show
1 bump
2 show
3 touch
```
```out
file 1 hits=0
file 2 hits=0
file 3 hits=0
file 2 hits=0
shared 4
session 3
sum 1
```

### 06 trap 同一个文件连续 bump 才算同一个计数器
```in
2 10
1 bump
1 bump
2 bump
1 show
2 show
1 bump
2 show
1 show
1 bump
1 show
```
```out
file 1 hits=2
file 2 hits=1
file 2 hits=1
file 1 hits=3
file 1 hits=4
shared 5
session 0
sum 5
```

### 07 normal 四个文件混合操作
```in
4 12
1 bump
2 touch
3 bump
4 touch
1 show
2 show
3 show
4 show
1 bump
2 bump
3 touch
4 bump
```
```out
file 1 hits=1
file 2 hits=0
file 3 hits=1
file 4 hits=0
shared 8
session 3
sum 5
```
