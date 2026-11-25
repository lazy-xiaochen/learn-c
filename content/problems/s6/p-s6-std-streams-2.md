---json
{
  "id": "p-s6-std-streams-2",
  "title": "日志即时落盘：每条记录写完必须 fflush",
  "difficulty": "L3",
  "knowledgePoints": ["s6-std-streams"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
把日志写进文件时，`fprintf` 只是把字节放进了 `FILE *` 的**用户态缓冲区**，并没有立刻落到磁盘。如果另一路程序（或者同一程序的另一个 `FILE *`）此时去读这个文件，它只能看到**已经刷新出去**的部分。

本题要求你写一个"日志写入 + 即时校验"的小工具，亲自验证 `fflush` 的作用：

1. 读入 `n` 条记录，每条两个整数 `id`、`value`；
2. 用 `fopen("audit.log", "w")` 打开日志文件；
3. 对第 `i` 条记录（`i` 从 1 开始）：
   - 用 `fprintf(log, "%d %d\n", id, value)` 写入；
   - 调用 `fflush(log)` 把缓冲区推给操作系统；
   - 用 `ftell(log)` 记下**写入方**认为的文件位置（文本模式下就是物理字节数）；
   - 用另一个 `fopen("audit.log", "rb")` 打开同一个文件，`fseek` 到末尾，`ftell` 测出**读取方**看到的文件大小；
   - 两者相等输出 `ok <i> <大小>`，否则输出 `miss <i> <读取方看到的大小>`；
4. 全部写完后输出 `records <n> total <写入方最终位置>`。

本平台的判题环境允许"一个流以 `"w"` 打开着，同时用另一个流以 `"rb"` 打开同一个文件读"，所以这个校验是可行的。第 3 步中读取方看到的大小，就是"缓冲区是否已经刷新"的直接证据：没有 `fflush` 时，它通常还是 0（或上一次刷新后的大小）。

注意：文本模式下每个 `\n` 在磁盘上占 **2** 个字节（`0D 0A`），所以一条 `"1 10\n"` 的记录写入后，`ftell` 是 6，不是 5。

## 输入格式
第一行一个整数 `n`（`0 ≤ n ≤ 100`）。
接下来 `n` 行，每行两个整数 `id`、`value`（`-2³¹ ≤ id, value ≤ 2³¹-1`），用空格分隔。
`n = 0` 时后面没有记录行。

## 输出格式
前 `n` 行，每行对应一条记录：

```
ok <i> <写入后文件大小>
```

或

```
miss <i> <读取方看到的大小>
```

最后一行：

```
records <n> total <写入方最终位置>
```

`n = 0` 时只输出最后一行 `records 0 total 0`。

## 数据范围
- `0 ≤ n ≤ 100`；
- `id`、`value` 都在 `int` 范围内，用 `%d` 读写；
- 每行最多 `"−2147483648 −2147483648\n"` 约 24 个字符，`audit.log` 最大约 2.5KB；
- 输出最多 101 行，远小于 64KB。

## 示例
### 示例 1
```in
3
1 10
22 200
333 3000
```
```out
ok 1 6
ok 2 14
ok 3 24
records 3 total 24
```
> 第一条 `"1 10\n"` 有 5 个字符，文本模式把 `\n` 写成 `0D 0A`，所以文件是 6 字节；第二条 `"22 200\n"` 是 7 个字符、8 字节，累计 14；第三条 `"333 3000\n"` 是 9 个字符、10 字节，累计 24。每次写完都 `fflush`，读取方才能看到与写入方一致的大小。

### 示例 2（边界：一条记录都不写）
```in
0
```
```out
records 0 total 0
```
> `n = 0` 时循环体一次也不执行，`written` 保持初始值 0；`audit.log` 被创建为空文件，最后输出 `records 0 total 0`。注意 `total` 的初值必须是 0，不能是未初始化的值。

## 提示
### 第 1 层
先把文件打开、循环写入、最后关闭的骨架写出来。`written` 用 `long`，初始化为 0：它要保存"写完当前记录后 `ftell(log)` 的值"，循环结束后再打印。测量读取方大小时，用 `fopen("audit.log", "rb")` + `fseek(fp, 0, SEEK_END)` + `ftell(fp)`，测完 `fclose`。

### 第 2 层
关键是 `fflush(log)` 的位置：必须在 `fprintf` 之后、`ftell` 和另开文件读取之前。`fflush` 失败返回 `EOF`，检查它不是 0 就退出。另一个容易漏的点是 `ftell` 的值：文本模式下它是**物理字节数**（CRLF 两个字节），不能拿 `strlen` 或"字符数"代替。

### 第 3 层
每条记录都重新 `fopen`/`fclose` 一次读取流，保证看到的是最新的文件长度。比较时用 `visible == written`，不要用 `>=` 或 `!= 0`——题目要的是"读取方看到的大小与写入方一致"。最后别忘了在打印 `records` 行之前不要再写记录；`total` 是最后一条记录的 `written`，`n = 0` 时就是 0。

## 参考代码
```c file=main.c
#include <stdio.h>

static long file_size(const char *path) {
    FILE *fp = fopen(path, "rb");
    if (fp == NULL) {
        return -1;
    }
    if (fseek(fp, 0, SEEK_END) != 0) {
        fclose(fp);
        return -1;
    }
    long n = ftell(fp);
    fclose(fp);
    return n;
}

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1 || n < 0 || n > 100) {
        return 0;
    }

    FILE *log = fopen("audit.log", "w");
    if (log == NULL) {
        return 1;
    }

    long written = 0;
    for (int i = 1; i <= n; i++) {
        int id = 0;
        int value = 0;
        if (scanf("%d %d", &id, &value) != 2) {
            fclose(log);
            return 0;
        }
        if (fprintf(log, "%d %d\n", id, value) < 0) {
            fclose(log);
            return 1;
        }
        if (fflush(log) != 0) {                 /* 关键：不刷新，读取方看不到 */
            fclose(log);
            return 1;
        }
        written = ftell(log);
        long visible = file_size("audit.log");
        if (visible == written) {
            printf("ok %d %ld\n", i, written);
        } else {
            printf("miss %d %ld\n", i, visible);
        }
    }

    printf("records %d total %ld\n", n, written);
    fclose(log);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

static long file_size(const char *path) {
    FILE *fp = fopen(path, "rb");
    if (fp == NULL) {
        return -1;
    }
    if (fseek(fp, 0, SEEK_END) != 0) {
        fclose(fp);
        return -1;
    }
    long n = ftell(fp);
    fclose(fp);
    return n;
}

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1) {
        return 0;
    }

    FILE *log = fopen("audit.log", "w");
    if (log == NULL) {
        return 1;
    }

    long written = 0;
    for (int i = 1; i <= n; i++) {
        int id = 0;
        int value = 0;
        if (scanf("%d %d", &id, &value) != 2) {
            fclose(log);
            return 0;
        }
        fprintf(log, "%d %d\n", id, value);
        /* TODO: 在这里调用 fflush(log)，否则下面的读取方看不到刚写的数据 */
        written = ftell(log);
        long visible = file_size("audit.log");
        if (visible == written) {
            printf("ok %d %ld\n", i, written);
        } else {
            printf("miss %d %ld\n", i, visible);
        }
    }

    printf("records %d total %ld\n", n, written);
    fclose(log);
    return 0;
}
```

## 复杂度
时间 O(n)：每条记录写一行、刷新一次、再以 O(1) 测一次文件大小（`fseek` 到末尾 + `ftell`）。
空间 O(1)：没有数组，只有几个计数器。

## 常见错误
### 写完不 fflush 就去测大小 [WA]
`fprintf` 之后数据还在用户态缓冲区里，另一个 `FILE *` 打开文件只能看到 0 字节（或上一次刷新后的大小）。输出会变成 `miss 1 0`、`miss 2 0`……与预期的 `ok` 不符。`fflush(log)` 必须放在 `fprintf` 之后、测量之前。

```c file=main.c expect=WA
#include <stdio.h>

static long file_size(const char *path) {
    FILE *fp = fopen(path, "rb");
    if (fp == NULL) {
        return -1;
    }
    if (fseek(fp, 0, SEEK_END) != 0) {
        fclose(fp);
        return -1;
    }
    long n = ftell(fp);
    fclose(fp);
    return n;
}

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    FILE *log = fopen("audit.log", "w");
    if (log == NULL) {
        return 1;
    }
    long written = 0;
    for (int i = 1; i <= n; i++) {
        int id = 0;
        int value = 0;
        if (scanf("%d %d", &id, &value) != 2) {
            fclose(log);
            return 0;
        }
        fprintf(log, "%d %d\n", id, value);       /* 错：没有 fflush */
        written = ftell(log);
        long visible = file_size("audit.log");
        if (visible == written) {
            printf("ok %d %ld\n", i, written);
        } else {
            printf("miss %d %ld\n", i, visible);
        }
    }
    printf("records %d total %ld\n", n, written);
    fclose(log);
    return 0;
}
```

### 把日志文件用 "wb" 打开 [WA]
二进制模式不翻译换行，`"1 10\n"` 只占 5 字节而不是 6 字节。虽然写入方和读取方会“一致”，但输出的大小整体偏小，`ok 1 5`、`ok 2 11`……与预期不符。本题要观察的是**文本模式 + 缓冲**，请用 `"w"`。

```c file=main.c expect=WA
#include <stdio.h>

static long file_size(const char *path) {
    FILE *fp = fopen(path, "rb");
    if (fp == NULL) {
        return -1;
    }
    if (fseek(fp, 0, SEEK_END) != 0) {
        fclose(fp);
        return -1;
    }
    long n = ftell(fp);
    fclose(fp);
    return n;
}

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    FILE *log = fopen("audit.log", "wb");         /* 错：二进制模式，换行不占两个字节 */
    if (log == NULL) {
        return 1;
    }
    long written = 0;
    for (int i = 1; i <= n; i++) {
        int id = 0;
        int value = 0;
        if (scanf("%d %d", &id, &value) != 2) {
            fclose(log);
            return 0;
        }
        fprintf(log, "%d %d\n", id, value);
        if (fflush(log) != 0) {
            fclose(log);
            return 1;
        }
        written = ftell(log);
        long visible = file_size("audit.log");
        if (visible == written) {
            printf("ok %d %ld\n", i, written);
        } else {
            printf("miss %d %ld\n", i, visible);
        }
    }
    printf("records %d total %ld\n", n, written);
    fclose(log);
    return 0;
}
```

### 用字符数当文件大小 [WA]
例如先用 `snprintf` 拼出 `"1 10\n"`，再用 `strlen` 得到 5，把这个 5 当成"写入后文件大小"。文本模式下实际是 6，读取方测出的也是 6，于是每一条都输出 `miss i 6`，并且最后的 `total` 也偏小。文件大小必须用 `ftell`（或 `fseek` + `ftell`）测量，不能用字符数推算。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

static long file_size(const char *path) {
    FILE *fp = fopen(path, "rb");
    if (fp == NULL) {
        return -1;
    }
    if (fseek(fp, 0, SEEK_END) != 0) {
        fclose(fp);
        return -1;
    }
    long n = ftell(fp);
    fclose(fp);
    return n;
}

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    FILE *log = fopen("audit.log", "w");
    if (log == NULL) {
        return 1;
    }
    long written = 0;
    for (int i = 1; i <= n; i++) {
        int id = 0;
        int value = 0;
        if (scanf("%d %d", &id, &value) != 2) {
            fclose(log);
            return 0;
        }
        char line[64];
        int len = snprintf(line, sizeof line, "%d %d\n", id, value);
        if (len < 0) {
            fclose(log);
            return 1;
        }
        fprintf(log, "%s", line);
        if (fflush(log) != 0) {
            fclose(log);
            return 1;
        }
        written += (long)len;                      /* 错：len 是字符数，不是文件字节数 */
        long visible = file_size("audit.log");
        if (visible == written) {
            printf("ok %d %ld\n", i, written);
        } else {
            printf("miss %d %ld\n", i, visible);
        }
    }
    printf("records %d total %ld\n", n, written);
    fclose(log);
    return 0;
}
```

### 以为 fflush 之后数据一定已经写到磁盘 [WA]
`fflush` 只是把用户态缓冲区推给操作系统；操作系统还有自己的页缓存，真正落盘要等 `fsync` / `FlushFileBuffers`。本题只要求"另一个 `FILE *` 能立刻读到"，`fflush` 足够了；不要把"刷新 stdio 缓冲区"和"持久化到磁盘"混为一谈。

## 测试用例
### 01 sample 示例 1
```in
3
1 10
22 200
333 3000
```
```out
ok 1 6
ok 2 14
ok 3 24
records 3 total 24
```

### 02 sample 示例 2
```in
0
```
```out
records 0 total 0
```

### 生成 boundary 100 条记录、极值与负值
```js gen
const cases = [];

function make(kind, category, records) {
  let total = 0;
  const lines = [];
  for (let i = 0; i < records.length; i++) {
    const line = `${records[i][0]} ${records[i][1]}\n`;
    total += Buffer.byteLength(line, 'utf8') + 1;   /* +1：文本模式把 LF 写成 CRLF */
    lines.push(`ok ${i + 1} ${total}`);
  }
  lines.push(`records ${records.length} total ${total}`);
  let input = `${records.length}\n`;
  for (const r of records) {
    input += `${r[0]} ${r[1]}\n`;
  }
  return { kind, category, input, output: lines.join('\n') + '\n' };
}

const hundred = [];
for (let i = 1; i <= 100; i++) {
  hundred.push([i * 37 - 50, i * 1000]);
}
cases.push(make('boundary', '100 条记录，数字长度逐渐变化', hundred));

cases.push(make('trap', 'INT_MIN 与 INT_MAX', [[-2147483648, 2147483647]]));
cases.push(make('trap', '负数与零，行长度各不相同', [[-1, -1], [0, 0], [-99, 100], [7, -12345]]));
cases.push(make('normal', '五条普通记录', [[1, 10], [22, 200], [333, 3000], [4444, 40000], [55555, 500000]]));
cases.push(make('degenerate', '只有一条记录', [[42, -7]]));
cases.push(make('boundary', '一条记录且数值最短', [[0, 0]]));

return cases;
```
