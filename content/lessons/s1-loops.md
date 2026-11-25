---
id: s1-loops
---

## 讲解

### 三种循环
```c
while (条件) { 循环体 }               /* 先判断，条件为真才执行；可能一次都不执行 */

do { 循环体 } while (条件);           /* 先执行一次，再判断；至少执行一次。注意末尾的分号 */

for (初始化; 条件; 更新) { 循环体 }   /* 计数循环的标准写法 */
```

`for` 循环的执行顺序是：初始化（只执行一次）→ 判断条件 → 循环体 → 更新 → 判断条件 → 循环体 → 更新 → ……直到条件为假。它和下面的 `while` 完全等价：

```c
初始化;
while (条件) {
    循环体
    更新;
}
```

```c run id=sum
#include <stdio.h>

int main(void) {
    int sum = 0;
    for (int i = 1; i <= 100; i++) {   /* i 从 1 到 100，共 100 次 */
        sum += i;
    }
    printf("1 + 2 + ... + 100 = %d\n", sum);
    return 0;
}
```
```output
1 + 2 + ... + 100 = 5050
```

在 `for` 的初始化部分声明的变量（C99 起允许）只在这个循环里有效，循环结束后就不能再使用了。

### 怎么选
| 场景 | 推荐 |
|---|---|
| 已知循环次数（遍历 1 到 n、数组的每个元素） | `for` |
| 不知道次数，只知道什么时候停（读到输入结束、数字变成 0） | `while` |
| 至少要执行一次（先读一次输入再判断是否合法、菜单） | `do-while` |

### 读到输入结束为止
`scanf` 成功时返回读到的项数，所以"一直读，直到读不到整数"可以这样写：

```c run id=until-eof stdin="3 1 4 1 5"
#include <stdio.h>

int main(void) {
    int x, count = 0;
    long long sum = 0;
    while (scanf("%d", &x) == 1) {    /* 只有成功读到一个整数才继续 */
        sum += x;
        count++;
    }
    printf("读到 %d 个数，总和 %lld\n", count, sum);
    return 0;
}
```
```output
读到 5 个数，总和 14
```

注意条件写的是 `== 1`，**不是** `!= 0`：输入结束时 scanf 返回的是 EOF（-1），`-1 != 0` 为真，循环永远不会停。

### 数位循环
`while` 很适合"一直处理到数字变成 0"：

```c run id=digits stdin="90210"
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0) return 1;
    int count = 0, sum = 0;
    do {                  /* 用 do-while：n 为 0 时也算一位 */
        sum += n % 10;
        count++;
        n /= 10;
    } while (n > 0);
    printf("%d 位，各位之和 %d\n", count, sum);
    return 0;
}
```
```output
5 位，各位之和 12
```

如果用 `while (n > 0)`，输入 0 时循环一次也不执行，会得到"0 位"。

### 不要用浮点数做循环条件
```c
for (double x = 0.0; x != 1.0; x += 0.1) { ... }
```
0.1 无法被二进制精确表示，x 累加 10 次后是 0.9999999999999999，不等于 1.0，于是循环**永远不会停止**。浮点循环要用 `<` 比较，或者干脆用整数计数（`for (int i = 0; i < 10; i++) { double x = i * 0.1; ... }`）。

```c run id=float-loop expect=TLE
#include <stdio.h>

int main(void) {
    long long steps = 0;
    for (double x = 0.0; x != 1.0; x += 0.1) {
        steps++;
    }
    printf("%lld\n", steps);
    return 0;
}
```

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra loop.c -o loop
./loop < numbers.txt       # 从文件读入，读完时 scanf 返回 EOF
```

在键盘上手动输入时，用 Ctrl+Z 回车（Windows）或 Ctrl+D（Linux/macOS）表示"输入结束"。

## 常见错误

### 差一错误（off-by-one）
`for (int i = 0; i <= n; i++)` 执行 n + 1 次，`for (int i = 1; i < n; i++)` 执行 n − 1 次。写完循环后，用 n = 0、n = 1 在脑子里走一遍。

### 循环条件后面多了分号
`for (i = 0; i < n; i++);` 或 `while (x > 0);`：分号是一条空语句，它就是整个循环体；后面花括号里的代码只在循环结束后执行一次。`while` 的情况通常还会变成死循环。

### 循环变量在循环体里被意外修改
在循环体里又写了 `i++` 或给 i 赋值，循环次数就不是你以为的那样了。

## 客观题

### q-s1-loops-1 single
下面的代码输出什么？
```c
int i, s = 0;
for (i = 0; i < 5; i++);
    s += i;
printf("%d %d", i, s);
```
- [ ] `5 10`
  > 注意 for 后面的分号：循环体是空语句，`s += i` 不在循环里。
- [x] `5 5`
  > 正确。空循环让 i 从 0 增加到 5 后结束；之后 `s += i` 只执行一次，s = 5。（缩进是骗人的，编译器会给出警告。）
- [ ] `4 10`
  > 循环在 i < 5 不成立时结束，此时 i 是 5 而不是 4。
- [ ] 死循环
  > for 的更新部分 `i++` 照常执行，循环会正常结束。
