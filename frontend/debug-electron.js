import { spawn } from 'child_process';

console.log('Testing Electron installation...');
console.log('Platform:', process.platform);
console.log('Node version:', process.version);

// 测试electron命令是否可用
const electronCmd = process.platform === 'win32' ? 'electron.cmd' : 'electron';

console.log(`Trying to run: ${electronCmd} --version`);

const testProcess = spawn(electronCmd, ['--version'], {
  stdio: 'pipe',
  shell: true
});

testProcess.stdout.on('data', (data) => {
  console.log('Electron version:', data.toString().trim());
});

testProcess.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

testProcess.on('close', (code) => {
  console.log(`Electron version check exited with code ${code}`);
  
  if (code === 0) {
    console.log('✅ Electron is properly installed');
    console.log('Now testing main.js...');
    
    // 测试主文件
    const mainProcess = spawn(electronCmd, ['electron/main.js'], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    });
    
    mainProcess.on('error', (error) => {
      console.error('❌ Failed to start main.js:', error);
    });
    
  } else {
    console.log('❌ Electron is not properly installed or accessible');
  }
});

testProcess.on('error', (error) => {
  console.error('❌ Failed to run electron command:', error);
  console.log('Please make sure electron is installed: npm install electron');
});