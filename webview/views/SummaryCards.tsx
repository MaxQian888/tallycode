import { FileText, FlaskConical, Languages, Sigma } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@/components/ui/card';
import { formatNumber } from '@/i18n/format';

import type { Report } from '@shared/report';

interface Props {
  report: Report;
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="truncate text-xl font-semibold">{value}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export function SummaryCards({ report }: Props) {
  const { t } = useTranslation();
  const { summary } = report;
  const testPct = summary.totalFiles > 0
    ? ((summary.testFiles / summary.totalFiles) * 100).toFixed(1)
    : '0';
  const codeShare = summary.total.total > 0
    ? ((summary.total.code / summary.total.total) * 100).toFixed(1)
    : '0';

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi
        icon={FileText}
        label={t('summary.totalFiles')}
        value={formatNumber(summary.totalFiles)}
        sub={t('summary.totalFilesSub', {
          source: formatNumber(summary.sourceFiles),
          test: formatNumber(summary.testFiles),
        })}
      />
      <Kpi
        icon={Sigma}
        label={t('summary.totalLines')}
        value={formatNumber(summary.total.total)}
        sub={t('summary.totalLinesSub', {
          code: formatNumber(summary.total.code),
          percent: codeShare,
        })}
      />
      <Kpi
        icon={FlaskConical}
        label={t('summary.testShare')}
        value={`${testPct}%`}
        sub={t('summary.testShareSub', { lines: formatNumber(summary.test.code) })}
      />
      <Kpi
        icon={Languages}
        label={t('summary.languages')}
        value={formatNumber(summary.languageCount)}
        sub={t('summary.languagesSub', { ms: report.durationMs })}
      />
    </div>
  );
}
