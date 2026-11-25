---json
{
  "id": "p-s5-ub-null-deref-2",
  "title": "解析 key=value 配置行：没有等号的行",
  "difficulty": "L3",
  "knowledgePoints": ["s5-ub-null-deref"],
  "special": null,
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
程序常把配置写成一行一个 `key=value`。现在给你 `n` 行这样的配置，但其中可能混着**格式不对、没有等号**的行。请逐行解析并输出：

- 含有 `=` 的行：把它从第一个 `=` 处切成两半，输出 `key -> value`（`key` 和 `value` 都可以是空字符串）；
- 没有 `=` 的行：输出 `BAD ` 加上这一行的原文。

解析时用 `strchr(line, '=')` 找等号。它**找不到时返回 `NULL`**——如果把 `*eq = '\0'` 写在判空之前，就是在往地址 0 写数据，属于空指针解引用。

## 输入格式
第一行一个整数 `n`。
接下来 `n` 行，每行 1 到 60 个字符，不包含空格，可能含有 0 个或 1 个 `=`。

## 输出格式
对每一行输出一行：
- 有 `=`：`key -> value`（中间是空格、减号、大于号、空格）；
- 没有 `=`：`BAD ` 后跟这一行的原文。

## 数据范围
1 ≤ n ≤ 100
每行长度 1 ≤ len ≤ 60
每行最多一个 `=`

`key` 或 `value` 可能是空字符串（例如 `=v`、`k=`、单独一个 `=`），这些都是合法输入，不需要特殊报错。

## 示例
### 示例 1
```in
3
name=alice
port=8080
oops
```
```out
name -> alice
port -> 8080
BAD oops
```
> 前两行有等号，按 `key -> value` 输出；`oops` 没有等号，原样跟在 `BAD ` 后面。

### 示例 2（边界：空 key 与空 value）
```in
3
=v
k=
=
```
```out
 -> v
k -> 
 -> 
```
> `=v` 的 key 是空字符串，`k=` 的 value 是空字符串，单独一个 `=` 两边都空。这三种都**有**等号，所以都不是 `BAD`。

## 提示
### 第 1 层
逐行读用 `fgets(line, sizeof line, stdin)`。注意它会把行尾的 `'\n'` 也读进来，输出前要去掉，否则 `BAD` 行和 `value` 的末尾会多一个换行。

### 第 2 层
`char *eq = strchr(line, '=');` 之后，第一个动作必须是 `if (eq == NULL)`。只有确认 `eq` 非空，才能 `*eq = '\0';` 把这一行切成两段。

### 第 3 层
三种情况分别处理：`eq == NULL` → 输出 `BAD`；否则 `*eq = '\0'` 后输出 `line` 和 `eq + 1`。空 key / 空 value 不需要额外判断，`%s` 打印空字符串就是什么都不打印。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXLINE 128

int main(void) {
    char line[MAXLINE] = { 0 };
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    int n = 0;
    if (sscanf(line, "%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }
    for (int k = 0; k < n; k++) {
        if (fgets(line, sizeof line, stdin) == NULL) {
            return 0;
        }
        size_t len = strlen(line);
        while (len > 0 && (line[len - 1] == '\n' || line[len - 1] == '\r')) {
            line[--len] = '\0';          /* 去掉行尾换行 */
        }
        char *eq = strchr(line, '=');
        if (eq == NULL) {
            printf("BAD %s\n", line);
        } else {
            *eq = '\0';                  /* 判空之后才能改这一行 */
            printf("%s -> %s\n", line, eq + 1);
        }
    }
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXLINE 128

int main(void) {
    char line[MAXLINE] = { 0 };
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    int n = 0;
    if (sscanf(line, "%d", &n) != 1 || n < 1 || n > 100) {
        return 0;
    }
    for (int k = 0; k < n; k++) {
        if (fgets(line, sizeof line, stdin) == NULL) {
            return 0;
        }
        size_t len = strlen(line);
        while (len > 0 && (line[len - 1] == '\n' || line[len - 1] == '\r')) {
            line[--len] = '\0';
        }
        char *eq = strchr(line, '=');
        *eq = '\0';                      /* TODO: eq 可能是 NULL，先判空 */
        printf("%s -> %s\n", line, eq + 1);
    }
    return 0;
}
```

## 复杂度
时间 O(n × L)：每行扫两遍（去换行、找等号），`L ≤ 60`。
空间 O(L)：一个行缓冲区。

## 常见错误
### 不判空就写 `*eq = '\0'` [UB]
`strchr` 找不到时返回 `NULL`，`*eq = '\0'` 就是往地址 0 写数据。本平台的 UBSan 会报 `store to null pointer of type 'char'`，判 `UB`。

```c file=main.c expect=UB
#include <stdio.h>
#include <string.h>

#define MAXLINE 128

int main(void) {
    char line[MAXLINE] = { 0 };
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    int n = 0;
    if (sscanf(line, "%d", &n) != 1) {
        return 0;
    }
    for (int k = 0; k < n; k++) {
        if (fgets(line, sizeof line, stdin) == NULL) {
            return 0;
        }
        size_t len = strlen(line);
        while (len > 0 && (line[len - 1] == '\n' || line[len - 1] == '\r')) {
            line[--len] = '\0';
        }
        char *eq = strchr(line, '=');
        *eq = '\0';                      /* 错：没有等号时 eq 是 NULL */
        printf("%s -> %s\n", line, eq + 1);
    }
    return 0;
}
```

### 忘记去掉行尾换行 [WA]
`fgets` 把 `'\n'` 留在缓冲区里，`value` 会带着换行被打印出来，`BAD` 行也会多一个空行，输出行数和内容全乱。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXLINE 128

int main(void) {
    char line[MAXLINE] = { 0 };
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    int n = 0;
    if (sscanf(line, "%d", &n) != 1) {
        return 0;
    }
    for (int k = 0; k < n; k++) {
        if (fgets(line, sizeof line, stdin) == NULL) {
            return 0;
        }
        char *eq = strchr(line, '=');
        if (eq == NULL) {
            printf("BAD %s\n", line);    /* 错：line 末尾还带着 '\n' */
        } else {
            *eq = '\0';
            printf("%s -> %s\n", line, eq + 1);   /* value 末尾也多一个换行 */
        }
    }
    return 0;
}
```

### 没有等号时什么都不输出 [WA]
只写 `if (eq != NULL) { ... }`、漏掉 `else`，格式不对的行会被静默跳过，输出行数比输入少，后面的行整体错位。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXLINE 128

int main(void) {
    char line[MAXLINE] = { 0 };
    if (fgets(line, sizeof line, stdin) == NULL) {
        return 0;
    }
    int n = 0;
    if (sscanf(line, "%d", &n) != 1) {
        return 0;
    }
    for (int k = 0; k < n; k++) {
        if (fgets(line, sizeof line, stdin) == NULL) {
            return 0;
        }
        size_t len = strlen(line);
        while (len > 0 && (line[len - 1] == '\n' || line[len - 1] == '\r')) {
            line[--len] = '\0';
        }
        char *eq = strchr(line, '=');
        if (eq != NULL) {
            *eq = '\0';
            printf("%s -> %s\n", line, eq + 1);
        }                                /* 错：没有等号的行被丢掉了 */
    }
    return 0;
}
```

### `BAD` 后面忘了带原文 [WA]
题目要求输出 `BAD ` 加整行内容。只输出 `BAD` 会让所有格式错误的行都长一样，无法区分，判 `WA`。

## 测试用例
### 01 sample 示例 1
```in
3
name=alice
port=8080
oops
```
```out
name -> alice
port -> 8080
BAD oops
```

### 02 sample 示例 2
```in
3
=v
k=
=
```
```out
 -> v
k -> 
 -> 
```

### 03 boundary 100 行、每行 60 个字符
```in
100
key000=v00xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key001=v01xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key002=v02xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key003=v03xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key004=v04xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key005=v05xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key006=v06xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key007=v07xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key008=v08xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key009=v09xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key010=v10xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key011=v11xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key012=v12xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key013=v13xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key014=v14xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key015=v15xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key016=v16xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key017=v17xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key018=v18xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key019=v19xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key020=v20xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key021=v21xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key022=v22xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key023=v23xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key024=v24xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key025=v25xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key026=v26xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key027=v27xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key028=v28xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key029=v29xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key030=v30xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key031=v31xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key032=v32xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key033=v33xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key034=v34xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key035=v35xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key036=v36xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key037=v37xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key038=v38xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key039=v39xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key040=v40xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key041=v41xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key042=v42xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key043=v43xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key044=v44xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key045=v45xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key046=v46xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key047=v47xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key048=v48xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key049=v49xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key050=v50xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key051=v51xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key052=v52xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key053=v53xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key054=v54xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key055=v55xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key056=v56xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key057=v57xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key058=v58xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key059=v59xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key060=v60xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key061=v61xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key062=v62xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key063=v63xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key064=v64xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key065=v65xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key066=v66xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key067=v67xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key068=v68xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key069=v69xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key070=v70xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key071=v71xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key072=v72xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key073=v73xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key074=v74xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key075=v75xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key076=v76xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key077=v77xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key078=v78xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key079=v79xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key080=v80xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key081=v81xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key082=v82xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key083=v83xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key084=v84xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key085=v85xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key086=v86xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key087=v87xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key088=v88xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key089=v89xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key090=v90xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key091=v91xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key092=v92xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key093=v93xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key094=v94xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key095=v95xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key096=v96xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key097=v97xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key098=v98xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key099=v99xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
```out
key000 -> v00xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key001 -> v01xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key002 -> v02xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key003 -> v03xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key004 -> v04xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key005 -> v05xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key006 -> v06xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key007 -> v07xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key008 -> v08xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key009 -> v09xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key010 -> v10xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key011 -> v11xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key012 -> v12xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key013 -> v13xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key014 -> v14xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key015 -> v15xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key016 -> v16xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key017 -> v17xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key018 -> v18xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key019 -> v19xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key020 -> v20xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key021 -> v21xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key022 -> v22xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key023 -> v23xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key024 -> v24xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key025 -> v25xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key026 -> v26xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key027 -> v27xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key028 -> v28xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key029 -> v29xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key030 -> v30xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key031 -> v31xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key032 -> v32xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key033 -> v33xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key034 -> v34xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key035 -> v35xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key036 -> v36xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key037 -> v37xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key038 -> v38xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key039 -> v39xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key040 -> v40xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key041 -> v41xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key042 -> v42xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key043 -> v43xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key044 -> v44xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key045 -> v45xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key046 -> v46xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key047 -> v47xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key048 -> v48xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key049 -> v49xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key050 -> v50xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key051 -> v51xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key052 -> v52xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key053 -> v53xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key054 -> v54xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key055 -> v55xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key056 -> v56xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key057 -> v57xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key058 -> v58xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key059 -> v59xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key060 -> v60xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key061 -> v61xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key062 -> v62xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key063 -> v63xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key064 -> v64xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key065 -> v65xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key066 -> v66xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key067 -> v67xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key068 -> v68xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key069 -> v69xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key070 -> v70xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key071 -> v71xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key072 -> v72xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key073 -> v73xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key074 -> v74xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key075 -> v75xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key076 -> v76xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key077 -> v77xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key078 -> v78xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key079 -> v79xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key080 -> v80xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key081 -> v81xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key082 -> v82xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key083 -> v83xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key084 -> v84xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key085 -> v85xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key086 -> v86xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key087 -> v87xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key088 -> v88xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key089 -> v89xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key090 -> v90xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key091 -> v91xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key092 -> v92xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key093 -> v93xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key094 -> v94xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key095 -> v95xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key096 -> v96xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key097 -> v97xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key098 -> v98xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
key099 -> v99xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 04 degenerate 只有一行且没有等号
```in
1
noequals
```
```out
BAD noequals
```

### 05 trap 整行就是一个等号
```in
1
=
```
```out
 -> 
```

### 06 trap 空 value 与空 key 相邻
```in
2
a=
=b
```
```out
a -> 
 -> b
```

### 07 normal 30 行里混着 10 行格式错误
```in
30
badline0
k1=v2
k2=v4
badline3
k4=v8
k5=v10
badline6
k7=v14
k8=v16
badline9
k10=v20
k11=v22
badline12
k13=v26
k14=v28
badline15
k16=v32
k17=v34
badline18
k19=v38
k20=v40
badline21
k22=v44
k23=v46
badline24
k25=v50
k26=v52
badline27
k28=v56
k29=v58
```
```out
BAD badline0
k1 -> v2
k2 -> v4
BAD badline3
k4 -> v8
k5 -> v10
BAD badline6
k7 -> v14
k8 -> v16
BAD badline9
k10 -> v20
k11 -> v22
BAD badline12
k13 -> v26
k14 -> v28
BAD badline15
k16 -> v32
k17 -> v34
BAD badline18
k19 -> v38
k20 -> v40
BAD badline21
k22 -> v44
k23 -> v46
BAD badline24
k25 -> v50
k26 -> v52
BAD badline27
k28 -> v56
k29 -> v58
```

### 08 trap 60 个字符都没有等号
```in
1
aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```
```out
BAD aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```
