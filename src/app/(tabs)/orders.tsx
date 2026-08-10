/**
 * Orders — order history (login-gated), status badges, tap → order detail.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getOrderDetails, loadOrderHistory, useReorder } from '@/hooks/useOrders';
import { usePush } from '@/hooks/usePush';
import { AppText } from '@/components/AppText';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { inr, timeAgo, paymentMethodLabel } from '@/lib/helpers';
import type { OrderSummary } from '@/lib/types';

export default function OrdersScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { token, register } = usePush();
  const { reorder } = useReorder();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  // Buy Again — site jaisa: delivered order ko fresh prices ke saath cart me daalo
  const handleBuyAgain = async (orderId: string) => {
    setReorderingId(orderId);
    const order = await getOrderDetails(orderId);
    if (order) {
      await reorder(order);
      showToast('Items cart mein add ho gaye! 🛒');
      router.push('/cart');
    } else {
      showToast('Order load nahi hua 🙏');
    }
    setReorderingId(null);
  };

  // 🔔 Notifications on karein (site ke Orders page jaisa button)
  const enableNotifications = async () => {
    const t = await register();
    if (t) showToast('Notifications on! 🔔 Order updates milenge');
    else showToast('Notification permission nahi mili 🙏');
  };

  const load = useCallback(async (silent = false) => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    const list = await loadOrderHistory(user.id, 30);
    setOrders(list);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!user) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
        <View style={styles.titleRow}>
          <AppText variant="title">📦 My Orders</AppText>
        </View>
        <EmptyState
          icon="🔐"
          title="Orders dekhne ke liye login karein"
          sub="Login karke apne saare orders, status aur history dekhein"
          cta="Login Karein →"
          onCta={() => router.push('/auth')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <View style={styles.titleRow}>
        <AppText variant="title" style={{ flex: 1 }}>
          📦 My Orders{' '}
          <AppText variant="bodyMedium" color={theme.gray}>
            ({orders.length})
          </AppText>
        </AppText>
        <Pressable
          onPress={enableNotifications}
          style={[styles.notifBtn, { backgroundColor: token ? theme.primaryLight : theme.cardBg, borderColor: theme.border }]}>
          <AppText variant="captionBold" color={token ? theme.primaryDark : theme.dark}>
            {token ? '🔔 On' : '🔕 Notifications On Karein'}
          </AppText>
        </Pressable>
      </View>

      {loading ? (
        <AppText variant="body" color={theme.gray} center style={{ padding: 40 }}>
          Orders load ho rahe hain…
        </AppText>
      ) : orders.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="Abhi koi order nahi"
          sub="Pehla order karo — delivery 1-2 ghante mein!"
          cta="Shop Karein →"
          onCta={() => router.push('/shop')}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(true); setRefreshing(false); }} tintColor={theme.primary} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/order/[id]', params: { id: item.id } })}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyBold">#{item.order_number}</AppText>
                  <AppText variant="caption" color={theme.gray}>
                    {timeAgo(item.created_at)}
                  </AppText>
                </View>
                <StatusBadge status={item.status} />
              </View>
              <View style={[styles.cardBottom, { borderTopColor: theme.border }]}>
                <View>
                  <AppText variant="caption" color={theme.gray}>
                    {paymentMethodLabel(item.payment_method)} • {item.payment_method === 'cod' ? 'COD 💵' : item.payment_status === 'paid' ? 'Paid ✅' : 'Pending'}
                  </AppText>
                  <AppText variant="price" style={{ marginTop: 2 }}>
                    {inr(item.final_amount)}
                  </AppText>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  {item.status === 'delivered' && (
                    <Pressable
                      onPress={() => handleBuyAgain(item.id)}
                      disabled={reorderingId === item.id}
                      style={[styles.buyAgain, { backgroundColor: theme.primary }]}>
                      <AppText variant="captionBold" color="#fff">
                        {reorderingId === item.id ? 'Adding…' : '🔁 Buy Again'}
                      </AppText>
                    </Pressable>
                  )}
                  <AppText variant="captionBold" color={theme.primary}>
                    View →
                  </AppText>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  titleRow: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifBtn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  buyAgain: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
});
