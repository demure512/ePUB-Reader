#!/bin/bash

# 华为云服务器自动化部署脚本
# 使用方法: chmod +x setup-server.sh && ./setup-server.sh

set -e

echo "🚀 开始华为云服务器环境配置..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# 检查是否为root用户
if [[ $EUID -eq 0 ]]; then
   log_error "请不要使用root用户运行此脚本"
   exit 1
fi

# 更新系统
log_info "更新系统包..."
sudo apt update && sudo apt upgrade -y

# 安装Java 17
log_info "安装Java 17..."
sudo apt install openjdk-17-jdk -y
java -version

# 安装Node.js 18
log_info "安装Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y
log_info "Node.js版本: $(node -v)"
log_info "NPM版本: $(npm -v)"

# 安装Nginx
log_info "安装Nginx..."
sudo apt install nginx -y

# 安装Git
log_info "安装Git..."
sudo apt install git -y

# 安装MySQL客户端
log_info "安装MySQL客户端..."
sudo apt install mysql-client -y

# 安装Maven
log_info "安装Maven..."
cd /tmp
wget https://dlcdn.apache.org/maven/maven-3/3.9.5/binaries/apache-maven-3.9.5-bin.tar.gz
sudo tar -xzf apache-maven-3.9.5-bin.tar.gz -C /opt/
sudo mv /opt/apache-maven-3.9.5 /opt/maven
sudo chown -R $USER:$USER /opt/maven

# 配置Maven环境变量
echo 'export MAVEN_HOME=/opt/maven' | sudo tee -a /etc/profile
echo 'export PATH=$PATH:$MAVEN_HOME/bin' | sudo tee -a /etc/profile
source /etc/profile

# 创建应用目录
log_info "创建应用目录..."
sudo mkdir -p /opt/ebook-library
sudo chown $USER:$USER /opt/ebook-library

# 创建上传目录
sudo mkdir -p /opt/ebook-library/uploads
sudo chown $USER:$USER /opt/ebook-library/uploads

# 创建备份目录
sudo mkdir -p /opt/backups
sudo chown $USER:$USER /opt/backups

# 配置防火墙
log_info "配置防火墙..."
sudo ufw --force enable
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443

# 安装监控工具
log_info "安装监控工具..."
sudo apt install htop -y

log_info "✅ 服务器环境配置完成！"
log_info "下一步请运行: ./deploy-app.sh"