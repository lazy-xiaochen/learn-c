---json
{
  "id": "p-s5-dangling-double-free-2",
  "title": "事故复盘：这段堆操作流水账第几步踩到未定义行为",
  "difficulty": "L4",
  "knowledgePoints": ["s5-dangling-double-free"],
  "special": "ub-analysis",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
线上一个服务偶发崩溃，排障同学从日志里还原出了一段"堆内存操作流水账"。现在请你当一回审查员：**按 C 标准的语义逐条推演，找出第一条踩到未定义行为（UB）的语句**；如果整段都没有 UB，再报告程序结束时还剩几块内存没归还。

程序开头固定是：

```c
int *p = NULL;      /* 两个指针一开始都是空指针，不是野指针 */
int *q = NULL;
```

流水账里的每条指令对应一行真实的 C 代码：

| 指令 | 对应的 C 代码 | 是否 UB |
|---|---|---|
| `M x` | `x = malloc(sizeof *x);` | 不会，分配一定成功 |
| `L x` | `x = NULL;` | 不会 |
| `C x y` | `x = y;` | 不会（只是复制指针值） |
| `F x` | `free(x);` | `x == NULL` 时**不是** UB；`x` 指向已释放的块时是 UB（重复释放） |
| `R x` | `v = *x;` | `x == NULL` 是 UB（空指针解引用）；块已释放是 UB（释放后使用） |
| `W x` | `*x = 0;` | 同 `R`，写和读的判定完全一样 |

一旦某条指令触发 UB，程序的行为就**不再由标准保证**，后面的指令也不再执行——所以只需要报告**第一条**。

还要分清"UB"和"泄漏"：程序结束时还有块没释放，这只是**资源没归还**，程序本身的行为依然完全定义良好，**不是 UB**。题目要求把这两种情况分开报告。

## 输入格式
第一行一个整数 `n`（指令条数）。
接下来 `n` 行，每行一条指令，格式为 `M x`、`L x`、`C x y`、`F x`、`R x`、`W x` 之一，其中 `x`、`y` 是 `p` 或 `q`。

## 输出格式
只输出一行：

- 如果有 UB：`UB <k>`，`<k>` 是第一条触发 UB 的指令序号（从 1 开始）；
- 如果没有任何 UB：`OK leak=<结束时仍存活的块数>`。

## 数据范围
1 ≤ n ≤ 200
指针名只会是 `p`、`q`
块数最多 200

## 示例
### 示例 1
```in
6
M p
F p
L p
F p
R p
F q
```
```out
UB 5
```
> 第 1 步 `M p` 拿到一块内存；第 2 步 `F p` 正常释放；第 3 步 `L p` 把 `p` 置成 `NULL`；第 4 步 `F p` 是 `free(NULL)`，**不是 UB**（标准保证它什么也不做）；第 5 步 `R p` 对空指针解引用 → 第一条 UB 出现在第 5 步。如果错把 `free(NULL)` 当成 UB，这里就会报成 `UB 4`。

### 示例 2（边界：没有 UB，但有泄漏）
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
> 两块内存：`q` 那块被正常释放，`p` 那块因为第 4 步把唯一指向它的指针置成了 `NULL`，从此再也无法释放——结束时仍然存活 1 块。**这属于泄漏，不是 UB**：程序的行为依然完全定义良好，只是资源没归还。

## 提示
### 第 1 层
准备三个状态就够：`ptr[p]`、`ptr[q]` 记"它指向几号块"（`0` 表示 `NULL`），再加一个 `alive[]` 记"每块内存是否还没被释放"。`M` 分配新块号、`L` 写 0、`C` 复制块号——这三条都不会 UB。

### 第 2 层
`F` 要分三种情况：块号是 0 → `free(NULL)`，安全，什么都不做；块还活着 → 释放它（把 `alive` 置 0），注意**不要动任何指针**；块已经死了 → 重复释放，UB。`R`/`W` 只要"块号是 0 或块已经死了"就是 UB。

### 第 3 层
边走边记 `ub = k`，一旦记下就停止处理后面的指令（UB 之后的行为没有定义，不需要也不应该继续推演）。如果循环正常走完，就数一遍 `alive` 里还剩几块，输出 `OK leak=<块数>`。注意读指令用 `scanf(" %c", &op)`，前面的空格会跳过换行。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAX_BLOCKS 205
#define MAX_PTRS 2

/* p → 0，q → 1；其他字母返回 -1 */
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

    int alive[MAX_BLOCKS] = {0};       /* alive[b] == 1 表示块 b 还没被释放 */
    int ptr[MAX_PTRS] = {0};           /* 0 表示 NULL */
    int next_block = 0;
    int ub = 0;                        /* 0 表示还没出现 UB，否则是步号 */

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
            ptr[i] = next_block;       /* 旧块若仍存活，就再也释放不掉了（泄漏，不是 UB） */
        } else if (op == 'L') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int i = ptr_index(x);
            if (i < 0) {
                return 0;
            }
            ptr[i] = 0;
        } else if (op == 'C') {
            char x, y;
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
            int b = ptr[i];
            if (b != 0) {              /* 块号 0 是 NULL：free(NULL) 安全 */
                if (!alive[b]) {
                    ub = k;            /* 重复释放 */
                }
                alive[b] = 0;
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
            int b = ptr[i];
            if (b == 0 || !alive[b]) { /* 空指针解引用 / 释放后使用 */
                ub = k;
            }
        } else {
            return 0;
        }
    }

    if (ub > 0) {
        printf("UB %d\n", ub);
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

#define MAX_BLOCKS 205
#define MAX_PTRS 2

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 200) {
        return 0;
    }

    int alive[MAX_BLOCKS] = {0};
    int ptr[MAX_PTRS] = {0};
    int next_block = 0;
    int ub = 0;

    for (int k = 1; k <= n && ub == 0; k++) {
        char op;
        if (scanf(" %c", &op) != 1) {
            return 0;
        }

        /* TODO: 按 op 读入参数，维护 ptr[]（0 表示 NULL）和 alive[]，
         *       在 F / R / W 上判断：哪些情况是 UB？第一条 UB 要记下步号 k */

        char x = 0;
        char y = 0;
        if (op == 'C') {
            if (scanf(" %c %c", &x, &y) != 2) {
                return 0;
            }
        } else if (op == 'M' || op == 'L' || op == 'F' || op == 'R' || op == 'W') {
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
        } else {
            return 0;
        }
    }

    if (ub > 0) {
        printf("UB %d\n", ub);
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
标准明确规定 `free(NULL)` 是**合法的空操作**。如果写成 `if (b == 0) { ub = k; }`，遇到"先把指针置空、再释放"这种完全正确的写法就会误报。`free(NULL)` 之所以被特别允许，是为了让"释放后置空"这种防御性写法不引入新错误。

```c file=main.c expect=WA
#include <stdio.h>

#define MAX_BLOCKS 205
#define MAX_PTRS 2

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

    int alive[MAX_BLOCKS] = {0};
    int ptr[MAX_PTRS] = {0};
    int next_block = 0;
    int ub = 0;

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
            ptr[ptr_index(x)] = 0;
        } else if (op == 'C') {
            char x, y;
            if (scanf(" %c %c", &x, &y) != 2) {
                return 0;
            }
            ptr[ptr_index(x)] = ptr[ptr_index(y)];
        } else if (op == 'F') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int b = ptr[ptr_index(x)];
            if (b == 0) {
                ub = k;                /* 错：free(NULL) 是合法的空操作 */
            } else if (!alive[b]) {
                ub = k;
            } else {
                alive[b] = 0;
            }
        } else if (op == 'R' || op == 'W') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int b = ptr[ptr_index(x)];
            if (b == 0 || !alive[b]) {
                ub = k;
            }
        }
    }

    if (ub > 0) {
        printf("UB %d\n", ub);
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

### 释放之后没有把块标成"已释放"，重复释放抓不到 [WA]
`free(b)` 之后必须让 `alive[b] = 0`。忘了这一步，第二次 `free` 同一块时仍然认为"块还活着"，于是重复释放被当成正常释放悄悄放过，直到遇到第一个"读悬垂指针"的用例才暴露——甚至可能整段都判成 `OK`。

```c file=main.c expect=WA
#include <stdio.h>

#define MAX_BLOCKS 205
#define MAX_PTRS 2

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

    int alive[MAX_BLOCKS] = {0};
    int ptr[MAX_PTRS] = {0};
    int next_block = 0;
    int ub = 0;

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
            ptr[ptr_index(x)] = 0;
        } else if (op == 'C') {
            char x, y;
            if (scanf(" %c %c", &x, &y) != 2) {
                return 0;
            }
            ptr[ptr_index(x)] = ptr[ptr_index(y)];
        } else if (op == 'F') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int b = ptr[ptr_index(x)];
            if (b != 0 && !alive[b]) {
                ub = k;
            }
            /* 错：这里没有 alive[b] = 0，块永远“活着” */
        } else if (op == 'R' || op == 'W') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int b = ptr[ptr_index(x)];
            if (b == 0 || !alive[b]) {
                ub = k;
            }
        }
    }

    if (ub > 0) {
        printf("UB %d\n", ub);
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

### 读/写时只判了空指针，漏掉"释放后使用" [WA]
`if (b == 0) { ub = k; }` 只覆盖了空指针解引用。悬垂指针的块号不是 0，症状是程序一声不响地继续跑，该报的 `UB 4` 变成了 `OK leak=...`。`R`/`W` 的判定条件和 `F` 一样，都要先看"块号是不是 0"，再看"块是否还活着"。

```c file=main.c expect=WA
#include <stdio.h>

#define MAX_BLOCKS 205
#define MAX_PTRS 2

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

    int alive[MAX_BLOCKS] = {0};
    int ptr[MAX_PTRS] = {0};
    int next_block = 0;
    int ub = 0;

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
            ptr[ptr_index(x)] = 0;
        } else if (op == 'C') {
            char x, y;
            if (scanf(" %c %c", &x, &y) != 2) {
                return 0;
            }
            ptr[ptr_index(x)] = ptr[ptr_index(y)];
        } else if (op == 'F') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int b = ptr[ptr_index(x)];
            if (b != 0) {
                if (!alive[b]) {
                    ub = k;
                }
                alive[b] = 0;
            }
        } else if (op == 'R' || op == 'W') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int b = ptr[ptr_index(x)];
            if (b == 0) {              /* 错：只判了空指针，悬垂块被放过 */
                ub = k;
            }
        }
    }

    if (ub > 0) {
        printf("UB %d\n", ub);
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

### 找到第一条 UB 之后还继续推演 [WA]
一旦触发 UB，标准就不再保证任何行为，后面的指令"执行结果"没有意义。如果实现成"每遇到一次 UB 就更新 `ub`"，最终报出来的是**最后**一条 UB 的步号，而题目要的是**第一条**。发现第一条时就该停下来。

### 把"泄漏"也当成 UB [WA]
结束时还有块没释放，是资源没归还，不是 UB——程序的行为完全定义良好。如果实现成"只要有泄漏就输出某个 UB"，示例 2 这种"没有 UB、只有泄漏"的用例就会错。题目要求用 `OK leak=<块数>` 把"能正常结束但漏了内存"和"已经踩了 UB"区分开，这也正是现实排障里必须先问清楚的问题：**是崩溃（UB），还是内存只涨不降（泄漏）？**

## 测试用例
### 01 sample 示例 1
```in
6
M p
F p
L p
F p
R p
F q
```
```out
UB 5
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

### 03 degenerate 只分配不读不写
```in
1
M p
```
```out
OK leak=1
```

### 04 trap 一上来就 free(NULL)，安全
```in
1
F p
```
```out
OK leak=0
```

### 05 trap 通过别名释放后再读另一个指针
```in
4
M p
F p
C q p
R q
```
```out
UB 4
```
> `F p` 释放了块 1；`C q p` 把块号 1 复制给 `q`（此时它已经悬垂）；`R q` 是释放后使用。

### 06 trap 通过别名重复释放
```in
4
M p
C q p
F q
F p
```
```out
UB 4
```
> 第 3 步用 `q` 释放了块 1；第 4 步 `F p` 释放的还是块 1 → 重复释放。

### 07 trap 置空之后 free 是安全的，但块泄漏了
```in
3
M p
L p
F p
```
```out
OK leak=1
```
> `L p` 之后 `p` 是 `NULL`，`F p` 只是空操作；但块 1 从此没有任何指针指向它，`leak=1`。

### 08 normal 写、读、置空、释放的组合
```in
8
M p
W p
R p
M q
L q
F p
L p
F p
```
```out
OK leak=1
```
> 全程合法：块 1 被正常释放，块 2 的指针被 `L q` 置空后再也没法释放 → `leak=1`。

### 生成 boundary 满 200 步与随机流水账
```js gen
const cases = [];

const NAMES = ['p', 'q'];

function simulate(lines) {
  const alive = [false];
  const ptr = { p: 0, q: 0 };
  let next = 0;
  let ub = 0;

  for (let k = 0; k < lines.length && ub === 0; k++) {
    const parts = lines[k].split(' ');
    const op = parts[0];
    if (op === 'M') {
      next++;
      alive[next] = true;
      ptr[parts[1]] = next;
    } else if (op === 'L') {
      ptr[parts[1]] = 0;
    } else if (op === 'C') {
      ptr[parts[1]] = ptr[parts[2]];
    } else if (op === 'F') {
      const b = ptr[parts[1]];
      if (b !== 0) {
        if (!alive[b]) ub = k + 1;
        alive[b] = false;
      }
    } else if (op === 'R' || op === 'W') {
      const b = ptr[parts[1]];
      if (b === 0 || !alive[b]) ub = k + 1;
    }
  }

  if (ub > 0) return `UB ${ub}\n`;
  let leak = 0;
  for (let b = 1; b <= next; b++) if (alive[b]) leak++;
  return `OK leak=${leak}\n`;
}

/* 边界：200 步全部合法——交替分配与释放，最后把指针置空 */
{
  const lines = [];
  for (let i = 0; i < 98; i++) {
    lines.push(`M ${NAMES[i % 2]}`);
    lines.push(`F ${NAMES[i % 2]}`);
  }
  lines.push('M p');
  lines.push('M q');
  lines.push('F q');
  lines.push('L p');
  cases.push({
    kind: 'boundary',
    category: '200 步全部合法，结束时泄漏 1 块',
    input: `${lines.length}\n${lines.join('\n')}\n`,
    output: simulate(lines),
  });
}

/* 陷阱：连续释放同一块，UB 出现在第 2 步 */
{
  const lines = ['M p', 'C q p'];
  for (let i = 0; i < 30; i++) lines.push(`F ${NAMES[i % 2]}`);
  cases.push({
    kind: 'trap',
    category: '两个指针轮流释放同一块，第二条 F 就是 UB',
    input: `${lines.length}\n${lines.join('\n')}\n`,
    output: simulate(lines),
  });
}

/* 随机：两百步混合指令，期望值在 JS 模型里独立推演 */
{
  const lines = [];
  for (let i = 0; i < 200; i++) {
    const r = rng.int(0, 11);
    const x = rng.pick(NAMES);
    if (r <= 4) lines.push(`M ${x}`);
    else if (r === 5) lines.push(`L ${x}`);
    else if (r === 6) lines.push(`C ${x} ${rng.pick(NAMES)}`);
    else if (r <= 8) lines.push(`F ${x}`);
    else if (r === 9) lines.push(`R ${x}`);
    else lines.push(`W ${x}`);
  }
  cases.push({
    kind: 'normal',
    category: '200 步随机的 M/L/C/F/R/W',
    input: `${lines.length}\n${lines.join('\n')}\n`,
    output: simulate(lines),
  });
}

return cases;
```
