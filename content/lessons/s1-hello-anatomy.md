---
id: s1-hello-anatomy
---

## 讲解

### 逐行拆解
```c run id=hello
#include <stdio.h>          /* 第 1 行：引入标准输入输出库的声明 */

int main(void) {            /* 第 3 行：程序的入口 */
    printf("Hello, World!\n");   /* 第 4 行：一条语句 */
    return 0;               /* 第 5 行：告诉操作系统"正常结束" */
}
```
```output
Hello, World!
```

| 片段 | 含义 |
|---|---|
| `#include <stdio.h>` | 预处理指令：把标准库头文件 `stdio.h` 的内容粘贴到这里。里面有 `printf` 的**声明**，没有它编译器不认识 `printf` |
| `int main(void)` | 定义一个名为 `main` 的函数。`int` 表示它返回一个整数；`(void)` 表示它不接收任何参数 |
| `{ ... }` | 函数体，里面是要执行的语句，从上到下依次执行 |
| `printf("...");` | 调用 `printf` 函数输出文字。双引号里的内容是**字符串**，`\n` 是换行符 |
| `;` | 每条语句的结束标志 |
| `return 0;` | 结束 `main` 函数，并把 0 作为程序的**退出码**交给操作系统 |
| `/* ... */` 和 `// ...` | 注释，给人看的说明，编译器会忽略它们 |

### main 的两种标准写法
C 标准规定 `main` 只能写成下面两种形式之一（参数名可以换）：

```c
int main(void) { ... }                       /* 不需要命令行参数 */
int main(int argc, char *argv[]) { ... }     /* 需要读取命令行参数 */
```

你可能在旧书或网上见到 `void main()` 或者只写 `main()`，它们都不是标准写法：前者在很多编译器上会报错或警告，后者是 C89 的遗留写法，C99 起已经不允许省略返回类型。

### 返回值：程序的"退出码"
`main` 的返回值会交给启动它的程序（命令行、脚本、判题器）。约定 **0 表示成功，非 0 表示出错**。标准库在 `<stdlib.h>` 里也提供了两个宏 `EXIT_SUCCESS` 和 `EXIT_FAILURE`。

下面的程序故意返回 3。本平台把非 0 的退出码视为"运行错误"（RE），会给出提示：

```c run id=exit3 expect=RE
#include <stdio.h>

int main(void) {
    printf("我要返回 3\n");
    return 3;
}
```

所以做题时一定要让 `main` 以 `return 0;` 结束。（C99 起，如果 `main` 执行到末尾的 `}` 还没有 return，等同于 `return 0;`，但显式写出来是好习惯。）

### 转义字符
双引号里有些字符不能直接写，需要用反斜杠 `\` 开头的**转义序列**表示：

| 写法 | 含义 |
|---|---|
| `\n` | 换行 |
| `\t` | 制表符（Tab） |
| `\"` | 双引号本身 |
| `\\` | 反斜杠本身 |
| `%%` | 在 `printf` 的格式串里输出一个 `%`（这不是转义序列，而是 printf 的规则） |

```c run id=escape
#include <stdio.h>

int main(void) {
    printf("他说：\"你好\"\n");
    printf("路径：C:\\Users\\me\n");
    printf("进度：100%%\n");
    printf("A\tB\tC\n");
    return 0;
}
```
```output
他说："你好"
路径：C:\Users\me
进度：100%
A	B	C
```

### 空白与格式
C 语言不关心缩进和换行（字符串内部除外），下面两种写法对编译器完全一样。但为了让人能读懂，请始终保持一致的缩进（本平台使用 4 个空格）。

```c
int main(void){printf("hi\n");return 0;}
```

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra hello.c -o hello
./hello            # Windows 上是 hello.exe
echo $?            # Linux/macOS 查看上一个程序的退出码（Windows cmd 用 echo %errorlevel%）
```

## 常见错误

### 反斜杠没有转义
在字符串里写 `"C:\new"` 时，`\n` 会被当成换行符，输出变成两行。要输出反斜杠本身，必须写成 `\\`。编译器遇到不认识的转义（如 `\c`）通常只给警告，程序照样运行但输出不对：

```c run id=bad-escape warnings=allow
#include <stdio.h>

int main(void) {
    printf("C:\new\test\n");
    return 0;
}
```
```output
C:
ew	est
```

`\n` 变成了换行，`\t` 变成了制表符，原本想要的路径 `C:\new\test` 完全变了样。

### 字符串里的双引号没有转义
`printf("他说"你好"");` 中，第二个 `"` 被当作字符串结束，后面的内容就成了语法错误：

```c run id=bad-quote expect=CE
#include <stdio.h>

int main(void) {
    printf("他说"你好"\n");
    return 0;
}
```

### main 返回了非 0 的值
有的同学习惯在程序结尾写 `return 1;`，或者在出错分支里返回非 0 后忘了改回来。判题器会把非 0 退出码视为运行错误。

## 客观题

### q-s1-hello-anatomy-1 single
关于 `main` 函数，下列说法正确的是：
- [ ] `void main()` 是 C 标准推荐的写法
  > 标准只允许 `int main(void)` 和 `int main(int argc, char *argv[])` 两种形式，`main` 必须返回 `int`。
- [x] `main` 返回 0 表示程序正常结束，返回值会作为程序的退出码交给操作系统
  > 正确。启动程序的一方（命令行、脚本、判题器）可以读取这个退出码判断程序是否成功。
- [ ] 一个程序里可以有多个 `main` 函数，按顺序依次执行
  > 一个程序只能有一个 `main`，它是唯一的入口；有两个会在链接时报重复定义。
- [ ] `main` 里的语句是从下往上执行的
  > 函数体里的语句按从上到下的顺序执行（遇到分支、循环、函数调用时才会跳转）。
