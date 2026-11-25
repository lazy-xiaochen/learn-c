---json
{
  "id": "p-s7-iv-malloc-free-1",
  "title": "读到底再统计：用动态数组收下未知个数的整数",
  "difficulty": "L3",
  "knowledgePoints": ["s7-iv-malloc-free"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines", "checkLeaks": true }
}
---

## 题目描述
这次输入**不告诉你一共有多少个数**——只能一直读到文件结束（EOF）。数量可能是 0，也可能是 3000，所以不能用固定大小的数组，必须像真实工程那样：

1. 用 `malloc` 申请一块初始容量（本题建议 8）；
2. 边读边存，**读满时用 `realloc` 把容量翻倍**；
3. 全部读完后再统一统计；
4. 结束时把内存 `free` 掉，**一块都不能漏**（本题会检查泄漏）。

输入是一串用空白（空格或换行）分隔的整数，读到 EOF 为止。请输出这一串数的个数、总和、最小值、最大值，以及**按读入顺序的逆序**排列的原始数据。

这题的重点不是算法，而是**内存生命周期**：申请、扩容、使用、归还，四步缺一不可。

## 输入格式
若干个整数，用空格或换行分隔，一直持续到 EOF。
输入可能为空（一个整数都没有），此时按下面的规定输出 `empty`。

## 输出格式
如果读到 0 个整数，只输出一行：

```
empty
```

否则输出四行：

```
count=个数
sum=总和
min=最小值 max=最大值
rev=逆序数据（用单个空格分隔，最后一个数后面没有空格）
```

## 数据范围
0 ≤ 整数个数 ≤ 3000
-1000000000 ≤ 每个整数 ≤ 1000000000
总和最大为 3×10¹²，**超过 `int` 的范围**，必须用 `long long` 保存。
逆序输出最多 3000 个数字，约 33KB，不超过平台 64KB 的输出上限。

## 示例
### 示例 1
```in
1 2 3 4
```
```out
count=4
sum=10
min=1 max=4
rev=4 3 2 1
```
> 读到 4 个数，总和 10，最小值 1、最大值 4；逆序输出就是 `4 3 2 1`。注意输入文件里没有"个数"这一行——不要先读一个 n，否则会把第一个数据当成个数。

### 示例 2（边界：只读到一个数）
```in
-1000000000
```
```out
count=1
sum=-1000000000
min=-1000000000 max=-1000000000
rev=-1000000000
```
> 只有一个数时，它同时是最小值和最大值，总和就是它本身，逆序输出还是它。负数的 `%d` 输出不受影响；但要小心"0 个数"和"一个 0"是两种不同的情况：前者输出 `empty`，后者输出 `count=1`。

## 提示
### 第 1 层
先用 `while (scanf("%d", &x) == 1)` 一遍遍读，读到 `scanf` 返回 EOF 或 0 就停。这时候你并不知道要读多少个数，所以需要一个"当前容量 `cap`"和"当前个数 `n`"两个变量：`n < cap` 时直接放，`n == cap` 时才扩容。

### 第 2 层
扩容用 `realloc(a, (size_t)cap * 2 * sizeof *a)`，但**不要直接写 `a = realloc(...)`**：realloc 失败会返回 NULL，那样原来的块就丢了。正确写法是先用临时指针接住，判断非 NULL 之后再赋给 `a`，最后把 `cap` 翻倍。

### 第 3 层
三个容易漏的点：

1. `sizeof *a` 比 `sizeof(int)` 好：以后把元素类型从 `int` 换成别的，这一行不用改；
2. 读完之后要**先判断 `n == 0`**（输出 `empty` 并 `free`），再访问 `a[0]`，否则空输入会读到未初始化的内存；
3. 所有 `return` 路径之前都要 `free(a)`，包括 realloc 失败、空输入这两条提前返回的分支——本题会检查泄漏，漏一处就判 `LEAK`。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int cap = 8;
    int n = 0;
    int *a = malloc((size_t)cap * sizeof *a);
    if (a == NULL) {
        return 0;
    }

    int failed = 0;                /* realloc 失败时置 1，读完后再统一收尾 */
    int x;
    while (scanf("%d", &x) == 1) {
        if (n == cap) {
            int *tmp = realloc(a, (size_t)cap * 2 * sizeof *a);
            if (tmp == NULL) {
                failed = 1;
                break;
            }
            a = tmp;               /* 成功之后才覆盖原指针 */
            cap *= 2;
        }
        a[n++] = x;
    }

    if (!failed) {
        if (n == 0) {
            printf("empty\n");
        } else {
            long long sum = 0;
            int mn = a[0];
            int mx = a[0];
            for (int i = 0; i < n; i++) {
                sum += a[i];
                if (a[i] < mn) {
                    mn = a[i];
                }
                if (a[i] > mx) {
                    mx = a[i];
                }
            }

            printf("count=%d\n", n);
            printf("sum=%lld\n", sum);
            printf("min=%d max=%d\n", mn, mx);
            printf("rev=");
            for (int i = n - 1; i >= 0; i--) {
                printf("%d", a[i]);
                if (i > 0) {
                    printf(" ");
                }
            }
            printf("\n");
        }
    }

    free(a);                       /* 全程序只有这一个出口，不会漏 */
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>

#define CAP 8

int main(void) {
    int *a = malloc(CAP * sizeof *a);
    if (a == NULL) {
        return 0;
    }

    int n = 0;
    int x;
    while (n < CAP && scanf("%d", &x) == 1) {
        a[n++] = x;
    }
    /* TODO: 读满 CAP 个之后要用 realloc 扩容，才能收下所有输入 */
    /* TODO: 结束时要用 free 归还这块内存（所有 return 之前都要还） */

    if (n == 0) {
        printf("empty\n");
        return 0;
    }

    long long sum = 0;
    int mn = a[0];
    int mx = a[0];
    for (int i = 0; i < n; i++) {
        sum += a[i];
        if (a[i] < mn) {
            mn = a[i];
        }
        if (a[i] > mx) {
            mx = a[i];
        }
    }

    printf("count=%d\n", n);
    printf("sum=%lld\n", sum);
    printf("min=%d max=%d\n", mn, mx);
    printf("rev=");
    for (int i = n - 1; i >= 0; i--) {
        printf("%d", a[i]);
        if (i > 0) {
            printf(" ");
        }
    }
    printf("\n");
    return 0;
}
```

## 复杂度
时间 O(n)：每个数读一次、统计一次、输出一次；`realloc` 按 2 倍扩容，总复制代价是 O(n)。
空间 O(n)：动态数组存放全部数据，最多 50000 × 4 字节 ≈ 200KB，都在堆上。

## 常见错误
### 忘记 free，输出全对却判 LEAK [LEAK]
本题开启了泄漏检查：程序的输出哪怕完全正确，只要结束时还有 `malloc`/`realloc` 得到的块没有归还，就会判 `LEAK`。最常见的漏点是**提前 return 的分支**——空输入分支、realloc 失败分支——只记得在主路径末尾 free。

```c file=main.c expect=LEAK
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int cap = 8;
    int n = 0;
    int *a = malloc((size_t)cap * sizeof *a);
    if (a == NULL) {
        return 0;
    }

    int x;
    while (scanf("%d", &x) == 1) {
        if (n == cap) {
            int *tmp = realloc(a, (size_t)cap * 2 * sizeof *a);
            if (tmp == NULL) {
                return 0;          /* 错：这里也应该 free(a) */
            }
            a = tmp;
            cap *= 2;
        }
        a[n++] = x;
    }

    if (n == 0) {
        printf("empty\n");
        return 0;                  /* 错：空输入分支也没有 free(a) */
    }

    long long sum = 0;
    int mn = a[0];
    int mx = a[0];
    for (int i = 0; i < n; i++) {
        sum += a[i];
        if (a[i] < mn) {
            mn = a[i];
        }
        if (a[i] > mx) {
            mx = a[i];
        }
    }

    printf("count=%d\n", n);
    printf("sum=%lld\n", sum);
    printf("min=%d max=%d\n", mn, mx);
    printf("rev=");
    for (int i = n - 1; i >= 0; i--) {
        printf("%d", a[i]);
        if (i > 0) {
            printf(" ");
        }
    }
    printf("\n");
    return 0;                      /* 错：主路径也少了 free(a) */
}
```

### 容量写死，只收下前 8 个数 [WA]
题目故意不告诉个数，就是要求动态扩容。把 `while (scanf(...) == 1)` 加上 `n < CAP` 的限制，前 8 个数之后的数据会被**静默丢弃**：示例这种小数据看不出来，一旦输入超过 8 个，`count`/`sum`/`rev` 全错。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>

#define CAP 8

int main(void) {
    int *a = malloc(CAP * sizeof *a);
    if (a == NULL) {
        return 0;
    }

    int n = 0;
    int x;
    while (n < CAP && scanf("%d", &x) == 1) {   /* 错：读满后应当扩容 */
        a[n++] = x;
    }

    if (n == 0) {
        printf("empty\n");
        free(a);
        return 0;
    }

    long long sum = 0;
    int mn = a[0];
    int mx = a[0];
    for (int i = 0; i < n; i++) {
        sum += a[i];
        if (a[i] < mn) {
            mn = a[i];
        }
        if (a[i] > mx) {
            mx = a[i];
        }
    }

    printf("count=%d\n", n);
    printf("sum=%lld\n", sum);
    printf("min=%d max=%d\n", mn, mx);
    printf("rev=");
    for (int i = n - 1; i >= 0; i--) {
        printf("%d", a[i]);
        if (i > 0) {
            printf(" ");
        }
    }
    printf("\n");
    free(a);
    return 0;
}
```

### 总和用 int 累加 [UB]
`sum` 的声明写成 `int`，前三组用例都可能碰巧对；一旦总额超过 `2147483647`，就是有符号整数溢出。这是未定义行为，本平台的 UBSan 会报 `signed integer overflow` 并判 `UB`。注意：`printf("%lld")` 只决定**怎么打印**，不会把 `int` 的累加过程变成 64 位。

```c file=main.c expect=UB
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int cap = 8;
    int n = 0;
    int *a = malloc((size_t)cap * sizeof *a);
    if (a == NULL) {
        return 0;
    }

    int x;
    while (scanf("%d", &x) == 1) {
        if (n == cap) {
            int *tmp = realloc(a, (size_t)cap * 2 * sizeof *a);
            if (tmp == NULL) {
                free(a);
                return 0;
            }
            a = tmp;
            cap *= 2;
        }
        a[n++] = x;
    }

    if (n == 0) {
        printf("empty\n");
        free(a);
        return 0;
    }

    int sum = 0;                   /* 错：总额最大 5×10^13，int 装不下 */
    int mn = a[0];
    int mx = a[0];
    for (int i = 0; i < n; i++) {
        sum += a[i];
        if (a[i] < mn) {
            mn = a[i];
        }
        if (a[i] > mx) {
            mx = a[i];
        }
    }

    printf("count=%d\n", n);
    printf("sum=%d\n", sum);
    printf("min=%d max=%d\n", mn, mx);
    printf("rev=");
    for (int i = n - 1; i >= 0; i--) {
        printf("%d", a[i]);
        if (i > 0) {
            printf(" ");
        }
    }
    printf("\n");
    free(a);
    return 0;
}
```

### malloc 的大小写成 sizeof(指针) [RE]
`int *a = malloc(sizeof a);` 里 `a` 是指针，`sizeof a` 是 8（64 位平台），只够放 2 个 `int`。随后写入 4 个、8 个元素就越界踩坏堆，ASan 报 `heap-buffer-overflow`。正确写法是 `sizeof *a` 或 `sizeof(int)`，再乘上容量。

```c file=main.c expect=RE
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *a = malloc(sizeof a);     /* 错：sizeof a 是指针大小，不是 8 个 int */
    if (a == NULL) {
        return 0;
    }

    int n = 0;
    int x;
    while (scanf("%d", &x) == 1) {
        a[n++] = x;                /* 从第 3 个元素开始就越界了 */
    }

    if (n == 0) {
        printf("empty\n");
        free(a);
        return 0;
    }

    long long sum = 0;
    int mn = a[0];
    int mx = a[0];
    for (int i = 0; i < n; i++) {
        sum += a[i];
        if (a[i] < mn) {
            mn = a[i];
        }
        if (a[i] > mx) {
            mx = a[i];
        }
    }

    printf("count=%d\n", n);
    printf("sum=%lld\n", sum);
    printf("min=%d max=%d\n", mn, mx);
    printf("rev=");
    for (int i = n - 1; i >= 0; i--) {
        printf("%d", a[i]);
        if (i > 0) {
            printf(" ");
        }
    }
    printf("\n");
    free(a);
    return 0;
}
```

### 把“读到 0 个数”和“读到一个 0”混为一谈 [WA]
`n == 0` 才输出 `empty`；读到 `0` 是**一个合法的数据**，`count=1`。如果用“最后读到的值是否为 0”来判断，空输入和单个数 0 都会错；更隐蔽的写法是 `while (x != 0 && scanf(...))`，那会把数据里的 0 当成结束标志。

## 测试用例
### 01 sample 示例 1
```in
1 2 3 4
```
```out
count=4
sum=10
min=1 max=4
rev=4 3 2 1
```

### 02 sample 示例 2
```in
-1000000000
```
```out
count=1
sum=-1000000000
min=-1000000000 max=-1000000000
rev=-1000000000
```

### 03 degenerate 空输入
```in
```
```out
empty
```

### 04 trap 12 个数，超过初始容量
```in
5 -1 0 7 3 9 -4 2 8 6 -2 1
```
```out
count=12
sum=34
min=-4 max=9
rev=1 -2 6 8 2 -4 9 3 7 0 -1 5
```

### 05 trap 三个十亿，总和超过 int
```in
1000000000 1000000000 1000000000
```
```out
count=3
sum=3000000000
min=1000000000 max=1000000000
rev=1000000000 1000000000 1000000000
```

### 06 boundary 恰好 8 个数，刚好不触发扩容
```in
1 2 3 4 5 6 7 8
```
```out
count=8
sum=36
min=1 max=8
rev=8 7 6 5 4 3 2 1
```

### 07 normal 正负交替
```in
-5 10 -15 20 -25 30
```
```out
count=6
sum=15
min=-25 max=30
rev=30 -25 20 -15 10 -5
```

### 08 trap 读到一个 0，不是空输入
```in
0
```
```out
count=1
sum=0
min=0 max=0
rev=0
```

### 生成 boundary 50000 个十亿
```js gen
const cases = [];

function render(vals) {
  if (vals.length === 0) {
    return 'empty\n';
  }
  let sum = 0;
  let mn = vals[0];
  let mx = vals[0];
  for (const v of vals) {
    sum += v;
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  const rev = [];
  for (let i = vals.length - 1; i >= 0; i--) rev.push(vals[i]);
  return `count=${vals.length}\nsum=${sum}\nmin=${mn} max=${mx}\nrev=${rev.join(' ')}\n`;
}

/* 边界：3000 个 10 亿，总额 3×10^12，逆序输出约 33KB */
const big = new Array(3000).fill(1000000000);
cases.push({
  kind: 'boundary',
  category: '3000 个 10 亿，总额 3×10^12',
  input: big.join(' ') + '\n',
  output: render(big),
});

/* 压力：2500 个 -10^9…10^9 的随机整数 */
const vals = [];
for (let i = 0; i < 2500; i++) {
  vals.push(rng.int(-1000000000, 1000000000));
}
cases.push({
  kind: 'stress',
  category: '2500 个随机整数',
  input: vals.join(' ') + '\n',
  output: render(vals),
});

return cases;
```
