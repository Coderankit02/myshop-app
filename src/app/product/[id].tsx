/**
 * Product Detail — gallery, multi-unit chips, qty stepper, wishlist,
 * related products. Port of the website's ProductDetail.jsx.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { usePriceAlerts } from '@/context/PriceAlertContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useProducts } from '@/hooks/useData';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionRail } from '@/components/SectionRail';
import { inr, calcDiscount } from '@/lib/helpers';
import type { Product, ProductUnit } from '@/lib/types';

const SCREEN_W = Dimensions.get('window').width;

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { addToCart, updateQty, cart } = useCart();
  const { isWished, toggleWishlist } = useWishlist();
  const { isAlerted, toggleAlert } = usePriceAlerts();
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selUnit, setSelUnit] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('products')
        .select('*,categories(id,name,slug),product_images(id,image_url,is_default,sort_order)')
        .eq('id', id)
        .maybeSingle();
      if (active && data) {
        const imgs = (data.product_images || []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order);
        setProduct({
          ...data,
          discount: calcDiscount(data.selling_price, data.original_price),
          images: imgs,
          primary_image: (imgs.find((i: any) => i.is_default) || imgs[0])?.image_url || null,
        });
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  // Related products (same category) — hook must stay above early returns
  const { products: related } = useProducts({ categoryId: product?.category_id || null, pageSize: 10 });

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.pageBg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.pageBg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <AppText style={{ fontSize: 40 }}>😕</AppText>
        <AppText variant="heading" center style={{ marginTop: 10 }}>
          Product nahi mila
        </AppText>
        <PrimaryButton title="Back to Shop" onPress={() => router.back()} style={{ marginTop: 16, alignSelf: 'center', minWidth: 180 }} />
      </SafeAreaView>
    );
  }

  // ── Derived values (product is non-null here) ──
  const units: ProductUnit[] | null = product.units && Array.isArray(product.units) && product.units.length ? product.units : null;
  const sel = units && units[selUnit] ? units[selUnit] : null;
  const displayPrice = sel ? sel.price : product.selling_price;
  const displayMrp = sel ? sel.mrp : product.original_price;
  const displayUnit = sel ? sel.label : product.unit_value;
  const displayStock = sel ? (typeof sel.stock === 'number' ? sel.stock : product.stock_quantity) : product.stock_quantity;
  const lineKey = sel ? `${product.id}::${sel.label}` : product.id;
  const inC = cart.find((i) => (i.k || i.id) === lineKey);
  const oos = displayStock != null && displayStock <= 0;
  const atMax = inC && typeof displayStock === 'number' && inC.qty >= displayStock;

  const addPayload = sel
    ? {
        id: product.id,
        name: product.name,
        unit: sel.label,
        variant: sel.label,
        price: sel.price,
        old: sel.mrp ?? product.original_price,
        e: '',
        image: product.primary_image,
      }
    : { id: product.id, name: product.name, unit: product.unit_value, price: product.selling_price, old: product.original_price, image: product.primary_image };

  const onWishlist = async () => {
    if (!user) {
      showToast('Wishlist ke liye login karein 🔐');
      router.push('/auth');
      return;
    }
    await toggleWishlist(product.id);
    showToast(isWished(product.id) ? 'Wishlist se hata diya' : 'Wishlist mein add ho gaya ❤️');
  };

  // 🔔 Price alert (price_alerts table — same as website) — visible even OOS
  const alerted = isAlerted(product.id);
  const onAlert = async () => {
    if (!user) {
      showToast('Price alert ke liye login karein 🔐');
      router.push('/auth');
      return;
    }
    const r = await toggleAlert(product.id);
    if (r === 'on') showToast('Price drop / back-in-stock par notify karenge 🔔');
    else if (r === 'off') showToast('Price alert band — hata diya 🔕');
    else if (r === 'none' && user) showToast('Alert update nahi hua — dobara try karein');
  };

  const images = (product.images || []).filter(Boolean);
  const galleryImages = images.length ? images.map((i) => i.image_url) : [product.primary_image].filter(Boolean);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
      {/* Top bar */}
      <View style={[styles.topBar, { backgroundColor: theme.cardBg }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={[styles.roundBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <AppText variant="bodyBold" style={{ fontSize: 16 }}>
            ‹
          </AppText>
        </Pressable>
        <AppText variant="bodyBold" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
          {product.name}
        </AppText>
        <Pressable onPress={onWishlist} hitSlop={10} style={[styles.roundBtn, { backgroundColor: isWished(product.id) ? theme.tintRed.bg : theme.cardBg, borderColor: theme.border }]}>
          <AppText style={{ fontSize: 15 }}>{isWished(product.id) ? '❤️' : '🤍'}</AppText>
        </Pressable>
      </View>

      <FlatList
        data={[{ key: 'main' }, { key: 'related' }]}
        keyExtractor={(i) => i.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        renderItem={({ item }) => {
          if (item.key === 'related') {
            return related.length ? (
              <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
                <SectionRail title="Related Products" products={related} onProductPress={(p) => router.push({ pathname: '/product/[id]', params: { id: p.id } })} />
              </View>
            ) : null;
          }
          return (
            <View>
              {/* Gallery */}
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ height: 300, width: SCREEN_W }}>
                {galleryImages.length
                  ? galleryImages.map((uri, i) => (
                      <View key={i} style={[styles.galleryPage, { width: SCREEN_W, backgroundColor: theme.light }]}>
                        {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : <AppText style={{ fontSize: 40 }}>🛒</AppText>}
                      </View>
                    ))
                  : null}
              </ScrollView>

              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {product.discount != null && !oos && (
                    <View style={[styles.discBadge, { backgroundColor: theme.red }]}>
                      <AppText variant="captionBold" color="#fff">
                        {product.discount}% OFF
                      </AppText>
                    </View>
                  )}
                  {product.categories?.name ? (
                    <View style={[styles.catChip, { backgroundColor: theme.primaryLight }]}>
                      <AppText variant="caption" color={theme.primaryDark}>
                        {product.categories.name}
                      </AppText>
                    </View>
                  ) : null}
                </View>

                <AppText variant="title" style={{ marginTop: 10 }}>
                  {product.name}
                </AppText>

                {/* Units */}
                {units && units.length > 0 && (
                  <View style={styles.unitRow}>
                    {units.map((u, i) => {
                      const active = selUnit === i;
                      return (
                        <Pressable
                          key={i}
                          onPress={() => setSelUnit(i)}
                          style={[
                            styles.unitChip,
                            {
                              borderColor: active ? theme.primary : theme.border,
                              backgroundColor: active ? theme.primaryLight : theme.cardBg,
                            },
                          ]}>
                          <AppText variant="captionBold" color={active ? theme.primaryDark : theme.dark}>
                            {u.label}
                          </AppText>
                          <AppText variant="tiny" color={theme.gray}>
                            {inr(u.price)}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {/* Price */}
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
                  <AppText variant="title" style={{ fontSize: 24 }}>
                    {inr(displayPrice)}
                  </AppText>
                  {displayMrp ? (
                    <AppText variant="body" color={theme.gray} style={{ textDecorationLine: 'line-through' }}>
                      {inr(displayMrp)}
                    </AppText>
                  ) : null}
                  <AppText variant="caption" color={theme.gray}>
                    {displayUnit}
                  </AppText>
                </View>

                {/* 🔔 Price alert toggle (site ki tarah — OOS par bhi dikhta hai) */}
                <Pressable
                  onPress={onAlert}
                  style={[
                    styles.alertBtn,
                    alerted
                      ? { backgroundColor: theme.tintYellow.bg, borderColor: theme.tintYellow.border }
                      : { backgroundColor: theme.light, borderColor: theme.border },
                  ]}>
                  <AppText variant="captionBold" color={alerted ? theme.tintYellow.text : theme.gray}>
                    {alerted ? '🔔 Price alert ON — tap to hatao' : '🔔 Price drop par alert pao'}
                  </AppText>
                </Pressable>

                {oos ? (
                  <View style={[styles.oosBox, { backgroundColor: theme.tintRed.bg, borderColor: theme.tintRed.border }]}>
                    <AppText variant="bodyBold" color={theme.tintRed.text}>
                      ❌ Out of Stock
                    </AppText>
                  </View>
                ) : (
                  <PrimaryButton
                    title={
                      inC
                        ? `In Cart • ${inC.qty} ${displayUnit || ''}`
                        : `Add to Cart • ${inr(displayPrice)}`
                    }
                    icon="🛒"
                    onPress={() => {
                      if (inC) {
                        if (!atMax) updateQty(product.id, 1, displayStock, lineKey);
                      } else {
                        addToCart(addPayload as any);
                        showToast('Cart mein add ho gaya 🛒');
                      }
                    }}
                    disabled={atMax}
                    style={{ marginTop: 16 }}
                  />
                )}
                {atMax && (
                  <AppText variant="caption" color={theme.red} center style={{ marginTop: 8 }}>
                    Sirf {displayStock} stock mein hai
                  </AppText>
                )}

                {/* Description */}
                {product.description ? (
                  <View style={[styles.descCard, { backgroundColor: theme.cardBg, borderColor: theme.border, marginTop: 18 }]}>
                    <AppText variant="heading" style={{ marginBottom: 6 }}>
                      📋 Description
                    </AppText>
                    <AppText variant="body" color={theme.text} style={{ lineHeight: 21 }}>
                      {product.description}
                    </AppText>
                  </View>
                ) : null}
              </View>
            </View>
          );
        }}
      />

      {/* Sticky bottom bar */}
      {!oos && (
        <View style={[styles.bottomBar, { backgroundColor: theme.cardBg, borderTopColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" color={theme.gray}>
              {displayUnit}
            </AppText>
            <AppText variant="price">{inr(displayPrice)}</AppText>
          </View>
          {inC ? (
            <View style={[styles.stepper, { backgroundColor: theme.primaryLight }]}>
              <Pressable hitSlop={6} onPress={() => updateQty(product.id, -1, displayStock, lineKey)} style={styles.stepBtn}>
                <AppText variant="bodyBold" color={theme.primaryDark} style={{ fontSize: 17 }}>
                  −
                </AppText>
              </Pressable>
              <AppText variant="bodyBold" color={theme.primaryDark} style={{ minWidth: 20, textAlign: 'center' }}>
                {inC.qty}
              </AppText>
              <Pressable hitSlop={6} disabled={atMax} onPress={() => !atMax && updateQty(product.id, 1, displayStock, lineKey)} style={[styles.stepBtn, atMax && { opacity: 0.35 }]}>
                <AppText variant="bodyBold" color={theme.primaryDark} style={{ fontSize: 17 }}>
                  +
                </AppText>
              </Pressable>
            </View>
          ) : (
            <PrimaryButton title="Add to Cart" icon="🛒" onPress={() => addToCart(addPayload as any)} style={{ paddingHorizontal: 24 }} />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  roundBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryPage: { height: 300, alignItems: 'center', justifyContent: 'center' },
  discBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  catChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  alertBtn: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  unitChip: { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 70 },
  oosBox: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 16, alignItems: 'center' },
  descCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 22,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 5 },
  stepBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
