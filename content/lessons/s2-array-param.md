---
id: s2-array-param
---

## 讲解

### 先看一个"看起来完全正确"的求和函数
把数组传进函数、在函数里用 `sizeof` 算元素个数，是初学者最常写、也最容易写错的一段代码。先运行一下，看看它到底算出了什么：

```c run id=sizeof-inside warnings=allow
#include <stdio.h>

static int sum_all(int a[]) {
    int n = (int)(sizeof a / sizeof a[0]);
    printf("sum_all 里：sizeof a = %zu，算出的元素个数 = %d\n", sizeof a, n);
    int s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int main(void) {
    int a[5] = {10, 20, 30, 40, 50};
    printf("main 里：sizeof a = %zu，元素个数 = %zu\n", sizeof a, sizeof a / sizeof a[0]);
    printf("sum_all 返回 %d，正确结果是 150\n", sum_all(a));
    return 0;
}
```
```output
main 里：sizeof a = 20，元素个数 = 5
sum_all 里：sizeof a = 8，算出的元素个数 = 2
sum_all 返回 30，正确结果是 150
```

同样是 `a`，在 `main` 里 `sizeof a` 是 20（5 个 `int`），进了 `sum_all` 却变成 8。8 是**一个指针的大小**（本平台是 64 位环境，指针占 8 字节），再除以 `sizeof a[0]`（4）得到 2，于是循环只累加了前两个元素，答案从 150 变成了 30。

注意：这段代码能正常编译运行，**不会崩溃、不会报错**，只是悄悄算错。这正是它危险的地方。Clang 其实会在编译时提醒你（`-Wsizeof-array-argument`：*sizeof on array function parameter will return size of 'int \*'*），所以上面这段代码标了"允许警告"；平时看到这类警告一定要当回事。

### 为什么：形参 `int a[]` 其实就是 `int *a`
C 标准规定：函数形参如果写成数组形式，编译器会自动把它"调整"（adjust）成指向首元素的指针。下面三种声明**完全等价**，是同一个函数类型：

```c
void f(int a[10]);   /* 调整成 int *a，方括号里的 10 被忽略 */
void f(int a[]);     /* 调整成 int *a */
void f(int *a);      /* 本来就是指针 */
```

所以：

- 方括号里的数字**只是给人看的文档**，编译器既不检查、也不会用它来算 `sizeof`，更不会阻止你传入更短的数组；
- 进入函数后，`a` 只是一个普通的指针变量（8 字节），它只知道"第一个元素在哪"，**不知道一共有多少个元素**；
- 既然 `a` 是指针，`sizeof a` 就是 `sizeof(int *)` = 8，而不是整个数组的字节数。

这也解释了为什么 `sizeof` 求长度"在函数外有效、在函数内失效"——问题不在 `sizeof`，而在于**函数里的 `a` 已经不是数组了**。

### 函数拿到的是地址，所以能改调用者的数组
"数组参数是指针"并不全是坏消息：正因为传的是地址，函数里通过 `a[i]` 修改的就是调用者的那块内存，改动会"带回来"。这是 C 语言里让函数修改调用者数据的标准手段：

```c run id=scale-array
#include <stdio.h>

static void scale(int a[], int n) {
    for (int i = 0; i < n; i++) {
        a[i] *= 10;
    }
}

int main(void) {
    int v[4] = {1, 2, 3, 4};
    scale(v, 4);
    for (int i = 0; i < 4; i++) {
        printf("%d%c", v[i], i + 1 == 4 ? '\n' : ' ');
    }
    return 0;
}
```
```output
10 20 30 40
```

`scale` 里既没有 `return` 数组，也没有取地址，`v` 却被改掉了：因为 `a` 存的就是 `v[0]` 的地址，`a[i]` 与 `v[i]` 是同一块内存的两种写法。

**但要记住代价**：函数能改数组，就说明它拿到的是"可写的地址"，而不是一份副本。如果你希望函数不改原数组，应该在形参上写 `const int a[]`，让编译器帮你检查。

### 只有数组名还在"数组"的位置，`sizeof` 才是整个数组
数组名在绝大多数表达式里都会退化成"首元素地址"，只有两个地方例外：`sizeof` 的操作数，以及一元 `&` 的操作数。对比下面三个 `sizeof`，就能看清退化成指针的时机：

```c run id=decay-positions warnings=allow
#include <stdio.h>

int main(void) {
    int a[5] = {10, 20, 30, 40, 50};
    printf("sizeof a       = %zu\n", sizeof a);
    printf("sizeof &a[0]   = %zu\n", sizeof &a[0]);
    printf("sizeof (a + 1) = %zu\n", sizeof(a + 1));
    return 0;
}
```
```output
sizeof a       = 20
sizeof &a[0]   = 8
sizeof (a + 1) = 8
```

- `sizeof a`：`a` 没有被退化，得到整个数组的 20 字节；
- `sizeof &a[0]`：`&a[0]` 是"元素指针"，8 字节；
- `sizeof(a + 1)`：`a` 参与了算术运算，退化成指针，`a + 1` 也是指针，8 字节。

这段代码里 `sizeof(a + 1)` 会触发 Clang 的 `-Wsizeof-array-decay` 警告（*sizeof on pointer operation will return size of 'int \*'*），因为编译器也看出来了：`a` 在这里已经退化成指针，`sizeof` 只能得到 8。这个警告恰好就是"这里已经拿不到数组信息"的信号。

把数组名传给函数，属于第三种情况：**它退化成了指针，然后才进入函数**。所以函数里那个 `a` 从一开始就只是指针，`sizeof` 当然算不出数组长度。

### 正确做法：长度单独传，长度在"还是数组"的地方算
既然函数内拿不到长度，就必须由调用者把长度作为参数传进去。而调用者自己算长度时，要在数组名还没有退化的地方算，通常封装成一个宏：

```c run id=count-macro
#include <stdio.h>

#define COUNT(a) (sizeof(a) / sizeof((a)[0]))

static long long sum(const int a[], int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int main(void) {
    int ints[6] = {1, 2, 3, 4, 5, 6};
    double dbls[3] = {1.5, 2.5, 3.5};
    printf("ints 有 %zu 个，和 = %lld\n", COUNT(ints), sum(ints, (int)COUNT(ints)));
    printf("dbls 有 %zu 个\n", COUNT(dbls));
    return 0;
}
```
```output
ints 有 6 个，和 = 21
dbls 有 3 个
```

`COUNT` 之所以能同时适用于 `int` 和 `double` 数组，是因为它用 `sizeof(a) / sizeof((a)[0])` 表达"总字节数 ÷ 单个元素字节数"，与元素类型无关。

但这个宏有一个必须记住的前提：**只能用在真正的数组上**。如果把它用在指针上（比如函数里的形参 `a`），`sizeof a` 又变成 8，结果永远是 2，而且编译器只会给警告，不会报错。

### 内存图：调用者那边是数组，函数这边只是一个指针
假设 `main` 里的 `int a[5]` 从 `0x1000` 开始，调用 `sum_all(a, 5)` 时栈上的情形大致如下：

```memory title="main 的 int a[5]={10,20,30,40,50} 与 sum_all 的形参 a、n（地址为示意，实际每次运行可能不同）"
地址     | 内容   | 变量         | 说明
0x1000   | 10     | a[0]         | main 的数组，连续占 20 字节
0x1004   | 20     | a[1]         | 
0x1008   | 30     | a[2]         | 
0x100c   | 40     | a[3]         | 
0x1010   | 50     | a[4]         | 
0x2000   | 0x1000 | sum_all 的 a | 形参只存首地址，本身占 8 字节
0x2008   | 5      | sum_all 的 n | 元素个数只能另外传进来
```

关键点：**数组本体只有一份**，在 `main` 的栈帧里；`sum_all` 的 `a` 是另一个独立的变量，里面存着 `0x1000`。函数里 `a[2]` 的地址 = `0x1000 + 2 × 4` = `0x1008`，与 `main` 的 `a[2]` 是同一个位置——所以能改；但 `sizeof` 作用在 `0x2000` 这个 8 字节的指针格子上，当然得不到 20。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra sizeof_param.c -o sizeof_param
./sizeof_param
```

本平台使用 Clang，命令等价：

```bash
clang -std=c17 -Wall -Wextra sizeof_param.c -o sizeof_param
./sizeof_param
```

建议每次都带上 `-Wall -Wextra`。对"在函数里对数组形参用 sizeof"这种错误，Clang 会报两条很有用的警告：`-Wsizeof-array-argument`（提示你 `sizeof` 会得到 `int *` 的大小）和 `-Wsizeof-pointer-div`（提示你 `sizeof 指针 / sizeof 元素` 恒等于 2）。GCC 也有等价诊断。**警告不是噪音，它经常就是在告诉你"这里算错了"。**

排查这类问题时，还可以打开运行时检查：

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=address,undefined sizeof_param.c -o sizeof_param
```

如果长度传错（比如把字节数当成元素个数），AddressSanitizer 会立刻指出越界读写的具体位置，比"输出莫名其妙不对"好查得多。

## 常见错误

### 在函数里用 sizeof 求元素个数 [WA]
这是本知识点最核心的坑：函数里的 `a` 是指针，`sizeof a / sizeof a[0]` 恒等于 2（8 / 4），与真实长度无关。编译器会警告，但程序照样能跑，只是结果少了。
```c run id=err-sizeof-in-func warnings=allow
#include <stdio.h>

static void print_all(int a[]) {
    for (size_t i = 0; i < sizeof a / sizeof a[0]; i++) {   /* 只循环 2 次 */
        printf("%d\n", a[i]);
    }
}

int main(void) {
    int a[5] = {10, 20, 30, 40, 50};
    print_all(a);
    return 0;
}
```
```output
10
20
```

正确写法是把长度作为参数传进来：`print_all(int a[], int n)`，循环上界用 `n`。

### 把字节数当成元素个数传给函数 [RE]
`sizeof a` 是 20（字节），不是 5（个数）。把这个 20 当作长度传进去，函数就会去读 `a[5]` 到 `a[19]`，而这些位置根本不属于这个数组。数组越界读是未定义行为，本平台的 AddressSanitizer 会直接判 `RE` 并给出越界地址。
```c run id=err-size-as-count expect=RE
#include <stdio.h>

static long long sum(const int a[], int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

int main(void) {
    int a[5] = {10, 20, 30, 40, 50};
    printf("%lld\n", sum(a, (int)sizeof a));   /* 20 被当成了元素个数 */
    return 0;
}
```

### 以为函数改不了调用者的数组 [WA]
有人担心"值传递会复制一份，函数里改 `a[i]` 没用"，于是绕一大圈；也有人反过来，以为函数里改了不会影响外面。事实上数组参数传的是地址，`a[i] = ...` 改的就是调用者的元素。想保护原数组，请写 `const int a[]`，让编译器阻止修改，而不是靠"以为"。

### 让函数返回局部数组的地址 [UB]
```c
int *make(void) {
    int a[10];
    return a;   /* 错：a 在函数返回后就失效了 */
}
```
局部数组的存储期只到函数返回，返回它的地址得到的是悬垂指针，之后任何读写都是未定义行为。需要把数组"带出去"时，应由调用者提供数组并传入（本阶段的标准做法），或者在第 5 阶段学习动态内存后用 `malloc`。

## 客观题

### q-s2-array-param-1 single
本平台是 64 位环境（指针 8 字节，`int` 4 字节）。下面这个函数被 `count(a)` 调用，其中 `a` 是 `main` 里的 `int a[10]`，`count` 的返回值是多少？

```c
static int count(int a[10]) {
    return (int)(sizeof a / sizeof a[0]);
}
```

- [x] 2
  > 正确。形参 `int a[10]` 会被调整成 `int *a`，函数里的 `a` 只是一个 8 字节的指针，`sizeof a` = 8；`sizeof a[0]` = 4；8 / 4 = 2，与真实元素个数 10 无关。
- [ ] 10
  > 这是把方括号里的 `10` 当成了真实长度。方括号里的数字只是文档，编译器会直接忽略它，既不检查也不参与 `sizeof` 计算。
- [ ] 8
  > 8 是 `sizeof a` 的值（指针大小），但题目问的是再除以 `sizeof a[0]` 之后的商，漏掉了除法这一步。
- [ ] 40
  > 40 = 10 × 4，是数组在**调用者**那一侧的总字节数。函数内拿不到这个信息，因为进入函数时数组名已经退化成了指针。
