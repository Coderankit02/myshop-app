/**
 * helpers.ts — shared utilities (ported 1:1 from the website's helpers.js)
 */

/** Discount percent: original_price > selling_price ho to % OFF, warna null */
export const calcDiscount = (sp?: number, op?: number | null): number | null =>
  op && sp != null && op > sp ? Math.round((1 - sp / op) * 100) : null;

/** Category emoji fallback resolver (same as website) */
export const catEmoji = (c?: { icon_emoji?: string | null }): string =>
  c && c.icon_emoji ? c.icon_emoji : '🛒';

/** INR formatting — ₹ symbol, no decimals (prices are whole rupees on the site) */
export const inr = (n?: number | null): string => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/** Compact distance label: 450 m / 2.3 km */
export const distLabel = (km: number): string =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

/** Friendly relative time — "2 ghante pehle" (Hinglish, like admin's order age badge) */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'abhi abhi';
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min} min pehle`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ghante pehle`;
  const day = Math.floor(hr / 24);
  return `${day} din pehle`;
}

/** Order status → Hinglish label + emoji (same mapping as the site's chat.js) */
export const ORDER_STATUS: Record<string, { label: string; emoji: string; color: string }> = {
  pending: { label: 'Pending', emoji: '⏳', color: '#FFB800' },
  confirmed: { label: 'Confirmed', emoji: '✅', color: '#16A34A' },
  packed: { label: 'Packed', emoji: '📦', color: '#3B82F6' },
  out_for_delivery: { label: 'Out for Delivery', emoji: '🚚', color: '#F97316' },
  delivered: { label: 'Delivered', emoji: '🏠', color: '#16A34A' },
  cancelled: { label: 'Cancelled', emoji: '❌', color: '#EF4444' },
  returned: { label: 'Returned', emoji: '↩️', color: '#8B5CF6' },
};
export const orderStatusMeta = (s: string) =>
  ORDER_STATUS[s] || { label: s || 'Pending', emoji: '📋', color: '#94A3B8' };

/** Payment method → friendly label */
export const PAY_METHOD_LABEL: Record<string, string> = {
  razorpay: 'Online (Razorpay)',
  upi: 'UPI / QR',
  cod: 'Cash on Delivery',
};
export const paymentMethodLabel = (m: string) => PAY_METHOD_LABEL[m] || m;

/** Phone validation — Indian 10-digit starting 6-9 */
export const isPhoneValid = (p: string): boolean => /^[6-9]\d{9}$/.test(p.trim());

export const isEmailValid = (e: string): boolean => /\S+@\S+\.\S+/.test(e.trim());

/** Friendly auth errors (same messages as the website) */
export function friendlyAuthError(err: { message?: string } | null): string {
  const m = err?.message || '';
  if (m.includes('Invalid login credentials')) return 'Email ya password galat hai. Dobara try karein.';
  if (m.includes('Email not confirmed')) return 'Pehle email verify karein. Inbox check karein.';
  if (m.includes('already registered')) return 'Yeh email pehle se registered hai!';
  if (m.includes('rate limit') || m.includes('Too many')) return 'Zyada try kiya. 1 minute baad dobara karein.';
  if (m.includes('network') || m.includes('fetch')) return 'Network error. Internet check karein.';
  if (m.includes('Password should be')) return 'Password kam se kam 6 characters ka hona chahiye.';
  if (m.includes('Auth session missing') || m.includes('session missing'))
    return 'Reset link expire ho gaya ya pehle use ho chuka hai. Naya link mangwayein.';
  return m || 'Kuch error hua. Dobara try karein.';
}

/** Password strength score 0-5 (same as website auth.js) */
export function passwordStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
export const STRENGTH_COLORS = ['#E2E8F0', '#E63946', '#FF6B35', '#FFB800', '#1BA672', '#0EA86A'];
export const STRENGTH_LABELS = ['', 'Bahut kamzor', 'Kamzor', 'Theek hai', 'Achha', 'Bahut achha'];

/** Generate a local session id like the website widget (sess_<ts>_<rand>) */
export function makeSessionId(): string {
  return 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}
