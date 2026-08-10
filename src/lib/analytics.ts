/**
 * analytics.ts — app screen-view tracking (mirror of the website's
 * analytics.js → page_views table). Admin dashboard ke "Visitors" aur
 * "Conversion Rate" cards ke liye app traffic bhi count hota hai.
 *
 * • Stable anonymous visitor id (AsyncStorage) — koi personal data nahi.
 * • Throttle: ek visitor har 30 min mein ek baar (per path) count hota hai.
 * • 100% fire-and-forget — fail ho to silently ignore (app kabhi nahi rukta).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const VISITOR_KEY = 'rk_visitor_id';
const THROTTLE_MS = 30 * 60 * 1000;

async function getVisitorId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    await AsyncStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return 'v_' + Date.now().toString(36);
  }
}

/** Track a screen view — throttled per path, fire-and-forget */
export async function trackPageView(path: string): Promise<void> {
  try {
    const key = `rk_pv_${path || '/'}`;
    const last = parseInt((await AsyncStorage.getItem(key)) || '0', 10) || 0;
    const now = Date.now();
    if (now - last < THROTTLE_MS) return;
    await AsyncStorage.setItem(key, String(now));

    const visitorId = await getVisitorId();
    await supabase.from('page_views').insert({
      visitor_id: visitorId,
      path: path || '/',
      referrer: 'mobile-app',
    });
  } catch {
    // never break the app
  }
}
