---
id: s3-link-errors
---

## 讲解

### 一次构建其实分两步，两类错误分属两步
把一个多文件工程变成可执行文件，中间有明确的两步：

1. **编译**：每个 `.c` 文件**单独**编译成目标文件（`.o`）。这一步编译器只看得见当前这个文件（加上它 `#include` 进来的头文件），其他 `.c` 文件里有什么，它一无所知。
2. **链接**：链接器把所有目标文件和库拼在一起，按**名字**把"调用点"和"定义"接上。

于是错误也分成两类：

| 阶段 | 典型报错 | 谁在抱怨 | 常见原因 |
|---|---|---|---|
| 编译 | `error: use of undeclared identifier`、`expected ';'` | 编译器 | 语法错、没声明、类型不匹配 |
| 链接 | `undefined symbol: xxx`、`duplicate symbol: xxx` | 链接器（`ld.lld` / `ld`） | 声明了没定义、定义了不止一份 |

**关键在于：编译阶段每个文件是独立进行的，所以"某个名字在整个程序里有没有定义、有几个定义"这件事，编译器根本无从判断——它只能交给链接器。** 这就是为什么"重复定义"和"未定义引用"都是链接期错误。

```c run id=link-decl-def
#include <stdio.h>

int square(int x);               /* 函数原型：只说"长什么样"，没有函数体 */

int main(void) {
    int r = square(7);           /* 编译到这里：编译器只知道原型，够用了 */
    printf("square(7) = %d\n", r);
    return 0;
}

int square(int x) {              /* 定义：真正的实现，编译后进入 main.o 的符号表 */
    return x * x;
}
```
```output
square(7) = 49
```

编译 `main.c` 时，编译器看到 `square` 的原型就知道怎么传参、返回什么类型，于是生成一条"调用 `square`"的指令，并在目标文件的符号表里记下一笔：**`square` 是一个外部引用（undefined，未定义）**。链接时它在本文件里找到了 `square` 的定义，这一笔就接上了。所以这个程序能跑。

### undefined reference：声明了，但没有任何人定义
把上面那份定义的函数体删掉，代码依然**能通过编译**——原型在，语法就合法。但链接器翻遍所有目标文件都找不到 `square` 的实体：

```c run id=link-undefined expect=CE
#include <stdio.h>

int average_of(int a, int b);    /* 只有声明，没有任何文件实现它 */

int main(void) {
    printf("%d\n", average_of(4, 6));
    return 0;
}
```

本平台的报错大致是这样（`ld.lld` 是 Clang 自带的链接器）：

```text
ld.lld: error: undefined symbol: average_of
>>> referenced by main.c:6
>>>               main-3f21a9.o:(main)
clang: error: linker command failed with exit code 1 (use -v to see invocation)
```

读法很固定：

- `undefined symbol: average_of` —— 缺的是 `average_of` 这个符号；
- `referenced by main.c:6` —— 是谁在用它（`main.c` 第 6 行，也就是调用的地方）；
- 本平台还会附一句中文解释："链接错误：找不到 `average_of` 的定义。说明它被声明/调用了，但没有任何源文件真正实现它。"

常见成因就三种：**函数名拼错**（声明叫 `calc_total`，定义写成 `total_calc`）、**定义写成了 `static`**（内部链接，别的文件看不见）、**定义所在的 `.c` 文件没有参与编译/链接**。

### 为什么"重复定义"要等到链接期才报
同一个文件里写两个 `int counter = 1;` 和 `int counter = 2;`，编译器立刻就能发现——它眼前就摆着两份：

```c run id=link-redef expect=CE
#include <stdio.h>

int counter = 1;                 /* 第一份定义 */
int counter = 2;                 /* 第二份定义：同一个文件里，编译器直接拦住 */

int main(void) {
    printf("%d\n", counter);
    return 0;
}
```

报错是 `error: redefinition of 'counter'`。但这只是"编译器恰好看得见"的情况。真正的麻烦在跨文件：`a.c` 里定义了 `int counter;`，`b.c` 里也定义了 `int counter;`。编译 `a.c` 时编译器不知道 `b.c` 的存在，编译 `b.c` 时也不知道 `a.c`，两个文件都能顺利编译通过。直到链接器把两个目标文件摆在一起，才发现"**`counter` 这个名字被定义了两次，我该用哪个地址？**"——于是报：

```text
ld.lld: error: duplicate symbol: counter
>>> defined at a.c:3
>>>            a-5d70c6.o
>>> defined at b.c:3
>>>            b-80f589.o
clang: error: linker command failed with exit code 1 (use -v to see invocation)
```

报错里的 `>>> defined at ...` 会**把每一份定义的位置都列出来**，这是修复这类错误最有用的一条信息：一一对照，删掉多余的。

为什么链接器不能"随便挑一个"？因为一个名字必须对应**唯一一个地址**。如果允许两个 `counter` 并存，那么 `a.c` 里写的 `counter = 10` 到底改了哪一份？`b.c` 读到的又是哪一份？C 语言的"**一次定义规则**"（one definition rule）就是为了堵住这个歧义：**有外部链接的对象和函数，整个程序里只能有一个定义。**

由于 `b.c` 里的定义很可能是"从头文件里带进来的"，最典型的翻车现场就是**在头文件里定义变量**：

```c
/* counter.h —— 错误示范 */
int g_counter = 0;        /* 这是定义！每个包含它的 .c 都会得到一份 */

/* counter.h —— 正确写法 */
extern int g_counter;     /* 这是声明：只说"有这么个变量"，不分配空间 */
```

而 `int g_counter;`（不带 `extern`、不带初值）是个特例，叫**暂定定义**（tentative definition）：在同一个文件里写几次都会被合并成一个，所以单文件里 `int x; int x;` 不报错。但跨文件时它仍然是"每个文件一份定义"。

> 历史包袱：老版本 GCC 默认用 `-fcommon`，会把多个文件里的暂定定义"合并"成一份，所以同样的代码在老 GCC 上能链接、在 Clang（默认 `-fno-common`）上就报 `duplicate symbol`。这类"换个编译器就炸"的问题，根源还是头文件里写了定义。

### 声明和定义的区别，一句话说清
- **声明**：告诉编译器"有这么个名字，它是什么类型"。函数原型、`extern int g;` 都是声明，**不分配存储**，可以出现任意多次。
- **定义**：真正"造出这个东西"——函数给出函数体，变量分配存储。整个程序里**只能有一次**。

```c run id=link-extern-var
#include <stdio.h>

extern int g_total;              /* 声明：g_total 在别处定义 */

static void add(int x) {
    g_total += x;                /* 用的时候只需要声明 */
}

int g_total = 0;                 /* 定义：真正分配存储空间 */

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

这段代码把"另一个 `.c` 文件"压进了同一个文件里演示：`extern int g_total;` 相当于头文件里的声明，`int g_total = 0;` 相当于 `counter.c` 里的定义。真实工程里它们分处两个文件，链接器做的事完全一样。

### 声明和定义的类型必须完全一致——链接器不检查这个
这是最阴的一类错误。链接器**只按名字匹配符号**，它不关心你声明的是 `int f(int)` 还是 `long long f(int)`。所以当一个文件把函数声明成一种类型、另一个文件定义成另一种类型时，**链接会成功，运行时却拿到垃圾值**：

```c
/* util.h —— 声明成 long long */
long long compute(int n);

/* util.c —— 定义成了 int，返回 4 字节 */
int compute(int n) { return n * 2; }

/* main.c —— 按 8 字节去读返回值，多出来的 4 字节是垃圾 */
```

在**同一个**文件里出现这种不一致，编译器会拦住（`conflicting types`）：

```c run id=link-conflict expect=CE
#include <stdio.h>

long long area(int w, int h);    /* 声明：返回 long long */

int main(void) {
    printf("%lld\n", area(3, 4));
    return 0;
}

int area(int w, int h) {         /* 定义：返回 int，和声明对不上 */
    return w * h;
}
```

所以"把声明集中写进头文件、让所有 `.c` 都包含它"不只是为了整洁，**它是唯一能保证"声明与定义一致"的机制**——两边包含同一个头文件，编译器就能在编译期抓到不一致。

### 为什么头文件里只能放声明
头文件会被多个 `.c` 文件 `#include`，也就是被**复制进多个编译单元**。于是：

- 头文件里放**声明**（函数原型、`extern` 变量声明、宏、类型定义）：复制多少份都无所谓，声明可以重复；
- 头文件里放**定义**（带函数体的函数、带初值的变量）：复制几份就有几份定义 → `duplicate symbol`；
- 头文件里放 `static` 函数或 `static` 变量：每份复制各自生成一个**内部链接**的副本，不会报重复定义，但**状态会分裂**（每个 `.c` 里各有一份计数器）。

`static` 是"内部链接"：名字只在本编译单元可见，别的文件里同名也不会冲突。

```c run id=link-static
#include <stdio.h>

static int value = 100;          /* 文件作用域：内部链接，只有本文件可见 */

static int peek(void) {
    static int value = 7;        /* 函数里的 static：完全另一个对象，与上面无关 */
    return value;
}

int main(void) {
    printf("file value = %d, inner value = %d\n", value, peek());
    return 0;
}
```
```output
file value = 100, inner value = 7
```

两个叫 `value` 的对象互不干扰，因为它们在不同的作用域、而且都是内部链接。这正是 `static` 能"避免多文件命名冲突"的原因，也是它不能用来"共享状态"的原因：**每个文件一份，谁也看不见谁。**

### 读链接错误的固定顺序
遇到链接错误不要慌，按这个顺序看：

1. **先看是哪一类**：`undefined symbol` 是"少了一份定义"，`duplicate symbol` 是"多了一份定义"。两类的原因正好相反。
2. **再抓名字**：报错里的那个符号名，一字不差地拿去搜（区分大小写）。
3. **`undefined` 就找定义**：谁应该实现它？那个 `.c` 文件参与编译了吗？定义的名字、参数类型、`static` 有没有写错？
4. **`duplicate` 就数份数**：报错会把每份定义的位置列出来（`defined at a.c:3`）。通常是头文件里写了定义，被多个 `.c` 包含。
5. **最后看类型**：链接通过但运行结果诡异，回头检查声明和定义的类型是否一致。

## 编译与运行

单文件编译：

```bash
gcc -std=c17 -Wall -Wextra main.c -o app
./app
```

多文件工程（本知识点的重点）：把 `.c` 文件**都列出来**，一起交给编译器：

```bash
gcc -std=c17 -Wall -Wextra main.c parking.c -o app
./app
```

本平台使用 Clang，命令等价：

```bash
clang -std=c17 -Wall -Wextra main.c parking.c -o app
./app
```

也可以分成"先编译、再链接"两步，这样更容易看清是哪一步出错：

```bash
clang -std=c17 -Wall -Wextra -c main.c        # 生成 main.o，只检查语法和声明
clang -std=c17 -Wall -Wextra -c parking.c     # 生成 parking.o
clang main.o parking.o -o app                 # 链接：这一步才可能报 undefined/duplicate
```

最实用的诊断工具是 `nm`：它直接打印目标文件的符号表，`U` 表示"未定义的外部引用"，`T` / `D` / `B` 表示"这里有定义"。

```bash
$ nm main.o | grep -E ' U | T '
                 U printf
                 U parking_total          # 引用了 parking_total，但本文件没有定义
0000000000000000 T main
```

如果 `parking_total` 只在 `main.o` 里显示为 `U`，在 `parking.o` 里根本没有（说明定义写成了 `static`，或者名字写错了），链接就一定会失败。`grep ' U '` 一行命令就能定位"谁没定义"。

## 常见错误

### 报错说 undefined，却去改头文件 [CE]
`undefined symbol` 意味着"没有定义"，头文件里只有声明——**改声明永远不会解决问题**（除非声明本来就是错的）。要去找"谁应该实现它"。下面是最小复现，`helper` 只有声明：
```c run id=err-undefined-only-decl expect=CE
#include <stdio.h>

int helper(int x);               /* 只有声明，没有定义 */

int main(void) {
    printf("%d\n", helper(3));
    return 0;
}
```
正确的修法只有两种：把 `helper` 的实现补上，或者把对它的调用删掉。改名、加重声明、`#include` 更多头文件都没用。

### 把函数定义搬进头文件，两个 .c 都包含 [CE]
```c
/* util.h —— 错误示范 */
int double_it(int x) { return x * 2; }    /* 定义！ */
```

`a.c` 和 `b.c` 都 `#include "util.h"`，于是 `a.o` 和 `b.o` 里各有一份 `double_it` 的实体，链接时报：

```text
ld.lld: error: duplicate symbol: double_it
>>> defined at ./util.h:2
>>>            a-5d70c6.o
>>> defined at ./util.h:2
>>>            b-80f589.o
```

修法：头文件里只留 `int double_it(int x);`，把函数体搬到 `util.c`。如果这个函数确实适合内联，正确写法是 `static inline`（见"`inline` 的语义"知识点）——它每份复制都是内部链接，不会重复。

### 在头文件里定义全局变量 [CE]
```c
/* config.h —— 错误示范 */
int g_retry = 3;         /* 定义：每个包含它的 .c 都得到一份 */
```

三个 `.c` 包含它就得到三份定义，报 `duplicate symbol: g_retry`。正确写法是头文件写 `extern int g_retry;`，在**某一个** `.c` 里写 `int g_retry = 3;`。注意 `int g_retry;`（无初值、无 `extern`）也属于定义（暂定定义），不能放头文件。

### 声明与定义类型不一致，链接通过但结果乱 [UB]
链接器只认名字，所以 `long long f(int)` 的声明配上 `int f(int)` 的定义也能链接成功——调用者按 8 字节去读返回值，实际只写了 4 字节，剩下 4 字节是栈上的垃圾。这类问题的恶果是"有时对、有时不对"，比直接报错难查十倍。**唯一的预防手段是让声明和定义包含同一个头文件，不一致就编译不过。**

### 定义写成了 static，别的文件找不到 [CE]
```c run id=err-static-def
#include <stdio.h>

static int helper(int x) {       /* static：内部链接，只有本文件可见 */
    return x * 2;
}

int main(void) {
    printf("%d\n", helper(3));
    return 0;
}
```
```output
6
```
上面这段在**同一个文件**里能正常编译运行（`static` 函数在本文件内可以用），所以它不会报错——这正是它危险的地方。如果你把这个函数搬到另一个 `.c` 文件、保留了 `static`，那边定义了却"不导出"，这边就只能看到 `undefined symbol: helper`。判断方法很简单：`nm` 里 `static` 函数显示的是小写 `t`，不是大写 `T`。看见小写 `t` 的函数被别的文件调用，就是这类错误。

## 客观题

### q-s3-link-errors-1 single
`main.c` 里写了 `int score_of(int id);` 并调用了 `score_of(3)`，`score.c` 里写的是 `static int score_of(int id) { ... }`（有函数体，加了 `static`）。编译两个文件都成功。接下来会发生什么？

- [x] 链接失败，报 `undefined symbol: score_of`，因为 `static` 让它只有内部链接，不会被导出给 `main.c`
  > 正确。`static` 把函数变成内部链接：它在 `score.c` 内部完全可用，但不会进入链接器可用的"全局符号"集合。`main.c` 里那条调用需要一个外部可见的 `score_of`，链接器找不到，于是报 `undefined symbol`。修法是去掉 `static`（或者把实现搬进 `main.c`）。
- [ ] 链接成功，因为 `score_of` 确实被定义了
  > "定义了"不等于"导出给别的文件"。链接器只看目标文件的全局符号表，`static` 函数在里面是小写的 `t`（本地符号），不是大写 `T`（全局符号），所以别的目标文件引用不到它。
- [ ] 编译失败，报 `redefinition of 'score_of'`
  > 两个文件里各有一份，编译器只看一个文件，根本不会同时看到两份，所以报不出重复定义。而且这里只有一个文件里有定义，谈不上重复。
- [ ] 链接失败，报 `duplicate symbol: score_of`
  > `duplicate symbol` 是"多了一份定义"的报错，这里的症状恰好相反——是"一份可用的定义都没有"。先分清 undefined（少）和 duplicate（多），再动手改。
