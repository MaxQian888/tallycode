import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FileTable } from '@/views/FileTable';

import type { FileEntry, Report } from '@shared/report';

function f(path: string, language: string, code: number, isTest = false): FileEntry {
  return {
    path,
    language,
    size: 0,
    isTest,
    testReason: isTest ? 'filename' : 'none',
    count: { code, comment: 0, blank: 0, total: code },
  };
}

function report(files: FileEntry[]): Report {
  return {
    schemaVersion: 1,
    rootPath: '/r',
    scope: '',
    scannedAt: new Date().toISOString(),
    durationMs: 1,
    summary: {
      totalFiles: files.length,
      testFiles: files.filter(f => f.isTest).length,
      sourceFiles: files.filter(f => !f.isTest).length,
      total: { code: 0, comment: 0, blank: 0, total: 0 },
      source: { code: 0, comment: 0, blank: 0, total: 0 },
      test: { code: 0, comment: 0, blank: 0, total: 0 },
      languageCount: new Set(files.map(f => f.language)).size,
    },
    languages: [],
    directoryTree: {
      path: '',
      name: '',
      files: 0,
      testFiles: 0,
      source: { code: 0, comment: 0, blank: 0, total: 0 },
      test: { code: 0, comment: 0, blank: 0, total: 0 },
      total: { code: 0, comment: 0, blank: 0, total: 0 },
      children: [],
    },
    files,
    skipped: [],
  };
}

describe('fileTable', () => {
  const r = report([
    f('src/a.ts', 'typescript', 100),
    f('src/b.py', 'python', 50),
    f('src/a.test.ts', 'typescript', 20, true),
  ]);

  it('renders every file row by default', () => {
    render(<FileTable report={r} />);
    expect(screen.getByText('src/a.ts')).toBeInTheDocument();
    expect(screen.getByText('src/b.py')).toBeInTheDocument();
    expect(screen.getByText('src/a.test.ts')).toBeInTheDocument();
  });

  it('filters by search query', () => {
    render(<FileTable report={r} />);
    fireEvent.change(screen.getByPlaceholderText(/search path/i), { target: { value: 'b.py' } });
    expect(screen.queryByText('src/a.ts')).not.toBeInTheDocument();
    expect(screen.getByText('src/b.py')).toBeInTheDocument();
  });

  it('filters to source files only', () => {
    render(<FileTable report={r} />);
    // open the test-filter Select trigger by role and click "Source only"
    const triggers = screen.getAllByRole('combobox');
    fireEvent.click(triggers[triggers.length - 1]!);
    fireEvent.click(screen.getByText(/source only/i));
    expect(screen.queryByText('src/a.test.ts')).not.toBeInTheDocument();
  });

  it('shows test reason badge on test files', () => {
    render(<FileTable report={r} />);
    // The test file row shows its testReason ("filename") as a badge.
    expect(screen.getAllByText(/filename/i).length).toBeGreaterThan(0);
  });
});
