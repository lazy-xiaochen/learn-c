// 在页面渲染前应用保存的主题，避免亮色模式下先闪一下暗色
try {
  var t = localStorage.getItem('clearn-theme');
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
