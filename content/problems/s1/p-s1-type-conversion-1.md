---json
{
  "id": "p-s1-type-conversion-1",
  "title": "把一个实数四舍五入为整数（.5 远离 0）",
  "difficulty": "L2",
  "knowledgePoints": ["s1-type-conversion"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入一个实数 x，把它四舍五入为最接近的整数后输出。恰好在两个整数正中间（小数部分为 .5）时，取**绝对值较大**的那个，例如 2.5 → 3，-2.5 → -3。

## 输入格式
一行，一个实数 x（最多 3 位小数）。

## 输出格式
一行，四舍五入后的整数。结果为 0 时输出 `0`（不要输出 `-0`）。

## 数据范围
-1000000000000 ≤ x ≤ 1000000000000（|x| ≤ 10¹²）

## 示例
### 示例 1
```in
2.5
```
```out
3
```

### 示例 2（边界：负数的 .5）
```in
-2.5
```
```out
-3
```

## 提示
### 第 1 层
浮点数转换成整数时，小数部分是怎么处理的？对正数和负数分别试一试。

### 第 2 层
`(long long)x` 会**向 0 截断**：`(long long)2.7` 是 2，`(long long)-2.7` 是 -2。所以正数加 0.5 再截断就是四舍五入，负数应当**减** 0.5 再截断。结果最大约 10¹²，超出 `int`，要转换成 `long long`。

### 第 3 层
`long long r = (long long)(x < 0 ? x - 0.5 : x + 0.5);`，用 `%lld` 输出。读入 `double` 用 `%lf`。（也可以直接使用 `<math.h>` 中的 `llround`，它的规则正好是本题要求的。）

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    double x;
    if (scanf("%lf", &x) != 1) {
        return 0;
    }
    /* 浮点转整数会向 0 截断，所以正数 +0.5、负数 -0.5 后再截断，就得到"远离 0"的四舍五入 */
    long long r = (long long)(x < 0 ? x - 0.5 : x + 0.5);
    printf("%lld\n", r);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    double x;
    if (scanf("%lf", &x) != 1) {
        return 0;
    }
    /* 输出四舍五入后的整数 */

    return 0;
}
```

## 复杂度
O(1)。本题考查浮点数转整数"向 0 截断"的规则，以及转换结果超出目标类型范围时的未定义行为。

## 常见错误
### 不区分正负，一律 (int)(x + 0.5) [WA]
对 -2.5，`x + 0.5` 等于 -2.0，截断得到 -2；对 -0.7，`x + 0.5` 是 -0.2，截断得到 0，都不对。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    double x;
    if (scanf("%lf", &x) != 1) {
        return 0;
    }
    printf("%lld\n", (long long)(x + 0.5));
    return 0;
}
```

### 转换成 int [UB]
正负处理都对了，但结果可能达到 10¹²，超出 `int` 的范围。浮点数转换为整数时超出范围是**未定义行为**（本平台的检测工具会报告 `is outside the range of representable values`）。
```c file=main.c expect=UB
#include <stdio.h>

int main(void) {
    double x;
    if (scanf("%lf", &x) != 1) {
        return 0;
    }
    int r = (int)(x < 0 ? x - 0.5 : x + 0.5);
    printf("%d\n", r);
    return 0;
}
```

### 用 %.0f 输出 [WA]
`printf("%.0f", x)` 采用"四舍六入五成双"（银行家舍入）：2.5 输出 2，3.5 输出 4，不符合本题"远离 0"的要求；而且 -0.4 会输出 `-0`。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    double x;
    if (scanf("%lf", &x) != 1) {
        return 0;
    }
    printf("%.0f\n", x);
    return 0;
}
```

### 用 %d 读入实数 [WA]
`scanf("%d", ...)` 遇到小数点就停止，`2.5` 只读到 2。读 `double` 要用 `%lf`。

## 测试用例
### 01 sample 示例 1
```in
2.5
```
```out
3
```

### 02 sample 示例 2
```in
-2.5
```
```out
-3
```

### 03 boundary 最大值
```in
1000000000000
```
```out
1000000000000
```

### 04 boundary 接近最小值的 .5
```in
-999999999999.5
```
```out
-1000000000000
```

### 05 trap 结果超出 int 范围
```in
3000000000.7
```
```out
3000000001
```

### 06 degenerate 小的负数舍入为 0（不能输出 -0）
```in
-0.4
```
```out
0
```

### 07 degenerate 零
```in
0
```
```out
0
```

### 08 trap 负数小数部分大于 .5
```in
-0.7
```
```out
-1
```

### 09 normal 整数输入
```in
7
```
```out
7
```

### 10 normal 一般情况
```in
123.456
```
```out
123
```
