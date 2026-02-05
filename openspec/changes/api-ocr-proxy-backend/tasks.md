## 1. Backend setup

- [x] 1.1 Add backend dependencies (express, multer, dotenv, cors)
- [x] 1.2 Add backend dev/start scripts to package.json
- [x] 1.3 Add Vite dev proxy to forward /api requests to backend

## 2. OCR proxy core implementation

- [x] 2.1 Implement backend server entry (listen port, health endpoint)
- [x] 2.2 Implement config loading (OCR_API_URL, OCR_API_TOKEN, timeout)
- [x] 2.3 Implement file upload handling and fileType detection (PDF=0, image=1)
- [x] 2.4 Implement external API call (base64 payload, headers, optional flags)
- [x] 2.5 Implement stable error mapping for missing file, unsupported type, upstream timeout, upstream non-200

## 3. Frontend integration

- [x] 3.1 Replace mock processing in Workbench with real API call to backend
- [x] 3.2 Render key returned results (at minimum: show success/failure and basic extracted content)

## 4. Configuration & verification

- [x] 4.1 Document required env vars and local run steps (OCR_API_URL/OCR_API_TOKEN)
- [x] 4.2 Provide a minimal curl example to test backend upload endpoint
