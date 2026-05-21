import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PageNav from '../../../../src/ui/components/PageNav.jsx';
import { I18nProvider } from '../../../../src/i18n/index.js';
import tr from '../../../../src/i18n/tr.js';

const noop = () => {};

function renderNav(lang) {
  if (lang) localStorage.setItem('hakoniwa:lang', lang);
  return render(
    <I18nProvider>
      <PageNav page="grid" onNav={noop} theme="dark" onToggleTheme={noop} />
    </I18nProvider>,
  );
}

describe('PageNav language switcher', () => {
  it('shows EN and English tab labels by default', () => {
    renderNav('en');
    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Docs' })).toBeInTheDocument();
  });

  it('shows TR and Turkish tab labels when the language is Turkish', () => {
    renderNav('tr');
    expect(screen.getByText('TR')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: tr['nav.docs'] })).toBeInTheDocument();
  });

  it('toggles the language when the switcher is clicked', async () => {
    const user = userEvent.setup();
    renderNav('en');
    await user.click(screen.getByText('EN'));
    expect(screen.getByText('TR')).toBeInTheDocument();
  });
});
