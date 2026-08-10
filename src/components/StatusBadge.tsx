/**
 * StatusBadge — colored order status chip
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { orderStatusMeta } from '@/lib/helpers';

export function StatusBadge({ status }: { status: string }) {
  const meta = orderStatusMeta(status);
  return (
    <View style={[styles.badge, { backgroundColor: `${meta.color}1A`, borderColor: `${meta.color}55` }]}>
      <AppText variant="captionBold" style={{ color: meta.color }}>
        {meta.emoji} {meta.label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
