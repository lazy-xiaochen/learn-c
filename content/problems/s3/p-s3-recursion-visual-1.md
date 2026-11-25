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
