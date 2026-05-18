import { posixBasename } from './languageRegistry';

import type { TestRuleLayer, TestRuleSet } from '@shared/report';

/**
 * Default test-detection rule set. Applied when no per-language override
 * exists. Designed to OR together with per-language rules — any match counts.
 */
export const DEFAULT_TEST_RULES: TestRuleSet = {
  useLsp: true,
  filenameGlobs: [
    '**/*.test.*',
    '**/*.spec.*',
    '**/*_test.*',
    '**/test_*.*',
    '**/*Test.java',
    '**/*Tests.java',
    '**/*Test.kt',
    '**/*Tests.kt',
    '**/*Test.cs',
    '**/*Tests.cs',
  ],
  directoryGlobs: [
    '**/__tests__/**',
    '**/__test__/**',
    '**/test/**',
    '**/tests/**',
    '**/spec/**',
    '**/specs/**',
    '**/e2e/**',
    '**/cypress/**',
    '**/playwright/**',
    '**/src/test/**',
    '**/src/it/**',
  ],
  fileMarkers: [
    String.raw`\bimport\s+(?:[^;]*\bfrom\s+)?['"]vitest['"]`,
    String.raw`\bimport\s+(?:[^;]*\bfrom\s+)?['"]@jest/globals['"]`,
    String.raw`\brequire\(['"]chai['"]\)`,
    String.raw`\bimport\s+pytest\b`,
    String.raw`\bfrom\s+unittest\b`,
    String.raw`\bdescribe\s*\(`,
    String.raw`\bit\s*\(`,
    String.raw`\btest\s*\(`,
    String.raw`@Test\b`,
    String.raw`#\[(test|cfg\(test\))\]`,
    String.raw`\bfunc\s+Test[A-Z_]`,
    String.raw`\bTEST(_F)?\s*\(`,
    String.raw`\bRSpec\.describe\b`,
  ],
};

/* ------------------------------------------------------------------------ */
/* Glob → RegExp                                                             */
/* ------------------------------------------------------------------------ */

/**
 * Compile a minimatch-style glob into a RegExp. Supports `*`, `**`, `?`, `[..]`,
 * brace expansion `{a,b}`. The matcher is anchored.
 */
export function compileGlob(glob: string): RegExp {
  return new RegExp(`^${globToRegexSource(glob)}$`);
}

function globToRegexSource(glob: string): string {
  // Expand brace groups first: `*.{ts,tsx}` → `(*.ts|*.tsx)`.
  const expanded = expandBraces(glob);
  if (expanded.length > 1) {
    return `(?:${expanded.map(globSingleToRegex).join('|')})`;
  }
  return globSingleToRegex(expanded[0]!);
}

function expandBraces(glob: string): string[] {
  const idx = glob.indexOf('{');
  if (idx === -1)
    return [glob];
  // Find matching close brace.
  let depth = 0;
  let close = -1;
  for (let i = idx; i < glob.length; i++) {
    if (glob[i] === '{') {
      depth++;
    }
    else if (glob[i] === '}') {
      depth--;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  if (close === -1)
    return [glob];
  const head = glob.slice(0, idx);
  const tail = glob.slice(close + 1);
  const choices = splitChoices(glob.slice(idx + 1, close));
  const results: string[] = [];
  for (const choice of choices) {
    for (const sub of expandBraces(head + choice + tail)) results.push(sub);
  }
  return results;
}

function splitChoices(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '{') {
      depth++;
    }
    else if (c === '}') {
      depth--;
    }
    else if (c === ',' && depth === 0) {
      out.push(s.slice(start, i));
      start = i + 1;
    }
  }
  out.push(s.slice(start));
  return out;
}

function globSingleToRegex(glob: string): string {
  let out = '';
  let i = 0;
  while (i < glob.length) {
    const c = glob[i]!;
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // `**` — match any number of path segments (including zero).
        // Handle `**/` specifically to allow zero-segment match.
        if (glob[i + 2] === '/') {
          out += '(?:.*/)?';
          i += 3;
        }
        else {
          out += '.*';
          i += 2;
        }
      }
      else {
        // single `*` — match within a path segment (no slashes).
        out += '[^/]*';
        i += 1;
      }
    }
    else if (c === '?') {
      out += '[^/]';
      i += 1;
    }
    else if (c === '[') {
      const close = glob.indexOf(']', i + 1);
      if (close === -1) {
        out += '\\[';
        i += 1;
      }
      else {
        out += glob.slice(i, close + 1);
        i = close + 1;
      }
    }
    else if (/[.+^$()|\\]/.test(c)) {
      out += `\\${c}`;
      i += 1;
    }
    else {
      out += c;
      i += 1;
    }
  }
  return out;
}

/* ------------------------------------------------------------------------ */
/* Classifier                                                                */
/* ------------------------------------------------------------------------ */

export interface TestClassification {
  isTest: boolean;
  layer: TestRuleLayer;
}

export interface ClassifyOptions {
  /** Workspace-relative POSIX path (e.g. `webview/__tests__/App.test.tsx`). */
  relativePath: string;
  /** Language id (key for per-language rule lookup). */
  languageId?: string;
  /** First-N lines of file content; pass empty string to disable marker scan. */
  headSnippet?: string;
  /** Whether VSCode reported this file as part of a TestController. */
  lspTestMember?: boolean;
}

export class TestClassifier {
  private compiled: Map<string, CompiledRuleSet> = new Map();

  constructor(
    private defaults: TestRuleSet = DEFAULT_TEST_RULES,
    private perLanguage: Record<string, TestRuleSet> = {},
  ) {
    this.recompile();
  }

  setRules(defaults: TestRuleSet, perLanguage: Record<string, TestRuleSet>): void {
    this.defaults = defaults;
    this.perLanguage = perLanguage;
    this.recompile();
  }

  classify(opts: ClassifyOptions): TestClassification {
    const lang = opts.languageId;
    const rules = lang && this.compiled.has(lang)
      ? this.compiled.get(lang)!
      : this.compiled.get('__default__')!;

    // 1. LSP / TestController
    if (rules.useLsp && opts.lspTestMember) {
      return { isTest: true, layer: 'lsp' };
    }

    const path = opts.relativePath;
    const base = posixBasename(path);

    // 2. Filename glob
    for (const re of rules.filenameRegexes) {
      if (re.test(base) || re.test(path)) {
        return { isTest: true, layer: 'filename' };
      }
    }

    // 3. Directory glob (matched against full path)
    for (const re of rules.directoryRegexes) {
      if (re.test(path)) {
        return { isTest: true, layer: 'directory' };
      }
    }

    // 4. In-file marker
    if (opts.headSnippet && rules.markerRegexes.length > 0) {
      for (const re of rules.markerRegexes) {
        if (re.test(opts.headSnippet)) {
          return { isTest: true, layer: 'marker' };
        }
      }
    }

    return { isTest: false, layer: 'none' };
  }

  private recompile(): void {
    const map = new Map<string, CompiledRuleSet>();
    map.set('__default__', compileSet(this.defaults));
    for (const [lang, rules] of Object.entries(this.perLanguage)) {
      // Per-language rules layer on top of defaults — concatenate, then dedupe.
      const merged: TestRuleSet = {
        useLsp: rules.useLsp ?? this.defaults.useLsp,
        filenameGlobs: dedupe([...(this.defaults.filenameGlobs ?? []), ...(rules.filenameGlobs ?? [])]),
        directoryGlobs: dedupe([...(this.defaults.directoryGlobs ?? []), ...(rules.directoryGlobs ?? [])]),
        fileMarkers: dedupe([...(this.defaults.fileMarkers ?? []), ...(rules.fileMarkers ?? [])]),
      };
      map.set(lang, compileSet(merged));
    }
    this.compiled = map;
  }
}

interface CompiledRuleSet {
  useLsp: boolean;
  filenameRegexes: RegExp[];
  directoryRegexes: RegExp[];
  markerRegexes: RegExp[];
}

function compileSet(rules: TestRuleSet): CompiledRuleSet {
  return {
    useLsp: rules.useLsp ?? true,
    filenameRegexes: (rules.filenameGlobs ?? []).map(compileGlob),
    directoryRegexes: (rules.directoryGlobs ?? []).map(compileGlob),
    markerRegexes: (rules.fileMarkers ?? []).map(p => new RegExp(p)),
  };
}

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}
