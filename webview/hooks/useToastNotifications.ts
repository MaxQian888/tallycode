import { toast } from 'sonner';

import { useVscodeMessage } from './useVscodeMessage';

/**
 * Surface extension-side scan/baseline/export events as sonner toasts.
 * Mount once in the Dashboard alongside `<Toaster />`.
 */
export function useToastNotifications(): void {
  useVscodeMessage('scan/done', (m) => {
    const n = m.report.summary.totalFiles;
    const ms = m.report.durationMs;
    toast.success(`Scanned ${n.toLocaleString('en-US')} file${n === 1 ? '' : 's'} in ${ms} ms`);
  });

  useVscodeMessage('scan/error', (m) => {
    toast.error(`Scan failed: ${m.message}`);
  });

  useVscodeMessage('export/saved', (m) => {
    toast.success(`Exported (${m.format}) to ${m.path}`);
  });

  useVscodeMessage('baseline/loaded', (m) => {
    if (m.baseline)
      toast.info('Baseline loaded');
  });
}
