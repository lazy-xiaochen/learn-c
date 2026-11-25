// C 源码文本工具：在不改变行号/列号的前提下去掉注释、字符串内容。
// 供安全检查和静态规则扫描使用，避免把注释或字符串里的文字误判为代码。

/**
 * 把注释替换为空格（保留换行），可选地把字符串/字符字面量的内容也替换为空格。
 * 返回的字符串与原文长度相同、换行位置相同，所以行号可以直接对应。
 * @param {string} src
 * @param {{blankStrings?: boolean}} [opts]
 */
export function stripCode(src, { blankStrings = true } = {}) {
  const out = src.split('');
  const n = src.length;
  let i = 0;
  const blank = (from, to) => {
    for (let k = from; k < to; k++) if (out[k] !== '\n' && out[k] !== '\r') out[k] = ' ';
  };
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') {
      let j = i + 2;
      while (j < n && src[j] !== '\n') j++;
      blank(i, j);
      i = j;
    } else if (c === '/' && d === '*') {
      let j = i + 2;
      while (j < n && !(src[j] === '*' && src[j + 1] === '/')) j++;
      j = Math.min(n, j + 2);
      blank(i, j);
      i = j;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== '\n') {
        if (src[j] === '\\') j++;
        j++;
      }
      // j 指向结束引号（或行尾，表示未闭合）
      if (blankStrings) blank(i + 1, Math.min(j, n));
      i = Math.min(n, j + 1);
    } else {
      i++;
    }
  }
  return out.join('');
}

/** 由字符偏移量求 1 开始的行号 */
export function lineOf(text, offset) {
  let line = 1;
  for (let k = 0; k < offset && k < text.length; k++) if (text[k] === '\n') line++;
  return line;
}

/** 生成按行切分的数组（统一换行符） */
export function splitLines(text) {
  return text.replace(/\r\n?/g, '\n').split('\n');
}
