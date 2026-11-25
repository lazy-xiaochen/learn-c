<script setup>
// 渲染讲解 Markdown；可运行代码块和内存图替换成交互组件
import { computed } from 'vue';
import { renderChunks } from '../lib/markdown.js';
import RunBlock from './RunBlock.vue';
import MemoryDiagram from './MemoryDiagram.vue';

const props = defineProps({
  markdown: { type: String, required: true },
  lessonId: { type: String, default: '' },
  runBlocks: { type: Array, default: () => [] }, // 本段落里的可运行代码块（按出现顺序）
});
const chunks = computed(() => renderChunks(props.markdown));
</script>

<template>
  <div class="prose">
    <template v-for="(c, k) in chunks" :key="k">
      <div v-if="c.type === 'html'" v-html="c.html"></div>
      <RunBlock v-else-if="c.type === 'run' && runBlocks[c.index]" :lesson-id="lessonId" :block="runBlocks[c.index]" />
      <MemoryDiagram v-else-if="c.type === 'memory'" :title="c.title" :rows="c.rows" />
    </template>
  </div>
</template>
