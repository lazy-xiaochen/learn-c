---json
{
  "id": "p-s4-bitfield-1",
  "title": "设备状态寄存器巡检：位域打包、命令处理与状态统计",
  "difficulty": "L4",
  "knowledgePoints": ["s4-bitfield"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一台设备的状态寄存器只有 8 位，数据手册把它分成 5 个字段：

| 位 | 字段 | 含义 |
|---|---|---|
| bit0 | enabled | 使能 |
| bit1 | ready | 就绪 |
| bit2 | fault | 故障 |
| bit3 | dirty | 有未提交的数据 |
| bit4–bit7 | mode | 工作模式，4 位无符号，取值 0–15 |

请写一个巡检程序：读入 `n` 台设备当前的寄存器值，依次执行 `q` 条命令，最后打印每台设备的最终状态和一份汇总。

命令格式为 `op 设备号 x`，设备号从 **1** 开始：

- `0 i x`：把第 `i` 台设备的第 `x` 个标志位置 1。`x` 的含义：0 = enabled、1 = ready、2 = fault、3 = dirty；
- `1 i x`：把第 `x` 个标志位清 0；
- `2 i v`：把第 `i` 台设备的 mode 设为 `v`。**只保留低 4 位**：`v = 20` 时 mode 变成 4，`v = 63` 时变成 15（这正是 4 位无符号位域的赋值语义）；
- `3 i x`：翻转第 `x` 个标志位（0 变 1、1 变 0）。

每台设备最后归入下面四类之一，判断**按顺序进行，先命中先算**：

1. `fault = 1` → 故障（fault），不管它是否使能；
2. 否则 `enabled = 0` → 关闭（off）；
3. 否则 `ready = 1` → 就绪（ready）；
4. 否则 → 空闲（idle）。

命令只影响被点名的那个标志位或 mode，不会连带修改其它位。

## 输入格式
第一行一个整数 `n`：设备台数。

接下来 `n` 行，每行一个整数 `reg`（0–255）：第 `i` 台设备的初始寄存器值。

接下来一行一个整数 `q`：命令条数。

接下来 `q` 行，每行三个整数 `op i x`。

## 输出格式
先输出 `n` 行，第 `i` 台设备一行：

```
#<i> reg=<寄存器值> enabled=<0|1> ready=<0|1> fault=<0|1> dirty=<0|1> mode=<0–15>
```

其中 `reg` 是把最终字段按上表拼回去得到的十进制值（0–255）。

最后输出一行汇总：

```
summary idle=<a> ready=<b> fault=<c> off=<d> dirty=<e> mode_sum=<f>
```

- `a`、`b`、`c`、`d` 分别是四类设备的台数；
- `e` 是 `dirty = 1` 的台数；
- `f` 是所有 **`enabled = 1`** 的设备的 `mode` 之和（未使能的设备不计入）。

## 数据范围
1 ≤ n ≤ 100
0 ≤ q ≤ 500
0 ≤ reg ≤ 255
0 ≤ v ≤ 63（`op = 2` 时）
0 ≤ x ≤ 3（`op` 为 0、1、3 时）

输出最多 101 行，每行不超过 70 个字符。

## 示例
### 示例 1
```in
3
0
181
8
5
0 1 0
0 1 1
2 1 20
3 2 2
1 3 3
```
```out
#1 reg=67 enabled=1 ready=1 fault=0 dirty=0 mode=4
#2 reg=177 enabled=1 ready=0 fault=0 dirty=0 mode=11
#3 reg=0 enabled=0 ready=0 fault=0 dirty=0 mode=0
summary idle=1 ready=1 fault=0 off=1 dirty=0 mode_sum=15
```
> 1 号初始为 0，先置 enabled、再置 ready，最后把 mode 设为 20——4 位装不下 20，按模 16 截断成 4，拼回去是 `1 + 2 + 4×16 = 67`，分类为 ready。2 号初始 181 = `1011 0101`：enabled=1、fault=1、mode=11；命令把 fault 翻回 0，于是 `reg = 1 + 11×16 = 177`，分类为 idle。3 号初始 8 只有 dirty，清掉后归 0，因为 enabled=0 所以算 off。汇总里 mode_sum 只累加 enabled=1 的 1 号（4）和 2 号（11），得到 15。

### 示例 2（边界：没有命令，寄存器每一位都是 1）
```in
2
255
0
0
```
```out
#1 reg=255 enabled=1 ready=1 fault=1 dirty=1 mode=15
#2 reg=0 enabled=0 ready=0 fault=0 dirty=0 mode=0
summary idle=0 ready=0 fault=1 off=1 dirty=1 mode_sum=15
```
> `q = 0` 时一行命令都没有，输出就是初始状态的翻译：255 的每一位都是 1，四个标志全为 1、mode=15，因为 fault 优先所以归为故障类；0 号设备虽然四个标志都干净，但 enabled=0，归为关闭。注意 1 号设备的 mode=15 仍然要计入 mode_sum（它是使能的）。

## 提示
### 第 1 层
先把 `reg` 拆成字段：`enabled = reg & 1`，`ready = (reg >> 1) & 1`，`fault = (reg >> 2) & 1`，`dirty = (reg >> 3) & 1`，`mode = (reg >> 4) & 0x0F`。拼回去就是反过来：`reg = enabled | ready<<1 | fault<<2 | dirty<<3 | mode<<4`。这两组位运算就是数据手册那张表的直接翻译。

### 第 2 层
命令按设备号索引数组时要写 `dev[i - 1]`（设备号从 1 开始，数组下标从 0 开始）。`op = 2` 的截断可以显式写 `mode = v & 0x0F`，也可以用 `unsigned char mode : 4` 的位域让赋值自动截断——两种写法等价。翻转用 `x = !x`，不要写成 `x = 1`。

### 第 3 层
分类的顺序不能反：先判 `fault`，再判"未使能"，最后才看 `ready`；顺序错了，一台"故障且未使能"的设备就会被归到 off 类。`mode_sum` 只累加 `enabled = 1` 的设备，输出 `reg` 时再把四个标志和 mode 拼回去。注意 `mode` 可能是 8–15 这种最高位为 1 的值，如果你把它声明成有符号的 `int mode : 4`，读出来会变成负数，`reg` 也会跟着错。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAXN 100

/* 用位域表示 8 位状态寄存器：4 个 1 位标志 + 1 个 4 位模式 */
struct Status {
    unsigned char enabled : 1;
    unsigned char ready   : 1;
    unsigned char fault   : 1;
    unsigned char dirty   : 1;
    unsigned char mode    : 4;
};

/* 按数据手册的位位置拼回寄存器值 */
static int encode(const struct Status *s) {
    return (int)s->enabled | ((int)s->ready << 1) | ((int)s->fault << 2) |
           ((int)s->dirty << 3) | ((int)s->mode << 4);
}

/* 把寄存器值拆成字段 */
static void decode(struct Status *s, int reg) {
    s->enabled = (reg >> 0) & 1;
    s->ready   = (reg >> 1) & 1;
    s->fault   = (reg >> 2) & 1;
    s->dirty   = (reg >> 3) & 1;
    s->mode    = (reg >> 4) & 0x0F;
}

/* 位域不能取地址，所以只能按编号 switch 到具体字段 */
static void set_flag(struct Status *s, int x, int v) {
    switch (x) {
    case 0: s->enabled = v; break;
    case 1: s->ready = v; break;
    case 2: s->fault = v; break;
    case 3: s->dirty = v; break;
    default: break;
    }
}

static void toggle_flag(struct Status *s, int x) {
    switch (x) {
    case 0: s->enabled = !s->enabled; break;
    case 1: s->ready = !s->ready; break;
    case 2: s->fault = !s->fault; break;
    case 3: s->dirty = !s->dirty; break;
    default: break;
    }
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) return 0;
    struct Status dev[MAXN];
    for (int i = 0; i < n; i++) {
        int reg;
        if (scanf("%d", &reg) != 1 || reg < 0 || reg > 255) return 0;
        decode(&dev[i], reg);
    }

    int q;
    if (scanf("%d", &q) != 1 || q < 0 || q > 500) return 0;
    for (int k = 0; k < q; k++) {
        int op, i, x;
        if (scanf("%d %d %d", &op, &i, &x) != 3) return 0;
        if (i < 1 || i > n) return 0;
        struct Status *s = &dev[i - 1];
        if (op == 0) set_flag(s, x, 1);
        else if (op == 1) set_flag(s, x, 0);
        else if (op == 2) s->mode = x;      /* 4 位位域：自动只保留低 4 位 */
        else if (op == 3) toggle_flag(s, x);
    }

    int idle = 0, ready = 0, fault = 0, off = 0, dirty = 0, mode_sum = 0;
    for (int i = 0; i < n; i++) {
        int reg = encode(&dev[i]);
        printf("#%d reg=%d enabled=%u ready=%u fault=%u dirty=%u mode=%u\n",
               i + 1, reg, (unsigned)dev[i].enabled, (unsigned)dev[i].ready,
               (unsigned)dev[i].fault, (unsigned)dev[i].dirty, (unsigned)dev[i].mode);
        if (dev[i].fault) fault++;
        else if (!dev[i].enabled) off++;
        else if (dev[i].ready) ready++;
        else idle++;
        if (dev[i].dirty) dirty++;
        if (dev[i].enabled) mode_sum += dev[i].mode;
    }
    printf("summary idle=%d ready=%d fault=%d off=%d dirty=%d mode_sum=%d\n",
           idle, ready, fault, off, dirty, mode_sum);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAXN 100

struct Status {
    unsigned char enabled : 1;
    unsigned char ready   : 1;
    unsigned char fault   : 1;
    unsigned char dirty   : 1;
    unsigned char mode    : 4;
};

static int encode(const struct Status *s) {
    return (int)s->enabled | ((int)s->ready << 1) | ((int)s->fault << 2) |
           ((int)s->dirty << 3) | ((int)s->mode << 4);
}

static void decode(struct Status *s, int reg) {
    s->enabled = (reg >> 0) & 1;
    s->ready   = (reg >> 1) & 1;
    s->fault   = (reg >> 2) & 1;
    s->dirty   = (reg >> 3) & 1;
    s->mode    = (reg >> 3) & 0x0F;      /* TODO: mode 的起始位不对 */
}

static void set_flag(struct Status *s, int x, int v) {
    switch (x) {
    case 0: s->enabled = v; break;
    case 1: s->ready = v; break;
    case 2: s->fault = v; break;
    case 3: s->dirty = v; break;
    default: break;
    }
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) return 0;
    struct Status dev[MAXN];
    for (int i = 0; i < n; i++) {
        int reg;
        if (scanf("%d", &reg) != 1 || reg < 0 || reg > 255) return 0;
        decode(&dev[i], reg);
    }

    int q;
    if (scanf("%d", &q) != 1 || q < 0 || q > 500) return 0;
    for (int k = 0; k < q; k++) {
        int op, i, x;
        if (scanf("%d %d %d", &op, &i, &x) != 3) return 0;
        if (i < 1 || i > n) return 0;
        struct Status *s = &dev[i - 1];
        if (op == 0) set_flag(s, x, 1);
        else if (op == 1) set_flag(s, x, 0);
        else if (op == 2) s->mode = x;
        else if (op == 3) set_flag(s, x, 1);   /* TODO: op 3 是翻转，不是置 1 */
    }

    int idle = 0, ready = 0, fault = 0, off = 0, dirty = 0, mode_sum = 0;
    for (int i = 0; i < n; i++) {
        int reg = encode(&dev[i]);
        printf("#%d reg=%d enabled=%u ready=%u fault=%u dirty=%u mode=%u\n",
               i + 1, reg, (unsigned)dev[i].enabled, (unsigned)dev[i].ready,
               (unsigned)dev[i].fault, (unsigned)dev[i].dirty, (unsigned)dev[i].mode);
        if (!dev[i].enabled) off++;            /* TODO: 分类优先级不对 */
        else if (dev[i].fault) fault++;
        else if (dev[i].ready) ready++;
        else idle++;
        if (dev[i].dirty) dirty++;
        if (dev[i].enabled) mode_sum += dev[i].mode;
    }
    printf("summary idle=%d ready=%d fault=%d off=%d dirty=%d mode_sum=%d\n",
           idle, ready, fault, off, dirty, mode_sum);
    return 0;
}
```

## 复杂度
时间 O(n + q)：初始化拆位一次，每条命令 O(1)，最后扫一遍设备。
空间 O(n)：每台设备一个 1 字节的位域结构体（本平台 `sizeof(struct Status) == 1`），数组也只占 n 字节左右。

## 常见错误
### 把 mode 声明成有符号的 `int mode : 4` [UB]
4 位有符号的取值范围是 −8–7。设备报上来的 mode 是 8–15 时，读出来会变成 −8–−1：`mode << 4` 变成"对负数左移"——这在 C 里是未定义行为，本平台判 UB；即使侥幸没崩，`reg` 也会变成负数、`mode_sum` 偏小、分类跟着错。位域的基础类型必须显式写 `unsigned`，`mode` 这种可能用到最高位的字段尤其不能省。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXN 100

struct Status {
    unsigned char enabled : 1;
    unsigned char ready   : 1;
    unsigned char fault   : 1;
    unsigned char dirty   : 1;
    int mode : 4;                 /* 错：有符号的 4 位位域 */
};

static int encode(const struct Status *s) {
    return (int)s->enabled | ((int)s->ready << 1) | ((int)s->fault << 2) |
           ((int)s->dirty << 3) | ((int)s->mode << 4);
}

static void decode(struct Status *s, int reg) {
    s->enabled = (reg >> 0) & 1;
    s->ready   = (reg >> 1) & 1;
    s->fault   = (reg >> 2) & 1;
    s->dirty   = (reg >> 3) & 1;
    s->mode    = (reg >> 4) & 0x0F;
}

static void set_flag(struct Status *s, int x, int v) {
    switch (x) {
    case 0: s->enabled = v; break;
    case 1: s->ready = v; break;
    case 2: s->fault = v; break;
    case 3: s->dirty = v; break;
    default: break;
    }
}

static void toggle_flag(struct Status *s, int x) {
    switch (x) {
    case 0: s->enabled = !s->enabled; break;
    case 1: s->ready = !s->ready; break;
    case 2: s->fault = !s->fault; break;
    case 3: s->dirty = !s->dirty; break;
    default: break;
    }
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) return 0;
    struct Status dev[MAXN];
    for (int i = 0; i < n; i++) {
        int reg;
        if (scanf("%d", &reg) != 1 || reg < 0 || reg > 255) return 0;
        decode(&dev[i], reg);
    }
    int q;
    if (scanf("%d", &q) != 1 || q < 0 || q > 500) return 0;
    for (int k = 0; k < q; k++) {
        int op, i, x;
        if (scanf("%d %d %d", &op, &i, &x) != 3) return 0;
        if (i < 1 || i > n) return 0;
        struct Status *s = &dev[i - 1];
        if (op == 0) set_flag(s, x, 1);
        else if (op == 1) set_flag(s, x, 0);
        else if (op == 2) s->mode = x;
        else if (op == 3) toggle_flag(s, x);
    }
    int idle = 0, ready = 0, fault = 0, off = 0, dirty = 0, mode_sum = 0;
    for (int i = 0; i < n; i++) {
        int reg = encode(&dev[i]);
        printf("#%d reg=%d enabled=%u ready=%u fault=%u dirty=%u mode=%u\n",
               i + 1, reg, (unsigned)dev[i].enabled, (unsigned)dev[i].ready,
               (unsigned)dev[i].fault, (unsigned)dev[i].dirty, (unsigned)dev[i].mode);
        if (dev[i].fault) fault++;
        else if (!dev[i].enabled) off++;
        else if (dev[i].ready) ready++;
        else idle++;
        if (dev[i].dirty) dirty++;
        if (dev[i].enabled) mode_sum += dev[i].mode;
    }
    printf("summary idle=%d ready=%d fault=%d off=%d dirty=%d mode_sum=%d\n",
           idle, ready, fault, off, dirty, mode_sum);
    return 0;
}
```

### 忘记 mode 只保留低 4 位 [WA]
如果不用 4 位位域、而是用普通的 `unsigned char mode` 存模式，就必须在赋值时写 `mode = v & 0x0F`。少了这一步，`v = 20` 会原样存成 20，拼回 `reg` 时 `20 << 4 = 320`，寄存器值直接超出 0–255，mode 那一列也和协议不符。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXN 100

struct Status {
    unsigned char enabled;
    unsigned char ready;
    unsigned char fault;
    unsigned char dirty;
    unsigned char mode;           /* 普通字节：不会自动截断 */
};

static int encode(const struct Status *s) {
    return s->enabled | (s->ready << 1) | (s->fault << 2) | (s->dirty << 3) | (s->mode << 4);
}

static void decode(struct Status *s, int reg) {
    s->enabled = (reg >> 0) & 1;
    s->ready   = (reg >> 1) & 1;
    s->fault   = (reg >> 2) & 1;
    s->dirty   = (reg >> 3) & 1;
    s->mode    = (reg >> 4) & 0x0F;
}

static void set_flag(struct Status *s, int x, int v) {
    switch (x) {
    case 0: s->enabled = v; break;
    case 1: s->ready = v; break;
    case 2: s->fault = v; break;
    case 3: s->dirty = v; break;
    default: break;
    }
}

static void toggle_flag(struct Status *s, int x) {
    switch (x) {
    case 0: s->enabled = !s->enabled; break;
    case 1: s->ready = !s->ready; break;
    case 2: s->fault = !s->fault; break;
    case 3: s->dirty = !s->dirty; break;
    default: break;
    }
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) return 0;
    struct Status dev[MAXN];
    for (int i = 0; i < n; i++) {
        int reg;
        if (scanf("%d", &reg) != 1 || reg < 0 || reg > 255) return 0;
        decode(&dev[i], reg);
    }
    int q;
    if (scanf("%d", &q) != 1 || q < 0 || q > 500) return 0;
    for (int k = 0; k < q; k++) {
        int op, i, x;
        if (scanf("%d %d %d", &op, &i, &x) != 3) return 0;
        if (i < 1 || i > n) return 0;
        struct Status *s = &dev[i - 1];
        if (op == 0) set_flag(s, x, 1);
        else if (op == 1) set_flag(s, x, 0);
        else if (op == 2) s->mode = x;      /* 错：没有 & 0x0F */
        else if (op == 3) toggle_flag(s, x);
    }
    int idle = 0, ready = 0, fault = 0, off = 0, dirty = 0, mode_sum = 0;
    for (int i = 0; i < n; i++) {
        int reg = encode(&dev[i]);
        printf("#%d reg=%d enabled=%u ready=%u fault=%u dirty=%u mode=%u\n",
               i + 1, reg, (unsigned)dev[i].enabled, (unsigned)dev[i].ready,
               (unsigned)dev[i].fault, (unsigned)dev[i].dirty, (unsigned)dev[i].mode);
        if (dev[i].fault) fault++;
        else if (!dev[i].enabled) off++;
        else if (dev[i].ready) ready++;
        else idle++;
        if (dev[i].dirty) dirty++;
        if (dev[i].enabled) mode_sum += dev[i].mode;
    }
    printf("summary idle=%d ready=%d fault=%d off=%d dirty=%d mode_sum=%d\n",
           idle, ready, fault, off, dirty, mode_sum);
    return 0;
}
```

### 分类时先判 enabled，再判 fault [WA]
题目规定故障优先：一台"fault=1 且 enabled=0"的设备属于故障类，不是关闭类。把 `if (!enabled)` 放在最前面，`fault` 类的计数就会偏少、`off` 类偏多，`idle/ready` 也可能被连带影响。

### 设备号从 0 开始索引 [WA]
命令里的设备号是 1 基的：`i = n` 指的是最后一台。写成 `dev[i]` 会从第二台开始错位，`i = n` 还会越界读到数组之外。要么统一用 `dev[i - 1]`，要么在读入时就把编号映射好。

### 把翻转命令实现成置 1 [WA]
`op = 3` 是翻转：0 变 1、1 变 0，连着来两次应该回到原值。用 `x = 1` 实现的话，对已经是 1 的位完全没有效果，测试里正好有"同一台设备连翻两次"的用例可以抓住它。

## 测试用例
### 01 sample 示例 1
```in
3
0
181
8
5
0 1 0
0 1 1
2 1 20
3 2 2
1 3 3
```
```out
#1 reg=67 enabled=1 ready=1 fault=0 dirty=0 mode=4
#2 reg=177 enabled=1 ready=0 fault=0 dirty=0 mode=11
#3 reg=0 enabled=0 ready=0 fault=0 dirty=0 mode=0
summary idle=1 ready=1 fault=0 off=1 dirty=0 mode_sum=15
```

### 02 sample 示例 2
```in
2
255
0
0
```
```out
#1 reg=255 enabled=1 ready=1 fault=1 dirty=1 mode=15
#2 reg=0 enabled=0 ready=0 fault=0 dirty=0 mode=0
summary idle=0 ready=0 fault=1 off=1 dirty=1 mode_sum=15
```

### 03 degenerate 只有一台设备，命令什么也没改变
```in
1
0
1
1 1 2
```
```out
#1 reg=0 enabled=0 ready=0 fault=0 dirty=0 mode=0
summary idle=0 ready=0 fault=0 off=1 dirty=0 mode_sum=0
```

### 04 trap mode 只保留低 4 位
```in
2
15
240
5
2 1 20
2 1 63
2 2 16
2 2 31
1 2 0
```
```out
#1 reg=255 enabled=1 ready=1 fault=1 dirty=1 mode=15
#2 reg=240 enabled=0 ready=0 fault=0 dirty=0 mode=15
summary idle=0 ready=0 fault=1 off=1 dirty=1 mode_sum=15
```

### 05 trap 翻转两次与 1 基编号
```in
3
1
2
252
6
3 3 0
3 3 0
0 1 3
1 1 0
3 2 1
0 2 2
```
```out
#1 reg=8 enabled=0 ready=0 fault=0 dirty=1 mode=0
#2 reg=4 enabled=0 ready=0 fault=1 dirty=0 mode=0
#3 reg=252 enabled=0 ready=0 fault=1 dirty=1 mode=15
summary idle=0 ready=0 fault=2 off=1 dirty=2 mode_sum=0
```

### 06 normal 5 台设备、12 条命令
```in
5
1
66
132
200
255
12
0 2 1
1 4 2
2 3 9
3 1 2
0 3 0
1 5 3
2 1 12
3 5 3
0 4 3
2 4 1
1 2 1
0 5 0
```
```out
#1 reg=197 enabled=1 ready=0 fault=1 dirty=0 mode=12
#2 reg=64 enabled=0 ready=0 fault=0 dirty=0 mode=4
#3 reg=149 enabled=1 ready=0 fault=1 dirty=0 mode=9
#4 reg=24 enabled=0 ready=0 fault=0 dirty=1 mode=1
#5 reg=255 enabled=1 ready=1 fault=1 dirty=1 mode=15
summary idle=0 ready=0 fault=3 off=2 dirty=2 mode_sum=36
```

### 07 normal 所有设备都未使能，mode_sum 为 0
```in
3
0
128
4
0
```
```out
#1 reg=0 enabled=0 ready=0 fault=0 dirty=0 mode=0
#2 reg=128 enabled=0 ready=0 fault=0 dirty=0 mode=8
#3 reg=4 enabled=0 ready=0 fault=1 dirty=0 mode=0
summary idle=0 ready=0 fault=1 off=2 dirty=0 mode_sum=0
```

### 生成 boundary 100 台设备且没有命令
```js gen
function decode(reg) {
  return {
    enabled: reg & 1,
    ready: (reg >> 1) & 1,
    fault: (reg >> 2) & 1,
    dirty: (reg >> 3) & 1,
    mode: (reg >> 4) & 0xF,
  };
}
function encode(s) {
  return (s.enabled & 1) | ((s.ready & 1) << 1) | ((s.fault & 1) << 2) |
         ((s.dirty & 1) << 3) | ((s.mode & 0xF) << 4);
}

const n = 100;
const regs = [];
for (let i = 0; i < n; i++) regs.push((i * 53 + 7) % 256);

const dev = regs.map(decode);
const out = dev.map((s, idx) =>
  `#${idx + 1} reg=${encode(s)} enabled=${s.enabled} ready=${s.ready} fault=${s.fault} dirty=${s.dirty} mode=${s.mode}`);

let idle = 0, ready = 0, fault = 0, off = 0, dirty = 0, modeSum = 0;
for (const s of dev) {
  if (s.fault) fault++;
  else if (!s.enabled) off++;
  else if (s.ready) ready++;
  else idle++;
  if (s.dirty) dirty++;
  if (s.enabled) modeSum += s.mode;
}
out.push(`summary idle=${idle} ready=${ready} fault=${fault} off=${off} dirty=${dirty} mode_sum=${modeSum}`);

const lines = [String(n), ...regs.map(String), "0"];
return [{
  kind: "boundary",
  category: "100 台设备、0 条命令，初始值覆盖全部位组合",
  input: lines.join("\n") + "\n",
  output: out.join("\n") + "\n",
}];
```

### 生成 stress 100 台设备、500 条随机命令
```js gen
const FIELDS = ["enabled", "ready", "fault", "dirty"];

function decode(reg) {
  return {
    enabled: reg & 1,
    ready: (reg >> 1) & 1,
    fault: (reg >> 2) & 1,
    dirty: (reg >> 3) & 1,
    mode: (reg >> 4) & 0xF,
  };
}
function encode(s) {
  return (s.enabled & 1) | ((s.ready & 1) << 1) | ((s.fault & 1) << 2) |
         ((s.dirty & 1) << 3) | ((s.mode & 0xF) << 4);
}

const n = 100;
const regs = [];
for (let i = 0; i < n; i++) regs.push(rng.int(0, 255));

const q = 500;
const cmds = [];
for (let k = 0; k < q; k++) {
  const op = rng.int(0, 3);
  const i = rng.int(1, n);
  const x = op === 2 ? rng.int(0, 63) : rng.int(0, 3);
  cmds.push([op, i, x]);
}

const dev = regs.map(decode);
for (const [op, i, x] of cmds) {
  const s = dev[i - 1];
  if (op === 0) s[FIELDS[x]] = 1;
  else if (op === 1) s[FIELDS[x]] = 0;
  else if (op === 2) s.mode = x & 0xF;
  else s[FIELDS[x]] ^= 1;
}

const lines = [String(n), ...regs.map(String), String(q)];
for (const c of cmds) lines.push(c.join(" "));

const out = dev.map((s, idx) =>
  `#${idx + 1} reg=${encode(s)} enabled=${s.enabled} ready=${s.ready} fault=${s.fault} dirty=${s.dirty} mode=${s.mode}`);
let idle = 0, ready = 0, fault = 0, off = 0, dirty = 0, modeSum = 0;
for (const s of dev) {
  if (s.fault) fault++;
  else if (!s.enabled) off++;
  else if (s.ready) ready++;
  else idle++;
  if (s.dirty) dirty++;
  if (s.enabled) modeSum += s.mode;
}
out.push(`summary idle=${idle} ready=${ready} fault=${fault} off=${off} dirty=${dirty} mode_sum=${modeSum}`);

return [{
  kind: "stress",
  category: "100 台设备、500 条随机命令",
  input: lines.join("\n") + "\n",
  output: out.join("\n") + "\n",
}];
```
