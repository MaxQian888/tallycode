import getWebviewHtml from 'virtual:vscode';

import { route } from './messages';

import type { WebviewToExtensionMessage } from '@shared/messages';
import type { Disposable, ExtensionContext, Webview } from 'vscode';

export class WebviewHelper {
  static setupHtml(webview: Webview, context: ExtensionContext): string {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    return getWebviewHtml({ serverUrl: devServerUrl, webview, context });
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
