import { act, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { afterEach, describe, expect, it } from 'vitest';

import { Dashboard } from '@/views/Dashboard';

async function setLanguage(lng: 'en' | 'zh-CN'): Promise<void> {
  await act(async () => {
    await i18n.changeLanguage(lng);
  });
}

describe('zh-CN smoke', () => {
  afterEach(async () => {
    // Reset language so other tests keep seeing English.
    await setLanguage('en');
  });

  it('renders Chinese labels when language is zh-CN', async () => {
    await setLanguage('zh-CN');
    render(<Dashboard />);
    expect(screen.getByRole('heading', { name: /运行你的第一次扫描/ })).toBeInTheDocument();
    expect(screen.getByText(/统计该工作区中的所有代码/)).toBeInTheDocument();
  });

  it('falls back to English when language is reset', async () => {
    await setLanguage('en');
    render(<Dashboard />);
    expect(screen.getByRole('heading', { name: /Run your first scan/i })).toBeInTheDocument();
    expect(screen.getByText(/Count every code, comment, and blank line/i)).toBeInTheDocument();
  });
});
