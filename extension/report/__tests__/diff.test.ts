import { describe, expect, it } from 'vitest';

import { buildReport } from '../aggregator';
import { buildDiff } from '../diff';

import type { FileEntry } from '@shared/report';

function f(path: string, code: number, isTest = false): FileEntry {
  return {
    path,
    language: 'typescript',
    size: 0,
    isTest,
    testReason: isTest ? 'filename' : 'none',
    count: { code, comment: 0, blank: 0, total: code },
  };
}

describe('buildDiff', () => {
  const baseline = buildReport({
    rootPath: '/r',
    scope: '',
    startedAt: Date.now() - 1000,
    files: [
      f('a.ts', 10),
      f('b.ts', 5),
    ],
    skipped: [],
  });

  it('detects added/removed/changed/unchanged', () => {
    const current = buildReport({
      rootPath: '/r',
      scope: '',
      startedAt: Date.now(),
      files: [
        f('a.ts', 12), // changed
        // b.ts removed
        f('c.ts', 8), // added
      ],
      skipped: [],
    });
    const diff = buildDiff(baseline, current);
    const byPath = new Map(diff.files.map(d => [d.path, d]));
    expect(byPath.get('a.ts')?.status).toBe('changed');
    expect(byPath.get('b.ts')?.status).toBe('removed');
    expect(byPath.get('c.ts')?.status).toBe('added');
  });

  it('summary delta', () => {
    const current = buildReport({
      rootPath: '/r',
      scope: '',
      startedAt: Date.now(),
      files: [f('a.ts', 20)],
      skipped: [],
    });
    const diff = buildDiff(baseline, current);
    // baseline total code: 15, current: 20, delta: 5
    expect(diff.summary.before.code).toBe(15);
    expect(diff.summary.after.code).toBe(20);
    expect(diff.summary.delta.code).toBe(5);
    expect(diff.summary.filesBefore).toBe(2);
    expect(diff.summary.filesAfter).toBe(1);
    expect(diff.summary.filesRemoved).toBe(1);
    expect(diff.summary.filesAdded).toBe(0);
    expect(diff.summary.filesChanged).toBe(1);
  });

  it('unchanged file when counts match exactly', () => {
    const current = buildReport({
      rootPath: '/r',
      scope: '',
      startedAt: Date.now(),
      files: [f('a.ts', 10), f('b.ts', 5)],
      skipped: [],
    });
    const diff = buildDiff(baseline, current);
    expect(diff.files.every(f => f.status === 'unchanged')).toBe(true);
  });
});
