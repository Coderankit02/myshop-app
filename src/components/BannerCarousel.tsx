/**
 * BannerCarousel — auto-rotating hero carousel (4s interval, dots, CTA).
 * Uses a horizontal ScrollView with paging.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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

const WIDTH = Dimensions.get('window').width - 32; // screen padding

export function BannerCarousel({ banners, loading, onPress, height = 150 }: BannerCarouselProps) {
  const { theme } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [idx, setIdx] = useState(0);

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
  }, [banners.length]);

  const onMomentumEnd = (e: any) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / WIDTH);
    setIdx(Math.max(0, Math.min(i, banners.length - 1)));
  };

  if (loading) return <View style={[styles.container, { height }]}><SkelBanner /></View>;
  if (!banners.length) return null;

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        style={{ borderRadius: 18 }}>
        {banners.map((b) => (
          <Pressable
            key={b.id}
            onPress={() => onPress?.(b)}
            style={[
              styles.slide,
              { width: WIDTH, height, backgroundColor: theme.primaryDark },
            ]}>
            {b.image_url ? (
              <Image source={{ uri: b.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : null}
            <View style={[styles.gradient, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
              <View style={styles.textWrap}>
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
  container: { borderRadius: 18, overflow: 'hidden' },
  slide: { borderRadius: 18, overflow: 'hidden' },
  gradient: { flex: 1, justifyContent: 'flex-end' },
  textWrap: { padding: 16, maxWidth: '75%' },
  offerTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 6,
  },
  shopBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 10,
  },
  dots: {
    position: 'absolute',
    bottom: 10,
    left: 16,
    flexDirection: 'row',
    gap: 5,
  },
  dot: { height: 6, borderRadius: 3 },
});
