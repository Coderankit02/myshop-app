/**
 * Root layout — fonts, providers (Settings → Theme → Toast → Auth → Cart → Wishlist), stack.
 */
import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { trackPageView } from '@/lib/analytics';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { PriceAlertProvider } from '@/context/PriceAlertContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Providers({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  return (
    <ThemeProvider settings={settings}>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <PriceAlertProvider>{children}</PriceAlertProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

function ThemedNavigator() {
  const { theme } = useTheme();
  const pathname = usePathname();

  // App screen-view analytics (website analytics.js jaisa — admin dashboard
  // visitors/conversion ke liye app traffic bhi count ho)
  useEffect(() => {
    trackPageView(pathname || '/');
  }, [pathname]);

  // Web preview: phone-width frame (Play Store screenshot jaisa look).
  // Android/iOS par koi asar nahi — wahan app full-screen hi rahegi.
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.background = theme.isDark ? '#0B0F17' : '#DDE3E8';
    }
  }, [theme.isDark]);

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      {Platform.OS === 'web' ? (
        <View style={styles.webShell}>
          <View style={[styles.webFrame, { backgroundColor: theme.pageBg, borderColor: theme.isDark ? '#2D3B4E' : '#C9D2DA' }]}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.pageBg },
                animation: 'slide_from_right',
              }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="product/[id]" />
              <Stack.Screen name="checkout" />
              <Stack.Screen name="order/[id]" />
              <Stack.Screen name="auth" />
              <Stack.Screen name="forgot-password" />
              <Stack.Screen name="wishlist" />
              <Stack.Screen name="addresses" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="support" />
              <Stack.Screen name="info" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="rewards" />
            </Stack>
          </View>
        </View>
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.pageBg },
            animation: 'slide_from_right',
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="product/[id]" />
          <Stack.Screen name="checkout" />
          <Stack.Screen name="order/[id]" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="wishlist" />
          <Stack.Screen name="addresses" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="support" />
          <Stack.Screen name="info" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="rewards" />
        </Stack>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // Web preview only: phone ke width ka centered column
  webShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  webFrame: {
    width: '100%',
    maxWidth: 400,
    height: '100%',
    maxHeight: 860,
    borderRadius: 32,
    borderWidth: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SettingsProvider>
      <Providers>
        <ThemedNavigator />
      </Providers>
    </SettingsProvider>
  );
}
