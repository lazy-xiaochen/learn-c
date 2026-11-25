---
id: s5-ub-signed-overflow
---

## 讲解

### int 能表示的范围是有限的
`int` 通常是 4 字节、32 位，取值从 `-2147483648` 到 `2147483647`。这个范围写在 `<limits.h>` 里：

| 类型 | 典型大小 | 最小值 | 最大值 |
|---|---|---|---|
| `int` | 4 字节 | `INT_MIN` = -2147483648 | `INT_MAX` = 2147483647 |
| `unsigned` | 4 字节 | 0 | `UINT_MAX` = 4294967295 |
| `long long` | 8 字节 | `LLONG_MIN` ≈ -9.22×10¹⁸ | `LLONG_MAX` ≈ 9.22×10¹⁸ |

"再大一点"这件事在数学里随便做，在 C 里却分两种完全不同的情况：**无符号**溢出是标准明确定义的"模运算回绕"，**有符号**溢出是未定义行为。这是本知识点唯一的重点，也是初学者最容易忽略的一条：

```c run id=ov-unsigned
#include <stdio.h>
#include <limits.h>

int main(void) {
    unsigned u = UINT_MAX;
    u = u + 1;                          /* 无符号：定义良好的回绕，结果是 0 */
    printf("u = %u\n", u);

    int x = INT_MAX;
    long long wide = (long long)x + 1;  /* 先转成更宽的类型再算，不会溢出 */
    printf("wide = %lld\n", wide);
    return 0;
}
```
```output
u = 0
wide = 2147483648
```

`unsigned` 的 `UINT_MAX + 1` 得到 `0` 是**标准保证**的（C17 6.2.5：无符号运算按 2ⁿ 取模）；把它换成 `int`，同样的加法就是 UB。所以"用无符号就不会出问题"这种说法只在"允许回绕"的场景成立——用无符号做金额、做下标，回绕反而会变成更大的数字，一样是 bug。

### 有符号溢出是 UB，UBSan 会当场拦下
```c run id=ov-ubsan expect=UB
#include <stdio.h>
#include <limits.h>

int main(void) {
    int x = INT_MAX;
    x = x + 1;                          /* UB：有符号整数溢出 */
    printf("x = %d\n", x);
    return 0;
}
```

UBSan 的报错会精确到"哪个运算、哪两个操作数"：`signed integer overflow: 2147483647 + 1 cannot be represented in type 'int'`。注意它拦的是**运算**，不是"结果看起来不对"——在 UBSan 眼里这一行根本不允许执行，所以程序在打印之前就终止了。

### -O0 与 -O2：溢出检测函数被优化成常量
很多教程教你这样判断溢出：

```c
static int overflows(int x) {
    return x + 1 < x;      /* 如果加了 1 反而变小，说明溢出了 */
}
```

这个推理依赖"加 1 之后会回绕成很小的负数"，而在标准眼里 `x + 1` 溢出是 UB、不可能发生。`-O0` 会老老实实做加法再比较：

```c run id=ov-check-o0 opt=-O0 sanitize=off
#include <stdio.h>
#include <limits.h>

static int overflows(int x) {
    return x + 1 < x;                   /* 靠"回绕后变小"来判断溢出 */
}

int main(void) {
    printf("overflows(INT_MAX) = %d\n", overflows(INT_MAX));
    return 0;
}
```
```output
overflows(INT_MAX) = 1
```

`-O2` 下编译器先套用"`x + 1` 不会溢出"这个前提：既然不会溢出，`x + 1` 就一定大于 `x`，于是 `x + 1 < x` 恒为假，整个函数被折叠成 `return 0`：

```c run id=ov-check-o2 opt=-O2 sanitize=off
#include <stdio.h>
#include <limits.h>

static int overflows(int x) {
    return x + 1 < x;                   /* 靠"回绕后变小"来判断溢出 */
}

int main(void) {
    printf("overflows(INT_MAX) = %d\n", overflows(INT_MAX));
    return 0;
}
```
```output
overflows(INT_MAX) = 0
```

同一份代码、同一个输入，`-O0` 说"溢出了"，`-O2` 说"没溢出"。这不是优化器的 bug：`x + 1 < x` 这个表达式在 `x = INT_MAX` 时本身就触发了 UB，编译器有权按"UB 不发生"来化简。**结论：任何"先算出结果、再看结果对不对"的溢出检测方法都不可靠**，必须在做运算之前判断。

### 溢出前检查的三种正确写法
第一种，**先判断再做**，用 `INT_MAX - b` 和 `INT_MIN - b` 这两个"安全的上界/下界"：

```c
if (b > 0 && a > INT_MAX - b) return 0;   /* a + b 一定超过 INT_MAX */
if (b < 0 && a < INT_MIN - b) return 0;   /* a + b 一定小于 INT_MIN */
*out = a + b;                             /* 到这里 a + b 一定不溢出 */
```

`INT_MAX - b` 在 `b > 0` 时不会溢出，`INT_MIN - b` 在 `b < 0` 时也不会溢出，所以这两个比较本身是安全的。

第二种，**换成更宽的类型算**：把 `int` 转成 `long long`，`long long` 装得下任何两个 `int` 的和，算完再判断是否超出 `int` 的范围。第三种，用编译器内建的 `__builtin_add_overflow(a, b, &sum)`，它返回"是否溢出"且不会触发 UB（GCC / Clang 都支持）。

第一种写法的完整版本，覆盖正溢出、负溢出和恰好落在边界上的情况：

```c run id=ov-safe
#include <stdio.h>
#include <limits.h>

static int add_checked(int a, int b, int *out) {
    if (b > 0 && a > INT_MAX - b) {
        return 0;                       /* 正溢出 */
    }
    if (b < 0 && a < INT_MIN - b) {
        return 0;                       /* 负溢出 */
    }
    *out = a + b;                       /* 走到这里加法一定安全 */
    return 1;
}

int main(void) {
    int cases[6][2] = {
        { 1, 2 },
        { INT_MAX, 0 },
        { INT_MAX, 1 },
        { INT_MIN, -1 },
        { INT_MIN, 1 },
        { -5, 3 },
    };
    for (int k = 0; k < 6; k++) {
        int sum = 0;
        if (add_checked(cases[k][0], cases[k][1], &sum)) {
            printf("%d + %d = %d\n", cases[k][0], cases[k][1], sum);
        } else {
            printf("%d + %d = 溢出\n", cases[k][0], cases[k][1]);
        }
    }
    return 0;
}
```
```output
1 + 2 = 3
2147483647 + 0 = 2147483647
2147483647 + 1 = 溢出
-2147483648 + -1 = 溢出
-2147483648 + 1 = -2147483647
-5 + 3 = -2
```

注意后两组：`INT_MIN + 1` 和 `INT_MIN + (-1)` 看起来只差一个符号，但前者合法、后者溢出。**负溢出的判断方向和正溢出相反**，这也是下面"常见错误"里最常漏的一条。

### 溢出最喜欢藏在哪里
真实代码里的溢出很少写成 `INT_MAX + 1`，它们藏在这样的地方：

- **累加**：`int sum = 0; for (...) sum += a[i];`，当 `a[i]` 很大、元素很多时溢出。判题里常见的输入规模（10⁵ 个 10⁹）已经超过 `int`；
- **二分查找的中点**：`int mid = (lo + hi) / 2;`，`lo + hi` 可能超过 `INT_MAX`；正确写法是 `lo + (hi - lo) / 2`；
- **阶乘与幂**：`int fact = 1; for (i = 2; i <= n; i++) fact *= i;`，`n = 13` 就溢出；
- **取负**：`int b = -a;`，当 `a == INT_MIN` 时 `-a` 无法表示，是 UB；
- **求绝对值**：`abs(INT_MIN)` 同样是 UB（结果无法用 `int` 表示）；
- **大小计算**：`n * sizeof(int)` 如果 `n` 是 `int`，乘法可能溢出后再转成 `size_t`，得到一块"很小"的内存。

## 编译与运行

按"零警告 + UBSan"编译，溢出会被精确指出：

```bash
gcc -std=c17 -Wall -Wextra -fsanitize=undefined -fno-sanitize-recover=all ov.c -o ov
./ov
```

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=undefined -fno-sanitize-recover=all ov.c -o ov
./ov
```

如果只想检查有符号溢出这一项，可以单独开：

```bash
clang -std=c17 -Wall -Wextra -fsanitize=signed-integer-overflow -fno-sanitize-recover=all ov.c -o ov
```

两个优化级别对照，专门用来看"检测代码有没有被优化掉"：

```bash
clang -std=c17 -O0 ov.c -o ov0 && ./ov0
clang -std=c17 -O2 ov.c -o ov2 && ./ov2
```

两个 GCC / Clang 的扩展选项值得知道，但**不要用它们来"修好"代码**：

- `-fwrapv`：让有符号溢出按补码回绕（把 UB 变成有定义的行为），适合维护老代码；
- `-ftrapv`：在溢出时插入陷阱、让程序崩溃，适合调试。

本平台的判定：UBSan 报 `signed integer overflow` 判 `UB`；如果溢出持续影响输出，通常表现为 `WA`。`-O2` 把检测代码优化成常量之后，可能连 `UB` 都不报，最后得到一个"看起来正常"的错误答案——那才是最坏的情况。

## 常见错误

### 先相加再判断是否溢出
`if (a + b < a)` 这类写法的问题在于：`a + b` 这一行本身已经是 UB，什么结果都可能。正确顺序永远是"先比较、后运算"。

```c
int a = INT_MAX, b = 1;
if (a + b < a) {          /* 错：a + b 已经溢出，这一行本身是 UB */
    puts("overflow");
}
```

### 只判断正溢出，漏掉负溢出
`if (a > 0 && b > 0 && a > INT_MAX - b)` 只覆盖"两个正数相加"。两个负数相加同样可能溢出：`INT_MIN + (-1)` 就超出了下界。两边的判断方向是相反的——正溢出看 `INT_MAX - b`，负溢出看 `INT_MIN - b`。

```c
static int add_overflow(int a, int b) {
    if (a > 0 && b > 0 && a > INT_MAX - b) {
        return 1;         /* 只覆盖同正的情况 */
    }
    return 0;             /* 错：负数相加溢出会漏掉 */
}
```

### 对 `INT_MIN` 取负或者取绝对值
`-INT_MIN` 的结果 `2147483648` 无法用 `int` 表示，所以 `int b = -a;`（`a == INT_MIN`）是 UB；`abs(INT_MIN)` 同理。需要处理这种情况时，先把值转成 `long long` 再取负。

```c
int a = INT_MIN;
int b = -a;               /* UB：-INT_MIN 无法表示 */
```

### 二分中点写成 `(lo + hi) / 2`
`lo` 和 `hi` 都接近 `INT_MAX` 时，`lo + hi` 先溢出。应该写成 `lo + (hi - lo) / 2`，或者用 `lo + (hi - lo) / 2` 的等价形式 `(lo & hi) + ((lo ^ hi) >> 1)`。

```c
int mid = (lo + hi) / 2;          /* 错：lo + hi 可能溢出 */
int mid = lo + (hi - lo) / 2;     /* 对：差值不会超过范围 */
```

## 客观题

### q-s5-ub-signed-overflow-1 single
下面关于整数溢出的说法，哪一个是正确的？

- [x] `int` 的 `INT_MAX + 1` 是未定义行为，`unsigned` 的 `UINT_MAX + 1` 是标准保证的回绕得到 0；因此"先算结果、再看结果是否变小"的溢出检测不可靠
  > 正确。C17 6.2.5 规定无符号运算按 2ⁿ 取模，所以 `UINT_MAX + 1 == 0` 有保证；有符号溢出则没有任何保证，`-O2` 可以按"溢出不会发生"把 `x + 1 < x` 直接折叠成假。可靠的写法只有"运算前判断"（`b > 0 && a > INT_MAX - b`）或"用更宽的类型算"。
- [ ] 有符号整数溢出会让程序崩溃，所以只要程序没崩就说明没有溢出
  > 错。有符号溢出最常见的表现恰恰是"不崩"：结果回绕成一个合法但错误的值，或者在 `-O2` 下被优化成完全不同的代码。崩溃只是众多可能之一，而且是最少见的一种；判题器之所以能标出 `UB`，是因为 UBSan 专门插了检查，不是因为溢出本身会崩。
- [ ] 用 `unsigned` 就不会有溢出问题，所以下标、金额都应该用 `unsigned`
  > 错。无符号只是把"UB"换成了"定义良好的回绕"：`UINT_MAX + 1` 变成 0，`0 - 1` 变成 `4294967295`。对金额和下标来说，回绕同样会产生错误结果，只是行为可预测、能被测试发现。真正安全的做法是判断范围或换更宽的类型。
- [ ] `-fwrapv` 可以让有符号溢出变成定义良好的回绕，所以加上它就不必再写溢出检查了
  > 错。`-fwrapv` 是 GCC/Clang 的扩展，作用是把 UB 变成"补码回绕"，让老代码不至于因为优化而改变行为。但回绕后的值依然是错的：`INT_MAX + 1` 变成 `INT_MIN`，业务上仍然是溢出。它降低的是"不可预测性"，不是"错误"。
