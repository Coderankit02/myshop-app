/**
 * Order Detail — live status (realtime), items, address, bill, reorder,
 * open-in-maps. Port of the website's order detail experience.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useCart } from '@/context/CartContext';
import { getOrderDetails, subscribeToOrder, useReorder } from '@/hooks/useOrders';
import { AppText } from '@/components/AppText';
import { StatusBadge } from '@/components/StatusBadge';
import { HeaderBar } from '@/components/HeaderBar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { EmptyState } from '@/components/EmptyState';
import { inr, paymentMethodLabel, timeAgo } from '@/lib/helpers';
import type { Order } from '@/lib/types';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { count } = useCart();
  const { reorder } = useReorder();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const o = await getOrderDetails(id);
      if (active) {
        setOrder(o);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  // Live status updates from admin
  useEffect(() => {
    if (!order) return;
    return subscribeToOrder(order.id, (fresh) => setOrder(fresh));
  }, [order?.id]);

  const handleReorder = async () => {
    if (!order) return;
    setReordering(true);
    await reorder(order);
    setReordering(false);
    showToast(`Cart mein add ho gaya (${count}) 🛒`);
    router.push('/cart');
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.pageBg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
        <HeaderBar title="Order" />
        <EmptyState icon="🧾" title="Order nahi mila" cta="Back" onCta={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <HeaderBar title={`Order #${order.order_number}`} subtitle={timeAgo(order.created_at)} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Status */}
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <StatusBadge status={order.status} />
              <AppText variant="caption" color={theme.gray} style={{ marginTop: 6 }}>
                {paymentMethodLabel(order.payment_method)} • {order.payment_status === 'paid' ? 'Paid ✅' : order.payment_status === 'cod' ? 'Cash on Delivery' : 'Payment Pending'}
              </AppText>
            </View>
            <AppText variant="title">{inr(order.final_amount)}</AppText>
          </View>

          {/* Order timeline (site ke OrdersTab modal jaisa) */}
          <View style={[styles.timeline, { borderTopColor: theme.border }]}>
            {timelineSteps(order).map((step, i) => {
              const cls = step.state;
              const dotStyle =
                cls === 'done'
                  ? { background: theme.primaryLight, borderColor: theme.primary }
                  : cls === 'active'
                  ? { background: theme.primary, borderColor: theme.primary }
                  : { background: theme.light, borderColor: theme.border };
              return (
                <View key={i} style={styles.tlRow}>
                  <View style={[styles.tlDot, dotStyle]}>
                    <AppText style={{ fontSize: 12 }}>{step.icon}</AppText>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <AppText variant="bodyBold" style={cls === 'waiting' ? { color: theme.muted } : undefined}>
                      {step.label}
                    </AppText>
                    <AppText variant="tiny" color={theme.muted}>
                      {cls === 'waiting' ? 'Awaited' : step.sub}
                    </AppText>
                  </View>
                  {cls === 'active' && <View style={[styles.liveDot, { backgroundColor: theme.primary }]} />}
                </View>
              );
            })}
          </View>
        </View>

        {/* Items */}
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <AppText variant="heading" style={{ marginBottom: 8 }}>
            🧺 Items ({order.items?.length || 0})
          </AppText>
          {(order.items || []).map((it) => (
            <View key={it.id} style={styles.itemRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={[styles.itemIcon, { backgroundColor: theme.light }]}>
                  <AppText style={{ fontSize: 16 }}>{it.emoji || '🛒'}</AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" numberOfLines={1}>
                    {it.name}
                  </AppText>
                  <AppText variant="tiny" color={theme.gray}>
                    {it.unit} × {it.qty}
                  </AppText>
                </View>
              </View>
              <AppText variant="bodyBold">{inr(it.line_total)}</AppText>
            </View>
          ))}
          <View style={[styles.divider, { borderTopColor: theme.border }]} />
          <BillRow label="Subtotal" value={inr(order.subtotal)} theme={theme} />
          {order.discount > 0 && <BillRow label="Discount" value={`−${inr(order.discount)}`} color={theme.primary} theme={theme} />}
          {order.delivery_charge > 0 && <BillRow label="Delivery" value={inr(order.delivery_charge)} theme={theme} />}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <AppText variant="heading">Total</AppText>
            <AppText variant="heading" style={{ color: theme.primary }}>
              {inr(order.final_amount)}
            </AppText>
          </View>
        </View>

        {/* Delivery address */}
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <AppText variant="heading" style={{ marginBottom: 6 }}>
            📍 Delivery Address
          </AppText>
          <AppText variant="body" color={theme.text}>
            {order.delivery_name}
            {'\n'}
            {order.delivery_line1}
            {order.delivery_line2 ? `, ${order.delivery_line2}` : ''}
            {'\n'}
            {order.delivery_city}
            {order.delivery_pincode ? ` - ${order.delivery_pincode}` : ''}
          </AppText>
          <AppText variant="caption" color={theme.gray} style={{ marginTop: 4 }}>
            📱 {order.delivery_phone}
          </AppText>
          {order.latitude != null && order.longitude != null && (
            <Pressable
              onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`)}
              style={[styles.mapsBtn, { backgroundColor: theme.primaryLight }]}>
              <AppText variant="captionBold" color={theme.primaryDark}>
                🗺️ Open in Maps
              </AppText>
            </Pressable>
          )}
        </View>

        {/* Reorder */}
        <PrimaryButton title={reordering ? 'Adding…' : '🔁 Reorder / Buy Again'} loading={reordering} onPress={handleReorder} style={{ marginTop: 4 }} />
        <Pressable onPress={() => router.push('/shop')} style={{ paddingVertical: 12, alignItems: 'center' }}>
          <AppText variant="captionBold" color={theme.primary}>
            ← Aur shopping karein
          </AppText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Timeline steps — website ke OrdersTab jaisa (Order Placed → Delivered) */
function timelineSteps(order: Order): { icon: string; label: string; sub: string; state: 'done' | 'active' | 'waiting' }[] {
  const fmt = (d?: string | null) =>
    d
      ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '—';
  const steps = [
    { icon: '✅', label: 'Order Placed', sub: fmt(order.created_at) },
    { icon: '🏪', label: 'Confirmed', sub: 'Store ne accept kiya' },
    { icon: '🚴', label: 'Out for Delivery', sub: 'Delivery boy on the way' },
    { icon: '🎉', label: 'Delivered', sub: 'Order deliver ho gaya' },
  ];
  // 'packed' bhi timeline me dikhe — confirmed ke baad ka step (admin flow)
  const statuses = ['pending', 'confirmed', 'packed', 'out_for_delivery', 'delivered'];
  const curIdx = statuses.indexOf(order.status);
  if (order.status === 'cancelled' || order.status === 'returned') {
    return steps.map((s) => ({ ...s, state: 'waiting' as const }));
  }
  return steps.map((s, i) => ({
    ...s,
    state: (i < curIdx ? 'done' : i === curIdx ? 'active' : 'waiting') as 'done' | 'active' | 'waiting',
  }));
}

function BillRow({ label, value, theme, color }: { label: string; value: string; theme: any; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 }}>
      <AppText variant="body" color={theme.gray}>
        {label}
      </AppText>
      <AppText variant="bodyBold" style={color ? { color } : undefined}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 },
  itemIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, marginVertical: 8 },
  mapsBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  timeline: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 12 },
  tlRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  tlDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  liveDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
});
