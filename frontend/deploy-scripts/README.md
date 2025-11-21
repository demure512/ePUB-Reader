# 华为云部署脚本使用指南

## 📋 脚本说明

本目录包含了电子书图书馆应用在华为云上的自动化部署脚本，帮助您快速完成从环境配置到应用部署的全过程。

## 📁 文件结构

```
deploy-scripts/
├── setup-server.sh     # 服务器环境配置脚本
├── deploy-app.sh       # 应用部署脚本
└── README.md          # 使用说明
```

## 🚀 快速部署步骤

### 第一步：准备华为云资源

1. **购买ECS云服务器**
   - 推荐配置：2核4GB，Ubuntu 20.04 LTS
   - 开放端口：22, 80, 443

2. **购买RDS MySQL数据库**
   - 版本：MySQL 8.0
   - 规格：1核2GB起
   - 记录数据库连接信息

### 第二步：上传代码到服务器

```bash
# 方式1：使用SCP上传（在本地执行）
scp -r /path/to/ebook-library-dev-ffg root@your-server-ip:/tmp/

# 方式2：使用Git克隆（在服务器执行）
git clone your-repository-url /tmp/ebook-library-dev-ffg
```

### 第三步：连接服务器并运行脚本

```bash
# 1. SSH连接到服务器
ssh root@your-server-ip

# 2. 移动代码到目标目录
mv /tmp/ebook-library-dev-ffg /opt/ebook-library

# 3. 进入脚本目录
cd /opt/ebook-library/deploy-scripts

# 4. 给脚本执行权限
chmod +x *.sh

# 5. 运行环境配置脚本
./setup-server.sh

# 6. 运行应用部署脚本
./deploy-app.sh
```

### 第四步：按提示输入配置信息

运行 `deploy-app.sh` 时，脚本会提示您输入：

- **数据库主机地址**: RDS MySQL的连接地址
- **数据库用户名**: 数据库用户名
- **数据库密码**: 数据库密码
- **服务器公网IP**: ECS服务器的公网IP
- **域名**: （可选）如果有域名可以输入

## 📱 部署完成后

### 访问应用
- 直接IP访问：`http://your-server-ip`
- 域名访问：`http://your-domain.com`（如果配置了域名）

### 管理命令
```bash
# 查看后端服务状态
sudo systemctl status ebook-backend

# 查看后端日志
sudo journalctl -u ebook-backend -f

# 重启后端服务
sudo systemctl restart ebook-backend

# 重启Nginx
sudo systemctl restart nginx

# 手动备份数据库
/opt/backup-db.sh
```

### 重要目录
- **应用目录**: `/opt/ebook-library`
- **上传目录**: `/opt/ebook-library/uploads`
- **日志目录**: `/opt/ebook-library/logs`
- **备份目录**: `/opt/backups`

## 🔧 故障排查

### 后端服务无法启动
```bash
# 查看详细错误日志
sudo journalctl -u ebook-backend -n 50

# 检查Java版本
java -version

# 检查端口占用
sudo netstat -tlnp | grep 8080
```

### 前端无法访问
```bash
# 检查Nginx配置
sudo nginx -t

# 查看Nginx错误日志
sudo tail -f /var/log/nginx/error.log

# 检查前端文件是否存在
ls -la /opt/ebook-library/frontend/dist/
```

### 数据库连接失败
```bash
# 测试数据库连接
mysql -h your-rds-endpoint -u your-username -p

# 检查网络连通性
telnet your-rds-endpoint 3306
```

## 🛡️ 安全建议

1. **修改默认端口**
   - 修改SSH端口（非22）
   - 使用密钥登录替代密码

2. **配置SSL证书**
   ```bash
   # 安装Certbot
   sudo apt install certbot python3-certbot-nginx -y
   
   # 获取免费SSL证书
   sudo certbot --nginx -d your-domain.com
   ```

3. **定期更新系统**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

## 📊 监控和维护

### 系统监控
```bash
# 查看系统资源使用
htop

# 查看磁盘使用
df -h

# 查看内存使用
free -h
```

### 日志管理
```bash
# 清理旧日志（保留最近7天）
find /opt/ebook-library/logs -name "*.log" -mtime +7 -delete

# 查看应用访问日志
sudo tail -f /var/log/nginx/access.log
```

### 数据备份
- 数据库自动备份：每天凌晨2点自动执行
- 手动备份：运行 `/opt/backup-db.sh`
- 备份保留：自动删除7天前的备份文件

## 🆘 技术支持

如果在部署过程中遇到问题，请检查：

1. **网络连接**: 确保服务器可以访问外网和数据库
2. **端口开放**: 检查华为云安全组配置
3. **资源充足**: 确保服务器内存和磁盘空间充足
4. **权限问题**: 确保脚本有执行权限

## 🎯 性能优化建议

1. **启用Gzip压缩**: 已在Nginx配置中启用
2. **配置缓存**: 静态文件缓存1年
3. **数据库优化**: 根据使用情况调整RDS规格
4. **CDN加速**: 可配置华为云CDN加速静态资源

部署完成后，您的电子书图书馆应用就可以为多个用户提供服务了！🎉