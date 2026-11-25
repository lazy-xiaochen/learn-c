---
id: s1-switch
---

## 讲解

### 基本形式
当需要根据**一个整数值**在多个固定的选项中选择时，`switch` 比一长串 `else if` 更清楚：

```c run id=basic stdin="3"
#include <stdio.h>

int main(void) {
    int day;
    if (scanf("%d", &day) != 1) return 1;
    switch (day) {
    case 1:
        printf("星期一\n");
        break;
    case 2:
        printf("星期二\n");
        break;
    case 3:
        printf("星期三\n");
        break;
    default:
        printf("其他\n");
        break;
    }
    return 0;
}
```
```output
星期三
```

执行规则：
1. 计算 `switch (表达式)` 的值；
2. 跳到值相等的那个 `case` 标签；没有相等的就跳到 `default`（没有 default 就什么也不做）；
3. **从那里开始一直往下执行**，直到遇到 `break` 或者 switch 的结尾 `}`。

### fall-through：没有 break 就会"掉"进下一个 case
第 3 条规则是 switch 最大的陷阱。`case` 只是一个**跳转目标**，不是分支的边界。漏写 `break`，程序会继续执行下面所有 case 的代码：

```c run id=fallthrough stdin="2"
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    switch (n) {
    case 1:
        printf("一\n");
    case 2:
        printf("二\n");       /* 从这里进入 */
    case 3:
        printf("三\n");       /* 没有 break，继续执行 */
    default:
        printf("默认\n");     /* 还是没有 break */
    }
    return 0;
}
```
```output
二
三
默认
```

### 有意利用 fall-through
多个值需要执行相同的代码时，可以把 case 叠在一起：

```c run id=grouped stdin="o"
#include <stdio.h>

int main(void) {
    char c;
    if (scanf(" %c", &c) != 1) return 1;
    switch (c) {
    case 'a':
    case 'e':
    case 'i':
    case 'o':
    case 'u':
        printf("元音\n");
        break;
    default:
        printf("不是元音\n");
        break;
    }
    return 0;
}
```
```output
元音
```

如果一个 case 写了代码、又**故意**不写 break，要加注释（比如 `/* fall through */`）说明这是有意的，否则读代码的人（包括以后的你）会以为是漏写了。

### switch 的限制
- 表达式必须是**整数类型**（`int`、`char`、`long` 以及后面要学的 `enum`），不能是 `double` 或字符串；
- 每个 `case` 后面必须是**整数常量表达式**（字面量、`#define` 的宏、enum 常量），不能是变量；
- 两个 case 的值不能相同。

```c run id=double-switch expect=CE
#include <stdio.h>

int main(void) {
    double x = 1.0;
    switch (x) {
    case 1.0:
        printf("one\n");
        break;
    }
    return 0;
}
```

### 在 case 里声明变量要加花括号
C17 中，`case` 标签后面不能直接跟一个声明。需要在 case 里用临时变量时，用花括号围出一个代码块：

```c
case 1: {
    int tmp = a * 2;
    printf("%d\n", tmp);
    break;
}
```

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra sw.c -o sw
gcc -std=c17 -Wall -Wextra -Wimplicit-fallthrough sw.c -o sw   # 对每一处可能漏写的 break 给出警告
```

## 常见错误

### 漏写 break
最常见的 switch bug。**每写一个 case，先把 break 写上**，再往中间填代码。

### 以为 default 必须放在最后
default 可以放在任何位置，但不论放在哪里，它都只在"没有 case 匹配"时才被跳转到；它后面如果没有 break，同样会 fall through。习惯上放在最后。

### case 后面写了一个范围或者变量
`case 90 ... 100:` 不是标准 C（是 GCC 扩展），`case x:`（x 是变量）会编译错误。范围判断用 if-else。

## 客观题

### q-s1-switch-1 single
n 为 2 时，下面代码输出什么？
```c
int s = 0;
switch (n) {
case 1: s += 1;
case 2: s += 2;
case 3: s += 3; break;
case 4: s += 4;
}
printf("%d", s);
```
- [ ] `2`
  > case 2 后面没有 break，会继续执行 case 3 的代码。
- [x] `5`
  > 正确。从 case 2 进入：s += 2，fall through 到 case 3：s += 3，遇到 break 退出，s = 5。
- [ ] `9`
  > case 3 末尾有 break，不会继续执行 case 4。
- [ ] `6`
  > 从 case 2 开始执行，case 1 的 s += 1 不会执行。
