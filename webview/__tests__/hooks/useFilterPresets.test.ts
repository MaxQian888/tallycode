import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useFilterPresets } from '@/hooks/useFilterPresets';

const STORAGE_KEY = 'tallycode.fileTable.presets';

describe('useFilterPresets', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('starts empty when storage is empty', () => {
    const { result } = renderHook(() => useFilterPresets());
    expect(result.current.presets).toEqual([]);
  });

  it('saves and loads a preset round-trip', () => {
    const { result } = renderHook(() => useFilterPresets());
    act(() => {
      result.current.save({
        name: 'my preset',
        langs: ['typescript', 'python'],
        testFilter: 'source',
        query: 'src/',
      });
    });
    expect(result.current.presets).toHaveLength(1);
    expect(result.current.presets[0]!.name).toBe('my preset');
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toContain('my preset');
  });

  it('replaces preset with same name (no duplicates)', () => {
    const { result } = renderHook(() => useFilterPresets());
    act(() => {
      result.current.save({ name: 'p1', langs: ['ts'], testFilter: 'all', query: '' });
    });
    act(() => {
      result.current.save({ name: 'p1', langs: ['py'], testFilter: 'test', query: 'x' });
    });
    expect(result.current.presets).toHaveLength(1);
    expect(result.current.presets[0]!.langs).toEqual(['py']);
  });

  it('removes a preset by name', () => {
    const { result } = renderHook(() => useFilterPresets());
    act(() => {
      result.current.save({ name: 'a', langs: [], testFilter: 'all', query: '' });
      result.current.save({ name: 'b', langs: [], testFilter: 'all', query: '' });
    });
    act(() => {
      result.current.remove('a');
    });
    expect(result.current.presets.map(p => p.name)).toEqual(['b']);
  });

  it('survives corrupt localStorage JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const { result } = renderHook(() => useFilterPresets());
    expect(result.current.presets).toEqual([]);
  });

  it('discards entries with invalid shape', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { name: 'good', langs: [], testFilter: 'all', query: '' },
      { name: 123, langs: 'oops' },
    ]));
    const { result } = renderHook(() => useFilterPresets());
    expect(result.current.presets).toHaveLength(1);
    expect(result.current.presets[0]!.name).toBe('good');
  });
});
