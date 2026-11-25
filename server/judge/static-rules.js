// 轻量静态规则扫描：在编译器之外，再找出初学者常见的"能编译但有隐患"的写法。
// 这些规则基于正则 + 简单的结构识别，不是完整的 C 语法分析，因此：
//   - 只报告"潜在问题"，不影响判题结果；
//   - 宁可漏报也尽量不误报（每条规则都写了避免误报的条件）。
import { stripCode, splitLines } from './source-utils.js';

const C_KEYWORDS = new Set([
  'if', 'for', 'while', 'switch', 'return', 'sizeof', 'do', 'else', 'case', 'default',
]);

/**
 * @param {Record<string,string>} files
 * @returns {Array<{rule:string, severity:'warning'|'info', file:string, line:number, message:string}>}
 */
export function scanStatic(files) {
  const issues = [];
  for (const [file, src] of Object.entries(files)) {
    const code = stripCode(src);
    const lines = splitLines(code);
    ruleUncheckedAlloc(file, lines, issues);
    ruleScanfReturn(file, lines, issues);
    ruleGets(file, lines, issues);
    ruleScanfStringNoWidth(file, splitLines(stripCode(src, { blankStrings: false })), issues);
    ruleReallocSelf(file, lines, issues);
    ruleUninitialized(file, lines, issues);
    ruleFreeNoNull(file, lines, issues);
    ruleAssignInCondition(file, lines, issues);
    ruleFopenUnchecked(file, lines, issues);
  }
  // 去重（同一行同一规则只报一次）
  const seen = new Set();
  return issues.filter((x) => {
    const k = `${x.rule}|${x.file}|${x.line}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** 在第 from 行之后的 window 行内，是否出现了对 name 的 NULL 检查 */
function hasNullCheck(lines, from, name, window = 6) {
  const n = escapeRe(name);
  const re = new RegExp(
    `(if|while|assert)\\s*\\(.*(!\\s*${n}\\b|\\b${n}\\s*[!=]=\\s*NULL|NULL\\s*[!=]=\\s*${n}\\b|\\b${n}\\s*[!=]=\\s*0\\b|\\(\\s*${n}\\s*\\))|\\b${n}\\s*\\?|\\breturn\\s+${n}\\s*;`,
  );
  for (let k = from; k < Math.min(lines.length, from + window + 1); k++) if (re.test(lines[k])) return true;
  return false;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ruleUncheckedAlloc(file, lines, issues) {
  const re = /([A-Za-z_][\w.\->\[\]]*)\s*=\s*(?:\([^()]*\)\s*)?(malloc|calloc|realloc|strdup)\s*\(/;
  lines.forEach((l, k) => {
    // 已在条件里直接检查，如 if ((p = malloc(..)) == NULL)
    if (/\bif\s*\(\s*\(/.test(l) && /NULL|!/.test(l)) return;
    const m = l.match(re);
    if (!m) return;
    const name = m[1].replace(/^\*+/, '');
    // p = realloc(p, ...) 由 realloc-self-assign 规则专门报告，这里不重复
    if (m[2] === 'realloc' && new RegExp(`realloc\\s*\\(\\s*${escapeRe(name)}\\s*,`).test(l)) return;
    if (!hasNullCheck(lines, k, name)) {
      issues.push({
        rule: 'unchecked-alloc',
        severity: 'warning',
        file,
        line: k + 1,
        message: `${m[2]} 的返回值赋给了 ${name}，但后面没有检查它是否为 NULL。内存不足时 ${m[2]} 会返回 NULL，直接使用会导致空指针解引用。`,
      });
    }
  });
}

function ruleScanfReturn(file, lines, issues) {
  lines.forEach((l, k) => {
    // 语句以 scanf( 开头（返回值被丢弃）
    if (/^\s*(?:\(\s*void\s*\)\s*)?(scanf|fscanf|sscanf)\s*\(/.test(l) && !/\(\s*void\s*\)/.test(l)) {
      const fn = l.match(/(scanf|fscanf|sscanf)/)[1];
      issues.push({
        rule: 'scanf-return-unused',
        severity: 'warning',
        file,
        line: k + 1,
        message: `没有使用 ${fn} 的返回值。${fn} 返回成功读取的项数；如果输入格式不对或已经读到末尾，变量不会被赋值（仍是旧值或垃圾值）。建议写成 if (${fn}(...) != 期望个数) { 处理错误 }。`,
      });
    }
  });
}

function ruleGets(file, lines, issues) {
  lines.forEach((l, k) => {
    if (/\bgets\s*\(/.test(l)) {
      issues.push({
        rule: 'gets',
        severity: 'warning',
        file,
        line: k + 1,
        message: 'gets 无法限制读取长度，必然存在缓冲区溢出风险，已从 C11 标准中删除。请改用 fgets(buf, sizeof buf, stdin)。',
      });
    }
  });
}

function ruleScanfStringNoWidth(file, linesWithStrings, issues) {
  linesWithStrings.forEach((l, k) => {
    if (!/\b(scanf|fscanf|sscanf)\s*\(/.test(l)) return;
    const fmt = l.match(/"((?:[^"\\]|\\.)*)"/);
    if (!fmt) return;
    if (/%s|%\[/.test(fmt[1])) {
      issues.push({
        rule: 'scanf-unbounded-string',
        severity: 'warning',
        file,
        line: k + 1,
        message: '用 %s 读字符串时没有限制长度。输入比数组长就会越界写入。应写成 %99s 这样的形式（数字 = 数组长度 - 1）。',
      });
    }
  });
}

function ruleReallocSelf(file, lines, issues) {
  lines.forEach((l, k) => {
    const m = l.match(/([A-Za-z_][\w.\->]*)\s*=\s*(?:\([^()]*\)\s*)?realloc\s*\(\s*([A-Za-z_][\w.\->]*)\s*,/);
    if (m && m[1] === m[2]) {
      issues.push({
        rule: 'realloc-self-assign',
        severity: 'warning',
        file,
        line: k + 1,
        message: `${m[1]} = realloc(${m[1]}, ...) 写法有风险：realloc 失败返回 NULL 时，原来的指针被覆盖，原内存再也无法释放（内存泄漏）。应先用临时变量接收：tmp = realloc(${m[1]}, ...); if (tmp) ${m[1]} = tmp;`,
      });
    }
  });
}

/**
 * 未初始化变量：识别形如 `int x;` / `int a, b;` 的局部声明（缩进 > 0，在函数体内），
 * 如果在下一次"赋值 / 取地址 / 作为 scanf 参数"之前就被读取，则报告。
 * 只处理标量（不处理数组、指针、结构体），只看同一函数内声明后的 40 行。
 */
function ruleUninitialized(file, lines, issues) {
  const declRe = /^\s+(?:(?:unsigned|signed|long|short|const|volatile)\s+)*(int|char|short|long|float|double|unsigned|size_t|bool|_Bool)\s+([^;=(){}]+);\s*$/;
  lines.forEach((l, k) => {
    const m = l.match(declRe);
    if (!m) return;
    const names = m[2].split(',').map((s) => s.trim()).filter((s) => /^[A-Za-z_]\w*$/.test(s));
    for (const name of names) {
      if (C_KEYWORDS.has(name)) continue;
      const n = escapeRe(name);
      // 只有"纯赋值 x = ..."和"取地址 &x（交给 scanf 等函数写入）"算初始化；
      // x += 1、x++ 这类复合运算会先读取旧值，所以不算
      const written = new RegExp(`(&\\s*${n}\\b|\\b${n}\\s*=[^=])`);
      const readModify = new RegExp(`(\\b${n}\\s*(\\+\\+|--|[-+*/%&|^]=|<<=|>>=)|(\\+\\+|--)\\s*${n}\\b)`);
      const used = new RegExp(`\\b${n}\\b`);
      let depth = 0;
      for (let j = k + 1; j < Math.min(lines.length, k + 41); j++) {
        const t = lines[j];
        for (const ch of t) {
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
        }
        if (depth < 0) break; // 离开了声明所在的代码块
        if (!used.test(t)) continue;
        if (readModify.test(t) && !written.test(t)) {
          issues.push(uninit(file, j + 1, name));
          break;
        }
        if (written.test(t)) {
          // `x = x + 1` 这种：赋值右侧读取了自己
          const self = new RegExp(`\\b${n}\\s*=[^=].*\\b${n}\\b`);
          if (self.test(t) && !/&/.test(t)) {
            issues.push(uninit(file, j + 1, name));
          }
          break;
        }
        // 出现在控制流里（循环/分支）时，可能由其他路径赋值 → 为避免误报，不再继续判断
        if (/\b(if|for|while|switch)\b/.test(t) && !new RegExp(`\\(\\s*[^)]*\\b${n}\\b`).test(t)) break;
        issues.push(uninit(file, j + 1, name));
        break;
      }
    }
  });
}

function uninit(file, line, name) {
  return {
    rule: 'uninitialized',
    severity: 'warning',
    file,
    line,
    message: `变量 ${name} 在这里被读取时可能还没有赋值。局部变量不会自动初始化为 0，里面是不确定的值；读取它是未定义行为。声明时就初始化（如 int ${name} = 0;）是好习惯。`,
  };
}

function ruleFreeNoNull(file, lines, issues) {
  lines.forEach((l, k) => {
    const m = l.match(/\bfree\s*\(\s*([A-Za-z_]\w*)\s*\)\s*;/);
    if (!m) return;
    const name = m[1];
    // 只在指针之后仍被使用时报告（同函数内的后续 15 行）
    const n = escapeRe(name);
    for (let j = k + 1; j < Math.min(lines.length, k + 16); j++) {
      const t = lines[j];
      if (new RegExp(`\\b${n}\\s*=[^=]`).test(t)) return; // 重新赋值了
      if (/^\s*}\s*$/.test(t) && j === k + 1) return;
      if (new RegExp(`\\b${n}\\b`).test(t) && !new RegExp(`free\\s*\\(\\s*${n}\\s*\\)`).test(t)) {
        issues.push({
          rule: 'use-after-free',
          severity: 'warning',
          file,
          line: j + 1,
          message: `${name} 在第 ${k + 1} 行已经被 free，这里又使用了它。释放后的内存不能再访问；free 后立即写 ${name} = NULL; 可以让错误更容易被发现。`,
        });
        return;
      }
      if (new RegExp(`free\\s*\\(\\s*${n}\\s*\\)`).test(t)) {
        issues.push({
          rule: 'double-free',
          severity: 'warning',
          file,
          line: j + 1,
          message: `${name} 可能被重复 free（第 ${k + 1} 行已释放过）。重复释放是未定义行为。`,
        });
        return;
      }
    }
  });
}

function ruleAssignInCondition(file, lines, issues) {
  lines.forEach((l, k) => {
    // if (x = 5) 这种：条件里单个 = 且右边是常量
    const m = l.match(/\b(if|while)\s*\(\s*([A-Za-z_]\w*)\s*=\s*(-?\d+|'.')\s*\)/);
    if (m) {
      issues.push({
        rule: 'assign-in-condition',
        severity: 'warning',
        file,
        line: k + 1,
        message: `条件 (${m[2]} = ${m[3]}) 是赋值而不是比较。如果想判断是否相等，应写 ==。`,
      });
    }
  });
}

function ruleFopenUnchecked(file, lines, issues) {
  lines.forEach((l, k) => {
    const m = l.match(/([A-Za-z_]\w*)\s*=\s*fopen\s*\(/);
    if (m && !hasNullCheck(lines, k, m[1])) {
      issues.push({
        rule: 'unchecked-fopen',
        severity: 'warning',
        file,
        line: k + 1,
        message: `fopen 的返回值 ${m[1]} 没有检查是否为 NULL。文件不存在或没有权限时 fopen 返回 NULL，后续读写会崩溃。`,
      });
    }
  });
}
