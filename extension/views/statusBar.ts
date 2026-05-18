import { MarkdownString, StatusBarAlignment, ThemeColor, window, workspace } from 'vscode';

import { countLines } from '../counter/lineCounter';

import { computeStatusBar } from './statusBarFormat';

import type { LanguageRegistry } from '../counter/languageRegistry';
import type { CountResult, LanguageRule, TallyCodeConfig } from '@shared/report';
import type { Disposable, StatusBarItem, TextDocument, TextEditor } from 'vscode';

const STATUS_COMMAND = 'tallycode.statusBarMenu';

/**
 * Status bar item showing the active file's code/comment/blank line counts
 * with a state machine for loading / stale / error / unsupported.
 *
 * The visual layout is driven by `computeStatusBar()` in
 * `./statusBarFormat`, which is a pure function unit-tested in isolation.
 * This class only owns the vscode integration: lifecycle, debounce, event
 * subscriptions, and ThemeColor mapping.
 */
export class StatusBar implements Disposable {
  private item: StatusBarItem;
  private disposables: Disposable[] = [];

  private scanning = false;
  private staleCount = 0;
  private errorMessage: string | null = null;
  private statusBarConfig: TallyCodeConfig['statusBar'];

  constructor(
    private registry: LanguageRegistry,
    config: TallyCodeConfig['statusBar'],
  ) {
    this.statusBarConfig = config;
    this.item = window.createStatusBarItem(STATUS_COMMAND, StatusBarAlignment.Right, 80);
    this.item.command = STATUS_COMMAND;
    this.item.accessibilityInformation = { label: 'TallyCode status', role: 'button' };
    this.render(window.activeTextEditor);

    this.disposables.push(
      this.item,
      window.onDidChangeActiveTextEditor(ed => this.render(ed)),
      workspace.onDidChangeTextDocument((e) => {
        const active = window.activeTextEditor;
        if (active && e.document === active.document) {
          this.debouncedRender(active);
        }
      }),
    );
  }

  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private debouncedRender(editor: TextEditor): void {
    if (this.debounceTimer)
      clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.render(editor), 200);
  }

  private isCountable(doc: TextDocument): boolean {
    return doc.uri.scheme === 'file' || doc.uri.scheme === 'untitled';
  }

  /** Call when language rules or status-bar config changes. */
  refresh(config?: TallyCodeConfig['statusBar']): void {
    if (config)
      this.statusBarConfig = config;
    this.render(window.activeTextEditor);
  }

  /** Called by the controller when a workspace/folder scan starts. */
  setScanning(scanning: boolean): void {
    this.scanning = scanning;
    if (scanning)
      this.errorMessage = null;
    this.render(window.activeTextEditor);
  }

  setError(message: string | null): void {
    this.errorMessage = message;
    this.scanning = false;
    this.render(window.activeTextEditor);
  }

  setStaleCount(count: number): void {
    this.staleCount = count;
    this.render(window.activeTextEditor);
  }

  /** Reset after a successful scan: clear error + stale. */
  resetAfterScan(): void {
    this.errorMessage = null;
    this.scanning = false;
    this.staleCount = 0;
    this.render(window.activeTextEditor);
  }

  private render(editor: TextEditor | undefined): void {
    if (!this.statusBarConfig.enabled) {
      this.item.hide();
      return;
    }

    let fileRule: LanguageRule | null = null;
    let fileCount: CountResult | null = null;
    if (editor && this.isCountable(editor.document)) {
      const rule = this.registry.resolve(editor.document.uri.fsPath);
      if (rule) {
        fileRule = rule;
        fileCount = countLines(editor.document.getText(), rule);
      }
    }

    const result = computeStatusBar({
      fileRule,
      fileCount,
      scanning: this.scanning,
      staleCount: this.staleCount,
      errorMessage: this.errorMessage,
      format: this.statusBarConfig.format,
      showLanguageIcon: this.statusBarConfig.showLanguageIcon,
    });

    if (result.hidden) {
      this.item.hide();
      return;
    }

    this.item.text = result.text;
    this.item.tooltip = new MarkdownString(result.tooltipLines.join('\n\n'));
    this.item.accessibilityInformation = {
      label: result.accessibilityLabel,
      role: 'button',
    };
    this.item.backgroundColor = result.background === 'error'
      ? new ThemeColor('statusBarItem.errorBackground')
      : result.background === 'warning'
        ? new ThemeColor('statusBarItem.warningBackground')
        : undefined;
    this.item.show();
  }

  dispose(): void {
    while (this.disposables.length) this.disposables.pop()?.dispose();
  }
}
