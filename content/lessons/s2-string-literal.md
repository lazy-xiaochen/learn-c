---
id: s2-string-literal
---

## 讲解

### 字面量住在程序的哪个部分

写下一个 `"hello"`，编译器在**编译期**就把这 6 个字节（5 个字符加 `'\0'`）写进了可执行文件的**只读数据段**。程序跑起来以后，这 6 个字节被装进内存的只读页面，位置固定、内容不再变化。

程序的内存大致可以分成几块：

| 区域 | 放什么 | 能不能写 |
|---|---|---|
| 代码区 | 编译好的机器指令 | 只读 |
| 只读数据段 | 字符串字面量、`const` 全局量 | 只读 |
| 全局 / 静态区 | 全局变量、`static` 变量 | 可写 |
| 栈 | 函数的局部变量、参数 | 可写 |
| 堆 | `malloc` 申请的内存 | 可写 |

所以"字符串字面量"不是"某个变量里的内容"，而是**程序映像里的一段固定字节**。`char *p = "hello";` 只是把这段字节的首地址存进 `p`。

还有一个细节：字面量本身是一个数组。`"abc"` 的类型是 `char[4]`（三个字符 + `'\0'`），所以 `sizeof` 一个字面量得到的是字节数：

```c run id=literal-sizeof
#include <stdio.h>

int main(void) {
    printf("sizeof(\"abc\") = %zu\n", sizeof("abc"));
    const char *p = "abc";
    printf("sizeof(p) = %zu\n", sizeof p);
    printf("字符串本身 = %s\n", p);
    return 0;
}
```
```output
sizeof("abc") = 4
sizeof(p) = 8
字符串本身 = abc
```

同一个 `abc`，`sizeof` 出来一个 4 一个 8：**字面量是 4 字节的数组，指针是 8 字节的地址**。`sizeof` 只量变量自己，不会顺着指针去量它指向的内容。

### 静态存储期：函数返回了，字面量还在

局部变量放在栈上，函数一返回就失效。字面量不一样，它从程序启动到结束一直在（这叫**静态存储期**）。所以把字面量的地址返回给调用者是安全的：

```c run id=static-lifetime
#include <stdio.h>

const char *pick(int i) {
    const char *names[] = {"zero", "one", "two"};
    return names[i];        /* 返回的是字面量的地址，函数结束后依然有效 */
}

int main(void) {
    for (int i = 0; i < 3; i++) {
        printf("%s\n", pick(i));
    }
    return 0;
}
```
```output
zero
one
two
```

要注意区分两件事：`names` 这个局部数组确实在 `pick` 返回后失效了，但 `names[i]` 里存的**地址**指向的是只读区的字面量，那块内存一直都在。如果这里返回的是 `char buf[10]` 的地址，就变成"返回局部变量的地址"，是另一类未定义行为。

### 修改字面量：未定义行为

C 标准写得很明确：**修改字符串字面量是未定义行为**（undefined behavior，UB）。标准没有规定"应该"发生什么，于是不同编译器、不同操作系统可以给出完全不同的结果：可能当场崩溃，可能悄悄改掉，也可能什么都不做。本平台（Clang + AddressSanitizer）的表现是访问违例：

```c run id=write-literal expect=RE
#include <stdio.h>

int main(void) {
    char *p = "hello";
    printf("%s\n", p);
    p[0] = 'H';              /* 未定义行为：往只读页面里写 */
    printf("%s\n", p);
    return 0;
}
```

为什么不停下来？因为只读页面是由操作系统保护的：`p[0]` 对应的地址被标记成"只读"，一条写指令打上去，CPU 立刻抛出访问违例，进程被终止。**这是"运气好"的情形**——错误立刻暴露。

真正危险的是相反的情况：某些平台上字面量可能落在可写内存里，`p[0] = 'H'` 居然"成功"了，程序继续跑，还打印出正确结果。这时 bug 被藏了起来，等换一台机器、换一个编译器才爆发。所以判断一段代码对不对，**不能靠"我这儿跑通了"**。

### `const` 让编译器替你检查

既然字面量不能改，就应该在类型上写清楚。把指针声明成 `const char *`，一旦误写，编译阶段就会报错：

```c run id=const-literal expect=CE
int main(void) {
    const char *p = "hello";
    p[0] = 'H';              /* 编译错误：read-only variable is not assignable */
    return 0;
}
```

这就是 `const char *p = "hello";` 比 `char *p = "hello";` 好得多的原因：**错误从"运行时的 UB"提前成了"编译器的报错"**。在 C 里这两种写法都能编译（后者只是不推荐），在 C++ 里 `char *p = "hello";` 已经是非法写法了。

如果确实需要一份可以改的副本，就复制到自己的数组里：

```c run id=copy-then-modify
#include <stdio.h>

int main(void) {
    const char *p = "hello";
    char buf[16];

    int i = 0;
    while (p[i] != '\0') {                     /* 读字面量：完全安全 */
        char c = p[i];
        if (c >= 'a' && c <= 'z') {
            c = (char)(c - 'a' + 'A');
        }
        buf[i] = c;                            /* 写自己的数组：安全 */
        i++;
    }
    buf[i] = '\0';                             /* 别忘了自己补上结尾 */

    printf("原来的：%s\n", p);
    printf("大写的：%s\n", buf);
    return 0;
}
```
```output
原来的：hello
大写的：HELLO
```

关键的一步是 `buf[i] = '\0'`：复制字符不会自动带上结尾标记，忘记它，后面 `printf("%s")` 就会一直读到数组外面去。

### 内存图：字面量在只读区，副本在栈上

```memory title="const char *p = \"hello\"; char buf[16]; 复制并转成大写之后（地址为示意值）"
地址        | 内容        | 变量 / 区域          | 说明
0x7ffd2000  | 0x402000    | p（栈）              | 8 字节，只存只读区地址
0x7ffd2008  | 'H'         | buf[0]（栈）         | 副本，可读可写
0x7ffd2009  | 'E'         | buf[1]（栈）         | 副本
0x7ffd200a  | 'L'         | buf[2]（栈）         | 副本
0x7ffd200b  | 'L'         | buf[3]（栈）         | 副本
0x7ffd200c  | 'O'         | buf[4]（栈）         | 副本
0x7ffd200d  | '\0'        | buf[5]（栈）         | 我们自己补的结尾
0x402000    | 'h'         | 字面量（只读数据段） | 原封不动，谁也没改它
0x402001    | 'e'         | 字面量（只读数据段） | 只读
0x402002    | 'l'         | 字面量（只读数据段） | 只读
0x402003    | 'l'         | 字面量（只读数据段） | 只读
0x402004    | 'o'         | 字面量（只读数据段） | 只读
0x402005    | '\0'        | 字面量（只读数据段） | 只读
```

### 字面量可能被合并，别拿地址当身份

两个内容相同的字面量，编译器**允许**只存一份、让两个指针指向同一个地址（这叫合并，string pooling），也**允许**各存一份。也就是说：

```c
const char *a = "abc";
const char *b = "abc";
printf("%d\n", a == b);      /* 可能是 1，也可能是 0，标准不管 */
```

标准只保证内容相同，不保证地址相同（反过来，地址不同也不代表内容不同）。所以：

- 想比较内容：用 `strcmp`（下一节就讲），不能用 `==`；
- 想给某个字符串一个稳定的身份：用数组或自己管理的内存，别依赖字面量合并的细节。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra literal.c -o literal
./literal
```

本平台用 Clang，命令等价：

```bash
clang -std=c17 -Wall -Wextra literal.c -o literal
./literal
```

想抓住"把字面量赋给 `char *`"这种写法，可以加 `-Wwrite-strings`：

```bash
gcc -std=c17 -Wall -Wextra -Wwrite-strings literal.c -o literal
```

本平台的演示代码默认带 AddressSanitizer 与 UndefinedBehaviorSanitizer，所以"写只读区"这类错误会直接给出报告，而不是悄悄改掉内存。

## 常见错误

### 把字面量当缓冲区接收输入
`char *p = "hello";` 之后让 `scanf` / `fgets` / `strcpy` 往 `p` 里写，等价于修改字面量，一样是 UB。这里用 `scanf` 演示，输入任意内容都会在写入时崩溃：
```c run id=scanf-into-literal expect=RE stdin="hi"
#include <stdio.h>

int main(void) {
    char *p = "hello";
    if (scanf("%4s", p) != 1) {      /* 写只读区：未定义行为 */
        return 0;
    }
    printf("%s\n", p);
    return 0;
}
```
接收入口必须用**有真实容量**的数组：`char buf[16]; fgets(buf, sizeof buf, stdin);`。

### 以为字面量在栈上，函数返回就消失
字面量有静态存储期，程序运行期间一直存在，返回它的地址是安全的。真正不能返回的是**局部数组**的地址（`char buf[10]` 那种）。把这两者混为一谈，就会写出多余的全局部变量，或者反过来错误地返回局部数组。

### 以为 `char a[] = "abc"` 里的 `a` 就是那个字面量
不是。初始化时内容被**复制**进数组，`a` 有自己的 4 个字节：`&a[0]` 与字面量的地址不同，改 `a[0]` 也不会影响字面量。想验证的话打印 `(void *)a` 和 `(void *)"abc"`，两个地址不一样。

### 用 `==` 比较字符串
`==` 比较的是地址，不是内容。两个字面量是否合并由实现决定，两个数组一定不相等，所以 `==` 的结果既不可靠也不可移植。比较内容要用 `strcmp`。

## 客观题

### q-s2-string-literal-1 single
关于字符串字面量 `"hello"`，下面哪一句是正确的？

- [x] 它存放在只读数据段，程序运行期间一直有效；修改它是未定义行为
  > 正确。字面量在编译期就写进可执行文件，具有静态存储期；标准明确规定修改字面量是 UB，常见表现是访问违例（段错误）。
- [ ] 它存放在栈上，函数一返回这块内存就失效
  > 栈上是局部变量。字面量在只读数据段，函数返回后依然有效，所以返回字面量的地址是安全的。
- [ ] 它可以被修改，只是改完以后 `sizeof` 的结果会跟着变
  > `sizeof` 在编译期就确定了，和运行时改了什么都无关；而且修改字面量本身就是 UB，不是"改了会怎样"的问题。
- [ ] 内容相同的两个字面量一定指向同一个地址，所以可以用 `==` 判断内容是否相同
  > 标准只"允许"合并相同的字面量，不要求。`==` 比的是地址，`"abc" == "abc"` 的结果不确定，比较内容必须用 `strcmp`。
