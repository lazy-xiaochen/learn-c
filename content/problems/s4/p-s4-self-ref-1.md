---json
{
  "id": "p-s4-self-ref-1",
  "title": "静态节点池上的链表：长度、求和、查找与就地反转",
  "difficulty": "L3",
  "knowledgePoints": ["s4-self-ref"],
  "special": "ds-implementation",
  "judge": { "mode": "function", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
本题练习用**自引用结构体**组织链表。测试驱动会准备一个静态的节点池，把读入的 `n` 个值串成一条单链表，然后调用你实现的四个函数：

```c
int list_length(const struct Node *head);          /* 返回节点个数 */
long long list_sum(const struct Node *head);       /* 返回所有 value 之和 */
struct Node *list_find(struct Node *head, int value); /* 返回第一个值为 value 的节点，找不到返回 NULL */
struct Node *list_reverse(struct Node *head);      /* 就地反转链表，返回新的头节点 */
```

你只需要在 `solution.c` 中实现这四个函数，不需要写 `main`，也不允许使用 `malloc`/`calloc`/`realloc`/`free`。节点空间由测试驱动的静态数组 `pool[]` 提供；你的函数只能修改 `next` 指针，不能创建或销毁节点。

`list.h` 中已经给出结构体和函数声明：

```c
struct Node {
    int value;
    struct Node *next;
};
```

请特别注意 `list_reverse`：它必须**就地**把每个节点的 `next` 掉头，最后返回原来的尾节点；不能新建节点，也不能只返回原来的头。

## 输入格式
（由隐藏的测试驱动读取，供你理解测试方式）

第一行一个整数 `n`。
第二行 `n` 个整数，依次是链表中每个节点的 `value`。
第三行一个整数 `target`，表示要查找的值。

## 输出格式
（由隐藏的测试驱动输出）共五行：

```
length=<调用 list_length 的结果>
sum=<调用 list_sum 的结果>
find=<target 第一次出现的下标，找不到输出 none>
reversed=<反转后从头到尾的 value，用单个空格分隔>
length_after=<反转后再次调用 list_length 的结果>
```

下标从 0 开始；链表为空的情况不会出现（`n ≥ 1`）。

## 数据范围
1 ≤ n ≤ 1000
-1000 ≤ value ≤ 10⁹
-1000 ≤ target ≤ 10⁹

所有 `value` 之和最大可达 1000 × 10⁹ = 10¹²，超过 `int` 的范围，**`list_sum` 必须用 `long long` 累加**。`int` 累加会在隐藏用例上溢出（未定义行为）。

## 示例
### 示例 1
```in
5
10 20 30 20 50
20
```
```out
length=5
sum=130
find=1
reversed=50 20 30 20 10
length_after=5
```
> 链表是 `10 → 20 → 30 → 20 → 50`。`20` 第一次出现在下标 1，所以 `find=1`；反转后是 `50 → 20 → 30 → 20 → 10`，长度仍然是 5。

### 示例 2（边界：只有一个节点，且找不到 target）
```in
1
42
7
```
```out
length=1
sum=42
find=none
reversed=42
length_after=1
```
> 只有一个节点时，反转后头节点还是它自己，`next` 仍然是 `NULL`。查找 `7` 失败，输出 `none`。

## 提示
### 第 1 层
四个函数都可以用同一种遍历骨架：

```c
for (const struct Node *p = head; p != NULL; p = p->next) {
    /* 处理 p->value */
}
```

先确认 `p != NULL` 再解引用，不要写成 `p->next != NULL`，否则会漏掉尾节点。

### 第 2 层
`list_length` 用一个计数器；`list_sum` 用 `long long total`；`list_find` 找到第一个相等的节点就 `return p`，循环结束还没找到才 `return NULL`。`list_reverse` 用三个指针：`prev`、`cur`、`next`，每次先把 `cur->next` 存到 `next`，再让 `cur->next = prev`，最后整体前移。

### 第 3 层
反转的循环可以写成：

```c
struct Node *prev = NULL;
while (head != NULL) {
    struct Node *next = head->next;
    head->next = prev;
    prev = head;
    head = next;
}
return prev;
```

循环结束时 `prev` 是新的头节点，原来的头节点变成了尾节点，它的 `next` 已经是 `NULL`。不要忘记返回 `prev`，也不要返回已经变成 `NULL` 的 `head`。

## 参考代码
```c file=solution.c
#include "list.h"

int list_length(const struct Node *head) {
    int count = 0;
    for (const struct Node *p = head; p != NULL; p = p->next) {
        count++;
    }
    return count;
}

long long list_sum(const struct Node *head) {
    long long total = 0;              /* 最大 10^12，必须用 long long */
    for (const struct Node *p = head; p != NULL; p = p->next) {
        total += p->value;
    }
    return total;
}

struct Node *list_find(struct Node *head, int value) {
    for (struct Node *p = head; p != NULL; p = p->next) {
        if (p->value == value) {
            return p;                 /* 第一个匹配的节点 */
        }
    }
    return NULL;
}

struct Node *list_reverse(struct Node *head) {
    struct Node *prev = NULL;
    struct Node *cur = head;
    while (cur != NULL) {
        struct Node *next = cur->next;   /* 先保存原来的下一个节点 */
        cur->next = prev;                /* 掉头 */
        prev = cur;
        cur = next;
    }
    return prev;                         /* 原来的尾节点成为新头 */
}
```

## 初始代码
```c file=solution.c
#include "list.h"

int list_length(const struct Node *head) {
    (void)head;
    return 0;
}

long long list_sum(const struct Node *head) {
    (void)head;
    return 0;
}

struct Node *list_find(struct Node *head, int value) {
    (void)head;
    (void)value;
    return NULL;
}

struct Node *list_reverse(struct Node *head) {
    return head;
}
```

## 测试驱动
```c file=list.h
#ifndef LIST_H
#define LIST_H

#include <stddef.h>

struct Node {
    int value;
    struct Node *next;
};

int list_length(const struct Node *head);
long long list_sum(const struct Node *head);
struct Node *list_find(struct Node *head, int value);
struct Node *list_reverse(struct Node *head);

#endif
```

```c file=harness.c hidden
#include <stdio.h>
#include "list.h"

#define MAXN 1000

static struct Node pool[MAXN];

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }

    for (int i = 0; i < n; i++) {
        if (scanf("%d", &pool[i].value) != 1) {
            return 0;
        }
        pool[i].next = (i + 1 < n) ? &pool[i + 1] : NULL;
    }

    struct Node *head = &pool[0];
    printf("length=%d\n", list_length(head));
    printf("sum=%lld\n", list_sum(head));

    int target;
    if (scanf("%d", &target) != 1) {
        return 0;
    }
    struct Node *hit = list_find(head, target);
    if (hit == NULL) {
        printf("find=none\n");
    } else {
        int index = 0;
        for (struct Node *p = head; p != NULL && p != hit; p = p->next) {
            index++;
        }
        printf("find=%d\n", index);
    }

    head = list_reverse(head);
    printf("reversed=");
    for (struct Node *p = head; p != NULL; p = p->next) {
        printf("%s%d", p == head ? "" : " ", p->value);
    }
    printf("\n");
    printf("length_after=%d\n", list_length(head));
    return 0;
}
```

## 复杂度
四个函数都是 O(n) 时间、O(1) 额外空间；反转只修改 `next` 指针，不需要额外的节点数组。

## 常见错误
### 用 int 累加总和 [UB]
`list_sum` 的返回类型是 `long long`，但如果累加变量写成 `int`，中间结果会先按 32 位溢出。1000 个 10⁹ 相加是 10¹²，远超 `int` 的 2147483647。有符号整数溢出是未定义行为，本平台的 UBSan 会报 `signed integer overflow` 并判 `UB`。**返回类型不会自动把中间结果提升成 64 位**，累加变量本身必须是 `long long`。

```c file=solution.c expect=UB
#include "list.h"

int list_length(const struct Node *head) {
    int count = 0;
    for (const struct Node *p = head; p != NULL; p = p->next) {
        count++;
    }
    return count;
}

long long list_sum(const struct Node *head) {
    int total = 0;                    /* 错：10^12 装不进 int */
    for (const struct Node *p = head; p != NULL; p = p->next) {
        total += p->value;
    }
    return (long long)total;
}

struct Node *list_find(struct Node *head, int value) {
    for (struct Node *p = head; p != NULL; p = p->next) {
        if (p->value == value) {
            return p;
        }
    }
    return NULL;
}

struct Node *list_reverse(struct Node *head) {
    struct Node *prev = NULL;
    struct Node *cur = head;
    while (cur != NULL) {
        struct Node *next = cur->next;
        cur->next = prev;
        prev = cur;
        cur = next;
    }
    return prev;
}
```

### 反转时先改 next 再读它，链表被截断 [WA]
如果循环写成 `head->next = prev; prev = head; head = head->next;`，第三步读到的 `head->next` 已经是 `prev`，原来的后续节点全部丢失。长度为 1 的链表看不出问题，长度 ≥ 2 时 `reversed` 只剩一个节点，`length_after` 也会变成 1。正确顺序是先把 `cur->next` 存进临时变量，再改 `cur->next`。

```c file=solution.c expect=WA
#include "list.h"

int list_length(const struct Node *head) {
    int count = 0;
    for (const struct Node *p = head; p != NULL; p = p->next) {
        count++;
    }
    return count;
}

long long list_sum(const struct Node *head) {
    long long total = 0;
    for (const struct Node *p = head; p != NULL; p = p->next) {
        total += p->value;
    }
    return total;
}

struct Node *list_find(struct Node *head, int value) {
    for (struct Node *p = head; p != NULL; p = p->next) {
        if (p->value == value) {
            return p;
        }
    }
    return NULL;
}

struct Node *list_reverse(struct Node *head) {
    struct Node *prev = NULL;
    while (head != NULL) {
        head->next = prev;          /* 错：先把 next 改掉了 */
        prev = head;
        head = head->next;          /* 这里读到的已经是 prev，链表断裂 */
    }
    return prev;
}
```

### 长度循环写成 `p->next != NULL`，漏掉尾节点 [WA]
`for (p = head; p->next != NULL; p = p->next)` 在尾节点处条件为假，尾节点不会被计数。长度为 1 的链表会返回 0，长度为 n 的链表会返回 n - 1。正确写法是 `p != NULL`，让循环在 `p` 走到 `NULL` 时自然结束。

```c file=solution.c expect=WA
#include "list.h"

int list_length(const struct Node *head) {
    int count = 0;
    for (const struct Node *p = head; p->next != NULL; p = p->next) {
        count++;
    }
    return count;
}

long long list_sum(const struct Node *head) {
    long long total = 0;
    for (const struct Node *p = head; p != NULL; p = p->next) {
        total += p->value;
    }
    return total;
}

struct Node *list_find(struct Node *head, int value) {
    for (struct Node *p = head; p != NULL; p = p->next) {
        if (p->value == value) {
            return p;
        }
    }
    return NULL;
}

struct Node *list_reverse(struct Node *head) {
    struct Node *prev = NULL;
    struct Node *cur = head;
    while (cur != NULL) {
        struct Node *next = cur->next;
        cur->next = prev;
        prev = cur;
        cur = next;
    }
    return prev;
}
```

### 查找返回最后一个匹配节点 [WA]
如果循环里不立即返回，而是用 `found = p` 一路记录，最后返回 `found`，那么有重复值时得到的是最后一个匹配节点，而题目要求第一个。找到相等节点就应当立刻 `return p;`。

## 测试用例
### 01 sample 示例 1
```in
5
10 20 30 20 50
20
```
```out
length=5
sum=130
find=1
reversed=50 20 30 20 10
length_after=5
```

### 02 sample 示例 2
```in
1
42
7
```
```out
length=1
sum=42
find=none
reversed=42
length_after=1
```

### 03 degenerate 只有两个相同值
```in
2
5 5
5
```
```out
length=2
sum=10
find=0
reversed=5 5
length_after=2
```

### 04 trap 重复值要返回第一次出现的下标
```in
4
7 7 9 7
7
```
```out
length=4
sum=30
find=0
reversed=7 9 7 7
length_after=4
```

### 05 trap 目标不存在，且值为负数
```in
3
-5 10 -15
100
```
```out
length=3
sum=-10
find=none
reversed=-15 10 -5
length_after=3
```

### 06 boundary 三个 10 亿，总和超过 int
```in
3
1000000000 1000000000 1000000000
-1
```
```out
length=3
sum=3000000000
find=none
reversed=1000000000 1000000000 1000000000
length_after=3
```

### 07 trap 偶数个节点的反转
```in
6
1 2 3 4 5 6
4
```
```out
length=6
sum=21
find=3
reversed=6 5 4 3 2 1
length_after=6
```

### 08 normal 带重复值和负数
```in
5
-2 0 4 0 9
0
```
```out
length=5
sum=11
find=1
reversed=9 0 4 0 -2
length_after=5
```

### 生成 boundary 1000 个节点、总和 5×10¹¹
```js gen
const n = 1000;
const values = [];
let sum = 0;
for (let i = 0; i < n; i++) {
  const v = (i + 1) * 1000000;
  values.push(v);
  sum += v;
}
const target = 500000000;   // 第 499 个节点的值，下标 499
const reversed = values.slice().reverse();
return [{
  kind: 'boundary',
  category: '1000 个节点，总和 5×10^11',
  input: `${n}\n${values.join(' ')}\n${target}\n`,
  output: `length=${n}\nsum=${sum}\nfind=499\nreversed=${reversed.join(' ')}\nlength_after=${n}\n`,
}];
```
