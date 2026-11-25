<script setup>
// 内存示意图：内容里的 ```memory 块是一张表，第一行是表头
import { computed } from 'vue';
import { renderInline } from '../lib/markdown.js';
const props = defineProps({ title: String, rows: Array });
const head = computed(() => props.rows[0] || []);
const body = computed(() => props.rows.slice(1));
</script>

<template>
  <figure class="mem">
    <figcaption><span class="tag tag-accent">内存图</span> {{ title }}</figcaption>
    <div class="wrap">
      <table>
        <thead>
          <tr><th v-for="(h, k) in head" :key="k" v-html="renderInline(h)"></th></tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in body" :key="i">
            <td v-for="(c, k) in r" :key="k" :class="{ first: k === 0 }" v-html="renderInline(c)"></td>
          </tr>
        </tbody>
      </table>
    </div>
  </figure>
</template>

<style scoped>
.mem { margin: 1em 0; padding: 12px; border: 1px dashed var(--border-strong); border-radius: var(--radius); background: var(--surface); }
figcaption { font-size: 14px; margin-bottom: 8px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.wrap { overflow-x: auto; }
table { border-collapse: separate; border-spacing: 0; font-family: var(--font-mono); font-size: 13px; }
th, td { padding: 6px 12px; border: 1px solid var(--border); text-align: left; white-space: nowrap; }
th { background: var(--surface-2); color: var(--text-muted); font-weight: 600; }
td { background: var(--code-bg); }
td.first { color: var(--accent); font-weight: 600; }
</style>
