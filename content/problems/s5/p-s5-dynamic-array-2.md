---json
{
  "id": "p-s5-dynamic-array-2",
  "title": "采样流统计：条数未知时先攒进动态数组再算中位数",
  "difficulty": "L3",
  "knowledgePoints": ["s5-dynamic-array"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一台传感器每采集到一个值就向程序吐出一个整数，**一共会吐多少个事先不知道**，只在文件结束（EOF）时停止。请把整条采样流读进来，最后给出这份数据的统计摘要：

- 采样个数、总和、平均值（向下取整）；
- **中位数**：把所有采样值从小到大排序后，取下标为 `count / 2` 的那个值（下标从 0 开始；`count` 为偶数时取中间两个里**较大**的那个，不做平均）；
- 最小值与最大值。

既然不知道会有多少个值，就不能用定长数组：请用"`size` / `cap` + `realloc` 按需扩容"的动态数组把它攒起来——容量不够时翻倍，扩容失败时要安全退出（先释放已分配的内存）。

注意两个容易踩的边界：

- 流里可能**一个值都没有**（空输入），此时不要排序空数组，也不要除以 0；
- `count` 是奇数还是偶数，中位数的取法都要一致：**永远取排序后下标 `count/2` 的元素**。

## 输入格式
若干行，每行一个整数，直到文件结束（EOF）。整数之间也可能用空格分隔，但每行至多一个。

## 输出格式
输出五行：

```
count=<采样个数>
sum=<总和>
avg=<平均值向下取整>
median=<排序后下标 count/2 的值；count=0 时为 none>
min=<最小值> max=<最大值>（count=0 时都输出 none）
```

## 数据范围
0 ≤ count ≤ 80000
0 ≤ 每个采样值 ≤ 10⁹

总和最大 8×10⁴ × 10⁹ = 8×10¹³，超过 `int` 范围，**累加变量必须是 `long long`**。
最大输入约 880KB，在平台 1MB 的输入上限之内；输出只有 5 行。

## 示例
### 示例 1
```in
5
1
3
2
4
```
```out
count=5
sum=15
avg=3
median=3
min=1 max=5
```
> 5 个值、总和 15、平均 3。排序后是 `1 2 3 4 5`，下标 `5/2 = 2` 的元素是 `3`。

### 示例 2（边界：一个采样值都没有）
```in
```
```out
count=0
sum=0
avg=0
median=none
min=none max=none
```
> 空输入是合法的。此时不能对空数组排序、也不能用 `count` 做除数，`median`、`min`、`max` 都输出 `none`，`sum` 和 `avg` 输出 `0`。

## 提示
### 第 1 层
读入用 `while (scanf("%d", &v) == 1) { ... }`：`scanf` 返回成功读取的项数，读到 EOF 时返回 `EOF`，循环自然结束。每读到一个值就考虑"还能不能放下"，然后写入、让 `size` 加一。

### 第 2 层
动态数组从 `cap = 16` 起步（`malloc(16 * sizeof *a)`），满了就 `newcap = cap * 2`，用临时指针接住 `realloc` 的返回值，失败时 `free(a)` 再 `return 0`。读完之后**先判 `count == 0`**：空输入直接输出 `none` 那几行并结束，不要进入排序和除法。

### 第 3 层
中位数要排序：`qsort(a, count, sizeof *a, cmp_int);`，比较函数写成 `return (x > y) - (x < y);`（两个 `int` 相减可能溢出，这种写法最稳）。排序后 `a[count / 2]` 就是中位数，`a[0]` 和 `a[count - 1]` 是最小值和最大值。`sum` 用 `long long` 累加，`avg` 写成 `sum / (long long)count`。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>

static int cmp_int(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (x > y) - (x < y);          /* 相减会溢出，这样写最稳 */
}

int main(void) {
    size_t cap = 16;
    size_t n = 0;
    int *a = malloc(cap * sizeof *a);
    if (a == NULL) {
        return 0;
    }

    int v;
    while (scanf("%d", &v) == 1) {
        if (n == cap) {                /* 满了就翻倍 */
            size_t newcap = cap * 2;
            int *tmp = realloc(a, newcap * sizeof *tmp);
            if (tmp == NULL) {
                free(a);
                return 0;
            }
            a = tmp;
            cap = newcap;
        }
        a[n] = v;
        n++;
    }

    printf("count=%zu\n", n);

    long long sum = 0;
    for (size_t i = 0; i < n; i++) {
        sum += a[i];
    }
    printf("sum=%lld\n", sum);

    if (n == 0) {
        printf("avg=0\n");
        printf("median=none\n");
        printf("min=none max=none\n");
    } else {
        printf("avg=%lld\n", sum / (long long)n);
        qsort(a, n, sizeof *a, cmp_int);          /* 中位数对排序后的数据定义 */
        printf("median=%d\n", a[n / 2]);
        printf("min=%d max=%d\n", a[0], a[n - 1]);
    }

    free(a);                                      /* 唯一的释放点：两条路径都经过这里 */
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    size_t cap = 16;
    size_t n = 0;
    int *a = malloc(cap * sizeof *a);
    if (a == NULL) {
        return 0;
    }

    int v;
    while (scanf("%d", &v) == 1) {
        /* TODO: 满了就翻倍扩容（用临时指针接住 realloc，失败时先 free(a) 再返回），
         *       然后把 v 存进 a[n] 并让 n 加一 */
        (void)v;
        break;
    }

    /* TODO: 统计 sum（long long）、count、avg、median、min、max 并输出；
     *       n == 0 时 median/min/max 输出 none */

    free(a);
    return 0;
}
```

## 复杂度
时间 O(n log n)：读入与扩容是 O(n)（均摊），`qsort` 是 O(n log n)。
空间 O(n)：一块 `int` 数组，峰值不超过有效个数的 2 倍。

## 常见错误
### 用定长数组，采样一多就写越界 [UB|RE]
`int a[1000];` 看起来"够用了"，但采样条数由数据决定：输入有 5000 个值时，从第 1001 个开始就写到数组之外。写到栈上其它变量叫"悄悄改坏别人"——UBSan 的 `array-bounds` 检查会直接报"下标超出数组声明的长度"判 `UB`；如果编译器没做这个检查，ASan 会以栈越界报 `RE`。两者说的是同一件事：**"条数未知"就必须动态扩容**，不能靠估。

```c file=main.c expect=UB|RE
#include <stdio.h>
#include <stdlib.h>

static int cmp_int(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (x > y) - (x < y);
}

int main(void) {
    int a[1000];                       /* 错：不知道会有多少个值，定长数组一定会越界 */
    size_t n = 0;

    int v;
    while (scanf("%d", &v) == 1) {
        a[n] = v;
        n++;
    }

    printf("count=%zu\n", n);
    long long sum = 0;
    for (size_t i = 0; i < n; i++) {
        sum += a[i];
    }
    printf("sum=%lld\n", sum);
    if (n == 0) {
        printf("avg=0\nmedian=none\nmin=none max=none\n");
        return 0;
    }
    printf("avg=%lld\n", sum / (long long)n);

    qsort(a, n, sizeof *a, cmp_int);
    printf("median=%d\n", a[n / 2]);
    printf("min=%d max=%d\n", a[0], a[n - 1]);
    return 0;
}
```

### 忘记排序，直接拿读入顺序里的中间元素当中位数 [WA]
"中位数"是对**排序后**的数据定义的。如果直接 `a[n / 2]`，读入顺序一到就错：示例 1 的输入是 `5 1 3 2 4`，不排序时下标 2 是 `3`（碰巧对），但换成 `9 1 2` 就会输出 `2`，而正确的中位数是 `2`……真正能暴露问题的是 `8 2` 这种两个值的数据：不排序时 `a[1] = 2`，排序后应为 `8`。中位数必须排完序再取。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    size_t cap = 16;
    size_t n = 0;
    int *a = malloc(cap * sizeof *a);
    if (a == NULL) {
        return 0;
    }

    int v;
    while (scanf("%d", &v) == 1) {
        if (n == cap) {
            size_t newcap = cap * 2;
            int *tmp = realloc(a, newcap * sizeof *tmp);
            if (tmp == NULL) {
                free(a);
                return 0;
            }
            a = tmp;
            cap = newcap;
        }
        a[n] = v;
        n++;
    }

    printf("count=%zu\n", n);
    long long sum = 0;
    for (size_t i = 0; i < n; i++) {
        sum += a[i];
    }
    printf("sum=%lld\n", sum);
    if (n == 0) {
        printf("avg=0\nmedian=none\nmin=none max=none\n");
        free(a);
        return 0;
    }
    printf("avg=%lld\n", sum / (long long)n);
    printf("median=%d\n", a[n / 2]);    /* 错：没有排序，取到的是读入顺序里的元素 */

    int min = a[0];
    int max = a[0];
    for (size_t i = 1; i < n; i++) {
        if (a[i] < min) {
            min = a[i];
        }
        if (a[i] > max) {
            max = a[i];
        }
    }
    printf("min=%d max=%d\n", min, max);
    free(a);
    return 0;
}
```

### 偶数个时把中间两个取平均 [WA]
题目的约定是"排序后下标 `count / 2` 的元素"，`count` 为偶数时它就是中间两个里**较大**的那个。如果写成 `(a[n/2 - 1] + a[n/2]) / 2`，遇到 2 个、4 个采样的用例就会算出中间值：`8 2` 会变成 `5`，而正确答案是 `8`。动手之前先把"下标就是 count/2"这条固定下来，奇数偶数都不用改公式。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>

static int cmp_int(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (x > y) - (x < y);
}

int main(void) {
    size_t cap = 16;
    size_t n = 0;
    int *a = malloc(cap * sizeof *a);
    if (a == NULL) {
        return 0;
    }

    int v;
    while (scanf("%d", &v) == 1) {
        if (n == cap) {
            size_t newcap = cap * 2;
            int *tmp = realloc(a, newcap * sizeof *tmp);
            if (tmp == NULL) {
                free(a);
                return 0;
            }
            a = tmp;
            cap = newcap;
        }
        a[n] = v;
        n++;
    }

    printf("count=%zu\n", n);
    long long sum = 0;
    for (size_t i = 0; i < n; i++) {
        sum += a[i];
    }
    printf("sum=%lld\n", sum);
    if (n == 0) {
        printf("avg=0\nmedian=none\nmin=none max=none\n");
        free(a);
        return 0;
    }
    printf("avg=%lld\n", sum / (long long)n);

    qsort(a, n, sizeof *a, cmp_int);
    if (n % 2 == 0) {
        printf("median=%d\n", (a[n / 2 - 1] + a[n / 2]) / 2);   /* 错：题目要的是较大的那个 */
    } else {
        printf("median=%d\n", a[n / 2]);
    }
    printf("min=%d max=%d\n", a[0], a[n - 1]);
    free(a);
    return 0;
}
```

### 用 `int` 累加总和 [UB]
`sum` 打印格式是 `%lld`，但如果累加变量写成 `int sum = 0;`，中间结果会先按 32 位溢出。8 万个 10 亿相加是 8×10¹³，远超 `int` 的 2147483647；有符号溢出是未定义行为，本平台的 UBSan 会报 `signed integer overflow` 并判 `UB`。**返回/打印的类型不会自动把中间结果提升成 64 位。**

```c file=main.c expect=UB
#include <stdio.h>
#include <stdlib.h>

static int cmp_int(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (x > y) - (x < y);
}

int main(void) {
    size_t cap = 16;
    size_t n = 0;
    int *a = malloc(cap * sizeof *a);
    if (a == NULL) {
        return 0;
    }

    int v;
    while (scanf("%d", &v) == 1) {
        if (n == cap) {
            size_t newcap = cap * 2;
            int *tmp = realloc(a, newcap * sizeof *tmp);
            if (tmp == NULL) {
                free(a);
                return 0;
            }
            a = tmp;
            cap = newcap;
        }
        a[n] = v;
        n++;
    }

    printf("count=%zu\n", n);
    int sum = 0;                       /* 错：8×10^13 装不进 int */
    for (size_t i = 0; i < n; i++) {
        sum += a[i];
    }
    printf("sum=%d\n", sum);
    if (n == 0) {
        printf("avg=0\nmedian=none\nmin=none max=none\n");
        free(a);
        return 0;
    }
    printf("avg=%lld\n", (long long)(sum / (long long)n));

    qsort(a, n, sizeof *a, cmp_int);
    printf("median=%d\n", a[n / 2]);
    printf("min=%d max=%d\n", a[0], a[n - 1]);
    free(a);
    return 0;
}
```

### 扩容时直接写 `a = realloc(a, ...)` [LEAK]
失败时 `realloc` 返回 `NULL` 且原块仍然有效，赋值却把 `a` 覆盖成了 `NULL`：已读入的数据连同那块内存一起丢失，而且再也 `free` 不掉。必须用临时指针接住、判空之后再赋值。本题用的 `qsort`/`printf` 都不影响这一点——**所有 `realloc` 都要按同一条规矩写**。

## 测试用例
### 01 sample 示例 1
```in
5
1
3
2
4
```
```out
count=5
sum=15
avg=3
median=3
min=1 max=5
```

### 02 sample 示例 2
```in
```
```out
count=0
sum=0
avg=0
median=none
min=none max=none
```

### 03 degenerate 只有一个采样值 0
```in
0
```
```out
count=1
sum=0
avg=0
median=0
min=0 max=0
```

### 04 trap 两个值时中位数取较大的那个
```in
8
2
```
```out
count=2
sum=10
avg=5
median=8
min=2 max=8
```

### 05 trap 大值在前，min/max 与排序无关但不能取错
```in
1000000000
0
999999999
```
```out
count=3
sum=1999999999
avg=666666666
median=999999999
min=0 max=1000000000
```

### 06 normal 带重复值的七个采样
```in
4
4
1
9
2
4
6
```
```out
count=7
sum=30
avg=4
median=4
min=1 max=9
```

### 07 trap 恰好跨越 16 → 32 的容量边界
```in
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
```
```out
count=17
sum=153
avg=9
median=9
min=1 max=17
```

### 生成 boundary 八万个采样与两种极端分布
```js gen
const cases = [];

function render(values) {
  const n = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const sorted = values.slice().sort((a, b) => a - b);
  const lines = [`count=${n}`, `sum=${sum}`];
  if (n === 0) {
    lines.push('avg=0', 'median=none', 'min=none max=none');
  } else {
    lines.push(`avg=${Math.floor(sum / n)}`);
    lines.push(`median=${sorted[Math.floor(n / 2)]}`);
    lines.push(`min=${sorted[0]} max=${sorted[n - 1]}`);
  }
  return lines.join('\n') + '\n';
}

/* 最大规模：80000 个 0…10^9 的随机采样，输入约 880KB */
{
  const n = 80000;
  const values = [];
  for (let i = 0; i < n; i++) values.push(rng.int(0, 1000000000));
  cases.push({
    kind: 'boundary',
    category: '80000 个随机采样，总和 4×10^13 量级',
    input: values.join('\n') + '\n',
    output: render(values),
  });
}

/* 全部相同：qsort 之后中位数、min、max 都必须等于该值 */
{
  const n = 50000;
  const values = new Array(n).fill(777777777);
  cases.push({
    kind: 'trap',
    category: '50000 个相同的值，中位数等于该值',
    input: values.join('\n') + '\n',
    output: render(values),
  });
}

/* 严格递减：不排序时中间元素会取错 */
{
  const n = 1001;
  const values = [];
  for (let i = n; i >= 1; i--) values.push(i);
  cases.push({
    kind: 'normal',
    category: '1001 个严格递减的值',
    input: values.join('\n') + '\n',
    output: render(values),
  });
}

return cases;
```
