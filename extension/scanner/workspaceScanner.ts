import { Buffer } from 'node:buffer';

import pLimit from 'p-limit';
import { RelativePattern, Uri, workspace } from 'vscode';

import { posixBasename } from '../counter/languageRegistry';
import { countLines } from '../counter/lineCounter';

import { CountCache } from './cache';
import { GitignoreSet } from './gitignore';

import type { LanguageRegistry } from '../counter/languageRegistry';
import type { TestClassifier } from '../counter/testClassifier';
import type { FileEntry, SkippedFile, TallyCodeConfig } from '@shared/report';
import type { CancellationToken, FileSystemError } from 'vscode';

export interface ScanResult {
  entries: FileEntry[];
  skipped: SkippedFile[];
  rootPath: string;
  cacheHits: number;
  cacheMisses: number;
}

export interface ScanOptions {
  /** Root URI to scan. */
  root: Uri;
  /** Resolved configuration snapshot. */
  config: TallyCodeConfig;
  /** Language registry (already merged with user overrides). */
  registry: LanguageRegistry;
  /** Test classifier (already configured). */
  classifier: TestClassifier;
  /** Cache (shared across scans of the same workspace). */
  cache: CountCache;
  /** Hash representing the current rule set; invalidates cache on change. */
  ruleHash: string;
  /** Optional cancellation token. */
  token?: CancellationToken;
  /** Optional progress callback (processed, total, currentRelPath). */
  onProgress?: (processed: number, total: number, currentRelPath?: string) => void;
  /** Path predicate for filtering to a specific scope (e.g. a sub-folder). */
  pathFilter?: (relPath: string) => boolean;
  /** Optional set of paths flagged by VSCode TestController. */
  lspTestPaths?: Set<string>;
  /**
   * Optional namespace folded into the cache key so independent scan roots
   * (e.g. multiple workspace folders) do not share cache entries when their
   * relative paths happen to collide.
   */
  scopeId?: string;
}

export async function scanWorkspace(opts: ScanOptions): Promise<ScanResult> {
  const skipped: SkippedFile[] = [];
  const entries: FileEntry[] = [];
  let cacheHits = 0;
  let cacheMisses = 0;

  const includePattern = combineGlobs(opts.config.include);
  const excludePattern = combineGlobs(opts.config.exclude);
  const rootUri = opts.root;

  const files = await workspace.findFiles(
    new RelativePattern(rootUri, includePattern),
    new RelativePattern(rootUri, excludePattern),
  );

  const gitignore = opts.config.useGitignore
    ? await loadGitignoreSet(rootUri, files)
    : new GitignoreSet();

  const filtered = files
    .map(uri => ({ uri, rel: toRelativePosix(rootUri, uri) }))
    .filter(({ rel }) => (opts.pathFilter ? opts.pathFilter(rel) : true))
    .filter(({ rel }) => !gitignore.isIgnored(rel));

  const total = filtered.length;
  opts.onProgress?.(0, total);

  const maxOpenFiles = Math.max(1, opts.config.maxOpenFiles);
  const limit = pLimit(maxOpenFiles);
  let processed = 0;

  await Promise.all(filtered.map(({ uri, rel }) => limit(async () => {
    if (opts.token?.isCancellationRequested)
      return;
    try {
      await processFile(uri, rel, opts, entries, skipped, (hit) => {
        if (hit)
          cacheHits += 1;
        else cacheMisses += 1;
      });
    }
    finally {
      processed += 1;
      opts.onProgress?.(processed, total, rel);
    }
  })));

  return {
    entries,
    skipped,
    rootPath: rootUri.fsPath,
    cacheHits,
    cacheMisses,
  };
}

async function processFile(
  uri: Uri,
  rel: string,
  opts: ScanOptions,
  entries: FileEntry[],
  skipped: SkippedFile[],
  reportCache: (hit: boolean) => void,
): Promise<void> {
  // Resolve language first — skip unknown languages early.
  const rule = opts.registry.resolve(rel);
  if (!rule) {
    skipped.push({ path: rel, reason: 'unknown-language' });
    return;
  }

  let stat;
  try {
    stat = await workspace.fs.stat(uri);
  }
  catch {
    skipped.push({ path: rel, reason: 'unreadable' });
    return;
  }
  const size = stat.size;
  const maxBytes = Math.max(0, opts.config.maxFileSizeMB) * 1024 * 1024;
  if (maxBytes > 0 && size > maxBytes) {
    skipped.push({ path: rel, reason: 'too-large', size });
    return;
  }

  const cacheKey = CountCache.makeKey({
    relativePath: opts.scopeId ? `${opts.scopeId}::${rel}` : rel,
    mtime: stat.mtime,
    size,
    ruleHash: opts.ruleHash,
  });

  const cached = opts.cache.get(cacheKey);
  if (cached) {
    reportCache(true);
    entries.push({
      path: rel,
      language: cached.language,
      size,
      isTest: cached.isTest,
      testReason: cached.testReason,
      count: cached.count,
    });
    return;
  }

  let buffer: Uint8Array;
  try {
    buffer = await workspace.fs.readFile(uri);
  }
  catch (err) {
    if (isFileSystemError(err) && err.code === 'FileNotFound') {
      skipped.push({ path: rel, reason: 'unreadable', size });
    }
    else {
      skipped.push({ path: rel, reason: 'unreadable', size });
    }
    return;
  }

  if (looksBinary(buffer)) {
    skipped.push({ path: rel, reason: 'binary', size });
    return;
  }

  const text = decode(buffer);
  const count = countLines(text, rule);

  const headSnippet = opts.config.markerScanLines > 0
    ? text.split('\n').slice(0, opts.config.markerScanLines).join('\n')
    : '';

  const classification = opts.classifier.classify({
    relativePath: rel,
    languageId: rule.id,
    headSnippet,
    lspTestMember: opts.lspTestPaths?.has(rel),
  });

  reportCache(false);
  opts.cache.set({
    key: cacheKey,
    language: rule.id,
    count,
    isTest: classification.isTest,
    testReason: classification.layer,
  });

  entries.push({
    path: rel,
    language: rule.id,
    size,
    isTest: classification.isTest,
    testReason: classification.layer,
    count,
  });
}

/* ------------------------------------------------------------------------ */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------ */

function combineGlobs(globs: string[]): string {
  if (globs.length === 0)
    return '**/*';
  if (globs.length === 1)
    return globs[0]!;
  return `{${globs.join(',')}}`;
}

function toRelativePosix(root: Uri, file: Uri): string {
  const rel = workspace.asRelativePath(file, false);
  return rel.replace(/\\/g, '/');
}

async function loadGitignoreSet(rootUri: Uri, files: Uri[]): Promise<GitignoreSet> {
  const set = new GitignoreSet();
  const candidates = files.filter(u => posixBasename(u.path) === '.gitignore');
  // Also check root .gitignore even if findFiles excluded it.
  const rootIgnore = Uri.joinPath(rootUri, '.gitignore');
  if (!candidates.some(c => c.fsPath === rootIgnore.fsPath)) {
    try {
      await workspace.fs.stat(rootIgnore);
      candidates.unshift(rootIgnore);
    }
    catch {
      // No root .gitignore — fine.
    }
  }
  await Promise.all(candidates.map(async (u) => {
    try {
      const bytes = await workspace.fs.readFile(u);
      const rel = toRelativePosix(rootUri, u);
      const dir = rel === '.gitignore' ? '' : rel.slice(0, rel.length - '.gitignore'.length - 1);
      set.add(dir, decode(bytes));
    }
    catch {
      // Ignore unreadable .gitignore.
    }
  }));
  return set;
}

function decode(bytes: Uint8Array): string {
  // Strip UTF-8 BOM if present.
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return Buffer.from(bytes.slice(3)).toString('utf8');
  }
  return Buffer.from(bytes).toString('utf8');
}

/**
 * Cheap binary heuristic: probe first ~4KB for null bytes.
 * Text files almost never contain 0x00 in their first bytes; binaries
 * (images, archives, executables) usually do.
 */
function looksBinary(bytes: Uint8Array): boolean {
  const probe = Math.min(bytes.length, 4096);
  for (let i = 0; i < probe; i++) {
    if (bytes[i] === 0)
      return true;
  }
  return false;
}

function isFileSystemError(err: unknown): err is FileSystemError {
  return !!err && typeof err === 'object' && 'code' in (err as Record<string, unknown>);
}
