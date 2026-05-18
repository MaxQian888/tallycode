/**
 * languageId → codicon mapping for the status bar.
 * Pure module — no vscode imports — so it stays unit-testable.
 *
 * Returns just the codicon name (without the `$(...)` wrapper) so callers can
 * compose it into status bar text or QuickPick item icons as needed.
 */

const LANGUAGE_CODICON: Record<string, string> = {
  // JS / TS family
  'javascript': 'symbol-method',
  'typescript': 'symbol-method',
  'javascriptreact': 'symbol-method',
  'typescriptreact': 'symbol-method',
  'json': 'json',
  'jsonc': 'json',
  'json5': 'json',

  // Web
  'html': 'code',
  'xml': 'code',
  'css': 'symbol-color',
  'scss': 'symbol-color',
  'sass': 'symbol-color',
  'less': 'symbol-color',
  'vue': 'symbol-misc',
  'svelte': 'symbol-misc',
  'astro': 'symbol-misc',

  // Systems / typed
  'c': 'symbol-struct',
  'cpp': 'symbol-struct',
  'csharp': 'symbol-class',
  'objective-c': 'symbol-struct',
  'swift': 'symbol-class',
  'go': 'symbol-method',
  'rust': 'symbol-struct',
  'java': 'symbol-class',
  'kotlin': 'symbol-class',
  'scala': 'symbol-class',
  'dart': 'symbol-class',
  'groovy': 'symbol-class',

  // Scripting
  'python': 'symbol-snake',
  'ruby': 'symbol-class',
  'php': 'symbol-method',
  'perl': 'symbol-method',
  'lua': 'symbol-method',
  'r': 'symbol-method',

  // Shells
  'shellscript': 'terminal',
  'powershell': 'terminal-powershell',
  'bat': 'terminal-cmd',

  // Functional
  'haskell': 'symbol-function',
  'ocaml': 'symbol-function',
  'fsharp': 'symbol-function',
  'elm': 'symbol-function',
  'clojure': 'symbol-function',
  'erlang': 'symbol-function',
  'elixir': 'symbol-function',

  // Markup / config
  'markdown': 'markdown',
  'yaml': 'symbol-property',
  'toml': 'symbol-property',
  'ini': 'symbol-property',
  'dockerfile': 'symbol-package',
  'makefile': 'symbol-package',
  'cmake': 'symbol-package',
  'tex': 'book',
  'sql': 'database',
  'graphql': 'symbol-event',
  'protobuf': 'symbol-interface',

  // Emerging / smart-contract
  'solidity': 'symbol-interface',
  'zig': 'symbol-struct',
  'nim': 'symbol-class',
  'mojo': 'flame',
  'carbon': 'symbol-class',
  'move': 'symbol-class',
  'vlang': 'symbol-method',
  'gleam': 'symbol-function',
  'roc': 'symbol-function',
  'odin': 'symbol-struct',

  // Other
  'csv': 'table',
  'plaintext': 'symbol-string',
};

const DEFAULT_ICON = 'symbol-misc';

/**
 * Look up a codicon name for a language id. Falls back to a generic icon
 * (`symbol-misc`) when no mapping exists.
 */
export function iconFor(languageId: string | undefined | null): string {
  if (!languageId)
    return DEFAULT_ICON;
  return LANGUAGE_CODICON[languageId] ?? DEFAULT_ICON;
}

/** Wrap with VSCode's $(codicon) syntax. */
export function codiconFor(languageId: string | undefined | null): string {
  return `$(${iconFor(languageId)})`;
}
