/**
 * AuthContext — Supabase auth + profile management.
 * Mirrors the website: session persistence, profile auto-create on first
 * load (profiles table), updateProfile, etc.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/lib/types';

interface AuthContextValue {
  session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] | null;
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (opts: { name: string; email: string; password: string }) => Promise<{ error: Error | null; needsEmailConfirm: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthContextValue['session']>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load or auto-create profile row (mirror profile.js loadProfile)
  const loadProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error && error.code === 'PGRST116') {
      const { data: authData } = await supabase.auth.getUser();
      const meta = authData?.user?.user_metadata || {};
      const email = authData?.user?.email || '';
      const newProfile = {
        id: userId,
        name: meta.name || email.split('@')[0] || 'User',
        email,
        phone: meta.phone || '',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data: created } = await supabase.from('profiles').insert(newProfile).select().single();
      return (created as UserProfile) || null;
    }
    if (error) return null;
    return data as UserProfile;
  }, []);

  const handleSession = useCallback(
    async (s: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      setSession(s);
      if (s?.user) {
        const profile = await loadProfile(s.user.id);
        setUser(profile);
      } else {
        setUser(null);
      }
    },
    [loadProfile]
  );

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) handleSession(data.session).finally(() => setLoading(false));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      handleSession(s);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [handleSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (opts: { name: string; email: string; password: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email: opts.email,
      password: opts.password,
      options: { data: { name: opts.name.trim() } },
    });
    return { error, needsEmailConfirm: !!data.user && !data.session };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    const profile = await loadProfile(session.user.id);
    setUser(profile);
  }, [session, loadProfile]);

  const updateProfile = useCallback(
    async (data: Partial<UserProfile>): Promise<boolean> => {
      if (!session?.user) return false;
      const { error } = await supabase
        .from('profiles')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);
      if (error) return false;
      await refreshProfile();
      return true;
    },
    [session, refreshProfile]
  );

  const value = useMemo(
    () => ({ session, user, loading, signIn, signUp, signOut, resetPassword, refreshProfile, updateProfile }),
    [session, user, loading, signIn, signUp, signOut, resetPassword, refreshProfile, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
