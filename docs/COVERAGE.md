# 内容覆盖报告

> 由 `npm run content:verify` 根据实际内容自动生成，请勿手工编辑。生成时间：2026-11-25 15:42
> 运行校验：已执行（每段示例代码、每道题的参考代码与常见错误代码都在判题器中真实运行过）

## 总览

| 指标 | 数值 |
|---|---|
| 知识点 | 129 |
| 已写讲解的知识点 | 129 / 129 |
| 内容完整的知识点（讲解 + ≥1 编程题 + ≥1 客观题，且校验通过） | 129 / 129 |
| 编程题 | 200 |
| 客观题 | 130 |
| 编程题占比 | 61%（要求 ≥ 60%） |
| 测试用例总数 | 1780 |

## 各阶段

| 阶段 | 知识点 | 已写讲解 | 内容完整 | 编程题 | 客观题 | 编程题占比 | 指针关系推理 | 内存布局 | UB 辨析 | 手写数据结构 | 编译/链接诊断 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1. C 语言基础语法与程序结构 | 26 | 26 | 26 | 41 | 27 | 60% | 3（含替代 3） | 3（含替代 3） | 2 | 2（含替代 2） | 2 |
| 2. 数组、字符串与指针 | 26 | 26 | 26 | 40 | 26 | 61% | 2 | 2 | 2 | 3 | 2 |
| 3. 函数、递归与程序结构 | 12 | 12 | 12 | 20 | 12 | 63% | 2 | 2 | 2 | 2 | 3 |
| 4. 结构体、联合体、枚举与内存对齐 | 13 | 13 | 13 | 20 | 13 | 61% | 2 | 6 | 2 | 2 | 2 |
| 5. 动态内存管理与未定义行为 | 18 | 18 | 18 | 27 | 18 | 60% | 3 | 2 | 2 | 2 | 2 |
| 6. 文件 I/O 与预处理器 | 14 | 14 | 14 | 22 | 14 | 61% | 2 | 2 | 2 | 2 | 2 |
| 7. 数据结构基础与就业冲刺 | 20 | 20 | 20 | 30 | 20 | 60% | 2 | 2 | 2 | 6 | 2 |

> **替代题型说明**：阶段 1 尚未学习指针、数组和结构体，经用户确认，该阶段的三类特色题使用等价替代题型：
> 指针关系推理 → 表达式求值推理；内存布局 → 类型大小与取值范围推理；手写数据结构 → 按接口实现函数（隐藏 main 调用测试）。

## 编程题难度分布

| 阶段 | L1 | L2 | L3 | L4 | L5 |
|---|---|---|---|---|---|
| 1 | 13 | 25 | 3 | 0 | 0 |
| 2 | 3 | 20 | 16 | 1 | 0 |
| 3 | 0 | 2 | 14 | 4 | 0 |
| 4 | 0 | 3 | 9 | 6 | 2 |
| 5 | 0 | 4 | 12 | 10 | 1 |
| 6 | 0 | 1 | 10 | 11 | 0 |
| 7 | 0 | 0 | 2 | 22 | 6 |

## 未达标项

无。

## 逐个知识点

| 阶段 | 知识点 | 讲解 | 编程题 | 客观题 | 状态 |
|---|---|---|---|---|---|
| 1 | s1-env 开发环境：编辑器、编译器与第一次运行 | ✓ | 1 | 1 | ✅ |
| 1 | s1-compile-pipeline 编译流程：预处理 → 编译 → 汇编 → 链接 | ✓ | 2 | 1 | ✅ |
| 1 | s1-hello-anatomy 第一个 C 程序的完整解剖 | ✓ | 1 | 1 | ✅ |
| 1 | s1-include-basics #include 的两种形式与搜索路径 | ✓ | 1 | 1 | ✅ |
| 1 | s1-int-types 整数类型与 sizeof：char / short / int / long 的大小与范围 | ✓ | 3 | 1 | ✅ |
| 1 | s1-float-types 浮点类型 float / double 与精度 | ✓ | 2 | 1 | ✅ |
| 1 | s1-variables 变量：声明、初始化、赋值与命名 | ✓ | 2 | 1 | ✅ |
| 1 | s1-constants 常量：字面量后缀、const 与 #define | ✓ | 1 | 1 | ✅ |
| 1 | s1-arith-ops 算术运算符：整数除法与取余 | ✓ | 4 | 1 | ✅ |
| 1 | s1-type-conversion 类型转换：整型提升、算术转换与强制转换 | ✓ | 1 | 1 | ✅ |
| 1 | s1-relational-logical 关系运算符、逻辑运算符与短路求值 | ✓ | 3 | 1 | ✅ |
| 1 | s1-bitwise 位运算符：& | ^ ~ << >> | ✓ | 3 | 1 | ✅ |
| 1 | s1-assign-comma 赋值、复合赋值、自增自减与逗号运算符 | ✓ | 1 | 1 | ✅ |
| 1 | s1-precedence 运算符优先级与结合性：经典陷阱 | ✓ | 1 | 2 | ✅ |
| 1 | s1-printf printf 格式化输出：说明符、宽度、精度与返回值 | ✓ | 2 | 1 | ✅ |
| 1 | s1-scanf scanf 格式化输入：说明符、取地址与返回值 | ✓ | 3 | 1 | ✅ |
| 1 | s1-io-buffer 输入缓冲区：残留的换行与 getchar | ✓ | 1 | 1 | ✅ |
| 1 | s1-if-else if / else 与多分支 | ✓ | 2 | 1 | ✅ |
| 1 | s1-switch switch 与 fall-through | ✓ | 2 | 1 | ✅ |
| 1 | s1-loops for / while / do-while 循环 | ✓ | 8 | 1 | ✅ |
| 1 | s1-loop-control break、continue 与 goto | ✓ | 2 | 1 | ✅ |
| 1 | s1-loop-patterns 循环的常见模式：累加、计数、找最值与嵌套循环 | ✓ | 3 | 1 | ✅ |
| 1 | s1-func-basics 函数的声明与定义 | ✓ | 5 | 1 | ✅ |
| 1 | s1-pass-by-value 值传递：形参是实参的副本 | ✓ | 2 | 1 | ✅ |
| 1 | s1-scope-lifetime 作用域与生命周期 | ✓ | 2 | 1 | ✅ |
| 1 | s1-recursion-intro 递归入门：函数调用自己与栈展开 | ✓ | 2 | 1 | ✅ |
| 2 | s2-array-basics 一维数组：定义、初始化与遍历 | ✓ | 1 | 1 | ✅ |
| 2 | s2-array-memory 一维数组的内存布局 | ✓ | 2 | 1 | ✅ |
| 2 | s2-array-2d 二维数组与行优先布局 | ✓ | 2 | 1 | ✅ |
| 2 | s2-pointer-basics 指针入门：地址、取地址 & 与解引用 * | ✓ | 3 | 1 | ✅ |
| 2 | s2-pointer-param 指针作函数参数：让函数修改调用者的变量 | ✓ | 2 | 1 | ✅ |
| 2 | s2-pointer-arith 指针算术：类型大小决定步长 | ✓ | 4 | 1 | ✅ |
| 2 | s2-array-decay 数组名退化为指针的精确时机 | ✓ | 2 | 1 | ✅ |
| 2 | s2-array-param 数组作函数参数：sizeof(arr) 在函数内外的差异 | ✓ | 4 | 1 | ✅ |
| 2 | s2-pointer-array-traverse 用指针遍历数组：p[i] 与 *(p + i) | ✓ | 3 | 1 | ✅ |
| 2 | s2-vla 变长数组（VLA）及其限制 | ✓ | 1 | 1 | ✅ |
| 2 | s2-string-nature C 字符串的本质：以 '\0' 结尾的字节序列 | ✓ | 5 | 1 | ✅ |
| 2 | s2-string-io 字符串的输入输出：%s、fgets 与 puts | ✓ | 2 | 1 | ✅ |
| 2 | s2-string-traverse 字符串遍历与字符处理（<ctype.h>） | ✓ | 1 | 1 | ✅ |
| 2 | s2-sizeof-strlen sizeof 与 strlen：“占多少内存”和“有几个字符” | ✓ | 2 | 1 | ✅ |
| 2 | s2-char-array-vs-pointer char[] 与 char *：存储位置和可变性的根本区别 | ✓ | 3 | 1 | ✅ |
| 2 | s2-string-literal 字符串字面量：存储位置与修改的后果 | ✓ | 2 | 1 | ✅ |
| 2 | s2-string-functions 字符串库函数：strlen / strcpy / strcat / strcmp | ✓ | 3 | 1 | ✅ |
| 2 | s2-string-safe 安全的字符串操作：strncpy / strncat / snprintf | ✓ | 1 | 1 | ✅ |
| 2 | s2-const-pointer const 与指针的三种组合 | ✓ | 2 | 1 | ✅ |
| 2 | s2-multi-pointer 多级指针：指向指针的指针 | ✓ | 1 | 1 | ✅ |
| 2 | s2-array-pointer-2d 指针数组与数组指针：int *p[4] 与 int (*p)[4] | ✓ | 2 | 1 | ✅ |
| 2 | s2-function-pointer 函数指针 | ✓ | 4 | 1 | ✅ |
| 2 | s2-void-pointer void * 与指针类型转换规则 | ✓ | 1 | 1 | ✅ |
| 2 | s2-callback 回调函数与 qsort | ✓ | 2 | 1 | ✅ |
| 2 | s2-wild-dangling 野指针、空指针与悬垂指针 | ✓ | 2 | 1 | ✅ |
| 2 | s2-array-vs-pointer 指针与数组：“等价”与“不等价”的场景 | ✓ | 2 | 1 | ✅ |
| 3 | s3-call-convention 调用约定：参数如何传递、返回值如何带回 | ✓ | 1 | 1 | ✅ |
| 3 | s3-stack-frame 函数调用栈与栈帧布局 | ✓ | 2 | 1 | ✅ |
| 3 | s3-recursion-visual 看见递归：打印每一层栈帧的 n 与返回地址 | ✓ | 2 | 1 | ✅ |
| 3 | s3-recursion-patterns 递归的典型模式：分治、记忆化与回溯 | ✓ | 2 | 1 | ✅ |
| 3 | s3-tail-recursion 尾递归与优化条件 | ✓ | 2 | 1 | ✅ |
| 3 | s3-static-local static 局部变量：作用域不变、存储期变成整个程序 | ✓ | 1 | 1 | ✅ |
| 3 | s3-linkage 链接属性：内部链接、外部链接与 static 函数 | ✓ | 1 | 1 | ✅ |
| 3 | s3-extern-multifile extern 与多文件编译 | ✓ | 2 | 1 | ✅ |
| 3 | s3-header-guard 头文件的组织与头文件卫士 | ✓ | 2 | 1 | ✅ |
| 3 | s3-link-errors 读懂链接错误：未定义引用与重复定义 | ✓ | 2 | 1 | ✅ |
| 3 | s3-inline inline 的语义 | ✓ | 2 | 1 | ✅ |
| 3 | s3-volatile volatile：告诉编译器“这个值可能被意外改变” | ✓ | 1 | 1 | ✅ |
| 4 | s4-struct-basics struct：定义、初始化与成员访问 | ✓ | 2 | 1 | ✅ |
| 4 | s4-struct-nested 结构体嵌套与结构体数组 | ✓ | 1 | 1 | ✅ |
| 4 | s4-struct-pointer 结构体指针与 -> 运算符 | ✓ | 2 | 1 | ✅ |
| 4 | s4-self-ref 自引用结构体：链表节点的定义基础 | ✓ | 1 | 1 | ✅ |
| 4 | s4-typedef typedef 的正确用法与陷阱 | ✓ | 1 | 1 | ✅ |
| 4 | s4-struct-param 结构体作函数参数：值传递的代价与指针传递 | ✓ | 2 | 1 | ✅ |
| 4 | s4-union union：所有成员共享同一块内存 | ✓ | 1 | 1 | ✅ |
| 4 | s4-type-punning 类型双关：合法与未定义的边界 | ✓ | 2 | 1 | ✅ |
| 4 | s4-enum enum 的本质是 int | ✓ | 1 | 1 | ✅ |
| 4 | s4-alignment 内存对齐规则与 offsetof | ✓ | 2 | 1 | ✅ |
| 4 | s4-member-order 调整成员顺序减小结构体大小 | ✓ | 2 | 1 | ✅ |
| 4 | s4-pragma-pack #pragma pack 的效果与代价 | ✓ | 2 | 1 | ✅ |
| 4 | s4-bitfield 位域：内存布局与不可移植性 | ✓ | 1 | 1 | ✅ |
| 5 | s5-memory-layout 程序的内存布局：代码区、数据区、BSS、堆与栈 | ✓ | 2 | 1 | ✅ |
| 5 | s5-stack-vs-heap 栈与堆的本质区别 | ✓ | 2 | 1 | ✅ |
| 5 | s5-malloc-free malloc 与 free：申请、检查与释放 | ✓ | 1 | 1 | ✅ |
| 5 | s5-calloc calloc：清零分配与乘法溢出检查 | ✓ | 1 | 1 | ✅ |
| 5 | s5-realloc realloc：扩容与失败时的安全模式 | ✓ | 2 | 1 | ✅ |
| 5 | s5-dynamic-array 动态数组：按需扩容的“可变长数组” | ✓ | 2 | 1 | ✅ |
| 5 | s5-memory-leak 内存泄漏：成因与检测思路 | ✓ | 1 | 1 | ✅ |
| 5 | s5-dangling-double-free 悬垂指针与重复释放 | ✓ | 2 | 1 | ✅ |
| 5 | s5-ub-intro 什么是未定义行为：能跑不等于正确 | ✓ | 1 | 1 | ✅ |
| 5 | s5-ub-out-of-bounds UB：数组越界读写 | ✓ | 2 | 1 | ✅ |
| 5 | s5-ub-signed-overflow UB：有符号整数溢出 | ✓ | 1 | 1 | ✅ |
| 5 | s5-ub-null-deref UB：空指针解引用 | ✓ | 2 | 1 | ✅ |
| 5 | s5-ub-uninit UB：读取未初始化的变量 | ✓ | 1 | 1 | ✅ |
| 5 | s5-ub-sequence UB：i = i++ 与求值顺序 | ✓ | 2 | 1 | ✅ |
| 5 | s5-ub-printf-mismatch UB：printf 格式说明符与参数类型不匹配 | ✓ | 1 | 1 | ✅ |
| 5 | s5-ub-memcpy-overlap UB：memcpy 的源与目标重叠 | ✓ | 1 | 1 | ✅ |
| 5 | s5-ub-string-literal UB：修改字符串字面量 | ✓ | 2 | 1 | ✅ |
| 5 | s5-ub-return-local UB：返回局部变量的地址 | ✓ | 1 | 1 | ✅ |
| 6 | s6-fopen-fclose 打开与关闭文件：fopen / fclose 与打开模式 | ✓ | 2 | 1 | ✅ |
| 6 | s6-text-format-io 格式化文件读写：fprintf / fscanf | ✓ | 2 | 1 | ✅ |
| 6 | s6-line-char-io 按行与按字符读写：fgets / fputs / fgetc / fputc | ✓ | 1 | 1 | ✅ |
| 6 | s6-eof-error 正确判断文件结束：EOF、feof 与 ferror | ✓ | 1 | 1 | ✅ |
| 6 | s6-binary-io 二进制读写：fread / fwrite | ✓ | 2 | 1 | ✅ |
| 6 | s6-text-vs-binary 文本模式与二进制模式：换行符的秘密 | ✓ | 2 | 1 | ✅ |
| 6 | s6-file-position 文件定位：fseek / ftell / rewind | ✓ | 1 | 1 | ✅ |
| 6 | s6-std-streams 标准流 stdin / stdout / stderr 与重定向 | ✓ | 2 | 1 | ✅ |
| 6 | s6-object-macro 对象宏：#define 的文本替换本质 | ✓ | 1 | 1 | ✅ |
| 6 | s6-function-macro 函数宏与展开陷阱：括号与多次求值 | ✓ | 3 | 1 | ✅ |
| 6 | s6-stringify-paste # 与 ## 运算符：字符串化与记号拼接 | ✓ | 1 | 1 | ✅ |
| 6 | s6-conditional-compile 条件编译：#if / #ifdef / #ifndef / #elif / #else / #endif | ✓ | 1 | 1 | ✅ |
| 6 | s6-include-search #include 深入：尖括号与双引号的搜索策略 | ✓ | 2 | 1 | ✅ |
| 6 | s6-predefined-macros 预定义宏：__FILE__ / __LINE__ / __DATE__ / __func__ | ✓ | 1 | 1 | ✅ |
| 7 | s7-singly-list 单向链表：创建、遍历、查找、插入、删除 | ✓ | 2 | 1 | ✅ |
| 7 | s7-list-reverse 链表反转与经典链表技巧 | ✓ | 1 | 1 | ✅ |
| 7 | s7-doubly-list 双向链表 | ✓ | 1 | 1 | ✅ |
| 7 | s7-stack-array 栈：数组实现 | ✓ | 2 | 1 | ✅ |
| 7 | s7-stack-list 栈：链表实现 | ✓ | 1 | 1 | ✅ |
| 7 | s7-queue-circular 队列：循环数组实现 | ✓ | 2 | 1 | ✅ |
| 7 | s7-queue-list 队列：链表实现 | ✓ | 1 | 1 | ✅ |
| 7 | s7-hash-table 哈希表：链地址法 | ✓ | 2 | 1 | ✅ |
| 7 | s7-bst 二叉搜索树的基本操作 | ✓ | 2 | 1 | ✅ |
| 7 | s7-quick-sort 快速排序 | ✓ | 2 | 1 | ✅ |
| 7 | s7-merge-sort 归并排序 | ✓ | 1 | 1 | ✅ |
| 7 | s7-binary-search 二分查找 | ✓ | 1 | 1 | ✅ |
| 7 | s7-iv-memory-layout 面试：C 程序的内存布局 | ✓ | 2 | 1 | ✅ |
| 7 | s7-iv-keywords 面试：static / extern / volatile / const 的作用 | ✓ | 1 | 1 | ✅ |
| 7 | s7-iv-pointer-array 面试：指针与数组的区别 | ✓ | 1 | 1 | ✅ |
| 7 | s7-iv-struct-align 面试：结构体对齐 | ✓ | 2 | 1 | ✅ |
| 7 | s7-iv-malloc-free 面试：malloc 与 free 的配对 | ✓ | 2 | 1 | ✅ |
| 7 | s7-iv-compile-link 面试：编译与链接过程 | ✓ | 2 | 1 | ✅ |
| 7 | s7-iv-bits-endian 面试：位运算技巧与大小端 | ✓ | 1 | 1 | ✅ |
| 7 | s7-iv-handwrite-lib 面试：手写 strcpy / strlen / memcpy / memmove / atoi | ✓ | 1 | 1 | ✅ |
