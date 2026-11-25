---
id: s1-loop-patterns
---

## 讲解

大多数循环都是下面几种"模式"之一。认出模式，就知道变量该怎么初始化、循环里该写什么。

### 模式 1：累加与计数
**累加器**初始化为 0（求积时初始化为 1），每轮加上一个值；**计数器**初始化为 0，满足条件时加 1：

```c run id=accumulate
#include <stdio.h>

int main(void) {
    long long sum = 0;     /* 累加器 */
    int count = 0;         /* 计数器 */
    for (int i = 1; i <= 100; i++) {
        if (i % 3 == 0 || i % 5 == 0) {
            sum += i;
            count++;
        }
    }
    printf("1~100 中 3 或 5 的倍数有 %d 个，和为 %lld\n", count, sum);
    return 0;
}
```
```output
1~100 中 3 或 5 的倍数有 47 个，和为 2418
```

### 模式 2：标志变量
"有没有某个元素满足条件"：先假设"没有"，找到一个就把标志改掉。

```c run id=flag stdin="4 8 15 16 23 42"
#include <stdio.h>

int main(void) {
    int x, has_odd = 0;          /* 先假设没有奇数 */
    while (scanf("%d", &x) == 1) {
        if (x % 2 != 0) {
            has_odd = 1;
        }
    }
    printf(has_odd ? "有奇数\n" : "全是偶数\n");
    return 0;
}
```
```output
有奇数
```

### 模式 3：嵌套循环
外层循环每走一步，内层循环完整地走一遍。打印二维的图形或表格时最常用：

```c run id=table
#include <stdio.h>

int main(void) {
    for (int i = 1; i <= 4; i++) {          /* 第 i 行 */
        for (int j = 1; j <= i; j++) {      /* 第 i 行有 i 列 */
            printf("%d*%d=%-3d", j, i, i * j);
        }
        printf("\n");                       /* 每行结束换行 */
    }
    return 0;
}
```
```output
1*1=1  
1*2=2  2*2=4  
1*3=3  2*3=6  3*3=9  
1*4=4  2*4=8  3*4=12 4*4=16 
```

内层循环的次数常常依赖外层的变量（这里是 `j <= i`），这正是"三角形"的来源。

### 模式 4：反复变换直到满足条件
不知道要循环几次，只知道终止条件。经典例子是**辗转相除法**求最大公约数：gcd(a, b) = gcd(b, a mod b)，直到余数为 0：

```c run id=gcd stdin="252 105"
#include <stdio.h>

int main(void) {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2 || a < 0 || b < 0) return 1;
    while (b != 0) {
        int r = a % b;
        a = b;
        b = r;
        printf("  -> (%d, %d)\n", a, b);    /* 观察每一步 */
    }
    printf("gcd = %d\n", a);
    return 0;
}
```
```output
  -> (105, 42)
  -> (42, 21)
  -> (21, 0)
gcd = 21
```

### 嵌套循环里不要修改外层的循环变量
内层需要"拆开"外层变量（比如求 i 的各位数字）时，**先复制一份**再处理：

```c
for (int i = 1; i <= n; i++) {
    int t = i;               /* 用副本 t 去拆，不要动 i */
    while (t > 0) { ... t /= 10; }
}
```

如果直接对 i 做 `i /= 10`，i 每次都会被打回很小的数，外层循环可能永远结束不了。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra patterns.c -o patterns
```

## 常见错误

### 累加器放在了循环里面初始化
`for (...) { int sum = 0; sum += x; }` 每一轮都重新清零，循环结束后 sum 也已经不存在了。累加器要在循环**之前**初始化。

### 求积的累加器初始化为 0
0 乘任何数都是 0。阶乘、连乘要从 1 开始。

### 嵌套循环中内外层用了同一个变量名
两层都用 i 时，内层把 i 改掉，外层的计数就乱了。

## 客观题

### q-s1-loop-patterns-1 single
下面代码输出几个 `*`？
```c
for (int i = 0; i < 4; i++)
    for (int j = i; j < 4; j++)
        printf("*");
```
- [ ] 16
  > 内层从 j = i 开始，不是每次都从 0 开始，所以每行的数量递减。
- [x] 10
  > 正确。i = 0 时 4 个，i = 1 时 3 个，i = 2 时 2 个，i = 3 时 1 个，共 4 + 3 + 2 + 1 = 10 个。
- [ ] 6
  > 这是 0 + 1 + 2 + 3，相当于内层写成 `j < i`。
- [ ] 4
  > 内层循环在外层的每一轮都会完整执行。
