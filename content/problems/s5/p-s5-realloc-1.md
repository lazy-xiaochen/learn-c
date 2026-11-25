---json
{
  "id": "p-s5-realloc-1",
  "title": "可增长缓冲区：用 realloc 实现 push / reserve / destroy",
  "difficulty": "L4",
  "knowledgePoints": ["s5-realloc"],
  "special": "ds-implementation",
  "judge": { "mode": "function", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
日志采集模块要把一条条整数记录攒进内存，但**事先不知道会有多少条**，只能边收边扩容。测试驱动会用一份现成的接口头文件 `buf.h` 驱动你的实现，请你在 `solution.c` 里实现下面四个函数：

```c
typedef struct {
    int *data;      /* 指向堆上 cap 个 int 的块；空缓冲区时为 NULL */
    size_t size;    /* 已经存了几个有效元素 */
    size_t cap;     /* 这块内存最多能装几个元素 */
} IntBuf;

void buf_init(IntBuf *b);                  /* 置为空缓冲区：data=NULL、size=0、cap=0 */
int  buf_push(IntBuf *b, int value);       /* 追加一个值：成功返回 1，失败返回 0 */
int  buf_reserve(IntBuf *b, size_t need);  /* 保证 cap >= need：成功 1，失败 0 */
void buf_destroy(IntBuf *b);               /* 释放 data 并把三个字段清零 */
```

四条接口契约（测试驱动会逐条检查）：

1. **失败不许破坏现场**：`buf_push` / `buf_reserve` 返回 0 时，`b` 的 `data`、`size`、`cap` 必须与调用前**完全一致**——旧数据一个字节都不能丢，旧指针一个都不能悬垂；
2. **`reserve` 只改容量**：它可以把 `cap` 变大（甚至提前预留很多），但**绝不能改 `size`**，也不能动已有的元素；
3. **`push` 必须保持顺序与内容**：第 i 次成功 `push` 的值，之后读 `data[i]` 必须还是它——扩容搬家不能丢数据；
4. **`destroy` 之后三个字段必须是 0/NULL**：释放完还要把指针置空、长度和容量清零，这样子后续误用会以空指针暴露，而不是静默踩到悬垂指针。

`buf.h` 里已经给出结构体和声明，你只需要提交 `solution.c`（不能提交 `buf.h`，也不能写 `main`）。

## 输入格式
（由隐藏的测试驱动读取，供你理解测试方式）

第一行一个整数 `n`。
第二行 `n` 个整数，依次是每次 `buf_push` 的值，用空格分隔。

## 输出格式
（由隐藏的测试驱动输出）共 11 行：

```
empty=<init 之后 data==NULL 且 size==0 且 cap==0 时为 1，否则 0>
size=<push 全部成功后的 size>
cap_ok=<cap >= size 时为 1，否则 0>
sum=<所有元素之和>
first=<data[0]> last=<data[size-1]> min=<最小值> max=<最大值>
reserve_ok=<buf_reserve(&b, size + 1000) 的返回值>
size_after_reserve=<调用 reserve 之后的 size> same=<与调用前相等时为 1>
last_after_reserve=<调用 reserve 之后 data[size-1] 的值>
reset=<destroy 之后 data==NULL 且 size==0 且 cap==0 时为 1，否则 0>
empty_reset=<对一个从未 push 过的空缓冲区 init 再 destroy 后同样检查，是则 1>
```

所有元素之和可能达到 5×10¹³，测试驱动用 `long long` 累加。

如果某次 `buf_push` 返回 0，测试驱动会立刻输出 `push_failed=<下标>` 并结束，不再输出后面的行。

## 数据范围
1 ≤ n ≤ 50000
-10⁹ ≤ 每个元素 ≤ 10⁹

总和最大 5×10⁴ × 10⁹ = 5×10¹³，超过 `int` 范围。`cap` 最大会增长到 2¹⁶ = 65536，`cap * sizeof(int)` 约 256KB，远低于平台 256MB 的堆上限。（`n` 上限取 5 万还有另一个原因：最大合法输入约 550KB，必须留在平台 1MB 的输入上限之内。）

## 示例
### 示例 1
```in
3
10 20 30
```
```out
empty=1
size=3
cap_ok=1
sum=60
first=10 last=30 min=10 max=30
reserve_ok=1
size_after_reserve=3 same=1
last_after_reserve=30
reset=1
empty_reset=1
```
> 三次 push 之后 `size=3`；`reserve(size + 1000)` 只把 `cap` 抬到至少 1003，`size` 和最后一个元素都不变；`destroy` 之后三个字段都清零。

### 示例 2（边界：只有一个元素，且是负数）
```in
1
-7
```
```out
empty=1
size=1
cap_ok=1
sum=-7
first=-7 last=-7 min=-7 max=-7
reserve_ok=1
size_after_reserve=1 same=1
last_after_reserve=-7
reset=1
empty_reset=1
```
> `n = 1` 时 `first`、`last`、`min`、`max` 都是同一个数。`empty=1` 说明 `buf_init` 一开始没有分配任何内存（`data` 必须是 `NULL`，不能在 `init` 里就 `malloc`）。

## 提示
### 第 1 层
先把三条不变式写下来，再写代码：`cap >= size`、`data` 指向 `cap` 个 `int`（或为空）、前 `size` 个元素有效。四个函数都只是围绕这三条不变式做维护——`push` 在"没有空位"时先扩容，`reserve` 只负责把 `cap` 抬上去，`destroy` 负责把一切归零。

### 第 2 层
`buf_reserve` 是本题的核心，也是唯一需要调用 `realloc` 的地方。写法必须是"临时指针接住返回值，判空之后再赋值"：`realloc` 失败会返回 `NULL`，如果直接写 `b->data = realloc(b->data, ...)`，失败时旧指针就被覆盖了，既丢数据又泄漏（而且违反了"失败不许破坏现场"的契约）。`buf_push` 只有在 `size == cap` 时才需要调用 `buf_reserve(b, b->size + 1)`。

### 第 3 层
扩容策略用翻倍，并且从 4 开始，避免第一次就只扩 1 个：先让 `newcap = (b->cap == 0) ? 4 : b->cap`，然后 `while (newcap < need) newcap *= 2;`，再 `realloc`。`push` 的顺序是"先确保空位 → 写 `data[size]` → `size++`"，三步的顺序不能换（先加 `size` 会跳过一个槽位，先写再扩容会越界）。`destroy` 要 `free(b->data);` 之后把三个字段都置 0——`free(NULL)` 是安全的，所以空缓冲区也能直接调用它。

## 参考代码
```c file=solution.c
#include <stdlib.h>
#include "buf.h"

void buf_init(IntBuf *b) {
    b->data = NULL;
    b->size = 0;
    b->cap = 0;
}

int buf_reserve(IntBuf *b, size_t need) {
    if (need <= b->cap) {
        return 1;                        /* 已经够大，什么都不用做 */
    }

    size_t newcap = (b->cap == 0) ? 4 : b->cap;
    while (newcap < need) {
        newcap *= 2;                     /* 翻倍：均摊 O(1) */
    }

    int *tmp = realloc(b->data, newcap * sizeof *tmp);
    if (tmp == NULL) {
        return 0;                        /* b 完全没被改动：旧数据、旧容量都还在 */
    }

    b->data = tmp;                       /* 只有成功才落到正式指针上 */
    b->cap = newcap;                     /* data 和 cap 必须一起更新 */
    return 1;
}

int buf_push(IntBuf *b, int value) {
    if (b->size == b->cap && !buf_reserve(b, b->size + 1)) {
        return 0;                        /* 扩容失败：size 没有变，缓冲区仍然一致 */
    }
    b->data[b->size] = value;
    b->size++;
    return 1;
}

void buf_destroy(IntBuf *b) {
    free(b->data);                       /* free(NULL) 也是安全的 */
    b->data = NULL;
    b->size = 0;
    b->cap = 0;
}
```

## 初始代码
```c file=solution.c
#include <stdlib.h>
#include "buf.h"

void buf_init(IntBuf *b) {
    b->data = NULL;
    b->size = 0;
    b->cap = 0;
}

int buf_reserve(IntBuf *b, size_t need) {
    (void)b;
    (void)need;
    /* TODO: 用 realloc 把容量扩到至少 need 个 int；
     *       失败时必须保证 b 的三个字段一点都没变 */
    return 0;
}

int buf_push(IntBuf *b, int value) {
    (void)b;
    (void)value;
    /* TODO: 先确保还有空位，再写 data[size]，最后让 size 加一 */
    return 0;
}

void buf_destroy(IntBuf *b) {
    (void)b;
    /* TODO: 释放 data，并把 data / size / cap 全部清零 */
}
```

## 测试驱动
```c file=buf.h
#ifndef BUF_H
#define BUF_H

#include <stddef.h>

/* 可增长缓冲区：data 指向堆上 cap 个 int，其中前 size 个是有效数据。 */
typedef struct {
    int *data;
    size_t size;
    size_t cap;
} IntBuf;

/* 把 b 置为空缓冲区：不分配内存，data 为 NULL，size 和 cap 为 0。 */
void buf_init(IntBuf *b);

/* 在末尾追加一个值。成功返回 1；失败返回 0，此时 b 的内容保持不变。 */
int buf_push(IntBuf *b, int value);

/* 保证 cap >= need。成功返回 1；失败返回 0，此时 b 的内容保持不变。 */
int buf_reserve(IntBuf *b, size_t need);

/* 释放 data 并把三个字段清零（data 变成 NULL）。对空缓冲区调用也必须安全。 */
void buf_destroy(IntBuf *b);

#endif
```

```c file=harness.c hidden
#include <stdio.h>
#include "buf.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 50000) {
        return 0;
    }

    IntBuf b;
    buf_init(&b);
    printf("empty=%d\n", (b.data == NULL && b.size == 0 && b.cap == 0) ? 1 : 0);

    for (int i = 0; i < n; i++) {
        int v;
        if (scanf("%d", &v) != 1) {
            buf_destroy(&b);
            return 0;
        }
        if (!buf_push(&b, v)) {
            printf("push_failed=%d\n", i);
            buf_destroy(&b);
            return 0;
        }
    }

    printf("size=%zu\n", b.size);
    printf("cap_ok=%d\n", b.cap >= b.size ? 1 : 0);

    long long sum = 0;
    for (size_t i = 0; i < b.size; i++) {
        sum += b.data[i];
    }
    int first = b.data[0];
    int last = b.data[b.size - 1];
    int min = b.data[0];
    int max = b.data[0];
    for (size_t i = 1; i < b.size; i++) {
        if (b.data[i] < min) {
            min = b.data[i];
        }
        if (b.data[i] > max) {
            max = b.data[i];
        }
    }
    printf("sum=%lld\n", sum);
    printf("first=%d last=%d min=%d max=%d\n", first, last, min, max);

    size_t before = b.size;
    int ok = buf_reserve(&b, b.size + 1000);
    printf("reserve_ok=%d\n", ok);
    printf("size_after_reserve=%zu same=%d\n", b.size, b.size == before ? 1 : 0);
    printf("last_after_reserve=%d\n", b.data[b.size - 1]);

    buf_destroy(&b);
    printf("reset=%d\n", (b.data == NULL && b.size == 0 && b.cap == 0) ? 1 : 0);

    IntBuf empty;
    buf_init(&empty);
    buf_destroy(&empty);
    printf("empty_reset=%d\n", (empty.data == NULL && empty.size == 0 && empty.cap == 0) ? 1 : 0);
    return 0;
}
```

## 复杂度
`buf_push` 均摊 O(1)：容量按 4、8、16、… 翻倍，n 次 push 的总搬迁量小于 2n 个元素。
`buf_reserve` 单次 O(cap)（`realloc` 可能搬迁），但均摊到每次 push 是常数。
`buf_destroy` O(1)，只有一次 `free`。
额外空间 O(n)：一个 `int` 数组，峰值不超过 2 倍有效数据量。

## 常见错误
### 只在第一次 push 时扩容 [RE]
`if (b->cap == 0) { 扩容到 4 }` 这种写法看起来很"节省"，但容量不会随着元素增多而增长：第 5 个元素就会写到 `data[4]`——一块只有 4 个 `int` 的堆内存之外。ASan 报 `heap-buffer-overflow`，本平台判 `RE`。正确的判断是"这次 push 会不会超过 `cap`"，即 `size == cap` 才扩容。

```c file=solution.c expect=RE
#include <stdlib.h>
#include "buf.h"

void buf_init(IntBuf *b) {
    b->data = NULL;
    b->size = 0;
    b->cap = 0;
}

int buf_reserve(IntBuf *b, size_t need) {
    (void)need;
    if (b->data == NULL) {
        int *tmp = realloc(NULL, 4 * sizeof *tmp);
        if (tmp == NULL) {
            return 0;
        }
        b->data = tmp;
        b->cap = 4;                    /* 错：容量永远停在 4 */
    }
    return 1;
}

int buf_push(IntBuf *b, int value) {
    if (!buf_reserve(b, b->size + 1)) {
        return 0;
    }
    b->data[b->size] = value;
    b->size++;
    return 1;
}

void buf_destroy(IntBuf *b) {
    free(b->data);
    b->data = NULL;
    b->size = 0;
    b->cap = 0;
}
```

### `destroy` 只释放不清零 [WA]
`free(b->data);` 之后不把三个字段置 0，测试驱动的 `reset=` 就是 0。这不只是"检查没过"：现实里调用者往往会在 `destroy` 之后继续误用这个结构体，`data` 仍是悬垂指针，下一次 `push` 就写进已释放的内存（释放后使用）。

```c file=solution.c expect=WA
#include <stdlib.h>
#include "buf.h"

void buf_init(IntBuf *b) {
    b->data = NULL;
    b->size = 0;
    b->cap = 0;
}

int buf_reserve(IntBuf *b, size_t need) {
    if (need <= b->cap) {
        return 1;
    }
    size_t newcap = (b->cap == 0) ? 4 : b->cap;
    while (newcap < need) {
        newcap *= 2;
    }
    int *tmp = realloc(b->data, newcap * sizeof *tmp);
    if (tmp == NULL) {
        return 0;
    }
    b->data = tmp;
    b->cap = newcap;
    return 1;
}

int buf_push(IntBuf *b, int value) {
    if (b->size == b->cap && !buf_reserve(b, b->size + 1)) {
        return 0;
    }
    b->data[b->size] = value;
    b->size++;
    return 1;
}

void buf_destroy(IntBuf *b) {
    free(b->data);                     /* 错：没有把 data / size / cap 清零 */
}
```

### 把 `cap` 当成长度写进 `size` [WA]
`size` 是"装了几个"，`cap` 是"最多装几个"。把两个字段混用（`b->size = b->cap;`）会让测试驱动看到 `size` 远大于实际元素个数，`sum`、`last` 全错；更危险的是循环会遍历到未初始化的槽位，读到垃圾值。

```c file=solution.c expect=WA
#include <stdlib.h>
#include "buf.h"

void buf_init(IntBuf *b) {
    b->data = NULL;
    b->size = 0;
    b->cap = 0;
}

int buf_reserve(IntBuf *b, size_t need) {
    if (need <= b->cap) {
        return 1;
    }
    size_t newcap = (b->cap == 0) ? 4 : b->cap;
    while (newcap < need) {
        newcap *= 2;
    }
    int *tmp = realloc(b->data, newcap * sizeof *tmp);
    if (tmp == NULL) {
        return 0;
    }
    b->data = tmp;
    b->cap = newcap;
    return 1;
}

int buf_push(IntBuf *b, int value) {
    if (b->size == b->cap && !buf_reserve(b, b->size + 1)) {
        return 0;
    }
    b->data[b->size] = value;
    b->size = b->cap;                  /* 错：把容量当成了有效长度 */
    return 1;
}

void buf_destroy(IntBuf *b) {
    free(b->data);
    b->data = NULL;
    b->size = 0;
    b->cap = 0;
}
```

### 写成 `b->data = realloc(b->data, ...)` [LEAK]
这是 `realloc` 的经典陷阱：失败时 `realloc` 返回 `NULL` 且**原块保持有效**，而赋值先把 `b->data` 覆盖成了 `NULL`，于是旧块永久泄漏；返回 0 之后这个缓冲区还声称自己"什么都没变"，实际上数据已经没了。必须用临时指针接住、判空之后再赋值。本题的隐藏用例里没有内存不足，但代码评审会盯着这一行。

### 忘记在 `push` 之后 `size++`（或者先加再写）[WA]
顺序必须是"确保空位 → 写 `data[size]` → `size++`"。先 `size++` 再写会写进 `data[size-1]` 的下一个槽位、并让第一个槽位永远未初始化；彻底忘记 `size++` 则所有元素都写在 `data[0]` 上，`size` 一直是 0，后面的 `first` / `last` 直接越界。写完 push 之后回头数一遍这三步。

## 测试用例
### 01 sample 示例 1
```in
3
10 20 30
```
```out
empty=1
size=3
cap_ok=1
sum=60
first=10 last=30 min=10 max=30
reserve_ok=1
size_after_reserve=3 same=1
last_after_reserve=30
reset=1
empty_reset=1
```

### 02 sample 示例 2
```in
1
-7
```
```out
empty=1
size=1
cap_ok=1
sum=-7
first=-7 last=-7 min=-7 max=-7
reserve_ok=1
size_after_reserve=1 same=1
last_after_reserve=-7
reset=1
empty_reset=1
```

### 03 degenerate 唯一的元素是 0
```in
1
0
```
```out
empty=1
size=1
cap_ok=1
sum=0
first=0 last=0 min=0 max=0
reserve_ok=1
size_after_reserve=1 same=1
last_after_reserve=0
reset=1
empty_reset=1
```

### 04 trap 全部相同，扩容多次但内容不变
```in
4
5 5 5 5
```
```out
empty=1
size=4
cap_ok=1
sum=20
first=5 last=5 min=5 max=5
reserve_ok=1
size_after_reserve=4 same=1
last_after_reserve=5
reset=1
empty_reset=1
```

### 05 trap 全是负数，first 与 last 不能写成同一端
```in
5
-1 -2 -3 -4 -5
```
```out
empty=1
size=5
cap_ok=1
sum=-15
first=-1 last=-5 min=-5 max=-1
reserve_ok=1
size_after_reserve=5 same=1
last_after_reserve=-5
reset=1
empty_reset=1
```

### 06 normal 正负交替，需要多次搬家
```in
7
3 -1 4 -1 5 -9 2
```
```out
empty=1
size=7
cap_ok=1
sum=3
first=3 last=2 min=-9 max=5
reserve_ok=1
size_after_reserve=7 same=1
last_after_reserve=2
reset=1
empty_reset=1
```

### 07 trap 恰好跨越 4 → 8 的边界
```in
9
1 2 3 4 5 6 7 8 9
```
```out
empty=1
size=9
cap_ok=1
sum=45
first=1 last=9 min=1 max=9
reserve_ok=1
size_after_reserve=9 same=1
last_after_reserve=9
reset=1
empty_reset=1
```

### 生成 boundary 十万个元素与极值数据
```js gen
const cases = [];

function render(n, values, sum, first, last, min, max) {
  return [
    'empty=1',
    `size=${n}`,
    'cap_ok=1',
    `sum=${sum}`,
    `first=${first} last=${last} min=${min} max=${max}`,
    'reserve_ok=1',
    `size_after_reserve=${n} same=1`,
    `last_after_reserve=${last}`,
    'reset=1',
    'empty_reset=1',
  ].join('\n') + '\n';
}

/* 最大规模：1…50000，总和 1250025000 */
{
  const n = 50000;
  const values = [];
  for (let i = 1; i <= n; i++) values.push(i);
  cases.push({
    kind: 'boundary',
    category: '50000 个递增元素，容量翻倍 16 次',
    input: `${n}\n${values.join(' ')}\n`,
    output: render(n, values, (n * (n + 1)) / 2, 1, n, 1, n),
  });
}

/* 总和 5×10^13：50000 个 10 亿 */
{
  const n = 50000;
  const big = 1000000000;
  const values = new Array(n).fill(big);
  cases.push({
    kind: 'trap',
    category: '50000 个 10 亿，总和 5×10^13 必须用 long long 累加',
    input: `${n}\n${values.join(' ')}\n`,
    output: render(n, values, n * big, big, big, big, big),
  });
}

/* 随机：正负混合，JS 里独立算期望值 */
{
  const n = 4096;
  const values = [];
  let sum = 0;
  let min = 1000000001;
  let max = -1000000001;
  for (let i = 0; i < n; i++) {
    const v = rng.int(-1000000000, 1000000000);
    values.push(v);
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  cases.push({
    kind: 'normal',
    category: '4096 个正负随机数',
    input: `${n}\n${values.join(' ')}\n`,
    output: render(n, values, sum, values[0], values[n - 1], min, max),
  });
}

return cases;
```
