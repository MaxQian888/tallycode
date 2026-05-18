import { Buffer } from 'node:buffer';

import { workspace } from 'vscode';

import { countLines } from '../counter/lineCounter';
import { calibrateWithSemanticTokens } from '../counter/lspCalibratorVscode';

import type { LanguageRegistry } from '../counter/languageRegistry';
import type { TestClassifier } from '../counter/testClassifier';
import type { FileEntry, SkippedFile, TallyCodeConfig } from '@shared/report';
import type { Uri } from 'vscode';

export interface SingleFileScanResult {
  entry: FileEntry | null;
  skipped: SkippedFile | null;
}

/**
 * Count a single file directly via `workspace.fs`, bypassing `findFiles`.
 * Honors maxFileSizeMB. Optionally calibrates via semantic tokens when
 * `useLspCalibration` is enabled.
 */
export async function scanSingleFile(
  uri: Uri,
  relativePath: string,
  config: TallyCodeConfig,
  registry: LanguageRegistry,
  classifier: TestClassifier,
  lspTestPaths?: Set<string>,
): Promise<SingleFileScanResult> {
  const rule = registry.resolve(relativePath);
  if (!rule) {
    return { entry: null, skipped: { path: relativePath, reason: 'unknown-language' } };
  }

  let stat;
  try {
    stat = await workspace.fs.stat(uri);
  }
  catch {
    return { entry: null, skipped: { path: relativePath, reason: 'unreadable' } };
  }

  const maxBytes = Math.max(0, config.maxFileSizeMB) * 1024 * 1024;
  if (maxBytes > 0 && stat.size > maxBytes) {
    return { entry: null, skipped: { path: relativePath, reason: 'too-large', size: stat.size } };
  }

  let bytes: Uint8Array;
  try {
    bytes = await workspace.fs.readFile(uri);
  }
  catch {
    return { entry: null, skipped: { path: relativePath, reason: 'unreadable', size: stat.size } };
  }

  if (looksBinary(bytes)) {
    return { entry: null, skipped: { path: relativePath, reason: 'binary', size: stat.size } };
  }

  const text = decode(bytes);
  let count = countLines(text, rule);
  if (config.useLspCalibration) {
    try {
      count = await calibrateWithSemanticTokens(uri, text, rule);
    }
    catch {
      // Fall back to regex baseline silently.
    }
  }

  const headSnippet = config.markerScanLines > 0
    ? text.split('\n').slice(0, config.markerScanLines).join('\n')
    : '';

  const cls = classifier.classify({
    relativePath,
    languageId: rule.id,
    headSnippet,
    lspTestMember: lspTestPaths?.has(relativePath),
  });

  return {
    entry: {
      path: relativePath,
      language: rule.id,
      size: stat.size,
      isTest: cls.isTest,
      testReason: cls.layer,
      count,
    },
    skipped: null,
  };
}

function decode(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return Buffer.from(bytes.slice(3)).toString('utf8');
  }
  return Buffer.from(bytes).toString('utf8');
}

function looksBinary(bytes: Uint8Array): boolean {
  const probe = Math.min(bytes.length, 4096);
  for (let i = 0; i < probe; i++) {
    if (bytes[i] === 0)
      return true;
  }
  return false;
}
