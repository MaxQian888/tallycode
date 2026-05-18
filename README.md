# TallyCode — Code Line Counter for VSCode

Count code lines per language across your workspace, **with first-class source / test split**, diff against a saved baseline, and a real dashboard you can export as PNG, HTML, Markdown, CSV, or JSON.

Built on top of a typed React + shadcn/ui webview, a regex line counter with optional LSP semantic-tokens calibration, and a file-level cache that makes re-scans near-instant.

## Features

- **50+ built-in languages** (TS/JS/Tailwind/Vue/Svelte/Astro, Python, Go, Rust, Java, Kotlin, C/C++, Swift, OCaml, Haskell, Clojure, Erlang, Elixir, PowerShell, Lua, R, SQL, Protobuf, GraphQL, …) — and any language registered by another installed VSCode extension is picked up automatically.
- **Smart test detection** via a four-rule OR cascade you can customize per language:
  1. VSCode TestController membership (LSP layer)
  2. Filename globs (`*.test.*`, `*.spec.*`, `*_test.go`, `test_*.py`, `*Test.java`, …)
  3. Directory globs (`__tests__/`, `test/`, `tests/`, `spec/`, `e2e/`, `src/test/`, …)
  4. In-file regex markers (`import pytest`, `describe(`, `@Test`, `#[test]`, `func Test*`, …)
- **Live dashboard** in a webview panel:
  - KPI cards (total, source vs test, languages, scan time)
  - Language pie + stacked source/test bar
  - Per-language table
  - Collapsible directory tree with roll-ups
  - Filterable / sortable / paginated file table
  - Diff vs baseline (per-file added / removed / changed)
- **Exports**: Markdown, CSV, JSON, self-contained HTML, and a one-click PNG screenshot of the dashboard.
- **Incremental cache** keyed by `(path, mtime, size, ruleHash)` — unchanged files are not re-read on subsequent scans.
- **Stale indicator**: a `FileSystemWatcher` flags files modified since the last scan; the dashboard shows a refresh prompt.
- **Status bar item**: live line count for the active editor file.

## Commands

| Command                                      | Default keybinding                      | Notes                                                                      |
| -------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------- |
| `TallyCode: Count Workspace`                 | —                                       | Scan the first workspace folder.                                           |
| `TallyCode: Count This Folder`               | Explorer right-click on a folder        |                                                                            |
| `TallyCode: Count Current File`              | Editor title icon, explorer right-click | Fast path; bypasses workspace enumeration.                                 |
| `TallyCode: Open Dashboard`                  | —                                       | Open or reveal the webview.                                                |
| `TallyCode: Save Current Result as Baseline` | —                                       | Stores `Report` JSON at `.vscode/.tallycode/baseline.json`.                |
| `TallyCode: Clear Baseline`                  | —                                       |                                                                            |
| `TallyCode: Export Report…`                  | —                                       | QuickPick for MD / CSV / JSON / HTML. PNG is available from the dashboard. |

## Configuration

Every setting lives under `tallycode.*`:

| Setting             | Type       | Default                          | What it does                                                                                                    |
| ------------------- | ---------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `useGitignore`      | `boolean`  | `true`                           | Honor every `.gitignore` in the workspace.                                                                      |
| `useFilesExclude`   | `boolean`  | `true`                           | Merge VSCode's `files.exclude` into the scanner's exclude list.                                                 |
| `include`           | `string[]` | `["**/*"]`                       | Include globs.                                                                                                  |
| `exclude`           | `string[]` | `[node_modules, dist, build, …]` | Exclude globs (merged with the above when applicable).                                                          |
| `maxFileSizeMB`     | `number`   | `5`                              | Skip files larger than this (0 = unlimited).                                                                    |
| `maxOpenFiles`      | `number`   | `32`                             | Concurrency limit for file reads.                                                                               |
| `useLspCalibration` | `boolean`  | `false`                          | When counting a single file, query the language server's semantic tokens to refine comment / string boundaries. |
| `markerScanLines`   | `number`   | `50`                             | How many lines to scan for in-file test markers. Set to `0` to disable layer 4.                                 |
| `testRules`         | `object`   | see source                       | Override default and per-language test rules.                                                                   |
| `languages`         | `object`   | `{}`                             | Override or extend built-in language rules.                                                                     |
| `languageConfUri`   | `string`   | `""`                             | Path to a JSON file with additional rules.                                                                      |

### Customizing test detection

```jsonc
"tallycode.testRules": {
  "default": { "useLsp": true, "filenameGlobs": ["**/*.{test,spec}.*"], "directoryGlobs": ["**/__tests__/**"] },
  "perLanguage": {
    "python": { "filenameGlobs": ["**/check_*.py"] }
  }
}
```

### Adding a language

```jsonc
"tallycode.languages": {
  "nim": {
    "id": "nim",
    "extensions": [".nim"],
    "lineComments": ["#"],
    "blockComments": [["#[", "]#"]],
    "nestedBlockComment": true
  }
}
```

## Architecture

```
extension/
  counter/        Pure engine (no vscode imports) — easy to unit-test
    lineCounter.ts        Regex state machine with nested-block + longest-match
    languageDefs.ts       Built-in catalog
    languageRegistry.ts   Path → LanguageRule resolution (files.associations → filename → extension)
    testClassifier.ts     Four-rule OR cascade with glob compiler
    lspCalibrator.ts      Pure reconcile(baseline, source, tokens, legend)
    lspCalibratorVscode.ts vscode-aware wrapper
  scanner/
    workspaceScanner.ts   findFiles + p-limit + cache
    fileScanner.ts        Single-file fast path (optionally LSP-calibrated)
    gitignore.ts          ignore-package wrapper, multi-layer aware
    cache.ts              sha1-keyed in-memory cache, JSON-persistable
    watcher.ts            FileSystemWatcher → stale-set
  report/
    aggregator.ts         FileEntry[] → Report (summary + per-language + directory tree)
    diff.ts               Report vs Report → DiffReport
    exporters/            markdown.ts, csv.ts, json.ts, html.ts
  views/
    panel.ts              MainPanel singleton
    helper.ts             CSP + nonce + virtual:vscode HTML
    messages.ts           Typed message router
    statusBar.ts          Live LOC for the active editor
  commands/               One file per command
  controller.ts           Central state holder + scan orchestration
shared/
  report.ts               Cross-process types (Report, DiffReport, LanguageRule, TallyCodeConfig)
  messages.ts             Typed webview ↔ extension protocol
webview/
  views/                  Dashboard + KPI + chart + tree + tables + diff
  hooks/useReport.ts      Subscribes to scan messages, exposes a single state object
  utils/exportPng.ts      html-to-image + postMessage
```

## Development

```bash
pnpm install
pnpm dev               # vite + extension watch
# Then press F5 in VSCode to launch the Extension Development Host.

pnpm test              # vitest unit tests (engine + webview)
pnpm test:extension    # @vscode/test-electron integration tests
pnpm test:e2e          # playwright (dev + prod-preview webview)
pnpm typecheck         # tsc --noEmit for both webview and extension projects
pnpm build             # production build → dist/
pnpm package           # produces a .vsix
```

## License

MIT.
