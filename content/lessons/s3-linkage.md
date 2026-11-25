---
id: s3-linkage
---

## 讲解

### 链接器只看"符号"，不看你的 C 代码
`gcc main.c -o app` 实际上是两步：每个 `.c` 先被**单独**编译成一个目标文件（`.o`，Windows 上是 `.obj`），然后由链接器把目标文件拼成可执行文件。链接器不读 C 代码，它只读目标文件里的**符号表**：一份"这个名字由本文件提供"和"这个名字本文件要用、需要别人提供"的清单。

所以同一个名字在两个 `.c` 之间能不能互相看见，取决于这个名字具有哪种**链接属性**（linkage）。C 只有三种：

| 链接属性 | 典型写法 | 别的 `.c` 能引用吗 | 同名会冲突吗 |
|---|---|---|---|
| 外部链接 external | 文件作用域、不加 `static` 的函数和变量 | 能，全工程共用同一个 | 会：重复定义 |
| 内部链接 internal | 文件作用域、加了 `static` 的函数和变量 | 不能，只在本 `.c` 内可见 | 不会：各文件互不干扰 |
| 无链接 none | 函数参数、块里的局部变量 | 不能，名字出不了那个块 | 不会 |

这里必须先把一个误解掐掉：文件作用域的 `static` **不是**"静态存储"的意思，它的意思就是"这个文件私有"。`static` 写在函数内部时才是另一层含义（存储期变成整个程序），那是 s3-static-local 的内容，两者不要混。

### 外部链接：默认状态，全工程共用一个名字
不加任何存储类说明符的文件作用域函数和变量，默认都是外部链接。外部链接的含义是：**整个程序里只有一个实体**，别的 `.c` 只要用 `extern` 声明一下，就能操作同一个对象。

```c run id=linkage-external
#include <stdio.h>

int g_calls = 0;                 /* 外部链接：全工程只有一个 g_calls */

int bump(void) {                 /* 外部链接：别的 .c 也能调用 */
    return ++g_calls;
}

int main(void) {
    bump();
    bump();
    bump();
    printf("g_calls = %d\n", g_calls);
    return 0;
}
```
```output
g_calls = 3
```

"共用一个"不是靠 C 语言的语法保证的，而是链接器干的活：`main.c` 里对 `g_calls` 的引用在目标文件里只是一个待填的地址，链接时链接器把它指向 `main.c` 里那份唯一的定义。反过来说就很危险了：如果两个 `.c` 都写了 `int g_calls = 0;`，链接器会看到两个定义，报"重复定义"（GCC/ld 说 `multiple definition of 'g_calls'`，LLVM/lld 说 `duplicate symbol: g_calls`）。

### 内部链接：static 把名字关在本文件里
给文件作用域的函数或变量加上 `static`，这个名字就变成内部链接：它依然存在，依然能被本文件的函数调用，但**别的 `.c` 再怎么声明也引用不到它**。

```c run id=linkage-static
#include <stdio.h>

static int helper(int x) {       /* 内部链接：只在本 .c 内可见 */
    return x * x;
}

static int s_calls = 0;          /* 内部链接的"全局"变量，本文件私有 */

int main(void) {
    for (int i = 1; i <= 3; i++) {
        s_calls++;
        printf("%d 的平方 = %d\n", i, helper(i));
    }
    printf("调用次数 = %d\n", s_calls);
    return 0;
}
```
```output
1 的平方 = 1
2 的平方 = 4
3 的平方 = 9
调用次数 = 3
```

这个例子的重点不在输出，而在"别人看不见"带来的两个后果：

- **同名是安全的**。另一个 `stats.c` 里也写一个 `static int helper(int x)` 完全合法，两个 `helper` 在链接器眼里根本不是一个符号，各用各的；
- **复用是要付费的**。`main.c` 想调用 `stats.c` 里那个 `helper` 也做不到——内部链接是单向的门。

所以 `static` 的一般用法是：**只在某一个 `.c` 内部使用的小工具函数、模块私有的全局状态，都加上 `static`**。这样既不会污染全工程的命名空间，也把"这个函数只属于本模块"写进了代码里。

### 为什么 static 让符号不出现在（全局）符号表里
"从符号表里消失"这个说法要精确一点：内部链接的实体不会被标记为**全局符号**，所以链接器在解析别的目标文件的引用时根本看不到它。用 `nm` 可以直接看到这个区别（Linux/macOS 上叫 `nm`，本平台自带的 LLVM 工具链里是 `llvm-nm`）：

```bash
$ clang -std=c17 -Wall -Wextra -c util.c -o util.obj
$ llvm-nm util.obj
00000000 a @feat.00
00000030 t helper            ← 小写 t：局部符号（内部链接），只是留给调试器看
00000000 T util_sum          ← 大写 T：全局符号（外部链接），链接器用它解析别人的引用
```

`util.c` 里 `helper` 是 static，`util_sum` 不是。链接器只把大写 `T` / `D` / `B` 这类全局符号拿来做"跨文件配对"，小写 `t` / `d` / `b` 一律不参与。这也解释了为什么编译器可以更放肆地优化 static 函数：它知道这个函数只可能在本文件里被调用，于是可以内联、改名字，甚至整个删掉。反过来，编译器对非 static 函数**永远不敢**判断它没人用——别的 `.c` 可能正在调用它。

这个差别还有一个可以直接观察到的副作用：`-Wunused-function` 只会对 static 函数报。下面这段代码里 `never_used` 从未被调用：

```c run id=linkage-unused warnings=allow
#include <stdio.h>

static int used_helper(int x) {   /* 用到了：没有警告 */
    return x + 1;
}

static int never_used(int x) {    /* 从未被调用：unused function 'never_used' */
    return x * 2;
}

int main(void) {
    printf("%d\n", used_helper(41));
    return 0;
}
```
```output
42
```

编译这段代码会得到一条 `warning: unused function 'never_used' [-Wunused-function]`。别把它当成噪音：它正是在提醒你"这个文件私有的东西没人用，可以删了"。如果 `never_used` 不是 static，编译器一声不吭。

### 链接属性是名字的属性，前后必须一致
同一个翻译单元里，一个名字不能前半段是外部链接、后半段是内部链接：

```c run id=linkage-conflict expect=CE
#include <stdio.h>

void reset(void);                       /* 第一句：外部链接 */

static void reset(void) {               /* 冲突：static declaration of 'reset'
                                           follows non-static declaration */
    printf("reset\n");
}

int main(void) {
    reset();
    return 0;
}
```

反过来写却是合法的，这点很多人不知道：

```c
static void reset(void);    /* 先声明为内部链接 */
void reset(void) { }        /* 合法：函数声明不带存储类说明符时按 extern 处理，
                               于是它继承上面那个 static 的内部链接 */
```

所以真正危险的是"**声明和定义不一致**"：`stats.c` 里写 `static long long total(...)`，`stats.h` 里却声明成 `long long total(...)`，编译器不一定报错，但别的 `.c` 会看到一个永远找不到定义的符号，最后以 `undefined reference` 收场。养成习惯：**函数在 `.c` 里加不加 static，和头文件里的声明要么一致，要么这个函数根本不该出现在头文件里。**

### static 的两个位置，含义完全不同
`static` 写在文件作用域和写在块作用域，是两件不相干的事，初学者最容易在这里绕晕：

```c run id=linkage-two-kinds
#include <stdio.h>

static int counter = 0;          /* 文件作用域 + static：内部链接 */

static void tick(void) {         /* 内部链接的函数 */
    counter++;
}

static int local_counter(void) { /* 块作用域 + static：无链接，存储期是整个程序 */
    static int counter = 0;
    counter++;
    return counter;
}

int main(void) {
    tick();
    tick();
    printf("文件作用域的 counter = %d\n", counter);
    printf("local_counter 第 1 次 = %d\n", local_counter());
    printf("local_counter 第 2 次 = %d\n", local_counter());
    return 0;
}
```
```output
文件作用域的 counter = 2
local_counter 第 1 次 = 1
local_counter 第 2 次 = 2
```

两个 `counter` 是**两个不同的对象**：里面那个只在 `local_counter` 的块里可见，外面那个被它挡住了（shadow）。这张表把三种情况分开：

| 写法 | 链接属性 | 存储期 | 作用域 |
|---|---|---|---|
| 文件作用域 `static int x;` | 内部链接 | 整个程序 | 本文件 |
| 函数内 `static int x;` | 无链接 | 整个程序 | 那个块 |
| 函数内 `int x;` | 无链接 | 函数调用期间 | 那个块 |

只有第一行属于"链接属性"这个话题；第二行讲的是存储期，见 s3-static-local。

### 文件作用域的 const 在 C 里也是外部链接
C++ 里 `const int LIMIT = 100;` 默认是内部链接，**C 不是**。在 C 里它和普通变量一样是外部链接的定义：

```c run id=linkage-const
#include <stdio.h>

const int LIMIT = 100;   /* C 里默认是外部链接（这一点和 C++ 不同） */

int main(void) {
    const int local = 3; /* 局部 const：无链接，和链接属性没关系 */
    printf("%d %d\n", LIMIT, local);
    return 0;
}
```
```output
100 3
```

这个细节在写头文件时会咬人：把 `const int LIMIT = 100;` 放进头文件，被两个 `.c` 包含，就得到两份外部定义，链接时报 `duplicate symbol: LIMIT`。正确写法有三种，按场景选：

1. 头文件里写声明 `extern const int LIMIT;`，某一个 `.c` 里写定义 `const int LIMIT = 100;`；
2. 本来就是编译期常量 → 用 `#define LIMIT 100`（宏没有存储，不存在链接问题）；
3. 确实想让每个 `.c` 各拿一份副本 → 头文件里写 `static const int LIMIT = 100;`（每个文件一个副本，浪费一点空间，但改不动别人的那份）。

### 小结
- 外部链接 = 全工程唯一的符号，链接器负责把引用配到定义上；重复定义会在链接时报错。
- 内部链接 = `static` 的文件作用域函数/变量，名字不出本文件，因此可以在不同 `.c` 里重名。
- 无链接 = 局部名字；`static` 局部变量只是存储期变长，和链接属性无关。
- 头文件里只放**声明**，定义留给某个 `.c`；`static` 也不能把"头文件里的定义"变成好习惯，它只是把一份定义变成了每个文件各一份。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra main.c util.c -o app    # 一次编译并链接所有 .c
./app

gcc -std=c17 -Wall -Wextra -c main.c               # 只编译，得到 main.o
gcc -std=c17 -Wall -Wextra -c util.c               # 只编译，得到 util.o
gcc main.o util.o -o app                           # 再链接
```

本平台使用 Clang，命令等价：

```bash
clang -std=c17 -Wall -Wextra main.c util.c -o app
clang -std=c17 -Wall -Wextra -c main.c
```

想亲眼看看链接属性，就去看目标文件的符号表：

```bash
llvm-nm main.obj      # Windows（本平台自带的 LLVM 工具链）
nm main.o             # Linux / macOS
objdump -t main.o     # 另一种看法
```

读 `nm` 的输出只需认三个字母：

- `T` / `D` / `B`：全局符号（外部链接），链接器会拿它们配对；
- `t` / `d` / `b`：局部符号（内部链接），链接器不管；
- `U`：本文件用到了但没定义，等着别人提供——这就是 `undefined reference` 的来源。

另外两个和本节有关的开关：

- `-Wunused-function`：只对 static 函数生效（因为它才有"只在本文件用"这个前提）；
- `-O2`：优化之后 static 函数常常被内联，`nm` 里可能连小写 `t` 都看不到了，这属于正常现象。

## 常见错误

### 辅助函数忘了加 static，两个模块撞名 [CE]
最典型的翻车方式：`a.c` 里写了一个自认为"很私有"的 `int helper(int x)`，`b.c` 里也写了一个同名的。两个都是外部链接，链接器看到两份定义：

```c
/* a.c */
int helper(int x) { return x + 1; }

/* b.c */
int helper(int x) { return x * 2; }     /* ld: multiple definition of 'helper'
                                           lld: duplicate symbol: helper */
```

修法只有两种：给其中一个（或两个）加 `static`，让名字变成本文件私有；或者只保留一份定义，另一份改成 `extern` 声明。判断标准很简单：**这个函数需要被别的 .c 调用吗？不需要就加 static。**

### 以为 static 函数"不能被调用" [OK]
`static` 限制的是"别的文件看不见"，不是"不能调用"。本文件里照常调用、照常传参、照常递归。真正不能做的是：在另一个 `.c` 里声明 `static int helper(int);` 然后调用它——那样链接器会告诉你找不到符号，因为每个文件只认自己那份 static。

### 在头文件里定义 const 常量或变量 [CE]
`const int LIMIT = 100;` 写在头文件里，被两个 `.c` 包含，就是两份外部定义，链接时报 `duplicate symbol: LIMIT`。头文件里应当写 `extern const int LIMIT;`，把唯一那份定义放进某个 `.c`。或者干脆用 `#define`——宏在预处理阶段就没了，根本不参与链接。

### 用 static 把"头文件里的定义"藏起来 [OK]
这是个能编译、能链接、却会悄悄出错的写法：

```c
/* config.h */
static int g_limit = 100;      /* 每个包含它的 .c 都会得到自己的一份副本 */
```

`main.c` 里把 `g_limit` 改成 200，`stats.c` 里看到的仍然是 100——因为那是两个不同的对象。需要真正共享的状态，只能靠"头文件声明 + 一个 `.c` 定义"。

### 声明和定义一个 static 一个不 static [CE]
`stats.h` 里写 `long long total(const int *a, int n);`，`stats.c` 里写 `static long long total(...)`。这不一定报错，但别的 `.c` 会引用一个永远没有定义的符号。稳妥的做法是：**只在 `.c` 内部用的函数不要写进头文件**；写进头文件的函数一律不加 static。

## 客观题

### q-s3-linkage-1 single
一个工程由 `a.c` 和 `b.c` 组成，两个文件里各自写了 `static int helper(int x) { return x + 1; }`，并且都只在本文件内调用。编译链接的结果是？

- [x] 正常链接：两个 `helper` 都是内部链接，各自只在所属的 `.c` 内可见，互不冲突
  > 正确。`static` 把名字变成内部链接，它不会作为全局符号导出，链接器在解析 `a.c`、`b.c` 的引用时只会看各自目标文件里的局部符号，所以两个同名函数可以共存。
- [ ] 链接错误：`multiple definition of 'helper'`
  > 这是两个**外部链接**的定义撞在一起时才会出现的错误。加了 `static` 之后，两个 `helper` 在链接器眼里根本不是一个符号，不会重复定义。
- [ ] 编译错误：同一个程序里不允许出现两个同名函数
  > 编译是以单个 `.c` 为单位进行的，`a.c` 和 `b.c` 各自编译时都只看到一个 `helper`，谈不上冲突。同名冲突只可能发生在同一个翻译单元内（比如同一个头文件被包含两次）。
- [ ] 链接成功，但两份定义会合并成一个，两个文件共用同一个函数体
  > 反了。内部链接意味着每个翻译单元各有一份独立的函数（甚至可以有不同的实现），链接器不会把它们合并。需要"共用同一个"时，恰恰**不能**加 `static`，而要在头文件里声明、在一个 `.c` 里定义。
