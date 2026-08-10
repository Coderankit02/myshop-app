/**
 * PriceAlertContext — Supabase 'price_alerts' table (user_id + product_id).
 * Mirrors the website's toggleAlert: non-optimistic, duplicate insert handled
 * via 23505 (unique constraint) so a rapid double-tap never errors out.
 * Guests get prompted to login by the caller (same pattern as wishlist).
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface PriceAlertContextValue {
  alertedIds: Set<string>;
  isAlerted: (productId: string) => boolean;
  toggleAlert: (productId: string) => Promise<'on' | 'off' | 'none'>;
}

const PriceAlertContext = createContext<PriceAlertContextValue | null>(null);

export function PriceAlertProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [alertedIds, setAlertedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    if (!session?.user) {
      setAlertedIds(new Set());
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('price_alerts')
        .select('product_id')
        .eq('user_id', session.user.id);
      if (active) setAlertedIds(new Set((data || []).map((d) => d.product_id)));
    })();
    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  const toggleAlert = useCallback(
    async (productId: string): Promise<'on' | 'off' | 'none'> => {
      if (!session?.user) return 'none';
      const has = alertedIds.has(productId);
      if (has) {
        const { error } = await supabase
          .from('price_alerts')
          .delete()
          .eq('user_id', session.user.id)
          .eq('product_id', productId);
        if (!error) {
          setAlertedIds((prev) => {
            const next = new Set(prev);
            next.delete(productId);
            return next;
          });
          return 'off';
        }
      } else {
        const { error } = await supabase
          .from('price_alerts')
          .insert({ user_id: session.user.id, product_id: productId });
        if (!error || error.code === '23505') {
          // 23505 = already exists (double-tap race) — treat as success
          setAlertedIds((prev) => new Set(prev).add(productId));
          return 'on';
        }
      }
      return 'none';
    },
    [session, alertedIds]
  );

  const isAlerted = useCallback((productId: string) => alertedIds.has(productId), [alertedIds]);

  const value = useMemo(
    () => ({ alertedIds, isAlerted, toggleAlert }),
    [alertedIds, isAlerted, toggleAlert]
  );

  return <PriceAlertContext.Provider value={value}>{children}</PriceAlertContext.Provider>;
}

export function usePriceAlerts(): PriceAlertContextValue {
  const ctx = useContext(PriceAlertContext);
  if (!ctx) throw new Error('usePriceAlerts must be used inside PriceAlertProvider');
  return ctx;
}
