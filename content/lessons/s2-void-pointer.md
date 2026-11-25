---
id: s2-void-pointer
---

## 讲解

### 指针变量里到底存了什么
每个指针只存**一个地址**。指针的**类型**不改变这个地址的值，但它决定了三件事：

1. 解引用时读几个字节、按什么格式解释（`int *` 读 4 字节，`double *` 读 8 字节）；
2. `p + 1` 往前走多远（`int *` 走 4 字节，`double *` 走 8 字节）；
3. 编译器允许你对它做什么（能不能赋值、能不能和别的指针比较）。

`void *` 是"通用**对象**指针"：它能保存任何对象的地址，却**不携带类型信息**——所以它既不能解引用，也不能做算术。它存在的唯一理由，是让"不关心具体类型"的代码（`malloc`、`qsort`、`memcpy`、通用容器）能接收任意类型的指针。

### 三条必须记住的转换规则

| 规则 | 说明 | 例子 |
|---|---|---|
| 任意对象指针 → `void *` 可以隐式转换 | 反过来 `void *` → 任意对象指针也可以隐式转换，C 里**不需要强制转换** | `void *vp = &x; int *ip = vp;` |
| `void *` 不能解引用 | `void` 是不完整类型，编译器不知道读几个字节 | `*vp` 直接编译错误 |
| `void *` 不能做算术 | 标准 C 没有定义 `void * + 1`；GCC/Clang 把它当 `char *` 是**扩展** | `vp + 1` 在 `-Wpedantic` 下报警告 |

把任意对象指针交给 `void *`、再原样转回来，得到的地址与原指针相等，这是标准保证的：

```c run id=vp-any
#include <stdio.h>

int main(void) {
    int x = 42;
    double y = 3.5;

    void *vp = &x;                 /* int * -> void *，隐式转换 */
    printf("%d\n", *(int *)vp);    /* 用之前必须转回 int * */

    vp = &y;                       /* 同一个 void * 可以改指别的类型 */
    printf("%.1f\n", *(double *)vp);

    printf("%zu %zu\n", sizeof(void *), sizeof(int *));
    return 0;
}
```
```output
42
3.5
8 8
```

注意最后一行：`void *` 和 `int *` 本身一样大（本平台都是 8 字节）。**类型信息不在指针里，而在编译器心里**——同一个地址，用 `int *` 看是 4 字节的整数，用 `double *` 看是 8 字节的浮点数。

### 类型决定步长：同一个地址，两种走法
把同一个数组首地址分别存进 `int *` 和 `char *`，再各自加 1，前进的字节数完全不同：

```c run id=vp-step
#include <stdio.h>

int main(void) {
    int a[4] = {10, 20, 30, 40};
    void *base = a;          /* 数组名退化成 &a[0]，隐式转成 void * */

    int *ip = base;          /* 转回 int *：+1 走 4 字节 */
    char *cp = base;         /* 转成 char *：+1 走 1 字节 */

    printf("int *  加 1 前进 %ld 字节\n", (long)((char *)(ip + 1) - (char *)ip));
    printf("char * 加 1 前进 %ld 字节\n", (long)((cp + 1) - cp));
    printf("ip[2] = %d\n", ip[2]);
    return 0;
}
```
```output
int *  加 1 前进 4 字节
char * 加 1 前进 1 字节
ip[2] = 30
```

这就是**为什么 `void *` 不能做算术**：连"一步走多远"都不知道，`p + 1` 根本没有意义。也是**为什么 `qsort` 要额外收一个"元素大小"参数**：它内部只拿到 `void *` 和字节数，只能按字节搬运。

### 用 `void *` 写真正通用的函数
下面这个 `swap` 既能换 `int` 也能换 `double`，因为它完全不假设元素类型：它拿到"起始地址 + 多少字节"，然后一个字节一个字节地换。

```c run id=vp-swap
#include <stdio.h>

static void swap(void *a, void *b, size_t size) {
    /* 标准规定：任何对象都可以通过字符类型的指针逐字节访问 */
    unsigned char *pa = a;
    unsigned char *pb = b;
    for (size_t i = 0; i < size; i++) {
        unsigned char t = pa[i];
        pa[i] = pb[i];
        pb[i] = t;
    }
}

int main(void) {
    int x = 1, y = 2;
    double p = 1.5, q = 2.5;
    swap(&x, &y, sizeof x);    /* 换 4 字节 */
    swap(&p, &q, sizeof p);    /* 换 8 字节 */
    printf("x=%d y=%d\n", x, y);
    printf("p=%.1f q=%.1f\n", p, q);
    return 0;
}
```
```output
x=2 y=1
p=2.5 q=1.5
```

为什么用 `unsigned char *` 而不是 `int *`？因为 `int *` 的 `+1` 是 4 字节，用它逐字节走根本走不动；而字符类型是标准唯一允许"审视任意对象字节"的类型。`memcpy`、`memmove`、`malloc` 的内部实现都是这个套路。

### `void *` 也是"通用返回值"：找到了返回地址，找不到返回空
C 没有"可能不存在的返回值"这种类型，通用库函数的标准做法是返回 `void *`，失败时返回 `NULL`。调用者拿到之后先判空，再转回具体类型：

```c run id=vp-find
#include <stdio.h>

/* 在 base 指向的 n 个 int 里找 key；找到返回它的地址，找不到返回 NULL */
static void *find_int(void *base, size_t n, int key) {
    int *p = base;
    for (size_t i = 0; i < n; i++) {
        if (p[i] == key) {
            return p + i;
        }
    }
    return NULL;
}

int main(void) {
    int a[5] = {3, 1, 4, 1, 5};
    int *hit = find_int(a, 5, 4);
    printf("找到 4，下标是 %ld\n", (long)(hit - a));
    int *miss = find_int(a, 5, 9);
    printf("没找到 9：%s\n", miss == NULL ? "返回了空指针" : "返回了非空指针");
    return 0;
}
```
```output
找到 4，下标是 2
没找到 9：返回了空指针
```

这个"返回 `void *` + 失败返回 `NULL`"的模式，`malloc`、`bsearch` 都在用；下一课的回调函数参数 `const void *` 也是同一个思路：**框架不知道类型，只能传地址**。

### 内存里发生了什么

```memory title="int x = 42; void *vp = &x; int *ip = vp;（地址是示意值）"
地址     | 内容     | 变量 | 类型
0x1000   | 42       | x    | int
0x2000   | 0x1000   | vp   | void *
0x2008   | 0x1000   | ip   | int *
0x2010   | 0x1000   | cp   | char *
```

`vp`、`ip`、`cp` 三个指针存的内容完全一样（都是 `0x1000`），区别只在于编译器用它们做运算时走多远、读多少字节。**转换指针类型从来不会改变地址，也不会改变内存里的数据**。

### 两个容易被忽略的边界

**函数指针不能和 `void *` 互转。** 标准只保证"对象指针 ↔ `void *`"，函数指针是另一类东西。把函数地址塞进 `void *` 在多数平台上能跑，但属于未定义/实现定义行为；POSIX 的 `dlsym` 依赖这个扩展，可移植代码应该用函数指针类型本身（下一课的 `qsort` 就是这么做的）。

**`const void *` 与 `void *` 是两种类型。** `memcpy` 的源参数是 `const void *`，表示"我只读你的数据"；目标参数是 `void *`。把 `const int *` 传给 `void *` 会丢掉 `const`，编译器会警告——这不是小题大做，它正是"这个函数会不会改我的数据"的书面承诺。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra voidptr.c -o voidptr
./voidptr
```

本平台用 Clang，命令等价：`clang -std=c17 -Wall -Wextra voidptr.c -o voidptr`。

三个实用建议：

- **想看 `void *` 的算术扩展**：加 `-Wpedantic`，`gcc -std=c17 -Wall -Wextra -Wpedantic`。GCC/Clang 会把 `void * + 1` 当 `char * + 1`，但会提醒你"这是 GNU 扩展"。
- **想看运行期的 UB**：加 `-fsanitize=address,undefined`（本平台的"运行"按钮默认就开着）。空指针解引用、越界、有符号溢出都会被当场抓住。
- **`%zu` 打印 `sizeof`**：`sizeof` 的结果是 `size_t`，用 `%d` 在 64 位平台上可能出错。

如果你从 C++ 过来，要特别注意：C++ 不允许 `void *` 隐式转成 `T *`，必须写 `static_cast<int *>(vp)`；C 里不需要。本平台按 C17 编译，`int *ip = vp;` 是合法的，**不要**因此以为"加个强制转换更安全"——真正危险的是转错类型，而强制转换恰好会把这个错误藏起来。

## 常见错误

### 直接解引用 `void *`
`*vp` 是编译错误：`void` 是不完整类型，编译器不知道要读几个字节。必须先转成具体类型。

```c run id=err-deref expect=CE
#include <stdio.h>

int main(void) {
    int x = 42;
    void *vp = &x;
    printf("%d\n", *vp);   /* error: argument type 'void' is incomplete */
    return 0;
}
```

### 对 `void *` 做算术
标准 C 没有定义 `void *` 的加减法。GCC/Clang 作为扩展把它当成 `char *`，所以 `p + 1` 只前进 **1 字节**——如果你的本意是"下一个 int"，这个结果会让你在毫不知情的情况下读到半个整数。加 `-Wpedantic` 能看到警告。

```c run id=err-arith expect=OK warnings=allow flags=-Wpedantic
#include <stdio.h>

int main(void) {
    int a[3] = {1, 2, 3};
    void *p = a;
    p = p + 1;    /* GNU 扩展：等价于 char * 加 1 */
    printf("p 前进 %ld 字节\n", (long)((char *)p - (char *)a));
    return 0;
}
```
```output
p 前进 1 字节
```

### 转成错误的类型再用
`void *` 让"类型不匹配"从编译期错误变成了运行期的静默错误：

```c
int x = 42;
void *vp = &x;
double *dp = vp;      /* 编译器不会拦你 */
printf("%f\n", *dp);  /* 把 int 的位当成 double 解释，结果完全不可预测 */
```

这属于未定义行为（违反有效类型/别名规则）。防御办法只有一条：**谁存进去的，谁负责用同一个类型转回来**，不要靠"我记得它是 int"。

### 以为 C 和 C++ 的规则一样
C++ 要求把 `void *` 转成 `T *` 必须写强制转换；C 不要求。反过来，C++ 里 `malloc` 的返回值必须转换，C 里不转换才是推荐写法（转换反而会掩盖"忘记包含 `<stdlib.h>`"这类错误）。写 C 代码时不要把 C++ 的习惯搬过来。

## 客观题

### q-s2-void-pointer-1 single
关于 `void *`，下面哪一句是**正确**的？（本平台是 64 位环境）

- [ ] `void *p = &x;` 之后可以直接写 `int v = *p;`，编译器会按 `int` 读 4 字节。
  > 错。`void` 是不完整类型，`*p` 是编译错误：编译器不知道这个地址上是什么类型、该读几个字节。
- [x] `int *ip = malloc(sizeof *ip);` 在 C 里不需要把 `malloc` 的返回值强制转换成 `int *`。
  > 对。`malloc` 返回 `void *`，C 标准允许它隐式转换成任何对象指针。加转换反而不推荐：一旦忘记 `#include <stdlib.h>`，编译器就无法提醒你。
- [ ] `void *p = &x; p++;` 是标准 C 允许的写法，`p` 会前进 1 字节。
  > 错。标准 C 没有定义 `void *` 的算术运算。GCC/Clang 把它当 `char *` 是扩展（`-Wpedantic` 会警告），换一个编译器可能直接报错。
- [ ] 函数指针可以安全地存进 `void *` 再转回来，这是 C 标准保证的。
  > 错。标准只保证"对象指针 ↔ `void *`"的往返。函数指针与 `void *` 互转不是标准保证的（`dlsym` 依赖的是 POSIX 扩展），可移植代码应该直接用函数指针类型。
