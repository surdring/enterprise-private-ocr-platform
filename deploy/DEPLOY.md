# 生产部署指南

## 部署架构

```
用户 → Nginx:8080 → 前端静态文件 (dist/)
                  → /api/* → 后端:8012
```

## 部署步骤

### 1. 构建前端

```bash
cd /home/zhengxueen/workspace/enterprise-private-ocr-platform
npm ci
npm run build
```

构建产物输出到 `dist/` 目录。

### 2. 配置环境变量

确保 `.env.local` 文件存在并配置正确：

```bash
# 必需
OCR_API_TOKEN=your-token-here

# 可选
OCR_API_URL=https://your-ocr-api.example.com
OCR_MAX_FILE_SIZE_BYTES=52428800
OCR_HTTP_TIMEOUT_MS=120000
```

### 3. 安装 Systemd 服务

```bash
# 复制服务文件
sudo cp deploy/systemd/ocr-backend.service /etc/systemd/system/

# 重载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start ocr-backend

# 设置开机自启
sudo systemctl enable ocr-backend

# 查看状态
sudo systemctl status ocr-backend

# 查看日志
journalctl -u ocr-backend -f
```

### 4. 配置 Nginx

```bash
# 复制 Nginx 配置
sudo cp deploy/nginx/ocr.conf /www/server/nginx/conf/vhost/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo nginx -s reload
```

### 5. 验证部署

```bash
# 检查后端健康状态
curl http://127.0.0.1:8012/api/health

# 检查前端访问
curl http://localhost:8080/
```

## 访问地址

- 前端：`http://your-ip:8080`
- API：`http://your-ip:8080/api/`

## 端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| Nginx | 8080 | 对外提供服务 |
| OCR 后端 | 8012 | 仅监听 127.0.0.1，不对外暴露 |
| Caipiao | 80 | 现有服务，不受影响 |

## 常用命令

```bash
# 重启 OCR 后端
sudo systemctl restart ocr-backend

# 查看 OCR 后端日志
journalctl -u ocr-backend -f

# 重新加载 Nginx 配置
sudo nginx -s reload

# 查看访问日志
tail -f /www/wwwlogs/ocr_access.log
```

## 更新部署

```bash
cd /home/zhengxueen/workspace/enterprise-private-ocr-platform

# 拉取最新代码
git pull

# 重新构建前端
npm run build

# 重启后端服务
sudo systemctl restart ocr-backend
```
