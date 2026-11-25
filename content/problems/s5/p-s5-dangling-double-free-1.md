---json
{
  "id": "p-s5-dangling-double-free-1",
  "title": "所有权流水账：逐个操作判定释放、悬垂与重复释放",
  "difficulty": "L4",
  "knowledgePoints": ["s5-dangling-double-free"],
  "special": "pointer-reasoning",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
写代码时"到底该谁释放、释放完还能不能用"靠脑子记很容易出错。现在把这个问题变成一道可以精确判定的题：给出一段**堆内存操作流水账**，请按 C 的语义逐条推演，把每次 `free` / 解引用归到正确的那一类。

程序里有三个指针 `p`、`q`、`r`，开始时**都是未初始化的**（里面是不确定的值，也就是野指针）。流水账里的每条指令对应一行真实的 C 代码：

| 指令 | 对应的 C 代码 | 说明 |
|---|---|---|
| `M x` | `x = malloc(sizeof *x);` | 分配一块新内存（按 1、2、3…编号），`x` 指向它；旧块若还存在就再也没人指向它了 |
| `C x y` | `x = y;` | 把 `y` 里的值复制给 `x`（可能是块号，也可能是"未初始化"这个状态） |
| `F x` | `free(x);` | 释放 `x` 指向的那块内存 |
| `R x` | `*x = 1;` | 通过 `x` 写一次内存 |

对每条 `F` 和 `R` 输出一行判定，**判定只看"x 里面存的那块内存现在处于什么状态"**：

| 判定 | 触发条件 |
|---|---|
| `WILD` | `x` 从未被赋值（野指针）——`M`、`C` 都还没写过它 |
| `OK` | `F` 时块还活着：释放成功，从此**所有**指向这块的指针都悬垂 |
| `DOUBLE` | `F` 时块已经被释放过：重复释放 |
| `DANGLING` | `R` 时块已经被释放过：释放后使用 |
| `SAFE` | `R` 时块还活着 |

最后再输出一行统计：

```
SAFE=<a> OK=<b> DOUBLE=<c> DANGLING=<d> WILD=<e> LEAK=<f>
```

其中 `LEAK` 是**程序结束时仍然存活（从没被 `F` 释放过）的块数**。

注意三个容易搞混的点：

1. **`free` 不会改任何指针**：`F p` 只让"块"变成已释放状态，`p` 里仍然存着那个块号，`q = p` 的别名也一样；
2. **悬垂 ≠ 野**：`p` 指向的块被释放之后，`R p` 是 `DANGLING`（曾经有效、现在失效），不是 `WILD`（从未赋值）；
3. **`M x` 覆盖指针就是泄漏**：`x` 原来指向的块如果还活着，就再也没人能释放它了。

## 输入格式
第一行一个整数 `n`（指令条数）。
接下来 `n` 行，每行一条指令，格式为 `M x`、`C x y`、`F x`、`R x` 之一，`x`、`y` 是 `p`、`q`、`r` 中的某个字母。

## 输出格式
按指令顺序，对每条 `F` 输出 `FREE <x> <判定>`，对每条 `R` 输出 `READ <x> <判定>`（`<x>` 是那个字母）。
最后输出一行 `SAFE=<a> OK=<b> DOUBLE=<c> DANGLING=<d> WILD=<e> LEAK=<f>`。
`M`、`C` 不产生任何输出。

## 数据范围
1 ≤ n ≤ 200
指针名只会是 `p`、`q`、`r`
块编号从 1 开始，最多 200 块
输出不超过 201 行

## 示例
### 示例 1
```in
8
M p
R p
C q p
F p
R q
F q
R q
F p
```
```out
READ p SAFE
FREE p OK
READ q DANGLING
FREE q DOUBLE
READ q DANGLING
FREE p DOUBLE
SAFE=1 OK=1 DOUBLE=2 DANGLING=2 WILD=0 LEAK=0
```
> `M p` 得到 1 号块；`R p` 时它还活着 → `SAFE`。`C q p` 让 `q` 也指向 1 号块。`F p` 释放成功 → `OK`，此时 `q` 立刻悬垂，所以随后的 `R q` 是 `DANGLING`。`F q` 和 `F p` 都在释放同一个已经释放过的块，各记一次 `DOUBLE`。结束时没有存活块，`LEAK=0`。

### 示例 2（边界：还没赋值就使用）
```in
2
R p
F q
```
```out
READ p WILD
FREE q WILD
SAFE=0 OK=0 DOUBLE=0 DANGLING=0 WILD=2 LEAK=0
```
> 两条指令都没有先 `M` 过对应指针，`p`、`q` 里是未初始化的值，解引用和释放都是 `WILD`。注意 `free` 一个野指针和 `free(NULL)` 完全不同：后者是安全的（什么也不做），前者是未定义行为。

## 提示
### 第 1 层
把状态拆成两层：**块**只需要一个"是否存活"的布尔数组（下标是块号）；**指针**只需要一个整数数组，记"它指向几号块"，`0` 专门表示"未初始化"。`M x` 分配新块号并写进 `ptr[x]`，`C x y` 是把 `ptr[y]` 原样复制给 `ptr[x]`。

### 第 2 层
`F x` 和 `R x` 的判定逻辑是同一套三分支：先看 `ptr[x]` 是不是 0（`WILD`），再看 `blocks[ptr[x]]` 是不是还活着（`OK`/`SAFE`），否则就是 `DOUBLE`/`DANGLING`。**`F` 成功时只改块的状态，不要动任何指针**——这一点做对，别名自动跟着悬垂。

### 第 3 层
读指令用 `scanf(" %c", &op)`（前面的空格会跳过换行），再按 `op` 决定后面读一个还是两个字母。最后统计时 `LEAK` 要遍历所有块号数"还活着"的个数。注意 `C x y` 里 `y` 可能是未初始化的（值为 0），复制过去之后 `x` 也变成 `WILD` 状态，这是对的。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAX_BLOCKS 205
#define MAX_PTRS 3

/* p → 0，q → 1，r → 2；其他字母返回 -1 */
static int ptr_index(char c) {
    if (c == 'p') {
        return 0;
    }
    if (c == 'q') {
        return 1;
    }
    if (c == 'r') {
        return 2;
    }
    return -1;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 200) {
        return 0;
    }

    int alive[MAX_BLOCKS] = {0};       /* alive[b] == 1 表示块 b 还活着 */
    int ptr[MAX_PTRS] = {0};           /* ptr[i] == 0 表示这个指针从未被赋值 */
    int next_block = 0;
    int safe = 0, ok = 0, dbl = 0, dangling = 0, wild = 0;

    for (int e = 0; e < n; e++) {
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
            ptr[i] = next_block;       /* 旧块若还活着，从此再没人指向它 → 泄漏 */
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
            ptr[ix] = ptr[iy];         /* 原样复制，包括 0（未初始化）和已释放的块号 */
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
            if (b == 0) {
                printf("FREE %c WILD\n", x);
                wild++;
            } else if (alive[b]) {
                alive[b] = 0;          /* 只改块的状态：所有指向它的指针一起悬垂 */
                printf("FREE %c OK\n", x);
                ok++;
            } else {
                printf("FREE %c DOUBLE\n", x);
                dbl++;
            }
        } else if (op == 'R') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int i = ptr_index(x);
            if (i < 0) {
                return 0;
            }
            int b = ptr[i];
            if (b == 0) {
                printf("READ %c WILD\n", x);
                wild++;
            } else if (alive[b]) {
                printf("READ %c SAFE\n", x);
                safe++;
            } else {
                printf("READ %c DANGLING\n", x);
                dangling++;
            }
        } else {
            return 0;
        }
    }

    int leak = 0;
    for (int b = 1; b <= next_block; b++) {
        if (alive[b]) {
            leak++;
        }
    }

    printf("SAFE=%d OK=%d DOUBLE=%d DANGLING=%d WILD=%d LEAK=%d\n",
           safe, ok, dbl, dangling, wild, leak);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAX_BLOCKS 205
#define MAX_PTRS 3

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 200) {
        return 0;
    }

    int alive[MAX_BLOCKS] = {0};
    int ptr[MAX_PTRS] = {0};
    int next_block = 0;
    int safe = 0, ok = 0, dbl = 0, dangling = 0, wild = 0;

    for (int e = 0; e < n; e++) {
        char op;
        if (scanf(" %c", &op) != 1) {
            return 0;
        }

        /* TODO: 按 op 读入参数（M/F/R 一个字母，C 两个字母），
         *       用"块号 + 块是否存活"两个状态推演：
         *       M 分配新块；C 复制块号；F 判 WILD / OK / DOUBLE；R 判 WILD / SAFE / DANGLING */

        char x = 0;
        char y = 0;
        if (op == 'C') {
            if (scanf(" %c %c", &x, &y) != 2) {
                return 0;
            }
        } else if (op == 'M' || op == 'F' || op == 'R') {
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
        } else {
            return 0;
        }
    }

    int leak = 0;
    for (int b = 1; b <= next_block; b++) {
        if (alive[b]) {
            leak++;
        }
    }

    printf("SAFE=%d OK=%d DOUBLE=%d DANGLING=%d WILD=%d LEAK=%d\n",
           safe, ok, dbl, dangling, wild, leak);
    return 0;
}
```

## 复杂度
时间 O(n + 块数)：每条指令 O(1)，最后扫一遍块表。
空间 O(块数)：两个定长数组（最多 205 个块、3 个指针）。

## 常见错误
### 把 `free` 当成"把指针清空"，认为别名还安全 [WA]
`free(p)` 只改块的状态，**不改任何指针**。如果实现成"`F p` 时把 `ptr[p]` 置 0"，那么后面的 `R q`（`q` 是 `p` 的别名）会被误判成 `WILD`，而正确答案是 `DANGLING`。这是本题最容易错的一处，也是现实中最容易漏掉的悬垂指针来源。

```c file=main.c expect=WA
#include <stdio.h>

#define MAX_BLOCKS 205
#define MAX_PTRS 3

static int ptr_index(char c) {
    if (c == 'p') {
        return 0;
    }
    if (c == 'q') {
        return 1;
    }
    if (c == 'r') {
        return 2;
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
    int safe = 0, ok = 0, dbl = 0, dangling = 0, wild = 0;

    for (int e = 0; e < n; e++) {
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
            next_block++;
            alive[next_block] = 1;
            ptr[i] = next_block;
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
            int i = ptr_index(x);
            int b = ptr[i];
            if (b == 0) {
                printf("FREE %c WILD\n", x);
                wild++;
            } else if (alive[b]) {
                alive[b] = 0;
                ptr[i] = 0;               /* 错：释放不该改指针，别名 q 也一起被清掉了 */
                printf("FREE %c OK\n", x);
                ok++;
            } else {
                printf("FREE %c DOUBLE\n", x);
                dbl++;
            }
        } else if (op == 'R') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int b = ptr[ptr_index(x)];
            if (b == 0) {
                printf("READ %c WILD\n", x);
                wild++;
            } else if (alive[b]) {
                printf("READ %c SAFE\n", x);
                safe++;
            } else {
                printf("READ %c DANGLING\n", x);
                dangling++;
            }
        }
    }

    int leak = 0;
    for (int b = 1; b <= next_block; b++) {
        if (alive[b]) {
            leak++;
        }
    }
    printf("SAFE=%d OK=%d DOUBLE=%d DANGLING=%d WILD=%d LEAK=%d\n",
           safe, ok, dbl, dangling, wild, leak);
    return 0;
}
```

### 把"释放过的块"当成"未初始化" [WA]
`WILD` 和 `DANGLING` 的区别就是本题的核心：野指针**从来没有指向过有效对象**，悬垂指针**曾经有效、现在失效**。如果判定时只写"块还活着吗，不活着就是野指针"，两者就被合成一类：`R q` 会输出 `WILD` 而不是 `DANGLING`，`F q` 的重复释放也会被算成 `WILD`。**必须先判断"指针有没有被赋过值"（块号为 0），再判断块是否存活。**

```c file=main.c expect=WA
#include <stdio.h>

#define MAX_BLOCKS 205
#define MAX_PTRS 3

static int ptr_index(char c) {
    if (c == 'p') {
        return 0;
    }
    if (c == 'q') {
        return 1;
    }
    if (c == 'r') {
        return 2;
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
    int safe = 0, ok = 0, dbl = 0, dangling = 0, wild = 0;

    for (int e = 0; e < n; e++) {
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
            int i = ptr_index(x);
            int b = ptr[i];
            if (b == 0 || !alive[b]) {    /* 错：重复释放被并进了“野指针” */
                printf("FREE %c WILD\n", x);
                wild++;
            } else {
                alive[b] = 0;
                printf("FREE %c OK\n", x);
                ok++;
            }
        } else if (op == 'R') {
            char x;
            if (scanf(" %c", &x) != 1) {
                return 0;
            }
            int b = ptr[ptr_index(x)];
            if (b == 0 || !alive[b]) {    /* 错：悬垂读被并进了“野指针” */
                printf("READ %c WILD\n", x);
                wild++;
            } else {
                printf("READ %c SAFE\n", x);
                safe++;
            }
        }
    }

    int leak = 0;
    for (int b = 1; b <= next_block; b++) {
        if (alive[b]) {
            leak++;
        }
    }
    printf("SAFE=%d OK=%d DOUBLE=%d DANGLING=%d WILD=%d LEAK=%d\n",
           safe, ok, dbl, dangling, wild, leak);
    return 0;
}
```

### 忘记 `M x` 覆盖旧指针会造成泄漏 [WA]
`M x` 会写入一个**新**块号。如果 `x` 原本指向一个还活着的块，那个块从此再也没有指针指向它——它不会消失，只是永远无法被释放，`LEAK` 应该把它算进去。如果实现时在 `M` 里"顺手"把旧块标成已释放（当作"替换"），`LEAK` 就会少算，而且 `F` 一个原本能被释放的块会被错判成 `DOUBLE`。

### `C x y` 复制时"聪明地"把来源置空 [WA]
`x = y;` 是普通的值复制，复制之后 `y` 不受任何影响。如果实现成"复制完就把 `y` 清空"（当作移动语义），那么后面所有对 `y` 的 `R`/`F` 都会被误判成 `WILD`。C 的赋值从来不转移所有权，所有权只存在于程序员的约定里。

## 测试用例
### 01 sample 示例 1
```in
8
M p
R p
C q p
F p
R q
F q
R q
F p
```
```out
READ p SAFE
FREE p OK
READ q DANGLING
FREE q DOUBLE
READ q DANGLING
FREE p DOUBLE
SAFE=1 OK=1 DOUBLE=2 DANGLING=2 WILD=0 LEAK=0
```

### 02 sample 示例 2
```in
2
R p
F q
```
```out
READ p WILD
FREE q WILD
SAFE=0 OK=0 DOUBLE=0 DANGLING=0 WILD=2 LEAK=0
```

### 03 degenerate 只分配不释放，LEAK 记一块
```in
1
M p
```
```out
SAFE=0 OK=0 DOUBLE=0 DANGLING=0 WILD=0 LEAK=1
```

### 04 trap 通过别名释放，另一个指针立刻悬垂
```in
4
M p
C q p
F q
R p
```
```out
FREE q OK
READ p DANGLING
SAFE=0 OK=1 DOUBLE=0 DANGLING=1 WILD=0 LEAK=0
```
> 释放发生在 `q` 上，但块只有一个：`p` 也跟着悬垂。

### 05 trap 释放后重新分配，悬垂指针不会自动"复活"
```in
5
M p
F p
M q
R p
R q
```
```out
FREE p OK
READ p DANGLING
READ q SAFE
SAFE=1 OK=1 DOUBLE=0 DANGLING=1 WILD=0 LEAK=1
```
> `M q` 拿到的是 2 号块，`p` 仍然指向已释放的 1 号块，所以 `R p` 还是 `DANGLING`（不是 `SAFE`，也不是 `WILD`）。2 号块从没被释放，`LEAK=1`。

### 06 trap 把已释放的块号复制给另一个指针
```in
4
M p
F p
C q p
R q
```
```out
FREE p OK
READ q DANGLING
SAFE=0 OK=1 DOUBLE=0 DANGLING=1 WILD=0 LEAK=0
```
> `C` 复制的是块号，不检查块是否还活着，于是 `q` 也成了悬垂指针。

### 07 trap 重新 `M` 覆盖指针，旧块泄漏
```in
3
M p
M p
M p
```
```out
SAFE=0 OK=0 DOUBLE=0 DANGLING=0 WILD=0 LEAK=3
```
> 三次 `M p` 分配了三块，前两次的块号被覆盖，谁也释放不了 → 三块全泄漏。

### 08 normal 三个指针交叉使用
```in
10
M p
C q p
M r
C q r
F r
R p
F p
R q
F q
R r
```
```out
FREE r OK
READ p SAFE
FREE p OK
READ q DANGLING
FREE q DOUBLE
READ r DANGLING
SAFE=1 OK=2 DOUBLE=1 DANGLING=2 WILD=0 LEAK=0
```
> 两张块表要分开看：`p` 一直指向 1 号块；`r` 指向 2 号块，而 `C q r` 把 `q` 也拨到了 2 号块（`q` 从此与 1 号块无关）。`F r` 释放 2 号块 → `q` 悬垂；`R p` 时 1 号块还活着 → `SAFE`；`F p` 释放 1 号块；`F q` 是 2 号块的重复释放；`R r` 是 2 号块的悬垂读。两块最终都被释放过，`LEAK=0`。

### 生成 boundary 与随机流水账
```js gen
const cases = [];

const NAMES = ['p', 'q', 'r'];

function simulate(lines) {
  const alive = [false];
  const ptr = { p: 0, q: 0, r: 0 };
  let next = 0;
  let safe = 0, ok = 0, dbl = 0, dangling = 0, wild = 0;
  const out = [];

  for (const line of lines) {
    const parts = line.split(' ');
    const op = parts[0];
    if (op === 'M') {
      const x = parts[1];
      next++;
      alive[next] = true;
      ptr[x] = next;
    } else if (op === 'C') {
      ptr[parts[1]] = ptr[parts[2]];
    } else if (op === 'F') {
      const x = parts[1];
      const b = ptr[x];
      if (b === 0) {
        out.push(`FREE ${x} WILD`);
        wild++;
      } else if (alive[b]) {
        alive[b] = false;
        out.push(`FREE ${x} OK`);
        ok++;
      } else {
        out.push(`FREE ${x} DOUBLE`);
        dbl++;
      }
    } else if (op === 'R') {
      const x = parts[1];
      const b = ptr[x];
      if (b === 0) {
        out.push(`READ ${x} WILD`);
        wild++;
      } else if (alive[b]) {
        out.push(`READ ${x} SAFE`);
        safe++;
      } else {
        out.push(`READ ${x} DANGLING`);
        dangling++;
      }
    }
  }

  let leak = 0;
  for (let b = 1; b <= next; b++) if (alive[b]) leak++;
  out.push(`SAFE=${safe} OK=${ok} DOUBLE=${dbl} DANGLING=${dangling} WILD=${wild} LEAK=${leak}`);
  return out.join('\n') + '\n';
}

/* 边界：200 条指令，先全部分配再逐个释放，最后 LEAK=0 */
{
  const lines = [];
  for (let i = 0; i < 34; i++) {
    lines.push(`M ${NAMES[i % 3]}`);
  }
  lines.push('C p q');
  lines.push('C q r');
  for (let i = 0; i < 34; i++) {
    lines.push(`F ${NAMES[i % 3]}`);
  }
  for (let i = 0; i < 34; i++) {
    lines.push(`R ${NAMES[i % 3]}`);
  }
  const body = lines.slice(0, 200);
  cases.push({
    kind: 'boundary',
    category: '200 条指令：批量分配、别名、批量释放',
    input: `${body.length}\n${body.join('\n')}\n`,
    output: simulate(body),
  });
}

/* 陷阱：同一块被反复释放，DOUBLE 必须逐次计数 */
{
  const lines = ['M p', 'C q p', 'C r q'];
  for (let i = 0; i < 20; i++) lines.push(`F ${NAMES[i % 3]}`);
  for (let i = 0; i < 20; i++) lines.push(`R ${NAMES[i % 3]}`);
  cases.push({
    kind: 'trap',
    category: '20 次释放同一块 + 20 次悬垂读',
    input: `${lines.length}\n${lines.join('\n')}\n`,
    output: simulate(lines),
  });
}

/* 随机：400 条指令太长了，用 200 条随机的 M/C/F/R */
{
  const lines = [];
  for (let i = 0; i < 200; i++) {
    const r = rng.int(0, 9);
    const x = rng.pick(NAMES);
    if (r <= 3) lines.push(`M ${x}`);
    else if (r <= 4) lines.push(`C ${x} ${rng.pick(NAMES)}`);
    else if (r <= 7) lines.push(`F ${x}`);
    else lines.push(`R ${x}`);
  }
  cases.push({
    kind: 'normal',
    category: '200 条随机指令',
    input: `${lines.length}\n${lines.join('\n')}\n`,
    output: simulate(lines),
  });
}

return cases;
```
