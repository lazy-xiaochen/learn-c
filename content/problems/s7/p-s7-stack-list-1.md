---json
{
  "id": "p-s7-stack-list-1",
  "title": "逆波兰计算器：用链表栈求后缀表达式的值与最大深度",
  "difficulty": "L4",
  "knowledgePoints": ["s7-stack-list"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
老式计算器使用**逆波兰式**（后缀表达式）：运算符写在两个操作数后面，不需要括号，也不需要优先级表。例如中缀的 `(3 + 4) * 5` 写成后缀就是 `3 4 + 5 *`。

求值规则只有一条：

> 从左往右读 token：读到整数就压栈；读到一个二元运算符，就连续弹出**两个**数，算出结果再压回栈。最终栈里恰好剩一个数，就是答案。

本题要求你**用单向链表实现这个栈**：每压入一个值就 `malloc` 一个节点，弹出后立即 `free`。这是练习"链表头就是栈顶"和"堆内存所有权"的典型场景。

请特别注意弹出顺序：**先弹出的是右操作数，后弹出的是左操作数**。减法对顺序敏感（`a - b` 和 `b - a` 不是一回事）。

## 输入格式
第一行一个整数 `n`，表示 token 的个数。

接下来 `n` 个 token，用空白分隔（可以跨行）。每个 token 要么是十进制整数（可以带负号），要么是 `+`、`-`、`*` 之一。

输入保证：

- 表达式合法：每个运算符出现时栈里至少有两个数，最终栈里恰好剩一个数；
- 运算过程中所有中间结果与最终结果的绝对值都不超过 10¹⁵，用 `long long` 计算不会溢出。

## 输出格式
三行：

```
result=<最终结果>
depth_max=<求值过程中栈内元素个数的最大值>
ops=<执行的二元运算次数>
```

`depth_max` 统计的是**栈内元素个数**：压入一个数后加一，执行一次运算后减一；每处理完一个 token 记录一次最大值。

## 数据范围
1 ≤ n ≤ 2000
整数 token 的绝对值 ≤ 10⁶
所有中间结果与最终结果的绝对值 ≤ 10¹⁵（`int` 可能溢出，必须用 `long long`）

最大的用例约 2000 个 token，输入不超过 20KB；输出固定三行。

## 示例
### 示例 1
```in
5
3 4 + 5 *
```
```out
result=35
depth_max=2
ops=2
```
> 压入 `3`（深度 1）、`4`（深度 2），遇到 `+` 弹出 `4` 和 `3`、压回 `7`（深度 1）；再压入 `5`（深度 2），遇到 `*` 弹出 `5` 和 `7`、压回 `35`。整个过程中深度最大是 2。

### 示例 2（边界：只有一个 token）
```in
1
-42
```
```out
result=-42
depth_max=1
ops=0
```
> 只有一个操作数、没有任何运算符：`ops=0`，栈深度从压入后一直是 1。负数 token 以 `-` 开头，判断运算符时不能只看首字符，必须确认 token 长度为 1。

## 提示
### 第 1 层
先写一个最普通的链表栈：`push` 在头部插入节点，`pop` 摘掉头节点、取值后 `free`，`size` 跟着增减。主循环里只需要区分两种情况：token 是运算符，或者 token 是整数。

### 第 2 层
判断运算符要同时看长度和字符：`strlen(token) == 1 && (token[0] == '+' || token[0] == '-' || token[0] == '*')`。整数用 `strtoll(token, NULL, 10)` 转换。执行运算时先弹出右操作数、再弹出左操作数：

```c
long long right, left;
if (!stack_pop(&s, &right) || !stack_pop(&s, &left)) { /* 输入不合法 */ }
```

### 第 3 层
每压入一个值（操作数或运算结果）之后，用 `s.size` 更新 `depth_max`；每执行一次运算让 `ops` 加一。最后检查栈里是否正好剩一个元素，弹出它作为结果，再调用 `stack_destroy` 把链表清空。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct Node {
    long long value;
    struct Node *next;
} Node;

typedef struct {
    Node *top;      /* 链表头就是栈顶 */
    int size;
} Stack;

static int stack_push(Stack *s, long long value) {
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->value = value;
    node->next = s->top;
    s->top = node;
    s->size++;
    return 1;
}

static int stack_pop(Stack *s, long long *out) {
    if (s->top == NULL) {
        return 0;
    }
    Node *node = s->top;
    s->top = node->next;
    s->size--;
    *out = node->value;
    free(node);
    return 1;
}

static void stack_destroy(Stack *s) {
    long long value = 0;
    while (stack_pop(s, &value)) {
        /* 一直弹到空，节点就全部释放了 */
    }
}

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1 || n < 1 || n > 2000) {
        return 0;
    }

    Stack s = { NULL, 0 };
    int max_depth = 0;
    int ops = 0;
    int ok = 1;

    for (int i = 0; i < n; i++) {
        char token[32];
        if (scanf("%31s", token) != 1) {
            ok = 0;
            break;
        }

        int is_op = (strlen(token) == 1) &&
                    (token[0] == '+' || token[0] == '-' || token[0] == '*');
        if (is_op) {
            long long right = 0;
            long long left = 0;
            if (!stack_pop(&s, &right) || !stack_pop(&s, &left)) {
                ok = 0;
                break;
            }
            long long value = 0;
            if (token[0] == '+') {
                value = left + right;
            } else if (token[0] == '-') {
                value = left - right;          /* 后弹出的是左操作数 */
            } else {
                value = left * right;
            }
            if (!stack_push(&s, value)) {
                ok = 0;
                break;
            }
            ops++;
        } else {
            long long value = strtoll(token, NULL, 10);
            if (!stack_push(&s, value)) {
                ok = 0;
                break;
            }
        }

        if (s.size > max_depth) {
            max_depth = s.size;
        }
    }

    long long result = 0;
    if (ok && s.size == 1) {
        stack_pop(&s, &result);
    } else {
        ok = 0;
    }
    stack_destroy(&s);

    printf("result=%lld\n", result);
    printf("depth_max=%d\n", max_depth);
    printf("ops=%d\n", ops);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1 || n < 1 || n > 2000) {
        return 0;
    }

    for (int i = 0; i < n; i++) {
        char token[32];
        if (scanf("%31s", token) != 1) {
            return 0;
        }
        /* TODO: 如果是整数，压入链表栈；如果是运算符，弹出两个数、算完再压回去 */
    }

    /* TODO: 维护 depth_max 与 ops，最后弹出唯一的结果 */
    printf("result=0\n");
    printf("depth_max=0\n");
    printf("ops=0\n");
    return 0;
}
```

## 复杂度
时间 O(n)：每个 token 只做常数次指针操作，`push`/`pop` 都是 O(1)。
空间 O(n)：最坏情况下（全部是操作数）栈里有 n 个节点，每个节点一次 `malloc`。

## 常见错误
### 把先弹出的数当成了左操作数 [WA]
`stack_pop` 弹出的是栈顶，也就是**右操作数**。如果把第一次弹出的值存进 `left`，减法就会算反：`1 2 -` 会得到 `1` 而不是 `-1`。加法和乘法因为可交换，样例 1 完全看不出来，只有隐藏用例里的减法能抓住它。

```c file=main.c expect=WA
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct Node {
    long long value;
    struct Node *next;
} Node;

typedef struct {
    Node *top;
    int size;
} Stack;

static int stack_push(Stack *s, long long value) {
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->value = value;
    node->next = s->top;
    s->top = node;
    s->size++;
    return 1;
}

static int stack_pop(Stack *s, long long *out) {
    if (s->top == NULL) {
        return 0;
    }
    Node *node = s->top;
    s->top = node->next;
    s->size--;
    *out = node->value;
    free(node);
    return 1;
}

static void stack_destroy(Stack *s) {
    long long value = 0;
    while (stack_pop(s, &value)) {
    }
}

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    Stack s = { NULL, 0 };
    int max_depth = 0;
    int ops = 0;

    for (int i = 0; i < n; i++) {
        char token[32];
        if (scanf("%31s", token) != 1) {
            break;
        }
        int is_op = (strlen(token) == 1) &&
                    (token[0] == '+' || token[0] == '-' || token[0] == '*');
        if (is_op) {
            long long a = 0;
            long long b = 0;
            stack_pop(&s, &a);
            stack_pop(&s, &b);
            long long value = 0;
            if (token[0] == '+') {
                value = a + b;
            } else if (token[0] == '-') {
                value = a - b;              /* 错：a 是右操作数 */
            } else {
                value = a * b;
            }
            stack_push(&s, value);
            ops++;
        } else {
            stack_push(&s, strtoll(token, NULL, 10));
        }
        if (s.size > max_depth) {
            max_depth = s.size;
        }
    }

    long long result = 0;
    stack_pop(&s, &result);
    stack_destroy(&s);
    printf("result=%lld\n", result);
    printf("depth_max=%d\n", max_depth);
    printf("ops=%d\n", ops);
    return 0;
}
```

### 栈里存 `int`，中间结果溢出 [UB]
题目保证中间结果不超过 10¹⁵，这已经远超 `int` 的范围。如果节点里存 `int`、运算也用 `int`，`1000000 * 1000000` 就是有符号整数溢出——未定义行为，本平台会判 `UB`，而不是"回绕成某个负数"。节点和运算都必须用 `long long`。

```c file=main.c expect=UB
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

typedef struct {
    Node *top;
    int size;
} Stack;

static int stack_push(Stack *s, int value) {
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return 0;
    }
    node->value = value;
    node->next = s->top;
    s->top = node;
    s->size++;
    return 1;
}

static int stack_pop(Stack *s, int *out) {
    if (s->top == NULL) {
        return 0;
    }
    Node *node = s->top;
    s->top = node->next;
    s->size--;
    *out = node->value;
    free(node);
    return 1;
}

static void stack_destroy(Stack *s) {
    int value = 0;
    while (stack_pop(s, &value)) {
    }
}

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    Stack s = { NULL, 0 };
    int max_depth = 0;
    int ops = 0;

    for (int i = 0; i < n; i++) {
        char token[32];
        if (scanf("%31s", token) != 1) {
            break;
        }
        int is_op = (strlen(token) == 1) &&
                    (token[0] == '+' || token[0] == '-' || token[0] == '*');
        if (is_op) {
            int right = 0;
            int left = 0;
            stack_pop(&s, &right);
            stack_pop(&s, &left);
            int value = 0;
            if (token[0] == '+') {
                value = left + right;
            } else if (token[0] == '-') {
                value = left - right;
            } else {
                value = left * right;       /* 错：int 相乘会溢出 */
            }
            stack_push(&s, value);
            ops++;
        } else {
            stack_push(&s, (int)strtoll(token, NULL, 10));
        }
        if (s.size > max_depth) {
            max_depth = s.size;
        }
    }

    int result = 0;
    stack_pop(&s, &result);
    stack_destroy(&s);
    printf("result=%d\n", result);
    printf("depth_max=%d\n", max_depth);
    printf("ops=%d\n", ops);
    return 0;
}
```

### 把 `depth_max` 记成了处理过的 token 数 [WA]
`depth_max` 是"栈内元素个数的最大值"，不是 token 总数。每读一个 token 就加一，会让 `3 4 + 5 *` 输出 5 而不是 2。正确做法是在每次**压栈成功之后**用 `s.size` 更新最大值。

### 弹出节点后忘了 `free` [LEAK]
`pop` 把节点从链上摘下来之后，那块堆内存就没有任何指针指向它了。本题的判题器不检查泄漏（`checkLeaks=false`），所以这种代码可能"输出全对"，但 `pop` 必须是"摘链 → 取值 → `free`"，否则每弹一次就泄漏一个节点。

## 测试用例
### 01 sample 示例 1
```in
5
3 4 + 5 *
```
```out
result=35
depth_max=2
ops=2
```

### 02 sample 示例 2
```in
1
-42
```
```out
result=-42
depth_max=1
ops=0
```

### 03 degenerate 只有一个减法
```in
3
1 2 -
```
```out
result=-1
depth_max=2
ops=1
```

### 04 trap 两个减法嵌套，深度达到 3
```in
7
2 3 - 4 5 - *
```
```out
result=1
depth_max=3
ops=3
```

### 05 trap 减法与乘法的顺序
```in
5
10 3 - 7 *
```
```out
result=49
depth_max=2
ops=2
```

### 06 normal 加、乘、减混合
```in
9
2 3 4 * + 5 - 10 +
```
```out
result=19
depth_max=3
ops=4
```

### 07 trap 大数相乘必须用 long long
```in
3
1000000 1000000 *
```
```out
result=1000000000000
depth_max=2
ops=1
```

### 生成 boundary 1000 个操作数加 999 次加法
```js gen
const cases = [];

function evaluate(tokens) {
  const stack = [];
  let maxDepth = 0;
  let ops = 0;
  for (const token of tokens) {
    if (token === '+' || token === '-' || token === '*') {
      const right = stack.pop();
      const left = stack.pop();
      let value;
      if (token === '+') value = left + right;
      else if (token === '-') value = left - right;
      else value = left * right;
      stack.push(value);
      ops++;
    } else {
      stack.push(BigInt(token));
    }
    if (stack.length > maxDepth) maxDepth = stack.length;
  }
  return `result=${stack[0]}\ndepth_max=${maxDepth}\nops=${ops}\n`;
}

const tokens = [];
for (let i = 0; i < 1000; i++) tokens.push('1');
for (let i = 0; i < 999; i++) tokens.push('+');
cases.push({
  kind: 'boundary',
  category: '1999 个 token：1000 个操作数 + 999 次加法',
  input: `${tokens.length}\n${tokens.join(' ')}\n`,
  output: evaluate(tokens),
});

return cases;
```
