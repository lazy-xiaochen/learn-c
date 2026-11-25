---json
{
  "id": "p-s1-arith-ops-1",
  "title": "把秒数换算成“时:分:秒”格式",
  "difficulty": "L1",
  "knowledgePoints": ["s1-arith-ops"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入一个表示时长的秒数 t，把它换算成"时:分:秒"的形式输出。小时数不限位数，分钟和秒都必须是两位数（不足两位时前面补 0）。

## 输入格式
一行，一个整数 t。

## 输出格式
一行，格式为 `H:MM:SS`。

## 数据范围
0 ≤ t ≤ 1000000000000（10¹²）

## 示例
### 示例 1
```in
3661
```
```out
1:01:01
```

### 示例 2（边界：0 秒）
```in
0
```
```out
0:00:00
```

## 提示
### 第 1 层
一小时有 3600 秒，一分钟有 60 秒。先算出整小时数，剩下的秒数再拆成分和秒。

### 第 2 层
`t / 3600` 是小时数，`t % 3600` 是不足一小时的部分；对剩下的部分再 `/ 60`、`% 60`。注意 t 最大是 10¹²，超出了 `int` 的范围，要用 `long long`（`%lld`）。

### 第 3 层
补零输出用 `%02lld`：`2` 表示至少占两位，`0` 表示不足时用 0 填充（不加 0 会用空格填充）。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    long long t;   /* 10^12 超出 int 范围 */
    if (scanf("%lld", &t) != 1) {
        return 0;
    }
    long long h = t / 3600;
    long long m = t % 3600 / 60;
    long long s = t % 60;
    printf("%lld:%02lld:%02lld\n", h, m, s);   /* %02lld：至少两位，不足补 0 */
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    /* 读入秒数，换算并输出 H:MM:SS */

    return 0;
}
```

## 复杂度
O(1)。本题练习整数除法和取余拆分数值，以及 `printf` 的宽度与补零。

## 常见错误
### 用 int 存放秒数 [WA|UB]
t 最大为 10¹²，用 `%d` 读入超出 `int` 范围的数，得到的值是错误的。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int t;
    if (scanf("%d", &t) != 1) {
        return 0;
    }
    printf("%d:%02d:%02d\n", t / 3600, t % 3600 / 60, t % 60);
    return 0;
}
```

### 没有补零 [WA]
`%d` 输出 1 分 1 秒时得到 `1:1:1`；`%2d` 会用空格补齐得到 `1: 1: 1`。要用 `%02d`（或 `%02lld`）。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    long long t;
    if (scanf("%lld", &t) != 1) {
        return 0;
    }
    printf("%lld:%2lld:%2lld\n", t / 3600, t % 3600 / 60, t % 60);
    return 0;
}
```

### 分钟算成了 t / 60 [WA]
`t / 60` 是总分钟数（包含了已经算进小时的部分），应当是 `t % 3600 / 60` 或 `t / 60 % 60`。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    long long t;
    if (scanf("%lld", &t) != 1) {
        return 0;
    }
    printf("%lld:%02lld:%02lld\n", t / 3600, t / 60, t % 60);
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
3661
```
```out
1:01:01
```

### 02 sample 示例 2
```in
0
```
```out
0:00:00
```

### 03 boundary 最大值 10^12
```in
1000000000000
```
```out
277777777:46:40
```

### 04 boundary 一天差一秒
```in
86399
```
```out
23:59:59
```

### 05 degenerate 不到一分钟
```in
59
```
```out
0:00:59
```

### 06 degenerate 恰好一小时
```in
3600
```
```out
1:00:00
```

### 07 trap 刚超过 int 最大值
```in
2147483648
```
```out
596523:14:08
```

### 08 normal 一般情况
```in
45296
```
```out
12:34:56
```
