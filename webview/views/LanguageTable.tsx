import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import type { Report } from '@shared/report';

interface Props {
  report: Report;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

export function LanguageTable({ report }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Language</TableHead>
          <TableHead className="text-right">Files</TableHead>
          <TableHead className="text-right">Source code</TableHead>
          <TableHead className="text-right">Test code</TableHead>
          <TableHead className="text-right">Comments</TableHead>
          <TableHead className="text-right">Blank</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {report.languages.map(lang => (
          <TableRow key={lang.language}>
            <TableCell className="font-mono">
              <span className="mr-2">{lang.language}</span>
              {lang.testFiles > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {lang.testFiles}
                  {' '}
                  test
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums">{fmt(lang.files)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmt(lang.source.code)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmt(lang.test.code)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmt(lang.total.comment)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmt(lang.total.blank)}</TableCell>
            <TableCell className="text-right font-medium tabular-nums">{fmt(lang.total.total)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
