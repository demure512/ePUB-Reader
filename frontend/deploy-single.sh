#!/bin/bash
# 单机全栈部署脚本 - 适用于Ubuntu 24.04 + 鲲鹏

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检测系统架构
ARCH=$(uname -m)
if [[ "$ARCH" == "aarch64" ]]; then
    log_info "检测到ARM64架构 (鲲鹏)"
    JAVA_ARCH="aarch64"
    NODE_ARCH="arm64"
else
    log_info "检测到x86_64架构"
    JAVA_ARCH="x64"
    NODE_ARCH="x64"
fi

# 更新系统
log_info "更新系统包..."
apt update && apt upgrade -y

# 安装基础工具
log_info "安装基础工具..."
apt install -y curl wget git unzip nginx mysql-server

# 安装Java 17 (适配ARM64)
log_info "安装Java 17..."
apt install -y openjdk-17-jdk

# 验证Java安装
java -version
if [ $? -ne 0 ]; then
    log_error "Java安装失败"
    exit 1
fi

# 安装Node.js (适配ARM64)
log_info "安装Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 验证Node.js安装
node --version
npm --version

# 安装Maven
log_info "安装Maven..."
apt install -y maven

# 配置MySQL
log_info "配置MySQL数据库..."
systemctl start mysql
systemctl enable mysql

# 创建数据库和用户
mysql -u root << EOF
CREATE DATABASE IF NOT EXISTS ebook_library CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'ebook_user'@'localhost' IDENTIFIED BY 'ebook_password_123';
GRANT ALL PRIVILEGES ON ebook_library.* TO 'ebook_user'@'localhost';
FLUSH PRIVILEGES;
EOF

log_info "数据库配置完成"

# 创建应用目录
log_info "创建应用目录..."
mkdir -p /opt/ebook-library/{backend,frontend,uploads,logs}

# 如果项目代码不存在，提示用户上传
if [ ! -d "./backend" ] || [ ! -d "./frontend" ]; then
    log_warn "未找到项目代码，请确保在项目根目录运行此脚本"
    log_info "或者使用以下命令上传代码："
    log_info "scp -r ./ebook-library root@your_server_ip:/opt/"
    exit 1
fi

# 构建后端
log_info "构建Spring Boot后端..."
cd backend

# 创建生产环境配置
cat > src/main/resources/application-prod.properties << EOF
# 数据库配置
spring.datasource.url=jdbc:mysql://localhost:3306/ebook_library?useSSL=false&serverTimezone=Asia/Shanghai
spring.datasource.username=ebook_user
spring.datasource.password=ebook_password_123
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA配置
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect

# 文件上传配置
spring.servlet.multipart.max-file-size=100MB
spring.servlet.multipart.max-request-size=100MB
app.upload.dir=/opt/ebook-library/uploads

# 服务器配置
server.port=8080
server.servlet.context-path=/

# 跨域配置
app.cors.allowed-origins=http://localhost,http://$(curl -s ifconfig.me)

# 日志配置
logging.level.com.ebook=INFO
logging.file.name=/opt/ebook-library/logs/application.log
EOF

# 构建JAR包
mvn clean package -DskipTests

# 复制JAR到部署目录
cp target/ebook-library-*.jar /opt/ebook-library/backend/app.jar

cd ..

# 构建前端
log_info "构建Vue.js前端..."
cd frontend

# 创建生产环境配置
cat > .env.production << EOF
VITE_API_BASE_URL=http://$(curl -s ifconfig.me):8080/api
VITE_APP_TITLE=电子书库
NODE_ENV=production
EOF

# 安装依赖并构建
npm install
npm run build

# 复制构建文件到Nginx目录
cp -r dist/* /var/www/html/

cd ..

# 初始化数据库
log_info "初始化数据库结构..."
if [ -f "backend/src/main/resources/init-sync-tables.sql" ]; then
    mysql -u ebook_user -pebook_password_123 ebook_library < backend/src/main/resources/init-sync-tables.sql
fi

# 创建后端服务
log_info "创建系统服务..."
cat > /etc/systemd/system/ebook-library.service << EOF
[Unit]
Description=Ebook Library Application
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ebook-library/backend
ExecStart=/usr/bin/java -jar -Xmx4g -Xms2g -Dspring.profiles.active=prod app.jar
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 配置Nginx
log_info "配置Nginx..."
cat > /etc/nginx/sites-available/ebook-library << EOF
server {
    listen 80;
    server_name _;
    client_max_body_size 100M;

    # 前端静态文件
    location / {
        root /var/www/html;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # API代理到后端
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
EOF

# 启用站点
ln -sf /etc/nginx/sites-available/ebook-library /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 测试Nginx配置
nginx -t

# 启动服务
log_info "启动所有服务..."
systemctl daemon-reload
systemctl enable ebook-library
systemctl start ebook-library
systemctl enable nginx
systemctl restart nginx

# 等待服务启动
sleep 10

# 检查服务状态
log_info "检查服务状态..."
systemctl status mysql --no-pager -l
systemctl status ebook-library --no-pager -l
systemctl status nginx --no-pager -l

# 获取服务器IP
SERVER_IP=$(curl -s ifconfig.me)

log_info "部署完成！"
echo ""
echo "=== 部署信息 ==="
echo "服务器IP: $SERVER_IP"
echo "应用地址: http://$SERVER_IP"
echo "API地址: http://$SERVER_IP/api"
echo ""
echo "=== 管理命令 ==="
echo "查看后端日志: tail -f /opt/ebook-library/logs/application.log"
echo "重启后端: systemctl restart ebook-library"
echo "重启前端: systemctl restart nginx"
echo "查看服务状态: systemctl status ebook-library"
echo ""
echo "=== 数据库信息 ==="
echo "数据库: ebook_library"
echo "用户名: ebook_user"
echo "密码: ebook_password_123"
echo ""
echo "现在可以访问 http://$SERVER_IP 使用您的电子书库了！"