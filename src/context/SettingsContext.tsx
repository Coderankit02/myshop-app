/**
 * SettingsContext — live shop_settings row (id=1) with realtime updates.
 * Mirrors the website's useShopSettings hook (defaults identical).
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ShopSettings } from '@/lib/types';

export const SHOP_SETTINGS_DEFAULTS: ShopSettings = {
  shop_name: 'RK Grocery Mart',
  contact: '',
  whatsapp: '',
  upi_id: 'Q025544077@ybl',
  delivery_radius: 8,
  delivery_charge: 30,
  open_time: '08:00',
  close_time: '21:00',
  logo_url: '',
  favicon_url: '',
  theme_color: '',
  social_facebook: '',
  social_instagram: '',
  social_whatsapp: '',
  social_youtube: '',
  footer_text: '',
  about_text: '',
  privacy_policy: '',
  terms_text: '',
  shipping_rules: '',
  announcement: '',
};

interface SettingsContextValue {
  settings: ShopSettings;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ShopSettings>(SHOP_SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const instanceId = useRef(Math.random().toString(36).slice(2)).current;

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from('shop_settings').select('*').eq('id', 1).maybeSingle();
    if (data) {
      setSettings({
        ...SHOP_SETTINGS_DEFAULTS,
        shop_name: data.shop_name || SHOP_SETTINGS_DEFAULTS.shop_name,
        contact: data.contact || '',
        whatsapp: data.whatsapp || '',
        upi_id: data.upi_id || SHOP_SETTINGS_DEFAULTS.upi_id,
        delivery_radius: data.delivery_radius ?? SHOP_SETTINGS_DEFAULTS.delivery_radius,
        delivery_charge: data.delivery_charge ?? SHOP_SETTINGS_DEFAULTS.delivery_charge,
        open_time: data.open_time || SHOP_SETTINGS_DEFAULTS.open_time,
        close_time: data.close_time || SHOP_SETTINGS_DEFAULTS.close_time,
        logo_url: data.logo_url || '',
        favicon_url: data.favicon_url || '',
        theme_color: data.theme_color || '',
        social_facebook: data.social_facebook || '',
        social_instagram: data.social_instagram || '',
        social_whatsapp: data.social_whatsapp || '',
        social_youtube: data.social_youtube || '',
        footer_text: data.footer_text || '',
        about_text: data.about_text || '',
        privacy_policy: data.privacy_policy || '',
        terms_text: data.terms_text || '',
        shipping_rules: data.shipping_rules || '',
        announcement: data.announcement || '',
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
    const ch = supabase
      .channel(`shop-settings-rt-${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shop_settings' }, fetchSettings)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchSettings, instanceId]);

  const value = useMemo(() => ({ settings, loading }), [settings, loading]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
