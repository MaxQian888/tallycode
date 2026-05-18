import * as path from 'node:path';

/**
 * Pure VSCode icon-theme parsing + matching. No `vscode` import here so tests
 * can run without a VSCode runtime — the discovery side (which extension
 * contributes the theme, which color variant is active) lives in
 * `themeLoader.ts`.
 */

interface RawIconDefinition {
  iconPath?: string;
  fontCharacter?: string;
}

interface RawIconThemeJson {
  iconDefinitions?: Record<string, RawIconDefinition>;
  file?: string;
  folder?: string;
  folderExpanded?: string;
  fileExtensions?: Record<string, string>;
  fileNames?: Record<string, string>;
  languageIds?: Record<string, string>;
  folderNames?: Record<string, string>;
  folderNamesExpanded?: Record<string, string>;
  rootFolder?: string;
  rootFolderExpanded?: string;
  light?: Omit<RawIconThemeJson, 'light' | 'highContrast'>;
  highContrast?: Omit<RawIconThemeJson, 'light' | 'highContrast'>;
}

export type ColorVariant = 'light' | 'dark' | 'highContrast';

export interface ResolvedIconTheme {
  /** Absolute fs path for each iconId that has a real image file. */
  iconPaths: Map<string, string>;
  defaults: {
    file: string | null;
    folder: string | null;
    folderExpanded: string | null;
    rootFolder: string | null;
    rootFolderExpanded: string | null;
  };
  fileExtensions: Map<string, string>;
  fileNames: Map<string, string>;
  languageIds: Map<string, string>;
  folderNames: Map<string, string>;
  folderNamesExpanded: Map<string, string>;
}

/**
 * VSCode's theme JSONs are technically JSONC — comments + trailing commas are
 * accepted. Strip them so a vanilla JSON.parse works.
 */
export function stripJsonComments(input: string): string {
  let out = '';
  let i = 0;
  let inString = false;
  let stringQuote = '';
  while (i < input.length) {
    const c = input[i]!;
    if (inString) {
      if (c === '\\' && i + 1 < input.length) {
        out += c + input[i + 1];
        i += 2;
        continue;
      }
      if (c === stringQuote)
        inString = false;
      out += c;
      i += 1;
      continue;
    }
    if (c === '"' || c === '\'') {
      inString = true;
      stringQuote = c;
      out += c;
      i += 1;
      continue;
    }
    if (c === '/' && input[i + 1] === '/') {
      i += 2;
      while (i < input.length && input[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && input[i + 1] === '*') {
      i += 2;
      while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

/**
 * Turn a JSON-with-comments string + the directory the JSON lives in (used to
 * resolve relative iconPaths) into a ResolvedIconTheme. Light/highContrast
 * overrides are *sparse* per the spec — fields present in the variant
 * override fields in the root; missing fields fall through.
 */
export function parseIconThemeJson(content: string, themeDir: string, variant: ColorVariant = 'dark'): ResolvedIconTheme {
  const raw = JSON.parse(stripJsonComments(content)) as RawIconThemeJson;

  const merged: RawIconThemeJson = { ...raw };
  if (variant === 'light' && raw.light) {
    Object.assign(merged, raw.light);
  }
  else if (variant === 'highContrast' && raw.highContrast) {
    Object.assign(merged, raw.highContrast);
  }

  const iconPaths = new Map<string, string>();
  for (const [id, def] of Object.entries(raw.iconDefinitions ?? {})) {
    // Font-character icons aren't supported in the MVP — skip them so the
    // resolver can fall back to a sibling rule or the theme default.
    if (def.iconPath)
      iconPaths.set(id, path.resolve(themeDir, def.iconPath));
  }

  return {
    iconPaths,
    defaults: {
      file: merged.file ?? null,
      folder: merged.folder ?? null,
      folderExpanded: merged.folderExpanded ?? null,
      rootFolder: merged.rootFolder ?? null,
      rootFolderExpanded: merged.rootFolderExpanded ?? null,
    },
    fileExtensions: toLowerKeyMap(merged.fileExtensions),
    fileNames: toLowerKeyMap(merged.fileNames),
    // Language ids are case-sensitive in VSCode, so don't lowercase them.
    languageIds: new Map(Object.entries(merged.languageIds ?? {})),
    folderNames: toLowerKeyMap(merged.folderNames),
    folderNamesExpanded: toLowerKeyMap(merged.folderNamesExpanded),
  };
}

function toLowerKeyMap(o: Record<string, string> | undefined): Map<string, string> {
  const m = new Map<string, string>();
  if (!o)
    return m;
  for (const [k, v] of Object.entries(o)) m.set(k.toLowerCase(), v);
  return m;
}

/**
 * Match precedence: filename → file extension (longest match) → languageId →
 * default `file`. The first id that maps to an actual icon file wins;
 * font-only definitions are skipped so we don't return an iconId the bundler
 * can't render.
 */
export function resolveFileIcon(theme: ResolvedIconTheme, filePath: string, languageId?: string): string | null {
  const basename = filePath.includes('/') ? filePath.slice(filePath.lastIndexOf('/') + 1) : filePath;
  const lc = basename.toLowerCase();

  const byName = theme.fileNames.get(lc);
  if (byName && theme.iconPaths.has(byName))
    return byName;

  const dotIdx = lc.indexOf('.');
  if (dotIdx >= 0) {
    let ext = lc.slice(dotIdx + 1);
    while (ext) {
      const byExt = theme.fileExtensions.get(ext);
      if (byExt && theme.iconPaths.has(byExt))
        return byExt;
      const nextDot = ext.indexOf('.');
      if (nextDot < 0)
        break;
      ext = ext.slice(nextDot + 1);
    }
  }

  if (languageId) {
    const byLang = theme.languageIds.get(languageId);
    if (byLang && theme.iconPaths.has(byLang))
      return byLang;
  }

  if (theme.defaults.file && theme.iconPaths.has(theme.defaults.file))
    return theme.defaults.file;
  return null;
}

/**
 * Folder matching. Root nodes get `rootFolder` / `rootFolderExpanded` when
 * the theme provides them, else fall through to the regular folder defaults
 * so empty themes still produce something.
 */
export function resolveFolderIcon(theme: ResolvedIconTheme, dirPath: string, expanded: boolean): string | null {
  const isRoot = dirPath === '';
  const basename = isRoot
    ? ''
    : dirPath.includes('/') ? dirPath.slice(dirPath.lastIndexOf('/') + 1) : dirPath;
  const lc = basename.toLowerCase();

  if (!isRoot) {
    const named = expanded
      ? theme.folderNamesExpanded.get(lc) ?? theme.folderNames.get(lc)
      : theme.folderNames.get(lc);
    if (named && theme.iconPaths.has(named))
      return named;
  }
  else {
    const rootId = expanded
      ? theme.defaults.rootFolderExpanded ?? theme.defaults.rootFolder
      : theme.defaults.rootFolder;
    if (rootId && theme.iconPaths.has(rootId))
      return rootId;
  }

  const def = expanded
    ? theme.defaults.folderExpanded ?? theme.defaults.folder
    : theme.defaults.folder;
  if (def && theme.iconPaths.has(def))
    return def;
  return null;
}
