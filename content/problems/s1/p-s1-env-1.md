---json
{
  "id": "p-s1-env-1",
  "title": "读入两个整数并输出它们的和，输入不合法时输出 error",
  "difficulty": "L1",
  "knowledgePoints": ["s1-env"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
从标准输入读入两个整数 a 和 b，输出 a + b 的值。

真实的输入并不总是规规矩矩的。如果没能成功读到两个整数（例如输入为空、只有一个数、或者出现了不是数字的内容），程序应当输出 `error`，而不是输出一个莫名其妙的数字。

## 输入格式
输入中应当包含两个整数 a 和 b，它们之间用空白字符（空格、制表符或换行）分隔，个数不限。

## 输出格式
如果成功读到两个整数，输出一行，为 a + b 的值；否则输出一行 `error`。

除此之外不要输出任何内容（包括"请输入"之类的提示）。

## 数据范围
- -100000000 ≤ a, b ≤ 100000000（结果一定在 int 能表示的范围内）
- 输入总长度不超过 100 个字符

## 示例
### 示例 1
```in
3 5
```
```out
8
```

### 示例 2（边界：负数与只有一个数）
```in
-7
```
```out
error
```
> 只读到了一个整数，所以输出 `error`。

## 提示
### 第 1 层
先想清楚：怎样才能知道"有没有成功读到两个整数"？

### 第 2 层
`scanf` 有返回值：它返回**成功读入并赋值的项数**。`scanf("%d %d", &a, &b)` 成功时返回 2；读到不是数字的内容时返回的数会小于 2；输入一开始就结束了则返回 `EOF`（一个负数）。

### 第 3 层
把 `scanf` 的返回值和 2 比较：等于 2 就输出 `a + b`，否则输出 `error`。注意 `%d` 会自动跳过数字前面的空格和换行，所以不需要为"数字分在两行"做特殊处理。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int a, b;
    /* scanf 返回成功读入的项数：只有等于 2 时 a、b 才都被赋了值 */
    if (scanf("%d %d", &a, &b) != 2) {
        printf("error\n");
        return 0;
    }
    printf("%d\n", a + b);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int a, b;
    /* 在这里读入 a 和 b，并处理输入不合法的情况 */

    return 0;
}
```

## 复杂度
时间复杂度 O(1)，空间复杂度 O(1)。这道题的重点不是算法，而是**检查输入函数的返回值**——这是写出可靠 C 程序的第一个好习惯。

## 常见错误
### 没有检查 scanf 的返回值 [WA]
读取失败时 `scanf` 不会修改 `a`、`b`，它们仍然是**未初始化**的随机值（读取未初始化的变量本身就是未定义行为），程序会输出一个无意义的数字。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d\n", a + b);
    return 0;
}
```

### 输出了提示文字 [WA]
判题时程序的全部输出都会和标准答案比较，"请输入两个整数："也会被当作输出的一部分。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int a, b;
    printf("请输入两个整数：");
    if (scanf("%d %d", &a, &b) != 2) {
        printf("error\n");
        return 0;
    }
    printf("%d\n", a + b);
    return 0;
}
```

### 格式字符串里写了逗号 [WA]
`scanf("%d,%d", ...)` 要求输入中两个数之间**必须**有一个逗号。输入是 `3 5` 时，读完 3 之后遇到空格而不是逗号，匹配失败，返回 1。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int a, b;
    if (scanf("%d,%d", &a, &b) != 2) {
        printf("error\n");
        return 0;
    }
    printf("%d\n", a + b);
    return 0;
}
```

### 只判断了返回值不是 EOF [WA]
`scanf(...) != EOF` 只能排除"输入一开始就结束"的情况。输入 `abc` 时 `scanf` 返回 0，不等于 EOF，程序会继续使用未赋值的变量。

## 测试用例
### 01 sample 示例 1
```in
3 5
```
```out
8
```

### 02 sample 示例 2
```in
-7
```
```out
error
```

### 03 boundary 最大值与最小值
```in
100000000 -100000000
```
```out
0
```

### 04 boundary 两个最大值
```in
100000000 100000000
```
```out
200000000
```

### 05 degenerate 空输入
```in
```
```out
error
```

### 06 degenerate 两个 0
```in
0 0
```
```out
0
```

### 07 trap 非数字输入（scanf 返回 0，变量未被赋值）
```in
abc 5
```
```out
error
```

### 08 trap 第二个数不是数字
```in
12 x
```
```out
error
```

### 09 trap 数字分在两行且有多余空白
```in
   -15

	 20
```
```out
5
```
