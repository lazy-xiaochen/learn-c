---json
{
  "id": "p-s5-ub-string-literal-1",
  "title": "字符串池报告：合并去重、字节占用与只读反转",
  "difficulty": "L4",
  "knowledgePoints": ["s5-ub-string-literal"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
编译器会把内容相同的字符串字面量合并成一份（string pooling），这是 `-Os` 省空间的主要手段之一。本题要求你写一个"池化报告"工具：读入一组字符串字面量，算出**不合并**和**合并**两种情况下只读数据段各占多少字节，并给出去重后的清单。

规则：

1. 每个字面量占 `len + 1` 个字节（`len` 是字符个数，`+1` 是结尾的 `'\0'`）；
2. **不合并**（`raw`）：所有出现过的字面量各占一份，直接求和；
3. **合并**（`pooled`）：内容完全相同的字面量只留一份，按"内容"去重（不是按地址，也不是按长度）；
4. `saved = raw - pooled`；
5. 清单按**首次出现**的顺序输出，每行是"出现次数 + 反转后的内容"。反转是因为这份报告要贴到一个"从右往左读"的表格里——注意字面量是只读的，反转必须在副本上做。

## 输入格式
第一行一个整数 `n`：字面量个数。

接下来 `n` 个 token，代表 `n` 个字面量，用空白分隔（可以全在一行，也可以一行一个）。每个 token 只含小写字母，长度 1 到 20。

## 输出格式
先输出四行统计：

```
raw <不合并时的字节数>
pooled <合并后的字节数>
saved <节省的字节数>
unique <不同字面量的个数>
```

再输出 `unique` 行，每行两个字段：`<出现次数> <反转后的内容>`，按首次出现顺序排列。

## 数据范围
- `1 ≤ n ≤ 200`；
- 每个 token 长度 1 到 20，只含小写字母；
- 统计值最大为 `200 × 21 = 4200`，`int` 足够。

## 示例
### 示例 1
```in
3
ab ba ab
```
```out
raw 9
pooled 6
saved 3
unique 2
2 ba
1 ab
```
> `ab` 出现 2 次、`ba` 出现 1 次，三次共 `3 + 3 + 3 = 9` 字节；去重后剩两份，`3 + 3 = 6` 字节，省下 3 字节。清单按首次出现顺序：`ab` 在前（出现 2 次，反转成 `ba`），`ba` 在后（出现 1 次，反转成 `ab`）。注意"反转后的 ba"和"第二个字面量 ba"长得一样，别被绕进去。

### 示例 2（边界：只有一个字面量）
```in
1
a
```
```out
raw 2
pooled 2
saved 0
unique 1
1 a
```
> 只有一个字面量时不存在合并，`raw` 和 `pooled` 相等、`saved` 为 0。单个字符反转后还是它自己。

## 提示
### 第 1 层
用一个数组保存"已经见过的字面量"，每读一个新的，就从头扫一遍用 `strcmp` 比较内容。找到就把计数加一，找不到就追加到末尾并把计数置 1。这个顺序天然就是首次出现顺序。

### 第 2 层
`raw` 在读数的时候就能累加（每读一个 `len + 1`）；`pooled` 在最后扫描"已经见过的字面量"数组时累加。`saved` 是两个数的差，不要再单独统计。

### 第 3 层
反转要写在副本上：新建一个 `char rev[24]`，从后往前取字符，最后一定记得 `rev[len] = '\0'`。**不要**对存着输入内容的数组原地反转——虽然这里的数组是可写的，但"反转要作用于副本"这个习惯正是为了避免哪天把字面量传进来。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXN 200

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }
    char word[MAXN][24];        /* 去重后的字面量，按首次出现顺序 */
    int times[MAXN];            /* 每个字面量出现了几次 */
    int uniq = 0;
    int raw = 0;

    for (int k = 0; k < n; k++) {
        char s[24];
        if (scanf("%23s", s) != 1) {
            return 0;
        }
        raw += (int)strlen(s) + 1;
        int found = -1;
        for (int i = 0; i < uniq; i++) {
            if (strcmp(word[i], s) == 0) {      /* 按内容比较，不能用 == */
                found = i;
                break;
            }
        }
        if (found >= 0) {
            times[found]++;
        } else {
            strcpy(word[uniq], s);
            times[uniq] = 1;
            uniq++;
        }
    }

    int pooled = 0;
    for (int i = 0; i < uniq; i++) {
        pooled += (int)strlen(word[i]) + 1;
    }
    printf("raw %d\n", raw);
    printf("pooled %d\n", pooled);
    printf("saved %d\n", raw - pooled);
    printf("unique %d\n", uniq);

    for (int i = 0; i < uniq; i++) {
        char rev[24];
        int len = (int)strlen(word[i]);
        for (int k = 0; k < len; k++) {
            rev[k] = word[i][len - 1 - k];      /* 从副本里倒着取字符 */
        }
        rev[len] = '\0';
        printf("%d %s\n", times[i], rev);
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXN 200

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n > MAXN) {
        return 0;
    }
    char word[MAXN][24];
    int times[MAXN];
    int uniq = 0;
    int raw = 0;

    for (int k = 0; k < n; k++) {
        char s[24];
        if (scanf("%23s", s) != 1) {
            return 0;
        }
        raw += (int)strlen(s) + 1;
        int found = -1;
        for (int i = 0; i < uniq; i++) {
            if (word[i] == s) {                 /* TODO: 这里比的是地址，要比内容 */
                found = i;
                break;
            }
        }
        if (found >= 0) {
            times[found]++;
        } else {
            strcpy(word[uniq], s);
            times[uniq] = 1;
            uniq++;
        }
    }

    int pooled = 0;
    for (int k = 0; k < uniq; k++) {
        pooled += (int)strlen(word[k]) + 1;
    }
    printf("raw %d\n", raw);
    printf("pooled %d\n", pooled);
    printf("saved %d\n", raw - pooled);
    printf("unique %d\n", uniq);

    for (int i = 0; i < uniq; i++) {
        int len = (int)strlen(word[i]);
        for (int k = 0; k < len / 2; k++) {
            char t = word[i][k];                /* TODO: 改成在副本上反转并补 '\0' */
            word[i][k] = word[i][len - 1 - k];
            word[i][len - 1 - k] = t;
        }
        printf("%d %s\n", times[i], word[i]);
    }
    return 0;
}
```

## 复杂度
时间 O(n² × L)：每读一个词要跟已有的最多 `n` 个词做 `strcmp`（每个比较 O(L)）。
空间 O(n × L)：去重表。`n ≤ 200`，完全够用。

## 常见错误
### 用 `==` 比较字符串来判断"内容相同" [WA]
`==` 比的是地址。每次读入都写进各自的缓冲区，地址天然不同，于是"去重"永远不会命中，`unique` 等于 `n`、`pooled` 等于 `raw`。比较内容必须用 `strcmp`。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXN 200

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    char word[MAXN][24];
    int times[MAXN];
    int uniq = 0;
    int raw = 0;
    for (int k = 0; k < n; k++) {
        char s[24];
        if (scanf("%23s", s) != 1) {
            return 0;
        }
        raw += (int)strlen(s) + 1;
        int found = -1;
        for (int i = 0; i < uniq; i++) {
            if (word[i] == s) {                 /* 错：比较的是地址 */
                found = i;
                break;
            }
        }
        if (found >= 0) {
            times[found]++;
        } else {
            strcpy(word[uniq], s);
            times[uniq] = 1;
            uniq++;
        }
    }
    int pooled = 0;
    for (int i = 0; i < uniq; i++) {
        pooled += (int)strlen(word[i]) + 1;
    }
    printf("raw %d\n", raw);
    printf("pooled %d\n", pooled);
    printf("saved %d\n", raw - pooled);
    printf("unique %d\n", uniq);
    for (int i = 0; i < uniq; i++) {
        char rev[24];
        int len = (int)strlen(word[i]);
        for (int k = 0; k < len; k++) {
            rev[k] = word[i][len - 1 - k];
        }
        rev[len] = '\0';
        printf("%d %s\n", times[i], rev);
    }
    return 0;
}
```

### `pooled` 统计了所有出现，而不是去重后的项 [WA]
只改循环条件很容易写错：`for (int k = 0; k < n; k++)` 会把 `word[n - 1]` 之后没初始化的内容也读进来（既算错又可能越界），即使改成 `k < uniq`，只要还在按"出现次数"累加也会算多。`pooled` 的定义是"每个不同字面量各一份"。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXN 200

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    char word[MAXN][24];
    int times[MAXN];
    int uniq = 0;
    int raw = 0;
    for (int k = 0; k < n; k++) {
        char s[24];
        if (scanf("%23s", s) != 1) {
            return 0;
        }
        raw += (int)strlen(s) + 1;
        int found = -1;
        for (int i = 0; i < uniq; i++) {
            if (strcmp(word[i], s) == 0) {
                found = i;
                break;
            }
        }
        if (found >= 0) {
            times[found]++;
        } else {
            strcpy(word[uniq], s);
            times[uniq] = 1;
            uniq++;
        }
    }
    int pooled = 0;
    for (int i = 0; i < uniq; i++) {
        pooled += ((int)strlen(word[i]) + 1) * times[i];   /* 错：乘了出现次数 */
    }
    printf("raw %d\n", raw);
    printf("pooled %d\n", pooled);
    printf("saved %d\n", raw - pooled);
    printf("unique %d\n", uniq);
    for (int i = 0; i < uniq; i++) {
        char rev[24];
        int len = (int)strlen(word[i]);
        for (int k = 0; k < len; k++) {
            rev[k] = word[i][len - 1 - k];
        }
        rev[len] = '\0';
        printf("%d %s\n", times[i], rev);
    }
    return 0;
}
```

### 按字典序输出清单 [WA]
题目要的是**首次出现顺序**——这和"编译器把字面量放进只读区的顺序"是对应的。排了序，`ab ba ab ba abc cba` 这种输入会输出 `ab abc ba cba` 而不是 `ab ba abc cba`。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXN 200

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }
    char word[MAXN][24];
    int times[MAXN];
    int uniq = 0;
    int raw = 0;
    for (int k = 0; k < n; k++) {
        char s[24];
        if (scanf("%23s", s) != 1) {
            return 0;
        }
        raw += (int)strlen(s) + 1;
        int found = -1;
        for (int i = 0; i < uniq; i++) {
            if (strcmp(word[i], s) == 0) {
                found = i;
                break;
            }
        }
        if (found >= 0) {
            times[found]++;
        } else {
            strcpy(word[uniq], s);
            times[uniq] = 1;
            uniq++;
        }
    }
    int pooled = 0;
    for (int i = 0; i < uniq; i++) {
        pooled += (int)strlen(word[i]) + 1;
    }
    for (int i = 1; i < uniq; i++) {            /* 错：按字典序重排了清单 */
        char key[24];
        int cnt = times[i];
        strcpy(key, word[i]);
        int j = i - 1;
        while (j >= 0 && strcmp(word[j], key) > 0) {
            strcpy(word[j + 1], word[j]);
            times[j + 1] = times[j];
            j--;
        }
        strcpy(word[j + 1], key);
        times[j + 1] = cnt;
    }
    printf("raw %d\n", raw);
    printf("pooled %d\n", pooled);
    printf("saved %d\n", raw - pooled);
    printf("unique %d\n", uniq);
    for (int i = 0; i < uniq; i++) {
        char rev[24];
        int len = (int)strlen(word[i]);
        for (int k = 0; k < len; k++) {
            rev[k] = word[i][len - 1 - k];
        }
        rev[len] = '\0';
        printf("%d %s\n", times[i], rev);
    }
    return 0;
}
```

### 反转后忘了补 `'\0'` [WA]
`rev` 是栈上的局部数组，内容不确定。只写入 `len` 个字符而不补结尾，`printf("%s")` 会接着往后读到垃圾——运气好只是多打印几个怪字符，运气不好越界。每写一段字符串都以"手动补 `\0`"结束，是 C 里必须养成的习惯。

### 对字面量原地反转 [RE]
如果为了省一个数组而写成"把指针指向的字面量倒着交换"，那就成了修改字符串字面量：本平台会直接判 `RE`（只读页访问违例），别的平台可能"成功"并影响所有内容相同的字面量。本题输入虽然来自缓冲区可写，但"反转要作用在副本上"这条纪律不能破——把 `const char *` 换成 `char *` 只需要一次强制转换，编译器拦不住。

## 测试用例
### 01 sample 示例 1
```in
3
ab ba ab
```
```out
raw 9
pooled 6
saved 3
unique 2
2 ba
1 ab
```

### 02 sample 示例 2
```in
1
a
```
```out
raw 2
pooled 2
saved 0
unique 1
1 a
```

### 03 boundary 200 个字面量、20 种内容
```in
200
aaz abz acz adz aez afz agz ahz aiz ajz akz alz amz anz aoz apz aqz arz asz atz aaz abz acz adz aez afz agz ahz aiz ajz akz alz amz anz aoz apz aqz arz asz atz aaz abz acz adz aez afz agz ahz aiz ajz akz alz amz anz aoz apz aqz arz asz atz aaz abz acz adz aez afz agz ahz aiz ajz akz alz amz anz aoz apz aqz arz asz atz aaz abz acz adz aez afz agz ahz aiz ajz akz alz amz anz aoz apz aqz arz asz atz aaz abz acz adz aez afz agz ahz aiz ajz akz alz amz anz aoz apz aqz arz asz atz aaz abz acz adz aez afz agz ahz aiz ajz akz alz amz anz aoz apz aqz arz asz atz aaz abz acz adz aez afz agz ahz aiz ajz akz alz amz anz aoz apz aqz arz asz atz aaz abz acz adz aez afz agz ahz aiz ajz akz alz amz anz aoz apz aqz arz asz atz aaz abz acz adz aez afz agz ahz aiz ajz akz alz amz anz aoz apz aqz arz asz atz
```
```out
raw 800
pooled 80
saved 720
unique 20
10 zaa
10 zba
10 zca
10 zda
10 zea
10 zfa
10 zga
10 zha
10 zia
10 zja
10 zka
10 zla
10 zma
10 zna
10 zoa
10 zpa
10 zqa
10 zra
10 zsa
10 zta
```
> 20 种内容各出现 10 次，每个占 4 字节（3 个字符 + `'\0'`）：`raw = 800`、`pooled = 80`。清单按首次出现顺序 `aaz, abz, …, atz`，反转后是 `zaa, zba, …, zta`。

### 04 degenerate 单个字符
```in
1
z
```
```out
raw 2
pooled 2
saved 0
unique 1
1 z
```

### 05 trap 全部相同
```in
12
abc abc abc abc abc abc abc abc abc abc abc abc
```
```out
raw 48
pooled 4
saved 44
unique 1
12 cba
```
> 12 份 × 4 字节 = 48，池化后只剩 4 字节。这种极端情况下 `unique` 是 1，最容易暴露"循环上界写成 n"的错误。

### 06 trap 互为镜像的词
```in
6
ab ba ab ba abc cba
```
```out
raw 20
pooled 14
saved 6
unique 4
2 ba
2 ab
1 cba
1 abc
```
> `ab` 和 `ba` 内容不同，不能合并；它们反转后正好交换了位置，清单里"反转结果"和"另一个词"长得一样，稍不留神会把行序也搞反。

### 07 normal 混合重复
```in
7
hello world hello code world c hello
```
```out
raw 37
pooled 19
saved 18
unique 4
3 olleh
2 dlrow
1 edoc
1 c
```
