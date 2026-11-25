// 与后端服务通信。界面运行在 Electron 沙箱里，只能通过 preload 暴露的 window.clearn.call 发请求。
export async function call(method, params) {
  if (!window.clearn) throw new Error('请在桌面应用中打开本页面（npm start）');
  try {
    // Vue 的响应式对象（Proxy）不能直接通过 IPC 传递，先转成普通对象
    const plain = params === undefined ? undefined : JSON.parse(JSON.stringify(params));
    return await window.clearn.call(method, plain);
  } catch (err) {
    // Electron 会把错误包装成 "Error invoking remote method 'clearn:call': Error: ..."
    const msg = String(err && err.message ? err.message : err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
    throw new Error(msg);
  }
}
