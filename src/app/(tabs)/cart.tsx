/**
 * Cart — cart items, quantity steppers, bill summary, checkout CTA.
 */
import React from 'react';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useCart } from '@/context/CartContext';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { EmptyState } from '@/components/EmptyState';
import { inr } from '@/lib/helpers';

export default function CartScreen() {
  const { theme } = useTheme();
  const { cart, total, updateQty, removeFromCart } = useCart();
  const router = useRouter();

  if (!cart.length) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
        <View style={styles.titleRow}>
          <AppText variant="title">🛒 My Cart</AppText>
        </View>
        <EmptyState
          icon="🛒"
          title="Cart khali hai"
          sub="Products par ADD dabao — cart yahan aayega"
          cta="Browse Products →"
          onCta={() => router.push('/shop')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <View style={[styles.titleRow, { backgroundColor: theme.pageBg }]}>
        <AppText variant="title">
          🛒 My Cart <AppText variant="bodyMedium" color={theme.gray}>({cart.length} items)</AppText>
        </AppText>
      </View>

      <FlatList
        data={cart}
        keyExtractor={(i) => i.k || String(i.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
        renderItem={({ item }) => (
          <View style={[styles.item, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={[styles.itemImg, { backgroundColor: theme.light }]}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <AppText style={{ fontSize: 22 }}>{item.e || '🛒'}</AppText>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyBold" numberOfLines={2}>
                {item.name}
              </AppText>
              <AppText variant="caption" color={theme.gray}>
                {item.unit || item.variant}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                <AppText variant="price">{inr(item.price * item.qty)}</AppText>
                <View style={[styles.stepper, { backgroundColor: theme.primaryLight }]}>
                  <Pressable hitSlop={6} onPress={() => updateQty(item.id, -1, undefined, item.k)} style={styles.stepBtn}>
                    <AppText variant="bodyBold" color={theme.primaryDark}>
                      −
                    </AppText>
                  </Pressable>
                  <AppText variant="bodyBold" color={theme.primaryDark} style={{ minWidth: 18, textAlign: 'center' }}>
                    {item.qty}
                  </AppText>
                  <Pressable hitSlop={6} onPress={() => updateQty(item.id, 1, undefined, item.k)} style={styles.stepBtn}>
                    <AppText variant="bodyBold" color={theme.primaryDark}>
                      +
                    </AppText>
                  </Pressable>
                </View>
              </View>
            </View>
            <Pressable onPress={() => removeFromCart(item.id, item.k)} hitSlop={8} style={styles.removeBtn}>
              <AppText variant="caption" color={theme.gray}>
                ✕
              </AppText>
            </Pressable>
          </View>
        )}
      />

      {/* Bill summary + checkout */}
      <View style={[styles.billBar, { backgroundColor: theme.cardBg, borderTopColor: theme.border }]}>
        <View style={styles.billRow}>
          <AppText variant="body" color={theme.gray}>
            Subtotal ({cart.reduce((s, i) => s + i.qty, 0)} items)
          </AppText>
          <AppText variant="bodyBold">{inr(total)}</AppText>
        </View>
        <View style={styles.billRow}>
          <AppText variant="caption" color={theme.gray}>
            Delivery + coupon checkout par
          </AppText>
          <AppText variant="caption" color={theme.gray}>
            🚚
          </AppText>
        </View>
        <PrimaryButton
          title={`Proceed to Checkout • ${inr(total)} →`}
          onPress={() => router.push('/checkout')}
          style={{ marginTop: 10 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  titleRow: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  item: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  itemImg: { width: 64, height: 64, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 3 },
  stepBtn: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  removeBtn: { position: 'absolute', top: 10, right: 10 },
  billBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
});
