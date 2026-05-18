import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DiffView } from '@/views/DiffView';

import type { DiffReport } from '@shared/report';

function makeDiff(): DiffReport {
  return {
    schemaVersion: 1,
    baselineAt: new Date('2026-01-01').toISOString(),
    currentAt: new Date('2026-02-01').toISOString(),
    summary: {
      before: { code: 100, comment: 10, blank: 5, total: 115 },
      after: { code: 150, comment: 12, blank: 7, total: 169 },
      delta: { code: 50, comment: 2, blank: 2, total: 54 },
      filesBefore: 2,
      filesAfter: 3,
      filesAdded: 1,
      filesRemoved: 0,
      filesChanged: 1,
    },
    languages: [],
    files: [
      { path: 'src/a.ts', language: 'typescript', status: 'changed', before: { code: 50, comment: 0, blank: 0, total: 50 }, after: { code: 70, comment: 0, blank: 0, total: 70 } },
      { path: 'src/b.ts', language: 'typescript', status: 'added', before: null, after: { code: 30, comment: 0, blank: 0, total: 30 } },
      { path: 'src/c.ts', language: 'typescript', status: 'unchanged', before: { code: 50, comment: 0, blank: 0, total: 50 }, after: { code: 50, comment: 0, blank: 0, total: 50 } },
    ],
  };
}

describe('diffView', () => {
  it('renders delta tiles for code/comment/blank/total', () => {
    render(<DiffView diff={makeDiff()} />);
    expect(screen.getByText('Code lines')).toBeInTheDocument();
    expect(screen.getByText('Comments')).toBeInTheDocument();
    expect(screen.getByText('Blank lines')).toBeInTheDocument();
    expect(screen.getByText('Total lines')).toBeInTheDocument();
  });

  it('shows positive deltas in green-ish styling (text content presence)', () => {
    render(<DiffView diff={makeDiff()} />);
    expect(screen.getAllByText('+50').length).toBeGreaterThan(0);
  });

  it('lists changed and added files, skips unchanged', () => {
    render(<DiffView diff={makeDiff()} />);
    expect(screen.getByText('src/a.ts')).toBeInTheDocument();
    expect(screen.getByText('src/b.ts')).toBeInTheDocument();
    expect(screen.queryByText('src/c.ts')).not.toBeInTheDocument();
  });

  it('shows summary badges with counts', () => {
    render(<DiffView diff={makeDiff()} />);
    expect(screen.getByText(/1 added/i)).toBeInTheDocument();
    expect(screen.getByText(/0 removed/i)).toBeInTheDocument();
    expect(screen.getByText(/1 changed/i)).toBeInTheDocument();
  });
});
