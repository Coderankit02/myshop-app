/**
 * BannerCarousel — auto-rotating hero carousel (4s interval, dots, CTA).
 * Uses a horizontal ScrollView with paging.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { AppText } from './AppText';
import { SkelBanner } from './Skeleton';
import type { Banner } from '@/lib/types';

interface BannerCarouselProps {
  banners: Banner[];
  loading?: boolean;
  onPress?: (b: Banner) => void;
  height?: number;
}

export function BannerCarousel({ banners, loading, onPress, height = 150 }: BannerCarouselProps) {
  const { theme } = useTheme();
  // useWindowDimensions → screen size change (resize/rotation) par width hamesha fresh rehti hai
  const { width: winWidth } = useWindowDimensions();
  const WIDTH = Math.min(winWidth - 32, 520); // screen padding; tablet/web par slides itni badi nahi hoti
  const scrollRef = useRef<ScrollView>(null);
  const [idx, setIdx] = useState(0);
  // Adaptive height: content (title+subtitle+button) slide se bada ho to text clip na ho.
  // Har slide ke text block ka onLayout measure hota hai → sabse badi height use hoti hai.
  const [contentH, setContentH] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => {
      setIdx((i) => {
        const next = (i + 1) % banners.length;
        scrollRef.current?.scrollTo({ x: next * WIDTH, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [banners.length, WIDTH]);

  const onMomentumEnd = (e: any) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / WIDTH);
    setIdx(Math.max(0, Math.min(i, banners.length - 1)));
  };

  if (loading) return <View style={[styles.container, { height }]}><SkelBanner /></View>;
  if (!banners.length) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        // Explicit width = slide width → paging hamesha sahi snap karta hai (web scrollbar gap khatam)
        style={{ width: WIDTH, borderRadius: 18 }}>
        {banners.map((b) => (
          <Pressable
            key={b.id}
            onPress={() => onPress?.(b)}
            style={[
              styles.slide,
              // minHeight = requested height; content bada ho to slide apne aap badh jata hai (text kabhi nahi katega)
              { width: WIDTH, minHeight: Math.max(height, contentH), backgroundColor: theme.primaryDark },
            ]}>
            {b.image_url ? (
              <Image source={{ uri: b.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : null}
            {/* Bottom-heavy gradient — image top crisp rehta hai, sirf text area readable dim hota hai */}
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.62)']}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={styles.textWrap}
              onLayout={(e) => {
                const h = e.nativeEvent.layout.height;
                setContentH((prev) => (h > prev ? h : prev));
              }}>
              <View style={styles.offerTag}>
                <AppText variant="tiny" color="#fff" style={{ fontWeight: '700' }}>
                  LIMITED OFFER
                </AppText>
              </View>
              <AppText variant="title" color="#fff" numberOfLines={2}>
                {b.title}
              </AppText>
              {b.subtitle ? (
                <AppText variant="caption" color="rgba(255,255,255,0.85)" numberOfLines={2}>
                  {b.subtitle}
                </AppText>
              ) : null}
              <View style={styles.shopBtn}>
                <AppText variant="captionBold" color="#1F2937">
                  {b.button_text || 'Shop Now'} →
                </AppText>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      {banners.length > 1 && (
        <View style={styles.dots}>
          {banners.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === idx ? '#fff' : 'rgba(255,255,255,0.5)', width: i === idx ? 18 : 6 },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: 520, width: '100%', alignSelf: 'center' },
  container: { borderRadius: 18, overflow: 'hidden' },
  slide: { borderRadius: 18, overflow: 'hidden', justifyContent: 'flex-end' },
  textWrap: { padding: 12, maxWidth: '75%' },
  offerTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 4,
  },
  shopBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 6,
  },
  dots: {
    position: 'absolute',
    bottom: 10,
    right: 16,
    flexDirection: 'row',
    gap: 5,
  },
  dot: { height: 6, borderRadius: 3 },
});
