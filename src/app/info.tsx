/**
 * info.tsx — About Us / Privacy Policy / Terms & Conditions / Delivery & Shipping.
 * Port of the website's InfoPage (App.jsx) — content comes LIVE from
 * shop_settings (id=1), exactly like the site footer links.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { AppText } from '@/components/AppText';
import { HeaderBar } from '@/components/HeaderBar';
import type { ShopSettings } from '@/lib/types';

const PAGES: Record<string, { title: string; key: keyof ShopSettings; emoji: string }> = {
  about: { title: 'About Us', key: 'about_text', emoji: '🏪' },
  privacy: { title: 'Privacy Policy', key: 'privacy_policy', emoji: '🔒' },
  terms: { title: 'Terms & Conditions', key: 'terms_text', emoji: '📜' },
  shipping: { title: 'Delivery & Shipping', key: 'shipping_rules', emoji: '🚚' },
};

export default function InfoScreen() {
  const { page } = useLocalSearchParams<{ page: string }>();
  const { theme } = useTheme();
  const { settings } = useSettings();

  const meta = PAGES[page || ''] || PAGES.about;
  const body = (settings[meta.key] as string) || '';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <HeaderBar title={`${meta.emoji} ${meta.title}`} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {body ? (
          <View style={{ backgroundColor: theme.cardBg, borderColor: theme.border, borderRadius: 18, borderWidth: 1, padding: 16 }}>
            <AppText variant="body" color={theme.text} style={{ lineHeight: 22 }}>
              {body}
            </AppText>
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <AppText style={{ fontSize: 44 }}>{meta.emoji}</AppText>
            <AppText variant="heading" center style={{ marginTop: 12 }}>
              {meta.title}
            </AppText>
            <AppText variant="caption" color={theme.gray} center style={{ marginTop: 6, maxWidth: 280 }}>
              Ye page abhi update ho raha hai — thodi der baad dekhein.
            </AppText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
