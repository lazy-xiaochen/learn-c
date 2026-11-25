---json
{
  "id": "p-s6-line-char-io-1",
  "title": "给访问日志加行号并统计最长行：fgets / fputs 的逐行往返",
  "difficulty": "L3",
  "knowledgePoints": ["s6-line-char-io"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
运维要归档一份 `access.log`。归档工具做两件事：

1. 生成 `numbered.txt`：给日志的每一行加上**行号前缀** `NNN|`（`NNN` 是三位、不足补 0，从 `001` 开始）；
2. 生成 `stats.txt`：记录总行数和最长一行有多少个字符。

处理细节（务必按这里的规则来）：

- 行号按**物理行**递增；输入里空行也算一行；
- 输出时先去掉每行末尾的换行符（以及可能存在的 `'\r'`），再统一补一个 `'\n'`。也就是说 `numbered.txt` 的每一行都以换行结尾，输入的最后一个"没有换行结尾的残行"也不会把输出搞乱；
- `longest` 统计的是**去掉换行之后**的字符数（只算字节，纯 ASCII 数据）；
- 空文件不是错误：输出 `status ok`、`lines 0`、`longest 0`，并生成一个空的 `numbered.txt`；
- 输入文件打不开时：`stats.txt` 写 `status error` / `lines 0` / `longest 0`，**不要**生成 `numbered.txt`（生成空文件也行，评测只检查 `stats.txt`）。

程序不向标准输出打印任何内容。

## 输入格式
标准输入只有一行：输入日志文件的路径（不含空格）。

日志文件由测试用例提供，约定：

- 行数 0..100；
- 每行长度（不含换行）0..200 字节；
- 行尾可能是 `\n`，也可能是 Windows 风格的 `\r\n`；最后一行可能**没有**行尾换行。

## 输出格式
在当前目录写出两个文件。

`numbered.txt`：`line(i) = 三位行号 + "|" + 去掉行尾换行后的内容 + "\n"`，例如：

```
001|GET / 200
002|POST /login 302
```

`stats.txt`：3 行

```
status ok
lines <行数>
longest <最长行字符数>
```

输入打不开时：

```
status error
lines 0
longest 0
```

## 数据范围
- 行数 0..100，每行 0..200 字节；
- `numbered.txt` 最大约 100 × 206 ≈ 20KB，`stats.txt` 只有 3 行，都远小于 64KB。

## 示例
### 示例 1
```in
access.log
```
```out
```
```file name=access.log
GET / 200
POST /login 302
GET /missing 404
```
```expect-file name=numbered.txt
001|GET / 200
002|POST /login 302
003|GET /missing 404
```
```expect-file name=stats.txt
status ok
lines 3
longest 16
```
> 三行的长度分别是 9、15、16，所以 `longest` 是 16。注意 `001|` 里的竖线是分隔符，不是内容的一部分。程序不打印任何东西，`out` 为空。

### 示例 2（边界：空文件）
```in
empty.log
```
```out
```
```file name=empty.log
```
```expect-file name=numbered.txt
```
```expect-file name=stats.txt
status ok
lines 0
longest 0
```
> 0 字节文件：`fgets` 第一次就返回 `NULL`，循环一次都不执行。`numbered.txt` 是 0 字节，`stats.txt` 仍然是正常的 3 行（`status ok`）——空文件不是错误，路径打不开才是。

## 提示
### 第 1 层
`fgets` 会把 `'\n'` 一起读进缓冲区，所以"输出的内容"必须自己把行尾的换行剥掉（可能还有 `'\r'`），否则每一行会多出一个空行。判断一个字符是不是行尾，从缓冲区末尾往前看即可。

### 第 2 层
行号用 `%03d` 格式化，宽度 3、不足补 0。缓冲区要够大：每行最多 200 字节，加上 `'\n'` 和 `'\0'`，开 256 就绰绰有余；开太小的话 `fgets` 会把一行拆成多次返回，行号就会错。

### 第 3 层
先处理"打不开"的分支（写 `status error` 并返回），再打开 `numbered.txt`。循环里依次做：去掉行尾换行 → 行号加一 → 更新 `longest` → `fprintf(numbered, "%03d|%s\n", ...)`。循环结束后再写 `stats.txt`，`longest` 用 `%zu`（`size_t`）。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define LINE_MAX 256

int main(void) {
    char path[128] = {0};
    if (scanf("%127s", path) != 1) {
        return 0;
    }

    FILE *in = fopen(path, "r");
    if (in == NULL) {                       /* 打不开：只写 stats.txt */
        FILE *st = fopen("stats.txt", "w");
        if (st == NULL) {
            return 0;
        }
        fprintf(st, "status error\nlines 0\nlongest 0\n");
        if (fclose(st) != 0) {
            return 0;
        }
        return 0;
    }

    FILE *numbered = fopen("numbered.txt", "w");
    if (numbered == NULL) {
        fclose(in);
        return 0;
    }

    char buf[LINE_MAX];
    int lines = 0;
    size_t longest = 0;
    while (fgets(buf, sizeof buf, in) != NULL) {
        size_t len = strlen(buf);
        while (len > 0 && (buf[len - 1] == '\n' || buf[len - 1] == '\r')) {
            buf[--len] = '\0';              /* 去掉行尾换行（含 \r\n 的情况） */
        }
        lines++;
        if (len > longest) {
            longest = len;
        }
        if (fprintf(numbered, "%03d|%s\n", lines, buf) < 0) {
            fclose(numbered);
            fclose(in);
            return 0;
        }
    }
    if (fclose(numbered) != 0) {
        fclose(in);
        return 0;
    }
    fclose(in);

    FILE *st = fopen("stats.txt", "w");
    if (st == NULL) {
        return 0;
    }
    fprintf(st, "status ok\nlines %d\nlongest %zu\n", lines, longest);
    if (fclose(st) != 0) {
        return 0;
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define LINE_MAX 256

int main(void) {
    char path[128] = {0};
    if (scanf("%127s", path) != 1) {
        return 0;
    }

    FILE *in = fopen(path, "r");
    if (in == NULL) {
        return 0;                            /* TODO: 打不开时也要写 status error 的 stats.txt */
    }

    FILE *numbered = fopen("numbered.txt", "w");
    if (numbered == NULL) {
        fclose(in);
        return 0;
    }

    char buf[LINE_MAX];
    int lines = 0;
    size_t longest = 0;
    while (fgets(buf, sizeof buf, in) != NULL) {
        lines++;
        /* TODO: 去掉行尾的 '\n' / '\r'，再更新 longest */
        if (fprintf(numbered, "%03d|%s\n", lines, buf) < 0) {   /* TODO: 内容里的换行会让输出多出空行 */
            fclose(numbered);
            fclose(in);
            return 0;
        }
    }
    fclose(numbered);
    fclose(in);

    /* TODO: 写 stats.txt：status ok / lines / longest */
    return 0;
}
```

## 复杂度
时间 O(文件字节数)：每行被 `fgets` 读一次、被输出一次，总字节数不超过 100 × 202。
空间 O(1)：一个 256 字节的行缓冲区。

## 常见错误
### 输出时忘了去掉行尾换行 [WA]
`fgets` 保留换行，`fprintf("%03d|%s\n", ...)` 又补了一个换行，于是每个输入行在输出里占两行：`001|GET / 200` 后面还跟着一个空行。行号还会因为空行的存在而"跳号"看起来对不上。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define LINE_MAX 256

int main(void) {
    char path[128] = {0};
    if (scanf("%127s", path) != 1) {
        return 0;
    }
    FILE *in = fopen(path, "r");
    if (in == NULL) {
        return 0;
    }
    FILE *numbered = fopen("numbered.txt", "w");
    if (numbered == NULL) {
        fclose(in);
        return 0;
    }
    char buf[LINE_MAX];
    int lines = 0;
    size_t longest = 0;
    while (fgets(buf, sizeof buf, in) != NULL) {
        size_t len = strlen(buf);
        lines++;
        if (len > longest) {
            longest = len;                  /* 错：把行尾的 '\n' 也算进了长度 */
        }
        if (fprintf(numbered, "%03d|%s\n", lines, buf) < 0) {   /* 错：buf 自带换行 */
            fclose(numbered);
            fclose(in);
            return 0;
        }
    }
    fclose(numbered);
    fclose(in);
    FILE *st = fopen("stats.txt", "w");
    if (st == NULL) {
        return 0;
    }
    fprintf(st, "status ok\nlines %d\nlongest %zu\n", lines, longest);
    fclose(st);
    return 0;
}
```

### 缓冲区开得太小，一行被拆成好几行 [WA]
`fgets` 的第二个参数是缓冲区大小，它最多读 `n - 1` 个字符。缓冲区比最长行还小的时候，一个 200 字符的行会分 4 次返回（缓冲区 64），行号直接多加 3 个，`longest` 也变成 63。数据范围已经写了"每行最多 200 字节"，缓冲区按 `200 + 2` 开就没有这个问题。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    char path[128] = {0};
    if (scanf("%127s", path) != 1) {
        return 0;
    }
    FILE *in = fopen(path, "r");
    if (in == NULL) {
        return 0;
    }
    FILE *numbered = fopen("numbered.txt", "w");
    if (numbered == NULL) {
        fclose(in);
        return 0;
    }
    char buf[64];                           /* 错：比最长的行（200 字节）小得多 */
    int lines = 0;
    size_t longest = 0;
    while (fgets(buf, sizeof buf, in) != NULL) {
        size_t len = strlen(buf);
        while (len > 0 && (buf[len - 1] == '\n' || buf[len - 1] == '\r')) {
            buf[--len] = '\0';
        }
        lines++;
        if (len > longest) {
            longest = len;
        }
        if (fprintf(numbered, "%03d|%s\n", lines, buf) < 0) {
            fclose(numbered);
            fclose(in);
            return 0;
        }
    }
    fclose(numbered);
    fclose(in);
    FILE *st = fopen("stats.txt", "w");
    if (st == NULL) {
        return 0;
    }
    fprintf(st, "status ok\nlines %d\nlongest %zu\n", lines, longest);
    fclose(st);
    return 0;
}
```

### 用 fputs 拼行号却不补换行 [WA]
`fputs` 一个字节都不多加。如果先把内容里的换行去掉、再用 `fputs("001|...")` 输出，所有行会粘成一条超长的行：`numbered.txt` 看起来只有一行，但内容是全部行号拼在一起。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define LINE_MAX 256

int main(void) {
    char path[128] = {0};
    if (scanf("%127s", path) != 1) {
        return 0;
    }
    FILE *in = fopen(path, "r");
    if (in == NULL) {
        return 0;
    }
    FILE *numbered = fopen("numbered.txt", "w");
    if (numbered == NULL) {
        fclose(in);
        return 0;
    }
    char buf[LINE_MAX];
    int lines = 0;
    size_t longest = 0;
    while (fgets(buf, sizeof buf, in) != NULL) {
        size_t len = strlen(buf);
        while (len > 0 && (buf[len - 1] == '\n' || buf[len - 1] == '\r')) {
            buf[--len] = '\0';
        }
        lines++;
        if (len > longest) {
            longest = len;
        }
        char out[LINE_MAX + 8];
        int used = snprintf(out, sizeof out, "%03d|%s", lines, buf);
        if (used < 0) {
            fclose(numbered);
            fclose(in);
            return 0;
        }
        if (fputs(out, numbered) == EOF) {  /* 错：fputs 不会自动补换行 */
            fclose(numbered);
            fclose(in);
            return 0;
        }
    }
    fclose(numbered);
    fclose(in);
    FILE *st = fopen("stats.txt", "w");
    if (st == NULL) {
        return 0;
    }
    fprintf(st, "status ok\nlines %d\nlongest %zu\n", lines, longest);
    fclose(st);
    return 0;
}
```

### 打不开输入文件时不写 stats.txt [WA]
路径写错、目录不存在时 `fopen` 返回 `NULL`。如果直接 `return 0`，`stats.txt` 根本不存在，判题会报"程序没有生成文件"；即使生成了，内容也不符合约定的 `status error`。判空之后要写一条完整的错误统计。

### 把 longest 算成了"含换行符的长度" [WA]
`strlen(buf)` 在 `fgets` 之后包含行尾的 `'\n'`（`\r\n` 时甚至多 2）。直接拿它更新 `longest`，每行都会多 1（或多 2），空行的长度也会变成 1 而不是 0。必须先剥掉行尾再统计。

## 测试用例
### 01 sample 示例 1
```in
access.log
```
```out
```
```file name=access.log
GET / 200
POST /login 302
GET /missing 404
```
```expect-file name=numbered.txt
001|GET / 200
002|POST /login 302
003|GET /missing 404
```
```expect-file name=stats.txt
status ok
lines 3
longest 16
```

### 02 sample 示例 2（边界：空文件）
```in
empty.log
```
```out
```
```file name=empty.log
```
```expect-file name=numbered.txt
```
```expect-file name=stats.txt
status ok
lines 0
longest 0
```

### 03 degenerate 文件里只有一个空行
```in
blank.log
```
```out
```
```file name=blank.log base64
Cg==
```
```expect-file name=numbered.txt
001|
```
```expect-file name=stats.txt
status ok
lines 1
longest 0
```
> 文件内容就是一个 `\n`：它是一行（不是零行），去掉换行后内容是空字符串，所以 `longest` 是 0。`numbered.txt` 的内容是 `001|` 加一个换行。

### 04 trap 最后一行没有换行符
```in
noeol.log
```
```out
```
```file name=noeol.log base64
b25lCnR3bw==
```
```expect-file name=numbered.txt
001|one
002|two
```
```expect-file name=stats.txt
status ok
lines 2
longest 3
```
> 文件是 `one\ntwo`（第二行末尾没有 `\n`）。`fgets` 第二次返回 `"two"`（不含换行），程序必须照样把它当成完整的一行并补上输出换行——否则 `numbered.txt` 的最后一行会缺少换行符。

### 05 trap Windows 风格的 CRLF 行尾
```in
crlf.log
```
```out
```
```file name=crlf.log base64
YQ0KYmINCg==
```
```expect-file name=numbered.txt
001|a
002|bb
```
```expect-file name=stats.txt
status ok
lines 2
longest 2
```
> 文件是 `a\r\nbb\r\n`。文本模式读取时运行库会把 `\r\n` 还原成 `\n`；如果程序用二进制模式读取，就必须自己把 `'\r'` 也剥掉。两种做法都要保证 `longest` 是 1 和 2（不含 `'\r'`）。

### 生成 normal 100 行长日志
```js gen
const cases = [];
{
  const n = 100;
  const lines = [];
  let longest = 0;
  for (let i = 1; i <= n; i++) {
    const content = `req${i} ` + 'z'.repeat((i * 13) % 90);
    lines.push(content);
    if (content.length > longest) longest = content.length;
  }
  const numbered = lines.map((s, i) => `${String(i + 1).padStart(3, '0')}|${s}`).join('\n') + '\n';
  cases.push({
    kind: 'normal',
    category: '100 行长短不一的日志',
    input: 'big.log\n',
    files: { 'big.log': lines.join('\n') + '\n' },
    expectFiles: [
      { name: 'numbered.txt', content: numbered },
      { name: 'stats.txt', content: `status ok\nlines ${n}\nlongest ${longest}\n` },
    ],
  });
}
return cases;
```

### 生成 boundary 单行 200 字节（每行长度上限）
```js gen
const cases = [];
{
  const content = 'a'.repeat(200);
  cases.push({
    kind: 'boundary',
    category: '单行 200 字节（长度上限）',
    input: 'long.log\n',
    files: { 'long.log': content + '\n' },
    expectFiles: [
      { name: 'numbered.txt', content: `001|${content}\n` },
      { name: 'stats.txt', content: 'status ok\nlines 1\nlongest 200\n' },
    ],
  });
}
return cases;
```
