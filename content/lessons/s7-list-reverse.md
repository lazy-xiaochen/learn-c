---
id: s7-list-reverse
---

## 讲解

### 反转到底在改什么
链表反转不改任何 `value`，也不搬动任何节点——它只做一件事：**把每个节点的 `next` 从"指向后一个"改成"指向前一个"**。原来 `10 → 20 → 30 → NULL`，反转后要求 `30 → 20 → 10 → NULL`。三个节点的 `value` 一个都没变，变的是三根 `next` 指针的方向。

这就带来两个必须面对的问题：

1. 一根 `next` 一旦被改写，**原来的后继就找不回来了**。所以改写之前必须先把后继存进一个临时指针。
2. 新的一头一尾要接对：原来的头节点必须变成尾节点（`next = NULL`），原来的尾节点必须变成新的表头。

第二点决定了函数的返回值：新表头不是参数 `head`，而是原来的尾节点。谁在循环结束时"记得"尾节点？正是那个一路往前挪的 `prev`。

### 为什么必须三个指针
只用两个指针（`prev` 和 `cur`）看起来够了：`cur->next = prev` 不就把方向掉过来了吗？问题在于下一轮：

- 这一轮结束后 `cur` 必须前进到"原来的下一个节点"；
- 而"原来的下一个节点"的地址，恰好就在你刚刚覆盖掉的那个 `cur->next` 里。

也就是说，**改写 `cur->next` 的那一刻，通向剩余链表的唯一线索被抹掉了**。所以必须在改写之前把 `cur->next` 存进第三个指针 `next`：

| 指针 | 含义 | 生命期 |
|---|---|---|
| `prev` | 已经反转好的那半条链的**表头**（也是下一轮要接上去的"前驱"） | 跨迭代保留 |
| `cur` | 还没处理的第一块 | 跨迭代保留 |
| `next` | `cur` 原来的后继，只用来把 `cur` 往前推一格 | **每轮重新算** |

这里的"三"不是神秘数字，而是**同时需要记住的信息量**：前驱（往哪指）、当前（改谁）、后继（接下来去哪）。少一个，要么改不了方向，要么丢了后面的链表。

### 四步的顺序为什么不能变
正确的循环体是这四句，顺序是**唯一正确**的一种：

```c
Node *next = cur->next;   /* ① 先存后继：此后才敢动 cur->next */
cur->next = prev;         /* ② 掉头：让 cur 指回前驱 */
prev = cur;               /* ③ prev 前进到 cur（它成了新表头） */
cur = next;               /* ④ cur 前进到原来后面那个 */
```

- ①必须最先：它是"备份"，备份完才能破坏。
- ②必须在③之前：如果先 `prev = cur`，再 `cur->next = prev`，就是把 `cur->next` 指向自己——自环。
- ③必须在④之前：`cur = next` 之后再 `prev = cur`，`prev` 会跳过一个节点。
- ④必须最后：它是"推进"，一旦推进，`cur` 就不再指向刚处理的那个节点了。

下面把每一步的 `prev / cur / next` 都打印出来，注意 `prev` 从头到尾只会往后走，而 `cur` 走完就变成 `NULL`：

```c run id=lr-three-pointers
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

static void show(const char *label, const Node *p) {
    if (p == NULL) {
        printf("%s=NULL ", label);
    } else {
        printf("%s=%d ", label, p->value);
    }
}

/* 三指针迭代反转：返回新的表头 */
static Node *reverse(Node *head) {
    Node *prev = NULL;
    Node *cur = head;
    int step = 0;
    while (cur != NULL) {
        Node *next = cur->next;          /* ① 先存后继 */
        printf("第 %d 步：", ++step);
        show("prev", prev);
        show("cur", cur);
        show("next", next);
        printf("\n");
        cur->next = prev;                /* ② 掉头 */
        prev = cur;                      /* ③ prev 前进 */
        cur = next;                      /* ④ cur 前进 */
    }
    return prev;                         /* 循环结束时 prev 就是原来的尾节点 */
}

static int append(Node **head, int value) {
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->value = value;
    node->next = NULL;
    Node **link = head;
    while (*link != NULL) {
        link = &(*link)->next;
    }
    *link = node;
    return 1;
}

static void print_list(const char *label, const Node *head) {
    printf("%s", label);
    for (const Node *p = head; p != NULL; p = p->next) {
        if (p != head) {
            printf(" -> ");
        }
        printf("%d", p->value);
    }
    printf("\n");
}

int main(void) {
    Node *head = NULL;
    for (int v = 10; v <= 50; v += 10) {
        if (!append(&head, v)) {
            return 0;
        }
    }
    print_list("反转前：", head);

    head = reverse(head);
    print_list("反转后：", head);
    printf("新表头是 %d\n", head->value);

    int freed = 0;
    while (head != NULL) {
        Node *next = head->next;
        free(head);
        head = next;
        freed++;
    }
    printf("释放了 %d 个节点\n", freed);
    return 0;
}
```
```output
反转前：10 -> 20 -> 30 -> 40 -> 50
第 1 步：prev=NULL cur=10 next=20
第 2 步：prev=10 cur=20 next=30
第 3 步：prev=20 cur=30 next=40
第 4 步：prev=30 cur=40 next=50
第 5 步：prev=40 cur=50 next=NULL
反转后：50 -> 40 -> 30 -> 20 -> 10
新表头是 50
释放了 5 个节点
```

注意第 5 步：`cur` 是原来的尾节点，它的 `next` 是 `NULL`，所以 `next=NULL`。这一轮结束后 `prev` 指向它、`cur` 变成 `NULL`，循环停止，`prev` 正好是新的表头——**循环结束时的 `prev` 就是答案**，不需要再判断谁是新头。

### 反转过程中的内存图
以 `10 → 20 → 30 → 40` 为例，走到"第 2 步结束"时，链表在内存里已经是**两段**了：

```memory title="反转进行到第 2 步结束：前半段已掉头，后半段还没动（地址为示意）"
节点（示意） | value | next 指向 | 变量 | 说明
A | 10 | NULL |  | 已经掉头：原来的表头变成了这一段的尾节点
B | 20 | A | prev | 已反转部分的表头，下一轮要接到 30 的 next 上
C | 30 | D | cur | 还没处理的第一块
D | 40 | NULL |  | 还没处理的尾节点
```

这张图解释了为什么不能"边遍历边反转"：在任意时刻，链表都被切成"已反转"和"未反转"两部分，`prev` 指向前半段的头、`cur` 指向后半段的头，两者之间**暂时没有连接**。第②句 `cur->next = prev` 就是把这个缺口焊上的动作，焊接方向从 `cur` 指向 `prev`，于是前半段的头节点（A）从"被指向"变成了"指向 NULL"。

### 递归反转：把"反转"定义成"反转剩下的，再把自己接回去"
迭代是"从前往后推"，递归是"先钻到底、再往回接"。递归版本只有三行，但每一行都不能少：

```c run id=lr-recursive
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

/* 递归反转：返回新的表头 */
static Node *reverse_rec(Node *head) {
    if (head == NULL || head->next == NULL) {
        return head;                    /* 空表或只有一个节点：它自己就是答案 */
    }
    Node *new_head = reverse_rec(head->next);  /* 先把后面的整条链反转好 */
    head->next->next = head;            /* 让"我后面的那个节点"回头指向我 */
    head->next = NULL;                  /* 我变成当前这一段的尾节点 */
    return new_head;
}

static int append(Node **head, int value) {
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->value = value;
    node->next = NULL;
    Node **link = head;
    while (*link != NULL) {
        link = &(*link)->next;
    }
    *link = node;
    return 1;
}

static void print_list(const char *label, const Node *head) {
    printf("%s", label);
    for (const Node *p = head; p != NULL; p = p->next) {
        if (p != head) {
            printf(" -> ");
        }
        printf("%d", p->value);
    }
    printf("\n");
}

int main(void) {
    Node *head = NULL;
    for (int v = 1; v <= 6; v++) {
        if (!append(&head, v)) {
            return 0;
        }
    }
    print_list("反转前：", head);

    head = reverse_rec(head);
    print_list("反转后：", head);
    printf("新表头是 %d\n", head->value);

    int freed = 0;
    while (head != NULL) {
        Node *next = head->next;
        free(head);
        head = next;
        freed++;
    }
    printf("释放了 %d 个节点\n", freed);
    return 0;
}
```
```output
反转前：1 -> 2 -> 3 -> 4 -> 5 -> 6
反转后：6 -> 5 -> 4 -> 3 -> 2 -> 1
新表头是 6
释放了 6 个节点
```

递归版的三行对应迭代版的三个动作：

- `head->next->next = head;` 是掉头（等价于 `cur->next = prev`）；
- `head->next = NULL;` 是把"我"变成尾节点——**漏了这一句就会形成环**，因为原来的头节点还指着第二个节点，而第二个节点现在指着它；
- `return new_head;` 把最底层的尾节点一路传回来，等价于迭代版最后返回的 `prev`。

递归的代价是 n 层函数调用（每层一个栈帧），n 很大时会栈溢出；本平台给了 64MB 栈，但也只是把上限推远，没有消除。链表很长时优先用迭代。

### 快慢指针：一次遍历拿到中点和判断有没有环
反转本身只用到"一个方向"，但链表还有一类技巧只靠"走两步 vs 走一步"：两个指针同时从表头出发，`fast` 每次走两个节点，`slow` 每次走一个。等 `fast` 走到末尾，`slow` 恰好在中点；如果链表中存在环，`fast` 会永远绕圈，并且**一定会在某一刻与 `slow` 相遇**。

```c run id=lr-fast-slow
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

/* 快指针走两步、慢指针走一步；fast 走不动时 slow 就是中点（偶数个节点时取后一个） */
static const Node *middle(const Node *head) {
    const Node *slow = head;
    const Node *fast = head;
    while (fast != NULL && fast->next != NULL) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;
}

/* 有环返回 1：只要有环，快指针一定会在环里追上慢指针 */
static int has_cycle(const Node *head) {
    const Node *slow = head;
    const Node *fast = head;
    while (fast != NULL && fast->next != NULL) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {
            return 1;
        }
    }
    return 0;
}

static int append(Node **head, int value) {
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->value = value;
    node->next = NULL;
    Node **link = head;
    while (*link != NULL) {
        link = &(*link)->next;
    }
    *link = node;
    return 1;
}

static int free_all(Node *head) {
    int freed = 0;
    while (head != NULL) {
        Node *next = head->next;
        free(head);
        head = next;
        freed++;
    }
    return freed;
}

int main(void) {
    Node *head = NULL;
    for (int v = 1; v <= 7; v++) {
        if (!append(&head, v)) {
            return 0;
        }
    }
    printf("1..7 的中点：%d\n", middle(head)->value);
    int freed = free_all(head);

    Node *ring = NULL;
    for (int v = 1; v <= 5; v++) {
        if (!append(&ring, v)) {
            return 0;
        }
    }
    Node *tail = ring;
    while (tail->next != NULL) {
        tail = tail->next;
    }
    tail->next = ring->next;             /* 尾节点指回第 2 个节点：形成环 */

    printf("1..5 造环之后：has_cycle=%d\n", has_cycle(ring));
    tail->next = NULL;                   /* 断环：否则 free 会永远绕圈 */
    printf("断环之后：has_cycle=%d\n", has_cycle(ring));

    freed += free_all(ring);
    printf("累计释放了 %d 个节点\n", freed);
    return 0;
}
```
```output
1..7 的中点：4
1..5 造环之后：has_cycle=1
断环之后：has_cycle=0
累计释放了 12 个节点
```

7 个节点的中点是第 4 个，这符合"`fast` 走到末尾时 `slow` 走了一半"。判环和找中点的代码骨架几乎一样，区别只在循环里那一次 `if (slow == fast)`——这也是链表题里"同一套双指针骨架解决多个问题"的典型例子。另外，`has_cycle` 返回真时**不能直接销毁链表**，必须先断环，否则 `free` 循环会绕回已释放的节点（use-after-free）。

### 合并两条有序链表：反转的近亲
"合并两个有序链表"同样只改指针、不建新节点。用两个指针各指一条链的头，每次挑小的那个接到结果链的尾部，最后把没走完的那条整段接上：

```c
/* 归并：两条升序链 → 一条升序链，节点全部复用，不 malloc */
Node *merge(Node *a, Node *b) {
    Node dummy;                 /* 哨兵节点：省掉"结果还空着"的特判 */
    Node *tail = &dummy;
    dummy.next = NULL;
    while (a != NULL && b != NULL) {
        if (a->value <= b->value) {
            tail->next = a;
            a = a->next;
        } else {
            tail->next = b;
            b = b->next;
        }
        tail = tail->next;
    }
    tail->next = (a != NULL) ? a : b;
    return dummy.next;
}
```

注意 `<=` 保证了**稳定性**（相等时先取 a 的节点）；如果写成 `<`，相等元素会来自 b，顺序就反了。哨兵 `dummy` 放在栈上，它的 `next` 指向堆上的结果链，函数返回后 `dummy` 消失、结果链完好——这也再次说明"链表节点必须在堆上，而临时哨兵可以在栈上"。

## 编译与运行

用 gcc 或 clang 编译，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra reverse.c -o reverse
./reverse
```

```bash
clang -std=c17 -Wall -Wextra reverse.c -o reverse
./reverse
```

链表反转是最容易写出"自环"或"丢链"的地方，强烈建议开内存检查器跑一遍：

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=address reverse.c -o reverse
./reverse
```

开了 ASan 之后：

- 丢链导致的泄漏不会崩，但会在进程结束时报告"分配于 reverse.c 第 N 行"；
- 自环导致的死循环会先撞上判题的时间上限（`TLE`），本平台上就是 1 秒 CPU；
- `free` 一个已经释放的节点会立刻被判 `RE`，并给出 `double-free` 的调用栈。

想只看注释掉的代码有没有编译问题，可以只做语法检查：

```bash
clang -std=c17 -Wall -Wextra -fsyntax-only reverse.c
```

## 常见错误

### 先掉头再存后继，后半条链直接丢掉 [WA]
```c
cur->next = prev;          /* 错：先改写了 cur->next */
Node *next = cur->next;    /* 此时读到的是 prev，不是原来的后继 */
```
第二句读到的 `prev` 会让 `cur` 往回走，循环原地打转或提前结束。正确顺序永远是"先备份、后破坏"：`Node *next = cur->next;` 必须在最前面。这类错误在小数据上可能算出"看起来对"的前几个元素，非常难查。

### 反转完返回 head，而不是 prev [WA]
`head` 是函数的参数，它从头到尾没变过，仍然指向**原来的第一个节点**——反转后它是整条链的尾节点。返回 `head` 的后果是调用者只能看到最后一个节点（它的 `next` 已经是 `NULL`），其余节点全部失联并泄漏。记住：**循环结束时的新表头是 `prev`**。

### 递归反转漏掉 head->next = NULL，链表成环 [TLE]
```c
Node *new_head = reverse_rec(head->next);
head->next->next = head;   /* 掉头 */
/* 这里少了 head->next = NULL; */
```
只做掉头不做收尾，原来的头节点仍然指着第二个节点，而第二个节点反过来指着它，形成二元环。遍历会永远在两者之间来回，判 `TLE`；`free` 循环则会重复释放并判 `RE`。

### 三指针初值写错，prev 一开始就非空 [WA]
```c
Node *prev = head;      /* 错：prev 必须是 NULL */
Node *cur = head;
```
第一轮 `cur->next = prev` 就把表头指向自己，立刻自环。`prev` 的含义是"已经反转好的那半条链的表头"，一开始一条都没反转，所以它必须是 `NULL`。同理，`cur` 必须是 `head` 而不是 `head->next`——跳过一个节点就等于丢掉它。

### 空表没处理，直接 head->value 崩溃 [RE]
`reverse(NULL)` 必须原样返回 `NULL`；调用方也必须在反转后判断 `head != NULL` 再打印。递归版里 `if (head == NULL || head->next == NULL)` 同时挡住了"空表"和"单节点"两种情况，少写一半就会在 `head->next->next` 上解引用空指针。

## 客观题

### q-s7-list-reverse-1 single
三指针反转的主循环里，下面四种语句顺序，哪一种既能正确掉头、又不会丢失尚未处理的节点？

- [x] `next = cur->next;` → `cur->next = prev;` → `prev = cur;` → `cur = next;`
  > 正确。第一句在破坏 `cur->next` 之前把后继备份下来；第二句掉头；第三句让"已反转部分的表头"前进到 `cur`；第四句用备份把 `cur` 推到下一块。四句的顺序正好是"备份 → 破坏 → 更新 prev → 推进 cur"。
- [ ] `cur->next = prev;` → `next = cur->next;` → `prev = cur;` → `cur = next;`
  > 错。第一句就覆盖了 `cur->next`，第二句读到的 `next` 其实是 `prev`。于是 `cur` 只会往回走，要么原地死循环、要么提前结束，后半条链彻底失联。只要一句在"写"、后面还有一句在"读"同一个位置，顺序就是致命的。
- [ ] `next = cur->next->next;` → `cur->next = prev;` → `prev = cur;` → `cur = next;`
  > 错。存的是"后继的后继"，跳过一个节点：下一轮 `cur` 直接落到隔一个的位置，被跳过的那块再也没人处理。`next` 要存的是 `cur->next`，不是 `cur->next->next`。
- [ ] `prev = cur;` → `cur->next = prev;` → `next = cur->next;` → `cur = next;`
  > 错。`prev = cur` 之后 `cur->next = prev` 等于 `cur->next = cur`，节点直接指向自己形成自环；再往后 `next` 读到的还是 `cur`，`cur` 永远不前进。`prev` 的赋值必须在 `cur->next = prev` **之后**。
