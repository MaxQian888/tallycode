import { EventEmitter, ThemeIcon, TreeItem, TreeItemCollapsibleState } from 'vscode';

import { iconFor } from '../counter/languageIcons';

import type { RecentScansStore } from '../state/recentScans';
import type { Report } from '@shared/report';
import type { Event, ProviderResult, TreeDataProvider } from 'vscode';

export type TreeNode
  = | { kind: 'root-recent' }
    | { kind: 'root-languages' }
    | { kind: 'root-baseline' }
    | { kind: 'recent-entry'; index: number; label: string; description: string; scope: string; uri?: string }
    | { kind: 'language-entry'; languageId: string; files: number; code: number }
    | { kind: 'baseline-info'; savedAt: string; totalFiles: number; totalCode: number }
    | { kind: 'baseline-empty' }
    | { kind: 'placeholder'; message: string };

export const TREE_VIEW_ID = 'tallycode.explorer';

interface TreeDataSource {
  getLastReport: () => Report | undefined;
  getBaseline: () => Report | undefined;
  recentScans: RecentScansStore;
}

/**
 * Activity Bar tree: three top-level nodes (Recent / Languages / Baseline).
 * Click leaves to navigate the Dashboard via the `tallycode.tree.openHighlight`
 * command, which posts a `view/highlight` message to the webview.
 */
export class TallyTreeProvider implements TreeDataProvider<TreeNode> {
  private _emitter = new EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData: Event<TreeNode | undefined> = this._emitter.event;

  constructor(private source: TreeDataSource) {}

  refresh(): void {
    this._emitter.fire(undefined);
  }

  getTreeItem(node: TreeNode): TreeItem {
    switch (node.kind) {
      case 'root-recent': {
        const item = new TreeItem('Recent scans', TreeItemCollapsibleState.Expanded);
        item.iconPath = new ThemeIcon('history');
        item.contextValue = 'tallycode.root.recent';
        return item;
      }
      case 'root-languages': {
        const item = new TreeItem('Languages', TreeItemCollapsibleState.Expanded);
        item.iconPath = new ThemeIcon('symbol-namespace');
        item.contextValue = 'tallycode.root.languages';
        return item;
      }
      case 'root-baseline': {
        const item = new TreeItem('Baseline', TreeItemCollapsibleState.Expanded);
        item.iconPath = new ThemeIcon('bookmark');
        item.contextValue = 'tallycode.root.baseline';
        return item;
      }
      case 'recent-entry': {
        const item = new TreeItem(node.label, TreeItemCollapsibleState.None);
        item.description = node.description;
        item.iconPath = new ThemeIcon('clock');
        item.contextValue = 'tallycode.recent.entry';
        item.command = {
          command: 'tallycode.tree.openHighlight',
          title: 'Re-run scan',
          arguments: [{ target: 'recent', scope: node.scope, uri: node.uri }],
        };
        return item;
      }
      case 'language-entry': {
        const item = new TreeItem(node.languageId, TreeItemCollapsibleState.None);
        item.description = `${node.files} file${node.files === 1 ? '' : 's'} · ${node.code.toLocaleString('en-US')} loc`;
        item.iconPath = new ThemeIcon(iconFor(node.languageId));
        item.contextValue = 'tallycode.language.entry';
        item.command = {
          command: 'tallycode.tree.openHighlight',
          title: 'Show language',
          arguments: [{ target: 'languages', languageId: node.languageId }],
        };
        return item;
      }
      case 'baseline-info': {
        const item = new TreeItem(`Saved ${formatRelative(node.savedAt)}`, TreeItemCollapsibleState.None);
        item.description = `${node.totalFiles} files · ${node.totalCode.toLocaleString('en-US')} loc`;
        item.iconPath = new ThemeIcon('bookmark');
        item.contextValue = 'tallycode.baseline.info';
        item.command = {
          command: 'tallycode.tree.openHighlight',
          title: 'Open diff',
          arguments: [{ target: 'baseline' }],
        };
        return item;
      }
      case 'baseline-empty': {
        const item = new TreeItem('No baseline saved', TreeItemCollapsibleState.None);
        item.iconPath = new ThemeIcon('bookmark');
        item.contextValue = 'tallycode.baseline.empty';
        item.description = 'Save one from the dashboard';
        return item;
      }
      case 'placeholder': {
        const item = new TreeItem(node.message, TreeItemCollapsibleState.None);
        item.iconPath = new ThemeIcon('info');
        return item;
      }
    }
  }

  getChildren(node?: TreeNode): ProviderResult<TreeNode[]> {
    if (!node) {
      return [
        { kind: 'root-recent' },
        { kind: 'root-languages' },
        { kind: 'root-baseline' },
      ];
    }

    if (node.kind === 'root-recent') {
      const entries = this.source.recentScans.list();
      if (entries.length === 0) {
        return [{ kind: 'placeholder', message: 'No scans yet' }];
      }
      return entries.map((entry, index) => ({
        kind: 'recent-entry' as const,
        index,
        label: entry.label,
        description: formatRelative(new Date(entry.scannedAt).toISOString()),
        scope: entry.scope,
        uri: entry.uri,
      }));
    }

    if (node.kind === 'root-languages') {
      const report = this.source.getLastReport();
      if (!report || report.languages.length === 0) {
        return [{ kind: 'placeholder', message: 'Run a scan to see languages' }];
      }
      return report.languages.slice(0, 20).map(lang => ({
        kind: 'language-entry' as const,
        languageId: lang.language,
        files: lang.files,
        code: lang.total.code,
      }));
    }

    if (node.kind === 'root-baseline') {
      const baseline = this.source.getBaseline();
      if (!baseline) {
        return [{ kind: 'baseline-empty' }];
      }
      return [{
        kind: 'baseline-info' as const,
        savedAt: baseline.scannedAt,
        totalFiles: baseline.summary.totalFiles,
        totalCode: baseline.summary.total.code,
      }];
    }

    return [];
  }
}

function formatRelative(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t))
    return iso;
  const seconds = Math.round((Date.now() - t) / 1000);
  if (seconds < 60)
    return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60)
    return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24)
    return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
