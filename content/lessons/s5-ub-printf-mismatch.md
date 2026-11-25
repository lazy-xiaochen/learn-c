---
id: s5-ub-printf-mismatch
---

## 讲解

### 格式串是唯一的类型说明书

`printf` 的声明是 `int printf(const char *format, ...);`。省略号意味着**后面的参数没有类型信息**：编译器在调用点只知道"这里有若干实参"，不知道被调用者会拿它们当什么用。`printf` 内部靠 `va_arg(ap, int)`、`va_arg(ap, double)` 这样的调用一个个往前取，而"每次该取什么类型"完全由格式串里的 `%` 决定。

换句话说，**格式串是这份调用里唯一的类型说明书**。说明书和实物对不上，取出来的就是别的东西——不是"转换"，是"按错误的形状去读同一片内存"。

在讲错之前，先把对的记住。因为变参函数会做**默认实参提升**，实际传进去的类型往往不是你写在源码里的那个类型：

| 源码里的类型 | 提升后 | 该用的格式符 |
|---|---|---|
| `char`、`short`、`_Bool`、枚举 | `int` | `%c`、`%hd`、`%hhd`（长度修饰符负责再截回去） |
| `float` | `double` | `%f`（`printf` 里 `%lf` 与 `%f` 等价） |
| `int` | `int` | `%d` |
| `unsigned` | `unsigned` | `%u` |
| `long` | `long` | `%ld` |
| `long long` | `long long` | `%lld` |
| `size_t`（`sizeof`、`strlen` 的结果） | 8 字节无符号 | `%zu` |
| `char *` | `char *` | `%s` |
| `double` | `double` | `%f`、`%e`、`%g` |

"提升"这件事解释了为什么 `printf("%f", 1.5f)` 是对的：`1.5f` 在进 `printf` 之前已经被转成 `double`，所以 `%f` 取的正好是一个 `double`。它也解释了 `printf("%d", (char)'A')` 为什么对：`char` 被提升成 `int`。下面这段全是正确写法，注意 `%hhd`、`%hd` 是怎么"再截回去"的：

```c run id=fmt-basic
#include <stdio.h>

int main(void) {
    int n = 42;
    double d = 3.5;
    const char *s = "hi";
    long long big = 1234567890123LL;
    short sh = -7;
    signed char sc = -3;
    printf("%d|%f|%s|%zu|%c|%%\n", n, d, s, sizeof n, 'A');
    printf("%lld|%hd|%hhd|%#x|%08.3f\n", big, sh, sc, 255, 3.14159);
    return 0;
}
```
```output
42|3.500000|hi|4|A|%
1234567890123|-7|-3|0xff|0003.142
```

提升规则本身也会带来"看起来对不上、其实没问题"的组合：

```c run id=fmt-promote
#include <stdio.h>

int main(void) {
    float f = 1.5f;
    char c = 'z';
    short s = 1000;
    printf("%f %d %d\n", f, c, s);      /* float→double、char/short→int，全部对得上 */
    printf("%d\n", (int)sizeof(f + f)); /* 算术运算里 float 不会提升成 double */
    return 0;
}
```
```output
1.500000 122 1000
4
```

长度修饰符的语义是"**先按 int 收下，再截断成目标类型**"，这解释了很多看起来奇怪的输出：

```c run id=fmt-len
#include <stdio.h>

int main(void) {
    int big = 300;                    /* 塞不进 signed char */
    int wide = 70000;                 /* 塞不进 short */
    long long v = 1234567890123LL;
    printf("%hhd %hhd\n", big, -big);
    printf("%hd %hd\n", wide, -wide);
    printf("%lld %zu\n", v, sizeof(long long));
    return 0;
}
```
```output
44 -44
4464 -4464
1234567890123 8
```

`300` 打印成 `44` 是因为 `300 - 256 = 44`（截断到 8 位），`70000` 打印成 `4464` 是因为 `70000 - 65536 = 4464`。这里的截断是**定义良好的**，和后面要讲的"类型不匹配"完全是两件事——长度修饰符是"我知道我传的是 int，请帮我截小"，类型不匹配是"我传了 double，你却按 int 读"。

### 为什么类型对不上会"读到别的地方"

这一点必须从 x86-64 的调用约定说起。整数、指针类型的参数走 `rcx`、`rdx`、`r8`、`r9`（前 4 个），浮点参数走 `xmm0`–`xmm3`，是**两条独立的通道**。`printf` 是变参函数，编译期不知道后面会有几个参数，所以调用者会把这两组寄存器**都**溢出到栈上的"寄存器保存区"里（Windows x64 上是 4 个整型槽 + 4 个 XMM 槽）。`printf` 内部的 `va_arg` 就按格式符的类型决定去哪个区取：

- `%d`、`%ld`、`%s`、`%p` → 去**整型/指针区**取；
- `%f`、`%e`、`%g` → 去**SSE 区**取。

于是 `printf("%d\n", 3.5)` 的真实动作是："请到整型区拿一个 int"——而 3.5 的 8 个字节被放在 SSE 区，整型区里只剩调用者留下的残留值。这不是"把 3.5 转成 3"，是**从另一个抽屉里随便抓了一个数**。本平台实测输出 `0`：

```c run id=fmt-wrong-double-O0 warnings=allow nocheck reason="格式符与实参类型不匹配，读的是寄存器保存区里的残留值"
#include <stdio.h>

int main(void) {
    double d = 3.5;
    printf("%d\n", d);                /* 错：%d 去整型区取，double 在 SSE 区 */
    return 0;
}
```

同样的代码用 `-O2` 编译，本平台也输出 `0`：

```c run id=fmt-wrong-double-O2 opt=-O2 warnings=allow nocheck reason="格式符与实参类型不匹配，读的是寄存器保存区里的残留值"
#include <stdio.h>

int main(void) {
    double d = 3.5;
    printf("%d\n", d);                /* 同一个错误，只是换了优化级别 */
    return 0;
}
```

**两档都是 0，反而更容易骗人**：你会以为"它把 3.5 取整成 0 了"。其实那个 0 是整型寄存器槽里恰好为 0 的残留值；换个上下文（前面多调一次别的函数、换个编译器版本）就会变成别的数。

想要看到 `-O0` 与 `-O2` 的**真实差异**，得让"读错的槽"里本来就有值——最简单的办法是让格式符比实参**多**。下面这段只给了 1 个实参，却要求打印 4 个整数，多出来的 3 个槽里装的是调用者现场的残留值，两个优化级别下的现场完全不同：

```c run id=fmt-arity-O0 warnings=allow nocheck reason="格式符比实参多，读到的是寄存器保存区里的残留值，每次运行都可能不同"
#include <stdio.h>

int main(void) {
    printf("%d %d %d %d\n", 1);       /* 错：4 个格式符，只有 1 个实参 */
    return 0;
}
```

```c run id=fmt-arity-O2 opt=-O2 warnings=allow nocheck reason="格式符比实参多，读到的是寄存器保存区里的残留值，每次运行都可能不同"
#include <stdio.h>

int main(void) {
    printf("%d %d %d %d\n", 1);       /* 同一个错误，-O2 的现场不同 */
    return 0;
}
```

本平台实测：`-O0` 下后三个数是一组值（例如 `1 -86553936 -81092520 1191181824`），`-O2` 下换成完全另一组（例如 `1 1590782464 1596629080 1`），而且不同次运行还会变。这才是 UB 的真面目——**同一个程序，不同编译选项给出不同结果，甚至同一份可执行文件运行两次也不一样**。

最严重的一种不匹配是 `%s`。`%s` 期待一个 `char *`，`printf` 会拿这个值当**地址**去读字符串。传一个整数进去，等于让它去解引用那个整数当地址：

```c run id=fmt-s-int expect=RE warnings=allow
#include <stdio.h>

int main(void) {
    int n = 65;
    printf("%s\n", n);                /* 错：把 65 当地址去读字符串 */
    return 0;
}
```

本平台实测判 `RE`（非法内存访问）：地址 65 不在进程的地址空间里，第一次读字节就崩了。如果那个整数恰好是某个可读地址，程序会继续跑下去，然后打印出一段完全无关的内存——**不崩不代表对**。

把三类错误放在一起对照：

| 错误写法 | `printf` 的动作 | 本平台表现 |
|---|---|---|
| `printf("%d", 3.5)` | 去整型区取 int | 打印残留值（实测 `0`），UB |
| `printf("%f", 42)` | 去 SSE 区取 double | 打印残留值（实测 `0.000000`），UB |
| `printf("%d %d %d %d", 1)` | 取 4 个 int，只有 1 个存在 | 三个槽全是残留值，`-O0`/`-O2` 不同，UB |
| `printf("%s", 65)` | 把 65 当地址解引用 | 崩溃（判 `RE`），UB |
| `printf("%d", 4294967297LL)` | 只取低 4 字节的 int | 打印 `1`，UB |

最后一行值得停一下：`long long` 的 8 个字节确实在整型区里，`%d` 只读其中低 4 字节，所以 `4294967297`（`0x1_0000_0001`）打印成 `1`。它"看起来很有道理"，但依然是 UB——标准没规定 `%d` 遇到 `long long` 该干什么，本平台只是恰好只读了低 4 字节。

### 编译器早就在警告你：`-Wformat`

`printf` 有个特殊待遇：只要格式串是字面量，编译器就会拿实参类型逐个核对，并在 `-Wall` 里通过 `-Wformat` 报出来。上面所有错误写法都会得到类似这样的诊断：

```text
warning: format specifies type 'int' but the argument has type 'double' [-Wformat]
warning: more '%' conversions than data arguments [-Wformat]
warning: format specifies type 'char *' but the argument has type 'int' [-Wformat]
```

这三条警告分别对应"类型不对""数量不对""指针位置不对"。**这是编译期就能拿到的信息，比任何运行期检查都便宜**。所以处理原则很简单：

1. 把 `-Wformat` 的警告当错误看（`-Werror=format`）；
2. 自己封装日志函数时，把格式检查"传递"进去：

```c
/* 告诉编译器：第 1 个参数是格式串，变参从第 2 个开始，按 printf 的规则检查 */
void log_info(const char *fmt, ...) __attribute__((format(printf, 1, 2)));
```

有了这个属性，`log_info("%d", 3.5)` 一样会在编译期被抓住。没有它，包装一层就等于把编译器的眼睛蒙上了——这是"用了日志库之后格式错误突然变多"的根本原因。

3. 打印 `size_t` 一律用 `%zu`；打印 `long long` 用 `%lld`；不确定就先转成 `int` 或 `long long` 再打印：

```c
printf("%d\n", (int)sizeof(int));          /* 确定放得下才转 int */
printf("%zu\n", sizeof(int));              /* 更好的写法：根本不用转 */
```

## 编译与运行

用 gcc 或 clang 都行，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra fmt.c -o fmt
./fmt
```

```bash
clang -std=c17 -Wall -Wextra fmt.c -o fmt
./fmt
```

`-Wall` 已经包含 `-Wformat`。想更严格：

```bash
clang -std=c17 -Wall -Wextra -Wformat=2 -Werror=format fmt.c -o fmt
```

`-Wformat=2` 会额外检查 `%n`、非字面量格式串等情形。注意一个限制：**格式串必须是字面量**才能被检查。下面这种写法编译器无能为力，只能靠人：

```c
const char *fmt = get_fmt_from_config();
printf(fmt, value);        /* 无法检查：fmt 是变量 */
```

这也是为什么"把用户输入当格式串"极其危险：`printf(user_input)` 不但类型不可查，还给了 `%n` 这类写内存的格式符可乘之机。

想看真实行为，可以对比两档：

```bash
clang -std=c17 -O0 -w fmt.c -o fmt-O0 && ./fmt-O0
clang -std=c17 -O2 -w fmt.c -o fmt-O2 && ./fmt-O2
```

`-w` 关掉警告只是为了让你能看到运行结果；正常开发时千万别关。两档输出不一样，正是"这段代码没有确定语义"的直接证据。

## 常见错误

### 用 `%d` 打印 `sizeof` 的结果 [UB]
`sizeof` 的类型是 `size_t`（本平台 8 字节无符号），`%d` 只取 4 字节。小的值（比如 `sizeof(int) == 4`）看起来完全正常，因为低 4 字节就是 4；一旦值超过 `INT_MAX`（比如 `sizeof` 一个巨大的数组），高位被丢掉，打印出来的数就是错的。正确写法是 `%zu`。

```c run id=fmt-err-sizeof warnings=allow nocheck reason="%d 打印 size_t 是未定义行为"
#include <stdio.h>

int main(void) {
    printf("%d %d\n", sizeof(int), sizeof(long long));   /* 错：应该用 %zu */
    return 0;
}
```

### 以为 `%f` 只能配 `float`、`%lf` 才是 `double` [WA]
这是把 `scanf` 的规则套到了 `printf` 上。`scanf` 必须区分：`%f` 读 `float`、`%lf` 读 `double`，因为它是**通过指针写内存**，必须知道目标大小。`printf` 正好相反：`float` 在传参时已经被提升成 `double`，所以 `%f` 收的就是 `double`，`printf("%lf", d)` 里的 `l` 没有任何作用（C99 起允许写，等价于 `%f`）。结论：`printf` 里 `%f` 和 `%lf` 都能打 `double`，但打 `float` 反而不行——因为根本没有 `float` 能传到 `printf` 里。

### 以为类型不匹配会自动转换 [UB]
`printf("%d", 3.5)` 不会输出 3，也不会输出 4。变参调用**不做类型转换**（除了前面说的默认提升），`printf` 只是按 `%d` 去整型通道取 4 个字节。要取整必须自己写 `(int)3.5`，这时转换发生在**调用之前**，是定义良好的。

### 用 `%s` 打印数字或结构体 [RE]
`%s` 把实参当地址。传 `65` 就是去读地址 65；传一个结构体则是把结构体的前 8 个字节当地址。两种情况都是 UB，本平台通常直接判 `RE`（非法内存访问），但在别的平台上可能"成功"打印出一段垃圾，让人误以为程序没问题。

### 格式串写成了变量，绕过了编译期检查 [UB]
`printf(fmt, x)` 里 `fmt` 是变量时，`-Wformat` 完全不工作。如果这个变量来自配置文件或用户输入，还会引入 `%n`（往任意地址写）的安全问题。规范做法是：格式串永远是字面量，可变的部分走 `%s` 参数。

## 客观题

### q-s5-ub-printf-mismatch-1 single
在 x86-64 上执行 `double d = 3.5; printf("%d\n", d);`，关于它的行为，下面哪一句是正确的？

- [x] 是未定义行为：`%d` 会去整型参数通道取一个 `int`，而 `d` 的 8 个字节在浮点通道里，因此读到的是无关的残留值
  > 正确。x86-64 的调用约定把整型/指针参数和浮点参数放在两条独立的通道（整型寄存器/栈槽 与 XMM 寄存器/保存区），`printf` 按格式符决定去哪条通道取。类型对不上时取到的不是 `d` 的字节，而是那条通道里原有的残留值，标准对此没有任何规定。
- [ ] 输出 `3`，因为 `%d` 会把 `double` 截断成整数
  > 错。变参调用不做类型转换，`printf` 内部也不知道实参原本是什么类型。截断只会发生在源码里显式写 `(int)d` 的时候——那时转换在调用之前完成，是定义良好的行为。
- [ ] 输出 `3.500000`，因为 `%d` 遇到浮点数会自动切换成 `%f`
  > 错。格式符不会被"自动纠正"，`printf` 完全按格式串执行。何况 `%d` 只认 4 字节的 `int`，与 8 字节的 `double` 布局根本不同。
- [ ] 编译失败，因为 `-Wformat` 会把这个错误升级成错误
  > 错。`-Wformat` 默认只给**警告**，编译仍然成功（除非显式加 `-Werror=format`）。这也正是它危险的地方：程序照常产出，错误被留到运行期。
