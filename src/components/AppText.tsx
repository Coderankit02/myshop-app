/**
 * AppText — Poppins-based themed text (site uses Poppins everywhere).
 */
import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export type TextVariant =
  | 'title' // extrabold 20
  | 'heading' // bold 16
  | 'body' // regular 13
  | 'bodyMedium' // medium 13
  | 'bodyBold' // semibold 13
  | 'caption' // regular 11
  | 'captionBold' // semibold 11
  | 'label' // extrabold 12
  | 'price' // extrabold 15
  | 'tiny'; // 10

const VARIANT_STYLES: Record<TextVariant, TextStyle> = {
  title: { fontSize: 20, fontWeight: '800', fontFamily: 'Poppins_800ExtraBold', lineHeight: 27 },
  heading: { fontSize: 16, fontWeight: '700', fontFamily: 'Poppins_700Bold', lineHeight: 23 },
  body: { fontSize: 13, fontWeight: '400', fontFamily: 'Poppins_400Regular', lineHeight: 20 },
  bodyMedium: { fontSize: 13, fontWeight: '500', fontFamily: 'Poppins_500Medium', lineHeight: 20 },
  bodyBold: { fontSize: 13, fontWeight: '600', fontFamily: 'Poppins_600SemiBold', lineHeight: 20 },
  caption: { fontSize: 11, fontWeight: '400', fontFamily: 'Poppins_400Regular', lineHeight: 16 },
  captionBold: { fontSize: 11, fontWeight: '600', fontFamily: 'Poppins_600SemiBold', lineHeight: 16 },
  label: { fontSize: 12, fontWeight: '800', fontFamily: 'Poppins_800ExtraBold', lineHeight: 17 },
  price: { fontSize: 15, fontWeight: '800', fontFamily: 'Poppins_800ExtraBold', lineHeight: 21 },
  tiny: { fontSize: 10, fontWeight: '400', fontFamily: 'Poppins_400Regular', lineHeight: 14 },
};

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  center?: boolean;
}

export function AppText({ variant = 'body', color, center, style, children, ...rest }: AppTextProps) {
  const { theme } = useTheme();
  const defaultColor = color || theme.dark;
  return (
    <Text
      style={[
        VARIANT_STYLES[variant],
        { color: defaultColor },
        center && { textAlign: 'center' },
        style,
      ]}
      {...rest}>
      {children}
    </Text>
  );
}
