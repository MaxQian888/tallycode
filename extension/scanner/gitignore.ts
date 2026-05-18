import ignore from 'ignore';

import type { Ignore } from 'ignore';

/**
 * Wraps a hierarchical set of .gitignore files. Matching follows git
 * semantics: a deeper .gitignore's rules apply only inside its directory and
 * can negate parent rules. Patterns are matched against workspace-relative
 * POSIX paths.
 */
export class GitignoreSet {
  /**
   * Stack of (directoryPath, matcher) pairs, sorted shallow → deep.
   * directoryPath is workspace-relative POSIX without trailing slash; '' for root.
   */
  private layers: Array<{ dir: string; ig: Ignore }> = [];

  /**
   * Register a .gitignore file's contents at a given directory.
   * @param dir workspace-relative POSIX directory containing the .gitignore ('' = root)
   * @param contents raw file text
   */
  add(dir: string, contents: string): void {
    const ig = ignore({ allowRelativePaths: true }).add(contents);
    const norm = normalizeDir(dir);
    this.layers.push({ dir: norm, ig });
    this.layers.sort((a, b) => a.dir.length - b.dir.length);
  }

  /**
   * @returns true when the path is ignored by any layer that covers it.
   * The deepest matching layer wins (its negation, if any, overrides
   * shallower matches).
   */
  isIgnored(workspaceRelPath: string): boolean {
    const rel = workspaceRelPath.replace(/\\/g, '/').replace(/^\/+/, '');
    let ignored = false;
    for (const layer of this.layers) {
      if (!isUnder(rel, layer.dir))
        continue;
      const subPath = subPathFor(rel, layer.dir);
      if (!subPath)
        continue;
      const test = layer.ig.test(subPath);
      // `ignore` 7.x returns { ignored, unignored }. We treat undefined as no opinion.
      if (test.unignored)
        ignored = false;
      else if (test.ignored)
        ignored = true;
    }
    return ignored;
  }

  /** Convenience: filter an array, keeping only non-ignored paths. */
  filter(paths: string[]): string[] {
    return paths.filter(p => !this.isIgnored(p));
  }
}

function normalizeDir(dir: string): string {
  return dir.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function isUnder(filePath: string, dir: string): boolean {
  if (dir === '')
    return true;
  return filePath === dir || filePath.startsWith(`${dir}/`);
}

function subPathFor(filePath: string, dir: string): string {
  if (dir === '')
    return filePath;
  return filePath.slice(dir.length + 1);
}
