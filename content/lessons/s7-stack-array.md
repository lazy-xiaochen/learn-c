---
id: s7-stack-array
---

## 讲解

### 栈只允许在一端进出
栈是"后进先出"（LIFO）的线性表：数据只能从**同一个端口**进出。这个端口叫栈顶（top），另一端叫栈底，栈底一旦压入就不再动。三种操作构成全部接口：

- `push`：把元素放到栈顶；
- `pop`：把栈顶元素拿走；
- `peek` / `top`：只看栈顶，不拿走。

日常里到处都是栈：编辑器的撤销栈（Ctrl+Z 撤销的永远是最近一次操作）、浏览器后退、函数调用栈、括号匹配、表达式求值。它们共同的特点是"最近发生的先被处理"，正好是 LIFO。

数组是实现栈最直接的方式：`data[0]` 是栈底，往后依次压入，栈顶永远在"最后一个被占用的位置"附近。整个结构只有两个数字需要维护——**一块数组 + 一个 top**。

### top 的两种语义：指向栈顶元素，还是指向下一个空位
这是数组栈唯一需要想清楚的事。`top` 是一个整数，但它到底代表什么，有两种同样常见的约定：

**约定 A：`top` 是栈顶元素的下标**

| 状态 | top 的值 | 元素个数 |
|---|---|---|
| 空栈 | `-1` | 0 |
| 压入 1 个 | `0` | 1 |
| 压满 cap 个 | `cap - 1` | cap |

```c
push:  if (top == cap - 1) return 0;   data[++top] = v;
pop:   if (top < 0) return 0;          *out = data[top--];
peek:  if (top < 0) return 0;          *out = data[top];
size:  top + 1
```

**约定 B：`top` 是下一个空位的下标（等价于元素个数）**

| 状态 | top 的值 | 元素个数 |
|---|---|---|
| 空栈 | `0` | 0 |
| 压入 1 个 | `1` | 1 |
| 压满 cap 个 | `cap` | cap |

```c
push:  if (top == cap) return 0;       data[top++] = v;
pop:   if (top == 0) return 0;         *out = data[--top];
peek:  if (top == 0) return 0;         *out = data[top - 1];
size:  top
```

两种约定**只差一个 1**，选哪个都行，但必须贯彻始终。混用是最常见的 bug 来源：用约定 B 的 `data[top++]` 压栈，却用约定 A 的 `data[top]` 取栈顶，取到的永远是"下一个空位"里的垃圾值；用约定 A 的 `top = -1` 初始化，却写 `if (top == cap) return 0;` 判满，就会在 `top == cap - 1` 之后继续写 `data[cap]`——数组越界。

两种约定各有偏好理由：

- 约定 B 的 `top` **直接就是元素个数**，`size` 不用加一，扩容时 `newcap = top * 2` 也自然；`top == 0` 判空、`top == cap` 判满，两个判断的形式对称。多数现代实现用它。
- 约定 A 的 `top` 与数组下标**完全一致**，访问栈顶就是 `data[top]`，不需要任何加减；教材和面试里常出现，读别人的代码时必须先确认是哪一种。

下面把同一串操作分别用两种约定跑一遍，注意两次输出的 top 恰好差 1，而 size 完全相同：

```c run id=st-top-minus1
#include <stdio.h>

#define CAP 8

typedef struct {
    int data[CAP];
    int top;              /* 约定 A：栈顶元素的下标，空栈为 -1 */
} StackA;

static void a_init(StackA *s) { s->top = -1; }
static int a_empty(const StackA *s) { return s->top < 0; }
static int a_full(const StackA *s) { return s->top == CAP - 1; }
static int a_size(const StackA *s) { return s->top + 1; }

static int a_push(StackA *s, int value) {
    if (a_full(s)) {
        return 0;             /* 满：拒绝这次压栈，栈完全不变 */
    }
    s->top++;                 /* ① 先挪到空位 */
    s->data[s->top] = value;  /* ② 再写入 */
    return 1;
}

static int a_pop(StackA *s, int *out) {
    if (a_empty(s)) {
        return 0;
    }
    *out = s->data[s->top];
    s->top--;
    return 1;
}

static int a_peek(const StackA *s, int *out) {
    if (a_empty(s)) {
        return 0;
    }
    *out = s->data[s->top];
    return 1;
}

int main(void) {
    StackA s;
    a_init(&s);
    printf("空栈：empty=%d top=%d size=%d\n", a_empty(&s), s.top, a_size(&s));

    for (int v = 1; v <= 3; v++) {
        if (!a_push(&s, v)) {
            return 0;
        }
    }
    int top_value = 0;
    a_peek(&s, &top_value);
    printf("压入 1 2 3：top=%d size=%d 栈顶=%d\n", s.top, a_size(&s), top_value);

    int v = 0;
    a_pop(&s, &v);
    printf("弹出 %d，top=%d size=%d\n", v, s.top, a_size(&s));
    a_pop(&s, &v);
    printf("弹出 %d，top=%d size=%d\n", v, s.top, a_size(&s));

    int pushed = 0;
    for (int x = 4; x <= 20; x++) {
        if (!a_push(&s, x)) {
            break;
        }
        pushed++;
    }
    printf("再压入 %d 个后：top=%d full=%d\n", pushed, s.top, a_full(&s));

    int again = a_push(&s, 99);
    printf("满了再压返回 %d，top 仍然是 %d\n", again, s.top);

    printf("全部弹出：");
    while (a_pop(&s, &v)) {
        printf("%d ", v);
    }
    printf("\n");
    return 0;
}
```
```output
空栈：empty=1 top=-1 size=0
压入 1 2 3：top=2 size=3 栈顶=3
弹出 3，top=1 size=2
弹出 2，top=0 size=1
再压入 7 个后：top=7 full=1
满了再压返回 0，top 仍然是 7
全部弹出：10 9 8 7 6 5 4 1
```

同一套操作，换成"top 指向下一个空位"的约定 B：

```c run id=st-top-zero
#include <stdio.h>

#define CAP 8

typedef struct {
    int data[CAP];
    int top;              /* 约定 B：下一个空位的下标，等于元素个数，空栈为 0 */
} StackB;

static void b_init(StackB *s) { s->top = 0; }
static int b_empty(const StackB *s) { return s->top == 0; }
static int b_full(const StackB *s) { return s->top == CAP; }
static int b_size(const StackB *s) { return s->top; }

static int b_push(StackB *s, int value) {
    if (b_full(s)) {
        return 0;
    }
    s->data[s->top++] = value;   /* 先写到 top 位置，再让 top 长大 */
    return 1;
}

static int b_pop(StackB *s, int *out) {
    if (b_empty(s)) {
        return 0;
    }
    *out = s->data[--s->top];    /* 先把 top 缩回去，它才指向真正的栈顶 */
    return 1;
}

static int b_peek(const StackB *s, int *out) {
    if (b_empty(s)) {
        return 0;
    }
    *out = s->data[s->top - 1];
    return 1;
}

int main(void) {
    StackB s;
    b_init(&s);
    printf("空栈：empty=%d top=%d size=%d\n", b_empty(&s), s.top, b_size(&s));

    for (int v = 1; v <= 3; v++) {
        if (!b_push(&s, v)) {
            return 0;
        }
    }
    int top_value = 0;
    b_peek(&s, &top_value);
    printf("压入 1 2 3：top=%d size=%d 栈顶=%d\n", s.top, b_size(&s), top_value);

    int v = 0;
    b_pop(&s, &v);
    printf("弹出 %d，top=%d size=%d\n", v, s.top, b_size(&s));
    b_pop(&s, &v);
    printf("弹出 %d，top=%d size=%d\n", v, s.top, b_size(&s));

    int pushed = 0;
    for (int x = 4; x <= 20; x++) {
        if (!b_push(&s, x)) {
            break;
        }
        pushed++;
    }
    printf("再压入 %d 个后：top=%d full=%d\n", pushed, s.top, b_full(&s));

    int again = b_push(&s, 99);
    printf("满了再压返回 %d，top 仍然是 %d\n", again, s.top);

    printf("全部弹出：");
    while (b_pop(&s, &v)) {
        printf("%d ", v);
    }
    printf("\n");
    return 0;
}
```
```output
空栈：empty=1 top=0 size=0
压入 1 2 3：top=3 size=3 栈顶=3
弹出 3，top=2 size=2
弹出 2，top=1 size=1
再压入 7 个后：top=8 full=1
满了再压返回 0，top 仍然是 8
全部弹出：10 9 8 7 6 5 4 1
```

两份输出里除了 `top` 一律差 1，其余完全一样。这正说明：**top 的值本身没有意义，有意义的是"它和元素个数的关系"**。写代码或读代码时，第一件事就是把这条关系确认下来。

### 数组栈的内存形态
栈在内存里就是一段连续空间加一个下标。以约定 A 为例，压入 10、20、30 之后：

```memory title="约定 A：data[0..3] 与 top（cap = 4，已经压入 3 个元素）"
下标 | 内容 | top 的关系 | 说明
data[0] | 10 | 栈底 | 最早压入，只有弹出所有元素后才会被覆盖
data[1] | 20 |  | 中间元素
data[2] | 30 | top 指向它 | 最后压入，下次 pop 取走的就是它
data[3] | 未使用 | top + 1 之后 | 下一块可用的空间
```

这段内存能直接看出数组栈的三个性质：

- **栈底永远在 `data[0]`**，整个结构只会从后往前收缩，不会出现"中间挖空"；
- **元素顺序就是压入顺序**，`pop` 只是把 `top` 往回挪，**不会清零**被弹出的槽位（下次 `push` 直接覆盖）；
- 所有操作都只碰 `top` 和 `data[top]`，与元素个数无关，因此 `push`/`pop` 都是 O(1)。

### push 满了、pop 空了怎么办
数组栈的容量是固定的，所以一定会遇到"满了还要压"和"空了还要弹"。接口设计上有两种态度：

1. **用返回值表达失败**（推荐）：`push` 返回 0 表示拒绝，且**栈完全不变**；`pop` 返回 0 表示空栈，`*out` 不被修改。调用者必须检查返回值。
2. 静默丢弃：满了就直接 `return`，调用者永远不知道数据丢了——这类 bug 在"偶尔溢出一次"的场景里极难发现，不推荐。

"失败时不改变现场"是一条硬性要求：`push` 失败后 `size`、`cap`、内容都要和调用前完全一致，否则调用方的重试逻辑会算错。本知识点的编程题会专门检查这一条。

### 容量不够时：翻倍扩容，均摊 O(1)
固定容量意味着必须提前知道最多压多少。真实的栈（比如编辑器的撤销栈）不会给你这个数，于是需要"按需扩容"：满了就用 `realloc` 把容量翻倍。

```c run id=st-grow
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int *data;     /* 堆上的 cap 个 int，空栈时为 NULL */
    int top;       /* 约定 B：元素个数，也是下一个空位的下标 */
    int cap;
} DynStack;

static void ds_init(DynStack *s) {
    s->data = NULL;
    s->top = 0;
    s->cap = 0;
}

static int ds_grow(DynStack *s, int need) {
    if (need <= s->cap) {
        return 1;
    }
    int newcap = (s->cap == 0) ? 4 : s->cap;
    while (newcap < need) {
        newcap *= 2;
    }
    int *tmp = realloc(s->data, (size_t)newcap * sizeof *tmp);
    if (tmp == NULL) {
        return 0;             /* 旧的 s->data 仍然有效，栈不受影响 */
    }
    s->data = tmp;
    s->cap = newcap;
    return 1;
}

static int ds_push(DynStack *s, int value) {
    if (s->top == s->cap && !ds_grow(s, s->top + 1)) {
        return 0;
    }
    s->data[s->top++] = value;
    return 1;
}

static int ds_pop(DynStack *s, int *out) {
    if (s->top == 0) {
        return 0;
    }
    *out = s->data[--s->top];
    return 1;
}

int main(void) {
    DynStack s;
    ds_init(&s);

    printf("容量变化：");
    int last = 0;
    for (int v = 1; v <= 20; v++) {
        if (!ds_push(&s, v)) {
            return 0;
        }
        if (s.cap != last) {
            printf("%d ", s.cap);
            last = s.cap;
        }
    }
    printf("\n最终 size=%d cap=%d\n", s.top, s.cap);

    int v = 0;
    int popped = 0;
    long long sum = 0;
    while (ds_pop(&s, &v)) {
        popped++;
        sum += v;
    }
    printf("弹出 %d 个，总和 %lld\n", popped, sum);

    free(s.data);              /* 只 free 一次：整块内存还给系统 */
    s.data = NULL;
    s.top = 0;
    s.cap = 0;
    printf("销毁后 top=%d cap=%d\n", s.top, s.cap);
    return 0;
}
```
```output
容量变化：4 8 16 32
最终 size=20 cap=32
弹出 20 个，总和 210
销毁后 top=0 cap=0
```

容量按 4 → 8 → 16 → 32 翻倍，20 次压栈一共只扩容 4 次。翻倍的关键性质是**均摊 O(1)**：n 次压栈造成的总搬迁量是 4 + 8 + 16 + … < 2n，摊到每次压栈上仍是常数。如果每次只加 1，n 次压栈就要搬 O(n²) 次数据。

### 应用：括号匹配
栈最经典的应用是括号匹配：遇到左括号就压栈，遇到右括号就弹出栈顶看是否配对。**后进先出**正好对应"括号必须由内向外闭合"的规则——最近打开的括号必须最先关闭。

```c run id=st-brackets
#include <stdio.h>

#define MAXLEN 64

/* 返回 1 表示配对成功 */
static int check(const char *text) {
    char stack[MAXLEN];
    int top = 0;                 /* 约定 B */
    int depth = 0;               /* 扫描过程中的最大深度 */
    int bad = 0;                 /* 是否遇到不匹配的右括号 */

    for (const char *p = text; *p != '\0' && !bad; p++) {
        char c = *p;
        if (c == '(' || c == '[' || c == '{') {
            stack[top++] = c;
            if (top > depth) {
                depth = top;
            }
        } else {
            char want = '\0';
            if (c == ')') {
                want = '(';
            } else if (c == ']') {
                want = '[';
            } else {
                want = '{';
            }
            if (top == 0 || stack[top - 1] != want) {
                bad = 1;          /* 栈空，或栈顶不是对应的左括号 */
            } else {
                top--;
            }
        }
    }

    printf("%s -> ok=%d depth=%d unmatched=%d\n", text, (!bad && top == 0), depth, top);
    return !bad && top == 0;
}

int main(void) {
    check("{[()()]}");
    check("([)]");
    check("((()))");
    check(")(");
    return 0;
}
```
```output
{[()()]} -> ok=1 depth=3 unmatched=0
([)] -> ok=0 depth=2 unmatched=2
((())) -> ok=1 depth=3 unmatched=0
)( -> ok=0 depth=0 unmatched=0
```

`([)]` 是最能说明问题的例子：左括号数量与右括号数量完全相等，但顺序错了。只看计数会判"匹配"，而栈会告诉你 `)` 想配对的栈顶是 `[`，不匹配。**栈保存的不只是数量，还有顺序**——这就是为什么括号匹配必须用栈，而不能用计数器。

### 数组栈与链表栈怎么选
| | 数组栈 | 链表栈 |
|---|---|---|
| 每次 push 是否分配内存 | 否（只有扩容时） | 是，一次 `malloc` |
| 缓存友好 | 好，连续内存 | 差，节点分散 |
| 容量上限 | 受 cap 限制，需要扩容 | 只受内存限制 |
| pop 的代价 | 改一个下标 | 摘链 + `free` |
| 适合 | 已知最大规模、追求速度 | 规模不可预测、需要频繁共享节点 |

数组栈是"默认选择"：只要你能估出规模上限，它比链表栈快得多，也简单得多。链表栈的价值在于"容量完全不设限"，以及 pop 出来的节点可以直接交给别处复用。

## 编译与运行

用 gcc 或 clang 编译，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra stack.c -o stack
./stack
```

```bash
clang -std=c17 -Wall -Wextra stack.c -o stack
./stack
```

数组栈的 bug 大多是**下标越界**，用 AddressSanitizer 跑一遍最容易定位：

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=address stack.c -o stack
./stack
```

开了 ASan 之后，`data[-1]` 和 `data[cap]` 都会立刻变成一条 `stack-buffer-overflow` 报告，并指出越界发生在哪一行——这比"输出里多了一个莫名其妙的数"好查一百倍。动态扩容的版本还要注意配对的 `free`：本平台开启了泄漏检查的题目会把没归还的内存判成 `LEAK`。

## 常见错误

### 两种 top 约定混用 [WA]
```c
int top = -1;                  /* 约定 A 初始化 */
...
s->data[s->top++] = value;     /* 却是约定 B 的写法：先写 data[-1] 再自增！ */

*out = s->data[s->top];        /* 用约定 A 取栈顶，取到的是"下一个空位" */
```
约定 A 的 `data[-1]` 直接越界（`RE`）；即使侥幸不崩，取栈顶那一句也会永远读到还没写入的槽位。**先确认约定，再写第一行代码**。

### 判满条件写错一位 [RE]
约定 A 下正确的判满是 `top == cap - 1`（top 最大只能到 `cap-1`）。写成 `top == cap` 就永远判不到满，`data[cap]` 越界写；约定 B 下正确的是 `top == cap`，写成 `top == cap - 1` 会白白浪费一个槽位，而且明明还有空间却拒绝压栈（`WA`）。判满/判空是最值得写单元测试的两行。

### pop 忘了让 top 回退 [TLE]
```c
*out = s->data[--s->top];   /* 对 */
*out = s->data[s->top];     /* 错：top 没变，下次还取同一个元素 */
```
栈永远弹不空，`while (pop(&s, &v))` 变成死循环，判 `TLE`。这和链表栈"pop 忘了摘链"是同一类错误：**数据结构的"状态"没变，调用方的循环就永远不会结束**。

### 栈空时读栈顶，读到垃圾值 [WA]
```c
if (s->top >= 0) { ... }   /* 忘了判就直接 *out = s->data[s->top]; */
```
约定 A 下 `top == -1` 时读 `data[-1]`；约定 B 下 `top == 0` 时读 `data[-1]`（`--top` 之后）。空栈检查必须放在所有下标运算之前，而且 `pop`/`peek` 都要有。

### 固定容量写死，输入一大就溢栈 [RE]
```c
int data[100];           /* 题目说最多 10000 个操作 */
```
这类错误在样例上永远看不出来，隐藏用例才会崩。要么按数据范围开够（`10000 + 5`），要么用上面的翻倍扩容。

## 客观题

### q-s7-stack-array-1 single
用 `int data[8]` 实现栈，约定 **`top` 指向下一个空位**（空栈时 `top = 0`，`top` 同时等于元素个数）。下面哪一组 `push` / `pop` 与这个约定一致，并且不会越界？

- [x] `push`：`if (top == 8) return 0; data[top] = v; top++;`；`pop`：`if (top == 0) return 0; top--; *out = data[top];`
  > 正确。写入发生在 `data[top]`（top 是空位，范围 0..7），写完之后 top 才变成新的元素个数；pop 先把 top 减回"最后一个元素的下标"，再取值。判满 `top == 8`、判空 `top == 0`，与约定完全对应。
- [ ] `push`：`data[++top] = v;`；`pop`：`*out = data[top--];`
  > 错。这是**约定 A** 的写法：`++top` 让 top 先变成 1，第一个元素被写进 `data[1]`，`data[0]` 永远空着（浪费一格）；而且空栈时 top 是 0，`data[0]` 是未初始化内存，pop 会读它。更糟的是没有判满，第 8 个元素会写到 `data[8]`——越界。
- [ ] `push`：`data[top++] = v;`；`pop`：`*out = data[top--];`
  > 错。push 是对的，pop 错在顺序：先用 `data[top]` 取的是**下一个空位**（还是未初始化的），然后才减一。于是每次 pop 都返回垃圾值，而真正被压进去的元素永远取不出来；连续 pop 还会一路把 top 减成负数，再判断 `top == 0` 时已经晚了。
- [ ] 两种约定完全等价，只要 push 和 pop 各自"看起来对称"就不会出错
  > 错。两种约定相差一个偏移，`push` 和 `pop` 必须**同属一种**约定。混用的典型后果就是：写进去的位置和读出来的位置差一格，栈里永远少一个/多一个元素。更危险的是这种错误往往"数量对得上"（压几个弹几个），只有值不对，靠肉眼很难发现。
