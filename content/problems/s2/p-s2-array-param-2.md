---json
{
  "id": "p-s2-array-param-2",
  "title": "原地剔除指定的错误读数：数组参数的传递与修改",
  "difficulty": "L2",
  "knowledgePoints": ["s2-array-param"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一台传感器连续记录了 `n` 个读数，其中混入了一个固定值的**错误读数** `x`（可能重复出现很多次）。请把这些错误读数全部剔除，其余读数**保持原来的先后顺序**。

要求把删除动作写成一个函数：

```c
int remove_value(int a[], int n, int x);
```

它的职责是：在数组 `a` 的前 `n` 个元素中删除所有等于 `x` 的元素，把剩下的元素按原顺序紧凑地放在数组开头，并**返回剩下的元素个数**。

注意两件事：

1. 函数要**原地**完成（不能再开一个同样大的数组）；
2. 函数只拿到 `a` 和 `n`：`a` 是数组的**首地址**，函数里没有办法知道数组有多长，长度只能靠参数 `n` 传进来。删除之后的新长度也只能靠 `return` 带回去。

## 输入格式
第一行一个整数 `n`。
第二行 `n` 个整数，用空格分隔。
第三行一个整数 `x`。

## 输出格式
第一行输出剩下的元素个数 `k`。
第二行输出剩下的 `k` 个整数，用单个空格分隔，保持原来的先后顺序；如果 `k = 0`，第二行输出 `empty`。

## 数据范围
1 ≤ n ≤ 1000
-1000000000 ≤ 每个读数, x ≤ 1000000000

## 示例
### 示例 1
```in
5
1 2 3 2 4
2
```
```out
3
1 3 4
```
> 删掉两个 2，剩下 `1 3 4`，共 3 个，顺序不变。

### 示例 2（边界：全部被删除）
```in
3
7 7 7
7
```
```out
0
empty
```
> 三个元素都等于 7，一个也不剩，此时第二行输出 `empty`。

## 提示
### 第 1 层
先想清楚"原地删除"怎么在**一次遍历**里完成：用一个变量记录"下一个留下来的元素该写到哪"，再用另一个变量从头扫描原数组。

### 第 2 层
设 `w = 0` 表示写位置。扫描 `i = 0 .. n-1`：如果 `a[i] != x`，就把它写到 `a[w]`，然后 `w++`；如果 `a[i] == x`，直接跳过。扫描结束时，`a[0] .. a[w-1]` 就是结果，`w` 就是新长度。

因为 `w` 永远不超过 `i`，写的位置不会覆盖还没读到的元素，所以不需要额外数组。

### 第 3 层
函数返回 `w`（不是 `n`！返回值就是新长度）。在 `main` 里用 `int k = remove_value(a, n, x);` 接住它，然后只输出 `a[0] .. a[k-1]`。

特别注意：函数内部**不能**写 `int n = sizeof a / sizeof a[0];` 来求长度——形参 `a` 只是指针，`sizeof a` 恒为 8，算出来永远是 2。长度只能是传进来的那个 `n`。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAXN 1000

/* 删除 a[0..n-1] 中所有等于 x 的元素，返回剩余元素个数 */
static int remove_value(int a[], int n, int x) {
    int w = 0;                       /* 下一个要写入的位置 */
    for (int i = 0; i < n; i++) {
        if (a[i] != x) {
            a[w] = a[i];
            w++;
        }
    }
    return w;                        /* 新长度由返回值带回调用者 */
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }

    int a[MAXN];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int x;
    if (scanf("%d", &x) != 1) {
        return 0;
    }

    int k = remove_value(a, n, x);
    printf("%d\n", k);
    if (k == 0) {
        printf("empty\n");
    } else {
        for (int i = 0; i < k; i++) {
            printf("%d%c", a[i], i + 1 == k ? '\n' : ' ');
        }
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAXN 1000

/* TODO: 删除 a[0..n-1] 中所有等于 x 的元素，返回剩余元素个数 */
static int remove_value(int a[], int n, int x) {
    (void)a;
    (void)x;
    return n;                        /* 现在什么都没删 */
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }

    int a[MAXN];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int x;
    if (scanf("%d", &x) != 1) {
        return 0;
    }

    int k = remove_value(a, n, x);
    printf("%d\n", k);
    if (k == 0) {
        printf("empty\n");
    } else {
        for (int i = 0; i < k; i++) {
            printf("%d%c", a[i], i + 1 == k ? '\n' : ' ');
        }
    }
    return 0;
}
```

## 复杂度
时间 O(n)：只需从前往后扫描一遍数组。
空间 O(1)：原地移动元素，没有开辟额外的数组。

如果改用"每遇到一个 x 就把后面所有元素整体前移一格"的写法，最坏情况是 O(n²)（例如 1000 个元素全部等于 x），虽然本题数据范围也能通过，但不是好习惯。

## 常见错误
### 在函数里用 sizeof 求长度 [WA]
形参 `int a[]` 会被调整成 `int *a`，函数里的 `a` 只是一个 8 字节的指针，`sizeof a / sizeof a[0]` 永远等于 2。长度只能用参数 `n`；把它覆盖掉之后，样例 1 只会处理前两个元素。
```c file=main.c expect=WA
#include <stdio.h>

#define MAXN 1000

static int remove_value(int a[], int n, int x) {
    n = (int)(sizeof a / sizeof a[0]);   /* 错：a 是指针，n 变成 2 */
    int w = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] != x) {
            a[w] = a[i];
            w++;
        }
    }
    return w;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }

    int a[MAXN];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int x;
    if (scanf("%d", &x) != 1) {
        return 0;
    }

    int k = remove_value(a, n, x);
    printf("%d\n", k);
    if (k == 0) {
        printf("empty\n");
    } else {
        for (int i = 0; i < k; i++) {
            printf("%d%c", a[i], i + 1 == k ? '\n' : ' ');
        }
    }
    return 0;
}
```

### 整体前移后忘记把 i 退回去，连续重复的元素被跳过 [WA]
"遇到 `a[i] == x` 就把后面元素整体前移一格"的写法本身可以工作，但前移之后 `a[i]` 已经变成了**下一个**元素，如果 `i++` 继续往前走，就会漏掉紧跟在后面的相同元素。样例 `1 1 1 2 2 3` 会剩下一个 1。
```c file=main.c expect=WA
#include <stdio.h>

#define MAXN 1000

static int remove_value(int a[], int n, int x) {
    for (int i = 0; i < n; i++) {
        if (a[i] == x) {
            for (int j = i; j < n - 1; j++) {
                a[j] = a[j + 1];
            }
            n--;
            /* 错：a[i] 已经是新元素，应该 i-- 再让循环 i++，否则会漏判 */
        }
    }
    return n;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }

    int a[MAXN];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int x;
    if (scanf("%d", &x) != 1) {
        return 0;
    }

    int k = remove_value(a, n, x);
    printf("%d\n", k);
    if (k == 0) {
        printf("empty\n");
    } else {
        for (int i = 0; i < k; i++) {
            printf("%d%c", a[i], i + 1 == k ? '\n' : ' ');
        }
    }
    return 0;
}
```

### 忘记返回新长度 [WA]
元素已经正确紧凑到数组开头了，但函数返回的仍是原来的 `n`。`main` 于是会多打印那些"已经作废"的旧位置，输出里出现重复的值。
```c file=main.c expect=WA
#include <stdio.h>

#define MAXN 1000

static int remove_value(int a[], int n, int x) {
    int w = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] != x) {
            a[w] = a[i];
            w++;
        }
    }
    return n;                        /* 错：应当返回 w */
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }

    int a[MAXN];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int x;
    if (scanf("%d", &x) != 1) {
        return 0;
    }

    int k = remove_value(a, n, x);
    printf("%d\n", k);
    if (k == 0) {
        printf("empty\n");
    } else {
        for (int i = 0; i < k; i++) {
            printf("%d%c", a[i], i + 1 == k ? '\n' : ' ');
        }
    }
    return 0;
}
```

### k == 0 时的输出格式写错 [WA]
全部元素都被删除时，题目要求第二行输出 `empty`。有人直接省略第二行，有人写成空行，还有人忘了判断 `k == 0` 而进入打印循环（循环一次都不执行，第二行就消失了）。判题按行比较，缺一行就是答案错误。

## 测试用例
### 01 sample 示例 1
```in
5
1 2 3 2 4
2
```
```out
3
1 3 4
```

### 02 sample 示例 2
```in
3
7 7 7
7
```
```out
0
empty
```

### 03 boundary 只有一个元素且不被删除
```in
1
5
3
```
```out
1
5
```

### 04 degenerate 只有一个元素且被删除
```in
1
5
5
```
```out
0
empty
```

### 05 trap 连续相同的元素
```in
6
1 1 1 2 2 3
1
```
```out
3
2 2 3
```

### 06 trap 目标值连续出现在末尾
```in
4
9 8 7 7
7
```
```out
2
9 8
```

### 07 trap 负值且 x 等于 int 下界附近的值
```in
5
-1000000000 0 -1000000000 1 2
-1000000000
```
```out
3
0 1 2
```

### 08 normal 一般情况
```in
7
3 -1 3 -1 0 3 5
3
```
```out
4
-1 -1 0 5
```

### 09 trap 目标值不存在，一个也不删
```in
4
1 2 3 4
99
```
```out
4
1 2 3 4
```

### 生成 boundary 最大规模
```js gen
const cases = [];

/* 1000 个元素全部等于 x：必须删干净，且不能越界 */
const v1 = new Array(1000).fill(-7);
cases.push({
  kind: 'boundary',
  category: '最大规模：1000 个 -7，全部删除',
  input: '1000\n' + v1.join(' ') + '\n-7\n',
  output: '0\nempty\n',
});

/* 1000 个元素是 0..4 循环，删除 2；期望值用 filter 独立算出 */
const v2 = [];
for (let i = 0; i < 1000; i++) v2.push(i % 5);
const keep = v2.filter((x) => x !== 2);
cases.push({
  kind: 'boundary',
  category: '最大规模：1000 个元素，删除 2',
  input: '1000\n' + v2.join(' ') + '\n2\n',
  output: `${keep.length}\n${keep.join(' ')}\n`,
});

return cases;
```
