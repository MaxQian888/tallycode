import { env } from 'vscode';

export type Localizer = (message: string, ...args: unknown[]) => string;

export function normalizeLocale(raw: string = env.language): 'en' | 'zh-cn' {
  const lower = raw.toLowerCase();
  if (lower === 'zh-cn' || lower === 'zh' || lower.startsWith('zh-hans') || lower.startsWith('zh_cn'))
    return 'zh-cn';
  return 'en';
}
