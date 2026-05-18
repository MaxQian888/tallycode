import { Uri, ViewColumn, window } from 'vscode';

import { logger } from '../logger';

import { WebviewHelper } from './helper';

import type { ExtensionToWebviewMessage } from '@shared/messages';
import type { Disposable, ExtensionContext, WebviewPanel } from 'vscode';

const VIEW_TYPE = 'tallycode.dashboard';
const TITLE = 'TallyCode Dashboard';

export class MainPanel {
  static currentPanel: MainPanel | undefined;
  private readonly _panel: WebviewPanel;
  private readonly _context: ExtensionContext;
  private _disposables: Disposable[] = [];

  private constructor(panel: WebviewPanel, context: ExtensionContext) {
    this._panel = panel;
    this._context = context;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = WebviewHelper.setupHtml(this._panel.webview, context);
    WebviewHelper.setupHooks(this._panel.webview, context, this._disposables);
  }

  static render(context: ExtensionContext): MainPanel {
    if (MainPanel.currentPanel) {
      MainPanel.currentPanel._panel.reveal(ViewColumn.One);
      return MainPanel.currentPanel;
    }
    const dev = !!process.env.VITE_DEV_SERVER_URL;
    const distRoot = Uri.joinPath(context.extensionUri, 'dist');
    const panel = window.createWebviewPanel(VIEW_TYPE, TITLE, ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: dev ? undefined : [distRoot],
    });
    MainPanel.currentPanel = new MainPanel(panel, context);
    return MainPanel.currentPanel;
  }

  post(msg: ExtensionToWebviewMessage): Thenable<boolean> {
    return this._panel.webview.postMessage(msg);
  }

  dispose(): void {
    logger.info('disposing MainPanel');
    MainPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      this._disposables.pop()?.dispose();
    }
  }
}
