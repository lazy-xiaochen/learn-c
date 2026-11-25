---json
{
  "id": "p-s7-iv-bits-endian-1",
  "title": "位运算工具箱与字节序探针：2 的幂、popcount、lowbit、字节交换",
  "difficulty": "L4",
  "knowledgePoints": ["s7-iv-bits-endian"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
实现一个小型"位运算工具箱"，按下面的查询逐条处理。每条查询占一行，输出一行结果。

| 查询 | 含义 | 输出 |
|---|---|---|
| `P x` | `x` 是不是 2 的幂（`x = 0` 不是） | `1` 或 `0` |
| `C x` | `x` 的二进制表示里 1 的个数 | 十进制整数 |
| `L x` | 最低位的 1 所代表的值（`x & (~x + 1)`） | 8 位大写十六进制 |
| `S x` | 把 `x` 的 4 个字节顺序整个倒过来 | 8 位大写十六进制 |
| `E` | 本机字节序 | `little` 或 `big` |

约定：

- `x` 一律按 **32 位无符号整数**理解，范围 `0 … 4294967295`，十六进制输出固定 8 位、补前导零、字母大写（例如 `00000008`、`78563412`）；
- `S` 查询只交换字节，不涉及符号：`0x12345678 → 0x78563412`、`0x00000001 → 0x01000000`；
- `E` 查询的答案由程序**运行时真的判断一次**（不要写死），本平台是 x86-64，结果为 `little`。

## 输入格式
第一行一个整数 `q`（查询条数）。
接下来 `q` 行，每行是一条查询：`P x`、`C x`、`L x`、`S x` 或 `E`。

## 输出格式
对每条查询输出一行结果。
`P` 输出 `0`/`1`；`C` 输出十进制个数；`L`/`S` 输出 8 位大写十六进制；`E` 输出 `little` 或 `big`。

## 数据范围
1 ≤ q ≤ 1000
0 ≤ x ≤ 4294967295（即 `0x00000000 … 0xFFFFFFFF`）
输出最多 1000 行，不超过 20KB。

## 示例
### 示例 1
```in
5
P 8
C 255
L 40
S 305419896
E
```
```out
1
8
00000008
78563412
little
```
> `8 = 0b1000` 是 2 的幂 → 1；`255 = 0xFF` 有 8 个 1；`40 = 0x28 = 0b101000` 的最低位的 1 是 8，所以 `L 40` 输出 `00000008`（**不是** `00000028`，`40` 是十进制输入）；`305419896 = 0x12345678`，字节倒过来是 `0x78563412`；本机是小端。

### 示例 2（边界：0 与最高位）
```in
4
P 0
P 2147483648
L 2147483648
S 4294967295
```
```out
0
1
80000000
FFFFFFFF
```
> `2147483648 = 0x80000000` 是 2 的幂（`0x80000000 & 0x7FFFFFFF == 0`），但判断时必须先排除 0，否则 `0 & 0xFFFFFFFF == 0` 会把 0 误判成 2 的幂。`lowbit(0x80000000)` 就是它自己；`0xFFFFFFFF` 字节交换后不变。

## 提示
### 第 1 层
每个查询都是独立的，用一个 `while (q--)` 加 `scanf(" %c", &op)` 读操作符；`E` 没有参数，其余四种要再读一个 `unsigned int`。注意 `x` 最大到 `4294967295`，所以只能用 `%u` 读进 `unsigned int`，用 `int` 或 `%d` 读会出问题。

### 第 2 层
三个位技巧各一行：

- 2 的幂：`x != 0u && (x & (x - 1u)) == 0u`；
- popcount：`while (x != 0u) { x &= x - 1u; c++; }`，循环次数就是 1 的个数；
- lowbit：`x & (~x + 1u)`，等价于 `x & -x`，但对无符号数永远不会溢出。

### 第 3 层
两个容易翻车的细节：

1. **十六进制固定 8 位**：用 `printf("%08X", v)`，只写 `%X` 会把 `0x08` 打成 `8`，和预期格式不一致；
2. **字节交换不能有符号溢出**：`(x & 0xFF) << 24` 如果 `x` 是 `int`、最低字节 ≥ `0x80`，左移结果超出 `int` 就是 UB。四个 mask 全部用无符号字面量（`0x000000FFu`）并且参数类型写 `unsigned int`，或者用 `uint32_t`；
3. **`E` 不能写死**：用 `union` 或 `unsigned char *` 看最低地址上的字节，才算"真的判断"。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <stdint.h>

static int is_pow2(unsigned int x) {
    return x != 0u && (x & (x - 1u)) == 0u;
}

static int popcount(unsigned int x) {
    int c = 0;
    while (x != 0u) {
        x &= x - 1u;
        c++;
    }
    return c;
}

static unsigned int lowbit(unsigned int x) {
    return x & (~x + 1u);
}

static unsigned int swap32(unsigned int x) {
    return ((x & 0x000000FFu) << 24) |
           ((x & 0x0000FF00u) << 8) |
           ((x & 0x00FF0000u) >> 8) |
           ((x & 0xFF000000u) >> 24);
}

static int is_little_endian(void) {
    uint16_t v = 1u;
    return *(const unsigned char *)&v == 1u;
}

int main(void) {
    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }

    for (int i = 0; i < q; i++) {
        char op;
        if (scanf(" %c", &op) != 1) {
            return 0;
        }
        if (op == 'E') {
            printf("%s\n", is_little_endian() ? "little" : "big");
            continue;
        }

        unsigned int x;
        if (scanf("%u", &x) != 1) {
            return 0;
        }
        if (op == 'P') {
            printf("%d\n", is_pow2(x));
        } else if (op == 'C') {
            printf("%d\n", popcount(x));
        } else if (op == 'L') {
            printf("%08X\n", lowbit(x));
        } else if (op == 'S') {
            printf("%08X\n", swap32(x));
        } else {
            return 0;
        }
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }

    for (int i = 0; i < q; i++) {
        char op;
        if (scanf(" %c", &op) != 1) {
            return 0;
        }
        if (op == 'E') {
            printf("little\n");        /* TODO: 用 union 或 char* 真的判断一次 */
            continue;
        }

        unsigned int x;
        if (scanf("%u", &x) != 1) {
            return 0;
        }
        if (op == 'P') {
            printf("%d\n", x != 0u && (x & (x - 1u)) == 0u ? 1 : 0);
        } else if (op == 'C') {
            printf("0\n");             /* TODO: 统计二进制里 1 的个数 */
        } else if (op == 'L') {
            printf("00000000\n");      /* TODO: 取出最低位的 1 */
        } else if (op == 'S') {
            printf("00000000\n");      /* TODO: 交换 4 个字节的顺序 */
        }
    }
    return 0;
}
```

## 复杂度
时间 O(q × 32)：popcount 的循环次数不超过 32，其余查询都是 O(1)。
空间 O(1)：只用几个整数变量。

## 常见错误
### 判断 2 的幂时忘了排除 0 [WA]
`(x & (x - 1u)) == 0u` 对 `x = 0` 也成立（`0 - 1u` 回绕成 `0xFFFFFFFF`，与 0 按位与还是 0），于是 0 被误判成 2 的幂。示例 2 的第一条就是 `P 0`，专门抓这个错。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdint.h>

static int popcount(unsigned int x) {
    int c = 0;
    while (x != 0u) {
        x &= x - 1u;
        c++;
    }
    return c;
}

static unsigned int lowbit(unsigned int x) {
    return x & (~x + 1u);
}

static unsigned int swap32(unsigned int x) {
    return ((x & 0x000000FFu) << 24) |
           ((x & 0x0000FF00u) << 8) |
           ((x & 0x00FF0000u) >> 8) |
           ((x & 0xFF000000u) >> 24);
}

static int is_little_endian(void) {
    uint16_t v = 1u;
    return *(const unsigned char *)&v == 1u;
}

int main(void) {
    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        char op;
        if (scanf(" %c", &op) != 1) {
            return 0;
        }
        if (op == 'E') {
            printf("%s\n", is_little_endian() ? "little" : "big");
            continue;
        }
        unsigned int x;
        if (scanf("%u", &x) != 1) {
            return 0;
        }
        if (op == 'P') {
            printf("%d\n", (x & (x - 1u)) == 0u);   /* 错：没排除 x == 0 */
        } else if (op == 'C') {
            printf("%d\n", popcount(x));
        } else if (op == 'L') {
            printf("%08X\n", lowbit(x));
        } else if (op == 'S') {
            printf("%08X\n", swap32(x));
        }
    }
    return 0;
}
```

### 字节交换用 int 移位，最高位溢出 [UB]
`(x & 0xFF) << 24` 里如果 `x` 是 `int`、最低字节 ≥ `0x80`，左移结果超过 `INT_MAX`，是未定义行为。示例 2 的 `S 4294967295` 会直接触发 UBSan 的 `left shift of 255 by 24 places cannot be represented in type 'int'`。把参数和 mask 全写成无符号类型即可。

```c file=main.c expect=UB
#include <stdio.h>
#include <stdint.h>

static int popcount(unsigned int x) {
    int c = 0;
    while (x != 0u) {
        x &= x - 1u;
        c++;
    }
    return c;
}

static unsigned int lowbit(unsigned int x) {
    return x & (~x + 1u);
}

static int is_pow2(unsigned int x) {
    return x != 0u && (x & (x - 1u)) == 0u;
}

static unsigned int swap32(int x) {          /* 错：参数应该用无符号 */
    return (unsigned int)(((x & 0xFF) << 24) |
                          ((x & 0xFF00) << 8) |
                          ((x >> 8) & 0xFF00) |
                          ((x >> 24) & 0xFF));
}

static int is_little_endian(void) {
    uint16_t v = 1u;
    return *(const unsigned char *)&v == 1u;
}

int main(void) {
    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        char op;
        if (scanf(" %c", &op) != 1) {
            return 0;
        }
        if (op == 'E') {
            printf("%s\n", is_little_endian() ? "little" : "big");
            continue;
        }
        unsigned int x;
        if (scanf("%u", &x) != 1) {
            return 0;
        }
        if (op == 'P') {
            printf("%d\n", is_pow2(x));
        } else if (op == 'C') {
            printf("%d\n", popcount(x));
        } else if (op == 'L') {
            printf("%08X\n", lowbit(x));
        } else if (op == 'S') {
            printf("%08X\n", swap32(x));
        }
    }
    return 0;
}
```

### 十六进制没有补前导零 [WA]
`printf("%X", 8u)` 输出 `8`，而题目要求固定 8 位 `00000008`。示例 1 的 `L 40` 第一条就会挂。格式符必须写 `%08X`：`0` 表示补零、`8` 表示总宽度、`X` 输出大写字母。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdint.h>

static int is_pow2(unsigned int x) {
    return x != 0u && (x & (x - 1u)) == 0u;
}

static int popcount(unsigned int x) {
    int c = 0;
    while (x != 0u) {
        x &= x - 1u;
        c++;
    }
    return c;
}

static unsigned int lowbit(unsigned int x) {
    return x & (~x + 1u);
}

static unsigned int swap32(unsigned int x) {
    return ((x & 0x000000FFu) << 24) |
           ((x & 0x0000FF00u) << 8) |
           ((x & 0x00FF0000u) >> 8) |
           ((x & 0xFF000000u) >> 24);
}

static int is_little_endian(void) {
    uint16_t v = 1u;
    return *(const unsigned char *)&v == 1u;
}

int main(void) {
    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 1000) {
        return 0;
    }
    for (int i = 0; i < q; i++) {
        char op;
        if (scanf(" %c", &op) != 1) {
            return 0;
        }
        if (op == 'E') {
            printf("%s\n", is_little_endian() ? "little" : "big");
            continue;
        }
        unsigned int x;
        if (scanf("%u", &x) != 1) {
            return 0;
        }
        if (op == 'P') {
            printf("%d\n", is_pow2(x));
        } else if (op == 'C') {
            printf("%d\n", popcount(x));
        } else if (op == 'L') {
            printf("%X\n", lowbit(x));           /* 错：少了 08 */
        } else if (op == 'S') {
            printf("%08X\n", swap32(x));
        }
    }
    return 0;
}
```

### 把 `E` 写死成 big [WA]
"网络字节序是大端"——但本机是 x86-64 小端，`E` 应该输出 `little`。判断大小端的标准写法是：取一个多字节整数，看它的**最低字节**落在最低地址还是最高地址。写死答案在换机器后会全错，也过不了示例。

### lowbit 用有符号的 `x & -x` [UB]
对无符号数 `-x` 等价于 `~x + 1`，永远安全；但如果函数参数写成 `int`，`x = INT_MIN` 时 `-x` 溢出，是 UB。参数类型统一用 `unsigned int`/`uint32_t`，或者直接写 `x & (~x + 1u)`。

### 用 `int` 读 `4294967295` [WA]
`scanf("%d", &x)` 读一个 32 位 `int` 装不下的值，会溢出（标准未定义，本平台通常得到 -1）。判断 2 的幂、popcount 这类"只看二进制位"的运算，必须让 `x` 是 `unsigned int`、用 `%u` 读，符号位才不会被当成负数处理。

## 测试用例
### 01 sample 示例 1
```in
5
P 8
C 255
L 40
S 305419896
E
```
```out
1
8
00000008
78563412
little
```

### 02 sample 示例 2
```in
4
P 0
P 2147483648
L 2147483648
S 4294967295
```
```out
0
1
80000000
FFFFFFFF
```

### 03 degenerate 只有一条字节序查询
```in
1
E
```
```out
little
```

### 04 boundary 全 1 与全 0
```in
4
P 4294967295
C 4294967295
L 4294967295
S 0
```
```out
0
32
00000001
00000000
```

### 05 trap 0 的 popcount 和 lowbit
```in
2
C 0
L 0
```
```out
0
00000000
```

### 06 trap 单字节在两端
```in
4
S 1
S 16777216
C 2147483648
P 6
```
```out
01000000
00000001
1
0
```

### 07 normal 常见数值
```in
5
P 1
P 1024
C 65535
L 6
S 878082066
```
```out
1
1
16
00000002
12785634
```

### 08 trap 判断 2 的幂的边界
```in
4
P 2147483647
P 2147483648
P 3
P 4294967295
```
```out
0
1
0
0
```

### 生成 boundary 1000 条覆盖极值的查询
```js gen
const cases = [];

function popcount(x) {
  let c = 0;
  let v = x >>> 0;
  while (v !== 0) {
    v = (v & (v - 1)) >>> 0;
    c++;
  }
  return c;
}

function lowbit(x) {
  return (x & -x) >>> 0;
}

function swap32(x) {
  return (((x & 0xFF) << 24) |
          ((x & 0xFF00) << 8) |
          ((x >>> 8) & 0xFF00) |
          (x >>> 24)) >>> 0;
}

function hex8(v) {
  return v.toString(16).toUpperCase().padStart(8, '0');
}

function render(lines) {
  const out = [];
  for (const line of lines) {
    const parts = line.split(' ');
    const op = parts[0];
    if (op === 'E') {
      out.push('little');
      continue;
    }
    const x = Number(parts[1]) >>> 0;
    if (op === 'P') out.push(x !== 0 && (x & (x - 1)) === 0 ? '1' : '0');
    else if (op === 'C') out.push(String(popcount(x)));
    else if (op === 'L') out.push(hex8(lowbit(x)));
    else out.push(hex8(swap32(x)));
  }
  return out.join('\n') + '\n';
}

/* 边界：1000 条查询，轮流使用极值 */
{
  const values = [0, 1, 2, 4294967295, 2147483648, 2147483647, 65535, 16777216];
  const ops = ['P', 'C', 'L', 'S'];
  const lines = [];
  for (let i = 0; i < 1000; i++) {
    if (i % 10 === 9) {
      lines.push('E');
    } else {
      lines.push(`${ops[i % 4]} ${values[i % values.length]}`);
    }
  }
  cases.push({
    kind: 'boundary',
    category: '1000 条查询覆盖 0、最高位与全 1',
    input: `1000\n${lines.join('\n')}\n`,
    output: render(lines),
  });
}

/* 压力：800 条随机查询，x 取遍 32 位无符号范围 */
{
  const ops = ['P', 'C', 'L', 'S', 'E'];
  const lines = [];
  for (let i = 0; i < 800; i++) {
    const op = ops[rng.int(0, 4)];
    if (op === 'E') {
      lines.push('E');
    } else {
      lines.push(`${op} ${rng.int(0, 4294967295)}`);
    }
  }
  cases.push({
    kind: 'stress',
    category: '800 条随机查询',
    input: `800\n${lines.join('\n')}\n`,
    output: render(lines),
  });
}

return cases;
```
