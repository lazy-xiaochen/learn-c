// 通用 Markdown 解析工具：把内容源文件拆成"标题树 + 代码块"。
// 只实现内容格式需要的子集：ATX 标题（## / ###）、围栏代码块（``` 或 ````）、front matter。

/** 解析代码块信息串：`c run id=demo stdin="1 2"` → { lang: 'c', attrs: { run: true, id: 'demo', stdin: '1 2' } } */
export function parseInfo(info) {
  const s = info.trim();
  const m = s.match(/^(\S*)\s*(.*)$/);
  const lang = m ? m[1] : '';
  const attrs = {};
  const re = /([\w-]+)(?:=(?:"((?:[^"\\]|\\.)*)"|(\S+)))?/g;
  let a;
  while ((a = re.exec(m ? m[2] : ''))) {
    const key = a[1];
    if (a[2] !== undefined) attrs[key] = a[2].replace(/\\"/g, '"');
    else if (a[3] !== undefined) attrs[key] = a[3];
    else attrs[key] = true;
  }
  return { lang, attrs };
}

/** 把属性里的转义（\n \t \\）还原成真实字符，用于 stdin 等属性 */
export function unescapeAttr(s) {
  return String(s).replace(/\\(n|t|\\)/g, (_, c) => (c === 'n' ? '\n' : c === 't' ? '\t' : '\\'));
}

/**
 * 把文本切成节点序列：{ type:'heading', level, text, line } | { type:'code', lang, attrs, info, body, line } | { type:'text', text, line }
 */
export function tokenize(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const nodes = [];
  let buf = [];
  let bufLine = 1;
  const flush = () => {
    if (buf.length) nodes.push({ type: 'text', text: buf.join('\n'), line: bufLine });
    buf = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const fence = l.match(/^(`{3,})(.*)$/);
    if (fence) {
      flush();
      const close = fence[1];
      const start = i;
      const body = [];
      i++;
      while (i < lines.length && !(lines[i].startsWith(close) && lines[i].slice(close.length).trim() === '')) {
        body.push(lines[i]);
        i++;
      }
      if (i >= lines.length) throw new Error(`第 ${start + 1} 行的代码块没有闭合`);
      const { lang, attrs } = parseInfo(fence[2]);
      nodes.push({ type: 'code', lang, attrs, info: fence[2].trim(), body: body.join('\n'), raw: lines.slice(start, i + 1).join('\n'), line: start + 1 });
      bufLine = i + 2;
      continue;
    }
    const h = l.match(/^(#{1,6})\s+(.*?)\s*$/);
    if (h) {
      flush();
      nodes.push({ type: 'heading', level: h[1].length, text: h[2], line: i + 1 });
      bufLine = i + 2;
      continue;
    }
    if (!buf.length) bufLine = i + 1;
    buf.push(l);
  }
  flush();
  return nodes;
}

/** 分离 front matter：`---json ... ---`（JSON）或 `--- ... ---`（key: value） */
export function splitFrontMatter(text) {
  const t = text.replace(/\r\n?/g, '\n').replace(/^﻿/, '');
  const m = t.match(/^---(json)?\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error('缺少 front matter（文件开头的 --- ... --- 块）');
  let meta;
  if (m[1]) {
    try {
      meta = JSON.parse(m[2]);
    } catch (e) {
      throw new Error(`front matter JSON 解析失败：${e.message}`);
    }
  } else {
    meta = {};
    for (const line of m[2].split('\n')) {
      const kv = line.match(/^(\w+)\s*:\s*(.*)$/);
      if (kv) meta[kv[1]] = kv[2].trim();
    }
  }
  const offset = t.slice(0, m[0].length).split('\n').length - 1;
  return { meta, body: t.slice(m[0].length), lineOffset: offset };
}

/**
 * 按标题层级组织为树：返回二级标题（##）组成的 sections，每个 section 含 nodes 和三级子节 subsections。
 * section: { title, line, nodes, subsections: [{ title, line, nodes }] }
 */
export function sectionize(nodes) {
  const sections = [];
  let cur = null;
  let sub = null;
  for (const n of nodes) {
    if (n.type === 'heading' && n.level === 2) {
      cur = { title: n.text, line: n.line, nodes: [], subsections: [] };
      sub = null;
      sections.push(cur);
    } else if (n.type === 'heading' && n.level === 3 && cur) {
      sub = { title: n.text, line: n.line, nodes: [] };
      cur.subsections.push(sub);
      cur.nodes.push(n);
    } else if (cur) {
      cur.nodes.push(n);
      if (sub) sub.nodes.push(n);
    }
  }
  return sections;
}

/** 把节点还原为 Markdown 文本 */
export function nodesToMarkdown(nodes) {
  return nodes
    .map((n) => (n.type === 'heading' ? `${'#'.repeat(n.level)} ${n.text}` : n.type === 'code' ? n.raw : n.text))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function textOf(nodes) {
  return nodes.filter((n) => n.type === 'text').map((n) => n.text).join('\n').trim();
}

/** 收集一组节点里的代码文件：lang 为 c/h 且带 file= 属性的代码块 → { 文件名: 内容 } */
export function collectFiles(nodes, filter = () => true) {
  const files = {};
  for (const n of nodes) {
    if (n.type === 'code' && n.attrs.file && filter(n)) {
      if (files[n.attrs.file] !== undefined) throw new Error(`第 ${n.line} 行：文件 ${n.attrs.file} 重复出现`);
      files[n.attrs.file] = n.body.endsWith('\n') ? n.body : n.body + '\n';
    }
  }
  return files;
}
