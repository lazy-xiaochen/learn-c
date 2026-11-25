---json
{
  "id": "p-s2-pointer-array-traverse-2",
  "title": "有序价格表中的两数之和：首尾双指针",
  "difficulty": "L2",
  "knowledgePoints": ["s2-pointer-array-traverse"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
一份商品清单已经按价格**从小到大**排好序（价格可能为负，表示折扣商品）。现在给定一个预算 `target`，问：能不能从清单里挑出**两件不同的商品**，使它们的价格之和恰好等于 `target`？

如果存在，输出 `yes`；否则输出 `no`。

清单长度 `n` 最大到 200000。用两层循环把所有数对都试一遍需要约 `n²/2` 次加法（4×10¹⁰ 次），一定会超时。请利用"已经有序"这个条件，用**首尾两个指针**从两端往中间走，把复杂度降到 O(n)。

## 输入格式
第一行两个整数 `n` 和 `target`，用空格分隔。
第二行 `n` 个整数，用空格分隔，保证**非递减**（`a1 ≤ a2 ≤ ... ≤ an`）。

## 输出格式
一行：`yes` 或 `no`（全部小写）。

## 数据范围
1 ≤ n ≤ 200000
-1000000000 ≤ ai ≤ 1000000000
-2000000000 ≤ target ≤ 2000000000
保证输入数组非递减。

"两件不同的商品"指两个**不同的下标**，即必须 `i < j`。同一个元素不能用两次：例如数组里只有一个 `6` 时，不能声称 `6 + 6 = 12`。

两个元素之和最大是 2×10⁹，虽然刚好还在 `int` 的上限（2147483647）以内，但像 `target - a[i]` 这样的中间结果可以达到 3×10⁹，用 `int` 会溢出。本题统一用 `long long` 保存和与 `target`。

## 示例
### 示例 1
```in
5 9
1 2 4 7 11
```
```out
yes
```
> `2 + 7 = 9`，存在这样一对，输出 `yes`。

### 示例 2（没有符合条件的数对）
```in
6 100
-50 -20 10 30 45 60
```
```out
no
```
> 最大的两个数相加是 `45 + 60 = 105`，但与 `target = 100` 对不上；其他组合都更小，所以不存在。

### 示例 3（边界：只有一个元素）
```in
1 10
5
```
```out
no
```
> 只有一件商品，凑不出"两件不同商品"，直接输出 `no`。注意此时双指针的 `l` 和 `r` 都指向同一个位置，循环条件必须是 `l < r`，连一次比较都不该做。

## 提示
### 第 1 层
两层循环枚举所有数对是 O(n²)，`n = 200000` 时约 4×10¹⁰ 次加法，必然超时。想一想：数组已经排好序，能不能只从"两端"开始，每一步排除掉一个不可能的元素？

### 第 2 层
设 `l = 0`、`r = n - 1`，看 `a[l] + a[r]`：

- 如果它等于 `target`，找到了；
- 如果它**小于** `target`，那么 `a[l]` 和区间内任何元素（包括当前最大的 `a[r]`）相加都不够大，`a[l]` 可以永久排除，`l++`；
- 如果它**大于** `target`，那么 `a[r]` 和区间内任何元素（包括当前最小的 `a[l]`）相加都太大，`a[r]` 可以永久排除，`r--`。

每一步都排除掉一个元素，所以最多移动 `n` 次。这就是"首尾双指针"。

### 第 3 层
和用 `long long` 计算：`long long s = (long long)a[l] + a[r];`。循环条件是 `l < r` 而不是 `l <= r`——后者会让同一个元素被用两次。整体框架：

```c
int l = 0, r = n - 1;
while (l < r) {
    long long s = (long long)a[l] + a[r];
    if (s == target) { 找到; break; }
    if (s < target) l++;
    else r--;
}
```

## 参考代码
```c file=main.c
#include <stdio.h>

#define MAXN 200000

static int a[MAXN];                  /* 800KB，放在静态区，不占栈 */

int main(void) {
    int n;
    long long target;
    if (scanf("%d %lld", &n, &target) != 2 || n < 1 || n > MAXN) {
        return 0;
    }

    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int l = 0;
    int r = n - 1;
    const char *ans = "no";
    while (l < r) {
        long long s = (long long)a[l] + a[r];
        if (s == target) {
            ans = "yes";
            break;
        }
        if (s < target) {
            l++;                     /* 和太小：最小的那个数再也用不上了 */
        } else {
            r--;                     /* 和太大：最大的那个数再也用不上了 */
        }
    }

    printf("%s\n", ans);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

#define MAXN 200000

static int a[MAXN];

int main(void) {
    int n;
    long long target;
    if (scanf("%d %lld", &n, &target) != 2 || n < 1 || n > MAXN) {
        return 0;
    }

    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    /* TODO: 用首尾双指针判断是否存在两个数之和等于 target，并把结果写进 ans */

    printf("no\n");
    return 0;
}
```

## 复杂度
时间 O(n)：`l` 只向右移动、`r` 只向左移动，两者相遇时循环结束，总移动次数不超过 `n`。
空间 O(n)：需要一个长度为 `n` 的数组保存输入（题目本身就要求读入全部数据）。双指针只用了两个整数。

两层循环枚举数对是 O(n²)，`n = 200000` 时约 4×10¹⁰ 次加法，远超 1 秒能完成的运算量。

## 常见错误
### 双指针的收缩方向写反 [WA]
`a[l] + a[r]` 偏小时应该让和变大，也就是把小的那一端往右移（`l++`）；偏大时才把大的那一端往左移（`r--`）。写反了以后指针会朝远离答案的方向走，示例 1 明明有 `2 + 7 = 9` 也会输出 `no`。
```c file=main.c expect=WA
#include <stdio.h>

#define MAXN 200000

static int a[MAXN];

int main(void) {
    int n;
    long long target;
    if (scanf("%d %lld", &n, &target) != 2 || n < 1 || n > MAXN) {
        return 0;
    }

    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int l = 0;
    int r = n - 1;
    const char *ans = "no";
    while (l < r) {
        long long s = (long long)a[l] + a[r];
        if (s == target) {
            ans = "yes";
            break;
        }
        if (s < target) {
            r--;                     /* 错：和太小，应该 l++ */
        } else {
            l++;                     /* 错：和太大，应该 r-- */
        }
    }

    printf("%s\n", ans);
    return 0;
}
```

### 循环条件写成 l <= r，同一个元素被用了两次 [WA]
`l == r` 时两个指针指向同一个元素，此时算出的 `s` 是 `2 * a[l]`，相当于把一件商品卖了两次。示例 3 只有一个 `5`、`target = 10`，正确输出是 `no`，而 `l <= r` 的写法会输出 `yes`。
```c file=main.c expect=WA
#include <stdio.h>

#define MAXN 200000

static int a[MAXN];

int main(void) {
    int n;
    long long target;
    if (scanf("%d %lld", &n, &target) != 2 || n < 1 || n > MAXN) {
        return 0;
    }

    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int l = 0;
    int r = n - 1;
    const char *ans = "no";
    while (l <= r) {                 /* 错：l == r 时是同一个元素 */
        long long s = (long long)a[l] + a[r];
        if (s == target) {
            ans = "yes";
            break;
        }
        if (s < target) {
            l++;
        } else {
            r--;
        }
    }

    printf("%s\n", ans);
    return 0;
}
```

### 把 a + n 当成末尾元素 [RE]
用指针写双指针时，右指针必须指向**最后一个元素** `a + n - 1`，而不是"末尾的后一位" `a + n`。`a + n` 可以参与比较，但解引用它就是越界读。这里用长度正好为 `n` 的变长数组，越界会被 AddressSanitizer 立刻抓住（`dynamic-stack-buffer-overflow`），判 `RE`。
```c file=main.c expect=RE
#include <stdio.h>

int main(void) {
    int n;
    long long target;
    if (scanf("%d %lld", &n, &target) != 2 || n < 1 || n > 200000) {
        return 0;
    }

    int a[n];                        /* 长度正好是 n，a[n] 必然越界 */
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) {
            return 0;
        }
    }

    int *l = a;
    int *r = a + n;                  /* 错：末尾元素是 a + n - 1 */
    const char *ans = "no";
    while (l < r) {
        long long s = (long long)*l + *r;   /* 第一次解引用 *r 就越界 */
        if (s == target) {
            ans = "yes";
            break;
        }
        if (s < target) {
            l++;
        } else {
            r--;
        }
    }

    printf("%s\n", ans);
    return 0;
}
```

### 两层循环枚举所有数对 [TLE]
写成 `for (i) for (j > i)` 的暴力枚举，最坏要做约 `n²/2` 次加法。`n = 200000` 时是 2×10¹⁰ 次，无论怎么优化常数都不可能放进 1 秒。本题的分数就在"利用有序性把 O(n²) 降到 O(n)"上。

### 只用 int 计算和或差值 [UB]
`a[i] + a[j]` 最大是 2×10⁹，`target - a[i]` 最大可以达到 3×10⁹，都超出了 `int` 的表示范围。有符号整数溢出是未定义行为：本平台的 UBSan 会直接报告，没有检测时结果不可预测。读 `target` 用 `%lld`，算和之前先把一个操作数转成 `long long`：`(long long)a[l] + a[r]`。

## 测试用例
### 01 sample 示例 1
```in
5 9
1 2 4 7 11
```
```out
yes
```

### 02 sample 示例 2
```in
6 100
-50 -20 10 30 45 60
```
```out
no
```

### 03 sample 示例 3
```in
1 10
5
```
```out
no
```

### 04 boundary 只有两个元素且恰好命中（负数）
```in
2 -3
-5 2
```
```out
yes
```

### 05 degenerate 所有元素相同
```in
5 12
6 6 6 6 6
```
```out
yes
```

### 06 trap 唯一能凑出的和需要同一个元素用两次
```in
3 12
5 6 9
```
```out
no
```
> `5 + 9 = 14`、`5 + 6 = 11`、`6 + 9 = 15`，都不等于 12。`6 + 6 = 12` 看似可以，但数组里只有一个 6，不能用两次。

### 07 trap 负数相加，答案在最左端
```in
5 -19
-10 -9 1 2 100
```
```out
yes
```
> `-10 + (-9) = -19`。注意右指针要先从 100 一路左移到 -9，才轮到真正的答案。

### 08 trap 两个十亿相加，逼近 int 上限
```in
3 2000000000
1000000000 1000000000 1000000000
```
```out
yes
```
> `10⁹ + 10⁹ = 2×10⁹`，正好等于 `target`。这个用例专门检查"和"没有被截断成 32 位。

### 09 normal 答案在中间，两个指针都要移动
```in
7 3
-3 -1 0 2 4 5 9
```
```out
yes
```
> `-3 + 9 = 6` 太大，`r--`；`-3 + 5 = 2` 太小，`l++`；……最后 `-1 + 4 = 3` 命中。

### 10 trap 所有数对之和都小于 target
```in
4 11
1 2 3 4
```
```out
no
```
> 最大的一对是 `3 + 4 = 7`，仍然小于 11。左指针会一路向右走到末尾。

### 11 trap 有重复值，答案在首尾
```in
8 0
-5 -3 -2 -1 1 2 3 5
```
```out
yes
```
> `-5 + 5 = 0`，第一对就命中。重复值不影响双指针，只要下标不同即可。

### 生成 boundary 最大规模与压力数据
```js gen
function guard(name, input) {
  /* 判题器的标准输入上限是 1MB，超了会被静默截断，生成时必须挡住 */
  if (input.length > 1000000) throw new Error(`${name} 的输入超过 1MB：${input.length}`);
  return input;
}

const cases = [];

/* 最大规模：200000 个 0，target = 1 → 无解，双指针要走满全程 */
const n1 = 200000;
const zeros = new Array(n1).fill(0);
cases.push({
  kind: 'boundary',
  category: '最大规模 200000 个 0，target = 1',
  input: guard('200000 个 0', `${n1} 1\n${zeros.join(' ')}\n`),
  output: 'no\n',
});

/* 最大规模：200000 个元素的非递减序列（0..9 各重复 20000 次），target = 9 */
const n2 = 200000;
const v2 = [];
for (let i = 0; i < n2; i++) v2.push(Math.floor(i / 20000));
cases.push({
  kind: 'boundary',
  category: '最大规模 200000 个元素（0..9），target = 9',
  input: guard('200000 个 0..9', `${n2} 9\n${v2.join(' ')}\n`),
  output: 'yes\n',
});

/* 规模 100000：非递减且大量重复，target 取首尾之和 */
const n3 = 100000;
const v3 = [];
for (let i = 0; i < n3; i++) v3.push(Math.floor(i / 2) - 25000);
const t3 = v3[0] + v3[n3 - 1];
cases.push({
  kind: 'normal',
  category: '100000 个非递减元素，target 为首尾之和',
  input: guard('100000 个', `${n3} ${t3}\n${v3.join(' ')}\n`),
  output: 'yes\n',
});

/* 陷阱：100000 个偶数，target 为奇数 → 任何两数之和都是偶数，必然无解 */
const n4 = 100000;
const v4 = [];
for (let i = 0; i < n4; i++) v4.push(2 * Math.floor(i / 2) - 100000);
cases.push({
  kind: 'trap',
  category: '100000 个偶数，target 为奇数',
  input: guard('100000 个偶数', `${n4} 1\n${v4.join(' ')}\n`),
  output: 'no\n',
});

return cases;
```
