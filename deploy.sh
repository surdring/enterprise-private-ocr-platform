#!/bin/bash

# ============================================================
# Enterprise Private OCR Platform 部署脚本
# 用法: ./deploy.sh [--skip-build] [--skip-nginx] [--skip-systemd]
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$PROJECT_DIR/deploy"

# 配置
NGINX_CONF_DIR="/www/server/nginx/conf/vhost"
SYSTEMD_DIR="/etc/systemd/system"
SERVICE_NAME="ocr-backend"
NGINX_PORT=8001
BACKEND_PORT=8012

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

# 检查是否为 root 或有 sudo 权限
check_sudo() {
    if [[ $EUID -ne 0 ]]; then
        if ! sudo -n true 2>/dev/null; then
            log_error "需要 sudo 权限来安装 systemd 服务和 nginx 配置"
            log_info "请运行: sudo ./deploy.sh $@"
            exit 1
        fi
        SUDO="sudo"
    else
        SUDO=""
    fi
}

# 解析参数
SKIP_BUILD=false
SKIP_NGINX=false
SKIP_SYSTEMD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-nginx)
            SKIP_NGINX=true
            shift
            ;;
        --skip-systemd)
            SKIP_SYSTEMD=true
            shift
            ;;
        -h|--help)
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  --skip-build    跳过前端构建"
            echo "  --skip-nginx    跳过 Nginx 配置"
            echo "  --skip-systemd  跳过 Systemd 服务安装"
            echo "  -h, --help      显示帮助信息"
            exit 0
            ;;
        *)
            log_error "未知参数: $1"
            exit 1
            ;;
    esac
done

echo "============================================================"
echo "  Enterprise Private OCR Platform 部署脚本"
echo "============================================================"
echo ""

# 1. 检查环境
log_info "检查运行环境..."

if ! command -v node &> /dev/null; then
    log_error "未找到 Node.js，请先安装 Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [[ $NODE_VERSION -lt 18 ]]; then
    log_error "Node.js 版本过低，需要 18+，当前版本: $(node -v)"
    exit 1
fi

log_info "Node.js 版本: $(node -v)"

if ! command -v nginx &> /dev/null; then
    log_warn "未找到 Nginx"
fi

# 2. 检查 .env.local 文件
log_info "检查环境变量配置..."
if [[ ! -f "$PROJECT_DIR/.env.local" ]]; then
    log_error "未找到 .env.local 文件"
    log_info "请先创建 .env.local 文件并配置 OCR_API_TOKEN"
    exit 1
fi

if ! grep -q "OCR_API_TOKEN" "$PROJECT_DIR/.env.local"; then
    log_error ".env.local 中未找到 OCR_API_TOKEN 配置"
    exit 1
fi

log_info "环境变量配置正常"

# 3. 安装依赖
if [[ "$SKIP_BUILD" != true ]]; then
    log_info "安装依赖..."
    cd "$PROJECT_DIR"
    
    if [[ -f "package-lock.json" ]]; then
        npm ci
    else
        npm install
    fi
fi

# 4. 构建前端
if [[ "$SKIP_BUILD" != true ]]; then
    log_info "构建前端..."
    cd "$PROJECT_DIR"
    npm run build
    
    if [[ ! -d "$PROJECT_DIR/dist" ]]; then
        log_error "前端构建失败，dist 目录不存在"
        exit 1
    fi
    
    log_info "前端构建完成: $PROJECT_DIR/dist"
fi

# 5. 安装 Systemd 服务
if [[ "$SKIP_SYSTEMD" != true ]]; then
    check_sudo
    
    log_info "安装 Systemd 服务..."
    
    # 更新 service 文件中的路径
    SERVICE_FILE="$DEPLOY_DIR/systemd/ocr-backend.service"
    TEMP_SERVICE_FILE="/tmp/ocr-backend.service"
    
    sed "s|WorkingDirectory=.*|WorkingDirectory=$PROJECT_DIR|g" "$SERVICE_FILE" > "$TEMP_SERVICE_FILE"
    sed -i "s|EnvironmentFile=.*|EnvironmentFile=$PROJECT_DIR/.env.local|g" "$TEMP_SERVICE_FILE"
    sed -i "s|ReadWritePaths=.*|ReadWritePaths=$PROJECT_DIR|g" "$TEMP_SERVICE_FILE"
    
    # 复制服务文件
    $SUDO cp "$TEMP_SERVICE_FILE" "$SYSTEMD_DIR/$SERVICE_NAME.service"
    rm "$TEMP_SERVICE_FILE"
    
    # 重载 systemd
    $SUDO systemctl daemon-reload
    
    # 启动服务
    if $SUDO systemctl is-active --quiet "$SERVICE_NAME"; then
        log_info "服务已在运行，正在重启..."
        $SUDO systemctl restart "$SERVICE_NAME"
    else
        log_info "启动服务..."
        $SUDO systemctl start "$SERVICE_NAME"
    fi
    
    # 设置开机自启
    $SUDO systemctl enable "$SERVICE_NAME"
    
    # 检查服务状态
    sleep 2
    if $SUDO systemctl is-active --quiet "$SERVICE_NAME"; then
        log_info "服务启动成功"
    else
        log_error "服务启动失败，请检查日志:"
        log_info "journalctl -u $SERVICE_NAME -n 50"
        $SUDO systemctl status "$SERVICE_NAME" --no-pager
        exit 1
    fi
fi

# 6. 配置 Nginx
if [[ "$SKIP_NGINX" != true ]]; then
    check_sudo
    
    log_info "配置 Nginx..."
    
    # 检查 Nginx 配置目录
    if [[ ! -d "$NGINX_CONF_DIR" ]]; then
        log_warn "Nginx 配置目录不存在: $NGINX_CONF_DIR"
        log_info "尝试创建目录..."
        $SUDO mkdir -p "$NGINX_CONF_DIR"
    fi
    
    # 更新 nginx 配置中的路径
    NGINX_FILE="$DEPLOY_DIR/nginx/ocr.conf"
    TEMP_NGINX_FILE="/tmp/ocr.conf"
    
    sed "s|root .*/dist;|root $PROJECT_DIR/dist;|g" "$NGINX_FILE" > "$TEMP_NGINX_FILE"
    
    # 复制 Nginx 配置
    $SUDO cp "$TEMP_NGINX_FILE" "$NGINX_CONF_DIR/ocr.conf"
    rm "$TEMP_NGINX_FILE"
    
    # 测试 Nginx 配置
    if ! $SUDO nginx -t 2>/dev/null; then
        log_error "Nginx 配置测试失败"
        $SUDO nginx -t
        exit 1
    fi
    
    # 重载 Nginx
    log_info "重载 Nginx..."
    $SUDO nginx -s reload
    
    log_info "Nginx 配置完成"
fi

# 7. 验证部署
echo ""
log_info "验证部署..."
echo ""

# 检查后端健康状态
sleep 2
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$BACKEND_PORT/api/health" 2>/dev/null || echo "000")
if [[ "$BACKEND_HEALTH" == "200" ]]; then
    log_info "后端服务健康检查: 通过 (HTTP $BACKEND_HEALTH)"
else
    log_warn "后端服务健康检查: 异常 (HTTP $BACKEND_HEALTH)"
fi

# 检查前端访问
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$NGINX_PORT/" 2>/dev/null || echo "000")
if [[ "$FRONTEND_STATUS" == "200" ]]; then
    log_info "前端访问检查: 通过 (HTTP $FRONTEND_STATUS)"
else
    log_warn "前端访问检查: 异常 (HTTP $FRONTEND_STATUS)"
fi

# 8. 部署完成
echo ""
echo "============================================================"
echo -e "${GREEN}  部署完成!${NC}"
echo "============================================================"
echo ""
echo "访问地址:"
echo "  前端:  http://localhost:$NGINX_PORT"
echo "  API:   http://localhost:$NGINX_PORT/api/"
echo ""
echo "常用命令:"
echo "  查看服务状态:   sudo systemctl status $SERVICE_NAME"
echo "  查看服务日志:   journalctl -u $SERVICE_NAME -f"
echo "  重启服务:       sudo systemctl restart $SERVICE_NAME"
echo "  重载 Nginx:     sudo nginx -s reload"
echo ""
