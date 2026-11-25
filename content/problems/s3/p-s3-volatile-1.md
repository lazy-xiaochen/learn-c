---json
{
  "id": "p-s3-volatile-1",
  "title": "模拟按键去抖：轮询 volatile 状态寄存器统计按键次数",
  "difficulty": "L3",
  "knowledgePoints": ["s3-volatile"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一块开发板上有一个按键，接在 GPIO 上，**低电平有效**：`0` 表示按下，`1` 表示松开。

按键是机械结构，按下和松开的瞬间触点会抖动，采样到的电平可能在很短的时间里来回跳。所以驱动里要做**去抖**：只有电平**连续 3 个采样点都相同**，才承认状态真的变了。

程序的结构已经给好了，分两层：

- `hardware_tick(level)`：模拟"硬件/中断"每过一个采样周期把当前电平写进**状态寄存器** `g_key_status`；
- `main` 的循环：每个采样周期读一次状态寄存器，跑去抖状态机。

现在 `main` 里只做了"看到下降沿就 +1"，完全没去抖，一次抖动会数出好几次按键。请你补上去抖逻辑。

### 关于 volatile
真实系统里，`g_key_status` 是被中断（或硬件）改写的，编译器看不见这种修改。如果它只是一个普通变量，优化器完全可能把它缓存进寄存器、只在开头读一次，于是循环永远看到同一个值。所以状态寄存器必须声明成 `volatile`：

```c
static volatile int g_key_status = 1;
```

本平台的判题固定用 `-O0`，去掉 `volatile` 也能通过测试——但请你一定保留它，并想清楚**为什么它必须有**。

### 去抖规则
把"已经确认的电平"记作 `confirmed`，初始值是 `1`（松开）。逐个处理采样点：

1. 统计"当前原始电平连续出现了几次"（`run`）；
2. 当 `run >= 3` 且这个电平与 `confirmed` 不同时，更新 `confirmed`；
3. 更新后如果 `confirmed` 变成 `0`（按下），按键次数 `presses` 加 1；
4. 抖动期间（连续次数不到 3）什么都不做。

注意第 3 条的含义：**确认按下只加一次**，按住不放不会重复计数；必须等到确认松开（连续 3 个 `1`）之后，下一次按下才会再计数。

## 输入格式
第一行一个整数 `n`，表示采样点个数。
第二行 `n` 个整数，每个是 `0`（按下）或 `1`（松开），用空格分隔。

## 输出格式
如果成功读入合法的 `n`（1 ≤ n ≤ 200）和全部 `n` 个采样值（只能是 0 或 1），输出一行：

```
presses=按键次数
```

否则（读入失败、`n` 超范围、出现 0/1 之外的值）输出一行 `error`。

## 数据范围
1 ≤ n ≤ 200
每个采样值只能是 0 或 1

输出只有一个整数，规模很小。

## 示例
### 示例 1
```in
12
0 0 0 0 1 1 1 0 0 0 1 1
```
```out
presses=2
```
> 前 4 个 `0` 中出现连续 3 个 `0`，确认第 1 次按下；接着 3 个 `1` 确认松开；再来 3 个 `0`，确认第 2 次按下；末尾只有 2 个 `1`，不够 3 个，所以**不算**松开——但这已经不影响计数了。

### 示例 2（边界：恰好 3 个采样点，刚好够去抖）
```in
3
0 0 0
```
```out
presses=1
```
> 去抖窗口是"连续 3 个"，所以 3 个 `0` 正好够确认一次按下。如果窗口写成 4，这里会输出 0。

## 提示
### 第 1 层
先别管 `volatile`，把状态机想清楚：程序需要记住哪几件事？至少有两件——"上一个采样点的原始电平"和"已经确认的电平"。再加上"当前连续次数"和"按键次数"，一共四个变量。

### 第 2 层
每个采样点做三件事：更新"连续相同电平的个数"（相同就 +1，不同就重置为 1）、判断是否达到 3、达到 3 且和 `confirmed` 不同才更新 `confirmed`（如果新状态是 `0` 就 `presses++`）。**不要在 `run` 刚到 3 之后继续累加计数**——那会把长按数成很多次。

### 第 3 层
核心片段（`sample` 是本周期读到的电平）：

```c
if (sample == last) {
    run++;
} else {
    last = sample;
    run = 1;
}
if (run >= DEBOUNCE && confirmed != sample) {
    confirmed = sample;
    if (sample == 0) {
        presses++;
    }
}
```

`DEBOUNCE` 取 3。注意 `run` 的初值是 0、`last` 初值取 `-1`（这样第一个采样点一定走 `else` 分支，`run` 从 1 开始）。

## 参考代码
```c file=main.c
#include <stdio.h>

#define DEBOUNCE 3                 /* 连续 3 个采样点电平相同才确认状态改变 */

/* 按键状态寄存器：真实系统里由中断/硬件修改，所以必须 volatile */
static volatile int g_key_status = 1;      /* 1 = 松开，0 = 按下（低电平有效） */

/* 模拟硬件：外部每过一个采样周期，就把当前电平写进状态寄存器 */
static void hardware_tick(int level) {
    g_key_status = level;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 200) {
        printf("error\n");
        return 0;
    }

    int confirmed = 1;             /* 已经确认的电平，初始为松开 */
    int last = -1;                 /* 上一个采样点的原始电平 */
    int run = 0;                   /* 当前电平连续出现了几次 */
    int presses = 0;               /* 确认的按键次数 */

    for (int i = 0; i < n; i++) {
        int level = 0;
        if (scanf("%d", &level) != 1 || (level != 0 && level != 1)) {
            printf("error\n");
            return 0;
        }

        hardware_tick(level);      /* 模拟硬件写入 */
        int sample = g_key_status; /* 读状态寄存器 */

        if (sample == last) {
            run++;
        } else {
            last = sample;
            run = 1;
        }
        if (run >= DEBOUNCE && confirmed != sample) {
            confirmed = sample;
            if (sample == 0) {
                presses++;         /* 只在"确认按下"的那一刻加 1 */
            }
        }
    }

    printf("presses=%d\n", presses);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

/* 按键状态寄存器：真实系统里由中断/硬件修改，所以必须 volatile */
static volatile int g_key_status = 1;      /* 1 = 松开，0 = 按下（低电平有效） */

/* 模拟硬件：外部每过一个采样周期，就把当前电平写进状态寄存器 */
static void hardware_tick(int level) {
    g_key_status = level;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 200) {
        printf("error\n");
        return 0;
    }

    int last = 1;                  /* 上一个采样点的电平，初始是松开 */
    int presses = 0;
    for (int i = 0; i < n; i++) {
        int level = 0;
        if (scanf("%d", &level) != 1 || (level != 0 && level != 1)) {
            printf("error\n");
            return 0;
        }

        hardware_tick(level);      /* 模拟硬件写入 */
        int sample = g_key_status; /* 读状态寄存器 */

        /* TODO: 这里没有去抖：只要"松开 -> 按下"就立刻计数，一次抖动会被数成好几次。
           请改成"连续 3 个采样点电平相同才确认状态改变"的状态机。 */
        if (sample == 0 && last == 1) {
            presses++;
        }
        last = sample;
    }

    printf("presses=%d\n", presses);
    return 0;
}
```

## 复杂度
时间 O(n)：每个采样点常数次比较。
空间 O(1)：四个整数变量。

本题考查两点：

1. **`volatile` 的使用场景**。状态寄存器被"编译器看不见的东西"（中断、硬件）修改，所以每次都必须真的去内存读。这不是性能问题，而是正确性问题：去掉 `volatile` 后，优化器可能把 `g_key_status` 缓存进寄存器，循环里永远读到同一个值。
2. **去抖状态机**本身。它要区分"原始电平"和"确认电平"，并且在确认的瞬间才计数——这是嵌入式开发里最常见的一类小状态机。

## 常见错误
### 完全不去抖，每个下降沿都算一次按键 [WA]
只要看到 `1 → 0` 就 `presses++`，一次机械抖动会产生好几个下降沿，于是按一下被数成好几次。示例 1 这种"干净的"输入反而不容易暴露它，抖动用例才会。
```c file=main.c expect=WA
#include <stdio.h>

static volatile int g_key_status = 1;

static void hardware_tick(int level) {
    g_key_status = level;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 200) {
        printf("error\n");
        return 0;
    }
    int last = 1;
    int presses = 0;
    for (int i = 0; i < n; i++) {
        int level = 0;
        if (scanf("%d", &level) != 1 || (level != 0 && level != 1)) {
            printf("error\n");
            return 0;
        }
        hardware_tick(level);
        int sample = g_key_status;
        if (sample == 0 && last == 1) {      /* 错：没有去抖 */
            presses++;
        }
        last = sample;
    }
    printf("presses=%d\n", presses);
    return 0;
}
```

### 按住不放的时候每个采样点都计数 [WA]
写成 `if (sample == 0) { presses++; }`：按住 8 个周期就等于按了 8 次。按键次数应该只在"确认按下"的那一瞬间加 1，之后要等确认松开才能再计。
```c file=main.c expect=WA
#include <stdio.h>

static volatile int g_key_status = 1;

static void hardware_tick(int level) {
    g_key_status = level;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 200) {
        printf("error\n");
        return 0;
    }
    int presses = 0;
    for (int i = 0; i < n; i++) {
        int level = 0;
        if (scanf("%d", &level) != 1 || (level != 0 && level != 1)) {
            printf("error\n");
            return 0;
        }
        hardware_tick(level);
        int sample = g_key_status;
        if (sample == 0) {                   /* 错：长按会重复计数 */
            presses++;
        }
    }
    printf("presses=%d\n", presses);
    return 0;
}
```

### 去抖窗口差一：写成连续 4 个才算 [WA]
`run >= 4` 或 `run > DEBOUNCE`（在 `DEBOUNCE` 为 3 时等价于 4）会让"恰好 3 个采样点"的输入数不出来。示例 2 就是专门抓这个 off-by-one 的。
```c file=main.c expect=WA
#include <stdio.h>

#define DEBOUNCE 4                 /* 错：应该是 3 */

static volatile int g_key_status = 1;

static void hardware_tick(int level) {
    g_key_status = level;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 200) {
        printf("error\n");
        return 0;
    }
    int confirmed = 1;
    int last = -1;
    int run = 0;
    int presses = 0;
    for (int i = 0; i < n; i++) {
        int level = 0;
        if (scanf("%d", &level) != 1 || (level != 0 && level != 1)) {
            printf("error\n");
            return 0;
        }
        hardware_tick(level);
        int sample = g_key_status;
        if (sample == last) {
            run++;
        } else {
            last = sample;
            run = 1;
        }
        if (run >= DEBOUNCE && confirmed != sample) {
            confirmed = sample;
            if (sample == 0) {
                presses++;
            }
        }
    }
    printf("presses=%d\n", presses);
    return 0;
}
```

### 以为 volatile 能让计数"不会丢" [UB]
`volatile` 只保证每次读写都真的访问内存，**不保证 `presses++` 是原子的**。如果计数在中断里做、主循环里也在做，`presses++`（读—加—写三步）可能被打断，两次自增只加了一次。正确做法是：中断里只置一个 `volatile sig_atomic_t` 标志，累加放到主循环里；或者用 C11 的 `_Atomic`。**`volatile` 不是锁，也不是原子类型。**

## 测试用例
### 01 sample 示例 1
```in
12
0 0 0 0 1 1 1 0 0 0 1 1
```
```out
presses=2
```

### 02 sample 示例 2
```in
3
0 0 0
```
```out
presses=1
```

### 03 boundary 200 个采样点全是松开
```in
200
1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
```
```out
presses=0
```

### 04 boundary 20 个采样点全是按下，只算一次长按
```in
20
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
```
```out
presses=1
```

### 05 degenerate 只有一个采样点
```in
1
1
```
```out
presses=0
```

### 06 degenerate 两个按下采样点，不够去抖窗口
```in
2
0 0
```
```out
presses=0
```

### 07 trap 一直抖动，凑不出 3 个连续
```in
10
0 0 1 1 0 0 1 0 0 1
```
```out
presses=0
```
> 每段相同电平最多只有 2 个，去抖状态机永远不会确认，所以一次都不算。

### 08 trap 一次很长的按住：只算一次
```in
8
0 0 0 0 0 0 0 0
```
```out
presses=1
```

### 09 trap 短脉冲：只有 2 个按下采样点，不算
```in
5
1 1 0 0 1
```
```out
presses=0
```

### 10 normal 两次完整的按下与松开
```in
10
0 0 0 1 1 1 0 0 0 0
```
```out
presses=2
```

### 11 trap 采样值只能是 0 或 1
```in
3
1 2 1
```
```out
error
```

### 生成 boundary 最大规模与抖动压力数据
```js gen
const cases = [];

/* 用 JS 独立跑一遍同样的状态机，绝不复用 C 代码 */
const DEBOUNCE = 3;
function run(samples) {
  let confirmed = 1;
  let last = -1;
  let runLen = 0;
  let presses = 0;
  for (const s of samples) {
    if (s === last) {
      runLen++;
    } else {
      last = s;
      runLen = 1;
    }
    if (runLen >= DEBOUNCE && confirmed !== s) {
      confirmed = s;
      if (s === 0) presses++;
    }
  }
  return `presses=${presses}\n`;
}
const text = (list) => `${list.length}\n${list.join(' ')}\n`;

/* 最大规模：200 个采样点，按 000111 循环，正好 33 次完整按键 + 2 个多余的 0 */
const periodic = [];
for (let i = 0; i < 200; i++) periodic.push(Math.floor(i / 3) % 2 === 0 ? 0 : 1);
cases.push({
  kind: 'boundary',
  category: '最大规模：200 个采样点按 000111 循环',
  input: text(periodic),
  output: run(periodic),
});

/* 抖动压力：每次按下前后都掺入 1~2 个反向采样点，去抖必须把它们吃掉 */
const noisy = [];
let cur = 1;
for (let i = 0; i < 200; i++) {
  if (i % 20 === 10) cur = cur === 0 ? 1 : 0;      /* 每 20 个采样点换一次状态 */
  noisy.push(cur);
  if (i % 7 === 3) noisy.push(cur === 0 ? 1 : 0);  /* 中间插入一个抖动点 */
}
noisy.length = 200;
cases.push({
  kind: 'trap',
  category: '掺了抖动点的 200 个采样点',
  input: text(noisy),
  output: run(noisy),
});

/* 随机：每个采样点以 70% 概率保持上一个电平，形成随机长度的段 */
const rand = [];
let level = 1;
for (let i = 0; i < 200; i++) {
  if (rng.next() > 0.7) level = level === 0 ? 1 : 0;
  rand.push(level);
}
cases.push({
  kind: 'normal',
  category: '200 个随机采样点',
  input: text(rand),
  output: run(rand),
});

/* 最大规模：200 个采样点全部按下，整段只算一次 */
const allLow = new Array(200).fill(0);
cases.push({
  kind: 'boundary',
  category: '最大规模：200 个采样点全是按下',
  input: text(allLow),
  output: run(allLow),
});

return cases;
```
