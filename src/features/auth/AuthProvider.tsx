import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, toError } from '@/lib/supabase';

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: 'customer' | 'admin';
}

interface AuthContextValue {
  /** False until the stored session has been checked. */
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** True once the signed-in user's profile (and role) has loaded, or when signed out. */
  profileReady: boolean;
  isAdmin: boolean;
  /** True right after following a password-reset email link. */
  recoveringPassword: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { email: string; password: string; fullName: string; phone?: string }) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function client() {
  if (!supabase) throw new Error("Accounts aren't available because the website isn't connected to its database.");
  return supabase;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!supabase);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [recoveringPassword, setRecoveringPassword] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecoveringPassword(true);
      if (event === 'SIGNED_OUT') setRecoveringPassword(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!supabase || !userId) {
      setProfile(null);
      return;
    }
    let active = true;
    supabase
      .from('profiles')
      .select('id, full_name, phone, role')
      .eq('id', userId)
      .maybeSingle<Profile>()
      .then(({ data }) => {
        if (!active) return;
        setProfile(data ?? null);
        setProfileUserId(userId);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await client().auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw toError(error, 'Could not sign in.');
  }, []);

  const signUp = useCallback<AuthContextValue['signUp']>(async ({ email, password, fullName, phone }) => {
    const { data, error } = await client().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), phone: phone?.trim() || undefined },
        emailRedirectTo: `${window.location.origin}/sign-in?confirmed=1`,
      },
    });
    if (error) throw toError(error, 'Could not create your account.');
    return { needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await client().auth.signOut();
    if (error) throw toError(error);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await client().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw toError(error, 'Could not send the reset email.');
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await client().auth.updateUser({ password });
    if (error) throw toError(error, 'Could not update your password.');
    setRecoveringPassword(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      profile,
      profileReady: !session || profileUserId === session.user.id,
      isAdmin: profile?.role === 'admin',
      recoveringPassword,
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      updatePassword,
    }),
    [ready, session, profile, profileUserId, recoveringPassword, signIn, signUp, signOut, sendPasswordReset, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
