---json
{
  "id": "p-s6-std-streams-1",
  "title": "双通道日志接口：把一条日志同时写进 stdout 与 stderr",
  "difficulty": "L3",
  "knowledgePoints": ["s6-std-streams"],
  "special": "ds-implementation",
  "judge": { "mode": "function", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
日志模块有一个常见需求：**同一条日志要出现在两个地方**——`stdout` 里给人看完整的产品输出，`stderr` 里给运维/错误收集系统看诊断信息。两个通道的格式还不一样：`stdout` 带方括号，`stderr` 带冒号。本题要求你在 `logapi.c` 里实现这个接口的唯一函数：

```c
long log_emit(const char *level, const char *message);
```

它必须做四件事：

1. 向 **stdout** 写一行：`[<level>] <message>` 后跟一个换行符；
2. 向 **stderr** 写一行：`<level>: <message>` 后跟一个换行符；
3. 把两路实际写出的**字节数之和**作为返回值（两个换行符都算；`level`、`message` 的长度按 UTF-8 字节数算）；
4. 任一路写入失败时返回 `-1`；成功时不要返回 `-1`。

例如 `level = "INFO"`、`message = "server started"` 时：

```
stdout: [INFO] server started
stderr: INFO: server started
返回值: 22 + 21 = 43
```

接口头文件 `logapi.h` 由题目提供（在「测试驱动」里可见），测试驱动 `driver.c` 是隐藏的，你只需要提交 `logapi.c`，**不能**提交 `main`，也不能修改/提交 `logapi.h`、`driver.c`。

测试驱动会读取一组 `level` / `message`，调用一次 `log_emit`，然后把两路内容都摊开给你看：

- 先原样输出接口写到 `stdout` 的内容；
- 再输出一行 `ret <返回值>`；
- 再输出一行 `---stderr---`；
- 最后把驱动捕获到的 `stderr` 内容原样输出。

所以你可以从判题输出里同时检查两路格式和返回值。

## 输入格式
（由隐藏的测试驱动读取，供你理解测试方式）

两行：

- 第一行是 `level`：1–15 个可打印、非空白 ASCII 字符；
- 第二行是 `message`：0–60 个可打印 ASCII 字符或 UTF-8 中文字符，可以包含空格，但不含换行；可以为空行。

## 输出格式
（由隐藏的测试驱动输出）

```
<接口写到 stdout 的那一行>
ret <log_emit 的返回值>
---stderr---
<接口写到 stderr 的那一行>
```

注意：`ret` 和 `---stderr---` 是测试驱动打印的，不是你打印的；你只负责两行日志本身。

如果 `stderr` 那一路什么都没写，`---stderr---` 后面就不会有内容——判题器会把它判成输出不一致。

## 数据范围
- `1 ≤ strlen(level) ≤ 15`；
- `0 ≤ strlen(message) ≤ 60`（按字节计；中文一个字通常占 3 字节）；
- 两路各写一行，输出总量远小于 64KB；
- 返回值最大为 79 + 78 = 157，用 `long` 足够。

## 示例
### 示例 1
```in
INFO
server started
```
```out
[INFO] server started
ret 43
---stderr---
INFO: server started
```
> `stdout` 行是 `[INFO] server started\n`，共 1 + 4 + 1 + 1 + 14 + 1 = 22 字节；`stderr` 行是 `INFO: server started\n`，共 4 + 1 + 1 + 14 + 1 = 21 字节。返回值是两路之和 43，而不是只算一路的 22。

### 示例 2（边界：最短的级别与消息）
```in
E
x
```
```out
[E] x
ret 11
---stderr---
E: x
```
> `stdout` 行 `[E] x\n` 是 6 字节，`stderr` 行 `E: x\n` 是 5 字节，总和 11。级别和消息都可以很短，但**两行都必须写**，而且两行的格式不能互相照抄。

## 提示
### 第 1 层
接口已经声明在 `logapi.h` 里，你只要在 `logapi.c` 中包含它并实现 `log_emit`。两次 `fprintf` 就能完成两路输出：第一路的目标流是 `stdout`，格式串是 `"[%s] %s\n"`；第二路的目标流是 `stderr`，格式串是 `"%s: %s\n"`。

### 第 2 层
`fprintf` 返回本次写出的字符数（失败时返回负数），正好可以用来累加返回值。先写 `stdout`、再写 `stderr`，两路都成功后返回 `(long)out + err`；任一路返回负数就返回 `-1`。不要用 `strlen(level) + strlen(message) + 常数` 自己算——让 `fprintf` 告诉你实际写了多少，换行符和中文的字节数都不会漏。

### 第 3 层
写完 `stdout` 后调用一次 `fflush(stdout)`（`stderr` 默认无缓冲，但显式 `fflush(stderr)` 也无害），这样在重定向到文件时两路内容都能及时落盘，返回值也能反映刷新是否成功。函数只依赖参数和两个标准流，不需要任何全局变量或动态内存。

## 参考代码
```c file=logapi.c
#include <stdio.h>
#include "logapi.h"

long log_emit(const char *level, const char *message) {
    int out = fprintf(stdout, "[%s] %s\n", level, message);
    if (out < 0) {
        return -1;
    }
    int err = fprintf(stderr, "%s: %s\n", level, message);
    if (err < 0) {
        return -1;
    }
    if (fflush(stdout) != 0) {
        return -1;
    }
    if (fflush(stderr) != 0) {
        return -1;
    }
    return (long)out + err;
}
```

## 初始代码
```c file=logapi.c
#include <stdio.h>
#include "logapi.h"

long log_emit(const char *level, const char *message) {
    /* TODO: 第二路要写到 stderr，格式是 "级别: 消息"，不要照抄 stdout 的方括号 */
    return (long)fprintf(stdout, "[%s] %s\n", level, message);
}
```

## 测试驱动
```c file=logapi.h
#ifndef LOGAPI_H
#define LOGAPI_H

/* 把一条日志同时写到两个通道：
 *   stdout: "[级别] 消息\n"
 *   stderr: "级别: 消息\n"
 * 返回两路实际写出的字节数之和；任一路写入失败返回 -1。
 * level 和 message 由调用者保证非 NULL。 */
long log_emit(const char *level, const char *message);

#endif
```

```c file=driver.c hidden
#include <stdio.h>
#include <string.h>
#include "logapi.h"

static void strip_eol(char *s) {
    s[strcspn(s, "\r\n")] = '\0';
}

int main(void) {
    char level[32];
    char message[128];
    if (fgets(level, sizeof level, stdin) == NULL) {
        return 0;
    }
    strip_eol(level);
    if (fgets(message, sizeof message, stdin) == NULL) {
        return 0;
    }
    strip_eol(message);

    /* 把 stderr 接到文件上，这样驱动可以把它读回来摊给学习者看 */
    if (freopen("err.log", "w", stderr) == NULL) {
        return 2;
    }

    long n = log_emit(level, message);
    fflush(stdout);
    fflush(stderr);

    printf("ret %ld\n", n);
    printf("---stderr---\n");

    FILE *fp = fopen("err.log", "r");
    if (fp == NULL) {
        return 3;
    }
    char line[256];
    while (fgets(line, sizeof line, fp) != NULL) {
        fputs(line, stdout);
    }
    fclose(fp);
    return 0;
}
```

## 复杂度
时间 O(|level| + |message|)：两次格式化输出，长度线性。
空间 O(1)：不分配额外内存，只使用两个标准流的缓冲区。

## 常见错误
### 两路都写到了 stdout [WA]
只调用了两次 `fprintf(stdout, ...)`，或者第二次把目标流写成了 `stdout`。结果 `stderr` 捕获为空，而 `stdout` 多出一行 `INFO: ...`，两处都对不上。

```c file=logapi.c expect=WA
#include <stdio.h>
#include "logapi.h"

long log_emit(const char *level, const char *message) {
    int out = fprintf(stdout, "[%s] %s\n", level, message);
    int err = fprintf(stdout, "%s: %s\n", level, message);   /* 错：第二路还是 stdout */
    if (out < 0 || err < 0) {
        return -1;
    }
    return (long)out + err;
}
```

### stderr 的格式照抄了 stdout [WA]
两路都写成 `[级别] 消息`，`stderr` 捕获里就多了方括号、少了冒号。题目要求 `stdout` 用 `[%s] %s\n`、`stderr` 用 `%s: %s\n`，两个格式串不能共用。

```c file=logapi.c expect=WA
#include <stdio.h>
#include "logapi.h"

long log_emit(const char *level, const char *message) {
    int out = fprintf(stdout, "[%s] %s\n", level, message);
    int err = fprintf(stderr, "[%s] %s\n", level, message);   /* 错：stderr 也用了方括号 */
    if (out < 0 || err < 0) {
        return -1;
    }
    return (long)out + err;
}
```

### 返回值只统计了一路 [WA]
两路内容都对，但返回的是 `fprintf(stdout, ...)` 的结果，或者用 `strlen` 只算了消息本身。判题输出里的 `ret` 会偏小，和"两路字节数之和"的约定不符。

```c file=logapi.c expect=WA
#include <stdio.h>
#include "logapi.h"

long log_emit(const char *level, const char *message) {
    int out = fprintf(stdout, "[%s] %s\n", level, message);
    int err = fprintf(stderr, "%s: %s\n", level, message);
    if (out < 0 || err < 0) {
        return -1;
    }
    return (long)out;                                        /* 错：漏掉了 stderr 那一行 */
}
```

### 把 message 当成格式串直接打印 [WA]
`fprintf(stdout, message)` 看起来省事，但 `message` 里只要出现 `%`，就会被当成格式说明符：`%s` 会去读一个不存在的参数，`%d` 会打印垃圾值，轻则输出错乱，重则崩溃。消息是**数据**，必须放在 `%s` 的位置上：`fprintf(stdout, "[%s] %s\n", level, message)`。

## 测试用例
### 01 sample 示例 1
```in
INFO
server started
```
```out
[INFO] server started
ret 43
---stderr---
INFO: server started
```

### 02 sample 示例 2
```in
E
x
```
```out
[E] x
ret 11
---stderr---
E: x
```

### 生成 boundary 最长级别/消息、空消息、中文与格式串陷阱
```js gen
const cases = [];

function make(kind, category, level, message) {
  const outLine = `[${level}] ${message}\n`;
  const errLine = `${level}: ${message}\n`;
  const ret = Buffer.byteLength(outLine, 'utf8') + Buffer.byteLength(errLine, 'utf8');
  return {
    kind,
    category,
    input: level + '\n' + message + '\n',
    output: outLine + `ret ${ret}\n---stderr---\n` + errLine,
  };
}

cases.push(make('boundary', '15 字符级别 + 60 字符消息', 'VERY-LONG-LEVEL', 'm'.repeat(60)));
cases.push(make('degenerate', '空消息：两行都只有级别和分隔符', 'W', ''));
cases.push(make('trap', '消息里带百分号，不能当格式串', 'WARN', '100% %s done'));
cases.push(make('trap', '中文消息按 UTF-8 字节数计返回值', 'ERROR', '启动失败：磁盘已满'));
cases.push(make('normal', '带空格与等号的消息', 'INFO', 'user=alice action=login'));
cases.push(make('boundary', '最长消息与最短级别', 'D', 'n'.repeat(60)));

return cases;
```
