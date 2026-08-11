/**
 * SectionRail — horizontal product rail (title + See All + cards).
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { AppText } from './AppText';
import { ProductCard } from './ProductCard';
import { SkelCard } from './Skeleton';
import type { Product } from '@/lib/types';

interface SectionRailProps {
  title: string;
  products?: Product[];
  loading?: boolean;
  onSeeAll?: () => void;
  onProductPress?: (p: Product) => void;
  gradientTitle?: boolean;
  /** compact (flash sale jaise tight containers) ke liye chhote cards */
  compact?: boolean;
}

export function SectionRail({ title, products, loading, onSeeAll, onProductPress, gradientTitle, compact }: SectionRailProps) {
  const { theme } = useTheme();
  const cardW = compact ? 120 : 140;
  if (!loading && !products?.length) return null;

  return (
    <View>
      <View style={styles.headRow}>
        {gradientTitle ? (
          <View
            style={[
              styles.pill,
              {
                backgroundColor: theme.primary,
                shadowColor: theme.primaryDark,
                shadowOpacity: 0.3,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
              },
            ]}>
            <AppText variant="label" color="#fff">
              {title}
            </AppText>
          </View>
        ) : (
          <AppText variant="heading" color={theme.dark}>
            {title}
          </AppText>
        )}
        {onSeeAll && (
          <Pressable onPress={onSeeAll} hitSlop={6}>
            <AppText variant="bodyBold" color={theme.primary}>
              See All →
            </AppText>
          </Pressable>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 2 }}>
        {loading || !products
          ? Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={{ width: cardW }}>
                <SkelCard />
              </View>
            ))
          : products.map((p) => (
              <View key={p.id} style={{ width: cardW, flexGrow: 1 }}>
                <ProductCard p={p} onPress={onProductPress} />
              </View>
            ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  pill: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
});
