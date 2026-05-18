import { Buffer } from 'node:buffer';

import { commands, Uri, window } from 'vscode';

import { TallyCodeController } from '../controller';
import { logger } from '../logger';
import { buildDiff } from '../report/diff';
import { exportCsv } from '../report/exporters/csv';
import { exportHtml } from '../report/exporters/html';
import { exportJson } from '../report/exporters/json';
import { exportMarkdown } from '../report/exporters/markdown';

import type { ExportFormat } from '@shared/messages';
import type { Report } from '@shared/report';
import type { ExtensionContext } from 'vscode';

export const COMMAND_ID = 'tallycode.exportReport';

export function register(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand(COMMAND_ID, async (preset?: ExportFormat) => {
      try {
        const controller = TallyCodeController.get(context);
        const report = controller.getLastReport();
        if (!report) {
          void window.showInformationMessage('TallyCode: run a scan first.');
          return;
        }
        const format = preset ?? await pickFormat();
        if (!format)
          return;
        await writeExport(context, report, format, controller.getBaseline());
      }
      catch (err) {
        logger.error('exportReport failed', err);
        throw err;
      }
    }),
  );
}

async function pickFormat(): Promise<ExportFormat | undefined> {
  const picked = await window.showQuickPick(
    [
      { label: 'Markdown', description: 'Tables + diff summary', value: 'md' as const },
      { label: 'CSV', description: 'Per-file rows', value: 'csv' as const },
      { label: 'JSON', description: 'Full Report payload', value: 'json' as const },
      { label: 'HTML (self-contained)', description: 'Dashboard offline viewer', value: 'html' as const },
    ],
    { placeHolder: 'Export format' },
  );
  return picked?.value;
}

export async function writeExport(
  context: ExtensionContext,
  report: Report,
  format: ExportFormat,
  baseline?: Report,
): Promise<Uri | undefined> {
  const { content, ext, filterName } = await render(context, report, format, baseline);
  const defaultName = `tallycode-${stamp()}.${ext}`;
  const target = await window.showSaveDialog({
    defaultUri: Uri.file(defaultName),
    filters: { [filterName]: [ext] },
  });
  if (!target)
    return undefined;
  await writeBytes(target, content);
  void window.showInformationMessage(`TallyCode: exported to ${target.fsPath}`);
  return target;
}

async function render(
  context: ExtensionContext,
  report: Report,
  format: ExportFormat,
  baseline?: Report,
): Promise<{ content: string | Uint8Array; ext: string; filterName: string }> {
  if (format === 'md') {
    const diff = baseline ? buildDiff(baseline, report) : undefined;
    return { content: exportMarkdown(report, diff), ext: 'md', filterName: 'Markdown' };
  }
  if (format === 'csv') {
    return { content: exportCsv(report), ext: 'csv', filterName: 'CSV' };
  }
  if (format === 'json') {
    return { content: exportJson(report), ext: 'json', filterName: 'JSON' };
  }
  return { content: await exportHtml(context, report), ext: 'html', filterName: 'HTML' };
}

async function writeBytes(target: Uri, content: string | Uint8Array): Promise<void> {
  const bytes = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
  const { workspace } = await import('vscode');
  await workspace.fs.writeFile(target, bytes);
}

function stamp(): string {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
