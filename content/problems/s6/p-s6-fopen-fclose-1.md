---json
{
  "id": "p-s6-fopen-fclose-1",
  "title": "追加日志并回读统计：用 \"a\" 模式打开、判空、关闭再回读",
  "difficulty": "L3",
  "knowledgePoints": ["s6-fopen-fclose"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
线上服务把运行日志写在一个文本文件里，每行一条记录。现在需要一个小工具：把一批新的日志记录**追加**到这个文件末尾（保留原有内容），然后重新打开文件统计总行数，把结果写进汇总文件。

程序必须按真实场景处理"打开失败"：日志文件可能位于一个**不存在的目录**里（比如还没创建 `logs/`），这时 `fopen` 会返回 `NULL`，程序要把汇总写成 `status error`，而不是崩溃或写出错误的统计。

要求：

1. 用**追加模式**打开日志文件，原有内容一个字节都不能丢；
2. 每次 `fopen` 都要检查返回值是否为 `NULL`；
3. 追加完成后先 `fclose`，**再重新打开**文件统计行数（缓冲区的数据只有在关闭时才一定落到磁盘）；
4. 程序不向标准输出打印任何内容，所有结果都写进 `summary.txt`。

## 输入格式
标准输入共 `2 + n` 行：

- 第 1 行：日志文件路径（不含空格，长度 1..80）；
- 第 2 行：要追加的记录条数 `n`；
- 接下来 `n` 行：每行一条记录（长度 1..60，可以包含空格，不含换行）。

日志文件本身由题目以数据文件的形式提供（也可能是空的），程序要在它末尾追加内容。

## 输出格式
在当前目录写出 `summary.txt`，共 3 行：

- 追加成功时：
  - 第 1 行 `status ok`
  - 第 2 行 `appended <n>`：实际追加成功的条数
  - 第 3 行 `lines <L>`：追加完成后日志文件的总行数（按换行符计数）
- 日志文件打不开（`fopen` 返回 `NULL`）时：
  - 第 1 行 `status error`
  - 第 2 行 `appended 0`
  - 第 3 行 `lines 0`

`status ok` 时，日志文件本身也会被检查：题目给出的原内容 + 追加的记录，逐行都要对得上。

## 数据范围
- `0 ≤ n ≤ 50`；
- 每条记录长度 1..60，可含空格、可含 `%`、`(`、`"` 等字符，不含换行；
- 日志文件初始 0..50 行，每行以换行符结束；
- 日志文件路径长度 1..80，不含空格；
- 输出文件 `summary.txt` 只有 3 行，远小于 64KB。

## 示例
### 示例 1
```in
server.log
2
INFO started
WARN disk 87% full
```
```out
```
```file name=server.log
boot ok
listen 8080
```
```expect-file name=summary.txt
status ok
appended 2
lines 4
```
```expect-file name=server.log
boot ok
listen 8080
INFO started
WARN disk 87% full
```
> 日志原来有 2 行，追加 2 行后是 4 行。注意第二行原有的 `listen 8080` 必须还在——如果误用 `"w"` 打开，它会在 `fopen` 成功的瞬间被清空。程序不向屏幕打印任何内容（`out` 为空），结果全在 `summary.txt` 里。

### 示例 2（边界：空日志、追加 0 条）
```in
empty.log
0
```
```out
```
```file name=empty.log
```
```expect-file name=summary.txt
status ok
appended 0
lines 0
```
```expect-file name=empty.log
```
> 日志文件是 0 字节。用追加模式打开一个已存在的空文件不会报错，也不会写入任何内容，所以追加后仍然是 0 字节、0 行。这是"最小规模"：`n = 0` 时循环一次都不执行，程序仍然要正常生成 `summary.txt`。

## 提示
### 第 1 层
先想清楚"追加"该用哪个模式：`"w"`、`"a"` 还是 `"r+"`？哪一个能在保留原有内容的前提下写到末尾？

### 第 2 层
打开失败只有一种表现：`fopen` 返回 `NULL`。把它和"文件为空"区分开——前者要写 `status error`，后者是正常的 0 行。追加完不要立刻读，先 `fclose` 再重新 `fopen("r")` 统计。

### 第 3 层
写日志用 `fprintf(log, "%s\n", 记录)`（记录本身可能含 `%`，不能直接当格式串）；统计行数用 `while (fgets(buf, sizeof buf, fp) != NULL) lines++;`；记录从标准输入读，用 `fgets` 整行读入再去掉行尾换行，才不会被记录里的空格截断。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAX_REC 50
#define MAX_LINE 64

/* 去掉行尾的 '\n' 或 "\r\n"（输入用 fgets 读，换行会留在缓冲区里） */
static void strip_eol(char *s) {
    size_t len = strlen(s);
    while (len > 0 && (s[len - 1] == '\n' || s[len - 1] == '\r')) {
        s[--len] = '\0';
    }
}

int main(void) {
    char line[256] = {0};
    char path[96] = {0};

    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    if (sscanf(line, "%95s", path) != 1) {
        return 0;
    }
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    int n = 0;
    if (sscanf(line, "%d", &n) != 1) {
        return 0;
    }
    if (n < 0) {
        n = 0;
    }
    if (n > MAX_REC) {
        n = MAX_REC;
    }

    char records[MAX_REC][MAX_LINE];
    for (int i = 0; i < n; i++) {
        records[i][0] = '\0';
        if (fgets(line, sizeof line, stdin) != NULL) {
            strip_eol(line);
            strncpy(records[i], line, MAX_LINE - 1);
            records[i][MAX_LINE - 1] = '\0';
        }
    }

    FILE *log = fopen(path, "a");            /* 追加：保留原有内容 */
    if (log == NULL) {                       /* 目录不存在 / 无权限：必须判空 */
        FILE *sum = fopen("summary.txt", "w");
        if (sum == NULL) {
            return 0;
        }
        fprintf(sum, "status error\nappended 0\nlines 0\n");
        if (fclose(sum) != 0) {
            return 0;
        }
        return 0;
    }

    int appended = 0;
    for (int i = 0; i < n; i++) {
        if (fprintf(log, "%s\n", records[i]) < 0) {   /* 记录里可能有 '%'，不能当格式串 */
            break;
        }
        appended++;
    }
    if (fclose(log) != 0) {                  /* 关闭时才刷缓冲区，失败就别统计了 */
        return 0;
    }

    int lines = 0;
    FILE *rd = fopen(path, "r");             /* 关闭之后重新打开，读到的才是最终内容 */
    if (rd == NULL) {
        return 0;
    }
    char buf[256];
    while (fgets(buf, sizeof buf, rd) != NULL) {
        lines++;
    }
    fclose(rd);

    FILE *sum = fopen("summary.txt", "w");
    if (sum == NULL) {
        return 0;
    }
    fprintf(sum, "status ok\nappended %d\nlines %d\n", appended, lines);
    if (fclose(sum) != 0) {
        return 0;
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAX_REC 50
#define MAX_LINE 64

static void strip_eol(char *s) {
    size_t len = strlen(s);
    while (len > 0 && (s[len - 1] == '\n' || s[len - 1] == '\r')) {
        s[--len] = '\0';
    }
}

int main(void) {
    char line[256] = {0};
    char path[96] = {0};

    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    if (sscanf(line, "%95s", path) != 1) {
        return 0;
    }
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    int n = 0;
    if (sscanf(line, "%d", &n) != 1) {
        return 0;
    }
    if (n < 0) {
        n = 0;
    }
    if (n > MAX_REC) {
        n = MAX_REC;
    }

    char records[MAX_REC][MAX_LINE];
    for (int i = 0; i < n; i++) {
        records[i][0] = '\0';
        if (fgets(line, sizeof line, stdin) != NULL) {
            strip_eol(line);
            strncpy(records[i], line, MAX_LINE - 1);
            records[i][MAX_LINE - 1] = '\0';
        }
    }

    FILE *log = fopen(path, "w");            /* TODO: 想想要用哪个模式才能保留旧日志 */
    if (log == NULL) {
        FILE *sum = fopen("summary.txt", "w");
        if (sum == NULL) {
            return 0;
        }
        fprintf(sum, "status error\nappended 0\nlines 0\n");
        if (fclose(sum) != 0) {
            return 0;
        }
        return 0;
    }

    int appended = 0;
    for (int i = 0; i < n; i++) {
        if (fprintf(log, "%s\n", records[i]) < 0) {
            break;
        }
        appended++;
    }
    if (fclose(log) != 0) {
        return 0;
    }

    int lines = appended;                    /* TODO: 这里应该重新打开文件统计总行数 */
    FILE *sum = fopen("summary.txt", "w");
    if (sum == NULL) {
        return 0;
    }
    fprintf(sum, "status ok\nappended %d\nlines %d\n", appended, lines);
    if (fclose(sum) != 0) {
        return 0;
    }
    return 0;
}
```

## 复杂度
时间 O(n + L)：追加 `n` 条记录，再顺序扫一遍日志的 `L` 行，`n ≤ 50`、`L ≤ 100`。
空间 O(n × 记录长度)：记录先读进内存再逐条写出，最多 50 × 64 字节。

## 常见错误
### 用 "w" 打开日志文件，旧日志被清空 [WA]
`"w"` 在 `fopen` 成功的瞬间就把文件截断成 0 字节。日志工具每启动一次就丢一次历史记录，而且程序自己"看起来"完全正常：追加成功、统计也能跑。隐藏用例里凡是原日志非空的，都会在 `server.log` 的比对上报 WA。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAX_REC 50
#define MAX_LINE 64

static void strip_eol(char *s) {
    size_t len = strlen(s);
    while (len > 0 && (s[len - 1] == '\n' || s[len - 1] == '\r')) {
        s[--len] = '\0';
    }
}

int main(void) {
    char line[256] = {0};
    char path[96] = {0};
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    if (sscanf(line, "%95s", path) != 1) {
        return 0;
    }
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    int n = 0;
    if (sscanf(line, "%d", &n) != 1) {
        return 0;
    }
    if (n < 0) {
        n = 0;
    }
    if (n > MAX_REC) {
        n = MAX_REC;
    }

    char records[MAX_REC][MAX_LINE];
    for (int i = 0; i < n; i++) {
        records[i][0] = '\0';
        if (fgets(line, sizeof line, stdin) != NULL) {
            strip_eol(line);
            strncpy(records[i], line, MAX_LINE - 1);
            records[i][MAX_LINE - 1] = '\0';
        }
    }

    FILE *log = fopen(path, "w");             /* 错：截断模式，旧内容全丢 */
    if (log == NULL) {
        return 0;
    }
    int appended = 0;
    for (int i = 0; i < n; i++) {
        if (fprintf(log, "%s\n", records[i]) < 0) {
            break;
        }
        appended++;
    }
    fclose(log);

    int lines = 0;
    FILE *rd = fopen(path, "r");
    if (rd == NULL) {
        return 0;
    }
    char buf[256];
    while (fgets(buf, sizeof buf, rd) != NULL) {
        lines++;
    }
    fclose(rd);

    FILE *sum = fopen("summary.txt", "w");
    if (sum == NULL) {
        return 0;
    }
    fprintf(sum, "status ok\nappended %d\nlines %d\n", appended, lines);
    fclose(sum);
    return 0;
}
```

### 在 fclose 之前就回读统计 [WA]
写完不关闭就另开一个流去读，读到的是**磁盘上的旧内容**：数据还在第一个流的用户态缓冲区里。表现是 `lines` 比真实值小，追加的条数越多差得越多。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAX_REC 50
#define MAX_LINE 64

static void strip_eol(char *s) {
    size_t len = strlen(s);
    while (len > 0 && (s[len - 1] == '\n' || s[len - 1] == '\r')) {
        s[--len] = '\0';
    }
}

int main(void) {
    char line[256] = {0};
    char path[96] = {0};
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    if (sscanf(line, "%95s", path) != 1) {
        return 0;
    }
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    int n = 0;
    if (sscanf(line, "%d", &n) != 1) {
        return 0;
    }
    if (n < 0) {
        n = 0;
    }
    if (n > MAX_REC) {
        n = MAX_REC;
    }

    char records[MAX_REC][MAX_LINE];
    for (int i = 0; i < n; i++) {
        records[i][0] = '\0';
        if (fgets(line, sizeof line, stdin) != NULL) {
            strip_eol(line);
            strncpy(records[i], line, MAX_LINE - 1);
            records[i][MAX_LINE - 1] = '\0';
        }
    }

    FILE *log = fopen(path, "a");
    if (log == NULL) {
        return 0;
    }
    int appended = 0;
    for (int i = 0; i < n; i++) {
        if (fprintf(log, "%s\n", records[i]) < 0) {
            break;
        }
        appended++;
    }

    int lines = 0;
    FILE *rd = fopen(path, "r");              /* 错：还没 fclose，数据仍在缓冲区里 */
    if (rd == NULL) {
        fclose(log);
        return 0;
    }
    char buf[256];
    while (fgets(buf, sizeof buf, rd) != NULL) {
        lines++;
    }
    fclose(rd);
    fclose(log);

    FILE *sum = fopen("summary.txt", "w");
    if (sum == NULL) {
        return 0;
    }
    fprintf(sum, "status ok\nappended %d\nlines %d\n", appended, lines);
    fclose(sum);
    return 0;
}
```

### 不检查 fopen 的返回值 [WA|RE]
路径里的目录不存在时 `fopen` 返回 `NULL`。不判空就往外写，轻则什么也没写进去（`summary.txt` 缺失），重则依赖运行库的行为崩溃。判空并写 `status error` 才能通过"目录不存在"这个隐藏用例。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAX_REC 50
#define MAX_LINE 64

static void strip_eol(char *s) {
    size_t len = strlen(s);
    while (len > 0 && (s[len - 1] == '\n' || s[len - 1] == '\r')) {
        s[--len] = '\0';
    }
}

int main(void) {
    char line[256] = {0};
    char path[96] = {0};
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    if (sscanf(line, "%95s", path) != 1) {
        return 0;
    }
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    int n = 0;
    if (sscanf(line, "%d", &n) != 1) {
        return 0;
    }
    if (n < 0) {
        n = 0;
    }
    if (n > MAX_REC) {
        n = MAX_REC;
    }

    char records[MAX_REC][MAX_LINE];
    for (int i = 0; i < n; i++) {
        records[i][0] = '\0';
        if (fgets(line, sizeof line, stdin) != NULL) {
            strip_eol(line);
            strncpy(records[i], line, MAX_LINE - 1);
            records[i][MAX_LINE - 1] = '\0';
        }
    }

    FILE *log = fopen(path, "a");             /* 错：没有判空 */
    int appended = 0;
    for (int i = 0; i < n; i++) {
        if (fprintf(log, "%s\n", records[i]) < 0) {
            break;
        }
        appended++;
    }
    fclose(log);

    int lines = 0;
    FILE *rd = fopen(path, "r");
    char buf[256];
    while (rd != NULL && fgets(buf, sizeof buf, rd) != NULL) {
        lines++;
    }
    if (rd != NULL) {
        fclose(rd);
    }

    FILE *sum = fopen("summary.txt", "w");
    if (sum == NULL) {
        return 0;
    }
    fprintf(sum, "status ok\nappended %d\nlines %d\n", appended, lines);
    fclose(sum);
    return 0;
}
```

### 用 scanf("%s") 读记录，遇到空格就断 [WA]
记录里明确允许空格。`%s` 读到第一个空格就停，后面的内容会被当成下一条记录的起点，于是记录条数、内容全乱。

### 把记录直接当作 fprintf 的格式串 [WA]
`fprintf(log, records[i])` 把用户数据当成了格式串：记录里的 `%s`、`%d` 会去参数区里读不存在的东西，属于未定义行为。永远写成 `fprintf(log, "%s\n", records[i])`。

## 测试用例
### 01 sample 示例 1
```in
server.log
2
INFO started
WARN disk 87% full
```
```file name=server.log
boot ok
listen 8080
```
```expect-file name=summary.txt
status ok
appended 2
lines 4
```
```expect-file name=server.log
boot ok
listen 8080
INFO started
WARN disk 87% full
```

### 02 sample 示例 2（边界：空日志、追加 0 条）
```in
empty.log
0
```
```file name=empty.log
```
```expect-file name=summary.txt
status ok
appended 0
lines 0
```
```expect-file name=empty.log
```

### 03 boundary 最小规模：1 行日志 + 1 条记录
```in
mini.log
1
only one
```
```file name=mini.log
seed
```
```expect-file name=summary.txt
status ok
appended 1
lines 2
```
```expect-file name=mini.log
seed
only one
```

### 04 degenerate 追加 0 条但日志非空
```in
keep.log
0
```
```file name=keep.log
alpha
beta
gamma
```
```expect-file name=summary.txt
status ok
appended 0
lines 3
```
```expect-file name=keep.log
alpha
beta
gamma
```

### 05 trap 日志路径的目录不存在
```in
nodir/server.log
1
hello
```
```expect-file name=summary.txt
status error
appended 0
lines 0
```

### 06 trap 记录里含百分号和空格
```in
pct.log
2
100%s done
[ERROR] disk %d full
```
```file name=pct.log
start
```
```expect-file name=summary.txt
status ok
appended 2
lines 3
```
```expect-file name=pct.log
start
100%s done
[ERROR] disk %d full
```

### 生成 boundary 50 行旧日志 + 追加 50 条（最大规模）
```js gen
const cases = [];
{
  const n = 50;
  const old = [];
  for (let i = 1; i <= 50; i++) old.push(`old line ${i}`);
  const recs = [];
  for (let i = 1; i <= n; i++) recs.push(`new record ${i} payload`);
  const logText = old.join('\n') + '\n';
  const newLog = logText + recs.join('\n') + '\n';
  const stdin = 'server.log\n' + n + '\n' + recs.join('\n') + '\n';
  const summary = `status ok\nappended ${n}\nlines ${old.length + n}\n`;
  cases.push({
    kind: 'boundary',
    category: '50 行旧日志追加 50 条记录',
    input: stdin,
    files: { 'server.log': logText },
    expectFiles: [
      { name: 'server.log', content: newLog },
      { name: 'summary.txt', content: summary },
    ],
  });
}
return cases;
```

### 生成 normal 20 条带空格的记录
```js gen
const cases = [];
{
  const n = 20;
  const recs = [];
  for (let i = 1; i <= n; i++) recs.push(`level ${i % 3} event ${i} with spaces`);
  const old = ['previous run finished'];
  const logText = old.join('\n') + '\n';
  const stdin = 'app.log\n' + n + '\n' + recs.join('\n') + '\n';
  cases.push({
    kind: 'normal',
    category: '20 条带空格的记录',
    input: stdin,
    files: { 'app.log': logText },
    expectFiles: [
      { name: 'app.log', content: logText + recs.join('\n') + '\n' },
      { name: 'summary.txt', content: `status ok\nappended ${n}\nlines ${old.length + n}\n` },
    ],
  });
}
return cases;
```
