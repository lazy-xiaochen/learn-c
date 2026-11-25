---
id: s5-dangling-double-free
---

## 讲解

### `free` 之后，指针里还是那个地址

`free(p)` 做的事只有一件：**把 `p` 指向的那块内存还给分配器**。它既不知道有几个指针指向这块内存，也不会帮你把指针改掉——参数是按值传的，`free` 连"改 `p`"的机会都没有。

于是 `free` 之后 `p` 变成了**悬垂指针**：地址还在，对象已经没了。再读它就是"释放后使用"（use-after-free），再 `free` 它就是"重复释放"（double free），两者都是未定义行为。

先看一个**没有**未定义行为的对照实验：用 `int **` 让释放函数能把调用者的指针一起置空。

```c run id=df-release
#include <stdio.h>
#include <stdlib.h>

/* 释放并立刻把调用者的指针置空：调用者手里不会留下悬垂指针 */
static void release(int **pp) {
    free(*pp);
    *pp = NULL;
}

int main(void) {
    int *p = malloc(3 * sizeof *p);
    if (p == NULL) {
        return 0;
    }
    p[0] = 7;
    printf("释放前 p 是空指针吗：%s\n", p == NULL ? "是" : "否");

    release(&p);
    printf("释放后 p 是空指针吗：%s\n", p == NULL ? "是" : "否");

    release(&p);                       /* 第二次等于 free(NULL)：标准保证它什么也不做 */
    printf("对空指针再释放一次也安全\n");

    int *a = malloc(2 * sizeof *a);
    if (a == NULL) {
        return 0;
    }
    int *b = a;                        /* 别名：两个指针变量，同一块内存 */
    printf("a 与 b 指向同一块吗：%s\n", a == b ? "是" : "否");
    a[0] = 42;

    free(a);
    a = NULL;
    printf("a 已被置空：%s\n", a == NULL ? "是" : "否");
    printf("但 b 里仍然保存着那块已归还的地址——只置空一个指针救不了别名\n");
    return 0;
}
```
```output
释放前 p 是空指针吗：否
释放后 p 是空指针吗：是
对空指针再释放一次也安全
a 与 b 指向同一块吗：是
a 已被置空：是
但 b 里仍然保存着那块已归还的地址——只置空一个指针救不了别名
```

这段代码给出两个可操作的结论：

1. **`free(p); p = NULL;` 是正确的肌肉记忆**：`free(NULL)` 是安全的，所以"置空 + 再次误用"最多变成"空指针解引用"这种一眼就能定位的崩溃，而不是静默破坏堆；
2. **置空只保护被置空的那一个指针**。别名（`b`）必须靠**所有权约定**来管理：同一块内存只允许有一个"负责人"，其他人只是借用，不负责释放。

### 为什么"重复释放"是未定义行为，而不是"多此一举"

很多人的直觉是："第二次 `free` 应该什么都不做才对吧？"事实正相反：第二次 `free` 会**往一块已经归还给分配器的内存里写东西**——因为分配器要靠这块内存自己的头部来组织空闲链表。

真实的 `malloc/free` 是这样工作的：一块内存还回来之后，它就不再是"你的数据"，而是被当作一个**空闲链表节点**，头部（或者整块）被写上"下一块空闲内存在哪里"的指针。第二次 `free` 同一块时，分配器并不知道这块已经在链表里了，于是又往它的头部写一次指针——这一次写就把链表改坏了。

下面用一个 4 个槽的极简分配器把这件事演出来。它的管理方式和真实分配器同构：空闲槽用 `next` 指针串成单链表，`free` 就是把槽挂回链头。

```c run id=df-corrupt
#include <stdio.h>

/* 极简"分配器"：4 个槽，空闲槽用 next 串成单链表。
 * 真实的 malloc/free 也用类似结构管理空闲块，这就是重复释放能毁掉整个堆的原因。 */
typedef union Slot {
    union Slot *next;      /* 空闲时：指向下一个空闲槽 */
    int data[2];           /* 分配出去之后：给用户用 */
} Slot;

static Slot pool[4];
static Slot *free_list = NULL;

static void heap_init(void) {
    free_list = NULL;
    for (int i = 3; i >= 0; i--) {
        pool[i].next = free_list;
        free_list = &pool[i];
    }
}

static int *my_alloc(void) {
    if (free_list == NULL) {
        return NULL;
    }
    Slot *s = free_list;
    free_list = s->next;       /* 摘链 */
    return s->data;
}

static void my_free(int *p) {
    Slot *s = (Slot *)p;       /* 用户指针指回槽本身（next 与 data 共用同一块存储） */
    s->next = free_list;       /* 把槽挂回链头 */
    free_list = s;
}

/* 数空闲槽个数；链表可能被绕成环，所以数到上限就停 */
static int free_count(void) {
    int n = 0;
    for (Slot *s = free_list; s != NULL && n < 8; s = s->next) {
        n++;
    }
    return n;
}

int main(void) {
    heap_init();
    printf("初始空闲槽 = %d\n", free_count());

    int *a = my_alloc();
    a[0] = 1;
    printf("申请一块后空闲槽 = %d\n", free_count());

    my_free(a);
    printf("释放一次后空闲槽 = %d\n", free_count());

    my_free(a);                /* 同一个块又释放一次：槽头被写第二次，链表成环 */
    printf("重复释放后空闲槽 = %d（数到上限 8 就停：空闲链表已经绕成环）\n", free_count());

    int *c = my_alloc();
    int *d = my_alloc();
    printf("连续申请两块，拿到同一个地址吗：%s\n", c == d ? "是" : "否");

    c[0] = 111;
    d[0] = 222;
    printf("先写 c[0]=111、再写 d[0]=222，结果 c[0] = %d\n", c[0]);
    return 0;
}
```
```output
初始空闲槽 = 4
申请一块后空闲槽 = 3
释放一次后空闲槽 = 4
重复释放后空闲槽 = 8（数到上限 8 就停：空闲链表已经绕成环）
连续申请两块，拿到同一个地址吗：是
先写 c[0]=111、再写 d[0]=222，结果 c[0] = 222
```

最后两行是整个知识点最致命的后果：**两个"同时存在、逻辑上独立"的对象拿到了同一块内存**。写 `d` 就改掉了 `c`，而代码里这两者毫无关系——错误会在离 `free` 很远的地方爆发。真实的分配器还会因此把同一块内存分给两个不同的结构，或者把链表指针写到别的块上，表现为"随机崩溃、随机数据错乱"，甚至被利用来执行任意代码（heap exploit）。

这也解释了为什么标准把它定为**未定义行为**而不是一个温和的返回值：一旦分配器的元数据被破坏，后续每一次 `malloc/free` 都可能落在无效状态上，标准无法定义"接下来应该发生什么"。

### 所有权约定：谁分配，谁释放

悬垂指针和重复释放的根因都不是"忘了置空"，而是**所有权不清**：一块内存被两个模块、两个指针同时认为"我负责释放"，或者反过来"我以为他会释放"。工程上通行的约定只有三条：

1. **谁 `malloc`，谁 `free`**（同一个模块内配对）；
2. **需要把所有权交出去时，写进接口文档**：例如 `make_histogram` 返回的块由调用者释放，`buf_destroy` 负责释放内部 `data`；
3. **借用者不释放**：只拿到指针、没有所有权的一方，绝不调用 `free`。

用一个带计数器的例子把"配平"演示出来——两次分配、两次释放，其中一次通过别名完成，但只释放一次：

```c run id=df-ownership
#include <stdio.h>
#include <stdlib.h>

static int alloc_count = 0;
static int free_count = 0;

/* 约定：返回的字符串由调用者释放（所有权随返回值交给调用者） */
static char *make_greeting(const char *who) {
    char *s = malloc(32);
    if (s == NULL) {
        return NULL;
    }
    alloc_count++;
    snprintf(s, 32, "hello, %s", who);
    return s;
}

int main(void) {
    char *g = make_greeting("c");
    if (g == NULL) {
        return 0;
    }
    printf("%s\n", g);

    char *alias = g;              /* 借用：不获得所有权 */
    free(g);                      /* 只有所有者释放，而且只释放一次 */
    free_count++;
    g = NULL;                     /* 所有者置空，防止自己重复释放 */
    printf("alias 里还留着旧地址吗：%s（它只是借用者，不该再碰这块内存）\n",
           alias != NULL ? "是" : "否");
    printf("alloc=%d free=%d 配平了吗：%s\n", alloc_count, free_count,
           alloc_count == free_count ? "是" : "否");
    return 0;
}
```
```output
hello, c
alias 里还留着旧地址吗：是（它只是借用者，不该再碰这块内存）
alloc=1 free=1 配平了吗：是
```

### 内存里发生了什么

重复释放时，堆内部发生了什么（地址为示意，`next` 是分配器写在块头上的空闲链表指针）：

```memory title="两次 free 同一个块：空闲链表被写成环（地址为示意）"
地址 | 内容 | 是谁 | 说明
0x2000 | 0x2100 | 堆块的块头 | 第一次 free 后：指向下一块空闲内存，链表正常
0x7fd8 | 0x2000 | 局部变量 a | 第一次 free 之后仍然保存 0x2000，这就是悬垂指针
0x2000 | 0x2000 | 堆块的块头 | 第二次 free 后：块头被写成"指向自己"，链表成环
0x7fe0 | 0x2000 | 局部变量 c | 从成环的链表里摘出来的"新对象"，其实就是 0x2000
0x7fe8 | 0x2000 | 局部变量 d | 又一次摘出同一个槽，于是两个对象重叠
```

对照着看就明白了两件事：第一次 `free` 已经把块交还，`a` 却还留着地址；第二次 `free` 时"块头"这个位置**已经属于分配器**，往里再写一次就是破坏它的数据结构。而一旦链表成环，同一块内存就能被分配两次。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra -g -fsanitize=address,undefined df.c -o df
./df
```

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=address,undefined df.c -o df
./df
```

说明：

- **ASan** 对这两类错误抓得非常准：`heap-use-after-free` 会告诉你"这块内存在第 N 行被释放、在这里被访问"；`attempting double-free` 会指出两次 `free` 的位置。本平台把它判成 `RE`；
- 用 `-fsanitize=address` 时程序会**立即终止**在第一个错误上（`halt_on_error=1`），这是好事：错误越早暴露，越容易定位；
- 不开 sanitizer 时，double free 的表现是"随机"的：可能什么都不发生（块刚好还是那样），可能在几百行之后崩溃，也可能被 glibc 的 `free(): double free detected` 拦下来（Linux 的 tcache 有检测，**检测到不代表没有这个问题**，它只覆盖一部分情形）；
- 平台建议：调试构建永远带 `-g -fsanitize=address,undefined`，发版构建才关掉它。

## 常见错误

### `free` 之后没有置空，继续用这个指针 [RE]
`free(p)` 不会改 `p`。之后 `*p`、`p[0]`、`printf("%d", *p)` 都是释放后使用。ASan 会报 `heap-use-after-free`；不开 ASan 时可能"碰巧读到旧值"，让你误以为代码没问题。

```c run id=df-err-uaf expect=RE
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *p = malloc(sizeof *p);
    if (p == NULL) {
        return 0;
    }
    *p = 5;
    free(p);
    printf("%d\n", *p);    /* 释放后使用：p 是悬垂指针 */
    return 0;
}
```

### 两个指针指向同一块，各自 `free` 一次 [RE]
这是重复释放最常见的形态，而且看起来"很无辜"——两处代码各自都只写了一行 `free`。只要发生过一次别名赋值（`q = p`、把指针存进结构体、按值传给一个会释放它的函数），就必须明确：**谁拥有所有权**。所有者释放一次，借用者永远不释放。

```c run id=df-err-double expect=RE
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *p = malloc(2 * sizeof *p);
    if (p == NULL) {
        return 0;
    }
    int *q = p;            /* 别名 */
    free(p);
    free(q);               /* 同一块内存被释放两次 */
    return 0;
}
```

### 以为"置空了就万事大吉"，忘了还有别的别名 [RE]
`free(p); p = NULL;` 只清掉 `p`。如果同一个地址还保存在 `q`、数组元素、结构体成员里，那些指针仍然是悬垂的。正确做法是**让所有权只有一个出口**：函数内部释放，就把所有外部引用一并作废；或者干脆不交出内部指针，只给下标。

### 只释放外层结构，忘了它内部还有堆内存 [LEAK]
`struct Line { char *text; }` 的数组：`free(lines)` 只归还了那排结构体，每个 `text` 指向的块全都还在。释放必须由内而外：先逐个 `free(lines[i].text)`，再 `free(lines)`，最后把指针置空。这是"泄漏"和"悬垂"同时出现的高发区——少释放是泄漏，多释放是重复释放。

### 把 `free` 之后的值当作"还可以读一次" [RE]
`free(p); int last = *p;` 不是"读最后一次"，而是标准的释放后使用。想留下最后一个值，就在 `free` **之前**把它复制到普通变量里。另一个常见变体是 `printf("%s", s); free(s);` 之后再 `strlen(s)`——同样是 UAF。

## 客观题

### q-s5-dangling-double-free-1 single
关于"对同一块内存 `free` 两次"，下面哪个说法正确？

- [x] 第一次 `free` 之后这块内存已经归分配器管理，第二次 `free` 会往它的块头再写一次空闲链表指针，把分配器的数据结构改坏，后续 `malloc` 可能把同一块内存分给两个对象
  > 正确。分配器把归还的内存当作"空闲链表节点"使用，块头存的是"下一块空闲内存"的地址。第二次 `free` 时这块内存已经不在"用户数据"的身份上，再写一次块头就会让链表错乱（常见的是绕成环）。后果是同一块内存被分配两次：两个逻辑上独立的对象重叠，写一个就改掉另一个。标准因此把重复释放定为未定义行为，而不是"无害的多余操作"。
- [ ] 第二次 `free` 只是什么都不做，`free` 内部会自动判断这块内存是否已经被释放过
  > 错。标准库的 `free` 不保留"哪些块已经释放"的完整记录，它只有空闲链表这类结构，无法区分"这是一个有效的用户块"和"这是一个已经在空闲链表里的块"。部分实现（如 glibc 的 tcache）会在某些情况下检测并报错，但那是实现附加的检查，不是语言保证，也覆盖不了所有情形。
- [ ] 第二次 `free` 会造成内存泄漏，因为那块内存被"释放了两次"而记录出错
  > 错。泄漏的定义是"内存再也没被归还"；重复释放恰恰相反，是同一块被归还了两次，属于"还多了"。它的后果是分配器元数据损坏（可能崩溃、可能把同一块分给两个人），而不是泄漏。
- [ ] `free` 之后指针会自动变成 `NULL`，所以第二次 `free` 相当于 `free(NULL)`，是安全的
  > 错。`free` 的参数是**按值传递**的，它拿到的是地址的一份副本，无法修改调用者的指针变量。所以 `free(p)` 之后 `p` 仍然保存着原地址（悬垂指针）。第二次 `free(p)` 传进去的是一个真实的、已被释放的地址，不是 `NULL`。
