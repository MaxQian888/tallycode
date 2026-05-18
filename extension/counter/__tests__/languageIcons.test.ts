import { describe, expect, it } from 'vitest';

import { codiconFor, iconFor } from '../languageIcons';

describe('iconFor', () => {
  it('returns a codicon name for known languages', () => {
    expect(iconFor('typescript')).toBe('symbol-method');
    expect(iconFor('python')).toBe('symbol-snake');
    expect(iconFor('rust')).toBe('symbol-struct');
    expect(iconFor('go')).toBe('symbol-method');
    expect(iconFor('mojo')).toBe('flame');
  });

  it('falls back to symbol-misc for unknown ids', () => {
    expect(iconFor('made-up-lang')).toBe('symbol-misc');
    expect(iconFor('')).toBe('symbol-misc');
    expect(iconFor(undefined)).toBe('symbol-misc');
    expect(iconFor(null)).toBe('symbol-misc');
  });
});

describe('codiconFor', () => {
  it('wraps the icon in $(...) syntax', () => {
    expect(codiconFor('typescript')).toBe('$(symbol-method)');
    expect(codiconFor('unknown')).toBe('$(symbol-misc)');
  });
});
