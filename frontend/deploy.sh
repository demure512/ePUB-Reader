#!/bin/bash

# 电子书库应用华为云自动部署脚本
# 使用方法: ./deploy.sh [frontend|backend|all]

set -e

# 配置变量 - 请根据实际情况修改
ECS_HOST="your_ecs_ip"
ECS_USER="root"
RDS_HOST="your_rds_host"
DB_NAME="ebook_library"
DB_USER="ebook_user"
DB_PASS="your_secure_password"
OBS_BUCKET="your-domain-frontend"
DOMAIN="your-domain.com"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查部署依赖..."
    
    # 检查必要的命令
    commands=("ssh" "scp" "node" "npm" "java" "mvn")
    for cmd in "${commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            log_error "$cmd 未安装，请先安装"
            exit 1
        fi
    done
    
    # 检查obsutil (可选)
    if ! command -v obsutil &> /dev/null; then
        log_warn "obsutil 未安装，将跳过OBS自动上传"
    fi
    
    log_info "依赖检查完成"
}

# 部署后端
deploy_backend() {
    log_info "开始部署后端..."
    
    # 构建后端
    log_info "构建Spring Boot应用..."
    cd backend
    mvn clean package -DskipTests
    
    # 创建部署目录
    ssh $ECS_USER@$ECS_HOST "mkdir -p /opt/ebook-library/backend /opt/ebook-library/logs /opt/ebook-library/uploads"
    
    # 上传JAR文件
    log_info "上传应用文件到服务器..."
    scp target/ebook-library-*.jar $ECS_USER@$ECS_HOST:/opt/ebook-library/backend/
    
    # 上传配置文件
    cat > application-prod.properties << EOF
# 数据库配置
spring.datasource.url=jdbc:mysql://$RDS_HOST:3306/$DB_NAME?useSSL=true&serverTimezone=Asia/Shanghai
spring.datasource.username=$DB_USER
spring.datasource.password=$DB_PASS
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
app.cors.allowed-origins=https://$DOMAIN,https://www.$DOMAIN

# 日志配置
logging.level.com.ebook=INFO
logging.file.name=/opt/ebook-library/logs/application.log
EOF
    
    scp application-prod.properties $ECS_USER@$ECS_HOST:/opt/ebook-library/backend/
    
    # 创建启动脚本
    cat > start.sh << 'EOF'
#!/bin/bash
cd /opt/ebook-library/backend
JAR_FILE=$(ls ebook-library-*.jar | head -1)
nohup java -jar -Xmx2g -Xms1g -Dspring.profiles.active=prod $JAR_FILE > /opt/ebook-library/logs/app.log 2>&1 &
echo $! > /opt/ebook-library/app.pid
echo "应用已启动，PID: $(cat /opt/ebook-library/app.pid)"
EOF
    
    cat > stop.sh << 'EOF'
#!/bin/bash
if [ -f /opt/ebook-library/app.pid ]; then
    PID=$(cat /opt/ebook-library/app.pid)
    kill $PID
    rm /opt/ebook-library/app.pid
    echo "应用已停止"
else
    echo "应用未运行"
fi
EOF
    
    scp start.sh stop.sh $ECS_USER@$ECS_HOST:/opt/ebook-library/
    ssh $ECS_USER@$ECS_HOST "chmod +x /opt/ebook-library/start.sh /opt/ebook-library/stop.sh"
    
    # 创建systemd服务
    cat > ebook-library.service << EOF
[Unit]
Description=Ebook Library Application
After=network.target

[Service]
Type=forking
User=root
WorkingDirectory=/opt/ebook-library/backend
ExecStart=/opt/ebook-library/start.sh
ExecStop=/opt/ebook-library/stop.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    scp ebook-library.service $ECS_USER@$ECS_HOST:/tmp/
    ssh $ECS_USER@$ECS_HOST "
        mv /tmp/ebook-library.service /etc/systemd/system/
        systemctl daemon-reload
        systemctl enable ebook-library
        systemctl stop ebook-library 2>/dev/null || true
        systemctl start ebook-library
        systemctl status ebook-library
    "
    
    # 清理临时文件
    rm -f application-prod.properties start.sh stop.sh ebook-library.service
    
    cd ..
    log_info "后端部署完成"
}

# 部署前端
deploy_frontend() {
    log_info "开始部署前端..."
    
    cd frontend
    
    # 创建生产环境配置
    cat > .env.production << EOF
VITE_API_BASE_URL=https://api.$DOMAIN
VITE_APP_TITLE=电子书库
NODE_ENV=production
EOF
    
    # 安装依赖并构建
    log_info "安装依赖..."
    npm install
    
    log_info "构建生产版本..."
    npm run build
    
    # 上传到OBS (如果obsutil可用)
    if command -v obsutil &> /dev/null; then
        log_info "上传文件到OBS..."
        obsutil cp dist/ obs://$OBS_BUCKET/ -r -f
        log_info "前端文件已上传到OBS"
    else
        log_warn "obsutil 不可用，请手动上传 dist/ 目录到OBS桶: $OBS_BUCKET"
        log_info "dist/ 目录已准备就绪，包含以下文件:"
        ls -la dist/
    fi
    
    cd ..
    log_info "前端部署完成"
}

# 初始化数据库
init_database() {
    log_info "初始化数据库..."
    
    # 检查MySQL客户端
    if ! command -v mysql &> /dev/null; then
        log_error "MySQL客户端未安装，请手动执行数据库初始化"
        log_info "请在MySQL中执行: backend/src/main/resources/init-sync-tables.sql"
        return
    fi
    
    # 执行数据库初始化脚本
    mysql -h $RDS_HOST -u $DB_USER -p$DB_PASS $DB_NAME < backend/src/main/resources/init-sync-tables.sql
    log_info "数据库初始化完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 检查后端服务
    log_info "检查后端服务..."
    if curl -f -s http://$ECS_HOST:8080/api/test > /dev/null; then
        log_info "后端服务运行正常"
    else
        log_error "后端服务检查失败"
    fi
    
    # 检查前端访问
    log_info "检查前端访问..."
    if curl -f -s https://www.$DOMAIN > /dev/null; then
        log_info "前端访问正常"
    else
        log_warn "前端访问检查失败，可能需要等待CDN生效"
    fi
}

# 显示部署信息
show_deployment_info() {
    log_info "部署完成！"
    echo ""
    echo "=== 部署信息 ==="
    echo "前端地址: https://www.$DOMAIN"
    echo "后端API: https://api.$DOMAIN"
    echo "后端服务器: $ECS_HOST:8080"
    echo ""
    echo "=== 管理命令 ==="
    echo "启动后端: ssh $ECS_USER@$ECS_HOST 'systemctl start ebook-library'"
    echo "停止后端: ssh $ECS_USER@$ECS_HOST 'systemctl stop ebook-library'"
    echo "查看日志: ssh $ECS_USER@$ECS_HOST 'tail -f /opt/ebook-library/logs/application.log'"
    echo "查看状态: ssh $ECS_USER@$ECS_HOST 'systemctl status ebook-library'"
    echo ""
    echo "=== 注意事项 ==="
    echo "1. 请确保域名DNS解析已正确配置"
    echo "2. 请确保SSL证书已正确安装"
    echo "3. 请定期备份数据库和上传文件"
    echo "4. 建议配置监控和告警"
}

# 主函数
main() {
    local action=${1:-all}
    
    log_info "开始部署电子书库应用 - 模式: $action"
    
    # 检查配置
    if [[ "$ECS_HOST" == "your_ecs_ip" ]]; then
        log_error "请先修改脚本中的配置变量"
        exit 1
    fi
    
    check_dependencies
    
    case $action in
        "backend")
            deploy_backend
            health_check
            ;;
        "frontend")
            deploy_frontend
            ;;
        "all")
            init_database
            deploy_backend
            deploy_frontend
            health_check
            show_deployment_info
            ;;
        *)
            log_error "无效的部署模式: $action"
            echo "使用方法: $0 [frontend|backend|all]"
            exit 1
            ;;
    esac
    
    log_info "部署完成！"
}

# 执行主函数
main "$@"