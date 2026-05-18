import type { ScanScope } from '@shared/messages';
import type { ExtensionContext } from 'vscode';

const KEY = 'tallycode.recentScans';
const MAX_ENTRIES = 5;

export interface RecentScan {
  scope: ScanScope;
  /** Workspace-relative URI string for folder/file scopes; empty for workspace. */
  uri?: string;
  scannedAt: number;
  /** Pre-computed display label (avoids re-deriving on every TreeView render). */
  label: string;
}

/**
 * Persist a rolling list of recent scans to workspaceState. Each workspace
 * keeps its own list so paths from one workspace don't leak into another.
 */
export class RecentScansStore {
  constructor(private context: ExtensionContext) {}

  list(): RecentScan[] {
    const raw = this.context.workspaceState.get<RecentScan[]>(KEY, []);
    return Array.isArray(raw) ? raw : [];
  }

  /** Push a new entry to the front, de-duplicate by scope+uri, cap at MAX_ENTRIES. */
  async record(scan: Omit<RecentScan, 'scannedAt'> & { scannedAt?: number }): Promise<void> {
    const entry: RecentScan = {
      ...scan,
      scannedAt: scan.scannedAt ?? Date.now(),
    };
    const existing = this.list().filter(
      e => !(e.scope === entry.scope && (e.uri ?? '') === (entry.uri ?? '')),
    );
    const next = [entry, ...existing].slice(0, MAX_ENTRIES);
    await this.context.workspaceState.update(KEY, next);
  }

  async clear(): Promise<void> {
    await this.context.workspaceState.update(KEY, []);
  }
}
