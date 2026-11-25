---json
{
  "id": "p-s1-scanf-2",
  "title": "解析两个 HH:MM:SS 格式的时间并求相差的秒数",
  "difficulty": "L2",
  "knowledgePoints": ["s1-scanf", "s1-arith-ops"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
输入一行，包含两个同一天内的时刻，格式都是 `时:分:秒`，中间用空白分隔。输出第二个时刻比第一个时刻晚多少秒（如果第二个更早，结果为负数）。

如果没能按格式读入全部 6 个整数，或者任何一个时刻不合法（时不在 0~23、分或秒不在 0~59），输出 `invalid`。

## 输入格式
一行：`h1:m1:s1 h2:m2:s2`。

## 输出格式
一行，相差的秒数或 `invalid`。

## 数据范围
输入长度不超过 100 个字符。

## 示例
### 示例 1
```in
08:30:00 09:15:30
```
```out
2730
```

### 示例 2（边界：第二个时刻更早）
```in
23:59:59 00:00:00
```
```out
-86399
```

## 提示
### 第 1 层
一个 scanf 就能读完 6 个整数。怎么判断格式是否正确？

### 第 2 层
`scanf("%d:%d:%d %d:%d:%d", ...)` 中的 `:` 必须在输入中原样出现，格式串里的空格匹配任意多个空白。只有返回值等于 6 才说明 6 个整数都读到了。

### 第 3 层
把两个时刻都换算成"从 0 点开始的秒数"：`h * 3600 + m * 60 + s`，再相减。先检查每一项的范围。

## 参考代码
```c file=main.c
#include <stdio.h>

static int valid(int h, int m, int s) {
    return h >= 0 && h <= 23 && m >= 0 && m <= 59 && s >= 0 && s <= 59;
}

int main(void) {
    int h1, m1, s1, h2, m2, s2;
    /* ':' 必须原样匹配；中间的空格匹配任意多个空白；返回值必须是 6 */
    if (scanf("%d:%d:%d %d:%d:%d", &h1, &m1, &s1, &h2, &m2, &s2) != 6
        || !valid(h1, m1, s1) || !valid(h2, m2, s2)) {
        printf("invalid\n");
        return 0;
    }
    int t1 = h1 * 3600 + m1 * 60 + s1;
    int t2 = h2 * 3600 + m2 * 60 + s2;
    printf("%d\n", t2 - t1);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int h1, m1, s1, h2, m2, s2;
    /* 读入两个时刻，检查格式和范围，输出秒数差 */

    return 0;
}
```

## 复杂度
O(1)。本题练习 scanf 的字面字符匹配、返回值检查，以及单位换算。

## 常见错误
### 只读入第一个时刻就开始计算 [WA]
`scanf` 返回值没有检查：第二个时刻格式错误时（比如写成 `9-15-30`），h2 之后的变量没有被赋值。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int h1 = 0, m1 = 0, s1 = 0, h2 = 0, m2 = 0, s2 = 0;
    scanf("%d:%d:%d %d:%d:%d", &h1, &m1, &s1, &h2, &m2, &s2);
    int t1 = h1 * 3600 + m1 * 60 + s1;
    int t2 = h2 * 3600 + m2 * 60 + s2;
    printf("%d\n", t2 - t1);
    return 0;
}
```

### 没有检查取值范围 [WA]
`25:00:00` 能被 scanf 正确读入，但它不是合法的时刻。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int h1, m1, s1, h2, m2, s2;
    if (scanf("%d:%d:%d %d:%d:%d", &h1, &m1, &s1, &h2, &m2, &s2) != 6) {
        printf("invalid\n");
        return 0;
    }
    int t1 = h1 * 3600 + m1 * 60 + s1;
    int t2 = h2 * 3600 + m2 * 60 + s2;
    printf("%d\n", t2 - t1);
    return 0;
}
```

### 格式串里漏了冒号 [WA]
`scanf("%d %d %d ...")` 遇到 `:` 时匹配失败，返回 1，所有合法输入都被判成 invalid。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int h1, m1, s1, h2, m2, s2;
    if (scanf("%d %d %d %d %d %d", &h1, &m1, &s1, &h2, &m2, &s2) != 6) {
        printf("invalid\n");
        return 0;
    }
    printf("%d\n", (h2 * 3600 + m2 * 60 + s2) - (h1 * 3600 + m1 * 60 + s1));
    return 0;
}
```

### 用"秒差的绝对值"输出 [WA]
题目要求第二个时刻减第一个时刻，可能是负数。

## 测试用例
### 01 sample 示例 1
```in
08:30:00 09:15:30
```
```out
2730
```

### 02 sample 示例 2
```in
23:59:59 00:00:00
```
```out
-86399
```

### 03 boundary 一天的两端
```in
00:00:00 23:59:59
```
```out
86399
```

### 04 degenerate 两个时刻相同
```in
12:00:00 12:00:00
```
```out
0
```

### 05 trap 第二个时刻格式错误（scanf 返回 3）
```in
08:30:00 9-15-30
```
```out
invalid
```

### 06 trap 小时超出范围
```in
25:00:00 01:00:00
```
```out
invalid
```

### 07 trap 秒为 60
```in
10:00:60 10:01:00
```
```out
invalid
```

### 08 degenerate 只有一个时刻
```in
10:00:00
```
```out
invalid
```

### 09 normal 两个时刻之间有多个空白和换行
```in
1:2:3
   4:5:6
```
```out
10983
```
