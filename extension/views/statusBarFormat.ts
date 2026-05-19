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

type LocalizerArg = string | number | boolean;
type Localizer = (message: string, ...args: LocalizerArg[]) => string;

function defaultLocalizer(message: string, ...args: LocalizerArg[]): string {
  return message.replace(/\{(\d+)\}/g, (_, idx: string) => String(args[Number(idx)] ?? ''));
}

/**
 * Decide what the status bar should render given combined inputs. Returns
 * `{ hidden: true }` when nothing useful can be shown (no editor open or rule
 * unknown and no scan/error to surface).
 *
 * The optional `t` parameter is the i18n localizer; production code injects
 * `vscode.l10n.t`, tests rely on the default `{0}`-template formatter so the
 * pure module stays free of vscode imports.
 */
export function computeStatusBar(
  input: ComputeInput,
  t: Localizer = defaultLocalizer,
): StatusBarRender {
  const { fileRule, fileCount, scanning, staleCount, errorMessage, format, showLanguageIcon } = input;

  // Error state takes precedence — user wants to know scans are broken.
  if (errorMessage) {
    return {
      hidden: false,
      text: `$(error) ${t('Tally error')}`,
      tooltipLines: [
        t('TallyCode scan error'),
        errorMessage,
        '',
        t('Click for actions'),
      ],
      accessibilityLabel: t('TallyCode error: {0}', errorMessage),
      background: 'error',
    };
  }

  // Active scan dominates the next-most-prominent slot.
  if (scanning) {
    return {
      hidden: false,
      text: `$(loading~spin) ${t('Counting…')}`,
      tooltipLines: [
        t('TallyCode is scanning the workspace…'),
        '',
        t('Click for actions'),
      ],
      accessibilityLabel: t('TallyCode scanning workspace'),
      background: 'none',
    };
  }

  // No countable file → nothing to show unless we have stale info.
  if (!fileRule || !fileCount) {
    if (staleCount > 0) {
      return {
        hidden: false,
        text: `$(warning) ${t('{0} stale', formatNum(staleCount))}`,
        tooltipLines: [
          t('TallyCode: {0} file(s) changed since last scan', staleCount),
          '',
          t('Click for actions'),
        ],
        accessibilityLabel: t('TallyCode: {0} files stale', staleCount),
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

  const text = `${icon} ${renderMetric(fileCount, format, t)}`;
  const tooltipLines = [
    t('TallyCode · {0}', langName),
    t('Code: {0}', formatNum(fileCount.code)),
    t('Comment: {0}', formatNum(fileCount.comment)),
    t('Blank: {0}', formatNum(fileCount.blank)),
    t('Total: {0}', formatNum(fileCount.total)),
  ];
  if (staleCount > 0) {
    tooltipLines.push('', t('{0} file(s) changed since last workspace scan', staleCount));
  }
  tooltipLines.push('', t('Click for actions'));

  return {
    hidden: false,
    text,
    tooltipLines,
    accessibilityLabel: t('TallyCode {0}: {1} lines of code', langName, formatNum(fileCount.code)),
    background: staleCount > 0 ? 'warning' : 'none',
  };
}

function renderMetric(c: CountResult, format: ComputeInput['format'], t: Localizer): string {
  switch (format) {
    case 'code+comment':
      return t('{0} code · {1} cmt', formatNum(c.code), formatNum(c.comment));
    case 'percent': {
      if (c.total === 0)
        return '0%';
      const codePct = Math.round((c.code / c.total) * 100);
      const cmtPct = Math.round((c.comment / c.total) * 100);
      return t('{0}% code · {1}% cmt', codePct, cmtPct);
    }
    case 'loc':
    default:
      return t('{0} loc', formatNum(c.code));
  }
}

function formatNum(n: number): string {
  return n.toLocaleString('en-US');
}
