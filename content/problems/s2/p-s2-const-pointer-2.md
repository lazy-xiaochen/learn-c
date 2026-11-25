---json
{
  "id": "p-s2-const-pointer-2",
  "title": "只读表上的二分查找：找第一次出现的位置",
  "difficulty": "L3",
  "knowledgePoints": ["s2-const-pointer", "s2-pointer-arith"],
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一张按学号从小到大排好序的记录表（可能有重复学号）需要支持大量查询：给定一个学号，找出它**第一次出现**的位置（下标从 0 开始）；如果表里没有这个学号，输出 `-1`。

记录表在整个查询过程中是**只读**的：题目保证你不会修改它，也要求你在代码里用 `const int *` 声明查找函数的参数，把这个承诺写进类型里。查找函数应当写成这样：

```c
int first_index(const int *a, int n, int key);
```

`const int *` 一方面防止你手滑写 `a[i] = ...` 改掉数据，另一方面也说明这个函数可以接收任何"只读"的数组。表最多有 10 万个元素、最多 1000 次查询，逐个线性扫描最坏要做 10^8 次比较，很容易超时，所以要利用"已经排好序"这个条件做**二分查找**。

注意题目要的不是"随便找到一个"，而是**第一次出现**的位置。

## 输入格式
第一行一个整数 `n`，表示记录个数。
第二行 `n` 个整数，按**非递减**顺序给出，相邻两个用一个空格分隔。
第三行一个整数 `q`，表示查询次数。
接下来 `q` 行，每行一个整数 `key`，表示要查找的学号。

## 输出格式
共 `q` 行，每行一个整数：
- 如果 `key` 在表中出现，输出它**第一次出现**的下标（从 0 开始）；
- 否则输出 `-1`。

## 数据范围
- 1 ≤ n ≤ 100000
- |a[i]| ≤ 1000000000，且 `a[0] ≤ a[1] ≤ ... ≤ a[n-1]`
- 1 ≤ q ≤ 1000
- |key| ≤ 1000000000

下标范围是 `0` 到 `n - 1`，返回 `-1` 表示"不存在"，不要和合法的下标 0 混淆。

## 示例
### 示例 1
```in
7
1 3 3 3 7 9 9
4
3
8
1
9
```
```out
1
-1
0
5
```
> 3 出现了三次，第一次在下标 1；8 不在表里，输出 -1；1 在下标 0；9 第一次出现在下标 5。

### 示例 2（边界：表中只有一个元素）
```in
1
5
2
5
4
```
```out
0
-1
```
> 表里只有 5：查 5 得到下标 0，查 4 得到 -1。这是二分查找最容易写错边界的规模。

## 提示
### 第 1 层
表已经排好序，不要从头扫。二分查找每次把候选范围缩小一半，`q` 次查询总共只需要约 `q × log2(n)` 次比较。难点不在"找到"，而在"找到**第一个**"。

### 第 2 层
维护一个**半开区间** `[lo, hi)`，表示"答案一定在这个范围里"，初始时 `lo = 0, hi = n`。取 `mid = lo + (hi - lo) / 2`：
- 如果 `a[mid] < key`，说明 `mid` 以及它左边都不可能是答案，令 `lo = mid + 1`；
- 否则（`a[mid] >= key`），答案可能是 `mid`，也可能在它左边，令 `hi = mid`。

循环到 `lo == hi` 时，`lo` 就是"第一个大于等于 key 的位置"。

### 第 3 层
循环结束后不要直接返回 `lo`：还要检查 `lo < n && a[lo] == key`，成立才返回 `lo`，否则返回 `-1`。`hi` 初始是 `n`（不是 `n - 1`），循环条件是 `lo < hi`（不是 `lo <= hi`），这两点决定了 key 比所有元素都大时不会越界。查找函数写成 `int first_index(const int *a, int n, int key)`。

## 参考代码
```c file=main.c
#include <stdio.h>

/* 在只读的有序数组里找 key 第一次出现的位置；找不到返回 -1 */
static int first_index(const int *a, int n, int key) {
    int lo = 0;
    int hi = n;                      /* 答案在 [lo, hi) 这个半开区间里 */
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] < key) {
            lo = mid + 1;            /* mid 和它左边都小于 key */
        } else {
            hi = mid;                /* mid 可能是答案，保留它 */
        }
    }
    /* 此时 lo 是第一个 >= key 的位置 */
    if (lo < n && a[lo] == key) {
        return lo;
    }
    return -1;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100000) {
        return 0;
    }
    int a[100000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }
    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int key;
        if (scanf("%d", &key) != 1) {
            return 0;
        }
        printf("%d\n", first_index(a, n, key));
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100000) {
        return 0;
    }
    int a[100000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }
    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }

    /* TODO：实现 first_index(const int *a, int n, int key)，
     * 对每个 key 输出它第一次出现的下标，找不到输出 -1。
     * 下面只是占位，所有查询都输出 -1。 */
    for (int i = 0; i < q; i++) {
        int key;
        if (scanf("%d", &key) != 1) {
            return 0;
        }
        printf("-1\n");
    }
    return 0;
}
```

## 复杂度
时间：读入 O(n)，每次查询 O(log n)，总共 O(n + q log n)。n = 100000、q = 1000 时大约 100000 + 17000 次操作。
空间：O(n)，用来存整张表。

## 常见错误
### 用普通二分"找到一个就返回" [WA]
这是最常见的错误：二分只保证"找到一个等于 key 的位置"，并不保证是第一个。只要表里有重复元素，它可能返回中间那一个。本题必须一直收缩到"第一个大于等于 key 的位置"，再检查是否相等。
```c file=main.c
#include <stdio.h>

static int first_index(const int *a, int n, int key) {
    int lo = 0, hi = n - 1;
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        if (a[mid] == key) {
            return mid;                 /* 错：可能是任意一个重复元素 */
        }
        if (a[mid] < key) {
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return -1;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100000) {
        return 0;
    }
    int a[100000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }
    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int key;
        if (scanf("%d", &key) != 1) {
            return 0;
        }
        printf("%d\n", first_index(a, n, key));
    }
    return 0;
}
```

### 找到的是最后一个而不是第一个 [WA]
把收缩方向写反（`a[mid] <= key` 时令 `lo = mid`），二分最后停在“最后一个等于 key 的位置”。示例里 3 出现了三次，会输出 3 而不是 1。想找第一次出现，必须在 `a[mid] >= key` 时把 `hi` 拉回来，而不是向右推 `lo`。

```c file=main.c
#include <stdio.h>

static int first_index(const int *a, int n, int key) {
    int lo = 0, hi = n - 1;
    while (lo < hi) {
        int mid = (lo + hi + 1) / 2;   /* 上取整，避免 lo 原地踏步 */
        if (a[mid] <= key) {
            lo = mid;                  /* 错：相等时还向右走，最后停在最后一个 */
        } else {
            hi = mid - 1;
        }
    }
    if (a[lo] == key) {
        return lo;
    }
    return -1;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100000) {
        return 0;
    }
    int a[100000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }
    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int key;
        if (scanf("%d", &key) != 1) {
            return 0;
        }
        printf("%d\n", first_index(a, n, key));
    }
    return 0;
}
```

### 输出时把下标加 1 [WA]
题目要求 0 开始的下标。写成 `printf("%d\n", pos + 1);` 会让所有存在的元素都大 1，而且"不存在"时 -1 会变成 0——恰好和合法的下标 0 撞在一起，看起来像是找到了。
```c file=main.c
#include <stdio.h>

static int first_index(const int *a, int n, int key) {
    int lo = 0, hi = n;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] < key) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    if (lo < n && a[lo] == key) {
        return lo;
    }
    return -1;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100000) {
        return 0;
    }
    int a[100000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }
    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int key;
        if (scanf("%d", &key) != 1) {
            return 0;
        }
        printf("%d\n", first_index(a, n, key) + 1);   /* 错：题目要 0 开始的下标 */
    }
    return 0;
}
```

### 找不到时返回 `n` 而不是 -1 [WA]
`lo` 在 key 比所有元素都大时等于 `n`。直接返回 `lo` 会输出一个等于数组长度的"下标"，而题目约定不存在时输出 -1。循环结束后必须先判断 `lo < n && a[lo] == key`。
```c file=main.c
#include <stdio.h>

static int first_index(const int *a, int n, int key) {
    int lo = 0, hi = n;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] < key) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return lo;                      /* 错：可能等于 n，且没检查 a[lo] 是否等于 key */
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100000) {
        return 0;
    }
    int a[100000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }
    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int key;
        if (scanf("%d", &key) != 1) {
            return 0;
        }
        printf("%d\n", first_index(a, n, key));
    }
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
7
1 3 3 3 7 9 9
4
3
8
1
9
```
```out
1
-1
0
5
```

### 02 sample 示例 2
```in
1
5
2
5
4
```
```out
0
-1
```

### 03 boundary 全部元素相同
```in
5
2 2 2 2 2
3
2
1
3
```
```out
0
-1
-1
```

### 04 degenerate 只有一个元素且取 int 下限
```in
1
-1000000000
2
-1000000000
1000000000
```
```out
0
-1
```

### 05 trap 查询值小于最小元素或大于最大元素
```in
4
-5 -3 0 8
4
-6
9
-5
8
```
```out
-1
-1
0
3
```

### 06 trap 负数与重复元素混在一起
```in
5
-9 -9 -4 -4 0
4
-9
-4
0
-5
```
```out
0
2
4
-1
```

### 07 normal 一般有序表
```in
8
-3 0 0 1 5 5 7 10
6
0
5
7
11
-3
10
```
```out
1
4
6
-1
0
7
```

### 08 boundary 首尾元素各查一次
```in
5
-5 0 3 8 8
4
-5
8
0
3
```
```out
0
3
1
2
```

### 生成 stress 最大规模：n=80000、1000 次查询
```js gen
const n = 80000;
const a = [];
for (let i = 0; i < n; i++) a.push(i * 2);   /* 0, 2, 4, ..., 159998 */

const keys = [0, 159998, 80000, 1, 159997, -1, 200000, 2, 79999];
while (keys.length < 1000) {
  /* 一半是存在的偶数（下标 = key / 2），一半是不存在的奇数 */
  const idx = rng.int(0, n - 1);
  keys.push(keys.length % 2 === 0 ? idx * 2 : idx * 2 + 1);
}

let input = `${n}\n${a.join(' ')}\n${keys.length}\n`;
for (const k of keys) input += `${k}\n`;

function lowerBound(arr, key) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (arr[mid] < key) lo = mid + 1;
    else hi = mid;
  }
  return lo < arr.length && arr[lo] === key ? lo : -1;
}

let output = '';
for (const k of keys) output += `${lowerBound(a, k)}\n`;
return [{ kind: 'stress', category: '最大规模：n=80000、q=1000', input, output }];
```
