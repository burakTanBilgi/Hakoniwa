import { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider.jsx';
import { useT } from '../i18n/index.js';
import './UserMenu.css';

// Tiny avatar + dropdown for the page-nav. Shows the user's Google
// picture (or an initial fallback) and exposes a sign-out action.
export default function UserMenu() {
  const t = useT();
  const { user, signOut, supabaseConfigured } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey   = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!supabaseConfigured || !user) return null;

  const meta   = user.user_metadata || {};
  const avatar = meta.avatar_url || meta.picture || null;
  const name   = meta.full_name || meta.name || user.email || 'You';
  const initial = (name?.[0] || '?').toUpperCase();

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-menu__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={name}
      >
        {avatar
          ? <img className="user-menu__avatar" src={avatar} alt="" referrerPolicy="no-referrer" />
          : <span className="user-menu__avatar user-menu__avatar--fallback">{initial}</span>}
      </button>

      {open && (
        <div className="user-menu__pop" role="menu">
          <div className="user-menu__head">
            <div className="user-menu__name">{name}</div>
            {user.email && name !== user.email && (
              <div className="user-menu__email">{user.email}</div>
            )}
          </div>
          <button
            type="button"
            className="user-menu__item user-menu__item--danger"
            role="menuitem"
            onClick={() => { setOpen(false); signOut(); }}
          >
            {t('auth.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}
