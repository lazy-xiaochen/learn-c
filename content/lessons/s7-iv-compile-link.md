---
id: s7-iv-compile-link
---

## 讲解

### 口述版答案
面试官问"从 .c 到可执行文件经历了什么"，按四阶段 + 三个关键词回答：

1. **预处理（.c → .i）**：展开 `#include`、替换宏、处理 `#if` 条件编译、去掉注释。产物仍是 C 代码，只是变长了。
2. **编译（.i → .s）**：词法/语法/语义分析、类型检查、优化，生成汇编。**这一阶段只看单个翻译单元**，所以它只要求"函数有声明"，不要求"有定义"。
3. **汇编（.s → .o）**：把汇编翻成机器码，生成**目标文件**；此时外部函数/变量的地址还不知道，先留空位并记一张**重定位表**。
4. **链接（.o + 库 → 可执行文件）**：符号解析（每个引用的名字都要找到唯一一份定义）+ 重定位（把真实地址填回空位）+ 合并段。产物才是能跑的程序。
5. **三个关键词**：**符号**（名字）、**重定位**（占位待填）、**一个定义规则**（ODR：全局符号全工程只能有一份定义，声明可以有很多份）。
6. **两类链接错误**：`undefined reference` = 少定义（链接期）；`multiple definition / duplicate symbol` = 多定义（链接期）；同一个文件里出现两份定义则是编译期的 `redefinition`。

一句收尾：**编译期管"语法和类型"，链接期管"名字和地址"**——所以"函数名拼错"和"头文件里写定义"这两种错误，都要到链接期才爆。

### 代码版答案
第一段：预处理做了什么。宏替换、条件编译、`#` 字符串化、`##` 连接、`__LINE__`/`__FILE__`/`__STDC_VERSION__` 这些预定义宏，全都在这一阶段展开：

```c run id=cl-preprocess
#include <stdio.h>

#define STR(x) #x
#define XSTR(x) STR(x)
#define SQUARE(n) ((n) * (n))
#define VERSION 3

int main(void) {
#if VERSION >= 3
    const char *stage = "预处理：条件编译保留了这一段";
#else
    const char *stage = "这段不会出现在结果里";
#endif
    printf("%s\n", stage);
    printf("SQUARE(2 + 3) = %d\n", SQUARE(2 + 3));
    printf("XSTR(VERSION) = %s\n", XSTR(VERSION));
    printf("__STDC_VERSION__ = %ld\n", __STDC_VERSION__);
    printf("__FILE__ = %s, __LINE__ = %d\n", __FILE__, __LINE__);
    return 0;
}
```
```output
预处理：条件编译保留了这一段
SQUARE(2 + 3) = 25
XSTR(VERSION) = 3
__STDC_VERSION__ = 201710
__FILE__ = main.c, __LINE__ = 18
```

第二段：编译阶段关心的事——类型、声明、存储期。`next_id` 的**声明在调用之前、定义在调用之后**，编译器靠声明就能通过检查；而 `static` 变量有静态存储期，函数返回后它依然存在：

```c run id=cl-compile
#include <stdio.h>

static int counter;                /* 静态存储期：函数返回后依然存在 */

static int next_id(void);          /* 先声明，定义写在后面 */

int main(void) {
    printf("sizeof(int) = %zu\n", sizeof(int));
    printf("first  = %d\n", next_id());
    printf("second = %d\n", next_id());
    printf("counter = %d\n", counter);
    return 0;
}

static int next_id(void) {
    counter += 1;
    return counter;
}
```
```output
sizeof(int) = 4
first  = 1
second = 2
counter = 2
```

第三段：链接阶段做的事——**符号解析 + 重定位**。编译器不知道被调函数最终在哪个地址，它只留一个"名字 → 待填地址"的坑；链接器把每个名字解析成唯一地址后填回去。下面用函数指针表模拟这张符号表：

```c run id=cl-link
#include <stdio.h>

/* 链接器做的事：把"名字"解析成"地址"。这里用函数指针表模拟符号表 */
static int add(int a, int b) {
    return a + b;
}

static int mul(int a, int b) {
    return a * b;
}

typedef int (*binop)(int, int);

int main(void) {
    binop table[2] = { add, mul };
    const char *names[2] = { "add", "mul" };

    for (int i = 0; i < 2; i++) {
        printf("%s(3, 4) = %d\n", names[i], table[i](3, 4));
    }
    printf("table[0] == add 吗？%s\n", table[0] == add ? "是" : "不是");
    return 0;
}
```
```output
add(3, 4) = 7
mul(3, 4) = 12
table[0] == add 吗？是
```

第四段：如果链接器找不到定义，就是 `undefined reference`。下面这段代码只声明、没定义，**编译能通过、链接会失败**（本平台把链接失败也归为 CE）：

```c run id=cl-undefined expect=CE
#include <stdio.h>

extern int module_total;   /* 只是声明：告诉编译器"别处有这个名字" */

int main(void) {
    printf("total = %d\n", module_total);
    return 0;
}
```

第五段：反过来，如果同一个翻译单元里出现了两份定义，就是编译期的 `redefinition`。把"头文件正文"写成一个宏再展开两次，就能在单文件里重现这个错误（真实工程里是头文件忘了写 include guard）：

```c run id=cl-redefinition expect=CE
#define HEADER_BODY int shared_counter = 0;   /* 相当于把定义写进了头文件 */
HEADER_BODY                                  /* 第一次"包含" */
HEADER_BODY                                  /* 第二次"包含" */
int main(void) {
    return shared_counter;
}
```

### 四个阶段各自产出什么
把四个阶段和产物背成一条线，面试时能顺着说下去：

| 阶段 | 输入 | 输出 | 谁来做 | 典型错误 |
|---|---|---|---|---|
| 预处理 | `.c` | `.i`（还是 C 代码） | 预处理器 | `#include` 找不到头文件、宏展开错误 |
| 编译 | `.i` | `.s`（汇编） | 编译器 | 语法错误、类型错误、隐式声明 |
| 汇编 | `.s` | `.o`（目标文件） | 汇编器 | 基本没有（汇编由编译器生成） |
| 链接 | `.o` + 库 | 可执行文件 | 链接器 | `undefined reference`、`multiple definition` |

三个容易记混的点：

- **`.o` 不是可执行文件**：它里面还有未填的地址（重定位项），单独运行会失败；
- **头文件不参与编译**：它只是被 `#include` 原样"贴"进 `.c`，所以头文件里写定义等于在每个包含它的 `.o` 里各生成一份；
- **库是"一堆 .o 的打包"**：静态库 `.a`/`.lib` 在链接期被挑出用到的成员复制进可执行文件；动态库 `.so`/`.dll` 只记录"运行时去加载"，所以程序启动时才需要它。

### 符号、声明与定义：链接器眼里的三个概念
- **声明（declaration）**：告诉编译器"这个名字存在，类型是这样"，不分配存储。`extern int g;`、函数原型都是声明，可以出现任意多次；
- **定义（definition）**：真正分配存储或给出函数体，全工程**只能有一份**（`static` 的内部链接符号除外，每个翻译单元可以各有一份）；
- **符号（symbol）**：目标文件里"名字 + 地址 + 类型"的记录。用 `nm` 能直接看到：`T` 是代码段里的定义，`U` 是未定义（等着链接器去别处找），`D`/`B` 是数据段/未初始化数据段里的定义。

一个变量可以"先声明多次、最后定义一次"，这就是头文件里只放 `extern` 声明的原因：

```c
/* config.h：只声明，所有 .c 都能看到 */
extern const int LIMIT;

/* config.c：唯一的一份定义 */
const int LIMIT = 100;
```

如果反过来，把头文件写成 `const int LIMIT = 100;`，那么每个包含它的 `.c` 都会定义一次 `LIMIT`——C 语言里文件作用域的 `const` 默认是**外部链接**（这一点和 C++ 不同），链接器看到多份同名强符号，直接报 `duplicate symbol`。

### 静态库与动态库
| | 静态库 | 动态库 |
|---|---|---|
| Linux 后缀 | `.a` | `.so` |
| Windows 后缀 | `.lib` | `.dll` |
| 链接时机 | 链接期把用到的目标代码**复制**进可执行文件 | 链接期只记录依赖，**运行时加载** |
| 可执行文件大小 | 大 | 小 |
| 升级库 | 必须重新链接 | 换掉 `.dll`/`.so` 即可（ABI 兼容时） |
| 部署 | 单文件即可 | 必须带上库文件，或装到系统路径 |

构建静态库的两条命令（Linux/macOS 风格，Windows 用 `llvm-ar`/`lib` 类似）：

```bash
gcc -c stats.c -o stats.o
ar rcs libstats.a stats.o
gcc main.c libstats.a -o app
```

### 为什么链接错误比编译错误难查
编译错误会精确指到行和列，链接错误只给你一个**符号名**。排查顺序建议固定成三步：

1. **看名字**：报错里的符号名和源码里的拼写逐字对照（`stats_avg` vs `stats_average` 只差几个字母）；
2. **看有没有定义**：`nm` 目标文件，`U` 表示未定义；确认定义所在的 `.c` 真的参与了编译和链接；
3. **看链接了几份**：`duplicate symbol` 说明有两个 `.o` 都提供了强定义，通常是头文件里写了定义、或者同一个 `.c` 被编译了两次。

## 编译与运行

本平台使用 Clang（x86-64 Windows，UCRT）。先看四个阶段各自的一条命令：

```bash
# 1. 预处理：只展开宏和 #include，产物还是 C 代码
clang -std=c17 -E main.c -o main.i

# 2. 编译：C → 汇编
clang -std=c17 -S main.i -o main.s

# 3. 汇编：汇编 → 目标文件
clang -std=c17 -c main.s -o main.o

# 4. 链接：目标文件 + 库 → 可执行文件
clang main.o -o app
```

一步到位就是平时最常用的写法：

```bash
gcc -std=c17 -Wall -Wextra main.c stats.c -o app
```

```bash
clang -std=c17 -Wall -Wextra main.c stats.c -o app
```

查看目标文件里的符号，用 `nm`：

```bash
clang -std=c17 -c stats.c -o stats.o
nm stats.o
```

输出大致是（`T` = 代码段定义，`U` = 未定义、等链接器找）：

```text
0000000000000000 T stats_avg
0000000000000000 T stats_sum
                 U printf
                 U scanf
```

两种典型链接错误长这样。**undefined reference**（GCC/ld 的叫法；LLVM/lld 叫 `undefined symbol`）：

```text
ld.lld: error: undefined symbol: stats_avg
>>> referenced by main.o:(main)
clang: error: linker command failed with exit code 1
```

**duplicate symbol**（GCC/ld 叫 `multiple definition`）：

```text
ld.lld: error: duplicate symbol: STATS_TOP
>>> defined at ./stats.h:5
>>>            stats.o
>>> defined at ./stats.h:5
>>>            main.o
clang: error: linker command failed with exit code 1
```

几点说明：

- 注意 `>>> defined at ./stats.h:5` 这种提示——**问题出在头文件**，而不是某个 `.c`；
- 编译时加 `-Wl,--trace-symbol=名字` 可以看链接器怎么解析这个符号；
- `objdump -d app` 能看到重定位完成后的真实地址，对比 `.o` 里的占位值就能理解"重定位"到底填了什么；
- 链接顺序在 GNU ld 上有讲究：库要放在使用它的目标文件**之后**（`gcc main.o -lstats`），否则可能报未定义；lld 宽松一些，但跨平台时按"使用者在前、库在后"来写最稳。

## 常见错误

### 把变量定义写进头文件 [CE]
头文件被多个 `.c` 包含时，每个 `.o` 都会生成一份定义，链接器报 `duplicate symbol`。如果同一个 `.c` 里包含了两次（没有 include guard），则更早地在编译期报 `redefinition`。**头文件里只放声明：`extern` 变量、函数原型、类型、宏。**

### 只声明不定义 [CE]
`extern int module_total;` 只是告诉编译器有这个名字，链接器在所有 `.o` 和库里都找不到它的定义时就会报 `undefined reference`。函数名拼错、定义所在的 `.c` 忘了加进编译命令，症状完全一样。

### 以为 `static` 是"只初始化一次" [WA]
`static` 修饰局部变量时，改变的是**存储期**（整个程序运行期间都存在），初始化确实只做一次；但 `static` 修饰全局变量/函数时，改变的是**链接属性**（内部链接，别的翻译单元看不见）。两件事别混：`static int x = 0;` 里那个 `= 0` 只执行一次，是因为静态存储期的对象在程序启动时就已经初始化完了，不是因为 static 有"锁"。

### 以为 `#include` 是"链接" [WA]
`#include` 是预处理阶段的**文本粘贴**，和链接毫无关系。头文件里只有声明时，它不会带来任何代码；真正把实现接进来的是链接器。反过来，头文件里放了函数定义（非 `static`、非 `inline`），包含它的每个 `.c` 都会各生成一份代码，于是 `duplicate symbol`。

### 用 `inline` 函数定义在头文件里却不加 `static` [CE]
C99 的 `inline` 语义很容易踩坑：头文件里的 `inline` 函数如果没有任何一个 `.c` 提供外部定义，链接器会报未定义。最省心的写法是 `static inline`——每个翻译单元各有一份内部链接的副本，不进符号表，也就不会有重复定义。

## 客观题

### q-s7-iv-compile-link-1 single
关于"从 .c 到可执行文件"的四个阶段，下面哪一条说法是正确的？

- [x] 顺序是预处理 → 编译 → 汇编 → 链接，产物分别是 .i、.s、.o 和可执行文件；`undefined reference` 是链接期错误，因为编译期只需要看到声明。
  > 正确。编译阶段按翻译单元工作，只要函数有声明就能生成调用代码，真实地址留到链接期由符号解析和重定位填上；所以"少定义"只能在链接期被发现。`duplicate symbol` 同样在链接期，而同一文件内的两份定义是编译期的 `redefinition`。
- [ ] 编译阶段会检查每个被调用函数是否真的有定义，所以 `undefined reference` 属于编译错误。
  > 错。编译器看不到别的 `.c` 文件，也无权假设库的存在，它只按声明生成调用。如果编译期就要求定义，那么"声明放头文件、定义放 .c"这种最基本的工程组织方式就没法工作了。
- [ ] 头文件里写 `int g = 0;` 没有问题，因为每个包含它的 .c 会各自得到一份独立的副本。
  > 错。文件作用域的 `int g = 0;` 是**外部链接的强定义**，每个包含它的 `.o` 都会导出 `g`，链接期报 `multiple definition`/`duplicate symbol`。要"每个文件一份"必须写 `static int g = 0;`；要共享一份则头文件写 `extern int g;`、某个 `.c` 里定义。
- [ ] 静态库和动态库的区别是：静态库在程序运行时才加载，动态库在链接时被复制进可执行文件。
  > 错，说反了。静态库（`.a`/`.lib`）在链接期把用到的目标代码复制进可执行文件，产物可以单独部署；动态库（`.so`/`.dll`）只在链接期记录依赖，运行时才加载，所以升级库不用重新链接，但部署时必须带上库文件。
