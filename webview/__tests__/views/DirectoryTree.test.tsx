import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DirectoryTree } from '@/views/DirectoryTree';

import type { IconThemePayload } from '@shared/messages';
import type { CountResult, DirectoryNode, FileEntry, Report } from '@shared/report';

const ZERO: CountResult = { code: 0, comment: 0, blank: 0, total: 0 };

function node(path: string, name: string, children: DirectoryNode[] = []): DirectoryNode {
  return {
    path,
    name,
    files: 0,
    testFiles: 0,
    source: { ...ZERO },
    test: { ...ZERO },
    total: { ...ZERO },
    children,
  };
}

function file(path: string, opts: Partial<FileEntry> = {}): FileEntry {
  return {
    path,
    language: 'javascript',
    size: 100,
    isTest: false,
    testReason: 'none',
    count: { code: 10, comment: 2, blank: 1, total: 13 },
    ...opts,
  };
}

function reportFrom(tree: DirectoryNode, files: FileEntry[] = []): Report {
  return {
    schemaVersion: 1,
    rootPath: '/r',
    scope: '',
    scannedAt: new Date().toISOString(),
    durationMs: 1,
    summary: {
      totalFiles: 0,
      testFiles: 0,
      sourceFiles: 0,
      total: { ...ZERO },
      source: { ...ZERO },
      test: { ...ZERO },
      languageCount: 0,
    },
    languages: [],
    directoryTree: tree,
    files,
    skipped: [],
  };
}

describe('directoryTree', () => {
  it('auto-expands the root and every depth-1 directory', () => {
    const tree = node('', '', [
      node('src', 'src', [
        node('src/foo', 'foo', [node('src/foo/grand', 'grand')]),
        node('src/bar', 'bar'),
      ]),
      node('docs', 'docs', [node('docs/api', 'api'), node('docs/guide', 'guide')]),
    ]);
    render(<DirectoryTree report={reportFrom(tree)} />);
    // Root + depth 1 expanded by default, so depth-1 dirs render their children.
    for (const name of ['src', 'docs', 'foo', 'bar', 'api', 'guide']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    // Depth 3 stays collapsed — `foo` has a sibling (`bar`), no chain to follow.
    expect(screen.queryByText('grand')).not.toBeInTheDocument();
  });

  it('auto-expands single-child chains so deep packages stay visible', () => {
    // src → main → java → com → foo (single-child chain) → bar (sibling-rich)
    const tree = node('', '', [
      node('src', 'src', [
        node('src/main', 'main', [
          node('src/main/java', 'java', [
            node('src/main/java/com', 'com', [
              node('src/main/java/com/foo', 'foo', [
                node('src/main/java/com/foo/a', 'a'),
                node('src/main/java/com/foo/b', 'b'),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]);
    render(<DirectoryTree report={reportFrom(tree)} />);
    // Whole single-child chain should be visible without any clicking.
    for (const name of ['src', 'main', 'java', 'com', 'foo']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    // But the branching children at the end are collapsed.
    expect(screen.queryByText('a')).not.toBeInTheDocument();
    expect(screen.queryByText('b')).not.toBeInTheDocument();
  });

  it('toggles a deep folder and preserves its state when its ancestor is collapsed and re-expanded', () => {
    const tree = node('', '', [
      node('src', 'src', [
        node('src/foo', 'foo', [
          node('src/foo/deep', 'deep', [node('src/foo/deep/leaf', 'leaf')]),
        ]),
        node('src/bar', 'bar'),
      ]),
    ]);
    render(<DirectoryTree report={reportFrom(tree)} />);

    // src is auto-expanded (depth 1). foo is collapsed (depth 2, has siblings).
    expect(screen.getByText('foo')).toBeInTheDocument();
    expect(screen.queryByText('deep')).not.toBeInTheDocument();

    // Expand foo, then deep.
    fireEvent.click(screen.getByText('foo'));
    expect(screen.getByText('deep')).toBeInTheDocument();
    fireEvent.click(screen.getByText('deep'));
    expect(screen.getByText('leaf')).toBeInTheDocument();

    // Collapse src — deep / leaf disappear.
    fireEvent.click(screen.getByText('src'));
    expect(screen.queryByText('foo')).not.toBeInTheDocument();
    expect(screen.queryByText('leaf')).not.toBeInTheDocument();

    // Re-expand src — previously-expanded descendants come back without
    // requiring the user to re-expand each level.
    fireEvent.click(screen.getByText('src'));
    expect(screen.getByText('foo')).toBeInTheDocument();
    expect(screen.getByText('deep')).toBeInTheDocument();
    expect(screen.getByText('leaf')).toBeInTheDocument();
  });

  it('expand-all reveals every nested folder; collapse-all keeps only root', () => {
    const tree = node('', '', [
      node('a', 'a', [
        node('a/b1', 'b1', [node('a/b1/c1', 'c1')]),
        node('a/b2', 'b2'),
      ]),
      node('x', 'x', [node('x/y', 'y')]),
    ]);
    render(<DirectoryTree report={reportFrom(tree)} />);

    // Default state hides depth-3 nodes once the tree branches at depth 2.
    expect(screen.queryByText('c1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /expand all/i }));
    for (const name of ['a', 'b1', 'b2', 'c1', 'x', 'y']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole('button', { name: /collapse all/i }));
    // Root stays expanded so depth-1 dirs remain visible — the tree never
    // goes blank — but everything deeper collapses.
    expect(screen.getByText('/')).toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('x')).toBeInTheDocument();
    for (const name of ['b1', 'b2', 'c1', 'y']) {
      expect(screen.queryByText(name)).not.toBeInTheDocument();
    }
  });

  it('renders direct file children of a file-only directory and lets the user toggle them', () => {
    // Mirrors react-cli-quick-starter: `source/` contains only files (no
    // subdirectories), so the aggregator emits an empty `children` array. The
    // tree must still treat `source` as expandable and show its files inside.
    const tree = node('', '', [node('source', 'source')]);
    const files = [file('source/app.js'), file('source/cli.js'), file('readme.md')];
    render(<DirectoryTree report={reportFrom(tree, files)} />);

    // Depth-1 file-only dir is auto-expanded, so its file leaves are visible.
    expect(screen.getByText('source')).toBeInTheDocument();
    expect(screen.getByText('app.js')).toBeInTheDocument();
    expect(screen.getByText('cli.js')).toBeInTheDocument();
    // Root-level file shows up under the auto-expanded root row.
    expect(screen.getByText('readme.md')).toBeInTheDocument();

    // `source` is now expandable — the row exposes aria-expanded and a click
    // collapses its file leaves.
    const sourceRow = screen.getByRole('button', { name: /source/ });
    expect(sourceRow).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(sourceRow);
    expect(screen.queryByText('app.js')).not.toBeInTheDocument();
    expect(screen.queryByText('cli.js')).not.toBeInTheDocument();

    // And re-expanding brings them back.
    fireEvent.click(sourceRow);
    expect(screen.getByText('app.js')).toBeInTheDocument();
    expect(screen.getByText('cli.js')).toBeInTheDocument();
  });

  it('expand-all reveals file leaves nested under deeper subdirectories', () => {
    const tree = node('', '', [
      node('src', 'src', [
        node('src/utils', 'utils'),
      ]),
    ]);
    const files = [file('src/utils/helpers.js'), file('src/utils/format.js')];
    render(<DirectoryTree report={reportFrom(tree, files)} />);

    // utils is depth 2 with no subdirs — auto-expansion stops at depth 1,
    // so its file leaves start hidden.
    expect(screen.queryByText('helpers.js')).not.toBeInTheDocument();
    expect(screen.queryByText('format.js')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /expand all/i }));
    expect(screen.getByText('helpers.js')).toBeInTheDocument();
    expect(screen.getByText('format.js')).toBeInTheDocument();
  });

  it('file leaves are not expandable rows of their own', () => {
    const tree = node('', '', [node('source', 'source')]);
    const files = [file('source/app.js')];
    render(<DirectoryTree report={reportFrom(tree, files)} />);

    // The file row is rendered, but it has no button / aria-expanded —
    // only directories are togglable.
    expect(screen.getByText('app.js')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /app\.js/ })).not.toBeInTheDocument();
  });

  it('renders themed icons for files and folders when an icon theme is active', () => {
    const tree = node('', '', [node('src', 'src')]);
    const files = [file('src/app.ts'), file('package.json')];
    const iconTheme: IconThemePayload = {
      active: true,
      icons: {
        _ts: 'data:image/svg+xml;base64,TS',
        _json: 'data:image/svg+xml;base64,JSON',
        _folder: 'data:image/svg+xml;base64,DIR',
        _folder_open: 'data:image/svg+xml;base64,DIR_OPEN',
        _src_folder_open: 'data:image/svg+xml;base64,SRC_OPEN',
      },
      fileIcons: { 'src/app.ts': '_ts', 'package.json': '_json' },
      folderIcons: {
        '': { closed: '_folder', open: '_folder_open' },
        'src': { closed: '_folder', open: '_src_folder_open' },
      },
    };

    const { container } = render(<DirectoryTree report={reportFrom(tree, files)} iconTheme={iconTheme} />);

    const srcs = Array.from(container.querySelectorAll('img'))
      .map(img => img.getAttribute('src'))
      .filter((s): s is string => !!s);
    expect(srcs).toContain('data:image/svg+xml;base64,DIR_OPEN'); // root, expanded
    expect(srcs).toContain('data:image/svg+xml;base64,SRC_OPEN'); // src, expanded
    expect(srcs).toContain('data:image/svg+xml;base64,TS'); // app.ts
    expect(srcs).toContain('data:image/svg+xml;base64,JSON'); // package.json
  });

  it('falls back to generic icons when no theme is provided or icon id is missing', () => {
    const tree = node('', '', [node('src', 'src')]);
    const files = [file('src/app.ts'), file('src/missing.unknown')];
    const iconTheme: IconThemePayload = {
      active: true,
      icons: { _ts: 'data:image/svg+xml;base64,TS' },
      // src/missing.unknown is intentionally absent from fileIcons -> fallback.
      fileIcons: { 'src/app.ts': '_ts' },
      folderIcons: {},
    };

    const { container } = render(<DirectoryTree report={reportFrom(tree, files)} iconTheme={iconTheme} />);

    const srcs = Array.from(container.querySelectorAll('img'))
      .map(img => img.getAttribute('src'))
      .filter((s): s is string => !!s);
    // Only the TS icon emits an <img>; the unknown file falls back to lucide
    // (an inline <svg>), so no extra data: URI shows up for it.
    expect(srcs).toEqual(['data:image/svg+xml;base64,TS']);
  });
});
