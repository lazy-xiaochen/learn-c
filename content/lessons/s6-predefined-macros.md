---
id: s6-predefined-macros
---

## 讲解

### 编译器自带的一批宏
除了你自己 `#define` 的宏，编译器还会**预定义**一批宏。它们不需要 `#include` 任何头文件，在预处理阶段就已经有值了，常用于日志、断言、跨平台判断：

| 宏 | 类型 | 展开成什么 |
|---|---|---|
| `__FILE__` | 字符串字面量 | 当前源文件的名字（**编译器看到的那个路径**） |
| `__LINE__` | 整数常量 | 当前行号（宏**被使用**的那一行） |
| `__DATE__` | 字符串字面量 | 编译日期，形如 `"Nov 25 2026"`（固定 11 个字符） |
| `__TIME__` | 字符串字面量 | 编译时刻，形如 `"14:03:21"` |
| `__func__` | **标识符**（不是宏） | 当前函数的函数名 |
| `__STDC__` | 整数常量 | 1，表示是标准 C 编译器 |
| `__STDC_VERSION__` | 整数常量 | 标准版本：C17 是 `201710L`，C11 是 `201112L` |
| `__STDC_HOSTED__` | 整数常量 | 1 表示有完整标准库（本平台是 1） |

```c run id=pm-basic
#include <stdio.h>

static void report(void) {
    printf("report: file=%s line=%d func=%s\n", __FILE__, __LINE__, __func__);
}

int main(void) {
    printf("file = %s\n", __FILE__);
    printf("line = %d\n", __LINE__);
    printf("func = %s\n", __func__);
    printf("stdc = %ld, version = %ld, hosted = %d\n",
           (long)__STDC__, (long)__STDC_VERSION__, (int)__STDC_HOSTED__);
    report();
    return 0;
}
```
```output
file = main.c
line = 9
func = main
stdc = 1, version = 201710, hosted = 1
report: file=main.c line=4 func=report
```

三条值得注意的地方：

- `__FILE__` 只打印了 `main.c`，**没有目录**。因为它展开的是"编译器命令行上写的那个路径"——编译时用的是相对路径 `main.c`，所以只有文件名；如果你写 `clang src/main.c`，它就会是 `src/main.c`。**不要假设 `__FILE__` 里一定有目录，也不要假设它一定没有**；
- `__LINE__` 是"这一行"的行号：`main` 里的那个是 9，`report` 里的那个是 4。它展开成整数，所以能用 `%d` 打印，也能参与算术；
- `__func__` 在不同函数里展开成不同的字符串，这点和宏完全不同——它由编译器在**每个函数体**里自动插入。

### `__FILE__` 和 `__LINE__` 的三个使用陷阱
**第一，行号会随文件布局变化。** 你加一行注释、删一个空行，`__LINE__` 的值就变了。所以它适合写进**给人看的日志**，不适合写进**要求稳定的输出**：如果一道题要求输出 `main.c:9: ...`，那任何人只要多写一个空行就会错——判题器不会这么出题，你自己也不该把行号写进需要比对的结果里。

**第二，在头文件里用 `__LINE__`，拿到的是头文件里的行号。** 如果你在 `log.h` 里写 `#define LOG(...) printf("%s:%d", __FILE__, __LINE__, ...)`，那么 `__LINE__` 在**调用处**展开（宏是在调用处展开的），得到的行号是调用者的行号——这正是日志宏想要的效果。但如果 `LOG` 里又调用了另一个普通函数，那个函数里的 `__LINE__` 就是它自己的行号了。

**第三，`__FILE__` 的内容取决于编译命令。** 同一个文件，用 `clang main.c` 编译是 `main.c`，用 `clang ./main.c` 编译可能是 `./main.c`，用绝对路径编译就是完整路径。把 `__FILE__` 写进程序输出时，先确认构建方式；本平台的判题器用相对路径编译，所以它稳定地是 `main.c`。

```c run id=pm-filepath
#include <stdio.h>
#include <string.h>

int main(void) {
    const char *f = __FILE__;
    int has_sep = (strchr(f, '/') != NULL) || (strchr(f, '\\') != NULL);
    printf("__FILE__ = %s\n", f);
    printf("是否带目录: %s\n", has_sep ? "是" : "否");
    return 0;
}
```
```output
__FILE__ = main.c
是否带目录: 否
```

### `__func__` 是标识符，不是宏
`__func__` 经常被误认为是"又一个预定义宏"，但它不是。标准规定：编译器在每个函数体开头**隐式声明**一个

```c
static const char __func__[] = "函数名";
```

所以它是一个**数组**（不是指针，也不是宏）。这带来两个可观察的后果：

- `sizeof(__func__)` 是"函数名长度 + 1"（末尾的 `'\0'`），`strlen(__func__)` 才是长度；
- `#ifdef __func__` 永远是假——预处理阶段没有这个宏，`#ifdef` 当然看不到它。

```c run id=pm-func
#include <stdio.h>
#include <string.h>

static void show(void) {
    printf("sizeof(__func__) = %zu, strlen = %zu\n", sizeof(__func__), strlen(__func__));
}

int main(void) {
    show();
#ifdef __func__
    printf("__func__ 是一个宏\n");
#else
    printf("__func__ 不是宏：预处理阶段看不到它\n");
#endif
    return 0;
}
```
```output
sizeof(__func__) = 5, strlen = 4
__func__ 不是宏：预处理阶段看不到它
```

`show` 这个名字是 4 个字符，`sizeof` 得到 5（含 `'\0'`），说明 `__func__` 确实是一个字符数组。这个细节在写"通用打印宏"时很有用：数组能直接传给 `%s`，也能用 `sizeof` 拿到编译期长度。

### 实战：带文件名、行号、函数名的日志宏
把 `__FILE__`、`__LINE__`、`__func__` 和可变参数宏拼起来，就是最常用的调试日志宏：

```c
#define LOG(fmt, ...) \
    printf("[%s:%d %s] " fmt "\n", __FILE__, __LINE__, __func__, __VA_ARGS__)
```

`fmt` 和后面的 `...` 用相邻字符串拼接（`"[%s:%d %s] " fmt "\n"`）接成一条格式串，`__VA_ARGS__` 把可变参数原样传下去。因为 `LOG` 是在**调用处**展开的，`__LINE__` 和 `__func__` 拿到的正是调用者的位置——这就是日志能精确指到出错行的原因。

```c run id=pm-log
#include <stdio.h>

#define LOG(fmt, ...) printf("[%s:%d %s] " fmt "\n", __FILE__, __LINE__, __func__, __VA_ARGS__)

static int divide(int a, int b) {
    if (b == 0) {
        LOG("跳过除零: a=%d b=%d", a, b);
        return 0;
    }
    return a / b;
}

int main(void) {
    printf("divide(10, 2) = %d\n", divide(10, 2));
    printf("divide(3, 0) = %d\n", divide(3, 0));
    return 0;
}
```
```output
divide(10, 2) = 5
[main.c:7 divide] 跳过除零: a=3 b=0
divide(3, 0) = 0
```

日志里出现了 `main.c:7` 和 `divide`：文件、行号、函数名全部来自**调用 LOG 的那一行**，不需要手写。这正是 `assert` 的实现思路——`assert` 在失败时会打印"表达式 + 文件 + 行号"，用的就是这三个预定义标识符。

### 标准版本判断与"可重复构建"
`__STDC_VERSION__` 用来判断当前编译的是哪个标准，跨编译器的兼容代码几乎都会用到：

```c
#if __STDC_VERSION__ >= 201112L
/* C11 才有的特性可以用 */
#else
/* 退回老写法 */
#endif
```

而 `__DATE__` / `__TIME__` 要**谨慎使用**：它们每次编译都会变，一旦写进程序里（比如版本号字符串），同一个源码每次编出来的二进制就不同，这会让"构建可重复"（reproducible build）失效，也会让目标文件缓存失效。它们适合"人看的构建信息"，不适合需要稳定比对的输出。

```c run id=pm-version
#include <stdio.h>

int main(void) {
#if __STDC_VERSION__ >= 201112L
    printf("支持 C11 及以上\n");
#else
    printf("C11 之前\n");
#endif

    char stamp[] = __DATE__;         /* 形如 "Nov 25 2026"，固定 11 个字符 */
    printf("sizeof(__DATE__) = %zu\n", sizeof(stamp));
    printf("__TIME__ 的长度 = %zu\n", sizeof(__TIME__) - 1);
    return 0;
}
```
```output
支持 C11 及以上
sizeof(__DATE__) = 12
__TIME__ 的长度 = 8
```

`sizeof(__DATE__)` 是 12（11 个字符 + `'\0'`），`__TIME__` 是 `"HH:MM:SS"` 共 8 个字符，这些长度是标准规定的，可以放心用来做缓冲区大小——但**内容**每次编译都不同，所以别把它写进判题输出。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra main.c -o main
./main

clang -std=c17 -Wall -Wextra main.c -o main
./main
```

看预定义宏被替换成了什么，用 `-E`：

```bash
# __LINE__ 会变成数字，__FILE__ 会变成字符串字面量
gcc -E -P main.c | tail -n 20

# 列出编译器预定义的所有宏（包括 __STDC_VERSION__、平台宏等）
gcc -dM -E -x c /dev/null | findstr STDC

# 确认当前用的是哪个标准
clang -std=c17 -dM -E -x c /dev/null | findstr __STDC_VERSION__
```

`-DNDEBUG` 是另一个和预定义宏密切相关的开关：定义了它之后，`<assert.h>` 里的 `assert` 会展开成"什么都不做"，发布版本通常这么编译：

```bash
gcc -std=c17 -O2 -DNDEBUG main.c -o main
```

注意 `assert` 的表达式在 `NDEBUG` 下**完全不求值**，所以千万不要在 `assert` 里写有副作用的代码（`assert(init() == 0)` 在发布版本里不会调用 `init`）。

## 常见错误

### 以为 `__FILE__` 一定带完整目录
`__FILE__` 的内容就是"编译器命令行里写的那个路径"。用 `clang main.c` 编译只有 `main.c`，用 `clang src/main.c` 就是 `src/main.c`。所以：

- 不要拿 `__FILE__` 去做"路径拼接"（可能是相对路径）；
- 不要把 `__FILE__` 写进需要稳定比对的输出（换个构建方式就变了）；
- 想把日志里的文件名缩短，可以自己截取最后一个分隔符之后的部分。

```c run id=pm-basename
#include <stdio.h>
#include <string.h>

static const char *base_name(const char *path) {
    const char *slash = strrchr(path, '/');
    const char *backslash = strrchr(path, '\\');
    const char *last = slash > backslash ? slash : backslash;   /* 取更靠后的那个 */
    return last ? last + 1 : path;
}

int main(void) {
    printf("__FILE__       = %s\n", __FILE__);
    printf("只取文件名     = %s\n", base_name(__FILE__));
    printf("__func__ 在这里 = %s\n", __func__);
    return 0;
}
```
```output
__FILE__       = main.c
只取文件名     = main.c
__func__ 在这里 = main
```

### 把行号写进要和别人比对的输出
`__LINE__` 的值取决于你自己的文件布局：多加一行注释、删掉一个空行，所有行号都会变。所以它适合写进**日志**（人看），不适合写进**需要比对的结果**（机器看）。如果一道题要求输出里带行号，那几乎必然是题目写错了或者理解错了。

### 用 `#ifdef __func__` 判断函数名
`__func__` 不是宏，预处理阶段根本不存在，`#ifdef __func__` 永远是假。同理 `#ifdef __LINE__` 也是假。`__FILE__`、`__LINE__`、`__DATE__`、`__TIME__` 虽然是模板里定义的"预定义宏"，但它们**不能被 `#undef` 掉，也不能被 `#ifdef` 判断**（标准把它们列为预定义宏，但它们的名字不是普通的宏名；实现上 `#ifdef __LINE__` 通常为假，不能依赖）。

想判断"是不是在某个函数里"，只能在运行时比较字符串；想按函数分支，得自己定义宏。

### 在头文件里用 `__LINE__` 却期望拿到调用者的行号
`__LINE__` 是在**宏展开的位置**求值的。如果 `log.h` 里定义的是函数（而不是宏）：

```c
/* log.h —— 这样写行号永远是 log.h 里的那一行 */
static void log_msg(const char *m) {
    printf("%s:%d %s\n", __FILE__, __LINE__, m);   /* 永远是 log.h 的行号 */
}
```

无论谁调用 `log_msg`，打印出来的都是 `log.h` 里的行号，日志就失去了定位价值。正确做法是把日志写成**宏**（在调用处展开），或者把 `__FILE__`/`__LINE__` 作为参数传进去。

### 依赖 `__DATE__` / `__TIME__` 做可重复构建
同一个源码，今天和明天编译出来的二进制不一样，因为 `__DATE__` 变了。这会破坏"同样的源码 → 同样的二进制"的可重复构建，也会让增量编译的缓存失效。把构建时间写进版本字符串是可以的（人看），但不要让它参与任何需要稳定比对的逻辑。

## 客观题

### q-s6-predefined-macros-1 single
某程序里写了 `printf("%s:%d %s\n", __FILE__, __LINE__, __func__);`，关于这三个标识符的说法哪一个是正确的？

- [x] `__FILE__` 是字符串字面量、`__LINE__` 是整数常量，它们由预处理阶段替换；`__func__` 不是宏，而是编译器在每个函数体里隐式定义的 `static const char __func__[]`
  > 正确。`__FILE__`、`__LINE__` 属于预定义宏，预处理阶段就被替换成"编译器看到的文件名"和"这一行的行号"；`__func__` 则是标准规定的隐式数组，在函数体内可见，所以 `#ifdef __func__` 为假、`sizeof(__func__)` 能拿到函数名长度加一。
- [ ] 三个都是预定义宏，都由预处理阶段替换
  > 错。`__func__` 不是宏：预处理阶段没有它，`#ifdef __func__` 永远为假。它是函数体内的隐式字符数组，属于编译阶段的语义。
- [ ] `__FILE__` 一定包含完整的绝对路径，`__LINE__` 是文件的总行数
  > 错。`__FILE__` 只是"编译器命令行上写的那个路径"（本平台用相对路径编译，所以是 `main.c`）；`__LINE__` 是**当前这一行**的行号，不是总行数。
- [ ] `__LINE__` 是运行时的变量，可以用 `&__LINE__` 取地址
  > 错。`__LINE__` 是整数常量，没有存储空间，`&__LINE__` 展开成 `&数字`，编译错误。同理 `__FILE__` 是字符串字面量，`&__FILE__` 拿到的是指针常量的地址，不是"文件名的地址"这种有意义的东西。
