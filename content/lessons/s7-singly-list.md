---
id: s7-singly-list
---

## 讲解

### 为什么链表节点必须用 malloc 创建
学数组时，数据是"一整块"放在栈上或全局区的：`int a[100];` 一写，编译器就把 400 字节安排在栈帧里，函数一返回这块内存就作废。链表不能这么干，原因有三个：

1. **节点的生命期比函数调用长**。`insert` 里造出来的节点，要一直活到 `remove` 或 `destroy` 的那一刻——而这两个函数可能在几万行之外的另一次调用里。栈上的变量随函数返回消失，只有堆内存的生命期与"谁创建了它"无关，只由 `free` 结束。
2. **节点个数在运行期才知道**。读入 n 个学生、n 由输入决定，数组要么开得过大浪费、要么开小了越界；链表可以"来一个建一个"。
3. **节点的所有权会转移**。创建、遍历、删除、销毁分别发生在不同的函数里，节点必须能被多份代码同时"看见"，而不是绑死在某个栈帧上。

下面这个例子把"函数返回了，但堆上的节点还在"这件事演示清楚：

```c run id=sl-heap-lifetime
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

/* 在堆上造一个节点，返回它的地址；谁创建谁负责 free */
static Node *make_node(int value) {
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return NULL;
    }
    node->value = value;
    node->next = NULL;
    return node;
}

/* 这个函数的局部变量 first/second 在返回时就消失了，但堆上的两个节点还在 */
static Node *build_two(void) {
    Node *first = make_node(10);
    Node *second = make_node(20);
    if (first == NULL || second == NULL) {
        free(first);
        free(second);
        return NULL;
    }
    first->next = second;
    return first;
}

int main(void) {
    Node *head = build_two();
    if (head == NULL) {
        return 0;
    }
    int count = 0;
    for (const Node *p = head; p != NULL; p = p->next) {
        printf("node %d: value=%d\n", count, p->value);
        count++;
    }
    printf("count=%d\n", count);

    int freed = 0;
    while (head != NULL) {
        Node *next = head->next;   /* 先记住下一个，再释放当前 */
        free(head);
        head = next;
        freed++;
    }
    printf("freed=%d\n", freed);
    return 0;
}
```
```output
node 0: value=10
node 1: value=20
count=2
freed=2
```

`build_two` 里的 `first`、`second` 只是两个指针变量，它们确实随函数返回消失了；但 `malloc` 得到的**两块内存**依然有效，因为它们的生命期由 `free` 决定。这就是链表必须用堆的全部理由：**链表的形状由 malloc 决定，链表的寿命由 free 决定，与函数调用无关**。代价也很明确——每一块都必须有人 `free`，漏一个就是内存泄漏。

### 头插法：O(1)，但顺序是反的
头插只有两句话：让新节点的 `next` 接上原来的表头，再让 `head` 指向新节点。**顺序不能反**，因为第二句会覆盖 `head` 里保存的原表头地址。

```c run id=sl-push-front
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

/* head 用二级指针：函数要修改的是调用者那个 head 变量本身 */
static int push_front(Node **head, int value) {
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->value = value;
    node->next = *head;   /* ① 先接上原来的表头 */
    *head = node;         /* ② 再让 head 指向新节点 */
    return 1;
}

int main(void) {
    Node *head = NULL;
    for (int v = 1; v <= 5; v++) {
        if (!push_front(&head, v)) {
            return 0;
        }
    }

    printf("头插 1..5 后从表头遍历：");
    for (const Node *p = head; p != NULL; p = p->next) {
        if (p != head) {
            printf(" -> ");
        }
        printf("%d", p->value);
    }
    printf("\n");

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
头插 1..5 后从表头遍历：5 -> 4 -> 3 -> 2 -> 1
释放了 5 个节点
```

头插的代价是**逆序**：依次头插 1、2、3、4、5，链表里是 5→4→3→2→1。这不是 bug，而是"最新进来的在表头"这个语义——它正好是栈要的顺序，也是"最近添加的学生排在最前面"这种展示需求的顺序。要正序，就得用尾插。

### 尾插与二级指针：把"改 head"和"改某个 next"合成一件事
尾插要走到链表末尾，把最后一个节点的 `next` 指向新节点。麻烦在于：**空链表**时没有"最后一个节点"，你改的是 `head` 本身。初学者通常写两个分支，其实可以合并——用一个"指向指针的指针"：

```c run id=sl-append-link
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

/* link 始终指向"新节点应该放进去的那根指针" */
static int append(Node **head, int value) {
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->value = value;
    node->next = NULL;

    Node **link = head;                    /* 空表时 link 就是 head 本身 */
    while (*link != NULL) {
        link = &(*link)->next;             /* 一路走到"最后一根 next" */
    }
    *link = node;                          /* 一次赋值搞定空表与非空表 */
    return 1;
}

/* 删除第一个值为 value 的节点；同样不用为"删表头"写特判 */
static int remove_value(Node **head, int value) {
    Node **link = head;
    while (*link != NULL && (*link)->value != value) {
        link = &(*link)->next;
    }
    if (*link == NULL) {
        return 0;                          /* 没找到 */
    }
    Node *dead = *link;
    *link = dead->next;                    /* 让前驱直接跳过后继：这一步就是"摘链" */
    free(dead);                            /* 摘下来之后才允许 free */
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
    const int values[3] = { 10, 20, 30 };
    for (int i = 0; i < 3; i++) {
        if (!append(&head, values[i])) {
            return 0;
        }
    }
    print_list("尾插 10 20 30：", head);

    printf("删除 20 返回 %d\n", remove_value(&head, 20));
    print_list("删除 20 之后：", head);
    printf("再删 99 返回 %d\n", remove_value(&head, 99));
    print_list("链表不变：", head);

    int freed = 0;
    while (head != NULL) {
        Node *next = head->next;
        free(head);
        head = next;
        freed++;
    }
    printf("最后释放了 %d 个节点\n", freed);
    return 0;
}
```
```output
尾插 10 20 30：10 -> 20 -> 30
删除 20 返回 1
删除 20 之后：10 -> 30
再删 99 返回 0
链表不变：10 -> 30
最后释放了 2 个节点
```

`Node **link` 的关键在于：它保存的不是"某个节点"，而是"**某根 next 指针的地址**"。空表时这根指针是 `head`，非空时是尾节点的 `next`，两者类型完全相同，于是插入、删除都只需要一句 `*link = ...`。这也是链表面试题里"为什么用二级指针"的标准答案。

### 一条链表在内存里长什么样
以"尾插 10、20，再头插 30"为例，链表的形状是 `head → 30 → 10 → 20 → NULL`。注意 `head` 是一个**独立存在**的指针变量（通常在栈上），节点在堆上，节点之间靠 `next` 串起来：

```memory title="head → 30 → 10 → 20 → NULL（地址为示意，实际每次运行都不同）"
地址（示意） | 内容 | 变量 | 说明
A | value=30, next=B | head | 头节点：最后一次头插产生的节点
B | value=10, next=C |  | 第二个节点：第一次尾插
C | value=20, next=NULL |  | 尾节点：它的 next 是空指针
```

由此可以读出三条推论：

- **遍历只能单向**：从 `head` 出发能到达所有节点，但从 `C` 出发回不到 `B`——单向链表没有 `prev`。
- **`head` 本身是可以被改写的普通变量**：`head = head->next` 只是让 `head` 挪到下一个节点，节点本身一个字节都没动。
- **`sizeof(Node)` 比"数据"多一个指针**：`int` 只占 4 字节，`next` 在 64 位上占 8 字节。链表是用空间换"插入删除不用搬家"。

### 遍历与查找：判空的是 p，不是 p->next
最经典的死法是把遍历条件写成 `while (p->next != NULL)`。它有两个问题：空链表时 `p` 本身就是 `NULL`，`p->next` 直接解引用空指针；非空时循环会在**尾节点之前**停下，最后一个元素永远处理不到。正确写法只有一种：

```c
for (const Node *p = head; p != NULL; p = p->next) {
    /* 在这里 p 一定有效，可以安全访问 p->value / p->next */
}
```

查找就是在这个骨架上加一个比较，**找到就立刻返回**（保证返回的是"第一个"匹配的节点）：

```c
const Node *find(const Node *head, int value) {
    for (const Node *p = head; p != NULL; p = p->next) {
        if (p->value == value) {
            return p;
        }
    }
    return NULL;
}
```

返回 `NULL` 表示"没找到"，这要求调用者必须判空——把"查找"和"解引用"写在同一行（`printf("%d", find(head, x)->value);`）是崩溃的常见来源。

### 删除与销毁：先摘链，再 free
删除分两步，顺序绝对不能反：

1. **摘链**：让前驱的 `next` 跳过要删的节点（用上面的 `link` 手法，连表头都不用特判）；
2. **释放**：`free` 那个已经不在链上的节点。

如果先 `free` 再摘链，`dead->next` 就是从已释放的内存里读数据（use-after-free，ASan 会直接报错）。如果只摘链不 `free`，节点就再也找不回来了——这是最典型的**内存泄漏**。

销毁整条链表是同一个循环重复 n 次，注意必须在 `free` 之前把 `next` 存下来：

```c
while (head != NULL) {
    Node *next = head->next;   /* ① 先存下一个 */
    free(head);                /* ② 再释放当前 */
    head = next;               /* ③ 挪到下一个 */
}
head = NULL;                   /* ④ 别留下悬垂指针 */
```

## 编译与运行

本平台使用 Clang（x86-64 Windows，UCRT），用 gcc 或 clang 都能编译：

```bash
gcc -std=c17 -Wall -Wextra list.c -o list
./list
```

```bash
clang -std=c17 -Wall -Wextra list.c -o list
./list
```

链表题最值得开的开关是内存检查器。`-fsanitize=address` 会在越界、use-after-free、double free 的第一现场停下并打印调用栈；Linux 上的 LeakSanitizer 还会在程序正常结束时报告"哪些行分配的内存没有释放"：

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=address list.c -o list
./list
```

本平台的判题器默认就带着 AddressSanitizer + UBSan 编译，并且用 `-Wl,--wrap=malloc` 之类的手段统计堆分配，所以：

- 崩溃会判 `RE`，并给出 `solution.c 第 N 行` 这样的精确位置；
- 开启了泄漏检查的题目（例如本知识点的"按接口实现链表"）会判 `LEAK`，并指出是哪一行 `malloc` 出来的内存没还。

想只看编译警告、不生成可执行文件，用：

```bash
clang -std=c17 -Wall -Wextra -fsyntax-only list.c
```

## 常见错误

### 头插时把两句写反，链表变成自环 [RE]
`*head = node;` 之后再写 `node->next = *head;`，等于让新节点的 `next` 指向它自己：`head` 指向 A，A 的 `next` 也是 A。遍历立刻变成死循环（判 `TLE`），而 `free` 循环则会一直释放同一个地址（判 `RE`）。

```c
/* 错：顺序反了 */
Node *node = malloc(sizeof *node);
node->value = 10;
*head = node;          /* head 先被覆盖，原来的链表已经找不到了 */
node->next = *head;    /* 现在 *head 就是 node 自己 → 自环 */
```

正确顺序永远是"先接后断"：`node->next = *head;` 在前，`*head = node;` 在后。

### 删除节点后还去读它的 next [RE]
先 `free(dead)` 再 `dead->next` 是标准的 use-after-free。更隐蔽的写法发生在尾节点上：如果 `free` 之后才把"前驱的 next"改成 `dead->next`，程序在小数据上可能碰巧还能跑（内存还没被复用），换一组输入就崩。记住口诀：**摘链在前，free 在后**。

### 只 free 表头，其余节点全部泄漏 [LEAK]
`free(head);` 一句话释放的只是第一个节点，后面所有节点立刻失去唯一入口，永远无法释放。开启泄漏检查的题目会判 `LEAK`；就算没开，长跑的服务端程序也会因为这一类错误慢慢吃光内存。销毁必须写循环，并且每次先保存 `next`。

### 遍历条件写成 p->next != NULL，漏掉尾节点 [WA]
```c
for (Node *p = head; p->next != NULL; p = p->next)   /* 错 */
```
空链表时直接解引用空指针（`RE`）；非空时最后一个节点处理不到——求和少一项、打印少一个、查找漏掉尾巴，全是 `WA`。条件必须是 `p != NULL`。

### 忘记检查 malloc 的返回值 [RE]
`malloc` 在内存不足时返回 `NULL`。直接写 `node->value = v;` 会在空指针上写数据。接口题里正确的做法是 `if (node == NULL) { return 0; }`，并且这条错误路径上不能改动链表（不能先 `count++` 再判断）。

## 客观题

### q-s7-singly-list-1 single
下面是用二级指针实现的头插函数，`head` 一开始指向一条非空链表。四个版本的函数体只有最后两条语句的顺序不同，哪一个是正确的？

```c
int push_front(Node **head, int v) {
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->value = v;
    /* 下面两条语句的顺序是本题的关键 */
}
```

- [x] 先 `node->next = *head;`，再 `*head = node;`
  > 正确。先把新节点的 `next` 指向原来的表头，链表就"接上了"；再把 `head` 改指向新节点，新节点就正式成为表头。这两步之间链表始终是完整的，任何时刻都没有节点失去入口。
- [ ] 先 `*head = node;`，再 `node->next = *head;`
  > 错。第一句把 `head` 覆盖成新节点之后，原来的表头地址就丢了；第二句读到的 `*head` 已经是新节点自己，于是 `node->next == node`，链表变成自环。遍历会死循环，销毁时会重复 `free` 同一个地址。
- [ ] 先 `*head = node;`，再 `node->next = NULL;`
  > 错。这样确实没有自环，但原来那条链表整条失联——它的头节点再没有任何指针指向，`free` 也找不到了，属于内存泄漏。头插必须"接上旧的"，而不是"丢掉旧的"。
- [ ] 两条语句的顺序无所谓，因为它们修改的是不同的变量
  > 错。`*head` 和 `node->next` 看似是两个对象，但第二条语句的右值要读 `*head`：顺序一旦反过来，读到的是被覆盖之后的新值。只要一句在写、另一句在读同一个位置，"顺序无所谓"就不成立。
