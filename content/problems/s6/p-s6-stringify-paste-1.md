---json
{
  "id": "p-s6-stringify-paste-1",
  "title": "指令分派表：用 # 和 ## 从运算名生成名字与函数名",
  "difficulty": "L4",
  "knowledgePoints": ["s6-stringify-paste"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
我们要给一个"四则运算小工具"搭一张**指令分派表**：输入若干条形如 `运算名 左操作数 右操作数` 的指令，逐条执行并输出结果。支持的运算是：

| 运算名 | 函数 | 含义 |
|---|---|---|
| `add` | `op_add` | 加法 |
| `sub` | `op_sub` | 减法 |
| `mul` | `op_mul` | 乘法 |
| `max` | `op_max` | 取较大者 |

要求的输出格式把**运算名**放在最前面：

```
add(3, 4) = 7
```

起始代码里已经用宏搭好了"名字 → 函数指针"的对照表，但它输出的名字是 `op_add` 而不是 `add`：

```
op_add(3, 4) = 7      ← 起始代码的输出，不符合要求
```

### 这张表是怎么搭的
四个函数名有一个共同前缀 `op_`。为了避免手写四行几乎一样的表项（很容易抄错），代码用**参数化宏**生成表项：

```c
#define OP_ENTRY(n) { ??? , ??? }        /* 一项：名字 + 函数指针 */
#define OP_LIST(X)  X(add), X(sub), X(mul), X(max)   /* 运算名列表 */
static const Op ops[] = { OP_LIST(OP_ENTRY) };
```

这里有两个预处理运算符能帮忙：

- **`#x`（字符串化）**：把实参的记号变成字符串字面量。`#add` 得到 `"add"`；
- **`a##b`（记号拼接）**：把左右两个记号粘成一个。`op_##add` 得到 `op_add`，正好是一个已存在的函数名。

把两者放进 `OP_ENTRY`，一行就能同时得到"名字字符串"和"函数指针"。请把表项宏改对，让每条指令都输出题面要求的格式。**不要求**改四个运算函数的实现，也不要求改 `main` 的输出语句——问题只在表项宏。

## 输入格式
第一行一个整数 `n`：指令条数。
接下来 `n` 行，每行三个部分：`运算名 左操作数 右操作数`，之间用一个空格分隔。运算名一定是 `add`、`sub`、`mul`、`max` 之一。

## 输出格式
每行一条结果：

```
<运算名>(<左>, <右>) = <结果>
```

运算名是**不带 `op_` 前缀**的小写名字；左右操作数按输入原样输出（带负号就带负号）。

## 数据范围
- `1 ≤ n ≤ 1000`；
- `-1000 ≤ 左、右操作数 ≤ 1000`；
- 乘法结果最大 `10⁶`，`int` 足够；
- 每行输入不超过 20 个字符。

## 示例
### 示例 1
```in
5
add 3 4
sub 3 4
mul 3 4
max 3 4
max -5 2
```
```out
add(3, 4) = 7
sub(3, 4) = -1
mul(3, 4) = 12
max(3, 4) = 4
max(-5, 2) = 2
```
> 五种指令各出现一次。注意输出里的名字是 `add`／`sub`／`mul`／`max`，不是函数名 `op_add`。

### 示例 2（边界：只有一条指令且都是负数）
```in
1
mul -2 -3
```
```out
mul(-2, -3) = 6
```
> `n = 1` 是下界；两个负数相乘得正数，顺便验证负号的解析和输出。

## 提示
### 第 1 层
先只看表项宏该怎么写：`OP_ENTRY(n)` 会收到 `add`、`sub`、`mul`、`max` 这样的**运算名**，它需要产出两项内容——一个字符串（打印用）和一个函数指针（调用用）。四个函数都叫 `op_<运算名>`，这是一条固定的命名规律。

### 第 2 层
`#` 和 `##` 各管一件事：

- 想要字符串 `"add"`，就把参数放在 `#` 后面：`#n`；
- 想要标识符 `op_add`，就用 `##` 把 `op_` 和参数粘起来：`op_##n`。

起始代码的问题是列表里传的是**函数名** `op_add`（因为它需要函数指针），于是 `#fn` 得到的字符串也带着前缀。正确的做法是让列表里只放**运算名**，函数名靠 `##` 现场拼出来。

### 第 3 层
把两部分合起来：

```c
#define OP_ENTRY(n) { XSTR(n), XCONCAT(op_, n) }
#define OP_LIST(X)  X(add), X(sub), X(mul), X(max)
```

`XSTR` / `XCONCAT` 是"两层宏"的写法（`#define XSTR(x) STR(x)`、`#define XCONCAT(a, b) CONCAT(a, b)`）。本题里用单层的 `STR(n)`、`CONCAT(op_, n)` 也能通过，但用两层更稳：万一以后列表里传的是另一个宏名（比如 `#define OP_ADD add`），单层会把**宏名**字符串化，两层才会先展开成 `add`。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAX_Q 1000

/* 四个二元运算。函数名统一是 op_ + 运算名，这是下面用 ## 拼接的前提 */
static int op_add(int a, int b) {
    return a + b;
}

static int op_sub(int a, int b) {
    return a - b;
}

static int op_mul(int a, int b) {
    return a * b;
}

static int op_max(int a, int b) {
    return a > b ? a : b;
}

/* 一层宏：真正干活的两个运算符 */
#define STR(x)        #x
#define CONCAT(a, b)  a##b

/* 两层宏：先把实参展开，再交给上面那层。
   如果列表里放的是另一个宏名（例如 OP_ADD），只有两层写法才能拿到它的值。 */
#define XSTR(x)       STR(x)
#define XCONCAT(a, b) CONCAT(a, b)

/* 一项 = 名字字符串 + 函数指针；两样都由运算名生成 */
#define OP_ENTRY(n) { XSTR(n), XCONCAT(op_, n) }

/* 运算名列表：加一个运算只要加一个 op_xxx 函数和这里的一项 */
#define OP_LIST(X) X(add), X(sub), X(mul), X(max)

typedef struct {
    const char *name;
    int (*fn)(int, int);
} Op;

static const Op ops[] = { OP_LIST(OP_ENTRY) };
#define OP_COUNT ((int)(sizeof ops / sizeof ops[0]))

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAX_Q) {
        return 0;
    }

    for (int k = 0; k < n; k++) {
        char name[16];
        int a;
        int b;
        if (scanf("%15s %d %d", name, &a, &b) != 3) {
            return 0;
        }

        const Op *hit = NULL;
        for (int t = 0; t < OP_COUNT; t++) {
            if (strcmp(ops[t].name, name) == 0) {
                hit = &ops[t];
                break;
            }
        }
        if (hit == NULL) {
            return 0;                       /* 题面保证输入合法，这里只是防御 */
        }
        printf("%s(%d, %d) = %d\n", hit->name, a, b, hit->fn(a, b));
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAX_Q 1000

static int op_add(int a, int b) {
    return a + b;
}

static int op_sub(int a, int b) {
    return a - b;
}

static int op_mul(int a, int b) {
    return a * b;
}

static int op_max(int a, int b) {
    return a > b ? a : b;
}

/* TODO：现在列表里传的是函数名 op_add，所以 #fn 得到的字符串也带着 op_ 前缀。
   题目要求输出不带前缀的运算名：让列表只放运算名，函数名用 ## 现场拼出来。 */
#define OP_ENTRY(fn) { #fn, fn }
#define OP_LIST(X) X(op_add), X(op_sub), X(op_mul), X(op_max)

typedef struct {
    const char *name;
    int (*fn)(int, int);
} Op;

static const Op ops[] = { OP_LIST(OP_ENTRY) };
#define OP_COUNT ((int)(sizeof ops / sizeof ops[0]))

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAX_Q) {
        return 0;
    }

    for (int k = 0; k < n; k++) {
        char name[16];
        int a;
        int b;
        if (scanf("%15s %d %d", name, &a, &b) != 3) {
            return 0;
        }

        const Op *hit = NULL;
        for (int t = 0; t < OP_COUNT; t++) {
            if (strcmp(ops[t].name, name) == 0) {
                hit = &ops[t];
                break;
            }
        }
        if (hit == NULL) {
            return 0;
        }
        printf("%s(%d, %d) = %d\n", hit->name, a, b, hit->fn(a, b));
    }
    return 0;
}
```

## 复杂度
时间 O(n × 运算种类)：每条指令在表里顺序查找（最多 4 项），然后调用一次函数。
空间 O(1)：表是编译期的静态数组，长度由宏展开决定。

这张表的价值不在性能，而在"**一处定义、多处自动同步**"：运算名只在 `OP_LIST` 里写一次，字符串和函数名都由它生成。以后加一个 `op_mod`，只需要写函数、在列表里加 `X(mod)`，`#` 和 `##` 会自动产出 `"mod"` 和 `op_mod`——不会出现"改了枚举忘了改字符串"这类不同步的错误。`OP_COUNT` 用 `sizeof` 算，也不会漏。

## 常见错误
### 把运算名和函数名混为一谈，名字带上 `op_` 前缀 [WA]
最典型的错误：列表里直接放函数名 `op_add`，再用 `#fn` 字符串化——`#` 会把**整个记号**变成字符串，于是名字成了 `"op_add"`。输出就变成了 `op_add(3, 4) = 7`。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

static int op_add(int a, int b) {
    return a + b;
}

static int op_sub(int a, int b) {
    return a - b;
}

static int op_mul(int a, int b) {
    return a * b;
}

static int op_max(int a, int b) {
    return a > b ? a : b;
}

#define OP_ENTRY(fn) { #fn, fn }
#define OP_LIST(X) X(op_add), X(op_sub), X(op_mul), X(op_max)

typedef struct {
    const char *name;
    int (*fn)(int, int);
} Op;

static const Op ops[] = { OP_LIST(OP_ENTRY) };
#define OP_COUNT ((int)(sizeof ops / sizeof ops[0]))

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1) {
        return 0;
    }
    for (int k = 0; k < n; k++) {
        char name[16];
        int a;
        int b;
        if (scanf("%15s %d %d", name, &a, &b) != 3) {
            return 0;
        }
        const Op *hit = NULL;
        for (int t = 0; t < OP_COUNT; t++) {
            if (strcmp(ops[t].name, name) == 0) {
                hit = &ops[t];
                break;
            }
        }
        if (hit == NULL) {
            return 0;
        }
        printf("%s(%d, %d) = %d\n", hit->name, a, b, hit->fn(a, b));
    }
    return 0;
}
```

### 用字符串字面量 `"n"` 代替 `#n` [WA]
以为"把参数写进字符串里就会自动替换"是初学者最常见的误解之一。`"n"` 就是两个字符 `n`，预处理器不会进去替换；所有表项的名字都会变成 `n`，输出成了 `n(3, 4) = 7`。要让参数变成字符串，必须用 `#`。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

static int op_add(int a, int b) {
    return a + b;
}

static int op_sub(int a, int b) {
    return a - b;
}

static int op_mul(int a, int b) {
    return a * b;
}

static int op_max(int a, int b) {
    return a > b ? a : b;
}

#define OP_ENTRY(n) { "n", op_##n }        /* 错：字符串字面量里的 n 不会被替换 */
#define OP_LIST(X) X(add), X(sub), X(mul), X(max)

typedef struct {
    const char *name;
    int (*fn)(int, int);
} Op;

static const Op ops[] = { OP_LIST(OP_ENTRY) };
#define OP_COUNT ((int)(sizeof ops / sizeof ops[0]))

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1) {
        return 0;
    }
    for (int k = 0; k < n; k++) {
        char name[16];
        int a;
        int b;
        if (scanf("%15s %d %d", name, &a, &b) != 3) {
            return 0;
        }
        const Op *hit = NULL;
        for (int t = 0; t < OP_COUNT; t++) {
            if (strcmp(ops[t].name, name) == 0) {
                hit = &ops[t];
                break;
            }
        }
        if (hit == NULL) {
            return 0;
        }
        printf("%s(%d, %d) = %d\n", hit->name, a, b, hit->fn(a, b));
    }
    return 0;
}
```

### 想拼接却写了 `op_n`（漏掉 `##`） [CE]
想生成函数名 `op_add`，却只写了 `op_n`：预处理器会把它当成一个**新的标识符** `op_n`，而它从来没有被定义过，编译报 `use of undeclared identifier 'op_n'`。拼接必须用 `##`，而且两边都要是记号：`op_##n`。

```c file=main.c expect=CE
#include <stdio.h>

#define OP_ENTRY(n) { #n, op_n }           /* 错：没有 ##，op_n 是个不存在的名字 */
#define OP_LIST(X) X(add), X(sub)

typedef struct {
    const char *name;
    int (*fn)(int, int);
} Op;

static int op_add(int a, int b) {
    return a + b;
}

static int op_sub(int a, int b) {
    return a - b;
}

static const Op ops[] = { OP_LIST(OP_ENTRY) };

int main(void) {
    printf("%d\n", ops[0].fn(1, 2));
    return 0;
}
```

### 想字符串化"宏的值"，却只用了一层 `#` [WA]
`#define OP_ADD add` 之后，`STR(OP_ADD)` 得到的是 `"OP_ADD"` 而不是 `"add"`——`#` 会**阻止参数展开**。想要宏展开之后的值，必须套两层：`#define XSTR(x) STR(x)`，再用 `XSTR(OP_ADD)`。`##` 也有同样的性质（`CONCAT(op_, OP_ADD)` 会粘出 `op_OP_ADD`），所以拼接也要两层。本节的讲解里有两个运算符的完整例子。

## 测试用例
### 01 sample 示例 1
```in
5
add 3 4
sub 3 4
mul 3 4
max 3 4
max -5 2
```
```out
add(3, 4) = 7
sub(3, 4) = -1
mul(3, 4) = 12
max(3, 4) = 4
max(-5, 2) = 2
```

### 02 sample 示例 2
```in
1
mul -2 -3
```
```out
mul(-2, -3) = 6
```

### 03 boundary 操作数取到上下界
```in
5
mul 1000 1000
mul -1000 -1000
sub -1000 1000
add -1000 -1000
max -1000 1000
```
```out
mul(1000, 1000) = 1000000
mul(-1000, -1000) = 1000000
sub(-1000, 1000) = -2000
add(-1000, -1000) = -2000
max(-1000, 1000) = 1000
```

### 04 degenerate 四种运算全用 0
```in
4
add 0 0
sub 0 0
mul 0 0
max 0 0
```
```out
add(0, 0) = 0
sub(0, 0) = 0
mul(0, 0) = 0
max(0, 0) = 0
```

### 05 trap 名字必须完全匹配，不能带上函数前缀
```in
4
max 7 7
sub 0 -1000
mul 0 1000
add -1 1
```
```out
max(7, 7) = 7
sub(0, -1000) = 1000
mul(0, 1000) = 0
add(-1, 1) = 0
```
> 只要表项里的名字是 `op_max` 之类带前缀的字符串，查表就会失败（或者输出带前缀的名字），这组用例一条都过不了。

### 06 normal 负数与混合运算
```in
6
add 1 2
mul -3 4
max -7 -8
sub 5 -5
mul 12 12
add -1000 999
```
```out
add(1, 2) = 3
mul(-3, 4) = -12
max(-7, -8) = -7
sub(5, -5) = 10
mul(12, 12) = 144
add(-1000, 999) = -1
```

### 生成 boundary 1000 条指令的上界
```js gen
const ops = ['add', 'sub', 'mul', 'max'];
const lines = [];
const out = [];
for (let k = 0; k < 1000; k++) {
  const a = ((k * 37) % 2001) - 1000;
  const b = ((k * 91) % 2001) - 1000;
  const name = ops[k % 4];
  let v;
  if (name === 'add') v = a + b;
  else if (name === 'sub') v = a - b;
  else if (name === 'mul') v = a * b;
  else v = Math.max(a, b);
  lines.push(`${name} ${a} ${b}`);
  out.push(`${name}(${a}, ${b}) = ${v}`);
}
return [{
  kind: 'boundary',
  category: '1000 条指令、操作数覆盖全范围',
  input: `1000\n${lines.join('\n')}\n`,
  output: out.join('\n') + '\n',
}];
```
