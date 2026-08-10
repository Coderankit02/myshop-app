/**
 * CategoryRail — horizontal circular category tiles with active highlight.
 */
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { AppText } from './AppText';
import { catEmoji } from '@/lib/helpers';
import type { Category } from '@/lib/types';

interface CategoryRailProps {
  cats: Category[];
  loading?: boolean;
  activeCatId?: string | null;
  onPick: (id: string) => void;
  heading?: string;
  onSeeAll?: () => void;
  tileSize?: number;
}

export function CategoryRail({ cats, loading, activeCatId, onPick, heading, onSeeAll, tileSize = 62 }: CategoryRailProps) {
  const { theme } = useTheme();
  return (
    <View>
      {heading ? (
        <View style={styles.headRow}>
          <View style={styles.headLeft}>
            <View style={[styles.headIcon, { backgroundColor: theme.primary }]}>
              <AppText style={{ fontSize: 18 }}>🛍️</AppText>
            </View>
            <AppText variant="heading" color={theme.dark}>
              {heading}
            </AppText>
          </View>
          {onSeeAll && (
            <Pressable onPress={onSeeAll} style={[styles.seeAll, { backgroundColor: theme.primaryLight }]}>
              <AppText variant="captionBold" color={theme.primary}>
                View All →
              </AppText>
            </Pressable>
          )}
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 4 }}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                <View style={[styles.tile, { width: tileSize, height: tileSize, backgroundColor: theme.light }]} />
                <View style={{ height: 14, width: 44, borderRadius: 7, backgroundColor: theme.light }} />
              </View>
            ))
          : cats.map((c) => {
              const active = activeCatId === c.id;
              const img = c.display_image || c.image_url;
              return (
                <Pressable key={c.id} onPress={() => onPick(c.id)} style={{ alignItems: 'center', gap: 6 }}>
                  <View
                    style={[
                      styles.tile,
                      {
                        width: tileSize,
                        height: tileSize,
                        backgroundColor: theme.primaryLight,
                        borderWidth: active ? 2.5 : 0,
                        borderColor: theme.primary,
                      },
                    ]}>
                    {img ? (
                      <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <AppText style={{ fontSize: 24 }}>{catEmoji(c)}</AppText>
                    )}
                  </View>
                  <AppText
                    variant="caption"
                    numberOfLines={1}
                    style={{
                      maxWidth: 76,
                      color: active ? '#fff' : theme.dark,
                      backgroundColor: active ? theme.primary : theme.cardBg,
                      borderRadius: 10,
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      overflow: 'hidden',
                      fontWeight: active ? '700' : '600',
                    }}>
                    {c.name}
                  </AppText>
                </Pressable>
              );
            })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  seeAll: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  tile: { borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
