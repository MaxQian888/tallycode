import { ChevronDown, ChevronRight, Folder } from 'lucide-react';
import { useState } from 'react';

import type { DirectoryNode, Report } from '@shared/report';

interface Props {
  report: Report;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

interface RowProps {
  node: DirectoryNode;
  depth: number;
  defaultExpanded: boolean;
}

function TreeRow({ node, depth, defaultExpanded }: RowProps) {
  const [expanded, setExpanded] = useState(depth <= 1 || defaultExpanded);
  const hasChildren = node.children.length > 0;
  const indent = depth * 16;

  return (
    <>
      <tr className="border-b border-border/50 hover:bg-muted/40">
        <td className="px-2 py-1">
          <button
            type="button"
            className="flex items-center gap-1 text-left"
            style={{ paddingLeft: indent }}
            onClick={() => hasChildren && setExpanded(v => !v)}
          >
            {hasChildren
              ? expanded
                ? <ChevronDown className="size-3 text-muted-foreground" />
                : <ChevronRight className="size-3 text-muted-foreground" />
              : <span className="inline-block w-3" />}
            <Folder className="size-3.5 text-muted-foreground" />
            <span className="font-mono text-xs">{node.name || '/'}</span>
          </button>
        </td>
        <td className="px-2 py-1 text-right text-xs tabular-nums">{fmt(node.files)}</td>
        <td className="px-2 py-1 text-right text-xs tabular-nums">{fmt(node.source.code)}</td>
        <td className="px-2 py-1 text-right text-xs tabular-nums text-pink-400">{fmt(node.test.code)}</td>
        <td className="px-2 py-1 text-right text-xs tabular-nums">{fmt(node.total.comment)}</td>
        <td className="px-2 py-1 text-right text-xs tabular-nums font-medium">{fmt(node.total.total)}</td>
      </tr>
      {expanded && node.children.map(child => (
        <TreeRow
          key={child.path}
          node={child}
          depth={depth + 1}
          defaultExpanded={defaultExpanded}
        />
      ))}
    </>
  );
}

export function DirectoryTree({ report }: Props) {
  return (
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
          <TreeRow node={report.directoryTree} depth={0} defaultExpanded={false} />
        </tbody>
      </table>
    </div>
  );
}
