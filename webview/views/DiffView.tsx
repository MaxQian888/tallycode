import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber } from '@/i18n/format';

import type { DiffReport } from '@shared/report';
import type { TFunction } from 'i18next';

interface Props {
  diff: DiffReport;
}

function delta(n: number): string {
  if (n > 0)
    return `+${formatNumber(n)}`;
  if (n < 0)
    return formatNumber(n);
  return '0';
}

function deltaClass(n: number): string {
  if (n > 0)
    return 'text-emerald-400';
  if (n < 0)
    return 'text-rose-400';
  return 'text-muted-foreground';
}

function statusLabel(t: TFunction, status: 'added' | 'removed' | 'changed' | 'unchanged'): string {
  switch (status) {
    case 'added': return t('diff.statusAdded');
    case 'removed': return t('diff.statusRemoved');
    case 'changed': return t('diff.statusChanged');
    default: return status;
  }
}

export function DiffView({ diff }: Props) {
  const { t } = useTranslation();
  const { summary } = diff;
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('diff.summaryDelta')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DeltaTile label={t('diff.codeLines')} before={summary.before.code} after={summary.after.code} d={summary.delta.code} />
            <DeltaTile label={t('diff.comments')} before={summary.before.comment} after={summary.after.comment} d={summary.delta.comment} />
            <DeltaTile label={t('diff.blankLines')} before={summary.before.blank} after={summary.after.blank} d={summary.delta.blank} />
            <DeltaTile label={t('diff.totalLines')} before={summary.before.total} after={summary.after.total} d={summary.delta.total} />
          </div>
          <div className="mt-3 flex gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="gap-1">
              <Plus className="size-3" />
              {t('diff.added', { count: summary.filesAdded })}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Minus className="size-3" />
              {t('diff.removed', { count: summary.filesRemoved })}
            </Badge>
            <Badge variant="outline">
              {t('diff.changed', { count: summary.filesChanged })}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('diff.files')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('diff.path')}</TableHead>
                <TableHead>{t('diff.lang')}</TableHead>
                <TableHead className="text-center">{t('diff.status')}</TableHead>
                <TableHead className="text-right">{t('diff.before')}</TableHead>
                <TableHead className="text-right">{t('diff.after')}</TableHead>
                <TableHead className="text-right">{t('diff.deltaSymbol')}</TableHead>
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
                        <Badge variant="outline" className="text-[10px]">{statusLabel(t, f.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{f.before ? formatNumber(before) : '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{f.after ? formatNumber(after) : '—'}</TableCell>
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
  const { t } = useTranslation();
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{formatNumber(after)}</div>
      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span>{t('diff.was', { value: formatNumber(before) })}</span>
        <span className={deltaClass(d)}>{delta(d)}</span>
      </div>
    </div>
  );
}
