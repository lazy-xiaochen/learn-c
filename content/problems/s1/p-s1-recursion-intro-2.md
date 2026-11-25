---json
{
  "id": "p-s1-recursion-intro-2",
  "title": "用递归输出 n 层汉诺塔的移动步骤",
  "difficulty": "L3",
  "knowledgePoints": ["s1-recursion-intro"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
有三根柱子 A、B、C，A 上从下到上按从大到小的顺序套着 n 个圆盘。要把所有圆盘移到 C 上，规则是：每次只能移动一个圆盘（某根柱子最上面的那个），并且大盘不能放在小盘上面。

读入 n，第一行输出最少的移动次数，接下来每行输出一步，格式为 `A->C`（把 A 最上面的圆盘移到 C）。如果 n 不在 0 ~ 12 之间，或者没能读入整数，只输出 `invalid`。

## 输入格式
一行，一个整数 n。

## 输出格式
见题目描述。

## 数据范围
n 为 `int` 范围内的整数；合法的 n 满足 0 ≤ n ≤ 12。

## 示例
### 示例 1
```in
2
```
```out
3
A->B
A->C
B->C
```

### 示例 2（边界：没有圆盘）
```in
0
```
```out
0
```

## 提示
### 第 1 层
要把 n 个盘子从 A 移到 C，最大的那个盘子必须在某一步从 A 直接移到 C。在那之前，上面的 n − 1 个盘子必须在哪里？

### 第 2 层
`hanoi(n, from, via, to)`：先把上面 n − 1 个盘子从 from 借助 to 移到 via；再把最大的盘子从 from 移到 to；最后把 n − 1 个盘子从 via 借助 from 移到 to。n 为 0 时什么都不用做。

### 第 3 层
最少移动次数是 2ⁿ − 1，可以用 `(1 << n) - 1` 计算（n ≤ 12 时不会溢出）。柱子名可以用 `char` 参数传递：`hanoi(n, 'A', 'B', 'C')`，输出 `printf("%c->%c\n", from, to)`。

## 参考代码
```c file=main.c
#include <stdio.h>

/* 把 n 个盘子从 from 借助 via 移到 to */
void hanoi(int n, char from, char via, char to) {
    if (n == 0) {
        return;                       /* 终止条件：没有盘子要移动 */
    }
    hanoi(n - 1, from, to, via);      /* 1. 上面 n-1 个移到中转柱 */
    printf("%c->%c\n", from, to);     /* 2. 最大的盘子直接移到目标柱 */
    hanoi(n - 1, via, from, to);      /* 3. n-1 个从中转柱移到目标柱 */
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > 12) {
        printf("invalid\n");
        return 0;
    }
    printf("%d\n", (1 << n) - 1);
    hanoi(n, 'A', 'B', 'C');
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

void hanoi(int n, char from, char via, char to) {
    /* 递归输出移动步骤 */
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > 12) {
        printf("invalid\n");
        return 0;
    }
    printf("%d\n", (1 << n) - 1);
    hanoi(n, 'A', 'B', 'C');
    return 0;
}
```

## 复杂度
移动次数是 2ⁿ − 1，时间 O(2ⁿ)；递归深度为 n，空间 O(n)。

## 常见错误
### 递归时中转柱和目标柱传反 [WA]
第一步应当是把 n − 1 个盘子移到**中转柱**，如果参数顺序写错，大盘最终会压在小盘上，步骤完全不对。
```c file=main.c expect=WA
#include <stdio.h>

void hanoi(int n, char from, char via, char to) {
    if (n == 0) {
        return;
    }
    hanoi(n - 1, from, via, to);
    printf("%c->%c\n", from, to);
    hanoi(n - 1, via, from, to);
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > 12) {
        printf("invalid\n");
        return 0;
    }
    printf("%d\n", (1 << n) - 1);
    hanoi(n, 'A', 'B', 'C');
    return 0;
}
```

### 终止条件写成 n == 1 [RE]
对 n ≥ 1 是对的，但输入 0 时，n 会变成 -1、-2……永远等不到 1，最终栈溢出。
```c file=main.c expect=RE
#include <stdio.h>

void hanoi(int n, char from, char via, char to) {
    if (n == 1) {
        printf("%c->%c\n", from, to);
        return;
    }
    hanoi(n - 1, from, to, via);
    printf("%c->%c\n", from, to);
    hanoi(n - 1, via, from, to);
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > 12) {
        printf("invalid\n");
        return 0;
    }
    printf("%d\n", (1 << n) - 1);
    hanoi(n, 'A', 'B', 'C');
    return 0;
}
```

### 中间那一步输出的是 from->via [WA]
最大的盘子要直接移到**目标柱** to。
```c file=main.c expect=WA
#include <stdio.h>

void hanoi(int n, char from, char via, char to) {
    if (n == 0) {
        return;
    }
    hanoi(n - 1, from, to, via);
    printf("%c->%c\n", from, via);
    hanoi(n - 1, via, from, to);
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > 12) {
        printf("invalid\n");
        return 0;
    }
    printf("%d\n", (1 << n) - 1);
    hanoi(n, 'A', 'B', 'C');
    return 0;
}
```

### 没有限制 n 的范围 [WA]
n 很大时输出量是天文数字（n = 30 时有十亿行）；n 为负数时递归停不下来。题目要求对非法的 n 输出 invalid。

## 测试用例
### 01 sample 示例 1
```in
2
```
```out
3
A->B
A->C
B->C
```

### 02 sample 示例 2
```in
0
```
```out
0
```

### 03 degenerate 一个盘子
```in
1
```
```out
1
A->C
```

### 04 boundary 超出范围
```in
13
```
```out
invalid
```

### 05 trap 负数（递归无法终止）
```in
-1
```
```out
invalid
```

### 06 trap 不是整数
```in
abc
```
```out
invalid
```

### 生成 boundary 合法范围内的各种 n
```js gen
// 在这里用独立的递归实现生成期望输出
const solve = (n) => {
  const moves = [];
  const h = (k, a, b, c) => { if (k === 0) return; h(k - 1, a, c, b); moves.push(`${a}->${c}`); h(k - 1, b, a, c); };
  h(n, 'A', 'B', 'C');
  return `${2 ** n - 1}\n` + moves.map((m) => m + '\n').join('');
};
return [3, 5, 12].map((n) => ({
  kind: n === 12 ? 'boundary' : 'normal',
  category: n === 12 ? '最大规模 n = 12（4095 步）' : `n = ${n}`,
  input: `${n}\n`,
  output: solve(n),
}));
```
