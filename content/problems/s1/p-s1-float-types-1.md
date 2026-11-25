---json
{
  "id": "p-s1-float-types-1",
  "title": "摄氏度转华氏度，保留一位小数",
  "difficulty": "L1",
  "knowledgePoints": ["s1-float-types"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入一个整数摄氏温度 C，按公式

F = C × 9 / 5 + 32

计算华氏温度 F，并保留一位小数输出。

## 输入格式
一行，一个整数 C。

## 输出格式
一行，F 的值，保留一位小数（四舍五入）。

## 数据范围
-100000000 ≤ C ≤ 100000000

## 示例
### 示例 1
```in
100
```
```out
212.0
```

### 示例 2（边界：-40 度时两种温标相等）
```in
-40
```
```out
-40.0
```

## 提示
### 第 1 层
C 是整数，但结果可能带小数。`9 / 5` 在 C 语言里等于多少？

### 第 2 层
两个整数相除做的是**整数除法**，`9 / 5` 等于 1。只要有一个操作数是浮点数（如 `9.0`），就会按浮点数计算。另外 C 的绝对值最大到 10⁸，结果约 1.8 × 10⁸，`float` 只有约 7 位有效数字，精度不够。

### 第 3 层
用 `double` 计算：`double f = c * 9.0 / 5.0 + 32.0;`，再用 `printf("%.1f\n", f)` 输出。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int c;
    if (scanf("%d", &c) != 1) {
        return 0;
    }
    /* 9.0 是 double，c 会先转换成 double，整个表达式按浮点数计算 */
    double f = c * 9.0 / 5.0 + 32.0;
    printf("%.1f\n", f);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int c;
    if (scanf("%d", &c) != 1) {
        return 0;
    }
    /* 计算并输出华氏温度 */

    return 0;
}
```

## 复杂度
O(1)。本题考查整数除法与浮点除法的区别，以及 `float` 与 `double` 的精度差异。

## 常见错误
### 用整数计算后再存进 double [WA]
`c * 9 / 5 + 32` 全部是整数运算，小数部分在除法时就被丢掉了，存进 `double` 也找不回来。C 为 100 或 -40 时碰巧正确，C 为 1 时就错了（33.0 而不是 33.8）。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int c;
    if (scanf("%d", &c) != 1) {
        return 0;
    }
    double f = c * 9 / 5 + 32;
    printf("%.1f\n", f);
    return 0;
}
```

### 先算 9 / 5 [WA]
`(9 / 5) * c` 中 `9 / 5` 是整数除法，等于 1，公式变成了 C + 32。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int c;
    if (scanf("%d", &c) != 1) {
        return 0;
    }
    double f = (9 / 5) * c + 32.0;
    printf("%.1f\n", f);
    return 0;
}
```

### 用 float 计算 [WA]
`float` 只有约 7 位有效数字，99999999 这样的数在 `float` 里会被舍入成 100000000，结果的个位和小数都不对了。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int c;
    if (scanf("%d", &c) != 1) {
        return 0;
    }
    float f = c * 9.0f / 5.0f + 32.0f;
    printf("%.1f\n", f);
    return 0;
}
```

### 用 %d 输出 double [WA]
`printf("%d", f)` 中格式说明符与参数类型不匹配，是未定义行为，输出的是一个毫无意义的整数。

## 测试用例
### 01 sample 示例 1
```in
100
```
```out
212.0
```

### 02 sample 示例 2
```in
-40
```
```out
-40.0
```

### 03 boundary 绝对零度附近
```in
-273
```
```out
-459.4
```

### 04 boundary 最大值
```in
100000000
```
```out
180000032.0
```

### 05 trap 超出 float 精度
```in
99999999
```
```out
180000030.2
```

### 06 trap 整数除法会丢掉小数
```in
1
```
```out
33.8
```

### 07 degenerate 零度
```in
0
```
```out
32.0
```

### 08 trap 结果很小的正数
```in
-17
```
```out
1.4
```

### 09 normal 体温
```in
37
```
```out
98.6
```
