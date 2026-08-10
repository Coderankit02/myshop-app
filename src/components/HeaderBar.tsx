/**
 * HeaderBar — top header for sub-screens (back + title + optional right action)
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { AppText } from './AppText';

interface HeaderBarProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  transparent?: boolean;
}

export function HeaderBar({ title, subtitle, right, onBack, transparent }: HeaderBarProps) {
  const { theme } = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: transparent ? 'transparent' : theme.pageBg }}>
      <View style={[styles.row, { borderBottomColor: theme.border }]}>
        <Pressable
          onPress={onBack || (() => router.back())}
          hitSlop={10}
          style={({ pressed }) => [
            styles.backBtn,
            { backgroundColor: theme.cardBg, borderColor: theme.border },
            pressed && { opacity: 0.7 },
          ]}>
          <AppText variant="bodyBold" style={{ fontSize: 16 }}>
            ‹
          </AppText>
        </Pressable>
        <View style={styles.titles}>
          <AppText variant="heading" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" color={theme.gray} numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        <View style={styles.right}>{right}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1 },
  right: { minWidth: 36, alignItems: 'flex-end' },
});
