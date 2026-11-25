---json
{
  "id": "p-s4-struct-param-2",
  "title": "按接口实现复数库：六个结构体操作函数",
  "difficulty": "L3",
  "knowledgePoints": ["s4-struct-param"],
  "special": "ds-implementation",
  "judge": { "mode": "function", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个图形模块需要一组**复数**运算。复数用结构体表示，实部和虚部都是 `long long`：

```c
typedef struct {
    long long re;
    long long im;
} Cplx;
```

请实现 `cplx.h` 里声明的六个函数，接口一个字都不能改：

| 函数 | 要求 |
|---|---|
| `Cplx cplx_make(long long re, long long im);` | 用两个分量构造一个复数 |
| `Cplx cplx_add(Cplx a, Cplx b);` | 分量相加：`(a.re+b.re, a.im+b.im)` |
| `Cplx cplx_mul(Cplx a, Cplx b);` | 复数乘法：`(a.re*b.re - a.im*b.im, a.re*b.im + a.im*b.re)` |
| `long long cplx_norm2(Cplx a);` | 模的平方：`a.re*a.re + a.im*a.im`（不取平方根） |
| `int cplx_eq(Cplx a, Cplx b);` | 两个分量都相等返回 `1`，否则返回 `0` |
| `void cplx_scale(Cplx *p, long long k);` | **通过指针原地**把两个分量都乘以 `k` |

注意最后一个是 `void` 且接收指针：它必须修改 `*p` 指向的那个复数，返回一个新的没用。

评测时你的 `cplx.c` 会和一个**隐藏的测试驱动**一起编译：驱动从标准输入读一串操作，调用你实现的函数，把结果打印出来。

## 输入格式
第一行一个整数 `n`：操作的个数。
接下来 `n` 行，每行是一条操作，格式如下（`a`、`b`、`k` 都是十进制整数）：

```
make a b     把当前复数设为 a + bi
add a b      当前复数 += (a + bi)
mul a b      当前复数 *= (a + bi)
scale k      当前复数 *= k（调用 cplx_scale，原地修改）
norm         打印 "norm2=<当前复数的模的平方>"
eq a b       打印 "eq=<当前复数是否等于 a + bi>"
```

当前复数的初值是 `0 + 0i`。**所有操作结束后**，驱动还会打印一行 `final=<re> <im>`。

## 输出格式
按操作出现的顺序输出：

- `norm` → `norm2=<值>`
- `eq` → `eq=<1 或 0>`
- 最后一行固定是 `final=<re> <im>`

## 数据范围
- `1 ≤ n ≤ 1000`
- `-10^6 ≤ a, b ≤ 10^6`，`-1000 ≤ k ≤ 1000`
- 输入保证**任何时刻**当前复数的实部、虚部绝对值都不超过 `10^9`，因此用 `long long` 计算不会溢出（`cplx_norm2` 的结果最大约 `2×10^18`，仍在 `long long` 范围内）。

## 示例
### 示例 1
```in
6
make 3 4
norm
mul 1 -2
norm
eq 11 2
scale -2
```
```out
norm2=25
norm2=125
eq=0
final=-22 4
```
> `make 3 4` 之后 `norm2 = 3² + 4² = 25`。乘上 `1 - 2i` 得 `(3+8) + (−6+4)i = 11 − 2i`，模的平方是 `121 + 4 = 125`，所以 `eq 11 2` 判 0（虚部符号不同）。最后 `scale -2` 把 `(11, −2)` 变成 `(−22, 4)`。

### 示例 2（边界：零复数）
```in
1
norm
```
```out
norm2=0
final=0 0
```
> 初值就是 `0 + 0i`，一次操作都不做 `make` 也算合法输入。`norm2` 必须是 `0` 而不是别的值；`final` 也一定要打印。

## 提示
### 第 1 层
复数乘法是最容易写错的一个：`(a+bi)(c+di) = (ac − bd) + (ad + bc)i`。注意 `bc` 前面是加号，而且实部里是**减**。把一个具体例子代进去验算一遍，比如 `(3+4i)(1−2i)` 应该是 `11 − 2i`。

### 第 2 层
`cplx_scale` 的形参是 `Cplx *p`，要用 `p->re`、`p->im` 改**指针指向的那个对象**。如果在函数里写 `Cplx z = *p; z.re *= k;` 然后直接返回，`main` 里的复数不会变——这又回到了"按值传递改不动调用者"。

### 第 3 层
`cplx_norm2` 和 `cplx_eq` 只需要读，不需要改，形参按值接收 `Cplx` 就够了（小结构体 16 字节，复制很便宜）。`cplx_eq` 的两个分量要**同时**相等才返回 1，别用 `a.re == b.re || a.im == b.im`。

## 参考代码
```c file=cplx.c
#include "cplx.h"

Cplx cplx_make(long long re, long long im) {
    Cplx z = { re, im };
    return z;
}

Cplx cplx_add(Cplx a, Cplx b) {
    Cplx r = { a.re + b.re, a.im + b.im };
    return r;
}

Cplx cplx_mul(Cplx a, Cplx b) {
    Cplx r = { a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re };
    return r;
}

long long cplx_norm2(Cplx a) {
    return a.re * a.re + a.im * a.im;
}

int cplx_eq(Cplx a, Cplx b) {
    return (a.re == b.re && a.im == b.im) ? 1 : 0;
}

void cplx_scale(Cplx *p, long long k) {
    p->re *= k;                 /* 通过指针改调用者的那个复数 */
    p->im *= k;
}
```

## 初始代码
```c file=cplx.c
#include "cplx.h"

Cplx cplx_make(long long re, long long im) {
    Cplx z = { re, im };
    return z;
}

Cplx cplx_add(Cplx a, Cplx b) {
    Cplx r = { a.re + b.re, a.im + b.im };
    return r;
}

Cplx cplx_mul(Cplx a, Cplx b) {
    (void)a;
    (void)b;
    return cplx_make(0, 0);     /* TODO: 实部 a.re*b.re - a.im*b.im，虚部 a.re*b.im + a.im*b.re */
}

long long cplx_norm2(Cplx a) {
    (void)a;
    return 0;                   /* TODO: a.re*a.re + a.im*a.im */
}

int cplx_eq(Cplx a, Cplx b) {
    (void)a;
    (void)b;
    return 0;                   /* TODO: 两个分量都相等才返回 1 */
}

void cplx_scale(Cplx *p, long long k) {
    (void)p;
    (void)k;                    /* TODO: p->re *= k; p->im *= k; */
}
```

## 测试驱动
下面这个头文件由题目提供，你的 `cplx.c` 只需要 `#include "cplx.h"`：

```c file=cplx.h
#ifndef CPLX_H
#define CPLX_H

/* 复数：re 为实部、im 为虚部（都用 long long 保存） */
typedef struct {
    long long re;
    long long im;
} Cplx;

Cplx cplx_make(long long re, long long im);
Cplx cplx_add(Cplx a, Cplx b);
Cplx cplx_mul(Cplx a, Cplx b);
long long cplx_norm2(Cplx a);
int cplx_eq(Cplx a, Cplx b);
void cplx_scale(Cplx *p, long long k);

#endif
```

驱动（隐藏）负责读入操作序列、调用你的函数并打印结果：

```c file=test_main.c hidden
#include <stdio.h>
#include <string.h>
#include "cplx.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        return 0;
    }
    Cplx z = cplx_make(0, 0);
    for (int i = 0; i < n; i++) {
        char op[8];
        long long a = 0;
        long long b = 0;
        if (scanf("%7s", op) != 1) {
            return 0;
        }
        if (strcmp(op, "make") == 0 || strcmp(op, "add") == 0 || strcmp(op, "mul") == 0
            || strcmp(op, "eq") == 0) {
            if (scanf("%lld %lld", &a, &b) != 2) {
                return 0;
            }
        } else if (strcmp(op, "scale") == 0) {
            if (scanf("%lld", &a) != 1) {
                return 0;
            }
        }
        if (strcmp(op, "make") == 0) {
            z = cplx_make(a, b);
        } else if (strcmp(op, "add") == 0) {
            z = cplx_add(z, cplx_make(a, b));
        } else if (strcmp(op, "mul") == 0) {
            z = cplx_mul(z, cplx_make(a, b));
        } else if (strcmp(op, "scale") == 0) {
            cplx_scale(&z, a);
        } else if (strcmp(op, "norm") == 0) {
            printf("norm2=%lld\n", cplx_norm2(z));
        } else if (strcmp(op, "eq") == 0) {
            printf("eq=%d\n", cplx_eq(z, cplx_make(a, b)));
        } else {
            return 0;
        }
    }
    printf("final=%lld %lld\n", z.re, z.im);
    return 0;
}
```

## 复杂度
时间：每个操作 `O(1)`，总共 `O(n)`。
空间：`O(1)`，只有几个 16 字节的结构体在栈上。

## 常见错误
### cplx_scale 复制了一份再改，调用者的复数没变 [WA]
形参是 `Cplx *p`，但函数里写 `Cplx z = *p; z.re *= k;` 就改不到原对象了。结构体是按值复制的，`*p` 只是"把指针指向的内容复制出来"，复制品改完就扔了。

```c file=cplx.c expect=WA
#include "cplx.h"

Cplx cplx_make(long long re, long long im) {
    Cplx z = { re, im };
    return z;
}

Cplx cplx_add(Cplx a, Cplx b) {
    Cplx r = { a.re + b.re, a.im + b.im };
    return r;
}

Cplx cplx_mul(Cplx a, Cplx b) {
    Cplx r = { a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re };
    return r;
}

long long cplx_norm2(Cplx a) {
    return a.re * a.re + a.im * a.im;
}

int cplx_eq(Cplx a, Cplx b) {
    return (a.re == b.re && a.im == b.im) ? 1 : 0;
}

void cplx_scale(Cplx *p, long long k) {
    Cplx z = *p;            /* 错：复制了一份，改的是副本 */
    z.re *= k;
    z.im *= k;
}
```

### cplx_mul 的虚部写成 ad − bc [WA]
正确公式是 `(ac − bd) + (ad + bc)i`。把虚部写成 `a.re*b.im - a.im*b.re`，在 `b.im` 为负、或者两个虚部同号时结果会明显不对；而且这种错误在 `b = 1 + 0i`（乘以实数）时**完全看不出来**，很容易漏测。

```c file=cplx.c expect=WA
#include "cplx.h"

Cplx cplx_make(long long re, long long im) {
    Cplx z = { re, im };
    return z;
}

Cplx cplx_add(Cplx a, Cplx b) {
    Cplx r = { a.re + b.re, a.im + b.im };
    return r;
}

Cplx cplx_mul(Cplx a, Cplx b) {
    Cplx r = { a.re * b.re - a.im * b.im, a.re * b.im - a.im * b.re };   /* 错：应为加号 */
    return r;
}

long long cplx_norm2(Cplx a) {
    return a.re * a.re + a.im * a.im;
}

int cplx_eq(Cplx a, Cplx b) {
    return (a.re == b.re && a.im == b.im) ? 1 : 0;
}

void cplx_scale(Cplx *p, long long k) {
    p->re *= k;
    p->im *= k;
}
```

### cplx_eq 用 || 连接两个分量 [WA]
`a.re == b.re || a.im == b.im` 表示"任一相等就算相等"，和题目要求相反。要用 `&&`：两个分量都相等才返回 1。

```c file=cplx.c expect=WA
#include "cplx.h"

Cplx cplx_make(long long re, long long im) {
    Cplx z = { re, im };
    return z;
}

Cplx cplx_add(Cplx a, Cplx b) {
    Cplx r = { a.re + b.re, a.im + b.im };
    return r;
}

Cplx cplx_mul(Cplx a, Cplx b) {
    Cplx r = { a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re };
    return r;
}

long long cplx_norm2(Cplx a) {
    return a.re * a.re + a.im * a.im;
}

int cplx_eq(Cplx a, Cplx b) {
    return (a.re == b.re || a.im == b.im) ? 1 : 0;   /* 错：应为 && */
}

void cplx_scale(Cplx *p, long long k) {
    p->re *= k;
    p->im *= k;
}
```

### 改了函数签名去"配合"自己的实现 [CE]
比如把 `cplx_scale` 写成 `void cplx_scale(Cplx z, long long k)`，或者把 `cplx_eq` 的返回类型改成 `long long`。`cplx.h` 里的声明是评测契约，签名不一致会直接编译失败（`conflicting types`），隐藏驱动也调不到你的函数。要改就改函数体，不要改签名。

### cplx_norm2 里忘了平方 [WA]
写成 `a.re + a.im` 或者 `a.re * a.re + a.im`（漏了一个乘方）。模的平方是 `re² + im²`，两个分量都要各自平方再相加；写成 `(a.re + a.im) * (a.re + a.im)` 也不行，那是和的平方，多了交叉项。

## 测试用例
### 01 sample 示例 1
```in
6
make 3 4
norm
mul 1 -2
norm
eq 11 2
scale -2
```
```out
norm2=25
norm2=125
eq=0
final=-22 4
```

### 02 sample 示例 2
```in
1
norm
```
```out
norm2=0
final=0 0
```

### 03 boundary 百万级分量，模的平方到 4×10^12
```in
4
make 1000000 1000000
norm
mul 1 1
norm
```
```out
norm2=2000000000000
norm2=4000000000000
final=0 2000000
```

### 04 degenerate 零复数等于零复数
```in
2
make 0 0
eq 0 0
```
```out
eq=1
final=0 0
```

### 05 trap 连续乘以 i，转四次回到原点
```in
5
make 0 1
mul 0 1
mul 0 1
mul 0 1
eq 1 0
```
```out
eq=1
final=1 0
```

### 06 trap 负倍率缩放后判断相等
```in
3
make 5 -5
scale 3
eq 15 -15
```
```out
eq=1
final=15 -15
```

### 07 normal 连续累加并求模
```in
5
add 10 20
add -3 4
norm
scale 2
add 0 0
```
```out
norm2=625
final=14 48
```

### 08 boundary 乘以 0 之后一切归零
```in
3
make 7 -3
norm
scale 0
```
```out
norm2=58
final=0 0
```
