---json
{
  "id": "p-s1-scanf-1",
  "title": "解析 YYYY-MM-DD 格式的日期并改写为 DD/MM/YYYY",
  "difficulty": "L2",
  "knowledgePoints": ["s1-scanf"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
读入一个形如 `年-月-日` 的日期（年、月、日都是整数，用减号 `-` 连接），按 `DD/MM/YYYY` 的格式输出：日和月各占两位、年占四位，不足的位数前面补 0。

如果输入不是"整数-整数-整数"的形式，或者年不在 1~9999、月不在 1~12、日不在 1~31 的范围内，输出 `invalid`。（本题不检查某个月有没有 31 号。）

## 输入格式
一行，一个日期。数字前面可能有空白，月和日可能没有前导零。

## 输出格式
一行，改写后的日期或 `invalid`。

## 数据范围
输入长度不超过 50 个字符。

## 示例
### 示例 1
```in
2024-03-09
```
```out
09/03/2024
```

### 示例 2（边界：最小的日期）
```in
0001-01-01
```
```out
01/01/0001
```

## 提示
### 第 1 层
scanf 的格式字符串里，除了说明符以外的普通字符会怎样处理？读取失败时你怎么知道？

### 第 2 层
`scanf("%d-%d-%d", &y, &m, &d)` 要求输入里依次出现整数、`-`、整数、`-`、整数。它的返回值是成功读入的项数：只有等于 3 才说明格式正确。

### 第 3 层
返回值不是 3，或者任一部分超出范围，输出 `invalid`；否则 `printf("%02d/%02d/%04d\n", d, m, y)`。

## 参考代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int y, m, d;
    /* 格式串中的 '-' 必须在输入中原样出现；返回值是成功读入的项数 */
    if (scanf("%d-%d-%d", &y, &m, &d) != 3) {
        printf("invalid\n");
        return 0;
    }
    if (y < 1 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) {
        printf("invalid\n");
        return 0;
    }
    printf("%02d/%02d/%04d\n", d, m, y);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>

int main(void) {
    int y, m, d;
    /* 读入日期，检查格式与范围，按 DD/MM/YYYY 输出 */

    return 0;
}
```

## 复杂度
O(1)。本题考查 scanf 格式串中的字面字符、返回值的含义，以及 printf 的补零输出。

## 常见错误
### 没有检查 scanf 的返回值 [WA]
输入 `2024/03/09` 时，scanf 只读到 2024 就停了，m 和 d 没有被赋值，程序却继续用它们输出了 `00/00/2024`（如果它们没有初始化，读取它们还是未定义行为）。这段代码同时也漏掉了范围检查。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int y = 0, m = 0, d = 0;
    scanf("%d-%d-%d", &y, &m, &d);
    printf("%02d/%02d/%04d\n", d, m, y);
    return 0;
}
```

### 只判断返回值不等于 EOF [WA]
`scanf(...) != EOF` 只能排除"一开始就没有输入"，读到一部分就失败（返回 1 或 2）的情况被当成了成功。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int y = 1, m = 1, d = 1;
    if (scanf("%d-%d-%d", &y, &m, &d) == EOF) {
        printf("invalid\n");
        return 0;
    }
    if (y < 1 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) {
        printf("invalid\n");
        return 0;
    }
    printf("%02d/%02d/%04d\n", d, m, y);
    return 0;
}
```

### 用空格代替减号 [WA]
`scanf("%d %d %d", ...)` 读 `2024-03-09` 时，第二个 `%d` 会把 `-03` 当成负数 -3 读进来，返回值仍然是 3，于是合法的日期被判成了超出范围。
```c file=main.c expect=WA
#include <stdio.h>

int main(void) {
    int y, m, d;
    if (scanf("%d %d %d", &y, &m, &d) != 3) {
        printf("invalid\n");
        return 0;
    }
    if (y < 1 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) {
        printf("invalid\n");
        return 0;
    }
    printf("%02d/%02d/%04d\n", d, m, y);
    return 0;
}
```

### 输出时没有补零 [WA]
`printf("%d/%d/%d")` 对 `2024-3-5` 输出 `5/3/2024`，而要求是 `05/03/2024`。

## 测试用例
### 01 sample 示例 1
```in
2024-03-09
```
```out
09/03/2024
```

### 02 sample 示例 2
```in
0001-01-01
```
```out
01/01/0001
```

### 03 boundary 最大的日期
```in
9999-12-31
```
```out
31/12/9999
```

### 04 trap 分隔符不是减号（scanf 返回 1）
```in
2024/03/09
```
```out
invalid
```

### 05 trap 缺少日（scanf 返回 2）
```in
2024-03
```
```out
invalid
```

### 06 degenerate 空输入（scanf 返回 EOF）
```in
```
```out
invalid
```

### 07 trap 完全不是数字（scanf 返回 0）
```in
abc
```
```out
invalid
```

### 08 boundary 月份超出范围
```in
2024-13-01
```
```out
invalid
```

### 09 degenerate 月份为 0
```in
2024-00-10
```
```out
invalid
```

### 10 normal 前导空白且没有前导零
```in
   2024-3-5
```
```out
05/03/2024
```
