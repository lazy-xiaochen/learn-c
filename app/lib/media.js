import { ref, onMounted, onBeforeUnmount } from 'vue';

/** 响应式媒体查询，例如 useMedia('(max-width: 1023px)') */
export function useMedia(query) {
  const mq = window.matchMedia(query);
  const matches = ref(mq.matches);
  const onChange = (e) => (matches.value = e.matches);
  onMounted(() => mq.addEventListener('change', onChange));
  onBeforeUnmount(() => mq.removeEventListener('change', onChange));
  return matches;
}
