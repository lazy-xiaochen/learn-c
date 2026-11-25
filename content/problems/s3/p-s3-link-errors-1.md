---json
{
  "id": "p-s3-link-errors-1",
  "title": "修复链接失败的停车收费工程：读懂 undefined symbol",
  "difficulty": "L3",
  "knowledgePoints": ["s3-link-errors"],
  "special": "link-diagnosis",
  "judge": { "mode": "multi", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
停车场的同学把一个"日结收费"的小程序拆成了三个文件交给你：

- `parking.h`：三个统计函数的声明；
- `parking.c`：三个统计函数的实现，以及单车计费函数 `parking_fee`；
- `main.c`：读入车辆数、每辆车的停放小时数，调用函数、输出汇总。

可是这个工程现在**链接失败**，一运行就报 `undefined symbol`（未定义的符号），连可执行文件都生成不出来。

请你读懂错误信息、找出原因并修好它，使程序对数据范围内的所有输入都输出正确结果。三个文件都可以修改，提交时三个文件会一起参与编译。

### 为什么这是链接错误而不是编译错误
C 程序的构建分两步：

1. **编译**：每个 `.c` 文件单独编译成目标文件。这一步只检查"函数有没有声明、调用写法对不对"，编译器**看不见别的 `.c` 文件**。
2. **链接**：链接器把几个目标文件拼在一起，按**名字**去把"调用点"和"定义"接上。

`main.c` 里调用 `parking_total` 时，编译阶段只要看到 `parking.h` 里的声明就算过关；可链接器翻遍所有目标文件都找不到这个函数**外部可见的定义**，于是报 `undefined symbol: parking_total`。函数明明写了，却说"未定义"，多数情况下是因为它的**链接属性**不对——比如加了 `static`。

修好链接之后，程序还未必正确：计费规则里有一条很容易漏掉的规则，请对着"数据范围"和示例仔细核对。

## 输入格式
第一行一个整数 `n`，表示今天停过的车辆数。
第二行 `n` 个整数，第 `i` 个数表示第 `i` 辆车停放的小时数（`0` 表示停了但不足 1 小时）。

## 输出格式
如果成功读入合法的 `n`（1 ≤ n ≤ 500）和全部 `n` 个小时数（0 ≤ 小时数 ≤ 48），输出三行：

```
total=今天的收费总额
max=所有车辆中最贵的一单
free=免费的车辆数
```

否则（读入失败、`n` 超范围、小时数超范围）输出一行 `error`。

## 数据范围
1 ≤ n ≤ 500
0 ≤ 每辆车的小时数 ≤ 48

计费规则（单位：元）：

| 停放时长 | 费用 |
|---|---|
| 0 小时（不足 1 小时） | 免费 |
| 1 ~ 3 小时 | 每小时 5 元 |
| 超过 3 小时 | 前 3 小时共 15 元，之后每小时 3 元 |
| 全天 | **封顶 40 元** |

单日总额最大是 500 × 40 = 20000，`int` 足够，不需要 `long long`。

## 示例
### 示例 1
```in
3
1 4 12
```
```out
total=63
max=40
free=0
```
> 1 小时 = 5 元；4 小时 = 15 + 3 = 18 元；12 小时 = 15 + 27 = 42 元，超过封顶，按 40 元算。合计 63 元，最贵 40 元，没有免费车。

### 示例 2（边界：三辆车都不足 1 小时）
```in
2
0 0
```
```out
total=0
max=0
free=2
```
> `0` 小时是免费，不是"1 小时收费"也不是"3 小时 15 元"。注意 `max` 在全部免费时是 0——这是唯一允许出现"0 元"的情况。

## 提示
### 第 1 层
先别急着改代码：点一次"运行"，仔细读报错信息。它说的是编译错误还是链接错误？报错里的符号名，在哪个文件里出现过？又在哪个文件里"应该被定义"？

### 第 2 层
`undefined symbol` / `undefined reference to` 是**链接**错误：某个函数被声明、被调用了，但链接器在所有目标文件里都找不到同名、外部可见的定义。逐个对照 `parking.h` 里的声明和 `parking.c` 里的定义：名字一致吗？返回值类型一致吗？有没有多写 `static`（`static` 是内部链接，别的文件看不见）？

### 第 3 层
链接修好之后，示例 1 仍然会暴露一个逻辑错误：`parking_fee` 里算了"前 3 小时 15 元 + 之后每小时 3 元"，但**忘了全天封顶 40 元**，于是停 12 小时算出 42 元。可以先算出费用，再用 `if (fee > 40) fee = 40;` 收口。另外别忘了：`0` 小时要单独返回 0，否则 `hours - 3` 会变成负数。

## 参考代码
```c file=parking.h
#ifndef PARKING_H
#define PARKING_H

/* 返回一辆车停 hours 小时的费用（元） */
int parking_fee(int hours);

/* 返回 n 辆车（小时数在 hours 数组里）的费用总和 */
int parking_total(const int hours[], int n);

/* 返回 n 辆车中最贵的一单 */
int parking_max(const int hours[], int n);

/* 返回免费（不足 1 小时）的车辆数 */
int parking_free_count(const int hours[], int n);

#endif
```

```c file=parking.c
#include "parking.h"

#define DAY_CAP 40          /* 一日封顶 */

int parking_fee(int hours) {
    if (hours <= 0) {
        return 0;                       /* 不足 1 小时：免费 */
    }

    int fee = 0;
    if (hours <= 3) {
        fee = 5 * hours;                /* 前 3 小时：每小时 5 元 */
    } else {
        fee = 15 + 3 * (hours - 3);     /* 3 小时以上：超出部分每小时 3 元 */
    }
    if (fee > DAY_CAP) {
        fee = DAY_CAP;                  /* 全天封顶 40 元 */
    }
    return fee;
}

int parking_total(const int hours[], int n) {
    int sum = 0;
    for (int i = 0; i < n; i++) {
        sum += parking_fee(hours[i]);
    }
    return sum;
}

int parking_max(const int hours[], int n) {
    int best = 0;                       /* 费用不会是负数，0 是安全的下界 */
    for (int i = 0; i < n; i++) {
        int fee = parking_fee(hours[i]);
        if (fee > best) {
            best = fee;
        }
    }
    return best;
}

int parking_free_count(const int hours[], int n) {
    int count = 0;
    for (int i = 0; i < n; i++) {
        if (hours[i] <= 0) {
            count++;
        }
    }
    return count;
}
```

```c file=main.c
#include <stdio.h>
#include "parking.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 500) {
        printf("error\n");
        return 0;
    }

    int hours[500];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &hours[i]) != 1 || hours[i] < 0 || hours[i] > 48) {
            printf("error\n");
            return 0;
        }
    }

    printf("total=%d\n", parking_total(hours, n));
    printf("max=%d\n", parking_max(hours, n));
    printf("free=%d\n", parking_free_count(hours, n));
    return 0;
}
```

## 初始代码
```c file=parking.h
#ifndef PARKING_H
#define PARKING_H

/* 返回一辆车停 hours 小时的费用（元） */
int parking_fee(int hours);

/* 返回 n 辆车（小时数在 hours 数组里）的费用总和 */
int parking_total(const int hours[], int n);

/* 返回 n 辆车中最贵的一单 */
int parking_max(const int hours[], int n);

/* 返回免费（不足 1 小时）的车辆数 */
int parking_free_count(const int hours[], int n);

#endif
```

```c file=parking.c
#include "parking.h"

#define DAY_CAP 40          /* 一日封顶 */

int parking_fee(int hours) {
    if (hours <= 0) {
        return 0;
    }

    int fee = 0;
    if (hours <= 3) {
        fee = 5 * hours;
    } else {
        fee = 15 + 3 * (hours - 3);     /* 少了封顶 */
    }
    return fee;
}

/* 注意：这个函数加了 static —— 它只在 parking.c 内部可见 */
static int parking_total(const int hours[], int n) {
    int sum = 0;
    for (int i = 0; i < n; i++) {
        sum += parking_fee(hours[i]);
    }
    return sum;
}

int parking_max(const int hours[], int n) {
    int best = 0;
    for (int i = 0; i < n; i++) {
        int fee = parking_fee(hours[i]);
        if (fee > best) {
            best = fee;
        }
    }
    return best;
}

int parking_free_count(const int hours[], int n) {
    int count = 0;
    for (int i = 0; i < n; i++) {
        if (hours[i] <= 0) {
            count++;
        }
    }
    return count;
}
```

```c file=main.c
#include <stdio.h>
#include "parking.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 500) {
        printf("error\n");
        return 0;
    }

    int hours[500];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &hours[i]) != 1 || hours[i] < 0 || hours[i] > 48) {
            printf("error\n");
            return 0;
        }
    }

    printf("total=%d\n", parking_total(hours, n));
    printf("max=%d\n", parking_max(hours, n));
    printf("free=%d\n", parking_free_count(hours, n));
    return 0;
}
```

## 复杂度
时间 O(n)：三个统计函数各扫一遍数组，每次 `parking_fee` 是常数时间。
空间 O(n)：`main` 里开了一个长度为 500 的数组存放小时数，没有额外分配。

本题考查的是"读懂链接错误"：`static` 让函数变成内部链接，声明和调用都存在、定义也存在，但**别的文件看不见它**，于是链接器报 `undefined symbol`。修法是去掉 `static`（函数需要被 `main.c` 使用，就必须是外部链接）。第二层是计费规则里的"全天封顶"。

## 常见错误
### 只去掉 static，忘了全天封顶 [WA]
链接错误修好、程序能跑，但 12 小时算出 42 元、48 小时算出 150 元，与"封顶 40 元"不符。这类错误只在停放时间较长时暴露，短时停车的用例全都对得上。
```c file=parking.c expect=WA
#include "parking.h"

int parking_fee(int hours) {
    if (hours <= 0) {
        return 0;
    }
    if (hours <= 3) {
        return 5 * hours;
    }
    return 15 + 3 * (hours - 3);        /* 错：没有封顶 */
}

int parking_total(const int hours[], int n) {
    int sum = 0;
    for (int i = 0; i < n; i++) {
        sum += parking_fee(hours[i]);
    }
    return sum;
}

int parking_max(const int hours[], int n) {
    int best = 0;
    for (int i = 0; i < n; i++) {
        int fee = parking_fee(hours[i]);
        if (fee > best) {
            best = fee;
        }
    }
    return best;
}

int parking_free_count(const int hours[], int n) {
    int count = 0;
    for (int i = 0; i < n; i++) {
        if (hours[i] <= 0) {
            count++;
        }
    }
    return count;
}
```

### 把函数定义搬进头文件 [CE]
`main.c` 和 `parking.c` 都包含了 `parking.h`，于是两个目标文件里各有一份函数实体，链接器报"重复定义"（`duplicate symbol`）。这与题目最初那个"未定义"的错误方向正好相反：一个是少了一份，一个是多了一份。
```c file=parking.h expect=CE
#ifndef PARKING_H
#define PARKING_H

int parking_fee(int hours) { return 15 + 3 * (hours - 3); }
int parking_total(const int hours[], int n) { (void)hours; (void)n; return 0; }
int parking_max(const int hours[], int n) { (void)hours; (void)n; return 0; }
int parking_free_count(const int hours[], int n) { (void)hours; (void)n; return 0; }

#endif
```
```c file=parking.c
#include "parking.h"
```

### 以为 undefined 是编译错误，只在 parking.c 里补一个声明 [CE]
`undefined symbol` 说的是"**没有定义**"，再补十遍声明也没用。声明只让编译通过，链接器要的是函数体。这个错误版本里 `parking_total` 只有声明：
```c file=parking.c expect=CE
#include "parking.h"

int parking_total(const int hours[], int n);     /* 错：又声明了一次，仍然没有函数体 */

int parking_fee(int hours) {
    if (hours <= 0) {
        return 0;
    }
    if (hours <= 3) {
        return 5 * hours;
    }
    int fee = 15 + 3 * (hours - 3);
    return fee > 40 ? 40 : fee;
}

int parking_max(const int hours[], int n) {
    int best = 0;
    for (int i = 0; i < n; i++) {
        int fee = parking_fee(hours[i]);
        if (fee > best) {
            best = fee;
        }
    }
    return best;
}

int parking_free_count(const int hours[], int n) {
    int count = 0;
    for (int i = 0; i < n; i++) {
        if (hours[i] <= 0) {
            count++;
        }
    }
    return count;
}
```

### 把"不足 1 小时"当成 1 小时收费 [WA]
`0` 小时的规则是免费。如果实现成 `if (hours <= 0) { hours = 1; }`，免费车会被收 5 元，`free` 也会算成 0，示例 2 立刻暴露。
```c file=parking.c expect=WA
#include "parking.h"

int parking_fee(int hours) {
    if (hours <= 0) {
        hours = 1;                      /* 错：0 小时应该免费 */
    }
    if (hours <= 3) {
        return 5 * hours;
    }
    int fee = 15 + 3 * (hours - 3);
    return fee > 40 ? 40 : fee;
}

int parking_total(const int hours[], int n) {
    int sum = 0;
    for (int i = 0; i < n; i++) {
        sum += parking_fee(hours[i]);
    }
    return sum;
}

int parking_max(const int hours[], int n) {
    int best = 0;
    for (int i = 0; i < n; i++) {
        int fee = parking_fee(hours[i]);
        if (fee > best) {
            best = fee;
        }
    }
    return best;
}

int parking_free_count(const int hours[], int n) {
    int count = 0;
    for (int i = 0; i < n; i++) {
        if (hours[i] <= 0) {
            count++;
        }
    }
    return count;
}
```

## 测试用例
### 01 sample 示例 1
```in
3
1 4 12
```
```out
total=63
max=40
free=0
```

### 02 sample 示例 2
```in
2
0 0
```
```out
total=0
max=0
free=2
```

### 03 boundary 最长停放 48 小时，封顶生效
```in
1
48
```
```out
total=40
max=40
free=0
```

### 04 boundary 恰好 3 小时，处在阶梯的边界上
```in
1
3
```
```out
total=15
max=15
free=0
```

### 05 boundary 恰好 4 小时，刚跨到第二档
```in
1
4
```
```out
total=18
max=18
free=0
```

### 06 degenerate 只有一辆车且不足 1 小时
```in
1
0
```
```out
total=0
max=0
free=1
```

### 07 trap 封顶的临界点：11 小时 39 元、12 小时 40 元
```in
2
11 12
```
```out
total=79
max=40
free=0
```

### 08 trap 小时数为负，属于非法输入
```in
2
5 -1
```
```out
error
```

### 09 normal 一天里各种停放时长都有
```in
6
0 1 2 3 4 24
```
```out
total=88
max=40
free=1
```

### 10 trap 小时数超过 48
```in
1
49
```
```out
error
```

### 生成 boundary 最大规模与随机数据
```js gen
const cases = [];

/* 计费规则用 JS 独立实现一遍，绝不复用 C 代码的逻辑 */
function fee(hours) {
  if (hours <= 0) return 0;
  let f = hours <= 3 ? 5 * hours : 15 + 3 * (hours - 3);
  if (f > 40) f = 40;
  return f;
}
function report(list) {
  let total = 0;
  let max = 0;
  let free = 0;
  for (const h of list) {
    const f = fee(h);
    total += f;
    if (f > max) max = f;
    if (h <= 0) free++;
  }
  return `total=${total}\nmax=${max}\nfree=${free}\n`;
}

/* 最大规模：500 辆全停 48 小时，单日总额顶到 500 * 40 = 20000 */
const busy = new Array(500).fill(48);
cases.push({
  kind: 'boundary',
  category: '最大规模：500 辆车全部停满 48 小时',
  input: `500\n${busy.join(' ')}\n`,
  output: report(busy),
});

/* 随机：500 辆车，小时数 0..48，其中一部分是 0（免费） */
const mixed = [];
for (let i = 0; i < 500; i++) {
  mixed.push(rng.int(0, 48));
}
cases.push({
  kind: 'normal',
  category: '500 辆随机停放时长的车辆',
  input: `500\n${mixed.join(' ')}\n`,
  output: report(mixed),
});

/* 全部免费：500 辆都是 0 小时，考验 free 与 max 的初值 */
const allFree = new Array(500).fill(0);
cases.push({
  kind: 'degenerate',
  category: '500 辆车全部不足 1 小时',
  input: `500\n${allFree.join(' ')}\n`,
  output: report(allFree),
});

return cases;
```
