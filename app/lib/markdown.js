// 把讲解 / 题面的 Markdown 渲染成"片段列表"：普通 HTML、可运行代码块、内存图。
// 不允许内容中的原始 HTML（html: false），所有文本都会被转义。
import MarkdownIt from 'markdown-it';
import { highlightCode, classHighlighter } from '@lezer/highlight';
import { parser as cppParser } from '@lezer/cpp';

const md = new MarkdownIt({ html: false, linkify: false, typographer: false });

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function highlightC(code) {
  let html = '';
  highlightCode(
    code,
    cppParser.parse(code),
    classHighlighter,
    (text, classes) => {
      html += classes ? `<span class="${classes}">${escapeHtml(text)}</span>` : escapeHtml(text);
    },
    () => {
      html += '\n';
    },
  );
  return html;
}

md.renderer.rules.fence = (tokens, idx) => {
  const t = tokens[idx];
  const lang = t.info.trim().split(/\s+/)[0];
  const body = lang === 'c' ? highlightC(t.content.replace(/\n$/, '')) : escapeHtml(t.content.replace(/\n$/, ''));
  const label = lang === 'bash' ? '<span class="code-label">命令行</span>' : lang === 'output' ? '<span class="code-label">输出</span>' : '';
  return `<pre class="code-${lang || 'text'}">${label}<code>${body}</code></pre>\n`;
};
// 表格放进可横向滚动的容器，避免窄屏时撑破页面
md.renderer.rules.table_open = () => '<div class="table-wrap"><table>\n';
md.renderer.rules.table_close = () => '</table></div>\n';

export function renderInline(text) {
  return md.renderInline(text || '');
}

export function renderHtml(text) {
  return md.render(text || '');
}

function parseAttrs(info) {
  const attrs = {};
  for (const m of info.matchAll(/(\w+)=("([^"]*)"|\S+)/g)) attrs[m[1]] = m[3] !== undefined ? m[3] : m[2];
  return attrs;
}

/**
 * @returns {Array<{type:'html', html:string} | {type:'run', index:number} | {type:'memory', title:string, rows:string[][]}>}
 *   run 片段的 index 是该段落里第几个可运行代码块（从 0 开始）
 */
export function renderChunks(markdown) {
  const tokens = md.parse(markdown || '', {});
  const chunks = [];
  let buf = [];
  let runIndex = 0;
  const flush = () => {
    if (buf.length) chunks.push({ type: 'html', html: md.renderer.render(buf, md.options, {}) });
    buf = [];
  };
  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k];
    if (t.type === 'fence') {
      const info = t.info.trim();
      const lang = info.split(/\s+/)[0];
      const second = info.split(/\s+/)[1];
      if (lang === 'c' && second === 'run') {
        flush();
        chunks.push({ type: 'run', index: runIndex++ });
        // 紧跟在可运行代码块后面的 ```output 是"参考输出"，由运行组件展示
        if (tokens[k + 1] && tokens[k + 1].type === 'fence' && tokens[k + 1].info.trim().split(/\s+/)[0] === 'output') k++;
        continue;
      }
      if (lang === 'memory') {
        flush();
        const rows = t.content
          .replace(/\n$/, '')
          .split('\n')
          .filter((l) => l.trim())
          .map((l) => l.split('|').map((c) => c.trim()));
        chunks.push({ type: 'memory', title: parseAttrs(info).title || '内存示意图', rows });
        continue;
      }
    }
    buf.push(t);
  }
  flush();
  return chunks;
}
