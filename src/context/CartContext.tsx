/**
 * CartContext — Guest (AsyncStorage) + Logged-in (Supabase cart_items) + Merge on login.
 * Direct port of the website's cart.js logic (line keys for multi-unit variants,
 * mergeGuestCart race-condition fix, etc.).
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { CART_STORAGE_KEY } from '@/lib/config';
import { lineKey, mergeCarts, cartCount, cartTotal } from '@/lib/cart';
import { useAuth } from './AuthContext';
import type { CartItem } from '@/lib/types';

interface CartContextValue {
  cart: CartItem[];
  count: number;
  total: number;
  addToCart: (product: Partial<CartItem> & { id: string }, qty?: number) => Promise<void>;
  updateQty: (productId: string, delta: number, stock?: number, lineKey?: string) => Promise<void>;
  removeFromCart: (productId: string, lineKey?: string) => Promise<void>;
  clearCart: () => Promise<void>;
  ready: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const cartRef = useRef<CartItem[]>([]);

  const setBoth = useCallback((c: CartItem[]) => {
    cartRef.current = c;
    setCart(c);
  }, []);

  /* ── Guest storage (AsyncStorage = localStorage equivalent) ── */
  const lsSave = useCallback((c: CartItem[]) => {
    AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(c)).catch(() => {});
  }, []);
  const lsLoad = useCallback(async (): Promise<CartItem[]> => {
    try {
      const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  }, []);
  const lsClear = useCallback(() => {
    AsyncStorage.removeItem(CART_STORAGE_KEY).catch(() => {});
  }, []);

  /* ── DB helpers (cart_items table) ── */
  const dbLoad = useCallback(async (userId: string): Promise<CartItem[]> => {
    const { data, error } = await supabase.from('cart_items').select('*').eq('user_id', userId);
    if (error) return [];
    return (data || []).map((r) => ({
      id: r.product_id,
      name: r.name,
      unit: r.unit,
      price: r.price,
      old: r.old_price,
      e: r.emoji,
      cat: r.category,
      bg: r.bg_color,
      qty: r.qty,
      image: r.image || null,
      variant: r.variant || '',
      k: r.variant ? `${r.product_id}::${r.variant}` : r.product_id,
    }));
  }, []);

  const dbUpsert = useCallback(async (userId: string, item: CartItem) => {
    const { error } = await supabase
      .from('cart_items')
      .upsert(
        {
          user_id: userId,
          product_id: item.id,
          name: item.name,
          unit: item.unit ?? null,
          price: item.price,
          old_price: item.old ?? null,
          emoji: item.e ?? null,
          category: item.cat ?? null,
          bg_color: item.bg ?? null,
          qty: item.qty,
          image: item.image ?? null,
          variant: item.variant ?? '',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,product_id,variant' }
      );
    if (error) console.error('[Cart] dbUpsert:', error.message);
  }, []);

  const dbDelete = useCallback(async (userId: string, productId: string, variant?: string | null) => {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('variant', variant || '');
    if (error) console.error('[Cart] dbDelete:', error.message);
  }, []);

  const dbClear = useCallback(async (userId: string) => {
    const { error } = await supabase.from('cart_items').delete().eq('user_id', userId);
    if (error) console.error('[Cart] dbClear:', error.message);
  }, []);

  /* ── Merge guest cart into DB cart on login (race-condition fix preserved) ── */
  const mergeGuestCart = useCallback(
    async (userId: string): Promise<CartItem[]> => {
      const guestItems = await lsLoad();
      const dbItems = await dbLoad(userId);
      if (!guestItems.length) return dbItems;

      const merged = mergeCarts(guestItems, dbItems);
      for (const item of merged) await dbUpsert(userId, item);
      await lsClear();
      return merged;
    },
    [lsLoad, dbLoad, dbUpsert, lsClear]
  );

  /* ── Auth change → load/merge/clear (mirror cart.js setUser) ── */
  useEffect(() => {
    let active = true;
    (async () => {
      if (session?.user) {
        userIdRef.current = session.user.id;
        const merged = await mergeGuestCart(session.user.id);
        if (active) setBoth(merged);
      } else {
        if (cartRef.current.length) await lsSave(cartRef.current);
        userIdRef.current = null;
        const guest = await lsLoad();
        if (active) setBoth(guest);
      }
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [session?.user?.id, mergeGuestCart, lsSave, lsLoad, setBoth]);

  /* ── Persist a single line (DB upsert/delete or guest save) ── */
  const persist = useCallback(
    async (item: CartItem | null, productId: string) => {
      const uid = userIdRef.current;
      if (uid) {
        if (item) await dbUpsert(uid, item);
        else await dbDelete(uid, productId);
      } else {
        await lsSave(cartRef.current);
      }
    },
    [dbUpsert, dbDelete, lsSave]
  );

  const addToCart = useCallback(
    async (product: Partial<CartItem> & { id: string }, qty = 1) => {
      const k = lineKey({ k: product.k, id: product.id, variant: product.variant });
      const current = cartRef.current;
      const idx = current.findIndex((i) => lineKey(i) === k);
      let next: CartItem[];
      if (idx > -1) {
        const updated = { ...current[idx], qty: current[idx].qty + qty };
        next = current.map((i, n) => (n === idx ? updated : i));
        await persist(updated, product.id);
      } else {
        const item: CartItem = { ...(product as CartItem), k, qty };
        next = [...current, item];
        await persist(item, product.id);
      }
      setBoth(next);
    },
    [persist, setBoth]
  );

  const removeFromCart = useCallback(
    async (productId: string, lineKeyOverride?: string) => {
      const key = lineKeyOverride || lineKey({ id: productId });
      const item = cartRef.current.find((i) => lineKey(i) === key);
      const uid = userIdRef.current;
      if (uid) await dbDelete(uid, productId, item?.variant);
      else await lsSave(cartRef.current.filter((i) => lineKey(i) !== key));
      setBoth(cartRef.current.filter((i) => lineKey(i) !== key));
    },
    [dbDelete, lsSave, setBoth]
  );

  const updateQty = useCallback(
    async (productId: string, delta: number, stock?: number, lineKeyOverride?: string) => {
      const key = lineKeyOverride || productId;
      const idx = cartRef.current.findIndex((i) => lineKey(i) === key);
      if (idx === -1) return;
      const item = cartRef.current[idx];
      const newQty = item.qty + delta;
      if (newQty <= 0) {
        await removeFromCart(productId, key);
        return;
      }
      if (stock != null && newQty > stock) return;
      const updated = { ...item, qty: newQty };
      await persist(updated, productId);
      setBoth(cartRef.current.map((i, n) => (n === idx ? updated : i)));
    },
    [removeFromCart, persist, setBoth]
  );

  const clearCart = useCallback(async () => {
    const uid = userIdRef.current;
    if (uid) await dbClear(uid);
    else await lsClear();
    setBoth([]);
  }, [dbClear, lsClear, setBoth]);

  const count = useMemo(() => cartCount(cart), [cart]);
  const total = useMemo(() => cartTotal(cart), [cart]);

  const value = useMemo(
    () => ({ cart, count, total, addToCart, updateQty, removeFromCart, clearCart, ready }),
    [cart, count, total, addToCart, updateQty, removeFromCart, clearCart, ready]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
