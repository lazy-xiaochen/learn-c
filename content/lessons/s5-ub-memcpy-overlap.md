---
id: s5-ub-memcpy-overlap
---

## 讲解

### memcpy 的契约：两块内存必须不相交

`memcpy` 的声明是 `void *memcpy(void *dst, const void *src, size_t n);`，标准对它的要求只有一句关键的话（C17 7.24.2.1p2）：

> 如果复制发生在**重叠**的对象之间，行为未定义。

"重叠"指 `[dst, dst+n)` 与 `[src, src+n)` 这两段地址区间有交集。不相交时 `memcpy` 完全自由：它可以把 8 个字节当成一个 `long long` 一次搬完，可以用 SSE 的 16 字节指令一次搬 16 个字节，可以从前往后也可以从后往前——反正源和目标互不干扰，怎么搬结果都一样。**这份自由就是它比 `memmove` 快的原因**，也是标准敢写"重叠即 UB"的原因。

```c run id=memcpy-disjoint
#include <stdio.h>
#include <string.h>

int main(void) {
    char dst[16] = "0123456789";
    char src[8] = "abc";
    memcpy(dst + 4, src, 4);          /* [4,8) 与 [0,4) 不相交，合法 */
    printf("dst = %s\n", dst);
    printf("src = %s\n", src);
    return 0;
}
```
```output
dst = 0123abc
src = abc
```

内存里这两段的关系一目了然：

```memory title="memcpy(dst + 4, src, 4)：两段区间不相交（地址为示意）"
地址    | 内容 | 属于            | 说明
0x5000  | '0'  | dst[0]          | 目标区从这里开始
0x5001  | '1'  | dst[1]          | 
0x5002  | '2'  | dst[2]          | 
0x5003  | '3'  | dst[3]          | 目标区最后用到 dst[3]
0x5004  | 'a'  | dst[4] ← src[0] | 复制起点：源区在这里和后面
0x5005  | 'b'  | dst[5] ← src[1] | 
0x5006  | 'c'  | dst[6] ← src[2] | 
0x5007  | 0    | dst[7] ← src[3] | 源区多复制了一个 '\0'，结果仍是合法字符串
0x6000  | 'a'  | src[0]          | 源区在另一块内存里，和目标区毫无交集
0x6001  | 'b'  | src[1]          | 
0x6002  | 'c'  | src[2]          | 
0x6003  | 0    | src[3]          | 
```

### memmove 怎么处理重叠：先看方向

`memmove` 的语义是"**结果等同于先整块复制到一个临时缓冲区、再复制回来**"。这句话保证了三件事：源和目标可以重叠、源和目标可以相同、复制后源区被覆盖也无所谓。实现上当然不会真的分配临时缓冲区，而是判断方向：

- `dst < src`（目标在源之前）：**从前往后**逐字节搬。因为每次读的源字节都在尚未被写的区域里，写完的字节不会再被读；
- `dst > src`（目标在源之后）：**从后往前**逐字节搬。同样的道理，只是方向反过来；
- `dst == src` 或 `n == 0`：什么都不用做。

```c run id=memmove-overlap
#include <stdio.h>
#include <string.h>

int main(void) {
    char a[16] = "abcdefghij";
    char b[16] = "abcdefghij";
    memmove(a + 2, a, 8);             /* dst > src：必须从后往前 */
    memmove(b, b + 2, 8);             /* dst < src：必须从前往后 */
    printf("dst 在后: %s\n", a);
    printf("dst 在前: %s\n", b);
    return 0;
}
```
```output
dst 在后: ababcdefgh
dst 在前: cdefghijij
```

`memmove` 的正确性完全依赖"方向选对"。下面这张图是 `memmove(a + 2, a, 8)` 执行到一半的样子——从后往前搬，每次写的目标地址都比已读的源地址高：

```memory title="memmove(buf + 2, buf, 8)：重叠时从后往前搬（地址为示意）"
地址    | 内容 | 属于        | 说明
0x7000  | 'a'  | buf[0]      | 源区起点
0x7001  | 'b'  | buf[1]      | 
0x7002  | 'a'  | buf[2]      | 已写入 buf[0] 的值（第 1 个被搬的字节）
0x7003  | 'b'  | buf[3]      | 已写入 buf[1] 的值
0x7004  | 'c'  | buf[4]      | 还没动：源区 [0,8) 与目标区 [2,10) 在这里重叠
0x7005  | 'd'  | buf[5]      | 重叠区：既是被读的源，又是被写的目标
0x7006  | 'e'  | buf[6]      | 重叠区
0x7007  | 'f'  | buf[7]      | 重叠区
0x7008  | 'g'  | buf[8]      | 目标区（源区之外）
0x7009  | 'h'  | buf[9]      | 目标区最后一个字节
```

重叠区里每个字节都"既是源又是目标"，所以**必须先读后写，且顺序必须让还没读的源字节不被提前写坏**。这就是方向判断的全部意义。

### 为什么"从前往后搬"在重叠时会出错

把方向搞反，程序不会崩，只会悄悄算错——这比崩溃更难查。`buf = "abcdefghij"`，要执行 `buf[2..9] = buf[0..7]`（等价于 `memcpy(buf + 2, buf, 8)` 想要的语义），如果老老实实从前往后搬：

1. `k = 0`：`buf[2] = buf[0]`，`buf[2]` 从 `'c'` 变成 `'a'`——**源区的 `buf[2]` 被写坏了**；
2. `k = 1`：`buf[3] = buf[1]`，`buf[3]` 从 `'d'` 变成 `'b'`——源区的 `buf[3]` 也被写坏；
3. `k = 2`：`buf[4] = buf[2]`，可这时 `buf[2]` 已经是 `'a'` 了，正确的源值 `'c'` 已经不存在；
4. 之后每一步都在读"前几步刚写进去的值"，结果整个区间被 `ab` 两个字节填满。

```c run id=copy-forward-bug
#include <stdio.h>

int main(void) {
    char buf[16] = "abcdefghij";
    for (int k = 0; k < 8; k++) {
        buf[2 + k] = buf[k];          /* 从前往后搬：先写的字节污染了还没读的源 */
    }
    printf("结果 = %s\n", buf);
    return 0;
}
```
```output
结果 = ababababab
```

期望的 `ababcdefgh` 变成了 `ababababab`。注意这段代码本身**没有任何 UB**——它只是把"错误的方向"写了出来，所以编译器不会警告、sanitizer 也不会报错，只有结果不对。真正危险的是把这段逻辑塞进 `memcpy`：那时连"结果不对"都不保证，标准说什么都可能发生。

自己实现 `memmove` 时，方向判断就是全部：

```c run id=hand-memmove
#include <stdio.h>
#include <string.h>

static void my_memmove(void *dst, const void *src, size_t n) {
    unsigned char *d = dst;
    const unsigned char *s = src;
    if (d == s || n == 0) {
        return;                       /* 同一块内存或零长度：什么都不用做 */
    }
    if (d < s) {                      /* 目标在前：从前往后，源永远读在写之前 */
        for (size_t k = 0; k < n; k++) {
            d[k] = s[k];
        }
    } else {                          /* 目标在后：从后往前，倒着走才不会踩到源 */
        for (size_t k = n; k > 0; k--) {
            d[k - 1] = s[k - 1];
        }
    }
}

int main(void) {
    char a[16] = "abcdefghij";
    char b[16] = "abcdefghij";
    my_memmove(a + 2, a, 8);
    memmove(b + 2, b, 8);
    printf("my  = %s\n", a);
    printf("lib = %s\n", b);
    printf("%s\n", strcmp(a, b) == 0 ? "两者一致" : "两者不同");
    return 0;
}
```
```output
my  = ababcdefgh
lib = ababcdefgh
两者一致
```

两个细节容易写错：第一，指针比较必须用 `unsigned char *`（标准保证字符类型没有填充位、可以逐字节访问），用 `char *` 在某些实现上会因为 `char` 有符号而在比较时出问题；第二，`d > s` 的循环要写成 `for (size_t k = n; k > 0; k--)` 而不是 `for (size_t k = n - 1; k >= 0; k--)`——`size_t` 是无符号的，`k >= 0` 永远成立，`n == 0` 时还会下溢成天文数字。

### 平台实测：重叠拷贝会被 ASan 抓住，但只在 -O0

本平台（Clang + AddressSanitizer）对 `memcpy` 的重叠有专门的检查。下面这段代码用默认的 `-O0` 编译，直接判 `RE`：

```c run id=memcpy-overlap-asan expect=RE
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[16] = "abcdefghij";
    memcpy(buf + 2, buf, 8);          /* 区间重叠：未定义行为 */
    printf("%s\n", buf);
    return 0;
}
```

错误信息是"memcpy 源和目标区域重叠：memcpy 要求源和目标内存不重叠，重叠时结果未定义。重叠拷贝请改用 memmove。"——ASan 在运行期拦截了 `memcpy` 调用，比对两段区间后直接报错，这比"结果悄悄变错"好得多。

但把同一段代码换成 `-O2`，**它居然能跑完**：

```c run id=memcpy-overlap-O2 opt=-O2 nocheck reason="重叠的 memcpy 是未定义行为，输出与编译器的内联策略有关"
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[16] = "abcdefghij";
    memcpy(buf + 2, buf, 8);          /* 同一个 UB，只是换了优化级别 */
    printf("%s\n", buf);
    return 0;
}
```

本平台实测输出 `ababcdefgh`——看起来"完全正确"。原因不是标准变宽松了，而是 `-O2` 下编译器知道长度是常数 8，把 `memcpy` **内联**成了几条直接搬字节的指令，根本不再调用库里的 `memcpy`，ASan 的拦截器也就没有机会执行。这就是最典型的"**优化把 bug 藏起来**"：同一份源码，`-O0` 崩溃、`-O2` 正常，而它从头到尾都是 UB。

`-O0` 与 `-O2` 的表现差异可以总结成一张表：

| 编译选项 | 实际执行的代码 | 本平台结果 |
|---|---|---|
| `-O0` | 调用 libc 的 `memcpy` | ASan 报重叠，判 `RE` |
| `-O2` | 内联成 8 条字节搬移（或一条 8 字节搬移） | 跑完，输出 `ababcdefgh`（无害是运气） |

结论只有一句：**重叠就用 `memmove`**。不要因为"我这儿 `-O2` 跑得好好的"就保留 `memcpy`。

## 编译与运行

用 gcc 或 clang 都行，本平台使用 Clang（x86-64 Windows，UCRT）：

```bash
gcc -std=c17 -Wall -Wextra memcpy_demo.c -o memcpy_demo
./memcpy_demo
```

```bash
clang -std=c17 -Wall -Wextra memcpy_demo.c -o memcpy_demo
./memcpy_demo
```

想确认 `memcpy` 与 `memmove` 的差别，可以对比两档生成的汇编：

```bash
clang -std=c17 -O0 -S memcpy_demo.c -o memcpy_demo-O0.s
clang -std=c17 -O2 -S memcpy_demo.c -o memcpy_demo-O2.s
```

`-O0` 下能看到 `callq memcpy`，`-O2` 下常数长度的调用会被展开成 `mov` 指令序列——这就是 ASan 拦截器失效的原因。

几个实用开关：

- `-fsanitize=address`：本平台默认开启，`memcpy` 重叠检查属于它的一部分；
- `-D_FORTIFY_SOURCE=2`：在部分平台上把 `memcpy` 换成带边界检查的 `__memcpy_chk`，能多抓一些错误，但对"重叠"不生效；
- `-Wrestrict`：能提示一部分把重叠指针传给 `restrict` 形参的代码；
- 用 `memmove` 时编译器**不会**帮你判断"其实不相交、可以用 memcpy 更快"——真在意性能就自己先算一下两个区间有没有交集。

## 常见错误

### 在同一个数组里搬字节时用 memcpy [RE|UB]
"把 `buf[2..]` 的内容整体前移两格"、"删除一个字符后把后面的内容往前挪"——这类滑动操作天然重叠。`-O0` 下 ASan 会直接判 `RE`，`-O2` 下可能"正常"跑完，两种都不是正确。

```c run id=memcpy-err-shift expect=RE
#include <stdio.h>
#include <string.h>

int main(void) {
    char s[16] = "hello";
    memmove(s + 1, s, 5);             /* 对：memmove 处理重叠 */
    printf("%s\n", s);
    memcpy(s, s + 1, 4);              /* 错：源与目标重叠，应该用 memmove */
    printf("%s\n", s);
    return 0;
}
```

### 以为"重叠时 memcpy 就是从前向后复制" [WA]
标准没有规定方向。实现可以按 8 字节块搬、可以按 16 字节向量搬、可以从后往前、也可以两边同时开工。所以"重叠时结果是 `ababababab`"这个猜测只在"逐字节从前往后"的实现上成立，而那不是 `memcpy` 的语义。要看逐字节从前往后的效果，就自己写循环（像前面那条 `copy-forward-bug`），别指望 `memcpy` 陪你演。

### 手写 memmove 时忘了判断方向 [WA]
只写从前往后的循环，在 `dst > src` 时会踩坏源数据；只写从后往前的循环，在 `dst < src` 时会踩坏源数据。两种写法都能编译、都不报错，只是结果不对。判断条件只有一个：比较 `d` 和 `s` 的大小（用 `unsigned char *` 比较）。

### 用 `for (size_t k = n - 1; k >= 0; k--)` 写倒序循环 [WA]
`size_t` 是无符号类型，`k >= 0` 恒真，循环永远不结束；`n == 0` 时 `n - 1` 还会下溢成 `SIZE_MAX`，直接越界读。倒序循环的正确写法是 `for (size_t k = n; k > 0; k--) { ... d[k - 1] ... }`，把"减一"放进循环体里。

### 以为 memmove 一定比 memcpy 慢一个数量级 [WA]
`memmove` 的实现通常是"先判断是否重叠，不重叠就直接走 `memcpy` 的快速路径"，真正重叠时才逐字节或分两段搬。绝大多数 `memmove` 调用都落在不重叠的分支上，开销只是两个指针比较。为了省这点比较而用 `memcpy`，换来的是随时可能爆发的 UB，完全不值。

## 客观题

### q-s5-ub-memcpy-overlap-1 single
`char buf[16] = "abcdefghij";` 之后执行 `memcpy(buf + 2, buf, 8);`，关于这段代码，下面哪一句是正确的？

- [x] 这是未定义行为：两段区间 `[2,10)` 与 `[0,8)` 重叠，标准不要求 `memcpy` 有确定结果；本平台 `-O0` 下被 ASan 拦截判 `RE`，`-O2` 下因为内联反而"跑通"
  > 正确。标准明确规定 `memcpy` 的源与目标不得重叠，重叠即 UB。具体表现完全取决于实现：`-O0` 调用库函数时 ASan 的拦截器能比对区间并报错；`-O2` 把常数长度的复制内联成搬字节指令，绕过了拦截器，于是"碰巧"得到正确结果——这只是运气，代码依然是 UB。
- [ ] 结果一定是从前往后逐字节复制的效果，即 `ababababab`
  > 错。那是"手写从前往后循环"的结果，不是 `memcpy` 的语义。实现可以按 8 字节或 16 字节块搬、可以从后往前、也可以并行搬，方向没有任何保证。
- [ ] 结果是 `ababcdefgh`，因为 `memcpy` 内部会自动改用 `memmove` 处理重叠
  > 错。`memcpy` 不做重叠检测，`memmove` 才有这个逻辑。某些平台的 `memcpy` 实现碰巧先判断了方向，但那是实现细节，换平台或换优化级别就会变——不能当作语义。
- [ ] 编译期就会报错，因为 `-Wrestrict` 能发现两段区间重叠
  > 错。`-Wrestrict` 只能提示"把可能重叠的指针传给 `restrict` 形参"这类情况，`memcpy(buf + 2, buf, 8)` 不在它的检查范围内，编译零警告通过。
