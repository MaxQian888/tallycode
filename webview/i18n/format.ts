import i18n from './index';

export function formatNumber(n: number): string {
  return n.toLocaleString(i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US');
}
