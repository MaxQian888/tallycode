import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'tallycode.fileTable.presets';

export interface FilterPreset {
  name: string;
  langs: string[];
  testFilter: 'all' | 'source' | 'test';
  query: string;
}

function safeLoad(): FilterPreset[] {
  try {
    if (typeof localStorage === 'undefined')
      return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw)
      return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed))
      return [];
    return parsed.filter(isValidPreset);
  }
  catch {
    return [];
  }
}

function isValidPreset(p: unknown): p is FilterPreset {
  if (!p || typeof p !== 'object')
    return false;
  const o = p as Record<string, unknown>;
  return typeof o.name === 'string'
    && Array.isArray(o.langs)
    && (o.testFilter === 'all' || o.testFilter === 'source' || o.testFilter === 'test')
    && typeof o.query === 'string';
}

function safeSave(value: FilterPreset[]): void {
  try {
    if (typeof localStorage === 'undefined')
      return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }
  catch {
    // Quota or disabled — silently ignore; presets are best-effort.
  }
}

/**
 * Persist FileTable filter presets in localStorage. Best-effort: returns an
 * empty list and silently ignores writes when storage is unavailable.
 */
export function useFilterPresets() {
  const [presets, setPresets] = useState<FilterPreset[]>(() => safeLoad());

  useEffect(() => {
    safeSave(presets);
  }, [presets]);

  const save = useCallback((preset: FilterPreset): void => {
    setPresets(prev => [...prev.filter(p => p.name !== preset.name), preset]);
  }, []);

  const remove = useCallback((name: string): void => {
    setPresets(prev => prev.filter(p => p.name !== name));
  }, []);

  const load = useCallback((name: string): FilterPreset | undefined => {
    return presets.find(p => p.name === name);
  }, [presets]);

  return { presets, save, remove, load };
}
