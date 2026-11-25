---json
{
  "id": "p-s5-dynamic-array-1",
  "title": "按需扩容的整数栈：push / pop / top / destroy 都要干净",
  "difficulty": "L4",
  "knowledgePoints": ["s5-dynamic-array"],
  "special": "ds-implementation",
  "judge": { "mode": "function", "timeMs": 1000, "compare": "lines", "checkLeaks": true }
}
---

## 题目描述
"按需扩容的可变长数组"是后面所有数据结构的底座：栈、队列、动态表、缓冲区，内部都是"一块会搬家的堆内存 + size/cap 两个数字"。请你亲手把这个底座实现一遍。

测试驱动会用接口头文件 `stack.h` 驱动你的实现，请你在 `solution.c` 里实现五个函数：

```c
typedef struct {
    int *data;      /* 堆上 cap 个 int；空栈时为 NULL */
    int size;       /* 栈里现有几个元素（栈底是 data[0]，栈顶是 data[size-1]） */
    int cap;        /* 这块内存最多能装几个 */
} IntStack;

void stack_init(IntStack *s);                /* 置为空栈：data=NULL、size=0、cap=0 */
int  stack_push(IntStack *s, int value);     /* 压栈：成功 1，内存不足 0（栈不变） */
int  stack_pop(IntStack *s, int *out);       /* 弹栈：成功时把栈顶写到 *out 并返回 1，空栈返回 0 */
int  stack_top(const IntStack *s, int *out); /* 只看栈顶：成功 1，空栈返回 0 */
void stack_destroy(IntStack *s);             /* 释放全部内存并把三个字段清零 */
```

四条硬性要求：

1. **后进先出**：`pop` 弹出的必须是 `data[size-1]`，然后 `size--`；
2. **扩容不能丢数据**：`push` 在 `size == cap` 时扩容，扩容后 `data[0] … data[size-1]` 的内容必须原样保留；
3. **失败不破坏现场**：`push` 返回 0 时 `size`、`cap`、`data` 与调用前完全一致；
4. **释放干净**：`stack_destroy` 必须把堆内存**真正归还**（`free`），并且把 `data/size/cap` 清零。本题开启了**内存泄漏检查**——输出全对但结束时还有没归还的堆内存，会判 `LEAK`。

你只需要提交 `solution.c`，不要写 `main`，也不要提交 `stack.h`。

## 输入格式
（由隐藏的测试驱动读取，供你理解测试方式）

第一行一个整数 `n`。
第二行 `n` 个整数，依次压栈。

## 输出格式
（由隐藏的测试驱动输出）共 13 行：

```
size=<全部压栈之后的 size>
cap_ok=<cap >= size 时为 1>
sum=<栈内所有元素之和>
half=<n / 2，接下来要弹出的个数>
pop_head=<前 min(5, half) 次 pop 出的值，空格分隔；half=0 时为空>
half_sum=<这 half 次 pop 出的值之和>
size_after_half=<弹完之后的 size>
top=<此时 stack_top 得到的值；栈空时为 none>
rest=<把剩下的元素全部弹出，一共弹了几个>
reset=<destroy 之后 data==NULL 且 size==0 且 cap==0 时为 1>
empty_pop=<在空栈上调用 stack_pop 的返回值>
empty_top=<在空栈上调用 stack_top 的返回值>
empty_reset=<空栈 init 后直接 destroy，三个字段是否都清零>
```

元素之和最大 5×10¹³，测试驱动用 `long long` 累加。

## 数据范围
1 ≤ n ≤ 50000
-10⁹ ≤ 每个元素 ≤ 10⁹

栈容量最大增长到 2¹⁶ = 65536（约 256KB），远低于平台 256MB 的堆上限。最大输入约 350KB，在平台 1MB 的输入上限之内。

## 示例
### 示例 1
```in
3
10 20 30
```
```out
size=3
cap_ok=1
sum=60
half=1
pop_head=30
half_sum=30
size_after_half=2
top=20
rest=2
reset=1
empty_pop=0
empty_top=0
empty_reset=1
```
> 压入 `10 20 30` 后栈顶是 30。`half = 3 / 2 = 1`，弹出 1 个得到 `30`，剩下 `10 20`，`top=20`，再把剩下的 2 个弹完，`rest=2`。

### 示例 2（边界：只有一个元素）
```in
1
42
```
```out
size=1
cap_ok=1
sum=42
half=0
pop_head=
half_sum=0
size_after_half=1
top=42
rest=1
reset=1
empty_pop=0
empty_top=0
empty_reset=1
```
> `half = 0`，所以一次都不弹，`pop_head=` 后面是空的。此时栈顶就是唯一的元素 42，`rest=1` 表示最后把它弹掉了。

## 提示
### 第 1 层
先记住三条不变式：`cap >= size`；`data` 指向 `cap` 个 `int`（空栈时是 `NULL`）；前 `size` 个是有效元素、栈顶是 `data[size-1]`。五个函数都只是在维护这三条。`pop` / `top` 要先把"空栈"这个情况判掉，再动下标。

### 第 2 层
扩容逻辑只写在一个内部函数里（比如 `static int stack_grow(IntStack *s, int need)`），`push` 在 `size == cap` 时调用它。扩容时用临时指针接住 `realloc` 的返回值：`int *tmp = realloc(s->data, (size_t)newcap * sizeof *tmp);`，`tmp == NULL` 就返回 0（此时栈完全没变），成功才写回 `s->data` 并更新 `s->cap`。容量从 4 开始、每次翻倍即可。

### 第 3 层
`pop` 的顺序是"先判空 → `size--` → 取 `data[size]`"；`top` 是"先判空 → 取 `data[size-1]`"，注意 `top` 的参数是 `const IntStack *`，不能改结构体。`destroy` 里 `free(s->data)` 之后要写 `s->data = NULL; s->size = 0; s->cap = 0;`——`free(NULL)` 是安全的，所以空栈调用也正确。最后检查一遍：**每一个 `realloc` 换下来的旧块都被 `free` 了吗？** 本题会检查泄漏。

## 参考代码
```c file=solution.c
#include <stdlib.h>
#include "stack.h"

void stack_init(IntStack *s) {
    s->data = NULL;
    s->size = 0;
    s->cap = 0;
}

/* 保证 cap >= need；成功 1，失败 0（此时栈完全没变） */
static int stack_grow(IntStack *s, int need) {
    if (need <= s->cap) {
        return 1;
    }
    int newcap = (s->cap == 0) ? 4 : s->cap;
    while (newcap < need) {
        newcap *= 2;
    }
    int *tmp = realloc(s->data, (size_t)newcap * sizeof *tmp);
    if (tmp == NULL) {
        return 0;
    }
    s->data = tmp;
    s->cap = newcap;
    return 1;
}

int stack_push(IntStack *s, int value) {
    if (s->size == s->cap && !stack_grow(s, s->size + 1)) {
        return 0;
    }
    s->data[s->size] = value;
    s->size++;
    return 1;
}

int stack_pop(IntStack *s, int *out) {
    if (s->size == 0) {
        return 0;
    }
    s->size--;
    if (out != NULL) {
        *out = s->data[s->size];
    }
    return 1;
}

int stack_top(const IntStack *s, int *out) {
    if (s->size == 0) {
        return 0;
    }
    if (out != NULL) {
        *out = s->data[s->size - 1];
    }
    return 1;
}

void stack_destroy(IntStack *s) {
    free(s->data);                 /* free(NULL) 也是安全的 */
    s->data = NULL;
    s->size = 0;
    s->cap = 0;
}
```

## 初始代码
```c file=solution.c
#include <stdlib.h>
#include "stack.h"

void stack_init(IntStack *s) {
    s->data = NULL;
    s->size = 0;
    s->cap = 0;
}

int stack_push(IntStack *s, int value) {
    (void)value;
    /* TODO: 没有空位时先扩容（用临时指针接住 realloc 的返回值），再写入并让 size 加一 */
    return 0;
}

int stack_pop(IntStack *s, int *out) {
    (void)out;
    /* TODO: 空栈返回 0；否则把栈顶写到 *out、size 减一、返回 1 */
    return 0;
}

int stack_top(const IntStack *s, int *out) {
    (void)out;
    /* TODO: 空栈返回 0；否则把栈顶写到 *out 并返回 1（不能修改结构体） */
    return 0;
}

void stack_destroy(IntStack *s) {
    (void)s;
    /* TODO: 释放 data，并把 data / size / cap 全部清零 */
}
```

## 测试驱动
```c file=stack.h
#ifndef STACK_H
#define STACK_H

#include <stddef.h>

/* 按需扩容的整数栈：data 指向堆上 cap 个 int，前 size 个是栈内元素（栈底在 data[0]）。 */
typedef struct {
    int *data;
    int size;
    int cap;
} IntStack;

/* 置为空栈：不分配内存，data 为 NULL，size 和 cap 为 0。 */
void stack_init(IntStack *s);

/* 压栈。成功返回 1；内存不足返回 0，此时栈的内容保持不变。 */
int stack_push(IntStack *s, int value);

/* 弹栈：成功时把栈顶写入 *out 并返回 1；空栈返回 0（*out 不被修改）。 */
int stack_pop(IntStack *s, int *out);

/* 只看栈顶：成功时写入 *out 并返回 1；空栈返回 0。不修改栈。 */
int stack_top(const IntStack *s, int *out);

/* 释放全部堆内存并把三个字段清零。对空栈调用也必须安全。 */
void stack_destroy(IntStack *s);

#endif
```

```c file=harness.c hidden
#include <stdio.h>
#include "stack.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 50000) {
        return 0;
    }

    IntStack s;
    stack_init(&s);

    for (int i = 0; i < n; i++) {
        int v;
        if (scanf("%d", &v) != 1) {
            stack_destroy(&s);
            return 0;
        }
        if (!stack_push(&s, v)) {
            printf("push_failed=%d\n", i);
            stack_destroy(&s);
            return 0;
        }
    }

    printf("size=%d\n", s.size);
    printf("cap_ok=%d\n", s.cap >= s.size ? 1 : 0);

    long long sum = 0;
    for (int i = 0; i < s.size; i++) {
        sum += s.data[i];
    }
    printf("sum=%lld\n", sum);

    int half = n / 2;
    printf("half=%d\n", half);

    int head = 0;
    long long head_sum = 0;
    printf("pop_head=");
    for (int i = 0; i < half; i++) {
        int v = 0;
        if (!stack_pop(&s, &v)) {
            break;
        }
        head_sum += v;
        if (head < 5) {
            printf("%s%d", head ? " " : "", v);
            head++;
        }
    }
    printf("\n");
    printf("half_sum=%lld\n", head_sum);
    printf("size_after_half=%d\n", s.size);

    int top = 0;
    if (stack_top(&s, &top)) {
        printf("top=%d\n", top);
    } else {
        printf("top=none\n");
    }

    int rest = 0;
    int v = 0;
    while (stack_pop(&s, &v)) {
        rest++;
    }
    printf("rest=%d\n", rest);

    stack_destroy(&s);
    printf("reset=%d\n", (s.data == NULL && s.size == 0 && s.cap == 0) ? 1 : 0);

    IntStack empty;
    stack_init(&empty);
    printf("empty_pop=%d\n", stack_pop(&empty, &v));
    printf("empty_top=%d\n", stack_top(&empty, &v));
    stack_destroy(&empty);
    printf("empty_reset=%d\n", (empty.data == NULL && empty.size == 0 && empty.cap == 0) ? 1 : 0);
    return 0;
}
```

## 复杂度
`push` 均摊 O(1)（容量 4、8、16… 翻倍，n 次压栈的总搬迁量小于 2n）；`pop`、`top`、`init`、`destroy` 都是 O(1)。
空间 O(n)：一块 `int` 数组，峰值不超过有效元素个数的 2 倍。

## 常见错误
### `destroy` 只把指针置空，没有真正 `free` [LEAK]
`stack_destroy` 里只写 `s->data = NULL;` 看起来"很安全"——指针确实空了，不会悬垂——但堆内存根本没有归还。本题开启了泄漏检查，输出全对也会被判 `LEAK`，判题器会直接指出"内存是在 `solution.c` 的哪一行分配的"。置空和释放是两件事：先 `free`，再置空。

```c file=solution.c expect=LEAK
#include <stdlib.h>
#include "stack.h"

void stack_init(IntStack *s) {
    s->data = NULL;
    s->size = 0;
    s->cap = 0;
}

static int stack_grow(IntStack *s, int need) {
    if (need <= s->cap) {
        return 1;
    }
    int newcap = (s->cap == 0) ? 4 : s->cap;
    while (newcap < need) {
        newcap *= 2;
    }
    int *tmp = realloc(s->data, (size_t)newcap * sizeof *tmp);
    if (tmp == NULL) {
        return 0;
    }
    s->data = tmp;
    s->cap = newcap;
    return 1;
}

int stack_push(IntStack *s, int value) {
    if (s->size == s->cap && !stack_grow(s, s->size + 1)) {
        return 0;
    }
    s->data[s->size] = value;
    s->size++;
    return 1;
}

int stack_pop(IntStack *s, int *out) {
    if (s->size == 0) {
        return 0;
    }
    s->size--;
    if (out != NULL) {
        *out = s->data[s->size];
    }
    return 1;
}

int stack_top(const IntStack *s, int *out) {
    if (s->size == 0) {
        return 0;
    }
    if (out != NULL) {
        *out = s->data[s->size - 1];
    }
    return 1;
}

void stack_destroy(IntStack *s) {
    s->data = NULL;                /* 错：只置空，内存没有归还 */
    s->size = 0;
    s->cap = 0;
}
```

### `pop` 忘了让 `size` 减一 [TLE]
`*out = s->data[s->size - 1];` 读对了栈顶，但 `size` 没减，于是"弹"出去的下一次还是同一个元素。测试驱动用 `while (stack_pop(&s, &v)) { rest++; }` 把栈弹空，这个循环**永远不会结束**——本平台判 `TLE`。这是"数据结构不变量被破坏"最典型的后果：不是某个值算错，而是调用方的正常循环变成了死循环。

```c file=solution.c expect=TLE
#include <stdlib.h>
#include "stack.h"

void stack_init(IntStack *s) {
    s->data = NULL;
    s->size = 0;
    s->cap = 0;
}

static int stack_grow(IntStack *s, int need) {
    if (need <= s->cap) {
        return 1;
    }
    int newcap = (s->cap == 0) ? 4 : s->cap;
    while (newcap < need) {
        newcap *= 2;
    }
    int *tmp = realloc(s->data, (size_t)newcap * sizeof *tmp);
    if (tmp == NULL) {
        return 0;
    }
    s->data = tmp;
    s->cap = newcap;
    return 1;
}

int stack_push(IntStack *s, int value) {
    if (s->size == s->cap && !stack_grow(s, s->size + 1)) {
        return 0;
    }
    s->data[s->size] = value;
    s->size++;
    return 1;
}

int stack_pop(IntStack *s, int *out) {
    if (s->size == 0) {
        return 0;
    }
    if (out != NULL) {
        *out = s->data[s->size - 1];
    }
    return 1;                      /* 错：忘了 s->size-- */
}

int stack_top(const IntStack *s, int *out) {
    if (s->size == 0) {
        return 0;
    }
    if (out != NULL) {
        *out = s->data[s->size - 1];
    }
    return 1;
}

void stack_destroy(IntStack *s) {
    free(s->data);
    s->data = NULL;
    s->size = 0;
    s->cap = 0;
}
```

### `pop` 弹的是栈底，把栈写成了队列 [WA]
`*out = s->data[0];` 之后 `size--`，元素个数是对的、也不会死循环，但顺序变成了先进先出：`pop_head` 会输出最早压进去的那几个值，而样例要求的是后进先出的栈顶值。栈和队列用的存储完全一样，区别**只在下标取哪一端**——这类错误在小数据上很容易被"求和相同"掩盖（`half_sum` 恰好一样），必须看顺序才能发现。

```c file=solution.c expect=WA
#include <stdlib.h>
#include "stack.h"

void stack_init(IntStack *s) {
    s->data = NULL;
    s->size = 0;
    s->cap = 0;
}

static int stack_grow(IntStack *s, int need) {
    if (need <= s->cap) {
        return 1;
    }
    int newcap = (s->cap == 0) ? 4 : s->cap;
    while (newcap < need) {
        newcap *= 2;
    }
    int *tmp = realloc(s->data, (size_t)newcap * sizeof *tmp);
    if (tmp == NULL) {
        return 0;
    }
    s->data = tmp;
    s->cap = newcap;
    return 1;
}

int stack_push(IntStack *s, int value) {
    if (s->size == s->cap && !stack_grow(s, s->size + 1)) {
        return 0;
    }
    s->data[s->size] = value;
    s->size++;
    return 1;
}

int stack_pop(IntStack *s, int *out) {
    if (s->size == 0) {
        return 0;
    }
    if (out != NULL) {
        *out = s->data[0];             /* 错：弹出的是栈底，成了队列 */
    }
    s->size--;
    return 1;
}

int stack_top(const IntStack *s, int *out) {
    if (s->size == 0) {
        return 0;
    }
    if (out != NULL) {
        *out = s->data[s->size - 1];
    }
    return 1;
}

void stack_destroy(IntStack *s) {
    free(s->data);
    s->data = NULL;
    s->size = 0;
    s->cap = 0;
}
```

### 只在第一次 push 时扩容 [RE]
`if (s->cap == 0) { 扩到 4 }` 会让容量永远停在 4，第 5 个元素就写到堆块之外。ASan 报 `heap-buffer-overflow`，判 `RE`。判断条件必须是"没有空位了"，即 `s->size == s->cap`。

```c file=solution.c expect=RE
#include <stdlib.h>
#include "stack.h"

void stack_init(IntStack *s) {
    s->data = NULL;
    s->size = 0;
    s->cap = 0;
}

int stack_push(IntStack *s, int value) {
    if (s->cap == 0) {             /* 错：只在第一次扩容，容量永远停在 4 */
        int *tmp = realloc(NULL, 4 * sizeof *tmp);
        if (tmp == NULL) {
            return 0;
        }
        s->data = tmp;
        s->cap = 4;
    }
    s->data[s->size] = value;
    s->size++;
    return 1;
}

int stack_pop(IntStack *s, int *out) {
    if (s->size == 0) {
        return 0;
    }
    s->size--;
    if (out != NULL) {
        *out = s->data[s->size];
    }
    return 1;
}

int stack_top(const IntStack *s, int *out) {
    if (s->size == 0) {
        return 0;
    }
    if (out != NULL) {
        *out = s->data[s->size - 1];
    }
    return 1;
}

void stack_destroy(IntStack *s) {
    free(s->data);
    s->data = NULL;
    s->size = 0;
    s->cap = 0;
}
```

### 扩容时直接写 `s->data = realloc(s->data, ...)` [LEAK]
失败时 `realloc` 返回 `NULL`、原块保持有效，而赋值已经把 `s->data` 覆盖成 `NULL`：原内存永久泄漏，栈却还声称自己"什么都没变"。虽然本题的隐藏用例里不会真的内存不足，但这一行是评审重点——必须用临时指针接住、判空之后再赋值。

### 用 `int` 计算 `newcap * sizeof *tmp` 的字节数 [UB]
`(size_t)newcap * sizeof *tmp` 里的 `sizeof` 已经产生 `size_t`，相乘会按 64 位进行，不会溢出。但如果写成 `int bytes = newcap * 4;`，`newcap` 超过 5 亿时就会溢出（有符号溢出是未定义行为）。扩容的容量和字节数都应当用 `size_t` 表达，本题的数据范围虽然到不了，但这是同一类错误的根源。

## 测试用例
### 01 sample 示例 1
```in
3
10 20 30
```
```out
size=3
cap_ok=1
sum=60
half=1
pop_head=30
half_sum=30
size_after_half=2
top=20
rest=2
reset=1
empty_pop=0
empty_top=0
empty_reset=1
```

### 02 sample 示例 2
```in
1
42
```
```out
size=1
cap_ok=1
sum=42
half=0
pop_head=
half_sum=0
size_after_half=1
top=42
rest=1
reset=1
empty_pop=0
empty_top=0
empty_reset=1
```

### 03 degenerate 两个相同的元素
```in
2
7 7
```
```out
size=2
cap_ok=1
sum=14
half=1
pop_head=7
half_sum=7
size_after_half=1
top=7
rest=1
reset=1
empty_pop=0
empty_top=0
empty_reset=1
```

### 04 trap 第六个元素会触发第二次扩容
```in
6
1 2 3 4 5 6
```
```out
size=6
cap_ok=1
sum=21
half=3
pop_head=6 5 4
half_sum=15
size_after_half=3
top=3
rest=3
reset=1
empty_pop=0
empty_top=0
empty_reset=1
```

### 05 trap 全负数，后进先出必须弹对顺序
```in
5
-1 -2 -3 -4 -5
```
```out
size=5
cap_ok=1
sum=-15
half=2
pop_head=-5 -4
half_sum=-9
size_after_half=3
top=-3
rest=3
reset=1
empty_pop=0
empty_top=0
empty_reset=1
```

### 06 normal 正负交替、有重复值
```in
9
5 -2 0 8 -7 3 3 1 -9
```
```out
size=9
cap_ok=1
sum=2
half=4
pop_head=-9 1 3 3
half_sum=-2
size_after_half=5
top=-7
rest=5
reset=1
empty_pop=0
empty_top=0
empty_reset=1
```

### 07 trap 只有两个元素，弹出全部后 top 必须是 none
```in
2
1000000000 -1000000000
```
```out
size=2
cap_ok=1
sum=0
half=1
pop_head=-1000000000
half_sum=-1000000000
size_after_half=1
top=1000000000
rest=1
reset=1
empty_pop=0
empty_top=0
empty_reset=1
```

### 生成 boundary 五万个元素与随机数据
```js gen
const cases = [];

function render(values) {
  const n = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const half = Math.floor(n / 2);
  const popped = values.slice(n - half).reverse();
  const head = popped.slice(0, 5).join(' ');
  const headSum = popped.reduce((a, b) => a + b, 0);
  const sizeAfter = n - half;
  return [
    `size=${n}`,
    'cap_ok=1',
    `sum=${sum}`,
    `half=${half}`,
    `pop_head=${head}`,
    `half_sum=${headSum}`,
    `size_after_half=${sizeAfter}`,
    sizeAfter > 0 ? `top=${values[sizeAfter - 1]}` : 'top=none',
    `rest=${sizeAfter}`,
    'reset=1',
    'empty_pop=0',
    'empty_top=0',
    'empty_reset=1',
  ].join('\n') + '\n';
}

/* 最大规模：50000 个递增元素，容量翻倍 14 次 */
{
  const values = [];
  for (let i = 1; i <= 50000; i++) values.push(i);
  cases.push({
    kind: 'boundary',
    category: '50000 个递增元素，总和 1250025000',
    input: `${values.length}\n${values.join(' ')}\n`,
    output: render(values),
  });
}

/* 总和逼近上限：40000 个 10 亿 */
{
  const values = new Array(40000).fill(1000000000);
  cases.push({
    kind: 'trap',
    category: '40000 个 10 亿，总和 4×10^13 必须用 long long 累加',
    input: `${values.length}\n${values.join(' ')}\n`,
    output: render(values),
  });
}

/* 随机：正负混合，期望值在 JS 里独立计算 */
{
  const n = 12345;
  const values = [];
  for (let i = 0; i < n; i++) values.push(rng.int(-1000000000, 1000000000));
  cases.push({
    kind: 'normal',
    category: '12345 个正负随机数',
    input: `${n}\n${values.join(' ')}\n`,
    output: render(values),
  });
}

return cases;
```
