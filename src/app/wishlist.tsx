/**
 * Wishlist — saved products (fresh DB data), add-to-cart, remove.
 */
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import { usePriceAlerts } from '@/context/PriceAlertContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { AppText } from '@/components/AppText';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { HeaderBar } from '@/components/HeaderBar';
import { calcDiscount } from '@/lib/helpers';
import type { Product } from '@/lib/types';

export default function WishlistScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { wishlist, removeWishlist } = useWishlist();
  const { isAlerted, toggleAlert } = usePriceAlerts();
  const { addToCart, cart } = useCart();
  const { showToast } = useToast();
  const router = useRouter();

  const onAlertToggle = async (productId: string) => {
    const r = await toggleAlert(productId);
    if (r === 'on') showToast('Price drop / back-in-stock par notify karenge 🔔');
    else if (r === 'off') showToast('Price alert band — hata diya 🔕');
    else if (r === 'none') showToast('Alert update nahi hua — dobara try karein');
  };
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user || !wishlist.length) {
        setProducts([]);
        setLoading(false);
        return;
      }
      const ids = wishlist.map((w) => w.product_id);
      const { data } = await supabase
        .from('products')
        .select('*,categories(id,name,slug),product_images(id,image_url,is_default,sort_order)')
        .in('id', ids)
        .eq('is_active', true);
      const enriched = (data || []).map((p: any) => {
        const imgs = (p.product_images || []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order);
        return {
          ...p,
          discount: calcDiscount(p.selling_price, p.original_price),
          images: imgs,
          primary_image: (imgs.find((i: any) => i.is_default) || imgs[0])?.image_url || null,
        };
      });
      // keep wishlist order
      const ordered = ids.map((id) => enriched.find((p: any) => p.id === id)).filter(Boolean);
      if (active) setProducts(ordered);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user, wishlist]);

  if (!user) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
        <HeaderBar title="My Wishlist ❤️" />
        <EmptyState icon="🔐" title="Wishlist ke liye login karein" sub="Products par ❤️ tap karo" cta="Login Karein →" onCta={() => router.push('/auth')} />
      </SafeAreaView>
    );
  }

  // 🛒 Add All to Cart (site ke WishlistTab jaisa — FRESH product data se)
  const addAllToCart = async () => {
    if (!wishlist.length) return;
    const inCartKeys = new Set(cart.map((i) => i.k || i.id));
    const ids = wishlist.map((w) => w.product_id);
    const { data } = await supabase
      .from('products')
      .select('id,name,selling_price,unit_value,is_active,stock_quantity,units,product_images(image_url,is_default,sort_order)')
      .in('id', ids);
    const fresh: Record<string, any> = {};
    (data || []).forEach((p: any) => (fresh[p.id] = p));
    let added = 0;
    let skipped = 0;
    for (const w of wishlist) {
      const f = fresh[w.product_id];
      const units = f && Array.isArray(f.units) && f.units.length ? f.units : null;
      const key = units ? `${f.id}::${units[0].label}` : f.id;
      if (inCartKeys.has(key)) continue;
      if (!f || !f.is_active || (f.stock_quantity ?? 0) <= 0) {
        skipped++;
        continue;
      }
      const imgs = (f.product_images || []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order);
      const image = (imgs.find((i: any) => i.is_default) || imgs[0])?.image_url || null;
      await addToCart({
        id: f.id,
        name: f.name,
        unit: units ? units[0].label : f.unit_value,
        price: units ? units[0].price ?? f.selling_price : f.selling_price,
        variant: units ? units[0].label : null,
        image,
      } as any);
      added++;
    }
    showToast(added ? `${added} items cart mein add! 🛒` : skipped ? `${skipped} items stock mein nahi hain` : 'Sab items pehle se cart mein hain ✅');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <HeaderBar
        title={`My Wishlist (${wishlist.length}) ❤️`}
        right={
          wishlist.length > 0 ? (
            <Pressable onPress={addAllToCart} style={[styles.addAll, { backgroundColor: theme.primaryLight }]}>
              <AppText variant="captionBold" color={theme.primaryDark}>
                🛒 Add All
              </AppText>
            </Pressable>
          ) : undefined
        }
      />
      {loading ? (
        <AppText variant="body" color={theme.gray} center style={{ padding: 40 }}>
          Load ho raha hai…
        </AppText>
      ) : products.length === 0 ? (
        <EmptyState icon="❤️" title="Wishlist khali hai" sub="Products par ❤️ tap karo" cta="Browse Products →" onCta={() => router.push('/shop')} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => String(p.id)}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => {
            const alerted = isAlerted(item.id);
            return (
              <View style={{ flex: 1, maxWidth: '50%', paddingHorizontal: 5, marginBottom: 12 }}>
                <ProductCard
                  p={item}
                  onPress={(p) => router.push({ pathname: '/product/[id]', params: { id: p.id } })}
                  onWishlistPress={() => {
                    const row = wishlist.find((w) => w.product_id === item.id);
                    if (row) removeWishlist(row.id);
                  }}
                />
                {/* 🔔 Price alert toggle — site ke WishlistTab jaisa */}
                <Pressable
                  onPress={() => onAlertToggle(item.id)}
                  style={[
                    styles.alertPill,
                    alerted
                      ? { backgroundColor: theme.tintYellow.bg, borderColor: theme.tintYellow.border }
                      : { backgroundColor: theme.light, borderColor: theme.border },
                  ]}>
                  <AppText variant="tiny" color={alerted ? theme.tintYellow.text : theme.gray} style={{ fontWeight: '700' }}>
                    {alerted ? '🔔 Price alert ON' : '🔔 Price alert pao'}
                  </AppText>
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  addAll: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  alertPill: {
    marginTop: 6,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 5,
    alignItems: 'center',
  },
});
