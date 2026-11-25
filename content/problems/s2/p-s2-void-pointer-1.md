---json
{
  "id": "p-s2-void-pointer-1",
  "title": "void * 通用反转：一份代码处理 int 和 long long 数组",
  "difficulty": "L3",
  "knowledgePoints": ["s2-void-pointer", "s2-pointer-arith"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
仓库里有两个缓冲区：一个存 `int`，一个存 `long long`。现在要把它们各自**原地反转**（第一个和最后一个交换，第二个和倒数第二个交换……）。

如果写两份代码（一份 `int` 版、一份 `long long` 版），以后再加 `double`、`short` 还得再写。正确做法是写**一个**通用函数：

```c
void reverse(void *base, size_t n, size_t size);
```

`base` 是首元素地址，`n` 是元素个数，`size` 是每个元素占多少字节。函数内部只知道"字节"，不知道元素类型。

请你实现这个函数，并用它完成反转、按输入的类型输出结果。要求**只能有一份反转逻辑**，不能写 `int` 和 `long long` 两个分支各反转一次（读入可以分支，反转必须调用同一个函数）。

## 输入格式
第一行两个值：一个字符 `type` 和一个整数 `n`，用空格分隔。`type` 为 `i` 表示接下来是 `int` 数组，为 `l` 表示是 `long long` 数组。
第二行 `n` 个整数，用空格分隔。

## 输出格式
一行，反转后的 `n` 个整数，相邻两个用一个空格分隔（行末不要多余空格）。

## 数据范围
1 ≤ n ≤ 1000
`type` 只会是 `i` 或 `l`
`type = i` 时：-2147483648 ≤ 每个元素 ≤ 2147483647
`type = l` 时：-9223372036854775808 ≤ 每个元素 ≤ 9223372036854775807

注意 `long long` 的元素可能有 8 字节，而且可能超出 `int` 的范围——这正是通用函数必须用 `size` 而不是"猜 4 字节"的原因。

## 示例
### 示例 1
```in
i 4
10 20 30 40
```
```out
40 30 20 10
```
> 最普通的 `int` 数组反转：4 个元素变成 40 30 20 10。

### 示例 2（边界：只有一个元素）
```in
l 1
-9223372036854775808
```
```out
-9223372036854775808
```
> 只有一个元素时 `n / 2 = 0`，循环一次都不执行，原样输出。注意这个值是最小的 `long long`，用 `int` 读会溢出。

## 提示
### 第 1 层
通用函数拿不到元素类型，只能拿到"首地址 + 元素个数 + 每个元素几字节"。所以"第 i 个元素在哪里"必须用字节算，交换也必须按字节来。

### 第 2 层
第 i 个元素的地址是 `(unsigned char *)base + i * size`，第 j 个是 `(unsigned char *)base + j * size`。交换两个元素就是把这两块各 `size` 字节的内容逐字节对调；一共交换 `n / 2` 对。

### 第 3 层
用一个循环：`for (size_t i = 0; i < n / 2; i++)`，把 `left = p + i * size` 和 `right = p + (n - 1 - i) * size` 指向的两块内存按字节交换（内层 `for (size_t k = 0; k < size; k++)`）。`main` 里判断 `type` 后分别读进 `int` 数组或 `long long` 数组，但都调用同一个 `reverse(a, (size_t)n, sizeof a[0])`。

## 参考代码
```c file=main.c
#include <stdio.h>

/* 通用反转：只认“首地址 + 元素个数 + 元素大小”，不认识具体类型 */
static void reverse(void *base, size_t n, size_t size) {
    unsigned char *p = base;
    for (size_t i = 0; i < n / 2; i++) {
        unsigned char *left = p + i * size;
        unsigned char *right = p + (n - 1 - i) * size;
        for (size_t k = 0; k < size; k++) {
            unsigned char t = left[k];
            left[k] = right[k];
            right[k] = t;
        }
    }
}

int main(void) {
    char type;
    int n;
    if (scanf(" %c %d", &type, &n) != 2 || n < 1 || n > 1000) {
        return 0;
    }

    if (type == 'i') {
        int a[1000];
        for (int i = 0; i < n; i++) {
            if (scanf("%d", &a[i]) != 1) {
                return 0;
            }
        }
        reverse(a, (size_t)n, sizeof a[0]);
        for (int i = 0; i < n; i++) {
            printf("%d%c", a[i], i + 1 == n ? '\n' : ' ');
        }
    } else {
        long long a[1000];
        for (int i = 0; i < n; i++) {
            if (scanf("%lld", &a[i]) != 1) {
                return 0;
            }
        }
        reverse(a, (size_t)n, sizeof a[0]);
        for (int i = 0; i < n; i++) {
            printf("%lld%c", a[i], i + 1 == n ? '\n' : ' ');
        }
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

/* TODO: 实现通用反转。提示：base 是首地址，n 是元素个数，size 是每个元素的字节数。 */
static void reverse(void *base, size_t n, size_t size) {
    (void)base;
    (void)n;
    (void)size;
}

int main(void) {
    char type;
    int n;
    if (scanf(" %c %d", &type, &n) != 2 || n < 1 || n > 1000) {
        return 0;
    }

    if (type == 'i') {
        int a[1000];
        for (int i = 0; i < n; i++) {
            if (scanf("%d", &a[i]) != 1) {
                return 0;
            }
        }
        reverse(a, (size_t)n, sizeof a[0]);
        for (int i = 0; i < n; i++) {
            printf("%d%c", a[i], i + 1 == n ? '\n' : ' ');
        }
    } else {
        long long a[1000];
        for (int i = 0; i < n; i++) {
            if (scanf("%lld", &a[i]) != 1) {
                return 0;
            }
        }
        reverse(a, (size_t)n, sizeof a[0]);
        for (int i = 0; i < n; i++) {
            printf("%lld%c", a[i], i + 1 == n ? '\n' : ' ');
        }
    }
    return 0;
}
```

## 复杂度
时间 O(n)：每个字节只被读写常数次。
空间 O(1)：原地交换，只用了一个 `unsigned char` 临时变量。

`reverse` 的时间复杂度是 O(n × size)，对 `int` 和 `long long` 都是"每个元素被读写一次"。

## 常见错误
### 把元素当成 int 来交换 [WA]
函数里声明 `int *p = base;` 然后 `p[i]` 交换，只在 `int` 数组上碰巧正确。`long long` 元素有 8 字节，`p[i]` 只会动到它的前 4 个字节，高低两半被拆开重排，数值完全错乱。
```c file=main.c expect=WA
#include <stdio.h>

static void reverse(void *base, size_t n, size_t size) {
    int *p = base;
    (void)size;
    for (size_t i = 0; i < n / 2; i++) {
        int t = p[i];
        p[i] = p[n - 1 - i];
        p[n - 1 - i] = t;
    }
}

int main(void) {
    char type;
    int n;
    if (scanf(" %c %d", &type, &n) != 2 || n < 1 || n > 1000) {
        return 0;
    }

    if (type == 'i') {
        int a[1000];
        for (int i = 0; i < n; i++) {
            if (scanf("%d", &a[i]) != 1) {
                return 0;
            }
        }
        reverse(a, (size_t)n, sizeof a[0]);
        for (int i = 0; i < n; i++) {
            printf("%d%c", a[i], i + 1 == n ? '\n' : ' ');
        }
    } else {
        long long a[1000];
        for (int i = 0; i < n; i++) {
            if (scanf("%lld", &a[i]) != 1) {
                return 0;
            }
        }
        reverse(a, (size_t)n, sizeof a[0]);
        for (int i = 0; i < n; i++) {
            printf("%lld%c", a[i], i + 1 == n ? '\n' : ' ');
        }
    }
    return 0;
}
```

### 每个元素只交换第一个字节 [WA]
定位元素是对的，但交换时忘了内层的字节循环，只换了每个元素的 `left[0]` 和 `right[0]`。对 4 字节的 `int` 来说，这是把两个数的最高字节对调，低位原封不动，结果是一堆"看似有意义、其实全错"的数。
```c file=main.c expect=WA
#include <stdio.h>

static void reverse(void *base, size_t n, size_t size) {
    unsigned char *p = base;
    for (size_t i = 0; i < n / 2; i++) {
        unsigned char t = p[i * size];                    /* 只换第 0 个字节 */
        p[i * size] = p[(n - 1 - i) * size];
        p[(n - 1 - i) * size] = t;
    }
}

int main(void) {
    char type;
    int n;
    if (scanf(" %c %d", &type, &n) != 2 || n < 1 || n > 1000) {
        return 0;
    }

    if (type == 'i') {
        int a[1000];
        for (int i = 0; i < n; i++) {
            if (scanf("%d", &a[i]) != 1) {
                return 0;
            }
        }
        reverse(a, (size_t)n, sizeof a[0]);
        for (int i = 0; i < n; i++) {
            printf("%d%c", a[i], i + 1 == n ? '\n' : ' ');
        }
    } else {
        long long a[1000];
        for (int i = 0; i < n; i++) {
            if (scanf("%lld", &a[i]) != 1) {
                return 0;
            }
        }
        reverse(a, (size_t)n, sizeof a[0]);
        for (int i = 0; i < n; i++) {
            printf("%lld%c", a[i], i + 1 == n ? '\n' : ' ');
        }
    }
    return 0;
}
```

### 元素大小写成 sizeof(void *) [WA]
`sizeof(void *)` 恒为 8，对 `long long` 数组恰好蒙对，对 `int` 数组就错了：它会把相邻两个 `int` 当成一个 8 字节元素来交换，反转的是"元素对"而不是元素。通用函数必须由调用者用 `sizeof a[0]` 告诉它真实大小。

### 对 void * 直接做 p + 1 [WA]
`void *` 的算术不是标准 C。GCC/Clang 会把它当 `char *`（`-Wpedantic` 下报警告），于是 `p + 1` 只走 1 字节，`p + i` 完全不是"第 i 个元素"。必须先把 `base` 转成 `unsigned char *` 拿到"按字节走"的能力，再自己乘 `size`。

## 测试用例
### 01 sample 示例 1
```in
i 4
10 20 30 40
```
```out
40 30 20 10
```

### 02 sample 示例 2
```in
l 1
-9223372036854775808
```
```out
-9223372036854775808
```

### 03 boundary int 的两个端点
```in
i 2
-2147483648 2147483647
```
```out
2147483647 -2147483648
```

### 04 degenerate 所有元素相同
```in
i 5
7 7 7 7 7
```
```out
7 7 7 7 7
```

### 05 trap long long 元素超出 int 范围
```in
l 4
4294967296 -4294967297 1 -1
```
```out
-1 1 -4294967297 4294967296
```

### 06 trap long long 的极值
```in
l 3
9223372036854775807 -9223372036854775808 0
```
```out
0 -9223372036854775808 9223372036854775807
```

### 07 normal 奇数个元素、含负数
```in
i 5
-1 -2 3 4 -5
```
```out
-5 4 3 -2 -1
```

### 08 normal 两个大 long long
```in
l 2
1000000000000 2000000000000
```
```out
2000000000000 1000000000000
```
