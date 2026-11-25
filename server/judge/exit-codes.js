// Windows 进程退出码 → 面向初学者的说明。
// 程序崩溃时，Windows 用 NTSTATUS 异常码作为退出码（如 0xC0000005）。

const NTSTATUS = {
  0xc0000005: '访问了非法的内存地址（相当于 Linux 上的段错误 Segmentation fault）。常见原因：使用空指针或野指针、数组下标严重越界。',
  0xc00000fd: '栈溢出：函数递归太深（是否缺少递归终止条件？），或局部数组太大。',
  0xc0000094: '整数除以零。',
  0xc0000095: '整数运算溢出。',
  0xc000008e: '浮点数除以零。',
  0xc000001d: '执行了非法指令。',
  0xc0000409: '程序检测到栈缓冲区被破坏（数组越界写坏了栈），已被强制终止。',
  0xc0000374: '堆内存被破坏（越界写入或重复释放）。',
  0x80000003: '程序执行了断点指令。',
  0xc0000017: '内存不足。',
};

export function describeExitCode(code) {
  const c = Number(code) >>> 0;
  if (NTSTATUS[c]) return `程序崩溃（退出码 0x${c.toString(16).toUpperCase()}）：${NTSTATUS[c]}`;
  if (c === 3) return '程序调用了 abort() 异常终止（例如 assert 断言失败）。';
  if (c >= 0xc0000000) return `程序崩溃（异常码 0x${c.toString(16).toUpperCase()}）。`;
  const signed = c > 0x7fffffff ? c - 0x100000000 : c;
  return `程序的退出码是 ${signed}，不是 0。main 函数应当 return 0 表示正常结束；返回非 0 会被视为运行错误。`;
}
