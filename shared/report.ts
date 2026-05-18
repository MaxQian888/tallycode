/**
 * Shared types between extension host and webview.
 * The extension host produces these; the webview consumes them read-only.
 */

export interface CountResult {
  code: number;
  comment: number;
  blank: number;
  total: number;
}

export type TestRuleLayer = 'lsp' | 'filename' | 'directory' | 'marker' | 'none';

export interface FileEntry {
  /** Workspace-relative POSIX path, e.g. `webview/App.tsx` */
  path: string;
  /** Resolved language id (e.g. `typescript`, `python`) */
  language: string;
  /** Byte size */
  size: number;
  /** Is this file classified as test code? */
  isTest: boolean;
  /** Which rule layer fired the test classification (for transparency) */
  testReason: TestRuleLayer;
  count: CountResult;
}

export interface LanguageSummary {
  language: string;
  files: number;
  testFiles: number;
  source: CountResult;
  test: CountResult;
  total: CountResult;
}

export interface DirectoryNode {
  /** Workspace-relative POSIX path; '' for root */
  path: string;
  name: string;
  files: number;
  testFiles: number;
  source: CountResult;
  test: CountResult;
  total: CountResult;
  /** Direct children only; deep traversal via DirectoryNode[] recursion */
  children: DirectoryNode[];
}

export interface ReportSummary {
  totalFiles: number;
  testFiles: number;
  sourceFiles: number;
  total: CountResult;
  source: CountResult;
  test: CountResult;
  /** Number of languages with at least one file */
  languageCount: number;
}

export interface Report {
  /** Schema version for forward-compat. */
  schemaVersion: 1;
  /** Absolute fs path of the scanned root (workspace folder or sub-folder). */
  rootPath: string;
  /** Workspace-relative scope: '' = whole workspace, 'src/foo' = directory scan, 'file:path' = single file */
  scope: string;
  /** ISO 8601 timestamp of scan completion. */
  scannedAt: string;
  /** Wall-clock scan duration in ms. */
  durationMs: number;
  summary: ReportSummary;
  languages: LanguageSummary[];
  directoryTree: DirectoryNode;
  files: FileEntry[];
  /** Files that were skipped (too large, unreadable, unknown language) */
  skipped: SkippedFile[];
}

export interface SkippedFile {
  path: string;
  reason: 'too-large' | 'unreadable' | 'unknown-language' | 'binary';
  size?: number;
}

/* ------------------------------------------------------------------------ */
/* Diff types                                                                */
/* ------------------------------------------------------------------------ */

export interface CountDelta {
  before: CountResult;
  after: CountResult;
  delta: CountResult;
}

export interface FileDiff {
  path: string;
  language: string;
  status: 'added' | 'removed' | 'changed' | 'unchanged';
  before: CountResult | null;
  after: CountResult | null;
}

export interface LanguageDiff {
  language: string;
  before: LanguageSummary | null;
  after: LanguageSummary | null;
}

export interface DiffReport {
  schemaVersion: 1;
  baselineAt: string;
  currentAt: string;
  summary: CountDelta & {
    filesBefore: number;
    filesAfter: number;
    filesAdded: number;
    filesRemoved: number;
    filesChanged: number;
  };
  languages: LanguageDiff[];
  files: FileDiff[];
}

/* ------------------------------------------------------------------------ */
/* Language rule schema                                                      */
/* ------------------------------------------------------------------------ */

export interface LanguageRule {
  /** Stable language id (matches VSCode languageId where possible) */
  id: string;
  /** Display name */
  name?: string;
  /** Alternate ids users might write in `files.associations` */
  aliases?: string[];
  /** Exact filenames, no extension stripping (`Dockerfile`, `Makefile`) */
  filenames?: string[];
  /** Extensions WITH leading dot (`.ts`, `.tsx`) */
  extensions?: string[];
  /** Line-comment markers (`["//", "#"]`) */
  lineComments?: string[];
  /** Block-comment pairs (`[["/*", "*\/"]]`) */
  blockComments?: Array<[string, string]>;
  /**
   * Block-string pairs used to suppress comment-like sequences inside strings
   * (`[['"""', '"""'], ['"', '"']]` for Python).
   */
  blockStrings?: Array<[string, string]>;
  /**
   * If true, block-string spans count as comments (Python docstrings, Lua long
   * strings).
   */
  blockStringAsComment?: boolean;
  /** Support nested block comments (Haskell, D, Rust attributes) */
  nestedBlockComment?: boolean;
  /** Should we count anything? (false = listed but not counted, e.g. binary) */
  count?: boolean;
}

/* ------------------------------------------------------------------------ */
/* Test classifier rule schema (per-language overridable)                    */
/* ------------------------------------------------------------------------ */

export interface TestRuleSet {
  /** Use VSCode TestController items if available */
  useLsp?: boolean;
  /** Filename glob patterns (minimatch) */
  filenameGlobs?: string[];
  /** Directory-path glob patterns (matched against parents) */
  directoryGlobs?: string[];
  /** Regex patterns matched against the first N lines of the file */
  fileMarkers?: string[];
}

/* ------------------------------------------------------------------------ */
/* Configuration                                                             */
/* ------------------------------------------------------------------------ */

export interface TallyCodeConfig {
  useGitignore: boolean;
  useFilesExclude: boolean;
  exclude: string[];
  include: string[];
  maxFileSizeMB: number;
  maxOpenFiles: number;
  useLspCalibration: boolean;
  markerScanLines: number;
  /** Default rules apply when language-specific entry is missing. */
  testRules: {
    default: TestRuleSet;
    perLanguage: Record<string, TestRuleSet>;
  };
  /** User overrides / extensions to built-in language rules. Key = language id. */
  languages: Record<string, Partial<LanguageRule>>;
  /** Optional external JSON file with additional language rules. */
  languageConfUri?: string;
  /** Status bar item appearance. */
  statusBar: {
    enabled: boolean;
    format: 'loc' | 'code+comment' | 'percent';
    showLanguageIcon: boolean;
  };
}
