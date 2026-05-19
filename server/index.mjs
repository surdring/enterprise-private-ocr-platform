import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const DEFAULT_OCR_API_URL = 'https://qddeq5jcbdo0acd6.aistudio-app.com/layout-parsing';

const app = express();
app.use(cors());

console.log('[ocr-proxy] OCR_API_URL =', process.env.OCR_API_URL ?? DEFAULT_OCR_API_URL);
console.log('[ocr-proxy] OCR_HTTP_TIMEOUT_MS =', process.env.OCR_HTTP_TIMEOUT_MS ?? '(default)');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.OCR_MAX_FILE_SIZE_BYTES ?? 20 * 1024 * 1024),
  },
});

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return defaultValue;
}

function detectFileType(file) {
  const mime = (file?.mimetype ?? '').toLowerCase();
  const original = (file?.originalname ?? '').toLowerCase();

  const isPdf = mime === 'application/pdf' || original.endsWith('.pdf');
  if (isPdf) return 0;

  const isImage = mime.startsWith('image/') || [/\.png$/, /\.jpe?g$/, /\.bmp$/, /\.webp$/].some((re) => re.test(original));
  if (isImage) return 1;

  return null;
}

function buildError(code, message, details) {
  return { error: { code, message, details } };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tryParseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function callUpstreamWithRetry({ url, token, payload, timeoutMs, maxAttempts, retryBackoffMs }) {
  const attempts = Math.max(1, Number.isFinite(maxAttempts) ? maxAttempts : 1);
  const baseBackoff = Math.max(0, Number.isFinite(retryBackoffMs) ? retryBackoffMs : 0);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const upstreamResp = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (upstreamResp.ok) {
        try {
          const json = await upstreamResp.json();
          return { ok: true, json };
        } catch {
          if (attempt < attempts - 1) {
            if (baseBackoff > 0) {
              const delay = Math.min(5000, baseBackoff * Math.pow(2, attempt));
              await sleep(delay);
            }
            continue;
          }
          return { ok: false, status: upstreamResp.status, invalidJson: true };
        }
      }

      const text = await upstreamResp.text().catch(() => '');
      const parsed = tryParseJson(text);
      const retryable = upstreamResp.status === 429 || upstreamResp.status >= 500;

      if (attempt < attempts - 1 && retryable) {
        if (baseBackoff > 0) {
          const delay = Math.min(5000, baseBackoff * Math.pow(2, attempt));
          await sleep(delay);
        }
        continue;
      }

      return { ok: false, status: upstreamResp.status, text, parsed };
    } catch (e) {
      if (e?.name === 'AbortError') throw e;
      if (attempt < attempts - 1) {
        if (baseBackoff > 0) {
          const delay = Math.min(5000, baseBackoff * Math.pow(2, attempt));
          await sleep(delay);
        }
        continue;
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }
  }

  return { ok: false, status: 502, text: '', parsed: null };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/ocr/layout-parsing', upload.single('file'), async (req, res) => {
  const OCR_API_URL = process.env.OCR_API_URL ?? DEFAULT_OCR_API_URL;
  const OCR_API_TOKEN = process.env.OCR_API_TOKEN;
  const timeoutMs = Number(process.env.OCR_HTTP_TIMEOUT_MS ?? 180000);
  const maxAttempts = Number(process.env.OCR_UPSTREAM_MAX_ATTEMPTS ?? 2);
  const retryBackoffMs = Number(process.env.OCR_UPSTREAM_RETRY_BACKOFF_MS ?? 400);

  if (!OCR_API_TOKEN) {
    return res.status(500).json(buildError('CONFIG_MISSING', 'OCR_API_TOKEN is required'));
  }

  if (!req.file) {
    return res.status(400).json(buildError('FILE_MISSING', 'Upload field "file" is required'));
  }

  const fileType = detectFileType(req.file);
  if (fileType === null) {
    return res.status(400).json(buildError('UNSUPPORTED_FILE_TYPE', 'Only PDF and common image types are supported', {
      mimetype: req.file.mimetype,
      filename: req.file.originalname,
    }));
  }

  const fileBase64 = req.file.buffer.toString('base64');

  const payload = {
    file: fileBase64,
    fileType,
    useDocOrientationClassify: parseBoolean(req.body?.useDocOrientationClassify, false),
    useDocUnwarping: parseBoolean(req.body?.useDocUnwarping, false),
    useChartRecognition: parseBoolean(req.body?.useChartRecognition, false),
  };

  try {
    const upstream = await callUpstreamWithRetry({
      url: OCR_API_URL,
      token: OCR_API_TOKEN,
      payload,
      timeoutMs,
      maxAttempts,
      retryBackoffMs,
    });

    if (!upstream.ok) {
      const shouldFallback = payload?.useChartRecognition === true && Number(upstream.status ?? 0) >= 500;
      let fallback = null;
      if (shouldFallback) {
        const fallbackPayload = { ...payload, useChartRecognition: false };
        fallback = await callUpstreamWithRetry({
          url: OCR_API_URL,
          token: OCR_API_TOKEN,
          payload: fallbackPayload,
          timeoutMs,
          maxAttempts: 1,
          retryBackoffMs: 0,
        });
        if (fallback.ok) {
          const fallbackJson = fallback.json;
          if (fallbackJson && typeof fallbackJson === 'object' && 'result' in fallbackJson) {
            return res.json({ result: fallbackJson.result, _fallback: { useChartRecognition: false } });
          }
        }
      }

      if (upstream.invalidJson) {
        return res.status(502).json(buildError('UPSTREAM_INVALID_JSON', 'External OCR API returned invalid JSON', {
          upstreamStatus: upstream.status,
          fallbackAttempted: Boolean(fallback),
          fallbackStatus: fallback?.status,
        }));
      }

      const text = upstream.text ?? '';
      const snippet = text.length > 1000 ? `${text.slice(0, 1000)}...` : text;
      const details = {
        upstreamStatus: upstream.status,
        upstreamBodySnippet: snippet,
        upstreamError: upstream.parsed ?? undefined,
        fallbackAttempted: Boolean(fallback),
        fallbackStatus: fallback?.status,
        fallbackError: fallback?.parsed ?? undefined,
      };
      const logId = upstream.parsed?.logId;
      if (logId) details.upstreamLogId = logId;

      return res.status(502).json(buildError('UPSTREAM_ERROR', 'External OCR API returned non-200 response', details));
    }

    const upstreamJson = upstream.json;

    if (!upstreamJson || typeof upstreamJson !== 'object' || !('result' in upstreamJson)) {
      return res.status(502).json(buildError('UPSTREAM_INVALID_RESPONSE', 'External OCR API response missing "result" field'));
    }

    return res.json({ result: upstreamJson.result });
  } catch (e) {
    const name = e?.name ?? '';
    if (name === 'AbortError') {
      return res.status(504).json(buildError('UPSTREAM_TIMEOUT', 'External OCR API request timed out', { timeoutMs }));
    }
    return res.status(502).json(buildError('UPSTREAM_NETWORK_ERROR', 'Network error while calling external OCR API', {
      message: e?.message ?? String(e),
    }));
  }
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  const isMulter = err?.name === 'MulterError';
  if (isMulter) {
    const code = err?.code;
    if (code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json(buildError('FILE_TOO_LARGE', 'Uploaded file exceeds size limit', {
        limitBytes: Number(process.env.OCR_MAX_FILE_SIZE_BYTES ?? 20 * 1024 * 1024),
      }));
    }
    return res.status(400).json(buildError('UPLOAD_ERROR', 'File upload failed', {
      code,
      message: err?.message,
    }));
  }

  return res.status(500).json(buildError('INTERNAL_SERVER_ERROR', 'Unexpected server error', {
    message: err?.message ?? String(err),
  }));
});

const port = Number(process.env.PORT ?? 8012);
const host = process.env.HOST ?? '0.0.0.0';

app.listen(port, host, () => {
  console.log(`OCR proxy server listening on http://${host}:${port}`);
});
