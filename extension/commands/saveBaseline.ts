import { commands } from 'vscode';

import { TallyCodeController } from '../controller';
import { logger } from '../logger';

import type { ExtensionContext } from 'vscode';

export const COMMAND_ID = 'tallycode.saveBaseline';
export const CLEAR_COMMAND_ID = 'tallycode.clearBaseline';

export function register(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand(COMMAND_ID, async () => {
      try {
        await TallyCodeController.get(context).saveBaseline();
      }
      catch (err) {
        logger.error('saveBaseline failed', err);
        throw err;
      }
    }),
    commands.registerCommand(CLEAR_COMMAND_ID, async () => {
      try {
        await TallyCodeController.get(context).clearBaseline();
      }
      catch (err) {
        logger.error('clearBaseline failed', err);
        throw err;
      }
    }),
  );
}
