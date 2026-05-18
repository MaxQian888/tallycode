import { commands, window } from 'vscode';

import { logger } from '../logger';

import type { ExtensionContext, QuickPickItem } from 'vscode';

export const COMMAND_ID = 'tallycode.statusBarMenu';

interface MenuItem extends QuickPickItem {
  command: string;
}

const MENU: MenuItem[] = [
  {
    label: '$(file-code) Count current file',
    description: 'Scan only the active editor',
    command: 'tallycode.countFile',
  },
  {
    label: '$(list-tree) Count workspace',
    description: 'Full workspace scan',
    command: 'tallycode.countWorkspace',
  },
  {
    label: '$(graph) Open dashboard',
    description: 'Show the TallyCode panel',
    command: 'tallycode.openDashboard',
  },
  {
    label: '$(save) Save baseline',
    description: 'Snapshot current report as baseline',
    command: 'tallycode.saveBaseline',
  },
];

export function register(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand(COMMAND_ID, async () => {
      try {
        const pick = await window.showQuickPick<MenuItem>(MENU, {
          placeHolder: 'TallyCode',
          title: 'TallyCode actions',
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
