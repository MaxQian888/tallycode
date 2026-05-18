import { Buffer } from 'node:buffer';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { ColorThemeKind, extensions, window, workspace } from 'vscode';

import { parseIconThemeJson } from './themeResolver';

import type { ColorVariant, ResolvedIconTheme } from './themeResolver';

/** vscode-coupled discovery + IO for the active file-icon theme. */

function pickVariant(kind: ColorThemeKind): ColorVariant {
  switch (kind) {
    case ColorThemeKind.Light:
    case ColorThemeKind.HighContrastLight:
      return 'light';
    case ColorThemeKind.HighContrast:
      return 'highContrast';
    default:
      return 'dark';
  }
}

/**
 * Find the icon theme contributing the configured id. Searches every installed
 * extension's package.json contributions. Returns the absolute fs path to the
 * theme's JSON file, or null when nothing matches (theme uninstalled, set to
 * null, or built-in not located).
 */
export function locateActiveIconThemePath(): string | null {
  const themeId = workspace.getConfiguration('workbench').get<string | null>('iconTheme');
  if (!themeId)
    return null;
  for (const ext of extensions.all) {
    const themes = ext.packageJSON?.contributes?.iconThemes as
      | Array<{ id?: string; label?: string; path?: string }>
      | undefined;
    if (!themes)
      continue;
    const match = themes.find(t => t.id === themeId);
    if (match?.path)
      return path.resolve(ext.extensionPath, match.path);
  }
  return null;
}

/**
 * Load the currently active VSCode icon theme. Returns null when the user has
 * no theme set, the contributing extension can't be located, or the theme
 * JSON fails to parse.
 */
export async function loadActiveIconTheme(): Promise<ResolvedIconTheme | null> {
  const themePath = locateActiveIconThemePath();
  if (!themePath)
    return null;
  let content: string;
  try {
    const bytes = await fs.readFile(themePath);
    content = Buffer.from(bytes).toString('utf8');
  }
  catch {
    return null;
  }
  try {
    return parseIconThemeJson(content, path.dirname(themePath), pickVariant(window.activeColorTheme.kind));
  }
  catch {
    return null;
  }
}
