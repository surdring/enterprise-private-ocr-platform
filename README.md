
# Enterprise Private OCR Platform

一个“前端工作台 + 后端 OCR 代理”的私有化 OCR 平台 Demo。

后端负责：

- 接收文件上传（图片 / PDF）
- 代理请求到外部 OCR API（通过 `OCR_API_TOKEN`）
- 统一超时/重试/错误返回

前端负责：

- 文件预览与 OCR 触发
- 识别结果展示（表格内容会尽量转为可读形式）
- 多格式导出（CSV / Table CSV / Markdown / HTML / JSON）


## 本地运行（开发模式）

**Prerequisites:** Node.js 18+（建议 20+）

### 1) 安装依赖

```bash
npm install
```

### 2) 配置环境变量

复制并编辑 `.env.local`（项目根目录）。至少需要：

- `OCR_API_TOKEN`：外部 OCR API 的 token（不要提交到仓库）

可选配置：

- `OCR_API_URL`：外部 OCR API 地址
- `OCR_HTTP_TIMEOUT_MS`：上游请求超时（毫秒）
- `OCR_MAX_FILE_SIZE_BYTES`：上传文件大小限制（bytes）。如果你在控制台看到 `413 (Payload Too Large)` / `FILE_TOO_LARGE`，通常是这里的限制太小。
- `OCR_UPSTREAM_MAX_ATTEMPTS`：上游 5xx/429 最大尝试次数
- `OCR_UPSTREAM_RETRY_BACKOFF_MS`：上游重试退避时间（毫秒）

示例（将上传限制调到 50MB，修改后需重启后端生效）：

```dotenv
OCR_MAX_FILE_SIZE_BYTES=52428800
```

### 3) 启动后端（OCR 代理）

后端默认监听：`0.0.0.0:8012`

```bash
npm run dev:server
```

健康检查：

```bash
curl -s http://localhost:8012/api/health
```

### 4) 启动前端（Vite）

前端默认监听：`0.0.0.0:3000`

```bash
npm run dev
```

前端会通过 Vite proxy 将 `/api/*` 代理到后端 `http://localhost:8012`。

## API 测试

> 注意：`/api/ocr/layout-parsing` 仅支持 `POST` 上传。

```bash
curl -s -X POST \
  -F "file=@/absolute/path/to/test.png" \
  http://localhost:8012/api/ocr/layout-parsing
```

可选参数（multipart form field）：

- `useDocOrientationClassify`：`true/false`
- `useDocUnwarping`：`true/false`
- `useChartRecognition`：`true/false`

## 部署（生产环境）

本项目建议按“前端静态资源 + 后端 API 服务”方式部署。

### 部署目标结构

- **前端**：`npm run build` 输出静态文件到 `dist/`
- **后端**：`node server/index.mjs` 提供 `/api/*`
- **反向代理**（推荐 Nginx）：
  - `/` 走前端静态文件
  - `/api/` 反代到后端

### 1) 生产构建前端

```bash
npm ci
npm run build
```

构建产物：`dist/`

### 2) 启动后端（生产）

在服务器上配置环境变量（建议用 `.env.local` 或系统环境变量），然后：

```bash
npm ci --omit=dev
npm run start:server
```

你也可以用环境变量覆盖监听地址与端口：

- `HOST`（默认 `0.0.0.0`）
- `PORT`（默认 `8012`）

### 3) Nginx 反向代理示例

将前端 `dist/` 拷贝到例如：`/var/www/enterprise-private-ocr-platform/dist`

示例配置（请按你的域名/证书路径修改）：

```nginx
server {
  listen 80;
  server_name your-domain.example;

  root /var/www/enterprise-private-ocr-platform/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:8012;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # 需要同时大于等于后端 OCR_MAX_FILE_SIZE_BYTES，否则 Nginx 也会直接返回 413
    client_max_body_size 50m;
  }
}
```

### 4) systemd（可选，推荐）

将后端做成常驻服务，示例（路径请按实际修改）：

```ini
[Unit]
Description=Enterprise Private OCR Proxy Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/enterprise-private-ocr-platform
ExecStart=/usr/bin/node server/index.mjs
Restart=always
Environment=NODE_ENV=production
Environment=PORT=8012
EnvironmentFile=/opt/enterprise-private-ocr-platform/.env.local

[Install]
WantedBy=multi-user.target
```

## 安全提示

- 不要把 `OCR_API_TOKEN` 提交到 git 仓库。
- 生产环境建议通过系统环境变量/密钥管理注入 token。
