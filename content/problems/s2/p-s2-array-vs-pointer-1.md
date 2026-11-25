---json
{
  "id": "p-s2-array-vs-pointer-1",
  "title": "数组原地去重：用读写两个指针保序去重",
  "difficulty": "L2",
  "knowledgePoints": ["s2-array-vs-pointer", "s2-pointer-arith"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一批采集到的整数里有重复值，需要**保序去重**：只保留每个值第一次出现的那一个，其余删掉，剩下的元素保持原来的相对顺序。

要求在原数组上就地完成，不许额外开一个同样大的数组。标准做法是**读写两个指针**：

- `read` 从头到尾扫描每个元素；
- `write` 指向"下一个唯一元素应该放的位置"；
- 如果 `a[read]` 在 `a[0..write-1]` 里还没出现过，就把它写到 `a[write]`，然后 `write++`。

最后 `write` 的值就是去重后的元素个数。

## 输入格式
第一行一个整数 `n`。
第二行 `n` 个整数，用空格分隔。

## 输出格式
两行：
1. 去重后的元素个数；
2. 去重后的元素，相邻两个用一个空格分隔（行末不要多余空格）。

## 数据范围
1 ≤ n ≤ 1000
-2147483648 ≤ 每个元素 ≤ 2147483647

元素可能重复，也可能全部相同；重复的元素不一定相邻。

## 示例
### 示例 1
```in
6
1 2 2 3 2 1
```
```out
3
1 2 3
```
> 第一次出现的顺序是 `1`、`2`、`3`；后面的 `2` 和 `1` 都是重复的，被跳过。

### 示例 2（边界：只有一个元素）
```in
1
-5
```
```out
1
-5
```
> 只有一个元素时它一定是唯一的，个数为 1。

## 提示
### 第 1 层
不要开新数组。让一个指针负责"读"，一个指针负责"写"，写指针永远不会超过读指针，所以原数组前面的空间足够放下所有唯一元素。

### 第 2 层
`a[read]` 要不要保留，取决于它有没有在"已经确定的结果"（也就是 `a[0]` 到 `a[write-1]`）里出现过。用一个内层循环在 `0 .. write-1` 里找一遍即可。

### 第 3 层
```c
int write = 0;
for (int read = 0; read < n; read++) {
    int seen = 0;
    for (int j = 0; j < write; j++) {
        if (a[j] == a[read]) { seen = 1; break; }
    }
    if (!seen) a[write++] = a[read];
}
```
循环结束后 `write` 就是答案。输出时先用 `printf("%d\n", write)`，再按 `0 .. write-1` 输出元素。

## 参考代码
```c file=main.c
#include <stdio.h>

/* 原地保序去重，返回去重后的元素个数 */
static int dedup(int *a, int n) {
    int write = 0;                       /* 下一个唯一元素写到哪里 */
    for (int read = 0; read < n; read++) {
        int seen = 0;
        for (int j = 0; j < write; j++) {
            if (a[j] == a[read]) {       /* 已经在结果里出现过 */
                seen = 1;
                break;
            }
        }
        if (!seen) {
            a[write] = a[read];
            write++;
        }
    }
    return write;
}

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

    int unique = dedup(a, n);

    printf("%d\n", unique);
    for (int i = 0; i < unique; i++) {
        printf("%d%c", a[i], i + 1 == unique ? '\n' : ' ');
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

/* TODO: 用读写两个指针原地去重，返回唯一元素个数 */
static int dedup(int *a, int n) {
    (void)a;
    return n;
}

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

    int unique = dedup(a, n);

    printf("%d\n", unique);
    for (int i = 0; i < unique; i++) {
        printf("%d%c", a[i], i + 1 == unique ? '\n' : ' ');
    }
    return 0;
}
```

## 复杂度
时间 O(n²)：每个元素最多和前面 `write` 个元素比较一次，最坏（全不相同）约 n²/2 次比较，n = 1000 时约 50 万次，远小于 1 秒。
空间 O(1)：只用了两个下标变量，原地修改数组。

如果 n 更大，可以排序后去重（会改变顺序）或用哈希表（需要额外空间）；本题要求保序且原地，O(n²) 是合适的取舍。

## 常见错误
### 只删除相邻的重复元素 [WA]
`if (a[i] != a[i - 1]) a[write++] = a[i];` 只对"已经排好序"的数组有效。题目里的重复可能隔着很远（例如 `1 2 1`），这种写法会漏掉后面的重复。
```c file=main.c expect=WA
#include <stdio.h>

static int dedup(int *a, int n) {
    int write = 0;
    for (int read = 0; read < n; read++) {
        if (read == 0 || a[read] != a[read - 1]) {   /* 错：只比较相邻元素 */
            a[write] = a[read];
            write++;
        }
    }
    return write;
}

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

    int unique = dedup(a, n);

    printf("%d\n", unique);
    for (int i = 0; i < unique; i++) {
        printf("%d%c", a[i], i + 1 == unique ? '\n' : ' ');
    }
    return 0;
}
```

### 输出了去重结果，但个数仍然用 n [WA]
`dedup` 的返回值就是唯一元素个数，不能继续用原始的 `n`。用 `n` 还会把 `a[unique]` 之后那些"没被覆盖的旧值"也打印出来，看起来像是去重失败了。
```c file=main.c expect=WA
#include <stdio.h>

static int dedup(int *a, int n) {
    int write = 0;
    for (int read = 0; read < n; read++) {
        int seen = 0;
        for (int j = 0; j < write; j++) {
            if (a[j] == a[read]) {
                seen = 1;
                break;
            }
        }
        if (!seen) {
            a[write] = a[read];
            write++;
        }
    }
    return write;
}

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

    int unique = dedup(a, n);

    printf("%d\n", n);                 /* 错：应该输出 unique */
    for (int i = 0; i < unique; i++) {
        printf("%d%c", a[i], i + 1 == unique ? '\n' : ' ');
    }
    return 0;
}
```

### 写指针和读指针用反 [WA]
`a[read] = a[write]` 会把还没处理的数据覆盖掉。记住方向：**读指针只读、写指针只写**，赋值永远是 `a[write] = a[read]`，并且写完才 `write++`。

### 先输出序列、后输出个数 [WA]
输出格式是固定的：第一行个数，第二行序列。顺序反了判题就是答案错误，哪怕内容完全正确。

### 用 sizeof 计算"数组长度" [WA]
`int dedup(int *a, int n)` 里的 `a` 已经退化成指针，`sizeof a` 是 8 而不是 `n * 4`。元素个数必须由调用者传进来——这也是本题函数签名里要有 `n` 的原因。

## 测试用例
### 01 sample 示例 1
```in
6
1 2 2 3 2 1
```
```out
3
1 2 3
```

### 02 sample 示例 2
```in
1
-5
```
```out
1
-5
```

### 03 boundary 全部不相同
```in
5
5 4 3 2 1
```
```out
5
5 4 3 2 1
```

### 04 degenerate 全部相同
```in
6
9 9 9 9 9 9
```
```out
1
9
```

### 05 trap 重复元素不相邻
```in
8
1 2 1 2 1 2 1 2
```
```out
2
1 2
```

### 06 trap 含负数的重复
```in
7
-1 -2 -1 -3 -2 -4 -1
```
```out
4
-1 -2 -3 -4
```

### 07 normal 交错的两组数字
```in
10
0 1 0 2 1 3 2 4 3 5
```
```out
6
0 1 2 3 4 5
```

### 08 boundary int 的两个端点各重复一次
```in
4
-2147483648 2147483647 -2147483648 2147483647
```
```out
2
-2147483648 2147483647
```
