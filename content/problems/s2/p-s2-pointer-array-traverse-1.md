---json
{
  "id": "p-s2-pointer-array-traverse-1",
  "title": "用首尾指针把数组循环右移 k 位",
  "difficulty": "L2",
  "knowledgePoints": ["s2-pointer-array-traverse"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
某设备的"最近记录"列表用一块固定大小的数组保存，新记录总是挤到最前面——这等价于把整个序列**循环右移**一位。现在要求你一次移动 `k` 位。

给定 `n` 个整数，把它们循环右移 `k` 位后输出。所谓"右移一位"，是指每个元素都挪到后一个位置，最后一个元素绕回到第一个位置：

```
下标：  0  1  2  3  4
原数组：1  2  3  4  5
右移1： 5  1  2  3  4
右移2： 4  5  1  2  3
```

请**用指针遍历**实现（推荐"三次反转"的做法），不要申请第二个数组。

注意 `k` 可能比 `n` 大很多很多：右移 `n` 位等于没动，所以真正需要移动的位数是 `k % n`。

## 输入格式
第一行两个整数 `n` 和 `k`，用空格分隔。
第二行 `n` 个整数，用空格分隔。

## 输出格式
一行，循环右移 `k` 位后的 `n` 个整数，用单个空格分隔。

## 数据范围
1 ≤ n ≤ 1000
0 ≤ k ≤ 1000000000000000000（10¹⁸）
-1000000000 ≤ 每个元素 ≤ 1000000000

`k` 最大是 10¹⁸，`int` 装不下，必须用 `long long` 读入（格式符 `%lld`）。取模之后 `k % n` 一定落在 `[0, n-1]`。

## 示例
### 示例 1
```in
5 2
1 2 3 4 5
```
```out
4 5 1 2 3
```
> 右移 1 位得到 `5 1 2 3 4`，再移 1 位就是 `4 5 1 2 3`。

### 示例 2（k 比 n 大）
```in
4 9
1 2 3 4
```
```out
4 1 2 3
```
> 9 % 4 = 1，所以结果和右移 1 位相同。不取模而直接移 9 次虽然结果也对，但 `k` 到 10¹⁸ 时一定会超时。

### 示例 3（边界：只有一个元素）
```in
1 0
-7
```
```out
-7
```
> `n = 1` 时任何位移都等于没动；`k % n` 得到 0，正好也不会出现"移 n 位"这种特殊情况。

## 提示
### 第 1 层
先把 `k` 化简：`k %= n`。然后想一想——如果允许你用"反转数组"这个操作，怎样用**三次**反转拼出"循环右移 k 位"？（提示：整体反转一次，再分别反转两段。）

### 第 2 层
设原数组为 `A B`，其中 `A` 是前 `n-k` 个元素、`B` 是后 `k` 个元素。循环右移后应当是 `B A`。而反转有一个好性质：`reverse(A B) = reverse(B) reverse(A)`。所以：

1. `reverse(整个数组)` → `reverse(B) reverse(A)`
2. `reverse(前 k 个)` → `B reverse(A)`
3. `reverse(后 n-k 个)` → `B A`

### 第 3 层
用"左闭右开"的区间写反转函数：`reverse(int *first, int *last)` 处理 `[first, last)`。循环体是 `while (first < last) { last--; 交换 *first 与 *last; first++; }`——先 `last--` 才指向真正的末尾元素；`a + n` 这个"末尾后一位"只能用来比较，不能解引用。

主函数里按顺序调用三次：`reverse(a, a + n)`、`reverse(a, a + k)`、`reverse(a + k, a + n)`（`k` 已经取过模，所以 `0 <= k < n`）。

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAXN 1000

/* 反转 [first, last) 区间，用首尾两个指针向中间夹 */
static void reverse(int *first, int *last) {
    while (first < last) {
        last--;                      /* 先退到真正的末尾元素 */
        int t = *first;
        *first = *last;
        *last = t;
        first++;
    }
}

int main(void) {
    int n;
    long long k;
    if (scanf("%d %lld", &n, &k) != 2 || n < 1 || n > MAXN) {
        return 0;
    }

    int a[MAXN];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    k %= n;                          /* 右移 n 位等于没动，k 可能大得离谱 */

    reverse(a, a + n);               /* 1. 整体反转 */
    reverse(a, a + k);               /* 2. 反转前 k 个 */
    reverse(a + k, a + n);           /* 3. 反转剩下的 n - k 个 */

    for (int i = 0; i < n; i++) {
        printf("%d%c", a[i], i + 1 == n ? '\n' : ' ');
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAXN 1000

int main(void) {
    int n;
    long long k;
    if (scanf("%d %lld", &n, &k) != 2 || n < 1 || n > MAXN) {
        return 0;
    }

    int a[MAXN];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    /* TODO: 用首尾指针把 a 循环右移 k % n 位（提示：三次反转） */

    for (int i = 0; i < n; i++) {
        printf("%d%c", a[i], i + 1 == n ? '\n' : ' ');
    }
    return 0;
}
```

## 复杂度
时间 O(n)：三次反转总共交换 n 次左右，每个元素都被访问常数次。
空间 O(1)：只在交换时用了一个临时变量，没有申请第二个数组。

不取模而"一次移一位、重复 k 次"的写法是 O(nk)，`k` 到 10¹⁸ 时必然超时。

## 常见错误
### 交换时先覆盖左边，右边再赋回去 [WA]
`*first = *last; *last = *first;` 看起来很对称，实际第一步就把左边的值永久覆盖了，第二步只是把同一个值再写一遍。反转会变成"把右半边复制到左半边"，数据丢失。必须先用临时变量保存左值。
```c file=main.c expect=WA
#include <stdio.h>

#define MAXN 1000

static void reverse(int *first, int *last) {
    while (first < last) {
        last--;
        *first = *last;              /* 错：旧值被覆盖 */
        *last = *first;
        first++;
    }
}

int main(void) {
    int n;
    long long k;
    if (scanf("%d %lld", &n, &k) != 2 || n < 1 || n > MAXN) {
        return 0;
    }

    int a[MAXN];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    k %= n;
    reverse(a, a + n);
    reverse(a, a + k);
    reverse(a + k, a + n);

    for (int i = 0; i < n; i++) {
        printf("%d%c", a[i], i + 1 == n ? '\n' : ' ');
    }
    return 0;
}
```

### 把 a + n 当成末尾元素 [RE]
`a + n` 是"最后一个元素的下一个位置"，可以参与比较，但解引用它就是越界。用 `int *r = a + n;` 开始交换，第一轮就会读写 `a[n]`。本平台的 AddressSanitizer 会立刻报告 `dynamic-stack-buffer-overflow` 并判 `RE`。
```c file=main.c expect=RE
#include <stdio.h>

int main(void) {
    int n;
    long long k;
    if (scanf("%d %lld", &n, &k) != 2 || n < 1 || n > 1000) {
        return 0;
    }

    int a[n];                        /* 长度正好是 n，a[n] 必然越界 */
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    k %= n;
    int *l = a;
    int *r = a + n;                  /* 错：末尾元素是 a[n-1] */
    while (l < r) {
        int t = *l;
        *l = *r;
        *r = t;
        l++;
        r--;
    }

    for (int i = 0; i < n; i++) {
        printf("%d%c", a[i], i + 1 == n ? '\n' : ' ');
    }
    return 0;
}
```

### 只反转了整体，忘了分别反转两段 [WA]
三次反转少做后两次，得到的是整个数组的逆序，而不是"循环右移 k 位"。例如示例 1 会输出 `5 4 3 2 1`。
```c file=main.c expect=WA
#include <stdio.h>

#define MAXN 1000

static void reverse(int *first, int *last) {
    while (first < last) {
        last--;
        int t = *first;
        *first = *last;
        *last = t;
        first++;
    }
}

int main(void) {
    int n;
    long long k;
    if (scanf("%d %lld", &n, &k) != 2 || n < 1 || n > MAXN) {
        return 0;
    }

    int a[MAXN];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    k %= n;
    reverse(a, a + n);               /* 错：缺了后面两段的反转 */

    for (int i = 0; i < n; i++) {
        printf("%d%c", a[i], i + 1 == n ? '\n' : ' ');
    }
    return 0;
}
```

### 用 int 存 k [WA]
`k` 最大 10¹⁸，`int` 最大只有约 2.1×10⁹。把 `k` 读进 `int`（用 `%d`）时格式符与实参类型不匹配，属于未定义行为；即使读进来，值也已经不是原数了，`k % n` 自然算错。必须用 `long long` + `%lld`。

### k 不取模，一次移一位地重复 k 次 [TLE]
写成 `for (long long i = 0; i < k; i++) { 右移一位 }`，`k = 10¹⁸` 时循环 10¹⁸ 次，无论机器多快都会超时。取模之后最多只需要移 `n-1` 位，而"三次反转"更进一步把复杂度降到 O(n)。

## 测试用例
### 01 sample 示例 1
```in
5 2
1 2 3 4 5
```
```out
4 5 1 2 3
```

### 02 sample 示例 2
```in
4 9
1 2 3 4
```
```out
4 1 2 3
```

### 03 sample 示例 3
```in
1 0
-7
```
```out
-7
```

### 04 boundary k 是 n 的整数倍
```in
4 8
1 2 3 4
```
```out
1 2 3 4
```

### 05 degenerate 所有元素都相同
```in
5 3
6 6 6 6 6
```
```out
6 6 6 6 6
```

### 06 trap k = 1，只有最后一个元素绕回开头
```in
5 1
1 2 3 4 5
```
```out
5 1 2 3 4
```

### 07 trap k 接近 10¹⁸
```in
3 1000000000000000000
-1 -2 -3
```
```out
-3 -1 -2
```

### 08 normal 负数与零、k 比 n 略小
```in
5 4
1000000000 -1000000000 0 7 -7
```
```out
-1000000000 0 7 -7 1000000000
```

### 09 trap k = 0，一位也不移动
```in
5 0
9 8 7 6 5
```
```out
9 8 7 6 5
```

### 生成 boundary 最大规模与随机数据
```js gen
function rotateRight(v, shift) {
  const n = v.length;
  const out = [];
  for (let i = 0; i < n; i++) out.push(v[(i - shift + n) % n]);
  return out;
}

const cases = [];

/* 最大规模：1000 个随机元素，k 接近 10^18（必须用 long long 读入并取模） */
const n1 = 1000;
const v1 = [];
for (let i = 0; i < n1; i++) v1.push(rng.int(-1000000000, 1000000000));
const k1 = '999999999999999999';
const shift1 = Number(BigInt(k1) % BigInt(n1));
cases.push({
  kind: 'boundary',
  category: '最大规模 1000 个元素，k 接近 10^18',
  input: `${n1} ${k1}\n${v1.join(' ')}\n`,
  output: rotateRight(v1, shift1).join(' ') + '\n',
});

/* 最大规模 + k = 0：顺序必须原样输出 */
const v2 = [];
for (let i = 0; i < 1000; i++) v2.push(1000000000 - i);
cases.push({
  kind: 'boundary',
  category: '最大规模 1000 个元素，k = 0',
  input: '1000 0\n' + v2.join(' ') + '\n',
  output: v2.join(' ') + '\n',
});

/* 陷阱：k 恰好等于 n，取模后为 0；元素全为负数 */
const v3 = [];
for (let i = 0; i < 1000; i++) v3.push(-1 - i);
cases.push({
  kind: 'trap',
  category: 'k 等于 n（取模后为 0），元素全为负数',
  input: '1000 1000\n' + v3.join(' ') + '\n',
  output: v3.join(' ') + '\n',
});

/* 陷阱：k 比 n 小 1，等价于左移一位 */
const v4 = [];
for (let i = 0; i < 777; i++) v4.push(rng.int(-1000000, 1000000));
const k4 = 776;
cases.push({
  kind: 'normal',
  category: '777 个元素，k = n - 1',
  input: `777 ${k4}\n${v4.join(' ')}\n`,
  output: rotateRight(v4, k4).join(' ') + '\n',
});

return cases;
```
