import { commands, Uri } from 'vscode';

import { TallyCodeController } from '../controller';
import { logger } from '../logger';

import type { ExtensionContext } from 'vscode';

export const COMMAND_ID = 'tallycode.countDirectory';

export function register(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand(COMMAND_ID, async (folder?: Uri) => {
      try {
        const controller = TallyCodeController.get(context);
        controller.ensurePanel();
        await controller.runScan('folder', folder instanceof Uri ? folder : undefined);
      }
      catch (err) {
        logger.error('countDirectory failed', err);
        throw err;
      }
    }),
  );
}
