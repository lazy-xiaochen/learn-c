---json
{
  "id": "p-s5-stack-vs-heap-2",
  "title": "内存占用剖析：函数调用的栈峰值与 malloc 的堆峰值",
  "difficulty": "L2",
  "knowledgePoints": ["s5-stack-vs-heap"],
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
性能分析工具从一段程序里采集到一串内存事件，想让你根据这份日志算出：

- **栈**：函数调用时压入一帧，返回时弹出；栈占用是"当前所有未返回帧的字节数之和"；
- **堆**：`alloc` 申请一块堆内存，`free` 归还；堆占用是"当前所有未释放块的字节数之和"。

请分别统计栈和堆的**历史峰值**与**结束时仍占用的字节数**，并列出结束时还没有释放的堆块（泄漏）。

两类内存的关键差别正是本题的核心：

- 栈帧在 `ret` 时**自动**弹出，不需要也不能单独释放某一帧，所以栈的峰值只能靠"调用时累加、返回时减去"来算；
- 堆块只有在 `free` 时才归还，`ret` 不会影响它，所以堆的峰值和泄漏要单独记账。

## 输入格式
第一行一个整数 `n`：事件数（可以为 0）。

接下来 `n` 行，每行一个事件：

```
call <bytes>
ret
alloc <id> <bytes>
free <id>
```

- `call`：进入一个函数，该函数的栈帧占 `bytes` 字节；
- `ret`：当前函数返回，弹出最近一次 `call` 压入的帧；
- `alloc`：申请一块 `bytes` 字节的堆内存，编号为 `id`；
- `free`：释放编号为 `id` 的堆块。

输入保证：`ret` 不会多于 `call`；每个 `id` 只被 `alloc` 一次；`free` 的 `id` 一定是一个尚未释放的堆块。

## 输出格式
输出五行：

```
stack-peak=<栈历史峰值>
stack-now=<结束时栈占用>
heap-peak=<堆历史峰值>
heap-now=<结束时堆占用>
leak=<泄漏块数> <泄漏总字节数>
```

`leak` 统计所有 `alloc` 过、但到结束都没有 `free` 的块。

## 数据范围
- 0 ≤ n ≤ 100000
- 1 ≤ bytes ≤ 1000000
- 1 ≤ id ≤ n
- 栈峰值最大约 100000 × 10⁶ = 10¹¹，堆峰值同理，必须用 `long long` 保存

## 示例
### 示例 1
```in
8
call 128
alloc 1 64
call 256
ret
free 1
alloc 2 32
ret
ret
```
```out
stack-peak=384
stack-now=0
heap-peak=64
heap-now=32
leak=1 32
```
> 栈先压入 128，再压入 256，峰值 384；两次 `ret` 之后回到 0。堆先申请 64 字节，`free 1` 之后归零，再申请 32 字节，所以堆峰值是 64、结束时占用 32。块 2 没有释放，泄漏 1 块、32 字节。

### 示例 2（边界：没有任何事件）
```in
0
```
```out
stack-peak=0
stack-now=0
heap-peak=0
heap-now=0
leak=0 0
```
> 没有事件时五个量都是 0。不要把"没有数据"误判成输入错误。

## 提示
### 第 1 层
栈是后进先出的：用一个数组记录每次 `call` 的 `bytes`，`ret` 时弹出栈顶并从当前栈占用里减掉。堆则需要按 `id` 保存每块的大小和"是否已释放"。

### 第 2 层
峰值不是结束值。每次 `call` 累加之后、每次 `alloc` 累加之后，都要用 `if (now > peak) peak = now;` 更新峰值；`ret` 和 `free` 只会让当前值变小，不会影响历史峰值。

### 第 3 层
结束时遍历所有 `id`，把仍标记为"已分配"的块的块数和字节数累加，就是 `leak`。注意泄漏统计和时间点无关：丢失指针的块、以及还挂在指针上的块，都算泄漏。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXE 100005

static long long frame[MAXE];      /* 栈：每层 call 的字节数 */
static long long hsize[MAXE];      /* 堆：每个 id 的字节数 */
static int halloc[MAXE];           /* 堆：每个 id 是否还在 */

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > MAXE - 1) {
        return 0;
    }

    long long stack_now = 0;
    long long stack_peak = 0;
    long long heap_now = 0;
    long long heap_peak = 0;
    int top = 0;

    for (int e = 0; e < n; e++) {
        char cmd[16];
        if (scanf("%15s", cmd) != 1) {
            break;
        }

        if (strcmp(cmd, "call") == 0) {
            long long bytes;
            if (scanf("%lld", &bytes) != 1) {
                break;
            }
            frame[top++] = bytes;
            stack_now += bytes;
            if (stack_now > stack_peak) {
                stack_peak = stack_now;
            }
        } else if (strcmp(cmd, "ret") == 0) {
            if (top > 0) {
                top--;
                stack_now -= frame[top];
            }
        } else if (strcmp(cmd, "alloc") == 0) {
            int id;
            long long bytes;
            if (scanf("%d %lld", &id, &bytes) != 2) {
                break;
            }
            if (id >= 1 && id <= MAXE - 1) {
                hsize[id] = bytes;
                halloc[id] = 1;
                heap_now += bytes;
                if (heap_now > heap_peak) {
                    heap_peak = heap_now;
                }
            }
        } else if (strcmp(cmd, "free") == 0) {
            int id;
            if (scanf("%d", &id) != 1) {
                break;
            }
            if (id >= 1 && id <= MAXE - 1 && halloc[id]) {
                halloc[id] = 0;
                heap_now -= hsize[id];
            }
        }
    }

    int leak_count = 0;
    long long leak_bytes = 0;
    for (int id = 1; id <= n; id++) {
        if (halloc[id]) {
            leak_count++;
            leak_bytes += hsize[id];
        }
    }

    printf("stack-peak=%lld\n", stack_peak);
    printf("stack-now=%lld\n", stack_now);
    printf("heap-peak=%lld\n", heap_peak);
    printf("heap-now=%lld\n", heap_now);
    printf("leak=%d %lld\n", leak_count, leak_bytes);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXE 100005

static long long frame[MAXE];
static long long hsize[MAXE];
static int halloc[MAXE];

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }

    long long stack_now = 0;
    long long stack_peak = 0;
    long long heap_now = 0;
    long long heap_peak = 0;
    int top = 0;

    for (int e = 0; e < n; e++) {
        char cmd[16];
        if (scanf("%15s", cmd) != 1) {
            break;
        }

        if (strcmp(cmd, "call") == 0) {
            long long bytes;
            if (scanf("%lld", &bytes) != 1) {
                break;
            }
            frame[top++] = bytes;
            stack_now += bytes;
            stack_peak = stack_now;          /* TODO: 峰值应该是历史最大值，不是当前值 */
        } else if (strcmp(cmd, "ret") == 0) {
            if (top > 0) {
                top--;
                stack_now -= frame[top];
                stack_peak = stack_now;      /* TODO: 返回后当前值变小，不应覆盖峰值 */
            }
        } else if (strcmp(cmd, "alloc") == 0) {
            int id;
            long long bytes;
            if (scanf("%d %lld", &id, &bytes) != 2) {
                break;
            }
            hsize[id] = bytes;
            halloc[id] = 1;
            heap_now += bytes;
            heap_peak = heap_now;            /* TODO: 峰值要用最大值更新 */
        } else if (strcmp(cmd, "free") == 0) {
            int id;
            if (scanf("%d", &id) != 1) {
                break;
            }
            /* TODO: 把 halloc[id] 置 0，并从 heap_now 里减掉 */
        }
    }

    printf("stack-peak=%lld\n", stack_peak);
    printf("stack-now=%lld\n", stack_now);
    printf("heap-peak=%lld\n", heap_peak);
    printf("heap-now=%lld\n", heap_now);
    printf("leak=0 0\n");                    /* TODO: 统计仍活着的堆块 */
    return 0;
}
```

## 复杂度
时间 O(n)：每个事件 O(1)，最后扫一遍 `n` 个编号统计泄漏。
空间 O(n)：两个 `long long` 数组和一个标记数组。

## 常见错误
### 用当前值覆盖峰值 [WA]
`ret` 或 `free` 之后当前占用会变小；如果每次都执行 `peak = now`，峰值就只剩"最后一次操作后的值"，通常是 0。峰值必须在当前值**变大**时更新：`if (now > peak) peak = now;`。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXE 100005

static long long frame[MAXE];
static long long hsize[MAXE];
static int halloc[MAXE];

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    long long stack_now = 0, stack_peak = 0;
    long long heap_now = 0, heap_peak = 0;
    int top = 0;
    for (int e = 0; e < n; e++) {
        char cmd[16];
        if (scanf("%15s", cmd) != 1) {
            break;
        }
        if (strcmp(cmd, "call") == 0) {
            long long bytes;
            if (scanf("%lld", &bytes) != 1) break;
            frame[top++] = bytes;
            stack_now += bytes;
            stack_peak = stack_now;          /* 错：覆盖历史峰值 */
        } else if (strcmp(cmd, "ret") == 0) {
            if (top > 0) {
                top--;
                stack_now -= frame[top];
                stack_peak = stack_now;      /* 错：返回后又覆盖一次 */
            }
        } else if (strcmp(cmd, "alloc") == 0) {
            int id;
            long long bytes;
            if (scanf("%d %lld", &id, &bytes) != 2) break;
            hsize[id] = bytes;
            halloc[id] = 1;
            heap_now += bytes;
            heap_peak = heap_now;            /* 错 */
        } else if (strcmp(cmd, "free") == 0) {
            int id;
            if (scanf("%d", &id) != 1) break;
            if (halloc[id]) {
                halloc[id] = 0;
                heap_now -= hsize[id];
                heap_peak = heap_now;        /* 错 */
            }
        }
    }
    int cnt = 0;
    long long bytes = 0;
    for (int id = 1; id <= n; id++) {
        if (halloc[id]) {
            cnt++;
            bytes += hsize[id];
        }
    }
    printf("stack-peak=%lld\n", stack_peak);
    printf("stack-now=%lld\n", stack_now);
    printf("heap-peak=%lld\n", heap_peak);
    printf("heap-now=%lld\n", heap_now);
    printf("leak=%d %lld\n", cnt, bytes);
    return 0;
}
```

### 用 int 保存栈峰值 [UB]
单次 `call` 最多 10⁶ 字节，10⁵ 层调用累加可达 10¹¹。用 `int` 累加会发生有符号整数溢出，属于未定义行为。所有"字节数"和"峰值"都应该是 `long long`。

```c file=main.c expect=UB
#include <stdio.h>
#include <string.h>

#define MAXE 100005

static int frame[MAXE];
static long long hsize[MAXE];
static int halloc[MAXE];

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    int stack_now = 0, stack_peak = 0;
    long long heap_now = 0, heap_peak = 0;
    int top = 0;
    for (int e = 0; e < n; e++) {
        char cmd[16];
        if (scanf("%15s", cmd) != 1) break;
        if (strcmp(cmd, "call") == 0) {
            int bytes;
            if (scanf("%d", &bytes) != 1) break;
            frame[top++] = bytes;
            stack_now += bytes;              /* 错：可能超过 INT_MAX */
            if (stack_now > stack_peak) stack_peak = stack_now;
        } else if (strcmp(cmd, "ret") == 0) {
            if (top > 0) {
                top--;
                stack_now -= frame[top];
            }
        } else if (strcmp(cmd, "alloc") == 0) {
            int id, bytes;
            if (scanf("%d %d", &id, &bytes) != 2) break;
            hsize[id] = bytes;
            halloc[id] = 1;
            heap_now += bytes;
            if (heap_now > heap_peak) heap_peak = heap_now;
        } else if (strcmp(cmd, "free") == 0) {
            int id;
            if (scanf("%d", &id) != 1) break;
            if (halloc[id]) {
                halloc[id] = 0;
                heap_now -= hsize[id];
            }
        }
    }
    int cnt = 0;
    long long bytes = 0;
    for (int id = 1; id <= n; id++) {
        if (halloc[id]) {
            cnt++;
            bytes += hsize[id];
        }
    }
    printf("stack-peak=%d\n", stack_peak);
    printf("stack-now=%d\n", stack_now);
    printf("heap-peak=%lld\n", heap_peak);
    printf("heap-now=%lld\n", heap_now);
    printf("leak=%d %lld\n", cnt, bytes);
    return 0;
}
```

### 用 ret 去释放堆块 [WA]
`ret` 只弹栈帧，和堆无关。如果一看到 `ret` 就把堆的当前占用清零，堆峰值和泄漏都会错。栈和堆是两套独立的计数，必须分开维护。

### 泄漏只统计"还能通过 id 找到"的块 [WA]
本题的 `id` 是输入里的编号，不是指针变量；即使真实程序里指针被覆盖，块本身仍然泄漏。结束时按 `id` 遍历所有 `alloc` 过的块，凡是还没有 `free` 的都算泄漏，不要按"是否有指针指向"来判断。

## 测试用例
### 01 sample 示例 1
```in
8
call 128
alloc 1 64
call 256
ret
free 1
alloc 2 32
ret
ret
```
```out
stack-peak=384
stack-now=0
heap-peak=64
heap-now=32
leak=1 32
```

### 02 sample 示例 2
```in
0
```
```out
stack-peak=0
stack-now=0
heap-peak=0
heap-now=0
leak=0 0
```

### 03 degenerate 一次调用一次返回
```in
2
call 100
ret
```
```out
stack-peak=100
stack-now=0
heap-peak=0
heap-now=0
leak=0 0
```

### 04 trap 三层嵌套的栈峰值
```in
8
call 100
call 200
call 300
ret
ret
ret
alloc 1 50
free 1
```
```out
stack-peak=600
stack-now=0
heap-peak=50
heap-now=0
leak=0 0
```

### 05 trap 多块交错释放后的泄漏
```in
10
alloc 1 10
alloc 2 20
free 1
alloc 3 30
free 3
alloc 4 40
free 2
alloc 5 50
free 5
alloc 6 60
```
```out
stack-peak=0
stack-now=0
heap-peak=100
heap-now=100
leak=2 100
```
> 申请顺序为 10、20、30、40、50、60；其中 1、2、3、5 被释放，剩下 4（40 字节）和 6（60 字节），所以泄漏 2 块、100 字节。堆峰值出现在分配块 6 之后：40 + 60 = 100。

### 06 normal 栈与堆交错
```in
13
call 64
alloc 1 128
call 32
ret
alloc 2 256
call 16
ret
ret
free 1
alloc 3 512
free 2
call 8
ret
```
```out
stack-peak=96
stack-now=0
heap-peak=768
heap-now=512
leak=1 512
```
> 栈最深时是 64 + 32 = 96；堆在分配块 3 时达到峰值：块 1 在这之前已经被 `free 1` 释放，所以堆上是 256 + 512 = 768。最后块 2 也被释放，只剩块 3，泄漏 1 块、512 字节。

### 生成 boundary 两万层调用与 5000 个堆块
```js gen
const cases = [];
const events = [];
const N = 1000000;

for (let i = 0; i < 20000; i++) events.push(`call ${N}`);
for (let i = 0; i < 20000; i++) events.push('ret');
for (let id = 1; id <= 5000; id++) events.push(`alloc ${id} ${N}`);
for (let id = 1; id <= 2500; id++) events.push(`free ${id}`);

const stackPeak = 20000 * N;
const heapPeak = 5000 * N;
const heapNow = 2500 * N;

cases.push({
  kind: 'boundary',
  category: '两万层调用、5000 个堆块',
  input: `${events.length}\n${events.join('\n')}\n`,
  output: `stack-peak=${stackPeak}\nstack-now=0\nheap-peak=${heapPeak}\nheap-now=${heapNow}\nleak=2500 ${heapNow}\n`,
});

return cases;
```
