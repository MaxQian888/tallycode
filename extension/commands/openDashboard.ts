import { commands } from 'vscode';

import { TallyCodeController } from '../controller';
import { logger } from '../logger';

import type { ExtensionContext } from 'vscode';

export const COMMAND_ID = 'tallycode.openDashboard';

export function register(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand(COMMAND_ID, () => {
      try {
        TallyCodeController.get(context).ensurePanel();
      }
      catch (err) {
        logger.error('openDashboard failed', err);
        throw err;
      }
    }),
  );
}
