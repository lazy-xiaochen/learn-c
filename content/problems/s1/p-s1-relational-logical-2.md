---json
{
  "id": "p-s1-relational-logical-2",
  "title": "用一个逻辑表达式判断闰年，并处理非法输入",
  "difficulty": "L1",
  "knowledgePoints": ["s1-relational-logical"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
公历闰年的规则是：能被 4 整除但不能被 100 整除的年份是闰年；能被 400 整除的年份也是闰年。其余年份都不是闰年。

读入一个年份 y，是闰年输出 `yes`，不是输出 `no`。如果输入的不是一个整数（没能成功读入），输出 `error`。

## 输入格式
一行，一个年份。

## 输出格式
一行，`yes`、`no` 或 `error`。

## 数据范围
如果输入是整数，则 1 ≤ y ≤ 2147483647

## 示例
### 示例 1
```in
2024
```
```out
yes
```

### 示例 2（边界：整百年）
```in
1900
```
```out
no
```

## 提示
### 第 1 层
把规则拆成几个条件，想清楚它们之间是"并且"还是"或者"的关系。

### 第 2 层
"能被 4 整除"写成 `y % 4 == 0`。规则可以写成：(能被 4 整除 **并且** 不能被 100 整除) **或者** 能被 400 整除。`&&` 的优先级比 `||` 高，但加上括号更清楚。

### 第 3 层
先检查 `scanf("%d", &y) != 1` 时输出 `error`；然后 `if ((y % 4 == 0 && y % 100 != 0) || y % 400 == 0)`。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int y;
    if (scanf("%d", &y) != 1) {
        printf("error\n");
        return 0;
    }
    /* && 的优先级高于 ||，括号只是为了让意图更清楚 */
    if ((y % 4 == 0 && y % 100 != 0) || y % 400 == 0) {
        printf("yes\n");
    } else {
        printf("no\n");
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int y;
    /* 读入年份，处理非法输入，判断是否为闰年 */

    return 0;
}
```

## 复杂度
O(1)。本题练习把文字规则翻译成逻辑表达式，以及检查 `scanf` 的返回值。

## 常见错误
### 条件组合错误 [WA]
`y % 4 == 0 || y % 100 != 0 && y % 400 == 0` 由于 `&&` 优先级更高，实际含义是"能被 4 整除，或者（不能被 100 整除且能被 400 整除）"，1900 会被判为闰年。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int y;
    if (scanf("%d", &y) != 1) {
        printf("error\n");
        return 0;
    }
    if (y % 4 == 0 || y % 100 != 0 && y % 400 == 0) {
        printf("yes\n");
    } else {
        printf("no\n");
    }
    return 0;
}
```

### 只判断能否被 4 整除 [WA]
1900、2100 这样的整百年不是闰年。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int y;
    if (scanf("%d", &y) != 1) {
        printf("error\n");
        return 0;
    }
    if (y % 4 == 0) {
        printf("yes\n");
    } else {
        printf("no\n");
    }
    return 0;
}
```

### 没有检查 scanf 的返回值 [WA]
输入 `abc` 时 `scanf` 读取失败，y 保持原来的值（这里初始化成了 0），0 能被 400 整除，于是程序输出了 `yes`。如果 y 没有初始化，读取它更是未定义行为。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int y = 0;
    scanf("%d", &y);
    if ((y % 4 == 0 && y % 100 != 0) || y % 400 == 0) {
        printf("yes\n");
    } else {
        printf("no\n");
    }
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
2024
```
```out
yes
```

### 02 sample 示例 2
```in
1900
```
```out
no
```

### 03 boundary 能被 400 整除的整百年
```in
2000
```
```out
yes
```

### 04 boundary int 最大值
```in
2147483647
```
```out
no
```

### 05 boundary 最小年份
```in
1
```
```out
no
```

### 06 degenerate 最小的闰年
```in
4
```
```out
yes
```

### 07 trap 非数字输入（scanf 返回 0）
```in
abc
```
```out
error
```

### 08 trap 空输入（scanf 返回 EOF）
```in
```
```out
error
```

### 09 normal 普通平年
```in
2023
```
```out
no
```

### 10 normal 整百年
```in
2100
```
```out
no
```
