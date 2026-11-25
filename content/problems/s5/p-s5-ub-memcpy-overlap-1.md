---json
{
  "id": "p-s5-ub-memcpy-overlap-1",
  "title": "缓冲区搬运规划：这一趟该用 memcpy 还是 memmove",
  "difficulty": "L4",
  "knowledgePoints": ["s5-ub-memcpy-overlap"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
把一段逻辑地址上的字节搬到同一个缓冲区的另一个位置，是文本处理里最常见的操作（删除一个字符后前移、插入时后移、滑动窗口错位）。但 `memcpy` 的契约是"源与目标不得重叠"，重叠就必须换 `memmove`。本题要求你写一个搬运规划器：读入一个缓冲区内容和一串搬运请求，对每个请求判断两段区间是否重叠、给出应选的函数，并**按正确的 memmove 语义**算出搬运后的缓冲区。

对第 `k` 个请求（`k` 从 1 开始），设源区间是 `S = [src, src + n)`、目标区间是 `D = [dst, dst + n)`：

1. **重叠判定**：`n > 0` 且 `S` 与 `D` 有交集。两个半开区间相交的充要条件是 `src < dst + n && dst < src + n`。注意"紧挨着"不算重叠：`src + n == dst` 或 `dst + n == src` 时两段不共享任何字节；
2. **方向**：`n == 0` 或 `src == dst` 记 `none`；`dst < src` 记 `forward`（目标在源前面，可以从前向后搬）；`dst > src` 记 `backward`（目标在源后面，必须从后向前搬）；
3. **该用的函数**：重叠用 `memmove`，不重叠用 `memcpy`；
4. **搬运结果**：按 `memmove` 的语义计算，即"先把源区整块取到临时空间，再写到目标区"。即使判定为 `memcpy` 也按同样的结果输出——不重叠时两者结果相同。

输出两行：第一行是判定，第二行是搬运后的缓冲区内容。

## 输入格式
第一行一个字符串：初始缓冲区内容，只含小写字母，长度 `L` 在 1 到 60 之间，不含空格。

第二行一个整数 `q`：请求个数。

接下来 `q` 行，每行三个整数 `src dst n`。

## 输出格式
对第 `k` 个请求输出两行：

```
op<k> overlap=<yes|no> dir=<forward|backward|none> mem=<memcpy|memmove>
buf=<搬运后的缓冲区内容>
```

各字段之间恰好一个空格，`buf=` 后面是搬运后的完整内容（长度始终为 `L`，不会出现 `'\0'` 问题）。

## 数据范围
- `1 ≤ L ≤ 60`；
- `1 ≤ q ≤ 100`；
- `0 ≤ src, dst ≤ L`，`0 ≤ n ≤ L`，且 `src + n ≤ L`、`dst + n ≤ L`；
- 输出最多 200 行，远小于 64KB。

## 示例
### 示例 1
```in
abcdefghij
3
0 2 8
2 0 3
0 0 5
```
```out
op1 overlap=yes dir=backward mem=memmove
buf=ababcdefgh
op2 overlap=yes dir=forward mem=memmove
buf=abcbcdefgh
op3 overlap=yes dir=none mem=memmove
buf=abcbcdefgh
```
> 第 1 个请求把 `[0,8)` 搬到 `[2,10)`，两段在 `[2,8)` 上重叠，`dst > src` 所以方向是 `backward`（从后往前搬）。第 2 个请求是 `[2,5)` → `[0,3)`，`dst < src`，`forward`。第 3 个请求 `src == dst`，方向 `none`，缓冲区不变——注意它仍然算"重叠"，因为两段是同一段内存。

### 示例 2（边界：整块自己搬自己）
```in
abcdef
2
0 0 6
2 2 4
```
```out
op1 overlap=yes dir=none mem=memmove
buf=abcdef
op2 overlap=yes dir=none mem=memmove
buf=abcdef
```
> `src == dst` 时源和目标完全重合，当然算重叠，但方向是 `none`，搬运结果不变。这是最容易被"漏判"的一种：很多实现先算 `src < dst` 或 `dst < src`，两个分支都不进，最后把方向打印成空。

## 提示
### 第 1 层
重叠判定只用一个表达式：`n > 0 && src < dst + n && dst < src + n`。不要写 `src + n > dst` 这类只判一个方向的式子——重叠是对称的，必须两个方向都判。

### 第 2 层
方向由指针大小决定，与重叠无关：`dst < src` 是 `forward`，`dst > src` 是 `backward`，相等或 `n == 0` 是 `none`。这个字段在 `memcpy` 的场合没有实际意义（不重叠时随便怎么搬都对），但题目要求照样打印。

### 第 3 层
算搬运结果最省事的办法就是"照 memmove 的定义做"：先把源区 `n` 个字节复制到一个临时数组，再把临时数组写到目标区。这样无论重叠方向如何都正确，不用写两套循环，也不会遇到 `buf` 被自己覆盖的问题。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[128];
    if (scanf("%127s", buf) != 1) {
        return 0;
    }
    int len = (int)strlen(buf);
    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 100) {
        return 0;
    }
    for (int k = 1; k <= q; k++) {
        int src, dst, n;
        if (scanf("%d %d %d", &src, &dst, &n) != 3) {
            return 0;
        }
        if (src < 0 || dst < 0 || n < 0 || src + n > len || dst + n > len) {
            return 0;
        }

        int overlap = n > 0 && src < dst + n && dst < src + n;
        const char *dir = "none";
        if (n > 0 && dst < src) {
            dir = "forward";
        } else if (n > 0 && dst > src) {
            dir = "backward";
        }
        printf("op%d overlap=%s dir=%s mem=%s\n",
               k, overlap ? "yes" : "no", dir, overlap ? "memmove" : "memcpy");

        char tmp[128];
        memcpy(tmp, buf + src, (size_t)n);        /* 先整块取到临时区 */
        memcpy(buf + dst, tmp, (size_t)n);        /* 再写回：等价于 memmove */
        printf("buf=%s\n", buf);
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[128];
    if (scanf("%127s", buf) != 1) {
        return 0;
    }
    int len = (int)strlen(buf);
    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 100) {
        return 0;
    }
    for (int k = 1; k <= q; k++) {
        int src, dst, n;
        if (scanf("%d %d %d", &src, &dst, &n) != 3) {
            return 0;
        }
        int overlap = n > 0 && src < dst;         /* TODO: 重叠是对称的，要两个方向都判 */
        const char *dir = "none";
        if (dst < src) {
            dir = "forward";
        } else if (dst > src) {
            dir = "backward";
        }
        printf("op%d overlap=%s dir=%s mem=%s\n",
               k, overlap ? "yes" : "no", dir, overlap ? "memmove" : "memcpy");

        for (int i = 0; i < n; i++) {             /* TODO: dst > src 时这样搬会踩坏源数据 */
            buf[dst + i] = buf[src + i];
        }
        printf("buf=%s\n", buf);
    }
    return 0;
}
```

## 复杂度
时间 O(q × L)：每个请求最多搬 `L` 个字节。
空间 O(L)：一个临时缓冲区。

## 常见错误
### 用 `src < dst` 判断重叠 [WA]
`src < dst` 只说"目标在后面"，完全没说两段是否相交。`src = 0, dst = 3, n = 2` 时目标在后面但两段不相交，会被误判成重叠；反过来 `src = 2, dst = 0, n = 3` 时目标在前面却相交，会被漏判。示例 1 的第 2 个请求就是这种，判定会从 `overlap=yes` 变成 `no`。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[128];
    if (scanf("%127s", buf) != 1) {
        return 0;
    }
    int len = (int)strlen(buf);
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int k = 1; k <= q; k++) {
        int src, dst, n;
        if (scanf("%d %d %d", &src, &dst, &n) != 3) {
            return 0;
        }
        int overlap = n > 0 && src < dst;        /* 错：只判了一个方向 */
        const char *dir = "none";
        if (n > 0 && dst < src) {
            dir = "forward";
        } else if (n > 0 && dst > src) {
            dir = "backward";
        }
        printf("op%d overlap=%s dir=%s mem=%s\n",
               k, overlap ? "yes" : "no", dir, overlap ? "memmove" : "memcpy");
        char tmp[128];
        memcpy(tmp, buf + src, (size_t)n);
        memcpy(buf + dst, tmp, (size_t)n);
        printf("buf=%s\n", buf);
    }
    return 0;
}
```

### 把"紧挨着"也算成重叠 [WA]
`src + n == dst`（或 `dst + n == src`）时两段区间正好首尾相接，**没有共享字节**，用 `memcpy` 完全合法。写成 `src + n >= dst` 会把这种情况判成重叠，输出从 `memcpy` 变成 `memmove`——虽然结果一样，但判定字段错了。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[128];
    if (scanf("%127s", buf) != 1) {
        return 0;
    }
    int len = (int)strlen(buf);
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int k = 1; k <= q; k++) {
        int src, dst, n;
        if (scanf("%d %d %d", &src, &dst, &n) != 3) {
            return 0;
        }
        int overlap = n > 0 && src < dst + n && dst <= src + n;   /* 错：边界用了 <= */
        const char *dir = "none";
        if (n > 0 && dst < src) {
            dir = "forward";
        } else if (n > 0 && dst > src) {
            dir = "backward";
        }
        printf("op%d overlap=%s dir=%s mem=%s\n",
               k, overlap ? "yes" : "no", dir, overlap ? "memmove" : "memcpy");
        char tmp[128];
        memcpy(tmp, buf + src, (size_t)n);
        memcpy(buf + dst, tmp, (size_t)n);
        printf("buf=%s\n", buf);
    }
    return 0;
}
```

### 判定对了，搬运却用了"从前往后原地搬" [WA]
重叠且 `dst > src` 时从前往后搬，后写的目标会覆盖还没读的源字节——示例 1 第 1 个请求的结果会是 `ababababab` 而不是 `ababcdefgh`。判定字段全对也没用，第二行就错了。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[128];
    if (scanf("%127s", buf) != 1) {
        return 0;
    }
    int len = (int)strlen(buf);
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int k = 1; k <= q; k++) {
        int src, dst, n;
        if (scanf("%d %d %d", &src, &dst, &n) != 3) {
            return 0;
        }
        int overlap = n > 0 && src < dst + n && dst < src + n;
        const char *dir = "none";
        if (n > 0 && dst < src) {
            dir = "forward";
        } else if (n > 0 && dst > src) {
            dir = "backward";
        }
        printf("op%d overlap=%s dir=%s mem=%s\n",
               k, overlap ? "yes" : "no", dir, overlap ? "memmove" : "memcpy");
        for (int i = 0; i < n; i++) {
            buf[dst + i] = buf[src + i];         /* 错：方向搞反时源被提前覆盖 */
        }
        printf("buf=%s\n", buf);
    }
    return 0;
}
```

### 把方向写反 [WA]
`dst < src` 是 `forward`：目标在低地址，从前往后搬，每次读的源字节都在还没写到的区域里。写成 `dst > src → forward` 会让所有重叠请求的方向字段全部颠倒。

### `n == 0` 时忘记特判 [WA]
`n == 0` 时两段空区间不算重叠，方向也没有意义（要输出 `none`）。用 `src < dst + n && dst < src + n` 判重叠时 `n == 0` 自然为假，但方向那两行必须显式排除 `n == 0`，否则 `src = 0, dst = 5, n = 0` 会输出 `backward`。

## 测试用例
### 01 sample 示例 1
```in
abcdefghij
3
0 2 8
2 0 3
0 0 5
```
```out
op1 overlap=yes dir=backward mem=memmove
buf=ababcdefgh
op2 overlap=yes dir=forward mem=memmove
buf=abcbcdefgh
op3 overlap=yes dir=none mem=memmove
buf=abcbcdefgh
```

### 02 sample 示例 2
```in
abcdef
2
0 0 6
2 2 4
```
```out
op1 overlap=yes dir=none mem=memmove
buf=abcdef
op2 overlap=yes dir=none mem=memmove
buf=abcdef
```

### 03 boundary 60 字节的整块操作
```in
abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefgh
3
0 59 1
0 0 60
1 0 59
```
```out
op1 overlap=no dir=backward mem=memcpy
buf=abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefga
op2 overlap=yes dir=none mem=memmove
buf=abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefga
op3 overlap=yes dir=forward mem=memmove
buf=bcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefgaa
```
> 第 1 个请求只搬 1 个字节到末尾，两段不相交；第 2 个是整块自己搬自己（`overlap=yes`、`dir=none`）；第 3 个把 `[1,60)` 前移一格，重叠且 `dst < src`。

### 04 degenerate 长度全为 0
```in
abc
3
0 1 0
1 1 0
2 0 0
```
```out
op1 overlap=no dir=none mem=memcpy
buf=abc
op2 overlap=no dir=none mem=memcpy
buf=abc
op3 overlap=no dir=none mem=memcpy
buf=abc
```
> `n == 0` 时两段空区间不可能重叠，方向也必须是 `none`，缓冲区不变。

### 05 trap 紧挨着不算重叠
```in
abcdefgh
3
0 4 4
4 0 4
3 7 1
```
```out
op1 overlap=no dir=backward mem=memcpy
buf=abcdabcd
op2 overlap=no dir=forward mem=memcpy
buf=abcdabcd
op3 overlap=no dir=backward mem=memcpy
buf=abcdabcd
```
> `[0,4)` 与 `[4,8)` 首尾相接但没有共享字节，所以是 `memcpy`。第 3 个请求把 `[3,4)` 搬到 `[7,8)`，同样不相交。这里如果用 `>=` 判重叠，三行都会变成 `memmove`。

### 06 trap 源和目标完全重合
```in
abcdef
2
1 1 3
0 2 3
```
```out
op1 overlap=yes dir=none mem=memmove
buf=abcdef
op2 overlap=yes dir=backward mem=memmove
buf=ababcf
```
> 第 1 个请求 `src == dst`，重叠但方向 `none`，内容不变；第 2 个请求把 `"abc"` 搬到下标 2，结果是 `ab` + `abc` + `f`。

### 07 normal 连续四次搬运
```in
abcdefghij
4
2 4 4
4 2 4
7 9 1
9 0 1
```
```out
op1 overlap=yes dir=backward mem=memmove
buf=abcdcdefij
op2 overlap=yes dir=forward mem=memmove
buf=abcdefefij
op3 overlap=no dir=backward mem=memcpy
buf=abcdefefif
op4 overlap=no dir=forward mem=memcpy
buf=fbcdefefif
```
