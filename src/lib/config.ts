/**
 * config.ts — Rinku Kirana Store (React Native) — public config
 * ---------------------------------------------------------------
 * Ye saari values PUBLIC hain (site ke browser code me already hain) —
 * isliye EXPO_PUBLIC_ prefix ke saath safely ship ho sakti hain.
 * Kabhi bhi service-role key / secrets yahan mat daalo.
 */

// ── Supabase (same project as the website) ──────────────────────────
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://pffaflasgwhydkmxwkky.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable__tFDYhkM3blZ0pIVT0YxLA_YvkKq79L';

// ── Serverless API base (existing myshop deployment — NO new backend) ─
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://rinkukiranastore.vercel.app';

// ── Razorpay (public key id — secret kabhi client me nahi) ──────────
export const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TLetzdnhKVTxvS';
export const STORE_NAME = 'RK Grocery Mart';
export const STORE_TAGLINE = 'हर घर की पसंद';

// ── Cloudinary (unsigned preset for payment screenshot upload) ──────
export const CLOUDINARY_CLOUD_NAME = 'delf8iyzt';
export const CLOUDINARY_UPLOAD_PRESET = 'myshop_preset';

// ── WhatsApp support (Ananya AI fallback + help) ────────────────────
export const WHATSAPP_NUMBER = '916393196765';

// ── Shop origin (delivery radius engine) ─────────────────────────────
export const SHOP_ORIGIN = { lat: 25.7388984, lng: 82.6638101, name: 'RK Grocery Mart' };

// ── Cart storage key (same as website) ───────────────────────────────
export const CART_STORAGE_KEY = 'rk_cart_v1';
export const THEME_STORAGE_KEY = 'rk_theme';
export const ANANYA_SESSION_KEY = 'ananya-session-id';
export const PUSH_TOKEN_KEY = 'rk_push_token';
