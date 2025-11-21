import { spawn } from 'child_process';
import { createServer } from 'vite';
import electron from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let electronProcess = null;
let manualRestart = false;

async function startVite() {
  const server = await createServer({
    // 任何有效的用户配置选项，加上 `mode` 和 `configFile`
    configFile: path.resolve(__dirname, '../vite.config.js'),
    root: path.resolve(__dirname, '..'),
    server: {
      port: 3000
    }
  });
  
  await server.listen();
  console.log('Vite dev server started on http://localhost:3000');
  return server;
}

function startElectron() {
  const args = [
    '--inspect=5858',
    path.join(__dirname, '../electron/main.js')
  ];

  // 设置环境变量
  const env = Object.create(process.env);
  env.NODE_ENV = 'development';

  electronProcess = spawn(electron, args, { 
    env,
    stdio: 'inherit'
  });

  electronProcess.on('close', () => {
    if (!manualRestart) {
      process.exit();
    }
  });
}

function restartElectron() {
  manualRestart = true;
  if (electronProcess) {
    electronProcess.kill();
  }
  setTimeout(() => {
    manualRestart = false;
    startElectron();
  }, 1000);
}

async function init() {
  try {
    // 启动 Vite 开发服务器
    const server = await startVite();
    
    // 等待服务器完全启动
    setTimeout(() => {
      startElectron();
    }, 2000);

    // 监听主进程文件变化
    const { default: chokidar } = await import('chokidar');
    const watcher = chokidar.watch([
      path.join(__dirname, '../electron/**/*.js'),
    ]);
    
    watcher.on('change', () => {
      console.log('Electron main process file changed, restarting...');
      restartElectron();
    });

    process.on('SIGINT', () => {
      if (electronProcess) {
        electronProcess.kill();
      }
      server.close();
      process.exit();
    });

  } catch (error) {
    console.error('Error starting development environment:', error);
    process.exit(1);
  }
}

init();