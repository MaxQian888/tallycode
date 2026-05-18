import { workspace } from 'vscode';

import { DEFAULT_TEST_RULES } from './counter/testClassifier';

import type { TallyCodeConfig } from '@shared/report';
import type { ConfigurationChangeEvent, Disposable } from 'vscode';

const SECTION = 'tallycode';

const DEFAULT_EXCLUDES: string[] = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/target/**',
  '**/.git/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/.svelte-kit/**',
  '**/coverage/**',
  '**/.cache/**',
  '**/__pycache__/**',
  '**/.venv/**',
  '**/venv/**',
];

export function readConfig(): TallyCodeConfig {
  const c = workspace.getConfiguration(SECTION);
  const filesExclude = c.get<boolean>('useFilesExclude', true)
    ? Object.keys(workspace.getConfiguration('files').get<Record<string, boolean>>('exclude', {}) ?? {})
    : [];

  return {
    useGitignore: c.get<boolean>('useGitignore', true),
    useFilesExclude: c.get<boolean>('useFilesExclude', true),
    exclude: dedupe([...c.get<string[]>('exclude', DEFAULT_EXCLUDES), ...filesExclude]),
    include: c.get<string[]>('include', ['**/*']),
    maxFileSizeMB: c.get<number>('maxFileSizeMB', 5),
    maxOpenFiles: c.get<number>('maxOpenFiles', 32),
    useLspCalibration: c.get<boolean>('useLspCalibration', false),
    markerScanLines: c.get<number>('markerScanLines', 50),
    testRules: c.get<TallyCodeConfig['testRules']>('testRules', {
      default: DEFAULT_TEST_RULES,
      perLanguage: {},
    }),
    languages: c.get<TallyCodeConfig['languages']>('languages', {}),
    languageConfUri: c.get<string | undefined>('languageConfUri'),
    statusBar: {
      enabled: c.get<boolean>('statusBar.enabled', true),
      format: c.get<TallyCodeConfig['statusBar']['format']>('statusBar.format', 'loc'),
      showLanguageIcon: c.get<boolean>('statusBar.showLanguageIcon', true),
    },
  };
}

export function onConfigChanged(callback: () => void): Disposable {
  return workspace.onDidChangeConfiguration((e: ConfigurationChangeEvent) => {
    if (e.affectsConfiguration(SECTION) || e.affectsConfiguration('files.exclude')) {
      callback();
    }
  });
}

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}
