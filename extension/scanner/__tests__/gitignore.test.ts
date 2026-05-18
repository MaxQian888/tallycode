import { describe, expect, it } from 'vitest';

import { GitignoreSet } from '../gitignore';

describe('gitignoreSet', () => {
  it('ignores root-level pattern', () => {
    const g = new GitignoreSet();
    g.add('', 'node_modules\n');
    expect(g.isIgnored('node_modules/foo.js')).toBe(true);
    expect(g.isIgnored('src/index.ts')).toBe(false);
  });

  it('ignores via wildcard pattern', () => {
    const g = new GitignoreSet();
    g.add('', '*.log\n');
    expect(g.isIgnored('debug.log')).toBe(true);
    expect(g.isIgnored('a/b/debug.log')).toBe(true);
    expect(g.isIgnored('debug.txt')).toBe(false);
  });

  it('respects negation in deeper file', () => {
    const g = new GitignoreSet();
    g.add('', '*.log\n');
    g.add('logs', '!keep.log\n');
    expect(g.isIgnored('logs/keep.log')).toBe(false);
    expect(g.isIgnored('logs/drop.log')).toBe(true);
  });

  it('respects nested gitignore scope', () => {
    const g = new GitignoreSet();
    g.add('packages/a', 'dist\n');
    expect(g.isIgnored('packages/a/dist/foo.js')).toBe(true);
    expect(g.isIgnored('packages/b/dist/foo.js')).toBe(false);
  });

  it('handles directory-only pattern', () => {
    const g = new GitignoreSet();
    g.add('', 'build/\n');
    expect(g.isIgnored('build/x')).toBe(true);
    expect(g.isIgnored('build')).toBe(false);
    expect(g.isIgnored('packages/build/x')).toBe(true);
  });

  it('filter keeps non-ignored entries', () => {
    const g = new GitignoreSet();
    g.add('', 'node_modules\n');
    expect(g.filter(['node_modules/a', 'src/b', 'node_modules/b/c'])).toEqual(['src/b']);
  });
});
