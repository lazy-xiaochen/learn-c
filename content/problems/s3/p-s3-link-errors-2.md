---json
{
  "id": "p-s3-link-errors-2",
  "title": "补全被合并成单文件的账户工程：存款、取款与失败次数",
  "difficulty": "L3",
  "knowledgePoints": ["s3-link-errors"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一个"校园卡账户"的小工程原本拆成了两个文件：`account.h` 放四个函数的声明，`account.c` 放实现，`main.c` 负责读入操作序列。

同事为了图省事，把它合并成了一个 `main.c`，结果**把函数的实现弄丢了**，只剩下声明和几个空壳函数。程序能编译、能运行，但每次都输出 `balance=0`、`failed=0`。

请你按照下面的业务规则把这个文件补完整。注意体会一件事：**声明（函数原型）只是告诉编译器"有这么个函数"，真正决定余额怎么变的是定义（函数体）。** 只剩声明时，编译能过、链接会报 `undefined symbol`；只剩空壳时，链接能过、结果却全错。

业务规则：

- 账户初始余额为 0；
- `D x`：存入 `x` 元；
- `W x`：取出 `x` 元。**余额足够才取**，取完余额减少；余额不足时这笔操作记为**失败**，余额不变；
- 所有金额都是正整数，单位元。

## 输入格式
第一行一个整数 `n`，表示操作条数。
接下来 `n` 行，每行一个字符和一个整数：`D x` 或 `W x`（字符与整数之间用空格分隔）。

## 输出格式
如果全部 `n` 条操作都能正确读入且合法，输出两行：

```
balance=最终余额
failed=失败的取款次数
```

否则（读入失败、`n` 不在 1 到 1000 之间、操作字符不是 `D` 或 `W`、金额不在 1 到 10000 之间）输出一行 `error`。

注意区分两种"不成功"：

- **余额不足** → 不算输入错误，只把 `failed` 加 1，继续处理后面的操作；
- **输入本身不合法**（操作字符不认识、金额越界、行不完整）→ 直接输出 `error`，不再输出余额。

## 数据范围
1 ≤ n ≤ 1000
1 ≤ 每条操作的金额 ≤ 10000

余额最大是 1000 × 10000 = 10⁷，`int` 装得下；但余额是"跨操作共享的状态"，用 `long long` 保存更省心，输出时用 `%lld`。

## 示例
### 示例 1
```in
4
D 500
W 200
W 1000
D 100
```
```out
balance=400
failed=1
```
> 500 → 取 200 剩 300 → 取 1000 时余额不足，`failed` 记为 1（余额仍 300）→ 存 100 变 400。最终余额 400，失败 1 次。

### 示例 2（边界：每一笔取款都失败）
```in
2
W 1
W 10000
```
```out
balance=0
failed=2
```
> 初始余额是 0，任何正数取款都会失败。失败的操作**不能**把余额变成负数，所以余额始终是 0。

## 提示
### 第 1 层
先想清楚"余额"应该放在哪里。它不属于某一次操作，而是**整个程序共享的一份状态**：存在 `main` 的局部变量里，就得一路传参；存在文件作用域的变量里，所有函数都能直接用。选一种，然后保证它**只有一份**。

### 第 2 层
四个函数的职责：`account_init` 把余额清零，`account_deposit` 加钱，`account_withdraw` 判断余额够不够（够就扣、返回 1；不够返回 0，不扣），`account_balance` 返回当前余额。`main` 只负责读输入、调用函数、累计失败次数——**别把余额的计算塞回 `main` 里**，否则函数就成了摆设。

### 第 3 层
两个容易混的点：

1. `failed` 只在"余额不足"时加 1；操作字符不认识、金额越界属于**输入错误**，要输出 `error` 并直接结束。
2. 取款判断是 `amount > balance` 就失败，**不要**先扣款再判断余额是否为负——那样余额已经被改坏了。正确顺序是先比较、后扣款。

如果你把 `account_withdraw` 的函数体整段删掉、只留声明，链接时会看到 `undefined symbol: account_withdraw`——那正是"声明不等于定义"的直接后果。

## 参考代码
```c file=main.c
#include <stdio.h>

/* ===== 以下四个函数的声明原本在 account.h 里 ===== */
void account_init(void);
void account_deposit(int amount);
int account_withdraw(int amount);
long long account_balance(void);
/* ================================================= */

/* 余额是整个程序共享的一份状态：定义在文件作用域，全程序只有这一份 */
static long long g_balance = 0;

void account_init(void) {
    g_balance = 0;
}

void account_deposit(int amount) {
    g_balance += amount;
}

int account_withdraw(int amount) {
    if (amount > g_balance) {
        return 0;                    /* 余额不足：不动余额，返回 0 */
    }
    g_balance -= amount;
    return 1;
}

long long account_balance(void) {
    return g_balance;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        printf("error\n");
        return 0;
    }

    account_init();
    int failed = 0;
    for (int i = 0; i < n; i++) {
        char op = 0;
        int amount = 0;
        if (scanf(" %c %d", &op, &amount) != 2) {
            printf("error\n");
            return 0;
        }
        if (amount < 1 || amount > 10000) {
            printf("error\n");
            return 0;
        }
        if (op == 'D') {
            account_deposit(amount);
        } else if (op == 'W') {
            if (!account_withdraw(amount)) {
                failed++;
            }
        } else {
            printf("error\n");
            return 0;
        }
    }

    printf("balance=%lld\n", account_balance());
    printf("failed=%d\n", failed);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

/* ===== 以下四个函数的声明原本在 account.h 里 ===== */
void account_init(void);
void account_deposit(int amount);
int account_withdraw(int amount);
long long account_balance(void);
/* ================================================= */

/* TODO: 合并文件时这四个函数的函数体丢了，只剩空壳。请把它们补完整。 */

void account_init(void) {
}

void account_deposit(int amount) {
    (void)amount;                    /* TODO: 存钱 */
}

int account_withdraw(int amount) {
    (void)amount;                    /* TODO: 判断余额够不够，再决定扣不扣 */
    return 1;
}

long long account_balance(void) {
    return 0;                        /* TODO: 返回真实余额 */
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        printf("error\n");
        return 0;
    }

    account_init();
    int failed = 0;
    for (int i = 0; i < n; i++) {
        char op = 0;
        int amount = 0;
        if (scanf(" %c %d", &op, &amount) != 2) {
            printf("error\n");
            return 0;
        }
        if (amount < 1 || amount > 10000) {
            printf("error\n");
            return 0;
        }
        if (op == 'D') {
            account_deposit(amount);
        } else if (op == 'W') {
            if (!account_withdraw(amount)) {
                failed++;
            }
        } else {
            printf("error\n");
            return 0;
        }
    }

    printf("balance=%lld\n", account_balance());
    printf("failed=%d\n", failed);
    return 0;
}
```

## 复杂度
时间 O(n)：每条操作常数时间。
空间 O(1)：只需要一个余额变量和一个失败计数器。

本题的难点不在算法，而在**接口和状态的组织**：余额必须是一个"只有一份定义"的共享状态，四个函数围绕它协作。如果把余额写成每个函数自己的局部变量，每个函数看到的都是"另一个账户"——这正是多文件工程里"头文件定义变量导致状态分裂"的同一种病。

## 常见错误
### 只留声明、忘了写函数体 [CE]
把 `account_withdraw` 的函数体删掉、只留原型，编译能过（原型在），链接时链接器找不到定义，报 `undefined symbol: account_withdraw`。这正是本知识点讲的"声明 ≠ 定义"：
```c file=main.c expect=CE
#include <stdio.h>

void account_init(void);
void account_deposit(int amount);
int account_withdraw(int amount);          /* 只有声明，没有函数体 */
long long account_balance(void);

static long long g_balance = 0;

void account_init(void) {
    g_balance = 0;
}

void account_deposit(int amount) {
    g_balance += amount;
}

long long account_balance(void) {
    return g_balance;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        printf("error\n");
        return 0;
    }
    account_init();
    int failed = 0;
    for (int i = 0; i < n; i++) {
        char op = 0;
        int amount = 0;
        if (scanf(" %c %d", &op, &amount) != 2) {
            printf("error\n");
            return 0;
        }
        if (op == 'W' && !account_withdraw(amount)) {
            failed++;
        } else if (op == 'D') {
            account_deposit(amount);
        }
    }
    printf("balance=%lld\n", account_balance());
    printf("failed=%d\n", failed);
    return 0;
}
```

### 每个函数各用一份局部"余额"，存取互不相干 [WA]
`account_deposit` 里写 `long long balance = 0; balance += amount;`，函数一返回这份余额就没了，下一笔操作又从 0 开始。表现是"存了钱余额还是 0、取多少都失败"。共享状态必须有**唯一的一份定义**（文件作用域变量，或者由调用者传入指针）。
```c file=main.c expect=WA
#include <stdio.h>

void account_init(void);
void account_deposit(int amount);
int account_withdraw(int amount);
long long account_balance(void);

void account_init(void) {
}

void account_deposit(int amount) {
    long long balance = 0;                    /* 错：每次调用都是一个新变量 */
    balance += amount;
    printf("");                               /* 占位，避免变量未使用的警告 */
}

int account_withdraw(int amount) {
    long long balance = 0;                    /* 错：同上，永远是 0 */
    if (amount > balance) {
        return 0;
    }
    balance -= amount;
    return 1;
}

long long account_balance(void) {
    return 0;                                 /* 错：真正的余额根本不存在 */
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        printf("error\n");
        return 0;
    }
    account_init();
    int failed = 0;
    for (int i = 0; i < n; i++) {
        char op = 0;
        int amount = 0;
        if (scanf(" %c %d", &op, &amount) != 2) {
            printf("error\n");
            return 0;
        }
        if (amount < 1 || amount > 10000) {
            printf("error\n");
            return 0;
        }
        if (op == 'D') {
            account_deposit(amount);
        } else if (op == 'W') {
            if (!account_withdraw(amount)) {
                failed++;
            }
        } else {
            printf("error\n");
            return 0;
        }
    }
    printf("balance=%lld\n", account_balance());
    printf("failed=%d\n", failed);
    return 0;
}
```

### 取款时先扣款再判断，余额被扣成负数 [WA]
`g_balance -= amount;` 之后就没办法恢复原状了。正确做法是**先比较**：`if (amount > g_balance) return 0;` 再扣。这个错误会让余额变成负数，`failed` 也永远是 0。
```c file=main.c expect=WA
#include <stdio.h>

void account_init(void);
void account_deposit(int amount);
int account_withdraw(int amount);
long long account_balance(void);

static long long g_balance = 0;

void account_init(void) {
    g_balance = 0;
}

void account_deposit(int amount) {
    g_balance += amount;
}

int account_withdraw(int amount) {
    g_balance -= amount;                      /* 错：先扣了再说 */
    if (g_balance < 0) {
        return 0;                             /* 想回滚，但余额已经被改坏 */
    }
    return 1;
}

long long account_balance(void) {
    return g_balance;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 1000) {
        printf("error\n");
        return 0;
    }
    account_init();
    int failed = 0;
    for (int i = 0; i < n; i++) {
        char op = 0;
        int amount = 0;
        if (scanf(" %c %d", &op, &amount) != 2) {
            printf("error\n");
            return 0;
        }
        if (amount < 1 || amount > 10000) {
            printf("error\n");
            return 0;
        }
        if (op == 'D') {
            account_deposit(amount);
        } else if (op == 'W') {
            if (!account_withdraw(amount)) {
                failed++;
            }
        } else {
            printf("error\n");
            return 0;
        }
    }
    printf("balance=%lld\n", account_balance());
    printf("failed=%d\n", failed);
    return 0;
}
```

### 把非法输入当成"一次失败"，而不是输出 error [WA]
金额为 0、金额超过 10000、操作字符不是 `D` / `W`，都属于**输入不合法**，要求输出一行 `error`。如果把它们混进 `failed` 里，程序会照常输出余额——在"金额为 0"这类用例上立刻暴露。

## 测试用例
### 01 sample 示例 1
```in
4
D 500
W 200
W 1000
D 100
```
```out
balance=400
failed=1
```

### 02 sample 示例 2
```in
2
W 1
W 10000
```
```out
balance=0
failed=2
```

### 03 boundary 取到余额恰好为 0
```in
2
D 500
W 500
```
```out
balance=0
failed=0
```

### 04 boundary 单笔金额取到上限 10000
```in
2
D 10000
W 10000
```
```out
balance=0
failed=0
```

### 05 degenerate 只有一条存款操作
```in
1
D 1
```
```out
balance=1
failed=0
```

### 06 degenerate 只有一条取款操作，余额为 0
```in
1
W 1
```
```out
balance=0
failed=1
```

### 07 trap 操作字符不是 D 或 W
```in
2
D 100
X 50
```
```out
error
```

### 08 trap 金额为 0，属于非法输入
```in
1
D 0
```
```out
error
```

### 09 trap 金额超过上限 10000
```in
1
W 10001
```
```out
error
```

### 10 normal 存取交替，中间夹一次失败
```in
6
D 1000
W 300
W 800
D 50
W 700
W 1
```
```out
balance=49
failed=1
```

### 生成 boundary 最大规模与随机数据
```js gen
const cases = [];

/* 用 JS 独立模拟一遍业务规则，绝不复用 C 代码 */
function run(ops) {
  let balance = 0;
  let failed = 0;
  for (const [op, amount] of ops) {
    if (op === 'D') {
      balance += amount;
    } else if (amount > balance) {
      failed++;
    } else {
      balance -= amount;
    }
  }
  return `balance=${balance}\nfailed=${failed}\n`;
}
const text = (ops) => `${ops.length}\n${ops.map(([o, a]) => `${o} ${a}`).join('\n')}\n`;

/* 最大规模：1000 笔存款，每笔都取上限，余额顶到 10^7 */
const allDeposit = new Array(1000).fill(0).map(() => ['D', 10000]);
cases.push({
  kind: 'boundary',
  category: '最大规模：1000 笔存款，每笔 10000 元',
  input: text(allDeposit),
  output: run(allDeposit),
});

/* 最大规模：1000 笔取款，账户始终是 0，全部失败 */
const allWithdraw = new Array(1000).fill(0).map(() => ['W', 1]);
cases.push({
  kind: 'degenerate',
  category: '最大规模：1000 笔取款全部失败',
  input: text(allWithdraw),
  output: run(allWithdraw),
});

/* 随机混合：先存几笔保证有余额，再随机存取 */
const ops = [];
for (let i = 0; i < 10; i++) ops.push(['D', rng.int(1000, 10000)]);
for (let i = 0; i < 990; i++) {
  ops.push([rng.next() < 0.5 ? 'D' : 'W', rng.int(1, 10000)]);
}
cases.push({
  kind: 'normal',
  category: '1000 笔随机的存取操作',
  input: text(ops),
  output: run(ops),
});

return cases;
```
