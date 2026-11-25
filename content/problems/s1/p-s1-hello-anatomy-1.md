---json
{
  "id": "p-s1-hello-anatomy-1",
  "title": "按格式输出含引号、反斜杠和百分号的三行文字",
  "difficulty": "L1",
  "knowledgePoints": ["s1-hello-anatomy"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入一个整数 n，按下面的格式输出三行（`<n>` 处换成读入的整数，其余字符原样输出）：

```
"n" = <n>
path: C:\clearn\<n>.txt
done: 100%
```

## 输入格式
一行，一个十进制整数 n（可能带有正负号或前导零）。

## 输出格式
三行，格式见题目描述。输出的整数不带前导零、不带正号。

## 数据范围
-2147483648 ≤ n ≤ 2147483647

## 示例
### 示例 1
```in
42
```
```out
"n" = 42
path: C:\clearn\42.txt
done: 100%
```

### 示例 2（边界：负数）
```in
-7
```
```out
"n" = -7
path: C:\clearn\-7.txt
done: 100%
```

## 提示
### 第 1 层
有三个字符没法直接写进 `printf` 的格式字符串里：双引号、反斜杠和百分号。

### 第 2 层
双引号写成 `\"`，反斜杠写成 `\\`（这两个是 C 字符串的转义序列）；百分号在 `printf` 的格式串中要写成 `%%`。读入整数用 `scanf("%d", &n)`。

### 第 3 层
注意 `%d` 按十进制读入，`007` 会读成 7；不要用 `%i`，它会把以 0 开头的数当作八进制。三行分别用三次 `printf` 输出，每行末尾记得 `\n`。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    /* %d 始终按十进制解析，"010" 读作 10 */
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    printf("\"n\" = %d\n", n);                /* \" 输出双引号 */
    printf("path: C:\\clearn\\%d.txt\n", n);  /* \\ 输出一个反斜杠 */
    printf("done: 100%%\n");                  /* %% 输出一个百分号 */
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    /* 在这里输出三行 */

    return 0;
}
```

## 复杂度
O(1)。本题考查字符串中的转义序列与 `printf` 的 `%%`。

## 常见错误
### 反斜杠没有转义 [WA]
`"C:\clearn\%d"` 中的 `\c` 不是合法的转义序列（编译器会给警告），得到的输出里没有反斜杠。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    printf("\"n\" = %d\n", n);
    printf("path: C:\clearn\%d.txt\n", n);
    printf("done: 100%%\n");
    return 0;
}
```

### 用 %i 读入整数 [WA]
`%i` 会根据前缀判断进制：`010` 被当作八进制，读成 8；`0x10` 被当作十六进制。题目要求按十进制理解输入，应使用 `%d`。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%i", &n) != 1) {
        return 0;
    }
    printf("\"n\" = %d\n", n);
    printf("path: C:\\clearn\\%d.txt\n", n);
    printf("done: 100%%\n");
    return 0;
}
```

### 百分号只写了一个 [WA]
`printf("done: 100%\n")` 中，`%` 后面跟着的 `\n` 不是合法的格式说明符，结果是未定义的；常见表现是百分号和换行一起消失，输出格式错乱。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    printf("\"n\" = %d\n", n);
    printf("path: C:\\clearn\\%d.txt\n", n);
    printf("done: 100%");
    printf("\n");
    return 0;
}
```

### 双引号没有转义 [CE]
`printf(""n" = %d\n", n);` 中第二个 `"` 就结束了字符串，后面的 `n" = ...` 成了语法错误。

## 测试用例
### 01 sample 示例 1
```in
42
```
```out
"n" = 42
path: C:\clearn\42.txt
done: 100%
```

### 02 sample 示例 2
```in
-7
```
```out
"n" = -7
path: C:\clearn\-7.txt
done: 100%
```

### 03 boundary int 最大值
```in
2147483647
```
```out
"n" = 2147483647
path: C:\clearn\2147483647.txt
done: 100%
```

### 04 boundary int 最小值
```in
-2147483648
```
```out
"n" = -2147483648
path: C:\clearn\-2147483648.txt
done: 100%
```

### 05 degenerate 零
```in
0
```
```out
"n" = 0
path: C:\clearn\0.txt
done: 100%
```

### 06 trap 前导零（%i 会按八进制读成 8）
```in
010
```
```out
"n" = 10
path: C:\clearn\10.txt
done: 100%
```

### 07 trap 带正号和前后空白
```in
   +0099  
```
```out
"n" = 99
path: C:\clearn\99.txt
done: 100%
```

### 08 normal 一般情况
```in
2026
```
```out
"n" = 2026
path: C:\clearn\2026.txt
done: 100%
```
