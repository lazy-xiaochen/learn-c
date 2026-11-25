---json
{
  "id": "p-s6-fopen-fclose-2",
  "title": "FILE* 生命周期推理：判空、关闭、重复关闭与悬垂指针",
  "difficulty": "L4",
  "knowledgePoints": ["s6-fopen-fclose"],
  "special": "pointer-reasoning",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一次代码评审里，同事们对一个日志模块里的 `FILE *fp` 争论不休：

- 有人说"`fclose` 之后 `fp` 就变成 `NULL` 了，再判空就安全"；
- 有人说"`fclose(NULL)` 什么都不做，多调一次没关系"；
- 有人说"重复 `fclose` 最多报个错，不会有事"。

本题把这段代码抽象成一个**可推演的状态机**，请写程序模拟一个 `FILE *` 变量在一串操作之后的取值与每一次调用的结果，从而把上面三种说法逐一证伪。

模型只有**一个** `FILE *fp` 变量，它的状态有三种：

| 状态 | 含义 |
|---|---|
| `null` | 从没成功打开过，或 `fopen` 失败，或被显式置空 |
| `open` | 指向一个打开着的流，可以读写 |
| `closed` | `fclose` 之后：流已回收，但指针**仍然保存着旧地址**（悬垂指针） |

五种操作的含义（严格按下面规则执行，不要引入其它判断）：

- `open <文件名>`：执行 `fp = fopen(文件名, "r")`。文件名在"存在的文件"列表里 → 状态变为 `open`，本次结果为 `open`；否则 `fopen` 返回 `NULL`，状态变为 `null`，结果为 `null`。（本题不考察"覆盖一个已打开的流"造成的泄漏，模型规定 `open` 直接替换旧状态。）
- `use`：执行 `fgetc(fp)`。状态 `open` → `ok`；`null` → `null-deref`；`closed` → `use-after-close`。
- `close`：执行 `fclose(fp)`。状态 `open` → 状态变为 `closed`，结果 `ok`；`null` → `fclose-null`；`closed` → `double-close`。
- `check`：执行 `if (fp == NULL)`。状态 `null` → `null`；`open` 或 `closed` → `non-null`（注意：`closed` 时判空**也通不过**）。
- `clear`：执行 `fp = NULL;`。状态变为 `null`，结果 `null`。

其中 `null-deref`、`use-after-close`、`fclose-null`、`double-close` 四种结果都是**未定义行为**，程序要把它们计入错误次数。

## 输入格式
- 第 1 行：整数 `n`（操作个数）；
- 第 2 行：整数 `k`，后面跟 `k` 个"存在的文件名"（`k = 0` 时这一行只有一个 `0`）；
- 接下来 `n` 行：每行一个操作，格式为 `open <文件名>`、`use`、`close`、`check`、`clear` 之一。

保证：文件名只含字母、数字、`.`、`_`、`-`，长度 1..20，文件名之间以及与操作名之间都用一个空格分隔。

## 输出格式
对每个操作输出一行：`<序号> <操作名> -> <结果>`，序号从 1 开始，操作名就是输入里的那个词（`open` 不带文件名）。

然后输出两行：

- `errors <m>`：结果为 `null-deref`、`use-after-close`、`fclose-null`、`double-close` 的操作个数；
- `final <状态>`：全部操作结束后 `fp` 的状态，取 `null`、`open`、`closed` 之一。

## 数据范围
- `1 ≤ n ≤ 100`；
- `0 ≤ k ≤ 10`；
- 每行操作不超过 30 个字符；
- 输出最多 102 行，远小于 64KB。

## 示例
### 示例 1
```in
6
1 app.log
open app.log
use
close
use
close
check
```
```out
1 open -> open
2 use -> ok
3 close -> ok
4 use -> use-after-close
5 close -> double-close
6 check -> non-null
errors 2
final closed
```
> 第 4 步：`fclose` 之后指针仍是旧地址，再 `use` 就是**使用已关闭的流**。第 5 步是**重复关闭**。第 6 步最关键：`fp` 不是 `NULL`，所以 `if (fp == NULL)` 拦不住第 4、5 步的错误——这正是"关闭后置空"必须手写的原因。

### 示例 2（边界：只有一个操作）
```in
1
0
check
```
```out
1 check -> null
errors 0
final null
```
> 初始状态就是 `null`：从没打开过。此时判空是真，任何 `use` 都会 `null-deref`，任何 `close` 都会 `fclose-null`。这是最小规模，`n = 1`。

## 提示
### 第 1 层
先只跟踪一个字符：`fp` 现在指向什么？"没打开"、"打开着"、"关过了"是三种不同的情况，`fclose` 只把第二种变成第三种，**不会**把它变成第一种。

### 第 2 层
`check` 只问"指针是不是 `NULL`"，不问"指向的东西还能不能用"。`fclose` 不改指针的值，所以 `closed` 状态下判空结果和 `open` 一样是 `non-null`——这就是悬垂指针能骗过判空的原因。

### 第 3 层
用一个枚举（或三个整型常量）表示状态，在每次操作里按规则转移；`errors` 只在四种未定义行为的结果上自增。注意 `open` 失败要**覆盖**当前状态为 `null`（`fopen` 的返回值直接赋给了 `fp`），不要把原来的状态留着。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAX_NAME 24
#define MAX_EXIST 10

enum State { ST_NULL, ST_OPEN, ST_CLOSED };

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    if (n < 1 || n > 100) {
        return 0;
    }

    int k = 0;
    if (scanf("%d", &k) != 1) {
        return 0;
    }
    if (k < 0 || k > MAX_EXIST) {
        return 0;
    }
    char exist[MAX_EXIST][MAX_NAME];
    for (int i = 0; i < k; i++) {
        if (scanf("%23s", exist[i]) != 1) {
            return 0;
        }
    }

    int state = ST_NULL;
    int errors = 0;
    for (int i = 1; i <= n; i++) {
        char op[8] = {0};
        if (scanf("%7s", op) != 1) {
            return 0;
        }
        const char *result = "";
        if (strcmp(op, "open") == 0) {
            char name[MAX_NAME] = {0};
            if (scanf("%23s", name) != 1) {
                return 0;
            }
            int found = 0;
            for (int j = 0; j < k; j++) {
                if (strcmp(exist[j], name) == 0) {
                    found = 1;
                    break;
                }
            }
            if (found) {
                state = ST_OPEN;
                result = "open";
            } else {
                state = ST_NULL;              /* fopen 失败：返回值 NULL 覆盖了旧指针 */
                result = "null";
            }
        } else if (strcmp(op, "use") == 0) {
            if (state == ST_OPEN) {
                result = "ok";
            } else if (state == ST_NULL) {
                result = "null-deref";
                errors++;
            } else {
                result = "use-after-close";
                errors++;
            }
        } else if (strcmp(op, "close") == 0) {
            if (state == ST_OPEN) {
                state = ST_CLOSED;            /* 指针值不变，只是流没了 */
                result = "ok";
            } else if (state == ST_NULL) {
                result = "fclose-null";
                errors++;
            } else {
                result = "double-close";
                errors++;
            }
        } else if (strcmp(op, "check") == 0) {
            result = (state == ST_NULL) ? "null" : "non-null";
        } else if (strcmp(op, "clear") == 0) {
            state = ST_NULL;
            result = "null";
        } else {
            return 0;
        }
        printf("%d %s -> %s\n", i, op, result);
    }
    printf("errors %d\n", errors);
    if (state == ST_NULL) {
        printf("final null\n");
    } else if (state == ST_OPEN) {
        printf("final open\n");
    } else {
        printf("final closed\n");
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAX_NAME 24
#define MAX_EXIST 10

enum State { ST_NULL, ST_OPEN, ST_CLOSED };

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    if (n < 1 || n > 100) {
        return 0;
    }

    int k = 0;
    if (scanf("%d", &k) != 1) {
        return 0;
    }
    if (k < 0 || k > MAX_EXIST) {
        return 0;
    }
    char exist[MAX_EXIST][MAX_NAME];
    for (int i = 0; i < k; i++) {
        if (scanf("%23s", exist[i]) != 1) {
            return 0;
        }
    }

    int state = ST_NULL;
    int errors = 0;
    for (int i = 1; i <= n; i++) {
        char op[8] = {0};
        if (scanf("%7s", op) != 1) {
            return 0;
        }
        const char *result = "";
        if (strcmp(op, "open") == 0) {
            char name[MAX_NAME] = {0};
            if (scanf("%23s", name) != 1) {
                return 0;
            }
            state = ST_OPEN;                  /* TODO: 文件名不存在时 fopen 返回 NULL，状态应变成 null */
            result = "open";
        } else if (strcmp(op, "use") == 0) {
            result = "ok";                    /* TODO: null 和 closed 都不是 ok */
        } else if (strcmp(op, "close") == 0) {
            result = "ok";                    /* TODO: 要区分“关过”和“没打开过” */
        } else if (strcmp(op, "check") == 0) {
            result = (state == ST_NULL) ? "null" : "non-null";
        } else if (strcmp(op, "clear") == 0) {
            state = ST_NULL;
            result = "null";
        } else {
            return 0;
        }
        printf("%d %s -> %s\n", i, op, result);
    }
    printf("errors %d\n", errors);
    if (state == ST_NULL) {
        printf("final null\n");
    } else if (state == ST_OPEN) {
        printf("final open\n");
    } else {
        printf("final closed\n");
    }
    return 0;
}
```

## 复杂度
时间 O(n × k)：每个 `open` 要在最多 10 个文件名里线性查找，`n ≤ 100`。
空间 O(k)：只存"存在的文件名"列表。

## 常见错误
### 认为 fclose 会把指针置成 NULL [WA]
`fclose` 只释放流和句柄，不会修改你手里的变量。把 `closed` 合并进 `null` 之后，`use-after-close` 会被误判成 `null-deref`，`check` 也会错误地输出 `null`。示例 1 的第 4 步就会暴露这种模型。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAX_NAME 24
#define MAX_EXIST 10

enum State { ST_NULL, ST_OPEN };

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    if (n < 1 || n > 100) {
        return 0;
    }
    int k = 0;
    if (scanf("%d", &k) != 1) {
        return 0;
    }
    if (k < 0 || k > MAX_EXIST) {
        return 0;
    }
    char exist[MAX_EXIST][MAX_NAME];
    for (int i = 0; i < k; i++) {
        if (scanf("%23s", exist[i]) != 1) {
            return 0;
        }
    }

    int state = ST_NULL;
    int errors = 0;
    for (int i = 1; i <= n; i++) {
        char op[8] = {0};
        if (scanf("%7s", op) != 1) {
            return 0;
        }
        const char *result = "";
        if (strcmp(op, "open") == 0) {
            char name[MAX_NAME] = {0};
            if (scanf("%23s", name) != 1) {
                return 0;
            }
            int found = 0;
            for (int j = 0; j < k; j++) {
                if (strcmp(exist[j], name) == 0) {
                    found = 1;
                    break;
                }
            }
            state = found ? ST_OPEN : ST_NULL;
            result = found ? "open" : "null";
        } else if (strcmp(op, "use") == 0) {
            if (state == ST_OPEN) {
                result = "ok";
            } else {
                result = "null-deref";        /* 错：关闭之后指针不是 NULL */
                errors++;
            }
        } else if (strcmp(op, "close") == 0) {
            if (state == ST_OPEN) {
                state = ST_NULL;              /* 错：以为 fclose 会置空 */
                result = "ok";
            } else {
                result = "fclose-null";
                errors++;
            }
        } else if (strcmp(op, "check") == 0) {
            result = (state == ST_NULL) ? "null" : "non-null";
        } else if (strcmp(op, "clear") == 0) {
            state = ST_NULL;
            result = "null";
        } else {
            return 0;
        }
        printf("%d %s -> %s\n", i, op, result);
    }
    printf("errors %d\n", errors);
    printf("final %s\n", state == ST_OPEN ? "open" : "null");
    return 0;
}
```

### 把重复关闭当成"没关系的一次调用" [WA]
`fclose` 之后流的 `FILE` 结构已经被释放，第二次 `fclose` 用的是同一个（已失效的）地址，属于重复关闭，未定义行为。把它记成 `ok`，`errors` 就会少算，`final` 也可能错。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAX_NAME 24
#define MAX_EXIST 10

enum State { ST_NULL, ST_OPEN, ST_CLOSED };

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    if (n < 1 || n > 100) {
        return 0;
    }
    int k = 0;
    if (scanf("%d", &k) != 1) {
        return 0;
    }
    if (k < 0 || k > MAX_EXIST) {
        return 0;
    }
    char exist[MAX_EXIST][MAX_NAME];
    for (int i = 0; i < k; i++) {
        if (scanf("%23s", exist[i]) != 1) {
            return 0;
        }
    }

    int state = ST_NULL;
    int errors = 0;
    for (int i = 1; i <= n; i++) {
        char op[8] = {0};
        if (scanf("%7s", op) != 1) {
            return 0;
        }
        const char *result = "";
        if (strcmp(op, "open") == 0) {
            char name[MAX_NAME] = {0};
            if (scanf("%23s", name) != 1) {
                return 0;
            }
            int found = 0;
            for (int j = 0; j < k; j++) {
                if (strcmp(exist[j], name) == 0) {
                    found = 1;
                    break;
                }
            }
            state = found ? ST_OPEN : ST_NULL;
            result = found ? "open" : "null";
        } else if (strcmp(op, "use") == 0) {
            if (state == ST_OPEN) {
                result = "ok";
            } else if (state == ST_NULL) {
                result = "null-deref";
                errors++;
            } else {
                result = "use-after-close";
                errors++;
            }
        } else if (strcmp(op, "close") == 0) {
            if (state == ST_NULL) {
                result = "fclose-null";
                errors++;
            } else {
                state = ST_CLOSED;
                result = "ok";                /* 错：closed 状态再关闭就是 double-close */
            }
        } else if (strcmp(op, "check") == 0) {
            result = (state == ST_NULL) ? "null" : "non-null";
        } else if (strcmp(op, "clear") == 0) {
            state = ST_NULL;
            result = "null";
        } else {
            return 0;
        }
        printf("%d %s -> %s\n", i, op, result);
    }
    printf("errors %d\n", errors);
    if (state == ST_NULL) {
        printf("final null\n");
    } else if (state == ST_OPEN) {
        printf("final open\n");
    } else {
        printf("final closed\n");
    }
    return 0;
}
```

### 认为 fclose(NULL) 是安全的空操作 [WA]
`fclose` 的参数必须是一个**打开着的流**。传 `NULL` 是未定义行为，并不是"什么都不做"。C 标准里没有任何一处保证 `fclose(NULL)` 会被安全忽略。模型里它单独算一种错误（`fclose-null`），不能并到 `ok` 里。

### 认为 open 失败时"原来的流还开着" [WA]
`fp = fopen(...)` 是一次**赋值**：`fopen` 失败返回 `NULL`，这个 `NULL` 会覆盖 `fp` 原来的值。所以 `open` 失败之后，状态一定是 `null`，原来打开着的流不但丢了指针，还泄漏了。模型规定 `open` 直接替换状态，不要把旧状态留着。

### 把 check 的结果当成"流还能用" [WA]
`if (fp == NULL)` 只判断指针是否为空。`closed` 状态下指针仍是旧地址，判空返回 `non-null`，看起来"流还在"，实际已经被回收。这就是为什么 `fclose` 之后必须 `fp = NULL;`：让判空重新变得有意义。

## 测试用例
### 01 sample 示例 1
```in
6
1 app.log
open app.log
use
close
use
close
check
```
```out
1 open -> open
2 use -> ok
3 close -> ok
4 use -> use-after-close
5 close -> double-close
6 check -> non-null
errors 2
final closed
```

### 02 sample 示例 2（边界：只有一个操作）
```in
1
0
check
```
```out
1 check -> null
errors 0
final null
```

### 03 degenerate 一个文件都不存在
```in
4
0
open missing.log
use
clear
check
```
```out
1 open -> null
2 use -> null-deref
3 clear -> null
4 check -> null
errors 1
final null
```

### 04 trap 没打开就关闭，再打开再重复关闭
```in
4
1 data.txt
close
open data.txt
close
close
```
```out
1 close -> fclose-null
2 open -> open
3 close -> ok
4 close -> double-close
errors 2
final closed
```

### 05 trap 关掉再重新打开，指针恢复可用
```in
5
1 a.log
open a.log
close
open a.log
use
check
```
```out
1 open -> open
2 close -> ok
3 open -> open
4 use -> ok
5 check -> non-null
errors 0
final open
```

### 生成 boundary 100 次操作：25 轮打开-读取-关闭-判空
```js gen
const cases = [];
function render(exist, ops) {
  let state = 'null';
  let errors = 0;
  const out = [];
  ops.forEach((o, i) => {
    let res;
    if (o[0] === 'open') {
      const ok = exist.includes(o[1]);
      state = ok ? 'open' : 'null';
      res = ok ? 'open' : 'null';
    } else if (o[0] === 'use') {
      if (state === 'open') res = 'ok';
      else if (state === 'null') { res = 'null-deref'; errors++; }
      else { res = 'use-after-close'; errors++; }
    } else if (o[0] === 'close') {
      if (state === 'open') { state = 'closed'; res = 'ok'; }
      else if (state === 'null') { res = 'fclose-null'; errors++; }
      else { res = 'double-close'; errors++; }
    } else if (o[0] === 'check') {
      res = state === 'null' ? 'null' : 'non-null';
    } else {
      state = 'null';
      res = 'null';
    }
    out.push(`${i + 1} ${o[0]} -> ${res}`);
  });
  out.push(`errors ${errors}`);
  out.push(`final ${state}`);
  return out.join('\n') + '\n';
}
function stdinOf(exist, ops) {
  const head = `${ops.length}\n${exist.length}${exist.length ? ' ' + exist.join(' ') : ''}\n`;
  return head + ops.map((o) => o.join(' ')).join('\n') + '\n';
}
{
  const exist = ['app.log'];
  const ops = [];
  for (let i = 0; i < 25; i++) ops.push(['open', 'app.log'], ['use'], ['close'], ['check']);
  cases.push({
    kind: 'boundary',
    category: '100 次操作：25 轮打开-读取-关闭-判空',
    input: stdinOf(exist, ops),
    output: render(exist, ops),
  });
}
return cases;
```

### 生成 normal 40 次随机操作
```js gen
const cases = [];
function render(exist, ops) {
  let state = 'null';
  let errors = 0;
  const out = [];
  ops.forEach((o, i) => {
    let res;
    if (o[0] === 'open') {
      const ok = exist.includes(o[1]);
      state = ok ? 'open' : 'null';
      res = ok ? 'open' : 'null';
    } else if (o[0] === 'use') {
      if (state === 'open') res = 'ok';
      else if (state === 'null') { res = 'null-deref'; errors++; }
      else { res = 'use-after-close'; errors++; }
    } else if (o[0] === 'close') {
      if (state === 'open') { state = 'closed'; res = 'ok'; }
      else if (state === 'null') { res = 'fclose-null'; errors++; }
      else { res = 'double-close'; errors++; }
    } else if (o[0] === 'check') {
      res = state === 'null' ? 'null' : 'non-null';
    } else {
      state = 'null';
      res = 'null';
    }
    out.push(`${i + 1} ${o[0]} -> ${res}`);
  });
  out.push(`errors ${errors}`);
  out.push(`final ${state}`);
  return out.join('\n') + '\n';
}
{
  const exist = ['app.log', 'data.log'];
  const names = ['app.log', 'data.log', 'ghost.log', 'trace.log'];
  const ops = [];
  for (let i = 0; i < 40; i++) {
    const r = rng.int(0, 4);
    if (r === 0) ops.push(['open', names[rng.int(0, names.length - 1)]]);
    else if (r === 1) ops.push(['use']);
    else if (r === 2) ops.push(['close']);
    else if (r === 3) ops.push(['check']);
    else ops.push(['clear']);
  }
  cases.push({
    kind: 'normal',
    category: '40 次随机操作',
    input: `${ops.length}\n${exist.length} ${exist.join(' ')}\n${ops.map((o) => o.join(' ')).join('\n')}\n`,
    output: render(exist, ops),
  });
}
return cases;
```
