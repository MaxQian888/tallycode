import { commands, l10n, window, workspace } from 'vscode';

import { TallyCodeController } from '../controller';
import { logger } from '../logger';

import type { ExtensionContext, Uri, WorkspaceFolder } from 'vscode';

export const COMMAND_ID = 'tallycode.countWorkspace';

const ALL_FOLDERS_VALUE = '__all__';

export function register(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand(COMMAND_ID, async () => {
      try {
        const target = await pickWorkspaceTarget();
        if (target === 'cancelled')
          return;
        const controller = TallyCodeController.get(context);
        controller.ensurePanel();
        await controller.runScan('workspace', target);
      }
      catch (err) {
        logger.error('countWorkspace failed', err);
        throw err;
      }
    }),
  );
}

/**
 * Resolve which workspace folder(s) to scan. Returns:
 *  - `undefined` for "all folders" (single- or multi-root)
 *  - a `Uri` for a specific workspace folder
 *  - `'cancelled'` if the user dismissed the picker
 */
async function pickWorkspaceTarget(): Promise<Uri | undefined | 'cancelled'> {
  const folders: readonly WorkspaceFolder[] = workspace.workspaceFolders ?? [];
  if (folders.length <= 1)
    return undefined;
  const picked = await window.showQuickPick(
    [
      {
        label: `$(folder-library) ${l10n.t('All folders')}`,
        description: l10n.t('Scan every workspace folder ({0})', folders.length),
        value: ALL_FOLDERS_VALUE,
      },
      ...folders.map(f => ({
        label: `$(folder) ${f.name}`,
        description: f.uri.fsPath,
        value: f.uri.toString(),
      })),
    ],
    { placeHolder: l10n.t('Multi-root workspace — choose what to scan') },
  );
  if (!picked)
    return 'cancelled';
  if (picked.value === ALL_FOLDERS_VALUE)
    return undefined;
  return folders.find(f => f.uri.toString() === picked.value)?.uri;
}
