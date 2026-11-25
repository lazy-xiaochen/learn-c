---json
{
  "id": "p-s3-static-local-1",
  "title": "成绩登记员：用 static 局部变量统计“第几次出现”",
  "difficulty": "L2",
  "knowledgePoints": ["s3-static-local"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
学校在录入成绩，每录入一个分数，系统要立刻回答："这个分数是第几次出现了？"最后再汇总"一共录入了多少条"和"出现次数最多的分数出现了几次"。

录入工作由一个函数完成：

```c
int register_score(int score);   /* 返回 score 这一次是第几次出现（含本次） */
```

请把它实现出来。要求是：**这个函数必须在多次调用之间记住"每个分数已经出现过多少次"**。

这正是 `static` 局部变量的用武之地：在函数里声明一个 `static int cnt[101];`，它只被创建一次（在程序启动时，自动清零），函数返回后依然存在，下次调用还能看到上次的计数。如果把它写成普通的局部数组 `int cnt[101] = {0};`，每次调用都会重新清零——那样每次都会返回 1。

输入一串分数，请按顺序输出每个分数的"第几次出现"，最后输出总条数与最大出现次数。

## 输入格式
第一行一个整数 `n`。

第二行 `n` 个整数，每个都是 0 到 100 之间的分数，用空格分隔。

## 输出格式
输出 `n` 行：每行两个整数，依次是"分数"和"它是第几次出现"。

最后再输出一行：`total n max m`，其中 `n` 是总条数，`m` 是所有分数里出现次数的最大值。

## 数据范围
- `1 ≤ n ≤ 2000`；
- `0 ≤ 分数 ≤ 100`（下标 0 到 100 都合法，计数数组至少要开 **101** 个）；
- 输出最多 2001 行、不超过 64KB。

## 示例
### 示例 1
```in
5
90 85 90 90 85
```
```out
90 1
85 1
90 2
90 3
85 2
total 5 max 3
```
> 90 出现了 3 次（第 1、3、4 条），85 出现了 2 次（第 2、5 条）。出现次数最多的是 90，共 3 次。

### 示例 2（边界：只有一条记录，分数是最大的 100）
```in
1
100
```
```out
100 1
total 1 max 1
```
> 只有一条记录时，"第几次出现"一定是 1，最大出现次数也是 1。注意分数 100 是合法下标：计数数组必须开到 101 个元素。

## 提示
### 第 1 层
每次调用 `register_score(score)` 时，程序需要知道"这个分数之前出现过几次"。这个信息不能放在普通局部变量里——函数一返回就没了。要么放在函数外面做全局变量，要么用 `static` 局部变量。

### 第 2 层
用 `static int cnt[101];` 在函数内部计数：

```c
static int cnt[101];      /* 静态存储期：全程序只有一份，启动时自动清零 */

int register_score(int score) {
    cnt[score]++;
    return cnt[score];
}
```

静态存储期的对象**不写初始化式也会被清零**，所以不需要写 `= {0}`。`cnt[score]++` 之后再返回，正好就是"含本次在内"的次数。

### 第 3 层
在 `main` 里读入 `n` 个分数，每读一个就调用一次 `register_score` 并输出。同时用一个变量记录"见过的最大次数"：

```c
int best = 0;
for (int i = 0; i < n; i++) {
    int s;
    scanf("%d", &s);
    int c = register_score(s);
    if (c > best) best = c;
    printf("%d %d\n", s, c);
}
printf("total %d max %d\n", n, best);
```

注意 `n` 和 `best` 是 `main` 的局部变量，它们不需要跨调用保持；真正需要"记住"的只有 `cnt`。

## 参考代码
```c file=main.c
#include <stdio.h>

/* 静态存储期的计数表：只有一份，程序启动时自动清零，函数返回后依然存在 */
int register_score(int score) {
    static int cnt[101];

    cnt[score]++;
    return cnt[score];
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 2000) {
        return 0;
    }

    int best = 0;
    for (int i = 0; i < n; i++) {
        int s;
        if (scanf("%d", &s) != 1 || s < 0 || s > 100) {
            return 0;
        }
        int c = register_score(s);
        if (c > best) {
            best = c;
        }
        printf("%d %d\n", s, c);
    }
    printf("total %d max %d\n", n, best);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int register_score(int score) {
    (void)score;
    return 1;                        /* TODO: 用 static 数组记住每个分数出现的次数 */
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 2000) {
        return 0;
    }

    int best = 0;
    for (int i = 0; i < n; i++) {
        int s;
        if (scanf("%d", &s) != 1) {
            return 0;
        }
        int c = register_score(s);
        if (c > best) {
            best = c;
        }
        printf("%d %d\n", s, c);
    }
    printf("total %d max %d\n", n, best);
    return 0;
}
```

## 复杂度
时间 O(n)：每读一个分数做一次数组自增和一次输出。
空间 O(1)：计数表固定 101 个 `int`，放在静态存储区，不随 `n` 增长，也不占栈。

## 常见错误
### 用普通局部数组，每次调用都清零 [WA]
`int cnt[101] = {0};` 的存储期是自动的：每次进入函数都重新创建并清零，所以每次 `cnt[score]++` 都是 1，输出里所有"第几次出现"全是 1。要跨调用保持，必须加 `static`。
```c file=main.c expect=WA
#include <stdio.h>

int register_score(int score) {
    int cnt[101] = {0};              /* 错：每次调用都重新清零 */
    cnt[score]++;
    return cnt[score];
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 2000) {
        return 0;
    }

    int best = 0;
    for (int i = 0; i < n; i++) {
        int s;
        if (scanf("%d", &s) != 1) {
            return 0;
        }
        int c = register_score(s);
        if (c > best) {
            best = c;
        }
        printf("%d %d\n", s, c);
    }
    printf("total %d max %d\n", n, best);
    return 0;
}
```

### 计数数组只开 100 个，分数 100 越界 [RE]
分数范围是 0 到 100，一共 **101** 种取值。开 `cnt[100]` 却访问 `cnt[100]`，就写到了数组边界之外。`static` 数组在静态存储区，本平台的 ASan 会报 `global-buffer-overflow`（判 `RE`）；没有检测时则是悄悄改坏别的静态变量，后果不可预测。
```c file=main.c expect=RE
#include <stdio.h>

int register_score(int score) {
    static int cnt[100];             /* 错：少开一个，cnt[100] 越界 */
    cnt[score]++;
    return cnt[score];
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > 2000) {
        return 0;
    }

    int best = 0;
    for (int i = 0; i < n; i++) {
        int s;
        if (scanf("%d", &s) != 1) {
            return 0;
        }
        int c = register_score(s);
        if (c > best) {
            best = c;
        }
        printf("%d %d\n", s, c);
    }
    printf("total %d max %d\n", n, best);
    return 0;
}
```

### 把"全局第几个"当成"这个分数第几次出现" [WA]
`static int k; k++; return k;` 确实能在调用之间累计，但它统计的是**总条数**，不是"某个分数的出现次数"。示例里第 3 条 90 应该是 2 次，这种写法会输出 3。题目要的是"按分数分别计数"，所以计数表必须用分数做下标。

### 以为 static 局部变量每次调用都会重新初始化 [WA]
`static int cnt[101] = {0};` 里的初始化只在程序启动时执行一次，之后每次进入函数都跳过。如果你的逻辑依赖"每次进来都是干净的"，那它就不该是 `static`——该用普通局部变量。反过来说，`static` 变量不写初始化式也已经是 0，所以 `= {0}` 写不写都对，只是容易让人误以为它每次都被重置。

### 在多个函数里各开一份 static 计数表 [WA]
每个函数的 `static` 局部变量是**各自独立**的一份。如果 `register_score` 更新一张表、另一个查询函数读另一张表，两张表永远对不上。需要多个函数共享状态时，应该把表放到文件作用域（或者通过参数传递指针）。

## 测试用例
### 01 sample 示例 1
```in
5
90 85 90 90 85
```
```out
90 1
85 1
90 2
90 3
85 2
total 5 max 3
```

### 02 sample 示例 2
```in
1
100
```
```out
100 1
total 1 max 1
```

### 03 degenerate 唯一的分数是 0
```in
1
0
```
```out
0 1
total 1 max 1
```

### 04 trap 0 和 100 都是合法分数，交替出现
```in
4
0 100 0 100
```
```out
0 1
100 1
0 2
100 2
total 4 max 2
```

### 05 trap 相同分数不相邻，必须全局统计而不是只看前一个
```in
6
5 6 5 6 5 6
```
```out
5 1
6 1
5 2
6 2
5 3
6 3
total 6 max 3
```

### 06 normal 一般情况
```in
8
42 42 7 42 7 100 0 42
```
```out
42 1
42 2
7 1
42 3
7 2
100 1
0 1
42 4
total 8 max 4
```

### 生成 boundary 长输入：2000 条记录与 101 种分数
```js gen
const cases = [];

/* 2000 条都是 100：第 i 条输出 "100 i"，最大次数 2000 */
const n1 = 2000;
const lines1 = [];
for (let i = 1; i <= n1; i++) {
  lines1.push(`100 ${i}`);
}
cases.push({
  kind: 'boundary',
  category: '2000 条记录全是 100',
  input: `${n1}\n${new Array(n1).fill(100).join(' ')}\n`,
  output: `${lines1.join('\n')}\ntotal ${n1} max ${n1}\n`,
});

/* 101 种分数各出现一次：每行都是 1，最大次数 1 */
const scores = Array.from({ length: 101 }, (_, i) => i);
const lines2 = scores.map((s) => `${s} 1`);
cases.push({
  kind: 'boundary',
  category: '0 到 100 各出现一次',
  input: `101\n${scores.join(' ')}\n`,
  output: `${lines2.join('\n')}\ntotal 101 max 1\n`,
});

return cases;
```
