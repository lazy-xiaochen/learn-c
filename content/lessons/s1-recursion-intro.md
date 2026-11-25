---
id: s1-recursion-intro
---

## 讲解

### 函数可以调用自己
**递归**就是一个函数在函数体里调用它自己。能用递归解决的问题都有这样的结构：**一个规模为 n 的问题，可以借助一个规模更小的同类问题来解决**。例如阶乘：

- n! = n × (n − 1)!（规模更小的同类问题）
- 0! = 1（不再需要继续拆分的**终止条件**）

```c run id=fact
#include <stdio.h>

long long fact(int n) {
    if (n == 0) {
        return 1;               /* 终止条件：直接给出答案 */
    }
    return n * fact(n - 1);     /* 递归：把问题交给规模更小的自己 */
}

int main(void) {
    printf("%lld\n", fact(5));
    printf("%lld\n", fact(20));
    return 0;
}
```
```output
120
2432902008176640000
```

每个递归函数都必须同时具备两样东西：**终止条件**，以及每次调用都让问题**向终止条件靠近**。缺一个，递归就停不下来。

### 看见"栈展开"
每调用一次函数，系统都会为它分配一块独立的内存（**栈帧**），存放这一次调用的参数和局部变量。所以 `fact(3)` 里的 n 和 `fact(2)` 里的 n 是**不同的变量**。下面用缩进把每一层调用打印出来：

```c run id=trace
#include <stdio.h>

long long fact(int n, int depth) {
    printf("%*s进入 fact(%d)\n", depth * 4, "", n);     /* %*s：用 depth*4 个空格缩进 */
    long long r;
    if (n == 0) {
        r = 1;
    } else {
        r = n * fact(n - 1, depth + 1);
    }
    printf("%*s离开 fact(%d)，返回 %lld\n", depth * 4, "", n, r);
    return r;
}

int main(void) {
    fact(3, 0);
    return 0;
}
```
```output
进入 fact(3)
    进入 fact(2)
        进入 fact(1)
            进入 fact(0)
            离开 fact(0)，返回 1
        离开 fact(1)，返回 1
    离开 fact(2)，返回 2
离开 fact(3)，返回 6
```

执行过程分两个阶段：
1. **递推**：一层层往下调用，每一层都停在 `n * fact(n - 1)` 这里，等待下一层的结果；
2. **回归**：到达 `fact(0)` 后开始一层层返回，每一层拿到下一层的结果，算完自己的乘法再返回给上一层。

最后调用的最先返回，这正是"栈"（后进先出）的特点。阶段 3 会打印出每一层栈帧的地址和返回地址，更直观地观察这个过程。

```memory title="fact(0) 正在执行时，栈上同时存在 4 个栈帧（每个 n 都是独立的变量）"
栈帧      | n 的值 | 状态
fact(3)   | 3      | 等待 fact(2) 的结果
fact(2)   | 2      | 等待 fact(1) 的结果
fact(1)   | 1      | 等待 fact(0) 的结果
fact(0)   | 0      | 正在执行，即将返回 1
```

### 没有终止条件：栈溢出
栈的空间是有限的（Windows 默认 1MB，Linux 通常 8MB，本平台判题时为 64MB）。如果递归永远不停止，栈帧越堆越多，最终耗尽栈空间，程序崩溃，这就是**栈溢出**（stack overflow）：

```c run id=overflow expect=RE
#include <stdio.h>

long long fact(int n) {
    return n * fact(n - 1);     /* 忘了终止条件 */
}

int main(void) {
    printf("%lld\n", fact(5));
    return 0;
}
```

即使有终止条件，递归层数太深（比如对 n = 10⁷ 递归）也会栈溢出。这种情况要改用循环。

### 递归与循环
阶乘这种"每层只调用一次自己"的递归，都能很容易地改写成循环，而且循环更快、不会栈溢出。递归真正的价值在于那些**每层要调用自己多次**、用循环很难写的问题，比如汉诺塔、遍历树形结构（阶段 3、阶段 7 会大量用到）。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra rec.c -o rec
ulimit -s          # Linux/macOS：查看栈大小上限（单位 KB）
```

## 常见错误

### 缺少终止条件，或者终止条件永远达不到
例如终止条件写成 `if (n == 1) return 1;`，却调用了 `fact(0)`：n 会变成 -1、-2……永远不等于 1。

### 递归调用没有让问题变小
`return n * fact(n);` 每次都以相同的参数调用自己，永远到不了终止条件。

### 输出语句放在递归调用之前还是之后
"先递归再输出"和"先输出再递归"的输出顺序正好相反。写之前想清楚：要先处理大问题、还是先处理小问题？

## 客观题

### q-s1-recursion-intro-1 single
下面的程序输出什么？
```c
void f(int n) {
    if (n == 0) return;
    f(n - 1);
    printf("%d ", n);
}
int main(void) { f(3); return 0; }
```
- [ ] `3 2 1 `
  > printf 在递归调用**之后**：要等 f(n - 1) 全部执行完，才输出当前的 n。
- [x] `1 2 3 `
  > 正确。f(3) 先调用 f(2)，f(2) 先调用 f(1)，f(1) 先调用 f(0) 并立即返回；然后在回归阶段依次输出 1、2、3。
- [ ] `0 1 2 3 `
  > n 为 0 时直接 return，不会执行 printf。
- [ ] 无限递归，栈溢出
  > 每次调用 n 都减 1，最终到达终止条件 n == 0。
