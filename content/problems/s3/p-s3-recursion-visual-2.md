---json
{
  "id": "p-s3-recursion-visual-2",
  "title": "递归中的栈快照：每进入一层，打印当前整条调用链",
  "difficulty": "L3",
  "knowledgePoints": ["s3-recursion-visual"],
  "special": "pointer-reasoning",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
"看见递归"最直接的方式，是在**每进入一层**时把当前整条栈上的参数打印出来：栈上此刻是从 `main` 到当前帧的每一个 `n`。

C 语言没有遍历真实调用栈的语法，所以这个程序用一个小数组当**影子栈**：`ns[depth]` 存第 `depth` 层的参数。每进入一层就写自己的那一格，然后把 `ns[0]` 到 `ns[depth]` 依次打印出来。

```c
static int ns[64];                 /* 影子栈：ns[d] 是第 d 层的参数 */
static int frames;                 /* 一共建立了多少个帧 */
static int max_depth;              /* 最大深度，根帧的深度是 0 */

static void visit(int n, int depth) {
    ns[depth] = n;                 /* 本层占住自己那一格 */
    frames++;
    if (depth > max_depth) {
        max_depth = depth;
    }
    printf("enter");               /* 打印从根到本层的整条链 */
    for (int i = 0; i <= depth; i++) {
        printf(" %d", ns[i]);
    }
    printf("\n");
    if (n > 1) {
        visit(n / 2, depth + 1);
        visit(n - n / 2, depth + 1);
    }
}
```

`main` 里读入 `n`，执行 `visit(n, 0)`，最后输出一行 `frames=<总帧数> maxdepth=<最大深度>`。

给定 `n`，请你输出这段程序的**完整输出**。

注意几个容易想当然的地方：

1. 影子栈**按下标覆盖**，不是追加：第二棵子树会用新的值覆盖第一棵子树留下的更深格子，所以打印出来的永远是"当前这条链"，不会包含已经返回的兄弟；
2. `maxdepth` 是**深度**，根帧是 0，不是层数；
3. 两个子调用是 `n / 2` 和 `n - n / 2`，`n` 为奇数时两者不相等；
4. 影子栈的链只能说明"祖先是谁"，说明不了"是第几个帧"——两条不同分支可能打印出一模一样的链。

## 输入格式
一行一个整数 `n`。

## 输出格式
输出该程序的完整标准输出：每建立一个帧输出一行 `enter <n0> <n1> ... <nd>`（从根到本层，用单个空格分隔），最后一行 `frames=<总帧数> maxdepth=<最大深度>`。

## 数据范围
1 ≤ n ≤ 100
帧数最多 2n - 1 = 199，每行最多 8 个数，输出远小于 64KB
最大深度不超过 7，影子栈开 64 格绰绰有余

## 示例
### 示例 1
```in
5
```
```out
enter 5
enter 5 2
enter 5 2 1
enter 5 2 1
enter 5 3
enter 5 3 1
enter 5 3 2
enter 5 3 2 1
enter 5 3 2 1
frames=9 maxdepth=3
```
> 前 4 行属于根的左子树（`5 → 2`），第 5 行开始是右子树：注意它是 `enter 5 3`，**没有**把左子树的 `2` 带进来，因为 `ns[1]` 被 `3` 覆盖了。最后两行 `enter 5 3 2 1` 是 `5 → 3 → 2` 这一层的两个 `n = 1` 孩子，它们的链完全相同——光看链分不出这是两个不同的帧。

### 示例 2（边界：只有根帧）
```in
1
```
```out
enter 1
frames=1 maxdepth=0
```
> `n = 1` 不再递归：只建立一个帧，链只有根自己。`maxdepth` 是 0（根帧的深度），不是 1。

## 提示
### 第 1 层
先照抄这段逻辑跑通：`ns[depth] = n` 是"占格"，`for (i = 0; i <= depth; i++)` 是"打印整条链"。不要自己去推每一行，让程序算。

### 第 2 层
关键是理解 `ns[depth] = n` 这行：它只改自己那一格，不会清除更深的格子。更深格子里残留的是上一次访问留下的值，但打印时只到 `depth`，所以看不见它们——这就是"影子栈 = 当前链"的原因。

### 第 3 层
统计量只有两个：`frames` 每建立一帧加 1（最终是 `2n-1`），`maxdepth` 用当前深度更新（注意初始是 0、根帧深度也是 0）。`n` 为奇数时先走 `n/2`、再走 `n-n/2`，两条路的形状不同，链的长度也不同。

## 参考代码
```c file=main.c
#include <stdio.h>

static int ns[64];
static int frames;
static int max_depth;

static void visit(int n, int depth) {
    ns[depth] = n;                 /* 影子栈：记录本层的参数 */
    frames++;
    if (depth > max_depth) {
        max_depth = depth;
    }
    printf("enter");
    for (int i = 0; i <= depth; i++) {
        printf(" %d", ns[i]);
    }
    printf("\n");
    if (n > 1) {
        visit(n / 2, depth + 1);
        visit(n - n / 2, depth + 1);
    }
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }
    visit(n, 0);
    printf("frames=%d maxdepth=%d\n", frames, max_depth);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

static int ns[64];
static int frames;
static int max_depth;

static void visit(int n, int depth) {
    ns[depth] = n;
    frames++;
    /* TODO: 用 depth 更新 max_depth */

    /* TODO: 打印 "enter" 和从 ns[0] 到 ns[depth] 的整条链 */
    printf("enter %d\n", n);

    if (n > 1) {
        visit(n / 2, depth + 1);
        visit(n - n / 2, depth + 1);
    }
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }
    visit(n, 0);
    printf("frames=%d maxdepth=%d\n", frames, max_depth);
    return 0;
}
```

## 复杂度
时间 O(n)：帧数为 `2n - 1`，每帧打印不超过 8 个数。
空间 O(log n)：递归深度最多 7 层；影子栈是 64 个 `int` 的全局数组，不占栈。

## 常见错误
### 用"append"代替"按下标覆盖" [WA]
把影子栈写成 `ns[count++] = n`（访问一个记一个），链就会不断变长，把已经返回的兄弟节点也带进来。正确的是 `ns[depth] = n`：深度就是下标，返回后更深的位置会被下一棵子树覆盖。

```c file=main.c expect=WA
#include <stdio.h>

static int ns[256];
static int count;                  /* 错：把影子栈当成了"访问记录"，只加不减 */
static int frames;
static int max_depth;

static void visit(int n, int depth) {
    ns[count++] = n;
    frames++;
    if (depth > max_depth) {
        max_depth = depth;
    }
    printf("enter");
    for (int i = 0; i < count; i++) {
        printf(" %d", ns[i]);
    }
    printf("\n");
    if (n > 1) {
        visit(n / 2, depth + 1);
        visit(n - n / 2, depth + 1);
    }
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    visit(n, 0);
    printf("frames=%d maxdepth=%d\n", frames, max_depth);
    return 0;
}
```

### 用一个全局变量保存"当前参数" [WA]
全局变量只有一份，递归的每一层都会覆盖它。打印时取到的永远是最后一次写入的值，链根本拼不出来。

```c file=main.c expect=WA
#include <stdio.h>

static int current;                /* 错：只有一份，被所有层共用 */
static int frames;
static int max_depth;

static void visit(int n, int depth) {
    current = n;
    frames++;
    if (depth > max_depth) {
        max_depth = depth;
    }
    printf("enter");
    for (int i = 0; i <= depth; i++) {
        printf(" %d", current);    /* 每一格都是同一个值 */
    }
    printf("\n");
    if (n > 1) {
        visit(n / 2, depth + 1);
        visit(n - n / 2, depth + 1);
    }
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    visit(n, 0);
    printf("frames=%d maxdepth=%d\n", frames, max_depth);
    return 0;
}
```

### maxdepth 记成"层数" [WA]
根帧的深度是 0，`maxdepth` 输出的是深度而不是层数。写成 `depth + 1`（或者从 1 开始计深度）会让最后一行整体大 1。

```c file=main.c expect=WA
#include <stdio.h>

static int ns[64];
static int frames;
static int max_depth;

static void visit(int n, int depth) {
    ns[depth] = n;
    frames++;
    if (depth + 1 > max_depth) {       /* 错：把层数当成了深度 */
        max_depth = depth + 1;
    }
    printf("enter");
    for (int i = 0; i <= depth; i++) {
        printf(" %d", ns[i]);
    }
    printf("\n");
    if (n > 1) {
        visit(n / 2, depth + 1);
        visit(n - n / 2, depth + 1);
    }
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    visit(n, 0);
    printf("frames=%d maxdepth=%d\n", frames, max_depth);
    return 0;
}
```

### 想用真实地址代替影子栈 [WA]
有人会想"直接遍历真实栈不就行了"：C 语言没有可移植的办法；`__builtin_frame_address(k)` 也只能在当前函数里回溯，而且地址数值随 ASLR、编译选项、ASan 插桩变化，根本没法作为输出。影子栈不是"退而求其次"，而是唯一稳定、可判题的做法。

### 忘记 `n = 1` 不再递归 [WA]
`if (n > 1)` 这个条件决定了叶子帧。写成 `if (n > 0)` 会让 `n = 1` 继续递归出两个 `n = 0`、`n = 1` 的孩子，帧数和链长都会爆炸（而且 `n - n/2` 对 0 没有意义）。边界用例 `n = 1` 专门抓这个。

## 测试用例
### 01 sample 示例 1
```in
5
```
```out
enter 5
enter 5 2
enter 5 2 1
enter 5 2 1
enter 5 3
enter 5 3 1
enter 5 3 2
enter 5 3 2 1
enter 5 3 2 1
frames=9 maxdepth=3
```

### 02 sample 示例 2
```in
1
```
```out
enter 1
frames=1 maxdepth=0
```

### 03 degenerate 根的两个孩子都是 1
```in
2
```
```out
enter 2
enter 2 1
enter 2 1
frames=3 maxdepth=1
```

### 04 trap 奇数分裂：7 分成 3 和 4
```in
7
```
```out
enter 7
enter 7 3
enter 7 3 1
enter 7 3 2
enter 7 3 2 1
enter 7 3 2 1
enter 7 4
enter 7 4 2
enter 7 4 2 1
enter 7 4 2 1
enter 7 4 2
enter 7 4 2 1
enter 7 4 2 1
frames=13 maxdepth=3
```

### 05 trap 8 是 2 的幂，链的形状很整齐
```in
8
```
```out
enter 8
enter 8 4
enter 8 4 2
enter 8 4 2 1
enter 8 4 2 1
enter 8 4 2
enter 8 4 2 1
enter 8 4 2 1
enter 8 4
enter 8 4 2
enter 8 4 2 1
enter 8 4 2 1
enter 8 4 2
enter 8 4 2 1
enter 8 4 2 1
frames=15 maxdepth=3
```
> `8` 的两个孩子都是 `4`；每个 `4` 的两个孩子都是 `2`；每个 `2` 的两个孩子都是 `1`。所以第 9 行的 `enter 8 4` 是根的第二个孩子——它和第一棵子树打印的链一模一样，光看链分不出这是两个不同的帧。

### 生成 boundary 最大规模 n = 100
```js gen
function trace(n) {
  const ns = [];
  let frames = 0;
  let maxDepth = 0;
  const lines = [];
  function visit(x, depth) {
    ns[depth] = x;
    frames++;
    if (depth > maxDepth) maxDepth = depth;
    lines.push('enter ' + ns.slice(0, depth + 1).join(' '));
    if (x > 1) {
      visit(Math.floor(x / 2), depth + 1);
      visit(x - Math.floor(x / 2), depth + 1);
    }
  }
  visit(n, 0);
  lines.push(`frames=${frames} maxdepth=${maxDepth}`);
  return lines.join('\n') + '\n';
}
return [{
  kind: 'boundary',
  category: 'n = 100，帧数 199',
  input: '100\n',
  output: trace(100),
}];
```

### 生成 trap n = 99 与 n = 63 的奇数分裂
```js gen
function trace(n) {
  const ns = [];
  let frames = 0;
  let maxDepth = 0;
  const lines = [];
  function visit(x, depth) {
    ns[depth] = x;
    frames++;
    if (depth > maxDepth) maxDepth = depth;
    lines.push('enter ' + ns.slice(0, depth + 1).join(' '));
    if (x > 1) {
      visit(Math.floor(x / 2), depth + 1);
      visit(x - Math.floor(x / 2), depth + 1);
    }
  }
  visit(n, 0);
  lines.push(`frames=${frames} maxdepth=${maxDepth}`);
  return lines.join('\n') + '\n';
}
return [99, 63].map((n) => ({
  kind: 'trap',
  category: `n = ${n}，奇数分裂`,
  input: `${n}\n`,
  output: trace(n),
}));
```

### 生成 normal 随机 n
```js gen
function trace(n) {
  const ns = [];
  let frames = 0;
  let maxDepth = 0;
  const lines = [];
  function visit(x, depth) {
    ns[depth] = x;
    frames++;
    if (depth > maxDepth) maxDepth = depth;
    lines.push('enter ' + ns.slice(0, depth + 1).join(' '));
    if (x > 1) {
      visit(Math.floor(x / 2), depth + 1);
      visit(x - Math.floor(x / 2), depth + 1);
    }
  }
  visit(n, 0);
  lines.push(`frames=${frames} maxdepth=${maxDepth}`);
  return lines.join('\n') + '\n';
}
const cases = [];
for (let k = 0; k < 3; k++) {
  const n = rng.int(4, 100);
  cases.push({
    kind: 'normal',
    category: `随机 n = ${n}`,
    input: `${n}\n`,
    output: trace(n),
  });
}
return cases;
```
