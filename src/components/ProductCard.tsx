/**
 * ProductCard — port of the website's PCard.jsx.
 * Multi-unit variants, discount badge, out-of-stock overlay, wishlist heart,
 * ADD / quantity stepper.
 */
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { AppText } from './AppText';
import { inr } from '@/lib/helpers';
import type { Product } from '@/lib/types';

interface ProductCardProps {
  p: Product;
  onPress?: (p: Product) => void;
  onWishlistPress?: () => void; // when null, heart is hidden
}

export function ProductCard({ p, onPress, onWishlistPress }: ProductCardProps) {
  const { theme } = useTheme();
  const { cart, addToCart, updateQty } = useCart();
  const { isWished } = useWishlist();
  const { user } = useAuth();

  const units = p.units && Array.isArray(p.units) && p.units.length > 1 ? p.units : null;
  const first = units ? units[0] : null;
  const lineKey = first ? `${p.id}::${first.label}` : p.id;
  const inC = cart.find((i) => (i.k || i.id) === lineKey);
  const displayPrice = first ? first.price : p.selling_price;
  const displayUnit = first ? first.label : p.unit_value;
  const displayMrp = first ? first.mrp : p.original_price;
  const displayStock = first ? (typeof first.stock === 'number' ? first.stock : p.stock_quantity) : p.stock_quantity;
  const disc = p.discount;
  const oos = displayStock != null && displayStock <= 0;
  const atMax = inC && typeof displayStock === 'number' && inC.qty >= displayStock;
  const wished = isWished(p.id);

  const addPayload = first
    ? {
        id: p.id,
        name: p.name,
        _variant: first.label,
        unit: first.label,
        price: first.price,
        old: first.mrp ?? p.original_price,
        variant: first.label,
        selling_price: first.price,
        unit_value: first.label,
        image: p.primary_image,
      }
    : { id: p.id, name: p.name, unit: p.unit_value, price: p.selling_price, old: p.original_price, image: p.primary_image };

  return (
    <Pressable
      onPress={() => onPress?.(p)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.cardBg,
          shadowColor: theme.cardShadow.shadowColor,
          shadowOpacity: theme.cardShadow.shadowOpacity,
          shadowRadius: theme.cardShadow.shadowRadius,
          shadowOffset: theme.cardShadow.shadowOffset,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}>
      {/* Image */}
      <View style={[styles.imgWrap, { backgroundColor: theme.light }]}>
        {p.primary_image ? (
          <Image source={{ uri: p.primary_image }} style={styles.img} resizeMode="cover" />
        ) : (
          <View style={[styles.img, styles.imgFallback, { backgroundColor: theme.primaryLight }]}>
            <AppText style={{ fontSize: 26 }}>🛒</AppText>
          </View>
        )}
        {disc != null && !oos && (
          <View style={[styles.badge, { backgroundColor: theme.red }]}>
            <AppText variant="tiny" color="#fff" style={styles.badgeText}>
              {disc}% OFF
            </AppText>
          </View>
        )}
        {oos && (
          <View style={styles.oosOverlay}>
            <AppText variant="captionBold" color="#fff">
              Out of Stock
            </AppText>
          </View>
        )}
        {onWishlistPress && user && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onWishlistPress();
            }}
            hitSlop={8}
            style={[styles.heart, { backgroundColor: wished ? theme.tintRed.bg : theme.cardBg, borderColor: wished ? theme.tintRed.border : theme.border }]}>
            <AppText style={{ fontSize: 14 }}>{wished ? '❤️' : '🤍'}</AppText>
          </Pressable>
        )}
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Fixed 2-line box → 1-line aur 2-line naam dono me card ki lambai same */}
        <AppText variant="bodyBold" numberOfLines={2} style={styles.name}>
          {p.name}
        </AppText>
        <View style={styles.unitRow}>
          {displayUnit ? (
            <AppText variant="caption" color={theme.gray}>
              {displayUnit}
            </AppText>
          ) : null}
          {units && (
            <View style={[styles.sizesChip, { backgroundColor: theme.primaryLight }]}>
              <AppText variant="tiny" color={theme.primaryDark} style={{ fontWeight: '700' }}>
                {units.length} sizes
              </AppText>
            </View>
          )}
        </View>

        <View style={styles.priceRow}>
          <View>
            {displayMrp ? (
              <AppText variant="caption" color={theme.gray} style={styles.mrp}>
                {inr(displayMrp)}
              </AppText>
            ) : null}
            <AppText variant="price" color={theme.dark}>
              {inr(displayPrice)}
            </AppText>
          </View>

          {!oos && !inC && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                addToCart(addPayload as any);
              }}
              style={[styles.addBtn, { backgroundColor: theme.primary }]}>
              <AppText variant="tiny" color="#fff" style={{ fontWeight: '800' }}>
                ADD
              </AppText>
            </Pressable>
          )}
          {!oos && inC && (
            <View style={[styles.stepper, { backgroundColor: theme.primaryLight }]}>
              <Pressable hitSlop={6} onPress={() => updateQty(p.id, -1, displayStock, lineKey)} style={styles.stepBtn}>
                <AppText variant="bodyBold" color={theme.primaryDark}>
                  −
                </AppText>
              </Pressable>
              <AppText variant="bodyBold" color={theme.primaryDark} style={styles.qtyText}>
                {inC.qty}
              </AppText>
              <Pressable
                hitSlop={6}
                disabled={atMax}
                onPress={() => !atMax && updateQty(p.id, 1, displayStock, lineKey)}
                style={[styles.stepBtn, atMax && { opacity: 0.35 }]}>
                <AppText variant="bodyBold" color={theme.primaryDark}>
                  +
                </AppText>
              </Pressable>
            </View>
          )}
        </View>
        {atMax && (
          <AppText variant="tiny" color={theme.red} style={styles.stockNote}>
            Sirf {displayStock} stock mein hai
          </AppText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, overflow: 'hidden', elevation: 2, flexGrow: 1 },
  imgWrap: { position: 'relative', aspectRatio: 1 },
  img: { width: '100%', height: '100%' },
  imgFallback: { alignItems: 'center', justifyContent: 'center' },
  name: { height: 38, lineHeight: 19 },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 2,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeText: { fontWeight: '700' },
  oosOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  body: { flex: 1, padding: 10 },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  sizesChip: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 },
  mrp: { textDecorationLine: 'line-through' },
  addBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 3 },
  stepBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  qtyText: { width: 16, textAlign: 'center' },
  stockNote: { marginTop: 4 },
});
