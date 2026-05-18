import { describe, expect, it } from 'vitest';

import { buildReport } from '../aggregator';
import { buildDiff } from '../diff';
import { exportCsv } from '../exporters/csv';
import { exportJson } from '../exporters/json';
import { exportMarkdown } from '../exporters/markdown';

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

const report = buildReport({
  rootPath: '/r',
  scope: '',
  startedAt: Date.now() - 5,
  files: [
    f('src/a.ts', 10),
    f('src/a.test.ts', 4, true),
  ],
  skipped: [],
});

describe('exportCsv', () => {
  it('emits header row + one row per file', () => {
    const csv = exportCsv(report);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('path,language,isTest,testReason,size,code,comment,blank,total');
    expect(lines).toHaveLength(3);
  });

  it('escapes commas and quotes', () => {
    const r = buildReport({
      rootPath: '/r',
      scope: '',
      startedAt: Date.now(),
      files: [{
        path: 'with,comma,"quotes".ts',
        language: 'typescript',
        size: 0,
        isTest: false,
        testReason: 'none',
        count: { code: 1, comment: 0, blank: 0, total: 1 },
      }],
      skipped: [],
    });
    const csv = exportCsv(r);
    expect(csv).toContain('"with,comma,""quotes"".ts"');
  });
});

describe('exportJson', () => {
  it('round-trips as JSON', () => {
    const text = exportJson(report);
    const parsed = JSON.parse(text);
    expect(parsed.summary.totalFiles).toBe(2);
  });
});

describe('exportMarkdown', () => {
  it('emits summary + language + top-files sections', () => {
    const md = exportMarkdown(report);
    expect(md).toContain('# TallyCode Report');
    expect(md).toContain('## Summary');
    expect(md).toContain('## By Language');
    expect(md).toContain('## Top 20 Files by Code Lines');
    expect(md).toContain('`src/a.ts`');
  });

  it('appends diff section when provided', () => {
    const baseline = buildReport({
      rootPath: '/r',
      scope: '',
      startedAt: Date.now() - 1000,
      files: [f('src/a.ts', 5)],
      skipped: [],
    });
    const diff = buildDiff(baseline, report);
    const md = exportMarkdown(report, diff);
    expect(md).toContain('## Diff vs Baseline');
  });
});
