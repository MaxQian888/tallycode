import type { DiffReport, Report, TallyCodeConfig } from './report';

export type ScanScope = 'workspace' | 'folder' | 'file';
export type ExportFormat = 'md' | 'csv' | 'json' | 'html';

/**
 * Icons resolved from the user's active VSCode file-icon theme. The extension
 * reads the theme JSON, picks the right icon id for every path in the current
 * report, and inlines the SVG/PNG contents as base64 data URIs so the webview
 * can render them with `<img src={dataUri}>` without extra CSP allowlisting.
 *
 * `active: false` means the user has no icon theme set or it couldn't be
 * loaded — the webview falls back to generic lucide File/Folder icons.
 */
export interface IconThemePayload {
  active: boolean;
  /** iconId -> data: URI for the icon file. */
  icons: Record<string, string>;
  /** Relative file path -> iconId. Resolution already includes the theme's default. */
  fileIcons: Record<string, string>;
  /** Relative directory path -> {closed, open} iconIds. */
  folderIcons: Record<string, { closed: string; open: string }>;
}

export type WebviewToExtensionMessage
  = | { type: 'hello'; data: string }
    | { type: 'log'; level: 'info' | 'warn' | 'error'; message: string }
    | { type: 'webview/error'; error: { name: string; message: string; stack?: string } }
    | { type: 'webview/ready' }
    | { type: 'scan/start'; scope: ScanScope; uri?: string }
    | { type: 'scan/refresh' }
    | { type: 'scan/cancel' }
    | { type: 'baseline/save' }
    | { type: 'baseline/clear' }
    | { type: 'export/png'; pngBase64: string; suggestedName: string }
    | { type: 'export/format'; format: ExportFormat };

export type HighlightTarget = 'languages' | 'baseline' | 'recent' | 'files' | 'directories';

export type ExtensionToWebviewMessage
  = | { type: 'hello'; data: string }
    | { type: 'theme/changed'; kind: 'light' | 'dark' | 'high-contrast' }
    | { type: 'state/restore'; payload: unknown }
    | { type: 'scan/progress'; processed: number; total: number; currentFile?: string }
    | { type: 'scan/done'; report: Report }
    | { type: 'scan/error'; message: string }
    | { type: 'baseline/loaded'; baseline: Report | null }
    | { type: 'diff/computed'; diff: DiffReport | null }
    | { type: 'config/changed'; config: TallyCodeConfig }
    | { type: 'export/saved'; path: string; format: ExportFormat | 'png' }
    | { type: 'scan/stale'; changedCount: number }
    | { type: 'view/highlight'; target: HighlightTarget; payload?: { languageId?: string } }
    | { type: 'iconTheme/icons'; payload: IconThemePayload };

export type MessageOf<T extends string, M extends { type: string }> = Extract<M, { type: T }>;
