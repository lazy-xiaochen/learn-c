---json
{
  "id": "p-s7-list-reverse-1",
  "title": "反转链表时的三指针推演：每一步的 prev / cur / next 分别是哪个节点",
  "difficulty": "L4",
  "knowledgePoints": ["s7-list-reverse"],
  "special": "pointer-reasoning",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
三指针反转是链表里最经典的一段代码，也是最容易被"改一行就全乱"的一段：

```c
Node *prev = NULL;
Node *cur = head;
while (cur != NULL) {
    Node *next = cur->next;   /* ① 先存后继 */
    cur->next = prev;         /* ② 掉头 */
    prev = cur;               /* ③ prev 前进 */
    cur = next;               /* ④ cur 前进 */
}
head = prev;
```

请你读入 n 个整数，用 `malloc` 在堆上建一条单链表（**尾插**，保持输入顺序），然后用上面这段代码**原样**反转它。反转过程中，在每一轮循环**刚进入时**（也就是执行任何赋值之前）把三个指针当前指向的节点的值打印出来，最后输出新的表头和反转后的链表。

要求你的程序真的用 `malloc` 建节点、真的按上面四句的顺序反转，并在结束前把每个节点都 `free` 掉。

## 输入格式
第一行一个整数 `n`。
第二行 `n` 个整数，用空格分隔（`n = 0` 时这一行不存在）。

## 输出格式
```
steps=<n>
step <i>: prev=<值|NULL> cur=<值> next=<值|NULL>      （共 n 行，i 从 1 开始）
head=<反转后表头节点的值；n = 0 时输出 NONE>
list=<反转后从头到尾的 n 个值；n = 0 时输出 EMPTY>
```

- `step` 行里的三个值是**这一轮开始时**的 `prev`、`cur`、`next`（`next` 就是 `cur->next` 当时的取值）；
- 指针是空指针时输出字符串 `NULL`，不要输出地址；
- `list` 里相邻两个值之间恰好一个空格，行尾不要多余的空格。

## 数据范围
0 ≤ n ≤ 12
-1000 ≤ 每个值 ≤ 1000（**允许重复**）

n 很小，因为本题的重点是"推演指针"，不是规模。输出最多 15 行。

## 示例
### 示例 1
```in
5
10 20 30 40 50
```
```out
steps=5
step 1: prev=NULL cur=10 next=20
step 2: prev=10 cur=20 next=30
step 3: prev=20 cur=30 next=40
step 4: prev=30 cur=40 next=50
step 5: prev=40 cur=50 next=NULL
head=50
list=50 40 30 20 10
```
> 第 1 轮开始时 `prev` 还没指任何节点（`NULL`），`cur` 是表头 10，`next` 是 20；每轮结束后 `cur` 前进到 `next`。最后一轮 `cur` 是尾节点 50，它的 `next` 是 `NULL`，所以 `next=NULL`；循环结束时 `prev` 指向 50，它就是新的表头。

### 示例 2（边界：只有一个节点）
```in
1
42
```
```out
steps=1
step 1: prev=NULL cur=42 next=NULL
head=42
list=42
```
> 单节点的链表反转后还是它自己：一轮循环就结束，结束时 `prev` 指向 42、`cur` 变成 `NULL`，所以 `head=42`、`list=42`，节点数不变。

## 提示
### 第 1 层
先想清楚每一轮"开始"时三个指针的含义：`prev` 是**已经反转好的那半条链**的表头（第一轮还没有，所以是 `NULL`），`cur` 是**还没处理的第一块**，`next` 是 `cur` 原来的后继。循环一共执行 n 轮，每轮处理一个节点。

### 第 2 层
打印的位置决定了答案：必须放在 `Node *next = cur->next;` **之后**、`cur->next = prev;` **之前**。如果放在掉头之后，`cur->next` 已经是 `prev` 了，`next` 就会打错。四句赋值的顺序不能变，输出顺序也就跟着固定了。

### 第 3 层
`prev` 的初值必须是 `NULL`，`cur` 的初值必须是 `head`；每轮最后 `cur = next`，所以 n 轮之后 `cur` 一定是 `NULL`、`prev` 一定是原来的尾节点（新表头）。空链表（n = 0）时一轮都不会执行，此时 `prev` 仍然是 `NULL`，要输出 `head=NONE` 和 `list=EMPTY`。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

/* 打印一个指针：空指针输出 NULL，否则输出它指向的节点的值 */
static void show(const char *label, const Node *p) {
    if (p == NULL) {
        printf("%s=NULL", label);
    } else {
        printf("%s=%d", label, p->value);
    }
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > 12) {
        return 0;
    }

    Node *head = NULL;
    Node **link = &head;
    for (int i = 0; i < n; i++) {
        int v;
        if (scanf("%d", &v) != 1) {
            return 0;
        }
        Node *node = malloc(sizeof *node);
        if (node == NULL) {
            return 0;
        }
        node->value = v;
        node->next = NULL;
        *link = node;              /* 尾插：link 始终指向"新节点该放的位置" */
        link = &node->next;
    }

    printf("steps=%d\n", n);

    Node *prev = NULL;
    Node *cur = head;
    int step = 0;
    while (cur != NULL) {
        Node *next = cur->next;    /* ① 先存后继 */

        printf("step %d: ", ++step);
        show("prev", prev);
        printf(" ");
        show("cur", cur);
        printf(" ");
        show("next", next);
        printf("\n");

        cur->next = prev;          /* ② 掉头 */
        prev = cur;                /* ③ prev 前进 */
        cur = next;                /* ④ cur 前进 */
    }
    head = prev;                   /* 循环结束时 prev 就是新表头 */

    if (head == NULL) {
        printf("head=NONE\n");
        printf("list=EMPTY\n");
        return 0;
    }

    printf("head=%d\n", head->value);

    printf("list=");
    int first = 1;
    for (const Node *p = head; p != NULL; p = p->next) {
        if (!first) {
            printf(" ");
        }
        printf("%d", p->value);
        first = 0;
    }
    printf("\n");

    while (head != NULL) {
        Node *next = head->next;
        free(head);
        head = next;
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

static void show(const char *label, const Node *p) {
    if (p == NULL) {
        printf("%s=NULL", label);
    } else {
        printf("%s=%d", label, p->value);
    }
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > 12) {
        return 0;
    }

    Node *head = NULL;
    Node **link = &head;
    for (int i = 0; i < n; i++) {
        int v;
        if (scanf("%d", &v) != 1) {
            return 0;
        }
        Node *node = malloc(sizeof *node);
        if (node == NULL) {
            return 0;
        }
        node->value = v;
        node->next = NULL;
        *link = node;
        link = &node->next;
    }

    printf("steps=%d\n", n);

    /* TODO: 用 prev / cur / next 三指针反转，
       并在每轮开始时打印 step i: prev=… cur=… next=… */
    printf("head=%d\n", head == NULL ? 0 : head->value);
    printf("list=EMPTY\n");
    return 0;
}
```

## 复杂度
建表和反转各扫一遍链表，时间 O(n)；空间 O(n)（n 个节点），三指针本身是 O(1)。
n ≤ 12，任何写法都能轻松通过，重点是推演正确。

## 常见错误
### 先掉头、再存后继 [WA]
```c
cur->next = prev;         /* 错：先改写了 cur->next */
Node *next = cur->next;   /* 现在读到的是 prev，不是原来的后继 */
```
第二步读到的 `prev` 会让 `cur` 往回走：第 1 轮之后 `cur` 就停在原地（`prev` 一开始是 `NULL` 则直接结束），`step` 行只输出一两行，`list` 也完全不对。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

static void show(const char *label, const Node *p) {
    if (p == NULL) {
        printf("%s=NULL", label);
    } else {
        printf("%s=%d", label, p->value);
    }
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > 12) {
        return 0;
    }

    Node *head = NULL;
    Node **link = &head;
    for (int i = 0; i < n; i++) {
        int v;
        if (scanf("%d", &v) != 1) {
            return 0;
        }
        Node *node = malloc(sizeof *node);
        if (node == NULL) {
            return 0;
        }
        node->value = v;
        node->next = NULL;
        *link = node;
        link = &node->next;
    }

    printf("steps=%d\n", n);

    Node *prev = NULL;
    Node *cur = head;
    int step = 0;
    while (cur != NULL) {
        cur->next = prev;          /* 错：先掉头 */
        Node *next = cur->next;    /* 读到的是 prev */
        printf("step %d: ", ++step);
        show("prev", prev);
        printf(" ");
        show("cur", cur);
        printf(" ");
        show("next", next);
        printf("\n");
        prev = cur;
        cur = next;
    }
    head = prev;

    if (head == NULL) {
        printf("head=NONE\n");
        printf("list=EMPTY\n");
        return 0;
    }
    printf("head=%d\n", head->value);
    printf("list=");
    int first = 1;
    for (const Node *p = head; p != NULL; p = p->next) {
        if (!first) {
            printf(" ");
        }
        printf("%d", p->value);
        first = 0;
    }
    printf("\n");
    return 0;
}
```

### 反转完仍然输出原来的 head [WA]
`head` 这个变量从头到尾没有变过，反转后它指向的是**原来的第一个节点**（现在的尾节点）。如果最后打印 `head->value`，你会得到第一个输入值，而正确答案是最后一个输入值。**新表头是 `prev`**，必须写 `head = prev;` 之后再输出。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

static void show(const char *label, const Node *p) {
    if (p == NULL) {
        printf("%s=NULL", label);
    } else {
        printf("%s=%d", label, p->value);
    }
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > 12) {
        return 0;
    }

    Node *head = NULL;
    Node **link = &head;
    for (int i = 0; i < n; i++) {
        int v;
        if (scanf("%d", &v) != 1) {
            return 0;
        }
        Node *node = malloc(sizeof *node);
        if (node == NULL) {
            return 0;
        }
        node->value = v;
        node->next = NULL;
        *link = node;
        link = &node->next;
    }

    printf("steps=%d\n", n);

    Node *prev = NULL;
    Node *cur = head;
    int step = 0;
    while (cur != NULL) {
        Node *next = cur->next;
        printf("step %d: ", ++step);
        show("prev", prev);
        printf(" ");
        show("cur", cur);
        printf(" ");
        show("next", next);
        printf("\n");
        cur->next = prev;
        prev = cur;
        cur = next;
    }
    /* 错：没有 head = prev; 后面仍然用旧的 head */

    printf("head=%d\n", head->value);
    printf("list=");
    int first = 1;
    for (const Node *p = head; p != NULL; p = p->next) {
        if (!first) {
            printf(" ");
        }
        printf("%d", p->value);
        first = 0;
    }
    printf("\n");
    return 0;
}
```

### 三指针初值写成 prev = head [WA]
`prev` 的含义是"已经反转好的那半条链的表头"，一开始一个节点都没反转，它必须是 `NULL`。写成 `prev = head` 之后，第一轮就把表头节点的 `next` 指向了它自己；循环虽然能走完（因为 `next` 是提前存好的），但表头节点上出现了一个自环，最后遍历 `list` 时会永远在环上打转，输出不断增长直到撞上 64KB 的输出上限（判 `WA`，原因写着"输出超过上限"）。空链表时还会因为 `prev = head = NULL` 而直接解引用空指针。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

static void show(const char *label, const Node *p) {
    if (p == NULL) {
        printf("%s=NULL", label);
    } else {
        printf("%s=%d", label, p->value);
    }
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > 12) {
        return 0;
    }

    Node *head = NULL;
    Node **link = &head;
    for (int i = 0; i < n; i++) {
        int v;
        if (scanf("%d", &v) != 1) {
            return 0;
        }
        Node *node = malloc(sizeof *node);
        if (node == NULL) {
            return 0;
        }
        node->value = v;
        node->next = NULL;
        *link = node;
        link = &node->next;
    }

    printf("steps=%d\n", n);

    Node *prev = head;             /* 错：prev 必须是 NULL */
    Node *cur = head;
    int step = 0;
    while (cur != NULL) {
        Node *next = cur->next;
        printf("step %d: ", ++step);
        show("prev", prev);
        printf(" ");
        show("cur", cur);
        printf(" ");
        show("next", next);
        printf("\n");
        cur->next = prev;
        prev = cur;
        cur = next;
    }
    head = prev;

    printf("head=%d\n", head->value);
    printf("list=");
    int first = 1;
    for (const Node *p = head; p != NULL; p = p->next) {   /* 自环：永远停不下来 */
        if (!first) {
            printf(" ");
        }
        printf("%d", p->value);
        first = 0;
    }
    printf("\n");
    return 0;
}
```

### 输出的是"改完之后"的 next [WA]
`next` 只在 `cur->next = prev;` 之前有意义。如果先把三句赋值都做完，再打印 `cur->next`，看到的其实是 `prev`（已经掉头了）。本题要求的是**每轮开始时**的三个值，打印语句的位置必须卡在 `Node *next = cur->next;` 与 `cur->next = prev;` 之间。

### 空链表没有单独处理 [RE]
`n = 0` 时 `head` 是 `NULL`，如果直接 `printf("head=%d", head->value);` 就是空指针解引用，判 `RE`。空表和单节点是这类题必测的边界。

## 测试用例
### 01 sample 示例 1
```in
5
10 20 30 40 50
```
```out
steps=5
step 1: prev=NULL cur=10 next=20
step 2: prev=10 cur=20 next=30
step 3: prev=20 cur=30 next=40
step 4: prev=30 cur=40 next=50
step 5: prev=40 cur=50 next=NULL
head=50
list=50 40 30 20 10
```

### 02 sample 示例 2
```in
1
42
```
```out
steps=1
step 1: prev=NULL cur=42 next=NULL
head=42
list=42
```

### 03 degenerate 空链表，一轮都不循环
```in
0
```
```out
steps=0
head=NONE
list=EMPTY
```

### 04 trap 三个相同的值，靠 step 行区分指针位置
```in
3
7 7 7
```
```out
steps=3
step 1: prev=NULL cur=7 next=7
step 2: prev=7 cur=7 next=7
step 3: prev=7 cur=7 next=NULL
head=7
list=7 7 7
```

### 05 trap 含负数，NULL 与 -1 不能混淆
```in
4
-1 -2 -3 -4
```
```out
steps=4
step 1: prev=NULL cur=-1 next=-2
step 2: prev=-1 cur=-2 next=-3
step 3: prev=-2 cur=-3 next=-4
step 4: prev=-3 cur=-4 next=NULL
head=-4
list=-4 -3 -2 -1
```

### 06 normal 两个节点，恰好交换一次
```in
2
100 200
```
```out
steps=2
step 1: prev=NULL cur=100 next=200
step 2: prev=100 cur=200 next=NULL
head=200
list=200 100
```

### 生成 boundary 十二个节点的最长链表
```js gen
const cases = [];

function render(values) {
  const n = values.length;
  const lines = [`steps=${n}`];
  let prev = null;
  let cur = 0;
  while (cur < n) {
    const next = cur + 1 < n ? cur + 1 : null;
    const name = (i) => (i === null ? 'NULL' : String(values[i]));
    lines.push(`step ${cur + 1}: prev=${name(prev)} cur=${name(cur)} next=${name(next)}`);
    prev = cur;
    cur = next === null ? n : next;
  }
  const reversed = values.slice().reverse();
  lines.push(reversed.length ? `head=${reversed[0]}` : 'head=NONE');
  lines.push(reversed.length ? `list=${reversed.join(' ')}` : 'list=EMPTY');
  return lines.join('\n') + '\n';
}

/* 12 个递减的值 */
{
  const values = [];
  for (let i = 0; i < 12; i++) values.push(1000 - i * 50);
  cases.push({
    kind: 'boundary',
    category: '12 个节点，最长链表',
    input: `${values.length}\n${values.join(' ')}\n`,
    output: render(values),
  });
}

return cases;
```

### 生成 normal 七个节点，含重复与负数
```js gen
const cases = [];

function render(values) {
  const n = values.length;
  const lines = [`steps=${n}`];
  let prev = null;
  let cur = 0;
  while (cur < n) {
    const next = cur + 1 < n ? cur + 1 : null;
    const name = (i) => (i === null ? 'NULL' : String(values[i]));
    lines.push(`step ${cur + 1}: prev=${name(prev)} cur=${name(cur)} next=${name(next)}`);
    prev = cur;
    cur = next === null ? n : next;
  }
  const reversed = values.slice().reverse();
  lines.push(reversed.length ? `head=${reversed[0]}` : 'head=NONE');
  lines.push(reversed.length ? `list=${reversed.join(' ')}` : 'list=EMPTY');
  return lines.join('\n') + '\n';
}

/* 7 个值，含重复与负数 */
{
  const values = [5, -3, 5, 0, -3, 8, 1];
  cases.push({
    kind: 'normal',
    category: '7 个含重复与负数的值',
    input: `${values.length}\n${values.join(' ')}\n`,
    output: render(values),
  });
}

return cases;
```
