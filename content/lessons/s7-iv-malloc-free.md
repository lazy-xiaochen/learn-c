---
id: s7-iv-malloc-free
---

## 讲解

### 口述版答案
面试官问"malloc 和 free 是怎么配对的？free 又怎么知道该释放多大？"，按下面六点回答，每点一句话，先背关键词再展开：

1. **配对原则**：一次 `malloc`/`calloc`/`realloc` 成功返回，就必须有且只有一次 `free`；`free(NULL)` 是合法的空操作，什么也不做。
2. **free 怎么知道大小**：分配器在返回给你的地址**前面**藏了一块"块头"（chunk header），里面记着块大小和状态；`free` 只拿到起始地址，靠向前读块头知道要还多少，所以**绝不能 free(p + 1)** 这种移动过的指针。
3. **释放后必须置空**：`free(p); p = NULL;`——第二次 `free(p)` 就退化成安全的空操作，而不是双重释放。
4. **三类事故要分清**：泄漏（程序能跑，但内存只增不减）、双重释放（UB）、释放后使用（UB）；后两个不是"报错"，而是"行为未定义"。
5. **非法释放**：free 的指针必须是 malloc 系列返回的原值；对局部数组、全局变量、指针中间位置调用 free 都是 UB。
6. **realloc 的规矩**：用临时指针接返回值，先判 NULL 再覆盖原指针，否则失败时原内存再也释放不掉。

一句收尾：**malloc 是"借"，free 是"还"，借还必须一一对应，还完要把借条撕掉（置 NULL）**。

### 代码版答案
第一段：最标准的"申请 → 使用 → 归还 → 置空"。注意 `sizeof *a` 的写法：一旦把 `int *` 改成 `long long *`，元素大小自动跟着变，不用改两处。

```c run id=mf-basic
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n = 5;
    int *a = malloc((size_t)n * sizeof *a);
    if (a == NULL) {
        return 1;
    }
    for (int i = 0; i < n; i++) {
        a[i] = (i + 1) * 10;
    }
    int sum = 0;
    for (int i = 0; i < n; i++) {
        sum += a[i];
    }
    printf("sum=%d, a[0]=%d, a[4]=%d\n", sum, a[0], a[4]);
    free(a);
    a = NULL;
    free(a);                       /* free(NULL) 是合法的空操作 */
    printf("after free: a=%s\n", a == NULL ? "NULL" : "悬垂指针");
    return 0;
}
```
```output
sum=150, a[0]=10, a[4]=50
after free: a=NULL
```

第二段：`realloc` 扩容。关键的三个细节全在这几行里——**用临时指针接返回值、先判 NULL、成功后才覆盖原指针**：

```c run id=mf-realloc
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int cap = 2;
    int len = 0;
    int *a = malloc((size_t)cap * sizeof *a);
    if (a == NULL) {
        return 1;
    }
    for (int v = 1; v <= 9; v++) {
        if (len == cap) {
            int *tmp = realloc(a, (size_t)cap * 2 * sizeof *a);
            if (tmp == NULL) {
                free(a);
                return 1;
            }
            a = tmp;               /* 只在这里更新，失败时原指针还在 */
            cap *= 2;
            printf("grow: cap=%d\n", cap);
        }
        a[len++] = v;
    }
    printf("len=%d cap=%d last=%d\n", len, cap, a[len - 1]);
    free(a);
    return 0;
}
```
```output
grow: cap=4
grow: cap=8
grow: cap=16
len=9 cap=16 last=9
```

第三段：给每次申请/归还记一笔账，就是"泄漏检测器"的雏形。面试里被追问"你怎么发现泄漏"，答"对 malloc/free 计数，程序结束时计数不为 0 就有泄漏"即可：

```c run id=mf-counter
#include <stdio.h>
#include <stdlib.h>

static int live_blocks;            /* 还没归还的块数 */

static void *xmalloc(size_t size) {
    void *p = malloc(size);
    if (p != NULL) {
        live_blocks++;
    }
    return p;
}

static void xfree(void *p) {
    if (p != NULL) {
        live_blocks--;
    }
    free(p);                       /* free(NULL) 也安全 */
}

int main(void) {
    int *a = xmalloc(sizeof *a);
    int *b = xmalloc(sizeof *b);
    if (a == NULL || b == NULL) {
        xfree(a);
        xfree(b);
        return 1;
    }
    xfree(a);
    printf("after free(a): live=%d\n", live_blocks);
    xfree(b);
    printf("after free(b): live=%d\n", live_blocks);
    return 0;
}
```
```output
after free(a): live=1
after free(b): live=0
```

第四段：`malloc(0)` 的返回值是**实现定义**的——可能返回 NULL，也可能返回一个不能解引用、但可以 `free` 的唯一指针。标准只要求"要么 NULL，要么能 free"，所以下面两种结果都合法（本平台实测返回非 NULL）：

```c run id=mf-zero
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *p = malloc(0);
    printf("malloc(0) 返回 %s\n", p == NULL ? "NULL" : "非 NULL");
    free(p);
    printf("free 之后没有崩溃\n");
    return 0;
}
```
```output
malloc(0) 返回 非 NULL
free 之后没有崩溃
```

### free 到底怎么知道要释放多大
调用 `free(p)` 时，你只给了一个地址，没给长度。分配器能还回去，是因为它在**你拿到的地址之前**留了元数据。以 glibc 风格为例，一次 `malloc(20)` 在内存里大致长这样：

```memory title="malloc(20) 之后：块头在用户指针之前，free 靠它知道大小（地址为示意）"
地址（示意） | 内容 | 归属 | 说明
0x1000 | 32（块总长） | 分配器块头 | 记录这一整块多少字节、是否在使用
0x1008 | 0x21（标志位） | 分配器块头 | 最低位标记"已分配"，其余位是大小
0x1010 | 'h' | 用户数据 | malloc 返回的地址就是这里
0x1011 | 'e' | 用户数据 | 紧接着的字节
0x1012 | 'l' | 用户数据 | 20 字节可用，实际按 8/16 字节对齐向上取整
0x1013 | 'l' | 用户数据 | 越界写会踩坏下一块的块头
0x1020 | 下一块块头 | 分配器 | 块与块首尾相连，free 后可能合并
```

由此可以推出三条硬规则：

- **只能 free 原值**：`p + 1` 指向的是数据中间，分配器向前读块头会读到你的数据，直接崩溃或悄悄破坏堆；
- **free 不改变你的指针**：它只把这块内存标记为空闲，`p` 里那个地址仍然指向同一处，于是成了**悬垂指针**；
- **同一块只能 free 一次**：第二次 free 时块头已经不是"已分配"，分配器会再次把它挂进空闲链表，造成同一块被分给两个人。

### 四种必须会判的场景
面试官经常直接给你一段代码问"有没有问题"。先看下面这张表，再逐条读代码：

| 场景 | 典型代码 | 判定 | 关键点 |
|---|---|---|---|
| 内存泄漏 | `p = malloc(...); p = malloc(...);` | 不是 UB，但资源没归还 | 第一块再也找不到，程序结束时仍存活 |
| 双重释放 | `free(p); free(p);` | UB | 第二次 free 时块已空闲 |
| 释放后使用 | `free(p); *p = 1;` | UB | 读和写都算，哪怕只是 `printf("%d", *p)` |
| 释放非堆指针 | `int a[4]; free(a);` | UB | a 在栈上，不是分配器给的块 |

把这四种情况再压缩成一句口诀：**漏了是"没还"，重了是"还两次"，用了是"还完还花"，还错了是"还别人的"**。前一种只是资源问题（程序行为仍然有定义），后三种都是未定义行为——这也是为什么排障时必须先问清楚：**是崩溃（UB），还是内存只涨不降（泄漏）？**

### 释放后置空只解决一半问题
`free(p); p = NULL;` 能防住"通过 p 重复释放"和"通过 p 释放后使用"，但**防不住别名**：

```c
int *p = malloc(sizeof *p);
int *q = p;          /* 两个指针指向同一块 */
free(p);
p = NULL;            /* q 仍然是悬垂指针 */
*q = 1;              /* UB：置空救不了 q */
```

所以工程上的完整答案是三层：**① 明确所有权（谁申请谁释放）→ ② 释放后立即置空 → ③ 别名处约定"释放者负责通知"或用更安全的结构（如带引用计数的容器）**。面试只答第一层会被追问，答到第三层就是加分项。

## 编译与运行

用 gcc 或 clang 编译都行，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra heap.c -o heap
./heap
```

```bash
clang -std=c17 -Wall -Wextra heap.c -o heap
./heap
```

`malloc`/`free` 的错误**编译器看不出来**，必须打开运行期检查。本平台默认带 AddressSanitizer + UndefinedBehaviorSanitizer：

```bash
gcc -std=c17 -Wall -Wextra -g -fsanitize=address,undefined -fno-sanitize-recover=all heap.c -o heap
./heap
```

打开后，三类错误会直接点名：

```text
==12345==ERROR: AddressSanitizer: heap-use-after-free on address 0x...
READ of size 4 at 0x... thread T0
    #0 ... in main heap.c:9:20
==12345==ERROR: AddressSanitizer: attempting double-free on 0x...
==12345==ERROR: AddressSanitizer: attempting free on address which was not malloc()-ed
```

在 Linux 上还可以用 Valgrind 做同样的事（Windows 上没有）：

```bash
valgrind --leak-check=full --error-exitcode=1 ./heap
```

几点说明：

- **泄漏要用工具或计数查**：ASan 的 LeakSanitizer 在部分平台默认开启（`ASAN_OPTIONS=detect_leaks=1`），Windows 上不生效，所以本平台用"包装 malloc/free 计数"的方式判泄漏；
- **`-O2` 不会让 UB 变安全**：优化器会假设 UB 不发生，可能把整段代码删掉或改成任意结果，所以"我这边跑起来没问题"不能证明没有 UB；
- **调试构建更敏感**：UCRT 的调试堆（`_CrtSetDbgFlag`、`_CRTDBG_LEAK_CHECK_DF`）也会在退出时报告未释放的块，原理同样是记账。

## 常见错误

### 释放之后继续读写：悬垂指针 [RE]
`free(p)` 不会清空 `p`，也不保证那块内存立刻被复用。ASan 会把它标记成"已释放区域"，下一次访问立刻报 `heap-use-after-free`：

```c run id=mf-err-uaf expect=RE
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *p = malloc(sizeof *p);
    if (p == NULL) {
        return 1;
    }
    *p = 7;
    free(p);
    printf("%d\n", *p);      /* 错：p 已经是悬垂指针 */
    return 0;
}
```

正确写法只有一种顺序：**先用完，再 free，最后置 NULL**；如果释放后还要用值，就在 free 之前把它存到普通变量里。

### 同一块 free 两次 [RE]
第一次 free 之后块已经回到空闲链表，第二次 free 会让分配器把同一块挂两次，之后两次 malloc 可能返回同一地址——这是最典型的"两个对象悄悄共享内存"事故：

```c run id=mf-err-double expect=RE
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *p = malloc(sizeof *p);
    if (p == NULL) {
        return 1;
    }
    free(p);
    free(p);                 /* 错：重复释放 */
    return 0;
}
```

`free(p); p = NULL;` 之后第二次 `free(p)` 等价于 `free(NULL)`，什么也不做，这就是"置空"的全部价值。

### 对局部数组调用 free [RE]
栈上的数组不是分配器给的，free 它会报 `attempting free on address which was not malloc()-ed`。这类 bug 常见于"函数返回了数组名、调用者以为要 free"：

```c run id=mf-err-badfree expect=RE
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int local[4] = { 1, 2, 3, 4 };
    free(local);             /* 错：local 在栈上，不是堆块 */
    return 0;
}
```

判断标准很简单：**这个地址是不是某次 malloc/calloc/realloc 的返回值原样保存下来的？** 不是就不能 free。

### realloc 直接覆盖原指针 [LEAK]
`p = realloc(p, n)` 是最经典的写法错误：realloc 失败返回 NULL，原指针被 NULL 覆盖，原来的块再也无法释放。正确写法永远是 `tmp = realloc(p, n); if (tmp != NULL) p = tmp;`。

### 忘记 free：泄漏不是 UB，但同样是 bug [LEAK]
泄漏的程序行为完全定义良好，只是内存只增不减。长驻服务里它最终会吃光内存；而"进程马上退出"的小工具里它看起来无害，所以最容易被忽略。**malloc 和 free 的配对要在设计时就写清楚，而不是靠事后检查。**

## 客观题

### q-s7-iv-malloc-free-1 single
关于 `malloc` / `free` 的配对，下面哪一条说法是正确的？

- [x] `free` 只接受 malloc/calloc/realloc 返回的原始指针（或 NULL），它靠分配器在指针之前记录的块信息知道要释放多大；释放后应把指针置为 NULL。
  > 正确。`free` 的接口只有一个参数，长度信息由分配器保存在块头里。`free(NULL)` 是合法的空操作，所以"释放后置空"能让重复释放退化成无害操作。注意置空防不住别名，完整做法还要明确所有权。
- [ ] `free` 必须由调用者告诉它大小，标准写法是 `free(p, size)`。
  > 错。C 标准的 `free` 原型是 `void free(void *ptr)`，只有一个参数。要释放的大小由分配器记录，不劳调用者操心；这也是为什么 `free` 只能接受原始指针，`free(p + 1)` 会读错块头。
- [ ] `free(p)` 之后 `p` 会自动变成 NULL，所以连续 `free(p)` 两次是安全的。
  > 错。`free` 接收的是指针的**值**（按值传递），它无法修改你函数里的指针变量。`free(p); free(p);` 是双重释放，属于未定义行为。要得到"第二次安全"的效果，必须自己写 `p = NULL;`。
- [ ] 对局部数组调用 `free` 是合法的，只是没有任何效果。
  > 错。局部数组在栈上，不是分配器管理的块，`free` 它属于"释放非堆指针"，是未定义行为。ASan 会报 `attempting free on address which was not malloc()-ed`。标准只对 `free(NULL)` 规定了"什么也不做"。
