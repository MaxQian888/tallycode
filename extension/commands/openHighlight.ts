import { commands, Uri, workspace } from 'vscode';

import { TallyCodeController } from '../controller';
import { logger } from '../logger';
import { MainPanel } from '../views/panel';

import type { HighlightTarget, ScanScope } from '@shared/messages';
import type { ExtensionContext } from 'vscode';

export const COMMAND_ID = 'tallycode.tree.openHighlight';

interface HighlightArgs {
  target: HighlightTarget;
  languageId?: string;
  scope?: ScanScope | string;
  uri?: string;
}

/**
 * Open the dashboard and broadcast a `view/highlight` message so the webview
 * switches to the matching tab. Optionally re-runs a recent scan.
 */
export function register(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand(COMMAND_ID, async (args: HighlightArgs) => {
      try {
        const controller = TallyCodeController.get(context);
        controller.ensurePanel();

        if (args?.target === 'recent' && args.scope) {
          const folder = workspace.workspaceFolders?.[0];
          const uri = args.uri && folder ? Uri.joinPath(folder.uri, args.uri) : undefined;
          await controller.runScan(args.scope as ScanScope, uri);
          return;
        }

        MainPanel.currentPanel?.post({
          type: 'view/highlight',
          target: args.target,
          payload: args.languageId ? { languageId: args.languageId } : undefined,
        });
      }
      catch (err) {
        logger.error('tree.openHighlight failed', err);
        throw err;
      }
    }),
  );
}
