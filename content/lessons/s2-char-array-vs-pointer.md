---
id: s2-char-array-vs-pointer
---

## 讲解

### 两种写法只差一个 `[]`，含义却完全不同

```c
char a[] = "abc";   /* 数组：在栈上分配 4 个字节，把 "abc\0" 复制进去 */
char *p = "abc";    /* 指针：只分配一个指针变量，里面存的是只读区那 4 个字节的地址 */
```

可以打个比方：

- `char a[] = "abc"` 像是**自己买了一个柜子**，把 `abc` 抄进自己的柜子里。柜子是自己的，想怎么改就怎么改。
- `char *p = "abc"` 像是**把别人家柜子的地址写在一张小纸条上**。纸条可以改（换个地址），但你不能跑到别人家去改人家柜子里的东西——那块内存是只读的。

这两句话在后面会反复被用到：**数组拥有内存，指针只记录地址**。

### 第一个区别：`sizeof` 的结果

```c run id=sizeof-diff
#include <stdio.h>

int main(void) {
    char a[] = "abc";
    char *p = "abc";

    printf("sizeof a = %zu\n", sizeof a);
    printf("sizeof p = %zu\n", sizeof p);
    printf("sizeof a[0] = %zu\n", sizeof a[0]);

    a[0] = 'A';                       /* 合法：改自己柜子里的东西 */
    printf("a = %s\n", a);
    printf("p = %s\n", p);            /* 我们只是读 p 指向的字面量，安全 */

    return 0;
}
```
```output
sizeof a = 4
sizeof p = 8
sizeof a[0] = 1
a = Abc
p = abc
```

`sizeof a` 是 4：三个字符再加上结尾的 `'\0'`，这是数组真正占用的字节数。
`sizeof p` 是 8：64 位平台上指针固定占 8 字节，**和它指向的字符串有多长毫无关系**。
记住这条：`sizeof` 只看"这个变量本身有多大"，不会顺着指针去看它指向的东西。

### 第二个区别：能不能改

`a[0] = 'A'` 完全合法，因为 `a` 是数组，那 4 个字节是 `main` 的栈帧里分给它的。
但 `p[0] = 'A'` 是**未定义行为**：`p` 指向的是字符串字面量，字面量放在只读数据段里，写入会被操作系统直接拦下来，典型表现是程序当场崩溃。后面「字符串字面量」会专门讲这件事。

`char a[] = "abc"` 这个初始化也不是"把字面量的地址给 a"，而是**把字面量的内容复制进数组**。所以 `a` 和那个字面量是两块不同的内存：

```c run id=copy-not-shared
#include <stdio.h>
#include <string.h>

int main(void) {
    char a[] = "cat";
    const char *p = "cat";

    printf("改之前内容一样吗？%d\n", strcmp(a, p) == 0);
    a[0] = 'b';                        /* 只改动了 a 自己那 4 个字节 */
    printf("a = %s，p = %s\n", a, p);
    printf("改之后内容一样吗？%d\n", strcmp(a, p) == 0);
    return 0;
}
```
```output
改之前内容一样吗？1
a = bat，p = cat
改之后内容一样吗？0
```

改了 `a` 之后 `p` 看到的还是 `cat`，这证明它们是两块内存。反过来，如果只是"指向"同一块内存，改一个另一个必然跟着变——那是指针赋值 `q = a` 干的事。

### 第三个区别：数组名不能被赋值

数组名在表达式里会退化成"首元素地址"，但它本身**不是变量**，不能出现在 `=` 左边：

```c run id=array-not-assignable expect=CE
int main(void) {
    char a[] = "abc";
    a = "xyz";          /* 数组名不是指针变量：编译错误 */
    return 0;
}
```

编译器报 `array type 'char[4]' is not assignable`。如果以后想"把 a 换成另一个字符串"，正确做法是用 `strcpy(a, "xyz")` 把内容复制进去（前提是 a 装得下）。而指针变量可以随便改指向：

```c
char *p = "abc";
p = "xyz";              /* 合法：只是纸条上换了个地址 */
```

### 第四个区别：指针可以当"别名"改数组

指针真正的用处不是"存字符串"，而是"指向某块内存"。让 `q = a` 之后，`q[0]` 和 `a[0]` 就是同一个字节：

```c run id=alias
#include <stdio.h>

int main(void) {
    char a[] = "abc";
    char *q = a;              /* q 指向 a 的第一个字节 */

    q[0] = 'X';               /* 通过指针改写的仍是 a 自己的内存 */
    printf("a = %s\n", a);
    printf("q = %s\n", q);
    printf("a[0] == q[0] ? %d\n", a[0] == q[0]);
    return 0;
}
```
```output
a = Xbc
q = Xbc
a[0] == q[0] ? 1
```

这里 `q` 没有自己的字符串，它只是 `a` 的另一个名字。函数传参也是同一回事：把数组传给函数，函数拿到的是首地址，改它就是在改调用者的数组。

### 内存图：同样内容的两个位置

```memory title="char a[] = \"abc\"; char *p = \"abc\";（地址是示意值，实际每次运行可能不同）"
地址        | 内容       | 变量 / 区域          | 说明
0x7ffd1000  | 'a'        | a[0]（栈）           | 自己的一块，可读可写
0x7ffd1001  | 'b'        | a[1]（栈）           | 可写
0x7ffd1002  | 'c'        | a[2]（栈）           | 可写
0x7ffd1003  | '\0'       | a[3]（栈）           | 结尾标记，占 1 字节
0x7ffd1008  | 0x402000   | p（栈）              | 指针本身占 8 字节，只存地址
0x402000    | 'a'        | 字面量（只读数据段） | 写它是未定义行为
0x402001    | 'b'        | 字面量（只读数据段） | 同上
0x402002    | 'c'        | 字面量（只读数据段） | 同上
0x402003    | '\0'       | 字面量（只读数据段） | 同上
```

图里有两个 `abc`：栈上一份（属于 `a`），只读区一份（`p` 指向它）。所以 `a` 与 `p` 的地址不同、可写性不同，只有内容偶然相同。

### 什么时候用哪个

| 需求 | 选择 | 原因 |
|---|---|---|
| 要修改字符串内容 | `char a[]` | 只有数组拥有可写的内存 |
| 只读、当参数传 | `const char *p` | 不复制，省内存，`const` 让编译器帮忙检查 |
| 接收输入（`fgets`/`scanf`） | `char a[N]` | 必须有真内存来存 |
| 指向一串现成的字面量 | `const char *p` | 字面量本来就在只读区 |

还有一条容易忽略的规则：`void f(char s[])` 里的 `s` **仍然是指针**，不是数组。所以函数里 `sizeof s` 永远是 8，而不是调用者数组的长度——数组的长度必须另开一个参数传进来。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra charptr.c -o charptr
./charptr
```

本平台用 Clang，命令等价：

```bash
clang -std=c17 -Wall -Wextra charptr.c -o charptr
./charptr
```

一点说明：`char *p = "abc";` 在 C 里能编译通过，`-Wall -Wextra` 也不会警告；如果你希望编译器对"把字面量赋给 `char *`"报警，加 `-Wwrite-strings`：

```bash
gcc -std=c17 -Wall -Wextra -Wwrite-strings charptr.c -o charptr
```

加上之后，`char *p = "abc";` 会提示把 `const char` 赋给 `char *` 丢掉了 `const`。这也是为什么推荐写成 `const char *p = "abc";`——让编译器替我们看住"不许改"。

## 常见错误

### 把 `char *` 指向字面量之后又去改它
这是本知识点最致命的错误。写只读内存是未定义行为，本平台的检查会让程序直接报"非法内存访问"：
```c run id=write-literal expect=RE
#include <stdio.h>

int main(void) {
    char *p = "hello";
    printf("%s\n", p);
    p[0] = 'H';          /* 未定义行为：字面量在只读区 */
    printf("%s\n", p);
    return 0;
}
```
正确做法是先复制到自己的数组里，再改那份副本。

### 在函数里用 `sizeof` 求数组长度
形参写 `char s[]` 或 `char s[100]` 都一样，它就是个指针。下面这段代码 `sizeof s` 得到 8，和传进来的数组长度毫无关系，编译器还会专门警告：
```c run id=sizeof-param warnings=allow
#include <stdio.h>

void show(char s[]) {
    printf("函数里 sizeof s = %zu\n", sizeof s);
    s[0] = 'Z';
}

int main(void) {
    char a[] = "abc";
    printf("调用前 sizeof a = %zu\n", sizeof a);
    show(a);
    printf("调用后 a = %s\n", a);
    return 0;
}
```
```output
调用前 sizeof a = 4
函数里 sizeof s = 8
调用后 a = Zbc
```
注意后半段：通过 `s` 改内容确实能改到调用者的 `a`——因为传的是地址。**长度**拿不到，**内存**却能改到，这两件事要分清楚。

### 以为 `char a[] = "abc"` 只是给字面量起了个名字
如果真是这样，`a[0] = 'A'` 就该崩溃。实际上初始化是"复制内容"，所以 `a` 可写、`sizeof a` 是 4、改了也不影响别处。反过来，`char *p = "abc"` 才是真正的"起名字"，它没有自己的字符存储。

### 把数组名当成可以随便赋值的指针
`a = "xyz";` 直接编译失败，因为数组名不是左值。要改内容只能 `strcpy` / 逐字符赋值；要"换个名字指向别处"，那就得用指针变量，而不是数组。

## 客观题

### q-s2-char-array-vs-pointer-1 single
在 64 位平台上执行下面两行，哪一句描述是正确的？

```c
char a[] = "abc";
char *p = "abc";
```

- [x] `sizeof a` 是 4、`sizeof p` 是 8，而且只有 `a` 里的字符可以修改
  > 正确。`a` 是拥有 4 个字节的数组（3 个字符 + `'\0'`），`p` 只是 8 字节的指针；可写的是数组那块内存，字面量所在的只读区不能写。
- [ ] 两者都占 4 字节，因为里面装的是同样三个字符
  > `a` 占 4 字节没错，但 `p` 是指针变量，64 位平台上固定 8 字节，跟字符串内容无关；字符存在 `p` 指向的只读区里，不在 `p` 里面。
- [ ] `a` 和 `p` 指向同一份内容，所以修改 `a[0]` 之后 `p[0]` 也会变
  > 数组初始化会把字面量的内容**复制**到栈上，`a` 与字面量是两块不同的内存；改 `a[0]` 不会影响 `p` 看到的字符串。
- [ ] `a` 和 `p` 都可以用 `a = "xyz";` / `p = "xyz";` 改变指向
  > `p = "xyz";` 合法（指针变量可以改指向），但 `a = "xyz";` 是编译错误：数组名不是变量，不能被赋值。
