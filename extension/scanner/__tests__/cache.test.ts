import { describe, expect, it } from 'vitest';

import { CountCache } from '../cache';

describe('countCache', () => {
  it('hashes rules deterministically', () => {
    const h1 = CountCache.hashRules({ a: 1, b: 2 });
    const h2 = CountCache.hashRules({ a: 1, b: 2 });
    expect(h1).toBe(h2);
  });

  it('makeKey is stable across calls', () => {
    const k1 = CountCache.makeKey({ relativePath: 'a.ts', mtime: 1, size: 10, ruleHash: 'abc' });
    const k2 = CountCache.makeKey({ relativePath: 'a.ts', mtime: 1, size: 10, ruleHash: 'abc' });
    expect(k1).toBe(k2);
  });

  it('makeKey changes with mtime', () => {
    const k1 = CountCache.makeKey({ relativePath: 'a.ts', mtime: 1, size: 10, ruleHash: 'abc' });
    const k2 = CountCache.makeKey({ relativePath: 'a.ts', mtime: 2, size: 10, ruleHash: 'abc' });
    expect(k1).not.toBe(k2);
  });

  it('stores and retrieves entries', () => {
    const c = new CountCache();
    const entry = {
      key: 'k1',
      language: 'typescript',
      count: { code: 5, comment: 2, blank: 1, total: 8 },
      isTest: false,
      testReason: 'none' as const,
    };
    c.set(entry);
    expect(c.get('k1')).toEqual(entry);
  });

  it('round-trips through JSON', () => {
    const c = new CountCache();
    c.set({
      key: 'k1',
      language: 'typescript',
      count: { code: 1, comment: 0, blank: 0, total: 1 },
      isTest: false,
      testReason: 'none',
    });
    const blob = JSON.parse(JSON.stringify(c.toJSON()));
    const c2 = CountCache.fromJSON(blob);
    expect(c2.get('k1')).toBeDefined();
    expect(c2.size()).toBe(1);
  });

  it('fromJSON tolerates garbage', () => {
    expect(CountCache.fromJSON(null).size()).toBe(0);
    expect(CountCache.fromJSON({ version: 99 }).size()).toBe(0);
    expect(CountCache.fromJSON({ version: 1, entries: 'oops' }).size()).toBe(0);
  });
});
