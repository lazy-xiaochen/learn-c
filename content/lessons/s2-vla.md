---
id: s2-vla
---

## 讲解

### 数组的长度可以是运行时的值
前面见过的数组都是"长度写死在代码里"的：`int a[10]`、`double buf[256]`。但很多场景下长度只有运行时才知道——比如先读入 `n`，再读入 `n` 个数。C99 引入的**变长数组**（Variable Length Array，VLA）就是为这种场景准备的：

```c run id=vla-basic stdin="5"
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) {
        return 0;
    }

    int a[n];                        /* 长度由运行时的 n 决定，不是编译期常量 */
    for (int i = 0; i < n; i++) {
        a[i] = i * i;
    }
    for (int i = 0; i < n; i++) {
        printf("%d%c", a[i], i + 1 == n ? '\n' : ' ');
    }
    return 0;
}
```
```output
0 1 4 9 16
```

几点必须说清楚：

- "变长"指的是**长度在运行时确定**，不是"数组能随时变长"。`a` 一旦创建，大小就固定为 `n` 个 `int`，之后既不能扩容也不能缩容；
- VLA 分配在**栈**上，和普通的局部数组一样，离开作用域就自动释放，不需要（也不能）`free`；
- 长度表达式在**声明执行到的那一刻**求值。所以 `int a[n];` 必须写在 `scanf("%d", &n)` 之后——如果写在前面，用的就是 `n` 的垃圾值。

### `sizeof` 对 VLA 是运行时求值的
普通数组的 `sizeof` 在编译期就确定了；VLA 的 `sizeof` 必须等到运行时算出长度。这也是 VLA 和"数组形参退化成指针"最不一样的地方——**VLA 仍然知道自己有多大**：

```c run id=vla-sizeof
#include <stdio.h>

int main(void) {
    int n = 6;
    int a[n];                        /* n 是变量，所以 a 是 VLA */
    printf("sizeof a = %zu\n", sizeof a);
    printf("元素个数 = %zu\n", sizeof a / sizeof a[0]);
    return 0;
}
```
```output
sizeof a = 24
元素个数 = 6
```

`sizeof a` 得到 24（6 × 4），`sizeof a / sizeof a[0]` 得到 6，都是正确的。注意对比：把 `a` 传进函数之后，形参 `a` 只是指针，`sizeof` 立刻变成 8——**VLA 的"知道自己多大"只在它还是数组的那个作用域里成立**。

### 每次进作用域都重新分配，离开就释放
VLA 的生命周期和普通局部变量一样：进入语句块时按当时的 `n` 分配，离开语句块时自动回收。所以同一个函数被不同参数调用时，每次的 VLA 大小可以不同：

```c run id=vla-scope
#include <stdio.h>

static void fill(int n) {
    int a[n];                        /* 每次调用都按这一次的 n 重新分配 */
    for (int i = 0; i < n; i++) {
        a[i] = n - i;
    }
    printf("n = %d：首元素 = %d，末元素 = %d，sizeof a = %zu\n", n, a[0], a[n - 1], sizeof a);
}

int main(void) {
    fill(3);
    fill(5);
    return 0;
}
```
```output
n = 3：首元素 = 3，末元素 = 1，sizeof a = 12
n = 5：首元素 = 5，末元素 = 1，sizeof a = 20
```

这也意味着 VLA 不能"带出函数"：函数返回后那块栈空间就被回收了，返回指向它的指针会得到悬垂指针。

### 限制一：VLA 不能用初始化列表
普通数组可以写 `int a[5] = {0};`，VLA 不行——因为长度在运行时才知道，编译器无法在编译期检查初始化列表的长度。这是**编译错误**，不是警告：

```c run id=vla-init expect=CE
#include <stdio.h>

int main(void) {
    int n = 4;
    int a[n] = {0};                  /* 错误：variable-sized object may not be initialized */
    printf("%d\n", a[0]);
    return 0;
}
```

需要清零就老老实实循环，或者用 `memset`：

```c
for (int i = 0; i < n; i++) {
    a[i] = 0;
}
/* 或者：#include <string.h> 之后 memset(a, 0, sizeof a); */
```

### 限制二：长度必须大于 0
C 标准要求 VLA 的长度表达式必须大于 0。传 0 或负数进去是**未定义行为**：可能什么都没分配，也可能破坏栈。本平台的 UBSan 会在声明处直接报错：

```c run id=vla-zero expect=UB
#include <stdio.h>

int main(void) {
    int n = 0;                       /* 假设来自用户输入，用户填了 0 */
    int a[n];                        /* 长度 0：未定义行为 */
    a[0] = 1;
    printf("%d\n", a[0]);
    return 0;
}
```

所以只要长度来自输入，就必须先检查：`if (n <= 0 || n > 上限) { 报错并返回; }`。这一个判断能挡掉后面所有的麻烦。

### 限制三：不能是 static，也不能在文件作用域
VLA 的存储期必须是自动的（栈上），因此下面两种写法都不合法：

```c
static int a[n];        /* 错：variable length array cannot have static storage duration */
int g[n];               /* 错：文件作用域只接受常量表达式 */
```

结构体成员也不能是 VLA。想让"长度可变的缓冲区"长期存在，只能靠动态内存（第 5 阶段的 `malloc`）。

### 限制四：VLA 开在栈上，太大就栈溢出
VLA 的存储来自栈。桌面系统上栈通常只有几 MB（Windows 默认 1MB），本平台为了判题把栈放大到了 64MB，但仍然是有限资源：

- `int a[100000]` ≈ 400KB，安全；
- `int a[10000000]` ≈ 40MB，接近上限，很可能直接崩溃；
- `long long pre[1000000]` ≈ 8MB，也在危险区。

栈溢出不是"返回一个错误值"，而是程序直接崩溃（本平台会判 `RE`）。所以凡是长度可能很大的数组，都应该先限制上限，或者改用 `malloc`（第 5 阶段）。

### 限制五：C11 起 VLA 是"可选特性"
VLA 是 C99 引入的；C11 把它降级为**可选**：实现可以不支持，并定义宏 `__STDC_NO_VLA__` 来声明这一点。微软的 MSVC 至今不支持 VLA，所以同一份用 VLA 的代码在 Windows 上换一个编译器就可能编译不过。

需要可移植时有两种常见做法：

1. 用固定上限的数组 + 检查 `n` 是否超限（本阶段最常用）；
2. 用 `malloc` / `free`（第 5 阶段）。

### VLA 与 malloc 怎么选
| | VLA | `malloc` |
|---|---|---|
| 长度 | 运行时确定 | 运行时确定 |
| 存放位置 | 栈 | 堆 |
| 大小上限 | 受栈大小限制（几 MB） | 受可用内存限制（大得多） |
| 释放 | 离开作用域自动释放 | 必须手动 `free` |
| 失败时 | 栈溢出，程序崩溃 | 返回 `NULL`，可以检查 |
| 可移植性 | C99 起，C11 可选，MSVC 不支持 | 所有 C 实现都支持 |

一句话总结：**长度不大、用完就扔 → VLA 很方便；长度可能很大、或者需要跨函数长期存在 → 用 `malloc`。**

### 内存图：VLA 的地址在运行时才定下来
假设读入 `n = 5`、数组内容是 `0 1 4 9 16`：

```memory title="int n = 5; int a[n];（地址为示意，实际每次运行可能不同；a 的起始地址在运行时才确定）"
地址     | 内容 | 变量 | 说明
0x1000   | 5    | n    | scanf 读入之后才确定
0x0fe0   | 0    | a[0] | a 的起始地址 = 0x0fe0，声明执行时才算出来
0x0fe4   | 1    | a[1] | 
0x0fe8   | 4    | a[2] | 
0x0fec   | 9    | a[3] | 
0x0ff0   | 16   | a[4] | 一共 5 × 4 = 20 字节
```

与固定长度数组的区别只有一点：**`a` 的起始地址和总大小都不是编译期常量**，编译器在栈上留出"运行时要减多少"的记录，声明执行时才真正移动栈指针。至于"连续存放、下标从 0 开始、越界是未定义行为"，VLA 和普通数组完全一样。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra vla.c -o vla
./vla
```

本平台使用 Clang，命令等价：

```bash
clang -std=c17 -Wall -Wextra vla.c -o vla
./vla
```

几个和 VLA 有关的开关：

- `-Wvla`：只要用了 VLA 就警告（有些工程为了可移植性会打开它，`-Werror` 之后等于禁用 VLA）；
- `-fsanitize=undefined`：能抓住"长度为 0 或负数"这类错误，报 `variable length array bound evaluates to non-positive value`；
- `-fsanitize=address`：能抓住 VLA 的越界访问，报 `dynamic-stack-buffer-overflow`。

运行程序时别忘了给它输入，例如 `echo 5 | ./vla`，否则 `scanf` 失败、`n` 是垃圾值。

## 常见错误

### 以为 VLA 声明出来就是全 0 [WA]
VLA 和普通局部数组一样**不会自动初始化**，`int a[n];` 里的内容是栈上残留的不确定值。把它当"清零的数组"来累加，会得到随机结果。要么用循环显式赋值，要么 `memset(a, 0, sizeof a)`。注意 `sizeof a` 对 VLA 是运行时求值的，所以 `memset` 的第三个参数也是对的。

### 长度来自输入却不检查，用户填 0 或负数 [UB]
`scanf("%d", &n); int a[n];` 是典型的"把用户输入直接当长度"。输入 `-3` 时 UBSan 会报 `variable length array bound evaluates to non-positive value -3`，没有检查的程序可能悄悄破坏栈。长度一定要先判断范围：
```c run id=err-nonpositive expect=UB stdin="-3"
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    int a[n];                        /* n = -3：未定义行为 */
    a[0] = 1;
    printf("%d\n", a[0]);
    return 0;
}
```

### 把 VLA 声明成 static 或放在函数外 [CE]
`static int a[n];` 会报 `variable length array cannot have static storage duration`；写在所有函数外面的 `int g[n];` 也不行，因为文件作用域的数组长度必须是常量表达式（`n` 在那里根本不是变量）。VLA 只能是**块作用域的自动变量**。

### 返回 VLA 的指针 [UB]
```c
int *make(int n) {
    int a[n];
    return a;        /* 错：函数返回后这块栈空间就失效了 */
}
```
VLA 的存储期到语句块结束为止，返回它的地址得到悬垂指针。需要把数组交给调用者时，应该由调用者提供数组并传入，或者用 `malloc`。

### VLA 开得太大导致栈溢出 [RE]
`int a[50000000];`（约 200MB）远超栈上限，程序会在声明处直接崩溃，本平台判 `RE`。判断标准很简单：把"元素个数 × 元素大小"心算一下，超过几 MB 就不要放在栈上。

## 客观题

### q-s2-vla-1 single
本平台是 64 位环境（`int` 4 字节，指针 8 字节）。下面两行代码执行后，`sizeof a` 的值是多少？

```c
int n = 7;
int a[n];
```

- [x] 28
  > 正确。`a` 是变长数组，长度在运行时才确定，`sizeof` 也随之在运行时计算：7 × 4 = 28 字节。VLA 依然"知道自己整个有多大"，这一点和数组形参退化成指针的情况不同。
- [ ] 8
  > 8 是指针的大小。VLA 不是指针，`a` 的类型是"7 个 int 的数组"，`sizeof` 得到的是整个数组占用的字节数，不是地址的大小。
- [ ] 4
  > 4 是单个 `int` 的大小，漏乘了元素个数 7。`sizeof a` 算的是整个数组。
- [ ] 编译错误，因为 `n` 不是常量
  > `int a[n]`（`n` 是变量）在 C99 里是合法的变长数组；C11 起是可选特性，但本平台的 Clang 支持它。只有把 VLA 声明成 `static`、放到文件作用域、或者给它写初始化列表时，才是编译错误。
