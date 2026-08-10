/**
 * EmptyState — friendly empty states (Hinglish, like the site)
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { AppText } from './AppText';
import { PrimaryButton } from './PrimaryButton';

interface EmptyStateProps {
  icon: string;
  title: string;
  sub?: string;
  cta?: string;
  onCta?: () => void;
}

export function EmptyState({ icon, title, sub, cta, onCta }: EmptyStateProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: theme.primaryLight }]}>
        <AppText style={{ fontSize: 40 }}>{icon}</AppText>
      </View>
      <AppText variant="heading" center style={styles.title}>
        {title}
      </AppText>
      {sub ? (
        <AppText variant="body" color={theme.gray} center style={styles.sub}>
          {sub}
        </AppText>
      ) : null}
      {cta && onCta ? <PrimaryButton title={cta} onPress={onCta} style={styles.cta} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  iconWrap: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { marginBottom: 6 },
  sub: { marginBottom: 20 },
  cta: { alignSelf: 'center', minWidth: 200 },
});
