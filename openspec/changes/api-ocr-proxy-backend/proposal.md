## Why

本项目当前只有前端模拟 OCR 结果，但本地环境无显卡、无法运行 GPU OCR 推理。需要通过调用外部 OCR API（layout-parsing）实现文档解析能力，才能在本地/内网环境完成真实 OCR 流程验证与集成。

## What Changes

- 新增后端 OCR 代理服务：接收 PDF/图片上传，将文件 base64 编码后调用外部 `layout-parsing` API，并将结果（markdown、images、outputImages 等）返回给前端。
- 统一配置：通过环境变量配置外部 API 的 `API_URL` 与 `TOKEN`，避免在前端暴露密钥。
- 调用链路与错误处理：增加请求超时、外部 API 非 200 响应处理、文件类型识别（PDF=0，图片=1）。
- （可选）结果落盘：将返回的 markdown 与图片按结构保存到本地目录，便于下载与审计。

## Capabilities

### New Capabilities
- `external-ocr-proxy`: 提供文档上传与外部 OCR API 调用的后端代理能力，并返回结构化结果（markdown/图片链接）。

### Modified Capabilities
- 

## Impact

- 代码：新增后端目录与 API 路由（例如 `/api/ocr/layout-parsing`）；前端 Workbench 从 mock 切换为调用后端接口。
- 依赖：新增 Node 后端依赖（如 `express`、上传中间件、跨域/代理配置等）。
- 部署/运行：本地开发需同时启动前端与后端；新增环境变量（`OCR_API_URL`、`OCR_API_TOKEN` 等）。
