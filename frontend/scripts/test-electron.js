import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 简单的测试窗口
function createTestWindow() {
  const testWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../electron/preload.js')
    }
  });

  // 加载测试页面
  testWindow.loadFile(path.join(__dirname, '../test-simple.html'));
  
  // 打开开发者工具
  testWindow.webContents.openDevTools();

  return testWindow;
}

app.whenReady().then(() => {
  console.log('Electron test app starting...');
  createTestWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createTestWindow();
  }
});