import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 启动Electron应用
function startElectron() {
  console.log('Starting Electron application...');
  
  const mainPath = path.join(__dirname, '../electron/main.js');
  
  // 在Windows上使用.cmd扩展名
  const electronCmd = process.platform === 'win32' ? 'electron.cmd' : 'electron';
  
  console.log(`Using electron command: ${electronCmd}`);
  console.log(`Main file path: ${mainPath}`);
  
  const electronProcess = spawn(electronCmd, [mainPath], {
    stdio: 'inherit',
    shell: true, // 在Windows上需要shell
    env: {
      ...process.env,
      NODE_ENV: 'development',
      ELECTRON_IS_DEV: 'true'
    }
  });

  electronProcess.on('close', (code) => {
    console.log(`Electron process exited with code ${code}`);
    process.exit(code);
  });

  electronProcess.on('error', (error) => {
    console.error('Failed to start Electron:', error);
    process.exit(1);
  });

  // 处理进程退出
  process.on('SIGINT', () => {
    console.log('Received SIGINT, closing Electron...');
    electronProcess.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, closing Electron...');
    electronProcess.kill('SIGTERM');
  });
}

startElectron();