## Context

- 当前仓库为 Vite + React 的纯前端项目，OCR 识别结果由前端 mock 数据模拟，未接入真实推理。
- 本地环境无显卡，无法运行 GPU OCR 服务，因此需要通过外部 API（layout-parsing）实现 OCR/版面解析能力。
- 外部 API 调用需要 `TOKEN`，不能暴露在前端；同时需要对上传文件进行 base64 编码，并区分 PDF/图片的 `fileType`。

## Goals / Non-Goals

**Goals:**

- 在本仓库内提供一个轻量后端（Node.js）作为 OCR 代理服务：
  - 接收 PDF/图片上传
  - base64 编码并调用外部 layout-parsing API
  - 将外部 API 响应以稳定结构返回给前端
- 通过环境变量配置 `OCR_API_URL` 与 `OCR_API_TOKEN`，避免密钥泄露。
- 提供明确的错误处理与超时策略，确保前端可感知失败原因。

**Non-Goals:**

- 不在本地实现任何 GPU/CPU 版 OCR 模型推理。
- 不对外部 API 的识别质量/算法效果做优化。
- 不引入复杂的任务队列、分布式存储或权限系统（后续需要再扩展）。

## Decisions

1) 后端技术选型：Node.js + Express（或同类轻量框架）

- 理由：当前仓库已是 Node 前端工程，新增 Node 后端成本最低；开发联调方便。
- 替代方案：
  - Python FastAPI：实现简单但会引入另一套运行时与依赖管理。
  - 直接前端调用外部 API：会暴露 token，不可接受。

2) API 形态：后端提供单一入口进行上传与识别

- 计划接口：`POST /api/ocr/layout-parsing`
- 输入：`multipart/form-data`，字段 `file`（PDF/图片）
- 行为：
  - 根据文件 MIME/后缀判断 `fileType`（PDF=0，图片=1）
  - 读取为 Buffer → base64（ASCII）
  - 构造 payload：`file`、`fileType` + 可选参数（orientation/unwarp/chart）
  - 调用外部 `OCR_API_URL`，header 带 `Authorization: token <OCR_API_TOKEN>`
- 输出：默认返回外部 API 的 `result`（透传），并在错误时返回统一错误结构。

3) 密钥与配置：仅后端持有

- 环境变量：
  - `OCR_API_URL`（默认值为 layout-parsing URL）
  - `OCR_API_TOKEN`（必须配置）
  - `OCR_HTTP_TIMEOUT_MS`（可选）
- 前端开发环境：通过 Vite proxy 或同源部署访问后端，避免 CORS 与泄露。

4) 图片下载与落盘策略：默认不落盘（可选开启）

- 外部 API 结果包含 markdown 内图片 URL 与输出图 URL。
- 默认策略：后端仅返回这些 URL，由前端按需展示/下载。
- 可选策略（后续 task）：后端提供 `?persist=1` 时落盘 markdown 与图片到本地目录，并提供静态访问路径，便于审计与离线查看。

5) 可靠性：超时与错误映射

- 后端对外部 API 设置请求超时（例如 60s），并将外部非 200 响应映射为 502。
- 文件大小限制：为避免内存压力，对上传设置合理上限（例如 20MB，可配置）。

## Risks / Trade-offs

- [外部 API 不可用/网络波动] → 增加超时、清晰错误码与日志；必要时增加重试（谨慎，避免重复计费）。
- [大文件内存占用（base64 扩大体积）] → 限制文件大小；必要时考虑流式/分片（超出本次范围）。
- [token 泄露风险] → 仅在后端环境变量存储；避免在前端 bundle 中注入。
- [结果 URL 有有效期/鉴权] → 默认透传；如后续需要长期保存，启用后端下载落盘。
