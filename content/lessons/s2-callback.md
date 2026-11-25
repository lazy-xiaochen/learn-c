---
id: s2-callback
---

## 讲解

### 把"做什么"当参数传进去
普通函数的参数传的是**数据**；回调函数传的是**一段代码的入口地址**，也就是函数指针。被调用的函数在合适的时机"回过头来"调用你传进去的函数——这就是"回调（callback）"这个名字的来源。

C 里函数名在表达式里会自动退化成"指向该函数的指针"（除了 `sizeof` 和 `&` 两个场合），所以直接把函数名当参数写就行：

```c run id=cb-foreach
#include <stdio.h>

static void print_int(int x) { printf("%d ", x); }
static void print_square(int x) { printf("%d ", x * x); }

/* for_each 只负责“遍历”，每一步做什么由参数 fn 决定 */
static void for_each(const int *a, int n, void (*fn)(int)) {
    for (int i = 0; i < n; i++) {
        fn(a[i]);        /* 通过函数指针调用：调用谁，运行时才知道 */
    }
}

int main(void) {
    int a[5] = {1, 2, 3, 4, 5};
    for_each(a, 5, print_int);
    printf("\n");
    for_each(a, 5, print_square);
    printf("\n");
    return 0;
}
```
```output
1 2 3 4 5
1 4 9 16 25
```

`for_each` 只写了一遍，却产生了两种行为。它**完全不认识** `print_int` 和 `print_square`——它只知道"有个函数，收一个 `int`，返回 `void`"。把"框架"（怎么遍历）和"策略"（每步干什么）分开，正是回调最大的价值。

### 参数类型怎么写：从右往左读
`void (*fn)(int)` 读作：`fn` 是一个指针，指向"收 `int`、返回 `void`"的函数。加 `typedef` 会好读很多：

```c
typedef void (*IntVisitor)(int);      /* IntVisitor 是一种函数指针类型 */
static void for_each(const int *a, int n, IntVisitor fn);
```

注意 `void *fn(int)` 和 `void (*fn)(int)` 是两回事：前者是"返回 `void *` 的函数"，后者才是"指向函数的指针"。这是初学者最容易写错的地方之一。

### `qsort`：标准库里的回调典范
`qsort` 的声明是：

```c
void qsort(void *base, size_t nmemb, size_t size,
           int (*compar)(const void *, const void *));
```

它要排任意类型的数组，所以只能用 `void *` 拿首地址 + 用 `size` 知道每个元素多大；但"两个元素谁在前"它不可能知道，于是把这件事交给你——用一个比较函数告诉它。

比较函数的约定是：

| 返回值 | 含义 |
|---|---|
| 负数 | 第一个参数应排在第二个**前面** |
| 0 | 两者"相等"，顺序随意 |
| 正数 | 第一个参数应排在第二个**后面** |

```c run id=cb-qsort
#include <stdio.h>
#include <stdlib.h>

static int cmp_int(const void *a, const void *b) {
    int x = *(const int *)a;    /* qsort 传来的是“元素的地址” */
    int y = *(const int *)b;
    if (x < y) return -1;
    if (x > y) return 1;
    return 0;
}

int main(void) {
    int a[6] = {5, -3, 9, 0, 9, -7};
    qsort(a, 6, sizeof a[0], cmp_int);
    for (int i = 0; i < 6; i++) {
        printf("%d%c", a[i], i == 5 ? '\n' : ' ');
    }
    return 0;
}
```
```output
-7 -3 0 5 9 9
```

两个关键点：

1. **参数是"指向元素的指针"**。`qsort` 内部调用 `compar(&a[i], &a[j])`，所以对 `int` 数组，`a` 参数的真实类型是 `const int *`，必须转回去再解引用。
2. **返回值只需符号正确**。`qsort` 只判断正负，不要求恰好是 −1/0/1。

### 换一个比较函数，就换一种排序规则
排序算法（快排）只做"比较 + 交换"，规则完全由比较函数决定。所以同一份 `qsort` 调用代码，传不同的函数指针就得到不同的顺序：

```c run id=cb-modes
#include <stdio.h>
#include <stdlib.h>

static int by_value(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (x > y) - (x < y);      /* 巧用布尔值：得到 -1 / 0 / 1，且不会溢出 */
}

static int by_abs(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    long long ax = x < 0 ? -(long long)x : x;   /* 先转 long long，避免 -INT_MIN 溢出 */
    long long ay = y < 0 ? -(long long)y : y;
    if (ax != ay) return ax < ay ? -1 : 1;
    return (x > y) - (x < y);                  /* 绝对值相同再按数值升序 */
}

static void show(const int *a, int n) {
    for (int i = 0; i < n; i++) printf("%d%c", a[i], i + 1 == n ? '\n' : ' ');
}

int main(void) {
    int a[5] = {-5, 3, -1, 4, 2};
    qsort(a, 5, sizeof a[0], by_value);
    show(a, 5);
    qsort(a, 5, sizeof a[0], by_abs);
    show(a, 5);
    return 0;
}
```
```output
-5 -1 2 3 4
-1 2 3 4 -5
```

`int (*cmp)(const void *, const void *)` 这样的变量可以像普通变量一样赋值、放进数组、按条件挑选——这就是"可切换比较规则"的实现方式。下一道编程题会让你自己写这样一个"规则表"。

### 非整数也能排：字符串指针数组
`qsort` 对元素类型一无所知，所以连"元素是指针"也能排。这时比较函数的参数是"指向元素的指针"，元素本身是 `char *`，所以参数类型是 `char **`（为了不被修改，写成 `const char *const *`）：

```c run id=cb-str
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int cmp_str(const void *a, const void *b) {
    const char *const *pa = a;     /* 元素是 const char *，所以这里是指向它的指针 */
    const char *const *pb = b;
    return strcmp(*pa, *pb);       /* 先解引用拿到字符串，再比较内容 */
}

int main(void) {
    const char *words[4] = {"pear", "apple", "fig", "banana"};
    qsort(words, 4, sizeof words[0], cmp_str);
    for (int i = 0; i < 4; i++) {
        printf("%s%c", words[i], i == 3 ? '\n' : ' ');
    }
    return 0;
}
```
```output
apple banana fig pear
```

`qsort` 交换的是**指针**（8 字节），字符串本身一个字节都没动——所以这里 `sizeof words[0]` 必须是 8，写成 `sizeof words` 就错了。

### 回调要带"上下文"怎么办
C 没有闭包，回调函数拿不到外层的局部变量。标准做法是再加一个 `void *ctx` 参数，把需要的状态显式传进去：

```c run id=cb-ctx
#include <stdio.h>

/* 遍历 a，把每个元素交给 fn 处理；ctx 原样转交给 fn，用来携带状态 */
static void for_each_ctx(const int *a, int n, void (*fn)(void *, int), void *ctx) {
    for (int i = 0; i < n; i++) {
        fn(ctx, a[i]);
    }
}

static void add_to_sum(void *ctx, int x) { *(int *)ctx += x; }
static void count_positive(void *ctx, int x) { if (x > 0) (*(int *)ctx)++; }

int main(void) {
    int a[6] = {4, -2, 0, 7, -1, 3};
    int sum = 0, positives = 0;
    for_each_ctx(a, 6, add_to_sum, &sum);
    for_each_ctx(a, 6, count_positive, &positives);
    printf("sum = %d, positives = %d\n", sum, positives);
    return 0;
}
```
```output
sum = 11, positives = 3
```

`void *ctx` 是 C 里模拟"带状态的回调"的标准手段：`qsort_r`、`pthread_create`、各种事件循环都用它。代价是回调里必须把 `ctx` 转回正确的类型——又回到了上一课 `void *` 的规矩。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra callback.c -o callback
./callback
```

本平台用 Clang，命令等价：`clang -std=c17 -Wall -Wextra callback.c -o callback`。

几个实用提醒：

- `qsort` 在 `<stdlib.h>` 里，忘了包含会得到"隐式声明"警告，参数类型全按 `int` 猜，运行起来可能直接崩溃。
- 比较函数的签名必须**一个字符都不差**：`int (*)(const void *, const void *)`。参数写成 `int *`、返回值写成 `void`，在 C 里往往只是警告而不是错误，编译器不会救你。
- 想验证排序结果，加 `-fsanitize=address,undefined`（平台默认开启）：比较函数里的 `a - b` 溢出、越界读写都会被当场抓住，而不是悄悄排错。

## 常见错误

### 比较函数写成 `return a - b`
看起来最简洁，实际上是**有符号整数溢出**：`INT_MAX - INT_MIN` 远远超出 `int` 的范围，是未定义行为。在开启 UBSan 的环境里程序会直接报错终止，在别的编译器上可能排出一个莫名其妙的顺序。

```c run id=err-ab expect=UB
#include <stdio.h>
#include <stdlib.h>
#include <limits.h>

static int cmp_bad(const void *a, const void *b) {
    return *(const int *)a - *(const int *)b;   /* 溢出：未定义行为 */
}

int main(void) {
    int a[2] = {INT_MAX, INT_MIN};
    qsort(a, 2, sizeof a[0], cmp_bad);
    printf("%d %d\n", a[0], a[1]);
    return 0;
}
```

正确写法是只比较大小、不做减法：`return (x > y) - (x < y);`，或者用 `if` 分别返回 −1/0/1。

### 把 `qsort` 的第二个参数写成 `sizeof a`
`qsort(base, nmemb, size, cmp)` 的第二个参数是**元素个数**，不是字节数。写成 `sizeof a` 会让它以为有"字节数"那么多个元素，越界访问整个数组之外的内存。

```c run id=err-nmemb expect=RE
#include <stdio.h>
#include <stdlib.h>

static int cmp_int(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (x > y) - (x < y);
}

int main(void) {
    int a[6] = {5, -3, 9, 0, 9, -7};
    qsort(a, sizeof a, sizeof a[0], cmp_int);   /* 错：应该是 6，不是 24 */
    for (int i = 0; i < 6; i++) printf("%d\n", a[i]);
    return 0;
}
```

正确写法：`qsort(a, sizeof a / sizeof a[0], sizeof a[0], cmp_int);`，或者直接把元素个数 `n` 传进去。

### 比较函数只返回 0/1
`return x > y;` 只会返回 0 或 1，永远没有负数。`qsort` 看到 0 会认为"两者相等、顺序随意"，于是排出来的顺序取决于实现细节，看起来像"有时候对、有时候不对"。必须让"小于"返回负数。

### 在比较函数里修改元素
比较函数必须只读。如果它内部交换了 `*(int *)a` 和 `*(int *)b`，就会破坏 `qsort` 内部的假设，可能陷入死循环或产生错误的顺序。参数写成 `const void *` 就是在提醒你这件事——所以不要为了"方便"把它强转成非 `const` 的指针去写。

## 客观题

### q-s2-callback-1 single
要用 `qsort` 把一个 `int` 数组按**降序**排列，下面哪个比较函数是正确的？

- [ ] `int cmp(const void *a, const void *b) { return *(const int *)a - *(const int *)b; }`
  > 错。这是升序；而且两个数相差很大时（如 `INT_MAX` 与 `INT_MIN`）减法会溢出，是未定义行为。
- [x] `int cmp(const void *a, const void *b) { int x = *(const int *)a, y = *(const int *)b; return (x < y) - (x > y); }`
  > 对。`x > y` 时返回 −1（大的排前面），`x < y` 时返回 1，相等返回 0，符合降序要求，且全程不做可能溢出的减法。
- [ ] `int cmp(const void *a, const void *b) { return *(const int *)a > *(const int *)b; }`
  > 错。这样只返回 0 或 1，永远没有负数，`qsort` 无法区分"大于"和"相等"，结果不确定。
- [ ] `int cmp(const void *a, const void *b) { if (*(const int *)a > *(const int *)b) return 0; return 1; }`
  > 错。相等时也返回 1（表示"第一个排在后面"），违反了比较函数"相等必须返回 0"的约定，排序结果不可靠。
