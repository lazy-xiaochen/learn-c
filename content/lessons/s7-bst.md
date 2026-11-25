---
id: s7-bst
---

## 讲解

### 一条不变式决定了二叉搜索树的全部操作
二叉搜索树（BST）没有数组那样的"下标"，它的能力完全来自一条**排序不变式**：

> 对树中每个节点 `x`：**`x` 的左子树里所有键都小于 `x->key`，右子树里所有键都大于 `x->key`**（递归地成立）。

注意这句话说的是"整棵子树"，不是"左孩子/右孩子"。很多人凭直觉写成 `left->key < x->key && x->key < right->key`，这只能保证局部有序，下面这种树能骗过局部检查，但中序遍历出来是乱的：

```text
        10
       /  \
      5    15
          /
         6      ← 6 在 10 的右子树里，却比 10 小：局部检查通过，整体不合法
```

所以判断一棵树是不是 BST 的可靠办法不是看父子关系，而是**中序遍历必须严格递增**。这条性质是归纳出来的：左子树所有键 < 根 < 右子树所有键，而中序遍历恰好是"左 → 根 → 右"，于是整个序列递增。

先看一遍完整的插入 + 中序遍历。树里塞了重复的 `30`，`insert` 选择"已存在就不插"，所以最后只有 7 个节点：

```c run id=bst-inorder
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int key;
    struct Node *left;
    struct Node *right;
} Node;

static Node *new_node(int key) {
    Node *n = malloc(sizeof *n);        /* 节点都在堆上：树能长多大由输入决定 */
    if (n == NULL) {
        return NULL;
    }
    n->key = key;
    n->left = NULL;
    n->right = NULL;
    return n;
}

static Node *insert(Node *root, int key) {
    if (root == NULL) {
        return new_node(key);           /* 走到空位，就在这里挂新节点 */
    }
    if (key < root->key) {
        root->left = insert(root->left, key);
    } else if (key > root->key) {
        root->right = insert(root->right, key);
    }
    return root;                        /* key 已存在：什么都不做 */
}

static void inorder(const Node *root) {
    if (root == NULL) {
        return;
    }
    inorder(root->left);
    printf("%d ", root->key);           /* 根在中间访问 → 输出有序 */
    inorder(root->right);
}

static void free_tree(Node *root) {
    if (root == NULL) {
        return;
    }
    free_tree(root->left);              /* 先释放两棵子树 */
    free_tree(root->right);
    free(root);                         /* 最后才释放自己 */
}

int main(void) {
    int keys[] = { 50, 30, 70, 20, 40, 60, 80, 30 };
    int n = (int)(sizeof keys / sizeof keys[0]);
    Node *root = NULL;

    for (int i = 0; i < n; i++) {
        root = insert(root, keys[i]);
    }
    printf("插入 %d 个键之后，中序遍历：", n);
    inorder(root);
    printf("\n");
    free_tree(root);
    return 0;
}
```
```output
插入 8 个键之后，中序遍历：20 30 40 50 60 70 80
```

### 为什么查找是 O(h)：每一层只走一个分支
查找的写法就是插入去掉"挂新节点"那一步：

```text
while (root != NULL) {
    if (key == root->key) return 1;         /* 命中 */
    root = (key < root->key) ? root->left : root->right;
}
return 0;                                   /* 走到空位，没找到 */
```

关键在于**每次比较之后只可能往一个方向走**：要么进左子树，要么进右子树，不可能两个都进。所以查找访问的节点数正好等于"从根到目标的那条路径长度 + 1"，也就是树高 `h`，而不是节点数 `n`。

`h` 有多大？这完全取决于树的**形状**，而形状取决于**插入顺序**：

```c run id=bst-height
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int key;
    struct Node *left;
    struct Node *right;
} Node;

static Node *new_node(int key) {
    Node *n = malloc(sizeof *n);
    if (n == NULL) {
        return NULL;
    }
    n->key = key;
    n->left = NULL;
    n->right = NULL;
    return n;
}

static Node *insert(Node *root, int key) {
    if (root == NULL) {
        return new_node(key);
    }
    if (key < root->key) {
        root->left = insert(root->left, key);
    } else if (key > root->key) {
        root->right = insert(root->right, key);
    }
    return root;
}

static int height(const Node *root) {
    if (root == NULL) {
        return 0;                       /* 空树高度 0，单节点高度 1 */
    }
    int l = height(root->left);
    int r = height(root->right);
    return 1 + (l > r ? l : r);
}

static int count(const Node *root) {
    return root == NULL ? 0 : 1 + count(root->left) + count(root->right);
}

static void free_tree(Node *root) {
    if (root == NULL) {
        return;
    }
    free_tree(root->left);
    free_tree(root->right);
    free(root);
}

int main(void) {
    int spread[] = { 50, 30, 70, 20, 40, 60, 80 };
    int asc[] = { 20, 30, 40, 50, 60, 70, 80 };
    Node *a = NULL;
    Node *b = NULL;

    for (int i = 0; i < 7; i++) {
        a = insert(a, spread[i]);
        b = insert(b, asc[i]);
    }
    printf("乱序插入：节点 %d 个，高度 %d\n", count(a), height(a));
    printf("升序插入：节点 %d 个，高度 %d\n", count(b), height(b));
    printf("7 个节点最理想的形状是满二叉树，高度 3（2^3 - 1 = 7）\n");
    free_tree(a);
    free_tree(b);
    return 0;
}
```
```output
乱序插入：节点 7 个，高度 3
升序插入：节点 7 个，高度 7
7 个节点最理想的形状是满二叉树，高度 3（2^3 - 1 = 7）
```

同样的 7 个键，只是插入顺序不同，高度从 3 变成 7。升序插入时每个新键都比所有已有键大，只能一路挂在右边，树退化成一条链表，此时 `h = n`，查找变成 O(n)。这就是为什么"二叉搜索树查找是 O(log n)"这句话**必须**加上"树是平衡的"这个前提；标准的 BST 不保证平衡。

常用结论：高度为 `h` 的二叉树最多有 `2^h - 1` 个节点，反过来 `n` 个节点的树高最少是 `⌈log2(n+1)⌉`、最多是 `n`。所以 `O(h)` 在两个极端之间是 `O(log n)` 到 `O(n)`。

下面这棵树是"升序插入 20 30 40 50 60 70 80"之后的堆上布局。每个节点是 `malloc` 出来的一块内存，里面只有键和两个指针——**树的关系完全由指针体现，没有"孩子数组"**：

```memory title="退化链（升序插入 20 30 40 50 60 70 80）的节点布局，地址为示意"
地址 | 内容 | 变量 | 说明
栈（8 字节） | 0x602000000010 | root | 指向第一个节点，树本身只有这一个指针
0x602000000010 | key=20 left=NULL right=0x602000000040 | n1 | 根节点，没有左孩子
0x602000000040 | key=30 left=NULL right=0x602000000070 | n2 | 只有右孩子 → 一路向右
0x602000000070 | key=40 left=NULL right=0x6020000000a0 | n3 | 每个节点只挂一个孩子
0x6020000000a0 | key=50 left=NULL right=0x6020000000d0 | n4 | 高度 = 节点数 = 7
0x6020000000d0 | key=60 left=NULL right=0x602000000100 | n5 | 查找 80 要从头走到尾
0x602000000100 | key=70 left=NULL right=0x602000000130 | n6 | 仍然只有右孩子
0x602000000130 | key=80 left=NULL right=NULL | n7 | 叶子：两个指针都是 NULL
```

对照一下"乱序插入"（50 30 70 20 40 60 80）之后的样子：根是 50，左子树 30(20,40)，右子树 70(60,80)，高度 3，查找任何键都不超过 3 次比较。**内存里的节点个数一模一样（7 个），区别只在指针怎么连**——这也说明"数据结构"这个词的重点在"结构"。

### 插入、查找、取最值：都是沿着一条路径走到底
BST 里"最左边的节点"就是最小值，"最右边的节点"就是最大值。它们和查找共用同一条下降路径：

```c run id=bst-search-trace
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int key;
    struct Node *left;
    struct Node *right;
} Node;

static Node *new_node(int key) {
    Node *n = malloc(sizeof *n);
    if (n == NULL) {
        return NULL;
    }
    n->key = key;
    n->left = NULL;
    n->right = NULL;
    return n;
}

static Node *insert(Node *root, int key) {
    if (root == NULL) {
        return new_node(key);
    }
    if (key < root->key) {
        root->left = insert(root->left, key);
    } else if (key > root->key) {
        root->right = insert(root->right, key);
    }
    return root;
}

/* 把查找路径打印出来：访问了几个节点，就是几次比较 */
static void trace(const Node *root, int key) {
    int path[64];
    int steps = 0;
    int found = 0;

    while (root != NULL) {
        path[steps++] = root->key;
        if (root->key == key) {
            found = 1;
            break;
        }
        root = (key < root->key) ? root->left : root->right;
    }
    printf("查找 %d：", key);
    for (int i = 0; i < steps; i++) {
        printf("%s%d", i ? " -> " : "", path[i]);
    }
    if (found) {
        printf("（命中，%d 次比较）\n", steps);
    } else {
        printf("（未命中，%d 次比较）\n", steps);
    }
}

static int min_key(const Node *root, int *out) {
    if (root == NULL) {
        return 0;                       /* 空树没有最小值 */
    }
    while (root->left != NULL) {
        root = root->left;              /* 最小值 = 最左节点 */
    }
    *out = root->key;
    return 1;
}

static void free_tree(Node *root) {
    if (root == NULL) {
        return;
    }
    free_tree(root->left);
    free_tree(root->right);
    free(root);
}

int main(void) {
    int keys[] = { 50, 30, 70, 20, 40, 60, 80 };
    Node *root = NULL;

    for (int i = 0; i < 7; i++) {
        root = insert(root, keys[i]);
    }
    trace(root, 40);
    trace(root, 65);

    int mv = 0;
    if (min_key(root, &mv)) {
        printf("最小值 = %d（最左节点）\n", mv);
    }
    free_tree(root);
    return 0;
}
```
```output
查找 40：50 -> 30 -> 40（命中，3 次比较）
查找 65：50 -> 70 -> 60（未命中，3 次比较）
最小值 = 20（最左节点）
```

注意 `65` 那条路径：`50 -> 70 -> 60`，然后 `60->right` 是 `NULL`，于是结论是"不存在"。**找不到也要走完整条路径**，比较次数仍然是 `h` 量级，不是"提前知道没有"。

### 删除为什么最麻烦：三种情况，其中一种要动整棵子树
插入只会让树变高，删除却可能让树"断掉"。按被删节点的孩子个数分三种：

1. **叶子（0 个孩子）**：直接 `free`，把父节点的对应指针置 `NULL`；
2. **只有 1 个孩子**：把这个孩子"顶上来"接替自己的位置，再 `free` 自己；
3. **有 2 个孩子**：不能简单顶替——左右两棵子树都得保留。做法是找一个**替身**：右子树的**最小节点**（也就是中序后继，它一定没有左孩子），把它的键抄到当前节点上，然后去右子树里把那个替身删掉（退化成情况 1 或 2）。

为什么"中序后继"能当替身？因为它比左子树所有键都大、又比右子树其余键都小，正好卡在"根"该在的位置上，替换后整棵树的排序不变式仍然成立。左子树的**最大节点**（中序前驱）同样可以。

```c run id=bst-delete
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int key;
    struct Node *left;
    struct Node *right;
} Node;

static Node *new_node(int key) {
    Node *n = malloc(sizeof *n);
    if (n == NULL) {
        return NULL;
    }
    n->key = key;
    n->left = NULL;
    n->right = NULL;
    return n;
}

static Node *insert(Node *root, int key) {
    if (root == NULL) {
        return new_node(key);
    }
    if (key < root->key) {
        root->left = insert(root->left, key);
    } else if (key > root->key) {
        root->right = insert(root->right, key);
    }
    return root;
}

/* 用括号表示法打印形状：50(30(20)(40))(70) */
static void show(const Node *root) {
    if (root == NULL) {
        printf("-");
        return;
    }
    printf("%d", root->key);
    if (root->left != NULL || root->right != NULL) {
        printf("(");
        show(root->left);
        printf(")(");
        show(root->right);
        printf(")");
    }
}

static Node *delete_key(Node *root, int key) {
    if (root == NULL) {
        return NULL;                    /* 没找到：树不变 */
    }
    if (key < root->key) {
        root->left = delete_key(root->left, key);
        return root;
    }
    if (key > root->key) {
        root->right = delete_key(root->right, key);
        return root;
    }
    /* 以下是被删节点就是 root 的情况 */
    if (root->left == NULL) {           /* 情况 1、2：右孩子顶上来（可能为 NULL） */
        Node *r = root->right;
        free(root);
        return r;
    }
    if (root->right == NULL) {          /* 情况 2：左孩子顶上来 */
        Node *l = root->left;
        free(root);
        return l;
    }
    /* 情况 3：两个孩子都在，找右子树最小节点当替身 */
    Node *succ = root->right;
    while (succ->left != NULL) {
        succ = succ->left;
    }
    root->key = succ->key;              /* 只抄键，节点结构不动 */
    root->right = delete_key(root->right, succ->key);  /* 再去右子树删掉替身 */
    return root;
}

static void free_tree(Node *root) {
    if (root == NULL) {
        return;
    }
    free_tree(root->left);
    free_tree(root->right);
    free(root);
}

int main(void) {
    int keys[] = { 50, 30, 70, 20, 40, 60, 80 };
    Node *root = NULL;

    for (int i = 0; i < 7; i++) {
        root = insert(root, keys[i]);
    }
    printf("删除前：");
    show(root);
    printf("\n");

    root = delete_key(root, 50);        /* 删根：两个孩子都在，用后继 60 替换 */
    printf("删除 50 后：");
    show(root);
    printf("\n");

    free_tree(root);
    return 0;
}
```
```output
删除前：50(30(20)(40))(70(60)(80))
删除 50 后：60(30(20)(40))(70(-)(80))
```

`show` 里 `-` 表示"这里是空"。输出说明了三件事：根从 50 换成了 60；`30` 那棵子树**一个指针都没动**；而替身 60 原来的位置空了出来，所以 70 的左边变成 `-`。这正是"只抄键、不搬子树"的好处——如果真去搬动子树，父指针、孩子指针要改好几处，稍不留神就会丢节点。

### 释放必须后序：先父后子等于把子树的地址扔了
树的所有节点都是 `malloc` 出来的，程序结束前必须全部 `free`。但释放顺序不能随便：**如果先 `free(root)`，`root->left`、`root->right` 就跟着失效了**，你再也拿不到子树的位置，那些节点永久泄漏；访问它们则是释放后使用（use-after-free）。

正确顺序是后序：左、右、自己。它和"先序遍历建树"正好相反，也和"先释放父节点"的直觉相反：

```c run id=bst-free-count
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int key;
    struct Node *left;
    struct Node *right;
} Node;

static int live_nodes;                  /* 当前还活着的节点数 */

static Node *new_node(int key) {
    Node *n = malloc(sizeof *n);
    if (n == NULL) {
        return NULL;
    }
    n->key = key;
    n->left = NULL;
    n->right = NULL;
    live_nodes++;
    return n;
}

static Node *insert(Node *root, int key) {
    if (root == NULL) {
        return new_node(key);
    }
    if (key < root->key) {
        root->left = insert(root->left, key);
    } else if (key > root->key) {
        root->right = insert(root->right, key);
    }
    return root;
}

/* 后序释放：先子树，后自己。返回释放了几个节点 */
static int free_postorder(Node *root) {
    if (root == NULL) {
        return 0;
    }
    int n = free_postorder(root->left); /* 左子树全部归还 */
    n += free_postorder(root->right);   /* 右子树全部归还 */
    free(root);                         /* 最后才轮到自己 */
    live_nodes--;
    return n + 1;
}

int main(void) {
    int keys[] = { 50, 30, 70, 20, 40, 60, 80 };
    Node *root = NULL;

    for (int i = 0; i < 7; i++) {
        root = insert(root, keys[i]);
    }
    printf("建树后有 %d 个节点在堆上\n", live_nodes);
    printf("后序释放了 %d 个节点\n", free_postorder(root));
    printf("释放后还剩 %d 个节点\n", live_nodes);
    return 0;
}
```
```output
建树后有 7 个节点在堆上
后序释放了 7 个节点
释放后还剩 0 个节点
```

`free_postorder` 的返回值是"这条子树一共归还了几个节点"，它顺便给出了一个自检手段：**返回值必须等于 `live_nodes` 的减少量**。平台上开启内存泄漏检查时，判题器会在程序结束时报出"还有多少字节未释放、是在第几行分配的"，比任何手工计数都准。

## 编译与运行

本平台用 Clang（x86-64 Windows）。命令行下这样编译运行：

```bash
gcc -std=c17 -Wall -Wextra bst.c -o bst
./bst
```

```bash
clang -std=c17 -Wall -Wextra bst.c -o bst
./bst
```

开发和调试时强烈建议打开 AddressSanitizer，它能在越界、释放后使用、泄漏发生的那一刻报出源码行号：

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=address,undefined bst.c -o bst
./bst
```

几点说明：

- `-fsanitize=address` 会在程序退出时打印泄漏报告的摘要（`detected memory leaks`）。本平台判题时把泄漏单独判为 `LEAK`，所以"输出正确"不等于"通过"；
- Windows 默认线程栈只有 1MB，而递归建树/递归释放的最坏深度可以到 `n`。本平台判题时给程序 64MB 栈（`-Wl,--stack,67108864`），自己在本机试验大输入时也建议加上这个链接选项，否则可能先崩在栈溢出上；
- 想看指针到底连成什么样，可以临时打印 `root`、`root->left` 的值（`%p`）。**注意：学习内容里的示例输出不允许依赖具体地址**，地址每次运行都不同，只能用来自己观察。

## 常见错误

### 只比较左右孩子，用"局部有序"代替"整体有序" [WA]
`left->key < x->key && x->key < right->key` 只能保证父子之间有序。下面这段代码的 `is_bst_naive` 对那棵"6 在 10 右边"的错树返回 1（认为合法），而真正的中序遍历顺序是 `5 10 6 15`，根本不递增。用这种方法去校验自己的建树结果，会把错误藏起来。

```c run id=bst-wrong-local-check
#include <stdio.h>

typedef struct Node {
    int key;
    struct Node *left;
    struct Node *right;
} Node;

static int is_bst_naive(const Node *root) {
    if (root == NULL) {
        return 1;
    }
    if (root->left != NULL && root->left->key >= root->key) {
        return 0;
    }
    if (root->right != NULL && root->right->key <= root->key) {
        return 0;
    }
    return is_bst_naive(root->left) && is_bst_naive(root->right);
}

int main(void) {
    /* 手搭一棵"局部都对、整体不合法"的树：6 在 10 的右子树里，却比 10 小 */
    Node n15 = { 15, NULL, NULL };
    Node n6 = { 6, NULL, NULL };
    Node n5 = { 5, NULL, NULL };
    Node n10 = { 10, &n5, &n15 };
    n15.left = &n6;

    printf("局部检查结果 = %d（1 表示它认为合法，这是错的）\n", is_bst_naive(&n10));
    printf("中序遍历 = 5 10 6 15，并不递增\n");
    return 0;
}
```
```output
局部检查结果 = 1（1 表示它认为合法，这是错的）
中序遍历 = 5 10 6 15，并不递增
```

正确做法有两种：中序遍历检查递增，或者递归时**带上取值范围**（`is_bst(root, lo, hi)`，左子树的上界是 `root->key`，右子树的下界是 `root->key`）。

### 递归插入忘了把返回值接回去，新节点直接丢失 [WA]
写成 `insert(root->left, key);`（丢掉返回值）时，`new_node` 分配的节点确实建好了，但父节点的 `left` 指针没有更新，那棵新子树**谁也指不到**——输出的结果少了一个键，同时还泄漏了一块内存。所有"返回新子树根"的递归函数（插入、删除）都必须写成 `root->left = insert(root->left, key);`。

### 释放用了先序：父节点一 free，子树的地址就没了 [RE]
```c run id=bst-free-preorder expect=RE
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int key;
    struct Node *left;
    struct Node *right;
} Node;

static Node *new_node(int key) {
    Node *n = malloc(sizeof *n);
    if (n == NULL) {
        return NULL;
    }
    n->key = key;
    n->left = NULL;
    n->right = NULL;
    return n;
}

static void free_wrong(Node *root) {
    if (root == NULL) {
        return;
    }
    free(root);                 /* 错：先释放父亲 */
    free_wrong(root->left);     /* 这里读的是已释放内存里的指针 */
    free_wrong(root->right);
}

int main(void) {
    Node *root = new_node(50);
    root->left = new_node(30);
    root->right = new_node(70);
    free_wrong(root);
    printf("如果这行被打印出来，说明你的机器这次恰好没崩\n");
    return 0;
}
```

这段代码在某些机器上"看起来正常"——那是运气。开启 AddressSanitizer 之后它会稳定报 `heap-use-after-free`（本平台判 `RE`），因为 `free_wrong(root->left)` 里读取 `root->left` 时，`root` 指向的内存已经归还给堆了。

### 删除有两个孩子的节点时，把整棵子树搬来搬去 [RE]
用"找后继 → 抄键 → 递归删除后继"的写法只需要改一个键值；如果改成手动搬动指针（先把左子树挂到后继左边，再把右子树挂到某处），很容易漏掉某个分支或者把同一个节点挂两次，结果是节点丢失或重复释放。记住：**删除的复杂度只在"找到替身"这一步，结构调整越少越安全。**

## 客观题

### q-s7-bst-1 single
一棵二叉搜索树里有 `n` 个节点、高度为 `h`（单节点高度为 1）。关于"查找一个键需要比较多少次"，下面哪个说法是正确的？

- [x] 最多 `h` 次；按键升序插入时 `h = n`，查找退化成 O(n)
  > 正确。每次比较后只会进入左子树或右子树中的一个，所以访问节点数等于根到目标路径上的节点数，最多 `h`。升序插入时每个新键都比已有的所有键大，只能挂在最右边，树退化成一条链，`h = n`。这也说明"BST 查找 O(log n)"必须补一句"树平衡"才成立。
- [ ] 平均 `O(log n)`，因为二叉搜索树会自动保持平衡
  > 错。普通 BST 没有任何再平衡机制：插入只按大小往下走，形状完全由插入顺序决定。自动平衡是 AVL 树、红黑树这些"平衡树"才有的性质，它们在插入/删除时会旋转调整，代价是代码复杂得多。
- [ ] 中序遍历有序就等价于"每个节点的左孩子比它小、右孩子比它大"
  > 错。中序遍历有序是 BST 的**完整**判定条件；而父子局部有序只是它的必要条件，`10` 的右子树里放一个 `6` 依然满足父子关系，但中序遍历会乱序。判定时要看整棵子树，或者带上取值范围递归。
- [ ] 删除有两个孩子的节点时，必须把它的左子树整体挪到右子树下面
  > 错。标准做法是找一个替身——右子树的最小节点（中序后继）或左子树的最大节点（中序前驱）——把**键**抄到被删节点上，再去对应的子树里删掉替身。整棵左子树完全不用动，指针只在一条路径上变化。
