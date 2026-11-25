---
id: s2-array-decay
---

## 讲解

### 数组名在大多数场合会"变成"指针
数组名 `a` 本身代表整块数组，但在**大多数表达式**里，它会被自动转换成"指向首元素的指针"`&a[0]`。这个转换叫**数组退化**（array decay）。

```c run id=decay
#include <stdio.h>

int main(void) {
    int a[5] = {10, 20, 30, 40, 50};
    int *p = a;                 /* 数组名退化成 &a[0] */

    printf("a[0] = %d，*p = %d\n", a[0], *p);
    printf("a[2] = %d，*(p + 2) = %d\n", a[2], *(p + 2));
    return 0;
}
```
```output
a[0] = 10，*p = 10
a[2] = 30，*(p + 2) = 30
```

正因为会退化，`int *p = a;` 才能编译通过——`a` 在这一行已经不是"数组"，而是"指向 int 的指针"。

### 例外：`sizeof` 和 `&` 不会退化
这两处是初学者最容易翻车的地方。在 `sizeof` 里，数组名保持"整个数组"的身份；在 `&` 里，取到的是"整个数组的地址"。

```c run id=sizeof
#include <stdio.h>

int main(void) {
    int a[5] = {10, 20, 30, 40, 50};
    int *p = a;

    printf("sizeof a = %zu\n", sizeof a);   /* 整个数组：20 字节 */
    printf("sizeof p = %zu\n", sizeof p);   /* 指针本身：8 字节 */
    return 0;
}
```
```output
sizeof a = 20
sizeof p = 8
```

`sizeof a` 是 20（5 个 int），`sizeof p` 是 8（64 位环境下指针的大小）。如果数组名在这里也退化成指针，`sizeof a` 就会是 8——这正是"用 `sizeof` 求数组长度"能成立的原因。

`&a` 更有意思：它的值和 `a` 一样（都是首地址），但**类型不同**：

```c run id=addrtype
#include <stdio.h>

int main(void) {
    int a[5] = {10, 20, 30, 40, 50};

    printf("a + 1 前进 %ld 字节\n", (long)((char *)(a + 1) - (char *)a));
    printf("&a + 1 前进 %ld 字节\n", (long)((char *)(&a + 1) - (char *)&a));
    return 0;
}
```
```output
a + 1 前进 4 字节
&a + 1 前进 20 字节
```

- `a` 退化成 `int *`，`a + 1` 前进一个 **int**（4 字节）；
- `&a` 的类型是 `int (*)[5]`（指向"5 个 int 的数组"的指针），`&a + 1` 前进一整个**数组**（20 字节）。

```memory title="int a[5];  int *p = a;  int (*pa)[5] = &a;（三个名字，两种类型）"
地址     | 内容      | 名字 | 类型        | +1 之后
0x1000   | 10        | a    | int[5]      | 退化成 int *，前进 4 字节
0x1000   | 10        | &a   | int (*)[5]  | 前进 20 字节（整个数组）
0x1014   | 0x1000    | p    | int *       | 前进 4 字节
```

### 传参时一定会退化
数组作函数参数时，形参收到的**永远是指针**。所以函数内部 `sizeof` 一个"数组参数"，得到的是指针大小（Clang 会贴心地给出 `-Wsizeof-array-argument` 警告，这段示例故意保留它）：

```c run id=param warnings=allow
#include <stdio.h>

void show(int arr[]) {          /* 等价于 int *arr */
    printf("函数内 sizeof arr = %zu\n", sizeof arr);
}

int main(void) {
    int a[5] = {1, 2, 3, 4, 5};
    printf("函数外 sizeof a = %zu\n", sizeof a);
    show(a);
    return 0;
}
```
```output
函数外 sizeof a = 20
函数内 sizeof arr = 8
```

这就是"`sizeof(arr)` 在函数内外不一样"的根本原因：函数里根本没有数组，只有一个指针。**数组的长度必须在传参时一起传进去**（下一节详细讲怎么写）。

### 不能对数组名赋值
`a = p;`、`a++` 都是编译错误：数组名不是变量，不能被赋值。要"移动"，只能用指针：

```c
int *p = a;     /* 可以 */
p++;            /* 可以：p 是普通指针变量 */
a++;            /* 编译错误 */
```

## 编译与运行

```bash
gcc -std=c17 -Wall -Wextra decay.c -o decay
./decay
```

本平台用 Clang，命令等价：`clang -std=c17 -Wall -Wextra decay.c -o decay`。
把 `a` 当成可赋值的指针来写，编译器会直接报错，这正是它帮你抓错的地方。

## 常见错误

### 在函数里用 sizeof 求数组长度
```c
void f(int a[]) {
    int n = sizeof a / sizeof a[0];   /* 错：8 / 4 = 2 */
}
```
不管传进来多少个元素，结果永远是 2（指针大小 ÷ int 大小）。正确做法是额外传一个长度参数。

### 以为 `&a` 和 `a` 完全一样
它们的**值**相同，但**类型**不同：`a` 是 `int *`，`&a` 是 `int (*)[5]`。做指针加减时步长差 5 倍，混用会算错位置。

### 以为数组名可以自增
`a++` 是编译错误。想从头遍历，用 `int *p = a; p++`。

### 把二维数组名当成二级指针
`int a[3][4];` 的 `a` 退化后是 `int (*)[4]`（指向一行的指针），不是 `int **`。这两者不能互相赋值，第 4 阶段讲指针数组时会再遇到。

## 客观题

### q-s2-array-decay-1 single
```c
void f(int arr[]) {
    printf("%zu\n", sizeof arr);
}
int main(void) {
    int a[10];
    f(a);
    return 0;
}
```
在 64 位环境下，输出是：

- [x] `8`
  > 正确。形参 `int arr[]` 等价于 `int *arr`，`sizeof` 一个指针得到 8。
- [ ] `40`
  > 40 是 `sizeof a`（10 个 int）。函数里已经没有数组了，只有一个指针。
- [ ] `10`
  > 10 是元素个数，`sizeof` 得到的是字节数，而且这里是求指针大小。
- [ ] 编译错误
  > 合法。数组作参数会退化成指针，这是 C 的规定。


