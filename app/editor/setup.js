// CodeMirror 6 编辑器配置：C 语法高亮、行号、Tab 缩进、括号匹配、自动补全、错误行标记。
// 颜色全部取自 CSS 变量，所以切换亮色/暗色时编辑器自动跟随，不需要重建。
import { EditorState, Compartment } from '@codemirror/state';
import {
  EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection,
  highlightSpecialChars, placeholder as placeholderExt,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { indentOnInput, bracketMatching, syntaxHighlighting, HighlightStyle, indentUnit } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { lintGutter, setDiagnostics } from '@codemirror/lint';
import { cpp } from '@codemirror/lang-cpp';
import { tags as t } from '@lezer/highlight';
import { cCompletionSource } from './completions.js';

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.modifier], color: 'var(--tok-keyword)' },
  { tag: [t.typeName, t.standard(t.typeName)], color: 'var(--tok-type)' },
  { tag: [t.string, t.character, t.special(t.string)], color: 'var(--tok-string)' },
  { tag: [t.number, t.bool, t.null], color: 'var(--tok-number)' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--tok-comment)', fontStyle: 'italic' },
  { tag: [t.processingInstruction, t.meta], color: 'var(--tok-meta)' },
  { tag: [t.function(t.variableName), t.function(t.definition(t.variableName))], color: 'var(--tok-func)' },
  { tag: t.macroName, color: 'var(--tok-meta)' },
]);

const theme = EditorView.theme({
  '&': {
    color: 'var(--text)',
    backgroundColor: 'var(--code-bg)',
    fontSize: '14px',
    height: '100%',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.6',
  },
  '.cm-content': { caretColor: 'var(--accent)', padding: '8px 0' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
  '&.cm-focused': { outline: 'none' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'var(--accent-soft) !important' },
  '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--surface-2) 60%, transparent)' },
  '.cm-gutters': { backgroundColor: 'var(--code-bg)', color: 'var(--text-muted)', border: 'none', borderRight: '1px solid var(--border)' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--surface-2)', color: 'var(--text)' },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 10px 0 12px', minWidth: '36px' },
  '.cm-matchingBracket': { backgroundColor: 'var(--accent-soft)', outline: '1px solid var(--accent)' },
  '.cm-selectionMatch': { backgroundColor: 'var(--surface-3)' },
  '.cm-tooltip': { backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', color: 'var(--text)', borderRadius: '6px' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--accent)', color: 'var(--on-accent)' },
  '.cm-completionDetail': { color: 'var(--text-muted)', fontStyle: 'normal', marginLeft: '8px' },
  '.cm-completionInfo': { padding: '4px 8px' },
  '.cm-placeholder': { color: 'var(--text-muted)' },
  '.cm-lintRange-error': { backgroundImage: 'none', textDecoration: 'underline wavy var(--err)', textUnderlineOffset: '3px' },
  '.cm-lintRange-warning': { backgroundImage: 'none', textDecoration: 'underline wavy var(--warn)', textUnderlineOffset: '3px' },
  '.cm-diagnostic-error': { borderLeftColor: 'var(--err)' },
  '.cm-diagnostic-warning': { borderLeftColor: 'var(--warn)' },
  '.cm-panels': { backgroundColor: 'var(--surface)', color: 'var(--text)' },
  '.cm-textfield': { backgroundColor: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--text)' },
  '.cm-button': { backgroundImage: 'none', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--text)' },
});

/**
 * @param {object} o
 * @param {string} o.doc
 * @param {boolean} [o.readOnly]
 * @param {(doc:string)=>void} [o.onChange]
 * @param {()=>void} [o.onRun]      Ctrl+Enter
 * @param {()=>void} [o.onSubmit]   Ctrl+Shift+Enter
 */
export function createEditorState({ doc, readOnly = false, onChange, onRun, onSubmit, placeholder }) {
  const readOnlyConf = new Compartment();
  const runKeys = keymap.of([
    { key: 'Mod-Enter', run: () => (onRun ? (onRun(), true) : false), preventDefault: true },
    { key: 'Mod-Shift-Enter', run: () => (onSubmit ? (onSubmit(), true) : false), preventDefault: true },
  ]);
  const state = EditorState.create({
    doc,
    extensions: [
      runKeys,
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      drawSelection(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      autocompletion({ override: [cCompletionSource], activateOnTyping: true, icons: false }),
      highlightActiveLine(),
      highlightSelectionMatches(),
      lintGutter(),
      cpp(),
      indentUnit.of('    '),
      EditorState.tabSize.of(4),
      syntaxHighlighting(highlight),
      theme,
      placeholder ? placeholderExt(placeholder) : [],
      // Tab 缩进；按 Esc 后再按 Tab 可以把焦点移出编辑器（键盘可访问性）
      keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...completionKeymap, indentWithTab]),
      readOnlyConf.of([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
      EditorView.updateListener.of((u) => {
        if (u.docChanged && onChange) onChange(u.state.doc.toString());
      }),
      EditorView.contentAttributes.of({ 'aria-label': 'C 代码编辑器' }),
    ],
  });
  return { state, readOnlyConf };
}

/** 把编译器诊断（行号从 1 开始）显示为编辑器里的错误标记 */
export function showDiagnostics(view, diags) {
  const doc = view.state.doc;
  const list = [];
  for (const d of diags || []) {
    if (!d.line || d.line < 1 || d.line > doc.lines) continue;
    const line = doc.line(d.line);
    const col = Math.max(1, d.column || 1);
    const from = Math.min(line.to, line.from + col - 1);
    // 标记从出错列到这一行的末尾（至少一个字符）
    const to = Math.max(Math.min(line.to, from + 1), line.to);
    list.push({
      from: from === to && from > line.from ? from - 1 : from,
      to,
      severity: d.level === 'warning' ? 'warning' : 'error',
      message: d.hint ? `${d.message}\n${d.hint}` : d.message,
    });
  }
  view.dispatch(setDiagnostics(view.state, list));
}

export { EditorView };
