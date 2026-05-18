import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { Report } from '@shared/report';

interface Props {
  report: Report;
}

const PALETTE = [
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#f87171',
  '#a78bfa',
  '#f472b6',
  '#22d3ee',
  '#fb7185',
  '#84cc16',
  '#facc15',
  '#c084fc',
  '#fb923c',
  '#2dd4bf',
  '#e879f9',
  '#94a3b8',
];

function colorFor(idx: number): string {
  return PALETTE[idx % PALETTE.length]!;
}

export function LanguageBreakdown({ report }: Props) {
  const top = useMemo(() => report.languages.slice(0, 12), [report.languages]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const pieData = useMemo(() => {
    return top
      .map((l, i) => ({
        name: l.language,
        value: l.total.code,
        fill: colorFor(i),
      }))
      .filter(d => !hidden.has(d.name));
  }, [top, hidden]);

  const barData = useMemo(() => {
    return top
      .filter(l => !hidden.has(l.language))
      .map(l => ({
        name: l.language,
        Source: l.source.code,
        Test: l.test.code,
      }));
  }, [top, hidden]);

  const toggle = (name: string): void => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(name))
        next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleLegendClick = (entry: { value?: string | number }): void => {
    if (typeof entry.value === 'string')
      toggle(entry.value);
  };

  const renderLegendText = (value: string): React.ReactNode => {
    return (
      <span style={{ opacity: hidden.has(value) ? 0.4 : 1, cursor: 'pointer' }}>{value}</span>
    );
  };

  const allHidden = pieData.length === 0;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Code lines by language</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {allHidden
            ? (
                <EmptyChartHint onReset={() => setHidden(new Set())} />
              )
            : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={50}
                      paddingAngle={1}
                      isAnimationActive={false}
                    >
                      {pieData.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={value => Number(value).toLocaleString('en-US')}
                      contentStyle={{
                        background: 'var(--popover)',
                        border: '1px solid var(--border)',
                        color: 'var(--popover-foreground)',
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      wrapperStyle={{ fontSize: 11 }}
                      onClick={handleLegendClick}
                      formatter={renderLegendText}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Source vs Test per language</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {barData.length === 0
            ? (
                <EmptyChartHint onReset={() => setHidden(new Set())} />
              )
            : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 28 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      angle={-30}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={value => Number(value).toLocaleString('en-US')}
                      contentStyle={{
                        background: 'var(--popover)',
                        border: '1px solid var(--border)',
                        color: 'var(--popover-foreground)',
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11 }}
                      onClick={handleLegendClick}
                      formatter={renderLegendText}
                    />
                    <Bar dataKey="Source" stackId="a" fill="#60a5fa" />
                    <Bar dataKey="Test" stackId="a" fill="#f472b6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyChartHint({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
      <span>All languages hidden</span>
      <button
        type="button"
        onClick={onReset}
        className="text-xs underline decoration-dotted underline-offset-2 hover:text-foreground"
      >
        Reset
      </button>
    </div>
  );
}
