import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

/**
 * Read locale from the `<html data-locale="...">` attribute. The extension
 * host writes this attribute into the panel HTML and HTML export so React
 * boots with the correct language and there is no flash of English.
 */
function bootstrapLocale(): 'en' | 'zh-CN' {
  if (typeof document === 'undefined')
    return 'en';
  const raw = document.documentElement.dataset.locale ?? 'en';
  return raw.toLowerCase() === 'zh-cn' ? 'zh-CN' : 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    'en': { translation: en },
    'zh-CN': { translation: zhCN },
  },
  lng: bootstrapLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
