---json
{
  "id": "p-s6-file-position-1",
  "title": "FILE* 位置追踪器：fseek / ftell / rewind 的执行轨迹",
  "difficulty": "L4",
  "knowledgePoints": ["s6-file-position"],
  "special": "pointer-reasoning",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
`FILE *` 里没有文件内容，只有一个**文件位置指示器**：下一次读写从文件的第几个字节开始。`ftell` 读出它，`fseek` 改写它，`rewind` 把它归零。指针题要靠"脑内执行"推位置，文件定位题同样如此——你必须能在不运行程序的情况下，说出每一步之后位置在哪里、下一次读会读到哪个字节。

本题要求你实现一个**位置追踪器**：

1. 从标准输入读入第一行 `data`（1–40 个可打印、非空白 ASCII 字符）；
2. 用二进制模式把 `data` **原样**写进 `probe.bin`，然后重新以 `"rb"` 打开；
3. 依次执行 `q` 条操作，每执行一条就输出一行轨迹；
4. 所有操作结束后输出最终的 `final pos=<位置>`。

四条操作的语义（全部以 `probe.bin` 的二进制流为准）：

- `tell` → 输出 `tell pos=<ftell 的返回值>`；
- `seek <offset> <whence>` → 以 `whence`（`0` = `SEEK_SET`、`1` = `SEEK_CUR`、`2` = `SEEK_END`）为基准移动 `offset` 个字节：
  - 目标位置 = 基准 + `offset`；
  - 目标位置为负 → `fseek` 失败，位置保持不动，输出 `seek fail pos=<移动后的位置>`；
  - 否则 `fseek` 成功，输出 `seek ok pos=<移动后的位置>`；
  - 注意：目标位置**超过文件末尾是允许的**，`fseek` 会成功；
- `read <n>` → 从当前位置连续读最多 `n` 个字节，输出 `read <实际读到的个数>`，后面跟每个字节的两位大写十六进制（用空格分隔）；如果实际读到的个数小于 `n`，在行尾追加 ` eof`。读到文件末尾时 `fgetc` 返回 `EOF`，位置**不再前进**；
- `rewind` → 回到文件开头并清除 EOF 标志，输出 `rewind pos=<当前位置>`。

关键点：`seek` 那一行的 `pos=` 是**移动之后**的 `ftell`；`fseek` 失败时位置不变，所以仍然能打印出一个合法的位置。

## 输入格式
第一行：字符串 `data`（不含空格，长度 1–40）。
第二行：整数 `q`（1–40）。
接下来 `q` 行，每行一条操作：

- `tell`
- `seek <offset> <whence>`（`-100 ≤ offset ≤ 100`，`whence ∈ {0,1,2}`）
- `read <n>`（`1 ≤ n ≤ 16`）
- `rewind`

## 输出格式
按执行顺序输出，每条操作一行：

```
tell pos=<位置>
seek ok pos=<位置>
seek fail pos=<位置>
read <个数> <十六进制字节…>[ eof]
rewind pos=<位置>
```

最后再加一行：

```
final pos=<位置>
```

`read` 的十六进制用两位大写字母，例如读到 `A`、`B` 输出 `read 2 41 42`；一个字节都没读到输出 `read 0 eof`。

## 数据范围
- `data` 长度 1–40，字符范围 `0x21`–`0x7E`（可打印、无空白）；
- `1 ≤ q ≤ 40`；
- `-100 ≤ offset ≤ 100`，`0 ≤ whence ≤ 2`；
- 文件最大 40 字节；位置本身没有硬上界——连续用 `SEEK_CUR` 加正偏移，最多可以到 40 × 100 = 4000，用 `long` 足够；
- 输出最多 41 行，远小于 64KB。

## 示例
### 示例 1
```in
ABCDEFGHIJ
10
tell
seek 3 0
read 4
seek -2 1
tell
rewind
read 2
seek 0 2
tell
read 1
```
```out
tell pos=0
seek ok pos=3
read 4 44 45 46 47
seek ok pos=5
tell pos=5
rewind pos=0
read 2 41 42
seek ok pos=10
tell pos=10
read 0 eof
final pos=10
```
> `data` 是 `A`–`J`。第 2 条 `seek 3 0` 到达下标 3（字符 `D`），读 4 个得到 `D E F G`，位置到 7；`seek -2 1` 从 7 往回退 2 到 5；`rewind` 归零后读 `A B` 到 2；最后 `seek 0 2` 到末尾 10，`tell` 是 10，再读一个字节时已经在 EOF，读不到东西、位置仍是 10。

### 示例 2（边界：越界定位、失败定位与 EOF）
```in
abc
9
read 5
tell
seek 10 0
tell
read 2
seek -10 0
tell
seek -1 2
read 1
```
```out
read 3 61 62 63 eof
tell pos=3
seek ok pos=10
tell pos=10
read 0 eof
seek fail pos=10
tell pos=10
seek ok pos=2
read 1 63
final pos=3
```
> 文件只有 3 字节。`read 5` 只读到 3 个，追加 `eof`，位置停在 3；`seek 10 0` 移到末尾之外是**允许**的，所以是 `ok`，`ftell` 也返回 10；在 10 处读不到字节，位置不变；`seek -10 0` 的目标是 -10，失败，位置仍是 10；`seek -1 2` 从末尾回退 1 到 2，读到 `c`，位置到 3。

## 提示
### 第 1 层
先用 `fgets` 读 `data`，用 `fopen("probe.bin", "wb")` 写进去，再关闭、以 `"rb"` 重新打开。之后的每条操作本质上只是在问三个问题之一：位置是多少（`ftell`）、把位置改成多少（`fseek`）、从这个位置读几个字节（`fgetc` 循环）。

### 第 2 层
`fseek` 的偏移是相对基准的：`SEEK_SET` 的基准是 0，`SEEK_CUR` 的基准是当前位置，`SEEK_END` 的基准是文件长度。不要自己把 `SEEK_CUR` 换算成绝对位置再调 `SEEK_SET`——直接传 `SEEK_CUR` 更不容易错。`fseek` 成功返回 0，失败返回非 0；失败时位置不变，但 `ftell` 仍然可以调用。目标位置为负是唯一会失败的情况（本题范围内）。

### 第 3 层
`read` 用一个 `unsigned char` 数组接字节，循环 `n` 次 `fgetc`；一旦返回 `EOF` 就立刻 `break`，不要再把 `EOF` 存进数组。输出时先打印实际读到的个数，再逐个 `%02X`；如果个数小于 `n`，补一个 ` eof`。`rewind` 之后位置一定是 0，但最好用 `ftell` 打印实际值，方便自检。所有操作结束后别忘了 `final pos=<ftell>`。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

int main(void) {
    char data[64];
    if (fgets(data, sizeof data, stdin) == NULL) {
        return 0;
    }
    data[strcspn(data, "\r\n")] = '\0';
    size_t len = strlen(data);
    if (len < 1 || len > 40) {
        return 0;
    }

    int q = 0;
    if (scanf("%d", &q) != 1 || q < 1 || q > 40) {
        return 0;
    }

    FILE *fp = fopen("probe.bin", "wb");
    if (fp == NULL) {
        return 1;
    }
    if (fputs(data, fp) == EOF) {
        fclose(fp);
        return 1;
    }
    if (fclose(fp) != 0) {
        return 1;
    }

    fp = fopen("probe.bin", "rb");
    if (fp == NULL) {
        return 1;
    }

    for (int i = 0; i < q; i++) {
        char op[16];
        if (scanf("%15s", op) != 1) {
            fclose(fp);
            return 0;
        }
        if (strcmp(op, "tell") == 0) {
            printf("tell pos=%ld\n", ftell(fp));
        } else if (strcmp(op, "rewind") == 0) {
            rewind(fp);
            printf("rewind pos=%ld\n", ftell(fp));
        } else if (strcmp(op, "seek") == 0) {
            int offset = 0;
            int whence = 0;
            if (scanf("%d %d", &offset, &whence) != 2 || whence < 0 || whence > 2) {
                fclose(fp);
                return 0;
            }
            int base = (whence == 0) ? SEEK_SET : (whence == 1) ? SEEK_CUR : SEEK_END;
            int rc = fseek(fp, (long)offset, base);
            printf("seek %s pos=%ld\n", rc == 0 ? "ok" : "fail", ftell(fp));
        } else if (strcmp(op, "read") == 0) {
            int n = 0;
            if (scanf("%d", &n) != 1 || n < 1 || n > 16) {
                fclose(fp);
                return 0;
            }
            unsigned char bytes[16];
            int got = 0;
            for (int k = 0; k < n; k++) {
                int c = fgetc(fp);
                if (c == EOF) {
                    break;
                }
                bytes[got++] = (unsigned char)c;
            }
            printf("read %d", got);
            for (int k = 0; k < got; k++) {
                printf(" %02X", bytes[k]);
            }
            if (got < n) {
                printf(" eof");
            }
            printf("\n");
        } else {
            fclose(fp);
            return 0;
        }
    }

    printf("final pos=%ld\n", ftell(fp));
    fclose(fp);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

int main(void) {
    char data[64];
    if (fgets(data, sizeof data, stdin) == NULL) {
        return 0;
    }
    data[strcspn(data, "\r\n")] = '\0';

    int q = 0;
    if (scanf("%d", &q) != 1) {
        return 0;
    }

    FILE *fp = fopen("probe.bin", "wb");
    if (fp == NULL) {
        return 1;
    }
    fputs(data, fp);
    fclose(fp);
    fp = fopen("probe.bin", "rb");
    if (fp == NULL) {
        return 1;
    }

    for (int i = 0; i < q; i++) {
        char op[16];
        if (scanf("%15s", op) != 1) {
            fclose(fp);
            return 0;
        }
        if (strcmp(op, "tell") == 0) {
            printf("tell pos=%ld\n", ftell(fp));
        } else if (strcmp(op, "rewind") == 0) {
            rewind(fp);
            printf("rewind pos=%ld\n", ftell(fp));
        } else if (strcmp(op, "seek") == 0) {
            int offset = 0;
            int whence = 0;
            if (scanf("%d %d", &offset, &whence) != 2) {
                fclose(fp);
                return 0;
            }
            fseek(fp, (long)offset, SEEK_SET);        /* TODO: 按 whence 选择基准，并处理失败 */
            printf("seek ok pos=%ld\n", ftell(fp));   /* TODO: 失败时输出 fail */
        } else if (strcmp(op, "read") == 0) {
            int n = 0;
            if (scanf("%d", &n) != 1) {
                fclose(fp);
                return 0;
            }
            printf("read %d", n);                     /* TODO: 实际读到几个就输出几个，并处理 EOF */
            for (int k = 0; k < n; k++) {
                int c = fgetc(fp);
                if (c != EOF) {
                    printf(" %02X", (unsigned char)c);
                }
            }
            printf("\n");
        } else {
            fclose(fp);
            return 0;
        }
    }
    printf("final pos=%ld\n", ftell(fp));
    fclose(fp);
    return 0;
}
```

## 复杂度
时间 O(q × n)：每条 `read` 最多读 16 个字节，`seek`/`tell`/`rewind` 都是 O(1)。
空间 O(1)：一条 64 字节的字符串和一个 16 字节的读缓冲。

## 常见错误
### 不检查 fseek 的返回值 [WA]
目标位置为负时 `fseek` 失败、位置不变，但程序仍然打印 `seek ok`。判题器期望 `seek fail pos=<原位置>`，并且后续操作要基于"没有移动"的位置继续。`fseek` 返回 0 才是成功；`ftell` 在失败后仍可调用。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    char data[64];
    if (fgets(data, sizeof data, stdin) == NULL) {
        return 0;
    }
    data[strcspn(data, "\r\n")] = '\0';
    int q = 0;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    FILE *fp = fopen("probe.bin", "wb");
    if (fp == NULL) {
        return 1;
    }
    fputs(data, fp);
    fclose(fp);
    fp = fopen("probe.bin", "rb");
    if (fp == NULL) {
        return 1;
    }
    for (int i = 0; i < q; i++) {
        char op[16];
        if (scanf("%15s", op) != 1) {
            fclose(fp);
            return 0;
        }
        if (strcmp(op, "tell") == 0) {
            printf("tell pos=%ld\n", ftell(fp));
        } else if (strcmp(op, "rewind") == 0) {
            rewind(fp);
            printf("rewind pos=%ld\n", ftell(fp));
        } else if (strcmp(op, "seek") == 0) {
            int offset = 0;
            int whence = 0;
            if (scanf("%d %d", &offset, &whence) != 2) {
                fclose(fp);
                return 0;
            }
            int base = (whence == 0) ? SEEK_SET : (whence == 1) ? SEEK_CUR : SEEK_END;
            fseek(fp, (long)offset, base);           /* 错：没有看返回值 */
            printf("seek ok pos=%ld\n", ftell(fp));
        } else if (strcmp(op, "read") == 0) {
            int n = 0;
            if (scanf("%d", &n) != 1) {
                fclose(fp);
                return 0;
            }
            unsigned char bytes[16];
            int got = 0;
            for (int k = 0; k < n; k++) {
                int c = fgetc(fp);
                if (c == EOF) {
                    break;
                }
                bytes[got++] = (unsigned char)c;
            }
            printf("read %d", got);
            for (int k = 0; k < got; k++) {
                printf(" %02X", bytes[k]);
            }
            if (got < n) {
                printf(" eof");
            }
            printf("\n");
        }
    }
    printf("final pos=%ld\n", ftell(fp));
    fclose(fp);
    return 0;
}
```

### read 不处理 EOF [WA]
`fgetc` 到末尾返回 `EOF`（-1）。如果循环不管返回值，直接把 `n` 个"字节"都打印出来，就会多出 `FF`，个数和 ` eof` 后缀也都不对。正确做法是读到 `EOF` 立刻 `break`，按**实际读到的个数**输出。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    char data[64];
    if (fgets(data, sizeof data, stdin) == NULL) {
        return 0;
    }
    data[strcspn(data, "\r\n")] = '\0';
    int q = 0;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    FILE *fp = fopen("probe.bin", "wb");
    if (fp == NULL) {
        return 1;
    }
    fputs(data, fp);
    fclose(fp);
    fp = fopen("probe.bin", "rb");
    if (fp == NULL) {
        return 1;
    }
    for (int i = 0; i < q; i++) {
        char op[16];
        if (scanf("%15s", op) != 1) {
            fclose(fp);
            return 0;
        }
        if (strcmp(op, "tell") == 0) {
            printf("tell pos=%ld\n", ftell(fp));
        } else if (strcmp(op, "rewind") == 0) {
            rewind(fp);
            printf("rewind pos=%ld\n", ftell(fp));
        } else if (strcmp(op, "seek") == 0) {
            int offset = 0;
            int whence = 0;
            if (scanf("%d %d", &offset, &whence) != 2) {
                fclose(fp);
                return 0;
            }
            int base = (whence == 0) ? SEEK_SET : (whence == 1) ? SEEK_CUR : SEEK_END;
            int rc = fseek(fp, (long)offset, base);
            printf("seek %s pos=%ld\n", rc == 0 ? "ok" : "fail", ftell(fp));
        } else if (strcmp(op, "read") == 0) {
            int n = 0;
            if (scanf("%d", &n) != 1) {
                fclose(fp);
                return 0;
            }
            printf("read %d", n);                     /* 错：固定输出 n，EOF 也当成字节 */
            for (int k = 0; k < n; k++) {
                int c = fgetc(fp);
                printf(" %02X", (unsigned char)c);
            }
            printf("\n");
        }
    }
    printf("final pos=%ld\n", ftell(fp));
    fclose(fp);
    return 0;
}
```

### rewind 只打印 0，没有真的回到开头 [WA]
`rewind` 的返回值是 `void`，所以很容易写成"打印一行 `rewind pos=0`"就算完。位置其实没动，下一次 `read` 会从原来的位置继续，后面的 `tell`/`final` 也全错。必须真的调用 `rewind(fp)` 或 `fseek(fp, 0, SEEK_SET)`。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    char data[64];
    if (fgets(data, sizeof data, stdin) == NULL) {
        return 0;
    }
    data[strcspn(data, "\r\n")] = '\0';
    int q = 0;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    FILE *fp = fopen("probe.bin", "wb");
    if (fp == NULL) {
        return 1;
    }
    fputs(data, fp);
    fclose(fp);
    fp = fopen("probe.bin", "rb");
    if (fp == NULL) {
        return 1;
    }
    for (int i = 0; i < q; i++) {
        char op[16];
        if (scanf("%15s", op) != 1) {
            fclose(fp);
            return 0;
        }
        if (strcmp(op, "tell") == 0) {
            printf("tell pos=%ld\n", ftell(fp));
        } else if (strcmp(op, "rewind") == 0) {
            printf("rewind pos=0\n");                 /* 错：没有调用 rewind */
        } else if (strcmp(op, "seek") == 0) {
            int offset = 0;
            int whence = 0;
            if (scanf("%d %d", &offset, &whence) != 2) {
                fclose(fp);
                return 0;
            }
            int base = (whence == 0) ? SEEK_SET : (whence == 1) ? SEEK_CUR : SEEK_END;
            int rc = fseek(fp, (long)offset, base);
            printf("seek %s pos=%ld\n", rc == 0 ? "ok" : "fail", ftell(fp));
        } else if (strcmp(op, "read") == 0) {
            int n = 0;
            if (scanf("%d", &n) != 1) {
                fclose(fp);
                return 0;
            }
            unsigned char bytes[16];
            int got = 0;
            for (int k = 0; k < n; k++) {
                int c = fgetc(fp);
                if (c == EOF) {
                    break;
                }
                bytes[got++] = (unsigned char)c;
            }
            printf("read %d", got);
            for (int k = 0; k < got; k++) {
                printf(" %02X", bytes[k]);
            }
            if (got < n) {
                printf(" eof");
            }
            printf("\n");
        }
    }
    printf("final pos=%ld\n", ftell(fp));
    fclose(fp);
    return 0;
}
```

### 把 fseek 的 whence 当成"移动方向" [WA]
`whence` 是**基准**，不是方向：`0` 表示从文件开头算，`1` 表示从当前位置算，`2` 表示从文件末尾算。`offset` 的正负才决定往前还是往后。把 `whence` 当方向、或者把 `SEEK_CUR` 误当成 `SEEK_SET`，会让所有相对定位的结果偏掉。

## 测试用例
### 01 sample 示例 1
```in
ABCDEFGHIJ
10
tell
seek 3 0
read 4
seek -2 1
tell
rewind
read 2
seek 0 2
tell
read 1
```
```out
tell pos=0
seek ok pos=3
read 4 44 45 46 47
seek ok pos=5
tell pos=5
rewind pos=0
read 2 41 42
seek ok pos=10
tell pos=10
read 0 eof
final pos=10
```

### 02 sample 示例 2
```in
abc
9
read 5
tell
seek 10 0
tell
read 2
seek -10 0
tell
seek -1 2
read 1
```
```out
read 3 61 62 63 eof
tell pos=3
seek ok pos=10
tell pos=10
read 0 eof
seek fail pos=10
tell pos=10
seek ok pos=2
read 1 63
final pos=3
```

### 生成 boundary 40 字符数据与 40 条操作、退化与陷阱
```js gen
const cases = [];

function simulate(data, ops) {
  let pos = 0;
  const n = data.length;
  const lines = [];
  for (const op of ops) {
    const parts = op.split(' ');
    if (parts[0] === 'tell') {
      lines.push(`tell pos=${pos}`);
    } else if (parts[0] === 'rewind') {
      pos = 0;
      lines.push('rewind pos=0');
    } else if (parts[0] === 'seek') {
      const offset = Number(parts[1]);
      const whence = Number(parts[2]);
      const base = whence === 0 ? 0 : whence === 1 ? pos : n;
      const target = base + offset;
      if (target < 0) {
        lines.push(`seek fail pos=${pos}`);
      } else {
        pos = target;
        lines.push(`seek ok pos=${pos}`);
      }
    } else if (parts[0] === 'read') {
      const want = Number(parts[1]);
      const bytes = [];
      while (bytes.length < want && pos < n) {
        bytes.push(data.charCodeAt(pos));
        pos++;
      }
      let line = `read ${bytes.length}`;
      for (const b of bytes) {
        line += ' ' + b.toString(16).toUpperCase().padStart(2, '0');
      }
      if (bytes.length < want) {
        line += ' eof';
      }
      lines.push(line);
    }
  }
  lines.push(`final pos=${pos}`);
  return lines.join('\n') + '\n';
}

function make(kind, category, data, ops) {
  return {
    kind,
    category,
    input: data + '\n' + ops.length + '\n' + ops.join('\n') + '\n',
    output: simulate(data, ops),
  };
}

/* 最大规模：40 字符数据 + 40 条操作 */
const data40 = '0123456789abcdefghijklmnopqrstuvwxyzABCD';
const ops40 = [];
for (let r = 0; r < 4; r++) {
  ops40.push('tell', 'seek 5 0', 'read 3', 'seek 2 1', 'read 2',
             'seek -1 1', 'read 1', 'seek 0 2', 'tell', 'rewind');
}
cases.push(make('boundary', '40 字符数据、40 条操作', data40, ops40));

/* 退化：只有一个字节 */
cases.push(make('degenerate', '单字节文件上的读与定位', 'Z', [
  'tell', 'read 1', 'read 1', 'seek 0 0', 'read 1',
  'seek 0 2', 'tell', 'read 1', 'rewind', 'tell',
]));

/* 陷阱：越过末尾、失败定位、EOF 后重新定位 */
cases.push(make('trap', '越过末尾读、负偏移失败、EOF 后重新定位', 'abc', [
  'seek 10 0', 'tell', 'read 3', 'read 1', 'seek -1 2',
  'read 1', 'seek 0 2', 'seek 1 2', 'tell', 'read 2',
]));

/* 陷阱：连续失败定位，位置必须保持不动 */
cases.push(make('trap', '连续三次失败定位，位置保持不变', 'hello', [
  'seek -1 0', 'tell', 'seek -2 1', 'tell', 'seek -100 2',
  'tell', 'seek -5 2', 'read 2', 'rewind', 'tell',
]));

/* 普通：相对定位与来回读 */
cases.push(make('normal', '相对定位、回退与重读', 'helloWorld123', [
  'read 5', 'tell', 'seek 2 0', 'read 4', 'seek -3 1',
  'read 2', 'rewind', 'read 3', 'seek 0 2', 'tell',
]));

/* 边界：只执行一条操作 */
cases.push(make('boundary', '只执行一条 tell', 'Q', ['tell']));

return cases;
```
