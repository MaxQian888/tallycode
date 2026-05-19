import { Buffer } from 'node:buffer';

import { Uri, workspace } from 'vscode';

import { normalizeLocale } from '../../i18n';

import type { Report } from '@shared/report';
import type { ExtensionContext } from 'vscode';

const HTML_TAG_RE = /<html\b([^>]*)>/i;
const LANG_ATTR_RE = /\blang\s*=\s*"[^"]*"/i;

/**
 * Produce a single self-contained HTML file that embeds the built webview
 * bundle and the Report JSON. Opening the file in any browser shows the
 * dashboard with no server required.
 *
 * Strategy: read `dist/webview/index.html`, inline every <script src> and
 * <link rel="stylesheet"> reference by reading the asset bytes from disk and
 * replacing with inline tags. Then inject the report JSON as a global.
 */
export async function exportHtml(context: ExtensionContext, report: Report): Promise<string> {
  const webviewDir = Uri.joinPath(context.extensionUri, 'dist', 'webview');
  const indexUri = Uri.joinPath(webviewDir, 'index.html');
  let html = await readUtf8(indexUri);

  // Inline <link rel="stylesheet" href="...">
  html = await inlineAll(
    html,
    /<link\s[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
    async (href) => {
      const css = await readUtf8(resolveAsset(webviewDir, href));
      return `<style>${css}</style>`;
    },
  );

  // Inline <script src="...">
  html = await inlineAll(
    html,
    /<script\s[^>]*src="([^"]+)"[^>]*><\/script>/g,
    async (src, fullTag) => {
      const js = await readUtf8(resolveAsset(webviewDir, src));
      const typeAttr = /type="module"/.test(fullTag) ? ' type="module"' : '';
      return `<script${typeAttr}>${js}</script>`;
    },
  );

  // Stamp the active locale onto <html> so the bundled React app boots in the
  // user's language. Both `lang` (accessibility / font fallback) and
  // `data-locale` (read by webview/i18n) are written.
  const locale = normalizeLocale();
  const bcp47 = locale === 'zh-cn' ? 'zh-CN' : 'en';
  html = html.replace(HTML_TAG_RE, (_m, attrs: string) => {
    const cleaned = attrs.replace(LANG_ATTR_RE, '').trim();
    const prefix = cleaned ? ` ${cleaned}` : '';
    return `<html${prefix} lang="${bcp47}" data-locale="${locale}">`;
  });

  // Inject report JSON as global before the bundled script reads it.
  const injection = `<script>window.__TALLYCODE_REPORT__ = ${JSON.stringify(report)};</script>`;
  html = html.replace('</head>', `${injection}</head>`);

  return html;
}

async function inlineAll(
  html: string,
  pattern: RegExp,
  replacer: (capture: string, fullTag: string) => Promise<string>,
): Promise<string> {
  const matches: Array<{ start: number; end: number; cap: string; tag: string }> = [];
  for (const m of html.matchAll(pattern)) {
    if (m.index === undefined)
      continue;
    matches.push({ start: m.index, end: m.index + m[0].length, cap: m[1]!, tag: m[0] });
  }
  const parts: string[] = [];
  let cursor = 0;
  for (const m of matches) {
    parts.push(html.slice(cursor, m.start));
    parts.push(await replacer(m.cap, m.tag));
    cursor = m.end;
  }
  parts.push(html.slice(cursor));
  return parts.join('');
}

function resolveAsset(webviewDir: Uri, href: string): Uri {
  // Strip leading ./ and /
  const cleaned = href.replace(/^[./]+/, '');
  return Uri.joinPath(webviewDir, cleaned);
}

async function readUtf8(uri: Uri): Promise<string> {
  const bytes = await workspace.fs.readFile(uri);
  return Buffer.from(bytes).toString('utf8');
}
