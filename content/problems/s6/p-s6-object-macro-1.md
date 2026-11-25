---json
{
  "id": "p-s6-object-macro-1",
  "title": "工时换算器：把秒数拆成天/时/分/秒，并给出总分钟与总小时",
  "difficulty": "L2",
  "knowledgePoints": ["s6-object-macro"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
排班系统里，工时以"秒"存储，但报表要按人看得懂的形式展示。请你写一个换算器：读入一个非负整数 `n`（秒），把它拆成 **天、小时、分钟、秒** 四段，并另外给出总分钟数、总小时数。

换算关系用**对象宏**定义（起始代码里已经写了三个宏，可惜它们有问题）：

```c
#define SECONDS_PER_MINUTE 60
#define SECONDS_PER_HOUR   ...
#define SECONDS_PER_DAY    ...
```

要求：

1. 天、时、分、秒都是**向下取整**的整数，例如 90061 秒 = 1 天 1 小时 1 分 1 秒；
2. `total_minutes` 是 `n / 60`（整除，丢掉零头），`total_hours` 是 `n / 3600`；
3. 三个宏必须**互相引用**（`SECONDS_PER_DAY` 用 `SECONDS_PER_HOUR` 定义），不要直接把 86400 抄进去——这样以后要改"一分钟算多少秒"只需改一处。

为什么这道题值得单独做：宏是**文本替换**，不是变量。`#define SECONDS_PER_DAY 24 * 60 * 60` 看起来是人畜无害的常量，但它在表达式里会按运算符优先级被拆开，算出来的天数和你想的完全不同。先读一遍起始代码里的三个宏，再想想它们展开成什么。

## 输入格式
一行一个整数 `n`：秒数。

## 输出格式
三行：

```
<天> <小时> <分钟> <秒>
total_minutes=<总分钟数>
total_hours=<总小时数>
```

- 第一行四个整数用**一个空格**分隔，行末没有多余空格；
- 第二、三行是 `total_minutes=` / `total_hours=` 加上整除的结果。

## 数据范围
- `0 ≤ n ≤ 1000000000`（10 亿秒约等于 11574 天）；
- `n` 用 `int` 就够了（10 亿 < 2³¹−1），但**中间结果**要注意：先除后乘的顺序变了就可能溢出；
- 输出最多三行、几十个字符。

## 示例
### 示例 1
```in
90061
```
```out
1 1 1 1
total_minutes=1501
total_hours=25
```
> 90061 = 86400 + 3661 = 1 天 + 1 小时 1 分 1 秒。总分钟数 90061 / 60 = 1501（余 1），总小时数 90061 / 3600 = 25（余 61）。

### 示例 2（边界：0 秒）
```in
0
```
```out
0 0 0 0
total_minutes=0
total_hours=0
```
> 0 秒是合法输入，四段全是 0，两个总计也是 0。这组数据能立刻暴露"忘记处理 0"或"把 0 当成没读到"的错误。

## 提示
### 第 1 层
先把"拆段"的算法想清楚，再管宏：先算天数（`n / 一天的秒数`），把用掉的部分减掉（或者直接对一天的秒数取余），剩下的再依次拆成小时、分钟、秒。每一步都是"除一次、取余一次"。

### 第 2 层
问题出在宏上。把 `n / SECONDS_PER_DAY` 里的 `SECONDS_PER_DAY` 按文本展开，得到的是 `n / 24 * 60 * 60`——`/` 和 `*` 同级、从左往右算，所以它先算 `n / 24`，再乘 60、再乘 60。宏体是一个**表达式**，必须用一对括号把它包成一个整体：`(24 * 60 * 60)`。`SECONDS_PER_HOUR` 同理。

### 第 3 层
三个宏要写成互相引用的形式：

- `SECONDS_PER_MINUTE` 就是 `60`（单个常量可以不加括号，但加上也无害）；
- `SECONDS_PER_HOUR` 用 `(60 * SECONDS_PER_MINUTE)`；
- `SECONDS_PER_DAY` 用 `(24 * SECONDS_PER_HOUR)`。

然后按"取整、取余、再拆下一段"的顺序写：`days = n / SECONDS_PER_DAY; rest = n % SECONDS_PER_DAY;` …… 最后注意 0 秒和"刚好一整天"这两种情况。

## 参考代码
```c file=main.c
#include <stdio.h>

/* 单位换算常量：宏体是表达式，必须整体加括号，否则会被调用处的运算符拆开。
   三个宏层层引用，改一处（比如一分钟改成 100 秒）整条换算链都会跟着变。 */
#define SECONDS_PER_MINUTE 60
#define SECONDS_PER_HOUR   (60 * SECONDS_PER_MINUTE)
#define SECONDS_PER_DAY    (24 * SECONDS_PER_HOUR)

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0) {
        return 0;
    }

    int days = n / SECONDS_PER_DAY;          /* 完整的天数 */
    int rest = n % SECONDS_PER_DAY;          /* 不满一天剩下的秒数 */
    int hours = rest / SECONDS_PER_HOUR;
    rest %= SECONDS_PER_HOUR;
    int minutes = rest / SECONDS_PER_MINUTE;
    int seconds = rest % SECONDS_PER_MINUTE;

    printf("%d %d %d %d\n", days, hours, minutes, seconds);
    printf("total_minutes=%d\n", n / SECONDS_PER_MINUTE);
    printf("total_hours=%d\n", n / SECONDS_PER_HOUR);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

/* 单位换算常量。TODO：宏体是表达式，展开后会被运算符优先级拆开——先把括号补上 */
#define SECONDS_PER_MINUTE 60
#define SECONDS_PER_HOUR   60 * 60
#define SECONDS_PER_DAY    24 * 60 * 60

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0) {
        return 0;
    }

    int days = n / SECONDS_PER_DAY;
    int rest = n % SECONDS_PER_DAY;
    int hours = rest / SECONDS_PER_HOUR;
    rest = rest % SECONDS_PER_HOUR;
    int minutes = rest / SECONDS_PER_MINUTE;
    int seconds = rest % SECONDS_PER_MINUTE;

    printf("%d %d %d %d\n", days, hours, minutes, seconds);
    printf("total_minutes=%d\n", n / SECONDS_PER_MINUTE);
    printf("total_hours=%d\n", n / SECONDS_PER_HOUR);
    return 0;
}
```

## 复杂度
时间 O(1)：最多三次除法、三次取余。
空间 O(1)：只有几个局部变量。

这道题的"复杂度"不是重点，重点是**宏展开**：`n / SECONDS_PER_DAY` 在预处理之后会变成什么，决定了算式的含义。想验证的话，编译时加 `-E` 看一眼预处理结果，`n / 24 * 60 * 60` 会原形毕露。

## 常见错误
### 宏体没有加括号（用更宽的类型掩盖了溢出） [WA]
把中间量改成 `long long`，溢出是没了，但除法还是被优先级拆散：`n / 24 * 60 * 60` 算的是 `(n / 24) * 3600`，结果大得离谱。这组错误在示例 1 上就会失败。

```c file=main.c expect=WA
#include <stdio.h>

#define SECONDS_PER_MINUTE 60
#define SECONDS_PER_HOUR   60 * 60
#define SECONDS_PER_DAY    24 * 60 * 60

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0) {
        return 0;
    }

    long long days = n / SECONDS_PER_DAY;   /* 错：展开成 n / 24 * 60 * 60 */
    long long rest = n % SECONDS_PER_DAY;
    long long hours = rest / SECONDS_PER_HOUR;
    rest = rest % SECONDS_PER_HOUR;
    long long minutes = rest / SECONDS_PER_MINUTE;
    long long seconds = rest % SECONDS_PER_MINUTE;

    printf("%lld %lld %lld %lld\n", days, hours, minutes, seconds);
    printf("total_minutes=%lld\n", n / SECONDS_PER_MINUTE);
    printf("total_hours=%lld\n", n / SECONDS_PER_HOUR);
    return 0;
}
```

### 取了余数却拿它去整除别的单位 [WA]
拆完天数之后，剩下的秒数必须先对"一天的秒数"取余，再拿去算小时。写成 `rest = rest / SECONDS_PER_HOUR;` 会把"余数"变成"小时数"，后面分钟和秒全部错位；示例 1 会输出 `1 0 ...` 之类的怪结果。

```c file=main.c expect=WA
#include <stdio.h>

#define SECONDS_PER_MINUTE 60
#define SECONDS_PER_HOUR   (60 * SECONDS_PER_MINUTE)
#define SECONDS_PER_DAY    (24 * SECONDS_PER_HOUR)

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0) {
        return 0;
    }

    int days = n / SECONDS_PER_DAY;
    int rest = n % SECONDS_PER_DAY;
    int hours = rest / SECONDS_PER_HOUR;
    rest = rest / SECONDS_PER_HOUR;          /* 错：这里应该是取余 */
    int minutes = rest / SECONDS_PER_MINUTE;
    int seconds = rest % SECONDS_PER_MINUTE;

    printf("%d %d %d %d\n", days, hours, minutes, seconds);
    printf("total_minutes=%d\n", n / SECONDS_PER_MINUTE);
    printf("total_hours=%d\n", n / SECONDS_PER_HOUR);
    return 0;
}
```

### 宏定义末尾多了分号 [CE]
`#define SECONDS_PER_DAY 24 * 60 * 60;` 会把分号也存进替换文本。用在 `if (n >= SECONDS_PER_DAY)` 里就变成 `if (n >= 24 * 60 * 60;)`，直接语法错误；即使这一处侥幸通过，别的表达式里也会莫名其妙多出一条空语句。**`#define` 不是语句，末尾不加分号。**

```c file=main.c expect=CE
#include <stdio.h>

#define SECONDS_PER_MINUTE 60
#define SECONDS_PER_HOUR   (60 * SECONDS_PER_MINUTE)
#define SECONDS_PER_DAY    (24 * SECONDS_PER_HOUR);

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0) {
        return 0;
    }

    if (n >= SECONDS_PER_DAY) {              /* 错：展开成 if (n >= (...);) */
        printf("超过一天\n");
    }
    printf("%d %d %d %d\n", n / SECONDS_PER_DAY, 0, 0, n % SECONDS_PER_MINUTE);
    printf("total_minutes=%d\n", n / SECONDS_PER_MINUTE);
    printf("total_hours=%d\n", n / SECONDS_PER_HOUR);
    return 0;
}
```

### 用 `int` 存"先除后乘"的中间结果 [UB]
如果忘了补括号，又把中间量写成 `int`，`(n / 24) * 3600` 在 10 亿秒的数据上会算出 1.5×10¹¹，远超 `int` 范围——有符号整数溢出是未定义行为，本平台的 UBSan 会报 `signed integer overflow`。它的可怕之处是"示例 1 能过、大数据才崩"，所以看到莫名其妙的负数就要想到溢出。

## 测试用例
### 01 sample 示例 1
```in
90061
```
```out
1 1 1 1
total_minutes=1501
total_hours=25
```

### 02 sample 示例 2
```in
0
```
```out
0 0 0 0
total_minutes=0
total_hours=0
```

### 03 boundary 十亿秒（数据范围上界）
```in
1000000000
```
```out
11574 1 46 40
total_minutes=16666666
total_hours=277777
```

### 04 boundary 比一天少一秒
```in
86399
```
```out
0 23 59 59
total_minutes=1439
total_hours=23
```

### 05 degenerate 只有 59 秒
```in
59
```
```out
0 0 0 59
total_minutes=0
total_hours=0
```

### 06 trap 刚好一整天
```in
86400
```
```out
1 0 0 0
total_minutes=1440
total_hours=24
```

### 07 trap 每个单位都恰好是 1
```in
3661
```
```out
0 1 1 1
total_minutes=61
total_hours=1
```

### 08 normal 混合数值
```in
123456
```
```out
1 10 17 36
total_minutes=2057
total_hours=34
```
