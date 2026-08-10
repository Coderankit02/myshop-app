/**
 * ThemeContext — light/dark theme with admin theme_color accent.
 * Persists choice in AsyncStorage (rk_theme), defaults to system.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { THEME_STORAGE_KEY } from '@/lib/config';
import { buildTheme, type Theme, type ThemeMode } from '@/lib/theme';
import type { ShopSettings } from '@/lib/types';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings?: ShopSettings | null;
}) {
  const system = useColorScheme() || 'light';
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((s) => {
        if (!active) return;
        if (s === 'dark' || s === 'light') setModeState(s);
        else setModeState((system as ThemeMode) || 'light');
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [system]);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(THEME_STORAGE_KEY, m).catch(() => {});
  };
  const toggleMode = () => setMode(mode === 'dark' ? 'light' : 'dark');

  const theme = useMemo(() => buildTheme(mode, settings || undefined), [mode, settings]);

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode, toggleMode }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
