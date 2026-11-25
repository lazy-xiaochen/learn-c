---json
{
  "id": "p-s5-memory-layout-2",
  "title": "存储区标注器：给变量表贴上 data、BSS、栈与堆的标签",
  "difficulty": "L2",
  "knowledgePoints": ["s5-memory-layout"],
  "special": "memory-layout",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
教学平台要给一段示例程序里的每个变量打上"存储区"标签，帮助初学者理解"变量到底住在哪里"。你拿到的是一份**变量清单**，每行给出：

- `kind`：变量在源码里的声明方式；
- `name`：变量名（全表唯一）；
- `type`：元素类型；
- `count`：元素个数（普通变量就是 1，数组就是数组长度）。

请按下面的规则计算每个变量占多少字节、属于哪个区、生命周期有多长。

### 区与生命周期的对应关系

| kind | 含义 | 区 | 生命周期 |
|---|---|---|---|
| `func` | 函数代码 | `text` | `process` |
| `global0` | 没有初值或初值为 0 的全局变量 | `bss` | `process` |
| `global1` | 有非零初值的全局变量 | `data` | `process` |
| `static0` | 没有初值或初值为 0 的 `static` 局部变量 | `bss` | `process` |
| `static1` | 有非零初值的 `static` 局部变量 | `data` | `process` |
| `local` | 函数内普通局部变量 | `stack` | `call` |
| `alloc` | `malloc` / `calloc` 得到的堆块 | `heap` | `until-free` |
| `string` | 字符串字面量 | `rodata` | `process` |

类型大小按本平台（x86-64）计算：`char` 1、`short` 2、`int` 4、`long` 8、`double` 8、`ptr` 8、`code` 1（`code` 只用于函数，`count` 就是机器码字节数）。每个变量占 `type_size(type) * count` 字节。

**函数代码和字符串字面量也是要占空间的**：前者在 `text`，后者在 `rodata`。`bss` 虽然占运行时内存，但不占可执行文件的字节；`stack` 和 `heap` 更是运行时才出现。最后请输出 `image = text + data + rodata`，表示"必须写进可执行文件的字节数"。

## 输入格式
第一行两个整数 `n`、`q`：变量个数、查询个数。

接下来 `n` 行，每行四个字段：

```
kind name type count
```

`kind` 是上表中的八种之一；`name` 只含小写字母、数字和下划线；`type` 是 `char`、`short`、`int`、`long`、`double`、`ptr`、`code` 之一；`count` 是正整数。

接下来 `q` 行，每行一个变量名，按输入顺序回答它的区和生命周期。

## 输出格式
先输出六个区的总字节数，顺序固定：

```
text=<总字节数>
data=<总字节数>
bss=<总字节数>
rodata=<总字节数>
stack=<总字节数>
heap=<总字节数>
image=<text + data + rodata>
```

然后对每个查询输出一行：

```
<name> -> <区> <生命周期>
```

## 数据范围
- 1 ≤ n ≤ 1000
- 1 ≤ q ≤ 1000
- 1 ≤ count ≤ 1000000
- 总值最大约为 1000 × 8 × 10⁶ = 8 × 10⁹，超过 `int`，必须用 `long long` 保存
- 变量名互不相同，查询的名字一定存在

## 示例
### 示例 1
```in
8 4
func main code 120
global0 g_count int 1
global1 g_limit int 1
static0 s_calls int 1
static1 s_table double 4
local buf char 16
alloc cache int 100
string msg char 6
g_count
cache
buf
msg
```
```out
text=120
data=36
bss=8
rodata=6
stack=16
heap=400
image=162
g_count -> bss process
cache -> heap until-free
buf -> stack call
msg -> rodata process
```
> `g_count` 没有非零初值，进 `bss`；`g_limit`（4 字节）和 `s_table`（`double` 8 × 4 = 32 字节）有非零初值，进 `data`，共 36；`s_calls` 是 `static` 且没有初值，也进 `bss`，和 `g_count` 合计 8。`cache` 是 100 个 `int`，共 400 字节的堆内存。`image` 只算 `text + data + rodata = 120 + 36 + 6 = 162`，不含 `bss`、`stack`、`heap`。

### 示例 2（边界：只有一个函数，没有任何数据）
```in
1 1
func start code 64
start
```
```out
text=64
data=0
bss=0
rodata=0
stack=0
heap=0
image=64
start -> text process
```
> 没有数据变量时其余五个区都是 0，`image` 只包含函数的 64 字节代码。查询一个 `func` 得到 `text process`，不要把它算成 `data`。

## 提示
### 第 1 层
先写一个 `type_size` 函数把类型名映射成字节数，再按 `kind` 决定区。`global0` 和 `static0` 的关键是末尾的 `0`：它们没有非零初值，所以进 `bss`。

### 第 2 层
每个变量的字节数是 `type_size(type) * count`，乘法要用 `long long`，因为总和会超过 `int`。六个区的总字节数也各自用 `long long` 累加。

### 第 3 层
`image` 只加 `text`、`data`、`rodata` 三个区，千万不要把 `bss`、`stack`、`heap` 算进去。查询时按名字在表里线性查找即可（`n ≤ 1000`），找到后根据 `kind` 输出对应的区和生命周期。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXN 1000

typedef struct {
    char name[16];
    char kind[8];
    char type[8];
    int count;
    long long bytes;
    int seg;      /* 0 text, 1 data, 2 bss, 3 rodata, 4 stack, 5 heap */
} Item;

static int type_size(const char *t) {
    if (strcmp(t, "char") == 0) return 1;
    if (strcmp(t, "short") == 0) return 2;
    if (strcmp(t, "int") == 0) return 4;
    if (strcmp(t, "long") == 0) return 8;
    if (strcmp(t, "double") == 0) return 8;
    if (strcmp(t, "ptr") == 0) return 8;
    if (strcmp(t, "code") == 0) return 1;
    return 0;
}

int main(void) {
    int n, q;
    if (scanf("%d %d", &n, &q) != 2 || n < 1 || n > MAXN || q < 1 || q > MAXN) {
        return 0;
    }

    Item items[MAXN];
    long long total[6] = { 0, 0, 0, 0, 0, 0 };

    for (int i = 0; i < n; i++) {
        if (scanf("%7s %15s %7s %d", items[i].kind, items[i].name, items[i].type, &items[i].count) != 4) {
            return 0;
        }
        if (items[i].count < 1) {
            return 0;
        }

        if (strcmp(items[i].kind, "func") == 0) {
            items[i].seg = 0;
        } else if (strcmp(items[i].kind, "global0") == 0 || strcmp(items[i].kind, "static0") == 0) {
            items[i].seg = 2;
        } else if (strcmp(items[i].kind, "global1") == 0 || strcmp(items[i].kind, "static1") == 0) {
            items[i].seg = 1;
        } else if (strcmp(items[i].kind, "local") == 0) {
            items[i].seg = 4;
        } else if (strcmp(items[i].kind, "alloc") == 0) {
            items[i].seg = 5;
        } else if (strcmp(items[i].kind, "string") == 0) {
            items[i].seg = 3;
        } else {
            return 0;
        }

        int unit = type_size(items[i].type);
        if (unit == 0) {
            return 0;
        }
        items[i].bytes = (long long)unit * items[i].count;
        total[items[i].seg] += items[i].bytes;
    }

    const char *seg_name[6] = { "text", "data", "bss", "rodata", "stack", "heap" };
    for (int s = 0; s < 6; s++) {
        printf("%s=%lld\n", seg_name[s], total[s]);
    }
    printf("image=%lld\n", total[0] + total[1] + total[3]);

    const char *life[6] = { "process", "process", "process", "process", "call", "until-free" };
    for (int k = 0; k < q; k++) {
        char name[16];
        if (scanf("%15s", name) != 1) {
            return 0;
        }
        int idx = -1;
        for (int i = 0; i < n; i++) {
            if (strcmp(items[i].name, name) == 0) {
                idx = i;
                break;
            }
        }
        if (idx < 0) {
            return 0;
        }
        int s = items[idx].seg;
        printf("%s -> %s %s\n", name, seg_name[s], life[s]);
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXN 1000

typedef struct {
    char name[16];
    char kind[8];
    char type[8];
    int count;
    long long bytes;
    int seg;
} Item;

static int type_size(const char *t) {
    if (strcmp(t, "char") == 0) return 1;
    if (strcmp(t, "short") == 0) return 2;
    if (strcmp(t, "int") == 0) return 4;
    if (strcmp(t, "long") == 0) return 8;
    if (strcmp(t, "double") == 0) return 8;
    if (strcmp(t, "ptr") == 0) return 8;
    if (strcmp(t, "code") == 0) return 1;
    return 0;
}

int main(void) {
    int n, q;
    if (scanf("%d %d", &n, &q) != 2 || n < 1 || n > MAXN || q < 1 || q > MAXN) {
        return 0;
    }

    Item items[MAXN];
    long long total[6] = { 0, 0, 0, 0, 0, 0 };

    for (int i = 0; i < n; i++) {
        if (scanf("%7s %15s %7s %d", items[i].kind, items[i].name, items[i].type, &items[i].count) != 4) {
            return 0;
        }

        if (strcmp(items[i].kind, "func") == 0) {
            items[i].seg = 0;
        } else if (strcmp(items[i].kind, "local") == 0) {
            items[i].seg = 4;
        } else if (strcmp(items[i].kind, "alloc") == 0) {
            items[i].seg = 5;
        } else if (strcmp(items[i].kind, "string") == 0) {
            items[i].seg = 3;
        } else {
            items[i].seg = 1;      /* TODO: global0 / static0 应该进 bss */
        }

        items[i].bytes = (long long)type_size(items[i].type) * items[i].count;
        total[items[i].seg] += items[i].bytes;
    }

    const char *seg_name[6] = { "text", "data", "bss", "rodata", "stack", "heap" };
    for (int s = 0; s < 6; s++) {
        printf("%s=%lld\n", seg_name[s], total[s]);
    }
    printf("image=%lld\n", total[0] + total[1] + total[2] + total[3]);   /* TODO: 不该加 bss */

    const char *life[6] = { "process", "process", "process", "process", "call", "until-free" };
    for (int k = 0; k < q; k++) {
        char name[16];
        if (scanf("%15s", name) != 1) {
            return 0;
        }
        int idx = -1;
        for (int i = 0; i < n; i++) {
            if (strcmp(items[i].name, name) == 0) {
                idx = i;
                break;
            }
        }
        int s = items[idx].seg;
        printf("%s -> %s %s\n", name, seg_name[s], life[s]);
    }
    return 0;
}
```

## 复杂度
时间 O(n + nq)：读入并累加一遍，每个查询线性查找一遍变量表（`n, q ≤ 1000`）。
空间 O(n)：一个定长数组保存变量信息。

## 常见错误
### 把 global0 / static0 也算进 data [WA]
`global0` 和 `static0` 表示"没有非零初值"，它们住在 `bss`；只有 `global1` 和 `static1` 才住在 `data`。把所有全局/静态变量都塞进 `data`，会让 `data` 偏大、`bss` 恒为 0，`image` 也跟着错。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXN 1000

typedef struct {
    char name[16];
    char kind[8];
    char type[8];
    int count;
    long long bytes;
    int seg;
} Item;

static int type_size(const char *t) {
    if (strcmp(t, "char") == 0) return 1;
    if (strcmp(t, "short") == 0) return 2;
    if (strcmp(t, "int") == 0) return 4;
    if (strcmp(t, "long") == 0) return 8;
    if (strcmp(t, "double") == 0) return 8;
    if (strcmp(t, "ptr") == 0) return 8;
    if (strcmp(t, "code") == 0) return 1;
    return 0;
}

int main(void) {
    int n, q;
    if (scanf("%d %d", &n, &q) != 2) {
        return 0;
    }
    Item items[MAXN];
    long long total[6] = { 0, 0, 0, 0, 0, 0 };
    for (int i = 0; i < n; i++) {
        if (scanf("%7s %15s %7s %d", items[i].kind, items[i].name, items[i].type, &items[i].count) != 4) {
            return 0;
        }
        if (strcmp(items[i].kind, "func") == 0) {
            items[i].seg = 0;
        } else if (strcmp(items[i].kind, "local") == 0) {
            items[i].seg = 4;
        } else if (strcmp(items[i].kind, "alloc") == 0) {
            items[i].seg = 5;
        } else if (strcmp(items[i].kind, "string") == 0) {
            items[i].seg = 3;
        } else {
            items[i].seg = 1;                 /* 错：global0 / static0 应该是 bss */
        }
        items[i].bytes = (long long)type_size(items[i].type) * items[i].count;
        total[items[i].seg] += items[i].bytes;
    }
    const char *seg_name[6] = { "text", "data", "bss", "rodata", "stack", "heap" };
    for (int s = 0; s < 6; s++) {
        printf("%s=%lld\n", seg_name[s], total[s]);
    }
    printf("image=%lld\n", total[0] + total[1] + total[2] + total[3]);
    const char *life[6] = { "process", "process", "process", "process", "call", "until-free" };
    for (int k = 0; k < q; k++) {
        char name[16];
        if (scanf("%15s", name) != 1) {
            return 0;
        }
        int idx = 0;
        for (int i = 0; i < n; i++) {
            if (strcmp(items[i].name, name) == 0) {
                idx = i;
                break;
            }
        }
        int s = items[idx].seg;
        printf("%s -> %s %s\n", name, seg_name[s], life[s]);
    }
    return 0;
}
```

### 把 bss 算进 image [WA]
`image` 表示"必须写进可执行文件的字节数"，只包含 `text + data + rodata`。`bss` 的初值全是 0，加载器只需要记下大小，不需要在文件里存内容；把它加进 `image` 会让可执行文件体积被高估。

### 以为 static 局部变量在栈上 [WA]
函数内的 `static` 变量虽然名字只在函数里可见，存储期却是整个进程，放在 `data` 或 `bss`，不在 `stack`。把 `static0` / `static1` 归到 `stack`，会让 `bss`/`data` 偏小、`stack` 偏大。

### 用 int 累加总字节数 [UB]
`count` 最大 10⁶，`type_size` 最大 8，单个变量就能有 8 × 10⁶ 字节；1000 个变量合计可达 8 × 10⁹，超过 `int` 上限。有符号整数溢出是未定义行为，必须用 `long long` 保存每个变量的字节数和六个区的总和。

## 测试用例
### 01 sample 示例 1
```in
8 4
func main code 120
global0 g_count int 1
global1 g_limit int 1
static0 s_calls int 1
static1 s_table double 4
local buf char 16
alloc cache int 100
string msg char 6
g_count
cache
buf
msg
```
```out
text=120
data=36
bss=8
rodata=6
stack=16
heap=400
image=162
g_count -> bss process
cache -> heap until-free
buf -> stack call
msg -> rodata process
```

### 02 sample 示例 2
```in
1 1
func start code 64
start
```
```out
text=64
data=0
bss=0
rodata=0
stack=0
heap=0
image=64
start -> text process
```

### 03 degenerate 只有一个 bss 变量
```in
1 2
static0 only int 1
only
only
```
```out
text=0
data=0
bss=4
rodata=0
stack=0
heap=0
image=0
only -> bss process
only -> bss process
```

### 04 trap 零初始化与字符串
```in
5 5
global0 zero1 int 3
global1 init1 char 7
static0 zero2 double 2
string text char 12
local arr int 5
zero1
init1
text
arr
zero2
```
```out
text=0
data=7
bss=28
rodata=12
stack=20
heap=0
image=19
zero1 -> bss process
init1 -> data process
text -> rodata process
arr -> stack call
zero2 -> bss process
```
> `zero1` 是 3 个 `int`，12 字节进 `bss`；`zero2` 是 2 个 `double`，16 字节也进 `bss`，合计 28。`init1` 是 7 个 `char`，进 `data`。`image = 0 + 7 + 12 = 19`。

### 05 trap 不同元素类型的大小
```in
6 6
func f code 10
global1 a long 2
global0 b int 3
local c double 4
alloc d ptr 10
string e char 3
f
a
b
c
d
e
```
```out
text=10
data=16
bss=12
rodata=3
stack=32
heap=80
image=29
f -> text process
a -> data process
b -> bss process
c -> stack call
d -> heap until-free
e -> rodata process
```
> `long` 8 × 2 = 16；`int` 4 × 3 = 12；`double` 8 × 4 = 32；`ptr` 8 × 10 = 80；`char` 3。`image = 10 + 16 + 3 = 29`。

### 06 normal 混合清单
```in
7 5
global1 total long 1
static0 hits int 2
local tmp short 3
alloc buf char 64
string name char 9
func helper code 48
static1 rate double 1
total
hits
tmp
buf
name
```
```out
text=48
data=16
bss=8
rodata=9
stack=6
heap=64
image=73
total -> data process
hits -> bss process
tmp -> stack call
buf -> heap until-free
name -> rodata process
```

### 生成 boundary 1000 个变量与 1000 次查询
```js gen
const cases = [];
const typeSize = { char: 1, short: 2, int: 4, long: 8, double: 8, ptr: 8, code: 1 };
const kinds = ['func', 'global0', 'global1', 'static0', 'static1', 'local', 'alloc', 'string'];
const types = ['char', 'short', 'int', 'long', 'double', 'ptr'];
const segOf = {
  func: 0, global1: 1, static1: 1, global0: 2, static0: 2,
  string: 3, local: 4, alloc: 5,
};
const segName = ['text', 'data', 'bss', 'rodata', 'stack', 'heap'];
const life = ['process', 'process', 'process', 'process', 'call', 'until-free'];

const items = [];
for (let i = 0; i < 1000; i++) {
  const kind = rng.pick(kinds);
  const type = kind === 'func' ? 'code' : (kind === 'string' ? 'char' : rng.pick(types));
  const count = kind === 'func' ? rng.int(16, 4096) : rng.int(1, 1000000);
  items.push({ name: `v${i}`, kind, type, count });
}

const total = [0, 0, 0, 0, 0, 0];
for (const it of items) {
  const seg = segOf[it.kind];
  total[seg] += typeSize[it.type] * it.count;
}

const lines = [];
for (let s = 0; s < 6; s++) lines.push(`${segName[s]}=${total[s]}`);
lines.push(`image=${total[0] + total[1] + total[3]}`);
const queries = [];
for (let k = 0; k < 1000; k++) {
  queries.push(items[rng.int(0, items.length - 1)].name);
}
for (const name of queries) {
  const it = items.find((x) => x.name === name);
  const seg = segOf[it.kind];
  lines.push(`${name} -> ${segName[seg]} ${life[seg]}`);
}

const input = `${items.length} ${queries.length}\n`
  + items.map((it) => `${it.kind} ${it.name} ${it.type} ${it.count}`).join('\n') + '\n'
  + queries.join('\n') + '\n';

cases.push({
  kind: 'boundary',
  category: '1000 个变量、1000 次查询、单个变量最大 8MB',
  input,
  output: lines.join('\n') + '\n',
});

return cases;
```
