// 解析 Clang 编译输出，提取错误/警告位置，并附上面向初学者的中文解释。

const DIAG_RE = /^(?<file>[^\r\n:]+(?::[\\/][^\r\n:]*)?):(?<line>\d+):(?<col>\d+): (?<level>fatal error|error|warning|note): (?<msg>.*?)(?: \[(?<flag>-W[\w-]+)\])?$/gm;

/** 常见报错 → 通俗解释。按顺序匹配，第一条命中的生效。 */
const EXPLAIN = [
  [/expected ';'/, '这里少了一个分号 ;。C 语言每条语句都要用分号结尾，通常是上一行末尾漏了。'],
  [/expected '\)'/, '括号没有配对：缺少右括号 )。检查左右括号数量是否一致。'],
  [/expected '\}'/, '花括号没有配对：缺少右花括号 }。检查每个 { 是否都有对应的 }。'],
  [/expected expression/, '这里需要一个表达式（比如变量、数字、计算式），但编译器没找到。可能多写/少写了符号。'],
  [/use of undeclared identifier '([^']+)'/, (m) => `"${m[1]}" 还没有声明就被使用了。检查是否拼写错误、忘记定义变量，或忘记 #include 对应的头文件。`],
  [/call to undeclared function '([^']+)'/, (m) => `函数 "${m[1]}" 在调用前没有声明。要么把函数定义放到调用之前，要么在前面写函数原型，或者 #include 声明它的头文件。`],
  [/implicit declaration of function '([^']+)'/, (m) => `函数 "${m[1]}" 没有声明就调用了。通常是忘了 #include 对应头文件（如 printf 需要 <stdio.h>，malloc 需要 <stdlib.h>，strlen 需要 <string.h>）。`],
  [/unknown type name '([^']+)'/, (m) => `编译器不认识类型 "${m[1]}"。检查拼写；如果是结构体，记得写 struct 或先用 typedef 定义；如果是 bool/size_t 等，检查是否包含了对应头文件。`],
  [/redefinition of '([^']+)'/, (m) => `"${m[1]}" 被定义了两次。同一个作用域里同名的变量/函数只能定义一次。`],
  [/conflicting types for '([^']+)'/, (m) => `"${m[1]}" 的声明和定义类型不一致（返回类型或参数不同）。让原型和定义保持完全一样。`],
  [/too few arguments to function call/, '调用函数时传的参数少于函数定义要求的个数。'],
  [/too many arguments to function call/, '调用函数时传的参数多于函数定义要求的个数。'],
  [/incompatible pointer to integer conversion|incompatible integer to pointer conversion/, '把指针当整数用了（或反过来）。检查是否多写/少写了 * 或 &。'],
  [/incompatible pointer types/, '两个指针的类型不匹配，例如把 int * 赋给 char *。检查变量类型或是否需要取地址 &。'],
  [/format specifies type '([^']+)' but the argument has type '([^']+)'/, (m) => `printf/scanf 的格式说明符和参数类型不匹配：格式要求 ${m[1]}，实际传入 ${m[2]}。类型不匹配是未定义行为，输出可能是乱码。`],
  [/more '%' conversions than data arguments/, '格式字符串里的 % 说明符比后面给的参数多。每个 %d、%s 等都需要一个对应参数。'],
  [/data argument not used by format string/, '给 printf 传的参数比格式字符串里的 % 说明符多，多出来的参数没有被使用。'],
  [/variable '([^']+)' is uninitialized when used here|variable '([^']+)' is used uninitialized/, (m) => `变量 "${m[1] || m[2]}" 还没赋值就被使用了。未初始化的局部变量里是随机的"垃圾值"，读取它是未定义行为。`],
  [/unused variable '([^']+)'/, (m) => `变量 "${m[1]}" 定义了但从没用过。不影响运行，但可能说明代码有遗漏。`],
  [/unused parameter '([^']+)'/, (m) => `参数 "${m[1]}" 没有被使用。不影响运行。`],
  [/non-void function does not return a value|control reaches end of non-void function|non-void function does not return a value in all control paths/, '这个函数声明了返回值类型，但有的执行路径没有 return。调用者拿到的会是不确定的值。'],
  [/using the result of an assignment as a condition/, '在条件里用了赋值 = ，你可能想写的是比较 == 。if (x = 5) 永远为真，并且会把 x 改成 5。'],
  [/comparison of integers of different signs/, '有符号整数和无符号整数做比较。负数会被转换成很大的无符号数，比较结果可能出乎意料。'],
  [/address of stack memory associated with local variable '([^']+)' returned/, (m) => `返回了局部变量 "${m[1]}" 的地址。函数返回后局部变量就被销毁了，这个地址变成悬垂指针，使用它是未定义行为。`],
  [/array index (\d+) is past the end of the array/, (m) => `数组下标 ${m[1]} 超出了数组范围。长度为 N 的数组，合法下标是 0 到 N-1。`],
  [/multiple unsequenced modifications|unsequenced modification and access/, '同一个表达式里对同一个变量既修改又读取（例如 i = i++），求值顺序不确定，这是未定义行为。'],
  [/& has lower precedence than ==|\| has lower precedence than ==/, '位运算 & | 的优先级比 == 低。a & b == c 实际是 a & (b == c)，需要加括号写成 (a & b) == c。'],
  [/undefined symbol: (.+)|undefined reference to [`'](.+)'/, (m) => `链接错误：找不到 "${(m[1] || m[2]).trim()}" 的定义。说明它被声明/调用了，但没有任何源文件真正实现它。检查函数名拼写，以及定义它的 .c 文件是否参与了编译。`],
  [/duplicate symbol: (.+)/, (m) => `链接错误："${m[1].trim()}" 在多个源文件里都有定义。全局变量/函数只能在一个 .c 文件中定义；其他文件用 extern 声明，或者在头文件中只写声明。`],
  [/no member named '([^']+)'/, (m) => `结构体里没有名为 "${m[1]}" 的成员。检查成员名拼写。`],
  [/member reference type '([^']+)' is a pointer; did you mean to use '->'/, () => '这是一个结构体指针，访问成员要用 -> 而不是 . 。'],
  [/member reference type '([^']+)' is not a pointer; did you mean to use '\.'/, () => '这是一个结构体变量（不是指针），访问成员要用 . 而不是 -> 。'],
  [/cannot assign to variable '([^']+)' with const-qualified type|read-only variable is not assignable/, '试图修改一个 const（只读）的变量或通过指向 const 的指针修改数据。'],
  [/'main' must return 'int'/, 'main 函数的返回类型必须是 int。'],
  [/subscripted value is not an array, pointer, or vector/, '对一个既不是数组也不是指针的变量使用了下标 [ ]。'],
  [/indirection requires pointer operand/, '对一个不是指针的值使用了解引用 * 。'],
];

function explain(msg) {
  for (const [re, text] of EXPLAIN) {
    const m = msg.match(re);
    if (m) return typeof text === 'function' ? text(m) : text;
  }
  return null;
}

/**
 * @param {string} output  clang 的 stderr 输出
 * @param {string} workDir 编译目录（用于把绝对路径简化为文件名）
 */
export function parseDiagnostics(output, workDir = '') {
  const items = [];
  const text = output.replace(/\r\n?/g, '\n');
  const prefix = workDir.replace(/\\/g, '/').replace(/\/?$/, '/');
  for (const m of text.matchAll(DIAG_RE)) {
    const g = m.groups;
    let file = g.file.replace(/\\/g, '/');
    if (prefix.length > 1 && file.toLowerCase().startsWith(prefix.toLowerCase())) file = file.slice(prefix.length);
    const level = g.level === 'fatal error' ? 'error' : g.level;
    items.push({
      file,
      line: Number(g.line),
      column: Number(g.col),
      level,
      message: g.msg,
      flag: g.flag || null,
      hint: explain(g.msg),
    });
  }
  // 链接器错误（ld.lld）没有行号
  for (const m of text.matchAll(/^ld\.lld: error: (.*)$/gm)) {
    items.push({ file: null, line: null, column: null, level: 'error', message: m[1], flag: null, hint: explain(m[1]), linker: true });
  }
  return items;
}
