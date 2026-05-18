import { BUILTIN_LANGUAGES, indexLanguages } from './languageDefs';

import type { BuiltinIndex } from './languageDefs';
import type { LanguageRule } from '@shared/report';

/**
 * Resolves a file path → LanguageRule using a priority chain:
 *   1. files.associations (provided externally)
 *   2. exact filename match
 *   3. extension match
 *
 * No vscode imports — fully pure. The controller is responsible for feeding
 * VSCode-side data (files.associations, extension-contributed languages).
 */
export class LanguageRegistry {
  private index: BuiltinIndex;
  private filesAssociations: Map<string, string> = new Map();

  constructor(rules: LanguageRule[] = BUILTIN_LANGUAGES) {
    this.index = indexLanguages(rules);
  }

  /**
   * Replace the rule set entirely. Used after merging user overrides + any
   * VSCode-extension-contributed language metadata.
   */
  replaceRules(rules: LanguageRule[]): void {
    this.index = indexLanguages(rules);
  }

  /**
   * Set the `files.associations` map (glob → languageId). Caller should
   * pre-resolve VSCode globs to absolute or POSIX-relative form; the registry
   * matches against the path's basename for exact glob or by `*.ext` suffix.
   */
  setFilesAssociations(assoc: Record<string, string>): void {
    this.filesAssociations = new Map(Object.entries(assoc));
  }

  /**
   * Resolve a file path to a LanguageRule (or undefined if unknown).
   * The path can be absolute or relative; only the basename and extension
   * are inspected.
   */
  resolve(filePath: string): LanguageRule | undefined {
    const basename = posixBasename(filePath);
    const ext = posixExtname(basename).toLowerCase();

    // 1. files.associations override
    const assocLang = this.matchFilesAssociations(basename, ext);
    if (assocLang) {
      const rule = this.index.byId.get(assocLang);
      if (rule)
        return rule;
    }

    // 2. exact filename
    const byFilename = this.index.byFilename.get(basename);
    if (byFilename)
      return byFilename;

    // 3. extension
    if (ext) {
      const byExt = this.index.byExtension.get(ext);
      if (byExt)
        return byExt;
    }

    return undefined;
  }

  /** Internal: match a basename/ext against files.associations entries. */
  private matchFilesAssociations(basename: string, ext: string): string | undefined {
    for (const [pattern, lang] of this.filesAssociations) {
      if (matchAssociation(pattern, basename, ext))
        return lang;
    }
    return undefined;
  }

  /** All known language ids (built-in + user). */
  ids(): string[] {
    const set = new Set<string>();
    for (const rule of this.index.byId.values()) set.add(rule.id);
    return [...set];
  }

  /** Look up a rule by canonical id (no alias resolution). */
  byId(id: string): LanguageRule | undefined {
    return this.index.byId.get(id);
  }
}

/**
 * Lightweight glob matching for VSCode `files.associations` patterns.
 * Supports `*.ext` and exact-filename forms. Full-path globs (`**\/`...) are
 * out of scope — VSCode passes those at workspace-search time, not here.
 */
export function matchAssociation(pattern: string, basename: string, ext: string): boolean {
  if (pattern === basename)
    return true;
  if (pattern.startsWith('*.'))
    return ext === `.${pattern.slice(2).toLowerCase()}`;
  return false;
}

export function posixBasename(p: string): string {
  const norm = p.replace(/\\/g, '/');
  const idx = norm.lastIndexOf('/');
  return idx === -1 ? norm : norm.slice(idx + 1);
}

export function posixExtname(basename: string): string {
  // Match Node's path.extname semantics: trailing dot returns '', leading dot
  // alone returns '' (e.g. '.bashrc' → '').
  const dot = basename.lastIndexOf('.');
  if (dot <= 0 || dot === basename.length - 1)
    return '';
  return basename.slice(dot);
}

/**
 * Merge user override rules on top of a base rule set. User rules with the
 * same `id` shallow-merge with the base; new ids are appended.
 */
export function mergeLanguageRules(
  base: LanguageRule[],
  overrides: Record<string, Partial<LanguageRule>>,
): LanguageRule[] {
  const byId = new Map<string, LanguageRule>();
  for (const rule of base) byId.set(rule.id, { ...rule });
  for (const [id, override] of Object.entries(overrides)) {
    const existing = byId.get(id);
    if (existing) {
      byId.set(id, { ...existing, ...override, id });
    }
    else {
      byId.set(id, { ...(override as LanguageRule), id });
    }
  }
  return [...byId.values()];
}
