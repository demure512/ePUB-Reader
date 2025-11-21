import { contextBridge, ipcRenderer } from 'electron';

// 暴露受保护的方法给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 应用信息
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // 对话框
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  
  // 导航
  onNavigateTo: (callback) => {
    ipcRenderer.on('navigate-to', (event, route) => callback(route));
  },
  
  // 移除监听器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  // 平台信息
  platform: process.platform,
  
  // 检查是否在Electron环境中
  isElectron: true
});

// 安全设置：阻止Node.js API暴露
window.addEventListener('DOMContentLoaded', () => {
  // 移除可能暴露的Node.js全局变量
  delete window.require;
  delete window.exports;
  delete window.module;
});

// 控制台日志（仅在开发环境）
if (process.env.NODE_ENV === 'development') {
  console.log('Electron preload script loaded');
}