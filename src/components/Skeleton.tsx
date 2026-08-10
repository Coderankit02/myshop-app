/**
 * Skeleton — simple pulse skeletons for product cards and banners
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

function Pulse({ style }: { style?: object }) {
  const { theme } = useTheme();
  return <View style={[styles.pulse, { backgroundColor: theme.light }, style]} />;
}

export function SkelCard() {
  const { theme } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
      <Pulse style={styles.cardImg} />
      <View style={{ padding: 10 }}>
        <Pulse style={{ height: 12, width: '85%', borderRadius: 6 }} />
        <Pulse style={{ height: 10, width: '50%', borderRadius: 6, marginTop: 6 }} />
        <Pulse style={{ height: 14, width: '40%', borderRadius: 6, marginTop: 10 }} />
      </View>
    </View>
  );
}

export function SkelBanner() {
  return <Pulse style={styles.banner} />;
}

const styles = StyleSheet.create({
  pulse: { borderRadius: 8 },
  card: { borderRadius: 16, overflow: 'hidden', elevation: 1 },
  cardImg: { aspectRatio: 1, borderRadius: 0 },
  banner: { width: '100%', height: '100%', borderRadius: 0 },
});
