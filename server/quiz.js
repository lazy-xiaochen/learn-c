// 客观题判分（内容校验脚本和后端服务共用）
export function gradeQuiz(q, given) {
  if (q.type === 'fill') {
    const norm = (s) => String(s).trim().replace(/\s+/g, ' ').toLowerCase();
    return q.answer.some((a) => norm(a) === norm(given));
  }
  const g = [...new Set((Array.isArray(given) ? given : [given]).map(Number))].sort((a, b) => a - b);
  return g.length === q.answer.length && g.every((v, k) => v === q.answer[k]);
}
