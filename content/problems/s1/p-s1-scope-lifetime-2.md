---json
{
  "id": "p-s1-scope-lifetime-2",
  "title": "考拉兹序列：用函数求步数，用全局变量记录峰值与累计步数",
  "difficulty": "L2",
  "knowledgePoints": ["s1-scope-lifetime", "s1-func-basics"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
对正整数 n 反复进行如下变换：n 为偶数时变成 n / 2，为奇数时变成 3n + 1，直到 n 变成 1。变换的次数称为 n 的"步数"，过程中出现过的最大值称为 n 的"峰值"（包括 n 本身）。例如 6 → 3 → 10 → 5 → 16 → 8 → 4 → 2 → 1，步数为 8，峰值为 16。

读入 q 个正整数，对每个数输出它的步数和峰值；最后输出所有数的步数之和。

建议写一个函数 `int collatz_steps(long long n)` 返回步数，同时把峰值存进一个**全局变量**，把累计步数加到另一个**全局变量**上（函数只能返回一个值，在学习指针之前，全局变量是让函数"带出"更多信息的一种方式）。

## 输入格式
第一行一个整数 q；接下来 q 行，每行一个正整数 n。

## 输出格式
q 行，每行 `步数 峰值`；最后一行 `total=<步数之和>`。

## 数据范围
1 ≤ q ≤ 1000；1 ≤ n ≤ 1000000000

## 示例
### 示例 1
```in
2
6
1
```
```out
8 16
0 1
total=8
```

### 示例 2（边界：n = 1，不需要变换）
```in
1
1
```
```out
0 1
total=0
```

## 提示
### 第 1 层
函数怎样把"步数""峰值""累计步数"三个结果交给 main？哪些变量需要在多次调用之间保持？

### 第 2 层
步数用返回值；峰值和累计步数用全局变量（声明在所有函数外面，自动初始化为 0，程序运行期间一直存在）。另外：n 不超过 10⁹，但 3n + 1 的过程中数值会超过 `int` 的范围，例如 113383 的峰值是 2482111348。

### 第 3 层
`long long peak; long long total_steps;` 声明在函数外；函数里 `peak = n;`，循环中每次变换后更新 peak；返回前 `total_steps += steps;`。序列中的数要用 `long long`。

## 参考代码
```c file=main.c
#include <stdio.h>

long long peak;          /* 全局变量：最近一次调用得到的峰值 */
long long total_steps;   /* 全局变量：累计步数，自动初始化为 0，在多次调用之间保持 */

int collatz_steps(long long n) {   /* 3n+1 会超出 int，必须用 long long */
    int steps = 0;                 /* 局部变量：每次调用重新从 0 开始 */
    peak = n;
    while (n != 1) {
        n = (n % 2 == 0) ? n / 2 : 3 * n + 1;
        if (n > peak) {
            peak = n;
        }
        steps++;
    }
    total_steps += steps;
    return steps;
}

int main(void) {
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        long long n;
        if (scanf("%lld", &n) != 1 || n < 1) {
            return 0;
        }
        int s = collatz_steps(n);
        printf("%d %lld\n", s, peak);
    }
    printf("total=%lld\n", total_steps);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

/* 在这里声明需要的全局变量 */

int collatz_steps(long long n) {
    /* 返回步数，并记录峰值、累计步数 */
    return 0;
}

int main(void) {
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        long long n;
        if (scanf("%lld", &n) != 1 || n < 1) {
            return 0;
        }
        /* 调用函数并输出 */
    }
    /* 输出累计步数 */
    return 0;
}
```

## 复杂度
每个数的步数不超过 1000（n ≤ 10⁹ 时最多 986 步），总时间 O(q × 步数)。

## 常见错误
### 用 int 存放序列中的数 [UB]
113383 在变换过程中会达到 2482111348，`3 * n + 1` 在 `int` 下溢出。
```c file=main.c expect=UB
#include <stdio.h>

int peak;
long long total_steps;

int collatz_steps(int n) {
    int steps = 0;
    peak = n;
    while (n != 1) {
        n = (n % 2 == 0) ? n / 2 : 3 * n + 1;
        if (n > peak) {
            peak = n;
        }
        steps++;
    }
    total_steps += steps;
    return steps;
}

int main(void) {
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int n;
        if (scanf("%d", &n) != 1 || n < 1) {
            return 0;
        }
        int s = collatz_steps(n);
        printf("%d %d\n", s, peak);
    }
    printf("total=%lld\n", total_steps);
    return 0;
}
```

### 累计步数用了函数里的局部变量 [WA]
局部变量每次调用都重新创建并初始化，"累计"只累计了最后一次。
```c file=main.c expect=WA
#include <stdio.h>

long long peak;
long long total_steps;

int collatz_steps(long long n) {
    int steps = 0;
    long long total = 0;
    peak = n;
    while (n != 1) {
        n = (n % 2 == 0) ? n / 2 : 3 * n + 1;
        if (n > peak) {
            peak = n;
        }
        steps++;
    }
    total += steps;
    total_steps = total;
    return steps;
}

int main(void) {
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        long long n;
        if (scanf("%lld", &n) != 1 || n < 1) {
            return 0;
        }
        int s = collatz_steps(n);
        printf("%d %lld\n", s, peak);
    }
    printf("total=%lld\n", total_steps);
    return 0;
}
```

### 峰值没有在每次调用开始时重置 [WA]
peak 是全局变量，会保留上一个数的峰值；如果只在"更大时更新"而不先设为 n，小数的峰值会错误地沿用前一个大数的峰值。
```c file=main.c expect=WA
#include <stdio.h>

long long peak;
long long total_steps;

int collatz_steps(long long n) {
    int steps = 0;
    if (n > peak) {
        peak = n;
    }
    while (n != 1) {
        n = (n % 2 == 0) ? n / 2 : 3 * n + 1;
        if (n > peak) {
            peak = n;
        }
        steps++;
    }
    total_steps += steps;
    return steps;
}

int main(void) {
    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        long long n;
        if (scanf("%lld", &n) != 1 || n < 1) {
            return 0;
        }
        int s = collatz_steps(n);
        printf("%d %lld\n", s, peak);
    }
    printf("total=%lld\n", total_steps);
    return 0;
}
```

### 在函数里重新声明同名的局部 peak [WA]
函数里写了 `long long peak = n;`（多了类型名），它遮蔽了全局的 peak，main 读到的全局 peak 始终是 0。用 `-Wshadow` 可以发现这类问题。

## 测试用例
### 01 sample 示例 1
```in
2
6
1
```
```out
8 16
0 1
total=8
```

### 02 sample 示例 2
```in
1
1
```
```out
0 1
total=0
```

### 03 trap 峰值超出 int（2482111348）
```in
1
113383
```
```out
247 2482111348
total=247
```

### 04 boundary n 的最大值
```in
1
1000000000
```
```out
100 1000000000
total=100
```

### 05 boundary 10^9 以内步数最多的数
```in
1
670617279
```
```out
986 966616035460
total=986
```

### 06 degenerate 同一个数重复出现
```in
3
2
2
2
```
```out
1 2
1 2
1 2
total=3
```

### 07 trap 大数之后跟小数（峰值必须重置）
```in
2
999999999
7
```
```out
361 129746337892
16 52
total=377
```

### 08 normal 一般情况
```in
3
27
7
97
```
```out
111 9232
16 52
118 9232
total=245
```

### 生成 boundary 最大规模
```js gen
// q = 1000 个随机数，用 BigInt 独立模拟
const q = 1000, ns = [], out = [];
let total = 0n;
for (let i = 0; i < q; i++) {
  const n0 = rng.int(1, 1000000000);
  ns.push(n0);
  let n = BigInt(n0), peak = n, s = 0n;
  while (n !== 1n) { n = n % 2n === 0n ? n / 2n : 3n * n + 1n; if (n > peak) peak = n; s++; }
  total += s;
  out.push(`${s} ${peak}`);
}
out.push(`total=${total}`);
return [{ kind: 'boundary', category: '最大规模 q = 1000', input: `${q}\n${ns.join('\n')}\n`, output: out.join('\n') + '\n' }];
```
