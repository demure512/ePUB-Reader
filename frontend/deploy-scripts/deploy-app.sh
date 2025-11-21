#!/bin/bash

# 应用部署脚本
# 使用方法: ./deploy-app.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 获取用户输入
get_user_input() {
    log_step "请输入部署配置信息："
    
    read -p "数据库主机地址 (RDS endpoint): " DB_HOST
    read -p "数据库用户名: " DB_USER
    read -s -p "数据库密码: " DB_PASS
    echo
    read -p "服务器公网IP: " SERVER_IP
    read -p "域名 (可选，直接回车跳过): " DOMAIN
    
    if [[ -z "$DB_HOST" || -z "$DB_USER" || -z "$DB_PASS" || -z "$SERVER_IP" ]]; then
        log_error "必填信息不能为空！"
        exit 1
    fi
}

# 创建数据库
create_database() {
    log_step "创建数据库..."
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS ebook_library CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" || {
        log_error "数据库创建失败，请检查连接信息"
        exit 1
    }
    log_info "数据库创建成功"
}

# 配置后端
configure_backend() {
    log_step "配置后端应用..."
    
    cd /opt/ebook-library/backend
    
    # 备份原配置文件
    if [[ -f src/main/resources/application.properties ]]; then
        cp src/main/resources/application.properties src/main/resources/application.properties.bak
    fi
    
    # 创建生产配置文件
    cat > src/main/resources/application.properties << EOF
# 数据库配置
spring.datasource.url=jdbc:mysql://${DB_HOST}:3306/ebook_library?useSSL=true&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true
spring.datasource.username=${DB_USER}
spring.datasource.password=${DB_PASS}
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA配置
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect

# 服务器配置
server.port=8080
server.address=0.0.0.0

# 文件上传配置
app.upload.dir=/opt/ebook-library/uploads
spring.servlet.multipart.max-file-size=50MB
spring.servlet.multipart.max-request-size=50MB

# 日志配置
logging.level.com.ebook=INFO
logging.file.name=/opt/ebook-library/logs/application.log
EOF

    log_info "后端配置完成"
}

# 构建后端
build_backend() {
    log_step "构建后端应用..."
    
    cd /opt/ebook-library/backend
    
    # 创建日志目录
    mkdir -p /opt/ebook-library/logs
    
    # 构建项目
    /opt/maven/bin/mvn clean package -DskipTests || {
        log_error "后端构建失败"
        exit 1
    }
    
    log_info "后端构建成功"
}

# 创建后端服务
create_backend_service() {
    log_step "创建后端系统服务..."
    
    sudo tee /etc/systemd/system/ebook-backend.service > /dev/null << EOF
[Unit]
Description=Ebook Library Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/ebook-library/backend
ExecStart=/usr/bin/java -jar target/ebook-library-1.0.0.jar
Restart=always
RestartSec=10
Environment=JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

[Install]
WantedBy=multi-user.target
EOF

    # 重载systemd并启动服务
    sudo systemctl daemon-reload
    sudo systemctl enable ebook-backend
    sudo systemctl start ebook-backend
    
    # 等待服务启动
    sleep 10
    
    # 检查服务状态
    if sudo systemctl is-active --quiet ebook-backend; then
        log_info "后端服务启动成功"
    else
        log_error "后端服务启动失败"
        sudo systemctl status ebook-backend
        exit 1
    fi
}

# 配置前端
configure_frontend() {
    log_step "配置前端应用..."
    
    cd /opt/ebook-library/frontend
    
    # 创建生产环境配置
    cat > .env.production << EOF
VITE_API_BASE_URL=http://${SERVER_IP}:8080/api
VITE_APP_TITLE=电子书图书馆
EOF

    log_info "前端配置完成"
}

# 构建前端
build_frontend() {
    log_step "构建前端应用..."
    
    cd /opt/ebook-library/frontend
    
    # 安装依赖
    npm install || {
        log_error "前端依赖安装失败"
        exit 1
    }
    
    # 构建生产版本
    npm run build || {
        log_error "前端构建失败"
        exit 1
    }
    
    log_info "前端构建成功"
}

# 配置Nginx
configure_nginx() {
    log_step "配置Nginx..."
    
    # 确定server_name
    if [[ -n "$DOMAIN" ]]; then
        SERVER_NAME="$DOMAIN"
    else
        SERVER_NAME="$SERVER_IP"
    fi
    
    # 创建Nginx配置
    sudo tee /etc/nginx/sites-available/ebook-library > /dev/null << EOF
server {
    listen 80;
    server_name ${SERVER_NAME};
    
    # 前端静态文件
    location / {
        root /opt/ebook-library/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
    
    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # 增加超时时间
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 文件上传/下载
    location /uploads/ {
        alias /opt/ebook-library/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 安全配置
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF

    # 启用站点配置
    sudo ln -sf /etc/nginx/sites-available/ebook-library /etc/nginx/sites-enabled/
    
    # 删除默认配置
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # 测试配置
    sudo nginx -t || {
        log_error "Nginx配置测试失败"
        exit 1
    }
    
    # 重启Nginx
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    log_info "Nginx配置完成"
}

# 创建备份脚本
create_backup_script() {
    log_step "创建数据库备份脚本..."
    
    cat > /opt/backup-db.sh << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
mysqldump -h ${DB_HOST} -u ${DB_USER} -p${DB_PASS} ebook_library > /opt/backups/ebook_library_\$DATE.sql
# 保留最近7天的备份
find /opt/backups -name "ebook_library_*.sql" -mtime +7 -delete
echo "数据库备份完成: ebook_library_\$DATE.sql"
EOF

    chmod +x /opt/backup-db.sh
    
    # 添加到crontab（每天凌晨2点备份）
    (crontab -l 2>/dev/null; echo "0 2 * * * /opt/backup-db.sh") | crontab -
    
    log_info "备份脚本创建完成"
}

# 部署完成检查
deployment_check() {
    log_step "部署完成检查..."
    
    # 检查后端服务
    if curl -s http://localhost:8080/api/test > /dev/null; then
        log_info "✅ 后端服务正常"
    else
        log_warn "⚠️ 后端服务可能有问题"
    fi
    
    # 检查前端文件
    if [[ -f /opt/ebook-library/frontend/dist/index.html ]]; then
        log_info "✅ 前端文件存在"
    else
        log_warn "⚠️ 前端文件不存在"
    fi
    
    # 检查Nginx
    if sudo systemctl is-active --quiet nginx; then
        log_info "✅ Nginx服务正常"
    else
        log_warn "⚠️ Nginx服务异常"
    fi
}

# 显示部署结果
show_deployment_result() {
    log_step "部署完成！"
    
    echo
    echo "🎉 电子书图书馆应用部署成功！"
    echo
    echo "📱 访问地址："
    if [[ -n "$DOMAIN" ]]; then
        echo "   http://$DOMAIN"
    else
        echo "   http://$SERVER_IP"
    fi
    echo
    echo "🔧 管理命令："
    echo "   查看后端日志: sudo journalctl -u ebook-backend -f"
    echo "   重启后端服务: sudo systemctl restart ebook-backend"
    echo "   重启Nginx: sudo systemctl restart nginx"
    echo "   数据库备份: /opt/backup-db.sh"
    echo
    echo "📁 重要目录："
    echo "   应用目录: /opt/ebook-library"
    echo "   上传目录: /opt/ebook-library/uploads"
    echo "   日志目录: /opt/ebook-library/logs"
    echo "   备份目录: /opt/backups"
    echo
}

# 主函数
main() {
    log_info "🚀 开始部署电子书图书馆应用..."
    
    # 检查是否在正确目录
    if [[ ! -d "/opt/ebook-library" ]]; then
        log_error "请先运行 setup-server.sh 脚本"
        exit 1
    fi
    
    # 检查代码是否存在
    if [[ ! -d "/opt/ebook-library/backend" || ! -d "/opt/ebook-library/frontend" ]]; then
        log_error "请先将代码上传到 /opt/ebook-library 目录"
        exit 1
    fi
    
    get_user_input
    create_database
    configure_backend
    build_backend
    create_backend_service
    configure_frontend
    build_frontend
    configure_nginx
    create_backup_script
    deployment_check
    show_deployment_result
}

# 执行主函数
main "$@"