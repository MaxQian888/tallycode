import { workspace } from 'vscode';

import type { Disposable, Uri } from 'vscode';

/**
 * Tracks file system events and surfaces a "stale" set of changed paths so
 * the controller can notify the webview that the current report is out of
 * date. Does not auto-rescan — that decision belongs to the user.
 */
export class IncrementalWatcher implements Disposable {
  private disposables: Disposable[] = [];
  private staleSet: Set<string> = new Set();
  private listeners: Array<(count: number) => void> = [];

  constructor(private toRelative: (uri: Uri) => string | undefined) {
    const fsw = workspace.createFileSystemWatcher('**/*');
    this.disposables.push(
      fsw,
      fsw.onDidChange(uri => this.flag(uri)),
      fsw.onDidCreate(uri => this.flag(uri)),
      fsw.onDidDelete(uri => this.flag(uri)),
    );
  }

  /** Subscribe to stale-count changes. Returns an unsubscribe. */
  onStaleChanged(cb: (count: number) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  staleCount(): number {
    return this.staleSet.size;
  }

  /** Reset after a successful scan. */
  reset(): void {
    if (this.staleSet.size === 0)
      return;
    this.staleSet.clear();
    for (const cb of this.listeners) cb(0);
  }

  dispose(): void {
    while (this.disposables.length) this.disposables.pop()?.dispose();
    this.listeners = [];
  }

  private flag(uri: Uri): void {
    const rel = this.toRelative(uri);
    if (!rel)
      return;
    const before = this.staleSet.size;
    this.staleSet.add(rel);
    if (this.staleSet.size !== before) {
      for (const cb of this.listeners) cb(this.staleSet.size);
    }
  }
}
