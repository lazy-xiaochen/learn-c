---
id: s2-string-safe
---

## 讲解

### 问题的根源：函数不知道目标有多大

`strcpy` 和 `strcat` 的签名里只有两个地址，没有任何"这块内存有多大"的信息：

```c
char *strcpy(char *dst, const char *src);   /* dst 能装多少？不知道 */
char *strcat(char *dst, const char *src);   /* 还剩多少空间？不知道 */
```

于是它们只能埋头往里写，写多少取决于源字符串有多长。目标装不下时，多出来的字节就会踩到别的变量、返回地址甚至下一个函数的栈帧——这就是**缓冲区溢出**。它是 C 语言历史上被利用最多的安全漏洞类型。

标准库给出的对策是三组"带长度上限"的函数：`strncpy`、`strncat`、`snprintf`。它们的共同思路是**把"最多写多少"明确写出来**。但这三个函数各有一个容易踩的坑，必须逐个说清楚。

### `strncpy`：限长复制，但不保证补 `'\0'`

`strncpy(dst, src, n)` 从 `src` 复制**最多** `n` 个字符到 `dst`：

- 如果 `src` 的长度**小于** `n`：剩下的位置全部用 `'\0'` 填满（所以结果一定以 `'\0'` 结尾）；
- 如果 `src` 的长度**大于等于** `n`：正好复制 `n` 个字符，**一个 `'\0'` 都不写**。

第二种情况就是陷阱。下面这段代码先把缓冲区填满 `Z`，再限长复制 3 个字符：

```c run id=strncpy-no-null
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[8] = "ZZZZZZZ";     /* 先填满，方便看清哪几个字节被改动了 */
    strncpy(buf, "hello", 3);    /* 只复制 3 个字符；源比 3 长，所以不补 '\0' */
    printf("[%s]\n", buf);
    return 0;
}
```
```output
[helZZZZ]
```

结果不是 `hel`，而是 `helZZZZ`：前三个字节被改写，后面的 `Z` 原封不动，**整个数组里没有 `'\0'`**。这时候用 `printf("%s")` 打印，它会一直读到数组外面去；用 `strlen` 数长度，结果不可预测。这是一个"看起来成功了"的 bug，比直接崩溃更难查。

正确用法是**自己补结尾**，并且把 `n` 写成"容量减一"：

```c run id=strncpy-safe
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[8];
    strncpy(buf, "hello", sizeof buf - 1);   /* 最多复制 7 个字符 */
    buf[sizeof buf - 1] = '\0';              /* 最后一位自己保证是 '\0' */
    printf("[%s] 长度 %zu\n", buf, strlen(buf));
    return 0;
}
```
```output
[hello] 长度 5
```

`sizeof buf - 1` 保证最多写到 `buf[6]`，把 `buf[7]` 留给 `'\0'`；再手动写一次 `buf[sizeof buf - 1] = '\0'`，不管复制了几个字符，结尾都一定是好的。如果源字符串比 7 个字符还长，结果就被截断成 7 个字符——**截断总比溢出好**。

### `strncat`：`n` 是"最多追加几个字符"

`strncat(dst, src, n)` 从 `dst` 的 `'\0'` 处开始，最多追加 `n` 个字符，然后**一定会补上 `'\0'`**。注意这个 `n` 是"从 `src` 里取几个字符"，**不是**"`dst` 一共有多少字节"：

```c run id=strncat-n
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[10] = "abc";
    strncat(buf, "defghij", 3);      /* 最多追加 3 个字符 */
    printf("%s\n", buf);

    char buf2[10] = "abc";
    strncat(buf2, "de", 5);          /* 源只有 2 个字符：追加完就停，仍然补 '\0' */
    printf("%s\n", buf2);
    return 0;
}
```
```output
abcdef
abcde
```

所以目标缓冲区至少要有 `strlen(dst) + min(n, strlen(src)) + 1` 个字节。把 `n` 写成 `sizeof buf` 是最常见的错误——因为 `dst` 里已经有内容了，剩下的空间一定比 `sizeof buf` 小，于是又溢出了。

### `snprintf`：最稳妥的选择

`snprintf(buf, size, 格式, ...)` 的三个要点：

1. 第二个参数 `size` 是**缓冲区的总容量（含 `'\0'`）**，函数最多写 `size - 1` 个字符，然后补 `'\0'`——绝不会越界；
2. 返回值是"**如果缓冲区足够大，本来想写多少个字符**"（不含 `'\0'`），而不是实际写进去的字符数；
3. 因此只要拿返回值和 `size` 比一下，就知道有没有被截断。

```c run id=snprintf-truncate
#include <stdio.h>

int main(void) {
    char buf[8];
    int need = snprintf(buf, sizeof buf, "%s-%s", "abcdef", "ghi");

    printf("[%s]\n", buf);
    printf("need = %d\n", need);
    printf("截断了吗？%d\n", need >= (int)sizeof buf);
    return 0;
}
```
```output
[abcdef-]
need = 10
截断了吗？1
```

`"abcdef" + "-" + "ghi"` 一共 10 个字符，但 `buf` 只有 8 字节，所以实际只写进去 7 个字符 `abcdef-`；返回值仍然是 10，`10 >= 8` 说明发生了截断。**这个返回值就是判断截断的唯一依据**。

下面是一个完整的、可以直接抄进项目里的写法：

```c run id=snprintf-full
#include <stdio.h>

int main(void) {
    char buf[16];
    const char *name = "DeepSeek";
    const char *suffix = "-2026";

    int need = snprintf(buf, sizeof buf, "%s%s", name, suffix);
    if (need < 0) {
        printf("格式化出错\n");
    } else if (need >= (int)sizeof buf) {
        printf("放不下：需要 %d 字节（含 '\\0'），缓冲区只有 %zu 字节\n", need + 1, sizeof buf);
    } else {
        printf("%s\n", buf);
    }
    return 0;
}
```
```output
DeepSeek-2026
```

`need < 0` 是编码错误（本平台不会发生，但要养成检查的习惯）；`need >= (int)sizeof buf` 是截断；剩下的情况才是完整写入。

### 三个函数怎么选

| 场景 | 推荐 | 理由 |
|---|---|---|
| 把一段文本拼进固定大小的缓冲区 | `snprintf` | 一定不越界，返回值能判断截断 |
| 复制一个字符串并保证结尾 | `strncpy` + 手动补 `'\0'` | 必须自己补 `'\0'`，别忘了 |
| 在已有内容后面追加一段 | `strncat`，`n` 用剩余空间 | `n` 是追加上限，不是缓冲区大小 |
| 只比较前 n 个字符 | `strncmp` | 与 `strcmp` 规则相同，只是限定长度 |
| 明确知道目标足够大 | `strcpy` / `strcat` 也可以用 | 但要能证明"一定装得下" |

### 内存图：`strncpy(buf, "hello", 3)` 改动了哪几个字节

```memory title="char buf[8] = \"ZZZZZZZ\"; 执行 strncpy(buf, \"hello\", 3) 之后（地址为示意值）"
地址        | 内容 | 变量 / 区域  | 说明
0x7ffd4000  | 'h'  | buf[0]（栈） | 被复制进来的第 1 个字符
0x7ffd4001  | 'e'  | buf[1]（栈） | 被复制进来的第 2 个字符
0x7ffd4002  | 'l'  | buf[2]（栈） | 被复制进来的第 3 个字符
0x7ffd4003  | 'Z'  | buf[3]（栈） | 没被碰过，这里本该是 '\0'
0x7ffd4004  | 'Z'  | buf[4]（栈） | 没被碰过
0x7ffd4005  | 'Z'  | buf[5]（栈） | 没被碰过
0x7ffd4006  | 'Z'  | buf[6]（栈） | 没被碰过
0x7ffd4007  | 'Z'  | buf[7]（栈） | 没被碰过
```

只有前 3 个字节变了，`'\0'` 一个都没有。数组长度为 8，合法下标是 0 到 7，所以这 8 个字节都在数组里——**问题不是越界，而是丢掉了字符串的结束标记**。字符串一旦没有结尾，后面所有依赖 `'\0'` 的函数（`printf`、`strlen`、`strcat`）都会跑飞。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra safe.c -o safe
./safe
```

本平台用 Clang，命令等价：

```bash
clang -std=c17 -Wall -Wextra safe.c -o safe
./safe
```

本平台还会在编译期提示一些明显的长度错误，例如"`strncat` 的长度参数太大，可能溢出"（`-Wstrncat-size`）。这类警告不要忽略：它指出的正是本节讲的坑。

## 常见错误

### 继续用 `strcpy` 往固定缓冲区里塞
只要源字符串比目标长，`strcpy` 就会越界写。下面把 5 个字符塞进 5 字节的数组，连 `'\0'` 都放不下：
```c run id=strcpy-small expect=RE
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[5];
    strcpy(buf, "hello");      /* 需要 6 字节，只有 5 字节 */
    printf("%s\n", buf);
    return 0;
}
```
正确做法是 `char buf[6]`（或更大），并用 `snprintf(buf, sizeof buf, "%s", src)` 之类的写法让编译器帮你守住容量。

### 把 `strncat` 的 `n` 写成缓冲区大小
`n` 是"从源里取几个字符"，不是"目标缓冲区有多少字节"。目标里已经有内容时，这样写必然溢出：
```c run id=strncat-size expect=RE
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[10] = "abc";
    strncat(buf, "0123456789", sizeof buf);   /* 追加 10 个字符 → 13 字节 + '\0' */
    printf("%s\n", buf);
    return 0;
}
```
正确写法是把 `n` 限制在剩余空间内：`sizeof buf - strlen(buf) - 1`。

### 以为 `strncpy` 一定会补 `'\0'`
只有当源字符串比 `n` 短时它才补。源更长时它恰好写 `n` 个字符、不写 `'\0'`，字符串就没有结尾了。要么手动补 `'\0'`，要么直接用 `snprintf`。

### 只看 `snprintf` 写进去的内容，不看返回值
被截断时 `buf` 里是一段**合法但残缺**的字符串，`printf` 照样能打出来，程序看起来一切正常。如果这段残缺内容被当成文件名、邮箱、SQL 语句用，问题会在很远的地方爆发。必须用 `need >= (int)sizeof buf` 判断截断并处理。

### 用 `sprintf` 而不是 `snprintf`
`sprintf` 没有任何长度限制，等价于"让 `strcpy` 带上格式串"，风险更大。现代 C 代码里除非能证明输出长度有上界，否则一律用 `snprintf`。

## 客观题

### q-s2-string-safe-1 single
要把 `name` 和 `domain` 拼成 `name@domain` 放进 `char buf[32]`，并且希望在太长时能被发现，下面哪种写法最稳妥？

- [x] `int n = snprintf(buf, sizeof buf, "%s@%s", name, domain); if (n >= (int)sizeof buf) { /* 截断 */ }`
  > 正确。`snprintf` 最多写 `sizeof buf - 1` 个字符并补 `'\0'`，绝不越界；返回值是"本来想写多长"，用它就能可靠地判断截断。
- [ ] `strcpy(buf, name); strcat(buf, "@"); strcat(buf, domain);`
  > 三个函数都不检查容量。只要 `name` 和 `domain` 加起来超过 31 个字符，就会写越界，属于未定义行为。
- [ ] `strncpy(buf, name, sizeof buf); strncat(buf, "@", sizeof buf); strncat(buf, domain, sizeof buf);`
  > 两处都有问题：`name` 较长时 `strncpy` 不会补 `'\0'`；`strncat` 的 `n` 是"最多追加几个字符"，写成 `sizeof buf` 会追加到越过缓冲区末尾。
- [ ] `sprintf(buf, "%s@%s", name, domain);`
  > `sprintf` 不接收长度参数，完全不知道 `buf` 有多大，和 `strcpy` 一样会溢出，而且返回值表示写入了多少个字符，不能用来判断截断。
