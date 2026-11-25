---json
{
  "id": "p-s2-array-basics-1",
  "title": "求一组整数的和、最大值与最小值",
  "difficulty": "L1",
  "knowledgePoints": ["s2-array-basics", "s1-loops"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入 n 个整数，把它们存进数组，然后再遍历这个数组，输出所有数的和、最大值和最小值。

请用数组保存这 n 个数再统计（这是本知识点要练习的写法），不要边读边算。

## 输入格式
第一行一个整数 n。
第二行 n 个整数，相邻两个之间用一个空格分隔。

## 输出格式
三行，每行一个整数：
1. 所有数的和；
2. 所有数中的最大值；
3. 所有数中的最小值。

## 数据范围
1 ≤ n ≤ 100，每个整数的绝对值不超过 10000。
所有数的和不超过 1000000，在 `int` 的表示范围内。

## 示例
### 示例 1
```in
5
3 1 4 1 5
```
```out
14
5
1
```
> 3 + 1 + 4 + 1 + 5 = 14，最大的是 5，最小的是 1。

### 示例 2（边界：只有一个数）
```in
1
-7
```
```out
-7
-7
-7
```
> 只有一个数时，它同时就是和、最大值和最小值。

## 提示
### 第 1 层
题目要求"先存再统计"，所以需要两遍处理：第一遍把数读进数组，第二遍统计。想一想：统计最大值时，初值应该取什么才不会被负数坑到？

### 第 2 层
用 `int a[100];` 保存（n 最多 100）。读入用 `for (int i = 0; i < n; i++)`。
求和用 `sum = 0`；最大值和最小值的初值都取 `a[0]`，然后从 `i = 1` 开始逐个比较——因为第一个数已经是"目前见过的最大/最小值"了。

### 第 3 层
三行输出的顺序是：和、最大值、最小值。注意当 n = 1 时，"从 i = 1 开始"的循环一次都不执行，此时 max、min 仍然是 a[0]，结果正好正确。读入时养成检查 `scanf` 返回值的习惯。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }

    int a[100];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int sum = 0;
    int max = a[0];
    int min = a[0];
    for (int i = 0; i < n; i++) {
        sum += a[i];
        if (a[i] > max) {
            max = a[i];
        }
        if (a[i] < min) {
            min = a[i];
        }
    }

    printf("%d\n%d\n%d\n", sum, max, min);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }

    int a[100];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    /* 在这里统计，并按"和、最大值、最小值"的顺序输出三行 */
    printf("0\n0\n0\n");
    return 0;
}
```

## 复杂度
时间 O(n)：读入一遍、统计一遍，共访问数组 2n 次。
空间 O(n)：额外开了 100 个 int 的数组（固定大小，与 n 无关，所以也可以说是 O(1)）。
如果不需要保留原始数据，边读边统计可以省掉这个数组——但本题的目的正是练习数组。

## 常见错误
### 最大值初始化为 0 [WA]
如果所有数都是负数（例如 -5 -3 -9），`max = 0` 会让最大值永远停在 0，而 0 根本不在数组里。初值必须取 `a[0]`。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }

    int a[100];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int sum = 0;
    int max = 0;
    int min = a[0];
    for (int i = 0; i < n; i++) {
        sum += a[i];
        if (a[i] > max) {
            max = a[i];
        }
        if (a[i] < min) {
            min = a[i];
        }
    }

    printf("%d\n%d\n%d\n", sum, max, min);
    return 0;
}
```

### 统计循环少算最后一个元素 [WA]
循环写成 `for (int i = 0; i < n - 1; i++)`，最后一个数就没有参加统计。n = 1 时循环一次都不执行，和会输出 0。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }

    int a[100];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int sum = 0;
    int max = a[0];
    int min = a[0];
    for (int i = 0; i < n - 1; i++) {     /* 少算了一个 */
        sum += a[i];
        if (a[i] > max) {
            max = a[i];
        }
        if (a[i] < min) {
            min = a[i];
        }
    }

    printf("%d\n%d\n%d\n", sum, max, min);
    return 0;
}
```

### 输出顺序写错 [WA]
题目要求"和、最大值、最小值"，如果按"最大值、和、最小值"输出，内容虽然都算对了，但位置不对，判题器会判答案错误。OJ 的比对是按行、按位置的。

## 测试用例
### 01 sample 示例 1
```in
5
3 1 4 1 5
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
```
```out
-7
-7
-7
```

### 生成 boundary 最大规模
```js gen
const cases = [];

/* n = 100，全是 100：检验最大规模下的下标边界 */
let input1 = '100\n';
let sum1 = 0;
const v1 = [];
for (let i = 0; i < 100; i++) {
  v1.push(100);
  sum1 += 100;
}
input1 += v1.join(' ') + '\n';
cases.push({ kind: 'boundary', category: '最大规模：100 个 100', input: input1, output: `${sum1}\n100\n100\n` });

/* n = 100，1..100：和是 5050 */
let input2 = '100\n';
let sum2 = 0;
const v2 = [];
for (let i = 1; i <= 100; i++) {
  v2.push(i);
  sum2 += i;
}
input2 += v2.join(' ') + '\n';
cases.push({ kind: 'boundary', category: '最大规模：1 到 100', input: input2, output: `${sum2}\n100\n1\n` });

return cases;
```

### 05 degenerate 只有一个元素且为 0
```in
1
0
```
```out
0
0
0
```

### 06 trap 全部为负数
```in
4
-5 -3 -9 -1
```
```out
-18
-1
-9
```

### 07 trap 全部相同的值
```in
5
7 7 7 7 7
```
```out
35
7
7
```

### 08 degenerate 只有两个数
```in
2
-1 1
```
```out
0
1
-1
```

### 09 normal 正负各一半，和为 0
```in
6
10 -10 20 -20 30 -30
```
```out
0
30
-30
```

### 10 normal 含 0 的一般情况
```in
7
0 1 -1 2 -2 3 -3
```
```out
0
3
-3
```
