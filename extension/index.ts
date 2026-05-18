import { window } from 'vscode';

import { register as registerCountDirectory } from './commands/countDirectory';
import { register as registerCountFile } from './commands/countFile';
import { register as registerCountWorkspace } from './commands/countWorkspace';
import { register as registerExportReport } from './commands/exportReport';
import { register as registerOpenDashboard } from './commands/openDashboard';
import { register as registerOpenHighlight } from './commands/openHighlight';
import { register as registerSaveBaseline } from './commands/saveBaseline';
import { register as registerStatusBarMenu } from './commands/statusBarMenu';
import { TallyCodeController } from './controller';
import { logger } from './logger';
import { TallyTreeProvider, TREE_VIEW_ID } from './views/treeProvider';

import type { ExtensionContext } from 'vscode';

export function activate(context: ExtensionContext): void {
  logger.info('activating tallycode');
  // Initialize the controller eagerly so it can load baseline/cache before the
  // user runs anything.
  const controller = TallyCodeController.get(context);

  registerOpenDashboard(context);
  registerCountWorkspace(context);
  registerCountDirectory(context);
  registerCountFile(context);
  registerSaveBaseline(context);
  registerExportReport(context);
  registerStatusBarMenu(context);
  registerOpenHighlight(context);

  const treeProvider = new TallyTreeProvider({
    getLastReport: () => controller.getLastReport(),
    getBaseline: () => controller.getBaseline(),
    recentScans: controller.recentScans,
  });
  context.subscriptions.push(
    window.registerTreeDataProvider(TREE_VIEW_ID, treeProvider),
    controller.onTreeChanged(() => treeProvider.refresh()),
  );

  context.subscriptions.push({ dispose: () => logger.dispose() });
}

export function deactivate(): void {
  logger.info('deactivating tallycode');
}
