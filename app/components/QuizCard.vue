<script setup>
// 客观题：作答后由后端判分，并给出每个选项的解析（需求 3.2：每个选项都要有解析）
import { ref, computed } from 'vue';
import { call } from '../lib/api.js';
import { renderInline, renderHtml } from '../lib/markdown.js';
import { SPECIAL_NAME } from '../lib/constants.js';
import DifficultyBadge from './DifficultyBadge.vue';

const props = defineProps({
  quiz: { type: Object, required: true },
  state: { type: Object, default: null }, // 之前的作答记录
  index: { type: Number, default: 1 },
});
const emit = defineEmits(['answered']);

const multiple = computed(() => props.quiz.type === 'multiple');
const picked = ref(new Set(props.state?.correct && Array.isArray(props.state.given) ? props.state.given : []));
const review = ref(props.state?.review || null);
const correct = ref(props.state?.correct ?? null);
const busy = ref(false);
const done = computed(() => correct.value === true);

function toggle(k) {
  if (done.value) return;
  if (review.value) {
    review.value = null; // 答错后修改选项：清除上次的解析，重新作答
    correct.value = null;
  }
  const s = new Set(multiple.value ? picked.value : []);
  if (s.has(k)) s.delete(k);
  else s.add(k);
  picked.value = s;
}

async function submit() {
  if (!picked.value.size || busy.value) return;
  busy.value = true;
  try {
    const given = [...picked.value].sort((a, b) => a - b);
    const r = await call('answerQuiz', { quizId: props.quiz.id, given: multiple.value ? given : given[0] });
    review.value = r.review;
    correct.value = r.correct;
    emit('answered', r);
  } finally {
    busy.value = false;
  }
}

function optClass(k) {
  if (!review.value) return { picked: picked.value.has(k) };
  const o = review.value.options[k];
  if (!o) return { picked: picked.value.has(k) };
  return { picked: picked.value.has(k), right: o.correct && review.value.full, wrong: picked.value.has(k) && !o.correct };
}
</script>

<template>
  <section class="quiz card" :data-quiz="quiz.id">
    <header class="qhead">
      <span class="qn">第 {{ index }} 题 · {{ multiple ? '多选' : '单选' }}</span>
      <DifficultyBadge :level="quiz.difficulty" short />
      <span v-if="quiz.special" class="tag tag-amber">{{ SPECIAL_NAME[quiz.special] || quiz.special }}</span>
      <span v-if="done" class="tag tag-ok">已完成</span>
    </header>
    <div class="stem prose" v-html="renderHtml(quiz.stem)"></div>
    <ul class="opts" :role="multiple ? 'group' : 'radiogroup'" :aria-label="`第 ${index} 题的选项`">
      <li v-for="(o, k) in quiz.options" :key="k">
        <button
          type="button"
          class="opt"
          :class="optClass(k)"
          :role="multiple ? 'checkbox' : 'radio'"
          :aria-checked="picked.has(k)"
          :disabled="done"
          @click="toggle(k)"
        >
          <span class="mark mono">{{ String.fromCharCode(65 + k) }}</span>
          <span class="otext prose" v-html="renderInline(o.text)"></span>
        </button>
        <p v-if="review && review.options[k]" class="why" :class="review.options[k].correct ? 'ok' : 'no'">
          <strong>{{ review.options[k].correct ? '正确' : '错误' }}：</strong><span v-html="renderInline(review.options[k].explanation)"></span>
        </p>
      </li>
    </ul>
    <footer class="qfoot">
      <button v-if="!done" type="button" class="btn btn-primary btn-sm" :disabled="!picked.size || busy" @click="submit">提交答案</button>
      <span v-if="correct === true" class="res ok">回答正确</span>
      <span v-else-if="correct === false" class="res no">回答错误。看看你所选选项的解析，修改后再提交</span>
    </footer>
    <div v-if="review?.explanation" class="prose extra" v-html="renderHtml(review.explanation)"></div>
  </section>
</template>

<style scoped>
.quiz { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.qhead { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.qn { font-weight: 700; font-size: 14px; }
.opts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.opt { width: 100%; display: flex; gap: 10px; align-items: flex-start; text-align: left; padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface-2); cursor: pointer; }
.opt:hover:not(:disabled) { border-color: var(--border-strong); }
.opt:disabled { cursor: default; }
.opt.picked { border-color: var(--accent); background: var(--accent-soft); }
.opt.right { border-color: var(--ok); }
.opt.wrong { border-color: var(--err); background: var(--err-soft); }
.mark { flex: none; width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; border: 1px solid var(--border-strong); font-size: 12px; margin-top: 2px; }
.picked .mark { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
.otext { font-size: 15px; }
.why { margin: 4px 0 0 32px; font-size: 14px; }
.why.ok strong { color: var(--ok); }
.why.no strong { color: var(--text-muted); }
.qfoot { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.res { font-size: 14px; font-weight: 600; }
.res.ok { color: var(--ok); }
.res.no { color: var(--err); }
.extra { font-size: 14px; }
</style>
