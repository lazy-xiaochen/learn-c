---
id: s7-iv-struct-align
---

## 讲解

### 面试官在问什么
"这个结构体占多少字节？为什么不是成员大小之和？"——这是 C 面试里最常被要求**当场手算**的题。面试官想看三件事：你会不会用对齐规则算 `sizeof` 和 `offsetof`、你知不知道**为什么**要这样排、你能不能说出**怎么优化**以及优化的代价。

### 口述版答案
**三句话把规则说完（先背这三句，现场再展开）**

1. **成员偏移**：每个成员放在"**自身对齐值**的整数倍"偏移上，不足的部分用填充字节补齐。
2. **结构体对齐值** = 所有成员对齐值中的**最大值**。
3. **结构体总大小** = 最后一个成员结束的位置，向上取整到"结构体对齐值"的倍数（差出来的部分是**尾部填充**）。

**三句话之外的补充（说一句加一分）**

- 成员的对齐值通常等于它的大小：`char` 1、`short` 2、`int` 4、`double`/`long long`/指针 8（本平台 64 位）。
- 数组的对齐值 = **元素类型**的对齐值，数组大小 = 元素大小 × 元素个数。
- 嵌套结构体：内层结构体的对齐值算进外层的"最大值"，内层 `sizeof`（已含自己的填充）当作成员大小。
- 结构体大小的实际公式：`sizeof = 向上取整(最后一个成员结束位置, 结构体对齐值)`，成员之间的填充 + 尾部填充 = `sizeof − 各成员大小之和`。

**为什么要对齐（一句话）**：CPU 访问内存按"字"为单位，未对齐的访问可能被拆成两次总线操作，某些架构（ARM 的 `LDR`、SPARC）甚至会直接触发异常；所以编译器用**填充**换**访问效率**。

**为什么尾部也要填（最容易被追问）**：结构体常常放在数组里，`sizeof` 同时就是数组元素之间的步长；只有 `sizeof` 是结构体对齐值的倍数，才能保证**数组里每一个元素**的成员都仍然对齐。

**怎么减小结构体（面试官爱问的加分项）**

- **按对齐值从大到小排列成员**，可以把成员之间的填充压到 0，只剩尾部填充；对同一个成员集合，降序排列得到的就是最小 `sizeof`。
- **`#pragma pack(1)`** 能消掉所有填充，但代价是成员**未对齐**：x86 上慢一点，ARM 上可能直接崩；而且结构体的二进制布局变成非标准的，跟别的模块/文件交换数据时容易出现 ABI 不一致。

**手算模板（现场就这么念）**：从偏移 0 开始，对每个成员先"把当前偏移向上取整到成员对齐值的倍数"，记下这个偏移，再加上成员大小；全部放完后，把总偏移向上取整到最大对齐值。

以 `struct Student { char id; int score; char grade; double gpa; };` 为例：

| 成员 | 类型大小 | 对齐 | 放置前偏移 | 取整后偏移 | 结束位置 |
|---|---|---|---|---|---|
| `id` | 1 | 1 | 0 | 0 | 1 |
| `score` | 4 | 4 | 1 | 4 | 8 |
| `grade` | 1 | 1 | 8 | 8 | 9 |
| `gpa` | 8 | 8 | 9 | 16 | 24 |

最大对齐值是 8，24 已经是 8 的倍数，所以 `sizeof` = **24**，填充 = 24 − 14 = **10** 字节。

### 口述版：三个追问
- **追问 1：为什么 `sizeof` 不是 14？**
  答：`score` 前面补了 3 字节、`gpa` 前面补了 7 字节，总共 10 字节填充。填充不是浪费，是为了让每个成员都落在自己的对齐边界上。
- **追问 2：调整成员顺序为什么能省内存？**
  答：填充只由"前一个成员结束的位置"和"当前成员的对齐值"决定。把对齐值大的成员放前面，后面的小成员就不会制造新的"取整空档"；降序排列时每个成员的结束位置天然是下一个成员对齐值的倍数，成员之间的填充为 0，只剩尾部那一点。
- **追问 3：`#pragma pack(1)` 有什么代价？**
  答：结构体变小了，但成员可能落在任意偏移上：**访问变慢**（x86 上可能拆成多次访问），**某些平台直接崩溃**，而且这个布局是编译器扩展、不是标准保证的，跨模块传递时一旦有一边忘了 `pack` 就会解析错位。

### 代码版答案
口述完规则，接下来要能写出**可验证**的代码。`offsetof` 是标准库给的"成员偏移查询"，第二个参数是**成员名**（不是值），它在编译期就能算出来，不需要真的有一个结构体对象。

**第一段：用 `offsetof` 把 24 字节的布局逐项打印出来。**

```c run id=sa-offsets
#include <stdio.h>
#include <stddef.h>

struct Student {
    char id;
    int score;
    char grade;
    double gpa;
};

int main(void) {
    printf("sizeof=%zu align=%zu\n", sizeof(struct Student), _Alignof(struct Student));
    printf("id    offset=%zu size=%zu\n", offsetof(struct Student, id), sizeof(char));
    printf("score offset=%zu size=%zu\n", offsetof(struct Student, score), sizeof(int));
    printf("grade offset=%zu size=%zu\n", offsetof(struct Student, grade), sizeof(char));
    printf("gpa   offset=%zu size=%zu\n", offsetof(struct Student, gpa), sizeof(double));
    printf("padding=%zu\n", sizeof(struct Student) - (1 + 4 + 1 + 8));
    return 0;
}
```
```output
sizeof=24 align=8
id    offset=0 size=1
score offset=4 size=4
grade offset=8 size=1
gpa   offset=16 size=8
padding=10
```

`score` 的偏移是 4 而不是 1，`gpa` 的偏移是 16 而不是 9——这两处"跳过去"的字节就是填充。`_Alignof(struct Student)` 是 8，等于最大的成员对齐值；`sizeof` 24 也是 8 的倍数，满足"数组元素连续排列时每个元素都对齐"。

**第二段：把成员按对齐值降序重排，`sizeof` 从 24 降到 16。**

```c run id=sa-reorder
#include <stdio.h>
#include <stddef.h>

struct A {          /* 声明顺序：char, int, char, double */
    char id;
    int score;
    char grade;
    double gpa;
};

struct B {          /* 按对齐值降序：double, int, char, char */
    double gpa;
    int score;
    char id;
    char grade;
};

int main(void) {
    printf("A sizeof=%zu\n", sizeof(struct A));
    printf("B sizeof=%zu\n", sizeof(struct B));
    printf("saved=%zu\n", sizeof(struct A) - sizeof(struct B));
    printf("B: gpa=%zu score=%zu id=%zu grade=%zu\n",
           offsetof(struct B, gpa), offsetof(struct B, score),
           offsetof(struct B, id), offsetof(struct B, grade));
    return 0;
}
```
```output
A sizeof=24
B sizeof=16
saved=8
B: gpa=0 score=8 id=12 grade=13
```

成员一个没少，只换了顺序，就从 24 变成 16：`B` 里每个成员的偏移都是前一个成员自然结束的位置，成员之间的填充是 0，只有尾部 14 → 16 的 2 字节填充。**"按对齐值降序排"就是最小大小的构造方法**，面试时能说出这一点通常就够了。

**第三段：`#pragma pack(1)` 消掉填充，代价是成员未对齐。**

```c run id=sa-pack
#include <stdio.h>
#include <stddef.h>

#pragma pack(push, 1)
struct Packed {     /* 紧凑布局：不插任何填充 */
    char id;
    int score;
    char grade;
    double gpa;
};
#pragma pack(pop)

int main(void) {
    printf("packed sizeof=%zu\n", sizeof(struct Packed));
    printf("score offset=%zu gpa offset=%zu\n",
           offsetof(struct Packed, score), offsetof(struct Packed, gpa));
    printf("score 对齐？%s\n", offsetof(struct Packed, score) % _Alignof(int) == 0 ? "yes" : "no");
    printf("gpa   对齐？%s\n", offsetof(struct Packed, gpa) % _Alignof(double) == 0 ? "yes" : "no");
    return 0;
}
```
```output
packed sizeof=14
score offset=1 gpa offset=6
score 对齐？no
gpa   对齐？no
```

`sizeof` 从 24 变成 14，但 `score` 落在偏移 1、`gpa` 落在偏移 6，**都不是自己对齐值的倍数**。这就是 pack 的代价：省了 10 字节，换来的是可能慢几倍的未对齐访问，以及在部分平台上直接触发异常。**面试时说完"可以 pack"一定要跟上这句代价**，否则会被追问到底。

**第四段：嵌套结构体——内层的 `sizeof` 当作外层成员的大小。**

```c run id=sa-nested
#include <stdio.h>
#include <stddef.h>

struct Inner {
    char tag;
    int value;
};                              /* 1 + 3 填充 + 4 = 8 字节，对齐 4 */

struct Outer {
    char kind;                  /* 偏移 0 */
    struct Inner in;             /* 对齐 4，偏移 4，占 8 字节 */
    char end;                   /* 偏移 12 */
    double total;               /* 对齐 8，偏移 16，占 8 字节 */
};

int main(void) {
    printf("Inner sizeof=%zu align=%zu\n", sizeof(struct Inner), _Alignof(struct Inner));
    printf("Outer sizeof=%zu align=%zu\n", sizeof(struct Outer), _Alignof(struct Outer));
    printf("kind=%zu in=%zu end=%zu total=%zu\n",
           offsetof(struct Outer, kind), offsetof(struct Outer, in),
           offsetof(struct Outer, end), offsetof(struct Outer, total));
    return 0;
}
```
```output
Inner sizeof=8 align=4
Outer sizeof=24 align=8
kind=0 in=4 end=12 total=16
```

`Inner` 自己已经含了 3 字节内部填充，所以外层把它当成一个 8 字节、对齐 4 的成员；`Outer` 的最大对齐值是 8（来自 `double`），24 正好是 8 的倍数。嵌套时**先把内层算成一个"黑盒"**，再算外层，就不会乱。

**把布局画到内存里看一遍**（下面是 `struct Student` 的 24 个字节）：

```memory title="struct Student { char id; int score; char grade; double gpa; }（地址为示意）"
偏移 | 字节 | 成员 | 说明
0 | 'A' | id | 1 字节
1–3 | 填充 | —— | score 要求 4 的倍数，补 3 字节
4–7 | 95 | score | int，4 字节
8 | 'B' | grade | 1 字节
9–15 | 填充 | —— | gpa 要求 8 的倍数，补 7 字节
16–23 | 3.8 | gpa | double，8 字节
```

重排之后只剩尾部填充：

```memory title="按对齐值降序：struct B { double gpa; int score; char id; char grade; }（地址为示意）"
偏移 | 字节 | 成员 | 说明
0–7 | 3.8 | gpa | double 先放，偏移 0
8–11 | 95 | score | int 紧随其后，仍是 4 的倍数
12 | 'A' | id | 1 字节
13 | 'B' | grade | 1 字节
14–15 | 填充 | —— | 尾部填充到 8 的倍数
```

两张图对比着看：**填充不是随机出现的，它总是出现在"下一个成员的对齐值 > 当前结束位置"的地方**。想减少填充，就让大对齐值的成员先出场。

## 编译与运行

本平台使用 Clang（x86-64 Windows，UCRT），`gcc` 和 `clang` 都可以：

```bash
gcc -std=c17 -Wall -Wextra align.c -o align
./align
```

```bash
clang -std=c17 -Wall -Wextra align.c -o align
./align
```

**用 `_Static_assert` 把布局钉在编译期**（C11 起可用），换平台、换编译器时一编译就会报错：

```c
struct Student { char id; int score; char grade; double gpa; };
_Static_assert(sizeof(struct Student) == 24, "Student 的布局变了");
_Static_assert(offsetof(struct Student, gpa) == 16, "gpa 的偏移变了");
```

**让 Clang 直接把布局打印出来**（不需要运行程序）：

```bash
clang -std=c17 -Xclang -fdump-record-layouts -c align.c -o align.o
```

输出里能看到每个成员的偏移和结构体汇总：

```text
          0 | struct Student
           0 |   char id
           4 |   int score
           8 |   char grade
          16 |   double gpa
             | [sizeof=24, align=8]
```

**验证 pack 的效果**：把 `#pragma pack(push, 1)` 包住结构体再编译一次，同一份 `offsetof` 输出会变成 `score=1`、`gpa=6`、`sizeof=14`。注意 `_Alignof(struct Packed)` 仍然是 1——**pack 改的是成员的对齐上限，不是让成员重新对齐**。

## 常见错误

### 以为 sizeof 就是成员大小之和
`char + int + char + double` 是 14，但 `sizeof` 是 24，差的 10 字节全是填充。凡是问"这个结构体多大"的题，正确的计算流程永远是"逐个成员取整 + 最后再取整"，不是做加法。

### 调整顺序时只按"大小"排，忘了对齐值
成员的对齐值不一定等于大小：`char[5]` 大小 5、对齐 1；`struct { char c; int x; }` 大小 8、对齐 4。排顺序的依据是**对齐值从大到小**，不是"字节数从大到小"。两者大部分时候一致，但在数组和嵌套结构体上会分叉。

### 以为 pack(1) 之后成员就"对齐"了
`#pragma pack(1)` 只是**取消填充**，成员会落在任意偏移上，不会让它们变得对齐。用 `offsetof(...) % _Alignof(类型) != 0` 就能验证这一点。通过一个指向未对齐成员的指针去访问，在 x86 上通常还能跑，在 ARM 上可能直接崩，标准层面也可能触发未定义行为。

### 通过错误对齐的指针访问成员
把一个 `char *` 缓冲区强转成 `struct Student *` 再访问，看起来是"就地解析"，实际上如果缓冲区地址没有按 8 字节对齐，`double gpa` 的访问就是未对齐的。正确做法是用 `memcpy` 拷进一个真正的结构体对象，或者使用 `pack` 版本的结构体并逐字节复制。

### 以为结构体大小可以不取整到最大对齐值
`struct Student arr[10];` 的元素之间没有额外间隙，靠的正是"`sizeof` 已经是 8 的倍数"这件事——尾部填充就是为数组服务的。如果省掉最后这次向上取整，`arr[1]` 的 `gpa` 就会错位，整个数组的成员都不可用。所以"结构体大小必须向上取整"不是强迫症，而是数组连续排列的前提。

### 以为 offsetof 需要一个结构体对象
`offsetof(struct Student, gpa)` 是编译期宏，只接受**类型名和成员名**，不需要（也不能）传一个对象；写成 `offsetof(s, gpa)` 或 `offsetof(struct Student, s.gpa)` 都是错的。常见实现是 `((size_t)&((struct S *)0)->member)`，但标准只保证宏可用，不保证实现方式。

## 客观题

### q-s7-iv-struct-align-1 single
本平台 64 位，`char` 1 字节、`int` 4 字节、`double` 8 字节，对齐值等于类型大小。下面哪个结构体的 `sizeof` 是 16？

- [x] `struct { double d; int i; char c; char e; };`
  > 正确。`d` 在 0–7，`i` 在 8–11，`c` 在 12，`e` 在 13，最大对齐值是 8，末尾取整到 16。成员之间没有任何填充，只有 2 字节尾部填充——这正是"按对齐值降序排列"的结果。
- [ ] `struct { char c; double d; int i; char e; };`
  > 错。`c` 占 0，`d` 要求 8 的倍数，中间补 7 字节到偏移 8；`d` 占 8–15，`i` 占 16–19，`e` 占 20，最后取整到 24。总共 24 字节，填充 10 字节。
- [ ] `struct { char c; int i; char e; double d; };`
  > 错。`c` 占 0，`i` 补 3 字节后占 4–7，`e` 占 8，`d` 要求 8 的倍数，补 7 字节到 16–23，最后取整到 24。也是 24 字节。
- [ ] `struct { char c; short s; double d; int i; };`
  > 错。`c` 占 0，`s` 对齐 2，占 2–3；`d` 要求 8 的倍数，中间补 4 字节到偏移 8–15；`i` 占 16–19，最后取整到最大对齐值 8，得到 24 字节。
