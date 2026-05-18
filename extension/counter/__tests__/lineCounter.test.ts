import { describe, expect, it } from 'vitest';

import { BUILTIN_LANGUAGES } from '../languageDefs';
import { countLines } from '../lineCounter';

import type { LanguageRule } from '@shared/report';

function ruleFor(id: string): LanguageRule {
  const rule = BUILTIN_LANGUAGES.find(r => r.id === id);
  if (!rule)
    throw new Error(`missing built-in: ${id}`);
  return rule;
}

describe('countLines', () => {
  it('returns zero counts for empty source', () => {
    expect(countLines('', ruleFor('typescript'))).toEqual({
      code: 0,
      comment: 0,
      blank: 0,
      total: 0,
    });
  });

  it('counts blank lines correctly', () => {
    const src = '\n\n\n';
    expect(countLines(src, ruleFor('typescript'))).toEqual({
      code: 0,
      comment: 0,
      blank: 3,
      total: 3,
    });
  });

  it('classifies a simple TS sample', () => {
    const src = [
      '// hello', // comment
      'const a = 1;', // code
      '', // blank
      '/* block', // comment (block opens)
      ' * still in block */', // comment (block closes mid-line)
      'function f() { return 2; }', // code
    ].join('\n');
    expect(countLines(src, ruleFor('typescript'))).toEqual({
      code: 2,
      comment: 3,
      blank: 1,
      total: 6,
    });
  });

  it('treats lines with both code and trailing line-comment as code', () => {
    const src = 'const x = 1; // assignment\n';
    expect(countLines(src, ruleFor('typescript'))).toEqual({
      code: 1,
      comment: 0,
      blank: 0,
      total: 1,
    });
  });

  it('handles mid-line block comment that contains code after it', () => {
    const src = '/* lead */ const x = 1;\n';
    expect(countLines(src, ruleFor('typescript'))).toEqual({
      code: 1,
      comment: 0,
      blank: 0,
      total: 1,
    });
  });

  it('handles Python docstrings as comments via blockStringAsComment', () => {
    const src = [
      'def f():',
      '    """',
      '    A docstring',
      '    """',
      '    return 1',
    ].join('\n');
    const result = countLines(src, ruleFor('python'));
    expect(result.code).toBe(2); // def f, return 1
    expect(result.comment).toBe(3); // 3 docstring lines
    expect(result.total).toBe(5);
  });

  it('handles nested block comments in Rust', () => {
    const src = [
      '/* outer',
      '   /* inner */',
      '   still outer',
      '*/',
      'fn main() {}',
    ].join('\n');
    const result = countLines(src, ruleFor('rust'));
    expect(result.comment).toBe(4);
    expect(result.code).toBe(1);
    expect(result.total).toBe(5);
  });

  it('handles nested block comments in Haskell', () => {
    const src = [
      '{- outer {- inner -} still outer -}',
      'main = return ()',
    ].join('\n');
    const result = countLines(src, ruleFor('haskell'));
    expect(result.comment).toBe(1);
    expect(result.code).toBe(1);
    expect(result.total).toBe(2);
  });

  it('supports CRLF line endings', () => {
    const src = 'a\r\n// b\r\n\r\n';
    expect(countLines(src, ruleFor('typescript'))).toEqual({
      code: 1,
      comment: 1,
      blank: 1,
      total: 3,
    });
  });

  it('handles file without trailing newline', () => {
    const src = 'const x = 1;';
    expect(countLines(src, ruleFor('typescript'))).toEqual({
      code: 1,
      comment: 0,
      blank: 0,
      total: 1,
    });
  });

  it('counts JSON without comments', () => {
    const src = [
      '{',
      '  "name": "x"',
      '}',
    ].join('\n');
    const result = countLines(src, ruleFor('json'));
    expect(result.code).toBe(3);
    expect(result.comment).toBe(0);
  });

  it('jSONC supports both line and block comments', () => {
    const src = [
      '{',
      '  // a',
      '  /* b */',
      '  "k": 1',
      '}',
    ].join('\n');
    const result = countLines(src, ruleFor('jsonc'));
    expect(result.code).toBe(3);
    expect(result.comment).toBe(2);
    expect(result.total).toBe(5);
  });

  it('lua block comments use --[[ ]]', () => {
    const src = [
      '--[[ block',
      '   more',
      ']]',
      'print(1)',
    ].join('\n');
    const result = countLines(src, ruleFor('lua'));
    expect(result.comment).toBe(3);
    expect(result.code).toBe(1);
  });

  it('sQL with line + block comments', () => {
    const src = [
      '-- top',
      'SELECT 1 /* inline */;',
      '/*',
      ' multi',
      '*/',
    ].join('\n');
    const result = countLines(src, ruleFor('sql'));
    expect(result.comment).toBe(4);
    expect(result.code).toBe(1);
  });

  it('honors count:false (e.g. CSV)', () => {
    const src = 'a,b\n1,2\n';
    expect(countLines(src, ruleFor('csv'))).toEqual({
      code: 0,
      comment: 0,
      blank: 0,
      total: 0,
    });
  });

  it('powerShell <# #> block comments', () => {
    const src = [
      '<#',
      '  doc',
      '#>',
      'Write-Host hi',
    ].join('\n');
    const result = countLines(src, ruleFor('powershell'));
    expect(result.comment).toBe(3);
    expect(result.code).toBe(1);
  });

  it('ruby =begin/=end block', () => {
    const src = [
      '=begin',
      'comment',
      '=end',
      'puts 1',
    ].join('\n');
    const result = countLines(src, ruleFor('ruby'));
    expect(result.comment).toBe(3);
    expect(result.code).toBe(1);
  });

  it('solidity supports NatSpec /// and block /** */', () => {
    const src = [
      '/// @notice transfers tokens',
      '/** doc',
      ' * block',
      ' */',
      'contract Foo {}',
    ].join('\n');
    const result = countLines(src, ruleFor('solidity'));
    expect(result.comment).toBe(4);
    expect(result.code).toBe(1);
    expect(result.total).toBe(5);
  });

  it('zig counts // line comments only', () => {
    const src = [
      '// header',
      'const std = @import("std");',
      '',
      'pub fn main() void {}',
    ].join('\n');
    const result = countLines(src, ruleFor('zig'));
    expect(result.comment).toBe(1);
    expect(result.code).toBe(2);
    expect(result.blank).toBe(1);
  });

  it('nim handles nested #[ #[ ]# ]# block comments', () => {
    const src = [
      '#[ outer',
      '   #[ inner ]#',
      '   still outer',
      ']#',
      'echo "hi"',
    ].join('\n');
    const result = countLines(src, ruleFor('nim'));
    expect(result.comment).toBe(4);
    expect(result.code).toBe(1);
  });

  it('mojo treats """ docstrings as comments', () => {
    const src = [
      'fn main():',
      '    """',
      '    A docstring',
      '    """',
      '    print("hi")',
    ].join('\n');
    const result = countLines(src, ruleFor('mojo'));
    expect(result.code).toBe(2);
    expect(result.comment).toBe(3);
  });

  it('carbon // and /* */ comments', () => {
    const src = [
      '// hello',
      '/* block */',
      'fn Main() {}',
    ].join('\n');
    const result = countLines(src, ruleFor('carbon'));
    expect(result.comment).toBe(2);
    expect(result.code).toBe(1);
  });

  it('move supports nested block comments', () => {
    const src = [
      '/* outer /* inner */ still outer */',
      'module foo {}',
    ].join('\n');
    const result = countLines(src, ruleFor('move'));
    expect(result.comment).toBe(1);
    expect(result.code).toBe(1);
  });

  it('v line + block comments via .vsh', () => {
    const src = [
      '// hello',
      '/* block */',
      'fn main() {}',
    ].join('\n');
    const result = countLines(src, ruleFor('vlang'));
    expect(result.comment).toBe(2);
    expect(result.code).toBe(1);
  });

  it('gleam // comments only', () => {
    const src = [
      '// a comment',
      'pub fn main() { Nil }',
    ].join('\n');
    const result = countLines(src, ruleFor('gleam'));
    expect(result.comment).toBe(1);
    expect(result.code).toBe(1);
  });

  it('roc # comments only', () => {
    const src = [
      '# a comment',
      'main = "hi"',
    ].join('\n');
    const result = countLines(src, ruleFor('roc'));
    expect(result.comment).toBe(1);
    expect(result.code).toBe(1);
  });

  it('odin supports nested block comments', () => {
    const src = [
      '/* outer',
      '   /* inner */',
      '   still outer */',
      'main :: proc() {}',
    ].join('\n');
    const result = countLines(src, ruleFor('odin'));
    expect(result.comment).toBe(3);
    expect(result.code).toBe(1);
  });
});
