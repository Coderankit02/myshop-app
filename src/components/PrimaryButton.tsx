/**
 * PrimaryButton — gradient CTA button (same style as the site's primary buttons)
 */
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';

interface PrimaryButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  variant?: 'primary' | 'outline' | 'ghost';
  icon?: string; // emoji prefix
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  style,
  variant = 'primary',
  icon,
}: PrimaryButtonProps) {
  const { theme } = useTheme();

  if (variant === 'outline') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.base,
          {
            borderWidth: 1.5,
            borderColor: theme.primary,
            backgroundColor: 'transparent',
            opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
          style,
        ]}>
        <Text style={[styles.text, { color: theme.primary }]}>
          {icon ? `${icon} ` : ''}
          {title}
        </Text>
      </Pressable>
    );
  }

  if (variant === 'ghost') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.base,
          { backgroundColor: theme.primaryLight, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
          style,
        ]}>
        <Text style={[styles.text, { color: theme.primaryDark }]}>
          {icon ? `${icon} ` : ''}
          {title}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [{ opacity: disabled ? 0.5 : pressed ? 0.9 : 1 }, style]}>
      <LinearGradient
        colors={[theme.primary, theme.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.base, styles.gradient]}>
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.text}>
            {icon ? `${icon} ` : ''}
            {title}
          </Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  gradient: {
    shadowColor: '#15803D',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  text: { color: '#fff', fontSize: 14, fontWeight: '800', fontFamily: 'Poppins_800ExtraBold' },
});
