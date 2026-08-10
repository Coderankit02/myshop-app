/**
 * WishlistContext — Supabase 'wishlist' table (user_id + product_id).
 * Mirrors the website: non-optimistic toggle (DB ke baad state update),
 * guests get prompted to login (handled by caller).
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface WishlistContextValue {
  wishlist: { id: string; product_id: string }[];
  wishlistIds: Set<string>;
  toggleWishlist: (productId: string) => Promise<boolean>;
  isWished: (productId: string) => boolean;
  removeWishlist: (rowId: string) => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [wishlist, setWishlist] = useState<{ id: string; product_id: string }[]>([]);

  useEffect(() => {
    let active = true;
    if (!session?.user) {
      setWishlist([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('wishlist')
        .select('id,product_id')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (active) setWishlist(data || []);
    })();
    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  const wishlistIds = useMemo(() => new Set(wishlist.map((w) => w.product_id)), [wishlist]);

  const toggleWishlist = useCallback(
    async (productId: string): Promise<boolean> => {
      if (!session?.user) return false;
      const existing = wishlist.find((w) => w.product_id === productId);
      if (existing) {
        const { error } = await supabase.from('wishlist').delete().eq('id', existing.id).eq('user_id', session.user.id);
        if (!error) setWishlist((w) => w.filter((x) => x.id !== existing.id));
      } else {
        const { data, error } = await supabase
          .from('wishlist')
          .insert({ user_id: session.user.id, product_id: productId })
          .select('id,product_id')
          .single();
        if (!error && data) setWishlist((w) => [data, ...w]);
      }
      return true;
    },
    [session, wishlist]
  );

  const removeWishlist = useCallback(
    async (rowId: string) => {
      if (!session?.user) return;
      const { error } = await supabase.from('wishlist').delete().eq('id', rowId).eq('user_id', session.user.id);
      if (!error) setWishlist((w) => w.filter((x) => x.id !== rowId));
    },
    [session]
  );

  const isWished = useCallback((productId: string) => wishlistIds.has(productId), [wishlistIds]);

  const value = useMemo(
    () => ({ wishlist, wishlistIds, toggleWishlist, isWished, removeWishlist }),
    [wishlist, wishlistIds, toggleWishlist, isWished, removeWishlist]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider');
  return ctx;
}
