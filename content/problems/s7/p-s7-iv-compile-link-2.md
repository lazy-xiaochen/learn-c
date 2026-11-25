---json
{
  "id": "p-s7-iv-compile-link-2",
  "title": "修复重复符号的三文件几何模块：圆周长、面积与总面积",
  "difficulty": "L4",
  "knowledgePoints": ["s7-iv-compile-link"],
  "special": "link-diagnosis",
  "judge": { "mode": "multi", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个几何小工具由三个文件组成：

- `geo.h`：模块接口——圆周率常量、两个函数的声明；
- `geo.c`：这两个函数和圆周率常量的**定义**；
- `main.c`：读入若干半径，调用模块并打印周长、面积与总面积。

这个工程现在**链接失败**了，而且报错和"函数名写错"完全不同：

```text
ld.lld: error: duplicate symbol: GEO_PI_X1000
>>> defined at ./geo.h:7
>>>            main.o
>>> defined at ./geo.h:7
>>>            geo.o
clang: error: linker command failed with exit code 1
```

读这条报错要学会三件事：

1. **`duplicate symbol`**：链接器发现**两个目标文件都提供了同一个强符号的定义**；
2. **`defined at ./geo.h:7`**：两份定义都来自头文件——头文件被 `#include` 进两个 `.c`，于是每个 `.o` 各生成了一份；
3. **修法只有一个**：头文件里只留声明（`extern const int GEO_PI_X1000;`），把唯一的一份定义放到某个 `.c` 里。

三个文件都可以改，提交时全部参与编译。

### 和 `undefined reference` 的区别
| 报错 | 含义 | 典型原因 |
|---|---|---|
| `undefined reference` / `undefined symbol` | 少定义 | 函数只声明没定义、名字拼错、定义所在的 `.c` 没参与编译 |
| `multiple definition` / `duplicate symbol` | 多定义 | 变量/函数的定义写进了头文件、同一个 `.c` 被链接了两次 |
| `redefinition of ...` | 同一个翻译单元里出现两份定义 | 头文件没有 include guard 却被包含了两次 |

本题是第二种。判断方法：看报错里 `defined at` 的文件名——如果指向 `.h`，几乎一定是"头文件里放了定义"。

### 这个模块要做什么
- `geo_circ(r)`：返回半径为 `r` 的圆周长，公式 `2 × π × r`，**向下取整**；
- `geo_area(r)`：返回半径为 `r` 的圆面积，公式 `π × r × r`，**向下取整**；
- 圆周率用整数表示：`GEO_PI_X1000 = 3141`，代表 `π ≈ 3.141`，所有结果都要除以 1000。

## 输入格式
第一行一个整数 `n`。
第二行 `n` 个整数，依次是每个圆的半径。

## 输出格式
对每个半径输出一行：

```
r=半径 circ=周长 area=面积
```

最后再输出一行总面积：

```
total_area=所有面积之和
```

## 数据范围
1 ≤ n ≤ 1000
1 ≤ 半径 ≤ 1000
单个面积最大为 `3141 × 1000 × 1000 / 1000 = 3141000`，在 `int` 范围内；但**总面积最大约 3.14×10⁹，超过 `int`**，必须用 `long long`。
另外，`π × r × r` 的中间结果最大约 3.14×10⁹，**中间量也必须用 64 位**，否则会溢出（未定义行为）。

## 示例
### 示例 1
```in
2
1 2
```
```out
r=1 circ=6 area=3
r=2 circ=12 area=12
total_area=15
```
> 半径为 1：周长 `2×3.141×1 = 6.282` → 向下取整 6，面积 `3.141` → 3。半径为 2：周长 12，面积 12。总面积 15。初始工程在这里会直接链接失败；修好之后才是这三行。注意必须**先乘后除**：`3141 × 2 × 2 / 1000 = 12`，而 `3141 / 1000 × 2 × 2 = 12` 碰巧也对，但对 `r = 3` 就有区别了。

### 示例 2（边界：半径取最大值 1000）
```in
1
1000
```
```out
r=1000 circ=6282 area=3141000
total_area=3141000
```
> 最大半径下周长 6282、面积 3141000。`π × 1000 × 1000 = 3141000000`，这个中间结果**超过 `int` 的 2147483647**——如果乘法链里有一个 `int`，这里就会发生有符号整数溢出（UB）。必须写 `1LL * GEO_PI_X1000 * r * r`。

## 提示
### 第 1 层
先编译一次，看清报错是 `undefined reference` 还是 `duplicate symbol`。本题是后者，而且 `>>> defined at ./geo.h` 已经把"案发现场"点名了：两份定义都来自同一个头文件。链接器不知道你想要哪一份，也绝不会"随便挑一份"。

### 第 2 层
把 `geo.h` 里的 `const int GEO_PI_X1000 = 3141;` 改成 `extern const int GEO_PI_X1000;`，再在 `geo.c` 里写 `const int GEO_PI_X1000 = 3141;`。**声明可以有很多份、可以出现在任何头文件里；定义只能有一份，必须放在某个 `.c` 里。**

### 第 3 层
链接通过之后还有两个坑：

1. 中间乘积要用 `long long`：`(1LL * GEO_PI_X1000 * r * r) / 1000`，否则 `r = 1000` 时溢出（UB）；
2. 整除的顺序：必须**先乘完再除**。写成 `(GEO_PI_X1000 / 1000) * r * r` 会先把 3.141 截断成 3，所有面积都偏小；
3. 总面积用 `long long` 累加，`printf` 的格式符要跟着换成 `%lld`。

## 参考代码
```c file=geo.h
#ifndef GEO_H
#define GEO_H

#define GEO_MAX_N 1000
#define GEO_MAX_R 1000

/* 圆周率 ×1000：这里只是声明，定义在 geo.c 里，全工程只有一份 */
extern const int GEO_PI_X1000;

long long geo_circ(int r);
long long geo_area(int r);

#endif
```

```c file=geo.c
#include "geo.h"

const int GEO_PI_X1000 = 3141;      /* 全工程唯一的一份定义 */

long long geo_circ(int r) {
    return (2LL * GEO_PI_X1000 * r) / 1000;
}

long long geo_area(int r) {
    return (1LL * GEO_PI_X1000 * r * r) / 1000;
}
```

```c file=main.c
#include <stdio.h>
#include "geo.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > GEO_MAX_N) {
        return 0;
    }

    long long total = 0;
    for (int i = 0; i < n; i++) {
        int r;
        if (scanf("%d", &r) != 1 || r < 1 || r > GEO_MAX_R) {
            return 0;
        }
        long long circ = geo_circ(r);
        long long area = geo_area(r);
        printf("r=%d circ=%lld area=%lld\n", r, circ, area);
        total += area;
    }

    printf("total_area=%lld\n", total);
    return 0;
}
```

## 初始代码
```c file=geo.h
#ifndef GEO_H
#define GEO_H

#define GEO_MAX_N 1000
#define GEO_MAX_R 1000

/* TODO: 这里是"定义"还是"声明"？两个 .c 都包含它会怎样？ */
const int GEO_PI_X1000 = 3141;

long long geo_circ(int r);
long long geo_area(int r);

#endif
```

```c file=geo.c
#include "geo.h"

long long geo_circ(int r) {
    return (2LL * GEO_PI_X1000 * r) / 1000;
}

long long geo_area(int r) {
    return (1LL * GEO_PI_X1000 * r * r) / 1000;
}
```

```c file=main.c
#include <stdio.h>
#include "geo.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > GEO_MAX_N) {
        return 0;
    }

    long long total = 0;
    for (int i = 0; i < n; i++) {
        int r;
        if (scanf("%d", &r) != 1 || r < 1 || r > GEO_MAX_R) {
            return 0;
        }
        long long circ = geo_circ(r);
        long long area = geo_area(r);
        printf("r=%d circ=%lld area=%lld\n", r, circ, area);
        total += area;
    }

    printf("total_area=%lld\n", total);
    return 0;
}
```

## 复杂度
时间 O(n)：每个半径做两次常数时间的乘除。
空间 O(1)：不依赖 n 的额外空间。

## 常见错误
### 把常量的定义放回头文件 [CE]
这是本题的初始错误。`const int GEO_PI_X1000 = 3141;` 写在头文件里，`main.c` 和 `geo.c` 各包含一次，于是两个目标文件都导出 `GEO_PI_X1000`，链接器报 `duplicate symbol`。如果 `geo.c` 里还保留着定义，那么错误会**更早**在编译期爆发——同一个翻译单元里出现两份定义，报 `redefinition of 'GEO_PI_X1000'`。

**记住这条规则：头文件里只放声明。** 变量用 `extern const int x;`，宏用 `#define`，函数只放原型。

```c file=geo.h expect=CE
#ifndef GEO_H
#define GEO_H

#define GEO_MAX_N 1000
#define GEO_MAX_R 1000

/* 错：定义写进了头文件，每个包含它的 .c 都会定义一份 */
const int GEO_PI_X1000 = 3141;

long long geo_circ(int r);
long long geo_area(int r);

#endif
```

### 在 main.c 里又写了一遍函数定义 [CE]
"反正要用，顺手在 main.c 里再写一个"——`geo.c` 和 `main.c` 都定义了 `geo_circ`，链接器报 `duplicate symbol: geo_circ`。函数和变量一样，**全工程只能有一份外部定义**；需要复用就把声明放进头文件，把定义留在唯一的 `.c` 里。

```c file=main.c expect=CE
#include <stdio.h>
#include "geo.h"

long long geo_circ(int r) {          /* 错：geo.c 里已经定义过 */
    return (2LL * GEO_PI_X1000 * r) / 1000;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > GEO_MAX_N) {
        return 0;
    }
    long long total = 0;
    for (int i = 0; i < n; i++) {
        int r;
        if (scanf("%d", &r) != 1) {
            return 0;
        }
        long long circ = geo_circ(r);
        long long area = geo_area(r);
        printf("r=%d circ=%lld area=%lld\n", r, circ, area);
        total += area;
    }
    printf("total_area=%lld\n", total);
    return 0;
}
```

### 面积用 int 做中间乘法 [UB]
`geo_area` 的返回值是 `long long`，但 `(GEO_PI_X1000 * r * r)` 里三个操作数都是 `int`，乘法先按 `int` 算完才转换成 `long long`。`r = 1000` 时 `3141 × 1000 × 1000 = 3.141×10⁹` 超出 `int`，有符号整数溢出是未定义行为，UBSan 报 `signed integer overflow`。修法是让乘法链里至少有一个 64 位操作数：`1LL * GEO_PI_X1000 * r * r`。

```c file=geo.c expect=UB
#include "geo.h"

const int GEO_PI_X1000 = 3141;

long long geo_circ(int r) {
    return (2LL * GEO_PI_X1000 * r) / 1000;
}

long long geo_area(int r) {
    return (GEO_PI_X1000 * r * r) / 1000;   /* 错：int 乘法在 r=1000 时溢出 */
}
```

### 面积公式漏乘一个 r [WA]
面积是 `π × r × r`，写成 `π × r` 得到的是"半周长"那量级的结果。示例 1 里 `r = 1` 时两者碰巧相等（都是 3），但 `r = 2` 立刻暴露：正确 12，错误 6。**手写公式时代入 r = 1 和 r = 2 各验一遍**，能抓住大部分漏乘/多乘。

```c file=geo.c expect=WA
#include "geo.h"

const int GEO_PI_X1000 = 3141;

long long geo_circ(int r) {
    return (2LL * GEO_PI_X1000 * r) / 1000;
}

long long geo_area(int r) {
    return (1LL * GEO_PI_X1000 * r) / 1000;   /* 错：漏了一个 r */
}
```

### 先除后乘，精度被提前截断 [WA]
把 3.141 拆成 `3141 / 1000` 先算，整数除法会把小数部分丢掉，得到 3，再乘 `r × r` 就永远偏小。示例 1 的 `r = 2` 正好是 `3×4 = 12` 与正确答案巧合，但 `r = 3` 时错误答案是 27、正确答案是 28。**整数运算的顺序：能乘就先乘，最后再除。**

### total_area 用 int 累加 [WA]
单个面积最大 3141000 只占 `int` 的千分之一，但 1000 个加起来约 3.14×10⁹，超过 `int` 上限。`total` 必须是 `long long`，`printf` 用 `%lld`，否则答案在最大用例上错得离谱。

## 测试用例
### 01 sample 示例 1
```in
2
1 2
```
```out
r=1 circ=6 area=3
r=2 circ=12 area=12
total_area=15
```

### 02 sample 示例 2
```in
1
1000
```
```out
r=1000 circ=6282 area=3141000
total_area=3141000
```

### 03 degenerate 只有一个最小半径
```in
1
1
```
```out
r=1 circ=6 area=3
total_area=3
```

### 04 trap 最大值与最小值混在一起
```in
3
999 1000 1
```
```out
r=999 circ=6275 area=3134721
r=1000 circ=6282 area=3141000
r=1 circ=6 area=3
total_area=6275724
```

### 05 trap 先除后乘会在 r=3 暴露
```in
3
3 7 10
```
```out
r=3 circ=18 area=28
r=7 circ=43 area=153
r=10 circ=62 area=314
total_area=495
```

### 06 trap 两个 999
```in
2
999 999
```
```out
r=999 circ=6275 area=3134721
r=999 circ=6275 area=3134721
total_area=6269442
```

### 07 normal 五个混合半径
```in
5
3 7 10 999 500
```
```out
r=3 circ=18 area=28
r=7 circ=43 area=153
r=10 circ=62 area=314
r=999 circ=6275 area=3134721
r=500 circ=3141 area=785250
total_area=3920466
```

### 08 normal 4 个 2 的幂
```in
4
2 4 8 16
```
```out
r=2 circ=12 area=12
r=4 circ=25 area=50
r=8 circ=50 area=201
r=16 circ=100 area=804
total_area=1067
```

### 生成 boundary 1000 个最大半径
```js gen
const cases = [];

const PI = 3141;

function render(radii) {
  const lines = [];
  let total = 0;
  for (const r of radii) {
    const circ = Math.floor((2 * PI * r) / 1000);
    const area = Math.floor((PI * r * r) / 1000);
    lines.push(`r=${r} circ=${circ} area=${area}`);
    total += area;
  }
  lines.push(`total_area=${total}`);
  return lines.join('\n') + '\n';
}

/* 边界：1000 个半径全为 1000，总面积 3.141×10^9，超过 int */
const maxRadii = new Array(1000).fill(1000);
cases.push({
  kind: 'boundary',
  category: '1000 个最大半径，总面积约 3.14×10^9',
  input: `1000\n${maxRadii.join(' ')}\n`,
  output: render(maxRadii),
});

/* 压力：800 个 1…1000 的随机半径 */
const radii = [];
for (let i = 0; i < 800; i++) {
  radii.push(rng.int(1, 1000));
}
cases.push({
  kind: 'stress',
  category: '800 个随机半径',
  input: `800\n${radii.join(' ')}\n`,
  output: render(radii),
});

return cases;
```
