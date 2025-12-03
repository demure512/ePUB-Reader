import { app, BrowserWindow, Menu, shell, dialog, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 开发环境检测
const isDev = process.env.NODE_ENV === 'development';

// 保持对窗口对象的全局引用，如果不这么做的话，当JavaScript对象被垃圾回收的时候，窗口会自动关闭
let mainWindow;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false // 先不显示，等页面加载完成后再显示
  });

  // 加载应用
  if (isDev) {
    // 开发环境：尝试加载开发服务器
    console.log('Development mode: trying to load http://localhost:3000');
    
    mainWindow.loadURL('http://localhost:3000').catch(err => {
      console.error('Failed to load development server:', err);
      // 如果开发服务器不可用，加载测试页面
      console.log('Loading fallback test page...');
      mainWindow.loadFile(path.join(__dirname, '../test-simple.html'));
    });
    
    // 监听加载失败事件
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      if (validatedURL === 'http://localhost:3000/') {
        console.log('Development server not available, loading test page...');
        mainWindow.loadFile(path.join(__dirname, '../test-simple.html'));
      }
    });
    
    // 打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境：加载构建后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 当页面加载完成后显示窗口
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 如果是开发环境，聚焦到窗口
    if (isDev) {
      mainWindow.focus();
    }
  });

  // 当窗口被关闭时发出
  mainWindow.on('closed', () => {
    // 取消引用window对象，如果你的应用支持多窗口的话，通常会把多个window对象存放在一个数组里面，与此同时，你应该删除相应的元素。
    mainWindow = null;
  });

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 阻止导航到外部URL
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:3000' && parsedUrl.origin !== 'file://') {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  createWindow();

  // 在macOS上，当点击dock图标并且没有其他窗口打开时，通常会重新创建一个窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // 设置应用菜单
  createMenu();
});

// 当所有窗口都被关闭时退出应用
app.on('window-all-closed', () => {
  // 在macOS上，应用和它们的菜单栏通常会保持活跃状态，直到用户使用Cmd + Q显式退出
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 在这个文件中，你可以包含应用程序剩余的所有主进程代码。你也可以把它们放在单独的文件中然后在这里引入。

function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开书库',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('navigate-to', '/library');
          }
        },
        {
          label: '上传书籍',
          accelerator: 'CmdOrCtrl+U',
          click: () => {
            mainWindow.webContents.send('navigate-to', '/upload');
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: '切换开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '切换全屏', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: '关闭', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于简阅电子书库',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于',
              message: '简阅电子书库',
              detail: '极简电子书库，专注阅读本身\n版本: 1.0.0\n\n基于 Electron 和 Vue 3 构建'
            });
          }
        }
      ]
    }
  ];

  // macOS菜单调整
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { label: '关于 ' + app.getName(), role: 'about' },
        { type: 'separator' },
        { label: '服务', role: 'services', submenu: [] },
        { type: 'separator' },
        { label: '隐藏 ' + app.getName(), accelerator: 'Command+H', role: 'hide' },
        { label: '隐藏其他', accelerator: 'Command+Shift+H', role: 'hideothers' },
        { label: '显示全部', role: 'unhide' },
        { type: 'separator' },
        { label: '退出', accelerator: 'Command+Q', click: () => app.quit() }
      ]
    });

    // 窗口菜单
    template[4].submenu = [
      { label: '关闭', accelerator: 'CmdOrCtrl+W', role: 'close' },
      { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
      { label: '缩放', role: 'zoom' },
      { type: 'separator' },
      { label: '前置所有窗口', role: 'front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC 处理程序
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

// 处理应用程序协议（用于深度链接）
app.setAsDefaultProtocolClient('ebook-library');

// 处理协议URL（Windows/Linux）
app.on('second-instance', (event, commandLine, workingDirectory) => {
  // 当运行第二个实例时，将焦点放在主窗口上
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// 安全设置
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});