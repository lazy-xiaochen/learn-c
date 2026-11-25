// 输出比对。
// 默认模式 "lines"：统一换行符，忽略每行末尾空白和文件末尾空行（与主流 OJ 一致）。
// 其他模式：
//   "exact"   逐字节一致（只统一 \r\n）
//   "tokens"  按空白切分后逐个比较
//   "float"   按 token 比较，数值 token 允许误差 eps（默认 1e-6，绝对或相对）

function normLines(s) {
  const lines = s.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, ''));
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/**
 * @returns {{ok: boolean, firstDiff?: {line:number, expected:string, actual:string}}}
 */
export function compareOutput(actual, expected, mode = 'lines', eps = 1e-6) {
  if (mode === 'exact') {
    const a = actual.replace(/\r\n?/g, '\n');
    const e = expected.replace(/\r\n?/g, '\n');
    if (a === e) return { ok: true };
    return { ok: false, firstDiff: firstLineDiff(a.split('\n'), e.split('\n')) };
  }
  if (mode === 'tokens' || mode === 'float') {
    const a = actual.split(/\s+/).filter(Boolean);
    const e = expected.split(/\s+/).filter(Boolean);
    const n = Math.max(a.length, e.length);
    for (let k = 0; k < n; k++) {
      const x = a[k];
      const y = e[k];
      if (x === y) continue;
      if (mode === 'float' && x !== undefined && y !== undefined) {
        const fx = Number(x);
        const fy = Number(y);
        if (Number.isFinite(fx) && Number.isFinite(fy)) {
          const diff = Math.abs(fx - fy);
          if (diff <= eps || diff <= eps * Math.abs(fy)) continue;
        }
      }
      return { ok: false, firstDiff: { token: k + 1, expected: y ?? '(没有了)', actual: x ?? '(没有了)' } };
    }
    return { ok: true };
  }
  const a = normLines(actual);
  const e = normLines(expected);
  if (a.length === e.length && a.every((l, k) => l === e[k])) return { ok: true };
  return { ok: false, firstDiff: firstLineDiff(a, e) };
}

function firstLineDiff(a, e) {
  const n = Math.max(a.length, e.length);
  for (let k = 0; k < n; k++) {
    if (a[k] !== e[k]) return { line: k + 1, expected: e[k] ?? '(没有这一行)', actual: a[k] ?? '(没有这一行)' };
  }
  return { line: n, expected: '', actual: '' };
}

/** 判断"只差空白"——用于给出"格式错误"提示（仍判 WA） */
export function onlyWhitespaceDiffers(actual, expected) {
  return compareOutput(actual, expected, 'tokens').ok;
}
