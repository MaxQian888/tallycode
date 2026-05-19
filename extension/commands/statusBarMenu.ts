import { commands, l10n, window } from 'vscode';

import { logger } from '../logger';

import type { ExtensionContext, QuickPickItem } from 'vscode';

export const COMMAND_ID = 'tallycode.statusBarMenu';

interface MenuItem extends QuickPickItem {
  command: string;
}

function buildMenu(): MenuItem[] {
  return [
    {
      label: `$(file-code) ${l10n.t('Count current file')}`,
      description: l10n.t('Scan only the active editor'),
      command: 'tallycode.countFile',
    },
    {
      label: `$(list-tree) ${l10n.t('Count workspace')}`,
      description: l10n.t('Full workspace scan'),
      command: 'tallycode.countWorkspace',
    },
    {
      label: `$(graph) ${l10n.t('Open dashboard')}`,
      description: l10n.t('Show the TallyCode panel'),
      command: 'tallycode.openDashboard',
    },
    {
      label: `$(save) ${l10n.t('Save baseline')}`,
      description: l10n.t('Snapshot current report as baseline'),
      command: 'tallycode.saveBaseline',
    },
  ];
}

export function register(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand(COMMAND_ID, async () => {
      try {
        const pick = await window.showQuickPick<MenuItem>(buildMenu(), {
          placeHolder: 'TallyCode',
          title: l10n.t('TallyCode actions'),
        });
        if (!pick)
          return;
        await commands.executeCommand(pick.command);
      }
      catch (err) {
        logger.error('statusBarMenu failed', err);
        throw err;
      }
    }),
  );
}
