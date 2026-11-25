---json
{
  "id": "p-s7-bst-1",
  "title": "按接口实现二叉搜索树：插入、查找、取最小、中序遍历、删除、整体释放",
  "difficulty": "L4",
  "knowledgePoints": ["s7-bst"],
  "special": "ds-implementation",
  "judge": { "mode": "function", "timeMs": 1000, "compare": "lines", "checkLeaks": true }
}
---

## 题目描述
二叉搜索树是"有序 + 树形"的组合：它既支持按值快速查找，又能随时插入新值、删除旧值，还能用一次中序遍历输出全部有序数据。这道题请你在 `solution.c` 里完整实现它——**节点必须用 `malloc` 分配，并且一个都不能漏掉释放**。

测试驱动会用接口头文件 `bst.h` 驱动你的实现，需要实现七个函数：

```c
typedef struct BstNode {
    int key;
    struct BstNode *left;
    struct BstNode *right;
} BstNode;

typedef struct {
    BstNode *root;
    int size;
} Bst;

void bst_init(Bst *t);                                  /* 空树：root = NULL、size = 0 */
int  bst_insert(Bst *t, int key);                       /* 1 成功；0 键已存在；-1 内存不足 */
int  bst_contains(const Bst *t, int key);               /* 1 存在；0 不存在 */
int  bst_min(const Bst *t, int *out);                   /* 1 成功写入 *out；0 空树 */
int  bst_height(const Bst *t);                          /* 空树 0，单节点 1 */
int  bst_inorder(const Bst *t, int *out, int cap);      /* 中序写入 out，返回个数 */
int  bst_remove(Bst *t, int key);                       /* 1 删掉；0 不存在 */
void bst_destroy(Bst *t);                               /* 释放全部节点并清零 */
```

五条硬性要求：

1. **键不重复**：`bst_insert` 遇到已存在的键返回 `0`，树不变、`size` 不变；也只有这样 `size` 才等于"树里不同键的个数"；
2. **中序遍历必须递增**：这是测试驱动判断"你的树到底是不是 BST"的主要手段（它不检查指针形状，只看遍历结果是否严格递增、个数是否等于 `size`）；
3. **删除要真正释放**：被删掉的节点必须 `free`，删完树仍然满足 BST 性质；两个孩子都在时用中序后继（右子树最小节点）替换；
4. **`bst_height` 的定义**：空树 `0`、单节点 `1`、其余是"左右子树高度的较大值 + 1"；
5. **释放干净**：`bst_destroy` 必须把整棵树的节点全部 `free`（包括之前 `bst_remove` 删下来的那些）。本题开启了**内存泄漏检查**——输出全对但结束时还有节点没归还，会判 `LEAK`，并指出是在哪一行 `malloc` 的。

你只需要提交 `solution.c`，不要写 `main`，也不要提交 `bst.h`。

## 输入格式
（由隐藏的测试驱动读取，供你理解测试方式）

第一行一个整数 `n`。
第二行 `n` 个整数，按顺序依次调用 `bst_insert`。

## 输出格式
（由隐藏的测试驱动输出）共 28 行，依次是：

```
init_empty=<bst_init 之后 root==NULL 且 size==0 时为 1>
insert_fail=<insert 返回 -1 的次数，正常为 0>
size=<树里不同键的个数>
dupes=<insert 返回 0 的次数>
min_ok=<bst_min 返回 1 表示非空；0 表示空树>
min=<bst_min 写出的最小值；空树时为 0>
min_match=<min 等于输入最小值时为 1>
height=<树高>
inorder_count=<bst_inorder 返回的个数>
inorder_sorted=<个数等于 size 且严格递增时为 1>
inorder_sum=<中序序列所有键之和>
head=<中序序列的前 5 个，空格分隔>
tail=<中序序列的后 5 个，空格分隔>
contains_first=<输入第一个键是否还在树里>
contains_last=<输入最后一个键是否还在树里>
contains_min_plus_1=<最小值 +1 是否在树里>
contains_below_min=<最小值 -1 是否在树里，正常为 0>
contains_missing=<1000000001 是否在树里，正常为 0>
removed=<按输入顺序删除偶数下标（0,2,4,…）的键，成功次数>
size_after=<删完这些键后的 size>
after_sorted=<此时中序仍然递增且个数等于 size 时为 1>
remove_missing=<删除 1000000001 的返回值，正常为 0>
removed_rest=<把输入的键再全删一遍，成功次数>
size_empty=<此时 size，正常为 0>
empty_min=<空树调用 bst_min 的返回值，正常为 0>
empty_inorder=<空树调用 bst_inorder 的返回值，正常为 0>
reset=<bst_destroy 之后 root==NULL 且 size==0 时为 1>
rebuild_reset=<重新建一棵 3 节点小树再 destroy，清零时为 1>
```

## 数据范围
1 ≤ n ≤ 80000
-10⁹ ≤ key ≤ 10⁹，同一组输入里可能有重复键

隐藏用例中"退化形状"（升序或降序的 2000 个键，树高等于节点数）也在测试范围内；再长的链会超出合理的递归深度，所以不会出现 8 万节点的链。

## 示例
### 示例 1
```in
7
50 30 70 20 40 60 80
```
```out
init_empty=1
insert_fail=0
size=7
dupes=0
min_ok=1
min=20
min_match=1
height=3
inorder_count=7
inorder_sorted=1
inorder_sum=350
head=20 30 40 50 60
tail=40 50 60 70 80
contains_first=1
contains_last=1
contains_min_plus_1=0
contains_below_min=0
contains_missing=0
removed=4
size_after=3
after_sorted=1
remove_missing=0
removed_rest=3
size_empty=0
empty_min=0
empty_inorder=0
reset=1
rebuild_reset=1
```
> 7 个键互不相同，按 50 30 70 20 40 60 80 插入后根是 50，高度 3。偶数下标是 0、2、4、6，对应键 `50 70 20 60`，删完剩 `30 40 80` 三个。最后把剩下的再删一遍，`removed_rest=3`，树空。

### 示例 2（边界：只有一个节点）
```in
1
7
```
```out
init_empty=1
insert_fail=0
size=1
dupes=0
min_ok=1
min=7
min_match=1
height=1
inorder_count=1
inorder_sorted=1
inorder_sum=7
head=7
tail=7
contains_first=1
contains_last=1
contains_min_plus_1=0
contains_below_min=0
contains_missing=0
removed=1
size_after=0
after_sorted=1
remove_missing=0
removed_rest=0
size_empty=0
empty_min=0
empty_inorder=0
reset=1
rebuild_reset=1
```
> 单节点树的 `height=1`，`head` 和 `tail` 都只有这一个键。删掉它之后树为空，`after_sorted=1`（空序列也算递增）、`empty_min=0`、`empty_inorder=0`——**空树上的每个操作都必须安全返回 0，而不是崩溃**。

## 提示
### 第 1 层
先想清楚每个函数的"返回值约定"，尤其是三种失败：`bst_insert` 的 `0`（键已存在）和 `-1`（内存不足）、`bst_min` 的 `0`（空树）、`bst_remove` 的 `0`（键不存在）。测试驱动的输出里专门有 `dupes`、`insert_fail`、`remove_missing`、`empty_min` 这些行来检查它们。

### 第 2 层
`bst_insert` 的递归骨架是 `root->left = insert_rec(root->left, key)`，**必须把返回值接回去**，否则新节点挂不上。查找、取最小值都是纯下降的循环，不需要递归。`bst_height` 与中序遍历都是"左递归 + 处理自己 + 右递归"的结构，区别只是"处理自己"的顺序。

### 第 3 层
删除分三种情况：叶子（`free` 后返回 `NULL`）、只有一个孩子（`free` 后返回那个孩子）、两个孩子（找到右子树最小节点 `succ`，把 `succ->key` 抄到当前节点，再去右子树里递归删除 `succ->key`）。注意第三种情况里**只能改 `key`，不能搬动子树**。最后检查：每个 `malloc` 出来的节点，是否都在 `bst_remove` 或 `bst_destroy` 里被 `free` 了？`bst_destroy` 必须是后序（先左、再右、最后自己）。

## 参考代码
```c file=solution.c
#include <stdlib.h>
#include "bst.h"

void bst_init(Bst *t) {
    t->root = NULL;
    t->size = 0;
}

static BstNode *new_node(int key) {
    BstNode *n = malloc(sizeof *n);
    if (n == NULL) {
        return NULL;
    }
    n->key = key;
    n->left = NULL;
    n->right = NULL;
    return n;
}

/* 单独封装释放：避免调用处的指针在 free 之后还有机会被误用 */
static void free_node(BstNode *n) {
    free(n);
}

/* 递归插入，*result 带回 1 / 0 / -1 */
static BstNode *insert_rec(BstNode *root, int key, int *result) {
    if (root == NULL) {
        BstNode *n = new_node(key);
        if (n == NULL) {
            *result = -1;
            return NULL;
        }
        *result = 1;
        return n;
    }
    if (key < root->key) {
        root->left = insert_rec(root->left, key, result);
    } else if (key > root->key) {
        root->right = insert_rec(root->right, key, result);
    } else {
        *result = 0;                        /* 键已存在：不插入 */
    }
    return root;
}

int bst_insert(Bst *t, int key) {
    int result = 0;
    t->root = insert_rec(t->root, key, &result);
    if (result == 1) {
        t->size++;
    }
    return result;
}

int bst_contains(const Bst *t, int key) {
    const BstNode *p = t->root;
    while (p != NULL) {
        if (key == p->key) {
            return 1;
        }
        p = (key < p->key) ? p->left : p->right;
    }
    return 0;
}

int bst_min(const Bst *t, int *out) {
    if (t->root == NULL) {
        return 0;
    }
    const BstNode *p = t->root;
    while (p->left != NULL) {
        p = p->left;                        /* 最左节点就是最小值 */
    }
    if (out != NULL) {
        *out = p->key;
    }
    return 1;
}

static int height_rec(const BstNode *n) {
    if (n == NULL) {
        return 0;
    }
    int l = height_rec(n->left);
    int r = height_rec(n->right);
    return 1 + (l > r ? l : r);
}

int bst_height(const Bst *t) {
    return height_rec(t->root);
}

static void inorder_rec(const BstNode *n, int *out, int cap, int *cnt) {
    if (n == NULL) {
        return;
    }
    inorder_rec(n->left, out, cap, cnt);
    if (*cnt < cap) {
        out[*cnt] = n->key;
    }
    (*cnt)++;
    inorder_rec(n->right, out, cap, cnt);
}

int bst_inorder(const Bst *t, int *out, int cap) {
    int cnt = 0;
    inorder_rec(t->root, out, cap, &cnt);
    return cnt;
}

static BstNode *min_node(BstNode *n) {
    while (n->left != NULL) {
        n = n->left;
    }
    return n;
}

static BstNode *remove_rec(BstNode *root, int key, int *removed) {
    if (root == NULL) {
        return NULL;
    }
    if (key < root->key) {
        root->left = remove_rec(root->left, key, removed);
        return root;
    }
    if (key > root->key) {
        root->right = remove_rec(root->right, key, removed);
        return root;
    }
    *removed = 1;
    if (root->left == NULL) {                /* 情况 1、2：右孩子顶上来 */
        BstNode *r = root->right;
        free_node(root);
        return r;
    }
    if (root->right == NULL) {               /* 情况 2：左孩子顶上来 */
        BstNode *l = root->left;
        free_node(root);
        return l;
    }
    BstNode *succ = min_node(root->right);   /* 情况 3：中序后继替换 */
    root->key = succ->key;
    int dummy = 0;
    root->right = remove_rec(root->right, succ->key, &dummy);
    return root;
}

int bst_remove(Bst *t, int key) {
    int removed = 0;
    t->root = remove_rec(t->root, key, &removed);
    if (removed) {
        t->size--;
    }
    return removed;
}

static void destroy_rec(BstNode *n) {
    if (n == NULL) {
        return;
    }
    destroy_rec(n->left);                   /* 后序：先左 */
    destroy_rec(n->right);                  /* 再右 */
    free(n);                                /* 最后自己 */
}

void bst_destroy(Bst *t) {
    destroy_rec(t->root);
    t->root = NULL;
    t->size = 0;
}
```

## 初始代码
```c file=solution.c
#include <stdlib.h>
#include "bst.h"

void bst_init(Bst *t) {
    t->root = NULL;
    t->size = 0;
}

int bst_insert(Bst *t, int key) {
    (void)t;
    (void)key;
    /* TODO: 按 key 与根的大小关系递归下降；空位处 malloc 新节点并挂上，
       键已存在返回 0，内存不足返回 -1，成功时 size 加一并返回 1 */
    return 0;
}

int bst_contains(const Bst *t, int key) {
    (void)t;
    (void)key;
    /* TODO: 从根开始，比当前节点小往左走、大往右走，相等返回 1，走到 NULL 返回 0 */
    return 0;
}

int bst_min(const Bst *t, int *out) {
    (void)t;
    (void)out;
    /* TODO: 空树返回 0；否则一路向左，把最左节点的 key 写入 *out 并返回 1 */
    return 0;
}

int bst_height(const Bst *t) {
    (void)t;
    /* TODO: 空树 0，否则 1 + max(左子树高, 右子树高) */
    return 0;
}

int bst_inorder(const Bst *t, int *out, int cap) {
    (void)t;
    (void)out;
    (void)cap;
    /* TODO: 左 - 根 - 右 递归写入 out，返回写入个数（cap 是 out 的容量） */
    return 0;
}

int bst_remove(Bst *t, int key) {
    (void)t;
    (void)key;
    /* TODO: 找到节点后按"叶子 / 一个孩子 / 两个孩子"三种情况处理，
       两个孩子时用右子树最小节点替换；被删节点必须 free，size 减一 */
    return 0;
}

void bst_destroy(Bst *t) {
    (void)t;
    /* TODO: 后序释放整棵树，并把 root / size 清零 */
}
```

## 测试驱动
```c file=bst.h
#ifndef BST_H
#define BST_H

/* 二叉搜索树节点：key 是键，left / right 指向左右子树（没有孩子时为 NULL）。 */
typedef struct BstNode {
    int key;
    struct BstNode *left;
    struct BstNode *right;
} BstNode;

/* 一棵树只需要保存根指针和节点个数。 */
typedef struct {
    BstNode *root;
    int size;
} Bst;

/* 置为空树：root = NULL、size = 0。 */
void bst_init(Bst *t);

/* 插入：成功返回 1；键已存在返回 0（树不变、size 不变）；内存不足返回 -1。
   严格要求：键相等的节点只在树里出现一次。 */
int bst_insert(Bst *t, int key);

/* 查找：存在返回 1，不存在返回 0。不修改树。 */
int bst_contains(const Bst *t, int key);

/* 最小值：成功时写入 *out 并返回 1；空树返回 0（不修改 *out）。 */
int bst_min(const Bst *t, int *out);

/* 树高：空树为 0，只有一个节点为 1。 */
int bst_height(const Bst *t);

/* 中序遍历：按从小到大把键写入 out[0..cap-1]，返回实际写入的个数。
   cap 足够大时返回值应等于 size；不修改树。 */
int bst_inorder(const Bst *t, int *out, int cap);

/* 删除：成功返回 1；键不存在返回 0。被删节点必须 free，且树仍然满足 BST 性质。 */
int bst_remove(Bst *t, int key);

/* 释放全部节点并把 root / size 清零。对空树调用也必须安全。 */
void bst_destroy(Bst *t);

#endif
```

```c file=harness.c hidden
#include <stdio.h>
#include "bst.h"

#define MAXN 80000
static int input[MAXN];
static int got[MAXN];

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &input[i]) != 1) {
            return 0;
        }
    }

    Bst t;
    bst_init(&t);
    printf("init_empty=%d\n", (t.root == NULL && t.size == 0) ? 1 : 0);

    int dupes = 0;
    int fails = 0;
    for (int i = 0; i < n; i++) {
        int r = bst_insert(&t, input[i]);
        if (r == 0) {
            dupes++;
        } else if (r < 0) {
            fails++;
            break;
        }
    }
    printf("insert_fail=%d\n", fails);
    printf("size=%d\n", t.size);
    printf("dupes=%d\n", dupes);

    int minv = input[0];
    for (int i = 1; i < n; i++) {
        if (input[i] < minv) {
            minv = input[i];
        }
    }
    int mn = 0;
    int has = bst_min(&t, &mn);
    printf("min_ok=%d\n", has);
    printf("min=%d\n", has ? mn : 0);
    printf("min_match=%d\n", (has && mn == minv) ? 1 : 0);
    printf("height=%d\n", bst_height(&t));

    int cnt = bst_inorder(&t, got, MAXN);
    printf("inorder_count=%d\n", cnt);
    int sorted = (cnt == t.size) ? 1 : 0;
    for (int i = 1; i < cnt; i++) {
        if (got[i - 1] >= got[i]) {
            sorted = 0;
        }
    }
    printf("inorder_sorted=%d\n", sorted);
    long long sum = 0;
    for (int i = 0; i < cnt; i++) {
        sum += got[i];
    }
    printf("inorder_sum=%lld\n", sum);
    printf("head=");
    for (int i = 0; i < cnt && i < 5; i++) {
        printf("%s%d", i ? " " : "", got[i]);
    }
    printf("\n");
    printf("tail=");
    int start = (cnt > 5) ? cnt - 5 : 0;
    for (int i = start; i < cnt; i++) {
        printf("%s%d", (i == start) ? "" : " ", got[i]);
    }
    printf("\n");

    printf("contains_first=%d\n", bst_contains(&t, input[0]));
    printf("contains_last=%d\n", bst_contains(&t, input[n - 1]));
    printf("contains_min_plus_1=%d\n", bst_contains(&t, minv + 1));
    printf("contains_below_min=%d\n", bst_contains(&t, minv - 1));
    printf("contains_missing=%d\n", bst_contains(&t, 1000000001));

    int removed = 0;
    for (int i = 0; i < n; i += 2) {
        if (bst_remove(&t, input[i]) == 1) {
            removed++;
        }
    }
    printf("removed=%d\n", removed);
    printf("size_after=%d\n", t.size);
    cnt = bst_inorder(&t, got, MAXN);
    int sorted2 = (cnt == t.size) ? 1 : 0;
    for (int i = 1; i < cnt; i++) {
        if (got[i - 1] >= got[i]) {
            sorted2 = 0;
        }
    }
    printf("after_sorted=%d\n", sorted2);
    printf("remove_missing=%d\n", bst_remove(&t, 1000000001));

    int rest = 0;
    for (int i = 0; i < n; i++) {
        if (bst_remove(&t, input[i]) == 1) {
            rest++;
        }
    }
    printf("removed_rest=%d\n", rest);
    printf("size_empty=%d\n", t.size);
    printf("empty_min=%d\n", bst_min(&t, &mn));
    printf("empty_inorder=%d\n", bst_inorder(&t, got, MAXN));

    bst_destroy(&t);
    printf("reset=%d\n", (t.root == NULL && t.size == 0) ? 1 : 0);

    bst_init(&t);
    for (int i = 0; i < 3; i++) {
        (void)bst_insert(&t, i * 10);
    }
    bst_destroy(&t);
    printf("rebuild_reset=%d\n", (t.root == NULL && t.size == 0) ? 1 : 0);
    return 0;
}
```

## 复杂度
插入、查找、删除、取最小值都是"沿一条路径下降"，代价 `O(h)`，`h` 是树高：键随机分布时 `h ≈ O(log n)`，键有序时退化成 `h = n`。
中序遍历与整体释放都是 `O(n)`（每个节点恰好访问一次）。
空间 `O(n)`：每个键一个节点，另加 `O(h)` 的递归栈。

## 常见错误
### `destroy` 只把根指针置空，节点一个都没释放 [LEAK]
`t->root = NULL;` 之后整棵树从程序里"消失"了，但 8 万个节点还挂在堆上。本题开启了泄漏检查，输出全对也会被判 `LEAK`，并且会报出未释放的内存是在哪一行分配的。**置空和释放是两件事：先后序 `free` 每个节点，再置空。**

```c file=solution.c expect=LEAK
#include <stdlib.h>
#include "bst.h"

void bst_init(Bst *t) {
    t->root = NULL;
    t->size = 0;
}

static BstNode *new_node(int key) {
    BstNode *n = malloc(sizeof *n);
    if (n == NULL) {
        return NULL;
    }
    n->key = key;
    n->left = NULL;
    n->right = NULL;
    return n;
}

static void free_node(BstNode *n) {
    free(n);
}

static BstNode *insert_rec(BstNode *root, int key, int *result) {
    if (root == NULL) {
        BstNode *n = new_node(key);
        if (n == NULL) {
            *result = -1;
            return NULL;
        }
        *result = 1;
        return n;
    }
    if (key < root->key) {
        root->left = insert_rec(root->left, key, result);
    } else if (key > root->key) {
        root->right = insert_rec(root->right, key, result);
    } else {
        *result = 0;
    }
    return root;
}

int bst_insert(Bst *t, int key) {
    int result = 0;
    t->root = insert_rec(t->root, key, &result);
    if (result == 1) {
        t->size++;
    }
    return result;
}

int bst_contains(const Bst *t, int key) {
    const BstNode *p = t->root;
    while (p != NULL) {
        if (key == p->key) {
            return 1;
        }
        p = (key < p->key) ? p->left : p->right;
    }
    return 0;
}

int bst_min(const Bst *t, int *out) {
    if (t->root == NULL) {
        return 0;
    }
    const BstNode *p = t->root;
    while (p->left != NULL) {
        p = p->left;
    }
    if (out != NULL) {
        *out = p->key;
    }
    return 1;
}

static int height_rec(const BstNode *n) {
    if (n == NULL) {
        return 0;
    }
    int l = height_rec(n->left);
    int r = height_rec(n->right);
    return 1 + (l > r ? l : r);
}

int bst_height(const Bst *t) {
    return height_rec(t->root);
}

static void inorder_rec(const BstNode *n, int *out, int cap, int *cnt) {
    if (n == NULL) {
        return;
    }
    inorder_rec(n->left, out, cap, cnt);
    if (*cnt < cap) {
        out[*cnt] = n->key;
    }
    (*cnt)++;
    inorder_rec(n->right, out, cap, cnt);
}

int bst_inorder(const Bst *t, int *out, int cap) {
    int cnt = 0;
    inorder_rec(t->root, out, cap, &cnt);
    return cnt;
}

static BstNode *min_node(BstNode *n) {
    while (n->left != NULL) {
        n = n->left;
    }
    return n;
}

static BstNode *remove_rec(BstNode *root, int key, int *removed) {
    if (root == NULL) {
        return NULL;
    }
    if (key < root->key) {
        root->left = remove_rec(root->left, key, removed);
        return root;
    }
    if (key > root->key) {
        root->right = remove_rec(root->right, key, removed);
        return root;
    }
    *removed = 1;
    if (root->left == NULL) {
        BstNode *r = root->right;
        free_node(root);
        return r;
    }
    if (root->right == NULL) {
        BstNode *l = root->left;
        free_node(root);
        return l;
    }
    BstNode *succ = min_node(root->right);
    root->key = succ->key;
    int dummy = 0;
    root->right = remove_rec(root->right, succ->key, &dummy);
    return root;
}

int bst_remove(Bst *t, int key) {
    int removed = 0;
    t->root = remove_rec(t->root, key, &removed);
    if (removed) {
        t->size--;
    }
    return removed;
}

void bst_destroy(Bst *t) {
    t->root = NULL;                 /* 错：只是把根指针扔了，节点全部泄漏 */
    t->size = 0;
}
```

### 中序遍历写成了先序，输出不是递增的 [WA]
`inorder` 的定义是"左 - 根 - 右"，写成"根 - 左 - 右"就是先序：`50 30 20 40 70 60 80`。测试驱动的 `inorder_sorted` 会变成 0，`head`/`tail` 也跟着错。这个错误很典型——树本身完全正确，只是**访问顺序**写错了，所以 `size`、`height`、`min` 全都对，只有遍历结果是乱的。

```c file=solution.c expect=WA
#include <stdlib.h>
#include "bst.h"

void bst_init(Bst *t) {
    t->root = NULL;
    t->size = 0;
}

static BstNode *new_node(int key) {
    BstNode *n = malloc(sizeof *n);
    if (n == NULL) {
        return NULL;
    }
    n->key = key;
    n->left = NULL;
    n->right = NULL;
    return n;
}

static void free_node(BstNode *n) {
    free(n);
}

static BstNode *insert_rec(BstNode *root, int key, int *result) {
    if (root == NULL) {
        BstNode *n = new_node(key);
        if (n == NULL) {
            *result = -1;
            return NULL;
        }
        *result = 1;
        return n;
    }
    if (key < root->key) {
        root->left = insert_rec(root->left, key, result);
    } else if (key > root->key) {
        root->right = insert_rec(root->right, key, result);
    } else {
        *result = 0;
    }
    return root;
}

int bst_insert(Bst *t, int key) {
    int result = 0;
    t->root = insert_rec(t->root, key, &result);
    if (result == 1) {
        t->size++;
    }
    return result;
}

int bst_contains(const Bst *t, int key) {
    const BstNode *p = t->root;
    while (p != NULL) {
        if (key == p->key) {
            return 1;
        }
        p = (key < p->key) ? p->left : p->right;
    }
    return 0;
}

int bst_min(const Bst *t, int *out) {
    if (t->root == NULL) {
        return 0;
    }
    const BstNode *p = t->root;
    while (p->left != NULL) {
        p = p->left;
    }
    if (out != NULL) {
        *out = p->key;
    }
    return 1;
}

static int height_rec(const BstNode *n) {
    if (n == NULL) {
        return 0;
    }
    int l = height_rec(n->left);
    int r = height_rec(n->right);
    return 1 + (l > r ? l : r);
}

int bst_height(const Bst *t) {
    return height_rec(t->root);
}

static void inorder_rec(const BstNode *n, int *out, int cap, int *cnt) {
    if (n == NULL) {
        return;
    }
    if (*cnt < cap) {                   /* 错：先访问根，成了先序遍历 */
        out[*cnt] = n->key;
    }
    (*cnt)++;
    inorder_rec(n->left, out, cap, cnt);
    inorder_rec(n->right, out, cap, cnt);
}

int bst_inorder(const Bst *t, int *out, int cap) {
    int cnt = 0;
    inorder_rec(t->root, out, cap, &cnt);
    return cnt;
}

static BstNode *min_node(BstNode *n) {
    while (n->left != NULL) {
        n = n->left;
    }
    return n;
}

static BstNode *remove_rec(BstNode *root, int key, int *removed) {
    if (root == NULL) {
        return NULL;
    }
    if (key < root->key) {
        root->left = remove_rec(root->left, key, removed);
        return root;
    }
    if (key > root->key) {
        root->right = remove_rec(root->right, key, removed);
        return root;
    }
    *removed = 1;
    if (root->left == NULL) {
        BstNode *r = root->right;
        free_node(root);
        return r;
    }
    if (root->right == NULL) {
        BstNode *l = root->left;
        free_node(root);
        return l;
    }
    BstNode *succ = min_node(root->right);
    root->key = succ->key;
    int dummy = 0;
    root->right = remove_rec(root->right, succ->key, &dummy);
    return root;
}

int bst_remove(Bst *t, int key) {
    int removed = 0;
    t->root = remove_rec(t->root, key, &removed);
    if (removed) {
        t->size--;
    }
    return removed;
}

static void destroy_rec(BstNode *n) {
    if (n == NULL) {
        return;
    }
    destroy_rec(n->left);
    destroy_rec(n->right);
    free(n);
}

void bst_destroy(Bst *t) {
    destroy_rec(t->root);
    t->root = NULL;
    t->size = 0;
}
```

### 删除时遇到"两个孩子"就直接放弃 [WA]
`removed` 会偏小、`size_after` 偏大，而且后面 `removed_rest` 也跟着错。最危险的写法是"把右子树整个丢掉"——那样 `size` 和遍历结果都会少一大截，还会额外泄漏一整棵子树。正确做法只有一种：**用中序后继的键覆盖当前节点，再去右子树删掉后继**。

```c file=solution.c expect=WA
#include <stdlib.h>
#include "bst.h"

void bst_init(Bst *t) {
    t->root = NULL;
    t->size = 0;
}

static BstNode *new_node(int key) {
    BstNode *n = malloc(sizeof *n);
    if (n == NULL) {
        return NULL;
    }
    n->key = key;
    n->left = NULL;
    n->right = NULL;
    return n;
}

static void free_node(BstNode *n) {
    free(n);
}

static BstNode *insert_rec(BstNode *root, int key, int *result) {
    if (root == NULL) {
        BstNode *n = new_node(key);
        if (n == NULL) {
            *result = -1;
            return NULL;
        }
        *result = 1;
        return n;
    }
    if (key < root->key) {
        root->left = insert_rec(root->left, key, result);
    } else if (key > root->key) {
        root->right = insert_rec(root->right, key, result);
    } else {
        *result = 0;
    }
    return root;
}

int bst_insert(Bst *t, int key) {
    int result = 0;
    t->root = insert_rec(t->root, key, &result);
    if (result == 1) {
        t->size++;
    }
    return result;
}

int bst_contains(const Bst *t, int key) {
    const BstNode *p = t->root;
    while (p != NULL) {
        if (key == p->key) {
            return 1;
        }
        p = (key < p->key) ? p->left : p->right;
    }
    return 0;
}

int bst_min(const Bst *t, int *out) {
    if (t->root == NULL) {
        return 0;
    }
    const BstNode *p = t->root;
    while (p->left != NULL) {
        p = p->left;
    }
    if (out != NULL) {
        *out = p->key;
    }
    return 1;
}

static int height_rec(const BstNode *n) {
    if (n == NULL) {
        return 0;
    }
    int l = height_rec(n->left);
    int r = height_rec(n->right);
    return 1 + (l > r ? l : r);
}

int bst_height(const Bst *t) {
    return height_rec(t->root);
}

static void inorder_rec(const BstNode *n, int *out, int cap, int *cnt) {
    if (n == NULL) {
        return;
    }
    inorder_rec(n->left, out, cap, cnt);
    if (*cnt < cap) {
        out[*cnt] = n->key;
    }
    (*cnt)++;
    inorder_rec(n->right, out, cap, cnt);
}

int bst_inorder(const Bst *t, int *out, int cap) {
    int cnt = 0;
    inorder_rec(t->root, out, cap, &cnt);
    return cnt;
}

static BstNode *remove_rec(BstNode *root, int key, int *removed) {
    if (root == NULL) {
        return NULL;
    }
    if (key < root->key) {
        root->left = remove_rec(root->left, key, removed);
        return root;
    }
    if (key > root->key) {
        root->right = remove_rec(root->right, key, removed);
        return root;
    }
    if (root->left != NULL && root->right != NULL) {
        return root;                    /* 错：两个孩子时直接放弃删除 */
    }
    *removed = 1;
    if (root->left == NULL) {
        BstNode *r = root->right;
        free_node(root);
        return r;
    }
    BstNode *l = root->left;
    free_node(root);
    return l;
}

int bst_remove(Bst *t, int key) {
    int removed = 0;
    t->root = remove_rec(t->root, key, &removed);
    if (removed) {
        t->size--;
    }
    return removed;
}

static void destroy_rec(BstNode *n) {
    if (n == NULL) {
        return;
    }
    destroy_rec(n->left);
    destroy_rec(n->right);
    free(n);
}

void bst_destroy(Bst *t) {
    destroy_rec(t->root);
    t->root = NULL;
    t->size = 0;
}
```

### 把相等的键插到右边，树里出现重复键 [WA]
判据是 `if (key < root->key) … else …`：`else` 分支把"相等"也当成"更大"处理，于是同一个键会重复插入。后果是 `size` 偏大、`dupes` 恒为 0、`inorder` 里出现相邻的重复值（`inorder_sorted` 变 0）。BST 里"相等"必须单独处理：要么拒绝插入（本题要求），要么约定计数。

### 删除后忘了让 `size` 减一 [WA]
节点确实 `free` 了、树也确实对了，但 `size` 比真实节点数多。测试驱动会用 `cnt == t.size` 判断中序结果是否完整，于是 `inorder_sorted`、`size_after` 一起错。这类"辅助变量和结构不同步"的 bug 在不变量上特别常见——**凡是修改树的函数，都要问一句：`size` 更新了吗？**

## 测试用例
### 01 sample 示例 1
```in
7
50 30 70 20 40 60 80
```
```out
init_empty=1
insert_fail=0
size=7
dupes=0
min_ok=1
min=20
min_match=1
height=3
inorder_count=7
inorder_sorted=1
inorder_sum=350
head=20 30 40 50 60
tail=40 50 60 70 80
contains_first=1
contains_last=1
contains_min_plus_1=0
contains_below_min=0
contains_missing=0
removed=4
size_after=3
after_sorted=1
remove_missing=0
removed_rest=3
size_empty=0
empty_min=0
empty_inorder=0
reset=1
rebuild_reset=1
```

### 02 sample 示例 2
```in
1
7
```
```out
init_empty=1
insert_fail=0
size=1
dupes=0
min_ok=1
min=7
min_match=1
height=1
inorder_count=1
inorder_sorted=1
inorder_sum=7
head=7
tail=7
contains_first=1
contains_last=1
contains_min_plus_1=0
contains_below_min=0
contains_missing=0
removed=1
size_after=0
after_sorted=1
remove_missing=0
removed_rest=0
size_empty=0
empty_min=0
empty_inorder=0
reset=1
rebuild_reset=1
```

### 生成 stress 大规模、退化形状与重复键
```js gen
const cases = [];

/* 把"隐藏测试驱动会打印的东西"独立算出来：这里用一棵普通的 BST 模型（不调用参考实现） */
function build(keys) {
  const K = [];
  const L = [];
  const R = [];
  const seen = new Set();
  let root = -1;
  let dupes = 0;
  for (const key of keys) {
    if (seen.has(key)) {
      dupes++;
      continue;
    }
    seen.add(key);
    const id = K.length;
    K.push(key);
    L.push(-1);
    R.push(-1);
    if (root < 0) {
      root = id;
      continue;
    }
    let cur = root;
    for (;;) {
      if (key < K[cur]) {
        if (L[cur] < 0) {
          L[cur] = id;
          break;
        }
        cur = L[cur];
      } else {
        if (R[cur] < 0) {
          R[cur] = id;
          break;
        }
        cur = R[cur];
      }
    }
  }
  const height = (id) => (id < 0 ? 0 : 1 + Math.max(height(L[id]), height(R[id])));
  return { size: K.length, dupes, height: height(root) };
}

function render(keys) {
  const { size, dupes, height } = build(keys);
  const distinct = [...new Set(keys)].sort((a, b) => a - b);
  let minv = keys[0];
  for (const k of keys) if (k < minv) minv = k;
  let sum = 0;
  for (const k of distinct) sum += k;

  const present = new Set(distinct);
  let removed = 0;
  for (let i = 0; i < keys.length; i += 2) if (present.delete(keys[i])) removed++;
  const sizeAfter = present.size;
  let rest = 0;
  for (const k of keys) if (present.delete(k)) rest++;

  const has1 = distinct.includes(minv + 1) ? 1 : 0;
  return [
    'init_empty=1',
    'insert_fail=0',
    `size=${size}`,
    `dupes=${dupes}`,
    'min_ok=1',
    `min=${minv}`,
    'min_match=1',
    `height=${height}`,
    `inorder_count=${size}`,
    'inorder_sorted=1',
    `inorder_sum=${sum}`,
    `head=${distinct.slice(0, 5).join(' ')}`,
    `tail=${distinct.slice(-5).join(' ')}`,
    'contains_first=1',
    'contains_last=1',
    `contains_min_plus_1=${has1}`,
    'contains_below_min=0',
    'contains_missing=0',
    `removed=${removed}`,
    `size_after=${sizeAfter}`,
    'after_sorted=1',
    'remove_missing=0',
    `removed_rest=${rest}`,
    'size_empty=0',
    'empty_min=0',
    'empty_inorder=0',
    'reset=1',
    'rebuild_reset=1',
  ].join('\n') + '\n';
}

function io(keys) {
  return { input: `${keys.length}\n${keys.join(' ')}\n`, output: render(keys) };
}

/* boundary：8 万个随机键，最大规模 */
{
  const keys = [];
  for (let i = 0; i < 80000; i++) keys.push(rng.int(-1000000000, 1000000000));
  cases.push({ kind: 'boundary', category: '8 万个随机键', ...io(keys) });
}

/* trap：升序 2000 个键，树退化成一条链，height = 2000 */
{
  const keys = [];
  for (let i = 1; i <= 2000; i++) keys.push(i * 3);
  cases.push({ kind: 'trap', category: '升序 2000 个键，树高 2000', ...io(keys) });
}

/* degenerate：1000 个完全相同的键，只应留下 1 个节点 */
{
  const keys = new Array(1000).fill(7);
  cases.push({ kind: 'degenerate', category: '1000 个相同的键，只留下 1 个节点', ...io(keys) });
}

/* degenerate：两个相同的键 */
{
  const keys = [5, 5];
  cases.push({ kind: 'degenerate', category: '两个相同的键，dupes=1', ...io(keys) });
}

/* trap：大量重复键（键值只有 0..40） */
{
  const keys = [];
  for (let i = 0; i < 5000; i++) keys.push(rng.int(0, 40));
  cases.push({ kind: 'trap', category: '5000 个键只取自 0..40，重复极多', ...io(keys) });
}

/* trap：负键、只有两个键且逆序（删除根时只有左孩子） */
{
  const keys = [-1000000000, 1000000000];
  cases.push({ kind: 'trap', category: '两个键一负一正，删除时只剩单孩子', ...io(keys) });
}

/* normal：3000 个随机键 */
{
  const keys = [];
  for (let i = 0; i < 3000; i++) keys.push(rng.int(-5000, 5000));
  cases.push({ kind: 'normal', category: '3000 个随机键，含少量重复', ...io(keys) });
}

return cases;
```
