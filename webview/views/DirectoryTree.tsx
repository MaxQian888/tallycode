import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, File, Folder, FolderOpen } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';

import type { IconThemePayload } from '@shared/messages';
import type { DirectoryNode, FileEntry, Report } from '@shared/report';

interface Props {
  report: Report;
  iconTheme?: IconThemePayload;
}

const EMPTY_ICON_THEME: IconThemePayload = {
  active: false,
  icons: {},
  fileIcons: {},
  folderIcons: {},
};

function fileIconUri(theme: IconThemePayload, path: string): string | undefined {
  if (!theme.active)
    return undefined;
  const id = theme.fileIcons[path];
  return id ? theme.icons[id] : undefined;
}

function folderIconUri(theme: IconThemePayload, path: string, open: boolean): string | undefined {
  if (!theme.active)
    return undefined;
  const pair = theme.folderIcons[path];
  if (!pair)
    return undefined;
  const id = open ? pair.open : pair.closed;
  return id ? theme.icons[id] : undefined;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function parentDirOf(p: string): string {
  const i = p.lastIndexOf('/');
  return i < 0 ? '' : p.slice(0, i);
}

function basenameOf(p: string): string {
  const i = p.lastIndexOf('/');
  return i < 0 ? p : p.slice(i + 1);
}

/**
 * Map parent directory path → its direct file children. The aggregator only
 * tracks directory descendants; file leaves are pulled from report.files so
 * a directory whose contents are exclusively files (no subdirectories) is
 * still expandable and shows its files.
 */
function groupFilesByDir(files: FileEntry[]): Map<string, FileEntry[]> {
  const map = new Map<string, FileEntry[]>();
  for (const f of files) {
    const dir = parentDirOf(f.path);
    let arr = map.get(dir);
    if (!arr) {
      arr = [];
      map.set(dir, arr);
    }
    arr.push(f);
  }
  for (const arr of map.values())
    arr.sort((a, b) => a.path.localeCompare(b.path));
  return map;
}

function dirHasAnything(node: DirectoryNode, fileGroups: Map<string, FileEntry[]>): boolean {
  return node.children.length > 0 || (fileGroups.get(node.path)?.length ?? 0) > 0;
}

/**
 * Collect every directory path that has something inside it (subdirs or
 * direct files). Leaf-only file rows are not in this set — only directories
 * with expand/collapse state.
 */
function collectExpandablePaths(node: DirectoryNode, fileGroups: Map<string, FileEntry[]>, out: Set<string>): void {
  if (!dirHasAnything(node, fileGroups))
    return;
  out.add(node.path);
  for (const c of node.children)
    collectExpandablePaths(c, fileGroups, out);
}

/**
 * Default expansion: root + every depth-1 directory that contains anything +
 * any unbroken single-child subdir chain descending from an already-expanded
 * node. The chain stops at the first branching node — that node remains
 * visible (its parent is expanded) but its own children stay collapsed, so
 * siblings the user didn't ask for don't leak.
 */
function buildDefaultExpansion(root: DirectoryNode, fileGroups: Map<string, FileEntry[]>): Set<string> {
  const expanded = new Set<string>();
  expanded.add(root.path);

  for (const top of root.children) {
    if (!dirHasAnything(top, fileGroups))
      continue;
    expanded.add(top.path);
    // Continue the chain only while the next step itself is single-child;
    // expanding a branching node would leak its siblings into view.
    let cur = top;
    while (cur.children.length === 1 && cur.children[0]!.children.length === 1) {
      cur = cur.children[0]!;
      expanded.add(cur.path);
    }
  }
  return expanded;
}

interface RowProps {
  node: DirectoryNode;
  depth: number;
  expanded: Set<string>;
  fileGroups: Map<string, FileEntry[]>;
  iconTheme: IconThemePayload;
  onToggle: (path: string) => void;
}

function TreeRow({ node, depth, expanded, fileGroups, iconTheme, onToggle }: RowProps) {
  const childFiles = fileGroups.get(node.path) ?? [];
  const hasChildren = node.children.length > 0 || childFiles.length > 0;
  const isOpen = hasChildren && expanded.has(node.path);
  const indent = depth * 16;
  const themedIcon = folderIconUri(iconTheme, node.path, isOpen);

  return (
    <>
      <tr className="border-b border-border/50 hover:bg-muted/40">
        <td className="px-2 py-1">
          <button
            type="button"
            className="flex w-full items-center gap-1 text-left"
            style={{ paddingLeft: indent }}
            onClick={() => hasChildren && onToggle(node.path)}
            aria-expanded={hasChildren ? isOpen : undefined}
          >
            {hasChildren
              ? isOpen
                ? <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
                : <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
              : <span className="inline-block w-3 shrink-0" />}
            {themedIcon
              ? <img src={themedIcon} alt="" className="size-3.5 shrink-0" />
              : isOpen
                ? <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
                : <Folder className="size-3.5 shrink-0 text-muted-foreground" />}
            <span className="truncate font-mono text-xs">{node.name || '/'}</span>
          </button>
        </td>
        <td className="px-2 py-1 text-right text-xs tabular-nums">{fmt(node.files)}</td>
        <td className="px-2 py-1 text-right text-xs tabular-nums">{fmt(node.source.code)}</td>
        <td className="px-2 py-1 text-right text-xs tabular-nums text-pink-400">{fmt(node.test.code)}</td>
        <td className="px-2 py-1 text-right text-xs tabular-nums">{fmt(node.total.comment)}</td>
        <td className="px-2 py-1 text-right text-xs tabular-nums font-medium">{fmt(node.total.total)}</td>
      </tr>
      {isOpen && (
        <>
          {node.children.map(child => (
            <TreeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              fileGroups={fileGroups}
              iconTheme={iconTheme}
              onToggle={onToggle}
            />
          ))}
          {childFiles.map(file => (
            <FileLeafRow key={file.path} file={file} depth={depth + 1} iconTheme={iconTheme} />
          ))}
        </>
      )}
    </>
  );
}

function FileLeafRow({ file, depth, iconTheme }: { file: FileEntry; depth: number; iconTheme: IconThemePayload }) {
  const indent = depth * 16;
  const themedIcon = fileIconUri(iconTheme, file.path);
  return (
    <tr className="border-b border-border/50 hover:bg-muted/40">
      <td className="px-2 py-1">
        <div
          className="flex w-full items-center gap-1"
          style={{ paddingLeft: indent }}
        >
          <span className="inline-block w-3 shrink-0" />
          {themedIcon
            ? <img src={themedIcon} alt="" className="size-3.5 shrink-0" />
            : <File className="size-3.5 shrink-0 text-muted-foreground" />}
          <span className="truncate font-mono text-xs">{basenameOf(file.path)}</span>
        </div>
      </td>
      <td className="px-2 py-1 text-right text-xs tabular-nums">1</td>
      <td className="px-2 py-1 text-right text-xs tabular-nums">{fmt(file.isTest ? 0 : file.count.code)}</td>
      <td className="px-2 py-1 text-right text-xs tabular-nums text-pink-400">{fmt(file.isTest ? file.count.code : 0)}</td>
      <td className="px-2 py-1 text-right text-xs tabular-nums">{fmt(file.count.comment)}</td>
      <td className="px-2 py-1 text-right text-xs tabular-nums font-medium">{fmt(file.count.total)}</td>
    </tr>
  );
}

export function DirectoryTree({ report, iconTheme = EMPTY_ICON_THEME }: Props) {
  const root = report.directoryTree;
  const fileGroups = useMemo(() => groupFilesByDir(report.files), [report.files]);
  const defaultExpanded = useMemo(() => buildDefaultExpansion(root, fileGroups), [root, fileGroups]);

  // React's "adjusting state to a prop change" pattern: reset expansion when
  // the underlying tree identity changes (new scan completed).
  const [prevRoot, setPrevRoot] = useState(root);
  const [expanded, setExpanded] = useState<Set<string>>(defaultExpanded);
  if (prevRoot !== root) {
    setPrevRoot(root);
    setExpanded(defaultExpanded);
  }

  const onToggle = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path))
        next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const all = new Set<string>();
    collectExpandablePaths(root, fileGroups, all);
    setExpanded(all);
  }, [root, fileGroups]);

  const collapseAll = useCallback(() => {
    // Keep root expanded so the tree never goes blank.
    setExpanded(new Set([root.path]));
  }, [root]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-1">
        <Button variant="outline" size="sm" onClick={expandAll}>
          <ChevronsUpDown className="mr-1 size-3.5" />
          Expand all
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>
          <ChevronsDownUp className="mr-1 size-3.5" />
          Collapse all
        </Button>
      </div>
      <div className="overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 text-left text-xs font-medium">Path</th>
              <th className="px-2 py-1.5 text-right text-xs font-medium">Files</th>
              <th className="px-2 py-1.5 text-right text-xs font-medium">Source</th>
              <th className="px-2 py-1.5 text-right text-xs font-medium">Test</th>
              <th className="px-2 py-1.5 text-right text-xs font-medium">Comment</th>
              <th className="px-2 py-1.5 text-right text-xs font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            <TreeRow node={root} depth={0} expanded={expanded} fileGroups={fileGroups} iconTheme={iconTheme} onToggle={onToggle} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
