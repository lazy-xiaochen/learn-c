---json
{
  "id": "p-s4-enum-1",
  "title": "修复设备模式统计工程：两份同名枚举与越界的模式码",
  "difficulty": "L3",
  "knowledgePoints": ["s4-enum"],
  "special": "link-diagnosis",
  "judge": { "mode": "multi", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
运维同学把一个设备日志分析工具拆成了四个文件：

- `modes.h`：**新版**设备协议的模式定义，模式码从 `0` 开始；
- `device.h`：设备模块的接口（声明 `mode_power`），历史包袱很重；
- `device.c`：`mode_power` 的实现，用 `switch` 把模式翻译成功耗；
- `main.c`：读入一串模式码，统计每种模式出现了多少次、总功耗是多少。

这个工程现在**编译不过**。请先读编译器的第一条报错，判断它发生在哪个阶段、指出问题出在哪两个文件，再动手修。四个文件都可以改，提交时全部参与编译。

### 报错在说什么
先分清"编译错误"和"链接错误"：本题的初始代码是**编译阶段**的 `redefinition`，不是链接期的 `undefined reference` / `duplicate symbol`。两者的区别是：

| 报错 | 阶段 | 含义 |
|---|---|---|
| `redefinition of 'Mode'` / `redefinition of enumerator 'MODE_OFF'` | 编译 | 同一个翻译单元里，同一个名字被定义了两遍 |
| `undefined reference to 'mode_power'` | 链接 | 有人调用、有人声明，但没有任何 `.c` 提供定义 |
| `multiple definition of 'mode_power'` | 链接 | 两个 `.c` 都提供了同一个定义 |

初始代码的报错包含链会指向 `main.c` 的第二个 `#include`（也就是 `modes.h`），并在 `note` 里指出 `device.h` 已经定义过 `Mode`：它同时包含了 `device.h` 和 `modes.h`，而这两个头文件各自定义了一份 `enum Mode`，**名字相同、取值不同**。

### 为什么这件事很危险
`device.h` 里保留的是旧协议：

```c
enum Mode { MODE_OFF = 1, MODE_IDLE = 2, MODE_STANDBY = 3, MODE_RUN = 4 };
```

`modes.h` 里是现在使用的新协议：

```c
enum Mode { MODE_OFF = 0, MODE_IDLE = 1, MODE_STANDBY = 2, MODE_RUN = 3 };
```

枚举成员是**普通标识符**，没有 `Mode::` 这样的命名空间；而枚举在 ABI 上又只是一个 `int`，函数符号里不带任何类型信息。所以：

- 两份定义被同一个 `.c` 包含 → 编译期 `redefinition`，这是最幸运的情况；
- 两份定义分别被不同 `.c` 包含 → 编译、链接都可能通过，但两个模块对 `MODE_OFF` 到底是 0 还是 1 的理解不同，运行时行为不一致（C 标准把这种类型不兼容的程序规定为未定义行为）。

本题的修法只有一个：**让整份工程只保留一份枚举定义**，并把所有使用者的取值统一到新协议（`0..3`）。同时注意：新协议规定 `4..9` 是保留码，日志里可能出现，它们必须被统计成 `UNKNOWN`，不能拿去做数组下标。

### 统计规则
对每个模式码 `code`：

- `code == 0` → `MODE_OFF`，功耗 `0`；
- `code == 1` → `MODE_IDLE`，功耗 `5`；
- `code == 2` → `MODE_STANDBY`，功耗 `20`；
- `code == 3` → `MODE_RUN`，功耗 `100`；
- `code` 在 `4..9` → `UNKNOWN`，功耗 `0`，不计入任何模式。

## 输入格式
第一行一个整数 `n`，表示日志条数。
第二行 `n` 个整数，每个都在 `0..9` 之间，表示一条日志里的模式码。

## 输出格式
按顺序输出六行：

```
OFF <关机的条数>
IDLE <待机的条数>
STANDBY <待命的条数>
RUN <运行的条数>
UNKNOWN <保留码的条数>
power <总功耗>
```

所有条数和功耗都是非负整数；功耗的单位是毫瓦。

## 数据范围
1 ≤ n ≤ 100000
0 ≤ 每个模式码 ≤ 9

总功耗最大为 100000 × 100 = 10⁷，`int` 能装下，但仍建议用 `long long` 保存，避免以后扩大数据范围时出错。输出只有 6 行，远小于 64KB 限制。

## 示例
### 示例 1
```in
8
0 1 2 3 3 9 1 0
```
```out
OFF 2
IDLE 2
STANDBY 1
RUN 2
UNKNOWN 1
power 230
```
> 两个 `0` 是关机，两个 `1` 是待机，一个 `2` 是待命，两个 `3` 是运行，一个 `9` 是保留码（`UNKNOWN`）。总功耗 = 2×0 + 2×5 + 1×20 + 2×100 = 230。初始代码在这里连编译都过不了，修好之后才可能得到这六行。

### 示例 2（边界：只有一条关机记录）
```in
1
0
```
```out
OFF 1
IDLE 0
STANDBY 0
RUN 0
UNKNOWN 0
power 0
```
> `n = 1` 时六行都要输出，不能省略计数为 0 的模式。`0` 是合法的模式码，`power` 为 0 不代表"没读到数据"。

## 提示
### 第 1 层
先编译一次，从第一条报错读起。它是在说"某个名字被定义了两次"，还是"某个符号找不到定义"？本题的第一条报错里会出现 `redefinition` 和 `MODE_OFF`，去 `main.c` 看它包含了哪些头文件，再看这两个头文件各自定义了什么。

### 第 2 层
`device.h` 和 `modes.h` 都定义了 `enum Mode`，而且两边的 `MODE_OFF` 一个等于 1、一个等于 0。枚举成员是普通标识符，不能像结构体成员那样各活各的。正确的结构是：**`modes.h` 是唯一一份枚举定义，`device.h` 包含它并使用它，`main.c` 只包含 `device.h`**；旧的 1 起始编码必须整体删除，不能靠"换个 include 顺序"或"加头文件卫士"消除冲突。

### 第 3 层
修好重复定义只是第一步。`main.c` 现在直接写 `counts[code]++`，而 `code` 可能是 `4..9`——`counts` 只有 4 个元素，这是越界写（未定义行为，UBSan/ASan 会直接报错）。必须在**转换或下标之前**检查 `code >= 0 && code < MODE_COUNT`，把超出范围的码计入 `UNKNOWN` 并跳过。另外，`device.c` 的 `switch` 要保留 `default`：枚举不保证传进来的值一定在枚举列表里。

## 参考代码
```c file=modes.h
#ifndef MODES_H
#define MODES_H

/* 新版设备协议：模式码从 0 开始，4..9 是保留码 */
enum Mode {
    MODE_OFF = 0,
    MODE_IDLE = 1,
    MODE_STANDBY = 2,
    MODE_RUN = 3
};

#define MODE_COUNT 4

#endif
```

```c file=device.h
#ifndef DEVICE_H
#define DEVICE_H

#include "modes.h"          /* 枚举只在这里定义一份，设备模块统一使用它 */

/* 返回该模式下的功耗（毫瓦） */
int mode_power(enum Mode mode);

#endif
```

```c file=device.c
#include "device.h"

int mode_power(enum Mode mode) {
    switch (mode) {
    case MODE_OFF: return 0;
    case MODE_IDLE: return 5;
    case MODE_STANDBY: return 20;
    case MODE_RUN: return 100;
    default: return 0;      /* 枚举不会阻止越界值，必须兜底 */
    }
}
```

```c file=main.c
#include <stdio.h>
#include "device.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100000) {
        return 0;
    }

    long long counts[MODE_COUNT] = {0};
    long long power = 0;
    long long unknown = 0;

    for (int i = 0; i < n; i++) {
        int code;
        if (scanf("%d", &code) != 1) {
            return 0;
        }
        if (code < 0 || code >= MODE_COUNT) {
            unknown++;      /* 4..9：保留码，不是任何模式 */
            continue;
        }
        enum Mode mode = (enum Mode)code;
        counts[(int)mode]++;
        power += mode_power(mode);
    }

    printf("OFF %lld\n", counts[MODE_OFF]);
    printf("IDLE %lld\n", counts[MODE_IDLE]);
    printf("STANDBY %lld\n", counts[MODE_STANDBY]);
    printf("RUN %lld\n", counts[MODE_RUN]);
    printf("UNKNOWN %lld\n", unknown);
    printf("power %lld\n", power);
    return 0;
}
```

## 初始代码
```c file=modes.h
#ifndef MODES_H
#define MODES_H

/* 新版设备协议：模式码从 0 开始，4..9 是保留码 */
enum Mode {
    MODE_OFF = 0,
    MODE_IDLE = 1,
    MODE_STANDBY = 2,
    MODE_RUN = 3
};

#define MODE_COUNT 4

#endif
```

```c file=device.h
#ifndef DEVICE_H
#define DEVICE_H

/* 旧版设备协议：模式码从 1 开始（历史遗留） */
enum Mode {
    MODE_OFF = 1,
    MODE_IDLE = 2,
    MODE_STANDBY = 3,
    MODE_RUN = 4
};

/* 返回该模式下的功耗（毫瓦） */
int mode_power(enum Mode mode);

#endif
```

```c file=device.c
#include "device.h"

int mode_power(enum Mode mode) {
    switch (mode) {
    case MODE_OFF: return 0;
    case MODE_IDLE: return 5;
    case MODE_STANDBY: return 20;
    case MODE_RUN: return 100;
    default: return 0;
    }
}
```

```c file=main.c
#include <stdio.h>
#include "device.h"
#include "modes.h"          /* 需要 MODE_COUNT 做循环/数组长度 */

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100000) {
        return 0;
    }

    long long counts[MODE_COUNT] = {0};
    long long power = 0;

    for (int i = 0; i < n; i++) {
        int code;
        if (scanf("%d", &code) != 1) {
            return 0;
        }
        counts[code]++;     /* TODO: 先判断是不是保留码，再转成 enum */
        power += mode_power((enum Mode)code);
    }

    printf("OFF %lld\n", counts[MODE_OFF]);
    printf("IDLE %lld\n", counts[MODE_IDLE]);
    printf("STANDBY %lld\n", counts[MODE_STANDBY]);
    printf("RUN %lld\n", counts[MODE_RUN]);
    printf("power %lld\n", power);   /* TODO: 保留码要单独统计成 UNKNOWN */
    return 0;
}
```

## 复杂度
时间 O(n)：每个模式码只读一次、只查一次表。
空间 O(1)：只需要四个计数器和两个累加变量，与 `n` 无关。

真正的难点不在算法，而在**多文件工程里"同一个名字只能有一份定义"**：枚举的定义、声明和使用者必须来自同一个头文件，否则编译器（同一翻译单元）和链接器（不同翻译单元）都不一定能替你发现错误。

## 常见错误
### 修好了重复定义，却保留了旧协议的 1 起始编码 [WA]
把 `modes.h` 里的 `MODE_OFF` 改回 1、`MODE_IDLE` 改回 2……编译能过，但输入里的 `0` 会被当成越界码或错误的模式，计数和功耗整体错位。新协议明确说模式码从 0 开始；旧协议的数字只能在读取旧数据时显式转换，不能继续占用这组枚举名。

```c file=modes.h expect=WA
#ifndef MODES_H
#define MODES_H

/* 错：新协议的模式码从 0 开始，这里却沿用了旧协议的 1..4；
   为了不越界还把 MODE_COUNT 改成 5，语义已经彻底错位 */
enum Mode {
    MODE_OFF = 1,
    MODE_IDLE = 2,
    MODE_STANDBY = 3,
    MODE_RUN = 4
};

#define MODE_COUNT 5

#endif
```

### 合并了枚举，却忘了检查保留码 [UB]
`counts[MODE_COUNT]` 只有 4 个元素，`code` 直接拿来当下标时，输入 `4..9` 就会越界写。UBSan 会报 `index out of bounds`（判 `UB`），AddressSanitizer 会报 `stack-buffer-overflow`（判 `RE`）。必须先判断 `code >= 0 && code < MODE_COUNT`，把保留码计入 `UNKNOWN`。

```c file=main.c expect=UB
#include <stdio.h>
#include "device.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }

    long long counts[MODE_COUNT] = {0};
    long long power = 0;

    for (int i = 0; i < n; i++) {
        int code;
        if (scanf("%d", &code) != 1) {
            return 0;
        }
        counts[code]++;     /* 错：code 可能是 4..9 */
        power += mode_power((enum Mode)code);
    }

    printf("OFF %lld\n", counts[MODE_OFF]);
    printf("IDLE %lld\n", counts[MODE_IDLE]);
    printf("STANDBY %lld\n", counts[MODE_STANDBY]);
    printf("RUN %lld\n", counts[MODE_RUN]);
    printf("UNKNOWN 0\n");
    printf("power %lld\n", power);
    return 0;
}
```

### 把保留码归到某个已知模式 [WA]
为了"让所有输入都有归属"，把 `4..9` 当成 `RUN` 或 `OFF`，会让 `UNKNOWN` 永远是 0，同时把功耗算多/算少。保留码的语义就是"未知"，必须单独计数、功耗按 0 处理；这也能让日志里的异常值一眼可见。

```c file=main.c expect=WA
#include <stdio.h>
#include "device.h"

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }

    long long counts[MODE_COUNT] = {0};
    long long power = 0;

    for (int i = 0; i < n; i++) {
        int code;
        if (scanf("%d", &code) != 1) {
            return 0;
        }
        if (code >= MODE_COUNT) {
            code = MODE_RUN;        /* 错：保留码不是运行 */
        }
        counts[code]++;
        power += mode_power((enum Mode)code);
    }

    printf("OFF %lld\n", counts[MODE_OFF]);
    printf("IDLE %lld\n", counts[MODE_IDLE]);
    printf("STANDBY %lld\n", counts[MODE_STANDBY]);
    printf("RUN %lld\n", counts[MODE_RUN]);
    printf("UNKNOWN 0\n");
    printf("power %lld\n", power);
    return 0;
}
```

### 以为换个 include 顺序就能解决重复定义 [CE]
`#include "modes.h"` 放在 `device.h` 前面，只会让报错指向另一个文件，重复定义依然存在。`#ifndef` 头文件卫士只能防止**同一个文件**被包含两次，管不住"两个不同头文件定义了同一组枚举名"。唯一的修法是让 `modes.h` 成为唯一的定义处，并删掉 `device.h` 里的旧枚举。

## 测试用例
### 01 sample 示例 1
```in
8
0 1 2 3 3 9 1 0
```
```out
OFF 2
IDLE 2
STANDBY 1
RUN 2
UNKNOWN 1
power 230
```

### 02 sample 示例 2
```in
1
0
```
```out
OFF 1
IDLE 0
STANDBY 0
RUN 0
UNKNOWN 0
power 0
```

### 03 boundary 单条运行记录
```in
1
3
```
```out
OFF 0
IDLE 0
STANDBY 0
RUN 1
UNKNOWN 0
power 100
```

### 04 degenerate 全部是关机码
```in
5
0 0 0 0 0
```
```out
OFF 5
IDLE 0
STANDBY 0
RUN 0
UNKNOWN 0
power 0
```

### 05 trap 保留码必须单独计数
```in
8
4 5 6 7 8 9 0 3
```
```out
OFF 1
IDLE 0
STANDBY 0
RUN 1
UNKNOWN 6
power 100
```

### 06 trap 全部是运行模式
```in
10
3 3 3 3 3 3 3 3 3 3
```
```out
OFF 0
IDLE 0
STANDBY 0
RUN 10
UNKNOWN 0
power 1000
```

### 07 normal 四种模式各出现两次
```in
10
0 1 2 3 0 1 2 3 9 8
```
```out
OFF 2
IDLE 2
STANDBY 2
RUN 2
UNKNOWN 2
power 250
```

### 08 boundary 四种模式各一次
```in
4
0 3 1 2
```
```out
OFF 1
IDLE 1
STANDBY 1
RUN 1
UNKNOWN 0
power 125
```

### 09 normal 全部待机
```in
6
1 1 1 1 1 1
```
```out
OFF 0
IDLE 6
STANDBY 0
RUN 0
UNKNOWN 0
power 30
```

### 10 trap 未知码夹在已知码中间
```in
3
0 4 3
```
```out
OFF 1
IDLE 0
STANDBY 0
RUN 1
UNKNOWN 1
power 100
```

### 生成 boundary 10 万条 0…9 循环出现的模式码
```js gen
const n = 100000;
const codes = [];
for (let i = 0; i < n; i++) codes.push(i % 10);
let off = 0, idle = 0, standby = 0, run = 0, unknown = 0, power = 0;
for (const c of codes) {
  if (c === 0) off++;
  else if (c === 1) { idle++; power += 5; }
  else if (c === 2) { standby++; power += 20; }
  else if (c === 3) { run++; power += 100; }
  else unknown++;
}
const out = [
  `OFF ${off}`,
  `IDLE ${idle}`,
  `STANDBY ${standby}`,
  `RUN ${run}`,
  `UNKNOWN ${unknown}`,
  `power ${power}`,
].join('\n') + '\n';
return [{
  kind: 'boundary',
  category: '10 万条模式码，0…9 循环出现',
  input: `${n}\n${codes.join(' ')}\n`,
  output: out,
}];
```
