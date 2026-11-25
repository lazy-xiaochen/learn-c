---json
{
  "id": "p-s4-pragma-pack-1",
  "title": "协议头对齐推算：pack(1)、pack(2) 与默认对齐下的偏移和 sizeof",
  "difficulty": "L4",
  "knowledgePoints": ["s4-pragma-pack"],
  "special": "memory-layout",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
你在把一批通信协议搬进固件。协议文档只给出了字段的**顺序**和每个字段的宽度，而固件里能不能用一个结构体直接覆盖收发，取决于编译器在三种对齐设置下会把每个字段摆在哪个偏移、结构体一共占多少字节。

请写一个"布局推算器"：读入若干份协议头定义，按下面的**简化模型**（真实编译器还有 ABI 细节，本题一切以这份规则为准）算出它们在 `#pragma pack(1)`、`#pragma pack(2)` 和默认对齐下的每个成员偏移与结构体大小，并标出哪些成员变成了未对齐访问。

模型规则：

1. 类型只有四种，大小与自然对齐值相同：`u8` 1 字节、`u16` 2 字节、`u32` 4 字节、`u64` 8 字节。类型后面可以跟 `[k]` 表示长度为 `k` 的数组：**大小 = 元素大小 × k，自然对齐 = 元素的对齐值**（跟 k 无关）。
2. 对齐设置给每个成员的对齐值加一个上限 `p`：pack(1) 时 `p = 1`，pack(2) 时 `p = 2`，默认对齐时相当于不设上限（取 `p = 16`，对本题的类型来说等于"不限制"）。成员的实际对齐值 `A = min(自然对齐, p)`。
3. 依次处理每个成员：先把当前偏移向上取整到 `A` 的倍数，这个值就是该成员的偏移；然后当前偏移再加上成员大小。结构体的对齐值 = 所有成员 `A` 的最大值。
4. 所有成员放完后，结构体大小 = 当前偏移向上取整到"结构体对齐值"的倍数（这就是尾部填充）。
5. 如果某个成员的偏移不是它**自然对齐**的倍数（注意：不是 `A` 的倍数），它就是未对齐成员，要在输出里标出来。

一条协议头在三种设置下都算一遍，正是为了让你看到：**pack 只是把填充压小，并不能让成员重新变得对齐**。

## 输入格式
第一行一个整数 `T`：协议头的个数。

接下来对每个协议头：

- 第一行一个整数 `n`：成员个数；
- 接下来 `n` 行，每行 `<类型> <成员名>`，按协议文档的字段顺序给出。类型是 `u8`、`u16`、`u32`、`u64` 之一，可以带 `[k]` 后缀（如 `u8[6]`）；成员名由小写字母、数字、下划线组成。

## 输出格式
对第 `i` 个协议头（`i` 从 1 开始），依次输出三组结果，顺序固定为 `pack(1)`、`pack(2)`、`natural`：

```
struct <i>
pack(1) size=<大小>
  <成员名> +<偏移>
  ...
pack(2) size=<大小>
  ...
natural size=<大小>
  ...
```

规则：

- 每组的第一行是 `pack(1) size=<大小>` / `pack(2) size=<大小>` / `natural size=<大小>`；
- 之后按**输入顺序**每行一个成员：两个空格、成员名、空格、`+`、偏移；
- 如果该成员未对齐（偏移不是自然对齐值的倍数），在这一行末尾追加 ` unaligned`（一个空格 + 小写单词）；
- 偏移一律输出非负十进制数，`+` 号不能省。

## 数据范围
1 ≤ T ≤ 20
1 ≤ n ≤ 12
数组长度 k 满足 1 ≤ k ≤ 8
成员名长度 1–10
单个成员最大 64 字节（`u64[8]`），所以一个协议头最大 12 × 64 = 768 字节；偏移和 `sizeof` 都不超过 768。

输出最多 `20 × (3 × (12 + 1) + 1) = 800` 行，每行不超过 30 个字符，远小于 64KB。

## 示例
### 示例 1
```in
1
3
u8 magic
u32 seq
u16 flags
```
```out
struct 1
pack(1) size=7
  magic +0
  seq +1 unaligned
  flags +5 unaligned
pack(2) size=8
  magic +0
  seq +2 unaligned
  flags +6
natural size=12
  magic +0
  seq +4
  flags +8
```
> `pack(1)` 下没有填充：`magic` 占 `+0`，`seq` 接着从 `+1` 开始，`flags` 从 `+5` 开始，总大小 7。`seq` 的偏移 1 不是 4 的倍数、`flags` 的偏移 5 不是 2 的倍数，两个都要标 `unaligned`。`pack(2)` 下 `seq` 只能从 2 的倍数开始，于是落在 `+2`、`flags` 落在 `+6`；总大小 8 已经满足结构体对齐 2。默认对齐时 `seq` 必须从 `+4` 开始，中间 3 字节填充，末尾再补 2 字节，总大小 12。

### 示例 2（边界：本来就紧凑的协议头，三种设置完全一样）
```in
1
3
u8 magic
u8 version
u16 length
```
```out
struct 1
pack(1) size=4
  magic +0
  version +1
  length +2
pack(2) size=4
  magic +0
  version +1
  length +2
natural size=4
  magic +0
  version +1
  length +2
```
> 三个字段的大小之和正好是 4，而且每个成员的自然对齐都满足，所以默认对齐也没有填充。`pack` 在这种情况下什么也省不下来——这正说明"pack 不一定改变任何东西"，判断依据只能是逐成员算偏移，不能凭感觉。

## 提示
### 第 1 层
先只想一个成员：`u8` 之后接 `u32`，默认对齐时当前偏移是 1，要先向上取整到 4 才能放 `u32`，所以偏移是 `+4`；`pack(1)` 时 `A = 1`，不用取整，偏移就是 `+1`。顺序是"**先对齐当前偏移、再占大小**"，反过来算就会差一个字段。

### 第 2 层
三种设置只差一个上限 `p`：`A = min(自然对齐, p)`。默认对齐相当于 `p = 16`（本题的类型自然对齐最大是 8，所以等价于不限制），因此三种模式可以共用一个函数，只是 `p` 不同。别忘了**结构体自己的对齐值也要用 cap 之后的 `A`** 来求最大值，否则尾部填充会算错——`pack(1)` 的结构体对齐值是 1，`sizeof` 就是各字段之和，**不**再往 8、16 上取整。

### 第 3 层
`unaligned` 标记看的是**自然对齐**，不是 cap 后的 `A`：`pack(2)` 下 `u32` 成员的 `A` 是 2，偏移 2 满足 `A`，但不满足自然对齐 4，仍然要标出来。数组的对齐值取**元素的对齐值**，和数组长度无关（`u16[3]` 的对齐值是 2，不是 6）；数组的大小则是元素大小乘以长度。另外记得每个成员行前面是两个空格。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXN 12
#define MAXNAME 12
#define MAXT 20

/* 解析 u8 / u16 / u32 / u64，可带 [k] 数组后缀；返回基础类型大小，*cnt 返回元素个数 */
static int base_of(const char *t, int *cnt) {
    int base, len;
    if (strncmp(t, "u8", 2) == 0) { base = 1; len = 2; }
    else if (strncmp(t, "u16", 3) == 0) { base = 2; len = 3; }
    else if (strncmp(t, "u32", 3) == 0) { base = 4; len = 3; }
    else if (strncmp(t, "u64", 3) == 0) { base = 8; len = 3; }
    else return 0;
    int n = 1;
    if (t[len] == '[') {
        int k = 0;
        int i = len + 1;
        while (t[i] >= '0' && t[i] <= '9') {
            k = k * 10 + (t[i] - '0');
            i++;
        }
        if (t[i] != ']' || t[i + 1] != '\0' || k < 1 || k > 8) return 0;
        n = k;
    } else if (t[len] != '\0') {
        return 0;
    }
    *cnt = n;
    return base;
}

/* 按上限 cap 计算一个协议头的布局并打印；cap = 16 表示默认对齐 */
static void emit(const char *label, int cap, int n, const char name[][MAXNAME],
                 const int *size, const int *align) {
    int off[MAXN];
    int cur = 0;
    int maxa = 1;
    for (int i = 0; i < n; i++) {
        int a = align[i] < cap ? align[i] : cap;   /* A = min(自然对齐, cap) */
        cur = (cur + a - 1) / a * a;               /* 先向上取整 */
        off[i] = cur;
        cur += size[i];                            /* 再占用大小 */
        if (a > maxa) maxa = a;
    }
    int total = (cur + maxa - 1) / maxa * maxa;    /* 尾部填充到结构体对齐 */
    printf("%s size=%d\n", label, total);
    for (int i = 0; i < n; i++) {
        printf("  %s +%d", name[i], off[i]);
        if (off[i] % align[i] != 0) printf(" unaligned");   /* 看自然对齐 */
        printf("\n");
    }
}

int main(void) {
    int T;
    if (scanf("%d", &T) != 1 || T < 1 || T > MAXT) return 0;
    for (int t = 1; t <= T; t++) {
        int n;
        if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) return 0;
        char name[MAXN][MAXNAME];
        int size[MAXN], align[MAXN];
        for (int i = 0; i < n; i++) {
            char type[16];
            if (scanf("%15s %11s", type, name[i]) != 2) return 0;
            int cnt = 0;
            int base = base_of(type, &cnt);
            if (base == 0) return 0;
            size[i] = base * cnt;
            align[i] = base;
        }
        printf("struct %d\n", t);
        emit("pack(1)", 1, n, name, size, align);
        emit("pack(2)", 2, n, name, size, align);
        emit("natural", 16, n, name, size, align);
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXN 12
#define MAXNAME 12
#define MAXT 20

static int base_of(const char *t, int *cnt) {
    int base, len;
    if (strncmp(t, "u8", 2) == 0) { base = 1; len = 2; }
    else if (strncmp(t, "u16", 3) == 0) { base = 2; len = 3; }
    else if (strncmp(t, "u32", 3) == 0) { base = 4; len = 3; }
    else if (strncmp(t, "u64", 3) == 0) { base = 8; len = 3; }
    else return 0;
    int n = 1;
    if (t[len] == '[') {
        int k = 0;
        int i = len + 1;
        while (t[i] >= '0' && t[i] <= '9') {
            k = k * 10 + (t[i] - '0');
            i++;
        }
        if (t[i] != ']' || t[i + 1] != '\0' || k < 1 || k > 8) return 0;
        n = k;
    } else if (t[len] != '\0') {
        return 0;
    }
    *cnt = n;
    return base;
}

static void emit(const char *label, int cap, int n, const char name[][MAXNAME],
                 const int *size, const int *align) {
    (void)cap;                         /* TODO: 还没用上 pack 的上限 */
    int off[MAXN];
    int cur = 0;
    int maxa = 1;
    for (int i = 0; i < n; i++) {
        int a = align[i];              /* TODO: 应该取 min(自然对齐, cap) */
        cur = (cur + a - 1) / a * a;
        off[i] = cur;
        cur += size[i];
        if (a > maxa) maxa = a;
    }
    int total = (cur + maxa - 1) / maxa * maxa;
    printf("%s size=%d\n", label, total);
    for (int i = 0; i < n; i++) {
        printf("  %s +%d\n", name[i], off[i]);   /* TODO: 未对齐成员要标 unaligned */
    }
}

int main(void) {
    int T;
    if (scanf("%d", &T) != 1 || T < 1 || T > MAXT) return 0;
    for (int t = 1; t <= T; t++) {
        int n;
        if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) return 0;
        char name[MAXN][MAXNAME];
        int size[MAXN], align[MAXN];
        for (int i = 0; i < n; i++) {
            char type[16];
            if (scanf("%15s %11s", type, name[i]) != 2) return 0;
            int cnt = 0;
            int base = base_of(type, &cnt);
            if (base == 0) return 0;
            size[i] = base * cnt;
            align[i] = base;
        }
        printf("struct %d\n", t);
        emit("pack(1)", 1, n, name, size, align);
        emit("pack(2)", 2, n, name, size, align);
        emit("natural", 16, n, name, size, align);
    }
    return 0;
}
```

## 复杂度
时间 O(T × n)：每个协议头扫三遍成员，每个成员 O(1)。
空间 O(n)：只需要存成员名、大小和对齐值。

## 常见错误
### 忘了成员的偏移也要按上限取整 [WA]
只把结构体总大小改小、偏移仍按自然对齐算，`sizeof` 看着像 `pack(1)`，字节流却还是默认对齐的位置。正确做法是每个成员都先算 `A = min(自然对齐, cap)`，再用 `A` 去对齐当前偏移。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXN 12
#define MAXNAME 12
#define MAXT 20

static int base_of(const char *t, int *cnt) {
    int base, len;
    if (strncmp(t, "u8", 2) == 0) { base = 1; len = 2; }
    else if (strncmp(t, "u16", 3) == 0) { base = 2; len = 3; }
    else if (strncmp(t, "u32", 3) == 0) { base = 4; len = 3; }
    else if (strncmp(t, "u64", 3) == 0) { base = 8; len = 3; }
    else return 0;
    int n = 1;
    if (t[len] == '[') {
        int k = 0;
        int i = len + 1;
        while (t[i] >= '0' && t[i] <= '9') { k = k * 10 + (t[i] - '0'); i++; }
        if (t[i] != ']' || t[i + 1] != '\0' || k < 1 || k > 8) return 0;
        n = k;
    } else if (t[len] != '\0') {
        return 0;
    }
    *cnt = n;
    return base;
}

static void emit(const char *label, int cap, int n, const char name[][MAXNAME],
                 const int *size, const int *align) {
    int off[MAXN];
    int cur = 0;
    int maxa = 1;
    int struct_cap = cap < 1 ? 1 : cap;
    for (int i = 0; i < n; i++) {
        int a = align[i];                                  /* 错：没有按 cap 封顶 */
        cur = (cur + a - 1) / a * a;
        off[i] = cur;
        cur += size[i];
        if (a > maxa) maxa = a;
    }
    if (maxa > struct_cap) maxa = struct_cap;              /* 只封顶了结构体 */
    int total = (cur + maxa - 1) / maxa * maxa;
    printf("%s size=%d\n", label, total);
    for (int i = 0; i < n; i++) {
        printf("  %s +%d", name[i], off[i]);
        if (off[i] % align[i] != 0) printf(" unaligned");
        printf("\n");
    }
}

int main(void) {
    int T;
    if (scanf("%d", &T) != 1 || T < 1 || T > MAXT) return 0;
    for (int t = 1; t <= T; t++) {
        int n;
        if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) return 0;
        char name[MAXN][MAXNAME];
        int size[MAXN], align[MAXN];
        for (int i = 0; i < n; i++) {
            char type[16];
            if (scanf("%15s %11s", type, name[i]) != 2) return 0;
            int cnt = 0;
            int base = base_of(type, &cnt);
            if (base == 0) return 0;
            size[i] = base * cnt;
            align[i] = base;
        }
        printf("struct %d\n", t);
        emit("pack(1)", 1, n, name, size, align);
        emit("pack(2)", 2, n, name, size, align);
        emit("natural", 16, n, name, size, align);
    }
    return 0;
}
```

### 结构体大小忘了按对齐值向上取整 [WA]
算完最后一个成员就直接把当前偏移当 `sizeof`，尾部填充就丢了。`unsigned char` 加 `unsigned int` 的真实大小是 8 而不是 5：结构体必须按自己的对齐值取整。`pack(1)` 下这个取整通常是"原样"，很容易让人误以为"这个模型里从来不用取整"。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXN 12
#define MAXNAME 12
#define MAXT 20

static int base_of(const char *t, int *cnt) {
    int base, len;
    if (strncmp(t, "u8", 2) == 0) { base = 1; len = 2; }
    else if (strncmp(t, "u16", 3) == 0) { base = 2; len = 3; }
    else if (strncmp(t, "u32", 3) == 0) { base = 4; len = 3; }
    else if (strncmp(t, "u64", 3) == 0) { base = 8; len = 3; }
    else return 0;
    int n = 1;
    if (t[len] == '[') {
        int k = 0;
        int i = len + 1;
        while (t[i] >= '0' && t[i] <= '9') { k = k * 10 + (t[i] - '0'); i++; }
        if (t[i] != ']' || t[i + 1] != '\0' || k < 1 || k > 8) return 0;
        n = k;
    } else if (t[len] != '\0') {
        return 0;
    }
    *cnt = n;
    return base;
}

static void emit(const char *label, int cap, int n, const char name[][MAXNAME],
                 const int *size, const int *align) {
    int off[MAXN];
    int cur = 0;
    int maxa = 1;
    for (int i = 0; i < n; i++) {
        int a = align[i] < cap ? align[i] : cap;
        cur = (cur + a - 1) / a * a;
        off[i] = cur;
        cur += size[i];
        if (a > maxa) maxa = a;
    }
    int total = cur;                                   /* 错：没有向上取整到 maxa */
    printf("%s size=%d\n", label, total);
    for (int i = 0; i < n; i++) {
        printf("  %s +%d", name[i], off[i]);
        if (off[i] % align[i] != 0) printf(" unaligned");
        printf("\n");
    }
}

int main(void) {
    int T;
    if (scanf("%d", &T) != 1 || T < 1 || T > MAXT) return 0;
    for (int t = 1; t <= T; t++) {
        int n;
        if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) return 0;
        char name[MAXN][MAXNAME];
        int size[MAXN], align[MAXN];
        for (int i = 0; i < n; i++) {
            char type[16];
            if (scanf("%15s %11s", type, name[i]) != 2) return 0;
            int cnt = 0;
            int base = base_of(type, &cnt);
            if (base == 0) return 0;
            size[i] = base * cnt;
            align[i] = base;
        }
        printf("struct %d\n", t);
        emit("pack(1)", 1, n, name, size, align);
        emit("pack(2)", 2, n, name, size, align);
        emit("natural", 16, n, name, size, align);
    }
    return 0;
}
```

### 用 cap 后的对齐判断 unaligned [WA]
`unaligned` 的含义是"这个成员的偏移不满足它**自己的自然对齐**"，而不是"不满足 pack 之后的 `A`"。`pack(2)` 下 `u32` 的 `A` 是 2，偏移 2 完全满足 `A`，但 `2 % 4 != 0`，对 `unsigned int` 来说仍然是未对齐地址——正是这种成员会在严格对齐的平台上引发总线错误。

### 把数组的对齐值当成"元素大小 × 长度" [WA]
`u16[3]` 的大小是 6，但它的对齐值是 2（元素 `u16` 的对齐值），不是 6。若按 6 对齐，一个 `u8` 后面跟 `u16[3]` 的成员会从 `+6` 而不是 `+2` 开始，整个结构体的偏移和大小全错。数组的规则永远是"大小相乘、对齐取元素"。

## 测试用例
### 01 sample 示例 1
```in
1
3
u8 magic
u32 seq
u16 flags
```
```out
struct 1
pack(1) size=7
  magic +0
  seq +1 unaligned
  flags +5 unaligned
pack(2) size=8
  magic +0
  seq +2 unaligned
  flags +6
natural size=12
  magic +0
  seq +4
  flags +8
```

### 02 sample 示例 2
```in
1
3
u8 magic
u8 version
u16 length
```
```out
struct 1
pack(1) size=4
  magic +0
  version +1
  length +2
pack(2) size=4
  magic +0
  version +1
  length +2
natural size=4
  magic +0
  version +1
  length +2
```

### 03 degenerate 只有一个 8 字节成员
```in
1
1
u64 ts
```
```out
struct 1
pack(1) size=8
  ts +0
pack(2) size=8
  ts +0
natural size=8
  ts +0
```

### 04 boundary 12 个 u64 成员，大小正好是 96
```in
1
12
u64 f0
u64 f1
u64 f2
u64 f3
u64 f4
u64 f5
u64 f6
u64 f7
u64 f8
u64 f9
u64 f10
u64 f11
```
```out
struct 1
pack(1) size=96
  f0 +0
  f1 +8
  f2 +16
  f3 +24
  f4 +32
  f5 +40
  f6 +48
  f7 +56
  f8 +64
  f9 +72
  f10 +80
  f11 +88
pack(2) size=96
  f0 +0
  f1 +8
  f2 +16
  f3 +24
  f4 +32
  f5 +40
  f6 +48
  f7 +56
  f8 +64
  f9 +72
  f10 +80
  f11 +88
natural size=96
  f0 +0
  f1 +8
  f2 +16
  f3 +24
  f4 +32
  f5 +40
  f6 +48
  f7 +56
  f8 +64
  f9 +72
  f10 +80
  f11 +88
```

### 05 trap u8 与 u64 交错：pack(1) 的总大小是奇数
```in
1
3
u8 a
u64 b
u8 c
```
```out
struct 1
pack(1) size=10
  a +0
  b +1 unaligned
  c +9
pack(2) size=12
  a +0
  b +2 unaligned
  c +10
natural size=24
  a +0
  b +8
  c +16
```

### 06 trap 6 字节数组后面跟 u32
```in
1
3
u8[6] mac
u32 seq
u16 crc
```
```out
struct 1
pack(1) size=12
  mac +0
  seq +6 unaligned
  crc +10
pack(2) size=12
  mac +0
  seq +6 unaligned
  crc +10
natural size=16
  mac +0
  seq +8
  crc +12
```

### 07 trap 数组的对齐值取元素而不是长度
```in
2
3
u8 kind
u16[3] samples
u32 crc
5
u8[3] tag
u8 id
u64 big
u16 small
u8 tail
```
```out
struct 1
pack(1) size=11
  kind +0
  samples +1 unaligned
  crc +7 unaligned
pack(2) size=12
  kind +0
  samples +2
  crc +8
natural size=12
  kind +0
  samples +2
  crc +8
struct 2
pack(1) size=15
  tag +0
  id +3
  big +4 unaligned
  small +12
  tail +14
pack(2) size=16
  tag +0
  id +3
  big +4 unaligned
  small +12
  tail +14
natural size=24
  tag +0
  id +3
  big +8
  small +16
  tail +18
```

### 08 normal 真实帧头：8 个字段、25/26/32 字节
```in
1
8
u8 magic
u8 version
u16 length
u32 seq
u8 flags
u8[6] mac
u16 crc
u64 ts
```
```out
struct 1
pack(1) size=25
  magic +0
  version +1
  length +2
  seq +4
  flags +8
  mac +9
  crc +15 unaligned
  ts +17 unaligned
pack(2) size=26
  magic +0
  version +1
  length +2
  seq +4
  flags +8
  mac +9
  crc +16
  ts +18 unaligned
natural size=32
  magic +0
  version +1
  length +2
  seq +4
  flags +8
  mac +9
  crc +16
  ts +24
```

### 09 normal 传感器记录：首个字段就是 u16
```in
1
6
u16 id
u8 kind
u8[3] tag
u32 value
u64 stamp
u8[2] rsv
```
```out
struct 1
pack(1) size=20
  id +0
  kind +2
  tag +3
  value +6 unaligned
  stamp +10 unaligned
  rsv +18
pack(2) size=20
  id +0
  kind +2
  tag +3
  value +6 unaligned
  stamp +10 unaligned
  rsv +18
natural size=32
  id +0
  kind +2
  tag +3
  value +8
  stamp +16
  rsv +24
```

### 生成 stress 20 个随机协议头
```js gen
const types = ["u8", "u16", "u32", "u64"];
const BASE = { u8: 1, u16: 2, u32: 4, u64: 8 };

function model(tok) {
  const m = tok.match(/^(u8|u16|u32|u64)(?:\[(\d+)\])?$/);
  const base = BASE[m[1]];
  const n = m[2] ? Number(m[2]) : 1;
  return { type: tok, size: base * n, align: base };
}

function layout(members, cap) {
  let cur = 0;
  let maxa = 1;
  const off = [];
  for (const m of members) {
    const a = Math.min(m.align, cap);
    cur = Math.ceil(cur / a) * a;
    off.push(cur);
    cur += m.size;
    maxa = Math.max(maxa, a);
  }
  return { off, total: Math.ceil(cur / maxa) * maxa };
}

function render(structs) {
  const lines = [];
  structs.forEach((members, idx) => {
    lines.push(`struct ${idx + 1}`);
    for (const [label, cap] of [["pack(1)", 1], ["pack(2)", 2], ["natural", 16]]) {
      const { off, total } = layout(members, cap);
      lines.push(`${label} size=${total}`);
      members.forEach((m, i) => {
        lines.push(`  ${m.name} +${off[i]}${off[i] % m.align !== 0 ? " unaligned" : ""}`);
      });
    }
  });
  return lines.join("\n") + "\n";
}

const structs = [];
for (let s = 0; s < 20; s++) {
  const n = rng.int(1, 12);
  const members = [];
  for (let i = 0; i < n; i++) {
    let tok = rng.pick(types);
    if (rng.next() < 0.3) tok += `[${rng.int(1, 8)}]`;
    members.push({ ...model(tok), name: `f${i}` });
  }
  structs.push(members);
}

const lines = [String(structs.length)];
for (const members of structs) {
  lines.push(String(members.length));
  for (const m of members) lines.push(`${m.type} ${m.name}`);
}

return [{
  kind: "stress",
  category: "20 个随机协议头（成员 1–12，含数组）",
  input: lines.join("\n") + "\n",
  output: render(structs),
}];
```

### 生成 boundary 12 个成员、含长度 8 的数组
```js gen
const BASE = { u8: 1, u16: 2, u32: 4, u64: 8 };
const spec = ["u8[8]", "u64", "u16[3]", "u8", "u32[2]", "u8[5]", "u64", "u16", "u8[7]", "u32", "u8[6]", "u16[4]"];

function layout(members, cap) {
  let cur = 0;
  let maxa = 1;
  const off = [];
  for (const m of members) {
    const a = Math.min(m.align, cap);
    cur = Math.ceil(cur / a) * a;
    off.push(cur);
    cur += m.size;
    maxa = Math.max(maxa, a);
  }
  return { off, total: Math.ceil(cur / maxa) * maxa };
}

const members = spec.map((tok, i) => {
  const m = tok.match(/^(u8|u16|u32|u64)(?:\[(\d+)\])?$/);
  const base = BASE[m[1]];
  const cnt = m[2] ? Number(m[2]) : 1;
  return { type: tok, name: `f${i}`, size: base * cnt, align: base };
});

const lines = ["1", String(members.length)];
for (const m of members) lines.push(`${m.type} ${m.name}`);

const out = ["struct 1"];
for (const [label, cap] of [["pack(1)", 1], ["pack(2)", 2], ["natural", 16]]) {
  const { off, total } = layout(members, cap);
  out.push(`${label} size=${total}`);
  members.forEach((m, i) => {
    out.push(`  ${m.name} +${off[i]}${off[i] % m.align !== 0 ? " unaligned" : ""}`);
  });
}

return [{
  kind: "boundary",
  category: "12 个成员全用上，含长度 8、7、6 的数组",
  input: lines.join("\n") + "\n",
  output: out.join("\n") + "\n",
}];
```
