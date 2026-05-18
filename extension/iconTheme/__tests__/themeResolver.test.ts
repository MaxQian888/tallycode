import { describe, expect, it } from 'vitest';

import { parseIconThemeJson, resolveFileIcon, resolveFolderIcon, stripJsonComments } from '../themeResolver';

describe('stripJsonComments', () => {
  it('removes line comments outside strings', () => {
    expect(stripJsonComments('{ // hello\n "a": 1 }')).toBe('{ \n "a": 1 }');
  });

  it('removes block comments outside strings', () => {
    expect(stripJsonComments('{ /* x */ "a": 1 }')).toBe('{  "a": 1 }');
  });

  it('keeps comment-like sequences inside strings intact', () => {
    const input = '{ "a": "https://example.com", "b": "/* not a comment */" }';
    expect(stripJsonComments(input)).toBe(input);
  });

  it('strips trailing commas before closing brace/bracket', () => {
    expect(stripJsonComments('{ "a": 1, "b": 2, }')).toBe('{ "a": 1, "b": 2 }');
    expect(stripJsonComments('[1, 2, 3,]')).toBe('[1, 2, 3]');
  });
});

describe('parseIconThemeJson', () => {
  const themeDir = '/theme';
  const json = JSON.stringify({
    iconDefinitions: {
      _file: { iconPath: './icons/file.svg' },
      _folder: { iconPath: './icons/folder.svg' },
      _folder_open: { iconPath: './icons/folder-open.svg' },
      _ts: { iconPath: './icons/typescript.svg' },
      _react_ts: { iconPath: './icons/react_ts.svg' },
      _package_json: { iconPath: './icons/npm.svg' },
      _src_folder: { iconPath: './icons/folder-src.svg' },
      _src_folder_open: { iconPath: './icons/folder-src-open.svg' },
      _font_only: { fontCharacter: '\\E001' }, // no iconPath
    },
    file: '_file',
    folder: '_folder',
    folderExpanded: '_folder_open',
    fileExtensions: { 'ts': '_ts', 'test.ts': '_react_ts' },
    fileNames: { 'package.json': '_package_json' },
    languageIds: { typescript: '_ts' },
    folderNames: { src: '_src_folder' },
    folderNamesExpanded: { src: '_src_folder_open' },
    light: {
      file: '_light_file', // missing definition — should be ignored
    },
  });

  it('resolves icon paths relative to the theme directory', () => {
    const theme = parseIconThemeJson(json, themeDir);
    expect(theme.iconPaths.get('_file')).toMatch(/icons[\\/]file\.svg$/);
    expect(theme.iconPaths.get('_font_only')).toBeUndefined();
  });

  it('picks light overrides when requested', () => {
    const theme = parseIconThemeJson(json, themeDir, 'light');
    // _light_file has no iconPath registered, so resolveFileIcon should not
    // pick it — the resolver skips defaults that can't be rendered.
    expect(theme.defaults.file).toBe('_light_file');
  });

  it('matches by exact filename before extension', () => {
    const theme = parseIconThemeJson(json, themeDir);
    expect(resolveFileIcon(theme, 'src/package.json')).toBe('_package_json');
  });

  it('matches by file extension, longest first', () => {
    const theme = parseIconThemeJson(json, themeDir);
    expect(resolveFileIcon(theme, 'src/foo.ts')).toBe('_ts');
    expect(resolveFileIcon(theme, 'src/Component.test.ts')).toBe('_react_ts');
  });

  it('matches by language id only when no extension hit', () => {
    const theme = parseIconThemeJson(json, themeDir);
    // .unknownext has no extension mapping; languageId provides the answer.
    expect(resolveFileIcon(theme, 'src/foo.unknownext', 'typescript')).toBe('_ts');
  });

  it('falls back to default file icon when nothing matches', () => {
    const theme = parseIconThemeJson(json, themeDir);
    expect(resolveFileIcon(theme, 'README')).toBe('_file');
  });

  it('returns null when even the default file icon is missing', () => {
    const theme = parseIconThemeJson(JSON.stringify({ iconDefinitions: {} }), themeDir);
    expect(resolveFileIcon(theme, 'foo.ts')).toBeNull();
  });

  it('resolves named folder icons with separate open/closed variants', () => {
    const theme = parseIconThemeJson(json, themeDir);
    expect(resolveFolderIcon(theme, 'src', false)).toBe('_src_folder');
    expect(resolveFolderIcon(theme, 'src', true)).toBe('_src_folder_open');
  });

  it('falls back to default folder icons for unnamed dirs', () => {
    const theme = parseIconThemeJson(json, themeDir);
    expect(resolveFolderIcon(theme, 'lib', false)).toBe('_folder');
    expect(resolveFolderIcon(theme, 'lib', true)).toBe('_folder_open');
  });
});
