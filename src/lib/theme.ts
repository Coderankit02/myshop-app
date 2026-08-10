/**
 * theme.ts — design system (ported from the website's CSS variables)
 * Light + Dark palettes, plus the admin-configured theme_color accent.
 */
import type { ShopSettings } from './types';

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  isDark: boolean;
  // brand
  primary: string;
  primaryDark: string;
  primaryLight: string;
  // surfaces
  pageBg: string;
  cardBg: string;
  footerBg: string;
  // text
  dark: string;
  text: string;
  gray: string;
  muted: string;
  // misc
  light: string;
  border: string;
  white: string;
  orange: string;
  yellow: string;
  red: string;
  blue: string;
  purple: string;
  // tints (soft background + border + text trios)
  tintYellow: { bg: string; border: string; text: string };
  tintBlue: { bg: string; border: string; text: string };
  tintRed: { bg: string; border: string; text: string };
  tintGreen: { bg: string; border: string; text: string };
  tintOrange: { bg: string; border: string; text: string };
  tintPurple: { bg: string; border: string; text: string };
  tintNeutral: { bg: string; border: string; text: string };
  // shared
  cardShadow: { shadowColor: string; shadowOpacity: number; shadowRadius: number; shadowOffset: { width: number; height: number } };
  radius: number;
}

const LIGHT: Theme = {
  mode: 'light',
  isDark: false,
  primary: '#16A34A',
  primaryDark: '#15803D',
  primaryLight: '#E8F5E9',
  pageBg: '#F5F5F5',
  cardBg: '#FFFFFF',
  footerBg: '#1A1A2E',
  dark: '#1E293B',
  text: '#334155',
  gray: '#64748B',
  muted: '#94A3B8',
  light: '#F1F5F9',
  border: '#E2E8F0',
  white: '#FFFFFF',
  orange: '#F59E0B',
  yellow: '#FFCB47',
  red: '#EF4444',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  tintYellow: { bg: '#FFF8E1', border: '#F5D06E', text: '#8A6D1F' },
  tintBlue: { bg: '#EAF3FF', border: '#B9D8FF', text: '#2F6FD0' },
  tintRed: { bg: '#FDECEC', border: '#F5C6C6', text: '#C0392B' },
  tintGreen: { bg: '#E8F5E9', border: '#BFE3C4', text: '#1B8A3A' },
  tintOrange: { bg: '#FFF3E0', border: '#FBD9AC', text: '#B25E0A' },
  tintPurple: { bg: '#F3EDFF', border: '#DECDFF', text: '#6D3FD1' },
  tintNeutral: { bg: '#F1F5F9', border: '#DDE3EC', text: '#64748B' },
  cardShadow: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },
  radius: 16,
};

const DARK: Theme = {
  mode: 'dark',
  isDark: true,
  primary: '#4ADE80',
  primaryDark: '#16A34A',
  primaryLight: '#163828',
  pageBg: '#0F1521',
  cardBg: '#151B26',
  footerBg: '#0A0E16',
  dark: '#F1F5F9',
  text: '#CBD5E1',
  gray: '#94A3B8',
  muted: '#64748B',
  light: '#1A2332',
  border: '#2D3B4E',
  white: '#151B26',
  orange: '#FFB366',
  yellow: '#FFCB47',
  red: '#FF6B6B',
  blue: '#5B9DF6',
  purple: '#A78BFA',
  tintYellow: { bg: '#3A2E10', border: '#6B4A1F', text: '#FFCB47' },
  tintBlue: { bg: '#142A3D', border: '#2F5878', text: '#7CB4FF' },
  tintRed: { bg: '#3A1414', border: '#5A1F1F', text: '#FF8A8A' },
  tintGreen: { bg: '#11241C', border: '#1D3A2C', text: '#2ECC82' },
  tintOrange: { bg: '#2A2110', border: '#5A4A1F', text: '#FDE68A' },
  tintPurple: { bg: '#241B3D', border: '#3B2F63', text: '#A78BFA' },
  tintNeutral: { bg: '#1A2332', border: '#2D3B4E', text: '#94A3B8' },
  cardShadow: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 3 } },
  radius: 16,
};

export const THEMES: Record<ThemeMode, Theme> = { light: LIGHT, dark: DARK };

/** Build final theme with admin theme_color applied to the brand accent */
export function buildTheme(mode: ThemeMode, settings?: ShopSettings): Theme {
  const base = THEMES[mode] || LIGHT;
  const tc = settings?.theme_color;
  if (tc && /^#[0-9a-fA-F]{6}$/.test(tc)) {
    return { ...base, primary: tc, primaryDark: tc };
  }
  return base;
}

/** Splash/brand gradient colors (light + dark aware) */
export function brandGradient(theme: Theme): [string, string] {
  return [theme.primary, theme.primaryDark];
}
