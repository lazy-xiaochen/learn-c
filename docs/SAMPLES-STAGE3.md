# 阶段 3 样题（三道不同难度，完整题目原文）

> 与 content/problems/s3/ 下的源文件内容一致。

---

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

---

---json
{
  "id": "p-s3-recursion-visual-1",
  "title": "打印递归的每一层：帧编号、父帧与回归时的 total",
  "difficulty": "L3",
  "knowledgePoints": ["s3-recursion-visual"],
  "special": "pointer-reasoning",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
下面这个递归函数会把**每一层栈帧**打印出来：进入时打印帧编号、本层参数 `n` 和父帧编号；子调用全部返回后，再打印这一层的 `total`。

```c
static int next_id;                       /* 下一个要分配的帧编号，从 1 开始 */

static long long walk(int n, int depth, int parent) {
    int id = ++next_id;                   /* 本帧的编号 = 进入顺序 */
    printf("%*s#%d n=%d parent=%d\n", depth * 2, "", id, n, parent);
    long long total = n;
    if (n > 1) {
        total += walk(n / 2, depth + 1, id);
        total += walk(n - n / 2, depth + 1, id);
    }
    printf("%*s#%d total=%lld\n", depth * 2, "", id, total);
    return total;
}
```

`main` 里执行 `walk(n, 0, 0)`，最后再输出一行 `frames=<总帧数> root=<根返回值>`。

给定输入的 `n`，请你输出这段程序的**完整输出**（一行都不能差）。

几个必须注意的细节：

1. 缩进是 `depth * 2` 个空格，根帧（`depth = 0`）不缩进；
2. 帧编号是**进入顺序**（先序），不是返回顺序；
3. `parent` 是本帧的父帧编号，根帧的 `parent` 是 `0`；
4. `total` 要等两个子调用都返回后才定稿（后序），所以同一帧的 `total` 行在它所有子孙的行之后；
5. 两个子调用分别是 `n / 2` 和 `n - n / 2`（整数除法），`n` 是奇数时它们不相等。

## 输入格式
一行一个整数 `n`。

## 输出格式
输出该程序的完整标准输出：每个帧两行（进入、`total`），最后一行是 `frames=<总帧数> root=<根返回值>`。

## 数据范围
1 ≤ n ≤ 100
帧数最多 2n - 1 = 199，输出最多 399 行，远小于 64KB
根返回值最大约 100 × log₂100 ≈ 700，`long long` 与 `int` 都装得下，但请按 `long long` 处理

## 示例
### 示例 1
```in
5
```
```out
#1 n=5 parent=0
  #2 n=2 parent=1
    #3 n=1 parent=2
    #3 total=1
    #4 n=1 parent=2
    #4 total=1
  #2 total=4
  #5 n=3 parent=1
    #6 n=1 parent=5
    #6 total=1
    #7 n=2 parent=5
      #8 n=1 parent=7
      #8 total=1
      #9 n=1 parent=7
      #9 total=1
    #7 total=4
  #5 total=8
#1 total=17
frames=9 root=17
```
> `5` 分裂成 `2` 和 `3`（`5/2 = 2`，`5-5/2 = 3`），所以根的左子树是 `#2`（n=2），右子树是 `#5`（n=3）。`#2` 的 `total` 是 `2 + 1 + 1 = 4`，`#5` 的 `total` 是 `3 + 1 + 4 = 8`，根的 `total` 是 `5 + 4 + 8 = 17`。注意 `#2 total=4` 出现在 `#2` 的两个孩子之后，而 `#5` 的第一行在 `#2` 完结之后——这就是"先序建帧、后序定稿"。

### 示例 2（边界：n = 1，只有一帧）
```in
1
```
```out
#1 n=1 parent=0
#1 total=1
frames=1 root=1
```
> `n = 1` 不满足 `n > 1`，所以不产生子调用：只有一帧、两行。别写成"至少递归一次"。

## 提示
### 第 1 层
最稳的做法就是**照抄这段逻辑**：用全局变量 `next_id` 分配编号，参数里带上 `depth` 和 `parent`，进入时打印、递归、返回后打印 `total`。不要试图"直接推出"输出，让程序去算。

### 第 2 层
关键是三件事各自的位置：编号在**进入时**分配并立即打印；`total` 的初值是 `n`，两个子调用的返回值在**回归时**累加；父帧编号 `id` 要在递归调用时作为参数传下去（不能等回来再传）。

### 第 3 层
缩进用 `%*s`：宽度由 `depth * 2` 给出。`n` 为奇数时 `n/2` 和 `n - n/2` 不相等（比如 7 → 3 和 4），两个子树的形状会不同，帧编号也会跟着变——这正是最容易算错的地方。最后的 `frames=` 要输出 `next_id` 的最终值，不要再加 1。

## 参考代码
```c file=main.c
#include <stdio.h>

static int next_id;

static long long walk(int n, int depth, int parent) {
    int id = ++next_id;
    printf("%*s#%d n=%d parent=%d\n", depth * 2, "", id, n, parent);
    long long total = n;
    if (n > 1) {
        total += walk(n / 2, depth + 1, id);
        total += walk(n - n / 2, depth + 1, id);
    }
    printf("%*s#%d total=%lld\n", depth * 2, "", id, total);
    return total;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }
    long long root = walk(n, 0, 0);
    printf("frames=%d root=%lld\n", next_id, root);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

static int next_id;

static long long walk(int n, int depth, int parent) {
    int id = ++next_id;
    /* TODO: 输出 "#<id> n=<n> parent=<parent>"，缩进 depth * 2 个空格 */
    printf("#%d n=%d\n", id, n);
    long long total = n;
    if (n > 1) {
        walk(n / 2, depth + 1, id);
        walk(n - n / 2, depth + 1, id);
        /* TODO: 把两个子调用的返回值累加进 total */
    }
    /* TODO: 输出 "#<id> total=<total>"，缩进同样是 depth * 2 个空格 */
    printf("#%d total=%lld\n", id, total);
    return total;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }
    long long root = walk(n, 0, 0);
    printf("frames=%d root=%lld\n", next_id, root);
    return 0;
}
```

## 复杂度
时间 O(帧数) = O(n)：每个帧只打印两行，帧数约为 `2n - 1`。
空间 O(log n)：递归深度约为 `log₂ n`，最多 7 层，栈上开销可以忽略。

## 常见错误
### 把 total 在进入时就定稿 [WA]
`total` 的语义是"本帧的 n 加上两个子树的返回值"，必须在子调用返回之后才能算。如果在进入时就把 `n` 累加进一个全局变量、离开时打印那个全局变量，打印出来的就不是"本帧的 total"，而是"到目前为止所有帧的累计值"。

```c file=main.c expect=WA
#include <stdio.h>

static int next_id;
static long long running;                 /* 错：所有帧共用一份累计值 */

static long long walk(int n, int depth, int parent) {
    int id = ++next_id;
    running += n;
    printf("%*s#%d n=%d parent=%d\n", depth * 2, "", id, n, parent);
    if (n > 1) {
        walk(n / 2, depth + 1, id);
        walk(n - n / 2, depth + 1, id);
    }
    printf("%*s#%d total=%lld\n", depth * 2, "", id, running);
    return n;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    long long root = walk(n, 0, 0);
    printf("frames=%d root=%lld\n", next_id, root);
    return 0;
}
```

### 用深度当帧编号 [WA]
`#2`、`#3` 这些编号是"第几个建立的帧"，每一层都不同；用 `depth + 1` 当编号的话，同一深度的所有帧会得到同一个号，`parent` 也会全错。编号必须在进入时从全局计数器领。

```c file=main.c expect=WA
#include <stdio.h>

static long long walk(int n, int depth, int parent) {
    int id = depth + 1;                   /* 错：同一深度的帧会重号 */
    printf("%*s#%d n=%d parent=%d\n", depth * 2, "", id, n, parent);
    long long total = n;
    if (n > 1) {
        total += walk(n / 2, depth + 1, id);
        total += walk(n - n / 2, depth + 1, id);
    }
    printf("%*s#%d total=%lld\n", depth * 2, "", id, total);
    return total;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    long long root = walk(n, 0, 0);
    printf("frames=%d root=%lld\n", n, root);
    return 0;
}
```

### 把分裂写成 n - 1 [WA]
两个子调用是 `n / 2` 和 `n - n / 2`，不是 `n - 1`。写成 `n - 1` 会退化成一条线性递归：帧数变成 `n`，形状、编号、`total` 全部改变（而且 `n` 大时还会栈溢出）。

```c file=main.c expect=WA
#include <stdio.h>

static int next_id;

static long long walk(int n, int depth, int parent) {
    int id = ++next_id;
    printf("%*s#%d n=%d parent=%d\n", depth * 2, "", id, n, parent);
    long long total = n;
    if (n > 1) {
        total += walk(n - 1, depth + 1, id);   /* 错：应该是 n/2 与 n-n/2 */
    }
    printf("%*s#%d total=%lld\n", depth * 2, "", id, total);
    return total;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    long long root = walk(n, 0, 0);
    printf("frames=%d root=%lld\n", next_id, root);
    return 0;
}
```

### 想打印真实的返回地址 [WA]
`__builtin_return_address(0)` 的**数值**每次运行都可能不同（ASLR），开了 AddressSanitizer 之后更和真栈没关系。把它写进输出，判题必然无法通过，而且这种"输出"本身也没有教学价值——能依赖的只有"第几层、父帧是谁、相同/不同"这类相对量。

### 缩进量算错 [WA]
缩进是 `depth * 2` 个空格，不是 `depth` 个，也不是"每层 4 个"。差一个空格，整份输出就与预期不符——判题是逐行逐字符比较的（行末空白除外）。

## 测试用例
### 01 sample 示例 1
```in
5
```
```out
#1 n=5 parent=0
  #2 n=2 parent=1
    #3 n=1 parent=2
    #3 total=1
    #4 n=1 parent=2
    #4 total=1
  #2 total=4
  #5 n=3 parent=1
    #6 n=1 parent=5
    #6 total=1
    #7 n=2 parent=5
      #8 n=1 parent=7
      #8 total=1
      #9 n=1 parent=7
      #9 total=1
    #7 total=4
  #5 total=8
#1 total=17
frames=9 root=17
```

### 02 sample 示例 2
```in
1
```
```out
#1 n=1 parent=0
#1 total=1
frames=1 root=1
```

### 03 degenerate 两个 n=1 的孩子
```in
2
```
```out
#1 n=2 parent=0
  #2 n=1 parent=1
  #2 total=1
  #3 n=1 parent=1
  #3 total=1
#1 total=4
frames=3 root=4
```

### 04 trap 奇数分裂：7 分成 3 和 4
```in
7
```
```out
#1 n=7 parent=0
  #2 n=3 parent=1
    #3 n=1 parent=2
    #3 total=1
    #4 n=2 parent=2
      #5 n=1 parent=4
      #5 total=1
      #6 n=1 parent=4
      #6 total=1
    #4 total=4
  #2 total=8
  #7 n=4 parent=1
    #8 n=2 parent=7
      #9 n=1 parent=8
      #9 total=1
      #10 n=1 parent=8
      #10 total=1
    #8 total=4
    #11 n=2 parent=7
      #12 n=1 parent=11
      #12 total=1
      #13 n=1 parent=11
      #13 total=1
    #11 total=4
  #7 total=12
#1 total=27
frames=13 root=27
```

### 生成 boundary 最大规模 n = 100
```js gen
function trace(n) {
  let id = 0;
  const lines = [];
  function walk(x, depth, parent) {
    const my = ++id;
    const pad = ' '.repeat(depth * 2);
    lines.push(`${pad}#${my} n=${x} parent=${parent}`);
    let total = x;
    if (x > 1) {
      total += walk(Math.floor(x / 2), depth + 1, my);
      total += walk(x - Math.floor(x / 2), depth + 1, my);
    }
    lines.push(`${pad}#${my} total=${total}`);
    return total;
  }
  const root = walk(n, 0, 0);
  lines.push(`frames=${id} root=${root}`);
  return lines.join('\n') + '\n';
}
return [{
  kind: 'boundary',
  category: 'n = 100，最大帧数 199',
  input: '100\n',
  output: trace(100),
}];
```

### 生成 trap n = 99 与 n = 65 的奇数分裂
```js gen
function trace(n) {
  let id = 0;
  const lines = [];
  function walk(x, depth, parent) {
    const my = ++id;
    const pad = ' '.repeat(depth * 2);
    lines.push(`${pad}#${my} n=${x} parent=${parent}`);
    let total = x;
    if (x > 1) {
      total += walk(Math.floor(x / 2), depth + 1, my);
      total += walk(x - Math.floor(x / 2), depth + 1, my);
    }
    lines.push(`${pad}#${my} total=${total}`);
    return total;
  }
  const root = walk(n, 0, 0);
  lines.push(`frames=${id} root=${root}`);
  return lines.join('\n') + '\n';
}
return [99, 65].map((n) => ({
  kind: 'trap',
  category: `n = ${n}，n/2 与 n-n/2 不相等`,
  input: `${n}\n`,
  output: trace(n),
}));
```

### 生成 normal 随机 n
```js gen
function trace(n) {
  let id = 0;
  const lines = [];
  function walk(x, depth, parent) {
    const my = ++id;
    const pad = ' '.repeat(depth * 2);
    lines.push(`${pad}#${my} n=${x} parent=${parent}`);
    let total = x;
    if (x > 1) {
      total += walk(Math.floor(x / 2), depth + 1, my);
      total += walk(x - Math.floor(x / 2), depth + 1, my);
    }
    lines.push(`${pad}#${my} total=${total}`);
    return total;
  }
  const root = walk(n, 0, 0);
  lines.push(`frames=${id} root=${root}`);
  return lines.join('\n') + '\n';
}
const cases = [];
for (let k = 0; k < 3; k++) {
  const n = rng.int(3, 100);
  cases.push({
    kind: 'normal',
    category: `随机 n = ${n}`,
    input: `${n}\n`,
    output: trace(n),
  });
}
return cases;
```

---

---json
{
  "id": "p-s3-extern-multifile-1",
  "title": "修复链接失败的三文件统计工程：总额、平均值与大额笔数",
  "difficulty": "L3",
  "knowledgePoints": ["s3-extern-multifile"],
  "special": "link-diagnosis",
  "judge": { "mode": "multi", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
运营同学交给你一个由三个文件组成的小工程：

- `stats.h`：统计模块对外的接口——一个 `extern` 常量、三个函数声明；
- `stats.c`：这些函数和常量的**定义**；
- `main.c`：读入数据、调用模块、打印结果。

可是这个工程**链接失败**了。请先读编译器的报错，判断问题出在哪个文件、哪个环节，再动手修。三个文件都可以改，提交时全部参与编译。

### 先分清两种"重复/缺失"的错误
C 工程里最容易混淆的两个错误，看报错的第一行就能区分：

| 报错 | 阶段 | 含义 | 常见原因 |
|---|---|---|---|
| `undefined reference to 'stats_avg'`（GCC/ld）<br>`undefined symbol: stats_avg`（LLVM/lld） | **链接** | 有地方声明并使用了 `stats_avg`，但所有目标文件里都没有它的定义 | 函数只声明没定义、名字拼错、定义所在的 `.c` 没参与编译 |
| `multiple definition of 'x'`（GCC/ld）<br>`duplicate symbol: x`（LLVM/lld） | **链接** | 有两个或更多目标文件都提供了 `x` 的定义 | 变量/函数定义写进了头文件、同一个 `.c` 被编译了两次 |

还有一类报错发生在**编译**阶段（`redefinition of 'x'`）：同一个 `.c` 文件里出现了两份定义，通常是头文件没有卫士、被包含了两次。本题的初始代码属于哪一种？先跑一次看看。

### 这个模块要做什么
一天有 `n` 笔订单，每笔金额是一个非负整数。统计三件事：

- `sum`：总额；
- `avg`：平均每笔金额（**向下取整**的整数）；
- `top`：大额订单笔数，即金额 **大于等于** 门槛 `STATS_TOP` 的笔数（门槛由 `stats.c` 定义成 10000，`main.c` 通过头文件里的 `extern` 声明使用它）。

## 输入格式
第一行一个整数 `n`。
第二行 `n` 个整数，依次表示每笔订单的金额，用空格分隔。

## 输出格式
输出三行：

```
sum=总额
avg=平均每笔金额（向下取整）
top=大额订单笔数
```

## 数据范围
1 ≤ n ≤ 100000
0 ≤ 每笔金额 ≤ 1000000000

总额最大为 10⁵ × 10⁹ = 10¹⁴，超过 `int` 的范围，必须用 `long long` 保存。平均值不会超过 10⁹，但它是从总额算出来的，所以也沿着 `long long` 走。

## 示例
### 示例 1
```in
5
500 20000 3000 10000 0
```
```out
sum=33500
avg=6700
top=2
```
> 总额 500 + 20000 + 3000 + 10000 + 0 = 33500，平均 33500 / 5 = 6700（整除正好）。大于等于 10000 的有 20000 和 10000 两笔，所以 `top=2`。

### 示例 2（边界：只有一笔金额为 0 的订单）
```in
1
0
```
```out
sum=0
avg=0
top=0
```
> `n = 1` 时平均值就是这一笔本身。总额 0 是合法的，不要把它当成"没读到数据"。初始代码在这里会直接链接失败，修好之后这三行才是正确答案。

## 提示
### 第 1 层
先编译一次，把报错信息从头读到尾。它是 `undefined reference`、`duplicate symbol`，还是 `redefinition`？这三个词分别指向链接阶段"少了定义"、链接阶段"多了定义"、编译阶段"同一个文件里出现了两次定义"，处理方式完全不同。

### 第 2 层
`undefined reference to 'stats_avg'` 的意思是：`main.c` 声明并调用了 `stats_avg`，但链接器在所有目标文件里都找不到它。去 `stats.h` 看声明的名字，再去 `stats.c` 看定义的名字，逐个字母对照——它们并不一样。

### 第 3 层
修好名字之后还有两个坑：

1. `stats_sum` 里的累加变量必须是 `long long`：10 万笔 × 10 亿 = 10¹⁴，用 `int` 会溢出（未定义行为）；
2. 大额判断是 `a[i] >= STATS_TOP`，写成 `>` 会漏掉金额恰好等于门槛的订单；
3. `STATS_TOP` 的定义（`const int STATS_TOP = 10000;`）只能出现在一个 `.c` 里，头文件里那行是 `extern const int STATS_TOP;` —— 两者不能互换位置。

## 参考代码
```c file=stats.h
#ifndef STATS_H
#define STATS_H

/* 数组容量：数组长度必须是编译期常量，所以用宏 */
#define STATS_CAP 100000

/* 大额门槛：这里只是声明，定义在 stats.c 里 */
extern const int STATS_TOP;

/* 函数声明：定义都在 stats.c 里 */
long long stats_sum(const int *a, int n);
long long stats_avg(const int *a, int n);
int stats_top_count(const int *a, int n);

#endif
```

```c file=stats.c
#include "stats.h"

const int STATS_TOP = 10000;      /* 全工程唯一的一份定义 */

long long stats_sum(const int *a, int n) {
    long long s = 0;              /* 总额最大 10^14，必须用 long long */
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

long long stats_avg(const int *a, int n) {
    return stats_sum(a, n) / n;   /* 金额非负，整除就是向下取整 */
}

int stats_top_count(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] >= STATS_TOP) {  /* 恰好等于门槛也算大额 */
            c++;
        }
    }
    return c;
}
```

```c file=main.c
#include <stdio.h>
#include "stats.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > STATS_CAP) {
        return 0;
    }

    int a[STATS_CAP];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    printf("sum=%lld\n", stats_sum(a, n));
    printf("avg=%lld\n", stats_avg(a, n));
    printf("top=%d\n", stats_top_count(a, n));
    return 0;
}
```

## 初始代码
```c file=stats.h
#ifndef STATS_H
#define STATS_H

/* 数组容量：数组长度必须是编译期常量，所以用宏 */
#define STATS_CAP 100000

/* 大额门槛：这里只是声明，定义在 stats.c 里 */
extern const int STATS_TOP;

/* 函数声明：定义都在 stats.c 里 */
long long stats_sum(const int *a, int n);
long long stats_avg(const int *a, int n);
int stats_top_count(const int *a, int n);

#endif
```

```c file=stats.c
#include "stats.h"

const int STATS_TOP = 10000;

long long stats_sum(const int *a, int n) {
    int s = 0;                    /* TODO: 总额可能到 10^14，int 装不下 */
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

long long stats_average(const int *a, int n) {   /* TODO: 头文件里声明的名字是 stats_avg */
    return stats_sum(a, n) / n;
}

int stats_top_count(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] >= STATS_TOP) {
            c++;
        }
    }
    return c;
}
```

```c file=main.c
#include <stdio.h>
#include "stats.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > STATS_CAP) {
        return 0;
    }

    int a[STATS_CAP];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    printf("sum=%lld\n", stats_sum(a, n));
    printf("avg=%lld\n", stats_avg(a, n));
    printf("top=%d\n", stats_top_count(a, n));
    return 0;
}
```

## 复杂度
时间 O(n)：`stats_sum` 和 `stats_top_count` 各扫一遍数组，`stats_avg` 复用 `stats_sum` 再扫一遍。
空间 O(n)：`int a[100000]` 约占 400KB（栈上）。

三个文件的分工本身就是本节的重点：**声明集中在头文件、定义集中在 `.c`、使用者只依赖头文件**。这样以后要换掉 `stats.c` 的实现，`main.c` 一行都不用改。

## 常见错误
### 改对了名字，累加变量却还是 int [UB]
链接通过、示例也过，但 10 万笔 × 10 亿的数据会让 `int s` 溢出。有符号整数溢出是未定义行为，本平台的 UBSan 会报 `signed integer overflow` 并判 `UB`。`stats_sum` 的返回类型是 `long long`，累加变量也必须是 `long long`——返回类型不会自动把中间结果"提升"成 64 位。

```c file=stats.c expect=UB
#include "stats.h"

const int STATS_TOP = 10000;

long long stats_sum(const int *a, int n) {
    int s = 0;                    /* 错：10 万 × 10 亿 = 10^14 */
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

long long stats_avg(const int *a, int n) {
    return stats_sum(a, n) / n;
}

int stats_top_count(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] >= STATS_TOP) {
            c++;
        }
    }
    return c;
}
```

### 大额判断写成 > [WA]
门槛是包含在内的：金额恰好等于 10000 的订单也算大额。写成 `a[i] > STATS_TOP` 会少算这一笔，只有在恰好等于门槛的数据上才暴露。
```c file=stats.c expect=WA
#include "stats.h"

const int STATS_TOP = 10000;

long long stats_sum(const int *a, int n) {
    long long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}

long long stats_avg(const int *a, int n) {
    return stats_sum(a, n) / n;
}

int stats_top_count(const int *a, int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] > STATS_TOP) {   /* 错：应为 >= */
            c++;
        }
    }
    return c;
}
```

### 把常量的定义搬回头文件 [CE]
`extern const int STATS_TOP;` 改回 `const int STATS_TOP = 10000;`，`stats.c` 里又保留了一份定义——于是 `stats.c` 这个翻译单元里出现了两份定义，编译直接失败（`redefinition of 'STATS_TOP'`）。如果 `stats.c` 里没有那份定义，则会变成链接期的 `duplicate symbol`：因为每个包含头文件的 `.c` 都会各自定义一份。**声明可以和很多文件共享，定义只能有一份。**

```c file=stats.h expect=CE
#ifndef STATS_H
#define STATS_H

#define STATS_CAP 100000

const int STATS_TOP = 10000;      /* 错：头文件里定义，stats.c 里又定义一次 */

long long stats_sum(const int *a, int n);
long long stats_avg(const int *a, int n);
int stats_top_count(const int *a, int n);

#endif
```

### 只改 main.c 的调用名，不改 stats.c 的定义 [CE]
把 `main.c` 里的 `stats_avg(...)` 改成 `stats_average(...)`，看起来"对上了"，但 `stats.h` 里没有 `stats_average` 的声明，C99 之后调用未声明的函数是编译错误（`implicit declaration of function`）。声明、定义、调用三处的名字必须一致。

## 测试用例
### 01 sample 示例 1
```in
5
500 20000 3000 10000 0
```
```out
sum=33500
avg=6700
top=2
```

### 02 sample 示例 2
```in
1
0
```
```out
sum=0
avg=0
top=0
```

### 03 boundary 三笔十亿，总额超过 int
```in
3
1000000000 1000000000 1000000000
```
```out
sum=3000000000
avg=1000000000
top=3
```

### 04 degenerate 只有一笔小额
```in
1
7
```
```out
sum=7
avg=7
top=0
```

### 05 trap 恰好等于门槛的一笔必须算大额
```in
3
9999 10000 10001
```
```out
sum=30000
avg=10000
top=2
```

### 06 trap 全部低于门槛
```in
4
0 1 2 3
```
```out
sum=6
avg=1
top=0
```

### 07 normal 正数混合
```in
6
100000 25000 5000 0 19999 20001
```
```out
sum=170000
avg=28333
top=4
```

### 08 trap 全零
```in
3
0 0 0
```
```out
sum=0
avg=0
top=0
```

### 09 normal 两笔相差悬殊
```in
2
1000000000 0
```
```out
sum=1000000000
avg=500000000
top=1
```

### 10 normal 门槛上下各一笔
```in
2
10000 9999
```
```out
sum=19999
avg=9999
top=1
```

### 生成 boundary 最大规模与随机数据
```js gen
const cases = [];

/* 最大规模：50000 笔 10 亿，总额 5×10^13（输入约 550KB） */
const n1 = 50000;
const v1 = new Array(n1).fill(1000000000);
cases.push({
  kind: 'boundary',
  category: '50000 笔 10 亿，总额 5×10^13',
  input: `${n1}\n${v1.join(' ')}\n`,
  output: `sum=${50000 * 1000000000}\navg=1000000000\ntop=${n1}\n`,
});

/* 全部恰好等于门槛，top 必须等于 n */
const n2 = 20000;
const v2 = new Array(n2).fill(10000);
cases.push({
  kind: 'trap',
  category: '20000 笔恰好等于门槛 10000',
  input: `${n2}\n${v2.join(' ')}\n`,
  output: `sum=${n2 * 10000}\navg=10000\ntop=${n2}\n`,
});

/* 压力：50000 个随机金额，期望值在 JS 里独立计算 */
const n3 = 50000;
const v3 = [];
let sum = 0;
let top = 0;
for (let i = 0; i < n3; i++) {
  const x = rng.int(0, 1000000000);
  v3.push(x);
  sum += x;
  if (x >= 10000) top++;
}
cases.push({
  kind: 'stress',
  category: '50000 个 0…10 亿的随机金额',
  input: `${n3}\n${v3.join(' ')}\n`,
  output: `sum=${sum}\navg=${(sum - (sum % n3)) / n3}\ntop=${top}\n`,
});

return cases;
```
