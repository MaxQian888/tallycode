import { addCounts, ZERO_COUNT } from './aggregator';

import type {
  CountResult,
  DiffReport,
  FileDiff,
  LanguageDiff,
  LanguageSummary,
  Report,
} from '@shared/report';

function deltaCount(before: CountResult, after: CountResult): CountResult {
  return {
    code: after.code - before.code,
    comment: after.comment - before.comment,
    blank: after.blank - before.blank,
    total: after.total - before.total,
  };
}

export function buildDiff(baseline: Report, current: Report): DiffReport {
  const beforeFiles = new Map(baseline.files.map(f => [f.path, f]));
  const afterFiles = new Map(current.files.map(f => [f.path, f]));
  const allPaths = new Set([...beforeFiles.keys(), ...afterFiles.keys()]);

  const files: FileDiff[] = [];
  let filesAdded = 0;
  let filesRemoved = 0;
  let filesChanged = 0;

  for (const path of [...allPaths].sort()) {
    const before = beforeFiles.get(path);
    const after = afterFiles.get(path);
    if (before && !after) {
      files.push({
        path,
        language: before.language,
        status: 'removed',
        before: before.count,
        after: null,
      });
      filesRemoved += 1;
    }
    else if (!before && after) {
      files.push({
        path,
        language: after.language,
        status: 'added',
        before: null,
        after: after.count,
      });
      filesAdded += 1;
    }
    else if (before && after) {
      const changed = !countsEqual(before.count, after.count);
      files.push({
        path,
        language: after.language,
        status: changed ? 'changed' : 'unchanged',
        before: before.count,
        after: after.count,
      });
      if (changed)
        filesChanged += 1;
    }
  }

  const languages = diffLanguages(baseline.languages, current.languages);

  const summary = {
    before: baseline.summary.total,
    after: current.summary.total,
    delta: deltaCount(baseline.summary.total, current.summary.total),
    filesBefore: baseline.summary.totalFiles,
    filesAfter: current.summary.totalFiles,
    filesAdded,
    filesRemoved,
    filesChanged,
  };

  return {
    schemaVersion: 1,
    baselineAt: baseline.scannedAt,
    currentAt: current.scannedAt,
    summary,
    languages,
    files,
  };
}

function diffLanguages(
  before: LanguageSummary[],
  after: LanguageSummary[],
): LanguageDiff[] {
  const byId = new Map<string, { before?: LanguageSummary; after?: LanguageSummary }>();
  for (const b of before) byId.set(b.language, { ...byId.get(b.language), before: b });
  for (const a of after) byId.set(a.language, { ...byId.get(a.language), after: a });
  return [...byId.entries()]
    .map(([language, pair]) => ({
      language,
      before: pair.before ?? null,
      after: pair.after ?? null,
    }))
    .sort((a, b) => {
      const aTotal = a.after?.total.code ?? a.before?.total.code ?? 0;
      const bTotal = b.after?.total.code ?? b.before?.total.code ?? 0;
      return bTotal - aTotal;
    });
}

function countsEqual(a: CountResult, b: CountResult): boolean {
  return a.code === b.code
    && a.comment === b.comment
    && a.blank === b.blank
    && a.total === b.total;
}

// Re-exports for downstream consumers
export { addCounts, ZERO_COUNT };
