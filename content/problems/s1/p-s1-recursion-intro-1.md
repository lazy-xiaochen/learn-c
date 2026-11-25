---json
{
  "id": "p-s1-recursion-intro-1",
  "title": "用递归输出无符号整数的二进制表示和其中 1 的个数",
  "difficulty": "L2",
  "knowledgePoints": ["s1-recursion-intro"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入一个无符号整数 n，输出两行：

1. n 的二进制表示（不含前导零；n 为 0 时输出 `0`）；
2. 二进制中 1 的个数。

请用**递归函数**完成这两件事。

## 输入格式
一行，一个整数 n。

## 输出格式
两行，见题目描述。

## 数据范围
0 ≤ n ≤ 4294967295

## 示例
### 示例 1
```in
10
```
```out
1010
2
```

### 示例 2（边界：0）
```in
0
```
```out
0
0
```

## 提示
### 第 1 层
n 的二进制表示 = （n / 2 的二进制表示）后面接上 n % 2。这就是一个"规模更小的同类问题"。

### 第 2 层
`print_binary(n)`：如果 n ≥ 2，先递归输出 n / 2 的二进制，**再**输出 n % 2。先输出再递归，顺序就反了。1 的个数：`ones(n) = n % 2 + ones(n / 2)`，n 为 0 时返回 0。

### 第 3 层
终止条件写成 `n < 2`（直接输出 n 这一位），而不是 `n == 0` 时返回——否则输入 0 时什么都不会输出。n 最大为 2³² − 1，要用 `unsigned int` 和 `%u`。

## 参考代码
```c file=main.c
#include <stdio.h>

void print_binary(unsigned int n) {
    if (n >= 2) {
        print_binary(n / 2);   /* 先输出高位（规模更小的问题） */
    }
    printf("%u", n % 2);       /* 再输出最低位：回归阶段输出，顺序正好是从高到低 */
}

int ones(unsigned int n) {
    if (n == 0) {
        return 0;              /* 终止条件 */
    }
    return (int)(n % 2) + ones(n / 2);
}

int main(void) {
    unsigned int n;
    if (scanf("%u", &n) != 1) {
        return 0;
    }
    print_binary(n);
    printf("\n%d\n", ones(n));
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

void print_binary(unsigned int n) {
    /* 递归输出 n 的二进制 */
}

int ones(unsigned int n) {
    /* 递归求二进制中 1 的个数 */
    return 0;
}

int main(void) {
    unsigned int n;
    if (scanf("%u", &n) != 1) {
        return 0;
    }
    print_binary(n);
    printf("\n%d\n", ones(n));
    return 0;
}
```

## 复杂度
递归深度和时间都是 O(位数) = O(log n)，最多 32 层。

## 常见错误
### 先输出再递归 [WA]
递推阶段就输出，得到的是从低位到高位的顺序：10 会输出 0101。
```c file=main.c expect=WA
#include <stdio.h>

void print_binary(unsigned int n) {
    printf("%u", n % 2);
    if (n >= 2) {
        print_binary(n / 2);
    }
}

int ones(unsigned int n) {
    if (n == 0) return 0;
    return (int)(n % 2) + ones(n / 2);
}

int main(void) {
    unsigned int n;
    if (scanf("%u", &n) != 1) {
        return 0;
    }
    print_binary(n);
    printf("\n%d\n", ones(n));
    return 0;
}
```

### 终止条件写成 n == 0 时直接返回 [WA]
对正数是对的，但输入 0 时第一层就返回了，第一行是空的。
```c file=main.c expect=WA
#include <stdio.h>

void print_binary(unsigned int n) {
    if (n == 0) {
        return;
    }
    print_binary(n / 2);
    printf("%u", n % 2);
}

int ones(unsigned int n) {
    if (n == 0) return 0;
    return (int)(n % 2) + ones(n / 2);
}

int main(void) {
    unsigned int n;
    if (scanf("%u", &n) != 1) {
        return 0;
    }
    print_binary(n);
    printf("\n%d\n", ones(n));
    return 0;
}
```

### 用 int 和 %d [WA|RE]
n 大于 2147483647 时读入出错；对负数做 `n / 2`、`n % 2` 得到的是负数和 -1，输出完全错误。

### 忘了终止条件 [RE]
`ones(n)` 不检查 n 是否为 0，会以 0 为参数无限地调用自己，最终栈溢出。
```c file=main.c expect=RE
#include <stdio.h>

void print_binary(unsigned int n) {
    if (n >= 2) {
        print_binary(n / 2);
    }
    printf("%u", n % 2);
}

int ones(unsigned int n) {
    return (int)(n % 2) + ones(n / 2);
}

int main(void) {
    unsigned int n;
    if (scanf("%u", &n) != 1) {
        return 0;
    }
    print_binary(n);
    printf("\n%d\n", ones(n));
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
10
```
```out
1010
2
```

### 02 sample 示例 2
```in
0
```
```out
0
0
```

### 03 boundary 最大值（32 个 1）
```in
4294967295
```
```out
11111111111111111111111111111111
32
```

### 04 trap 超过 INT_MAX（用 int 会出错）
```in
2147483648
```
```out
10000000000000000000000000000000
1
```

### 05 degenerate 1
```in
1
```
```out
1
1
```

### 06 boundary 2 的幂
```in
1024
```
```out
10000000000
1
```

### 07 normal 全是 1 的八位
```in
255
```
```out
11111111
8
```

### 08 trap 末位为 0（顺序错误会暴露）
```in
6
```
```out
110
2
```
