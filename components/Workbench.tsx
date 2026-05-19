import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, File as FileIcon, Loader2, Download, AlertTriangle, CheckCircle, ZoomIn, ZoomOut, FileText } from 'lucide-react';
import { OCRResult } from '../types';
import clsx from 'clsx';

function normalizeText(input: string) {
  return input.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function looksLikeHtml(input: string) {
  const s = input.trim();
  if (!s) return false;
  return /<\w+[\s>]/.test(s) && /<\/(\w+)>/.test(s);
}

function htmlTableToTsv(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  if (!table) return null;

  const rows = Array.from(table.querySelectorAll('tr'));
  const lines: string[] = [];
  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll('th,td'));
    if (cells.length === 0) continue;
    const values = cells.map((c) => normalizeText(c.textContent ?? ''));
    lines.push(values.join('\t'));
  }

  const tsv = normalizeText(lines.join('\n'));
  return tsv || null;
}

function htmlToText(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return normalizeText(doc.body.textContent ?? '');
}

function extractReadableText(raw: string) {
  if (!raw) return '';
  if (!looksLikeHtml(raw)) return normalizeText(raw);

  const tsv = htmlTableToTsv(raw);
  if (tsv) return tsv;
  return htmlToText(raw);
}

function escapeCsvField(value: string) {
  const normalized = String(value ?? '');
  const escaped = normalized.replace(/"/g, '""');
  return `"${escaped}"`;
}

function downloadTextFile(filename: string, content: string, mime: string) {
  const bom = '\ufeff';
  const blob = new Blob([bom, content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildCsvFromRows(rows: string[][]) {
  return rows
    .map((row) => row.map((cell) => escapeCsvField(cell)).join(','))
    .join('\r\n');
}

function escapeHtml(value: string) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;');
}

function escapeMarkdownInline(value: string) {
  const s = String(value ?? '').replace(/\r\n/g, '\n');
  return s
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' <br/> ')
    .trim();
}

function parseTsv(tsv: string) {
  const text = normalizeText(tsv);
  const lines = text ? text.split('\n') : [];
  return lines
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() !== '')
    .map((line) => line.split('\t'));
}

function buildHtmlTableFromTsv(tsv: string, options?: { maxRows?: number; maxCols?: number }) {
  const maxRows = options?.maxRows ?? 60;
  const maxCols = options?.maxCols ?? 20;
  const matrix = parseTsv(tsv);
  if (matrix.length === 0) {
    return { html: '', truncated: false, totalRows: 0, totalCols: 0 };
  }

  const totalCols = matrix.reduce((m, r) => Math.max(m, r.length), 0);
  const limitedCols = Math.min(totalCols, maxCols);
  const limitedRows = Math.min(matrix.length, maxRows);
  const truncated = limitedRows < matrix.length || limitedCols < totalCols;

  const take = matrix.slice(0, limitedRows).map((r) => {
    const padded = [...r];
    while (padded.length < limitedCols) padded.push('');
    return padded.slice(0, limitedCols);
  });

  const header = take[0] ?? Array.from({ length: limitedCols }, (_, i) => `col_${i + 1}`);
  const body = take.length > 1 ? take.slice(1) : [];

  const th = (v: string) => `<th style="border:1px solid #e5e7eb;padding:6px 8px;background:#f8fafc;text-align:left;white-space:nowrap">${escapeHtml(v)}</th>`;
  const td = (v: string) => `<td style="border:1px solid #e5e7eb;padding:6px 8px;vertical-align:top">${escapeHtml(v)}</td>`;

  const thead = `<thead><tr>${header.map((h) => th(String(h ?? ''))).join('')}</tr></thead>`;
  const tbody = `<tbody>${body
    .map((r) => `<tr>${r.map((c) => td(String(c ?? ''))).join('')}</tr>`)
    .join('')}</tbody>`;
  const table = `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-size:12px;line-height:1.4">${thead}${tbody}</table>`;
  const wrapper = `<div style="overflow-x:auto;max-width:100%">${table}</div>`;

  return { html: wrapper, truncated, totalRows: matrix.length, totalCols };
}

function buildMarkdownTablePreviewFromTsv(tsv: string, options?: { maxRows?: number; maxCols?: number; maxCellLen?: number }) {
  const maxRows = options?.maxRows ?? 25;
  const maxCols = options?.maxCols ?? 10;
  const maxCellLen = options?.maxCellLen ?? 80;

  const matrix = parseTsv(tsv);
  if (matrix.length === 0) {
    return { md: '', truncated: false, totalRows: 0, totalCols: 0 };
  }

  const totalCols = matrix.reduce((m, r) => Math.max(m, r.length), 0);
  const limitedCols = Math.min(totalCols, maxCols);
  const limitedRows = Math.min(matrix.length, maxRows);
  const truncated = limitedRows < matrix.length || limitedCols < totalCols;

  const take = matrix.slice(0, limitedRows).map((row) => {
    const padded = [...row];
    while (padded.length < limitedCols) padded.push('');
    return padded.slice(0, limitedCols).map((c) => {
      const cell = String(c ?? '').trim();
      const short = cell.length > maxCellLen ? `${cell.slice(0, maxCellLen)}...` : cell;
      return escapeMarkdownInline(short);
    });
  });

  const header = take[0] ?? Array.from({ length: limitedCols }, (_, i) => `col_${i + 1}`);
  const body = take.length > 1 ? take.slice(1) : [];
  const headerLine = `| ${header.join(' | ')} |`;
  const sepLine = `| ${header.map(() => '---').join(' | ')} |`;
  const bodyLines = body.map((r) => `| ${r.join(' | ')} |`).join('\n');

  return {
    md: [headerLine, sepLine, bodyLines].filter(Boolean).join('\n'),
    truncated,
    totalRows: matrix.length,
    totalCols,
  };
}

function buildMarkdownRecordListFromTsv(tsv: string, options?: { maxItems?: number }) {
  const maxItems = options?.maxItems ?? 50;
  const matrix = parseTsv(tsv);
  if (matrix.length < 2) return '';

  const headers = matrix[0].map((h, i) => {
    const v = String(h ?? '').trim();
    return v || `col_${i + 1}`;
  });
  const rows = matrix.slice(1);

  const pickTitleIndex = () => {
    const candidates = ['姓名', '名称', '标题', 'name', 'title'];
    for (let i = 0; i < headers.length; i += 1) {
      const h = headers[i];
      if (candidates.some((c) => h.toLowerCase() === c.toLowerCase())) return i;
    }
    return 0;
  };

  const titleIdx = pickTitleIndex();
  const limited = rows.slice(0, maxItems);
  const lines: string[] = [];
  for (let i = 0; i < limited.length; i += 1) {
    const r = limited[i];
    const title = String(r[titleIdx] ?? '').trim() || `条目 ${i + 1}`;
    lines.push(`- **${escapeMarkdownInline(title)}**`);
    for (let j = 0; j < headers.length; j += 1) {
      const key = headers[j];
      const val = String(r[j] ?? '').trim();
      if (!val) continue;
      if (j === titleIdx) continue;
      lines.push(`  - **${escapeMarkdownInline(key)}**：${escapeMarkdownInline(val)}`);
    }
  }

  if (rows.length > maxItems) {
    lines.push('');
    lines.push(`> 条目已截断：仅展示前 ${maxItems} 条。完整数据建议导出 Table CSV。`);
  }

  return lines.join('\n');
}

function countHanChars(input: string) {
  const m = String(input ?? '').match(/[\u4e00-\u9fff]/g);
  return m ? m.length : 0;
}

function extractMarkdownHeadingText(line: string) {
  const s = String(line ?? '').trim();
  const m = s.match(/^(#{1,6})\s*(.+)$/);
  if (!m) return null;
  const text = String(m[2] ?? '').trim();
  return text ? text : null;
}

function shouldMergeChineseLine(prev: string, next: string) {
  const a = String(prev ?? '').trim();
  const b = String(next ?? '').trim();
  if (!a || !b) return false;
  if (a.startsWith('#')) return false;
  if (b.startsWith('#')) return false;
  if (extractMarkdownHeadingText(a) || extractMarkdownHeadingText(b)) return false;
  if (/^[\-\*]\s+/.test(b)) return false;
  if (/^[0-9]+[.)、]\s*/.test(b)) return false;
  if (/[。！？；：.!?;:]$/.test(a)) return false;
  if (a.length > 120) return false;

  const aHan = countHanChars(a);
  const bHan = countHanChars(b);
  const aRatio = a.length > 0 ? aHan / a.length : 0;
  const bRatio = b.length > 0 ? bHan / b.length : 0;
  if (aRatio >= 0.55 && bRatio >= 0.55) return true;
  return false;
}

function wrapLongLine(line: string, width = 80) {
  const s = String(line ?? '');
  if (s.length <= width) return [s];
  const parts: string[] = [];
  for (let i = 0; i < s.length; i += width) {
    parts.push(s.slice(i, i + width));
  }
  return parts;
}

function isHighlyRepetitiveText(input: string) {
  const s = String(input ?? '').replace(/\s+/g, '');
  if (s.length < 120) return false;

  const gram = 4;
  const limit = Math.min(600, s.length);
  const sample = s.slice(0, limit);
  const total = Math.max(0, sample.length - gram + 1);
  if (total < 40) return false;

  const set = new Set<string>();
  for (let i = 0; i < total; i += 1) {
    set.add(sample.slice(i, i + gram));
  }

  const ratio = set.size / total;
  return ratio < 0.18;
}

function collapseRepetitiveLine(line: string) {
  const s = String(line ?? '').trim();
  if (!isHighlyRepetitiveText(s)) return s;
  const head = s.slice(0, 160);
  return `${head}…（疑似 OCR 重复输出，已截断）`;
}

function collectRepeatedShortLines(pages: string[]) {
  const counts = new Map<string, number>();

  for (const page of pages) {
    const lines = normalizeText(page)
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l);

    const uniq = new Set<string>();
    for (const line of lines) {
      if (line.length < 2 || line.length > 20) continue;
      if (countHanChars(line) < 2) continue;
      if (/[0-9]/.test(line)) continue;
      uniq.add(line);
    }

    for (const line of uniq) {
      counts.set(line, (counts.get(line) ?? 0) + 1);
    }
  }

  const threshold = Math.max(6, Math.floor(pages.length * 0.15));
  const repeated = new Set<string>();
  for (const [line, n] of counts.entries()) {
    if (n >= threshold) repeated.add(line);
  }
  return repeated;
}

function formatPdfBookPageText(pageText: string, repeatedLines: Set<string>) {
  const raw = String(pageText ?? '').replace(/\t+/g, ' ');
  const parts = raw.replace(/\r\n/g, '\n').split('\n');
  const trimmedParts = parts.map((p) => p.trimEnd());
  const nonEmptyCount = trimmedParts.filter((p) => p.trim() !== '').length;
  const emptyCount = trimmedParts.length - nonEmptyCount;
  const dropEmptyLines = emptyCount >= nonEmptyCount;

  const lines: string[] = [];
  for (const p of trimmedParts) {
    const t = p;
    if (t.trim() === '') {
      if (dropEmptyLines) continue;
      if (lines.length === 0 || lines[lines.length - 1] === '') continue;
      lines.push('');
      continue;
    }
    lines.push(t.trim());
  }

  while (lines.length > 0 && repeatedLines.has(lines[0].trim())) lines.shift();
  while (lines.length > 0 && repeatedLines.has(lines[lines.length - 1].trim())) lines.pop();

  const out: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = collapseRepetitiveLine(lines[i]);
    if (!line) {
      if (out.length === 0 || out[out.length - 1] === '') continue;
      out.push('');
      continue;
    }

    const headingText = extractMarkdownHeadingText(line);
    if (headingText) {
      if (out.length > 0 && out[out.length - 1] !== '') out.push('');
      out.push(`##### ${headingText}`);
      out.push('');
      continue;
    }

    const lastIdx = out.length - 1;
    const last = lastIdx >= 0 ? out[lastIdx] : '';
    if (last && last !== '' && shouldMergeChineseLine(last, line)) {
      out[lastIdx] = `${last}${line}`;
    } else {
      if (line.length > 200) {
        out.push(...wrapLongLine(line, 80));
      } else {
        out.push(line);
      }
    }
  }

  while (out.length > 0 && out[0] === '') out.shift();
  while (out.length > 0 && out[out.length - 1] === '') out.pop();

  const normalized: string[] = [];
  for (const item of out) {
    if (item === '' && (normalized.length === 0 || normalized[normalized.length - 1] === '')) continue;
    normalized.push(item);
  }

  const nonEmptyLines = normalized.filter((l) => l.trim() !== '');
  const repetitiveLines = nonEmptyLines.filter((l) => isHighlyRepetitiveText(l));
  if (nonEmptyLines.length >= 6 && repetitiveLines.length / nonEmptyLines.length >= 0.6) {
    const kept = nonEmptyLines.slice(0, 6).join('\n');
    return `${kept}\n\n> 本页疑似识别异常：检测到大量重复内容，已自动折叠。建议回看原 PDF 或更换识别参数重试。`;
  }

  return normalized.join('\n');
}

function buildPdfPageIndex(totalPages: number, step = 10) {
  if (!Number.isFinite(totalPages) || totalPages <= 0) return '- （无）';
  const items: string[] = [];
  for (let start = 1; start <= totalPages; start += step) {
    const end = Math.min(totalPages, start + step - 1);
    const label = start === end ? `第 ${start} 页` : `第 ${start}-${end} 页`;
    items.push(`- [${label}](#第-${start}-页)`);
  }
  return items.join('\n');
}

export const Workbench: React.FC = () => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [results, setResults] = useState<Array<OCRResult & { rawText: string; fullText: string }>>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [useDocOrientationClassify, setUseDocOrientationClassify] = useState(true);
  const [useDocUnwarping, setUseDocUnwarping] = useState(false);
  const [useChartRecognition, setUseChartRecognition] = useState(false);
  const [activeResult, setActiveResult] = useState<null | { title: string; content: string }>(null);
  const [resultsPanelWidth, setResultsPanelWidth] = useState(450);
  const [exportFormat, setExportFormat] = useState<'auto' | 'csv' | 'table_csv' | 'md' | 'html' | 'json'>('auto');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<null | { startX: number; startWidth: number }>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const session = resizingRef.current;
      if (!session) return;

      const dx = e.clientX - session.startX;
      const containerWidth = workspaceRef.current?.getBoundingClientRect().width ?? 0;
      const minRight = 320;
      const minLeft = 420;
      const maxRight = containerWidth > 0 ? Math.max(minRight, containerWidth - minLeft) : 900;
      const next = Math.max(minRight, Math.min(maxRight, session.startWidth - dx));
      setResultsPanelWidth(next);
    };

    const onUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const onSplitterMouseDown = (e: React.MouseEvent) => {
    resizingRef.current = { startX: e.clientX, startWidth: resultsPanelWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
      setStatus('idle');
      setResults([]);
      setErrorMessage(null);
    }
  };

  const startProcessing = async () => {
    if (!file) return;
    setStatus('processing');
    setErrorMessage(null);
    
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('useDocOrientationClassify', String(useDocOrientationClassify));
      form.append('useDocUnwarping', String(useDocUnwarping));
      form.append('useChartRecognition', String(useChartRecognition));

      const response = await fetch('/api/ocr/layout-parsing', {
        method: 'POST',
        body: form,
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          const body = await response.json().catch(() => null);
          const code = body?.error?.code;
          const message = body?.error?.message;
          const limitBytes = body?.error?.details?.limitBytes;
          if (code === 'FILE_TOO_LARGE' && Number.isFinite(limitBytes)) {
            const limitMb = (Number(limitBytes) / 1024 / 1024).toFixed(1);
            throw new Error(t('workbench.errors.fileTooLarge', { limit: limitMb }));
          }
          if (code || message) {
            throw new Error(`${response.status}: ${code ?? 'ERROR'}${message ? ` - ${message}` : ''}`);
          }
        }

        const text = await response.text().catch(() => '');
        const msg = text ? `${response.status}: ${text}` : `${response.status}: Request failed`;
        throw new Error(msg);
      }

      const json = await response.json();
      const layoutResults = json?.result?.layoutParsingResults;

      if (!Array.isArray(layoutResults)) {
        throw new Error(t('workbench.errors.invalidResponse'));
      }

      const nextResults: Array<OCRResult & { rawText: string; fullText: string }> = layoutResults.map((res: any, index: number) => {
        const rawText: string = res?.markdown?.text ?? '';
        const fullText = extractReadableText(rawText);
        const preview = fullText.length > 600 ? `${fullText.slice(0, 600)}...` : (fullText || t('workbench.results.empty'));
        return {
          id: index + 1,
          text: preview,
          fullText,
          rawText,
          confidence: 1,
          box: [],
        };
      });

      setResults(nextResults);
      setStatus('done');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message);
      setStatus('idle');
      setResults([]);
    }
  };

  const handleExport = (format?: 'auto' | 'csv' | 'table_csv' | 'md' | 'html' | 'json') => {
    if (results.length === 0) return;

    const selected = format ?? exportFormat;
    const hasTsv = results.some((r) => (r.fullText || '').includes('\t'));
    const effective = selected === 'auto' ? (hasTsv ? 'table_csv' : 'csv') : selected;

    if (effective === 'md') {
      const generatedAt = new Date().toISOString();
      const fileName = file?.name ?? '';
      const baseName = fileName ? fileName.replace(/\.[^.]+$/i, '') : '';
      const isPdf = (file?.type ?? '').toLowerCase() === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
      const docTitle = baseName ? `${baseName}（OCR）` : fileName ? `OCR 知识库文档 - ${fileName}` : 'OCR 知识库文档';
      const tags = ['ocr', 'layout_parsing'];

      const frontmatter = [
        '---',
        `title: "${docTitle.replace(/\"/g, '\\"')}"`,
        `generatedAt: "${generatedAt}"`,
        fileName ? `sourceFile: "${fileName.replace(/\"/g, '\\"')}"` : 'sourceFile: ""',
        'tags:',
        ...tags.map((t) => `  - ${t}`),
        '---',
        '',
      ].join('\n');

      const overview = [
        `# ${docTitle}`,
        '',
        '## 概览',
        '',
        `- 生成时间：${generatedAt}`,
        file ? `- 文件类型：${file.type || '[unknown]'}` : '- 文件类型：[unknown]',
        file ? `- 文件大小：${file.size}` : '- 文件大小：[unknown]',
        `- 识别参数：方向=${useDocOrientationClassify}；矫正=${useDocUnwarping}；表格/图表=${useChartRecognition}`,
        '',
        '> 建议：如果需要把表格完整导入 Excel/系统，请同时导出 **Table CSV**；Markdown 更适合沉淀为“可检索的阅读文档”。',
        '',
      ].join('\n');

      if (isPdf) {
        const pages = results.map((r) => String(r.fullText || r.text || ''));
        const repeated = collectRepeatedShortLines(pages);
        const index = buildPdfPageIndex(results.length, 10);

        const body = results
          .map((r) => {
            const pageNo = r.id;
            const pageText = formatPdfBookPageText(String(r.fullText || r.text || ''), repeated);
            const block = [
              `#### 第 ${pageNo} 页`,
              '',
              pageText || '[empty]',
              '',
            ].join('\n');
            return block;
          })
          .join('\n---\n\n');

        const doc = [
          frontmatter,
          overview,
          '## 页码索引',
          '',
          index,
          '',
          '---',
          '',
          '## 正文',
          '',
          body,
          '',
        ].join('\n');

        downloadTextFile('ocr_kb_export.md', doc, 'text/markdown');
        return;
      }

      const tocItems = results
        .map((r) => {
          const title = `结果 ${r.id}`;
          return `- [${title}](#${title.replace(/\s+/g, '-')})`;
        })
        .join('\n');

      const toc = ['## 目录', '', tocItems || '- （无）', '', '---', ''].join('\n');

      const blocks = results
        .map((r) => {
          const content = normalizeText(r.fullText || r.text);
          const hasTab = content.includes('\t');
          const sectionTitle = `结果 ${r.id}`;

          if (hasTab) {
            const preview = buildMarkdownTablePreviewFromTsv(content, { maxRows: 25, maxCols: 10, maxCellLen: 80 });
            const recordList = buildMarkdownRecordListFromTsv(content, { maxItems: 50 });
            const isSmallTable = preview.totalRows <= 15 && preview.totalCols <= 8;
            const note = preview.truncated
              ? `> 数据量较大：总计 ${preview.totalRows} 行、${preview.totalCols} 列。知识库文档将优先输出“条目化”内容；完整表格数据建议导出 Table CSV。\n\n`
              : '';

            return [
              `## ${sectionTitle}`,
              '',
              '### 条目化（可搜索）',
              '',
              recordList || '> （无可用条目）',
              '',
              ...(isSmallTable
                ? [
                    '### 表格预览',
                    '',
                    note,
                    preview.md || '',
                    '',
                  ]
                : [note.trim() ? note.trimEnd() : '> 表格较大，已省略 Markdown 表格预览以保持知识库阅读体验。需要完整表格请导出 Table CSV。', '']),
              '---',
              '',
            ].join('\n');
          }

          const paragraphs = content
            .split('\n')
            .map((l) => l.trimEnd())
            .filter((l) => l.trim() !== '');
          const body = paragraphs.length > 0 ? paragraphs.join('\n\n') : '[empty]';

          return [
            `## ${sectionTitle}`,
            '',
            body,
            '',
            '---',
            '',
          ].join('\n');
        })
        .join('\n');

      downloadTextFile('ocr_kb_export.md', `${frontmatter}${overview}${toc}${blocks}`, 'text/markdown');
      return;
    }

    if (effective === 'json') {
      const payload = {
        file: file ? { name: file.name, type: file.type, size: file.size } : null,
        options: {
          useDocOrientationClassify,
          useDocUnwarping,
          useChartRecognition,
        },
        results: results.map((r) => ({
          id: r.id,
          confidence: r.confidence,
          text: r.text,
          fullText: r.fullText,
          rawText: r.rawText,
        })),
      };
      downloadTextFile('ocr_export.json', JSON.stringify(payload, null, 2), 'application/json');
      return;
    }

    if (effective === 'html') {
      const generatedAt = new Date().toISOString();
      const fileName = file?.name ?? '[unknown]';
      const fileType = file?.type || '[unknown]';
      const fileSize = file?.size ?? '[unknown]';

      const metaHtml = `
        <h2>导出信息</h2>
        <ul>
          <li>generatedAt: ${escapeHtml(generatedAt)}</li>
          <li>fileName: ${escapeHtml(fileName)}</li>
          <li>fileType: ${escapeHtml(fileType)}</li>
          <li>fileSize: ${escapeHtml(String(fileSize))}</li>
          <li>useDocOrientationClassify: ${escapeHtml(String(useDocOrientationClassify))}</li>
          <li>useDocUnwarping: ${escapeHtml(String(useDocUnwarping))}</li>
          <li>useChartRecognition: ${escapeHtml(String(useChartRecognition))}</li>
        </ul>
      `;

      const blocksHtml = results
        .map((r) => {
          const text = normalizeText(r.fullText || r.text);
          const hasTab = text.includes('\t');
          if (hasTab) {
            const table = buildHtmlTableFromTsv(text, { maxRows: 200, maxCols: 50 });
            const note = table.truncated
              ? `<p style="color:#b45309">预览已截断：仅展示前 200 行、前 50 列（总计 ${table.totalRows} 行、${table.totalCols} 列）。</p>`
              : '';
            return `
              <section>
                <h2>Result #${r.id}</h2>
                <h3>表格</h3>
                ${note}
                ${table.html}
                <h3>TSV（完整）</h3>
                <pre>${escapeHtml(text || '[empty]')}</pre>
              </section>
            `;
          }

          return `
            <section>
              <h2>Result #${r.id}</h2>
              <pre>${escapeHtml(text || '[empty]')}</pre>
            </section>
          `;
        })
        .join('\n');

      const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>OCR 导出 - ${escapeHtml(fileName)}</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; margin:24px; color:#0f172a;}
    h1{font-size:20px; margin:0 0 12px;}
    h2{font-size:16px; margin:20px 0 8px;}
    h3{font-size:14px; margin:12px 0 6px;}
    ul{margin:8px 0 0 18px;}
    pre{background:#0b1220; color:#e2e8f0; padding:12px; border-radius:8px; overflow:auto; white-space:pre;}
    table{width:max-content;}
    section{margin-top:18px; padding-top:12px; border-top:1px solid #e2e8f0;}
  </style>
</head>
<body>
  <h1>OCR 导出 - ${escapeHtml(fileName)}</h1>
  ${metaHtml}
  ${blocksHtml}
</body>
</html>`;

      downloadTextFile('ocr_export.html', html, 'text/html');
      return;
    }

    if (effective === 'table_csv') {
      const matrixRows: string[][] = [];
      let maxCols = 0;

      const parsed = results.map((r) => {
        const text = normalizeText(r.fullText || '');
        const lines = text ? text.split('\n') : [];
        const rows = lines.map((line) => line.split('\t'));
        for (const row of rows) maxCols = Math.max(maxCols, row.length);
        return { id: r.id, rows };
      });

      const header = ['result_id', 'row_index', ...Array.from({ length: maxCols }, (_, i) => `col_${i + 1}`)];
      matrixRows.push(header);

      for (const item of parsed) {
        item.rows.forEach((row, idx) => {
          const padded = [...row];
          while (padded.length < maxCols) padded.push('');
          matrixRows.push([String(item.id), String(idx + 1), ...padded]);
        });
      }

      const csv = buildCsvFromRows(matrixRows);
      downloadTextFile('ocr_table_export.csv', csv, 'text/csv');
      return;
    }

    // CSV
    const headers = ['ID', 'Text', 'Confidence'];
    const rows = results.map((r) => [String(r.id), r.fullText || r.text, String(r.confidence)]);
    const csv = buildCsvFromRows([headers, ...rows]);
    downloadTextFile('ocr_report_export.csv', csv, 'text/csv');
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
            <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange} 
                accept="image/png, image/jpeg, image/jpg, application/pdf"
                className="hidden"
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors border border-slate-200"
            >
                <Upload size={18} />
                {t('workbench.uploadDocument')}
            </button>
            
            {file && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                    <FileIcon size={14} className="text-blue-500" />
                    <span className="max-w-[150px] truncate">{file.name}</span>
                </div>
            )}
        </div>

        <div className="flex items-center gap-3">
             {file && status !== 'processing' && (
                <div className="hidden lg:flex items-center gap-2 text-xs text-slate-600 mr-2">
                    <label className="flex items-center gap-1.5 select-none">
                        <input
                            type="checkbox"
                            checked={useDocOrientationClassify}
                            onChange={(e) => setUseDocOrientationClassify(e.target.checked)}
                        />
                        <span>{t('workbench.options.orientation')}</span>
                    </label>
                    <label className="flex items-center gap-1.5 select-none">
                        <input
                            type="checkbox"
                            checked={useDocUnwarping}
                            onChange={(e) => setUseDocUnwarping(e.target.checked)}
                        />
                        <span>{t('workbench.options.dewarping')}</span>
                    </label>
                    <label className="flex items-center gap-1.5 select-none">
                        <input
                            type="checkbox"
                            checked={useChartRecognition}
                            onChange={(e) => setUseChartRecognition(e.target.checked)}
                        />
                        <span>{t('workbench.options.chart')}</span>
                    </label>
                </div>
             )}
             {status === 'idle' && file && (
                 <button 
                    onClick={startProcessing}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md shadow-blue-500/20 transition-all"
                >
                    <CheckCircle size={18} />
                    {t('workbench.startRecognition')}
                </button>
             )}
             
             {status === 'processing' && (
                 <div className="flex items-center gap-3 px-6 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium border border-blue-100">
                    <Loader2 size={18} className="animate-spin" />
                    <span>{t('workbench.processing')}</span>
                </div>
             )}

             {status === 'done' && (
                <div className="flex items-center gap-2">
                    <select
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value as any)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700"
                        aria-label={t('workbench.exportFormat.title')}
                    >
                        <option value="auto">{t('workbench.exportFormat.auto')}</option>
                        <option value="csv">{t('workbench.exportFormat.csv')}</option>
                        <option value="table_csv">{t('workbench.exportFormat.tableCsv')}</option>
                        <option value="md">{t('workbench.exportFormat.markdown')}</option>
                        <option value="html">{t('workbench.exportFormat.html')}</option>
                        <option value="json">{t('workbench.exportFormat.json')}</option>
                    </select>
                    <button 
                        onClick={() => handleExport()}
                        className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-md shadow-emerald-500/20 transition-all"
                    >
                        <Download size={18} />
                        {t('workbench.export')}
                    </button>
                </div>
             )}
        </div>
      </div>

      {/* Main Workspace Area */}
      <div ref={workspaceRef} className="flex-1 flex min-h-0">
        
        {/* Left Panel: Image Preview */}
        <div className="flex-1 min-w-0 bg-slate-900 rounded-xl overflow-hidden relative shadow-inner flex flex-col">
            <div className="absolute top-4 left-4 z-10 flex gap-2 bg-black/50 backdrop-blur-sm p-1.5 rounded-lg border border-white/10">
                <button onClick={() => setZoomLevel(p => Math.max(0.5, p - 0.25))} className="p-1.5 text-white hover:bg-white/20 rounded">
                    <ZoomOut size={16} />
                </button>
                 <span className="text-xs text-white font-mono flex items-center px-1">{Math.round(zoomLevel * 100)}%</span>
                <button onClick={() => setZoomLevel(p => Math.min(3, p + 0.25))} className="p-1.5 text-white hover:bg-white/20 rounded">
                    <ZoomIn size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center p-8 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
                {imagePreview ? (
                    <div 
                        style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s ease-out' }}
                        className="shadow-2xl"
                    >
                        {file?.type === 'application/pdf' || file?.name?.toLowerCase().endsWith('.pdf') ? (
                            <iframe
                                src={imagePreview}
                                title="PDF Preview"
                                className="w-[800px] h-[1000px] rounded-sm border-4 border-slate-700/50 bg-white"
                            />
                        ) : (
                            <img 
                                src={imagePreview} 
                                alt="Preview" 
                                className="max-w-none rounded-sm border-4 border-slate-700/50"
                            />
                        )}
                         {/* Overlay Boxes for detected text simulation could go here */}
                    </div>
                ) : (
                    <div className="text-slate-500 flex flex-col items-center gap-3">
                        <Upload size={48} className="opacity-20" />
                        <p>{t('workbench.preview.uploadToBegin')}</p>
                    </div>
                )}
            </div>
        </div>

        <div
            className="w-3 mx-3 flex items-center justify-center cursor-col-resize select-none"
            onMouseDown={onSplitterMouseDown}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panels"
        >
            <div className="w-1 h-24 rounded-full bg-slate-200 hover:bg-slate-300" />
        </div>

        {/* Right Panel: Results Table */}
        <div style={{ width: resultsPanelWidth }} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    {t('workbench.results.title')}
                </h3>
                {results.length > 0 && <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">{t('workbench.results.items', { count: results.length })}</span>}
            </div>

            {errorMessage && (
                <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border-b border-red-100">
                    {errorMessage}
                </div>
            )}
            
            <div className="flex-1 overflow-auto custom-scrollbar p-0">
                {results.length > 0 ? (
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 font-semibold">
                            <tr>
                                <th className="px-4 py-3 w-12 border-b">#</th>
                                <th className="px-4 py-3 border-b">{t('workbench.results.content')}</th>
                                <th className="px-4 py-3 text-right border-b">{t('workbench.results.confidence')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {results.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 group">
                                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{item.id}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="font-medium text-slate-800 whitespace-pre-wrap break-words">{item.text}</div>
                                            <div className="shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
                                                    onClick={() => setActiveResult({ title: `${t('workbench.results.fullText')} #${item.id}`, content: item.fullText || item.text })}
                                                >
                                                    {t('workbench.results.fullText')}
                                                </button>
                                                <button
                                                    className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
                                                    onClick={() => setActiveResult({ title: `${t('workbench.results.raw')} #${item.id}`, content: item.rawText || '' })}
                                                >
                                                    {t('workbench.results.raw')}
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <ConfidenceBadge value={item.confidence} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <FileText size={24} className="text-slate-300" />
                        </div>
                        <p className="text-sm">{t('workbench.results.noData')}</p>
                        <p className="text-xs mt-1 text-slate-400">{t('workbench.results.uploadAndProcess')}</p>
                    </div>
                )}
            </div>
            
            {/* Footer Summary */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 rounded-b-xl text-xs text-slate-500 flex justify-between">
                <span>{t('workbench.model')}: external_api_layout_parsing</span>
                <span>{t('workbench.latency')}: 284ms</span>
            </div>
        </div>
      </div>

      {activeResult && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={() => setActiveResult(null)}>
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="font-semibold text-slate-800">{activeResult.title}</div>
                    <button
                        className="text-sm px-3 py-1.5 rounded border border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
                        onClick={() => setActiveResult(null)}
                    >
                        {t('workbench.results.close')}
                    </button>
                </div>
                <div className="p-4 max-h-[70vh] overflow-auto">
                    <pre className="whitespace-pre-wrap break-words text-sm text-slate-800">{activeResult.content || t('workbench.results.empty')}</pre>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const ConfidenceBadge: React.FC<{ value: number }> = ({ value }) => {
    const percentage = Math.round(value * 100);
    const isLow = value < 0.9;
    
    return (
        <div className={clsx(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold",
            isLow ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
        )}>
            {isLow && <AlertTriangle size={10} />}
            {percentage}%
        </div>
    );
};