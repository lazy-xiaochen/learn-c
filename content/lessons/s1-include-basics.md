---
id: s1-include-basics
---

## 讲解

### #include 做了什么
`#include` 是一条**预处理指令**：在编译之前，预处理器把指定文件的全部内容原样复制到 `#include` 所在的位置。它不是"导入一个库"，只是**文本粘贴**。

标准库头文件里装的是函数的**声明**（告诉编译器"有这么一个函数，参数和返回值是什么类型"），函数的真正实现在编译器自带的库里，链接时才会接进来。所以：
- 忘了 `#include` → 编译器不认识这个函数，**编译**阶段报错；
- 包含了头文件，链接时才把库里的实现接上。

### 两种形式
```c
#include <stdio.h>       /* 尖括号：标准库或系统提供的头文件 */
#include "geometry.h"    /* 双引号：你自己工程里的头文件 */
```

两者的区别只在于**去哪里找这个文件**：

| 写法 | 搜索顺序 |
|---|---|
| `#include <xxx.h>` | 只在**系统头文件目录**中查找（编译器自带的标准库目录，以及用 `-I` 指定的目录） |
| `#include "xxx.h"` | **先在当前源文件所在的目录**查找；找不到，再按尖括号的方式去系统目录找 |

约定俗成：标准库用尖括号，自己写的头文件用双引号。用双引号包含 `stdio.h` 其实也能工作（因为找不到时会退回系统目录），但会让读代码的人困惑。

### 常用标准库头文件
| 头文件 | 常用内容 |
|---|---|
| `<stdio.h>` | `printf`、`scanf`、`puts`、`getchar`、文件操作 |
| `<stdlib.h>` | `abs`、`llabs`、`malloc`、`free`、`exit`、`EXIT_SUCCESS` |
| `<string.h>` | `strlen`、`strcpy`、`strcmp`、`memcpy` |
| `<math.h>` | `sqrt`、`pow`、`fabs`、`floor` |
| `<limits.h>` | `INT_MAX`、`INT_MIN` 等各整数类型的取值范围 |
| `<ctype.h>` | `isdigit`、`isalpha`、`toupper` |

下面的程序用到了三个不同头文件里的内容：

```c run id=three-headers
#include <stdio.h>     /* printf */
#include <stdlib.h>    /* abs */
#include <limits.h>    /* INT_MAX */

int main(void) {
    printf("abs(-5) = %d\n", abs(-5));
    printf("int 最大值 = %d\n", INT_MAX);
    return 0;
}
```
```output
abs(-5) = 5
int 最大值 = 2147483647
```

### 头文件里不只有函数声明
前面说头文件里装的是"函数的声明"，那是主要部分，但不是全部。头文件里还常有**宏**——用 `#define` 定义的名字，在预处理阶段就被替换成具体的值。最典型的是 `<limits.h>`，它一个函数都没有，全是各种整数类型的边界值：

```c run id=limits
#include <stdio.h>
#include <limits.h>    /* 里面全是宏，没有函数 */

int main(void) {
    printf("char 占 %d 位\n", CHAR_BIT);
    printf("short 最大 %d\n", SHRT_MAX);
    printf("int 最小 %d，最大 %d\n", INT_MIN, INT_MAX);
    printf("unsigned int 最大 %u\n", UINT_MAX);
    return 0;
}
```
```output
char 占 8 位
short 最大 32767
int 最小 -2147483648，最大 2147483647
unsigned int 最大 4294967295
```

`INT_MAX` 这些名字不是变量。预处理阶段它们就被替换成了数字字面量：你写的 `INT_MAX`，到编译器眼里已经是 `2147483647`——没有内存、没有地址，也没有"读出当前值"这回事。变量则相反，它是运行期才存在的一块内存。

初学者常有的误解是"包含头文件 = 把库的代码复制进来"。不是。`<limits.h>` 里根本没有可执行的代码，它只提供**名字**；真正的库代码在编译器自带的库文件里，`#include` 拿到的只是"说明书"。

### 忘记包含头文件会怎样
把上面的 `#include <stdlib.h>` 删掉，编译器就不认识 `abs` 了。在 C99 及之后的标准里，调用一个没有声明的函数是错误：

```c run id=missing-header expect=CE
#include <stdio.h>

int main(void) {
    printf("%d\n", abs(-5));
    return 0;
}
```

报错信息通常是 `call to undeclared library function 'abs'` 或 `implicit declaration of function 'abs'`，编译器往往还会提示你应该包含哪个头文件。

### 双引号包含的文件不存在
如果 `"xxx.h"` 在当前目录和系统目录都找不到，**预处理**阶段就会失败（`fatal error: 'mylib.h' file not found`），后面的步骤都不会进行：

```c run id=not-found expect=CE
#include <stdio.h>
#include "mylib.h"

int main(void) {
    printf("hi\n");
    return 0;
}
```

（在本平台，双引号只能包含你自己提交的文件，所以这里报的是平台给出的中文提示。）

### 同一个头文件被包含多次也没事
既然 `#include` 是原样粘贴，你可能会担心"包含两次岂不是把同一份声明粘了两遍，会不会报重复定义"。实际上标准头文件都做了防护，包含几次都可以：

```c run id=twice
#include <stdio.h>
#include <stdio.h>     /* 再粘一遍 */
#include <stdio.h>     /* 再粘一遍 */

int main(void) {
    printf("包含三次也能编译通过\n");
    return 0;
}
```
```output
包含三次也能编译通过
```

防护的办法是在头文件开头和结尾加几行**条件编译**指令，也就是常说的"包含卫士"（include guard）：

```c
#ifndef MYLIB_H       /* 第一次包含时 MYLIB_H 还没有定义，整段内容保留 */
#define MYLIB_H       /* 立刻定义它，下次再包含时上面的条件就不成立 */

int add(int a, int b);    /* 声明写在这里 */

#endif
```

第二次包含同一个文件时，`#ifndef MYLIB_H` 不成立，整段内容在预处理阶段直接被丢掉，所以不会出现两遍声明。自己写头文件时一定要加这几行——否则在文件互相包含的工程里，很容易看到重定义类的报错。

### #include 相关报错速查
| 你看到的现象 | 真正的原因 | 怎么办 |
|---|---|---|
| `call to undeclared library function 'abs'` | 没有包含声明它的头文件 | 查文档补上 `#include <stdlib.h>` |
| `fatal error: 'mylib.h' file not found` | 文件不存在、名字拼错，或所在目录不在搜索路径里 | 检查文件名与拼写；用 `-I目录` 把目录加进搜索路径 |
| `undefined reference to 'add'` | 只有声明没有实现，对应的 .c 没参与编译 | 把 `util.c` 也写进命令：`gcc main.c util.c` |
| `redefinition of 'xxx'`（重定义） | 头文件被重复包含，而且没有包含卫士 | 在头文件里加 `#ifndef / #define / #endif` |

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra main.c -o main

# 自己的头文件放在其他目录（例如 include/）时，用 -I 把目录加入搜索路径
gcc -std=c17 -Wall -Wextra -Iinclude main.c util.c -o main

# 查看编译器实际搜索了哪些目录
gcc -E -v main.c -o /dev/null
```

## 常见错误

### 以为包含了头文件就"有了函数"
头文件里只有声明。如果是你自己写的 `util.h`，对应的 `util.c` 也必须参与编译（`gcc main.c util.c`），否则链接时会报 `undefined reference`。

### 用了函数却忘了对应的头文件
最常见的是用了 `abs`、`malloc`、`exit` 却没有 `#include <stdlib.h>`，用了 `strlen` 却没有 `#include <string.h>`。看到"undeclared function"时，先查一下这个函数属于哪个头文件。

### 头文件名写错
`#include <stdio>`（少了 `.h`）、`#include <studio.h>`（拼成了 studio）都会在预处理阶段失败。

### 在头文件里写函数定义
头文件应当只放**声明**：`int add(int a, int b);` 末尾是分号。如果把函数体也写进头文件（`int add(int a, int b) { return a + b; }`），那么每个包含它的 .c 文件都会得到一份同名函数，链接时报 `multiple definition of 'add'`。函数体写在 `.c` 里，头文件里只留一句声明。

## 客观题

### q-s1-include-basics-1 single
当前目录下有自己写的 `config.h`，下面关于 `#include "config.h"` 和 `#include <config.h>` 的说法正确的是：
- [ ] 两种写法完全等价，只是风格不同
  > 搜索顺序不同：双引号先找当前文件所在目录，尖括号只找系统目录（和 -I 指定的目录）。
- [x] `#include "config.h"` 会先在当前源文件所在目录查找，所以能找到；`#include <config.h>` 只在系统目录中查找，如果没有用 -I 指定当前目录就会找不到
  > 正确。这正是"自己的头文件用双引号"的原因。
- [ ] `#include <config.h>` 会在整个硬盘上搜索这个文件
  > 编译器只在固定的几个目录里搜索，不会扫描整个硬盘。
- [ ] `#include` 会把 config.c 也一起编译进来
  > `#include` 只做文本粘贴，只处理你写的那一个文件；对应的 .c 文件必须自己写进编译命令。
