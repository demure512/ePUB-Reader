# 简阅电子书库 - Electron 桌面应用

这是一个基于 Electron 的桌面电子书阅读应用，支持 EPUB 和 TXT 格式的电子书。

## 功能特性

- 📚 支持 EPUB 和 TXT 格式电子书
- 🎨 极简黑白主题设计
- 📖 智能目录解析和导航
- 💾 自动保存阅读进度
- 🔍 书籍搜索和分类管理
- ⚡ 快速响应的阅读体验
- 🖥️ 跨平台桌面应用支持

## 系统要求

- Windows 10/11, macOS 10.14+, 或 Linux (Ubuntu 18.04+)
- Node.js 16.0+ (仅开发环境需要)

## 开发环境设置

### 1. 安装依赖

由于您选择手动下载依赖，请确保安装以下 npm 包：

```bash
# 核心依赖
npm install vue@^3.5.17 vue-router@^4.5.1 pinia@^2.3.1
npm install axios@^1.10.0 epubjs@^0.3.93

# 开发依赖
npm install --save-dev @vitejs/plugin-vue@^4.6.2 vite@^4.5.14
npm install --save-dev electron@^28.0.0 electron-builder@^24.9.1
npm install --save-dev concurrently@^8.2.2 wait-on@^7.2.0 chokidar@^3.5.3
```

### 2. 开发模式运行

```bash
# 方式1: 使用并发启动 (推荐)
npm run electron:dev

# 方式2: 分别启动
# 终端1: 启动 Vite 开发服务器
npm run dev

# 终端2: 启动 Electron (等待 Vite 服务器启动后)
npm run electron:dev-simple

# 方式3: 测试Electron基本功能
npm run electron:test
```

### 3. 构建生产版本

```bash
# 构建 Web 应用
npm run build

# 打包 Electron 应用
npm run electron:pack

# 构建分发版本
npm run electron:dist
```

## 项目结构

```
├── electron/                 # Electron 主进程文件
│   ├── main.js              # 主进程入口
│   └── preload.js           # 预加载脚本
├── assets/                   # 应用资源
│   ├── icon.png             # 应用图标 (PNG)
│   └── icon.svg             # 应用图标 (SVG)
├── scripts/                  # 构建脚本
│   └── electron-dev.js      # 开发环境启动脚本
├── src/                      # Vue 应用源码
├── dist/                     # 构建输出目录
└── dist-electron/           # Electron 打包输出
```

## 可用脚本

- `npm run dev` - 启动 Vite 开发服务器
- `npm run build` - 构建生产版本
- `npm run electron` - 启动 Electron 应用
- `npm run electron:dev` - 开发模式 (Vite + Electron)
- `npm run electron:pack` - 打包应用 (不分发)
- `npm run electron:dist` - 构建分发版本

## 应用菜单

桌面应用包含以下菜单功能：

### 文件菜单
- 打开书库 (Ctrl/Cmd+O)
- 上传书籍 (Ctrl/Cmd+U)
- 退出应用 (Ctrl/Cmd+Q)

### 编辑菜单
- 撤销/重做
- 剪切/复制/粘贴

### 视图菜单
- 重新加载 (Ctrl/Cmd+R)
- 开发者工具 (F12)
- 缩放控制
- 全屏切换 (F11)

### 窗口菜单
- 最小化 (Ctrl/Cmd+M)
- 关闭窗口 (Ctrl/Cmd+W)

## 构建配置

应用使用 `electron-builder` 进行打包，支持以下平台：

- **Windows**: NSIS 安装程序
- **macOS**: DMG 磁盘映像
- **Linux**: AppImage 便携应用

构建配置在 `package.json` 的 `build` 字段中定义。

## 安全特性

- 禁用 Node.js 集成
- 启用上下文隔离
- 预加载脚本安全封装
- 外部链接安全处理
- CSP 内容安全策略

## 开发注意事项

1. **热重载**: 主进程文件修改会自动重启 Electron
2. **调试**: 开发模式下自动打开 DevTools
3. **代理**: API 请求通过 Vite 代理到后端服务器
4. **路径**: 生产环境使用相对路径，确保打包后正常运行

## 故障排除

### 常见问题

1. **`npm run electron:dev` 不弹出应用窗口**
   
   **可能原因和解决方案：**
   
   a) **ES模块兼容性问题**
   ```bash
   # 检查控制台是否有模块导入错误
   # 确保所有文件都使用ES模块语法 (import/export)
   ```
   
   b) **依赖未正确安装**
   ```bash
   # 重新安装依赖
   rm -rf node_modules package-lock.json
   npm install
   ```
   
   c) **端口冲突**
   ```bash
   # 检查3000端口是否被占用
   netstat -ano | findstr :3000  # Windows
   lsof -i :3000                 # macOS/Linux
   ```
   
   d) **分步调试**
   ```bash
   # 步骤1: 先启动Vite服务器
   npm run dev
   
   # 步骤2: 等待服务器启动后，在新终端运行
   npm run electron:dev-simple
   
   # 步骤3: 如果还不行，测试基本功能
   npm run electron:test
   ```

2. **Electron窗口启动但显示空白页面**
   - 检查Vite开发服务器是否正常运行在 http://localhost:3000
   - 打开开发者工具查看控制台错误信息
   - 确认防火墙没有阻止本地连接

3. **构建失败**
   - 清理构建缓存：`rm -rf dist dist-electron`
   - 重新安装依赖：`rm -rf node_modules && npm install`
   - 确保所有依赖版本兼容

4. **应用无法加载**
   - 检查 `dist` 目录是否存在构建文件
   - 验证 `vite.config.js` 中的 `base` 配置
   - 确认所有资源路径正确

5. **模块导入错误**
   ```bash
   # 如果看到 "require is not defined" 错误
   # 确保所有 .js 文件都使用 ES 模块语法
   # 将 require() 改为 import
   # 将 module.exports 改为 export
   ```

### 日志调试

开发模式下，可以在以下位置查看日志：
- 主进程日志: 终端输出
- 渲染进程日志: DevTools 控制台

## 更新日志

### v1.0.0
- 初始版本发布
- 支持 EPUB 和 TXT 格式
- 完整的桌面应用功能
- 跨平台支持

## 许可证

本项目采用 MIT 许可证。

## 技术支持

如遇到问题，请检查：
1. Node.js 版本是否符合要求
2. 所有依赖是否正确安装
3. 后端服务是否正常运行
4. 防火墙是否阻止了应用访问