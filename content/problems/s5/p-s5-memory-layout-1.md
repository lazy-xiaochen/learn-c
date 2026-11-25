---json
{
  "id": "p-s5-memory-layout-1",
  "title": "段布局审计：把全局变量分别装进 .data 与 .bss",
  "difficulty": "L3",
  "knowledgePoints": ["s5-memory-layout"],
  "special": "memory-layout",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
编译器把全局变量和 `static` 变量分成两个段：

- **`.data`**：有非零初值的对象，内容必须写进可执行文件；
- **`.bss`**：没有初值（或初值为 0）的对象，加载时由系统整体清零，不占文件体积。

现在要给一个教学工具写"段布局审计器"：它不运行程序，也不打印任何真实地址，只根据一份**声明日志**算出每个对象在自己段里的偏移，并回答"某个段的某个偏移上是什么"。

### 审计规则
日志里的每个对象有四个属性：名字、大小、对齐要求、是否有非零初值。

1. `init = 1` 的对象放进 `.data`，`init = 0` 的对象放进 `.bss`；
2. 两个段各有一个**独立游标**，都从 0 开始；
3. 按输入顺序处理对象：先把它所在段的游标向上取整到 `align` 的倍数（差出来的字节就是填充），这个对齐后的位置就是对象的偏移 `off`，然后把该段游标改成 `off + size`；
4. 所有对象处理完后，段的字节数就是该段游标的最终值。段末尾不再额外取整；
5. 偏移落在段内、但不属于任何对象时，这块空间是填充（padding）；偏移大于等于段大小时，已经越过了这个段（beyond）。

注意两个段是**分开**摆放的：`.data` 里的对象不会在 `.bss` 里占位置，反之亦然。把两个游标混成一个，后面的偏移会全错。

## 输入格式
第一行两个整数 `n` 和 `q`：

- `n`：对象个数（可以为 0）；
- `q`：查询个数。

接下来 `n` 行，每行描述一个对象：

```
name size align init
```

- `name`：只含小写字母、数字和下划线，长度不超过 15，全表唯一；
- `size`：对象占用的字节数；
- `align`：对齐要求，只可能是 1、2、4、8；
- `init`：`1` 表示有非零初值，`0` 表示没有初值或初值为 0。

接下来 `q` 行，每行一个查询：

```
seg offset
```

`seg` 是 `data` 或 `bss`，`offset` 是一个非负整数。

## 输出格式
先按输入顺序输出每个对象一行：

```
obj <name> <data|bss> off=<偏移> size=<大小>
```

然后输出三个汇总行：

```
data=<.data 字节数>
bss=<.bss 字节数>
total=<两个段之和>
```

最后按输入顺序输出每个查询的结果：

- `at <seg> <offset> -> <name>`：这个偏移落在某个对象内；
- `at <seg> <offset> -> pad`：在段内，但落在对齐填充里；
- `at <seg> <offset> -> beyond`：偏移大于等于该段大小。

## 数据范围
- 0 ≤ n ≤ 1000
- 1 ≤ q ≤ 1000
- 1 ≤ size ≤ 64
- align ∈ {1, 2, 4, 8}
- 0 ≤ offset ≤ 200000
- 所有对象名互不相同

每个段的字节数最多约 1000 × 64 + 1000 × 7 = 71000，`int` 足够。

## 示例
### 示例 1
```in
5 6
g_count 4 4 0
g_limit 4 4 1
g_name 8 8 1
s_flag 1 1 0
g_table 32 8 1
data 4
data 8
bss 0
bss 4
bss 5
data 47
```
```out
obj g_count bss off=0 size=4
obj g_limit data off=0 size=4
obj g_name data off=8 size=8
obj s_flag bss off=4 size=1
obj g_table data off=16 size=32
data=48
bss=5
total=53
at data 4 -> pad
at data 8 -> g_name
at bss 0 -> g_count
at bss 4 -> s_flag
at bss 5 -> beyond
at data 47 -> g_table
```
> `.data` 段依次放 `g_limit`（0–3）、`g_name`（8–15）、`g_table`（16–47），`[4, 8)` 是为了让 8 字节的 `g_name` 对齐而留下的填充，段大小是 48。`.bss` 段放 `g_count`（0–3）和 `s_flag`（4），段大小是 5，所以 `bss 5` 已经越过段尾，判 `beyond`。

### 示例 2（边界：没有任何全局对象）
```in
0 3
data 0
bss 0
data 7
```
```out
data=0
bss=0
total=0
at data 0 -> beyond
at bss 0 -> beyond
at data 7 -> beyond
```
> `n = 0` 时不会输出任何 `obj` 行，两个段的游标都停在 0。段大小为 0 意味着任何偏移（包括 0）都已经越界，所以三个查询全是 `beyond`，不会有 `pad`。

## 提示
### 第 1 层
先不要把两个段混在一起想：拿两张纸，一张写 `.data`，一张写 `.bss`，各自从 0 开始往下加。每读到一个对象，只看它所在的那张纸。

### 第 2 层
对齐可以写成 `aligned = (cur + align - 1) / align * align`，其中 `cur` 是**当前段**的游标。对象的偏移是 `aligned`，不是 `cur`；放好之后游标变成 `aligned + size`。`aligned > cur` 的那一段就是填充。

### 第 3 层
查询的判定顺序很重要：先看 `offset >= 段大小`，是就输出 `beyond`；否则再到**该段**的对象里找区间 `[off, off + size)`；一个都没命中才是 `pad`。不要拿另一个段的段大小来比较，也不要把 `total` 当成某一项的段尾。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAXN 1000

typedef struct {
    char name[16];
    int size;
    int align;
    int init;
    int seg;      /* 0 = data, 1 = bss */
    int off;
} Obj;

int main(void) {
    int n, q;
    if (scanf("%d %d", &n, &q) != 2 || n < 0 || n > MAXN || q < 1 || q > MAXN) {
        return 0;
    }

    Obj objs[MAXN];
    int cursor[2] = { 0, 0 };                 /* data 和 bss 各一个游标 */

    for (int i = 0; i < n; i++) {
        if (scanf("%15s %d %d %d", objs[i].name, &objs[i].size, &objs[i].align, &objs[i].init) != 4) {
            return 0;
        }
        if (objs[i].size < 1 || objs[i].size > 64) {
            return 0;
        }
        if (objs[i].align != 1 && objs[i].align != 2 && objs[i].align != 4 && objs[i].align != 8) {
            return 0;
        }
        if (objs[i].init < 0 || objs[i].init > 1) {
            return 0;
        }

        objs[i].seg = objs[i].init ? 0 : 1;
        int cur = cursor[objs[i].seg];
        int aligned = (cur + objs[i].align - 1) / objs[i].align * objs[i].align;
        objs[i].off = aligned;
        cursor[objs[i].seg] = aligned + objs[i].size;
    }

    for (int i = 0; i < n; i++) {
        printf("obj %s %s off=%d size=%d\n", objs[i].name,
               objs[i].seg == 0 ? "data" : "bss", objs[i].off, objs[i].size);
    }
    printf("data=%d\n", cursor[0]);
    printf("bss=%d\n", cursor[1]);
    printf("total=%d\n", cursor[0] + cursor[1]);

    for (int k = 0; k < q; k++) {
        char seg[8];
        int off;
        if (scanf("%7s %d", seg, &off) != 2) {
            return 0;
        }
        int s = (seg[0] == 'd') ? 0 : 1;

        if (off < 0 || off >= cursor[s]) {
            printf("at %s %d -> beyond\n", seg, off);
            continue;
        }

        int idx = -1;
        for (int i = 0; i < n; i++) {
            if (objs[i].seg == s && off >= objs[i].off && off < objs[i].off + objs[i].size) {
                idx = i;
                break;
            }
        }
        if (idx >= 0) {
            printf("at %s %d -> %s\n", seg, off, objs[idx].name);
        } else {
            printf("at %s %d -> pad\n", seg, off);
        }
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAXN 1000

typedef struct {
    char name[16];
    int size;
    int align;
    int init;
    int seg;
    int off;
} Obj;

int main(void) {
    int n, q;
    if (scanf("%d %d", &n, &q) != 2 || n < 0 || n > MAXN || q < 1 || q > MAXN) {
        return 0;
    }

    Obj objs[MAXN];
    int cursor = 0;                    /* TODO: .data 和 .bss 应该各有一个游标 */

    for (int i = 0; i < n; i++) {
        if (scanf("%15s %d %d %d", objs[i].name, &objs[i].size, &objs[i].align, &objs[i].init) != 4) {
            return 0;
        }
        objs[i].seg = objs[i].init ? 0 : 1;
        objs[i].off = cursor;          /* TODO: 先按 align 向上取整，再确定 off */
        cursor += objs[i].size;        /* TODO: 只能累加所在段的游标 */
    }

    for (int i = 0; i < n; i++) {
        printf("obj %s %s off=%d size=%d\n", objs[i].name,
               objs[i].seg == 0 ? "data" : "bss", objs[i].off, objs[i].size);
    }
    printf("data=%d\n", cursor);       /* TODO: data 和 bss 应分别输出 */
    printf("bss=%d\n", 0);
    printf("total=%d\n", cursor);

    for (int k = 0; k < q; k++) {
        char seg[8];
        int off;
        if (scanf("%7s %d", seg, &off) != 2) {
            return 0;
        }
        int s = (seg[0] == 'd') ? 0 : 1;

        int idx = -1;
        for (int i = 0; i < n; i++) {
            if (objs[i].seg == s && off >= objs[i].off && off < objs[i].off + objs[i].size) {
                idx = i;
                break;
            }
        }
        if (idx >= 0) {
            printf("at %s %d -> %s\n", seg, off, objs[idx].name);
        } else {
            printf("at %s %d -> pad\n", seg, off);   /* TODO: 段外要判 beyond */
        }
    }
    return 0;
}
```

## 复杂度
时间 O(n + nq)：布局扫一遍对象，每个查询最坏扫一遍对象表（`n ≤ 1000`、`q ≤ 1000`，最多 10⁶ 次比较）。
空间 O(n)：一个定长对象数组。

## 常见错误
### 两个段共用一个游标 [WA]
`.data` 和 `.bss` 是两个独立的段，游标必须分开。共用一个游标会让后面对象的偏移整体偏大，`data=` 和 `bss=` 也至少有一个是错的。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXN 1000

typedef struct {
    char name[16];
    int size;
    int align;
    int init;
    int seg;
    int off;
} Obj;

int main(void) {
    int n, q;
    if (scanf("%d %d", &n, &q) != 2) {
        return 0;
    }
    Obj objs[MAXN];
    int cursor = 0;                    /* 错：两个段共用 */
    for (int i = 0; i < n; i++) {
        if (scanf("%15s %d %d %d", objs[i].name, &objs[i].size, &objs[i].align, &objs[i].init) != 4) {
            return 0;
        }
        objs[i].seg = objs[i].init ? 0 : 1;
        int aligned = (cursor + objs[i].align - 1) / objs[i].align * objs[i].align;
        objs[i].off = aligned;
        cursor = aligned + objs[i].size;
    }
    for (int i = 0; i < n; i++) {
        printf("obj %s %s off=%d size=%d\n", objs[i].name,
               objs[i].seg == 0 ? "data" : "bss", objs[i].off, objs[i].size);
    }
    printf("data=%d\n", cursor);
    printf("bss=%d\n", 0);
    printf("total=%d\n", cursor);
    for (int k = 0; k < q; k++) {
        char seg[8];
        int off;
        if (scanf("%7s %d", seg, &off) != 2) {
            return 0;
        }
        int s = (seg[0] == 'd') ? 0 : 1;
        if (off < 0 || off >= cursor) {
            printf("at %s %d -> beyond\n", seg, off);
            continue;
        }
        int idx = -1;
        for (int i = 0; i < n; i++) {
            if (objs[i].seg == s && off >= objs[i].off && off < objs[i].off + objs[i].size) {
                idx = i;
                break;
            }
        }
        if (idx >= 0) {
            printf("at %s %d -> %s\n", seg, off, objs[idx].name);
        } else {
            printf("at %s %d -> pad\n", seg, off);
        }
    }
    return 0;
}
```

### 忘记按 align 对齐 [WA]
4 字节对象之后放 8 字节对象，8 字节对象的偏移必须是 8 的倍数，中间空出来的字节就是对齐填充。跳过这一步，后面所有偏移都会向低地址挤，查询会把填充误判成对象。

### 查询上界用错段 [WA]
`beyond` 要和**查询所在段**的大小比较。拿 `total` 或另一个段的游标来比，会让 `.data` 的查询在 `.bss` 的大小以内被误判成 `pad`，或者把真正越界的偏移判成对象。

### 把 init=0 的对象放进 .data [WA]
`init = 0` 表示初值为 0 或没有初值，应该进 `.bss`；只有 `init = 1` 才进 `.data`。反过来会把两个段的布局和大小全部算错。

## 测试用例
### 01 sample 示例 1
```in
5 6
g_count 4 4 0
g_limit 4 4 1
g_name 8 8 1
s_flag 1 1 0
g_table 32 8 1
data 4
data 8
bss 0
bss 4
bss 5
data 47
```
```out
obj g_count bss off=0 size=4
obj g_limit data off=0 size=4
obj g_name data off=8 size=8
obj s_flag bss off=4 size=1
obj g_table data off=16 size=32
data=48
bss=5
total=53
at data 4 -> pad
at data 8 -> g_name
at bss 0 -> g_count
at bss 4 -> s_flag
at bss 5 -> beyond
at data 47 -> g_table
```

### 02 sample 示例 2
```in
0 3
data 0
bss 0
data 7
```
```out
data=0
bss=0
total=0
at data 0 -> beyond
at bss 0 -> beyond
at data 7 -> beyond
```

### 03 degenerate 只有一个 1 字节对象
```in
1 4
solo 1 1 0
bss 0
bss 1
data 0
bss 0
```
```out
obj solo bss off=0 size=1
data=0
bss=1
total=1
at bss 0 -> solo
at bss 1 -> beyond
at data 0 -> beyond
at bss 0 -> solo
```

### 04 trap 两个段交替放置
```in
4 6
a 4 4 1
b 4 4 0
c 2 2 1
d 1 1 0
data 0
data 5
data 6
bss 4
bss 2
bss 5
```
```out
obj a data off=0 size=4
obj b bss off=0 size=4
obj c data off=4 size=2
obj d bss off=4 size=1
data=6
bss=5
total=11
at data 0 -> a
at data 5 -> c
at data 6 -> beyond
at bss 4 -> d
at bss 2 -> b
at bss 5 -> beyond
```

### 05 trap 对齐产生的填充
```in
3 6
x 1 8 1
y 1 8 0
z 8 8 1
data 1
data 7
data 8
data 15
data 16
bss 1
```
```out
obj x data off=0 size=1
obj y bss off=0 size=1
obj z data off=8 size=8
data=16
bss=1
total=17
at data 1 -> pad
at data 7 -> pad
at data 8 -> z
at data 15 -> z
at data 16 -> beyond
at bss 1 -> beyond
```

### 06 normal 混合大小与初值
```in
5 5
g_a 3 4 1
g_b 2 2 0
g_c 5 1 1
g_d 4 8 0
g_e 1 1 1
data 3
data 8
bss 2
bss 8
data 9
```
```out
obj g_a data off=0 size=3
obj g_b bss off=0 size=2
obj g_c data off=3 size=5
obj g_d bss off=8 size=4
obj g_e data off=8 size=1
data=9
bss=12
total=21
at data 3 -> g_c
at data 8 -> g_e
at bss 2 -> pad
at bss 8 -> g_d
at data 9 -> beyond
```

### 生成 boundary 1000 个对象与 500 次查询
```js gen
const cases = [];

function layout(objects) {
  const cursor = [0, 0];
  const rows = [];
  for (const o of objects) {
    const seg = o.init ? 0 : 1;
    const aligned = Math.ceil(cursor[seg] / o.align) * o.align;
    rows.push({ name: o.name, size: o.size, seg, off: aligned });
    cursor[seg] = aligned + o.size;
  }
  return { rows, data: cursor[0], bss: cursor[1] };
}

function render(objects, queries) {
  const { rows, data, bss } = layout(objects);
  const lines = [];
  for (const r of rows) {
    lines.push(`obj ${r.name} ${r.seg === 0 ? 'data' : 'bss'} off=${r.off} size=${r.size}`);
  }
  lines.push(`data=${data}`, `bss=${bss}`, `total=${data + bss}`);
  for (const q of queries) {
    const segName = q.seg === 0 ? 'data' : 'bss';
    const segSize = q.seg === 0 ? data : bss;
    let answer = 'beyond';
    if (q.off >= 0 && q.off < segSize) {
      answer = 'pad';
      for (const r of rows) {
        if (r.seg === q.seg && q.off >= r.off && q.off < r.off + r.size) {
          answer = r.name;
          break;
        }
      }
    }
    lines.push(`at ${segName} ${q.off} -> ${answer}`);
  }
  return lines.join('\n') + '\n';
}

const objects = [];
for (let i = 0; i < 1000; i++) {
  objects.push({
    name: `v${i}`,
    size: rng.int(1, 64),
    align: rng.pick([1, 2, 4, 8]),
    init: rng.int(0, 1),
  });
}

const { data, bss } = layout(objects);
const queries = [];
queries.push({ seg: 0, off: 0 });
queries.push({ seg: 0, off: data - 1 });
queries.push({ seg: 0, off: data });
queries.push({ seg: 1, off: 0 });
queries.push({ seg: 1, off: bss - 1 });
queries.push({ seg: 1, off: bss });
for (let k = 0; k < 494; k++) {
  const seg = rng.int(0, 1);
  const size = seg === 0 ? data : bss;
  queries.push({ seg, off: rng.int(0, size + 8) });
}

const input = `${objects.length} ${queries.length}\n`
  + objects.map((o) => `${o.name} ${o.size} ${o.align} ${o.init}`).join('\n') + '\n'
  + queries.map((q) => `${q.seg === 0 ? 'data' : 'bss'} ${q.off}`).join('\n') + '\n';

cases.push({
  kind: 'boundary',
  category: '1000 个随机对象、500 次查询',
  input,
  output: render(objects, queries),
});

return cases;
```
