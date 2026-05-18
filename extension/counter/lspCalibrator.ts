import type { CountResult } from '@shared/report';

/**
 * VSCode SemanticTokens has shape { resultId?: string; data: Uint32Array }.
 * We accept the data buffer directly so this module stays free of vscode
 * imports and can be unit-tested without the editor.
 */
export interface SemanticTokensInput {
  data: Uint32Array | number[];
}

export interface SemanticTokensLegendInput {
  tokenTypes: string[];
  tokenModifiers: string[];
}

/**
 * Reconcile a regex baseline with semantic tokens supplied by the language
 * server. The heuristic: a line that touches a 'comment' token but no
 * non-comment token is counted as comment. Lines with code tokens win
 * regardless of comment tokens (since users care about presence of source).
 *
 * If the language server's legend has no 'comment' entry, return the baseline
 * unchanged.
 */
export function reconcile(
  baseline: CountResult,
  source: string,
  tokens: SemanticTokensInput,
  legend: SemanticTokensLegendInput,
): CountResult {
  const commentIdx = legend.tokenTypes.indexOf('comment');
  if (commentIdx < 0)
    return baseline;

  const lines = splitLines(source);
  const commentLines = new Set<number>();
  const codeLines = new Set<number>();

  const data = Array.from(tokens.data);
  let line = 0;
  for (let i = 0; i < data.length; i += 5) {
    const deltaLine = data[i] ?? 0;
    const type = data[i + 3] ?? -1;
    line += deltaLine;
    if (type === commentIdx)
      commentLines.add(line);
    else codeLines.add(line);
  }

  let code = 0;
  let comment = 0;
  let blank = 0;
  let total = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    total += 1;
    if (trimmed.length === 0) {
      blank += 1;
      continue;
    }
    const hasComment = commentLines.has(i);
    const hasCode = codeLines.has(i);
    if (hasComment && !hasCode)
      comment += 1;
    else if (hasCode)
      code += 1;
    else comment += 1;
  }

  return { code, comment, blank, total };
}

function splitLines(s: string): string[] {
  const out = s.split('\n');
  if (out.length > 0 && out[out.length - 1] === '')
    out.pop();
  return out.map(l => (l.endsWith('\r') ? l.slice(0, -1) : l));
}
