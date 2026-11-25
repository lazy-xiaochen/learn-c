---json
{
  "id": "p-s2-wild-dangling-1",
  "title": "用指针返回查找结果：找到返回地址，找不到返回 NULL",
  "difficulty": "L2",
  "knowledgePoints": ["s2-wild-dangling", "s2-pointer-param"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
写一个查找函数：

```c
int *find_first(int *a, int n, int key);
```

在 `a` 的前 `n` 个元素里找 `key`：**找到就返回指向第一个匹配元素的指针，找不到返回 `NULL`**。

然后在 `main` 里读入数组和若干次查询，对每次查询调用 `find_first`：

- 返回非空指针：用指针相减算出下标，输出这个下标；
- 返回 `NULL`：输出 `NOT_FOUND`。

**必须真的通过返回值判断成功与否**，不能靠"下标是不是 -1"之类的约定，更不能在没判空的情况下解引用返回值。

## 输入格式
第一行一个整数 `n`。
第二行 `n` 个整数，用空格分隔。
第三行一个整数 `q`。
第四行 `q` 个整数，用空格分隔，每个是一次查询的 `key`。

## 输出格式
`q` 行，每行对应一次查询：
- 找到了：输出该元素**第一次出现**的下标（从 0 开始）；
- 没找到：输出 `NOT_FOUND`（全大写，下划线分隔）。

## 数据范围
1 ≤ n ≤ 1000
1 ≤ q ≤ 1000
-2147483648 ≤ 每个元素、每个查询值 ≤ 2147483647

数组里可能有重复元素，题目要求返回**第一次**出现的位置。

## 示例
### 示例 1
```in
5
3 1 4 1 5
3
4 1 9
```
```out
2
1
NOT_FOUND
```
> `4` 在下标 2；`1` 第一次出现在下标 1（下标 3 也有一个 1，但不算）；`9` 不存在，函数返回 `NULL`。

### 示例 2（边界：最小数组，且有查询落空）
```in
1
42
2
42 0
```
```out
0
NOT_FOUND
```
> 数组只有一个元素。`42` 在下标 0；`0` 不存在，必须输出 `NOT_FOUND` 而不是崩溃或输出别的数字。

## 提示
### 第 1 层
"没找到"必须有明确的表示。C 的通用做法是让函数返回指针，失败时返回 `NULL`——调用者拿到返回值后**先判空**，再决定能不能解引用。

### 第 2 层
找到元素 `a[i]` 时返回 `&a[i]`（也可以写 `a + i`）。调用者拿到非空指针 `p` 后，下标就是 `p - a`：指针相减的单位是元素，不是字节。返回值类型是 `int *`，不是 `int`。

### 第 3 层
`find_first` 里循环 `for (int i = 0; i < n; i++)`，一发现 `a[i] == key` 就立刻 `return &a[i];`（提前返回才能保证是第一次出现），循环结束仍没找到就 `return NULL;`。`main` 里写成 `int *p = find_first(a, n, key); if (p != NULL) printf("%ld\n", (long)(p - a)); else printf("NOT_FOUND\n");`。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <stddef.h>

/* 找到返回指向第一个匹配元素的指针；找不到返回 NULL */
static int *find_first(int *a, int n, int key) {
    for (int i = 0; i < n; i++) {
        if (a[i] == key) {
            return &a[i];
        }
    }
    return NULL;
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

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }

    for (int i = 0; i < q; i++) {
        int key;
        if (scanf("%d", &key) != 1) {
            return 0;
        }
        int *p = find_first(a, n, key);
        if (p != NULL) {
            printf("%ld\n", (long)(p - a));   /* 指针相减：单位是元素 */
        } else {
            printf("NOT_FOUND\n");
        }
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <stddef.h>

/* TODO: 实现 find_first：找到返回地址，找不到返回 NULL */
static int *find_first(int *a, int n, int key) {
    (void)a;
    (void)n;
    (void)key;
    return NULL;
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

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }

    for (int i = 0; i < q; i++) {
        int key;
        if (scanf("%d", &key) != 1) {
            return 0;
        }
        int *p = find_first(a, n, key);
        if (p != NULL) {
            printf("%ld\n", (long)(p - a));
        } else {
            printf("NOT_FOUND\n");
        }
    }
    return 0;
}
```

## 复杂度
时间：每次查询 O(n)，`q` 次查询共 O(nq)，最坏 10^6 次比较，完全在 1 秒内。
空间 O(1)（不计输入数组）。

如果想更快，可以在读入后先排序再二分查找（O(n log n + q log n)），但那超出了本题重点——本题要练的是"用指针返回结果 / 用 NULL 表示失败 / 调用者判空"。

## 常见错误
### 不判空就直接解引用 [UB]
`find_first` 返回 `NULL` 时解引用它就是空指针解引用——未定义行为。开启 UBSan 时程序会当场报错终止，普通编译下通常直接崩溃。查询值不存在是**正常情况**，不是异常，必须处理。
```c file=main.c expect=UB
#include <stdio.h>
#include <stddef.h>

static int *find_first(int *a, int n, int key) {
    for (int i = 0; i < n; i++) {
        if (a[i] == key) {
            return &a[i];
        }
    }
    return NULL;
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

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }

    for (int i = 0; i < q; i++) {
        int key;
        if (scanf("%d", &key) != 1) {
            return 0;
        }
        int *p = find_first(a, n, key);
        printf("%d\n", *p);   /* 错：p 可能是 NULL */
    }
    return 0;
}
```

### 找到后不停下，返回最后一次出现的位置 [WA]
如果循环里每次都更新 `p = &a[i]`，最后拿到的是**最后一次**出现的地址。题目要求第一次，所以必须在第一次命中时立刻 `return`。
```c file=main.c expect=WA
#include <stdio.h>
#include <stddef.h>

static int *find_first(int *a, int n, int key) {
    int *p = NULL;
    for (int i = 0; i < n; i++) {
        if (a[i] == key) {
            p = &a[i];        /* 错：继续往后找，最后留下的是最后一次 */
        }
    }
    return p;
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

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }

    for (int i = 0; i < q; i++) {
        int key;
        if (scanf("%d", &key) != 1) {
            return 0;
        }
        int *p = find_first(a, n, key);
        if (p != NULL) {
            printf("%ld\n", (long)(p - a));
        } else {
            printf("NOT_FOUND\n");
        }
    }
    return 0;
}
```

### 用 -1 当"没找到"，然后拿它去访问数组 [RE|UB]
`int idx = -1;` 之后如果忘了判断就写 `a[idx]`，是负下标越界访问。`-1` 也是合法的 `int` 数据，函数返回 `int` 时无法区分"没找到"和"下标 -1"，所以这道题的函数签名才设计成返回指针。

### 返回局部变量的地址 [RE]
如果 `find_first` 里写 `int pos = i; return &pos;`，返回的是函数局部变量的地址，函数一结束就悬垂了。返回的地址必须指向**调用者提供的数组**（它的生命周期在 `main` 里）——这也是"返回指针"和"返回值"的关键区别。

### `NOT_FOUND` 拼错 [WA]
`NOT FOUND`、`Not_Found`、`not_found` 都算答案错误。输出格式是判题的一部分，建议直接复制题面里的字符串。

## 测试用例
### 01 sample 示例 1
```in
5
3 1 4 1 5
3
4 1 9
```
```out
2
1
NOT_FOUND
```

### 02 sample 示例 2
```in
1
42
2
42 0
```
```out
0
NOT_FOUND
```

### 03 boundary int 的两个端点
```in
3
-2147483648 2147483647 0
3
-2147483648 2147483647 0
```
```out
0
1
2
```

### 04 degenerate 所有元素相同、含落空查询
```in
5
8 8 8 8 8
4
8 9 0 8
```
```out
0
NOT_FOUND
NOT_FOUND
0
```

### 05 trap 目标恰好在末尾
```in
6
1 2 3 4 5 6
3
6 1 3
```
```out
5
0
2
```

### 06 trap 重复元素必须返回第一次
```in
5
2 9 2 9 2
3
2 9 5
```
```out
0
1
NOT_FOUND
```

### 07 normal 含负数
```in
4
-5 -1 -5 3
3
-5 3 -1
```
```out
0
3
1
```

### 08 boundary 只有一次查询
```in
2
1 2
1
2
```
```out
1
```
