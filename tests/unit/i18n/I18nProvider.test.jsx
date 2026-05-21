import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider, useT, useLang } from '../../../src/i18n/index.js';
import tr from '../../../src/i18n/tr.js';

function Probe() {
  const t = useT();
  const { lang, setLang } = useLang();
  return (
    <div>
      <span data-testid="val">{t('time.justNow')}</span>
      <span data-testid="lang">{lang}</span>
      <button onClick={() => setLang('tr')}>switch</button>
    </div>
  );
}

describe('I18nProvider', () => {
  it('reads the saved language from localStorage', () => {
    localStorage.setItem('hakoniwa:lang', 'tr');
    render(<I18nProvider><Probe /></I18nProvider>);
    expect(screen.getByTestId('lang')).toHaveTextContent('tr');
    expect(screen.getByTestId('val')).toHaveTextContent(tr['time.justNow']);
  });

  it('defaults to English when nothing is saved', () => {
    render(<I18nProvider><Probe /></I18nProvider>);
    expect(screen.getByTestId('lang')).toHaveTextContent('en');
    expect(screen.getByTestId('val')).toHaveTextContent('just now');
  });

  it('switches language, re-renders consumers, and persists', async () => {
    const user = userEvent.setup();
    render(<I18nProvider><Probe /></I18nProvider>);
    await user.click(screen.getByText('switch'));
    expect(screen.getByTestId('lang')).toHaveTextContent('tr');
    expect(screen.getByTestId('val')).toHaveTextContent(tr['time.justNow']);
    expect(localStorage.getItem('hakoniwa:lang')).toBe('tr');
  });

  it('useT works without a provider, defaulting to English', () => {
    render(<Probe />);
    expect(screen.getByTestId('val')).toHaveTextContent('just now');
    expect(screen.getByTestId('lang')).toHaveTextContent('en');
  });
});
