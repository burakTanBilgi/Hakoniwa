import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useProject } from '../grid/useProject.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import LoginScreen from '../auth/LoginScreen.jsx';
import { EmbedContext } from '../puzzle';
import PageNav from './components/PageNav.jsx';
import LandingPage from './pages/LandingPage.jsx';
import { useT } from '../i18n/index.js';
import './styles/App.css';

// Non-landing pages are code-split: only Landing + PageNav are in the
// initial bundle, so first paint stays light. Each lazy chunk loads on
// demand the first time the user navigates to that page.
const DocsPage       = lazy(() => import('./pages/DocsPage.jsx'));
const ProjectsPage   = lazy(() => import('./pages/ProjectsPage.jsx'));
const PreviewPage    = lazy(() => import('./pages/PreviewPage.jsx'));
const GridEditorPage = lazy(() => import('./pages/GridEditorPage.jsx'));
const EditPage       = lazy(() => import('./pages/EditPage.jsx'));

// Doxa embed is heavy (Recharts) — pull it as its own lazy chunk so
// users who never embed a chart never pay for it. PuzzlePiece consumes
// this via the EmbedContext below.
const DoxaEmbed = lazy(() => import('../embeds/DoxaEmbed.jsx'));

const THEME_KEY = 'hakoniwa:theme';
const LEGACY_THEME_KEY = 'puzzle-studio:theme';

function loadTheme() {
  try {
    return (
      localStorage.getItem(THEME_KEY) ||
      localStorage.getItem(LEGACY_THEME_KEY) ||
      'dark'
    );
  } catch { return 'dark'; }
}

// On first load, show the Landing page (front door). After the user has
// visited any page, remember it across reloads. Legacy 'edges' / 'cells'
// (the prior split that confused users) collapse back into one 'edit' tab.
const PAGE_KEY = 'hakoniwa:lastPage';
function loadInitialPage() {
  try {
    const raw = localStorage.getItem(PAGE_KEY) || 'landing';
    if (raw === 'edges' || raw === 'cells') return 'edit';
    return raw;
  } catch { return 'landing'; }
}

export default function App() {
  const [page, setPage] = useState(loadInitialPage);
  const { user, loading: authLoading, supabaseConfigured } = useAuth();
  // Pull the project hook unconditionally — useProject internally reads
  // localStorage so the first paint isn't blocked on any network call.
  // When Supabase is configured + signed-in, it also reconciles with the
  // cloud and keeps the autosave debounced upstream.
  const project = useProject(user?.id || null);
  const [theme, setTheme] = useState(loadTheme);
  const t = useT();

  useEffect(() => {
    try { localStorage.setItem(PAGE_KEY, page); } catch { /* ignore */ }
  }, [page]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // Renderer published through EmbedContext for PuzzlePiece. Returning
  // null lets the piece fall back to its placeholder; right now Doxa is
  // the only embed kind, but the switch makes adding new ones cheap.
  const embedRender = useCallback((content, piece) => {
    if (content?.type === 'doxa-embed') {
      return (
        <Suspense fallback={<div className="doxa-embed doxa-embed--loading" />}>
          <DoxaEmbed content={content} piece={piece} />
        </Suspense>
      );
    }
    return null;
  }, []);

  // Auth gate: when Supabase is wired, force a login before showing the
  // app. When Supabase isn't configured, the gate is invisible and the
  // app runs in localStorage-only mode.
  if (supabaseConfigured && !authLoading && !user) {
    return <LoginScreen />;
  }
  if (supabaseConfigured && authLoading) {
    return <div className="app__bootstrap" aria-live="polite">…</div>;
  }

  return (
    <EmbedContext.Provider value={embedRender}>
      <div className="app">
        {/* Keyboard-only "skip to content" — appears only when focused, so
            screen reader / Tab users can jump past the page-nav strip.
            A long-standing WCAG 2.4.1 (Bypass Blocks) pattern. */}
        <a href="#app-main" className="app__skip-link">{t('app.skipToContent')}</a>

        <PageNav
          page={page}
          onNav={setPage}
          projectName={project.project?.name}
          theme={theme}
          onToggleTheme={toggleTheme}
          syncStatus={project.syncStatus}
        />
        <main className="app__page" id="app-main" tabIndex={-1}>
          {page === 'landing'  && <LandingPage onNav={setPage} />}
          {page !== 'landing'  && (
            <Suspense fallback={<div className="app__page-loading" aria-live="polite">{t('app.loading')}</div>}>
              {page === 'docs'     && <DocsPage     onNav={setPage} />}
              {page === 'projects' && <ProjectsPage project={project} onNav={setPage} />}
              {page === 'preview'  && <PreviewPage  project={project} onNav={setPage} />}
              {page === 'grid'     && <GridEditorPage project={project} />}
              {page === 'edit'     && <EditPage     project={project} />}
            </Suspense>
          )}
        </main>
      </div>
    </EmbedContext.Provider>
  );
}
