import { Buffer } from 'node:buffer';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { resolveFileIcon, resolveFolderIcon } from './themeResolver';

import type { ResolvedIconTheme } from './themeResolver';
import type { IconThemePayload } from '@shared/messages';
import type { DirectoryNode, FileEntry } from '@shared/report';

export interface IconSelection {
  /** iconIds the bundler must read off disk and encode. */
  neededIds: Set<string>;
  fileIcons: Record<string, string>;
  folderIcons: Record<string, { closed: string; open: string }>;
}

/**
 * Pure: walk a report's files + directory tree, decide which iconId each path
 * should use, and collect the set of icons that need to be loaded. Splitting
 * this from the IO-bound encoder keeps the matching logic unit-testable
 * without touching the filesystem.
 */
export function selectIconsForReport(
  theme: ResolvedIconTheme,
  files: FileEntry[],
  directoryTree: DirectoryNode,
): IconSelection {
  const fileIcons: Record<string, string> = {};
  const folderIcons: Record<string, { closed: string; open: string }> = {};
  const neededIds = new Set<string>();

  for (const f of files) {
    const id = resolveFileIcon(theme, f.path, f.language);
    if (id) {
      fileIcons[f.path] = id;
      neededIds.add(id);
    }
  }

  const visit = (node: DirectoryNode): void => {
    const closed = resolveFolderIcon(theme, node.path, false);
    const open = resolveFolderIcon(theme, node.path, true);
    if (closed || open) {
      folderIcons[node.path] = {
        closed: closed ?? open ?? '',
        open: open ?? closed ?? '',
      };
      if (closed)
        neededIds.add(closed);
      if (open)
        neededIds.add(open);
    }
    for (const c of node.children) visit(c);
  };
  visit(directoryTree);

  return { neededIds, fileIcons, folderIcons };
}

/**
 * IO-bound: turn each needed iconId into a data URI by reading its image file
 * and base64-encoding it. Unreadable icons are silently dropped so a single
 * missing asset can't poison the whole payload — the webview just falls back
 * to lucide for those paths.
 */
export async function encodeIcons(
  theme: ResolvedIconTheme,
  neededIds: Set<string>,
): Promise<Record<string, string>> {
  const icons: Record<string, string> = {};
  await Promise.all([...neededIds].map(async (id) => {
    const fsPath = theme.iconPaths.get(id);
    if (!fsPath)
      return;
    try {
      const bytes = await fs.readFile(fsPath);
      icons[id] = `data:${mimeFor(fsPath)};base64,${Buffer.from(bytes).toString('base64')}`;
    }
    catch {
      // Skip — caller's job to tolerate a missing icon.
    }
  }));
  return icons;
}

function mimeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.svg')
    return 'image/svg+xml';
  if (ext === '.png')
    return 'image/png';
  if (ext === '.gif')
    return 'image/gif';
  if (ext === '.jpg' || ext === '.jpeg')
    return 'image/jpeg';
  if (ext === '.webp')
    return 'image/webp';
  return 'application/octet-stream';
}

export async function buildIconPayload(
  theme: ResolvedIconTheme | null,
  files: FileEntry[],
  directoryTree: DirectoryNode,
): Promise<IconThemePayload> {
  if (!theme)
    return { active: false, icons: {}, fileIcons: {}, folderIcons: {} };
  const sel = selectIconsForReport(theme, files, directoryTree);
  const icons = await encodeIcons(theme, sel.neededIds);
  return { active: true, icons, fileIcons: sel.fileIcons, folderIcons: sel.folderIcons };
}
