---json
{
  "id": "p-s7-stack-array-1",
  "title": "撤销栈：按接口实现固定容量的数组栈（push / pop / peek / size / destroy）",
  "difficulty": "L4",
  "knowledgePoints": ["s7-stack-array"],
  "special": "ds-implementation",
  "judge": { "mode": "function", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
编辑器的"撤销栈"是一种**容量固定**的栈：撤销记录最多存 `cap` 条，栈满了就拒绝新的记录（不能悄悄丢掉最老的一条），栈空了就拒绝弹出。本题要求你用**一块数组 + 一个 top** 把它实现出来。

测试驱动会用 `stack.h` 里的接口驱动你的实现。请你在 `solution.c` 中实现六个函数：

```c
typedef struct {
    int *data;      /* 堆上 cap 个 int；cap 为 0 时必须是 NULL */
    int top;        /* 下一个空位的下标，同时等于元素个数：空栈 0，满栈 cap */
    int cap;
} IntStack;

void stack_init(IntStack *s, int cap);              /* 分配 cap 个 int，置为空栈 */
int  stack_push(IntStack *s, int value);            /* 满时返回 0，栈不变 */
int  stack_pop(IntStack *s, int *out);              /* 空时返回 0，*out 不被修改 */
int  stack_peek(const IntStack *s, int *out);       /* 只看栈顶，空时返回 0 */
int  stack_size(const IntStack *s);                 /* 元素个数，也就是 top */
void stack_destroy(IntStack *s);                    /* 释放内存并把三个字段清零 */
```

五条硬性要求：

1. **top 的语义写死为"下一个空位的下标"**：空栈 `top == 0`，每压入一个元素 `top++`，满栈 `top == cap`。`stack_size` 直接返回 `top`。不要把两种 top 约定混着用。
2. **容量固定，不扩容**：`stack_push` 在 `top == cap` 时必须返回 `0`，且 `top`、`cap`、`data` 与调用前完全一致。
3. **失败不破坏现场**：`stack_pop` / `stack_peek` 在空栈上返回 `0`，不能修改 `*out`；`stack_push` 失败时不能让 `top` 变化。
4. **`stack_init` 要真的分配**：`cap > 0` 时用 `malloc` 分配 `cap` 个 `int`；`cap <= 0` 时 `data = NULL`、`cap = 0`（此时任何 push 都必须失败）。
5. **`stack_destroy` 要释放干净**：`free(data)` 之后把 `data / top / cap` 全部清零。对空栈、零容量栈调用也必须安全。

你只需要提交 `solution.c`，不要写 `main`，也不要提交 `stack.h`。

## 输入格式
（由隐藏的测试驱动读取，供你理解测试方式）

第一行两个整数 `cap`、`n`：栈的容量、要依次压栈的整数个数。
第二行 `n` 个整数（`n = 0` 时这一行不存在）。

## 输出格式
（由隐藏的测试驱动输出）共 19 行：

```
cap=<请求的容量>
pushed=<成功压入的个数>
first_full=<第一次 push 失败时的下标（0 起），一次都没失败则为 -1>
size=<stack_size 的结果>
peek=<此时栈顶的值；空栈输出 ->
full=<size == cap 时为 1>
popped=<之后弹出成功的次数>
pop_head=<前 min(8, popped) 个弹出的值，空格分隔>
pop_sum=<弹出的值之和>
size_after=<全部弹出之后的 stack_size>
empty_pop=<在空栈上 stack_pop 的返回值>
empty_peek=<在空栈上 stack_peek 的返回值>
empty_size=<此时 stack_size>
reset=<destroy 之后 data==NULL 且 top==0 且 cap==0 时为 1>
zero_push=<对 stack_init(&z, 0) 之后的栈调用 push 的返回值>
zero_size=<这个零容量栈的 stack_size>
zero_peek=<这个零容量栈的 stack_peek>
zero_pop=<这个零容量栈的 stack_pop>
zero_reset=<这个零容量栈 destroy 之后三个字段是否都清零>
```

元素之和最大 5×10¹²，测试驱动用 `long long` 累加。

## 数据范围
0 ≤ cap ≤ 1000
0 ≤ n ≤ 5000
-10⁹ ≤ 每个元素 ≤ 10⁹

`n` 可能远大于 `cap`：多出来的那些 `push` 必须全部失败，且不能破坏已有的栈内容。最大输入约 60KB，远小于平台 1MB 的输入上限。

## 示例
### 示例 1
```in
4 3
10 20 30
```
```out
cap=4
pushed=3
first_full=-1
size=3
peek=30
full=0
popped=3
pop_head=30 20 10
pop_sum=60
size_after=0
empty_pop=0
empty_peek=0
empty_size=0
reset=1
zero_push=0
zero_size=0
zero_peek=0
zero_pop=0
zero_reset=1
```
> 容量 4、压入 3 个元素，没压满：`pushed=3`、`first_full=-1`、`size=3`、栈顶是 30。全部弹出时是后进先出，所以 `pop_head=30 20 10`、`pop_sum=60`。

### 示例 2（边界：容量恰好用满）
```in
3 3
7 8 9
```
```out
cap=3
pushed=3
first_full=-1
size=3
peek=9
full=1
popped=3
pop_head=9 8 7
pop_sum=24
size_after=0
empty_pop=0
empty_peek=0
empty_size=0
reset=1
zero_push=0
zero_size=0
zero_peek=0
zero_pop=0
zero_reset=1
```
> `cap = n = 3`，第三次 `push` 之后 `top` 正好等于 `cap`，此时 `full=1`，但还没有任何一次 push 失败，所以 `first_full` 仍然是 `-1`。"满了"和"已经拒绝过"是两件事。

## 提示
### 第 1 层
先把 top 的语义写在纸上：`top` 是**下一个空位**。于是 `push` 是"先写到 `data[top]`，再 `top++`"；`pop` 是"先把 `top--`，再取 `data[top]`"；`peek` 是 `data[top - 1]`；`size` 就是 `top`。四个动作全部围绕这一个数字，写的时候一句一句对照，不要中途换成另一种约定。

### 第 2 层
`stack_init(s, cap)` 要处理三种情况：`cap > 0` 正常分配；`cap <= 0` 直接置零（`data = NULL`）；`malloc` 失败时也退化成零容量栈（此时 `s->cap = 0`），这样后面的 `push` 自然会失败而不是崩溃。分配的大小写成 `(size_t)cap * sizeof *s->data`，`malloc` 的返回值要判 `NULL`。

### 第 3 层
`push` 的判满是 `if (s->top >= s->cap) return 0;`——注意 `top` 可能等于 `cap`（满）或超过（不可能，但用 `>=` 更稳）。`pop` / `peek` 的判空是 `if (s->top <= 0) return 0;`，失败时**不要**碰 `*out`。`destroy` 里 `free(NULL)` 是安全的，所以空栈调用不需要特判；释放后把三个字段都写成 0。

## 参考代码
```c file=solution.c
#include <stdlib.h>
#include "stack.h"

void stack_init(IntStack *s, int cap) {
    s->data = NULL;
    s->top = 0;
    s->cap = 0;
    if (cap <= 0) {
        return;                        /* 零容量栈：不分配，push 自然失败 */
    }
    s->data = malloc((size_t)cap * sizeof *s->data);
    if (s->data == NULL) {
        return;                        /* 分配失败：退化成零容量栈 */
    }
    s->cap = cap;
}

int stack_push(IntStack *s, int value) {
    if (s->top >= s->cap) {
        return 0;                      /* 满：拒绝，什么都不改 */
    }
    s->data[s->top] = value;           /* 先写到"下一个空位" */
    s->top++;                          /* top 变成新的元素个数 */
    return 1;
}

int stack_pop(IntStack *s, int *out) {
    if (s->top <= 0) {
        return 0;
    }
    s->top--;                          /* 先把 top 缩回"最后一个元素的下标" */
    if (out != NULL) {
        *out = s->data[s->top];
    }
    return 1;
}

int stack_peek(const IntStack *s, int *out) {
    if (s->top <= 0) {
        return 0;
    }
    if (out != NULL) {
        *out = s->data[s->top - 1];
    }
    return 1;
}

int stack_size(const IntStack *s) {
    return s->top;
}

void stack_destroy(IntStack *s) {
    free(s->data);                     /* free(NULL) 也是安全的 */
    s->data = NULL;
    s->top = 0;
    s->cap = 0;
}
```

## 初始代码
```c file=solution.c
#include <stdlib.h>
#include "stack.h"

void stack_init(IntStack *s, int cap) {
    (void)cap;
    s->data = NULL;
    s->top = 0;
    s->cap = 0;
    /* TODO: cap > 0 时用 malloc 分配 cap 个 int，并记下 cap */
}

int stack_push(IntStack *s, int value) {
    (void)value;
    /* TODO: 满了返回 0；否则写到 data[top]，再让 top 加一 */
    return 0;
}

int stack_pop(IntStack *s, int *out) {
    (void)out;
    /* TODO: 空栈返回 0；否则先把 top 减一，再把 data[top] 写到 *out */
    return 0;
}

int stack_peek(const IntStack *s, int *out) {
    (void)out;
    /* TODO: 空栈返回 0；否则把 data[top - 1] 写到 *out（不能修改结构体） */
    return 0;
}

int stack_size(const IntStack *s) {
    /* TODO: 返回元素个数 */
    (void)s;
    return 0;
}

void stack_destroy(IntStack *s) {
    /* TODO: 释放 data，并把 data / top / cap 全部清零 */
    (void)s;
}
```

## 测试驱动
```c file=stack.h
#ifndef STACK_H
#define STACK_H

/* 固定容量的整数栈。
   data 指向堆上 cap 个 int（cap 为 0 时是 NULL）；
   top 是"下一个空位的下标"，同时等于元素个数：空栈为 0，满栈为 cap。 */
typedef struct {
    int *data;
    int top;
    int cap;
} IntStack;

/* 分配 cap 个 int 并置为空栈。cap <= 0 时 data = NULL、cap = 0。 */
void stack_init(IntStack *s, int cap);

/* 压栈：成功返回 1；栈已满返回 0，此时栈的内容与 top 都不变。 */
int stack_push(IntStack *s, int value);

/* 弹栈：成功时把栈顶写入 *out 并返回 1；空栈返回 0（*out 不被修改）。 */
int stack_pop(IntStack *s, int *out);

/* 只看栈顶：成功写入 *out 并返回 1；空栈返回 0。不修改栈。 */
int stack_peek(const IntStack *s, int *out);

/* 返回元素个数（约定：等于 top）。 */
int stack_size(const IntStack *s);

/* 释放全部堆内存并把 data / top / cap 清零。对空栈调用也必须安全。 */
void stack_destroy(IntStack *s);

#endif
```

```c file=harness.c hidden
#include <stdio.h>
#include "stack.h"

int main(void) {
    int cap;
    int n;
    if (scanf("%d %d", &cap, &n) != 2 || cap < 0 || cap > 1000 || n < 0 || n > 5000) {
        return 0;
    }

    IntStack s;
    stack_init(&s, cap);

    int pushed = 0;
    int first_full = -1;
    for (int i = 0; i < n; i++) {
        int v;
        if (scanf("%d", &v) != 1) {
            stack_destroy(&s);
            return 0;
        }
        if (stack_push(&s, v)) {
            pushed++;
        } else if (first_full < 0) {
            first_full = i;
        }
    }

    printf("cap=%d\n", cap);
    printf("pushed=%d\n", pushed);
    printf("first_full=%d\n", first_full);

    int size = stack_size(&s);
    printf("size=%d\n", size);

    int top = 0;
    if (stack_peek(&s, &top)) {
        printf("peek=%d\n", top);
    } else {
        printf("peek=-\n");
    }
    printf("full=%d\n", size == cap ? 1 : 0);

    int buf[5000];
    int popped = 0;
    long long sum = 0;
    int v = 0;
    while (popped < 5000 && stack_pop(&s, &v)) {
        buf[popped] = v;
        popped++;
        sum += v;
    }
    printf("popped=%d\n", popped);
    printf("pop_head=");
    for (int i = 0; i < popped && i < 8; i++) {
        printf("%s%d", i ? " " : "", buf[i]);
    }
    printf("\n");
    printf("pop_sum=%lld\n", sum);
    printf("size_after=%d\n", stack_size(&s));

    printf("empty_pop=%d\n", stack_pop(&s, &v));
    printf("empty_peek=%d\n", stack_peek(&s, &v));
    printf("empty_size=%d\n", stack_size(&s));

    stack_destroy(&s);
    printf("reset=%d\n", (s.data == NULL && s.top == 0 && s.cap == 0) ? 1 : 0);

    IntStack z;
    stack_init(&z, 0);
    printf("zero_push=%d\n", stack_push(&z, 1));
    printf("zero_size=%d\n", stack_size(&z));
    printf("zero_peek=%d\n", stack_peek(&z, &v));
    printf("zero_pop=%d\n", stack_pop(&z, &v));
    stack_destroy(&z);
    printf("zero_reset=%d\n", (z.data == NULL && z.top == 0 && z.cap == 0) ? 1 : 0);
    return 0;
}
```

## 复杂度
`stack_init` / `stack_destroy` 是 O(1)（一次 `malloc` / `free`）；`push`、`pop`、`peek`、`size` 全是 O(1)。
空间 O(cap)：一块 `cap` 个 `int` 的连续内存，最多 1000 × 4 = 4KB。

## 常见错误
### `push` 不判满，直接往 `data[top]` 写 [RE|UB]
容量是固定的，`n` 却可能远大于 `cap`。少了 `if (s->top >= s->cap) return 0;` 这一句，第 `cap + 1` 次 push 就会写到数组外面（`RE`）；对零容量栈更是直接往 `NULL` 上写（`UB`）。这是数组栈最典型的错误，样例还往往看不出来——示例 1 里根本没压满。

```c file=solution.c expect=RE|UB
#include <stdlib.h>
#include "stack.h"

void stack_init(IntStack *s, int cap) {
    s->data = NULL;
    s->top = 0;
    s->cap = 0;
    if (cap <= 0) {
        return;
    }
    s->data = malloc((size_t)cap * sizeof *s->data);
    if (s->data == NULL) {
        return;
    }
    s->cap = cap;
}

int stack_push(IntStack *s, int value) {
    s->data[s->top] = value;           /* 错：没有判满，越界写 */
    s->top++;
    return 1;
}

int stack_pop(IntStack *s, int *out) {
    if (s->top <= 0) {
        return 0;
    }
    s->top--;
    if (out != NULL) {
        *out = s->data[s->top];
    }
    return 1;
}

int stack_peek(const IntStack *s, int *out) {
    if (s->top <= 0) {
        return 0;
    }
    if (out != NULL) {
        *out = s->data[s->top - 1];
    }
    return 1;
}

int stack_size(const IntStack *s) {
    return s->top;
}

void stack_destroy(IntStack *s) {
    free(s->data);
    s->data = NULL;
    s->top = 0;
    s->cap = 0;
}
```

### `stack_size` 返回 cap，而不是 top [WA]
`cap` 是"最多能装几个"，`top` 才是"现在装了了几个"。把两者混淆，测试驱动的 `size`、`full`、`size_after` 三行全部错位。`stack_size` 的实现只有一个词：`return s->top;`。

```c file=solution.c expect=WA
#include <stdlib.h>
#include "stack.h"

void stack_init(IntStack *s, int cap) {
    s->data = NULL;
    s->top = 0;
    s->cap = 0;
    if (cap <= 0) {
        return;
    }
    s->data = malloc((size_t)cap * sizeof *s->data);
    if (s->data == NULL) {
        return;
    }
    s->cap = cap;
}

int stack_push(IntStack *s, int value) {
    if (s->top >= s->cap) {
        return 0;
    }
    s->data[s->top] = value;
    s->top++;
    return 1;
}

int stack_pop(IntStack *s, int *out) {
    if (s->top <= 0) {
        return 0;
    }
    s->top--;
    if (out != NULL) {
        *out = s->data[s->top];
    }
    return 1;
}

int stack_peek(const IntStack *s, int *out) {
    if (s->top <= 0) {
        return 0;
    }
    if (out != NULL) {
        *out = s->data[s->top - 1];
    }
    return 1;
}

int stack_size(const IntStack *s) {
    return s->cap;                     /* 错：这是容量，不是元素个数 */
}

void stack_destroy(IntStack *s) {
    free(s->data);
    s->data = NULL;
    s->top = 0;
    s->cap = 0;
}
```

### `pop` 忘了让 top 减一 [WA]
```c
*out = s->data[s->top - 1];   /* 读对了栈顶 */
return 1;                      /* 错：top 没变 */
```
读出来的值是对的，所以前几个 `pop_head` 看起来正常，但 `top` 永远不减少：测试驱动"一直弹到空"的循环会一直弹同一个元素，`popped` 一直涨到上限、`pop_sum` 变成一个巨大的数，判 `WA`。`pop` 的正确顺序是"先 `top--`，再读 `data[top]`"。

### 两种 top 约定混用 [RE]
`stack_init` 里写 `s->top = -1`（约定 A），`push` 里却写 `s->data[s->top++] = value`（约定 B 的写法），第一次 push 就写到 `data[-1]`——数组下界之前的内存，ASan 判 `RE`。约定一旦选定，六个函数必须统一；本题的 `stack.h` 已经写明是"下一个空位的下标"，就不要再按 `-1` 起步。

### `push` 失败时仍然修改 top [WA]
```c
if (s->top >= s->cap) {
    s->top++;              /* 错：失败了还改状态 */
    return 0;
}
```
返回值告诉调用者"没压进去"，内部状态却变了：之后 `size` 比实际元素多、`peek` 读到未初始化的槽位。失败路径的铁律是**什么都不改**。

## 测试用例
### 01 sample 示例 1
```in
4 3
10 20 30
```
```out
cap=4
pushed=3
first_full=-1
size=3
peek=30
full=0
popped=3
pop_head=30 20 10
pop_sum=60
size_after=0
empty_pop=0
empty_peek=0
empty_size=0
reset=1
zero_push=0
zero_size=0
zero_peek=0
zero_pop=0
zero_reset=1
```

### 02 sample 示例 2
```in
3 3
7 8 9
```
```out
cap=3
pushed=3
first_full=-1
size=3
peek=9
full=1
popped=3
pop_head=9 8 7
pop_sum=24
size_after=0
empty_pop=0
empty_peek=0
empty_size=0
reset=1
zero_push=0
zero_size=0
zero_peek=0
zero_pop=0
zero_reset=1
```

### 03 degenerate 一个都不压，直接看空栈
```in
5 0
```
```out
cap=5
pushed=0
first_full=-1
size=0
peek=-
full=0
popped=0
pop_head=
pop_sum=0
size_after=0
empty_pop=0
empty_peek=0
empty_size=0
reset=1
zero_push=0
zero_size=0
zero_peek=0
zero_pop=0
zero_reset=1
```

### 04 trap 元素比容量多，多出来的必须被拒绝
```in
2 5
1 2 3 4 5
```
```out
cap=2
pushed=2
first_full=2
size=2
peek=2
full=1
popped=2
pop_head=2 1
pop_sum=3
size_after=0
empty_pop=0
empty_peek=0
empty_size=0
reset=1
zero_push=0
zero_size=0
zero_peek=0
zero_pop=0
zero_reset=1
```

### 05 trap 负数与重复值，后进先出必须弹对顺序
```in
5 3
-1 -1 0
```
```out
cap=5
pushed=3
first_full=-1
size=3
peek=0
full=0
popped=3
pop_head=0 -1 -1
pop_sum=-2
size_after=0
empty_pop=0
empty_peek=0
empty_size=0
reset=1
zero_push=0
zero_size=0
zero_peek=0
zero_pop=0
zero_reset=1
```

### 06 normal 容量 8 压 5 个，正负交替
```in
8 5
5 -2 0 8 -7
```
```out
cap=8
pushed=5
first_full=-1
size=5
peek=-7
full=0
popped=5
pop_head=-7 8 0 -2 5
pop_sum=4
size_after=0
empty_pop=0
empty_peek=0
empty_size=0
reset=1
zero_push=0
zero_size=0
zero_peek=0
zero_pop=0
zero_reset=1
```

### 生成 boundary 容量一千、压五千个元素
```js gen
const cases = [];

function render(cap, values) {
  const stack = [];
  let pushed = 0;
  let firstFull = -1;
  for (let i = 0; i < values.length; i++) {
    if (stack.length < cap) {
      stack.push(values[i]);
      pushed++;
    } else if (firstFull < 0) {
      firstFull = i;
    }
  }
  const size = stack.length;
  const popped = [];
  while (stack.length) popped.push(stack.pop());
  const sum = popped.reduce((a, b) => a + b, 0);
  return [
    `cap=${cap}`,
    `pushed=${pushed}`,
    `first_full=${firstFull}`,
    `size=${size}`,
    `peek=${size ? stackPeek(values, cap) : '-'}`,
    `full=${size === cap ? 1 : 0}`,
    `popped=${popped.length}`,
    `pop_head=${popped.slice(0, 8).join(' ')}`,
    `pop_sum=${sum}`,
    'size_after=0',
    'empty_pop=0',
    'empty_peek=0',
    'empty_size=0',
    'reset=1',
    'zero_push=0',
    'zero_size=0',
    'zero_peek=0',
    'zero_pop=0',
    'zero_reset=1',
  ].join('\n') + '\n';
}

/* 栈顶 = 最后成功压入的那个值 */
function stackPeek(values, cap) {
  const n = Math.min(values.length, cap);
  return String(values[n - 1]);
}

function input(cap, values) {
  return `${cap} ${values.length}\n${values.join(' ')}\n`;
}

/* 容量 1000，压 5000 个元素 */
{
  const values = [];
  for (let i = 1; i <= 5000; i++) values.push(i);
  cases.push({
    kind: 'boundary',
    category: '容量 1000、压 5000 个递增元素',
    input: input(1000, values),
    output: render(1000, values),
  });
}

return cases;
```

### 生成 normal 容量 37、压 137 个随机数
```js gen
const cases = [];

function render(cap, values) {
  const stack = [];
  let pushed = 0;
  let firstFull = -1;
  for (let i = 0; i < values.length; i++) {
    if (stack.length < cap) {
      stack.push(values[i]);
      pushed++;
    } else if (firstFull < 0) {
      firstFull = i;
    }
  }
  const size = stack.length;
  const popped = [];
  while (stack.length) popped.push(stack.pop());
  const sum = popped.reduce((a, b) => a + b, 0);
  const peek = size ? String(values[Math.min(values.length, cap) - 1]) : '-';
  return [
    `cap=${cap}`,
    `pushed=${pushed}`,
    `first_full=${firstFull}`,
    `size=${size}`,
    `peek=${peek}`,
    `full=${size === cap ? 1 : 0}`,
    `popped=${popped.length}`,
    `pop_head=${popped.slice(0, 8).join(' ')}`,
    `pop_sum=${sum}`,
    'size_after=0',
    'empty_pop=0',
    'empty_peek=0',
    'empty_size=0',
    'reset=1',
    'zero_push=0',
    'zero_size=0',
    'zero_peek=0',
    'zero_pop=0',
    'zero_reset=1',
  ].join('\n') + '\n';
}

function input(cap, values) {
  return `${cap} ${values.length}\n${values.join(' ')}\n`;
}

/* 容量 37，压 137 个随机值（含负数与重复） */
{
  const values = [];
  for (let i = 0; i < 137; i++) values.push(rng.int(-1000, 1000));
  cases.push({
    kind: 'normal',
    category: '容量 37、压 137 个随机值',
    input: input(37, values),
    output: render(37, values),
  });
}

return cases;
```
