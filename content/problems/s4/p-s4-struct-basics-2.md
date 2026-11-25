---json
{
  "id": "p-s4-struct-basics-2",
  "title": "复数结构体：和、差与积的格式化输出",
  "difficulty": "L2",
  "knowledgePoints": ["s4-struct-basics"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
复数可以写成 `a + bi` 的形式，其中 `a` 是实部、`b` 是虚部，`i` 是虚数单位（`i² = -1`）。请定义一个结构体保存复数：

```c
struct Complex {
    int re;    /* 实部 */
    int im;    /* 虚部 */
};
```

读入两个复数 `z1 = a + bi`、`z2 = c + di`，计算并输出：

- `sum = z1 + z2`；
- `diff = z1 - z2`；
- `prod = z1 × z2`。

复数运算公式（应当自己实现，不要依赖任何库）：

- 加法：`(a + c) + (b + d)i`
- 减法：`(a - c) + (b - d)i`
- 乘法：`(a × c - b × d) + (a × d + b × c)i`

输出格式有一个容易踩的点：虚部为**负数**时，不要把符号输出成 `+-`，而要输出成 `4-6i` 这样的自然形式；虚部为 0 时按非负处理，输出 `+0i`。

## 输入格式
一行四个整数 `a b c d`，用空格分隔，依次是 `z1` 的实部、虚部，`z2` 的实部、虚部。

## 输出格式
输出三行，依次为和、差、积：

```
sum=<实部><符号><虚部绝对值>i
diff=<实部><符号><虚部绝对值>i
prod=<实部><符号><虚部绝对值>i
```

例如 `sum=4+6i`、`diff=-2-2i`、`prod=-5+10i`。

## 数据范围
-100 ≤ a, b, c, d ≤ 100

实部和虚部的绝对值最大为 200；乘积的每个分量最大为 100 × 100 + 100 × 100 = 20000，`int` 足够。

## 示例
### 示例 1
```in
1 2 3 4
```
```out
sum=4+6i
diff=-2-2i
prod=-5+10i
```
> `z1 = 1 + 2i`，`z2 = 3 + 4i`。和是 `(1+3) + (2+4)i = 4 + 6i`；差是 `(1-3) + (2-4)i = -2 - 2i`；积是 `(1×3 - 2×4) + (1×4 + 2×3)i = -5 + 10i`。注意 `diff` 的虚部是负数，输出 `-2i` 而不是 `+-2i`。

### 示例 2（边界：两个零复数）
```in
0 0 0 0
```
```out
sum=0+0i
diff=0+0i
prod=0+0i
```
> `0 + 0i` 的实部和虚部都是 0。虚部 0 按"非负"处理，所以输出 `+0i`，而不是 `-0i`。不要用 `im > 0` 做正负判断，否则 0 会走进负数分支。

## 提示
### 第 1 层
先写一个 `print_complex(const char *name, struct Complex z)` 函数，把"名字、实部、虚部、符号"这四件事集中在一处处理。三个运算各算各的，最后都调用它输出。

### 第 2 层
符号判断用 `z.im >= 0` 输出 `+`，否则直接让 `printf` 输出负号。要输出虚部的绝对值时不能直接 `-z.im` 吗？可以，因为此时 `z.im < 0`，`-z.im` 一定为正；但更简单的写法是 `printf("%d%di", z.re, z.im)`，让 `%d` 自己带出负号，只在非负时额外打印一个 `+`。

### 第 3 层
乘法的实部是 `a * c - b * d`，虚部是 `a * d + b * c`，两个符号都不能记反。建议先用四个临时变量算好，再构造结果结构体，避免在 `printf` 的参数里写长表达式时看错括号。

## 参考代码
```c file=main.c
#include <stdio.h>

struct Complex {
    int re;
    int im;
};

static void print_complex(const char *name, struct Complex z) {
    if (z.im >= 0) {
        printf("%s=%d+%di\n", name, z.re, z.im);
    } else {
        printf("%s=%d%di\n", name, z.re, z.im);   /* z.im 自带负号 */
    }
}

int main(void) {
    int a, b, c, d;
    if (scanf("%d %d %d %d", &a, &b, &c, &d) != 4) {
        return 0;
    }

    struct Complex z1 = { a, b };
    struct Complex z2 = { c, d };

    struct Complex sum = { z1.re + z2.re, z1.im + z2.im };
    struct Complex diff = { z1.re - z2.re, z1.im - z2.im };
    struct Complex prod = {
        z1.re * z2.re - z1.im * z2.im,
        z1.re * z2.im + z1.im * z2.re
    };

    print_complex("sum", sum);
    print_complex("diff", diff);
    print_complex("prod", prod);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

struct Complex {
    int re;
    int im;
};

int main(void) {
    int a, b, c, d;
    if (scanf("%d %d %d %d", &a, &b, &c, &d) != 4) {
        return 0;
    }

    struct Complex z1 = { a, b };
    struct Complex z2 = { c, d };

    struct Complex sum = { z1.re + z2.re, z1.im + z2.im };
    struct Complex diff = { z1.re - z2.re, z1.im - z2.im };
    /* TODO: 按 (ac - bd) + (ad + bc)i 计算乘积 */
    struct Complex prod = { z1.re * z2.re + z1.im * z2.im, z1.re * z2.im };

    printf("sum=%d+%di\n", sum.re, sum.im);
    printf("diff=%d+%di\n", diff.re, diff.im);
    printf("prod=%d+%di\n", prod.re, prod.im);
    return 0;
}
```

## 复杂度
时间 O(1)：只做常数次整数运算。
空间 O(1)：几个结构体变量。

## 常见错误
### 虚部负数时输出成了 `+-6i` [WA]
`printf("sum=%d+%di\n", z.re, z.im)` 无条件加号，遇到负虚部会得到 `4+-6i`。这不是"格式不美观"的小问题：题目要求按 `4-6i` 输出，判题会按行严格比对，直接 WA。应当只在 `im >= 0` 时打印 `+`。

```c file=main.c expect=WA
#include <stdio.h>

struct Complex {
    int re;
    int im;
};

int main(void) {
    int a, b, c, d;
    if (scanf("%d %d %d %d", &a, &b, &c, &d) != 4) {
        return 0;
    }

    struct Complex z1 = { a, b };
    struct Complex z2 = { c, d };

    struct Complex sum = { z1.re + z2.re, z1.im + z2.im };
    struct Complex diff = { z1.re - z2.re, z1.im - z2.im };
    struct Complex prod = {
        z1.re * z2.re - z1.im * z2.im,
        z1.re * z2.im + z1.im * z2.re
    };

    printf("sum=%d+%di\n", sum.re, sum.im);     /* 错：负虚部会变成 +-6i */
    printf("diff=%d+%di\n", diff.re, diff.im);
    printf("prod=%d+%di\n", prod.re, prod.im);
    return 0;
}
```

### 乘法虚部的符号写成 `ad - bc` [WA]
正确的虚部是 `a × d + b × c`。写成减法会在 `b`、`c`、`d` 符号不同的数据上得到错误答案，而全正数的测试可能碰巧通过——这类错误只有隐藏用例能抓住。

```c file=main.c expect=WA
#include <stdio.h>

struct Complex {
    int re;
    int im;
};

static void print_complex(const char *name, struct Complex z) {
    if (z.im >= 0) {
        printf("%s=%d+%di\n", name, z.re, z.im);
    } else {
        printf("%s=%d%di\n", name, z.re, z.im);
    }
}

int main(void) {
    int a, b, c, d;
    if (scanf("%d %d %d %d", &a, &b, &c, &d) != 4) {
        return 0;
    }

    struct Complex z1 = { a, b };
    struct Complex z2 = { c, d };

    struct Complex sum = { z1.re + z2.re, z1.im + z2.im };
    struct Complex diff = { z1.re - z2.re, z1.im - z2.im };
    struct Complex prod = {
        z1.re * z2.re - z1.im * z2.im,
        z1.re * z2.im - z1.im * z2.re   /* 错：应为加号 */
    };

    print_complex("sum", sum);
    print_complex("diff", diff);
    print_complex("prod", prod);
    return 0;
}
```

### 减法写成了 `z2 - z1` [WA]
`diff` 要求 `z1 - z2`，实部和虚部都要用 `z1` 减 `z2`。如果写成 `z2.re - z1.re`、`z2.im - z1.im`，结果整体取反，在 `z1` 和 `z2` 相等时碰巧是 0，其他数据都会错。

```c file=main.c expect=WA
#include <stdio.h>

struct Complex {
    int re;
    int im;
};

static void print_complex(const char *name, struct Complex z) {
    if (z.im >= 0) {
        printf("%s=%d+%di\n", name, z.re, z.im);
    } else {
        printf("%s=%d%di\n", name, z.re, z.im);
    }
}

int main(void) {
    int a, b, c, d;
    if (scanf("%d %d %d %d", &a, &b, &c, &d) != 4) {
        return 0;
    }

    struct Complex z1 = { a, b };
    struct Complex z2 = { c, d };

    struct Complex sum = { z1.re + z2.re, z1.im + z2.im };
    struct Complex diff = { z2.re - z1.re, z2.im - z1.im };   /* 错：方向反了 */
    struct Complex prod = {
        z1.re * z2.re - z1.im * z2.im,
        z1.re * z2.im + z1.im * z2.re
    };

    print_complex("sum", sum);
    print_complex("diff", diff);
    print_complex("prod", prod);
    return 0;
}
```

## 测试用例
### 01 sample 示例 1
```in
1 2 3 4
```
```out
sum=4+6i
diff=-2-2i
prod=-5+10i
```

### 02 sample 示例 2
```in
0 0 0 0
```
```out
sum=0+0i
diff=0+0i
prod=0+0i
```

### 03 degenerate 乘 1 + 0i，复数不变
```in
5 -3 1 0
```
```out
sum=6-3i
diff=4-3i
prod=5-3i
```

### 04 trap 纯虚数相乘得到实数
```in
0 1 0 1
```
```out
sum=0+2i
diff=0+0i
prod=-1+0i
```

### 05 trap 虚部为负时的符号输出
```in
1 -2 3 -4
```
```out
sum=4-6i
diff=-2+2i
prod=-5-10i
```

### 06 boundary 四个分量的最大绝对值
```in
100 100 -100 -100
```
```out
sum=0+0i
diff=200+200i
prod=0-20000i
```

### 07 normal 实部为负、虚部异号
```in
-3 4 5 -6
```
```out
sum=2-2i
diff=-8+10i
prod=9+38i
```

### 08 trap 虚部为 0 时按非负处理
```in
2 0 0 3
```
```out
sum=2+3i
diff=2-3i
prod=0+6i
```
