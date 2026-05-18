import { describe, expect, it } from 'vitest';

import { BUILTIN_LANGUAGES } from '../languageDefs';
import {
  LanguageRegistry,
  matchAssociation,
  mergeLanguageRules,
  posixBasename,
  posixExtname,
} from '../languageRegistry';

import type { LanguageRule } from '@shared/report';

describe('posixBasename / posixExtname', () => {
  it('extracts basename from posix path', () => {
    expect(posixBasename('foo/bar/baz.ts')).toBe('baz.ts');
  });

  it('extracts basename from windows path', () => {
    expect(posixBasename('C:\\foo\\bar\\baz.ts')).toBe('baz.ts');
  });

  it('returns the string itself when no separators', () => {
    expect(posixBasename('baz.ts')).toBe('baz.ts');
  });

  it('returns .ts for typical TS file', () => {
    expect(posixExtname('App.tsx')).toBe('.tsx');
  });

  it('returns empty for dotfile without extension', () => {
    expect(posixExtname('.bashrc')).toBe('');
  });

  it('returns empty when last char is dot', () => {
    expect(posixExtname('foo.')).toBe('');
  });
});

describe('matchAssociation', () => {
  it('matches exact filename', () => {
    expect(matchAssociation('Dockerfile', 'Dockerfile', '')).toBe(true);
  });

  it('matches *.ext pattern', () => {
    expect(matchAssociation('*.svelte', 'App.svelte', '.svelte')).toBe(true);
  });

  it('rejects unrelated extension', () => {
    expect(matchAssociation('*.svelte', 'App.tsx', '.tsx')).toBe(false);
  });
});

describe('languageRegistry.resolve', () => {
  const registry = new LanguageRegistry();

  it('resolves typescript by extension', () => {
    expect(registry.resolve('src/App.ts')?.id).toBe('typescript');
  });

  it('resolves Dockerfile by exact filename', () => {
    expect(registry.resolve('repo/Dockerfile')?.id).toBe('dockerfile');
  });

  it('resolves Makefile in nested dirs', () => {
    expect(registry.resolve('foo/bar/Makefile')?.id).toBe('makefile');
  });

  it('returns undefined for unknown extension', () => {
    expect(registry.resolve('weird.qwerty')).toBeUndefined();
  });

  it('is case-insensitive for extensions', () => {
    expect(registry.resolve('App.TSX')?.id).toBe('typescriptreact');
  });

  it('honors files.associations override', () => {
    const r = new LanguageRegistry();
    r.setFilesAssociations({ '*.foo': 'typescript' });
    expect(r.resolve('a.foo')?.id).toBe('typescript');
  });

  it('files.associations beats default extension lookup', () => {
    const r = new LanguageRegistry();
    r.setFilesAssociations({ '*.json': 'jsonc' });
    expect(r.resolve('a.json')?.id).toBe('jsonc');
  });
});

describe('mergeLanguageRules', () => {
  it('adds new rule when id is new', () => {
    const merged = mergeLanguageRules([], { mylang: { id: 'mylang', extensions: ['.ml1'] } });
    expect(merged.find(r => r.id === 'mylang')).toBeDefined();
  });

  it('overrides existing rule fields', () => {
    const base: LanguageRule[] = [{ id: 'typescript', extensions: ['.ts'] }];
    const merged = mergeLanguageRules(base, {
      typescript: { lineComments: ['//', '@@'] },
    });
    const ts = merged.find(r => r.id === 'typescript');
    expect(ts?.lineComments).toEqual(['//', '@@']);
    expect(ts?.extensions).toEqual(['.ts']);
  });

  it('does not mutate the base array entries', () => {
    const base: LanguageRule[] = [{ id: 'typescript', extensions: ['.ts'] }];
    const baseRef = base[0];
    mergeLanguageRules(base, { typescript: { lineComments: ['@@'] } });
    expect(baseRef.lineComments).toBeUndefined();
  });
});

describe('built-in catalog sanity', () => {
  it('every rule has a non-empty id', () => {
    for (const r of BUILTIN_LANGUAGES) {
      expect(r.id).toBeTruthy();
    }
  });

  it('extensions are dot-prefixed and lowercase', () => {
    for (const r of BUILTIN_LANGUAGES) {
      for (const e of r.extensions ?? []) {
        expect(e.startsWith('.')).toBe(true);
        expect(e).toBe(e.toLowerCase());
      }
    }
  });
});
