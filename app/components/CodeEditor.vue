<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { EditorView, createEditorState, showDiagnostics } from '../editor/setup.js';

const props = defineProps({
  modelValue: { type: String, default: '' },
  readOnly: { type: Boolean, default: false },
  diagnostics: { type: Array, default: () => [] },
  placeholder: { type: String, default: '' },
});
const emit = defineEmits(['update:modelValue', 'run', 'submit']);

const host = ref(null);
let view = null;

onMounted(() => {
  const { state } = createEditorState({
    doc: props.modelValue,
    readOnly: props.readOnly,
    placeholder: props.placeholder,
    onChange: (doc) => emit('update:modelValue', doc),
    onRun: () => emit('run'),
    onSubmit: () => emit('submit'),
  });
  view = new EditorView({ state, parent: host.value });
  host.value.__cmView = view; // 供自检脚本设置编辑器内容
  if (props.diagnostics.length) showDiagnostics(view, props.diagnostics);
});

onBeforeUnmount(() => {
  view?.destroy();
  view = null;
});

// 外部替换代码（重置、切换文件、载入历史提交）
watch(
  () => props.modelValue,
  (v) => {
    if (view && v !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v } });
    }
  },
);

watch(
  () => props.diagnostics,
  (d) => view && showDiagnostics(view, d),
);

defineExpose({
  focus: () => view?.focus(),
  /** 跳到某一行并选中（点击编译错误时使用） */
  gotoLine(line) {
    if (!view) return;
    const doc = view.state.doc;
    const l = doc.line(Math.max(1, Math.min(doc.lines, line)));
    view.dispatch({ selection: { anchor: l.from, head: l.to }, scrollIntoView: true });
    view.focus();
  },
});
</script>

<template>
  <div ref="host" class="code-editor" :class="{ readonly: readOnly }"></div>
</template>

<style scoped>
.code-editor {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.code-editor :deep(.cm-editor) {
  height: 100%;
}
.code-editor.readonly :deep(.cm-activeLine) {
  background: transparent;
}
</style>
