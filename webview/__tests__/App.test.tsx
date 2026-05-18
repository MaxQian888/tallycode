import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../App';

import { mockVsCodeApi } from './setup';

import type { Report } from '@shared/report';

function dispatchMessage(data: unknown): void {
  window.dispatchEvent(new MessageEvent('message', { data }));
}

function fakeReport(): Report {
  return {
    schemaVersion: 1,
    rootPath: '/r',
    scope: '',
    scannedAt: new Date().toISOString(),
    durationMs: 42,
    summary: {
      totalFiles: 2,
      testFiles: 1,
      sourceFiles: 1,
      total: { code: 30, comment: 5, blank: 5, total: 40 },
      source: { code: 20, comment: 3, blank: 2, total: 25 },
      test: { code: 10, comment: 2, blank: 3, total: 15 },
      languageCount: 1,
    },
    languages: [{
      language: 'typescript',
      files: 2,
      testFiles: 1,
      source: { code: 20, comment: 3, blank: 2, total: 25 },
      test: { code: 10, comment: 2, blank: 3, total: 15 },
      total: { code: 30, comment: 5, blank: 5, total: 40 },
    }],
    directoryTree: {
      path: '',
      name: '',
      files: 2,
      testFiles: 1,
      source: { code: 20, comment: 3, blank: 2, total: 25 },
      test: { code: 10, comment: 2, blank: 3, total: 15 },
      total: { code: 30, comment: 5, blank: 5, total: 40 },
      children: [],
    },
    files: [
      { path: 'src/a.ts', language: 'typescript', size: 100, isTest: false, testReason: 'none', count: { code: 20, comment: 3, blank: 2, total: 25 } },
      { path: 'src/a.test.ts', language: 'typescript', size: 50, isTest: true, testReason: 'filename', count: { code: 10, comment: 2, blank: 3, total: 15 } },
    ],
    skipped: [],
  };
}

describe('app / Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the TallyCode header', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'TallyCode' })).toBeInTheDocument();
  });

  it('signals webview/ready on mount', () => {
    render(<App />);
    expect(mockVsCodeApi.postMessage).toHaveBeenCalledWith({ type: 'webview/ready' });
  });

  it('shows empty state when no report yet', () => {
    render(<App />);
    expect(screen.getByText(/Run your first scan/i)).toBeInTheDocument();
  });

  it('starts a workspace scan when Scan workspace button clicked', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /scan workspace/i })[0]!);
    expect(mockVsCodeApi.postMessage).toHaveBeenCalledWith({ type: 'scan/start', scope: 'workspace' });
  });

  it('renders KPI cards once a report arrives', () => {
    render(<App />);
    act(() => dispatchMessage({ type: 'scan/done', report: fakeReport() }));
    expect(screen.getByText('Total files')).toBeInTheDocument();
    expect(screen.getByText('Total lines')).toBeInTheDocument();
    expect(screen.getByText('Test share')).toBeInTheDocument();
  });

  it('shows a progress bar while scanning', () => {
    render(<App />);
    act(() => dispatchMessage({ type: 'scan/progress', processed: 5, total: 10, currentFile: 'foo.ts' }));
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders an error banner on scan failure', () => {
    render(<App />);
    act(() => dispatchMessage({ type: 'scan/error', message: 'oh no' }));
    expect(screen.getByText(/oh no/i)).toBeInTheDocument();
  });

  it('save baseline posts the message', () => {
    render(<App />);
    act(() => dispatchMessage({ type: 'scan/done', report: fakeReport() }));
    fireEvent.click(screen.getByRole('button', { name: /save baseline/i }));
    expect(mockVsCodeApi.postMessage).toHaveBeenCalledWith({ type: 'baseline/save' });
  });
});
