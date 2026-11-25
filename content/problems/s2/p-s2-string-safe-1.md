---json
{
  "id": "p-s2-string-safe-1",
  "title": "安全拼接邮箱：snprintf 与截断检测",
  "difficulty": "L3",
  "knowledgePoints": ["s2-string-safe", "s2-string-functions"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
用户注册时，系统要把「用户名」和「域名」拼成邮箱地址，存进一个**固定 32 字节**的字段里（`char email[32];`）。

给定用户名和域名，请拼出 `用户名@域名`：

1. 如果拼出来的长度**不超过 31**（留一个字节给结尾的 `'\0'`），就完整保存，输出完整邮箱；
2. 如果拼出来超过 31 个字符，就**截断**：只保留前 31 个字符，并用 `TRUNCATED` 标明发生了截断。

你需要输出三行：

1. 第一行：最终存进字段里的内容（可能被截断）；
2. 第二行：这段内容的字符个数；
3. 第三行：`OK`（完整放得下）或 `TRUNCATED`（被截断）。

这道题的坑全在"32 字节"这个硬限制上：

- `strcpy` + `strcat` 完全不知道字段有多大，用户名和域名一长就会写越界（缓冲区溢出）；
- `strncpy(email, name, 32)` 也不保险：`name` 较长时它**不会补 `'\0'`**，后面接 `'\0'` 或 `strcat` 时又会出问题；
- `snprintf(email, sizeof email, "%s@%s", name, domain)` 才是正确选择：它最多写 31 个字符加一个 `'\0'`，并且**返回值是"本来想写多少个字符"**，用它就能可靠地判断截断。

注意"恰好 32 个字符"和"恰好 31 个字符"这两种边界：31 个字符放得下（`OK`），32 个字符就要截断成 31 个字符（`TRUNCATED`）。

## 输入格式
两行：
1. 第一行：用户名，由小写字母、数字和下划线组成，长度 1 到 25；
2. 第二行：域名，由小写字母和点组成，长度 1 到 20。

## 输出格式
三行：
1. 第一行：最终内容（放不下时是前 31 个字符）；
2. 第二行：最终内容的字符个数（十进制整数，不含 `'\0'`）；
3. 第三行：`OK` 或 `TRUNCATED`。

## 数据范围
- 用户名长度：1 ≤ len ≤ 25；
- 域名长度：1 ≤ len ≤ 20；
- 拼出来的总长度 = 用户名长度 + 1（`@`）+ 域名长度，范围是 3 到 46；
- 字段容量固定为 32 字节（含 `'\0'`），所以最多能存 31 个字符。

## 示例
### 示例 1
```in
alice example.com
```
```out
alice@example.com
17
OK
```
> `alice@example.com` 一共 17 个字符，小于 31，完整保存。

### 示例 2（边界：恰好 31 个字符）
```in
abcdefghijklmnopqrstuvwxy a.com
```
```out
abcdefghijklmnopqrstuvwxy@a.com
31
OK
```
> 25 + 1 + 5 = 31，正好用满 31 个字符，还剩最后一字节放 `'\0'`，所以是 `OK` 而不是截断。

## 提示
### 第 1 层
先算出拼起来需要多少字符（用户名长度 + 1 + 域名长度），再和"字段最多能存多少字符"比较。但真正写代码时，推荐让 `snprintf` 去做这件事，因为它同时保证不越界。

### 第 2 层
`snprintf` 的第二个参数是**缓冲区的总容量（含 `'\0'`）**，所以写 `snprintf(email, sizeof email, "%s@%s", name, domain)`。它的返回值不是"实际写了几个字符"，而是"如果缓冲区足够大，本来需要几个字符"——这正是判断截断的依据。

### 第 3 层
`int need = snprintf(buf, sizeof buf, "%s@%s", name, domain);`，然后 `need >= (int)sizeof buf` 说明需要 `need + 1` 个字节（含 `'\0'`），而缓冲区只有 32 个，发生截断。截断时 `buf` 里已经是"前 31 个字符 + `'\0'`"，直接用 `printf("%s")` 输出即可；长度用 `strlen(buf)` 得到 31。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define CAP 32

int main(void) {
    char name[40], domain[40];
    if (scanf("%39s", name) != 1) {
        return 0;
    }
    if (scanf("%39s", domain) != 1) {
        return 0;
    }

    /* snprintf 的第二个参数是缓冲区的总容量（含结尾的 '\0'），
     * 所以最多写进去 CAP - 1 = 31 个字符，绝不会越界。 */
    char buf[CAP];
    int need = snprintf(buf, sizeof buf, "%s@%s", name, domain);

    printf("%s\n", buf);
    printf("%zu\n", strlen(buf));
    printf("%s\n", need >= (int)sizeof buf ? "TRUNCATED" : "OK");
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define CAP 32

int main(void) {
    char name[40], domain[40];
    if (scanf("%39s", name) != 1) {
        return 0;
    }
    if (scanf("%39s", domain) != 1) {
        return 0;
    }

    char buf[CAP];
    /* TODO:
     * 1. 用 snprintf(buf, sizeof buf, "%s@%s", name, domain) 安全拼接；
     * 2. 用返回值判断有没有被截断；
     * 3. 输出内容、长度、OK / TRUNCATED。 */
    snprintf(buf, sizeof buf, "%s", name);
    printf("%s\n", buf);
    printf("%zu\n", strlen(buf));
    printf("OK\n");
    return 0;
}
```

## 复杂度
时间 O(len)：`snprintf` 与 `strlen` 各扫一遍要写入的字符，len ≤ 46。
空间 O(1)：只有固定的 32 字节字段和两个输入缓冲区。

## 常见错误
### 用 `strcpy` + `strcat` 拼 [RE]
三个函数都不检查目标容量。用户名 25 个字符、域名 20 个字符时一共要 46 个字符加 `'\0'`，往 32 字节的数组里写就会冲出边界。
```c file=main.c expect=RE
#include <stdio.h>
#include <string.h>

#define CAP 32

int main(void) {
    char name[40], domain[40];
    if (scanf("%39s", name) != 1) {
        return 0;
    }
    if (scanf("%39s", domain) != 1) {
        return 0;
    }

    char buf[CAP];
    strcpy(buf, name);       /* 不知道 buf 有多小 */
    strcat(buf, "@");
    strcat(buf, domain);     /* 这里早就越界了 */

    printf("%s\n", buf);
    printf("%zu\n", strlen(buf));
    printf("OK\n");
    return 0;
}
```

### 不看 `snprintf` 的返回值，永远报 `OK` [WA]
即使拼接本身是安全的（`snprintf` 会截断），如果不用返回值判断，程序就会在"其实已经被截断"的情况下骗用户说保存成功。这种 bug 在线上的表现是：邮箱少了几个字符，用户收不到验证码。
```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define CAP 32

int main(void) {
    char name[40], domain[40];
    if (scanf("%39s", name) != 1) {
        return 0;
    }
    if (scanf("%39s", domain) != 1) {
        return 0;
    }

    char buf[CAP];
    snprintf(buf, sizeof buf, "%s@%s", name, domain);

    printf("%s\n", buf);
    printf("%zu\n", strlen(buf));
    printf("OK\n");          /* 错：没有判断截断 */
    return 0;
}
```

### 截断判断差一 [WA]
`need` 是"不含 `'\0'` 的长度"，而缓冲区容量包含 `'\0'`。所以判据是 `need >= (int)sizeof buf`（需要 `need + 1` 字节放不下），写成 `need > sizeof buf` 会把"恰好 32 个字符"这种边界漏掉。
```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define CAP 32

int main(void) {
    char name[40], domain[40];
    if (scanf("%39s", name) != 1) {
        return 0;
    }
    if (scanf("%39s", domain) != 1) {
        return 0;
    }

    char buf[CAP];
    int need = snprintf(buf, sizeof buf, "%s@%s", name, domain);

    printf("%s\n", buf);
    printf("%zu\n", strlen(buf));
    printf("%s\n", need > (int)sizeof buf ? "TRUNCATED" : "OK");   /* 错：漏掉 need == 32 */
    return 0;
}
```

### 用 `strncpy` 却忘了补 `'\0'` [WA]
`strncpy(buf, name, sizeof buf)` 在 `name` 较长时正好写 32 个字符、**一个 `'\0'` 都不写**。后面用 `printf("%s")` 输出时，它会继续读到数组外面；用 `strlen` 求长度也是错的。正确做法是 `strncpy(buf, name, sizeof buf - 1); buf[sizeof buf - 1] = '\0';`，或者干脆用 `snprintf`。

### 把 `snprintf` 的容量参数写成"字符数" [WA]
`snprintf(buf, 31, ...)` 只写 30 个字符加 `'\0'`，白白浪费一个字节，导致"恰好 31 个字符"的用例被误判为截断。容量参数要写 `sizeof buf`（= 32）。

## 测试用例
### 01 sample 示例 1
```in
alice example.com
```
```out
alice@example.com
17
OK
```

### 02 sample 示例 2
```in
abcdefghijklmnopqrstuvwxy a.com
```
```out
abcdefghijklmnopqrstuvwxy@a.com
31
OK
```

### 03 boundary 恰好三十二个字符，必须截断
```in
abcdefghijklmnopqrstuvwxy ab.com
```
```out
abcdefghijklmnopqrstuvwxy@ab.co
31
TRUNCATED
```
> 25 + 1 + 6 = 32，超出 31，只保留前 31 个字符。

### 04 degenerate 用户名和域名都只有一个字符
```in
a b
```
```out
a@b
3
OK
```

### 05 trap 最长的情况：四十六个字符
```in
abcdefghijklmnopqrstuvwxy abcdefghijklmnopqrst
```
```out
abcdefghijklmnopqrstuvwxy@abcde
31
TRUNCATED
```

### 06 normal 普通邮箱
```in
zhangsan example.org
```
```out
zhangsan@example.org
20
OK
```

### 07 trap 域名占满而用户名最短
```in
x abcdefghijklmnopqrst
```
```out
x@abcdefghijklmnopqrst
22
OK
```

### 08 normal 带下划线和多级域名
```in
user_01 mail.server.cn
```
```out
user_01@mail.server.cn
22
OK
```
