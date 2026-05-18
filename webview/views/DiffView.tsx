import { Minus, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import type { DiffReport } from '@shared/report';

interface Props {
  diff: DiffReport;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function delta(n: number): string {
  if (n > 0)
    return `+${fmt(n)}`;
  if (n < 0)
    return fmt(n);
  return '0';
}

function deltaClass(n: number): string {
  if (n > 0)
    return 'text-emerald-400';
  if (n < 0)
    return 'text-rose-400';
  return 'text-muted-foreground';
}

export function DiffView({ diff }: Props) {
  const { summary } = diff;
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Summary delta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DeltaTile label="Code lines" before={summary.before.code} after={summary.after.code} d={summary.delta.code} />
            <DeltaTile label="Comments" before={summary.before.comment} after={summary.after.comment} d={summary.delta.comment} />
            <DeltaTile label="Blank lines" before={summary.before.blank} after={summary.after.blank} d={summary.delta.blank} />
            <DeltaTile label="Total lines" before={summary.before.total} after={summary.after.total} d={summary.delta.total} />
          </div>
          <div className="mt-3 flex gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="gap-1">
              <Plus className="size-3" />
              {summary.filesAdded}
              {' '}
              added
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Minus className="size-3" />
              {summary.filesRemoved}
              {' '}
              removed
            </Badge>
            <Badge variant="outline">
              {summary.filesChanged}
              {' '}
              changed
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Files</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Path</TableHead>
                <TableHead>Lang</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Before</TableHead>
                <TableHead className="text-right">After</TableHead>
                <TableHead className="text-right">Δ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {diff.files
                .filter(f => f.status !== 'unchanged')
                .slice(0, 200)
                .map((f) => {
                  const before = f.before?.code ?? 0;
                  const after = f.after?.code ?? 0;
                  const d = after - before;
                  return (
                    <TableRow key={f.path}>
                      <TableCell className="font-mono text-xs">{f.path}</TableCell>
                      <TableCell className="text-xs">{f.language}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px]">{f.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{f.before ? fmt(before) : '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{f.after ? fmt(after) : '—'}</TableCell>
                      <TableCell className={`text-right tabular-nums ${deltaClass(d)}`}>{delta(d)}</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function DeltaTile({ label, before, after, d }: { label: string; before: number; after: number; d: number }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{fmt(after)}</div>
      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span>
          was
          {' '}
          {fmt(before)}
        </span>
        <span className={deltaClass(d)}>{delta(d)}</span>
      </div>
    </div>
  );
}
