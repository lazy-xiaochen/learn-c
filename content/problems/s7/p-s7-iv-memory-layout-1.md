---json
{
  "id": "p-s7-iv-memory-layout-1",
  "title": "段内布局推算：.data / .bss / .rodata 的偏移、填充与归属",
  "difficulty": "L5",
  "knowledgePoints": ["s7-iv-memory-layout"],
  "special": "memory-layout",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
面试里问"这些全局变量各自住在哪个段、为什么 `sizeof` 比成员大小之和大"，正确的回答要能落到**具体的偏移**上。本题让你把这件事算给面试官看。

给定 `k` 个文件作用域对象，每个对象有名字、大小、对齐要求、初值是否为非零、是否 `const`。按下面的**简化链接视图**（真实链接器还有节合并、符号对齐等细节，本题一切以这份规则为准）把它们放进三个段里：

1. **段归属**（面试要背的那条规则）：
   - `const` 为真 → `rodata`（只读数据区）；
   - 否则初值非零 → `data`（已初始化数据区）；
   - 否则 → `bss`（未初始化数据区，加载时清零）。
2. **段内放置**：每个段独立处理，对象按**输入顺序**依次放置。放一个对象时，先把该段"已占用字节数"`used` 向上取整到该对象对齐值的倍数（差出来的部分是填充），对象的段内偏移就是取整后的 `used`，然后把 `used` 加上对象大小。
3. **段大小**：每个段最后把 `used` 向上取整到 **16 的倍数**，得到该段的字节数；一个对象都没有的段大小为 `0`。
4. **查询**：给一个段名和一个段内偏移 `o`，判断这个字节属于谁：
   - `o` 不小于该段大小时 → `out`（该字节不在这个段里）；
   - 否则落在某个对象的 `[偏移, 偏移 + 大小)` 区间内 → 该对象的名字；
   - 剩下的（对象之间的填充、段尾的对齐填充）→ `pad`。

## 输入格式
第一行一个整数 `k`（对象个数）。

接下来 `k` 行，每行五个字段，用空格分隔：

```
<名字> <大小> <对齐> <init> <isconst>
```

- 名字由小写字母、数字、下划线组成，长度 1–15；
- 大小 ∈ {1, 2, 4, 8}，对齐 ∈ {1, 2, 4, 8}，且**对齐整除大小**；
- `init`、`isconst` 是 `0` 或 `1`，含义见上面的段归属规则。

接下来一行一个整数 `q`（查询个数）。

接下来 `q` 行，每行 `<段名> <偏移>`，段名是 `data`、`bss`、`rodata` 之一，偏移是非负整数。

## 输出格式
先按固定顺序输出三个段的大小，每行一个：

```
data <字节数>
bss <字节数>
rodata <字节数>
```

然后按**输入顺序**为每个对象输出一行：

```
<名字> <段名> +<段内偏移> size=<大小>
```

偏移前的 `+` 不能省略。

最后对每个查询输出一行：

```
<段名> <偏移> -> <归属>
```

`<归属>` 是对象名字、`pad` 或 `out` 之一，规则见题目描述第 4 条。查询按输入顺序回答，允许重复。

## 数据范围
1 ≤ k ≤ 100
1 ≤ q ≤ 500
每个对象大小 ∈ {1, 2, 4, 8}，对齐 ∈ {1, 2, 4, 8}，对齐整除大小
0 ≤ 偏移 ≤ 1000

段内偏移最大为 100 × 8 = 800 再取整到 816，偏移上界 1000 足以触发 `out`。输出最多 3 + 100 + 500 = 603 行，远小于 64KB。

## 示例
### 示例 1
```in
4
g_init 4 4 1 0
g_zero 8 8 0 0
msg 1 1 0 1
ro 4 4 1 1
5
data 0
data 4
bss 0
bss 8
rodata 4
```
```out
data 16
bss 16
rodata 16
g_init data +0 size=4
g_zero bss +0 size=8
msg rodata +0 size=1
ro rodata +4 size=4
data 0 -> g_init
data 4 -> pad
bss 0 -> g_zero
bss 8 -> pad
rodata 4 -> ro
```
> `g_init` 有非零初值，进 `data`，占 `[0,4)`；`g_zero` 没有初值，进 `bss`，占 `[0,8)`；`msg` 是 `const`，进 `rodata`，占 `[0,1)`；`ro` 也是 `const`，但它的对齐是 4，所以 `used` 从 1 取整到 4，偏移为 4。三个段的 `used` 分别是 4、8、8，都向上取整到 16。

### 示例 2（边界：只有一个对象，另外两个段是空的）
```in
1
only 1 1 0 0
4
bss 0
data 0
rodata 0
bss 16
```
```out
data 0
bss 16
rodata 0
only bss +0 size=1
bss 0 -> only
data 0 -> out
rodata 0 -> out
bss 16 -> out
```
> `only` 没有初值也不是 `const`，所以进 `bss`，占 `[0,1)`。`bss` 大小是 `1` 取整到 16，即 16；`data` 和 `rodata` 没有任何对象，大小是 0，所以对它们的任何查询都是 `out`——**空段里没有 `pad`**。`bss 16` 已经等于段大小，也是 `out`。

## 提示
### 第 1 层
先别急着写代码：拿示例 1 在纸上画三条竖线（data、bss、rodata），把每个对象按输入顺序"放"进去，写完再对答案。段归属只看两个布尔值，是本题唯一不带算术的部分。

### 第 2 层
段内偏移的算法和结构体成员偏移完全一样：`used = (used + align - 1) / align * align;` 然后 `offset = used; used += size;`。注意**对齐只作用于 `used`，不要动已经放好的对象**；三个段各自维护一个 `used`，互不影响。

### 第 3 层
段大小是 `used` 再向上取整到 16，**空段要输出 0 而不是 16**。查询的判定顺序是：先比段大小判 `out`（`o >= size` 就是 `out`），再在对象表里找 `[offset, offset + size)`，都没命中才是 `pad`。段名要先解析成 0/1/2 的下标，别用字符串比较去索引数组。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXK 100

typedef struct {
    char name[16];
    int size;
    int align;
    int section;               /* 0 = data，1 = bss，2 = rodata */
    int offset;
} Obj;

static int align_up(int v, int a) {
    return (v + a - 1) / a * a;
}

int main(void) {
    int k;
    if (scanf("%d", &k) != 1 || k < 1 || k > MAXK) {
        return 0;
    }

    Obj obj[MAXK];
    int used[3] = { 0, 0, 0 };
    for (int i = 0; i < k; i++) {
        int init = 0;
        int isconst = 0;
        if (scanf("%15s %d %d %d %d", obj[i].name, &obj[i].size, &obj[i].align,
                  &init, &isconst) != 5) {
            return 0;
        }
        int sec = isconst ? 2 : (init ? 0 : 1);   /* 先定段，再在段内放 */
        obj[i].section = sec;
        used[sec] = align_up(used[sec], obj[i].align);
        obj[i].offset = used[sec];
        used[sec] += obj[i].size;
    }

    int total[3];
    for (int s = 0; s < 3; s++) {
        total[s] = used[s] == 0 ? 0 : align_up(used[s], 16);
    }

    static const char *sec_name[3] = { "data", "bss", "rodata" };
    printf("data %d\n", total[0]);
    printf("bss %d\n", total[1]);
    printf("rodata %d\n", total[2]);
    for (int i = 0; i < k; i++) {
        printf("%s %s +%d size=%d\n", obj[i].name, sec_name[obj[i].section],
               obj[i].offset, obj[i].size);
    }

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 500) {
        return 0;
    }
    char secbuf[16];
    for (int t = 0; t < q; t++) {
        int off = 0;
        if (scanf("%15s %d", secbuf, &off) != 2) {
            return 0;
        }
        int s = -1;
        for (int i = 0; i < 3; i++) {
            if (strcmp(secbuf, sec_name[i]) == 0) {
                s = i;
            }
        }
        if (s < 0) {
            return 0;
        }

        const char *where = "out";
        if (off < total[s]) {
            where = "pad";
            for (int i = 0; i < k; i++) {
                if (obj[i].section == s && off >= obj[i].offset
                    && off < obj[i].offset + obj[i].size) {
                    where = obj[i].name;
                    break;
                }
            }
        }
        printf("%s %d -> %s\n", sec_name[s], off, where);
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXK 100

typedef struct {
    char name[16];
    int size;
    int align;
    int section;
    int offset;
} Obj;

int main(void) {
    int k;
    if (scanf("%d", &k) != 1 || k < 1 || k > MAXK) {
        return 0;
    }

    Obj obj[MAXK];
    int used[3] = { 0, 0, 0 };
    for (int i = 0; i < k; i++) {
        int init = 0;
        int isconst = 0;
        if (scanf("%15s %d %d %d %d", obj[i].name, &obj[i].size, &obj[i].align,
                  &init, &isconst) != 5) {
            return 0;
        }
        int sec = init ? 0 : 1;        /* TODO: isconst 的对象应该进 rodata */
        obj[i].section = sec;
        obj[i].offset = used[sec];     /* TODO: 先按 align 把 used 向上取整 */
        used[sec] += obj[i].size;
    }

    int total[3];
    for (int s = 0; s < 3; s++) {
        total[s] = used[s];            /* TODO: 段大小要向上取整到 16 的倍数 */
    }

    static const char *sec_name[3] = { "data", "bss", "rodata" };
    printf("data %d\n", total[0]);
    printf("bss %d\n", total[1]);
    printf("rodata %d\n", total[2]);
    for (int i = 0; i < k; i++) {
        printf("%s %s +%d size=%d\n", obj[i].name, sec_name[obj[i].section],
               obj[i].offset, obj[i].size);
    }

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 500) {
        return 0;
    }
    char secbuf[16];
    for (int t = 0; t < q; t++) {
        int off = 0;
        if (scanf("%15s %d", secbuf, &off) != 2) {
            return 0;
        }
        int s = -1;
        for (int i = 0; i < 3; i++) {
            if (strcmp(secbuf, sec_name[i]) == 0) {
                s = i;
            }
        }
        if (s < 0) {
            return 0;
        }

        /* TODO: 先判断 off 是否已经不小于段大小（out），再找对象，最后才是 pad */
        const char *where = "pad";
        for (int i = 0; i < k; i++) {
            if (obj[i].section == s && off >= obj[i].offset
                && off < obj[i].offset + obj[i].size) {
                where = obj[i].name;
                break;
            }
        }
        printf("%s %d -> %s\n", sec_name[s], off, where);
    }
    return 0;
}
```

## 复杂度
时间 O(k + q·k)：放置对象扫一遍，每个查询最坏扫全部对象（k ≤ 100、q ≤ 500，完全够快）。
空间 O(k)：一个对象表、三个段计数器。
优化方向：若把每个段的对象按偏移排好，查询可以二分到 O(log k)，但本题规模不需要。

## 常见错误
### 放对象时忘记段内对齐 [WA]
段内偏移必须"先对齐、再放"：`used` 对齐到对象的 `align` 之后才是偏移。忘记对齐会让 `char` 后面的 `int` 落在偏移 1，之后所有对象的偏移、所有 `pad` 查询都跟着错。
```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXK 100

typedef struct {
    char name[16];
    int size;
    int align;
    int section;
    int offset;
} Obj;

static int align_up(int v, int a) {
    return (v + a - 1) / a * a;
}

int main(void) {
    int k;
    if (scanf("%d", &k) != 1) {
        return 0;
    }
    Obj obj[MAXK];
    int used[3] = { 0, 0, 0 };
    for (int i = 0; i < k; i++) {
        int init = 0;
        int isconst = 0;
        if (scanf("%15s %d %d %d %d", obj[i].name, &obj[i].size, &obj[i].align,
                  &init, &isconst) != 5) {
            return 0;
        }
        int sec = isconst ? 2 : (init ? 0 : 1);
        obj[i].section = sec;
        obj[i].offset = used[sec];      /* 错：没有先按 align 对齐 */
        used[sec] += obj[i].size;
    }

    int total[3];
    for (int s = 0; s < 3; s++) {
        total[s] = used[s] == 0 ? 0 : align_up(used[s], 16);
    }
    static const char *sec_name[3] = { "data", "bss", "rodata" };
    printf("data %d\n", total[0]);
    printf("bss %d\n", total[1]);
    printf("rodata %d\n", total[2]);
    for (int i = 0; i < k; i++) {
        printf("%s %s +%d size=%d\n", obj[i].name, sec_name[obj[i].section],
               obj[i].offset, obj[i].size);
    }

    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    char secbuf[16];
    for (int t = 0; t < q; t++) {
        int off = 0;
        if (scanf("%15s %d", secbuf, &off) != 2) {
            return 0;
        }
        int s = -1;
        for (int i = 0; i < 3; i++) {
            if (strcmp(secbuf, sec_name[i]) == 0) {
                s = i;
            }
        }
        const char *where = "out";
        if (off < total[s]) {
            where = "pad";
            for (int i = 0; i < k; i++) {
                if (obj[i].section == s && off >= obj[i].offset
                    && off < obj[i].offset + obj[i].size) {
                    where = obj[i].name;
                    break;
                }
            }
        }
        printf("%s %d -> %s\n", sec_name[s], off, where);
    }
    return 0;
}
```

### 把 const 对象也按 init 分到 data / bss [WA]
`const` 优先于初值：`const` 全局对象进 `rodata`，无论它的初值是不是非零。只按 `init` 分段的程序会让 `rodata` 永远是 0，所有 `rodata` 查询都变成 `out`。
```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXK 100

typedef struct {
    char name[16];
    int size;
    int align;
    int section;
    int offset;
} Obj;

static int align_up(int v, int a) {
    return (v + a - 1) / a * a;
}

int main(void) {
    int k;
    if (scanf("%d", &k) != 1) {
        return 0;
    }
    Obj obj[MAXK];
    int used[3] = { 0, 0, 0 };
    for (int i = 0; i < k; i++) {
        int init = 0;
        int isconst = 0;
        if (scanf("%15s %d %d %d %d", obj[i].name, &obj[i].size, &obj[i].align,
                  &init, &isconst) != 5) {
            return 0;
        }
        int sec = init ? 0 : 1;         /* 错：忽略了 isconst，rodata 永远为空 */
        obj[i].section = sec;
        used[sec] = align_up(used[sec], obj[i].align);
        obj[i].offset = used[sec];
        used[sec] += obj[i].size;
    }

    int total[3];
    for (int s = 0; s < 3; s++) {
        total[s] = used[s] == 0 ? 0 : align_up(used[s], 16);
    }
    static const char *sec_name[3] = { "data", "bss", "rodata" };
    printf("data %d\n", total[0]);
    printf("bss %d\n", total[1]);
    printf("rodata %d\n", total[2]);
    for (int i = 0; i < k; i++) {
        printf("%s %s +%d size=%d\n", obj[i].name, sec_name[obj[i].section],
               obj[i].offset, obj[i].size);
    }

    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    char secbuf[16];
    for (int t = 0; t < q; t++) {
        int off = 0;
        if (scanf("%15s %d", secbuf, &off) != 2) {
            return 0;
        }
        int s = -1;
        for (int i = 0; i < 3; i++) {
            if (strcmp(secbuf, sec_name[i]) == 0) {
                s = i;
            }
        }
        const char *where = "out";
        if (off < total[s]) {
            where = "pad";
            for (int i = 0; i < k; i++) {
                if (obj[i].section == s && off >= obj[i].offset
                    && off < obj[i].offset + obj[i].size) {
                    where = obj[i].name;
                    break;
                }
            }
        }
        printf("%s %d -> %s\n", sec_name[s], off, where);
    }
    return 0;
}
```

### 段大小忘记向上取整到 16 [WA]
段的字节数要按 16 对齐（链接器给段分配页时也按边界对齐），所以 `used` 之后还要再取整一次。少了这一步，段尾的填充会被判成 `out` 而不是 `pad`，紧挨段尾的查询也会错。
```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXK 100

typedef struct {
    char name[16];
    int size;
    int align;
    int section;
    int offset;
} Obj;

static int align_up(int v, int a) {
    return (v + a - 1) / a * a;
}

int main(void) {
    int k;
    if (scanf("%d", &k) != 1) {
        return 0;
    }
    Obj obj[MAXK];
    int used[3] = { 0, 0, 0 };
    for (int i = 0; i < k; i++) {
        int init = 0;
        int isconst = 0;
        if (scanf("%15s %d %d %d %d", obj[i].name, &obj[i].size, &obj[i].align,
                  &init, &isconst) != 5) {
            return 0;
        }
        int sec = isconst ? 2 : (init ? 0 : 1);
        obj[i].section = sec;
        used[sec] = align_up(used[sec], obj[i].align);
        obj[i].offset = used[sec];
        used[sec] += obj[i].size;
    }

    int total[3];
    for (int s = 0; s < 3; s++) {
        total[s] = used[s];             /* 错：没有取整到 16 */
    }
    static const char *sec_name[3] = { "data", "bss", "rodata" };
    printf("data %d\n", total[0]);
    printf("bss %d\n", total[1]);
    printf("rodata %d\n", total[2]);
    for (int i = 0; i < k; i++) {
        printf("%s %s +%d size=%d\n", obj[i].name, sec_name[obj[i].section],
               obj[i].offset, obj[i].size);
    }

    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    char secbuf[16];
    for (int t = 0; t < q; t++) {
        int off = 0;
        if (scanf("%15s %d", secbuf, &off) != 2) {
            return 0;
        }
        int s = -1;
        for (int i = 0; i < 3; i++) {
            if (strcmp(secbuf, sec_name[i]) == 0) {
                s = i;
            }
        }
        const char *where = "out";
        if (off < total[s]) {
            where = "pad";
            for (int i = 0; i < k; i++) {
                if (obj[i].section == s && off >= obj[i].offset
                    && off < obj[i].offset + obj[i].size) {
                    where = obj[i].name;
                    break;
                }
            }
        }
        printf("%s %d -> %s\n", sec_name[s], off, where);
    }
    return 0;
}
```

### 把对象的 `size` 当成 `align` 用 [WA]
本题的 `size` 和对齐是两列：一个 `char[3]` 可能大小 3、对齐 1，也可能大小 4、对齐 4。只读 `size` 去算对齐，会让"先对齐再放"这一步偏大或偏小。题目保证 `align` 整除 `size`，但两者并不总是相等。

### 查询判定顺序写反 [WA]
先判对象、再判 `out` 的写法，在"偏移正好落在段尾填充里"时会把 `pad` 判成对象，在"偏移早就超出段大小"时也可能碰巧命中一个越界的对象区间。正确顺序是：**段大小 → 对象区间 → pad**，而且段大小为 0 时任何偏移都是 `out`。

## 测试用例
### 01 sample 示例 1
```in
4
g_init 4 4 1 0
g_zero 8 8 0 0
msg 1 1 0 1
ro 4 4 1 1
5
data 0
data 4
bss 0
bss 8
rodata 4
```
```out
data 16
bss 16
rodata 16
g_init data +0 size=4
g_zero bss +0 size=8
msg rodata +0 size=1
ro rodata +4 size=4
data 0 -> g_init
data 4 -> pad
bss 0 -> g_zero
bss 8 -> pad
rodata 4 -> ro
```

### 02 sample 示例 2
```in
1
only 1 1 0 0
4
bss 0
data 0
rodata 0
bss 16
```
```out
data 0
bss 16
rodata 0
only bss +0 size=1
bss 0 -> only
data 0 -> out
rodata 0 -> out
bss 16 -> out
```

### 03 boundary 100 个 8 字节对象填满 data 段
```in
100
v0 8 8 1 0
v1 8 8 1 0
v2 8 8 1 0
v3 8 8 1 0
v4 8 8 1 0
v5 8 8 1 0
v6 8 8 1 0
v7 8 8 1 0
v8 8 8 1 0
v9 8 8 1 0
v10 8 8 1 0
v11 8 8 1 0
v12 8 8 1 0
v13 8 8 1 0
v14 8 8 1 0
v15 8 8 1 0
v16 8 8 1 0
v17 8 8 1 0
v18 8 8 1 0
v19 8 8 1 0
v20 8 8 1 0
v21 8 8 1 0
v22 8 8 1 0
v23 8 8 1 0
v24 8 8 1 0
v25 8 8 1 0
v26 8 8 1 0
v27 8 8 1 0
v28 8 8 1 0
v29 8 8 1 0
v30 8 8 1 0
v31 8 8 1 0
v32 8 8 1 0
v33 8 8 1 0
v34 8 8 1 0
v35 8 8 1 0
v36 8 8 1 0
v37 8 8 1 0
v38 8 8 1 0
v39 8 8 1 0
v40 8 8 1 0
v41 8 8 1 0
v42 8 8 1 0
v43 8 8 1 0
v44 8 8 1 0
v45 8 8 1 0
v46 8 8 1 0
v47 8 8 1 0
v48 8 8 1 0
v49 8 8 1 0
v50 8 8 1 0
v51 8 8 1 0
v52 8 8 1 0
v53 8 8 1 0
v54 8 8 1 0
v55 8 8 1 0
v56 8 8 1 0
v57 8 8 1 0
v58 8 8 1 0
v59 8 8 1 0
v60 8 8 1 0
v61 8 8 1 0
v62 8 8 1 0
v63 8 8 1 0
v64 8 8 1 0
v65 8 8 1 0
v66 8 8 1 0
v67 8 8 1 0
v68 8 8 1 0
v69 8 8 1 0
v70 8 8 1 0
v71 8 8 1 0
v72 8 8 1 0
v73 8 8 1 0
v74 8 8 1 0
v75 8 8 1 0
v76 8 8 1 0
v77 8 8 1 0
v78 8 8 1 0
v79 8 8 1 0
v80 8 8 1 0
v81 8 8 1 0
v82 8 8 1 0
v83 8 8 1 0
v84 8 8 1 0
v85 8 8 1 0
v86 8 8 1 0
v87 8 8 1 0
v88 8 8 1 0
v89 8 8 1 0
v90 8 8 1 0
v91 8 8 1 0
v92 8 8 1 0
v93 8 8 1 0
v94 8 8 1 0
v95 8 8 1 0
v96 8 8 1 0
v97 8 8 1 0
v98 8 8 1 0
v99 8 8 1 0
7
data 0
data 792
data 799
data 800
data 1000
bss 0
rodata 0
```
```out
data 800
bss 0
rodata 0
v0 data +0 size=8
v1 data +8 size=8
v2 data +16 size=8
v3 data +24 size=8
v4 data +32 size=8
v5 data +40 size=8
v6 data +48 size=8
v7 data +56 size=8
v8 data +64 size=8
v9 data +72 size=8
v10 data +80 size=8
v11 data +88 size=8
v12 data +96 size=8
v13 data +104 size=8
v14 data +112 size=8
v15 data +120 size=8
v16 data +128 size=8
v17 data +136 size=8
v18 data +144 size=8
v19 data +152 size=8
v20 data +160 size=8
v21 data +168 size=8
v22 data +176 size=8
v23 data +184 size=8
v24 data +192 size=8
v25 data +200 size=8
v26 data +208 size=8
v27 data +216 size=8
v28 data +224 size=8
v29 data +232 size=8
v30 data +240 size=8
v31 data +248 size=8
v32 data +256 size=8
v33 data +264 size=8
v34 data +272 size=8
v35 data +280 size=8
v36 data +288 size=8
v37 data +296 size=8
v38 data +304 size=8
v39 data +312 size=8
v40 data +320 size=8
v41 data +328 size=8
v42 data +336 size=8
v43 data +344 size=8
v44 data +352 size=8
v45 data +360 size=8
v46 data +368 size=8
v47 data +376 size=8
v48 data +384 size=8
v49 data +392 size=8
v50 data +400 size=8
v51 data +408 size=8
v52 data +416 size=8
v53 data +424 size=8
v54 data +432 size=8
v55 data +440 size=8
v56 data +448 size=8
v57 data +456 size=8
v58 data +464 size=8
v59 data +472 size=8
v60 data +480 size=8
v61 data +488 size=8
v62 data +496 size=8
v63 data +504 size=8
v64 data +512 size=8
v65 data +520 size=8
v66 data +528 size=8
v67 data +536 size=8
v68 data +544 size=8
v69 data +552 size=8
v70 data +560 size=8
v71 data +568 size=8
v72 data +576 size=8
v73 data +584 size=8
v74 data +592 size=8
v75 data +600 size=8
v76 data +608 size=8
v77 data +616 size=8
v78 data +624 size=8
v79 data +632 size=8
v80 data +640 size=8
v81 data +648 size=8
v82 data +656 size=8
v83 data +664 size=8
v84 data +672 size=8
v85 data +680 size=8
v86 data +688 size=8
v87 data +696 size=8
v88 data +704 size=8
v89 data +712 size=8
v90 data +720 size=8
v91 data +728 size=8
v92 data +736 size=8
v93 data +744 size=8
v94 data +752 size=8
v95 data +760 size=8
v96 data +768 size=8
v97 data +776 size=8
v98 data +784 size=8
v99 data +792 size=8
data 0 -> v0
data 792 -> v99
data 799 -> v99
data 800 -> out
data 1000 -> out
bss 0 -> out
rodata 0 -> out
```

### 04 degenerate 单个 1 字节对象，段尾全是填充
```in
1
one 1 1 0 0
3
bss 0
bss 15
bss 16
```
```out
data 0
bss 16
rodata 0
one bss +0 size=1
bss 0 -> one
bss 15 -> pad
bss 16 -> out
```

### 05 trap 1、4、2 字节对象之间的对齐填充
```in
4
a 1 1 1 0
b 4 4 1 0
c 8 8 0 0
d 2 2 1 0
8
data 1
data 3
data 4
data 8
data 9
data 10
data 15
data 16
```
```out
data 16
bss 16
rodata 0
a data +0 size=1
b data +4 size=4
c bss +0 size=8
d data +8 size=2
data 1 -> pad
data 3 -> pad
data 4 -> b
data 8 -> d
data 9 -> d
data 10 -> pad
data 15 -> pad
data 16 -> out
```

### 06 trap const 优先于初值；bss 也按对齐放置
```in
5
x 4 4 1 1
y 4 4 0 0
z 8 8 1 0
w 2 2 0 1
v 1 1 0 0
7
data 0
data 7
bss 0
bss 4
rodata 0
rodata 4
rodata 6
```
```out
data 16
bss 16
rodata 16
x rodata +0 size=4
y bss +0 size=4
z data +0 size=8
w rodata +4 size=2
v bss +4 size=1
data 0 -> z
data 7 -> z
bss 0 -> y
bss 4 -> v
rodata 0 -> x
rodata 4 -> w
rodata 6 -> pad
```

### 07 normal 三个段混合，段尾填充
```in
6
cfg 4 4 1 0
buf 1 1 0 0
tbl 8 8 0 0
msg 1 1 0 1
ro4 4 4 1 1
flag 2 2 0 0
15
data 0
data 3
data 4
bss 0
bss 1
bss 8
bss 15
bss 16
bss 17
bss 18
bss 31
bss 32
rodata 0
rodata 1
rodata 4
```
```out
data 16
bss 32
rodata 16
cfg data +0 size=4
buf bss +0 size=1
tbl bss +8 size=8
msg rodata +0 size=1
ro4 rodata +4 size=4
flag bss +16 size=2
data 0 -> cfg
data 3 -> cfg
data 4 -> pad
bss 0 -> buf
bss 1 -> pad
bss 8 -> tbl
bss 15 -> tbl
bss 16 -> flag
bss 17 -> flag
bss 18 -> pad
bss 31 -> pad
bss 32 -> out
rodata 0 -> msg
rodata 1 -> pad
rodata 4 -> ro4
```

### 生成 boundary 100 个随机对象、500 次随机查询
```js gen
function alignUp(v, a) {
  return Math.ceil(v / a) * a;
}

function build(k, objs, queries) {
  const used = [0, 0, 0];
  const placed = [];
  for (const o of objs) {
    const sec = o.isconst ? 2 : (o.init ? 0 : 1);
    used[sec] = alignUp(used[sec], o.align);
    placed.push({ name: o.name, sec, off: used[sec], size: o.size });
    used[sec] += o.size;
  }
  const total = used.map((u) => (u === 0 ? 0 : alignUp(u, 16)));
  const names = ['data', 'bss', 'rodata'];
  const lines = [`data ${total[0]}`, `bss ${total[1]}`, `rodata ${total[2]}`];
  for (const p of placed) lines.push(`${p.name} ${names[p.sec]} +${p.off} size=${p.size}`);
  for (const q of queries) {
    let where = 'out';
    if (q.off < total[q.sec]) {
      where = 'pad';
      for (const p of placed) {
        if (p.sec === q.sec && q.off >= p.off && q.off < p.off + p.size) {
          where = p.name;
          break;
        }
      }
    }
    lines.push(`${names[q.sec]} ${q.off} -> ${where}`);
  }
  return lines.join('\n') + '\n';
}

const objs = [];
for (let i = 0; i < 100; i++) {
  const size = rng.pick([1, 2, 4, 8]);
  const align = rng.pick([1, 2, 4, 8].filter((a) => size % a === 0));
  objs.push({ name: `v${i}`, size, align, init: rng.int(0, 1), isconst: rng.int(0, 1) });
}
const queries = [];
for (let i = 0; i < 500; i++) {
  queries.push({ sec: rng.int(0, 2), off: rng.int(0, 1000) });
}
const lines = [`100`];
for (const o of objs) lines.push(`${o.name} ${o.size} ${o.align} ${o.init} ${o.isconst}`);
lines.push(`${queries.length}`);
for (const q of queries) {
  lines.push(`${['data', 'bss', 'rodata'][q.sec]} ${q.off}`);
}
return [{
  kind: 'boundary',
  category: '100 个随机对象、500 次随机查询',
  input: lines.join('\n') + '\n',
  output: build(100, objs, queries),
}];
```
