/**
 * Home — port of the website's homepage (homepage_sections order respected).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, Pressable, RefreshControl, ScrollView, Share, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { calculateDelivery, loadDeliveryConfig, reverseGeocode } from '@/lib/delivery';
import type { DeliveryInfo } from '@/lib/types';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useBanners, useCategories, useHomeSections, useHomepageConfig, useReviews, useAdStrips, type AdStrip } from '@/hooks/useData';
import { AppText } from '@/components/AppText';
import { BannerCarousel } from '@/components/BannerCarousel';
import { CategoryRail } from '@/components/CategoryRail';
import { SectionRail } from '@/components/SectionRail';
import { CountdownTimer } from '@/components/CountdownTimer';
import { PrimaryButton } from '@/components/PrimaryButton';
import { calcDiscount } from '@/lib/helpers';
import type { EnrichedProduct } from '@/hooks/useData';
import type { Banner, Product } from '@/lib/types';

export default function HomeScreen() {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const { count } = useCart();
  const { showToast } = useToast();
  const router = useRouter();

  const { banners, loading: bannersLoading } = useBanners();
  const { cats, loading: catsLoading } = useCategories();
  const { sections: homeSections, loading: homeLoading, refetch: refetchHome } = useHomeSections();
  const { sections: homepageSections, refetch: refetchConfig } = useHomepageConfig();
  const { reviews } = useReviews();
  const { strips: adStrips } = useAdStrips();

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Featured products (loaded once)
  const [featuredProds, setFeaturedProds] = useState<EnrichedProduct[]>([]);
  const [featLoading, setFeatLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('products')
        .select('*,categories(id,name,slug),product_images(id,image_url,is_default,sort_order)')
        .eq('is_active', true)
        .eq('is_featured', true)
        .limit(8);
      const enriched = (data || []).map((p: any) => {
        const imgs = (p.product_images || []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order);
        return {
          ...p,
          discount: calcDiscount(p.selling_price, p.original_price),
          images: imgs,
          primary_image: (imgs.find((i: any) => i.is_default) || imgs[0])?.image_url || null,
        } as EnrichedProduct;
      });
      if (active) {
        setFeaturedProds(enriched);
        setFeatLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Per-category full product sections (mirror App.jsx sectionProds)
  const [sectionProds, setSectionProds] = useState<Record<string, EnrichedProduct[]>>({});
  const [sectionProdsReady, setSectionProdsReady] = useState(false);
  useEffect(() => {
    if (!cats.length) return;
    let cancelled = false;
    (async () => {
      let data: any[] | null = null;
      try {
        const res = await supabase
          .from('products')
          .select('*,product_images(image_url,is_default,sort_order)')
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1000);
        data = res.data;
      } catch {
        data = null;
      }
      if (cancelled) return;
      const map: Record<string, EnrichedProduct[]> = {};
      for (const pr of data || []) {
        const imgs = (pr.product_images || []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order);
        const enriched = {
          ...pr,
          discount: calcDiscount(pr.selling_price, pr.original_price),
          images: imgs,
          primary_image: (imgs.find((i: any) => i.is_default) || imgs[0])?.image_url || null,
        } as EnrichedProduct;
        if (pr.category_id) {
          if (!map[pr.category_id]) map[pr.category_id] = [];
          map[pr.category_id].push(enriched);
        }
      }
      setSectionProds(map);
      setSectionProdsReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [cats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchHome(), refetchConfig()]);
    setRefreshing(false);
  };

  const onBannerPress = (b: Banner) => {
    router.push('/shop');
    showToast(b.title || 'Offer dekhein! 🎉');
  };
  const onAdClick = (img: { link_type: string; link_value: string | null }) => {
    if (img.link_type === 'category' && img.link_value) {
      router.push({ pathname: '/shop', params: { cat: img.link_value } });
    } else if (img.link_type === 'product' && img.link_value) {
      router.push({ pathname: '/product/[id]', params: { id: img.link_value } });
    }
  };
  const goProduct = (p: Product) => router.push({ pathname: '/product/[id]', params: { id: p.id } });
  const goCategory = (id: string) => router.push({ pathname: '/shop', params: { cat: id } });
  const goShop = () => router.push('/shop');

  const submitSearch = () => {
    if (search.trim().length >= 2) {
      router.push({ pathname: '/shop', params: { q: search.trim() } });
    } else {
      showToast('Search karne ke liye 2+ letters daalein 🔍');
    }
  };

  const sectionsMap: Record<string, React.ReactNode> = useMemo(
    () => ({
      hero: <BannerCarousel banners={banners} loading={bannersLoading} onPress={onBannerPress} height={160} />,
      flash_sale: (
        <View
          style={[
            styles.flashCard,
            {
              backgroundColor: theme.primaryDark,
              shadowColor: '#15803D',
              shadowOpacity: 0.35,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 5,
            },
          ]}>
          <View style={styles.flashHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
              <AppText style={{ fontSize: 20 }}>⚡</AppText>
              <AppText variant="heading" color="#fff">
                Flash Sale
              </AppText>
            </View>
            <CountdownTimer compact />
          </View>
          <View style={{ marginTop: 10 }}>
            <SectionRail title="" products={homeSections.flash} loading={homeLoading} onProductPress={goProduct} compact />
          </View>
        </View>
      ),
      today_deals: (
        <SectionRail title="🔥 Today's Deals" products={homeSections.deals} loading={homeLoading} onSeeAll={goShop} onProductPress={goProduct} />
      ),
      categories: <CategoryRail heading="Shop by Category" cats={cats} loading={catsLoading} onPick={goCategory} onSeeAll={goShop} />,
      featured: <SectionRail title="⭐ Featured Products" products={featuredProds} loading={featLoading} onSeeAll={goShop} onProductPress={goProduct} />,
      best_sellers: (
        <SectionRail title="🏆 Best Sellers" products={homeSections.bestSellers} loading={homeLoading} onSeeAll={goShop} onProductPress={goProduct} />
      ),
      new_arrivals: (
        <SectionRail title="✨ New Arrivals" products={homeSections.newArrivals} loading={homeLoading} onSeeAll={goShop} onProductPress={goProduct} />
      ),
      why_choose_us: <WhyChooseUs />,
      reviews: <ReviewsSection reviews={reviews} />,
      newsletter: <Newsletter onSubscribe={(e) => showToast(e ? 'Subscribe ho gaye! Offers aapke inbox mein 🎉' : 'Sahi email daalein 🙏')} />,
      how_it_works: <HowItWorks />,
      // Website par ye section "Get the App" hota hai — app ke andar hum ise
      // native Share card banate hain (download karne ka kaam toh app khud hai)
      download_app: <ShareAppCard />,
    }),
    [banners, bannersLoading, cats, catsLoading, homeSections, homeLoading, featuredProds, featLoading, reviews, theme]
  );

  // category_sections rails (all categories, all products)
  const categorySections = useMemo(() => {
    return cats.map((c) => (
      <View key={c.id} style={{ marginTop: 18 }}>
        <SectionRail
          title={c.name}
          products={sectionProdsReady ? sectionProds[c.id] : undefined}
          loading={!sectionProdsReady}
          onSeeAll={() => goCategory(c.id)}
          onProductPress={goProduct}
          gradientTitle
        />
      </View>
    ));
  }, [cats, sectionProds, sectionProdsReady]);

  // Final ordered sections (mirror homepage builder config). Ad strips bhi ab
  // Section Order ke andar hi hain (section_key='ad_strip' + ad_strip_id) —
  // admin Section Order list me drag karke position change hoti hai.
  const rendered = useMemo(() => {
    const out: React.ReactNode[] = [];
    homepageSections.forEach((sec) => {
      const key = typeof sec === 'string' ? sec : sec.key;
      if (key === 'ad_strip') {
        const strip = adStrips.find((s) => s.id === (typeof sec === 'object' ? sec.ad_strip_id : null));
        if (strip) out.push(<AdStripSection key={`ad-${strip.id}`} strip={strip} onAdClick={onAdClick} />);
        return;
      }
      const node = key === 'category_sections' ? categorySections : sectionsMap[key] || null;
      if (!node) return;
      const items = Array.isArray(node) ? node : [node];
      items.forEach((item, idx) => out.push(<View key={`${key}-${idx}`}>{item}</View>));
    });
    return out;
  }, [homepageSections, categorySections, sectionsMap, adStrips, onAdClick]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}>
        <View style={styles.brandRow}>
          <View style={[styles.logo, { backgroundColor: theme.primaryLight }]}>
            {settings.logo_url ? <Image source={{ uri: settings.logo_url }} style={styles.logoImg} /> : <AppText style={{ fontSize: 20 }}>🛒</AppText>}
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="heading" color={theme.dark} numberOfLines={1}>
              {settings.shop_name || 'RK Grocery Mart'}
            </AppText>
            <View style={{ marginTop: 2 }}>
              <LocationPill />
            </View>
          </View>
          <Pressable onPress={() => router.push('/cart')} hitSlop={8} style={[styles.cartBtn, { backgroundColor: theme.primaryLight }]}>
            <AppText style={{ fontSize: 20 }}>🛒</AppText>
            {count > 0 && (
              <View style={styles.cartBadge}>
                <AppText variant="tiny" color="#fff" style={{ fontWeight: '800' }}>
                  {count > 99 ? '99+' : count}
                </AppText>
              </View>
            )}
          </Pressable>
        </View>
        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: theme.light, borderColor: theme.border }]}>
          <AppText style={{ fontSize: 15 }}>🔍</AppText>
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
            placeholder="Kya dhoondh rahe hain?"
            placeholderTextColor={theme.muted}
            numberOfLines={1}
            style={[styles.searchInput, { color: theme.dark }]}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <AppText variant="caption" color={theme.gray}>
                ✕
              </AppText>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Announcement */}
        {settings.announcement ? (
          <View style={[styles.announce, { backgroundColor: theme.tintYellow.bg, borderColor: theme.tintYellow.border }]}>
            <AppText variant="captionBold" color={theme.tintYellow.text}>
              📢 {settings.announcement}
            </AppText>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          {rendered.map((node, i) => (
            <View key={i} style={i > 0 ? { marginTop: 20 } : undefined}>
              {node}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Ad Images Strip (auto-scroll, no text, no dots) ── */
function AdStripSection({ strip, onAdClick }: { strip: AdStrip; onAdClick: (img: { link_type: string; link_value: string | null }) => void }) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const scrollRef = useRef<ScrollView>(null);
  const idxRef = useRef(0);
  const [vw, setVw] = useState(0);

  // Auto-advance SIRF mobile par (desktop par saari images ek saath dikhti hain).
  // Touch/swipe ke dauran PAUSE — interval user ke haath se na ladhe (site bug fix).
  const adTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const adResumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startAdAuto = () => {
    if (adTimer.current) clearInterval(adTimer.current);
    adTimer.current = setInterval(() => {
      idxRef.current = (idxRef.current + 1) % strip.images.length;
      scrollRef.current?.scrollTo({ x: idxRef.current * vw, animated: true });
    }, 3500);
  };
  const stopAdAuto = () => {
    if (adTimer.current) clearInterval(adTimer.current);
    adTimer.current = null;
    if (adResumeTimer.current) clearTimeout(adResumeTimer.current);
    adResumeTimer.current = null;
  };
  useEffect(() => {
    if (isDesktop || strip.images.length < 2 || !vw) return;
    startAdAuto();
    return () => {
      stopAdAuto();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strip.images.length, isDesktop, vw]);

  // Desktop/tablet: sab images ek row me barabar width (3 ya 4 jo bhi ho)
  if (isDesktop) {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {strip.images.map((img) => (
          <Pressable
            key={img.id}
            onPress={() => onAdClick(img)}
            style={({ pressed }) => [
              { flexGrow: 1, flexBasis: 0, minWidth: 0, borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, backgroundColor: theme.light, transform: [{ scale: pressed ? 0.97 : 1 }] },
              { borderColor: theme.border },
            ]}>
            <Image source={{ uri: img.image_url }} style={{ width: '100%', height: 128 }} resizeMode="cover" />
          </Pressable>
        ))}
      </View>
    );
  }

  // Mobile: full-width ek image, snap paging, auto-change
  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onScrollBeginDrag={stopAdAuto}
      onMomentumScrollEnd={(e) => {
        const i = Math.round(e.nativeEvent.contentOffset.x / (vw || 1));
        idxRef.current = Math.max(0, Math.min(i, strip.images.length - 1));
        if (adResumeTimer.current) clearTimeout(adResumeTimer.current);
        adResumeTimer.current = setTimeout(() => {
          adResumeTimer.current = null;
          startAdAuto();
        }, 2000);
      }}
      onLayout={(e) => setVw(e.nativeEvent.layout.width)}
      style={{ borderRadius: 14, overflow: 'hidden' }}>
      {strip.images.map((img) => (
        <Pressable
          key={img.id}
          onPress={() => onAdClick(img)}
          style={({ pressed }) => [
            { width: vw || '100%', height: Math.round((vw || 360) * 0.26), backgroundColor: theme.light, transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}>
          <Image source={{ uri: img.image_url }} style={styles.adImage} resizeMode="cover" />
        </Pressable>
      ))}
    </ScrollView>
  );
}

/* ── Location Pill + Modal (site ke header "Apna Delivery Location" jaisa) ── */
const LOCATION_STORAGE_KEY = 'rk_header_location';

interface SavedLocation {
  city: string;
  pincode: string;
  mode: 'gps' | 'manual';
  distanceKm: number | null;
  charge: number | null;
  available: boolean | null;
  lat: number | null;
  lng: number | null;
  ts: number;
}

function LocationPill() {
  const { theme } = useTheme();
  const [saved, setSaved] = useState<SavedLocation | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
        if (raw) {
          const p = JSON.parse(raw);
          if (p && p.city) setSaved(p);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const onConfirm = async (loc: SavedLocation) => {
    setSaved(loc);
    try {
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(loc));
    } catch {
      // ignore
    }
    setOpen(false);
  };

  const label = saved?.city || 'Apna Location Set Karein';

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={6}
        style={({ pressed }) => [
          styles.locPill,
          { backgroundColor: theme.primaryLight, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
        ]}>
        <AppText style={{ fontSize: 13 }}>📍</AppText>
        <AppText variant="captionBold" color={theme.primaryDark} numberOfLines={1} style={{ flexShrink: 1 }}>
          {label}
        </AppText>
        <AppText variant="tiny" color={theme.gray}>
          ▾
        </AppText>
      </Pressable>
      <LocationModal open={open} onClose={() => setOpen(false)} current={saved} onConfirm={onConfirm} />
    </>
  );
}

function LocationModal({
  open,
  onClose,
  current,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  current: SavedLocation | null;
  onConfirm: (loc: SavedLocation) => void;
}) {
  const { theme } = useTheme();
  const [step, setStep] = useState<'idle' | 'detecting' | 'detected' | 'error'>('idle');
  const [error, setError] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [city, setCity] = useState(current?.city || '');
  const [pincode, setPincode] = useState(current?.pincode || '');

  useEffect(() => {
    if (!open) return;
    setStep('idle');
    setError('');
    setDeliveryInfo(null);
    setGeo(null);
    setCity(current?.city || '');
    setPincode(current?.pincode || '');
  }, [open, current]);

  const handleDetect = async () => {
    setStep('detecting');
    setError('');
    try {
      await loadDeliveryConfig();
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setStep('error');
        setError('Location permission nahi mili. Neeche manual entry use karein.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const info = calculateDelivery(pos.coords.latitude, pos.coords.longitude);
      setDeliveryInfo(info);
      setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      const addr = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      if (addr?.city) setCity(addr.city);
      if (addr?.pincode) setPincode(addr.pincode);
      setStep('detected');
    } catch {
      setStep('error');
      setError('Location detect nahi ho payi. Manual entry use karein.');
    }
  };

  const pinValid = /^\d{6}$/.test(pincode.trim());
  const canConfirm = city.trim().length > 0 && pinValid;

  const handleConfirm = () => {
    if (!canConfirm) {
      setError('City aur 6-digit pincode zaroori hai.');
      return;
    }
    onConfirm({
      city: city.trim(),
      pincode: pincode.trim(),
      mode: geo ? 'gps' : 'manual',
      distanceKm: deliveryInfo?.distanceKm ?? null,
      charge: deliveryInfo?.charge ?? null,
      available: deliveryInfo?.available ?? null,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      ts: Date.now(),
    });
  };

  const statusBg = deliveryInfo
    ? !deliveryInfo.available
      ? theme.tintRed.bg
      : deliveryInfo.charge === 0
      ? theme.tintGreen.bg
      : theme.tintBlue.bg
    : theme.light;
  const statusText = deliveryInfo
    ? !deliveryInfo.available
      ? theme.tintRed.text
      : deliveryInfo.charge === 0
      ? theme.tintGreen.text
      : theme.tintBlue.text
    : theme.gray;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.locSheet, { backgroundColor: theme.cardBg }]}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
          <View style={styles.sheetHead}>
            <AppText variant="title" style={{ flex: 1 }}>
              📍 Apna Delivery Location
            </AppText>
            <Pressable onPress={onClose} hitSlop={10}>
              <AppText variant="bodyBold" style={{ fontSize: 18 }}>
                ✕
              </AppText>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            <Pressable
              onPress={handleDetect}
              disabled={step === 'detecting'}
              style={[styles.locDetectBtn, { backgroundColor: theme.primary }]}>
              <AppText variant="bodyBold" color="#fff">
                {step === 'detecting' ? '⏳ Detect ho rahi hai…' : '📡 GPS Se Location Detect Karo'}
              </AppText>
            </Pressable>

            {deliveryInfo && (
              <View style={[styles.locStatusCard, { backgroundColor: statusBg, borderColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <AppText style={{ fontSize: 22 }}>{deliveryInfo.emoji}</AppText>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyBold" style={{ color: statusText }}>
                      {deliveryInfo.label}
                    </AppText>
                    <AppText variant="caption" style={{ color: statusText }}>
                      {deliveryInfo.available
                        ? `Distance ~${Math.round(deliveryInfo.distanceKm)} km • ${deliveryInfo.charge === 0 ? 'FREE Delivery' : `Charge ₹${deliveryInfo.charge}`}`
                        : 'Is area mein delivery available nahi.'}
                    </AppText>
                  </View>
                </View>
              </View>
            )}

            <AppText variant="bodyBold" color={theme.gray} style={{ marginTop: 16, marginBottom: 8 }}>
              Ya phir manual daalein:
            </AppText>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="City (e.g. Jaunpur)"
              placeholderTextColor={theme.muted}
              style={[styles.locInput, { backgroundColor: theme.light, borderColor: theme.border, color: theme.dark }]}
            />
            <TextInput
              value={pincode}
              onChangeText={(t) => setPincode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit Pincode"
              placeholderTextColor={theme.muted}
              keyboardType="number-pad"
              maxLength={6}
              style={[styles.locInput, { backgroundColor: theme.light, borderColor: theme.border, color: theme.dark, marginTop: 8 }]}
            />

            {error ? (
              <AppText variant="caption" color={theme.red} style={{ marginTop: 8 }}>
                ⚠️ {error}
              </AppText>
            ) : null}

            <PrimaryButton
              title="✅ Location Confirm Karein"
              onPress={handleConfirm}
              disabled={!canConfirm}
              style={{ marginTop: 16 }}
            />
            <AppText variant="caption" color={theme.muted} center style={{ marginTop: 10 }}>
              Delivery availability, charge aur ETA is location ke hisaab se checkout par milega.
            </AppText>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ── Share the App (download_app section ka native version) ── */
function ShareAppCard() {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const share = async () => {
    try {
      await Share.share({
        message: `${settings.shop_name || 'Rinku Kirana Store'} — grocery, kirana aur daily essentials, fast delivery! ${settings.footer_text || 'हर घर की पसंद'}\n\nOrder karein: https://rinkukiranastore.vercel.app`,
      });
    } catch {
      // user dismissed share sheet — noop
    }
  };
  return (
    <View
      style={[
        styles.shareCard,
        {
          backgroundColor: theme.primaryDark,
          shadowColor: '#15803D',
          shadowOpacity: 0.3,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
          elevation: 4,
        },
      ]}>
      <View style={{ flex: 1 }}>
        <AppText variant="heading" color="#fff">
          📲 {settings.shop_name || 'RK Grocery Mart'} App
        </AppText>
        <AppText variant="caption" color="rgba(255,255,255,0.85)" style={{ marginTop: 4 }}>
          Doston ko batao — grocery order karna ab aur aasan!
        </AppText>
      </View>
      <Pressable onPress={share} style={[styles.shareBtn, { backgroundColor: '#fff' }]}>
        <AppText variant="captionBold" color={theme.primaryDark}>
          Share →
        </AppText>
      </Pressable>
    </View>
  );
}

/* ── Why Choose Us ─────────────────────────────────────── */
function WhyChooseUs() {
  const { theme } = useTheme();
  const feats = [
    { icon: '⚡', title: 'Lightning Delivery', desc: '1-2 ghante mein order aapke ghar tak' },
    { icon: '🌿', title: 'Fresh & Natural', desc: 'Roz subah mandi se fresh fruits-sabziyan' },
    { icon: '🏷️', title: 'Best Prices', desc: 'Market se saste — daily deals & coupons' },
    { icon: '🔒', title: '100% Safe Payments', desc: 'UPI, cards, netbanking — secure checkout' },
    { icon: '📦', title: 'Wide Selection', desc: '1500+ products, 16+ categories — sab kuch ek jagah' },
    { icon: '🎧', title: '24x7 Support', desc: 'Ananya AI + WhatsApp — kabhi bhi help' },
  ];
  return (
    <View>
      <AppText variant="heading">
        Why Choose <AppText style={{ color: theme.primary }}>RK Grocery Mart?</AppText>
      </AppText>
      <View style={styles.featsGrid}>
        {feats.map((f) => (
          <View key={f.title} style={[styles.featCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={[styles.featIcon, { backgroundColor: theme.primaryLight }]}>
              <AppText style={{ fontSize: 20 }}>{f.icon}</AppText>
            </View>
            <AppText variant="bodyBold" style={{ marginTop: 8 }}>
              {f.title}
            </AppText>
            <AppText variant="caption" color={theme.gray} style={{ marginTop: 2 }}>
              {f.desc}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ── Reviews ───────────────────────────────────────────── */
function ReviewsSection({ reviews }: { reviews: any[] }) {
  const { theme } = useTheme();
  // Site ki tarah: approved reviews na hon to curated fallback dikhta hai —
  // section kabhi khaali nahi dikhta.
  const fallback = [
    { customer_name: 'Priya Sharma', rating: 5, comment: 'Roj ka saman ab online — fresh sabziyan aur 1-2 ghante mein delivery! Bahut badhiya service.' },
    { customer_name: 'Rahul Verma', rating: 5, comment: 'Rate market se kam hain aur coupons se aur bachat. UPI payment ekdum aasaan.' },
    { customer_name: 'Sunita Devi', rating: 4, comment: 'Ananya AI se pooch kar order kiya — bilkul sahi product mila. Highly recommended!' },
    { customer_name: 'Amit Yadav', rating: 5, comment: 'COD option hone se ghar walon ko bhi bharosa hai. RK Grocery Mart = ghar ki dukaan.' },
  ];
  const list = reviews.length ? reviews : fallback;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="heading" style={{ flex: 1 }}>
          Kya Kehte Hain <AppText style={{ color: theme.primary }}>Hamare Customers?</AppText>
        </AppText>
        <View style={[styles.ratingPill, { backgroundColor: theme.primaryLight }]}>
          <AppText variant="captionBold" color={theme.primaryDark}>
            ⭐ 4.8/5
          </AppText>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingTop: 12 }}>
        {list.map((r, i) => {
          const stars = Math.max(1, Math.min(5, r.rating || 5));
          return (
            <View key={i} style={[styles.reviewCard, { backgroundColor: theme.cardBg, borderColor: theme.border, width: 250 }]}>
              <AppText style={{ color: '#FFB800', fontSize: 12 }}>{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</AppText>
              <AppText variant="caption" color={theme.text} style={{ marginTop: 8, lineHeight: 18 }}>
                “{r.comment || ''}”
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                  <AppText variant="captionBold" color="#fff">
                    {(r.customer_name || 'C')[0]}
                  </AppText>
                </View>
                <View>
                  <AppText variant="captionBold">{r.customer_name || 'Customer'}</AppText>
                  <AppText variant="tiny" color={theme.gray}>
                    ✓ Verified
                  </AppText>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* ── Newsletter ────────────────────────────────────────── */
function Newsletter({ onSubscribe }: { onSubscribe: (email: string) => void }) {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const submit = () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      onSubscribe('');
      return;
    }
    setEmail('');
    onSubscribe(email);
  };
  return (
    <View style={[styles.newsletter, { backgroundColor: theme.primaryLight }]}>
      <AppText variant="heading" color={theme.primaryDark} center>
        Weekly Offers & Deals 📬
      </AppText>
      <AppText variant="caption" color={theme.gray} center style={{ marginTop: 4 }}>
        Register karein — har hafte naye coupons aur flash sale alerts seedha inbox mein.
      </AppText>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="aapka@email.com"
          placeholderTextColor={theme.muted}
          keyboardType="email-address"
          style={[styles.newsInput, { backgroundColor: theme.cardBg, borderColor: theme.border, color: theme.dark }]}
        />
        <PrimaryButton title="Subscribe" onPress={submit} style={{ paddingHorizontal: 18, minHeight: 46 }} />
      </View>
    </View>
  );
}

/* ── How It Works ──────────────────────────────────────── */
function HowItWorks() {
  const { theme } = useTheme();
  const steps = [
    { i: '📱', t: 'Open the app', s: 'Search what you need' },
    { i: '🛒', t: 'Place an order', s: 'Add items to cart & checkout' },
    { i: '🚴', t: 'Get fast delivery', s: 'Delivered in 1-2 hours' },
  ];
  return (
    <View style={[styles.howCard, { backgroundColor: theme.cardBg }]}>
      <AppText variant="heading">How It Works</AppText>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
        {steps.map((h) => (
          <View key={h.t} style={{ flex: 1, alignItems: 'center' }}>
            <AppText style={{ fontSize: 26 }}>{h.i}</AppText>
            <AppText variant="bodyBold" center style={{ marginTop: 4 }}>
              {h.t}
            </AppText>
            <AppText variant="caption" color={theme.gray} center>
              {h.s}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImg: { width: '100%', height: '100%' },
  cartBtn: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    marginTop: 10,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 13, fontFamily: 'Poppins_400Regular', padding: 0, paddingVertical: 0 },
  announce: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  flashCard: { borderRadius: 20, padding: 14 },
  flashHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  featsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  featCard: { width: '48%', flexGrow: 1, borderRadius: 16, borderWidth: 1, padding: 14 },
  featIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ratingPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  reviewCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  newsletter: { borderRadius: 20, padding: 18 },
  shareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 16,
  },
  shareBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  newsInput: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, fontSize: 13, fontFamily: 'Poppins_400Regular' },
  howCard: { borderRadius: 16, padding: 18 },
  adImageCard: { width: 212, height: 120, borderRadius: 16, borderWidth: 1.5, overflow: 'hidden' },
  adImage: { width: '100%', height: '100%' },
  locPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  locSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    maxHeight: '80%',
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 10 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  locDetectBtn: { borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  locStatusCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 12 },
  locInput: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
  },
});
