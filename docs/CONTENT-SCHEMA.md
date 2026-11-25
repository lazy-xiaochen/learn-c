# 内容数据格式

内容以 **Markdown 源文件**编写（C 代码直接写在代码块里，不需要转义），
由 `npm run content:build` 转换为 JSON，供应用读取；`npm run content:verify` 做全量校验。

```
content/
  curriculum.json              知识体系（第 1 步）；associated_problem_ids 由构建脚本回填
  lessons/<知识点ID>.md          知识点讲解 + 客观题
  problems/<阶段>/<题目ID>.md    编程题（含测试用例）
  build/                       构建产物（不手工编辑）
    curriculum.json            含回填后的题目关联
    lessons.json               所有知识点内容
    problems.json              所有题目元数据（不含隐藏用例）
    tests/<题目ID>.json         测试用例（与题目元数据分离存储）
```

## 1. curriculum.json

```jsonc
{
  "stages": [ { "id": "s1", "order": 1, "title": "...", "summary": "...", "groups": [ { "id": "s1-start", "title": "..." } ] } ],
  "knowledgePoints": [                  // 数组顺序 = 侧栏顺序 = 推荐学习顺序
    {
      "id": "s1-variables", "title": "...", "stage": "s1", "group": "s1-types",
      "difficulty": "L1",               // 典型难度，用于"下一步推荐"
      "summary": "...",                 // 学习目标
      "covers": ["变量"],               // 覆盖的需求主题（自动覆盖度检查）
      "memoryDiagram": false,           // 是否必须包含内存图
      "prerequisites": ["s1-int-types"],
      "associated_problem_ids": []      // 构建时回填
    }
  ]
}
```

校验：`node scripts/check-curriculum.mjs`。

## 2. 代码块属性

代码块的信息串格式为 `语言 属性...`，属性写成 `key=value`、`key="带空格的值"`，或者只写一个标志词。

## 3. 知识点讲解：lessons/<ID>.md

````markdown
---
id: s1-variables
---

## 讲解
正文（Markdown）。可以包含任意多个 ### 小节。

可运行代码块：学习者可以在页面内编辑并运行。
```c run id=demo-1 stdin="3 4"
#include <stdio.h>
...
```
紧跟其后的 output 块是"预期输出"，校验时会真实运行代码并比对：
```output
7
```

内存图（memoryDiagram 为 true 的知识点必须至少有一个）：
```memory title="int x = 5; int *p = &x;"
地址        | 内容        | 变量
0x1000      | 5           | x
0x1008      | 0x1000      | p
```

## 编译与运行
必须有：本知识点代码在命令行下的编译、运行命令及说明。

## 常见错误
### 错误标题
说明，可带"故意写错"的可运行代码（expect 指定预期结果）：
```c run expect=UB
...
```

## 客观题
### q-s1-variables-1 single
题干（Markdown，可含代码块）
- [ ] 选项 A
  > 这个选项为什么错
- [x] 选项 B
  > 这个选项为什么对

### q-s1-variables-2 fill
题干
answer: 4
> 解析
````

`c run` 的属性：
| 属性 | 含义 |
|---|---|
| `id` | 页面内唯一 |
| `stdin` | 运行时的标准输入（`\n` 表示换行） |
| `opt` | `-O0`（默认）/ `-O1` / `-O2` |
| `sanitize` | `off` 表示关闭 ASan/UBSan（用于演示 UB 的"自然"表现） |
| `expect` | `OK`（默认）/ `CE` / `RE` / `UB` / `TLE` / `MLE`：校验时运行结果必须是这个 |
| `nocheck` | 不校验输出（必须同时写 `reason="..."` 说明原因，例如输出依赖随机地址） |
| `warnings` | `allow` 表示这段代码是故意演示编译警告的；否则示例代码必须零警告 |
| `flags` | 额外编译选项（白名单内，逗号分隔），如 `flags=-Wconversion` |

`output` 块的属性：`match=exact`（默认，忽略行末空白）/ `match=regex`（每一行是一个完整匹配的正则）/ `match=contains`。

客观题类型：`single`（单选）、`multiple`（多选）、`fill`（填空，`answer:` 后为标准答案，多个可接受答案用 ` | ` 分隔）。
**每个选项都必须有解析**（`>` 开头的行）。

## 4. 编程题：problems/<阶段>/<ID>.md

````markdown
---json
{
  "id": "p-s1-variables-1",
  "title": "一句话描述任务",
  "difficulty": "L1",
  "knowledgePoints": ["s1-variables"],
  "special": null,              // 3.3 节题型：pointer-reasoning / memory-layout / ub-analysis / ds-implementation / link-diagnosis
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines", "checkLeaks": false }
}
---

## 题目描述
## 输入格式
## 输出格式
## 数据范围
## 示例
### 示例 1
```in
...
```
```out
...
```
> 可选的说明

## 提示
### 第 1 层
方向性提示
### 第 2 层
具体知识点
### 第 3 层
接近解法但不给代码

## 参考代码
```c file=main.c
...
```

## 初始代码
```c file=main.c
...
```

## 复杂度
时间/空间复杂度与优化方向

## 常见错误
### 错误标题 [WA]
说明后果。可附完整的错误代码，校验时必须得到标注的判题结果：
```c file=main.c expect=WA
...
```

## 测试用例
### 01 sample 示例 1
```in
```
```out
```
### 02 boundary 最小规模
...
### 生成 stress 最大规模
```js gen
// 返回 [{ kind, category, input, output }]；output 必须在这里独立计算（不能调用参考代码）
return [...];
```
````

判题模式（`judge.mode`）：
- `stdio`：学习者提交完整程序，读标准输入、写标准输出。
- `function`：学习者只实现函数；`## 测试驱动` 小节提供 `c file=xxx.c hidden`（隐藏的 main）和 `c file=xxx.h`（学习者可见的接口头文件）。
- `multi`：多文件题（如链接错误诊断），初始代码包含多个文件，学习者提交全部文件。

**输出规模限制**：判题器对标准输出有 64KB 上限（需求第六节），超出按"输出超限"判错。最大规模用例应当是"输入大、输出小"，
设计题目时据此确定数据范围（例如逐条输出结果的题目，条数上限约 4000）。

测试用例 `kind`：`sample`（可见，必须与示例一一对应）、`boundary`（正常边界）、`degenerate`（退化情况）、
`trap`（C 语言特有陷阱）、`normal`、`stress`。规则：可见用例 ≥ 2；隐藏用例 ≥ 5，且至少各有 1 个 boundary、degenerate、trap。

文件读写题：用例中用 ```` ```file name=data.txt ```` 提供输入文件，
用 ```` ```expect-file name=out.txt compare=bytes ```` 声明程序应写出的文件。
