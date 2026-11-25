---
id: s5-ub-string-literal
---

## 讲解

### 字面量住在只读页里

写下 `"hello"` 的那一刻，编译器就已经把这 6 个字节（5 个字符加结尾的 `'\0'`）写进了可执行文件的**只读数据段**。程序运行时，这段内容被装进一块标记为"只读"的内存页：

| 区域 | 放什么 | 可写 |
|---|---|---|
| 代码区 | 机器指令 | 否 |
| 只读数据段（`.rdata` / `.rodata`） | 字符串字面量、`const` 全局量 | 否 |
| 全局/静态区 | 全局变量、`static` 变量 | 是 |
| 栈 | 局部变量、参数 | 是 |
| 堆 | `malloc` 得到的 | 是 |

`char *p = "hello";` 只是把这段只读字节的首地址存进 `p`。读它、打印它、`strlen` 它都没有任何问题：

```c run id=lit-read
#include <stdio.h>
#include <string.h>

int main(void) {
    const char *p = "hello, world";
    printf("内容: %s\n", p);
    printf("长度: %zu\n", strlen(p));
    printf("第三个字符: %c\n", p[2]);
    printf("sizeof 字面量: %zu\n", sizeof("hello, world"));
    return 0;
}
```
```output
内容: hello, world
长度: 12
第三个字符: l
sizeof 字面量: 13
```

注意最后一行 `sizeof` 是 13：**字面量本身是一个 `char[13]` 数组**（12 个字符 + `'\0'`），不是指针。这一点后面会反复用到。

```memory title="const char *p = \"hello, world\"; 的内存关系（地址为示意）"
地址      | 内容 | 属于                | 说明
0x7ffd1000 | 0x402000 | p（栈，8 字节）  | 只存只读区的首地址，内容不在这里
0x402000  | 'h'  | 字面量（只读数据段） | 页属性：可读、不可写
0x402001  | 'e'  | 字面量（只读数据段） | 
0x402002  | 'l'  | 字面量（只读数据段） | 
0x402003  | 'l'  | 字面量（只读数据段） | 
0x402004  | 'o'  | 字面量（只读数据段） | 
0x402005  | ','  | 字面量（只读数据段） | 
0x402006  | ' '  | 字面量（只读数据段） | 
0x402007  | 'w'  | 字面量（只读数据段） | 
0x40200c  | 0    | 字面量（只读数据段） | 结尾的 '\0'，一共 13 个字节
```

### 改它为什么是 UB

标准写得很直接（C17 6.4.5p7）：

> 这些数组是否彼此独立由实现自行决定；**如果程序试图修改这样的数组，行为未定义**。

三个字：改就 UB。不是"改不了"，是"标准不保证会发生什么"。现实中有三种表现，都真实存在：

1. **访问违例**：字面量落在只读页上，写指令一执行，CPU 立刻抛异常，进程被杀。本平台就是这样，这是最走运的情形——错误立刻暴露。
2. **悄悄改掉**：某些平台的字面量（或某些编译器选项下）落在可写内存里，`p[0] = 'H'` 竟然"成功"了，程序继续跑，还打印出"正确"的结果。Bug 被藏起来，等换平台才爆发。
3. **改一处影响别处**：如果编译器把内容相同的字面量合并成一份，改 `"abc"` 就等于改了程序里所有 `"abc"`——这种 bug 极难定位。

本平台的默认配置（Clang + AddressSanitizer，`-O0`）属于第 1 种：

```c run id=lit-write-asan expect=RE
#include <stdio.h>

int main(void) {
    char *p = "hello";
    printf("before: %s\n", p);
    p[0] = 'H';                       /* 往只读区里写：未定义行为 */
    printf("after:  %s\n", p);
    return 0;
}
```

报的是"非法内存访问（段错误）"。这里有个细节值得注意：**判 `RE` 而不是 `UB`**，因为这个错误是操作系统的页保护抓到的，在 UBSan 之前就发生了；ASan 也不检查只读数据区的写（它管的是栈、堆、全局变量的越界）。换句话说，抓到它的不是 sanitizer，是内存管理单元。

把 sanitizer 关掉，结果一样——访问违例来自操作系统，与 sanitizer 无关：

```c run id=lit-write-nosan-O0 sanitize=off expect=RE
#include <stdio.h>

int main(void) {
    char *p = "hello";
    printf("before: %s\n", p);
    p[0] = 'H';                       /* 同上，只是没有 sanitizer 帮忙 */
    printf("after:  %s\n", p);
    return 0;
}
```

### 平台实测：-O2 下它居然"不崩了"

同一段代码换成 `-O2`：

```c run id=lit-write-O2 opt=-O2 sanitize=off nocheck reason="修改字面量是未定义行为，-O2 下这次写入被优化掉了"
#include <stdio.h>

int main(void) {
    char *p = "hello";
    printf("before: %s\n", p);
    p[0] = 'H';                       /* 同一个 UB，只是换了优化级别 */
    printf("after:  %s\n", p);
    return 0;
}
```

本平台实测输出是：

```text
before: hello
after:  hello
```

**既没有崩溃，也没有改成功**——`p[0] = 'H'` 这次写入被整段删掉了，两次打印都是原始的字面量 `hello`。

原因不难推：`p` 指向的是字面量，编译器知道那块内存不可写，于是 `%s` 打印 `p` 这件事被直接折叠成 `puts("hello")`；既然 `p` 的内容在任何地方都不再被观察，那次写就成了一次"死存储"，被优化器删掉了。于是程序的行为变成"什么都没发生"。

这正是 UB 最阴险的形态：`-O0` 崩溃、`-O2` 静默地什么都没做，而**两者都不是"正确"**。如果有人只在 `-O2` 下测过，会得出"这段代码没问题，只是改不动"的结论，然后把它留在代码库里。

| 编译选项 | 本平台表现 | 解释 |
|---|---|---|
| `-O0` + sanitizer | 判 `RE`，非法内存访问 | 只读页保护生效，写指令触发异常 |
| `-O0` 无 sanitizer | 判 `RE`，退出码 `0xC0000005` | 同上，说明与 sanitizer 无关 |
| `-O2` 无 sanitizer | "跑通"，两次都打印 `hello` | 写入被优化删除，程序什么都没做 |

### 字面量还可能被合并：别拿地址当身份

标准允许（但不要求）把内容相同的字面量合并成一份。本平台会合并，所以：

```c run id=lit-pool
#include <stdio.h>

int main(void) {
    const char *a = "abc";
    const char *b = "abc";
    char c[] = "abc";
    printf("a == b ? %s\n", a == b ? "是" : "否");
    printf("a == c ? %s\n", (const char *)a == (const char *)c ? "是" : "否");
    printf("内容相同 ? %s\n", a[0] == c[0] && a[1] == c[1] ? "是" : "否");
    return 0;
}
```
```output
a == b ? 是
a == c ? 否
内容相同 ? 是
```

三个结论：

- `a == b` 为真，是因为两个内容相同的字面量被合并成了同一份。这不是标准保证的，换编译器可能变成"否"；
- `a == c` 为假，因为 `c` 是一个真正的数组，有自己独立的 6 个字节；
- 内容相同，但 `==` 的结果不可靠——**比较字符串内容永远用 `strcmp`**。

合并这件事还意味着：如果 `"abc"` 真的落在可写内存里，改 `a[0]` 会连 `b[0]` 一起改，甚至影响程序里所有出现 `"abc"` 的地方。

### 要改就先复制一份

正确的做法只有一条：**把字面量当只读源，复制到自己的可写数组里再改**。

```c run id=lit-copy
#include <stdio.h>

int main(void) {
    const char *p = "hello";
    char buf[8];
    for (int k = 0; k <= 5; k++) {    /* 连结尾的 '\0' 一起复制 */
        buf[k] = p[k];
    }
    buf[0] = 'H';                     /* 改的是自己的数组，完全合法 */
    printf("字面量: %s\n", p);
    printf("副本:   %s\n", buf);
    return 0;
}
```
```output
字面量: hello
副本:   Hello
```

`buf[k] = p[k]` 里的 `k <= 5` 是有意的：`"hello"` 占 6 个字节，循环必须把 `'\0'` 也复制过去，否则 `buf` 不是字符串，`printf("%s")` 会一路读到数组外面。更省事的写法是 `char buf[8] = "hello";`——初始化式的复制由编译器完成，`buf` 是一份独立的可写副本。

两种"看起来差不多"的写法，含义完全不同：

| 写法 | 存储 | 可写 | `sizeof` |
|---|---|---|---|
| `const char *p = "hello";` | 指针在栈、内容在只读区 | 否 | 8（指针大小） |
| `char a[] = "hello";` | 6 个字节都在栈上 | 是 | 6（数组大小） |

```c run id=lit-sizeof
#include <stdio.h>
#include <string.h>

int main(void) {
    const char *p = "hello";
    char a[] = "hello";
    printf("sizeof(p) = %zu, sizeof(a) = %zu\n", sizeof p, sizeof a);
    printf("strlen(p) = %zu, strlen(a) = %zu\n", strlen(p), strlen(a));
    a[0] = 'H';
    printf("%s %s\n", p, a);
    return 0;
}
```
```output
sizeof(p) = 8, sizeof(a) = 6
strlen(p) = 5, strlen(a) = 5
hello Hello
```

`sizeof` 量的是变量自己：指针是 8 字节，数组是 6 字节。`strlen` 顺着地址数到 `'\0'`，两者都是 5。改 `a[0]` 只影响 `a`，字面量毫发无损。

所以函数接口的写法也有讲究：只读的字符串参数写成 `const char *`，需要缓冲区就由调用者传 `char *` 和容量进来。**"谁负责提供可写内存"必须在接口上说清楚**，否则下一个人就会把字面量传进去。

## 编译与运行

用 gcc 或 clang 都行，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra literal.c -o literal
./literal
```

```bash
clang -std=c17 -Wall -Wextra literal.c -o literal
./literal
```

加 `-Wwrite-strings` 能让编译器在**编译期**就拦住"把字面量赋给 `char *`"的写法：

```bash
clang -std=c17 -Wall -Wextra -Wwrite-strings literal.c -o literal
```

这个选项会把 C 里字符串字面量的类型当成 `const char[]`，于是 `char *p = "hello";` 直接报错。标准并没有这样规定（C 里字面量的类型是 `char[]`），所以这属于"编译器帮你加的一道保险"，项目里值得打开。

想看字面量到底落在哪个段，可以直接读可执行文件：

```bash
objdump -h literal.exe | grep -i rdata
objdump -s -j .rdata literal.exe
```

`.rdata` 就是只读数据段，`strings literal.exe` 也能看到那些字面量。它们被放在这个段里，本身就是"不该被写"的声明。

几个要点：

- 本平台的 `c run` 默认带 AddressSanitizer 和 UndefinedBehaviorSanitizer，但**两者都不检查只读数据段的写**，真正拦住它的是操作系统的页保护，所以结论是 `RE` 而不是 `UB`；
- `-O2` 可能把只读的读取折叠成常量、把对字面量的写当成死代码删掉，于是"崩溃"消失——这不代表代码变正确了；
- 只想验证"能不能改"，不要靠运行结果去猜，直接看类型：`const char *` 改不了，`char[]` 能改，`char *p = "..."` 是埋雷。

## 常见错误

### 用字面量当输入缓冲区 [RE]
`char *p = "hello"; scanf("%4s", p);` 等价于往只读区里写，一样是 UB。这类 bug 通常出现在"图省事直接把默认值赋给指针"的代码里。

```c run id=lit-err-scanf expect=RE stdin="hi"
#include <stdio.h>

int main(void) {
    char *p = "hello";
    if (scanf("%4s", p) != 1) {       /* 写只读区：未定义行为 */
        return 0;
    }
    printf("%s\n", p);
    return 0;
}
```

接收入口必须是有真实容量的数组：`char buf[16]; fgets(buf, sizeof buf, stdin);`。

### 把 `char *` 和 `char[]` 当成同一种东西 [WA]
`const char *p = "hello";` 和 `char a[] = "hello";` 在源码里只差几个字符，内存布局却完全不同：前者只是一个指针，指向共享的只读区；后者是 6 个字节的可写副本。`sizeof` 一个是 8 一个是 6，可写性一个是"否"一个是"是"。判断标准很简单：**看到 `[]` 且带初始化式，就是一份独立副本**。

### 直接对字面量调用会修改参数的库函数 [RE]
`strtok`、`strcpy` 的目标、`strcat` 的目标、`memset`、`toupper` 作用在字符上再写回……这些函数的参数语义里都隐含"可写"。把字面量传进去，编译器不会报错（形参类型是 `char *`），运行期就是 UB。

```c run id=lit-err-strtok expect=RE
#include <stdio.h>
#include <string.h>

int main(void) {
    const char *s = "a,b,c";
    char *tok = strtok((char *)s, ",");   /* 错：strtok 会往字符串里写 '\0' */
    while (tok) {
        printf("%s\n", tok);
        tok = strtok(NULL, ",");
    }
    return 0;
}
```

正确写法是先复制：`char buf[16]; strcpy(buf, s); strtok(buf, ",");`。

### 以为"两个字面量内容相同就一定不相等"或"一定相等" [WA]
标准只说"内容相同的字面量**可以**合并"，合不合并由实现决定。所以 `"abc" == "abc"` 的结果可能是 1 也可能是 0，`a == b` 在同一个程序里也可能因为位置不同而不同。用它做判断，等于把程序的可移植性赌在编译器的实现细节上。比较内容用 `strcmp`。

### 忘了 `const`，把"不能改"这件事只记在脑子里 [UB]
`char *p = "hello";` 在 C 里合法（标准规定字面量类型是 `char[]`），但它把"这块内存不可写"这条信息从类型里抹掉了，编译器再也没法帮你。写成 `const char *p = "hello";` 之后，`p[0] = 'H'` 在**编译期**就会报 `read-only variable is not assignable`——错误从运行期的 UB 提前成了编译错误，成本从"线上崩溃"降到"改一行"。

```c run id=lit-err-const expect=CE
int main(void) {
    const char *p = "hello";
    p[0] = 'H';                       /* 编译错误：read-only variable is not assignable */
    return 0;
}
```

## 客观题

### q-s5-ub-string-literal-1 single
下面关于 `char *p = "hello"; p[0] = 'H';` 的说法，哪一句是正确的？

- [x] 这是未定义行为：字面量在只读数据段，本平台 `-O0` 下写指令触发访问违例（判 `RE`），`-O2` 下这次写可能被优化删除，两种表现都不代表代码正确
  > 正确。标准明确规定修改字符串字面量是 UB，所以任何具体表现都只是"这一次、这个实现"的选择。本平台 `-O0` 下由操作系统的只读页保护拦住（注意判的是 `RE` 而不是 `UB`：ASan 和 UBSan 都不检查只读数据段），`-O2` 下编译器可能把这次写当成死存储删掉，程序"不崩也不改"。
- [ ] 一定会崩溃，因为字符串字面量永远位于只读内存
  > 错。标准没有要求字面量必须放在只读页上，很多嵌入式平台和部分编译器选项下它就落在可写内存里，写入会"成功"。能否崩溃取决于平台，不取决于语言。
- [ ] `-O2` 下能正常跑完，说明 `-O2` 对这个程序做了正确的优化，代码在发布版里没问题
  > 错。`-O2` 下"跑完"是因为写入被删掉了（`p` 的内容之后不再被观察），程序实际什么都没做。同一份源码在 `-O0` 下崩溃、在 `-O2` 下静默，恰恰说明它是 UB。
- [ ] 只要不崩溃就没问题，可以靠打印 `p` 的内容是否变化来判断代码是否安全
  > 错。UB 的判断依据是标准，不是运行结果。而且"内容没变"可能意味着写入被优化掉了，这本身就是编译器利用了 UB 的证据。
