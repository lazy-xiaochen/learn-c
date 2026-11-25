---json
{
  "id": "p-s6-text-vs-binary-2",
  "title": "换行风格审计：在二进制模式下区分 CRLF / LF / 混合",
  "difficulty": "L4",
  "knowledgePoints": ["s6-text-vs-binary"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
日志采集程序经常要处理来自不同系统的文本文件：Windows 写出来的是 CRLF（`0D 0A`），Linux/macOS 写出来的是 LF（`0A`），手工拼接的文件还可能混着孤立的 CR 或 LF。如果直接用文本模式 `fopen("input.dat", "r")` 去读，CRT 会悄悄把 `CR LF` 收成一个 `\n`，还会在 `0x1A` 处提前结束——你**根本看不到**原始的换行风格。

本题要求你写一个**换行风格审计器**：用二进制模式读取工作目录下的 `input.dat`，统计四种字节并判断整体风格。

统计规则（逐字节扫描，一遍完成）：

- `bytes`：文件总字节数；
- `crlf`：相邻的 `0D 0A` 对数，计数时这两个字节都算进 `bytes`；
- `lf`：**前面不是 `0D`** 的 `0A` 个数；
- `cr`：**后面不是 `0A`** 的 `0D` 个数。

判定规则（从上到下，先命中先返回）：

1. `bytes == 0` → `style empty`；
2. 三种换行字节都是 0 → `style none`（文件非空，但没有任何换行）；
3. 只有 `crlf`、没有 `lf` 和 `cr` → `style crlf`；
4. 只有 `lf`、没有 `crlf` 和 `cr` → `style lf`；
5. 其余情况 → `style mixed`（包括 CRLF 与 LF 混用、夹着孤立 CR 等）。

注意：`0x1A` 在二进制模式下只是普通字节，不能当成文件结束；`0x00` 也要正常计数。

## 输入格式
程序不需要读标准输入。判题器会在程序的工作目录放置一个文件：

```
input.dat
```

文件内容是任意字节（可能包含 `0x00`、`0x1A`、非 ASCII 字节）。用 `fopen("input.dat", "rb")` 打开它，**不要**用 `"r"`。

## 输出格式
输出恰好五行：

```
bytes <总字节数>
crlf <CRLF 对数>
lf <孤立 LF 个数>
cr <孤立 CR 个数>
style <empty|none|crlf|lf|mixed>
```

`style` 后面的单词必须是小写、与上面五个取值之一完全一致。

## 数据范围
- 文件长度 0 ≤ `bytes` ≤ 1000；
- 字节内容不限，但输出只有五行，远小于 64KB；
- 计数用 `long` 足够。

## 示例
### 示例 1
```in
```
```file name=input.dat base64
YWxwaGENCmJldGENCg==
```
```out
bytes 13
crlf 2
lf 0
cr 0
style crlf
```
> 文件是 `alpha\r\nbeta\r\n`：13 个字节，两个 CRLF 对，没有孤立的 LF 或 CR，所以判定为 `crlf`。如果误用文本模式，`fgetc` 只会交出 11 个逻辑字节（每个 CRLF 少一个 `0D`），`crlf` 恒为 0，风格会被误判成 `lf`。

### 示例 2（边界：空文件）
```in
```
```file name=input.dat base64
```
```out
bytes 0
crlf 0
lf 0
cr 0
style empty
```
> 空文件没有任何字节，三种换行计数都是 0；按判定规则第一条返回 `empty`，而不是 `none`。`none` 留给"有内容但一个换行都没有"的文件。

## 提示
### 第 1 层
用 `fgetc` 一个字节一个字节地读，`int c` 接收返回值，循环条件是 `c != EOF`。每读一个字节先 `bytes++`，再按它是不是 `0D` / `0A` 分类。不要用 `char` 接收：`fgetc` 返回 `int`，用 `char` 会把 `0xFF` 和 EOF 混在一起。

### 第 2 层
关键在 `0D` 后面那个字节：读到 `0D` 时，再读一个字节看看是不是 `0A`。如果是，`crlf++`，而且这个 `0A` 已经消费掉了，下一轮循环要从**再下一个**字节开始；如果不是，`cr++`，并且要把多读出来的那个字节**退回**流里（`ungetc`），否则会漏掉一个普通字节。用 `ungetc` 之后，下一轮 `fgetc` 会先拿到它。

### 第 3 层
`bytes` 要在"消费了字节"的每一处都加：普通字节加 1；`0D 0A` 这一对要加 2（读 `0D` 时加 1，确认 `0A` 时再加 1）。判定用一条 `if / else if` 链按题面顺序写，`style` 用字符串常量输出。注意 `ungetc` 只在"多读了一个非 `0A` 字节"时调用，`EOF` 不能 `ungetc`。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("input.dat", "rb");
    if (fp == NULL) {
        return 1;
    }

    long total = 0;
    long crlf = 0;
    long lf = 0;
    long cr = 0;
    int c = fgetc(fp);
    while (c != EOF) {
        total++;
        if (c == '\r') {
            int next = fgetc(fp);
            if (next == '\n') {
                crlf++;
                total++;                       /* CRLF 的两个字节都算进总字节数 */
            } else {
                cr++;
                if (next != EOF) {
                    ungetc(next, fp);          /* 退回去，下一轮继续处理 */
                }
            }
        } else if (c == '\n') {
            lf++;
        }
        c = fgetc(fp);
    }
    if (fclose(fp) != 0) {
        return 1;
    }

    const char *style;
    if (total == 0) {
        style = "empty";
    } else if (crlf == 0 && lf == 0 && cr == 0) {
        style = "none";
    } else if (crlf > 0 && lf == 0 && cr == 0) {
        style = "crlf";
    } else if (crlf == 0 && cr == 0 && lf > 0) {
        style = "lf";
    } else {
        style = "mixed";
    }

    printf("bytes %ld\n", total);
    printf("crlf %ld\n", crlf);
    printf("lf %ld\n", lf);
    printf("cr %ld\n", cr);
    printf("style %s\n", style);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("input.dat", "r");        /* TODO: 审计换行必须用二进制模式 */
    if (fp == NULL) {
        return 1;
    }

    long total = 0;
    long lf = 0;
    int c;
    while ((c = fgetc(fp)) != EOF) {
        total++;
        if (c == '\n') {
            lf++;                              /* TODO: 还要识别 CR、CRLF */
        }
    }
    fclose(fp);

    printf("bytes %ld\n", total);
    printf("crlf 0\n");
    printf("lf %ld\n", lf);
    printf("cr 0\n");
    printf("style lf\n");                      /* TODO: 按五种情况判定 */
    return 0;
}
```

## 复杂度
时间 O(n)：每个字节最多被 `fgetc` 读一次（`ungetc` 只是把刚读到的字节放回缓冲区，不重复读文件）。
空间 O(1)：只用了几个计数器。

## 常见错误
### 用文本模式 "r" 打开 [WA]
文本模式会把每个 `CR LF` 收成一个 `\n`，`crlf` 永远是 0，`bytes` 也会比真实文件小；更糟的是遇到 `0x1A` 会直接返回 EOF，后面的字节全部丢失。审计换行风格的第一步就是 `"rb"`。

```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("input.dat", "r");        /* 错：文本模式 */
    if (fp == NULL) {
        return 1;
    }
    long total = 0;
    long lf = 0;
    int c;
    while ((c = fgetc(fp)) != EOF) {
        total++;
        if (c == '\n') {
            lf++;
        }
    }
    fclose(fp);
    printf("bytes %ld\n", total);
    printf("crlf 0\n");
    printf("lf %ld\n", lf);
    printf("cr 0\n");
    printf("style lf\n");
    return 0;
}
```

### 把 CR 和 LF 各数一次，却不识别 CRLF [WA]
用二进制模式打开了，但把每个 `0D` 都算成 `cr`、每个 `0A` 都算成 `lf`，于是 `alpha\r\nbeta\r\n` 得到 `crlf=0, lf=2, cr=2`，判定成 `mixed`。识别 CRLF 必须"读到 CR 时向前看一个字节"。

```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("input.dat", "rb");
    if (fp == NULL) {
        return 1;
    }
    long total = 0;
    long lf = 0;
    long cr = 0;
    int c;
    while ((c = fgetc(fp)) != EOF) {
        total++;
        if (c == '\r') {
            cr++;                                /* 错：没有检查后面是不是 LF */
        } else if (c == '\n') {
            lf++;
        }
    }
    fclose(fp);
    printf("bytes %ld\n", total);
    printf("crlf 0\n");
    printf("lf %ld\n", lf);
    printf("cr %ld\n", cr);
    printf("style mixed\n");
    return 0;
}
```

### 把 CRLF 当成两个换行 [WA]
`if (c == '\r' || c == '\n') lf++;` 会把一对 CRLF 数成两个换行，`crlf` 仍然是 0；对纯 CRLF 文件会判成 `lf`，对混用文件会判成 `mixed`，都和预期不符。

```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("input.dat", "rb");
    if (fp == NULL) {
        return 1;
    }
    long total = 0;
    long lf = 0;
    long cr = 0;
    int c;
    while ((c = fgetc(fp)) != EOF) {
        total++;
        if (c == '\r' || c == '\n') {
            lf++;                                /* 错：CRLF 被数成两个换行 */
        }
    }
    fclose(fp);
    printf("bytes %ld\n", total);
    printf("crlf 0\n");
    printf("lf %ld\n", lf);
    printf("cr %ld\n", cr);
    printf("style lf\n");
    return 0;
}
```

### 用 char 接收 fgetc 的返回值 [WA]
`fgetc` 返回 `int`，合法范围是 `unsigned char` 的值或 `EOF`（通常是 -1）。如果写成 `char c = (char)fgetc(fp);`，文件里的 `0xFF` 可能变成 -1，和 EOF 撞车，循环提前结束；`0x1A` 之类的字节也容易被误判。始终用 `int c` 接收，比较 `c != EOF`。

## 测试用例
### 01 sample 示例 1
```in
```
```file name=input.dat base64
YWxwaGENCmJldGENCg==
```
```out
bytes 13
crlf 2
lf 0
cr 0
style crlf
```

### 02 sample 示例 2
```in
```
```file name=input.dat base64
```
```out
bytes 0
crlf 0
lf 0
cr 0
style empty
```

### 生成 boundary 最大文件、0x1A 与非 ASCII 字节、孤立 CR
```js gen
const cases = [];

function make(kind, category, bytes) {
  let crlf = 0;
  let lf = 0;
  let cr = 0;
  for (let i = 0; i < bytes.length; i++) {
    const code = bytes.charCodeAt(i);
    if (code === 0x0d) {
      if (bytes.charCodeAt(i + 1) === 0x0a) {
        crlf++;
        i++;
      } else {
        cr++;
      }
    } else if (code === 0x0a) {
      lf++;
    }
  }
  const total = bytes.length;
  let style;
  if (total === 0) {
    style = 'empty';
  } else if (crlf === 0 && lf === 0 && cr === 0) {
    style = 'none';
  } else if (crlf > 0 && lf === 0 && cr === 0) {
    style = 'crlf';
  } else if (crlf === 0 && cr === 0 && lf > 0) {
    style = 'lf';
  } else {
    style = 'mixed';
  }
  return {
    kind,
    category,
    input: '',
    files: { 'input.dat': { base64: Buffer.from(bytes, 'latin1').toString('base64') } },
    output: `bytes ${total}\ncrlf ${crlf}\nlf ${lf}\ncr ${cr}\nstyle ${style}\n`,
  };
}

cases.push(make('boundary', '1000 字节全是 CRLF，共 500 对', '\r\n'.repeat(500)));
cases.push(make('degenerate', '单个 LF 字节', '\n'));
cases.push(make('trap', '0x1A 之后还有 CRLF', 'A\x1aB\r\nC'));
cases.push(make('trap', '0x00 字节必须正常计数', 'A\x00B\n'));
cases.push(make('trap', '孤立 CR 与 CRLF 混在一起', 'A\rB\r\nC\n'));
cases.push(make('normal', '只有 LF 的三行文本', 'one\ntwo\nthree\n'));
cases.push(make('boundary', '非空文件但没有任何换行', 'ABC'));
cases.push(make('boundary', 'CRLF 结尾且没有最后的换行', 'A\r\nB'));

return cases;
```
