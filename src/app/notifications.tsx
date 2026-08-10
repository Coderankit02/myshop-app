/**
 * notifications.tsx — Alerts (site ka NotificationsTab).
 * notifications table: user_id, title, message, type, is_read, created_at.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AppText } from '@/components/AppText';
import { HeaderBar } from '@/components/HeaderBar';
import { EmptyState } from '@/components/EmptyState';
import { timeAgo } from '@/lib/helpers';
import type { Theme } from '@/lib/theme';

interface AppNotification {
  id: string;
  title?: string | null;
  message?: string | null;
  type?: string | null;
  is_read?: boolean;
  created_at: string;
}

const NOTIF_COLOR: Record<string, keyof Theme> = {
  offer: 'tintOrange',
  order: 'tintBlue',
  delivery: 'tintPurple',
  stock: 'tintGreen',
  system: 'tintNeutral',
};
const NOTIF_ICON: Record<string, string> = {
  offer: '🎁',
  order: '📦',
  delivery: '🚴',
  stock: '📢',
  system: 'ℹ️',
};

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setItems((data || []) as AppNotification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (n: AppNotification) => {
    if (n.is_read) return;
    await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
  };

  const markAll = async () => {
    if (!user) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    if (error) {
      showToast('Update nahi hua — dobara try karein');
      return;
    }
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    showToast('Sab notifications read mark ho gaye ✅');
  };

  const unread = items.filter((n) => !n.is_read).length;

  if (!user) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
        <HeaderBar title="Notifications 🔔" />
        <EmptyState icon="🔐" title="Alerts ke liye login karein" sub="Offers aur order updates yahan dikhenge" cta="Login Karein →" onCta={() => router.push('/auth')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <HeaderBar
        title={`Notifications${unread > 0 ? ` (${unread})` : ''} 🔔`}
        right={
          unread > 0 ? (
            <Pressable onPress={markAll} style={[styles.markAll, { backgroundColor: theme.primaryLight }]}>
              <AppText variant="captionBold" color={theme.primaryDark}>
                Mark All ✓
              </AppText>
            </Pressable>
          ) : undefined
        }
      />
      {loading ? (
        <AppText variant="body" color={theme.gray} center style={{ padding: 40 }}>
          Load ho raha hai…
        </AppText>
      ) : items.length === 0 ? (
        <EmptyState icon="🔔" title="Koi notification nahi" sub="Offers aur order updates yahan dikhenge" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => {
            const tintKey: keyof Theme = NOTIF_COLOR[item.type || ''] || 'tintNeutral';
            const tint = theme[tintKey] as { bg: string; border: string; text: string };
            return (
              <Pressable
                onPress={() => markRead(item)}
                style={[
                  styles.row,
                  { backgroundColor: item.is_read ? theme.cardBg : theme.primaryLight, borderColor: theme.border },
                ]}>
                <View style={[styles.iconBox, { backgroundColor: tint.bg }]}>
                  <AppText style={{ fontSize: 17 }}>{NOTIF_ICON[item.type || ''] || '🔔'}</AppText>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText variant="bodyBold" numberOfLines={1}>
                    {item.title || 'Notification'}
                  </AppText>
                  <AppText variant="caption" color={theme.gray} style={{ marginTop: 2, lineHeight: 17 }}>
                    {item.message || ''}
                  </AppText>
                  <AppText variant="tiny" color={theme.muted} style={{ marginTop: 3 }}>
                    {timeAgo(item.created_at)}
                  </AppText>
                </View>
                <View style={[styles.dot, { backgroundColor: item.is_read ? theme.border : theme.primary }]} />
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  markAll: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    marginBottom: 10,
  },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
