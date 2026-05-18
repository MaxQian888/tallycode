import type {
  CountResult,
  DirectoryNode,
  FileEntry,
  LanguageSummary,
  Report,
  ReportSummary,
  SkippedFile,
} from '@shared/report';

export const ZERO_COUNT: CountResult = Object.freeze({ code: 0, comment: 0, blank: 0, total: 0 });

export function addCounts(a: CountResult, b: CountResult): CountResult {
  return {
    code: a.code + b.code,
    comment: a.comment + b.comment,
    blank: a.blank + b.blank,
    total: a.total + b.total,
  };
}

export interface BuildReportInput {
  rootPath: string;
  scope: string;
  startedAt: number;
  files: FileEntry[];
  skipped: SkippedFile[];
}

/**
 * Build a complete Report from raw FileEntry list. Pure function — easy to
 * unit-test.
 */
export function buildReport(input: BuildReportInput): Report {
  const { files, skipped, rootPath, scope, startedAt } = input;
  const summary = summarize(files);
  const languages = summarizeByLanguage(files);
  const directoryTree = buildDirectoryTree(files);
  return {
    schemaVersion: 1,
    rootPath,
    scope,
    scannedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    summary,
    languages,
    directoryTree,
    files: [...files].sort((a, b) => a.path.localeCompare(b.path)),
    skipped: [...skipped].sort((a, b) => a.path.localeCompare(b.path)),
  };
}

function summarize(files: FileEntry[]): ReportSummary {
  let source: CountResult = { ...ZERO_COUNT };
  let test: CountResult = { ...ZERO_COUNT };
  let testFiles = 0;
  const langs = new Set<string>();
  for (const f of files) {
    langs.add(f.language);
    if (f.isTest) {
      test = addCounts(test, f.count);
      testFiles += 1;
    }
    else {
      source = addCounts(source, f.count);
    }
  }
  return {
    totalFiles: files.length,
    testFiles,
    sourceFiles: files.length - testFiles,
    total: addCounts(source, test),
    source,
    test,
    languageCount: langs.size,
  };
}

function summarizeByLanguage(files: FileEntry[]): LanguageSummary[] {
  const byLang = new Map<string, LanguageSummary>();
  for (const f of files) {
    let entry = byLang.get(f.language);
    if (!entry) {
      entry = {
        language: f.language,
        files: 0,
        testFiles: 0,
        source: { ...ZERO_COUNT },
        test: { ...ZERO_COUNT },
        total: { ...ZERO_COUNT },
      };
      byLang.set(f.language, entry);
    }
    entry.files += 1;
    if (f.isTest) {
      entry.testFiles += 1;
      entry.test = addCounts(entry.test, f.count);
    }
    else {
      entry.source = addCounts(entry.source, f.count);
    }
    entry.total = addCounts(entry.source, entry.test);
  }
  return [...byLang.values()].sort((a, b) => b.total.code - a.total.code);
}

/**
 * Build a hierarchical directory tree from flat file entries. Each node
 * aggregates its descendants. Single-child chains stay nested (no collapsing)
 * so the UI can show full structure.
 */
export function buildDirectoryTree(files: FileEntry[]): DirectoryNode {
  const root: DirectoryNode = makeNode('', '');

  for (const f of files) {
    const segments = f.path.split('/');
    let parent = root;
    let prefix = '';
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!;
      const isLast = i === segments.length - 1;
      prefix = prefix ? `${prefix}/${seg}` : seg;
      if (isLast) {
        // File-level accumulators happen below at every ancestor.
        break;
      }
      let child = parent.children.find(c => c.name === seg);
      if (!child) {
        child = makeNode(prefix, seg);
        parent.children.push(child);
      }
      parent = child;
    }
    // Roll up every ancestor including root.
    accumulate(root, f);
    let walker = root;
    for (let i = 0; i < segments.length - 1; i++) {
      const child = walker.children.find(c => c.name === segments[i]);
      if (!child)
        break;
      accumulate(child, f);
      walker = child;
    }
  }

  sortChildren(root);
  return root;
}

function makeNode(path: string, name: string): DirectoryNode {
  return {
    path,
    name,
    files: 0,
    testFiles: 0,
    source: { ...ZERO_COUNT },
    test: { ...ZERO_COUNT },
    total: { ...ZERO_COUNT },
    children: [],
  };
}

function accumulate(node: DirectoryNode, f: FileEntry): void {
  node.files += 1;
  if (f.isTest) {
    node.testFiles += 1;
    node.test = addCounts(node.test, f.count);
  }
  else {
    node.source = addCounts(node.source, f.count);
  }
  node.total = addCounts(node.source, node.test);
}

function sortChildren(node: DirectoryNode): void {
  node.children.sort((a, b) => a.name.localeCompare(b.name));
  for (const c of node.children) sortChildren(c);
}
