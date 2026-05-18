import { iconFor } from '../counter/languageIcons';

import type { CountResult, LanguageRule } from '@shared/report';

/**
 * Status bar item visual state. Pure data type produced by
 * `computeStatusBar()` and consumed by the StatusBar class. Kept separate so
 * the rendering rules are testable without a vscode instance.
 */
export type StatusBarRender
  = | { hidden: true }
    | {
      hidden: false;
      text: string;
      tooltipLines: string[];
      accessibilityLabel: string;
      background: 'none' | 'warning' | 'error';
    };

export interface ComputeInput {
  /** undefined → no active file or unsupported scheme */
  fileRule: LanguageRule | null;
  /** undefined → counting failed or unsupported */
  fileCount: CountResult | null;
  /** Workspace-level scan in flight (separate from per-file recompute). */
  scanning: boolean;
  /** Files known to have changed since the last successful scan. */
  staleCount: number;
  /** Most recent scan error, if any (cleared on next successful scan). */
  errorMessage: string | null;
  /** Display config. */
  format: 'loc' | 'code+comment' | 'percent';
  showLanguageIcon: boolean;
}

/**
 * Decide what the status bar should render given combined inputs. Returns
 * `{ hidden: true }` when nothing useful can be shown (no editor open or rule
 * unknown and no scan/error to surface).
 */
export function computeStatusBar(input: ComputeInput): StatusBarRender {
  const { fileRule, fileCount, scanning, staleCount, errorMessage, format, showLanguageIcon } = input;

  // Error state takes precedence — user wants to know scans are broken.
  if (errorMessage) {
    return {
      hidden: false,
      text: '$(error) Tally error',
      tooltipLines: [
        'TallyCode scan error',
        errorMessage,
        '',
        'Click for actions',
      ],
      accessibilityLabel: `TallyCode error: ${errorMessage}`,
      background: 'error',
    };
  }

  // Active scan dominates the next-most-prominent slot.
  if (scanning) {
    return {
      hidden: false,
      text: '$(loading~spin) Counting…',
      tooltipLines: [
        'TallyCode is scanning the workspace…',
        '',
        'Click for actions',
      ],
      accessibilityLabel: 'TallyCode scanning workspace',
      background: 'none',
    };
  }

  // No countable file → nothing to show unless we have stale info.
  if (!fileRule || !fileCount) {
    if (staleCount > 0) {
      return {
        hidden: false,
        text: `$(warning) ${formatNum(staleCount)} stale`,
        tooltipLines: [
          `TallyCode: ${staleCount} file(s) changed since last scan`,
          '',
          'Click for actions',
        ],
        accessibilityLabel: `TallyCode: ${staleCount} files stale`,
        background: 'warning',
      };
    }
    return { hidden: true };
  }

  // Idle / stale: per-file count display.
  const langName = fileRule.name ?? fileRule.id;
  const icon = staleCount > 0
    ? '$(warning)'
    : (showLanguageIcon ? `$(${iconFor(fileRule.id)})` : '$(list-ordered)');

  const text = `${icon} ${renderMetric(fileCount, format)}`;
  const tooltipLines = [
    `TallyCode · ${langName}`,
    `Code: ${formatNum(fileCount.code)}`,
    `Comment: ${formatNum(fileCount.comment)}`,
    `Blank: ${formatNum(fileCount.blank)}`,
    `Total: ${formatNum(fileCount.total)}`,
  ];
  if (staleCount > 0) {
    tooltipLines.push('', `${staleCount} file(s) changed since last workspace scan`);
  }
  tooltipLines.push('', 'Click for actions');

  return {
    hidden: false,
    text,
    tooltipLines,
    accessibilityLabel: `TallyCode ${langName}: ${formatNum(fileCount.code)} lines of code`,
    background: staleCount > 0 ? 'warning' : 'none',
  };
}

function renderMetric(c: CountResult, format: ComputeInput['format']): string {
  switch (format) {
    case 'code+comment':
      return `${formatNum(c.code)} code · ${formatNum(c.comment)} cmt`;
    case 'percent': {
      if (c.total === 0)
        return '0%';
      const codePct = Math.round((c.code / c.total) * 100);
      const cmtPct = Math.round((c.comment / c.total) * 100);
      return `${codePct}% code · ${cmtPct}% cmt`;
    }
    case 'loc':
    default:
      return `${formatNum(c.code)} loc`;
  }
}

function formatNum(n: number): string {
  return n.toLocaleString('en-US');
}
