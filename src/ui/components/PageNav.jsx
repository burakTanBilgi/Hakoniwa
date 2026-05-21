import WaveDivider from './meta/WaveDivider.jsx';
import Tooltip from './Tooltip.jsx';
import SyncPill from './SyncPill.jsx';
import UserMenu from '../../auth/UserMenu.jsx';
import { useT, useLang } from '../../i18n/index.js';

// Page ids double as the leaf of their i18n key: t('nav.' + id).
const PAGES = [
  { id: 'landing',  icon: '⌂' },
  { id: 'docs',     icon: '?' },
  { id: 'projects', icon: '⚏' },
  { id: 'preview',  icon: '◇' },
  { id: 'grid',     icon: '⊞' },
  { id: 'edit',     icon: '✎' },
];

export default function PageNav({ page, onNav, projectName, theme, onToggleTheme, syncStatus = 'offline' }) {
  const t = useT();
  const { lang, setLang } = useLang();
  const isDark = theme === 'dark';
  const switchLabel = lang === 'en' ? 'Switch to Türkçe' : "İngilizce'ye geç";
  return (
    <>
    <header className="page-nav">
      <div className="page-nav__brand">
        <span className="page-nav__mark" aria-hidden>箱</span>
        <span className="page-nav__title">Hakoniwa</span>
        {projectName && (
          <>
            <span className="page-nav__sep" aria-hidden>·</span>
            <span className="page-nav__project">{projectName}</span>
          </>
        )}
        <SyncPill status={syncStatus} />
      </div>

      <Tooltip label={switchLabel}>
        <button
          type="button"
          className="page-nav__lang"
          onClick={() => setLang(lang === 'en' ? 'tr' : 'en')}
          aria-label={switchLabel}
        >
          {lang === 'en' ? 'EN' : 'TR'}
        </button>
      </Tooltip>

      <Tooltip label={isDark ? t('nav.themeToLight') : t('nav.themeToDark')}>
        <button
          type="button"
          className="page-nav__theme"
          onClick={onToggleTheme}
          aria-label={t('nav.toggleTheme')}
        >
          <span aria-hidden>{isDark ? '☾' : '☀'}</span>
        </button>
      </Tooltip>

      <UserMenu />

      <nav className="page-nav__tabs" aria-label={t('nav.pages')}>
        {PAGES.map((p) => {
          const label = t('nav.' + p.id);
          return (
            <button
              key={p.id}
              type="button"
              className={`page-nav__tab ${page === p.id ? 'page-nav__tab--active' : ''}`}
              onClick={() => onNav(p.id)}
              aria-label={label}
              aria-current={page === p.id ? 'page' : undefined}
              title={label}
            >
              <span className="page-nav__icon" aria-hidden>{p.icon}</span>
              <span className="page-nav__tab-label">{label}</span>
            </button>
          );
        })}
      </nav>
    </header>
    <WaveDivider
      className="page-nav-wave"
      height={12}
      amplitude={4}
      strokeWidth={1.25}
      fillTop="var(--page-nav-bg)"
    />
    </>
  );
}
