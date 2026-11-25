// 预加载脚本：只向页面暴露一个受限的调用接口，页面本身没有任何 Node.js 权限。
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clearn', {
  call: (method, params) => ipcRenderer.invoke('clearn:call', method, params),
});
