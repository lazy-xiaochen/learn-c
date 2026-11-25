---json
{
  "id": "p-s7-iv-handwrite-lib-1",
  "title": "字符串库审计器：strcpy / memcpy / memmove 的边界与重叠 UB 判定",
  "difficulty": "L4",
  "knowledgePoints": ["s7-iv-handwrite-lib"],
  "special": "ub-analysis",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
面试官让你手写 `strcpy` / `memcpy` / `memmove`，真正想考的不是"能不能复制"，而是**你知不知道哪些调用是未定义行为**。本题请你实现一个"字符串库审计器"：给定一段 64 字节的内存和一连串库函数调用，逐条判定每次调用是否合法。

### 内存模型
内存是 `char mem[64]`，下标 **0 到 63**。第一行输入用 64 个字符描述它的初始内容：

- `.` 表示字节 `'\0'`；
- 其他字符（字母、数字）就是该字节本身。

例如 `hello` 后面跟 59 个 `.`，表示 `mem[0..4] = "hello"`、`mem[5] = '\0'`、其余都是 `'\0'`。

### 三种操作
| 操作 | 语义 |
|---|---|
| `strcpy d s` | 从 `s` 开始找第一个 `'\0'`，把 `[s, nul]`（**包含这个 `'\0'`**）复制到从 `d` 开始的连续字节 |
| `memcpy d s n` | 把 `[s, s+n)` 的 `n` 个字节复制到 `[d, d+n)` |
| `memmove d s n` | 同 `memcpy`，但**允许源和目标重叠** |

### 判定规则（顺序不能乱）
对每次调用，按下面的顺序检查，命中第一条就报告对应的结论：

1. **读越界** `ub-read`：
   - `strcpy`：在 `[s, 63]` 范围内找不到 `'\0'`（继续读下去就会读到内存外）；
   - `memcpy` / `memmove`：`s + n > 64`。
2. **写越界** `ub-write`：
   - `strcpy`：设 `len` 为"从 `s` 到 `'\0'`（含）的字节数"，若 `d + len > 64`；
   - `memcpy` / `memmove`：`d + n > 64`。
3. **重叠** `ub-overlap`（仅 `strcpy` 和 `memcpy`）：
   - 区间 `[d, d+len)` 与 `[s, s+len)` 有交集（`len` 对 `strcpy` 是含 `'\0'` 的字节数，对 `memcpy` 是 `n`）；
   - `len = 0` 或 `n = 0` 时不算重叠（没有访问任何字节）；
   - `memmove` **永远不报** `ub-overlap`。
4. 都不命中 → `ok`，并把这次复制**真正执行**到内存上，后续调用看到的是更新后的内容。

### "UB 之后还继续"是怎么回事
真实的 C 程序一旦踩到 UB，后面发生什么都不再有保证。本题模拟的是一台**审计工具**：非法的调用被"拒绝执行"（内存保持不变），审计继续往下走，好让你把整段操作里的问题都列出来。这个"拒绝执行"的规定只属于本题的模型，**不是 C 语言的行为**——别把它当成"UB 可以恢复"。

## 输入格式
第一行：恰好 64 个字符，每个字符是字母、数字或 `.`（`.` 表示 `'\0'`）。
第二行：一个整数 `q`。
接下来 `q` 行：每行一条操作，格式为 `strcpy d s`、`memcpy d s n` 或 `memmove d s n`。

## 输出格式
输出 `q` 行，每行是 `ok`、`ub-read`、`ub-write`、`ub-overlap` 之一，对应每一条操作。

## 数据范围
1 ≤ q ≤ 200
0 ≤ d, s ≤ 63
0 ≤ n ≤ 64
输出最多 200 行，不超过 3KB。

## 示例
### 示例 1
```in
hello...........................................................
4
strcpy 8 0
memcpy 10 8 8
memmove 10 8 8
memcpy 60 0 5
```
```out
ok
ub-overlap
ok
ub-write
```
> 第 1 条：`s = 0` 的 `'\0'` 在 5，`len = 6`（含结尾），`d = 8` 装得下、也不重叠 → `ok`，于是 `mem[8..13] = "hello\0"`。
> 第 2 条：源 `[8, 16)`、目的 `[10, 18)` 有交集，`memcpy` 重叠 → `ub-overlap`。
> 第 3 条：同样的区间换成 `memmove` 就合法 → `ok`。
> 第 4 条：`n = 5`，`d = 60`，`60 + 5 = 65 > 64` → 写越界 `ub-write`（读方向 `0 + 5` 没问题）。

### 示例 2（边界：`'\0'` 落在最后一个字节）
```in
............................................................abc.
2
strcpy 0 60
strcpy 61 60
```
```out
ok
ub-write
```
> `mem[60..62] = "abc"`、`mem[63] = '\0'`。第 1 条：`len = 4`（`a b c` 加结尾 `'\0'`），`d = 0` 能放下全部 4 字节 → `ok`，复制后 `mem[0..3] = "abc\0"`。
> 第 2 条：`d = 61`，`61 + 4 = 65 > 64` → `ub-write`。这里最容易错的是**把 `'\0'` 漏掉**：如果 `len` 只算 3，`61 + 3 = 64` 就会被误判成 `ok`。

## 提示
### 第 1 层
先把内存读成 `unsigned char mem[64]`：`.` 转成 0，其他字符转成它的编码。然后每条操作按"名字 + 参数"解析：`strcpy` 后面是两个整数，`memcpy`/`memmove` 后面是三个整数；名字可以用 `op[0] == 's'` 区分 `strcpy`，用 `op[3] == 'c'` 区分 `memcpy` 和 `memmove`。

### 第 2 层
`strcpy` 的判定分三步：先 `for (i = s; i < 64 && mem[i] != 0; i++)` 找结尾；找不到 → `ub-read`；找到后 `len = i - s + 1`（**加 1 是因为结尾的 `'\0'` 也要复制**）。然后依次判 `d + len > 64` 和区间重叠。`memcpy`/`memmove` 的 `len` 就是 `n`，直接判 `s + n > 64`、`d + n > 64`、`memcpy` 再判重叠。

### 第 3 层
三个细节：

1. **重叠的判断**：`len > 0 && d < s + len && s < d + len`，三个条件缺一不可；`n = 0` 时区间是空的，不能算重叠；
2. **判定顺序**：先读后写、再重叠。`memcpy 60 60 8` 同时"读越界"和"写越界"，按规则应报 `ub-read`；顺序写错就会输出另一个答案；
3. **合法的复制要真的执行**：示例 1 第 2 条被判 `ub-overlap` 不执行，但第 1 条的 `ok` 已经把 `hello\0` 写进了 `mem[8..13]`，第 3 条的 `memmove` 依赖这份新内容。`memmove` 的重叠复制要先把源字节搬到临时数组，再写回目的（或者按方向分两段复制）。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MEM_SIZE 64

static int find_nul(const unsigned char *mem, int from) {
    for (int i = from; i < MEM_SIZE; i++) {
        if (mem[i] == 0) {
            return i;
        }
    }
    return -1;
}

static int ranges_overlap(int d, int s, int len) {
    if (len <= 0) {
        return 0;
    }
    return d < s + len && s < d + len;
}

int main(void) {
    char line[65];
    if (scanf("%64s", line) != 1) {
        return 0;
    }

    unsigned char mem[MEM_SIZE];
    for (int i = 0; i < MEM_SIZE; i++) {
        mem[i] = (line[i] == '.') ? 0u : (unsigned char)line[i];
    }

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 200) {
        return 0;
    }

    for (int k = 0; k < q; k++) {
        char op[9];
        int d;
        int s;
        if (scanf("%8s %d %d", op, &d, &s) != 3) {
            return 0;
        }
        if (d < 0 || d >= MEM_SIZE || s < 0 || s >= MEM_SIZE) {
            return 0;
        }

        if (op[0] == 's') {                     /* strcpy */
            int nul = find_nul(mem, s);
            if (nul < 0) {
                printf("ub-read\n");
                continue;
            }
            int len = nul - s + 1;              /* 结尾的 '\0' 也要占一个字节 */
            if (d + len > MEM_SIZE) {
                printf("ub-write\n");
                continue;
            }
            if (ranges_overlap(d, s, len)) {
                printf("ub-overlap\n");
                continue;
            }
            for (int i = 0; i < len; i++) {
                mem[d + i] = mem[s + i];
            }
            printf("ok\n");
        } else {
            int n;
            if (scanf("%d", &n) != 1 || n < 0 || n > MEM_SIZE) {
                return 0;
            }
            if (s + n > MEM_SIZE) {
                printf("ub-read\n");
                continue;
            }
            if (d + n > MEM_SIZE) {
                printf("ub-write\n");
                continue;
            }
            if (op[3] == 'c') {                 /* memcpy：不允许重叠 */
                if (ranges_overlap(d, s, n)) {
                    printf("ub-overlap\n");
                    continue;
                }
            }
            unsigned char tmp[MEM_SIZE];
            for (int i = 0; i < n; i++) {
                tmp[i] = mem[s + i];
            }
            for (int i = 0; i < n; i++) {
                mem[d + i] = tmp[i];
            }
            printf("ok\n");
        }
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MEM_SIZE 64

int main(void) {
    char line[65];
    if (scanf("%64s", line) != 1) {
        return 0;
    }

    unsigned char mem[MEM_SIZE];
    for (int i = 0; i < MEM_SIZE; i++) {
        mem[i] = (line[i] == '.') ? 0u : (unsigned char)line[i];
    }

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 200) {
        return 0;
    }

    for (int k = 0; k < q; k++) {
        char op[9];
        int d;
        int s;
        if (scanf("%8s %d %d", op, &d, &s) != 3) {
            return 0;
        }

        /* TODO: 按 op 读入 n（memcpy / memmove 需要），
         *       依次检查读越界、写越界、重叠，
         *       合法的调用还要把字节真正复制到 mem 上 */
        if (op[0] != 's') {
            int n;
            if (scanf("%d", &n) != 1) {
                return 0;
            }
        }

        printf("ok\n");
    }
    return 0;
}
```

## 复杂度
时间 O(q × 64)：每条操作最多扫描或复制 64 个字节。
空间 O(64)：一份内存副本和一个复制用的临时数组。

## 常见错误
### `strcpy` 的 `len` 漏算结尾的 `'\0'` [WA]
复制 `n` 个可见字符需要 `n + 1` 个字节。`len = nul - s` 少了 1，`d + len == 64` 这种"刚好差一个字节"的情况就会被误判成合法，示例 2 的第 2 条正是这个坑。**`strcpy` 的语义是连 `'\0'` 一起复制**，长度必须 `+ 1`。

```c file=main.c expect=WA
#include <stdio.h>

#define MEM_SIZE 64

static int find_nul(const unsigned char *mem, int from) {
    for (int i = from; i < MEM_SIZE; i++) {
        if (mem[i] == 0) {
            return i;
        }
    }
    return -1;
}

static int ranges_overlap(int d, int s, int len) {
    if (len <= 0) {
        return 0;
    }
    return d < s + len && s < d + len;
}

int main(void) {
    char line[65];
    if (scanf("%64s", line) != 1) {
        return 0;
    }
    unsigned char mem[MEM_SIZE];
    for (int i = 0; i < MEM_SIZE; i++) {
        mem[i] = (line[i] == '.') ? 0u : (unsigned char)line[i];
    }
    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 200) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        char op[9];
        int d;
        int s;
        if (scanf("%8s %d %d", op, &d, &s) != 3) {
            return 0;
        }
        if (op[0] == 's') {
            int nul = find_nul(mem, s);
            if (nul < 0) {
                printf("ub-read\n");
                continue;
            }
            int len = nul - s;              /* 错：漏掉了结尾的 '\0' */
            if (d + len > MEM_SIZE) {
                printf("ub-write\n");
                continue;
            }
            if (ranges_overlap(d, s, len)) {
                printf("ub-overlap\n");
                continue;
            }
            for (int i = 0; i < len; i++) {
                mem[d + i] = mem[s + i];
            }
            printf("ok\n");
        } else {
            int n;
            if (scanf("%d", &n) != 1) {
                return 0;
            }
            if (s + n > MEM_SIZE) {
                printf("ub-read\n");
                continue;
            }
            if (d + n > MEM_SIZE) {
                printf("ub-write\n");
                continue;
            }
            if (op[3] == 'c' && ranges_overlap(d, s, n)) {
                printf("ub-overlap\n");
                continue;
            }
            for (int i = 0; i < n; i++) {
                mem[d + i] = mem[s + i];
            }
            printf("ok\n");
        }
    }
    return 0;
}
```

### 忘了检查 `memcpy` 的重叠 [WA]
`memcpy` 的标准前提是源和目标**不重叠**。只检查越界、不检查重叠，示例 1 的第 2 条就会输出 `ok` 而不是 `ub-overlap`。注意区分：这条规则只适用于 `memcpy`，`memmove` 允许重叠——把重叠检查加给 `memmove` 就是另一个错误。

```c file=main.c expect=WA
#include <stdio.h>

#define MEM_SIZE 64

static int find_nul(const unsigned char *mem, int from) {
    for (int i = from; i < MEM_SIZE; i++) {
        if (mem[i] == 0) {
            return i;
        }
    }
    return -1;
}

static int ranges_overlap(int d, int s, int len) {
    if (len <= 0) {
        return 0;
    }
    return d < s + len && s < d + len;
}

int main(void) {
    char line[65];
    if (scanf("%64s", line) != 1) {
        return 0;
    }
    unsigned char mem[MEM_SIZE];
    for (int i = 0; i < MEM_SIZE; i++) {
        mem[i] = (line[i] == '.') ? 0u : (unsigned char)line[i];
    }
    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 200) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        char op[9];
        int d;
        int s;
        if (scanf("%8s %d %d", op, &d, &s) != 3) {
            return 0;
        }
        if (op[0] == 's') {
            int nul = find_nul(mem, s);
            if (nul < 0) {
                printf("ub-read\n");
                continue;
            }
            int len = nul - s + 1;
            if (d + len > MEM_SIZE) {
                printf("ub-write\n");
                continue;
            }
            if (ranges_overlap(d, s, len)) {
                printf("ub-overlap\n");
                continue;
            }
            for (int i = 0; i < len; i++) {
                mem[d + i] = mem[s + i];
            }
            printf("ok\n");
        } else {
            int n;
            if (scanf("%d", &n) != 1) {
                return 0;
            }
            if (s + n > MEM_SIZE) {
                printf("ub-read\n");
                continue;
            }
            if (d + n > MEM_SIZE) {
                printf("ub-write\n");
                continue;
            }
            /* 错：memcpy 完全没有检查重叠 */
            for (int i = 0; i < n; i++) {
                mem[d + i] = mem[s + i];
            }
            printf("ok\n");
        }
    }
    return 0;
}
```

### 给 `memmove` 也判重叠 [WA]
`memmove` 的唯一价值就是允许重叠，给它报 `ub-overlap` 等于把合法调用判成 UB。示例 1 的第 3 条会立刻暴露：同一个重叠区间，`memcpy` 报错、`memmove` 必须 `ok`。

```c file=main.c expect=WA
#include <stdio.h>

#define MEM_SIZE 64

static int find_nul(const unsigned char *mem, int from) {
    for (int i = from; i < MEM_SIZE; i++) {
        if (mem[i] == 0) {
            return i;
        }
    }
    return -1;
}

static int ranges_overlap(int d, int s, int len) {
    if (len <= 0) {
        return 0;
    }
    return d < s + len && s < d + len;
}

int main(void) {
    char line[65];
    if (scanf("%64s", line) != 1) {
        return 0;
    }
    unsigned char mem[MEM_SIZE];
    for (int i = 0; i < MEM_SIZE; i++) {
        mem[i] = (line[i] == '.') ? 0u : (unsigned char)line[i];
    }
    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 200) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        char op[9];
        int d;
        int s;
        if (scanf("%8s %d %d", op, &d, &s) != 3) {
            return 0;
        }
        if (op[0] == 's') {
            int nul = find_nul(mem, s);
            if (nul < 0) {
                printf("ub-read\n");
                continue;
            }
            int len = nul - s + 1;
            if (d + len > MEM_SIZE) {
                printf("ub-write\n");
                continue;
            }
            if (ranges_overlap(d, s, len)) {
                printf("ub-overlap\n");
                continue;
            }
            for (int i = 0; i < len; i++) {
                mem[d + i] = mem[s + i];
            }
            printf("ok\n");
        } else {
            int n;
            if (scanf("%d", &n) != 1) {
                return 0;
            }
            if (s + n > MEM_SIZE) {
                printf("ub-read\n");
                continue;
            }
            if (d + n > MEM_SIZE) {
                printf("ub-write\n");
                continue;
            }
            if (ranges_overlap(d, s, n)) {  /* 错：memmove 允许重叠 */
                printf("ub-overlap\n");
                continue;
            }
            unsigned char tmp[MEM_SIZE];
            for (int i = 0; i < n; i++) {
                tmp[i] = mem[s + i];
            }
            for (int i = 0; i < n; i++) {
                mem[d + i] = tmp[i];
            }
            printf("ok\n");
        }
    }
    return 0;
}
```

### 越界判断写成 `>=`，差一错误 [WA]
`d + n > 64` 才是越界；写成 `d + n >= 64` 会把"正好写到最后一个字节"的合法调用判成 `ub-write`。示例 2 的第 1 条和 `memcpy 60 0 4` 都属于"刚好填满 64 字节"的合法边界。**数组下标 0..63，结束位置 64 是合法的"紧挨着末尾"。**

```c file=main.c expect=WA
#include <stdio.h>

#define MEM_SIZE 64

static int find_nul(const unsigned char *mem, int from) {
    for (int i = from; i < MEM_SIZE; i++) {
        if (mem[i] == 0) {
            return i;
        }
    }
    return -1;
}

static int ranges_overlap(int d, int s, int len) {
    if (len <= 0) {
        return 0;
    }
    return d < s + len && s < d + len;
}

int main(void) {
    char line[65];
    if (scanf("%64s", line) != 1) {
        return 0;
    }
    unsigned char mem[MEM_SIZE];
    for (int i = 0; i < MEM_SIZE; i++) {
        mem[i] = (line[i] == '.') ? 0u : (unsigned char)line[i];
    }
    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 200) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        char op[9];
        int d;
        int s;
        if (scanf("%8s %d %d", op, &d, &s) != 3) {
            return 0;
        }
        if (op[0] == 's') {
            int nul = find_nul(mem, s);
            if (nul < 0) {
                printf("ub-read\n");
                continue;
            }
            int len = nul - s + 1;
            if (d + len >= MEM_SIZE) {      /* 错：应为 > */
                printf("ub-write\n");
                continue;
            }
            if (ranges_overlap(d, s, len)) {
                printf("ub-overlap\n");
                continue;
            }
            for (int i = 0; i < len; i++) {
                mem[d + i] = mem[s + i];
            }
            printf("ok\n");
        } else {
            int n;
            if (scanf("%d", &n) != 1) {
                return 0;
            }
            if (s + n > MEM_SIZE) {
                printf("ub-read\n");
                continue;
            }
            if (d + n >= MEM_SIZE) {        /* 错：应为 > */
                printf("ub-write\n");
                continue;
            }
            if (op[3] == 'c' && ranges_overlap(d, s, n)) {
                printf("ub-overlap\n");
                continue;
            }
            unsigned char tmp[MEM_SIZE];
            for (int i = 0; i < n; i++) {
                tmp[i] = mem[s + i];
            }
            for (int i = 0; i < n; i++) {
                mem[d + i] = tmp[i];
            }
            printf("ok\n");
        }
    }
    return 0;
}
```

### 判定顺序写反：先判重叠再判越界 [WA]
`memcpy 60 60 8` 同时满足"读越界"和"区间重叠"，题目规定先判读越界，答案是 `ub-read`。如果实现里先判断重叠，就会输出 `ub-overlap`。**规则里的顺序是有意义的**，不是随便列举。

### 错把"被拒绝的 UB 操作"也执行了 [WA]
本题的模型规定 UB 调用**不修改内存**，审计继续。如果代码在报 `ub-overlap` 之后仍然把字节复制过去，后续操作看到的初始内容就变了，本来该 `ok` 的调用可能变成 `ub-overlap`／`ub-write`。示例 1 的第 2 条之后紧接着就是第 3 条 `memmove`，专门用来抓这个错。

## 测试用例
### 01 sample 示例 1
```in
hello...........................................................
4
strcpy 8 0
memcpy 10 8 8
memmove 10 8 8
memcpy 60 0 5
```
```out
ok
ub-overlap
ok
ub-write
```

### 02 sample 示例 2
```in
............................................................abc.
2
strcpy 0 60
strcpy 61 60
```
```out
ok
ub-write
```

### 03 degenerate 长度为 0 的复制
```in
abcdefgh........................................................
1
memcpy 0 0 0
```
```out
ok
```

### 04 boundary 整段内存没有结尾的 '\0'
```in
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
1
strcpy 0 20
```
```out
ub-read
```

### 05 trap 源和目的是同一个位置
```in
abcdefgh........................................................
1
strcpy 5 5
```
```out
ub-overlap
```

### 06 trap memcpy 与 memmove 对同一个重叠区间的不同判定
```in
abcdefgh........................................................
3
memmove 0 2 5
memcpy 0 2 5
memmove 20 2 5
```
```out
ok
ub-overlap
ok
```

### 07 trap 读越界与写越界同时成立，先报读越界
```in
abcdefgh........................................................
1
memcpy 60 60 8
```
```out
ub-read
```

### 08 boundary 刚好写到最后一个字节
```in
abcdefgh........................................................
2
memcpy 60 0 4
memcpy 61 0 4
```
```out
ok
ub-write
```

### 09 normal 连续的复制与反转
```in
abcdefgh........................................................
6
strcpy 16 0
memcpy 0 16 5
strcpy 20 0
memcpy 30 16 8
strcpy 30 16
memmove 32 16 8
```
```out
ok
ok
ok
ok
ok
ok
```

### 生成 boundary 200 条贴边操作
```js gen
const cases = [];

const MEM = 64;

function findNul(mem, from) {
  for (let i = from; i < MEM; i++) if (mem[i] === 0) return i;
  return -1;
}

function overlap(d, s, len) {
  return len > 0 && d < s + len && s < d + len;
}

function apply(mem, op) {
  const parts = op.split(' ');
  const name = parts[0];
  const d = Number(parts[1]);
  const s = Number(parts[2]);
  if (name === 'strcpy') {
    const nul = findNul(mem, s);
    if (nul < 0) return 'ub-read';
    const len = nul - s + 1;
    if (d + len > MEM) return 'ub-write';
    if (overlap(d, s, len)) return 'ub-overlap';
    for (let i = 0; i < len; i++) mem[d + i] = mem[s + i];
    return 'ok';
  }
  const n = Number(parts[3]);
  if (s + n > MEM) return 'ub-read';
  if (d + n > MEM) return 'ub-write';
  if (name === 'memcpy' && overlap(d, s, n)) return 'ub-overlap';
  const tmp = [];
  for (let i = 0; i < n; i++) tmp.push(mem[s + i]);
  for (let i = 0; i < n; i++) mem[d + i] = tmp[i];
  return 'ok';
}

function render(memLine, ops) {
  const mem = [];
  for (const ch of memLine) mem.push(ch === '.' ? 0 : ch.charCodeAt(0));
  const out = [];
  for (const op of ops) out.push(apply(mem, op));
  return out.join('\n') + '\n';
}

/* 内存：两段字符串分别位于 0 和 32，中间与末尾留出 NUL */
const pattern = 'abcdefgh' + '.'.repeat(24) + '01234567' + '.'.repeat(24);

/* 边界：200 条操作，偏移在 0、60、61、63 等贴边位置反复横跳 */
{
  const ops = [];
  const edge = [[0, 0], [0, 63], [63, 0], [60, 0], [0, 60], [32, 0], [0, 32], [61, 61]];
  for (let i = 0; i < 200; i++) {
    const kind = i % 4;
    const pair = edge[i % edge.length];
    const d = pair[0];
    const s = pair[1];
    if (kind === 0) ops.push(`strcpy ${d} ${s}`);
    else if (kind === 1) ops.push(`memcpy ${d} ${s} ${i % 65}`);
    else if (kind === 2) ops.push(`memmove ${d} ${s} ${i % 5}`);
    else ops.push(`memcpy ${d} ${s} ${64 - Math.max(d, s)}`);
  }
  cases.push({
    kind: 'boundary',
    category: '200 条贴边操作',
    input: `${pattern}\n${ops.length}\n${ops.join('\n')}\n`,
    output: render(pattern, ops),
  });
}

/* 压力：200 条随机操作 */
{
  const ops = [];
  for (let i = 0; i < 200; i++) {
    const d = rng.int(0, 63);
    const s = rng.int(0, 63);
    const r = rng.int(0, 2);
    if (r === 0) ops.push(`strcpy ${d} ${s}`);
    else if (r === 1) ops.push(`memcpy ${d} ${s} ${rng.int(0, 64)}`);
    else ops.push(`memmove ${d} ${s} ${rng.int(0, 64)}`);
  }
  cases.push({
    kind: 'stress',
    category: '200 条随机 strcpy/memcpy/memmove',
    input: `${pattern}\n${ops.length}\n${ops.join('\n')}\n`,
    output: render(pattern, ops),
  });
}

return cases;
```
