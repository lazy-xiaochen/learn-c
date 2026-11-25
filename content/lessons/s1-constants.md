---
id: s1-constants
---

## 讲解

### 字面量
直接写在代码里的值叫**字面量**（literal）：

| 写法 | 类型 | 说明 |
|---|---|---|
| `42` | `int` | 十进制整数 |
| `052` | `int` | **以 0 开头是八进制**，等于 42 |
| `0x2A` | `int` | 以 0x 开头是十六进制，等于 42 |
| `42u` / `42U` | `unsigned int` | 后缀 U：无符号 |
| `42L` | `long` | 后缀 L：long |
| `42LL` | `long long` | 后缀 LL：long long |
| `42ULL` | `unsigned long long` | 后缀可以组合 |
| `3.14` | `double` | 浮点字面量默认是 double |
| `3.14f` | `float` | 后缀 f：float |
| `1e9` | `double` | 科学计数法，1×10⁹，**是浮点数不是整数** |
| `'A'` | `int` | 字符字面量，值是字符编码 65 |

没有后缀的整数字面量，如果 `int` 放不下，编译器会自动选用更大的类型（`long`、`long long`）。

```c run id=literals
#include <stdio.h>

int main(void) {
    printf("%d %d %d\n", 42, 052, 0x2A);
    printf("%zu %zu\n", sizeof 42, sizeof 42LL);
    printf("%zu %zu\n", sizeof 3.14, sizeof 3.14f);
    printf("%d\n", 'A');
    return 0;
}
```
```output
42 42 42
4 8
8 4
65
```

### 后缀为什么重要：运算发生在什么类型下
表达式的类型由**操作数**决定，而不是由结果要存到哪里决定：

```c run id=suffix
#include <stdio.h>

int main(void) {
    long long a = 1000000 * 1000;      /* int × int：结果 10^9，int 能装下 */
    long long b = 1000000LL * 1000000; /* 有一个是 long long，按 long long 计算 */
    printf("%lld\n%lld\n", a, b);
    return 0;
}
```
```output
1000000000
1000000000000
```

如果把第二行写成 `1000000 * 1000000`，乘法会在 `int` 下进行并溢出（编译器会警告 `overflow in expression`），存进 `long long` 也来不及了。

### const：只读变量
`const` 修饰的变量在初始化之后不能再被修改。它有类型、有作用域，编译器会帮你检查：

```c run id=const-ok
#include <stdio.h>

int main(void) {
    const int MAX_SCORE = 100;
    const double PI = 3.14159265358979;
    printf("%d %.2f\n", MAX_SCORE, PI * 2);
    return 0;
}
```
```output
100 6.28
```

试图修改它会导致编译错误：

```c run id=const-err expect=CE
int main(void) {
    const int MAX_SCORE = 100;
    MAX_SCORE = 200;
    return 0;
}
```

### #define：宏常量
`#define 名字 替换文本` 是一条预处理指令���在编译之前，所有出现"名字"的地方都被**原样替换**成"替换文本"。它没有类型，也不占内存，末尾**不加分号**：

```c run id=define
#include <stdio.h>

#define SECONDS_PER_DAY (24 * 60 * 60)

int main(void) {
    int days = 3;
    printf("%d 天 = %d 秒\n", days, days * SECONDS_PER_DAY);
    return 0;
}
```
```output
3 天 = 259200 秒
```

替换文本是一个表达式时要**加括号**。如果写成 `#define SECONDS_PER_DAY 24 * 60 * 60`，那么 `100000 / SECONDS_PER_DAY` 会被替换成 `100000 / 24 * 60 * 60`，结果完全不同。

### const 还是 #define？
| | `const` 变量 | `#define` 宏 |
|---|---|---|
| 有没有类型 | 有，编译器会检查 | 没有，只是文本替换 |
| 作用域 | 遵守作用域规则 | 从定义处到文件末尾都有效 |
| 调试 | 调试器里能看到名字 | 编译前就被替换掉了，看不到 |
| 能否用作数组长度、case 标签 | 在 C 中**不能**（不是常量表达式） | 可以 |

一般原则：能用 `const` 的地方用 `const`；需要常量表达式（数组长度、`case` 标签）时用 `#define` 或后面会学到的 `enum`。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra const.c -o const
gcc -E const.c | tail -n 20      # 看看 #define 被替换之后的代码
```

## 常见错误

### 以 0 开头的数是八进制
`int code = 010;` 的值是 8 不是 10。写十进制数时不要加前导零。`09` 甚至是编译错误（八进制没有数字 9）。

### 以为结果存进 long long 就不会溢出
`long long us = 24 * 60 * 60 * 1000000;` 中四个数都是 `int`，乘法在 `int` 下进行，结果溢出。应当写成 `24LL * 60 * 60 * 1000000`。

### #define 末尾加了分号
`#define MAX 100;` 会把分号也一起替换进去：`int a = MAX + 1;` 变成 `int a = 100; + 1;`，后者虽然能编译（`+1;` 是一条没有作用的语句），但 a 的值是 100 而不是 101；写在 `if (x > MAX)` 里则直接编译错误。

## 客观题

### q-s1-constants-1 single
下面哪个表达式的值是 **long long 类型的 10¹²**，并且计算过程中不会溢出？
- [ ] `1000000 * 1000000`
  > 两个操作数都是 int，乘法在 int 下进行，10¹² 远超 int 的范围，发生溢出（未定义行为）。
- [x] `1000000LL * 1000000`
  > 正确。一个操作数是 long long，另一个会被转换成 long long，乘法在 64 位下进行。
- [ ] `(long long)(1000000 * 1000000)`
  > 括号里的 int 乘法已经溢出，之后再转换类型也无法挽回。
- [ ] `1e6 * 1e6`
  > `1e6` 是 double 字面量，结果是 double 类型的 1e12，不是 long long。
