import { describe, expect, it } from 'vitest';

import en from '../../i18n/locales/en.json';
import zhCN from '../../i18n/locales/zh-CN.json';

/**
 * Strip i18next CLDR plural suffixes (`_one`, `_other`, `_zero`, `_two`,
 * `_few`, `_many`) so we compare plural groups, not individual variants.
 * English has both `_one` and `_other`; zh-CN per CLDR only has `_other`.
 * The test compares "logical keys" — the common group root.
 */
const PLURAL_SUFFIX_RE = /_(zero|one|two|few|many|other)$/;

function flatten(obj: unknown, prefix = '', out = new Set<string>()): Set<string> {
  if (typeof obj !== 'object' || obj === null) {
    out.add(prefix.replace(PLURAL_SUFFIX_RE, ''));
    return out;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    flatten(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

describe('locale dictionary parity', () => {
  const enKeys = flatten(en);
  const zhKeys = flatten(zhCN);

  it('en.json and zh-CN.json have the same logical key set', () => {
    const missingInZh = [...enKeys].filter(k => !zhKeys.has(k)).sort();
    const missingInEn = [...zhKeys].filter(k => !enKeys.has(k)).sort();
    expect(missingInZh, 'keys present in en.json but missing in zh-CN.json').toEqual([]);
    expect(missingInEn, 'keys present in zh-CN.json but missing in en.json').toEqual([]);
  });
});
