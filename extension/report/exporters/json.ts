import type { Report } from '@shared/report';

export function exportJson(report: Report): string {
  return JSON.stringify(report, null, 2);
}
