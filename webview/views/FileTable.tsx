import { ArrowDown, ArrowUp, Bookmark, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFilterPresets } from '@/hooks/useFilterPresets';
import { formatNumber } from '@/i18n/format';

import { LanguageMultiFilter } from './LanguageMultiFilter';

import type { FilterPreset } from '@/hooks/useFilterPresets';
import type { FileEntry, Report } from '@shared/report';

type SortKey = 'path' | 'language' | 'code' | 'total' | 'isTest';

interface Props {
  report: Report;
}

const PAGE_SIZE = 50;

export function FileTable({ report }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [langFilters, setLangFilters] = useState<Set<string>>(new Set());
  const [testFilter, setTestFilter] = useState<'all' | 'source' | 'test'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('code');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const { presets, save, remove } = useFilterPresets();
  const [presetName, setPresetName] = useState('');

  const filtered = useMemo(() => {
    return report.files.filter((f) => {
      if (query && !f.path.toLowerCase().includes(query.toLowerCase()))
        return false;
      if (langFilters.size > 0 && !langFilters.has(f.language))
        return false;
      if (testFilter === 'source' && f.isTest)
        return false;
      if (testFilter === 'test' && !f.isTest)
        return false;
      return true;
    });
  }, [report.files, query, langFilters, testFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => cmp(a, b, sortKey) * (sortDir === 'asc' ? 1 : -1));
    return arr;
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const slice = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function toggleSort(key: SortKey): void {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    }
    else {
      setSortKey(key);
      setSortDir(key === 'path' || key === 'language' ? 'asc' : 'desc');
    }
  }

  const langs = useMemo(() => {
    return [...new Set(report.files.map(f => f.language))].sort();
  }, [report.files]);

  const applyPreset = (preset: FilterPreset): void => {
    setQuery(preset.query);
    setLangFilters(new Set(preset.langs));
    setTestFilter(preset.testFilter);
    setPage(0);
  };

  const handleSavePreset = (): void => {
    const trimmed = presetName.trim();
    if (!trimmed)
      return;
    save({
      name: trimmed,
      langs: [...langFilters],
      testFilter,
      query,
    });
    setPresetName('');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('fileTable.searchPath')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-7"
          />
        </div>
        <LanguageMultiFilter langs={langs} selected={langFilters} onChange={setLangFilters} />
        <Select value={testFilter} onValueChange={v => setTestFilter(v as typeof testFilter)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('fileTable.allFiles')}</SelectItem>
            <SelectItem value="source">{t('fileTable.sourceOnly')}</SelectItem>
            <SelectItem value="test">{t('fileTable.testOnly')}</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Bookmark className="mr-1 size-3.5" />
              {t('fileTable.presets')}
              {presets.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px]">{presets.length}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-2">
            <div className="mb-2 flex gap-1">
              <Input
                placeholder={t('fileTable.presetName')}
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                className="h-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter')
                    handleSavePreset();
                }}
              />
              <Button size="sm" onClick={handleSavePreset} disabled={!presetName.trim()}>
                {t('fileTable.save')}
              </Button>
            </div>
            <div className="max-h-56 space-y-1 overflow-auto">
              {presets.length === 0 && (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                  {t('fileTable.noPresets')}
                </p>
              )}
              {presets.map(p => (
                <div
                  key={p.name}
                  className="flex items-center gap-1 rounded px-2 py-1.5 hover:bg-accent"
                >
                  <button
                    type="button"
                    className="flex-1 truncate text-left text-xs"
                    onClick={() => applyPreset(p)}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-1 text-muted-foreground">
                      {p.langs.length === 0 ? t('fileTable.allLangs') : t('fileTable.langsCount', { count: p.langs.length })}
                      {p.testFilter !== 'all' ? ` · ${p.testFilter}` : ''}
                      {p.query ? ` · "${p.query}"` : ''}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(p.name)}
                    className="text-muted-foreground hover:text-rose-400"
                    aria-label={t('fileTable.deletePreset', { name: p.name })}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label={t('fileTable.path')} sortKey="path" active={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortableHead label={t('fileTable.lang')} sortKey="language" active={sortKey} dir={sortDir} onClick={toggleSort} />
              <TableHead className="text-center">{t('fileTable.test')}</TableHead>
              <SortableHead label={t('fileTable.code')} sortKey="code" active={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
              <TableHead className="text-right">{t('fileTable.comment')}</TableHead>
              <TableHead className="text-right">{t('fileTable.blank')}</TableHead>
              <SortableHead label={t('fileTable.total')} sortKey="total" active={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map(f => (
              <TableRow key={f.path}>
                <TableCell className="font-mono text-xs">{f.path}</TableCell>
                <TableCell className="text-xs">{f.language}</TableCell>
                <TableCell className="text-center">
                  {f.isTest && (
                    <Badge variant="secondary" className="text-[10px]">
                      {f.testReason}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(f.count.code)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(f.count.comment)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(f.count.blank)}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{formatNumber(f.count.total)}</TableCell>
              </TableRow>
            ))}
            {slice.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  {t('fileTable.noMatch')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {t('fileTable.fileCount', { count: sorted.length })}
          {' · '}
          {t('fileTable.pageOf', { page: safePage + 1, pages: pageCount })}
        </span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>{t('fileTable.prev')}</Button>
          <Button variant="outline" size="sm" disabled={safePage >= pageCount - 1} onClick={() => setPage(p => p + 1)}>{t('fileTable.next')}</Button>
        </div>
      </div>
    </div>
  );
}

function cmp(a: FileEntry, b: FileEntry, key: SortKey): number {
  switch (key) {
    case 'path': return a.path.localeCompare(b.path);
    case 'language': return a.language.localeCompare(b.language);
    case 'code': return a.count.code - b.count.code;
    case 'total': return a.count.total - b.count.total;
    case 'isTest': return Number(a.isTest) - Number(b.isTest);
  }
}

function SortableHead({
  label,
  sortKey,
  active,
  dir,
  onClick,
  align = 'left',
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: 'asc' | 'desc';
  onClick: (k: SortKey) => void;
  align?: 'left' | 'right';
}) {
  return (
    <TableHead className={align === 'right' ? 'text-right' : ''}>
      <button
        type="button"
        className={`inline-flex items-center gap-1 ${align === 'right' ? 'ml-auto' : ''}`}
        onClick={() => onClick(sortKey)}
      >
        {label}
        {active === sortKey && (
          dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
        )}
      </button>
    </TableHead>
  );
}
