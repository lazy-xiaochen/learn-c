// 提交前的安全检查（第一道防线）。
// 第二道防线是 runner.exe 的 Job Object：即使绕过这里，程序也无法创建子进程、
// 无法超出内存/时间/输出限制。
import { stripCode, lineOf } from './source-utils.js';

/** 允许的 C 标准库头文件（C17）。其余尖括号头文件一律拒绝。 */
export const ALLOWED_SYSTEM_HEADERS = new Set([
  'assert.h', 'complex.h', 'ctype.h', 'errno.h', 'fenv.h', 'float.h', 'inttypes.h',
  'iso646.h', 'limits.h', 'locale.h', 'math.h', 'setjmp.h', 'signal.h', 'stdalign.h',
  'stdarg.h', 'stdatomic.h', 'stdbool.h', 'stddef.h', 'stdint.h', 'stdio.h', 'stdlib.h',
  'stdnoreturn.h', 'string.h', 'tgmath.h', 'time.h', 'uchar.h', 'wchar.h', 'wctype.h',
]);

/** 禁止调用的函数（以"名字 + 左括号"的形式出现即拒绝）。 */
const BANNED_CALLS = [
  'system', '_wsystem', 'popen', '_popen', '_wpopen', 'fork', 'vfork',
  'execl', 'execlp', 'execle', 'execv', 'execvp', 'execve', 'execvpe',
  '_execl', '_execlp', '_execle', '_execv', '_execvp', '_execve',
  'spawnl', 'spawnlp', 'spawnv', 'spawnvp', '_spawnl', '_spawnlp', '_spawnv', '_spawnvp',
  'CreateProcess', 'CreateProcessA', 'CreateProcessW', 'ShellExecute', 'ShellExecuteA',
  'ShellExecuteW', 'ShellExecuteEx', 'WinExec', 'LoadLibrary', 'LoadLibraryA', 'LoadLibraryW',
  'LoadLibraryEx', 'GetProcAddress', 'VirtualProtect', 'VirtualAlloc',
  'socket', 'WSAStartup',
];
const BANNED_CALL_RE = new RegExp(`\\b(${BANNED_CALLS.join('|')})\\s*\\(`, 'g');

/**
 * @param {Record<string,string>} files  文件名 -> 源码
 * @returns {{ok: boolean, violations: Array<{file:string,line:number,message:string}>}}
 */
export function securityCheck(files, providedFiles = []) {
  const violations = [];
  // 双引号 #include 可以引用：学习者自己提交的文件 + 题目提供的文件（如函数实现题的头文件）
  const names = new Set([...Object.keys(files), ...providedFiles]);

  for (const [file, src] of Object.entries(files)) {
    // 头文件检查：只去注释，保留字符串（"xxx.h" 要能看到）
    const noComments = stripCode(src, { blankStrings: false });
    const incRe = /^[ \t]*#[ \t]*include[ \t]*([<"])([^>"\n]*)[>"]/gm;
    let m;
    while ((m = incRe.exec(noComments))) {
      const line = lineOf(noComments, m.index);
      const raw = m[2].trim();
      const norm = raw.replace(/\\/g, '/');
      if (/^[a-zA-Z]:|^\/|(^|\/)\.\.(\/|$)/.test(norm)) {
        violations.push({ file, line, message: `#include 不允许使用绝对路径或 ".."：${raw}` });
        continue;
      }
      if (m[1] === '<') {
        if (!ALLOWED_SYSTEM_HEADERS.has(norm.toLowerCase())) {
          violations.push({
            file,
            line,
            message: `<${raw}> 不是 C 标准库头文件。本平台只使用标准 C，判题环境不允许包含它。`,
          });
        }
      } else if (!names.has(norm) && !ALLOWED_SYSTEM_HEADERS.has(norm.toLowerCase())) {
        violations.push({
          file,
          line,
          message: `找不到 "${raw}"：双引号形式只能包含你自己提交的文件（当前提交的文件有：${[...names].join('、')}）。`,
        });
      }
    }

    const code = stripCode(src); // 去注释 + 去字符串内容
    BANNED_CALL_RE.lastIndex = 0;
    while ((m = BANNED_CALL_RE.exec(code))) {
      violations.push({
        file,
        line: lineOf(code, m.index),
        message: `不允许调用 ${m[1]}()：它会启动其他程序或加载外部代码，判题环境出于安全考虑禁止使用。`,
      });
    }
    const asmRe = /\b(asm|__asm__|__asm)\b/g;
    while ((m = asmRe.exec(code))) {
      violations.push({ file, line: lineOf(code, m.index), message: '不允许使用内联汇编（asm）。' });
    }
    const pragmaRe = /^[ \t]*#[ \t]*pragma[ \t]+comment\b/gm;
    while ((m = pragmaRe.exec(noComments))) {
      violations.push({ file, line: lineOf(noComments, m.index), message: '不允许使用 #pragma comment。' });
    }
  }
  return { ok: violations.length === 0, violations };
}
