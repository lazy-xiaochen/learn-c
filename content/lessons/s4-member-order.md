---
id: s4-member-order
---

## 讲解

### 同一组成员，换个顺序大小就变了
上一节我们看到：结构体的大小由"成员对齐 + 填充"决定。既然填充取决于"前一个成员结束的位置"，那么**同样的成员、不同的排列顺序，会得到不同的填充量，从而得到不同的 `sizeof`**。下面三个结构体的成员完全一样，只是顺序不同：

```c run id=order-three-sizes
#include <stdio.h>
#include <stddef.h>

struct Bad {
    char flag;
    double value;
    char tag;
    int id;
    short port;
};

struct Mixed {
    double value;
    char flag;
    char tag;
    int id;
    short port;
};

struct Good {
    double value;
    int id;
    short port;
    char flag;
    char tag;
};

int main(void) {
    printf("Bad   = %zu\n", sizeof(struct Bad));
    printf("Mixed = %zu\n", sizeof(struct Mixed));
    printf("Good  = %zu\n", sizeof(struct Good));
    printf("Bad:  flag=%zu value=%zu tag=%zu id=%zu port=%zu\n",
           offsetof(struct Bad, flag), offsetof(struct Bad, value),
           offsetof(struct Bad, tag), offsetof(struct Bad, id), offsetof(struct Bad, port));
    printf("Good: value=%zu id=%zu port=%zu flag=%zu tag=%zu\n",
           offsetof(struct Good, value), offsetof(struct Good, id),
           offsetof(struct Good, port), offsetof(struct Good, flag), offsetof(struct Good, tag));
    printf("saved = %zu\n", sizeof(struct Bad) - sizeof(struct Good));
    return 0;
}
```
```output
Bad   = 32
Mixed = 24
Good  = 16
Bad:  flag=0 value=8 tag=16 id=20 port=24
Good: value=0 id=8 port=12 flag=14 tag=15
saved = 16
```

`Bad` 和 `Good` 的成员加起来都是 16 字节，但 `sizeof` 一个是 32、一个是 16——**一半的差距来自排列顺序**。`Mixed` 是"把 `double` 提到最前、但后面的小成员没有继续排好"的中间状态，24 字节。

### 填充是怎么被"制造"出来的
回顾规则：放一个成员前，先把已占用字节数向上取整到它的对齐值。`Bad` 的排布是：

1. `flag`（1 字节，对齐 1）放在 0；
2. `value`（8 字节，对齐 8）要放到 8 的倍数，已占用 1 → 空出 `[1,8)` 的 7 字节，`value` 放在 8..15；
3. `tag`（1 字节，对齐 1）放在 16；
4. `id`（4 字节，对齐 4）要放到 4 的倍数，已占用 17 → 空出 `[17,20)` 的 3 字节，`id` 放在 20..23；
5. `port`（2 字节，对齐 2）放在 24..25；
6. 结构体对齐值是 8，26 要补到 32，尾部再空 6 字节。

把 `double` 放到最前面之后，`value` 从 0 开始，后面全是 1/2/4 字节的小成员，只要按"对齐大的先放"排，就不会再出现"小成员后面跟大成员"造成的空洞：

- `value` 占 0..7；
- `id` 要 4 对齐，8 正好是 4 的倍数，占 8..11；
- `port` 要 2 对齐，12 是 2 的倍数，占 12..13；
- `flag` 占 14，`tag` 占 15；
- 16 已经是 8 的倍数，没有尾部填充，`sizeof = 16`。

两个结构体的字节地图对照如下（`Bad` 的 32 字节里有 16 字节是填充，`Good` 一个填充字节都没有）：

```memory title="struct Bad：32 字节，其中 16 字节是填充"
偏移 | 内容 | 说明
0 | flag | char，对齐 1
1-7 | 填充 | 让 double 落在 8 的倍数上
8-15 | value | double，对齐 8
16 | tag | char，对齐 1
17-19 | 填充 | 让 int 落在 4 的倍数上
20-23 | id | int，对齐 4
24-25 | port | short，对齐 2
26-31 | 尾部填充 | 总大小取整到最大对齐 8 的倍数
```

```memory title="struct Good：16 字节，按对齐值从大到小，没有任何填充"
偏移 | 内容 | 说明
0-7 | value | double，对齐 8
8-11 | id | int，对齐 4，8 是 4 的倍数
12-13 | port | short，对齐 2，12 是 2 的倍数
14 | flag | char，对齐 1
15 | tag | char，对齐 1
```

### 为什么"按对齐值从大到小"是最优的
这不是巧合。设当前成员的对齐值是 `a`，它前面所有成员的对齐值都不小于 `a`。因为：

1. 每种类型的**大小都是它自身对齐值的倍数**（标量类型大小等于对齐值；数组大小 = 元素个数 × 元素大小，也是对齐值的倍数；结构体大小同样被取整到对齐值）；
2. 对齐值都是 2 的幂，所以"前面的对齐值 ≥ `a`"意味着前面的对齐值是 `a` 的倍数；
3. 于是前面每个成员的大小都是 `a` 的倍数，累加起来仍然是 `a` 的倍数——**当前成员的偏移天然就是对齐的，不需要任何填充**。

按对齐值从大到小排列时，这个条件对每个成员都成立，所以**内部填充全部消失**，只剩最后那一次"把总大小取整到最大对齐值"的尾部填充。而任何排列的 `sizeof` 都不可能小于"成员大小之和向上取整到最大对齐值"，所以按对齐值降序就是最优解（对大小等于对齐值的标量类型来说，按大小降序和按对齐值降序是一回事）。

反过来，只要出现"小的先放、大的后放"，就可能在中间挖洞。`Bad` 里 `flag` 在 `value` 前面挖了 7 字节，`tag` 在 `id` 前面挖了 3 字节——这就是 16 字节的浪费来源。

### 不是所有重排都能变小
如果成员本来就没有"小前大后"的问题，重排不会带来收益。最典型的是"总大小向上取整"决定了结果的情况：

```c run id=order-tail-padding
#include <stdio.h>

struct T1 {
    int id;
    char code;
};

struct T2 {
    char code;
    int id;
};

struct D1 {
    double value;
    char flag;
};

struct D2 {
    char flag;
    double value;
};

int main(void) {
    printf("T1=%zu T2=%zu\n", sizeof(struct T1), sizeof(struct T2));
    printf("D1=%zu D2=%zu\n", sizeof(struct D1), sizeof(struct D2));
    return 0;
}
```
```output
T1=8 T2=8
D1=16 D2=16
```

`T1` 是 `int` 在前、`char` 在后，`T2` 是 `char` 在前、`int` 在后：`T2` 中间有 3 字节填充、`T1` 尾部有 3 字节填充，但两者总大小都是 8。`D1`/`D2` 同理：`char` 放在 `double` 前面会多 7 字节内部填充，放在后面会多 7 字节尾部填充，总数都是 16。**重排只能消除内部填充，消不掉"总大小必须是最大对齐值倍数"带来的尾部填充。**

所以优化时要看目标：如果成员集合的"大小之和"刚好接近对齐值的倍数，怎么排都一样；只有当内部空洞能被消除、并且消除后总大小真的下降时，重排才有意义。`Bad → Good` 是 32 → 16，收益 100%；而 `D2 → D1` 是 16 → 16，白忙一场。

### 数组会把差距成倍放大
结构体数组里每个元素都带着同样的填充，所以单条记录的差距会乘以元素个数：

```c run id=order-array-cost
#include <stdio.h>

struct Bad {
    char flag;
    double value;
    char tag;
    int id;
    short port;
};

struct Good {
    double value;
    int id;
    short port;
    char flag;
    char tag;
};

int main(void) {
    printf("1000 x Bad  = %zu 字节\n", 1000 * sizeof(struct Bad));
    printf("1000 x Good = %zu 字节\n", 1000 * sizeof(struct Good));
    printf("节省        = %zu 字节\n", 1000 * (sizeof(struct Bad) - sizeof(struct Good)));
    return 0;
}
```
```output
1000 x Bad  = 32000 字节
1000 x Good = 16000 字节
节省        = 16000 字节
```

这还只是内存。缓存行通常是 64 字节：32 字节的结构体一行只能放 2 个，16 字节的能放 4 个。遍历数组时，缓存命中率会差一倍，数据量大时性能差距非常明显。**调整成员顺序是"零成本的优化"**：不用改算法、不用改接口，只改声明顺序，就能同时省内存和提高缓存命中率。

### 代价：顺序是二进制布局的一部分
成员顺序不是纯粹的内部细节，它决定了结构体的**内存布局**，而内存布局会暴露在三个地方：

1. **跨文件的 ABI**：头文件里的结构体定义被多个 `.c` 包含，所有文件必须看到完全相同的顺序。只改一个头文件、不重新编译所有使用者，就会出现"一个文件按旧布局读、另一个按新布局写"的灾难；
2. **二进制文件/网络协议**：把结构体直接 `fwrite` 到文件、或通过 socket 发送时，成员顺序和填充都会进入字节流。重排之后旧文件读不出来，新旧程序也无法互通；
3. **`memcpy` / `memset` / `offsetof` 的硬编码**：任何按固定偏移访问结构体裸内存的代码，都会在重排后失效。

所以：**只在"纯内存中的数据结构"上为了省空间而重排；对外的协议结构体、文件格式结构体，顺序必须按规范固定**，需要紧凑时用 `#pragma pack` 或手工序列化（下一节会讲），而不是擅自调整顺序。

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra order.c -o order
./order
```

```bash
clang -std=c17 -Wall -Wextra order.c -o order
./order
```

查看编译器实际排布，可以用 Clang 的记录布局转储：

```bash
clang -std=c17 -Xclang -fdump-record-layouts order.c -o order
```

```text
*** Dumping AST Record Layout
         0 | struct Bad
         0 |   char flag
         8 |   double value
        16 |   char tag
        20 |   int id
        24 |   short port
           | [sizeof=32, align=8]

*** Dumping AST Record Layout
         0 | struct Good
         0 |   double value
         8 |   int id
        12 |   short port
        14 |   char flag
        15 |   char tag
           | [sizeof=16, align=8]
```

用 `-Wpadded` 可以让编译器在每次插入填充时警告，适合检查"这个结构体还有没有优化空间"：

```bash
clang -std=c17 -Wall -Wextra -Wpadded order.c -o order
```

`Bad` 会得到 3 条 `-Wpadded` 警告（`value` 前、`id` 前、尾部），`Good` 一条都没有。注意 `-Wpadded` 只报告"有没有填充"，不会告诉你该怎么排；优化顺序还是要自己按对齐值排序。

## 常见错误

### 以为成员顺序不影响 sizeof [WA]
这是最常见的误解：结构体大小不是"成员大小之和"，而是"按对齐规则排布后的总大小"。`Bad` 和 `Good` 的成员完全相同，`sizeof` 却是 32 和 16。凡是需要评估内存占用（数组、缓冲区、协议包）的地方，都要用 `sizeof` 实际测量，而不是拿成员大小相加。

### 只把最大的成员挪到最前面，其余保持原顺序 [WA]
"把 `double` 放最前"只解决了最大的那个洞，小成员之间仍可能互相挖洞：

```c run expect=OK
#include <stdio.h>

struct A { char a; short b; char c; int d; };   /* 原始顺序 */
struct B { int d; char a; short b; char c; };   /* 只把 int 挪到最前 */
struct C { int d; short b; char a; char c; };   /* 按对齐值从大到小 */

int main(void) {
    printf("A=%zu B=%zu C=%zu\n", sizeof(struct A), sizeof(struct B), sizeof(struct C));
    return 0;
}
```
```output
A=12 B=12 C=8
```

`B` 把 `int` 提到最前，但 `char a` 后面紧跟 `short b`，`a` 结束于 5（`int` 占 0..3，`a` 在 4），`b` 要 2 对齐，于是 `[5,6)` 又空出 1 字节。`C` 把 `short` 也排到 `char` 前面，才真正消除内部填充。**要排就排完整：按对齐值从大到小，而不是只动最大的一个。**

### 重排后没有同步所有使用同一结构体的文件 [WA]
结构体定义在头文件里，`device.c` 按旧顺序写文件、`main.c` 按新顺序读文件，编译器不会报错，但读出来的字段全是错位的。重排结构体后必须**重新编译所有包含该头文件的翻译单元**，并检查所有按固定偏移访问内存的代码（`offsetof` 常量、`memcpy`、`fread`/`fwrite`、网络协议解析）。如果这个结构体是文件格式或通信协议的一部分，就根本不应该重排。

### 在协议结构体上为了省内存而重排 [WA]
网络包头、文件头这类结构体的顺序由协议规定，接收方按固定偏移解析；你在这边重排、省了 8 字节，对方的解析就全乱了。协议结构体应当用 `#pragma pack(1)`（如果协议要求紧凑）或逐字段序列化，而不是调整成员顺序。**省内存和保持二进制兼容，很多时候只能选一个。**

## 客观题

### q-s4-member-order-1 single
成员类型为 `char flag; double value; char tag; int id; short port;`。下面哪种声明顺序能得到最小的 `sizeof`（本平台 x86-64）？

- [x] `double value; int id; short port; char flag; char tag;`，`sizeof` 为 16
  > 正确。按对齐值从大到小排列：`value` 占 0..7，`id` 占 8..11，`port` 占 12..13，`flag` 占 14，`tag` 占 15；总大小 16 已经是最大对齐值 8 的倍数，没有填充。成员总大小是 16，所以 16 就是理论下界。
- [ ] `char flag; double value; char tag; int id; short port;`，`sizeof` 为 32
  > 错。这是原始顺序：`flag` 后面的 `value` 要 8 对齐，空出 7 字节；`tag` 后面的 `id` 要 4 对齐，空出 3 字节；最后还要补到 32。它比最优解多出 16 字节填充，不是最小。
- [ ] `double value; char flag; char tag; int id; short port;`，`sizeof` 为 24
  > 错。`value` 放最前后，两个 `char` 紧接着占了 8、9，`id` 要 4 对齐，于是 `[10,12)` 空出 2 字节；`port` 在 16..17，尾部还要补到 24。它比最优解多 8 字节，说明"只把最大的放最前"并不够。
- [ ] `char flag; char tag; int id; short port; double value;`，`sizeof` 为 24
  > 错。两个 `char` 占 0、1；`id` 要 4 对齐，空出 `[2,4)`；`port` 在 8..9；`value` 要 8 对齐，空出 `[10,16)`，放在 16..23，总大小 24。把 `double` 放最后同样会留下内部填充，还是比最优解多 8 字节。
