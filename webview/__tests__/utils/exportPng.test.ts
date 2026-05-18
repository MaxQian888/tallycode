import { afterEach, describe, expect, it, vi } from 'vitest';

import { exportPng, resolveExportBackground } from '@/utils/exportPng';

interface TestToPngOptions {
  backgroundColor?: string;
  pixelRatio?: number;
  cacheBust?: boolean;
}

const { toPngMock, postMessageMock } = vi.hoisted(() => ({
  toPngMock: vi.fn<(_node: HTMLElement, _opts: TestToPngOptions) => Promise<string>>(
    async () => 'data:image/png;base64,FAKE',
  ),
  postMessageMock: vi.fn<(_msg: unknown) => void>(),
}));

vi.mock('html-to-image', () => ({
  toPng: toPngMock,
}));

vi.mock('@/utils/vscode', () => ({
  vscode: { postMessage: postMessageMock },
}));

afterEach(() => {
  toPngMock.mockClear();
  postMessageMock.mockClear();
  document.documentElement.style.removeProperty('--vscode-editor-background');
});

describe('resolveExportBackground', () => {
  it('returns the value of --vscode-editor-background when set', () => {
    document.documentElement.style.setProperty('--vscode-editor-background', '#112233');
    expect(resolveExportBackground(null, 'dark')).toBe('#112233');
  });

  it('falls back to light theme background', () => {
    expect(resolveExportBackground(null, 'light')).toBe('#ffffff');
  });

  it('falls back to high-contrast background', () => {
    expect(resolveExportBackground(null, 'high-contrast')).toBe('#000000');
  });

  it('falls back to dark default when no theme/var provided', () => {
    expect(resolveExportBackground(null)).toBe('#0d1117');
  });

  it('uses element background as middle fallback', () => {
    const node = document.createElement('div');
    node.style.backgroundColor = 'rgb(10, 20, 30)';
    document.body.appendChild(node);
    try {
      expect(resolveExportBackground(node, 'dark')).toBe('rgb(10, 20, 30)');
    }
    finally {
      document.body.removeChild(node);
    }
  });
});

describe('exportPng', () => {
  it('passes resolved background color to toPng', async () => {
    document.documentElement.style.setProperty('--vscode-editor-background', '#abcdef');
    const node = document.createElement('div');
    await exportPng(node, 'shot.png', 'light');
    expect(toPngMock).toHaveBeenCalledOnce();
    const opts = toPngMock.mock.calls[0]![1] as { backgroundColor: string; pixelRatio: number };
    expect(opts.backgroundColor).toBe('#abcdef');
    expect(opts.pixelRatio).toBe(2);
  });

  it('posts data url to vscode', async () => {
    const node = document.createElement('div');
    await exportPng(node, 'shot.png', 'dark');
    expect(postMessageMock).toHaveBeenCalledOnce();
    const arg = postMessageMock.mock.calls[0]![0] as { type: string; pngBase64: string; suggestedName: string };
    expect(arg.type).toBe('export/png');
    expect(arg.pngBase64).toBe('data:image/png;base64,FAKE');
    expect(arg.suggestedName).toBe('shot.png');
  });
});
