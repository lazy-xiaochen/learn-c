---json
{
  "id": "p-s5-ub-return-local-1",
  "title": "栈帧生命周期追踪：返回局部地址后指针还指向什么",
  "difficulty": "L4",
  "knowledgePoints": ["s5-ub-return-local"],
  "special": "pointer-reasoning",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
"函数返回了局部变量的地址，之后这个指针还能用吗？"这个问题只看源码很难回答，因为答案取决于**那块栈内存后来被谁用了**。本题让你写一个小型栈帧观察器，把这件事一步一步算出来。

我们用一个简化的栈模型：

- 栈从地址 `BASE` 向**低地址**增长。用"距离 `BASE` 的字节偏移"来记位置：偏移越大，地址越低；
- `top` 表示当前栈顶的偏移（初始为 0）。压入一个 `size` 字节的帧后，这个帧占用偏移区间 `[top, top + size)`，然后 `top` 增加 `size`；
- 压入时把帧内的 `size` 个字节**全部填成给定的字母**；
- 弹出时 `top` 回到这个帧的起始偏移 `[top - size, top)`，**但字节内容原样保留**——栈帧被回收不等于内存被清零，下一个函数随时会覆盖它们。

四种事件：

| 事件 | 含义 |
|---|---|
| `push <字母> <size>` | 调用一个函数：压入 `size` 字节的帧，帧内全部填成该字母 |
| `pop` | 函数返回：弹出栈顶帧 |
| `addr <off>` | 取**当前帧**内偏移 `off` 的局部变量地址，保存为"第 k 个指针"（k 按 `addr` 出现的顺序从 1 开始） |
| `use <k>` | 通过第 k 个指针读一个字节 |

对每个 `use` 输出一行 `<状态> <字符>`：

- 状态：`live` 表示这个指针所属的帧**此刻还在栈上**；`dangling` 表示那个帧已经返回了（指针悬垂）；
- 字符：该地址上**现在**的字节。如果那个位置从来没被任何帧写过，输出 `.`。

所有事件处理完之后，再输出一行 `depth <n>`：还剩多少个帧在栈上。

## 输入格式
第一行一个整数 `n`：事件个数。

接下来 `n` 行，每行一个事件，格式如上表（字段之间一个空格）。

## 输出格式
每个 `use` 输出一行 `<live|dangling> <字符>`，全部事件结束后输出一行 `depth <n>`。

## 数据范围
- `1 ≤ n ≤ 100`；
- `1 ≤ size ≤ 64`，所有帧的总字节数不超过 6400；
- `addr` 的 `off` 满足 `0 ≤ off < 当前帧的 size`；
- `use` 的 `k` 一定指向已经保存过的指针；
- `pop` 只会在栈非空时出现。

## 示例
### 示例 1
```in
5
push a 4
addr 0
pop
push b 4
use 1
```
```out
dangling b
depth 1
```
> `make` 压入 4 字节的帧（偏移 `[0,4)`，全是 `'a'`），取到偏移 0 的地址存成第 1 个指针；函数返回后帧被回收，`top` 回到 0；接着另一个函数压入 4 字节的帧，**正好落在同一段偏移上**，字节被改写成 `'b'`。此时通过第 1 个指针读到的是 `'b'`——指针悬垂了，但地址还在，内容已经被别人占了。

### 示例 2（边界：只有一个帧，指针一直活着）
```in
3
push q 1
addr 0
use 1
```
```out
live q
depth 1
```
> 最小的合法场景：帧只有 1 个字节，指针指向它，读的时候帧还在栈上，状态是 `live`。注意最后 `depth` 是 1，因为没有任何 `pop`。

## 提示
### 第 1 层
先把栈模型建起来：一个 `top` 偏移、一个记录"当前栈上有哪些帧"的数组（每个帧记起始偏移和大小）。`push` 填字节并抬高 `top`，`pop` 压低 `top`，这些都是 O(1)。

### 第 2 层
判断 `live` / `dangling` **不能看地址**，要看"这个指针属于哪个帧、那个帧是否还在栈上"。所以 `addr` 时要把**当前帧的编号**一起存进指针记录里；`use` 时查这个编号的帧是否还活着。用地址范围判活会在"帧被弹出后又压入同样大小的新帧"时判错——那正是示例 1 的情形。

### 第 3 层
`pop` 只需要把 `top` 收回去、把帧标记为不活跃，**千万不要清字节**。题目里"读到旧值"和"读到新值"两种情况都要正确，靠的就是"字节一直留在那儿，谁压栈谁覆盖"。最后别忘了 `depth` 那一行。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXEV 100
#define MAXBYTES 65536

typedef struct {
    int base;         /* 帧的起始偏移 */
    int size;
    int active;       /* 是否还在栈上 */
} Frame;

typedef struct {
    int addr;         /* 地址（用偏移表示） */
    int frame;        /* 属于哪个帧 */
} Ptr;

static unsigned char mem[MAXBYTES];

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXEV) {
        return 0;
    }
    Frame fr[MAXEV];
    Ptr ptr[MAXEV];
    int stack[MAXEV];         /* 栈上每一层的帧编号 */
    int depth = 0;            /* 当前还在栈上的帧数 */
    int frames = 0;           /* 一共压过多少个帧（用作帧编号） */
    int ptrs = 0;
    int top = 0;              /* 栈顶偏移：地址 = BASE - top */

    for (int e = 0; e < n; e++) {
        char op[8];
        if (scanf("%7s", op) != 1) {
            return 0;
        }
        if (strcmp(op, "push") == 0) {
            char letter[4];
            int size;
            if (scanf("%3s %d", letter, &size) != 2 || size < 1 || size > 64) {
                return 0;
            }
            if (top + size > MAXBYTES) {
                return 0;
            }
            fr[frames].base = top;
            fr[frames].size = size;
            fr[frames].active = 1;
            for (int k = 0; k < size; k++) {
                mem[top + k] = (unsigned char)letter[0];
            }
            top += size;
            stack[depth] = frames;
            frames++;
            depth++;
        } else if (strcmp(op, "pop") == 0) {
            if (depth <= 0) {
                return 0;
            }
            depth--;
            fr[stack[depth]].active = 0;      /* 只标记失效，不清字节 */
            top = fr[stack[depth]].base;      /* 栈顶回到这个帧的起点 */
        } else if (strcmp(op, "addr") == 0) {
            int off;
            if (scanf("%d", &off) != 1 || depth <= 0) {
                return 0;
            }
            int cur = stack[depth - 1];
            if (off < 0 || off >= fr[cur].size) {
                return 0;
            }
            ptr[ptrs].addr = fr[cur].base + off;
            ptr[ptrs].frame = cur;
            ptrs++;
        } else if (strcmp(op, "use") == 0) {
            int k;
            if (scanf("%d", &k) != 1 || k < 1 || k > ptrs) {
                return 0;
            }
            Ptr p = ptr[k - 1];
            const char *verdict = fr[p.frame].active ? "live" : "dangling";
            unsigned char b = mem[p.addr];
            printf("%s %c\n", verdict, b != 0 ? (char)b : '.');
        }
    }
    printf("depth %d\n", depth);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXEV 100
#define MAXBYTES 65536

typedef struct {
    int base;
    int size;
    int active;
} Frame;

typedef struct {
    int addr;
    int frame;
} Ptr;

static unsigned char mem[MAXBYTES];

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXEV) {
        return 0;
    }
    Frame fr[MAXEV];
    Ptr ptr[MAXEV];
    int stack[MAXEV];
    int depth = 0;
    int frames = 0;
    int ptrs = 0;
    int top = 0;

    for (int e = 0; e < n; e++) {
        char op[8];
        if (scanf("%7s", op) != 1) {
            return 0;
        }
        if (strcmp(op, "push") == 0) {
            char letter[4];
            int size;
            if (scanf("%3s %d", letter, &size) != 2) {
                return 0;
            }
            fr[frames].base = top;
            fr[frames].size = size;
            fr[frames].active = 1;
            for (int k = 0; k < size; k++) {
                mem[top + k] = (unsigned char)letter[0];
            }
            top += size;
            stack[depth] = frames;
            frames++;
            depth++;
        } else if (strcmp(op, "pop") == 0) {
            depth--;
            fr[stack[depth]].active = 0;
            /* TODO: 栈顶也要收回去 */
        } else if (strcmp(op, "addr") == 0) {
            int off;
            if (scanf("%d", &off) != 1) {
                return 0;
            }
            int cur = stack[depth - 1];
            ptr[ptrs].addr = fr[cur].base + off;
            ptr[ptrs].frame = cur;
            ptrs++;
        } else if (strcmp(op, "use") == 0) {
            int k;
            if (scanf("%d", &k) != 1) {
                return 0;
            }
            Ptr p = ptr[k - 1];
            /* TODO: 帧已经返回时应该是 dangling，现在一律当活的 */
            unsigned char b = mem[p.addr];
            printf("live %c\n", b != 0 ? (char)b : '.');
        }
    }
    printf("depth %d\n", depth);
    return 0;
}
```

## 复杂度
时间 O(n + 总字节数)：每个事件常数时间，压栈时填 `size` 个字节。
空间 O(总字节数)：一个字节数组模拟整个栈。

## 常见错误
### 弹出时把帧内的字节清零 [WA]
"函数返回了，栈帧就被回收"很容易被理解成"内存被清空"。实际上 `pop` 只是把栈指针抬高，字节一个都不动——它们会在下一次压栈时被覆盖，也可能一直保留。清零之后，那些指向"没被后续帧覆盖的旧地址"的指针会读到 `.` 而不是旧字母。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXEV 100
#define MAXBYTES 65536

typedef struct {
    int base;
    int size;
    int active;
} Frame;

typedef struct {
    int addr;
    int frame;
} Ptr;

static unsigned char mem[MAXBYTES];

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    Frame fr[MAXEV];
    Ptr ptr[MAXEV];
    int stack[MAXEV];
    int depth = 0;
    int frames = 0;
    int ptrs = 0;
    int top = 0;
    for (int e = 0; e < n; e++) {
        char op[8];
        if (scanf("%7s", op) != 1) {
            return 0;
        }
        if (strcmp(op, "push") == 0) {
            char letter[4];
            int size;
            if (scanf("%3s %d", letter, &size) != 2) {
                return 0;
            }
            fr[frames].base = top;
            fr[frames].size = size;
            fr[frames].active = 1;
            for (int k = 0; k < size; k++) {
                mem[top + k] = (unsigned char)letter[0];
            }
            top += size;
            stack[depth] = frames;
            frames++;
            depth++;
        } else if (strcmp(op, "pop") == 0) {
            depth--;
            fr[stack[depth]].active = 0;
            for (int k = 0; k < fr[stack[depth]].size; k++) {
                mem[fr[stack[depth]].base + k] = 0;   /* 错：栈帧回收不清零 */
            }
            top = fr[stack[depth]].base;
        } else if (strcmp(op, "addr") == 0) {
            int off;
            if (scanf("%d", &off) != 1) {
                return 0;
            }
            int cur = stack[depth - 1];
            ptr[ptrs].addr = fr[cur].base + off;
            ptr[ptrs].frame = cur;
            ptrs++;
        } else if (strcmp(op, "use") == 0) {
            int k;
            if (scanf("%d", &k) != 1) {
                return 0;
            }
            Ptr p = ptr[k - 1];
            const char *verdict = fr[p.frame].active ? "live" : "dangling";
            unsigned char b = mem[p.addr];
            printf("%s %c\n", verdict, b != 0 ? (char)b : '.');
        }
    }
    printf("depth %d\n", depth);
    return 0;
}
```

### 用"地址是否在栈范围内"判断存活 [WA]
`addr < top` 只说明"这个偏移目前落在活跃栈区里"，不能说明**它属于哪个帧**。示例 1 里帧被弹出后又压入了同样大小的新帧，旧指针的地址又落回了活跃区，于是会被误判成 `live`。存活判定必须依据"指针所属的帧还在不在"，这要求 `addr` 时把帧编号存下来。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXEV 100
#define MAXBYTES 65536

typedef struct {
    int base;
    int size;
    int active;
} Frame;

typedef struct {
    int addr;
    int frame;
} Ptr;

static unsigned char mem[MAXBYTES];

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    Frame fr[MAXEV];
    Ptr ptr[MAXEV];
    int stack[MAXEV];
    int depth = 0;
    int frames = 0;
    int ptrs = 0;
    int top = 0;
    for (int e = 0; e < n; e++) {
        char op[8];
        if (scanf("%7s", op) != 1) {
            return 0;
        }
        if (strcmp(op, "push") == 0) {
            char letter[4];
            int size;
            if (scanf("%3s %d", letter, &size) != 2) {
                return 0;
            }
            fr[frames].base = top;
            fr[frames].size = size;
            fr[frames].active = 1;
            for (int k = 0; k < size; k++) {
                mem[top + k] = (unsigned char)letter[0];
            }
            top += size;
            stack[depth] = frames;
            frames++;
            depth++;
        } else if (strcmp(op, "pop") == 0) {
            depth--;
            fr[stack[depth]].active = 0;
            top = fr[stack[depth]].base;
        } else if (strcmp(op, "addr") == 0) {
            int off;
            if (scanf("%d", &off) != 1) {
                return 0;
            }
            int cur = stack[depth - 1];
            ptr[ptrs].addr = fr[cur].base + off;
            ptr[ptrs].frame = cur;
            ptrs++;
        } else if (strcmp(op, "use") == 0) {
            int k;
            if (scanf("%d", &k) != 1) {
                return 0;
            }
            Ptr p = ptr[k - 1];
            const char *verdict = p.addr < top ? "live" : "dangling";   /* 错：看地址不看帧 */
            unsigned char b = mem[p.addr];
            printf("%s %c\n", verdict, b != 0 ? (char)b : '.');
        }
    }
    printf("depth %d\n", depth);
    return 0;
}
```

### 弹出时忘了把 `top` 收回去 [WA]
只把帧标记失效、不恢复栈顶，下一个 `push` 就会在更高的偏移上分配，新帧盖不到旧帧的地址。示例 1 本该读到新帧的 `'b'`，结果读到旧帧残留的 `'a'`——悬垂指针"读到旧值还是新值"这个最关键的区别就丢了。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXEV 100
#define MAXBYTES 65536

typedef struct {
    int base;
    int size;
    int active;
} Frame;

typedef struct {
    int addr;
    int frame;
} Ptr;

static unsigned char mem[MAXBYTES];

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    Frame fr[MAXEV];
    Ptr ptr[MAXEV];
    int stack[MAXEV];
    int depth = 0;
    int frames = 0;
    int ptrs = 0;
    int top = 0;
    for (int e = 0; e < n; e++) {
        char op[8];
        if (scanf("%7s", op) != 1) {
            return 0;
        }
        if (strcmp(op, "push") == 0) {
            char letter[4];
            int size;
            if (scanf("%3s %d", letter, &size) != 2) {
                return 0;
            }
            fr[frames].base = top;
            fr[frames].size = size;
            fr[frames].active = 1;
            for (int k = 0; k < size; k++) {
                mem[top + k] = (unsigned char)letter[0];
            }
            top += size;
            stack[depth] = frames;
            frames++;
            depth++;
        } else if (strcmp(op, "pop") == 0) {
            depth--;
            fr[stack[depth]].active = 0;         /* 错：没有把 top 收回去 */
        } else if (strcmp(op, "addr") == 0) {
            int off;
            if (scanf("%d", &off) != 1) {
                return 0;
            }
            int cur = stack[depth - 1];
            ptr[ptrs].addr = fr[cur].base + off;
            ptr[ptrs].frame = cur;
            ptrs++;
        } else if (strcmp(op, "use") == 0) {
            int k;
            if (scanf("%d", &k) != 1) {
                return 0;
            }
            Ptr p = ptr[k - 1];
            const char *verdict = fr[p.frame].active ? "live" : "dangling";
            unsigned char b = mem[p.addr];
            printf("%s %c\n", verdict, b != 0 ? (char)b : '.');
        }
    }
    printf("depth %d\n", depth);
    return 0;
}
```

### 用 `top + off` 计算局部变量地址 [WA]
局部变量的地址是"**帧的起始偏移** + 帧内偏移"，不是"栈顶偏移 + 帧内偏移"。用 `top + off` 会整体偏掉当前帧的大小，读到别的帧甚至没写过的位置（输出里会出现 `.`）。

### 忘了输出 `depth` [WA]
所有 `use` 都对、最后少一行 `depth`，比较是逐行的，直接判错。

## 测试用例
### 01 sample 示例 1
```in
5
push a 4
addr 0
pop
push b 4
use 1
```
```out
dangling b
depth 1
```

### 02 sample 示例 2
```in
3
push q 1
addr 0
use 1
```
```out
live q
depth 1
```

### 03 boundary 48 个事件：十层嵌套后一次性弹出
```in
48
push a 8
addr 0
use 1
push b 8
addr 0
use 1
push c 8
addr 0
use 1
push d 8
addr 0
use 1
push e 8
addr 0
use 1
push f 8
addr 0
use 1
push g 8
addr 0
use 1
push h 8
addr 0
use 1
push i 8
addr 0
use 1
push j 8
addr 0
use 1
pop
pop
pop
pop
pop
pop
pop
pop
pop
pop
use 1
push z 4
push z 4
push z 4
push z 4
push z 4
use 1
use 2
```
```out
live a
live a
live a
live a
live a
live a
live a
live a
live a
live a
dangling a
dangling z
dangling z
depth 5
```
> 十个帧依次压入，每次都取"当前帧偏移 0"的地址；因为 `addr` 取的是**当前帧**，第 k 个指针指向的是第 k 个帧的起点，而在压入第 k+1 个帧之前它一直是活的，所以十次 `use` 全是 `live a`（第 1 个帧）。十次 `pop` 之后第 1 个指针悬垂，偏移 0 处已经被五个 `'z'` 帧覆盖，所以读到 `dangling z`。

### 04 degenerate 帧只有一个字节，取最后一个字节
```in
3
push a 64
addr 63
use 1
```
```out
live a
depth 1
```
> 边界在"帧内偏移最大"的一端：`off = 63` 是 64 字节帧的最后一个字节，仍然在合法范围内。

### 05 trap 悬垂指针读到被新帧覆盖的值
```in
7
push a 8
addr 6
pop
push b 8
pop
push c 8
use 1
```
```out
dangling c
depth 1
```
> 指针指向偏移 6。`a` 帧被弹出后，`b` 帧压在同一段上把字节改成 `'b'`，`b` 帧被弹出后 `c` 帧又把它改成 `'c'`。所以最终读到的是 `'c'`——悬垂指针看到的永远是"现在住在那儿的人"。

### 06 trap 旧字节还在（新帧没覆盖到）
```in
6
push a 8
addr 4
use 1
pop
push c 2
use 1
```
```out
live a
dangling a
depth 1
```
> 第一次读时帧还活着（`live a`）。弹出后压入的 `c` 帧只占偏移 `[0,2)`，碰不到偏移 4，于是那块字节仍保留着 `'a'`——**悬垂指针读到旧值**正是这一种。它和上一组"读到新值"合起来，才是这类 bug 的全貌。

### 07 normal 嵌套帧与逐层返回
```in
9
push m 16
addr 15
push n 16
addr 0
use 1
use 2
pop
use 2
pop
```
```out
live m
live n
dangling n
depth 0
```
> 第 1 个指针指向 `m` 帧的最后一个字节（偏移 15），第 2 个指向 `n` 帧的起点（偏移 16）。两次读都在 `n` 还在栈上时，所以都是 `live`；`pop` 掉 `n` 之后第 2 个指针悬垂；再 `pop` 掉 `m` 后栈空。
