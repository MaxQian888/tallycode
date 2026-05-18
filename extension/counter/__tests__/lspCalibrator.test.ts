import { describe, expect, it } from 'vitest';

import { reconcile } from '../lspCalibrator';

import type { SemanticTokensInput, SemanticTokensLegendInput } from '../lspCalibrator';

function tokensFromLines(commentLines: number[], codeLines: number[]): SemanticTokensInput {
  // Build delta-encoded entries. Sort by line ascending.
  interface Entry { line: number; type: number }
  const entries: Entry[] = [
    ...commentLines.map(l => ({ line: l, type: 0 })),
    ...codeLines.map(l => ({ line: l, type: 1 })),
  ].sort((a, b) => a.line - b.line);
  const data: number[] = [];
  let prevLine = 0;
  for (const e of entries) {
    data.push(e.line - prevLine, 0, 1, e.type, 0);
    prevLine = e.line;
  }
  return { data: Uint32Array.from(data) };
}

const legend: SemanticTokensLegendInput = {
  tokenTypes: ['comment', 'variable'],
  tokenModifiers: [],
};

describe('reconcile', () => {
  it('marks lines with only comment tokens as comment', () => {
    const source = '// hi\nconst a = 1;\n\n';
    const tokens = tokensFromLines([0], [1]);
    const result = reconcile(
      { code: 0, comment: 0, blank: 0, total: 0 },
      source,
      tokens,
      legend,
    );
    expect(result.comment).toBe(1);
    expect(result.code).toBe(1);
    expect(result.blank).toBe(1);
    expect(result.total).toBe(3);
  });

  it('returns baseline when comment is not in legend', () => {
    const result = reconcile(
      { code: 5, comment: 1, blank: 0, total: 6 },
      'foo',
      { data: Uint32Array.from([]) },
      { tokenTypes: ['variable'], tokenModifiers: [] },
    );
    expect(result.code).toBe(5);
    expect(result.comment).toBe(1);
  });
});
