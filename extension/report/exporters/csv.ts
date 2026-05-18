import type { Report } from '@shared/report';

function esc(value: string | number | boolean): string {
  const s = String(value);
  if (/[,"\n\r]/.test(s))
    return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportCsv(report: Report): string {
  const lines: string[] = [];
  lines.push('path,language,isTest,testReason,size,code,comment,blank,total');
  for (const f of report.files) {
    lines.push([
      esc(f.path),
      esc(f.language),
      esc(f.isTest),
      esc(f.testReason),
      esc(f.size),
      esc(f.count.code),
      esc(f.count.comment),
      esc(f.count.blank),
      esc(f.count.total),
    ].join(','));
  }
  return lines.join('\n');
}
