---json
{
  "id": "p-s3-stack-frame-1",
  "title": "栈帧偏移推算：返回地址、对齐填充与局部变量的落点",
  "difficulty": "L4",
  "knowledgePoints": ["s3-stack-frame"],
  "special": "memory-layout",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
32 位 x86 上一个函数的栈帧是这样的：`ebp+4` 是返回地址，`ebp+0` 是被保存的旧 `ebp`，`ebp+8` 起是参数区（每个参数占 4 字节），`ebp-1` 往下是局部变量区。

本题要求你按照下面这份**简化模型**（真实编译器还会插填充、金丝雀、红区，本题一切以这份规则为准）推算每个局部变量的偏移，并回答一串"某个偏移上是什么"的查询：

1. 局部变量按**声明顺序**依次分配，每个变量的大小 `s` ∈ {1, 2, 4, 8}，对齐要求 `a = s`（1 字节的按 1 对齐，8 字节的按 8 对齐）；
2. 分配一个变量时：先把"已占用字节数" `used` 向上取整到 `a` 的倍数（不足的部分就是对齐填充），再往下放 `s` 字节，该变量的起始偏移是 `-(used + s)`，然后 `used += s`；
3. 所有局部变量放完后，整个帧再向上取整到 **16 字节**，得到帧大小 `frame`，于是 `esp = ebp - frame`；
4. 参数区从 `ebp+8` 开始，`n` 个参数共 `4n` 字节。

## 输入格式
第一行两个整数 `n`、`m`：参数个数、局部变量个数。
第二行 `m` 个整数：每个局部变量的大小（`m = 0` 时这一行不存在）。
接下来一行一个整数 `q`。
再接下来 `q` 行，每行一个整数 `o`：要查询的偏移（相对 `ebp`，可以为负）。

## 输出格式
按下面的顺序输出：

1. `args <4n>`
2. `ret ebp+4`
3. `saved ebp+0`
4. `m` 行 `local<i> ebp<偏移> size=<大小>`，`i` 从 0 开始，偏移是负数（例如 `ebp-4`）
5. `esp ebp-<frame>`；若 `frame = 0`，输出 `esp ebp+0`
6. `q` 行 `q <o> -> <归属>`，归属按下面的规则判断（先命中先返回）：
   - `o >= 8 + 4n` → `above-args`
   - `o >= 8` → `arg<k>`，其中 `k = (o - 8) / 4`（整数除法，落在参数中间字节也算该参数）
   - `o >= 4` → `ret`
   - `o >= 0` → `saved-ebp`
   - `o < -frame` → `below-esp`
   - 否则落在某个局部变量的 `[偏移, 偏移 + 大小)` 区间里 → `local<i>`
   - 剩下的 → `pad`（对齐填充）

## 数据范围
1 ≤ n ≤ 100
0 ≤ m ≤ 100
1 ≤ q ≤ 500
每个局部变量的大小 ∈ {1, 2, 4, 8}
-1000 ≤ o ≤ 1000

帧大小最大约 100 × 8 + 15 = 815（取整到 16 后不超过 816），`o` 的范围足够触发 `above-args` 和 `below-esp`。
输出最多约 606 行，远小于 64KB。

## 示例
### 示例 1
```in
2 2
4 8
7
-4
-8
-16
12
0
4
-32
```
```out
args 8
ret ebp+4
saved ebp+0
local0 ebp-4 size=4
local1 ebp-16 size=8
esp ebp-16
q -4 -> local0
q -8 -> pad
q -16 -> local1
q 12 -> arg1
q 0 -> saved-ebp
q 4 -> ret
q -32 -> below-esp
```
> `local0` 占 `[-4, 0)`；接着分配 8 字节的 `local1`，`used` 从 4 取整到 8，于是 `local1` 占 `[-16, -8)`，`[-8, -4)` 就是 4 字节的对齐填充。帧大小 `used = 16` 已经对齐到 16，所以 `esp = ebp-16`；比 `-16` 更低的 `-32` 落在 `esp` 之下，属于 `below-esp`。

### 示例 2（边界：没有局部变量）
```in
1 0
5
-1
0
4
8
20
```
```out
args 4
ret ebp+4
saved ebp+0
esp ebp+0
q -1 -> below-esp
q 0 -> saved-ebp
q 4 -> ret
q 8 -> arg0
q 20 -> above-args
```
> `m = 0` 时没有任何局部变量，`used = 0`、`frame = 0`，所以 `esp` 和 `ebp` 重合，输出 `esp ebp+0`。此时任何负偏移都在 `esp` 之下，判 `below-esp`；`8` 是第 1 个参数的起始，`20` 超出了 `8 + 4×1 = 12` 的参数区，判 `above-args`。

## 提示
### 第 1 层
先只想一个变量：如果 `used` 是 0、大小是 4，它当然在 `ebp-4`。关键在于"先对齐、再往下放"这个顺序：对齐只看 `used`，放完才更新 `used`。

### 第 2 层
对齐可以用一行算术完成：`used = (used + a - 1) / a * a`（`a` 是 2 的幂时也可写成 `(used + a - 1) & ~(a - 1)`）。注意变量的偏移是 `-(used + size)`，而不是 `-used`：`used` 是"对齐后的起点"，变量还要再往下占 `size` 字节。

### 第 3 层
查询的判定顺序不能乱：`o >= 8` 一定要在 `o >= 4` 之前判断，否则参数区永远命中不了；负偏移要先判断 `o < -frame`（在 `esp` 之下），再在局部变量里找，最后才落到 `pad`。帧大小别忘了最后那次"向上取整到 16"。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAXM 100

int main(void) {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2 || n < 1 || n > 100 || m < 0 || m > MAXM) {
        return 0;
    }

    int size[MAXM];
    int off[MAXM];
    int used = 0;
    for (int i = 0; i < m; i++) {
        if (scanf("%d", &size[i]) != 1 || size[i] < 1 || size[i] > 8) {
            return 0;
        }
        int a = size[i];                       /* 对齐要求 = 大小 */
        used = (used + a - 1) / a * a;         /* 先向上取整到 a 的倍数 */
        off[i] = -(used + size[i]);            /* 再往下放 size 字节 */
        used += size[i];
    }
    int frame = (used + 15) / 16 * 16;         /* 整个帧对齐到 16 字节 */

    printf("args %d\n", 4 * n);
    printf("ret ebp+4\n");
    printf("saved ebp+0\n");
    for (int i = 0; i < m; i++) {
        printf("local%d ebp%d size=%d\n", i, off[i], size[i]);
    }
    if (frame > 0) {
        printf("esp ebp-%d\n", frame);
    } else {
        printf("esp ebp+0\n");
    }

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 500) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        int o;
        if (scanf("%d", &o) != 1) {
            return 0;
        }
        if (o >= 8) {
            if (o >= 8 + 4 * n) {
                printf("q %d -> above-args\n", o);
            } else {
                printf("q %d -> arg%d\n", o, (o - 8) / 4);
            }
        } else if (o >= 4) {
            printf("q %d -> ret\n", o);
        } else if (o >= 0) {
            printf("q %d -> saved-ebp\n", o);
        } else if (o < -frame) {
            printf("q %d -> below-esp\n", o);
        } else {
            int idx = -1;
            for (int i = 0; i < m; i++) {
                if (o >= off[i] && o < off[i] + size[i]) {
                    idx = i;
                    break;
                }
            }
            if (idx >= 0) {
                printf("q %d -> local%d\n", o, idx);
            } else {
                printf("q %d -> pad\n", o);
            }
        }
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAXM 100

int main(void) {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2 || n < 1 || n > 100 || m < 0 || m > MAXM) {
        return 0;
    }

    int size[MAXM];
    int off[MAXM];
    int used = 0;
    for (int i = 0; i < m; i++) {
        if (scanf("%d", &size[i]) != 1 || size[i] < 1 || size[i] > 8) {
            return 0;
        }
        used += size[i];               /* TODO: 先按 size[i] 对齐，再放 */
        off[i] = -used;                /* TODO: 偏移应该是 -(对齐后的 used + size) */
    }
    int frame = used;                  /* TODO: 帧大小要向上取整到 16 字节 */

    printf("args %d\n", 4 * n);
    printf("ret ebp+4\n");
    printf("saved ebp+0\n");
    for (int i = 0; i < m; i++) {
        printf("local%d ebp%d size=%d\n", i, off[i], size[i]);
    }
    if (frame > 0) {
        printf("esp ebp-%d\n", frame);
    } else {
        printf("esp ebp+0\n");
    }

    int q;
    if (scanf("%d", &q) != 1 || q < 1 || q > 500) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        int o;
        if (scanf("%d", &o) != 1) {
            return 0;
        }
        if (o >= 8) {
            printf("q %d -> arg%d\n", o, (o - 8) / 4);   /* TODO: 超出参数区要判 above-args */
        } else if (o >= 4) {
            printf("q %d -> ret\n", o);
        } else if (o >= 0) {
            printf("q %d -> saved-ebp\n", o);
        } else {
            int idx = -1;
            for (int i = 0; i < m; i++) {
                if (o >= off[i] && o < off[i] + size[i]) {
                    idx = i;
                    break;
                }
            }
            if (idx >= 0) {
                printf("q %d -> local%d\n", o, idx);
            } else {
                printf("q %d -> pad\n", o);   /* TODO: 比 esp 更低的偏移要判 below-esp */
            }
        }
    }
    return 0;
}
```

## 复杂度
时间 O(m + q)：布局扫一遍局部变量，每个查询扫一遍局部变量表（`m ≤ 100`、`q ≤ 500`，完全够快）。
空间 O(m)：两个定长数组。

## 常见错误
### 分配局部变量时忘记对齐 [WA]
对齐填充是本题的核心：4 字节变量之后接一个 8 字节变量，8 字节的那个必须从 8 的倍数开始，中间空出 4 字节。忘记对齐会让后面所有变量的偏移都错，`pad` 查询也会判成 `local`。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXM 100

int main(void) {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) {
        return 0;
    }
    int size[MAXM];
    int off[MAXM];
    int used = 0;
    for (int i = 0; i < m; i++) {
        if (scanf("%d", &size[i]) != 1) {
            return 0;
        }
        used += size[i];               /* 错：没有先按 size[i] 对齐 */
        off[i] = -used;
    }
    int frame = (used + 15) / 16 * 16;

    printf("args %d\n", 4 * n);
    printf("ret ebp+4\n");
    printf("saved ebp+0\n");
    for (int i = 0; i < m; i++) {
        printf("local%d ebp%d size=%d\n", i, off[i], size[i]);
    }
    if (frame > 0) {
        printf("esp ebp-%d\n", frame);
    } else {
        printf("esp ebp+0\n");
    }

    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        int o;
        if (scanf("%d", &o) != 1) {
            return 0;
        }
        if (o >= 8) {
            if (o >= 8 + 4 * n) {
                printf("q %d -> above-args\n", o);
            } else {
                printf("q %d -> arg%d\n", o, (o - 8) / 4);
            }
        } else if (o >= 4) {
            printf("q %d -> ret\n", o);
        } else if (o >= 0) {
            printf("q %d -> saved-ebp\n", o);
        } else if (o < -frame) {
            printf("q %d -> below-esp\n", o);
        } else {
            int idx = -1;
            for (int i = 0; i < m; i++) {
                if (o >= off[i] && o < off[i] + size[i]) {
                    idx = i;
                    break;
                }
            }
            if (idx >= 0) {
                printf("q %d -> local%d\n", o, idx);
            } else {
                printf("q %d -> pad\n", o);
            }
        }
    }
    return 0;
}
```

### 帧大小忘了向上取整到 16 [WA]
`esp` 必须 16 字节对齐（调用边界的要求），所以帧大小要取整到 16。少了这一步，`esp` 那一行会偏小，紧挨 `esp` 下方的偏移还会被误判成 `pad` 而不是 `below-esp`。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXM 100

int main(void) {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) {
        return 0;
    }
    int size[MAXM];
    int off[MAXM];
    int used = 0;
    for (int i = 0; i < m; i++) {
        if (scanf("%d", &size[i]) != 1) {
            return 0;
        }
        int a = size[i];
        used = (used + a - 1) / a * a;
        off[i] = -(used + size[i]);
        used += size[i];
    }
    int frame = used;                  /* 错：没有取整到 16 */

    printf("args %d\n", 4 * n);
    printf("ret ebp+4\n");
    printf("saved ebp+0\n");
    for (int i = 0; i < m; i++) {
        printf("local%d ebp%d size=%d\n", i, off[i], size[i]);
    }
    if (frame > 0) {
        printf("esp ebp-%d\n", frame);
    } else {
        printf("esp ebp+0\n");
    }

    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        int o;
        if (scanf("%d", &o) != 1) {
            return 0;
        }
        if (o >= 8) {
            if (o >= 8 + 4 * n) {
                printf("q %d -> above-args\n", o);
            } else {
                printf("q %d -> arg%d\n", o, (o - 8) / 4);
            }
        } else if (o >= 4) {
            printf("q %d -> ret\n", o);
        } else if (o >= 0) {
            printf("q %d -> saved-ebp\n", o);
        } else if (o < -frame) {
            printf("q %d -> below-esp\n", o);
        } else {
            int idx = -1;
            for (int i = 0; i < m; i++) {
                if (o >= off[i] && o < off[i] + size[i]) {
                    idx = i;
                    break;
                }
            }
            if (idx >= 0) {
                printf("q %d -> local%d\n", o, idx);
            } else {
                printf("q %d -> pad\n", o);
            }
        }
    }
    return 0;
}
```

### 查询忘了参数区的上界 [WA]
参数区是 `[8, 8+4n)`。只判断 `o >= 8` 就输出 `arg<k>`，会让 `above-args` 永远不出现——只要查询偏移超过参数区，答案就错了。`above-args` 表示"这块偏移已经在调用者的帧里"，不是本函数的任何东西。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXM 100

int main(void) {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) {
        return 0;
    }
    int size[MAXM];
    int off[MAXM];
    int used = 0;
    for (int i = 0; i < m; i++) {
        if (scanf("%d", &size[i]) != 1) {
            return 0;
        }
        int a = size[i];
        used = (used + a - 1) / a * a;
        off[i] = -(used + size[i]);
        used += size[i];
    }
    int frame = (used + 15) / 16 * 16;

    printf("args %d\n", 4 * n);
    printf("ret ebp+4\n");
    printf("saved ebp+0\n");
    for (int i = 0; i < m; i++) {
        printf("local%d ebp%d size=%d\n", i, off[i], size[i]);
    }
    if (frame > 0) {
        printf("esp ebp-%d\n", frame);
    } else {
        printf("esp ebp+0\n");
    }

    int q;
    if (scanf("%d", &q) != 1) {
        return 0;
    }
    for (int k = 0; k < q; k++) {
        int o;
        if (scanf("%d", &o) != 1) {
            return 0;
        }
        if (o >= 8) {
            printf("q %d -> arg%d\n", o, (o - 8) / 4);   /* 错：没有 above-args 分支 */
        } else if (o >= 4) {
            printf("q %d -> ret\n", o);
        } else if (o >= 0) {
            printf("q %d -> saved-ebp\n", o);
        } else if (o < -frame) {
            printf("q %d -> below-esp\n", o);
        } else {
            int idx = -1;
            for (int i = 0; i < m; i++) {
                if (o >= off[i] && o < off[i] + size[i]) {
                    idx = i;
                    break;
                }
            }
            if (idx >= 0) {
                printf("q %d -> local%d\n", o, idx);
            } else {
                printf("q %d -> pad\n", o);
            }
        }
    }
    return 0;
}
```

### 把 ebp+4 和 ebp+0 记反 [WA]
`call` 先压返回地址，函数序言再 `push ebp`，所以**返回地址在 `ebp+4`，旧的 `ebp` 在 `ebp+0`**。记反的话，`0` 和 `4` 两个偏移的查询会互换，参数区也会整体错一位。

### 8 字节变量按 4 字节对齐 [WA]
本题规定对齐要求等于变量大小：`long long`/`double` 要 8 字节对齐。如果只按 4 对齐，`used` 可能停在 4、12、20 这些位置，8 字节变量就落在非 8 倍数的偏移上，之后所有偏移和填充判断都会错。

## 测试用例
### 01 sample 示例 1
```in
2 2
4 8
7
-4
-8
-16
12
0
4
-32
```
```out
args 8
ret ebp+4
saved ebp+0
local0 ebp-4 size=4
local1 ebp-16 size=8
esp ebp-16
q -4 -> local0
q -8 -> pad
q -16 -> local1
q 12 -> arg1
q 0 -> saved-ebp
q 4 -> ret
q -32 -> below-esp
```

### 02 sample 示例 2
```in
1 0
5
-1
0
4
8
20
```
```out
args 4
ret ebp+4
saved ebp+0
esp ebp+0
q -1 -> below-esp
q 0 -> saved-ebp
q 4 -> ret
q 8 -> arg0
q 20 -> above-args
```

### 03 degenerate 只有一个 1 字节局部变量
```in
2 1
1
5
-1
-2
-4
-17
```
```out
args 8
ret ebp+4
saved ebp+0
local0 ebp-1 size=1
esp ebp-16
q -1 -> local0
q -2 -> pad
q -4 -> pad
q -17 -> below-esp
```

### 04 trap 1、2、4、8 字节依次对齐
```in
3 4
1 2 4 8
7
-1
-2
-3
-4
-8
-12
-16
```
```out
args 12
ret ebp+4
saved ebp+0
local0 ebp-1 size=1
local1 ebp-4 size=2
local2 ebp-8 size=4
local3 ebp-16 size=8
esp ebp-16
q -1 -> local0
q -2 -> pad
q -3 -> local1
q -4 -> local1
q -8 -> local2
q -12 -> local3
q -16 -> local3
```

### 05 trap 4 字节后面跟两个 8 字节变量
```in
2 3
4 8 8
7
-4
-8
-16
-17
-24
-32
-33
```
```out
args 8
ret ebp+4
saved ebp+0
local0 ebp-4 size=4
local1 ebp-16 size=8
local2 ebp-24 size=8
esp ebp-32
q -4 -> local0
q -8 -> pad
q -16 -> local1
q -17 -> local2
q -24 -> local2
q -32 -> pad
q -33 -> below-esp
```

### 06 trap 参数中间字节也算该参数
```in
4 0
5
9
11
12
23
24
```
```out
args 16
ret ebp+4
saved ebp+0
esp ebp+0
q 9 -> arg0
q 11 -> arg0
q 12 -> arg1
q 23 -> arg3
q 24 -> above-args
```

### 07 normal 混合大小与填充
```in
5 5
2 2 1 8 4
8
-2
-4
-6
-8
-12
-16
-24
-40
```
```out
args 20
ret ebp+4
saved ebp+0
local0 ebp-2 size=2
local1 ebp-4 size=2
local2 ebp-5 size=1
local3 ebp-16 size=8
local4 ebp-20 size=4
esp ebp-32
q -2 -> local0
q -4 -> local1
q -6 -> pad
q -8 -> pad
q -12 -> local3
q -16 -> local3
q -24 -> pad
q -40 -> below-esp
```

### 生成 boundary 100 个 8 字节局部变量的最大帧
```js gen
const cases = [];

function layout(n, sizes) {
  const off = [];
  let used = 0;
  for (const s of sizes) {
    used = Math.ceil(used / s) * s;
    off.push(-(used + s));
    used += s;
  }
  const frame = Math.ceil(used / 16) * 16;
  return { off, frame, size: sizes };
}

function answer(n, sizes, o) {
  const { off, frame } = layout(n, sizes);
  if (o >= 8 + 4 * n) return 'above-args';
  if (o >= 8) return `arg${Math.floor((o - 8) / 4)}`;
  if (o >= 4) return 'ret';
  if (o >= 0) return 'saved-ebp';
  if (o < -frame) return 'below-esp';
  for (let i = 0; i < sizes.length; i++) {
    if (o >= off[i] && o < off[i] + sizes[i]) return `local${i}`;
  }
  return 'pad';
}

function render(n, sizes, queries) {
  const { off, frame } = layout(n, sizes);
  const lines = [`args ${4 * n}`, 'ret ebp+4', 'saved ebp+0'];
  for (let i = 0; i < sizes.length; i++) {
    lines.push(`local${i} ebp${off[i]} size=${sizes[i]}`);
  }
  lines.push(frame > 0 ? `esp ebp-${frame}` : 'esp ebp+0');
  for (const o of queries) lines.push(`q ${o} -> ${answer(n, sizes, o)}`);
  return lines.join('\n') + '\n';
}

/* 最大规模：100 个 8 字节局部变量，帧大小 800 */
{
  const n = 100;
  const sizes = new Array(100).fill(8);
  const queries = [-800, -799, -792, -1, -808, 8, 408, 412, -1000];
  cases.push({
    kind: 'boundary',
    category: '100 个 8 字节局部变量，帧大小 800',
    input: `${n} 100\n${sizes.join(' ')}\n${queries.length}\n${queries.join('\n')}\n`,
    output: render(n, sizes, queries),
  });
}

/* 随机：60 个随机大小的局部变量 + 50 个参数 + 500 个随机查询 */
{
  const n = 50;
  const sizes = [];
  for (let i = 0; i < 60; i++) sizes.push(rng.pick([1, 2, 4, 8]));
  const queries = [];
  queries.push(-1000, 1000, 0, 4, 8, 8 + 4 * n - 1, 8 + 4 * n);
  for (let i = 0; i < 493; i++) queries.push(rng.int(-900, 900));
  cases.push({
    kind: 'normal',
    category: '60 个随机局部变量、500 次随机查询',
    input: `${n} 60\n${sizes.join(' ')}\n${queries.length}\n${queries.join('\n')}\n`,
    output: render(n, sizes, queries),
  });
}

return cases;
```
