import getWebviewHtml from 'virtual:vscode';

import { normalizeLocale } from '../i18n';

import { route } from './messages';

import type { WebviewToExtensionMessage } from '@shared/messages';
import type { Disposable, ExtensionContext, Webview } from 'vscode';

const HTML_TAG_RE = /<html\b([^>]*)>/i;
const LANG_ATTR_RE = /\blang\s*=\s*"[^"]*"/i;

/**
 * Inject `lang` and `data-locale` attributes on the <html> tag so the React
 * bundle can read the locale synchronously before mounting. Using a data
 * attribute (rather than an inline <script>) avoids strict-CSP nonce issues
 * inside the webview iframe.
 */
function injectLocale(html: string, locale: 'en' | 'zh-cn'): string {
  const bcp47 = locale === 'zh-cn' ? 'zh-CN' : 'en';
  return html.replace(HTML_TAG_RE, (_match, attrs: string) => {
    const cleaned = attrs.replace(LANG_ATTR_RE, '').trim();
    const prefix = cleaned ? ` ${cleaned}` : '';
    return `<html${prefix} lang="${bcp47}" data-locale="${locale}">`;
  });
}

export class WebviewHelper {
  static setupHtml(webview: Webview, context: ExtensionContext): string {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    const html = getWebviewHtml({ serverUrl: devServerUrl, webview, context });
    return injectLocale(html, normalizeLocale());
  }

  static setupHooks(webview: Webview, context: ExtensionContext, disposables: Disposable[]): void {
    webview.onDidReceiveMessage(
      (msg: WebviewToExtensionMessage) => {
        void route(msg, context);
      },
      undefined,
      disposables,
    );
  }
}
