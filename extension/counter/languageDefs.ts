import type { LanguageRule } from '@shared/report';

/**
 * Built-in language rule catalog. Covers the most common ~50 languages with
 * verified comment / string syntax. Users can extend or override via the
 * `tallycode.languages` setting; missing languages can also be filled in at
 * runtime from installed VSCode language-extension contributions.
 */
export const BUILTIN_LANGUAGES: LanguageRule[] = [
  // --- JS / TS family --------------------------------------------------
  {
    id: 'javascript',
    name: 'JavaScript',
    aliases: ['js'],
    extensions: ['.js', '.mjs', '.cjs'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
    blockStrings: [['`', '`']],
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    aliases: ['ts'],
    extensions: ['.ts', '.mts', '.cts'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
    blockStrings: [['`', '`']],
  },
  {
    id: 'javascriptreact',
    name: 'JavaScript React',
    aliases: ['jsx'],
    extensions: ['.jsx'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
    blockStrings: [['`', '`']],
  },
  {
    id: 'typescriptreact',
    name: 'TypeScript React',
    aliases: ['tsx'],
    extensions: ['.tsx'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
    blockStrings: [['`', '`']],
  },
  { id: 'json', name: 'JSON', extensions: ['.json'], lineComments: [] },
  {
    id: 'jsonc',
    name: 'JSON with Comments',
    extensions: ['.jsonc'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
  },
  { id: 'json5', name: 'JSON5', extensions: ['.json5'], lineComments: ['//'], blockComments: [['/*', '*/']] },

  // --- Web -------------------------------------------------------------
  {
    id: 'html',
    name: 'HTML',
    extensions: ['.html', '.htm', '.xhtml'],
    blockComments: [['<!--', '-->']],
  },
  {
    id: 'xml',
    name: 'XML',
    extensions: ['.xml', '.xaml', '.xsd', '.xsl', '.xslt'],
    blockComments: [['<!--', '-->']],
  },
  {
    id: 'css',
    name: 'CSS',
    extensions: ['.css'],
    blockComments: [['/*', '*/']],
  },
  {
    id: 'scss',
    name: 'SCSS',
    extensions: ['.scss'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
  },
  { id: 'sass', name: 'Sass', extensions: ['.sass'], lineComments: ['//'] },
  {
    id: 'less',
    name: 'Less',
    extensions: ['.less'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
  },
  {
    id: 'vue',
    name: 'Vue',
    extensions: ['.vue'],
    lineComments: ['//'],
    blockComments: [['<!--', '-->'], ['/*', '*/']],
  },
  {
    id: 'svelte',
    name: 'Svelte',
    extensions: ['.svelte'],
    lineComments: ['//'],
    blockComments: [['<!--', '-->'], ['/*', '*/']],
  },
  {
    id: 'astro',
    name: 'Astro',
    extensions: ['.astro'],
    lineComments: ['//'],
    blockComments: [['<!--', '-->'], ['/*', '*/']],
  },

  // --- Systems / typed -------------------------------------------------
  {
    id: 'c',
    name: 'C',
    extensions: ['.c', '.h'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
  },
  {
    id: 'cpp',
    name: 'C++',
    extensions: ['.cpp', '.cxx', '.cc', '.hpp', '.hxx', '.hh', '.ipp', '.tpp'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
  },
  {
    id: 'csharp',
    name: 'C#',
    extensions: ['.cs', '.csx'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
  },
  {
    id: 'objective-c',
    name: 'Objective-C',
    extensions: ['.m', '.mm'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
  },
  {
    id: 'swift',
    name: 'Swift',
    extensions: ['.swift'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
    nestedBlockComment: true,
  },
  {
    id: 'go',
    name: 'Go',
    extensions: ['.go'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
  },
  {
    id: 'rust',
    name: 'Rust',
    extensions: ['.rs'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
    nestedBlockComment: true,
  },
  {
    id: 'java',
    name: 'Java',
    extensions: ['.java'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
  },
  {
    id: 'kotlin',
    name: 'Kotlin',
    extensions: ['.kt', '.kts'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
    nestedBlockComment: true,
  },
  {
    id: 'scala',
    name: 'Scala',
    extensions: ['.scala', '.sc'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
    nestedBlockComment: true,
  },
  {
    id: 'dart',
    name: 'Dart',
    extensions: ['.dart'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
    nestedBlockComment: true,
  },
  {
    id: 'groovy',
    name: 'Groovy',
    extensions: ['.groovy', '.gradle'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
  },

  // --- Scripting -------------------------------------------------------
  {
    id: 'python',
    name: 'Python',
    extensions: ['.py', '.pyi', '.pyw'],
    lineComments: ['#'],
    blockStrings: [['"""', '"""'], ['\'\'\'', '\'\'\'']],
    blockStringAsComment: true,
  },
  {
    id: 'ruby',
    name: 'Ruby',
    extensions: ['.rb', '.rake', '.gemspec'],
    filenames: ['Rakefile', 'Gemfile'],
    lineComments: ['#'],
    blockComments: [['=begin', '=end']],
  },
  {
    id: 'php',
    name: 'PHP',
    extensions: ['.php', '.phtml'],
    lineComments: ['//', '#'],
    blockComments: [['/*', '*/']],
  },
  {
    id: 'perl',
    name: 'Perl',
    extensions: ['.pl', '.pm', '.t'],
    lineComments: ['#'],
    blockComments: [['=pod', '=cut']],
  },
  {
    id: 'lua',
    name: 'Lua',
    extensions: ['.lua'],
    lineComments: ['--'],
    blockComments: [['--[[', ']]']],
  },
  {
    id: 'r',
    name: 'R',
    extensions: ['.r'],
    lineComments: ['#'],
  },

  // --- Shells ----------------------------------------------------------
  {
    id: 'shellscript',
    name: 'Shell',
    aliases: ['shell', 'bash', 'sh', 'zsh'],
    extensions: ['.sh', '.bash', '.zsh', '.fish'],
    filenames: ['.bashrc', '.zshrc', '.profile', '.bash_profile'],
    lineComments: ['#'],
  },
  {
    id: 'powershell',
    name: 'PowerShell',
    extensions: ['.ps1', '.psm1', '.psd1'],
    lineComments: ['#'],
    blockComments: [['<#', '#>']],
  },
  {
    id: 'bat',
    name: 'Batch',
    extensions: ['.bat', '.cmd'],
    lineComments: ['REM ', '::'],
  },

  // --- Functional ------------------------------------------------------
  {
    id: 'haskell',
    name: 'Haskell',
    extensions: ['.hs', '.lhs'],
    lineComments: ['--'],
    blockComments: [['{-', '-}']],
    nestedBlockComment: true,
  },
  {
    id: 'ocaml',
    name: 'OCaml',
    extensions: ['.ml', '.mli'],
    blockComments: [['(*', '*)']],
    nestedBlockComment: true,
  },
  {
    id: 'fsharp',
    name: 'F#',
    extensions: ['.fs', '.fsi', '.fsx'],
    lineComments: ['//'],
    blockComments: [['(*', '*)']],
    nestedBlockComment: true,
  },
  {
    id: 'elm',
    name: 'Elm',
    extensions: ['.elm'],
    lineComments: ['--'],
    blockComments: [['{-', '-}']],
    nestedBlockComment: true,
  },
  {
    id: 'clojure',
    name: 'Clojure',
    extensions: ['.clj', '.cljs', '.cljc', '.edn'],
    lineComments: [';;', ';'],
  },
  {
    id: 'erlang',
    name: 'Erlang',
    extensions: ['.erl', '.hrl'],
    lineComments: ['%'],
  },
  {
    id: 'elixir',
    name: 'Elixir',
    extensions: ['.ex', '.exs'],
    lineComments: ['#'],
  },

  // --- Markup / config -------------------------------------------------
  {
    id: 'markdown',
    name: 'Markdown',
    extensions: ['.md', '.markdown', '.mdx'],
    blockComments: [['<!--', '-->']],
  },
  {
    id: 'yaml',
    name: 'YAML',
    extensions: ['.yml', '.yaml'],
    lineComments: ['#'],
  },
  {
    id: 'toml',
    name: 'TOML',
    extensions: ['.toml'],
    filenames: ['Cargo.lock'],
    lineComments: ['#'],
  },
  {
    id: 'ini',
    name: 'INI',
    extensions: ['.ini', '.cfg', '.conf'],
    lineComments: [';', '#'],
  },
  {
    id: 'dockerfile',
    name: 'Dockerfile',
    filenames: ['Dockerfile', 'Containerfile', '.dockerignore'],
    extensions: ['.dockerfile'],
    lineComments: ['#'],
  },
  {
    id: 'makefile',
    name: 'Makefile',
    filenames: ['Makefile', 'makefile', 'GNUmakefile'],
    extensions: ['.mk', '.mak'],
    lineComments: ['#'],
  },
  {
    id: 'cmake',
    name: 'CMake',
    extensions: ['.cmake'],
    filenames: ['CMakeLists.txt'],
    lineComments: ['#'],
  },
  {
    id: 'tex',
    name: 'TeX',
    extensions: ['.tex', '.sty', '.cls'],
    lineComments: ['%'],
  },
  {
    id: 'sql',
    name: 'SQL',
    extensions: ['.sql'],
    lineComments: ['--'],
    blockComments: [['/*', '*/']],
  },
  {
    id: 'graphql',
    name: 'GraphQL',
    extensions: ['.graphql', '.gql'],
    lineComments: ['#'],
  },
  {
    id: 'protobuf',
    name: 'Protocol Buffers',
    extensions: ['.proto'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
  },

  // --- Emerging / smart-contract --------------------------------------
  {
    id: 'solidity',
    name: 'Solidity',
    extensions: ['.sol'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
  },
  {
    id: 'zig',
    name: 'Zig',
    extensions: ['.zig', '.zon'],
    lineComments: ['//'],
  },
  {
    id: 'nim',
    name: 'Nim',
    extensions: ['.nim', '.nims'],
    lineComments: ['#'],
    blockComments: [['#[', ']#']],
    nestedBlockComment: true,
  },
  {
    id: 'mojo',
    name: 'Mojo',
    extensions: ['.mojo', '.🔥'],
    lineComments: ['#'],
    blockStrings: [['"""', '"""'], ['\'\'\'', '\'\'\'']],
    blockStringAsComment: true,
  },
  {
    id: 'carbon',
    name: 'Carbon',
    extensions: ['.carbon'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
  },
  {
    id: 'move',
    name: 'Move',
    extensions: ['.move'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
    nestedBlockComment: true,
  },
  {
    // V shares the `.v` extension with Verilog; we default to `.vsh` only and
    // let users opt-in to `.v` via `tallycode.languages.vlang.extensions`.
    id: 'vlang',
    name: 'V',
    aliases: ['v'],
    extensions: ['.vsh'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
  },
  {
    id: 'gleam',
    name: 'Gleam',
    extensions: ['.gleam'],
    lineComments: ['//'],
  },
  {
    id: 'roc',
    name: 'Roc',
    extensions: ['.roc'],
    lineComments: ['#'],
  },
  {
    id: 'odin',
    name: 'Odin',
    extensions: ['.odin'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
    nestedBlockComment: true,
  },

  // --- Other -----------------------------------------------------------
  {
    id: 'csv',
    name: 'CSV',
    extensions: ['.csv', '.tsv'],
    count: false,
  },
  {
    id: 'plaintext',
    name: 'Plain Text',
    extensions: ['.txt', '.text', '.log'],
  },
];

/**
 * Build a quick-lookup index keyed by extension and filename.
 * Multiple languages sharing an extension is rare; first-wins.
 */
export interface BuiltinIndex {
  byExtension: Map<string, LanguageRule>;
  byFilename: Map<string, LanguageRule>;
  byId: Map<string, LanguageRule>;
}

export function indexLanguages(rules: LanguageRule[]): BuiltinIndex {
  const byExtension = new Map<string, LanguageRule>();
  const byFilename = new Map<string, LanguageRule>();
  const byId = new Map<string, LanguageRule>();
  for (const rule of rules) {
    byId.set(rule.id, rule);
    for (const alias of rule.aliases ?? []) byId.set(alias, rule);
    for (const ext of rule.extensions ?? []) {
      const key = ext.toLowerCase();
      if (!byExtension.has(key))
        byExtension.set(key, rule);
    }
    for (const fn of rule.filenames ?? []) {
      if (!byFilename.has(fn))
        byFilename.set(fn, rule);
    }
  }
  return { byExtension, byFilename, byId };
}
