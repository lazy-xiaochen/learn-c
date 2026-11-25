---json
{
  "id": "p-s3-tail-recursion-2",
  "title": "尾递归累加器的溢出账本：第一次越界发生在第几步",
  "difficulty": "L3",
  "knowledgePoints": ["s3-tail-recursion"],
  "special": "ub-analysis",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
小许把"求和"写成了尾递归，用累加器 `sum` 把结果一路带下去：

```c
int acc(int i, int n, int sum) {
    if (i > n) {
        return sum;
    }
    return acc(i + 1, n, sum + a[i]);   /* 尾调用：结果直接原样返回 */
}
```

递归写法本身没问题，深度也只有 `n` 层。问题出在 `sum` 是 `int`：只要某一项加上去之后超出 `int` 的范围，这一步的 `sum + a[i]` 就是**有符号整数溢出**——在 C 里属于未定义行为（UB），不是"回绕成另一个数"这么简单。程序可能得到一个负数、可能被优化掉、也可能直接崩溃。

请写一个"溢出账本"：按顺序模拟这个累加过程，找出**第一次**发生溢出的步号，并记下溢出前那一刻的合法和。

规则：

1. 从 `sum = 0` 开始，按 `i = 1, 2, …, n` 的顺序把 `a[i]` 加进去；
2. 每一步先判断：`sum + a[i]` 是否还在 `int` 范围内（`-2147483648 ≤ 值 ≤ 2147483647`）；
3. 如果超出，输出 `UB 步号 溢出前的和` 并结束——这个"溢出前的和"一定是合法的 `int` 值；
4. 如果一路加完都没有溢出，输出 `OK 最终和`。

这个题目在练习一件很重要的事：**"结果不对"和"未定义行为"是两件事**。溢出的那一刻程序已经失去了可预测性，所以正确做法是**在加法之前**就用更宽的类型（`long long`）判断会不会越界，而不是"先加出来看看"。

## 输入格式
第一行一个整数 `n`（1 ≤ n ≤ 1000）。

第二行 `n` 个整数 `a[1] … a[n]`，用空格分隔。

## 输出格式
只输出一行：

- 发生了溢出：`UB k s`，`k` 是第一次溢出的步号（从 1 开始），`s` 是**这一步之前**的和；
- 没有溢出：`OK s`，`s` 是全部加起来的结果。

## 数据范围
- `1 ≤ n ≤ 1000`；
- `a[i]` 是任意 `int`（`-2147483648 ≤ a[i] ≤ 2147483647`），单个值本身一定装得下；
- 溢出发生前的和一定在 `int` 范围内；溢出那一步的真实值最大约 `4.3×10⁹`，用 `long long` 算得下；
- 没有溢出时，最终和也在 `int` 范围内。

## 示例
### 示例 1
```in
3
2000000000 2000000000 -5
```
```out
UB 2 2000000000
```
> 第 1 步：`0 + 2000000000 = 2000000000`，合法。第 2 步：`2000000000 + 2000000000 = 4000000000`，超过 `INT_MAX`（2147483647），所以溢出发生在第 2 步，溢出前的和是 2000000000。第三个数据 `-5` 根本没机会加进去。

### 示例 2（边界：恰好等于 INT_MAX）
```in
1
2147483647
```
```out
OK 2147483647
```
> `INT_MAX` 本身是**合法**的，只有超过它才算溢出。这个用例专门用来检查"边界写成了 `>=`"的错误。

## 提示
### 第 1 层
关键是"判断的时机"：不要先算出一个 `int` 结果再检查它有没有溢出——那一步已经晚了。要把加法放到 `long long` 里做，拿 `long long` 的结果和 `int` 的上下界比较。

### 第 2 层
维护两个量：`sum`（到目前为止的合法和，用 `long long` 存）和步号 `i`。每一步：

```c
long long p = sum + a[i];
if (p > INT_MAX || p < INT_MIN) { 输出 UB; return; }
sum = p;
```

`INT_MAX` / `INT_MIN` 来自 `<limits.h>`。**两个方向都要判断**，负数累加同样会越界。

### 第 3 层
输出格式是三个部分：`UB`、步号、溢出前的和。步号是 `i + 1`（如果数组下标从 0 开始）。注意：输出的是**溢出前**的和，不是溢出那一步算出来的越界值——后者在 `int` 里根本不存在一个"正确值"。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <limits.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        return 0;
    }

    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    long long sum = 0;                   /* 用 long long 保存"到目前为止的合法和" */
    for (int i = 0; i < n; i++) {
        long long p = sum + a[i];        /* 先在宽类型里加，再判断 */
        if (p > INT_MAX || p < INT_MIN) {
            printf("UB %d %lld\n", i + 1, sum);
            return 0;
        }
        sum = p;
    }
    printf("OK %lld\n", sum);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <limits.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        return 0;
    }

    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    /* TODO: 用 long long 逐步累加，每一步判断是否越过 INT_MAX / INT_MIN，
     *       溢出时输出 "UB 步号 溢出前的和"，否则输出 "OK 最终和"。 */
    printf("OK %d\n", a[0]);
    return 0;
}
```

## 复杂度
时间 O(n)：一次遍历，每步一次加法和两次比较。
空间 O(n)：保存输入的数组（也可以边读边判断，空间降到 O(1)）。

## 常见错误
### 用 int 累加，溢出在"检查"之前就发生了 [UB]
`int sum` 加上去的那一刻就已经是未定义行为，后面再拿 `sum` 和 `INT_MAX` 比较毫无意义。本平台的 UBSan 会在加法处直接报 `signed integer overflow`。
```c file=main.c expect=UB
#include <stdio.h>
#include <limits.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        return 0;
    }
    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int sum = 0;
    for (int i = 0; i < n; i++) {
        sum += a[i];                     /* 错：这里已经可能溢出了 */
        if (sum > INT_MAX || sum < INT_MIN) {
            printf("UB %d %d\n", i + 1, sum);
            return 0;
        }
    }
    printf("OK %d\n", sum);
    return 0;
}
```

### 只在最后检查总和，说不出是哪一步出的问题 [WA]
把全程用 `long long` 加完再看最终值，虽然能发现"总和越界了"，但题目要的是**第一次**越界的步号，以及那一刻之前的和。输出 `UB 0 3999999995` 这种答案是错的。
```c file=main.c expect=WA
#include <stdio.h>
#include <limits.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        return 0;
    }
    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    long long total = 0;
    for (int i = 0; i < n; i++) {
        total += a[i];
    }
    if (total > INT_MAX || total < INT_MIN) {
        printf("UB 0 %lld\n", total);    /* 错：步号和"溢出前的和"都不对 */
    } else {
        printf("OK %lld\n", total);
    }
    return 0;
}
```

### 用 unsigned 累加 [WA]
`unsigned` 的加法在越界时是**回绕**（定义良好的行为），不会触发 UB，但结果不是 `int` 语义：`2000000000 + 2000000000` 会得到 4000000000，程序会输出 `OK 4000000000`，而正确答案是第 2 步就 UB 了。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        return 0;
    }
    int a[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    unsigned int s = 0;                  /* 错：unsigned 回绕不等于 int 溢出语义 */
    for (int i = 0; i < n; i++) {
        s += (unsigned int)a[i];
    }
    printf("OK %u\n", s);
    return 0;
}
```

### 输出溢出之后的"结果"，而不是溢出前的和 [WA]
题目要的是 `sum`（溢出前那一步的合法值），不是 `sum + a[i]` 算出来的越界值。后者在 `int` 里没有定义；即使你用 `long long` 算出来，它也不是正确答案要求的数字。

### 只判断正方向的溢出 [WA]
`if (p > INT_MAX)` 只能抓住正向越界。一连串负数累加会掉到 `INT_MIN` 以下，同样是有符号溢出，同样需要报告。

## 测试用例
### 01 sample 示例 1
```in
3
2000000000 2000000000 -5
```
```out
UB 2 2000000000
```

### 02 sample 示例 2
```in
1
2147483647
```
```out
OK 2147483647
```

### 03 boundary 先到 INT_MAX，再加 1
```in
2
2147483647 1
```
```out
UB 2 2147483647
```

### 04 boundary 单独的 INT_MIN 是合法的
```in
1
-2147483648
```
```out
OK -2147483648
```

### 05 degenerate 只有一个 0
```in
1
0
```
```out
OK 0
```

### 06 trap 正好走到 INT_MIN，再减 1 才溢出
```in
3
-2000000000 -147483648 -1
```
```out
UB 3 -2147483648
```
> 前两步：`-2000000000`，然后 `-2147483648`——正好是 `INT_MIN`，**合法**。第 3 步再减 1 才越界，所以溢出前的和是 `-2147483648`。

### 07 trap 负数方向的溢出
```in
2
-2000000000 -2000000000
```
```out
UB 2 -2000000000
```

### 08 normal 正负交替，总和不越界
```in
4
1000000000 -2000000000 1000000000 -1
```
```out
OK -1
```

### 生成 boundary 长数组的溢出步号
```js gen
const cases = [];

/* 1000 个 3000000：第 715 步后是 2145000000（合法），第 716 步越界 */
const n1 = 1000;
const v1 = new Array(n1).fill(3000000);
const step1 = Math.floor(2147483647 / 3000000);       /* 715 */
cases.push({
  kind: 'boundary',
  category: '1000 个 3000000，溢出发生在第 716 步',
  input: `${n1}\n${v1.join(' ')}\n`,
  output: `UB ${step1 + 1} ${step1 * 3000000}\n`,
});

/* 1000 个 2000000：总和 2000000000，恰好不越界 */
const n2 = 1000;
const v2 = new Array(n2).fill(2000000);
cases.push({
  kind: 'boundary',
  category: '1000 个 2000000，总和恰好 2000000000',
  input: `${n2}\n${v2.join(' ')}\n`,
  output: `OK ${n2 * 2000000}\n`,
});

return cases;
```

### 09 normal 小数据逐步累加
```in
5
1 2 3 4 5
```
```out
OK 15
```
