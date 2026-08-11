/**
 * Product Detail — gallery, multi-unit chips, qty stepper, wishlist,
 * related products. Port of the website's ProductDetail.jsx.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
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

  // ── Reviews ──
  const [reviews, setReviews] = useState<any[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = async (productId: string) => {
    const { data } = await supabase
      .from('reviews')
      .select('customer_name,rating,comment,admin_reply,created_at')
      .eq('product_id', productId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(20);
    setReviews(data || []);
  };

  useEffect(() => {
    if (id) loadReviews(id);
  }, [id]);

  const submitReview = async () => {
    if (!user) {
      showToast('Review dene ke liye login karein 🔐');
      router.push('/auth');
      return;
    }
    const text = comment.trim();
    if (text.length < 3) {
      showToast('Thoda aur likhein — kam se kam 3 letters 🙏');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('reviews').insert({
      product_id: product?.id,
      user_id: user.id,
      customer_name: user.name || 'Customer',
      rating,
      comment: text,
      status: 'pending',
    });
    setSubmitting(false);
    if (error) {
      showToast('Review submit nahi hua — dobara try karein');
      return;
    }
    setComment('');
    showToast('Shukriya! Review admin approval ke baad dikhega ⭐');
    // approved hone par turant dikhe — abhi thodi der me refresh
    setTimeout(() => {
      if (id) loadReviews(id);
    }, 2500);
  };

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
        data={[{ key: 'main' }, { key: 'related' }, { key: 'reviews' }]}
        keyExtractor={(i) => i.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        renderItem={({ item }) => {
          if (item.key === 'reviews') {
            return <ProductReviews product={product} reviews={reviews} user={user} rating={rating} setRating={setRating} comment={comment} setComment={setComment} submitting={submitting} onSubmit={submitReview} onLogin={() => router.push('/auth')} theme={theme} />;
          }
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

/* ── Product Reviews (list + submit) ─────────────────────────── */
function ProductReviews({
  product,
  reviews,
  user,
  rating,
  setRating,
  comment,
  setComment,
  submitting,
  onSubmit,
  onLogin,
  theme,
}: {
  product: Product;
  reviews: any[];
  user: any;
  rating: number;
  setRating: (r: number) => void;
  comment: string;
  setComment: (c: string) => void;
  submitting: boolean;
  onSubmit: () => void;
  onLogin: () => void;
  theme: any;
}) {
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
      <View style={[styles.descCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <AppText variant="heading">
          ⭐ Customer Reviews <AppText variant="caption" color={theme.gray}>({reviews.length})</AppText>
        </AppText>

        {/* Submit form */}
        {user ? (
          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', gap: 4, marginBottom: 8 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Pressable key={s} onPress={() => setRating(s)} hitSlop={4}>
                  <AppText style={{ fontSize: 22, color: s <= rating ? '#FFB800' : theme.border }}>
                    ★
                  </AppText>
                </Pressable>
              ))}
              <AppText variant="caption" color={theme.gray} style={{ marginLeft: 6, alignSelf: 'center' }}>
                {rating}/5
              </AppText>
            </View>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Product ke baare mein apna experience likhein…"
              placeholderTextColor={theme.muted}
              multiline
              style={[
                styles.reviewInput,
                { backgroundColor: theme.light, borderColor: theme.border, color: theme.dark },
              ]}
            />
            <Pressable onPress={onSubmit} disabled={submitting} style={[styles.reviewSubmit, { backgroundColor: submitting ? theme.muted : theme.primary }]}>
              <AppText variant="captionBold" color="#fff">
                {submitting ? 'Bhej rahe hain…' : '📨 Review Bhejein'}
              </AppText>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={onLogin} style={[styles.reviewLogin, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
            <AppText variant="bodyBold" color={theme.primaryDark}>
              🔐 Login karke review dein
            </AppText>
          </Pressable>
        )}

        {/* List */}
        {reviews.length ? (
          <View style={{ marginTop: 14, gap: 12 }}>
            {reviews.map((r, i) => (
              <View key={i} style={[styles.reviewItem, { borderTopColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText variant="captionBold">{r.customer_name || 'Customer'}</AppText>
                  <AppText style={{ color: '#FFB800', fontSize: 12 }}>{'★'.repeat(Math.max(1, Math.min(5, r.rating || 5)))}</AppText>
                </View>
                <AppText variant="body" color={theme.text} style={{ marginTop: 4, lineHeight: 19 }}>
                  {r.comment}
                </AppText>
                {r.admin_reply ? (
                  <View style={[styles.adminReply, { backgroundColor: theme.primaryLight }]}>
                    <AppText variant="tiny" color={theme.primaryDark} style={{ fontWeight: '700' }}>
                      🛡️ Store ka reply:
                    </AppText>
                    <AppText variant="caption" color={theme.text} style={{ marginTop: 2 }}>
                      {r.admin_reply}
                    </AppText>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <AppText variant="caption" color={theme.gray} center style={{ marginTop: 14 }}>
            Abhi koi review nahi — pehle aap likhein! ✍️
          </AppText>
        )}
      </View>
    </View>
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
  reviewInput: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reviewSubmit: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  reviewLogin: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 11,
    alignItems: 'center',
  },
  reviewItem: { paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  adminReply: { borderRadius: 10, padding: 10, marginTop: 8 },
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
