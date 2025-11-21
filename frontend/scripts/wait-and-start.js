import { spawn } from 'child_process';
import http from 'http';

console.log('Waiting for Vite dev server to be ready...');

// 检查服务器是否可用的函数
function checkServer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    function check() {
      const req = http.get(url, (res) => {
        console.log(`✅ Server is ready at ${url}`);
        resolve(true);
      });
      
      req.on('error', (err) => {
        if (Date.now() - startTime > timeout) {
          console.error(`❌ Timeout waiting for server at ${url}`);
          reject(new Error(`Timeout waiting for ${url}`));
          return;
        }
        
        // 服务器还没准备好，等待1秒后重试
        setTimeout(check, 1000);
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        if (Date.now() - startTime <= timeout) {
          setTimeout(check, 1000);
        }
      });
    }
    
    check();
  });
}

// 启动Electron
function startElectron() {
  console.log('Starting Electron...');
  
  const electronCmd = process.platform === 'win32' ? 'electron.cmd' : 'electron';
  
  const electronProcess = spawn(electronCmd, ['.'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });
  
  electronProcess.on('error', (error) => {
    console.error('Failed to start Electron:', error);
  });
  
  return electronProcess;
}

// 主逻辑
async function main() {
  try {
    // 等待服务器准备就绪
    await checkServer('http://localhost:3000');
    
    // 启动Electron
    const electronProcess = startElectron();
    
    // 处理进程退出
    process.on('SIGINT', () => {
      console.log('Shutting down...');
      electronProcess.kill('SIGINT');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('Shutting down...');
      electronProcess.kill('SIGTERM');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start:', error.message);
    console.log('Starting Electron anyway (will show test page if dev server is not available)...');
    startElectron();
  }
}

main();