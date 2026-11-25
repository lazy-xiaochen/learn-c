---
id: s4-self-ref
---

## 讲解

### 结构体为什么不能直接包含自己
链表节点最直觉的写法可能是"节点里放一个节点"：

```c
struct Node {
    int value;
    struct Node next;    /* 错：结构体还没定义完，大小未知 */
};
```

编译器会报 `field has incomplete type 'struct Node'`。原因不是语法限制，而是**大小算不出来**：要确定 `sizeof(struct Node)`，必须先知道 `next` 的大小；而 `next` 的大小又等于 `sizeof(struct Node)`，如此无限递归。即使编译器愿意展开，一个节点也会需要无限大的空间，任何变量都放不下。

C 的规则是：在 `struct Node { ... };` 的右花括号出现之前，`struct Node` 是一个**不完整类型（incomplete type）**——编译器知道"有这么个类型"，但不知道它多大、有哪些成员。不完整类型不能用来定义变量或作为成员类型，因为编译器无法为它分配空间。

### 但可以包含"指向自己"的指针
指针的大小是固定的：在 64 位平台上是 8 字节，和它指向什么类型无关。因此结构体可以包含一个指向自身类型的指针：

```c
struct Node {
    int value;
    struct Node *next;   /* 合法：指针大小已知，指向的类型可以还不完整 */
};
```

这行声明里，`struct Node` 仍然是不完整类型，但 `struct Node *` 是"指向不完整类型的指针"，大小已知，可以作为成员。于是 `sizeof(struct Node)` 可以算出来：

- `value` 占 4 字节；
- `next` 是指针，要求 8 字节对齐，所以 4…7 填充；
- `next` 占 8…15；
- 总大小 16 字节。

**自引用结构体的精髓是：节点里不存"下一个节点"，只存"下一个节点在哪里"。** 节点的大小是有限的，而通过 `next` 指针可以把任意多个节点串成一条链——这就是链表、树、图等递归数据结构的起点。

下面的程序手工创建三个节点并用 `next` 串起来，然后遍历。这里没有 `malloc`，节点都是普通的局部变量，生命周期由栈管理：

```c run id=s4sr-chain
#include <stdio.h>

struct Node {
    int value;
    struct Node *next;
};

int main(void) {
    struct Node a = { 10, NULL };
    struct Node b = { 20, NULL };
    struct Node c = { 30, NULL };

    a.next = &b;          /* a 的 next 指向 b */
    b.next = &c;          /* b 的 next 指向 c */
    c.next = NULL;        /* c 是尾节点：next 为 NULL，表示链表结束 */

    int sum = 0;
    int count = 0;
    for (struct Node *p = &a; p != NULL; p = p->next) {
        printf("%d%s", p->value, p->next != NULL ? " -> " : "\n");
        sum += p->value;
        count++;
    }

    printf("count=%d sum=%d\n", count, sum);
    printf("sizeof(struct Node)=%zu\n", sizeof(struct Node));
    return 0;
}
```
```output
10 -> 20 -> 30
count=3 sum=60
sizeof(struct Node)=16
```

遍历的循环条件必须是 `p != NULL`，不是 `p->next != NULL`：后者会停在最后一个节点之前，永远看不到尾节点的值。循环体里 `p = p->next` 在最后一次迭代后把 `p` 变成 `NULL`，循环自然结束。

### 用静态数组做"节点池"
局部变量适合两三个节点，节点一多就不好管理。更常见的做法是准备一个静态数组作为**节点池**，再用 `next` 把数组元素串起来：

```c run id=s4sr-pool
#include <stdio.h>

struct Node {
    int value;
    struct Node *next;
};

static struct Node pool[4];    /* 文件作用域的静态节点池，零初始化 */

int main(void) {
    for (int i = 0; i < 4; i++) {
        pool[i].value = (i + 1) * 10;
        pool[i].next = (i + 1 < 4) ? &pool[i + 1] : NULL;
    }

    struct Node *head = &pool[0];
    printf("head value=%d\n", head->value);
    printf("third value=%d\n", head->next->next->value);
    printf("values:");
    for (struct Node *p = head; p != NULL; p = p->next) {
        printf(" %d", p->value);
    }
    printf("\n");
    printf("pool stride=%td\n", (char *)&pool[1] - (char *)&pool[0]);
    return 0;
}
```
```output
head value=10
third value=30
values: 10 20 30 40
pool stride=16
```

节点池的好处是**内存位置确定、不需要释放**：每个 `struct Node` 都是 `pool` 数组的一个元素，`next` 只是保存它的地址。第 5 阶段学了 `malloc/free` 之后，才能按需创建任意数量的节点；在那之前，静态数组或局部变量足够把链表的"链接"和"遍历"练熟。

### 就地反转：先把 next 存下来
链表最经典的指针操作是就地反转。核心是三个指针：`prev`（已经反转部分的头）、`cur`（当前节点）、`next`（原来的下一个节点）。**必须先保存 `cur->next`，再改 `cur->next`**，否则剩下的链表就找不回来了：

```c run id=s4sr-reverse
#include <stdio.h>

struct Node {
    int value;
    struct Node *next;
};

static void show(const char *label, struct Node *head) {
    printf("%s", label);
    for (struct Node *p = head; p != NULL; p = p->next) {
        printf("%s%d", p == head ? "" : " -> ", p->value);
    }
    printf("\n");
}

int main(void) {
    struct Node pool[4] = {
        { 1, NULL }, { 2, NULL }, { 3, NULL }, { 4, NULL }
    };
    for (int i = 0; i < 3; i++) {
        pool[i].next = &pool[i + 1];
    }

    show("before: ", &pool[0]);

    struct Node *prev = NULL;
    struct Node *cur = &pool[0];
    while (cur != NULL) {
        struct Node *next = cur->next;   /* 先保存原来的下一个 */
        cur->next = prev;                /* 掉头 */
        prev = cur;
        cur = next;
    }

    show("after:  ", prev);
    return 0;
}
```
```output
before: 1 -> 2 -> 3 -> 4
after:  4 -> 3 -> 2 -> 1
```

反转结束后，新的头是 `prev`，原来的头变成了尾节点，它的 `next` 被改成 `NULL`。如果只写 `cur->next = prev; prev = cur; cur = cur->next;`，第三步读到的 `cur->next` 已经被改成 `prev`，链表会立刻断掉——这是链表反转最典型的 bug。

内存图（静态节点池里三个节点串成的链表，地址为示意）：

```memory title="struct Node pool[3] 串成 10 → 20 → 30"
地址(示意) | 内容 | 成员 | 说明
0x700000 | 10 | pool[0].value | 第一个节点
0x700008 | 0x700010 | pool[0].next | 指向 pool[1]
0x700010 | 20 | pool[1].value | 第二个节点
0x700018 | 0x700020 | pool[1].next | 指向 pool[2]
0x700020 | 30 | pool[2].value | 第三个节点
0x700028 | 0 | pool[2].next | NULL：链表到此结束
```

`next` 的类型是 `struct Node *`，它保存的是另一个节点的**首地址**。`pool[0].next` 的值是 `0x700010`，所以 `pool[0].next->value` 就是 `pool[1].value`。注意 `0x700008` 这个位置存的是指针本身，不是它指向的 `20`。

### typedef 与自引用：别名在结构体内部还不可见
很多人喜欢写：

```c
typedef struct Node {
    int value;
    struct Node *next;   /* 这里必须写 struct Node，不能只写 Node */
} Node;
```

原因是：`Node` 这个 typedef 名字要等整个声明结束（分号之后）才进入作用域。在右花括号之前，`Node *next;` 会被当成"未知类型名"，编译失败。而 `struct Node` 这个标签在左花括号之后就可见了，所以指针成员要写 `struct Node *`。

## 编译与运行

用 gcc 或 clang 编译：

```bash
gcc -std=c17 -Wall -Wextra list.c -o list
./list
```

```bash
clang -std=c17 -Wall -Wextra list.c -o list
./list
```

本节所有代码都不需要 `malloc`，节点要么是局部变量，要么是静态数组元素。用 `-fsanitize=address,undefined` 编译可以帮你抓住"尾节点 `next` 没置 `NULL`、遍历越界"这类错误：程序会直接报 `heap-buffer-overflow` 或 `SEGV`，而不是悄悄打印垃圾值。

检查链表是否构造正确，可以打印"节点地址→next 地址"的关系，但**不要把绝对地址写进预期输出**，因为每次运行的栈/静态区地址可能不同。用 `p->value` 和 `count` 验证结构，用 `p == NULL` 判断结束，才是可重复的检查方式。

## 常见错误

### 让结构体直接包含自身 [CE]
`struct Node { int value; struct Node next; };` 在右花括号前 `struct Node` 还是不完整类型，编译器无法确定成员大小，直接报错。即使语法允许，这个类型也会需要无限大的空间，根本不可能存在。

```c run id=s4sr-err-self expect=CE
#include <stdio.h>

struct Node {
    int value;
    struct Node next;      /* 错：成员类型不完整 */
};

int main(void) {
    struct Node n = { 1, { 2, { 3 } } };
    printf("%d\n", n.value);
    return 0;
}
```

### 在 typedef 结构体内部直接使用别名 [CE]
`typedef struct Node { ... Node *next; } Node;` 中，`Node` 别名还没有生效，`Node *next` 会被当成未定义的类型名。必须写 `struct Node *next;`。这是自引用和 typedef 一起使用时最常见的错误。

```c run id=s4sr-err-typedef expect=CE
#include <stdio.h>

typedef struct Node {
    int value;
    Node *next;            /* 错：此时 Node 别名还不可见 */
} Node;

int main(void) {
    Node a = { 1, NULL };
    printf("%d\n", a.value);
    return 0;
}
```

### 尾节点的 next 没有置 NULL [UB]
如果最后一个节点的 `next` 是未初始化的值，遍历时 `p = p->next` 会跳到一个随机地址，随后 `p->value` 就是未定义行为：可能崩溃，也可能读到垃圾数据。用局部变量建链表时，一定要写 `c.next = NULL;`；用静态数组时，零初始化会帮忙，但显式写出 `next = NULL` 更清楚。

### 遍历条件写成 `p->next != NULL`，漏掉最后一个节点 [WA]
`while (p->next != NULL)` 在尾节点之前就会停下，尾节点的值永远不会被访问。下面这段"错误示范"只打印了 1 和 2，3 被漏掉了：

```c run id=s4sr-err-loop
#include <stdio.h>

struct Node {
    int value;
    struct Node *next;
};

int main(void) {
    struct Node a = { 1, NULL };
    struct Node b = { 2, NULL };
    struct Node c = { 3, NULL };
    a.next = &b;
    b.next = &c;

    for (struct Node *p = &a; p->next != NULL; p = p->next) {
        printf("%d ", p->value);
    }
    printf("\n");
    return 0;
}
```
```output
1 2 
```

正确条件是与 `NULL` 比较 `p != NULL`，让循环一直走到"当前节点不存在"为止。

## 客观题

### q-s4-self-ref-1 single
为什么自引用结构体必须写成 `struct Node *next`，而不能写成 `struct Node next`？

- [x] 因为在结构体定义结束前 `struct Node` 是不完整类型，大小未知；而指针大小固定，可以指向不完整类型
  > 正确。右花括号之前 `struct Node` 还没有完整定义，编译器无法为 `struct Node next` 分配空间；指针的大小与所指类型无关，所以 `struct Node *` 是合法的成员类型。这也是链表、树等递归结构能够存在的前提。
- [ ] 因为指针比结构体小，用指针可以节省内存
  > 错。真正的原因是"类型是否完整、大小能否确定"，不是省内存。如果只是成员很大，完全可以包含一个完整的结构体成员（只要类型已经定义完整），编译器不会阻止你。
- [ ] 因为 C 语言不允许结构体包含任何结构体成员
  > 错。C 允许结构体嵌套结构体，例如 `struct Date { ... }; struct Student { struct Date birth; };` 完全合法，只要 `Date` 在 `Student` 之前已经定义完整。
- [ ] 因为指针会自动为下一个节点分配内存
  > 错。指针只是一个保存地址的变量，不会自动分配任何内存。节点的空间必须由局部变量、静态数组或 `malloc` 提供；指针只负责"指向"它。
