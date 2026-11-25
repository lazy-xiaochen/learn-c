---json
{
  "id": "p-s2-vla-1",
  "title": "用变长数组做前缀和：区间收支查询",
  "difficulty": "L3",
  "knowledgePoints": ["s2-vla"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一张校园卡记录了连续 `n` 天的收支变化：正数表示充值，负数表示消费。现在有 `q` 次查询，每次问"第 `l` 天到第 `r` 天（含两端）的收支总和是多少"。

天数 `n` 由输入决定，所以请用**变长数组（VLA）**按实际的 `n` 开辟前缀和数组：

```c
long long pre[n + 1];      /* pre[i] 表示前 i 天的收支总和，pre[0] = 0 */
```

`pre[i] = a[1] + a[2] + ... + a[i]`。建好之后，第 `l` 天到第 `r` 天的和就是：

```
pre[r] - pre[l - 1]
```

这样每次查询只需要一次减法，总复杂度是 O(n + q)，而不是每次查询都重新累加一遍的 O(nq)。

**注意**：

1. 天的编号从 1 开始，而数组下标从 0 开始，所以读入第 `i` 天的值时要存到 `v[i - 1]`，或者干脆用一个"多开一位"的写法；
2. 总和可能达到 5×10¹³，`int` 装不下，前缀和数组必须用 `long long`；
3. 前缀和数组的长度是 `n + 1`（因为要用到 `pre[0]`），别只开 `n` 个。

## 输入格式
第一行一个整数 `n`。
第二行 `n` 个整数，表示第 1 天到第 `n` 天的收支变化。
第三行一个整数 `q`。
接下来 `q` 行，每行两个整数 `l` 和 `r`（1 ≤ l ≤ r ≤ n）。

## 输出格式
输出 `q` 行，每行一个整数：第 `l` 天到第 `r` 天的收支总和。

## 数据范围
1 ≤ n ≤ 50000
-1000000000 ≤ 每天的收支 ≤ 1000000000
1 ≤ q ≤ 2000
1 ≤ l ≤ r ≤ n

所有数字都可能为负，所以"用 0 初始化、只加正数"之类的做法都不成立。
`n` 个数的总和最大可达 5×10¹³（50000 × 10⁹），必须用 64 位整数保存。

## 示例
### 示例 1
```in
5
3 1 4 1 5
3
1 5
2 3
4 4
```
```out
14
5
1
```
> 前缀和是 `pre = [0, 3, 4, 8, 9, 14]`。`1..5` 是 `pre[5] - pre[0] = 14`；`2..3` 是 `pre[3] - pre[1] = 5`；`4..4` 是 `pre[4] - pre[3] = 1`。

### 示例 2（边界：只有一天）
```in
1
-7
1
1 1
```
```out
-7
```
> `n = 1` 时 VLA 只有一个元素，前缀和数组要开 `n + 1 = 2` 个。查询 `1..1` 就是 `pre[1] - pre[0]`，答案就是这一天的值本身。

## 提示
### 第 1 层
如果每次查询都从 `l` 循环到 `r`，最坏要做 `2000 × 50000 = 10⁸` 次加法，勉强能过但很浪费。想想能不能"预处理一次，之后每次查询 O(1)"。

### 第 2 层
用前缀和：`pre[0] = 0`，`pre[i] = pre[i-1] + 第 i 天的值`。有了它，区间 `[l, r]` 的和就是 `pre[r] - pre[l-1]`——两个前缀一相减，中间的部分正好被保留下来。

### 第 3 层
天数编号从 1 开始，数组下标从 0 开始：`v[0]` 是第 1 天。可以直接在读入时累加，省掉 `v` 数组：

```c
pre[0] = 0;
for (int i = 0; i < n; i++) {
    读入 x;
    pre[i + 1] = pre[i] + x;
}
```

`pre` 的类型必须是 `long long`，下标最大是 `n`，所以数组长度是 `n + 1`。查询时用 `pre[r] - pre[l - 1]`，注意是 `l - 1` 而不是 `l`。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 50000) {
        return 0;
    }

    int v[n];                        /* VLA：长度由运行时的 n 决定 */
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &v[i]) != 1) {
            return 0;
        }
    }

    long long pre[n + 1];            /* 前缀和：pre[i] = 前 i 天的和，pre[0] = 0 */
    pre[0] = 0;
    for (int i = 0; i < n; i++) {
        pre[i + 1] = pre[i] + v[i];  /* 累加在 long long 下进行，不会溢出 */
    }

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 2000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int l, r;
        if (scanf("%d %d", &l, &r) != 2 || l < 1 || r > n || l > r) {
            return 0;
        }
        printf("%lld\n", pre[r] - pre[l - 1]);
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 50000) {
        return 0;
    }

    int v[n];                        /* 变长数组：长度由 n 决定 */
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &v[i]) != 1) {
            return 0;
        }
    }

    /* TODO: 建立前缀和数组 long long pre[n + 1]，并令 pre[0] = 0 */

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 2000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int l, r;
        if (scanf("%d %d", &l, &r) != 2) {
            return 0;
        }
        /* TODO: 用前缀和输出第 l 天到第 r 天的和 */
        printf("%d\n", v[l - 1]);
    }
    return 0;
}
```

## 复杂度
时间 O(n + q)：建前缀和扫一遍数组，每次查询一次减法。
空间 O(n)：两个变长数组都开在栈上（`n = 50000` 时约 600KB），不需要 `malloc`。

如果不用前缀和、每次查询都从头累加，时间复杂度是 O(nq)，最坏 10⁸ 次加法。

## 常见错误
### 前缀和数组用 int [UB]
`n` 个 10 亿相加最大是 5×10¹³，`int` 只能到约 2.1×10⁹。用 `int` 存前缀和，累加几次就会发生有符号整数溢出——这是**未定义行为**，本平台的 UBSan 会直接报告；没有检测时你会得到一个负数或完全不相干的数。注意 `v` 数组可以是 `int`（单个值不超范围），但 `pre` 必须是 `long long`。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 50000) {
        return 0;
    }

    int v[n];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &v[i]) != 1) {
            return 0;
        }
    }

    int pre[n + 1];                  /* 错：3 个 10 亿就已经溢出了 */
    pre[0] = 0;
    for (int i = 0; i < n; i++) {
        pre[i + 1] = pre[i] + v[i];
    }

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 2000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int l, r;
        if (scanf("%d %d", &l, &r) != 2) {
            return 0;
        }
        printf("%d\n", pre[r] - pre[l - 1]);
    }
    return 0;
}
```

### 区间和写成 pre[r] - pre[l] [WA]
`pre[i]` 表示"前 i 个元素的和"，所以区间 `[l, r]` 前面那一段是 `pre[l - 1]`，不是 `pre[l]`。写成 `pre[r] - pre[l]` 会把第 `l` 个元素整个漏掉；只有 `l == r` 这种退化情况才会碰巧输出了 0。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 50000) {
        return 0;
    }

    int v[n];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &v[i]) != 1) {
            return 0;
        }
    }

    long long pre[n + 1];
    pre[0] = 0;
    for (int i = 0; i < n; i++) {
        pre[i + 1] = pre[i] + v[i];
    }

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 2000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int l, r;
        if (scanf("%d %d", &l, &r) != 2) {
            return 0;
        }
        printf("%lld\n", pre[r] - pre[l]);   /* 错：应为 pre[l - 1] */
    }
    return 0;
}
```

### 前缀和数组只开 n 个 [UB]
`pre` 要存 `pre[0]` 到 `pre[n]`，一共 `n + 1` 个。只开 `n` 个还去写 `pre[n]`，就写到了 VLA 的边界之外。编译器知道这个 VLA 的长度是 `n`，本平台的 UBSan 会直接报 `index n out of bounds for type 'long long[n]'`（没有检测时则是栈上的越界写，后果不可预测）。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 50000) {
        return 0;
    }

    int v[n];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &v[i]) != 1) {
            return 0;
        }
    }

    long long pre[n];                /* 错：少开了一个，pre[n] 越界 */
    pre[0] = 0;
    for (int i = 0; i < n; i++) {
        pre[i + 1] = pre[i] + v[i];
    }

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 2000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int l, r;
        if (scanf("%d %d", &l, &r) != 2) {
            return 0;
        }
        printf("%lld\n", pre[r] - pre[l - 1]);
    }
    return 0;
}
```

### 用 int pre[n] = {0} 初始化 VLA [CE]
VLA 的长度在运行时才确定，编译器无法检查初始化列表，所以 `int a[n] = {0};` 是**编译错误**（`variable-sized object may not be initialized`）。需要清零就写循环，或者 `memset(a, 0, sizeof a)`——注意 `sizeof a` 对 VLA 是正确求值的，可以放心用。

### 没有检查 n 就开 VLA [UB]
`scanf("%d", &n); int v[n];` 把用户输入直接当长度，输入 0 或负数时 UBSan 会报 `variable length array bound evaluates to non-positive value`，程序可能悄悄破坏栈。长度来自外部输入时，必须先判断 `1 <= n && n <= 50000`；本题的 `n` 还受栈大小限制，不能随手放宽到 10⁹。

## 测试用例
### 01 sample 示例 1
```in
5
3 1 4 1 5
3
1 5
2 3
4 4
```
```out
14
5
1
```

### 02 sample 示例 2
```in
1
-7
1
1 1
```
```out
-7
```

### 03 boundary 三个 10 亿，和超过 int
```in
3
1000000000 1000000000 1000000000
1
1 3
```
```out
3000000000
```

### 04 degenerate 只有一天且收支为 0
```in
1
0
1
1 1
```
```out
0
```

### 05 trap 全负数区间
```in
4
-5 10 -20 7
3
1 4
2 3
3 3
```
```out
-8
-10
-20
```

### 06 trap 单点查询，答案就是元素本身
```in
3
7 -7 0
3
1 1
2 2
3 3
```
```out
7
-7
0
```

### 07 trap 左端点是 1，必须用到 pre[0]
```in
3
1000000000 1000000000 1000000000
2
1 1
1 3
```
```out
1000000000
3000000000
```

### 08 normal 一般情况
```in
6
1 2 3 4 5 6
3
2 5
1 6
3 3
```
```out
14
21
3
```

### 09 trap 三个负十亿，和超过 int 的下界
```in
3
-1000000000 -1000000000 -1000000000
1
1 3
```
```out
-3000000000
```

### 生成 boundary 最大规模与压力数据
```js gen
const cases = [];

/* 最大规模：50000 个 10 亿，一次查询整个区间，答案 5×10^13 */
const n1 = 50000;
const v1 = new Array(n1).fill(1000000000);
cases.push({
  kind: 'boundary',
  category: '最大规模 50000 个 10 亿，查询整个区间',
  input: `${n1}\n${v1.join(' ')}\n1\n1 ${n1}\n`,
  output: `${n1 * 1000000000}\n`,
});

/* 压力：50000 个随机数，2000 次随机区间查询；期望值用 JS 里的前缀和独立算出 */
const n2 = 50000;
const v2 = [];
const pre = [0];
for (let i = 0; i < n2; i++) {
  const x = rng.int(-1000000000, 1000000000);
  v2.push(x);
  pre.push(pre[i] + x);
}
const q2 = 2000;
const queries = [];
let expected = '';
for (let i = 0; i < q2; i++) {
  let l = rng.int(1, n2);
  let r = rng.int(1, n2);
  if (l > r) {
    const t = l;
    l = r;
    r = t;
  }
  queries.push(`${l} ${r}`);
  expected += `${pre[r] - pre[l - 1]}\n`;
}
cases.push({
  kind: 'stress',
  category: '50000 个随机数、2000 次随机查询',
  input: `${n2}\n${v2.join(' ')}\n${q2}\n${queries.join('\n')}\n`,
  output: expected,
});

return cases;
```
