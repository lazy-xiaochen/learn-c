---json
{
  "id": "p-s3-inline-2",
  "title": "两个窗口共用一个取号机：inline 定义该放头文件还是 .c 文件",
  "difficulty": "L4",
  "knowledgePoints": ["s3-inline"],
  "special": null,
  "judge": { "mode": "multi", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
图书馆要上线一个"叫号"小系统，工程分成四个文件：

- `queue.h`：对外接口（取号、B 窗口叫号）；
- `ticket.c`：取号机的实现；
- `desk.c`：B 窗口的业务；
- `main.c`：读入业务序列，输出每个业务拿到的号。

规则很简单：**全馆只有一台取号机，号码从 1 开始依次递增，永远不会重复。** A 窗口的业务由 `main.c` 直接取号，B 窗口的业务走 `desk.c`，但两边**必须共用同一个号码机**。

现在程序能编译、能链接、能运行，可是输出的号码**会重复**：`A 1`、`B 1` 这样的行常常一起出现。请找出原因并修好。

关键线索在 `queue.h` 里：取号机的**实现**（`next_ticket` 的函数体）和**计数器**（`g_ticket_counter`）都被写成了 `static` 放在头文件里。头文件会被 `main.c` 和 `desk.c` 各包含一次，请想清楚：这样到底会有几个计数器、几个取号机？

四个文件都可以修改，提交时四个文件会一起参与编译。

## 输入格式
第一行一个整数 `n`，表示业务条数。
接下来一行（或几行）共 `n` 个字符，每个字符是 `A` 或 `B`，分别表示 A 窗口、B 窗口的业务，字符之间用空格或换行分隔。

## 输出格式
如果全部 `n` 个字符都能正确读入且合法，输出 `n` 行，每行 `窗口 号码`：

```
A 1
B 2
```

窗口就是输入里的 `A` 或 `B`，号码是全馆统一递增的登记号。

否则（读入失败、`n` 不在 1 到 1000 之间、出现 `A` / `B` 之外的字符）输出一行 `error`。

## 数据范围
1 ≤ n ≤ 1000

输出最多 1000 行，每行不超过 6 个字符，远小于输出上限。

## 示例
### 示例 1
```in
5
A B A A B
```
```out
A 1
B 2
A 3
A 4
B 5
```
> 号码机是共享的：第 1 条业务（A）拿 1 号，第 2 条（B）拿 2 号……第 5 条拿 5 号。每个号码只用一次。

### 示例 2（边界：只有一条业务）
```in
1
B
```
```out
B 1
```
> 只有 B 窗口工作，也必须是 1 号——说明 `desk.c` 用的和 `main.c` 用的是同一台号码机。

## 提示
### 第 1 层
先数一数程序里到底有几个 `g_ticket_counter`。`queue.h` 被 `main.c` 和 `desk.c` 各 `#include` 一次，`#include` 做的事就是"把文件内容原样复制进来"。那么 `static int g_ticket_counter = 0;` 复制了几份？

### 第 2 层
`static` 在文件作用域表示**内部链接**：每个编译单元各得到一份自己的副本。于是 `main.c` 有一台取号机（计数器从 0 开始），`desk.c` 也有**另一台**（计数器也从 0 开始）。A 窗口的 1 号和 B 窗口的 1 号来自不同的计数器，当然会重复。

修法：**有状态的实现只能存在一份**。把 `next_ticket` 的函数体和 `g_ticket_counter` 一起搬进 `ticket.c`，`queue.h` 里只留函数声明 `int next_ticket(void);`。这样 `ticket.c` 里的那份定义被链接进程序，`main.c` 和 `desk.c` 调用的是同一个函数、同一份计数器。

### 第 3 层
改完之后 `ticket.c` 应该长这样（注意 `g_ticket_counter` 用 `static` 是**对的**：它只需要在本文件可见，这正是"只有一个实体"的写法）：

```c
#include "queue.h"

static int g_ticket_counter = 0;

int next_ticket(void) {
    g_ticket_counter++;
    return g_ticket_counter;
}
```

`queue.h` 里只留 `int next_ticket(void);` 和 `int issue_b(void);` 两个声明。**不要**把 `next_ticket` 写成 `static inline` 留在头文件里——它是有状态的函数，每个编译单元一份副本就必然分裂；也**不要**写成裸 `inline`，那在本平台的 `-O0` 下根本不生成实体。

## 参考代码
```c file=queue.h
#ifndef QUEUE_H
#define QUEUE_H

/* 取号机：每调用一次返回一个新的登记序号（全馆共用一台，号码唯一递增） */
int next_ticket(void);

/* B 窗口的业务处理，内部会取一个号 */
int issue_b(void);

#endif
```

```c file=ticket.c
#include "queue.h"

/* 号码计数器：全程序只有这一份，所以放在 .c 文件里。
   static 让它只在本文件可见，别的文件只能通过 next_ticket 修改它。 */
static int g_ticket_counter = 0;

int next_ticket(void) {
    g_ticket_counter++;
    return g_ticket_counter;
}
```

```c file=desk.c
#include "queue.h"

int issue_b(void) {
    return next_ticket();       /* 用的是 ticket.c 里那唯一的一台取号机 */
}
```

```c file=main.c
#include <stdio.h>
#include "queue.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        printf("error\n");
        return 0;
    }

    for (int i = 0; i < n; i++) {
        char kind = 0;
        if (scanf(" %c", &kind) != 1) {
            printf("error\n");
            return 0;
        }
        if (kind == 'A') {
            printf("A %d\n", next_ticket());
        } else if (kind == 'B') {
            printf("B %d\n", issue_b());
        } else {
            printf("error\n");
            return 0;
        }
    }
    return 0;
}
```

## 初始代码
```c file=queue.h
#ifndef QUEUE_H
#define QUEUE_H

/* 取号机：每调用一次返回一个新的登记序号 */
/* 注意：计数器是 static 的 —— 每个包含本头文件的 .c 都会得到自己的一份 */
static int g_ticket_counter = 0;

static inline int next_ticket(void) {
    return ++g_ticket_counter;
}

/* B 窗口的业务处理，内部会取一个号 */
int issue_b(void);

#endif
```

```c file=ticket.c
#include "queue.h"

/* TODO: 取号机的实现现在写在了 queue.h 里，所以这个文件是空的。
   想一想：号码计数器应该有几个？它应该定义在哪个文件里？ */
```

```c file=desk.c
#include "queue.h"

int issue_b(void) {
    return next_ticket();
}
```

```c file=main.c
#include <stdio.h>
#include "queue.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        printf("error\n");
        return 0;
    }

    for (int i = 0; i < n; i++) {
        char kind = 0;
        if (scanf(" %c", &kind) != 1) {
            printf("error\n");
            return 0;
        }
        if (kind == 'A') {
            printf("A %d\n", next_ticket());
        } else if (kind == 'B') {
            printf("B %d\n", issue_b());
        } else {
            printf("error\n");
            return 0;
        }
    }
    return 0;
}
```

## 复杂度
时间 O(n)：每条业务一次取号、一次输出。
空间 O(1)：只需要一个计数器。

本题的关键不是算法，而是**"谁应该拥有这份状态"**：

- 头文件会被复制进每个包含它的 `.c`，所以头文件里只能放**声明**（以及 `static inline` 的纯函数——它们没有状态，多份副本无所谓）；
- 有状态的实现（计数器、缓存、单例句柄）必须有**唯一的一份实体**，要放在某一个 `.c` 文件里，头文件只留声明；
- `static` 在文件作用域是"内部链接"，它保证"本文件独享"，**不保证"全局唯一"**——这两件事正好相反。

## 常见错误
### 把计数器和 inline 函数留在头文件里，每个 .c 各一份 [WA]
程序能跑、单文件测试也可能对，但 A、B 两个窗口各有一个从 0 开始的计数器，号码必然重复。这就是题目初始代码的状态：改了半天 `main.c`、`desk.c` 的调用顺序也没用，因为问题在 `queue.h` 里的 `static`。
```c file=queue.h expect=WA
#ifndef QUEUE_H
#define QUEUE_H

static int g_ticket_counter = 0;

static inline int next_ticket(void) {
    return ++g_ticket_counter;
}

int issue_b(void);

#endif
```
```c file=ticket.c
#include "queue.h"

/* 实现仍然在头文件里，这个文件是空的 */
```

### 把计数器写成非 static 的全局定义，还放在头文件里 [CE]
去掉 `static` 之后确实"全程序只有一个名字"了，但定义被复制进了两个编译单元，链接时报 `duplicate symbol: g_ticket_counter`。头文件里只能写 `extern int g_ticket_counter;`（声明），定义必须放在一个 `.c` 文件里。
```c file=queue.h expect=CE
#ifndef QUEUE_H
#define QUEUE_H

int g_ticket_counter = 0;               /* 错：这是定义，被复制了两份 */

static inline int next_ticket(void) {
    return ++g_ticket_counter;
}

int issue_b(void);

#endif
```
```c file=ticket.c
#include "queue.h"
```

### 头文件只留声明，但忘了在 ticket.c 里写定义 [CE]
`queue.h` 改对了，`ticket.c` 却还是空的——编译能过（声明在），链接时报 `undefined symbol: next_ticket`。`main.c` 和 `desk.c` 都在调用它，却没有任何文件提供它的实体。
```c file=queue.h expect=CE
#ifndef QUEUE_H
#define QUEUE_H

int next_ticket(void);
int issue_b(void);

#endif
```
```c file=ticket.c
#include "queue.h"

/* 错：忘了实现 next_ticket */
```

### 以为 inline 会自动合并多份定义（C++ 的规则）[CE]
C++ 的 `inline` 函数可以定义在头文件里、被多个编译单元包含，链接器会自动合并成一份（弱符号）。**C 语言没有这个机制**：C 的 `inline` 不产生外部实体，`extern inline` 会产生多份，`static inline` 每份各自内部链接。把 C++ 的习惯搬到 C 里，要么 `undefined symbol`，要么 `duplicate symbol`，要么（最坏）状态分裂。C 里正确的组合只有一个：**头文件放声明，实现放 `.c`；纯函数才用 `static inline`。**

## 测试用例
### 01 sample 示例 1
```in
5
A B A A B
```
```out
A 1
B 2
A 3
A 4
B 5
```

### 02 sample 示例 2
```in
1
B
```
```out
B 1
```

### 03 boundary 只有一条 A 窗口业务
```in
1
A
```
```out
A 1
```

### 04 degenerate 全部是 B 窗口业务
```in
3
B B B
```
```out
B 1
B 2
B 3
```
> 全是 B 时，如果两个窗口各有一台取号机，输出仍然是 1、2、3——**这条用例抓不住 bug**。所以要靠示例 1 和下面那些交替的用例。

### 05 trap 严格交替的 A、B
```in
6
A B A B A B
```
```out
A 1
B 2
A 3
B 4
A 5
B 6
```

### 06 trap 出现 A / B 之外的字符
```in
3
C A B
```
```out
error
```

### 07 normal 一般情况
```in
8
A A B B A B B A
```
```out
A 1
A 2
B 3
B 4
A 5
B 6
B 7
A 8
```

### 08 trap 以 B 开头（号码机要先被 desk.c 用掉 1 号）
```in
3
B B A
```
```out
B 1
B 2
A 3
```
> 若两个窗口各有一台号码机，这里会输出 `B 1 / B 2 / A 1`。号码机分裂时，"A 的第一号"和"B 的第一号"一定会撞。

### 生成 boundary 最大规模与交替压力数据
```js gen
const cases = [];

/* 期望输出在 JS 里独立生成：号码就是全局递增的计数器 */
function run(kinds) {
  let counter = 0;
  let out = '';
  for (const k of kinds) {
    counter++;
    out += `${k} ${counter}\n`;
  }
  return out;
}
const text = (kinds) => `${kinds.length}\n${kinds.join(' ')}\n`;

/* 最大规模：1000 条全是 A 窗口 */
const onlyA = new Array(1000).fill('A');
cases.push({
  kind: 'boundary',
  category: '最大规模：1000 条 A 窗口业务',
  input: text(onlyA),
  output: run(onlyA),
});

/* 最大规模：1000 条严格交替 */
const alt = [];
for (let i = 0; i < 1000; i++) alt.push(i % 2 === 0 ? 'A' : 'B');
cases.push({
  kind: 'trap',
  category: '1000 条 A、B 严格交替的业务',
  input: text(alt),
  output: run(alt),
});

/* 随机混合：1000 条随机窗口 */
const rand = [];
for (let i = 0; i < 1000; i++) rand.push(rng.next() < 0.5 ? 'A' : 'B');
cases.push({
  kind: 'normal',
  category: '1000 条随机窗口的业务',
  input: text(rand),
  output: run(rand),
});

return cases;
```
