---
id: s3-extern-multifile
---

## 讲解

### 分开编译：一个 .c 就是一个"翻译单元"
`gcc main.c stats.c -o app` 看起来是一条命令，实际做了两件事：

1. 把 `main.c`、`stats.c` **分别**预处理、编译、汇编，各得到一个目标文件 `main.o`、`stats.o`；
2. 链接器把所有 `.o` 和库拼起来，把每个"待填的名字"配上地址。

每个 `.c` 加上它 `#include` 进来的所有内容，合起来叫一个**翻译单元**（translation unit，TU）。编译器一次只看一个 TU，所以它无法知道另一个 `.c` 里有什么。两个 TU 之间的所有约定，只能靠三样东西：

- 头文件里的**声明**（告诉编译器"这个名字存在，类型是这样"）；
- 目标文件里的**定义**（真正分配存储、生成函数体的地方）；
- 链接器把前两者对上号。

这解释了一个反直觉的现象：`main.c` 调用一个只声明没定义的函数，**编译能过，链接才报错**。编译阶段只需要知道"有这么个函数、参数和返回值是什么类型"；地址是链接阶段才填的。

### 声明与定义：extern 声明的是"别人那里有一个"
| 写法 | 是什么 | 分配存储吗 | 产生符号吗 |
|---|---|---|---|
| `extern int g;` | 声明 | 不 | 不，只在用到时产生一个"待填"的引用 |
| `int g;` | 暂定义（tentative definition） | 是，零初始化 | 是，外部链接的定义 |
| `int g = 0;` | 定义 | 是 | 是，外部链接的定义 |
| `extern int g = 0;` | 定义（带 extern 也挡不住初始化器） | 是 | 是 |

注意最后一行：`extern` 的意思是"这个声明不分配存储"，但只要写了初始化器，它就变成定义——因为"初值"必须放在某块存储里，编译器只能就地分配。

```c run id=extern-with-init warnings=allow
#include <stdio.h>

extern int g_total = 42;   /* 带初始化器：这是定义，不是声明 */

int main(void) {
    printf("g_total = %d\n", g_total);
    return 0;
}
```
```output
g_total = 42
```

编译器还会就这一行给出一条警告：`warning: 'extern' variable has an initializer [-Wextern-initializer]`。它警告的正是这件事——你嘴上说"这个变量在别处"，手上却给了它一个初值，于是它不得不在这里分配存储。看到这条警告就把 `extern` 去掉。

`extern` 也可以写在函数里面，作用是"在这个块里引用文件作用域的那个变量"，最常见于避免在文件顶部重复声明：

```c run id=extern-block-scope
#include <stdio.h>

int g_total = 0;

static void add(int x) {
    extern int g_total;          /* 块作用域的 extern：指的就是上面那个 g_total */
    g_total += x;
}

int main(void) {
    add(3);
    add(4);
    printf("g_total = %d\n", g_total);
    return 0;
}
```
```output
g_total = 7
```

块作用域的 `extern` 声明不分配存储、也不影响链接属性，它只是把"这个名字在别处"这句话写在了函数里。日常写代码时，把它放在文件顶部或头文件里更清楚。

### 一个变量只能定义一次，但可以声明很多次
声明是"承诺"，重复多少遍都无所谓；定义是"兑现"，整个程序只能有一份。同一个 TU 里可以重复写暂定义（`int g;`），编译器会把它们合并成一个：

```c run id=extern-tentative
#include <stdio.h>

int g_a;          /* 暂定义 */
int g_a;          /* 又一次暂定义：同一个 TU 里合法，合并成一个 g_a */
int g_b;          /* 暂定义 */
int g_b = 7;      /* 正式定义：覆盖前面的暂定义，最终 g_b = 7 */

int main(void) {
    printf("g_a = %d, g_b = %d\n", g_a, g_b);
    return 0;
}
```
```output
g_a = 0, g_b = 7
```

但两份**带初值**的定义是绝对不行的，编译器当场就拦下来：

```c run id=extern-redefine expect=CE
#include <stdio.h>

int g = 1;
int g = 2;                /* 错误：redefinition of 'g' */

int main(void) {
    printf("%d\n", g);
    return 0;
}
```

### 为什么"暂定义"以前能混过去，现在不行了
上面的 `int g;` 重复写在同一文件里是合法的，那写在头文件里、被两个 `.c` 包含呢？历史上很多程序靠这个"混"过去：早期 GCC 用 `-fcommon`（默认），把没有初值的全局变量当成"公共符号"（common symbol），链接器看到多个同名公共符号就把它们合并成一份。

但 GCC 10、Clang 11 起，默认改成了 `-fno-common`：`int g;` 就是一个**确定的外部定义**，两个 TU 各来一份，链接器直接报 `duplicate symbol: g`。这个改动当年让不少老项目链接失败，也说明了一件事：**靠编译器的宽容写代码是靠不住的，头文件里就不该出现变量定义。**

### 声明了却没有定义：undefined reference
这是链接错误里最常见的一种。下面的程序**编译完全通过**——第 3 行用 `extern` 打了招呼，编译器认可 `g_missing` 这个词；但整个程序没有任何地方真正给它分配存储：

```c run id=extern-undefined expect=CE
#include <stdio.h>

extern int g_missing;     /* 只有声明，没有定义 */

int main(void) {
    printf("%d\n", g_missing);
    return 0;
}
```

链接器的话很直白：GCC/ld 是 `undefined reference to 'g_missing'`，LLVM/lld 是 `undefined symbol: g_missing`。它甚至能告诉你"是谁在引用它"（`referenced by main.c`）。函数也是同样的道理：只声明、不定义，或者定义它的 `.c` 根本没加进编译命令，都会得到这个错误。

### 函数默认就是外部链接的，声明可以重复
C 标准规定：文件作用域的**函数**声明如果不写存储类说明符，就等价于写了 `extern`。所以 `extern int twice(int);` 和 `int twice(int);` 是一回事，重复声明几遍也没问题——只要定义只有一份：

```c run id=extern-function-decl
#include <stdio.h>

int twice(int x);          /* 声明：默认就是 extern */
int twice(int x);          /* 重复声明：合法 */
extern int twice(int x);   /* 再加一个 extern：还是同一个意思 */

int twice(int x) {         /* 定义只有这一份 */
    return 2 * x;
}

int main(void) {
    printf("%d\n", twice(21));
    return 0;
}
```
```output
42
```

这也解释了头文件的标准用法：头文件里放**函数声明和 extern 变量声明**，定义放在对应的 `.c` 里。头文件被多少个 `.c` 包含都没关系，声明重复一万遍也不产生符号。

### 多文件工程的正确结构
一个"统计模块"通常长这样，三个文件各司其职：

```c
/* stats.h —— 只放声明，被所有需要它的 .c 包含 */
#ifndef STATS_H
#define STATS_H

extern const int STATS_LIMIT;          /* 变量：声明 */
long long stats_sum(const int *a, int n);   /* 函数：声明 */
int stats_max(const int *a, int n);

#endif
```

```c
/* stats.c —— 定义，每个只出现一次 */
#include "stats.h"

const int STATS_LIMIT = 100000;        /* 唯一的定义 */

long long stats_sum(const int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) s += a[i];
    return s;
}
```

```c
/* main.c —— 使用者 */
#include <stdio.h>
#include "stats.h"

int main(void) {
    int a[3] = {1, 2, 3};
    printf("%lld\n", stats_sum(a, 3));
    return 0;
}
```

编译时必须把**两个 `.c` 都写进命令**：`gcc main.c stats.c -o app`。只写 `main.c` 就会得到 `undefined reference to 'stats_sum'`——头文件只提供声明，它不会把 `stats.c` 的内容拉进来。这是初学者最常犯的链接错误，没有之一。

### 两个 .c 都定义同一个变量会怎样
链接器只能接受一份定义，因为如果接受两份，程序里就会有两个 `g_total`，`main.c` 改的那个和 `stats.c` 读的那个不是同一个对象，共享状态直接分裂。所以链接器的策略是"宁可报错，也不猜你要哪一个"：

- GCC/ld：`multiple definition of 'g_total'`
- LLVM/lld：`duplicate symbol: g_total`

看到这个错误不要去改代码逻辑，先找"哪个变量或函数被定义了两次"，通常就是"定义写在了头文件里"或者"把某个 `.c` 重复加进了编译命令"。

### 链接顺序：.c/.o 的顺序基本无关，库的顺序有关
`gcc main.c stats.c -o app` 和 `gcc stats.c main.c -o app` 结果一样——链接器会先把所有 `.o` 收进来，再统一解析符号。但用静态库（`.a`）时顺序就重要了：链接器从左到右扫一遍，遇到未解析的符号才去后面的库里找，所以库要放在使用它的目标文件**后面**。这一点以后用第三方库时会遇到，现在只要记住"自己的 `.c` 文件顺序无所谓，库放后面"就够用了。

## 编译与运行

```bash
# 一步到位：所有 .c 一起编译并链接。头文件不出现在命令里，它们由 #include 粘贴进 .c
gcc -std=c17 -Wall -Wextra main.c stats.c -o app
./app

# 分步做，方便只重编改动过的文件
gcc -std=c17 -Wall -Wextra -c main.c        # → main.o
gcc -std=c17 -Wall -Wextra -c stats.c       # → stats.o
gcc main.o stats.o -o app

# 头文件不在当前目录时，用 -I 告诉编译器去哪里找
gcc -std=c17 -Wall -Wextra -Iinclude main.c stats.c -o app
```

本平台使用 Clang，命令等价：

```bash
clang -std=c17 -Wall -Wextra main.c stats.c -o app
clang -std=c17 -Wall -Wextra -c main.c
```

排查链接问题的两把利器：

```bash
llvm-nm main.obj     # Windows（本平台自带）；Linux/macOS 用 nm main.o
```

- `U stats_sum`：`main.c` 要用它，但 `main.c` 里没有定义——只要链接时没人提供，就是 `undefined reference`；
- `T stats_sum`：这个目标文件提供了定义。

如果 `nm` 里明明有 `T`，链接却还说找不到，那就去看编译命令——十有八九是那个 `.c` 根本没参加编译。

另外提醒一句：`-fcommon` / `-fno-common` 决定"没有初值的全局变量"能不能被多个目标文件重复定义。现代工具链默认 `-fno-common`，别依赖它。

## 常见错误

### 把变量定义写进头文件 [CE]
`stats.h` 里写 `int g_limit = 100;`，`main.c` 和 `stats.c` 都包含它 → 两个 TU 各有一份带初值的定义 → `duplicate symbol: g_limit`。头文件里应该写 `extern int g_limit;`，把 `int g_limit = 100;` 放进某一个 `.c`。

### 编译时漏掉定义所在的 .c 文件 [CE]
`gcc main.c -o app`（漏了 `stats.c`）→ 编译全部通过，链接报 `undefined reference to 'stats_sum'`。看到 `undefined reference` 先检查编译命令里有没有那个 `.c`，再检查名字拼写，最后才怀疑代码。

### 只声明、忘了定义 [CE]
```c run id=err-extern-nodef expect=CE
#include <stdio.h>

extern int g_limit;       /* 声明了，但整个工程里没有 int g_limit = ... */

int main(void) {
    printf("limit = %d\n", g_limit);
    return 0;
}
```
`extern` 只是承诺，不是兑现。声明和定义必须成对出现：声明可以在很多地方，定义只能有一次。

### 以为 extern 修饰的变量"不占空间" [OK]
`extern int g = 10;` 是**定义**：初始化器让它必须落到某块存储里。`extern` 在带初值时完全不影响"这是定义"这个事实。真正只有声明作用的是不带初值的 `extern int g;`。

### 以为 multiple definition 是编译错误 [CE]
`multiple definition` / `duplicate symbol` 都是**链接**阶段的报错。编译器一次只看一个 TU，它根本不知道另一个 `.c` 里也定义了 `g_limit`。所以看到这个错误，要检查的是"哪些文件参与了链接、谁重复定义了"，而不是去改语法。

## 客观题

### q-s3-extern-multifile-1 single
`config.h` 里写了一行 `int g_limit = 100;`，`main.c` 和 `stats.c` 都 `#include "config.h"`，然后一起链接。结果是？

- [x] 编译能过，链接时报重复定义（`multiple definition of 'g_limit'` / `duplicate symbol: g_limit`）
  > 正确。`#include` 是文本粘贴：两个 TU 各得到一份带初值的定义，各自的目标文件里都有一个外部符号 `g_limit`。链接器只接受一份定义，于是报错。
- [ ] 编译错误：头文件里不允许定义变量
  > 语法上完全允许，`config.h` 单独看是一段合法的 C。问题不在语法，而在"同一份定义被粘贴进了两个翻译单元"，所以错误出现在链接阶段。
- [ ] 正常：两份同名定义会被自动合并成一个
  > 带初值的定义从来不会自动合并。早期 `-fcommon` 只对**没有初值**的暂定义宽容（当成公共符号合并），而现代 GCC 10 / Clang 11 起默认 `-fno-common`，连暂定义也不合并了。
- [ ] 链接错误：`undefined reference to 'g_limit'`
  > 方向反了。`undefined reference` 是"只有声明、没人定义"；这里恰恰是定义了两份。正确写法是头文件里 `extern int g_limit;`，再在某个 `.c` 里写唯一的一份 `int g_limit = 100;`。
