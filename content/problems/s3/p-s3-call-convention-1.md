---json
{
  "id": "p-s3-call-convention-1",
  "title": "cdecl 栈布局推算器：参数落点、槽大小与栈清理",
  "difficulty": "L4",
  "knowledgePoints": ["s3-call-convention"],
  "special": "memory-layout",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
32 位 x86 的 `cdecl` 调用约定里，参数全部走栈。本题要求你按照下面这份**简化模型**（真实 ABI 的对齐细节因平台而异，本题一切以这份规则为准）推算布局并打印出来：

1. 实参**从右往左**压栈：最后声明的参数最先压入；
2. 每个实参占 `slot` 字节，`slot = 把 sizeof 向上取整到 4 的倍数`（`char`/`short` 也占 4 字节，`long long` 占 8 字节）；
3. 参数压完后执行 `call`，压入 4 字节返回地址；被调用者再 `push ebp; mov ebp, esp`；
4. 于是：返回地址在 `ebp+4`，第 1 个参数（最先声明的那个，最后压入）在 `ebp+8`，后面依次向高地址排列；
5. 被调用者的局部变量从 `ebp-4` 开始向低地址分配，每个占 4 字节，共 `4 × m` 字节；
6. **谁清理栈由调用约定决定**：`cdecl` 由调用者清理（`caller`），`stdcall` 由被调用者清理（`callee`）。两者的**参数布局完全相同**。

请你输出这个函数的"栈地图"：压栈顺序、返回地址、每个参数的偏移与槽大小、参数区总字节数、局部变量区大小、`esp` 相对 `ebp` 的位置，以及由谁清理栈。

## 输入格式
第一行三个部分：`n`（参数个数）、`m`（局部变量个数）、`conv`（`cdecl` 或 `stdcall`），用空格分隔。
第二行 `n` 个整数，依次是第 1 个到第 `n` 个参数的 `sizeof`。

## 输出格式
按下面的顺序输出，每行一条：

1. `conv <cdecl|stdcall>`
2. `cleanup <caller|callee>`
3. `n` 行 `push p<i>`，按**压栈顺序**（`p` 的下标从 `n-1` 递减到 `0`）
4. `ret ebp+4`
5. `n` 行 `p<i> ebp+<偏移> slot=<槽大小>`，按**偏移从小到大**（也就是下标从 `0` 递增到 `n-1`）
6. `args <参数区总字节数>`
7. `locals <局部变量区字节数>`
8. `esp ebp-<局部变量区字节数>`；若 `m = 0`，输出 `esp ebp+0`

## 数据范围
1 ≤ n ≤ 500
0 ≤ m ≤ 100
每个参数的 `sizeof` ∈ {1, 2, 4, 8}
`conv` 只可能是 `cdecl` 或 `stdcall`

参数区总字节数最大 500 × 8 = 4000，`int` 足够。
输出最多约 1006 行，远小于 64KB 的输出上限。

## 示例
### 示例 1
```in
3 2 cdecl
4 8 4
```
```out
conv cdecl
cleanup caller
push p2
push p1
push p0
ret ebp+4
p0 ebp+8 slot=4
p1 ebp+12 slot=8
p2 ebp+20 slot=4
args 16
locals 8
esp ebp-8
```
> `p2` 先压（落点最高），`p0` 最后压，紧贴返回地址，所以 `p0` 在 `ebp+8`。槽大小是 4、8、4，所以 `p0` 占 `8..11`，`p1` 占 `12..19`，`p2` 从 `20` 开始。参数区共 16 字节，`ebp+4` 是返回地址，因此整个参数区正好覆盖 `ebp+8` 到 `ebp+23`。

### 示例 2（边界：一个 char 参数、没有局部变量）
```in
1 0 stdcall
1
```
```out
conv stdcall
cleanup callee
push p0
ret ebp+4
p0 ebp+8 slot=4
args 4
locals 0
esp ebp+0
```
> `sizeof(char)` 是 1，但栈上的槽是 4 字节，所以 `slot=4`、参数区 4 字节。没有局部变量时，`esp` 和 `ebp` 重合，输出 `esp ebp+0`（而不是 `ebp-0`）。`stdcall` 只改变清理者，布局和 `cdecl` 一模一样。

## 提示
### 第 1 层
先别管输出格式，拿纸画一画 `f(10, 20, 30)` 的压栈过程：`c` 先压，落在最高地址；`a` 最后压，紧贴返回地址。把"偏移从 `ebp+8` 开始"当成已知条件。

### 第 2 层
槽大小不是 `sizeof` 本身，而是"向上取整到 4 的倍数"：`(size + 3) / 4 * 4`。每个参数的起始偏移 = 前一个参数的起始偏移 + 前一个参数的槽大小。用一次循环累加就能算完。

### 第 3 层
用两个循环分别负责"压栈顺序"和"布局顺序"：压栈顺序是**下标递减**，布局顺序是**偏移递增**（也就是下标递增），别写成同一个循环。`cleanup` 只跟 `conv` 有关（`cdecl` → `caller`），与参数、局部变量都无关；`m = 0` 时别忘了 `esp ebp+0` 这个特例。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAXN 500

int main(void) {
    int n, m;
    char conv[16];
    if (scanf("%d %d %15s", &n, &m, conv) != 3 || n < 1 || n > MAXN || m < 0 || m > 100) {
        return 0;
    }

    int sizes[MAXN];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &sizes[i]) != 1 || sizes[i] < 1 || sizes[i] > 8) {
            return 0;
        }
    }

    int slots[MAXN];
    int total = 0;
    for (int i = 0; i < n; i++) {
        slots[i] = (sizes[i] + 3) / 4 * 4;   /* 槽大小：向上取整到 4 的倍数 */
        total += slots[i];
    }

    int is_cdecl = (conv[0] == 'c');

    printf("conv %s\n", is_cdecl ? "cdecl" : "stdcall");
    printf("cleanup %s\n", is_cdecl ? "caller" : "callee");

    /* 压栈：从右往左，最后声明的参数先压 */
    for (int i = n - 1; i >= 0; i--) {
        printf("push p%d\n", i);
    }

    printf("ret ebp+4\n");

    /* 布局：第一个参数紧贴返回地址，之后按声明顺序向高地址排 */
    int off = 8;
    for (int i = 0; i < n; i++) {
        printf("p%d ebp+%d slot=%d\n", i, off, slots[i]);
        off += slots[i];
    }

    printf("args %d\n", total);
    printf("locals %d\n", 4 * m);
    if (m > 0) {
        printf("esp ebp-%d\n", 4 * m);
    } else {
        printf("esp ebp+0\n");
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAXN 500

int main(void) {
    int n, m;
    char conv[16];
    if (scanf("%d %d %15s", &n, &m, conv) != 3 || n < 1 || n > MAXN || m < 0 || m > 100) {
        return 0;
    }

    int sizes[MAXN];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &sizes[i]) != 1 || sizes[i] < 1 || sizes[i] > 8) {
            return 0;
        }
    }

    printf("conv %s\n", conv[0] == 'c' ? "cdecl" : "stdcall");
    printf("cleanup caller\n");            /* TODO: stdcall 应该由被调用者清理 */

    for (int i = n - 1; i >= 0; i--) {
        printf("push p%d\n", i);
    }

    printf("ret ebp+4\n");

    /* TODO: 槽大小要向上取整到 4 的倍数，然后从 ebp+8 开始累加 */
    for (int i = 0; i < n; i++) {
        printf("p%d ebp+%d slot=%d\n", i, 8 + 4 * i, 4);
    }

    printf("args %d\n", 4 * n);            /* TODO: 8 字节参数要占两个槽 */
    printf("locals %d\n", 4 * m);
    if (m > 0) {
        printf("esp ebp-%d\n", 4 * m);
    } else {
        printf("esp ebp+0\n");
    }
    return 0;
}
```

## 复杂度
时间 O(n)：扫一遍参数算槽大小，再扫一遍打印布局。
空间 O(n)：存每个参数的 `sizeof` 和槽大小（`n ≤ 500`，用固定数组即可，不必 `malloc`）。

## 常见错误
### 槽大小直接等于 sizeof [WA]
`char` 参数在 32 位栈上照样占 4 字节。如果让每个参数只占 `sizeof` 字节，后续所有参数的偏移都会偏小，`char` 越多错得越离谱。正确写法是 `(size + 3) / 4 * 4`。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXN 500

int main(void) {
    int n, m;
    char conv[16];
    if (scanf("%d %d %15s", &n, &m, conv) != 3) {
        return 0;
    }
    int sizes[MAXN];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &sizes[i]) != 1) {
            return 0;
        }
    }

    int total = 0;
    for (int i = 0; i < n; i++) {
        total += sizes[i];                  /* 错：没有向上取整到 4 字节 */
    }

    printf("conv %s\n", conv[0] == 'c' ? "cdecl" : "stdcall");
    printf("cleanup %s\n", conv[0] == 'c' ? "caller" : "callee");
    for (int i = n - 1; i >= 0; i--) {
        printf("push p%d\n", i);
    }
    printf("ret ebp+4\n");
    int off = 8;
    for (int i = 0; i < n; i++) {
        printf("p%d ebp+%d slot=%d\n", i, off, sizes[i]);
        off += sizes[i];
    }
    printf("args %d\n", total);
    printf("locals %d\n", 4 * m);
    if (m > 0) {
        printf("esp ebp-%d\n", 4 * m);
    } else {
        printf("esp ebp+0\n");
    }
    return 0;
}
```

### 把 stdcall 当成"从左往右压栈" [WA]
`stdcall` 与 `cdecl` 的唯一区别是**谁清理栈**。压栈顺序、参数偏移、参数区大小完全一致。写成"stdcall 反向压栈"会让 `push` 行和整张布局表全错。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXN 500

int main(void) {
    int n, m;
    char conv[16];
    if (scanf("%d %d %15s", &n, &m, conv) != 3) {
        return 0;
    }
    int sizes[MAXN];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &sizes[i]) != 1) {
            return 0;
        }
    }

    int slots[MAXN];
    int total = 0;
    for (int i = 0; i < n; i++) {
        slots[i] = (sizes[i] + 3) / 4 * 4;
        total += slots[i];
    }
    int is_cdecl = (conv[0] == 'c');

    printf("conv %s\n", is_cdecl ? "cdecl" : "stdcall");
    printf("cleanup %s\n", is_cdecl ? "caller" : "callee");

    if (is_cdecl) {
        for (int i = n - 1; i >= 0; i--) {
            printf("push p%d\n", i);
        }
    } else {
        for (int i = 0; i < n; i++) {       /* 错：stdcall 也是从右往左压 */
            printf("push p%d\n", i);
        }
    }

    printf("ret ebp+4\n");
    int off = 8;
    for (int i = 0; i < n; i++) {
        printf("p%d ebp+%d slot=%d\n", i, off, slots[i]);
        off += slots[i];
    }
    printf("args %d\n", total);
    printf("locals %d\n", 4 * m);
    if (m > 0) {
        printf("esp ebp-%d\n", 4 * m);
    } else {
        printf("esp ebp+0\n");
    }
    return 0;
}
```

### 槽大小忘了乘回去：8 字节参数只占一个槽 [WA]
`long long` 在 32 位栈上占 8 字节，也就是**两个槽**。只占一个槽的话，后面所有参数的偏移都会少 4 字节。判断依据是 `(size + 3) / 4 * 4`：`8` 得到 `8`，`1` 得到 `4`。

### 把 cleanup 和布局绑在一起 [WA]
`cleanup` 只取决于 `conv`：`cdecl` → `caller`，`stdcall` → `callee`。它和参数个数、槽大小、局部变量都没有关系。反过来，`esp` 的位置只取决于局部变量区大小 `4m`，和 `conv` 无关。两个维度不要串。

### 忘记 m = 0 的特例 [WA]
输出要求 `esp ebp-<4m>`，但 `m = 0` 时 `4m = 0`，写 `ebp-0` 就不符合格式。题目规定这种情况输出 `esp ebp+0`。边界用例专门抓这个。

## 测试用例
### 01 sample 示例 1
```in
3 2 cdecl
4 8 4
```
```out
conv cdecl
cleanup caller
push p2
push p1
push p0
ret ebp+4
p0 ebp+8 slot=4
p1 ebp+12 slot=8
p2 ebp+20 slot=4
args 16
locals 8
esp ebp-8
```

### 02 sample 示例 2
```in
1 0 stdcall
1
```
```out
conv stdcall
cleanup callee
push p0
ret ebp+4
p0 ebp+8 slot=4
args 4
locals 0
esp ebp+0
```

### 03 degenerate 只有一个 8 字节参数、没有局部变量
```in
1 0 cdecl
8
```
```out
conv cdecl
cleanup caller
push p0
ret ebp+4
p0 ebp+8 slot=8
args 8
locals 0
esp ebp+0
```

### 04 trap 1、2 字节的参数也要占满 4 字节的槽
```in
4 1 cdecl
1 2 8 1
```
```out
conv cdecl
cleanup caller
push p3
push p2
push p1
push p0
ret ebp+4
p0 ebp+8 slot=4
p1 ebp+12 slot=4
p2 ebp+16 slot=8
p3 ebp+24 slot=4
args 20
locals 4
esp ebp-4
```

### 05 trap stdcall 的布局必须和 cdecl 完全相同
```in
4 1 stdcall
1 2 8 1
```
```out
conv stdcall
cleanup callee
push p3
push p2
push p1
push p0
ret ebp+4
p0 ebp+8 slot=4
p1 ebp+12 slot=4
p2 ebp+16 slot=8
p3 ebp+24 slot=4
args 20
locals 4
esp ebp-4
```

### 06 boundary 局部变量拉满 100 个
```in
2 100 cdecl
4 8
```
```out
conv cdecl
cleanup caller
push p1
push p0
ret ebp+4
p0 ebp+8 slot=4
p1 ebp+12 slot=8
args 12
locals 400
esp ebp-400
```

### 07 normal 混合大小的六个参数
```in
6 3 cdecl
4 1 8 2 4 8
```
```out
conv cdecl
cleanup caller
push p5
push p4
push p3
push p2
push p1
push p0
ret ebp+4
p0 ebp+8 slot=4
p1 ebp+12 slot=4
p2 ebp+16 slot=8
p3 ebp+24 slot=4
p4 ebp+28 slot=4
p5 ebp+32 slot=8
args 32
locals 12
esp ebp-12
```

### 08 trap 全是 8 字节参数，偏移每次加 8
```in
3 0 cdecl
8 8 8
```
```out
conv cdecl
cleanup caller
push p2
push p1
push p0
ret ebp+4
p0 ebp+8 slot=8
p1 ebp+16 slot=8
p2 ebp+24 slot=8
args 24
locals 0
esp ebp+0
```

### 生成 stress 500 个参数加 100 个局部变量的最大规模
```js gen
const cases = [];

/* 最大规模：500 个 8 字节参数 + 100 个局部变量 */
{
  const n = 500;
  const m = 100;
  const sizes = new Array(n).fill(8);
  let lines = [];
  lines.push('conv cdecl');
  lines.push('cleanup caller');
  for (let i = n - 1; i >= 0; i--) lines.push(`push p${i}`);
  lines.push('ret ebp+4');
  let off = 8;
  for (let i = 0; i < n; i++) {
    lines.push(`p${i} ebp+${off} slot=8`);
    off += 8;
  }
  lines.push(`args ${8 * n}`);
  lines.push(`locals ${4 * m}`);
  lines.push(`esp ebp-${4 * m}`);
  cases.push({
    kind: 'boundary',
    category: '500 个 8 字节参数、100 个局部变量',
    input: `${n} ${m} cdecl\n${sizes.join(' ')}\n`,
    output: lines.join('\n') + '\n',
  });
}

/* 随机规模：抽查大量槽大小组合，期望输出在这里独立算出 */
{
  const n = 137;
  const m = 42;
  const sizes = [];
  let lines = [];
  lines.push('conv stdcall');
  lines.push('cleanup callee');
  for (let i = 0; i < n; i++) {
    sizes.push(rng.pick([1, 2, 4, 8]));
  }
  for (let i = n - 1; i >= 0; i--) lines.push(`push p${i}`);
  lines.push('ret ebp+4');
  let off = 8;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const slot = Math.ceil(sizes[i] / 4) * 4;
    lines.push(`p${i} ebp+${off} slot=${slot}`);
    off += slot;
    total += slot;
  }
  lines.push(`args ${total}`);
  lines.push(`locals ${4 * m}`);
  lines.push(`esp ebp-${4 * m}`);
  cases.push({
    kind: 'normal',
    category: '137 个随机大小参数、42 个局部变量、stdcall',
    input: `${n} ${m} stdcall\n${sizes.join(' ')}\n`,
    output: lines.join('\n') + '\n',
  });
}

return cases;
```
