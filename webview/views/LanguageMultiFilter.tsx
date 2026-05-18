import { ChevronDown, XIcon } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Props {
  langs: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

export function LanguageMultiFilter({ langs, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = langs.filter(l => l.toLowerCase().includes(query.toLowerCase()));

  const toggle = (lang: string): void => {
    const next = new Set(selected);
    if (next.has(lang))
      next.delete(lang);
    else next.add(lang);
    onChange(next);
  };

  const clear = (): void => {
    onChange(new Set());
  };

  const label = selected.size === 0
    ? 'All languages'
    : selected.size === 1
      ? [...selected][0]!
      : `${selected.size} languages`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-40 justify-between">
          <span className="truncate">{label}</span>
          <ChevronDown className="ml-1 size-3.5 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <Input
          placeholder="Filter languages…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="mb-2 h-8 text-xs"
        />
        <div className="max-h-56 overflow-auto">
          {filtered.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matches</p>
          )}
          {filtered.map(lang => (
            <label
              key={lang}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
            >
              <Checkbox
                checked={selected.has(lang)}
                onCheckedChange={() => toggle(lang)}
              />
              <span className="truncate">{lang}</span>
            </label>
          ))}
        </div>
        {selected.size > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1 border-t pt-2">
            {[...selected].slice(0, 4).map(l => (
              <Badge key={l} variant="secondary" className="gap-1 text-[10px]">
                {l}
                <button
                  type="button"
                  onClick={() => toggle(l)}
                  className="hover:text-foreground"
                  aria-label={`Remove ${l}`}
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            ))}
            {selected.size > 4 && (
              <Badge variant="secondary" className="text-[10px]">
                +
                {selected.size - 4}
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={clear}>
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
