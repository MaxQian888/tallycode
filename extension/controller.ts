import { Buffer } from 'node:buffer';

import { CancellationTokenSource, EventEmitter, Uri, window, workspace } from 'vscode';

import { onConfigChanged, readConfig } from './config';
import { BUILTIN_LANGUAGES } from './counter/languageDefs';
import { LanguageRegistry, mergeLanguageRules } from './counter/languageRegistry';
import { DEFAULT_TEST_RULES, TestClassifier } from './counter/testClassifier';
import { buildIconPayload } from './iconTheme/iconBundler';
import { loadActiveIconTheme } from './iconTheme/themeLoader';
import { logger } from './logger';
import { buildReport } from './report/aggregator';
import { buildDiff } from './report/diff';
import { CountCache } from './scanner/cache';
import { scanSingleFile } from './scanner/fileScanner';
import { IncrementalWatcher } from './scanner/watcher';
import { scanWorkspace } from './scanner/workspaceScanner';
import { RecentScansStore } from './state/recentScans';
import { MainPanel } from './views/panel';
import { StatusBar } from './views/statusBar';

import type { ResolvedIconTheme } from './iconTheme/themeResolver';
import type { ScanScope } from '@shared/messages';
import type { FileEntry, Report, SkippedFile, TallyCodeConfig } from '@shared/report';
import type { Event, ExtensionContext, WorkspaceFolder } from 'vscode';

const BASELINE_REL_PATH = '.vscode/.tallycode/baseline.json';
const CACHE_REL_PATH = '.vscode/.tallycode/cache.json';

/**
 * Central state holder. Owns the configured engine, the current scan in
 * flight, and the cached baseline. All commands route through here.
 */
export class TallyCodeController {
  private static instance: TallyCodeController | undefined;

  static get(context: ExtensionContext): TallyCodeController {
    if (!TallyCodeController.instance) {
      TallyCodeController.instance = new TallyCodeController(context);
    }
    return TallyCodeController.instance;
  }

  private config: TallyCodeConfig;
  private registry = new LanguageRegistry(BUILTIN_LANGUAGES);
  private classifier = new TestClassifier(DEFAULT_TEST_RULES, {});
  private cache = new CountCache();
  private inFlight: CancellationTokenSource | undefined;
  private lastReport: Report | undefined;
  private baseline: Report | undefined;
  private ruleHash: string;
  private watcher: IncrementalWatcher | undefined;
  private statusBar: StatusBar | undefined;
  private iconTheme: ResolvedIconTheme | null = null;
  readonly recentScans: RecentScansStore;
  private treeChangeEmitter = new EventEmitter<void>();
  readonly onTreeChanged: Event<void> = this.treeChangeEmitter.event;

  private constructor(private context: ExtensionContext) {
    this.recentScans = new RecentScansStore(context);
    this.config = readConfig();
    this.applyConfig();
    this.ruleHash = this.computeRuleHash();
    context.subscriptions.push(
      onConfigChanged(() => this.refreshConfig()),
      workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('workbench.iconTheme'))
          void this.refreshIconTheme();
      }),
      window.onDidChangeActiveColorTheme(() => void this.refreshIconTheme()),
    );
    this.watcher = new IncrementalWatcher(uri => this.toRelative(uri));
    context.subscriptions.push(this.watcher);
    this.watcher.onStaleChanged((count) => {
      MainPanel.currentPanel?.post({ type: 'scan/stale', changedCount: count });
      this.statusBar?.setStaleCount(count);
    });
    this.statusBar = new StatusBar(this.registry, this.config.statusBar);
    context.subscriptions.push(this.statusBar);
    void this.loadBaseline();
    void this.loadCache();
    void this.refreshIconTheme();
  }

  /**
   * Reload the active VSCode file-icon theme. Triggered on activation and
   * whenever `workbench.iconTheme` or the active color theme changes (the
   * latter so light/dark variants apply). If a report is already loaded, the
   * payload is rebuilt and re-posted so existing icons swap in place.
   */
  private async refreshIconTheme(): Promise<void> {
    try {
      this.iconTheme = await loadActiveIconTheme();
    }
    catch (err) {
      logger.warn(`icon theme load failed: ${(err as Error).message}`);
      this.iconTheme = null;
    }
    if (this.lastReport)
      void this.postIconPayload(this.lastReport);
  }

  /** Build + post the icon payload for the given report. */
  async postIconPayload(report: Report): Promise<void> {
    try {
      const payload = await buildIconPayload(this.iconTheme, report.files, report.directoryTree);
      MainPanel.currentPanel?.post({ type: 'iconTheme/icons', payload });
    }
    catch (err) {
      logger.warn(`icon bundling failed: ${(err as Error).message}`);
    }
  }

  private toRelative(uri: Uri): string | undefined {
    const folder = workspace.workspaceFolders?.[0];
    if (!folder)
      return undefined;
    const root = folder.uri.fsPath.replace(/\\/g, '/');
    const target = uri.fsPath.replace(/\\/g, '/');
    if (target === root)
      return '';
    if (target.startsWith(`${root}/`))
      return target.slice(root.length + 1);
    return undefined;
  }

  /** Re-read configuration and reset engine state. */
  private refreshConfig(): void {
    this.config = readConfig();
    this.applyConfig();
    const newHash = this.computeRuleHash();
    if (newHash !== this.ruleHash) {
      this.ruleHash = newHash;
      this.cache.clear();
    }
    MainPanel.currentPanel?.post({ type: 'config/changed', config: this.config });
  }

  private applyConfig(): void {
    const merged = mergeLanguageRules(BUILTIN_LANGUAGES, this.config.languages);
    this.registry.replaceRules(merged);
    this.classifier.setRules(
      this.config.testRules.default ?? DEFAULT_TEST_RULES,
      this.config.testRules.perLanguage ?? {},
    );
    this.statusBar?.refresh(this.config.statusBar);
  }

  private computeRuleHash(): string {
    return CountCache.hashRules({
      languages: this.config.languages,
      testRules: this.config.testRules,
      markerScanLines: this.config.markerScanLines,
    });
  }

  /* --------------------------------------------------------------- */
  /* Public API                                                       */
  /* --------------------------------------------------------------- */

  ensurePanel(): MainPanel {
    return MainPanel.render(this.context);
  }

  getLastReport(): Report | undefined {
    return this.lastReport;
  }

  /** Notify external observers (Activity Bar tree) that data has changed. */
  private fireTreeChanged(): void {
    this.treeChangeEmitter.fire();
  }

  private buildScanLabel(scope: ScanScope, uri?: Uri, folder?: WorkspaceFolder): string {
    if (scope === 'workspace')
      return folder?.name ?? 'Workspace';
    const rel = folder && uri ? uriToRel(folder.uri, uri) : '';
    if (scope === 'folder')
      return rel ? `📁 ${rel}` : 'Folder';
    return rel ? `📄 ${rel}` : 'File';
  }

  private async recordRecent(scope: ScanScope, uri: Uri | undefined, folder: WorkspaceFolder | undefined): Promise<void> {
    const rel = folder && uri ? uriToRel(folder.uri, uri) : undefined;
    await this.recentScans.record({
      scope,
      uri: rel || undefined,
      label: this.buildScanLabel(scope, uri, folder),
    });
    this.fireTreeChanged();
  }

  /**
   * Run a scan for the given scope. Posts progress and result messages to the
   * current panel (creating it if absent). Cancels any prior in-flight scan.
   */
  /**
   * Re-run the last successful scan, parsing scope back into a URI from the
   * previous report. Falls back to a workspace scan when nothing has run yet.
   */
  async refresh(): Promise<Report | undefined> {
    const last = this.lastReport;
    if (!last)
      return this.runScan('workspace');
    const folder = workspace.workspaceFolders?.[0];
    if (!folder)
      return this.runScan('workspace');
    if (!last.scope)
      return this.runScan('workspace');
    if (last.scope.startsWith('folder:')) {
      const rel = last.scope.slice('folder:'.length);
      return this.runScan('folder', rel ? Uri.joinPath(folder.uri, rel) : folder.uri);
    }
    if (last.scope.startsWith('file:')) {
      const rel = last.scope.slice('file:'.length);
      return rel ? this.runScan('file', Uri.joinPath(folder.uri, rel)) : undefined;
    }
    return this.runScan('workspace');
  }

  async runScan(scope: ScanScope, uri?: Uri): Promise<Report | undefined> {
    // Multi-root: if the caller asked for a full workspace scan but did not
    // pin to a specific folder, fan out across every workspace folder and
    // merge the results. A single-folder workspace falls through to the
    // single-root path below.
    if (scope === 'workspace' && !uri) {
      const folders = workspace.workspaceFolders ?? [];
      if (folders.length > 1) {
        return this.runMultiRootScan(folders);
      }
    }

    const folder = this.resolveScanRoot(scope, uri);
    if (!folder) {
      void window.showWarningMessage('TallyCode: no workspace folder to scan.');
      return undefined;
    }
    const panel = this.ensurePanel();

    this.inFlight?.cancel();
    const tokenSource = new CancellationTokenSource();
    this.inFlight = tokenSource;

    const startedAt = Date.now();
    const scopeStr = scope === 'workspace'
      ? ''
      : scope === 'folder'
        ? `folder:${uriToRel(folder.uri, uri ?? folder.uri)}`
        : `file:${uriToRel(folder.uri, uri ?? folder.uri)}`;

    // Fast path: single file goes straight to fs.readFile, skipping findFiles.
    if (scope === 'file' && uri) {
      try {
        const rel = uriToRel(folder.uri, uri);
        const result = await scanSingleFile(uri, rel, this.config, this.registry, this.classifier);
        const entries = result.entry ? [result.entry] : [];
        const skipped = result.skipped ? [result.skipped] : [];
        const report = buildReport({
          rootPath: folder.uri.fsPath,
          scope: scopeStr,
          startedAt,
          files: entries,
          skipped,
        });
        this.lastReport = report;
        this.watcher?.reset();
        this.statusBar?.resetAfterScan();
        panel.post({ type: 'scan/done', report });
        if (this.baseline) {
          panel.post({ type: 'diff/computed', diff: buildDiff(this.baseline, report) });
        }
        void this.postIconPayload(report);
        void this.recordRecent(scope, uri, folder);
        logger.info(`single-file scan: ${rel}, ${report.durationMs}ms`);
        return report;
      }
      catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.statusBar?.setError(msg);
        panel.post({ type: 'scan/error', message: msg });
        logger.error('single-file scan failed', err);
        return undefined;
      }
      finally {
        if (this.inFlight === tokenSource)
          this.inFlight = undefined;
        tokenSource.dispose();
      }
    }

    this.statusBar?.setScanning(true);

    const pathFilter = scope === 'folder' && uri
      ? makePathFilter(folder.uri, uri, false)
      : undefined;

    // Namespace the cache when the workspace has >1 folder so identically-named
    // relative paths in different roots don't collide on cache lookups.
    const multiRoot = (workspace.workspaceFolders?.length ?? 0) > 1;
    const scopeId = multiRoot ? folder.uri.fsPath : undefined;

    try {
      const result = await scanWorkspace({
        root: folder.uri,
        config: this.config,
        registry: this.registry,
        classifier: this.classifier,
        cache: this.cache,
        ruleHash: this.ruleHash,
        token: tokenSource.token,
        pathFilter,
        scopeId,
        onProgress: (processed, total, currentFile) => {
          panel.post({ type: 'scan/progress', processed, total, currentFile });
        },
      });
      const report = buildReport({
        rootPath: result.rootPath,
        scope: scopeStr,
        startedAt,
        files: result.entries,
        skipped: result.skipped,
      });
      this.lastReport = report;
      this.watcher?.reset();
      this.statusBar?.resetAfterScan();
      panel.post({ type: 'scan/done', report });
      if (this.baseline) {
        panel.post({ type: 'diff/computed', diff: buildDiff(this.baseline, report) });
      }
      void this.postIconPayload(report);
      void this.persistCache();
      void this.recordRecent(scope, uri, folder);
      logger.info(
        `scan complete: ${result.entries.length} files, ${result.cacheHits} cache hits / ${result.cacheMisses} misses, ${report.durationMs}ms`,
      );
      return report;
    }
    catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.statusBar?.setError(msg);
      panel.post({ type: 'scan/error', message: msg });
      logger.error('scan failed', err);
      return undefined;
    }
    finally {
      if (this.inFlight === tokenSource)
        this.inFlight = undefined;
      tokenSource.dispose();
    }
  }

  cancelScan(): void {
    this.inFlight?.cancel();
  }

  /**
   * Scan every workspace folder in turn and stitch the results into a single
   * Report. Each file's path is prefixed with the folder name so the merged
   * directory tree has one top-level node per workspace folder.
   */
  private async runMultiRootScan(folders: readonly WorkspaceFolder[]): Promise<Report | undefined> {
    const panel = this.ensurePanel();
    this.inFlight?.cancel();
    const tokenSource = new CancellationTokenSource();
    this.inFlight = tokenSource;
    this.statusBar?.setScanning(true);
    const startedAt = Date.now();

    const allEntries: FileEntry[] = [];
    const allSkipped: SkippedFile[] = [];
    let totalCacheHits = 0;
    let totalCacheMisses = 0;

    try {
      for (const folder of folders) {
        if (tokenSource.token.isCancellationRequested)
          break;
        const result = await scanWorkspace({
          root: folder.uri,
          config: this.config,
          registry: this.registry,
          classifier: this.classifier,
          cache: this.cache,
          ruleHash: this.ruleHash,
          token: tokenSource.token,
          scopeId: folder.uri.fsPath,
          onProgress: (processed, total, currentFile) => {
            panel.post({
              type: 'scan/progress',
              processed,
              total,
              currentFile: currentFile ? `[${folder.name}] ${currentFile}` : `[${folder.name}]`,
            });
          },
        });
        const prefix = `${folder.name}/`;
        for (const e of result.entries) {
          allEntries.push({ ...e, path: prefix + e.path });
        }
        for (const s of result.skipped) {
          allSkipped.push({ ...s, path: prefix + s.path });
        }
        totalCacheHits += result.cacheHits;
        totalCacheMisses += result.cacheMisses;
      }

      const report = buildReport({
        rootPath: folders.map(f => f.uri.fsPath).join(';'),
        scope: '',
        startedAt,
        files: allEntries,
        skipped: allSkipped,
      });
      this.lastReport = report;
      this.watcher?.reset();
      this.statusBar?.resetAfterScan();
      panel.post({ type: 'scan/done', report });
      if (this.baseline) {
        panel.post({ type: 'diff/computed', diff: buildDiff(this.baseline, report) });
      }
      void this.postIconPayload(report);
      void this.persistCache();
      void this.recentScans.record({
        scope: 'workspace',
        label: `Multi-root (${folders.length})`,
      }).then(() => this.fireTreeChanged());
      logger.info(
        `multi-root scan complete: ${folders.length} folders, ${allEntries.length} files, ${totalCacheHits} hits / ${totalCacheMisses} misses, ${report.durationMs}ms`,
      );
      return report;
    }
    catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.statusBar?.setError(msg);
      panel.post({ type: 'scan/error', message: msg });
      logger.error('multi-root scan failed', err);
      return undefined;
    }
    finally {
      if (this.inFlight === tokenSource)
        this.inFlight = undefined;
      tokenSource.dispose();
    }
  }

  async saveBaseline(): Promise<void> {
    if (!this.lastReport) {
      void window.showInformationMessage('TallyCode: run a scan first.');
      return;
    }
    const folder = workspace.workspaceFolders?.[0];
    if (!folder)
      return;
    const uri = Uri.joinPath(folder.uri, BASELINE_REL_PATH);
    await writeJson(uri, this.lastReport);
    this.baseline = this.lastReport;
    MainPanel.currentPanel?.post({ type: 'baseline/loaded', baseline: this.baseline });
    MainPanel.currentPanel?.post({
      type: 'diff/computed',
      diff: buildDiff(this.baseline, this.lastReport),
    });
    this.fireTreeChanged();
    void window.showInformationMessage('TallyCode: baseline saved.');
  }

  async clearBaseline(): Promise<void> {
    const folder = workspace.workspaceFolders?.[0];
    if (folder) {
      try {
        await workspace.fs.delete(Uri.joinPath(folder.uri, BASELINE_REL_PATH));
      }
      catch {
        // No baseline file, fine.
      }
    }
    this.baseline = undefined;
    MainPanel.currentPanel?.post({ type: 'baseline/loaded', baseline: null });
    MainPanel.currentPanel?.post({ type: 'diff/computed', diff: null });
    this.fireTreeChanged();
  }

  getBaseline(): Report | undefined {
    return this.baseline;
  }

  getConfig(): TallyCodeConfig {
    return this.config;
  }

  private async loadBaseline(): Promise<void> {
    const folder = workspace.workspaceFolders?.[0];
    if (!folder)
      return;
    const uri = Uri.joinPath(folder.uri, BASELINE_REL_PATH);
    try {
      const bytes = await workspace.fs.readFile(uri);
      const parsed = JSON.parse(Buffer.from(bytes).toString('utf8')) as Report;
      if (parsed && parsed.schemaVersion === 1) {
        this.baseline = parsed;
        MainPanel.currentPanel?.post({ type: 'baseline/loaded', baseline: parsed });
        this.fireTreeChanged();
      }
    }
    catch {
      // No baseline yet.
    }
  }

  private async loadCache(): Promise<void> {
    const folder = workspace.workspaceFolders?.[0];
    if (!folder)
      return;
    const uri = Uri.joinPath(folder.uri, CACHE_REL_PATH);
    try {
      const bytes = await workspace.fs.readFile(uri);
      const parsed = JSON.parse(Buffer.from(bytes).toString('utf8'));
      this.cache = CountCache.fromJSON(parsed);
    }
    catch {
      // No cache yet.
    }
  }

  private async persistCache(): Promise<void> {
    const folder = workspace.workspaceFolders?.[0];
    if (!folder)
      return;
    const uri = Uri.joinPath(folder.uri, CACHE_REL_PATH);
    try {
      await writeJson(uri, this.cache.toJSON());
    }
    catch (err) {
      logger.warn(`failed to persist cache: ${(err as Error).message}`);
    }
  }

  private resolveScanRoot(scope: ScanScope, uri?: Uri): WorkspaceFolder | undefined {
    const folders = workspace.workspaceFolders ?? [];
    if (folders.length === 0)
      return undefined;
    if (scope === 'workspace') {
      // Honor a caller-supplied folder URI (e.g. from the multi-root picker)
      // so the scan targets the folder the user chose rather than folders[0].
      if (uri)
        return workspace.getWorkspaceFolder(uri) ?? folders[0];
      return folders[0];
    }
    if ((scope === 'folder' || scope === 'file') && uri) {
      return workspace.getWorkspaceFolder(uri) ?? folders[0];
    }
    return folders[0];
  }
}

async function writeJson(uri: Uri, value: unknown): Promise<void> {
  const dirUri = Uri.joinPath(uri, '..');
  try {
    await workspace.fs.createDirectory(dirUri);
  }
  catch {
    // exists
  }
  await workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(value, null, 2), 'utf8'));
}

function uriToRel(rootUri: Uri, targetUri: Uri): string {
  const root = rootUri.fsPath.replace(/\\/g, '/');
  const target = targetUri.fsPath.replace(/\\/g, '/');
  if (target.startsWith(`${root}/`))
    return target.slice(root.length + 1);
  if (target === root)
    return '';
  return target;
}

function makePathFilter(rootUri: Uri, scopeUri: Uri, isFile: boolean): (rel: string) => boolean {
  const rel = uriToRel(rootUri, scopeUri);
  if (!rel)
    return () => true;
  if (isFile)
    return (p: string) => p === rel;
  const prefix = `${rel}/`;
  return (p: string) => p === rel || p.startsWith(prefix);
}
