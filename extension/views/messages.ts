import { Buffer } from 'node:buffer';

import { Uri, window, workspace } from 'vscode';

import { writeExport } from '../commands/exportReport';
import { TallyCodeController } from '../controller';
import { logger } from '../logger';

import type { WebviewToExtensionMessage } from '@shared/messages';
import type { ExtensionContext } from 'vscode';

type Handler<T extends WebviewToExtensionMessage['type']> = (
  msg: Extract<WebviewToExtensionMessage, { type: T }>,
  ctx: ExtensionContext,
) => void | Promise<void>;

type HandlerMap = {
  [K in WebviewToExtensionMessage['type']]?: Handler<K>;
};

const handlers: HandlerMap = {
  'log': (msg) => {
    logger[msg.level](`[webview] ${msg.message}`);
  },
  'webview/error': (msg) => {
    const stack = msg.error.stack ? `\n${msg.error.stack}` : '';
    logger.error(`[webview render] ${msg.error.name}: ${msg.error.message}${stack}`);
    window.showErrorMessage(`Webview error: ${msg.error.message}`);
  },
  'webview/ready': (_msg, ctx) => {
    logger.info('webview ready');
    // Restore last report (if any) so the panel isn't empty after reopen.
    const controller = TallyCodeController.get(ctx);
    const report = controller.getLastReport();
    if (report) {
      void controller.ensurePanel().post({ type: 'scan/done', report });
    }
    const baseline = controller.getBaseline();
    if (baseline) {
      void controller.ensurePanel().post({ type: 'baseline/loaded', baseline });
    }
    void controller.ensurePanel().post({ type: 'config/changed', config: controller.getConfig() });
  },
  'scan/start': async (msg, ctx) => {
    const controller = TallyCodeController.get(ctx);
    const uri = msg.uri ? Uri.parse(msg.uri) : undefined;
    await controller.runScan(msg.scope, uri);
  },
  'scan/refresh': async (_msg, ctx) => {
    await TallyCodeController.get(ctx).refresh();
  },
  'scan/cancel': (_msg, ctx) => {
    TallyCodeController.get(ctx).cancelScan();
  },
  'baseline/save': async (_msg, ctx) => {
    await TallyCodeController.get(ctx).saveBaseline();
  },
  'baseline/clear': async (_msg, ctx) => {
    await TallyCodeController.get(ctx).clearBaseline();
  },
  'export/png': async (msg) => {
    const data = Buffer.from(msg.pngBase64.replace(/^data:image\/png;base64,/, ''), 'base64');
    const defaultName = msg.suggestedName || `tallycode-${Date.now()}.png`;
    const target = await window.showSaveDialog({
      defaultUri: Uri.file(defaultName),
      filters: { PNG: ['png'] },
    });
    if (!target)
      return;
    await workspace.fs.writeFile(target, data);
    void window.showInformationMessage(`TallyCode: PNG saved to ${target.fsPath}`);
  },
  'export/format': async (msg, ctx) => {
    const controller = TallyCodeController.get(ctx);
    const report = controller.getLastReport();
    if (!report) {
      void window.showInformationMessage('TallyCode: run a scan first.');
      return;
    }
    await writeExport(ctx, report, msg.format, controller.getBaseline());
  },
};

export async function route(msg: WebviewToExtensionMessage, ctx: ExtensionContext): Promise<void> {
  const handler = handlers[msg.type] as Handler<typeof msg.type>;
  if (!handler) {
    logger.warn(`no handler registered for message type: ${msg.type}`);
    return;
  }
  try {
    await handler(msg as never, ctx);
  }
  catch (err) {
    logger.error(`handler for ${msg.type} threw`, err);
  }
}
