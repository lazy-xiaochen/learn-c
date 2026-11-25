---
id: s5-ub-null-deref
---

## 讲解

### 空指针：一个"合法但指不到任何对象"的地址
C 里的空指针常量写作 `NULL`（定义在 `<stddef.h>` / `<stdio.h>` 等头文件里，典型定义是 `((void *)0)`）。它的语义是"不指向任何对象"，而不是"指向地址 0 的那块内存"。因此：

- 把 `NULL` 赋给指针、拿它和别的指针比较、`free(NULL)`、把它传给明确允许空指针的函数（例如 `free`、`realloc` 的第一个参数）——这些都合法；
- **通过它访问数据就是未定义行为**：`*p`、`p[i]`、`p->member`，甚至 `&p->member`（成员访问表达式本身要求指针指向一个对象）。

`NULL` 最常见的来源，几乎全都是"函数用一个特殊返回值表示失败"：

| 来源 | 什么时候返回 NULL |
|---|---|
| `malloc` / `calloc` / `realloc` | 内存不足，或请求的大小是 0（实现定义） |
| `fopen` | 文件不存在、没有权限、路径非法 |
| `strstr` / `strchr` / `strrchr` | 没找到 |
| 自己写的查找函数 | 约定"没找到返回 NULL" |

所以"指针可能是 NULL"不是罕见情况，而是**每个返回指针的函数都必须考虑的常规分支**。

### 它通常崩溃，但标准不保证
在常见的桌面系统上，解引用 NULL 会触发访问违例（Windows 上是 `0xC0000005`，Linux 上是 SIGSEGV）。这给人一种错觉："空指针解引用 = 崩溃"，于是有人用"我的程序没崩"来证明"指针不是 NULL"。

标准没有这样的保证。看这个反例——把 NULL 传给 `printf` 的 `%s`：

```c run id=nd-printf
#include <stdio.h>

int main(void) {
    const char *name = NULL;
    printf("name = %s\n", name);   /* UB：%s 要求一个指向字符串的指针 */
    return 0;
}
```
```output
name = (null)
```

本平台的 C 运行库遇到 NULL 时会打印 `(null)`，程序正常退出、退出码 0。这是**运行库的善意**，不是语言的规定：换一个平台、换一个 CRT，同样的代码可能直接崩溃，也可能打印出别的东西。`%s` 遇到 NULL 属于 UB，只是这一次没被惩罚。

同理，`printf("%d\n", *p)` 在 `p == NULL` 时也不一定崩——它可能读到一个"看起来像整数"的值，然后若无其事地继续跑。**"没崩" 说明不了任何事。**

### 打开 sanitizer：UB 会立刻变成报告
```c run id=nd-ubsan expect=UB
#include <stdio.h>

int main(void) {
    int *p = NULL;
    *p = 42;                       /* UB：通过空指针写数据 */
    printf("%d\n", *p);
    return 0;
}
```

UBSan 的措辞是 `store to null pointer of type 'int'`——它抓住的是"这个存储操作的指针是空指针"这个事实，与"地址 0 上有没有内存"无关。

连"只取成员地址、不读写"也算越界。下面这段代码想算 `value` 相对结构体起始位置的偏移，看起来完全没碰内存，但 `p->value` 这个表达式的合法性以"`p` 指向一个 `struct Node` 对象"为前提：

```c run id=nd-offset expect=UB
#include <stdio.h>

struct Node {
    int key;
    int value;
};

int main(void) {
    struct Node *p = NULL;
    int offset = (int)((char *)&p->value - (char *)p);   /* UB：p 不指向任何对象 */
    printf("offset = %d\n", offset);
    return 0;
}
```

要算这种偏移，标准工具是 `<stddef.h>` 里的 `offsetof(struct Node, value)`。

### -O0 与 -O2：判空检查会被"优化"成什么
这是本知识点最反直觉的部分。先看"先解引用、后判空"的写法——注意 `if (p == NULL)` 放在了 `*p = 42;` **之后**：

```c run id=nd-trap-o0 opt=-O0 sanitize=off expect=RE
#include <stdio.h>

static int store_then_check(int *p) {
    *p = 42;                       /* 先解引用 */
    if (p == NULL) {
        return -1;                 /* 后判空：这时已经晚了 */
    }
    return 0;
}

int main(void) {
    printf("result = %d\n", store_then_check(NULL));
    return 0;
}
```

`-O0` 老老实实执行 `*p = 42`，写地址 0，进程因访问违例被终止（`0xC0000005`）。换成 `-O2`：

```c run id=nd-trap-o2 opt=-O2 sanitize=off expect=RE
#include <stdio.h>

static int store_then_check(int *p) {
    *p = 42;                       /* 先解引用 */
    if (p == NULL) {
        return -1;                 /* 后判空：这时已经晚了 */
    }
    return 0;
}

int main(void) {
    printf("result = %d\n", store_then_check(NULL));
    return 0;
}
```

它**同样不是正常结束**，但原因变了：`-O2` 从 `*p = 42` 得出"`p` 一定不是 NULL"这个前提，于是 `if (p == NULL)` 变成永远不成立的分支；编译器把这条"不可能走到"的路径换成了一条非法指令（`ud2`），程序以 `0x80000003`（断点指令）终止。两次都是 `RE`，但**退出码不同、崩溃位置不同**——这就是"UB 让编译器不再对你的代码负责"的直接证据：你以为在修 bug 的那行判空，在 `-O2` 里已经不存在了。

再看一个更气人的版本：解引用的结果**没有被使用**，于是 `-O2` 干脆把这次访问删掉：

```c run id=nd-dead-o0 opt=-O0 sanitize=off expect=RE
#include <stdio.h>

static int dead_deref(int *p) {
    int v = *p;                    /* 读出来但不用 */
    (void)v;
    if (p == NULL) {
        return -1;
    }
    return 0;
}

int main(void) {
    printf("result = %d\n", dead_deref(NULL));
    return 0;
}
```

`-O0` 下这次读真的发生了，崩溃。`-O2` 下这次读是"死代码"，被删掉：

```c run id=nd-dead-o2 opt=-O2 sanitize=off
#include <stdio.h>

static int dead_deref(int *p) {
    int v = *p;                    /* 读出来但不用 */
    (void)v;
    if (p == NULL) {
        return -1;
    }
    return 0;
}

int main(void) {
    printf("result = %d\n", dead_deref(NULL));
    return 0;
}
```
```output
result = -1
```

程序正常结束，还打印出了"正确"的 `-1`（判空居然生效了）。**这不是代码被修好了，而是那次空指针解引用从未执行**。一旦把 `(void)v` 换成真正使用 `v`（比如返回它），`-O2` 就会立刻崩溃或者给出垃圾值。

这三个实验合起来说明：**同一段 UB 代码在 `-O0` 与 `-O2` 下的表现可以完全不同——崩溃、变成非法指令、或者"看起来完全正确"。** 你无法通过"某个优化级别下跑通了"来判断代码是否正确。

### 正确写法：判空必须在解引用之前
规则只有一条：**任何可能为 NULL 的指针，在第一次解引用之前必须判空**。判空之后要么走"失败分支"，要么把指针换成"已确认非空"的局部变量，让后续代码不必再想这件事。

```c run id=nd-safe
#include <stdio.h>
#include <string.h>

static const char *lookup(int id) {
    static const char *names[3] = { "alice", "bob", "carol" };
    if (id < 0 || id >= 3) {
        return NULL;               /* 约定：没找到返回 NULL */
    }
    return names[id];
}

int main(void) {
    int ids[4] = { 0, 3, 2, -1 };
    for (int k = 0; k < 4; k++) {
        const char *name = lookup(ids[k]);
        if (name == NULL) {         /* 先判空 */
            printf("id %d: 没有这个人\n", ids[k]);
        } else {
            printf("id %d: %s（长度 %zu）\n", ids[k], name, strlen(name));
        }
    }
    return 0;
}
```
```output
id 0: alice（长度 5）
id 3: 没有这个人
id 2: carol（长度 5）
id -1: 没有这个人
```

判空的位置也有讲究：`if (p == NULL) return ...;` 之后，编译器就知道 `p` 非空，后续代码不需要重复判空；反过来，如果先写 `int v = *p;` 再判空，那行解引用已经把 UB 写进程序了，后面判多少次都没用。

## 编译与运行

按"零警告 + sanitizer"编译，空指针解引用会被 UBSan 或 ASan 抓住：

```bash
gcc -std=c17 -Wall -Wextra -fsanitize=address,undefined -fno-sanitize-recover=all nd.c -o nd
./nd
```

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=address,undefined -fno-sanitize-recover=all nd.c -o nd
./nd
```

想看清"判空被优化掉"，就对照两个优化级别：

```bash
clang -std=c17 -O0 nd.c -o nd0 && ./nd0
clang -std=c17 -O2 nd.c -o nd2 && ./nd2
```

也可以生成汇编，确认 `-O2` 到底删了什么：

```bash
clang -std=c17 -O2 -S nd.c -o nd.s
```

本平台的判定：`store to null pointer` / `load of null pointer` / `member access within null pointer` 这类 UBSan 报告判 `UB`；ASan 的 `SEGV` 报告、或者进程带着 `0xC0000005` / `0x80000003` 退出，判 `RE`。所以同一个空指针 bug，可能显示成两种不同的结果——**看的是哪一层先发现它**。

## 常见错误

### 先解引用、后判空
判空写在解引用之后，等于什么都没做。`-O2` 会认为"既然解引用过，指针一定非空"，把这段判空删掉。

```c
static int get(const int *p) {
    int v = *p;                    /* 错：先解引用 */
    if (p == NULL) {               /* 这行已经没意义了 */
        return -1;
    }
    return v;
}
```

### 不检查 `malloc` 的返回值
`malloc` 失败返回 NULL，内存不足时并不罕见（尤其是申请大数组或在循环里反复申请）。直接写 `p[0] = 0` 就是空指针解引用。正确写法是 `if (p == NULL) { 处理错误 }`，并且**错误路径上不能继续用 `p`**。

```c
int *p = malloc(n * sizeof *p);
p[0] = 0;                          /* 错：没检查 p 是否为 NULL */
```

### 不检查 `strstr` / `strchr` 的返回值
"没找到"时它们返回 NULL，而"找到"时可能返回指向第一个字符的指针。如果直接拿返回值做减法或解引用，没找到的那条路径就是 UB。

```c
char *p = strstr(s, t);
printf("位置 = %d\n", (int)(p - s));   /* 错：p 可能是 NULL */
```

### 以为 `%s` 打印 NULL 是安全的
本平台的运行库会打印 `(null)`，但这是实现行为，不是标准保证。想安全地打印"可能为空的字符串"，应该自己判断：`printf("%s", p ? p : "(null)")`。

### 用 `assert(p != NULL)` 当作判空
`assert` 在 `NDEBUG` 定义后会被整个删掉（Release 构建常见），于是"判空"在发布版本里消失。真正需要处理的失败路径不能靠 `assert`，要用普通的 `if`。

## 客观题

### q-s5-ub-null-deref-1 single
下面这段代码在 `-O0` 下崩溃，在 `-O2` 下却打印出 `result = -1` 并正常退出。哪一个解释是正确的？

```c
static int f(int *p) {
    int v = *p;
    (void)v;
    if (p == NULL) return -1;
    return 0;
}
```

- [x] 标准对"解引用空指针"不做任何要求，所以两种表现都合法；`-O2` 把无人使用的读操作当成死代码删掉了，于是那次 UB 没有真正执行，判空反而生效了
  > 正确。UB 的定义就是"标准不做任何要求"，因此"崩溃"和"正常返回"都在允许范围内。`-O2` 发现 `v` 没有被使用，把 `int v = *p;` 整行删掉；删掉之后 `p == NULL` 的判空就成了唯一的操作，程序于是打印 `-1`。这不是代码被修好了，而是那行 UB 从未执行——把 `(void)v` 改成 `return v;` 就会立刻崩溃或返回垃圾值。
- [ ] 因为 `-O2` 会自动给空指针加上保护，所以开优化反而更安全
  > 错。`-O2` 没有任何"空指针保护"。它做的是相反的推理：既然你解引用了 `p`，就说明 `p` 一定非空；在这个前提下它删除判空、改写分支，甚至把"不可能走到"的路径换成非法指令。同一个例子里，如果读出来的值被使用，`-O2` 就会真的去读地址 0 而崩溃。
- [ ] 因为 `-O0` 的编译器有 bug，`-O2` 才是正确行为
  > 错。两边都没有违约：标准对 UB 不做要求，所以两种行为都合法。`-O0` 是按字面执行（真的写/读地址 0），`-O2` 是按"UB 不会发生"的前提做优化。判断"哪个对"没有意义——有意义的是这段代码本身已经失去了正确性保证。
- [ ] 因为 `(void)v` 把变量变成了 `volatile`，所以编译器可以安全地删掉这次读
  > 错。`(void)v` 只是"显式表示我知道这个值没被使用"的写法，用来抑制 `-Wunused-variable` 之类的警告，它不会让变量变成 `volatile`，也不会阻止优化。恰恰相反，它是在告诉编译器"这个值确实没用"。
