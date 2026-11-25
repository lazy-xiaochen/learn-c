---json
{
  "id": "p-s7-queue-circular-1",
  "title": "打印任务队列：循环数组模拟入队、出队与满队列",
  "difficulty": "L4",
  "knowledgePoints": ["s7-queue-circular"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
打印机的任务缓冲区是一个**固定容量的循环队列**：新任务从队尾进入，打印机从队头取走任务。缓冲区满时新任务只能被拒绝，缓冲区空时打印机无事可做。

请你用数组模拟这个队列，处理 `q` 条命令。队列的容量是 `C`，**最多能容纳 C 个任务**。注意：如果你用"留一个空位"的方法区分空和满，数组要开 `C + 1` 个槽，但对外表现仍然必须是"能放 C 个"。

命令只有四种：

| 命令 | 含义 | 输出 |
|---|---|---|
| `push x` | 把任务号 `x` 入队 | 成功输出 `push ok`；队满输出 `push full` |
| `pop` | 取出队头任务 | 成功输出 `pop <x>`；队空输出 `pop empty` |
| `front` | 查看队头任务（不出队） | 成功输出 `front <x>`；队空输出 `front empty` |
| `size` | 查询当前任务数 | 输出 `size <n>` |

## 输入格式
第一行两个整数 `C`、`q`：队列容量与命令条数。

接下来 `q` 行，每行一条命令，格式如上表。`push` 后面跟一个整数任务号。

## 输出格式
每条命令输出一行，共 `q` 行，格式见上表。

`pop` 与 `front` 成功时，`<x>` 是任务号；`size` 输出当前元素个数（不是槽位数）。

## 数据范围
1 ≤ C ≤ 1000
1 ≤ q ≤ 1000
0 ≤ 任务号 x ≤ 10⁹

输出最多 1000 行、约 15KB。队列里的任务数始终在 `[0, C]` 之间。

## 示例
### 示例 1
```in
3 8
push 10
push 20
push 30
push 40
pop
size
front
pop
```
```out
push ok
push ok
push ok
push full
pop 10
size 2
front 20
pop 20
```
> 容量为 3，前三次入队占满；第四次 `push 40` 被拒绝。此后队列是 `10 20 30`，`pop` 取走 10，`size` 为 2，队头变成 20，再 `pop` 取走 20。

### 示例 2（边界：容量为 1）
```in
1 6
push 5
push 6
pop
pop
front
size
```
```out
push ok
push full
pop 5
pop empty
front empty
size 0
```
> 容量为 1 时队列最多只有一个元素：压入 5 之后立刻满，第二次 `push` 被拒绝。弹出 5 后队列为空，再弹或查看队头都只能输出 `empty`。这个用例专门检查"留一个空位"的数组是不是开成了 `C + 1` 个槽。

## 提示
### 第 1 层
先确定两个下标的含义：`front` 指向队头元素，`rear` 指向**下一个**入队位置。空队列是 `front == rear`。入队写 `data[rear]`，然后 `rear` 前进一格并回绕；出队读 `data[front]`，然后 `front` 前进一格并回绕。

### 第 2 层
容量为 C、留一个空位时，数组有 `C + 1` 个槽，记 `slots = C + 1`。满的条件是 `(rear + 1) % slots == front`；元素个数是 `(rear - front + slots) % slots`。所有让下标前进的地方都必须取模。

### 第 3 层
主循环按命令字符串分派：先读命令，若是 `push` 再读一个整数。四个分支各输出一行，`pop`/`front` 失败时不要读数组。注意 `front` 命令只查看、不修改 `front`；`size` 命令必须用上面的取模公式实时计算，不能另外维护一个容易漏更新的变量（除非你在每个成功分支都同步它）。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXC 1000

int main(void) {
    int capacity = 0;
    int q = 0;
    if (scanf("%d %d", &capacity, &q) != 2 || capacity < 1 || capacity > MAXC || q < 1 || q > 1000) {
        return 0;
    }

    int data[MAXC + 1];      /* 留一个空位：slots = capacity + 1 */
    int slots = capacity + 1;
    int front = 0;           /* 队头元素下标 */
    int rear = 0;            /* 下一个入队位置 */

    for (int i = 0; i < q; i++) {
        char cmd[8];
        if (scanf("%7s", cmd) != 1) {
            return 0;
        }
        if (strcmp(cmd, "push") == 0) {
            int value = 0;
            if (scanf("%d", &value) != 1) {
                return 0;
            }
            if ((rear + 1) % slots == front) {
                printf("push full\n");
            } else {
                data[rear] = value;
                rear = (rear + 1) % slots;
                printf("push ok\n");
            }
        } else if (strcmp(cmd, "pop") == 0) {
            if (front == rear) {
                printf("pop empty\n");
            } else {
                printf("pop %d\n", data[front]);
                front = (front + 1) % slots;
            }
        } else if (strcmp(cmd, "front") == 0) {
            if (front == rear) {
                printf("front empty\n");
            } else {
                printf("front %d\n", data[front]);
            }
        } else if (strcmp(cmd, "size") == 0) {
            printf("size %d\n", (rear - front + slots) % slots);
        }
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXC 1000

int main(void) {
    int capacity = 0;
    int q = 0;
    if (scanf("%d %d", &capacity, &q) != 2) {
        return 0;
    }
    (void)capacity;

    for (int i = 0; i < q; i++) {
        char cmd[8];
        if (scanf("%7s", cmd) != 1) {
            return 0;
        }
        if (strcmp(cmd, "push") == 0) {
            int value = 0;
            if (scanf("%d", &value) != 1) {
                return 0;
            }
            (void)value;
            /* TODO: 判断队满，写入 data[rear] 并让 rear 取模前进 */
            printf("push ok\n");
        } else if (strcmp(cmd, "pop") == 0) {
            /* TODO: 判空后取出 data[front] 并让 front 取模前进 */
            printf("pop empty\n");
        } else if (strcmp(cmd, "front") == 0) {
            /* TODO: 判空后输出队头，不修改 front */
            printf("front empty\n");
        } else if (strcmp(cmd, "size") == 0) {
            /* TODO: 用 (rear - front + slots) % slots 计算元素个数 */
            printf("size 0\n");
        }
    }
    return 0;
}
```

## 复杂度
时间 O(q)：每条命令都是常数次下标运算与比较。
空间 O(C)：一个长度为 C + 1 的数组。

## 常见错误
### 数组只开 C 个槽，却用"留一个空位"的判满条件 [WA]
留一个空位意味着容量为 C 时必须有 C + 1 个槽。数组只开 C 个、取模也用 C，队列实际只能放 C − 1 个元素：示例 2 的容量 1 会变成"永远满"，示例 1 的第三个任务也会被拒绝。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXC 1000

int main(void) {
    int capacity = 0;
    int q = 0;
    if (scanf("%d %d", &capacity, &q) != 2) {
        return 0;
    }
    int data[MAXC];                 /* 错：只开了 capacity 个槽 */
    int slots = capacity;
    int front = 0;
    int rear = 0;

    for (int i = 0; i < q; i++) {
        char cmd[8];
        if (scanf("%7s", cmd) != 1) {
            return 0;
        }
        if (strcmp(cmd, "push") == 0) {
            int value = 0;
            if (scanf("%d", &value) != 1) {
                return 0;
            }
            if ((rear + 1) % slots == front) {
                printf("push full\n");
            } else {
                data[rear] = value;
                rear = (rear + 1) % slots;
                printf("push ok\n");
            }
        } else if (strcmp(cmd, "pop") == 0) {
            if (front == rear) {
                printf("pop empty\n");
            } else {
                printf("pop %d\n", data[front]);
                front = (front + 1) % slots;
            }
        } else if (strcmp(cmd, "front") == 0) {
            if (front == rear) {
                printf("front empty\n");
            } else {
                printf("front %d\n", data[front]);
            }
        } else {
            printf("size %d\n", (rear - front + slots) % slots);
        }
    }
    return 0;
}
```

### 判满条件忘了取模 [WA]
`rear + 1 == front` 在 `rear` 位于最后一个槽、`front` 已经回绕到 0 时不成立，于是队列被误判为没满：示例 1 的 `push 40` 会输出 `push ok` 并覆盖数据。判满必须写成 `(rear + 1) % slots == front`。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXC 1000

int main(void) {
    int capacity = 0;
    int q = 0;
    if (scanf("%d %d", &capacity, &q) != 2) {
        return 0;
    }
    int data[MAXC + 1];
    int slots = capacity + 1;
    int front = 0;
    int rear = 0;

    for (int i = 0; i < q; i++) {
        char cmd[8];
        if (scanf("%7s", cmd) != 1) {
            return 0;
        }
        if (strcmp(cmd, "push") == 0) {
            int value = 0;
            if (scanf("%d", &value) != 1) {
                return 0;
            }
            if (rear + 1 == front) {          /* 错：没取模 */
                printf("push full\n");
            } else {
                data[rear] = value;
                rear = (rear + 1) % slots;
                printf("push ok\n");
            }
        } else if (strcmp(cmd, "pop") == 0) {
            if (front == rear) {
                printf("pop empty\n");
            } else {
                printf("pop %d\n", data[front]);
                front = (front + 1) % slots;
            }
        } else if (strcmp(cmd, "front") == 0) {
            if (front == rear) {
                printf("front empty\n");
            } else {
                printf("front %d\n", data[front]);
            }
        } else {
            printf("size %d\n", (rear - front + slots) % slots);
        }
    }
    return 0;
}
```

### 出队后 `front++` 没有回绕 [WA]
`front` 一旦越过数组末尾就不会再回来：`size` 会用错位的前端点算出错误个数，`front` 命令会读到已经被覆盖的旧值，后面每次 `pop` 的答案都和预期对不上。示例 1 与示例 2 的下标都还没走到末尾，所以看不出来；隐藏用例里"填满 → 出队 → 再入队 → 再出队"的序列会立刻暴露。若 `front` 继续增大到数组之外，还会变成越界访问（`RE`），所以这个方向上的任何"前进"都必须取模。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXC 1000

int main(void) {
    int capacity = 0;
    int q = 0;
    if (scanf("%d %d", &capacity, &q) != 2) {
        return 0;
    }
    int data[MAXC + 1];
    int slots = capacity + 1;
    int front = 0;
    int rear = 0;

    for (int i = 0; i < q; i++) {
        char cmd[8];
        if (scanf("%7s", cmd) != 1) {
            return 0;
        }
        if (strcmp(cmd, "push") == 0) {
            int value = 0;
            if (scanf("%d", &value) != 1) {
                return 0;
            }
            if ((rear + 1) % slots == front) {
                printf("push full\n");
            } else {
                data[rear] = value;
                rear = (rear + 1) % slots;
                printf("push ok\n");
            }
        } else if (strcmp(cmd, "pop") == 0) {
            if (front == rear) {
                printf("pop empty\n");
            } else {
                printf("pop %d\n", data[front]);
                front++;                      /* 错：没有取模回绕 */
            }
        } else if (strcmp(cmd, "front") == 0) {
            if (front == rear) {
                printf("front empty\n");
            } else {
                printf("front %d\n", data[front]);
            }
        } else {
            printf("size %d\n", (rear - front + slots) % slots);
        }
    }
    return 0;
}
```

### 把 `front` 当成"队头前一个空位"来实现 [WA]
如果 `front` 指向队头前一个槽，就必须"先前进、再取值"；而本题实现采用的是"先取值、再前进"。两种约定本身都正确，但不能混用：混用会让 `pop` 和 `front` 整体错一位，`size` 也会跟着差 1。写代码前先把约定固定在注释里。

## 测试用例
### 01 sample 示例 1
```in
3 8
push 10
push 20
push 30
push 40
pop
size
front
pop
```
```out
push ok
push ok
push ok
push full
pop 10
size 2
front 20
pop 20
```

### 02 sample 示例 2
```in
1 6
push 5
push 6
pop
pop
front
size
```
```out
push ok
push full
pop 5
pop empty
front empty
size 0
```

### 03 degenerate 容量为 1，弹出后还能再入队
```in
1 8
push 7
push 8
pop
push 8
pop
pop
front
size
```
```out
push ok
push full
pop 7
push ok
pop 8
pop empty
front empty
size 0
```

### 04 trap 容量 3，反复填满与回绕
```in
3 13
push 1
push 2
push 3
pop
push 4
pop
push 5
front
size
pop
pop
pop
pop
```
```out
push ok
push ok
push ok
pop 1
push ok
pop 2
push ok
front 3
size 3
pop 3
pop 4
pop 5
pop empty
```

### 05 trap 回绕之后判满
```in
4 17
push 1
push 2
push 3
push 4
push 5
pop
pop
push 5
push 6
push 7
front
size
pop
pop
pop
pop
pop
```
```out
push ok
push ok
push ok
push ok
push full
pop 1
pop 2
push ok
push ok
push full
front 3
size 4
pop 3
pop 4
pop 5
pop 6
pop empty
```

### 06 normal 空队列操作与含 0 的任务号
```in
5 12
front
pop
size
push 9
push 10
front
size
pop
pop
pop
size
push 0
```
```out
front empty
pop empty
size 0
push ok
push ok
front 9
size 2
pop 9
pop 10
pop empty
size 0
push ok
```

### 生成 boundary 容量 600 的填满、拒绝与批量出队
```js gen
const cases = [];

function simulate(capacity, commands) {
  const slots = capacity + 1;
  const data = new Array(slots).fill(0);
  let front = 0;
  let rear = 0;
  const out = [];
  for (const cmd of commands) {
    const parts = cmd.split(' ');
    if (parts[0] === 'push') {
      const value = Number(parts[1]);
      if ((rear + 1) % slots === front) {
        out.push('push full');
      } else {
        data[rear] = value;
        rear = (rear + 1) % slots;
        out.push('push ok');
      }
    } else if (parts[0] === 'pop') {
      if (front === rear) {
        out.push('pop empty');
      } else {
        out.push(`pop ${data[front]}`);
        front = (front + 1) % slots;
      }
    } else if (parts[0] === 'front') {
      out.push(front === rear ? 'front empty' : `front ${data[front]}`);
    } else {
      out.push(`size ${(rear - front + slots) % slots}`);
    }
  }
  return out.join('\n') + '\n';
}

/* 容量 600，刚好 1000 条命令：600 次入队、1 次拒绝、399 次出队 */
{
  const capacity = 600;
  const commands = [];
  for (let i = 1; i <= 600; i++) commands.push(`push ${i * 1000}`);
  commands.push('push 999999999');
  for (let i = 0; i < 399; i++) commands.push('pop');
  cases.push({
    kind: 'boundary',
    category: '容量 600 填满后拒绝，再连续出队 399 个',
    input: `${capacity} ${commands.length}\n${commands.join('\n')}\n`,
    output: simulate(capacity, commands),
  });
}

/* 容量 7 的 1000 条随机命令 */
{
  const capacity = 7;
  const commands = [];
  for (let i = 0; i < 1000; i++) {
    const op = rng.int(0, 3);
    if (op === 0) commands.push(`push ${rng.int(0, 1000000000)}`);
    else if (op === 1) commands.push('pop');
    else if (op === 2) commands.push('front');
    else commands.push('size');
  }
  cases.push({
    kind: 'normal',
    category: '容量 7 的随机命令流',
    input: `${capacity} ${commands.length}\n${commands.join('\n')}\n`,
    output: simulate(capacity, commands),
  });
}

return cases;
```
