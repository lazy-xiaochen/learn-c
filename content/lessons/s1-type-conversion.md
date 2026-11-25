---
id: s1-type-conversion
---

## 讲解

### 为什么需要类型转换
CPU 只能对**相同类型**的两个数做运算。当表达式里混合了不同类型（比如 `int + double`），编译器会先按固定的规则把它们转换成同一种类型，再计算。这些规则是自动进行的，叫**隐式转换**。不了解它们，就会写出"看起来对、结果却错"的代码。

### 规则一：整型提升
比 `int` 小的类型（`char`、`short` 以及它们的 unsigned 版本）参与运算前，**一律先转换成 `int`**：

```c run id=promote
#include <stdio.h>

int main(void) {
    char a = 100, b = 100;
    int sum = a + b;          /* a、b 先提升为 int，100 + 100 = 200，不会按 char 溢出 */
    printf("%d\n", sum);
    printf("%zu\n", sizeof(a + b));   /* 表达式的类型是 int */
    return 0;
}
```
```output
200
4
```

### 规则二：寻常算术转换
两个操作数类型不同时，"较小"的那个转换成"较大"的那个，大致顺序是：

> `int` → `unsigned int` → `long long` → `unsigned long long` → `float` → `double`

所以 `int + double` 按 `double` 计算，`int * long long` 按 `long long` 计算。

**危险的一条**：`int` 和 `unsigned int` 运算时，`int` 会被转换成 `unsigned int`。负数转换成无符号数后会变成一个很大的正数：

```c run id=signed-unsigned warnings=allow
#include <stdio.h>

int main(void) {
    int a = -1;
    unsigned int b = 1;
    if (a < b) {
        printf("-1 < 1\n");
    } else {
        printf("-1 >= 1 ?!\n");    /* 实际走到这里：-1 被转换成 4294967295 */
    }
    printf("%u\n", (unsigned int)a);
    return 0;
}
```
```output
-1 >= 1 ?!
4294967295
```

`-Wall -Wextra` 会对这种比较给出 `comparison of integers of different signs` 警告。`sizeof` 的结果是无符号的 `size_t`，所以 `if (n < sizeof(arr))` 在 n 为负数时也会出同样的问题。

### 强制类型转换
写成 `(类型)表达式` 可以手动转换。最常见的用途是让整数除法变成浮点除法：

```c run id=cast
#include <stdio.h>

int main(void) {
    int total = 7, count = 2;
    printf("%.2f\n", (double)total / count);   /* 先把 total 转成 double，再除 */
    printf("%d %d\n", (int)3.99, (int)-3.99);    /* 浮点转整数：直接截掉小数部分（向 0） */
    printf("%d\n", 'a' + 1);                     /* 字符就是整数 */
    printf("%c\n", 'a' + 1);
    return 0;
}
```
```output
3.50
3 -3
98
b
```

注意 `(double)(total / count)` 是**先**做整数除法再转换，得到的是 3.00。

### 转换发生在"算完"之后
下面这段代码是类型转换里最经典的坑。先别看输出，自己猜一下 d 的值：

```c run id=int-div-to-double
#include <stdio.h>

int main(void) {
    double d = 7 / 2;              /* 先做整数除法得 3，再转成 3.0 存进 d */
    double e = 7 / 2.0;            /* 有一个操作数是 double，按浮点算 */
    double f = (double)7 / 2;      /* 强制转换，让除法变成浮点除法 */
    printf("%.1f %.1f %.1f\n", d, e, f);
    return 0;
}
```
```output
3.0 3.5 3.5
```

初学者看到左边写着 `double`，就以为"结果会是小数"。但 C 的计算顺序是：**先算右边的表达式 → 再转换 → 最后存进左边的变量**。`7 / 2` 的两个操作数都是 `int`，所以按整数除法算出 3，然后才把这个 3 转成 3.0 存进 d。转换发生在算完之后，救不了已经丢掉的 0.5。

想让一个除法变成浮点除法，必须在**做除法之前**就让至少一个操作数是浮点类型。`7 / 2.0`、`7.0 / 2`、`(double)7 / 2` 三种写法效果相同；而 `(double)(7 / 2)` 只是把已经算好的 3 转成 3.0，是一次无效的"抢救"。

### 赋值时的转换
把一个值赋给另一种类型的变量时，值会被转换成变量的类型：
- 浮点 → 整数：截掉小数部分；如果整数部分超出目标类型的范围，是**未定义行为**；
- 大整数 → 小的**无符号**类型：对 2ⁿ 取模（定义良好）；
- 大整数 → 小的**有符号**类型：超出范围时结果由实现决定（常见实现是截取低位）。

下面这张表把常见的转换一次性对齐，遇到"数怎么变了"的时候可以回来查：

| 转换方向 | 规则 | 例子（结果） |
|---|---|---|
| 小整数类型 → `int` | 整型提升，值不变 | `char 100 + char 100` → 200 |
| 整数 → 更宽的整数 | 值不变 | `1` 存进 `long long` → 1 |
| 浮点 → 整数 | 向 0 截断，丢掉小数 | `(int)3.9` → 3，`(int)-3.9` → -3 |
| 整数 → 浮点 | 尽量精确；有效位数不够时舍入 | `(float)16777217` → 16777216.0 |
| 窄的无符号 ← 宽整数 | 对 2ⁿ 取模，定义良好 | `(unsigned char)300` → 44 |
| 同宽的有符号 ↔ 无符号 | 二进制位不变，换一种解释 | `(unsigned int)-1` → 4294967295 |
| 宽 → 窄的有符号 | 放不下时由实现决定，不可移植 | `(char)1000` 别依赖结果 |
| 浮点 → 整数且超出范围 | 未定义行为 | `(int)1e20` 绝不能写 |

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra conv.c -o conv
gcc -std=c17 -Wall -Wextra -Wconversion conv.c -o conv   # 额外报告所有可能丢失数据的隐式转换
```

`-Wconversion` 会产生大量警告，初学阶段不必常开，但遇到"数字莫名其妙变了"的 bug 时，打开它很可能直接找到原因。

## 常见错误

### 有符号与无符号混合比较
`for (int i = 0; i < strlen(s) - 1; i++)`：当 s 是空字符串时，`strlen(s) - 1` 是无符号的 0 - 1，回绕成一个巨大的数，循环会越界。

### 强制转换的位置不对
`(double)(a / b)` 和 `(double)a / b` 结果不同，前者已经做完了整数除法。

### 用 (int)(x + 0.5) 四舍五入负数
对 -2.5，`x + 0.5` 等于 -2.0，截断得到 -2，而四舍五入（远离 0）应当是 -3。负数要用 `x - 0.5`，或者直接使用 `<math.h>` 中的 `lround` / `llround`。

### 以为强制转换会改变变量本身
`(double)total` 只是**临时**产生一个 double 值参与这一次计算，`total` 仍然是 `int`、值也没有变。所以写完 `printf("%.2f\n", (double)total / count);` 之后再写 `total / count`，拿到的还是整数除法。想让结果长久地变成浮点数，得另外声明一个 double 变量把结果存起来：`double avg = (double)total / count;`。

## 客观题

### q-s1-type-conversion-1 multiple type-reasoning
假设 `int` 为 32 位，下列表达式中，值为 **1（真）** 的有哪些？（多选）
- [ ] `-1 < 1u`
  > -1 与 unsigned int 比较时被转换成 4294967295，4294967295 < 1 为假，值是 0。
- [x] `(unsigned char)300 == 44`
  > 转换为无符号类型时对 256 取模：300 - 256 = 44，为真。
- [x] `sizeof(char) + 'a' == 98`
  > sizeof(char) 恒为 1，'a' 是 97，相加为 98，为真。
- [ ] `7 / 2 * 2.0 == 7.0`
  > 从左到右计算：7 / 2 是整数除法得 3，再乘 2.0 得 6.0，不等于 7.0。
- [x] `(int)-2.7 == -2`
  > 浮点数转整数向 0 截断，-2.7 变成 -2，为真。
