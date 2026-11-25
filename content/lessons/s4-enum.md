---
id: s4-enum
---

## 讲解

### 枚举常量是"带名字的 int 常量"
`enum` 看起来像在定义一种新类型，但 C 对它的处理非常朴素：花括号里的每个名字都是一个 **`int` 类型的整数常量**，`enum Color` 只是给这组常量起了个"标签"，顺便让编译器知道这组常量属于同一个家族。

不写 `=` 时，第一个成员是 `0`，后面每个成员自动等于"前一个成员的值 + 1"；一旦某个成员写了 `=`，它后面的成员又从这个值继续往后数：

```c run id=enum-values
#include <stdio.h>

enum Color { RED, GREEN = 5, BLUE };

int main(void) {
    printf("RED = %d\n", RED);
    printf("GREEN = %d\n", GREEN);
    printf("BLUE = %d\n", BLUE);          /* 自动接着 GREEN 的值往后数 */
    printf("sizeof(enum Color) = %zu\n", sizeof(enum Color));
    printf("sizeof(RED) = %zu\n", sizeof(RED));
    return 0;
}
```
```output
RED = 0
GREEN = 5
BLUE = 6
sizeof(enum Color) = 4
sizeof(RED) = 4
```

注意最后两行：`RED` 本身是 `int` 常量（4 字节），`enum Color` 类型的变量在本平台上也占 4 字节。C 标准没有规定枚举类型必须和 `int` 一样大，只说它要和 `char`、`signed int`、`unsigned int` 中的某一个"兼容"；但只要所有枚举值都能装进 `int`，本平台的编译器就会选 `int`。所以**枚举不是"更省内存的整数"，它本质上就是一个整数**。

### 枚举变量不拦住其他整数
这是初学者最容易误解的一点：`enum` 在 C 里**没有"取值范围检查"**。声明一个 `enum Color` 变量之后，你仍然可以把它赋成 `99`——这既不是编译错误，也不是运行错误，只是这个值不在你列出的名字里而已：

```c run id=enum-no-check
#include <stdio.h>

enum Color { RED, GREEN, BLUE };

static const char *color_name(enum Color c) {
    switch (c) {
    case RED: return "RED";
    case GREEN: return "GREEN";
    case BLUE: return "BLUE";
    default: return "UNKNOWN";        /* 枚举变量里可能装着别的整数 */
    }
}

int main(void) {
    enum Color c = 99;                /* 合法：枚举变量本质上是整数 */
    printf("c = %d\n", (int)c);
    printf("name = %s\n", color_name(c));

    c = GREEN;
    printf("c = %d, name = %s\n", (int)c, color_name(c));
    return 0;
}
```
```output
c = 99
name = UNKNOWN
c = 1, name = GREEN
```

这段代码能正常编译、正常运行。原因在 C 标准里：枚举类型只需要能表示它的**所有枚举值**，而 `int` 能表示 99，所以把 99 存进 `enum Color` 是允许的。真正危险的是**拿它当下标或数组长度**：

```c
int counts[3] = {0};
counts[99]++;        /* 越界写：编译期不报错，运行期破坏内存 */
```

所以只要枚举值来自外部（命令行、文件、网络报文），就必须自己检查范围，并在 `switch` 里写 `default`。`default` 不是"多余的分支"，它是唯一能接住"枚举变量装了别的数"的地方。

### 可以指定负值，也可以让两个名字相等
枚举值不要求从 0 开始，也不要求互不相同。负数、显式指定、别名都合法：

```c run id=enum-explicit-values
#include <stdio.h>

enum Status {
    STATUS_OK = 0,
    STATUS_WARN = -1,
    STATUS_ERROR = -2,
    STATUS_ALIAS = STATUS_WARN        /* 两个名字可以表示同一个值 */
};

int main(void) {
    printf("OK=%d WARN=%d ERROR=%d ALIAS=%d\n",
           STATUS_OK, STATUS_WARN, STATUS_ERROR, STATUS_ALIAS);
    printf("WARN == ALIAS: %d\n", STATUS_WARN == STATUS_ALIAS);
    printf("sizeof(enum Status) = %zu\n", sizeof(enum Status));
    return 0;
}
```
```output
OK=0 WARN=-1 ERROR=-2 ALIAS=-1
WARN == ALIAS: 1
sizeof(enum Status) = 4
```

"两个名字相等"在描述状态别名时很有用。但它也意味着 `switch` 里**不能同时给 `STATUS_WARN` 和 `STATUS_ALIAS` 写 `case`**：两个 `case` 的值相同，编译会报 `duplicate case value`。遇到别名时，`switch` 只写其中一个名字。

### 用 enum + 数组做"名字表"
既然枚举值是连续的整数，它就可以直接当数组下标用。常见写法是在枚举末尾加一个 `MODE_COUNT` 当"哨兵"，再用循环遍历所有取值：

```c run id=enum-count-sentinel
#include <stdio.h>

enum Mode { MODE_OFF, MODE_IDLE, MODE_RUN, MODE_COUNT };

int main(void) {
    const char *names[MODE_COUNT] = { "OFF", "IDLE", "RUN" };
    int power[MODE_COUNT] = { 0, 5, 100 };
    int total = 0;

    for (int m = MODE_OFF; m < MODE_COUNT; m++) {
        printf("%-8s power=%d\n", names[m], power[m]);
        total += power[m];
    }
    printf("MODE_COUNT = %d, total = %d\n", MODE_COUNT, total);
    return 0;
}
```
```output
OFF      power=0
IDLE     power=5
RUN      power=100
MODE_COUNT = 3, total = 105
```

这个写法的前提是"枚举值从 0 开始连续递增"。一旦你给某个成员写了 `= 10`，数组下标就会空出一大段，`MODE_COUNT` 也不再等于成员个数。**枚举和下标数组搭配时，要么保证从 0 连续，要么显式写出每个值并用最大值 + 1 当数组长度。**

### enum 与 #define 的区别
`#define RED 0` 也能给 0 起名字，很多老代码确实这么写。两者的关键区别在"它到底是什么"：

| | `enum` 常量 | `#define` 宏 |
|---|---|---|
| 本质 | 带类型的 `int` 常量（有作用域） | 预处理阶段的文本替换 |
| 调试器里 | 能看到名字和值 | 通常只剩替换后的数字 |
| 重复定义 | 同一个作用域里重名是编译错误 | 可以静默覆盖（有的编译器给警告） |
| 能否被 `sizeof` | 能，`sizeof(RED)` 有意义 | 能，但只是替换后的字面量 |
| 能否取地址 | 不能（常量没有地址） | 不能（同上） |
| 适合 | 一组相关的整数取值 | 条件编译、数组长度、字符串拼接 |

```c
#define COLOR_RED 0
enum Color { RED = 0 };      /* 推荐：有类型、有作用域、调试友好 */
```

宏没有类型，也不会被编译器当成"一组相关的值"来检查；枚举则能让 `switch` 的 `-Wswitch` 检查出"少写了一个成员"。需要一组有名字的整数时，优先用 `enum`。

### 跨文件时：同一个枚举名只能有一份定义
枚举成员是**普通标识符**，不是 `Mode::MODE_OFF` 这种带命名空间的名字。所以下面两件事都会出问题：

1. **同一个翻译单元里出现两份同名枚举**：直接编译失败（`redefinition of enumerator 'MODE_OFF'`）。
2. **两个 `.c` 各自包含一份"同名但值不同"的枚举定义**：每个文件单独编译都能过，链接器也照常链接——因为枚举在 ABI 上就是 `int`，函数符号里根本不带枚举的类型和值。但两个翻译单元对"`MODE_OFF` 等于几"的理解不一致，程序的行为就没有定义了。

第 2 种最阴险：它不会报错，只会在运行时算出"看起来合理"的错值。C 标准要求不同翻译单元里同名的枚举类型**成员值必须相同**，否则它们不是兼容类型，程序行为未定义。头文件卫士（`#ifndef`）只能防止同一个头文件被重复包含，防不住"两个不同头文件定义了同一组名字"。

正确的做法只有一个：**枚举只在一个头文件里定义，所有模块都包含它**；旧协议的数字编码如果要保留，就写成显式的转换函数（例如 `legacy_code - 1`），而不是再定义一套同名枚举。下一节的编程题就是这种事故的现场。

## 编译与运行

用 gcc 或 clang 编译都可以，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra enum.c -o enum
./enum
```

```bash
clang -std=c17 -Wall -Wextra enum.c -o enum
./enum
```

多文件工程把 `.c` 一起交给编译器，头文件用 `-I` 指定搜索目录：

```bash
clang -std=c17 -Wall -Wextra -I. main.c device.c -o device
./device
```

几个和枚举有关的编译选项：

- `-Wall` 包含 `-Wswitch`：`switch` 一个枚举变量时，如果漏写了某个成员、又没有 `default`，编译器会警告。这是枚举相对 `#define` 的最大好处之一。
- `-Wenum-conversion`（Clang）：把一种枚举类型的值赋给另一种枚举类型时警告，能抓住"两个模块各有一套枚举"的混用。
- `-Wpedantic`：检查不符合标准的扩展写法，例如空枚举。

最后一个必须知道的现实：**链接器不会检查枚举的值**。`int mode_power(enum Mode m)` 和 `int mode_power(int m)` 生成的是同一个符号 `mode_power`，参数在 x86-64 上都走寄存器、都是 4 字节整数。所以"两个头文件对同一个枚举给了不同取值"这类错误，编译器和链接器都可能一声不吭，只能靠"单一头文件"的工程纪律来避免。

## 常见错误

### 以为枚举变量只能存放列出来的值 [WA]
C 的枚举不是"封闭集合"，`enum Color c = 99;` 完全合法，编译、运行都不会报错。它会安静地流到 `switch` 的 `default`，或者更糟——被你拿去当数组下标，造成越界。凡是枚举值来自外部输入的地方，都要先检查范围再转换。

### 两个头文件给同一组枚举名定义了不同的值 [CE]
把两套定义放进同一个翻译单元，编译器会直接报重复定义：

```c run expect=CE
/* 模拟两个头文件里各有一份 enum Mode，值还不一样 */
enum Mode { MODE_OFF = 0, MODE_IDLE = 1, MODE_STANDBY = 2, MODE_RUN = 3 };
enum Mode { MODE_OFF = 1, MODE_IDLE = 2, MODE_STANDBY = 3, MODE_RUN = 4 };

int main(void) {
    return 0;
}
```

真实工程里这两份定义分别在两个头文件中，只要有一个 `.c` 同时包含它们就会得到同样的错误。如果没有任何文件同时包含、而是不同模块各用一份，编译器就抓不到了——那是最危险的情况，见下一节编程题。

### 拿枚举值直接当下标，却不检查范围 [UB]
枚举只保证"能装下所有枚举值"，不保证装进来的值一定在范围内。下面这段代码把外部读到的 `7` 直接当数组下标：

```c run expect=UB
#include <stdio.h>

enum Mode { MODE_OFF, MODE_IDLE, MODE_RUN, MODE_COUNT };

int main(void) {
    int counts[MODE_COUNT] = {0};
    int code = 7;

    counts[code]++;                   /* 越界写：UBSan 会报 index out of bounds */
    printf("%d\n", counts[code]);
    return 0;
}
```

开了 UndefinedBehaviorSanitizer 的平台会直接判 `UB`（数组越界属于未定义行为），AddressSanitizer 则会把它当作 `stack-buffer-overflow` 判 `RE`；没开检查时它可能悄悄改掉旁边的变量，过很久才以"莫名其妙的结果"暴露。正确顺序永远是：**先检查 `code >= 0 && code < MODE_COUNT`，再转换、再当下标**。

### 以为枚举值默认从 1 开始 [WA]
不写 `=` 时第一个成员是 **0**，不是 1。把协议里的编码（通常从 1 开始）直接照抄成枚举、又按"从 0 开始"去读，会整体错一位：

```c run expect=OK
#include <stdio.h>

enum Legacy { LEGACY_FIRST, LEGACY_SECOND, LEGACY_THIRD };

int main(void) {
    printf("FIRST=%d SECOND=%d THIRD=%d\n", LEGACY_FIRST, LEGACY_SECOND, LEGACY_THIRD);
    printf("把 FIRST 当成协议里的 1 会差 %d\n", 1 - LEGACY_FIRST);
    return 0;
}
```
```output
FIRST=0 SECOND=1 THIRD=2
把 FIRST 当成协议里的 1 会差 1
```

### 把枚举变量直接当字符串打印 [WA]
`printf("%s", color)` 把 `color` 的整数值当成 `char *` 地址去读，是未定义行为，通常直接崩溃。枚举和字符串之间没有自动转换，必须自己写 `switch` 或维护一张名字表（见上面 `names[MODE_COUNT]` 的例子）。`-Wformat` 会在编译期提醒 `%s` 需要一个 `char *`，不要忽略这类警告。

## 客观题

### q-s4-enum-1 single
关于 C 语言的 `enum`，下面哪一种说法是正确的？

- [x] 枚举常量本质上是 `int` 常量；`enum Color` 变量占用的字节数通常和 `int` 相同，并且可以被赋成枚举列表之外的整数
  > 正确。C 标准规定枚举常量具有 `int` 类型，枚举类型与 `char`、`signed int`、`unsigned int` 之一兼容；本平台选 `int`，所以 `sizeof(enum Color) == 4`。枚举变量也不会做范围检查，`enum Color c = 99;` 合法，需要程序自己校验来自外部的值。
- [ ] `enum` 定义了一种"只能取花括号里列出的值"的类型，给枚举变量赋其他整数会编译失败
  > 错。这是 C++ 的 `enum class` 才有的严格性；C 的枚举是整数类型，不做取值检查。只有把两套同名枚举放进同一个翻译单元时，才会因重复定义而编译失败。
- [ ] `sizeof(enum Color)` 等于枚举成员的个数，因为每个成员在内存里各占一个位置
  > 错。枚举成员是编译期的整数常量，不占运行时存储；`enum Color` 变量只有一个整数值，本平台占 4 字节。`sizeof(enum Color)` 与成员个数无关。
- [ ] 两个头文件里定义同名但取值不同的 `enum Mode`，只要没有单个 `.c` 同时包含它们，程序就完全没问题
  > 错。不同翻译单元可以各自看到一份定义，编译和链接都可能通过，但两边对 `MODE_*` 的值理解不一致。C 标准要求不同翻译单元里同名枚举的成员值相同，否则类型不兼容，程序行为未定义；链接器不会检查枚举的值。
