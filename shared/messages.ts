import type { DiffReport, Report, TallyCodeConfig } from './report';

export type ScanScope = 'workspace' | 'folder' | 'file';
export type ExportFormat = 'md' | 'csv' | 'json' | 'html';

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
    | { type: 'view/highlight'; target: HighlightTarget; payload?: { languageId?: string } };

export type MessageOf<T extends string, M extends { type: string }> = Extract<M, { type: T }>;
