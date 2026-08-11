/**
 * socialAuth.ts — Google / Facebook login (mirror of the website's socialAuth.jsx)
 * ---------------------------------------------------------------
 * Flow:
 *  - Web:    signInWithOAuth normal redirect → supabase-js PKCE code
 *            auto-detected via detectSessionInUrl (supabase.ts).
 *  - Native: skipBrowserRedirect returns the authorize URL → open in
 *            expo-web-browser auth session → deep link (rinkukirana://)
 *            returns code → exchangeCodeForSession (PKCE verifier is kept
 *            in memory by supabase-js).
 */
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

/* ── Brand icons (inline SVG — no extra dependency, react-native-svg) ── */
export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </Svg>
  );
}

export function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z" />
    </Svg>
  );
}

/* ── Provider availability (mirror website: /auth/v1/settings preflight) ── */
export function useSocialProviders() {
  const [status, setStatus] = useState({ google: true, facebook: true, ready: false });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
          headers: { apikey: SUPABASE_ANON_KEY },
        });
        if (cancelled) return;
        if (!res.ok) {
          setStatus({ google: true, facebook: true, ready: true }); // fail-open
          return;
        }
        const j = await res.json();
        if (!cancelled) {
          setStatus({ google: !!j?.external?.google, facebook: !!j?.external?.facebook, ready: true });
        }
      } catch {
        if (!cancelled) setStatus({ google: true, facebook: true, ready: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return status;
}

/* ── OAuth sign-in ───────────────────────────────────────────
   Returns null on success (or when the browser redirect is about
   to happen on web), otherwise a friendly error message. */
export async function signInWithProvider(provider: 'google' | 'facebook'): Promise<string | null> {
  // Native: app ke deep link (rinkukirana://) se code wapas aata hai.
  // Web: redirectTo explicitly current page rakhte hain — warna supabase apne
  // configured Site URL (website) par le jaata hai aur user app se nikal jaata
  // hai. (Bug fix: "login hone par website par chala gaya".)
  const redirectTo =
    Platform.OS === 'web'
      ? typeof window !== 'undefined'
        ? window.location.href
        : undefined
      : Linking.createURL('/auth/callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      // Native: hum khud browser kholte hain (skipBrowserRedirect).
      // Web: supabase-js normal redirect karta hai + PKCE code auto-detect.
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  });

  if (error) {
    const m = (error.message || '').toLowerCase();
    if (m.includes('provider') || m.includes('unsupported') || m.includes('disabled')) {
      return 'Google/Facebook login abhi enable nahi hua hai. Store admin se baat karein.';
    }
    return error.message || 'Kuch error hua, dobara try karein.';
  }
  if (!data.url) return 'Login shuru nahi ho paya, dobara try karein.';

  // Web: browser redirect khud hoga — session wapas aane par auto-detect.
  if (Platform.OS === 'web') return null;

  // Native: auth session (Custom Tabs / ASWebAuthenticationSession)
  let result: { type: string; url?: string | null };
  try {
    result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  } catch {
    return 'Browser khul nahi paya, dobara try karein.';
  }
  if (result.type !== 'success' || !result.url) {
    return 'Login cancel ho gaya.';
  }

  // PKCE: code exchange (supabase-js ne code verifier memory me rakha hai)
  const params = new URL(result.url).searchParams;
  const code = params.get('code');
  if (code) {
    const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
    if (exErr) return 'Login confirm nahi ho paya, dobara try karein.';
    return null;
  }

  // Fallback: implicit tokens in URL hash
  const hash = result.url.split('#')[1];
  if (hash) {
    const hp = new URLSearchParams(hash);
    const accessToken = hp.get('access_token');
    if (accessToken) {
      const { error: sErr } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: hp.get('refresh_token') || '',
      });
      if (sErr) return 'Login confirm nahi ho paya, dobara try karein.';
      return null;
    }
  }
  return 'Login confirm nahi ho paya, dobara try karein.';
}
