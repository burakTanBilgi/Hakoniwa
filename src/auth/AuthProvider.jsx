import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, supabaseConfigured } from './supabaseClient.js';

// Auth context for the whole app. When Supabase is not configured the
// provider stays inert — user is always null, loading is false, and
// the sign-in / sign-out methods are no-ops. The rest of the app keeps
// running in localStorage-only mode and never sees a login screen.
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(supabaseConfigured);

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); return; }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUser(data?.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabaseConfigured) return { error: new Error('Auth not configured') };
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signInWithEmail = useCallback(async (email, password) => {
    if (!supabaseConfigured) return { error: new Error('Auth not configured') };
    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signUpWithEmail = useCallback(async (email, password) => {
    if (!supabaseConfigured) return { error: new Error('Auth not configured') };
    return supabase.auth.signUp({ email, password });
  }, []);

  const signOut = useCallback(async () => {
    if (!supabaseConfigured) return;
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(() => ({
    user, loading,
    signInWithGoogle, signInWithEmail, signUpWithEmail, signOut,
    supabaseConfigured,
  }), [user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

const AUTH_FALLBACK = {
  user: null,
  loading: false,
  signInWithGoogle: () => Promise.resolve({ error: new Error('Auth not configured') }),
  signInWithEmail: () => Promise.resolve({ error: new Error('Auth not configured') }),
  signUpWithEmail: () => Promise.resolve({ error: new Error('Auth not configured') }),
  signOut: () => Promise.resolve(),
  supabaseConfigured: false,
};

export function useAuth() {
  const ctx = useContext(AuthCtx);
  // Outside <AuthProvider> (e.g. in unit tests), return safe no-op defaults
  // so components that call useAuth can render without crashing.
  return ctx ?? AUTH_FALLBACK;
}
