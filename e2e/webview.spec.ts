import { expect, test } from '@playwright/test';

test.describe('TallyCode Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows the TallyCode header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'TallyCode', level: 1 })).toBeVisible();
  });

  test('renders the empty-state prompt before a scan', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Run your first scan' })).toBeVisible();
    await expect(
      page.getByText('Count every code, comment, and blank line in this workspace.'),
    ).toBeVisible();
  });

  test('exposes the primary scan button', async ({ page }) => {
    const scanButtons = page.getByRole('button', { name: /scan workspace/i });
    await expect(scanButtons.first()).toBeVisible();
    await expect(scanButtons.first()).toBeEnabled();
  });

  test('disables baseline + export actions until a report exists', async ({ page }) => {
    await expect(page.getByRole('button', { name: /save baseline/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /^export$/i })).toBeDisabled();
  });
});

test.describe('Scan workflow (mocked)', () => {
  test('renders the report after a synthetic scan/done message', async ({ page }) => {
    await page.goto('/');

    // Inject a small fake Report matching shared/report.ts schema.
    await page.evaluate(() => {
      const report = {
        schemaVersion: 1,
        rootPath: '/r',
        scope: '',
        scannedAt: new Date().toISOString(),
        durationMs: 42,
        summary: {
          totalFiles: 2,
          testFiles: 1,
          sourceFiles: 1,
          total: { code: 30, comment: 5, blank: 5, total: 40 },
          source: { code: 20, comment: 3, blank: 2, total: 25 },
          test: { code: 10, comment: 2, blank: 3, total: 15 },
          languageCount: 1,
        },
        languages: [{
          language: 'typescript',
          files: 2,
          testFiles: 1,
          source: { code: 20, comment: 3, blank: 2, total: 25 },
          test: { code: 10, comment: 2, blank: 3, total: 15 },
          total: { code: 30, comment: 5, blank: 5, total: 40 },
        }],
        directoryTree: {
          path: '',
          name: '',
          files: 2,
          testFiles: 1,
          source: { code: 20, comment: 3, blank: 2, total: 25 },
          test: { code: 10, comment: 2, blank: 3, total: 15 },
          total: { code: 30, comment: 5, blank: 5, total: 40 },
          children: [],
        },
        files: [
          { path: 'src/a.ts', language: 'typescript', size: 100, isTest: false, testReason: 'none', count: { code: 20, comment: 3, blank: 2, total: 25 } },
          { path: 'src/a.test.ts', language: 'typescript', size: 50, isTest: true, testReason: 'filename', count: { code: 10, comment: 2, blank: 3, total: 15 } },
        ],
        skipped: [],
      };
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'scan/done', report } }));
    });

    await expect(page.getByRole('tab', { name: /by language/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /directory tree/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^files$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /save baseline/i })).toBeEnabled();
    await expect(page.getByRole('button', { name: /^export$/i })).toBeEnabled();
  });
});

test.describe('Responsive Layout', () => {
  test('remains usable on a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'TallyCode', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /scan workspace/i }).first()).toBeVisible();
  });
});
