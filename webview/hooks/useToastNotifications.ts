import i18n from 'i18next';
import { toast } from 'sonner';

import { formatNumber } from '@/i18n/format';

import { useVscodeMessage } from './useVscodeMessage';

/**
 * Surface extension-side scan/baseline/export events as sonner toasts.
 * Mount once in the Dashboard alongside `<Toaster />`.
 *
 * Toasts fire inside imperative callbacks (not React render), so we read
 * `i18n.t` directly rather than via `useTranslation` — the callbacks always
 * see the latest language from the i18n singleton.
 */
export function useToastNotifications(): void {
  useVscodeMessage('scan/done', (m) => {
    const n = m.report.summary.totalFiles;
    const ms = m.report.durationMs;
    toast.success(i18n.t('toast.scanned', { count: n, display: formatNumber(n), ms }));
  });

  useVscodeMessage('scan/error', (m) => {
    toast.error(i18n.t('toast.scanFailed', { message: m.message }));
  });

  useVscodeMessage('export/saved', (m) => {
    toast.success(i18n.t('toast.exported', { format: m.format, path: m.path }));
  });

  useVscodeMessage('baseline/loaded', (m) => {
    if (m.baseline)
      toast.info(i18n.t('toast.baselineLoaded'));
  });
}
