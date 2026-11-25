---
id: s5-ub-out-of-bounds
---

## 讲解

### 合法下标的边界写在类型里
声明 `int a[3]` 之后，这个对象就恰好是 3 个 `int` 那么大，合法下标只有 `0`、`1`、`2`。`a[3]`、`a[-1]`、`a[100]` 都不是"数组外面的一块空闲内存"，而是**不属于这个对象的位置**——对它们取值或赋值都是未定义行为，标准不会说"读到 0"或者"写坏别的地方"，标准什么都不说。

有一个容易混淆的例外：**可以计算**"最后一个元素再往后一个"的地址 `&a[3]`（所谓 one-past-the-end，用来做循环终止条件很方便），但**不能解引用**它。`a + 3` 这个指针值合法，`*(a + 3)` 就是 UB。

下标为什么容易越界？因为 C 的数组**不保存长度**，`a[i]` 只是"从 `a` 的地址开始，跳过 `i` 个元素，然后访问"。编译器不会替你查 `i` 是不是小于 3——它只负责算出地址。

### 越界写会发生什么
越界写的结局同样有三档，而且第一档最常见：

| 结局 | 现象 | 例子 |
|---|---|---|
| 悄悄改掉相邻数据 | 别的变量/数组元素莫名变化 | `a[3] = 99` 落在 `a` 后面的对象上 |
| 崩溃 | ASan 报 `stack-buffer-overflow` / 段错误 | 写到栈保护页、堆块之外 |
| 什么都没发生 | 那块内存没人用，程序照常结束 | 越界到填充字节里 |

看一个"什么都没崩"的版本：`grid` 是 2 行 3 列，`grid[0]` 只有 3 个元素，写 `grid[0][3]` 越界了，但算出来的地址正好是 `grid[1][0]`：

```c run id=oob-inner sanitize=off
#include <stdio.h>

int main(void) {
    int grid[2][3] = { { 1, 2, 3 }, { 4, 5, 6 } };
    int i = 3;                      /* 运行时下标：绕过编译期的常量越界检查 */

    printf("before: %d %d %d / %d %d %d\n", grid[0][0], grid[0][1], grid[0][2], grid[1][0], grid[1][1], grid[1][2]);
    grid[0][i] = 99;                /* UB：grid[0] 的下标只能是 0、1、2 */
    printf("after : %d %d %d / %d %d %d\n", grid[0][0], grid[0][1], grid[0][2], grid[1][0], grid[1][1], grid[1][2]);
    return 0;
}
```
```output
before: 1 2 3 / 4 5 6
after : 1 2 3 / 99 5 6
```

程序没崩、退出码是 0、输出完全可读，唯一"异常"是 `grid[1][0]` 从 4 变成了 99。如果把 `grid[0][i]` 换成 `grid[1][i]`，同样的越界就会落到 `grid` 之外，可能踩到别的局部变量、可能踩到 ASan 的红区。

### 内存图：越界的下标落在哪里
`grid` 是**连续**存放的：先放第 0 行的 3 个 `int`，紧接着放第 1 行的 3 个 `int`，一共 24 字节。`grid[0][3]` 的地址等于 `grid[0]` 的起始地址加 12 字节，也就是 `grid[1][0]` 的地址——所以那次写"看起来只是改了下一行"：

```memory title="int grid[2][3] = {{1,2,3},{4,5,6}}（x86-64 小端，每个 int 4 字节，地址为示意）"
地址 | 内容 | 归属 | 说明
grid+0 | 1 | grid[0][0] | 第 0 行的第 1 个元素
grid+4 | 2 | grid[0][1] | 第 0 行的第 2 个元素
grid+8 | 3 | grid[0][2] | 第 0 行的最后一个元素
grid+12 | 4（被改成 99） | grid[1][0] | grid[0][3] 算出来的地址正是这里：越界写落进了下一行
grid+16 | 5 | grid[1][1] | 第 1 行的第 2 个元素
grid+20 | 6 | grid[1][2] | 整个对象的最后一个元素，再往后就是 UB
```

这张图解释了两件事：

- **"越界"是相对"这一行"说的**：`grid[0]` 的类型是 `int[3]`，所以 `grid[0][3]` 越界；但相对整个 `grid` 对象，这个地址仍在里面，于是没有任何硬件或运行时会阻止它；
- **越界写改的是"别人"的数据**：这次是同一对象的另一个元素，下次就可能是循环变量、函数返回地址、堆块的元信息——这也是很多"莫名其妙的 bug"的来源。

### 越界读：读到的是"别人的数据"
读越界比写越界更隐蔽：程序不会破坏任何东西，只是把一个不该读的位置当成自己的数据。下面这个循环把边界写成了 `i <= 4`，于是多读了 `a[4]`：

```c run id=oob-loop-o2 opt=-O2 sanitize=off nocheck reason="越界读到的值取决于栈上残留的内容，-O0 与 -O2 会给出不同的数"
#include <stdio.h>

int main(void) {
    int a[4] = { 1, 2, 3, 4 };
    int sum = 0;
    for (int i = 0; i <= 4; i++) {
        sum += a[i];               /* UB：i == 4 时读的是 a[4] */
    }
    printf("sum = %d\n", sum);
    return 0;
}
```

`sum` 会变成"1+2+3+4+某个不知道是什么的数"，而那个数每次运行、每个优化级别都可能不同——所以这块输出无法作为预期值。

把 sanitizer 打开，越界会立刻变成一条明确的报告。**同一段代码，判题结果可能是 `UB` 也可能是 `RE`**，取决于编译器用哪种检查抓到了它：

```c run id=oob-ubsan expect=UB
#include <stdio.h>

int main(void) {
    int a[3] = { 1, 2, 3 };
    int i = 3;

    a[i] = 42;                     /* UBSan 的数组边界检查抓的是"下标越界"这件事本身 */
    printf("a[0] = %d\n", a[0]);
    return 0;
}
```

而通过指针访问时，UBSan 看不到"这是哪个数组的第几个元素"，只剩 ASan 能靠内存红区发现越界：

```c run id=oob-asan expect=RE
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *p = malloc(3 * sizeof *p);
    if (p == NULL) {
        return 1;
    }
    p[0] = 1;
    p[1] = 2;
    p[2] = 3;
    p[3] = 4;                      /* 堆上越界写：ASan 报 heap-buffer-overflow */
    printf("p[0] = %d\n", p[0]);
    free(p);
    return 0;
}
```

这两块的区别值得记住：**`UB` 是"编译器知道这里越界了"，`RE` 是"程序真的碰到了不该碰的内存"**。两者都说明代码有问题，但只有前者是"语言层面的确定性报告"。

### -O0 与 -O2：越界代码可能被整个优化掉
这是本知识点最容易让人误判的地方。看这个经典的"字符串忘了给 `'\0'` 留位置"：

```c run id=oob-strcpy-o0 warnings=allow expect=RE
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[8];
    strcpy(buf, "123456789");      /* 9 个字符 + '\0' = 10 字节，放不进 8 字节 */
    printf("%s\n", buf);
    return 0;
}
```

`-O0` 下它真的往 8 字节的缓冲区里写了 10 字节，ASan 立刻报 `stack-buffer-overflow`。换成 `-O2`，同一份代码却"成功"了：

```c run id=oob-strcpy-o2 opt=-O2 warnings=allow
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[8];
    strcpy(buf, "123456789");      /* 9 个字符 + '\0' = 10 字节，放不进 8 字节 */
    printf("%s\n", buf);
    return 0;
}
```
```output
123456789
```

用 `-O2 -S` 看汇编，`main` 里只剩两条指令：

```asm
main:
	callq	__main
	callq	puts
```

`buf`、`strcpy`、`printf` 全都不见了。编译器发现字符串字面量的内容已知、`printf("%s\n", buf)` 等价于 `puts("123456789")`，于是**把整个缓冲区连同那次越界写一起删掉了**——越界写从未发生，程序自然"没事"。

这就是"能跑不等于正确"的极端形态：**你写的那行 UB 代码根本没有被执行**。它没有变正确，只是变得不可观测。一旦换个编译器、改一下 `printf` 的用法、或者把字符串改成运行时才知道的内容，这段越界写就会回来，而且那时候你已经"验证过它没问题"了。

### 怎么写才不会越界
四条足够挡住绝大多数问题：

1. **访问前判界**：`if (i >= 0 && i < n)` 之后再 `a[i]`，判界和访问必须在同一个地方，不能"先取出来再检查"；
2. **算数组长度时想清楚"要不要多留一格"**：字符串要留 `'\0'`，差分数组要留 `n + 1` 个位置，哨兵要留 1 格；
3. **长度用 `size_t` 时别写 `i >= 0`**：`size_t` 是无符号的，`i >= 0` 恒真，循环会一路越界；
4. **把 sanitizer 当成日常测试的一部分**：正常的测试用例很难覆盖到"下标恰好等于长度"这种边界，sanitizer 会替你在越界发生的那一瞬间报警。

正确写法长这样，越界的查询返回一个"无效"标记，绝不访问数组：

```c run id=oob-safe
#include <stdio.h>

static int safe_get(const int *a, int n, int idx) {
    if (idx < 0 || idx >= n) {
        return -1;                 /* 先判界 */
    }
    return a[idx];                 /* 判界之后才访问 */
}

int main(void) {
    int a[3] = { 10, 20, 30 };
    int queries[5] = { 0, 2, 3, -1, 1 };
    for (int k = 0; k < 5; k++) {
        int v = safe_get(a, 3, queries[k]);
        if (v < 0) {
            printf("a[%d] = 越界\n", queries[k]);
        } else {
            printf("a[%d] = %d\n", queries[k], v);
        }
    }
    return 0;
}
```
```output
a[0] = 10
a[2] = 30
a[3] = 越界
a[-1] = 越界
a[1] = 20
```

## 编译与运行

按"零警告 + 开 sanitizer"的方式编译，越界会立刻暴露：

```bash
gcc -std=c17 -Wall -Wextra -fsanitize=address,undefined oob.c -o oob
./oob
```

```bash
clang -std=c17 -Wall -Wextra -g -fsanitize=address,undefined -fno-sanitize-recover=all oob.c -o oob
./oob
```

两个优化级别都跑一遍，专门用来对付"越界被优化掉"的情况：

```bash
clang -std=c17 -O0 -fsanitize=address,undefined oob.c -o oob0 && ./oob0
clang -std=c17 -O2 -fsanitize=address,undefined oob.c -o oob2 && ./oob2
```

注意 `-O2` 下 sanitizer 也可能"抓不到"，因为代码已经被删了；这时候把 `-O0` 和 `-O2` 的结果对比着看，或者干脆在测试里用运行时才知道的下标（例如从 `stdin` 读），让编译器没法提前把整个计算折叠掉。

如果只想让数组边界检查生效、不想承担 ASan 的开销，可以单独开 UBSan：

```bash
clang -std=c17 -Wall -Wextra -fsanitize=undefined -fno-sanitize-recover=all oob.c -o oob
```

本平台的对应关系是：`index N out of bounds for type 'int[M]'` 这类 UBSan 报告判 `UB`；`stack-buffer-overflow` / `heap-buffer-overflow` 这类 ASan 报告判 `RE`。两者都表示代码越界了，只是发现途径不同。

## 常见错误

### 循环边界写成 `i <= n`
长度为 `n` 的数组，最后一个合法下标是 `n - 1`。写成 `i <= n` 会多访问一个元素：写操作可能改掉相邻变量，读操作会读到一个不该读的值。这个错误在"从 1 开始数"的题目里尤其常见，因为思维上习惯"第 n 个"。

```c
int a[4] = { 1, 2, 3, 4 };
for (int i = 0; i <= 4; i++) {     /* i == 4 时越界 */
    a[i] = 0;
}
```

### 字符串忘了给 `'\0'` 留位置
`char buf[8]` 最多装 7 个字符加一个结束符。`strcpy(buf, "123456789")` 要写 10 字节，越界 2 字节。正确的做法是用 `snprintf`/`strncpy` 限制长度，或者把缓冲区开得比最长内容多 1。

```c
char buf[8];
strcpy(buf, "123456789");          /* UB：写 10 字节到 8 字节的缓冲区 */
```

### 以为"越界读到 0"是安全的
越界读到的内容是那块内存上"现在有什么"，可能是别的变量、可能是填充字节、可能是 0——但**恰好是 0 只是巧合**，不是语言保证。把"读到 0"当成"数组末尾有哨兵"，一旦换个编译选项就会得到别的值。

### 把 `&a[n]` 和 `a[n]` 混为一谈
`&a[n]`（one-past-the-end）是合法的地址计算，常用来做循环上界；`a[n]` 是解引用，是 UB。同样，`a + n` 合法，`*(a + n)` 不合法。

## 客观题

### q-s5-ub-out-of-bounds-1 single
有 `int grid[2][3]`，为什么 `grid[0][3] = 99` 是未定义行为，而程序却常常"成功"地把 `grid[1][0]` 改成了 99？

- [x] 因为 `grid[0]` 的类型是 `int[3]`，下标 3 已经超出了这个数组对象；但 `grid` 的 6 个 `int` 是连续存放的，算出来的地址正好落在 `grid[1][0]` 上，所以写操作在硬件层面照样完成
  > 正确。UB 的判定依据是"访问是否在对象边界内"，而 `grid[0][3]` 越过了 `int[3]` 的边界；但地址计算是纯粹的偏移，`grid+12` 恰好是 `grid[1][0]`，于是写操作真的执行了。语言层面它仍然是 UB——换一种内存布局（比如 `grid` 后面紧跟着别的变量）就会改坏别的东西。
- [ ] 因为 C 的数组会自动扩容，`grid[0][3]` 实际上是合法的第 4 个元素
  > 错。C 的数组**没有**自动扩容，长度在声明时就固定了，`int[3]` 永远只有 3 个元素。`grid[0][3]` 不是"第 4 个元素"，而是"越过这个对象之后的位置"。
- [ ] 因为 `grid[0][3]` 只有在写的时候才是 UB，读的时候是合法的
  > 错。读和写都要求地址落在对象边界内，`grid[0][3]` 无论是读还是写都是 UB。区别只在于"写会破坏数据、读会拿到垃圾值"，以及 sanitizer 报错的措辞不同。
- [ ] 因为 `grid` 是二维数组，二维数组的下标不做边界检查，所以二维数组的越界总是合法的
  > 错。C 的所有数组下标都不做运行期检查，但这只说明"编译器不拦你"，不说明"合法"。`grid[0][3]` 越过了 `int[3]` 这个对象，依然是 UB；`grid[2][0]` 越过整个 `grid` 对象，同样是 UB，只是更容易崩。
