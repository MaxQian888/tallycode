import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber } from '@/i18n/format';

import type { Report } from '@shared/report';

interface Props {
  report: Report;
}

export function LanguageTable({ report }: Props) {
  const { t } = useTranslation();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('languageTable.language')}</TableHead>
          <TableHead className="text-right">{t('languageTable.files')}</TableHead>
          <TableHead className="text-right">{t('languageTable.sourceCode')}</TableHead>
          <TableHead className="text-right">{t('languageTable.testCode')}</TableHead>
          <TableHead className="text-right">{t('languageTable.comments')}</TableHead>
          <TableHead className="text-right">{t('languageTable.blank')}</TableHead>
          <TableHead className="text-right">{t('languageTable.total')}</TableHead>
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
                  {t('languageTable.testBadge')}
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(lang.files)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(lang.source.code)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(lang.test.code)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(lang.total.comment)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(lang.total.blank)}</TableCell>
            <TableCell className="text-right font-medium tabular-nums">{formatNumber(lang.total.total)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
