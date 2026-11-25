---json
{
  "id": "p-s7-stack-array-2",
  "title": "括号匹配：用数组栈检查三种括号并统计最大嵌套深度",
  "difficulty": "L4",
  "knowledgePoints": ["s7-stack-array"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
括号匹配是数组栈最经典的应用：遇到左括号就压栈，遇到右括号就弹出栈顶，看它是不是对应的左括号。**栈保存的不只是"还有几个左括号没关上"，还保存了它们的类型和顺序**——这正是只看计数器会出错的原因。

请你读入一个只由 `(` `)` `[` `]` `{` `}` 组成的字符串，从左到右扫描，按下面的规则统计：

1. 遇到左括号：压栈，并用当前栈的高度更新"最大嵌套深度" `depth`；
2. 遇到右括号：如果**栈为空**，或者**栈顶的左括号与它不配对**，就记下这个右括号的位置（1 起算，只记第一次）并**立即停止扫描**；否则弹出栈顶，继续；
3. 扫描结束后：`ok` 为真当且仅当"从未遇到不匹配的右括号，且栈恰好为空"；`unmatched` 是此时栈里还剩几个左括号。

## 输入格式
一行，一个长度在 1–10000 之间的字符串，只包含 `(` `)` `[` `]` `{` `}`，不含空格。

## 输出格式
四行：

```
ok=YES|NO
depth=<扫描过程中的最大栈高度>
unmatched=<扫描结束时栈里的元素个数>
first_bad=<第一个不匹配的右括号的位置（1 起算）；没有则 -1>
```

## 数据范围
1 ≤ 字符串长度 ≤ 10000
字符只可能是 `(` `)` `[` `]` `{` `}`

最大嵌套深度可达 10000（一万个左括号），栈的容量必须按这个上限准备；输出恒为 4 行。

## 示例
### 示例 1
```in
{[()()]}
```
```out
ok=YES
depth=3
unmatched=0
first_bad=-1
```
> 扫描过程：`{` 深度 1，`[` 深度 2，`(` 深度 3，`)` 弹出，`(` 又压到深度 3，`)` 弹出，`]` 弹出，`}` 弹出。全程没有不匹配的右括号，结束时栈为空，所以 `ok=YES`、`depth=3`、`unmatched=0`。

### 示例 2（边界：只有一对括号）
```in
[]
```
```out
ok=YES
depth=1
unmatched=0
first_bad=-1
```
> 只有一层嵌套：`depth=1`，匹配成功，`unmatched=0`、`first_bad=-1`。空串不会出现（长度至少为 1）。

## 提示
### 第 1 层
把"左括号的字符"压进栈里，这样弹出时就能直接和当前的右括号比较。三种配对关系是 `(`↔`)`、`[`↔`]`、`{`↔`}`，写一个小的辅助函数把右括号映射成它对应的左括号，比较时只看这一个字符。

### 第 2 层
扫描循环里有两处必须小心：① 右括号来时先判 `top == 0`，否则会读到 `stack[-1]`（栈下溢）；② 一旦发现不匹配就 **`break`**，后面的字符不再参与统计——`depth` 和 `unmatched` 都停在那一刻的值上。

### 第 3 层
`ok` 的条件是两个而不是一个：`first_bad < 0 && top == 0`。只有"没遇到错配"不够，`(((` 这种没有错配、但结束时栈里还剩 3 个左括号，也必须判 `NO`。数组栈的容量开到 10000 即可（`char stack[10000]`），一万个左括号刚好放得下。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAXLEN 10000

int main(void) {
    char text[MAXLEN + 1];
    if (scanf("%10000s", text) != 1) {
        return 0;
    }

    char stack[MAXLEN];          /* 最大深度就是 10000，刚好放得下 */
    int top = 0;                 /* 约定 B：下一个空位，也是元素个数 */
    int depth = 0;
    int first_bad = -1;

    for (int i = 0; text[i] != '\0'; i++) {
        char c = text[i];
        if (c == '(' || c == '[' || c == '{') {
            stack[top] = c;
            top++;
            if (top > depth) {
                depth = top;
            }
        } else {
            char want = '\0';
            if (c == ')') {
                want = '(';
            } else if (c == ']') {
                want = '[';
            } else if (c == '}') {
                want = '{';
            } else {
                continue;
            }
            if (top == 0 || stack[top - 1] != want) {
                first_bad = i + 1;   /* 位置从 1 起算 */
                break;               /* 立即停止，后面的字符不再统计 */
            }
            top--;
        }
    }

    printf("ok=%s\n", (first_bad < 0 && top == 0) ? "YES" : "NO");
    printf("depth=%d\n", depth);
    printf("unmatched=%d\n", top);
    printf("first_bad=%d\n", first_bad);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAXLEN 10000

int main(void) {
    char text[MAXLEN + 1];
    if (scanf("%10000s", text) != 1) {
        return 0;
    }

    /* TODO: 用数组栈扫描 text：
       左括号入栈并更新 depth；
       右括号检查栈顶是否配对，不配对待 first_bad 记录位置并停止；
       最后按 first_bad 和栈是否为空输出 ok。 */
    printf("ok=YES\n");
    printf("depth=0\n");
    printf("unmatched=0\n");
    printf("first_bad=-1\n");
    return 0;
}
```

## 复杂度
只扫描一遍字符串，每个字符最多入栈一次、出栈一次，时间 O(n)；栈是 `char` 数组，空间 O(n)，最大 10KB。
n ≤ 10000，时间和空间都绰绰有余。

## 常见错误
### 只用计数器判断是否平衡 [WA]
只维护"左括号数 − 右括号数"，`([)]` 会被算成平衡（数量确实相等），但它不是正确的括号序列——`(` 还没关闭就来了 `)`，而栈里最上面那个是 `[`。只有栈能记住"最近的左括号是什么类型"，计数器不能。

```c file=main.c expect=WA
#include <stdio.h>

#define MAXLEN 10000

int main(void) {
    char text[MAXLEN + 1];
    if (scanf("%10000s", text) != 1) {
        return 0;
    }

    int cur = 0;                 /* 错：只数数量，不记类型 */
    int depth = 0;
    int first_bad = -1;
    for (int i = 0; text[i] != '\0'; i++) {
        char c = text[i];
        if (c == '(' || c == '[' || c == '{') {
            cur++;
            if (cur > depth) {
                depth = cur;
            }
        } else if (cur == 0) {
            if (first_bad < 0) {
                first_bad = i + 1;
            }
        } else {
            cur--;
        }
    }

    printf("ok=%s\n", (first_bad < 0 && cur == 0) ? "YES" : "NO");
    printf("depth=%d\n", depth);
    printf("unmatched=%d\n", cur);
    printf("first_bad=%d\n", first_bad);
    return 0;
}
```

### 栈的容量开得太小 [RE|UB]
```c
char stack[100];        /* 错：题目最多一万个左括号 */
```
一万个 `(` 会把栈撑爆：UBSan 先报"数组下标越界"（`UB`），再往后越过红区时 ASan 还会报 `stack-buffer-overflow`（`RE`）。数组栈的容量必须按**最坏情况**（这里是最长长度）准备，而不是按样例的数据准备。

```c file=main.c expect=RE|UB
#include <stdio.h>

#define MAXLEN 10000

int main(void) {
    char text[MAXLEN + 1];
    if (scanf("%10000s", text) != 1) {
        return 0;
    }

    char stack[100];             /* 错：容量远小于最大深度 */
    int top = 0;
    int depth = 0;
    int first_bad = -1;

    for (int i = 0; text[i] != '\0'; i++) {
        char c = text[i];
        if (c == '(' || c == '[' || c == '{') {
            stack[top] = c;
            top++;
            if (top > depth) {
                depth = top;
            }
        } else {
            char want = '\0';
            if (c == ')') {
                want = '(';
            } else if (c == ']') {
                want = '[';
            } else if (c == '}') {
                want = '{';
            } else {
                continue;
            }
            if (top == 0 || stack[top - 1] != want) {
                first_bad = i + 1;
                break;
            }
            top--;
        }
    }

    printf("ok=%s\n", (first_bad < 0 && top == 0) ? "YES" : "NO");
    printf("depth=%d\n", depth);
    printf("unmatched=%d\n", top);
    printf("first_bad=%d\n", first_bad);
    return 0;
}
```

### 遇到右括号时没有先判空栈 [RE|UB]
```c
if (stack[top - 1] != want) {   /* top == 0 时读的是 stack[-1] */
```
栈下溢：读到了数组下界之外的内存。输入以 `)` 开头就会触发。判空必须写在所有 `stack[top - 1]` 之前，写成 `if (top == 0 || stack[top - 1] != want)`——`||` 的短路保证后面那句不会被执行。

```c file=main.c expect=RE|UB
#include <stdio.h>

#define MAXLEN 10000

int main(void) {
    char text[MAXLEN + 1];
    if (scanf("%10000s", text) != 1) {
        return 0;
    }

    char stack[MAXLEN];
    int top = 0;
    int depth = 0;
    int first_bad = -1;

    for (int i = 0; text[i] != '\0'; i++) {
        char c = text[i];
        if (c == '(' || c == '[' || c == '{') {
            stack[top] = c;
            top++;
            if (top > depth) {
                depth = top;
            }
        } else {
            char want = '\0';
            if (c == ')') {
                want = '(';
            } else if (c == ']') {
                want = '[';
            } else if (c == '}') {
                want = '{';
            } else {
                continue;
            }
            if (stack[top - 1] != want) {    /* 错：没有先判 top == 0 */
                first_bad = i + 1;
                break;
            }
            top--;
        }
    }

    printf("ok=%s\n", (first_bad < 0 && top == 0) ? "YES" : "NO");
    printf("depth=%d\n", depth);
    printf("unmatched=%d\n", top);
    printf("first_bad=%d\n", first_bad);
    return 0;
}
```

### first_bad 记成了 0 起算的下标 [WA]
题目要求 1 起算的位置，写成 `first_bad = i;` 会整体差一。`i` 是数组下标（0 起），人读的位置是 `i + 1`。这类"差一"不会让程序崩溃，只会让所有带不匹配的用例全部 `WA`。

### 发现不匹配后没有停止扫描 [WA]
`break` 少了，后面的字符会继续参与 `depth` 的计算，`depth` 可能变得比"停止那一刻"更大，`unmatched` 也会被后续字符改掉。题目定义的是"**立即停止**"，停止之后的字符一律不计入任何统计。

## 测试用例
### 01 sample 示例 1
```in
{[()()]}
```
```out
ok=YES
depth=3
unmatched=0
first_bad=-1
```

### 02 sample 示例 2
```in
[]
```
```out
ok=YES
depth=1
unmatched=0
first_bad=-1
```

### 03 degenerate 以右括号开头，栈一直是空的
```in
)
```
```out
ok=NO
depth=0
unmatched=0
first_bad=1
```

### 04 trap 数量相等但顺序不对
```in
([)]
```
```out
ok=NO
depth=2
unmatched=2
first_bad=3
```

### 05 trap 只有左括号，永远关不上
```in
((((
```
```out
ok=NO
depth=4
unmatched=4
first_bad=-1
```

### 06 normal 三对并列的括号
```in
()[]{}
```
```out
ok=YES
depth=1
unmatched=0
first_bad=-1
```

### 生成 boundary 一万个左括号的最大深度
```js gen
const cases = [];

function render(text) {
  const stack = [];
  let top = 0;
  let depth = 0;
  let firstBad = -1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '(' || c === '[' || c === '{') {
      stack.push(c);
      top++;
      if (top > depth) depth = top;
    } else {
      const want = c === ')' ? '(' : c === ']' ? '[' : '{';
      if (top === 0 || stack[top - 1] !== want) {
        firstBad = i + 1;
        break;
      }
      stack.pop();
      top--;
    }
  }
  return [
    `ok=${firstBad < 0 && top === 0 ? 'YES' : 'NO'}`,
    `depth=${depth}`,
    `unmatched=${top}`,
    `first_bad=${firstBad}`,
  ].join('\n') + '\n';
}

/* 10000 个左括号：深度打满，且永远关不上 */
{
  const text = '('.repeat(10000);
  cases.push({
    kind: 'boundary',
    category: '一万个左括号，深度 10000',
    input: text + '\n',
    output: render(text),
  });
}

return cases;
```

### 生成 normal 五千对嵌套括号
```js gen
const cases = [];

function render(text) {
  const stack = [];
  let top = 0;
  let depth = 0;
  let firstBad = -1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '(' || c === '[' || c === '{') {
      stack.push(c);
      top++;
      if (top > depth) depth = top;
    } else {
      const want = c === ')' ? '(' : c === ']' ? '[' : '{';
      if (top === 0 || stack[top - 1] !== want) {
        firstBad = i + 1;
        break;
      }
      stack.pop();
      top--;
    }
  }
  return [
    `ok=${firstBad < 0 && top === 0 ? 'YES' : 'NO'}`,
    `depth=${depth}`,
    `unmatched=${top}`,
    `first_bad=${firstBad}`,
  ].join('\n') + '\n';
}

/* 5000 个 '(' 后跟 5000 个 ')'：长度打满，深度 5000，完全配对 */
{
  const text = '('.repeat(5000) + ')'.repeat(5000);
  cases.push({
    kind: 'normal',
    category: '5000 对嵌套括号，长度 10000',
    input: text + '\n',
    output: render(text),
  });
}

return cases;
```

### 生成 trap 长串在第五千零一个字符处才出错
```js gen
const cases = [];

function render(text) {
  const stack = [];
  let top = 0;
  let depth = 0;
  let firstBad = -1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '(' || c === '[' || c === '{') {
      stack.push(c);
      top++;
      if (top > depth) depth = top;
    } else {
      const want = c === ')' ? '(' : c === ']' ? '[' : '{';
      if (top === 0 || stack[top - 1] !== want) {
        firstBad = i + 1;
        break;
      }
      stack.pop();
      top--;
    }
  }
  return [
    `ok=${firstBad < 0 && top === 0 ? 'YES' : 'NO'}`,
    `depth=${depth}`,
    `unmatched=${top}`,
    `first_bad=${firstBad}`,
  ].join('\n') + '\n';
}

/* 5000 个 '(' 之后来了一个 ']'：位置 5001 出错，深度停在 5000 */
{
  const text = '('.repeat(5000) + ']' + '((('.repeat(10);
  cases.push({
    kind: 'trap',
    category: '第 5001 个字符才出现类型不匹配',
    input: text + '\n',
    output: render(text),
  });
}

return cases;
```
