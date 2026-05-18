# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in the TallyCode repository.

## Project Overview

TallyCode is a VSCode extension that counts code lines per language, distinguishes test code from production code, computes diffs against a saved baseline, and exposes everything through a webview dashboard with PNG/HTML/MD/CSV/JSON exports.

The codebase is split cleanly along a process boundary:

- **Extension host** (`extension/`) — Node.js code that runs inside VSCode. Has full `vscode` API access. Owns the scanner, language registry, test classifier, cache, controller, and all commands.
- **Webview** (`webview/`) — React 19 + shadcn/ui + Tailwind v4 + recharts UI rendered inside the VSCode panel. Receives serialized `Report` JSON via `postMessage`. Cannot import from `extension/`.
- **Shared types** (`shared/`) — `report.ts` (`Report`, `DiffReport`, `LanguageRule`, `TallyCodeConfig`, …) and `messages.ts` (typed `WebviewToExtensionMessage` / `ExtensionToWebviewMessage`).

`shared/*` is the only module both sides import. Path aliases: `@/` → `webview/`, `@shared/` → `shared/`.

## Commands

```bash
pnpm install
pnpm dev              # vite + extension watch (F5 to launch Extension Development Host)
pnpm build            # typecheck both projects + vite build → dist/{extension,webview}
pnpm test             # vitest (engine + webview)
pnpm test:extension   # @vscode/test-electron + Mocha (real VSCode instance)
pnpm test:e2e         # playwright on the built webview
pnpm typecheck        # tsc --noEmit for both tsconfig.json (webview/shared) and tsconfig.node.json (extension/shared)
pnpm lint
pnpm package          # vsce package → .vsix
```

When invoking the dev workflow: press F5 in VSCode after `pnpm dev` starts, then run `TallyCode: Count Workspace` from the Command Palette.

## Architecture

### Engine (`extension/counter/`)

Pure modules — no `vscode` imports. Vitest can unit-test them directly. The engine knows nothing about files; it operates on string buffers.

- **`lineCounter.ts`** — Single-pass character state machine. Handles `lineComments`, `blockComments`, `blockStrings`, nested block comments (Haskell, Rust, Swift, Kotlin, Scala, Dart, OCaml, F#, Elm). Longest-prefix match prevents `--` shadowing `--[[` in Lua. Treats `blockStringAsComment: true` spans (Python docstrings, Lua long strings) as comments.
- **`languageDefs.ts`** — Built-in catalog of ~50 languages.
- **`languageRegistry.ts`** — Path → `LanguageRule` resolution chain: `files.associations` → exact filename → extension lookup. Case-insensitive on extensions. `mergeLanguageRules` layers user overrides on top.
- **`testClassifier.ts`** — Four-rule OR cascade: LSP TestController membership, filename glob, directory glob, in-file regex marker. Globs are compiled into anchored RegExps with brace-expansion + `**/` zero-or-more-segments support.
- **`lspCalibrator.ts`** — Pure `reconcile(baseline, source, tokens, legend)` that adjusts a baseline `CountResult` using delta-encoded `SemanticTokens` data.
- **`lspCalibratorVscode.ts`** — Thin wrapper that calls `vscode.commands.executeCommand('vscode.provideDocumentSemanticTokens', …)`. Kept separate so the pure module is testable without mocking `vscode`.

### Scanner (`extension/scanner/`)

- **`workspaceScanner.ts`** — `workspace.findFiles` + `p-limit(maxOpenFiles)` async concurrency. Decodes UTF-8 (with BOM stripping), heuristically skips binaries, runs the engine, runs the classifier, writes through the cache.
- **`fileScanner.ts`** — Single-file fast path: bypasses `findFiles`, reads the URI directly. Honors `useLspCalibration` (opt-in).
- **`gitignore.ts`** — Multi-layer `.gitignore` matcher backed by the `ignore` package. Deeper layers can negate parents.
- **`cache.ts`** — `Map<sha1-key, CacheEntry>`. Key = `sha1(relPath + mtime + size + ruleHash)`. JSON-persistable; controller writes it to `.vscode/.tallycode/cache.json`.
- **`watcher.ts`** — `FileSystemWatcher('**/*')` keeps a `Set<string>` of paths changed since the last successful scan. Emits stale-count to subscribers; the controller forwards to the panel.

### Report (`extension/report/`)

- **`aggregator.ts`** — `FileEntry[]` → `Report` with summary, per-language rollups, and recursive directory tree. Source/test sums are tracked separately at every level.
- **`diff.ts`** — Two `Report`s → `DiffReport`. Per-file `added`/`removed`/`changed`/`unchanged`; per-language before/after pairs.
- **`exporters/{markdown,csv,json,html}.ts`** — `Report` → text/blob. The HTML exporter inlines `dist/webview/assets/*.{js,css}` and injects the report as `window.__TALLYCODE_REPORT__` for the standalone bundle.

### Controller (`extension/controller.ts`)

Singleton instantiated on activation. Owns the registry, classifier, cache, watcher, status bar, and last/baseline `Report`s. Every command routes through it. Exposes `runScan(scope, uri?)`, `refresh()`, `saveBaseline()`, `clearBaseline()`, and reads/writes `.vscode/.tallycode/{baseline,cache}.json`.

### Commands (`extension/commands/`)

One file per command, each registers a `vscode.commands.registerCommand` and delegates to the controller. The `showHelloWorld` command from the starter is retained for the existing integration test.

### Views (`extension/views/`)

- **`panel.ts`** — `MainPanel` singleton wrapping the webview panel; uses `WebviewHelper.setupHtml/setupHooks`. Handles the `webview/ready` handshake.
- **`helper.ts`** — Builds CSP+nonce meta tag, injects the dev-server URL during HMR, routes messages.
- **`messages.ts`** — Typed router. Each `WebviewToExtensionMessage['type']` has a handler that delegates to the controller.
- **`statusBar.ts`** — Right-aligned `StatusBarItem`. Counts the active editor's file on edit (debounced 200ms) and refreshes when the rule set changes. Clicking it triggers `tallycode.countFile`.

### Configuration (`extension/config.ts`)

`readConfig()` reads `tallycode.*` plus `files.exclude` (when `useFilesExclude: true`). `onConfigChanged()` fires on either namespace.

### Webview (`webview/`)

- **`App.tsx`** — Thin shell. Sends `webview/ready`, renders `<Dashboard />`.
- **`views/Dashboard.tsx`** — Top-level layout: header (scan, refresh, save baseline, export dropdown), stale badge, progress bar, error banner, KPI cards, language breakdown, four-tab body (languages / directories / files / diff).
- **`views/SummaryCards.tsx`** — KPI tiles.
- **`views/LanguageBreakdown.tsx`** — recharts pie + stacked bar.
- **`views/LanguageTable.tsx`, `DirectoryTree.tsx`, `FileTable.tsx`, `DiffView.tsx`** — tab bodies.
- **`hooks/useReport.ts`** — Single source of truth subscribing to all extension-side messages. Returns one state object: report, baseline, diff, config, progress, error, staleCount, lastScan.
- **`hooks/useVscodeMessage.ts`** / **`useVscodeApi.ts`** — Generic typed message + state helpers from the starter.
- **`utils/exportPng.ts`** — html-to-image at `pixelRatio: 2`, posts the base64 to the extension.

### Shared (`shared/`)

- **`report.ts`** — `Report`, `DiffReport`, `LanguageRule`, `TallyCodeConfig`, `FileEntry`, `LanguageSummary`, `DirectoryNode`, `TestRuleSet`, `TestRuleLayer`. Schema version 1.
- **`messages.ts`** — `WebviewToExtensionMessage` and `ExtensionToWebviewMessage` unions, plus the `MessageOf` extractor.

## Testing

Tests live in three places:

- `extension/**/__tests__/*.test.ts` — Vitest. Engine, scanner helpers, aggregator, diff, exporters, LSP reconcile. Pure modules only — no vscode imports.
- `webview/__tests__/**/*.test.tsx` — Vitest + jsdom + React Testing Library. App shell, components, hooks. `webview/__tests__/setup.ts` polyfills `acquireVsCodeApi`, `Element.scrollIntoView`, `PointerEvent`, and pointer-capture methods (Radix needs these in jsdom).
- `__tests__/extension/` — Compiled to JS, then run inside `@vscode/test-electron`. Validates command registration and activation in a real VSCode instance.

Coverage thresholds are enforced on `webview/hooks`, `webview/lib`, `extension/counter`, `extension/report`, and select scanner modules — see `vitest.config.ts`.

## Adding things

### A new language

Append to `extension/counter/languageDefs.ts`. If users care about it, expose the rule via `tallycode.languages` too. Add a fixture test in `extension/counter/__tests__/lineCounter.test.ts` covering its comment forms.

### A new webview message

1. Add the variant to the appropriate union in `shared/messages.ts`.
2. If extension → webview: add a `useVscodeMessage('your/type', …)` consumer; if webview → extension: add a handler key in `extension/views/messages.ts`.
3. Add controller / dashboard glue as needed.

### A new export format

1. New file `extension/report/exporters/<format>.ts` that takes a `Report` and returns `string | Uint8Array`.
2. Extend `ExportFormat` in `shared/messages.ts` and the `render()` switch in `extension/commands/exportReport.ts`.
3. Add a `DropdownMenuItem` in `webview/views/Dashboard.tsx`.

### A new command

1. `extension/commands/<name>.ts` exporting `register(context)` and `COMMAND_ID`.
2. Wire it up in `extension/index.ts`.
3. Declare it under `contributes.commands` (and `menus` if needed) in `package.json`.
4. Add a unit assertion to `__tests__/extension/suite/extension.test.ts`.

## Conventions

- `@shared/*` imports for types crossing the process boundary; `@/` for webview-internal.
- Two-space indent (TS/JS/JSON/YAML), single quotes.
- ESLint config is `@antfu/eslint-config` via `@tomjs/eslint`. Run `pnpm lint:fix`.
- Engine modules must stay free of `vscode` imports so they remain unit-testable.
- New webview UI prefers shadcn/ui primitives (`webview/components/ui/*`); when none fits, follow the shadcn style (CVA + `cn` from `webview/lib/utils.ts`).
- Don't import `radix-ui` directly — go through the shadcn wrappers.
