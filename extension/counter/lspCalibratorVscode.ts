import { commands } from 'vscode';

import { countLines } from './lineCounter';
import { reconcile } from './lspCalibrator';

import type { CountResult, LanguageRule } from '@shared/report';
import type { SemanticTokens, SemanticTokensLegend, Uri } from 'vscode';

/**
 * Convenience wrapper: query VSCode's semantic-tokens provider for the given
 * document URI and reconcile with the regex baseline. Returns the baseline
 * on any failure (provider missing, throws, etc.) so the caller never has to
 * handle the LSP path differently.
 *
 * Only call this on the active document — bulk scans should stick to the
 * regex engine for performance.
 */
export async function calibrateWithSemanticTokens(
  uri: Uri,
  source: string,
  rule: LanguageRule,
): Promise<CountResult> {
  const baseline = countLines(source, rule);
  try {
    const legend = await commands.executeCommand<SemanticTokensLegend | undefined>(
      'vscode.provideDocumentSemanticTokensLegend',
      uri,
    );
    const tokens = await commands.executeCommand<SemanticTokens | undefined>(
      'vscode.provideDocumentSemanticTokens',
      uri,
    );
    if (!legend || !tokens)
      return baseline;
    return reconcile(baseline, source, tokens, legend);
  }
  catch {
    return baseline;
  }
}
