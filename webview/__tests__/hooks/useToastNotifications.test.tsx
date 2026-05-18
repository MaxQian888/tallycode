import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToastNotifications } from '@/hooks/useToastNotifications';

const { toastMock } = vi.hoisted(() => ({
  toastMock: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: toastMock,
}));

function Harness() {
  useToastNotifications();
  return null;
}

function dispatch(data: unknown): void {
  window.dispatchEvent(new MessageEvent('message', { data }));
}

describe('useToastNotifications', () => {
  beforeEach(() => {
    toastMock.success.mockClear();
    toastMock.error.mockClear();
    toastMock.info.mockClear();
  });

  it('scan/done triggers success toast with file count and duration', () => {
    render(<Harness />);
    dispatch({
      type: 'scan/done',
      report: {
        summary: { totalFiles: 42 },
        durationMs: 123,
      },
    });
    expect(toastMock.success).toHaveBeenCalledOnce();
    const arg = toastMock.success.mock.calls[0]![0] as string;
    expect(arg).toContain('42');
    expect(arg).toContain('123 ms');
  });

  it('scan/error triggers error toast', () => {
    render(<Harness />);
    dispatch({ type: 'scan/error', message: 'oh no' });
    expect(toastMock.error).toHaveBeenCalledOnce();
    expect(toastMock.error.mock.calls[0]![0]).toContain('oh no');
  });

  it('export/saved triggers success toast with path', () => {
    render(<Harness />);
    dispatch({ type: 'export/saved', path: '/tmp/foo.md', format: 'md' });
    expect(toastMock.success).toHaveBeenCalledOnce();
    expect(toastMock.success.mock.calls[0]![0]).toContain('/tmp/foo.md');
  });

  it('baseline/loaded with baseline triggers info toast', () => {
    render(<Harness />);
    dispatch({ type: 'baseline/loaded', baseline: { schemaVersion: 1 } });
    expect(toastMock.info).toHaveBeenCalledOnce();
  });

  it('baseline/loaded with null does NOT trigger info toast', () => {
    render(<Harness />);
    dispatch({ type: 'baseline/loaded', baseline: null });
    expect(toastMock.info).not.toHaveBeenCalled();
  });
});
