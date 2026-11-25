// 解析 AddressSanitizer / UndefinedBehaviorSanitizer 报告，生成面向初学者的摘要。

const ASAN_KINDS = {
  'heap-buffer-overflow': ['堆内存越界访问', '访问了 malloc/calloc 分配的内存块之外的位置。常见原因：下标写成 <= n、分配时少算了一个元素（例如字符串忘了给 \'\\0\' 留位置）。'],
  'stack-buffer-overflow': ['栈数组越界访问', '访问了局部数组范围之外的元素。长度为 N 的数组，合法下标是 0 到 N-1。'],
  'global-buffer-overflow': ['全局数组越界访问', '访问了全局/静态数组（或字符串字面量）范围之外的元素。'],
  'heap-use-after-free': ['释放后继续使用', '一块内存已经 free 了，之后又通过指针读写它。free 之后应立即把指针设为 NULL，且不再使用。'],
  'double-free': ['重复释放', '同一块内存被 free 了两次。free 之后把指针设为 NULL 可以避免（free(NULL) 是安全的）。'],
  'attempting double-free': ['重复释放', '同一块内存被 free 了两次。free 之后把指针设为 NULL 可以避免（free(NULL) 是安全的）。'],
  'stack-use-after-return': ['使用了已返回函数的局部变量', '函数返回了局部变量的地址，函数结束后这块栈内存已经失效，再访问就是未定义行为。'],
  'stack-use-after-scope': ['使用了已超出作用域的变量', '变量所在的 { } 代码块已经结束，但仍通过指针访问它。'],
  'stack-overflow': ['栈溢出', '函数调用层次太深（通常是递归没有正确的终止条件），或者局部数组太大，把栈空间用完了。'],
  'SEGV': ['非法内存访问（段错误）', '访问了不属于程序的内存地址。常见原因：解引用空指针或野指针、下标严重越界。'],
  'access-violation': ['非法内存访问（段错误）', '访问了不属于程序的内存地址。常见原因：解引用空指针或野指针、下标严重越界。'],
  'bad-free': ['释放了非法指针', 'free 的指针不是 malloc/calloc/realloc 返回的（例如释放了局部数组、或指针被移动过）。'],
  'attempting free on address which was not malloc()-ed': ['释放了非法指针', 'free 的指针不是 malloc/calloc/realloc 返回的（例如释放了局部数组、或指针被移动过）。'],
  'negative-size-param': ['参数大小为负', '传给 memcpy/memset 等函数的长度是负数（通常是计算长度时出错）。'],
  'memcpy-param-overlap': ['memcpy 源和目标区域重叠', 'memcpy 要求源和目标内存不重叠，重叠时结果未定义。重叠拷贝请改用 memmove。'],
  'strcpy-param-overlap': ['strcpy 源和目标重叠', 'strcpy 的源和目标内存重叠，结果未定义。'],
  'allocation-size-too-big': ['申请的内存过大', 'malloc 的参数大得离谱，通常是大小计算错误（例如负数被转换成了巨大的无符号数）。'],
  'calloc-overflow': ['calloc 参数相乘溢出', 'calloc(n, size) 中 n*size 超出了可表示范围。'],
};

const UBSAN_KINDS = [
  [/signed integer overflow/, '有符号整数溢出', '有符号整数运算结果超出了类型的表示范围（例如 int 超过 2147483647）。这是未定义行为：编译器可以假设它不会发生并据此优化。需要更大的范围请用 long long，或在运算前判断。'],
  [/division by zero/, '除以零', '整数除法或取余的除数是 0。'],
  [/load of null pointer|store to null pointer|member access within null pointer|null pointer/, '空指针解引用', '通过 NULL 指针读写数据。使用指针前先判断它是否为 NULL（例如 malloc 失败会返回 NULL）。'],
  [/shift exponent .* is (too large|negative)|left shift of .* by .* places cannot be represented|left shift of negative value/, '非法移位', '移位位数为负、大于等于类型位宽，或对负数左移，都是未定义行为。'],
  [/index .* out of bounds/, '数组下标越界', '下标超出了数组声明的长度。'],
  [/misaligned address/, '未对齐的内存访问', '通过指针访问了不满足对齐要求的地址（常见于强制类型转换指针）。'],
  [/load of value .* which is not a valid value for type 'bool'/, '非法的 bool 值', '读取了未初始化或被破坏的 bool 变量。'],
  [/execution reached the end of a value-returning function|reached the end of a value-returning function/, '函数缺少返回值', '声明了返回值的函数执行到末尾却没有 return。'],
  [/is outside the range of representable values/, '浮点转整数溢出', '浮点数转换为整数时超出了整数类型的范围。'],
  [/pointer overflow|applying non-zero offset .* to null pointer|addition of unsigned offset/, '指针运算溢出', '指针加减后越出了合法范围（例如对 NULL 做指针运算）。'],
  [/variable length array bound evaluates to non-positive value/, '变长数组长度非正', '变长数组（VLA）的长度必须大于 0。'],
];

/** 从栈回溯中找到第一个位于学习者源文件内的帧 */
function userFrame(lines, userFiles) {
  for (const l of lines) {
    const m = l.match(/#\d+ 0x[0-9a-f]+ in (\S+) (.+?):(\d+)(?::(\d+))?\s*$/i);
    if (!m) continue;
    const file = m[2].replace(/\\/g, '/').split('/').pop();
    if (userFiles.includes(file)) return { func: m[1], file, line: Number(m[3]) };
  }
  return null;
}

/**
 * @param {string} text  sanitizer 输出（stderr 或 log_path 文件内容）
 * @param {string[]} userFiles  学习者提交的文件名列表
 * @returns {null | {tool:'asan'|'ubsan', kind:string, title:string, explanation:string, location:null|{file,line,func?}, access?:string, raw:string}}
 */
export function parseSanitizer(text, userFiles = ['main.c']) {
  if (!text) return null;
  const t = text.replace(/\r\n?/g, '\n');
  const lines = t.split('\n');

  const asan = t.match(/ERROR: AddressSanitizer: ([\w-]+(?: double-free| free on address which was not malloc\(\)-ed)?)/);
  if (asan) {
    let kind = asan[1];
    if (/^attempting/.test(kind)) kind = kind.includes('double') ? 'double-free' : 'bad-free';
    const info = ASAN_KINDS[kind] || ASAN_KINDS[asan[1]] || ['内存错误', 'AddressSanitizer 检测到一次非法内存访问。'];
    const startIdx = lines.findIndex((l) => l.includes('ERROR: AddressSanitizer'));
    // 只取第一个栈回溯（出错位置），不取 "allocated by / freed by" 部分
    const firstStack = [];
    for (let k = startIdx + 1; k < lines.length; k++) {
      if (/^\s*#\d+/.test(lines[k])) firstStack.push(lines[k]);
      else if (firstStack.length) break;
    }
    const access = (t.match(/^(READ|WRITE) of size (\d+)/m) || []).slice(1);
    const region = (t.match(/is located (\d+) bytes? (to the left of|to the right of|after|before|inside of) (\d+)-byte region/) || []);
    let detail = info[1];
    if (access.length) detail += `\n本次操作：${access[0] === 'READ' ? '读取' : '写入'} ${access[1]} 字节。`;
    if (region.length) {
      const where = { 'to the left of': '之前', before: '之前', 'to the right of': '之后', after: '之后', 'inside of': '内部' }[region[2]] || region[2];
      detail += `\n出错地址位于一块 ${region[3]} 字节内存的${where} ${region[1]} 字节处。`;
    }
    return {
      tool: 'asan',
      kind,
      title: info[0],
      explanation: detail,
      location: userFrame(firstStack, userFiles),
      raw: summarizeRaw(lines, startIdx),
    };
  }

  const ub = t.match(/^(.+?):(\d+):(\d+): runtime error: (.*)$/m);
  if (ub) {
    const msg = ub[4];
    const hit = UBSAN_KINDS.find(([re]) => re.test(msg));
    const file = ub[1].replace(/\\/g, '/').split('/').pop();
    return {
      tool: 'ubsan',
      kind: msg,
      title: hit ? hit[1] : '未定义行为',
      explanation: (hit ? hit[2] : 'UndefinedBehaviorSanitizer 检测到一次未定义行为。') + `\n原始信息：${msg}`,
      location: { file, line: Number(ub[2]) },
      raw: summarizeRaw(lines, lines.findIndex((l) => l.includes('runtime error'))),
    };
  }
  return null;
}

/** 截取报告的前若干行作为"原始报告摘要"，去掉运行库内部路径的噪音 */
function summarizeRaw(lines, startIdx, max = 24) {
  const out = [];
  for (let k = Math.max(0, startIdx); k < lines.length && out.length < max; k++) {
    const l = lines[k];
    if (/crtexe\.c|KERNEL32\.DLL|ntdll\.dll|compiler-rt\/lib/i.test(l)) continue;
    out.push(l);
  }
  return out.join('\n').trim();
}
