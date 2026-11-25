---json
{
  "id": "p-s1-loop-control-2",
  "title": "统计有效成绩：跳过非法值、遇到 -1 停止",
  "difficulty": "L2",
  "knowledgePoints": ["s1-loop-control", "s1-loops"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
依次读入若干个整数成绩：

- 读到 `-1` 时立即停止（-1 本身不是成绩）；
- 不在 0 ~ 100 范围内的数是录入错误，**跳过**它继续读下一个；
- 输入提前结束（没有 -1），或者遇到不是整数的内容时，也停止读取。

输出有效成绩的个数、总和与平均分（保留两位小数）。如果一个有效成绩都没有，输出 `no data`。

## 输入格式
若干个用空白分隔的整数。

## 输出格式
一行，格式为 `count=<个数> sum=<总和> avg=<平均分>`；或者 `no data`。

## 数据范围
输入最多 200000 个数，每个数在 `int` 范围内。

## 示例
### 示例 1
```in
90 85 -1
```
```out
count=2 sum=175 avg=87.50
```

### 示例 2（边界：一开始就是 -1）
```in
-1
```
```out
no data
```

## 提示
### 第 1 层
循环什么时候结束？有三种情况。哪些数需要跳过但不结束循环？

### 第 2 层
`while (scanf("%d", &x) == 1)` 同时处理了"输入结束"和"不是整数"两种情况。循环体内：`x == -1` 时 `break`；超出 0 ~ 100 时 `continue`；其余情况累加。

### 第 3 层
平均分是 `sum` 除以 `count`，两者都是整数，要先转换成 `double` 再除，否则小数部分会丢失。count 为 0 时不能做除法。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int x, count = 0;
    long long sum = 0;
    /* scanf 返回 1 才继续：同时处理了输入结束和非整数两种情况 */
    while (scanf("%d", &x) == 1) {
        if (x == -1) {
            break;               /* 结束标记 */
        }
        if (x < 0 || x > 100) {
            continue;            /* 非法成绩：跳过，继续读下一个 */
        }
        count++;
        sum += x;
    }
    if (count == 0) {
        printf("no data\n");     /* 没有有效成绩时不能做除法 */
        return 0;
    }
    printf("count=%d sum=%lld avg=%.2f\n", count, sum, (double)sum / count);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int x, count = 0;
    long long sum = 0;
    /* 循环读入并统计 */

    return 0;
}
```

## 复杂度
时间 O(输入个数)，空间 O(1)。

## 常见错误
### 用整数除法求平均分 [WA]
`sum / count` 是整数除法，3 / 2 得到 1，输出 1.00 而不是 1.50。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int x, count = 0;
    long long sum = 0;
    while (scanf("%d", &x) == 1) {
        if (x == -1) break;
        if (x < 0 || x > 100) continue;
        count++;
        sum += x;
    }
    if (count == 0) {
        printf("no data\n");
        return 0;
    }
    printf("count=%d sum=%lld avg=%.2f\n", count, sum, (double)(sum / count));
    return 0;
}
```

### 循环条件写成 != EOF [TLE]
遇到 `abc` 时 scanf 返回 0（不是 EOF），而 `abc` 一直留在缓冲区里，每次都读取失败，程序陷入死循环。
```c file=main.c expect=TLE
#include <stdio.h>

int main(void) {
    int x = 0, count = 0;
    long long sum = 0;
    while (scanf("%d", &x) != EOF) {
        if (x == -1) break;
        if (x < 0 || x > 100) continue;
        count++;
        sum += x;
    }
    if (count == 0) {
        printf("no data\n");
        return 0;
    }
    printf("count=%d sum=%lld avg=%.2f\n", count, sum, (double)sum / count);
    return 0;
}
```

### 遇到非法成绩时用了 break [WA]
break 会结束整个循环，非法值后面的有效成绩都没有被统计。跳过一个值应当用 continue。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int x, count = 0;
    long long sum = 0;
    while (scanf("%d", &x) == 1) {
        if (x == -1) break;
        if (x < 0 || x > 100) break;
        count++;
        sum += x;
    }
    if (count == 0) {
        printf("no data\n");
        return 0;
    }
    printf("count=%d sum=%lld avg=%.2f\n", count, sum, (double)sum / count);
    return 0;
}
```

### 没有处理"一个有效成绩都没有" [WA]
count 为 0 时 `(double)sum / count` 是 0.0 / 0，结果是 NaN，会输出 `nan` 之类的内容。

## 测试用例
### 01 sample 示例 1
```in
90 85 -1
```
```out
count=2 sum=175 avg=87.50
```

### 02 sample 示例 2
```in
-1
```
```out
no data
```

### 03 boundary 端点 0 和 100 有效，101 与 -5 无效
```in
100 0 101 -5 50 -1
```
```out
count=3 sum=150 avg=50.00
```

### 04 trap 没有结束标记 -1（scanf 返回 EOF）
```in
70 80
```
```out
count=2 sum=150 avg=75.00
```

### 05 degenerate 空输入
```in
```
```out
no data
```

### 06 normal -1 之后的数不再统计
```in
60 -1 70 80
```
```out
count=1 sum=60 avg=60.00
```

### 07 trap 平均分有小数（整数除法会丢失）
```in
1 2 -1
```
```out
count=2 sum=3 avg=1.50
```

### 08 degenerate 全部是非法成绩
```in
200 300 -2 -1
```
```out
no data
```

### 09 trap 遇到非整数内容（scanf 返回 0）
```in
99 abc 88 -1
```
```out
count=1 sum=99 avg=99.00
```

### 生成 boundary 最大规模
```js gen
// 200000 个数：交替出现有效成绩 100 和非法值 1000，不含 -1
const parts = [];
for (let i = 0; i < 200000; i++) parts.push(i % 2 === 0 ? 100 : 1000);
return [
  { kind: 'boundary', category: '最大规模：20 万个数，没有结束标记', input: parts.join(' ') + '\n', output: 'count=100000 sum=10000000 avg=100.00\n' },
];
```
