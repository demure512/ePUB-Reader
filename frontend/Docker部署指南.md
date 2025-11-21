# 电子书库应用 Docker 部署指南

## 概述

本指南提供了使用Docker和Docker Compose快速部署电子书库应用的完整方案，适合本地开发、测试和小规模生产环境。

## 架构说明

```
Docker部署架构
├── MySQL容器 (数据库)
├── Spring Boot容器 (后端API)
├── Nginx容器 (前端 + 反向代理)
└── Docker网络 (容器间通信)
```

## 前置要求

### 系统要求
- Docker 20.10+
- Docker Compose 2.0+
- 至少4GB可用内存
- 至少10GB可用磁盘空间

### 安装Docker

#### Windows/Mac
1. 下载并安装 [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. 启动Docker Desktop
3. 验证安装：`docker --version && docker-compose --version`

#### Linux (Ubuntu/CentOS)
```bash
# Ubuntu
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 重新登录或执行
newgrp docker
```

## 快速部署

### 第一步：准备项目文件

```bash
# 克隆项目（如果使用Git）
git clone <your-repository-url>
cd ebook-library

# 或者确保项目结构如下：
ebook-library/
├── backend/
│   ├── src/
│   ├── pom.xml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   ├── package.json
│   └── dist/ (构建后生成)
├── docker-compose.yml
├── nginx.conf
└── deploy.sh
```

### 第二步：构建前端

```bash
# 进入前端目录
cd frontend

# 创建生产环境配置
cat > .env.production << EOF
VITE_API_BASE_URL=http://localhost/api
VITE_APP_TITLE=电子书库
NODE_ENV=production
EOF

# 安装依赖并构建
npm install
npm run build

# 返回项目根目录
cd ..
```

### 第三步：启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 第四步：验证部署

```bash
# 等待服务启动（约2-3分钟）
sleep 180

# 检查服务健康状态
curl http://localhost/health
curl http://localhost/api/test

# 访问应用
echo "应用已启动，请访问: http://localhost"
```

## 详细配置说明

### Docker Compose配置

主要服务配置：

```yaml
# MySQL数据库
mysql:
  - 端口: 3306
  - 数据库: ebook_library
  - 用户: ebook_user
  - 密码: ebook_password_123
  - 数据持久化: mysql_data卷

# Spring Boot后端
backend:
  - 端口: 8080 (内部)
  - 环境: docker
  - 文件存储: uploads_data卷
  - 日志存储: logs_data卷

# Nginx前端+代理
nginx:
  - 端口: 80, 443
  - 静态文件: frontend/dist
  - API代理: /api/* -> backend:8080
```

### 环境变量配置

可以通过创建`.env`文件来自定义配置：

```bash
# 创建环境变量文件
cat > .env << EOF
# 数据库配置
MYSQL_ROOT_PASSWORD=your_root_password
MYSQL_DATABASE=ebook_library
MYSQL_USER=ebook_user
MYSQL_PASSWORD=your_secure_password

# 应用配置
APP_DOMAIN=localhost
API_BASE_URL=http://localhost/api

# 其他配置
COMPOSE_PROJECT_NAME=ebook-library
EOF
```

### 自定义配置

#### 修改数据库密码
```bash
# 编辑docker-compose.yml中的MySQL环境变量
vim docker-compose.yml

# 重新创建服务
docker-compose down -v
docker-compose up -d
```

#### 配置SSL证书
```bash
# 创建SSL证书目录
mkdir -p ssl

# 放置证书文件
cp your-cert.pem ssl/cert.pem
cp your-key.pem ssl/key.pem

# 取消nginx.conf中HTTPS配置的注释
vim nginx.conf

# 重启nginx服务
docker-compose restart nginx
```

## 管理命令

### 基本操作
```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启特定服务
docker-compose restart backend

# 查看服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f backend

# 进入容器
docker-compose exec backend bash
docker-compose exec mysql mysql -u root -p
```

### 数据管理
```bash
# 备份数据库
docker-compose exec mysql mysqldump -u root -p ebook_library > backup.sql

# 恢复数据库
docker-compose exec -T mysql mysql -u root -p ebook_library < backup.sql

# 备份上传文件
docker run --rm -v ebook-library_uploads_data:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .

# 恢复上传文件
docker run --rm -v ebook-library_uploads_data:/data -v $(pwd):/backup alpine tar xzf /backup/uploads-backup.tar.gz -C /data
```

### 更新应用
```bash
# 更新后端
cd backend
# 修改代码后
docker-compose build backend
docker-compose up -d backend

# 更新前端
cd frontend
npm run build
docker-compose restart nginx

# 完整更新
docker-compose down
docker-compose build
docker-compose up -d
```

## 监控和日志

### 日志查看
```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs backend
docker-compose logs mysql
docker-compose logs nginx

# 实时跟踪日志
docker-compose logs -f --tail=100 backend
```

### 性能监控
```bash
# 查看容器资源使用
docker stats

# 查看磁盘使用
docker system df

# 清理未使用的资源
docker system prune -a
```

### 健康检查
```bash
# 检查服务健康状态
docker-compose ps

# 手动健康检查
curl http://localhost/health
curl http://localhost/api/test

# 检查数据库连接
docker-compose exec backend curl -f http://localhost:8080/actuator/health
```

## 故障排查

### 常见问题

#### 1. 服务启动失败
```bash
# 查看详细错误信息
docker-compose logs backend

# 检查端口占用
netstat -tlnp | grep :80
netstat -tlnp | grep :3306

# 重新构建镜像
docker-compose build --no-cache backend
```

#### 2. 数据库连接失败
```bash
# 检查MySQL容器状态
docker-compose logs mysql

# 测试数据库连接
docker-compose exec mysql mysql -u ebook_user -p ebook_library

# 重置数据库
docker-compose down -v
docker-compose up -d mysql
```

#### 3. 前端无法访问后端
```bash
# 检查Nginx配置
docker-compose exec nginx nginx -t

# 查看Nginx日志
docker-compose logs nginx

# 测试后端API
docker-compose exec nginx curl http://backend:8080/api/test
```

#### 4. 文件上传失败
```bash
# 检查上传目录权限
docker-compose exec backend ls -la /opt/ebook-library/uploads

# 检查磁盘空间
docker-compose exec backend df -h

# 重新创建上传目录
docker-compose exec backend mkdir -p /opt/ebook-library/uploads
docker-compose exec backend chown -R ebook:ebook /opt/ebook-library/uploads
```

### 调试模式

#### 启用调试日志
```bash
# 修改后端配置
docker-compose exec backend bash
echo "logging.level.com.ebook=DEBUG" >> /opt/ebook-library/application-docker.properties

# 重启服务
docker-compose restart backend
```

#### 开发模式部署
```bash
# 创建开发环境配置
cp docker-compose.yml docker-compose.dev.yml

# 修改开发配置（添加端口映射、卷挂载等）
vim docker-compose.dev.yml

# 使用开发配置启动
docker-compose -f docker-compose.dev.yml up -d
```

## 生产环境优化

### 安全配置
```bash
# 1. 修改默认密码
# 2. 配置防火墙规则
# 3. 启用HTTPS
# 4. 配置访问日志
# 5. 定期更新镜像
```

### 性能优化
```bash
# 1. 调整JVM参数
# 2. 配置数据库连接池
# 3. 启用Nginx缓存
# 4. 配置CDN
# 5. 数据库索引优化
```

### 备份策略
```bash
# 创建备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

# 备份数据库
docker-compose exec -T mysql mysqldump -u root -p$MYSQL_ROOT_PASSWORD ebook_library > $BACKUP_DIR/db_$DATE.sql

# 备份上传文件
docker run --rm -v ebook-library_uploads_data:/data -v $(pwd)/$BACKUP_DIR:/backup alpine tar czf /backup/uploads_$DATE.tar.gz -C /data .

# 清理旧备份（保留30天）
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "备份完成: $DATE"
EOF

chmod +x backup.sh

# 添加到定时任务
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

## 扩展部署

### 多实例部署
```bash
# 使用Docker Swarm
docker swarm init
docker stack deploy -c docker-compose.yml ebook-library

# 扩展后端实例
docker service scale ebook-library_backend=3
```

### 外部数据库
```bash
# 修改docker-compose.yml，移除MySQL服务
# 更新后端环境变量指向外部数据库
SPRING_DATASOURCE_URL=jdbc:mysql://external-db-host:3306/ebook_library
```

## 总结

Docker部署方案的优势：
- ✅ 一键部署，环境一致
- ✅ 服务隔离，互不影响
- ✅ 易于扩展和维护
- ✅ 支持快速回滚
- ✅ 资源使用可控

适用场景：
- 本地开发和测试
- 小到中型生产环境
- 快速原型验证
- 容器化迁移

通过本指南，您可以在几分钟内完成电子书库应用的完整部署，享受现代化的容器化部署体验。