---
id: s1-loop-control
---

## 讲解

### break：立即结束循环
`break` 跳出**最内层**的那个循环（或 switch），继续执行循环后面的语句。典型用法是"找到了就停"：

```c run id=first-factor stdin="91"
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 2) return 1;
    int factor = n;                       /* 找不到更小的因子时，最小因子就是 n 本身 */
    for (int i = 2; i <= n / i; i++) {    /* 只需试到 √n */
        if (n % i == 0) {
            factor = i;
            break;                        /* 找到第一个就够了 */
        }
    }
    printf("%d 的最小质因子是 %d\n", n, factor);
    return 0;
}
```
```output
91 的最小质因子是 7
```

### continue：跳过本轮剩下的部分
`continue` 不结束循环，只是跳过**这一轮**循环体中剩下的语句：
- 在 `for` 中，跳到**更新**部分（`i++`），然后判断条件；
- 在 `while` / `do-while` 中，直接跳到**条件判断**。

```c run id=skip-neg stdin="3 -2 5 -7 4"
#include <stdio.h>

int main(void) {
    int x, sum = 0;
    while (scanf("%d", &x) == 1) {
        if (x < 0) {
            continue;          /* 负数不参与求和 */
        }
        sum += x;
    }
    printf("非负数之和 %d\n", sum);
    return 0;
}
```
```output
非负数之和 12
```

### while 里的 continue 陷阱
因为 `while` 中的 continue 会直接跳到条件判断，如果"更新循环变量"的语句写在 continue 之后，它就会被跳过，循环变量永远不变：

```c run id=continue-trap expect=TLE
#include <stdio.h>

int main(void) {
    int i = 0, count = 0;
    while (i < 10) {
        if (i % 2 == 0) {
            continue;       /* i 为 0 时跳回条件判断，i 永远是 0 */
        }
        count++;
        i++;
    }
    printf("%d\n", count);
    return 0;
}
```

改用 `for (int i = 0; i < 10; i++)`，continue 之后仍会执行 `i++`，就没有这个问题。

### 嵌套循环中的 break 只跳出一层
```c run id=nested-break
#include <stdio.h>

int main(void) {
    for (int i = 1; i <= 3; i++) {
        for (int j = 1; j <= 3; j++) {
            if (j == 2) {
                break;           /* 只结束内层的 j 循环 */
            }
            printf("(%d,%d) ", i, j);
        }
    }
    printf("\n");
    return 0;
}
```
```output
(1,1) (2,1) (3,1) 
```

### goto：跳到标签
`goto 标签;` 无条件跳到同一函数内的 `标签:` 处。滥用 goto 会让程序的执行流程像一团乱麻，所以通常不用。但有两种情况，它是 C 程序员公认的合理用法：
1. **一次跳出多层循环**；
2. **出错时统一跳到函数末尾做清理**（阶段 5 管理内存时会经常见到）。

```c run id=goto-out
#include <stdio.h>

int main(void) {
    /* 找到第一组满足 a² + b² = 25 的正整数 */
    for (int a = 1; a <= 5; a++) {
        for (int b = 1; b <= 5; b++) {
            if (a * a + b * b == 25) {
                printf("a=%d b=%d\n", a, b);
                goto found;          /* 一次跳出两层循环 */
            }
        }
    }
    printf("没有找到\n");
found:
    return 0;
}
```
```output
a=3 b=4
```

不用 goto 的话，需要一个"是否找到"的标志变量，在两层循环的条件里都检查它。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra ctrl.c -o ctrl
```

## 常见错误

### 以为 break 能跳出所有循环
break 只结束最内层的循环。需要跳出多层时，用标志变量、goto，或者把循环放进一个函数里用 return（下一组知识点）。

### while 循环中 continue 跳过了更新语句
如上面的演示，会造成死循环。更新语句放在循环体开头，或者改用 for。

### 在 switch 里用 break 想结束外面的循环
switch 里的 break 只结束 switch 本身，外面的循环会继续。

## 客观题

### q-s1-loop-control-1 single
下面代码的输出是什么？
```c
int s = 0;
for (int i = 1; i <= 10; i++) {
    if (i % 3 == 0) continue;
    if (i > 7) break;
    s += i;
}
printf("%d", s);
```
- [ ] `28`
  > 3 和 6 被 continue 跳过了，不能加进去。
- [x] `19`
  > 正确。i = 1、2、4、5、7 被累加（3、6 被 continue 跳过），i = 8 时 break，s = 1 + 2 + 4 + 5 + 7 = 19。
- [ ] `37`
  > i 为 8 时 break 结束了整个循环，8、10 没有被加进去。
- [ ] `27`
  > 7 不满足 i > 7，所以 7 会被累加；i = 8 时才 break。
