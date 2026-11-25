---json
{
  "id": "p-s6-predefined-macros-1",
  "title": "用预定义宏写日志：文件名、函数名与标准版本",
  "difficulty": "L3",
  "knowledgePoints": ["s6-predefined-macros"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
给一个小模块加"带位置的日志"：每条日志都要自动带上**文件**、**函数**和级别，最后再输出一行编译环境的自检信息。格式是：

```
main.c:log_warn: WARN value=3
```

四段内容分别是：

| 段 | 来源 | 说明 |
|---|---|---|
| `main.c` | `__FILE__` | 本平台判题器按相对路径编译，所以它就是 `main.c` |
| `log_warn` | `__func__` | **打日志的那个函数的名字**（不是调用者的名字，也不是宏定义所在的位置） |
| `WARN` | 字符串参数 | 级别标签 |
| `value=3` | 参数 | 数值 |

起始代码已经用日志宏把四段拼好了，但它打印的是**行号**而不是函数名，最后一行自检信息里的版本号也是手写的。请改成题目要求的样子。

### 为什么用 `__func__` 而不是 `__LINE__`
行号看起来更精确，但它取决于**你自己的文件布局**：多加一行注释、删一个空行，所有行号都会变。把行号写进"要被判题器比对"的输出里，等于给自己埋雷。函数名则稳定得多——只要函数还叫这个名字，它在哪一行都不影响输出。

（真实项目里的日志两个都会带：`__FILE__:__LINE__ __func__`。行号是给人看的，函数名是给检索和统计用的。）

三个级别的日志分别由三个函数负责，函数名必须正好是 `log_info`、`log_warn`、`log_error`——因为输出里的第二段就是 `__func__` 的值。

## 输入格式
第一行一个整数 `n`：日志条数。
接下来 `n` 行，每行两个整数 `level value`：

- `level = 0` → `INFO`，`1` → `WARN`，`2` → `ERROR`；
- `value` 是要写进日志的数值。

最后**固定输出一行**编译环境信息：

```
stdc=<__STDC__ 的值> version=<__STDC_VERSION__ 的值>
```

## 输出格式
先按输入顺序输出 `n` 行日志，每行：

```
<文件名>:<函数名>: <标签> value=<数值>
```

最后一行：

```
stdc=<1> version=<标准版本号>
```

本平台用 `-std=c17` 编译，所以版本号是 `201710`。

## 数据范围
- `1 ≤ n ≤ 100`；
- `0 ≤ level ≤ 2`；
- `-1000000 ≤ value ≤ 1000000`；
- 输出最多 101 行，每行不超过 60 个字符。

## 示例
### 示例 1
```in
5
0 7
1 3
2 9
0 0
2 -5
```
```out
main.c:log_info: INFO value=7
main.c:log_warn: WARN value=3
main.c:log_error: ERROR value=9
main.c:log_info: INFO value=0
main.c:log_error: ERROR value=-5
stdc=1 version=201710
```
> 三个级别分别落到 `log_info`、`log_warn`、`log_error` 三个函数里，第二段就是它们的 `__func__`。最后一行是 `__STDC__`（标准 C 编译器为 1）和 `__STDC_VERSION__`（C17 为 `201710L`）。

### 示例 2（边界：只有一条日志，数值为 0）
```in
1
0 0
```
```out
main.c:log_info: INFO value=0
stdc=1 version=201710
```
> `n = 1` 是下界，`value = 0` 是合法的日志值——不要把 0 当成"没有数据"。

## 提示
### 第 1 层
先看起始代码的日志宏：它把四段拼在一起，其中第二段用的是 `__LINE__`。题目要的是**函数名**。想想哪个预定义标识符能在函数体里拿到"当前函数的名字"。

### 第 2 层
`__func__` 是编译器在每个函数体里隐式定义的一个 `static const char[]`，内容是函数名。日志宏在**哪里展开**，`__func__` 就取哪个函数的名字——所以把宏写在 `log_warn` 里，打印出来就是 `log_warn`。

同时检查最后那一行：版本号不能手写。`__STDC_VERSION__` 是整数常量（C17 是 `201710L`，C11 是 `201112L`），用 `%ld` 打印它；`__STDC__` 是 `1`，用 `%d`。

### 第 3 层
宏可以写成：

```c
#define LOG(tag, v) printf("%s:%s: %s value=%d\n", __FILE__, __func__, (tag), (v))
```

三个日志函数各自调用一次 `LOG("INFO", v)` / `LOG("WARN", v)` / `LOG("ERROR", v)`。最后一行用 `printf("stdc=%d version=%ld\n", (int)__STDC__, (long)__STDC_VERSION__);`。

注意 `__FILE__` 打印出来是 `main.c`（本平台按相对路径编译），不要自己拼上目录，也不要把引号打出来。

## 参考代码
```c file=main.c
#include <stdio.h>

/* 日志宏：文件来自 __FILE__，函数名来自 __func__。
   宏在哪个函数里展开，__func__ 就是哪个函数的名字——这正是"日志知道自己在哪"的原理。
   __LINE__ 也常用，但它随文件布局变化，不适合放进需要比对的输出。 */
#define LOG(tag, v) printf("%s:%s: %s value=%d\n", __FILE__, __func__, (tag), (v))

static void log_info(int v) {
    LOG("INFO", v);
}

static void log_warn(int v) {
    LOG("WARN", v);
}

static void log_error(int v) {
    LOG("ERROR", v);
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }

    for (int i = 0; i < n; i++) {
        int level;
        int value;
        if (scanf("%d %d", &level, &value) != 2) {
            return 0;
        }
        if (level == 0) {
            log_info(value);
        } else if (level == 1) {
            log_warn(value);
        } else {
            log_error(value);
        }
    }

    /* 版本信息来自编译器预定义的宏，不要手写猜 */
    printf("stdc=%d version=%ld\n", (int)__STDC__, (long)__STDC_VERSION__);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

/* TODO：第二段打印的是行号，题目要求的是"打日志的函数名" */
#define LOG(tag, v) printf("%s:%d: %s value=%d\n", __FILE__, __LINE__, (tag), (v))

static void log_info(int v) {
    LOG("INFO", v);
}

static void log_warn(int v) {
    LOG("WARN", v);
}

static void log_error(int v) {
    LOG("ERROR", v);
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }

    for (int i = 0; i < n; i++) {
        int level;
        int value;
        if (scanf("%d %d", &level, &value) != 2) {
            return 0;
        }
        if (level == 0) {
            log_info(value);
        } else if (level == 1) {
            log_warn(value);
        } else {
            log_error(value);
        }
    }

    /* TODO：版本号别猜，用 __STDC_VERSION__ */
    printf("stdc=%d version=199901\n", (int)__STDC__);
    return 0;
}
```

## 复杂度
时间 O(n)：每条日志一次 `printf`。
空间 O(1)：只有几个局部变量。

这题的输出里有两个"由编译器提供"的字符串：`__FILE__` 和 `__func__`。它们的值不来自你的数据，而来自**编译时的信息**：`__FILE__` 是交给编译器的那个路径（本平台是相对路径，所以只有 `main.c`），`__func__` 是宏展开时所在的函数。也正因为如此，`__FILE__` 在不同构建方式下可能变成 `src/main.c`，`__func__` 在另一个函数里就是另一个名字——它们不是常量，是"编译现场的快照"。

## 常见错误
### 用 `__LINE__` 代替 `__func__` [WA]
行号能编译、能跑，但输出里多出一个数字，而且这个数字随文件布局变化。题目要求的第二段是 `__func__`（函数名），不是行号。更根本的问题是：把行号写进需要稳定比对的输出，任何人只要多写一个空行就会失败。

```c file=main.c expect=WA
#include <stdio.h>

#define LOG(tag, v) printf("%s:%d: %s value=%d\n", __FILE__, __LINE__, (tag), (v))

static void log_info(int v) {
    LOG("INFO", v);
}

static void log_warn(int v) {
    LOG("WARN", v);
}

static void log_error(int v) {
    LOG("ERROR", v);
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        int level;
        int value;
        if (scanf("%d %d", &level, &value) != 2) {
            return 0;
        }
        if (level == 0) {
            log_info(value);
        } else if (level == 1) {
            log_warn(value);
        } else {
            log_error(value);
        }
    }
    printf("stdc=%d version=%ld\n", (int)__STDC__, (long)__STDC_VERSION__);
    return 0;
}
```

### 手写或猜标准版本号 [WA]
`version=199901` 对应的是 C99，`201112` 是 C11，本平台用的是 `-std=c17`，正确值是 `201710`。这类"猜一个常量"的写法换一个编译标准就错，正确做法是直接用 `__STDC_VERSION__`。

```c file=main.c expect=WA
#include <stdio.h>

#define LOG(tag, v) printf("%s:%s: %s value=%d\n", __FILE__, __func__, (tag), (v))

static void log_info(int v) {
    LOG("INFO", v);
}

static void log_warn(int v) {
    LOG("WARN", v);
}

static void log_error(int v) {
    LOG("ERROR", v);
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1) {
        return 0;
    }
    for (int i = 0; i < n; i++) {
        int level;
        int value;
        if (scanf("%d %d", &level, &value) != 2) {
            return 0;
        }
        if (level == 0) {
            log_info(value);
        } else if (level == 1) {
            log_warn(value);
        } else {
            log_error(value);
        }
    }
    printf("stdc=%d version=201112\n", (int)__STDC__);   /* 错：这是 C11 的版本号 */
    return 0;
}
```

### 在 `#if` 里比较 `__FILE__` 的字符串 [CE]
`__FILE__` 是字符串字面量，可是 `#if` 的世界里只有整数：预处理阶段不能比较字符串、不能调用函数、不能用 `sizeof`。想按"当前是哪个文件"分支，得在别处定义整数开关（比如 `#define IN_MAIN 1`）。

```c file=main.c expect=CE
#include <stdio.h>

int main(void) {
#if __FILE__ == "main.c"        /* 错：预处理器的表达式里没有字符串比较 */
    printf("这是 main.c\n");
#endif
    return 0;
}
```

### 以为 `__FILE__` 一定带目录 [WA]
`__FILE__` 的值就是"编译器命令行里写的那个路径"。本平台的判题器用相对路径 `main.c` 编译，所以它是 `main.c`；如果编译命令写成 `clang src/main.c`，它就是 `src/main.c`；用绝对路径编译就是完整路径。所以不要拿它拼路径、也不要假设它有目录。

## 测试用例
### 01 sample 示例 1
```in
5
0 7
1 3
2 9
0 0
2 -5
```
```out
main.c:log_info: INFO value=7
main.c:log_warn: WARN value=3
main.c:log_error: ERROR value=9
main.c:log_info: INFO value=0
main.c:log_error: ERROR value=-5
stdc=1 version=201710
```

### 02 sample 示例 2
```in
1
0 0
```
```out
main.c:log_info: INFO value=0
stdc=1 version=201710
```

### 03 boundary 数值取到上下界
```in
3
0 1000000
1 -1000000
2 1000000
```
```out
main.c:log_info: INFO value=1000000
main.c:log_warn: WARN value=-1000000
main.c:log_error: ERROR value=1000000
stdc=1 version=201710
```

### 04 degenerate 只有一条错误日志且数值为 -1
```in
1
2 -1
```
```out
main.c:log_error: ERROR value=-1
stdc=1 version=201710
```

### 05 trap 同一个数值出现在三个级别里
```in
3
1 5
2 5
0 5
```
```out
main.c:log_warn: WARN value=5
main.c:log_error: ERROR value=5
main.c:log_info: INFO value=5
stdc=1 version=201710
```
> 三行的数值都是 5，只有函数名和标签不同。如果实现里把三个函数写成了一个（或者忘了用 `__func__`），这三行就分不出来。

### 06 normal 四种组合
```in
4
0 -3
1 0
2 42
0 999
```
```out
main.c:log_info: INFO value=-3
main.c:log_warn: WARN value=0
main.c:log_error: ERROR value=42
main.c:log_info: INFO value=999
stdc=1 version=201710
```

### 07 trap 连续同一级别的日志
```in
3
2 7
2 8
2 9
```
```out
main.c:log_error: ERROR value=7
main.c:log_error: ERROR value=8
main.c:log_error: ERROR value=9
stdc=1 version=201710
```

### 生成 boundary 100 条日志
```js gen
const n = 100;
const tags = ['INFO', 'WARN', 'ERROR'];
const fns = ['log_info', 'log_warn', 'log_error'];
const lines = [];
const out = [];
for (let i = 0; i < n; i++) {
  const level = i % 3;
  const value = (i * 733 % 2001) - 1000;
  lines.push(`${level} ${value}`);
  out.push(`main.c:${fns[level]}: ${tags[level]} value=${value}`);
}
return [{
  kind: 'boundary',
  category: '100 条日志、三个级别轮转',
  input: `${n}\n${lines.join('\n')}\n`,
  output: `${out.join('\n')}\nstdc=1 version=201710\n`,
}];
```
