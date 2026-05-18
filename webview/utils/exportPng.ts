import { toPng } from 'html-to-image';

import { vscode } from './vscode';

import type { ThemeKind } from '@/hooks/useTheme';

function fallbackForTheme(theme?: ThemeKind): string {
  if (theme === 'light')
    return '#ffffff';
  if (theme === 'high-contrast')
    return '#000000';
  return '#0d1117';
}

/**
 * Resolve a background color for the PNG export. Prefers the live VSCode
 * editor background CSS variable, then falls back to a theme-appropriate
 * solid color when the variable is unset (e.g. during tests).
 */
export function resolveExportBackground(node: HTMLElement | null, theme?: ThemeKind): string {
  if (typeof document === 'undefined')
    return fallbackForTheme(theme);
  const root = document.documentElement;
  const fromRoot = getComputedStyle(root).getPropertyValue('--vscode-editor-background').trim();
  if (fromRoot)
    return fromRoot;
  if (node) {
    const fromNode = getComputedStyle(node).backgroundColor;
    if (fromNode && fromNode !== 'rgba(0, 0, 0, 0)')
      return fromNode;
  }
  return fallbackForTheme(theme);
}

export async function exportPng(
  node: HTMLElement,
  suggestedName: string,
  theme?: ThemeKind,
): Promise<void> {
  const backgroundColor = resolveExportBackground(node, theme);
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    backgroundColor,
    cacheBust: true,
  });
  vscode.postMessage({ type: 'export/png', pngBase64: dataUrl, suggestedName });
}
