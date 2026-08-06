import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export const maxDuration = 60;

const MAX_REQUEST_BYTES = 3_500_000;
const MAX_ASSET_DATA_URL_LENGTH = 1_500_000;

interface PdfRequest {
  html?: unknown;
  css?: unknown;
  filename?: unknown;
  assets?: unknown;
}

type ApiRequest = IncomingMessage & { body?: unknown };

function sendJson(response: ServerResponse, status: number, payload: object): void {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

async function readRequestBody(request: ApiRequest): Promise<PdfRequest> {
  if (request.body !== undefined) {
    if (typeof request.body === 'string') return JSON.parse(request.body) as PdfRequest;
    if (Buffer.isBuffer(request.body)) return JSON.parse(request.body.toString('utf8')) as PdfRequest;
    return request.body as PdfRequest;
  }

  const chunks: Buffer[] = [];
  let receivedBytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    receivedBytes += buffer.length;
    if (receivedBytes > MAX_REQUEST_BYTES) throw new Error('Report is too large');
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as PdfRequest;
}

function safeFilename(value: unknown): string {
  if (typeof value !== 'string') return 'weekly-plan.pdf';
  const filename = value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/[. ]+$/g, '')
    .trim();
  return (filename || 'weekly-plan.pdf').slice(0, 180).replace(/\.pdf$/i, '') + '.pdf';
}

function sanitizedHtml(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Report HTML is required');
  return value
    .replace(/<(script|iframe|object|embed|link|base)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|iframe|object|embed|link|base)\b[^>]*\/?\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

function reportHtmlWithAssets(htmlValue: unknown, assetsValue: unknown): string {
  let html = sanitizedHtml(htmlValue);
  if (!assetsValue || typeof assetsValue !== 'object' || Array.isArray(assetsValue)) return html;

  for (const [key, value] of Object.entries(assetsValue)) {
    if (!/^[a-z0-9-]{1,40}$/i.test(key)) continue;
    if (typeof value !== 'string' || value.length > MAX_ASSET_DATA_URL_LENGTH) continue;
    if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(value)) continue;
    html = html.replaceAll(`report-asset:${key}`, value);
  }

  return html;
}

function localChromePath(): string {
  if (process.platform === 'win32') return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  if (process.platform === 'darwin') return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  return '/usr/bin/google-chrome';
}

async function fontFaceCss(): Promise<string> {
  const fontDirectory = path.join(process.cwd(), 'node_modules', '@fontsource', 'assistant', 'files');
  const fontFiles = await Promise.all([
    ['400', 'assistant-hebrew-400-normal.woff2'],
    ['400', 'assistant-latin-400-normal.woff2'],
    ['700', 'assistant-hebrew-700-normal.woff2'],
    ['700', 'assistant-latin-700-normal.woff2'],
  ].map(async ([weight, filename]) => ({
    weight,
    contents: (await readFile(path.join(fontDirectory, filename))).toString('base64'),
  })));

  return fontFiles.map(({ weight, contents }) => `
    @font-face {
      font-family: 'Assistant';
      font-style: normal;
      font-weight: ${weight};
      font-display: block;
      src: url(data:font/woff2;base64,${contents}) format('woff2');
    }
  `).join('\n');
}

export default async function handler(request: ApiRequest, response: ServerResponse): Promise<void> {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const contentLength = Number(request.headers['content-length'] || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    sendJson(response, 413, { error: 'Report is too large' });
    return;
  }

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    const payload = await readRequestBody(request);
    const html = reportHtmlWithAssets(payload.html, payload.assets);
    const css = typeof payload.css === 'string' ? payload.css.slice(0, 1_000_000) : '';
    const filename = safeFilename(payload.filename);
    const isVercel = Boolean(process.env.VERCEL);

    browser = await puppeteer.launch({
      args: isVercel ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: isVercel ? await chromium.executablePath() : localChromePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', (resourceRequest) => {
      const url = resourceRequest.url();
      if (url.startsWith('data:') || url.startsWith('about:')) resourceRequest.continue();
      else resourceRequest.abort();
    });

    await page.setContent(`<!doctype html>
      <html lang="he" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <style>${css}</style>
          <style>${await fontFaceCss()}</style>
        </head>
        <body>${html}</body>
      </html>`, { waitUntil: 'load' });
    await page.emulateMediaType('print');
    await page.evaluate(() => document.fonts.ready);

    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });

    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="weekly-plan.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    response.setHeader('Cache-Control', 'no-store');
    response.end(Buffer.from(pdf));
  } catch (error) {
    console.error('PDF generation failed', error);
    sendJson(response, 500, { error: 'PDF generation failed' });
  } finally {
    await browser?.close();
  }
}
