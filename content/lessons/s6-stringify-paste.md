---
id: s6-stringify-paste
---

## 讲解

### `#`：把参数变成字符串
函数宏里，参数名前面加一个 `#`，这个参数就不再是"被替换的文本"，而是**它自己那几个记号的字符串形式**：

```c
#define STR(x) #x
STR(1 + 2)     →    "1 + 2"
```

`#` 只做一件事：把实参的**记号序列**原样写进一个字符串字面量。它有几条必须记住的细节：

- **记号之间原来的空白会压成一个空格**，首尾空白丢掉：`STR(a   +   b)` 得到 `"a + b"`，`STR(  42  )` 得到 `"42"`；
- **不合并、不计算**：`STR(1 + 2)` 是 `"1 + 2"`，永远不是 `"3"`——预处理器不会算数；
- **字符串和字符字面量里的引号会被转义**：`STR("hi")` 得到 `"\"hi\""`，打印出来是 `"hi"`（带引号）；
- **空实参是合法的**：`STR()` 得到 `""`。

```c run id=sp-stringify
#include <stdio.h>

#define STR(x) #x

int main(void) {
    printf("[%s]\n", STR(hello));
    printf("[%s]\n", STR(1 + 2 * 3));
    printf("[%s]\n", STR(a   +   b));      /* 多个空格压成一个 */
    printf("[%s]\n", STR("hi"));           /* 引号被转义 */
    printf("[%s]\n", STR(  42  ));         /* 首尾空白丢掉 */
    printf("[%s]\n", STR());               /* 空实参 */
    return 0;
}
```
```output
[hello]
[1 + 2 * 3]
[a + b]
["hi"]
[42]
[]
```

`#` 只在**函数宏**里有这个含义。在对象宏（没有参数）里写 `#` 没有特殊作用，它就是一个普通字符，会原样留下来——所以 `#define HASH #x` 展开出来就是 `#x` 两个记号，跟字符串化毫无关系。

### `#` 不展开参数：要字符串化"宏的值"，必须套两层
`#` 的规则里有一条很容易踩：**参数在字符串化之前不会被宏展开**。也就是说，`STR(VERSION)` 得到的是 `"VERSION"` 这六个字符，而不是 `VERSION` 的值。

想让 `VERSION` 先展开成 `3`、再变成 `"3"`，需要两层宏：

```c
#define STR(x)  #x          /* 内层：真正做字符串化 */
#define XSTR(x) STR(x)      /* 外层：先把 x 展开，再交给 STR */
```

调用 `XSTR(VERSION)` 时，外层宏先把实参 `VERSION` 展开成 `3`，于是内层收到的是 `STR(3)`，结果自然是 `"3"`。这个"两层宏"的写法在需要把宏的**值**变成字符串时是标准做法（例如把版本号打进日志）。

```c run id=sp-twolevel
#include <stdio.h>

#define STR(x)  #x
#define XSTR(x) STR(x)

#define VERSION 3
#define NAME    hello

int main(void) {
    printf("STR(VERSION)      = %s\n", STR(VERSION));
    printf("XSTR(VERSION)     = %s\n", XSTR(VERSION));
    printf("STR(VERSION + 1)  = %s\n", STR(VERSION + 1));
    printf("XSTR(VERSION + 1) = %s\n", XSTR(VERSION + 1));
    printf("XSTR(NAME)        = %s\n", XSTR(NAME));
    return 0;
}
```
```output
STR(VERSION)      = VERSION
XSTR(VERSION)     = 3
STR(VERSION + 1)  = VERSION + 1
XSTR(VERSION + 1) = 3 + 1
XSTR(NAME)        = hello
```

注意最后一行：`XSTR(VERSION + 1)` 展开成 `"3 + 1"` 而不是 `"4"`——外层只负责展开宏，`+` 是编译器之后才要算的事。字符串化的结果永远是"源码里写了什么"，不是"运行时算出来多少"。

### `##`：把两个记号粘成一个
`##` 叫**记号拼接**：它把左右两边的记号**直接粘起来**，变成一个记号，然后才继续后面的替换。最常见的用途是**按规则生成标识符**：

```c
#define CONCAT(a, b) a##b
CONCAT(var, 1)      →   var1        /* 得到一个叫 var1 的标识符 */
```

`##` 也有"不展开参数"的规则：传给 `##` 的实参如果本身是宏，它**不会**先被展开，而是直接把字面记号粘上去。所以拼接同样需要两层：

```c
#define CONCAT(a, b)  a##b
#define XCONCAT(a, b) CONCAT(a, b)
```

```c run id=sp-paste
#include <stdio.h>

#define CONCAT(a, b)  a##b
#define XCONCAT(a, b) CONCAT(a, b)

#define PREFIX_ID 7

int main(void) {
    int CONCAT(var, 1) = 10;                     /* 生成 var1 */
    int CONCAT(var, 2) = 20;                     /* 生成 var2 */
    printf("var1 = %d, var2 = %d\n", var1, var2);

    int CONCAT(item_, PREFIX_ID) = 30;           /* 粘成 item_PREFIX_ID */
    int XCONCAT(item_, PREFIX_ID) = 40;          /* 先展开 PREFIX_ID，再粘成 item_7 */
    printf("item_PREFIX_ID = %d, item_7 = %d\n", item_PREFIX_ID, item_7);
    return 0;
}
```
```output
var1 = 10, var2 = 20
item_PREFIX_ID = 30, item_7 = 40
```

`##` 拼出来的结果必须是一个**合法记号**，否则编译报错。`a##+`、`1##2`（前者拼成两个记号，后者拼出一个非法数字）都不行；`##` 也不能出现在替换列表的开头或结尾。这些限制听起来琐碎，但它们保证了"拼接"不会造出编译器无法理解的东西。

### 实战一：调试打印宏
`#` 最经典的用途是调试输出：把"表达式长什么样"和"它算出来是多少"一起打出来，不用手写两遍。

```c run id=sp-show
#include <stdio.h>

#define SHOW(x) printf("%-8s = %d\n", #x, (x))

int main(void) {
    int a = 3;
    int b = 4;
    SHOW(a);
    SHOW(a + b);
    SHOW(a * b);
    SHOW(a * b + 1);
    return 0;
}
```
```output
a        = 3
a + b    = 7
a * b    = 12
a * b + 1 = 13
```

`SHOW(a * b + 1)` 打印的是 `a * b + 1 = 13`：左边是源码文本（`#x`），右边是表达式的值（`(x)`）。这正是调试时最想要的信息——出问题时你能一眼看出是哪个表达式、算出了什么。注意 `(x)` 外面的括号不能省：没有它，`SHOW(a + b)` 会变成 `printf("%s = %d", "a + b", a + b)` 里的 `a + b` 直接当第三个参数，虽然这里恰好没事，但宏参数不加括号的坑（上一节讲过）随时会咬人。

### 实战二：枚举值到名字的表
C 没有"把枚举值打印成名字"的内置能力。用 `#` 可以自动生成"值 → 名字"的对照表，而且**枚举常量和字符串永远保持同步**——加一个新常量只要在表里加一行，不会出现"改了枚举忘了改字符串"。

```c run id=sp-names
#include <stdio.h>

enum { COLOR_RED, COLOR_GREEN, COLOR_BLUE, COLOR_COUNT };

#define NAME_ENTRY(c) [c] = #c,
static const char *const color_names[] = {
    NAME_ENTRY(COLOR_RED)
    NAME_ENTRY(COLOR_GREEN)
    NAME_ENTRY(COLOR_BLUE)
};

int main(void) {
    for (int i = 0; i < COLOR_COUNT; i++) {
        printf("%d -> %s\n", i, color_names[i]);
    }
    return 0;
}
```
```output
0 -> COLOR_RED
1 -> COLOR_GREEN
2 -> COLOR_BLUE
```

这里同时用到了两件事：`#c` 把常量名变成字符串，`[c] = ...` 用常量本身当数组下标（所以顺序、缺项都不会错）。如果再配合 `##`，还能顺便生成函数名：`#define OP_ENTRY(n) { #n, op_##n }` 会把 `add` 变成 `"add"` 和 `op_add` 一对——下一节的题目就是这么做的。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra main.c -o main
./main

clang -std=c17 -Wall -Wextra main.c -o main
./main
```

`#` 和 `##` 的结果在预处理阶段就定型了，用 `-E` 看最直接：

```bash
# 可以直接看到 SHOW(a + b) 变成了 printf("%-8s = %d\n", "a + b", (a + b))
gcc -E -P main.c | tail -n 20
```

排查经验：

- 字符串化的结果"多了引号/少了引号"，用 `-E` 看一眼就知道 `#` 到底作用在哪一层；
- 拼接后报 `use of undeclared identifier`，说明粘出来的名字和你以为的不一样——把 `-E` 的输出搜一下这个名字；
- `-Wall -Wextra` 不会检查 `#`、`##` 的语义错误，拼接出错时通常是 `pasting formed invalid token`（编译错误），或者粘出一个"不存在的标识符"（编译或链接错误）。

## 常见错误

### 以为 `STR(MACRO)` 会展开宏
`#` 会**阻止**参数展开。`#define VERSION 3` 之后，`STR(VERSION)` 是 `"VERSION"` 而不是 `"3"`。必须写成两层：`#define XSTR(x) STR(x)`，然后调用 `XSTR(VERSION)`。

```c
#define STR(x)  #x
#define XSTR(x) STR(x)
#define VERSION 3

printf("%s\n", STR(VERSION));    /* 打印 VERSION */
printf("%s\n", XSTR(VERSION));   /* 打印 3 */
```

### 宏实参里带逗号
宏是按逗号切分实参的，**括号里的逗号不算分隔符，其余的逗号都算**。所以 `SHOW(f(1, 2))` 是一个实参（逗号在 `f(...)` 的括号里），而 `SHOW(1, 2)` 是两个实参：

```c run id=sp-comma expect=CE
#include <stdio.h>

#define SHOW(x) printf("%s\n", #x)

int main(void) {
    SHOW(1, 2);         /* 宏只接受一个参数，这里给了两个 */
    return 0;
}
```

报错是 `too many arguments provided to function-like macro invocation`。同样的问题会出现在"用花括号传初始化列表"的地方：`SHOW({1, 2})` 的逗号在花括号里，宏看不到配对，一样会被切成两个实参。想让带逗号的内容整体作为一个实参，最直接的办法是再加一层圆括号（`SHOW((1, 2))`，打印出来会带括号），或者把宏改成可变参数宏 `#define SHOW(...) #__VA_ARGS__`。

### 拼接出非法记号
`##` 要求拼完仍然是一个合法记号：

```c run id=sp-invalid expect=CE
#include <stdio.h>

#define BAD(a) a##+

int main(void) {
    printf("%d\n", BAD(1));
    return 0;
}
```

`1##+` 拼出来既不是数字也不是运算符，报 `pasting formed invalid token '+', an invalid preprocessing token`。同理，`##` 不能放在替换列表的两端（`#define BAD2(a) ##a` 也是编译错误）。

### 用 `#` 打印值，却以为打印了变量名
`#x` 得到的是**源码文本**，不是变量名，也不是值。`SHOW(v + 1)` 打印的是 `v + 1`，不会是 `v`；`SHOW(3)` 打印的是 `3`，也不会是某个变量名。如果想让调试输出带上"变量名"，只能把变量名和值两个参数都传进去，或者干脆用 `#x` 打印整个表达式。

### `#` 写在了错误的位置
`#` 只能出现在**函数宏的替换列表里、且后面紧跟一个参数名**：

```c run id=sp-misplace expect=CE
#define BAD(x) x #        /* # 后面不是参数 */
#define BAD2 #x           /* 对象宏里没有参数 */
```

两条都会报错（`'#' is not followed by a macro parameter`）。另外 `#` 和参数之间**不能有空格以外的任何东西**，`# x` 是合法的（空格允许），`#x + 1` 只把 `x` 字符串化。

## 客观题

### q-s6-stringify-paste-1 single
有

```c
#define STR(x)  #x
#define XSTR(x) STR(x)
#define VERSION 7
```

下面哪一组输出是正确的？

- [x] `STR(VERSION)` 是 `"VERSION"`，`XSTR(VERSION)` 是 `"7"`
  > 正确。`#` 会把参数"字符串化"且**不展开**它，所以内层 `STR(VERSION)` 得到字面记号 `VERSION`。`XSTR` 是两层宏：外层先把实参展开成 `7`，再传给内层 `STR(7)`，于是得到 `"7"`。这就是"要字符串化宏的值就必须套两层"的原因。
- [ ] `STR(VERSION)` 是 `"7"`，`XSTR(VERSION)` 也是 `"7"`
  > 错。`STR` 只有一层，`#` 阻止参数展开，所以拿到的是 `VERSION` 这个记号本身。把两层宏写反（`#define STR(x) XSTR(x)`）反而会绕成一个递归展开的错误。
- [ ] 两个都是 `"VERSION"`，因为 `#` 只认源码文本
  > 错。`#` 确实只认源码文本，但它认的是**传给这一层宏的实参文本**。`XSTR(VERSION)` 在进入内层之前，实参已经被外层展开成 `7` 了，所以内层看到的是 `7`。
- [ ] 两者都在运行时才决定，输出取决于 `VERSION` 变量的值
  > 错。`VERSION` 是宏，不是变量；`#` 和 `##` 全部发生在预处理阶段，编译之前就已经定型。运行时既没有 `VERSION` 这个名字，也没有字符串化的动作。
