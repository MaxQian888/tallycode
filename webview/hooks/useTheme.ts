import { useEffect, useState } from 'react';

import { useVscodeMessage } from './useVscodeMessage';

export type ThemeKind = 'light' | 'dark' | 'high-contrast';

function inferFromDocument(): ThemeKind {
  if (typeof document === 'undefined')
    return 'dark';
  const root = document.body;
  const attr = root.getAttribute('data-vscode-theme-kind');
  if (attr === 'vscode-light')
    return 'light';
  if (attr === 'vscode-high-contrast' || attr === 'vscode-high-contrast-light')
    return 'high-contrast';
  return 'dark';
}

/**
 * Track VSCode theme kind by subscribing to `theme/changed` messages and
 * falling back to the `body[data-vscode-theme-kind]` attribute set by the
 * webview shell.
 */
export function useTheme(): ThemeKind {
  const [theme, setTheme] = useState<ThemeKind>(() => inferFromDocument());

  useVscodeMessage('theme/changed', (m) => {
    setTheme(m.kind);
  });

  // The shell may set the data-attr after mount; re-read once after first paint
  // so the initial PNG export uses the correct background.
  useEffect(() => {
    setTheme(inferFromDocument());
  }, []);

  return theme;
}
