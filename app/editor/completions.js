// 基础自动补全：C 关键字 + 常用标准库函数（需求 4.1）。
// info 是给初学者看的一句话说明。
const KEYWORDS = [
  'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extern',
  'float', 'for', 'goto', 'if', 'inline', 'int', 'long', 'register', 'restrict', 'return', 'short', 'signed',
  'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while',
  '_Bool', '_Alignas', '_Alignof', '_Static_assert', '_Noreturn', '_Generic',
  'bool', 'true', 'false', 'NULL', 'EOF', 'size_t', 'ptrdiff_t', 'FILE',
  'int8_t', 'int16_t', 'int32_t', 'int64_t', 'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t',
  'INT_MAX', 'INT_MIN', 'UINT_MAX', 'LLONG_MAX', 'LLONG_MIN', 'CHAR_BIT', 'SIZE_MAX',
  'EXIT_SUCCESS', 'EXIT_FAILURE', 'SEEK_SET', 'SEEK_CUR', 'SEEK_END',
];

const FUNCS = {
  'stdio.h': {
    printf: '格式化输出到屏幕', scanf: '按格式读入，返回成功读入的项数', puts: '输出字符串并换行', putchar: '输出一个字符',
    getchar: '读入一个字符，结束时返回 EOF', fgets: '读入一行（指定缓冲区大小，安全）', fputs: '输出字符串（不加换行）',
    sprintf: '格式化输出到字符数组', snprintf: '格式化输出到字符数组（限制长度，安全）', sscanf: '从字符串按格式读入',
    fopen: '打开文件，失败返回 NULL', fclose: '关闭文件', fprintf: '格式化输出到文件', fscanf: '从文件按格式读入',
    fread: '按块读文件', fwrite: '按块写文件', fgetc: '从文件读一个字符', fputc: '向文件写一个字符', fseek: '移动文件位置',
    ftell: '获取文件位置', rewind: '回到文件开头', feof: '是否到达文件末尾（读失败后才为真）', ferror: '是否发生读写错误',
    fflush: '把输出缓冲区写出去', perror: '输出最近一次错误的说明', remove: '删除文件', rename: '重命名文件',
  },
  'stdlib.h': {
    malloc: '分配内存（未初始化），失败返回 NULL', calloc: '分配并清零内存', realloc: '调整已分配内存的大小',
    free: '释放 malloc/calloc/realloc 得到的内存', exit: '结束程序', abs: '整数绝对值', labs: 'long 绝对值', llabs: 'long long 绝对值',
    atoi: '字符串转 int（不检查错误）', strtol: '字符串转 long（可检查错误）', strtoul: '字符串转 unsigned long', strtod: '字符串转 double',
    qsort: '快速排序', bsearch: '二分查找', rand: '伪随机数', srand: '设置随机数种子',
  },
  'string.h': {
    strlen: '字符串长度（不含 \\0）', strcpy: '复制字符串（不检查长度）', strncpy: '复制最多 n 个字符（可能不加 \\0）',
    strcat: '拼接字符串', strncat: '拼接最多 n 个字符', strcmp: '比较字符串', strncmp: '比较前 n 个字符',
    strchr: '查找字符', strrchr: '从后往前查找字符', strstr: '查找子串', strtok: '按分隔符切分（会修改原串）',
    memcpy: '复制内存（区域不能重叠）', memmove: '复制内存（允许重叠）', memset: '按字节填充内存', memcmp: '比较内存',
  },
  'ctype.h': {
    isdigit: '是否数字字符', isalpha: '是否字母', isalnum: '是否字母或数字', isspace: '是否空白字符', isupper: '是否大写字母',
    islower: '是否小写字母', toupper: '转大写', tolower: '转小写',
  },
  'math.h': {
    sqrt: '平方根', pow: '幂', fabs: '浮点绝对值', floor: '向下取整', ceil: '向上取整', round: '四舍五入', fmod: '浮点取余',
    sin: '正弦', cos: '余弦', log: '自然对数', exp: 'e 的幂',
  },
  'assert.h': { assert: '条件不成立时终止程序' },
};

export function cCompletionSource(context) {
  const word = context.matchBefore(/[A-Za-z_]\w*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  // 字符串和注释里不补全
  const before = context.state.sliceDoc(Math.max(0, word.from - 200), word.from);
  const line = before.split('\n').pop();
  if (/\/\//.test(line) || (line.split('"').length - 1) % 2 === 1) return null;
  return {
    from: word.from,
    options: OPTIONS,
    validFor: /^\w*$/,
  };
}

const OPTIONS = [
  ...KEYWORDS.map((k) => ({ label: k, type: 'keyword' })),
  ...Object.entries(FUNCS).flatMap(([header, fns]) =>
    Object.entries(fns).map(([name, info]) => ({ label: name, type: 'function', detail: `<${header}>`, info, apply: name })),
  ),
];
