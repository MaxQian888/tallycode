import { describe, expect, it } from 'vitest';

import { selectIconsForReport } from '../iconBundler';
import { parseIconThemeJson } from '../themeResolver';

import type { CountResult, DirectoryNode, FileEntry } from '@shared/report';

const ZERO: CountResult = { code: 0, comment: 0, blank: 0, total: 0 };

function f(path: string, language = 'javascript'): FileEntry {
  return {
    path,
    language,
    size: 0,
    isTest: false,
    testReason: 'none',
    count: ZERO,
  };
}

function d(path: string, name: string, children: DirectoryNode[] = []): DirectoryNode {
  return {
    path,
    name,
    files: 0,
    testFiles: 0,
    source: ZERO,
    test: ZERO,
    total: ZERO,
    children,
  };
}

const THEME_JSON = JSON.stringify({
  iconDefinitions: {
    _file: { iconPath: './file.svg' },
    _folder: { iconPath: './folder.svg' },
    _folder_open: { iconPath: './folder-open.svg' },
    _ts: { iconPath: './ts.svg' },
    _json: { iconPath: './json.svg' },
    _src_folder: { iconPath: './src.svg' },
    _src_folder_open: { iconPath: './src-open.svg' },
  },
  file: '_file',
  folder: '_folder',
  folderExpanded: '_folder_open',
  fileExtensions: { ts: '_ts', json: '_json' },
  folderNames: { src: '_src_folder' },
  folderNamesExpanded: { src: '_src_folder_open' },
});

describe('selectIconsForReport', () => {
  it('maps each file to its theme icon id and deduplicates the icon set', () => {
    const theme = parseIconThemeJson(THEME_JSON, '/theme');
    const tree = d('', '', [d('src', 'src')]);
    const files = [f('src/a.ts', 'typescript'), f('src/b.ts'), f('package.json')];

    const sel = selectIconsForReport(theme, files, tree);

    expect(sel.fileIcons).toEqual({
      'src/a.ts': '_ts',
      'src/b.ts': '_ts',
      'package.json': '_json',
    });
    // Two .ts files share `_ts` — the needed set must dedupe.
    expect([...sel.neededIds].sort()).toEqual([
      '_folder',
      '_folder_open',
      '_json',
      '_src_folder',
      '_src_folder_open',
      '_ts',
    ]);
  });

  it('records both open and closed folder icons per directory', () => {
    const theme = parseIconThemeJson(THEME_JSON, '/theme');
    const tree = d('', '', [d('src', 'src')]);

    const sel = selectIconsForReport(theme, [], tree);

    expect(sel.folderIcons['']).toEqual({ closed: '_folder', open: '_folder_open' });
    expect(sel.folderIcons.src).toEqual({ closed: '_src_folder', open: '_src_folder_open' });
  });

  it('omits a file path when no icon resolves and the theme has no default', () => {
    const noDefaults = parseIconThemeJson(JSON.stringify({
      iconDefinitions: { _ts: { iconPath: './ts.svg' } },
      fileExtensions: { ts: '_ts' },
    }), '/theme');

    const sel = selectIconsForReport(noDefaults, [f('foo.unknown')], d('', ''));

    expect(sel.fileIcons).toEqual({});
    expect(sel.neededIds.size).toBe(0);
  });
});
