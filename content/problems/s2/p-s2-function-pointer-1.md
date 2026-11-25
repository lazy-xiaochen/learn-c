---json
{
  "id": "p-s2-function-pointer-1",
  "title": "用函数指针实现计算器：运算符分发表",
  "difficulty": "L3",
  "knowledgePoints": ["s2-function-pointer"],
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
实现一个支持 `+ - * /` 四则运算的整数计算器。要求用**函数指针数组**做分发：四个运算各写成一个函数，把这些函数的地址放进数组，根据输入的操作符查到对应的函数再调用——而不是写一长串 `if/else if`。

每个运算都是"两个 `long long` 进、一个 `long long` 出"：

```c
long long op_add(long long a, long long b);
long long op_sub(long long a, long long b);
long long op_mul(long long a, long long b);
long long op_div(long long a, long long b);
```

它们的类型完全相同，所以可以放进同一个函数指针数组：

```c
long long (*table[4])(long long, long long) = {op_add, op_sub, op_mul, op_div};
```

几条计算规则：
- 乘法结果可能达到 `10^18`，必须用 `long long`；
- 除法是**整数除法**，向零截断：`-7 / 2` 得 `-3`，`7 / -2` 也得 `-3`；
- 除数为 0 时不计算，输出 `error`。

## 输入格式
第一行一个整数 `q`，表示表达式的个数。
接下来 `q` 行，每行形如 `a op b`：两个整数和一个运算符，用空格分隔。运算符是 `+`、`-`、`*`、`/` 之一。

## 输出格式
共 `q` 行，每行一个整数，表示表达式的值；如果除数为 0，该行输出 `error`。

## 数据范围
- 1 ≤ q ≤ 1000
- |a| ≤ 1000000000，|b| ≤ 1000000000
- 运算符只会是 `+ - * /` 之一

`a * b` 的绝对值最大可达 `10^18`，`int` 和 `long` 都装不下，必须用 `long long` 保存和计算。

## 示例
### 示例 1
```in
5
7 + 3
7 - 3
7 * 3
7 / 3
-7 / 2
```
```out
10
4
21
2
-3
```
> 前三个是普通四则运算；`7 / 3` 是整数除法得 2；`-7 / 2` 向零截断得 -3（不是向下取整的 -4）。

### 示例 2（边界：除数为 0）
```in
3
5 / 0
-5 / 0
0 / 0
```
```out
error
error
error
```
> 只要除数是 0 就输出 `error`，包括 `0 / 0`。整数除以 0 在 C 里是未定义行为，必须提前判断，不能"算出来再看"。

## 提示
### 第 1 层
先想清楚"分发"这件事：运算符决定调用哪个函数，四则运算的参数和返回类型完全一样，所以它们可以放进同一个函数指针数组。读入一行时，用 `char op` 接住运算符。

### 第 2 层
数组定义成 `long long (*table[4])(long long, long long) = {op_add, op_sub, op_mul, op_div};`，再用一个平行的字符数组 `{'+','-','*','/'}` 记录每个位置对应的运算符。遍历字符数组找到 `op` 的下标 `k`，然后 `table[k](a, b)` 就是调用。

### 第 3 层
先用 `scanf("%lld %c %lld", &a, &op, &b)` 读入（`%c` 前面有空格，会跳过空白字符）。如果 `op` 是 `/` 且 `b == 0`，直接输出 `error` 并 `continue`，**不要**去调用除法函数。注意乘法和加法都要用 `long long` 计算，`printf` 用 `%lld`。

## 参考代码
```c file=main.c
#include <stdio.h>

static long long op_add(long long a, long long b) { return a + b; }
static long long op_sub(long long a, long long b) { return a - b; }
static long long op_mul(long long a, long long b) { return a * b; }
static long long op_div(long long a, long long b) { return a / b; }

typedef long long (*binop)(long long, long long);   /* 函数指针类型 */

int main(void) {
    static const char symbols[4] = {'+', '-', '*', '/'};
    static const binop table[4] = {op_add, op_sub, op_mul, op_div};

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        long long a, b;
        char op;
        if (scanf("%lld %c %lld", &a, &op, &b) != 3) {
            return 0;
        }

        int k = -1;
        for (int j = 0; j < 4; j++) {
            if (symbols[j] == op) {     /* 找到运算符对应的下标 */
                k = j;
            }
        }
        if (k < 0 || (op == '/' && b == 0)) {
            printf("error\n");
            continue;
        }
        printf("%lld\n", table[k](a, b));   /* 通过函数指针调用 */
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        long long a, b;
        char op;
        if (scanf("%lld %c %lld", &a, &op, &b) != 3) {
            return 0;
        }

        /* TODO：写四个运算函数，用函数指针数组按 op 分发。
         * 下面只是占位输出。 */
        printf("0\n");
    }
    return 0;
}
```

## 复杂度
时间：O(q)，每个表达式只做一次查表和一次函数调用。
空间：O(1)，函数指针数组只有 4 个元素。

## 常见错误
### 用 int 计算，结果溢出 [UB]
`1000000000 * 1000000000` 等于 `10^18`，`int` 最多表示约 `2.1 × 10^9`。如果运算函数的参数或中间结果用 `int`，乘法会在 int 范围内溢出——这是未定义行为，本平台的检查工具会直接报错。四个函数一律用 `long long`。
```c file=main.c expect=UB
#include <stdio.h>

static int op_add(int a, int b) { return a + b; }
static int op_sub(int a, int b) { return a - b; }
static int op_mul(int a, int b) { return a * b; }   /* 错：int 装不下 10^18 */
static int op_div(int a, int b) { return a / b; }

typedef int (*binop)(int, int);

int main(void) {
    static const char symbols[4] = {'+', '-', '*', '/'};
    static const binop table[4] = {op_add, op_sub, op_mul, op_div};

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        int a, b;
        char op;
        if (scanf("%d %c %d", &a, &op, &b) != 3) {
            return 0;
        }
        int k = -1;
        for (int j = 0; j < 4; j++) {
            if (symbols[j] == op) {
                k = j;
            }
        }
        if (k < 0 || (op == '/' && b == 0)) {
            printf("error\n");
            continue;
        }
        printf("%d\n", table[k](a, b));
    }
    return 0;
}
```

### 先做除法，再判断除数是否为 0 [UB]
`a / b` 在 `b == 0` 时是未定义行为：不是在某个平台上"得到 0"，而是整个程序的行为都不再有保证。必须**先判断再调用**，不能先算出来再检查。
```c file=main.c expect=UB
#include <stdio.h>

static long long op_add(long long a, long long b) { return a + b; }
static long long op_sub(long long a, long long b) { return a - b; }
static long long op_mul(long long a, long long b) { return a * b; }
static long long op_div(long long a, long long b) { return a / b; }

typedef long long (*binop)(long long, long long);

int main(void) {
    static const char symbols[4] = {'+', '-', '*', '/'};
    static const binop table[4] = {op_add, op_sub, op_mul, op_div};

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        long long a, b;
        char op;
        if (scanf("%lld %c %lld", &a, &op, &b) != 3) {
            return 0;
        }
        int k = -1;
        for (int j = 0; j < 4; j++) {
            if (symbols[j] == op) {
                k = j;
            }
        }
        if (k < 0) {
            printf("error\n");
            continue;
        }
        printf("%lld\n", table[k](a, b));   /* 错：b 为 0 时已经除以 0 了 */
    }
    return 0;
}
```

### 分发表里的函数顺序与符号数组不一致 [WA]
`symbols` 和 `table` 是两个平行的数组，下标必须一一对应。如果 `table` 写成 `{add, sub, div, mul}`，那么查到的 `*` 会去执行除法。这类错误不会报错，只会让某些运算符的结果悄悄错掉——每加一个运算符都要同时改两个数组。
```c file=main.c expect=WA
#include <stdio.h>

static long long op_add(long long a, long long b) { return a + b; }
static long long op_sub(long long a, long long b) { return a - b; }
static long long op_mul(long long a, long long b) { return a * b; }
static long long op_div(long long a, long long b) { return a / b; }

typedef long long (*binop)(long long, long long);

int main(void) {
    static const char symbols[4] = {'+', '-', '*', '/'};
    /* 错：第 3、4 个函数的位置放反了 */
    static const binop table[4] = {op_add, op_sub, op_div, op_mul};

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        long long a, b;
        char op;
        if (scanf("%lld %c %lld", &a, &op, &b) != 3) {
            return 0;
        }
        int k = -1;
        for (int j = 0; j < 4; j++) {
            if (symbols[j] == op) {
                k = j;
            }
        }
        if (k < 0 || (op == '/' && b == 0)) {
            printf("error\n");
            continue;
        }
        printf("%lld\n", table[k](a, b));
    }
    return 0;
}
```

### `%c` 前少写一个空格 [WA]
`scanf` 里的 `%c` **不会跳过空白字符**。格式串写成 `"%lld%c%lld"` 时，输入 `7 + 3` 会让 `%c` 读到数字和 `+` 之间的那个空格，接着 `%lld` 去读 `+` 又失败，整个读取提前结束。`" %c"` 里的空格告诉 `scanf`"先跳过所有空白再读一个字符"。
```c file=main.c expect=WA
#include <stdio.h>

static long long op_add(long long a, long long b) { return a + b; }
static long long op_sub(long long a, long long b) { return a - b; }
static long long op_mul(long long a, long long b) { return a * b; }
static long long op_div(long long a, long long b) { return a / b; }

typedef long long (*binop)(long long, long long);

int main(void) {
    static const char symbols[4] = {'+', '-', '*', '/'};
    static const binop table[4] = {op_add, op_sub, op_mul, op_div};

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        long long a, b;
        char op;
        if (scanf("%lld%c%lld", &a, &op, &b) != 3) {   /* 错：%c 前没有空格 */
            return 0;
        }
        int k = -1;
        for (int j = 0; j < 4; j++) {
            if (symbols[j] == op) {
                k = j;
            }
        }
        if (k < 0 || (op == '/' && b == 0)) {
            printf("error\n");
            continue;
        }
        printf("%lld\n", table[k](a, b));
    }
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
5
7 + 3
7 - 3
7 * 3
7 / 3
-7 / 2
```
```out
10
4
21
2
-3
```

### 02 sample 示例 2
```in
3
5 / 0
-5 / 0
0 / 0
```
```out
error
error
error
```

### 03 boundary 乘法取到 10^18
```in
4
1000000000 * 1000000000
-1000000000 * 1000000000
1000000000 + 1000000000
-1000000000 - 1000000000
```
```out
1000000000000000000
-1000000000000000000
2000000000
-2000000000
```

### 04 degenerate 与 0 有关的运算
```in
2
0 * 123
0 / 5
```
```out
0
0
```

### 05 trap 负数的整除向零截断
```in
4
-7 / 2
7 / -2
-7 / -2
-1 / 2
```
```out
-3
-3
3
0
```

### 06 normal 一般表达式
```in
5
123456789 + 987654321
123456789 - 987654321
123456789 * 3
42 / 6
-100 + 50
```
```out
1111111110
-864197532
370370367
7
-50
```

### 07 trap 四种运算符用同一组操作数
```in
4
9 + 4
9 - 4
9 * 4
9 / 4
```
```out
13
5
36
2
```

### 生成 stress 最大规模：1000 个表达式
```js gen
const lines = [];
for (let i = 0; i < 1000; i++) {
  const a = (i % 2 === 0 ? 1 : -1) * (1000000000 - i);
  const b = 3 + (i % 97);
  const ops = ['+', '-', '*', '/'];
  const op = ops[i % 4];
  lines.push(`${a} ${op} ${b}`);
}

let input = `${lines.length}\n${lines.join('\n')}\n`;
let output = '';
for (let i = 0; i < 1000; i++) {
  const a = i % 2 === 0 ? 1000000000 - i : -(1000000000 - i);
  const b = 3 + (i % 97);
  const op = ['+', '-', '*', '/'][i % 4];
  let r;
  if (op === '+') r = a + b;
  else if (op === '-') r = a - b;
  else if (op === '*') r = a * b;
  else r = Math.trunc(a / b);   /* C 的整数除法向零截断 */
  output += `${r}\n`;
}
return [{ kind: 'stress', category: '最大规模：1000 个表达式', input, output }];
```
