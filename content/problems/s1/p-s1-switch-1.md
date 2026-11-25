---json
{
  "id": "p-s1-switch-1",
  "title": "用 switch 求某年某月有多少天",
  "difficulty": "L1",
  "knowledgePoints": ["s1-switch", "s1-relational-logical"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入年份 y 和月份 m，输出这个月有多少天。闰年的二月有 29 天，平年的二月有 28 天（闰年规则：能被 4 整除但不能被 100 整除，或者能被 400 整除）。

如果没能读入两个整数，或者月份不在 1 ~ 12 之间，输出 `invalid`。

请用 `switch` 语句按月份分类。

## 输入格式
一行，两个整数 y 和 m。

## 输出格式
一行，天数或 `invalid`。

## 数据范围
1 ≤ y ≤ 9999；m 为 `int` 范围内的整数。

## 示例
### 示例 1
```in
2023 4
```
```out
30
```

### 示例 2（边界：闰年二月）
```in
2024 2
```
```out
29
```

## 提示
### 第 1 层
有 31 天的月份、有 30 天的月份各有好几个，它们怎样共用同一段代码？

### 第 2 层
把多个 `case` 叠在一起（中间不写代码），它们就会 fall through 到同一段代码。每一组的末尾都要写 `break`，非法月份交给 `default`。

### 第 3 层
`case 1: case 3: case 5: case 7: case 8: case 10: case 12: days = 31; break;`、`case 4: case 6: case 9: case 11: days = 30; break;`、`case 2:` 中用闰年条件选择 29 或 28，`default:` 输出 invalid。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int y, m;
    if (scanf("%d %d", &y, &m) != 2) {
        printf("invalid\n");
        return 0;
    }
    int days;
    switch (m) {
    case 1: case 3: case 5: case 7: case 8: case 10: case 12:
        days = 31;            /* 七个月份共用这段代码 */
        break;
    case 4: case 6: case 9: case 11:
        days = 30;
        break;
    case 2:
        days = ((y % 4 == 0 && y % 100 != 0) || y % 400 == 0) ? 29 : 28;
        break;
    default:
        printf("invalid\n");
        return 0;
    }
    printf("%d\n", days);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int y, m;
    if (scanf("%d %d", &y, &m) != 2) {
        printf("invalid\n");
        return 0;
    }
    /* 用 switch 根据月份求天数 */

    return 0;
}
```

## 复杂度
O(1)。本题考查 switch 中 case 的合并（有意的 fall-through）与 break。

## 常见错误
### 漏写 break [WA]
31 天那一组后面忘了 `break`，程序会继续执行 30 天那一组，把 days 改成 30。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int y, m;
    if (scanf("%d %d", &y, &m) != 2) {
        printf("invalid\n");
        return 0;
    }
    int days;
    switch (m) {
    case 1: case 3: case 5: case 7: case 8: case 10: case 12:
        days = 31;
    case 4: case 6: case 9: case 11:
        days = 30;
        break;
    case 2:
        days = ((y % 4 == 0 && y % 100 != 0) || y % 400 == 0) ? 29 : 28;
        break;
    default:
        printf("invalid\n");
        return 0;
    }
    printf("%d\n", days);
    return 0;
}
```

### 二月只按"能被 4 整除"判断 [WA]
1900 年不是闰年，二月只有 28 天。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int y, m;
    if (scanf("%d %d", &y, &m) != 2) {
        printf("invalid\n");
        return 0;
    }
    int days;
    switch (m) {
    case 1: case 3: case 5: case 7: case 8: case 10: case 12:
        days = 31;
        break;
    case 4: case 6: case 9: case 11:
        days = 30;
        break;
    case 2:
        days = y % 4 == 0 ? 29 : 28;
        break;
    default:
        printf("invalid\n");
        return 0;
    }
    printf("%d\n", days);
    return 0;
}
```

### 没有处理非法月份 [WA]
没有 `default` 时，月份为 13 不会进入任何 case，`days` 保持未初始化的值（读取它是未定义行为）。下面的代码把 days 初始化成了 0，于是输出了 0。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int y, m;
    if (scanf("%d %d", &y, &m) != 2) {
        printf("invalid\n");
        return 0;
    }
    int days = 0;
    switch (m) {
    case 1: case 3: case 5: case 7: case 8: case 10: case 12:
        days = 31;
        break;
    case 4: case 6: case 9: case 11:
        days = 30;
        break;
    case 2:
        days = ((y % 4 == 0 && y % 100 != 0) || y % 400 == 0) ? 29 : 28;
        break;
    }
    printf("%d\n", days);
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
2023 4
```
```out
30
```

### 02 sample 示例 2
```in
2024 2
```
```out
29
```

### 03 boundary 第一个月
```in
1 1
```
```out
31
```

### 04 boundary 最后一个月
```in
9999 12
```
```out
31
```

### 05 trap 整百年的二月（不是闰年）
```in
1900 2
```
```out
28
```

### 06 trap 31 天的月份（漏写 break 会变成 30）
```in
2023 7
```
```out
31
```

### 07 degenerate 月份为 0
```in
2023 0
```
```out
invalid
```

### 08 degenerate 月份为 13
```in
2023 13
```
```out
invalid
```

### 09 trap 输入不完整
```in
2023
```
```out
invalid
```

### 10 normal 能被 400 整除的二月
```in
2000 2
```
```out
29
```
