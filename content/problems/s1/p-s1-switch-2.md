---json
{
  "id": "p-s1-switch-2",
  "title": "利用 switch 的 fall-through 倒序输出礼物清单并累计总数",
  "difficulty": "L2",
  "knowledgePoints": ["s1-switch"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
在一个连续 5 天的活动中，第 k 天会收到 k 份第 k 号礼物，并且**之前每一天的礼物会再收到一遍**。例如第 3 天收到：3 份 3 号礼物、2 份 2 号礼物、1 份 1 号礼物。

读入天数 n（1 ≤ n ≤ 5），从 n 号礼物开始**倒序**逐行输出当天收到的礼物，最后一行输出当天收到的礼物总份数。如果 n 不合法，只输出一行 `invalid`。

要求：**不使用循环**，用 `switch` 的 fall-through 完成。（循环在后面的章节才会学到；这道题正好展示 fall-through 有意使用时的样子。）

## 输入格式
一行，一个整数 n。

## 输出格式
若干行 `gift k x k`（表示 k 份 k 号礼物），按 k 从大到小排列；最后一行 `total T`。

## 数据范围
n 为 `int` 范围内的整数。

## 示例
### 示例 1
```in
3
```
```out
gift 3 x 3
gift 2 x 2
gift 1 x 1
total 6
```

### 示例 2（边界：第 1 天）
```in
1
```
```out
gift 1 x 1
total 1
```

## 提示
### 第 1 层
第 n 天要输出 n 号到 1 号的所有礼物。如果从 `case n` 进入 switch，之后会依次执行哪些 case？

### 第 2 层
按 5、4、3、2、1 的顺序写 case，每个 case 输出一行并把份数加到总数上，中间**都不写 break**。从 `case n` 进入后，会依次 fall through 执行完 n、n−1、……、1。

### 第 3 层
非法的 n 交给 `default`，在那里输出 invalid 并结束程序。`case 1` 之后再输出 total。别忘了 total 要初始化为 0。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        printf("invalid\n");
        return 0;
    }
    int total = 0;
    switch (n) {
    case 5:
        printf("gift 5 x 5\n");
        total += 5;
        /* fall through：有意不写 break，继续输出更小号的礼物 */
    case 4:
        printf("gift 4 x 4\n");
        total += 4;
        /* fall through */
    case 3:
        printf("gift 3 x 3\n");
        total += 3;
        /* fall through */
    case 2:
        printf("gift 2 x 2\n");
        total += 2;
        /* fall through */
    case 1:
        printf("gift 1 x 1\n");
        total += 1;
        break;
    default:
        printf("invalid\n");
        return 0;
    }
    printf("total %d\n", total);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        printf("invalid\n");
        return 0;
    }
    /* 用 switch 的 fall-through 输出礼物清单与总数 */

    return 0;
}
```

## 复杂度
O(1)。本题考查 switch 的执行规则："跳到匹配的 case，然后一直往下执行，直到 break"。

## 常见错误
### 习惯性地在每个 case 后面写 break [WA]
每个 case 都 break 了，只会输出第 n 号礼物，总数也只有 n。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        printf("invalid\n");
        return 0;
    }
    int total = 0;
    switch (n) {
    case 5: printf("gift 5 x 5\n"); total += 5; break;
    case 4: printf("gift 4 x 4\n"); total += 4; break;
    case 3: printf("gift 3 x 3\n"); total += 3; break;
    case 2: printf("gift 2 x 2\n"); total += 2; break;
    case 1: printf("gift 1 x 1\n"); total += 1; break;
    default: printf("invalid\n"); return 0;
    }
    printf("total %d\n", total);
    return 0;
}
```

### case 按从小到大的顺序排列 [WA]
从 `case 3` 进入后会 fall through 到 4、5，输出的是 3、4、5 号礼物，方向反了。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        printf("invalid\n");
        return 0;
    }
    int total = 0;
    switch (n) {
    case 1: printf("gift 1 x 1\n"); total += 1;
    case 2: printf("gift 2 x 2\n"); total += 2;
    case 3: printf("gift 3 x 3\n"); total += 3;
    case 4: printf("gift 4 x 4\n"); total += 4;
    case 5: printf("gift 5 x 5\n"); total += 5; break;
    default: printf("invalid\n"); return 0;
    }
    printf("total %d\n", total);
    return 0;
}
```

### default 放在最前面且没有 break [WA]
default 在最前面时，非法输入跳到 default 后会一路 fall through 执行所有 case。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        printf("invalid\n");
        return 0;
    }
    int total = 0;
    switch (n) {
    default: printf("invalid\n");
    case 5: printf("gift 5 x 5\n"); total += 5;
    case 4: printf("gift 4 x 4\n"); total += 4;
    case 3: printf("gift 3 x 3\n"); total += 3;
    case 2: printf("gift 2 x 2\n"); total += 2;
    case 1: printf("gift 1 x 1\n"); total += 1;
    }
    printf("total %d\n", total);
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
3
```
```out
gift 3 x 3
gift 2 x 2
gift 1 x 1
total 6
```

### 02 sample 示例 2
```in
1
```
```out
gift 1 x 1
total 1
```

### 03 boundary 最后一天
```in
5
```
```out
gift 5 x 5
gift 4 x 4
gift 3 x 3
gift 2 x 2
gift 1 x 1
total 15
```

### 04 boundary 超出天数
```in
6
```
```out
invalid
```

### 05 degenerate 第 0 天
```in
0
```
```out
invalid
```

### 06 degenerate 负数
```in
-2
```
```out
invalid
```

### 07 trap 非法输入时 default 不能 fall through
```in
2147483647
```
```out
invalid
```

### 08 trap 不是数字
```in
x
```
```out
invalid
```

### 09 normal 第 4 天
```in
4
```
```out
gift 4 x 4
gift 3 x 3
gift 2 x 2
gift 1 x 1
total 10
```
