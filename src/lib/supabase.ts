/**
 * supabase.ts — shared Supabase client (same project as the website)
 * Session persistence via AsyncStorage + auto-refresh when app is foreground.
 */
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Web par OAuth (Google/Facebook) ka PKCE code URL se auto-detected hota
    // hai — native par flow hum manually handle karte hain (socialAuth.ts).
    detectSessionInUrl: true,
  },
});

// Keep the auth session fresh while the app is in the foreground
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
