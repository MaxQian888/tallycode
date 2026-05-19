import { commands, l10n, Uri, window } from 'vscode';

import { TallyCodeController } from '../controller';
import { logger } from '../logger';

import type { ExtensionContext } from 'vscode';

export const COMMAND_ID = 'tallycode.countFile';

export function register(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand(COMMAND_ID, async (target?: Uri) => {
      try {
        const fileUri = target instanceof Uri
          ? target
          : window.activeTextEditor?.document.uri;
        if (!fileUri) {
          void window.showWarningMessage(l10n.t('TallyCode: no active file to count.'));
          return;
        }
        const controller = TallyCodeController.get(context);
        controller.ensurePanel();
        await controller.runScan('file', fileUri);
      }
      catch (err) {
        logger.error('countFile failed', err);
        throw err;
      }
    }),
  );
}
