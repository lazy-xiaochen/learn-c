---json
{
  "id": "p-s1-loops-1",
  "title": "读入 n 个整数，求它们的和、最小值与最大值",
  "difficulty": "L1",
  "knowledgePoints": ["s1-loops"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
第一行是一个整数 n，第二行是 n 个整数。输出这 n 个数的和、最小值和最大值。n 为 0 时输出 `empty`。

## 输入格式
第一行一个整数 n；第二行 n 个整数，用空格分隔（n 为 0 时第二行为空）。

## 输出格式
一行，格式为 `sum=<和> min=<最小值> max=<最大值>`；或者 `empty`。

## 数据范围
0 ≤ n ≤ 100000；每个整数 x 满足 -1000000000 ≤ x ≤ 1000000000

## 示例
### 示例 1
```in
5
3 -1 4 1 5
```
```out
sum=12 min=-1 max=5
```

### 示例 2（边界：只有一个数）
```in
1
-7
```
```out
sum=-7 min=-7 max=-7
```

## 提示
### 第 1 层
用 `for` 循环读 n 次。最小值和最大值在循环开始之前应该初始化成什么？

### 第 2 层
不能初始化成 0：如果所有数都是负数，最大值就会错误地停留在 0。可以用**第一个读到的数**同时作为最小值和最大值的初始值。另外，10⁵ 个 10⁹ 相加约为 10¹⁴，和要用 `long long`。

### 第 3 层
先读第一个数，令 `min = max = sum = x`；再用循环读剩下的 n − 1 个数，逐个更新。输出时 sum 用 `%lld`。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0) {
        return 0;
    }
    if (n == 0) {
        printf("empty\n");
        return 0;
    }
    int x;
    if (scanf("%d", &x) != 1) {
        return 0;
    }
    /* 用第一个数初始化，最值就不会受"初始值"的影响 */
    long long sum = x;   /* 最大约 10^14，超出 int */
    int min = x, max = x;
    for (int i = 1; i < n; i++) {
        if (scanf("%d", &x) != 1) {
            return 0;
        }
        sum += x;
        if (x < min) min = x;
        if (x > max) max = x;
    }
    printf("sum=%lld min=%d max=%d\n", sum, min, max);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0) {
        return 0;
    }
    /* 读入 n 个数，输出和、最小值、最大值 */

    return 0;
}
```

## 复杂度
时间 O(n)，空间 O(1)：不需要把数存下来，读一个处理一个。

## 常见错误
### 最大值初始化为 0 [WA]
所有数都是负数时，最大值会一直是 0。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0) {
        return 0;
    }
    if (n == 0) {
        printf("empty\n");
        return 0;
    }
    long long sum = 0;
    int min = 0, max = 0;
    for (int i = 0; i < n; i++) {
        int x;
        if (scanf("%d", &x) != 1) {
            return 0;
        }
        sum += x;
        if (x < min) min = x;
        if (x > max) max = x;
    }
    printf("sum=%lld min=%d max=%d\n", sum, min, max);
    return 0;
}
```

### 和用 int 保存 [UB]
很多个较大的数相加会超出 `int` 的范围。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0) {
        return 0;
    }
    if (n == 0) {
        printf("empty\n");
        return 0;
    }
    int x;
    if (scanf("%d", &x) != 1) {
        return 0;
    }
    int sum = x, min = x, max = x;
    for (int i = 1; i < n; i++) {
        if (scanf("%d", &x) != 1) {
            return 0;
        }
        sum += x;
        if (x < min) min = x;
        if (x > max) max = x;
    }
    printf("sum=%d min=%d max=%d\n", sum, min, max);
    return 0;
}
```

### 循环次数差一 [WA]
用第一个数初始化之后，循环还写成 `for (int i = 0; i < n; i++)`，会多读一个不存在的数：最后一次 scanf 失败，程序没有任何输出。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0) {
        return 0;
    }
    if (n == 0) {
        printf("empty\n");
        return 0;
    }
    int x;
    if (scanf("%d", &x) != 1) {
        return 0;
    }
    long long sum = x;
    int min = x, max = x;
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &x) != 1) {
            return 0;
        }
        sum += x;
        if (x < min) min = x;
        if (x > max) max = x;
    }
    printf("sum=%lld min=%d max=%d\n", sum, min, max);
    return 0;
}
```

### n 为 0 时没有特殊处理 [WA]
没有任何数时既没有最小值也没有最大值，必须单独输出 empty。

## 测试用例
### 01 sample 示例 1
```in
5
3 -1 4 1 5
```
```out
sum=12 min=-1 max=5
```

### 02 sample 示例 2
```in
1
-7
```
```out
sum=-7 min=-7 max=-7
```

### 03 degenerate n 为 0
```in
0

```
```out
empty
```

### 04 trap 全部为负数（最大值初始化为 0 会出错）
```in
4
-5 -3 -8 -1
```
```out
sum=-17 min=-8 max=-1
```

### 05 degenerate 全部相同
```in
6
42 42 42 42 42 42
```
```out
sum=252 min=42 max=42
```

### 06 boundary 取值范围的两端
```in
2
1000000000 -1000000000
```
```out
sum=0 min=-1000000000 max=1000000000
```

### 07 trap 和超出 int 范围
```in
3
1000000000 1000000000 1000000000
```
```out
sum=3000000000 min=1000000000 max=1000000000
```

### 生成 boundary 最大规模
```js gen
// n = 100000，前 1000 个是 10^9，其余随机；期望值在这里独立计算
const n = 100000;
const xs = [];
for (let i = 0; i < n; i++) xs.push(i < 1000 ? 1000000000 : rng.int(-1000000000, 1000000000));
let sum = 0n, min = xs[0], max = xs[0];
for (const x of xs) { sum += BigInt(x); if (x < min) min = x; if (x > max) max = x; }
return [
  { kind: 'boundary', category: '最大规模 n = 100000', input: `${n}\n${xs.join(' ')}\n`, output: `sum=${sum} min=${min} max=${max}\n` },
];
```
