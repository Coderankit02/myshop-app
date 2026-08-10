/**
 * usePush — Expo push notifications setup.
 * Registers the device token and keeps it in AsyncStorage.
 * NOTE: Android production builds need Firebase (google-services.json) —
 * see README → "Push Notifications" section.
 */
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PUSH_TOKEN_KEY } from '@/lib/config';
import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePush() {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<Notifications.PermissionStatus | null>(null);

  const register = useCallback(async (): Promise<string | null> => {
    if (!Device.isDevice) return null;

    // Android channel (required for notifications to show on Android 8+)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    setPermission(status);
    if (status !== 'granted') return null;

    try {
      const expoToken = (await Notifications.getExpoPushTokenAsync()).data;
      setToken(expoToken);
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, expoToken);
      await persistToken(expoToken);
      return expoToken;
    } catch {
      return null;
    }
  }, []);

  // Device token ko Supabase `device_tokens` mein save karo — server-side
  // (admin) Expo Push API se notifications bhej sake. SECURITY DEFINER RPC
  // use karte hain: user_id hamesha auth.uid() hota hai (client tamper nahi
  // kar sakta) aur ON CONFLICT DO UPDATE RLS violation nahi deta jab same
  // device par doosra user login kare (same Expo token → reassign).
  // Fail hone par flow mat todo.
  const persistToken = useCallback(async (token: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      await supabase.rpc('upsert_device_token', {
        p_token: token,
        p_platform: Platform.OS,
      });
    } catch (e) {
      console.warn('[usePush] persistToken:', e);
    }
  }, []);

  useEffect(() => {
    // Load cached token so we don't re-prompt on every launch
    AsyncStorage.getItem(PUSH_TOKEN_KEY).then((t) => {
      if (t) setToken(t);
    });
  }, []);

  return { token, permission, register };
}
