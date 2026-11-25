// Electron 主进程：创建窗口，启动后端服务进程，在界面与后端之间转发请求。
//
// 进程结构：
//   界面（渲染进程，沙箱，无 Node 权限）
//     ⇅ IPC（只暴露一个 call(method, params) 接口，见 preload.cjs）
//   主进程（本文件）
//     ⇅ 消息
//   后端服务（utilityProcess，server/service.js：内容、学习记录、判题）
//     → runner.exe 沙箱（学习者的 C 程序，低完整性级别 + Job Object 资源限制）
import { app, BrowserWindow, ipcMain, utilityProcess, Menu, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const DEV_URL = process.env.VITE_DEV_SERVER_URL || null;
const INDEX_HTML = path.join(ROOT, 'dist', 'index.html');
const APP_URL = DEV_URL || pathToFileURL(INDEX_HTML).href;

if (process.env.CLEARN_DATA_DIR) app.setPath('userData', path.resolve(process.env.CLEARN_DATA_DIR));

if (!app.requestSingleInstanceLock()) {
  // 已经打开了一个窗口：两个实例同时写学习记录会互相覆盖
  app.quit();
}

let win = null;
let flushWaiter = null;

// ---------- 后端服务进程 ----------
let service = null;
let serviceReady = null;
let nextId = 1;
const pending = new Map();

function startService() {
  const child = utilityProcess.fork(path.join(ROOT, 'server', 'service.js'), [], {
    serviceName: 'c-learn 判题与数据服务',
    stdio: 'pipe',
  });
  child.stdout?.on('data', (d) => process.stdout.write(`[service] ${d}`));
  child.stderr?.on('data', (d) => process.stderr.write(`[service] ${d}`));
  serviceReady = new Promise((resolve, reject) => {
    child.on('message', (msg) => {
      if (msg.type === 'ready') return resolve();
      if (msg.type === 'init-error') return reject(new Error(msg.error));
      if (msg.type === 'flushed') return flushWaiter?.();
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      if (msg.ok) p.resolve(msg.result);
      else p.reject(new Error(msg.error));
    });
  });
  serviceReady.catch(() => {});
  child.on('exit', (code) => {
    for (const p of pending.values()) p.reject(new Error(`后端服务意外退出（代码 ${code}），已自动重启，请重试`));
    pending.clear();
    if (service === child && !quitting) {
      service = null;
      startService();
    }
  });
  child.postMessage({ type: 'init', dataDir: app.getPath('userData') });
  service = child;
}

async function callService(method, params) {
  await serviceReady;
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    service.postMessage({ id, method, params });
  });
}

// 只接受来自本应用页面的请求
function trustedSender(frame) {
  if (!frame) return false;
  const url = frame.url || '';
  return DEV_URL ? url.startsWith(DEV_URL) : url.startsWith(pathToFileURL(path.join(ROOT, 'dist')).href);
}

ipcMain.handle('clearn:call', async (e, method, params) => {
  if (!trustedSender(e.senderFrame)) throw new Error('拒绝来自未知页面的请求');
  if (typeof method !== 'string') throw new Error('请求格式不正确');
  return callService(method, params);
});

// ---------- 窗口 ----------
function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 360,
    minHeight: 560,
    show: false,
    backgroundColor: '#151619',
    title: 'C 语言学习平台',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(here, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  // 不允许页面跳转到应用以外的地址，也不允许弹出新窗口；外部 http(s) 链接用系统浏览器打开
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(APP_URL.split('#')[0])) e.preventDefault();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.once('ready-to-show', () => {
    if (!process.env.CLEARN_SELFTEST) win.show();
  });
  if (DEV_URL) win.loadURL(DEV_URL);
  // 界面自检时不显示欢迎弹窗（避免挡住自动化点击）；CLEARN_WELCOME_TEST=1 时仍显示，用于截图验证
  else if (process.env.CLEARN_SELFTEST && process.env.CLEARN_WELCOME_TEST !== '1') win.loadFile(INDEX_HTML, { search: 'selftest=1' });
  else win.loadFile(INDEX_HTML);

  if (process.env.CLEARN_SELFTEST) {
    win.webContents.once('did-finish-load', async () => {
      const { runSelftest } = await import(pathToFileURL(path.resolve(process.env.CLEARN_SELFTEST)).href);
      let code = 0;
      try {
        code = (await runSelftest({ win, app, callService })) ? 0 : 1;
      } catch (err) {
        console.error(err);
        code = 1;
      }
      app.exit(code);
    });
  }
}

let quitting = false;
app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  startService();
  createWindow();
});

// 退出前让后端把还没写盘的学习记录（例如代码草稿）写入文件，最多等 1.5 秒
let flushedOnQuit = false;
app.on('before-quit', (e) => {
  if (flushedOnQuit || !service) return;
  e.preventDefault();
  quitting = true;
  const done = () => {
    if (flushedOnQuit) return;
    flushedOnQuit = true;
    app.quit();
  };
  flushWaiter = done;
  setTimeout(done, 1500);
  try {
    service.postMessage({ type: 'flush' });
  } catch {
    done();
  }
});

app.on('window-all-closed', () => app.quit());
