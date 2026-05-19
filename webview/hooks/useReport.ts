import i18n from 'i18next';
import { useEffect, useState } from 'react';

import { useVscodeMessage } from './useVscodeMessage';

import type { IconThemePayload, ScanScope } from '@shared/messages';
import type { DiffReport, Report, TallyCodeConfig } from '@shared/report';

const EMPTY_ICON_THEME: IconThemePayload = {
  active: false,
  icons: {},
  fileIcons: {},
  folderIcons: {},
};

export interface ScanProgress {
  processed: number;
  total: number;
  currentFile?: string;
}

export interface LastScan {
  scope: ScanScope;
  uri?: string;
}

export interface ReportState {
  report: Report | null;
  baseline: Report | null;
  diff: DiffReport | null;
  config: TallyCodeConfig | null;
  progress: ScanProgress | null;
  error: string | null;
  staleCount: number;
  /** Scope of the most recent successful scan (so the Refresh button can re-trigger). */
  lastScan: LastScan | null;
  /** Icons resolved from the user's active VSCode icon theme. */
  iconTheme: IconThemePayload;
}

const INITIAL: ReportState = {
  report: null,
  baseline: null,
  diff: null,
  config: null,
  progress: null,
  error: null,
  staleCount: 0,
  lastScan: null,
  iconTheme: EMPTY_ICON_THEME,
};

/**
 * Subscribe to extension-side scan/baseline messages and surface the latest
 * state as a single object. Each event clears any prior error.
 */
export function useReport(): ReportState {
  const [state, setState] = useState<ReportState>(INITIAL);

  useVscodeMessage('scan/progress', (m) => {
    setState(s => ({
      ...s,
      error: null,
      progress: { processed: m.processed, total: m.total, currentFile: m.currentFile },
    }));
  });

  useVscodeMessage('scan/done', (m) => {
    setState(s => ({
      ...s,
      report: m.report,
      progress: null,
      error: null,
      staleCount: 0,
      lastScan: deriveLastScan(m.report.scope),
    }));
  });

  useVscodeMessage('scan/stale', (m) => {
    setState(s => ({ ...s, staleCount: m.changedCount }));
  });

  useVscodeMessage('scan/error', (m) => {
    setState(s => ({ ...s, error: m.message, progress: null }));
  });

  useVscodeMessage('baseline/loaded', (m) => {
    setState(s => ({ ...s, baseline: m.baseline }));
  });

  useVscodeMessage('diff/computed', (m) => {
    setState(s => ({ ...s, diff: m.diff }));
  });

  useVscodeMessage('config/changed', (m) => {
    setState(s => ({ ...s, config: m.config }));
  });

  useVscodeMessage('iconTheme/icons', (m) => {
    setState(s => ({ ...s, iconTheme: m.payload }));
  });

  useVscodeMessage('locale/set', (m) => {
    const target = m.locale === 'zh-cn' ? 'zh-CN' : 'en';
    if (i18n.language !== target)
      void i18n.changeLanguage(target);
  });

  // Reset progress to null if we already have a report and no progress event
  // arrives for >1s. Belt-and-suspenders for missed scan/done events.
  useEffect(() => {
    if (!state.progress)
      return;
    const id = setTimeout(() => {
      setState(s => (s.progress === state.progress ? { ...s, progress: null } : s));
    }, 30_000);
    return () => clearTimeout(id);
  }, [state.progress]);

  return state;
}

function deriveLastScan(scope: string): LastScan {
  if (!scope)
    return { scope: 'workspace' };
  if (scope.startsWith('folder:'))
    return { scope: 'folder', uri: scope.slice('folder:'.length) || undefined };
  if (scope.startsWith('file:'))
    return { scope: 'file', uri: scope.slice('file:'.length) || undefined };
  return { scope: 'workspace' };
}
