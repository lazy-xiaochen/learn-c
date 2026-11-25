---json
{
  "id": "p-s6-text-vs-binary-1",
  "title": "双写对照：同一份数据在文本模式与二进制模式下的字节布局",
  "difficulty": "L4",
  "knowledgePoints": ["s6-text-vs-binary"],
  "special": "memory-layout",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
同一段文字，写进文件时用**文本模式**还是**二进制模式**，磁盘上的字节布局会不一样：文本模式会把每个 `0x0A` 翻译成 `0x0D 0x0A`，二进制模式原样写出。本题要求你把标准输入的数据**同时写进两个文件**，再测量它们各自的真实字节数，最后输出一行对照报告。

具体步骤：

1. 从 `stdin` 逐行读入全部数据（输入只含可打印 ASCII 和 `\n`，不会有 `\r`）；
2. 用 `fopen("out_text.txt", "w")` 打开第一个文件，把读到的内容**原样**写进去。不要手工补 `\r`——CR 由文本模式自动加；
3. 用 `fopen("out_bin.txt", "wb")` 打开第二个文件，把同样的内容写进去；
4. 关闭两个文件，再以 `"rb"` 重新打开，用 `fseek` + `ftell` 测量它们的字节数；
5. 输出一行 `text=<T> binary=<B> extra=<T-B>`。

判题器会用 `compare=bytes` **逐字节比较** `out_text.txt` 和 `out_bin.txt`：少一个 CR、多一个 CR、少一个换行，都会判错。报告里的数字也必须和文件的真实字节数一致。

例如输入是两行 `alpha` 和 `beta` 时，两个文件的布局是：

```
out_bin.txt : 61 6C 70 68 61 0A 62 65 74 61 0A              （11 字节）
out_text.txt: 61 6C 70 68 61 0D 0A 62 65 74 61 0D 0A        （13 字节）
```

## 输入格式
从标准输入读入，直到 EOF。输入由若干行组成：

- 每行是若干个可打印 ASCII 字符（`0x20`–`0x7E`，含空格），行与行之间用 `\n` 分隔；
- 最多 20 行，每行（不含换行符）最多 200 个字符；
- 最后一行**可以没有**结尾的 `\n`；
- 输入可以为空（0 行、0 字节）。

输入里不会出现 `\r`、`\t`、`0x1A` 或其他控制字符，所以用文本模式的 `fgets` 读取时，除了行尾的 `\n` 之外不会有任何翻译。

## 输出格式
输出恰好一行：

```
text=<T> binary=<B> extra=<T-B>
```

- `T` 是 `out_text.txt` 的字节数；
- `B` 是 `out_bin.txt` 的字节数；
- `extra` 是两者之差，等于输入中 `\n` 的个数。

三个数都是非负整数，用 `%ld` 输出即可；`extra` 在输入没有换行时为 0。

## 数据范围
- 输入总字节数不超过 20 × 201 = 4020；
- 因此 `T`、`B` 都不超过 4040，`extra` 不超过 20；
- 文件大小用 `long` 就足够，不需要 64 位偏移。

## 示例
### 示例 1
```in
alpha
beta
```
```out
text=13 binary=11 extra=2
```
```expect-file name=out_text.txt compare=bytes base64
YWxwaGENCmJldGENCg==
```
```expect-file name=out_bin.txt compare=bytes base64
YWxwaGEKYmV0YQo=
```
> 输入的 11 个字节里有两个 `\n`。二进制文件原样保留这 11 个字节；文本文件把两个 `\n` 各换成 `0D 0A`，每个换行多 1 字节，所以是 13 字节，`extra = 2`。

### 示例 2（边界：空输入）
```in
```
```out
text=0 binary=0 extra=0
```
```expect-file name=out_text.txt compare=bytes base64
```
```expect-file name=out_bin.txt compare=bytes base64
```
> 空输入时 `fgets` 第一次就返回 `NULL`，两个文件都被创建但一个字节也没写；重新以 `"rb"` 打开后 `fseek(...SEEK_END)` + `ftell` 得到 0。注意：文件必须**存在**（`fopen` 已经创建了它），只是内容为空——判题器会检查文件是否存在，不存在同样是错误。

## 提示
### 第 1 层
先用 `fgets` 把 `stdin` 读进一个足够大的缓冲区，循环直到返回 `NULL`；每一段读到的内容分别 `fputs` 到两个 `FILE *`。不需要自己判断哪里是换行，也不需要自己拼 `\r\n`——把读到的字节原样交给文本流，CRT 会负责翻译。

### 第 2 层
两个文件的打开模式只差一个字母：`"w"` 和 `"wb"`。文本模式写 `\n` 时自动变成 `\r\n`，二进制模式原样写。写完后记得 `fclose`，再用 `"rb"` 重新打开测大小；测量函数是固定的三步：`fseek(fp, 0, SEEK_END)` → `n = ftell(fp)` → `fclose(fp)`。报告里的 `T` 和 `B` 要用测出来的真实值，不能拿 `strlen` 累加。

### 第 3 层
`extra` 其实等于输入里 `\n` 的个数，但不要直接数换行来输出——报告必须与两个文件的真实字节数一致，先测 `T`、`B`，再算 `T - B`。缓冲区开 256 字节就够（最长行 200 字符 + 换行 + 结尾 `\0`）；`fgets` 在最后一行没有换行时也能正常返回，不要假设每段都以 `\n` 结尾。

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
    FILE *text = fopen("out_text.txt", "w");
    if (text == NULL) {
        return 1;
    }
    FILE *binary = fopen("out_bin.txt", "wb");
    if (binary == NULL) {
        fclose(text);
        return 1;
    }

    char line[256];
    while (fgets(line, sizeof line, stdin) != NULL) {
        if (fputs(line, text) == EOF || fputs(line, binary) == EOF) {
            fclose(text);
            fclose(binary);
            return 1;
        }
    }
    if (fclose(text) != 0 || fclose(binary) != 0) {
        return 1;
    }

    long t = file_size("out_text.txt");
    long b = file_size("out_bin.txt");
    if (t < 0 || b < 0) {
        return 1;
    }
    printf("text=%ld binary=%ld extra=%ld\n", t, b, t - b);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

int main(void) {
    FILE *text = fopen("out_text.txt", "w");
    if (text == NULL) {
        return 1;
    }
    FILE *binary = fopen("out_bin.txt", "w");     /* TODO: 二进制模式要加 b */
    if (binary == NULL) {
        fclose(text);
        return 1;
    }

    long t = 0;
    long b = 0;
    char line[256];
    while (fgets(line, sizeof line, stdin) != NULL) {
        fputs(line, text);
        fputs(line, binary);
        t += (long)strlen(line);                  /* TODO: 文本模式每个 '\n' 会多写一个 CR */
        b += (long)strlen(line);
    }
    fclose(text);
    fclose(binary);

    printf("text=%ld binary=%ld extra=%ld\n", t, b, t - b);
    return 0;
}
```

## 复杂度
时间 O(n)：输入只扫描一遍，文件大小测量各 O(1)。
空间 O(1)：只有一个 256 字节的行缓冲区；不需要把整个输入读进内存。

## 常见错误
### 两个文件都用 "w" 打开 [WA]
`"w"` 是文本模式，写出的 `out_bin.txt` 也会带 CRLF。此时报告里两个大小相同（或只差在别处），二进制文件的内容从第一个换行起就和预期不同；判题器逐字节比较会立刻发现。

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
    FILE *text = fopen("out_text.txt", "w");
    if (text == NULL) {
        return 1;
    }
    FILE *binary = fopen("out_bin.txt", "w");      /* 错：二进制也用了文本模式 */
    if (binary == NULL) {
        fclose(text);
        return 1;
    }
    char line[256];
    while (fgets(line, sizeof line, stdin) != NULL) {
        fputs(line, text);
        fputs(line, binary);
    }
    fclose(text);
    fclose(binary);
    long t = file_size("out_text.txt");
    long b = file_size("out_bin.txt");
    printf("text=%ld binary=%ld extra=%ld\n", t, b, t - b);
    return 0;
}
```

### 文本文件用 "wb" 打开 [WA]
`"wb"` 是二进制模式，`out_text.txt` 里的换行只有 `0A`，没有 `0D`。报告里的 `T` 也会跟着变小（`extra = 0`），与预期的 CRLF 布局不符。文本文件和二进制文件必须分别用 `"w"` 和 `"wb"`。

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
    FILE *text = fopen("out_text.txt", "wb");      /* 错：文本文件也要文本模式 */
    if (text == NULL) {
        return 1;
    }
    FILE *binary = fopen("out_bin.txt", "wb");
    if (binary == NULL) {
        fclose(text);
        return 1;
    }
    char line[256];
    while (fgets(line, sizeof line, stdin) != NULL) {
        fputs(line, text);
        fputs(line, binary);
    }
    fclose(text);
    fclose(binary);
    long t = file_size("out_text.txt");
    long b = file_size("out_bin.txt");
    printf("text=%ld binary=%ld extra=%ld\n", t, b, t - b);
    return 0;
}
```

### 用字符数当文件大小 [WA]
文件内容可能完全正确，但报告里的数字是 `strlen` 累加出来的字符数，没有算上文本模式多出来的 CR。对 `alpha\nbeta\n`，字符数是 11、真实文本文件是 13；报告会输出 `extra=0`，与预期不符。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

int main(void) {
    FILE *text = fopen("out_text.txt", "w");
    if (text == NULL) {
        return 1;
    }
    FILE *binary = fopen("out_bin.txt", "wb");
    if (binary == NULL) {
        fclose(text);
        return 1;
    }
    long chars = 0;
    char line[256];
    while (fgets(line, sizeof line, stdin) != NULL) {
        fputs(line, text);
        fputs(line, binary);
        chars += (long)strlen(line);              /* 错：字符数 != 文本文件字节数 */
    }
    fclose(text);
    fclose(binary);
    printf("text=%ld binary=%ld extra=%ld\n", chars, chars, 0L);
    return 0;
}
```

### 读输入时只用 scanf 或只读一行 [WA]
`scanf("%s", ...)` 会在空白处停下，读不到空格；`fgets` 只调用一次也只读一行。输入最多 20 行，必须用循环读到 `fgets` 返回 `NULL`。另外，不要因为输入是"文本"就以为可以随便用 `%s`：本题的行里允许有空格，`%s` 会把一行拆成好几段。

## 测试用例
### 01 sample 示例 1
```in
alpha
beta
```
```out
text=13 binary=11 extra=2
```
```expect-file name=out_text.txt compare=bytes base64
YWxwaGENCmJldGENCg==
```
```expect-file name=out_bin.txt compare=bytes base64
YWxwaGEKYmV0YQo=
```

### 02 sample 示例 2
```in
```
```out
text=0 binary=0 extra=0
```
```expect-file name=out_text.txt compare=bytes base64
```
```expect-file name=out_bin.txt compare=bytes base64
```

### 生成 boundary 最长一行、最多行数与空行
```js gen
const cases = [];

function make(kind, category, input) {
  const text = input.replace(/\n/g, '\r\n');
  const newlines = (input.match(/\n/g) || []).length;
  const bytes = Buffer.byteLength(input, 'utf8');
  const file = (name, content) => ({
    name,
    compare: 'bytes',
    base64: Buffer.from(content, 'utf8').toString('base64'),
  });
  return {
    kind,
    category,
    input,
    output: `text=${bytes + newlines} binary=${bytes} extra=${newlines}\n`,
    expectFiles: [file('out_text.txt', text), file('out_bin.txt', input)],
  };
}

cases.push(make('boundary', '200 字符的最长一行', 'a'.repeat(200) + '\n'));
cases.push(make('degenerate', '输入只有一个换行符', '\n'));
cases.push(make('trap', '最后一行没有换行符', 'no-newline-at-end'));
cases.push(make('trap', '行首行尾都带空格', '  padded  \n'));
cases.push(make('normal', '空行与多行混合', 'one\n\ntwo\nthree\n'));

let many = '';
for (let i = 0; i < 20; i++) {
  many += 'line' + String(i).padStart(2, '0') + '\n';
}
cases.push(make('boundary', '20 行、每行 7 字节', many));

return cases;
```
