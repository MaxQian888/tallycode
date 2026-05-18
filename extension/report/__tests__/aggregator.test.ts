import { describe, expect, it } from 'vitest';

import { addCounts, buildDirectoryTree, buildReport } from '../aggregator';

import type { FileEntry } from '@shared/report';

function f(path: string, language: string, code: number, isTest = false): FileEntry {
  return {
    path,
    language,
    size: code * 10,
    isTest,
    testReason: isTest ? 'filename' : 'none',
    count: { code, comment: 0, blank: 0, total: code },
  };
}

describe('addCounts', () => {
  it('adds fields elementwise', () => {
    expect(addCounts(
      { code: 1, comment: 2, blank: 3, total: 6 },
      { code: 4, comment: 5, blank: 6, total: 15 },
    )).toEqual({ code: 5, comment: 7, blank: 9, total: 21 });
  });
});

describe('buildReport', () => {
  it('summarizes test vs source', () => {
    const files: FileEntry[] = [
      f('src/a.ts', 'typescript', 10),
      f('src/b.ts', 'typescript', 5),
      f('src/a.test.ts', 'typescript', 3, true),
    ];
    const report = buildReport({
      rootPath: '/repo',
      scope: '',
      startedAt: Date.now() - 50,
      files,
      skipped: [],
    });
    expect(report.summary.totalFiles).toBe(3);
    expect(report.summary.testFiles).toBe(1);
    expect(report.summary.sourceFiles).toBe(2);
    expect(report.summary.source.code).toBe(15);
    expect(report.summary.test.code).toBe(3);
    expect(report.summary.total.code).toBe(18);
    expect(report.summary.languageCount).toBe(1);
  });

  it('groups by language', () => {
    const files: FileEntry[] = [
      f('a.ts', 'typescript', 10),
      f('b.py', 'python', 20),
      f('c.test.ts', 'typescript', 5, true),
    ];
    const report = buildReport({
      rootPath: '/r',
      scope: '',
      startedAt: Date.now(),
      files,
      skipped: [],
    });
    const ts = report.languages.find(l => l.language === 'typescript')!;
    const py = report.languages.find(l => l.language === 'python')!;
    expect(ts.files).toBe(2);
    expect(ts.testFiles).toBe(1);
    expect(ts.source.code).toBe(10);
    expect(ts.test.code).toBe(5);
    expect(py.files).toBe(1);
    // Languages sorted by total code descending
    expect(report.languages[0]?.language).toBe('python');
  });

  it('builds nested directory tree with rollups', () => {
    const files: FileEntry[] = [
      f('src/foo/a.ts', 'typescript', 10),
      f('src/foo/b.ts', 'typescript', 20),
      f('src/bar/c.ts', 'typescript', 5),
      f('src/foo/d.test.ts', 'typescript', 3, true),
    ];
    const tree = buildDirectoryTree(files);
    expect(tree.files).toBe(4);
    expect(tree.source.code).toBe(35);
    expect(tree.test.code).toBe(3);
    const src = tree.children.find(c => c.name === 'src')!;
    expect(src.files).toBe(4);
    const foo = src.children.find(c => c.name === 'foo')!;
    expect(foo.files).toBe(3);
    expect(foo.source.code).toBe(30);
    expect(foo.test.code).toBe(3);
    const bar = src.children.find(c => c.name === 'bar')!;
    expect(bar.files).toBe(1);
    expect(bar.source.code).toBe(5);
  });

  it('sorts file list by path', () => {
    const files = [f('b.ts', 'typescript', 1), f('a.ts', 'typescript', 1)];
    const report = buildReport({
      rootPath: '/r',
      scope: '',
      startedAt: Date.now(),
      files,
      skipped: [],
    });
    expect(report.files.map(f => f.path)).toEqual(['a.ts', 'b.ts']);
  });
});
