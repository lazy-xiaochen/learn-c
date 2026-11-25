---json
{
  "id": "p-s2-wild-dangling-2",
  "title": "指针生命周期审计：区分野指针、悬垂指针与安全访问",
  "difficulty": "L3",
  "knowledgePoints": ["s2-wild-dangling", "s2-pointer-basics"],
  "special": "ub-analysis",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
教学工具需要把一段"指针操作流水账"翻译成安全性报告。流水账里只有四种事件，它们对应真实的 C 代码：

| 事件 | 对应的 C 代码 | 含义 |
|---|---|---|
| `D k` | `{ int vk;` | 变量 `k` 的生命周期开始（进入它的作用域） |
| `X k` | `}` | 变量 `k` 的生命周期结束（离开作用域） |
| `P k` | `p = &vk;` | 指针 `p` 改为指向变量 `k` |
| `U` | `*p` | 通过 `p` 读一次数据 |

题目保证：`D k` 与 `X k` 成对出现且**正确嵌套**（像 C 的块作用域一样）；每个 `k` 只 `D` 一次；`P k` 只在 `k` 的生命周期内出现。

对每个 `U` 事件，判断这次解引用属于哪种情况：

- **`WILD`（野指针）**：指针 `p` 还从来没有被 `P` 赋值过，里面是不确定的值；
- **`DANGLING`（悬垂指针）**：`p` 指向的变量已经 `X` 了（对象消失，指针还在）；
- **`SAFE`（安全）**：`p` 指向的变量仍然活着。

最后统计三种情况各出现多少次。

## 输入格式
第一行一个整数 `n`（事件条数）。
接下来 `n` 行，每行是一个事件，格式为下面四种之一：
- `D k`
- `X k`
- `P k`
- `U`

事件之间用一个空格分隔关键字和参数。

## 输出格式
按事件顺序，对每个 `U` 输出一行：`SAFE`、`DANGLING` 或 `WILD`。
最后再输出一行统计：`SAFE=<a> DANGLING=<b> WILD=<c>`（`<a>`、`<b>`、`<c>` 是三个非负整数，顺序固定）。

如果没有出现任何 `U`，就只输出最后那行统计。

## 数据范围
1 ≤ n ≤ 200
1 ≤ k ≤ 200
`D`/`X` 成对且正确嵌套；`P k` 出现时 `k` 一定还活着。

`U` 可以出现在任何位置——包括一次 `P` 都还没出现的时候。

## 示例
### 示例 1
```in
8
D 1
P 1
U
X 1
U
D 2
P 2
U
```
```out
SAFE
DANGLING
SAFE
SAFE=2 DANGLING=1 WILD=0
```
> 第一次 `U` 时 `p = &v1`、`v1` 还活着 → `SAFE`。`X 1` 之后 `p` 并没有变，但 `v1` 已经消失 → `DANGLING`。随后 `P 2` 让 `p` 改指 `v2`，`v1` 的死亡不再影响它 → `SAFE`。

### 示例 2（边界：一次解引用都没有）
```in
4
D 1
P 1
X 1
D 2
```
```out
SAFE=0 DANGLING=0 WILD=0
```
> 全是声明和赋值，没有 `U`，所以只有统计行。

## 提示
### 第 1 层
只需要记录两件事：`p` 现在指向哪个变量（用一个编号表示，0 表示"还没指向任何变量"），以及每个变量当前是否还活着（一个布尔数组）。

### 第 2 层
`D k` 把 `alive[k]` 置 1，`X k` 把 `alive[k]` 置 0，`P k` 把 `p` 的目标改成 `k`。**`X` 只影响变量的存活状态，不影响 `p` 里存的值**——这正是悬垂指针的来源。

### 第 3 层
处理 `U` 时按顺序判断：目标编号是 0 → `WILD`；否则看 `alive[目标]`：为 1 → `SAFE`，为 0 → `DANGLING`。三个计数器最后一起输出。注意 `D`/`X`/`P` 后面要读一个整数，`U` 后面没有参数，读事件关键字时用 `scanf(" %c", &op)`（前面的空格会跳过换行）。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAX_VARS 200

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 200) {
        return 0;
    }

    int alive[MAX_VARS + 1] = {0};   /* alive[k] == 1 表示变量 k 还活着 */
    int target = 0;                  /* p 指向的变量编号；0 表示还没指向任何变量 */
    int safe = 0, dangling = 0, wild = 0;

    for (int e = 0; e < n; e++) {
        char op;
        if (scanf(" %c", &op) != 1) {
            return 0;
        }

        int k = 0;
        if (op == 'D' || op == 'X' || op == 'P') {
            if (scanf("%d", &k) != 1 || k < 1 || k > MAX_VARS) {
                return 0;
            }
        }

        if (op == 'D') {
            alive[k] = 1;
        } else if (op == 'X') {
            alive[k] = 0;          /* 只让变量失效，p 保持不变 */
        } else if (op == 'P') {
            target = k;            /* 只改指向，不影响变量存活 */
        } else if (op == 'U') {
            if (target == 0) {
                printf("WILD\n");
                wild++;
            } else if (alive[target]) {
                printf("SAFE\n");
                safe++;
            } else {
                printf("DANGLING\n");
                dangling++;
            }
        } else {
            return 0;
        }
    }

    printf("SAFE=%d DANGLING=%d WILD=%d\n", safe, dangling, wild);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAX_VARS 200

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 200) {
        return 0;
    }

    /* TODO: 维护“p 指向谁”和“每个变量是否还活着”，逐个处理事件并分类每次 U */

    for (int e = 0; e < n; e++) {
        char op;
        if (scanf(" %c", &op) != 1) {
            return 0;
        }
        int k = 0;
        if (op == 'D' || op == 'X' || op == 'P') {
            if (scanf("%d", &k) != 1 || k < 1 || k > MAX_VARS) {
                return 0;
            }
        }
    }

    printf("SAFE=0 DANGLING=0 WILD=0\n");
    return 0;
}
```

## 复杂度
时间 O(n)：每个事件 O(1) 处理。
空间 O(1)：`alive` 数组固定 201 个 `int`。

## 常见错误
### 只看"还有没有变量活着" [WA]
`p` 指向的是**某一个**变量。可能 `p` 指向的变量已经死了，而旁边另一个变量还活着——此时解引用仍然是悬垂指针。必须检查 `alive[target]`，而不是"是否存在任意活着的变量"。
```c file=main.c expect=WA
#include <stdio.h>

#define MAX_VARS 200

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 200) {
        return 0;
    }

    int alive[MAX_VARS + 1] = {0};
    int target = 0;
    int safe = 0, dangling = 0, wild = 0;

    for (int e = 0; e < n; e++) {
        char op;
        if (scanf(" %c", &op) != 1) {
            return 0;
        }
        int k = 0;
        if (op == 'D' || op == 'X' || op == 'P') {
            if (scanf("%d", &k) != 1 || k < 1 || k > MAX_VARS) {
                return 0;
            }
        }

        if (op == 'D') {
            alive[k] = 1;
        } else if (op == 'X') {
            alive[k] = 0;
        } else if (op == 'P') {
            target = k;
        } else if (op == 'U') {
            int any_alive = 0;
            for (int v = 1; v <= MAX_VARS; v++) {
                if (alive[v]) {
                    any_alive = 1;
                }
            }
            if (target == 0) {
                printf("WILD\n");
                wild++;
            } else if (any_alive) {
                printf("SAFE\n");       /* 错：没看 target 自己是否还活着 */
                safe++;
            } else {
                printf("DANGLING\n");
                dangling++;
            }
        }
    }

    printf("SAFE=%d DANGLING=%d WILD=%d\n", safe, dangling, wild);
    return 0;
}
```

### 变量失效时顺手把指针清空 [WA]
`X k` 只表示"变量 `k` 的生命周期结束"，指针 `p` 里的地址并没有消失——它变成悬垂指针。如果在这里把 `target` 清 0，后面的 `U` 会被判成 `WILD`（野指针），而实际上它是 `DANGLING`。野指针是"从未指向过"，悬垂指针是"曾经指向、现在已经失效"，两者要分开统计。
```c file=main.c expect=WA
#include <stdio.h>

#define MAX_VARS 200

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 200) {
        return 0;
    }

    int alive[MAX_VARS + 1] = {0};
    int target = 0;
    int safe = 0, dangling = 0, wild = 0;

    for (int e = 0; e < n; e++) {
        char op;
        if (scanf(" %c", &op) != 1) {
            return 0;
        }
        int k = 0;
        if (op == 'D' || op == 'X' || op == 'P') {
            if (scanf("%d", &k) != 1 || k < 1 || k > MAX_VARS) {
                return 0;
            }
        }

        if (op == 'D') {
            alive[k] = 1;
        } else if (op == 'X') {
            alive[k] = 0;
            if (target == k) {
                target = 0;     /* 错：把悬垂指针变成了“从未赋值” */
            }
        } else if (op == 'P') {
            target = k;
        } else if (op == 'U') {
            if (target == 0) {
                printf("WILD\n");
                wild++;
            } else if (alive[target]) {
                printf("SAFE\n");
                safe++;
            } else {
                printf("DANGLING\n");
                dangling++;
            }
        }
    }

    printf("SAFE=%d DANGLING=%d WILD=%d\n", safe, dangling, wild);
    return 0;
}
```

### 认为"没赋值过的指针等于空指针" [WA]
`U` 出现在任何 `P` 之前时，`p` 是**野指针**，不是空指针：它里面是垃圾值，可能指向任何地方。题目专门把这种情况命名为 `WILD`，就是要和"明确赋值为 `NULL`"区分开。如果把 `target == 0` 当成 `DANGLING` 或 `SAFE`，这类用例都会错。

### 把 `P` 当成"重新定义一个变量" [WA]
`P k` 只改变 `p` 的指向，既不创建也不销毁变量。如果实现成"`P` 时把之前指向的变量标成死亡"，那么示例 1 里 `P 2` 之后的 `U` 就会被误判成 `DANGLING`。

## 测试用例
### 01 sample 示例 1
```in
8
D 1
P 1
U
X 1
U
D 2
P 2
U
```
```out
SAFE
DANGLING
SAFE
SAFE=2 DANGLING=1 WILD=0
```

### 02 sample 示例 2
```in
4
D 1
P 1
X 1
D 2
```
```out
SAFE=0 DANGLING=0 WILD=0
```

### 03 boundary 还没赋值就解引用
```in
5
U
D 1
P 1
U
U
```
```out
WILD
SAFE
SAFE
SAFE=2 DANGLING=0 WILD=1
```

### 04 degenerate 同一个变量被反复解引用
```in
4
D 1
P 1
U
U
```
```out
SAFE
SAFE
SAFE=2 DANGLING=0 WILD=0
```

### 05 trap 外层变量还活着，但指针指的内层已经死了
```in
6
D 1
D 2
P 2
X 2
U
U
```
```out
DANGLING
DANGLING
SAFE=0 DANGLING=2 WILD=0
```

### 06 trap 指针重新指向新对象
```in
7
D 1
P 1
X 1
D 2
P 2
U
U
```
```out
SAFE
SAFE
SAFE=2 DANGLING=0 WILD=0
```

### 07 normal 混合场景
```in
10
D 1
P 1
U
X 1
D 2
P 2
U
X 2
U
U
```
```out
SAFE
SAFE
DANGLING
DANGLING
SAFE=2 DANGLING=2 WILD=0
```

### 08 normal 兄弟变量互不影响
```in
8
D 1
D 2
P 1
X 2
U
X 1
U
U
```
```out
SAFE
DANGLING
DANGLING
SAFE=1 DANGLING=2 WILD=0
```
