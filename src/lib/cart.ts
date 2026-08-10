/**
 * cart.ts — pure cart logic (no React, no storage).
 * Extracted from the website's cart.js so it can be unit tested directly.
 * CartContext imports these — keep them framework-free.
 */
import type { CartItem } from './types';

/** Line key — `id` (single unit) ya `id::variant` (multi-unit product) */
export function lineKey(item?: { k?: string; id?: string; variant?: string | null } | null): string {
  if (item?.k) return item.k;
  if (item?.variant) return `${item.id}::${item.variant}`;
  return item?.id ? String(item.id) : '';
}

/**
 * Merge guest cart into the DB cart on login (same rule as the website):
 * - same line key → keep the HIGHER quantity (guest ke zyada items won't be lost)
 * - new lines → appended
 * Does NOT mutate inputs.
 */
export function mergeCarts(guest: CartItem[], db: CartItem[]): CartItem[] {
  const merged = db.map((i) => ({ ...i }));
  for (const g of guest) {
    const existing = merged.find((i) => lineKey(i) === lineKey(g));
    if (existing) existing.qty = Math.max(existing.qty, g.qty);
    else merged.push({ ...g });
  }
  return merged;
}

/** Cart totals */
export function cartCount(cart: CartItem[]): number {
  return cart.reduce((s, i) => s + i.qty, 0);
}
export function cartTotal(cart: CartItem[]): number {
  return cart.reduce((s, i) => s + i.price * i.qty, 0);
}
