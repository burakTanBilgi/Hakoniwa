import { useState } from 'react';
import { useAuth } from './AuthProvider.jsx';
import { useT } from '../i18n/index.js';
import './LoginScreen.css';

// Full-screen sign-in landing. Renders only when Supabase is configured
// AND the user has no session — App.jsx gates on that combo. Offers
// Google OAuth + email/password (sign in OR sign up), matching the
// patterns used across the unified-account apps (Doxa, Hakoniwa,
// yildizlarProjesi).
export default function LoginScreen() {
  const t = useT();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode]       = useState('sign-in'); // 'sign-in' | 'sign-up'
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState(null);
  const [info,  setInfo]      = useState(null);

  const handleGoogle = async () => {
    setBusy(true); setError(null); setInfo(null);
    const { error } = await signInWithGoogle();
    if (error) { setError(error.message); setBusy(false); }
    // success → page redirects, no need to clear busy
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    const fn = mode === 'sign-up' ? signUpWithEmail : signInWithEmail;
    const { data, error } = await fn(email.trim(), password);
    setBusy(false);
    if (error) { setError(error.message); return; }
    if (mode === 'sign-up' && !data?.session) {
      setInfo(t('auth.checkEmail'));
    }
  };

  return (
    <div className="login-screen">
      <div className="login-screen__card">
        <div className="login-screen__brand">
          <span className="login-screen__mark" aria-hidden>箱</span>
          <h1 className="login-screen__title">Hakoniwa</h1>
        </div>
        <p className="login-screen__sub">
          {t('auth.signInSub')}
        </p>

        <button
          type="button"
          className="login-screen__google"
          onClick={handleGoogle}
          disabled={busy}
        >
          <GoogleGlyph />
          <span>{t('auth.continueWithGoogle')}</span>
        </button>

        <div className="login-screen__divider" aria-hidden>{t('auth.dividerOr')}</div>

        <form className="login-screen__form" onSubmit={handleEmail}>
          <label className="login-screen__field">
            <span>{t('auth.email')}</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="login-screen__field">
            <span>{t('auth.password')}</span>
            <input
              type="password"
              autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <p className="login-screen__error" role="alert">{error}</p>}
          {info  && <p className="login-screen__info">{info}</p>}

          <button type="submit" className="login-screen__submit" disabled={busy}>
            {busy ? t('auth.busy') : mode === 'sign-up' ? t('auth.createAccount') : t('auth.signIn')}
          </button>
        </form>

        <button
          type="button"
          className="login-screen__toggle"
          onClick={() => { setMode(m => m === 'sign-up' ? 'sign-in' : 'sign-up'); setError(null); setInfo(null); }}
        >
          {mode === 'sign-up' ? t('auth.haveAccount') : t('auth.newHere')}
        </button>
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M22.5 12.27c0-.78-.07-1.53-.2-2.27H12v4.51h5.9c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.09-1.93 3.24-4.77 3.24-8.3z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.26 1.05-3.71 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.16-3.16C17.46 2.16 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}
