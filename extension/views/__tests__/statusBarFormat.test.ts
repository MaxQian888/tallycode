import { describe, expect, it } from 'vitest';

import { computeStatusBar } from '../statusBarFormat';

import type { ComputeInput } from '../statusBarFormat';
import type { LanguageRule } from '@shared/report';

const TS_RULE: LanguageRule = {
  id: 'typescript',
  name: 'TypeScript',
  extensions: ['.ts'],
  lineComments: ['//'],
};

const PY_RULE: LanguageRule = {
  id: 'python',
  name: 'Python',
  extensions: ['.py'],
  lineComments: ['#'],
};

function base(overrides: Partial<ComputeInput> = {}): ComputeInput {
  return {
    fileRule: TS_RULE,
    fileCount: { code: 100, comment: 20, blank: 10, total: 130 },
    scanning: false,
    staleCount: 0,
    errorMessage: null,
    format: 'loc',
    showLanguageIcon: true,
    ...overrides,
  };
}

describe('computeStatusBar', () => {
  it('idle state shows language icon + loc count', () => {
    const result = computeStatusBar(base());
    expect(result.hidden).toBe(false);
    if (result.hidden)
      return;
    expect(result.text).toContain('100 loc');
    expect(result.text).toContain('symbol-method');
    expect(result.background).toBe('none');
  });

  it('respects showLanguageIcon=false', () => {
    const result = computeStatusBar(base({ showLanguageIcon: false }));
    if (result.hidden)
      throw new Error('expected visible');
    expect(result.text).toContain('list-ordered');
    expect(result.text).not.toContain('symbol-method');
  });

  it('format=code+comment shows both numbers', () => {
    const result = computeStatusBar(base({ format: 'code+comment' }));
    if (result.hidden)
      throw new Error('expected visible');
    expect(result.text).toContain('100 code');
    expect(result.text).toContain('20 cmt');
  });

  it('format=percent rounds and shows percents', () => {
    const result = computeStatusBar(base({ format: 'percent' }));
    if (result.hidden)
      throw new Error('expected visible');
    // 100/130 ≈ 77%, 20/130 ≈ 15%
    expect(result.text).toContain('77%');
    expect(result.text).toContain('15%');
  });

  it('format=percent handles zero total without dividing by zero', () => {
    const result = computeStatusBar(base({
      fileCount: { code: 0, comment: 0, blank: 0, total: 0 },
      format: 'percent',
    }));
    if (result.hidden)
      throw new Error('expected visible');
    expect(result.text).toContain('0%');
  });

  it('scanning state overrides per-file display', () => {
    const result = computeStatusBar(base({ scanning: true }));
    if (result.hidden)
      throw new Error('expected visible');
    expect(result.text).toContain('loading');
    expect(result.text).toContain('Counting');
  });

  it('error state has error background and message', () => {
    const result = computeStatusBar(base({ errorMessage: 'boom' }));
    if (result.hidden)
      throw new Error('expected visible');
    expect(result.text).toContain('Tally error');
    expect(result.background).toBe('error');
    expect(result.tooltipLines.join(' ')).toContain('boom');
  });

  it('stale changes give warning background and a warning icon', () => {
    const result = computeStatusBar(base({ staleCount: 3 }));
    if (result.hidden)
      throw new Error('expected visible');
    expect(result.background).toBe('warning');
    expect(result.text).toContain('warning');
    expect(result.tooltipLines.join(' ')).toContain('3');
  });

  it('hidden when no rule and no stale changes', () => {
    const result = computeStatusBar(base({ fileRule: null, fileCount: null }));
    expect(result.hidden).toBe(true);
  });

  it('shows stale even when no active file', () => {
    const result = computeStatusBar(base({
      fileRule: null,
      fileCount: null,
      staleCount: 5,
    }));
    if (result.hidden)
      throw new Error('expected visible');
    expect(result.text).toContain('5 stale');
    expect(result.background).toBe('warning');
  });

  it('language name appears in tooltip', () => {
    const result = computeStatusBar(base({ fileRule: PY_RULE }));
    if (result.hidden)
      throw new Error('expected visible');
    expect(result.tooltipLines.join('\n')).toContain('Python');
  });

  it('error state takes precedence over scanning', () => {
    const result = computeStatusBar(base({ scanning: true, errorMessage: 'oops' }));
    if (result.hidden)
      throw new Error('expected visible');
    expect(result.text).toContain('Tally error');
    expect(result.background).toBe('error');
  });
});
