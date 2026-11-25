---json
{
  "id": "p-s1-if-else-2",
  "title": "把百分制成绩转换为等级，并识别非法输入",
  "difficulty": "L1",
  "knowledgePoints": ["s1-if-else"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入一个整数成绩 s，按下表输出等级：

| 成绩 | 等级 |
|---|---|
| 90 ~ 100 | A |
| 80 ~ 89 | B |
| 70 ~ 79 | C |
| 60 ~ 69 | D |
| 0 ~ 59 | F |

如果没能读入一个整数，或者成绩不在 0 ~ 100 之间，输出 `invalid`。

## 输入格式
一行，一个成绩。

## 输出格式
一行，等级字母或 `invalid`。

## 数据范围
如果输入是整数，则它在 `int` 范围内。

## 示例
### 示例 1
```in
85
```
```out
B
```

### 示例 2（边界：恰好 60 分）
```in
60
```
```out
D
```

## 提示
### 第 1 层
先处理"不合法"的情况，剩下的就都是 0 ~ 100 的合法成绩了。

### 第 2 层
`else if` 是按顺序检查的：如果从 90 开始往下判断 `s >= 90`、`s >= 80`……，后面的条件就不需要再写上限。

### 第 3 层
`if (scanf(...) != 1 || s < 0 || s > 100)` 输出 invalid；否则依次判断 `s >= 90`、`s >= 80`、`s >= 70`、`s >= 60`，最后的 `else` 是 F。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int s;
    /* 读取失败时 s 没有被赋值，必须先判断返回值，才能使用 s */
    if (scanf("%d", &s) != 1 || s < 0 || s > 100) {
        printf("invalid\n");
        return 0;
    }
    if (s >= 90) {
        printf("A\n");
    } else if (s >= 80) {
        printf("B\n");
    } else if (s >= 70) {
        printf("C\n");
    } else if (s >= 60) {
        printf("D\n");
    } else {
        printf("F\n");
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int s;
    /* 读入成绩，输出等级或 invalid */

    return 0;
}
```

## 复杂度
O(1)。本题练习 else-if 链的顺序、边界值，以及在使用变量之前检查读取是否成功。

## 常见错误
### 从低分往高分判断 [WA]
`if (s >= 60) D; else if (s >= 70) C; ...`：85 分满足第一个条件 `s >= 60`，直接输出 D。按"从高到低"或者"每个分支都写完整区间"来写。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int s;
    if (scanf("%d", &s) != 1 || s < 0 || s > 100) {
        printf("invalid\n");
        return 0;
    }
    if (s >= 60) {
        printf("D\n");
    } else if (s >= 70) {
        printf("C\n");
    } else if (s >= 80) {
        printf("B\n");
    } else if (s >= 90) {
        printf("A\n");
    } else {
        printf("F\n");
    }
    return 0;
}
```

### 边界用了 > 而不是 >= [WA]
`s > 90` 会把 90 分判成 B。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int s;
    if (scanf("%d", &s) != 1 || s < 0 || s > 100) {
        printf("invalid\n");
        return 0;
    }
    if (s > 90) {
        printf("A\n");
    } else if (s > 80) {
        printf("B\n");
    } else if (s > 70) {
        printf("C\n");
    } else if (s > 60) {
        printf("D\n");
    } else {
        printf("F\n");
    }
    return 0;
}
```

### 没有检查 scanf 的返回值 [WA]
输入 `abc` 时 s 没有被赋值。下面的代码把 s 初始化为 0，于是输出了 F；如果没有初始化，读取它就是未定义行为。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int s = 0;
    scanf("%d", &s);
    if (s < 0 || s > 100) {
        printf("invalid\n");
    } else if (s >= 90) {
        printf("A\n");
    } else if (s >= 80) {
        printf("B\n");
    } else if (s >= 70) {
        printf("C\n");
    } else if (s >= 60) {
        printf("D\n");
    } else {
        printf("F\n");
    }
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
85
```
```out
B
```

### 02 sample 示例 2
```in
60
```
```out
D
```

### 03 boundary 满分
```in
100
```
```out
A
```

### 04 boundary 最低分
```in
0
```
```out
F
```

### 05 boundary 刚好 90 分
```in
90
```
```out
A
```

### 06 boundary 超出范围
```in
101
```
```out
invalid
```

### 07 degenerate 负数
```in
-1
```
```out
invalid
```

### 08 trap 不是数字（scanf 返回 0）
```in
abc
```
```out
invalid
```

### 09 trap 空输入（scanf 返回 EOF）
```in
```
```out
invalid
```

### 10 normal 不及格
```in
59
```
```out
F
```
