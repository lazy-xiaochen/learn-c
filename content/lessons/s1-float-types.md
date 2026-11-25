---
id: s1-float-types
---

## 讲解

### 两种常用的浮点类型
带小数的数用**浮点类型**存放：

| 类型 | 大小 | 有效数字（十进制） | 大致范围 | printf | scanf |
|---|---|---|---|---|---|
| `float` | 4 字节 | 约 6~7 位 | ±3.4×10³⁸ | `%f` | `%f` |
| `double` | 8 字节 | 约 15~16 位 | ±1.8×10³⁰⁸ | `%f` | **`%lf`** |

除非有特别的理由（比如要存几百万个数、内存很紧张），**一律用 `double`**。

注意 `scanf` 读 `double` 必须用 `%lf`，而 `printf` 输出 `double` 用 `%f` 就可以（这两者不对称的原因会在 printf/scanf 两节解释）。

```c run id=basic stdin="3.5"
#include <stdio.h>

int main(void) {
    double r;
    if (scanf("%lf", &r) != 1) return 1;
    double area = 3.14159265358979 * r * r;
    printf("%f\n", area);       /* 默认保留 6 位小数 */
    printf("%.2f\n", area);     /* 保留 2 位小数（四舍五入） */
    printf("%e\n", area);       /* 科学计数法 */
    return 0;
}
```
```output
38.484510
38.48
3.848451e+01
```

### 浮点数是近似值
计算机用二进制存储浮点数。就像 1/3 无法用有限位十进制小数精确表示一样，0.1 也无法用有限位二进制小数精确表示。于是：

```c run id=approx
#include <stdio.h>

int main(void) {
    double a = 0.1 + 0.2;
    printf("%.17f\n", a);
    printf("0.1 + 0.2 == 0.3 ? %d\n", a == 0.3);
    return 0;
}
```
```output
0.30000000000000004
0.1 + 0.2 == 0.3 ? 0
```

所以**不要用 `==` 比较两个计算出来的浮点数**。正确的做法是判断它们的差是否足够小：

```c run id=eps
#include <stdio.h>
#include <math.h>

int main(void) {
    double a = 0.1 + 0.2;
    double eps = 1e-9;
    if (fabs(a - 0.3) < eps) {      /* fabs 是浮点数的绝对值，在 <math.h> 中 */
        printf("相等（在误差范围内）\n");
    }
    return 0;
}
```
```output
相等（在误差范围内）
```

### float 的精度很有限
`float` 只有 24 位二进制有效数字，超过 2²⁴ = 16777216 的整数就不能都精确表示了：

```c run id=float-precision warnings=allow
#include <stdio.h>

int main(void) {
    float  f = 16777217;     /* 2^24 + 1 */
    double d = 16777217;
    printf("float : %.1f\n", f);
    printf("double: %.1f\n", d);
    return 0;
}
```
```output
float : 16777216.0
double: 16777217.0
```

运行时注意看编译信息：编译器已经发出警告 `implicit conversion from 'int' to 'float' changes value from 16777217 to 16777216`。**认真阅读警告**，它常常直接告诉你 bug 在哪里。

### 整数除法的陷阱
两个**整数**相除，结果还是整数（小数部分直接丢弃）。只要有一个操作数是浮点数，就会按浮点数计算：

```c run id=int-div
#include <stdio.h>

int main(void) {
    printf("%d\n", 7 / 2);         /* 整数除法：3 */
    printf("%f\n", 7 / 2.0);       /* 浮点除法：3.500000 */
    printf("%f\n", (double)7 / 2); /* 先转换再除：3.500000 */
    double x = 7 / 2;              /* 注意：先按整数算出 3，再转成 3.0 */
    printf("%f\n", x);
    return 0;
}
```
```output
3
3.500000
3.500000
3.000000
```

最后一行是最常见的错误：**把结果存进 double 变量，并不会让右边的整数除法变成浮点除法**。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra float.c -o float -lm   # Linux 上使用 <math.h> 的函数时要加 -lm 链接数学库
./float
```

Windows（MinGW）和 macOS 上数学函数在标准 C 库里，不加 `-lm` 也可以；在 Linux 上不加 `-lm` 可能会报 `undefined reference to 'sqrt'`（这是一个**链接**错误）。

## 常见错误

### 用 %d 输出 double，或用 %f 读入 double
`printf("%d", 3.5)` 和 `scanf("%f", &d)`（d 是 double）都是格式说明符与类型不匹配，结果不可预料。`-Wall` 会给出警告：

```c run id=bad-scanf warnings=allow stdin="2.5"
#include <stdio.h>

int main(void) {
    double d = 0;
    if (scanf("%f", &d) != 1) return 1;   /* 错误：double 应当用 %lf */
    printf("%f\n", d);
    return 0;
}
```
```output
0.000000
```

（`%f` 把 2.5 按 4 字节的 float 写进了 8 字节的 double 的一部分，所以读出来的 d 是个错误的值。这里显示的结果和具体平台有关。）

### 以为结果变量是 double，除法就是浮点除法
`double avg = sum / n;` 中如果 `sum` 和 `n` 都是 `int`，先进行的是整数除法。写成 `(double)sum / n` 或者 `sum * 1.0 / n`。

### 用 == 比较浮点数
`if (x == 0.3)` 几乎总是不可靠的，改为 `if (fabs(x - 0.3) < 1e-9)`。

## 客观题

### q-s1-float-types-1 single
下面代码的输出是什么？
```c
int a = 5, b = 2;
double x = a / b;
double y = (double)a / b;
printf("%.1f %.1f\n", x, y);
```
- [ ] `2.5 2.5`
  > `a / b` 的两个操作数都是 int，先做整数除法得到 2，然后才转换成 2.0 存进 x。
- [x] `2.0 2.5`
  > 正确。x 来自整数除法 5 / 2 = 2；y 中 `(double)a` 先把 a 转成 5.0，于是做的是浮点除法 5.0 / 2 = 2.5。
- [ ] `2.0 2.0`
  > `(double)a / b` 中强制转换的优先级高于除法，先转换后除，得到 2.5。
- [ ] 编译错误：不能把 int 赋给 double
  > int 可以隐式转换为 double，这是合法的赋值。
