---
id: s1-compile-pipeline
---

## 讲解

### 一条命令，四个步骤
我们平时用 `gcc hello.c -o hello` 一步就得到了可执行文件，但编译器实际上依次做了四件事：

| 阶段 | 输入 → 输出 | 做了什么 | 单独执行的命令 |
|---|---|---|---|
| 预处理 | `hello.c` → `hello.i` | 处理所有 `#` 开头的指令：把 `#include` 的文件内容粘贴进来、把 `#define` 的宏替换掉、删除注释 | `gcc -E hello.c -o hello.i` |
| 编译 | `hello.i` → `hello.s` | 检查语法和类型，把 C 代码翻译成**汇编代码**（人还能勉强读懂的机器指令助记符） | `gcc -S hello.i -o hello.s` |
| 汇编 | `hello.s` → `hello.o` | 把汇编代码翻译成**机器码**，得到"目标文件"。此时调用的 `printf` 还只是一个名字，没有真正的地址 | `gcc -c hello.s -o hello.o` |
| 链接 | `hello.o` + 库 → `hello` | 把一个或多个目标文件和库拼接起来，把每个函数名、变量名（称为**符号**）对应到真正的地址 | `gcc hello.o -o hello` |

### 亲眼看看预处理做了什么
下面这段代码里有注释和宏：

```c run id=pp-demo
#include <stdio.h>
#define WIDTH 8           /* 宽度 */
#define AREA (WIDTH * WIDTH)

int main(void) {
    // 计算并输出面积
    printf("面积 = %d\n", AREA);
    return 0;
}
```
```output
面积 = 64
```

执行 `gcc -E` 后，`main` 部分会变成下面这样（`#include <stdio.h>` 被替换成了几百行的声明，这里省略）：

```c
int main(void) {

    printf("面积 = %d\n", (8 * 8));
    return 0;
}
```

注释没了，`AREA` 被**原样替换**成了 `(8 * 8)`。宏替换只是文本替换，这一点在后面"预处理器"一章会反复用到。

### 错误出在哪个阶段？
认识这四个阶段最实际的用处是**读懂报错**。不同阶段的错误长得不一样：

| 报错里出现的关键字 | 阶段 | 常见原因 |
|---|---|---|
| `fatal error: xxx.h: No such file or directory` / `'xxx.h' file not found` | 预处理 | 头文件名写错、或者用双引号包含了一个不存在的文件 |
| `error: expected ';'`、`use of undeclared identifier` | 编译 | 语法错误、变量没定义、类型不对 |
| `undefined reference to 'xxx'` / `undefined symbol: xxx`（前面带 `ld` 字样） | 链接 | 函数只有声明没有定义、函数名拼错、定义它的 .c 文件没参与编译 |

先看一个**编译阶段**的错误——第 4 行末尾少了分号：

```c run id=compile-err expect=CE
#include <stdio.h>

int main(void) {
    printf("hi\n")
    return 0;
}
```

再看一个**链接阶段**的错误。下面的程序**能通过编译**：第 3 行告诉编译器"有一个叫 `twice` 的函数"（这叫**声明**），所以调用它在语法上没问题。但整个程序里没有任何地方真正写出 `twice` 的函数体（**定义**），到链接时就找不到它了：

```c run id=link-err expect=CE
#include <stdio.h>

int twice(int x);          /* 只有声明，没有定义 */

int main(void) {
    printf("%d\n", twice(21));
    return 0;
}
```

把 `twice` 的定义补上，链接就成功了：

```c run id=link-ok
#include <stdio.h>

int twice(int x);          /* 声明 */

int main(void) {
    printf("%d\n", twice(21));
    return 0;
}

int twice(int x) {         /* 定义 */
    return x * 2;
}
```
```output
42
```

### 多个源文件
大程序会拆成多个 `.c` 文件。每个 `.c` 文件**单独**经过预处理、编译、汇编，得到各自的 `.o`；最后链接器把所有 `.o` 拼起来。所以"函数在 A 文件里定义、在 B 文件里调用"是完全可以的——前提是 B 文件里有它的声明（通常写在头文件里），并且两个文件都参与了链接。本节的编程题就是一个多文件工程。

## 编译与运行

```bash
gcc -E hello.c -o hello.i      # 只做预处理，看看宏和 #include 展开后的样子
gcc -S hello.c -o hello.s      # 预处理 + 编译，得到汇编代码
gcc -c hello.c -o hello.o      # 预处理 + 编译 + 汇编，得到目标文件
gcc hello.o -o hello           # 链接，得到可执行文件

# 多文件工程：一次性编译并链接所有 .c 文件
gcc -std=c17 -Wall -Wextra main.c geometry.c -o app
```

注意：**头文件（.h）不出现在编译命令里**，它们通过 `#include` 被粘贴进 .c 文件。本平台的多文件题会自动把你提交的所有 `.c` 文件一起编译链接。

## 常见错误

### 以为"编译通过"就等于程序没问题
编译阶段只检查单个文件内部的语法和类型。函数只声明不定义、函数名拼错，都要到**链接**时才会暴露。看到 `undefined reference` 时不要去检查语法，应该检查：函数名是否拼写一致、定义在哪个文件、那个文件有没有参与编译。

### 在头文件里写函数定义
如果头文件里写的是完整的函数体，而两个 .c 文件都 `#include` 了它，那么每个 .c 文件编译出的 .o 里都有一份这个函数，链接时会报"重复定义"（`multiple definition` / `duplicate symbol`）：

```c
/* geometry.h —— 错误写法：头文件里放了函数定义 */
long long rect_area(int w, int h) { return (long long)w * h; }
```

头文件里只放**声明**（`long long rect_area(int w, int h);`），定义放在对应的 .c 文件里。

## 客观题

### q-s1-compile-pipeline-1 single link-diagnosis
程序编译时报错：`undefined reference to 'add'`。这个错误发生在哪个阶段？最可能的原因是什么？
- [ ] 预处理阶段；没有 `#include <stdio.h>`
  > 预处理阶段的错误是"找不到头文件"一类。没有包含 stdio.h 会在**编译**阶段报 printf 未声明，而不是这个错误。
- [ ] 编译阶段；`add` 这一行少了分号
  > 少分号是语法错误，报错会是 `expected ';'`，发生在编译阶段。
- [x] 链接阶段；`add` 被声明并调用了，但没有任何参与链接的文件给出它的定义（或者定义的名字拼写不同）
  > 正确。`undefined reference` 是链接器的报错：编译时凭声明认可了这个调用，链接时却找不到真正的函数体。
- [ ] 运行阶段；`add` 函数里出现了除以零
  > 这是编译时的报错，程序根本还没生成，谈不上运行。
